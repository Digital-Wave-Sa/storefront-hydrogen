/**
 * Post-checkout branch routing.
 *
 * Checkout never reads the `Branch ID` attribute the storefront writes on the
 * cart. Shopify assigns a fulfillment order to a location from its own inputs —
 * which locations stock the item, and for local delivery which location's zone
 * covers the address — so the order lands on `Shop location` or Al Olaya while
 * the customer picked Anas Ibn Malik (SDN-1407, SDN-1408). Overriding that at
 * checkout time needs a Fulfillment Constraints Function; correcting it right
 * after is a plain Admin mutation. This does the latter.
 *
 * The `orders/create` webhook calls `routeOrderToChosenBranch`. It resolves the
 * order's `Branch ID` to a Shopify location and moves every open fulfillment
 * order there with `fulfillmentOrderMove`.
 *
 * Known limit, from the API itself: «only the line items that are stocked at
 * the new location get moved». A product whose only inventory record is at
 * `Shop location` stays there. Each SKU starts routing the day it is stocked at
 * the branches — this is not the place to fix that, it is a data job.
 */
import {getAdminDomain, getAdminToken} from './shopify-admin.server';

const ADMIN_API_VERSION = '2024-07';
/** Branch → location map is small (≈120 rows) and changes rarely. */
const LOCATION_CACHE_TTL_MS = 10 * 60 * 1000;

type LocationIndex = {
  /** custom.branch_id metafield value → location gid */
  byBranchId: Map<string, string>;
  /** numeric Shopify location id → location gid */
  byNumericId: Map<string, string>;
  fetchedAt: number;
};

let locationIndex: LocationIndex | null = null;

