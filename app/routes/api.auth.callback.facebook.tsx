import { data, redirect, type LoaderFunctionArgs } from 'react-router';

export async function loader({ context, request }: LoaderFunctionArgs) {
  const { env, session } = context;
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
    const adminToken = env.SHOPIFY_ADMIN_API_ACCESS_TOKEN || env.SHOPIFY_ADMIN_API_ACCESS_TOKENS;
    const domain = env.PUBLIC_STORE_DOMAIN;

    const searchRes = await fetch(`https://${domain}/admin/api/2023-04/customers/search.json?query=email:${finalEmail}`, {
      headers: { 'X-Shopify-Access-Token': adminToken },
    });
    const { customers } = await searchRes.json();

    const existingCustomer = customers?.[0];

    if (existingCustomer) {
      session.set('customerAccessToken', {
          accessToken: 'SOCIAL_LOGIN_TOKEN_' + Date.now(),
          expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
          isSocial: true,
          email: finalEmail,
          firstName: first_name || 'Facebook User'
      });
      return redirect('/account', {
        headers: { 'Set-Cookie': await session.commit() },
      });
    }

    return redirect('/account/login?error=' + encodeURIComponent('Account not found. Please register an account first.'));

  } catch (error: any) {
    console.error('Facebook Auth Error:', error.message);
    return redirect(`/account/login?error=${encodeURIComponent(error.message)}`);
  }
}
