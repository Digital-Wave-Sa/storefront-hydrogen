/**
 * Digital Gift Voucher Builder — 4-Step Wizard
 * Route: /buy-gift-card
 *
 * Supports Mode:
 * - Purchase for Myself (mode=self)
 * - Gift to Someone Else (mode=gift)
 * Uses REAL Shopify Gift Card Product Variants
 */

import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import type { MetaFunction } from 'react-router';
import { SaudiRiyalSymbol } from '~/components/Price';

export const meta: MetaFunction = () => [
  { title: 'أهدِ قسيمة | حلويات سعد الدين' },
];

const GIFT_CARD_VARIANTS: Record<number, string> = {
  50: 'gid://shopify/ProductVariant/51652828496105',
  100: 'gid://shopify/ProductVariant/51652828528873',
  200: 'gid://shopify/ProductVariant/51652828561641',
  500: 'gid://shopify/ProductVariant/51652828594409',
  1000: 'gid://shopify/ProductVariant/51652828627177',
};

function getVariantForAmount(amount: number): string {
  if (GIFT_CARD_VARIANTS[amount]) return GIFT_CARD_VARIANTS[amount];
  if (amount <= 50) return GIFT_CARD_VARIANTS[50];
  if (amount <= 100) return GIFT_CARD_VARIANTS[100];
  if (amount <= 200) return GIFT_CARD_VARIANTS[200];
  if (amount <= 500) return GIFT_CARD_VARIANTS[500];
  return GIFT_CARD_VARIANTS[1000];
}

