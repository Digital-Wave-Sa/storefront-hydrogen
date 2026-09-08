/**
 * One reading of an order's status, for every screen that shows one.
 *
 * There were three: the orders list, the dashboard's last-order card, and
 * /track-order. They disagreed. The same delivered order read «تم التسليم
 * بنجاح» on the list and «تعذر التسليم» on the dashboard, because the
 * dashboard's copy matched loosely:
 *
 *     st === target || st.includes(target) || target.includes(st)
 *
 * That last clause matches when the KEYWORD contains the token, not only the
 * reverse — so a bare keyword like «تعذر» or 'expired' matched almost any short
 * token. And the failure branch is tested before the delivered branch, so a
 * false positive there beat `fulfillmentStatus === 'FULFILLED'`.
 *
 * This is the orders-list version, moved rather than rewritten: exact tag
 * matches on a normalised set, no substring guessing. Spelling is folded to the
 * hyphen form first, because the ERP writes «تعذر التسليم» with spaces,
 * Shopify writes some statuses with underscores, and an earlier attempt to
 * normalise only one side left every lookup matching nothing.
 */

export type OrderStatusResult = {
  statusEn: string;
  statusAr: string;
  statusColor: string;
};

/** Hyphen is the shared spelling; spaces and underscores fold into it. */
export function normalizeStatusToken(t: unknown): string {
  return String(t ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-');
}

export function resolveOrderStatus(
  order: any,
  opts: {isPickup: boolean; fulfillments?: any[]},
): OrderStatusResult {
  const {isPickup} = opts;
  const fulfillments = opts.fulfillments ?? [];

  const rawTags = order?.tags
    ? typeof order.tags === 'string'
      ? order.tags.split(',').map(normalizeStatusToken)
      : Array.isArray(order.tags)
        ? order.tags.map(normalizeStatusToken)
        : []
    : [];
  const tagSet = new Set(rawTags.filter(Boolean));

  const shipmentSet = new Set(
    fulfillments
      .map((f: any) =>
        normalizeStatusToken(
          f?.shipment_status || f?.shipmentStatus || f?.displayStatus || f?.status || '',
        ),
      )
      .filter(Boolean),
  );

  const fs = String(order?.fulfillmentStatus || 'UNFULFILLED').toUpperCase();

  // Exact membership only. Substring matching is what caused the divergence.
  const hasTag = (...keys: string[]) => keys.some((k) => tagSet.has(k));
  const hasShipment = (...keys: string[]) => keys.some((k) => shipmentSet.has(k));

  const isCancelled = !!(
    order?.canceledAt ||
    order?.financialStatus === 'REFUNDED' ||
    fs === 'CANCELLED'
  );

  // Default: UNFULFILLED / new order.
  let statusEn = 'Order Received';
  let statusAr = 'تم استلام الطلب';
  let statusColor = '#906B51';

  if (isCancelled) {
    statusEn = 'Cancelled';
    statusAr = 'ملغاة';
    statusColor = '#E64950';
  } else if (
    hasTag('failure', 'تعذر-التسليم', 'انتهت-مدة-الاستلام') ||
    hasShipment('failure', 'failed', 'attempted-delivery')
  ) {
    statusEn = isPickup ? 'Pickup Period Expired' : 'Delivery Attempt Failed';
    statusAr = isPickup ? 'انتهت مدة الاستلام' : 'تعذر التسليم';
    statusColor = '#E64950';
  } else if (
    fs === 'FULFILLED' ||
    hasTag('delivered', 'picked-up', 'تم-التسليم', 'تم-الاستلام') ||
    hasShipment('delivered', 'picked-up')
  ) {
    statusEn = isPickup ? 'Order Picked Up' : 'Delivered Successfully';
    statusAr = isPickup ? 'تم استلام الطلب' : 'تم التسليم بنجاح';
    statusColor = '#234745';
  } else if (
    hasTag('ready-for-pickup', 'in-transit', 'out-for-delivery', 'جاهز-للاستلام', 'في-الطريق') ||
    hasShipment('ready-for-pickup', 'in-transit', 'out-for-delivery')
  ) {
    statusEn = isPickup ? 'Ready for Pickup' : 'Out for Delivery';
    statusAr = isPickup ? 'الطلب جاهز للاستلام' : 'الطلب في الطريق إليك';
    statusColor = '#004F59';
  } else if (
    fs === 'IN_PROGRESS' ||
    fs === 'PARTIALLY_FULFILLED' ||
    hasTag('in-progress', 'processing', 'جاري-التجهيز') ||
    hasShipment('in-progress', 'label-printed', 'submitted')
  ) {
    statusEn = 'Order is Being Prepared';
    statusAr = 'جاري تجهيز الطلب';
    statusColor = '#906B51';
  } else if (hasTag('confirmed', 'تم-التأكيد')) {
    statusEn = 'Order Confirmed';
    statusAr = 'تم التأكيد';
    statusColor = '#906B51';
  }

  return {statusEn, statusAr, statusColor};
}
