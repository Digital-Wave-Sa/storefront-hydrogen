import {redirect} from 'react-router';

/**
 * One definition of "signed in enough to check out".
 *
 * The gate lived inline in `/checkout/initiate` and nowhere else, so it only
 * ever protected the one door it was written on. Buy Now went straight to
 * `cart.checkoutUrl` with `window.location.href`, `/cart/:lines` redirected
 * there from its loader, and the export flow built its own prefilled checkout
 * URL -- three paths to Shopify checkout that never saw the check.
 *
 * Login is a property of the request, not of one route, so the check lives
 * here and every path that can reach checkout calls it.
 *
 * Two keys, and deliberately not four. The old check also accepted
 * `loginOtpPhone` or `loginCustomerEmail`, and `loginOtpPhone` was written
 * the moment a code was REQUESTED, before anyone typed one in. Any visitor
 * could enter a phone number, press send, and be signed in as far as this
 * check was concerned -- which is why guests kept arriving at checkout with a
 * login gate sitting in front of it. The login route no longer writes that
 * key before verifying, and this no longer trusts it; either change alone
 * would have closed it, and both together mean it cannot quietly come back.
 *
 * Every completed login sets `customerAccessToken` -- the OTP flow, register,
 * and the three social callbacks, with a `session-` token as the fallback
 * when the Shopify mutation fails. `saadeddinToken` comes from the CRM
 * alongside it. Neither is ever set before the customer has proved who they
 * are, which is exactly the property this check needs.
 */
export async function isSignedIn(session: any): Promise<boolean> {
  if (!session) return false;

  const [customToken, customerAccessToken] = await Promise.all([
    session.get('saadeddinToken'),
    session.get('customerAccessToken'),
  ]);

  return !!(customToken || customerAccessToken);
}

/** The login URL that returns the shopper to `redirectTo` once they are in. */
export function loginUrlFor(lang: 'en' | 'ar', redirectTo: string): string {
  const base = lang === 'en' ? '/en/account/login' : '/account/login';
  return `${base}?redirectTo=${encodeURIComponent(redirectTo)}`;
}

/**
 * Throws a redirect to login when the shopper is not signed in. Throwing
 * rather than returning is deliberate: a caller cannot carry on past a failed
 * check by forgetting to inspect a return value, which is exactly how the
 * three unguarded paths came about.
 */
export async function requireSignedIn(
  context: any,
  lang: 'en' | 'ar',
  redirectTo: string,
): Promise<void> {
  if (await isSignedIn(context?.session)) return;
  throw redirect(loginUrlFor(lang, redirectTo));
}
