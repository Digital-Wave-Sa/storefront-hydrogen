/**
 * Which discount wins when only one of them can.
 *
 * Every discount on this store is non-combinable — DISCOUNT10 and the Branch
 * Free Delivery Promo both carry `combinesWith` false for order, product AND
 * shipping. So a cart carrying a promo code and the free-delivery promo is not
 * a cart with two discounts: Shopify honours one and marks the other
 * `applicable: false`.
 *
 * Nothing used to choose. The storefront forced free delivery whenever the
 * branch and time slot qualified, in three separate places, and each one took
 * the shopper's own coupon with it. A cart showing 483.30 with DISCOUNT10
 * charged 537.00 at checkout — the full 53.70 — for delivery worth 20.
 *
 * The first attempt at a fix made the shopper's code always win. That is
 * wrong in the other direction, and a 99.00 cart proved it within the hour:
 * DISCOUNT10 was worth 9.90 against delivery worth 20, the cart promised free
 * delivery anyway because this decision did not exist, and checkout charged
 * 109.10 against the 89.10 on screen.
 *
 * So the rule is the money, not the provenance. Keep whichever is worth more.
 *
 * ── Why this is stable ──
 *
 * The comparison feeds back into itself, so it has to settle rather than
 * oscillate, and it does:
 *
 *   - Promo wins, `freeshipping` goes on, Shopify drops the coupon, the
 *     coupon is now worth 0, and `couponWorth <= 0` keeps the promo winning.
 *   - Coupon wins, `freeshipping` stays off, the coupon keeps its allocation,
 *     and it keeps winning.
 *
 * A tie goes to the shopper's code: same money either way, and the code they
 * typed is the one they will look for on the order.
 */

/** Codes the storefront applies on the shopper's behalf, not ones they chose. */
const PROMO_CODES = ['freeshipping', 'free_shipping', 'branch free delivery promo'];

export function isPromoCode(code: unknown): boolean {
  return PROMO_CODES.includes(String(code ?? '').toLowerCase().trim());
}

/**
 * Should the free-delivery promo be applied, given what the shopper's own
 * code is already giving them?
 *
 * `couponWorth` is what their code takes off today, in riyals — not its
 * headline percentage, which says nothing about this cart. `promoWorth` is
 * what the delivery would otherwise cost.
 */
export function promoBeatsCoupon(
  couponWorth: number,
  promoWorth: number,
): boolean {
  const coupon = Number.isFinite(couponWorth) ? Math.max(0, couponWorth) : 0;
  const promo = Number.isFinite(promoWorth) ? Math.max(0, promoWorth) : 0;
  if (coupon <= 0) return true;
  return promo > coupon;
}

/**
 * What a shopper's own code is taking off this cart.
 *
 * Loyalty points and store credit are discounts too, and they are also
 * non-combinable, but they are not what this decision is about — they are
 * handled where they are applied. Pass their amounts in so they can be left
 * out of the comparison.
 */
export function couponWorthOf(
  totalDiscount: number,
  loyaltyAmount = 0,
  storeCreditAmount = 0,
): number {
  return Math.max(
    0,
    (Number(totalDiscount) || 0) -
      (Number(loyaltyAmount) || 0) -
      (Number(storeCreditAmount) || 0),
  );
}
