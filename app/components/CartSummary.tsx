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
      {branch && (
        <div className="bg-[#fcfaf8] border border-[#f0ece8] rounded-2xl p-4">
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
              <p className="text-[13px] font-black text-[#1b3d2e] truncate">{branch}</p>
            </div>
          </div>
        </div>
      )}

      {/* Subtotal */}
      <dl role="group" className="flex justify-between items-center py-2 border-b border-[#f0ece8]">
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
    <section aria-label="Discounts" className="flex flex-col gap-3">
      {/* Have existing discount, display it with a remove option */}
      <dl hidden={!codes.length}>
        <div>
          <dt id={discountsHeadingId} className="sr-only">Discounts</dt>
          <UpdateDiscountForm>
            <div className="flex items-center justify-between bg-[#fcfaf8] border border-green-200 rounded-xl px-4 py-2">
              <div className="flex items-center gap-2 text-green-700">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                <code className="font-bold text-[13px]">{codes?.join(', ')}</code>
              </div>
              <button 
                type="submit" 
                aria-label="Remove discount"
                className="text-gray-400 hover:text-red-500 transition-colors p-1"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
          </UpdateDiscountForm>
        </div>
      </dl>

      {/* Show an input to apply a discount */}
      <UpdateDiscountForm discountCodes={codes}>
        <div className="flex gap-2">
          <label htmlFor={discountCodeInputId} className="sr-only">
            Discount code
          </label>
          <input
            id={discountCodeInputId}
            type="text"
            name="discountCode"
            placeholder={isEn ? "Discount code" : "كود الخصم"}
            className="flex-1 bg-[#fcfaf8] border border-[#f0ece8] rounded-xl px-4 py-3 text-[14px] text-[#1b3d2e] placeholder-gray-400 focus:outline-none focus:border-[#d4a06a] focus:ring-1 focus:ring-[#d4a06a] transition-all"
          />
          <button 
            type="submit" 
            aria-label="Apply discount code"
            className="bg-[#f0ece8] text-[#1b3d2e] font-bold px-5 py-3 rounded-xl hover:bg-[#e8e4e1] transition-colors"
          >
            {isEn ? 'Apply' : 'تطبيق'}
          </button>
        </div>
      </UpdateDiscountForm>
    </section>
  );
}

function UpdateDiscountForm({
  discountCodes,
  children,
}: {
  discountCodes?: string[];
  children: React.ReactNode;
}) {
  return (
    <CartForm
      route="/cart"
      action={CartForm.ACTIONS.DiscountCodesUpdate}
      inputs={{
        discountCodes: discountCodes || [],
      }}
    >
      {children}
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
      {/* Have existing gift card applied, display it with a remove option */}
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

      {/* Show an input to apply a gift card */}
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
