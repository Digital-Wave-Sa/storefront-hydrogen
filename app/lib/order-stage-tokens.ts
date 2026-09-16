/**
 * The tokens that say where an order is, shared by the tracking page and the
 * notification webhook.
 *
 * These lists used to live only inside the `/track-order/:id` loader. The
 * "ready" email has to decide the same thing from a webhook payload, and two
 * copies of a list like this drift: the day someone teaches the ERP to write
 * «جاهز-للتسليم-من-الفرع», the tracking page and the email would disagree about
 * whether the order is ready, which is worse than either being wrong alone.
 *
 * Signals are read in order of trust, the same order the tracking page uses:
 *   1. Shopify's own fulfillment state
 *   2. ERP order tags and the `custom.order_status` metafield, as WHOLE tokens
 *
 * Free-text custom attributes are deliberately not consulted. A value like
 * «fulfillment type: delivery» describes how an order ships, not where it is,
 * and substring-matching it once pushed brand-new orders to "in transit".
 */

/** Lowercase and collapse spaces/underscores to hyphens: "Ready For Pickup" -> "ready-for-pickup". */
export const normToken = (v: unknown) =>
  String(v ?? '')
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-');

export const FAILED_TOKENS = [
  'failure',
  'failed',
  'attempted-delivery',
  'expired',
  'تعذر-التسليم',
  'انتهت-مدة-الاستلام',
];

/** Stage 5 — the customer has it. */
export const STEP5_TOKENS = [
  'delivered',
  'picked-up',
  'تم-التسليم',
  'تم-الاستلام',
  'تم-استلام-الطلب',
];

/**
 * Stage 4 — made, and no longer in the kitchen.
 *
 * Note this pools "ready" with "already moving": `ready-for-delivery` and
 * `out-for-delivery` are both step 4 on the timeline. The email needs the
 * finer distinction, so READY_TOKENS below is the subset that means "ready,
 * not yet dispatched".
 */
export const STEP4_TOKENS = [
  'ready-for-pickup',
  'ready-for-delivery',
  'out-for-delivery',
  'in-transit',
  'on-the-way',
  'label-printed',
  'label-purchased',
  'submitted',
  'جاهز-للاستلام',
  'جاهز-للتسليم',
  'في-الطريق',
];

export const STEP3_TOKENS = [
  'in-progress',
  'preparing',
  'being-prepared',
  'processing',
  'جاري-التجهيز',
  'قيد-التجهيز',
];

export const STEP2_TOKENS = ['confirmed', 'accepted', 'تم-التأكيد', 'تأكيد'];

/** «Come and get it» — the branch has it waiting. */
export const READY_FOR_PICKUP_TOKENS = ['ready-for-pickup', 'جاهز-للاستلام'];

/** «It is made and about to go out» — not yet with a courier. */
export const READY_FOR_DELIVERY_TOKENS = ['ready-for-delivery', 'جاهز-للتسليم'];

/**
 * Tokens that mean the order has already left. A shopper whose order is
 * genuinely on the road should not be told it is "ready at the branch", so
 * these suppress the ready email even when a ready tag is still sitting there
 * — ERPs add tags far more often than they remove them.
 */
export const IN_TRANSIT_TOKENS = [
  'out-for-delivery',
  'in-transit',
  'on-the-way',
  'في-الطريق',
];

/**
 * Pull every progress token out of an order, from either API shape.
 *
 * The Admin GraphQL order and the REST webhook payload spell all of this
 * differently, and the webhook is the one that matters here: `tags` arrives as
 * an array from GraphQL but a comma-separated string from REST, and the
 * metafield is not in the webhook body at all, so callers pass it separately
 * when they have it.
 */
export function collectOrderTokens(
  order: any,
  orderStatusMeta = '',
): {fulfillment: string[]; erp: Set<string>} {
  const fulfillments: any[] = order?.fulfillments || [];
  const fulfillmentOrders: any[] =
    order?.fulfillmentOrders?.nodes || order?.fulfillment_orders || [];

  const fulfillment = [
    ...fulfillments.map((f: any) => normToken(f?.displayStatus)),
    ...fulfillments.map((f: any) => normToken(f?.shipment_status)),
    ...fulfillments.map((f: any) => normToken(f?.status)),
    ...fulfillmentOrders.map((fo: any) => normToken(fo?.status)),
    ...fulfillmentOrders.map((fo: any) => normToken(fo?.requestStatus)),
  ].filter(Boolean);

  const rawTags: string[] = Array.isArray(order?.tags)
    ? order.tags
    : typeof order?.tags === 'string'
      ? order.tags.split(',')
      : [];

  const erp = new Set<string>([
    ...rawTags.map(normToken),
    ...String(orderStatusMeta || '').split(',').map(normToken),
  ]);
  erp.delete('');

  return {fulfillment, erp};
}

export type ReadyKind = 'pickup' | 'delivery' | null;

/**
 * Is this order ready for the customer, and in which sense?
 *
 * Returns null when it is not ready, has already moved on, or has failed —
 * anything that would make «طلبك جاهز» the wrong thing to say. The caller still
 * has to decide whether it has already told them; see the notified_stages
 * metafield in the webhook.
 */
export function readyKind(
  order: any,
  orderStatusMeta = '',
): ReadyKind {
  const {fulfillment, erp} = collectOrderTokens(order, orderStatusMeta);
  const has = (list: string[]) =>
    list.some((t) => erp.has(t) || fulfillment.includes(t));

  if (order?.cancelled_at || order?.canceledAt) return null;
  if (has(FAILED_TOKENS)) return null;
  // Already handed over, or already on the road.
  if (has(STEP5_TOKENS) || has(IN_TRANSIT_TOKENS)) return null;
  const fulfillmentStatus = String(
    order?.displayFulfillmentStatus || order?.fulfillment_status || '',
  ).toUpperCase();
  if (fulfillmentStatus === 'FULFILLED') return null;

  if (has(READY_FOR_PICKUP_TOKENS)) return 'pickup';
  if (has(READY_FOR_DELIVERY_TOKENS)) return 'delivery';
  return null;
}
