import {
  data,
  redirect,
  type ActionFunctionArgs,
  type MetaFunction,
} from 'react-router';
import {SaadeddinApi} from '~/lib/saadeddin-api.server';

export const meta: MetaFunction<typeof loader> = () => {
  return [{title: 'Logout'}];
};

export async function loader() {
  return redirect('/account/login');
}

export async function action({request, context}: ActionFunctionArgs) {
  const {session, env} = context;

  if (request.method !== 'POST') {
    return data({error: 'Method not allowed'}, {status: 405});
  }

  // 1. Call Custom API Logout
  try {
    const customToken = session.get('saadeddinToken');
    if (customToken) {
      const api = new SaadeddinApi(env, customToken);
      await api.logout().catch(() => {}); // ignore errors if token already expired
    }
  } catch (e) {
    // Ignore custom API errors on logout
  }

  // 2. Unset Custom Token
  session.unset('saadeddinToken');
  session.unset('loginOtpPhone');

  // 3. Unset Shopify Token
  session.unset('customerAccessToken');

  // 4. Clear PII from session (like delivery address name)
  session.unset('selectedAddressName');

  const headers = new Headers();
  headers.append('Set-Cookie', await session.commit());
  headers.append(
    'Set-Cookie',
    'cart=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
  );

  return redirect('/', {
    headers,
  });
}

export default function Logout() {
  return null;
}
