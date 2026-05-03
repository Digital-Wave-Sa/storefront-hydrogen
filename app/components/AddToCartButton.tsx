import {type FetcherWithComponents} from 'react-router';
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
}: {
  analytics?: unknown;
  children: React.ReactNode;
  disabled?: boolean;
  lines: Array<OptimisticCartLineInput>;
  onClick?: () => void;
  selectedVariant?: any;
  className?: string;
}) {
  const {open} = useAside();

  return (
    <CartForm 
      route="/cart" 
      inputs={{lines}} 
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
              if (onClick) onClick();
              open('cart');
            }}
            disabled={disabled ?? fetcher.state !== 'idle'}
            className={className}
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
