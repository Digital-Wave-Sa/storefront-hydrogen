import { Await, Link, useOutletContext } from 'react-router';
import { Suspense, useEffect, useState } from 'react';
import { Image, Money, CartForm } from '@shopify/hydrogen';
import { Price } from './Price';
import { Button } from './layout/Button';
import { useI18n } from '~/lib/i18n';
import { useAside } from '~/components/Aside';
import { getVisibilityStatus } from '~/lib/visibility';
import { getIsOutOfStock } from '~/lib/stock';

import { StockNotificationModal } from '~/components/StockNotificationModal';
import { StarRating, parseRatingValue } from '~/components/StarRating';

export function BestSellers({
    products,
}: {
    products: Promise<any>;
}) {
    const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<{title: string, variantId: string} | null>(null);

    const { locale, selectedLocationName, selectedLocationId, customer } = useOutletContext<{ locale: string, selectedLocationName?: string, selectedLocationId?: string, customer?: Promise<any> }>();
    const [customerEmail, setCustomerEmail] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (customer && typeof customer.then === 'function') {
            customer.then((res: any) => {
                if (res?.customer?.email) setCustomerEmail(res.customer.email);
            }).catch(() => {});
        }
    }, [customer]);

    const t = useI18n(locale);
    const isEn = locale === 'en';

    const tabs = isEn 
        ? ['All', 'Sweets', 'Cakes', 'Chocolate', 'Gifts']
        : ['الكل', 'الحلويات', 'الكيك', 'الشوكولاته', 'الهدايا'];

    const getProductUrl = (handle: string) => isEn ? `/en/products/${handle}` : `/products/${handle}`;

    const handleNotifyClick = (title: string, variantId: string) => {
        setSelectedProduct({title, variantId});
        setIsNotifyModalOpen(true);
    };

    return (
        <section dir={isEn ? 'ltr' : 'rtl'} className={`w-full bg-white py-16 ${isEn ? 'font-en' : 'font-ar'}`}>
            <div className="max-w-[1400px] mx-auto px-4 md:px-8">

                {/* Section Header */}
                <div className="text-center mb-10 flex flex-col items-center">
                    <h2 className="text-3xl md:text-4xl font-bold text-[#1a1a1a] mb-2 flex items-center justify-center gap-2">
                        {isEn ? 'Best Sellers 🔥' : 'أفضل المبيعات 🔥'}
                    </h2>
                    <p className="text-gray-500 text-sm md:text-base mb-4">{isEn ? 'Most wanted this week' : 'الأكثر طلباً هذا الأسبوع'}</p>
                    <div className="w-16 h-[3px] bg-[#234745] rounded-full"></div>
                </div>

                {/* Tabs Filter */}
                <div className="flex flex-wrap justify-center gap-3 mb-12">
                    {tabs.map((tab, idx) => (
                        <button
                            key={idx}
                            className={`px-6 py-2 rounded-full border text-sm font-bold transition-colors ${idx === 0
                                ? 'bg-[#234745] text-white border-[#234745]'
                                : 'bg-white text-gray-600 border-gray-300 hover:border-[#234745] hover:text-[#234745]'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Products Grid */}
                <Suspense fallback={<div className="text-center py-20 text-gray-500">{isEn ? 'Loading products...' : 'جاري تحميل المنتجات...'}</div>}>
                    <Await resolve={products}>
                        {(resolvedData) => {
                            const productNodes = (resolvedData as any).products?.nodes || [];
                            return (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                    {productNodes.map((product: any, idx: number) => {
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

                                        // Mock some dynamic text just for matching the UI design identically
                                        const tagText = isEn 
                                            ? (idx % 2 === 0 ? 'Requires 2 days preparation' : 'Pay in 2 installments with Tamara')
                                            : (idx % 2 === 0 ? 'يحتاج يومين للتجهيز' : 'قسطها على دفعتين مع تمارا');

                                        return (
                                            <div key={product.id} className={`flex flex-col h-full rounded-2xl border border-transparent bg-white overflow-hidden relative ${isVisibilityBlocked || (isOutOfStock && !isPreorder) ? 'product--disabled opacity-60 grayscale-[30%]' : 'group hover:border-gray-100 hover:shadow-xl'} transition-all`}>

                                                {/* Top Action / Heart */}
                                                {!isVisibilityBlocked && (
                                                  <Button
                                                    variant="light"
                                                    size="md"
                                                    className="absolute top-4 left-4 z-10 w-9 h-9 p-0 rounded-full text-gray-400 hover:text-[#e74c3c]"
                                                    icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.8 4.6a5.5 5.5 0 00-7.7 0l-1.1 1-1.1-1a5.5 5.5 0 00-7.8 7.8l1 1 7.9 7.9 7.9-7.9 1-1a5.5 5.5 0 000-7.8z" /></svg>}
                                                  />
                                                )}

                                                {/* Status Badges Overlay (Stacking top right) */}
                                                <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 items-end">
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
                                                </div>

                                                <Link 
                                                    to={isVisibilityBlocked ? '#' : getProductUrl(product.handle)} 
                                                    className={`relative block bg-[#FEF8EB] aspect-[4/3] w-full flex items-center justify-center p-8 overflow-hidden ${isVisibilityBlocked ? 'pointer-events-none' : ''}`}
                                                    onClick={isVisibilityBlocked ? (e: any) => e.preventDefault() : undefined}
                                                >
                                                    {product.images?.nodes?.[0] && (
                                                        <Image
                                                            data={product.images.nodes[0]}
                                                            alt={product.images.nodes[0]?.altText || product.title || 'Best Seller Product'}
                                                            loading="lazy"
                                                            sizes="(min-width: 45em) 25vw, 50vw"
                                                            className={`w-full h-full object-contain transition-transform duration-500 ${effectiveOutOfStock ? 'opacity-50 grayscale' : 'group-hover:scale-105'}`}
                                                        />
                                                    )}

                                                    {/* Out of stock overlay (only for actively available products) */}
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

                                                <div className="bg-[#F9F9F9] p-5 flex flex-col flex-grow">
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
                                                        <h3 className={`text-[#1a1a1a] font-bold text-[15px] leading-tight mb-1 line-clamp-2 transition-colors ${isVisibilityBlocked ? '' : 'hover:text-[#234745]'}`}>
                                                            {product.title}
                                                        </h3>
                                                    </Link>

                                                    {/* Rating */}
                                                    {!isVisibilityBlocked && parseRatingValue(product.average_rating?.value) > 0 && (
                                                        <div className="mb-2">
                                                            <StarRating 
                                                                rating={product.average_rating?.value} 
                                                                count={product.rating_count?.value} 
                                                                size="sm"
                                                                locale={locale}
                                                                productHandle={product.handle}
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Price Row — hidden when visibility blocked */}
                                                    {!isVisibilityBlocked ? (
                                                      <div className="flex items-end justify-between mt-auto pt-2 border-b border-gray-100 pb-4">
                                                          <div className="flex flex-col">
                                                              {hasDiscount && (
                                                                  <div className="text-gray-400 line-through text-xs font-en flex gap-1 mb-0.5">
                                                                      <Price data={compareAtPrice} isEn={isEn} size="xs" showSymbol={false} />
                                                                  </div>
                                                              )}
                                                              <Price 
                                                                data={product.priceRange.minVariantPrice} 
                                                                isEn={isEn} 
                                                                size="lg" 
                                                                className="text-[#295b45]"
                                                              />
                                                          </div>
                                                      </div>
                                                    ) : (
                                                      <div className="mt-auto pt-2 border-b border-gray-100 pb-4">
                                                        <span className={`text-sm font-bold ${visibility.status === 'scheduled' ? 'text-amber-600' : 'text-red-500'}`}>
                                                          {isEn ? visibility.label.en : visibility.label.ar}
                                                        </span>
                                                      </div>
                                                    )}

                                                    {/* Payment/Prepare Tag */}
                                                    {!isVisibilityBlocked && (
                                                      <div className="text-center text-[11px] text-[#c9cac5] font-medium py-3">
                                                          {tagText}
                                                      </div>
                                                    )}

                                                    {/* Add to Cart / Notify Button */}
                                                    {!isVisibilityBlocked && (
                                                      <div className="mt-auto pt-1">
                                                          <BestSellersAddToCart
                                                                variantId={variant?.id}
                                                                productTags={product.tags}
                                                                isOutOfStock={isOutOfStock && !isPreorder}
                                                                notifyLabel={isPreorder ? t.common.preOrder : (isEn ? 'Notify Me' : 'أبلغني عن التوفر')}
                                                                addLabel={isPreorder ? t.common.preOrder : (isEn ? 'Add to Cart' : 'أضف إلي السلة')}
                                                                isPreorder={isPreorder}
                                                                onNotifyClick={() => handleNotifyClick(product.title, variant?.id)}
                                                           />
                                                      </div>
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

                {/* View All Button */}
                <div className="mt-12 flex justify-center">
                    <Button
                        to={isEn ? "/en/collections/all" : "/collections/all"}
                        variant="outline"
                        size="lg"
                        className="px-10 border-[#234745] text-[#234745] hover:bg-[#234745] hover:text-white"
                    >
                        {isEn ? 'View All Products' : 'عرض جميع المنتجات'}
                    </Button>
                </div>

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
function BestSellersAddToCart({
    variantId,
    productTags,
    isOutOfStock,
    notifyLabel,
    addLabel,
    isPreorder,
    onNotifyClick
}: {
    variantId?: string;
    productTags?: string[];
    isOutOfStock: boolean;
    notifyLabel: string;
    addLabel: string;
    isPreorder?: boolean;
    onNotifyClick?: () => void;
}) {
    const { setOpenAside } = useAside();
    const isBogo = productTags?.some((t: string) => t.toLowerCase().includes('bogo'));

    if (!variantId || isOutOfStock) {
        return (
            <Button
                type="button"
                variant="amber"
                size="md"
                className="w-full h-11 rounded-xl text-xs font-bold"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onNotifyClick?.();
                }}
                icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" /></svg>}
            >
                {notifyLabel}
            </Button>
        );
    }

    const groupId = Date.now().toString();
    const lines = [{ 
      merchandiseId: variantId, 
      quantity: 1,
      attributes: [{ key: '_groupId', value: groupId }]
    }];

    if (isBogo) {
      lines.push({
        merchandiseId: variantId,
        quantity: 1,
        attributes: [
          { key: '_groupId', value: groupId },
          { key: '_is_addon', value: 'true' },
          { key: '_is_free', value: 'true' }
        ]
      });
    }

    return (
        <CartForm
            route="/cart"
            action={CartForm.ACTIONS.LinesAdd}
            inputs={{ lines }}
        >
            {(fetcher: any) => (
                <button
                    type="submit"
                    disabled={fetcher.state !== 'idle'}
                    className={`w-full py-3 rounded-xl font-bold transition-all ${isPreorder ? 'bg-[#004f59] text-white' : 'bg-[#234745] text-white hover:opacity-90 active:scale-95'}`}
                >
                    {fetcher.state === 'idle' ? addLabel : '...'}
                </button>
            )}
        </CartForm>
    );
}
