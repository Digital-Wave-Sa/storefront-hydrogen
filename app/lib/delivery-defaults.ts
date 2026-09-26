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
 * which is 19.00 SAR at the time of writing. If that rate is ever changed,
 * change it here too (the free-delivery threshold, by contrast, has no copy
 * here at all — see STANDARD_FREE_DELIVERY_THRESHOLD below). There is no way to read it from the Storefront
 * API without a quoted cart, which is precisely the situation this covers.
 *
 * Deliberately NOT per branch. Branch fees belong in Shopify Local delivery,
 * where checkout can honour them; a second per-branch list in the storefront
 * would be a rival source of truth that silently drifts.
 *
 * ── Why it was wrong ──
 *
 * It said 25 while the shop charges 19, and that was not cosmetic.
 * `getStandardDeliveryRate` exists to read the live rate from the Admin API
 * and make this constant irrelevant — but it could not match this shop's rate
 * shape (see delivery-rate.server.ts) and fell back here every single time.
 * So the cart printed «رسوم التوصيل ٢٥٫٠٠» on every delivery order that had no
 * address yet, and checkout then charged «التوصيل القياسي ١٩٫٠٠». Six riyals,
 * on the one number a shopper checks before committing, on every order, for as
 * long as both bugs stood. Fixing the reader matters more than fixing this
 * number; both are done.
 */
export const STANDARD_DELIVERY_FEE = 19;

/**
 * The free-delivery threshold when Shopify cannot be asked: UNKNOWN, on purpose.
 *
 * The real threshold is the «Free Delivery … and up» rate on the Domestic
 * zone, read live by `getStandardDeliveryRate` (root passes it to every page
 * as `standardFreeDeliveryThreshold`). This used to be a hardcoded 320, and
 * the day the rate was changed to 299 in Shopify, every Admin hiccup put
 * «للطلبات فوق 320 ر.س» back on product pages — a number the shop no longer
 * offered, printed with full confidence.
 *
 * So there is no fallback number. `null` means "we could not find out", and
 * every consumer treats it that way: the product page keeps the free-delivery
 * line but drops the amount («للطلبات المؤهلة») rather than guess, and the
 * cart simply does not assume free
 * delivery before Shopify has quoted (the quote, once there, is authoritative
 * anyway). Change the threshold in Shopify admin only; nothing here.
 */
export const STANDARD_FREE_DELIVERY_THRESHOLD: number | null = null;

/**
 * Whether the delivery fee carries VAT — a LAST-RESORT fallback only.
 *
 * The live answer is Shopify's `shop.taxShipping` ("Charge tax on shipping
 * rates", Settings → Taxes and duties), read by `getStandardDeliveryRate` on
 * the same Admin call as the rate itself. This constant is used only when that
 * call fails, so it must hold what the shop is actually set to: true, since
 * the setting was switched on in September 2026.
 *
 * Why it matters: with prices tax-inclusive and delivery taxed, Shopify's
 * checkout reports the VAT inside the delivery fee too — on a 21.00 cart with
 * 19.00 delivery, 5.22 (40 × 15/115), not 2.74 (21 × 15/115). A cart that
 * leaves delivery out shows a different VAT figure from the checkout it hands
 * the shopper to, on the same total.
 */
export const DELIVERY_IS_TAXED = true;

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
