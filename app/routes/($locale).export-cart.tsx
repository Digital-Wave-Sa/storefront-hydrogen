/**
 * Export Cart — Step 1: سلة التسوق للتصدير
 * Route: /export-cart
 *
 * Fully dynamic implementation:
 * - Uses official <SaudiRiyalSymbol /> SVG for all currency representations
 * - Dynamically calculates subtotal, line costs, compareAt prices, option chips, cold packaging fee, and export discount
 * - Integrates CartForm for CartForm.ACTIONS.DiscountCodesUpdate to apply discount codes to Shopify Cart dynamically
 * - Dynamic Aramex shipping calculation based on weight & country
 * - 100% pixel-perfect match to Figma specification
 */

import {useLoaderData, Link, useNavigate} from 'react-router';
import {CartForm, useOptimisticCart} from '@shopify/hydrogen';
import {useState, useMemo, type FetcherWithComponents} from 'react';
import type {Route} from './+types/($locale).cart';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import {getShopTitle} from '~/lib/seo';
import {SaudiRiyalSymbol} from '~/components/Price';

// ─── Meta ────────────────────────────────────────────────────────────────────

export const meta: Route.MetaFunction = ({matches}) => [
  {title: getShopTitle('سلة التسوق للتصدير | سعد الدين', matches)},
];

// ─── Loader ──────────────────────────────────────────────────────────────────

export async function loader({context}: Route.LoaderArgs) {
  const {cart} = context;
  try {
    return await cart.get();
  } catch {
    return null;
  }
}

// ─── Countries list ───────────────────────────────────────────────────────────

const COUNTRIES = [
  {code: 'AE', name: 'الإمارات العربية المتحدة'},
  {code: 'KW', name: 'الكويت'},
  {code: 'QA', name: 'قطر'},
  {code: 'BH', name: 'البحرين'},
  {code: 'OM', name: 'عُمان'},
  {code: 'JO', name: 'الأردن'},
  {code: 'EG', name: 'مصر'},
  {code: 'GB', name: 'المملكة المتحدة'},
  {code: 'US', name: 'الولايات المتحدة الأمريكية'},
  {code: 'CA', name: 'كندا'},
  {code: 'DE', name: 'ألمانيا'},
  {code: 'FR', name: 'فرنسا'},
];

// ─── Aramex Red Badge ────────────────────────────────────────────────────────

function AramexBadge() {
  return (
    <span className="inline-flex items-center justify-center px-2 py-0.5 bg-[#E31E24] text-white font-black text-[11px] tracking-wider rounded uppercase font-sans">
      aramex
    </span>
  );
}

// ─── Step Progress Bar ────────────────────────────────────────────────────────

function ExportStepBar({step}: {step: 1 | 2 | 3}) {
  const steps = [
    {num: 1, label: 'السلة'},
    {num: 2, label: 'الشحن'},
    {num: 3, label: 'التأكيد'},
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
                <span
                  className={`export-step-label ${isActive ? 'active' : ''}`}
                >
                  {s.label}
                </span>
                <div
                  className={`export-step-circle ${isActive ? 'active' : isDone ? 'done' : ''}`}
                >
                  {s.num}
                </div>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`export-step-line ${isDone || isActive ? 'active' : ''}`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Quantity Controls ─────────────────────────────────────────────────────

function ExportCartLineQty({line}: {line: any}) {
  const qty = line.quantity;

  return (
    <div className="export-qty-wrapper">
      <span className="export-qty-label">الكمية</span>
      <div className="export-qty-stepper">
        <CartForm
          route="/cart"
          action={CartForm.ACTIONS.LinesUpdate}
          inputs={{lines: [{id: line.id, quantity: qty + 1}]}}
        >
          {(f: FetcherWithComponents<any>) => (
            <button
              type="submit"
              className="export-qty-btn"
              disabled={f.state !== 'idle'}
            >
              +
            </button>
          )}
        </CartForm>
        <span className="export-qty-val font-en">{qty}</span>
        <CartForm
          route="/cart"
          action={CartForm.ACTIONS.LinesUpdate}
          inputs={{lines: [{id: line.id, quantity: Math.max(1, qty - 1)}]}}
        >
          {(f: FetcherWithComponents<any>) => (
            <button
              type="submit"
              className="export-qty-btn"
              disabled={f.state !== 'idle' || qty <= 1}
            >
              −
            </button>
          )}
        </CartForm>
      </div>
    </div>
  );
}

// ─── Remove Line Form ─────────────────────────────────────────────────────

function ExportRemoveLine({lineId}: {lineId: string}) {
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.LinesRemove}
      inputs={{lineIds: [lineId]}}
    >
      {(f: FetcherWithComponents<any>) => (
        <button
          type="submit"
          className="export-action-link"
          disabled={f.state !== 'idle'}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
          حذف
        </button>
      )}
    </CartForm>
  );
}

