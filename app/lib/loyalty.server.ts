interface LoyaltyParams {
  customerId?: string;
  phone?: string;
  email?: string;
  env: any;
  context?: any;
}

/**
 * Resolves full Shopify Customer GID (e.g., gid://shopify/Customer/108701679849)
 */
export async function getCustomerGid({ customerId, phone, email, env, context }: LoyaltyParams): Promise<string | null> {
  // 1. If customerId is already a full GID
  if (customerId && customerId.startsWith('gid://shopify/Customer/')) {
    return customerId;
  }
  // 2. If customerId is numeric string
  if (customerId && /^\d+$/.test(customerId)) {
    return `gid://shopify/Customer/${customerId}`;
  }

  // 3. Try Storefront session customerAccessToken
  if (context?.session && context?.storefront) {
    try {
      const sessionToken = await context.session.get('customerAccessToken');
      const tokenStr = typeof sessionToken === 'string' ? sessionToken : sessionToken?.accessToken;
      if (tokenStr && tokenStr !== 'dev-bypass-token') {
        const { customer } = await context.storefront.query(
          `#graphql
          query getCustomerGid($customerAccessToken: String!) {
            customer(customerAccessToken: $customerAccessToken) { id }
          }
          `,
          { variables: { customerAccessToken: tokenStr }, cache: context.storefront.CacheNone() }
        );
        if (customer?.id) return customer.id;
      }
    } catch (e) {
      console.warn('[Loyalty] Storefront query for customer GID failed:', e);
    }
  }

  // 4. Check session loginCustomerId
  if (context?.session) {
    try {
      const savedCustomerId = await context.session.get('loginCustomerId');
      if (savedCustomerId) {
        return savedCustomerId.startsWith('gid://') ? savedCustomerId : `gid://shopify/Customer/${savedCustomerId}`;
      }
    } catch (e) {}
  }

  // 5. Admin API search by phone or email
  const searchPhone = phone || (context?.session ? await context.session.get('loginOtpPhone') : null);
  const searchEmail = email || (context?.session ? await context.session.get('loginOtpEmail') : null);

  if (searchPhone || searchEmail) {
    try {
      const { getAdminToken, getAdminDomain } = await import('~/lib/shopify-admin.server');
      const adminToken = await getAdminToken(env);
      const adminDomain = getAdminDomain(env);
      const query = searchPhone ? `phone:"${searchPhone}"` : `email:"${searchEmail}"`;

      if (adminToken && adminDomain) {
        const res = await fetch(
          `https://${adminDomain}/admin/api/2024-01/customers/search.json?query=${encodeURIComponent(query)}&fields=id`,
          { headers: { 'X-Shopify-Access-Token': adminToken, 'Content-Type': 'application/json' } }
        );
        if (res.ok) {
          const data = (await res.json()) as any;
          if (data.customers?.[0]?.id) {
            return `gid://shopify/Customer/${data.customers[0].id}`;
          }
        }
      }
    } catch (e) {
      console.warn('[Loyalty] Admin API search failed:', e);
    }
  }

  return null;
}

/**
 * GET /api/storefront/loyalty
 * Specification: GET ${sdlpAppUrl}/api/storefront/loyalty?shop=${shop}&customerId=${customerId}
 * NO fallback points if 0 or error.
 */
export async function getLoyaltyPoints(params: LoyaltyParams): Promise<number> {
  const env = params.env;
  const sdlpAppUrl = env?.PUBLIC_SDLP_APP_URL || env?.SDLP_APP_URL || 'https://sdlp.saadeddin.top';
  const shop = env?.PUBLIC_SHOPIFY_STORE_DOMAIN || env?.PUBLIC_STORE_DOMAIN || 'saadeldeenshop-x21xumcd.myshopify.com';

  const searchPhone = params.phone || (params.context?.session ? await params.context.session.get('loginOtpPhone') : null);
  const customerId = await getCustomerGid(params);

  if (!customerId && !searchPhone) {
    console.warn('[Loyalty] Neither customerId nor searchPhone available for SDLP query.');
    return 0;
  }

  try {
    let url = `${sdlpAppUrl}/api/storefront/loyalty?shop=${encodeURIComponent(shop)}`;
    if (searchPhone) {
      url += `&phone=${encodeURIComponent(searchPhone)}`;
    }
    if (customerId) {
      url += `&customerId=${encodeURIComponent(customerId)}`;
    }
    console.log('[SDLP Loyalty] GET Request:', url);

    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (res.ok) {
      const data = (await res.json()) as any;
      console.log('[SDLP Loyalty] GET Response:', data);
      const balance = data?.balance ?? data?.data?.balance ?? 0;
      return typeof balance === 'number' ? balance : (parseInt(balance, 10) || 0);
    } else {
      console.error('[SDLP Loyalty] GET Error status:', res.status, await res.text());
    }
  } catch (err) {
    console.error('[SDLP Loyalty] GET Exception:', err);
  }

  return 0;
}

/**
 * POST /api/storefront/loyalty
 * Specification:
 * Headers: Content-Type: application/json
 * Body: { "shop": shop, "customerId": customerId, "points": points }
 * Returns: { "success": true, "discountCode": "LOYAL-K3M9XQ-200", "newBalance": 1300 }
 */
export async function redeemLoyaltyPoints({
  customerId,
  points,
  phone,
  email,
  env,
  context,
}: LoyaltyParams & { points: number }): Promise<{ success: boolean; discountCode?: string; newBalance?: number; error?: string }> {
  const sdlpAppUrl = env?.PUBLIC_SDLP_APP_URL || env?.SDLP_APP_URL || 'https://sdlp.saadeddin.top';
  const shop = env?.PUBLIC_SHOPIFY_STORE_DOMAIN || env?.PUBLIC_STORE_DOMAIN || 'saadeldeenshop-x21xumcd.myshopify.com';

  const resolvedCustomerId = await getCustomerGid({ customerId, phone, email, env, context });
  if (!resolvedCustomerId) {
    return { success: false, error: 'Customer account not found' };
  }

  const searchPhone = phone || (context?.session ? await context.session.get('loginOtpPhone') : null);

  try {
    const url = `${sdlpAppUrl}/api/storefront/loyalty`;
    const payload = {
      shop,
      customerId: resolvedCustomerId,
      phone: searchPhone || undefined,
      points: Number(points),
    };
    console.log('[SDLP Loyalty] POST Request:', url, payload);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = (await res.json()) as any;
    console.log('[SDLP Loyalty] POST Response:', data);

    if (res.ok && data?.success) {
      return {
        success: true,
        discountCode: data.discountCode,
        newBalance: data.newBalance,
      };
    } else {
      return {
        success: false,
        error: data?.error || 'Failed to redeem loyalty points',
      };
    }
  } catch (err: any) {
    console.error('[SDLP Loyalty] POST Exception:', err);
    return { success: false, error: err?.message || 'Network request failed' };
  }
}
