import {useState, useEffect, useRef} from 'react';
import {data, type LoaderFunctionArgs, type MetaFunction} from 'react-router';
import {Form, useNavigation, useActionData} from 'react-router';
import {Button} from '~/components/layout/Button';
import {sanitizePhoneInput} from '~/lib/phone-validation';

export const meta: MetaFunction<typeof loader> = () => {
  return [{title: 'Login | Saadeddin'}];
};

export async function loader({context}: LoaderFunctionArgs) {
  if (await context.session.get('customerAccessToken')) {
    // return redirect('/account'); // Disable redirect for UI building
  }
  return data({});
}

export default function OTPLogin() {
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [timer, setTimer] = useState(0);
  const otpRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Handle timer for OTP resend
  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleSendOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneNumber.length >= 9) {
      setStep('otp');
      setTimer(59);
    }
  };

  const handleOTPChange = (index: number, value: string) => {
    if (value.length > 1) value = value[0];
    if (value && index < 3) {
      otpRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === 'Backspace' && !e.currentTarget.value && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  return (
    <div className="otp-login-container">
      <div className="otp-login-card">
        <div className="otp-login-header">
          <img
            src="/logo.svg"
            alt="Saadeddin"
            className="otp-logo"
            style={{height: '50px', objectFit: 'contain', marginBottom: '24px'}}
          />
          <h1>{step === 'mobile' ? 'تسجيل الدخول' : 'التحقق من الرمز'}</h1>
          <p>
            {step === 'mobile'
              ? 'أدخل رقم جوالك لتصلك رسالة التحقق'
              : `أدخل الرمز المرسل إلى الرقم ${phoneNumber}+`}
          </p>
        </div>

        {step === 'mobile' ? (
          <form onSubmit={handleSendOTP} className="otp-form animate-fade-in">
            <div className="phone-input-wrapper">
              <span className="country-code">+966</span>
              <input
                type="tel"
                placeholder={phoneNumber.startsWith('0') ? '05XXXXXXXX' : '5XXXXXXXX'}
                value={phoneNumber}
                onChange={(e) =>
                  setPhoneNumber(sanitizePhoneInput(e.target.value))
                }
                className="phone-input"
                maxLength={phoneNumber.startsWith('0') ? 10 : 9}
                required
                autoFocus
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="lg"
              className="otp-submit-btn"
              disabled={phoneNumber.length < 9}
            >
              إرسال رمز التحقق
            </Button>
          </form>
        ) : (
          <div className="otp-verify-wrapper animate-fade-in">
            <div className="otp-inputs">
              {otpRefs.map((ref, i) => (
                <input
                  key={i}
                  ref={ref}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  className="otp-digit-input"
                  onChange={(e) => handleOTPChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  autoFocus={i === 0}
                />
              ))}
            </div>

            <Button
              variant="primary"
              fullWidth
              size="lg"
              className="otp-submit-btn"
              onClick={() => console.log('Verify')}
            >
              تحقق
            </Button>

            <div className="otp-resend">
              {timer > 0 ? (
                <p>إعادة الإرسال خلال {timer} ثانية</p>
              ) : (
                <button onClick={() => setTimer(59)} className="resend-link">
                  إعادة إرسال الرمز
                </button>
              )}
            </div>

            <button
              className="change-number-btn"
              onClick={() => setStep('mobile')}
            >
              تغيير رقم الجوال
            </button>
          </div>
        )}

        <div className="otp-social-login">
          <div className="divider">
            <span>أو</span>
          </div>
          <div className="social-buttons">
            <button className="social-btn google">
              <img src="/google-icon.svg" alt="Google" />
              <span>Google</span>
            </button>
            <button className="social-btn apple">
              <img src="/apple-icon.svg" alt="Apple" />
              <span>Apple</span>
            </button>
          </div>
        </div>

        <p className="otp-footer">
          بالاستمرار ، أنت توافق على <a href="/terms">الشروط والأحكام</a> و{' '}
          <a href="/privacy">سياسة الخصوصية</a>
        </p>
      </div>
    </div>
  );
}
