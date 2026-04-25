const https = require('https');

const data = JSON.stringify({
  query: `{ collections(first: 20) { nodes { handle title } } }`
});

const options = {
  hostname: 'the-beauty-secrets-ksa.myshopify.com',
  port: 443,
  path: '/api/2024-01/graphql.json',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Shopify-Storefront-Access-Token': '10f4477edb7e01c431e8cc461ce3c38b',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (d) => { body += d; });
  res.on('end', () => {
    console.log(body);
  });
});

req.on('error', (e) => {
  console.error(e);
});

req.write(data);
req.end();
