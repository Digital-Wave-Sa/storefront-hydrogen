/**
 * Reads the cake price book out of Shopify.
 *
 * ── Why this reads `cake_attribute` and not a definition of its own ──
 *
 * The store already prices cakes. `/custom-cake` has been reading the
 * `cake_attribute` metaobject since before the new builder existed, and its
 * `price_delta` field is exactly the model the client confirmed: a base price
 * on the shape, a flat delta on everything else.
 *
 * A second definition holding the same kind of number would be a rival source
 * of truth — the client would edit one, the site would read the other, and the
 * discrepancy would surface as a wrong price on a real order. So this reads
 * the existing rows, and extending the builder means adding entries, not
 * adding a system.
 *
 * ── What has to change in admin, once ──
 *
 * `cake_attribute` today holds five prototype entries with auto-generated
 * handles (`shape`, `shape-1`, `topping`, `topping-1`, `flavor`) and no stable
 * identifier — the only name on a row is `name_english`, free text. The new
 * builder addresses everything by catalog id (`round-20x20-h8`, `07`,
 * `rose-garden`), so matching on a display name would break the moment someone
 * fixes a typo in admin.
 *
 * One additive change fixes it: a `builder_key` single-line text field on the
 * definition, holding the catalog id. Existing rows and the existing
 * `/custom-cake` page are unaffected — they never read it.
 *
 * ── Vocabulary ──
 *
 * `attribute_type` already discriminates the rows, and its existing values map
 * one-to-one onto the new builder. They are reused verbatim rather than
 * renamed, so the old page keeps working:
 *
 *     shape   → the 23 formats      (the base price)
 *     flavor  → the 10 fillings     (a flat delta)
 *     topping → the 16 decorations  (a flat delta)
 *     extra   → photo print, writing (new value, additive)
 */

import {type CakePriceBook} from '~/lib/cake-pricing';

const ATTRIBUTE_TYPE = 'cake_attribute';

/** Long enough to matter, short enough that a price fix lands within a coffee. */
const CACHE_TTL_MS = 5 * 60 * 1000;

const PRICE_BOOK_QUERY = `#graphql
  query CakePriceBook($first: Int!, $after: String) {
    metaobjects(type: "cake_attribute", first: $first, after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes {
        handle
        attributeType: field(key: "attribute_type") { value }
        builderKey:    field(key: "builder_key")    { value }
        nameEn:        field(key: "name_english")   { value }
        nameAr:        field(key: "name_arabic")    { value }
        priceDelta:    field(key: "price_delta")    { value }
      }
    }
  }
` as const;

let cache: {book: CakePriceBook; at: number} | null = null;

async function fetchPriceBook(storefront: any): Promise<CakePriceBook> {
  const formats: Record<string, number> = {};
  const fillings: Record<string, number> = {};
  const decorations: Record<string, number> = {};
  const extras: {photoPrint: number; writing: number} = {
    photoPrint: NaN,
    writing: NaN,
  };

  let after: string | null = null;

  // Paginated even though 49 rows fit in one page today. A book truncated
  // mid-format would fail safe on cakes that are perfectly well priced, which
  // reads to the client as the site being broken rather than as a gap.
  for (let page = 0; page < 10; page++) {
    const data: any = await storefront.query(PRICE_BOOK_QUERY, {
      variables: {first: 250, after},
      cache: storefront.CacheShort?.(),
    });

    for (const node of data?.metaobjects?.nodes ?? []) {
      const group = node?.attributeType?.value;
      const key = node?.builderKey?.value;
      const raw = node?.priceDelta?.value;

      // A row without a builder_key is one of the five prototype entries, or a
      // new row someone half-filled. Either way it belongs to no catalog item,
      // so it is skipped rather than guessed at by name.
      if (!group || !key) continue;

      // `price_delta` is number_integer on the existing definition: whole
      // riyals, no halalas. Blank or unparseable leaves the key out of the map
      // entirely, which is what makes `priceCake` report it as missing rather
      // than charge zero for it.
      const price = raw === null || raw === undefined || raw === ''
        ? NaN
        : Number(raw);
      if (!Number.isFinite(price) || price < 0) continue;

      if (group === 'shape') formats[key] = price;
      else if (group === 'flavor') fillings[key] = price;
      else if (group === 'topping') decorations[key] = price;
      else if (group === 'extra') {
        if (key === 'photoPrint') extras.photoPrint = price;
        if (key === 'writing') extras.writing = price;
      }
    }

    if (!data?.metaobjects?.pageInfo?.hasNextPage) break;
    after = data.metaobjects.pageInfo.endCursor;
  }

  return {
    currency: 'SAR',
    // The store is `taxesIncluded: true` shop-wide, so prices entered in admin
    // are tax-inclusive like every other price on the site. Hardcoded rather
    // than read per row: a per-row tax flag would let half the book disagree
    // with the other half, and with the shop.
    taxIncluded: true,
    formats,
    fillings,
    decorations,
    extras,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * The price book, cached.
 *
 * Returns null rather than an empty book when Shopify cannot be reached, so a
 * network blip reads downstream as "price unavailable" and blocks the sale,
 * instead of reading as "everything is free".
 */
export async function getCakePriceBook(
  context: any,
): Promise<CakePriceBook | null> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.book;

  try {
    const book = await fetchPriceBook(context.storefront);
    cache = {book, at: now};
    return book;
  } catch (error) {
    console.error('[CAKE PRICING] Could not read the price book:', error);
    // A stale book beats no book: the client's last known prices are far more
    // likely to be right than refusing every sale until Shopify answers again.
    if (cache) return cache.book;
    return null;
  }
}

/** For tests and for the admin health check, which must not see a cached book. */
export function clearCakePriceBookCache() {
  cache = null;
}