async function adminGraphql(
  env: any,
  query: string,
  variables?: any,
  timeoutMs = 10000,
) {
  const domain = getAdminDomain(env);
  const token = await getAdminToken(env);
  if (!domain || !token) {
    throw new Error('Admin API credentials unavailable');
  }
  const res = await fetch(
    `https://${domain}/admin/api/${ADMIN_API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify({query, variables}),
      signal: AbortSignal.timeout(timeoutMs),
    },
  );
  if (!res.ok) {
    throw new Error(`Admin API HTTP ${res.status}`);
  }
  const json: any = await res.json();
  if (json?.errors?.length) {
    throw new Error(json.errors.map((e: any) => e.message).join('; '));
  }
  return json?.data;
}

const BRANCH_LOCATIONS_QUERY = `query BranchLocations {
  locations(first: 250, includeInactive: false) {
    nodes {
      id
      name
      branchId: metafield(namespace: "custom", key: "branch_id") { value }
    }
  }
}`;

/**
 * Retried once, and given longer than everything else.
 *
 * This is the single heaviest call in the route — 118 locations, each with a
 * metafield lookup — and the cache guarding it is a module-level `let`, which
 * on Oxygen rarely survives between requests. So most webhooks pay the full
 * query, and one slow response used to throw past the 10s budget, unwind the
 * whole route through the catch at the bottom, and lose the order's routing
 * with nothing recorded anywhere.
 *
 * That is what SDN-1457 looks like: identical in every respect to SDN-1458
 * seven minutes later, which routed correctly, and the move it should have
 * made succeeds by hand with zero userErrors. The failure was transient, so
 * the fix is to survive a transient failure rather than to explain it.
 */
async function fetchLocationNodes(env: any): Promise<any[]> {
  try {
    const data = await adminGraphql(env, BRANCH_LOCATIONS_QUERY, undefined, 20000);
    return data?.locations?.nodes || [];
  } catch (first: any) {
    console.warn(
      `[Routing] Location index failed (${first?.message || first}); retrying once.`,
    );
    const data = await adminGraphql(env, BRANCH_LOCATIONS_QUERY, undefined, 20000);
    return data?.locations?.nodes || [];
  }
}

async function loadLocationIndex(env: any): Promise<LocationIndex> {
  if (locationIndex && Date.now() - locationIndex.fetchedAt < LOCATION_CACHE_TTL_MS) {
    return locationIndex;
  }
  const nodes = await fetchLocationNodes(env);

  const byBranchId = new Map<string, string>();
  const byNumericId = new Map<string, string>();

  /**
   * First write wins, and a collision is reported.
   *
   * `set()` on a duplicate key used to be last-write-wins, silently. The shop
   * currently has `custom.branch_id = "1"` on TWO locations — Katara - Qatar
   * and Prince Sultan Hospital Cafe — so one of them routes every order to the
   * other, and which one depends on the order Shopify returns locations in.
   * A branch quietly receiving another branch's orders is not a failure mode
   * anyone would think to look for, so it is named here.
   *
   * Five locations carry no branch_id at all (Al Hawiyah, Al Kharj 1, Jubail
   * Industrial City, الحمراء, Shop location). Nothing can route to them, which
   * is correct for Shop location and a data gap for the rest.
   */
  const duplicates: string[] = [];
  for (const node of nodes) {
    const gid = String(node.id);
    byNumericId.set(gid.split('/').pop() || '', gid);
    const branchId = String(node?.branchId?.value ?? '').trim();
    if (!branchId) continue;
    if (byBranchId.has(branchId)) {
      duplicates.push(`${branchId} (${node?.name ?? gid})`);
      continue;
    }
    byBranchId.set(branchId, gid);
  }

  if (duplicates.length) {
    console.warn(
      `[Routing] Duplicate custom.branch_id, ignored in favour of the first: ${duplicates.join(', ')}`,
    );
  }

  locationIndex = {byBranchId, byNumericId, fetchedAt: Date.now()};
  return locationIndex;
}

/**
 * `Branch ID` is normally the custom.branch_id metafield («253»), but the cart
 * falls back to the raw Shopify location id when that metafield was missing on
 * the branch, so both spellings are accepted. A gid is passed through as-is.
 */
export async function resolveBranchLocationGid(
  env: any,
  branchValue: string,
): Promise<string | null> {
  const value = String(branchValue || '').trim();
  if (!value) return null;
  if (value.startsWith('gid://shopify/Location/')) return value;
  const index = await loadLocationIndex(env);
  return index.byBranchId.get(value) || index.byNumericId.get(value) || null;
}

function readAttribute(order: any, ...names: string[]): string {
  const attrs: any[] = Array.isArray(order?.note_attributes)
    ? order.note_attributes
    : Array.isArray(order?.customAttributes)
      ? order.customAttributes
      : [];
  const wanted = names.map((n) => n.toLowerCase());
  for (const attr of attrs) {
    const key = String(attr?.name ?? attr?.key ?? '').toLowerCase();
    if (wanted.includes(key)) {
      const v = String(attr?.value ?? '').trim();
      if (v) return v;
    }
  }
  return '';
}

export type RoutingResult = {
  skipped?: string;
  branchValue?: string;
  locationId?: string;
  moved: string[];
  alreadyThere: string[];
  failed: {id: string; reason: string}[];
};

/**
 * Move an order's open fulfillment orders to the branch the customer chose.
 * Never throws — the webhook that calls this must still send its notifications
 * whatever happens here.
 */
export async function routeOrderToChosenBranch(
  env: any,
  order: any,
): Promise<RoutingResult> {
  const result: RoutingResult = {moved: [], alreadyThere: [], failed: []};

  try {
    const fulfillmentType = readAttribute(order, 'Fulfillment Type').toLowerCase();
    if (fulfillmentType === 'pickup') {
      // Checkout already assigns pickup to the location the customer chose.
      result.skipped = 'pickup order';
      return result;
    }

    const branchValue = readAttribute(order, 'Branch ID', 'custom.branch_id', 'branch_id');
    result.branchValue = branchValue;
    if (!branchValue) {
      result.skipped = 'no Branch ID attribute';
      return result;
    }

    const locationId = await resolveBranchLocationGid(env, branchValue);
    if (!locationId) {
      result.skipped = `no location has custom.branch_id = ${branchValue}`;
      return result;
    }
    result.locationId = locationId;

    const numericOrderId = String(order?.id ?? '').split('/').pop();
    if (!numericOrderId) {
      result.skipped = 'order id missing';
      return result;
    }

    const data = await adminGraphql(
      env,
      `query OrderFulfillmentOrders($id: ID!) {
        order(id: $id) {
          fulfillmentOrders(first: 20) {
            nodes {
              id
              status
              assignedLocation { location { id } }
            }
          }
        }
      }`,
      {id: `gid://shopify/Order/${numericOrderId}`},
    );

    const fulfillmentOrders: any[] = data?.order?.fulfillmentOrders?.nodes || [];
    for (const fo of fulfillmentOrders) {
      const status = String(fo?.status || '');
      if (status !== 'OPEN' && status !== 'SCHEDULED') continue;
      if (fo?.assignedLocation?.location?.id === locationId) {
        result.alreadyThere.push(fo.id);
        continue;
      }
      try {
        const moveData = await adminGraphql(
          env,
          `mutation MoveFulfillmentOrder($id: ID!, $newLocationId: ID!) {
            fulfillmentOrderMove(id: $id, newLocationId: $newLocationId) {
              movedFulfillmentOrder { id }
              remainingFulfillmentOrder { id }
              userErrors { field message }
            }
          }`,
          {id: fo.id, newLocationId: locationId},
        );
        const payload = moveData?.fulfillmentOrderMove;
        const userErrors: any[] = payload?.userErrors || [];
        if (userErrors.length) {
          result.failed.push({
            id: fo.id,
            reason: userErrors.map((e) => e.message).join('; '),
          });
        } else if (payload?.movedFulfillmentOrder?.id) {
          result.moved.push(payload.movedFulfillmentOrder.id);
          if (payload?.remainingFulfillmentOrder?.id) {
            // Lines not stocked at the branch stayed behind — the API limit.
            result.failed.push({
              id: payload.remainingFulfillmentOrder.id,
              reason: 'some items are not stocked at the chosen branch',
            });
          }
        } else {
          result.failed.push({id: fo.id, reason: 'nothing moved'});
        }
      } catch (err: any) {
        result.failed.push({id: fo.id, reason: err?.message || String(err)});
      }
    }
  } catch (err: any) {
    result.failed.push({id: 'order', reason: err?.message || String(err)});
  }

  return result;
}

