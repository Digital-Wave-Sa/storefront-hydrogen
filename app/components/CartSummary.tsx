import type {CartApiQueryFragment} from 'storefrontapi.generated';
import type {CartLayout} from '~/components/CartMain';
import {CartForm, Money, type OptimisticCart} from '@shopify/hydrogen';
import {useEffect, useId, useRef, useState} from 'react';
import {useFetcher, useRouteLoaderData, Link, useLocation} from 'react-router';
import {useAside} from '~/components/Aside';
import {Price, SaudiRiyalSymbol} from './Price';

type CartSummaryProps = {
  cart: OptimisticCart<CartApiQueryFragment | null>;
  layout: CartLayout;
};

export function CartSummary({cart, layout}: CartSummaryProps) {
  const summaryId = useId();
  const discountsHeadingId = useId();
  const discountCodeInputId = useId();
  const giftCardHeadingId = useId();
  const giftCardInputId = useId();

  const location = useLocation();
  const isEn = location.pathname.split('/')[1]?.toLowerCase() === 'en';
  const rootData = useRouteLoaderData('root') as any;

  const subtotal = Number(cart?.cost?.subtotalAmount?.amount ?? 0);
  const currencyCode = cart?.cost?.subtotalAmount?.currencyCode || 'SAR';
  
  const attributes = cart?.attributes || [];
  const branch = attributes.find((a: any) => a.key.toLowerCase().trim() === 'branch')?.value;
  const branchId = attributes.find((a: any) => a.key.toLowerCase().trim() === 'branch id')?.value;
  const fulfillmentType = attributes.find((a: any) => a.key.toLowerCase().trim() === 'fulfillment type')?.value;
  const timeSlot = attributes.find((a: any) => a.key.toLowerCase().trim() === 'time slot')?.value;

  // Dynamic Settings from Metafields
  const locations = rootData?.locations?.locations?.nodes || rootData?.locations?.nodes || [];
  // Try matching by ID first (more reliable), then fallback to name
  const currentBranch = locations.find((loc: any) => 
    (branchId && loc.id === branchId) || 
    (branch && loc.name === branch)
  );

  const minOrderMeta = currentBranch?.min_order_value || currentBranch?.metafields?.find((m: any) => m?.key === 'minimum_order_value');
  const minOrderAttr = attributes.find((a: any) => a.key.toLowerCase().trim() === 'minimum order value')?.value;
  const minOrderValue = minOrderAttr ? parseFloat(minOrderAttr) : (minOrderMeta?.value ? parseFloat(minOrderMeta.value) : 50); 
  const isMinOrderMet = subtotal >= minOrderValue;
  const thresholdMeta = currentBranch?.free_delivery_threshold || currentBranch?.metafields?.find((m: any) => m?.key === 'free_delivery_threshold');
  const feeMeta = currentBranch?.delivery_fee || currentBranch?.metafields?.find((m: any) => m?.key === 'delivery_fee');
  const thresholdAttr = attributes.find((a: any) => a.key.toLowerCase().trim() === 'free delivery threshold')?.value;
  const threshold = thresholdAttr ? parseFloat(thresholdAttr) : (thresholdMeta?.value ? parseFloat(thresholdMeta.value) : 300);
  const isFreeDelivery = subtotal >= threshold;
  const feeAttribute = attributes.find((a: any) => a.key.toLowerCase().trim() === 'delivery fee')?.value;
  const isPickup = fulfillmentType?.toLowerCase() === 'pickup';
  // Use dynamically calculated fee from attribute, otherwise fallback to metafield base fee or 25
  const deliveryFee = (isFreeDelivery || isPickup) ? 0 : (feeAttribute ? parseFloat(feeAttribute) : (feeMeta?.value ? parseFloat(feeMeta.value) : 25));
  const calculatedTotal = parseFloat(cart?.cost?.totalAmount?.amount || '0') + deliveryFee;

  const isTimeSlotSelected = !!timeSlot && timeSlot.trim() !== '';
  const isBranchSelected = !!branch && branch.trim() !== '';

  const hasPreOrderItems = cart?.lines?.nodes?.some((line: any) => 
    line.merchandise?.product?.tags?.some((tag: string) => 
      ['preorder', 'pre-order', 'طلب مسبق'].includes(tag.toLowerCase().trim())
    )
  );

  const hasCashOnly = cart?.lines?.nodes?.some((line: any) => 
    line.merchandise?.product?.tags?.some((tag: string) => tag.toLowerCase().trim() === 'cash-only')
  );

  const hasPrepaidOnly = cart?.lines?.nodes?.some((line: any) => 
    line.merchandise?.product?.tags?.some((tag: string) => tag.toLowerCase().trim() === 'prepaid-only')
  );

  const isOutOfRange = !!attributes.find((a: any) => a.key === 'error')?.value;

  const canCheckout = isMinOrderMet && isBranchSelected && !isOutOfRange;

  return (
    <div aria-labelledby={summaryId} className="flex flex-col gap-4">
      {layout === 'page' && (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col pt-6">
            {/* Header */}
            <div className="px-6 pb-4 border-b border-gray-200">
               <h3 className={`text-[20px] font-black text-[#1a1a1a] ${isEn ? 'text-left' : 'text-right'}`} style={{ fontFamily: "'Bahij Janna', sans-serif" }}>
                 {isEn ? 'Order Summary' : 'ملخص الطلب'}
               </h3>
            </div>

            <div className="px-6 py-6 flex flex-col gap-6">
              {/* Promo Code Input */}
              <CartDiscounts
                discountCodes={cart?.discountCodes}
                discountsHeadingId={discountsHeadingId}
                discountCodeInputId={discountCodeInputId}
                isEn={isEn}
              />

              {/* Loyalty Redemption */}
              <LoyaltyRedemptionUI isEn={isEn} cart={cart} />

              {/* Time Slot Picker */}
              <CartTimeSlot isEn={isEn} cart={cart} />

              {/* Order Notes */}
              <CartOrderNotes isEn={isEn} cart={cart} />

              {/* Breakdown */}
              <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center text-[15px]">
                     <dt className="text-[#9FB7AE] font-bold" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>{isEn ? 'Subtotal' : 'المجموع الفرعي'}</dt>
                     <dd className="text-[#234745] font-black font-en flex items-center gap-1 flex-row-reverse">
                       <span className="text-[16px]">﷼</span>
                       <span>{subtotal.toFixed(2)}</span>
                     </dd>
                  </div>

                  <div className="flex justify-between items-center text-[15px]">
                     <dt className="text-[#9FB7AE] font-bold" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>{isEn ? 'Delivery Fees' : 'رسوم التوصيل'}</dt>
                     <dd className="text-[#234745] font-bold font-en flex items-center gap-1">
                       {isFreeDelivery ? (
                         <span className="text-[#234745] font-black text-[15px]">{isEn ? 'Free' : 'مجاني'}</span>
                       ) : (
                         <div className="flex items-center gap-1 flex-row-reverse">
                           <span className="text-[16px]">﷼</span>
                           <span className="font-black">{deliveryFee.toFixed(2)}</span>
                         </div>
                       )}
                     </dd>
                  </div>

                  {cart?.cost?.totalTaxAmount && (
                    <div className="flex justify-between items-center text-[15px]">
                      <dt className="text-[#9FB7AE] font-bold" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>{isEn ? 'VAT (15%)' : 'ضريبة القيمة المضافة (١٥٪)'}</dt>
                      <dd className="text-[#234745] font-black font-en flex items-center gap-1 flex-row-reverse">
                        <span className="text-[16px]">﷼</span>
                        <span>{parseFloat(cart.cost.totalTaxAmount.amount).toFixed(2)}</span>
                      </dd>
                    </div>
                  )}
              </div>

              {/* Separator */}
              <div className="border-t border-gray-200"></div>

              {/* Total */}
              <div className="flex justify-between items-center">
                 <div className="flex flex-col gap-1">
                    <dt className="text-[20px] font-black text-[#234745]" style={{ fontFamily: "'Bahij Janna', sans-serif" }}>
                      {isEn ? 'Total' : 'الإجمالي'}
                    </dt>
                    <span className="text-[12px] text-[#9FB7AE] font-bold">
                      {isEn ? 'Includes 15% VAT' : 'شامل ضريبة القيمة المضافة ١٥٪'}
                    </span>
                 </div>
                 <dd className="text-[28px] font-black text-[#234745] font-en flex items-center gap-2 flex-row-reverse">
                   <span className="text-[24px]">﷼</span>
                   <span>{calculatedTotal.toFixed(2)}</span>
                 </dd>
              </div>

              {/* Buttons */}
              <div className="flex flex-col gap-3 mt-2">
               {hasPrepaidOnly && (
                 <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg flex items-start gap-2 mb-1">
                   <svg className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                   </svg>
                   <p className="text-orange-800 text-[13px] font-bold leading-tight" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                     {isEn 
                       ? 'Note: Cash on Delivery is not available because your cart contains restricted items. Please use a prepaid method at checkout.' 
                       : 'ملاحظة: الدفع عند الاستلام غير متاح لاحتواء سلتك على منتجات تتطلب الدفع المسبق. يرجى استخدام طريقة دفع إلكترونية.'}
                   </p>
                 </div>
               )}
               <CartCheckoutActions 
                 checkoutUrl={cart?.checkoutUrl} 
                 isEn={isEn} 
                 disabled={!canCheckout}
                 totalAmount={calculatedTotal}
                 currencyCode={currencyCode}
                 isPickup={isPickup}
                 validationError={
                   !isMinOrderMet ? (isEn ? `Minimum order is ${currencyCode} ${minOrderValue}` : `الحد الأدنى هو ${minOrderValue} ${currencyCode === 'SAR' ? 'ر.س' : currencyCode}`) :
                   !isBranchSelected ? (isEn ? 'Please select a branch' : 'يرجى اختيار الفرع') :
                   isOutOfRange ? (isEn ? 'Address is out of delivery range' : 'العنوان خارج نطاق التوصيل') :
                   null
                 }
               />
               <Link 
                 to={isEn ? "/en" : "/"} 
                 className="w-full h-[52px] bg-[#F9E8E8] hover:bg-[#F2DFDF] active:scale-[0.98] transition-all text-[#DF4646] rounded-[50px] font-black text-[16px] flex items-center justify-center border border-[#EAA2A2]"
                 style={{ fontFamily: "'Bahij Janna', sans-serif" }}
               >
                 {isEn ? 'Continue Shopping' : 'متابعة التسوق'}
               </Link>
            </div>

            {/* Tamara Promo Box */}
            <div className="bg-[#FBF9F4] rounded-[16px] p-5 border border-[#F2E8D5] flex flex-col items-center text-center shadow-sm relative mt-4">
                <div className="px-5 py-1 rounded-[10px] mb-3 inline-block" style={{ background: 'linear-gradient(90deg, #F9C3A3 0%, #D4A5E4 50%, #9BC4E5 100%)' }}>
                   <span className="text-[#1a1a1a] font-black text-[18px] tracking-tight font-en leading-none block pt-0.5">tamara</span>
                </div>
                <h4 className="text-[15px] font-black text-[#1a1a1a] leading-tight mb-2" style={{ fontFamily: "'Bahij Janna', sans-serif" }}>
                    {isEn ? 'Split it into 4 interest-free payments' : 'قسّطها على ٤ دفعات بدون فوائد'}
                </h4>
                <div className="w-full flex justify-end mt-1">
                  <p className="text-[11px] font-bold text-gray-500">
                      {isEn ? 'with Tamara' : 'مع تمارا'}
                  </p>
                </div>
            </div>

            {/* Footer Features */}
            <div className="flex items-center justify-between mt-6 border-t border-gray-200 pt-6 px-2 pb-6">
                <div className="flex flex-col items-center">
                    <span className="text-[13px] font-bold text-[#9FB7AE]" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>{isEn ? 'Guaranteed Quality' : 'جودة مضمونة'}</span>
                </div>
                <div className="flex flex-col items-center">
                    <span className="text-[13px] font-bold text-[#9FB7AE]" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>{isEn ? 'Fast Delivery' : 'توصيل سريع'}</span>
                </div>
                <div className="flex flex-col items-center">
                    <span className="text-[13px] font-bold text-[#9FB7AE]" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>{isEn ? 'Secure Payment' : 'دفع آمن ومضمون'}</span>
                </div>
            </div>
            </div>
          </div>
        </>
      )}

      {layout === 'aside' && (
        <div className="space-y-2 mb-4 px-1">
          <div className="flex justify-between items-center text-[14px]">
            <dt className="text-gray-400 font-medium">{isEn ? 'Subtotal' : 'المجموع الفرعي'}</dt>
            <dd className="text-[#234745] font-bold font-en">
              <Price data={cart?.cost?.subtotalAmount!} isEn={isEn} size="xs" />
            </dd>
          </div>
          
          <div className="flex justify-between items-center text-[14px]">
            <dt className="text-gray-400 font-medium">{isEn ? 'Delivery' : 'التوصيل'}</dt>
            <dd className="text-[#234745] font-bold font-en">
              {isFreeDelivery ? (
                <span className="text-green-600 uppercase text-[10px]">{isEn ? 'Free' : 'مجاني'}</span>
              ) : (
                <Price data={{ amount: deliveryFee.toString(), currencyCode }} isEn={isEn} size="xs" />
              )}
            </dd>
          </div>

          {cart?.cost?.totalTaxAmount && (
            <div className="flex justify-between items-center text-[14px]">
              <dt className="text-gray-400 font-medium">{isEn ? 'VAT' : 'ضريبة القيمة المضافة'}</dt>
              <dd className="text-[#234745] font-bold font-en">
                <Price data={cart.cost.totalTaxAmount} isEn={isEn} size="xs" />
              </dd>
            </div>
          )}

          <div className="pt-2 border-t border-[#f8f5f2] flex justify-between items-center">
            <dt className="text-[15px] font-black text-[#234745]">{isEn ? 'Total' : 'الإجمالي'}</dt>
            <dd className="text-[16px] font-black text-[#234745] font-en">
              <Price data={{ amount: calculatedTotal.toString(), currencyCode }} isEn={isEn} size="sm" />
            </dd>
          </div>
        </div>
      )}

      {layout === 'aside' ? (
        <ViewCartAction isEn={isEn} />
      ) : null}
    </div>
  );
}



