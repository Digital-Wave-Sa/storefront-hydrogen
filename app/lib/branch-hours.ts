/**
 * When a branch is open, from what Shopify actually holds.
 *
 * The branches page printed «8:00 ص - 11:00 م» under every branch in the
 * country and a green «مفتوح الآن» beside every one of them, at every hour of
 * the day. Neither was read from anything:
 *
 *   - The hours line tested `branch.working_hours_from?.value`, which is the
 *     shape Shopify's GraphQL returns. /api/locations-meta flattens that
 *     metafield to `hours_from`, a plain string, so `.value` was undefined,
 *     the test never passed, and every card fell through to the hardcoded
 *     pair. الأربعين opens at 13:00 and the page told people 8:00.
 *   - The badge was a `<span>` with no condition at all.
 *
 * Checked against the live list before writing this: `working_days`, both
 * shift-2 fields and every per-day field (friday_working_hours_from and its
 * siblings) are empty on all 118 locations. Only working_hours_from and
 * working_hours_to carry anything. So a branch has one window, the same on
 * every day, and none of the weekday machinery in api.locations-meta has any
 * data behind it yet.
 */

/** Minutes past midnight, or null if the value is missing or unparseable. */
export function parseHm(value: unknown): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(value ?? '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** «09:00:00» as «9:00 ص» / «9:00 AM». */
export function formatHm(value: unknown, isEn: boolean): string {
  const total = parseHm(value);
  if (total === null) return '';
  const h24 = Math.floor(total / 60);
  const min = total % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const suffix = isEn ? (h24 < 12 ? 'AM' : 'PM') : h24 < 12 ? 'ص' : 'م';
  return `${h12}:${String(min).padStart(2, '0')} ${suffix}`;
}

export type BranchHours = {from: string; to: string} | null;

/**
 * A branch's opening hours, whichever way the object was built.
 *
 * /api/locations-meta flattens the metafield to `hours_from`, and also passes
 * the raw `metafields` array through; the root loader's Storefront locations
 * carry neither, because the Storefront API does not expose metafields on
 * Location — which is the whole reason that route exists. Returning null for
 * that case is the point: the caller shows a dash, not an invented pair.
 */
export function branchHours(branch: any): BranchHours {
  const fromRaw =
    branch?.hours_from ??
    branch?.working_hours_from?.value ??
    fromMetafields(branch, 'working_hours_from');
  const toRaw =
    branch?.hours_to ??
    branch?.working_hours_to?.value ??
    fromMetafields(branch, 'working_hours_to');

  if (parseHm(fromRaw) === null || parseHm(toRaw) === null) return null;
  return {from: String(fromRaw), to: String(toRaw)};
}

function fromMetafields(branch: any, key: string): string | undefined {
  /*
    Annotated rather than narrowed with Array.isArray: under this project's
    worker types that narrowing lands on `{}[]`, and reading `.value` off the
    result is a type error. The same `{}` shows up on `res.json()` in
    pages.branches.
  */
  const list: any[] = Array.isArray(branch?.metafields)
    ? branch.metafields
    : [];
  return list.find((m: any) => m?.key === key)?.value;
}

/** «9:00 ص - 11:59 م», or '' when the branch has no hours on file. */
export function formatBranchHours(branch: any, isEn: boolean): string {
  const hours = branchHours(branch);
  if (!hours) return '';
  return `${formatHm(hours.from, isEn)} - ${formatHm(hours.to, isEn)}`;
}

/**
 * Is `minutesNow` inside the window?
 *
 * Ten or so branches close after midnight — 00:45, 01:00, 02:00 — so a close
 * earlier than the open is the next day, not a mistake, and the window wraps.
 * A branch whose hours are equal is treated as open around the clock; none is
 * stored that way today, but 00:00-23:59 is, and that reads as always open
 * through the ordinary comparison.
 */
export function isOpenAt(
  hours: BranchHours,
  minutesNow: number | null,
): boolean | null {
  if (!hours || minutesNow === null) return null;
  const from = parseHm(hours.from);
  const to = parseHm(hours.to);
  if (from === null || to === null) return null;
  if (from === to) return true;
  if (from < to) return minutesNow >= from && minutesNow <= to;
  return minutesNow >= from || minutesNow <= to;
}

/**
 * Minutes past midnight in Riyadh.
 *
 * The shopper's own clock is the wrong one — someone browsing from Cairo or
 * London is still asking whether the branch is open where the branch is. The
 * storefront reads Riyadh time this way in CartSummary and Header too.
 */
export function minutesNowInRiyadh(): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Riyadh',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return hour * 60 + minute;
}
