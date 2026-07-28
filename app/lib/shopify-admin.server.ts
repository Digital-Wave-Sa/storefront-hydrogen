/**
 * Utility to handle Shopify Admin API authentication and domain resolution.
 * SHOPIFY_ADMIN_DOMAIN must be set to the correct myshopify.com domain (not the Hydrogen x21kumcd domain).
 * e.g. saadeldeenshop-x21xumcd.myshopify.com
 */

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

/**
 * Returns the correct Shopify Admin API domain.
 * Priority: SHOPIFY_ADMIN_DOMAIN > SHOPIFY_SHOP (as handle) > fallback
 */
export function getAdminDomain(env: any): string {
  // 1. Explicit admin domain takes highest priority
  if (env.SHOPIFY_ADMIN_DOMAIN) {
    const d = env.SHOPIFY_ADMIN_DOMAIN.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return d.includes('myshopify.com') ? d : `${d}.myshopify.com`;
  }

  // 2. SHOPIFY_SHOP is store handle or myshopify domain
  if (env.SHOPIFY_SHOP) {
    const rawShop = env.SHOPIFY_SHOP.replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (rawShop.includes('myshopify.com')) {
      return rawShop;
    }
    return `${rawShop.split('.')[0]}.myshopify.com`;
  }

  // 3. PUBLIC_STORE_DOMAIN if it contains myshopify.com (and not Oxygen .o2.myshopify.dev)
  if (env.PUBLIC_STORE_DOMAIN && env.PUBLIC_STORE_DOMAIN.includes('myshopify.com') && !env.PUBLIC_STORE_DOMAIN.includes('.o2.')) {
    return env.PUBLIC_STORE_DOMAIN;
  }

  // Fallback domain for Saadeddin store Admin API calls
  return 'saaddeenshop-x21xumcd.myshopify.com';
}

export async function getAdminToken(env: any): Promise<string> {
  const currentTime = Math.floor(Date.now() / 1000);

  // Return cached token if it's still valid (with a 5-minute buffer)
  if (cachedToken && currentTime < tokenExpiry - 300) {
    return cachedToken;
  }

  // 1. Try static Admin API token first (fastest path)
  const adminToken = env.SHOPIFY_ADMIN_API_ACCESS_TOKEN || (env as any).SHOPIFY_ADMIN_API_ACCESS_TOKENS;
  if (adminToken) {
    cachedToken = adminToken;
    tokenExpiry = currentTime + 86400; // Assume 24h validity for static tokens
    return adminToken;
  }

  // 2. Try exchange via client credentials
  const shopDomain = getAdminDomain(env);
  const clientId = env.SHOPIFY_CLIENT_ID || env.SHOPIFY_ADMIN_CLIENT_ID;
  const clientSecret = env.SHOPIFY_CLIENT_SECRET || env.SHOPIFY_ADMIN_CLIENT_SECRET;

  if (!clientId || !clientSecret || !shopDomain) {
    console.warn(`[ShopifyAdmin] Missing credentials. Shop=${shopDomain}, ID=${!!clientId}, Secret=${!!clientSecret}`);
    return null;
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
    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error(`[ShopifyAdmin] Shopify returned non-JSON. Check SHOPIFY_ADMIN_DOMAIN.`);
      throw new Error('Invalid JSON response from Shopify');
    }

    if (data.error) {
      console.error('[ShopifyAdmin] Token exchange failed:', data.error, data.error_description);
      throw new Error(`Shopify Auth Error: ${data.error_description || data.error}`);
    }

    cachedToken = data.access_token;
    tokenExpiry = currentTime + (data.expires_in || 86400);

    return cachedToken!;
  } catch (error: any) {
    console.error('[ShopifyAdmin] Failed to obtain access token:', error.message);
    throw error;
  }
}
