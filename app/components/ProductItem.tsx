import {Link, useOutletContext, useRouteLoaderData} from 'react-router';
import {Image} from '@shopify/hydrogen';
import {useState, useEffect, useMemo} from 'react';
import {useVariantUrl} from '~/utils';
import {useI18n} from '~/lib/i18n';
import {getIsOutOfStock} from '~/lib/stock';
import {getVisibilityStatus} from '~/lib/visibility';
import {Price} from '~/components/Price';
import {AddToCartButton} from '~/components/AddToCartButton';
import {StockNotificationModal} from '~/components/StockNotificationModal';
import {useWishlist} from '~/context/WishlistContext';

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
}: {
  product: any;
  loading?: 'eager' | 'lazy';
  view?: 'grid' | 'list';
}) {
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const { selectedLocationId, selectedLocationName } = useOutletContext<{ selectedLocationId?: string, selectedLocationName?: string }>() || {};
  
  const { toggleWishlist, isInWishlist } = useWishlist();
  const isWishlisted = isInWishlist(product.id);

  const variant = useMemo(() => {
    if (!product.variants?.nodes?.length) return undefined;
    
    // Try to find a variant that is actually in stock at the selected location
    const availableVariant = product.variants.nodes.find((v: any) => {
        const outOfStock = getIsOutOfStock(
            selectedLocationId,
            selectedLocationName,
            v.storeAvailability?.nodes || [],
            product.availableForSale
        );
        return !outOfStock;
    });

    // Fall back to the first variant if nothing is explicitly in stock
    return availableVariant || product.variants.nodes[0];
  }, [product, selectedLocationId, selectedLocationName]);

  const variantUrl = useVariantUrl(product.handle, variant?.selectedOptions || []);
  
  const storeAvailabilityNodes = variant?.storeAvailability?.nodes || [];
  const isOutOfStock = getIsOutOfStock(
    selectedLocationId,
    selectedLocationName,
    storeAvailabilityNodes,
    product.availableForSale
  );
  const isAvailable = !isOutOfStock && !!variant;

  const rootData = useRouteLoaderData('root') as any;
  const locale = rootData?.locale || 'ar';
  const isEn = locale === 'en';
  const t = useI18n(locale);
  const customer = rootData?.customer;
  const [customerEmail, setCustomerEmail] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (customer && typeof customer.then === 'function') {
        customer.then((res: any) => {
            if (res?.customer?.email) setCustomerEmail(res.customer.email);
        }).catch(() => {});
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
                    attributes: [{key: '_is_free', value: 'true'}]
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

  const isDimmed = isVisibilityBlocked || showOutOfStock;

  if (view === 'list') {
    return (
      <div className={`flex items-center gap-6 p-4 md:p-6 bg-white border border-gray-100 rounded-3xl transition-all duration-300 group relative ${isDimmed ? 'opacity-60 grayscale-[30%]' : 'hover:shadow-xl hover:border-[#234745]/20'}`}>
        <Link
          key={product.id}
          prefetch="intent"
          to={isVisibilityBlocked ? '#' : variantUrl}
          className={`shrink-0 ${isVisibilityBlocked ? 'pointer-events-none' : ''}`}
          onClick={isVisibilityBlocked ? (e: any) => e.preventDefault() : undefined}
        >
            <div className="w-32 h-32 md:w-48 md:h-48 bg-gray-50 rounded-2xl overflow-hidden border border-gray-50 relative">
            {product.featuredImage && (
                <Image
                alt={product.featuredImage.altText || product.title}
                aspectRatio="1/1"
                data={product.featuredImage}
                loading={loading}
                sizes="200px"
                className={`w-full h-full object-contain transition-transform duration-500 ${!effectiveAvailable ? 'opacity-50 grayscale' : 'group-hover:scale-110'}`}
                />
            )}
            {/* Promo Badges (List View) */}
            <div className={`absolute top-2 ${isEn ? 'right-2' : 'left-2'} z-10 flex flex-col gap-1 ${isEn ? 'items-end' : 'items-start'}`}>
              {!isVisibilityBlocked && (product as any).is_limited_time?.value === 'true' && (
                  <span className="text-[9px] font-black px-2 py-1 rounded-lg shadow-sm bg-purple-600 text-white flex items-center gap-1">
                      <span>⏳</span> {isEn ? 'Limited Time' : 'لفترة محدودة'}
                  </span>
              )}
              {!isVisibilityBlocked && isBogo && (
                  <span className="text-[9px] font-black px-2 py-1 rounded-lg shadow-sm bg-[#FF6B6B] text-white flex items-center gap-1">
                      <span>🎁</span> {isEn ? 'Buy 1 Get 1 Free' : '1+1 مجاناً'}
                  </span>
              )}
              {!isVisibilityBlocked && !isBogo && product.compareAtPriceRange?.minVariantPrice && product.priceRange?.minVariantPrice && parseFloat(product.compareAtPriceRange.minVariantPrice.amount) > parseFloat(product.priceRange.minVariantPrice.amount) && (
                  <span className="text-[9px] font-black px-2 py-1 rounded-lg shadow-sm bg-[#e74c3c] text-white flex items-center gap-1">
                      <span>🔥</span> {isEn ? 'Sale' : 'تخفيض'}
                  </span>
              )}
            </div>
            </div>
        </Link>
        <div className="flex-1 flex flex-col justify-center min-w-0 text-right">
          <div className="flex items-center justify-end gap-2 mb-2">
             <span className={`text-[11px] font-black uppercase tracking-wider px-2 py-1 rounded-lg ${
                isVisibilityBlocked 
                  ? (visibility.status === 'scheduled' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600')
                  : (showPreorder ? 'bg-blue-50 text-blue-600' : (effectiveAvailable ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'))
              }`}>
                {isVisibilityBlocked 
                  ? (isEn ? visibility.label.en : visibility.label.ar)
                  : (showPreorder ? t.common.preOrder : (effectiveAvailable ? t.common.inStock : t.common.outOfStock))}
              </span>
          </div>
          <Link to={isVisibilityBlocked ? '#' : variantUrl} prefetch="intent" onClick={isVisibilityBlocked ? (e: any) => e.preventDefault() : undefined}>
            <h4 className={`text-xl md:text-2xl font-black text-gray-800 mb-2 truncate transition-colors ${isVisibilityBlocked ? '' : 'group-hover:text-[#234745]'}`}>{formatNumbers(product.title)}</h4>
          </Link>
          {!isVisibilityBlocked && product.priceRange && (
            <Price 
              data={product.priceRange.minVariantPrice} 
              size="lg" 
              isEn={isEn} 
              className="mt-1"
            />
          )}
          <div className="mt-4 flex items-center justify-end gap-3">
            {!isVisibilityBlocked && (
              <>
                {effectiveAvailable ? (
                    <AddToCartButton 
                        lines={cartLines as any} 
                        disabled={!effectiveAvailable || isOutOfStock}
                        className="h-[44px] px-8 flex items-center justify-center rounded-full font-bold text-[15px] bg-[#234745] text-white hover:bg-[#163529] shadow-sm transition-all duration-300 active:scale-95"
                        style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                    >
                        {t.common.addToCart}
                    </AddToCartButton>
                ) : (
                    <button 
                        type="button"
                        onClick={() => setIsNotifyModalOpen(true)}
                        className="h-[44px] px-8 flex items-center justify-center rounded-full font-bold text-[15px] bg-amber-500 text-white hover:bg-amber-600 shadow-sm transition-all duration-300 active:scale-95"
                        style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                    >
                        🔔 {t.common.notifyMe}
                    </button>
                )}
                <Link to={variantUrl} className="bg-gray-100 text-gray-600 px-6 py-3 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all">
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
        onClick={isVisibilityBlocked ? (e: any) => e.preventDefault() : undefined}
      >
        <div className="w-full aspect-[4/3] relative flex items-center justify-center bg-gray-50 overflow-hidden">
            {product.featuredImage && (
            <Image
                alt={product.featuredImage.altText || product.title}
                aspectRatio="4/3"
                data={product.featuredImage}
                loading={loading}
                sizes="(min-width: 45em) 400px, 100vw"
                className={`w-full h-full object-cover transition-transform duration-700 ${!effectiveAvailable ? 'opacity-50 grayscale' : 'group-hover:scale-105'}`}
            />
            )}
            
            {/* Wishlist Heart Icon */}
            <div className={`absolute top-[16px] ${isEn ? 'right-[16px]' : 'left-[16px]'} z-20`}>
                <button 
                  onClick={(e) => {
                      e.preventDefault();
                      toggleWishlist({
                        id: product.id,
                        title: product.title,
                        handle: product.handle,
                        image: product.featuredImage || product.images?.nodes?.[0],
                        priceRange: product.priceRange
                      });
                  }}
                  className={`w-10 h-10 p-0 rounded-full bg-white shadow-md transition-all flex items-center justify-center ${isWishlisted ? 'text-[#e74c3c]' : 'text-gray-700 hover:text-[#e74c3c]'}`}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill={isWishlisted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5"><path d="M20.8 4.6a5.5 5.5 0 00-7.7 0l-1.1 1-1.1-1a5.5 5.5 0 00-7.8 7.8l1 1 7.9 7.9 7.9-7.9 1-1a5.5 5.5 0 000-7.8z" /></svg>
                </button>
            </div>
            
            {/* Status Badges overlay */}
            <div className={`absolute top-[16px] ${isEn ? 'left-[16px]' : 'right-[16px]'} z-10 flex flex-col gap-2 ${isEn ? 'items-start' : 'items-end'}`}>
              {isVisibilityBlocked ? (
                  <span className={`text-[10px] font-black px-3 py-1.5 rounded-[8px] shadow-sm flex items-center gap-1.5 ${visibility.status === 'scheduled' ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'}`}>
                    <span>{visibility.status === 'scheduled' ? '🕐' : '⛔'}</span>
                    {isEn ? visibility.label.en : visibility.label.ar}
                  </span>
              ) : (showOutOfStock || showPreorder) ? (
                  <span className={`text-[10px] font-black px-3 py-1.5 rounded-[8px] shadow-sm flex items-center gap-1.5 ${showPreorder ? 'bg-blue-600 text-white' : 'bg-red-500 text-white'}`}>
                    <span>{showPreorder ? '📦' : '⛔'}</span>
                    {showPreorder ? t.common.preOrder : t.common.outOfStock}
                  </span>
              ) : null}
              {!isVisibilityBlocked && (product as any).is_limited_time?.value === 'true' && (
                  <div className="text-[10px] font-black px-2.5 py-1.5 rounded-[8px] shadow-sm bg-purple-600 text-white flex items-center gap-1.5">
                      <span>⏳</span> {isEn ? 'Limited Time' : 'لفترة محدودة'}
                  </div>
              )}
              {!isVisibilityBlocked && isBogo && (
                  <div className="text-[10px] font-black px-2.5 py-1.5 rounded-[8px] shadow-sm bg-[#FF6B6B] text-white flex items-center gap-1.5">
                      <span>🎁</span> {isEn ? 'Buy 1 Get 1 Free' : '1+1 مجاناً'}
                  </div>
              )}
              {!isVisibilityBlocked && !isBogo && product.compareAtPriceRange?.minVariantPrice && product.priceRange?.minVariantPrice && parseFloat(product.compareAtPriceRange.minVariantPrice.amount) > parseFloat(product.priceRange.minVariantPrice.amount) && (
                  <div className="text-[10px] font-black px-2.5 py-1.5 rounded-[8px] shadow-sm bg-[#e74c3c] text-white flex items-center gap-1.5">
                      <span>🔥</span> {isEn ? 'Sale' : 'تخفيض'}
                  </div>
              )}
            </div>
        </div>
      </Link>
        
      <div className={`p-[16px] flex flex-col flex-grow ${isEn ? 'text-left' : 'text-right'}`}>
          <Link prefetch="intent" to={isVisibilityBlocked ? '#' : variantUrl} className={isVisibilityBlocked ? 'pointer-events-none' : ''}>
              <h4 className={`font-bold text-[#234745] line-clamp-1 transition-colors duration-300 ${isVisibilityBlocked ? '' : 'group-hover:text-[#1a3a2d]'}`} style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", fontSize: '18px', lineHeight: '24px' }}>
                  {formatNumbers(product.title)}
              </h4>
          </Link>

          {!isVisibilityBlocked && product.priceRange && (
            <div className={`mt-[8px] mb-[16px] flex ${isEn ? 'justify-start' : 'justify-start'} items-center gap-[8px]`}>
                <div className="flex items-center text-[#255441]">
                    <Price data={product.priceRange.minVariantPrice} size="lg" isEn={isEn} />
                </div>
                {product.compareAtPriceRange?.minVariantPrice && parseFloat(product.compareAtPriceRange.minVariantPrice.amount) > parseFloat(product.priceRange.minVariantPrice.amount) && (
                    <div className="flex items-center text-[#E64950] line-through">
                        <Price data={product.compareAtPriceRange.minVariantPrice} size="md" isEn={isEn} />
                    </div>
                )}
            </div>
          )}

          {!isVisibilityBlocked && (
            <div className="mt-auto">
                {effectiveAvailable ? (
                    <AddToCartButton 
                          lines={cartLines as any} 
                          disabled={!effectiveAvailable || isOutOfStock}
                          className="w-full h-[44px] flex items-center justify-center rounded-full font-bold text-[15px] bg-[#234745] text-white hover:bg-[#163529] shadow-sm transition-all duration-300 active:scale-95"
                          style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                      >
                          {isEn ? 'Add to Cart' : 'أضف إلي السلة'}
                      </AddToCartButton>
                ) : (
                    <button 
                        type="button"
                        onClick={() => setIsNotifyModalOpen(true)}
                        className="w-full h-[44px] flex items-center justify-center rounded-full font-bold text-[15px] bg-amber-500 text-white hover:bg-amber-600 shadow-sm transition-all duration-300 active:scale-95"
                        style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                    >
                        🔔 {t.common.notifyMe}
                    </button>
                )}
            </div>
          )}
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
