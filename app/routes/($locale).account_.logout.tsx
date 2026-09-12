import {
  data,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from 'react-router';
import {SaadeddinApi} from '~/lib/saadeddin-api.server';

export const meta: MetaFunction<typeof loader> = () => {
  return [{title: 'Logout'}];
};

/**
 * A GET here used to redirect to the login page and nothing else.
 *
 * The session was left completely intact, so anyone who typed
 * /account/logout -- rather than pressing Sign out, which posts -- was bounced
 * to a login screen while still fully signed in, and going back to /account
 * showed their account again. On a shared or public browser that is somebody
 * believing they have logged out when they have not, with their name, orders,
 * addresses, wallet and phone still one URL away.
 *
 * The GET now ends the session too. That is safe here because nothing in the
 * app links to this URL: both callers -- the Sign out buttons in
 * ($locale).account.tsx and ($locale).account._index.tsx -- are
 * `<Form method="POST">`, so no `<Link prefetch>` can reach this loader on
 * hover and sign a shopper out behind their back.
 *
 * The worst a third party can do by embedding this URL is log someone out,
 * which is a nuisance rather than a disclosure -- the trade the old behaviour
 * had backwards.
 */
export async function loader({context}: LoaderFunctionArgs) {
  const {session} = context;

  const {clearIdentity, clearShoppingSelection} = await import(
    '~/lib/session-identity.server'
  );
  clearIdentity(session);
  clearShoppingSelection(session);

  const headers = new Headers();
  headers.append('Set-Cookie', await session.commit());
  headers.append(
    'Set-Cookie',
    'cart=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
  );
  /** Never let a logged-out response be replayed from a cache. */
  headers.append('Cache-Control', 'no-cache, no-store, must-revalidate');

  return redirect('/account/login', {headers});
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

  const {clearIdentity, clearShoppingSelection} = await import(
    '~/lib/session-identity.server'
  );

  /**
   * 2. Forget the person, all of them.
   *
   * This used to unset four keys and leave `loginCustomerId` and
   * `loginCustomerEmail` in the session -- which is exactly what
   * `getSessionIdentity` reads. A logged-out browser still resolved to the
   * customer who had just left, and the wallet and loyalty endpoints
   * answered for them.
   *
   * This call is the one thing in this file that must never be removed. It is
   * what makes the Sign out button actually sign someone out: this action is
   * the POST that both buttons submit to, and the GET loader above is only a
   * safety net for someone typing the URL. It was once dropped here while the
   * selection clearing below was being added, and logging out stopped ending
   * the session at all.
   */
  clearIdentity(session);

  /**
   * 3. Forget what they chose, too.
   *
   * The cart cookie is discarded below, but the branch, fulfilment type, time
   * slot and saved-address id live in the SESSION and survived it. The next
   * person to sign in at this browser inherited the previous shopper's
   * delivery setup — branch, method and fee — on a brand-new cart.
   */
  clearShoppingSelection(session);

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
