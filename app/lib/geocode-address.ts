import {loadGoogleMaps} from '~/lib/google-maps-loader';
import {stripCoordsMarker, type Coords} from '~/lib/address-coords';

/**
 * Coordinates for a saved address that has none, from its text.
 *
 * An address the shopper typed at Shopify checkout is saved to their account
 * without a map pin, and Shopify fills in its own geocode some time later.
 * Picked in the delivery modal in between, it had no coordinates at all, so
 * branch matching fell back to the city -- «الرياض» -> العليا -- and SDN-1574
 * (حي منفوحة) went to a branch 10.8 km away instead of Al Aziziyah at 4.5 km.
 *
 * Browser-side Geocoder through the shared loader, restricted to Saudi Arabia.
 * One lookup per address text per page; a failed lookup is remembered as null
 * so the modal does not ask Google again on every render.
 */

const cache = new Map<string, Coords | null>();

const PRECISE = new Set([
  'street_address',
  'premise',
  'subpremise',
  'route',
  'intersection',
  'plus_code',
  'point_of_interest',
  'establishment',
  'neighborhood',
  'sublocality',
  'sublocality_level_1',
  'sublocality_level_2',
  'postal_code',
]);

export function addressText(address: any): string {
  return [address?.address1, stripCoordsMarker(address?.address2), address?.city]
    .map((part) => String(part ?? '').trim())
    .filter(Boolean)
    .join('، ');
}

export async function geocodeAddressText(
  address: any,
  googleMapsKey: string,
  isEn: boolean,
): Promise<Coords | null> {
  const text = addressText(address);
  if (!text) return null;
  if (cache.has(text)) return cache.get(text) ?? null;

  try {
    await loadGoogleMaps(googleMapsKey, isEn ? 'en' : 'ar');
    const google = (window as any).google;
    const coords = await new Promise<Coords | null>((resolve) => {
      new google.maps.Geocoder().geocode(
        {address: text, region: 'sa', componentRestrictions: {country: 'SA'}},
        (results: any, status: string) => {
          // A match no finer than the city ("الرياض" alone) puts the pin at
          // the city centre -- the same guess as the city fallback, so it is
          // treated as no answer. District level or finer is plenty to pick
          // between branches kilometres apart.
          const hit =
            status === 'OK'
              ? (results || []).find((r: any) =>
                  (r.types || []).some((t: string) => PRECISE.has(t)),
                )
              : null;
          const loc = hit?.geometry?.location;
          resolve(loc ? {lat: loc.lat(), lng: loc.lng()} : null);
        },
      );
    });
    cache.set(text, coords);
    return coords;
  } catch {
    // Network or script failure: not remembered, so the next try can succeed.
    return null;
  }
}
