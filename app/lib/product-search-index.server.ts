import {getAdminToken, getAdminDomain} from '~/lib/shopify-admin.server';

/**
 * A bilingual product index for predictive (typeahead) search.
 *
 * Why this exists: Shopify's own predictive search cannot serve Arabic here,
 * for two independent reasons.
 *
 *   1. Arabic is not one of the languages Shopify's predictive search supports
 *      at all (the supported list is Latin/Cyrillic-script languages only).
 *   2. This shop's primary locale is English. Every product's real title is
 *      English; the Arabic title is a translation written by the Translate &
 *      Adapt app. Shopify's search indexes ONLY the primary-locale title and
 *      never compares a query against translated content — so an Arabic query
 *      has nothing indexed to match, even though the Arabic title exists.
 *
 * So for Arabic we match ourselves: pull the catalog (English title + the
 * Arabic translation, plus what the dropdown needs to render a row) and do the
 * matching in memory, with light Arabic normalisation so the spellings people
 * actually type (hamza/ta-marbuta/alef-maqsura variants) still hit.
 *
 * The catalog is fetched from the Admin API and cached in module memory for
 * TTL_MS, the same shape as `delivery-rate.server`: one paged fetch every ten
 * minutes per server instance, never a call per keystroke.
 */

export type IndexedProduct = {
  id: string;
  handle: string;
  titleEn: string;
  titleAr: string | null;
  isGiftCard: boolean;
  productType: string;
  image: {url: string; altText: string | null; width: number | null; height: number | null} | null;
  /** Variant price as a decimal string, e.g. "15.00". */
  priceAmount: string | null;
  /** Pre-normalised search keys, computed once at index time. */
  keyAr: string;
  keyEn: string;
};

type IndexCache = {timestamp: number; items: IndexedProduct[]; currencyCode: string};

let cache: IndexCache | null = null;
const TTL_MS = 10 * 60 * 1000;
/** One in-flight build at a time, so a burst of first keystrokes shares it. */
let building: Promise<IndexCache | null> | null = null;

/**
 * The index also lives in the Oxygen cache, not only in this module.
 *
 * Module memory is per-ISOLATE. Locally that is one long-lived Node process,
 * so the first build serves every later keystroke and everything looks fine.
 * On Oxygen each request may land in a fresh, short-lived isolate: `cache` is
 * empty again, the build starts from scratch, and the request answers before
 * it finishes — which is why Arabic search worked on localhost and returned
 * nothing on the deployed site.
 *
 * The Cache API is shared across isolates, so a build done by one request is
 * available to the next. Module memory stays as the fast path in front of it.
 */
const INDEX_CACHE_URL = 'https://product-search-index.saadeddin.internal/v1';

