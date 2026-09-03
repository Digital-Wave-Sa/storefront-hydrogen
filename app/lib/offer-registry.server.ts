/**
 * Which offers exist, as data rather than as code.
 *
 * The promotions surface used to name its offers in three places at once: a
 * hardcoded handle list, a hardcoded tag table, and hardcoded links and filter
 * tabs in the page itself. Retiring an offer or launching one therefore meant a
 * code change and a deploy, and the three lists could drift apart — /promotions
 * could advertise an offer whose page no longer resolved anything.
 *
 * Now a `promotion_offer` metaobject entry IS an offer. Publish one and it
 * appears: on the hub, in the filter tabs, and at /promotions/<handle>.
 * Unpublish it and it disappears from all three. No deploy.
 *
 * ── Setting one up in Shopify Admin ────────────────────────────────────────
 * Content → Metaobjects → "Promotion offer" (type `promotion_offer`), then add
 * an entry with these fields. Only `handle` and `discount_tag` are required.
 *
 *   handle          ramadan30            URL segment: /promotions/ramadan30
 *   discount_tag    ramadan30            the tag on the Shopify DISCOUNT that
 *                                        grants the products. Comma-separate to
 *                                        accept several spellings.
 *   title_ar        خصم ٣٠٪ في رمضان     tab label and card heading
 *   title_en        30% off for Ramadan
 *   subtitle_ar     على تشكيلة مختارة    card body copy
 *   subtitle_en     on selected items
 *   badge_ar        لفترة محدودة
 *   badge_en        Limited time
 *   button_text_ar  احصل على الخصم
 *   button_text_en  Get Discount
 *   image           (file)               card artwork
 *   sort_order      10                   ascending; ties fall back to entry order
 *   enabled         true                 set false to hide without deleting
 *
 * The metaobject decides which offers are LISTED. The Shopify discount behind
 * `discount_tag` still decides which products they contain and what they cost —
 * see offer-products.server.ts. An entry whose discount is missing or expired
 * lists nothing, which is the honest result rather than a stale price promise.
 *
 * Until the metaobject type exists, this falls back to the three offers that
 * were hardcoded, so the page keeps working unchanged before anyone touches
 * Shopify.
 */

import {OFFER_HANDLES, tagsForOffer} from '~/lib/offer-tags';

export interface OfferDefinition {
  /** URL segment, e.g. `gifts25` → /promotions/gifts25 */
  handle: string;
  /** Discount tag spellings this offer accepts. */
  tags: string[];
  titleAr?: string;
  titleEn?: string;
  subtitleAr?: string;
  subtitleEn?: string;
  badgeAr?: string;
  badgeEn?: string;
  buttonTextAr?: string;
  buttonTextEn?: string;
  imageUrl?: string;
  imageAlt?: string;
  sortOrder: number;
  /** True when this came from the hardcoded fallback rather than Shopify. */
  isFallback?: boolean;
}

const OFFER_REGISTRY_QUERY = `#graphql
  query promotionOfferRegistry {
    offers: metaobjects(type: "promotion_offer", first: 20) {
      nodes {
        id
        handle
        fields {
          key
          value
          reference {
            ... on MediaImage {
              image {
                url
                altText
              }
            }
          }
        }
      }
    }
  }
` as const;

/** The offers as they were hardcoded, used until the metaobjects exist. */
function fallbackRegistry(): OfferDefinition[] {
  return OFFER_HANDLES.map((handle, index) => ({
    handle,
    tags: tagsForOffer(handle),
    sortOrder: index,
    isFallback: true,
  }));
}

const truthy = (value: unknown) => {
  const v = String(value ?? '').trim().toLowerCase();
  return v === '' || v === 'true' || v === '1' || v === 'yes';
};

function parseEntry(node: any): OfferDefinition | null {
  const fields: Record<string, any> = {};
  for (const f of node?.fields || []) {
    fields[f.key] = f.reference?.image
      ? {url: f.reference.image.url, altText: f.reference.image.altText}
      : f.value;
  }

  const handle = String(fields.handle || node?.handle || '').trim().toLowerCase();
  if (!handle) return null;

  // `enabled` absent counts as enabled — a merchant who has not added the field
  // still expects their entry to show.
  if (!truthy(fields.enabled)) return null;

  /**
   * Fall back to the handle as the discount tag. Tagging the discount with the
   * same word as the URL is the obvious setup, and requiring the field twice
   * would just be a way to get them out of step.
   */
  const tags = String(fields.discount_tag || fields.discount_tags || handle)
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const sortOrder = Number(fields.sort_order);

  return {
    handle,
    tags: tags.length > 0 ? tags : [handle],
    titleAr: fields.title_ar || fields.title || undefined,
    titleEn: fields.title_en || fields.title || undefined,
    subtitleAr: fields.subtitle_ar || fields.subtitle || undefined,
    subtitleEn: fields.subtitle_en || fields.subtitle || undefined,
    badgeAr: fields.badge_ar || fields.badge || undefined,
    badgeEn: fields.badge_en || fields.badge || undefined,
    buttonTextAr: fields.button_text_ar || fields.button_text || undefined,
    buttonTextEn: fields.button_text_en || fields.button_text || undefined,
    imageUrl: fields.image?.url || undefined,
    imageAlt: fields.image?.altText || undefined,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : Number.MAX_SAFE_INTEGER,
  };
}

/**
 * Every offer the storefront should list, in display order.
 *
 * Never throws and never returns an empty list: a failed metaobject lookup or a
 * store with none defined falls back to the previously hardcoded offers, so the
 * promotions page cannot go blank because of a content problem.
 */
export async function fetchOfferRegistry(storefront: any): Promise<OfferDefinition[]> {
  try {
    const data: any = await storefront.query(OFFER_REGISTRY_QUERY, {
      cache: storefront.CacheShort(),
    });

    const parsed = (data?.offers?.nodes || [])
      .map(parseEntry)
      .filter(Boolean) as OfferDefinition[];

    if (parsed.length === 0) return fallbackRegistry();

    return parsed
      .map((offer, index) => ({offer, index}))
      .sort((a, b) =>
        a.offer.sortOrder === b.offer.sortOrder
          ? a.index - b.index
          : a.offer.sortOrder - b.offer.sortOrder,
      )
      .map(({offer}) => offer);
  } catch (err) {
    console.error('[offers] Failed to read the promotion_offer registry:', err);
    return fallbackRegistry();
  }
}

/** One offer by URL handle, or null when nothing is registered under it. */
export async function fetchOfferDefinition(
  storefront: any,
  handle: string,
): Promise<OfferDefinition | null> {
  const wanted = String(handle || '').trim().toLowerCase();
  if (!wanted) return null;
  const registry = await fetchOfferRegistry(storefront);
  return registry.find((offer) => offer.handle === wanted) ?? null;
}

/** The label to show for an offer, falling back to the discount's own title. */
export function offerLabel(
  offer: OfferDefinition | null | undefined,
  isEn: boolean,
  discountTitle?: string | null,
): string {
  if (!offer) return discountTitle || '';
  const label = isEn ? offer.titleEn || offer.titleAr : offer.titleAr || offer.titleEn;
  return label || discountTitle || offer.handle;
}
