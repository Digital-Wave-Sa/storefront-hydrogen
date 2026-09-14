import {getAdminToken, getAdminDomain} from '~/lib/shopify-admin.server';
import {
  isValidEmailFormat,
  isPlaceholderEmail,
  PLACEHOLDER_EMAIL_DOMAIN,
} from '~/lib/needs-email';

/**
 * Shared logic for reading and updating the signed-in customer's email.
 *
 * Two things live here so the API endpoint (used by the cake builder) and the
 * /add-email page never drift apart: how we resolve WHO is signed in,
 * and how we validate and save a new address. Both the checkout gates and these
 * writers trust the same rule in `needs-email.ts`.
 */

export type ResolvedCustomer = {
  /** The customer's numeric Admin id (no gid prefix). */
  numericId: string;
  /** Their current email as Shopify holds it — may be a placeholder. */
  currentEmail: string | null;
};

/**
 * The customer's email straight from the Admin API by id.
 *
 * This is the authoritative source and — crucially — does NOT depend on the
 * Storefront customer access token. The phone-OTP login falls back to a fake
 * `session-...` token when it can't mint a real one, and the Storefront
 * `customer(customerAccessToken:)` query returns null for that token. Reading by
 * id sidesteps that entirely, so a placeholder email is still detected for those
 * sessions. Returns null only when the id is unknown or the Admin call fails.
 */
export async function getAdminCustomerEmail(
  env: any,
  numericId: string | null | undefined,
): Promise<string | null> {
  if (!numericId) return null;
  let token: string | null = null;
  let domain = '';
  try {
    token = await getAdminToken(env);
    domain = getAdminDomain(env);
  } catch {
    return null;
  }
  if (!token || !domain) return null;
  try {
    const res = await fetch(
      `https://${domain}/admin/api/2024-01/customers/${numericId}.json?fields=id,email`,
      {headers: {'X-Shopify-Access-Token': token}},
    );
    if (!res.ok) return null;
    const d = (await res.json()) as any;
    return d?.customer?.email || null;
  } catch {
    return null;
  }
}

/**
 * Who is signed in, resolved the same way the custom-cake route does it: the
 * Storefront customer query (authoritative) wins, with the session's login keys
 * as a fallback. Returns null when nobody is signed in.
 */
export async function resolveLoggedInCustomer(
  context: any,
): Promise<ResolvedCustomer | null> {
  const {session, storefront, env} = context;

  let numericId: string | null = null;
  let currentEmail: string | null = null;

  const loginCustomerId = await session.get('loginCustomerId');
  if (loginCustomerId) {
    numericId = String(loginCustomerId).split('/').pop() || null;
  }
  const loginEmail = await session.get('loginCustomerEmail');
  if (loginEmail) currentEmail = String(loginEmail);

  const cat = await session.get('customerAccessToken');
  const tokenStr = typeof cat === 'string' ? cat : cat?.accessToken;

  // A REAL Shopify token resolves the customer (and their id) directly. A
  // `session-...` fallback token — minted by the OTP login when it couldn't
  // create a real one — is not recognised by the Storefront API and would just
  // return null, so skip it and lean on loginCustomerId + the Admin lookup.
  const isRealToken =
    !!tokenStr &&
    tokenStr !== 'dev-bypass-token' &&
    !String(tokenStr).startsWith('session-');

  if (isRealToken && storefront) {
    try {
      const res = (await storefront.query(
        `#graphql
          query ResolveCustomerEmail($customerAccessToken: String!) {
            customer(customerAccessToken: $customerAccessToken) {
              id
              email
            }
          }
        `,
        {
          variables: {customerAccessToken: tokenStr},
          cache: storefront.CacheNone(),
        },
      )) as any;
      if (res?.customer) {
        if (res.customer.id) {
          numericId = String(res.customer.id).split('/').pop() || numericId;
        }
        currentEmail = res.customer.email ?? currentEmail;
      }
    } catch {
      // Fall back to the Admin lookup below.
    }
  }

  // Authoritative email straight from Admin by id — independent of the Storefront
  // token, so it's correct even when the login fell back to a `session-` token
  // and the query above was skipped or came back empty.
  if (numericId) {
    const adminEmail = await getAdminCustomerEmail(env, numericId);
    if (adminEmail) currentEmail = adminEmail;
  }

  if (!numericId) return null;
  return {numericId, currentEmail};
}

export type SaveEmailResult =
  | {ok: true; email: string}
  | {ok: false; code: 'invalid_format' | 'in_use' | 'server'};

/**
 * Validate and save a new email onto a customer via the Admin API.
 *
 * - Rejects malformed addresses and placeholder addresses up front.
 * - Rejects an address already held by a DIFFERENT customer (checked by search,
 *   and again by trusting Shopify's own "has already been taken" on the write,
 *   so a race can't slip a duplicate through).
 * - Leaves the password untouched and keeps `verified_email` true, so the OTP
 *   login can still mint a Storefront token on the next sign-in.
 *
 * On success it also updates the session's `loginCustomerEmail`; the CALLER is
 * responsible for committing the session (Set-Cookie) on its response.
 */
export async function saveCustomerEmail(
  context: any,
  numericId: string,
  rawEmail: string,
): Promise<SaveEmailResult> {
  const email = String(rawEmail || '').trim();

  if (!isValidEmailFormat(email) || isPlaceholderEmail(email)) {
    return {ok: false, code: 'invalid_format'};
  }

  const env = context.env as any;
  // getAdminToken throws when Admin credentials are missing — treat that as a
  // server error rather than letting it bubble into a 500.
  let token: string | null = null;
  let domain = '';
  try {
    token = await getAdminToken(env);
    domain = getAdminDomain(env);
  } catch {
    return {ok: false, code: 'server'};
  }
  if (!token || !domain) return {ok: false, code: 'server'};

  const emailLower = email.toLowerCase();

  // Uniqueness: is this address already on a different customer?
  try {
    const searchRes = await fetch(
      `https://${domain}/admin/api/2024-01/customers/search.json?query=${encodeURIComponent(
        `email:${email}`,
      )}&fields=id,email`,
      {headers: {'X-Shopify-Access-Token': token}},
    );
    if (searchRes.ok) {
      const d = (await searchRes.json()) as any;
      const taken = (d.customers || []).some(
        (c: any) =>
          String(c.id) !== String(numericId) &&
          (c.email || '').toLowerCase() === emailLower,
      );
      if (taken) return {ok: false, code: 'in_use'};
    }
  } catch {
    // A failed search is not proof it's free — the write below still enforces
    // uniqueness via Shopify, so we continue rather than block on a lookup blip.
  }

  // Save.
  try {
    const putRes = await fetch(
      `https://${domain}/admin/api/2024-01/customers/${numericId}.json`,
      {
        method: 'PUT',
        headers: {
          'X-Shopify-Access-Token': token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer: {
            id: Number(numericId),
            email,
            verified_email: true,
          },
        }),
      },
    );

    if (!putRes.ok) {
      const body = (await putRes.text().catch(() => '')).toLowerCase();
      if (body.includes('has already been taken') || body.includes('taken')) {
        return {ok: false, code: 'in_use'};
      }
      console.error(
        `[customer-email] Update failed for customer ${numericId} (HTTP ${putRes.status}):`,
        body.slice(0, 300),
      );
      return {ok: false, code: 'server'};
    }
  } catch (e: any) {
    console.error('[customer-email] Update threw:', e?.message || e);
    return {ok: false, code: 'server'};
  }

  // Keep the session in step; the caller commits it.
  try {
    await context.session.set('loginCustomerEmail', email);
  } catch {}

  return {ok: true, email};
}
