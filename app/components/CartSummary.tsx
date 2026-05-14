import type {CartApiQueryFragment} from 'storefrontapi.generated';
import type {CartLayout} from '~/components/CartMain';
import {CartForm, Money, type OptimisticCart} from '@shopify/hydrogen';
import {useEffect, useId, useRef, useState} from 'react';
import {useFetcher, useRouteLoaderData, Link} from 'react-router';
import {useAside} from '~/components/Aside';
import {Price} from './Price';

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

  const rootData = useRouteLoaderData('root') as any;
  const isEn = rootData?.consent?.language?.toLowerCase() === 'en';

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
  const minOrderValue = minOrderMeta?.value ? parseFloat(minOrderMeta.value) : 50; 
  const isMinOrderMet = subtotal >= minOrderValue;
  const thresholdMeta = currentBranch?.free_delivery_threshold || currentBranch?.metafields?.find((m: any) => m?.key === 'free_delivery_threshold');
  const feeMeta = currentBranch?.delivery_fee || currentBranch?.metafields?.find((m: any) => m?.key === 'delivery_fee');
  
  const threshold = thresholdMeta?.value ? parseFloat(thresholdMeta.value) : 300;
  const isFreeDelivery = subtotal >= threshold;
  const isPickup = fulfillmentType?.toLowerCase() === 'pickup';
  // Use 25 SAR as default if no metafield is found (matching modal default)
  const deliveryFee = (isFreeDelivery || isPickup) ? 0 : (feeMeta?.value ? parseFloat(feeMeta.value) : 25);
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

  const canCheckout = isMinOrderMet && isBranchSelected;

  return (
    <div aria-labelledby={summaryId} className="flex flex-col gap-4">
      {layout === 'page' && (
        <>
          {/* Promo Code Section (as separate card like design) */}
          <CartDiscounts
            discountCodes={cart?.discountCodes}
            discountsHeadingId={discountsHeadingId}
            discountCodeInputId={discountCodeInputId}
            isEn={isEn}
          />

          {/* Order Summary Card */}
          <div className="bg-white rounded-[24px] p-8 shadow-[0_2px_15px_rgba(0,0,0,0.03)] border border-[#f0ece8]">
            <div className="flex items-center gap-2 mb-8">
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#234745" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
               <h3 className="text-[20px] font-black text-[#234745]">{isEn ? 'Order Summary' : 'ملخص الطلب'}</h3>
            </div>

            <div className="space-y-6">
                <div className="flex justify-between items-center text-[16px]">
                   <dt className="text-gray-400 font-medium">{isEn ? 'Subtotal' : 'المجموع الفرعي'}</dt>
                   <dd className="text-[#234745] font-black font-en">
                     <Price data={cart?.cost?.subtotalAmount!} isEn={isEn} size="sm" />
                   </dd>
                </div>

                <div className="flex justify-between items-start text-[16px]">
                   <dt className="flex flex-col">
                     <span className="text-gray-400 font-medium">{isEn ? 'Delivery charges' : 'رسوم التوصيل'}</span>
                     <span className="text-[11px] text-gray-300 font-normal mt-1 max-w-[200px] leading-tight">
                       {isEn ? 'Please note that specific regions and express delivery may incur extra delivery fees' : 'يرجى ملاحظة أن المناطق المحددة والتوصيل السريع قد تتطلب رسوم إضافية'}
                     </span>
                   </dt>
                   <dd className="text-[#234745] font-black font-en">
                     {isFreeDelivery ? (
                       <span className="text-green-600 uppercase text-[12px]">{isEn ? 'Free' : 'مجاني'}</span>
                     ) : (
                       <Price data={{ amount: deliveryFee.toString(), currencyCode }} isEn={isEn} size="xs" />
                     )}
                   </dd>
                </div>

                {cart?.cost?.totalTaxAmount && (
                  <div className="flex justify-between items-center text-[16px]">
                    <dt className="text-gray-400 font-medium">{isEn ? 'VAT' : 'ضريبة القيمة المضافة'}</dt>
                    <dd className="text-[#234745] font-black font-en">
                      <Price data={cart.cost.totalTaxAmount} isEn={isEn} size="xs" />
                    </dd>
                  </div>
                )}

               <div className="pt-6 border-t border-[#f8f5f2] flex justify-between items-center">
                  <dt className="text-[18px] font-black text-[#234745]">{isEn ? 'Total' : 'الإجمالي'}</dt>
                  <dd className="text-[22px] font-black text-[#234745] font-en">
                    <Price data={{ amount: calculatedTotal.toString(), currencyCode }} isEn={isEn} size="lg" />
                  </dd>
               </div>
            </div>
          </div>

          {/* Additional Customizations (Branch/Time) */}
          <div className="bg-white rounded-[24px] p-6 shadow-sm border border-[#f0ece8] flex flex-col gap-4">
             <div className="flex items-center justify-between">
                <div className="flex flex-col">
                   <span className="text-[11px] text-gray-400 font-bold uppercase">
                     {fulfillmentType === 'Pickup' ? (isEn ? 'Pickup Branch' : 'فرع الاستلام') : (isEn ? 'Delivery Branch' : 'فرع التوصيل')}
                   </span>
                   <span className="text-[14px] font-black text-[#234745]">{branch || (isEn ? 'Select Branch' : 'اختر الفرع')}</span>
                </div>
                <button onClick={() => window.dispatchEvent(new CustomEvent('openDeliveryModal'))} className="text-[12px] font-bold text-[#d4a06a] hover:underline">
                  {isEn ? 'Change' : 'تغيير'}
                </button>
             </div>
             <CartTimeSlot isEn={isEn} cart={cart} />
             <CartOrderNotes isEn={isEn} cart={cart} />
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

      {layout === 'page' ? (
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
            null
          }
        />
      ) : (
        <ViewCartAction isEn={isEn} />
      )}
    </div>
  );
}



