import {isNonShippableLine} from '~/lib/digital-lines';

/**
 * How much of a cart loyalty points and wallet credit may pay for, in SAR.
 *
 * Gift cards are excluded, the same rule the Discountable collection
 * enforces for coupons: none of coupons, points or wallet credit may buy a
 * gift card. Without this the widgets offered the gift card's value too, and
 * because both redemptions DEBIT first (SDLP points, the wallet) and are
 * restricted by Shopify afterwards, a shopper who redeemed 250 SAR against a
 * 50 SAR cake and a 200 SAR gift card lost 200 SAR of balance for nothing.
 *
 * What remains:
 *
 *   merchandise that is not a gift card (line cost, after line discounts)
 *   − order-level discounts already granted (shipping allocations excluded)
 *   + `addBack` — the redemption being replaced, which is counted in those
 *     allocations but is about to be removed
 *
 * Pure and shape-tolerant, so the cart widgets and the cart action run the
 * exact same arithmetic.
 */
export function redeemableAmount(cart: any, addBack = 0): number {
  const lines: any[] = cart?.lines?.nodes ?? cart?.lines?.edges?.map((e: any) => e?.node) ?? [];
  const merchandise = lines.reduce((acc, line) => {
    if (!line || isNonShippableLine(line)) return acc;
    const amount = parseFloat(line?.cost?.totalAmount?.amount ?? '0');
    return acc + (Number.isFinite(amount) ? amount : 0);
  }, 0);
  const orderDiscounts =
    cart?.discountAllocations?.reduce((acc: number, allocation: any) => {
      if (allocation?.targetType === 'SHIPPING_LINE') return acc;
      return acc + parseFloat(allocation?.discountedAmount?.amount || '0');
    }, 0) || 0;
  return Math.max(0, Math.round((merchandise - orderDiscounts + addBack) * 100) / 100);
}

/** True when the cart holds a gift card — for the explanatory notes. */
export function cartHasGiftCard(cart: any): boolean {
  const lines: any[] = cart?.lines?.nodes ?? cart?.lines?.edges?.map((e: any) => e?.node) ?? [];
  return lines.some((line) => isNonShippableLine(line));
}
