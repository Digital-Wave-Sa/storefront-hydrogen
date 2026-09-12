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
