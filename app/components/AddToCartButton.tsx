import {type FetcherWithComponents, useNavigate} from 'react-router';
import {CartForm, type OptimisticCartLineInput} from '@shopify/hydrogen';
import {useAside} from './Aside';

export function AddToCartButton({
  analytics,
  children,
  disabled,
  lines,
  onClick,
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
  selectedVariant?: any;
  className?: string;
  style?: React.CSSProperties;
  /** When true: tags line with _export=true and redirects to /export-cart */
  isExport?: boolean;
}) {
  const {open} = useAside();
  const navigate = useNavigate();

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

  return (
    <CartForm 
      route="/cart" 
      inputs={{lines: exportLines}} 
      action={CartForm.ACTIONS.LinesAdd}
    >
      {(fetcher: FetcherWithComponents<any>) => (
        <>
          <input
            name="analytics"
            type="hidden"
            value={JSON.stringify(analytics)}
          />
          <button
            type="submit"
            onClick={(e) => {
              fireAddToCartEvent();
              if (onClick) onClick();
              if (isExport) {
                // Export flow: don't open cart aside, navigate to export cart
                // Small delay to let the cart mutation fire first
                setTimeout(() => navigate('/export-cart'), 100);
              } else {
                open('cart');
              }
            }}
            disabled={disabled ?? fetcher.state !== 'idle'}
            className={className}
            style={style}
          >
            {fetcher.state !== 'idle' ? (
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
        </>
      )}
    </CartForm>
  );
}

