fetch('https://hydrogen-preview.myshopify.com/api/2023-04/graphql.json', {
  method: 'POST',
  headers: {
    'X-Shopify-Storefront-Access-Token': '3b580e70970c4528da70c98e097c2fa0',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: `
      query {
        __type(name: "CartLine") {
          fields {
            name
            type {
              name
              kind
              ofType {
                name
                kind
              }
            }
          }
        }
      }
    `
  })
}).then(r => r.json()).then(data => console.log(JSON.stringify(data, null, 2)));
