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

/**
 * The address id, without the part of it that changes.
 *
 * A Shopify MailingAddress id is not a bare gid. It arrives as
 *
 *   gid://shopify/MailingAddress/10802009833705?model_name=CustomerAddress&customer_access_token=j1ptKQ47…
 *
 * and that trailing `customer_access_token` is minted per query, so the SAME
 * address read twice carries two different ids. Every `a.id === selectedId`
 * comparison in this codebase was therefore comparing two spellings of one
 * address and concluding they were different ones.
 *
 * That is why matching by id -- added precisely because a customer's addresses
 * all share their name -- silently never matched. Each caller fell through to
 * its own fallback: a name lookup against a district label that appears in no
 * address field, or `addresses[0]`. So the shopper picked one address and the
 * cart kept another, the header pill named a third, and checkout, which will
 * not overwrite the cart's address, faithfully preserved the wrong one.
 *
 * Only the numeric id identifies the address. Everything after `?` is context.
 */
export function baseAddressId(id?: string | null): string {
  if (!id) return '';
  return String(id).split('?')[0].trim();
}

/** True when two Shopify address ids name the same address. */
export function sameAddressId(a?: string | null, b?: string | null): boolean {
  const left = baseAddressId(a);
  const right = baseAddressId(b);
  return Boolean(left) && left === right;
}
