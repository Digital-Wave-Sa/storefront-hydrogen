/**
 * The shop's own filter options — «النوع الغذائي» and the occasions — and
 * what each one actually matches. Shared by the listing loaders (which do the
 * matching) and FilterSidebar (which shows only options that match anything).
 *
 * How a selection combines (fixed Oct 2026; before, every ticked box was one
 * big OR with loose substring matching, so «خالي من الجلوتين» + «تخرج»
 * showed any chocolate cake Shopify's search fell back to):
 *
 *   - Dietary options are each their own requirement — gluten-free AND vegan
 *     means both.
 *   - Occasions are one choice — graduation OR national day.
 *   - Categories are one choice — cake OR kunafa.
 *   - Between groups it is AND, and price etc. apply on top.
 *
 * Each option matches products by exact tag (any of `tags`) or by membership
 * of one of its `collections`. As of 1 Oct 2026 no product carries any of the
 * dietary tags, so those options stay hidden until products are tagged.
 */

export type DietaryOption = {
  key: string;
  labelAr: string;
  labelEn: string;
  /** Exact tags (any of them). The first is what the sidebar writes. */
  tags: string[];
  /** Collection handles whose products also count. */
  collections: string[];
};

export const DIETARY_OPTIONS: DietaryOption[] = [
  {
    key: 'gluten-free',
    labelAr: 'خالي من الجلوتين',
    labelEn: 'Gluten-Free',
    tags: ['gluten-free', 'gluten_free', 'خالي من الجلوتين', 'dietary:gluten-free'],
    collections: [],
  },
  {
    key: 'vegan',
    labelAr: 'مناسب للنباتيين',
    labelEn: 'Vegan / Vegetarian',
    tags: ['vegan', 'vegetarian', 'مناسب للنباتيين', 'dietary:vegan'],
    collections: [],
  },
  {
    key: 'healthy',
    labelAr: 'منتجات صحية',
    labelEn: 'Healthy Products',
    tags: ['healthy', 'منتجات صحية', 'dietary:healthy'],
    collections: ['health-products'],
  },
  {
    key: 'sugar-free',
    labelAr: 'خالي من السكر',
    labelEn: 'Sugar-Free',
    tags: ['sugar-free', 'sugar_free', 'خالي من السكر', 'dietary:sugar-free'],
    collections: [],
  },
  {
    key: 'low-fat',
    labelAr: 'قليل الدهون',
    labelEn: 'Low-Fat',
    tags: ['low-fat', 'low_fat', 'قليل الدهون', 'dietary:low-fat'],
    collections: [],
  },
];

/** Occasion handles: a collection of that handle, or the same word as a tag. */
export const OCCASION_HANDLES = [
  'wedding',
  'ramadan',
  'birthdays',
  'eid',
  'new-baby',
  'national-day',
  'mothers-day',
  'graduation',
  'corporate-gifts',
];

const norm = (t: string) => String(t || '').trim().toLowerCase();

/** The dietary option a ticked tag belongs to, or null. */
export function dietaryOptionForTag(tag: string): DietaryOption | null {
  const t = norm(tag);
  return DIETARY_OPTIONS.find((o) => o.tags.some((x) => norm(x) === t)) || null;
}

export function isOccasionHandle(handle: string): boolean {
  return OCCASION_HANDLES.includes(norm(handle));
}

/** Option key → number of products it matches (catalogue-wide). */
export type DietaryCounts = Record<string, number>;
