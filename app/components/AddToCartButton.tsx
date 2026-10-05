import { useEffect, useRef } from 'react';
import { useFetcher, useNavigate, useLocation } from 'react-router';
import { CartForm, type OptimisticCartLineInput } from '@shopify/hydrogen';
import { useAside } from './Aside';
import { prefersCartToast, showCartToast } from '~/lib/cart-toast';
import { numericId, snapTrack } from '~/lib/snap-pixel';
import { tiktokTrack } from '~/lib/tiktok-pixel';

export function AddToCartButton({
  analytics,
  children,
  disabled,
  lines,
  onClick,
  onAddToCartSuccess,
  selectedVariant,
  className,
  style,
  isExport,
}: {
  analytics?: unknown;
  children: React.ReactNode;
  disabled?: boolean;
  lines: Array<OptimisticCartLineInput>;
  onClick?: () => void;
  /**
   * Replaces the default confirmation (the «أُضيفت إلى السلة» toast).
   * Return `true` when the callback shows its own confirmation (e.g. the
   * upsell modal) so the toast is not stacked on top of it.
   */
  onAddToCartSuccess?: () => void | boolean;
  selectedVariant?: any;
  className?: string;
  style?: React.CSSProperties;
  /** When true: tags line with _export=true and redirects to /export-cart */
  isExport?: boolean;
}) {
  const { open } = useAside();
  const navigate = useNavigate();
  const location = useLocation();
  const fetcher = useFetcher();

  const isEn = location.pathname.startsWith('/en');
  const cartRoute = isEn ? '/en/cart' : '/cart';
  const isSubmitting = fetcher.state !== 'idle';

  /*
   * The toast waits for the cart's answer, so it never says
   * «تمت الإضافة» for an add that failed (sold out, cart error).
   */
  const pendingToast = useRef<{ title?: string; image?: string; quantity?: number } | null>(null);

  /**
   * Ad-pixel add to cart (Snap ADD_CART, TikTok AddToCart), sent once the
   * cart confirms the add. See ~/lib/snap-pixel and ~/lib/tiktok-pixel.
   */
  const pendingSnap = useRef<Record<string, unknown> | null>(null);
  const pendingTikTok = useRef<Record<string, unknown> | null>(null);
  useEffect(() => {
    if (fetcher.state !== 'idle' || !pendingSnap.current) return;
    const snap = pendingSnap.current;
    const tiktok = pendingTikTok.current;
    pendingSnap.current = null;
    pendingTikTok.current = null;
    const res = fetcher.data as any;
    if (res?.error || res?.errors?.[0]?.message) return;
    snapTrack('ADD_CART', snap);
    if (tiktok) tiktokTrack('AddToCart', tiktok);
  }, [fetcher.state, fetcher.data]);

  useEffect(() => {
    if (fetcher.state !== 'idle' || !pendingToast.current) return;
    const item = pendingToast.current;
    pendingToast.current = null;
    const res = fetcher.data as any;
    const error = res?.error || res?.errors?.[0]?.message;
    if (error) showCartToast({ kind: 'error', message: String(error) });
    else showCartToast({ kind: 'added', ...item });
  }, [fetcher.state, fetcher.data]);

  const fireAddToCartEvent = () => {
    try {
      if (typeof window === 'undefined') return;
      const w = window as any;
      w.dataLayer = w.dataLayer || [];

      // Only fire if user has given consent
      const consent = localStorage.getItem('saadeddin_cookie_consent');
      if (consent !== 'accepted') return;

      const variant = selectedVariant;
      if (!variant) return;

      const price = parseFloat(variant.price?.amount || '0');
      const currency = variant.price?.currencyCode || 'SAR';

      w.dataLayer.push({ ecommerce: null }); // clear previous
      w.dataLayer.push({
        event: 'add_to_cart',
        ecommerce: {
          currency,
          value: price,
          items: [{
            item_id: variant.sku || variant.id?.split('/').pop() || '',
            item_name: variant.product?.title || (analytics as any)?.productTitle || '',
            item_variant: variant.title !== 'Default Title' ? variant.title : undefined,
            price,
            quantity: lines[0]?.quantity || 1,
            currency,
          }],
        },
      });
    } catch (e) {
      // fail silently — analytics should never break the cart
    }
  };

  // Inject _export attribute into each line when isExport is true
  const exportLines = isExport
    ? lines.map(line => ({
        ...line,
        attributes: [
          ...((line as any).attributes || []),
          { key: '_export', value: 'true' },
        ],
      }))
    : lines;

  // Sanitize lines to ensure valid Shopify CartLineInput fields + selectedVariant for useOptimisticCart
  const cleanLines = exportLines.map(line => {
    const { merchandiseId, quantity, attributes, sellingPlanId } = line as any;
    const variant = (line as any).selectedVariant || selectedVariant;
    const cleanAttrs = Array.isArray(attributes)
      ? attributes.map((a: any) => ({ key: String(a.key), value: String(a.value ?? '') }))
      : [];
    return {
      merchandiseId,
      quantity,
      ...(variant ? { selectedVariant: variant } : {}),
      ...(cleanAttrs.length > 0 ? { attributes: cleanAttrs } : {}),
      ...(sellingPlanId ? { sellingPlanId } : {}),
    };
  });

  const handleSubmit = (e: React.MouseEvent) => {
    // Prevent any default browser behavior or tab opening
    e.preventDefault();
    e.stopPropagation();
    if (e.nativeEvent && typeof e.nativeEvent.stopImmediatePropagation === 'function') {
      e.nativeEvent.stopImmediatePropagation();
    }

    // Ignore middle-clicks, right-clicks, or clicks with modifier keys (Ctrl/Cmd) that browsers use to open new tabs
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }

    if (disabled || isSubmitting) return;

    fireAddToCartEvent();
    if (onClick) onClick();

    if (!isExport) {
      // Paid lines only: free BOGO give-aways and add-ons are not what was bought.
      const paid = cleanLines.filter(
        (l: any) => !(l.attributes || []).some((a: any) => a.key === '_is_free' && a.value === 'true'),
      );
      const v = (paid[0] as any)?.selectedVariant || selectedVariant;
      const quantity = paid.reduce((n: number, l: any) => n + (Number(l.quantity) || 0), 0);
      const unit = parseFloat(v?.price?.amount || '0');
      pendingSnap.current = {
        price: Math.round(unit * Math.max(quantity, 1) * 100) / 100,
        currency: v?.price?.currencyCode || 'SAR',
        item_ids: paid.map((l: any) => numericId(l.merchandiseId)).filter(Boolean),
        number_items: quantity || 1,
      };
      pendingTikTok.current = {
        contents: paid.map((l: any) => {
          const lv = l.selectedVariant || v;
          return {
            content_id: numericId(l.merchandiseId),
            content_type: 'product',
            content_name: lv?.product?.title,
            price: parseFloat(lv?.price?.amount || '0'),
            quantity: Number(l.quantity) || 1,
          };
        }),
        value: Math.round(unit * Math.max(quantity, 1) * 100) / 100,
        currency: v?.price?.currencyCode || 'SAR',
      };
    }

    const formData = new FormData();
    const cartInput = {
      action: CartForm.ACTIONS.LinesAdd,
      inputs: { lines: cleanLines },
    };
    formData.append('cartFormInput', JSON.stringify(cartInput));
    if (analytics) {
      formData.append('analytics', JSON.stringify(analytics));
    }

    // Post directly to /cart (or /en/cart) to execute cart addition cleanly
    fetcher.submit(formData, { method: 'POST', action: cartRoute });

    if (isExport) {
      navigate('/export-cart');
    } else {
      const toastMode = prefersCartToast();
      let handled = false;
      if (onAddToCartSuccess) {
        try {
          handled = onAddToCartSuccess() === true;
        } catch (e) {
          console.error('[AddToCartButton] onAddToCartSuccess error:', e);
          if (!toastMode) open('cart');
        }
      } else if (!toastMode) {
        open('cart');
      }
      if (toastMode && !handled) {
        const variant = (lines[0] as any)?.selectedVariant || selectedVariant;
        pendingToast.current = {
          title: variant?.product?.title || (analytics as any)?.productTitle,
          image: variant?.image?.url,
          quantity: Number(lines[0]?.quantity) || undefined,
        };
      }
    }
  };

  return (
    <button
      type="button"
      onClick={handleSubmit}
      disabled={disabled || isSubmitting}
      className={className}
      style={style}
    >
      {isSubmitting ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-5 w-5 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}

