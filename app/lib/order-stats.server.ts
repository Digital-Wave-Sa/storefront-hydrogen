/**
 * Lifetime order count and spend for one customer.
 *
 * The account dashboard used to derive both from whatever orders it happened
 * to fetch, so the tiles read "50 Orders" — the REST page size — for a customer
 * with 104, and the spend was the sum of that same page. Preferring the
 * Storefront API's `numberOfOrders` is not the fix either: it reported 10 for
 * the same customer, because it counts only a subset of order states.
 *
 * The number a shopper can check is the one their own orders list shows, and
 * that list counts `customer_id:<id>` across open, closed and cancelled orders.
 * This module runs exactly that query so the dashboard and the orders page can
 * never disagree.
 *
 * Cancelled and refunded orders are counted but not spent — they appear in the
 * list, so leaving them out of the count would look like a miscount, but they
 * are not money the customer parted with.
 */

const ADMIN_API_VERSION = '2024-01';

/** Matches account.orders._index.tsx — Shopify omits closed orders otherwise. */
const ORDER_STATUS_SCOPE =
  '(status:open OR status:closed OR status:cancelled)';

/** Most orders we will count over; beyond this the figures are marked capped. */
const ORDER_CAP = 250;

const TTL_MS = 60 * 1000;

export interface CustomerOrderStats {
  orderCount: number;
  totalSpent: number;
  /** True when the customer has at least ORDER_CAP orders, so both are floors. */
  capped: boolean;
}

const statsCache = new Map<string, {value: CustomerOrderStats; expires: number}>();
const idCache = new Map<string, {id: string | null; expires: number}>();

const digitsOnly = (v?: string | null) => (v || '').replace(/\D/g, '');

async function adminGraphql<T = any>(
  env: any,
  query: string,
  variables: Record<string, any>,
): Promise<T | null> {
  const {getAdminToken, getAdminDomain} = await import(
    '~/lib/shopify-admin.server'
  );
  const adminToken = await getAdminToken(env);
  const adminDomain = getAdminDomain(env);
  if (!adminToken || !adminDomain) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(
      `https://${adminDomain}/admin/api/${ADMIN_API_VERSION}/graphql.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': adminToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({query, variables}),
        signal: controller.signal,
      },
    );
    if (!res.ok) {
      console.error('[OrderStats] Admin GraphQL returned', res.status);
      return null;
    }
    const json = (await res.json()) as any;
    if (json.errors) {
      console.error('[OrderStats] Admin GraphQL errors:', JSON.stringify(json.errors));
    }
    return json.data ?? null;
  } catch (err: any) {
    console.error('[OrderStats] Admin GraphQL failed:', err?.message || err);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

const FIND_CUSTOMER = `
  query FindCustomerForStats($q: String!) {
    customers(first: 10, query: $q) {
      nodes { id phone email }
    }
  }
`;

/**
 * No line items and no nested connections: Shopify caps a query at 1000 cost
 * points, and 250 orders with line items blows straight past it.
 */
const ORDER_STATS = `
  query CustomerOrderStats($q: String!) {
    orders(query: $q, sortKey: PROCESSED_AT, reverse: true, first: ${ORDER_CAP}) {
      nodes {
        id
        cancelledAt
        displayFinancialStatus
        currentTotalPriceSet { shopMoney { amount } }
      }
    }
  }
`;

async function resolveNumericCustomerId(
  env: any,
  {
    customerId,
    phone,
    email,
  }: {customerId?: string | null; phone?: string | null; email?: string | null},
): Promise<string | null> {
  if (customerId) {
    const numeric = String(customerId).split('/').pop();
    if (numeric && /^\d+$/.test(numeric)) return numeric;
  }

  const cacheKey = `${digitsOnly(phone)}|${(email || '').toLowerCase()}`;
  if (cacheKey === '|') return null;
  const hit = idCache.get(cacheKey);
  if (hit && hit.expires > Date.now()) return hit.id;

  const clauses: string[] = [];
  if (phone) clauses.push(`phone:"${String(phone).replace(/"/g, '')}"`);
  if (email) clauses.push(`email:"${String(email).replace(/"/g, '')}"`);
  if (clauses.length === 0) return null;

  const data = await adminGraphql<any>(env, FIND_CUSTOMER, {
    q: clauses.join(' OR '),
  });
  const candidates: any[] = data?.customers?.nodes || [];

  const sp = digitsOnly(phone);
  const match =
    (sp.length >= 9
      ? candidates.find((c) => {
          const cp = digitsOnly(c.phone);
          return cp && (cp === sp || cp.endsWith(sp.slice(-9)));
        })
      : null) ||
    (email
      ? candidates.find(
          (c) => (c.email || '').toLowerCase() === String(email).toLowerCase(),
        )
      : null) ||
    candidates[0] ||
    null;

  const id = match?.id ? String(match.id).split('/').pop() ?? null : null;
  idCache.set(cacheKey, {id, expires: Date.now() + TTL_MS});
  return id;
}

/**
 * Returns null when the figures cannot be established. Callers should render
 * what they already have rather than substituting a zero — an account page
 * claiming "0 Orders" to someone with a hundred is worse than showing nothing.
 */
export async function fetchCustomerOrderStats({
  env,
  customerId,
  phone,
  email,
}: {
  env: any;
  customerId?: string | null;
  phone?: string | null;
  email?: string | null;
}): Promise<CustomerOrderStats | null> {
  try {
    const numericId = await resolveNumericCustomerId(env, {
      customerId,
      phone,
      email,
    });
    if (!numericId) return null;

    const cached = statsCache.get(numericId);
    if (cached && cached.expires > Date.now()) return cached.value;

    const data = await adminGraphql<any>(env, ORDER_STATS, {
      q: `customer_id:${numericId} AND ${ORDER_STATUS_SCOPE}`,
    });
    if (!data?.orders) return null;

    const nodes: any[] = data.orders.nodes || [];

    const isRefundedOrCancelled = (o: any) =>
      !!o.cancelledAt ||
      String(o.displayFinancialStatus || '').toUpperCase() === 'REFUNDED';

    const totalSpent = nodes.reduce((sum, o) => {
      if (isRefundedOrCancelled(o)) return sum;
      const amount = parseFloat(o?.currentTotalPriceSet?.shopMoney?.amount ?? '0');
      return Number.isFinite(amount) ? sum + amount : sum;
    }, 0);

    const value: CustomerOrderStats = {
      orderCount: nodes.length,
      totalSpent: Math.round(totalSpent * 100) / 100,
      capped: nodes.length >= ORDER_CAP,
    };

    statsCache.set(numericId, {value, expires: Date.now() + TTL_MS});
    return value;
  } catch (err: any) {
    console.error('[OrderStats] Failed:', err?.message || err);
    return null;
  }
}
