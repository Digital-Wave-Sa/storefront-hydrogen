import {useEffect} from 'react';
import {useFetcher, useLocation} from 'react-router';
import {CartForm} from '@shopify/hydrogen';
import {SaudiRiyalSymbol} from './Price';

/**
 * Offers the free item of a Buy X Get Y discount the cart has earned.
 *
 * Shopify does not add that item itself — its discount only ever discounts a
 * line already in the cart — so without something like this the shopper adds
 * the qualifying product, receives nothing, and is told nothing.
 *
 * Purely additive: it renders null unless /api/bogo-suggestion reports an
 * earned gift, and the button is an ordinary LinesAdd of an ordinary line. No
 * `_is_free` attribute, so nothing here touches how the cart totals up — the
 * gift is priced by Shopify's own automatic discount, and if that discount
 * ever stops applying the line shows its real price instead of a total that
 * disagrees with checkout.
 */
export function BogoSuggestion({
  cartKey,
  isEn,
}: {
  /** Changes whenever the cart's contents change, to re-ask for the offer. */
  cartKey: string;
  isEn: boolean;
}) {
  const suggestion = useFetcher<{gift: any}>();
  const addToCart = useFetcher();
  const location = useLocation();
  const cartRoute = location.pathname.startsWith('/en') ? '/en/cart' : '/cart';

  useEffect(() => {
    suggestion.load('/api/bogo-suggestion');
    // Re-asked on every cart change; the fetcher itself is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartKey]);

  const gift = suggestion.data?.gift;
  if (!gift) return null;

  const isAdding = addToCart.state !== 'idle';

  const addGift = () => {
    const formData = new FormData();
    formData.append(
      'cartFormInput',
      JSON.stringify({
        action: CartForm.ACTIONS.LinesAdd,
        inputs: {lines: [{merchandiseId: gift.variantId, quantity: 1}]},
      }),
    );
    addToCart.submit(formData, {method: 'POST', action: cartRoute});
  };

  const font = {fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif"};

  return (
    <div
      className="bg-[#FEF8EB] border border-[#EBDCC5] rounded-[20px] p-4 flex items-center gap-4 shadow-xs"
      dir={isEn ? 'ltr' : 'rtl'}
    >
      {gift.imageUrl ? (
        <img
          src={gift.imageUrl}
          alt={gift.imageAlt || gift.title}
          className="w-[64px] h-[64px] rounded-[12px] object-cover bg-white shrink-0"
        />
      ) : (
        <div className="w-[64px] h-[64px] rounded-[12px] bg-white shrink-0" />
      )}

      <div className="flex-1 min-w-0">
        <p
          className="text-[13px] font-bold text-[#8A6D3B] mb-0.5"
          style={font}
        >
          {isEn ? 'You have earned a free gift' : 'لقد ربحت هدية مجانية'}
        </p>
        <p
          className="text-[15px] font-bold text-[#234745] truncate"
          style={font}
        >
          {gift.title}
        </p>
        <p className="text-[12px] text-[#7D7D7D] mt-0.5" style={font}>
          <span>
            {isEn
              ? 'Add it to your cart to receive it free'
              : 'أضفها إلى سلتك لتحصل عليها مجاناً'}
          </span>
          {gift.price ? (
            <>
              <span className="mx-1">—</span>
              {/*
                SaudiRiyalSymbol carries a viewBox but no intrinsic size, so it
                fills whatever box it is given unless a height is passed.
              */}
              <span
                className="line-through inline-flex items-center gap-1 align-middle"
                dir="ltr"
              >
                {Number(gift.price.amount).toFixed(2)}
                <SaudiRiyalSymbol className="h-[10px] w-auto" />
              </span>
            </>
          ) : null}
        </p>
      </div>

      <button
        type="button"
        onClick={addGift}
        disabled={isAdding}
        className="shrink-0 bg-[#234745] hover:bg-[#1a3533] disabled:opacity-60 text-white rounded-full px-5 h-[40px] text-[14px] font-bold transition-all active:scale-95"
        style={font}
      >
        {isAdding
          ? isEn
            ? 'Adding…'
            : 'جارٍ الإضافة…'
          : isEn
            ? 'Add free gift'
            : 'أضف الهدية'}
      </button>
    </div>
  );
}
