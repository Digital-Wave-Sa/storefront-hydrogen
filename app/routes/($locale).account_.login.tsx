import { useState, useEffect, useRef } from 'react';
import { data, redirect, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from 'react-router';
import { Form, Link, useActionData, useNavigation, useRouteLoaderData, useLoaderData } from 'react-router';
import { LogoSplash } from '~/components/LogoSplash';
import { SaadeddinApi } from '~/lib/saadeddin-api.server';
import { derivePassword } from '~/lib/auth.server';

export const meta: MetaFunction<typeof loader> = () => {
  return [{ title: 'Login | Saadeddin' }];
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const customerAccessToken = await context.session.get('customerAccessToken');
  const saadeddinToken = await context.session.get('saadeddinToken');
  const url = new URL(request.url);
  const redirectTo = url.searchParams.get('redirectTo') || '';

  if (customerAccessToken && saadeddinToken) {
    return redirect(redirectTo && redirectTo.startsWith('/') ? redirectTo : '/account');
  }

  // Recover active OTP cooldown/phone session state on page refresh
  const cooldown = await context.session.get('loginOtpCooldown');
  const phone = await context.session.get('loginOtpPhone');
  let remainingSeconds = 0;
  if (cooldown && Date.now() < cooldown) {
    remainingSeconds = Math.ceil((cooldown - Date.now()) / 1000);
  }

  const blockUntil = await context.session.get('loginOtpBlockUntil');
  let remainingBlockSeconds = 0;
  if (blockUntil && Date.now() < blockUntil) {
    remainingBlockSeconds = Math.ceil((blockUntil - Date.now()) / 1000);
  }

  return data({
    otpPhone: remainingSeconds > 0 ? phone : null,
    otpCooldownRemaining: remainingSeconds > 0 ? remainingSeconds : 0,
    otpBlockRemaining: remainingBlockSeconds > 0 ? remainingBlockSeconds : 0,
    otpVerifyCooldownRemaining: 0,
    redirectTo
  });
}

// Keeping the GraphQL mutation for fallback if needed
const LOGIN_MUTATION = `#graphql
  mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
    customerAccessTokenCreate(input: $input) {
      customerUserErrors {
        code
        field
        message
      }
      customerAccessToken {
        accessToken
        expiresAt
      }
    }
  }
`;

function formatOtpError(errorMessage: string, lang: 'en' | 'ar'): string {
  if (!errorMessage) {
    return lang === 'en' ? 'Invalid verification code.' : 'رمز التحقق غير صحيح.';
  }

  const lowercaseMsg = errorMessage.toLowerCase();
  const numberMatch = errorMessage.match(/\d+/);
  const attempts = numberMatch ? numberMatch[0] : '2';

  if (
    lowercaseMsg.includes('invalid code') ||
    lowercaseMsg.includes('incorrect code') ||
    lowercaseMsg.includes('invalid verification code') ||
    lowercaseMsg.includes('incorrect verification code') ||
    lowercaseMsg.includes('otp')
  ) {
    if (lang === 'en') {
      return `Invalid code. You have ${attempts} attempts remaining`;
    } else {
      return `الرمز غير صحيح — تبقى لك ${attempts} محاولة`;
    }
  }

  return errorMessage;
}

function translateOtpErrorMessage(msg: string, lang: 'en' | 'ar'): string {
  if (!msg) return '';

  // Extract inner message if backend returned "SMS gateway returned XXX: <json or message>"
  let cleanMsg = msg;
  const gatewayMatch = msg.match(/SMS gateway returned \d+:\s*(.*)/i);
  if (gatewayMatch) {
    cleanMsg = gatewayMatch[1];
    try {
      const parsed = JSON.parse(cleanMsg);
      if (parsed.message) cleanMsg = parsed.message;
      else if (parsed.error) cleanMsg = parsed.error;
    } catch { }
  }

  const lowerMsg = cleanMsg.toLowerCase();

  // 1. Rate limiting matches MUST come first!
  const minutesMatch = cleanMsg.match(/please\s+wait\s+(\d+)\s+minutes?\s+before\s+requesting/i);
  if (minutesMatch) {
    const mins = minutesMatch[1];
    if (mins === '1') {
      return lang === 'en' ? 'Please wait 1 minute before requesting a new code.' : 'يرجى الانتظار دقيقة واحدة قبل طلب رمز تحقق جديد.';
    } else if (mins === '2') {
      return lang === 'en' ? 'Please wait 2 minutes before requesting a new code.' : 'يرجى الانتظار دقيقتين قبل طلب رمز تحقق جديد.';
    } else {
      return lang === 'en' ? `Please wait ${mins} minutes before requesting a new code.` : `يرجى الانتظار ${mins} دقائق قبل طلب رمز تحقق جديد.`;
    }
  }

  const secondsMatch = cleanMsg.match(/please\s+wait\s+(\d+)\s+seconds?\s+before\s+requesting/i);
  if (secondsMatch) {
    const secs = secondsMatch[1];
    return lang === 'en' ? `Please wait ${secs} seconds before requesting a new code.` : `يرجى الانتظار ${secs} ثانية قبل طلب رمز تحقق جديد.`;
  }

  // 2. Specific error matches
  if (lowerMsg.includes('invalid phone') || lowerMsg.includes('phone_number')) {
    return lang === 'en'
      ? 'Invalid phone number format. Please check the number and try again.'
      : 'رقم الجوال غير صحيح. يرجى التحقق من الرقم والمحاولة مرة أخرى.';
  }

  if (lowerMsg.includes('invalid otp') || lowerMsg.includes('otp is invalid') || lowerMsg.includes('incorrect otp')) {
    return lang === 'en' ? 'Invalid verification code.' : 'رمز التحقق غير صحيح.';
  }
  if (lowerMsg.includes('otp expired') || lowerMsg.includes('otp has expired')) {
    return lang === 'en' ? 'Verification code expired. Please request a new code.' : 'انتهت صلاحية رمز التحقق. يرجى طلب رمز جديد.';
  }
  if (lowerMsg.includes('too many attempts') || lowerMsg.includes('too many failed')) {
    return lang === 'en' ? 'Too many failed attempts. Please try again later.' : 'لقد تجاوزت الحد الأقصى للمحاولات. يرجى المحاولة بعد قليل.';
  }
  if (lowerMsg.includes('not found') || lowerMsg.includes('not exist')) {
    return lang === 'en' ? 'Account not found. Please register.' : 'الحساب غير موجود. يرجى إنشاء حساب جديد.';
  }
  if (lowerMsg.includes('already registered') || lowerMsg.includes('already exists')) {
    return lang === 'en' ? 'This phone number is already registered.' : 'رقم الجوال هذا مسجل بالفعل.';
  }

  // 3. Fallback for hard gateway failure ONLY
  if (
    lowerMsg.includes('gateway dispatch failed') ||
    lowerMsg.includes('service unavailable') ||
    lowerMsg.includes('dispatch failed') ||
    lowerMsg.includes('gateway failed')
  ) {
    return lang === 'en'
      ? 'SMS service is temporarily unavailable. Please try again in a few moments.'
      : 'خدمة الرسائل القصيرة غير متاحة حالياً. يرجى المحاولة بعد قليل.';
  }

  return cleanMsg;
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { storefront, session, env } = context;
  const form = await request.formData();
  const intent = form.get('intent');
  const lang = storefront.i18n.language === 'EN' ? 'en' : 'ar';

  // Check if they are blocked due to too many failed OTP attempts
  const blockUntil = session.get('loginOtpBlockUntil');
  if (blockUntil && Date.now() < blockUntil) {
    const waitSecs = Math.ceil((blockUntil - Date.now()) / 1000);
    return data({
      error: lang === 'en'
        ? `Too many failed attempts. Please try again after ${Math.ceil(waitSecs / 60)} minutes.`
        : `لقد تجاوزت الحد الأقصى للمحاولات. يرجى المحاولة بعد ${Math.ceil(waitSecs / 60)} دقيقة.`,
      isBlocked: true,
      blockRemaining: waitSecs
    });
  }

  if (intent === 'send-otp') {
    session.set('loginOtpAttempts', 0);
    session.unset('loginOtpLastFailedAttemptAt');
    const phone = String(form.get('phone') || '');
    const countryCode = String(form.get('countryCode') || '+966');
    let cleanPhone = phone.replace(/\D/g, '');
    const countryDigits = countryCode.replace(/\D/g, ''); // e.g. "966" from "+966"

    // Strip international prefix variations to get the local number only
    if (cleanPhone.startsWith('00' + countryDigits)) {
      cleanPhone = cleanPhone.substring(2 + countryDigits.length);
    } else if (cleanPhone.startsWith(countryDigits)) {
      cleanPhone = cleanPhone.substring(countryDigits.length);
    }
    if (cleanPhone.startsWith('0')) {
      cleanPhone = cleanPhone.substring(1);
    }

    const fullPhone = `${countryCode}${cleanPhone}`;

    // Cooldown Throttle Check (60 seconds)
    const cooldown = session.get('loginOtpCooldown');
    if (cooldown && Date.now() < cooldown) {
      const waitSecs = Math.ceil((cooldown - Date.now()) / 1000);
      return data({
        error: lang === 'en'
          ? `Please wait ${waitSecs} seconds before requesting another code.`
          : `يرجى الانتظار ${waitSecs} ثانية قبل طلب رمز تحقق جديد.`,
      });
    }

    try {
      // Try to send OTP via Custom CRM API
      try {
        const api = new SaadeddinApi(env);
        await api.requestOtp(fullPhone, 'login');
      } catch (otpErr: any) {
        const msg = otpErr.message || '';
        const status = (otpErr as any).status;
        const apiData = (otpErr as any).data;
        console.error('[Login] OTP send failed:', {
          phone: fullPhone,
          error: msg,
          status,
          apiData,
          apiUrl: env.CUSTOM_API_URL || 'https://api.saadeddin.top (default)'
        });
        // If the error indicates account doesn't exist, show that message
        if (msg.toLowerCase().includes('not found') || msg.includes('غير موجود') || msg.toLowerCase().includes('not exist')) {
          return data({
            error: lang === 'en' ? 'Account not found. Please register.' : 'الحساب غير موجود. يرجى إنشاء حساب جديد.',
            notRegistered: true
          });
        }
        // Return the actual API error message to the user so it's easier to diagnose
        const displayError = translateOtpErrorMessage(msg, lang) || (lang === 'en' ? 'Failed to send verification code. Please try again.' : 'فشل إرسال رمز التحقق. يرجى المحاولة مرة أخرى.');
        return data({ error: displayError });
      }

      session.set('loginOtpPhone', fullPhone);
      session.set('loginOtpCooldown', Date.now() + 60 * 1000);
      return data(
        { success: true, step: 'otp', phone: fullPhone },
        { headers: { 'Set-Cookie': await session.commit() } }
      );
    } catch (e: any) {
      console.error('[Login] send-otp error:', e);
      return data({ error: lang === 'en' ? 'An unexpected error occurred. Please try again.' : 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.' });
    }
  }

  if (intent === 'verify-otp') {
    const otp = String(form.get('otp') || '');
    const savedPhone = session.get('loginOtpPhone') || '';
    const email = session.get('loginCustomerEmail');
    const customerId = session.get('loginCustomerId');

    if (!otp || !savedPhone) {
      return data({ error: lang === 'en' ? 'Invalid request. Please restart the login process.' : 'طلب غير صالح. يرجى إعادة تسجيل الدخول.' });
    }

    // Check verification cooldown
    const lastFailed = session.get('loginOtpLastFailedAttemptAt');
    if (lastFailed && Date.now() - lastFailed < 60 * 1000) {
      const waitSecs = Math.ceil((60 * 1000 - (Date.now() - lastFailed)) / 1000);
      return data({
        error: lang === 'en'
          ? `Please wait ${waitSecs} seconds before trying again.`
          : `يرجى الانتظار ${waitSecs} ثانية قبل المحاولة مرة أخرى.`,
        verifyCooldownRemaining: waitSecs
      });
    }

    let saadeddinToken: string | null = null;
    let customLogin: any = null;

    try {
      const api = new SaadeddinApi(env);
      customLogin = await api.login(savedPhone, otp);

      if (customLogin?.token) {
        saadeddinToken = customLogin.token;
        if (customLogin.profile) {
          const profile = customLogin.profile;
          if (profile.email) {
            session.set('loginCustomerEmail', profile.email);
          }
          if (profile.shopifyId) {
            const id = profile.shopifyId.split('/').pop();
            session.set('loginCustomerId', id);
          }
        }
      } else {
        throw new Error(lang === 'en' ? 'Invalid verification code.' : 'رمز التحقق غير صحيح.');
      }
    } catch (apiErr: any) {
      console.error('[Login] Custom API verification failed:', apiErr);
      const attempts = (session.get('loginOtpAttempts') || 0) + 1;
      session.set('loginOtpLastFailedAttemptAt', Date.now());

      if (attempts >= 3) {
        session.set('loginOtpBlockUntil', Date.now() + 30 * 60 * 1000);
        session.set('loginOtpAttempts', 0);
        session.unset('loginOtpLastFailedAttemptAt');
        return data(
          {
            error: lang === 'en'
              ? 'Too many failed attempts. Please try again after 30 minutes.'
              : 'الحساب مقفل مؤقتاً بعد 3 محاولات فاشلة.',
            isBlocked: true,
            blockRemaining: 30 * 60
          },
          { headers: { 'Set-Cookie': await session.commit() } }
        );
      } else {
        session.set('loginOtpAttempts', attempts);
        const remaining = 3 - attempts;
        return data(
          {
            error: lang === 'en'
              ? `Invalid code. You have ${remaining} attempts remaining.`
              : `الرمز غير صحيح — تبقى لك ${remaining} محاولة`,
            verifyCooldownRemaining: 60
          },
          { headers: { 'Set-Cookie': await session.commit() } }
        );
      }
    }

    // Step 2: Create a real Shopify session
    try {
      const stablePassword = await derivePassword(savedPhone, env.SESSION_SECRET || 'saadeddin-otp-secret');
      let email = session.get('loginCustomerEmail') || customLogin?.profile?.email || null;
      const crmShopifyId = customLogin?.profile?.shopifyId; // may be stale
      const profileName = customLogin?.profile?.name || '';
      const accountType = customLogin?.profile?.accountType || 'INDIVIDUAL';

      const { getAdminToken } = await import('~/lib/shopify-admin.server');
      const adminToken = await getAdminToken(env);

      let resolvedCustomerId: string | null = null;
      let resolvedEmail: string | null = email;

      if (adminToken) {
        // ── 1. If CRM gave us a shopifyId, verify it actually exists ────────
        if (crmShopifyId) {
          const numericId = crmShopifyId.split('/').pop();
          console.log('[Login] Verifying CRM shopifyId in Shopify Admin:', numericId);
          const verifyRes = await fetch(
            `https://${env.PUBLIC_STORE_DOMAIN}/admin/api/2024-01/customers/${numericId}.json?fields=id,email`,
            { headers: { 'X-Shopify-Access-Token': adminToken } }
          );
          if (verifyRes.ok) {
            const verifyData = await verifyRes.json() as any;
            resolvedCustomerId = numericId!;
            resolvedEmail = verifyData.customer?.email || resolvedEmail;
            console.log('[Login] shopifyId verified ✅:', resolvedCustomerId, resolvedEmail);
          } else {
            console.warn('[Login] CRM shopifyId is stale (customer deleted/not found in Shopify):', numericId, '— will search by phone');
          }
        }

        // ── 2. If not found by ID, search by phone ───────────────────────────
        if (!resolvedCustomerId) {
          console.log('[Login] Searching Shopify Admin by phone:', savedPhone);
          const searchRes = await fetch(
            `https://${env.PUBLIC_STORE_DOMAIN}/admin/api/2024-01/customers/search.json?query=phone:"${encodeURIComponent(savedPhone)}"&fields=id,email`,
            { headers: { 'X-Shopify-Access-Token': adminToken } }
          );
          if (searchRes.ok) {
            const searchData = await searchRes.json() as any;
            const found = searchData.customers?.[0];
            if (found) {
              resolvedCustomerId = String(found.id);
              resolvedEmail = found.email || resolvedEmail;
              console.log('[Login] Found by phone search ✅:', resolvedCustomerId, resolvedEmail);
            }
          }
        }

        // ── 3. If still not found, create the customer in Shopify ────────────
        if (!resolvedCustomerId) {
          console.log('[Login] Customer not in Shopify — creating via Admin API');
          const nameParts = profileName.trim().split(/\s+/);
          const firstName = nameParts[0] || 'Customer';
          const lastName = nameParts.slice(1).join(' ') || '(N/A)';
          const createEmail = resolvedEmail || `${savedPhone.replace(/\D/g, '')}@saadeddin.placeholder`;

          const createRes = await fetch(
            `https://${env.PUBLIC_STORE_DOMAIN}/admin/api/2024-01/customers.json`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': adminToken },
              body: JSON.stringify({
                customer: {
                  first_name: firstName,
                  last_name: lastName,
                  phone: savedPhone,
                  email: createEmail,
                  password: stablePassword,
                  password_confirmation: stablePassword,
                  tags: accountType === 'COMPANY' ? 'verified_phone, B2B' : 'verified_phone',
                  verified_email: true,
                }
              })
            }
          );

          if (createRes.ok) {
            const createData = await createRes.json() as any;
            resolvedCustomerId = String(createData.customer?.id);
            resolvedEmail = createData.customer?.email || createEmail;
            console.log('[Login] Shopify customer created ✅:', resolvedCustomerId);
          } else {
            const errText = await createRes.text();
            console.error('[Login] Customer creation failed:', createRes.status, errText);

            // Last resort: try searching by email
            if (resolvedEmail) {
              const emailSearchRes = await fetch(
                `https://${env.PUBLIC_STORE_DOMAIN}/admin/api/2024-01/customers/search.json?query=email:"${encodeURIComponent(resolvedEmail)}"&fields=id,email`,
                { headers: { 'X-Shopify-Access-Token': adminToken } }
              );
              if (emailSearchRes.ok) {
                const emailSearchData = await emailSearchRes.json() as any;
                const found = emailSearchData.customers?.[0];
                if (found) {
                  resolvedCustomerId = String(found.id);
                  resolvedEmail = found.email || resolvedEmail;
                  console.log('[Login] Found by email search (fallback) ✅:', resolvedCustomerId);
                }
              }
            }
          }
        }

        // ── 4. Reset password to stablePassword so Storefront login works ───
        if (resolvedCustomerId) {
          console.log('[Login] Resetting Shopify password for customer:', resolvedCustomerId);
          await fetch(
            `https://${env.PUBLIC_STORE_DOMAIN}/admin/api/2024-01/customers/${resolvedCustomerId}.json`,
            {
              method: 'PUT',
              headers: { 'X-Shopify-Access-Token': adminToken, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                customer: { id: resolvedCustomerId, password: stablePassword, password_confirmation: stablePassword }
              })
            }
          );
        }
      }

      // ── 5. Get Shopify Storefront access token ─────────────────────────────
      const loginEmail = resolvedEmail || `${savedPhone.replace(/\D/g, '')}@saadeddin.placeholder`;
      const tokenResponse = await storefront.mutate(LOGIN_MUTATION, {
        variables: { input: { email: loginEmail, password: stablePassword } },
      });

      const token = tokenResponse.customerAccessTokenCreate?.customerAccessToken || null;

      if (token) {
        session.set('customerAccessToken', token);
        console.log('[Login] Shopify access token created ✅');
      } else {
        const sfErrors = tokenResponse.customerAccessTokenCreate?.customerUserErrors;
        console.error('[Login] Storefront token creation failed:', JSON.stringify(sfErrors));
        throw new Error('Shopify token creation failed after all recovery attempts');
      }
    } catch (shopifyErr: any) {
      console.error('[Login] Shopify session block failed:', shopifyErr?.message);
      // Return a real error — do not silently bypass
      return data({
        error: lang === 'en'
          ? 'Login succeeded but account sync failed. Please contact support.'
          : 'تم التحقق بنجاح لكن حدث خطأ في مزامنة الحساب. يرجى التواصل مع الدعم.'
      });
    }

    // Always set the CRM token and redirect regardless of Shopify session
    session.set('saadeddinToken', saadeddinToken);
    session.unset('loginCustomerEmail');
    session.unset('loginCustomerId');
    session.unset('loginOtpAttempts');
    session.unset('loginOtpBlockUntil');

    const prefLang = session.get('preferredLanguage');
    const userLang = prefLang ? prefLang : lang;

    const url = new URL(request.url);
    const rawRedirect = url.searchParams.get('redirectTo') || form.get('redirectTo') || '';
    let cleanRedirect = typeof rawRedirect === 'string' && rawRedirect.startsWith('/') ? rawRedirect : '/account';

    if (cleanRedirect.startsWith('/en/')) {
      cleanRedirect = cleanRedirect.substring(3);
    } else if (cleanRedirect === '/en') {
      cleanRedirect = '/account';
    }

    const targetRedirect = userLang === 'en' ? `/en${cleanRedirect}` : cleanRedirect;

    return redirect(targetRedirect, {
      headers: { 'Set-Cookie': await session.commit() },
    });
  }

  return data({ error: 'Invalid request' });
}

export default function Login() {
  const loaderData = useLoaderData<any>();
  const redirectTo = loaderData?.redirectTo || '';
  const initialStep = loaderData?.otpPhone ? 'otp' : 'input';
  const initialCooldown = loaderData?.otpCooldownRemaining || 0;

  let initialPhone = '';
  let initialCountryCode = '+966';
  if (loaderData?.otpPhone) {
    const matched = loaderData.otpPhone.match(/^(\+\d{1,3})(.*)$/);
    if (matched) {
      initialCountryCode = matched[1];
      initialPhone = matched[2];
    } else {
      initialPhone = loaderData.otpPhone;
    }
  }

  const actionData = useActionData<any>();
  const navigation = useNavigation();
  const rootData = useRouteLoaderData('root') as any;
  const locale = rootData?.consent?.language?.toLowerCase() || 'ar';
  const isEn = locale === 'en';
  const isLoading = navigation.state === 'submitting';

  const [step, setStep] = useState<'input' | 'otp'>(initialStep);
  const [phone, setPhone] = useState(initialPhone);
  const [countryCode, setCountryCode] = useState(initialCountryCode);
  const [otpValue, setOtpValue] = useState(['', '', '', '']);
  const otpRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null)
  ];
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(initialCooldown);
  const [blockCooldown, setBlockCooldown] = useState(loaderData?.otpBlockRemaining || 0);
  const [verifyCooldown, setVerifyCooldown] = useState(loaderData?.otpVerifyCooldownRemaining || 0);
  const resendFormRef = useRef<HTMLFormElement>(null);
  const [hasEditSinceError, setHasEditSinceError] = useState(false);

  const lastProcessedActionRef = useRef<any>(null);

  useEffect(() => {
    if (!actionData || actionData === lastProcessedActionRef.current) return;
    lastProcessedActionRef.current = actionData;

    if (actionData?.step === 'otp') {
      setStep('otp');
      setResendCooldown(60);
    }
    if (actionData?.error) {
      setHasEditSinceError(false);
      setOtpValue(['', '', '', '']);
      otpRefs[0].current?.focus();
    }
    if (actionData?.isBlocked) {
      setBlockCooldown(actionData?.blockRemaining || 30 * 60);
    }
    if (actionData?.verifyCooldownRemaining) {
      setVerifyCooldown(actionData.verifyCooldownRemaining);
    }
  }, [actionData]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (blockCooldown <= 0) return;
    const timer = setTimeout(() => setBlockCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [blockCooldown]);

  useEffect(() => {
    if (verifyCooldown <= 0) return;
    const timer = setTimeout(() => setVerifyCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [verifyCooldown]);

  const formatMMSS = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const waitMins = Math.ceil(blockCooldown / 60);
  const blockError = blockCooldown > 0
    ? (isEn
      ? `Too many failed attempts. Please try again after ${waitMins} minutes.`
      : `لقد تجاوزت الحد الأقصى للمحاولات. يرجى المحاولة بعد ${waitMins} دقيقة.`)
    : null;

  const errorToDisplay = blockError || actionData?.error;
  const showError = !!(errorToDisplay && (!hasEditSinceError || blockCooldown > 0 || verifyCooldown > 0));

  const handleResend = () => {
    setOtpValue(['', '', '', '']);
    setResendCooldown(60);
    resendFormRef.current?.requestSubmit();
  };

  const handleOTPChange = (index: number, value: string) => {
    if (value.length > 1) value = value[value.length - 1];
    const newOtp = [...otpValue];
    newOtp[index] = value;
    setOtpValue(newOtp);
    setHasEditSinceError(true);
    if (value && index < 3) otpRefs[index + 1].current?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpValue[index] && index > 0) otpRefs[index - 1].current?.focus();
  };

  const handleSocialClick = (provider: string, url: string) => {
    setLoadingProvider(provider);
    window.location.href = url;
  };

  return (
    <div className="min-h-screen bg-[#FEF8EB] flex items-center justify-center p-4 lg:p-8" dir={isEn ? 'ltr' : 'rtl'}>
      {/* Main Container */}
      <div className="w-full max-w-[1280px] flex flex-col lg:flex-row-reverse gap-6 min-h-[880px]">

        {/* Left Pane - Form Area */}
        <div className="w-full lg:w-1/2 bg-white border border-[#BBCFCD]/50 rounded-[24px] flex flex-col items-center justify-center p-6 lg:p-12 relative shadow-sm">

          {/* Main Form Container */}
          <div className="w-full flex flex-col items-center">

            {/* Header / Welcome Text */}
            <div className="flex flex-col items-center mb-6 gap-2 w-full border-b border-[#BBCFCD]/50 pb-6">
              <h1 className="text-[26px] font-bold text-[#171717] flex items-center gap-2 !my-0" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}>
                <span>{isEn ? 'Welcome Back' : 'مرحباً بعودتك'}</span>
                <span className="text-[32px]">👋</span>
              </h1>
              <p className="text-[14px] font-medium text-[#A19F9F] text-center" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                {isEn ? 'Enter your information below to log into your account' : 'أدخل المعلومات أدناه للدخول إلى حسابك'}
              </p>
            </div>

            {/* Form Box */}
            <div className="w-full flex flex-col items-center gap-4">

              {/* Tabs */}
              <div className="flex w-full gap-4 h-[48px]">
                <button className="flex-1 bg-[#234745] text-[#FEF8EB] rounded-[25px] font-bold text-[16px] transition-colors" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                  {isEn ? 'Log in' : 'تسجيل دخول'}
                </button>
                <Link to={isEn ? `/en/account/register${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}` : `/account/register${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`} className="flex-1 flex items-center justify-center bg-white border border-[#234745] text-[#234745] rounded-[25px] font-bold text-[16px] hover:bg-[#234745]/5 transition-colors" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                  {isEn ? 'Create Account' : 'إنشاء حساب'}
                </Link>
              </div>



              {blockCooldown > 0 && (
                <div className="w-full border border-[#EAD6BA] bg-[#FCF7ED] rounded-[16px] p-5 flex flex-col gap-2 text-[#8B6D43] text-sm relative mb-6" dir={isEn ? 'ltr' : 'rtl'}>
                  <div className="flex items-center gap-2 font-bold text-base">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <span>{isEn ? 'Account temporarily locked' : 'الحساب مقفل مؤقتاً'}</span>
                  </div>
                  <p className="leading-relaxed font-medium">
                    {isEn ? (
                      <>
                        After 3 failed attempts — you can try again after <span className="font-bold">{formatMMSS(blockCooldown)}</span> minutes or <Link to="/en/account/recover" className="underline font-bold hover:text-[#7A5C33]">reset password</Link>
                      </>
                    ) : (
                      <>
                        بعد ٣ محاولات فاشلة — يمكنك المحاولة مجدداً بعد <span className="font-bold">{formatMMSS(blockCooldown)}</span> دقيقة أو <Link to="/account/recover" className="underline font-bold hover:text-[#7A5C33]">إعادة تعيين كلمة المرور</Link>
                      </>
                    )}
                  </p>
                </div>
              )}

              {/* Login Steps */}
              {step === 'input' ? (
                <Form method="POST" className="w-full flex flex-col gap-6 w-full">
                  <input type="hidden" name="intent" value="send-otp" />

                  {/* Phone Input */}
                  <div className="flex flex-col gap-2 w-full">
                    <label className={`text-[12px] font-bold text-[#171717] px-1 w-full flex gap-1 ${isEn ? 'flex-row' : 'flex-row-reverse justify-end'}`} style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                      <span className="text-[#E55C5C]">*</span>
                      <span>{isEn ? 'Mobile Number' : 'رقم الجوال'}</span>
                    </label>
                    <div className="flex flex-row items-center border border-[#234745] bg-white rounded-full h-[48px] focus-within:border-[#234745] transition-colors overflow-hidden" dir="ltr">
                      <select name="countryCode" value={countryCode} onChange={e => setCountryCode(e.target.value)} disabled={blockCooldown > 0} className="bg-transparent border-none text-[#171717] font-bold text-[14px] focus:ring-0 outline-none pl-4 pr-6 py-3 appearance-none cursor-pointer disabled:opacity-50" style={{ backgroundImage: "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 0.2rem center", backgroundSize: "1.2em", width: "90px" }}>
                        <option value="+966">+966</option>
                        <option value="+971">+971</option>
                        <option value="+965">+965</option>
                        <option value="+974">+974</option>
                        <option value="+973">+973</option>
                        <option value="+968">+968</option>
                        <option value="+962">+962</option>
                      </select>
                      <div className="w-[1px] h-3/5 bg-[#BBCFCD] mx-2"></div>
                      <input
                        name="phone"
                        type="tel"
                        placeholder="5XXXXXXXXX"
                        className="flex-1 bg-transparent border-none outline-none text-[#171717] font-medium text-[14px] focus:ring-0 placeholder:text-[#BBCFCD] px-2 py-3 disabled:opacity-50"
                        style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                        required
                        disabled={blockCooldown > 0}
                      />
                    </div>
                  </div>

                  {actionData?.error && (
                    <div className="w-full border border-[#F38C8C] bg-[#FFF5F5] rounded-[12px] py-3 px-4 flex items-center gap-3 text-[#E55C5C] text-sm font-semibold justify-center" dir={isEn ? 'ltr' : 'rtl'}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                        {actionData.error}
                      </span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading || phone.length < 9 || blockCooldown > 0}
                    className="w-full bg-[#234745] text-[#FEF8EB] font-bold text-[16px] rounded-[25px] h-[48px] flex items-center justify-center hover:bg-[#1a3533] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                    style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                  >
                    {isLoading ? (
                      isEn ? 'Sending...' : 'جاري الإرسال...'
                    ) : blockCooldown > 0 ? (
                      isEn ? 'Locked' : 'مغلق'
                    ) : (
                      isEn ? 'Send Verification Code' : 'إرسال رمز التحقق'
                    )}
                  </button>
                </Form>
              ) : (
                <>
                  {/* Hidden resend form */}
                  <Form method="POST" ref={resendFormRef} className="hidden">
                    <input type="hidden" name="intent" value="send-otp" />
                    <input type="hidden" name="phone" value={phone} />
                    <input type="hidden" name="countryCode" value={countryCode} />
                  </Form>

                  <Form method="POST" className="w-full flex flex-col gap-6">
                    <input type="hidden" name="intent" value="verify-otp" />
                    <input type="hidden" name="otp" value={otpValue.join('')} />

                    <div className="flex flex-col gap-2 w-full items-center">
                      <div className="text-[14px] font-medium text-[#707070] mb-2 flex items-center justify-center gap-1 flex-wrap" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                        <span>{isEn ? 'We sent the verification code to' : 'أرسلنا رمز التحقق إلى'}</span>
                        <span className="font-bold text-[#171717]" dir="ltr">{countryCode} {phone}</span>
                        <button type="button" onClick={() => setStep('input')} disabled={blockCooldown > 0 || verifyCooldown > 0} className="text-[#234745] font-bold underline hover:text-[#1a3533] ml-1 disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed">
                          {isEn ? 'Edit' : 'تعديل'}
                        </button>
                      </div>
                      <div className="flex gap-4 justify-center" dir="ltr">
                        {otpRefs.map((ref, i) => (
                          <input
                            key={i}
                            ref={ref}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            className={`w-14 h-14 text-center border rounded-[12px] text-2xl font-bold outline-none transition-colors ${showError
                                ? 'border-[#F38C8C] text-[#E55C5C] bg-[#FFF5F5] focus:border-[#E55C5C] disabled:bg-[#FFF5F5] disabled:text-[#E55C5C] disabled:border-[#F38C8C]'
                                : 'border-[#BBCFCD] text-[#234745] focus:border-[#234745] disabled:bg-gray-50'
                              }`}
                            value={otpValue[i]}
                            onChange={(e) => handleOTPChange(i, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(i, e)}
                            autoFocus={i === 0}
                            disabled={blockCooldown > 0 || verifyCooldown > 0}
                          />
                        ))}
                      </div>
                    </div>

                    {showError && blockCooldown <= 0 && (
                      <div className="w-full border border-[#F38C8C] bg-[#FFF5F5] rounded-[12px] py-3 px-4 flex items-center gap-3 text-[#E55C5C] text-sm font-semibold justify-center" dir={isEn ? 'ltr' : 'rtl'}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                          {errorToDisplay}
                        </span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isLoading || otpValue.some(v => !v) || blockCooldown > 0 || verifyCooldown > 0}
                      className="w-full bg-[#234745] text-[#FEF8EB] font-bold text-[16px] rounded-[25px] h-[48px] flex items-center justify-center hover:bg-[#1a3533] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                      style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                    >
                      {isLoading ? (
                        isEn ? 'Verifying...' : 'جاري التحقق...'
                      ) : blockCooldown > 0 ? (
                        isEn ? 'Locked' : 'مغلق'
                      ) : verifyCooldown > 0 ? (
                        isEn ? `Wait ${verifyCooldown}s` : `تأكيد الدخول (انتظر ${verifyCooldown} ثانية)`
                      ) : (
                        isEn ? 'Verify & Login' : 'تأكيد الدخول'
                      )}
                    </button>

                    {/* Resend OTP */}
                    <div className="flex flex-col items-center gap-1">
                      {resendCooldown > 0 ? (
                        <p className="text-[#9FB7AE] text-sm font-medium" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                          {isEn ? `Resend code in ${resendCooldown}s` : `إعادة الإرسال بعد ${resendCooldown} ث`}
                        </p>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResend}
                          disabled={isLoading || blockCooldown > 0 || verifyCooldown > 0}
                          className="text-[#234745] font-bold text-sm hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                        >
                          {isEn ? 'Resend verification code' : 'إعادة إرسال رمز التحقق'}
                        </button>
                      )}
                      <button type="button" className="text-[#9FB7AE] hover:underline text-sm font-medium disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed" onClick={() => setStep('input')} disabled={blockCooldown > 0 || verifyCooldown > 0} style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                        {isEn ? 'Change Phone Number' : 'تغيير رقم الجوال'}
                      </button>
                    </div>
                  </Form>
                </>
              )}

              {/* Guest Login Section */}
              <div className="w-full flex flex-col gap-2 mt-0">
                {/* Or Divider */}
                <div className="w-full flex items-center gap-4 py-2">
                  <div className="flex-1 h-[1px] bg-[#BBCFCD]/50"></div>
                  <span className="text-[#A19F9F] text-sm font-medium" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                    {isEn ? 'or' : 'أو'}
                  </span>
                  <div className="flex-1 h-[1px] bg-[#BBCFCD]/50"></div>
                </div>

                {/* Continue as Guest Button */}
                <Link
                  to={isEn ? "/en/" : "/"}
                  className="w-full h-[52px] border border-[#234745] rounded-[12px] flex items-center justify-center hover:bg-[#234745]/5 transition-colors"
                >
                  <span className="font-bold text-[16px] text-[#9FB7AE]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                    {isEn ? 'Continue as guest' : 'متابعة كضيف'}
                  </span>
                </Link>

              </div>
            </div>
          </div>
        </div>

        {/* Right Pane - Branding Area (Hidden on Mobile) */}
        <div className="hidden lg:flex w-1/2 bg-[#234745] rounded-[24px] relative flex-col items-center justify-center overflow-hidden p-8 shadow-sm">

          {/* Back to Store Button */}
          <Link
            to={isEn ? "/en" : "/"}
            className="absolute top-8 ltr:left-8 rtl:right-8 bg-[#9FB7AE] hover:bg-[#BBCFCD] transition-colors rounded-full px-8 py-3 flex items-center gap-3 z-10"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={!isEn ? 'rotate-180' : ''}>
              <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="#234745" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="font-bold text-[18px] text-[#234745]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
              {isEn ? 'Back to store' : 'العودة للمتجر'}
            </span>
          </Link>

          {/* Logo & Subtitle Content */}
          <svg width="400" height="198" viewBox="0 0 162 81" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M96.8051 39.0407C97.271 40.0265 97.2991 41.0932 96.7087 42.7537C96.5882 43.089 96.4918 42.6204 96.4918 42.6204C96.4517 42.4224 96.3914 42.2002 96.3272 41.9861C96.1344 41.2669 95.8332 40.3255 95.4757 40.1276C95.307 40.075 95.2227 40.1558 95.2468 40.37C95.2709 40.5841 95.7769 42.2689 95.4797 43.6587C95.4155 43.9254 95.3231 44.2001 95.1906 44.4789C95.1906 44.4789 95.1906 44.4829 95.1906 44.4869C95.1906 44.495 95.1825 44.5031 95.1785 44.5112C95.0861 44.6728 95.0259 44.4991 94.9817 44.3415C94.9817 44.3415 94.9737 44.3172 94.9737 44.3051C94.5359 42.7335 93.817 41.9739 93.7246 42.4992C93.6403 43.0042 94.1584 44.1274 94.1102 45.6748C94.0299 48.0868 92.4193 48.9958 92.4193 48.9958C92.7527 46.3212 92.7406 45.4162 92.584 45.0041C92.584 44.996 92.584 44.9879 92.584 44.9839C92.584 44.8506 92.4193 44.6526 92.1462 44.4789C91.4595 44.0385 90.0698 43.7557 88.8368 45.093C87.8006 46.2161 87.6882 47.5817 87.7685 48.4908C87.7806 48.5877 87.7886 48.6807 87.8006 48.7736C87.8087 48.8261 87.8167 48.8786 87.8247 48.9271C87.877 49.1897 87.9894 49.3594 88.3669 49.2059C88.7485 49.0362 89.3549 48.9756 90.0658 49.6867C89.7204 50.0665 86.3387 53.9168 84.3185 54.5673C82.2984 55.2177 80.238 52.3532 80.0573 51.4684C79.8766 50.5876 79.2099 50.3574 79.1456 50.923C79.0773 51.4886 77.5552 54.745 76.0812 56.9267C74.6113 59.1044 70.2456 59.7993 69.607 59.8236C69.5347 59.8236 69.4584 59.8236 69.3821 59.8236C69.3339 59.8236 69.2857 59.8195 69.2415 59.8155C69.0246 59.7993 68.8118 59.7791 68.6632 59.7791C68.3298 59.7549 68.0648 59.7185 67.6431 59.6579C66.9723 59.5569 68.2174 59.9528 69.2094 60.3892C70.2737 60.878 72.3581 61.3427 74.3864 60.971C76.772 60.5387 77.768 59.4842 79.6958 54.8097C79.9649 55.7227 82.1377 58.8377 85.3106 57.8035C88.4834 56.7692 91.5478 51.925 91.5478 51.925C95.5119 52.2643 95.7368 48.0302 95.7368 48.0302C95.7368 48.0302 98.2991 46.4626 98.9458 43.384C99.5964 40.3094 96.8332 38.0751 96.8332 38.0751C96.8332 38.0751 96.3071 37.9701 96.8091 39.0327" fill="#FEF8EB"></path><path d="M86.4865 32.4348C88.3219 43.4807 85.6511 48.3694 84.9322 49.6097C84.2133 50.85 84.3458 51.6904 84.7996 51.1692C86.6551 48.9915 88.7998 44.3776 89.2336 38.9031C89.6673 33.4287 87.9323 24.5079 86.9242 19.9384C85.9162 15.3689 83.1449 0 83.1449 0C82.5947 0.0606031 81.8919 2.23827 81.6147 3.216C81.3376 4.18969 80.9521 5.7775 81.189 6.78351C81.426 7.78952 84.647 21.3889 86.4824 32.4388" fill="#FEF8EB"></path><path d="M71.2807 51.7024C75.6183 49.5974 75.6022 45.0482 75.2488 41.7796C76.4938 41.109 77.7188 38.9798 78.3212 37.6425C78.6586 36.9435 79.0281 36.8344 79.498 36.9152C79.7269 36.9556 80.0602 37.2344 80.3374 37.5092C80.5824 37.7516 80.7711 37.9697 80.8354 38.0465C80.8354 38.0465 80.8394 38.0546 80.8434 38.0546C80.8474 38.0586 80.8515 38.0627 80.8555 38.0667L80.8595 38.0748C80.8595 38.0748 81.4017 36.7698 81.7029 35.6224C81.6708 35.3234 80.3976 33.8326 79.2168 33.5336C78.032 33.2346 76.5862 36.8264 75.1644 38.2728C73.7427 39.7151 72.7346 37.5092 72.3932 37.1173C72.0518 36.7254 71.7265 38.0505 71.6422 39.6464C71.5578 41.2423 72.3531 40.9878 73.1483 42.5311C74.2246 45.3754 72.5659 47.7915 70.0959 48.2319C67.6259 48.6722 65.8186 46.1673 65.6218 44.3411C65.425 42.515 67.2484 38.0667 71.1602 32.0145C75.0721 25.9622 76.5621 20.0029 76.7027 19.3444C76.8432 18.6858 76.5219 18.4636 76.2087 19.0979C75.8914 19.7322 73.9676 23.6351 72.843 25.4774C71.7185 27.3197 69.3569 31.5256 67.4894 34.3942C65.6218 37.2587 64.1237 41.1615 64.0314 45.032C63.939 48.9066 66.9432 53.8154 71.2847 51.7105" fill="#FEF8EB"></path><path d="M94.6355 53.9323C94.6997 53.7828 94.772 53.7465 94.8965 53.8636C94.9889 53.9525 95.0893 54.0374 95.1897 54.1141C95.4106 54.2879 95.5391 54.2636 95.7118 54.0616L96.5552 52.6879C96.8283 52.3768 96.6797 51.9809 96.744 51.6294C96.8203 51.2254 96.7962 50.7971 96.6275 50.3971C96.6034 50.3446 96.6155 50.2598 96.5351 50.2638C96.4347 50.2638 96.4548 50.3527 96.4548 50.4214C96.4548 50.5426 96.4548 50.6678 96.4548 50.789C96.4548 50.789 96.4548 50.8214 96.4548 50.8375V50.991C96.4267 51.3062 96.2781 51.6375 96.1857 51.8152C96.1777 51.8274 96.1737 51.8435 96.1656 51.8557C96.1536 51.8799 96.1416 51.8961 96.1335 51.9122C96.0893 51.989 96.0452 52.0617 95.993 52.1385C95.9448 52.0375 95.8966 51.9526 95.8644 51.8637C95.8243 51.7587 95.76 51.694 95.6476 51.7102C95.503 51.7264 95.519 51.8557 95.515 51.9405C95.511 52.0981 95.515 52.2637 95.5512 52.4172C95.6114 52.6435 95.503 52.8011 95.3865 52.9586C95.3022 53.0718 95.2058 53.0879 95.0772 52.9788C94.9286 52.8455 94.7961 52.6839 94.5913 52.6152C94.4547 52.5708 94.3905 52.595 94.3182 52.7203C94.1334 53.0516 94.0531 53.4192 93.9969 53.7828C93.8402 54.8292 93.3302 55.6615 92.5671 56.3645C91.8321 57.0392 91.0329 57.6251 90.1533 58.0978C89.84 58.2634 89.5348 58.4452 89.2256 58.619C89.1693 58.6513 89.1171 58.6998 89.1372 58.7644C89.1573 58.8291 89.2215 58.8493 89.2898 58.8331C89.4384 58.8008 89.591 58.8169 89.7396 58.7563C90.5108 58.421 91.2779 58.0776 92.0289 57.6938C92.5671 57.419 93.0651 57.0918 93.4908 56.6675C93.9567 56.2029 94.2017 55.6171 94.3583 54.9868C94.4467 54.6353 94.4828 54.2757 94.6314 53.9364" fill="#FEF8EB"></path><path d="M69.8802 42.4617C69.6271 42.3607 69.3701 42.2839 69.1452 42.2031C68.9886 42.2031 68.8962 42.2516 68.8199 42.3688C68.4865 42.89 68.1893 43.4313 67.9082 43.9808C67.7154 44.3566 67.7435 44.4737 68.1371 44.6192C68.6351 44.8091 69.1412 44.9828 69.6111 45.2454C69.8962 45.403 69.8962 45.3989 70.077 45.108C70.4424 44.5141 70.6593 43.8394 71.0168 43.2415C71.1172 43.0718 71.0168 42.9465 70.8601 42.8778C70.5388 42.7324 70.2135 42.591 69.8842 42.4617" fill="#FEF8EB"></path><path d="M79.3252 38.8059C79.1163 38.9756 77.1122 40.9068 76.7066 41.23C76.7066 41.23 76.4495 41.4967 76.3853 41.6179C76.1764 41.9007 76.5058 42.7128 76.6985 43.3996C76.8913 44.0865 76.9275 44.2683 77.2689 44.1107C78.2167 43.6057 80.1646 41.7754 80.2971 41.5128C80.4296 41.2502 79.9879 39.8362 79.8352 39.2867C79.6826 38.7332 79.538 38.6403 79.3292 38.8099" fill="#FEF8EB"></path><path d="M63.24 54.1627C64.0914 54.5869 65.1116 55.1485 66.6418 55.7182C67.2201 55.9525 67.8386 56.1667 68.4451 56.3202C70.0757 56.7282 71.7384 56.4697 73.3529 55.9364C75.8671 55.1041 77.7547 51.6335 79.2849 48.4175C79.2528 48.8943 81.0762 51.9568 83.1526 50.2275C85.229 48.4983 86.3616 44.7652 86.1447 39.2341C85.9318 33.7031 83.3654 23.0248 83.0241 21.433C82.6787 19.8412 80.4496 9.3447 80.2047 8.00335C79.9998 6.87209 79.554 7.13066 79.2769 8.10435C78.9998 9.08208 77.9515 13.6152 78.4094 14.6818C78.8672 15.7484 83.8072 37.7474 84.2972 41.4724C84.7872 45.1975 82.9919 47.153 82.028 47.3024C81.0601 47.4519 80.8834 45.4116 80.8794 44.5955C80.8794 43.7794 80.4376 43.2703 80.0239 43.7875C79.6102 44.3046 77.8752 47.5853 75.594 50.9709C74.3449 52.8214 71.9673 53.6658 69.919 54.0173C69.3166 54.1102 68.674 54.1829 67.9511 54.2274C67.8547 54.2274 67.7583 54.2354 67.6699 54.2354C67.0916 54.2678 66.461 54.2799 65.7662 54.2637C64.1557 54.2233 62.264 53.6779 63.24 54.1587" fill="#FEF8EB"></path><path d="M8.62692 75.1079C8.56266 75.0513 8.4984 74.9988 8.43013 74.9463C8.36586 74.8978 8.29357 74.8493 8.21325 74.8049C8.08473 74.7241 7.94416 74.6473 7.77949 74.5746C7.61081 74.4978 7.4622 74.4332 7.32967 74.3847L7.06058 74.2998C6.97222 74.2716 6.88386 74.2473 6.79952 74.2312C6.62281 74.1786 6.45814 74.1382 6.29348 74.1059C6.13283 74.0736 5.97218 74.0453 5.81956 74.0251C5.65489 74.0049 5.50227 73.9766 5.35769 73.9443C5.22515 73.916 5.10065 73.8918 4.98016 73.8716C4.80746 73.8271 4.65083 73.7948 4.49419 73.7665C4.32551 73.7342 4.15683 73.6979 3.98413 73.6575C3.81143 73.617 3.65078 73.5766 3.49415 73.5362C3.33751 73.4958 3.18088 73.4474 3.02826 73.3989C2.71901 73.2898 2.46197 73.1484 2.26115 72.9787C2.0242 72.7807 1.90371 72.5343 1.90371 72.2393C1.90371 71.9444 2.0001 71.7141 2.18484 71.5081C2.28123 71.4111 2.38566 71.3262 2.4941 71.2576C2.59852 71.1929 2.71499 71.1323 2.83548 71.0758C3.09252 70.9667 3.35759 70.8859 3.6307 70.8333C3.76725 70.8131 3.89577 70.797 4.02027 70.7849C4.14478 70.7727 4.26125 70.7687 4.36969 70.7687C5.00426 70.7687 5.60268 70.8697 6.15692 71.0677C6.55855 71.201 6.9923 71.399 7.44614 71.6575C7.52647 71.702 7.60679 71.7182 7.69515 71.706C7.77949 71.6939 7.84375 71.6575 7.89596 71.5929L8.60684 70.6919C8.66708 70.6192 8.66708 70.5707 8.65905 70.5344C8.65102 70.502 8.63495 70.4495 8.54258 70.3889C8.43816 70.3404 8.31767 70.2758 8.21325 70.2112C8.11686 70.1546 8.01243 70.094 7.89998 70.0374C7.75138 69.9607 7.59073 69.8839 7.42204 69.8112C7.26139 69.7384 7.09271 69.6738 6.91599 69.6172C6.75133 69.5728 6.5706 69.5243 6.38585 69.4799C6.20512 69.4354 6.02037 69.3991 5.82357 69.3708C5.0163 69.2496 3.88774 69.2415 2.88769 69.4274C2.33746 69.5324 1.84346 69.698 1.42979 69.9162C1.00808 70.1546 0.658668 70.4697 0.397612 70.8495C0.132539 71.2454 0 71.7424 0 72.3242C0 72.7201 0.0722921 73.0676 0.212861 73.3666C0.365479 73.6736 0.566294 73.9281 0.811286 74.1261C1.06833 74.3564 1.3575 74.5423 1.67076 74.6796C1.99206 74.8372 2.3214 74.9584 2.66679 75.0432C3.01621 75.1523 3.34153 75.2251 3.6548 75.2614C3.8275 75.2937 3.97609 75.322 4.12068 75.3463C4.26527 75.3705 4.40182 75.3947 4.52632 75.4149C4.7191 75.4473 4.90385 75.4755 5.08057 75.5038C5.2613 75.5361 5.43801 75.5725 5.61071 75.6129C5.79144 75.6533 5.96012 75.6937 6.10873 75.7341C6.26536 75.7745 6.40995 75.823 6.54248 75.8755C6.83165 76.0008 7.06058 76.1422 7.22926 76.2997C7.43811 76.526 7.53852 76.7724 7.53852 77.0431C7.53852 77.2694 7.47425 77.4835 7.34975 77.6815C7.23328 77.8754 7.05656 78.0572 6.82764 78.2148C6.57863 78.3805 6.30151 78.5057 6.00832 78.5784C5.70308 78.6713 5.3376 78.7198 4.93196 78.7198C4.15683 78.7198 3.42587 78.5703 2.75515 78.2794C2.26919 78.0774 1.75912 77.831 1.24504 77.5482C1.16472 77.5037 1.08841 77.4876 1.00005 77.4997C0.927758 77.5118 0.875545 77.5401 0.835382 77.6007L0.124506 78.538C0.0722947 78.6107 0.0763107 78.6633 0.080327 78.6996C0.0883595 78.7319 0.104422 78.7804 0.184747 78.8208C0.317284 78.9057 0.433758 78.9784 0.542197 79.039C0.650636 79.1036 0.763089 79.1643 0.875544 79.2249C1.05226 79.3259 1.23299 79.4147 1.41774 79.4955C1.60249 79.5804 1.79527 79.6531 1.99206 79.7218C2.40975 79.8794 2.84351 79.9885 3.28932 80.0571C3.76725 80.146 4.32551 80.1905 4.96409 80.1905C5.60268 80.1905 6.24528 80.1218 6.82362 79.9844C7.35778 79.8592 7.8317 79.6612 8.23734 79.3865C8.6229 79.136 8.92011 78.8168 9.12895 78.433C9.33378 78.0411 9.4382 77.5764 9.4382 77.0553C9.4382 76.6028 9.36189 76.2109 9.20928 75.8957C9.07272 75.5927 8.87593 75.3261 8.6229 75.0958" fill="#FEF8EB"></path><path d="M25.0456 69.5118C25.0295 69.4875 25.0135 69.4512 24.9131 69.4512C24.8126 69.4512 24.7926 69.4875 24.7805 69.5118L18.9047 79.9315C18.8927 79.9598 18.8887 79.9759 18.8887 79.9799C18.8887 79.9759 18.9208 79.988 18.9851 79.988H20.5273C20.6357 79.988 20.7362 79.9597 20.8446 79.8991C20.949 79.8385 21.0213 79.7699 21.0695 79.6891L21.5595 78.8042C21.6318 78.6507 21.7683 78.5134 21.9571 78.4123C22.1378 78.3154 22.3226 78.2629 22.5073 78.2629H27.3188C27.5035 78.2629 27.6883 78.3113 27.865 78.4123C28.0417 78.5134 28.1743 78.6346 28.2626 78.78L28.7767 79.6891C28.8169 79.7779 28.8892 79.8426 28.9896 79.8991C29.102 79.9597 29.2105 79.9921 29.3189 79.9921H30.8611C30.9093 79.9921 30.9374 79.984 30.9535 79.9799C30.9535 79.9719 30.9455 79.9598 30.9334 79.9436L25.0536 69.5118H25.0456ZM26.6601 76.6508C26.5959 76.7599 26.4553 76.8932 26.1621 76.8932H23.656C23.3708 76.8932 23.2302 76.772 23.158 76.671C23.0977 76.5862 23.0134 76.4003 23.1379 76.1337L24.4833 73.6409C24.6078 73.3783 24.8046 73.3378 24.909 73.3378C25.0135 73.3378 25.2103 73.3783 25.3428 73.653L26.6601 76.1256C26.7565 76.3114 26.7565 76.4973 26.6601 76.6508Z" fill="#FEF8EB"></path><path d="M52.3287 79.9882C52.3769 79.9882 52.405 79.9801 52.4211 79.976C52.417 79.968 52.413 79.9558 52.401 79.9397L46.5212 69.5079C46.5051 69.4836 46.489 69.4473 46.3886 69.4473C46.2882 69.4473 46.2682 69.4836 46.2561 69.5079L40.3803 79.9276C40.3683 79.9558 40.3643 79.972 40.3643 79.976C40.3643 79.972 40.3964 79.9841 40.4607 79.9841H42.0029C42.1113 79.9841 42.2117 79.9558 42.3202 79.8952C42.4246 79.8346 42.4969 79.766 42.5451 79.6852L43.0351 78.8003C43.1074 78.6468 43.2439 78.5095 43.4327 78.4084C43.6134 78.3115 43.7982 78.259 43.9869 78.259H48.7984C48.9831 78.259 49.1679 78.3074 49.3446 78.4084C49.5213 78.5095 49.6539 78.6307 49.7422 78.7761L50.2563 79.6852C50.2965 79.774 50.3688 79.8387 50.4692 79.8952C50.5816 79.9558 50.6901 79.9882 50.7985 79.9882H52.3407H52.3287ZM48.1357 76.651C48.0715 76.76 47.9309 76.8934 47.6377 76.8934H45.1316C44.8464 76.8934 44.7058 76.7722 44.6335 76.6712C44.5733 76.5863 44.489 76.4005 44.6135 76.1338L45.9589 73.641C46.0834 73.3784 46.2802 73.338 46.3846 73.338C46.4891 73.338 46.6858 73.3784 46.8184 73.6531L48.1357 76.1257C48.2321 76.3116 48.2321 76.4974 48.1357 76.651Z" fill="#FEF8EB"></path><path d="M71.9758 76.9747C72.1284 76.6354 72.2409 76.2798 72.3172 75.9162C72.3935 75.5486 72.4296 75.1445 72.4296 74.7243C72.4296 73.9284 72.277 73.1729 71.9758 72.474C71.6906 71.8316 71.2488 71.2619 70.6705 70.7892C69.5781 69.9084 68.1604 69.46 66.4494 69.46H62.0797C61.9914 69.46 61.9271 69.4842 61.8749 69.5327C61.8267 69.5771 61.8066 69.6256 61.8066 69.6902V79.7665C61.8066 79.8312 61.8267 79.8797 61.8749 79.9241C61.907 79.9564 61.9633 79.9968 62.0797 79.9968H66.4494C67.2928 79.9968 68.084 79.8837 68.803 79.6615C69.4937 79.4514 70.1243 79.1201 70.6745 78.6797C71.2609 78.207 71.6987 77.6333 71.9758 76.9828M70.1484 76.6919C69.8833 77.205 69.55 77.605 69.1604 77.8757C68.7668 78.1626 68.325 78.3565 67.8551 78.4535C67.3772 78.5464 66.9113 78.5949 66.4695 78.5949H64.4534C64.2445 78.5949 64.0678 78.5262 63.9272 78.3969C63.7867 78.2636 63.7103 78.0898 63.7103 77.8959V71.577C63.7103 71.3831 63.7866 71.2053 63.9312 71.072C64.0678 70.9427 64.2485 70.874 64.4534 70.874H66.4695C66.8992 70.874 67.3611 70.9225 67.835 71.0154C68.317 71.1124 68.7628 71.3023 69.1604 71.5811C69.55 71.8518 69.8833 72.2517 70.1484 72.7648C70.4014 73.282 70.53 73.9446 70.53 74.7365C70.53 75.5283 70.4014 76.2031 70.1484 76.696" fill="#FEF8EB"></path><path d="M90.4607 69.4512H82.38C82.2916 69.4512 82.2193 69.4754 82.1631 69.5279C82.1109 69.5724 82.0908 69.6209 82.0908 69.6815V79.7577C82.0908 79.8183 82.1109 79.8668 82.1631 79.9113C82.2234 79.9638 82.2916 79.988 82.38 79.988H90.4607C90.5491 79.988 90.6173 79.9638 90.6776 79.9113C90.7298 79.8668 90.7499 79.8183 90.7499 79.7577V78.7962C90.7499 78.7356 90.7298 78.6871 90.6776 78.6426C90.6173 78.5901 90.5491 78.5659 90.4607 78.5659H84.7536C84.5488 78.5659 84.372 78.5012 84.2275 78.3719C84.0748 78.2386 83.9945 78.0608 83.9945 77.8629V76.2104C83.9945 76.0125 84.0748 75.8387 84.2275 75.7014C84.372 75.5721 84.5528 75.5074 84.7576 75.5074H89.7016C89.79 75.5074 89.8583 75.4832 89.9185 75.4307C89.9707 75.3862 89.9908 75.3378 89.9908 75.2771V74.2994C89.9908 74.2388 89.9707 74.1903 89.9185 74.1459C89.8583 74.0934 89.79 74.0691 89.7016 74.0691H84.7576C84.5528 74.0691 84.3761 74.0045 84.2315 73.8752C84.0789 73.7419 83.9985 73.5641 83.9985 73.3661V71.548C83.9985 71.3501 84.0789 71.1763 84.2315 71.039C84.3761 70.9097 84.5528 70.845 84.7576 70.845H90.4647C90.5531 70.845 90.6213 70.8208 90.6816 70.7683C90.7338 70.7238 90.7539 70.6754 90.7539 70.6148V69.6815C90.7539 69.6209 90.7338 69.5724 90.6816 69.5279C90.6213 69.4754 90.5531 69.4512 90.4647 69.4512" fill="#FEF8EB"></path><path d="M109.227 70.7804C108.135 69.8996 106.717 69.4512 105.006 69.4512H100.636C100.548 69.4512 100.484 69.4754 100.432 69.5239C100.383 69.5683 100.363 69.6168 100.363 69.6815V79.7577C100.363 79.8224 100.383 79.8709 100.432 79.9153C100.464 79.9476 100.52 79.988 100.636 79.988H105.006C105.849 79.988 106.641 79.8749 107.36 79.6527C108.05 79.4426 108.681 79.1113 109.231 78.6709C109.818 78.1982 110.255 77.6245 110.532 76.974C110.685 76.6347 110.798 76.2791 110.874 75.9155C110.95 75.5478 110.986 75.1438 110.986 74.7236C110.986 73.9277 110.834 73.1722 110.532 72.4732C110.247 71.8309 109.805 71.2612 109.227 70.7885M108.705 76.6912C108.44 77.2043 108.107 77.6043 107.717 77.875C107.323 78.1619 106.882 78.3558 106.412 78.4528C105.934 78.5457 105.468 78.5942 105.026 78.5942H103.01C102.801 78.5942 102.624 78.5255 102.488 78.3962C102.343 78.2629 102.271 78.0891 102.271 77.8952V71.5763C102.271 71.3824 102.347 71.2046 102.492 71.0713C102.632 70.942 102.809 70.8733 103.014 70.8733H105.03C105.46 70.8733 105.922 70.9218 106.396 71.0147C106.878 71.1117 107.323 71.3016 107.721 71.5804C108.111 71.8511 108.444 72.251 108.709 72.7641C108.962 73.2813 109.091 73.9439 109.091 74.7358C109.091 75.5276 108.962 76.2024 108.709 76.6953" fill="#FEF8EB"></path><path d="M129.245 70.7804C128.152 69.8996 126.735 69.4512 125.024 69.4512H120.654C120.566 69.4512 120.501 69.4754 120.449 69.5239C120.401 69.5683 120.381 69.6168 120.381 69.6815V79.7577C120.381 79.8224 120.401 79.8709 120.449 79.9153C120.481 79.9476 120.538 79.988 120.654 79.988H125.024C125.867 79.988 126.658 79.8749 127.377 79.6527C128.068 79.4426 128.699 79.1113 129.249 78.6709C129.835 78.1982 130.273 77.6245 130.55 76.974C130.703 76.6347 130.819 76.2791 130.891 75.9155C130.968 75.5478 131.004 75.1438 131.004 74.7236C131.004 73.9277 130.851 73.1722 130.55 72.4732C130.265 71.8309 129.823 71.2612 129.245 70.7885M128.719 76.6912C128.454 77.2043 128.12 77.6043 127.731 77.875C127.337 78.1619 126.895 78.3558 126.425 78.4528C125.947 78.5457 125.482 78.5942 125.04 78.5942H123.024C122.815 78.5942 122.638 78.5255 122.501 78.3962C122.357 78.2629 122.285 78.0891 122.285 77.8952V71.5763C122.285 71.3824 122.361 71.2046 122.505 71.0713C122.642 70.942 122.823 70.8733 123.028 70.8733H125.044C125.473 70.8733 125.935 70.9218 126.409 71.0147C126.891 71.1117 127.337 71.3016 127.735 71.5804C128.124 71.8511 128.458 72.251 128.723 72.7641C128.976 73.2813 129.104 73.9439 129.104 74.7358C129.104 75.5276 128.976 76.2024 128.723 76.6953" fill="#FEF8EB"></path><path d="M142.01 69.4639H140.673C140.556 69.4639 140.5 69.5043 140.468 69.5366C140.419 69.581 140.399 69.6295 140.399 69.6942V79.7583C140.399 79.823 140.419 79.8714 140.468 79.9159C140.5 79.9482 140.556 79.9886 140.673 79.9886H142.01C142.098 79.9886 142.167 79.9644 142.227 79.9118C142.279 79.8674 142.299 79.8189 142.299 79.7583V69.6942C142.299 69.6336 142.279 69.5851 142.227 69.5406C142.167 69.4881 142.098 69.4639 142.01 69.4639Z" fill="#FEF8EB"></path><path d="M161.926 69.5406C161.865 69.4881 161.797 69.4639 161.709 69.4639H160.387C160.299 69.4639 160.231 69.4881 160.17 69.5406C160.118 69.5851 160.098 69.6336 160.098 69.6942V75.4111C160.098 75.7181 159.938 75.8312 159.841 75.8716C159.68 75.9363 159.508 75.8918 159.327 75.7464L151.889 69.5002C151.869 69.4841 151.833 69.4639 151.772 69.4639C151.756 69.4639 151.736 69.4639 151.716 69.4679L151.7 79.7543C151.7 79.8149 151.72 79.8634 151.772 79.9078C151.833 79.9603 151.893 79.9846 151.973 79.9846H153.311C153.399 79.9846 153.467 79.9603 153.528 79.9078C153.58 79.8634 153.6 79.8149 153.6 79.7543V74.1424C153.6 73.8354 153.761 73.7222 153.857 73.6818C154.006 73.6172 154.178 73.6536 154.359 73.7828L161.789 79.928C161.837 79.9603 161.901 79.9724 161.982 79.9603L161.998 69.6861C161.998 69.6255 161.978 69.577 161.926 69.5325" fill="#FEF8EB"></path></svg>
          <p className="!text-[16px] font-medium text-[#D2D2D2] text-center !mt-6" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
            {isEn ? "Since 1919, we've been offering the finest sweets and luxury chocolate with passion and devotion." : 'منذ عام 1919، نقدم أجود الحلويات والشوكولاتة الفاخرة بعشق وشغف.'}
          </p>
          {/* Optional background subtle pattern overlay if needed, based on Figma image 172 */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-transparent pointer-events-none" />
        </div>

      </div>
    </div>
  );
}
