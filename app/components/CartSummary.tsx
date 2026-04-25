import type {CartApiQueryFragment} from 'storefrontapi.generated';
import type {CartLayout} from '~/components/CartMain';
import {CartForm, Money, type OptimisticCart} from '@shopify/hydrogen';
import {useEffect, useId, useRef, useState} from 'react';
import {useFetcher, useRouteLoaderData, Link} from 'react-router';
import {useAside} from '~/components/Aside';

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
  const isEn = rootData?.locale === 'en';

  const subtotal = Number(cart?.cost?.subtotalAmount?.amount ?? 0);
  const minOrderValue = 50; // Minimum order value requirement
  const isMinOrderMet = subtotal >= minOrderValue;
  
  const attributes = cart?.attributes || [];
  const branch = attributes.find((a: any) => a.key.toLowerCase().trim() === 'branch')?.value;
  const fulfillmentType = attributes.find((a: any) => a.key.toLowerCase().trim() === 'fulfillment type')?.value;
  const timeSlot = attributes.find((a: any) => a.key.toLowerCase().trim() === 'time slot')?.value;
  
  const isTimeSlotSelected = !!timeSlot && timeSlot.trim() !== '';
  const isBranchSelected = !!branch && branch.trim() !== '';

  const hasPreOrderItems = cart?.lines?.nodes?.some((line: any) => 
    line.merchandise?.product?.tags?.some((tag: string) => 
      ['preorder', 'pre-order', 'طلب مسبق'].includes(tag.toLowerCase())
    )
  );

  const hasCashOnly = cart?.lines?.nodes?.some((line: any) => 
    line.merchandise?.product?.tags?.some((tag: string) => tag.toLowerCase() === 'cash-only')
  );

  const hasPrepaidOnly = cart?.lines?.nodes?.some((line: any) => 
    line.merchandise?.product?.tags?.some((tag: string) => tag.toLowerCase() === 'prepaid-only')
  );

  const canCheckout = isMinOrderMet && isBranchSelected;

  return (
    <div aria-labelledby={summaryId} className="flex flex-col gap-4">
      {layout === 'page' && (
        <>
          {/* Delivery / Pickup Status */}
      <div className={`bg-[#fcfaf8] border ${!isBranchSelected ? 'border-red-200 bg-red-50' : 'border-[#f0ece8]'} rounded-2xl p-4 transition-colors`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full ${!isBranchSelected ? 'bg-red-500' : 'bg-[#1b3d2e]'} flex items-center justify-center text-white shrink-0 transition-colors`}>
              {fulfillmentType === 'Delivery' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider leading-none mb-1">
                {isEn ? (fulfillmentType === 'Delivery' ? 'Delivering from' : 'Picking up from') : (fulfillmentType === 'Delivery' ? 'توصيل من' : 'استلام من')}
              </p>
              <p className={`text-[13px] font-black ${!isBranchSelected ? 'text-red-600' : 'text-[#1b3d2e]'} truncate`}>{branch || (isEn ? 'Please select a branch' : 'يرجى اختيار الفرع')}</p>
            </div>
          </div>
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('openDeliveryModal'))}
            className="text-[12px] font-bold text-[#d4a06a] hover:text-[#1b3d2e] transition-colors bg-white px-3 py-1.5 rounded-full border border-[#f0ece8] shadow-sm"
          >
            {isEn ? (isBranchSelected ? 'Edit' : 'Select') : (isBranchSelected ? 'تعديل' : 'اختيار')}
          </button>
        </div>
      </div>

      {/* Time Slot Picker */}
      <CartTimeSlot isEn={isEn} cart={cart} hasError={!isTimeSlotSelected} />

      {/* Order Notes */}
      <CartOrderNotes isEn={isEn} cart={cart} />
        </>
      )}

      {/* Subtotal */}
      <div className="flex flex-col gap-1">
        <dl role="group" className="flex justify-between items-center py-2 border-b border-[#f0ece8] mt-2">
          <dt className="text-[15px] font-bold text-[#888]">{isEn ? 'Subtotal' : 'المجموع الفرعي'}</dt>
          <dd className="text-[18px] font-black text-[#1b3d2e]">
            {cart?.cost?.subtotalAmount?.amount ? (
              <Money data={cart?.cost?.subtotalAmount} />
            ) : (
              '-'
            )}
          </dd>
        </dl>
        {!isMinOrderMet && (
          <p className="text-red-500 text-[11px] font-bold mt-1 text-right flex items-center justify-end gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            {isEn ? `Minimum order value is SAR ${minOrderValue}` : `الحد الأدنى للطلب هو ${minOrderValue} ر.س`}
          </p>
        )}
      </div>

      {layout === 'page' && (
        <>
          <CartDiscounts
        discountCodes={cart?.discountCodes}
        discountsHeadingId={discountsHeadingId}
        discountCodeInputId={discountCodeInputId}
        isEn={isEn}
      />
      
      <CartGiftCard
        giftCardCodes={cart?.appliedGiftCards}
        giftCardHeadingId={giftCardHeadingId}
        giftCardInputId={giftCardInputId}
        isEn={isEn}
      />
      
      <LoyaltyRedemptionUI isEn={isEn} cart={cart} />
        </>
      )}

      {/* Pre-order Messaging */}
      {hasPreOrderItems && (
        <div className="bg-[#004f59]/5 border border-[#004f59]/20 rounded-xl p-3 flex gap-3 animate-fade-in">
          <div className="w-8 h-8 rounded-full bg-[#004f59] flex items-center justify-center text-white shrink-0 shadow-sm">
            <span className="animate-pulse">📦</span>
          </div>
          <div className="flex-1">
            <p className="text-[12px] font-black text-[#004f59] uppercase tracking-wider mb-0.5">
              {isEn ? 'Pre-order Items Included' : 'يحتوي الطلب على أصناف طلب مسبق'}
            </p>
            <p className="text-[11px] text-[#004f59]/80 font-medium leading-tight">
              {isEn 
                ? 'Your entire order will be shipped together once all items are available.' 
                : 'سيتم شحن طلبك بالكامل عند توفر جميع الأصناف.'}
            </p>
          </div>
        </div>
      )}

      {/* Payment Restriction Messaging */}
      {(hasCashOnly || hasPrepaidOnly) && (
        <div className={`border rounded-xl p-3 flex gap-3 animate-fade-in ${hasCashOnly && hasPrepaidOnly ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 shadow-sm ${hasCashOnly && hasPrepaidOnly ? 'bg-red-500' : 'bg-blue-500'}`}>
            <span>⚠️</span>
          </div>
          <div className="flex-1">
            <p className={`text-[12px] font-black uppercase tracking-wider mb-0.5 ${hasCashOnly && hasPrepaidOnly ? 'text-red-700' : 'text-blue-700'}`}>
              {isEn ? 'Payment Notice' : 'ملاحظة بخصوص الدفع'}
            </p>
            <p className={`text-[11px] font-medium leading-tight ${hasCashOnly && hasPrepaidOnly ? 'text-red-600' : 'text-blue-600'}`}>
              {hasCashOnly && hasPrepaidOnly 
                ? (isEn ? 'Your cart contains items with conflicting payment requirements. Please check your items.' : 'تحتوي سلتك على منتجات بمتطلبات دفع متعارضة. يرجى مراجعة المنتجات.')
                : hasCashOnly 
                  ? (isEn ? 'Some items in your cart can only be paid via Cash.' : 'بعض المنتجات في سلتك تتطلب الدفع نقداً فقط.')
                  : (isEn ? 'Some items in your cart require online payment.' : 'بعض المنتجات في سلتك تتطلب الدفع أونلاين فقط.')
              }
            </p>
          </div>
        </div>
      )}

      {layout === 'page' ? (
        <CartCheckoutActions 
          checkoutUrl={cart?.checkoutUrl} 
          isEn={isEn} 
          disabled={!canCheckout}
          validationError={
            !isMinOrderMet ? (isEn ? `Minimum order is SAR ${minOrderValue}` : `الحد الأدنى هو ${minOrderValue} ر.س`) :
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
      <label className="text-[13px] font-bold text-[#1b3d2e] px-1">
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
            className="w-full bg-[#fcfaf8] border border-[#f0ece8] rounded-xl px-4 py-3 text-[14px] text-[#1b3d2e] font-medium appearance-none focus:outline-none focus:border-[#d4a06a] focus:ring-1 focus:ring-[#d4a06a] transition-all cursor-pointer"
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
      <label className="text-[13px] font-bold text-[#1b3d2e] px-1">{isEn ? 'Order Notes' : 'ملاحظات الطلب'}</label>
      <CartForm route="/cart" action={'NoteUpdate' as any}>
        <textarea
           name="note"
           defaultValue={note}
           placeholder={isEn ? "Write a note (e.g. Happy Birthday)" : "اكتب ملاحظة (مثال: عيد ميلاد سعيد)"}
           rows={2}
           onBlur={(e) => {
             if (e.target.form) e.target.form.requestSubmit();
           }}
           className="w-full bg-[#fcfaf8] border border-[#f0ece8] rounded-xl px-4 py-3 text-[14px] text-[#1b3d2e] placeholder-gray-400 focus:outline-none focus:border-[#d4a06a] focus:ring-1 focus:ring-[#d4a06a] transition-all resize-none"
        />
      </CartForm>
    </div>
  );
}

function CartCheckoutActions({
  checkoutUrl, 
  isEn, 
  disabled, 
  validationError
}: {
  checkoutUrl?: string; 
  isEn: boolean;
  disabled?: boolean;
  validationError?: string | null;
}) {
  return (
    <div className="mt-2 flex flex-col gap-3">
      {checkoutUrl ? (
        <div className="flex flex-col gap-2">
          <a 
            href={disabled ? '#' : checkoutUrl} 
            target="_self"
            onClick={(e) => {
              if (disabled) e.preventDefault();
            }}
            className={`w-full ${disabled ? 'bg-[#e8e4e1] cursor-not-allowed text-[#888]' : 'bg-[#1b3d2e] hover:bg-[#d4a06a] text-white shadow-[0_4px_14px_rgba(27,61,46,0.2)] hover:shadow-[0_4px_14px_rgba(212,160,106,0.3)] hover:-translate-y-0.5'} font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all`}
          >
            <span>{isEn ? 'Proceed to Checkout' : 'متابعة الدفع'}</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={isEn ? '' : 'rotate-180'}>
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </a>
          {disabled && validationError && (
            <p className="text-red-500 text-[12px] font-bold text-center px-4 py-2 bg-red-50 rounded-xl border border-red-100 flex items-center justify-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              {validationError}
            </p>
          )}
        </div>
      ) : (
        <button 
          disabled
          className="w-full bg-[#e8e4e1] text-[#888] cursor-not-allowed font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all"
        >
          <span>{isEn ? 'Loading Checkout...' : 'جاري تجهيز الدفع...'}</span>
          <svg className="animate-spin h-5 w-5 ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"></circle><path d="M12 2a10 10 0 0 1 10 10" strokeOpacity="0.75"></path></svg>
        </button>
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
        <div className="flex items-center gap-2 text-[#1b3d2e]">
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
            className="w-[80px] bg-white border border-[#f0ece8] rounded-lg px-2 py-1.5 text-center text-[13px] font-bold text-[#1b3d2e] focus:outline-none focus:border-[#d4a06a]"
          />
        </div>

        {/* Feedback & Apply */}
        <div className="flex items-center justify-between border-t border-[#f0ece8] pt-3">
          <div className="flex flex-col">
            <span className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">
              {isEn ? 'You save' : 'أنت توفر'}
            </span>
            <span className="text-[16px] font-black text-[#27ae60] font-en">
              {discountAmount.toFixed(2)} SAR
            </span>
          </div>
          <button 
            disabled={pointsToRedeem === 0}
            className="bg-[#1b3d2e] text-white font-bold px-5 py-2.5 rounded-lg text-[13px] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#142e22] transition-colors"
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
    <div className="mt-2">
      <Link
        to={isEn ? '/en/cart' : '/cart'}
        onClick={close}
        prefetch="intent"
        className="w-full bg-[#1b3d2e] hover:bg-[#d4a06a] text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_4px_14px_rgba(27,61,46,0.2)] hover:shadow-[0_4px_14px_rgba(212,160,106,0.3)] hover:-translate-y-0.5"
      >
        <span>{isEn ? 'View Cart' : 'عرض السلة'}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={isEn ? '' : 'rotate-180'}>
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
  const codes: string[] =
    discountCodes
      ?.filter((discount) => discount.applicable)
      ?.map(({code}) => code) || [];

  return (
    <section aria-label="Discounts" className="flex flex-col gap-3 pt-2">
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
                        {isEn ? 'Voucher applied successfully' : 'تم تطبيق الكود بنجاح'}
                      </span>
                    </div>
                  </div>
                  <button 
                    type="submit" 
                    aria-label="Remove discount"
                    disabled={isRemoving}
                    className="text-green-600 hover:text-red-500 hover:bg-red-50 transition-colors p-2 rounded-lg"
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
            const errors = fetcher.data?.errors || [];
            let actionError = errors.length > 0 ? errors[0]?.message : null;

            // Catch silent rejections where Shopify accepts the code but flags it as not applicable
            // Only show this error if the user actively tried to submit a code (fetcher.data exists)
            const unapplicableCodes = discountCodes?.filter(d => !d.applicable) || [];
            if (!actionError && unapplicableCodes.length > 0 && fetcher.data) {
              actionError = isEn ? 'Invalid or expired voucher code.' : 'قسيمة الخصم غير صالحة أو منتهية الصلاحية.';
            }

            return (
              <div>
                <div className="flex gap-2">
                  <label htmlFor={discountCodeInputId} className="sr-only">
                    Discount code
                  </label>
                  <input
                    id={discountCodeInputId}
                    type="text"
                    name="discountCode"
                    placeholder={isEn ? "Voucher or Discount code" : "كود الخصم أو القسيمة"}
                    className={`flex-1 bg-[#fcfaf8] border ${actionError ? 'border-red-400' : 'border-[#f0ece8]'} rounded-xl px-4 py-3 text-[14px] text-[#1b3d2e] placeholder-gray-400 focus:outline-none focus:border-[#d4a06a] focus:ring-1 focus:ring-[#d4a06a] transition-all uppercase`}
                  />
                  <button 
                    type="submit" 
                    aria-label="Apply discount code"
                    disabled={isLoading}
                    className="bg-[#1b3d2e] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#142e22] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {isLoading ? '...' : (isEn ? 'Apply' : 'تطبيق')}
                  </button>
                </div>
                {actionError && (
                  <p className="text-red-500 text-[12px] font-bold mt-2 px-1 flex items-center gap-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                    {actionError}
                  </p>
                )}
              </div>
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
            className="flex-1 bg-[#fcfaf8] border border-[#f0ece8] rounded-xl px-4 py-3 text-[14px] text-[#1b3d2e] placeholder-gray-400 focus:outline-none focus:border-[#d4a06a] focus:ring-1 focus:ring-[#d4a06a] transition-all"
          />
          <button 
            type="submit" 
            aria-label="Apply gift card"
             className="bg-[#f0ece8] text-[#1b3d2e] font-bold px-5 py-3 rounded-xl hover:bg-[#e8e4e1] transition-colors"
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
