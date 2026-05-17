import type {CartLineUpdateInput} from '@shopify/hydrogen/storefront-api-types';
import type {CartLayout, LineItemChildrenMap} from '~/components/CartMain';
import {CartForm, Image, type OptimisticCartLine} from '@shopify/hydrogen';
import {useVariantUrl} from '~/lib/variants';
import {Link, useRouteLoaderData} from 'react-router';
import {ProductPrice} from './ProductPrice';
import {useAside} from './Aside';
import type {
  CartApiQueryFragment,
  CartLineFragment,
} from 'storefrontapi.generated';
import {SaudiRiyalSymbol} from './Price';

export type CartLine = OptimisticCartLine<CartApiQueryFragment>;

export function CartLineItem({
  layout,
  line,
  childrenMap,
}: {
  layout: CartLayout;
  line: CartLine;
  childrenMap: LineItemChildrenMap;
}) {
  const {id, merchandise} = line;
  const {product, title, image, selectedOptions} = merchandise || {};
  const lineItemUrl = product?.handle ? useVariantUrl(product.handle, selectedOptions) : '#';
  const {close} = useAside();
  const lineItemChildren = childrenMap[id];
  const childrenLabelId = `cart-line-children-${id}`;
  const rootData = useRouteLoaderData('root') as any;
  const isEn = rootData?.consent?.language?.toLowerCase() === 'en';
  const isFreeItem = line.attributes?.some((attr: any) => attr.key === '_is_free' && attr.value === 'true') || false;

  // Filter out default title option
  const validOptions = selectedOptions?.filter((opt: any) => opt.value !== 'Default Title') || [];

  // OUT OF STOCK LAYOUT
  if (merchandise?.availableForSale === false) {
    return (
      <li key={id} className="py-6 border-b border-gray-200 last:border-0">
        <div className="border border-[#F2A3A3] rounded-xl bg-[#FDF8F8] p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-[#1a1a1a] font-black text-[16px]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#DF4646" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            {product?.title || title}
            <span className="text-[#DF4646] font-bold text-[14px] ml-2">
              {isEn ? 'No longer available' : 'لم يعد متاحاً'}
            </span>
          </div>
          <p className="text-gray-500 font-bold text-[13px]">
            {isEn ? 'This product is out of stock. You can remove it or replace it.' : 'نفد هذا المنتج. يمكنك إزالته أو استبداله ببديل.'}
          </p>
          <div className="flex items-center gap-3 mt-2">
             <CartLineRemoveButton lineIds={[id]} disabled={!!line.isOptimistic} isOosButton isEn={isEn} />
             <button className="px-6 py-2.5 rounded-full border border-gray-300 bg-[#FEF8EB] text-[#1a1a1a] font-bold text-[13px] hover:bg-[#f5eeda] transition-colors">
               {isEn ? 'Show alternatives' : 'عرض البدائل'}
             </button>
          </div>
        </div>
      </li>
    );
  }

  // NORMAL LAYOUT
  return (
    <li key={id} className={`group flex flex-col ${layout === 'aside' ? 'p-4 border-b border-gray-100 bg-white' : 'py-6 border-b border-gray-200 last:border-0'} relative`}>
      <div className={`flex ${layout === 'aside' ? 'items-start gap-4' : 'items-start gap-6 w-full'}`}>
        
        {/* Product Image */}
        <Link
          prefetch="intent"
          to={lineItemUrl}
          onClick={() => {
            if (layout === 'aside') close();
          }}
          className={`flex-shrink-0 ${layout === 'aside' ? 'w-[80px] h-[80px]' : 'w-[120px] h-[120px]'} bg-[#f8f5f2] rounded-2xl overflow-hidden`}
        >
          {image ? (
            <Image
              alt={title}
              aspectRatio="1/1"
              data={image}
              height={120}
              loading="lazy"
              width={120}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
            </div>
          )}
        </Link>

        {/* Info Column */}
        <div className={`flex-1 min-w-0 ${isEn ? 'text-left' : 'text-right'}`}>
           <span className="text-[13px] font-bold text-[#A67B5B] block mb-1" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
             {product?.vendor || (isEn ? 'Saadeddin' : 'الكيك المخصص')}
           </span>
           <h4 className="font-bold text-[18px] md:text-[20px] text-[#1a1a1a] line-clamp-2 leading-tight mb-2" style={{ fontFamily: "'Bahij Janna', sans-serif" }}>
             {product?.title || title}
           </h4>
           
           {/* Options / Tags */}
           {validOptions.length > 0 && (
             <div className="flex flex-wrap items-center gap-2 justify-start">
               {validOptions.map((o: any) => (
                 <span key={o.name} className="px-4 py-1.5 border border-[#E9EBD8] text-[#8C9368] rounded-full text-[13px] font-bold">
                   {isEn ? `${o.name} : ${o.value}` : `${o.name === 'Size' ? 'حجم' : o.name} : ${o.value}`}
                 </span>
               ))}
             </div>
           )}

           {/* Action Links (Desktop) */}
           {layout !== 'aside' && (
             <div className="flex items-center gap-6 mt-3 justify-start">
                <div className="flex items-center gap-1.5 text-[#c1c1c1] hover:text-red-500 transition-colors">
                   <CartLineRemoveButton lineIds={[id]} disabled={!!line.isOptimistic} isText isEn={isEn} />
                </div>
                <button className="flex items-center gap-1.5 text-[#A67B5B] hover:text-[#8e694e] text-[13px] font-bold transition-colors">
                   <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg>
                   {isEn ? 'Make it a gift' : 'إجعلها هدية'}
                </button>
             </div>
           )}
        </div>

        {/* Price & Quantity Column */}
        <div className={`flex flex-col gap-4 shrink-0 ${layout === 'aside' ? 'items-end' : 'items-end w-auto'}`}>
           <div className="flex flex-col items-end">
              {isFreeItem ? (
                <>
                  <div className="relative mb-1">
                    <span className="text-gray-400 text-[13px] font-bold flex items-center gap-1 flex-row-reverse" style={{ fontFamily: "'Outfit', sans-serif" }}>
                      <SaudiRiyalSymbol className="w-[14px] h-auto text-gray-400" />
                      <span>{parseFloat(merchandise?.price?.amount || '0').toFixed(2)}</span>
                    </span>
                    <div className="absolute top-1/2 left-0 right-0 h-[1.5px] bg-gray-400 -translate-y-1/2" />
                  </div>
                  <div className="text-emerald-600 font-extrabold text-[16px] md:text-[20px] uppercase flex items-center gap-1" style={{ fontFamily: "'Bahij Janna', sans-serif" }}>
                    {isEn ? 'FREE' : 'مجاناً'}
                  </div>
                </>
              ) : (
                <>
                  {line?.cost?.compareAtAmountPerQuantity && (
                    <div className="relative mb-1">
                      <span className="text-gray-400 text-[13px] font-bold flex items-center gap-1 flex-row-reverse" style={{ fontFamily: "'Outfit', sans-serif" }}>
                        <SaudiRiyalSymbol className="w-[14px] h-auto text-gray-400" />
                        <span>{parseFloat(line.cost.compareAtAmountPerQuantity.amount).toFixed(2)}</span>
                      </span>
                      <div className="absolute top-1/2 left-0 right-0 h-[1.5px] bg-gray-400 -translate-y-1/2" />
                    </div>
                  )}
                  <div className={`font-black text-[#234745] font-en flex items-center gap-1.5 flex-row-reverse ${layout === 'aside' ? 'text-[16px]' : 'text-[24px]'}`} style={{ fontFamily: "'Outfit', sans-serif" }}>
                    <SaudiRiyalSymbol className="w-[22px] h-auto text-[#234745]" />
                    <span>{parseFloat(line?.cost?.totalAmount?.amount || '0').toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>

           {/* Quantity Column */}
           {layout !== 'aside' && (
             <div className="flex items-center gap-4 w-full justify-end">
                <span className="text-[16px] font-bold text-[#1a1a1a]">{isEn ? 'Quantity' : 'الكمية'}</span>
                <div dir="ltr">
                  <CartLineQuantity line={line} />
                </div>
             </div>
           )}
           {/* Aside Layout Delete Button */}
           {layout === 'aside' && (
              <div className="mt-2 w-full flex justify-end">
                <CartLineRemoveButton lineIds={[id]} disabled={!!line.isOptimistic} isEn={isEn} />
              </div>
           )}
        </div>

      </div>
    </li>
  );
}

function CartLineQuantity({line}: {line: CartLine}) {
  if (!line || typeof line?.quantity === 'undefined') return null;
  const {id: lineId, quantity, isOptimistic} = line;
  const prevQuantity = Number(Math.max(0, quantity - 1).toFixed(0));
  const nextQuantity = Number((quantity + 1).toFixed(0));

  return (
    <div className="flex items-center gap-2">
      {quantity <= 1 ? (
        <CartLineRemoveButton lineIds={[lineId]} disabled={!!isOptimistic} isBox isEn={line.cost?.totalAmount?.currencyCode === 'USD'} />
      ) : (
        <CartLineUpdateButton lines={[{id: lineId, quantity: prevQuantity}]}>
          <button
            aria-label="Decrease quantity"
            disabled={!!isOptimistic}
            name="decrease-quantity"
            value={prevQuantity}
            className="w-10 h-10 flex items-center justify-center bg-white rounded-lg text-[#A67B5B] border border-[#E9EBD8] hover:border-[#234745] transition-all"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </CartLineUpdateButton>
      )}
      
      <div className="w-10 h-10 flex items-center justify-center bg-white rounded-lg border border-[#E9EBD8] font-bold text-[16px] text-[#1a1a1a]" style={{ fontFamily: "'Outfit', sans-serif" }}>
        {quantity}
      </div>

      <CartLineUpdateButton lines={[{id: lineId, quantity: nextQuantity}]}>
        <button
          aria-label="Increase quantity"
          name="increase-quantity"
          value={nextQuantity}
          disabled={!!isOptimistic}
          className="w-10 h-10 flex items-center justify-center bg-white rounded-lg text-[#234745] border border-[#E9EBD8] hover:border-[#234745] transition-all"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </CartLineUpdateButton>
    </div>
  );
}

function CartLineRemoveButton({
  lineIds,
  disabled,
  isText,
  isBox,
  isOosButton,
  isEn
}: {
  lineIds: string[];
  disabled: boolean;
  isText?: boolean;
  isBox?: boolean;
  isOosButton?: boolean;
  isEn?: boolean;
}) {
  return (
    <CartForm
      fetcherKey={getRemoveKey(lineIds)}
      route="/cart"
      action={CartForm.ACTIONS.LinesRemove}
      inputs={{lineIds}}
    >
      {isOosButton ? (
        <button 
          disabled={disabled} 
          type="submit"
          className="px-8 py-2.5 rounded-full border border-[#DF4646] text-[#DF4646] bg-transparent font-bold text-[14px] hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {isEn ? 'Remove from cart' : 'إزالة من السلة'}
        </button>
      ) : isText ? (
        <button 
          disabled={disabled} 
          type="submit"
          className="flex items-center gap-1.5 text-[#c1c1c1] hover:text-red-500 text-[13px] font-bold transition-colors"
          aria-label="Remove item"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          {isEn ? 'Delete' : 'حذف'}
        </button>
      ) : isBox ? (
        <button 
          disabled={disabled} 
          type="submit"
          className="w-10 h-10 flex items-center justify-center bg-white rounded-lg text-[#A67B5B] border border-gray-200 hover:border-[#234745] transition-all"
          aria-label="Remove item"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14" /></svg>
        </button>
      ) : (
        <button 
          disabled={disabled} 
          type="submit"
          className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed p-1"
          aria-label="Remove item"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        </button>
      )}
    </CartForm>
  );
}

function CartLineUpdateButton({
  children,
  lines,
}: {
  children: React.ReactNode;
  lines: CartLineUpdateInput[];
}) {
  const lineIds = lines.map((line) => line.id);

  return (
    <CartForm
      fetcherKey={getUpdateKey(lineIds)}
      route="/cart"
      action={CartForm.ACTIONS.LinesUpdate}
      inputs={{lines}}
    >
      {children}
    </CartForm>
  );
}

function getUpdateKey(lineIds: string[]) {
  return [CartForm.ACTIONS.LinesUpdate, ...lineIds].join('-');
}

function getRemoveKey(lineIds: string[]) {
  return [CartForm.ACTIONS.LinesRemove, ...lineIds].join('-');
}
