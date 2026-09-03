/**
 * The products in an offer, priced the way the offer prices them.
 *
 * Extracted so /promotions and /promotions/:offer resolve an offer exactly the
 * same way. The hub used to build its grid from the catalogue instead — any
 * product whose `compareAtPrice` sat above its `price`, plus anything carrying a
 * discount-ish tag. The offers themselves are Shopify discounts applied at the
 * cart, which change nothing on the product record, so a product in the gifts25
 * discount did not appear under "منتجات مختارة بخصومات حصرية" at all unless it
 * also happened to be independently marked down. The hub advertised markdowns;
 * the offer pages advertised offers; they shared no code and listed different
 * products.
 *
 * Admin API for the discount, Storefront API for the products. Server only.
 */

import {fetchOfferByTags, type OfferData} from '~/lib/offer-discounts.server';
import {tagsForOfferHandle} from '~/lib/offer-tags';
import {applyOfferPricing} from '~/lib/offer-pricing';

/** The offer's products fetched by id — exact, and not capped by a catalogue window. */
export const OFFER_PRODUCTS_BY_ID_QUERY = `#graphql
  query offerProductsById($ids: [ID!]!, $country: CountryCode, $language: LanguageCode) @inContext(country: $country, language: $language) {
    nodes(ids: $ids) {
      ... on Product {
        id
        handle
        title
        tags
        availableForSale
        featuredImage {
          url
          altText
          width
          height
        }
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
        compareAtPriceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
        variants(first: 10) {
          nodes {
            id
            title
            availableForSale
            price {
              amount
              currencyCode
            }
            compareAtPrice {
              amount
              currencyCode
            }
            selectedOptions {
              name
              value
            }
            storeAvailability(first: 250) {
              nodes {
                available
                location {
                  id
                  name
                }
              }
            }
          }
        }
      }
    }
  }
` as const;

/** Products of the collections a discount targets, as Storefront nodes. */
export const COLLECTION_PRODUCTS_QUERY = `#graphql
  query offerCollectionProducts($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Collection {
        id
        products(first: 250) { nodes { id } }
      }
    }
  }
` as const;

export interface ResolvedOffer {
  handle: string;
  offer: OfferData;
  /** Qualifying products, priced with the offer's discount applied. */
  gridProducts: any[];
  /** On a Buy X Get Y offer, the item the shopper receives. */
  freeItems: any[];
}

/**
 * Resolve one offer by its URL handle.
 *
 * `catalogue` is the page's own product list, used only when the discount
 * applies to everything — asking Shopify for every product by id would be
 * pointless there. Otherwise the ids come from the discount, so a product
 * outside the catalogue window is still found: the hub caps its product query
 * at 250, and an offer whose products sat past that cap rendered empty while
 * being perfectly valid.
 */
export async function resolveOffer({
  storefront,
  env,
  handle,
  tags,
  catalogue = [],
}: {
  storefront: any;
  env: any;
  handle: string;
  /**
   * Discount tag spellings to look for. Supplied by the `promotion_offer`
   * registry entry, so a new offer needs no code change. Omitted for a handle
   * with no entry, which falls back to the built-in table and then to the
   * handle itself.
   */
  tags?: string[];
  catalogue?: any[];
}): Promise<ResolvedOffer> {
  const wantedTags = tags && tags.length > 0 ? tags : tagsForOfferHandle(handle);
  const offer = await fetchOfferByTags(env, wantedTags);

  let offerProducts: any[] = [];

  if (offer.allProducts) {
    offerProducts = catalogue;
  } else {
    const wantedIds = new Set(offer.products.map((p) => p.id));

    // A discount can target collections rather than individual products.
    if (offer.collectionIds.length > 0) {
      try {
        const collectionData: any = await storefront.query(
          COLLECTION_PRODUCTS_QUERY,
          {variables: {ids: offer.collectionIds}, cache: storefront.CacheNone()},
        );
        for (const node of collectionData?.nodes || []) {
          for (const p of node?.products?.nodes || []) {
            if (p?.id) wantedIds.add(p.id);
          }
        }
      } catch (err) {
        console.error('[offers] Failed to resolve discount collections:', err);
      }
    }

    if (wantedIds.size > 0) {
      try {
        const byId: any = await storefront.query(OFFER_PRODUCTS_BY_ID_QUERY, {
          variables: {
            ids: [...wantedIds],
            country: storefront.i18n.country,
            language: storefront.i18n.language,
          },
          cache: storefront.CacheNone(),
        });
        const roleById = new Map(
          offer.products.map((p) => [p.id, p.role] as const),
        );
        offerProducts = (byId?.nodes || []).filter(Boolean).map((product: any) => {
          const variant = product.variants?.nodes?.[0];
          return {
            ...product,
            role: roleById.get(product.id),
            tags: (product.tags || []).map((t: string) => t.toLowerCase()),
            availableForSale:
              product.availableForSale ?? variant?.availableForSale ?? true,
          };
        });
      } catch (err) {
        console.error('[offers] Failed to fetch offer products by id:', err);
      }
    }
  }

  /**
   * On a Buy X Get Y offer the free item is not something to add to the cart —
   * listing it as an ordinary product card invites the shopper to buy the very
   * thing they are supposed to receive. Qualifying products go in the grid; the
   * free item is named separately.
   */
  const freeItems = offer.isBxgy
    ? offerProducts.filter((p: any) => p.role === 'get')
    : [];

  const gridProducts = (
    offer.isBxgy
      ? offerProducts.filter((p: any) => p.role === 'buy' || p.role === 'both')
      : offerProducts
  ).map((product: any) =>
    /**
     * Price each card the way the offer prices it. Skipped on Buy X Get Y,
     * where the discount lands on the free item rather than on the qualifying
     * products listed in the grid.
     */
    offer.isBxgy
      ? {...product, offerHandles: [handle]}
      : applyOfferPricing(product, {
          handle,
          discountValue: offer.discountValue,
        }),
  );

  return {handle, offer, gridProducts, freeItems};
}

/**
 * Resolve several offers and merge their products into one list.
 *
 * A product entitled by two offers appears once, keeping the first offer's
 * pricing and collecting both handles in `offerHandles` so the hub's filter
 * tabs still place it under each.
 */
export async function resolveOffers({
  storefront,
  env,
  offers: definitions,
  catalogue = [],
}: {
  storefront: any;
  env: any;
  /** Registry entries: the handle to resolve and the discount tags to accept. */
  offers: {handle: string; tags?: string[]}[];
  catalogue?: any[];
}): Promise<{offers: ResolvedOffer[]; products: any[]}> {
  const offers = await Promise.all(
    definitions.map(({handle, tags}) =>
      resolveOffer({storefront, env, handle, tags, catalogue}).catch((err) => {
        console.error(`[offers] Failed to resolve /promotions/${handle}:`, err);
        return null;
      }),
    ),
  );

  const resolved = offers.filter(Boolean) as ResolvedOffer[];

  const byId = new Map<string, any>();
  for (const {handle, gridProducts} of resolved) {
    for (const product of gridProducts) {
      if (!product?.id) continue;
      const existing = byId.get(product.id);
      if (!existing) {
        byId.set(product.id, product);
        continue;
      }
      const handles2: string[] = existing.offerHandles || [];
      if (!handles2.includes(handle)) {
        existing.offerHandles = [...handles2, handle];
      }
    }
  }

  return {offers: resolved, products: [...byId.values()]};
}
