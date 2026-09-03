interface LoyaltyParams {
  customerId?: string;
  phone?: string;
  email?: string;
  env: any;
  context?: any;
}

export function formatSaPhone(phone?: string | null): string | null {
  if (!phone) return null;
  const str = String(phone).trim();
  if (str.includes('@') || str.startsWith('gid://')) return null;
  const digits = str.replace(/\D/g, '');
  if (!digits || digits.length < 8) return null;
  if (digits.startsWith('9665') && digits.length === 12) {
    return '0' + digits.substring(3);
  }
  if (digits.startsWith('5') && digits.length === 9) {
    return '0' + digits;
  }
  if (digits.startsWith('05') && digits.length === 10) {
    return digits;
  }
  return digits;
}

/**
 * Resolves the customer's phone number from direct input, session, or Shopify API lookup
 */
export async function resolveCustomerPhone({ customerId, phone, email, env, context }: LoyaltyParams): Promise<string | null> {
  const directPhone = formatSaPhone(phone);
  if (directPhone) return directPhone;

  // 1. Try session loginOtpPhone
  if (context?.session) {
    try {
      const sessionPhone = await context.session.get('loginOtpPhone');
      const formatted = formatSaPhone(sessionPhone);
      if (formatted) return formatted;
    } catch (e) {}
  }

  // 2. Try Storefront session customerAccessToken
  if (context?.session && context?.storefront) {
    try {
      const sessionToken = await context.session.get('customerAccessToken');
      const tokenStr = typeof sessionToken === 'string' ? sessionToken : sessionToken?.accessToken;
      if (tokenStr && tokenStr !== 'dev-bypass-token') {
        const { customer } = await context.storefront.query(
          `#graphql
          query getCustomerPhone($customerAccessToken: String!) {
            customer(customerAccessToken: $customerAccessToken) { id phone email }
          }
          `,
          { variables: { customerAccessToken: tokenStr }, cache: context.storefront.CacheNone() }
        );
        const sfPhone = formatSaPhone(customer?.phone);
        if (sfPhone) return sfPhone;
      }
    } catch (e) {
      console.warn('[Loyalty] Storefront query for customer phone failed:', e);
    }
  }

  // 3. Admin API lookup by customerId or email
  const searchEmail = email || (phone && String(phone).includes('@') ? phone : null) || (context?.session ? await context.session.get('loginCustomerEmail') : null);
  const targetCustomerId = customerId || (phone && String(phone).startsWith('gid://') ? phone : null);

  if (targetCustomerId || searchEmail) {
    try {
      const { getAdminToken, getAdminDomain } = await import('~/lib/shopify-admin.server');
      const adminToken = await getAdminToken(env);
      const adminDomain = getAdminDomain(env);

      if (adminToken && adminDomain) {
        if (targetCustomerId) {
          const numericId = String(targetCustomerId).split('/').pop();
          const res = await fetch(
            `https://${adminDomain}/admin/api/2024-01/customers/${numericId}.json?fields=id,phone,email`,
            { headers: { 'X-Shopify-Access-Token': adminToken, 'Content-Type': 'application/json' } }
          );
          if (res.ok) {
            const data = (await res.json()) as any;
            const p = formatSaPhone(data?.customer?.phone);
            if (p) return p;
          }
        }

        if (searchEmail) {
          const res = await fetch(
            `https://${adminDomain}/admin/api/2024-01/customers/search.json?query=email:"${encodeURIComponent(searchEmail)}"&fields=id,phone,email`,
            { headers: { 'X-Shopify-Access-Token': adminToken, 'Content-Type': 'application/json' } }
          );
          if (res.ok) {
            const data = (await res.json()) as any;
            const found = (data.customers || []).find((c: any) => c.phone);
            const p = formatSaPhone(found?.phone);
            if (p) return p;
          }
        }
      }
    } catch (e) {
      console.warn('[Loyalty] Admin API search for phone failed:', e);
    }
  }

  return null;
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
              /**
               * Exact only. `endsWith(sp.slice(-9))` matched any customer whose
               * number ended in the same nine digits, and this id is what the
               * loyalty balance is then fetched against — so the wrong match
               * showed one customer another's points.
               */
              return cp === sp;
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

const LOYALTY_CACHE = new Map<string, { data: LoyaltyFullInfo; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
/**
 * How stale a cached balance may be when SDLP is unreachable.
 *
 * The outage fallback used to ignore the TTL entirely, so a balance of any
 * age was served for as long as the isolate lived — including points the
 * customer had already spent.
 */
const STALE_CACHE_MAX_MS = 30 * 60 * 1000; // 30 minutes

export async function getLoyaltyFullInfo(
  params: LoyaltyParams,
): Promise<LoyaltyFullInfo | null> {
  const env = params.env;
  const sdlpAppUrl = env?.PUBLIC_SDLP_APP_URL || env?.SDLP_APP_URL || 'https://sdlp.saadeddin.top';
  const shop = env?.PUBLIC_SHOPIFY_STORE_DOMAIN || env?.PUBLIC_STORE_DOMAIN || 'saadeldeenshop-x21xumcd.myshopify.com';

  const resolvedPhone = await resolveCustomerPhone(params);
  const customerId = await getCustomerGid(params);

  if (!resolvedPhone && !customerId) {
    console.warn('[Loyalty] Neither phone nor customerId available for SDLP query.');
    return {balance: 0, amount: 0, enrollmentDate: null};
  }

  const cacheKey = `${resolvedPhone || ''}_${customerId || ''}`.trim();
  const cached = LOYALTY_CACHE.get(cacheKey);

  // Return fresh cache if available
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS) && cached.data.balance > 0) {
    return cached.data;
  }

  try {
    let url = `${sdlpAppUrl}/api/storefront/loyalty?shop=${encodeURIComponent(shop)}`;
    if (resolvedPhone) {
      url += `&phone=${encodeURIComponent(resolvedPhone)}`;
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

        const result: LoyaltyFullInfo = {
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

        // Cache successful response
        LOYALTY_CACHE.set(cacheKey, { data: result, timestamp: Date.now() });

        return result;
      } else {
        console.warn(
          `[SDLP Loyalty] Customer not enrolled or service returned status ${res.status} (attempting cache fallback)`,
        );
      }
    } catch (fetchErr: any) {
      clearTimeout(timeoutId);
      console.warn(
        '[SDLP Loyalty] GET Fetch aborted/failed (attempting cache fallback):',
        fetchErr?.message || fetchErr,
      );
    }
  } catch (err) {
    console.warn('[SDLP Loyalty] GET Exception (attempting cache fallback):', err);
  }

  // If the live query failed, fall back to cache — but only while it is
  // recent enough to still be plausible.
  if (cached && Date.now() - cached.timestamp < STALE_CACHE_MAX_MS) {
    console.log('[SDLP Loyalty] Returning cached loyalty data due to service unavailability.');
    return cached.data;
  }
  if (cached) {
    console.warn(
      '[SDLP Loyalty] Cached loyalty data is too stale to serve; reporting unavailable.',
    );
  }

  /**
   * null, not a zeroed object.
   *
   * This used to return {balance: 0} when SDLP was down, timed out, or had only
   * stale cache. Every caller downstream tests `typeof balance === 'number'` to
   * decide whether the figure is known — and 0 passes that test, so an outage
   * reached the customer as `0 points, SILVER tier`: a confident claim about
   * their account built on a failed request. Returning null lets those callers
   * report it as unavailable, which is what they were written to do.
   */
  return null;
}

