import { useState, useEffect } from 'react';
import { useFetcher } from 'react-router';
import { CartForm } from '@shopify/hydrogen';
import { useAside } from '~/components/Aside';
import { SaudiRiyalSymbol } from '~/components/Price';

export interface GiftVoucherWizardProps {
  initialMode?: 'gift' | 'self';
  customerName?: string;
  customerEmail?: string;
  isLoggedIn?: boolean;
  giftProduct?: any;
  voucherHistory?: Array<{
    id: string;
    code: string;
    description: string;
    value: string;
    date: string;
    status: string;
    statusLabel: string;
    statusColor: string;
  }>;
  isEn?: boolean;
  onBackToOptions?: () => void;
}

const GIFT_CARD_VARIANTS: Record<number, string> = {
  50: 'gid://shopify/ProductVariant/51652828496105',
  100: 'gid://shopify/ProductVariant/51652828528873',
  200: 'gid://shopify/ProductVariant/51652828561641',
  500: 'gid://shopify/ProductVariant/51652828594409',
  1000: 'gid://shopify/ProductVariant/51652828627177',
};

function getVariantForAmount(amount: number, liveVariants?: any[]): string {
  if (liveVariants && liveVariants.length > 0) {
    const exact = liveVariants.find((v) => parseFloat(v.price?.amount || '0') === amount);
    if (exact) return exact.id;
    const sorted = [...liveVariants].sort(
      (a, b) => parseFloat(a.price?.amount || '0') - parseFloat(b.price?.amount || '0'),
    );
    const closest = sorted.find((v) => parseFloat(v.price?.amount || '0') >= amount) || sorted[sorted.length - 1];
    if (closest) return closest.id;
  }

  if (GIFT_CARD_VARIANTS[amount]) return GIFT_CARD_VARIANTS[amount];
  if (amount <= 50) return GIFT_CARD_VARIANTS[50];
  if (amount <= 100) return GIFT_CARD_VARIANTS[100];
  if (amount <= 200) return GIFT_CARD_VARIANTS[200];
  if (amount <= 500) return GIFT_CARD_VARIANTS[500];
  return GIFT_CARD_VARIANTS[1000];
}

