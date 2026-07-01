import { redirect, type LoaderFunctionArgs } from 'react-router';
import { getAdminToken } from '~/lib/shopify-admin.server';

/** Derive a consistent password from a user's unique social ID + server secret */
async function derivePassword(userId: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`social:${userId}:${secret}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.slice(0, 24) + 'Aa1!';
}

export async function loader({ context, request }: LoaderFunctionArgs) {
  const { env, session, storefront } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const baseUrl = `${url.protocol}//${url.host}`;
  const redirectUri = `${baseUrl}/api/auth/callback/google`;

  if (!code) return redirect('/account/login');

  try {
    // 1. Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();
    if (tokens.error) throw new Error(tokens.error_description || 'Failed to exchange token');

    // 2. Get User Info
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const googleUser = await userResponse.json();
    const { email, given_name, family_name, sub: googleId } = googleUser;

    if (!email) throw new Error('No email returned from Google');

    // 3. Derive a DETERMINISTIC password from the user's Google ID + server secret
    //    This ensures the same customer always has the same password on every login attempt.
    const adminToken = await getAdminToken(env);
    const domain = env.PUBLIC_STORE_DOMAIN;
    const stablePassword = await derivePassword(googleId, env.SESSION_SECRET || 'saadeddin-social');

    const searchRes = await fetch(`https://${domain}/admin/api/2023-04/customers/search.json?query=email:${encodeURIComponent(email)}`, {
      headers: { 'X-Shopify-Access-Token': adminToken },
    });
    const { customers } = await searchRes.json();

    const existingCustomer = customers?.[0];
    let finalEmail = email;

    if (existingCustomer) {
      // Update password via Admin API
      const updateRes = await fetch(`https://${domain}/admin/api/2024-01/customers/${existingCustomer.id}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': adminToken },
        body: JSON.stringify({
          customer: {
            id: existingCustomer.id,
            password: stablePassword,
            password_confirmation: stablePassword
          }
        })
      });
      if (!updateRes.ok) {
        throw new Error('Failed to synchronize credentials.');
      }
      finalEmail = existingCustomer.email || email;
    } else {
      // Create new customer via Admin API
      const createRes = await fetch(`https://${domain}/admin/api/2024-01/customers.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': adminToken },
        body: JSON.stringify({
          customer: {
            first_name: given_name || 'Social',
            last_name: family_name || 'User',
            email: email,
            password: stablePassword,
            password_confirmation: stablePassword,
            tags: 'social_login,google_login',
            verified_email: true
          }
        })
      });
      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}));
        throw new Error(errData.errors ? JSON.stringify(errData.errors) : 'Failed to register social account.');
      }
      const createData = await createRes.json();
      finalEmail = createData.customer?.email || email;
    }

    // 4. Generate REAL storefront access token
    const storefrontTokenResponse = await storefront.mutate(CUSTOMER_ACCESS_TOKEN_CREATE_MUTATION, {
      variables: { input: { email: finalEmail, password: stablePassword } },
    });
    const token = storefrontTokenResponse.customerAccessTokenCreate?.customerAccessToken;

    if (token) {
      session.set('customerAccessToken', token);
      session.set('saadeddinToken', 'social-login-' + Date.now());
      return redirect('/account', { headers: { 'Set-Cookie': await session.commit() } });
    } else {
      const errors = storefrontTokenResponse.customerAccessTokenCreate?.customerUserErrors;
      throw new Error(errors?.[0]?.message || 'Failed to authenticate social session.');
    }

  } catch (error: any) {
    console.error('Google Auth Error:', error.message);
    return redirect(`/account/login?error=${encodeURIComponent(error.message)}`);
  }
}

const CUSTOMER_ACCESS_TOKEN_CREATE_MUTATION = `#graphql
  mutation customerAccessTokenCreateSocial($input: CustomerAccessTokenCreateInput!) {
    customerAccessTokenCreate(input: $input) {
      customerAccessToken { accessToken expiresAt }
      customerUserErrors { code field message }
    }
  }
`;



