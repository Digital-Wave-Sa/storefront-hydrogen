import { useOptimisticCart, Analytics, CartForm } from '@shopify/hydrogen';
import { Link, useRouteLoaderData, useLocation, useFetcher, useFetchers } from 'react-router';
import { useEffect, useState, useRef } from 'react';
import type { CartApiQueryFragment } from 'storefrontapi.generated';
import { useAside } from '~/components/Aside';
import { CartLineItem, type CartLine } from '~/components/CartLineItem';
import { CartSummary } from './CartSummary';
import { Price, SaudiRiyalSymbol } from './Price';
import { checkBranchFreeDeliveryInterval } from './DeliveryPickupModal';
import patternBg from '/images/second-bg-pattern.svg';

export type CartLayout = 'page' | 'aside';
const CartAnalyticsView = Analytics.CartView as any;

export type CartMainProps = {
  cart: CartApiQueryFragment | null;
  layout: CartLayout;
};

export type LineItemChildrenMap = { [parentId: string]: CartLine[] };
/** Returns a map of all line items and their children. */
function getLineItemChildrenMap(lines: CartLine[]): LineItemChildrenMap {
  const children: LineItemChildrenMap = {};
  for (const line of lines) {
    if ('parentRelationship' in line && line.parentRelationship?.parent) {
      const parentId = line.parentRelationship.parent.id;
      if (!children[parentId]) children[parentId] = [];
      children[parentId].push(line);
    }
    if ('lineComponents' in line) {
      const childrenMap = getLineItemChildrenMap(line.lineComponents);
      for (const [parentId, childIds] of Object.entries(childrenMap)) {
        if (!children[parentId]) children[parentId] = [];
        children[parentId].push(...childIds);
      }
    }
  }
  return children;
}

