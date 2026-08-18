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
          `https://${adminDomain}/admin/api/2024-01/customers/search.json?query=${encodeURIComponent(query)}&fields=id,phone,email`,
          { headers: { 'X-Shopify-Access-Token': adminToken, 'Content-Type': 'application/json' } }
        );
        if (res.ok) {
          const data = (await res.json()) as any;
          const found = (data.customers || []).find((c: any) => {
            if (searchPhone) {
              const cp = (c.phone || '').replace(/\D/g, '');
              const sp = searchPhone.replace(/\D/g, '');
              if (!cp || !sp) return false;
              return cp === sp || cp.endsWith(sp.slice(-9));
            } else if (searchEmail) {
              return c.email && c.email.toLowerCase() === searchEmail.toLowerCase();
            }
            return false;
          });
          if (found?.id) {
            return `gid://shopify/Customer/${found.id}`;
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
export interface LoyaltyFullInfo {
  balance: number;
  amount: number;
  enrollmentDate: string | null;
  tierName?: string | null;
  tierStatus?: string | null;
  daysRemaining?: number | null;
  endDate?: string | null;
  fallbackTier?: string | null;
  customer?: {
    account?: string;
    name?: string;
    group?: string;
  } | null;
  activity?: {
    purchaseCount?: number;
    firstPurchaseDate?: string;
    lastPurchaseDate?: string;
    lastEarnDate?: string;
    cardCreatedDate?: string;
  } | null;
  expiry?: {
    nextExpireDate?: string;
    nextExpireAmount?: number;
  } | null;
  purchaseAmounts?: {
    last30Days?: number;
    last3Months?: number;
    last6Months?: number;
    lastYear?: number;
  } | null;
}

export async function getLoyaltyFullInfo(params: LoyaltyParams): Promise<LoyaltyFullInfo> {
  const env = params.env;
  const sdlpAppUrl = env?.PUBLIC_SDLP_APP_URL || env?.SDLP_APP_URL || 'https://sdlp.saadeddin.top';
  const shop = env?.PUBLIC_SHOPIFY_STORE_DOMAIN || env?.PUBLIC_STORE_DOMAIN || 'saadeldeenshop-x21xumcd.myshopify.com';

  const searchPhone = params.phone || (params.context?.session ? await params.context.session.get('loginOtpPhone') : null);
  const customerId = await getCustomerGid(params);

  if (!customerId && !searchPhone) {
    console.warn('[Loyalty] Neither customerId nor searchPhone available for SDLP query.');
    return {balance: 0, amount: 0, enrollmentDate: null};
  }

  try {
    let url = `${sdlpAppUrl}/api/storefront/loyalty?shop=${encodeURIComponent(shop)}`;
    if (searchPhone) {
      url += `&phone=${encodeURIComponent(searchPhone)}`;
    } else if (customerId) {
      url += `&customerId=${encodeURIComponent(customerId)}`;
    }
    console.log('[SDLP Loyalty] GET Request:', url);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = (await res.json()) as any;
        console.log('[SDLP Loyalty] GET Response:', data);

        const rawPoints =
          data?.data?.points ??
          data?.points ??
          data?.data?.balance ??
          data?.balance ??
          0;
        const balance = typeof rawPoints === 'number' ? rawPoints : (parseFloat(rawPoints) || 0);
        const rawAmount = data?.data?.amount ?? data?.amount;
        const amount = typeof rawAmount === 'number' ? rawAmount : (parseFloat(rawAmount) || (balance * 0.01));

        const enrollmentDate =
          data?.data?.activity?.card_created_date ||
          data?.data?.activity?.first_purchase_date ||
          data?.data?.enrollmentDate ||
          data?.enrollmentDate ||
          data?.createdAt ||
          data?.customer?.createdtime ||
          null;

        const tierObj = data?.data?.tier || data?.tier;
        const customerObj = data?.data?.customer || data?.customer;
        const activityObj = data?.data?.activity || data?.activity;
        const expiryObj = data?.data?.expiry || data?.expiry;
        const purchaseAmountsObj = data?.data?.purchase_amounts || data?.purchase_amounts;

        return {
          balance,
          amount,
          enrollmentDate,
          tierName: tierObj?.name || null,
          tierStatus: tierObj?.status || null,
          daysRemaining: tierObj?.days_remaining || null,
          endDate: tierObj?.end_date || null,
          fallbackTier: tierObj?.fallback_tier || null,
          customer: customerObj
            ? {
                account: customerObj.account,
                name: customerObj.name,
                group: customerObj.group,
              }
            : null,
          activity: activityObj
            ? {
                purchaseCount: activityObj.purchase_count,
                firstPurchaseDate: activityObj.first_purchase_date,
                lastPurchaseDate: activityObj.last_purchase_date,
                lastEarnDate: activityObj.last_earn_date,
                cardCreatedDate: activityObj.card_created_date,
              }
            : null,
          expiry: expiryObj
            ? {
                nextExpireDate: expiryObj.next_expire_date,
                nextExpireAmount: expiryObj.next_expire_amount,
              }
            : null,
          purchaseAmounts: purchaseAmountsObj
            ? {
                last30Days: purchaseAmountsObj.last_30_days,
                last3Months: purchaseAmountsObj.last_3_months,
                last6Months: purchaseAmountsObj.last_6_months,
                lastYear: purchaseAmountsObj.last_year,
              }
            : null,
        };
      } else {
        console.warn(
          `[SDLP Loyalty] Customer not enrolled or service returned status ${res.status} (defaulting to 0 points)`,
        );
      }
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      console.warn(
        '[SDLP Loyalty] GET Fetch aborted/failed (timing out gracefully):',
        fetchErr?.message || fetchErr,
      );
    }
  } catch (err) {
    console.warn('[SDLP Loyalty] GET Exception (defaulting to 0 points):', err);
  }

  return {balance: 0, amount: 0, enrollmentDate: null};
}