export default function BuyGiftCard() {
  const { pathname, search } = useLocation();
  const isEn = pathname.startsWith('/en');
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(search);
  const initialMode = searchParams.get('mode') === 'self' ? 'self' : 'gift';

  // Gift Mode: 'gift' = Gift to someone, 'self' = Buy for myself
  const [giftMode, setGiftMode] = useState<'gift' | 'self'>(initialMode);

  // Wizard Step: 1 = Amount & Design, 2 = Message, 3 = Confirmation & Cart
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Amount State
  const [selectedAmount, setSelectedAmount] = useState<number>(100);
  const [customAmountInput, setCustomAmountInput] = useState<string>('');
  const [isCustomAmount, setIsCustomAmount] = useState(false);

  // Design State
  const [occasion, setOccasion] = useState('عيد ميلاد');
  const [themeColor, setThemeColor] = useState<'green' | 'gold' | 'cream'>(
    'green',
  );

  // Recipient / Sender Message Form State
  const [senderName, setSenderName] = useState('أحمد');
  const [recipientName, setRecipientName] = useState('سارة');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [personalMessage, setPersonalMessage] = useState('كل عام وانت بخير');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const finalAmount =
    isCustomAmount && customAmountInput
      ? parseFloat(customAmountInput) || 100
      : selectedAmount;
  const vatAmount = finalAmount * 0.15;
  const totalAmount = finalAmount + vatAmount;

  const quickMessages = [
    'كل عام وانت بخير',
    'مبروك',
    'شكراً من القلب',
    'بمناسبة العيد السعيد',
  ];

  const handleCheckoutSubmit = async () => {
    if (!agreeTerms) return;
    setIsSubmitting(true);

    try {
      const merchandiseId = getVariantForAmount(finalAmount);
      const targetRecipientName = giftMode === 'self' ? (senderName || 'نفسي') : recipientName;

      const formData = new FormData();
      const lineItem = {
        action: 'LinesAdd',
        inputs: {
          lines: [
            {
              merchandiseId,
              quantity: 1,
              attributes: [
                { key: '_gift_voucher', value: 'true' },
                { key: 'Gift Mode', value: giftMode === 'self' ? 'For Myself' : 'Gift to Someone' },
                { key: 'Voucher Amount', value: `${finalAmount} SAR` },
                { key: 'Recipient Name', value: targetRecipientName },
                { key: 'Recipient Email', value: recipientEmail || 'N/A' },
                { key: 'Recipient Phone', value: recipientPhone || 'N/A' },
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
      const res = await fetch(cartEndpoint, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        window.location.href = cartEndpoint;
      } else {
        navigate(cartEndpoint);
      }
    } catch {
      navigate(isEn ? '/en/cart' : '/cart');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="gift-wizard-page" dir={isEn ? 'ltr' : 'rtl'}>
      {/* ─── HEADER BANNER ─────────────────────────────────────────────────── */}
      <div className="gift-hero-banner">
        <h1 className="gift-hero-title">
          {isEn ? 'Gift a Voucher' : 'أهدِ قسيمة'}
        </h1>
        <p className="gift-hero-sub">
          {isEn
            ? 'Design your digital gift voucher in simple steps'
            : 'صمم قسيمة هدية إلكترونية في خطوات بسيطة'}
        </p>

        {/* Gift Mode Toggle */}
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            type="button"
            onClick={() => setGiftMode('gift')}
            className={`px-5 py-2.5 rounded-full text-[13px] font-bold transition-all border ${
              giftMode === 'gift'
                ? 'bg-[#234745] text-white border-[#234745] shadow-md'
                : 'bg-white text-[#234745] border-gray-200 hover:border-[#234745]'
            }`}
          >
            🎁 {isEn ? 'Gift to Someone Else' : 'إهداء لشخص آخر'}
          </button>
          <button
            type="button"
            onClick={() => setGiftMode('self')}
            className={`px-5 py-2.5 rounded-full text-[13px] font-bold transition-all border ${
              giftMode === 'self'
                ? 'bg-[#234745] text-white border-[#234745] shadow-md'
                : 'bg-white text-[#234745] border-gray-200 hover:border-[#234745]'
            }`}
          >
            👤 {isEn ? 'Buy for Myself' : 'شراء لنفسي'}
          </button>
        </div>
      </div>

      {/* ─── 4-STEP PROGRESS BAR ───────────────────────────────────────────── */}
      <div className="gift-container">
        <div className="gift-step-bar-wrapper">
          <div className="gift-step-bar">
            <div className="gift-step-item">
              <span className={`gift-step-label ${currentStep >= 1 ? 'active' : ''}`}>
                {isEn ? 'Choose Amount' : 'إختر القيمة'}
              </span>
              <div className={`gift-step-circle ${currentStep >= 1 ? 'active' : ''}`}>1</div>
            </div>
            <div className={`gift-step-line ${currentStep >= 1 ? 'active' : ''}`} />

            <div className="gift-step-item">
              <span className={`gift-step-label ${currentStep >= 1 ? 'active' : ''}`}>
                {isEn ? 'Select Design' : 'إختر التصميم'}
              </span>
              <div className={`gift-step-circle ${currentStep >= 1 ? 'active' : ''}`}>2</div>
            </div>
            <div className={`gift-step-line ${currentStep >= 2 ? 'active' : ''}`} />

            <div className="gift-step-item">
              <span className={`gift-step-label ${currentStep >= 2 ? 'active' : ''}`}>
                {isEn ? 'Personalize' : 'أضف رسالتك'}
              </span>
              <div className={`gift-step-circle ${currentStep >= 2 ? 'active' : ''}`}>3</div>
            </div>
            <div className={`gift-step-line ${currentStep >= 3 ? 'active' : ''}`} />

            <div className="gift-step-item">
              <span className={`gift-step-label ${currentStep === 3 ? 'active' : ''}`}>
                {isEn ? 'Cart & Checkout' : 'السلة والدفع'}
              </span>
              <div className={`gift-step-circle ${currentStep === 3 ? 'active' : ''}`}>4</div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── MAIN 2-COLUMN WIZARD LAYOUT ────────────────────────────────────── */}
      <div className="gift-container">
        <div className="gift-main-grid">
          {/* ─── LEFT COLUMN: LIVE VOUCHER CARD PREVIEW ─── */}
          <div className="gift-preview-col">
            <div className="gift-preview-box">
              <span className="preview-tag">
                {isEn ? 'Live Preview' : 'معاينة مباشرة'}
              </span>

              {/* Dynamic Voucher Card */}
              <div className={`voucher-card-preview ${themeColor}`}>
                <div className="voucher-card-top">
                  <span className="voucher-brand">S A A D E D D I N</span>
                  <span className="voucher-subtext">
                    {isEn ? 'Gift Voucher Value' : 'قسيمة هدية بقيمة'}
                  </span>
                </div>

                <div className="voucher-card-amount font-en">
                  <span>{finalAmount}</span>
                  <SaudiRiyalSymbol className="h-6 w-auto text-white inline-block mr-2" />
                </div>

                {(giftMode === 'gift' ? recipientName : senderName) && (
                  <div className="voucher-card-recipient">
                    <span className="label">{isEn ? 'To:' : 'إلي:'}</span>{' '}
                    <span className="val">{giftMode === 'gift' ? recipientName : senderName}</span>
                  </div>
                )}

                {personalMessage && (
                  <p className="voucher-card-msg">{personalMessage}</p>
                )}

                <div className="voucher-card-dashed-line" />

                <div className="voucher-card-bottom">
                  <span className="code-label">{isEn ? 'Code' : 'الرمز'}</span>
                  <span className="code-val font-en">SWEET</span>
                </div>
              </div>

              {currentStep === 1 && (
                <button
                  onClick={() => setCurrentStep(2)}
                  className="gift-next-preview-btn"
                >
                  {isEn ? 'Next: Add Message →' : 'التالي : أضف رسالتك'}
                </button>
              )}
            </div>

            {/* Summary Details on Step 4 */}
            {currentStep === 3 && (
              <div className="gift-summary-mini-card">
                <div className="mini-row">
                  <span>{isEn ? 'Recipient' : 'إلي'}</span>
                  <strong>{giftMode === 'gift' ? (recipientName || 'سارة') : (senderName || 'نفسي')}</strong>
                </div>
                <div className="mini-row">
                  <span>{isEn ? 'Sender' : 'من'}</span>
                  <strong>{senderName || 'أحمد'}</strong>
                </div>
                <div className="mini-row">
                  <span>{isEn ? 'Delivery' : 'الإرسال'}</span>
                  <strong>
                    {isScheduled ? (isEn ? `Scheduled (${scheduledDate})` : `محدد (${scheduledDate})`) : (isEn ? 'Instant' : 'فوري')}
                  </strong>
                </div>
                <div className="mini-row">
                  <span>{isEn ? 'Amount' : 'المبلغ'}</span>
                  <span className="font-en">{finalAmount.toFixed(2)} {isEn ? 'SAR' : 'ر.س'}</span>
                </div>
                <div className="mini-row">
                  <span>{isEn ? 'VAT (15%)' : 'ضريبة القيمة المضافة (15%)'}</span>
                  <span className="font-en">{vatAmount.toFixed(2)} {isEn ? 'SAR' : 'ر.س'}</span>
                </div>
                <div className="mini-divider" />
                <div className="mini-row total">
                  <span>{isEn ? 'Total' : 'الإجمالي'}</span>
                  <strong className="font-en">
                    {totalAmount.toFixed(2)} {isEn ? 'SAR' : 'ر.س'}
                  </strong>
                </div>
              </div>
            )}
          </div>

          {/* ─── RIGHT COLUMN: WIZARD FORM STEPS ─── */}
          <div className="gift-form-col">
            {/* ── STEP 1 & 2: Select Amount & Design ── */}
            {currentStep === 1 && (
              <div className="gift-step-card">
                {/* 1- Select Amount */}
                <div className="gift-step-block">
                  <h2 className="gift-block-title">
                    {isEn ? '1- Choose Voucher Amount' : '1- اختر قيمة القسيمة'}
                  </h2>
                  <div className="amounts-grid font-en">
                    {[50, 100, 200, 500, 1000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          setSelectedAmount(amt);
                          setIsCustomAmount(false);
                        }}
                        className={`amount-pill ${!isCustomAmount && selectedAmount === amt ? 'selected' : ''}`}
                      >
                        {!isCustomAmount && selectedAmount === amt && (
                          <span className="check-icon">✓</span>
                        )}
                        {amt} {isEn ? 'SAR' : 'ر.س'}
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => setIsCustomAmount(true)}
                      className={`amount-pill ${isCustomAmount ? 'selected' : ''}`}
                    >
                      {isCustomAmount && <span className="check-icon">✓</span>}
                      {isEn ? 'Custom Amount' : 'مبلغ آخر'}
                    </button>
                  </div>

                  {isCustomAmount && (
                    <div className="custom-amount-box mt-3">
                      <input
                        type="number"
                        placeholder={isEn ? "Enter amount in SAR" : "أدخل المبلغ بالريال"}
                        value={customAmountInput}
                        onChange={(e) => setCustomAmountInput(e.target.value)}
                        className="custom-amount-input font-en"
                        dir="ltr"
                      />
                    </div>
                  )}
                </div>

                {/* 2- Select Design & Occasion */}
                <div className="gift-step-block">
                  <h2 className="gift-block-title">
                    {isEn ? '2- Choose Design & Occasion' : '2- اختر التصميم والمناسبة'}
                  </h2>

                  <div className="occasions-row">
                    {['عيد ميلاد', 'زفاف', 'العيد', 'تخرج', 'شكراً'].map(
                      (occ) => (
                        <button
                          key={occ}
                          type="button"
                          onClick={() => setOccasion(occ)}
                          className={`occasion-chip ${occasion === occ ? 'active' : ''}`}
                        >
                          {occ}
                        </button>
                      ),
                    )}
                  </div>

                  <div className="themes-grid">
                    <div
                      onClick={() => setThemeColor('cream')}
                      className={`theme-card cream ${themeColor === 'cream' ? 'active' : ''}`}
                    >
                      {themeColor === 'cream' && <span className="check">✓</span>}
                    </div>

                    <div
                      onClick={() => setThemeColor('gold')}
                      className={`theme-card gold ${themeColor === 'gold' ? 'active' : ''}`}
                    >
                      {themeColor === 'gold' && <span className="check">✓</span>}
                    </div>

                    <div
                      onClick={() => setThemeColor('green')}
                      className={`theme-card green ${themeColor === 'green' ? 'active' : ''}`}
                    >
                      {themeColor === 'green' && <span className="check">✓</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 3: Add Message Form ── */}
            {currentStep === 2 && (
              <div className="gift-step-card">
                <div className="gift-card-header">
                  <div className="header-circle">3</div>
                  <h2 className="header-title">
                    {isEn ? 'Add Your Message' : 'أضف رسالتك'}
                  </h2>
                </div>

                <div className="gift-fields-stack">
                  {/* Sender Name */}
                  <div className="gift-field">
                    <label className="gift-label">
                      {isEn ? 'Sender Name' : 'إسم المرسل'} <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="أحمد"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      className="gift-input"
                    />
                  </div>

                  {/* Recipient Fields (Only for Gift mode) */}
                  {giftMode === 'gift' && (
                    <>
                      <div className="gift-field">
                        <label className="gift-label">
                          {isEn ? 'Recipient Name' : 'إسم المستلم'} <span className="req">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="سارة"
                          value={recipientName}
                          onChange={(e) => setRecipientName(e.target.value)}
                          className="gift-input"
                        />
                      </div>

                      <div className="gift-field">
                        <label className="gift-label">
                          {isEn ? 'Recipient Email' : 'البريد الإلكتروني للمستلم'} <span className="req">*</span>
                        </label>
                        <input
                          type="email"
                          placeholder="sara@example.com"
                          value={recipientEmail}
                          onChange={(e) => setRecipientEmail(e.target.value)}
                          className="gift-input font-en"
                          dir="ltr"
                        />
                      </div>

                      <div className="gift-field">
                        <label className="gift-label">
                          {isEn ? 'Recipient Phone (SMS notification)' : 'رقم جوال المستلم (اختياري - لإشعار SMS)'}
                        </label>
                        <div className="phone-input-row" dir="ltr">
                          <span className="code">+966</span>
                          <input
                            type="tel"
                            placeholder="500000000"
                            value={recipientPhone}
                            onChange={(e) => setRecipientPhone(e.target.value)}
                            className="phone-input font-en"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Personal Message */}
                  <div className="gift-field">
                    <label className="gift-label">
                      {isEn ? 'Personal Message' : 'رسالتك الشخصية'}
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
                    <span className="char-counter font-en">
                      {personalMessage.length}/150 {isEn ? 'chars' : 'حرف'}
                    </span>

                    <div className="quick-msgs-row">
                      {quickMessages.map((msg) => (
                        <button
                          key={msg}
                          type="button"
                          onClick={() => setPersonalMessage(msg)}
                          className="quick-chip"
                        >
                          {msg}
                        </button>
                      ))}
                    </div>
                  </div>

                  {giftMode === 'gift' && (
                    <div className="checkbox-field">
                      <input
                        type="checkbox"
                        id="scheduleCheck"
                        checked={isScheduled}
                        onChange={(e) => setIsScheduled(e.target.checked)}
                      />
                      <label htmlFor="scheduleCheck">
                        {isEn ? 'Schedule delivery date' : 'إرسال في موعد محدد'}
                      </label>
                    </div>
                  )}

                  {giftMode === 'gift' && isScheduled && (
                    <div className="gift-field">
                      <input
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="gift-input font-en"
                      />
                    </div>
                  )}

                  <div className="step-actions-row">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="btn-next-step"
                    >
                      {isEn ? 'Next: Review & Cart →' : 'التالي، مراجعة السلة ←'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="btn-back-step"
                    >
                      {isEn ? '← Back' : '→ رجوع'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 4: Confirmation & Add Real Gift Card to Cart ── */}
            {currentStep === 3 && (
              <div className="gift-step-card">
                <div className="gift-card-header">
                  <div className="header-circle">4</div>
                  <h2 className="header-title">
                    {isEn ? 'Confirm & Add to Cart' : 'تأكيد القسيمة وإضافتها للسلة'}
                  </h2>
                </div>

                <div className="checkout-notice-box">
                  <p className="notice-text">
                    {isEn
                      ? 'Your custom gift voucher will be added directly to your Cart.'
                      : 'سيتم إضافة قسيمة الهدية المخصصة مباشرة إلى سلة التسوق إلكترونياً.'}
                  </p>
                </div>

                <div className="order-summary-box">
                  <h3 className="summary-h3">
                    {isEn ? 'Voucher Summary' : 'ملخص القسيمة'}
                  </h3>
                  <div className="summary-row">
                    <span>{isEn ? 'Voucher Amount:' : 'قيمة القسيمة:'}</span>
                    <strong className="font-en">
                      {finalAmount.toFixed(2)} {isEn ? 'SAR' : 'ر.س'}
                    </strong>
                  </div>
                  <div className="summary-row">
                    <span>{isEn ? 'Recipient:' : 'المستلم:'}</span>
                    <strong>{giftMode === 'gift' ? (recipientName || 'سارة') : (senderName || 'نفسي')}</strong>
                  </div>
                  <div className="summary-row">
                    <span>{isEn ? 'Sender:' : 'المرسل:'}</span>
                    <strong>{senderName || 'أحمد'}</strong>
                  </div>
                </div>

                <div className="checkbox-field mt-4">
                  <input
                    type="checkbox"
                    id="termsCheck"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                  />
                  <label htmlFor="termsCheck">
                    {isEn ? 'I agree to the gift voucher terms and conditions' : 'أوافق على الشروط والأحكام الخاصة بالقسائم'}
                  </label>
                </div>

                <div className="step-actions-row flex-col gap-3 mt-6">
                  <button
                    type="button"
                    onClick={handleCheckoutSubmit}
                    disabled={isSubmitting || !agreeTerms}
                    className="btn-checkout-submit"
                  >
                    {isSubmitting
                      ? (isEn ? 'Adding Gift Card to Cart...' : 'جاري إضافة القسيمة للسلة...')
                      : (isEn ? `Add Gift Card to Cart - ${totalAmount.toFixed(2)} SAR` : `إضافة القسيمة للسلة - ${totalAmount.toFixed(2)} ر.س`)}
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="btn-back-step"
                  >
                    {isEn ? '← Back to edit message' : '→ رجوع وتعديل الرسالة'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <GiftWizardStyles />
    </div>
  );
}

// ─── Scoped CSS ───────────────────────────────────────────────────────────

function GiftWizardStyles() {
  return (
    <style>{`
      .gift-wizard-page {
        background: #fbf9f4;
        min-height: 100vh;
        font-family: 'GE Dinar One', 'Bahij Janna', sans-serif;
        color: #2d3748;
        padding-bottom: 80px;
      }
      .gift-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 20px;
      }

      .gift-hero-banner {
        background: #ffffff;
        text-align: center;
        padding: 36px 20px;
        margin-bottom: 24px;
        border-bottom: 1px solid #edf2f7;
      }
      .gift-hero-title {
        font-family: 'Bahij Janna', sans-serif;
        font-size: 32px;
        font-weight: 700;
        color: #1a3b3a;
        margin-bottom: 4px;
      }
      .gift-hero-sub {
        font-size: 14px;
        color: #718096;
      }

      .gift-step-bar-wrapper { margin-bottom: 36px; }
      .gift-step-bar {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
      }
      .gift-step-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
      }
      .gift-step-label {
        font-size: 12px;
        color: #a0aec0;
        font-weight: 600;
      }
      .gift-step-label.active { color: #234745; }
      .gift-step-circle {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #edf2f7;
        color: #718096;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 14px;
      }
      .gift-step-circle.active {
        background: #234745;
        color: #ffffff;
      }
      .gift-step-line {
        height: 2px;
        width: 60px;
        background: #edf2f7;
        margin-top: 16px;
      }
      .gift-step-line.active { background: #234745; }

      .gift-main-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 32px;
      }
      @media (max-width: 900px) {
        .gift-main-grid { grid-template-columns: 1fr; }
      }

      .gift-preview-box {
        background: #ffffff;
        border-radius: 20px;
        padding: 24px;
        border: 1px solid #e2e8f0;
        box-shadow: 0 4px 20px rgba(0,0,0,0.03);
        text-align: center;
      }
      .preview-tag {
        display: inline-block;
        font-size: 12px;
        background: #f7fafc;
        color: #718096;
        padding: 4px 12px;
        border-radius: 12px;
        margin-bottom: 16px;
        border: 1px solid #edf2f7;
      }

      .voucher-card-preview {
        border-radius: 16px;
        padding: 28px;
        color: #ffffff;
        text-align: right;
        min-height: 220px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        box-shadow: 0 10px 25px rgba(0,0,0,0.15);
        transition: all 0.3s ease;
      }
      .voucher-card-preview.green {
        background: linear-gradient(135deg, #1d3b39 0%, #234745 100%);
      }
      .voucher-card-preview.gold {
        background: linear-gradient(135deg, #8a6428 0%, #b8860b 100%);
      }
      .voucher-card-preview.cream {
        background: linear-gradient(135deg, #4a4238 0%, #635748 100%);
      }

      .voucher-brand {
        font-size: 14px;
        letter-spacing: 4px;
        font-weight: 700;
        display: block;
        opacity: 0.9;
      }
      .voucher-subtext {
        font-size: 12px;
        opacity: 0.7;
        display: block;
      }
      .voucher-card-amount {
        font-size: 36px;
        font-weight: 800;
        margin: 12px 0;
      }
      .voucher-card-recipient {
        font-size: 14px;
        font-weight: 600;
      }
      .voucher-card-msg {
        font-size: 12px;
        opacity: 0.85;
        margin-top: 4px;
      }
      .voucher-card-dashed-line {
        border-top: 1px dashed rgba(255,255,255,0.3);
        margin: 16px 0 12px 0;
      }
      .voucher-card-bottom {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        opacity: 0.8;
      }

      .gift-next-preview-btn {
        width: 100%;
        background: #234745;
        color: #ffffff;
        border: none;
        border-radius: 12px;
        padding: 14px;
        font-weight: 700;
        font-size: 14px;
        margin-top: 20px;
        cursor: pointer;
        transition: background 0.2s;
      }
      .gift-next-preview-btn:hover { background: #1a3533; }

      .gift-summary-mini-card {
        background: #ffffff;
        border-radius: 16px;
        padding: 20px;
        margin-top: 20px;
        border: 1px solid #e2e8f0;
      }
      .mini-row {
        display: flex;
        justify-content: space-between;
        font-size: 13px;
        margin-bottom: 8px;
        color: #4a5568;
      }
      .mini-divider {
        height: 1px;
        background: #edf2f7;
        margin: 12px 0;
      }
      .mini-row.total {
        font-size: 15px;
        font-weight: 700;
        color: #234745;
      }

      .gift-step-card {
        background: #ffffff;
        border-radius: 20px;
        padding: 28px;
        border: 1px solid #e2e8f0;
        box-shadow: 0 4px 20px rgba(0,0,0,0.03);
      }
      .gift-step-block { margin-bottom: 28px; }
      .gift-block-title {
        font-size: 16px;
        font-weight: 700;
        color: #234745;
        margin-bottom: 16px;
      }

      .amounts-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
      }
      .amount-pill {
        border: 1.5px solid #e2e8f0;
        background: #ffffff;
        border-radius: 12px;
        padding: 14px;
        font-size: 14px;
        font-weight: 700;
        color: #2d3748;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }
      .amount-pill.selected {
        border-color: #234745;
        background: #f0f7f6;
        color: #234745;
      }
      .check-icon { color: #234745; }

      .custom-amount-input {
        width: 100%;
        border: 1.5px solid #e2e8f0;
        border-radius: 12px;
        padding: 12px 16px;
        font-size: 14px;
        outline: none;
      }
      .custom-amount-input:focus { border-color: #234745; }

      .occasions-row {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-bottom: 16px;
      }
      .occasion-chip {
        border: 1px solid #e2e8f0;
        background: #ffffff;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 13px;
        color: #4a5568;
        cursor: pointer;
      }
      .occasion-chip.active {
        background: #234745;
        color: #ffffff;
        border-color: #234745;
      }

      .themes-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
      }
      .theme-card {
        height: 60px;
        border-radius: 12px;
        cursor: pointer;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid transparent;
      }
      .theme-card.active { border-color: #234745; }
      .theme-card.green { background: linear-gradient(135deg, #1d3b39, #234745); }
      .theme-card.gold { background: linear-gradient(135deg, #8a6428, #b8860b); }
      .theme-card.cream { background: linear-gradient(135deg, #4a4238, #635748); }
      .theme-card .check { color: #ffffff; font-weight: bold; }

      .gift-card-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 20px;
      }
      .header-circle {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: #234745;
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
      }
      .header-title {
        font-size: 18px;
        font-weight: 700;
        color: #234745;
      }

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
        font-size: 13px;
        font-weight: 600;
        color: #4a5568;
      }
      .req { color: #e53e3e; }
      .gift-input, .gift-textarea {
        width: 100%;
        border: 1.5px solid #e2e8f0;
        border-radius: 12px;
        padding: 12px 16px;
        font-size: 14px;
        outline: none;
      }
      .gift-input:focus, .gift-textarea:focus { border-color: #234745; }

      .phone-input-row {
        display: flex;
        border: 1.5px solid #e2e8f0;
        border-radius: 12px;
        overflow: hidden;
      }
      .phone-input-row .code {
        background: #edf2f7;
        padding: 12px 14px;
        font-size: 14px;
        font-weight: 600;
        color: #4a5568;
      }
      .phone-input {
        flex: 1;
        border: none;
        padding: 12px 16px;
        outline: none;
      }

      .char-counter {
        font-size: 11px;
        color: #a0aec0;
        text-align: left;
      }
      .quick-msgs-row {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 8px;
      }
      .quick-chip {
        background: #f7fafc;
        border: 1px solid #edf2f7;
        border-radius: 16px;
        padding: 6px 12px;
        font-size: 12px;
        color: #4a5568;
        cursor: pointer;
      }

      .checkbox-field {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
      }

      .step-actions-row {
        display: flex;
        gap: 12px;
        margin-top: 12px;
      }
      .btn-next-step {
        flex: 1;
        background: #234745;
        color: #ffffff;
        border: none;
        padding: 14px;
        border-radius: 12px;
        font-weight: 700;
        font-size: 14px;
        cursor: pointer;
      }
      .btn-back-step {
        background: #edf2f7;
        color: #4a5568;
        border: none;
        padding: 14px 20px;
        border-radius: 12px;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
      }

      .checkout-notice-box {
        background: #f0f7f6;
        border: 1px solid #b8d0cc;
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 20px;
      }
      .notice-text {
        font-size: 13px;
        color: #234745;
        line-height: 1.6;
      }

      .order-summary-box {
        background: #f7fafc;
        border-radius: 12px;
        padding: 16px;
      }
      .summary-h3 {
        font-size: 14px;
        font-weight: 700;
        margin-bottom: 12px;
      }
      .summary-row {
        display: flex;
        justify-content: space-between;
        font-size: 13px;
        margin-bottom: 8px;
      }

      .btn-checkout-submit {
        width: 100%;
        background: #234745;
        color: #ffffff;
        border: none;
        padding: 16px;
        border-radius: 14px;
        font-weight: 700;
        font-size: 16px;
        cursor: pointer;
      }
      .btn-checkout-submit:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    `}</style>
  );
}
