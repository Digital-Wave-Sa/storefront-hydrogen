/**
 * Do we deliver to this point, from which branch, and for how much?
 *
 * The delivery modal has always answered this when an address is CONFIRMED
 * (nearest visible branch, out of range past its `delivery_radius`). The map
 * pickers now ask the same question while the pin moves, so a shopper sees
 * «خارج نطاق التوصيل» before saving an address we cannot serve — not after.
 * One rule, shared, so the picker and the modal can never disagree.
 */

/**
 * The delivery radius for a branch that has none set.
 *
 * Not one of the 118 locations carries `custom.delivery_radius`, and the
 * modal used to default it to 99999 km — so nothing was ever out of range,
 * the desert and Amman included. 30 km covers any Saudi city from its own
 * branches. A branch that needs a different reach gets `custom.delivery_radius`
 * (km) in Shopify admin, which always wins over this.
 */
export const DEFAULT_DELIVERY_RADIUS_KM = 30;

/** Checkout accepts Saudi addresses only (see api.custom-cake-order). */
const DELIVERY_COUNTRY = 'SA';

export type CoverageBranch = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusKm: number;
};

export type Coverage =
  | {status: 'ok'; branch: CoverageBranch; distanceKm: number}
  | {status: 'out-of-range'; branch: CoverageBranch; distanceKm: number}
  | {status: 'outside-country'}
  /** No branch list yet, or no point. Treated as "don't block". */
  | {status: 'unknown'};

export function distanceKm(
  a: {lat: number; lng: number},
  b: {lat: number; lng: number},
): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** A branch's radius, or the default when it has none (or the old 99999 sentinel). */
export function effectiveRadiusKm(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw ?? ''));
  return Number.isFinite(n) && n > 0 && n < 99999 ? n : DEFAULT_DELIVERY_RADIUS_KM;
}

/** Metafields arrive bare or JSON-wrapped ({"value": "25"}). */
function metaNumber(loc: any, key: string): number {
  const raw = loc?.metafields?.find((m: any) => m?.key === key)?.value;
  if (raw === undefined || raw === null || raw === '') return NaN;
  if (typeof raw === 'string' && raw.trim().startsWith('{')) {
    try {
      return parseFloat((JSON.parse(raw) as any)?.value);
    } catch {
      return NaN;
    }
  }
  return parseFloat(raw);
}

/** The branch list from `/api/locations-meta`, reduced to what coverage needs. */
export function coverageBranches(locations: any[], isEn: boolean): CoverageBranch[] {
  return (locations || [])
    .filter((loc: any) => !loc?.hide_from_storefront)
    .map((loc: any) => {
      const arabic = loc?.metafields?.find((m: any) => m?.key === 'name_in_arabic')?.value;
      // No fee here on purpose: `custom.delivery_fee` is not what checkout
      // charges. The note reads Shopify's live rate from root instead.
      return {
        id: String(loc?.id || ''),
        name: !isEn && arabic ? String(arabic) : String(loc?.name || ''),
        lat: Number(loc?.latitude) || Number(loc?.address?.latitude) || 0,
        lng: Number(loc?.longitude) || Number(loc?.address?.longitude) || 0,
        radiusKm: effectiveRadiusKm(metaNumber(loc, 'delivery_radius')),
      };
    })
    .filter((b) => b.lat && b.lng);
}

export function checkCoverage(
  point: {lat: number; lng: number} | null | undefined,
  branches: CoverageBranch[],
  countryCode?: string,
): Coverage {
  if (countryCode && countryCode.toUpperCase() !== DELIVERY_COUNTRY) {
    return {status: 'outside-country'};
  }
  if (!point || !branches.length) return {status: 'unknown'};

  let nearest: CoverageBranch | null = null;
  let best = Infinity;
  for (const b of branches) {
    const d = distanceKm(point, b);
    if (d < best) {
      best = d;
      nearest = b;
    }
  }
  if (!nearest) return {status: 'unknown'};

  return best <= nearest.radiusKm
    ? {status: 'ok', branch: nearest, distanceKm: best}
    : {status: 'out-of-range', branch: nearest, distanceKm: best};
}