/**
 * Write what routing did onto the order itself.
 *
 * Everything above already produced a precise account of what happened —
 * which branch, which fulfillment orders moved, which failed and why — and the
 * webhook threw all of it at `console.log`. That is why a wrong branch could
 * only ever be found the way it was found: by a human noticing the location
 * chip in admin did not match the branch on the order.
 *
 * So the outcome goes somewhere durable and somewhere visible:
 *
 *   tag `routed-<branchId>`   the move landed, and on which branch
 *   tag `routing-failed`      it did not, for any reason including a skip
 *                             that should not have skipped
 *   metafield custom.routing_outcome   the full result, for reading the why
 *
 * The tag is the part that matters operationally: order tags are filterable in
 * the admin order list, so `tag:routing-failed` is a live list of orders
 * sitting at the wrong branch. Without it there is no query that finds them.
 *
 * A pickup skip is NOT marked failed — checkout already assigned those, so
 * skipping is the correct outcome, and flagging it would bury the real ones.
 *
 * Never throws. A webhook that cannot record what it did must still have done
 * it, and must still send its notifications.
 */
export async function recordRoutingOutcome(
  env: any,
  order: any,
  result: RoutingResult,
): Promise<void> {
  try {
    const numericOrderId = String(order?.id ?? '').split('/').pop();
    if (!numericOrderId) return;
    const orderGid = `gid://shopify/Order/${numericOrderId}`;

    const skippedForGoodReason = result.skipped === 'pickup order';
    if (skippedForGoodReason) return;

    const landed = result.moved.length > 0 || result.alreadyThere.length > 0;
    const ok = landed && result.failed.length === 0;
    const tag = ok ? `routed-${result.branchValue ?? 'unknown'}` : 'routing-failed';

    await adminGraphql(
      env,
      `mutation RecordRouting($id: ID!, $tags: [String!]!, $metafields: [MetafieldsSetInput!]!) {
        tagsAdd(id: $id, tags: $tags) { userErrors { message } }
        metafieldsSet(metafields: $metafields) { userErrors { message } }
      }`,
      {
        id: orderGid,
        tags: [tag],
        metafields: [
          {
            ownerId: orderGid,
            namespace: 'custom',
            key: 'routing_outcome',
            type: 'json',
            value: JSON.stringify({
              at: new Date().toISOString(),
              branchValue: result.branchValue ?? null,
              locationId: result.locationId ?? null,
              skipped: result.skipped ?? null,
              moved: result.moved,
              alreadyThere: result.alreadyThere,
              failed: result.failed,
            }),
          },
        ],
      },
    );
  } catch (err: any) {
    console.warn(
      `[Routing] Could not record the outcome: ${err?.message || err}`,
    );
  }
}
