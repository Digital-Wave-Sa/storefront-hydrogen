import {
  data,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from 'react-router';
import {Form, Link, useActionData, useRouteLoaderData} from 'react-router';
import {Button} from '~/components/layout/Button';
import {getAdminToken} from '~/lib/shopify-admin.server';

type ActionResponse = {
  error?: string;
  resetRequested?: boolean;
};

export async function loader({context}: LoaderFunctionArgs) {
  const customerAccessToken = await context.session.get('customerAccessToken');
  if (customerAccessToken) {
    return redirect('/account');
  }

  return data({});
}

export async function action({request, context}: ActionFunctionArgs) {
  const {storefront, env} = context;
  const form = await request.formData();
  const email = form.has('email')
    ? String(form.get('email')).trim().toLowerCase()
    : null;

  if (request.method !== 'POST') {
    return data({error: 'Method not allowed'}, {status: 405});
  }

  if (!email) {
    return data(
      {error: 'Please provide an email.', resetRequested: false},
      {status: 400},
    );
  }

  /**
   * Every outcome past this point answers the visitor the same way.
   *
   * This route used to return "Admin check: No customer found with email
   * <address> in Shopify database" straight to the browser, which turned the
   * forgot-password form into a membership oracle: submit an address, read the
   * reply, learn whether that person shops here. One request per address, no
   * rate limit. The disabled-account message leaked the same way, and both
   * exposed internal wording to customers.
   *
   * The success copy was already written neutrally ("If that email address is
   * in our system..."); these two paths defeated it. The reason now lives in
   * the server log — without the address in it — and the visitor sees the same
   * screen whichever way it went.
   */
  const neutral = () => data({resetRequested: true});

  try {
    // Confirm the account exists and is usable before asking Shopify to send
    // a reset link.
    const adminToken = await getAdminToken(env);
    if (adminToken) {
      const adminResponse = await fetch(
        `https://${env.PUBLIC_STORE_DOMAIN}/admin/api/2024-01/customers/search.json?query=${encodeURIComponent(
          `email:${email}`,
        )}`,
        {
          headers: {
            'X-Shopify-Access-Token': adminToken,
            'Content-Type': 'application/json',
          },
        },
      );
      const adminData = (await adminResponse.json()) as any;

      /**
       * The customer whose email actually equals the one submitted.
       *
       * This took the first row of a fuzzy Shopify search and read `state` off
       * it, so the "is this account disabled" check could be answered by a
       * different customer entirely. Shopify's customer search matches on more
       * than exact email.
       */
      const wantedEmail = email.trim().toLowerCase();
      const customer = (adminData.customers || []).find(
        (c: any) => (c?.email || '').toLowerCase() === wantedEmail,
      );

      if (!customer) {
        console.warn(
          '[Recover] No Shopify customer matches the submitted address; answering neutrally.',
        );
        return neutral();
      }

      if (customer.state === 'disabled') {
        console.warn(
          `[Recover] Customer ${customer.id} is disabled; no reset link sent.`,
        );
        return neutral();
      }
    }

    const {customerRecover} = (await storefront.mutate(
      CUSTOMER_RECOVER_MUTATION,
      {
        variables: {email},
      },
    )) as any;

    if (customerRecover?.customerUserErrors?.length) {
      console.warn(
        '[Recover] customerRecover returned errors:',
        customerRecover.customerUserErrors,
      );
    }

    return neutral();
  } catch (error: unknown) {
    console.error('[Recover] Failed to process a reset request:', error);
    return neutral();
  }
}

export default function Recover() {
  const action = useActionData<ActionResponse>();
  const rootData = useRouteLoaderData('root') as any;
  const locale = rootData?.consent?.language?.toLowerCase() || 'ar';
  const isEn = locale === 'en';

  return (
    <div className="otp-login-container luxury-bg" dir={isEn ? 'ltr' : 'rtl'}>
      <div className="otp-login-card luxury-card">
        <div className="otp-login-header">
          <Link to={isEn ? '/en' : '/'}>
            <img
              src="/logo.svg"
              alt="Saadeddin"
              className="otp-logo luxury-logo"
            />
          </Link>

          {action?.resetRequested ? (
            <>
              <h1 className="luxury-title">
                {isEn ? 'Request Sent' : 'تم إرسال الطلب'}
              </h1>
              <p className="luxury-subtitle">
                {isEn
                  ? 'If that email address is in our system, you will receive instructions shortly.'
                  : 'إذا كان البريد الإلكتروني مسجلاً لدينا، فستصلك تعليمات استعادة كلمة المرور قريباً.'}
              </p>
              <div className="mt-8">
                <Link to={isEn ? '/en/account/login' : '/account/login'}>
                  <Button
                    variant="primary"
                    fullWidth
                    size="lg"
                    className="luxury-submit"
                  >
                    {isEn ? 'Return to Login' : 'العودة لتسجيل الدخول'}
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <>
              <h1 className="luxury-title">
                {isEn ? 'Forgot Password' : 'نسيت كلمة المرور'}
              </h1>
              <p className="luxury-subtitle">
                {isEn
                  ? 'Enter your email to receive a password reset link'
                  : 'أدخل بريدك الإلكتروني لإرسال رابط استعادة كلمة المرور'}
              </p>

              <Form
                method="POST"
                className="otp-form luxury-form animate-fade-in mt-6"
              >
                <div className="luxury-field">
                  <label className="luxury-label">
                    {isEn ? 'Email' : 'البريد الإلكتروني'}
                  </label>
                  <input
                    autoFocus
                    name="email"
                    placeholder={isEn ? 'Email address' : 'البريد الإلكتروني'}
                    required
                    type="email"
                    className="otp-input-field luxury-input-field"
                  />
                </div>

                {action?.error && (
                  <p className="error-text luxury-error mt-4">{action.error}</p>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  size="lg"
                  className="luxury-submit mt-8"
                >
                  {isEn ? 'Request Reset Link' : 'إرسال رابط الاستعادة'}
                </Button>

                <div className="luxury-footer mt-6">
                  <p>
                    <Link to={isEn ? '/en/account/login' : '/account/login'}>
                      {isEn ? '← Back to Login' : '← العودة لتسجيل الدخول'}
                    </Link>
                  </p>
                </div>
              </Form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Simplified mutation to avoid market-context lock
const CUSTOMER_RECOVER_MUTATION = `#graphql
  mutation customerRecover($email: String!) {
    customerRecover(email: $email) {
      customerUserErrors {
        code
        field
        message
      }
    }
  }
` as const;
