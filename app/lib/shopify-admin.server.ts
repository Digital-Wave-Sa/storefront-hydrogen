/**
 * Utility to handle Shopify Admin API authentication using Client Credentials (Dev Dashboard).
 * Tokens are valid for 24 hours and must be exchanged programmatically.
 */

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

export async function getAdminToken(env: any): Promise<string> {
  const currentTime = Math.floor(Date.now() / 1000);

  // Return cached token if it's still valid (with a 5-minute buffer)
  if (cachedToken && currentTime < tokenExpiry - 300) {
    return cachedToken;
  }

  // Priority fallback: check common env variables that might hold the admin token
  const potentialTokens = [
    env.SHOPIFY_ADMIN_API_ACCESS_TOKEN,
    env.PRIVATE_STOREFRONT_API_TOKEN
  ];

  for (const token of potentialTokens) {
    if (token && typeof token === 'string' && token.startsWith('shpat_')) {
      return token;
    }
  }

  // Priority: 1. SHOPIFY_SHOP, 2. PUBLIC_STORE_DOMAIN, 3. Guess from env
  const rawShop = env.SHOPIFY_SHOP || env.PUBLIC_STORE_DOMAIN || '';
  const shopDomain = rawShop.includes('.') ? rawShop : `${rawShop}.myshopify.com`;
  const clientId = env.SHOPIFY_CLIENT_ID || env.SHOPIFY_ADMIN_CLIENT_ID;
  const clientSecret = env.SHOPIFY_CLIENT_SECRET || env.SHOPIFY_ADMIN_CLIENT_SECRET;

  console.log('[ADMIN AUTH] Login attempt for:', shopDomain, 'using ID:', clientId?.substring(0, 5));

  if (!clientId || !clientSecret || !rawShop) {
    throw new Error(`Missing credentials. Found: Shop=${rawShop}, ID=${!!clientId}, Secret=${!!clientSecret}`);
  }

  try {
    const response = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
      }),
    });

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error(`[ADMIN AUTH] Critical Error: Shopify returned HTML instead of JSON. Check your SHOPIFY_SHOP domain. Raw response: ${responseText.substring(0, 100)}...`);
      throw new Error('Invalid JSON response from Shopify');
    }

    if (data.error) {
      console.error('[ADMIN AUTH] Exchange Failed:', data.error, data.error_description);
      throw new Error(`Shopify Auth Error: ${data.error_description || data.error}`);
    }

    cachedToken = data.access_token;
    tokenExpiry = currentTime + data.expires_in;

    console.log('[ADMIN AUTH] SUCCESS! New token cached.');
    
    return cachedToken!;
  } catch (error: any) {
    console.error('[ADMIN AUTH] Failed to obtain access token:', error.message);
    throw error;
  }
}
