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

/**
 * What Shopify knows about a discount code, which the cart cannot tell alone.
 *
 * `cartDiscountCodesUpdate` answers 200 for a code that does not exist and
 * keeps it on the cart with `applicable: false` -- the identical shape to a
 * real code whose conditions the cart has not met yet. So «KJGJHGJ» and a
 * genuine product-scoped code were indistinguishable, and the cart told a
 * shopper who had typed nonsense that it was saved and would apply later.
 *
 * `codeDiscountNodeByCode` separates them: null for a code that was never
 * created, otherwise the discount with its status.
 *
 * `known: false` -- Shopify has no such code.
 * `known: true, expired` -- it exists; whether it is past its end date or
 *   otherwise not active.
 * `null` -- the question could not be asked. Callers must fail open on this
 *   and leave the code alone rather than reject something possibly valid.
 */
export type DiscountCodeLookup =
  | {known: false}
  | {known: true; expired: boolean; title: string}
  | null;

export async function lookupDiscountCode(
  env: any,
  code: string,
): Promise<DiscountCodeLookup> {
  const submitted = String(code || '').trim();
  if (!submitted) return null;

  try {
    const domain = getAdminDomain(env);
    // getAdminToken throws when credentials are missing; caught below.
    const token = await getAdminToken(env);
    if (!domain || !token) return null;

    const res = await fetch(`https://${domain}/admin/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify({
        query: `#graphql
          query LookupDiscountCode($code: String!) {
            codeDiscountNodeByCode(code: $code) {
              id
              codeDiscount {
                __typename
                ... on DiscountCodeBasic { title status endsAt }
                ... on DiscountCodeBxgy { title status endsAt }
                ... on DiscountCodeFreeShipping { title status endsAt }
              }
            }
          }`,
        variables: {code: submitted},
      }),
    });

    if (!res.ok) {
      console.warn(
        `[ShopifyAdmin] Discount lookup for "${submitted}" answered ${res.status}; leaving the code alone.`,
      );
      return null;
    }

    const body: any = await res.json();

    /**
     * A GraphQL error is not an answer. Returning `known: false` here would
     * strip a valid code off a shopper's cart because a query failed.
     */
    if (body?.errors?.length) {
      console.warn(
        '[ShopifyAdmin] Discount lookup returned errors; leaving the code alone:',
        JSON.stringify(body.errors),
      );
      return null;
    }

    const node = body?.data?.codeDiscountNodeByCode;
    if (!node) return {known: false};

    const discount = node.codeDiscount || {};
    const status = String(discount.status || '').toUpperCase();
    const endsAt = discount.endsAt ? Date.parse(discount.endsAt) : NaN;

    /**
     * `status` already reads EXPIRED once Shopify has caught up, but it lags
     * the end date by a little, so the date is checked too.
     */
    const expired =
      status === 'EXPIRED' ||
      (Number.isFinite(endsAt) && endsAt < Date.now());

    return {known: true, expired, title: discount.title || submitted};
  } catch (e: any) {
    console.warn(
      `[ShopifyAdmin] Could not verify discount code "${submitted}":`,
      e?.message || e,
    );
    return null;
  }
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
