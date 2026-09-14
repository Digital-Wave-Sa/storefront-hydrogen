/**
 * Recognising a custom-cake order, and the picture to show for one.
 *
 * A cake built in /custom-cake has no product record behind it — the order is
 * a draft-order line titled «طلبية خاصة فئة … ريال» (see api.custom-cake-order),
 * so there is no variant image, no product image, and nothing for an order
 * card to render. Every order view fell through to its empty grey tile, which
 * is how the one item a customer designed themselves ended up as the only one
 * with no picture.
 *
 * The same handful of attribute keys was also written out by hand in five
 * places across three route files, each list slightly different from the next.
 * They live here now, so a change to how a cake order is marked reaches all of
 * them at once.
 */

/** Shown in place of the missing product artwork on a custom-cake order. */
export const CUSTOM_CAKE_IMAGE_URL =
  'https://cdn.shopify.com/s/files/1/0821/1752/5737/files/Cakebuldersaadaldeen.webp?v=1788701305';

/**
 * The attribute keys api.custom-cake-order writes onto a cake order.
 *
 * `_cake_custom` is the deliberate marker; the others are the visible
 * attributes, kept as a fallback for orders placed before the marker existed.
 */
const CAKE_ATTRIBUTE_KEYS = [
  '_cake_custom',
  'Shape',
  'الشكل',
  'Flavor',
  'النكهة',
];

/** Titles the builder gives its line, in either language. */
const CAKE_TITLE_MARKERS = ['كيكة مخصصة', 'Custom Cake', 'طلبية خاصة'];

const hasCakeAttribute = (attrs: unknown): boolean =>
  Array.isArray(attrs) &&
  attrs.some((attr: any) => CAKE_ATTRIBUTE_KEYS.includes(attr?.key));

const hasCakeTitle = (title: unknown): boolean =>
  typeof title === 'string' &&
  CAKE_TITLE_MARKERS.some((marker) => title.includes(marker));

/**
 * Is this line the cake?
 *
 * Attributes arrive under two spellings depending on whether the order came
 * through the Storefront API or the Admin one, and the title is checked last
 * because an order placed before the attributes existed still carries it.
 */
export function isCustomCakeLine(item: any): boolean {
  return (
    hasCakeAttribute(item?.customAttributes) ||
    hasCakeAttribute(item?.custom_attributes) ||
    hasCakeTitle(item?.title)
  );
}

/** Does this order contain a custom cake? */
export function isCustomCakeOrder(order: any): boolean {
  if (hasCakeAttribute(order?.customAttributes)) return true;

  const lines =
    order?.lineItems?.nodes ||
    order?.lineItems?.edges?.map((edge: any) => edge?.node) ||
    order?.items ||
    [];

  return Array.isArray(lines) && lines.some(isCustomCakeLine);
}

/**
 * The image for an order line: the cake picture when it is a cake, otherwise
 * whatever the caller already resolved.
 */
export function orderLineImage(item: any, resolved?: string | null): string {
  return isCustomCakeLine(item) ? CUSTOM_CAKE_IMAGE_URL : resolved || '';
}

/**
 * The cake line's title, in the language being read.
 *
 * Ordinary lines take their name from the live product, which Shopify returns
 * translated. A cake has no product: `api.custom-cake-order` writes the draft
 * line's title itself, as «طلبية خاصة فئة 510 ريال», and that string is stored
 * on the order for ever. So the English account pages showed an Arabic name for
 * the one item the customer designed themselves — and there is nothing to look
 * up, because the title IS the record.
 *
 * Since we write the title, we can read it back: the shapes below are the ones
 * the builder has produced, and anything else is returned untouched.
 * Translating at display time rather than storing a second title fixes the
 * orders already placed, and leaves the title in the Shopify admin as the
 * Arabic one the kitchen works from.
 */
const CAKE_TITLE_FORMS: Array<{
  test: RegExp;
  en: (price: string) => string;
  ar: (price: string) => string;
}> = [
  {
    // «طلبية خاصة فئة 510 ريال» — what the builder writes today.
    test: /^\s*طلبية\s+خاصة\s+فئة\s+([\d.,]+)\s*ريال\s*$/,
    en: (p) => `Custom Order — ${p} SAR`,
    ar: (p) => `طلبية خاصة فئة ${p} ريال`,
  },
  {
    // Its English twin, so the Arabic site is corrected in the same way.
    test: /^\s*Custom\s+Order\s*[—–-]\s*([\d.,]+)\s*SAR\s*$/i,
    en: (p) => `Custom Order — ${p} SAR`,
    ar: (p) => `طلبية خاصة فئة ${p} ريال`,
  },
  {
    // The older, price-less line from an earlier build.
    test: /^\s*(?:كيكة\s+مخصصة|Custom\s+Cake)\s*$/i,
    en: () => 'Custom Cake',
    ar: () => 'كيكة مخصصة',
  },
];

export function localizeCakeLineTitle(title: unknown, isEn: boolean): string {
  const raw = typeof title === 'string' ? title : '';
  if (!raw.trim()) return raw;

  for (const form of CAKE_TITLE_FORMS) {
    const match = raw.match(form.test);
    if (!match) continue;
    const price = typeof match[1] === 'string' ? match[1] : '';
    return isEn ? form.en(price) : form.ar(price);
  }

  /**
   * Not a title we wrote — a real product name, or a shape we do not know.
   * Renaming one of those would be a worse bug than the one being fixed.
   */
  return raw;
}
