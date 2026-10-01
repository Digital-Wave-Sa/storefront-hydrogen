/**
 * Reading and writing the customer's `custom.address_types` metafield.
 * See ~/lib/address-types for what it is and why it exists.
 *
 * Customer metafields need no definition and ride on the scope that already
 * manages their addresses (write_customers), exactly like the map pins.
 */
import {
  addressNumericId,
  parseAddressTypes,
  type AddressType,
  type AddressTypeMap,
} from '~/lib/address-types';

const NAMESPACE = 'custom';
const KEY = 'address_types';
const MAX_ENTRIES = 40;
const API_VERSION = '2026-07';

async function admin(env: any, query: string, variables: any) {
  const {getAdminToken, getAdminDomain} = await import('~/lib/shopify-admin.server');
  const token = await getAdminToken(env);
  const domain = getAdminDomain(env);
  if (!token || !domain) throw new Error('Admin API unavailable');
  const res = await fetch(`https://${domain}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'X-Shopify-Access-Token': token},
    body: JSON.stringify({query, variables}),
    signal: AbortSignal.timeout(5000),
  });
  return (await res.json()) as any;
}

const READ = `query AddressTypes($id: ID!) {
  customer(id: $id) { metafield(namespace: "${NAMESPACE}", key: "${KEY}") { value } }
}`;

/** The customer's address types, or {} when there are none or the read fails. */
export async function readAddressTypes(
  env: any,
  customerId: string,
): Promise<AddressTypeMap> {
  const cid = addressNumericId(customerId);
  if (!cid) return {};
  try {
    const res = await admin(env, READ, {id: `gid://shopify/Customer/${cid}`});
    return parseAddressTypes(res?.data?.customer?.metafield?.value);
  } catch (e: any) {
    console.warn('[address-types] Could not read:', e?.message || e);
    return {};
  }
}

/**
 * Record (or, with `type` null, forget) the type of one address. Best-effort:
 * a failure is logged and the address save still succeeds — the address just
 * shows its street instead of «شقة».
 */
export async function saveAddressType(
  env: any,
  customerId: string,
  addressId: string,
  type: AddressType | null,
): Promise<void> {
  const cid = addressNumericId(customerId);
  const aid = addressNumericId(addressId);
  if (!cid || !aid) return;
  const ownerId = `gid://shopify/Customer/${cid}`;
  try {
    const read = await admin(env, READ, {id: ownerId});
    const types = parseAddressTypes(read?.data?.customer?.metafield?.value);
    if (type) types[aid] = type;
    else delete types[aid];

    // Oldest entries go first once the list is long; ids grow over time.
    const ids = Object.keys(types).sort((a, b) => Number(a) - Number(b));
    while (ids.length > MAX_ENTRIES) delete types[ids.shift()!];

    const write = await admin(
      env,
      `mutation SetAddressTypes($m: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $m) { userErrors { field message } }
      }`,
      {
        m: [
          {
            ownerId,
            namespace: NAMESPACE,
            key: KEY,
            type: 'json',
            value: JSON.stringify(types),
          },
        ],
      },
    );
    const errors = write?.data?.metafieldsSet?.userErrors || write?.errors;
    if (errors?.length) console.warn('[address-types] Could not save:', errors);
  } catch (e: any) {
    console.warn('[address-types] Could not save:', e?.message || e);
  }
}
