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
 * The catalog is fetched from the Admin API and cached — in module memory and
 * in the shared Oxygen cache — with stale-while-revalidate: refreshed every
 * ten minutes, but served for up to an hour while that refresh runs, so a
 * rebuild is never an outage. One paged fetch per refresh, never a call per
 * keystroke.
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

type IndexCache = {
  timestamp: number;
  items: IndexedProduct[];
  currencyCode: string;
  /**
   * False when the crawl stopped early (a page errored, or the 40-page guard
   * fired). A partial index is still better than nothing, but it is missing
   * products, so it is only held briefly and never allowed to replace a
   * complete one.
   */
  complete: boolean;
};

let cache: IndexCache | null = null;

/**
 * Two ages, not one.
 *
 * The index used to have a single ten-minute TTL, and an expired copy was
 * treated as no copy at all: `readSharedIndex` returned null, `getIndex` began
 * a crawl from zero, and every search during that crawl answered "no results".
 * Since Arabic has no other source — Shopify's predictive search cannot serve
 * it, see the header — the dropdown went dead for the length of a rebuild,
 * every ten minutes, forever.
 *
 * SOFT is "time to refresh": past it the index is still served, and a rebuild
 * runs in the background. HARD is "too old to trust": only past THIS does a
 * request wait on a build. A refresh is now invisible; only a genuinely cold
 * start costs the shopper anything.
 */
const SOFT_TTL_MS = 10 * 60 * 1000;
const HARD_TTL_MS = 60 * 60 * 1000;
/** A partial index is refreshed aggressively — it is known to be incomplete. */
const PARTIAL_SOFT_TTL_MS = 60 * 1000;

function softTtlFor(idx: IndexCache): number {
  return idx.complete === false ? PARTIAL_SOFT_TTL_MS : SOFT_TTL_MS;
}

/** Fresh enough to serve without a background refresh. */
function isFresh(idx: IndexCache | null): idx is IndexCache {
  return !!idx && Date.now() - idx.timestamp < softTtlFor(idx);
}

/** Old, but still worth serving while a rebuild runs behind it. */
function isUsable(idx: IndexCache | null): idx is IndexCache {
  return !!idx && Date.now() - idx.timestamp < HARD_TTL_MS;
}

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
    const raw = (await hit.json()) as Partial<IndexCache> | null;
    if (!raw?.items?.length || typeof raw.timestamp !== 'number') return null;
    const parsed: IndexCache = {
      timestamp: raw.timestamp,
      items: raw.items,
      currencyCode: raw.currencyCode || 'SAR',
      // Entries written before `complete` existed are whole catalogues.
      complete: raw.complete !== false,
    };
    /**
     * Stale is not useless. Only a copy past the HARD age is refused; a
     * merely-soft-expired one is returned and the caller revalidates behind
     * the response.
     */
    if (!isUsable(parsed)) return null;
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
          // The entry must outlive the SOFT age, or the Cache API would
          // evict it at the very moment stale-while-revalidate needs it.
          'Cache-Control': `max-age=${Math.floor(HARD_TTL_MS / 1000)}`,
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
  /**
   * Only a crawl that reached the last page is complete. Anything else — an
   * errored page, a throttle, the runaway guard below — leaves products out,
   * and the cache needs to know that so it can retry soon instead of holding
   * a hole in the catalogue for the full ten minutes.
   */
  let complete = false;
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

    if (!data.products.pageInfo?.hasNextPage) {
      complete = true;
      break;
    }
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

  if (!complete) {
    /**
     * Say it out loud. A partial index does not look broken — it looks like a
     * shop that is missing a few products, which is far harder to notice than
     * an empty dropdown.
     */
    console.warn(
      `[product-search-index] PARTIAL build: ${items.length} products (a page failed or the page guard fired). Holding it for ${PARTIAL_SOFT_TTL_MS / 1000}s, then retrying.`,
    );
  } else {
    console.log(`[product-search-index] Indexed ${items.length} products.`);
  }
  return {timestamp: Date.now(), items, currencyCode, complete};
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

/**
 * How long to wait when there is NOTHING to fall back on.
 *
 * 2.5s was sized for "a stale copy exists, do not block on the refresh". With
 * an empty cache the trade is different: the alternative to waiting is an
 * empty dropdown, and for Arabic — which has no second source — that means
 * the feature is simply broken for that keystroke. 422 products is five
 * sequential Admin pages, so the short wait lost that race almost every time.
 */
