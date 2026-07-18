import { useState, useEffect, useRef } from 'react';
import { data, redirect, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from 'react-router';
import { Form, Link, useActionData, useNavigation, useRouteLoaderData, useFetcher } from 'react-router';
import { LogoSplash } from '~/components/LogoSplash';
import { SaadeddinApi } from '~/lib/saadeddin-api.server';
import { SocialLogins } from '~/components/SocialLogins';
import { derivePassword } from '~/lib/auth.server';

export const meta: MetaFunction<typeof loader> = () => {
  return [{ title: 'Create Account | Saadeddin' }];
};

export async function loader({ context, request }: LoaderFunctionArgs) {
  const customerAccessToken = await context.session.get('customerAccessToken');
  const saadeddinToken = await context.session.get('saadeddinToken');
  if (customerAccessToken && saadeddinToken) {
    return redirect('/account');
  }
  return data({});
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { storefront, session, env } = context;
  const form = await request.formData();
  const intent = form.get('intent');
  const lang = storefront.i18n.language === 'EN' ? 'en' : 'ar';

  // STEP 1: Check phone and send OTP via CRM API
  if (intent === 'send-otp') {
    const phone = String(form.get('phone') || '');
    const countryCode = String(form.get('countryCode') || '+966');
    const email = String(form.get('email') || '').trim();
    let cleanPhone = phone.replace(/\D/g, '');
    const countryDigits = countryCode.replace(/\D/g, '');
    if (cleanPhone.startsWith('00' + countryDigits)) cleanPhone = cleanPhone.substring(2 + countryDigits.length);
    else if (cleanPhone.startsWith(countryDigits)) cleanPhone = cleanPhone.substring(countryDigits.length);
    else if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
    const fullPhone = `${countryCode}${cleanPhone}`;

    // Cooldown Throttle Check (180 seconds to match backend rate limit)
    const cooldown = session.get('otpCooldown');
    if (cooldown && Date.now() < cooldown) {
      const waitSecs = Math.ceil((cooldown - Date.now()) / 1000);
      return data({
        error: lang === 'en'
          ? `Please wait ${waitSecs} seconds before requesting another code.`
          : `يرجى الانتظار ${waitSecs} ثانية قبل طلب رمز تحقق جديد.`,
      });
    }

    try {
      const api = new SaadeddinApi(env);
      await api.requestOtp(fullPhone, 'register');

      session.set('otpPhone', fullPhone);
      session.set('otpCooldown', Date.now() + 180 * 1000);
      return data(
        { step: 'otp' },
        { headers: { 'Set-Cookie': await session.commit() } }
      );
    } catch (err: any) {
      console.error('[Register] Custom requestOtp failed:', err);
      // Check for conflict (409) indicating already registered in Shopify
      if (err.status === 409 || (err.message && err.message.toLowerCase().includes('already registered'))) {
        const existingEmail = err.data?.existingEmail || '';
        return data({
          error: lang === 'en'
            ? `This phone number is already registered in Shopify (${existingEmail}).`
            : `رقم الجوال هذا مسجل بالفعل في Shopify (${existingEmail}).`,
          actions: err.data?.actions || ['login']
        });
      }
      return data({
        error: err.message || (lang === 'en' ? 'Failed to send SMS.' : 'فشل إرسال الرمز.')
      });
    }
  }

  // STEP 2: Verify OTP and Create Customer
  if (intent === 'register-with-otp') {
    const otp = String(form.get('otp') || '');
    const savedPhone = session.get('otpPhone');

    if (!otp || !savedPhone) {
      return data({
        error: lang === 'en' ? 'Invalid session. Please try again.' : 'جلسة غير صالحة. يرجى المحاولة مرة أخرى.'
      });
    }

    // Extract Customer Details
    const accountType = String(form.get('accountType') || 'individual');
    const fullName = String(form.get('fullName') || '').trim();
    const companyName = String(form.get('companyName') || '').trim();
    const email = String(form.get('email') || '');
    const taxRegistration = String(form.get('taxRegistration') || '');
    const companyAddress = String(form.get('companyAddress') || '');

    let firstName = '';
    let lastName = '';
    if (accountType === 'company') {
      firstName = companyName;
      lastName = '(Company)';
    } else {
      const nameParts = fullName.split(' ');
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '(N/A)';
    }

    try {
      const api = new SaadeddinApi(env);

      // 1. Verify OTP directly via CRM API to get otpToken
      let otpToken = '';
      try {
        const verifyRes = await api.verifyOtp(savedPhone, otp, 'register');
        otpToken = verifyRes.otpToken;
      } catch (verifyErr: any) {
        console.error('[Register] verifyOtp failed:', verifyErr);
        return data({
          error: verifyErr.message || (lang === 'en' ? 'Incorrect verification code.' : 'رمز التحقق غير صحيح.')
        });
      }

      session.unset('otpCooldown');

      // 2. Derive stable deterministic password
      const stablePassword = await derivePassword(savedPhone, env.SESSION_SECRET || 'saadeddin-otp-secret');

      // 3. Register user with CRM (which also handles Shopify customer creation)
      let saadeddinToken = null;
      try {
        const registerPayload = {
          phone: savedPhone,
          name: fullName,
          email,
          password: stablePassword,
          accountType: accountType === 'company' ? 'COMPANY' : 'INDIVIDUAL',
          otpToken,
          companyName: companyName || undefined,
          taxNumber: taxRegistration || undefined,
          companyAddress: companyAddress || undefined
        };

        const idempotencyKey = crypto.randomUUID();
        const customRegister = await api.register(registerPayload, idempotencyKey);

        if (customRegister?.token) {
          saadeddinToken = customRegister.token;
        } else {
          throw new Error(lang === 'en' ? 'Failed to retrieve CRM token.' : 'فشل الحصول على رمز النظام.');
        }
      } catch (apiErr: any) {
        console.error('[Register] Custom CRM API registration failed:', apiErr);
        return data({
          error: apiErr.message || (lang === 'en' ? 'Registration failed.' : 'فشل التسجيل.')
        });
      }

      // 4. Create customer access token in Shopify
      let token = null;
      try {
        const tokenResponse = await storefront.mutate(CUSTOMER_ACCESS_TOKEN_CREATE_MUTATION, {
          variables: { input: { email, password: stablePassword } },
        });
        token = tokenResponse.customerAccessTokenCreate?.customerAccessToken || null;
      } catch (shopifyErr) {
        console.warn('[Register] Shopify customer access token creation failed (non-fatal):', shopifyErr);
      }

      // Fallback: If Shopify token creation failed (e.g., sync delay or sync failure),
      // create the customer in Shopify directly using Admin API
      if (!token) {
        console.warn('[Register] Storefront token creation failed, attempting Admin API customer sync fallback');
        try {
          const { getAdminToken } = await import('~/lib/shopify-admin.server');
          const adminToken = await getAdminToken(env);
          
          if (adminToken) {
            const customerPayload = {
              customer: {
                first_name: firstName,
                last_name: lastName,
                phone: savedPhone,
                email: email || `${savedPhone.replace(/\D/g, '')}@saadeddin.placeholder`,
                password: stablePassword,
                password_confirmation: stablePassword,
                tags: accountType === 'company' ? 'verified_phone, B2B' : 'verified_phone'
              }
            };

            const adminResponse = await fetch(`https://${env.PUBLIC_STORE_DOMAIN}/admin/api/2024-01/customers.json`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': adminToken },
              body: JSON.stringify(customerPayload)
            });

            if (adminResponse.ok) {
              const adminData = await adminResponse.json() as any;
              console.log('[Register] Fallback customer created successfully in Shopify Admin:', adminData.customer?.id);
              
              // Try creating storefront access token again
              const tokenResponse = await storefront.mutate(CUSTOMER_ACCESS_TOKEN_CREATE_MUTATION, {
                variables: { input: { email: adminData.customer.email || email, password: stablePassword } },
              });
              token = tokenResponse.customerAccessTokenCreate?.customerAccessToken || null;
            } else {
              const errBody = await adminResponse.text();
              console.error('[Register] Fallback Shopify Admin customer creation failed:', adminResponse.status, errBody);
            }
          }
        } catch (fallbackErr) {
          console.error('[Register] Fallback Shopify Admin sync error:', fallbackErr);
        }
      }

      // 5. Save tokens in session and redirect to /account
      if (token) {
        session.set('customerAccessToken', token);
      } else {
        console.warn('[Register] Failed to create customerAccessToken, falling back to bypass token');
        session.set('customerAccessToken', {
          accessToken: 'dev-bypass-token',
          expiresAt: new Date(Date.now() + 86400 * 1000).toISOString()
        });
      }
      session.set('saadeddinToken', saadeddinToken);
      session.unset('otpPhone');
      session.unset('socialProfile');

      return redirect(lang === 'en' ? '/en/account' : '/account', {
        headers: { 'Set-Cookie': await session.commit() }
      });

    } catch (error: any) {
      console.error('[Register] Unexpected error:', error);
      return data({
        error: lang === 'en' ? 'An unexpected error occurred. Please try again.' : 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.'
      });
    }
  }

  return data({});
}

