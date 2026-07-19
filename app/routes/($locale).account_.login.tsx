import { useState, useEffect, useRef } from 'react';
import { data, redirect, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from 'react-router';
import { Form, Link, useActionData, useNavigation, useRouteLoaderData } from 'react-router';
import { LogoSplash } from '~/components/LogoSplash';
import { SaadeddinApi } from '~/lib/saadeddin-api.server';
import { derivePassword } from '~/lib/auth.server';

export const meta: MetaFunction<typeof loader> = () => {
  return [{ title: 'Login | Saadeddin' }];
};

export async function loader({ context }: LoaderFunctionArgs) {
  const customerAccessToken = await context.session.get('customerAccessToken');
  const saadeddinToken = await context.session.get('saadeddinToken');
  if (customerAccessToken && saadeddinToken) {
    return redirect('/account');
  }
  return data({});
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

export async function action({ request, context }: ActionFunctionArgs) {
  const { storefront, session, env } = context;
  const form = await request.formData();
  const intent = form.get('intent');
  const lang = storefront.i18n.language === 'EN' ? 'en' : 'ar';

  if (intent === 'send-otp') {
    const phone = String(form.get('phone') || '');
    const countryCode = String(form.get('countryCode') || '+966');
    let cleanPhone = phone.replace(/\D/g, '');
    const countryDigits = countryCode.replace(/\D/g, ''); // e.g. "966" from "+966"

    // Strip international prefix variations to get the local number only
    if (cleanPhone.startsWith('00' + countryDigits)) {
      cleanPhone = cleanPhone.substring(2 + countryDigits.length);
    } else if (cleanPhone.startsWith(countryDigits)) {
      cleanPhone = cleanPhone.substring(countryDigits.length);
    } else if (cleanPhone.startsWith('0')) {
      cleanPhone = cleanPhone.substring(1);
    }

    const fullPhone = `${countryCode}${cleanPhone}`;


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
          apiUrl: env.CUSTOM_API_URL || 'https://api.pryvexapls.com (default)'
        });
        // If the error indicates account doesn't exist, show that message
        if (msg.toLowerCase().includes('not found') || msg.includes('غير موجود') || msg.toLowerCase().includes('not exist')) {
          return data({
            error: lang === 'en' ? 'Account not found. Please register.' : 'الحساب غير موجود. يرجى إنشاء حساب جديد.',
            notRegistered: true
          });
        }
        // Return the actual API error message to the user so it's easier to diagnose
        const displayError = msg || (lang === 'en' ? 'Failed to send verification code. Please try again.' : 'فشل إرسال رمز التحقق. يرجى المحاولة مرة أخرى.');
        return data({ error: displayError });
      }

      session.set('loginOtpPhone', fullPhone);
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
      return data({ error: apiErr.message || (lang === 'en' ? 'Invalid verification code.' : 'رمز التحقق غير صحيح.') });
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
    return redirect(lang === 'en' ? '/en/account' : '/account', {
      headers: { 'Set-Cookie': await session.commit() },
    });
  }

  return data({ error: 'Invalid request' });
}

