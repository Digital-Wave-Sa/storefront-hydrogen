import {data, type LoaderFunctionArgs} from 'react-router';
import {fetchOfferByTags} from '~/lib/offer-discounts.server';
import {tagsForOfferHandle} from '~/lib/offer-tags';

/**
 * Offer products, for clients that cannot reach the Admin API themselves.
 *
 * Discount tags live only on the Admin API, and the mobile app must not carry an
 * Admin token — a token shipped in an app bundle is extractable from the APK and
 * grants whatever scopes it holds. The storefront already holds those credentials
 * server-side, so the app asks here instead and both surfaces resolve an offer
 * through the exact same code path.
 *
 * GET /api/offers?handle=chocolates40
 *
 * Response:
 *   {
 *     handle, title, summary, code, endsAt,
 *     products: [{id, title, handle, price, originalPrice, imageUri, variantId,
 *                 inStock, tags}]
 *   }
 *
 * Public, read-only, and returns nothing a shopper cannot already see on the
 * storefront — so no auth, but also nothing sensitive.
 */

/**
 * Operation names must be unique across the whole project — Hydrogen's GraphQL
 * codegen validates every `#graphql` document together, and a duplicate name
 * fails the build rather than just this file. These are prefixed `api…` to stay
 * clear of the identically-shaped query in the promotions route.
 */
const OFFER_PRODUCTS_QUERY = `#graphql
  query apiOfferProductsById($ids: [ID!]!, $country: CountryCode, $language: LanguageCode) @inContext(country: $country, language: $language) {
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
        variants(first: 1) {
          nodes {
            id
            availableForSale
            price {
              amount
              currencyCode
            }
            compareAtPrice {
              amount
              currencyCode
            }
          }
        }
      }
    }
  }
` as const;

const COLLECTION_PRODUCT_IDS_QUERY = `#graphql
  query apiOfferCollectionProductIds($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Collection {
        id
        products(first: 250) {
          nodes {
            id
          }
        }
      }
    }
  }
` as const;

/** Everything a product card needs, in the shape the app's ProductItem expects. */
function toProductItem(product: any, role?: 'buy' | 'get' | 'both') {
  const variant = product?.variants?.nodes?.[0];
  const price = parseFloat(
    variant?.price?.amount ?? product?.priceRange?.minVariantPrice?.amount ?? '0',
  );
  const compareAt = parseFloat(
    variant?.compareAtPrice?.amount ??
      product?.compareAtPriceRange?.minVariantPrice?.amount ??
      '0',
  );

  return {
    id: product.id,
    title: product.title,
    handle: product.handle,
    price,
    // Only a real markdown, never a synthesised one.
    originalPrice: compareAt > price ? compareAt : undefined,
    currency: variant?.price?.currencyCode ?? 'SAR',
    imageUri: product.featuredImage?.url ?? '',
    variantId: variant?.id,
    inStock: product.availableForSale ?? variant?.availableForSale ?? true,
    tags: product.tags ?? [],
    // Which side of a Buy X Get Y offer this product is on; undefined otherwise.
    role,
  };
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function loader({context, request}: LoaderFunctionArgs) {
  const {storefront, env} = context;
  const url = new URL(request.url);
  const handle = (url.searchParams.get('handle') || '').trim().toLowerCase();

  const headers = {
    ...CORS_HEADERS,
    'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
  };

  if (!handle) {
    return data(
      {error: 'Missing ?handle', products: []},
      {status: 400, headers: CORS_HEADERS},
    );
  }

  try {
    const offer = await fetchOfferByTags(env, tagsForOfferHandle(handle));

    const ids = new Set(offer.products.map((p) => p.id));

    // A discount can target collections rather than named products.
    if (offer.collectionIds.length > 0) {
      try {
        const collectionData: any = await storefront.query(
          COLLECTION_PRODUCT_IDS_QUERY,
          {
            variables: {ids: offer.collectionIds},
            cache: storefront.CacheNone(),
          },
        );
        for (const node of collectionData?.nodes || []) {
          for (const p of node?.products?.nodes || []) {
            if (p?.id) ids.add(p.id);
          }
        }
      } catch (err) {
        console.error('[api.offers] Failed to resolve discount collections:', err);
      }
    }

    let products: any[] = [];

    if (ids.size > 0) {
      const byId: any = await storefront.query(OFFER_PRODUCTS_QUERY, {
        variables: {
          ids: [...ids],
          country: storefront.i18n.country,
          language: storefront.i18n.language,
        },
        cache: storefront.CacheNone(),
      });
      const roleById = new Map(
        offer.products.map((p) => [p.id, p.role] as const),
      );
      products = (byId?.nodes || [])
        .filter(Boolean)
        .map((p: any) => toProductItem(p, roleById.get(p.id)));
    }

    return data(
      {
        handle,
        title: offer.title ?? null,
        summary: offer.summary ?? null,
        code: offer.code ?? null,
        endsAt: offer.endsAt ?? null,
        // `true` means the promotion covers the whole catalogue; the client then
        // shows its normal product list rather than an explicit id set.
        allProducts: offer.allProducts,
        isBxgy: offer.isBxgy,
        products,
      },
      {headers},
    );
  } catch (error) {
    console.error('[api.offers] Failed to resolve offer:', error);
    return data(
      {handle, products: [], error: 'offer-lookup-failed'},
      {status: 200, headers: CORS_HEADERS},
    );
  }
}

/** Preflight, for Expo web where CORS is enforced. */
export async function action({request}: LoaderFunctionArgs) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {status: 204, headers: CORS_HEADERS});
  }
  return new Response('Method Not Allowed', {status: 405, headers: CORS_HEADERS});
}
