import { useState, useEffect } from 'react';
import { useLocation } from 'react-router';

// ─── TYPES ──────────────────────────────────────────────────────────────────
interface NotificationPreference {
  id: string;
  labelEn: string;
  labelAr: string;
  descriptionEn: string;
  descriptionAr: string;
  icon: string;
  email: boolean;
  sms: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreference[] = [
  {
    id: 'order_confirmation',
    labelEn: 'Order Confirmation',
    labelAr: 'تأكيد الطلب',
    descriptionEn: 'Get notified when your order is confirmed',
    descriptionAr: 'يتم إعلامك عند تأكيد طلبك',
    icon: '📋',
    email: true,
    sms: true,
  },
  {
    id: 'order_shipped',
    labelEn: 'Order Shipped',
    labelAr: 'شحن الطلب',
    descriptionEn: 'Get notified when your order is out for delivery',
    descriptionAr: 'يتم إعلامك عند خروج طلبك للتوصيل',
    icon: '🚚',
    email: true,
    sms: true,
  },
  {
    id: 'order_delivered',
    labelEn: 'Order Delivered',
    labelAr: 'تسليم الطلب',
    descriptionEn: 'Get notified when your order is delivered',
    descriptionAr: 'يتم إعلامك عند تسليم طلبك',
    icon: '✅',
    email: true,
    sms: false,
  },
  {
    id: 'back_in_stock',
    labelEn: 'Back in Stock',
    labelAr: 'عودة المنتج للمخزون',
    descriptionEn: 'Get notified when a product you want is back in stock',
    descriptionAr: 'يتم إعلامك عند عودة منتج تريده للمخزون',
    icon: '🔔',
    email: true,
    sms: false,
  },
  {
    id: 'promotions',
    labelEn: 'Promotions & Offers',
    labelAr: 'العروض والتخفيضات',
    descriptionEn: 'Receive exclusive deals, seasonal offers, and discounts',
    descriptionAr: 'استلم عروض حصرية وتخفيضات موسمية',
    icon: '🎁',
    email: true,
    sms: false,
  },
  {
    id: 'new_arrivals',
    labelEn: 'New Arrivals',
    labelAr: 'وصول منتجات جديدة',
    descriptionEn: 'Be the first to know about new products',
    descriptionAr: 'كن أول من يعرف عن المنتجات الجديدة',
    icon: '✨',
    email: true,
    sms: false,
  },
];

// ─── TEMPLATE PREVIEWS ──────────────────────────────────────────────────────
const TEMPLATE_PREVIEWS: Record<string, { emailEn: string; emailAr: string; smsEn: string; smsAr: string }> = {
  order_confirmation: {
    emailEn: 'Subject: Your Order #12345 is Confirmed! 🎉\n\nHi Ahmad,\nThank you for your order! We\'re preparing your items with care.\n\nOrder: Mixed Baklava Large Box × 1\nTotal: 250.00 SAR',
    emailAr: 'الموضوع: تم تأكيد طلبك #12345! 🎉\n\nمرحباً أحمد،\nشكراً لطلبك! نحن نجهز طلبك بعناية.\n\nالطلب: علبة بقلاوة مشكلة كبيرة × 1\nالمجموع: 250.00 ر.س',
    smsEn: 'Saadeddin: Your order #12345 is confirmed! Total: 250.00 SAR. Track: track.saadeddin.com/12345',
    smsAr: 'سعد الدين: تم تأكيد طلبك #12345! المجموع: 250.00 ر.س. تتبع: track.saadeddin.com/12345',
  },
  order_shipped: {
    emailEn: 'Subject: Your Order is On Its Way! 🚚\n\nHi Ahmad,\nGreat news! Your order #12345 is out for delivery.\nExpected: Today, 6:00 PM - 8:00 PM',
    emailAr: 'الموضوع: طلبك في الطريق! 🚚\n\nمرحباً أحمد،\nأخبار رائعة! طلبك #12345 في طريقه إليك.\nالموعد المتوقع: اليوم، 6:00 م - 8:00 م',
    smsEn: 'Saadeddin: Your order #12345 is out for delivery! Expected: Today 6-8 PM. Track: track.saadeddin.com/12345',
    smsAr: 'سعد الدين: طلبك #12345 في طريقه إليك! الموعد: اليوم 6-8 م. تتبع: track.saadeddin.com/12345',
  },
  order_delivered: {
    emailEn: 'Subject: Your Order Has Been Delivered! ✅\n\nHi Ahmad,\nYour order #12345 has been delivered successfully.\nWe hope you enjoy it! Leave us a review.',
    emailAr: 'الموضوع: تم تسليم طلبك! ✅\n\nمرحباً أحمد،\nتم تسليم طلبك #12345 بنجاح.\nنأمل أن تستمتع به! شاركنا رأيك.',
    smsEn: 'Saadeddin: Your order #12345 has been delivered! Enjoy! 🎉',
    smsAr: 'سعد الدين: تم تسليم طلبك #12345 بنجاح! بالعافية! 🎉',
  },
  back_in_stock: {
    emailEn: 'Subject: Good News! Your Item is Back in Stock 🔔\n\nHi Ahmad,\nThe item you were interested in is now available!\n\nMixed Baklava Large Box - 150.00 SAR\nHurry, limited quantities available.',
    emailAr: 'الموضوع: خبر سار! المنتج عاد للمخزون 🔔\n\nمرحباً أحمد،\nالمنتج الذي كنت مهتماً به أصبح متوفراً الآن!\n\nعلبة بقلاوة مشكلة كبيرة - 150.00 ر.س\nأسرع، الكمية محدودة.',
    smsEn: 'Saadeddin: Mixed Baklava Large Box is back in stock! Shop now: saadeddin.com/products/baklava',
    smsAr: 'سعد الدين: علبة البقلاوة المشكلة عادت للمخزون! تسوق الآن: saadeddin.com/products/baklava',
  },
  promotions: {
    emailEn: 'Subject: Exclusive Offer Just for You! 🎁\n\nHi Ahmad,\nEnjoy 20% OFF all chocolate boxes this weekend!\nUse code: SWEET20 at checkout.',
    emailAr: 'الموضوع: عرض حصري لك! 🎁\n\nمرحباً أحمد،\nاستمتع بخصم 20% على جميع علب الشوكولاتة هذا الأسبوع!\nاستخدم كود: SWEET20 عند الدفع.',
    smsEn: 'Saadeddin: 20% OFF all chocolate boxes this weekend! Use code SWEET20. Shop: saadeddin.com',
    smsAr: 'سعد الدين: خصم 20% على كل علب الشوكولاتة! كود: SWEET20. تسوق: saadeddin.com',
  },
  new_arrivals: {
    emailEn: 'Subject: New Arrivals You\'ll Love! ✨\n\nHi Ahmad,\nCheck out our latest collection of premium chocolates and pastries.\nFreshly made, just for you.',
    emailAr: 'الموضوع: وصلنا الجديد! ✨\n\nمرحباً أحمد،\nاكتشف أحدث تشكيلتنا من الشوكولاتة والحلويات الفاخرة.\nطازجة، مصنوعة خصيصاً لك.',
    smsEn: 'Saadeddin: New arrivals are here! Premium chocolates & pastries just landed. Explore: saadeddin.com',
    smsAr: 'سعد الدين: وصلنا الجديد! شوكولاتة وحلويات فاخرة. اكتشف: saadeddin.com',
  },
};

// ─── STORAGE HELPERS ────────────────────────────────────────────────────────
const STORAGE_KEY = 'saadeddin_notification_preferences';

function loadPreferences(): NotificationPreference[] {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as Record<string, { email: boolean; sms: boolean }>;
      return DEFAULT_PREFERENCES.map((pref) => ({
        ...pref,
        email: parsed[pref.id]?.email ?? pref.email,
        sms: parsed[pref.id]?.sms ?? pref.sms,
      }));
    }
  } catch {}
  return DEFAULT_PREFERENCES;
}

