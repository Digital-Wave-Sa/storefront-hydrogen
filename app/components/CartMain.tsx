import {useOptimisticCart, Analytics, CartForm} from '@shopify/hydrogen';
import {Link, useRouteLoaderData} from 'react-router';
import {useEffect, useState, useRef} from 'react';
import type {CartApiQueryFragment} from 'storefrontapi.generated';
import {useAside} from '~/components/Aside';
import {CartLineItem, type CartLine} from '~/components/CartLineItem';
import {CartSummary} from './CartSummary';
import {Price, SaudiRiyalSymbol} from './Price';

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
  const isEn = rootData?.consent?.language?.toLowerCase() === 'en';

  const linesCount = Boolean(cart?.lines?.nodes?.length || 0);
  const cartHasItems = cart?.totalQuantity ? cart.totalQuantity > 0 : false;
  const childrenMap = getLineItemChildrenMap(cart?.lines?.nodes ?? []);

  // --- UNDO REMOVED ITEM LOGIC ---
  const prevLinesRef = useRef<CartLine[]>([]);
  const [deletedLine, setDeletedLine] = useState<CartLine | null>(null);

  // 1. Detect removals
  useEffect(() => {
    const currentLines = cart?.lines?.nodes || [];
    
    if (prevLinesRef.current.length > 0 && currentLines.length < prevLinesRef.current.length) {
      const currentIds = new Set(currentLines.map(l => l.id));
      const removedLines = prevLinesRef.current.filter(l => !currentIds.has(l.id));
      
      if (removedLines.length === 1 && !removedLines[0].isOptimistic) {
        setDeletedLine(removedLines[0]);
      }
    }

    // Clear if an item was ADDED
    if (currentLines.length > prevLinesRef.current.length) {
      setDeletedLine(null);
    }
    
    prevLinesRef.current = currentLines;
  }, [cart?.lines?.nodes]);

  // 2. Detect restoration (item comes back)
  useEffect(() => {
    const currentLines = cart?.lines?.nodes || [];
    if (deletedLine && currentLines.some(l => l.merchandise.id === deletedLine.merchandise.id)) {
      setDeletedLine(null);
    }
  }, [cart?.lines?.nodes, deletedLine]);

  // 3. Auto-hide timer
  useEffect(() => {
    if (!deletedLine) return;
    const timer = setTimeout(() => setDeletedLine(null), 6000);
    return () => clearTimeout(timer);
  }, [deletedLine]);
  // -------------------------------

  // Dynamic Delivery Threshold Logic
  const branchName = cart?.attributes?.find(a => a.key === 'Branch')?.value;
  const branchId = cart?.attributes?.find(a => a.key === 'Branch ID')?.value;
  const locations = rootData?.locations?.locations?.nodes || rootData?.locations?.nodes || [];
  
  // Try matching by ID first (more reliable), then fallback to name
  const currentBranch = locations.find((loc: any) => 
    (branchId && loc.id === branchId) || 
    (branchName && loc.name === branchName)
  );
  
  const thresholdMeta = currentBranch?.free_delivery_threshold || currentBranch?.metafields?.find((m: any) => m?.key === 'free_delivery_threshold');
  const threshold = thresholdMeta?.value ? parseFloat(thresholdMeta.value) : 430;
  const fulfillmentType = cart?.attributes?.find(a => a.key.toLowerCase().trim() === 'fulfillment type')?.value;
  const isPickup = fulfillmentType?.toLowerCase() === 'pickup';

  const subtotal = cart?.cost?.subtotalAmount?.amount ? parseFloat(cart.cost.subtotalAmount.amount) : 0;
  const progress = Math.min((subtotal / threshold) * 100, 100);
  const remaining = Math.max(threshold - subtotal, 0);
  const currencyCode = cart?.cost?.subtotalAmount?.currencyCode || 'SAR';

  if (layout === 'page') {
    return (
      <div className="max-w-[1400px] mx-auto w-full px-4 py-8 md:py-16" dir={isEn ? 'ltr' : 'rtl'}>
        <Analytics.CartView cart={cart as any} />
        <h1 className="text-4xl md:text-[56px] font-black text-[#234745] mb-12 tracking-tight">
          {isEn ? 'Cart' : 'السلة'}
        </h1>

        <div className="lg:grid lg:grid-cols-[1fr_400px] gap-8 lg:gap-16 items-start">
          {/* Left Column (Items) */}
          <div className="flex flex-col gap-4">
            {/* Free Delivery Progress (Restored) */}
            {cartHasItems && !isPickup && (
              <div className="bg-white rounded-[24px] p-6 border border-[#f0ece8] shadow-sm mb-2">
                <div className="flex justify-between items-center mb-3">
                   <p className="text-[14px] font-bold text-[#234745]">
                      {progress >= 100 ? (
                        <span className="text-green-600 flex items-center gap-1">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          {isEn ? "Free delivery unlocked!" : "لقد حصلت على توصيل مجاني!"}
                        </span>
                      ) : (
                        isEn ? (
                          <>Add <span className="text-[#d4a06a]">{currencyCode} {remaining.toFixed(2)}</span> for free delivery</>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            أضف <span className="text-[#d4a06a] mx-1">{remaining.toFixed(2)}</span> {currencyCode === 'SAR' ? <SaudiRiyalSymbol className="h-3 w-auto" /> : currencyCode} للتوصيل المجاني
                          </span>
                        )
                      )}
                   </p>
                   <span className="text-[12px] font-bold text-gray-300">{Math.round(progress)}%</span>
                </div>
                <div className="w-full h-2 bg-[#f8f5f2] rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-700 ease-out rounded-full ${progress >= 100 ? 'bg-green-500' : 'bg-[#d4a06a]'}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Pickup Info Alert */}
            {cartHasItems && isPickup && (
              <div className="bg-[#fcfaf8] rounded-[24px] p-6 border border-[#f0ece8] shadow-sm mb-2 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[#234745] shadow-sm">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                </div>
                <div>
                  <p className="text-[15px] font-black text-[#234745]">{isEn ? 'Store Pickup Selected' : 'تم اختيار الاستلام من الفرع'}</p>
                  <p className="text-[13px] text-gray-500 font-medium">{isEn ? 'No delivery fees apply for pickup orders.' : 'لا يتم تطبيق رسوم توصيل على طلبات الاستلام.'}</p>
                </div>
              </div>
            )}

            {/* Dynamic Delivery Alert (Only shows if relevant) */}
            {cartHasItems && (cart?.attributes?.find(a => a.key === 'error')?.value) && (
              <div className="bg-white rounded-2xl p-5 border border-red-100 shadow-sm flex items-start gap-4 relative animate-fade-in">
                 <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                 </div>
                 <div className="flex-1">
                    <p className="text-[14px] leading-snug text-red-600 font-medium">
                      {cart.attributes.find(a => a.key === 'error')?.value}
                    </p>
                 </div>
              </div>
            )}

            <CartEmpty hidden={linesCount} layout={layout} isEn={isEn} />
            
            {cartHasItems && (
              <ul className="flex flex-col gap-4">
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

          {/* Right Column (Summary) */}
          {cartHasItems && (
            <div className="lg:sticky lg:top-8 flex flex-col gap-6">
              <CartSummary cart={cart} layout={layout} />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ASIDE LAYOUT
  return (
    <section className="flex flex-col h-full bg-white relative" aria-label="Cart drawer" dir={isEn ? 'ltr' : 'rtl'}>
      <Analytics.CartView cart={cart as any} />
      
      {/* Progress Bar (Only show if items exist and layout is aside AND not pickup) */}
      {cartHasItems && !isPickup && (
        <div className="px-6 py-4 bg-[#fcfaf8] border-b border-[#f0ece8]">
          <p className="text-[13px] font-bold text-[#234745] mb-2 text-center">
            {progress >= 100 ? (
              <span className="text-green-600 flex items-center justify-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                {isEn ? "You've unlocked free delivery!" : "لقد حصلت على توصيل مجاني!"}
              </span>
            ) : (
              isEn ? (
                <>Add <span className="text-yellow-600">{currencyCode} {remaining.toFixed(2)}</span> more to unlock free delivery!</>
              ) : (
                <span className="inline-flex items-center gap-1">
                  أضف <span className="text-yellow-600 mx-1">{remaining.toFixed(2)}</span> {currencyCode === 'SAR' ? <SaudiRiyalSymbol className="h-3.5 w-auto" /> : currencyCode} للحصول على توصيل مجاني!
                </span>
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
        {cartHasItems && isPickup && (
          <div className="mb-6 p-4 bg-[#fcfaf8] rounded-2xl border border-[#f0ece8] flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#234745] shadow-sm shrink-0">
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
             </div>
             <div>
               <p className="text-[13px] font-black text-[#234745]">{isEn ? 'Store Pickup' : 'استلام من الفرع'}</p>
               <p className="text-[11px] text-gray-500 font-medium">{isEn ? 'No delivery fees applied' : 'لا توجد رسوم توصيل'}</p>
             </div>
          </div>
        )}
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

      {/* Undo Toast Notification */}
      {deletedLine && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 bg-[#234745] text-white px-5 py-3 rounded-xl shadow-2xl flex items-center justify-between gap-6 z-50 animate-fade-in w-[90%] max-w-[350px]">
          <div className="flex flex-col">
             <span className="text-[13px] font-bold">Item removed</span>
             <span className="text-[11px] text-gray-300 truncate max-w-[200px]">{deletedLine.merchandise.product.title}</span>
          </div>
          <CartForm
            route="/cart"
            action={CartForm.ACTIONS.LinesAdd}
            inputs={{
              lines: [
                {
                  merchandiseId: deletedLine.merchandise.id,
                  quantity: deletedLine.quantity,
                  attributes: deletedLine.attributes?.map(a => ({ key: a.key, value: a.value })) || []
                }
              ]
            }}
          >
            <button 
              type="submit" 
              onClick={() => setTimeout(() => setDeletedLine(null), 200)}
              className="text-[#d4a06a] font-black text-[13px] hover:text-white transition-colors bg-white/10 px-4 py-2 rounded-lg"
            >
              UNDO
            </button>
          </CartForm>
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
      <h3 className="text-xl font-bold text-[#234745] mb-2">{isEn ? 'Your cart is empty' : 'سلة التسوق فارغة'}</h3>
      <p className="text-[#888] text-sm mb-8 max-w-[250px]">
        {isEn ? "Looks like you haven't added anything yet, let's get you started!" : "يبدو أنك لم تقم بإضافة أي شيء بعد، دعنا نبدأ!"}
      </p>
      <button
        onClick={close}
        className="bg-[#234745] text-white font-bold py-3 px-8 rounded-full hover:bg-[#d4a06a] transition-colors"
      >
        {isEn ? 'Continue Shopping' : 'مواصلة التسوق'}
      </button>
    </div>
  );
}
