import { data, redirect, type ActionFunctionArgs, type LoaderFunctionArgs} from 'react-router';
import {Form, Link, useActionData, useRouteLoaderData} from 'react-router';
import {Button} from '~/components/layout/Button';
import { getAdminToken } from '~/lib/shopify-admin.server';

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
  const email = form.has('email') ? String(form.get('email')).trim().toLowerCase() : null;

  if (request.method !== 'POST') {
    return data({error: 'Method not allowed'}, {status: 405});
  }

  try {
    if (!email) {
      throw new Error('Please provide an email.');
    }

    // DEBUG STEP: Check Admin API first to see if customer exists
    const adminToken = await getAdminToken(env);
    if (adminToken) {
      const adminResponse = await fetch(`https://${env.PUBLIC_STORE_DOMAIN}/admin/api/2024-01/customers/search.json?query=email:${email}`, {
        headers: {
          'X-Shopify-Access-Token': adminToken,
          'Content-Type': 'application/json',
        },
      });
      const adminData = await adminResponse.json();
      
      if (!adminData.customers || adminData.customers.length === 0) {
        throw new Error(`Admin check: No customer found with email "${email}" in Shopify database.`);
      }

      const customer = adminData.customers[0];
      if (customer.state === 'disabled') {
        throw new Error('This account is disabled. Please contact support.');
      }
    }
    
    const {customerRecover} = await storefront.mutate(CUSTOMER_RECOVER_MUTATION, {
      variables: {email},
    });

    console.log('[DEBUG] Storefront Recover Response:', JSON.stringify(customerRecover));

    if (customerRecover?.customerUserErrors?.length > 0) {
      throw new Error(customerRecover.customerUserErrors[0].message);
    }

    return data({resetRequested: true});
  } catch (error: unknown) {
    return data({
      error: error instanceof Error ? error.message : 'Failed to send reset link', 
      resetRequested: false
    }, {status: 400});
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
          <Link to={isEn ? "/en" : "/"}>
            <img src="/logo.svg" alt="Saadeddin" className="otp-logo luxury-logo" />
          </Link>
          
          {action?.resetRequested ? (
            <>
              <h1 className="luxury-title">{isEn ? 'Request Sent' : 'تم إرسال الطلب'}</h1>
              <p className="luxury-subtitle">
                {isEn 
                  ? 'If that email address is in our system, you will receive instructions shortly.' 
                  : 'إذا كان البريد الإلكتروني مسجلاً لدينا، فستصلك تعليمات استعادة كلمة المرور قريباً.'}
              </p>
              <div className="mt-8">
                <Link to={isEn ? "/en/account/login" : "/account/login"}>
                   <Button variant="primary" fullWidth size="lg" className="luxury-submit">
                     {isEn ? 'Return to Login' : 'العودة لتسجيل الدخول'}
                   </Button>
                </Link>
              </div>
            </>
          ) : (
            <>
              <h1 className="luxury-title">{isEn ? 'Forgot Password' : 'نسيت كلمة المرور'}</h1>
              <p className="luxury-subtitle">
                {isEn 
                  ? 'Enter your email to receive a password reset link' 
                  : 'أدخل بريدك الإلكتروني لإرسال رابط استعادة كلمة المرور'}
              </p>

              <Form method="POST" className="otp-form luxury-form animate-fade-in mt-6">
                <div className="luxury-field">
                  <label className="luxury-label">{isEn ? 'Email' : 'البريد الإلكتروني'}</label>
                  <input
                    autoFocus
                    name="email"
                    placeholder={isEn ? "Email address" : "البريد الإلكتروني"}
                    required
                    type="email"
                    className="otp-input-field luxury-input-field"
                  />
                </div>

                {action?.error && (
                  <p className="error-text luxury-error mt-4">
                    {action.error}
                  </p>
                )}

                <Button type="submit" variant="primary" fullWidth size="lg" className="luxury-submit mt-8">
                  {isEn ? 'Request Reset Link' : 'إرسال رابط الاستعادة'}
                </Button>
                
                <div className="luxury-footer mt-6">
                  <p>
                    <Link to={isEn ? "/en/account/login" : "/account/login"}>
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





