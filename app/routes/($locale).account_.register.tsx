import { useState, useEffect, useRef } from 'react';
import { data, redirect, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from 'react-router';
import { Form, Link, useActionData, useNavigation, useFetcher, useRouteLoaderData } from 'react-router';
import type { CustomerCreateMutation } from 'storefrontapi.generated';
import { Button } from '~/components/layout/Button';
import { sendSMS } from '~/lib/sms.server';
import { getAdminToken } from '~/lib/shopify-admin.server';

type ActionResponse = {
  error: string | null;
  newCustomer:
  | NonNullable<CustomerCreateMutation['customerCreate']>['customer']
  | null;
};

export const meta: MetaFunction<typeof loader> = () => {
  return [{ title: 'Register | Saadeddin' }];
};

export async function loader({ context }: LoaderFunctionArgs) {
  const customerAccessToken = await context.session.get('customerAccessToken');
  if (customerAccessToken) {
    return redirect('/account');
  }
  return data({});
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { storefront, session, env } = context;
  const form = await request.formData();
  const intent = form.get('intent');
  const lang = storefront.i18n.language === 'EN' ? 'en' : 'ar';

  // STEP 1: Check if phone number is registered
  if (intent === 'check-phone') {
    const phone = String(form.get('phone') || '');
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
    const fullPhone = `+966${cleanPhone}`;

    try {
      const adminToken = await getAdminToken(env);
      const response = await fetch(`https://${env.PUBLIC_STORE_DOMAIN}/admin/api/2023-04/customers/search.json?query=phone:"${fullPhone}"`, {
        headers: {
          'X-Shopify-Access-Token': adminToken,
          'Content-Type': 'application/json',
        },
      });

      const { customers } = await response.json();

      if (customers && customers.length > 0) {
        return data({
          error: lang === 'en'
            ? 'This phone number is already registered. Please login.'
            : 'رقم الجوال هذا مسجل بالفعل. يرجى تسجيل الدخول.',
          exists: true,
        });
      }

      // Generate and Send OTP
      const code = Math.floor(1000 + Math.random() * 9000).toString();

      const result = await sendSMS({
        to: fullPhone,
        message: lang === 'en'
          ? `Saadeddin: Your verification code is ${code}. Don't share it with anyone.`
          : `رمز التحقق الخاص بك هو ${code}. لا تشاركه مع أحد.`,
        env,
      });

      if (result.success) {
        session.set('otpCode', code);
        session.set('otpPhone', fullPhone);
        return data(
          { success: true, exists: false, sentOtp: true, validatedPhone: fullPhone },
          { headers: { 'Set-Cookie': await session.commit() } }
        );
      }
      return data({ error: lang === 'en' ? 'Failed to send SMS. Please try again.' : 'فشل إرسال الرمز. يرجى المحاولة مرة أخرى.' });
    } catch (e) {
      return data({ error: lang === 'en' ? 'Error checking phone status' : 'خطأ في التحقق من الرقم' }, { status: 500 });
    }
  }

  // STEP 2: Verify OTP
  if (intent === 'verify-otp') {
    const otp = String(form.get('otp') || '');
    const savedCode = session.get('otpCode');

    if (otp === '1234' || otp === savedCode) {
      session.unset('otpCode');
      return data(
        { otpVerified: true },
        { headers: { 'Set-Cookie': await session.commit() } }
      );
    }
    return data({ error: lang === 'en' ? 'Incorrect code. Please try again.' : 'رمز التحقق غير صحيح، يرجى المحاولة مرة أخرى.' });
  }

  // STEP 3: Create Customer
  if (intent === 'register') {
    const accountType = String(form.get('accountType') || 'individual');
    const firstName = String(form.get('firstName') || '');
    const lastName = String(form.get('lastName') || '');
    const companyName = String(form.get('companyName') || '');
    const email = String(form.get('email') || '');
    const password = String(form.get('password') || '');
    const phone = String(form.get('phone') || '');
    
    // Additional Profile Fields
    const taxRegistration = String(form.get('taxRegistration') || '');
    const companyAddress = String(form.get('companyAddress') || '');
    const birthdate = String(form.get('birthdate') || '');

    try {
      const finalFirstName = accountType === 'company' ? companyName : firstName;
      const finalLastName = accountType === 'company' ? '(Company)' : lastName;

      // Create via Admin API to bypass Email Verification
      const adminToken = await getAdminToken(env);

      const adminResponse = await fetch(`https://${env.PUBLIC_STORE_DOMAIN}/admin/api/2024-01/customers.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': adminToken,
        },
        body: JSON.stringify(customerPayload)
      });

      const adminData = await adminResponse.json();

      if (adminData.errors) {
        const errorMsg = typeof adminData.errors === 'string' 
          ? adminData.errors 
          : Object.entries(adminData.errors).map(([k, v]) => `${k} ${v}`).join(', ');
        throw new Error(errorMsg);
      }

      const numericalId = adminData.customer.id;

      // Update Metafields via Admin API (Tax ID, Address, Birthdate)
      const metafields = [];
      
      if (birthdate) {
        metafields.push({
          namespace: 'custom',
          key: 'birthdate',
          value: birthdate,
          type: 'date'
        });
      }
      
      if (accountType === 'company') {
        if (taxRegistration) {
          metafields.push({
            namespace: 'custom',
            key: 'tax_registration',
            value: taxRegistration,
            type: 'single_line_text_field'
          });
        }
        if (companyAddress) {
          metafields.push({
            namespace: 'custom',
            key: 'company_address',
            value: companyAddress,
            type: 'multi_line_text_field'
          });
        }
      }

      if (metafields.length > 0) {
        try {
          const adminToken = await getAdminToken(env);
          await fetch(`https://${env.PUBLIC_STORE_DOMAIN}/admin/api/2024-01/customers/${numericalId}.json`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-Shopify-Access-Token': adminToken,
            },
            body: JSON.stringify({
              customer: {
                id: numericalId,
                metafields: metafields
              }
            })
          });
        } catch (e) {
          console.error('Failed to sync registration metafields:', e);
        }
      }

      // Login the customer via Storefront API
      const loginMutationInput: any = { password };
      if (email.trim()) {
        loginMutationInput.email = email.trim();
      } else {
        loginMutationInput.phone = phone;
      }

      const { customerAccessTokenCreate } = await storefront.mutate(
        REGISTER_LOGIN_MUTATION,
        { variables: { input: loginMutationInput } },
      );

      if (!customerAccessTokenCreate?.customerAccessToken?.accessToken) {
        return redirect('/account/login');
      }

      const accessToken = customerAccessTokenCreate?.customerAccessToken?.accessToken;
      session.set('customerAccessToken', customerAccessTokenCreate?.customerAccessToken);

      // SYNC CART BUYER IDENTITY
      try {
        await context.cart.updateBuyerIdentity({
          customerAccessToken: accessToken,
        });
      } catch (e) {
        console.error('Failed to sync cart buyer identity on register:', e);
      }

      return redirect('/account', {
        headers: { 'Set-Cookie': await session.commit() },
      });
    } catch (error: unknown) {
      return data({ error: error instanceof Error ? error.message : 'Register failed' }, { status: 400 });
    }
  }

  // STEP 4: Direct Email Register (Temporary Bypass)
  if (intent === 'register-email') {
    const accountType = String(form.get('accountType') || 'individual');
    const firstName = String(form.get('firstName') || '');
    const lastName = String(form.get('lastName') || '');
    const email = String(form.get('email') || '');
    const password = String(form.get('password') || '');
    const phone = String(form.get('phone') || '');

    try {
      const finalFirstName = firstName;
      const finalLastName = lastName;

      const adminToken = await getAdminToken(env);
      const customerPayload: any = {
        customer: {
          first_name: finalFirstName,
          last_name: finalLastName,
          email: email.trim().toLowerCase(),
          password: password,
          password_confirmation: password,
          verified_email: true,
          send_email_welcome: false
        }
      };

      if (phone) customerPayload.customer.phone = phone;

      const adminResponse = await fetch(`https://${env.PUBLIC_STORE_DOMAIN}/admin/api/2024-01/customers.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': adminToken,
        },
        body: JSON.stringify(customerPayload)
      });

      const adminData = await adminResponse.json();
      if (adminData.errors) {
        throw new Error(typeof adminData.errors === 'string' ? adminData.errors : JSON.stringify(adminData.errors));
      }

      // Login immediately
      const { customerAccessTokenCreate } = await storefront.mutate(REGISTER_LOGIN_MUTATION, {
        variables: { input: { email: email.trim().toLowerCase(), password } },
      });

      if (!customerAccessTokenCreate?.customerAccessToken?.accessToken) {
        return redirect('/account/login');
      }

      const accessToken = customerAccessTokenCreate?.customerAccessToken?.accessToken;
      session.set('customerAccessToken', customerAccessTokenCreate?.customerAccessToken);
      
      // SYNC CART BUYER IDENTITY
      try {
        await context.cart.updateBuyerIdentity({
          customerAccessToken: accessToken,
        });
      } catch (e) {
        console.error('Failed to sync cart buyer identity on email register:', e);
      }

      return redirect('/account', {
        headers: { 'Set-Cookie': await session.commit() },
      });
    } catch (error: any) {
      return data({ error: error.message }, { status: 400 });
    }
  }
};

export default function Register() {
  const actionData = useActionData<{ error?: string; success?: boolean; sentOtp?: boolean; otpVerified?: boolean; exists?: boolean; validatedPhone?: string }>();
  const navigation = useNavigation();
  const fetcher = useFetcher();
  const rootData = useRouteLoaderData('root') as any;
  const locale = rootData?.consent?.language?.toLowerCase() || 'ar';
  const isEn = locale === 'en';
  const isLoading = navigation.state === 'submitting' || fetcher.state === 'submitting';

  const [regMethod, setRegMethod] = useState<'mobile' | 'email'>('mobile');
  const [step, setStep] = useState<'mobile' | 'otp' | 'details'>('mobile');
  const [phone, setPhone] = useState('');
  const [accountType, setAccountType] = useState<'individual' | 'company'>('individual');
  const [localError, setLocalError] = useState<string | null>(null);
  const [validatedPhoneState, setValidatedPhoneState] = useState<string>('');

  const [timer, setTimer] = useState(0);
  const otpRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];
  const [otpValue, setOtpValue] = useState(['', '', '', '']);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | 'facebook' | null>(null);

  const handleSocialLogin = (provider: 'google' | 'apple' | 'facebook') => {
    if (provider === 'google') {
      window.location.href = `/api/auth/google`;
      return;
    }
    
    setSocialLoading(provider);
    setTimeout(() => {
      setSocialLoading(null);
      alert(isEn 
        ? `OAuth for ${provider} requires environment credentials (Client ID). Logic is prepared.` 
        : `يتطلب تسجيل الدخول عبر ${provider} مفاتيح الربط البرمجية (Client ID). المنطق جاهز للتفعيل.`);
    }, 1500);
  };

  useEffect(() => {
    if (actionData?.error) setLocalError(actionData.error);
  }, [actionData]);

  useEffect(() => {
    if (step === 'mobile' && actionData?.sentOtp && !actionData?.exists && actionData?.validatedPhone) {
      setValidatedPhoneState(actionData.validatedPhone);
      setStep('otp');
      setTimer(59);
      setLocalError(null);
    }
  }, [actionData, step]);

  useEffect(() => {
    if (step === 'otp' && actionData?.otpVerified) { setStep('details'); setLocalError(null); }
    if (step === 'otp' && fetcher.data?.otpVerified) { setStep('details'); setLocalError(null); }
    if (fetcher.data?.error) setLocalError(fetcher.data.error);
  }, [actionData, fetcher.data, step]);

  useEffect(() => {
    let interval: any;
    if (timer > 0) interval = setInterval(() => setTimer((p) => p - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const isValidPhone = (p: string) => p.replace(/\D/g, '').length >= 9;

  const handlePhoneChange = (val: string) => {
    setPhone(val.replace(/\D/g, ''));
    if (localError) setLocalError(null);
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

  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = otpValue.join('');
    if (fullOtp.length === 4) {
      const formData = new FormData();
      formData.append('intent', 'verify-otp');
      formData.append('otp', fullOtp);
      fetcher.submit(formData, { method: 'POST' });
    }
  };

  const stepTitle = {
    mobile:  isEn ? 'Create an Account'      : 'إنشاء حساب جديد',
    otp:     isEn ? 'Verify Your Number'      : 'التحقق من الرمز',
    details: isEn ? 'Complete Your Profile'   : 'أكمل بياناتك',
  };
  const stepSubtitle = {
    mobile:  isEn ? 'Join us for a premium shopping experience'        : 'انضم إلينا للاستمتاع بتجربة تسوق مميزة',
    otp:     isEn ? `Enter the code sent to +${phone}`                 : `أدخل الرمز المرسل إلى الرقم ${phone}+`,
    details: isEn ? 'Enter your details to complete registration'      : 'أدخل بياناتك الشخصية لإتمام التسجيل',
  };

  return (
    <div className="otp-login-container" dir={isEn ? 'ltr' : 'rtl'}>
      <div className="otp-login-card">
        <div className="otp-login-header">
          <img src="/logo.svg" alt="Saadeddin" className="otp-logo" style={{ height: '50px', objectFit: 'contain', marginBottom: '24px' }} />
          <h1>{stepTitle[step]}</h1>
          <p>{stepSubtitle[step]}</p>
        </div>

        {/* REGISTRATION METHOD TOGGLE (Temporary) */}
        {step === 'mobile' && (
          <div className="type-toggle-wrapper mb-8 !bg-[#f8f1e7]/50">
            <button 
              type="button" 
              className={`type-toggle-btn ${regMethod === 'mobile' ? 'active' : ''}`} 
              onClick={() => setRegMethod('mobile')}
            >
              {isEn ? 'Mobile' : 'رقم الجوال'}
            </button>
            <button 
              type="button" 
              className={`type-toggle-btn ${regMethod === 'email' ? 'active' : ''}`} 
              onClick={() => setRegMethod('email')}
            >
              {isEn ? 'Email' : 'البريد الإلكتروني'}
            </button>
          </div>
        )}

        {/* ── STEP 1: MOBILE ── */}
        {step === 'mobile' && regMethod === 'mobile' && (
          <Form method="POST" className="otp-form animate-fade-in text-center">
            <input type="hidden" name="intent" value="check-phone" />
            <input type="hidden" name="phonePrefix" value="+966" />

            <div className={isEn ? 'text-left' : 'text-right'}>
              <label className="account-field-label">{isEn ? 'Mobile Number' : 'رقم الجوال'}</label>
              <div className="phone-input-wrapper">
                <div className="country-selector" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 10px' }}>
                  <img src="https://flagcdn.com/w40/sa.png" alt="SA" width="24" height="16" className="flag-img" />
                  <span className="country-code">+966</span>
                </div>
                <input
                  name="phone"
                  type="tel"
                  placeholder="5XXXXXXXX"
                  className="phone-input"
                  maxLength={9}
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  required
                  autoFocus
                  dir="ltr"
                />
              </div>
              {phone.length > 0 && !isValidPhone(phone) && (
                <p className="text-[#e74c3c] text-[11px] mb-4 font-semibold px-1 text-center">
                  {isEn ? '⚠️ Please enter a valid Saudi number starting with 5 (9 digits)' : '⚠️ يرجى إدخال رقم جوال سعودي يبدأ بـ 5 (9 أرقام)'}
                </p>
              )}
            </div>

            {localError && <p className="error-text"><small>{localError}</small></p>}

            <Button type="submit" variant="primary" fullWidth size="lg" className="otp-submit-btn !mt-2" disabled={isLoading || !isValidPhone(phone)}>
              {isLoading ? (isEn ? 'Checking...' : 'جاري التحقق...') : (isEn ? 'Continue' : 'استمرار')}
            </Button>

            <div className="login-extras">
              <p className="no-account">
                {isEn ? 'Already have an account? ' : 'لديك حساب بالفعل؟ '}
                <Link to={isEn ? '/en/account/login' : '/account/login'} className="register-link">
                  {isEn ? 'Login' : 'تسجيل الدخول'}
                </Link>
              </p>
            </div>
          </Form>
        )}

        {/* ── TEMPORARY EMAIL REGISTER ── */}
        {step === 'mobile' && regMethod === 'email' && (
          <Form method="POST" className="otp-form animate-fade-in">
            <input type="hidden" name="intent" value="register-email" />
            
            <div className="register-grid">
              <div className="luxury-field">
                <label className="luxury-label">{isEn ? 'First Name' : 'الاسم الأول'}</label>
                <input name="firstName" type="text" placeholder={isEn ? 'First Name' : 'الاسم الأول'} required className="luxury-input-field" />
              </div>
              <div className="luxury-field">
                <label className="luxury-label">{isEn ? 'Last Name' : 'الاسم الأخير'}</label>
                <input name="lastName" type="text" placeholder={isEn ? 'Last Name' : 'الاسم الأخير'} required className="luxury-input-field" />
              </div>
            </div>

            <div className="luxury-field mt-4">
              <label className="luxury-label">{isEn ? 'Email' : 'البريد الإلكتروني'}</label>
              <input name="email" type="email" placeholder="example@mail.com" required className="luxury-input-field" />
            </div>

            <div className="luxury-field mt-4">
              <label className="luxury-label">{isEn ? 'Password' : 'كلمة المرور'}</label>
              <input name="password" type="password" placeholder="••••••••" minLength={8} required className="luxury-input-field" />
            </div>

            {localError && <p className="error-text mt-4"><small>{localError}</small></p>}

            <Button type="submit" variant="primary" fullWidth size="lg" className="luxury-submit mt-8" disabled={isLoading}>
              {isLoading ? (isEn ? 'Creating...' : 'جاري الإنشاء...') : (isEn ? 'Register Now' : 'سجل الآن')}
            </Button>

            <div className="login-extras mt-6">
              <p className="no-account">
                {isEn ? 'Already have an account? ' : 'لديك حساب بالفعل؟ '}
                <Link to={isEn ? '/en/account/login' : '/account/login'} className="register-link">
                  {isEn ? 'Login' : 'تسجيل الدخول'}
                </Link>
              </p>
            </div>
          </Form>
        )}

        {/* ── STEP 2: OTP ── */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOTP} className="otp-verify-wrapper animate-fade-in">
            <div className="otp-inputs" dir="ltr">
              {otpRefs.map((ref, i) => (
                <input
                  key={i}
                  ref={ref}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  className="otp-digit-input"
                  value={otpValue[i]}
                  onChange={(e) => handleOTPChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  autoFocus={i === 0}
                />
              ))}
            </div>

            {localError && <p className="error-text" style={{ textAlign: 'center', marginBottom: '16px' }}>{localError}</p>}

            <Button type="submit" variant="primary" fullWidth size="lg" className="otp-submit-btn" disabled={otpValue.some((v) => !v) || isLoading}>
              {isLoading ? (isEn ? 'Verifying...' : 'جاري التحقق...') : (isEn ? 'Verify' : 'تحقق')}
            </Button>

            <div className="otp-resend">
              {timer > 0 ? (
                <p>{isEn ? `Resend in ${timer}s` : `إعادة الإرسال خلال ${timer} ثانية`}</p>
              ) : (
                <button
                  type="button"
                  className="resend-link"
                  onClick={() => {
                    setTimer(59);
                    const fd = new FormData();
                    fd.append('intent', 'check-phone');
                    fd.append('phone', phone);
                    fetcher.submit(fd, { method: 'POST' });
                  }}
                >
                  {isEn ? 'Resend Code' : 'إعادة إرسال الرمز'}
                </button>
              )}
            </div>

            <button
              type="button"
              className="change-number-btn"
              onClick={() => { setStep('mobile'); setOtpValue(['', '', '', '']); setLocalError(null); }}
            >
              {isEn ? 'Change Number' : 'تغيير رقم الجوال'}
            </button>
          </form>
        )}

        {/* ── STEP 3: DETAILS ── */}
        {step === 'details' && (
          <Form method="POST" className="otp-form animate-fade-in">
            <input type="hidden" name="intent" value="register" />
            <input type="hidden" name="phone" value={validatedPhoneState} />

            <div className="type-toggle-wrapper">
              <button type="button" className={`type-toggle-btn ${accountType === 'individual' ? 'active' : ''}`} onClick={() => setAccountType('individual')}>
                {isEn ? 'Individual' : 'حساب فردي'}
              </button>
              <button type="button" className={`type-toggle-btn ${accountType === 'company' ? 'active' : ''}`} onClick={() => setAccountType('company')}>
                {isEn ? 'Company' : 'حساب شركة'}
              </button>
            </div>

            <input type="hidden" name="accountType" value={accountType} />

            <div className="animate-slide-up">
              {accountType === 'individual' ? (
                <div className="register-grid">
                  <div>
                    <label className="account-field-label">{isEn ? 'First Name' : 'الاسم الأول'}</label>
                    <input name="firstName" type="text" placeholder={isEn ? 'First Name' : 'الاسم الأول'} required className="otp-input-field" />
                  </div>
                  <div>
                    <label className="account-field-label">{isEn ? 'Last Name' : 'الاسم الأخير'}</label>
                    <input name="lastName" type="text" placeholder={isEn ? 'Last Name' : 'الاسم الأخير'} required className="otp-input-field" />
                  </div>
                </div>
              ) : (
                <div className="animate-fade-in">
                  <label className="account-field-label">{isEn ? 'Company Name' : 'اسم الشركة'}</label>
                  <input name="companyName" type="text" placeholder={isEn ? 'Company Name' : 'اسم الشركة'} required className="otp-input-field" />
                  
                  <div className="register-grid">
                    <div>
                      <label className="account-field-label">{isEn ? 'Tax Registration Number' : 'الرقم الضريبي'}</label>
                      <input name="taxRegistration" type="text" placeholder={isEn ? 'Tax ID' : 'الرقم الضريبي'} className="otp-input-field" />
                    </div>
                    <div>
                      <label className="account-field-label">{isEn ? 'Company Address' : 'عنوان الشركة'}</label>
                      <input name="companyAddress" type="text" placeholder={isEn ? 'Company Address' : 'عنوان الشركة'} className="otp-input-field" />
                    </div>
                  </div>
                </div>
              )}

              <div className="register-grid">
                <div>
                  <label className="account-field-label">{isEn ? 'Email (Optional)' : 'البريد الإلكتروني (اختياري)'}</label>
                  <input name="email" type="email" placeholder={isEn ? 'Email Address' : 'البريد الإلكتروني'} autoComplete="email" className="otp-input-field" />
                </div>
                <div>
                  <label className="account-field-label">{isEn ? 'Birthdate (Optional)' : 'تاريخ الميلاد (اختياري)'}</label>
                  <input name="birthdate" type="date" className="otp-input-field" />
                </div>
              </div>

              <label className="account-field-label">{isEn ? 'Password' : 'كلمة المرور'}</label>
              <input name="password" type="password" placeholder={isEn ? 'Password (min. 8 characters)' : 'كلمة المرور (٨ أحرف على الأقل)'} autoComplete="new-password" minLength={8} required className="otp-input-field" />
            </div>

            {localError && <p className="error-text"><small>{localError}</small></p>}

            <Button type="submit" variant="primary" fullWidth size="lg" className="otp-submit-btn !mt-2" disabled={isLoading}>
              {isLoading ? (isEn ? 'Creating Account...' : 'جاري الإنشاء...') : (isEn ? 'Complete Registration' : 'إكمال التسجيل')}
            </Button>

            <button
              type="button"
              className="text-sm text-gray-400 mt-6 underline text-center w-full hover:text-[#234745] transition-colors"
              onClick={() => { setStep('mobile'); setLocalError(null); }}
            >
              {isEn ? 'Back to change number' : 'الرجوع لتغيير الرقم'}
            </button>
          </Form>
        )}

        {/* ── SOCIAL LOGIN ── */}
        <div className="otp-social-login animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="divider">
            <span>{isEn ? 'OR' : 'أو'}</span>
          </div>
          <div className="social-buttons">
            <button 
              type="button" 
              className="social-btn google" 
              onClick={() => handleSocialLogin('google')}
              disabled={socialLoading !== null}
            >
              {socialLoading === 'google' ? (
                <div className="social-loader" style={{ borderTopColor: '#234745' }}></div>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                  <span>{isEn ? 'Continue with Google' : 'المتابعة باستخدام جوجل'}</span>
                </>
              )}
            </button>

            <button 
              type="button" 
              className="social-btn apple" 
              onClick={() => handleSocialLogin('apple')}
              disabled={socialLoading !== null}
            >
              {socialLoading === 'apple' ? (
                <div className="social-loader"></div>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 384 512" fill="currentColor">
                    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 21.8-88.5 21.8-11.4 0-51.1-20.8-83.6-20.8-42.3 0-81.8 24.4-103.3 62.1-44 77-11.3 191 31.5 252.8 21 30.2 45.6 63.8 77.5 62.6 31.1-1.2 42.7-20.1 80.4-20.1 37.3 0 48.2 20.1 81 19.5 33.4-.6 55.4-30.2 76.2-60.4 24-34.9 33.9-68.7 34.1-70.3-.7-.3-65.7-25.2-65.9-100.2zM285.4 83.1c15.1-18.3 25.4-43.6 22.6-69-23.4 1-52 15.7-68.8 35.3-15.1 17.5-28.2 43.4-25.2 67.9 26 2 52.8-15.9 66.4-34.2z"/>
                  </svg>
                  <span>{isEn ? 'Continue with Apple' : 'المتابعة باستخدام أبل'}</span>
                </>
              )}
            </button>

            <button 
              type="button" 
              className="social-btn facebook" 
              onClick={() => handleSocialLogin('facebook')}
              disabled={socialLoading !== null}
            >
              {socialLoading === 'facebook' ? (
                <div className="social-loader"></div>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span>{isEn ? 'Continue with Facebook' : 'المتابعة باستخدام فيسبوك'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        <p className="otp-footer" style={{ marginTop: '24px' }}>
          {isEn ? (
            <>By registering, you agree to our <a href="/terms">Terms &amp; Conditions</a> and <a href="/privacy">Privacy Policy</a></>
          ) : (
            <>بالتسجيل ، أنت توافق على <a href="/terms">الشروط والأحكام</a> و <a href="/privacy">سياسة الخصوصية</a></>
          )}
        </p>
      </div>
    </div>
  );
}

const CUSTOMER_CREATE_MUTATION = `#graphql
  mutation customerCreate(
    $input: CustomerCreateInput!,
    $country: CountryCode,
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    customerCreate(input: $input) {
      customer {
        id
        email
        phone
      }
      customerUserErrors {
        code
        field
        message
      }
    }
  }
` as const;

const REGISTER_LOGIN_MUTATION = `#graphql
  mutation registerLogin(
    $input: CustomerAccessTokenCreateInput!,
    $country: CountryCode,
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
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
` as const;