export default function Login() {
  const actionData = useActionData<any>();
  const navigation = useNavigation();
  const rootData = useRouteLoaderData('root') as any;
  const locale = rootData?.consent?.language?.toLowerCase() || 'ar';
  const isEn = locale === 'en';
  const isLoading = navigation.state === 'submitting';

  const [step, setStep] = useState<'input' | 'otp'>('input');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+966');
  const [otpValue, setOtpValue] = useState(['', '', '', '']);
  const otpRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null)
  ];
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const resendFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (actionData?.step === 'otp') {
      setStep('otp');
      setResendCooldown(60);
    }
  }, [actionData]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

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
              <h1 className="text-[26px] font-bold text-[#171717] flex items-center gap-2" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}>
                <span>{isEn ? 'Welcome Back' : 'مرحباً بعودتك'}</span>
                <span className="text-[32px]">👋</span>
              </h1>
              <p className="text-[14px] font-medium text-[#A19F9F] text-center" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                {isEn ? 'Enter your information below to log into your account' : 'أدخل المعلومات أدناه للدخول إلى حسابك'}
              </p>
            </div>

            {/* Form Box */}
            <div className="w-full flex flex-col items-center gap-6">

              {/* Tabs */}
              <div className="flex w-full gap-4 h-[48px]">
                <button className="flex-1 bg-[#234745] text-[#FEF8EB] rounded-[25px] font-bold text-[16px] transition-colors" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                  {isEn ? 'Log in' : 'تسجيل دخول'}
                </button>
                <Link to={isEn ? "/en/account/register" : "/account/register"} className="flex-1 flex items-center justify-center bg-white border border-[#BBCFCD] text-[#234745] rounded-[25px] font-bold text-[16px] hover:bg-[#234745]/5 transition-colors" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                  {isEn ? 'Create Account' : 'إنشاء حساب'}
                </Link>
              </div>



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
                    <div className="flex flex-row items-center border border-[#BBCFCD] bg-white rounded-[12px] h-[48px] focus-within:border-[#234745] transition-colors overflow-hidden" dir="ltr">
                      <select name="countryCode" value={countryCode} onChange={e => setCountryCode(e.target.value)} className="bg-transparent border-none text-[#171717] font-bold text-[14px] focus:ring-0 outline-none pl-4 pr-6 py-3 appearance-none cursor-pointer" style={{ backgroundImage: "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 0.2rem center", backgroundSize: "1.2em", width: "90px" }}>
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
                        className="flex-1 bg-transparent border-none outline-none text-[#171717] font-medium text-[14px] focus:ring-0 placeholder:text-[#BBCFCD] px-2 py-3"
                        style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                        required
                      />
                    </div>
                  </div>

                  {actionData?.error && <p className="text-red-500 text-sm text-center">{actionData.error}</p>}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading || phone.length < 9}
                    className="w-full bg-[#234745] text-[#FEF8EB] font-bold text-[16px] rounded-[25px] h-[48px] flex items-center justify-center hover:bg-[#1a3533] transition-colors disabled:opacity-70"
                    style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                  >
                    {isLoading ? (isEn ? 'Sending...' : 'جاري الإرسال...') : (isEn ? 'Send Verification Code' : 'إرسال رمز التحقق')}
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
                      <label className="text-[14px] font-medium text-[#171717] mb-2" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                        {isEn ? 'Enter Verification Code' : 'أدخل رمز التحقق'}
                      </label>
                      <div className="flex gap-4 justify-center" dir="ltr">
                        {otpRefs.map((ref, i) => (
                          <input
                            key={i}
                            ref={ref}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            className="w-14 h-14 text-center border border-[#BBCFCD] rounded-[12px] text-2xl font-bold focus:border-[#234745] outline-none text-[#234745]"
                            value={otpValue[i]}
                            onChange={(e) => handleOTPChange(i, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(i, e)}
                            autoFocus={i === 0}
                          />
                        ))}
                      </div>
                    </div>

                    {actionData?.error && <p className="text-red-500 text-sm text-center">{actionData.error}</p>}

                    <button
                      type="submit"
                      disabled={isLoading || otpValue.some(v => !v)}
                      className="w-full bg-[#234745] text-[#FEF8EB] font-bold text-[16px] rounded-[25px] h-[48px] flex items-center justify-center hover:bg-[#1a3533] transition-colors disabled:opacity-70"
                      style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                    >
                      {isLoading ? (isEn ? 'Verifying...' : 'جاري التحقق...') : (isEn ? 'Verify & Login' : 'تأكيد الدخول')}
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
                          disabled={isLoading}
                          className="text-[#234745] font-bold text-sm hover:underline disabled:opacity-50"
                          style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                        >
                          {isEn ? 'Resend verification code' : 'إعادة إرسال رمز التحقق'}
                        </button>
                      )}
                      <button type="button" className="text-[#9FB7AE] hover:underline text-sm font-medium" onClick={() => setStep('input')} style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                        {isEn ? 'Change Phone Number' : 'تغيير رقم الجوال'}
                      </button>
                    </div>
                  </Form>
                </>
              )}

              {/* Guest Login Section */}
              <div className="w-full flex flex-col gap-4 mt-2">
                {/* Continue as Guest Button */}
                <Link
                  to={isEn ? "/en/cart" : "/cart"}
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
          <LogoSplash />

          {/* Optional background subtle pattern overlay if needed, based on Figma image 172 */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-transparent pointer-events-none" />
        </div>

      </div>
    </div>
  );
}