// ─── NEW: TIME SLOT PICKER ──────────────────────────────────────────────────
function CartTimeSlot({ isEn, cart, hasError }: { isEn: boolean, cart: any, hasError?: boolean }) {
  const timeSlot = cart?.attributes?.find((a: any) => a.key === 'Time Slot')?.value || '';
  
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
            <option value="Morning (9 AM - 12 PM)">{isEn ? 'Morning (9 AM - 12 PM)' : 'الصباح (9 ص - 12 م)'}</option>
            <option value="Afternoon (12 PM - 4 PM)">{isEn ? 'Afternoon (12 PM - 4 PM)' : 'المساء (12 م - 4 م)'}</option>
            <option value="Evening (4 PM - 9 PM)">{isEn ? 'Evening (4 PM - 9 PM)' : 'الليل (4 م - 9 م)'}</option>
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
    <div className="mt-2 flex flex-col gap-3">
      {checkoutUrl ? (
        <div className="flex flex-col gap-2">
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
            className={`w-full ${disabled ? 'bg-[#e8e4e1] cursor-not-allowed text-[#888]' : 'bg-[#234745] hover:bg-[#d4a06a] text-white shadow-xl hover:-translate-y-1'} font-bold py-6 px-10 rounded-[32px] flex items-center justify-between transition-all group`}
          >
            <span className="text-[18px] text-white">{isEn ? 'Proceed To Checkout' : 'متابعة إتمام الطلب'}</span>
            <div className="flex items-center gap-4 text-white">
              <span className="text-[20px] font-black font-en">
                 <Price data={{ amount: totalAmount.toString(), currencyCode }} isEn={isEn} size="md" />
              </span>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`${isEn ? '' : 'rotate-180'} transition-transform group-hover:translate-x-1`}>
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </div>
          </a>
          {disabled && validationError && (
            <p className="text-red-500 text-[12px] font-bold text-center px-4 py-2 bg-red-50 rounded-xl border border-red-100 flex items-center justify-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              {validationError}
            </p>
          )}
        </div>
      ) : (
        <div className="w-full bg-[#e8e4e1] text-[#888] py-6 px-10 rounded-[32px] flex items-center justify-center gap-2">
          <span className="animate-pulse">{isEn ? 'Loading Checkout...' : 'جاري التحميل...'}</span>
        </div>
      )}
    </div>
  );
}

// ─── NEW: LOYALTY POINTS REDEMPTION ─────────────────────────────────────────
function LoyaltyRedemptionUI({ isEn, cart }: { isEn: boolean, cart: any }) {
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);
  const maxPoints = 2450; // Mock backend balance
  const pointsToCurrencyRatio = 0.05; // 1 point = 0.05 SAR
  
  const discountAmount = pointsToRedeem * pointsToCurrencyRatio;

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
        <div className="flex items-center justify-between border-t border-[#f0ece8] pt-3">
          <div className="flex flex-col">
            <span className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">
              {isEn ? 'You save' : 'أنت توفر'}
            </span>
            <span className="text-[16px] font-black text-[#27ae60] font-en">
              <Price data={{ amount: discountAmount.toString(), currencyCode }} isEn={isEn} size="sm" />
            </span>
          </div>
          <button 
            disabled={pointsToRedeem === 0}
            className="bg-[#234745] text-white font-bold px-5 py-2.5 rounded-lg text-[13px] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#142e22] transition-colors"
          >
            {isEn ? 'Redeem' : 'استبدال'}
          </button>
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
    <section aria-label="Discounts" className="bg-white rounded-[24px] p-6 shadow-sm border border-[#f0ece8] relative">
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
              <>
                {!showInput ? (
                  <div 
                    onClick={() => setShowInput(true)}
                    className="flex items-center justify-between group cursor-pointer py-1"
                  >
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-[#f8f5f2] flex items-center justify-center text-[#234745] transition-colors group-hover:bg-[#234745] group-hover:text-white">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                       </div>
                       <span className="text-[15px] font-bold text-[#234745]">{isEn ? 'Add a promo code' : 'إضافة كود خصم'}</span>
                    </div>
                    <div className="text-gray-200 group-hover:text-[#d4a06a] transition-colors">
                       <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 animate-fade-in">
                    <input
                        type="text"
                        name="discountCode"
                        autoFocus
                        placeholder={isEn ? "Enter code" : "أدخل الكود"}
                        className="flex-1 bg-[#fcfaf8] border border-[#f0ece8] rounded-xl px-4 py-2 text-[14px] text-[#234745] focus:outline-none focus:border-[#d4a06a]"
                      />
                      <button 
                        type="submit"
                        disabled={isLoading}
                        className="bg-[#234745] text-white px-4 py-2 rounded-xl text-[13px] font-bold hover:bg-[#003840]"
                      >
                        {isLoading ? '...' : (isEn ? 'Apply' : 'تطبيق')}
                      </button>
                      <button 
                        type="button"
                        onClick={() => setShowInput(false)}
                        className="text-gray-400 hover:text-red-500 p-2"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                  </div>
                )}
              </>
            );
          }}
        </UpdateDiscountForm>
      </div>
    </section>
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
