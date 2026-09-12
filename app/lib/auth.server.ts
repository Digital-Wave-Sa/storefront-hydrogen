/**
 * Derives a consistent, secure password from a user's phone number + a server secret.
 * This ensures passwordless logins can generate reliable Shopify customer access tokens.
 */
export async function derivePassword(phoneOrId: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`otp-auth:${phoneOrId}:${secret}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  // Return a secure 24-character string matching Shopify's password requirements (needs upper, lower, number, special)
  return hashHex.slice(0, 24) + 'Aa1!';
}

const REMINT_MUTATION = `#graphql
  mutation remintCustomerAccessToken($input: CustomerAccessTokenCreateInput!) {
    customerAccessTokenCreate(input: $input) {
      customerAccessToken {
        accessToken
        expiresAt
      }
      customerUserErrors {
        code
        field
        message
      }
    }
  }
`;

/**
 * Mint a fresh Shopify customer access token for the shopper already signed in
 * to this session, and store it.
 *
 * ── Why this has to exist ──
 *
 * OTP login sets a derived password on the Shopify customer through the Admin
 * API, then mints a classic access token with it. Setting a password
 * invalidates every token Shopify previously issued for that customer — so the
 * NEXT login kills the token the last one left in a still-open session. Classic
 * tokens also expire on their own.
 *
 * Either way the session ends up holding a token Shopify answers with
 * «Customer غير صالح» / INVALID. Checkout then treats a signed-in shopper as a
 * guest, which looks exactly like a broken feature and is really just a stale
 * credential.
 *
 * Because the password is DERIVED — `derivePassword(phone, SESSION_SECRET)` is
 * pure — a fresh token can be minted server-side at any time, with no shopper
 * interaction and no new OTP.
 *
 * ── Which email ──
 *
 * The one on the Shopify customer record, read from the Admin API using the id
 * in the session. That is the account whose password was set, so signing in
 * with its own address is correct by construction. The session's cached email
 * is a fallback only: the CRM's address and the Shopify account's address are
 * not always the same, and minting against the wrong one would either fail or,
 * far worse, return a token for a different customer.
 *
 * Returns the new access token string, or null. Null is never fatal — every
 * caller must still work for a shopper who cannot be re-authenticated.
 */
export async function remintCustomerAccessToken(
  context: any,
): Promise<string | null> {
  const session = context?.session;
  const env = context?.env;
  if (!session || !env || !context?.storefront) return null;

  try {
    const phone = await session.get('loginOtpPhone');
    const customerId = await session.get('loginCustomerId');
    if (!phone) {
      console.warn('[Remint] No loginOtpPhone in session; cannot derive password.');
      return null;
    }

    const password = await derivePassword(
      phone,
      env.SESSION_SECRET || 'saadeddin-otp-secret',
    );

    let email: string | null = null;

    if (customerId) {
      try {
        const {getAdminToken, getAdminDomain} = await import(
          '~/lib/shopify-admin.server'
        );
        const adminToken = await getAdminToken(env);
        const adminDomain = getAdminDomain(env);
        const numericId = String(customerId).split('/').pop();

        if (adminToken && adminDomain && numericId) {
          const res = await fetch(
            `https://${adminDomain}/admin/api/2024-01/customers/${numericId}.json?fields=email`,
            {headers: {'X-Shopify-Access-Token': adminToken}},
          );
          if (res.ok) {
            const body: any = await res.json();
            email = body?.customer?.email || null;
          }
        }
      } catch (adminErr: any) {
        console.warn('[Remint] Admin email lookup failed:', adminErr?.message || adminErr);
      }
    }

    if (!email) {
      const sessionEmail = await session.get('loginCustomerEmail');
      email =
        (typeof sessionEmail === 'string' && sessionEmail) ||
        `${String(phone).replace(/\D/g, '')}@saadeddin.placeholder`;
    }

    const response: any = await context.storefront.mutate(REMINT_MUTATION, {
      variables: {input: {email, password}},
    });

    const token =
      response?.customerAccessTokenCreate?.customerAccessToken?.accessToken ||
      null;
    const userErrors =
      response?.customerAccessTokenCreate?.customerUserErrors || [];

    if (!token) {
      console.warn(
        '[Remint] Could not mint a fresh token:',
        userErrors.length ? JSON.stringify(userErrors) : 'no token returned',
      );
      return null;
    }

    /**
     * Stored in the same shape login writes, so every other reader — the
     * `session-` guards especially — keeps working unchanged.
     */
    session.set('customerAccessToken', {
      accessToken: token,
      expiresAt:
        response?.customerAccessTokenCreate?.customerAccessToken?.expiresAt ||
        null,
    });

    console.log('[Remint] Fresh Shopify token minted for the signed-in shopper.');
    return token;
  } catch (err: any) {
    console.error('[Remint] Threw:', err?.message || err);
    return null;
  }
}
