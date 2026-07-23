import { getMockPoints } from '~/lib/mock-loyalty.server';

interface GetLoyaltyPointsParams {
  customerId?: string;
  phone?: string;
  email?: string;
  env: any;
  context?: any;
}

/**
 * Fetches real customer loyalty points balance from the external SDLP service,
 * adhering to the backend integration specification:
 * GET ${sdlpAppUrl}/api/storefront/loyalty?shop=${shop}&customerId=${encodeURIComponent(customerId)}
 * 
 * If customerId is not directly provided, attempts to resolve it from the active session or Admin API.
 * If SDLP_APP_URL is not set in env, falls back gracefully to local mock points.
 */
export async function getLoyaltyPoints({
  customerId,
  phone,
  email,
  env,
  context,
}: GetLoyaltyPointsParams): Promise<number> {
  const shop = env?.PUBLIC_STORE_DOMAIN || 'the-beauty-secrets-ksa.myshopify.com';
  const sdlpAppUrl = env?.SDLP_APP_URL;

  // Fallback to local mock if SDLP_APP_URL is not configured
  if (!sdlpAppUrl) {
    const fallbackId = customerId || phone || email || '0501234567';
    return getMockPoints(fallbackId);
  }

  let resolvedCustomerId = customerId;

  // If customerId is missing or is just a raw phone/email, try to resolve official Shopify Customer GID
  if (!resolvedCustomerId || (!resolvedCustomerId.startsWith('gid://') && !/^\d+$/.test(resolvedCustomerId))) {
    // 1. Check if logged in customer session has ID in context
    if (context?.session) {
      try {
        const sessionToken = await context.session.get('customerAccessToken');
        if (sessionToken && context.storefront) {
          const tokenStr = typeof sessionToken === 'string' ? sessionToken : sessionToken.accessToken;
          const { customer } = await context.storefront.query(`
            query getCustomerId($token: String!) {
              customer(customerAccessToken: $token) {
                id
              }
            }
          `, { variables: { token: tokenStr } });
          if (customer?.id) {
            resolvedCustomerId = customer.id;
          }
        }
      } catch (e) {
        console.warn('[Loyalty] Could not resolve customerId via session:', e);
      }
    }

    // 2. Try Customer Account API if available
    if (!resolvedCustomerId && context?.customerAccount) {
      try {
        const isLoggedIn = await context.customerAccount.isLoggedIn();
        if (isLoggedIn) {
          const { data } = await context.customerAccount.query(`
            query getCustomerId {
              customer {
                id
              }
            }
          `);
          if (data?.customer?.id) {
            resolvedCustomerId = data.customer.id;
          }
        }
      } catch (e) {
        console.warn('[Loyalty] Could not resolve customerId via Customer Account API:', e);
      }
    }

    // 3. Try Admin API lookup by phone or email if provided
    if (!resolvedCustomerId && (phone || email || customerId)) {
      const searchTerm = phone || email || customerId;
      try {
        const { getAdminToken } = await import('~/lib/shopify-admin.server');
        const adminToken = await getAdminToken(env);
        if (adminToken && searchTerm) {
          const searchQuery = phone ? `phone:"${phone}"` : email ? `email:"${email}"` : `query:"${searchTerm}"`;
          const adminDomain = env.SHOPIFY_SHOP ? `${env.SHOPIFY_SHOP.replace('.myshopify.com', '')}.myshopify.com` : shop;
          const res = await fetch(
            `https://${adminDomain}/admin/api/2024-01/customers/search.json?query=${encodeURIComponent(searchQuery)}&fields=id`,
            { headers: { 'X-Shopify-Access-Token': adminToken } }
          );
          if (res.ok) {
            const data = (await res.json()) as any;
            if (data.customers?.[0]?.id) {
              resolvedCustomerId = `gid://shopify/Customer/${data.customers[0].id}`;
            }
          }
        }
      } catch (e) {
        console.warn('[Loyalty] Admin customer search failed:', e);
      }
    }
  }

  // If we still don't have a valid customer ID, return 0
  if (!resolvedCustomerId) {
    console.warn('[Loyalty] Unable to resolve customerId for SDLP query.');
    return 0;
  }

  // Fetch points balance from SDLP App external service
  try {
    const endpoint = `${sdlpAppUrl}/api/storefront/loyalty?shop=${encodeURIComponent(shop)}&customerId=${encodeURIComponent(resolvedCustomerId)}`;
    console.log(`[Loyalty] Querying SDLP endpoint: ${endpoint}`);

    const response = await fetch(endpoint);
    if (response.ok) {
      const result = (await response.json()) as any;
      console.log('[Loyalty] SDLP response:', result);
      const balance = result?.balance ?? result?.data?.balance ?? 0;
      return typeof balance === 'number' ? balance : (parseInt(balance, 10) || 0);
    } else {
      console.error(`[Loyalty] Error fetching points: HTTP ${response.status}`, await response.text());
    }
  } catch (error) {
    console.error('[Loyalty] Error fetching points from SDLP App:', error);
  }

  return 0;
}
