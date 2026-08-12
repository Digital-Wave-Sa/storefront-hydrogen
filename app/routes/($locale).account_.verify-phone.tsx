import {useState, useEffect, useRef} from 'react';
import {
  data,
  redirect,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from 'react-router';
import {Form, useNavigation, useActionData, useLoaderData} from 'react-router';
import {Button} from '~/components/layout/Button';
import {SaadeddinApi} from '~/lib/saadeddin-api.server';
import {validatePhoneNumber, sanitizePhoneInput} from '~/lib/phone-validation';

export async function loader({request, context}: LoaderFunctionArgs) {
  const {session, storefront} = context;
  const customerAccessToken = await session.get('customerAccessToken');
  const {pathname} = new URL(request.url);
  const localePrefix = /^\/([a-z]{2})\//.test(pathname + '/')
    ? `/${pathname.split('/')[1]}`
    : '';

  if (!customerAccessToken) {
    return redirect(`${localePrefix}/account/login`);
  }

  // Fetch the customer's current phone number
  const {customer} = await storefront.query(CUSTOMER_PHONE_QUERY, {
    variables: {
      customerAccessToken:
        typeof customerAccessToken === 'string'
          ? customerAccessToken
          : customerAccessToken?.accessToken,
    },
    cache: storefront.CacheNone(),
  });

  if (!customer) {
    session.unset('customerAccessToken');
    return redirect(`${localePrefix}/account/login`, {
      headers: {
        'Set-Cookie': await session.commit(),
      },
    });
  }

  // If the user already has a phone number, they are verified and can proceed to /account
  if (customer.phone) {
    return redirect(`${localePrefix}/account`);
  }

  const isEn = storefront.i18n.language === 'EN';
  return data({isEn, localePrefix});
}

export async function action({request, context}: ActionFunctionArgs) {
  const {session, storefront} = context;
  const customerAccessToken = await session.get('customerAccessToken');
  const isEn = storefront.i18n.language === 'EN';
  const {pathname} = new URL(request.url);
  const localePrefix = /^\/([a-z]{2})\//.test(pathname + '/')
    ? `/${pathname.split('/')[1]}`
    : '';

  if (!customerAccessToken) {
    return data({error: isEn ? 'Unauthorized' : 'غير مصرح به'}, {status: 401});
  }

  const form = await request.formData();
  const intent = form.get('intent');

  const saadeddinToken = await session.get('saadeddinToken');
  const api = new SaadeddinApi(context.env, saadeddinToken);

  if (intent === 'send-otp') {
    const rawPhone = String(form.get('phone') || '');
    const countryCode = String(form.get('countryCode') || '+966');

    const phoneValidation = validatePhoneNumber(rawPhone, countryCode);
    if (!phoneValidation.isValid) {
      return data(
        {
          error: isEn ? phoneValidation.errorEn : phoneValidation.errorAr,
        },
        {status: 400},
      );
    }

    const formattedPhone = phoneValidation.fullPhone;

    try {
      await api.requestOtp(formattedPhone, 'login');
      return data({success: true, otpSent: true, phone: formattedPhone});
    } catch (e: any) {
      return data(
        {
          error:
            e.message ||
            (isEn
              ? 'Failed to send verification code.'
              : 'فشل إرسال رمز التحقق.'),
        },
        {status: 400},
      );
    }
  }

  if (intent === 'verify-otp') {
    const phone = String(form.get('phone') || '');
    const code = String(form.get('otp') || '');

    try {
      // 1. Verify OTP with Saadeddin auth service
      await api.verifyOtp(phone, code, 'login');

      // 2. Write the verified phone number to the customer profile in Shopify
      const updated = await storefront.mutate(CUSTOMER_PHONE_UPDATE_MUTATION, {
        variables: {
          customerAccessToken:
            typeof customerAccessToken === 'string'
              ? customerAccessToken
              : customerAccessToken?.accessToken,
          customer: {phone},
        },
      });

      if (updated.customerUpdate?.customerUserErrors?.length) {
        const errorMsg = updated.customerUpdate.customerUserErrors[0].message;
        return data({error: errorMsg}, {status: 400});
      }

      // 3. Save verified phone inside user session
      session.set('loginOtpPhone', phone);

      return redirect(`${localePrefix}/account`, {
        headers: {
          'Set-Cookie': await session.commit(),
        },
      });
    } catch (e: any) {
      return data(
        {
          error:
            e.message ||
            (isEn ? 'Invalid verification code.' : 'رمز التحقق غير صحيح.'),
        },
        {status: 400},
      );
    }
  }

  return data({error: 'Invalid intent'}, {status: 400});
}

export default function VerifyPhone() {
  const {isEn, localePrefix} = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();

  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [phone, setPhone] = useState('');
  const [timer, setTimer] = useState(0);

  const otpValue = ['', '', '', '', '', ''];
  const [otpArray, setOtpArray] = useState(otpValue);

  const otpRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const isSubmitting = navigation.state === 'submitting';

  // Handle step updates and errors from server action
  useEffect(() => {
    if (actionData && 'success' in actionData && actionData.success) {
      setStep('otp');
      setTimer(59);
      if (actionData.phone) setPhone(actionData.phone);
    }
    if (actionData && 'error' in actionData && actionData.error) {
      setOtpArray(['', '', '', '', '', '']);
      otpRefs[0].current?.focus();
    }
  }, [actionData]);

  // SMS Resend Timer count down
  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleOTPChange = (index: number, val: string) => {
    const cleanVal = val.replace(/\D/g, '').substring(0, 1);
    const newOtp = [...otpArray];
    newOtp[index] = cleanVal;
    setOtpArray(newOtp);

    if (cleanVal && index < 5) {
      otpRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === 'Backspace' && !otpArray[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  return (
    <div className="otp-login-container" dir={isEn ? 'ltr' : 'rtl'}>
      <div className="otp-login-card">
        <div className="otp-login-header">
          <img
            src="/logo.svg"
            alt="Saadeddin"
            className="otp-logo"
            style={{height: '50px', objectFit: 'contain', marginBottom: '24px'}}
          />
          <h1>{isEn ? 'Phone Verification' : 'التحقق من رقم الجوال'}</h1>
          <p className="text-gray-500 text-sm">
            {step === 'mobile'
              ? isEn
                ? 'Please register your phone number to secure your account and access rewards.'
                : 'يرجى تسجيل رقم جوالك لتأمين حسابك والوصول إلى المكافآت.'
              : isEn
                ? `Enter the 6-digit code sent to ${phone}`
                : `أدخل الرمز المكون من 6 أرقام المرسل إلى ${phone}`}
          </p>
        </div>

        {actionData && 'error' in actionData && actionData.error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-[13px] text-center font-medium animate-fade-in">
            {actionData.error}
          </div>
        )}

        {step === 'mobile' ? (
          <Form method="POST" className="otp-form animate-fade-in">
            <input type="hidden" name="intent" value="send-otp" />
            <div className="phone-input-wrapper">
              <span className="country-code font-bold text-[#234745]">
                +966
              </span>
              <input
                type="tel"
                name="phone"
                placeholder={phone.startsWith('0') ? '05XXXXXXXX' : '5XXXXXXXX'}
                value={phone}
                onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))}
                className="phone-input"
                maxLength={phone.startsWith('0') ? 10 : 9}
                required
                autoFocus
                disabled={isSubmitting}
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="lg"
              className="otp-submit-btn"
              disabled={phone.replace('+966', '').length < 9 || isSubmitting}
            >
              {isSubmitting
                ? isEn
                  ? 'Sending...'
                  : 'جاري الإرسال...'
                : isEn
                  ? 'Send Verification Code'
                  : 'إرسال رمز التحقق'}
            </Button>
          </Form>
        ) : (
          <Form method="POST" className="otp-verify-wrapper animate-fade-in">
            <input type="hidden" name="intent" value="verify-otp" />
            <input type="hidden" name="phone" value={phone} />
            <input type="hidden" name="otp" value={otpArray.join('')} />

            <div
              className="otp-inputs flex justify-center gap-2 mb-6"
              style={{direction: 'ltr'}}
            >
              {otpArray.map((digit, i) => (
                <input
                  key={i}
                  ref={otpRefs[i]}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  className="otp-digit-input w-11 h-12 text-center text-lg font-bold border border-[#f0ece8] bg-[#fcfaf8] rounded-xl focus:border-[#d4a06a] focus:ring-1 focus:ring-[#d4a06a] focus:outline-none transition-all"
                  onChange={(e) => handleOTPChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  autoFocus={i === 0}
                  disabled={isSubmitting}
                />
              ))}
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="lg"
              className="otp-submit-btn"
              disabled={otpArray.join('').length < 6 || isSubmitting}
            >
              {isSubmitting
                ? isEn
                  ? 'Verifying...'
                  : 'جاري التحقق...'
                : isEn
                  ? 'Verify'
                  : 'تحقق'}
            </Button>

            <div className="otp-resend text-center mt-4">
              {timer > 0 ? (
                <p className="text-gray-500 text-[13px]">
                  {isEn
                    ? `Resend code in ${timer}s`
                    : `إعادة إرسال الرمز خلال ${timer} ثانية`}
                </p>
              ) : (
                <Form method="POST" className="inline">
                  <input type="hidden" name="intent" value="send-otp" />
                  <input type="hidden" name="phone" value={phone} />
                  <button
                    type="submit"
                    className="resend-link text-sm font-semibold text-[#d4a06a] hover:text-[#b38350] transition-colors"
                    disabled={isSubmitting}
                  >
                    {isEn ? 'Resend Code' : 'إعادة إرسال الرمز'}
                  </button>
                </Form>
              )}
            </div>

            <button
              type="button"
              className="change-number-btn w-full text-center text-sm font-medium text-gray-500 hover:text-gray-700 mt-4 transition-colors"
              onClick={() => {
                setStep('mobile');
                setOtpArray(otpValue);
              }}
              disabled={isSubmitting}
            >
              {isEn ? 'Change Mobile Number' : 'تغيير رقم الجوال'}
            </button>
          </Form>
        )}
      </div>
    </div>
  );
}

const CUSTOMER_PHONE_QUERY = `#graphql
  query getCustomerPhoneVerifyPhone($customerAccessToken: String!) {
    customer(customerAccessToken: $customerAccessToken) {
      id
      phone
    }
  }
` as const;

const CUSTOMER_PHONE_UPDATE_MUTATION = `#graphql
  mutation customerPhoneUpdateVerifyPhone($customerAccessToken: String!, $customer: CustomerUpdateInput!) {
    customerUpdate(customerAccessToken: $customerAccessToken, customer: $customer) {
      customer {
        id
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
