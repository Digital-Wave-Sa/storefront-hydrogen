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

  /**
    * 2. Forget the person, all of them.
    *
    * This used to unset four keys and leave `loginCustomerId` and
    * `loginCustomerEmail` in the session -- which is exactly what
    * `getSessionIdentity` reads. A logged-out browser still resolved to the
    * customer who had just left, and the wallet and loyalty endpoints
    * answered for them.
    */
  const {clearIdentity} = await import('~/lib/session-identity.server');
  clearIdentity(session);

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
