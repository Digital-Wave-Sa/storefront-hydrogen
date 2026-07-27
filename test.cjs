const fetch = require('node-fetch');

async function test() {
  const query = `
  query CatalogSearch(
    $query: String!
    $first: Int
    $sortKey: SearchSortKeys
  ) {
    search(
      query: $query, 
      first: $first, 
      types: [PRODUCT],
      sortKey: $sortKey
    ) {
      productFilters {
        id
        label
        type
        values {
          id
          label
          count
          input
        }
      }
      nodes {
        ...on Product {
           id
        }
      }
    }
  }
  `;

  try {
    const res = await fetch('https://the-beauty-secrets-ksa.myshopify.com/api/2024-01/graphql.json', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': '10f4477edb7e01c431e8cc461ce3c38b'
      },
      body: JSON.stringify({
        query: `
        query {
          collection(handle: "beliva-gloire") {
            products(first: 10) {
              nodes {
                title
              }
            }
          }
        }
        `
      })
    });
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
  } catch (e) {
    console.error(e);
  }
}
test();
