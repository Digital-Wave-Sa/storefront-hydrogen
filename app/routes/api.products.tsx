import {data, type LoaderFunctionArgs} from 'react-router';

export async function loader({request, context}: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const idsParam = url.searchParams.get('ids');
  if (!idsParam) return data({products: []});

  const ids = idsParam.split(',').map((id) => id.trim()).filter(Boolean);
  if (ids.length === 0) return data({products: []});

  const formattedGids = ids.map((id) =>
    id.startsWith('gid://') ? id : `gid://shopify/Product/${id}`,
  );

  try {
    const query = `#graphql
      query getProductsForWishlist($ids: [ID!]!, $country: CountryCode, $language: LanguageCode) @inContext(country: $country, language: $language) {
        nodes(ids: $ids) {
          ... on Product {
            id
            title
            handle
            availableForSale
            featuredImage {
              id
              altText
              url
              width
              height
            }
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
              maxVariantPrice {
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
            visibility_start: metafield(namespace: "custom", key: "visibility_start") {
              value
            }
            visibility_end: metafield(namespace: "custom", key: "visibility_end") {
              value
            }
            variants(first: 10) {
              nodes {
                id
                title
                availableForSale
                quantityAvailable
                selectedOptions {
                  name
                  value
                }
                price {
                  amount
                  currencyCode
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
    `;

    const language = context.storefront.i18n.language;
    const country = context.storefront.i18n.country;

    const result = (await context.storefront.query(query as any, {
      variables: {ids: formattedGids, country, language},
      cache: context.storefront.CacheNone(),
    })) as any;

    const products = (result?.nodes || []).filter((p: any) => p && p.id);
    return data({products});
  } catch (e: any) {
    console.error('[API PRODUCTS LOADER ERROR]:', e.message || e);
    return data({products: []});
  }
}
