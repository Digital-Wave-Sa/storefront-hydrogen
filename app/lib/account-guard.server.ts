/**
 * Server-side guards for the admin screens under /account.
 *
 * The promotions and dashboard routes checked the signed-in customer's tags in
 * their `loader` and nowhere else. React Router runs `loader` on GET and
 * `action` on POST, so the login gate protected the page while every write
 * behind it — creating discount codes, rewriting branch delivery fees and
 * opening hours — was reachable by an unauthenticated POST straight to the
 * route. Both actions went directly to `getAdminToken(env)` without once
 * touching the session.
 *
 * Guarding is therefore a property of the request, not of the page: every
 * privileged action calls `requireAdmin` before it does anything else.
 *
 * These throw a `Response` rather than returning one. React Router treats a
 * thrown Response as the response, so a caller cannot accidentally continue
 * past a failed check by ignoring a return value — which is the mistake that
 * produced this class of hole in the first place.
 */

const ADMIN_CUSTOMER_QUERY = `#graphql
  query accountGuardCustomer($customerAccessToken: String!) {
    customer(customerAccessToken: $customerAccessToken) {
      id
      email
      phone
      tags
    }
  }
` as const;

export interface AccountIdentity {
  customerId: string;
  email: string | null;
  phone: string | null;
  tags: string[];
}

/** Tag spellings that grant access to the admin screens. */
function hasAdminTag(tags: string[]): boolean {
  return tags.some((tag) => {
    const clean = String(tag || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '');
    return clean === 'admin' || clean === 'branchmanager' || clean === 'manager';
  });
}

/**
 * The signed-in customer, verified against Shopify — never from the request
 * body or query string. Throws 401 when there is no valid session.
 */
export async function requireCustomer(context: any): Promise<AccountIdentity> {
  const session = context?.session;
  const storefront = context?.storefront;

  const customerAccessToken = session ? await session.get('customerAccessToken') : null;
  const token =
    typeof customerAccessToken === 'string'
      ? customerAccessToken
      : customerAccessToken?.accessToken;

  /**
   * `dev-bypass-token` is not a customer. It used to be accepted here and, on
   * the dashboard, granted `isAdmin = true` outright.
   */
  if (!token || token === 'dev-bypass-token' || !storefront) {
    throw new Response('Unauthorized', {status: 401});
  }

  let customer: any = null;
  try {
    const result: any = await storefront.query(ADMIN_CUSTOMER_QUERY, {
      variables: {customerAccessToken: token},
      cache: storefront.CacheNone(),
    });
    customer = result?.customer ?? null;
  } catch (err: any) {
    console.error('[AccountGuard] Customer lookup failed:', err?.message || err);
    throw new Response('Unauthorized', {status: 401});
  }

  if (!customer?.id) {
    throw new Response('Unauthorized', {status: 401});
  }

  return {
    customerId: customer.id,
    email: customer.email ?? null,
    phone: customer.phone ?? null,
    tags: Array.isArray(customer.tags) ? customer.tags : [],
  };
}

/**
 * As `requireCustomer`, and the customer must additionally carry an admin or
 * branch-manager tag. Throws 403 otherwise.
 *
 * Note the query above selects `tags`. The original loaders asked Shopify for
 * `id` alone and then read `sfCustomer?.tags`, which is always undefined — so
 * the tag check could never pass and the only way into those screens was the
 * dev bypass token.
 */
export async function requireAdmin(context: any): Promise<AccountIdentity> {
  const identity = await requireCustomer(context);
  if (!hasAdminTag(identity.tags)) {
    console.warn(
      '[AccountGuard] Non-admin attempted a privileged action:',
      identity.customerId,
    );
    throw new Response('Forbidden', {status: 403});
  }
  return identity;
}

export {hasAdminTag};
