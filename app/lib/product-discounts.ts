/**
 * Before/after prices from live automatic discounts, for cards and product
 * pages. The data comes from the root loader (`liveDiscounts`, built by
 * ~/lib/product-discounts.server); this file is safe for the browser.
 *
 * Display only. The cart applies the actual Shopify discount by itself, and the
 * numbers here are worked out from that same discount, so the two agree.
 * Nothing here is sent to the cart.
 */

import {useRouteLoaderData} from 'react-router';
import {discountedAmount} from '~/lib/offer-pricing';
import type {OfferDiscountValue} from '~/lib/offer-discounts.server';
import type {LiveDiscounts} from '~/lib/product-discounts.server';

export type {LiveDiscounts};

/** The live discounts from the root loader, or null before/without them. */
export function useLiveDiscounts(): LiveDiscounts | null {
  const root = useRouteLoaderData('root') as any;
  return (root?.liveDiscounts as LiveDiscounts | undefined) ?? null;
}

const numericId = (gid: unknown) => {
  const id = String(gid ?? '').split('/').pop()?.trim();
  return id && /^\d+$/.test(id) ? id : null;
};

function discountsFor(
  live: LiveDiscounts,
  productId: unknown,
  variantId?: unknown,
): OfferDiscountValue[] {
  const pid = numericId(productId);
  const vid = numericId(variantId);
  return [
    ...(live.all || []),
    ...((pid && live.products?.[pid]) || []),
    ...((vid && live.variants?.[vid]) || []),
  ];
}

/** The lowest price any of `discounts` gives, or null when none lowers it. */
function bestPrice(price: number, discounts: OfferDiscountValue[]): number | null {
  let best: number | null = null;
  for (const d of discounts) {
    const next = discountedAmount(price, d);
    if (next !== null && (best === null || next < best)) best = next;
  }
  return best;
}

const money = (amount: number, currencyCode: string) => ({
  amount: amount.toFixed(2),
  currencyCode,
});

/**
 * A product priced the way the cart will price it, shaped like a marked-down
 * product (price = after, compare-at = before) so every card that already
 * shows a struck-through compare-at shows the offer with no other change.
 *
 * Returned untouched when nothing applies, or when the product was already
 * priced by an offer page (`offerDiscountPct`), so a discount is never taken
 * off twice.
 */
export function withLiveDiscount<T extends Record<string, any>>(
  product: T,
  live: LiveDiscounts | null,
): T {
  if (!live || !product || product.offerDiscountPct != null) return product;

  // A variant-level discount counts for a card only when the product has a
  // single variant — otherwise the card's "from" price could be a variant the
  // discount does not cover.
  const variants = product.variants?.nodes;
  const onlyVariantId =
    Array.isArray(variants) && variants.length === 1 ? (variants[0] as any)?.id : undefined;

  const discounts = discountsFor(live, product.id, onlyVariantId);
  if (!discounts.length) return product;

  const current = product.priceRange?.minVariantPrice;
  const price = parseFloat(current?.amount ?? '');
  if (!Number.isFinite(price) || price <= 0) return product;

  const next = bestPrice(price, discounts);
  if (next === null) return product;

  const currencyCode = current?.currencyCode || 'SAR';
  return {
    ...product,
    priceRange: {
      ...product.priceRange,
      minVariantPrice: money(next, currencyCode),
      ...(product.priceRange?.maxVariantPrice
        ? {maxVariantPrice: money(next, currencyCode)}
        : {}),
    },
    // The honest "before" is what the shopper would pay today without the
    // offer — the current price, not an older compare-at.
    compareAtPriceRange: {
      ...(product.compareAtPriceRange ?? {}),
      minVariantPrice: money(price, currencyCode),
    },
    offerDiscountPct: Math.round(((price - next) / price) * 100),
  } as T;
}

/** A product list priced with `withLiveDiscount`. */
export function withLiveDiscounts<T extends Record<string, any>>(
  products: T[],
  live: LiveDiscounts | null,
): T[] {
  if (!live || !Array.isArray(products)) return products;
  return products.map((p) => withLiveDiscount(p, live));
}

/**
 * The selected variant's offer price on a product page, or null when no live
 * discount lowers it. `before` is the variant's current price.
 */
export function liveVariantPrice(
  live: LiveDiscounts | null,
  productId: unknown,
  variant: {id?: string; price?: {amount?: string; currencyCode?: string}} | null | undefined,
): {after: number; before: number; pct: number; currencyCode: string} | null {
  if (!live || !variant?.price) return null;
  const before = parseFloat(variant.price.amount ?? '');
  if (!Number.isFinite(before) || before <= 0) return null;
  const after = bestPrice(before, discountsFor(live, productId, variant.id));
  if (after === null) return null;
  return {
    after,
    before,
    pct: Math.round(((before - after) / before) * 100),
    currencyCode: variant.price.currencyCode || 'SAR',
  };
}
