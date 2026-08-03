import { useFetcher, useNavigate, useLocation } from 'react-router';
import { CartForm, type OptimisticCartLineInput } from '@shopify/hydrogen';
import { useAside } from './Aside';

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
  onAddToCartSuccess?: () => void;
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

  // Sanitize lines to ensure only valid Shopify CartLineInput fields are sent
  const cleanLines = exportLines.map(line => {
    const { merchandiseId, quantity, attributes, sellingPlanId } = line as any;
    const cleanAttrs = Array.isArray(attributes)
      ? attributes.map((a: any) => ({ key: String(a.key), value: String(a.value ?? '') }))
      : [];
    return {
      merchandiseId,
      quantity,
      ...(cleanAttrs.length > 0 ? { attributes: cleanAttrs } : {}),
      ...(sellingPlanId ? { sellingPlanId } : {}),
    };
  });

  const handleSubmit = (e: React.MouseEvent) => {
    console.log('[ADD TO CART CLICKED]', {
      url: typeof window !== 'undefined' ? window.location.href : '',
      linesCount: cleanLines.length,
      isExport,
      disabled,
      isSubmitting,
    });

    // Prevent any default browser behavior or tab opening
    e.preventDefault();
    e.stopPropagation();
    if (e.nativeEvent && typeof e.nativeEvent.stopImmediatePropagation === 'function') {
      e.nativeEvent.stopImmediatePropagation();
    }

    // Ignore middle-clicks, right-clicks, or clicks with modifier keys (Ctrl/Cmd) that browsers use to open new tabs
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      console.warn('[ADD TO CART IGNORED] Non-standard click or modifier key used.');
      return;
    }

    if (disabled || isSubmitting) {
      console.warn('[ADD TO CART IGNORED] Button is disabled or submitting.', { disabled, isSubmitting });
      return;
    }

    fireAddToCartEvent();
    if (onClick) onClick();

    const formData = new FormData();
    const cartInput = {
      action: CartForm.ACTIONS.LinesAdd,
      inputs: { lines: cleanLines },
    };
    formData.append('cartFormInput', JSON.stringify(cartInput));
    if (analytics) {
      formData.append('analytics', JSON.stringify(analytics));
    }

    console.log('[ADD TO CART SUBMITTING TO]', cartRoute);
    // Post directly to /cart (or /en/cart) to execute cart addition cleanly
    fetcher.submit(formData, { method: 'POST', action: cartRoute });

    if (onAddToCartSuccess) {
      console.log('[ADD TO CART] Executing onAddToCartSuccess callback');
      onAddToCartSuccess();
    } else if (isExport) {
      console.log('[ADD TO CART] Navigating to /export-cart');
      navigate('/export-cart');
    } else {
      console.log('[ADD TO CART] Opening cart drawer directly: open("cart")');
      open('cart');
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