async function readSharedIndex(): Promise<IndexCache | null> {
  try {
    if (typeof caches === 'undefined') return null;
    const store = await caches.open('hydrogen');
    const hit = await store.match(new Request(INDEX_CACHE_URL));
    if (!hit) return null;
    const parsed = (await hit.json()) as IndexCache;
    if (!parsed?.items?.length) return null;
    if (Date.now() - parsed.timestamp > TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writeSharedIndex(idx: IndexCache): Promise<void> {
  try {
    if (typeof caches === 'undefined') return;
    const store = await caches.open('hydrogen');
    await store.put(
      new Request(INDEX_CACHE_URL),
      new Response(JSON.stringify(idx), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': `max-age=${Math.floor(TTL_MS / 1000)}`,
        },
      }),
    );
  } catch (e: any) {
    console.warn('[product-search-index] Could not share index:', e?.message || e);
  }
}

const INDEX_PAGE_QUERY = `
  query ProductSearchIndexPage($after: String) {
    shop { currencyCode }
    products(first: 100, after: $after, query: "status:active") {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        title
        handle
        isGiftCard
        productType
        featuredImage { url altText width height }
        variants(first: 1) { nodes { price image { url altText width height } } }
        translations(locale: "ar") { key value }
      }
    }
  }
`;

/**
 * Normalise Arabic (and generic) text for forgiving matching.
 *
 * Strips harakat and tatweel, folds alef variants to bare alef, ta-marbuta to
 * ha, alef-maqsura to ya, and hamza-on-waw/ya to their base letters. This is
 * deliberately lossy: "شوكولاتة", "شوكولاته" and "شوكولاتا" all become the
 * same key, which is what a shopper typing quickly expects.
 */
export function normalizeSearchText(input: string | null | undefined): string {
  if (!input) return '';
  return String(input)
    .toLowerCase()
    .replace(/[ً-ْٰـ]/g, '') // harakat, superscript alef, tatweel
    .replace(/[أإآٱ]/g, 'ا') // أ إ آ ٱ -> ا
    .replace(/ة/g, 'ه') // ة -> ه
    .replace(/ى/g, 'ي') // ى -> ي
    .replace(/ؤ/g, 'و') // ؤ -> و
    .replace(/ئ/g, 'ي') // ئ -> ي
    .replace(/[^\p{L}\p{N}\s]/gu, ' ') // punctuation -> space
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * One page of the catalog, with a timeout this query can actually meet.
 *
 * This used to go through `adminApiQuery`, whose `AbortSignal.timeout(3000)`
 * is sized for the small lookups it was written for. A page of the catalog —
 * every product with its Arabic translation, first variant and image — is a
 * six-figure JSON response, and it does not arrive in three seconds.
 *
 * So the fetch aborted, the helper returned `{errors:[…]}` with no `data`, the
 * loop below stopped on its first page, and an EMPTY index was cached as
 * though it were real — for ten minutes, with nothing logged. Every Arabic
 * search then answered "no results", which looked like a matching bug rather
 * than a fetch that never finished.
 */
async function fetchIndexPage(
  domain: string,
  token: string,
  after: string | null,
): Promise<any> {
  try {
    const res = await fetch(`https://${domain}/admin/api/2024-04/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify({query: INDEX_PAGE_QUERY, variables: {after}}),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return {errors: [{message: `HTTP ${res.status}: ${body.slice(0, 200)}`}]};
    }
    return await res.json();
  } catch (err: any) {
    return {errors: [{message: err?.message || String(err)}]};
  }
}

async function buildIndex(env: any): Promise<IndexCache | null> {
  let token: string | null = null;
  let domain = '';
  try {
    token = await getAdminToken(env);
    domain = getAdminDomain(env);
  } catch {
    return null;
  }
  if (!token || !domain) return null;

  const items: IndexedProduct[] = [];
  let currencyCode = 'SAR';
  let after: string | null = null;
  // Hard stop so a runaway pagination can never spin forever.
  for (let page = 0; page < 40; page++) {
    const res = await fetchIndexPage(domain, token, after);
    const data = res?.data;
    if (!data?.products) {
      /**
       * Say so. This used to `break` in silence, which is how an EMPTY index
       * came to be cached as if it were a real one.
       */
      console.error(
        `[product-search-index] Page ${page} returned no data:`,
        JSON.stringify(res?.errors || 'no errors field').slice(0, 400),
      );
      break;
    }
    if (data.shop?.currencyCode) currencyCode = data.shop.currencyCode;

    for (const p of data.products.nodes || []) {
      const titleAr =
        (p.translations || []).find((t: any) => t?.key === 'title')?.value || null;
      const variant = p.variants?.nodes?.[0];
      const image = p.featuredImage || variant?.image || null;
      items.push({
        id: p.id,
        handle: p.handle,
        titleEn: p.title || '',
        titleAr,
        isGiftCard: Boolean(p.isGiftCard),
        productType: p.productType || '',
        image: image
          ? {
              url: image.url,
              altText: image.altText ?? null,
              width: image.width ?? null,
              height: image.height ?? null,
            }
          : null,
        priceAmount: variant?.price ?? null,
        keyAr: normalizeSearchText(titleAr),
        keyEn: normalizeSearchText(`${p.title || ''} ${p.handle || ''}`),
      });
    }

    if (!data.products.pageInfo?.hasNextPage) break;
    after = data.products.pageInfo.endCursor;
  }

  /**
   * An empty index is a failed build, not a shop with no products.
   *
   * Returning it would cache "nothing matches anything" for the full TTL and
   * make every search silently dead until the ten minutes were up. `null`
   * leaves the previous cache in place and lets the next keystroke retry.
   */
  if (items.length === 0) {
    console.error(
      '[product-search-index] Build produced 0 products — not caching; the next search will retry.',
    );
    return null;
  }

  console.log(`[product-search-index] Indexed ${items.length} products.`);
  return {timestamp: Date.now(), items, currencyCode};
}

/**
 * How long a SEARCH will wait for a build before answering without it.
 *
 * Crawling the catalog is several sequential Admin pages, so the first search
 * after a restart used to sit in the request path for the whole crawl. A
 * typeahead that takes seconds to answer is not a typeahead — and because the
 * search bar fires as you type, every one of those keystrokes was waiting on
 * the same thing.
 *
 * The build still runs to completion in the background; this only bounds how
 * long any one request is willing to wait for it. Miss the window and that
 * keystroke answers from whatever is cached (possibly nothing); the next one,
 * a moment later, finds a finished index.
 */
const BUILD_WAIT_MS = 2500;

function startBuild(env: any): Promise<IndexCache | null> {
  if (!building) {
    building = buildIndex(env)
      .then(async (built) => {
        if (built) {
          cache = built;
          // So the next isolate does not have to crawl the catalog again.
          await writeSharedIndex(built);
        }
        return built ?? cache;
      })
      .catch((e) => {
        console.error('[product-search-index] Build failed:', e);
        return cache; // serve the stale copy rather than nothing
      })
      .finally(() => {
        building = null;
      });
  }
  return building;
}

/** Kick the build off without waiting — for warming the index up front. */
export function warmProductIndex(env: any): void {
  const now = Date.now();
  if (cache && now - cache.timestamp < TTL_MS) return;
  void startBuild(env);
}

async function getIndex(env: any, waitMs = BUILD_WAIT_MS): Promise<IndexCache | null> {
  const now = Date.now();
  if (cache && now - cache.timestamp < TTL_MS) return cache;

  /**
   * Before crawling, ask whether another isolate already did it. This is the
   * step that makes the deployed site behave like localhost.
   */
  const shared = await readSharedIndex();
  if (shared) {
    cache = shared;
    return shared;
  }

  const build = startBuild(env);

  // Wait, but not forever. `cache` may be a stale index or null.
  return Promise.race([
    build,
    new Promise<IndexCache | null>((resolve) =>
      setTimeout(() => resolve(cache), waitMs),
    ),
  ]);
}

export type SearchHit = IndexedProduct & {score: number};

/** A word with the Arabic definite article removed: «المانجو» → «مانجو». */
function bare(word: string): string {
  return word.length > 3 && word.startsWith('ال') ? word.slice(2) : word;
}

/** Does one query word match one title word (prefix, article-insensitive)? */
function wordMatches(queryWord: string, titleWord: string): boolean {
  const q = bare(queryWord);
  const t = bare(titleWord);
  return t.startsWith(q) || titleWord.startsWith(queryWord);
}

/**
 * How well a normalised title key answers a normalised query. 0 = no match.
 *
 *   5   the whole title, exactly
 *   4   the title starts with the query
 *   3   a word of the title starts with the query (one-word queries)
 *   2+  EVERY query word starts some title word, in any order — plus up to
 *       one point for how much of the title the query covers, so
 *       «مانجو فلفت كبير» ranks «مانجو فلفت كبير» above «مانجو فلفت كبير
 *       بالكريمة»
 *   1   the query appears somewhere inside the title
 *
 * The all-words rule is the one that was missing. Matching used to test the
 * query as a single substring, so a multi-word query only hit titles holding
 * that exact phrase, and the full search page did not use this index at all.
 */
function scoreKey(key: string, q: string, qWords: string[]): number {
  if (!key) return 0;
  if (key === q) return 5;
  if (key.startsWith(q)) return 4;
  const words = key.split(' ');
  if (qWords.length === 1 && words.some((w) => wordMatches(q, w))) return 3;
  if (
    qWords.length > 1 &&
    qWords.every((qw) => words.some((w) => wordMatches(qw, w)))
  ) {
    return 2 + Math.min(1, qWords.length / Math.max(words.length, 1));
  }
  if (key.includes(q)) return 1;
  return 0;
}

/**
 * Match `query` against the catalog, best first; shorter titles win ties.
 *
 * `ready` is false when no index could be had in time, so a caller can tell
 * "nothing matches" from "we could not look" and fall back instead of
 * showing an empty page.
 */
export async function searchProductIndex(
  env: any,
  query: string,
  limit = 6,
  /**
   * How long to wait for a cold index. The typeahead keeps the short default
   * — the next keystroke retries. The results page passes a long one: it is
   * a single request, and answering it without the index meant falling back
   * to Shopify's English-only matching, i.e. the wrong products.
   */
  waitMs = BUILD_WAIT_MS,
): Promise<{hits: SearchHit[]; currencyCode: string; ready: boolean}> {
  const q = normalizeSearchText(query);
  const idx = await getIndex(env, waitMs);
  if (!idx) return {hits: [], currencyCode: 'SAR', ready: false};
  if (!q) return {hits: [], currencyCode: idx.currencyCode, ready: true};
  const qWords = q.split(' ').filter(Boolean);

  const scored: SearchHit[] = [];
  for (const item of idx.items) {
    const score = Math.max(
      scoreKey(item.keyAr, q, qWords),
      scoreKey(item.keyEn, q, qWords),
    );
    if (score > 0) scored.push({...item, score});
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const la = (a.titleAr || a.titleEn).length;
    const lb = (b.titleAr || b.titleEn).length;
    return la - lb;
  });

  return {hits: scored.slice(0, limit), currencyCode: idx.currencyCode, ready: true};
}
