import type {CartApiQueryFragment} from 'storefrontapi.generated';
import type {CartLayout} from '~/components/CartMain';
import {CartForm, Money, type OptimisticCart} from '@shopify/hydrogen';
import {useEffect, useId, useRef, useState} from 'react';
import {useFetcher, useRouteLoaderData} from 'react-router';

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

  const branch = cart?.attributes?.find((a) => a.key === 'Branch')?.value;
  const fulfillmentType = cart?.attributes?.find((a) => a.key === 'Fulfillment Type')?.value;

  return (
    <div aria-labelledby={summaryId} className="flex flex-col gap-4">
      {/* Delivery / Pickup Status */}
      <div className="bg-[#fcfaf8] border border-[#f0ece8] rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#1b3d2e] flex items-center justify-center text-white shrink-0">
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
              <p className="text-[13px] font-black text-[#1b3d2e] truncate">{branch || (isEn ? 'Not selected' : 'لم يتم التحديد')}</p>
            </div>
          </div>
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('openDeliveryModal'))}
            className="text-[12px] font-bold text-[#d4a06a] hover:text-[#1b3d2e] transition-colors bg-white px-3 py-1.5 rounded-full border border-[#f0ece8] shadow-sm"
          >
            {isEn ? 'Edit' : 'تعديل'}
          </button>
        </div>
      </div>

      {/* Time Slot Picker */}
      <CartTimeSlot isEn={isEn} cart={cart} />

      {/* Order Notes */}
      <CartOrderNotes isEn={isEn} cart={cart} />

      {/* Subtotal */}
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

      <CartCheckoutActions checkoutUrl={cart?.checkoutUrl} isEn={isEn} />
    </div>
  );
}

// ─── NEW: TIME SLOT PICKER ──────────────────────────────────────────────────
function CartTimeSlot({ isEn, cart }: { isEn: boolean, cart: any }) {
  const timeSlot = cart?.attributes?.find((a: any) => a.key === 'Time Slot')?.value || '';
  
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[13px] font-bold text-[#1b3d2e] px-1">{isEn ? 'Schedule Order' : 'جدولة الطلب'}</label>
      <CartForm route="/cart" action={'AttributesUpdate' as any}>
        <input type="hidden" name="attributes[0][key]" value="Time Slot" />
        <div className="relative">
          <select 
            name="attributes[0][value]"
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

function CartCheckoutActions({checkoutUrl, isEn}: {checkoutUrl?: string; isEn: boolean}) {
  if (!checkoutUrl) return null;

  return (
    <div className="mt-2">
      <a 
        href={checkoutUrl} 
        target="_self"
        className="w-full bg-[#1b3d2e] hover:bg-[#d4a06a] text-white font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_4px_14px_rgba(27,61,46,0.2)] hover:shadow-[0_4px_14px_rgba(212,160,106,0.3)] hover:-translate-y-0.5"
      >
        <span>{isEn ? 'Continue to Checkout' : 'متابعة الدفع'}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={isEn ? '' : 'rotate-180'}>
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
      </a>
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
            const actionError = errors.length > 0 ? errors[0]?.message : null;

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
