import type { CartLineUpdateInput } from '@shopify/hydrogen/storefront-api-types';
import type { CartLayout, LineItemChildrenMap } from '~/components/CartMain';
import { CartForm, Image, type OptimisticCartLine } from '@shopify/hydrogen';
import { useVariantUrl } from '~/lib/variants';
import { Link, useRouteLoaderData } from 'react-router';
import { useState, useEffect } from 'react';
import { ProductPrice } from './ProductPrice';
import { useAside } from './Aside';
import type {
  CartApiQueryFragment,
  CartLineFragment,
} from 'storefrontapi.generated';
import { SaudiRiyalSymbol } from './Price';

export type CartLine = OptimisticCartLine<CartApiQueryFragment>;

export function CartLineItem({
  layout,
  line,
  childrenMap,
  cart,
}: {
  layout: CartLayout;
  line: CartLine;
  childrenMap: LineItemChildrenMap;
  cart?: any;
}) {
  const { id, merchandise } = line;
  const { product, title, image, selectedOptions } = merchandise || {};
  const lineItemUrl = product?.handle ? useVariantUrl(product.handle, selectedOptions) : '#';
  const { close } = useAside();
  const lineItemChildren = childrenMap[id];
  const childrenLabelId = `cart-line-children-${id}`;
  const rootData = useRouteLoaderData('root') as any;
  const isEn = rootData?.consent?.language?.toLowerCase() === 'en';
  const isFreeItem = line.attributes?.some((attr: any) => attr.key === '_is_free' && attr.value === 'true') || false;

  // Filter out default title option
  const validOptions = selectedOptions?.filter((opt: any) => opt.value !== 'Default Title') || [];

  // Check branch specific availability
  const branchName = cart?.attributes?.find((a: any) => a.key === 'Branch')?.value;
  const branchId = cart?.attributes?.find((a: any) => a.key === 'Branch ID')?.value;
  const locations = rootData?.locations?.locations?.nodes || rootData?.locations?.nodes || [];

  const currentBranch = locations.find((loc: any) =>
    (branchId && (loc.id === branchId || loc.id.split('/').pop() === String(branchId).split('/').pop())) ||
    (branchName && loc.name?.trim().toLowerCase() === branchName?.trim().toLowerCase())
  );

  let isOutOfStock = merchandise?.availableForSale === false;
  if (line.isOptimistic) {
    isOutOfStock = false;
  }

  // NORMAL LAYOUT
  return (
    <li key={id} className={`group flex flex-col ${layout === 'aside' ? 'p-4 border-b border-gray-100 bg-white' : 'py-6 border-b border-gray-200 last:border-0'} relative gap-4`}>
      {/* 1. Desktop Layout (hidden on mobile screen sizes for main page cart) */}
      <div className={`${layout === 'aside' ? 'hidden' : 'hidden md:flex'} items-center gap-6 w-full ${isOutOfStock ? 'opacity-40 pointer-events-none select-none' : ''} transition-opacity`}>

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
            <img
              src="/images/placeholder/sample.png"
              alt={title || ''}
              className="w-full h-full object-cover"
            />
          )}
        </Link>

        {/* Info Column */}
        <div className={`flex-1 min-w-0 ${isEn ? 'text-left' : 'text-right'}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[12px] font-bold text-[#906B51]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
              {product?.vendor || (isEn ? 'Saadeddin' : 'الكيك المخصص')}
            </span>
            {(() => {
              const isPreorder = product?.tags?.some((t: string) => t.toLowerCase() === 'pre-order') || line.attributes?.some((a: any) => a.key === '_is_preorder' && a.value === 'true');
              if (isPreorder) {
                return (
                  <span className="px-2 py-0.5 bg-[#FEF8EB] text-[#A67B5B] border border-[#A67B5B]/30 rounded text-[11px] font-bold uppercase tracking-wide">
                    {isEn ? 'Pre-order' : 'طلب مسبق'}
                  </span>
                );
              }
              return null;
            })()}
          </div>

          <h4 className="font-bold text-[16px] text-[#1a1a1a] line-clamp-2 leading-tight mb-2" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
            {product?.title || title}
          </h4>

          {(() => {
            const preorderDate = line.attributes?.find((a: any) => a.key === 'Pre-order Date' || a.key === 'Availability Date')?.value;
            if (preorderDate) {
              return (
                <div className="text-[13px] text-amber-600 font-bold mb-2 flex items-center gap-1.5" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  {isEn ? `Available: ${preorderDate}` : `متاح: ${preorderDate}`}
                </div>
              );
            }
            return null;
          })()}

          {/* Options / Tags & Custom Attributes */}
          {(validOptions.length > 0 || (line.attributes?.filter((a: any) => a.value && !a.key.startsWith('_')).length || 0) > 0) && (
            <div className="flex flex-wrap items-center gap-2 justify-start mt-2">
              {validOptions.map((o: any) => (
                <span key={o.name} className="px-3 py-1 border border-[#E9EBD8] text-[#8C9368] rounded-full text-[12px] font-bold">
                  {isEn ? `${o.name}: ${o.value}` : `${o.name === 'Size' ? 'حجم' : o.name}: ${o.value}`}
                </span>
              ))}
              {line.attributes
                ?.filter((a: any) => a.value && !a.key.startsWith('_'))
                .map((a: any) => {
                  const isCakeMsg = a.key === 'Cake Message';
                  const isGiftMsg = a.key === 'Gift Message';
                  const isRecipient = a.key === 'Recipient Name';
                  const isNote = a.key === 'Order Note';

                  let keyName = a.key;
                  if (!isEn) {
                    if (isCakeMsg) keyName = 'كتابة على الكيكة';
                    else if (isGiftMsg) keyName = 'رسالة إهداء';
                    else if (isRecipient) keyName = 'اسم المستلم';
                    else if (isNote) keyName = 'ملاحظة الطلب';
                  }

                  const displayVal = a.value.length > 25 ? `${a.value.substring(0, 25)}...` : a.value;
                  return (
                    <span key={a.key} title={a.value} className="px-3 py-1 bg-[#FEF8EB] border border-[#A67B5B]/30 text-[#A67B5B] rounded-full text-[12px] font-bold truncate max-w-full">
                      {keyName}: {displayVal}
                    </span>
                  );
                })
              }
            </div>
          )}
          {(() => {
            const isPrepaidOnly = product?.tags?.some((t: string) => {
              const lowerTag = t.toLowerCase();
              return lowerTag === 'prepaid-only' || lowerTag === 'nocod';
            });
            if (isPrepaidOnly) {
              return (
                <div className="flex items-start gap-1.5 mt-2 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-lg w-fit">
                  <svg className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="text-orange-800 text-[11px] font-bold leading-tight mt-0.5">
                    {isEn ? 'Requires Prepaid Online Payment' : 'يتطلب دفع مسبق إلكتروني'}
                  </span>
                </div>
              );
            }
            return null;
          })()}

          {/* Action Links (Desktop) */}
          {layout !== 'aside' && (
            <div className="flex items-center gap-6 mt-3 justify-start">
              <div className="flex items-center gap-1.5 text-[#c1c1c1] hover:text-red-500 transition-colors">
                <CartLineRemoveButton lineIds={[id]} disabled={!!line.isOptimistic} isText isEn={isEn} />
              </div>
              {(() => {
                const isGiftable = product?.tags?.some((t: string) => {
                  const lowerTag = t.toLowerCase();
                  return lowerTag.includes('gift') || lowerTag.includes('mother') || lowerTag.includes('father') || lowerTag.includes('friend') || lowerTag.includes('grad');
                }) ?? false;

                return isGiftable ? (
                  <CartLineGiftForm line={line} isEn={isEn} />
                ) : null;
              })()}
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
                <div className="text-emerald-600 font-extrabold text-[16px] md:text-[20px] uppercase flex items-center gap-1" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}>
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

      {/* 2. Mobile/Aside Layout */}
      <div className={`${layout === 'aside' ? 'flex' : 'flex md:hidden'} flex-col w-full gap-4 ${isOutOfStock ? 'opacity-40 pointer-events-none select-none' : ''} transition-opacity`}>
        {/* Top Section: Image on one side, Info on the opposite side */}
        <div className="flex items-start gap-4 w-full">
          {/* Image */}
          <Link
            prefetch="intent"
            to={lineItemUrl}
            onClick={() => {
              if (layout === 'aside') close();
            }}
            className="flex-shrink-0 w-[90px] h-[90px] bg-[#f8f5f2] rounded-2xl overflow-hidden"
          >
            {image ? (
              <Image
                alt={title}
                aspectRatio="1/1"
                data={image}
                height={90}
                loading="lazy"
                width={90}
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src="/images/placeholder/sample.png"
                alt={title || ''}
                className="w-full h-full object-cover"
              />
            )}
          </Link>

          {/* Details */}
          <div className={`flex-1 min-w-0 ${isEn ? 'text-left' : 'text-right'}`}>
            <span className="text-[12px] font-bold text-[#A67B5B] block mb-1" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
              {product?.vendor || (isEn ? 'Saadeddin' : 'الكيك المخصص')}
            </span>
            <h4 className="font-bold text-[15px] text-[#1a1a1a] mb-1.5 leading-snug line-clamp-2" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}>
              {product?.title || title}
            </h4>

            {/* Options */}
            {(validOptions.length > 0 || (line.attributes?.filter((a: any) => a.value && !a.key.startsWith('_')).length || 0) > 0) && (
              <div className={`flex flex-wrap gap-1.5 mb-3 ${isEn ? 'justify-start' : 'justify-start'}`}>
                {validOptions.map((o: any) => (
                  <span key={o.name} className="px-2.5 py-0.5 bg-white border border-[#BBCFCD]/40 text-[#8B8B8B] rounded-full text-[11px] font-bold">
                    {isEn ? `${o.name}: ${o.value}` : `${o.name === 'Size' ? 'حجم' : o.name}: ${o.value}`}
                  </span>
                ))}
                {line.attributes
                  ?.filter((a: any) => a.value && !a.key.startsWith('_'))
                  .map((a: any) => {
                    const isCakeMsg = a.key === 'Cake Message';
                    const isGiftMsg = a.key === 'Gift Message';
                    const isRecipient = a.key === 'Recipient Name';
                    const isNote = a.key === 'Order Note';

                    let keyName = a.key;
                    if (!isEn) {
                      if (isCakeMsg) keyName = 'كتابة على الكيكة';
                      else if (isGiftMsg) keyName = 'رسالة إهداء';
                      else if (isRecipient) keyName = 'اسم المستلم';
                      else if (isNote) keyName = 'ملاحظة الطلب';
                    }

                    const displayVal = a.value.length > 25 ? `${a.value.substring(0, 25)}...` : a.value;
                    return (
                      <span key={a.key} title={a.value} className="px-2.5 py-0.5 bg-[#FEF8EB] border border-[#A67B5B]/20 text-[#A67B5B] rounded-full text-[11px] font-bold truncate max-w-[150px]">
                        {keyName}: {displayVal}
                      </span>
                    );
                  })
                }
              </div>
            )}

            {/* Action Row: Delete, Save for Later, Gift */}
            <div className={`flex items-center gap-4 text-[12px] text-gray-400 mt-2 ${isEn ? 'justify-start' : 'justify-start'}`}>
              <div className="flex items-center gap-1.5 text-[#c1c1c1] hover:text-[#DF4646] transition-colors">
                <CartLineRemoveButton lineIds={[id]} disabled={!!line.isOptimistic} isText isEn={isEn} />
              </div>
              <button className="flex items-center gap-1 hover:text-[#234745] transition-colors font-normal text-[13px] text-[#c1c1c1]">
                <svg width="12" height="11" viewBox="0 0 12 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 10.6693L5.49467 10.2127C4.40667 9.21889 3.50667 8.36822 2.79467 7.66067C2.08311 6.95267 1.52134 6.32822 1.10934 5.78733C0.697335 5.24644 0.409335 4.75756 0.245335 4.32067C0.0813352 3.88378 -0.000442643 3.44356 1.8018e-06 3C1.8018e-06 2.152 0.288002 1.44 0.864002 0.864C1.44 0.288 2.152 0 3 0C3.58667 0 4.13667 0.15 4.65 0.45C5.16334 0.75 5.61334 1.18644 6 1.75933C6.38667 1.18644 6.83667 0.75 7.35 0.45C7.86334 0.15 8.41334 0 9 0C9.848 0 10.56 0.288 11.136 0.864C11.712 1.44 12 2.152 12 3C12 3.44267 11.9182 3.88267 11.7547 4.32C11.5907 4.75822 11.3027 5.24756 10.8907 5.788C10.4787 6.32844 9.91889 6.95267 9.21134 7.66067C8.50378 8.36822 7.60156 9.21889 6.50467 10.2127L6 10.6693ZM6 9.76667C7.06667 8.80222 7.94445 7.97644 8.63334 7.28933C9.32222 6.60222 9.86667 6.00556 10.2667 5.49933C10.6667 4.99311 10.9444 4.54533 11.1 4.156C11.2556 3.76578 11.3333 3.38044 11.3333 3C11.3333 2.33333 11.1111 1.77778 10.6667 1.33333C10.2222 0.888889 9.66667 0.666667 9 0.666667C8.46934 0.666667 7.97956 0.818222 7.53067 1.12133C7.08178 1.42444 6.68045 1.88067 6.32667 2.49H5.67467C5.31156 1.87222 4.90778 1.41378 4.46334 1.11467C4.01889 0.816 3.53134 0.666667 3.00067 0.666667C2.34289 0.666667 1.78956 0.888889 1.34067 1.33333C0.89178 1.77778 0.667113 2.33333 0.666669 3C0.666669 3.38044 0.744446 3.76578 0.900002 4.156C1.05556 4.54622 1.33334 4.994 1.73334 5.49933C2.13334 6.00467 2.67778 6.59911 3.36667 7.28267C4.05556 7.96622 4.93334 8.79422 6 9.76667Z" fill="#9FB7AE" />
                </svg>

                <span>{isEn ? 'Save for later' : 'حفظ لاحقاً'}</span>
              </button>
              {(() => {
                const isGiftable = product?.tags?.some((t: string) => {
                  const lowerTag = t.toLowerCase();
                  return lowerTag.includes('gift') || lowerTag.includes('mother') || lowerTag.includes('father') || lowerTag.includes('friend') || lowerTag.includes('grad');
                }) ?? false;

                return isGiftable ? (
                  <CartLineGiftForm line={line} isEn={isEn} />
                ) : null;
              })()}
            </div>
          </div>
        </div>

        {/* Separator line */}
        <div className="w-full border-t border-dashed border-[#BBCFCD]/20" />

        {/* Bottom Section: Price & Quantity Rows */}
        <div className="flex flex-col gap-3 w-full">
          {/* Price Row */}
          <div className="flex items-center justify-between w-full h-[24px]">
            <span className="text-[14px] font-bold text-[#1a1a1a]">{isEn ? 'Price' : 'السعر'}</span>
            <div className="flex items-center gap-1.5 flex-row-reverse">
              {isFreeItem ? (
                <span className="text-emerald-600 font-extrabold text-[16px] uppercase">
                  {isEn ? 'FREE' : 'مجاناً'}
                </span>
              ) : (
                <>
                  <SaudiRiyalSymbol className="w-[18px] h-auto text-[#234745]" />
                  <span className="font-black text-[#234745] text-[18px]" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    {parseFloat(line?.cost?.totalAmount?.amount || '0').toFixed(2)}
                  </span>
                  {line?.cost?.compareAtAmountPerQuantity && (
                    <span className="text-gray-400 text-[12px] font-bold line-through flex items-center gap-0.5 flex-row-reverse mr-2" style={{ fontFamily: "'Outfit', sans-serif" }}>
                      <SaudiRiyalSymbol className="w-[11px] h-auto text-gray-400" />
                      {parseFloat(line.cost.compareAtAmountPerQuantity.amount).toFixed(2)}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Quantity Row */}
          <div className="flex items-center justify-between w-full">
            <span className="text-[14px] font-bold text-[#1a1a1a]">{isEn ? 'Quantity' : 'الكمية'}</span>
            <div dir="ltr">
              <CartLineQuantity line={line} />
            </div>
          </div>
        </div>
      </div>

      {/* Out of Stock Caution Card (Main Cart Page Only) */}
      {isOutOfStock && layout !== 'aside' && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          padding: '16px',
          gap: '16px',
          background: 'rgba(238, 213, 215, 0.2)',
          border: '1px solid #E64950',
          borderRadius: '12px',
          width: '100%',
          direction: isEn ? 'ltr' : 'rtl',
        }}>
          {/* Header: icon + product name + status */}
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
            {/* Warning icon — appears first (rightmost in RTL) */}
            <svg style={{ flexShrink: 0 }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#906B51" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {/* Product name */}
            <span style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", fontWeight: 500, fontSize: '16px', lineHeight: '20px', color: '#171717' }}>
              {product?.title || title}
            </span>
            {/* "لم يعد متاحاً" */}
            <span style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", fontWeight: 700, fontSize: '16px', lineHeight: '20px', color: '#E64950' }}>
              {isEn ? 'No longer available' : 'لم يعد متاحاً'}
            </span>
          </div>

          {/* Body text */}
          <p style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", fontWeight: 500, fontSize: '16px', lineHeight: '20px', color: '#7D7D7D', textAlign: isEn ? 'left' : 'right', margin: 0 }}>
            {isEn ? 'This product is out of stock. You can remove it or replace it.' : 'نفد هذا المنتج. يمكنك إزالته أو استبداله ببديل.'}
          </p>

          {/* Buttons — aligned to the start (right in RTL, left in LTR) */}
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
            {/* عرض البدائل */}
            <Link
              to={isEn ? '/en/collections/all' : '/collections/all'}
              onClick={close}
              style={{
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                padding: '12px 40px',
                height: '48px',
                background: '#FEF8EB',
                border: '1px solid #234745',
                borderRadius: '25px',
                fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                fontWeight: 700, fontSize: '16px', lineHeight: '20px',
                color: '#234745', cursor: 'pointer', whiteSpace: 'nowrap',
                textDecoration: 'none',
              }}
            >
              {isEn ? 'Show alternatives' : 'عرض البدائل'}
            </Link>
            {/* إزالة من السلة */}
            <CartForm fetcherKey={`remove-oos-${id}`} route="/cart" action={CartForm.ACTIONS.LinesRemove} inputs={{ lineIds: [id] }}>
              <button
                type="submit"
                disabled={!!line.isOptimistic}
                style={{
                  display: 'flex', justifyContent: 'center', alignItems: 'center',
                  padding: '12px 40px',
                  height: '48px',
                  background: 'transparent',
                  border: '1px solid #E64950',
                  borderRadius: '25px',
                  fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                  fontWeight: 700, fontSize: '16px', lineHeight: '20px',
                  color: '#E64950', cursor: 'pointer', whiteSpace: 'nowrap',
                  opacity: line.isOptimistic ? 0.5 : 1,
                }}
              >
                {isEn ? 'Remove from cart' : 'إزالة من السلة'}
              </button>
            </CartForm>
          </div>
        </div>
      )}

      {/* Small Out of Stock Caution for Drawer */}
      {isOutOfStock && layout === 'aside' && (
        <div style={{
          display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '6px',
          marginTop: '8px', color: '#E64950', direction: isEn ? 'ltr' : 'rtl',
        }}>
          <svg style={{ flexShrink: 0 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", fontWeight: 700, fontSize: '13px' }}>
            {isEn ? 'Out of stock at selected branch' : 'نفد من الفرع المحدد'}
          </span>
        </div>
      )}
    </li>
  );
}

function CartLineQuantity({ line }: { line: CartLine }) {
  if (!line || typeof line?.quantity === 'undefined') return null;
  const { id: lineId, quantity, isOptimistic } = line;
  const prevQuantity = Number(Math.max(0, quantity - 1).toFixed(0));
  const nextQuantity = Number((quantity + 1).toFixed(0));

  return (
    <div className="flex items-center gap-2">
      {quantity <= 1 ? (
        <CartLineRemoveButton lineIds={[lineId]} disabled={!!isOptimistic} isBox isEn={line.cost?.totalAmount?.currencyCode === 'USD'} />
      ) : (
        <CartLineUpdateButton lines={[{ id: lineId, quantity: prevQuantity }]}>
          <button
            aria-label="Decrease quantity"
            disabled={!!isOptimistic}
            name="decrease-quantity"
            value={prevQuantity}
            className="w-10 h-10 flex items-center justify-center bg-transparent rounded-lg text-[#234745] border border-[#BBCFCD]/80 hover:border-[#234745] transition-all"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </CartLineUpdateButton>
      )}

      <div className="w-10 h-10 flex items-center justify-center bg-transparent rounded-lg border border-[#BBCFCD]/80 font-bold text-[16px] text-[#1a1a1a]" style={{ fontFamily: "'Outfit', sans-serif" }}>
        {quantity}
      </div>

      <CartLineUpdateButton lines={[{ id: lineId, quantity: nextQuantity }]}>
        <button
          aria-label="Increase quantity"
          name="increase-quantity"
          value={nextQuantity}
          disabled={!!isOptimistic}
          className="w-10 h-10 flex items-center justify-center bg-transparent rounded-lg text-[#234745] border border-[#BBCFCD]/80 hover:border-[#234745] transition-all"
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
      inputs={{ lineIds }}
    >
      {isOosButton ? (
        <button
          disabled={disabled}
          type="submit"
          className="w-full py-2.5 rounded-full border border-[#DF4646] text-[#DF4646] bg-transparent font-bold text-[14px] hover:bg-red-50 transition-colors disabled:opacity-50"
          style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
        >
          {isEn ? 'Remove from cart' : 'إزالة من السلة'}
        </button>
      ) : isText ? (
        <button
          disabled={disabled}
          type="submit"
          className="flex items-center gap-1 text-[#c1c1c1] hover:text-red-500 text-[13px] font-medium transition-colors"
          aria-label="Remove item"
        >
          <svg width="10" height="11" viewBox="0 0 10 11" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0.666667 10.5133V1.18H0V0.513333H2.66667V0H6.66667V0.513333H9.33333V1.18H8.66667V10.5133H0.666667ZM1.33333 9.84667H8V1.18H1.33333V9.84667ZM3.20533 8.51333H3.872V2.51333H3.20533V8.51333ZM5.46133 8.51333H6.128V2.51333H5.46133V8.51333Z" fill="#9FB7AE" />
          </svg>

          {isEn ? 'Delete' : 'حذف'}
        </button>
      ) : isBox ? (
        <button
          disabled={disabled}
          type="submit"
          className="w-10 h-10 flex items-center justify-center bg-transparent rounded-lg text-[#234745] border border-[#BBCFCD]/80 hover:border-[#234745] transition-all"
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
      inputs={{ lines }}
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

function CartLineGiftForm({ line, isEn }: { line: CartLine, isEn: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  const isGift = line.attributes?.find((a: any) => a.key === '_isGift')?.value === 'true';
  const existingRecipient = line.attributes?.find((a: any) => a.key === 'Recipient Name')?.value || '';
  const existingMessage = line.attributes?.find((a: any) => a.key === 'Gift Message')?.value || '';
  const existingHideSender = line.attributes?.find((a: any) => a.key === '_hideSender')?.value === 'Yes';

  const [recipient, setRecipient] = useState(existingRecipient);
  const [message, setMessage] = useState(existingMessage);
  const [hideSender, setHideSender] = useState(existingHideSender);

  useEffect(() => {
    setRecipient(existingRecipient);
    setMessage(existingMessage);
    setHideSender(existingHideSender);
  }, [existingRecipient, existingMessage, existingHideSender]);

  const hasGift = isGift || existingRecipient || existingMessage;

  // Preserve other line attributes (like _is_free, etc)
  const currentAttributes = line.attributes || [];
  const otherAttributes = currentAttributes
    .filter((a: any) => !['Recipient Name', 'Gift Message', '_hideSender', '_isGift'].includes(a.key))
    .map((a: any) => ({ key: a.key, value: a.value }));

  // Filter out empty gift attributes
  const giftAttributes = [
    ...(hasGift || recipient || message ? [{ key: '_isGift', value: 'true' }] : []),
    ...(recipient ? [{ key: 'Recipient Name', value: recipient }] : []),
    ...(message ? [{ key: 'Gift Message', value: message }] : []),
    ...(hideSender ? [{ key: '_hideSender', value: 'Yes' }] : [{ key: '_hideSender', value: 'No' }])
  ];

  const finalAttributes = [...otherAttributes, ...giftAttributes];

  return (
    <div className="flex flex-col relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-[#A67B5B] hover:text-[#8e694e] text-[13px] font-medium transition-colors"
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1.33333 6.66667V12H6V6.66667H1.33333ZM6.66667 6.66667V12H11.3333V6.66667H6.66667ZM12 6.66667V12.6667H0.666667V6.66667H0V2.66667H2.02667L2 2.33333C2 1.71449 2.24583 1.121 2.68342 0.683418C3.121 0.245833 3.71449 0 4.33333 0C5.18 0 5.92667 0.453333 6.33333 1.13333C6.74 0.453333 7.48667 0 8.33333 0C8.95217 0 9.54566 0.245833 9.98325 0.683418C10.4208 1.121 10.6667 1.71449 10.6667 2.33333L10.64 2.66667H12.6667V6.66667H12ZM0.666667 3.33333V6H6V3.33333H0.666667ZM12 6V3.33333H6.66667V6H12ZM9.96667 2.66667L10 2.33333C10 1.89131 9.82441 1.46738 9.51184 1.15482C9.19928 0.842261 8.77536 0.666667 8.33333 0.666667C7.89131 0.666667 7.46738 0.842261 7.15482 1.15482C6.84226 1.46738 6.66667 1.89131 6.66667 2.33333V2.66667H9.96667ZM6 2.66667V2.33333C6 1.89131 5.82441 1.46738 5.51184 1.15482C5.19928 0.842261 4.77536 0.666667 4.33333 0.666667C3.89131 0.666667 3.46738 0.842261 3.15482 1.15482C2.84226 1.46738 2.66667 1.89131 2.66667 2.33333L2.7 2.66667H6Z" fill="#906B51" />
        </svg>

        {hasGift ? (isEn ? 'Edit Gift Options' : 'تعديل خيارات الهدية') : (isEn ? 'Make it a gift' : 'إجعلها هدية')}
      </button>

      {isOpen && (
        <div className={`absolute top-full mt-2 w-[280px] z-10 bg-[#fcfaf8] border border-[#f0ece8] p-4 rounded-xl flex flex-col gap-3 shadow-lg ${isEn ? 'left-0' : 'right-0'}`}>
          <input
            type="text"
            placeholder={isEn ? "Recipient Name" : "اسم المستلم"}
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            maxLength={30}
            className="w-full bg-white border border-[#f0ece8] rounded-lg px-3 py-2 text-[13px] text-[#234745] focus:outline-none focus:border-[#d4a06a] focus:ring-1 focus:ring-[#d4a06a] transition-all"
          />
          <textarea
            placeholder={isEn ? "Gift Message" : "رسالة الهدية"}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            maxLength={150}
            className="w-full bg-white border border-[#f0ece8] rounded-lg px-3 py-2 text-[13px] text-[#234745] focus:outline-none focus:border-[#d4a06a] focus:ring-1 focus:ring-[#d4a06a] transition-all resize-none"
          />
          <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold -mt-2 px-1">
            <span>{isEn ? 'Max 150 chars' : 'الحد الأقصى ١٥٠ حرفاً'}</span>
            <span>
              {isEn
                ? `${150 - message.length} remaining`
                : `متبقي ${150 - message.length} حرفاً`}
            </span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hideSender}
              onChange={(e) => setHideSender(e.target.checked)}
              className="rounded text-[#234745] focus:ring-[#234745] border-gray-300"
            />
            <span className="text-[12px] font-bold text-gray-500">{isEn ? 'Hide my name' : 'إخفاء اسمي'}</span>
          </label>

          <CartLineUpdateButton
            lines={[{
              id: line.id,
              attributes: finalAttributes.length > 0 ? finalAttributes : [{ key: '_cleared_gift', value: 'true' }] // Fallback if clearing all attributes
            }]}
          >
            <button
              type="submit"
              onClick={() => setIsOpen(false)}
              className="mt-1 w-full bg-[#234745] text-white font-bold py-2 rounded-lg text-[13px] hover:bg-[#152a29] transition-colors"
            >
              {isEn ? 'Save Gift Details' : 'حفظ تفاصيل الهدية'}
            </button>
          </CartLineUpdateButton>
        </div>
      )}
    </div>
  );
}
