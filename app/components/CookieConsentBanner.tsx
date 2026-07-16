import { useEffect, useState } from 'react';
import { Link } from 'react-router';

const CONSENT_KEY = 'saadeddin_cookie_consent';

export type ConsentChoice = 'accepted' | 'rejected' | null;

/** Read the stored consent choice from localStorage (client only) */
export function getStoredConsent(): ConsentChoice {
  if (typeof window === 'undefined') return null;
  return (localStorage.getItem(CONSENT_KEY) as ConsentChoice) || null;
}

/** Push GA4 Consent Mode update via gtag / dataLayer */
function updateGa4Consent(granted: boolean) {
  const state = granted ? 'granted' : 'denied';
  // GA4 Consent Mode v2
  if (typeof window !== 'undefined') {
    const w = window as any;
    w.dataLayer = w.dataLayer || [];
    // gtag consent update
    w.dataLayer.push({
      event: 'consent_update',
      ad_storage: state,
      analytics_storage: state,
      ad_user_data: state,
      ad_personalization: state,
      functionality_storage: 'granted', // always allowed (language/cart)
      security_storage: 'granted',      // always allowed
    });
    // also call gtag() if available
    if (typeof w.gtag === 'function') {
      w.gtag('consent', 'update', {
        ad_storage: state,
        analytics_storage: state,
        ad_user_data: state,
        ad_personalization: state,
      });
    }
  }
}

interface CookieConsentBannerProps {
  locale: string; // 'en' | 'ar'
}

export function CookieConsentBanner({ locale }: CookieConsentBannerProps) {
  const isEn = locale === 'en';
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = getStoredConsent();
    if (!stored) {
      // Small delay so banner slides in after initial paint
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
    // Restore previous consent on mount
    updateGa4Consent(stored === 'accepted');
  }, []);

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    updateGa4Consent(true);
    setVisible(false);
  };

  const handleReject = () => {
    localStorage.setItem(CONSENT_KEY, 'rejected');
    updateGa4Consent(false);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      dir={isEn ? 'ltr' : 'rtl'}
      role="dialog"
      aria-live="polite"
      aria-label={isEn ? 'Cookie consent' : 'موافقة ملفات تعريف الارتباط'}
      style={{
        position: 'fixed',
        bottom: '24px',
        [isEn ? 'left' : 'right']: '24px',
        zIndex: 9999,
        maxWidth: '420px',
        width: 'calc(100vw - 48px)',
        animation: 'cookieBannerSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
      }}
    >
      <style>{`
        @keyframes cookieBannerSlideIn {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>

      <div
        style={{
          background: '#1F413F',
          borderRadius: '24px',
          padding: '24px',
          boxShadow: '0 20px 60px rgba(31,65,63,0.35)',
          color: '#fff',
          fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
        }}
      >
        {/* Icon + heading */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <span style={{ fontSize: '28px', lineHeight: 1 }}>🍪</span>
          <h2
            style={{
              margin: 0,
              fontSize: '17px',
              fontWeight: 700,
              color: '#fff',
              fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif",
            }}
          >
            {isEn ? 'We use cookies' : 'نستخدم ملفات تعريف الارتباط'}
          </h2>
        </div>

        {/* Body text */}
        <p
          style={{
            margin: '0 0 20px',
            fontSize: '13.5px',
            lineHeight: 1.65,
            color: 'rgba(255,255,255,0.8)',
          }}
        >
          {isEn
            ? 'We use cookies to enhance your browsing experience, personalize content, and analyze site traffic. You can accept all cookies or choose to decline non-essential ones.'
            : 'نستخدم ملفات تعريف الارتباط لتحسين تجربتك، وتخصيص المحتوى، وتحليل حركة الموقع. يمكنك قبول جميع ملفات تعريف الارتباط أو رفض غير الضرورية منها.'}
          {' '}
          <Link
            to={isEn ? '/en/pages/terms' : '/pages/terms'}
            style={{ color: '#d4a06a', textDecoration: 'underline', whiteSpace: 'nowrap' }}
          >
            {isEn ? 'Terms and Conditions' : 'الشروط والأحكام'}
          </Link>
        </p>

        {/* Action buttons */}
        <div
          style={{
            display: 'flex',
            gap: '10px',
            flexDirection: isEn ? 'row' : 'row-reverse',
          }}
        >
          <button
            id="cookie-accept-btn"
            onClick={handleAccept}
            style={{
              flex: 1,
              background: '#d4a06a',
              color: '#1F413F',
              border: 'none',
              borderRadius: '50px',
              padding: '11px 20px',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'opacity 0.2s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.opacity = '0.88')}
            onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
          >
            {isEn ? 'Accept All' : 'قبول الكل'}
          </button>

          <button
            id="cookie-reject-btn"
            onClick={handleReject}
            style={{
              flex: 1,
              background: 'transparent',
              color: 'rgba(255,255,255,0.75)',
              border: '1.5px solid rgba(255,255,255,0.3)',
              borderRadius: '50px',
              padding: '11px 20px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'border-color 0.2s, color 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.7)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
              e.currentTarget.style.color = 'rgba(255,255,255,0.75)';
            }}
          >
            {isEn ? 'Decline' : 'رفض'}
          </button>
        </div>
      </div>
    </div>
  );
}
