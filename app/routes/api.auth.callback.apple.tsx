import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router';

function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

async function handleAppleAuth(formData: FormData, context: any) {
  const { env, session } = context;
  const idToken = formData.get('id_token') as string;
  const userJson = formData.get('user') as string; 

  if (!idToken) throw new Error('No ID Token received from Apple');

  const decoded = parseJwt(idToken);
  if (!decoded) throw new Error('Failed to parse Apple ID Token');

  const email = decoded.email;
  const appleUserId = decoded.sub;

  let firstName = 'Apple User';
  let lastName = '';

  if (userJson) {
    try {
      const parsedUser = JSON.parse(userJson);
      if (parsedUser.name) {
        firstName = parsedUser.name.firstName || firstName;
        lastName = parsedUser.name.lastName || '';
      }
    } catch (e) {
      console.error('Error parsing Apple user metadata:', e);
    }
  }

  const finalEmail = email || `${appleUserId}@apple.social.saadeddin.com`;

  // Search and/or Create Shopify Customer using Shopify Admin API
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
          first_name: firstName,
          last_name: lastName,
          email: finalEmail,
          password: appleUserId + Math.random().toString(36),
          password_confirmation: appleUserId + Math.random().toString(36),
          verified_email: true,
          tags: ['Social Login', 'Apple'],
        }
      }),
    });
    const { customer, errors } = await createRes.json();
    if (errors) {
       console.error('Customer create error via Apple:', errors);
    }
    customerId = customer?.id;
  }

  // Set Session
  session.set('customerAccessToken', {
      accessToken: 'SOCIAL_LOGIN_TOKEN_' + Date.now(),
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      isSocial: true,
      email: finalEmail,
      firstName: firstName
  });

  return redirect('/account', {
    headers: { 'Set-Cookie': await session.commit() },
  });
}

export async function action({ request, context }: ActionFunctionArgs) {
  try {
    const formData = await request.formData();
    return await handleAppleAuth(formData, context);
  } catch (error: any) {
    return redirect(`/account/login?error=${encodeURIComponent(error.message)}`);
  }
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  if (!code) return redirect('/account/login');

  try {
    const mockFormData = new FormData();
    mockFormData.append('id_token', url.searchParams.get('id_token') || '');
    return await handleAppleAuth(mockFormData, context);
  } catch (error: any) {
    return redirect(`/account/login?error=${encodeURIComponent(error.message)}`);
  }
}
