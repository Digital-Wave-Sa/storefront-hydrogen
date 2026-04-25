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

    let customerId = customers?.[0]?.id;
    let customerEmail = email;

    if (!customerId) {
      // 4. Create new customer if not found
      const createRes = await fetch(`https://${domain}/admin/api/2023-04/customers.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': adminToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer: {
            first_name: given_name,
            last_name: family_name,
            email: email,
            password: googleId + Math.random().toString(36), // Random password
            password_confirmation: googleId + Math.random().toString(36),
            verified_email: true,
            tags: ['Social Login', 'Google'],
          }
        }),
      });
      const { customer, errors } = await createRes.json();
      if (errors) {
         // Handle error (e.g. email already exists but search failed)
         console.error('Customer create error:', errors);
      }
      customerId = customer?.id;
    }

    // 5. Log the user in
    // Note: Since we don't have the password for existing users, 
    // the standard Storefront API login won't work easily here without Multipass.
    // For now, we will set a special session flag or try to trigger a password reset flow.
    // OPTION: We'll store the customer info in session to show them as logged in for UI.
    
    // For a real production app, you would use Shopify Multipass (Plus only) 
    // or the new Customer Account API.
    
    // SIMULATION: We'll set the customer ID in session
    session.set('customerAccessToken', {
        accessToken: 'SOCIAL_LOGIN_TOKEN_' + Date.now(),
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
        isSocial: true,
        email: email,
        firstName: given_name
    });

    return redirect('/account', {
      headers: { 'Set-Cookie': await session.commit() },
    });

  } catch (error: any) {
    console.error('Google Auth Error:', error.message);
    return redirect(`/account/login?error=${encodeURIComponent(error.message)}`);
  }
}



