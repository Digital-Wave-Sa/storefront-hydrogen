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

async function getIndex(env: any): Promise<IndexCache | null> {
  const now = Date.now();
  if (cache && now - cache.timestamp < TTL_MS) return cache;
  if (!building) {
    building = buildIndex(env)
      .then((built) => {
        if (built) cache = built;
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

export type SearchHit = IndexedProduct & {score: number};

/**
 * Match `query` against the catalog. Ranks a word-start match above a
 * mid-word match, and shorter titles first on ties, so "شوك" surfaces
 * "شوكولاتة" products before longer titles that merely contain it.
 */
export async function searchProductIndex(
  env: any,
  query: string,
  limit = 6,
): Promise<{hits: SearchHit[]; currencyCode: string}> {
  const q = normalizeSearchText(query);
  const idx = await getIndex(env);
  if (!q || !idx) return {hits: [], currencyCode: idx?.currencyCode || 'SAR'};

  const scored: SearchHit[] = [];
  for (const item of idx.items) {
    let score = 0;
    for (const key of [item.keyAr, item.keyEn]) {
      if (!key) continue;
      if (key.startsWith(q)) score = Math.max(score, 3);
      else if (key.split(' ').some((w) => w.startsWith(q))) score = Math.max(score, 2);
      else if (key.includes(q)) score = Math.max(score, 1);
    }
    if (score > 0) scored.push({...item, score});
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const la = (a.titleAr || a.titleEn).length;
    const lb = (b.titleAr || b.titleEn).length;
    return la - lb;
  });

  return {hits: scored.slice(0, limit), currencyCode: idx.currencyCode};
}
