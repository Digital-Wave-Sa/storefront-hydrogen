import type {LoaderFunctionArgs} from 'react-router';

/**
 * The signed-in company's own details, for /account/profile.
 *
 * The profile page has no loader on purpose — it renders from the account
 * layout's outlet context so that moving between account pages costs no
 * round trip. The company fields live in customer metafields, which that
 * context does not carry, so the page asks for them here, and only when the
 * account is a company one.
 *
 * Identity comes from the session and nothing else. There is no customer id
 * parameter to pass: the caller can only ever read their own company details.
 * Saving goes through the profile action, not here.
 */
export async function loader({context}: LoaderFunctionArgs) {
  try {
    const {resolveLoggedInCustomer} = await import(
      '~/lib/customer-email.server'
    );
    const self = await resolveLoggedInCustomer(context);
    if (!self?.numericId) {
      return Response.json({success: false, error: 'Not signed in'}, {status: 401});
    }

    const {readCompanyProfile} = await import('~/lib/b2b-profile.server');
    const company = await readCompanyProfile(context.env, self.numericId);

    return Response.json(
      {success: true, company},
      {headers: {'Cache-Control': 'private, no-store'}},
    );
  } catch (e: any) {
    console.error('[B2B] Company profile read failed:', e?.message || e);
    return Response.json(
      {success: false, error: 'Unavailable'},
      {status: 503},
    );
  }
}
