// @ts-check

/**
 * Keep the branch's own delivery fee, hide the options that undercut it.
 *
 * ── The problem this solves ──
 *
 * Branch delivery fees are configured as Shopify LOCAL DELIVERY, per location.
 * A shopper whose address falls inside a branch's delivery area is therefore
 * quoted twice at checkout:
 *
 *     Local delivery   40.00     <- Al Qurayyat's own fee
 *     قياسي            25.00     <- the shop-wide standard rate
 *
 * Both are valid, so Shopify shows both, and the shopper picks 25. The branch
 * fee never gets charged, and the cart -- which shows 40, because it reads the
 * local delivery quote -- disagrees with what they pay. That is the exact
 * cart/checkout mismatch this whole piece of work exists to remove.
 *
 * ── How it decides ──
 *
 * Not by title. Titles are localised, merchant-editable, and differ between
 * Arabic and English checkouts, so matching on them breaks the first time
 * somebody renames a rate.
 *
 * Instead it uses the `Delivery Fee` cart attribute the storefront already
 * writes when a shopper picks a branch. Whichever delivery option COSTS that
 * amount is the branch's option; every other option in the same group is
 * hidden. Locale-independent, rename-proof, and it reuses data that is already
 * flowing.
 *
 * ── Safety rules, in order of how badly they would hurt ──
 *
 * 1. It never hides every option in a group. A group with nothing left is a
 *    checkout that cannot be completed, which is far worse than a shopper
 *    paying 25 instead of 40. Every branch below that cannot find a match
 *    leaves the group untouched.
 *
 * 2. No attribute, an unparseable one, or a zero means no opinion: leave
 *    everything alone. A shopper who never opened the branch picker, or whose
 *    session predates the attribute, still checks out normally.
 *
 * 3. An order over the free-delivery threshold quotes 0.00, which matches no
 *    branch fee, so rule 1 leaves it alone and the shopper keeps free
 *    delivery. See the README for the matching setting this depends on.
 */

/**
 * @typedef {import("../generated/api").RunInput} RunInput
 * @typedef {import("../generated/api").CartDeliveryOptionsTransformRunResult} CartDeliveryOptionsTransformRunResult
 */

/** @type {CartDeliveryOptionsTransformRunResult} */
const NO_CHANGES = {operations: []};

/**
 * Money compared as money, not as floats. `40` and `40.0` arrive as strings
 * from different places, and `0.1 + 0.2 !== 0.3` is not a hypothetical when
 * the wrong answer is a checkout with no delivery option on it.
 */
const SAME_MONEY_TOLERANCE = 0.005;

/**
 * @param {RunInput} input
 * @returns {CartDeliveryOptionsTransformRunResult}
 */
export function cartDeliveryOptionsTransformRun(input) {
  const rawFee = input?.cart?.attribute?.value;
  const branchFee = rawFee == null ? NaN : parseFloat(String(rawFee).trim());

  // Safety rule 2: no usable branch fee means no opinion.
  if (!Number.isFinite(branchFee) || branchFee <= 0) {
    return NO_CHANGES;
  }

  const groups = input?.cart?.deliveryGroups ?? [];
  const operations = [];

  for (const group of groups) {
    const options = (group?.deliveryOptions ?? [])
      .filter((option) => Boolean(option?.handle))
      .map((option) => ({
        handle: option.handle,
        amount: parseFloat(option?.cost?.amount ?? ''),
      }));

    // One option is already the only option; there is nothing to choose
    // between, and hiding it would empty the group.
    if (options.length < 2) continue;

    const keep = options.filter(
      (option) =>
        Number.isFinite(option.amount) &&
        Math.abs(option.amount - branchFee) < SAME_MONEY_TOLERANCE,
    );

    // Safety rule 1 and 3: nothing matches the branch fee, so this group is
    // not one we understand -- an address outside every delivery area, or an
    // order that has gone free. Leave it exactly as Shopify built it.
    if (keep.length === 0) continue;

    // Everything already costs the branch fee. Nothing to hide.
    if (keep.length === options.length) continue;

    const keptHandles = new Set(keep.map((option) => option.handle));
    for (const option of options) {
      if (!keptHandles.has(option.handle)) {
        operations.push({
          deliveryOptionHide: {deliveryOptionHandle: option.handle},
        });
      }
    }
  }

  return operations.length > 0 ? {operations} : NO_CHANGES;
}
