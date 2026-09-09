/**
 * The back-in-stock waiting list, in one place.
 *
 * The list lives in the middleware and only there (`/notify-me/*`), which is
 * the point of the rewrite that removed STOQ: one record, not three that can
 * disagree. This module is the storefront's only door to it, so the two screens
 * that touch it -- the product modal's `/api/stock-notification` and the
 * account page -- cannot drift into two dialects of the same API the way the
 * order-status readings did.
 *
 * Everything here is best effort and never throws: losing the waiting list
 * should cost a shopper a row on a page, never the page.
 */

export function getNotifyMiddlewareUrl(env: any): string {
  return (
    env?.SAADEDDIN_API_URL ||
    env?.CUSTOM_API_URL ||
    'https://api.saadeddin.top'
  );
}

/**
 * Branch ids arrive in three spellings -- a Shopify gid, a bare number, and
 * whatever the modal was handed -- and the middleware stores the bare number.
 * Comparing the unnormalised forms is how an existing subscription reads as
 * "not subscribed".
 */
export function normalizeLocationId(locationId: unknown): string {
  const s = String(locationId ?? '').trim();
  if (!s) return '';
  return s.includes('/') ? s.split('/').pop() || s : s;
}

/**
 * The SKU, which is what the middleware calls `productCode`.
 *
 * None of the product fragments behind the cards that open the Notify Me modal
 * select `sku`, so the browser only ever has a variant id. Rather than thread
 * the SKU through six call sites and shared GraphQL, it is looked up here, on
 * the server, from the id they all already have.
 *
 * A handful of products have no SKU at all. Those fall back to the variant id,
 * so the shopper still joins the list -- worth knowing when reconciling the
 * middleware against the ERP, since it will be holding an id where it expects
 * a code.
 */
export async function resolveProductCode(
  storefront: any,
  variantId: string | number | null | undefined,
): Promise<string | null> {
  const raw = String(variantId ?? '').trim();
  if (!raw) return null;

  const gid = raw.includes('/') ? raw : `gid://shopify/ProductVariant/${raw}`;

  try {
    const result: any = await storefront.query(
      `#graphql
      query NotifyMeVariantSku($id: ID!) {
        node(id: $id) {
          ... on ProductVariant {
            sku
          }
        }
      }`,
      {variables: {id: gid}, cache: storefront.CacheShort()},
    );
    const sku = result?.node?.sku;
    if (sku && String(sku).trim()) return String(sku).trim();
  } catch (err) {
    console.warn('[NOTIFY_ME] SKU lookup failed:', err);
  }

  return raw.includes('/') ? raw.split('/').pop() || raw : raw;
}

export type NotifySubscription = {
  id: string | null;
  productCode: string;
  productTitle: string;
  productHandle: string | null;
  imageUrl: string | null;
  locationId: string;
  branchName: string | null;
  createdAt: string | null;
  status: string | null;
};

/**
 * The middleware has answered subscribe with `{success, data: {id}}`, so a list
 * is most likely `{success, data: [...]}` -- but this is an API we do not own
 * and whose version string moves. Reading it loosely costs nothing and means a
 * shape change shows up as an empty list rather than a crashed account page.
 */
function pickArray(body: any): any[] {
  if (Array.isArray(body)) return body;
  const candidates = [
    body?.data,
    body?.data?.subscriptions,
    body?.data?.items,
    body?.subscriptions,
    body?.items,
    body?.result,
  ];
  for (const c of candidates) {
    if (Array.isArray(c)) return c;
  }
  return [];
}

/**
 * Is this row still a live alert?
 *
 * Cancelling does not remove anything. The middleware answers
 * `DELETE /notify-me/:id` with `{"success":true,"data":{"status":"CANCELLED"}}`
 * -- it marks the row and keeps it -- and `/notify-me/my` returns the marked
 * rows along with the live ones. Counting all of them as live is why a
 * cancelled alert came straight back: the shopper cancelled, the middleware
 * agreed, and the very next lookup found the same row and reported them
 * subscribed again.
 *
 * A row whose alert has already been sent is spent too, and should let the
 * shopper subscribe afresh rather than show as though it were still waiting.
 *
 * Denylist, not allowlist: a status this storefront has not seen before stays
 * live, which is the behaviour that existed before any of this filtering.
 */
const INACTIVE_STATUSES = new Set([
  'cancelled',
  'canceled',
  'unsubscribed',
  'inactive',
  'deleted',
  'removed',
  'expired',
  'notified',
  'sent',
  'completed',
]);

export function isActiveNotifyStatus(status: unknown): boolean {
  const s = String(status ?? '').trim().toLowerCase();
  if (!s) return true;
  return !INACTIVE_STATUSES.has(s);
}

function normalize(row: any): NotifySubscription {
  const locationId = row?.locationId ?? row?.location_id ?? row?.branchId ?? '';
  return {
    id: row?.id != null ? String(row.id) : (row?._id != null ? String(row._id) : null),
    productCode: String(row?.productCode ?? row?.product_code ?? row?.sku ?? ''),
    productTitle: String(
      row?.productTitle ?? row?.product_title ?? row?.title ?? '',
    ),
    productHandle: row?.productHandle ?? row?.product_handle ?? null,
    imageUrl: row?.imageUrl ?? row?.image_url ?? row?.image ?? null,
    locationId: String(locationId ?? ''),
    branchName: row?.branchName ?? row?.branch_name ?? row?.locationName ?? null,
    createdAt: row?.createdAt ?? row?.created_at ?? null,
    status: row?.status ?? null,
  };
}

/**
 * Everything this phone is waiting for.
 *
 * Phone, not email: the middleware deduplicates and cancels on
 * (phone, productCode, locationId), so it is the only key that can list. A
 * shopper with no phone on file gets an empty list and is told to cancel from
 * the link in the email instead -- see the account page.
 */