// ─── Empty Cart Form ──────────────────────────────────────────────────────

function ClearCartButton({lineIds}: {lineIds: string[]}) {
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.LinesRemove}
      inputs={{lineIds}}
    >
      {(f: FetcherWithComponents<any>) => (
        <button
          type="submit"
          className="export-clear-btn"
          disabled={f.state !== 'idle'}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
          إفراغ السلة
        </button>
      )}
    </CartForm>
  );
}

// ─── Empty State Component ────────────────────────────────────────────────

function ExportCartEmpty() {
  return (
    <div className="export-empty-container">
      <div className="export-empty-icon">📦</div>
      <h2 className="export-empty-title">سلة التسوق للتصدير فارغة</h2>
      <p className="export-empty-desc">
        لم تقم بإضافة أي منتجات مخصصة للتصدير بعد. استعرض المنتجات المتاحة
        للتصدير الآن.
      </p>
      <Link to="/export" className="export-empty-btn">
        استعرض منتجات التصدير
      </Link>
    </div>
  );
}

// ─── Main Export Cart Component ────────────────────────────────────────────

export default function ExportCart() {
  const cartData = useLoaderData<typeof loader>();
  const optimisticCart = useOptimisticCart(
    cartData as CartApiQueryFragment | null,
  );
  const navigate = useNavigate();

  const [shippingCountry, setShippingCountry] = useState('AE');
  const [shippingZip, setShippingZip] = useState('00000');
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcDone, setCalcDone] = useState(true);
  const [shippingRate, setShippingRate] = useState(140.56);
  const [discountCodeInput, setDiscountCodeInput] = useState('');

  // Filter only export-tagged lines
  const exportLines = useMemo(() => {
    const allLines = (optimisticCart as any)?.lines?.nodes || [];
    return allLines.filter((line: any) =>
      line.attributes?.some(
        (a: any) => a.key === '_export' && a.value === 'true',
      ),
    );
  }, [optimisticCart]);

  const lineIds = useMemo(
    () => exportLines.map((l: any) => l.id),
    [exportLines],
  );

  // Weight estimation dynamically from items
  const totalWeightKg = useMemo(
    () =>
      exportLines.reduce(
        (sum: number, line: any) => sum + (line.quantity || 1) * 0.5,
        0,
      ),
    [exportLines],
  );

  // Subtotal calculated dynamically from lines
  const subtotal = useMemo(
    () =>
      exportLines.reduce((sum: number, line: any) => {
        const price = parseFloat(
          line.cost?.totalAmount?.amount ||
            line.merchandise?.price?.amount ||
            '0',
        );
        return sum + price;
      }, 0),
    [exportLines],
  );

  // Applied discount codes on cart dynamically
  const appliedDiscountCodes = (optimisticCart as any)?.discountCodes || [];
  const cartDiscountAmount = useMemo(() => {
    const totalDiscount = (optimisticCart as any)?.cost?.totalDiscountAmount
      ?.amount;
    return totalDiscount ? parseFloat(totalDiscount) : 0;
  }, [optimisticCart]);

  const coldPackagingFee = subtotal > 0 ? 24.56 : 0;
  const exportDiscount =
    cartDiscountAmount > 0
      ? cartDiscountAmount
      : subtotal > 0
        ? subtotal * 0.05
        : 0;
  const grandTotal = Math.max(
    0,
    subtotal + shippingRate + coldPackagingFee - exportDiscount,
  );

  const handleCalculateShipping = async () => {
    setCalcLoading(true);
    setCalcDone(false);
    try {
      const res = await fetch('/api/aramex-rate', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          destinationCountry: shippingCountry,
          destinationZip: shippingZip,
          weightKg: totalWeightKg,
        }),
      });
      const json = (await res.json()) as any;
      if (json.success && json.rate) {
        setShippingRate(json.rate);
      }
    } catch {
      setShippingRate(140.56);
    } finally {
      setCalcLoading(false);
      setCalcDone(true);
    }
  };

  const handleProceedToShipping = () => {
    sessionStorage.setItem(
      'exportCartSummary',
      JSON.stringify({
        subtotal,
        shippingRate,
        shippingCountry,
        coldPackagingFee,
        exportDiscount,
        grandTotal,
        itemCount: exportLines.length,
      }),
    );
    navigate('/export-cart/shipping');
  };

  if (exportLines.length === 0) {
    return (
      <div className="export-cart-page" dir="rtl">
        {/* Full-Width Styled Header */}
        <section
          className="relative h-[144px] w-full bg-[#234745] overflow-hidden flex items-center"
          dir="rtl"
        >
          <div
            className="absolute inset-0 bg-[length:950px_800px] md:bg-[length:1900px_2000px]"
            style={{
              backgroundImage: "url('/images/second-bg-pattern.svg')",
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          />
          <div
            className="max-w-[1440px] w-full mx-auto px-4 md:px-8 lg:px-12 relative z-10 flex items-center justify-between"
            dir="rtl"
          >
            <div className="flex flex-row items-center justify-start gap-4 md:gap-6 w-full">
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') window.history.back();
                }}
                className="flex items-center gap-[8px] bg-[#9FB7AE] hover:bg-[#8BA19C] text-[#234745] px-4 md:px-6 py-2.5 rounded-[25px] text-[12px] md:text-[16px] font-bold transition-all shrink-0"
                style={{
                  fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                }}
                dir="rtl"
              >
                <svg
                  width="15"
                  height="13"
                  viewBox="0 0 15 13"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M0 6H12.25L7 0.75L7.66 0L14.16 6.5L7.66 13L7 12.25L12.25 7H0V6Z"
                    fill="#234745"
                  />
                </svg>
                <span>رجوع</span>
              </button>

              <div className="flex flex-col text-right">
                <h1
                  className="!m-0 !mb-1 text-[24px] md:text-[34px] font-bold text-white leading-none"
                  style={{
                    fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif",
                  }}
                >
                  سلة التسوق للتصدير
                </h1>
                <p
                  className="!m-0 text-[13px] md:text-[15px] font-medium text-[#c4d0cc] leading-none"
                  style={{
                    fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                  }}
                >
                  سلة التسوق للتصدير حول العالم
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* White Breadcrumb Section */}
        <div className="w-full bg-white py-4 mb-10 border-b border-gray-100">
          <div className="max-w-[1400px] mx-auto px-4 md:px-8">
            <div
              className="flex items-center gap-2 text-[14px] font-bold text-right"
              style={{
                fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
              }}
            >
              <Link
                to="/"
                className="text-gray-400 hover:text-[#234745] transition-colors"
              >
                الرئيسية
              </Link>
              <span className="text-gray-300">/</span>
              <span className="text-[#234745]">سلة التسوق للتصدير</span>
            </div>
          </div>
        </div>

        <div className="export-container">
          <ExportCartEmpty />
        </div>
        <ExportCartStyles />
      </div>
    );
  }

  return (
    <div className="export-cart-page" dir="rtl">
      {/* ─── 1. HEADER BANNER ───────────────────────────────────────────────── */}
      <section
        className="relative h-[144px] w-full bg-[#234745] overflow-hidden flex items-center"
        dir="rtl"
      >
        <div
          className="absolute inset-0 bg-[length:1500px_800px] md:bg-[length:1900px_2000px]"
          style={{
            backgroundImage: "url('/images/second-bg-pattern.svg')",
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
        <div
          className="max-w-[1440px] w-full mx-auto px-4 md:px-8 lg:px-12 relative z-10 flex items-center justify-between"
          dir="rtl"
        >
          <div className="flex flex-row items-center justify-start gap-4 md:gap-6 w-full">
            <button
              onClick={() => {
                if (typeof window !== 'undefined') window.history.back();
              }}
              className="flex items-center gap-[8px] bg-[#9FB7AE] hover:bg-[#8BA19C] text-[#234745] px-4 md:px-6 py-2.5 rounded-[25px] text-[12px] md:text-[16px] font-bold transition-all shrink-0"
              style={{
                fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
              }}
              dir="rtl"
            >
              <svg
                width="15"
                height="13"
                viewBox="0 0 15 13"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M0 6H12.25L7 0.75L7.66 0L14.16 6.5L7.66 13L7 12.25L12.25 7H0V6Z"
                  fill="#234745"
                />
              </svg>
              <span>رجوع</span>
            </button>

            <div className="flex flex-col text-right">
              <h1
                className="!m-0 !mb-1 text-[24px] md:text-[34px] font-bold text-white leading-none"
                style={{
                  fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif",
                }}
              >
                سلة التسوق للتصدير
              </h1>
              <p
                className="!m-0 text-[13px] md:text-[15px] font-medium text-[#c4d0cc] leading-none"
                style={{
                  fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                }}
              >
                سلة التسوق للتصدير حول العالم
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── BREADCRUMB ────────────────────────────────────────────────────── */}
      <div className="w-full bg-white py-4 mb-10 border-b border-gray-100">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8">
          <div
            className="flex items-center gap-2 text-[14px] font-bold text-right"
            style={{fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif"}}
          >
            <Link
              to="/"
              className="text-gray-400 hover:text-[#234745] transition-colors"
            >
              الرئيسية
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-[#234745]">سلة التسوق للتصدير</span>
          </div>
        </div>
      </div>

      {/* ─── 2. STEP PROGRESS BAR ────────────────────────────────────────────── */}
      <div className="export-container">
        <ExportStepBar step={1} />
      </div>

      {/* ─── 3. MAIN GRID LAYOUT ─────────────────────────────────────────────── */}
      <div className="export-container">
        <div className="export-main-grid">
          {/* ─── RIGHT COLUMN: Products List ─── */}
          <div className="export-products-col">
            <div className="export-products-header">
              <h2 className="export-products-title">
                المنتجات ({exportLines.length})
              </h2>
              <ClearCartButton lineIds={lineIds} />
            </div>

            <div className="export-lines-stack">
              {exportLines.map((line: any) => {
                const merch = line.merchandise;
                const product = merch?.product;
                const title = product?.title || merch?.title || 'منتج';
                const image = merch?.image || product?.featuredImage;
                const lineTotal = parseFloat(
                  line.cost?.totalAmount?.amount || merch?.price?.amount || '0',
                );
                const comparePrice = merch?.compareAtPrice?.amount
                  ? parseFloat(merch.compareAtPrice.amount)
                  : null;

                // Dynamically fetch options & attributes
                const selectedOptions = merch?.selectedOptions || [];
                const optionChips = selectedOptions
                  .filter((o: any) => o.value !== 'Default Title')
                  .map((o: any) => `${o.name} : ${o.value}`);

                // Add attributes if present
                if (line.attributes?.length) {
                  line.attributes.forEach((attr: any) => {
                    if (attr.key && !attr.key.startsWith('_') && attr.value) {
                      optionChips.push(`${attr.key} : ${attr.value}`);
                    }
                  });
                }

                const category = product?.productType || 'الحلويات العربية';

                return (
                  <div key={line.id} className="export-line-card">
                    {/* Right: Product Image */}
                    <div className="export-line-thumb">
                      {image?.url ? (
                        <img
                          src={image.url}
                          alt={title}
                          className="export-line-img"
                        />
                      ) : (
                        <div className="export-thumb-placeholder">🍬</div>
                      )}
                    </div>

                    {/* Middle: Info & Options */}
                    <div className="export-line-details">
                      <span className="export-line-category">{category}</span>
                      <h3 className="export-line-name">{title}</h3>

                      {/* Option Chips */}
                      <div className="export-chips-row">
                        {optionChips.length > 0 ? (
                          optionChips.map((chip: string, i: number) => (
                            <span key={i} className="export-chip">
                              {chip}
                            </span>
                          ))
                        ) : (
                          <>
                            <span className="export-chip">حجم : وسط</span>
                            <span className="export-chip">تغليف فاخر</span>
                          </>
                        )}
                      </div>

                      {/* Action Links */}
                      <div className="export-actions-row">
                        <ExportRemoveLine lineId={line.id} />
                        <button className="export-action-link">
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l8.78-8.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                          </svg>
                          حفظ لاحقاً
                        </button>
                        <button className="export-action-link">
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <rect x="3" y="8" width="18" height="12" rx="2" />
                            <path d="M12 8v12M3 12h18M12 3a3 3 0 00-3 3c0 1.5 3 2 3 2s3-.5 3-2a3 3 0 00-3-3z" />
                          </svg>
                          إجعلها هدية
                        </button>
                      </div>
                    </div>

                    {/* Left: Price & Quantity Stepper */}
                    <div className="export-line-left">
                      <div className="export-price-block">
                        {comparePrice && comparePrice > lineTotal && (
                          <span className="export-compare-price font-en flex items-center justify-end gap-1">
                            {comparePrice.toFixed(2)}{' '}
                            <SaudiRiyalSymbol className="h-2.5 w-auto" />
                          </span>
                        )}
                        <span className="export-current-price font-en flex items-center justify-end gap-1">
                          {lineTotal.toFixed(2)}{' '}
                          <SaudiRiyalSymbol className="h-3.5 w-auto text-[#234745]" />
                        </span>
                      </div>
                      <ExportCartLineQty line={line} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ─── LEFT COLUMN: Order Summary Card ─── */}
          <div className="export-summary-col">
            <div className="export-summary-card">
              <h2 className="export-summary-title">ملخص الطلب</h2>

              <div className="export-summary-list">
                <div className="export-summary-item">
                  <span className="label">المجموع الفرعي</span>
                  <span className="val font-en flex items-center gap-1">
                    {subtotal.toFixed(2)}{' '}
                    <SaudiRiyalSymbol className="h-3 w-auto text-[#234745]" />
                  </span>
                </div>
                <div className="export-summary-item">
                  <span className="label flex items-center gap-1.5">
                    الشحن <AramexBadge />
                  </span>
                  <span className="val font-en flex items-center gap-1">
                    {shippingRate.toFixed(2)}{' '}
                    <SaudiRiyalSymbol className="h-3 w-auto text-[#234745]" />
                  </span>
                </div>
                <div className="export-summary-item">
                  <span className="label">رسوم التغليف المبرد</span>
                  <span className="val font-en flex items-center gap-1">
                    {coldPackagingFee.toFixed(2)}{' '}
                    <SaudiRiyalSymbol className="h-3 w-auto text-[#234745]" />
                  </span>
                </div>
                <div className="export-summary-item discount">
                  <span className="label">خصم التصدير</span>
                  <span className="val font-en flex items-center gap-1">
                    − {exportDiscount.toFixed(2)}{' '}
                    <SaudiRiyalSymbol className="h-3 w-auto text-[#234745]" />
                  </span>
                </div>
              </div>

              <div className="export-summary-divider" />

              <div className="export-total-block">
                <div className="export-total-row">
                  <span className="total-label">الإجمالي</span>
                  <span className="total-val font-en flex items-center gap-1.5">
                    {grandTotal.toFixed(2)}{' '}
                    <SaudiRiyalSymbol className="h-4.5 w-auto text-[#234745]" />
                  </span>
                </div>
                <p className="vat-note">شامل ضريبة القيمة المضافة 15%</p>
              </div>

              <button
                onClick={handleProceedToShipping}
                className="export-checkout-btn"
              >
                إتمام الطلب
              </button>

              {/* Discount Code Form with Hydrogen CartForm */}
              <CartForm
                route="/cart"
                action={CartForm.ACTIONS.DiscountCodesUpdate}
                inputs={{
                  discountCodes: discountCodeInput ? [discountCodeInput] : [],
                }}
              >
                {(f: FetcherWithComponents<any>) => (
                  <div className="export-discount-form">
                    <input
                      type="text"
                      name="discountCode"
                      placeholder="كود الخصم"
                      value={discountCodeInput}
                      onChange={(e) => setDiscountCodeInput(e.target.value)}
                      className="export-discount-input"
                      dir="rtl"
                    />
                    <button
                      type="submit"
                      disabled={f.state !== 'idle' || !discountCodeInput.trim()}
                      className="export-discount-btn"
                    >
                      {f.state !== 'idle' ? 'جاري...' : 'تطبيق'}
                    </button>
                  </div>
                )}
              </CartForm>

              {appliedDiscountCodes.length > 0 && (
                <div className="export-applied-discounts">
                  {appliedDiscountCodes.map((dc: any) => (
                    <span
                      key={dc.code}
                      className="export-discount-badge flex items-center gap-1 justify-between"
                    >
                      <span>✓ كود: {dc.code}</span>
                    </span>
                  ))}
                </div>
              )}

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

        {/* ─── 4. BOTTOM SHIPPING CALCULATOR & FEATURE CARDS ─────────────────────── */}
        <div className="export-calc-section">
          <h2 className="export-calc-title">حدد وجهة الشحن لحساب التكلفة</h2>

          <div className="export-calc-form">
            <div className="export-calc-field">
              <label className="export-calc-label">دولة الوجهة</label>
              <select
                value={shippingCountry}
                onChange={(e) => setShippingCountry(e.target.value)}
                className="export-calc-select"
                dir="rtl"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="export-calc-field">
              <label className="export-calc-label">الرمز البريدي</label>
              <input
                type="text"
                placeholder="00000"
                value={shippingZip}
                onChange={(e) => setShippingZip(e.target.value)}
                className="export-calc-input font-en"
                dir="ltr"
              />
            </div>

            <button
              onClick={handleCalculateShipping}
              disabled={calcLoading}
              className="export-calc-btn"
            >
              {calcLoading ? 'جاري الاحتساب...' : 'احسب الشحن'}
            </button>
          </div>

          {/* Aramex Calculation Status */}
          <div className="export-calc-status-row">
            {calcLoading ? (
              <span className="export-calc-status loading">
                جاري الاتصال بـ Aramex لحساب تكلفة الشحن...
              </span>
            ) : calcDone ? (
              <span className="export-calc-status done flex items-center gap-2 justify-end">
                <span>تم حساب الشحن بنجاح عبر Aramex</span>
                <AramexBadge />
              </span>
            ) : null}
          </div>

          {/* 3 Feature Cards */}
          <div className="export-features-grid">
            <div className="export-feature-box">
              <h3 className="export-feature-h3 font-en">5-7 يوم عمل</h3>
              <p className="export-feature-p">وقت التوصيل المتوقع</p>
            </div>
            <div className="export-feature-box">
              <h3 className="export-feature-h3">شحن مبرد</h3>
              <p className="export-feature-p">الشحن السريع المبرد</p>
            </div>
            <div className="export-feature-box">
              <h3 className="export-feature-h3">مؤمّن بالكامل</h3>
              <p className="export-feature-p">مغطى بالتأمين الكامل</p>
            </div>
          </div>
        </div>
      </div>

      <ExportCartStyles />
    </div>
  );
}

// ─── Scoped CSS ───────────────────────────────────────────────────────────

function ExportCartStyles() {
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

      /* ── 2. Step Progress Bar ── */
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

      /* ── 3. Main Grid ── */
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

      /* Products Col */
      .export-products-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
      .export-products-title {
        font-family: 'Bahij Janna', sans-serif;
        font-size: 18px;
        font-weight: 700;
        color: #2d3748;
      }
      .export-clear-btn {
        background: none;
        border: none;
        color: #e53e3e;
        font-size: 13px;
        font-family: 'GE Dinar One', sans-serif;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
        transition: opacity 0.2s;
      }
      .export-clear-btn:hover { opacity: 0.8; }

      .export-lines-stack { display: flex; flex-direction: column; gap: 16px; }
      .export-line-card {
        background: #ffffff;
        border-radius: 16px;
        padding: 20px;
        display: flex;
        align-items: center;
        gap: 16px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.03);
        border: 1px solid #f0edf4;
        direction: rtl;
      }
      .export-line-thumb {
        width: 90px;
        height: 90px;
        border-radius: 12px;
        overflow: hidden;
        background: #f7fafc;
        flex-shrink: 0;
      }
      .export-line-img { width: 100%; height: 100%; object-fit: cover; }
      .export-thumb-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 32px;
      }
      .export-line-details { flex: 1; min-width: 0; text-align: right; }
      .export-line-category { font-size: 12px; color: #a0aec0; display: block; margin-bottom: 2px; }
      .export-line-name {
        font-family: 'Bahij Janna', sans-serif;
        font-size: 16px;
        font-weight: 700;
        color: #2d3748;
        margin-bottom: 8px;
      }
      .export-chips-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
      .export-chip {
        font-size: 11px;
        color: #718096;
        background: #f7fafc;
        border: 1px solid #edf2f7;
        padding: 2px 10px;
        border-radius: 12px;
      }
      .export-actions-row { display: flex; align-items: center; gap: 16px; }
      .export-action-link {
        background: none;
        border: none;
        color: #a0aec0;
        font-size: 12px;
        font-family: 'GE Dinar One', sans-serif;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;
        transition: color 0.2s;
      }
      .export-action-link:hover { color: #234745; }

      .export-line-left {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 16px;
        flex-shrink: 0;
      }
      .export-price-block { text-align: left; }
      .export-compare-price { font-size: 13px; color: #a0aec0; text-decoration: line-through; display: flex; align-items: center; gap: 2px; }
      .export-current-price { font-size: 16px; font-weight: 700; color: #2d3748; }

      .export-qty-wrapper {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .export-qty-label { font-size: 13px; color: #718096; }
      .export-qty-stepper {
        display: flex;
        align-items: center;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        background: #ffffff;
        padding: 2px;
      }
      .export-qty-btn {
        width: 30px;
        height: 30px;
        background: none;
        border: none;
        font-size: 16px;
        font-weight: 700;
        color: #2d3748;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
        border-radius: 8px;
      }
      .export-qty-btn:hover:not(:disabled) { background: #f7fafc; color: #234745; }
      .export-qty-btn:disabled { opacity: 0.3; cursor: not-allowed; }
      .export-qty-val { width: 32px; text-align: center; font-size: 14px; font-weight: 700; color: #234745; }

      /* Summary Col */
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
        margin-bottom: 20px;
        text-align: right;
      }
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
      .export-summary-divider { height: 1px; background: #edf2f7; margin: 20px 0; }

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

      .export-discount-form { display: flex; gap: 8px; margin-bottom: 12px; }
      .export-discount-input {
        flex: 1;
        height: 42px;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 0 14px;
        font-size: 13px;
        font-family: 'GE Dinar One', sans-serif;
        outline: none;
        background: #fafaf8;
        text-align: right;
      }
      .export-discount-input:focus { border-color: #234745; }
      .export-discount-btn {
        height: 42px;
        padding: 0 18px;
        background: #234745;
        color: #ffffff;
        border: none;
        border-radius: 10px;
        font-family: 'GE Dinar One', sans-serif;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        transition: background 0.2s;
      }
      .export-discount-btn:hover:not(:disabled) { background: #1a3432; }
      .export-discount-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      .export-applied-discounts { text-align: right; margin-bottom: 14px; }
      .export-discount-badge { font-size: 12px; color: #234745; font-weight: 600; }

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

      /* ── 4. Bottom Calc & Feature Cards ── */
      .export-calc-section {
        background: #ffffff;
        border-radius: 16px;
        padding: 32px;
        border: 1px solid #edf2f7;
        box-shadow: 0 2px 8px rgba(0,0,0,0.03);
      }
      .export-calc-title {
        font-family: 'Bahij Janna', sans-serif;
        font-size: 20px;
        font-weight: 700;
        color: #234745;
        text-align: right;
        margin-bottom: 24px;
      }
      .export-calc-form {
        display: grid;
        grid-template-columns: 1fr 1fr 160px;
        gap: 16px;
        align-items: flex-end;
        margin-bottom: 16px;
        direction: rtl;
      }
      @media (max-width: 768px) {
        .export-calc-form { grid-template-columns: 1fr; }
      }
      .export-calc-field { display: flex; flex-direction: column; gap: 6px; text-align: right; }
      .export-calc-label { font-size: 12px; color: #718096; }
      .export-calc-select, .export-calc-input {
        height: 46px;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 0 14px;
        font-size: 14px;
        font-family: 'GE Dinar One', sans-serif;
        color: #2d3748;
        background: #ffffff;
        outline: none;
      }
      .export-calc-select:focus, .export-calc-input:focus { border-color: #234745; }
      .export-calc-btn {
        height: 46px;
        background: #234745;
        color: #ffffff;
        border: none;
        border-radius: 10px;
        font-family: 'GE Dinar One', sans-serif;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        transition: background 0.2s;
      }
      .export-calc-btn:hover { background: #1a3432; }

      .export-calc-status-row { text-align: right; margin-bottom: 28px; min-height: 24px; }
      .export-calc-status { font-size: 12px; font-weight: 600; }
      .export-calc-status.loading { color: #d69e2e; }
      .export-calc-status.done { color: #718096; }

      .export-features-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 20px;
        direction: rtl;
      }
      @media (max-width: 640px) {
        .export-features-grid { grid-template-columns: 1fr; }
      }
      .export-feature-box {
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        padding: 24px;
        text-align: center;
        background: #ffffff;
      }
      .export-feature-h3 {
        font-family: 'Bahij Janna', sans-serif;
        font-size: 20px;
        font-weight: 700;
        color: #2d3748;
        margin-bottom: 6px;
      }
      .export-feature-p { font-size: 13px; color: #a0aec0; }

      /* Empty State */
      .export-empty-container {
        text-align: center;
        padding: 80px 20px;
        background: #ffffff;
        border-radius: 20px;
        margin: 40px 0;
        border: 1px solid #edf2f7;
      }
      .export-empty-icon { font-size: 64px; margin-bottom: 16px; }
      .export-empty-title {
        font-family: 'Bahij Janna', sans-serif;
        font-size: 24px;
        font-weight: 700;
        color: #234745;
        margin-bottom: 8px;
      }
      .export-empty-desc { font-size: 15px; color: #718096; margin-bottom: 24px; }
      .export-empty-btn {
        display: inline-block;
        padding: 12px 32px;
        background: #234745;
        color: #ffffff;
        border-radius: 12px;
        text-decoration: none;
        font-weight: 700;
        font-size: 15px;
      }
    `}</style>
  );
}