function savePreferences(prefs: NotificationPreference[]) {
  if (typeof window === 'undefined') return;
  const map: Record<string, { email: boolean; sms: boolean }> = {};
  prefs.forEach((p) => { map[p.id] = { email: p.email, sms: p.sms }; });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

// ─── TOGGLE SWITCH COMPONENT ────────────────────────────────────────────────
function ToggleSwitch({ enabled, onChange, label }: { enabled: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      onClick={onChange}
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#234745] focus-visible:ring-offset-2 ${
        enabled ? 'bg-[#234745]' : 'bg-gray-200'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition-transform duration-300 ease-in-out ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────
export default function NotificationPreferences() {
  const location = useLocation();
  const isEn = location.pathname.includes('/en/') || location.pathname.includes('/en');
  const [preferences, setPreferences] = useState<NotificationPreference[]>(DEFAULT_PREFERENCES);
  const [saved, setSaved] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewChannel, setPreviewChannel] = useState<'email' | 'sms'>('email');

  useEffect(() => {
    setPreferences(loadPreferences());
  }, []);

  const togglePref = (id: string, channel: 'email' | 'sms') => {
    setPreferences((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, [channel]: !p[channel] } : p
      )
    );
    setSaved(false);
  };

  const handleSave = () => {
    savePreferences(preferences);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const enableAll = (channel: 'email' | 'sms') => {
    setPreferences((prev) => prev.map((p) => ({ ...p, [channel]: true })));
    setSaved(false);
  };

  const disableAll = (channel: 'email' | 'sms') => {
    setPreferences((prev) => prev.map((p) => ({ ...p, [channel]: false })));
    setSaved(false);
  };

  const activePreview = previewId ? TEMPLATE_PREVIEWS[previewId] : null;

  return (
    <div dir={isEn ? 'ltr' : 'rtl'} className={isEn ? 'font-en' : 'font-ar'}>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-[#234745] mb-2">
          {isEn ? 'Notification Preferences' : 'إعدادات الإشعارات'}
        </h1>
        <p className="text-gray-500 text-sm font-medium">
          {isEn
            ? 'Control how and when you receive notifications from us'
            : 'تحكم في كيفية ووقت استلام الإشعارات منا'}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-2xl px-4 py-2.5 shadow-sm">
          <span className="text-sm font-bold text-gray-500">{isEn ? 'Email:' : 'البريد:'}</span>
          <button
            onClick={() => enableAll('email')}
            className="text-[11px] font-bold text-[#234745] bg-[#234745]/5 hover:bg-[#234745]/10 px-3 py-1 rounded-lg transition-colors"
          >
            {isEn ? 'Enable All' : 'تفعيل الكل'}
          </button>
          <button
            onClick={() => disableAll('email')}
            className="text-[11px] font-bold text-red-500 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-lg transition-colors"
          >
            {isEn ? 'Disable All' : 'إيقاف الكل'}
          </button>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-2xl px-4 py-2.5 shadow-sm">
          <span className="text-sm font-bold text-gray-500">{isEn ? 'SMS:' : 'الرسائل:'}</span>
          <button
            onClick={() => enableAll('sms')}
            className="text-[11px] font-bold text-[#234745] bg-[#234745]/5 hover:bg-[#234745]/10 px-3 py-1 rounded-lg transition-colors"
          >
            {isEn ? 'Enable All' : 'تفعيل الكل'}
          </button>
          <button
            onClick={() => disableAll('sms')}
            className="text-[11px] font-bold text-red-500 bg-red-50 hover:bg-red-100 px-3 py-1 rounded-lg transition-colors"
          >
            {isEn ? 'Disable All' : 'إيقاف الكل'}
          </button>
        </div>
      </div>

      {/* Preferences Table */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden mb-8">
        {/* Header */}
        <div className="grid grid-cols-[1fr_80px_80px_80px] md:grid-cols-[1fr_100px_100px_100px] items-center px-6 py-4 bg-gray-50/80 border-b border-gray-100">
          <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider">
            {isEn ? 'Notification Type' : 'نوع الإشعار'}
          </span>
          <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider text-center">
            {isEn ? 'Email' : 'البريد'}
          </span>
          <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider text-center">
            {isEn ? 'SMS' : 'رسالة'}
          </span>
          <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider text-center">
            {isEn ? 'Preview' : 'معاينة'}
          </span>
        </div>

        {/* Rows */}
        {preferences.map((pref, idx) => (
          <div
            key={pref.id}
            className={`grid grid-cols-[1fr_80px_80px_80px] md:grid-cols-[1fr_100px_100px_100px] items-center px-6 py-5 transition-colors hover:bg-[#fdfaf6] ${
              idx < preferences.length - 1 ? 'border-b border-gray-50' : ''
            }`}
          >
            {/* Label & Description */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#f5f3f1] border border-[#e8e4e1] flex items-center justify-center text-lg shrink-0">
                {pref.icon}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-[#234745] truncate">
                  {isEn ? pref.labelEn : pref.labelAr}
                </p>
                <p className="text-[11px] text-gray-400 font-medium truncate hidden md:block">
                  {isEn ? pref.descriptionEn : pref.descriptionAr}
                </p>
              </div>
            </div>

            {/* Email Toggle */}
            <div className="flex justify-center">
              <ToggleSwitch
                enabled={pref.email}
                onChange={() => togglePref(pref.id, 'email')}
                label={`${isEn ? pref.labelEn : pref.labelAr} email`}
              />
            </div>

            {/* SMS Toggle */}
            <div className="flex justify-center">
              <ToggleSwitch
                enabled={pref.sms}
                onChange={() => togglePref(pref.id, 'sms')}
                label={`${isEn ? pref.labelEn : pref.labelAr} SMS`}
              />
            </div>

            {/* Preview Button */}
            <div className="flex justify-center">
              <button
                onClick={() => {
                  setPreviewId(previewId === pref.id ? null : pref.id);
                  setPreviewChannel('email');
                }}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                  previewId === pref.id
                    ? 'bg-[#234745] text-white shadow-md'
                    : 'bg-gray-50 text-gray-400 hover:bg-[#234745]/10 hover:text-[#234745]'
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Template Preview Panel */}
      {previewId && activePreview && (
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden mb-8 animate-fade-in">
          <div className="px-6 py-4 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-black text-[#234745]">
                {isEn ? 'Template Preview' : 'معاينة القالب'}
              </span>
              <span className="text-[11px] font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg">
                {isEn
                  ? preferences.find((p) => p.id === previewId)?.labelEn
                  : preferences.find((p) => p.id === previewId)?.labelAr}
              </span>
            </div>
            <div className="flex items-center bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setPreviewChannel('email')}
                className={`px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                  previewChannel === 'email'
                    ? 'bg-white text-[#234745] shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {isEn ? 'Email' : 'بريد'}
              </button>
              <button
                onClick={() => setPreviewChannel('sms')}
                className={`px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                  previewChannel === 'sms'
                    ? 'bg-white text-[#234745] shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                SMS
              </button>
            </div>
          </div>

          <div className="p-6">
            {previewChannel === 'email' ? (
              <div className="bg-[#fdfaf6] rounded-2xl border border-[#f0ece8] p-6">
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-[#f0ece8]">
                  <div className="w-8 h-8 rounded-full bg-[#234745] flex items-center justify-center text-white text-[10px] font-bold shrink-0">SD</div>
                  <div>
                    <p className="text-[11px] font-bold text-[#234745]">Saadeddin Pastry</p>
                    <p className="text-[10px] text-gray-400">noreply@saadeddin.com</p>
                  </div>
                </div>
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed" dir={isEn ? 'ltr' : 'rtl'}>
                  {isEn ? activePreview.emailEn : activePreview.emailAr}
                </pre>
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="w-[280px]">
                  <div className="bg-[#f2f2f7] rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-full bg-[#234745] flex items-center justify-center text-white text-[8px] font-bold">SD</div>
                      <span className="text-[11px] font-bold text-gray-600">Saadeddin</span>
                      <span className="text-[10px] text-gray-400 ms-auto">{isEn ? 'now' : 'الآن'}</span>
                    </div>
                    <div className="bg-white rounded-2xl px-4 py-3 shadow-sm">
                      <p className="text-[13px] text-gray-800 leading-relaxed" dir={isEn ? 'ltr' : 'rtl'}>
                        {isEn ? activePreview.smsEn : activePreview.smsAr}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          className={`px-10 py-3.5 rounded-2xl font-black text-sm shadow-md transition-all duration-300 ${
            saved
              ? 'bg-green-500 text-white shadow-green-200 scale-[1.02]'
              : 'bg-[#234745] text-white hover:bg-[#2d5e4a] hover:-translate-y-0.5 hover:shadow-lg active:scale-95'
          }`}
        >
          {saved
            ? (isEn ? '✓ Saved Successfully' : '✓ تم الحفظ بنجاح')
            : (isEn ? 'Save Preferences' : 'حفظ الإعدادات')}
        </button>

        {saved && (
          <span className="text-sm font-medium text-green-600 animate-fade-in">
            {isEn ? 'Your notification preferences have been updated' : 'تم تحديث إعدادات الإشعارات'}
          </span>
        )}
      </div>

      {/* Info Note */}
      <div className="mt-8 p-5 bg-[#fdfaf6] rounded-2xl border border-[#f0ece8]">
        <div className="flex items-start gap-3">
          <span className="text-lg shrink-0">ℹ️</span>
          <div>
            <p className="text-sm font-bold text-[#234745] mb-1">
              {isEn ? 'About Notifications' : 'حول الإشعارات'}
            </p>
            <p className="text-[12px] text-gray-500 leading-relaxed">
              {isEn
                ? 'You can customize which notifications you receive and how. Email notifications include detailed information with images, while SMS notifications are brief text messages. You can change these settings at any time.'
                : 'يمكنك تخصيص الإشعارات التي تستلمها وطريقة استلامها. إشعارات البريد الإلكتروني تتضمن معلومات تفصيلية مع صور، بينما الرسائل النصية تكون موجزة. يمكنك تغيير هذه الإعدادات في أي وقت.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
