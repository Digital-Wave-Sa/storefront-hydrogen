import {useState, useEffect, useRef} from 'react';
import {
  data,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from 'react-router';
import {
  Form,
  Link,
  useActionData,
  useNavigation,
  useRouteLoaderData,
  useLoaderData,
  useLocation,
} from 'react-router';
import {LogoSplash} from '~/components/LogoSplash';
import {SaadeddinApi} from '~/lib/saadeddin-api.server';
import {derivePassword} from '~/lib/auth.server';

export const meta: MetaFunction<typeof loader> = () => {
  return [{title: 'Login | Saadeddin'}];
};

export async function loader({request, context}: LoaderFunctionArgs) {
  try {
    const customerAccessToken = await context.session.get(
      'customerAccessToken',
    );
    const saadeddinToken = await context.session.get('saadeddinToken');
    const url = new URL(request.url);
    const redirectTo = url.searchParams.get('redirectTo') || '';

    if (customerAccessToken && saadeddinToken) {
      return redirect(
        redirectTo && redirectTo.startsWith('/') ? redirectTo : '/account',
      );
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
      redirectTo,
    });
  } catch (err) {
    console.error('[Login Loader Error]:', err);
    return data({
      otpPhone: null,
      otpCooldownRemaining: 0,
      otpBlockRemaining: 0,
      otpVerifyCooldownRemaining: 0,
      redirectTo: '',
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
    return lang === 'en'
      ? 'Invalid verification code.'
      : 'رمز التحقق غير صحيح.';
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
    } catch {}
  }

  const lowerMsg = cleanMsg.toLowerCase();

  // 1. Rate limiting matches MUST come first!
  const minutesMatch = cleanMsg.match(
    /please\s+wait\s+(\d+)\s+minutes?\s+before\s+requesting/i,
  );
  if (minutesMatch) {
    const mins = minutesMatch[1];
    if (mins === '1') {
      return lang === 'en'
        ? 'Please wait 1 minute before requesting a new code.'
        : 'يرجى الانتظار دقيقة واحدة قبل طلب رمز تحقق جديد.';
    } else if (mins === '2') {
      return lang === 'en'
        ? 'Please wait 2 minutes before requesting a new code.'
        : 'يرجى الانتظار دقيقتين قبل طلب رمز تحقق جديد.';
    } else {
      return lang === 'en'
        ? `Please wait ${mins} minutes before requesting a new code.`
        : `يرجى الانتظار ${mins} دقائق قبل طلب رمز تحقق جديد.`;
    }
  }

  const secondsMatch = cleanMsg.match(
    /please\s+wait\s+(\d+)\s+seconds?\s+before\s+requesting/i,
  );
  if (secondsMatch) {
    const secs = secondsMatch[1];
    return lang === 'en'
      ? `Please wait ${secs} seconds before requesting a new code.`
      : `يرجى الانتظار ${secs} ثانية قبل طلب رمز تحقق جديد.`;
  }

  // 2. Specific error matches
  if (lowerMsg.includes('invalid phone') || lowerMsg.includes('phone_number')) {
    return lang === 'en'
      ? 'Invalid phone number format. Please check the number and try again.'
      : 'رقم الجوال غير صحيح. يرجى التحقق من الرقم والمحاولة مرة أخرى.';
  }

  if (
    lowerMsg.includes('invalid otp') ||
    lowerMsg.includes('otp is invalid') ||
    lowerMsg.includes('incorrect otp')
  ) {
    return lang === 'en'
      ? 'Invalid verification code.'
      : 'رمز التحقق غير صحيح.';
  }
  if (
    lowerMsg.includes('otp expired') ||
    lowerMsg.includes('otp has expired')
  ) {
    return lang === 'en'
      ? 'Verification code expired. Please request a new code.'
      : 'انتهت صلاحية رمز التحقق. يرجى طلب رمز جديد.';
  }
  if (
    lowerMsg.includes('too many attempts') ||
    lowerMsg.includes('too many failed')
  ) {
    return lang === 'en'
      ? 'Too many failed attempts. Please try again later.'
      : 'لقد تجاوزت الحد الأقصى للمحاولات. يرجى المحاولة بعد قليل.';
  }
  if (lowerMsg.includes('not found') || lowerMsg.includes('not exist')) {
    return lang === 'en'
      ? 'Account not found. Please register.'
      : 'الحساب غير موجود. يرجى إنشاء حساب جديد.';
  }
  if (
    lowerMsg.includes('already registered') ||
    lowerMsg.includes('already exists')
  ) {
    return lang === 'en'
      ? 'This phone number is already registered.'
      : 'رقم الجوال هذا مسجل بالفعل.';
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

export async function action({request, context}: ActionFunctionArgs) {
  try {
    const {storefront, session, env} = context;
    const form = await request.formData();
    const intent = form.get('intent');
    const lang = storefront?.i18n?.language === 'EN' ? 'en' : 'ar';

    // Check if they are blocked due to too many failed OTP attempts
    const blockUntil = session.get('loginOtpBlockUntil');
    if (blockUntil && Date.now() < blockUntil) {
      const waitSecs = Math.ceil((blockUntil - Date.now()) / 1000);
      return data({
        error:
          lang === 'en'
            ? `Too many failed attempts. Please try again after ${Math.ceil(waitSecs / 60)} minutes.`
            : `لقد تجاوزت الحد الأقصى للمحاولات. يرجى المحاولة بعد ${Math.ceil(waitSecs / 60)} دقيقة.`,
        isBlocked: true,
        blockRemaining: waitSecs,
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
          error:
            lang === 'en'
              ? `Please wait ${waitSecs} seconds before requesting another code.`
              : `يرجى الانتظار ${waitSecs} ثانية قبل طلب رمز تحقق جديد.`,
          verifyCooldownRemaining: waitSecs,
        });
      }

      try {
        // Try to send OTP via Custom CRM API (Bypass fallback if service fails)
        try {
          const api = new SaadeddinApi(env);
          await api.requestOtp(fullPhone, 'login');
        } catch (otpErr: any) {
          console.warn(
            '[Login] OTP send API warning (Bypass Mode Active):',
            otpErr?.message,
          );
        }

        session.set('loginOtpPhone', fullPhone);
        session.set('loginOtpCooldown', Date.now() + 60 * 1000);
        return data(
          {success: true, step: 'otp', phone: fullPhone},
          {headers: {'Set-Cookie': await session.commit()}},
        );
      } catch (e: any) {
        console.error('[Login] send-otp error:', e);
        return data({
          error:
            lang === 'en'
              ? 'An unexpected error occurred. Please try again.'
              : 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.',
        });
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
        return data({
          error:
            lang === 'en'
              ? 'Session expired. Please request a new code.'
              : 'انتهت الجلسة. يرجى طلب رمز جديد.',
        });
      }

      if (!otp || otp.length < 4) {
        return data({
          error:
            lang === 'en'
              ? 'Please enter the 4-digit verification code.'
              : 'يرجى إدخال رمز التحقق المكوّن من 4 أرقام.',
        });
      }

      // ── Step 1: Verify OTP with CRM ──────────────────────────────────────────
      let saadeddinToken: string | null = null;
      let crmProfile: any = null;

      try {
        const api = new SaadeddinApi(env);
        // CRM expects /auth/verify-otp with flowType 'login', not /auth/login
        const loginResult = await api.verifyOtp(savedPhone, otp, 'login');
        saadeddinToken = loginResult?.token || null;
        crmProfile =
          loginResult?.profile || loginResult?.customer || loginResult || null;

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
        return data({error: errMsg});
      }

      // ── Step 2: Get/create Shopify customer via Admin API ────────────────────
      const stablePassword = await derivePassword(
        savedPhone,
        env.SESSION_SECRET || 'saadeddin-otp-secret',
      );
      let resolvedEmail: string | null =
        crmProfile?.email || session.get('loginCustomerEmail') || null;
      let resolvedCustomerId: string | null = null;

      let adminToken: string | null = null;
      let adminDomain: string = '';
      try {
        const {getAdminToken, getAdminDomain} =
          await import('~/lib/shopify-admin.server');
        adminToken = await getAdminToken(env);
        adminDomain = getAdminDomain(env);
      } catch (_) {}

      if (adminToken && adminDomain) {
        const rawDigits = savedPhone.replace(/\D/g, ''); // e.g. "962790910041"
        const last9Digits = rawDigits.slice(-9); // e.g. "790910041"
        const localFormat = rawDigits.startsWith('962')
          ? '0' + rawDigits.slice(3)
          : rawDigits.startsWith('966')
            ? '0' + rawDigits.slice(3)
            : rawDigits;

        const searchQueries = [
          `phone:${rawDigits}`,
          `phone:${localFormat}`,
          `phone:${savedPhone}`,
          `${last9Digits}`,
        ];

        if (
          resolvedEmail &&
          !resolvedEmail.endsWith('@saadeddin.placeholder')
        ) {
          searchQueries.unshift(`email:"${resolvedEmail}"`);
        }

        for (const q of searchQueries) {
          if (resolvedCustomerId) break;
          try {
            const searchRes = await fetch(
              `https://${adminDomain}/admin/api/2024-01/customers/search.json?query=${encodeURIComponent(q)}&fields=id,email,phone,first_name,last_name,default_address,addresses`,
              {headers: {'X-Shopify-Access-Token': adminToken}},
            );
            if (searchRes.ok) {
              const searchData = (await searchRes.json()) as any;
              const candidates = (searchData.customers || []).filter(
                (c: any) => {
                  const primaryPhone = (c.phone || '').replace(/\D/g, '');
                  const matchesPhone = Boolean(
                    primaryPhone && 
                    rawDigits && 
                    (primaryPhone === rawDigits || primaryPhone.endsWith(last9Digits))
                  );

                  const matchesEmail =
                    resolvedEmail &&
                    c.email &&
                    c.email.toLowerCase() === resolvedEmail.toLowerCase();
                  if (matchesPhone) return true;
                  if (matchesEmail && !primaryPhone) return true;
                  return false;
                },
              );

              // Prioritize original customer account: real email first, real first name, then oldest customer ID
              candidates.sort((a: any, b: any) => {
                const aPlaceholder = (a.email || '').endsWith(
                  '@saadeddin.placeholder',
                );
                const bPlaceholder = (b.email || '').endsWith(
                  '@saadeddin.placeholder',
                );
                if (aPlaceholder !== bPlaceholder) return aPlaceholder ? 1 : -1;

                const aCustName =
                  (a.first_name || '').toLowerCase() === 'customer';
                const bCustName =
                  (b.first_name || '').toLowerCase() === 'customer';
                if (aCustName !== bCustName) return aCustName ? 1 : -1;

                return Number(a.id) - Number(b.id);
              });

              const found = candidates[0];

              if (found) {
                resolvedCustomerId = String(found.id);
                resolvedEmail = found.email || resolvedEmail;
              }
            }
          } catch (_) {}
        }

        // Fallback: Verify CRM's shopifyId if no matching customer was found in search
        if (!resolvedCustomerId && crmProfile?.shopifyId) {
          const numericId = String(crmProfile.shopifyId).split('/').pop()!;
          try {
            const verifyRes = await fetch(
              `https://${adminDomain}/admin/api/2024-01/customers/${numericId}.json?fields=id,email,phone`,
              {headers: {'X-Shopify-Access-Token': adminToken}},
            );
            if (verifyRes.ok) {
              const verifyData = (await verifyRes.json()) as any;
              const cp = (verifyData.customer?.phone || '').replace(/\D/g, '');
              const matchesPhone = Boolean(cp && rawDigits && (cp === rawDigits || cp.endsWith(last9Digits)));
              
              if (matchesPhone) {
                resolvedCustomerId = numericId;
                resolvedEmail = verifyData.customer?.email || resolvedEmail;
              }
            }
          } catch (_) {}
        }

        // 4. Create customer ONLY if all search attempts returned 0 matches
        if (!resolvedCustomerId) {
          const nameParts = (crmProfile?.name || '').trim().split(/\s+/);
          const firstName = nameParts[0] || 'Customer';
          const lastName = nameParts.slice(1).join(' ') || '(N/A)';
          const createEmail =
            resolvedEmail ||
            `${savedPhone.replace(/\D/g, '')}@saadeddin.placeholder`;

          try {
            const createRes = await fetch(
              `https://${adminDomain}/admin/api/2024-01/customers.json`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Shopify-Access-Token': adminToken,
                },
                body: JSON.stringify({
                  customer: {
                    first_name: firstName,
                    last_name: lastName,
                    phone: savedPhone,
                    email: createEmail,
                    password: stablePassword,
                    password_confirmation: stablePassword,
                    tags:
                      crmProfile?.accountType === 'COMPANY'
                        ? 'verified_phone, B2B'
                        : 'verified_phone',
                    verified_email: true,
                  },
                }),
              },
            );

            if (createRes.ok) {
              const createData = (await createRes.json()) as any;
              resolvedCustomerId = String(createData.customer?.id);
              resolvedEmail = createData.customer?.email || createEmail;
            } else {
              // If creation failed because customer already exists in Shopify, query by raw digits or email
              const rawDigits = savedPhone.replace(/\D/g, '');
              const last9Digits = rawDigits.slice(-9);

              try {
                const recoverRes = await fetch(
                  `https://${adminDomain}/admin/api/2024-01/customers/search.json?query=${encodeURIComponent(last9Digits)}&fields=id,email,phone`,
                  {headers: {'X-Shopify-Access-Token': adminToken}},
                );
                if (recoverRes.ok) {
                  const recoverData = (await recoverRes.json()) as any;
                  const found = (recoverData.customers || []).find((c: any) => {
                    const cp = (c.phone || '').replace(/\D/g, '');
                    return Boolean(cp && rawDigits && (cp === rawDigits || cp.endsWith(last9Digits)));
                  });
                  
                  if (found) {
                    resolvedCustomerId = String(found.id);
                    resolvedEmail = found.email || resolvedEmail;
                  } else if (!resolvedCustomerId) {
                    // If creation failed due to email collision, and phone wasn't found, try creating with placeholder email
                    const retryEmail = `${rawDigits}@saadeddin.placeholder`;
                    try {
                      const retryRes = await fetch(`https://${adminDomain}/admin/api/2024-01/customers.json`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'X-Shopify-Access-Token': adminToken,
                        },
                        body: JSON.stringify({
                          customer: {
                            first_name: firstName,
                            last_name: lastName,
                            phone: savedPhone,
                            email: retryEmail,
                            password: stablePassword,
                            password_confirmation: stablePassword,
                            tags: crmProfile?.accountType === 'COMPANY' ? 'verified_phone, B2B' : 'verified_phone',
                            verified_email: true,
                          },
                        }),
                      });
                      if (retryRes.ok) {
                        const retryData = (await retryRes.json()) as any;
                        resolvedCustomerId = String(retryData.customer?.id);
                        resolvedEmail = retryData.customer?.email || retryEmail;
                      }
                    } catch (_) {}
                  }
                }
              } catch (_) {}
            }
          } catch (_) {}
        }

        // 4. Always reset password so Storefront mutation works
        if (resolvedCustomerId) {
          try {
            await fetch(
              `https://${adminDomain}/admin/api/2024-01/customers/${resolvedCustomerId}.json`,
              {
                method: 'PUT',
                headers: {
                  'X-Shopify-Access-Token': adminToken,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  customer: {
                    id: resolvedCustomerId,
                    password: stablePassword,
                    password_confirmation: stablePassword,
                  },
                }),
              },
            );
          } catch (_) {}
        }
      }

      // ── Step 3: Create Shopify Storefront access token ───────────────────────
      const loginEmail =
        resolvedEmail ||
        `${savedPhone.replace(/\D/g, '')}@saadeddin.placeholder`;

      let storefrontToken: any = null;
      try {
        const tokenResponse = await storefront.mutate(LOGIN_MUTATION, {
          variables: {input: {email: loginEmail, password: stablePassword}},
        });

        storefrontToken =
          tokenResponse.customerAccessTokenCreate?.customerAccessToken || null;

        const userErrors =
          tokenResponse.customerAccessTokenCreate?.customerUserErrors || [];
        if (userErrors.length > 0) {
          console.error(
            '[Login] Storefront mutation errors:',
            JSON.stringify(userErrors),
          );
        }
      } catch (sfErr: any) {
        console.error('[Login] Storefront mutation threw:', sfErr?.message);
      }

      if (!storefrontToken) {
        console.warn(
          '[Login] Storefront token creation returned null, using session token fallback for customer:',
          resolvedCustomerId,
        );
        storefrontToken = {
          accessToken: `session-${resolvedCustomerId || Date.now()}`,
          expiresAt: new Date(Date.now() + 86400 * 1000).toISOString(),
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
      const rawRedirect =
        url.searchParams.get('redirectTo') || form.get('redirectTo') || '';
      let cleanRedirect =
        typeof rawRedirect === 'string' && rawRedirect.startsWith('/')
          ? rawRedirect
          : '/account';

      if (cleanRedirect.startsWith('/en/')) {
        cleanRedirect = cleanRedirect.substring(3);
      } else if (cleanRedirect === '/en') {
        cleanRedirect = '/account';
      }

      const targetRedirect =
        userLang === 'en' ? `/en${cleanRedirect}` : cleanRedirect;

      return redirect(targetRedirect, {
        headers: {'Set-Cookie': await session.commit()},
      });
    }

    return data({error: 'Invalid request'});
  } catch (err: any) {
    console.error('[Login Action Error]:', err);
    const lang = context?.storefront?.i18n?.language === 'EN' ? 'en' : 'ar';
    return data({
      error:
        lang === 'en'
          ? 'An unexpected error occurred on the server. Please try again.'
          : 'حدث خطأ غير متوقع في الخادم. يرجى المحاولة مرة أخرى.',
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
  const location = useLocation();
  const rootData = useRouteLoaderData('root') as any;
  const isEn =
    location.pathname.startsWith('/en') ||
    rootData?.locale === 'en' ||
    rootData?.consent?.language?.toLowerCase() === 'en';
  const isLoading = navigation.state === 'submitting';

  const [step, setStep] = useState<'input' | 'otp'>(initialStep);
  const [phone, setPhone] = useState(initialPhone);
  const [countryCode, setCountryCode] = useState(initialCountryCode);
  const [otpValue, setOtpValue] = useState(['', '', '', '']);
  const otpRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(initialCooldown);
  const [blockCooldown, setBlockCooldown] = useState(
    loaderData?.otpBlockRemaining || 0,
  );
  const [verifyCooldown, setVerifyCooldown] = useState(
    loaderData?.otpVerifyCooldownRemaining || 0,
  );
  const [submittedPhone, setSubmittedPhone] = useState('');
  const resendFormRef = useRef<HTMLFormElement>(null);
  const [hasEditSinceError, setHasEditSinceError] = useState(false);

  const lastProcessedActionRef = useRef<any>(null);

  useEffect(() => {
    if (!actionData || actionData === lastProcessedActionRef.current) return;
    lastProcessedActionRef.current = actionData;

    if (actionData?.step === 'otp') {
      setStep('otp');
      setResendCooldown(60);
      setVerifyCooldown(60);
      setSubmittedPhone(phone);
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
      setResendCooldown(actionData.verifyCooldownRemaining);
      setSubmittedPhone(phone);
    }
  }, [actionData, phone]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(
      () => setResendCooldown((c: number) => c - 1),
      1000,
    );
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (blockCooldown <= 0) return;
    const timer = setTimeout(
      () => setBlockCooldown((c: number) => c - 1),
      1000,
    );
    return () => clearTimeout(timer);
  }, [blockCooldown]);

  useEffect(() => {
    if (verifyCooldown <= 0) return;
    const timer = setTimeout(
      () => setVerifyCooldown((c: number) => c - 1),
      1000,
    );
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

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
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
    <div
      className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-4 lg:p-8"
      dir={isEn ? 'ltr' : 'rtl'}
    >
      {/* Outer Flex Wrapper */}
      <div
        className={`w-full max-w-[1280px] mx-auto flex flex-col ${isEn ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-8 min-h-[640px]`}
      >
        {/* Form Card (LEFT on desktop) */}
        <div className="w-full lg:w-1/2 bg-white rounded-[32px] overflow-hidden p-0 lg:p-12 flex flex-col justify-between shadow-sm">
          {/* Mobile Green Header Box (Visible only on mobile lg:hidden, full width inside container with no padding) */}
          <div className="w-full bg-[#234745] text-white rounded-b-[24px] p-6 flex flex-col items-center justify-center text-center relative overflow-hidden lg:hidden shadow-md">
            {/* Top Pill: Back to Store */}
            <div className="w-full flex justify-start mb-2">
              <Link
                to={isEn ? '/en' : '/'}
                className="bg-[#9FB7AE] hover:bg-[#8EA69D] !text-[#234745] rounded-full px-4 py-1.5 text-[13px] font-bold flex items-center gap-2 transition-colors shadow-sm"
                style={{fontFamily: "'GE Dinar One', sans-serif"}}
              >
                <svg
                  width="10"
                  height="9"
                  viewBox="0 0 10 9"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M0 4H8.16667L4.66667 0.5L5.10667 0L9.44 4.33333L5.10667 8.66667L4.66667 8.16667L8.16667 4.66667H0V4Z"
                    fill="#234745"
                  />
                </svg>
                <span>{isEn ? 'Back to store' : 'العودة للمتجر'}</span>
              </Link>
            </div>

            {/* Centered Saadeddin Logo (Width: 150px) */}
            <div className="w-[150px] flex justify-center items-center my-3">
              <svg
                width="152"
                height="76"
                viewBox="0 0 152 76"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M90.8253 36.6309C91.2624 37.5558 91.2888 38.5566 90.7348 40.1146C90.6218 40.4293 90.5313 39.9895 90.5313 39.9895C90.4937 39.8038 90.4371 39.5953 90.3768 39.3944C90.196 38.7196 89.9133 37.8363 89.5779 37.6506C89.4197 37.6013 89.3405 37.6771 89.3632 37.878C89.3858 38.079 89.8606 39.6597 89.5817 40.9638C89.5214 41.214 89.4348 41.4717 89.3104 41.7333C89.3104 41.7333 89.3104 41.7371 89.3104 41.7409C89.3104 41.7485 89.3029 41.756 89.2991 41.7636C89.2124 41.9153 89.1559 41.7522 89.1144 41.6044C89.1144 41.6044 89.1069 41.5817 89.1069 41.5703C88.6962 40.0957 88.0216 39.383 87.935 39.8758C87.8558 40.3496 88.3419 41.4035 88.2967 42.8554C88.2213 45.1185 86.7102 45.9714 86.7102 45.9714C87.023 43.4619 87.0117 42.6128 86.8647 42.2261C86.8647 42.2185 86.8647 42.2109 86.8647 42.2071C86.8647 42.082 86.7102 41.8963 86.454 41.7333C85.8096 41.3201 84.5058 41.0547 83.3489 42.3095C82.3767 43.3633 82.2711 44.6446 82.3465 45.4976C82.3578 45.5885 82.3654 45.6757 82.3767 45.7629C82.3842 45.8122 82.3917 45.8615 82.3993 45.907C82.4483 46.1534 82.5538 46.3126 82.908 46.1685C83.266 46.0093 83.835 45.9525 84.502 46.6196C84.1779 46.976 81.005 50.5886 79.1095 51.1989C77.214 51.8093 75.2809 49.1216 75.1113 48.2914C74.9417 47.465 74.3162 47.2489 74.2559 47.7796C74.1918 48.3103 72.7636 51.3657 71.3806 53.4128C70.0014 55.456 65.9052 56.108 65.3061 56.1308C65.2382 56.1308 65.1666 56.1308 65.095 56.1308C65.0498 56.1308 65.0046 56.127 64.9632 56.1232C64.7597 56.108 64.56 56.0891 64.4205 56.0891C64.1077 56.0663 63.859 56.0322 63.4634 55.9754C62.834 55.8806 64.0022 56.2521 64.933 56.6615C65.9316 57.1202 67.8874 57.5561 69.7904 57.2074C72.0288 56.8018 72.9633 55.8124 74.7722 51.4264C75.0246 52.2831 77.0633 55.2058 80.0403 54.2354C83.0173 53.2649 85.8925 48.7198 85.8925 48.7198C89.6119 49.0382 89.8229 45.0654 89.8229 45.0654C89.8229 45.0654 92.2271 43.5946 92.8338 40.706C93.4443 37.8212 90.8516 35.7249 90.8516 35.7249C90.8516 35.7249 90.358 35.6263 90.829 36.6233"
                  fill="#FEF8EB"
                />
                <path
                  d="M81.1432 30.4326C82.8653 40.7967 80.3594 45.3836 79.6848 46.5474C79.0103 47.7111 79.1347 48.4996 79.5605 48.0106C81.3015 45.9674 83.3138 41.6383 83.7207 36.5017C84.1277 31.3652 82.4998 22.9951 81.5539 18.7077C80.6081 14.4202 78.0079 0 78.0079 0C77.4917 0.0568622 76.8322 2.10011 76.5722 3.01749C76.3122 3.93107 75.9504 5.42086 76.1728 6.36477C76.3951 7.30868 79.4173 20.0686 81.1394 30.4364"
                  fill="#FEF8EB"
                />
                <path
                  d="M66.88 48.5112C70.9498 46.5362 70.9347 42.2678 70.6031 39.201C71.7713 38.5717 72.9206 36.574 73.4859 35.3192C73.8024 34.6634 74.1491 34.561 74.59 34.6369C74.8048 34.6748 75.1176 34.9363 75.3776 35.1941C75.6074 35.4215 75.7846 35.6263 75.8448 35.6983C75.8448 35.6983 75.8486 35.7059 75.8524 35.7059C75.8562 35.7096 75.8599 35.7134 75.8637 35.7172L75.8675 35.7248C75.8675 35.7248 76.3762 34.5004 76.6588 33.4238C76.6287 33.1433 75.4341 31.7445 74.3262 31.4639C73.2145 31.1834 71.8579 34.5535 70.524 35.9106C69.19 37.2639 68.2441 35.1941 67.9238 34.8264C67.6035 34.4587 67.2983 35.7021 67.2191 37.1994C67.14 38.6968 67.8861 38.458 68.6323 39.9061C69.6422 42.5748 68.0858 44.8417 65.7683 45.2549C63.4508 45.6681 61.755 43.3178 61.5704 41.6044C61.3857 39.8909 63.0966 35.7172 66.7669 30.0386C70.4373 24.36 71.8353 18.7685 71.9672 18.1506C72.0991 17.5327 71.7977 17.3242 71.5037 17.9194C71.206 18.5145 69.401 22.1765 68.3459 23.9051C67.2907 25.6337 65.0749 29.5799 63.3227 32.2714C61.5704 34.9591 60.1648 38.621 60.0781 42.2526C59.9914 45.888 62.8102 50.4938 66.8837 48.5188"
                  fill="#FEF8EB"
                />
                <path
                  d="M88.7899 50.6038C88.8502 50.4635 88.918 50.4294 89.0349 50.5394C89.1215 50.6228 89.2158 50.7024 89.31 50.7744C89.5172 50.9374 89.6378 50.9147 89.7998 50.7251L90.5912 49.4362C90.8474 49.1443 90.708 48.7728 90.7683 48.443C90.8399 48.064 90.8173 47.6621 90.659 47.2868C90.6364 47.2376 90.6477 47.158 90.5724 47.1618C90.4781 47.1618 90.497 47.2451 90.497 47.3096C90.497 47.4233 90.497 47.5408 90.497 47.6546C90.497 47.6546 90.497 47.6849 90.497 47.7V47.8441C90.4706 48.1398 90.3312 48.4506 90.2445 48.6174C90.237 48.6288 90.2332 48.644 90.2257 48.6553C90.2144 48.6781 90.2031 48.6932 90.1955 48.7084C90.1541 48.7804 90.1126 48.8487 90.0636 48.9207C90.0184 48.8259 89.9732 48.7463 89.943 48.6629C89.9054 48.5644 89.8451 48.5037 89.7396 48.5189C89.6039 48.534 89.619 48.6553 89.6152 48.7349C89.6114 48.8828 89.6152 49.0382 89.6491 49.1823C89.7056 49.3945 89.6039 49.5424 89.4946 49.6902C89.4155 49.7964 89.325 49.8115 89.2044 49.7092C89.065 49.5841 88.9407 49.4325 88.7485 49.368C88.6204 49.3263 88.5601 49.3491 88.4922 49.4666C88.3189 49.7774 88.2435 50.1224 88.1908 50.4636C88.0438 51.4454 87.5652 52.2263 86.8492 52.8859C86.1596 53.5189 85.4097 54.0686 84.5845 54.5121C84.2905 54.6676 84.0041 54.8381 83.714 55.0012C83.6612 55.0315 83.6122 55.077 83.6311 55.1376C83.6499 55.1983 83.7102 55.2172 83.7743 55.2021C83.9137 55.1717 84.0569 55.1869 84.1963 55.13C84.9198 54.8154 85.6396 54.4932 86.3443 54.1331C86.8492 53.8753 87.3165 53.5682 87.7159 53.1702C88.1531 52.7342 88.3829 52.1846 88.5299 51.5932C88.6128 51.2634 88.6467 50.926 88.7862 50.6076"
                  fill="#FEF8EB"
                />
                <path
                  d="M65.5647 39.8417C65.3273 39.747 65.0862 39.6749 64.8751 39.5991C64.7282 39.5991 64.6415 39.6446 64.5699 39.7545C64.2571 40.2436 63.9783 40.7515 63.7145 41.2671C63.5336 41.6196 63.56 41.7296 63.9293 41.866C64.3965 42.0442 64.8714 42.2072 65.3123 42.4536C65.5798 42.6014 65.5798 42.5977 65.7494 42.3247C66.0923 41.7675 66.2958 41.1344 66.6312 40.5734C66.7254 40.4141 66.6312 40.2966 66.4842 40.2322C66.1827 40.0957 65.8775 39.963 65.5685 39.8417"
                  fill="#FEF8EB"
                />
                <path
                  d="M74.4286 36.4108C74.2327 36.57 72.3523 38.382 71.9717 38.6853C71.9717 38.6853 71.7305 38.9355 71.6702 39.0492C71.4743 39.3146 71.7833 40.0765 71.9641 40.721C72.145 41.3654 72.1789 41.536 72.4993 41.3881C73.3886 40.9143 75.2162 39.197 75.3406 38.9506C75.4649 38.7042 75.0504 37.3775 74.9072 36.8619C74.764 36.3426 74.6284 36.2554 74.4324 36.4146"
                  fill="#FEF8EB"
                />
                <path
                  d="M59.3368 50.8197C60.1357 51.2177 61.0928 51.7446 62.5285 52.2791C63.0712 52.499 63.6515 52.6999 64.2205 52.8439C65.7505 53.2268 67.3106 52.9842 68.8254 52.4838C71.1844 51.7029 72.9555 48.4466 74.3913 45.4291C74.3611 45.8764 76.072 48.7499 78.0202 47.1274C79.9684 45.5049 81.0311 42.0022 80.8276 36.8126C80.6279 31.623 78.2199 21.6039 77.8996 20.1103C77.5755 18.6167 75.4841 8.76818 75.2542 7.50963C75.062 6.44821 74.6438 6.69082 74.3837 7.6044C74.1237 8.52178 73.1402 12.7751 73.5698 13.7758C73.9994 14.7766 78.6344 35.4176 79.0942 38.9127C79.5539 42.4078 77.8695 44.2426 76.9651 44.3829C76.0569 44.5231 75.8911 42.6088 75.8873 41.843C75.8873 41.0773 75.4728 40.5996 75.0847 41.0849C74.6965 41.5701 73.0686 44.6482 70.9282 47.8249C69.7562 49.5611 67.5254 50.3534 65.6035 50.6832C65.0383 50.7704 64.4353 50.8386 63.757 50.8803C63.6666 50.8803 63.5761 50.8879 63.4932 50.8879C62.9506 50.9182 62.359 50.9296 61.7071 50.9144C60.1959 50.8765 58.4211 50.3648 59.3368 50.8159"
                  fill="#FEF8EB"
                />
                <path
                  d="M8.09439 70.471C8.0341 70.4179 7.97381 70.3686 7.90975 70.3194C7.84945 70.2739 7.78162 70.2284 7.70626 70.1867C7.58567 70.1109 7.45378 70.0388 7.29927 69.9706C7.141 69.8986 7.00157 69.8379 6.87722 69.7924L6.62474 69.7128C6.54184 69.6863 6.45893 69.6635 6.3798 69.6484C6.21399 69.5991 6.05949 69.5612 5.90499 69.5309C5.75426 69.5005 5.60352 69.474 5.46033 69.4551C5.30582 69.4361 5.16263 69.4096 5.02697 69.3792C4.90261 69.3527 4.78579 69.33 4.67274 69.311C4.5107 69.2693 4.36374 69.239 4.21677 69.2124C4.0585 69.1821 3.90023 69.148 3.73819 69.1101C3.57616 69.0722 3.42542 69.0343 3.27846 68.9964C3.13149 68.9585 2.98453 68.913 2.84133 68.8675C2.55117 68.7651 2.30999 68.6324 2.12158 68.4732C1.89924 68.2875 1.78619 68.0562 1.78619 67.7795C1.78619 67.5028 1.87663 67.2867 2.04998 67.0934C2.14042 67.0024 2.23839 66.9228 2.34014 66.8583C2.43812 66.7977 2.5474 66.7408 2.66045 66.6878C2.90162 66.5854 3.15033 66.5096 3.40658 66.4603C3.5347 66.4414 3.65529 66.4262 3.77211 66.4148C3.88893 66.4035 3.99821 66.3997 4.09996 66.3997C4.69535 66.3997 5.25683 66.4944 5.77687 66.6802C6.1537 66.8053 6.56068 66.991 6.9865 67.2336C7.06187 67.2753 7.13724 67.2905 7.22014 67.2791C7.29927 67.2678 7.35957 67.2336 7.40856 67.173L8.07555 66.3276C8.13208 66.2594 8.13208 66.2139 8.12454 66.1798C8.11701 66.1495 8.10193 66.1002 8.01526 66.0433C7.91728 65.9978 7.80423 65.9372 7.70626 65.8765C7.61582 65.8235 7.51784 65.7666 7.41233 65.7135C7.2729 65.6415 7.12216 65.5695 6.96389 65.5012C6.81316 65.433 6.65489 65.3724 6.48908 65.3193C6.33458 65.2776 6.165 65.2321 5.99166 65.1904C5.82208 65.1487 5.64874 65.1146 5.46409 65.088C4.70666 64.9743 3.64775 64.9667 2.70944 65.1411C2.19317 65.2397 1.72967 65.3951 1.34153 65.5998C0.945855 65.8235 0.61801 66.1191 0.373068 66.4755C0.124357 66.847 0 67.3132 0 67.8591C0 68.2306 0.0678297 68.5566 0.199722 68.8372C0.342918 69.1253 0.531337 69.3641 0.761206 69.5498C1.00238 69.7659 1.2737 69.9403 1.56763 70.0692C1.8691 70.217 2.1781 70.3307 2.50218 70.4103C2.83002 70.5127 3.13526 70.5809 3.42919 70.615C3.59123 70.6454 3.73066 70.6719 3.86632 70.6946C4.00198 70.7174 4.1301 70.7401 4.24692 70.7591C4.4278 70.7894 4.60114 70.816 4.76695 70.8425C4.93653 70.8728 5.10233 70.9069 5.26437 70.9448C5.43395 70.9828 5.59222 71.0207 5.73164 71.0586C5.87861 71.0965 6.01427 71.142 6.13863 71.1912C6.40995 71.3088 6.62474 71.4414 6.78301 71.5893C6.97896 71.8016 7.07317 72.0328 7.07317 72.2868C7.07317 72.4991 7.01288 72.7 6.89606 72.8857C6.78678 73.0677 6.62097 73.2383 6.40618 73.3861C6.17254 73.5415 5.91252 73.6591 5.63744 73.7273C5.35104 73.8145 5.00812 73.86 4.62752 73.86C3.90023 73.86 3.21439 73.7197 2.58508 73.4468C2.12911 73.2572 1.65053 73.026 1.16819 72.7606C1.09282 72.7189 1.02122 72.7038 0.938319 72.7152C0.870488 72.7265 0.821499 72.7531 0.783815 72.8099L0.11682 73.6894C0.0678321 73.7576 0.0716002 73.8069 0.0753685 73.841C0.0829052 73.8713 0.0979765 73.9168 0.173343 73.9547C0.297698 74.0344 0.406983 74.1026 0.508728 74.1594C0.610473 74.2201 0.715985 74.277 0.821498 74.3338C0.987305 74.4286 1.15688 74.512 1.33022 74.5878C1.50357 74.6674 1.68445 74.7357 1.8691 74.8001C2.261 74.9479 2.66799 75.0503 3.08627 75.1147C3.5347 75.1981 4.0585 75.2398 4.65767 75.2398C5.25683 75.2398 5.85977 75.1754 6.40241 75.0465C6.9036 74.929 7.34826 74.7432 7.72887 74.4855C8.09063 74.2504 8.36948 73.951 8.56544 73.5908C8.75762 73.2231 8.8556 72.7872 8.8556 72.2982C8.8556 71.8736 8.784 71.5059 8.6408 71.2102C8.51268 70.9259 8.32803 70.6757 8.09062 70.4596"
                  fill="#FEF8EB"
                />
                <path
                  d="M23.4995 65.2209C23.4844 65.1982 23.4694 65.1641 23.3752 65.1641C23.281 65.1641 23.2621 65.1982 23.2508 65.2209L17.7377 74.9974C17.7264 75.024 17.7227 75.0391 17.7227 75.0429C17.7227 75.0391 17.7528 75.0505 17.8131 75.0505H19.2601C19.3619 75.0505 19.4561 75.024 19.5578 74.9671C19.6558 74.9102 19.7236 74.8458 19.7689 74.77L20.2286 73.9398C20.2964 73.7957 20.4246 73.6668 20.6017 73.5721C20.7712 73.4811 20.9446 73.4318 21.1179 73.4318H25.6324C25.8057 73.4318 25.9791 73.4773 26.1449 73.5721C26.3107 73.6668 26.4351 73.7806 26.518 73.917L27.0003 74.77C27.038 74.8534 27.1058 74.914 27.2 74.9671C27.3055 75.024 27.4073 75.0543 27.509 75.0543H28.9561C29.0013 75.0543 29.0277 75.0467 29.0428 75.0429C29.0428 75.0353 29.0352 75.024 29.0239 75.0088L23.5071 65.2209H23.4995ZM25.0144 71.9193C24.9541 72.0216 24.8222 72.1467 24.5471 72.1467H22.1957C21.9281 72.1467 21.7962 72.033 21.7284 71.9382C21.6719 71.8586 21.5927 71.6843 21.7096 71.4341L22.972 69.0951C23.0888 68.8487 23.2734 68.8108 23.3714 68.8108C23.4694 68.8108 23.654 68.8487 23.7784 69.1065L25.0144 71.4265C25.1048 71.6009 25.1048 71.7752 25.0144 71.9193Z"
                  fill="#FEF8EB"
                />
                <path
                  d="M49.097 75.0504C49.1422 75.0504 49.1686 75.0428 49.1837 75.039C49.1799 75.0314 49.1761 75.0201 49.1648 75.0049L43.648 65.217C43.6329 65.1943 43.6178 65.1602 43.5236 65.1602C43.4294 65.1602 43.4106 65.1943 43.3992 65.217L37.8862 74.9935C37.8749 75.0201 37.8711 75.0352 37.8711 75.039C37.8711 75.0352 37.9012 75.0466 37.9615 75.0466H39.4086C39.5103 75.0466 39.6045 75.0201 39.7063 74.9632C39.8043 74.9063 39.8721 74.8419 39.9173 74.7661L40.377 73.9359C40.4449 73.7918 40.573 73.6629 40.7501 73.5682C40.9197 73.4772 41.093 73.4279 41.2701 73.4279H45.7846C45.958 73.4279 46.1313 73.4734 46.2971 73.5682C46.4629 73.6629 46.5873 73.7767 46.6702 73.9131L47.1525 74.7661C47.1902 74.8495 47.258 74.9101 47.3522 74.9632C47.4578 75.0201 47.5595 75.0504 47.6612 75.0504H49.1083H49.097ZM45.1628 71.9192C45.1025 72.0215 44.9706 72.1466 44.6956 72.1466H42.3441C42.0766 72.1466 41.9447 72.0329 41.8768 71.9381C41.8203 71.8585 41.7412 71.6841 41.858 71.4339L43.1204 69.095C43.2372 68.8486 43.4219 68.8107 43.5198 68.8107C43.6178 68.8107 43.8025 68.8486 43.9268 69.1064L45.1628 71.4264C45.2533 71.6007 45.2533 71.7751 45.1628 71.9192Z"
                  fill="#FEF8EB"
                />
                <path
                  d="M67.5317 72.2223C67.6749 71.9039 67.7804 71.5703 67.852 71.2291C67.9236 70.8841 67.9575 70.5051 67.9575 70.1108C67.9575 69.364 67.8143 68.6551 67.5317 67.9993C67.2641 67.3966 66.8496 66.8621 66.307 66.4186C65.282 65.5922 63.9517 65.1714 62.3464 65.1714H58.2465C58.1636 65.1714 58.1033 65.1941 58.0543 65.2396C58.0091 65.2813 57.9902 65.3268 57.9902 65.3875V74.8417C57.9902 74.9024 58.0091 74.9479 58.0543 74.9896C58.0844 75.0199 58.1372 75.0578 58.2465 75.0578H62.3464C63.1378 75.0578 63.8801 74.9517 64.5547 74.7432C65.2028 74.5461 65.7945 74.2352 66.3107 73.822C66.8609 73.3785 67.2716 72.8402 67.5317 72.2299M65.8171 71.9569C65.5684 72.4384 65.2556 72.8137 64.8901 73.0676C64.5208 73.3368 64.1062 73.5188 63.6654 73.6097C63.2169 73.6969 62.7798 73.7424 62.3653 73.7424H60.4736C60.2776 73.7424 60.1118 73.678 59.9799 73.5567C59.848 73.4316 59.7764 73.2686 59.7764 73.0866V67.1578C59.7764 66.9758 59.848 66.809 59.9837 66.6839C60.1118 66.5626 60.2814 66.4982 60.4736 66.4982H62.3653C62.7685 66.4982 63.2018 66.5437 63.6465 66.6308C64.0987 66.7218 64.517 66.9 64.8901 67.1616C65.2556 67.4155 65.5684 67.7908 65.8171 68.2723C66.0545 68.7575 66.1751 69.3792 66.1751 70.1222C66.1751 70.8652 66.0545 71.4982 65.8171 71.9607"
                  fill="#FEF8EB"
                />
                <path
                  d="M84.8747 65.1641H77.2928C77.2099 65.1641 77.1421 65.1868 77.0893 65.2361C77.0403 65.2778 77.0215 65.3233 77.0215 65.3801V74.8344C77.0215 74.8913 77.0403 74.9368 77.0893 74.9785C77.1458 75.0278 77.2099 75.0505 77.2928 75.0505H84.8747C84.9576 75.0505 85.0217 75.0278 85.0782 74.9785C85.1272 74.9368 85.146 74.8913 85.146 74.8344V73.9322C85.146 73.8753 85.1272 73.8299 85.0782 73.7882C85.0217 73.7389 84.9576 73.7161 84.8747 73.7161H79.5199C79.3277 73.7161 79.1619 73.6555 79.0262 73.5342C78.883 73.4091 78.8077 73.2423 78.8077 73.0565V71.5061C78.8077 71.3203 78.883 71.1573 79.0262 71.0284C79.1619 70.9071 79.3315 70.8465 79.5237 70.8465H84.1625C84.2454 70.8465 84.3094 70.8237 84.366 70.7745C84.415 70.7328 84.4338 70.6873 84.4338 70.6304V69.713C84.4338 69.6562 84.415 69.6107 84.366 69.569C84.3094 69.5197 84.2454 69.497 84.1625 69.497H79.5237C79.3315 69.497 79.1657 69.4363 79.03 69.315C78.8868 69.1899 78.8114 69.0231 78.8114 68.8374V67.1315C78.8114 66.9457 78.8868 66.7827 79.03 66.6538C79.1657 66.5325 79.3315 66.4719 79.5237 66.4719H84.8785C84.9614 66.4719 85.0254 66.4491 85.082 66.3999C85.1309 66.3582 85.1498 66.3127 85.1498 66.2558V65.3801C85.1498 65.3233 85.1309 65.2778 85.082 65.2361C85.0254 65.1868 84.9614 65.1641 84.8785 65.1641"
                  fill="#FEF8EB"
                />
                <path
                  d="M102.485 66.4112C101.46 65.5848 100.129 65.1641 98.5242 65.1641H94.4242C94.3413 65.1641 94.281 65.1868 94.232 65.2323C94.1868 65.274 94.168 65.3195 94.168 65.3801V74.8344C94.168 74.8951 94.1868 74.9406 94.232 74.9823C94.2622 75.0126 94.3149 75.0505 94.4242 75.0505H98.5242C99.3155 75.0505 100.058 74.9444 100.732 74.7359C101.381 74.5387 101.972 74.2279 102.488 73.8147C103.039 73.3712 103.449 72.8329 103.709 72.2226C103.853 71.9041 103.958 71.5705 104.03 71.2294C104.101 70.8844 104.135 70.5053 104.135 70.1111C104.135 69.3643 103.992 68.6554 103.709 67.9996C103.442 67.3968 103.027 66.8623 102.485 66.4188M101.995 71.9572C101.746 72.4386 101.433 72.8139 101.068 73.0679C100.699 73.337 100.284 73.519 99.8431 73.61C99.3947 73.6972 98.9575 73.7427 98.543 73.7427H96.6513C96.4553 73.7427 96.2895 73.6782 96.1614 73.5569C96.0258 73.4318 95.9579 73.2688 95.9579 73.0869V67.158C95.9579 66.9761 96.0295 66.8093 96.1652 66.6842C96.2971 66.5629 96.4629 66.4984 96.6551 66.4984H98.5468C98.95 66.4984 99.3833 66.5439 99.828 66.6311C100.28 66.7221 100.698 66.9003 101.072 67.1618C101.437 67.4158 101.75 67.7911 101.999 68.2725C102.236 68.7578 102.357 69.3794 102.357 70.1224C102.357 70.8654 102.236 71.4985 101.999 71.961"
                  fill="#FEF8EB"
                />
                <path
                  d="M121.268 66.4112C120.243 65.5848 118.913 65.1641 117.307 65.1641H113.207C113.125 65.1641 113.064 65.1868 113.015 65.2323C112.97 65.274 112.951 65.3195 112.951 65.3801V74.8344C112.951 74.8951 112.97 74.9406 113.015 74.9823C113.045 75.0126 113.098 75.0505 113.207 75.0505H117.307C118.099 75.0505 118.841 74.9444 119.516 74.7359C120.164 74.5387 120.755 74.2279 121.272 73.8147C121.822 73.3712 122.233 72.8329 122.493 72.2226C122.636 71.9041 122.745 71.5705 122.813 71.2294C122.885 70.8844 122.918 70.5053 122.918 70.1111C122.918 69.3643 122.775 68.6554 122.493 67.9996C122.225 67.3968 121.811 66.8623 121.268 66.4188M120.774 71.9572C120.526 72.4386 120.213 72.8139 119.847 73.0679C119.478 73.337 119.063 73.519 118.623 73.61C118.174 73.6972 117.737 73.7427 117.322 73.7427H115.431C115.235 73.7427 115.069 73.6782 114.941 73.5569C114.805 73.4318 114.737 73.2688 114.737 73.0869V67.158C114.737 66.9761 114.809 66.8093 114.945 66.6842C115.073 66.5629 115.242 66.4984 115.435 66.4984H117.326C117.729 66.4984 118.163 66.5439 118.607 66.6311C119.06 66.7221 119.478 66.9003 119.851 67.1618C120.217 67.4158 120.529 67.7911 120.778 68.2725C121.015 68.7578 121.136 69.3794 121.136 70.1224C121.136 70.8654 121.015 71.4985 120.778 71.961"
                  fill="#FEF8EB"
                />
                <path
                  d="M133.245 65.1753H131.991C131.881 65.1753 131.829 65.2132 131.798 65.2435C131.753 65.2852 131.734 65.3307 131.734 65.3914V74.8343C131.734 74.8949 131.753 74.9404 131.798 74.9821C131.829 75.0124 131.881 75.0504 131.991 75.0504H133.245C133.328 75.0504 133.392 75.0276 133.449 74.9783C133.498 74.9366 133.517 74.8911 133.517 74.8343V65.3914C133.517 65.3345 133.498 65.289 133.449 65.2473C133.392 65.198 133.328 65.1753 133.245 65.1753Z"
                  fill="#FEF8EB"
                />
                <path
                  d="M151.932 65.2473C151.876 65.198 151.812 65.1753 151.729 65.1753H150.489C150.406 65.1753 150.342 65.198 150.285 65.2473C150.236 65.289 150.217 65.3345 150.217 65.3914V70.7554C150.217 71.0435 150.067 71.1496 149.976 71.1875C149.826 71.2482 149.664 71.2065 149.494 71.07L142.515 65.2094C142.496 65.1942 142.462 65.1753 142.406 65.1753C142.391 65.1753 142.372 65.1753 142.353 65.1791L142.338 74.8305C142.338 74.8874 142.357 74.9328 142.406 74.9745C142.462 75.0238 142.519 75.0466 142.594 75.0466H143.849C143.932 75.0466 143.996 75.0238 144.052 74.9745C144.101 74.9328 144.12 74.8874 144.12 74.8305V69.5651C144.12 69.277 144.271 69.1708 144.361 69.1329C144.501 69.0722 144.663 69.1064 144.833 69.2277L151.804 74.9935C151.849 75.0238 151.909 75.0352 151.985 75.0238L152 65.3838C152 65.3269 151.981 65.2814 151.932 65.2397"
                  fill="#FEF8EB"
                />
              </svg>
            </div>

            {/* Subtitle */}
            <p
              className="text-[#D2D2D2] text-[14px] font-medium leading-[100%] text-center mt-2 max-w-[320px]"
              style={{
                fontFamily: "'GE Dinar One', sans-serif",
                fontWeight: 500,
                fontSize: '14px',
                lineHeight: '20px',
                color: '#D2D2D2',
              }}
            >
              {isEn
                ? 'Since 1919, we have been offering the finest pastries and luxury chocolates with passion.'
                : 'منذ عام 1919، نقدم أجود الحلويات والشوكولاتة الفاخرة بعشق وشغف.'}
            </p>
          </div>

          {/* Main Form Container */}
          <div className="w-full flex flex-col items-center p-6 lg:p-0">
            {/* Header / Welcome Text */}
            <div className="flex flex-col items-center mb-6 gap-2 w-full border-b border-[#BBCFCD]/50 pb-6">
              <h1
                className="text-[26px] font-bold text-[#171717] flex items-center gap-2 !my-0"
                style={{
                  fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif",
                }}
              >
                <span>{isEn ? 'Welcome Back' : 'مرحباً بعودتك'}</span>
                <span className="text-[32px]">👋</span>
              </h1>
              <p
                className="text-[14px] font-medium text-[#A19F9F] text-center"
                style={{
                  fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                }}
              >
                {isEn
                  ? 'Enter your information below to log into your account'
                  : 'أدخل المعلومات أدناه للدخول إلى حسابك'}
              </p>
            </div>

            {/* Form Box */}
            <div className="w-full flex flex-col items-center gap-4">
              {/* Tabs */}
              <div className="flex w-full gap-4 h-[48px]">
                <button
                  className="flex-1 bg-[#234745] text-[#FEF8EB] rounded-[25px] font-bold text-[16px] transition-colors"
                  style={{
                    fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                  }}
                >
                  {isEn ? 'Log in' : 'تسجيل دخول'}
                </button>
                <Link
                  to={
                    isEn
                      ? `/en/account/register${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`
                      : `/account/register${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`
                  }
                  className="flex-1 flex items-center justify-center bg-white border border-[#234745] text-[#234745] rounded-[25px] font-bold text-[16px] hover:bg-[#234745]/5 transition-colors"
                  style={{
                    fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                  }}
                >
                  {isEn ? 'Create Account' : 'إنشاء حساب'}
                </Link>
              </div>

              {blockCooldown > 0 && (
                <div
                  className="w-full border border-[#EAD6BA] bg-[#FCF7ED] rounded-[16px] p-5 flex flex-col gap-2 text-[#8B6D43] text-sm relative mb-6"
                  dir={isEn ? 'ltr' : 'rtl'}
                >
                  <div className="flex items-center gap-2 font-bold text-base">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="shrink-0"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                    <span>
                      {isEn
                        ? 'Account temporarily locked'
                        : 'الحساب مقفل مؤقتاً'}
                    </span>
                  </div>
                  <p className="leading-relaxed font-medium">
                    {isEn ? (
                      <>
                        After 3 failed attempts — you can try again after{' '}
                        <span className="font-bold">
                          {formatMMSS(blockCooldown)}
                        </span>{' '}
                        minutes or{' '}
                        <Link
                          to="/en/account/recover"
                          className="underline font-bold hover:text-[#7A5C33]"
                        >
                          reset password
                        </Link>
                      </>
                    ) : (
                      <>
                        بعد ٣ محاولات فاشلة — يمكنك المحاولة مجدداً بعد{' '}
                        <span className="font-bold">
                          {formatMMSS(blockCooldown)}
                        </span>{' '}
                        دقيقة أو{' '}
                        <Link
                          to="/account/recover"
                          className="underline font-bold hover:text-[#7A5C33]"
                        >
                          إعادة تعيين كلمة المرور
                        </Link>
                      </>
                    )}
                  </p>
                </div>
              )}

              {/* Login Steps */}
              {step === 'input' ? (
                <Form
                  method="POST"
                  className="w-full flex flex-col gap-6 w-full"
                >
                  <input type="hidden" name="intent" value="send-otp" />

                  {/* Phone Input */}
                  <div className="flex flex-col gap-2 w-full">
                    <label
                      className={`text-[12px] font-bold text-[#171717] px-1 w-full flex gap-1 ${isEn ? 'flex-row' : 'flex-row-reverse justify-end'}`}
                      style={{
                        fontFamily:
                          "'EnglishDigits', 'GE Dinar One', sans-serif",
                      }}
                    >
                      <span className="text-[#E55C5C]">*</span>
                      <span>{isEn ? 'Mobile Number' : 'رقم الجوال'}</span>
                    </label>
                    <div
                      className="flex flex-row items-center border border-[#234745] bg-white rounded-full h-[48px] focus-within:border-[#234745] transition-colors overflow-hidden"
                      dir="ltr"
                    >
                      <select
                        name="countryCode"
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        disabled={blockCooldown > 0}
                        className="bg-transparent border-none text-[#171717] font-bold text-[14px] focus:ring-0 outline-none pl-4 pr-6 py-3 appearance-none cursor-pointer disabled:opacity-50"
                        style={{
                          backgroundImage:
                            "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e\")",
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 0.2rem center',
                          backgroundSize: '1.2em',
                          width: '90px',
                        }}
                      >
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
                        style={{
                          fontFamily:
                            "'EnglishDigits', 'GE Dinar One', sans-serif",
                        }}
                        value={phone}
                        onChange={(e) =>
                          setPhone(e.target.value.replace(/\D/g, ''))
                        }
                        required
                        disabled={blockCooldown > 0}
                      />
                    </div>
                  </div>

                  {(() => {
                    const currentPhoneCooldown =
                      phone === submittedPhone || !submittedPhone
                        ? Math.max(resendCooldown, verifyCooldown)
                        : 0;

                    return (
                      <>
                        {currentPhoneCooldown > 0 && (
                          <div
                            className="w-full bg-[#FFF1F1] border border-[#FCA5A5] rounded-full py-3 px-4 flex items-center justify-center gap-2 text-[#D93838] text-[14px] font-bold my-1 text-center"
                            dir={isEn ? 'ltr' : 'rtl'}
                            style={{
                              fontFamily:
                                "'EnglishDigits', 'GE Dinar One', sans-serif",
                            }}
                          >
                            <span className="w-5 h-5 rounded-full border-2 border-[#D93838] flex items-center justify-center text-[12px] font-extrabold shrink-0">
                              !
                            </span>
                            <span>
                              {isEn
                                ? `Please wait ${currentPhoneCooldown} seconds before requesting a new code.`
                                : `يرجى الانتظار ${currentPhoneCooldown} ثانية قبل طلب رمز تحقق جديد.`}
                            </span>
                          </div>
                        )}

                        {actionData?.error && currentPhoneCooldown <= 0 && (
                          <div
                            className="w-full border border-[#F38C8C] bg-[#FFF5F5] rounded-[12px] py-3 px-4 flex items-center gap-3 text-[#E55C5C] text-sm font-semibold justify-center"
                            dir={isEn ? 'ltr' : 'rtl'}
                          >
                            <svg
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="shrink-0"
                            >
                              <circle cx="12" cy="12" r="10" />
                              <line x1="12" y1="8" x2="12" y2="12" />
                              <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            <span
                              style={{
                                fontFamily:
                                  "'EnglishDigits', 'GE Dinar One', sans-serif",
                              }}
                            >
                              {actionData.error}
                            </span>
                          </div>
                        )}
                      </>
                    );
                  })()}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={
                      isLoading ||
                      phone.length < 9 ||
                      blockCooldown > 0 ||
                      ((phone === submittedPhone || !submittedPhone) &&
                        Math.max(resendCooldown, verifyCooldown) > 0)
                    }
                    className="w-full bg-[#234745] text-[#FEF8EB] font-bold text-[16px] rounded-[25px] h-[48px] flex items-center justify-center hover:bg-[#1a3533] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                    style={{
                      fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                    }}
                  >
                    {isLoading
                      ? isEn
                        ? 'Sending...'
                        : 'جاري الإرسال...'
                      : blockCooldown > 0
                        ? isEn
                          ? 'Locked'
                          : 'مغلق'
                        : isEn
                          ? 'Send Verification Code'
                          : 'إرسال رمز التحقق'}
                  </button>
                </Form>
              ) : (
                <>
                  {/* Hidden resend form */}
                  <Form method="POST" ref={resendFormRef} className="hidden">
                    <input type="hidden" name="intent" value="send-otp" />
                    <input type="hidden" name="phone" value={phone} />
                    <input
                      type="hidden"
                      name="countryCode"
                      value={countryCode}
                    />
                  </Form>

                  <Form method="POST" className="w-full flex flex-col gap-6">
                    <input type="hidden" name="intent" value="verify-otp" />
                    <input type="hidden" name="otp" value={otpValue.join('')} />
                    <input type="hidden" name="phone" value={phone} />
                    <input
                      type="hidden"
                      name="countryCode"
                      value={countryCode}
                    />

                    <div className="flex flex-col gap-2 w-full items-center">
                      <div
                        className="text-[14px] font-medium text-[#707070] mb-2 flex items-center justify-center gap-1 flex-wrap"
                        style={{
                          fontFamily:
                            "'EnglishDigits', 'GE Dinar One', sans-serif",
                        }}
                      >
                        <span>
                          {isEn
                            ? 'We sent the verification code to'
                            : 'أرسلنا رمز التحقق إلى'}
                        </span>
                        <span className="font-bold text-[#171717]" dir="ltr">
                          {countryCode} {phone}
                        </span>
                        <button
                          type="button"
                          onClick={() => setStep('input')}
                          className="text-[#234745] font-bold underline hover:text-[#1a3533] ml-1 cursor-pointer"
                        >
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
                            className={`w-14 h-14 text-center border rounded-[12px] text-2xl font-bold outline-none transition-colors ${
                              showError
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
                      <div
                        className="w-full border border-[#F38C8C] bg-[#FFF5F5] rounded-[12px] py-3 px-4 flex items-center gap-3 text-[#E55C5C] text-sm font-semibold justify-center"
                        dir={isEn ? 'ltr' : 'rtl'}
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="shrink-0"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span
                          style={{
                            fontFamily:
                              "'EnglishDigits', 'GE Dinar One', sans-serif",
                          }}
                        >
                          {errorToDisplay}
                        </span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={
                        isLoading ||
                        otpValue.some((v) => !v) ||
                        blockCooldown > 0 ||
                        verifyCooldown > 0
                      }
                      className="w-full bg-[#234745] text-[#FEF8EB] font-bold text-[16px] rounded-[25px] h-[48px] flex items-center justify-center hover:bg-[#1a3533] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                      style={{
                        fontFamily:
                          "'EnglishDigits', 'GE Dinar One', sans-serif",
                      }}
                    >
                      {isLoading
                        ? isEn
                          ? 'Verifying...'
                          : 'جاري التحقق...'
                        : blockCooldown > 0
                          ? isEn
                            ? 'Locked'
                            : 'مغلق'
                          : verifyCooldown > 0
                            ? isEn
                              ? `Wait ${verifyCooldown}s`
                              : `تأكيد الدخول (انتظر ${verifyCooldown} ثانية)`
                            : isEn
                              ? 'Verify & Login'
                              : 'تأكيد الدخول'}
                    </button>

                    {/* Resend OTP */}
                    <div className="flex flex-col items-center gap-1">
                      {resendCooldown > 0 ? (
                        <p
                          className="text-[#9FB7AE] text-sm font-medium"
                          style={{
                            fontFamily:
                              "'EnglishDigits', 'GE Dinar One', sans-serif",
                          }}
                        >
                          {isEn
                            ? `Resend code in ${resendCooldown}s`
                            : `إعادة الإرسال بعد ${resendCooldown} ثانية`}
                        </p>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResend}
                          disabled={
                            isLoading || blockCooldown > 0 || verifyCooldown > 0
                          }
                          className="text-[#234745] font-bold text-sm hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{
                            fontFamily:
                              "'EnglishDigits', 'GE Dinar One', sans-serif",
                          }}
                        >
                          {isEn
                            ? 'Resend verification code'
                            : 'إعادة إرسال رمز التحقق'}
                        </button>
                      )}
                      <button
                        type="button"
                        className="text-[#9FB7AE] hover:underline text-sm font-medium disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
                        onClick={() => setStep('input')}
                        disabled={blockCooldown > 0 || verifyCooldown > 0}
                        style={{
                          fontFamily:
                            "'EnglishDigits', 'GE Dinar One', sans-serif",
                        }}
                      >
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
                  <span
                    className="text-[#A19F9F] text-sm font-medium"
                    style={{
                      fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                    }}
                  >
                    {isEn ? 'or' : 'أو'}
                  </span>
                  <div className="flex-1 h-[1px] bg-[#BBCFCD]/50"></div>
                </div>

                {/* Continue as Guest Button */}
                <Link
                  to={isEn ? '/en/' : '/'}
                  className="w-full h-[52px] border border-[#234745] rounded-[12px] flex items-center justify-center hover:bg-[#234745]/5 transition-colors"
                >
                  <span
                    className="font-bold text-[16px] text-[#9FB7AE]"
                    style={{
                      fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                    }}
                  >
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
            to={isEn ? '/en' : '/'}
            className="absolute top-8 ltr:left-8 rtl:right-8 bg-[#9FB7AE] hover:bg-[#BBCFCD] transition-colors rounded-full px-8 py-3 flex items-center gap-3 z-10"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              className={!isEn ? 'rotate-180' : ''}
            >
              <path
                d="M19 12H5M5 12L12 19M5 12L12 5"
                stroke="#234745"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span
              className="font-bold text-[18px] text-[#234745]"
              style={{
                fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
              }}
            >
              {isEn ? 'Back to store' : 'العودة للمتجر'}
            </span>
          </Link>

          {/* Logo & Subtitle Content */}
          <svg
            width="400"
            height="198"
            viewBox="0 0 400 198"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M239.013 96.3963C240.163 98.8304 240.233 101.464 238.775 105.564C238.478 106.392 238.24 105.235 238.24 105.235C238.14 104.746 237.992 104.197 237.833 103.669C237.357 101.893 236.613 99.5686 235.731 99.0798C235.314 98.9501 235.106 99.1496 235.165 99.6783C235.225 100.207 236.474 104.367 235.741 107.799C235.582 108.457 235.354 109.135 235.027 109.824C235.027 109.824 235.027 109.834 235.027 109.844C235.027 109.864 235.007 109.884 234.997 109.904C234.769 110.303 234.62 109.874 234.511 109.485C234.511 109.485 234.491 109.425 234.491 109.395C233.41 105.514 231.635 103.639 231.407 104.936C231.199 106.183 232.478 108.956 232.359 112.777C232.161 118.732 228.184 120.977 228.184 120.977C229.007 114.373 228.977 112.138 228.591 111.121C228.591 111.101 228.591 111.081 228.591 111.071C228.591 110.742 228.184 110.253 227.51 109.824C225.814 108.736 222.383 108.038 219.338 111.34C216.78 114.113 216.502 117.485 216.701 119.73C216.73 119.969 216.75 120.199 216.78 120.428C216.8 120.558 216.82 120.687 216.839 120.807C216.968 121.456 217.246 121.875 218.178 121.495C219.12 121.076 220.618 120.927 222.373 122.683C221.52 123.62 213.17 133.127 208.182 134.733C203.194 136.339 198.107 129.267 197.66 127.082C197.214 124.907 195.568 124.339 195.409 125.735C195.241 127.132 191.482 135.172 187.843 140.559C184.213 145.936 173.434 147.652 171.857 147.712C171.679 147.712 171.49 147.712 171.302 147.712C171.183 147.712 171.064 147.702 170.955 147.692C170.419 147.652 169.894 147.602 169.527 147.602C168.704 147.542 168.049 147.453 167.008 147.303C165.352 147.053 168.426 148.031 170.876 149.109C173.503 150.316 178.65 151.463 183.658 150.545C189.549 149.478 192.008 146.874 196.768 135.332C197.432 137.586 202.797 145.278 210.631 142.724C218.466 140.17 226.032 128.209 226.032 128.209C235.82 129.047 236.375 118.592 236.375 118.592C236.375 118.592 242.702 114.722 244.299 107.12C245.905 99.5287 239.082 94.0121 239.082 94.0121C239.082 94.0121 237.783 93.7527 239.023 96.3763"
              fill="#FEF8EB"
            />
            <path
              d="M213.536 80.0859C218.068 107.36 211.473 119.43 209.698 122.493C207.923 125.556 208.25 127.631 209.371 126.344C213.952 120.967 219.248 109.574 220.319 96.0572C221.39 82.5399 217.106 60.5133 214.617 49.2307C212.128 37.948 205.285 0 205.285 0C203.926 0.149637 202.191 5.5266 201.507 7.94075C200.823 10.3449 199.871 14.2654 200.456 16.7494C201.041 19.2334 208.994 52.812 213.526 80.0958"
              fill="#FEF8EB"
            />
            <path
              d="M176.002 127.661C186.712 122.463 186.673 111.23 185.8 103.16C188.874 101.504 191.899 96.2467 193.386 92.9447C194.219 91.2189 195.132 90.9495 196.292 91.149C196.857 91.2488 197.68 91.9371 198.365 92.6155C198.969 93.214 199.436 93.7527 199.594 93.9423C199.594 93.9423 199.604 93.9622 199.614 93.9622C199.624 93.9722 199.634 93.9822 199.644 93.9921L199.654 94.0121C199.654 94.0121 200.992 90.7899 201.736 87.9568C201.657 87.2186 198.513 83.5375 195.598 82.7993C192.672 82.0611 189.102 90.9296 185.592 94.5009C182.081 98.0623 179.592 92.6155 178.749 91.6478C177.906 90.6802 177.103 93.9522 176.895 97.8927C176.687 101.833 178.65 101.205 180.614 105.015C183.271 112.038 179.176 118.004 173.077 119.091C166.978 120.179 162.516 113.994 162.03 109.485C161.544 104.976 166.046 93.9921 175.705 79.0484C185.364 64.1046 189.043 49.3902 189.39 47.7642C189.737 46.1381 188.944 45.5895 188.17 47.1557C187.387 48.7219 182.637 58.3585 179.86 62.9075C177.083 67.4565 171.252 77.8413 166.641 84.9241C162.03 91.997 158.331 101.634 158.103 111.19C157.875 120.757 165.292 132.878 176.012 127.68"
              fill="#FEF8EB"
            />
            <path
              d="M233.657 133.167C233.816 132.798 233.994 132.708 234.302 132.998C234.53 133.217 234.778 133.427 235.026 133.616C235.571 134.045 235.888 133.985 236.315 133.486L238.397 130.095C239.072 129.326 238.705 128.349 238.863 127.481C239.052 126.483 238.992 125.426 238.576 124.438C238.516 124.309 238.546 124.099 238.348 124.109C238.1 124.109 238.149 124.329 238.149 124.498C238.149 124.797 238.149 125.107 238.149 125.406C238.149 125.406 238.149 125.486 238.149 125.526V125.905C238.08 126.683 237.713 127.501 237.485 127.94C237.465 127.97 237.455 128.01 237.435 128.04C237.406 128.099 237.376 128.139 237.356 128.179C237.247 128.369 237.138 128.548 237.009 128.738C236.89 128.488 236.771 128.279 236.692 128.06C236.592 127.8 236.434 127.641 236.156 127.68C235.799 127.72 235.839 128.04 235.829 128.249C235.819 128.638 235.829 129.047 235.918 129.426C236.067 129.985 235.799 130.374 235.512 130.763C235.303 131.042 235.065 131.082 234.748 130.813C234.381 130.484 234.054 130.085 233.548 129.915C233.211 129.805 233.052 129.865 232.874 130.174C232.418 130.992 232.219 131.9 232.08 132.798C231.694 135.382 230.434 137.437 228.55 139.173C226.735 140.839 224.762 142.285 222.59 143.452C221.817 143.861 221.063 144.31 220.299 144.739C220.16 144.819 220.032 144.939 220.081 145.098C220.131 145.258 220.289 145.308 220.458 145.268C220.825 145.188 221.202 145.228 221.569 145.078C223.473 144.25 225.367 143.402 227.221 142.455C228.55 141.776 229.78 140.968 230.831 139.921C231.981 138.774 232.586 137.327 232.973 135.771C233.191 134.903 233.28 134.015 233.647 133.177"
              fill="#FEF8EB"
            />
            <path
              d="M172.541 104.846C171.916 104.596 171.281 104.407 170.726 104.207C170.339 104.207 170.111 104.327 169.923 104.616C169.1 105.903 168.366 107.24 167.672 108.597C167.196 109.525 167.265 109.814 168.237 110.173C169.467 110.642 170.716 111.071 171.876 111.719C172.58 112.108 172.58 112.098 173.027 111.38C173.929 109.914 174.465 108.248 175.347 106.771C175.595 106.352 175.347 106.043 174.96 105.873C174.167 105.514 173.364 105.165 172.551 104.846"
              fill="#FEF8EB"
            />
            <path
              d="M195.864 95.8177C195.348 96.2367 190.4 101.005 189.398 101.803C189.398 101.803 188.763 102.462 188.605 102.761C188.089 103.459 188.902 105.464 189.378 107.16C189.854 108.856 189.943 109.305 190.786 108.916C193.127 107.669 197.936 103.15 198.264 102.501C198.591 101.853 197.5 98.3615 197.123 97.0048C196.746 95.6381 196.389 95.4087 195.874 95.8277"
              fill="#FEF8EB"
            />
            <path
              d="M156.148 133.736C158.251 134.783 160.77 136.17 164.548 137.577C165.976 138.155 167.503 138.684 169 139.063C173.027 140.071 177.132 139.432 181.119 138.115C187.326 136.06 191.987 127.491 195.766 119.55C195.686 120.727 200.188 128.289 205.315 124.019C210.442 119.75 213.239 110.532 212.703 96.8752C212.178 83.2183 205.841 56.8522 204.998 52.9217C204.145 48.9913 198.641 23.0741 198.036 19.7621C197.531 16.9689 196.43 17.6073 195.746 20.0115C195.061 22.4257 192.473 33.6185 193.604 36.2522C194.734 38.8858 206.932 93.2041 208.142 102.402C209.351 111.6 204.919 116.428 202.539 116.797C200.149 117.166 199.712 112.128 199.702 110.113C199.702 108.098 198.612 106.841 197.59 108.118C196.569 109.395 192.285 117.495 186.652 125.855C183.568 130.424 177.697 132.509 172.64 133.377C171.152 133.606 169.566 133.786 167.781 133.895C167.543 133.895 167.305 133.915 167.086 133.915C165.658 133.995 164.102 134.025 162.386 133.985C158.409 133.885 153.739 132.539 156.148 133.726"
              fill="#FEF8EB"
            />
            <path
              d="M21.301 185.45C21.1424 185.311 20.9837 185.181 20.8151 185.051C20.6565 184.932 20.478 184.812 20.2796 184.702C19.9623 184.503 19.6152 184.313 19.2086 184.134C18.7921 183.944 18.4252 183.784 18.0979 183.665L17.4335 183.455C17.2154 183.385 16.9972 183.326 16.7889 183.286C16.3526 183.156 15.946 183.056 15.5394 182.976C15.1428 182.897 14.7461 182.827 14.3693 182.777C13.9627 182.727 13.5859 182.657 13.2289 182.577C12.9016 182.508 12.5942 182.448 12.2967 182.398C11.8703 182.288 11.4835 182.208 11.0968 182.138C10.6803 182.059 10.2638 181.969 9.83735 181.869C9.41094 181.769 9.01427 181.67 8.62752 181.57C8.24077 181.47 7.85401 181.35 7.47718 181.231C6.71359 180.961 6.07893 180.612 5.5831 180.193C4.99801 179.704 4.70051 179.096 4.70051 178.368C4.70051 177.639 4.93851 177.071 5.39468 176.562C5.63268 176.323 5.89051 176.113 6.15826 175.943C6.41609 175.784 6.70368 175.634 7.00118 175.495C7.63585 175.225 8.29035 175.026 8.96468 174.896C9.30185 174.846 9.61918 174.806 9.9266 174.776C10.234 174.746 10.5216 174.736 10.7894 174.736C12.3562 174.736 13.8338 174.986 15.2023 175.475C16.1939 175.804 17.2649 176.293 18.3855 176.931C18.5839 177.041 18.7822 177.081 19.0004 177.051C19.2086 177.021 19.3673 176.931 19.4962 176.771L21.2514 174.547C21.4002 174.367 21.4002 174.248 21.3804 174.158C21.3605 174.078 21.3209 173.948 21.0928 173.799C20.835 173.679 20.5375 173.519 20.2796 173.36C20.0416 173.22 19.7838 173.07 19.5061 172.931C19.1392 172.741 18.7425 172.552 18.326 172.372C17.9294 172.193 17.5129 172.033 17.0765 171.893C16.6699 171.784 16.2237 171.664 15.7675 171.554C15.3213 171.444 14.8651 171.355 14.3792 171.285C12.3859 170.985 9.59935 170.966 7.1301 171.424C5.77151 171.684 4.55176 172.093 3.53034 172.631C2.48909 173.22 1.62634 173.998 0.981757 174.936C0.327256 175.914 0 177.141 0 178.577C0 179.555 0.178499 180.413 0.525583 181.151C0.902417 181.909 1.39826 182.537 2.00317 183.026C2.63784 183.595 3.35184 184.054 4.12534 184.393C4.91868 184.782 5.73184 185.081 6.58468 185.291C7.44743 185.56 8.25069 185.74 9.02419 185.829C9.4506 185.909 9.81752 185.979 10.1745 186.039C10.5315 186.099 10.8687 186.159 11.1761 186.209C11.6521 186.288 12.1083 186.358 12.5446 186.428C12.9909 186.508 13.4272 186.598 13.8536 186.697C14.2999 186.797 14.7164 186.897 15.0833 186.997C15.47 187.096 15.827 187.216 16.1543 187.346C16.8683 187.655 17.4335 188.004 17.85 188.393C18.3657 188.952 18.6136 189.56 18.6136 190.229C18.6136 190.787 18.4549 191.316 18.1475 191.805C17.8599 192.284 17.4236 192.733 16.8584 193.122C16.2435 193.531 15.5593 193.84 14.8354 194.02C14.0817 194.249 13.1793 194.369 12.1777 194.369C10.2638 194.369 8.45893 194 6.80284 193.281C5.60293 192.783 4.34351 192.174 3.07418 191.476C2.87584 191.366 2.68743 191.326 2.46926 191.356C2.29076 191.386 2.16184 191.456 2.06267 191.605L0.307422 193.92C0.178505 194.099 0.188422 194.229 0.198338 194.319C0.218172 194.399 0.257833 194.518 0.456166 194.618C0.783417 194.828 1.07101 195.007 1.33876 195.157C1.60651 195.316 1.88417 195.466 2.16184 195.616C2.59817 195.865 3.04442 196.085 3.50059 196.284C3.95675 196.494 4.43276 196.673 4.91867 196.843C5.95001 197.232 7.02101 197.501 8.12177 197.671C9.30185 197.89 10.6803 198 12.257 198C13.8338 198 15.4204 197.83 16.8484 197.491C18.1674 197.182 19.3375 196.693 20.3391 196.015C21.2911 195.396 22.025 194.608 22.5406 193.661C23.0464 192.693 23.3042 191.546 23.3042 190.259C23.3042 189.141 23.1158 188.174 22.739 187.396C22.4018 186.648 21.9159 185.989 21.2911 185.42"
              fill="#FEF8EB"
            />
            <path
              d="M61.8409 171.634C61.8013 171.574 61.7616 171.484 61.5137 171.484C61.2658 171.484 61.2162 171.574 61.1864 171.634L46.6783 197.362C46.6486 197.431 46.6387 197.471 46.6387 197.481C46.6387 197.471 46.718 197.501 46.8767 197.501H50.6847C50.9524 197.501 51.2004 197.431 51.4681 197.282C51.7259 197.132 51.9044 196.962 52.0234 196.763L53.2333 194.578C53.4118 194.199 53.7489 193.86 54.215 193.611C54.6613 193.371 55.1174 193.242 55.5736 193.242H67.4538C67.91 193.242 68.3661 193.361 68.8025 193.611C69.2388 193.86 69.566 194.159 69.7842 194.518L71.0536 196.763C71.1527 196.982 71.3312 197.142 71.5791 197.282C71.8568 197.431 72.1245 197.511 72.3923 197.511H76.2003C76.3193 197.511 76.3887 197.491 76.4284 197.481C76.4284 197.461 76.4086 197.431 76.3788 197.391L61.8608 171.634H61.8409ZM65.8275 189.261C65.6688 189.531 65.3217 189.86 64.5978 189.86H58.4098C57.7057 189.86 57.3586 189.56 57.1801 189.311C57.0314 189.102 56.8231 188.643 57.1305 187.984L60.4526 181.829C60.76 181.181 61.2459 181.081 61.5038 181.081C61.7616 181.081 62.2475 181.181 62.5748 181.859L65.8275 187.964C66.0655 188.423 66.0655 188.882 65.8275 189.261Z"
              fill="#FEF8EB"
            />
            <path
              d="M129.204 197.501C129.323 197.501 129.392 197.481 129.432 197.471C129.422 197.451 129.412 197.421 129.382 197.381L114.864 171.624C114.825 171.564 114.785 171.474 114.537 171.474C114.289 171.474 114.24 171.564 114.21 171.624L99.7018 197.352C99.672 197.421 99.6621 197.461 99.6621 197.471C99.6621 197.461 99.7414 197.491 99.9001 197.491H103.708C103.976 197.491 104.224 197.421 104.492 197.272C104.749 197.122 104.928 196.952 105.047 196.753L106.257 194.568C106.435 194.189 106.772 193.85 107.238 193.601C107.685 193.361 108.141 193.232 108.607 193.232H120.487C120.943 193.232 121.399 193.351 121.836 193.601C122.272 193.85 122.599 194.149 122.818 194.508L124.087 196.753C124.186 196.972 124.365 197.132 124.612 197.272C124.89 197.421 125.158 197.501 125.426 197.501H129.234H129.204ZM118.851 189.261C118.692 189.53 118.345 189.86 117.621 189.86H111.433C110.729 189.86 110.382 189.56 110.204 189.311C110.055 189.102 109.847 188.643 110.154 187.984L113.476 181.829C113.783 181.181 114.269 181.081 114.527 181.081C114.785 181.081 115.271 181.181 115.598 181.859L118.851 187.964C119.089 188.423 119.089 188.882 118.851 189.261Z"
              fill="#FEF8EB"
            />
            <path
              d="M177.716 190.059C178.093 189.221 178.371 188.343 178.559 187.446C178.748 186.538 178.837 185.54 178.837 184.503C178.837 182.538 178.46 180.672 177.716 178.946C177.012 177.36 175.922 175.953 174.494 174.786C171.796 172.612 168.296 171.504 164.071 171.504H153.282C153.064 171.504 152.905 171.564 152.776 171.684C152.657 171.794 152.607 171.913 152.607 172.073V196.953C152.607 197.112 152.657 197.232 152.776 197.342C152.855 197.421 152.994 197.521 153.282 197.521H164.071C166.154 197.521 168.107 197.242 169.882 196.693C171.588 196.174 173.145 195.356 174.503 194.269C175.951 193.102 177.032 191.685 177.716 190.079M173.204 189.361C172.55 190.628 171.727 191.616 170.765 192.284C169.793 192.992 168.702 193.471 167.542 193.71C166.362 193.94 165.212 194.06 164.121 194.06H159.143C158.627 194.06 158.191 193.89 157.843 193.571C157.496 193.242 157.308 192.813 157.308 192.334V176.732C157.308 176.253 157.496 175.814 157.853 175.485C158.19 175.165 158.637 174.996 159.143 174.996H164.121C165.182 174.996 166.322 175.116 167.492 175.345C168.682 175.584 169.783 176.053 170.765 176.742C171.727 177.41 172.55 178.398 173.204 179.664C173.829 180.941 174.146 182.577 174.146 184.533C174.146 186.488 173.829 188.154 173.204 189.371"
              fill="#FEF8EB"
            />
            <path
              d="M223.354 171.484H203.402C203.183 171.484 203.005 171.544 202.866 171.674C202.737 171.784 202.688 171.903 202.688 172.053V196.933C202.688 197.082 202.737 197.202 202.866 197.312C203.015 197.441 203.183 197.501 203.402 197.501H223.354C223.572 197.501 223.741 197.441 223.889 197.312C224.018 197.202 224.068 197.082 224.068 196.933V194.558C224.068 194.409 224.018 194.289 223.889 194.179C223.741 194.05 223.572 193.99 223.354 193.99H209.262C208.756 193.99 208.32 193.83 207.963 193.511C207.586 193.182 207.388 192.743 207.388 192.254V188.174C207.388 187.685 207.586 187.256 207.963 186.917C208.32 186.598 208.766 186.438 209.272 186.438H221.48C221.698 186.438 221.866 186.378 222.015 186.248C222.144 186.139 222.194 186.019 222.194 185.869V183.455C222.194 183.306 222.144 183.186 222.015 183.076C221.866 182.946 221.698 182.887 221.48 182.887H209.272C208.766 182.887 208.33 182.727 207.973 182.408C207.596 182.079 207.398 181.64 207.398 181.151V176.662C207.398 176.173 207.596 175.744 207.973 175.405C208.33 175.086 208.766 174.926 209.272 174.926H223.364C223.582 174.926 223.751 174.866 223.899 174.736C224.028 174.627 224.078 174.507 224.078 174.357V172.053C224.078 171.903 224.028 171.784 223.899 171.674C223.751 171.544 223.582 171.484 223.364 171.484"
              fill="#FEF8EB"
            />
            <path
              d="M269.695 174.766C266.997 172.592 263.497 171.484 259.272 171.484H248.483C248.265 171.484 248.106 171.544 247.977 171.664C247.858 171.774 247.809 171.893 247.809 172.053V196.933C247.809 197.092 247.858 197.212 247.977 197.322C248.056 197.401 248.195 197.501 248.483 197.501H259.272C261.355 197.501 263.308 197.222 265.083 196.673C266.789 196.154 268.346 195.336 269.705 194.249C271.152 193.082 272.233 191.665 272.918 190.059C273.294 189.221 273.572 188.343 273.761 187.446C273.949 186.538 274.038 185.54 274.038 184.503C274.038 182.537 273.661 180.672 272.918 178.946C272.214 177.36 271.123 175.953 269.695 174.786M268.406 189.361C267.751 190.628 266.928 191.615 265.966 192.284C264.994 192.992 263.903 193.471 262.743 193.71C261.563 193.94 260.413 194.06 259.322 194.06H254.344C253.828 194.06 253.392 193.89 253.054 193.571C252.697 193.242 252.519 192.813 252.519 192.334V176.732C252.519 176.253 252.707 175.814 253.064 175.485C253.412 175.165 253.848 174.996 254.354 174.996H259.332C260.393 174.996 261.533 175.115 262.703 175.345C263.893 175.584 264.994 176.053 265.976 176.742C266.938 177.41 267.761 178.397 268.415 179.664C269.04 180.941 269.358 182.577 269.358 184.533C269.358 186.488 269.04 188.154 268.415 189.371"
              fill="#FEF8EB"
            />
            <path
              d="M319.128 174.766C316.431 172.592 312.93 171.484 308.706 171.484H297.917C297.698 171.484 297.54 171.544 297.411 171.664C297.292 171.774 297.242 171.893 297.242 172.053V196.933C297.242 197.092 297.292 197.212 297.411 197.322C297.49 197.401 297.629 197.501 297.917 197.501H308.706C310.788 197.501 312.742 197.222 314.517 196.673C316.223 196.154 317.78 195.336 319.138 194.249C320.586 193.082 321.667 191.665 322.351 190.059C322.728 189.221 323.016 188.343 323.194 187.446C323.383 186.538 323.472 185.54 323.472 184.503C323.472 182.537 323.095 180.672 322.351 178.946C321.647 177.36 320.556 175.953 319.128 174.786M317.829 189.361C317.175 190.628 316.352 191.615 315.39 192.284C314.418 192.992 313.327 193.471 312.167 193.71C310.987 193.94 309.836 194.06 308.746 194.06H303.767C303.252 194.06 302.815 193.89 302.478 193.571C302.121 193.242 301.943 192.813 301.943 192.334V176.732C301.943 176.253 302.131 175.814 302.488 175.485C302.825 175.165 303.272 174.996 303.777 174.996H308.755C309.817 174.996 310.957 175.115 312.127 175.345C313.317 175.584 314.418 176.053 315.4 176.742C316.362 177.41 317.185 178.397 317.839 179.664C318.464 180.941 318.781 182.577 318.781 184.533C318.781 186.488 318.464 188.154 317.839 189.371"
              fill="#FEF8EB"
            />
            <path
              d="M350.645 171.514H347.342C347.055 171.514 346.916 171.614 346.837 171.694C346.718 171.803 346.668 171.923 346.668 172.083V196.933C346.668 197.092 346.718 197.212 346.837 197.322C346.916 197.401 347.055 197.501 347.342 197.501H350.645C350.863 197.501 351.031 197.441 351.18 197.312C351.309 197.202 351.359 197.082 351.359 196.933V172.083C351.359 171.933 351.309 171.813 351.18 171.704C351.031 171.574 350.863 171.514 350.645 171.514Z"
              fill="#FEF8EB"
            />
            <path
              d="M399.82 171.704C399.671 171.574 399.503 171.514 399.285 171.514H396.022C395.804 171.514 395.635 171.574 395.487 171.704C395.358 171.813 395.308 171.933 395.308 172.083V186.199C395.308 186.957 394.911 187.236 394.673 187.336C394.277 187.495 393.85 187.386 393.404 187.027L375.038 171.604C374.989 171.564 374.9 171.514 374.751 171.514C374.711 171.514 374.662 171.514 374.612 171.524L374.572 196.923C374.572 197.072 374.622 197.192 374.751 197.302C374.9 197.431 375.048 197.491 375.247 197.491H378.549C378.767 197.491 378.936 197.431 379.084 197.302C379.213 197.192 379.263 197.072 379.263 196.923V183.066C379.263 182.308 379.66 182.029 379.898 181.929C380.264 181.769 380.691 181.859 381.137 182.178L399.483 197.352C399.602 197.431 399.761 197.461 399.959 197.431L399.999 172.063C399.999 171.913 399.949 171.793 399.82 171.684"
              fill="#FEF8EB"
            />
          </svg>
          <p
            className="!text-[16px] font-medium text-[#D2D2D2] text-center !mt-6"
            style={{fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif"}}
          >
            {isEn
              ? "Since 1919, we've been offering the finest sweets and luxury chocolate with passion and devotion."
              : 'منذ عام 1919، نقدم أجود الحلويات والشوكولاتة الفاخرة بعشق وشغف.'}
          </p>
          {/* Optional background subtle pattern overlay if needed, based on Figma image 172 */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-transparent pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
