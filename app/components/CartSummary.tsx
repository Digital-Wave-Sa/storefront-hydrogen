import type {CartApiQueryFragment} from 'storefrontapi.generated';
import type {CartLayout} from '~/components/CartMain';
import {CartForm, Money, type OptimisticCart} from '@shopify/hydrogen';
import {useEffect, useId, useRef, useState} from 'react';
import {useFetcher, useRouteLoaderData, Link, useLocation, Form} from 'react-router';
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

  // Calculate total discount from all discount allocations
  const cartDiscountAmount = cart?.discountAllocations?.reduce((acc: number, allocation: any) => {
    return acc + parseFloat(allocation?.discountedAmount?.amount || '0');
  }, 0) || 0;

  const lineDiscountAmount = cart?.lines?.nodes?.reduce((acc: number, line: any) => {
    const lineDiscount = line?.discountAllocations?.reduce((lAcc: number, allocation: any) => {
      return lAcc + parseFloat(allocation?.discountedAmount?.amount || '0');
    }, 0) || 0;
    return acc + lineDiscount;
  }, 0) || 0;

  const totalDiscount = cartDiscountAmount + lineDiscountAmount;
  const subtotalBeforeDiscounts = subtotal + lineDiscountAmount;

  // Split loyalty discount from other discounts
  const appliedPointsStr = cart?.attributes?.find((a: any) => a.key === 'loyalty_points')?.value;
  const loyaltyPointsRedeemed = parseInt(appliedPointsStr) || 0;
  const expectedLoyaltyDiscount = loyaltyPointsRedeemed * 0.01;
  const hasLoyaltyDiscount = cart?.discountCodes?.some((dc: any) => dc.code?.startsWith('LOYALTY-')) && expectedLoyaltyDiscount > 0;
  
  const loyaltyDiscountDisplay = hasLoyaltyDiscount ? expectedLoyaltyDiscount : 0;
  // Make sure we don't show negative other discounts due to floating point math
  const otherDiscountDisplay = Math.max(0, totalDiscount - loyaltyDiscountDisplay);

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

  const prepaidOnlyItems = cart?.lines?.nodes?.filter((line: any) => 
    line.merchandise?.product?.tags?.some((tag: string) => {
      const t = tag.toLowerCase().trim();
      return t === 'prepaid-only' || t === 'nocod';
    })
  ) || [];
  const hasPrepaidOnly = prepaidOnlyItems.length > 0;
  const prepaidItemNamesEn = prepaidOnlyItems.map((line: any) => line.merchandise?.product?.title || line.merchandise?.title).join(', ');
  const prepaidItemNamesAr = prepaidOnlyItems.map((line: any) => line.merchandise?.product?.title || line.merchandise?.title).join('، ');

  const isOutOfRange = !!attributes.find((a: any) => a.key === 'error')?.value;

  const outOfStockItems = cart?.lines?.nodes?.filter((line: any) => {
    if (!currentBranch) return false;
    
    const availabilityNodes = line.merchandise?.storeAvailability?.nodes || [];
    if (availabilityNodes.length === 0) return false;
    
    const currentBranchAvailability = availabilityNodes.find((node: any) => 
      node.location?.name === currentBranch.name || node.location?.id === currentBranch.id
    );

    return currentBranchAvailability && !currentBranchAvailability.available;
  }) || [];
  
  const hasOutOfStockItems = outOfStockItems.length > 0;
  const outOfStockItemNamesEn = outOfStockItems.map((line: any) => line.merchandise?.product?.title || line.merchandise?.title).join(', ');
  const outOfStockItemNamesAr = outOfStockItems.map((line: any) => line.merchandise?.product?.title || line.merchandise?.title).join('، ');

  const canCheckout = isMinOrderMet && isBranchSelected && !isOutOfRange && !hasOutOfStockItems;

  return (
    <div aria-labelledby={summaryId} className="flex flex-col gap-4">
      {layout === 'page' && (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col pt-6">
            {/* Header */}
            <div className="px-6 pb-4 border-b border-gray-200">
               <h3 className={`text-[20px] font-black text-[#1a1a1a] ${isEn ? 'text-left' : 'text-right'}`} style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}>
                 {isEn ? 'Order Summary' : 'ملخص الطلب'}
               </h3>
            </div>

            <div className="px-6 py-6 flex flex-col gap-6">
              {/* Promo Code Input */}
              <CartDiscounts
                discountCodes={cart?.discountCodes}
                cart={cart}
                discountsHeadingId={discountsHeadingId}
                discountCodeInputId={discountCodeInputId}
                isEn={isEn}
              />

              {/* Loyalty Redemption */}
              {rootData?.env?.PUBLIC_SMILE_CHANNEL_KEY ? (
                <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-dashed border-[#f0ece8]">
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined' && (window as any).Smile) {
                        (window as any).Smile.show();
                      } else {
                        alert(isEn 
                          ? "Smile.io widget is loading or PUBLIC_SMILE_CHANNEL_KEY is not configured yet." 
                          : "أداة Smile.io قيد التحميل أو لم يتم إعداد مفتاح PUBLIC_SMILE_CHANNEL_KEY بعد."
                        );
                      }
                    }}
                    className="w-full flex items-center justify-between bg-[#fcfaf8] hover:bg-[#f6f2eb] border border-[#f0ece8] rounded-xl p-4 text-[#234745] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🎁</span>
                      <span className="font-bold text-[14px]">
                        {isEn ? 'Smile Rewards & Points' : 'نقاط ومكافآت Smile'}
                      </span>
                    </div>
                    <span className="text-[12px] font-bold text-[#d4a06a]">
                      {isEn ? 'View rewards' : 'عرض المكافآت'} &rarr;
                    </span>
                  </button>
                </div>
              ) : (
                <LoyaltyRedemptionUI isEn={isEn} cart={cart} />
              )}

              {/* Time Slot Picker */}
              <CartTimeSlot isEn={isEn} cart={cart} />

              {/* Order Notes */}
              <CartOrderNotes isEn={isEn} cart={cart} />

              {/* Breakdown */}
              <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center text-[15px]">
                     <dt className="text-[#9FB7AE] font-bold" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>{isEn ? 'Subtotal' : 'المجموع الفرعي'}</dt>
                     <dd className="text-[#234745] font-black font-en flex items-center gap-1 flex-row-reverse">
                       <SaudiRiyalSymbol className="h-4 w-auto" />
                       <span>{subtotalBeforeDiscounts.toFixed(2)}</span>
                     </dd>
                  </div>

                  {otherDiscountDisplay > 0 && (
                    <div className="flex justify-between items-center text-[15px]">
                      <dt className="text-green-600 font-bold" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                        {isEn ? 'Discount' : 'الخصم'}
                      </dt>
                      <dd className="text-green-600 font-black font-en flex items-center gap-1 flex-row-reverse">
                        <SaudiRiyalSymbol className="h-4 w-auto" />
                        <span>-{otherDiscountDisplay.toFixed(2)}</span>
                      </dd>
                    </div>
                  )}

                  {loyaltyDiscountDisplay > 0 && (
                    <div className="flex justify-between items-center text-[15px]">
                      <dt className="text-green-600 font-bold" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                        {isEn ? 'Loyalty Discount' : 'خصم نقاط الولاء'}
                      </dt>
                      <dd className="text-green-600 font-black font-en flex items-center gap-1 flex-row-reverse">
                        <SaudiRiyalSymbol className="h-4 w-auto" />
                        <span>-{loyaltyDiscountDisplay.toFixed(2)}</span>
                      </dd>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-[15px]">
                     <dt className="text-[#9FB7AE] font-bold" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>{isEn ? 'Delivery Fees' : 'رسوم التوصيل'}</dt>
                     <dd className="text-[#234745] font-bold font-en flex items-center gap-1">
                       {isFreeDelivery ? (
                         <span className="text-[#234745] font-black text-[15px]">{isEn ? 'Free' : 'مجاني'}</span>
                       ) : (
                         <div className="flex items-center gap-1 flex-row-reverse">
                           <SaudiRiyalSymbol className="h-4 w-auto" />
                           <span className="font-black">{deliveryFee.toFixed(2)}</span>
                         </div>
                       )}
                     </dd>
                  </div>

                  {cart?.cost?.totalTaxAmount && (
                    <div className="flex justify-between items-center text-[15px]">
                      <dt className="text-[#9FB7AE] font-bold" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>{isEn ? 'VAT (15%)' : 'ضريبة القيمة المضافة (١٥٪)'}</dt>
                      <dd className="text-[#234745] font-black font-en flex items-center gap-1 flex-row-reverse">
                        <SaudiRiyalSymbol className="h-4 w-auto" />
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
                    <dt className="text-[20px] font-black text-[#234745]" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}>
                      {isEn ? 'Total' : 'الإجمالي'}
                    </dt>
                    <span className="text-[12px] text-[#9FB7AE] font-bold">
                      {isEn ? 'Includes 15% VAT' : 'شامل ضريبة القيمة المضافة ١٥٪'}
                    </span>
                 </div>
                 <dd className="text-[28px] font-black text-[#234745] font-en flex items-center gap-2 flex-row-reverse">
                   <SaudiRiyalSymbol className="h-6 w-auto" />
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
                   <p className="text-orange-800 text-[13px] font-bold leading-tight" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                     {isEn 
                       ? `Note: Cash on Delivery is not available because your cart contains restricted items (${prepaidItemNamesEn}). Please use a prepaid method at checkout.` 
                       : `ملاحظة: الدفع عند الاستلام غير متاح لاحتواء سلتك على منتجات تتطلب الدفع المسبق (${prepaidItemNamesAr}). يرجى استخدام طريقة دفع إلكترونية.`}
                   </p>
                 </div>
               )}

               <CartCheckoutActions 
                 checkoutUrl={cart?.checkoutUrl} 
                 discountCodes={cart?.discountCodes}
                 isEn={isEn} 
                 disabled={!canCheckout}
                 totalAmount={calculatedTotal}
                 currencyCode={currencyCode}
                 isPickup={isPickup}
                 cart={cart}
                 validationError={
                   !isMinOrderMet ? (isEn ? <span className="flex items-center gap-1">Minimum order is <SaudiRiyalSymbol className="h-3 w-auto" /> {minOrderValue}</span> : <span className="flex items-center gap-1 flex-row-reverse">الحد الأدنى هو {minOrderValue} <SaudiRiyalSymbol className="h-3 w-auto" /></span>) :
                   !isBranchSelected ? (isEn ? 'Please select a branch' : 'يرجى اختيار الفرع') :
                   isOutOfRange ? (isEn ? 'Address is out of delivery range' : 'العنوان خارج نطاق التوصيل') :
                   null
                 }
               />
               <Link 
                 to={isEn ? "/en" : "/"} 
                 className="w-full h-[52px] bg-[#F9E8E8] hover:bg-[#F2DFDF] active:scale-[0.98] transition-all text-[#DF4646] rounded-[50px] font-black text-[16px] flex items-center justify-center border border-[#EAA2A2]"
                 style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}
               >
                 {isEn ? 'Continue Shopping' : 'متابعة التسوق'}
               </Link>
            </div>

            {/* Tamara Promo Box */}
            <div className="bg-[#FBF9F4] rounded-[16px] p-5 border border-[#F2E8D5] flex flex-col items-center text-center shadow-sm relative mt-4">
                <div className="px-5 py-1 rounded-[10px] mb-3 inline-block" style={{ background: 'linear-gradient(90deg, #F9C3A3 0%, #D4A5E4 50%, #9BC4E5 100%)' }}>
                   <span className="text-[#1a1a1a] font-black text-[18px] tracking-tight font-en leading-none block pt-0.5">tamara</span>
                </div>
                <h4 className="text-[15px] font-black text-[#1a1a1a] leading-tight mb-2" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}>
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
                    <span className="text-[13px] font-bold text-[#9FB7AE]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>{isEn ? 'Guaranteed Quality' : 'جودة مضمونة'}</span>
                </div>
                <div className="flex flex-col items-center">
                    <span className="text-[13px] font-bold text-[#9FB7AE]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>{isEn ? 'Fast Delivery' : 'توصيل سريع'}</span>
                </div>
                <div className="flex flex-col items-center">
                    <span className="text-[13px] font-bold text-[#9FB7AE]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>{isEn ? 'Secure Payment' : 'دفع آمن ومضمون'}</span>
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
  discountCodes,
  isEn, 
  disabled, 
  validationError,
  totalAmount,
  currencyCode,
  isPickup,
  cart,
}: {
  checkoutUrl?: string; 
  discountCodes?: any[];
  isEn: boolean;
  disabled?: boolean;
  validationError?: React.ReactNode | null;
  totalAmount: number;
  currencyCode: string;
  isPickup?: boolean;
  cart?: any;
}) {
  const fireBeginCheckout = () => {
    try {
      if (typeof window === 'undefined') return;
      const consent = localStorage.getItem('saadeddin_cookie_consent');
      if (consent !== 'accepted') return;
      const w = window as any;
      w.dataLayer = w.dataLayer || [];
      const lines = cart?.lines?.nodes || [];
      const items = lines.map((line: any, i: number) => ({
        item_id: line.merchandise?.sku || line.merchandise?.id?.split('/').pop() || '',
        item_name: line.merchandise?.product?.title || '',
        item_variant: line.merchandise?.title !== 'Default Title' ? line.merchandise?.title : undefined,
        price: parseFloat(line.merchandise?.price?.amount || '0'),
        quantity: line.quantity || 1,
        index: i,
        currency: currencyCode,
      }));
      w.dataLayer.push({ ecommerce: null });
      w.dataLayer.push({
        event: 'begin_checkout',
        ecommerce: {
          currency: currencyCode,
          value: totalAmount,
          coupon: discountCodes?.[0]?.code || undefined,
          items,
        },
      });
    } catch (e) {
      // fail silently
    }
  };

  return (
    <>
      <div className="flex flex-col gap-2 w-full">
        <Form action="/checkout/initiate" method="post" className="w-full">
          <button 
            type="submit"
            disabled={disabled}
            onClick={fireBeginCheckout}
            className={`w-full h-[52px] ${disabled ? 'bg-[#e8e4e1] cursor-not-allowed text-[#888]' : 'bg-[#234745] hover:bg-[#1A3533] active:scale-[0.98] text-white'} font-bold text-[16px] rounded-[50px] flex items-center justify-center transition-all`}
            style={{ color: disabled ? '#888' : '#FFFFFF', fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
          >
            {isEn ? 'Complete Order' : 'إتمام الطلب'}
          </button>
        </Form>
        {disabled && validationError && (
          <p className="text-red-500 text-[12px] font-bold text-center px-4 py-2 bg-red-50 rounded-xl border border-red-100 flex items-center justify-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            {validationError}
          </p>
        )}
      </div>
    </>
  );
}



// ─── NEW: LOYALTY POINTS REDEMPTION ─────────────────────────────────────────
function LoyaltyRedemptionUI({ isEn, cart }: { isEn: boolean, cart: any }) {
  const rootData = useRouteLoaderData('root') as any;
  const appliedPointsStr = cart?.attributes?.find((a: any) => a.key === 'loyalty_points')?.value;
  const initialPoints = parseInt(appliedPointsStr) || 0;
  
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(initialPoints);
  const [availablePoints, setAvailablePoints] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fetcher = useFetcher<any>();
  
  // Extract phone number or email
  let phone = rootData?.loginOtpPhone || cart?.buyerIdentity?.phone || cart?.buyerIdentity?.customer?.phone || rootData?.customer?.phone;
  const email = cart?.buyerIdentity?.email || cart?.buyerIdentity?.customer?.email || rootData?.customer?.email;
  if (!phone && email && email.includes('@saadeddin.dev')) {
    phone = email.split('@')[0];
  }
  
  const customerIdentifier = phone || email;

  useEffect(() => {
    if (customerIdentifier) {
      const cleanId = customerIdentifier.replace(/\s+/g, '');
      fetch(`/api/loyalty-points?identifier=${encodeURIComponent(cleanId)}&t=${Date.now()}`)
        .then(res => res.json())
        .then(data => {
          if (data?.success && data?.data?.points !== undefined) {
            setAvailablePoints(data.data.points);
          }
        })
        .catch(() => {});
    }
  }, [customerIdentifier]);

  if (!customerIdentifier) {
    return (
      <section className="flex flex-col gap-3 mt-4 pt-4 border-t border-dashed border-[#f0ece8]">
        <div className="flex items-center gap-2 text-[#234745] mb-1">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          <span className="font-bold text-[14px]">
            {isEn ? 'Redeem Points' : 'استبدال النقاط'}
          </span>
        </div>
        <div className="bg-[#fcfaf8] border border-[#f0ece8] rounded-xl p-4 text-center">
          <p className="text-[12px] text-gray-500 font-medium mb-3">
            {isEn 
              ? 'Log in to view and redeem your loyalty points.' 
              : 'سجل الدخول لعرض واستبدال نقاط الولاء الخاصة بك.'}
          </p>
          <NavLink
            to={isEn ? "/en/account/login" : "/account/login"}
            className="inline-block bg-[#234745] text-white font-bold px-4 py-2 rounded-lg text-[12px] hover:bg-[#142e22] transition-colors"
          >
            {isEn ? 'Log In' : 'تسجيل الدخول'}
          </NavLink>
        </div>
      </section>
    );
  }

  const pointsToCurrencyRatio = 0.01;
  const cartSubtotal = parseFloat(cart?.cost?.subtotalAmount?.amount || '0');
  const maxPointsByCart = Math.floor(cartSubtotal / pointsToCurrencyRatio);
  const maxAllowedPoints = availablePoints !== null 
    ? Math.min(availablePoints, maxPointsByCart) 
    : maxPointsByCart;

  // Sync state after fetcher finishes
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      if (fetcher.data.error) {
        setErrorMsg(fetcher.data.error);
      } else if (fetcher.data.success) {
        setErrorMsg(null);
      }
    }
  }, [fetcher.state, fetcher.data]);

  const discountAmount = pointsToRedeem * pointsToCurrencyRatio;
  const hasChanges = pointsToRedeem !== initialPoints;

  return (
    <section className="flex flex-col gap-3 mt-4 pt-4 border-t border-dashed border-[#f0ece8]">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 text-[#234745]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          <span className="font-bold text-[14px]">
            {isEn ? 'Redeem Points' : 'استبدال النقاط'}
          </span>
        </div>
        {availablePoints !== null && (
          <span className="text-[12px] font-bold text-[#A6BFB9] bg-emerald-50 px-3 py-1 rounded-[16px] border border-emerald-100 flex items-center gap-1">
            <span className="text-emerald-700 font-en">{availablePoints}</span>
            <span className="text-emerald-600">{isEn ? 'pts available' : 'نقطة متاحة'}</span>
          </span>
        )}
      </div>

      <div className="bg-[#fcfaf8] border border-[#f0ece8] rounded-xl p-4 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-4">
            <input 
              type="number"
              min="0"
              max={maxAllowedPoints}
              step="10"
              value={pointsToRedeem}
              onChange={(e) => {
                setErrorMsg(null);
                const val = parseInt(e.target.value) || 0;
                // Auto-cap it to the max allowed points immediately to prevent invalid state
                setPointsToRedeem(Math.max(0, Math.min(maxAllowedPoints, val)));
              }}
              className="flex-1 bg-white border border-[#f0ece8] rounded-lg px-4 py-2 text-[14px] font-bold text-[#234745] focus:outline-none focus:border-[#d4a06a] transition-colors"
              placeholder={isEn ? "Enter points to redeem" : "أدخل عدد النقاط للاستبدال"}
            />
            <div className="text-[12px] font-bold text-gray-400">
              {isEn ? 'pts' : 'نقطة'}
            </div>
          </div>
          {maxPointsByCart < (availablePoints || 0) && (
            <p className="text-[11px] text-gray-500 font-medium">
              {isEn ? `Max redemption based on cart total: ${maxPointsByCart} pts` : `الحد الأقصى المسموح به بناءً على قيمة السلة: ${maxPointsByCart} نقطة`}
            </p>
          )}
          {errorMsg && (
            <p className="text-red-500 text-[12px] font-bold">{errorMsg}</p>
          )}
        </div>

        {/* Feedback & Apply */}
        <div className="flex flex-col gap-3 border-t border-[#f0ece8] pt-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">
                {isEn ? 'You save' : 'أنت توفر'}
              </span>
              <span className="text-[16px] font-black text-[#27ae60] font-en flex items-center gap-1 flex-row-reverse">
                <SaudiRiyalSymbol className="h-3.5 w-auto" />
                <span>{discountAmount.toFixed(2)}</span>
              </span>
            </div>
            
            <CartForm
              route="/cart"
              action="LoyaltyUpdate"
              inputs={{
                points: String(pointsToRedeem),
                intent: (initialPoints > 0 && pointsToRedeem === 0) ? 'remove' : 'apply'
              }}
            >
              {(fetcher: any) => {
                const isSubmitting = fetcher.state !== 'idle';
                const actionError = fetcher.data?.error;

                return (
                  <div className="flex flex-col gap-2 items-end">
                    <button 
                      type="submit" 
                      disabled={isSubmitting || (!hasChanges && pointsToRedeem === 0) || pointsToRedeem > maxAllowedPoints}
                      className="bg-[#234745] text-white font-bold px-5 py-2.5 rounded-lg text-[13px] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#142e22] transition-colors"
                    >
                      {isSubmitting 
                        ? (isEn ? 'Applying...' : 'جاري التطبيق...') 
                        : (initialPoints > 0 && pointsToRedeem === 0 
                            ? (isEn ? 'Remove' : 'إزالة') 
                            : (hasChanges ? (isEn ? 'Apply' : 'تطبيق') : (isEn ? 'Applied' : 'مُطبق'))
                          )
                      }
                    </button>
                    {actionError && !errorMsg && (
                      <p className="text-red-500 text-[11px] font-bold mt-1 text-left w-full">
                        {actionError}
                      </p>
                    )}
                  </div>
                );
              }}
            </CartForm>
          </div>
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
  cart,
  discountsHeadingId,
  discountCodeInputId,
  isEn,
}: {
  discountCodes?: CartApiQueryFragment['discountCodes'];
  cart?: any;
  discountsHeadingId: string;
  discountCodeInputId: string;
  isEn: boolean;
}) {
  const [showInput, setShowInput] = useState(false);
  const codes: string[] =
    discountCodes
      ?.filter((discount) => discount.applicable)
      ?.map(({code}) => code) || [];
      
  const hasLineAllocations = cart?.lines?.nodes?.some((line: any) => line?.discountAllocations?.length > 0);
  const hasCartAllocations = cart?.discountAllocations?.length > 0;
  const hasAllocations = hasLineAllocations || hasCartAllocations;
  
  // If we have allocations but no manual codes, it must be an automatic discount!
  const hasAutomaticDiscount = hasAllocations && codes.length === 0;

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

      {/* Render Automatic Discounts */}
      {hasAutomaticDiscount && (
        <dl>
          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-2">
            <div className="flex items-center gap-2 text-green-700">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
              <div>
                <span className="font-bold text-[14px] leading-none block">
                  {isEn ? 'Automatic Promotion' : 'خصم تلقائي'}
                </span>
                <span className="text-[11px] font-medium opacity-80 block mt-0.5">
                  {isEn ? 'Applied to your cart' : 'تم التطبيق على سلتك'}
                </span>
              </div>
            </div>
          </div>
        </dl>
      )}

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
                      style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                    />
                    <button 
                      type="submit"
                      disabled={isLoading}
                      className="bg-[#234745] text-white px-6 h-full text-[14px] font-bold hover:bg-[#1A3533] transition-colors rounded-[8px] flex-shrink-0"
                      style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
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
