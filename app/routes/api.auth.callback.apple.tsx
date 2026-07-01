import { redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router';

/** Derive a consistent password from a user's unique social ID + server secret */
async function derivePassword(userId: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`social:${userId}:${secret}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.slice(0, 24) + 'Aa1!';
}

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
  const { env, session, storefront } = context;
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

  const existingCustomer = customers?.[0];
  const stablePassword = await derivePassword(appleUserId, env.SESSION_SECRET || 'saadeddin-social');
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
          first_name: firstName,
          last_name: lastName,
          email: finalEmail,
          password: stablePassword,
          password_confirmation: stablePassword,
          tags: 'social_login,apple_login',
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
  const tokenResponse = await storefront.mutate(CUSTOMER_ACCESS_TOKEN_CREATE_MUTATION, {
      variables: { input: { email: customerEmail, password: stablePassword } },
  });
  const token = tokenResponse.customerAccessTokenCreate?.customerAccessToken;

  if (token) {
    session.set('customerAccessToken', token);
    session.set('saadeddinToken', 'social-login-' + Date.now());
    return redirect('/account', { headers: { 'Set-Cookie': await session.commit() } });
  } else {
    const errors = tokenResponse.customerAccessTokenCreate?.customerUserErrors;
    throw new Error(errors?.[0]?.message || 'Failed to authenticate social session.');
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
