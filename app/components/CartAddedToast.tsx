import {useEffect, useRef, useState} from 'react';
import {Link, useLocation} from 'react-router';
import {CART_TOAST_EVENT, type CartToastDetail} from '~/lib/cart-toast';

const VISIBLE_MS = 4000;

/**
 * Phone replacement for the cart drawer after «أضف إلى السلة».
 * Raised through `showCartToast` (app/lib/cart-toast.ts); mounted once in
 * PageLayout. Desktop never raises it.
 */
export function CartAddedToast() {
  const location = useLocation();
  const isEn = location.pathname.startsWith('/en');
  const [toast, setToast] = useState<CartToastDetail | null>(null);
  const [shown, setShown] = useState(false);
  const [toastKey, setToastKey] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<CartToastDetail>).detail;
      if (!detail) return;
      if (timer.current) clearTimeout(timer.current);
      setToast(detail);
      setToastKey((k) => k + 1);
      // Next frame, so the slide-up runs even when a toast is already showing.
      requestAnimationFrame(() => setShown(true));
      timer.current = setTimeout(() => setShown(false), VISIBLE_MS);
    };
    window.addEventListener(CART_TOAST_EVENT, onToast);
    return () => {
      window.removeEventListener(CART_TOAST_EVENT, onToast);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  // Leaving the page takes the toast with it.
  useEffect(() => {
    setShown(false);
  }, [location.pathname]);

  // Stays mounted (hidden off-screen) once used, so back-to-back adds never race an unmount.
  if (!toast) return null;

  const dismiss = () => {
    if (timer.current) clearTimeout(timer.current);
    setShown(false);
  };

  const font = isEn ? undefined : "'EnglishDigits', 'GE Dinar One', sans-serif";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-hidden={!shown}
      dir={isEn ? 'ltr' : 'rtl'}
      className={`lg:hidden fixed inset-x-3 z-[70] transition-all duration-300 ease-out ${
        shown ? 'translate-y-0 opacity-100' : 'translate-y-[140%] opacity-0 pointer-events-none'
      }`}
      style={{bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))', fontFamily: font}}
    >
      {toast.kind === 'added' ? (
        /*
         * Spans, not <p>/<a> styling: the global `:root p` size and the reset's
         * `a { color: inherit }` sit outside Tailwind's layers and beat plain
         * utilities, which is what blew the title up to three lines and hid
         * the button label. `!` utilities are this repo's way past that.
         */
        <div className="relative overflow-hidden bg-white border border-[#BBCFCD]/60 rounded-2xl shadow-[0_10px_30px_rgba(35,71,69,0.16)]">
          <div className="flex items-center gap-2.5 p-2.5">
            {toast.image ? (
              <img
                src={toast.image}
                alt=""
                className="w-10 h-10 rounded-lg object-cover bg-[#F4F1EC] shrink-0"
              />
            ) : null}
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
              <span className="flex items-center gap-1 !text-[13px] font-bold !leading-5 !text-[#234745] whitespace-nowrap">
                <svg aria-hidden="true" viewBox="0 0 20 20" className="w-4 h-4 shrink-0 fill-[#2E8B57]">
                  <path d="M10 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm4.03 6.28-4.6 5.2a.9.9 0 0 1-1.3.05l-2.2-2.13a.9.9 0 1 1 1.25-1.3l1.52 1.47 3.97-4.48a.9.9 0 1 1 1.35 1.19Z" />
                </svg>
                <span>{isEn ? 'Added to cart' : 'أُضيفت إلى السلة'}</span>
              </span>
              {toast.title ? (
                <span className="block !text-[12px] !leading-4 !text-[#5C7472] truncate">
                  {toast.quantity && toast.quantity > 1 ? `${toast.quantity} × ` : ''}
                  {toast.title}
                </span>
              ) : null}
            </div>
            <Link
              to={isEn ? '/en/cart' : '/cart'}
              prefetch="intent"
              onClick={dismiss}
              tabIndex={shown ? 0 : -1}
              className="shrink-0 whitespace-nowrap bg-[#234745] !text-white !text-[12px] font-bold !leading-none px-3 py-2.5 rounded-full active:scale-95 transition-transform"
            >
              {isEn ? 'View cart' : 'عرض السلة'}
            </Link>
          </div>
          {/* Time left before it closes itself. */}
          <span
            key={toastKey}
            aria-hidden="true"
            className="absolute bottom-0 inset-x-0 h-[3px] bg-[#2E8B57]/70 origin-[var(--o)]"
            style={{
              ['--o' as any]: isEn ? 'left' : 'right',
              animation: shown ? `cart-toast-timer ${VISIBLE_MS}ms linear forwards` : 'none',
            }}
          />
          <style>{`@keyframes cart-toast-timer{from{transform:scaleX(1)}to{transform:scaleX(0)}}`}</style>
        </div>
      ) : (
        <div className="bg-[#7a2e2e] text-white rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.25)] p-3 flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-white/15 shrink-0 flex items-center justify-center font-bold">!</span>
          <span className="flex-1 !text-[13px] !leading-5 !text-white">{toast.message}</span>
          <button
            type="button"
            onClick={dismiss}
            tabIndex={shown ? 0 : -1}
            aria-label={isEn ? 'Close' : 'إغلاق'}
            className="shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
