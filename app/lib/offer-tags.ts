/**
 * Which products belong to which offer.
 *
 * Membership is decided by Shopify product TAGS, compared case-insensitively
 * after trimming. This is the single rule for the whole promotions surface:
 * the hub (/promotions), each offer page (/promotions/:offer), and the mobile
 * app's `src/services/shopify/offerTags.ts`, which mirrors this file.
 *
 * Before this existed the hub guessed membership from a discount-percentage
 * range (`>= 15 && <= 35` meant "probably the 25% gift offer") and from loose
 * substring matches on titles, while the offer pages required an exact tag. The
 * same offer therefore listed different products depending on which page you
 * were standing on, and a product could appear in an offer purely because its
 * own unrelated markdown happened to land in the right percentage band.
 *
 * Tagging a product in Shopify Admin is the single action that adds it to an
 * offer, on every surface. When you add a tag spelling here, add it to the
 * app's `src/services/shopify/offerTags.ts` too.
 */

export type OfferHandle = 'bogo' | 'gifts25' | 'chocolates40';

/**
 * Every offer the hub knows about, in the order it lists them. The hub resolves
 * each one's products from its Shopify discount so they appear in the grid, and
 * the filter tabs are built from the same list.
 */
export const OFFER_HANDLES: OfferHandle[] = ['bogo', 'gifts25', 'chocolates40'];

const OFFER_TAGS: Record<OfferHandle, string[]> = {
  bogo: ['bogo', '1+1', 'bogo-offer', '1+1 مجاناً', '1+1-مجاناً'],
  gifts25: ['gifts25', '25-off', '25%', 'gifts-25', 'خصم-25'],
  chocolates40: ['chocolates40', '40-off', '40%', 'chocolates-40', 'خصم-40'],
};

/** Alternative URL spellings that resolve to the same offer. */
const HANDLE_ALIASES: Record<string, OfferHandle> = {
  bogo: 'bogo',
  '1+1': 'bogo',
  gifts25: 'gifts25',
  gifts: 'gifts25',
  'gift-boxes': 'gifts25',
  chocolates40: 'chocolates40',
  chocolates: 'chocolates40',
  chocolate: 'chocolates40',
};

const normalize = (tag: unknown) => String(tag ?? '').toLowerCase().trim();

/** Resolve a URL segment to a known offer, or null for a custom handle. */
export function resolveOfferHandle(handle: unknown): OfferHandle | null {
  return HANDLE_ALIASES[normalize(handle)] ?? null;
}

/** True when the product carries one of the offer's tags. */
export function productHasOffer(
  product: {tags?: string[] | null},
  offer: OfferHandle,
): boolean {
  const wanted = OFFER_TAGS[offer];
  if (!wanted) return false;
  return (product.tags || []).map(normalize).some((t) => wanted.includes(t));
}

/**
 * Products in an offer: exactly those carrying one of its tags.
 *
 * There is deliberately no keyword or price-band fallback. Guessing membership
 * from words in the title looked helpful against a small sample and was plainly
 * wrong against the real catalogue — "علبة" appears in most boxed products, so a
 * "25% off gift boxes" offer swelled to 121 items. An empty offer is a missing
 * tag, which is fixable in Shopify Admin in seconds; a wrong offer is a price
 * promise the cart will not honour.
 */
export function filterByOffer<T extends {tags?: string[] | null}>(
  products: T[],
  offer: OfferHandle,
): T[] {
  return products.filter((p) => productHasOffer(p, offer));
}

/**
 * Products for an arbitrary URL handle. Known handles use the strict tag list;
 * an unknown handle falls back to matching the handle against the tags, which
 * is how custom one-off offers keep working without a code change.
 */
export function filterByOfferHandle<T extends {tags?: string[] | null}>(
  products: T[],
  handle: string,
): T[] {
  const known = resolveOfferHandle(handle);
  if (known) return filterByOffer(products, known);

  const wanted = normalize(handle);
  if (!wanted) return [];
  return products.filter((p) =>
    (p.tags || []).map(normalize).some((t) => t === wanted || t.includes(wanted)),
  );
}

/** The tag spellings an offer accepts — useful for admin-facing help text. */
export function tagsForOffer(offer: OfferHandle): string[] {
  return [...(OFFER_TAGS[offer] || [])];
}

/**
 * Tag spellings to look for on the DISCOUNT for a given URL handle.
 *
 * A merchant tags the discount in Shopify (`gifts25`, `25-off`, …) and the
 * matching offer page finds it. An unknown handle is searched for as-is, so a
 * one-off promotion works by tagging its discount with the handle you link to.
 */
export function tagsForOfferHandle(handle: string): string[] {
  const known = resolveOfferHandle(handle);
  if (known) return tagsForOffer(known);
  const raw = normalize(handle);
  return raw ? [raw] : [];
}
