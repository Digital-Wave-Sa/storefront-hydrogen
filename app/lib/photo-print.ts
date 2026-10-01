/**
 * «صورة على الكيك» — a shopper's own photo printed on a cake, paid for.
 *
 * How it fits together (Oct 2026):
 *
 *   - A product offers it when it carries the tag `photo-print` (set in
 *     Shopify admin, case-insensitive). Remove the tag to stop offering it.
 *   - The photo is uploaded first (/api/cake-photo → Shopify Files) and its
 *     CDN link goes on the cake's cart line as the `Cake Photo` property, so
 *     the order, the kitchen slip and the CRM all show which picture to print.
 *   - The charge is a second cart line: the hidden product `cake-photo-print`
 *     («طباعة صورة على الكيك»). Its price in Shopify IS the photo price —
 *     change it there. Both lines share a `_groupId`.
 *   - The cart keeps the pair together (photo-print.server → reconcile): the
 *     photo line follows the cake's quantity, goes when the cake goes, and
 *     removing the photo line takes the photo off the cake.
 *   - Products tagged `addon-only` (the photo print itself) never appear in
 *     listings or search and have no product page.
 */

export const PHOTO_PRINT_TAG = 'photo-print';
export const PHOTO_PRINT_HANDLE = 'cake-photo-print';
export const ADDON_ONLY_TAG = 'addon-only';

/** The cake line's property holding the photo link (shown in admin as-is). */
export const PHOTO_ATTR_KEY = 'Cake Photo';

export const PHOTO_MAX_BYTES = 8 * 1024 * 1024;
export const PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function tagsOf(product: any): string[] {
  const tags = product?.tags ?? product?.product?.tags ?? [];
  return Array.isArray(tags) ? (tags as string[]) : [];
}

function hasTag(product: any, tag: string): boolean {
  return tagsOf(product).some((t) => String(t).trim().toLowerCase() === tag);
}

/** Whether this product's page offers a photo on the cake. */
export function offersPhotoPrint(product: any): boolean {
  return hasTag(product, PHOTO_PRINT_TAG);
}

/** Sold only alongside another product — never listed on its own. */
export function isAddonOnlyProduct(product: any): boolean {
  // The handle too: predictive-search results carry no tags.
  const handle = product?.handle ?? product?.product?.handle;
  return handle === PHOTO_PRINT_HANDLE || hasTag(product, ADDON_ONLY_TAG);
}

/** The cart line that charges for a photo print. */
export function isPhotoPrintLine(line: any): boolean {
  return line?.merchandise?.product?.handle === PHOTO_PRINT_HANDLE;
}

export function lineAttr(line: any, key: string): string {
  return String(
    (line?.attributes || []).find((a: any) => a?.key === key)?.value || '',
  );
}

/** The photo link on a cake line, or '' when it has none. */
export function linePhotoUrl(line: any): string {
  return lineAttr(line, PHOTO_ATTR_KEY);
}

/** The photo-print line paired with this cake line, if any. */
export function photoLineOf(cakeLine: any, lines: any[]): any | null {
  const g = lineAttr(cakeLine, '_groupId');
  if (!g || !linePhotoUrl(cakeLine)) return null;
  return (
    (lines || []).find(
      (l) => isPhotoPrintLine(l) && lineAttr(l, '_groupId') === g,
    ) || null
  );
}

/** Whether a photo-print line's cake is in the cart (it then renders inside it). */
export function hasPhotoOwner(photoLine: any, lines: any[]): boolean {
  const g = lineAttr(photoLine, '_groupId');
  return Boolean(
    g &&
      (lines || []).some(
        (l) =>
          !isPhotoPrintLine(l) &&
          linePhotoUrl(l) &&
          lineAttr(l, '_groupId') === g,
      ),
  );
}

/** Only links to Shopify's own CDN are accepted as a cake photo. */
export function isShopifyCdnUrl(value: unknown): boolean {
  return typeof value === 'string' && /^https:\/\/cdn\.shopify\.com\//.test(value);
}
