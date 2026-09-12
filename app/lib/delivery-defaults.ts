/**
 * The shop-wide standard delivery rate, in SAR.
 *
 * ── What this is for ──
 *
 * Shopify quotes nothing until the cart carries a delivery address, so between
 * a shopper picking a branch and entering an address there is a window where
 * the real fee is not known. The cart used to print `0.00` in that window,
 * which reads as free delivery and then became 25 — so the one number a
 * shopper checks before committing was the one number that changed.
 *
 * This is the honest guess for that window: the rate every branch falls back
 * to when it has no local delivery of its own. It is only ever a placeholder.
 * The moment Shopify answers, its quote wins and this value is not used.
 *
 * ── Keeping it true ──
 *
 * It MUST match the standard rate in Shopify admin:
 *
 *     Settings -> Shipping and delivery -> General profile
 *       -> Domestic zone -> قياسي
 *
 * which is 25.00 SAR with free delivery over 320. If that rate is ever
 * changed, change it here too. There is no way to read it from the Storefront
 * API without a quoted cart, which is precisely the situation this covers.
 *
 * Deliberately NOT per branch. Branch fees belong in Shopify Local delivery,
 * where checkout can honour them; a second per-branch list in the storefront
 * would be a rival source of truth that silently drifts.
 */
export const STANDARD_DELIVERY_FEE = 25;

/**
 * Whether the free-delivery threshold on the standard rate is met.
 *
 * Mirrors the «Free 320.00 ر.س and up» condition on the قياسي rate. Used only
 * alongside STANDARD_DELIVERY_FEE, for the same pre-quote window: promising a
 * fee to a shopper whose order already qualifies for free delivery would be
 * wrong in the direction that costs them money.
 */
export const STANDARD_FREE_DELIVERY_THRESHOLD = 320;

/**
 * What Shopify has quoted for delivering this cart, in SAR — or null when it
 * has not quoted yet (no delivery address on the cart).
 *
 * Summed across delivery groups, because a cart split across locations is
 * quoted per group. Within a group, in order:
 *
 *   1. the LOCAL option — the branch's own local-delivery fee
 *   2. whatever Shopify has selected
 *   3. the cheapest on offer
 *
 * LOCAL comes before the selected option deliberately. The cart page has no
 * delivery picker, so `selectedDeliveryOption` there is only ever Shopify's
 * automatic pick — the cheapest — and reading it first showed 25 while
 * checkout.initiate was about to open on the branch's 40.
 *
 * Matched on `deliveryMethodType`, never on title: the Storefront API returns
 * «Local Delivery» in English while checkout renders «توصيل محلي».
 *
 * A group can legitimately quote 0.00 — free delivery — which is a real
 * answer, so this returns null only when nothing was quoted at all. That
 * makes `quotedDeliveryFee(cart) === 0` the one honest test for "delivery is
 * free": it is Shopify saying so for this cart, this address, this total.
 * The storefront no longer keeps its own free-delivery threshold — the
 * metafield one promised 700 on a branch whose standard rate went free at 320,
 * and Shopify does not expose a branch's local-delivery threshold through any
 * API, so there is nothing truthful to count down to.
 */
export function quotedDeliveryFee(
  cart: any,
  opts: {isPickup?: boolean} = {},
): number | null {
  const groups: any[] = cart?.deliveryGroups?.nodes ?? [];
  if (groups.length === 0) return null;

  let total = 0;
  let quoted = false;

  for (const group of groups) {
    const options: any[] = group?.deliveryOptions ?? [];

    const localCosts = options
      .filter((o: any) => String(o?.deliveryMethodType).toUpperCase() === 'LOCAL')
      .map((o: any) => parseFloat(o?.estimatedCost?.amount ?? ''))
      .filter((n: number) => Number.isFinite(n));

    if (!opts.isPickup && localCosts.length > 0) {
      // Two local options in one group means overlapping delivery areas;
      // the cheaper is the safer promise.
      total += Math.min(...localCosts);
      quoted = true;
      continue;
    }

    const selected = parseFloat(
      group?.selectedDeliveryOption?.estimatedCost?.amount ?? '',
    );
    if (Number.isFinite(selected)) {
      total += selected;
      quoted = true;
      continue;
    }

    const costs = options
      .map((o: any) => parseFloat(o?.estimatedCost?.amount ?? ''))
      .filter((n: number) => Number.isFinite(n));
    if (costs.length > 0) {
      total += Math.min(...costs);
      quoted = true;
    }
  }

  return quoted ? total : null;
}