// ─── NEW: TIME SLOT PICKER ──────────────────────────────────────────────────
function CartTimeSlot({ isEn, cart, hasError }: { isEn: boolean, cart: any, hasError?: boolean }) {
  const timeSlot = cart?.attributes?.find((a: any) => a.key === 'Time Slot')?.value || '';
  const timeSlotAttr = cart?.attributes?.find((a: any) => a.key === 'Available Time Slots')?.value;
  const timeSlotsArray = timeSlotAttr ? timeSlotAttr.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
  
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[13px] font-bold text-[#234745] px-1">
        {isEn ? 'Schedule Order' : 'جدولة الطلب'}
      </label>
      <CartForm route="/cart" action={'AttributesUpdate' as any}>
        <input type="hidden" name="attributes[0][key]" value="Time Slot" />
        <div className="relative">
          <select 
            name="attributes[0][value]"
            key={timeSlot}
            defaultValue={timeSlot}
            onChange={(e) => {
              if (e.target.form) e.target.form.requestSubmit();
            }}
            className="w-full bg-[#fcfaf8] border border-[#f0ece8] rounded-xl px-4 py-3 text-[14px] text-[#234745] font-medium appearance-none focus:outline-none focus:border-[#d4a06a] focus:ring-1 focus:ring-[#d4a06a] transition-all cursor-pointer"
          >
            <option value="">{isEn ? 'Select delivery/pickup time' : 'اختر وقت التوصيل/الاستلام'}</option>
            {timeSlotsArray.length > 0 ? (
                timeSlotsArray.map((slot: string, idx: number) => (
                    <option key={idx} value={slot}>{slot}</option>
                ))
            ) : (
                <>
                    <option value="Morning (9 AM - 12 PM)">{isEn ? 'Morning (9 AM - 12 PM)' : 'الصباح (9 ص - 12 م)'}</option>
                    <option value="Afternoon (12 PM - 4 PM)">{isEn ? 'Afternoon (12 PM - 4 PM)' : 'المساء (12 م - 4 م)'}</option>
                    <option value="Evening (4 PM - 9 PM)">{isEn ? 'Evening (4 PM - 9 PM)' : 'الليل (4 م - 9 م)'}</option>
                </>
            )}
          </select>
          <div className="absolute top-1/2 -translate-y-1/2 rtl:left-4 ltr:right-4 pointer-events-none text-[#d4a06a]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
        </div>
      </CartForm>
    </div>
  );
}

