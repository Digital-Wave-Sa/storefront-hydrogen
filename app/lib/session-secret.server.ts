/**
 * The one place the storefront reads SESSION_SECRET.
 *
 * It does two jobs: it signs the session cookie (who is signed in), and it is
 * the key behind every customer's Shopify password (`derivePassword`). Whoever
 * holds it can forge a sign-in or compute a customer's password.
 *
 * Each caller used to read it as `env.SESSION_SECRET || '<a fixed string>'`,
 * with three different fixed strings, all in the repository. With the
 * variable set -- as it is on Oxygen -- those were never used; the day it went
 * missing, the site would have kept running on keys anyone with the code
 * knows. Now a missing secret stops sign-in with a clear error instead.
 *
 * With the variable set, the value returned is exactly `env.SESSION_SECRET`,
 * so cookies and passwords are the same as before this change.
 *
 * Local development only: a missing secret falls back to a fixed dev value
 * (with a warning) so `npm run dev` keeps working without a .env entry. The
 * production build never takes that branch.
 */
const DEV_ONLY_SECRET = 'local-development-only-session-secret';

export function sessionSecret(env: any): string {
  const value = env?.SESSION_SECRET;
  // Returned untouched (not trimmed): the passwords already set on customer
  // accounts were derived from this exact string.
  if (typeof value === 'string' && value.trim()) return value;

  if (process.env.NODE_ENV === 'development') {
    console.warn(
      '[session] SESSION_SECRET is not set; using a development-only value. Set it in .env.',
    );
    return DEV_ONLY_SECRET;
  }

  throw new Error(
    'SESSION_SECRET is not set. Add it in Hydrogen → Storefront settings → Environments and variables, then redeploy.',
  );
}
