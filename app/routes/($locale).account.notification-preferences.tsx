import { useState, useEffect } from 'react';
import { useLocation } from 'react-router';

// ─── TYPES ──────────────────────────────────────────────────────────────────
interface NotificationPreferencesState {
  order_confirmation: boolean;
  order_preparing: boolean;
  order_on_the_way: boolean;
  order_delivered: boolean;
  exclusive_offers: boolean;
  seasonal_launches: boolean;
  price_drops: boolean;
  channel_sms: boolean;
  channel_whatsapp: boolean;
  channel_email: boolean;
  channel_app: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferencesState = {
  order_confirmation: true,
  order_preparing: true,
  order_on_the_way: true,
  order_delivered: true,
  exclusive_offers: true,
  seasonal_launches: false,
  price_drops: true,
  channel_sms: false,
  channel_whatsapp: false,
  channel_email: true,
  channel_app: true,
};

// ─── STORAGE HELPERS ────────────────────────────────────────────────────────
const STORAGE_KEY = 'saadeddin_notification_preferences_v2';

function loadPreferences(): NotificationPreferencesState {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) };
    }
  } catch {}
  return DEFAULT_PREFERENCES;
}

function savePreferences(prefs: NotificationPreferencesState) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

// ─── TOGGLE SWITCH COMPONENT ────────────────────────────────────────────────
function ToggleSwitch({ enabled, onChange, isEn }: { enabled: boolean; onChange: () => void; isEn: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none ${
        enabled ? 'bg-[#234745]' : 'bg-[#BBCFCD]'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform duration-300 ease-in-out ${
          enabled ? (isEn ? 'translate-x-5' : '-translate-x-5') : 'translate-x-0'
        }`}
      />
    </button>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────
export default function NotificationPreferences() {
  const location = useLocation();
  const isEn = location.pathname.includes('/en/') || location.pathname.includes('/en');
  const [preferences, setPreferences] = useState<NotificationPreferencesState>(DEFAULT_PREFERENCES);

  useEffect(() => {
    setPreferences(loadPreferences());
  }, []);

  const togglePref = (key: keyof NotificationPreferencesState) => {
    const newPrefs = { ...preferences, [key]: !preferences[key] };
    setPreferences(newPrefs);
    savePreferences(newPrefs);
  };

  const renderRow = (
    key: keyof NotificationPreferencesState,
    titleEn: string,
    titleAr: string,
    descEn?: string,
    descAr?: string
  ) => (
    <div className="flex justify-between items-center py-4 w-full border-b border-[#E2E8E6] last:border-b-0">
      <div className="flex flex-col items-start text-start" style={{ textAlign: isEn ? 'left' : 'right' }}>
        <span className="text-[14px] font-bold text-[#171717] leading-tight" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
          {isEn ? titleEn : titleAr}
        </span>
        {descAr && descEn && (
          <span className="text-[12px] font-medium text-[#9FB7AE] mt-1" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
            {isEn ? descEn : descAr}
          </span>
        )}
      </div>
      <div className="flex items-center">
        <ToggleSwitch enabled={preferences[key]} onChange={() => togglePref(key)} isEn={isEn} />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center w-full max-w-[955px] mx-auto animate-fade-in" dir={isEn ? 'ltr' : 'rtl'}>
      <div className="bg-white border border-[#9FB7AE] rounded-[12px] p-8 flex flex-col w-full box-border">
        
        {/* Header Section */}
        <div className="w-full flex justify-start pb-4 border-b border-[#E2E8E6]">
          <h3 className="text-[18px] font-bold text-[#171717] m-0 leading-none" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
            {isEn ? 'Notification Preferences' : 'تفضيلات الإشعارات'}
          </h3>
        </div>

        {/* Orders Group */}
        <div className="flex flex-col w-full">
          {renderRow('order_confirmation', 'Order Confirmation', 'تأكيد الطلب', 'When your order is confirmed', 'عند تأكيد طلبك')}
          {renderRow('order_preparing', 'Preparing', 'جاري التجهيز', 'When our team starts preparing your order', 'عندما يبدأ فريقنا في تجهيز طلبك')}
          {renderRow('order_on_the_way', 'On the Way', 'في الطريق إليك', 'When your order leaves the store', 'عندما يغادر طلبك المتجر')}
          {renderRow('order_delivered', 'Delivered', 'تم التسليم', 'When you receive your order', 'عند استلام طلبك')}
        </div>

        {/* Marketing Group Header */}
        <div className="w-full flex justify-start mt-4 pb-2 border-b border-[#E2E8E6]">
          <span className="text-[12px] font-bold text-[#8C6D62]" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
            {isEn ? 'Offers & Marketing' : 'العروض والتسويق'}
          </span>
        </div>

        {/* Marketing Group */}
        <div className="flex flex-col w-full">
          {renderRow('exclusive_offers', 'Exclusive Offers', 'العروض الحصرية', 'Customized discounts and offers for you', 'خصومات وعروض مخصصة لك')}
          {renderRow('seasonal_launches', 'Seasonal Launches', 'إطلاقات موسمية', 'Ramadan, Eid collections, and more', 'تشكيلات رمضان والعيد وغيرها')}
          {renderRow('price_drops', 'Price Drops', 'انخفاض السعر', 'When a product in your wishlist drops in price', 'عند تخفيض سعر منتج في مفضلتك')}
        </div>

        {/* Channels Group Header */}
        <div className="w-full flex justify-start mt-4 pb-2 border-b border-[#E2E8E6]">
          <span className="text-[12px] font-bold text-[#8C6D62]" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
            {isEn ? 'Channels' : 'القنوات'}
          </span>
        </div>

        {/* Channels Group */}
        <div className="flex flex-col w-full">
          {renderRow('channel_sms', 'SMS', 'رسائل SMS')}
          {renderRow('channel_whatsapp', 'WhatsApp', 'WhatsApp')}
          {renderRow('channel_email', 'Email', 'البريد الإلكتروني')}
          {renderRow('channel_app', 'App Notifications', 'إشعارات التطبيق')}
        </div>
        
      </div>
    </div>
  );
}
