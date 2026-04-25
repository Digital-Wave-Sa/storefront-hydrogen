import {useOptimisticCart} from '@shopify/hydrogen';
import {Link, useRouteLoaderData} from 'react-router';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import {useAside} from '~/components/Aside';
import {CartLineItem, type CartLine} from '~/components/CartLineItem';
import {CartSummary} from './CartSummary';

export type CartLayout = 'page' | 'aside';

export type CartMainProps = {
  cart: CartApiQueryFragment | null;
  layout: CartLayout;
};

export type LineItemChildrenMap = {[parentId: string]: CartLine[]};
/** Returns a map of all line items and their children. */
function getLineItemChildrenMap(lines: CartLine[]): LineItemChildrenMap {
  const children: LineItemChildrenMap = {};
  for (const line of lines) {
    if ('parentRelationship' in line && line.parentRelationship?.parent) {
      const parentId = line.parentRelationship.parent.id;
      if (!children[parentId]) children[parentId] = [];
      children[parentId].push(line);
    }
    if ('lineComponents' in line) {
      const childrenMap = getLineItemChildrenMap(line.lineComponents);
      for (const [parentId, childIds] of Object.entries(childrenMap)) {
        if (!children[parentId]) children[parentId] = [];
        children[parentId].push(...childIds);
      }
    }
  }
  return children;
}

export function CartMain({layout, cart: originalCart}: CartMainProps) {
  const cart = useOptimisticCart(originalCart);
  const rootData = useRouteLoaderData('root') as any;
  const isEn = rootData?.locale === 'en';

  const linesCount = Boolean(cart?.lines?.nodes?.length || 0);
  const cartHasItems = cart?.totalQuantity ? cart.totalQuantity > 0 : false;
  const childrenMap = getLineItemChildrenMap(cart?.lines?.nodes ?? []);

  // Delivery Threshold Logic
  const subtotal = cart?.cost?.subtotalAmount?.amount ? parseFloat(cart.cost.subtotalAmount.amount) : 0;
  const threshold = 430; // Could be dynamic from branch
  const progress = Math.min((subtotal / threshold) * 100, 100);
  const remaining = threshold - subtotal;

  return (
    <section className="flex flex-col h-full bg-white relative" aria-label={layout === 'page' ? 'Cart page' : 'Cart drawer'} dir={isEn ? 'ltr' : 'rtl'}>
      
      {/* Progress Bar (Only show if items exist and layout is aside) */}
      {cartHasItems && layout === 'aside' && (
        <div className="px-6 py-4 bg-[#fcfaf8] border-b border-[#f0ece8]">
          <p className="text-[13px] font-bold text-[#1b3d2e] mb-2 text-center">
            {progress >= 100 ? (
              <span className="text-green-600 flex items-center justify-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                {isEn ? "You've unlocked free delivery!" : "لقد حصلت على توصيل مجاني!"}
              </span>
            ) : (
              isEn ? (
                <>Add <span className="text-yellow-600">SAR {remaining.toFixed(2)}</span> more to unlock free delivery!</>
              ) : (
                <>أضف <span className="text-yellow-600">{remaining.toFixed(2)} ر.س</span> للحصول على توصيل مجاني!</>
              )
            )}
          </p>
          <div className="w-full h-1.5 bg-[#e8e4e1] rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ease-out rounded-full ${progress >= 100 ? 'bg-green-500' : 'bg-yellow-500'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Cart Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
        <CartEmpty hidden={linesCount} layout={layout} isEn={isEn} />
        
        {cartHasItems && (
          <ul className="flex flex-col gap-5">
            {(cart?.lines?.nodes ?? []).map((line) => {
              if ('parentRelationship' in line && line.parentRelationship?.parent) return null;
              return (
                <CartLineItem
                  key={line.id}
                  line={line}
                  layout={layout}
                  childrenMap={childrenMap}
                />
              );
            })}
          </ul>
        )}
      </div>

      {/* Cart Summary Footer */}
      {cartHasItems && (
        <div className="mt-auto bg-white border-t border-[#f0ece8] p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
          <CartSummary cart={cart} layout={layout} />
        </div>
      )}
    </section>
  );
}

function CartEmpty({hidden = false, layout, isEn}: {hidden: boolean; layout?: CartMainProps['layout']; isEn?: boolean}) {
  const {close} = useAside();
  return (
    <div hidden={hidden} className="flex flex-col items-center justify-center h-full text-center py-10">
      <div className="w-24 h-24 mb-6 rounded-full bg-[#fcfaf8] flex items-center justify-center border border-[#f0ece8]">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d4a06a" strokeWidth="1.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" /></svg>
      </div>
      <h3 className="text-xl font-bold text-[#1b3d2e] mb-2">{isEn ? 'Your cart is empty' : 'سلة التسوق فارغة'}</h3>
      <p className="text-[#888] text-sm mb-8 max-w-[250px]">
        {isEn ? "Looks like you haven't added anything yet, let's get you started!" : "يبدو أنك لم تقم بإضافة أي شيء بعد، دعنا نبدأ!"}
      </p>
      <button
        onClick={close}
        className="bg-[#1b3d2e] text-white font-bold py-3 px-8 rounded-full hover:bg-[#d4a06a] transition-colors"
      >
        {isEn ? 'Continue Shopping' : 'مواصلة التسوق'}
      </button>
    </div>
  );
}
