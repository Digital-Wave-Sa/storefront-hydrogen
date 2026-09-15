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

async function adminGraphql(env: any, query: string, variables?: any) {
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
      signal: AbortSignal.timeout(10000),
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

async function loadLocationIndex(env: any): Promise<LocationIndex> {
  if (locationIndex && Date.now() - locationIndex.fetchedAt < LOCATION_CACHE_TTL_MS) {
    return locationIndex;
  }
  const data = await adminGraphql(
    env,
    `query BranchLocations {
      locations(first: 250, includeInactive: false) {
        nodes {
          id
          branchId: metafield(namespace: "custom", key: "branch_id") { value }
        }
      }
    }`,
  );
  const byBranchId = new Map<string, string>();
  const byNumericId = new Map<string, string>();
  for (const node of data?.locations?.nodes || []) {
    const gid = String(node.id);
    byNumericId.set(gid.split('/').pop() || '', gid);
    const branchId = String(node?.branchId?.value ?? '').trim();
    if (branchId) byBranchId.set(branchId, gid);
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
