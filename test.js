const fs = require('fs');

async function test() {
  const query = `
  query CatalogSearch(
    $query: String!
    $first: Int
  ) {
    search(
      query: $query, 
      first: $first, 
      types: [PRODUCT]
    ) {
      nodes {
        ...on Product {
           id
        }
      }
    }
  }
  `;

  try {
    const res = await fetch('http://localhost:3000/api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: query,
        variables: { query: "*", first: 5 }
      })
    });
    const text = await res.text();
    console.log(text);
  } catch (e) {
    console.error(e);
  }
}
test();
