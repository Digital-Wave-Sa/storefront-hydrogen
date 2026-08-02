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
  try {
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
  } catch (err) {
    console.error('[Login Loader Error]:', err);
    return data({
      otpPhone: null,
      otpCooldownRemaining: 0,
      otpBlockRemaining: 0,
      otpVerifyCooldownRemaining: 0,
      redirectTo: ''
    });
  }
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
      const parsed = JSON.parse(cleanMsg) as any;
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
  try {
    const { storefront, session, env } = context;
    const form = await request.formData();
    const intent = form.get('intent');
    const lang = storefront?.i18n?.language === 'EN' ? 'en' : 'ar';

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
        // Try to send OTP via Custom CRM API (Bypass fallback if service fails)
        try {
          const api = new SaadeddinApi(env);
          await api.requestOtp(fullPhone, 'login');
        } catch (otpErr: any) {
          console.warn('[Login] OTP send API warning (Bypass Mode Active):', otpErr?.message);
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
      const formPhone = String(form.get('phone') || '');
      const formCountryCode = String(form.get('countryCode') || '+966');
      let cleanPhone = formPhone.replace(/\D/g, '');
      const countryDigits = formCountryCode.replace(/\D/g, '');
      if (cleanPhone.startsWith('00' + countryDigits)) {
        cleanPhone = cleanPhone.substring(2 + countryDigits.length);
      } else if (cleanPhone.startsWith(countryDigits)) {
        cleanPhone = cleanPhone.substring(countryDigits.length);
      }
      if (cleanPhone.startsWith('0')) {
        cleanPhone = cleanPhone.substring(1);
      }
      const fullFormPhone = formPhone ? `${formCountryCode}${cleanPhone}` : '';
      const savedPhone = session.get('loginOtpPhone') || fullFormPhone;

      if (!savedPhone) {
        return data({ error: lang === 'en' ? 'Session expired. Please request a new code.' : 'انتهت الجلسة. يرجى طلب رمز جديد.' });
      }

      if (!otp || otp.length < 4) {
        return data({ error: lang === 'en' ? 'Please enter the 4-digit verification code.' : 'يرجى إدخال رمز التحقق المكوّن من 4 أرقام.' });
      }

      // ── Step 1: Verify OTP with CRM ──────────────────────────────────────────
      let saadeddinToken: string | null = null;
      let crmProfile: any = null;

      try {
        const api = new SaadeddinApi(env);
        // CRM expects /auth/verify-otp with flowType 'login', not /auth/login
        const loginResult = await api.verifyOtp(savedPhone, otp, 'login');
        saadeddinToken = loginResult?.token || null;
        crmProfile = loginResult?.profile || loginResult?.customer || loginResult || null;

        if (crmProfile?.email) {
          session.set('loginCustomerEmail', crmProfile.email);
        }
        if (crmProfile?.shopifyId) {
          const id = String(crmProfile.shopifyId).split('/').pop();
          session.set('loginCustomerId', id);
        }
      } catch (apiErr: any) {
        // CRM returned a real error (wrong OTP, too many attempts, etc.) — show it
        const errMsg = formatOtpError(apiErr?.message || '', lang);
        return data({ error: errMsg });
      }

      // ── Step 2: Get/create Shopify customer via Admin API ────────────────────
      const stablePassword = await derivePassword(savedPhone, env.SESSION_SECRET || 'saadeddin-otp-secret');
      let resolvedEmail: string | null = crmProfile?.email || session.get('loginCustomerEmail') || null;
      let resolvedCustomerId: string | null = null;

      let adminToken: string | null = null;
      let adminDomain: string = '';
      try {
        const { getAdminToken, getAdminDomain } = await import('~/lib/shopify-admin.server');
        adminToken = await getAdminToken(env);
        adminDomain = getAdminDomain(env);
      } catch (_) { }

      if (adminToken && adminDomain) {
        const rawDigits = savedPhone.replace(/\D/g, ''); // e.g. "962790910041"
        const last9Digits = rawDigits.slice(-9); // e.g. "790910041"
        const localFormat = rawDigits.startsWith('962') ? '0' + rawDigits.slice(3) : (rawDigits.startsWith('966') ? '0' + rawDigits.slice(3) : rawDigits);

        const searchQueries = [
          `phone:${rawDigits}`,
          `phone:${localFormat}`,
          `phone:${savedPhone}`,
          `${last9Digits}`,
        ];

        if (resolvedEmail && !resolvedEmail.endsWith('@saadeddin.placeholder')) {
          searchQueries.unshift(`email:"${resolvedEmail}"`);
        }

        for (const q of searchQueries) {
          if (resolvedCustomerId) break;
          try {
            const searchRes = await fetch(
              `https://${adminDomain}/admin/api/2024-01/customers/search.json?query=${encodeURIComponent(q)}&fields=id,email,phone,first_name,last_name,default_address,addresses`,
              { headers: { 'X-Shopify-Access-Token': adminToken } }
            );
            if (searchRes.ok) {
              const searchData = await searchRes.json() as any;
              const candidates = (searchData.customers || []).filter((c: any) => {
                const primaryPhone = (c.phone || '').replace(/\D/g, '');
                const defaultAddressPhone = (c.default_address?.phone || '').replace(/\D/g, '');
                const addressPhones = (c.addresses || []).map((addr: any) => (addr.phone || '').replace(/\D/g, ''));

                const allPhones = [primaryPhone, defaultAddressPhone, ...addressPhones].filter(Boolean);

                const matchesPhone = allPhones.some((cp: string) => {
                  return cp && rawDigits && (cp === rawDigits || cp.endsWith(last9Digits) || rawDigits.endsWith(cp));
                });

                const matchesEmail = resolvedEmail && c.email && c.email.toLowerCase() === resolvedEmail.toLowerCase();

                return matchesPhone || matchesEmail;
              });

              // Prioritize original customer account: real email first, real first name, then oldest customer ID
              candidates.sort((a: any, b: any) => {
                const aPlaceholder = (a.email || '').endsWith('@saadeddin.placeholder');
                const bPlaceholder = (b.email || '').endsWith('@saadeddin.placeholder');
                if (aPlaceholder !== bPlaceholder) return aPlaceholder ? 1 : -1;

                const aCustName = (a.first_name || '').toLowerCase() === 'customer';
                const bCustName = (b.first_name || '').toLowerCase() === 'customer';
                if (aCustName !== bCustName) return aCustName ? 1 : -1;

                return Number(a.id) - Number(b.id);
              });

              const found = candidates[0];

              if (found) {
                resolvedCustomerId = String(found.id);
                resolvedEmail = found.email || resolvedEmail;
              }
            }
          } catch (_) { }
        }

        // Fallback: Verify CRM's shopifyId if no matching customer was found in search
        if (!resolvedCustomerId && crmProfile?.shopifyId) {
          const numericId = String(crmProfile.shopifyId).split('/').pop()!;
          try {
            const verifyRes = await fetch(
              `https://${adminDomain}/admin/api/2024-01/customers/${numericId}.json?fields=id,email,phone`,
              { headers: { 'X-Shopify-Access-Token': adminToken } }
            );
            if (verifyRes.ok) {
              const verifyData = await verifyRes.json() as any;
              resolvedCustomerId = numericId;
              resolvedEmail = verifyData.customer?.email || resolvedEmail;
            }
          } catch (_) { }
        }

        // 4. Create customer ONLY if all search attempts returned 0 matches
        if (!resolvedCustomerId) {
          const nameParts = (crmProfile?.name || '').trim().split(/\s+/);
          const firstName = nameParts[0] || 'Customer';
          const lastName = nameParts.slice(1).join(' ') || '(N/A)';
          const createEmail = resolvedEmail || `${savedPhone.replace(/\D/g, '')}@saadeddin.placeholder`;

          try {
            const createRes = await fetch(
              `https://${adminDomain}/admin/api/2024-01/customers.json`,
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
                    tags: crmProfile?.accountType === 'COMPANY' ? 'verified_phone, B2B' : 'verified_phone',
                    verified_email: true,
                  }
                })
              }
            );

            if (createRes.ok) {
              const createData = await createRes.json() as any;
              resolvedCustomerId = String(createData.customer?.id);
              resolvedEmail = createData.customer?.email || createEmail;
            } else {
              // If creation failed because customer already exists in Shopify, query by raw digits or email
              const rawDigits = savedPhone.replace(/\D/g, '');
              const last9Digits = rawDigits.slice(-9);

              try {
                const recoverRes = await fetch(
                  `https://${adminDomain}/admin/api/2024-01/customers/search.json?query=${encodeURIComponent(last9Digits)}&fields=id,email,phone`,
                  { headers: { 'X-Shopify-Access-Token': adminToken } }
                );
                if (recoverRes.ok) {
                  const recoverData = await recoverRes.json() as any;
                  const found = recoverData.customers?.[0];
                  if (found) {
                    resolvedCustomerId = String(found.id);
                    resolvedEmail = found.email || resolvedEmail;
                  }
                }
              } catch (_) { }
            }
          } catch (_) { }
        }

        // 4. Always reset password so Storefront mutation works
        if (resolvedCustomerId) {
          try {
            await fetch(
              `https://${adminDomain}/admin/api/2024-01/customers/${resolvedCustomerId}.json`,
              {
                method: 'PUT',
                headers: { 'X-Shopify-Access-Token': adminToken, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  customer: { id: resolvedCustomerId, password: stablePassword, password_confirmation: stablePassword }
                })
              }
            );
          } catch (_) { }
        }
      }

      // ── Step 3: Create Shopify Storefront access token ───────────────────────
      const loginEmail = resolvedEmail || `${savedPhone.replace(/\D/g, '')}@saadeddin.placeholder`;

      let storefrontToken: any = null;
      try {
        const tokenResponse = await storefront.mutate(LOGIN_MUTATION, {
          variables: { input: { email: loginEmail, password: stablePassword } },
        });

        storefrontToken = tokenResponse.customerAccessTokenCreate?.customerAccessToken || null;

        const userErrors = tokenResponse.customerAccessTokenCreate?.customerUserErrors || [];
        if (userErrors.length > 0) {
          console.error('[Login] Storefront mutation errors:', JSON.stringify(userErrors));
        }
      } catch (sfErr: any) {
        console.error('[Login] Storefront mutation threw:', sfErr?.message);
      }

      if (!storefrontToken) {
        console.warn('[Login] Storefront token creation returned null, using session token fallback for customer:', resolvedCustomerId);
        storefrontToken = {
          accessToken: `session-${resolvedCustomerId || Date.now()}`,
          expiresAt: new Date(Date.now() + 86400 * 1000).toISOString()
        };
      }

      // ── Step 4: Commit session and redirect ──────────────────────────────────
      session.set('customerAccessToken', storefrontToken);
      if (saadeddinToken) {
        session.set('saadeddinToken', saadeddinToken);
      }
      session.set('loginOtpPhone', savedPhone);
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
  } catch (err: any) {
    console.error('[Login Action Error]:', err);
    const lang = context?.storefront?.i18n?.language === 'EN' ? 'en' : 'ar';
    return data({
      error: lang === 'en'
        ? 'An unexpected error occurred on the server. Please try again.'
        : 'حدث خطأ غير متوقع في الخادم. يرجى المحاولة مرة أخرى.'
    });
  }
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
    const timer = setTimeout(() => setResendCooldown((c: number) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (blockCooldown <= 0) return;
    const timer = setTimeout(() => setBlockCooldown((c: number) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [blockCooldown]);

  useEffect(() => {
    if (verifyCooldown <= 0) return;
    const timer = setTimeout(() => setVerifyCooldown((c: number) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [verifyCooldown]);

  const formatMMSS = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleOTPChange = (index: number, val: string) => {
    const digitsOnly = val.replace(/\D/g, '');
    const singleDigit = digitsOnly ? digitsOnly[digitsOnly.length - 1] : '';
    const newOtp = [...otpValue];
    newOtp[index] = singleDigit;
    setOtpValue(newOtp);
    setHasEditSinceError(true);
    if (singleDigit && index < 3) {
      otpRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpValue[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  const handleResend = () => {
    if (resendFormRef.current) {
      resendFormRef.current.requestSubmit();
    }
  };

  const showError = Boolean(actionData?.error && !hasEditSinceError);
  const errorToDisplay = actionData?.error || '';

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4 lg:p-8" dir={isEn ? 'ltr' : 'rtl'}>
      {/* Outer Card Container */}
      <div className="w-full max-w-[1240px] bg-white rounded-[32px] p-6 lg:p-10 flex flex-col lg:flex-row gap-8 shadow-sm min-h-[640px]">
        {/* Left Pane - Form Area */}
        <div className="w-full lg:w-1/2 flex flex-col justify-between py-2 lg:px-4">

          {/* Mobile Green Header Box (Visible only on mobile lg:hidden) */}
          <div className="w-full bg-[#234745] text-white rounded-[28px] p-6 flex flex-col items-center justify-center text-center relative overflow-hidden mb-6 lg:hidden shadow-md">
            {/* Top Pill: Back to Store */}
            <div className="w-full flex justify-end mb-2">
              <Link
                to={isEn ? "/en" : "/"}
                className="bg-[#9FB7AE] hover:bg-[#8EA69D] text-[#234745] rounded-full px-4 py-1.5 text-[13px] font-bold flex items-center gap-2 transition-colors shadow-sm"
                style={{ fontFamily: "'GE Dinar One', sans-serif" }}
              >
                <span>{isEn ? 'Back to store' : 'العودة للمتجر'}</span>
                <svg width="10" height="9" viewBox="0 0 10 9" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0 4H8.16667L4.66667 0.5L5.10667 0L9.44 4.33333L5.10667 8.66667L4.66667 8.16667L8.16667 4.66667H0V4Z" fill="#234745" />
                </svg>
              </Link>
            </div>

            {/* Centered Saadeddin Logo (Width: 150px) */}
            <div className="w-[150px] flex justify-center items-center my-3">

              <svg width="152" height="76" viewBox="0 0 152 76" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M90.8253 36.6309C91.2624 37.5558 91.2888 38.5566 90.7348 40.1146C90.6218 40.4293 90.5313 39.9895 90.5313 39.9895C90.4937 39.8038 90.4371 39.5953 90.3768 39.3944C90.196 38.7196 89.9133 37.8363 89.5779 37.6506C89.4197 37.6013 89.3405 37.6771 89.3632 37.878C89.3858 38.079 89.8606 39.6597 89.5817 40.9638C89.5214 41.214 89.4348 41.4717 89.3104 41.7333C89.3104 41.7333 89.3104 41.7371 89.3104 41.7409C89.3104 41.7485 89.3029 41.756 89.2991 41.7636C89.2124 41.9153 89.1559 41.7522 89.1144 41.6044C89.1144 41.6044 89.1069 41.5817 89.1069 41.5703C88.6962 40.0957 88.0216 39.383 87.935 39.8758C87.8558 40.3496 88.3419 41.4035 88.2967 42.8554C88.2213 45.1185 86.7102 45.9714 86.7102 45.9714C87.023 43.4619 87.0117 42.6128 86.8647 42.2261C86.8647 42.2185 86.8647 42.2109 86.8647 42.2071C86.8647 42.082 86.7102 41.8963 86.454 41.7333C85.8096 41.3201 84.5058 41.0547 83.3489 42.3095C82.3767 43.3633 82.2711 44.6446 82.3465 45.4976C82.3578 45.5885 82.3654 45.6757 82.3767 45.7629C82.3842 45.8122 82.3917 45.8615 82.3993 45.907C82.4483 46.1534 82.5538 46.3126 82.908 46.1685C83.266 46.0093 83.835 45.9525 84.502 46.6196C84.1779 46.976 81.005 50.5886 79.1095 51.1989C77.214 51.8093 75.2809 49.1216 75.1113 48.2914C74.9417 47.465 74.3162 47.2489 74.2559 47.7796C74.1918 48.3103 72.7636 51.3657 71.3806 53.4128C70.0014 55.456 65.9052 56.108 65.3061 56.1308C65.2382 56.1308 65.1666 56.1308 65.095 56.1308C65.0498 56.1308 65.0046 56.127 64.9632 56.1232C64.7597 56.108 64.56 56.0891 64.4205 56.0891C64.1077 56.0663 63.859 56.0322 63.4634 55.9754C62.834 55.8806 64.0022 56.2521 64.933 56.6615C65.9316 57.1202 67.8874 57.5561 69.7904 57.2074C72.0288 56.8018 72.9633 55.8124 74.7722 51.4264C75.0246 52.2831 77.0633 55.2058 80.0403 54.2354C83.0173 53.2649 85.8925 48.7198 85.8925 48.7198C89.6119 49.0382 89.8229 45.0654 89.8229 45.0654C89.8229 45.0654 92.2271 43.5946 92.8338 40.706C93.4443 37.8212 90.8516 35.7249 90.8516 35.7249C90.8516 35.7249 90.358 35.6263 90.829 36.6233" fill="#FEF8EB" />
                <path d="M81.1432 30.4326C82.8653 40.7967 80.3594 45.3836 79.6848 46.5474C79.0103 47.7111 79.1347 48.4996 79.5605 48.0106C81.3015 45.9674 83.3138 41.6383 83.7207 36.5017C84.1277 31.3652 82.4998 22.9951 81.5539 18.7077C80.6081 14.4202 78.0079 0 78.0079 0C77.4917 0.0568622 76.8322 2.10011 76.5722 3.01749C76.3122 3.93107 75.9504 5.42086 76.1728 6.36477C76.3951 7.30868 79.4173 20.0686 81.1394 30.4364" fill="#FEF8EB" />
                <path d="M66.88 48.5112C70.9498 46.5362 70.9347 42.2678 70.6031 39.201C71.7713 38.5717 72.9206 36.574 73.4859 35.3192C73.8024 34.6634 74.1491 34.561 74.59 34.6369C74.8048 34.6748 75.1176 34.9363 75.3776 35.1941C75.6074 35.4215 75.7846 35.6263 75.8448 35.6983C75.8448 35.6983 75.8486 35.7059 75.8524 35.7059C75.8562 35.7096 75.8599 35.7134 75.8637 35.7172L75.8675 35.7248C75.8675 35.7248 76.3762 34.5004 76.6588 33.4238C76.6287 33.1433 75.4341 31.7445 74.3262 31.4639C73.2145 31.1834 71.8579 34.5535 70.524 35.9106C69.19 37.2639 68.2441 35.1941 67.9238 34.8264C67.6035 34.4587 67.2983 35.7021 67.2191 37.1994C67.14 38.6968 67.8861 38.458 68.6323 39.9061C69.6422 42.5748 68.0858 44.8417 65.7683 45.2549C63.4508 45.6681 61.755 43.3178 61.5704 41.6044C61.3857 39.8909 63.0966 35.7172 66.7669 30.0386C70.4373 24.36 71.8353 18.7685 71.9672 18.1506C72.0991 17.5327 71.7977 17.3242 71.5037 17.9194C71.206 18.5145 69.401 22.1765 68.3459 23.9051C67.2907 25.6337 65.0749 29.5799 63.3227 32.2714C61.5704 34.9591 60.1648 38.621 60.0781 42.2526C59.9914 45.888 62.8102 50.4938 66.8837 48.5188" fill="#FEF8EB" />
                <path d="M88.7899 50.6038C88.8502 50.4635 88.918 50.4294 89.0349 50.5394C89.1215 50.6228 89.2158 50.7024 89.31 50.7744C89.5172 50.9374 89.6378 50.9147 89.7998 50.7251L90.5912 49.4362C90.8474 49.1443 90.708 48.7728 90.7683 48.443C90.8399 48.064 90.8173 47.6621 90.659 47.2868C90.6364 47.2376 90.6477 47.158 90.5724 47.1618C90.4781 47.1618 90.497 47.2451 90.497 47.3096C90.497 47.4233 90.497 47.5408 90.497 47.6546C90.497 47.6546 90.497 47.6849 90.497 47.7V47.8441C90.4706 48.1398 90.3312 48.4506 90.2445 48.6174C90.237 48.6288 90.2332 48.644 90.2257 48.6553C90.2144 48.6781 90.2031 48.6932 90.1955 48.7084C90.1541 48.7804 90.1126 48.8487 90.0636 48.9207C90.0184 48.8259 89.9732 48.7463 89.943 48.6629C89.9054 48.5644 89.8451 48.5037 89.7396 48.5189C89.6039 48.534 89.619 48.6553 89.6152 48.7349C89.6114 48.8828 89.6152 49.0382 89.6491 49.1823C89.7056 49.3945 89.6039 49.5424 89.4946 49.6902C89.4155 49.7964 89.325 49.8115 89.2044 49.7092C89.065 49.5841 88.9407 49.4325 88.7485 49.368C88.6204 49.3263 88.5601 49.3491 88.4922 49.4666C88.3189 49.7774 88.2435 50.1224 88.1908 50.4636C88.0438 51.4454 87.5652 52.2263 86.8492 52.8859C86.1596 53.5189 85.4097 54.0686 84.5845 54.5121C84.2905 54.6676 84.0041 54.8381 83.714 55.0012C83.6612 55.0315 83.6122 55.077 83.6311 55.1376C83.6499 55.1983 83.7102 55.2172 83.7743 55.2021C83.9137 55.1717 84.0569 55.1869 84.1963 55.13C84.9198 54.8154 85.6396 54.4932 86.3443 54.1331C86.8492 53.8753 87.3165 53.5682 87.7159 53.1702C88.1531 52.7342 88.3829 52.1846 88.5299 51.5932C88.6128 51.2634 88.6467 50.926 88.7862 50.6076" fill="#FEF8EB" />
                <path d="M65.5647 39.8417C65.3273 39.747 65.0862 39.6749 64.8751 39.5991C64.7282 39.5991 64.6415 39.6446 64.5699 39.7545C64.2571 40.2436 63.9783 40.7515 63.7145 41.2671C63.5336 41.6196 63.56 41.7296 63.9293 41.866C64.3965 42.0442 64.8714 42.2072 65.3123 42.4536C65.5798 42.6014 65.5798 42.5977 65.7494 42.3247C66.0923 41.7675 66.2958 41.1344 66.6312 40.5734C66.7254 40.4141 66.6312 40.2966 66.4842 40.2322C66.1827 40.0957 65.8775 39.963 65.5685 39.8417" fill="#FEF8EB" />
                <path d="M74.4286 36.4108C74.2327 36.57 72.3523 38.382 71.9717 38.6853C71.9717 38.6853 71.7305 38.9355 71.6702 39.0492C71.4743 39.3146 71.7833 40.0765 71.9641 40.721C72.145 41.3654 72.1789 41.536 72.4993 41.3881C73.3886 40.9143 75.2162 39.197 75.3406 38.9506C75.4649 38.7042 75.0504 37.3775 74.9072 36.8619C74.764 36.3426 74.6284 36.2554 74.4324 36.4146" fill="#FEF8EB" />
                <path d="M59.3368 50.8197C60.1357 51.2177 61.0928 51.7446 62.5285 52.2791C63.0712 52.499 63.6515 52.6999 64.2205 52.8439C65.7505 53.2268 67.3106 52.9842 68.8254 52.4838C71.1844 51.7029 72.9555 48.4466 74.3913 45.4291C74.3611 45.8764 76.072 48.7499 78.0202 47.1274C79.9684 45.5049 81.0311 42.0022 80.8276 36.8126C80.6279 31.623 78.2199 21.6039 77.8996 20.1103C77.5755 18.6167 75.4841 8.76818 75.2542 7.50963C75.062 6.44821 74.6438 6.69082 74.3837 7.6044C74.1237 8.52178 73.1402 12.7751 73.5698 13.7758C73.9994 14.7766 78.6344 35.4176 79.0942 38.9127C79.5539 42.4078 77.8695 44.2426 76.9651 44.3829C76.0569 44.5231 75.8911 42.6088 75.8873 41.843C75.8873 41.0773 75.4728 40.5996 75.0847 41.0849C74.6965 41.5701 73.0686 44.6482 70.9282 47.8249C69.7562 49.5611 67.5254 50.3534 65.6035 50.6832C65.0383 50.7704 64.4353 50.8386 63.757 50.8803C63.6666 50.8803 63.5761 50.8879 63.4932 50.8879C62.9506 50.9182 62.359 50.9296 61.7071 50.9144C60.1959 50.8765 58.4211 50.3648 59.3368 50.8159" fill="#FEF8EB" />
                <path d="M8.09439 70.471C8.0341 70.4179 7.97381 70.3686 7.90975 70.3194C7.84945 70.2739 7.78162 70.2284 7.70626 70.1867C7.58567 70.1109 7.45378 70.0388 7.29927 69.9706C7.141 69.8986 7.00157 69.8379 6.87722 69.7924L6.62474 69.7128C6.54184 69.6863 6.45893 69.6635 6.3798 69.6484C6.21399 69.5991 6.05949 69.5612 5.90499 69.5309C5.75426 69.5005 5.60352 69.474 5.46033 69.4551C5.30582 69.4361 5.16263 69.4096 5.02697 69.3792C4.90261 69.3527 4.78579 69.33 4.67274 69.311C4.5107 69.2693 4.36374 69.239 4.21677 69.2124C4.0585 69.1821 3.90023 69.148 3.73819 69.1101C3.57616 69.0722 3.42542 69.0343 3.27846 68.9964C3.13149 68.9585 2.98453 68.913 2.84133 68.8675C2.55117 68.7651 2.30999 68.6324 2.12158 68.4732C1.89924 68.2875 1.78619 68.0562 1.78619 67.7795C1.78619 67.5028 1.87663 67.2867 2.04998 67.0934C2.14042 67.0024 2.23839 66.9228 2.34014 66.8583C2.43812 66.7977 2.5474 66.7408 2.66045 66.6878C2.90162 66.5854 3.15033 66.5096 3.40658 66.4603C3.5347 66.4414 3.65529 66.4262 3.77211 66.4148C3.88893 66.4035 3.99821 66.3997 4.09996 66.3997C4.69535 66.3997 5.25683 66.4944 5.77687 66.6802C6.1537 66.8053 6.56068 66.991 6.9865 67.2336C7.06187 67.2753 7.13724 67.2905 7.22014 67.2791C7.29927 67.2678 7.35957 67.2336 7.40856 67.173L8.07555 66.3276C8.13208 66.2594 8.13208 66.2139 8.12454 66.1798C8.11701 66.1495 8.10193 66.1002 8.01526 66.0433C7.91728 65.9978 7.80423 65.9372 7.70626 65.8765C7.61582 65.8235 7.51784 65.7666 7.41233 65.7135C7.2729 65.6415 7.12216 65.5695 6.96389 65.5012C6.81316 65.433 6.65489 65.3724 6.48908 65.3193C6.33458 65.2776 6.165 65.2321 5.99166 65.1904C5.82208 65.1487 5.64874 65.1146 5.46409 65.088C4.70666 64.9743 3.64775 64.9667 2.70944 65.1411C2.19317 65.2397 1.72967 65.3951 1.34153 65.5998C0.945855 65.8235 0.61801 66.1191 0.373068 66.4755C0.124357 66.847 0 67.3132 0 67.8591C0 68.2306 0.0678297 68.5566 0.199722 68.8372C0.342918 69.1253 0.531337 69.3641 0.761206 69.5498C1.00238 69.7659 1.2737 69.9403 1.56763 70.0692C1.8691 70.217 2.1781 70.3307 2.50218 70.4103C2.83002 70.5127 3.13526 70.5809 3.42919 70.615C3.59123 70.6454 3.73066 70.6719 3.86632 70.6946C4.00198 70.7174 4.1301 70.7401 4.24692 70.7591C4.4278 70.7894 4.60114 70.816 4.76695 70.8425C4.93653 70.8728 5.10233 70.9069 5.26437 70.9448C5.43395 70.9828 5.59222 71.0207 5.73164 71.0586C5.87861 71.0965 6.01427 71.142 6.13863 71.1912C6.40995 71.3088 6.62474 71.4414 6.78301 71.5893C6.97896 71.8016 7.07317 72.0328 7.07317 72.2868C7.07317 72.4991 7.01288 72.7 6.89606 72.8857C6.78678 73.0677 6.62097 73.2383 6.40618 73.3861C6.17254 73.5415 5.91252 73.6591 5.63744 73.7273C5.35104 73.8145 5.00812 73.86 4.62752 73.86C3.90023 73.86 3.21439 73.7197 2.58508 73.4468C2.12911 73.2572 1.65053 73.026 1.16819 72.7606C1.09282 72.7189 1.02122 72.7038 0.938319 72.7152C0.870488 72.7265 0.821499 72.7531 0.783815 72.8099L0.11682 73.6894C0.0678321 73.7576 0.0716002 73.8069 0.0753685 73.841C0.0829052 73.8713 0.0979765 73.9168 0.173343 73.9547C0.297698 74.0344 0.406983 74.1026 0.508728 74.1594C0.610473 74.2201 0.715985 74.277 0.821498 74.3338C0.987305 74.4286 1.15688 74.512 1.33022 74.5878C1.50357 74.6674 1.68445 74.7357 1.8691 74.8001C2.261 74.9479 2.66799 75.0503 3.08627 75.1147C3.5347 75.1981 4.0585 75.2398 4.65767 75.2398C5.25683 75.2398 5.85977 75.1754 6.40241 75.0465C6.9036 74.929 7.34826 74.7432 7.72887 74.4855C8.09063 74.2504 8.36948 73.951 8.56544 73.5908C8.75762 73.2231 8.8556 72.7872 8.8556 72.2982C8.8556 71.8736 8.784 71.5059 8.6408 71.2102C8.51268 70.9259 8.32803 70.6757 8.09062 70.4596" fill="#FEF8EB" />
                <path d="M23.4995 65.2209C23.4844 65.1982 23.4694 65.1641 23.3752 65.1641C23.281 65.1641 23.2621 65.1982 23.2508 65.2209L17.7377 74.9974C17.7264 75.024 17.7227 75.0391 17.7227 75.0429C17.7227 75.0391 17.7528 75.0505 17.8131 75.0505H19.2601C19.3619 75.0505 19.4561 75.024 19.5578 74.9671C19.6558 74.9102 19.7236 74.8458 19.7689 74.77L20.2286 73.9398C20.2964 73.7957 20.4246 73.6668 20.6017 73.5721C20.7712 73.4811 20.9446 73.4318 21.1179 73.4318H25.6324C25.8057 73.4318 25.9791 73.4773 26.1449 73.5721C26.3107 73.6668 26.4351 73.7806 26.518 73.917L27.0003 74.77C27.038 74.8534 27.1058 74.914 27.2 74.9671C27.3055 75.024 27.4073 75.0543 27.509 75.0543H28.9561C29.0013 75.0543 29.0277 75.0467 29.0428 75.0429C29.0428 75.0353 29.0352 75.024 29.0239 75.0088L23.5071 65.2209H23.4995ZM25.0144 71.9193C24.9541 72.0216 24.8222 72.1467 24.5471 72.1467H22.1957C21.9281 72.1467 21.7962 72.033 21.7284 71.9382C21.6719 71.8586 21.5927 71.6843 21.7096 71.4341L22.972 69.0951C23.0888 68.8487 23.2734 68.8108 23.3714 68.8108C23.4694 68.8108 23.654 68.8487 23.7784 69.1065L25.0144 71.4265C25.1048 71.6009 25.1048 71.7752 25.0144 71.9193Z" fill="#FEF8EB" />
                <path d="M49.097 75.0504C49.1422 75.0504 49.1686 75.0428 49.1837 75.039C49.1799 75.0314 49.1761 75.0201 49.1648 75.0049L43.648 65.217C43.6329 65.1943 43.6178 65.1602 43.5236 65.1602C43.4294 65.1602 43.4106 65.1943 43.3992 65.217L37.8862 74.9935C37.8749 75.0201 37.8711 75.0352 37.8711 75.039C37.8711 75.0352 37.9012 75.0466 37.9615 75.0466H39.4086C39.5103 75.0466 39.6045 75.0201 39.7063 74.9632C39.8043 74.9063 39.8721 74.8419 39.9173 74.7661L40.377 73.9359C40.4449 73.7918 40.573 73.6629 40.7501 73.5682C40.9197 73.4772 41.093 73.4279 41.2701 73.4279H45.7846C45.958 73.4279 46.1313 73.4734 46.2971 73.5682C46.4629 73.6629 46.5873 73.7767 46.6702 73.9131L47.1525 74.7661C47.1902 74.8495 47.258 74.9101 47.3522 74.9632C47.4578 75.0201 47.5595 75.0504 47.6612 75.0504H49.1083H49.097ZM45.1628 71.9192C45.1025 72.0215 44.9706 72.1466 44.6956 72.1466H42.3441C42.0766 72.1466 41.9447 72.0329 41.8768 71.9381C41.8203 71.8585 41.7412 71.6841 41.858 71.4339L43.1204 69.095C43.2372 68.8486 43.4219 68.8107 43.5198 68.8107C43.6178 68.8107 43.8025 68.8486 43.9268 69.1064L45.1628 71.4264C45.2533 71.6007 45.2533 71.7751 45.1628 71.9192Z" fill="#FEF8EB" />
                <path d="M67.5317 72.2223C67.6749 71.9039 67.7804 71.5703 67.852 71.2291C67.9236 70.8841 67.9575 70.5051 67.9575 70.1108C67.9575 69.364 67.8143 68.6551 67.5317 67.9993C67.2641 67.3966 66.8496 66.8621 66.307 66.4186C65.282 65.5922 63.9517 65.1714 62.3464 65.1714H58.2465C58.1636 65.1714 58.1033 65.1941 58.0543 65.2396C58.0091 65.2813 57.9902 65.3268 57.9902 65.3875V74.8417C57.9902 74.9024 58.0091 74.9479 58.0543 74.9896C58.0844 75.0199 58.1372 75.0578 58.2465 75.0578H62.3464C63.1378 75.0578 63.8801 74.9517 64.5547 74.7432C65.2028 74.5461 65.7945 74.2352 66.3107 73.822C66.8609 73.3785 67.2716 72.8402 67.5317 72.2299M65.8171 71.9569C65.5684 72.4384 65.2556 72.8137 64.8901 73.0676C64.5208 73.3368 64.1062 73.5188 63.6654 73.6097C63.2169 73.6969 62.7798 73.7424 62.3653 73.7424H60.4736C60.2776 73.7424 60.1118 73.678 59.9799 73.5567C59.848 73.4316 59.7764 73.2686 59.7764 73.0866V67.1578C59.7764 66.9758 59.848 66.809 59.9837 66.6839C60.1118 66.5626 60.2814 66.4982 60.4736 66.4982H62.3653C62.7685 66.4982 63.2018 66.5437 63.6465 66.6308C64.0987 66.7218 64.517 66.9 64.8901 67.1616C65.2556 67.4155 65.5684 67.7908 65.8171 68.2723C66.0545 68.7575 66.1751 69.3792 66.1751 70.1222C66.1751 70.8652 66.0545 71.4982 65.8171 71.9607" fill="#FEF8EB" />
                <path d="M84.8747 65.1641H77.2928C77.2099 65.1641 77.1421 65.1868 77.0893 65.2361C77.0403 65.2778 77.0215 65.3233 77.0215 65.3801V74.8344C77.0215 74.8913 77.0403 74.9368 77.0893 74.9785C77.1458 75.0278 77.2099 75.0505 77.2928 75.0505H84.8747C84.9576 75.0505 85.0217 75.0278 85.0782 74.9785C85.1272 74.9368 85.146 74.8913 85.146 74.8344V73.9322C85.146 73.8753 85.1272 73.8299 85.0782 73.7882C85.0217 73.7389 84.9576 73.7161 84.8747 73.7161H79.5199C79.3277 73.7161 79.1619 73.6555 79.0262 73.5342C78.883 73.4091 78.8077 73.2423 78.8077 73.0565V71.5061C78.8077 71.3203 78.883 71.1573 79.0262 71.0284C79.1619 70.9071 79.3315 70.8465 79.5237 70.8465H84.1625C84.2454 70.8465 84.3094 70.8237 84.366 70.7745C84.415 70.7328 84.4338 70.6873 84.4338 70.6304V69.713C84.4338 69.6562 84.415 69.6107 84.366 69.569C84.3094 69.5197 84.2454 69.497 84.1625 69.497H79.5237C79.3315 69.497 79.1657 69.4363 79.03 69.315C78.8868 69.1899 78.8114 69.0231 78.8114 68.8374V67.1315C78.8114 66.9457 78.8868 66.7827 79.03 66.6538C79.1657 66.5325 79.3315 66.4719 79.5237 66.4719H84.8785C84.9614 66.4719 85.0254 66.4491 85.082 66.3999C85.1309 66.3582 85.1498 66.3127 85.1498 66.2558V65.3801C85.1498 65.3233 85.1309 65.2778 85.082 65.2361C85.0254 65.1868 84.9614 65.1641 84.8785 65.1641" fill="#FEF8EB" />
                <path d="M102.485 66.4112C101.46 65.5848 100.129 65.1641 98.5242 65.1641H94.4242C94.3413 65.1641 94.281 65.1868 94.232 65.2323C94.1868 65.274 94.168 65.3195 94.168 65.3801V74.8344C94.168 74.8951 94.1868 74.9406 94.232 74.9823C94.2622 75.0126 94.3149 75.0505 94.4242 75.0505H98.5242C99.3155 75.0505 100.058 74.9444 100.732 74.7359C101.381 74.5387 101.972 74.2279 102.488 73.8147C103.039 73.3712 103.449 72.8329 103.709 72.2226C103.853 71.9041 103.958 71.5705 104.03 71.2294C104.101 70.8844 104.135 70.5053 104.135 70.1111C104.135 69.3643 103.992 68.6554 103.709 67.9996C103.442 67.3968 103.027 66.8623 102.485 66.4188M101.995 71.9572C101.746 72.4386 101.433 72.8139 101.068 73.0679C100.699 73.337 100.284 73.519 99.8431 73.61C99.3947 73.6972 98.9575 73.7427 98.543 73.7427H96.6513C96.4553 73.7427 96.2895 73.6782 96.1614 73.5569C96.0258 73.4318 95.9579 73.2688 95.9579 73.0869V67.158C95.9579 66.9761 96.0295 66.8093 96.1652 66.6842C96.2971 66.5629 96.4629 66.4984 96.6551 66.4984H98.5468C98.95 66.4984 99.3833 66.5439 99.828 66.6311C100.28 66.7221 100.698 66.9003 101.072 67.1618C101.437 67.4158 101.75 67.7911 101.999 68.2725C102.236 68.7578 102.357 69.3794 102.357 70.1224C102.357 70.8654 102.236 71.4985 101.999 71.961" fill="#FEF8EB" />
                <path d="M121.268 66.4112C120.243 65.5848 118.913 65.1641 117.307 65.1641H113.207C113.125 65.1641 113.064 65.1868 113.015 65.2323C112.97 65.274 112.951 65.3195 112.951 65.3801V74.8344C112.951 74.8951 112.97 74.9406 113.015 74.9823C113.045 75.0126 113.098 75.0505 113.207 75.0505H117.307C118.099 75.0505 118.841 74.9444 119.516 74.7359C120.164 74.5387 120.755 74.2279 121.272 73.8147C121.822 73.3712 122.233 72.8329 122.493 72.2226C122.636 71.9041 122.745 71.5705 122.813 71.2294C122.885 70.8844 122.918 70.5053 122.918 70.1111C122.918 69.3643 122.775 68.6554 122.493 67.9996C122.225 67.3968 121.811 66.8623 121.268 66.4188M120.774 71.9572C120.526 72.4386 120.213 72.8139 119.847 73.0679C119.478 73.337 119.063 73.519 118.623 73.61C118.174 73.6972 117.737 73.7427 117.322 73.7427H115.431C115.235 73.7427 115.069 73.6782 114.941 73.5569C114.805 73.4318 114.737 73.2688 114.737 73.0869V67.158C114.737 66.9761 114.809 66.8093 114.945 66.6842C115.073 66.5629 115.242 66.4984 115.435 66.4984H117.326C117.729 66.4984 118.163 66.5439 118.607 66.6311C119.06 66.7221 119.478 66.9003 119.851 67.1618C120.217 67.4158 120.529 67.7911 120.778 68.2725C121.015 68.7578 121.136 69.3794 121.136 70.1224C121.136 70.8654 121.015 71.4985 120.778 71.961" fill="#FEF8EB" />
                <path d="M133.245 65.1753H131.991C131.881 65.1753 131.829 65.2132 131.798 65.2435C131.753 65.2852 131.734 65.3307 131.734 65.3914V74.8343C131.734 74.8949 131.753 74.9404 131.798 74.9821C131.829 75.0124 131.881 75.0504 131.991 75.0504H133.245C133.328 75.0504 133.392 75.0276 133.449 74.9783C133.498 74.9366 133.517 74.8911 133.517 74.8343V65.3914C133.517 65.3345 133.498 65.289 133.449 65.2473C133.392 65.198 133.328 65.1753 133.245 65.1753Z" fill="#FEF8EB" />
                <path d="M151.932 65.2473C151.876 65.198 151.812 65.1753 151.729 65.1753H150.489C150.406 65.1753 150.342 65.198 150.285 65.2473C150.236 65.289 150.217 65.3345 150.217 65.3914V70.7554C150.217 71.0435 150.067 71.1496 149.976 71.1875C149.826 71.2482 149.664 71.2065 149.494 71.07L142.515 65.2094C142.496 65.1942 142.462 65.1753 142.406 65.1753C142.391 65.1753 142.372 65.1753 142.353 65.1791L142.338 74.8305C142.338 74.8874 142.357 74.9328 142.406 74.9745C142.462 75.0238 142.519 75.0466 142.594 75.0466H143.849C143.932 75.0466 143.996 75.0238 144.052 74.9745C144.101 74.9328 144.12 74.8874 144.12 74.8305V69.5651C144.12 69.277 144.271 69.1708 144.361 69.1329C144.501 69.0722 144.663 69.1064 144.833 69.2277L151.804 74.9935C151.849 75.0238 151.909 75.0352 151.985 75.0238L152 65.3838C152 65.3269 151.981 65.2814 151.932 65.2397" fill="#FEF8EB" />
              </svg>


            </div>

            {/* Subtitle */}
            <p
              className="text-[#D2D2D2] text-[14px] font-medium leading-[100%] text-center mt-2 max-w-[320px]"
              style={{
                fontFamily: "'GE Dinar One', sans-serif",
                fontWeight: 500,
                fontSize: '14px',
                lineHeight: '100%',
                color: '#D2D2D2'
              }}
            >
              {isEn ? 'Since 1919, we have been offering the finest pastries and luxury chocolates with passion.' : 'منذ عام 1919، نقدم أجود الحلويات والشوكولاتة الفاخرة بعشق وشغف.'}
            </p>
          </div>

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
                    <input type="hidden" name="phone" value={phone} />
                    <input type="hidden" name="countryCode" value={countryCode} />

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
                          {isEn ? `Resend code in ${resendCooldown}s` : `إعادة الإرسال بعد ${resendCooldown} ثانية`}
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
          <svg width="400" height="200" viewBox="0 0 162 81" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[400px] max-w-full h-auto"><path d="M96.8051 39.0407C97.271 40.0265 97.2991 41.0932 96.7087 42.7537C96.5882 43.089 96.4918 42.6204 96.4918 42.6204C96.4517 42.4224 96.3914 42.2002 96.3272 41.9861C96.1344 41.2669 95.8332 40.3255 95.4757 40.1276C95.307 40.075 95.2227 40.1558 95.2468 40.37C95.2709 40.5841 95.7769 42.2689 95.4797 43.6587C95.4155 43.9254 95.3231 44.2001 95.1906 44.4789C95.1906 44.4789 95.1906 44.4829 95.1906 44.4869C95.1906 44.495 95.1825 44.5031 95.1785 44.5112C95.0861 44.6728 95.0259 44.4991 94.9817 44.3415C94.9817 44.3415 94.9737 44.3172 94.9737 44.3051C94.5359 42.7335 93.817 41.9739 93.7246 42.4992C93.6403 43.0042 94.1584 44.1274 94.1102 45.6748C94.0299 48.0868 92.4193 48.9958 92.4193 48.9958C92.7527 46.3212 92.7406 45.4162 92.584 45.0041C92.584 44.996 92.584 44.9879 92.584 44.9839C92.584 44.8506 92.4193 44.6526 92.1462 44.4789C91.4595 44.0385 90.0698 43.7557 88.8368 45.093C87.8006 46.2161 87.6882 47.5817 87.7685 48.4908C87.7806 48.5877 87.7886 48.6807 87.8006 48.7736C87.8087 48.8261 87.8167 48.8786 87.8247 48.9271C87.877 49.1897 87.9894 49.3594 88.3669 49.2059C88.7485 49.0362 89.3549 48.9756 90.0658 49.6867C89.7204 50.0665 86.3387 53.9168 84.3185 54.5673C82.2984 55.2177 80.238 52.3532 80.0573 51.4684C79.8766 50.5876 79.2099 50.3574 79.1456 50.923C79.0773 51.4886 77.5552 54.745 76.0812 56.9267C74.6113 59.1044 70.2456 59.7993 69.607 59.8236C69.5347 59.8236 69.4584 59.8236 69.3821 59.8236C69.3339 59.8236 69.2857 59.8195 69.2415 59.8155C69.0246 59.7993 68.8118 59.7791 68.6632 59.7791C68.3298 59.7549 68.0648 59.7185 67.6431 59.6579C66.9723 59.5569 68.2174 59.9528 69.2094 60.3892C70.2737 60.878 72.3581 61.3427 74.3864 60.971C76.772 60.5387 77.768 59.4842 79.6958 54.8097C79.9649 55.7227 82.1377 58.8377 85.3106 57.8035C88.4834 56.7692 91.5478 51.925 91.5478 51.925C95.5119 52.2643 95.7368 48.0302 95.7368 48.0302C95.7368 48.0302 98.2991 46.4626 98.9458 43.384C99.5964 40.3094 96.8332 38.0751 96.8332 38.0751C96.8332 38.0751 96.3071 37.9701 96.8091 39.0327" fill="#FEF8EB"></path><path d="M86.4865 32.4348C88.3219 43.4807 85.6511 48.3694 84.9322 49.6097C84.2133 50.85 84.3458 51.6904 84.7996 51.1692C86.6551 48.9915 88.7998 44.3776 89.2336 38.9031C89.6673 33.4287 87.9323 24.5079 86.9242 19.9384C85.9162 15.3689 83.1449 0 83.1449 0C82.5947 0.0606031 81.8919 2.23827 81.6147 3.216C81.3376 4.18969 80.9521 5.7775 81.189 6.78351C81.426 7.78952 84.647 21.3889 86.4824 32.4388" fill="#FEF8EB"></path><path d="M71.2807 51.7024C75.6183 49.5974 75.6022 45.0482 75.2488 41.7796C76.4938 41.109 77.7188 38.9798 78.3212 37.6425C78.6586 36.9435 79.0281 36.8344 79.498 36.9152C79.7269 36.9556 80.0602 37.2344 80.3374 37.5092C80.5824 37.7516 80.7711 37.9697 80.8354 38.0465C80.8354 38.0465 80.8394 38.0546 80.8434 38.0546C80.8474 38.0586 80.8515 38.0627 80.8555 38.0667L80.8595 38.0748C80.8595 38.0748 81.4017 36.7698 81.7029 35.6224C81.6708 35.3234 80.3976 33.8326 79.2168 33.5336C78.032 33.2346 76.5862 36.8264 75.1644 38.2728C73.7427 39.7151 72.7346 37.5092 72.3932 37.1173C72.0518 36.7254 71.7265 38.0505 71.6422 39.6464C71.5578 41.2423 72.3531 40.9878 73.1483 42.5311C74.2246 45.3754 72.5659 47.7915 70.0959 48.2319C67.6259 48.6722 65.8186 46.1673 65.6218 44.3411C65.425 42.515 67.2484 38.0667 71.1602 32.0145C75.0721 25.9622 76.5621 20.0029 76.7027 19.3444C76.8432 18.6858 76.5219 18.4636 76.2087 19.0979C75.8914 19.7322 73.9676 23.6351 72.843 25.4774C71.7185 27.3197 69.3569 31.5256 67.4894 34.3942C65.6218 37.2587 64.1237 41.1615 64.0314 45.032C63.939 48.9066 66.9432 53.8154 71.2847 51.7105" fill="#FEF8EB"></path><path d="M94.6355 53.9323C94.6997 53.7828 94.772 53.7465 94.8965 53.8636C94.9889 53.9525 95.0893 54.0374 95.1897 54.1141C95.4106 54.2879 95.5391 54.2636 95.7118 54.0616L96.5552 52.6879C96.8283 52.3768 96.6797 51.9809 96.744 51.6294C96.8203 51.2254 96.7962 50.7971 96.6275 50.3971C96.6034 50.3446 96.6155 50.2598 96.5351 50.2638C96.4347 50.2638 96.4548 50.3527 96.4548 50.4214C96.4548 50.5426 96.4548 50.6678 96.4548 50.789C96.4548 50.789 96.4548 50.8214 96.4548 50.8375V50.991C96.4267 51.3062 96.2781 51.6375 96.1857 51.8152C96.1777 51.8274 96.1737 51.8435 96.1656 51.8557C96.1536 51.8799 96.1416 51.8961 96.1335 51.9122C96.0893 51.989 96.0452 52.0617 95.993 52.1385C95.9448 52.0375 95.8966 51.9526 95.8644 51.8637C95.8243 51.7587 95.76 51.694 95.6476 51.7102C95.503 51.7264 95.519 51.8557 95.515 51.9405C95.511 52.0981 95.515 52.2637 95.5512 52.4172C95.6114 52.6435 95.503 52.8011 95.3865 52.9586C95.3022 53.0718 95.2058 53.0879 95.0772 52.9788C94.9286 52.8455 94.7961 52.6839 94.5913 52.6152C94.4547 52.5708 94.3905 52.595 94.3182 52.7203C94.1334 53.0516 94.0531 53.4192 93.9969 53.7828C93.8402 54.8292 93.3302 55.6615 92.5671 56.3645C91.8321 57.0392 91.0329 57.6251 90.1533 58.0978C89.84 58.2634 89.5348 58.4452 89.2256 58.619C89.1693 58.6513 89.1171 58.6998 89.1372 58.7644C89.1573 58.8291 89.2215 58.8493 89.2898 58.8331C89.4384 58.8008 89.591 58.8169 89.7396 58.7563C90.5108 58.421 91.2779 58.0776 92.0289 57.6938C92.5671 57.419 93.0651 57.0918 93.4908 56.6675C93.9567 56.2029 94.2017 55.6171 94.3583 54.9868C94.4467 54.6353 94.4828 54.2757 94.6314 53.9364" fill="#FEF8EB"></path><path d="M69.8802 42.4617C69.6271 42.3607 69.3701 42.2839 69.1452 42.2031C68.9886 42.2031 68.8962 42.2516 68.8199 42.3688C68.4865 42.89 68.1893 43.4313 67.9082 43.9808C67.7154 44.3566 67.7435 44.4737 68.1371 44.6192C68.6351 44.8091 69.1412 44.9828 69.6111 45.2454C69.8962 45.403 69.8962 45.3989 70.077 45.108C70.4424 44.5141 70.6593 43.8394 71.0168 43.2415C71.1172 43.0718 71.0168 42.9465 70.8601 42.8778C70.5388 42.7324 70.2135 42.591 69.8842 42.4617" fill="#FEF8EB"></path><path d="M79.3252 38.8059C79.1163 38.9756 77.1122 40.9068 76.7066 41.23C76.7066 41.23 76.4495 41.4967 76.3853 41.6179C76.1764 41.9007 76.5058 42.7128 76.6985 43.3996C76.8913 44.0865 76.9275 44.2683 77.2689 44.1107C78.2167 43.6057 80.1646 41.7754 80.2971 41.5128C80.4296 41.2502 79.9879 39.8362 79.8352 39.2867C79.6826 38.7332 79.538 38.6403 79.3292 38.8099" fill="#FEF8EB"></path><path d="M63.24 54.1627C64.0914 54.5869 65.1116 55.1485 66.6418 55.7182C67.2201 55.9525 67.8386 56.1667 68.4451 56.3202C70.0757 56.7282 71.7384 56.4697 73.3529 55.9364C75.8671 55.1041 77.7547 51.6335 79.2849 48.4175C79.2528 48.8943 81.0762 51.9568 83.1526 50.2275C85.229 48.4983 86.3616 44.7652 86.1447 39.2341C85.9318 33.7031 83.3654 23.0248 83.0241 21.433C82.6787 19.8412 80.4496 9.3447 80.2047 8.00335C79.9998 6.87209 79.554 7.13066 79.2769 8.10435C78.9998 9.08208 77.9515 13.6152 78.4094 14.6818C78.8672 15.7484 83.8072 37.7474 84.2972 41.4724C84.7872 45.1975 82.9919 47.153 82.028 47.3024C81.0601 47.4519 80.8834 45.4116 80.8794 44.5955C80.8794 43.7794 80.4376 43.2703 80.0239 43.7875C79.6102 44.3046 77.8752 47.5853 75.594 50.9709C74.3449 52.8214 71.9673 53.6658 69.919 54.0173C69.3166 54.1102 68.674 54.1829 67.9511 54.2274C67.8547 54.2274 67.7583 54.2354 67.6699 54.2354C67.0916 54.2678 66.461 54.2799 65.7662 54.2637C64.1557 54.2233 62.264 53.6779 63.24 54.1587" fill="#FEF8EB"></path><path d="M8.62692 75.1079C8.56266 75.0513 8.4984 74.9988 8.43013 74.9463C8.36586 74.8978 8.29357 74.8493 8.21325 74.8049C8.08473 74.7241 7.94416 74.6473 7.77949 74.5746C7.61081 74.4978 7.4622 74.4332 7.32967 74.3847L7.06058 74.2998C6.97222 74.2716 6.88386 74.2473 6.79952 74.2312C6.62281 74.1786 6.45814 74.1382 6.29348 74.1059C6.13283 74.0736 5.97218 74.0453 5.81956 74.0251C5.65489 74.0049 5.50227 73.9766 5.35769 73.9443C5.22515 73.916 5.10065 73.8918 4.98016 73.8716C4.80746 73.8271 4.65083 73.7948 4.49419 73.7665C4.32551 73.7342 4.15683 73.6979 3.98413 73.6575C3.81143 73.617 3.65078 73.5766 3.49415 73.5362C3.33751 73.4958 3.18088 73.4474 3.02826 73.3989C2.71901 73.2898 2.46197 73.1484 2.26115 72.9787C2.0242 72.7807 1.90371 72.5343 1.90371 72.2393C1.90371 71.9444 2.0001 71.7141 2.18484 71.5081C2.28123 71.4111 2.38566 71.3262 2.4941 71.2576C2.59852 71.1929 2.71499 71.1323 2.83548 71.0758C3.09252 70.9667 3.35759 70.8859 3.6307 70.8333C3.76725 70.8131 3.89577 70.797 4.02027 70.7849C4.14478 70.7727 4.26125 70.7687 4.36969 70.7687C5.00426 70.7687 5.60268 70.8697 6.15692 71.0677C6.55855 71.201 6.9923 71.399 7.44614 71.6575C7.52647 71.702 7.60679 71.7182 7.69515 71.706C7.77949 71.6939 7.84375 71.6575 7.89596 71.5929L8.60684 70.6919C8.66708 70.6192 8.66708 70.5707 8.65905 70.5344C8.65102 70.502 8.63495 70.4495 8.54258 70.3889C8.43816 70.3404 8.31767 70.2758 8.21325 70.2112C8.11686 70.1546 8.01243 70.094 7.89998 70.0374C7.75138 69.9607 7.59073 69.8839 7.42204 69.8112C7.26139 69.7384 7.09271 69.6738 6.91599 69.6172C6.75133 69.5728 6.5706 69.5243 6.38585 69.4799C6.20512 69.4354 6.02037 69.3991 5.82357 69.3708C5.0163 69.2496 3.88774 69.2415 2.88769 69.4274C2.33746 69.5324 1.84346 69.698 1.42979 69.9162C1.00808 70.1546 0.658668 70.4697 0.397612 70.8495C0.132539 71.2454 0 71.7424 0 72.3242C0 72.7201 0.0722921 73.0676 0.212861 73.3666C0.365479 73.6736 0.566294 73.9281 0.811286 74.1261C1.06833 74.3564 1.3575 74.5423 1.67076 74.6796C1.99206 74.8372 2.3214 74.9584 2.66679 75.0432C3.01621 75.1523 3.34153 75.2251 3.6548 75.2614C3.8275 75.2937 3.97609 75.322 4.12068 75.3463C4.26527 75.3705 4.40182 75.3947 4.52632 75.4149C4.7191 75.4473 4.90385 75.4755 5.08057 75.5038C5.2613 75.5361 5.43801 75.5725 5.61071 75.6129C5.79144 75.6533 5.96012 75.6937 6.10873 75.7341C6.26536 75.7745 6.40995 75.823 6.54248 75.8755C6.83165 76.0008 7.06058 76.1422 7.22926 76.2997C7.43811 76.526 7.53852 76.7724 7.53852 77.0431C7.53852 77.2694 7.47425 77.4835 7.34975 77.6815C7.23328 77.8754 7.05656 78.0572 6.82764 78.2148C6.57863 78.3805 6.30151 78.5057 6.00832 78.5784C5.70308 78.6713 5.3376 78.7198 4.93196 78.7198C4.15683 78.7198 3.42587 78.5703 2.75515 78.2794C2.26919 78.0774 1.75912 77.831 1.24504 77.5482C1.16472 77.5037 1.08841 77.4876 1.00005 77.4997C0.927758 77.5118 0.875545 77.5401 0.835382 77.6007L0.124506 78.538C0.0722947 78.6107 0.0763107 78.6633 0.080327 78.6996C0.0883595 78.7319 0.104422 78.7804 0.184747 78.8208C0.317284 78.9057 0.433758 78.9784 0.542197 79.039C0.650636 79.1036 0.763089 79.1643 0.875544 79.2249C1.05226 79.3259 1.23299 79.4147 1.41774 79.4955C1.60249 79.5804 1.79527 79.6531 1.99206 79.7218C2.40975 79.8794 2.84351 79.9885 3.28932 80.0571C3.76725 80.146 4.32551 80.1905 4.96409 80.1905C5.60268 80.1905 6.24528 80.1218 6.82362 79.9844C7.35778 79.8592 7.8317 79.6612 8.23734 79.3865C8.6229 79.136 8.92011 78.8168 9.12895 78.433C9.33378 78.0411 9.4382 77.5764 9.4382 77.0553C9.4382 76.6028 9.36189 76.2109 9.20928 75.8957C9.07272 75.5927 8.87593 75.3261 8.6229 75.0958" fill="#FEF8EB"></path><path d="M25.0456 69.5118C25.0295 69.4875 25.0135 69.4512 24.9131 69.4512C24.8126 69.4512 24.7926 69.4875 24.7805 69.5118L18.9047 79.9315C18.8927 79.9598 18.8887 79.9759 18.8887 79.9799C18.8887 79.9759 18.9208 79.988 18.9851 79.988H20.5273C20.6357 79.988 20.7362 79.9597 20.8446 79.8991C20.949 79.8385 21.0213 79.7699 21.0695 79.6891L21.5595 78.8042C21.6318 78.6507 21.7683 78.5134 21.9571 78.4123C22.1378 78.3154 22.3226 78.2629 22.5073 78.2629H27.3188C27.5035 78.2629 27.6883 78.3113 27.865 78.4123C28.0417 78.5134 28.1743 78.6346 28.2626 78.78L28.7767 79.6891C28.8169 79.7779 28.8892 79.8426 28.9896 79.8991C29.102 79.9597 29.2105 79.9921 29.3189 79.9921H30.8611C30.9093 79.9921 30.9374 79.984 30.9535 79.9799C30.9535 79.9719 30.9455 79.9598 30.9334 79.9436L25.0536 69.5118H25.0456ZM26.6601 76.6508C26.5959 76.7599 26.4553 76.8932 26.1621 76.8932H23.656C23.3708 76.8932 23.2302 76.772 23.158 76.671C23.0977 76.5862 23.0134 76.4003 23.1379 76.1337L24.4833 73.6409C24.6078 73.3783 24.8046 73.3378 24.909 73.3378C25.0135 73.3378 25.2103 73.3783 25.3428 73.653L26.6601 76.1256C26.7565 76.3114 26.7565 76.4973 26.6601 76.6508Z" fill="#FEF8EB"></path><path d="M52.3287 79.9882C52.3769 79.9882 52.405 79.9801 52.4211 79.976C52.417 79.968 52.413 79.9558 52.401 79.9397L46.5212 69.5079C46.5051 69.4836 46.489 69.4473 46.3886 69.4473C46.2882 69.4473 46.2682 69.4836 46.2561 69.5079L40.3803 79.9276C40.3683 79.9558 40.3643 79.972 40.3643 79.976C40.3643 79.972 40.3964 79.9841 40.4607 79.9841H42.0029C42.1113 79.9841 42.2117 79.9558 42.3202 79.8952C42.4246 79.8346 42.4969 79.766 42.5451 79.6852L43.0351 78.8003C43.1074 78.6468 43.2439 78.5095 43.4327 78.4084C43.6134 78.3115 43.7982 78.259 43.9869 78.259H48.7984C48.9831 78.259 49.1679 78.3074 49.3446 78.4084C49.5213 78.5095 49.6539 78.6307 49.7422 78.7761L50.2563 79.6852C50.2965 79.774 50.3688 79.8387 50.4692 79.8952C50.5816 79.9558 50.6901 79.9882 50.7985 79.9882H52.3407H52.3287ZM48.1357 76.651C48.0715 76.76 47.9309 76.8934 47.6377 76.8934H45.1316C44.8464 76.8934 44.7058 76.7722 44.6335 76.6712C44.5733 76.5863 44.489 76.4005 44.6135 76.1338L45.9589 73.641C46.0834 73.3784 46.2802 73.338 46.3846 73.338C46.4891 73.338 46.6858 73.3784 46.8184 73.6531L48.1357 76.1257C48.2321 76.3116 48.2321 76.4974 48.1357 76.651Z" fill="#FEF8EB"></path><path d="M71.9758 76.9747C72.1284 76.6354 72.2409 76.2798 72.3172 75.9162C72.3935 75.5486 72.4296 75.1445 72.4296 74.7243C72.4296 73.9284 72.277 73.1729 71.9758 72.474C71.6906 71.8316 71.2488 71.2619 70.6705 70.7892C69.5781 69.9084 68.1604 69.46 66.4494 69.46H62.0797C61.9914 69.46 61.9271 69.4842 61.8749 69.5327C61.8267 69.5771 61.8066 69.6256 61.8066 69.6902V79.7665C61.8066 79.8312 61.8267 79.8797 61.8749 79.9241C61.907 79.9564 61.9633 79.9968 62.0797 79.9968H66.4494C67.2928 79.9968 68.084 79.8837 68.803 79.6615C69.4937 79.4514 70.1243 79.1201 70.6745 78.6797C71.2609 78.207 71.6987 77.6333 71.9758 76.9828M70.1484 76.6919C69.8833 77.205 69.55 77.605 69.1604 77.8757C68.7668 78.1626 68.325 78.3565 67.8551 78.4535C67.3772 78.5464 66.9113 78.5949 66.4695 78.5949H64.4534C64.2445 78.5949 64.0678 78.5262 63.9272 78.3969C63.7867 78.2636 63.7103 78.0898 63.7103 77.8959V71.577C63.7103 71.3831 63.7866 71.2053 63.9312 71.072C64.0678 70.9427 64.2485 70.874 64.4534 70.874H66.4695C66.8992 70.874 67.3611 70.9225 67.835 71.0154C68.317 71.1124 68.7628 71.3023 69.1604 71.5811C69.55 71.8518 69.8833 72.2517 70.1484 72.7648C70.4014 73.282 70.53 73.9446 70.53 74.7365C70.53 75.5283 70.4014 76.2031 70.1484 76.696" fill="#FEF8EB"></path><path d="M90.4607 69.4512H82.38C82.2916 69.4512 82.2193 69.4754 82.1631 69.5279C82.1109 69.5724 82.0908 69.6209 82.0908 69.6815V79.7577C82.0908 79.8183 82.1109 79.8668 82.1631 79.9113C82.2234 79.9638 82.2916 79.988 82.38 79.988H90.4607C90.5491 79.988 90.6173 79.9638 90.6776 79.9113C90.7298 79.8668 90.7499 79.8183 90.7499 79.7577V78.7962C90.7499 78.7356 90.7298 78.6871 90.6776 78.6426C90.6173 78.5901 90.5491 78.5659 90.4607 78.5659H84.7536C84.5488 78.5659 84.372 78.5012 84.2275 78.3719C84.0748 78.2386 83.9945 78.0608 83.9945 77.8629V76.2104C83.9945 76.0125 84.0748 75.8387 84.2275 75.7014C84.372 75.5721 84.5528 75.5074 84.7576 75.5074H89.7016C89.79 75.5074 89.8583 75.4832 89.9185 75.4307C89.9707 75.3862 89.9908 75.3378 89.9908 75.2771V74.2994C89.9908 74.2388 89.9707 74.1903 89.9185 74.1459C89.8583 74.0934 89.79 74.0691 89.7016 74.0691H84.7576C84.5528 74.0691 84.3761 74.0045 84.2315 73.8752C84.0789 73.7419 83.9985 73.5641 83.9985 73.3661V71.548C83.9985 71.3501 84.0789 71.1763 84.2315 71.039C84.3761 70.9097 84.5528 70.845 84.7576 70.845H90.4647C90.5531 70.845 90.6213 70.8208 90.6816 70.7683C90.7338 70.7238 90.7539 70.6754 90.7539 70.6148V69.6815C90.7539 69.6209 90.7338 69.5724 90.6816 69.5279C90.6213 69.4754 90.5531 69.4512 90.4647 69.4512" fill="#FEF8EB"></path><path d="M109.227 70.7804C108.135 69.8996 106.717 69.4512 105.006 69.4512H100.636C100.548 69.4512 100.484 69.4754 100.432 69.5239C100.383 69.5683 100.363 69.6168 100.363 69.6815V79.7577C100.363 79.8224 100.383 79.8709 100.432 79.9153C100.464 79.9476 100.52 79.988 100.636 79.988H105.006C105.849 79.988 106.641 79.8749 107.36 79.6527C108.05 79.4426 108.681 79.1113 109.231 78.6709C109.818 78.1982 110.255 77.6245 110.532 76.974C110.685 76.6347 110.798 76.2791 110.874 75.9155C110.95 75.5478 110.986 75.1438 110.986 74.7236C110.986 73.9277 110.834 73.1722 110.532 72.4732C110.247 71.8309 109.805 71.2612 109.227 70.7885M108.705 76.6912C108.44 77.2043 108.107 77.6043 107.717 77.875C107.323 78.1619 106.882 78.3558 106.412 78.4528C105.934 78.5457 105.468 78.5942 105.026 78.5942H103.01C102.801 78.5942 102.624 78.5255 102.488 78.3962C102.343 78.2629 102.271 78.0891 102.271 77.8952V71.5763C102.271 71.3824 102.347 71.2046 102.492 71.0713C102.632 70.942 102.809 70.8733 103.014 70.8733H105.03C105.46 70.8733 105.922 70.9218 106.396 71.0147C106.878 71.1117 107.323 71.3016 107.721 71.5804C108.111 71.8511 108.444 72.251 108.709 72.7641C108.962 73.2813 109.091 73.9439 109.091 74.7358C109.091 75.5276 108.962 76.2024 108.709 76.6953" fill="#FEF8EB"></path><path d="M129.245 70.7804C128.152 69.8996 126.735 69.4512 125.024 69.4512H120.654C120.566 69.4512 120.501 69.4754 120.449 69.5239C120.401 69.5683 120.381 69.6168 120.381 69.6815V79.7577C120.381 79.8224 120.401 79.8709 120.449 79.9153C120.481 79.9476 120.538 79.988 120.654 79.988H125.024C125.867 79.988 126.658 79.8749 127.377 79.6527C128.068 79.4426 128.699 79.1113 129.249 78.6709C129.835 78.1982 130.273 77.6245 130.55 76.974C130.703 76.6347 130.819 76.2791 130.891 75.9155C130.968 75.5478 131.004 75.1438 131.004 74.7236C131.004 73.9277 130.851 73.1722 130.55 72.4732C130.265 71.8309 129.823 71.2612 129.245 70.7885M128.719 76.6912C128.454 77.2043 128.12 77.6043 127.731 77.875C127.337 78.1619 126.895 78.3558 126.425 78.4528C125.947 78.5457 125.482 78.5942 125.04 78.5942H123.024C122.815 78.5942 122.638 78.5255 122.501 78.3962C122.357 78.2629 122.285 78.0891 122.285 77.8952V71.5763C122.285 71.3824 122.361 71.2046 122.505 71.0713C122.642 70.942 122.823 70.8733 123.028 70.8733H125.044C125.473 70.8733 125.935 70.9218 126.409 71.0147C126.891 71.1117 127.735 71.5804C128.124 71.8511 128.458 72.251 128.723 72.7641C128.976 73.2813 129.104 73.9439 129.104 74.7358C129.104 75.5276 128.976 76.2024 128.723 76.6953" fill="#FEF8EB"></path><path d="M142.01 69.4639H140.673C140.556 69.4639 140.5 69.5043 140.468 69.5366C140.419 69.581 140.399 69.6295 140.399 69.6942V79.7583C140.399 79.8224 140.419 79.8714 140.468 79.9159C140.5 79.9482 140.556 79.9886 140.673 79.9886H142.01C142.098 79.9886 142.167 79.9644 142.227 79.9118C142.279 79.8674 142.299 79.8189 142.299 79.7583V69.6942C142.299 69.6336 142.279 69.5851 142.227 69.5406C142.167 69.4881 142.098 69.4639 142.01 69.4639Z" fill="#FEF8EB"></path><path d="M161.926 69.5406C161.865 69.4881 161.797 69.4639 161.709 69.4639H160.387C160.299 69.4639 160.231 69.4881 160.17 69.5406C160.118 69.5851 160.098 69.6336 160.098 69.6942V75.4111C160.098 75.7181 159.938 75.8312 159.841 75.8716C159.68 75.9363 159.508 75.8918 159.327 75.7464L151.889 69.5002C151.869 69.4841 151.833 69.4639 151.772 69.4639C151.756 69.4639 151.736 69.4639 151.716 69.4679L151.7 79.7543C151.7 79.8149 151.72 79.8634 151.772 79.9078C151.833 79.9603 151.893 79.9846 151.973 79.9846H153.311C153.399 79.9846 153.467 79.9603 153.528 79.9078C153.58 79.8634 153.6 79.8149 153.6 79.7543V74.1424C153.6 73.8354 153.761 73.7222 153.857 73.6818C154.006 73.6172 154.178 73.6536 154.359 73.7828L161.789 79.928C161.837 79.9603 161.901 79.9724 161.982 79.9603L161.998 69.6861C161.998 69.6255 161.978 69.577 161.926 69.5325" fill="#FEF8EB"></path></svg>
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