const COLD_BUILD_WAIT_MS = 8000;

function startBuild(env: any): Promise<IndexCache | null> {
  if (!building) {
    building = buildIndex(env)
      .then(async (built) => {
        if (built) {
          /**
           * A partial crawl must not evict a complete catalogue. Without this,
           * a single throttled refresh replaces 422 products with whatever it
           * managed to read, and products vanish from search for ten minutes.
           */
          const wouldDowngrade =
            built.complete === false &&
            cache?.complete === true &&
            isUsable(cache);
          if (!wouldDowngrade) {
            cache = built;
            // So the next isolate does not have to crawl the catalog again.
            await writeSharedIndex(built);
          }
        }
        return cache ?? built;
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

/**
 * Kick the build off without waiting — for warming the index up front.
 *
 * Checks the shared copy first, as getIndex does, so a warm-up on a fresh
 * isolate does not crawl the catalogue another isolate already crawled. Pass
 * the request's `waitUntil` so Oxygen lets the work finish after the response.
 */
export function warmProductIndex(
  env: any,
  waitUntil?: (p: Promise<unknown>) => void,
): void {
  if (isFresh(cache)) return;
  if (building) return;
  const work = (async () => {
    const shared = await readSharedIndex();
    if (shared) {
      cache = shared;
      // A soft-expired shared copy is worth having AND worth refreshing.
      if (isFresh(shared)) return;
    }
    await startBuild(env);
  })().catch(() => {});
  if (waitUntil) {
    try {
      waitUntil(work);
    } catch (e) {}
  }
}

/**
 * Refresh behind the response. Never awaited by the request that triggers it.
 *
 * `waitUntil` matters on Oxygen: work that is not registered with it can be
 * killed the moment the response is returned, which is how a warm-up could
 * start on every search and still never finish.
 */
function revalidateInBackground(
  env: any,
  waitUntil?: (p: Promise<unknown>) => void,
): void {
  if (building) return;
  const work = startBuild(env).catch(() => null);
  if (waitUntil) {
    try {
      waitUntil(work);
    } catch (e) {}
  }
}

/**
 * The index for this request — stale-while-revalidate.
 *
 * The order matters, and each step exists because of a way search went blank:
 *
 *  1. Fresh in module memory. The fast path; nothing to do.
 *  2. Stale in module memory but inside the HARD age: SERVE IT, refresh
 *     behind the response. This is the fix for "search dies every ten
 *     minutes" — a refresh is no longer an outage.
 *  3. The shared (cross-isolate) copy, same rule. This is what makes a fresh
 *     Oxygen isolate behave like a warm one.
 *  4. Genuinely nothing: wait for the crawl, and wait properly — an empty
 *     answer here is not a cheaper answer, it is a wrong one.
 */
async function getIndex(
  env: any,
  waitMs = BUILD_WAIT_MS,
  waitUntil?: (p: Promise<unknown>) => void,
): Promise<IndexCache | null> {
  if (isFresh(cache)) return cache;

  if (isUsable(cache)) {
    revalidateInBackground(env, waitUntil);
    return cache;
  }

  const shared = await readSharedIndex();
  if (shared) {
    cache = shared;
    if (!isFresh(shared)) revalidateInBackground(env, waitUntil);
    return shared;
  }

  const build = startBuild(env);

  /**
   * If the wait below runs out, this request answers while the crawl is still
   * going — and on Oxygen, work not registered with `waitUntil` can be killed
   * with the response. The crawl must survive, or the next keystroke starts
   * it all over again and search stays cold indefinitely.
   */
  if (waitUntil) {
    try {
      waitUntil(build.catch(() => null));
    } catch (e) {}
  }

  // Nothing to fall back on, so give the crawl a real chance to finish.
  const coldWait = Math.max(waitMs, COLD_BUILD_WAIT_MS);
  return Promise.race([
    build,
    new Promise<IndexCache | null>((resolve) =>
      setTimeout(() => resolve(cache), coldWait),
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
  /**
   * The request's `waitUntil`, so a background refresh triggered by this
   * search is allowed to outlive the response instead of being killed with it.
   */
  waitUntil?: (p: Promise<unknown>) => void,
): Promise<{hits: SearchHit[]; currencyCode: string; ready: boolean}> {
  const q = normalizeSearchText(query);
  const idx = await getIndex(env, waitMs, waitUntil);
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