// ─── NEW: ORDER NOTES ───────────────────────────────────────────────────────
function CartOrderNotes({ isEn, cart }: { isEn: boolean, cart: any }) {
  const note = cart?.note || '';
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[13px] font-bold text-[#234745] px-1">{isEn ? 'Order Notes' : 'ملاحظات الطلب'}</label>
      <CartForm route="/cart" action={'NoteUpdate' as any}>
        <textarea
           name="note"
           defaultValue={note}
           placeholder={isEn ? "Write a note (e.g. Happy Birthday)" : "اكتب ملاحظة (مثال: عيد ميلاد سعيد)"}
           rows={2}
           onBlur={(e) => {
             if (e.target.form) e.target.form.requestSubmit();
           }}
           className="w-full bg-[#fcfaf8] border border-[#f0ece8] rounded-xl px-4 py-3 text-[14px] text-[#234745] placeholder-gray-400 focus:outline-none focus:border-[#d4a06a] focus:ring-1 focus:ring-[#d4a06a] transition-all resize-none"
        />
      </CartForm>
    </div>
  );
}

function CartCheckoutActions({
  checkoutUrl, 
  isEn, 
  disabled, 
  validationError,
  totalAmount,
  currencyCode,
  isPickup
}: {
  checkoutUrl?: string; 
  isEn: boolean;
  disabled?: boolean;
  validationError?: string | null;
  totalAmount: number;
  currencyCode: string;
  isPickup?: boolean;
}) {
  return (
    <>
      {checkoutUrl ? (
        <div className="flex flex-col gap-2 w-full">
          <a 
            href={(() => {
              if (disabled || !checkoutUrl) return '#';
              try {
                const url = new URL(checkoutUrl);
                if (isPickup) {
                  url.searchParams.set('pickup', 'true');
                  url.searchParams.set('fulfillment_type', 'pickup');
                  // Secret parameters to hint the checkout to select the pickup tab
                  url.searchParams.set('delivery_method', 'pickup_at_location');
                  url.searchParams.set('method', 'pickup');
                } else {
                  url.searchParams.set('pickup', 'false');
                  url.searchParams.set('fulfillment_type', 'delivery');
                  url.searchParams.set('delivery_method', 'shipping');
                  url.searchParams.set('method', 'shipping');
                  // Aggressive parameters to force the 'Ship' tab
                  url.searchParams.set('checkout[delivery_strategy]', 'shipping');
                  url.searchParams.set('checkout[shipping_address][country]', 'SA');
                }
                return url.toString();
              } catch(e) {
                return checkoutUrl;
              }
            })()}
            target="_self"
            onClick={(e) => {
              if (disabled) e.preventDefault();
            }}
            className={`w-full h-[52px] ${disabled ? 'bg-[#e8e4e1] cursor-not-allowed text-[#888]' : 'bg-[#234745] hover:bg-[#1A3533] active:scale-[0.98] text-white'} font-bold text-[16px] rounded-[50px] flex items-center justify-center transition-all`}
            style={{ color: '#FFFFFF', fontFamily: "'GE Dinar One', sans-serif" }}
          >
            {isEn ? 'Complete Order' : 'إتمام الطلب'}
          </a>
          {disabled && validationError && (
            <p className="text-red-500 text-[12px] font-bold text-center px-4 py-2 bg-red-50 rounded-xl border border-red-100 flex items-center justify-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              {validationError}
            </p>
          )}
        </div>
      ) : (
        <div className="w-full h-[52px] bg-[#e8e4e1] text-[#888] rounded-full flex items-center justify-center gap-2 font-black text-[15px]" style={{ fontFamily: "'Bahij Janna', sans-serif" }}>
          <span className="animate-pulse">{isEn ? 'Loading...' : 'جاري التحميل...'}</span>
        </div>
      )}
    </>
  );
}


