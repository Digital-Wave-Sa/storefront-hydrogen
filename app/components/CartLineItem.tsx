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
  const {product, title, image, selectedOptions} = merchandise;
  const lineItemUrl = useVariantUrl(product.handle, selectedOptions);
  const {close} = useAside();
  const lineItemChildren = childrenMap[id];
  const childrenLabelId = `cart-line-children-${id}`;
  const rootData = useRouteLoaderData('root') as any;
  const isEn = rootData?.locale === 'en';

  // Filter out default title option
  const validOptions = selectedOptions.filter((opt) => opt.value !== 'Default Title');

  return (
    <li key={id} className="group flex flex-col gap-3 p-4 bg-white border border-[#f0ece8] rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:border-[#d4a06a] transition-colors relative">
      <div className="flex items-start gap-4">
        {/* Product Image */}
        <Link
          prefetch="intent"
          to={lineItemUrl}
          onClick={() => {
            if (layout === 'aside') close();
          }}
          className="flex-shrink-0 w-[85px] h-[85px] bg-[#fcfaf8] rounded-xl overflow-hidden border border-[#f0ece8]"
        >
          {image ? (
            <Image
              alt={title}
              aspectRatio="1/1"
              data={image}
              height={85}
              loading="lazy"
              width={85}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
            </div>
          )}
        </Link>

        {/* Product Details */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex justify-between items-start gap-2 mb-1">
            <Link
              prefetch="intent"
              to={lineItemUrl}
              onClick={() => {
                if (layout === 'aside') close();
              }}
              className="truncate flex-1"
            >
              <h4 className="font-bold text-[15px] text-[#1b3d2e] truncate">{product.title}</h4>
            </Link>
            
            {/* Remove Button */}
            <CartLineRemoveButton lineIds={[id]} disabled={!!line.isOptimistic} />
          </div>

          <div className="text-[14px] font-black text-[#1b3d2e] mb-2">
             <ProductPrice price={line?.cost?.totalAmount} />
          </div>

          {/* Variants */}
          {validOptions.length > 0 && (
            <ul className="flex flex-wrap gap-2 mb-3">
              {validOptions.map((option) => (
                <li key={option.name} className="text-[11px] bg-[#fcfaf8] border border-[#f0ece8] text-[#888] px-2 py-0.5 rounded-md">
                  {option.value}
                </li>
              ))}
            </ul>
          )}

          {/* Quantity Controls */}
          <div className="mt-auto flex justify-end">
             <CartLineQuantity line={line} />
          </div>
        </div>
      </div>

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
    <div className="flex items-center gap-3 bg-[#fcfaf8] border border-[#f0ece8] rounded-full p-1 w-fit">
      <CartLineUpdateButton lines={[{id: lineId, quantity: prevQuantity}]}>
        <button
          aria-label="Decrease quantity"
          disabled={quantity <= 1 || !!isOptimistic}
          name="decrease-quantity"
          value={prevQuantity}
          className="w-7 h-7 flex items-center justify-center rounded-full text-[#1b3d2e] bg-white border border-[#f0ece8] hover:bg-[#1b3d2e] hover:text-white hover:border-[#1b3d2e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        </button>
      </CartLineUpdateButton>
      
      <span className="font-bold text-[14px] text-[#1b3d2e] min-w-[20px] text-center select-none">
        {quantity}
      </span>

      <CartLineUpdateButton lines={[{id: lineId, quantity: nextQuantity}]}>
        <button
          aria-label="Increase quantity"
          name="increase-quantity"
          value={nextQuantity}
          disabled={!!isOptimistic}
          className="w-7 h-7 flex items-center justify-center rounded-full text-[#1b3d2e] bg-white border border-[#f0ece8] hover:bg-[#1b3d2e] hover:text-white hover:border-[#1b3d2e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
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
      fetcherKey={getUpdateKey(lineIds)}
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
