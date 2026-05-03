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
                <div className="text-center mb-12 flex flex-col items-center">
                    <h2 className="text-3xl md:text-4xl font-black text-[#1a1a1a] mb-3 leading-tight">
                        {t.common.newArrivals}
                    </h2>
                    <p className="text-gray-400 text-[15px] font-medium mb-4">
                        {t.common.discoverLatest}
                    </p>
                    <div className="w-12 h-1 bg-[#234745] rounded-full"></div>
                </div>

                {/* Products Grid */}
                <Suspense fallback={<div className="text-center py-20 text-gray-500">{t.common.loadingArrivals}</div>}>
                    <Await resolve={products}>
                        {(resolvedData) => {
                            const productNodes = (resolvedData as any).products?.nodes || [];
                            return (
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
                                            <div key={product.id} className={`flex flex-col h-full rounded-2xl bg-[#f9f9f9] overflow-hidden relative border border-gray-100 transition-all ${isVisibilityBlocked || (isOutOfStock && !isPreorder) ? 'product--disabled opacity-60 grayscale-[30%]' : 'group hover:shadow-lg'}`}>

                                                {/* Wishlist Button — only for active */}
                                                {!isVisibilityBlocked && (
                                                  <button className={`absolute top-4 ${isEn ? 'left-4' : 'right-4'} z-10 w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-400 hover:text-[#e74c3c] transition-colors border border-gray-100`}>
                                                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                          <path d="M20.8 4.6a5.5 5.5 0 00-7.7 0l-1.1 1-1.1-1a5.5 5.5 0 00-7.8 7.8l1 1 7.9 7.9 7.9-7.9 1-1a5.5 5.5 0 000-7.8z" />
                                                      </svg>
                                                  </button>
                                                )}

                                                {/* Status Badges Overlay (Stacking) */}
                                                <div className={`absolute top-4 ${isEn ? 'right-4' : 'left-4'} z-10 flex flex-col gap-2 ${isEn ? 'items-end' : 'items-start'}`}>
                                                    {/* Out of Stock / Preorder / Visibility Blocked */}
                                                    {(isVisibilityBlocked || (isOutOfStock && !isPreorder) || showPreorder) && (
                                                      <span className={`text-[10px] font-black px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-1.5 ${
                                                        isVisibilityBlocked 
                                                          ? (visibility.status === 'scheduled' ? 'bg-amber-500 text-white' : 'bg-red-500 text-white')
                                                          : (showPreorder ? 'bg-[#004f59] text-white' : 'bg-red-500 text-white')
                                                      }`}>
                                                        <span>{isVisibilityBlocked ? (visibility.status === 'scheduled' ? '🕐' : '⛔') : (showPreorder ? '📦' : '⛔')}</span>
                                                        {isVisibilityBlocked 
                                                          ? (isEn ? visibility.label.en : visibility.label.ar)
                                                          : (showPreorder ? t.common.preOrder : t.common.outOfStock)
                                                        }
                                                      </span>
                                                    )}

                                                    {/* Limited Time Badge */}
                                                    {!isVisibilityBlocked && isLimitedTime && (
                                                        <span className="text-[10px] font-black px-3 py-1.5 rounded-xl shadow-sm bg-purple-600 text-white flex items-center gap-1.5">
                                                            <span>⏳</span>
                                                            {isEn ? 'Limited Time' : 'لفترة محدودة'}
                                                        </span>
                                                    )}

                                                    {/* Bundle Badge */}
                                                    {!isVisibilityBlocked && (product.productType?.toLowerCase() === 'bundle' || product.tags?.some((t: string) => t.toLowerCase() === 'bundle')) && (
                                                        <span className="text-[10px] font-black px-3 py-1.5 rounded-xl shadow-sm bg-blue-600 text-white flex items-center gap-1.5">
                                                            <span>📦</span>
                                                            {isEn ? 'Bundle' : 'باقة'}
                                                        </span>
                                                    )}

                                                    {/* BOGO Badge */}
                                                    {!isVisibilityBlocked && product.tags?.some((t: string) => t.toLowerCase().includes('bogo')) && (
                                                        <span className="text-[10px] font-black px-3 py-1.5 rounded-xl shadow-sm bg-orange-500 text-white flex items-center gap-1.5 animate-pulse">
                                                            <span>🔥</span>
                                                            {isEn ? 'BOGO' : 'عرض خاص'}
                                                        </span>
                                                    )}

                                                    {/* Sale Badge */}
                                                    {!isVisibilityBlocked && hasDiscount && (
                                                        <span className="text-[10px] font-black px-3 py-1.5 rounded-xl shadow-sm bg-[#e74c3c] text-white flex items-center gap-1.5">
                                                            <span>🔥</span>
                                                            {isEn ? 'Sale' : 'تخفيض'}
                                                        </span>
                                                    )}

                                                    {/* Payment Restriction Badges */}
                                                    {!isVisibilityBlocked && product.tags?.some((t: string) => ['cash-only', 'payment:cash-only'].includes(t.toLowerCase().trim())) && (
                                                        <span className="text-[10px] font-black px-3 py-1.5 rounded-xl shadow-sm bg-[#27ae60] text-white flex items-center gap-1.5 border border-white/20">
                                                            <span>💵</span>
                                                            {isEn ? 'Cash Only' : 'كاش فقط'}
                                                        </span>
                                                    )}
                                                    {!isVisibilityBlocked && product.tags?.some((t: string) => ['prepaid-only', 'payment:prepaid-only'].includes(t.toLowerCase().trim())) && (
                                                        <span className="text-[10px] font-black px-3 py-1.5 rounded-xl shadow-sm bg-[#2980b9] text-white flex items-center gap-1.5 border border-white/20">
                                                            <span>💳</span>
                                                            {isEn ? 'Paid Only' : 'دفع مسبق فقط'}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Product Image */}
                                                <Link 
                                                    to={isVisibilityBlocked ? '#' : getProductUrl(product.handle)} 
                                                    className={`relative block bg-[#FEF8EB] aspect-[4/3] w-full flex items-center justify-center p-8 overflow-hidden ${isVisibilityBlocked ? 'pointer-events-none' : ''}`}
                                                    onClick={isVisibilityBlocked ? (e: any) => e.preventDefault() : undefined}
                                                >
                                                    {product.images?.nodes?.[0] && (
                                                        <Image
                                                            data={product.images.nodes[0]}
                                                            alt={product.images.nodes[0]?.altText || product.title || 'New Arrival Product'}
                                                            loading="lazy"
                                                            sizes="(min-width: 45em) 25vw, 50vw"
                                                            className={`w-full h-full object-contain transition-transform duration-500 ${effectiveOutOfStock ? 'opacity-50 grayscale' : 'group-hover:scale-105'}`}
                                                        />
                                                    )}
                                                    {!isVisibilityBlocked && isOutOfStock && !isPreorder && (
                                                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center z-10 font-black">
                                                            <span className="bg-red-500 text-white px-6 py-2 rounded-full font-bold text-sm tracking-wide shadow-sm uppercase">
                                                                {t.common.outOfStock}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {showPreorder && (
                                                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center z-10 font-black">
                                                            <span className="bg-[#004f59] text-white px-6 py-2 rounded-full font-bold text-sm tracking-wide shadow-sm uppercase">
                                                                {t.common.preOrder}
                                                            </span>
                                                        </div>
                                                    )}
                                                </Link>

                                                {/* Product Info */}
                                                <div className="bg-white p-5 flex flex-col flex-grow">
                                                    {/* Availability / Visibility Tag */}
                                                    <div className={`flex items-center gap-1.5 text-[11px] font-medium mb-3 ${
                                                        isVisibilityBlocked
                                                            ? (visibility.status === 'scheduled' ? 'text-amber-600' : 'text-red-500')
                                                            : (isOutOfStock ? 'text-red-500' : 'text-[#A2A491]')
                                                    }`}>
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            {isVisibilityBlocked ? (
                                                              <path d="M12 2v10l4 4M12 22a10 10 0 100-20 10 10 0 000 20z" />
                                                            ) : isOutOfStock ? (
                                                              <path d="M18 6L6 18M6 6l12 12" />
                                                            ) : (
                                                              <path d="M20 6L9 17l-5-5" />
                                                            )}
                                                        </svg>
                                                        {isVisibilityBlocked
                                                          ? (isEn ? visibility.label.en : visibility.label.ar)
                                                          : showPreorder
                                                            ? t.common.preOrder
                                                            : isOutOfStock 
                                                              ? `${t.common.notAvailableAt} ${selectedLocationName || t.common.thisBranch}`
                                                              : `${t.common.availableAt} ${selectedLocationName || t.common.thisBranch}`
                                                        }
                                                    </div>

                                                    {/* Title */}
                                                    <Link to={isVisibilityBlocked ? '#' : getProductUrl(product.handle)} onClick={isVisibilityBlocked ? (e: any) => e.preventDefault() : undefined}>
                                                        <h3 className={`text-[#1a1a1a] font-bold text-[15px] leading-snug mb-3 line-clamp-2 transition-colors ${isEn ? 'text-left' : 'text-right'} ${isVisibilityBlocked ? '' : 'hover:text-[#234745]'}`}>
                                                            {product.title}
                                                        </h3>
                                                    </Link>

                                                    {/* Price & Rating — hidden when visibility blocked */}
                                                    {!isVisibilityBlocked ? (
                                                      <>
                                                        <div className="flex items-center justify-between mb-4 mt-auto">
                                                            <div className="flex flex-col">
                                                                {hasDiscount && (
                                                                    <span className="text-gray-400 line-through text-xs font-en flex gap-1 mb-0.5">
                                                                        <Price data={compareAtPrice} isEn={isEn} size="xs" showSymbol={false} />
                                                                    </span>
                                                                )}
                                                                <Price 
                                                                  data={product.priceRange.minVariantPrice} 
                                                                  isEn={isEn} 
                                                                  size="lg" 
                                                                  className="text-[#295b45]"
                                                                />
                                                            </div>
                                                            {parseRatingValue(product.average_rating?.value) > 0 && (
                                                                <StarRating 
                                                                    rating={product.average_rating?.value} 
                                                                    count={product.rating_count?.value} 
                                                                    size="sm"
                                                                    locale={locale}
                                                                    productHandle={product.handle}
                                                                />
                                                            )}
                                                        </div>

                                                        <div className="text-center text-[11px] text-[#c9cac5] font-medium py-3 border-t border-gray-50">
                                                            {tagText}
                                                        </div>
                                                      </>
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
                                                          isOutOfStock={isOutOfStock && !isPreorder}
                                                          notifyLabel={isPreorder ? t.common.preOrder : t.common.notifyMe}
                                                          addLabel={isPreorder ? t.common.preOrder : t.common.addToCart}
                                                          isPreorder={isPreorder}
                                                          onNotifyClick={() => handleNotifyClick(product.title, variant?.id)}
                                                      />
                                                    )}
                                                </div>

                                            </div>
                                        );
                                    })}
                                </div>
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
    isOutOfStock,
    notifyLabel,
    addLabel,
    isPreorder,
    onNotifyClick
}: {
    variant?: any;
    productTags?: string[];
    isOutOfStock: boolean;
    notifyLabel: string;
    addLabel: string;
    isPreorder?: boolean;
    onNotifyClick?: () => void;
}) {
    const { setOpenAside } = useAside();
    const variantId = variant?.id;
    const isBogo = productTags?.some((t: string) => t.toLowerCase().includes('bogo'));

    if (!variantId || isOutOfStock) {
        return (
            <button
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onNotifyClick?.();
                }}
                className="w-full py-3 rounded-xl font-bold transition-all bg-amber-500 text-white hover:bg-amber-600 cursor-pointer relative z-20"
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
      lines.push({
        merchandiseId: variantId,
        quantity: 1,
        selectedVariant: variant,
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
            className={`w-full py-3 rounded-xl font-bold transition-all ${isPreorder ? 'bg-[#004f59] text-white' : 'bg-[#234745] text-white hover:opacity-90 active:scale-95'}`}
            disabled={isOutOfStock}
        >
            {addLabel}
        </AddToCartButton>
    );
}
