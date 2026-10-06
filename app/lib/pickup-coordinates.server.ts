import {adminApiQuery} from '~/lib/admin.server';
import {getAdminDomain, getAdminToken} from '~/lib/shopify-admin.server';

/**
 * Where a pickup branch is, for Shopify Checkout's pickup list.
 *
 * Checkout sorts pickup locations by distance from the shopper and opens on
 * the nearest one. `pickupHandle` alone was not enough to override that: a
 * shopper in Amman who chose عنيزة in the cart reached checkout on Al Qurayyat,
 * the branch closest to Jordan. Sending the chosen branch's own coordinates
 * as the preference's `coordinates` makes that branch the nearest one, so the
 * list opens on it.
 *
 * Shopify's geocoded address comes first, because it is what checkout itself
 * measures distance from; the `custom.latitude/longitude` metafields are the
 * fallback. Cached per location for the life of the isolate. Never throws:
 * null means "send no coordinates", which is how it behaved before.
 */
export type PickupCoordinates = {
  latitude: number;
  longitude: number;
  countryCode: string;
};

const cache = new Map<string, PickupCoordinates | null>();

const QUERY = `query PickupCoords($id: ID!) {
  node(id: $id) {
    ... on Location {
      address { latitude longitude countryCode }
      lat: metafield(namespace: "custom", key: "latitude") { value }
      lng: metafield(namespace: "custom", key: "longitude") { value }
    }
  }
}`;

function toNumber(value: unknown): number | null {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  return Number.isFinite(n) && n !== 0 ? n : null;
}

export async function getPickupCoordinates(
  env: any,
  locationId: string,
): Promise<PickupCoordinates | null> {
  const gid = locationId.startsWith('gid://')
    ? locationId
    : `gid://shopify/Location/${locationId}`;
  if (cache.has(gid)) return cache.get(gid) ?? null;

  try {
    const domain = getAdminDomain(env);
    const token = await getAdminToken(env);
    if (!domain || !token) return null;

    const res: any = await adminApiQuery(domain, token, QUERY, {id: gid});
    const node = res?.data?.node;
    if (!node) {
      if (res?.errors) {
        console.warn('[pickup-coordinates] Lookup failed:', JSON.stringify(res.errors));
      }
      return null;
    }

    const latitude = toNumber(node.address?.latitude) ?? toNumber(node.lat?.value);
    const longitude = toNumber(node.address?.longitude) ?? toNumber(node.lng?.value);
    const countryCode = String(node.address?.countryCode || 'SA');

    const coords =
      latitude !== null && longitude !== null
        ? {latitude, longitude, countryCode}
        : null;
    cache.set(gid, coords);
    return coords;
  } catch (e: any) {
    console.warn('[pickup-coordinates] Lookup threw:', e?.message || e);
    return null;
  }
}
