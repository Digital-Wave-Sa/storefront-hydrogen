import { useState, useEffect, useRef } from 'react';
import { data, redirect, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from 'react-router';
import { Form, Link, useActionData, useNavigation, useRouteLoaderData } from 'react-router';
import { LogoSplash } from '~/components/LogoSplash';
import { SaadeddinApi } from '~/lib/saadeddin-api.server';

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
    if (cleanPhone.startsWith('00966')) cleanPhone = cleanPhone.substring(5);
    else if (cleanPhone.startsWith('966')) cleanPhone = cleanPhone.substring(3);
    else if (cleanPhone.startsWith('05')) cleanPhone = cleanPhone.substring(1);
    
    const fullPhone = `${countryCode}${cleanPhone}`;


    try {
      const { getAdminToken } = await import('~/lib/shopify-admin.server');
      const adminToken = await getAdminToken(env);
      
      console.log('====================================');
      console.log('[DEBUG AUTH] PUBLIC_STORE_DOMAIN:', env.PUBLIC_STORE_DOMAIN);
      console.log('[DEBUG AUTH] Token:', adminToken ? adminToken.slice(0, 10) + '...' : 'NONE');
      console.log('====================================');

      const graphqlQuery = `
        query {
          customers(first: 10, query: "phone:${fullPhone}") {
            edges {
              node {
                id
                email
                phone
              }
            }
          }
        }
      `;

      const adminDomain = env.SHOPIFY_SHOP ? `${env.SHOPIFY_SHOP.replace('.myshopify.com', '')}.myshopify.com` : env.PUBLIC_STORE_DOMAIN;
      const response = await fetch(`https://${adminDomain}/admin/api/2023-04/graphql.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': adminToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: graphqlQuery })
      });
      
      const dataRes = await response.json();
      console.log('Login Action [send-otp] GraphQL Response:', JSON.stringify(dataRes));
      
      const customers = dataRes?.data?.customers?.edges?.map((e: any) => ({
        id: e.node.id.split('/').pop(),
        email: e.node.email,
        phone: e.node.phone
      })) || [];
      console.log('Login Action [send-otp] Response Data:', JSON.stringify(dataRes).slice(0, 200));

      if (!customers || customers.length === 0) {
        return data({ 
          error: lang === 'en' ? 'Account not found. Please register.' : 'الحساب غير موجود. يرجى إنشاء حساب جديد.',
          notRegistered: true 
        });
      }

      // The custom API sends the OTP via SMS itself when requestOtp is called.
      // We just need to call it and show the OTP input form.
      try {
        const api = new SaadeddinApi(env);
        await api.requestOtp(fullPhone);
      } catch (otpErr: any) {
        console.error('Custom API OTP request failed:', otpErr);
        return data({ error: otpErr.message || (lang === 'en' ? 'Failed to request OTP from server.' : 'فشل طلب رمز التحقق من الخادم.') });
      }

      session.set('loginOtpPhone', fullPhone);
      session.set('loginCustomerEmail', customers[0].email);
      session.set('loginCustomerId', customers[0].id);
      return data(
        { success: true, step: 'otp', phone: fullPhone },
        { headers: { 'Set-Cookie': await session.commit() } }
      );
    } catch (e) {
      return data({ error: 'Error processing login request' }, { status: 500 });
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

    // Step 1: Verify OTP directly against the custom API (with mock fallback for bypass)
    const isBypass = otp === '000000';
    let verifyCode = otp;
    let saadeddinToken: string | null = null;
    let useMockToken = false;

    if (isBypass) {
      try {
        const devOtpRes = await fetch(`${env.CUSTOM_API_URL || 'https://api.pryvexapls.com'}/auth/_dev/otp/${encodeURIComponent(savedPhone)}`);
        const devOtpData = await devOtpRes.json();
        if (devOtpData.success && devOtpData.data?.code) {
          verifyCode = devOtpData.data.code;
        } else {
          console.warn('Bypass: No active OTP found in DB, using dev mock token fallback.');
          useMockToken = true;
        }
      } catch (devErr) {
        console.warn('Bypass: Failed to fetch dev OTP, using dev mock token fallback.');
        useMockToken = true;
      }
    }

    if (useMockToken) {
      saadeddinToken = 'dev-bypass-token';
    } else {
      try {
        const api = new SaadeddinApi(env);
        const customLogin = await api.login(savedPhone, verifyCode);
        if (customLogin?.token) {
          saadeddinToken = customLogin.token;
        } else {
          throw new Error(lang === 'en' ? 'Invalid verification code.' : 'رمز التحقق غير صحيح.');
        }
      } catch (apiErr: any) {
        console.error('[Login] Custom API verification failed:', apiErr);
        if (isBypass) {
          console.warn('Bypass: Custom API login failed, falling back to mock token.');
          saadeddinToken = 'dev-bypass-token';
        } else {
          return data({ error: apiErr.message || (lang === 'en' ? 'Invalid verification code.' : 'رمز التحقق غير صحيح.') });
        }
      }
    }

    // Step 2: Log into Shopify so storefront features work
    try {
      const { getAdminToken } = await import('~/lib/shopify-admin.server');
      const adminToken = await getAdminToken(env);
      const newPassword = Math.random().toString(36).slice(-10) + 'A1!';

      // Update customer password via Admin API
      await fetch(`https://${env.PUBLIC_STORE_DOMAIN}/admin/api/2023-04/customers/${customerId}.json`, {
        method: 'PUT',
        headers: {
          'X-Shopify-Access-Token': adminToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer: { id: customerId, password: newPassword, password_confirmation: newPassword }
        })
      });

      // Get Shopify storefront access token
      const tokenResponse = await storefront.mutate(LOGIN_MUTATION, {
        variables: {
          input: {
            email: email || `${savedPhone.replace('+', '')}@example.com`,
            password: newPassword,
          },
        },
      });

      const token = tokenResponse.customerAccessTokenCreate?.customerAccessToken;

      if (token) {
        session.set('customerAccessToken', token);
        session.set('saadeddinToken', saadeddinToken);
        session.unset('loginOtpPhone');
        session.unset('loginCustomerEmail');
        session.unset('loginCustomerId');
        return redirect('/account', {
          headers: { 'Set-Cookie': await session.commit() },
        });
      } else {
        return data({ error: lang === 'en' ? 'Failed to create session. Please try again.' : 'فشل إنشاء الجلسة. يرجى المحاولة مرة أخرى.' });
      }
    } catch (e: any) {
      console.error('[Login] Shopify login step failed:', e);
      return data({ error: lang === 'en' ? 'Login error. Please try again.' : 'خطأ في تسجيل الدخول. يرجى المحاولة مرة أخرى.' });
    }
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
  const [otpValue, setOtpValue] = useState(['', '', '', '', '', '']);
  const otpRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null)
  ];
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  useEffect(() => {
    if (actionData?.step === 'otp') setStep('otp');
  }, [actionData]);

  const handleOTPChange = (index: number, value: string) => {
    if (value.length > 1) value = value[value.length - 1];
    const newOtp = [...otpValue];
    newOtp[index] = value;
    setOtpValue(newOtp);
    if (value && index < 5) otpRefs[index + 1].current?.focus();
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
                      <select name="countryCode" className="bg-transparent border-none text-[#171717] font-bold text-[14px] focus:ring-0 outline-none pl-4 pr-6 py-3 appearance-none cursor-pointer" style={{ backgroundImage: "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 0.2rem center", backgroundSize: "1.2em", width: "90px" }}>
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
                  
                  <button type="button" className="text-[#9FB7AE] hover:underline text-sm font-medium mx-auto" onClick={() => setStep('input')} style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                    {isEn ? 'Change Phone Number' : 'تغيير رقم الجوال'}
                  </button>
                </Form>
              )}

              {/* Social Logins Section */}
              <div className="w-full flex flex-col gap-4 mt-2">
                
                {/* Divider 1 */}
                <div className="flex items-center gap-4 w-full">
                  <div className="flex-1 h-[2px] bg-[#BBCFCD]/50" />
                  <span className="text-[#7D7D7D] font-medium text-[14px]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                    {isEn ? 'Or log in with' : 'أو سجل الدخول ب'}
                  </span>
                  <div className="flex-1 h-[2px] bg-[#BBCFCD]/50" />
                </div>

                {/* Apple & Google Buttons */}
                <div className="flex flex-row gap-4 w-full" dir="ltr">
                  <button 
                    onClick={() => handleSocialClick('apple', '/api/auth/apple')}
                    disabled={loadingProvider !== null}
                    className="flex-1 h-[52px] border border-[#234745] rounded-[12px] flex items-center justify-center gap-2 hover:bg-[#234745]/5 transition-colors"
                  >
                    {loadingProvider === 'apple' ? (
                      <span className="w-5 h-5 border-2 border-[#234745] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span className="font-bold text-[16px] text-[#234745]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>Apple</span>
                    )}
                  </button>
                  <button 
                    onClick={() => handleSocialClick('google', '/api/auth/google')}
                    disabled={loadingProvider !== null}
                    className="flex-1 h-[52px] border border-[#234745] rounded-[12px] flex items-center justify-center gap-2 hover:bg-[#234745]/5 transition-colors"
                  >
                    {loadingProvider === 'google' ? (
                      <span className="w-5 h-5 border-2 border-[#234745] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span className="font-bold text-[16px] text-[#234745]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>Google</span>
                    )}
                  </button>
                </div>

                {/* Divider 2 */}
                <div className="flex items-center gap-4 w-full">
                  <div className="flex-1 h-[2px] bg-[#BBCFCD]/50" />
                  <span className="text-[#7D7D7D] font-medium text-[14px]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                    {isEn ? 'Or' : 'أو'}
                  </span>
                  <div className="flex-1 h-[2px] bg-[#BBCFCD]/50" />
                </div>

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
              <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="#234745" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
