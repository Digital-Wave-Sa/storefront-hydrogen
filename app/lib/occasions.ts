/**
 * «Shop by occasion» — one list for the homepage row (ShopByOccasion) and
 * /occasions, merchandised from Shopify.
 *
 * Each occasion is a collection carrying three metafields:
 *   custom.is_occasion       boolean         is this collection an occasion
 *   custom.occasion_order    number_integer  position (ascending)
 *   custom.occasion_visible  boolean         show its card
 *
 * The Expo app reads the same metafields with the same rules, so the two
 * channels always show the same row. Change the rules here and in the app
 * together, never in one only.
 *
 * Shopify sends booleans as the strings 'true' / 'false' and integers as
 * strings. null, absent or '' means the merchandiser has not set the field,
 * which is NOT the same as false.
 */

/*
 * Both queries (homepage OCCASIONS_QUERY, /occasions loader) select, inline so
 * GraphQL codegen can still read them:
 *
 *   collections(first: 100) {
 *     nodes {
 *       ...
 *       isOccasion: metafield(namespace: "custom", key: "is_occasion") { value }
 *       occasionOrder: metafield(namespace: "custom", key: "occasion_order") { value }
 *       occasionVisible: metafield(namespace: "custom", key: "occasion_visible") { value }
 *     }
 *   }
 *
 * The Storefront API cannot filter by metafield, so every collection is fetched
 * and filtered here. The store has ~55 collections; an occasion outside the
 * window would silently vanish from the row, so raise `first` (or paginate)
 * before the store passes 100 collections.
 */

const CDN = 'https://cdn.shopify.com/s/files/1/0809/4253/0869/files';

/** Sorts last when occasion_order is not set. */
const UNSET_ORDER = 99;

/**
 * Fallback only: used when the collections could not be fetched (query failed,
 * offline), for titles/images a collection lacks, and to decide membership of a
 * collection whose is_occasion is not set. Not the source of truth — Shopify is.
 */
const FALLBACK_OCCASIONS = [
  {handle: 'national-day', nameEn: 'National Day', nameAr: 'اليوم الوطني', image: `${CDN}/national_day_design.png?v=1711234572`, visible: true},
  {handle: 'birthdays', nameEn: 'Birthdays', nameAr: 'أعياد الميلاد', image: `${CDN}/birthday_design.png?v=1711234569`, visible: true},
  {handle: 'graduation', nameEn: 'Graduation', nameAr: 'التخرج', image: `${CDN}/graduation_design.png?v=1711234574`, visible: true},
  {handle: 'new-baby', nameEn: 'New Baby', nameAr: 'مواليد', image: `${CDN}/new_baby_design.png?v=1711234571`, visible: true},
  {handle: 'wedding', nameEn: 'Wedding', nameAr: 'زفاف', image: `${CDN}/wedding_design.png?v=1711234567`, visible: true},
  {handle: 'mothers-day', nameEn: "Mother's Day", nameAr: 'يوم الأم', image: `${CDN}/mothers_day_design.png?v=1711234573`, visible: false},
  {handle: 'ramadan', nameEn: 'Ramadan', nameAr: 'رمضان', image: `${CDN}/ramadan_design.png?v=1711234568`, visible: false},
  {handle: 'eid', nameEn: 'Eid', nameAr: 'العيد', image: `${CDN}/eid_design.png?v=1711234570`, visible: false},
] as const;

export type Occasion = {
  handle: string;
  /** Localized: the collection's title, else the bundled name. */
  name: string;
  /** The collection's image, else the bundled one ('' when neither exists). */
  image: string;
  /** Whether its card is shown. Hidden occasions stay resolvable by handle. */
  visible: boolean;
  order: number;
};

type MetafieldValue = {value?: string | null} | null | undefined;

/** 'true' → true, 'false' → false, anything else → null (not set). */
function readBoolean(field: MetafieldValue): boolean | null {
  const v = String(field?.value ?? '').trim().toLowerCase();
  if (v === 'true') return true;
  if (v === 'false') return false;
  return null;
}

/** An integer, or null when not set / not a number. */
function readInteger(field: MetafieldValue): number | null {
  const raw = String(field?.value ?? '').trim();
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * Every occasion, sorted, each with `visible`. Card lists filter on `visible`;
 * lookups by handle (deep links such as /occasions?category=eid) use the whole
 * list, so hiding a card never breaks its page.
 *
 * Rules (identical in the app):
 *   membership  is_occasion when set; otherwise the handle is in the fallback list
 *   visibility  occasion_visible; unset means VISIBLE, only an explicit false hides
 *   order       occasion_order ascending; unset sorts last (99); ties keep Shopify's order
 *   title       collection title (already localized by @inContext), else bundled name
 *   image       collection image, else bundled image
 *   empty       collections null/empty → the bundled list (five visible). A fetched
 *               list with no occasions is a real answer and is returned as-is.
 */
export function resolveOccasions(
  collections: any[] | null | undefined,
  isEn: boolean,
): Occasion[] {
  if (!collections || collections.length === 0) {
    return FALLBACK_OCCASIONS.map((f, index) => ({
      handle: f.handle,
      name: isEn ? f.nameEn : f.nameAr,
      image: f.image,
      visible: f.visible,
      order: index + 1,
    }));
  }

  const fallbackByHandle = new Map<string, (typeof FALLBACK_OCCASIONS)[number]>(
    FALLBACK_OCCASIONS.map((f) => [f.handle, f]),
  );

  return collections
    .filter((c: any) => {
      if (!c?.handle) return false;
      const flag = readBoolean(c.isOccasion);
      return flag ?? fallbackByHandle.has(c.handle);
    })
    .map((c: any) => {
      const fallback = fallbackByHandle.get(c.handle);
      return {
        handle: c.handle as string,
        name:
          String(c.title || '').trim() ||
          (fallback ? (isEn ? fallback.nameEn : fallback.nameAr) : c.handle),
        image: c.image?.url || fallback?.image || '',
        visible: readBoolean(c.occasionVisible) !== false,
        order: readInteger(c.occasionOrder) ?? UNSET_ORDER,
      };
    })
    .sort((a, b) => a.order - b.order);
}
