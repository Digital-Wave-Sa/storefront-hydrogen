/**
 * Showing an offer's price before and after.
 *
 * The discounts behind /promotions/:offer are Shopify discounts applied at the
 * cart, not markdowns on the product. Nothing about the product record changes,
 * so a card on an offer page showed one price — the full one — while the page
 * around it advertised 25% off. The saving only appeared at checkout, which is
 * the last place a shopper wants to first learn what something costs.
 *
 * ProductItem already renders a struck-through original whenever
 * `compareAtPriceRange` is above `priceRange`, which is how a genuine markdown
 * displays. So rather than teach every card about offers, this restates the
 * product the way a marked-down product already looks: the discounted figure as
 * the price, the real price as the compare-at.
 *
 * This is display only. The cart applies the actual Shopify discount, and these
 * numbers are derived from that same discount, so the two agree — but nothing
 * here is sent to the cart, and the variant ids are untouched.
 */

import type {OfferDiscountValue} from '~/lib/offer-discounts.server';

/** A discount and the URL handle of the offer it came from. */
export interface OfferPricing {
  handle: string;
  discountValue?: OfferDiscountValue;
}

const money = (amount: number, currencyCode: string) => ({
  amount: amount.toFixed(2),
  currencyCode,
});

/** The price after the discount, or null when it cannot be worked out. */
export function discountedAmount(
  price: number,
  discount: OfferDiscountValue | undefined | null,
): number | null {
  if (!discount || !Number.isFinite(price) || price <= 0) return null;

  if (discount.type === 'percentage' && discount.percentage) {
    const next = price * (1 - discount.percentage);
    // A 100% discount is a giveaway, not a price — leave those to the BXGY
    // "free item" treatment rather than printing 0.00 on a card.
    if (next <= 0 || next >= price) return null;
    return Math.round(next * 100) / 100;
  }

  if (discount.type === 'amount' && discount.amount) {
    const next = price - discount.amount;
    if (next <= 0 || next >= price) return null;
    return Math.round(next * 100) / 100;
  }

  return null;
}

/**
 * A copy of the product priced as the offer prices it.
 *
 * Returns the product untouched when there is no usable discount, so a caller
 * can map over a list without checking first. `offerHandles` is carried on the
 * result so the hub's filter tabs can tell which offer a card came from —
 * membership there used to be read from product tags, and a product entitled by
 * a discount does not necessarily carry one.
 */
export function applyOfferPricing<T extends Record<string, any>>(
  product: T,
  offer: OfferPricing | undefined | null,
): T {
  const handles: string[] = Array.isArray(product.offerHandles)
    ? [...product.offerHandles]
    : [];
  if (offer?.handle && !handles.includes(offer.handle)) handles.push(offer.handle);

  const priced = handles.length > 0 ? {...product, offerHandles: handles} : product;

  const current = priced.priceRange?.minVariantPrice;
  const price = parseFloat(current?.amount ?? '');
  const next = discountedAmount(price, offer?.discountValue);
  if (next === null) return priced as T;

  const currencyCode = current?.currencyCode || 'SAR';

  /**
   * The compare-at is the price the shopper would otherwise pay — the product's
   * own price, not any existing compare-at. A product already marked down from
   * 100 to 80 and then given another 25% costs 60, and the honest "before" for
   * that is 80. Showing 100 would claim a saving the offer does not give.
   */
  return {
    ...priced,
    priceRange: {
      ...priced.priceRange,
      minVariantPrice: money(next, currencyCode),
      ...(priced.priceRange?.maxVariantPrice
        ? {maxVariantPrice: money(next, currencyCode)}
        : {}),
    },
    compareAtPriceRange: {
      ...(priced.compareAtPriceRange ?? {}),
      minVariantPrice: money(price, currencyCode),
    },
    /** Whole percent, for a badge. */
    offerDiscountPct: Math.round(((price - next) / price) * 100),
  } as T;
}
