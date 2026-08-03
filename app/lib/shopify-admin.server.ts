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

  // 2. SHOPIFY_SHOP is just the store handle (e.g. "saadeldeenshop-x21xumcd")
  if (env.SHOPIFY_SHOP && !env.SHOPIFY_SHOP.includes('x21kumcd')) {
    const handle = env.SHOPIFY_SHOP.replace(/^https?:\/\//, '').split('.')[0];
    return `${handle}.myshopify.com`;
  }

  // 3. PUBLIC_STORE_DOMAIN — strip the x21kumcd subdomain to get the real admin domain
  // e.g. saadeldeen-shop.x21kumcd.myshopify.com → NOT usable for Admin API
  // We can't derive the admin domain from this — log a warning
  console.warn('[ShopifyAdmin] SHOPIFY_ADMIN_DOMAIN is not set. Admin API calls may fail. Set SHOPIFY_ADMIN_DOMAIN=saadeldeenshop-x21xumcd.myshopify.com in your environment.');
  return env.PUBLIC_STORE_DOMAIN || '';
}

export async function getAdminToken(env: any): Promise<string> {
  const currentTime = Math.floor(Date.now() / 1000);

  // Return cached token if it's still valid (with a 5-minute buffer)
  if (cachedToken && currentTime < tokenExpiry - 300) {
    return cachedToken;
  }

  // 1. Try exchange via client credentials
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
