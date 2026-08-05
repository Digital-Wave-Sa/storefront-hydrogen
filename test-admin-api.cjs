const fs = require('fs');

async function testOAuth() {
  const envFile = fs.readFileSync('.env', 'utf8');
  let domain = 'saadeldeenshop-x21xumcd.myshopify.com';
  let clientId = '';
  let clientSecret = '';

  const idMatch = envFile.match(/SHOPIFY_CLIENT_ID="([^"]+)"/);
  if (idMatch) clientId = idMatch[1];
  
  const secretMatch = envFile.match(/SHOPIFY_CLIENT_SECRET="([^"]+)"/);
  if (secretMatch) clientSecret = secretMatch[1];

  console.log(`Getting token for ${domain}...`);
  try {
    const response = await fetch(`https://${domain}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
      }),
    });
    
    const data = await response.json();
    console.log('OAuth Response:', JSON.stringify(data, null, 2));

    if (data.access_token) {
      const q = 'phone:"%2B962790910041"';
      const searchRes = await fetch(`https://${domain}/admin/api/2024-01/customers/search.json?query=${q}&fields=id,email,phone,first_name,orders_count`, {
        headers: { 'X-Shopify-Access-Token': data.access_token }
      });
      const searchData = await searchRes.json();
      console.log('Search Data:', JSON.stringify(searchData, null, 2));
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

testOAuth();
