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

    if (existingCustomer) {
      // Log them in!
      session.set('customerAccessToken', {
        accessToken: 'SOCIAL_LOGIN_TOKEN_' + Date.now(),
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
        isSocial: true,
        email: email,
        firstName: given_name
      });
      return redirect('/account', { headers: { 'Set-Cookie': await session.commit() } });
    }

    // Account not found
    return redirect('/account/login?error=' + encodeURIComponent('Account not found. Please register an account first.'));

  } catch (error: any) {
    console.error('Google Auth Error:', error.message);
    return redirect(`/account/login?error=${encodeURIComponent(error.message)}`);
  }
}



