/**
 * Pre-order products — one place that decides what a pre-order is.
 *
 * Defined per product in Shopify (Products → product → Metafields):
 *   custom.preorder_enabled         «طلب مسبق»            boolean
 *   custom.preorder_available_from  «متاح من»             date (optional)
 *   custom.preorder_lead_days       «أيام التجهيز»         integer (optional)
 *   custom.preorder_until           «آخر موعد للطلب»       date (optional)
 * The old tags (preorder / pre-order / طلب مسبق) still switch it on.
 * The variant must also allow «Continue selling when out of stock», otherwise
 * Shopify's checkout refuses it at zero stock.
 *
 * Rules (decided with the client, Oct 2026):
 *   - orderable whatever the branch stock says, until «آخر موعد للطلب»;
 *   - earliest delivery / pickup date = later of «متاح من» and today + days;
 *   - paid online only (no cash on delivery);
 *   - never in the same cart as normal products — separate orders.
 *
 * Dates are calendar days in Riyadh time, as «YYYY-MM-DD» strings.
 */

export const PREORDER_TAGS = ['preorder', 'pre-order', 'طلب مسبق'];

/** Line attribute the cart action stamps on pre-order lines. */
export const PREORDER_LINE_ATTR = '_is_preorder';

export type PreorderInfo = {
  isPreorder: boolean;
  /** Past «آخر موعد للطلب»: no longer orderable. */
  closed: boolean;
  availableFrom: string | null;
  leadDays: number;
  until: string | null;
  /** First date the order can be delivered / picked up (Riyadh), or null. */
  earliestDate: string | null;
};

const NONE: PreorderInfo = {
  isPreorder: false,
  closed: false,
  availableFrom: null,
  leadDays: 0,
  until: null,
  earliestDate: null,
};

function metaValue(product: any, key: string): string {
  const v = product?.[key];
  if (v && typeof v === 'object') return String(v.value ?? '').trim();
  return String(v ?? '').trim();
}

function validDate(s: string): string | null {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

/** Today in Riyadh as YYYY-MM-DD. */
export function riyadhToday(now: Date = new Date()): string {
  const r = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  return r.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function hasPreorderTag(tags?: string[] | null): boolean {
  return (tags || []).some((t) => PREORDER_TAGS.includes(String(t).toLowerCase().trim()));
}

/** Everything about a product's pre-order status, from its metafields/tags. */
export function getPreorderInfo(product: any, now: Date = new Date()): PreorderInfo {
  if (!product) return NONE;
  const enabled =
    metaValue(product, 'preorder_enabled') === 'true' || hasPreorderTag(product.tags);
  if (!enabled) return NONE;

  const availableFrom = validDate(metaValue(product, 'preorder_available_from'));
  const until = validDate(metaValue(product, 'preorder_until'));
  const leadRaw = parseInt(metaValue(product, 'preorder_lead_days'), 10);
  const leadDays = Number.isFinite(leadRaw) && leadRaw > 0 ? leadRaw : 0;

  const today = riyadhToday(now);
  const byLead = leadDays ? addDays(today, leadDays) : null;
  const candidates = [availableFrom, byLead].filter(Boolean) as string[];
  const earliest = candidates.length ? candidates.sort().reverse()[0] : null;

  return {
    isPreorder: true,
    closed: Boolean(until && today > until),
    availableFrom,
    leadDays,
    until,
    earliestDate: earliest && earliest > today ? earliest : null,
  };
}

/** A cart line's product is a pre-order (metafields, tags or the line stamp). */
export function isPreorderLine(line: any): boolean {
  if ((line?.attributes || []).some((a: any) => a?.key === PREORDER_LINE_ATTR && a?.value === 'true')) {
    return true;
  }
  return getPreorderInfo(line?.merchandise?.product).isPreorder;
}

/** Latest earliest-date across the cart's pre-order lines (YYYY-MM-DD) or null. */
export function cartPreorderEarliestDate(lines: any[], now: Date = new Date()): string | null {
  let best: string | null = null;
  for (const line of lines || []) {
    const info = getPreorderInfo(line?.merchandise?.product, now);
    if (info.earliestDate && (!best || info.earliestDate > best)) best = info.earliestDate;
  }
  return best;
}

const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** «2026-10-09» → «9 أكتوبر» / «9 October». */
export function formatPreorderDate(date: string, isEn: boolean): string {
  const [, m, d] = date.split('-').map(Number);
  return `${d} ${(isEn ? MONTHS_EN : MONTHS_AR)[m - 1]}`;
}

/** One line for cards and the product page, e.g. «متاح من 9 أكتوبر». */
export function preorderAvailabilityText(info: PreorderInfo, isEn: boolean): string {
  if (!info.isPreorder) return '';
  if (info.closed) return isEn ? 'Pre-orders closed' : 'انتهى الطلب المسبق';
  if (info.earliestDate) {
    return isEn
      ? `Available from ${formatPreorderDate(info.earliestDate, true)}`
      : `متاح من ${formatPreorderDate(info.earliestDate, false)}`;
  }
  return isEn ? 'Pre-order' : 'طلب مسبق';
}

/** Shown when a shopper tries to mix pre-order and normal items. */
export const MIXED_CART_MESSAGE = {
  ar: 'لا يمكن جمع منتجات الطلب المسبق مع منتجات أخرى في نفس الطلب. أكمل طلبك الحالي أو أفرغ السلة أولاً.',
  en: 'Pre-order items can’t be combined with other products in one order. Complete your current order or empty the cart first.',
};
