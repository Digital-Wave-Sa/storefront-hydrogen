/**
 * One address line, in one language, from a Google reverse-geocode.
 *
 * `formatted_address` is Google's own string, and in Saudi Arabia it mixes
 * scripts whenever a part has no Arabic name on file: the Arabic picker
 * showed «7250, Alsahafa، الرياض 12251، السعودية». It also carries the postal
 * code and the country, neither of which a driver in Riyadh needs.
 *
 * So the line is rebuilt from the address components instead. Every result
 * Google returned is searched, not just the first, because the Arabic name of
 * a district often sits on a broader result than the street does; for each
 * part the name in the page's script wins, and the other script is used only
 * when nothing else exists.
 */

type Component = {long_name: string; short_name: string; types: string[]};

const ARABIC = /[؀-ۿ]/;
const LATIN = /[A-Za-z]/;

/** Road names Google uses for "no name", which say nothing to a driver. */
const UNNAMED = /^(unnamed road|طريق بدون اسم|طريق بلا اسم)$/i;

export type GeocodeLine = {
  /** The street, district and city, in the page's language where possible. */
  address: string;
  city: string;
  /** ISO country code, upper case (SA), or '' when Google gave none. */
  countryCode: string;
  /**
   * The postal code, kept OUT of the address line but saved in `zip`.
   * Checkout asks for it; an address saved without one was completed there
   * (often by browser autofill — 94061 is Redwood City) and Shopify then
   * stored the checkout copy as a second, near-identical address.
   */
  zip: string;
};

export function formatGeocode(results: any[], isEn: boolean): GeocodeLine | null {
  const usable = (results || []).filter(
    (r: any) => !r?.types?.includes('plus_code'),
  );
  if (!usable.length) return null;

  const components: Component[] = usable.flatMap(
    (r: any) => (r?.address_components || []) as Component[],
  );

  const fitsLanguage = (name: string) =>
    isEn ? !ARABIC.test(name) : !LATIN.test(name);

  /** First component of any of these types, in the page's script if one exists. */
  const pick = (...types: string[]): string => {
    for (const type of types) {
      const matches = components.filter((c) => c.types.includes(type));
      if (!matches.length) continue;
      const preferred = matches.find((c) => fitsLanguage(c.long_name));
      return (preferred || matches[0]).long_name;
    }
    return '';
  };

  const number = pick('street_number');
  const routeRaw = pick('route');
  const route = UNNAMED.test(routeRaw.trim()) ? '' : routeRaw;
  const district = pick('sublocality_level_1', 'sublocality', 'neighborhood');
  const city = pick(
    'locality',
    'administrative_area_level_2',
    'administrative_area_level_1',
  );
  const zip = pick('postal_code').replace(/[^\d]/g, '');
  const countryCode = (
    components.find((c) => c.types.includes('country'))?.short_name || ''
  ).toUpperCase();

  // In Saudi Arabia the street number is the building number of the National
  // Address; on its own, with no street name, it reads as noise unless named.
  const street = route
    ? [number, route].filter(Boolean).join(' ')
    : number
      ? `${isEn ? 'Building' : 'مبنى'} ${number}`
      : '';
  const parts = [street, district, city].filter(
    (part, i, all) => part && all.indexOf(part) === i,
  );

  const address = parts.length
    ? parts.join(isEn ? ', ' : '، ')
    : String(usable[0]?.formatted_address || '');

  return {address, city, countryCode, zip};
}
