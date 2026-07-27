import { GraphQLClient } from 'graphql-request';

const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN;
const accessToken = process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;

export const shopifyClient = new GraphQLClient(
  `https://${shopifyDomain}/api/2024-01/graphql.json`,
  {
    headers: {
      'X-Shopify-Storefront-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
  }
);

// Example query to fetch products
export const GET_PRODUCTS = `
  query GetProducts($first: Int!) {
    products(first: $first) {
      edges {
        node {
          id
          title
          description
          handle
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          images(first: 1) {
            edges {
              node {
                url
                altText
              }
            }
          }
        }
      }
    }
  }
`;

export async function fetchProducts(first: number = 12) {
  try {
    const data = await shopifyClient.request(GET_PRODUCTS, { first });
    return data;
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
}