/**
 * SEO metadata utilities
 */

const BRAND_EN = 'Saadeddin Pastry';
const BRAND_AR = 'حلويات سعد الدين';

/** Whether the shopper is on the English storefront, from the root loader. */
export function isEnglish(matches: any[] | undefined): boolean {
  const rootMatch = matches?.find((m) => m?.id === 'root');
  return rootMatch?.data?.locale === 'en';
}

/**
 * A page title in the shopper's language.
 *
 * Every route used to hardcode its own — some English, some Arabic, some both
 * glued together — so an English shopper read «طلباتي | Saadeddin» in the tab
 * and an Arabic one read «Profile | Saadeddin». The language is on the root
 * loader (`locale`), which every meta function receives through `matches`, so
 * a route only supplies the two words.
 */
export function pageTitle(matches: any[] | undefined, en: string, ar: string): string {
  const isEn = isEnglish(matches);
  return `${isEn ? en : ar} | ${isEn ? BRAND_EN : BRAND_AR}`;
}

/** A title that is already in the right language, with the brand appended. */
export function getShopTitle(title: string, matches: any[]): string {
  const brand = isEnglish(matches) ? BRAND_EN : BRAND_AR;
  return title ? `${title} | ${brand}` : brand;
}
