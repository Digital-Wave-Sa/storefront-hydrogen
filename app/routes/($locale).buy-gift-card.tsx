/**
 * Digital Gift Voucher Builder — 4-Step Wizard
 * Route: /buy-gift-card
 *
 * Pixel-perfect match to Figma design screenshots:
 * - Step 1 & 2: Select Amount (50, 100, 200, 500, 1000, custom) & Design/Occasion (عيد ميلاد, زفاف, العيد, تخرج, شكراً)
 * - Step 3: Add Message (Sender Name, Recipient Name, Recipient Email, Recipient Phone, Quick Message Chips, Scheduled Date)
 * - Step 4: Confirmation & Shopify Checkout (Replaces payment form with Shopify Checkout redirect as payment is handled via Shopify Checkout)
 * - Live interactive preview card updating in real time
 */

import {useState} from 'react';
import {useLocation, Link, useNavigate} from 'react-router';
import type {MetaFunction} from 'react-router';
import {SaudiRiyalSymbol} from '~/components/Price';

export const meta: MetaFunction = () => [
  {title: 'أهدِ قسيمة | حلويات سعد الدين'},
];

export default function BuyGiftCard() {
  const {pathname} = useLocation();
  const isEn = pathname.startsWith('/en');
  const navigate = useNavigate();

  // Wizard Step: 1 = Amount & Design, 2 = Add Message, 3 = Confirmation & Checkout
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
      // Add gift voucher to Shopify Cart and redirect to Shopify Checkout
      const formData = new FormData();
      const lineItem = {
        action: 'LinesAdd',
        inputs: {
          lines: [
            {
              merchandiseId: 'gid://shopify/ProductVariant/default', // fallback
              quantity: 1,
              attributes: [
                {key: '_gift_voucher', value: 'true'},
                {key: 'Voucher Amount', value: `${finalAmount} SAR`},
                {key: 'Recipient Name', value: recipientName},
                {key: 'Recipient Email', value: recipientEmail},
                {key: 'Recipient Phone', value: recipientPhone},
                {key: 'Sender Name', value: senderName},
                {key: 'Personal Message', value: personalMessage},
                {key: 'Occasion', value: occasion},
              ],
            },
          ],
        },
      };

      formData.append('cartFormInput', JSON.stringify(lineItem));

      const res = await fetch('/cart', {
        method: 'POST',
        body: formData,
      });

      const data = (await res.json()) as any;
      const checkoutUrl = data?.cart?.checkoutUrl || '/cart';
      window.location.href = checkoutUrl;
    } catch {
      // Fallback to cart page
      navigate('/cart');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="gift-wizard-page" dir="rtl">
      {/* ─── HEADER BANNER ─────────────────────────────────────────────────── */}
      <div className="gift-hero-banner">
        <h1 className="gift-hero-title">أهدِ قسيمة</h1>
        <p className="gift-hero-sub">صمم قسيمة هدية في 4 خطوات بسيطة</p>
      </div>

      {/* ─── 4-STEP PROGRESS BAR ───────────────────────────────────────────── */}
      <div className="gift-container">
        <div className="gift-step-bar-wrapper">
          <div className="gift-step-bar">
            {/* Step 1 & 2: Amount & Design */}
            <div className="gift-step-item">
              <span
                className={`gift-step-label ${currentStep >= 1 ? 'active' : ''}`}
              >
                إختر القيمة
              </span>
              <div
                className={`gift-step-circle ${currentStep >= 1 ? 'active' : ''}`}
              >
                1
              </div>
            </div>
            <div
              className={`gift-step-line ${currentStep >= 1 ? 'active' : ''}`}
            />

            <div className="gift-step-item">
              <span
                className={`gift-step-label ${currentStep >= 1 ? 'active' : ''}`}
              >
                إختر التصميم
              </span>
              <div
                className={`gift-step-circle ${currentStep >= 1 ? 'active' : ''}`}
              >
                2
              </div>
            </div>
            <div
              className={`gift-step-line ${currentStep >= 2 ? 'active' : ''}`}
            />

            {/* Step 3: Message */}
            <div className="gift-step-item">
              <span
                className={`gift-step-label ${currentStep >= 2 ? 'active' : ''}`}
              >
                أضف رسالتك
              </span>
              <div
                className={`gift-step-circle ${currentStep >= 2 ? 'active' : ''}`}
              >
                3
              </div>
            </div>
            <div
              className={`gift-step-line ${currentStep >= 3 ? 'active' : ''}`}
            />

            {/* Step 4: Checkout */}
            <div className="gift-step-item">
              <span
                className={`gift-step-label ${currentStep === 3 ? 'active' : ''}`}
              >
                الدفع والارسال
              </span>
              <div
                className={`gift-step-circle ${currentStep === 3 ? 'active' : ''}`}
              >
                4
              </div>
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
              <span className="preview-tag">معاينة مباشرة</span>

              {/* Dynamic Voucher Card */}
              <div className={`voucher-card-preview ${themeColor}`}>
                <div className="voucher-card-top">
                  <span className="voucher-brand">S A A D E D D I N</span>
                  <span className="voucher-subtext">قسيمة هدية بقيمة</span>
                </div>

                <div className="voucher-card-amount font-en">
                  <span>{finalAmount}</span>
                  <SaudiRiyalSymbol className="h-6 w-auto text-white inline-block mr-2" />
                </div>

                {recipientName && (
                  <div className="voucher-card-recipient">
                    <span className="label">إلي :</span>{' '}
                    <span className="val">{recipientName}</span>
                  </div>
                )}

                {personalMessage && (
                  <p className="voucher-card-msg">{personalMessage}</p>
                )}

                <div className="voucher-card-dashed-line" />

                <div className="voucher-card-bottom">
                  <span className="code-label">الرمز</span>
                  <span className="code-val font-en">SWEET</span>
                </div>
              </div>

              {/* Action Button Below Preview Card */}
              {currentStep === 1 && (
                <button
                  onClick={() => setCurrentStep(2)}
                  className="gift-next-preview-btn"
                >
                  التالي : أضف رسالتك
                </button>
              )}
            </div>

            {/* Summary Details on Step 4 */}
            {currentStep === 3 && (
              <div className="gift-summary-mini-card">
                <div className="mini-row">
                  <span>إلي</span>
                  <strong>{recipientName || 'سارة'}</strong>
                </div>
                <div className="mini-row">
                  <span>من</span>
                  <strong>{senderName || 'أحمد'}</strong>
                </div>
                <div className="mini-row">
                  <span>الإرسال</span>
                  <strong>
                    {isScheduled ? `محدد (${scheduledDate})` : 'فوري'}
                  </strong>
                </div>
                <div className="mini-row">
                  <span>المبلغ</span>
                  <span className="font-en">{finalAmount.toFixed(2)} ر.س</span>
                </div>
                <div className="mini-row">
                  <span>ضريبة القيمة المضافة (15%)</span>
                  <span className="font-en">{vatAmount.toFixed(2)} ر.س</span>
                </div>
                <div className="mini-divider" />
                <div className="mini-row total">
                  <span>الإجمالي</span>
                  <strong className="font-en">
                    {totalAmount.toFixed(2)} ر.س
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
                  <h2 className="gift-block-title">1- أختر قيمة القيمة ؟</h2>
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
                        {amt} ر.س
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => setIsCustomAmount(true)}
                      className={`amount-pill ${isCustomAmount ? 'selected' : ''}`}
                    >
                      {isCustomAmount && <span className="check-icon">✓</span>}
                      مبلغ اخر
                    </button>
                  </div>

                  {isCustomAmount && (
                    <div className="custom-amount-box mt-3">
                      <input
                        type="number"
                        placeholder="أدخل المبلغ بالريال"
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
                    2- أختر التصميم والمناسبة ؟
                  </h2>

                  {/* Category Tags */}
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

                  {/* Theme Color Cards */}
                  <div className="themes-grid">
                    <div
                      onClick={() => setThemeColor('cream')}
                      className={`theme-card cream ${themeColor === 'cream' ? 'active' : ''}`}
                    >
                      {themeColor === 'cream' && (
                        <span className="check">✓</span>
                      )}
                    </div>

                    <div
                      onClick={() => setThemeColor('gold')}
                      className={`theme-card gold ${themeColor === 'gold' ? 'active' : ''}`}
                    >
                      {themeColor === 'gold' && (
                        <span className="check">✓</span>
                      )}
                    </div>

                    <div
                      onClick={() => setThemeColor('green')}
                      className={`theme-card green ${themeColor === 'green' ? 'active' : ''}`}
                    >
                      {themeColor === 'green' && (
                        <span className="check">✓</span>
                      )}
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
                  <h2 className="header-title">أضف رسالتك</h2>
                </div>

                <div className="gift-fields-stack">
                  {/* Sender Name */}
                  <div className="gift-field">
                    <label className="gift-label">
                      إسم المرسل <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="أحمد"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      className="gift-input"
                      dir="rtl"
                    />
                  </div>

                  {/* Recipient Name */}
                  <div className="gift-field">
                    <label className="gift-label">
                      إسم المستلم <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="سارة"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      className="gift-input"
                      dir="rtl"
                    />
                  </div>

                  {/* Recipient Email */}
                  <div className="gift-field">
                    <label className="gift-label">
                      البريد الإلكتروني للمستلم <span className="req">*</span>
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

                  {/* Recipient Phone (Optional SMS) */}
                  <div className="gift-field">
                    <label className="gift-label">
                      رقم جوال المستلم (اختياري - لإشعار sms)
                    </label>
                    <div className="phone-input-row" dir="ltr">
                      <span className="code">+966</span>
                      <input
                        type="tel"
                        placeholder="123152"
                        value={recipientPhone}
                        onChange={(e) => setRecipientPhone(e.target.value)}
                        className="phone-input font-en"
                      />
                    </div>
                  </div>

                  {/* Personal Message */}
                  <div className="gift-field">
                    <label className="gift-label">رسالتك الشخصية</label>
                    <textarea
                      placeholder="كل عام وانت بخير"
                      value={personalMessage}
                      onChange={(e) =>
                        setPersonalMessage(e.target.value.slice(0, 150))
                      }
                      rows={3}
                      className="gift-textarea"
                      dir="rtl"
                    />
                    <span className="char-counter font-en">
                      {personalMessage.length}/150 حرف
                    </span>

                    {/* Quick Message Chips */}
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

                  {/* Schedule Delivery Checkbox */}
                  <div className="checkbox-field">
                    <input
                      type="checkbox"
                      id="scheduleCheck"
                      checked={isScheduled}
                      onChange={(e) => setIsScheduled(e.target.checked)}
                    />
                    <label htmlFor="scheduleCheck">إرسال في موعد محدد</label>
                  </div>

                  {isScheduled && (
                    <div className="gift-field">
                      <input
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="gift-input font-en"
                      />
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="step-actions-row">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="btn-next-step"
                    >
                      التالي، الدفع ←
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="btn-back-step"
                    >
                      → رجوع
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 4: Confirmation & Shopify Checkout Redirect ── */}
            {currentStep === 3 && (
              <div className="gift-step-card">
                <div className="gift-card-header">
                  <div className="header-circle">4</div>
                  <h2 className="header-title">تأكيد الطلب والدفع</h2>
                </div>

                <div className="checkout-notice-box">
                  <p className="notice-text">
                    سيتم تحويلك فوراً إلى <strong>Shopify Checkout</strong>{' '}
                    لإتمام عملية الشراء والدفع بأمان تام.
                  </p>
                </div>

                <div className="order-summary-box">
                  <h3 className="summary-h3">ملخص القسيمة</h3>
                  <div className="summary-row">
                    <span>قيمة القسيمة:</span>
                    <strong className="font-en">
                      {finalAmount.toFixed(2)} ر.س
                    </strong>
                  </div>
                  <div className="summary-row">
                    <span>المستلم:</span>
                    <strong>{recipientName || 'سارة'}</strong>
                  </div>
                  <div className="summary-row">
                    <span>المرسل:</span>
                    <strong>{senderName || 'أحمد'}</strong>
                  </div>
                </div>

                {/* Terms Agreement Checkbox */}
                <div className="checkbox-field mt-4">
                  <input
                    type="checkbox"
                    id="termsCheck"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                  />
                  <label htmlFor="termsCheck">
                    أوافق علي الشروط والأحكام الخاصة بالقسائم
                  </label>
                </div>

                {/* Submit / Proceed Button */}
                <div className="step-actions-row flex-col gap-3 mt-6">
                  <button
                    type="button"
                    onClick={handleCheckoutSubmit}
                    disabled={isSubmitting || !agreeTerms}
                    className="btn-checkout-submit"
                  >
                    {isSubmitting
                      ? 'جاري التحويل لدفع Shopify Checkout...'
                      : `ادفع وأرسل القسيمة - ${totalAmount.toFixed(2)} ر.س`}
                  </button>

                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="btn-back-step"
                  >
                    → رجوع وتعديل الرسالة
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

      /* Hero Banner */
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

      /* Step Bar */
      .gift-step-bar-wrapper { margin-bottom: 36px; }
      .gift-step-bar {
        display: flex;
        align-items: center;
        justify-content: center;
        max-width: 700px;
        margin: 0 auto;
        direction: rtl;
      }
      .gift-step-item { display: flex; align-items: center; gap: 8px; }
      .gift-step-circle {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: #e2e8f0;
        color: #718096;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 14px;
        font-family: 'Inter', sans-serif;
      }
      .gift-step-circle.active {
        background: #234745;
        color: #ffffff;
      }
      .gift-step-label {
        font-size: 13px;
        color: #718096;
        white-space: nowrap;
      }
      .gift-step-label.active {
        color: #234745;
        font-weight: 700;
      }
      .gift-step-line {
        flex: 1;
        height: 2px;
        background: #e2e8f0;
        margin: 0 12px;
      }
      .gift-step-line.active {
        background: #C5A96A;
      }

      /* Main Grid */
      .gift-main-grid {
        display: grid;
        grid-template-columns: 420px 1fr;
        gap: 32px;
        align-items: start;
      }
      @media (max-width: 900px) {
        .gift-main-grid { grid-template-columns: 1fr; }
        .gift-preview-col { order: -1; }
      }

      /* Preview Box */
      .gift-preview-box {
        background: #fdfaf3;
        border-radius: 20px;
        padding: 24px;
        border: 1px solid #e2e8f0;
        text-align: center;
      }
      .preview-tag {
        font-size: 12px;
        color: #718096;
        display: block;
        margin-bottom: 16px;
      }

      /* Voucher Card Preview */
      .voucher-card-preview {
        border-radius: 18px;
        padding: 24px;
        color: #ffffff;
        text-align: right;
        min-height: 200px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        box-shadow: 0 4px 16px rgba(0,0,0,0.1);
        margin-bottom: 20px;
        transition: all 0.3s;
      }
      .voucher-card-preview.green { background: #234745; }
      .voucher-card-preview.gold { background: #C5A96A; }
      .voucher-card-preview.cream { background: #5c4e3b; }

      .voucher-card-top { display: flex; justify-content: space-between; align-items: center; }
      .voucher-brand { font-size: 12px; font-weight: 700; letter-spacing: 2px; }
      .voucher-subtext { font-size: 11px; opacity: 0.8; }

      .voucher-card-amount { font-size: 38px; font-weight: 800; margin: 12px 0; }
      .voucher-card-recipient { font-size: 13px; margin-bottom: 4px; }
      .voucher-card-msg { font-size: 12px; opacity: 0.9; margin-bottom: 12px; }

      .voucher-card-dashed-line { border-top: 1px dashed rgba(255,255,255,0.3); margin: 8px 0; }
      .voucher-card-bottom { display: flex; justify-content: space-between; font-size: 12px; }

      .gift-next-preview-btn {
        width: 100%;
        height: 46px;
        background: #234745;
        color: #ffffff;
        border: none;
        border-radius: 12px;
        font-family: 'GE Dinar One', sans-serif;
        font-size: 15px;
        font-weight: 700;
        cursor: pointer;
        transition: background 0.2s;
      }
      .gift-next-preview-btn:hover { background: #1a3432; }

      .gift-summary-mini-card {
        background: #ffffff;
        border-radius: 16px;
        padding: 20px;
        border: 1px solid #edf2f7;
        margin-top: 16px;
      }
      .mini-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px; }
      .mini-row.total { font-size: 16px; color: #234745; margin-top: 8px; }
      .mini-divider { height: 1px; background: #edf2f7; margin: 10px 0; }

      /* Form Col */
      .gift-step-card {
        background: #ffffff;
        border-radius: 20px;
        padding: 32px;
        border: 1px solid #edf2f7;
        box-shadow: 0 2px 8px rgba(0,0,0,0.03);
      }
      .gift-step-block { margin-bottom: 28px; }
      .gift-block-title { font-family: 'Bahij Janna', sans-serif; font-size: 18px; font-weight: 700; color: #2d3748; margin-bottom: 16px; }

      .amounts-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
      @media (max-width: 640px) { .amounts-grid { grid-template-columns: 1fr 1fr; } }
      .amount-pill {
        height: 48px;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        background: #ffffff;
        font-size: 14px;
        font-weight: 700;
        color: #2d3748;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        transition: all 0.2s;
      }
      .amount-pill.selected { background: #fcf6e8; border-color: #234745; color: #234745; }

      .custom-amount-input {
        width: 100%;
        height: 46px;
        border: 1px solid #234745;
        border-radius: 10px;
        padding: 0 14px;
        font-size: 14px;
        outline: none;
      }

      .occasions-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
      .occasion-chip {
        padding: 8px 18px;
        border-radius: 12px;
        border: 1px solid #e2e8f0;
        background: #ffffff;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .occasion-chip.active { background: #234745; color: #ffffff; border-color: #234745; }

      .themes-grid { display: flex; gap: 12px; }
      .theme-card {
        width: 60px;
        height: 60px;
        border-radius: 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        font-weight: 700;
        border: 2px solid transparent;
      }
      .theme-card.green { background: #234745; }
      .theme-card.gold { background: #C5A96A; }
      .theme-card.cream { background: #5c4e3b; }
      .theme-card.active { border-color: #234745; transform: scale(1.05); }

      /* Form Fields */
      .gift-card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 24px; }
      .header-circle {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #234745;
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
      }
      .header-title { font-family: 'Bahij Janna', sans-serif; font-size: 20px; font-weight: 700; color: #234745; }

      .gift-fields-stack { display: flex; flex-direction: column; gap: 16px; }
      .gift-field { display: flex; flex-direction: column; gap: 6px; text-align: right; }
      .gift-label { font-size: 13px; color: #4a5568; font-weight: 600; }
      .gift-label .req { color: #e53e3e; }
      .gift-input, .gift-textarea {
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 12px 16px;
        font-size: 14px;
        font-family: 'GE Dinar One', sans-serif;
        outline: none;
      }
      .gift-input { height: 48px; }
      .phone-input-row { display: flex; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
      .phone-input-row .code { padding: 0 14px; background: #f7fafc; display: flex; align-items: center; font-size: 13px; border-right: 1px solid #e2e8f0; }
      .phone-input-row .phone-input { flex: 1; height: 48px; border: none; padding: 0 14px; outline: none; }

      .char-counter { font-size: 11px; color: #a0aec0; text-align: right; }
      .quick-msgs-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
      .quick-chip {
        font-size: 11px;
        padding: 4px 10px;
        border-radius: 10px;
        border: 1px solid #e2e8f0;
        background: #f7fafc;
        cursor: pointer;
      }

      .checkbox-field { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #4a5568; cursor: pointer; }
      .step-actions-row { display: flex; gap: 12px; margin-top: 16px; }
      .btn-next-step {
        flex: 1;
        height: 48px;
        background: #234745;
        color: #ffffff;
        border: none;
        border-radius: 12px;
        font-family: 'GE Dinar One', sans-serif;
        font-size: 15px;
        font-weight: 700;
        cursor: pointer;
      }
      .btn-back-step {
        padding: 0 20px;
        height: 48px;
        background: none;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        font-family: 'GE Dinar One', sans-serif;
        font-size: 14px;
        color: #718096;
        cursor: pointer;
      }

      /* Step 4 Checkout Confirmation */
      .checkout-notice-box {
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 20px;
        text-align: right;
      }
      .notice-text { font-size: 13px; color: #166534; }
      .order-summary-box {
        background: #f7fafc;
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 16px;
      }
      .summary-h3 { font-size: 15px; font-weight: 700; color: #2d3748; margin-bottom: 12px; text-align: right; }
      .summary-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px; }

      .btn-checkout-submit {
        width: 100%;
        height: 52px;
        background: #234745;
        color: #ffffff;
        border: none;
        border-radius: 12px;
        font-family: 'GE Dinar One', sans-serif;
        font-size: 16px;
        font-weight: 700;
        cursor: pointer;
        transition: background 0.2s;
      }
      .btn-checkout-submit:hover:not(:disabled) { background: #1a3432; }
      .btn-checkout-submit:disabled { opacity: 0.5; cursor: not-allowed; }
    `}</style>
  );
}