// ─── NEW: LOYALTY POINTS REDEMPTION ─────────────────────────────────────────
function LoyaltyRedemptionUI({ isEn, cart }: { isEn: boolean, cart: any }) {
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const maxPoints = 2450; // Mock backend balance
  const pointsToCurrencyRatio = 0.05; // 1 point = 0.05 SAR
  
  const discountAmount = pointsToRedeem * pointsToCurrencyRatio;

  const handleRedeem = async () => {
    setIsRedeeming(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/loyalty-redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: cart?.buyerIdentity?.customer?.id || 'guest',
          points: pointsToRedeem
        })
      });
      const data = await res.json();
      
      if (data.success && data.discount_code) {
        setSuccessMsg(isEn ? `Applied discount: ${data.discount_code}` : `تم تطبيق الخصم: ${data.discount_code}`);
        
        // Auto-fill and submit the discount code form
        const input = document.querySelector('input[name="discountCode"]') as HTMLInputElement;
        const submitBtn = input?.parentElement?.querySelector('button[type="submit"]') as HTMLButtonElement;
        
        if (input && submitBtn) {
          input.value = data.discount_code;
          submitBtn.click();
        }
      } else {
        setErrorMsg(data.error || 'Failed to redeem points');
      }
    } catch (e) {
      setErrorMsg(isEn ? 'Network error occurred' : 'حدث خطأ في الشبكة');
    }
    setIsRedeeming(false);
  };

  return (
    <section className="flex flex-col gap-3 mt-4 pt-4 border-t border-dashed border-[#f0ece8]">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 text-[#234745]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          <span className="font-bold text-[14px]">
            {isEn ? 'Redeem Points' : 'استبدال النقاط'}
          </span>
        </div>
        <span className="text-[12px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
          {isEn ? `Available: ${maxPoints}` : `المتاح: ${maxPoints}`}
        </span>
      </div>

      <div className="bg-[#fcfaf8] border border-[#f0ece8] rounded-xl p-4 flex flex-col gap-4">
        {/* Slider & Input */}
        <div className="flex items-center gap-4">
          <input 
            type="range" 
            min="0" 
            max={maxPoints} 
            step="10"
            value={pointsToRedeem}
            onChange={(e) => setPointsToRedeem(parseInt(e.target.value))}
            className="flex-1 accent-[#d4a06a] h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <input 
            type="number"
            min="0"
            max={maxPoints}
            value={pointsToRedeem}
            onChange={(e) => {
              let val = parseInt(e.target.value) || 0;
              if (val > maxPoints) val = maxPoints;
              setPointsToRedeem(val);
            }}
            className="w-[80px] bg-white border border-[#f0ece8] rounded-lg px-2 py-1.5 text-center text-[13px] font-bold text-[#234745] focus:outline-none focus:border-[#d4a06a]"
          />
        </div>

        {/* Feedback & Apply */}
        <div className="flex flex-col gap-3 border-t border-[#f0ece8] pt-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">
                {isEn ? 'You save' : 'أنت توفر'}
              </span>
              <span className="text-[16px] font-black text-[#27ae60] font-en flex items-center gap-1 flex-row-reverse">
                <span className="text-[14px]">﷼</span>
                <span>{discountAmount.toFixed(2)}</span>
              </span>
            </div>
            <button 
              disabled={pointsToRedeem === 0 || isRedeeming}
              onClick={handleRedeem}
              className="bg-[#234745] text-white font-bold px-5 py-2.5 rounded-lg text-[13px] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#142e22] transition-colors"
            >
              {isRedeeming ? (isEn ? 'Redeeming...' : 'جاري الاستبدال...') : (isEn ? 'Redeem' : 'استبدال')}
            </button>
          </div>
          
          {errorMsg && (
            <p className="text-red-500 text-[12px] font-bold">{errorMsg}</p>
          )}
          {successMsg && (
            <p className="text-green-600 text-[12px] font-bold">{successMsg}</p>
          )}
        </div>
      </div>
    </section>
  );
}

