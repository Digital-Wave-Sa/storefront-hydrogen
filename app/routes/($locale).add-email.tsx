import {
  data,
  redirect,
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from 'react-router';
import {useIsEn} from '~/lib/i18n';
import {
  resolveLoggedInCustomer,
  saveCustomerEmail,
} from '~/lib/customer-email.server';
import {needsRealEmail} from '~/lib/needs-email';

import {pageTitle} from '~/lib/seo';
export const meta: MetaFunction = ({matches}) => {
  return [{title: pageTitle(matches, 'Add your email', 'أضف بريدك الإلكتروني')}];
};

/**
 * Where to go after saving: a path on this site, never another host.
 *
 * The checkout gate used to pass its full `request.url`, and the page sent
 * people to whatever `redirectTo` said — a link to /add-email?redirectTo=
 * https://elsewhere was an open redirect. Anything that is not a local path
 * falls back to the account page.
 */
function safeRedirectTo(raw: string | null | undefined, isEn: boolean): string {
  const fallback = isEn ? '/en/account' : '/account';
  if (!raw) return fallback;
  let value = String(raw).trim();
  if (/^https?:\/\//i.test(value)) {
    try {
      const u = new URL(value);
      value = u.pathname + u.search;
    } catch {
      return fallback;
    }
  }
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return fallback;
  }
  if (/^\/(en\/)?add-email/.test(value)) return fallback;
  return value;
}

/**
 * A one-field step that collects a real email from a signed-in customer whose
 * account only has a placeholder (the phone-OTP login creates those). The
 * checkout gate sends people here with `?redirectTo=<where they were going>`
 * and this page returns them there once the email is saved.
 */
export async function loader({context, request}: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const isEn = context.storefront.i18n.language === 'EN';
  const redirectTo = safeRedirectTo(url.searchParams.get('redirectTo'), isEn);

  const customer = await resolveLoggedInCustomer(context);

  // Not signed in → send to login, then back here.
  if (!customer) {
    const here = url.pathname + url.search;
    const loginPath = isEn ? '/en/account/login' : '/account/login';
    return redirect(`${loginPath}?redirectTo=${encodeURIComponent(here)}`);
  }

  // Already has a usable email → nothing to do, carry on.
  if (!needsRealEmail(customer.currentEmail)) {
    return redirect(redirectTo);
  }

  return data({redirectTo});
}

export async function action({context, request}: ActionFunctionArgs) {
  const isEn = context.storefront.i18n.language === 'EN';
  const form = await request.formData();
  const email = String(form.get('email') || '');
  const redirectTo = safeRedirectTo(String(form.get('redirectTo') || ''), isEn);

  const customer = await resolveLoggedInCustomer(context);
  if (!customer) {
    const loginPath = isEn ? '/en/account/login' : '/account/login';
    return redirect(loginPath);
  }

  const result = await saveCustomerEmail(context, customer.numericId, email);

  if (!result.ok) {
    const message =
      result.code === 'in_use'
        ? isEn
          ? 'That email is already used by another account. Please use a different one.'
          : 'هذا البريد مستخدم في حساب آخر. يرجى استخدام بريد آخر.'
        : result.code === 'server'
          ? isEn
            ? 'We could not save your email right now. Please try again.'
            : 'تعذّر حفظ البريد حالياً. يرجى المحاولة مرة أخرى.'
          : isEn
            ? 'Please enter a valid email address.'
            : 'يرجى إدخال بريد إلكتروني صحيح.';
    return data({error: message, redirectTo});
  }

  // Saved — commit the session (it now holds the real email) and continue.
  return redirect(redirectTo, {
    headers: {'Set-Cookie': await context.session.commit()},
  });
}

export default function AddEmailPage() {
  const {redirectTo} = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isEn = useIsEn();
  const submitting = navigation.state === 'submitting';

  return (
    <div
      dir={isEn ? 'ltr' : 'rtl'}
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          background: 'var(--color-surface, #fff)',
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: '16px',
          padding: '28px 24px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
        }}
      >
        <h1 style={{fontSize: '20px', fontWeight: 700, margin: '0 0 8px'}}>
          {isEn ? 'Add your email' : 'أضف بريدك الإلكتروني'}
        </h1>
        <p style={{fontSize: '14px', lineHeight: 1.6, color: '#555', margin: '0 0 20px'}}>
          {isEn
            ? 'We need a valid email to send your order confirmation and updates. This is a one-time step to complete your purchase.'
            : 'نحتاج بريداً إلكترونياً صحيحاً لإرسال تأكيد الطلب والتحديثات. هذه خطوة لمرة واحدة لإتمام طلبك.'}
        </p>

        {/*
          A full-page submit, not a client-side one. Where this page sends
          people next is /checkout/initiate — a route with no page of its own
          that answers with a redirect to Shopify's checkout on another domain.
          Submitted client-side, React Router tried to follow that redirect
          inside the app, and the shopper was left on this page after «حفظ
          ومتابعة» with their email saved but nowhere to go. The browser
          follows the chain itself this way.
        */}
        <Form method="POST" reloadDocument style={{display: 'flex', flexDirection: 'column', gap: '14px'}}>
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <input
            type="email"
            name="email"
            required
            autoFocus
            inputMode="email"
            dir="ltr"
            placeholder={isEn ? 'you@example.com' : 'you@example.com'}
            style={{
              width: '100%',
              padding: '12px 14px',
              fontSize: '15px',
              border: '1px solid rgba(0,0,0,0.15)',
              borderRadius: '10px',
              outline: 'none',
            }}
          />

          {actionData?.error ? (
            <p style={{color: '#c0392b', fontSize: '13px', margin: 0}}>
              {actionData.error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              padding: '13px 16px',
              fontSize: '15px',
              fontWeight: 700,
              color: '#fff',
              background: submitting ? '#9a7b52' : 'var(--color-primary, #7a5c2e)',
              border: 'none',
              borderRadius: '10px',
              cursor: submitting ? 'default' : 'pointer',
            }}
          >
            {submitting
              ? isEn
                ? 'Saving...'
                : 'جاري الحفظ...'
              : isEn
                ? 'Save & continue'
                : 'حفظ ومتابعة'}
          </button>
        </Form>
      </div>
    </div>
  );
}
