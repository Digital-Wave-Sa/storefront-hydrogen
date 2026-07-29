import { Link, useOutletContext, useRouteLoaderData, useLocation } from 'react-router';
import { Image } from '@shopify/hydrogen';
import { useState, useEffect, useMemo } from 'react';
import { useVariantUrl } from '~/utils';
import { useI18n } from '~/lib/i18n';
import { getIsOutOfStock } from '~/lib/stock';
import { getVisibilityStatus } from '~/lib/visibility';
import { Price } from '~/components/Price';
import { AddToCartButton } from '~/components/AddToCartButton';
import { StockNotificationModal } from '~/components/StockNotificationModal';
import { useWishlist } from '~/context/WishlistContext';

function formatNumbers(text: string) {
  if (!text) return text;
  return text.split(/(\d+)/).map((part, i) => {
    if (/^\d+$/.test(part)) {
      return <span key={i} className="font-en">{part}</span>;
    }
    return part;
  });
}

export function ProductItem({
  product,
  loading,
  view = 'grid',
  isExport,
}: {
  product: any;
  loading?: 'eager' | 'lazy';
  view?: 'grid' | 'list';
  /** When true: add-to-cart goes to the export journey (/export-cart) */
  isExport?: boolean;
}) {
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const { selectedLocationId, selectedLocationName } = useOutletContext<{ selectedLocationId?: string, selectedLocationName?: string }>() || {};

  const { toggleWishlist, isInWishlist } = useWishlist();
  const isWishlisted = isInWishlist(product.id);

  const variantsNodes = product.variants?.nodes || (product as any).product?.variants?.nodes || [];

  const variant = useMemo(() => {
    if (variantsNodes.length > 0) {
      const availableVariant = variantsNodes.find((v: any) => {
        const vAvailable = v.availableForSale ?? product.availableForSale ?? true;
        const outOfStock = getIsOutOfStock(
          // Export products ship from central stock — bypass branch check
          isExport ? null : selectedLocationId,
          isExport ? null : selectedLocationName,
          v.storeAvailability?.nodes || [],
          vAvailable
        );
        return !outOfStock;
      });
      return availableVariant || variantsNodes[0];
    }
    if ((product as any).price || (product as any).id?.includes('ProductVariant')) {
      return product;
    }
    return undefined;
  }, [product, variantsNodes, selectedLocationId, selectedLocationName, isExport]);

  const productHandle = product.handle || (product as any).product?.handle || (product as any).variants?.nodes?.[0]?.product?.handle || '';
  const variantUrl = productHandle ? useVariantUrl(productHandle, variant?.selectedOptions || []) : '#';

  const storeAvailabilityNodes = variant?.storeAvailability?.nodes || [];
  const variantAvailable = variant?.availableForSale ?? product.availableForSale ?? true;
  const isOutOfStock = getIsOutOfStock(
    // Export products ship from central stock — bypass branch check
    isExport ? null : selectedLocationId,
    isExport ? null : selectedLocationName,
    storeAvailabilityNodes,
    variantAvailable
  );
  const isAvailable = !isOutOfStock && !!variant;

  const location = useLocation();
  const rootData = useRouteLoaderData('root') as any;
  const isEn = location.pathname.startsWith('/en') || rootData?.locale === 'en';
  const locale = isEn ? 'en' : 'ar';
  const t = useI18n(locale);
  const customer = rootData?.customer;
  const [customerEmail, setCustomerEmail] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (customer && typeof customer.then === 'function') {
      customer.then((res: any) => {
        if (res?.customer?.email) setCustomerEmail(res.customer.email);
      }).catch(() => { });
    }
  }, [customer]);

  // --- Visibility scheduling ---
  const visibility = getVisibilityStatus(
    product.visibility_start?.value,
    product.visibility_end?.value,
  );
  const isVisibilityBlocked = !visibility.isActive;

  const isPreorder = product.tags?.some((tag: string) =>
    ['preorder', 'pre-order', 'طلب مسبق'].includes(tag.toLowerCase())
  );

  const bogoFreeVariantId = product.bogo_free_item?.reference?.id || product.bogo_free_item?.value || null;
  const isBogo = !!bogoFreeVariantId || (product.tags?.some((tag: string) => tag.toLowerCase().includes('bogo')) ?? false);

  const cartLines = useMemo(() => {
    if (!variant) return [];
    const mainLine = {
      merchandiseId: variant.id,
      quantity: 1,
      selectedVariant: variant
    };

    if (isBogo) {
      if (bogoFreeVariantId) {
        return [
          mainLine,
          {
            merchandiseId: bogoFreeVariantId,
            quantity: 1,
            attributes: [{ key: '_is_free', value: 'true' }]
          }
        ];
      } else {
        mainLine.quantity = 2;
        return [mainLine];
      }
    }
    return [mainLine];
  }, [variant, isBogo, bogoFreeVariantId]);

  const effectiveAvailable = isAvailable && !isVisibilityBlocked;
  const showOutOfStock = !isAvailable && !isVisibilityBlocked;
  const showPreorder = isPreorder && !isVisibilityBlocked && isAvailable;

  const isDimmed = isVisibilityBlocked;

  if (view === 'list') {
    return (
      <div className={`flex items-center gap-6 p-4 md:p-6 bg-white border border-gray-100 rounded-3xl transition-all duration-300 group relative ${isDimmed ? 'opacity-60 grayscale-[30%]' : 'hover:shadow-xl hover:border-[#234745]/20'}`}>
        <Link
          key={product.id}
          prefetch="intent"
          to={isVisibilityBlocked ? '#' : variantUrl}
          className={`shrink-0 ${isVisibilityBlocked ? 'pointer-events-none' : ''}`}
          onClick={isVisibilityBlocked ? (e: any) => e.preventDefault() : () => {
            if (typeof window !== 'undefined' && (window as any).__ga4SelectItem) {
              (window as any).__ga4SelectItem(product, '', 'Product List');
            }
          }}
        >
          <div className="w-32 h-32 md:w-48 md:h-48 bg-gray-50 rounded-2xl overflow-hidden border border-gray-50 relative">
            {product.featuredImage ? (
              <Image
                alt=""
                aspectRatio="1/1"
                data={product.featuredImage}
                loading={loading}
                sizes="200px"
                className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
                style={{ opacity: isVisibilityBlocked ? 0.5 : (showOutOfStock ? 0.4 : 1), filter: isVisibilityBlocked ? 'grayscale(1)' : 'none' }}
              />
            ) : (
              <img
                src="/images/placeholder/sample.png"
                alt={product.title || ''}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            )}
            {/* Promo Badges (List View) */}
            <div className={`absolute top-2 ${isEn ? 'right-2' : 'left-2'} z-10 flex flex-col gap-1 ${isEn ? 'items-end' : 'items-start'}`}>
              {!isVisibilityBlocked && (product as any).is_limited_time?.value && (
                <span className="text-[9px] font-black px-2 py-1 rounded-lg shadow-sm bg-purple-600 text-white flex items-center gap-1">
                  <span>⏳</span> {(product as any).is_limited_time.value}
                </span>
              )}


            </div>
          </div>
        </Link>
        <div className="flex-1 flex flex-col justify-center min-w-0 text-right">
          <div className="flex items-center justify-end gap-2 mb-2">
            <span className={`text-[11px] font-black uppercase tracking-wider px-2 py-1 rounded-lg ${isVisibilityBlocked
              ? (visibility.status === 'scheduled' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600')
              : (showPreorder ? 'bg-blue-50 text-blue-600' : (effectiveAvailable ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'))
              }`}>
              {isVisibilityBlocked
                ? (isEn ? visibility.label.en : visibility.label.ar)
                : (showPreorder ? t.common.preOrder : (effectiveAvailable ? t.common.inStock : t.common.outOfStock))}
            </span>
          </div>
          <Link to={isVisibilityBlocked ? '#' : variantUrl} prefetch="intent" onClick={isVisibilityBlocked ? (e: any) => e.preventDefault() : undefined}>
            <h4 className={`text-[16px] font-black text-gray-800 mb-2 truncate transition-colors ${isVisibilityBlocked ? '' : 'group-hover:text-[#234745]'}`} style={{ opacity: showOutOfStock ? 0.4 : 1 }}>{formatNumbers(product.title)}</h4>
          </Link>
          {!isVisibilityBlocked && product.priceRange && (
            <div style={{ opacity: showOutOfStock ? 0.4 : 1 }}>
              <Price
                data={product.priceRange.minVariantPrice}
                size="lg"
                isEn={isEn}
                className="mt-1"
              />
            </div>
          )}
          <div className="mt-4 flex items-center justify-end gap-3">
            {!isVisibilityBlocked && (
              <>
                {effectiveAvailable ? (
                  <AddToCartButton
                    lines={cartLines as any}
                    disabled={!effectiveAvailable || isOutOfStock}
                    isExport={isExport}
                    className="h-[44px] px-8 flex items-center justify-center rounded-full font-bold text-[15px] bg-[#234745] text-white hover:bg-[#163529] shadow-sm transition-all duration-300 active:scale-95"
                    style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                  >
                    {t.common.addToCart}
                  </AddToCartButton>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsNotifyModalOpen(true)}
                    className="h-[44px] px-8 flex items-center justify-center rounded-full font-bold text-[15px] bg-[#234745] text-white hover:bg-[#163529] shadow-sm transition-all duration-300 active:scale-95"
                    style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                  >
                    {isEn ? 'Notify Me' : 'أبلغني عند التوفر'}
                  </button>
                )}
                <Link to={variantUrl} aria-label={product.title} className="bg-gray-100 text-gray-600 px-6 py-3 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all">
                  {isEn ? 'Details' : 'التفاصيل'}
                </Link>
              </>
            )}
          </div>
        </div>

        <StockNotificationModal
          isOpen={isNotifyModalOpen}
          onClose={() => setIsNotifyModalOpen(false)}
          productTitle={product.title}
          variantId={variant?.id}
          isEn={isEn}
          customerEmail={customerEmail}
          locationId={selectedLocationId}
          locationName={selectedLocationName}
        />
      </div>
    );
  }

  return (
    <div className={`group flex flex-col bg-[#F9F9F9] rounded-[20px] overflow-hidden transition-all duration-300 relative ${isDimmed ? 'opacity-60 grayscale-[30%]' : 'hover:shadow-md hover:-translate-y-1'}`}>
      <Link
        key={product.id}
        prefetch="intent"
        to={isVisibilityBlocked ? '#' : variantUrl}
        className={`block relative ${isVisibilityBlocked ? 'pointer-events-none' : ''}`}
        onClick={isVisibilityBlocked ? (e: any) => e.preventDefault() : () => {
          if (typeof window !== 'undefined' && (window as any).__ga4SelectItem) {
            (window as any).__ga4SelectItem(product, '', 'Product List');
          }
        }}
      >
        <div className="w-full aspect-[4/3] relative flex items-center justify-center bg-gray-50 overflow-hidden">
          {(() => {
            const imageToDisplay = product.featuredImage || product.images?.nodes?.[0] || product.variants?.nodes?.[0]?.image;
            if (!imageToDisplay) {
              return (
                <img
                  src="/images/placeholder/sample.png"
                  alt={product.title || ''}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              );
            }
            return (
              <Image
                alt={imageToDisplay.altText || product.title || ''}
                aspectRatio="4/3"
                data={imageToDisplay}
                loading={loading}
                widths={[400, 600, 800, 1200]}
                sizes="(min-width: 45em) 400px, 100vw"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                style={{ opacity: isVisibilityBlocked ? 0.5 : (showOutOfStock ? 0.4 : 1), filter: isVisibilityBlocked ? 'grayscale(1)' : 'none' }}
              />
            );
          })()}

          {/* Wishlist Heart Icon */}
          <div className={`absolute top-2 md:top-3 ${isEn ? 'right-2 md:right-3' : 'left-2 md:left-3'} z-20`}>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleWishlist({
                  id: product.id,
                  title: product.title,
                  handle: product.handle,
                  image: product.featuredImage || product.images?.nodes?.[0],
                  priceRange: product.priceRange
                });
              }}
              aria-label={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
              className={`w-7 h-7 md:w-10 md:h-10 p-0 rounded-full bg-white shadow-md transition-all flex items-center justify-center ${isWishlisted ? 'text-[#e74c3c]' : 'text-gray-700 hover:text-[#e74c3c]'}`}
            >
              <svg className="w-3.5 h-3.5 md:w-5 md:h-5" viewBox="0 0 24 24" fill={isWishlisted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5"><path d="M20.8 4.6a5.5 5.5 0 00-7.7 0l-1.1 1-1.1-1a5.5 5.5 0 00-7.8 7.8l1 1 7.9 7.9 7.9-7.9 1-1a5.5 5.5 0 000-7.8z" /></svg>
            </button>
          </div>

          {/* Status Badge overlay — top corner (top-right in RTL, top-left in LTR) */}
          <div className={`absolute top-2 md:top-3 ${isEn ? 'left-2 md:left-3' : 'right-2 md:right-3'} z-10`}>
            {isVisibilityBlocked ? (
              <span
                className="flex items-center justify-center px-3.5 py-1.5 rounded-full font-bold text-[12px] whitespace-nowrap shadow-sm text-white bg-[#906b51] backdrop-blur-md"
                style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
              >
                {isEn ? 'Out of Season' : 'نفد للموسم'}
              </span>
            ) : showOutOfStock ? (
              <span
                className="flex items-center justify-center px-3.5 py-1.5 rounded-full font-bold text-[12px] whitespace-nowrap shadow-sm text-white bg-[#E64950] backdrop-blur-md"
                style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
              >
                {isEn ? 'Out of Stock' : 'نفذت الكمية'}
              </span>
            ) : showPreorder ? (
              <span
                className="flex items-center justify-center px-3.5 py-1.5 rounded-full font-bold text-[12px] whitespace-nowrap shadow-sm text-white bg-[#234745]/90 backdrop-blur-md"
                style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
              >
                {t.common.preOrder}
              </span>
            ) : null}
          </div>
        </div>
      </Link>

      <div className={`p-3 md:p-4 flex flex-col flex-grow ${isEn ? 'text-left' : 'text-right'}`}>
        <Link prefetch="intent" to={variantUrl}>
          <h4 className={`font-bold text-[#234745] text-[16px] line-clamp-1 transition-colors duration-300 ${isVisibilityBlocked ? '' : 'group-hover:text-[#1a3a2d]'}`} style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", fontSize: '16px', lineHeight: '24px', opacity: showOutOfStock ? 0.4 : 1 }}>
            {formatNumbers(product.title)}
          </h4>
        </Link>

        <div className={`mt-[8px] mb-[16px] flex ${isEn ? 'justify-start' : 'justify-start'} items-center gap-[8px] min-h-[28px]`} style={{ opacity: showOutOfStock ? 0.4 : 1 }}>
          {!isVisibilityBlocked && product.priceRange ? (
            <>
              <div className="flex items-center text-[#255441]">
                <Price data={product.priceRange.minVariantPrice} size="lg" isEn={isEn} />
              </div>
              {product.compareAtPriceRange?.minVariantPrice && parseFloat(product.compareAtPriceRange.minVariantPrice.amount) > parseFloat(product.priceRange.minVariantPrice.amount) && (
                <div className="flex items-center text-[#E64950] line-through">
                  <Price data={product.compareAtPriceRange.minVariantPrice} size="md" isEn={isEn} />
                </div>
              )}
            </>
          ) : (
            <div className="h-[24px]" />
          )}
        </div>

        <div className="mt-auto">
          {isVisibilityBlocked ? (
            <button
              type="button"
              onClick={() => setIsNotifyModalOpen(true)}
              className="w-full h-[40px] md:h-[44px] px-2 md:px-4 flex items-center justify-center gap-1.5 rounded-full font-bold text-[12px] md:text-[14px] bg-[#906B51] hover:bg-[#7d5c45] text-white shadow-sm transition-all duration-300 active:scale-95"
              style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 01-3.46 0" />
              </svg>
              <span>{isEn ? 'Notify for Next Season' : 'أبلغني في الموسم القادم'}</span>


            </button>
          ) : effectiveAvailable ? (
            <AddToCartButton
              lines={cartLines as any}
              disabled={!effectiveAvailable || isOutOfStock}
              isExport={isExport}
              className="w-full h-[40px] md:h-[44px] px-2 md:px-4 flex items-center justify-center rounded-full font-bold text-[12px] md:text-[15px] bg-[#234745] text-white hover:bg-[#163529] shadow-sm transition-all duration-300 active:scale-95"
              style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
            >
              {isEn ? 'Add to Cart' : 'أضف إلى السلة'}
            </AddToCartButton>
          ) : (
            <button
              type="button"
              onClick={() => setIsNotifyModalOpen(true)}
              className="w-full h-[40px] md:h-[44px] px-2 md:px-4 flex items-center justify-center rounded-full font-bold text-[12px] md:text-[15px] bg-[#234745] text-white hover:bg-[#163529] shadow-sm transition-all duration-300 active:scale-95"
              style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
            >
              {isEn ? 'Notify Me' : 'أبلغني عند التوفر'}
            </button>
          )}
        </div>
      </div>

      <StockNotificationModal
        isOpen={isNotifyModalOpen}
        onClose={() => setIsNotifyModalOpen(false)}
        productTitle={product.title}
        variantId={variant?.id}
        isEn={isEn}
        customerEmail={customerEmail}
        locationId={selectedLocationId}
        locationName={selectedLocationName}
      />
    </div>
  );
}
