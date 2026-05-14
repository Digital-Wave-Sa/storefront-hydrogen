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

  const rawShop = env.SHOPIFY_SHOP || env.PUBLIC_STORE_DOMAIN || '';
  let shopDomain = rawShop;
  
  if (!shopDomain.includes('myshopify.com')) {
    const handle = shopDomain.replace(/^https?:\/\//, '').split('.')[0];
    shopDomain = `${handle}.myshopify.com`;
  }
  
  // 1. Try Primary Admin API tokens first
  const adminToken = env.SHOPIFY_ADMIN_API_ACCESS_TOKEN || (env as any).SHOPIFY_ADMIN_API_ACCESS_TOKENS;
  if (adminToken) {
    cachedToken = adminToken;
    return adminToken;
  }

  // 2. Try Review token as secondary
  if (env.REVIEWS_ADMIN_API_TOKEN) {
    const token = env.REVIEWS_ADMIN_API_TOKEN;
    cachedToken = token;
    return token;
  }
  
  // 3. Try Private Storefront token as last resort
  if (env.PRIVATE_STOREFRONT_API_TOKEN) {
    cachedToken = env.PRIVATE_STOREFRONT_API_TOKEN;
    return env.PRIVATE_STOREFRONT_API_TOKEN;
  }
  const clientId = env.SHOPIFY_CLIENT_ID || env.SHOPIFY_ADMIN_CLIENT_ID;
  const clientSecret = env.SHOPIFY_CLIENT_SECRET || env.SHOPIFY_ADMIN_CLIENT_SECRET;

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
      console.error(`[ADMIN AUTH] Critical Error: Shopify returned HTML instead of JSON. Check your SHOPIFY_SHOP domain.`);
      throw new Error('Invalid JSON response from Shopify');
    }

    if (data.error) {
      console.error('[ADMIN AUTH] Exchange Failed:', data.error, data.error_description);
      throw new Error(`Shopify Auth Error: ${data.error_description || data.error}`);
    }

    cachedToken = data.access_token;
    tokenExpiry = currentTime + data.expires_in;

    return cachedToken!;
  } catch (error: any) {
    console.error('[ADMIN AUTH] Failed to obtain access token:', error.message);
    throw error;
  }
}
