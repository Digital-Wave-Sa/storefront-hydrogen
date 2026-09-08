/**
 * Coordinates for a customer address.
 *
 * Shopify will not store a dropped map pin. `MailingAddressInput` has no
 * latitude/longitude field and neither does the Admin address resource, so the
 * pin had nowhere legitimate to go and was smuggled into `address2` as
 * `COORDS:<lat>,<lng>`. That cost the shopper their apartment/floor line and
 * travelled to checkout as part of the printed address.
 *
 * Shopify does geocode the text address and expose the result as read-only
 * `latitude` / `longitude` on `MailingAddress`, which is what this prefers.
 * The legacy marker is still read, so addresses saved before this change keep
 * working, and `stripCoordsMarker` hides it everywhere address2 is shown or
 * sent onward.
 *
 * The only consumer is nearest-branch matching and the delivery-radius check,
 * which compares against a handful of branches kilometres apart — street-level
 * accuracy is enough. When neither source has coordinates the callers already
 * fall back to matching on city name.
 */

const LEGACY_COORDS = /COORDS:\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/;

export type Coords = {lat: number; lng: number};

function toFinite(value: unknown): number | null {
  const num =
    typeof value === 'number' ? value : parseFloat(String(value ?? ''));
  return Number.isFinite(num) ? num : null;
}

/** Lat/lng for an address, or null when neither source has one. */
export function addressCoords(address: any): Coords | null {
  const lat = toFinite(address?.latitude);
  const lng = toFinite(address?.longitude);
  // 0,0 sits in the Gulf of Guinea; it is an unset field, not an address.
  if (lat !== null && lng !== null && (lat !== 0 || lng !== 0)) {
    return {lat, lng};
  }

  const legacy = String(address?.address2 ?? '').match(LEGACY_COORDS);
  if (legacy) {
    const legacyLat = toFinite(legacy[1]);
    const legacyLng = toFinite(legacy[2]);
    if (legacyLat !== null && legacyLng !== null) {
      return {lat: legacyLat, lng: legacyLng};
    }
  }

  return null;
}

/**
 * `address2` with any legacy marker removed, and the separators it left
 * behind trimmed off. Returns '' rather than the marker, so a customer who
 * edits an old address saves the line clean without having to notice it.
 */
export function stripCoordsMarker(address2?: string | null): string {
  if (!address2) return '';
  return String(address2)
    .replace(LEGACY_COORDS, '')
    .replace(/^[\s,;،-]+|[\s,;،-]+$/g, '')
    .trim();
}