export async function listNotifySubscriptions({
  env,
  phone,
}: {
  env: any;
  phone?: string | null;
}): Promise<{ok: boolean; subscriptions: NotifySubscription[]}> {
  const trimmed = String(phone ?? '').trim();
  if (!trimmed) return {ok: true, subscriptions: []};

  try {
    const res = await fetch(
      `${getNotifyMiddlewareUrl(env)}/notify-me/my?phone=${encodeURIComponent(
        trimmed,
      )}`,
      {headers: {'x-client-source': 'web'}},
    );
    const body = (await res.json().catch(() => ({}))) as any;

    if (!res.ok || body?.success === false) {
      console.warn(
        `[NOTIFY_ME] List rejected (HTTP ${res.status}):`,
        JSON.stringify(body).slice(0, 300),
      );
      return {ok: false, subscriptions: []};
    }

    const all = pickArray(body)
      .map(normalize)
      // A row with neither an id nor a product code cannot be cancelled, so
      // showing it would only offer the shopper a button that does nothing.
      .filter((r) => r.id || (r.productCode && r.locationId));

    const rows = all.filter((r) => isActiveNotifyStatus(r.status));

    /**
     * The status is in this line on purpose. A cancelled row that comes back
     * with no status at all cannot be told from a live one here, and the
     * symptom -- an alert that will not stay cancelled -- looks identical
     * either way.
     */
    console.log(
      `[NOTIFY_ME] List: ${rows.length} active of ${all.length} row(s)`,
      all
        .slice(0, 6)
        .map(
          (r) =>
            `${r.id ?? 'no-id'}/${r.productCode}@${r.locationId}:${r.status ?? 'no-status'}`,
        )
        .join(', '),
    );

    return {ok: true, subscriptions: rows};
  } catch (err) {
    console.warn('[NOTIFY_ME] List failed:', err);
    return {ok: false, subscriptions: []};
  }
}

/**
 * Leaving the list.
 *
 * Two doors, because there are two kinds of subscriber. A signed-in shopper is
 * cancelled by (phone, productCode, locationId) -- the key the middleware
 * deduplicates on. An email-only subscriber has no phone there at all and can
 * only be removed by the id handed back at subscribe time, which is why that id
 * travels back to the browser.
 *
 * Both are tried, and "not found" is NOT taken as success on the first one.
 *
 * That reading was wrong and it hid this exact failure: a 404 on
 * `DELETE /notify-me/:id` does not mean the shopper is off the list, it means
 * the handle was wrong -- and the route answered `{success: true}` while the
 * subscription sat there untouched, so reopening the modal still found it. Only
 * a not-found on the phone lookup is a real "already gone": that one asks by
 * the same key the middleware files under, so if it cannot find a row, there is
 * no row.
 */
async function readBody(res: Response) {
  const text = await res.text().catch(() => '');
  try {
    return {body: JSON.parse(text) as any, text};
  } catch {
    return {body: {} as any, text};
  }
}

export async function cancelNotifySubscription({
  env,
  subscriptionId,
  phone,
  productCode,
  locationId,
}: {
  env: any;
  subscriptionId?: string | null;
  phone?: string | null;
  productCode?: string | null;
  locationId?: string | null;
}): Promise<{ok: boolean; status: number}> {
  const base = getNotifyMiddlewareUrl(env);
  /**
   * The branch id must be the bare number.
   *
   * Subscribe has always sent the numeric id; this sent whatever the modal was
   * holding, which for a Shopify location is
   * `gid://shopify/Location/91181089001`. The middleware then looked for a row
   * keyed on a value it had never stored, found nothing, and said so -- and
   * "not found" was being read as "done".
   */
  const branch = normalizeLocationId(locationId);
  let lastStatus = 0;

  const attempt = async (
    label: string,
    run: () => Promise<Response>,
  ): Promise<boolean | null> => {
    try {
      const res = await run();
      lastStatus = res.status;
      const {body, text} = await readBody(res);

      // Logged either way. Whether the middleware honours a cancellation is
      // not something this storefront can verify, and a silent success is how
      // the first version of this went unnoticed.
      console.log(
        `[NOTIFY_ME] Unsubscribe via ${label}: HTTP ${res.status} ${text.slice(0, 200)}`,
      );

      if (body?.success === true) return true;
      if (/not found/i.test(String(body?.error || '')) || res.status === 404) {
        return null; // Nothing removed here; try the other door.
      }
      return false;
    } catch (err) {
      console.error(`[NOTIFY_ME] Unsubscribe via ${label} threw:`, err);
      return false;
    }
  };

  if (subscriptionId) {
    const byId = await attempt('id', () =>
      fetch(`${base}/notify-me/${encodeURIComponent(String(subscriptionId))}`, {
        method: 'DELETE',
        headers: {'x-client-source': 'web'},
      }),
    );
    if (byId === true) return {ok: true, status: lastStatus};
    // `false` is a real rejection, but the phone door may still work, so it is
    // only fatal when there is nothing else to try.
    if (byId === false && !(phone && productCode)) {
      return {ok: false, status: lastStatus};
    }
  }

  if (phone && productCode) {
    const byKey = await attempt('phone', () =>
      fetch(`${base}/notify-me/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-source': 'web',
        },
        body: JSON.stringify({
          phone: String(phone),
          productCode: String(productCode),
          locationId: branch,
        }),
      }),
    );
    // Here, and only here, not-found means there is no such subscription.
    if (byKey === true || byKey === null) return {ok: true, status: lastStatus};
    return {ok: false, status: lastStatus};
  }

  return {ok: false, status: lastStatus};
}
