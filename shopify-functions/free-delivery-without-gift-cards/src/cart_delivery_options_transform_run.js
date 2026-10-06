// @ts-check

/**
 * Free delivery counts merchandise only -- never the gift card.
 *
 * Shopify's rates are "Standard Delivery 19" and "Free Delivery at 299 or
 * more", and Shopify measures that 299 on the WHOLE cart. The gift card is a
 * regular product (not a native Shopify gift card), so it counts: 8 SAR of
 * cake plus a 1000 SAR gift card went out with free delivery (SDN orders,
 * Oct 2026). Shopify's rate conditions cannot leave one product out.
 *
 * So the rates are set up to offer BOTH options at any order value (the
 * Standard rate's 298.99 cap is removed), and this function picks:
 *
 *   merchandise (gift card excluded) >= threshold  ->  hide the paid option
 *   merchandise (gift card excluded) <  threshold  ->  hide the free option
 *
 * Only home-delivery (SHIPPING) options are touched. Pickup and local
 * delivery are left exactly as Shopify built them.
 *
 * Safety: it never hides every option in a group. If a group has no free
 * option, or no paid one, there is nothing to choose between and it is left
 * alone -- a checkout with no delivery option cannot be completed, which is
 * far worse than a wrong 19 SAR.
 */

/**
 * @typedef {import("../generated/api").CartDeliveryOptionsTransformRunInput} RunInput
 * @typedef {import("../generated/api").CartDeliveryOptionsTransformRunResult} RunResult
 */

/** @type {RunResult} */
const NO_CHANGES = {operations: []};

/** Shopify's Free Delivery condition today. Overridden by the config metafield. */
const DEFAULT_THRESHOLD = 299;

/** The gift-card product (app/lib/digital-lines.ts GIFT_CARD_PRODUCT_ID). */
const GIFT_CARD_PRODUCT_IDS = new Set(['gid://shopify/Product/9370203521257']);

/** Half a halala: money compared as money, not as floats. */
const EPSILON = 0.005;

/** @param {RunInput} input */
function readThreshold(input) {
  try {
    const raw = input?.deliveryCustomization?.metafield?.value;
    const value = raw ? Number(JSON.parse(raw)?.threshold) : NaN;
    return Number.isFinite(value) && value > 0 ? value : DEFAULT_THRESHOLD;
  } catch {
    return DEFAULT_THRESHOLD;
  }
}

/** @param {any} line */
function isGiftCardLine(line) {
  const merchandise = line?.merchandise;
  if (merchandise?.__typename !== 'ProductVariant') return false;
  const product = merchandise.product;
  return GIFT_CARD_PRODUCT_IDS.has(product?.id) || product?.hasAnyTag === true;
}

/**
 * @param {RunInput} input
 * @returns {RunResult}
 */
export function cartDeliveryOptionsTransformRun(input) {
  /*
   * Pickup chosen on the site: no home delivery at checkout.
   *
   * The site saves `Fulfillment Type` (Delivery / Pickup) on the cart when the
   * shopper picks a branch. Checkout's own شحن / استلام toggle cannot be
   * removed, so the other side is emptied instead: with Pickup chosen, every
   * delivery option is hidden here; with Delivery chosen, the pickup function
   * (pickup-chosen-branch) offers no branch. Switching happens in the cart.
   * No attribute (an old cart, a checkout link from elsewhere): no lock.
   */
  const fulfillmentType = String(input?.cart?.fulfillmentType?.value || '').trim().toLowerCase();
  if (fulfillmentType === 'pickup') {
    const hide = [];
    for (const group of input?.cart?.deliveryGroups ?? []) {
      for (const option of group?.deliveryOptions ?? []) {
        if (option?.handle && (option?.deliveryMethodType === 'SHIPPING' || option?.deliveryMethodType === 'LOCAL')) {
          hide.push({deliveryOptionHide: {deliveryOptionHandle: option.handle}});
        }
      }
    }
    return hide.length > 0 ? {operations: hide} : NO_CHANGES;
  }

  const threshold = readThreshold(input);

  const merchandiseTotal = (input?.cart?.lines ?? []).reduce((sum, line) => {
    if (isGiftCardLine(line)) return sum;
    const amount = parseFloat(line?.cost?.totalAmount?.amount ?? '0');
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);

  const qualifies = merchandiseTotal + EPSILON >= threshold;
  const operations = [];

  for (const group of input?.cart?.deliveryGroups ?? []) {
    const shipping = (group?.deliveryOptions ?? [])
      .filter((o) => o?.handle && o?.deliveryMethodType === 'SHIPPING')
      .map((o) => ({handle: o.handle, amount: parseFloat(o?.cost?.amount ?? '')}))
      .filter((o) => Number.isFinite(o.amount));

    const free = shipping.filter((o) => o.amount < EPSILON);
    const paid = shipping.filter((o) => o.amount >= EPSILON);

    // Nothing to choose between: leave the group alone.
    if (free.length === 0 || paid.length === 0) continue;

    for (const option of qualifies ? paid : free) {
      operations.push({deliveryOptionHide: {deliveryOptionHandle: option.handle}});
    }
  }

  return operations.length > 0 ? {operations} : NO_CHANGES;
}
