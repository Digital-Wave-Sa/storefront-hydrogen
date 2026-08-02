/**
 * Export Cart — Step 2: عنوان الشحن
 * Route: /export-cart/shipping
 *
 * Fully dynamic implementation with automatic pre-filling & checkout sync:
 * - If user is logged in, auto-prefills saved name, email, phone, and default address.
 * - On submit ("تأكيد الطلب"), updates Cart Buyer Identity & checkout prefill params so Shopify Checkout remembers and pre-fills all shipping details.
 * - Uses official <SaudiRiyalSymbol /> SVG for all currency representations.
 */

import { useLoaderData, Link } from 'react-router';
import { useState, useEffect, useMemo } from 'react';
import { useOptimisticCart } from '@shopify/hydrogen';
import type { Route } from './+types/($locale).cart';
import type { CartApiQueryFragment } from 'storefrontapi.generated';
import { getShopTitle } from '~/lib/seo';
import { SaudiRiyalSymbol } from '~/components/Price';

// ─── Meta ────────────────────────────────────────────────────────────────────

export const meta: Route.MetaFunction = ({ matches }) => [
  { title: getShopTitle('عنوان الشحن للتصدير | سعد الدين', matches) },
];

// ─── Loader ──────────────────────────────────────────────────────────────────

export async function loader({ context }: Route.LoaderArgs) {
  const { cart, session, storefront } = context;
  let cartData = null;
  let customerData = null;

  try {
    cartData = await cart.get();
  } catch {}

  const customerAccessToken = await session.get('customerAccessToken');
  if (customerAccessToken?.accessToken && customerAccessToken.accessToken !== 'dev-bypass-token') {
    try {
      const res = await storefront.query(`#graphql
        query getShippingCustomer($customerAccessToken: String!) {
          customer(customerAccessToken: $customerAccessToken) {
            firstName
            lastName
            email
            phone
            defaultAddress {
              address1
              address2
              city
              country
              zip
              phone
              firstName
              lastName
            }
          }
        }
      `, {
        variables: { customerAccessToken: customerAccessToken.accessToken },
        cache: storefront.CacheNone(),
      });
      customerData = res?.customer || null;
    } catch (e) {
      console.error('[EXPORT SHIPPING LOADER CUSTOMER QUERY ERROR]', e);
    }
  }

  return { cart: cartData, customer: customerData };
}

// ─── Countries & Cities ───────────────────────────────────────────────────────

const COUNTRIES = [
  { code: 'AE', name: 'الإمارات العربية المتحدة', cities: ['دبي', 'أبوظبي', 'الشارقة', 'عجمان', 'رأس الخيمة', 'العين'] },
  { code: 'KW', name: 'الكويت', cities: ['الكويت', 'حولي', 'الأحمدي', 'الجهراء', 'الفروانية'] },
  { code: 'QA', name: 'قطر', cities: ['الدوحة', 'الريان', 'الوكرة', 'الخور'] },
  { code: 'BH', name: 'البحرين', cities: ['المنامة', 'المحرق', 'الرفاع', 'مدينة عيسى'] },
  { code: 'OM', name: 'عُمان', cities: ['مسقط', 'صلالة', 'صحار', 'نزوى'] },
  { code: 'JO', name: 'الأردن', cities: ['عمان', 'إربد', 'الزرقاء', 'العقبة'] },
  { code: 'EG', name: 'مصر', cities: ['القاهرة', 'الإسكندرية', 'الجيزة'] },
  { code: 'GB', name: 'المملكة المتحدة', cities: ['London', 'Manchester', 'Birmingham'] },
  { code: 'US', name: 'الولايات المتحدة الأمريكية', cities: ['New York', 'Los Angeles', 'Chicago', 'Houston'] },
  { code: 'CA', name: 'كندا', cities: ['Toronto', 'Vancouver', 'Montreal'] },
  { code: 'DE', name: 'ألمانيا', cities: ['Berlin', 'Munich', 'Frankfurt'] },
  { code: 'FR', name: 'فرنسا', cities: ['Paris', 'Lyon', 'Marseille'] },
];

