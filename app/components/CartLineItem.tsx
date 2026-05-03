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

  // Filter out default title option
  const validOptions = selectedOptions?.filter((opt: any) => opt.value !== 'Default Title') || [];

  return (
    <li key={id} className={`group flex flex-col gap-3 ${layout === 'aside' ? 'p-4' : 'p-6 md:p-8'} bg-white rounded-[24px] shadow-[0_2px_15px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_25px_rgba(0,0,0,0.06)] transition-all relative overflow-hidden`}>
      <div className={`flex ${layout === 'aside' ? 'items-start gap-4' : 'items-center gap-6'}`}>
        {/* Product Image */}
        <Link
          prefetch="intent"
          to={lineItemUrl}
          onClick={() => {
            if (layout === 'aside') close();
          }}
          className={`flex-shrink-0 ${layout === 'aside' ? 'w-[80px] h-[80px]' : 'w-[100px] h-[100px] md:w-[120px] md:h-[120px]'} bg-[#f8f5f2] rounded-2xl overflow-hidden`}
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

        {/* Product Details & Controls */}
        <div className={`flex-1 flex flex-col ${layout === 'aside' ? 'gap-2' : 'md:flex-row md:items-center justify-between gap-4'} min-w-0`}>
          <div className="min-w-0">
            <h4 className={`font-bold ${layout === 'aside' ? 'text-[15px]' : 'text-[18px] md:text-[20px]'} text-[#1b3d2e] mb-1 line-clamp-2 leading-snug`}>
              {product?.title || title}
              {product?.tags?.some((tag: string) => ['express', 'express-delivery'].includes(tag.toLowerCase())) && (
                <span className="inline-flex items-center gap-1 ml-2 text-[10px] text-[#004f59] font-medium shrink-0">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </span>
              )}
            </h4>
            
            {/* Options */}
            {validOptions.length > 0 && (
              <p className={`text-[12px] text-gray-400 font-medium ${layout === 'aside' ? 'mb-2' : 'mb-4'}`}>
                {validOptions.map(o => o.value).join(' / ')}
              </p>
            )}

            {/* Quantity Pill - On Desktop/Page layout it's here, on Aside it's grouped with price below */}
            {layout !== 'aside' && (
              <div className="flex items-center gap-4">
                 <CartLineQuantity line={line} />
              </div>
            )}
          </div>

          <div className={`flex items-center gap-4 ${layout === 'aside' ? 'justify-between mt-1' : 'justify-between md:justify-end'}`}>
            {layout === 'aside' && (
               <CartLineQuantity line={line} />
            )}

            <div className={`font-black text-[#1b3d2e] font-en ${layout === 'aside' ? 'text-[16px]' : 'text-[18px] md:text-[22px]'}`}>
               <ProductPrice price={line?.cost?.totalAmount} />
            </div>
            
            {layout === 'aside' ? (
              <div className="absolute top-2 right-2">
                <CartLineRemoveButton lineIds={[id]} disabled={!!line.isOptimistic} />
              </div>
            ) : (
              <CartLineRemoveButton lineIds={[id]} disabled={!!line.isOptimistic} />
            )}
          </div>
        </div>
      </div>

      {/* Attributes/Gift Message */}
      {(line as any).attributes?.filter((attr: any) => !attr.key.startsWith('_') && attr.value).map((attr: any) => (
        <div key={attr.key} className="mt-4 pt-4 border-t border-[#f8f5f2] flex items-start gap-3">
          <span className="text-lg">🎁</span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-[#d4a06a] uppercase tracking-wider">{attr.key}</p>
            <p className="text-[13px] text-[#1b3d2e] font-medium leading-relaxed">{attr.value}</p>
          </div>
        </div>
      ))}


      {/* Children Items (e.g. warranties) */}
      {lineItemChildren ? (
        <div className="pt-3 border-t border-dashed border-[#f0ece8] mt-1">
          <p id={childrenLabelId} className="sr-only">
            Line items with {product.title}
          </p>
          <ul aria-labelledby={childrenLabelId} className="flex flex-col gap-2">
            {lineItemChildren.map((childLine) => (
              <CartLineItem
                childrenMap={childrenMap}
                key={childLine.id}
                line={childLine}
                layout={layout}
              />
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  );
}

function CartLineQuantity({line}: {line: CartLine}) {
  if (!line || typeof line?.quantity === 'undefined') return null;
  const {id: lineId, quantity, isOptimistic} = line;
  const prevQuantity = Number(Math.max(0, quantity - 1).toFixed(0));
  const nextQuantity = Number((quantity + 1).toFixed(0));

  return (
    <div className="flex items-center gap-1 bg-white border border-[#f0ece8] rounded-full p-1 shadow-sm h-[44px]">
      {quantity <= 1 ? (
        <CartLineRemoveButton lineIds={[lineId]} disabled={!!isOptimistic} />
      ) : (
        <CartLineUpdateButton lines={[{id: lineId, quantity: prevQuantity}]}>
          <button
            aria-label="Decrease quantity"
            disabled={!!isOptimistic}
            name="decrease-quantity"
            value={prevQuantity}
            className="w-9 h-9 flex items-center justify-center rounded-full text-[#1b3d2e] hover:bg-[#f8f5f2] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
        </CartLineUpdateButton>
      )}
      
      <span className="font-bold text-[15px] text-[#1b3d2e] min-w-[32px] text-center select-none px-1">
        {quantity}
      </span>

      <CartLineUpdateButton lines={[{id: lineId, quantity: nextQuantity}]}>
        <button
          aria-label="Increase quantity"
          name="increase-quantity"
          value={nextQuantity}
          disabled={!!isOptimistic}
          className="w-9 h-9 flex items-center justify-center rounded-full text-[#1b3d2e] hover:bg-[#f8f5f2] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
      </CartLineUpdateButton>
    </div>
  );
}

function CartLineRemoveButton({
  lineIds,
  disabled,
}: {
  lineIds: string[];
  disabled: boolean;
}) {
  return (
    <CartForm
      fetcherKey={getRemoveKey(lineIds)}
      route="/cart"
      action={CartForm.ACTIONS.LinesRemove}
      inputs={{lineIds}}
    >
      <button 
        disabled={disabled} 
        type="submit"
        className="text-[#bbb] hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed p-1"
        aria-label="Remove item"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
      </button>
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