export function CartMain({ layout, cart: originalCart }: CartMainProps) {
  const location = useLocation();
  const isEn = location.pathname.split('/')[1]?.toLowerCase() === 'en';
  const cartRoute = isEn ? '/en/cart' : '/cart';
  const rootData = useRouteLoaderData('root') as any;

  // ── Locale-aware cart reload ──────────────────────────────────────────────
  // Root's deferred cart may have been fetched in a different language context.
  // This fetcher explicitly reloads the cart from the locale-correct route so
  // product names always appear in the right language.
  const cartReloadFetcher = useFetcher<any>();
  const allFetchers = useFetchers();

  // Count active cart mutations across all fetchers (POST only — exclude GET loads)
  const activeMutationCount = allFetchers.filter(
    (f) =>
      f.state !== 'idle' &&
      f.formMethod !== 'GET' &&
      (f.formAction === '/cart' || f.formAction === '/en/cart'),
  ).length;
  const prevMutationCountRef = useRef(0);

  // On mount (cart drawer opens) load fresh cart data with correct locale
  useEffect(() => {
    if (layout === 'aside' && cartReloadFetcher.state === 'idle') {
      cartReloadFetcher.load(cartRoute);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartRoute]);

  // After any mutation completes, reload cart with correct locale
  useEffect(() => {
    if (
      prevMutationCountRef.current > 0 &&
      activeMutationCount === 0 &&
      cartReloadFetcher.state === 'idle'
    ) {
      cartReloadFetcher.load(cartRoute);
    }
    prevMutationCountRef.current = activeMutationCount;
  }, [activeMutationCount, cartRoute]);

  // Use freshly fetched locale-correct cart; fall back to root's cart
  const effectiveCart =
    cartReloadFetcher.data !== undefined ? cartReloadFetcher.data : originalCart;

  const cart = useOptimisticCart(effectiveCart);
  // ─────────────────────────────────────────────────────────────────────────

  const cartLines = cart?.lines?.nodes || [];
  const linesCount = cartLines.length;
  const cartHasItems = (cart?.totalQuantity ? cart.totalQuantity > 0 : false) || linesCount > 0;
  const childrenMap = getLineItemChildrenMap(cartLines);

  // Clean up any legacy localStorage backup items if present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('saadeddin_cart_backup_lines');
      sessionStorage.removeItem('saadeddin_checkout_initiated');
    }
  }, []);

  // --- UNDO REMOVED ITEM LOGIC ---
  const prevLinesRef = useRef<CartLine[]>([]);
  const [deletedLine, setDeletedLine] = useState<CartLine | null>(null);

  // 1. Detect removals
  useEffect(() => {
    const currentLines = cart?.lines?.nodes || [];

    if (prevLinesRef.current.length > 0 && currentLines.length < prevLinesRef.current.length) {
      const currentIds = new Set(currentLines.map(l => l.id));
      const removedLines = prevLinesRef.current.filter(l => !currentIds.has(l.id));

      if (removedLines.length === 1 && !removedLines[0].isOptimistic) {
        setDeletedLine(removedLines[0]);
      }
    }

    // Clear if an item was ADDED
    if (currentLines.length > prevLinesRef.current.length) {
      setDeletedLine(null);
    }

    prevLinesRef.current = currentLines;
  }, [cart?.lines?.nodes]);

  // 2. Detect restoration (item comes back)
  useEffect(() => {
    const currentLines = cart?.lines?.nodes || [];
    if (deletedLine && currentLines.some(l => l.merchandise.id === deletedLine.merchandise.id)) {
      setDeletedLine(null);
    }
  }, [cart?.lines?.nodes, deletedLine]);

  // 3. Auto-hide timer
  useEffect(() => {
    if (!deletedLine) return;
    const timer = setTimeout(() => setDeletedLine(null), 6000);
    return () => clearTimeout(timer);
  }, [deletedLine]);
  // -------------------------------

  const [adminLocations, setAdminLocations] = useState<any[]>([]);
  useEffect(() => {
    fetch('/api/locations-meta')
      .then((res) => res.json())
      .then((data) => {
        if (data?.locations) {
          setAdminLocations(data.locations);
        }
      })
      .catch((err) => console.error('[CartMain] Failed to fetch locations-meta:', err));
  }, []);

  // Dynamic Delivery Threshold Logic
  const branchName = cart?.attributes?.find(a => a.key === 'Branch')?.value;
  const branchId = cart?.attributes?.find(a => a.key === 'Branch ID')?.value;
  const rawLocations = rootData?.locations?.locations?.nodes || rootData?.locations?.nodes || [];
  const locations = adminLocations.length > 0 ? adminLocations : rawLocations;

  // Try matching by ID first (more reliable), then fallback to name
  const currentBranch = locations.find((loc: any) =>
    (branchId && loc.id === branchId) ||
    (branchName && loc.name === branchName)
  );

  const timeSlot = cart?.attributes?.find(a => a.key.toLowerCase().trim() === 'time slot')?.value || '';
  const branchPromo = checkBranchFreeDeliveryInterval(currentBranch, timeSlot);
  const isBranchPromoFreeDelivery = branchPromo.isPromoFreeDelivery;

  const thresholdMeta = currentBranch?.free_delivery_threshold || currentBranch?.metafields?.find((m: any) => m?.key === 'free_delivery_threshold');
  const thresholdAttr = cart?.attributes?.find(a => a.key.toLowerCase().trim() === 'free delivery threshold')?.value;
  const hasExplicitThreshold = !!(thresholdAttr || thresholdMeta?.value);
  const threshold = thresholdAttr ? parseFloat(thresholdAttr) : (thresholdMeta?.value ? parseFloat(thresholdMeta.value) : 0);
  const fulfillmentType = cart?.attributes?.find(a => a.key.toLowerCase().trim() === 'fulfillment type')?.value;
  const isPickup = (fulfillmentType?.toLowerCase() === 'pickup') || (rootData?.fulfillmentType?.toLowerCase() === 'pickup');

  const isDigitalOnlyCart =
    (cart?.lines?.nodes?.length || 0) > 0 &&
    cart?.lines?.nodes?.every((line: any) => {
      const isVoucher = line.attributes?.some(
        (a: any) =>
          (a.key === '_gift_voucher' && a.value === 'true') ||
          a.key.toLowerCase().includes('voucher') ||
          a.key.toLowerCase().includes('gift mode'),
      );
      const isDigitalTag = line.merchandise?.product?.tags?.some((t: string) =>
        ['digital', 'gift-card', 'giftcard', 'voucher'].includes(t.toLowerCase().trim()),
      );
      const productTitle = (line.merchandise?.product?.title || line.merchandise?.title || '').toLowerCase();
      const isGiftProduct =
        productTitle.includes('gift card') ||
        productTitle.includes('بطاقة هدية') ||
        productTitle.includes('قسيمة');
      const requiresShipping = line.merchandise?.requiresShipping;

      return isVoucher || isDigitalTag || isGiftProduct || requiresShipping === false;
    });

  const subtotal = cart?.cost?.subtotalAmount?.amount ? parseFloat(cart.cost.subtotalAmount.amount) : 0;
  const progress = threshold > 0 ? Math.min((subtotal / threshold) * 100, 100) : 0;
  const remaining = Math.max(threshold - subtotal, 0);
  const currencyCode = cart?.cost?.subtotalAmount?.currencyCode || 'SAR';

  if (layout === 'page') {
    return (
      <div className="w-full bg-[#FEF8EB] min-h-screen" dir={isEn ? 'ltr' : 'rtl'}>
        <CartAnalyticsView cart={cart as any} />

        {/* 1. Full-Width Styled Header */}
        <section className="relative h-[144px] w-full bg-[#234745] overflow-hidden flex items-center" dir={isEn ? 'ltr' : 'rtl'}>
          <div
            className="absolute inset-0 bg-[length:950px_800px] md:bg-[length:1900px_2000px]"
            style={{
              backgroundImage: `url(${patternBg})`,
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          />
          <div className="max-w-[1440px] w-full mx-auto px-4 md:px-8 lg:px-12 relative z-10 flex items-center justify-between" dir={isEn ? 'ltr' : 'rtl'}>
            <div className="flex flex-row items-center justify-start gap-4 md:gap-6 w-full">

              {/* Back Button (First in DOM = Right in RTL) */}
              <button
                onClick={() => { if (typeof window !== 'undefined') window.history.back(); }}
                className={`flex items-center gap-[8px] bg-[#9FB7AE] hover:bg-[#8BA19C] text-[#234745] px-4 md:px-6 py-2.5 rounded-[25px] text-[12px] md:text-[16px] font-bold transition-all shrink-0 ${isEn ? 'font-en' : ''}`}
                style={isEn ? {} : { fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                dir={isEn ? 'ltr' : 'rtl'}
              >
                <svg width="15" height="13" viewBox="0 0 15 13" fill="none" xmlns="http://www.w3.org/2000/svg" className={`${isEn ? 'rotate-180' : ''}`}>
                  <path d="M0 6H12.25L7 0.75L7.66 0L14.16 6.5L7.66 13L7 12.25L12.25 7H0V6Z" fill="#234745"/>
                </svg>
                <span>{isEn ? 'Back' : 'رجوع'}</span>
              </button>

              {/* Title & Subtitle Block (Second in DOM = Left of button in RTL) */}
              <div className={`flex flex-col ${isEn ? 'text-left' : 'text-right'}`}>
                <h1 className="!m-0 !mb-1 text-[24px] md:text-[34px] font-bold text-white leading-none" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}>
                  {isEn ? 'Shopping Cart' : 'سلة التسوق'}
                </h1>
                <p className="!m-0 text-[13px] md:text-[15px] font-medium text-[#c4d0cc] leading-none" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                  {isEn ? `${cart?.totalQuantity || 0} products in your cart` : `${new Intl.NumberFormat('en-US').format(cart?.totalQuantity || 0)} منتجات في سلتك`}
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* 2. White Breadcrumb Section */}
        <div className="w-full bg-white py-4 mb-10">
          <div className="max-w-[1400px] mx-auto px-4 md:px-8">
            <div className="flex items-center gap-2 text-[14px] font-bold" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
              <Link to={isEn ? "/en" : "/"} className="text-gray-400 hover:text-[#234745] transition-colors">{isEn ? 'Home' : 'الرئيسية'}</Link>
              <span className="text-gray-300">/</span>
              <span className="text-[#234745]">{isEn ? 'Shopping Cart' : 'سلة التسوق'}</span>
            </div>
          </div>
        </div>

        <div className="max-w-[1400px] mx-auto w-full px-4 md:px-8 pb-20">
          <div className={cartHasItems ? "lg:grid lg:grid-cols-[1fr_380px] gap-8 lg:gap-12 items-start" : "flex items-center justify-center min-h-[45vh] max-w-2xl mx-auto p-8 md:p-12 w-full"}>
            {/* Left Column (Items) */}
            <div className="flex flex-col gap-4">
              {/* Dynamic Branch Promo Free Delivery Banner */}
              {cartHasItems && !isPickup && !isDigitalOnlyCart && isBranchPromoFreeDelivery && (
                <div className="bg-[#FEF8EB] border border-[#EBDCC5] text-[#234745] p-4 rounded-[20px] mb-1 flex items-center gap-3 shadow-xs">
                  <div className="w-9 h-9 rounded-full bg-[#234745] text-amber-300 flex items-center justify-center font-bold text-lg shrink-0">
                    ⚡
                  </div>
                  <div>
                    <p className="text-[14px] font-extrabold text-[#234745]">
                      {isEn ? 'Promo Free Delivery Active!' : 'عرض التوصيل المجاني مفعّل الان!'}
                    </p>
                    <p className="text-[12px] text-[#8C6418] font-medium mt-0.5">
                      {isEn
                        ? `Free delivery unlocked for ${currentBranch?.name || 'your branch'} (${branchPromo.promoStart12h} – ${branchPromo.promoEnd12h})`
                        : `توصيل مجاني مفعّل لـ ${currentBranch?.name || 'فرعك'} (من ${branchPromo.promoStart12h} إلى ${branchPromo.promoEnd12h})`}
                    </p>
                  </div>
                </div>
              )}

              {/* Free Delivery Progress (Restored) */}
              {cartHasItems && !isPickup && !isDigitalOnlyCart && hasExplicitThreshold && threshold > 0 && (
                <div className="bg-white rounded-[24px] p-6 border border-[#BBCFCD]/80 mb-2">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-[14px] font-bold text-[#234745]">
                      {progress >= 100 ? (
                        <span className="text-green-600 flex items-center gap-1">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          {isEn ? "Free delivery unlocked!" : "لقد حصلت على توصيل مجاني!"}
                        </span>
                      ) : (
                        isEn ? (
                          <>Add <span className="text-[#d4a06a]">{currencyCode} {remaining.toFixed(2)}</span> for free delivery</>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            أضف <span className="text-[#d4a06a] mx-1">{remaining.toFixed(2)}</span> {currencyCode === 'SAR' ? <SaudiRiyalSymbol className="h-3 w-auto" /> : currencyCode} للتوصيل المجاني
                          </span>
                        )
                      )}
                    </p>
                    <span className="text-[12px] font-bold text-gray-300">{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full h-2 bg-[#f8f5f2] rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-700 ease-out rounded-full ${progress >= 100 ? 'bg-green-500' : 'bg-[#d4a06a]'}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}


              {/* Dynamic Delivery Alert (Only shows if relevant) */}
              {(cart?.attributes?.find(a => a.key === 'error')?.value) && (
                <div className="bg-white rounded-2xl p-5 border border-red-100 shadow-sm flex items-start gap-4 relative animate-fade-in">
                  <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-[14px] leading-snug text-red-600 font-medium">
                      {cart.attributes.find(a => a.key === 'error')?.value}
                    </p>
                  </div>
                </div>
              )}

              {!cartHasItems && <CartEmpty layout={layout} isEn={isEn} />}

              {cartHasItems && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-[#F2E8D5] pb-4">
                    <h3 className="text-[16px] font-medium text-[#234745]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                      {isEn ? `Products (${cart?.totalQuantity || 0})` : `المنتجات (${new Intl.NumberFormat('en-US').format(cart?.totalQuantity || 0)})`}
                    </h3>
                    <CartForm
                      route={cartRoute}
                      action={CartForm.ACTIONS.LinesRemove}
                      inputs={{ lineIds: (cart?.lines?.nodes ?? []).map(line => line.id) }}
                    >
                      <button type="submit" className="flex items-center gap-2 text-[#E64950] hover:text-[#c43b3b] font-medium text-[16px] transition-colors" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                        <svg width="10" height="11" viewBox="0 0 10 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M0.666667 10.5133V1.18H0V0.513333H2.66667V0H6.66667V0.513333H9.33333V1.18H8.66667V10.5133H0.666667ZM1.33333 9.84667H8V1.18H1.33333V9.84667ZM3.20533 8.51333H3.872V2.51333H3.20533V8.51333ZM5.46133 8.51333H6.128V2.51333H5.46133V8.51333Z" fill="#E64950" />
                        </svg>

                        {isEn ? 'Empty Cart' : 'إفراغ السلة'}
                      </button>
                    </CartForm>
                  </div>
                  <ul className="flex flex-col gap-4">
                    {(cart?.lines?.nodes ?? []).map((line) => {
                      if ('parentRelationship' in line && line.parentRelationship?.parent) return null;
                      return (
                        <CartLineItem
                          key={line.id}
                          line={line}
                          layout={layout}
                          childrenMap={childrenMap}
                          cart={cart}
                        />
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            {/* Right Column (Summary) */}
            {cartHasItems && (
              <div className="lg:sticky lg:top-8 flex flex-col gap-6">
                <CartSummary cart={cart} layout={layout} />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ASIDE LAYOUT
  return (
    <section className="flex flex-col h-full bg-white relative" aria-label="Cart drawer" dir={isEn ? 'ltr' : 'rtl'}>
      <CartAnalyticsView cart={cart as any} />

      {/* Progress Bar (Only show if items exist and layout is aside AND not pickup) */}
      {cartHasItems && !isPickup && (
        <div className="px-6 py-4 bg-[#fcfaf8] border-b border-[#f0ece8]">
          <p className="text-[13px] font-bold text-[#234745] mb-2 text-center">
            {progress >= 100 ? (
              <span className="text-green-600 flex items-center justify-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                {isEn ? "You've unlocked free delivery!" : "لقد حصلت على توصيل مجاني!"}
              </span>
            ) : (
              isEn ? (
                <>Add <span className="text-yellow-600">{currencyCode} {remaining.toFixed(2)}</span> more to unlock free delivery!</>
              ) : (
                <span className="inline-flex items-center gap-1">
                  أضف <span className="text-yellow-600 mx-1">{remaining.toFixed(2)}</span> {currencyCode === 'SAR' ? <SaudiRiyalSymbol className="h-3.5 w-auto" /> : currencyCode} للحصول على توصيل مجاني!
                </span>
              )
            )}
          </p>
          <div className="w-full h-1.5 bg-[#e8e4e1] rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ease-out rounded-full ${progress >= 100 ? 'bg-green-500' : 'bg-yellow-500'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Cart Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
        {cartHasItems && isPickup && (
          <div className="mb-6 p-4 bg-[#fcfaf8] rounded-2xl border border-[#f0ece8] flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#234745] shadow-sm shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
            </div>
            <div>
              <p className="text-[13px] font-black text-[#234745]">{isEn ? 'Store Pickup' : 'استلام من الفرع'}</p>
              <p className="text-[11px] text-gray-500 font-medium">{isEn ? 'No delivery fees applied' : 'لا توجد رسوم توصيل'}</p>
            </div>
          </div>
        )}

        {/* Dynamic Delivery Alert */}
        {(cart?.attributes?.find(a => a.key === 'error')?.value) && (
          <div className="mb-6 bg-white rounded-2xl p-4 border border-red-100 shadow-sm flex items-start gap-3 relative animate-fade-in">
            <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            </div>
            <div className="flex-1 pt-1">
              <p className="text-[13px] leading-snug text-red-600 font-medium">
                {cart.attributes.find(a => a.key === 'error')?.value}
              </p>
            </div>
          </div>
        )}

        {!cartHasItems && <CartEmpty layout={layout} isEn={isEn} />}

        {cartHasItems && (
          <ul className="flex flex-col gap-5">
            {(cart?.lines?.nodes ?? []).map((line) => {
              if ('parentRelationship' in line && line.parentRelationship?.parent) return null;
              return (
                <CartLineItem
                  key={line.id}
                  line={line}
                  layout={layout}
                  childrenMap={childrenMap}
                  cart={cart}
                />
              );
            })}
          </ul>
        )}
      </div>

      {/* Cart Summary Footer */}
      {cartHasItems && (
        <div className="mt-auto shrink-0 bg-white border-t border-[#f0ece8] p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,1rem))] shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
          <CartSummary cart={cart} layout={layout} />
        </div>
      )}

      {/* Undo Toast Notification */}
      {deletedLine && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 bg-[#234745] text-white px-5 py-3 rounded-xl shadow-2xl flex items-center justify-between gap-6 z-50 animate-fade-in w-[90%] max-w-[350px]">
          <div className="flex flex-col">
            <span className="text-[13px] font-bold">
              {isEn ? 'Item removed' : 'تمت إزالة المنتج'}
            </span>
            <span className="text-[11px] text-gray-300 truncate max-w-[200px]">{deletedLine.merchandise.product.title}</span>
          </div>
          <CartForm
            route={cartRoute}
            action={CartForm.ACTIONS.LinesAdd}
            inputs={{
              lines: [
                {
                  merchandiseId: deletedLine.merchandise.id,
                  quantity: deletedLine.quantity,
                  attributes: (deletedLine.attributes || []).map(a => ({ key: a.key, value: a.value ?? '' }))
                }
              ]
            }}
          >
            <button
              type="submit"
              onClick={() => setTimeout(() => setDeletedLine(null), 200)}
              className="text-[#d4a06a] font-black text-[13px] hover:text-white transition-colors bg-white/10 px-4 py-2 rounded-lg"
              style={{ fontFamily: !isEn ? "'GE Dinar One', sans-serif" : undefined }}
            >
              {isEn ? 'UNDO' : 'تراجع'}
            </button>
          </CartForm>
        </div>
      )}
    </section>
  );
}

function CartEmpty({ hidden = false, layout, isEn }: { hidden: boolean; layout?: CartMainProps['layout']; isEn?: boolean }) {
  const { close } = useAside();
  return (
    <div hidden={hidden} className="flex flex-col items-center justify-center h-full text-center py-10">
      <div className="w-24 h-24 mb-6 rounded-full bg-[#fcfaf8] flex items-center justify-center border border-[#f0ece8]">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d4a06a" strokeWidth="1.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" /></svg>
      </div>
      <h3 className="text-xl font-bold text-[#234745] !mb-2">{isEn ? 'Your cart is empty' : 'سلة التسوق فارغة'}</h3>
      <p className="text-[#888] text-sm !mb-4 max-w-[250px]">
        {isEn ? "Looks like you haven't added anything yet, let's get you started!" : "يبدو أنك لم تقم بإضافة أي شيء بعد، دعنا نبدأ!"}
      </p>
      <button
        onClick={close}
        className="bg-[#234745] text-white font-bold py-3 px-8 rounded-full hover:bg-[#d4a06a] transition-colors"
      >
        {isEn ? 'Continue Shopping' : 'مواصلة التسوق'}
      </button>
    </div>
  );
}
