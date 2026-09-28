/**
 * Where the shopper actually dropped the pin, per saved address.
 *
 * Shopify has nowhere to keep a map pin on an address — no latitude/longitude
 * input on either API — so the pin was thrown away on save and every later
 * decision used Shopify's own geocoding of the TEXT instead. For a Saudi
 * address that is often wrong or missing (and always missing for the first
 * minutes after creation, while Shopify geocodes in the background). Then the
 * nearest-branch match fell back to "first branch in the city": the map said
 * ضاحية لبن, the cart assigned أنس بن مالك.
 *
 * So the pin is kept in one JSON metafield on the customer,
 * `custom.address_pins`: { "<numeric address id>": [lat, lng] }. Customer
 * metafields need no definition and ride on the scope that already manages
 * their addresses (write_customers).
 */

const NAMESPACE = 'custom';
const KEY = 'address_pins';
const MAX_PINS = 40;

export type PinMap = Record<string, [number, number]>;

async function admin(env: any, query: string, variables: any) {
  const {getAdminToken, getAdminDomain} = await import('~/lib/shopify-admin.server');
  const token = await getAdminToken(env);
  const domain = getAdminDomain(env);
  if (!token || !domain) throw new Error('Admin API unavailable');
  const res = await fetch(`https://${domain}/admin/api/2024-07/graphql.json`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'X-Shopify-Access-Token': token},
    body: JSON.stringify({query, variables}),
    signal: AbortSignal.timeout(5000),
  });
  return (await res.json()) as any;
}

const numeric = (id: unknown) =>
  String(id ?? '').split('?')[0].split('/').pop()?.replace(/\D/g, '') || '';

export function parsePins(raw: unknown): PinMap {
  if (!raw) return {};
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const out: PinMap = {};
    for (const [id, value] of Object.entries(parsed as any)) {
      const [lat, lng] = (Array.isArray(value) ? value : []) as unknown[];
      if (typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng)) {
        out[id] = [lat, lng];
      }
    }
    return out;
  } catch {
    return {};
  }
}

/** The pin for one address, or null. */
export function pinFor(pins: PinMap, addressId: unknown): {lat: number; lng: number} | null {
  const hit = pins[numeric(addressId)];
  return hit ? {lat: hit[0], lng: hit[1]} : null;
}

/**
 * Record (or, with `pin` null, forget) the pin for one address. Best-effort:
 * a failure is logged and the address save still succeeds — the old
 * text-geocoding behaviour is the worst case.
 */
export async function savePin(
  env: any,
  customerId: string,
  addressId: string,
  pin: {lat: number; lng: number} | null,
): Promise<void> {
  const cid = numeric(customerId);
  const aid = numeric(addressId);
  if (!cid || !aid) return;
  const ownerId = `gid://shopify/Customer/${cid}`;
  try {
    const read = await admin(
      env,
      `query Pins($id: ID!) { customer(id: $id) { metafield(namespace: "${NAMESPACE}", key: "${KEY}") { value } } }`,
      {id: ownerId},
    );
    const pins = parsePins(read?.data?.customer?.metafield?.value);
    if (pin && Number.isFinite(pin.lat) && Number.isFinite(pin.lng)) {
      pins[aid] = [Number(pin.lat.toFixed(6)), Number(pin.lng.toFixed(6))];
    } else {
      delete pins[aid];
    }
    // Oldest entries go first once the list is long; ids grow over time.
    const ids = Object.keys(pins).sort((a, b) => Number(a) - Number(b));
    while (ids.length > MAX_PINS) delete pins[ids.shift()!];

    const write = await admin(
      env,
      `mutation SetPins($m: [MetafieldsSetInput!]!) { metafieldsSet(metafields: $m) { userErrors { field message } } }`,
      {
        m: [
          {
            ownerId,
            namespace: NAMESPACE,
            key: KEY,
            type: 'json',
            value: JSON.stringify(pins),
          },
        ],
      },
    );
    const errors = write?.data?.metafieldsSet?.userErrors || write?.errors;
    if (errors?.length) console.warn('[address-pins] Could not save pin:', errors);
  } catch (e: any) {
    console.warn('[address-pins] Could not save pin:', e?.message || e);
  }
}