function ViewCartAction({isEn}: {isEn: boolean}) {
  const {close} = useAside();

  return (
    <div className="mt-4 px-6 mb-6">
      <Link
        to={isEn ? '/en/cart' : '/cart'}
        onClick={close}
        prefetch="intent"
        className="w-full bg-[#004f59] hover:bg-[#003840] text-white font-bold py-5 px-8 rounded-[32px] flex items-center justify-between transition-all group shadow-xl"
      >
        <span className="text-[16px] text-white">{isEn ? 'View Cart' : 'عرض السلة'}</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`${isEn ? '' : 'rotate-180'} transition-transform group-hover:translate-x-1`}>
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
      </Link>
    </div>
  );
}

function CartDiscounts({
  discountCodes,
  discountsHeadingId,
  discountCodeInputId,
  isEn,
}: {
  discountCodes?: CartApiQueryFragment['discountCodes'];
  discountsHeadingId: string;
  discountCodeInputId: string;
  isEn: boolean;
}) {
  const [showInput, setShowInput] = useState(false);
  const codes: string[] =
    discountCodes
      ?.filter((discount) => discount.applicable)
      ?.map(({code}) => code) || [];

  return (
    <div aria-label="Discounts" className="w-full relative">
      <dl hidden={!codes.length}>
        <div>
          <dt id={discountsHeadingId} className="sr-only">Discounts</dt>
          <UpdateDiscountForm>
            {(fetcher: any) => {
              const isRemoving = fetcher.state !== 'idle';
              return (
                <div className={`flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3 transition-opacity ${isRemoving ? 'opacity-50' : 'opacity-100'}`}>
                  <div className="flex items-center gap-2 text-green-700">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                    <div>
                      <span className="font-bold text-[14px] leading-none block">
                        {codes?.join(', ')}
                      </span>
                      <span className="text-[11px] font-medium opacity-80 block mt-0.5">
                        {isEn ? 'Voucher applied' : 'تم تطبيق الكود'}
                      </span>
                    </div>
                  </div>
                  <button 
                    type="submit" 
                    aria-label="Remove discount"
                    disabled={isRemoving}
                    className="text-green-600 hover:text-red-500 transition-colors p-1"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                </div>
              );
            }}
          </UpdateDiscountForm>
        </div>
      </dl>

      <div hidden={codes.length > 0}>
        <UpdateDiscountForm discountCodes={codes}>
          {(fetcher: any) => {
            const isLoading = fetcher.state !== 'idle';
            return (
              <div className="flex flex-col gap-2 w-full">
                <div className="flex w-full items-center justify-between border border-gray-300 rounded-xl overflow-hidden focus-within:border-[#234745] transition-colors p-1.5 h-[56px] relative bg-white">
                  <input
                      type="text"
                      name="discountCode"
                      placeholder={isEn ? "Discount code" : "كود الخصم"}
                      className="flex-1 bg-transparent px-4 py-2 text-[14px] text-[#234745] focus:outline-none placeholder-[#9FB7AE] font-bold w-full h-full"
                      style={{ fontFamily: "'GE Dinar One', sans-serif" }}
                    />
                    <button 
                      type="submit"
                      disabled={isLoading}
                      className="bg-[#234745] text-white px-6 h-full text-[14px] font-bold hover:bg-[#1A3533] transition-colors rounded-[8px] flex-shrink-0"
                      style={{ fontFamily: "'GE Dinar One', sans-serif" }}
                    >
                      {isLoading ? '...' : (isEn ? 'Apply' : 'تطبيق')}
                    </button>
                </div>
                {fetcher.data?.error && (
                  <div className="text-red-500 text-xs font-bold px-3 py-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-1.5 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                    <span>{fetcher.data.error}</span>
                  </div>
                )}
              </div>
            );
          }}
        </UpdateDiscountForm>
      </div>
    </div>
  );
}