/**
 * The customer's balance straight from SDLP, never from cache.
 *
 * Returns null when the balance cannot be established — the caller must
 * treat that as "do not redeem" rather than as zero or as permission to
 * proceed. Redemption must never run against a cached figure: during an
 * SDLP outage the cache is exactly where an already-spent balance lives.
 */
export async function fetchLiveLoyaltyBalance(
  params: LoyaltyParams,
): Promise<number | null> {
  const env = params.env;
  const sdlpAppUrl =
    env?.PUBLIC_SDLP_APP_URL || env?.SDLP_APP_URL || 'https://sdlp.saadeddin.top';
  const shop =
    env?.PUBLIC_SHOPIFY_STORE_DOMAIN ||
    env?.PUBLIC_STORE_DOMAIN ||
    'saadeldeenshop-x21xumcd.myshopify.com';

  const resolvedPhone = await resolveCustomerPhone(params);
  const customerId = await getCustomerGid(params);
  if (!resolvedPhone && !customerId) return null;

  let url = `${sdlpAppUrl}/api/storefront/loyalty?shop=${encodeURIComponent(shop)}`;
  if (resolvedPhone) {
    url += `&phone=${encodeURIComponent(resolvedPhone)}`;
  } else if (customerId) {
    url += `&customerId=${encodeURIComponent(customerId)}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(url, {
      headers: {Accept: 'application/json'},
      signal: controller.signal,
    });
    if (!res.ok) {
      console.error('[Loyalty] Live balance check failed with status', res.status);
      return null;
    }
    const data = (await res.json()) as any;
    const raw =
      data?.data?.points ??
      data?.points ??
      data?.data?.balance ??
      data?.balance;
    const balance = typeof raw === 'number' ? raw : parseFloat(String(raw));
    return Number.isFinite(balance) ? balance : null;
  } catch (err: any) {
    console.error('[Loyalty] Live balance check errored:', err?.message || err);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getLoyaltyPoints(params: LoyaltyParams): Promise<number> {
  const info = await getLoyaltyFullInfo(params);
  // 0 for an unknown balance is wrong, but this helper's signature has no way
  // to say so; callers that must tell them apart use getLoyaltyFullInfo.
  return info?.balance ?? 0;
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
  const resolvedPhone = await resolveCustomerPhone({ customerId, phone, email, env, context });
  if (!resolvedCustomerId && !resolvedPhone) {
    return { success: false, error: 'Customer account not found' };
  }

  const searchPhone = resolvedPhone || (context?.session ? await context.session.get('loginOtpPhone') : null);

  /**
   * --- Step 0: the customer must actually hold these points ---
   *
   * Nothing used to check. `points` arrived from the client and was turned
   * straight into a Shopify discount, so any signed-in customer could ask
   * for a million points and receive a 10,000 SAR code.
   *
   * The balance is read live, never from cache, and an unreadable balance
   * refuses the redemption rather than assuming it is fine.
   */
  const requested = Number(points);
  if (!Number.isFinite(requested) || requested <= 0) {
    return {success: false, error: 'Invalid points amount'};
  }
  if (requested % 100 !== 0) {
    return {success: false, error: 'Points must be redeemed in increments of 100.'};
  }

  const available = await fetchLiveLoyaltyBalance({
    customerId: resolvedCustomerId || customerId,
    phone: resolvedPhone || phone,
    email,
    env,
    context,
  });

  if (available === null) {
    return {
      success: false,
      error: 'Could not verify your points balance. Please try again shortly.',
    };
  }
  if (requested > available) {
    return {
      success: false,
      error: `Insufficient points: ${available} available, ${requested} requested.`,
    };
  }

  // --- Step 1: Create the discount code directly via Shopify Admin REST API ---
  let generatedCode: string;
  // Kept so the rule can be removed again if the deduction does not land.
  let createdPriceRuleId: number | string | null = null;
  let adminCreds: {token: string; domain: string} | null = null;
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
    createdPriceRuleId = priceRuleId;
    adminCreds = {token: adminToken, domain: adminDomain};

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

  /**
   * --- Step 2: deduct the points, or take the discount back ---
   *
   * This used to return success whatever SDLP said, with a comment saying
   * so: the discount was already created, and a failed deduction was only
   * logged. The customer kept both the code and the points, and with SDLP
   * returning intermittent 500s that happened on its own, no attacker
   * needed. Now a deduction that does not confirm deletes the price rule,
   * which invalidates the code, and reports failure.
   */
  const rollbackDiscount = async (reason: string) => {
    console.warn('[Loyalty] Rolling back discount:', reason);
    if (!createdPriceRuleId || !adminCreds) return;
    try {
      await fetch(
        `https://${adminCreds.domain}/admin/api/2024-01/price_rules/${createdPriceRuleId}.json`,
        {method: 'DELETE', headers: {'X-Shopify-Access-Token': adminCreds.token}},
      );
      console.log('[Loyalty] Rolled back price rule', createdPriceRuleId);
    } catch (e: any) {
      // Worth shouting about: a live code exists that nobody paid points for.
      console.error(
        '[Loyalty] ROLLBACK FAILED — unredeemed discount code is live:',
        generatedCode,
        e?.message || e,
      );
    }
  };

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

    // The GET side has always had a timeout; this one did not, so a hanging
    // SDLP held the request open indefinitely.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const resData = (await res.json().catch(() => ({}))) as any;
    console.log('[SDLP Loyalty] POST deduct response:', resData);

    // Invalidate cached loyalty info so the next query fetches updated balance
    const cacheKey = `${searchPhone || ''}_${resolvedCustomerId || ''}`.trim();
    LOYALTY_CACHE.delete(cacheKey);

    if (!res.ok || !resData?.success) {
      await rollbackDiscount(
        `SDLP deduction failed: ${resData?.error || res.status}`,
      );
      return {
        success: false,
        error: 'Could not redeem your points right now. Please try again shortly.',
      };
    }

    return {
      success: true,
      discountCode: generatedCode,
      newBalance: resData?.newBalance,
    };
  } catch (err: any) {
    await rollbackDiscount(`deduct request threw: ${err?.message || err}`);
    return {
      success: false,
      error: 'Could not redeem your points right now. Please try again shortly.',
    };
  }
}