export function GiftVoucherWizard({
  initialMode = 'gift',
  customerName = '',
  customerEmail = '',
  isLoggedIn = false,
  giftProduct,
  voucherHistory = [],
  isEn = false,
  onBackToOptions,
}: GiftVoucherWizardProps) {
  const cartFetcher = useFetcher<any>();
  const { open } = useAside();

  // Gift Mode: 'gift' = Gift to someone, 'self' = Buy for myself
  const [giftMode, setGiftMode] = useState<'gift' | 'self'>(initialMode);

  // Wizard Step: 1=Amount+Design, 2=Message+Recipient, 3=Review, 4=Success
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Amount State (5 fixed voucher amounts: 50, 100, 200, 500, 1000)
  const [selectedAmount, setSelectedAmount] = useState<number>(200);

  // Design State
  const occasionList = isEn
    ? [
        { id: 'Birthday', label: 'Birthday' },
        { id: 'Wedding', label: 'Wedding' },
        { id: 'Eid', label: 'Eid' },
        { id: 'Graduation', label: 'Graduation' },
        { id: 'Thank You', label: 'Thank You' },
      ]
    : [
        { id: 'عيد ميلاد', label: 'عيد ميلاد' },
        { id: 'زفاف', label: 'زفاف' },
        { id: 'العيد', label: 'العيد' },
        { id: 'تخرج', label: 'تخرج' },
        { id: 'شكراً', label: 'شكراً' },
      ];

  const [occasion, setOccasion] = useState(isEn ? 'Birthday' : 'عيد ميلاد');
  const [themeColor, setThemeColor] = useState<'green' | 'gold' | 'cream'>('green');

  // Recipient / Sender Message Form State
  const [senderName, setSenderName] = useState(customerName || '');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [personalMessage, setPersonalMessage] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Validation errors
  const [amountError, setAmountError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [cartError, setCartError] = useState('');

  const isSubmitting = cartFetcher.state !== 'idle';

  // Sync sender name when customerName loads
  useEffect(() => {
    if (customerName) setSenderName(customerName);
  }, [customerName]);

  // Listen to cart submission response
  useEffect(() => {
    if (cartFetcher.state === 'idle' && cartFetcher.data) {
      const hasErrors =
        Boolean(cartFetcher.data.error) ||
        (Array.isArray(cartFetcher.data.errors) && cartFetcher.data.errors.length > 0) ||
        (Array.isArray(cartFetcher.data.userErrors) && cartFetcher.data.userErrors.length > 0);

      if (hasErrors) {
        setCartError(
          cartFetcher.data.error ||
            cartFetcher.data.errors?.[0]?.message ||
            (isEn
              ? 'Failed to add gift card to cart. Please try again.'
              : 'فشل في إضافة القسيمة إلى السلة. يرجى المحاولة مرة أخرى.'),
        );
      } else {
        setCartError('');
        setCurrentStep(4);
        open('cart');
      }
    }
  }, [cartFetcher.state, cartFetcher.data, isEn, open]);

  const finalAmount = selectedAmount;
  const vatAmount = finalAmount * 0.15;
  const totalAmount = finalAmount + vatAmount;

  const quickMessages = isEn
    ? [
        'Happy Birthday',
        'Congratulations',
        'With Sincere Thanks',
        'Eid Mubarak',
      ]
    : [
        'كل عام وانت بخير',
        'مبروك',
        'شكراً من القلب',
        'بمناسبة العيد السعيد',
      ];

  // ── Validation helpers ────────────────────────────────────────────────────
  const validateStep1 = (): boolean => {
    setAmountError('');
    return true;
  };

  const validateStep2 = (): boolean => {
    if (giftMode === 'gift') {
      if (!recipientEmail.trim()) {
        setEmailError(isEn
          ? 'Please enter recipient email.'
          : 'يرجى إدخال البريد الإلكتروني للمستلم.');
        return false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail.trim())) {
        setEmailError(isEn ? 'Please enter a valid email address.' : 'يرجى إدخال بريد إلكتروني صحيح.');
        return false;
      }
    }
    setEmailError('');
    return true;
  };

  const handleCheckoutSubmit = () => {
    if (!agreeTerms) return;
    setCartError('');

    try {
      const liveVariants = giftProduct?.variants?.nodes;
      const merchandiseId = getVariantForAmount(finalAmount, liveVariants);
      const targetRecipientName = giftMode === 'self' ? (senderName || 'نفسي') : recipientName;
      const targetRecipientEmail = giftMode === 'self' ? (customerEmail || recipientEmail || 'N/A') : (recipientEmail || 'N/A');

      const selectedVariantObj = {
        id: merchandiseId,
        title: `${finalAmount} SAR`,
        price: {
          amount: String(finalAmount),
          currencyCode: 'SAR',
        },
        product: {
          title: isEn ? 'Saadeddin Gift Card' : 'بطاقة هدية سعد الدين',
          handle: 'saadeddin-gift-card',
        },
      };

      const colorOptionConfig: Record<'cream' | 'gold' | 'green', { name: string; color: string; hex: string }> = {
        cream: {
          name: 'cream',
          color: 'Cream/White',
          hex: '#FAF6EC',
        },
        gold: {
          name: 'gold',
          color: 'Gold/Brown',
          hex: '#C9A96E',
        },
        green: {
          name: 'green',
          color: 'Dark Green',
          hex: '#2C4A45',
        },
      };

      const selectedColor = colorOptionConfig[themeColor] || colorOptionConfig.green;

      const formData = new FormData();
      const lineItem = {
        action: CartForm.ACTIONS.LinesAdd,
        inputs: {
          lines: [
            {
              merchandiseId,
              quantity: 1,
              selectedVariant: selectedVariantObj,
              attributes: [
                { key: '_gift_voucher', value: 'true' },
                { key: 'Gift Mode', value: giftMode === 'self' ? 'For Myself' : 'Gift to Someone' },
                { key: 'Voucher Amount', value: `${finalAmount} SAR` },
                { key: 'Card Color', value: selectedColor.color },
                { key: 'Card Color Name', value: selectedColor.name },
                { key: 'Card Color Hex', value: selectedColor.hex },
                { key: '_card_color', value: selectedColor.hex },
                { key: '_card_theme', value: selectedColor.name },
                { key: 'Recipient Name', value: targetRecipientName },
                { key: 'Recipient Email', value: targetRecipientEmail },
                { key: 'Sender Name', value: senderName || 'N/A' },
                { key: 'Personal Message', value: personalMessage || 'N/A' },
                { key: 'Occasion', value: occasion },
                ...(isScheduled && scheduledDate ? [{ key: 'Scheduled Date', value: scheduledDate }] : []),
              ],
            },
          ],
        },
      };

      formData.append('cartFormInput', JSON.stringify(lineItem));

      const cartEndpoint = isEn ? '/en/cart' : '/cart';
      cartFetcher.submit(formData, {
        method: 'POST',
        action: cartEndpoint,
      });
    } catch (err) {
      console.error('Error submitting gift card to cart:', err);
    }
  };

  return (
    <div className="gift-wizard-embedded w-full max-w-[1400px] mx-auto">
      {/* ─── CONDITIONAL LAYOUT: "إشترِ لنفسك" (2-STEP CARD) vs "أهدِ قسيمة" (4-STEP LIVE PREVIEW) ─── */}
      {giftMode === 'self' ? (
        <div className="w-full bg-[#FEF8EB] rounded-[32px] p-6 sm:p-12 border border-[#BBCFCD]/40 shadow-xs" dir={isEn ? 'ltr' : 'rtl'}>
          {onBackToOptions && (
            <div className="flex items-center justify-start mb-6">
              <button
                type="button"
                onClick={onBackToOptions}
                className="px-4 py-1.5 text-[13px] font-bold text-[#234745] hover:bg-[#234745]/10 rounded-full transition-all border border-[#234745]/30 flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>{isEn ? '←' : '→'}</span>
                <span>{isEn ? 'Back to options' : 'الرجوع للاختيارات'}</span>
              </button>
            </div>
          )}

          {/* Header */}
          <div className="text-center mb-6">
            <h2
              className="text-[#171717] font-bold text-[34px] sm:text-[44px] leading-tight mb-1 text-center"
              style={{ fontFamily: "'Bahij Janna', sans-serif" }}
            >
              {isEn ? 'Buy for Yourself' : 'إشترِ لنفسك'}
            </h2>
            <p
              className="text-[#7D7D7D] text-[15px] font-medium text-center"
              style={{ fontFamily: "'GE Dinar One', sans-serif" }}
            >
              {isEn ? 'Buy a voucher for yourself' : 'إشتري قسيمة لنفسك'}
            </p>
          </div>

          {/* 2-Step Progress Bar (Matches Screenshot) */}
          <div className="flex items-center justify-center gap-4 mb-10 max-w-[360px] mx-auto" dir={isEn ? 'ltr' : 'rtl'}>
            {/* Step 1: إختر القيمة */}
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-[15px] font-bold ${
                  currentStep >= 1 ? 'bg-[#234745] text-white' : 'border-2 border-[#BBCFCD] text-[#7D7D7D] bg-white'
                }`}
                style={{ fontFamily: 'Arial, sans-serif' }}
              >
                1
              </div>
              <span className="text-[14.5px] font-bold text-[#234745]">
                {isEn ? 'Choose Amount' : 'إختر القيمة'}
              </span>
            </div>

            <div className="w-16 h-[2px] bg-[#C5A96A]" />

            {/* Step 2: الدفع */}
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-[15px] font-bold ${
                  currentStep >= 2 ? 'bg-[#234745] text-white' : 'border-2 border-[#BBCFCD] text-[#7D7D7D] bg-white'
                }`}
                style={{ fontFamily: 'Arial, sans-serif' }}
              >
                2
              </div>
              <span className={`text-[14.5px] font-bold ${currentStep >= 2 ? 'text-[#234745]' : 'text-[#7D7D7D]'}`}>
                {isEn ? 'Payment' : 'الدفع'}
              </span>
            </div>
          </div>

          {/* Step 1 Content (Choose Amount) */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* Title */}
              <div>
                <h3 className={`text-[16px] font-bold text-[#171717] mb-3 ${isEn ? 'text-left' : 'text-right'}`} style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                  {isEn ? '1. Choose Voucher Amount' : '1- أختر قيمة القسيمة ؟'}
                </h3>

                {/* 5 Preset Amounts in a Single Row */}
                <div className="grid grid-cols-5 gap-2 sm:gap-3 w-full">
                  {[50, 100, 200, 500, 1000].map((amt) => {
                    const isSelected = selectedAmount === amt;
                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setSelectedAmount(amt)}
                        className={`relative h-[52px] rounded-[16px] font-bold text-[14px] sm:text-[15px] cursor-pointer transition-all flex items-center justify-center shadow-xs border ${
                          isSelected
                            ? 'bg-[#EED5D780] border-[#234745] text-[#171717]'
                            : 'bg-white border-[#BBCFCD] hover:border-[#234745] text-[#171717]'
                        }`}
                      >
                        {isSelected && (
                          <span className={`absolute top-1.5 ${isEn ? 'left-2' : 'right-2'} w-4 h-4 rounded-full bg-[#234745] text-white flex items-center justify-center text-[10px]`}>
                            <svg width="8" height="7" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </span>
                        )}
                        <span className={`flex items-center gap-1.5 ${isEn ? 'flex-row' : 'flex-row-reverse'}`}>
                          <SaudiRiyalSymbol className="h-3.5 w-auto fill-current" />
                          <span className="font-en notranslate">{amt}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Balance Box: سيتم اضافة الي رصيدك */}
              <div className="rounded-[16px] border border-[#BBCFCD] bg-white p-4 sm:p-5 flex items-center justify-between">
                <span className="text-[#7D7D7D] font-bold text-[15px]" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                  {isEn ? 'Will be added to your balance' : 'سيتم اضافة الي رصيدك'}
                </span>
                <span className={`text-[#171717] font-bold text-[17px] sm:text-[19px] font-en notranslate flex items-center gap-1.5 ${isEn ? 'flex-row' : 'flex-row-reverse'}`}>
                  <SaudiRiyalSymbol className="h-4.5 w-auto fill-current" />
                  <span>{finalAmount.toFixed(2)}</span>
                </span>
              </div>

              {/* Bottom Button: التالي: الدفع */}
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="w-full h-[52px] rounded-[16px] bg-[#234745] hover:bg-[#1A3533] text-white font-bold text-[16px] flex items-center justify-center transition-all cursor-pointer shadow-md border-none"
                style={{ fontFamily: "'GE Dinar One', sans-serif" }}
              >
                {isEn ? 'Next: Payment' : 'التالي: الدفع'}
              </button>
            </div>
          )}

          {/* Step 2 Content for "إشترِ لنفسك" (Confirmation & Checkout) */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h3 className={`text-[18px] font-bold text-[#234745] mb-4 ${isEn ? 'text-left' : 'text-right'}`} style={{ fontFamily: "'Bahij Janna', sans-serif" }}>
                {isEn ? '2. Confirm & Add to Cart' : '2- تأكيد القسيمة وإضافتها للسلة'}
              </h3>

              <div className={`rounded-[16px] border border-[#234745]/30 bg-[#f0f7f5] p-4 ${isEn ? 'text-left' : 'text-right'}`}>
                <p className="text-[13.5px] text-[#234745] font-medium m-0">
                  {isEn
                    ? 'Your personal digital voucher will be added directly to your Cart and credited to your balance upon checkout.'
                    : 'سيتم إضافة قسيمتك الرقمية مباشرة إلى سلة التسوق وشحنها في رصيدك فور إتمام الدفع.'}
                </p>
              </div>

              <div className={`rounded-[16px] border border-[#BBCFCD] bg-white p-4 sm:p-5 space-y-3 ${isEn ? 'text-left' : 'text-right'}`}>
                <div className="flex items-center justify-between text-[14.5px]">
                  <span className="text-[#7D7D7D] font-medium">{isEn ? 'Voucher Value' : 'قيمة القسيمة'}</span>
                  <span className={`font-bold text-[#171717] flex items-center gap-1.5 ${isEn ? 'flex-row' : 'flex-row-reverse'}`}>
                    <SaudiRiyalSymbol className="h-3.5 w-auto fill-current" />
                    <span className="font-en notranslate">{finalAmount.toFixed(2)}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-[14.5px]">
                  <span className="text-[#7D7D7D] font-medium">{isEn ? 'Recipient' : 'المستلم'}</span>
                  <span className="font-bold text-[#171717]">{customerName || (isEn ? 'Myself' : 'نفسي')}</span>
                </div>
                <div className="flex items-center justify-between text-[14.5px]">
                  <span className="text-[#7D7D7D] font-medium">{isEn ? 'Delivery Method' : 'طريقة الاستلام'}</span>
                  <span className="font-bold text-[#171717]">{isEn ? 'Instant Electronic Balance' : 'رصيد إلكتروني فوري'}</span>
                </div>
              </div>

              <div className={`flex items-center gap-2.5 justify-start ${isEn ? 'text-left' : 'text-right'}`}>
                <input
                  type="checkbox"
                  id="agreeTermsSelf"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="w-4 h-4 rounded text-[#234745] focus:ring-[#234745]"
                />
                <label htmlFor="agreeTermsSelf" className="text-[13.5px] text-[#171717] font-medium cursor-pointer">
                  {isEn
                    ? 'I agree to the Digital Voucher Terms & Conditions.'
                    : 'أوافق على الشروط والأحكام الخاصة بالقسائم الرقمية.'}
                </label>
              </div>

              {cartError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-[13px] font-medium text-center">
                  {cartError}
                </div>
              )}

              <div className="flex items-center justify-between gap-4 pt-4 border-t border-[#BBCFCD]/30" dir={isEn ? 'ltr' : 'rtl'}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 text-[#7D7D7D] hover:text-[#234745] font-bold text-[16px] py-2.5 px-3 transition-colors cursor-pointer"
                  style={{ fontFamily: "'GE Dinar One', sans-serif" }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={isEn ? "rotate-180" : ""}>
                    <path d="M14 6L20 12L14 18M20 12H9.5M4 12H6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>{isEn ? 'Back' : 'رجوع'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCheckoutSubmit}
                  disabled={!agreeTerms || isSubmitting}
                  className="h-[48px] rounded-[24px] px-8 bg-[#234745] hover:bg-[#1A3533] text-white font-bold text-[16px] flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 border-none"
                  style={{ fontFamily: "'GE Dinar One', sans-serif" }}
                >
                  {isSubmitting ? (
                    <>
                      <span className="inline-block animate-spin">⌛</span>
                      <span>{isEn ? 'Adding to Cart...' : 'جاري الإضافة للسلة...'}</span>
                    </>
                  ) : (
                    <>
                      <span>{isEn ? 'Add to Cart' : 'إضافة إلى السلة'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 4 (Success Screen for Buy for Yourself) */}
          {currentStep === 4 && (
            <div className="text-center py-10">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                ✓
              </div>
              <h3 className="text-2xl font-bold text-[#234745] mb-2" style={{ fontFamily: "'Bahij Janna', sans-serif" }}>
                {isEn ? 'Voucher Added to Cart!' : 'تمت إضافة القسيمة إلى السلة بنجاح!'}
              </h3>
              <p className="text-[#64748b] text-[14px] max-w-[400px] mx-auto mb-6">
                {isEn
                  ? 'Your personal digital voucher has been placed in your cart. You can complete checkout whenever you are ready.'
                  : 'تم وضع قسيمتك الرقمية في سلتك. يمكنك إتمام الطلب والدفع متى أردت.'}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => open('cart')}
                  className="w-full sm:w-auto px-8 py-3 bg-[#234745] hover:bg-[#1A3533] text-white font-bold text-[14px] rounded-full transition-all shadow-md cursor-pointer border-none"
                >
                  {isEn ? 'View Cart & Checkout' : 'عرض السلة وإتمام الدفع'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentStep(1);
                    setSelectedAmount(200);
                  }}
                  className="text-[#718096] text-[13px] underline hover:text-[#234745] transition-colors cursor-pointer"
                >
                  {isEn ? 'Buy another voucher' : 'شراء قسيمة أخرى'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ─── "أهدِ قسيمة" (GIFT A VOUCHER) 4-STEP VIEW ─── */
        <>
          {/* Top Bar with Back Button */}
          {onBackToOptions && (
            <div className="flex items-center justify-start mb-6" dir={isEn ? 'ltr' : 'rtl'}>
              <button
                type="button"
                onClick={onBackToOptions}
                className="px-4 py-1.5 text-[13px] font-bold text-[#234745] hover:bg-[#234745]/10 rounded-full transition-all border border-[#234745]/30 flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>{isEn ? '←' : '→'}</span>
                <span>{isEn ? 'Back to options' : 'الرجوع للاختيارات'}</span>
              </button>
            </div>
          )}

          {/* Section Header */}
          <div className="text-center mb-6 sm:mb-8" dir={isEn ? 'ltr' : 'rtl'}>
            <h2
              className="text-[#171717] font-bold text-[32px] sm:text-[44px] leading-tight mb-1 text-center"
              style={{ fontFamily: "'Bahij Janna', sans-serif" }}
            >
              {isEn ? 'Gift a Voucher' : 'أهدِ قسيمة'}
            </h2>
            <p
              className="text-[#7D7D7D] text-[14.5px] font-medium text-center"
              style={{ fontFamily: "'GE Dinar One', sans-serif" }}
            >
              {isEn
                ? 'Design your gift voucher in 4 simple steps'
                : 'صمم قسيمة هدية في 4 خطوات بسيطة'}
            </p>
          </div>

          {/* 4-Step Progress Bar in RTL / LTR order */}
          <div className="gift-step-bar-wrapper mb-8 max-w-[760px] mx-auto px-4" dir={isEn ? 'ltr' : 'rtl'}>
            <div className="gift-step-bar">
              {/* Step 1 */}
              <div className="gift-step-item">
                <div className={`gift-step-circle ${currentStep >= 1 ? 'active' : ''}`}>
                  <span className="font-en notranslate" style={{ fontFamily: 'Arial, sans-serif' }}>1</span>
                </div>
                <span className={`gift-step-label hidden md:block ${currentStep >= 1 ? 'active' : ''}`}>
                  {isEn ? 'Choose Amount' : 'إختر القيمة'}
                </span>
              </div>

              <div className={`gift-step-line ${currentStep >= 1 ? 'active' : ''}`} />

              {/* Step 2 */}
              <div className="gift-step-item">
                <div className={`gift-step-circle ${currentStep >= 1 ? 'active' : ''}`}>
                  <span className="font-en notranslate" style={{ fontFamily: 'Arial, sans-serif' }}>2</span>
                </div>
                <span className={`gift-step-label hidden md:block ${currentStep >= 1 ? 'active' : ''}`}>
                  {isEn ? 'Select Design' : 'إختر التصميم'}
                </span>
              </div>

              <div className={`gift-step-line ${currentStep >= 2 ? 'active' : ''}`} />

              {/* Step 3 */}
              <div className="gift-step-item">
                <div className={`gift-step-circle ${currentStep >= 2 ? 'active' : ''}`}>
                  <span className="font-en notranslate" style={{ fontFamily: 'Arial, sans-serif' }}>3</span>
                </div>
                <span className={`gift-step-label hidden md:block ${currentStep >= 2 ? 'active' : ''}`}>
                  {isEn ? 'Personalize' : 'أضف رسالتك'}
                </span>
              </div>

              <div className={`gift-step-line ${currentStep >= 3 ? 'active' : ''}`} />

              {/* Step 4 */}
              <div className="gift-step-item">
                <div className={`gift-step-circle ${currentStep >= 3 ? 'active' : ''}`}>
                  <span className="font-en notranslate" style={{ fontFamily: 'Arial, sans-serif' }}>4</span>
                </div>
                <span className={`gift-step-label hidden md:block ${currentStep >= 3 ? 'active' : ''}`}>
                  {isEn ? 'Pay & Send' : 'الدفع والارسال'}
                </span>
              </div>
            </div>
          </div>

          {/* 2-Column Wizard Layout */}
          <div className="flex flex-col lg:flex-row items-start gap-8 justify-between w-full" dir={isEn ? 'ltr' : 'rtl'}>
            {/* Left Column: Live Voucher Card Preview */}
            <div className="w-full lg:w-1/2 flex-1 min-w-0" dir={isEn ? 'ltr' : 'rtl'}>
              <div className="gift-preview-box">
                <span className="preview-tag-title">
                  {isEn ? 'Live Preview' : 'معاينة مباشرة'}
                </span>

                <div className={`voucher-card-preview ${themeColor}`} dir={isEn ? 'ltr' : 'rtl'}>
                  <div className="voucher-card-notch-left" />
                  <div className="voucher-card-notch-right" />

                  <div className="voucher-card-top text-center">
                    <span
                      className="voucher-brand font-en notranslate"
                      style={{
                        letterSpacing: '0.32em',
                        fontSize: '13.5px',
                        fontWeight: 700,
                      }}
                    >
                      S A A D E D D I N
                    </span>
                    <span className={`voucher-subtext mt-4 text-[13px] block font-medium ${isEn ? 'text-left' : 'text-right'}`}>
                      {isEn ? 'Gift Voucher Value' : 'قسيمة هدية بقيمة'}
                    </span>
                  </div>

                  <div className={`voucher-card-amount my-1 flex items-center justify-start gap-2 ${isEn ? 'text-left' : 'text-right'}`}>
                    <span
                      className="text-[42px] sm:text-[46px] font-extrabold leading-none font-en notranslate"
                      style={{ fontFamily: 'Arial, sans-serif' }}
                    >
                      {finalAmount}
                    </span>
                    <SaudiRiyalSymbol className="h-6 sm:h-7 w-auto fill-current inline-block" />
                  </div>

                  <div className={`my-1 ${isEn ? 'text-left' : 'text-right'}`}>
                    {recipientName.trim() ? (
                      <div className={`voucher-card-recipient font-semibold text-[13.5px] ${isEn ? 'text-left' : 'text-right'}`}>
                        <span>{isEn ? 'To: ' : 'إلى : '}</span>
                        <span>{recipientName.trim()}</span>
                      </div>
                    ) : (
                      <span className={`text-[13px] opacity-60 block ${isEn ? 'text-left' : 'text-right'}`}>--</span>
                    )}
                  </div>

                  <div className="voucher-card-dashed-line" />

                  <div className={`voucher-card-bottom flex items-center justify-between pt-1 pb-1 ${isEn ? 'text-left' : 'text-right'}`} dir={isEn ? 'ltr' : 'rtl'}>
                    {occasion ? (
                      <span className="voucher-occasion-text text-[12.5px] font-bold opacity-85">
                        {occasion}
                      </span>
                    ) : <span />}
                  </div>
                </div>

                {currentStep === 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (validateStep1()) setCurrentStep(2);
                    }}
                    className="gift-next-preview-btn hidden lg:flex cursor-pointer shadow-md mt-6"
                  >
                    {isEn ? 'Next: Add Message →' : 'التالي : أضف رسالتك'}
                  </button>
                )}
              </div>

              {currentStep === 3 && (
                <div className="gift-summary-mini-card" dir={isEn ? 'ltr' : 'rtl'}>
                  <div className="mini-row">
                    <span>{isEn ? 'Recipient' : 'إلى'}</span>
                    <strong>{recipientName || (isEn ? 'Sara' : 'سارة')}</strong>
                  </div>
                  <div className="mini-row">
                    <span>{isEn ? 'Sender' : 'من'}</span>
                    <strong>{senderName || (isEn ? 'Ahmed' : 'أحمد')}</strong>
                  </div>
                  <div className="mini-row">
                    <span>{isEn ? 'Delivery' : 'الإرسال'}</span>
                    <strong>
                      {isScheduled ? (isEn ? `Scheduled (${scheduledDate})` : `محدد (${scheduledDate})`) : (isEn ? 'Instant' : 'فوري')}
                    </strong>
                  </div>
                  <div className="mini-row">
                    <span>{isEn ? 'Amount' : 'المبلغ'}</span>
                    <span className={`font-en notranslate flex items-center gap-1 ${isEn ? 'flex-row' : 'flex-row-reverse'}`}>
                      <span>{finalAmount.toFixed(2)}</span>
                      <SaudiRiyalSymbol className="h-3 w-auto fill-current" />
                    </span>
                  </div>
                  <div className="mini-row">
                    <span>{isEn ? 'VAT (15%)' : 'ضريبة القيمة المضافة (15%)'}</span>
                    <span className={`font-en notranslate flex items-center gap-1 ${isEn ? 'flex-row' : 'flex-row-reverse'}`}>
                      <span>{vatAmount.toFixed(2)}</span>
                      <SaudiRiyalSymbol className="h-3 w-auto fill-current" />
                    </span>
                  </div>
                  <div className="mini-divider" />
                  <div className="mini-row total">
                    <span>{isEn ? 'Total' : 'الإجمالي'}</span>
                    <strong className={`font-en notranslate flex items-center gap-1 text-[#234745] ${isEn ? 'flex-row' : 'flex-row-reverse'}`}>
                      <span>{totalAmount.toFixed(2)}</span>
                      <SaudiRiyalSymbol className="h-3.5 w-auto fill-current" />
                    </strong>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Wizard Form Steps */}
            <div className="w-full lg:w-1/2 flex-1 min-w-0" dir={isEn ? 'ltr' : 'rtl'}>
              {/* Step 1 */}
              {currentStep === 1 && (
                <div className="gift-step-card">
                  <div className="gift-step-block">
                    <h3 className={`gift-block-title ${isEn ? 'text-left' : 'text-right'}`}>
                      {isEn ? '1. Choose Voucher Amount' : '1- أختر قيمة القسيمة ؟'}
                    </h3>

                    <div className="amounts-grid">
                      {[50, 100, 200, 500, 1000].map((amt) => {
                        const isSelected = selectedAmount === amt;
                        return (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => {
                              setSelectedAmount(amt);
                              setAmountError('');
                            }}
                            className={`amount-pill ${isSelected ? 'selected' : ''}`}
                          >
                            {isSelected && (
                              <span className={`check-badge ${isEn ? 'left-2' : 'right-2'}`}>
                                <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </span>
                            )}
                            <span className={`flex items-center gap-1.5 justify-center font-bold ${isEn ? 'flex-row' : 'flex-row-reverse'}`}>
                              <SaudiRiyalSymbol className="h-3.5 w-auto fill-current" />
                              <span className="font-en notranslate text-[15px]" style={{ fontFamily: 'Arial, sans-serif' }}>
                                {amt}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {amountError && (
                      <p className="text-red-500 text-[13px] mt-2 font-medium">{amountError}</p>
                    )}
                  </div>

                  <div className="gift-step-block mt-8">
                    <h3 className={`gift-block-title ${isEn ? 'text-left' : 'text-right'}`}>
                      {isEn ? '2. Choose Design & Occasion' : '2- أختر التصميم والمناسبة ؟'}
                    </h3>

                    <div className="occasions-row">
                      {occasionList.map((occ) => (
                        <button
                          key={occ.id}
                          type="button"
                          onClick={() => setOccasion(occ.id)}
                          className={`occasion-chip ${occasion === occ.id ? 'active' : ''}`}
                        >
                          {occ.label}
                        </button>
                      ))}
                    </div>

                    <div className="themes-grid mt-4">
                      <div
                        onClick={() => setThemeColor('green')}
                        className={`theme-card green ${themeColor === 'green' ? 'active' : ''}`}
                      >
                        {themeColor === 'green' && (
                          <span className={`theme-check-badge ${isEn ? 'left-2' : 'right-2'}`}>
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </span>
                        )}
                      </div>

                      <div
                        onClick={() => setThemeColor('gold')}
                        className={`theme-card gold ${themeColor === 'gold' ? 'active' : ''}`}
                      >
                        {themeColor === 'gold' && (
                          <span className={`theme-check-badge ${isEn ? 'left-2' : 'right-2'}`}>
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </span>
                        )}
                      </div>

                      <div
                        onClick={() => setThemeColor('cream')}
                        className={`theme-card cream ${themeColor === 'cream' ? 'active' : ''}`}
                      >
                        {themeColor === 'cream' && (
                          <span className={`theme-check-badge ${isEn ? 'left-2' : 'right-2'}`}>
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="block lg:hidden mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        if (validateStep1()) setCurrentStep(2);
                      }}
                      className="w-full h-[52px] rounded-full bg-[#234745] hover:bg-[#1A3533] text-white font-bold text-[16px] flex items-center justify-center transition-all shadow-md active:scale-98 cursor-pointer border-none"
                      style={{
                        fontFamily: "'GE Dinar One', 'GE SS Two', sans-serif",
                      }}
                    >
                      {isEn ? 'Next: Add Message →' : 'التالي : أضف رسالتك'}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2 */}
              {currentStep === 2 && (
                <div className="gift-step-card">
                  <div className="flex items-center justify-start gap-3 pb-3.5 mb-6 border-b border-[#BBCFCD]/60" dir={isEn ? 'ltr' : 'rtl'}>
                    <div className="w-[34px] h-[34px] rounded-full bg-[#234745] text-white flex items-center justify-center font-bold text-[15px] font-en notranslate flex-shrink-0">
                      3
                    </div>
                    <h3
                      className="text-[22px] font-bold text-[#234745] m-0"
                      style={{ fontFamily: "'GE Dinar One', 'Bahij Janna', sans-serif" }}
                    >
                      {isEn ? 'Add Your Message' : 'أضف رسالتك'}
                    </h3>
                  </div>

                  <div className="gift-fields-stack">
                    <div className="gift-field">
                      <label className="gift-label">
                        <span>{isEn ? 'Sender Name' : 'إسم المرسل'}</span>
                        <span className="req">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder={isEn ? 'Ahmed' : 'أحمد'}
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        className="gift-input"
                      />
                    </div>

                    <div className="gift-field">
                      <label className="gift-label">
                        <span>{isEn ? 'Recipient Name' : 'إسم المستلم'}</span>
                        <span className="req">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder={isEn ? 'Sara' : 'سارة'}
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        className="gift-input"
                      />
                    </div>

                    <div className="gift-field">
                      <label className="gift-label">
                        <span>{isEn ? 'Recipient Email' : 'البريد الالكتروني للمستلم'}</span>
                        <span className="req">*</span>
                      </label>
                      <input
                        type="email"
                        placeholder="sara@example.com"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        className={`gift-input font-en notranslate ${isEn ? 'text-left' : 'text-right'}`}
                      />
                    </div>

                    <div className="gift-field">
                      <label className="gift-label">
                        <span>{isEn ? 'Personal Message' : 'رسالتك الشخصية'}</span>
                      </label>
                      <textarea
                        placeholder={isEn ? "Happy Birthday!" : "كل عام وانت بخير"}
                        value={personalMessage}
                        onChange={(e) =>
                          setPersonalMessage(e.target.value.slice(0, 150))
                        }
                        rows={3}
                        className="gift-textarea"
                      />
                      <div className={`text-[#7D7D7D] text-[12px] font-en notranslate mt-0.5 ${isEn ? 'text-right' : 'text-left'}`}>
                        {personalMessage.length}/150 {isEn ? 'chars' : 'حرف'}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-2" dir={isEn ? 'ltr' : 'rtl'}>
                        {quickMessages.map((msg) => (
                          <button
                            key={msg}
                            type="button"
                            onClick={() => setPersonalMessage(msg)}
                            className={`quick-msg-pill ${personalMessage === msg ? 'active' : ''}`}
                          >
                            {msg}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-start gap-2.5 mt-2" dir={isEn ? 'ltr' : 'rtl'}>
                      <input
                        type="checkbox"
                        id="scheduleCheck"
                        checked={isScheduled}
                        onChange={(e) => setIsScheduled(e.target.checked)}
                        className="w-5 h-5 rounded border border-[#BBCFCD] accent-[#234745] cursor-pointer"
                      />
                      <label htmlFor="scheduleCheck" className="text-[14.5px] font-bold text-[#7D7D7D] cursor-pointer" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                        {isEn ? 'Schedule delivery date' : 'إرسال في موعد محدد'}
                      </label>
                    </div>

                    {isScheduled && (
                      <div className="relative mt-2" dir={isEn ? 'ltr' : 'rtl'}>
                        <input
                          type="date"
                          value={scheduledDate}
                          min={new Date().toISOString().split('T')[0]}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          placeholder={isEn ? 'Select Date' : 'إختر التاريخ'}
                          className={`gift-input w-full cursor-pointer font-en notranslate ${isEn ? 'pl-10' : 'pr-10'}`}
                        />
                        <span className={`absolute ${isEn ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 text-[#171717] pointer-events-none`}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19 4H5C3.89543 4 3 4.89543 3 6V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V6C21 4.89543 20.1046 4 19 4Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M16 2V6M8 2V6M3 10H21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </span>
                      </div>
                    )}

                    {emailError && (
                      <p className="text-red-500 text-[13px] mt-1 font-medium">{emailError}</p>
                    )}

                    <div className="flex items-center justify-between gap-4 mt-8 pt-4 border-t border-[#BBCFCD]/30" dir={isEn ? 'ltr' : 'rtl'}>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="flex items-center gap-2 text-[#7D7D7D] hover:text-[#234745] font-bold text-[16px] py-2.5 px-3 transition-colors cursor-pointer"
                        style={{ fontFamily: "'GE Dinar One', sans-serif" }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={isEn ? "rotate-180" : ""}>
                          <path d="M14 6L20 12L14 18M20 12H9.5M4 12H6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span>{isEn ? 'Back' : 'رجوع'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => { if (validateStep2()) setCurrentStep(3); }}
                        className="gift-next-pill-btn cursor-pointer shadow-md"
                        style={{
                          background: '#234745',
                          color: '#ffffff',
                          height: '48px',
                          borderRadius: '24px',
                          padding: '12px 32px',
                          fontFamily: "'GE Dinar One', sans-serif",
                          fontWeight: 700,
                          fontSize: '16px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '10px',
                          border: 'none',
                        }}
                      >
                        <span>{isEn ? 'Next, Checkout' : 'التالي, الدفع'}</span>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={isEn ? "rotate-180" : ""}>
                          <path d="M10 18L4 12L10 6M4 12H14.5M20 12H17.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3 */}
              {currentStep === 3 && (
                <div className="gift-step-card">
                  <div className="flex items-center justify-start gap-3 pb-3.5 mb-6 border-b border-[#BBCFCD]/60" dir={isEn ? 'ltr' : 'rtl'}>
                    <div className="w-[34px] h-[34px] rounded-full bg-[#234745] text-white flex items-center justify-center font-bold text-[15px] font-en notranslate flex-shrink-0">
                      4
                    </div>
                    <h3
                      className="text-[22px] font-bold text-[#234745] m-0"
                      style={{ fontFamily: "'GE Dinar One', 'Bahij Janna', sans-serif" }}
                    >
                      {isEn ? 'Confirm & Add to Cart' : 'تأكيد القسيمة وإضافتها للسلة'}
                    </h3>
                  </div>

                  <div className="checkout-notice-box">
                    <p className="notice-text">
                      {isEn
                        ? 'Your custom gift voucher will be added directly to your Cart.'
                        : 'سيتم إضافة قسيمة الهدية المخصصة مباشرة إلى سلة التسوق إلكترونياً.'}
                    </p>
                  </div>

                  <div className="checkout-details-card">
                    <div className="detail-item">
                      <span className="icon flex items-center justify-center">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="3" y="5" width="18" height="14" rx="2" stroke="#234745" strokeWidth="1.6"/>
                          <path d="M4 7L10.2 11.65C11.2667 12.45 12.7333 12.45 13.8 11.65L20 7" stroke="#234745" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                      <div className="info">
                        <span className="item-title">{isEn ? 'Delivery Channel' : 'طريقة الإرسال'}</span>
                        <span className="item-sub">
                          {isEn ? 'Direct Instant Email & SMS' : 'بريد إلكتروني فوري ورسالة SMS'}
                        </span>
                      </div>
                    </div>

                    <div className="detail-item">
                      <span className="icon flex items-center justify-center">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="3" y="6" width="18" height="15" rx="2" stroke="#234745" strokeWidth="1.6"/>
                          <path d="M3 10H21" stroke="#234745" strokeWidth="1.6"/>
                          <path d="M8 3V7" stroke="#234745" strokeWidth="1.6" strokeLinecap="round"/>
                          <path d="M16 3V7" stroke="#234745" strokeWidth="1.6" strokeLinecap="round"/>
                        </svg>
                      </span>
                      <div className="info">
                        <span className="item-title">{isEn ? 'Send Date' : 'تاريخ الإرسال'}</span>
                        <span className="item-sub font-en notranslate">
                          {isScheduled && scheduledDate ? scheduledDate : (isEn ? 'Immediately upon payment' : 'فوراً بعد إتمام الدفع')}
                        </span>
                      </div>
                    </div>

                    <div className="detail-item">
                      <span className="icon flex items-center justify-center">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="5" y="11" width="14" height="10" rx="2" stroke="#234745" strokeWidth="1.6"/>
                          <path d="M8 11V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V11" stroke="#234745" strokeWidth="1.6" strokeLinecap="round"/>
                        </svg>
                      </span>
                      <div className="info">
                        <span className="item-title">{isEn ? 'Security' : 'الأمان'}</span>
                        <span className="item-sub">
                          {isEn ? '100% Encrypted & Authenticated' : 'معتمد ومشفر 100%'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="terms-checkbox-row">
                    <input
                      type="checkbox"
                      id="agreeTerms"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                    />
                    <label htmlFor="agreeTerms">
                      {isEn
                        ? 'I agree to the Digital Voucher Terms & Conditions.'
                        : 'أوافق على الشروط والأحكام الخاصة بالقسائم الرقمية.'}
                    </label>
                  </div>

                  {cartError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-[13px] font-medium text-center">
                      {cartError}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-4 mt-8 pt-4 border-t border-[#BBCFCD]/30" dir={isEn ? 'ltr' : 'rtl'}>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      disabled={isSubmitting}
                      className="flex items-center gap-2 text-[#7D7D7D] hover:text-[#234745] font-bold text-[16px] py-2.5 px-3 transition-colors cursor-pointer"
                      style={{ fontFamily: "'GE Dinar One', sans-serif" }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={isEn ? "rotate-180" : ""}>
                        <path d="M14 6L20 12L14 18M20 12H9.5M4 12H6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>{isEn ? 'Back' : 'رجوع'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCheckoutSubmit}
                      disabled={!agreeTerms || isSubmitting}
                      className="gift-next-pill-btn cursor-pointer shadow-md"
                      style={{
                        background: '#234745',
                        color: '#ffffff',
                        height: '48px',
                        borderRadius: '24px',
                        padding: '12px 32px',
                        fontFamily: "'GE Dinar One', sans-serif",
                        fontWeight: 700,
                        fontSize: '16px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        border: 'none',
                      }}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="inline-block animate-spin">⌛</span>
                          <span>{isEn ? 'Adding to Cart...' : 'جاري الإضافة للسلة...'}</span>
                        </>
                      ) : (
                        <>
                          <span>{isEn ? 'Proceed to Cart' : 'إضافة إلى السلة والمتابعة'}</span>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={isEn ? "rotate-180" : ""}>
                            <path d="M10 18L4 12L10 6M4 12H14.5M20 12H17.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4 */}
              {currentStep === 4 && (
                <div className="gift-step-card text-center py-10">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
                    ✓
                  </div>
                  <h3 className="text-2xl font-bold text-[#234745] mb-2" style={{ fontFamily: "'Bahij Janna', sans-serif" }}>
                    {isEn ? 'Voucher Added to Cart!' : 'تمت إضافة القسيمة إلى السلة بنجاح!'}
                  </h3>
                  <p className="text-[#64748b] text-[14px] max-w-[400px] mx-auto mb-6">
                    {isEn
                      ? 'Your customized gift voucher has been placed in your cart. You can complete checkout whenever you are ready.'
                      : 'تم وضع قسيمة الهدية المخصصة في سلتك. يمكنك إتمام الطلب والدفع متى أردت.'}
                  </p>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => open('cart')}
                      className="w-full sm:w-auto px-8 py-3 bg-[#234745] hover:bg-[#1A3533] text-white font-bold text-[14px] rounded-full transition-all shadow-md cursor-pointer"
                    >
                      {isEn ? 'View Cart & Checkout' : 'عرض السلة وإتمام الدفع'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentStep(1);
                        setRecipientEmail('');
                        setPersonalMessage(isEn ? 'Happy Birthday' : 'كل عام وانت بخير');
                        setIsScheduled(false);
                        setScheduledDate('');
                        setSelectedAmount(100);
                      }}
                      className="text-[#718096] text-[13px] underline hover:text-[#234745] transition-colors cursor-pointer"
                    >
                      {isEn ? 'Send another voucher' : 'إرسال قسيمة أخرى'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ─── VOUCHERS LOG TABLE (سجل القسائم) matching attached screenshot ─── */}
      <div className="mt-16 pt-8 border-t border-[#BBCFCD]/30" dir={isEn ? 'ltr' : 'rtl'}>
        <div className={`mb-6 ${isEn ? 'text-left' : 'text-right'}`}>
          <h3
            className="text-[28px] font-bold text-[#171717] mb-1"
            style={{ fontFamily: "'Bahij Janna', sans-serif" }}
          >
            {isEn ? 'Vouchers History' : 'سجل القسائم'}
          </h3>
          <p
            className="text-[#7D7D7D] text-[14px]"
            style={{ fontFamily: "'GE Dinar One', sans-serif" }}
          >
            {isEn ? 'Previous redemptions and received vouchers log' : 'سجل عمليات الاسترداد السابقة'}
          </p>
        </div>

        {voucherHistory && voucherHistory.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm bg-white">
            <table className="w-full border-collapse" dir={isEn ? 'ltr' : 'rtl'}>
              <thead>
                <tr className="bg-[#234745] text-white text-[14px]">
                  <th className={`py-3.5 px-6 font-bold ${isEn ? 'text-left' : 'text-right'}`}>{isEn ? 'Code' : 'الرمز'}</th>
                  <th className={`py-3.5 px-6 font-bold ${isEn ? 'text-left' : 'text-right'}`}>{isEn ? 'Description' : 'الوصف'}</th>
                  <th className="py-3.5 px-6 font-bold text-center">{isEn ? 'Value' : 'القيمة'}</th>
                  <th className="py-3.5 px-6 font-bold text-center">{isEn ? 'Date' : 'التاريخ'}</th>
                  <th className="py-3.5 px-6 font-bold text-center">{isEn ? 'Status' : 'الحالة'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-[13.5px]">
                {voucherHistory.map((rec) => (
                  <tr key={rec.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className={`py-4 px-6 font-en font-bold text-[#171717] notranslate ${isEn ? 'text-left' : 'text-right'}`}>{rec.code}</td>
                    <td className={`py-4 px-6 text-[#171717] font-medium ${isEn ? 'text-left' : 'text-right'}`}>{rec.description}</td>
                    <td className="py-4 px-6 font-en font-bold text-[#171717] text-center notranslate">
                      <span className={`inline-flex items-center justify-center gap-1.5 ${isEn ? 'flex-row' : 'flex-row-reverse'}`}>
                        <SaudiRiyalSymbol className="h-3.5 w-auto fill-current" />
                        <span>{rec.value}</span>
                      </span>
                    </td>
                    <td className="py-4 px-6 text-[#7D7D7D] text-center font-en notranslate">{rec.date}</td>
                    <td className="py-4 px-6 text-center">
                      <span className="font-bold" style={{ color: rec.statusColor }}>{rec.statusLabel}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-10 text-center border border-gray-200 shadow-xs flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#FEF8EB] text-[#234745] flex items-center justify-center text-2xl shadow-inner">
              🎟️
            </div>
            <p className="text-[15px] font-bold text-[#234745]">
              {isEn ? 'No voucher redemptions or usage history found for this account.' : 'لا يوجد سجل قسائم مستخدمة أو مستردة لهذا الحساب حتى الآن.'}
            </p>
            {!isLoggedIn && (
              <p className="text-[13px] text-[#7D7D7D]">
                {isEn ? 'Log in to your account to view your past redeemed vouchers.' : 'سجّل الدخول لعرض القسائم المستردة والمستخدمة في حسابك.'}
              </p>
            )}
          </div>
        )}
      </div>

      <GiftWizardStyles />
    </div>
  );
}

// ─── Scoped CSS matching the user attached design ───────────────────────────

function GiftWizardStyles() {
  return (
    <style>{`
      .gift-wizard-embedded {
        background: transparent;
        font-family: 'GE Dinar One', 'Bahij Janna', sans-serif;
        color: #171717;
      }

      /* ── 4-STEP PROGRESS BAR (Exact to design) ── */
      .gift-step-bar-wrapper {
        margin-bottom: 40px;
        width: 100%;
        display: flex;
        justify-content: center;
      }
      .gift-step-bar {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        width: 100%;
        max-width: 760px;
      }
      .gift-step-item {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }
      .gift-step-label {
        font-size: 13.5px;
        color: #7D7D7D;
        font-weight: 600;
        white-space: nowrap;
      }
      .gift-step-label.active {
        color: #171717;
      }
      .gift-step-circle {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: #FEF8EB;
        color: #9FB7AE;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 15px;
        border: 1px solid #EED5D780;
        flex-shrink: 0;
        font-family: Arial, sans-serif !important;
      }
      .gift-step-circle.active {
        background: #234745;
        color: #ffffff;
        border-color: #234745;
      }
      .gift-step-line {
        flex: 0 1 36px;
        width: 36px;
        min-width: 16px;
        height: 2px;
        background: #C5A96A;
        opacity: 0.7;
      }

      /* ── LEFT PREVIEW BOX ── */
      .gift-preview-box {
        background: #FEF8EB;
        border-radius: 20px;
        padding: 20px 10px;
        border: 1px solid #D9CFB8;
        box-shadow: 0 4px 16px rgba(0,0,0,0.03);
        text-align: center;
      }
      @media (min-width: 640px) {
        .gift-preview-box {
          padding: 24px 18px;
        }
      }
      .preview-tag-title {
        display: block;
        font-size: 14px;
        font-weight: 700;
        color: #234745;
        margin-bottom: 20px;
        text-align: center;
      }

      /* ── VOUCHER TICKET CARD ── */
      .voucher-card-preview {
        position: relative;
        border-radius: 20px;
        padding: 24px 22px 18px 22px;
        text-align: inherit;
        min-height: 250px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        box-shadow: none !important;
        border: none !important;
        transition: all 0.3s ease;
        overflow: hidden;
      }
      .voucher-card-preview.green {
        background: #2C4A45;
        color: #ffffff;
      }
      .voucher-card-preview.green .voucher-subtext,
      .voucher-card-preview.green .voucher-card-recipient,
      .voucher-card-preview.green .code-label,
      .voucher-card-preview.green .voucher-occasion-text {
        color: rgba(255, 255, 255, 0.75);
      }
      .voucher-card-preview.green .voucher-card-msg {
        color: rgba(255, 255, 255, 0.9);
      }
      .voucher-card-preview.green .code-val,
      .voucher-card-preview.green .voucher-brand,
      .voucher-card-preview.green .voucher-card-amount {
        color: #ffffff;
      }

      .voucher-card-preview.gold {
        background: #C9A96E;
        color: #ffffff;
      }
      .voucher-card-preview.gold .voucher-subtext,
      .voucher-card-preview.gold .voucher-card-recipient,
      .voucher-card-preview.gold .code-label,
      .voucher-card-preview.gold .voucher-occasion-text {
        color: rgba(255, 255, 255, 0.85);
      }
      .voucher-card-preview.gold .voucher-card-msg {
        color: #ffffff;
      }
      .voucher-card-preview.gold .code-val,
      .voucher-card-preview.gold .voucher-brand,
      .voucher-card-preview.gold .voucher-card-amount {
        color: #ffffff;
      }

      /* Light Card: Cream #FAF6EC with clear dark text */
      .voucher-card-preview.cream {
        background: #FAF6EC !important;
        color: #171717 !important;
        border: none !important;
      }
      .voucher-card-preview.cream .voucher-brand {
        color: #171717 !important;
      }
      .voucher-card-preview.cream .voucher-subtext {
        color: #555555 !important;
      }
      .voucher-card-preview.cream .voucher-card-amount {
        color: #171717 !important;
      }
      .voucher-card-preview.cream .voucher-card-recipient {
        color: #171717 !important;
      }
      .voucher-card-preview.cream .voucher-card-msg {
        color: #234745 !important;
      }
      .voucher-card-preview.cream .code-label {
        color: #718096 !important;
      }
      .voucher-card-preview.cream .code-val {
        color: #171717 !important;
      }
      .voucher-card-preview.cream .voucher-occasion-text {
        color: #718096 !important;
      }
      .voucher-card-preview.cream .voucher-card-dashed-line {
        border-bottom: 1.5px dashed rgba(23, 23, 23, 0.25) !important;
      }

      /* Ticket circular cutout notches on left & right edges */
      .voucher-card-notch-left {
        position: absolute;
        left: -14px;
        bottom: 8px;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: #FEF8EB;
        border: none !important;
        z-index: 5;
      }
      .voucher-card-notch-right {
        position: absolute;
        right: -14px;
        bottom: 8px;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: #FEF8EB;
        border: none !important;
        z-index: 5;
      }

      .voucher-brand {
        font-size: 16px;
        letter-spacing: 6px;
        font-weight: 700;
        display: block;
        opacity: 0.95;
      }
      .voucher-card-dashed-line {
        border-bottom: 1.5px dashed rgba(255,255,255,0.4);
        margin: 16px 0 10px 0;
      }
      .voucher-card-preview.cream .voucher-card-dashed-line {
        border-bottom: 1.5px dashed rgba(23, 23, 23, 0.25) !important;
      }

      .gift-next-preview-btn {
        width: 100%;
        max-width: 580px;
        height: 48px;
        border-radius: 24px;
        gap: 8px;
        padding: 12px 20px;
        background: #234745;
        color: #ffffff;
        font-family: 'GE Dinar One', 'GE SS Two', sans-serif;
        font-weight: 700;
        font-style: normal;
        font-size: 16px;
        line-height: 100%;
        letter-spacing: 0%;
        text-align: center;
        vertical-align: middle;
        opacity: 1;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
        margin: 24px auto 0 auto;
        box-shadow: 0 4px 14px rgba(35, 71, 69, 0.15);
      }
      .gift-next-preview-btn:hover {
        background: #1A3533;
        transform: translateY(-1px);
        box-shadow: 0 6px 18px rgba(35, 71, 69, 0.22);
      }

      /* ── RIGHT COLUMN: FORM CARD ── */
      .gift-step-card {
        background: #FEF8EB;
        border-radius: 20px;
        padding: 20px 10px;
        border: 1px solid #D9CFB8;
        box-shadow: 0 4px 16px rgba(0,0,0,0.03);
      }
      @media (min-width: 640px) {
        .gift-step-card {
          padding: 24px 18px;
        }
      }
      .gift-block-title {
        font-size: 18px;
        font-weight: 700;
        color: #171717;
        margin-bottom: 16px;
        font-family: 'Bahij Janna', sans-serif;
      }

      /* ── 1. AMOUNTS GRID (Selected background: #EED5D780) ── */
      .amounts-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
      }
      .amount-pill {
        position: relative;
        border: 1.5px solid #BBCFCD;
        border-radius: 16px;
        height: 52px;
        font-weight: 700;
        font-size: 15px;
        color: #171717;
        background: #FFFFFF;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 1px 4px rgba(0,0,0,0.02);
      }
      .amount-pill:hover {
        border-color: #234745;
      }
      /* EXACT USER REQUIREMENT: background: #EED5D780 */
      .amount-pill.selected {
        background: #EED5D780 !important;
        border-color: #234745;
        color: #171717;
      }
      .check-badge {
        position: absolute;
        top: 6px;
        left: 8px;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #234745;
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .custom-amount-input {
        width: 100%;
        border: 1.5px solid #BBCFCD;
        border-radius: 16px;
        padding: 13px 16px;
        font-size: 15px;
        font-weight: 600;
        background: #FFFFFF;
      }
      .custom-amount-input:focus {
        outline: none;
        border-color: #234745;
        box-shadow: 0 0 0 3px rgba(35,71,69,0.1);
      }

      /* ── 2. OCCASIONS ROW (5 on single row) ── */
      .occasions-row {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 5px;
        margin-bottom: 20px;
        width: 100%;
      }
      .occasion-chip {
        min-width: 0;
        width: 100%;
        border: 1.5px solid #BBCFCD;
        border-radius: 12px;
        padding: 8px 2px;
        font-size: clamp(11.5px, 2.7vw, 13.5px);
        font-weight: 700;
        color: #171717;
        background: #FFFFFF;
        cursor: pointer;
        transition: all 0.2s;
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 1px 4px rgba(0,0,0,0.02);
      }
      .occasion-chip:hover {
        border-color: #234745;
      }
      .occasion-chip.active {
        background: #234745;
        color: #FFFFFF;
        border-color: #234745;
      }

      /* ── 3. THEME SWATCHES (Large rounded blocks) ── */
      .themes-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
      }
      .theme-card {
        position: relative;
        height: 110px;
        border-radius: 18px;
        cursor: pointer;
        display: flex;
        align-items: flex-start;
        justify-content: flex-end;
        padding: 8px;
        border: 2px solid #9FB7AE;
        transition: all 0.2s ease;
        box-shadow: 0 1px 4px rgba(0,0,0,0.02);
      }
      .theme-card:hover {
        transform: translateY(-2px);
      }
      .theme-card.green {
        background: #2C4A45;
      }
      .theme-card.gold {
        background: #C9A96E;
      }
      .theme-card.cream {
        background: #FAF6EC;
      }
      .theme-card.active {
        border: 2.5px solid #234745 !important;
      }
      .theme-check-badge {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #234745;
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      /* ── FORM FIELDS & BUTTONS ── */
      .gift-fields-stack {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .gift-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .gift-label {
        font-size: 14px;
        font-weight: 700;
        color: #171717;
        font-family: 'GE Dinar One', sans-serif;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .gift-label .req {
        color: #E53E3E;
        font-weight: 700;
      }

      .gift-input, .gift-textarea {
        background: #FFFDF5 !important;
        border: 1px solid #BBCFCD !important;
        border-radius: 14px !important;
        padding: 13px 18px !important;
        font-size: 15px !important;
        font-weight: 500 !important;
        color: #171717 !important;
        font-family: 'GE Dinar One', sans-serif;
        outline: none;
        transition: all 0.2s ease;
        box-shadow: 0 1px 3px rgba(0,0,0,0.02);
      }
      .gift-input:focus, .gift-textarea:focus {
        border-color: #234745 !important;
        box-shadow: 0 0 0 3px rgba(35, 71, 69, 0.08) !important;
      }
      .gift-textarea {
        min-height: 100px;
        resize: vertical;
      }

      .gift-code-box {
        background: #FFFDF5 !important;
        border: 1px solid #BBCFCD !important;
        border-radius: 14px !important;
        padding: 13px 18px !important;
        font-size: 15px !important;
        font-weight: 700 !important;
        color: #171717 !important;
        width: 84px !important;
        height: 52px !important;
        box-shadow: 0 1px 3px rgba(0,0,0,0.02);
      }

      .quick-msg-pill {
        background: #FFFDF5 !important;
        border: 1px solid #8C6D46 !important;
        color: #234745 !important;
        border-radius: 24px !important;
        padding: 7px 18px !important;
        font-size: 13.5px !important;
        font-weight: 600 !important;
        font-family: 'GE Dinar One', sans-serif !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
        white-space: nowrap !important;
      }
      .quick-msg-pill:hover, .quick-msg-pill.active {
        background: #FEF8EB !important;
        border-color: #8C6D46 !important;
        color: #8C6D46 !important;
      }

      .checkbox-field {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: #171717;
      }

      .checkout-notice-box {
        background: #f0f7f5;
        border: 1px solid #234745;
        border-radius: 12px;
        padding: 12px 16px;
        margin-bottom: 20px;
      }
      .checkout-notice-box .notice-text {
        font-size: 13px;
        color: #234745;
        margin: 0;
      }

      .checkout-details-card {
        background: #f7fafc;
        border-radius: 12px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 20px;
      }
      .detail-item {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .detail-item .icon {
        width: 36px;
        height: 36px;
        border-radius: 10px;
        background: #FEF8EB;
        border: 1px solid #BBCFCD;
        color: #234745;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .detail-item .info {
        display: flex;
        flex-direction: column;
      }
      .detail-item .item-title {
        font-size: 13.5px;
        font-weight: 700;
        color: #171717;
      }
      .detail-item .item-sub {
        font-size: 11.5px;
        color: #7D7D7D;
      }

      .terms-checkbox-row {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: #171717;
        margin-bottom: 24px;
      }

      .step-actions-row {
        display: flex;
        gap: 12px;
      }
      .gift-next-pill-btn {
        height: 48px !important;
        border-radius: 24px !important;
        gap: 10px !important;
        padding: 12px 32px !important;
        background: #234745 !important;
        color: #ffffff !important;
        font-family: 'GE Dinar One', 'GE SS Two', sans-serif !important;
        font-weight: 700 !important;
        font-style: normal !important;
        font-size: 16px !important;
        line-height: 100% !important;
        letter-spacing: 0% !important;
        text-align: center !important;
        vertical-align: middle !important;
        opacity: 1 !important;
        border: none !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
        box-shadow: 0 4px 14px rgba(35, 71, 69, 0.2) !important;
      }
      .gift-next-pill-btn:hover {
        background: #1A3533 !important;
        transform: translateY(-1px);
        box-shadow: 0 6px 18px rgba(35, 71, 69, 0.3) !important;
      }
      .btn-next-step, .btn-pay-now {
        flex: 1;
        height: 48px;
        border-radius: 24px;
        gap: 8px;
        padding: 12px 20px;
        background: #234745;
        color: #ffffff;
        font-family: 'GE Dinar One', 'GE SS Two', sans-serif;
        font-weight: 700;
        font-style: normal;
        font-size: 16px;
        line-height: 100%;
        letter-spacing: 0%;
        text-align: center;
        vertical-align: middle;
        opacity: 1;
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        box-shadow: 0 4px 14px rgba(35, 71, 69, 0.15);
      }
      .btn-next-step:hover, .btn-pay-now:hover {
        background: #1A3533;
        transform: translateY(-1px);
        box-shadow: 0 6px 18px rgba(35, 71, 69, 0.22);
      }
      .btn-pay-now:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      .btn-back-step {
        height: 48px;
        border-radius: 24px;
        gap: 8px;
        padding: 12px 20px;
        background: #FEF8EB;
        color: #234745;
        border: 1px solid #D9CFB8;
        font-family: 'GE Dinar One', 'GE SS Two', sans-serif;
        font-weight: 700;
        font-size: 15px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .btn-back-step:hover {
        background: #e2e8f0;
      }

      .gift-summary-mini-card {
        background: #ffffff;
        border: 1px solid #D9CFB8;
        border-radius: 16px;
        padding: 20px;
        margin-top: 16px;
      }
      .mini-row {
        display: flex;
        justify-content: space-between;
        font-size: 13px;
        color: #4a5568;
        margin-bottom: 8px;
      }
      .mini-row.total {
        font-size: 15px;
        font-weight: 700;
        color: #1a3b3a;
        margin-top: 8px;
        margin-bottom: 0;
      }
      .mini-divider {
        height: 1px;
        background: #edf2f7;
        margin: 12px 0;
      }
    `}</style>
  );
}
