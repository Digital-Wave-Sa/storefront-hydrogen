import { Await, Link, useOutletContext } from 'react-router';
import { Suspense, useEffect, useState } from 'react';
import { Image, Money } from '@shopify/hydrogen';
import { Price } from './Price';
import { useI18n } from '~/lib/i18n';
import { useAside } from '~/components/Aside';
import { getVisibilityStatus } from '~/lib/visibility';
import { getIsOutOfStock } from '~/lib/stock';
import { AddToCartButton } from './AddToCartButton';
import { StockNotificationModal } from '~/components/StockNotificationModal';
import { StarRating, parseRatingValue } from '~/components/StarRating';
import { useWishlist } from '~/context/WishlistContext';

export function NewArrivals({
    products,
}: {
    products: Promise<any>;
}) {
    const { locale, selectedLocationName, selectedLocationId, customer } = useOutletContext<{ locale: string, selectedLocationName?: string, selectedLocationId?: string, customer?: Promise<any> }>();
    const t = useI18n(locale);
    const isEn = locale === 'en';

    const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<{ title: string, variantId: string } | null>(null);
    const [customerEmail, setCustomerEmail] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (customer && typeof customer.then === 'function') {
            customer.then((res: any) => {
                if (res?.customer?.email) setCustomerEmail(res.customer.email);
            }).catch(() => {});
        }
    }, [customer]);

    const getProductUrl = (handle: string) => isEn ? `/en/products/${handle}` : `/products/${handle}`;

    const handleNotifyClick = (title: string, variantId: string) => {
        setSelectedProduct({ title, variantId });
        setIsNotifyModalOpen(true);
    };

    return (
        <section dir={isEn ? 'ltr' : 'rtl'} className={`w-full bg-white py-16 ${isEn ? 'font-en' : 'font-ar'}`}>
            <div className="max-w-[1400px] mx-auto px-4 md:px-8">

                {/* Section Header */}
                <div className="text-center mb-10 flex flex-col items-center">
                    <h2 className="text-[32px] lg:text-[42px] font-bold text-[#1a1a1a] mb-2 leading-tight" style={{ fontFamily: "'Bahij Janna', sans-serif" }}>
                        {isEn ? 'Featured Collections' : 'التشكيلات المميزة'}
                    </h2>
                    <p className="text-[#8a9e9a] text-[14px] lg:text-[16px] font-medium" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                        {isEn ? 'Collections crafted with ultimate care, telling the story of the craft since 1919' : 'تشكيلات صنعت بعناية فائقة، تحكي قصة الحرفة منذ 1919'}
                    </p>
                </div>

                {/* Products Grid */}
                <Suspense fallback={<div className="text-center py-20 text-gray-500">{t.common.loadingArrivals}</div>}>
                    <Await resolve={products}>
                        {(resolvedData) => {
                            const productNodes = (resolvedData as any).products?.nodes || [];
                            return (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                            {productNodes.slice(0, 4).map((product: any, idx: number) => {
                                                const variant = product.variants?.nodes?.[0];
                                                const storeAvailabilityNodes = variant?.storeAvailability?.nodes || [];
                                                
                                                const isOutOfStock = getIsOutOfStock(
                                                  selectedLocationId,
                                                  selectedLocationName,
                                                  storeAvailabilityNodes,
                                                  product.availableForSale
                                                );

                                                const { toggleWishlist, isInWishlist } = useWishlist();
                                                const isWishlisted = isInWishlist(product.id);

                                                // --- Visibility scheduling ---
                                                const visibility = getVisibilityStatus(
                                                    product.visibility_start?.value,
                                                    product.visibility_end?.value,
                                                );
                                                const isVisibilityBlocked = !visibility.isActive;
                                                const isPreorder = product.tags?.some((tag: string) => 
                                                  ['preorder', 'pre-order', 'طلب مسبق'].includes(tag.toLowerCase())
                                                );

                                                const effectiveOutOfStock = (isOutOfStock || isVisibilityBlocked) && !isPreorder;
                                                const showPreorder = isPreorder && !isVisibilityBlocked && !isOutOfStock; // Only show pre-order if it's technically available (continue selling)

                                                const compareAtPrice = product.compareAtPriceRange?.minVariantPrice;
                                                const price = product.priceRange?.minVariantPrice;
                                                const hasDiscount = compareAtPrice && price && parseFloat(compareAtPrice.amount) > parseFloat(price.amount);
                                                const isLimitedTime = product.is_limited_time?.value === 'true';

                                                const tagText = isEn 
                                                    ? (idx % 2 === 0 ? '⏱ Requires 2 days prep' : 'Pay in 2 with Tamara')
                                                    : (idx % 2 === 0 ? '⏱ يحتاج يومين للتجهيز' : 'قسطها على دفعتين مع تمارا');

                                                return (
                                                    <div key={product.id} className={`flex flex-col h-full rounded-2xl bg-white overflow-hidden relative border border-gray-100 transition-all ${isVisibilityBlocked || effectiveOutOfStock ? 'product--disabled opacity-60 grayscale-[30%]' : 'group hover:shadow-lg'}`}>
                                                        {!isVisibilityBlocked && (
                                                          <button 
                                                            onClick={(e) => {
                                                              e.preventDefault();
                                                              toggleWishlist({
                                                                id: product.id,
                                                                title: product.title,
                                                                handle: product.handle,
                                                                image: product.images?.nodes?.[0],
                                                                priceRange: product.priceRange
                                                              });
                                                            }}
                                                            className={`absolute top-4 ${isEn ? 'left-4' : 'right-4'} z-10 w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm transition-colors border border-gray-100 ${isWishlisted ? 'text-[#e74c3c]' : 'text-gray-400 hover:text-[#e74c3c]'}`}
                                                          >
                                                              <svg width="18" height="18" viewBox="0 0 24 24" fill={isWishlisted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
                                                                  <path d="M20.8 4.6a5.5 5.5 0 00-7.7 0l-1.1 1-1.1-1a5.5 5.5 0 00-7.8 7.8l1 1 7.9 7.9 7.9-7.9 1-1a5.5 5.5 0 000-7.8z" />
                                                              </svg>
                                                          </button>
                                                        )}

                                                    {/* Status Badges Overlay (Stacking) */}
                                                    <div className={`absolute top-4 ${isEn ? 'right-4' : 'left-4'} z-10 flex flex-col gap-2 ${isEn ? 'items-end' : 'items-start'}`}>
                                                        {/* Sale Badge */}
                                                        {!isVisibilityBlocked && hasDiscount && (
                                                            <span className="text-[10px] font-black px-3 py-1.5 rounded-full shadow-sm bg-[#e74c3c] text-white flex items-center gap-1.5">
                                                                <span>🔥</span>
                                                                {isEn ? 'Sale' : 'تخفيض'}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Product Image */}
                                                    <Link 
                                                        to={isVisibilityBlocked ? '#' : getProductUrl(product.handle)} 
                                                        className={`relative block bg-[#F8F9F8] aspect-[4/3] w-full flex items-center justify-center p-0 overflow-hidden ${isVisibilityBlocked ? 'pointer-events-none' : ''}`}
                                                        onClick={isVisibilityBlocked ? (e: any) => e.preventDefault() : undefined}
                                                    >
                                                        {product.images?.nodes?.[0] && (
                                                            <Image
                                                                data={product.images.nodes[0]}
                                                                alt={product.images.nodes[0]?.altText || product.title || 'New Arrival Product'}
                                                                loading="lazy"
                                                                sizes="(min-width: 45em) 25vw, 50vw"
                                                                className={`w-full h-full object-cover transition-transform duration-500 ${effectiveOutOfStock ? 'opacity-50 grayscale' : 'group-hover:scale-105'}`}
                                                            />
                                                        )}
                                                    </Link>

                                                    {/* Product Info */}
                                                    <div className="bg-white p-5 flex flex-col flex-grow">
                                                        
                                                        {/* Title */}
                                                        <Link to={isVisibilityBlocked ? '#' : getProductUrl(product.handle)} onClick={isVisibilityBlocked ? (e: any) => e.preventDefault() : undefined}>
                                                            <h3 className={`text-[#1a1a1a] font-bold text-[16px] leading-snug mb-3 line-clamp-2 transition-colors ${isEn ? 'text-left' : 'text-right'} ${isVisibilityBlocked ? '' : 'hover:text-[#234745]'}`} style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                                                                {product.title}
                                                            </h3>
                                                        </Link>

                                                        {/* Price — hidden when visibility blocked */}
                                                        {!isVisibilityBlocked ? (
                                                          <div className="flex items-center gap-3 mb-6 mt-auto">
                                                              <Price 
                                                                data={product.priceRange.minVariantPrice} 
                                                                isEn={isEn} 
                                                                size="lg" 
                                                                className="text-[#234745] font-bold"
                                                              />
                                                              {hasDiscount && (
                                                                  <span className="text-gray-400 line-through text-xs font-en">
                                                                      <Price data={compareAtPrice} isEn={isEn} size="xs" showSymbol={false} />
                                                                  </span>
                                                              )}
                                                          </div>
                                                        ) : (
                                                          <div className="mt-auto pt-2 mb-4">
                                                            <span className={`text-sm font-bold ${visibility.status === 'scheduled' ? 'text-amber-600' : 'text-red-500'}`}>
                                                              {isEn ? visibility.label.en : visibility.label.ar}
                                                            </span>
                                                          </div>
                                                        )}

                                                        {/* Add to Cart — only for active products */}
                                                        {!isVisibilityBlocked && (
                                                           <NewArrivalsAddToCart
                                                              variant={variant}
                                                              productTags={product.tags}
                                                              bogoFreeVariantId={product.bogo_free_item?.reference?.id || product.bogo_free_item?.value || null}
                                                              isOutOfStock={isOutOfStock && !isPreorder}
                                                              notifyLabel={isPreorder ? t.common.preOrder : (isEn ? 'Notify Me' : 'أعلمني عند التوفر')}
                                                              addLabel={isPreorder ? t.common.preOrder : (isEn ? 'Add to Cart' : 'أضف إلى السلة')}
                                                              isPreorder={isPreorder}
                                                              onNotifyClick={() => handleNotifyClick(product.title, variant?.id)}
                                                          />
                                                        )}
                                                    </div>

                                                </div>
                                            );
                                        })}
                                    </div>
                                    
                                    {/* View All Button */}
                                    <div className="mt-16 flex justify-center">
                                        <Link 
                                            to={isEn ? "/en/collections" : "/collections"}
                                            className="px-10 py-3.5 border border-[#234745] text-[#234745] rounded-full font-bold text-[15px] hover:bg-[#234745] hover:text-white transition-all duration-300"
                                            style={{ fontFamily: "'GE Dinar One', sans-serif" }}
                                        >
                                            {isEn ? 'View All Collections' : 'عرض جميع التشكيلات'}
                                        </Link>
                                    </div>
                                </>
                            );
                        }}
                    </Await>
                </Suspense>

                {selectedProduct && (
                    <StockNotificationModal 
                        isOpen={isNotifyModalOpen}
                        onClose={() => setIsNotifyModalOpen(false)}
                        productTitle={selectedProduct.title}
                        variantId={selectedProduct.variantId}
                        isEn={isEn}
                        customerEmail={customerEmail}
                        locationId={selectedLocationId}
                        locationName={selectedLocationName}
                    />
                )}

            </div>
        </section>
    );
}

// ─── ADD TO CART BUTTON (uses CartForm to actually add items) ────────────────
function NewArrivalsAddToCart({
    variant,
    productTags,
    bogoFreeVariantId,
    isOutOfStock,
    notifyLabel,
    addLabel,
    isPreorder,
    onNotifyClick
}: {
    variant?: any;
    productTags?: string[];
    bogoFreeVariantId?: string | null;
    isOutOfStock: boolean;
    notifyLabel: string;
    addLabel: string;
    isPreorder?: boolean;
    onNotifyClick?: () => void;
}) {
    const { setOpenAside } = useAside();
    const variantId = variant?.id;
    const isBogo = !!bogoFreeVariantId || (productTags?.some((t: string) => t.toLowerCase().includes('bogo')) ?? false);

    if (!variantId || isOutOfStock) {
        return (
            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onNotifyClick?.();
                }}
                className="w-full py-4 rounded-full font-bold transition-all bg-amber-500 text-white hover:bg-amber-600 cursor-pointer relative z-20 text-[14px]"
                style={{ fontFamily: "'GE Dinar One', sans-serif" }}
            >
                🔔 {notifyLabel}
            </button>
        );
    }

    const groupId = Date.now().toString();
    const lines = [{ 
      merchandiseId: variantId, 
      quantity: 1,
      selectedVariant: variant,
      attributes: [{ key: '_groupId', value: groupId }]
    }];

    if (isBogo) {
      const freeVariantId = bogoFreeVariantId || variantId;
      lines.push({
        merchandiseId: freeVariantId,
        quantity: 1,
        attributes: [
          { key: '_groupId', value: groupId },
          { key: '_is_addon', value: 'true' },
          { key: '_is_free', value: 'true' }
        ]
      });
    }

    return (
        <AddToCartButton
            lines={lines}
            className={`w-full py-4 rounded-full font-bold transition-all text-[15px] ${isPreorder ? 'bg-[#004f59] text-white' : 'bg-[#234745] text-white hover:bg-[#2c5452] active:scale-95'}`}
            disabled={isOutOfStock}
            style={{ fontFamily: "'GE Dinar One', sans-serif" }}
        >
            {addLabel}
        </AddToCartButton>
    );
}