export async function getLoyaltyPoints(params: LoyaltyParams): Promise<number> {
  const info = await getLoyaltyFullInfo(params);
  return info.balance;
}

/**
 * Creates a Shopify discount code directly via Admin REST API and then
 * notifies SDLP to deduct the loyalty points.
 *
 * This bypasses the broken `discountCodeBasicCreate` GraphQL mutation in SDLP
 * which references a non-existent `discountNode` field.
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

  // --- Step 1: Create the discount code directly via Shopify Admin REST API ---
  let generatedCode: string;
  try {
    const { getAdminToken, getAdminDomain } = await import('~/lib/shopify-admin.server');
    const adminToken = await getAdminToken(env);
    const adminDomain = getAdminDomain(env);

    if (!adminToken || !adminDomain) {
      throw new Error('Missing Shopify admin credentials');
    }

    // Generate a unique code: LOYAL-{6 random alphanumeric}-{points}
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    const code = `LOYAL-${rand}-${points}`;

    // The discount value: 1 point = 0.01 SAR
    const discountAmount = (points * 0.01).toFixed(2);

    // Create a price rule (fixed amount, once per order, no minimum)
    const priceRuleRes = await fetch(
      `https://${adminDomain}/admin/api/2024-01/price_rules.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': adminToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price_rule: {
            title: `Loyalty Points Redemption - ${points} pts`,
            target_type: 'line_item',
            target_selection: 'all',
            allocation_method: 'across',
            value_type: 'fixed_amount',
            value: `-${discountAmount}`,
            customer_selection: 'all',
            starts_at: new Date().toISOString(),
            usage_limit: 1,
            once_per_customer: true,
          },
        }),
      },
    );

    const priceRuleJson = (await priceRuleRes.json()) as any;
    console.log('[Loyalty] Price rule response:', priceRuleJson);

    if (!priceRuleJson?.price_rule?.id) {
      throw new Error(priceRuleJson?.errors ? JSON.stringify(priceRuleJson.errors) : 'Failed to create price rule');
    }

    const priceRuleId = priceRuleJson.price_rule.id;

    // Create the discount code under the price rule
    const codeRes = await fetch(
      `https://${adminDomain}/admin/api/2024-01/price_rules/${priceRuleId}/discount_codes.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': adminToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ discount_code: { code } }),
      },
    );

    const codeJson = (await codeRes.json()) as any;
    console.log('[Loyalty] Discount code response:', codeJson);

    if (!codeJson?.discount_code?.code) {
      throw new Error(codeJson?.errors ? JSON.stringify(codeJson.errors) : 'Failed to create discount code');
    }

    generatedCode = codeJson.discount_code.code;
    console.log('[Loyalty] Created discount code:', generatedCode, 'for', discountAmount, 'SAR');
  } catch (err: any) {
    console.error('[Loyalty] Failed to create Shopify discount:', err);
    return { success: false, error: err?.message || 'Failed to create discount code' };
  }

  // --- Step 2: Notify SDLP to deduct the points ---
  try {
    const url = `${sdlpAppUrl}/api/storefront/loyalty`;
    const payload: any = {
      shop,
      customerId: resolvedCustomerId,
      points: Number(points),
      discountCode: generatedCode, // Pass the already-created code so SDLP doesn't need to create it
    };
    if (searchPhone) payload.phone = searchPhone;

    console.log('[SDLP Loyalty] POST deduct request:', url, payload);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });

    const resData = (await res.json()) as any;
    console.log('[SDLP Loyalty] POST deduct response:', resData);

    // Return success regardless of SDLP response — the discount is already created in Shopify.
    // If SDLP fails to deduct, log it but don't block the user.
    if (!res.ok || !resData?.success) {
      console.warn('[SDLP Loyalty] Points deduction may have failed:', resData?.error);
    }

    return {
      success: true,
      discountCode: generatedCode,
      newBalance: resData?.newBalance,
    };
  } catch (err: any) {
    // Even if SDLP call fails, the Shopify discount is already created — return success.
    console.error('[SDLP Loyalty] Deduct POST failed (discount already created):', err);
    return { success: true, discountCode: generatedCode };
  }
}