// Dummy mutation to keep imports happy if needed, though we redirect to login anyway.
const CUSTOMER_ACCESS_TOKEN_CREATE_MUTATION = `#graphql
  mutation customerAccessTokenCreateRegister($input: CustomerAccessTokenCreateInput!) {
    customerAccessTokenCreate(input: $input) {
      customerAccessToken { accessToken expiresAt }
      customerUserErrors { code field message }
    }
  }
`;

export default function Register() {
  const rootData = useRouteLoaderData('root') as any;
  const isEn = rootData?.locale?.language === 'EN';
  const actionData = useActionData() as any;
  const navigation = useNavigation();
  const isLoading = navigation.state === 'submitting';

  const [step, setStep] = useState<'input' | 'otp'>('input');
  
  const [formData, setFormData] = useState({
    accountType: 'individual',
    fullName: '',
    companyName: '',
    taxRegistration: '',
    companyAddress: '',
    phone: '',
    email: '',
    language: 'ar',
    termsAccepted: false
  });

  const [otpValue, setOtpValue] = useState(['', '', '', '']);
  const otpRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  const fetcher = useFetcher<any>();
  const [resendCooldown, setResendCooldown] = useState(180);

  useEffect(() => {
    if (actionData?.step === 'otp') {
      setStep('otp');
      setResendCooldown(180);
    }
  }, [actionData]);

  useEffect(() => {
    if (step !== 'otp' || resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [step, resendCooldown]);

  const handleResend = () => {
    if (resendCooldown > 0) return;

    const submitData = new FormData();
    submitData.append('intent', 'send-otp');
    submitData.append('phone', formData.phone);
    submitData.append('email', formData.email);
    submitData.append('language', formData.language);

    fetcher.submit(submitData, { method: 'POST' });
    setResendCooldown(180);
  };

  const isResent = fetcher.data?.step === 'otp' && !fetcher.data?.error;

  const handleOTPChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otpValue];
    newOtp[index] = value.slice(-1);
    setOtpValue(newOtp);
    if (value && index < 3) otpRefs[index + 1].current?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpValue[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-[#FEF8EB] w-full flex items-center justify-center p-4 lg:p-8" dir={isEn ? 'ltr' : 'rtl'}>
      <div className="w-full max-w-[1280px] flex flex-col lg:flex-row-reverse gap-6 relative min-h-[880px]">
        
        {/* Left Pane - Form Area */}
        <div className="w-full lg:w-1/2 bg-white border border-[#BBCFCD]/50 rounded-[24px] flex flex-col items-center justify-center p-4 lg:p-12 relative shadow-sm">
          <div className="w-full flex flex-col items-center">
            
            {/* Header */}
            <div className="flex flex-col items-center mb-6 gap-2 w-full border-b border-[#BBCFCD]/50 pb-6">
              <h1 className="text-[26px] font-bold text-[#171717] flex items-center gap-2" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}>
                <span>{isEn ? 'Create Account' : 'إنشاء حساب'}</span>
              </h1>
              <p className="text-[14px] font-medium text-[#A19F9F] text-center" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                {isEn ? 'Enter the information below and start the wonderful Saadeddin experience' : 'أدخل المعلومات أدناه وابدأ تجربة سعد الدين الرائعة'}
              </p>
            </div>

            {/* Form Box */}
            <div className="w-full flex flex-col items-center gap-6">
              
              {/* Tabs */}
              <div className="flex w-full gap-4 h-[48px]">
                <Link to={isEn ? "/en/account/login" : "/account/login"} className="flex-1 flex items-center justify-center bg-white border border-[#BBCFCD] text-[#234745] rounded-[25px] font-bold text-[16px] hover:bg-[#234745]/5 transition-colors" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                  {isEn ? 'Log in' : 'تسجيل دخول'}
                </Link>
                <button className="flex-1 bg-[#234745] text-[#FEF8EB] rounded-[25px] font-bold text-[16px] transition-colors" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                  {isEn ? 'Create Account' : 'إنشاء حساب'}
                </button>
              </div>



              {/* Registration Steps */}
              {step === 'input' ? (
                <>
                  <Form method="POST" className="w-full flex flex-col gap-5 w-full">
                  <input type="hidden" name="intent" value="send-otp" />
                  
                  {/* Account Type Toggle */}
                  <div className="flex w-full gap-4 h-[40px] mb-2">
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, accountType: 'individual'})}
                      className={`flex-1 rounded-[12px] font-bold text-[14px] transition-colors border ${formData.accountType === 'individual' ? 'bg-[#234745] text-white border-[#234745]' : 'bg-transparent text-[#9FB7AE] border-[#BBCFCD] hover:bg-[#234745]/5'}`} 
                      style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                    >
                      {isEn ? 'Individuals' : 'أفراد'}
                    </button>
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, accountType: 'company'})}
                      className={`flex-1 rounded-[12px] font-bold text-[14px] transition-colors border ${formData.accountType === 'company' ? 'bg-[#234745] text-white border-[#234745]' : 'bg-transparent text-[#9FB7AE] border-[#BBCFCD] hover:bg-[#234745]/5'}`} 
                      style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                    >
                      {isEn ? 'Companies' : 'شركات'}
                    </button>
                  </div>

                  {formData.accountType === 'individual' ? (
                    <div className="flex flex-col gap-2 w-full">
                      <label className={`text-[12px] font-bold text-[#171717] px-1 w-full flex gap-1 ${isEn ? 'flex-row' : 'flex-row-reverse justify-end'}`} style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                        <span className="text-[#E55C5C]">*</span>
                        <span>{isEn ? 'Full Name' : 'الاسم الكامل'}</span>
                      </label>
                      <input
                        name="fullName"
                        type="text"
                        placeholder={isEn ? "John Doe" : "محمد العبدلي"}
                        className="w-full bg-white border border-[#BBCFCD] rounded-[12px] px-4 py-3 h-[48px] focus:border-[#234745] outline-none text-[#171717] font-medium text-[14px] placeholder:text-[#BBCFCD] transition-colors"
                        value={formData.fullName}
                        onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                        required={formData.accountType === 'individual'}
                        style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                      />
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col gap-2 w-full">
                        <label className={`text-[12px] font-bold text-[#171717] px-1 w-full flex gap-1 ${isEn ? 'flex-row' : 'flex-row-reverse justify-end'}`} style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                          <span className="text-[#E55C5C]">*</span>
                          <span>{isEn ? 'Company Name' : 'اسم الشركة'}</span>
                        </label>
                        <input
                          name="companyName"
                          type="text"
                          placeholder={isEn ? "Company LLC" : "شركة التقنية المحدودة"}
                          className="w-full bg-white border border-[#BBCFCD] rounded-[12px] px-4 py-3 h-[48px] focus:border-[#234745] outline-none text-[#171717] font-medium text-[14px] placeholder:text-[#BBCFCD] transition-colors"
                          value={formData.companyName}
                          onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                          required={formData.accountType === 'company'}
                          style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                        />
                      </div>
                      
                      <div className="flex flex-col gap-2 w-full">
                        <label className={`text-[12px] font-bold text-[#171717] px-1 w-full flex gap-1 ${isEn ? 'flex-row' : 'flex-row-reverse justify-end'}`} style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                          <span>{isEn ? 'Tax Registration (Optional)' : 'الرقم الضريبي (اختياري)'}</span>
                        </label>
                        <input
                          name="taxRegistration"
                          type="text"
                          placeholder="310000000000003"
                          className="w-full bg-white border border-[#BBCFCD] rounded-[12px] px-4 py-3 h-[48px] focus:border-[#234745] outline-none text-[#171717] font-medium text-[14px] placeholder:text-[#BBCFCD] transition-colors"
                          value={formData.taxRegistration}
                          onChange={(e) => setFormData({...formData, taxRegistration: e.target.value})}
                          style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                        />
                      </div>
                      
                      <div className="flex flex-col gap-2 w-full">
                        <label className={`text-[12px] font-bold text-[#171717] px-1 w-full flex gap-1 ${isEn ? 'flex-row' : 'flex-row-reverse justify-end'}`} style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                          <span>{isEn ? 'Company Address (Optional)' : 'عنوان الشركة (اختياري)'}</span>
                        </label>
                        <input
                          name="companyAddress"
                          type="text"
                          placeholder={isEn ? "123 Business St, Riyadh" : "شارع الأعمال، الرياض"}
                          className="w-full bg-white border border-[#BBCFCD] rounded-[12px] px-4 py-3 h-[48px] focus:border-[#234745] outline-none text-[#171717] font-medium text-[14px] placeholder:text-[#BBCFCD] transition-colors"
                          value={formData.companyAddress}
                          onChange={(e) => setFormData({...formData, companyAddress: e.target.value})}
                          style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                        />
                      </div>
                    </>
                  )}

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
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value.replace(/\D/g, '')})}
                        required
                      />
                    </div>
                  </div>

                  {/* Email Input */}
                  <div className="flex flex-col gap-2 w-full">
                    <label className={`text-[12px] font-bold text-[#171717] px-1 w-full flex gap-1 ${isEn ? 'flex-row' : 'flex-row-reverse justify-end'}`} style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                      <span className="text-[#E55C5C]">*</span>
                      <span>{isEn ? 'Email' : 'البريد الإلكتروني'}</span>
                    </label>
                    <input
                      name="email"
                      type="email"
                      placeholder="example@mail.com"
                      className="w-full bg-white border border-[#BBCFCD] rounded-[12px] px-4 py-3 h-[48px] focus:border-[#234745] outline-none text-[#171717] font-medium text-[14px] placeholder:text-[#BBCFCD] transition-colors"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      required
                      dir="ltr"
                      style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                    />
                  </div>

                  {/* Preferred Language Select */}
                  <div className="flex flex-col gap-2 w-full">
                    <label className={`text-[12px] font-bold text-[#171717] px-1 w-full flex gap-1 ${isEn ? 'flex-row' : 'flex-row-reverse justify-end'}`} style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                      <span className="text-[#E55C5C]">*</span>
                      <span>{isEn ? 'Preferred Language' : 'اللغة المفضلة'}</span>
                    </label>
                    <div className="relative">
                      <select
                        name="language"
                        className="w-full bg-white border border-[#BBCFCD] rounded-[12px] px-4 py-3 h-[48px] focus:border-[#234745] outline-none text-[#171717] font-medium text-[14px] transition-colors appearance-none"
                        value={formData.language}
                        onChange={(e) => setFormData({...formData, language: e.target.value})}
                        style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                      >
                        <option value="ar">العربية (Arabic)</option>
                        <option value="en">English (الإنجليزية)</option>
                      </select>
                      <div className="absolute inset-y-0 ltr:right-4 rtl:left-4 flex items-center pointer-events-none">
                        <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                          <path d="M1 1.5L6 6.5L11 1.5" stroke="#9FB7AE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Terms Checkbox */}
                  <div className="flex items-center gap-3 mt-2">
                    <input 
                      type="checkbox"
                      id="terms"
                      checked={formData.termsAccepted}
                      onChange={(e) => setFormData({...formData, termsAccepted: e.target.checked})}
                      className="w-5 h-5 rounded border-[#BBCFCD] text-[#234745] focus:ring-[#234745] cursor-pointer"
                      required
                    />
                    <label htmlFor="terms" className={`text-[#171717] text-[12px] font-medium flex gap-1 ${isEn ? 'flex-row' : 'flex-row-reverse'}`} style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                      <span className="text-[#E55C5C]">*</span>
                      <span>
                        {isEn ? 'I agree to the ' : 'أوافق على '}
                        <span className="font-bold border-b border-[#171717]">{isEn ? 'Terms of Use' : 'شروط الاستخدام'}</span>
                        {isEn ? ' and ' : ' '}
                        <span className="font-bold border-b border-[#171717]">{isEn ? 'Privacy Policy' : 'وسياسة الخصوصية'}</span>
                      </span>
                    </label>
                  </div>

                  {actionData?.error && <p className="text-red-500 text-sm text-center mt-1">{actionData.error}</p>}

                  {/* Submit Button */}
                  <button 
                    type="submit" 
                    disabled={isLoading || formData.phone.length < 9 || !formData.fullName || !formData.termsAccepted}
                    className="w-full bg-[#234745] text-[#FEF8EB] font-bold text-[16px] rounded-[25px] h-[48px] flex items-center justify-center hover:bg-[#1a3533] transition-colors mt-2 disabled:opacity-70"
                    style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                  >
                    {isLoading ? (isEn ? 'Sending...' : 'جاري الإرسال...') : (isEn ? 'Create account and send verification code' : 'إنشاء حساب وإرسال رمز التحقق')}
                  </button>
                </Form>
                <SocialLogins />
              </>
              ) : (
                <Form method="POST" className="w-full flex flex-col gap-6">
                  <input type="hidden" name="intent" value="register-with-otp" />
                  
                  {/* Hidden inputs to pass data to Action */}
                  <input type="hidden" name="accountType" value={formData.accountType} />
                  <input type="hidden" name="fullName" value={formData.fullName} />
                  <input type="hidden" name="companyName" value={formData.companyName} />
                  <input type="hidden" name="taxRegistration" value={formData.taxRegistration} />
                  <input type="hidden" name="companyAddress" value={formData.companyAddress} />
                  <input type="hidden" name="email" value={formData.email} />
                  <input type="hidden" name="language" value={formData.language} />
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

                  {/* Resend Cooldown UI */}
                  <div className="flex flex-col items-center gap-1 mt-2">
                    {resendCooldown > 0 ? (
                      <p className="text-sm font-medium text-[#A19F9F]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                        {isEn 
                          ? `Resend code in ${resendCooldown}s` 
                          : `إعادة إرسال الرمز خلال ${resendCooldown} ثانية`}
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResend}
                        disabled={fetcher.state !== 'idle'}
                        className="text-[#234745] hover:underline text-sm font-bold transition-colors disabled:opacity-50"
                        style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                      >
                        {fetcher.state !== 'idle' 
                          ? (isEn ? 'Sending...' : 'جاري الإرسال...') 
                          : (isEn ? 'Resend Verification Code' : 'إعادة إرسال رمز التحقق')}
                      </button>
                    )}
                  </div>

                  {isResent && (
                    <p className="text-green-600 text-sm text-center font-medium mt-1">
                      {isEn ? 'Verification code has been resent!' : 'تم إعادة إرسال رمز التحقق!'}
                    </p>
                  )}

                  {(fetcher.data?.error || actionData?.error) && (
                    <p className="text-red-500 text-sm text-center mt-1">
                      {fetcher.data?.error || actionData?.error}
                    </p>
                  )}

                  <button 
                    type="submit" 
                    disabled={isLoading || otpValue.some(v => !v)}
                    className="w-full bg-[#234745] text-[#FEF8EB] font-bold text-[16px] rounded-[25px] h-[48px] flex items-center justify-center hover:bg-[#1a3533] transition-colors disabled:opacity-70"
                    style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                  >
                    {isLoading ? (isEn ? 'Creating...' : 'جاري الإنشاء...') : (isEn ? 'Confirm & Create Account' : 'تأكيد وإنشاء حساب')}
                  </button>
                  
                  <button type="button" className="text-[#9FB7AE] hover:underline text-sm font-medium mx-auto" onClick={() => setStep('input')} style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                    {isEn ? 'Back to Details' : 'العودة للبيانات'}
                  </button>
                </Form>
              )}
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

          {/* Logo & Subtitle Content using shared component */}
          <LogoSplash />

          {/* Optional background subtle pattern overlay if needed, based on Figma image 172 */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-transparent pointer-events-none" />
        </div>

      </div>
    </div>
  );
}
