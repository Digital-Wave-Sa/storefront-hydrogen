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
  const redirectUri = `${baseUrl}/api/auth/callback/facebook`;

  if (!code) return redirect('/account/login');

  try {
    // 1. Exchange code for access token
    const tokenUrl = new URL('https://graph.facebook.com/v12.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', env.FACEBOOK_CLIENT_ID || '1234567890');
    tokenUrl.searchParams.set('client_secret', env.FACEBOOK_CLIENT_SECRET || 'dummy_facebook_secret');
    tokenUrl.searchParams.set('redirect_uri', redirectUri);
    tokenUrl.searchParams.set('code', code);

    const tokenResponse = await fetch(tokenUrl.toString());
    const tokens = await tokenResponse.json();
    if (tokens.error) throw new Error(tokens.error.message || 'Failed to exchange Facebook token');

    // 2. Get User Profile Info
    const profileUrl = new URL('https://graph.facebook.com/me');
    profileUrl.searchParams.set('fields', 'id,first_name,last_name,email');
    profileUrl.searchParams.set('access_token', tokens.access_token);

    const userResponse = await fetch(profileUrl.toString());
    const facebookUser = await userResponse.json();
    const { email, first_name, last_name, id: fbId } = facebookUser;

    const finalEmail = email || `${fbId}@facebook.social.saadeddin.com`;

    // 3. Search and/or Create Shopify Customer using Shopify Admin API
    const adminToken = await getAdminToken(env);
    const domain = env.PUBLIC_STORE_DOMAIN;

    const searchRes = await fetch(`https://${domain}/admin/api/2023-04/customers/search.json?query=email:${finalEmail}`, {
      headers: { 'X-Shopify-Access-Token': adminToken },
    });
    const { customers } = await searchRes.json();

    const existingCustomer = customers?.[0];
    const stablePassword = await derivePassword(fbId, env.SESSION_SECRET || 'saadeddin-social');
    let customerEmail = finalEmail;

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
      customerEmail = existingCustomer.email || finalEmail;
    } else {
      // Create new customer via Admin API
      const createRes = await fetch(`https://${domain}/admin/api/2024-01/customers.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': adminToken },
        body: JSON.stringify({
          customer: {
            first_name: first_name || 'Social',
            last_name: last_name || 'User',
            email: finalEmail,
            password: stablePassword,
            password_confirmation: stablePassword,
            tags: 'social_login,facebook_login',
            verified_email: true
          }
        })
      });
      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}));
        throw new Error(errData.errors ? JSON.stringify(errData.errors) : 'Failed to register social account.');
      }
      const createData = await createRes.json();
      customerEmail = createData.customer?.email || finalEmail;
    }

    // 4. Generate REAL storefront access token
    const storefrontTokenResponse = await storefront.mutate(CUSTOMER_ACCESS_TOKEN_CREATE_MUTATION, {
      variables: { input: { email: customerEmail, password: stablePassword } },
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
    console.error('Facebook Auth Error:', error.message);
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