function UpdateDiscountForm({
  discountCodes,
  children,
}: {
  discountCodes?: string[];
  children: React.ReactNode | ((fetcher: any) => React.ReactNode);
}) {
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.DiscountCodesUpdate}
      inputs={{
        discountCodes: discountCodes || [],
      }}
    >
      {(fetcher: any) => (
        typeof children === 'function' ? children(fetcher) : children
      )}
    </CartForm>
  );
}

function CartGiftCard({
  giftCardCodes,
  giftCardHeadingId,
  giftCardInputId,
  isEn,
}: {
  giftCardCodes?: CartApiQueryFragment['appliedGiftCards'];
  giftCardHeadingId: string;
  giftCardInputId: string;
  isEn: boolean;
}) {
  const appliedGiftCardCodes = useRef<string[]>([]);
  const giftCardCodeInput = useRef<HTMLInputElement>(null);
  const codes: string[] =
    giftCardCodes?.map(({lastCharacters}) => lastCharacters) || [];

  function saveAppliedCode(code: string) {
    const formattedCode = code.replace(/\s/g, ''); // Remove spaces
    if (!appliedGiftCardCodes.current.includes(formattedCode)) {
      appliedGiftCardCodes.current.push(formattedCode);
    }
    giftCardCodeInput.current!.value = '';
  }

  function removeAppliedCode() {
    appliedGiftCardCodes.current = [];
  }

  return (
    <section aria-label="Gift card" className="flex flex-col gap-3">
      <dl hidden={!codes.length}>
        <div>
          <dt id={giftCardHeadingId} className="sr-only">Applied Gift Card</dt>
          <UpdateGiftCardForm>
            <div className="flex items-center justify-between bg-[#fcfaf8] border border-green-200 rounded-xl px-4 py-2">
              <div className="flex items-center gap-2 text-green-700">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
                <code className="font-bold text-[13px]">**** {codes?.join(', **** ')}</code>
              </div>
              <button
                type="submit"
                onSubmit={() => removeAppliedCode()}
                aria-label="Remove gift card"
                className="text-gray-400 hover:text-red-500 transition-colors p-1"
              >
                 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
          </UpdateGiftCardForm>
        </div>
      </dl>

      <UpdateGiftCardForm
        giftCardCodes={appliedGiftCardCodes.current}
        saveAppliedCode={saveAppliedCode}
      >
        <div className="flex gap-2">
          <label htmlFor={giftCardInputId} className="sr-only">
            Gift card code
          </label>
          <input
            id={giftCardInputId}
            type="text"
            name="giftCardCode"
            placeholder={isEn ? "Gift card code" : "كود بطاقة الهدية"}
            ref={giftCardCodeInput}
            className="flex-1 bg-[#fcfaf8] border border-[#f0ece8] rounded-xl px-4 py-3 text-[14px] text-[#234745] placeholder-gray-400 focus:outline-none focus:border-[#d4a06a] focus:ring-1 focus:ring-[#d4a06a] transition-all"
          />
          <button 
            type="submit" 
            aria-label="Apply gift card"
             className="bg-[#f0ece8] text-[#234745] font-bold px-5 py-3 rounded-xl hover:bg-[#e8e4e1] transition-colors"
          >
            {isEn ? 'Apply' : 'تطبيق'}
          </button>
        </div>
      </UpdateGiftCardForm>
    </section>
  );
}

function UpdateGiftCardForm({
  giftCardCodes,
  saveAppliedCode,
  children,
}: {
  giftCardCodes?: string[];
  saveAppliedCode?: (code: string) => void;
  children: React.ReactNode;
}) {
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.GiftCardCodesUpdate}
      inputs={{
        giftCardCodes: giftCardCodes || [],
      }}
    >
      {(fetcher: any) => {
        const code = fetcher.formData?.get('giftCardCode');
        if (code) saveAppliedCode && saveAppliedCode(code as string);
        return children;
      }}
    </CartForm>
  );
}
