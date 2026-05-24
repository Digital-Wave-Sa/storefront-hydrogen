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

    let customerId = customers?.[0]?.id;

    if (!customerId) {
      const createRes = await fetch(`https://${domain}/admin/api/2023-04/customers.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': adminToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer: {
            first_name: first_name || 'Facebook User',
            last_name: last_name || '',
            email: finalEmail,
            password: fbId + Math.random().toString(36), // Random password
            password_confirmation: fbId + Math.random().toString(36),
            verified_email: true,
            tags: ['Social Login', 'Facebook'],
          }
        }),
      });
      const { customer, errors } = await createRes.json();
      if (errors) {
         console.error('Customer create error via Facebook:', errors);
      }
      customerId = customer?.id;
    }

    // 4. Set Session
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

  } catch (error: any) {
    console.error('Facebook Auth Error:', error.message);
    return redirect(`/account/login?error=${encodeURIComponent(error.message)}`);
  }
}
