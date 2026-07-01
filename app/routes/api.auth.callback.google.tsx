import { data, redirect, type LoaderFunctionArgs } from 'react-router';

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

    // 3. Check if customer exists in Shopify via Admin API
    const adminToken = env.SHOPIFY_ADMIN_API_ACCESS_TOKEN;
    const domain = env.PUBLIC_STORE_DOMAIN;

    const searchRes = await fetch(`https://${domain}/admin/api/2023-04/customers/search.json?query=email:${email}`, {
      headers: { 'X-Shopify-Access-Token': adminToken },
    });
    const { customers } = await searchRes.json();

    const existingCustomer = customers?.[0];
    const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';
    let finalEmail = email;

    if (existingCustomer) {
      // Update password via Admin API
      const updateRes = await fetch(`https://${domain}/admin/api/2024-01/customers/${existingCustomer.id}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': adminToken },
        body: JSON.stringify({
          customer: {
            id: existingCustomer.id,
            password: tempPassword,
            password_confirmation: tempPassword
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
            password: tempPassword,
            password_confirmation: tempPassword,
            tags: 'social_login'
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
      variables: { input: { email: finalEmail, password: tempPassword } },
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