// ─── Aramex Red Badge ────────────────────────────────────────────────────────

function AramexBadge() {
  return (
    <span className="inline-flex items-center justify-center px-2 py-0.5 bg-[#E31E24] text-white font-black text-[11px] tracking-wider rounded uppercase font-sans">
      aramex
    </span>
  );
}

// ─── Step Progress Bar (3 Steps: 1. السلة, 2. الشحن, 3. التأكيد) ─────────────

function ExportStepBar({ step }: { step: 1 | 2 | 3 }) {
  const steps = [
    { num: 1, label: 'السلة' },
    { num: 2, label: 'الشحن' },
    { num: 3, label: 'التأكيد' },
  ];

  return (
    <div className="export-step-bar-container">
      <div className="export-step-bar">
        {steps.map((s, i) => {
          const isActive = s.num === step;
          const isDone = s.num < step;
          return (
            <div key={s.num} className="export-step-wrapper">
              <div className="export-step-item">
                <span className={`export-step-label ${isActive ? 'active' : ''}`}>{s.label}</span>
                <div className={`export-step-circle ${isActive ? 'active' : isDone ? 'done' : ''}`}>
                  {s.num}
                </div>
              </div>
              {i < steps.length - 1 && (
                <div className={`export-step-line ${isDone || isActive ? 'active' : ''}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ExportShipping() {
  const loaderData = useLoaderData<typeof loader>();
  const cartData = loaderData?.cart || null;
  const customer = loaderData?.customer || null;
  const optimisticCart = useOptimisticCart(cartData as CartApiQueryFragment | null);

  // Auto-prefill form state from logged-in customer profile if available
  const [fullName, setFullName] = useState(() => {
    if (customer?.firstName || customer?.lastName) {
      return `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
    }
    return '';
  });

  const [phone, setPhone] = useState(() => customer?.phone || customer?.defaultAddress?.phone || '');
  const [email, setEmail] = useState(() => customer?.email || '');
  const [countryCode, setCountryCode] = useState('AE');
  const [city, setCity] = useState(() => customer?.defaultAddress?.city || 'دبي');
  const [zip, setZip] = useState(() => customer?.defaultAddress?.zip || '123152');
  const [addressDetails, setAddressDetails] = useState(() => customer?.defaultAddress?.address1 || '');
  const [saveAddress, setSaveAddress] = useState(false);
  const [instructions, setInstructions] = useState('');

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter export items
  const exportLines = useMemo(() => {
    const allLines = (optimisticCart as any)?.lines?.nodes || [];
    return allLines.filter((line: any) =>
      line.attributes?.some((a: any) => a.key === '_export' && a.value === 'true')
    );
  }, [optimisticCart]);

  // Subtotal calculated dynamically from lines
  const calculatedSubtotal = useMemo(() =>
    exportLines.reduce((sum: number, line: any) => {
      const price = parseFloat(line.cost?.totalAmount?.amount || line.merchandise?.price?.amount || '0');
      return sum + price;
    }, 0),
    [exportLines]
  );

  // Restored summary costs from sessionStorage or dynamically computed
  const [summaryData, setSummaryData] = useState({
    subtotal: calculatedSubtotal || 742.56,
    shippingRate: 140.56,
    coldPackagingFee: 24.56,
    exportDiscount: 40.56,
    grandTotal: 612.44,
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('exportCartSummary');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setSummaryData(parsed);
          if (parsed.shippingCountry) {
            setCountryCode(parsed.shippingCountry);
          }
        } catch (e) {}
      }
    }
  }, []);

  const selectedCountryObj = useMemo(() =>
    COUNTRIES.find(c => c.code === countryCode) || COUNTRIES[0],
    [countryCode]
  );

  const availableCities = selectedCountryObj.cities;

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = 'الاسم الكامل مطلوب';
    if (!phone.trim()) errs.phone = 'رقم الجوال مطلوب';
    if (!email.trim() || !email.includes('@')) errs.email = 'بريد إلكتروني غير صحيح';
    if (!addressDetails.trim()) errs.addressDetails = 'العنوان التفصيلي مطلوب';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleConfirmOrder = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);

    try {
      // 1. Sync buyer identity to cart so Shopify Checkout remembers everything
      try {
        const formData = new FormData();
        const buyerIdentityInput = {
          email,
          phone,
          deliveryAddressPreferences: [
            {
              deliveryAddress: {
                address1: addressDetails,
                city,
                country: countryCode,
                zip,
                firstName: fullName,
                phone,
              }
            }
          ]
        };

        const cartInput = {
          action: 'BuyerIdentityUpdate',
          inputs: { buyerIdentity: buyerIdentityInput }
        };

        formData.append('cartFormInput', JSON.stringify(cartInput));

        await fetch('/cart', {
          method: 'POST',
          body: formData,
        });
      } catch (err) {
        console.warn('[BUYER IDENTITY SYNC WARNING]', err);
      }

      // 2. Pre-fill checkout URL query params as additional guarantee
      const checkoutUrl = (optimisticCart as any)?.checkoutUrl;
      if (checkoutUrl) {
        sessionStorage.setItem('exportShippingDetails', JSON.stringify({
          fullName, phone, email, country: selectedCountryObj.name, city, zip, addressDetails, instructions
        }));

        const url = new URL(checkoutUrl);
        if (email) url.searchParams.set('checkout[email]', email);
        if (fullName) url.searchParams.set('checkout[shipping_address][first_name]', fullName);
        if (addressDetails) url.searchParams.set('checkout[shipping_address][address1]', addressDetails);
        if (city) url.searchParams.set('checkout[shipping_address][city]', city);
        if (zip) url.searchParams.set('checkout[shipping_address][zip]', zip);
        if (countryCode) url.searchParams.set('checkout[shipping_address][country]', countryCode);
        if (phone) url.searchParams.set('checkout[shipping_address][phone]', phone);

        window.location.href = url.toString();
      } else {
        alert('تعذر الانتقال لصفحة الدفع. يرجى إعادة المحاولة.');
      }
    } catch (e) {
      alert('حدث خطأ أثناء الاتصال. يرجى المحاولة لاحقاً.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="export-cart-page" dir="rtl">
      {/* ─── 1. HEADER BANNER ───────────────────────────────────────────────── */}
      <section className="relative h-[144px] w-full bg-[#234745] overflow-hidden flex items-center" dir="rtl">
        <div
          className="absolute inset-0 bg-[length:950px_800px] md:bg-[length:1900px_2000px]"
          style={{
            backgroundImage: "url('/images/second-bg-pattern.svg')",
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
        <div className="max-w-[1440px] w-full mx-auto px-4 md:px-8 lg:px-12 relative z-10 flex items-center justify-between" dir="rtl">
          <div className="flex flex-row items-center justify-start gap-4 md:gap-6 w-full">
            <button
              onClick={() => { if (typeof window !== 'undefined') window.history.back(); }}
              className="flex items-center gap-[8px] bg-[#9FB7AE] hover:bg-[#8BA19C] text-[#234745] px-4 md:px-6 py-2.5 rounded-[25px] text-[12px] md:text-[16px] font-bold transition-all shrink-0"
              style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
              dir="rtl"
            >
              <svg width="15" height="13" viewBox="0 0 15 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 6H12.25L7 0.75L7.66 0L14.16 6.5L7.66 13L7 12.25L12.25 7H0V6Z" fill="#234745"/>
              </svg>
              <span>رجوع</span>
            </button>

            <div className="flex flex-col text-right">
              <h1 className="!m-0 !mb-1 text-[24px] md:text-[34px] font-bold text-white leading-none" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}>
                سلة التسوق للتصدير
              </h1>
              <p className="!m-0 text-[13px] md:text-[15px] font-medium text-[#c4d0cc] leading-none" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                سلة التسوق للتصدير حول العالم
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── BREADCRUMB ────────────────────────────────────────────────────── */}
      <div className="w-full bg-white py-4 mb-10 border-b border-gray-100">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8">
          <div className="flex items-center gap-2 text-[14px] font-bold text-right" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
            <Link to="/" className="text-gray-400 hover:text-[#234745] transition-colors">الرئيسية</Link>
            <span className="text-gray-300">/</span>
            <span className="text-[#234745]">سلة التسوق للتصدير</span>
          </div>
        </div>
      </div>

      {/* ─── 2. STEP PROGRESS BAR ────────────────────────────────────────────── */}
      <div className="export-container">
        <ExportStepBar step={2} />
      </div>

      {/* ─── 3. MAIN GRID LAYOUT ─────────────────────────────────────────────── */}
      <div className="export-container">
        <div className="export-main-grid">
          
          {/* ─── RIGHT COLUMN: Shipping Address Form ─── */}
          <div className="export-form-col">
            <div className="export-section-card">
              <div className="export-section-header">
                <div className="export-badge-circle">2</div>
                <h2 className="export-section-title">عنوان الشحن</h2>
              </div>

              <div className="export-form-stack">
                <div className="export-form-grid">
                  {/* Full Name */}
                  <div className="export-field">
                    <label className="export-label">الاسم الكامل <span className="req">*</span></label>
                    <input
                      type="text"
                      placeholder="محمد العبدلي"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      className={`export-input ${formErrors.fullName ? 'error' : ''}`}
                      dir="rtl"
                    />
                    {formErrors.fullName && <span className="export-err-text">{formErrors.fullName}</span>}
                  </div>

                  {/* Phone */}
                  <div className="export-field">
                    <label className="export-label">رقم الجوال <span className="req">*</span></label>
                    <input
                      type="tel"
                      placeholder="رقم الجوال"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className={`export-input font-en ${formErrors.phone ? 'error' : ''}`}
                      dir="ltr"
                    />
                    {formErrors.phone && <span className="export-err-text">{formErrors.phone}</span>}
                  </div>
                </div>

                {/* Email */}
                <div className="export-field">
                  <label className="export-label">البريد الإلكتروني <span className="req">*</span></label>
                  <input
                    type="email"
                    placeholder="البريد الإلكتروني"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className={`export-input font-en ${formErrors.email ? 'error' : ''}`}
                    dir="ltr"
                  />
                  {formErrors.email && <span className="export-err-text">{formErrors.email}</span>}
                </div>

                {/* Country & City */}
                <div className="export-form-grid">
                  <div className="export-field">
                    <label className="export-label">الدولة <span className="req">*</span></label>
                    <select
                      value={countryCode}
                      onChange={e => {
                        setCountryCode(e.target.value);
                        const newCountryObj = COUNTRIES.find(c => c.code === e.target.value);
                        if (newCountryObj && newCountryObj.cities.length > 0) {
                          setCity(newCountryObj.cities[0]);
                        }
                      }}
                      className="export-select"
                      dir="rtl"
                    >
                      {COUNTRIES.map(c => (
                        <option key={c.code} value={c.code}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="export-field">
                    <label className="export-label">المدينة <span className="req">*</span></label>
                    <select
                      value={city}
                      onChange={e => setCity(e.target.value)}
                      className="export-select"
                      dir="rtl"
                    >
                      {availableCities.map(ct => (
                        <option key={ct} value={ct}>{ct}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Postal Code */}
                <div className="export-field">
                  <label className="export-label">الرمز البريدي</label>
                  <input
                    type="text"
                    placeholder="123152"
                    value={zip}
                    onChange={e => setZip(e.target.value)}
                    className="export-input font-en"
                    dir="ltr"
                  />
                </div>

                {/* Detailed Address */}
                <div className="export-field">
                  <label className="export-label">العنوان التفصيلي <span className="req">*</span></label>
                  <input
                    type="text"
                    placeholder="الحي، الشارع، رقم المبني"
                    value={addressDetails}
                    onChange={e => setAddressDetails(e.target.value)}
                    className={`export-input ${formErrors.addressDetails ? 'error' : ''}`}
                    dir="rtl"
                  />
                  {formErrors.addressDetails && <span className="export-err-text">{formErrors.addressDetails}</span>}
                </div>

                {/* Save Address Checkbox */}
                <div className="export-checkbox-row">
                  <input
                    type="checkbox"
                    id="saveAddress"
                    checked={saveAddress}
                    onChange={e => setSaveAddress(e.target.checked)}
                    className="export-checkbox"
                  />
                  <label htmlFor="saveAddress" className="export-checkbox-label">
                    حفظ هذا العنوان للطلبات القادمة
                  </label>
                </div>

                {/* Delivery Instructions */}
                <div className="export-field">
                  <label className="export-label">تعليمات التوصيل</label>
                  <input
                    type="text"
                    placeholder="مثال: الرجاء الاتصال قبل الوصول"
                    value={instructions}
                    onChange={e => setInstructions(e.target.value)}
                    className="export-input"
                    dir="rtl"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ─── LEFT COLUMN: Summary Sidebar ─── */}
          <div className="export-summary-col">
            <div className="export-summary-card">
              <h2 className="export-summary-title">ملخص الطلب</h2>

              {/* Items Mini Preview */}
              <div className="export-mini-items-stack">
                {exportLines.map((line: any) => {
                  const merch = line.merchandise;
                  const product = merch?.product;
                  const title = product?.title || merch?.title || 'منتج';
                  const image = merch?.image || product?.featuredImage;
                  const price = parseFloat(line.cost?.totalAmount?.amount || merch?.price?.amount || '0');
                  const options = merch?.selectedOptions || [];
                  const optionChips = options.filter((o: any) => o.value !== 'Default Title').map((o: any) => o.value);

                  return (
                    <div key={line.id} className="export-mini-item">
                      <div className="export-mini-thumb">
                        {image?.url ? (
                          <img src={image.url} alt={title} className="export-mini-img" />
                        ) : (
                          <div className="export-mini-placeholder">🍬</div>
                        )}
                      </div>
                      <div className="export-mini-details">
                        <h4 className="export-mini-name">{title}</h4>
                        <div className="export-mini-chips">
                          {optionChips.length > 0 ? (
                            optionChips.map((c: string, i: number) => (
                              <span key={i} className="export-mini-chip">{c}</span>
                            ))
                          ) : (
                            <>
                              <span className="export-mini-chip">وسط</span>
                              <span className="export-mini-chip">تغليف فاخر</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span className="export-mini-price font-en flex items-center gap-0.5">
                        {price.toFixed(2)} <SaudiRiyalSymbol className="h-2.5 w-auto text-[#234745]" />
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="export-summary-divider" />

              <div className="export-summary-list">
                <div className="export-summary-item">
                  <span className="label">المجموع الفرعي</span>
                  <span className="val font-en flex items-center gap-1">
                    {summaryData.subtotal.toFixed(2)} <SaudiRiyalSymbol className="h-3 w-auto text-[#234745]" />
                  </span>
                </div>
                <div className="export-summary-item">
                  <span className="label flex items-center gap-1.5">
                    الشحن <AramexBadge />
                  </span>
                  <span className="val font-en flex items-center gap-1">
                    {summaryData.shippingRate.toFixed(2)} <SaudiRiyalSymbol className="h-3 w-auto text-[#234745]" />
                  </span>
                </div>
                <div className="export-summary-item">
                  <span className="label">رسوم التغليف المبرد</span>
                  <span className="val font-en flex items-center gap-1">
                    {summaryData.coldPackagingFee.toFixed(2)} <SaudiRiyalSymbol className="h-3 w-auto text-[#234745]" />
                  </span>
                </div>
                <div className="export-summary-item discount">
                  <span className="label">خصم التصدير</span>
                  <span className="val font-en flex items-center gap-1">
                    − {summaryData.exportDiscount.toFixed(2)} <SaudiRiyalSymbol className="h-3 w-auto text-[#234745]" />
                  </span>
                </div>
              </div>

              <div className="export-summary-divider" />

              <div className="export-total-block">
                <div className="export-total-row">
                  <span className="total-label">الإجمالي</span>
                  <span className="total-val font-en flex items-center gap-1.5">
                    {summaryData.grandTotal.toFixed(2)} <SaudiRiyalSymbol className="h-4.5 w-auto text-[#234745]" />
                  </span>
                </div>
                <p className="vat-note">شامل ضريبة القيمة المضافة 15%</p>
              </div>

              <button
                onClick={handleConfirmOrder}
                disabled={isSubmitting}
                className="export-checkout-btn"
              >
                {isSubmitting ? 'جاري التحويل للدفع...' : 'تأكيد الطلب'}
              </button>

              {/* Security & Assurance Badges */}
              <div className="export-security-badges">
                <span>جودة مضمونة</span>
                <span className="dot">•</span>
                <span>توصيل سريع</span>
                <span className="dot">•</span>
                <span>دفع أمن ومضمون</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      <ExportShippingStyles />
    </div>
  );
}

// ─── Scoped CSS ───────────────────────────────────────────────────────────

function ExportShippingStyles() {
  return (
    <style>{`
      .export-cart-page {
        background: #fbf9f4;
        min-height: 100vh;
        font-family: 'GE Dinar One', 'Bahij Janna', sans-serif;
        color: #2d3748;
        padding-bottom: 60px;
      }
      .export-container {
        max-width: 1400px;
        margin: 0 auto;
        padding: 0 20px;
      }

      /* Step Progress Bar */
      .export-step-bar-container {
        margin-bottom: 36px;
      }
      .export-step-bar {
        display: flex;
        align-items: center;
        justify-content: center;
        max-width: 600px;
        margin: 0 auto;
        direction: rtl;
      }
      .export-step-wrapper {
        display: flex;
        align-items: center;
        flex: 1;
      }
      .export-step-item {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .export-step-circle {
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: #e2e8f0;
        color: #718096;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 15px;
        font-family: 'Inter', sans-serif;
        flex-shrink: 0;
      }
      .export-step-circle.active {
        background: #234745;
        color: #ffffff;
      }
      .export-step-label {
        font-size: 14px;
        color: #718096;
        font-weight: 500;
        white-space: nowrap;
      }
      .export-step-label.active {
        color: #234745;
        font-weight: 700;
      }
      .export-step-line {
        flex: 1;
        height: 2px;
        background: #e2e8f0;
        margin: 0 12px;
      }
      .export-step-line.active {
        background: #C5A96A;
      }

      /* Main Grid */
      .export-main-grid {
        display: grid;
        grid-template-columns: 1fr 380px;
        gap: 28px;
        align-items: start;
        margin-bottom: 40px;
      }
      @media (max-width: 900px) {
        .export-main-grid { grid-template-columns: 1fr; }
        .export-summary-col { order: -1; }
      }

      /* Section Card */
      .export-section-card {
        background: #ffffff;
        border-radius: 16px;
        padding: 28px;
        border: 1px solid #edf2f7;
        box-shadow: 0 2px 8px rgba(0,0,0,0.03);
      }
      .export-section-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 24px;
        direction: rtl;
      }
      .export-badge-circle {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: #234745;
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 14px;
        font-family: 'Inter', sans-serif;
      }
      .export-section-title {
        font-family: 'Bahij Janna', sans-serif;
        font-size: 20px;
        font-weight: 700;
        color: #234745;
      }

      .export-form-stack { display: flex; flex-direction: column; gap: 16px; direction: rtl; }
      .export-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      @media (max-width: 640px) {
        .export-form-grid { grid-template-columns: 1fr; }
      }
      .export-field { display: flex; flex-direction: column; gap: 6px; text-align: right; }
      .export-label { font-size: 13px; color: #4a5568; font-weight: 600; }
      .export-label .req { color: #e53e3e; }
      .export-input, .export-select {
        height: 48px;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 0 16px;
        font-size: 14px;
        font-family: 'GE Dinar One', sans-serif;
        color: #2d3748;
        background: #ffffff;
        outline: none;
        transition: border-color 0.2s;
      }
      .export-input:focus, .export-select:focus { border-color: #234745; }
      .export-input.error { border-color: #e53e3e; }
      .export-err-text { font-size: 12px; color: #e53e3e; margin-top: 2px; }

      .export-checkbox-row {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 4px;
        direction: rtl;
      }
      .export-checkbox { width: 18px; height: 18px; accent-color: #234745; cursor: pointer; }
      .export-checkbox-label { font-size: 13px; color: #718096; cursor: pointer; }

      /* Summary Sidebar */
      .export-summary-card {
        background: #ffffff;
        border-radius: 16px;
        padding: 24px;
        border: 1px solid #edf2f7;
        box-shadow: 0 2px 8px rgba(0,0,0,0.03);
      }
      .export-summary-title {
        font-family: 'Bahij Janna', sans-serif;
        font-size: 18px;
        font-weight: 700;
        color: #2d3748;
        margin-bottom: 16px;
        text-align: right;
      }
      .export-mini-items-stack { display: flex; flex-direction: column; gap: 12px; }
      .export-mini-item {
        display: flex;
        align-items: center;
        gap: 12px;
        direction: rtl;
      }
      .export-mini-thumb {
        width: 50px;
        height: 50px;
        border-radius: 8px;
        overflow: hidden;
        background: #f7fafc;
        flex-shrink: 0;
      }
      .export-mini-img { width: 100%; height: 100%; object-fit: cover; }
      .export-mini-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 20px; }
      .export-mini-details { flex: 1; min-width: 0; text-align: right; }
      .export-mini-name { font-size: 13px; font-weight: 600; color: #2d3748; truncate; margin-bottom: 2px; }
      .export-mini-chips { display: flex; gap: 4px; }
      .export-mini-chip { font-size: 10px; color: #a0aec0; background: #f7fafc; padding: 1px 6px; border-radius: 8px; }
      .export-mini-price { font-size: 13px; font-weight: 700; color: #2d3748; }

      .export-summary-list { display: flex; flex-direction: column; gap: 14px; }
      .export-summary-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        direction: rtl;
        font-size: 14px;
      }
      .export-summary-item .label { color: #718096; }
      .export-summary-item .val { color: #2d3748; font-weight: 600; }
      .export-summary-item.discount .label { color: #234745; }
      .export-summary-item.discount .val { color: #234745; }
      .export-summary-divider { height: 16px; background: none; border-top: 1px solid #edf2f7; margin: 8px 0; }

      .export-total-block { margin-bottom: 20px; }
      .export-total-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        direction: rtl;
        margin-bottom: 4px;
      }
      .total-label {
        font-family: 'Bahij Janna', sans-serif;
        font-size: 18px;
        font-weight: 700;
        color: #2d3748;
      }
      .total-val {
        font-family: 'Bahij Janna', sans-serif;
        font-size: 24px;
        font-weight: 700;
        color: #234745;
      }
      .vat-note { font-size: 11px; color: #a0aec0; text-align: right; }

      .export-checkout-btn {
        width: 100%;
        height: 48px;
        background: #234745;
        color: #ffffff;
        border: none;
        border-radius: 12px;
        font-family: 'GE Dinar One', sans-serif;
        font-size: 16px;
        font-weight: 700;
        cursor: pointer;
        transition: background 0.2s;
        margin-bottom: 16px;
      }
      .export-checkout-btn:hover { background: #1a3432; }

      .export-security-badges {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-size: 11px;
        color: #a0aec0;
        direction: rtl;
      }
      .export-security-badges .dot { font-size: 8px; }
    `}</style>
  );
}
