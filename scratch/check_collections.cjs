
const fetch = require('node-fetch');
require('dotenv').config();

async function checkCollections() {
  const response = await fetch(`https://${process.env.PUBLIC_STORE_DOMAIN}/api/2024-01/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': process.env.PRIVATE_STOREFRONT_API_TOKEN || '',
    },
    body: JSON.stringify({
      query: `
        query {
          collections(first: 20) {
            nodes {
              id
              title
              handle
              tags: metafield(namespace: "custom", key: "tags") {
                value
              }
            }
          }
        }
      `
    })
  });
  const json = await response.json();
  console.log(JSON.stringify(json, null, 2));
}

checkCollections();
