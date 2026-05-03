import { Await, Link, useOutletContext } from 'react-router';
import { Suspense, useEffect, useState } from 'react';
import { Image, Money } from '@shopify/hydrogen';
import { Price } from './Price';
import { Button } from './layout/Button';
import { useI18n } from '~/lib/i18n';
import { useAside } from '~/components/Aside';
import { getVisibilityStatus } from '~/lib/visibility';
import { getIsOutOfStock } from '~/lib/stock';
import { AddToCartButton } from './AddToCartButton';

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
                                            <div key={product.id} className={`flex flex-col h-full rounded-[32px] border-0 bg-[#F9F9F9] overflow-hidden relative ${isVisibilityBlocked || (isOutOfStock && !isPreorder) ? 'product--disabled opacity-60 grayscale-[30%]' : 'group hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)]'} transition-all duration-300`}>

                                                {/* Top Action / Heart */}
                                                {!isVisibilityBlocked && (
                                                  <button
                                                    onClick={(e) => e.preventDefault()}
                                                    className="absolute top-4 ltr:left-4 rtl:right-auto rtl:left-4 z-10 w-10 h-10 p-0 rounded-full bg-white shadow-md text-gray-700 hover:text-[#e74c3c] flex items-center justify-center transition-colors"
                                                  >
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20.8 4.6a5.5 5.5 0 00-7.7 0l-1.1 1-1.1-1a5.5 5.5 0 00-7.8 7.8l1 1 7.9 7.9 7.9-7.9 1-1a5.5 5.5 0 000-7.8z" /></svg>
                                                  </button>
                                                )}

                                                {/* Status Badges Overlay (Stacking top right) */}
                                                <div className="absolute top-4 ltr:right-4 rtl:left-auto rtl:right-4 z-10 flex flex-col gap-2 items-end">
                                                    {(isVisibilityBlocked || (isOutOfStock && !isPreorder) || showPreorder) && (
                                                      <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 ${
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
                                                        <span className="text-[11px] font-bold px-3 py-1.5 rounded-full shadow-sm bg-purple-600 text-white flex items-center gap-1.5">
                                                            <span>⏳</span>
                                                            {isEn ? 'Limited Time' : 'لفترة محدودة'}
                                                        </span>
                                                    )}

                                                    {/* Bundle Badge */}
                                                    {!isVisibilityBlocked && (product.productType?.toLowerCase() === 'bundle' || product.tags?.some((t: string) => t.toLowerCase() === 'bundle')) && (
                                                        <span className="text-[11px] font-bold px-3 py-1.5 rounded-full shadow-sm bg-blue-600 text-white flex items-center gap-1.5">
                                                            <span>📦</span>
                                                            {isEn ? 'Bundle' : 'باقة'}
                                                        </span>
                                                    )}

                                                    {/* BOGO Badge */}
                                                    {!isVisibilityBlocked && product.tags?.some((t: string) => t.toLowerCase().includes('bogo')) && (
                                                        <span className="text-[11px] font-bold px-3 py-1.5 rounded-full shadow-sm bg-orange-500 text-white flex items-center gap-1.5 animate-pulse">
                                                            <span>🔥</span>
                                                            {isEn ? 'BOGO' : 'عرض خاص'}
                                                        </span>
                                                    )}

                                                    {/* Sale Badge */}
                                                    {!isVisibilityBlocked && hasDiscount && (
                                                        <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full shadow-sm bg-[#e74c3c] text-white flex items-center gap-1.5`}>
                                                            <span>🔥</span>
                                                            {isEn ? 'Sale' : 'تخفيض'}
                                                        </span>
                                                    )}

                                                    {/* Payment Restriction Badges */}
                                                    {!isVisibilityBlocked && product.tags?.some((t: string) => ['cash-only', 'payment:cash-only'].includes(t.toLowerCase().trim())) && (
                                                        <span className="text-[11px] font-bold px-3 py-1.5 rounded-full shadow-sm bg-[#27ae60] text-white flex items-center gap-1.5 border border-white/20">
                                                            <span>💵</span>
                                                            {isEn ? 'Cash Only' : 'كاش فقط'}
                                                        </span>
                                                    )}
                                                    {!isVisibilityBlocked && product.tags?.some((t: string) => ['prepaid-only', 'payment:prepaid-only'].includes(t.toLowerCase().trim())) && (
                                                        <span className="text-[11px] font-bold px-3 py-1.5 rounded-full shadow-sm bg-[#2980b9] text-white flex items-center gap-1.5 border border-white/20">
                                                            <span>💳</span>
                                                            {isEn ? 'Paid Only' : 'دفع مسبق فقط'}
                                                        </span>
                                                    )}
                                                </div>

                                                <Link 
                                                    to={isVisibilityBlocked ? '#' : getProductUrl(product.handle)} 
                                                    className={`relative block aspect-[4/3] w-full flex items-center justify-center overflow-hidden ${isVisibilityBlocked ? 'pointer-events-none' : ''}`}
                                                    onClick={isVisibilityBlocked ? (e: any) => e.preventDefault() : undefined}
                                                >
                                                    {product.images?.nodes?.[0] && (
                                                        <Image
                                                            data={product.images.nodes[0]}
                                                            alt={product.images.nodes[0]?.altText || product.title || 'Product'}
                                                            loading="lazy"
                                                            sizes="(min-width: 45em) 25vw, 50vw"
                                                            className={`w-full h-full object-cover transition-transform duration-700 ${effectiveOutOfStock ? 'opacity-50 grayscale' : 'group-hover:scale-105'}`}
                                                        />
                                                    )}

                                                    {/* Out of stock overlay */}
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

                                                <div className="bg-[#F9F9F9] p-5 lg:p-6 flex flex-col flex-grow">
                                                    
                                                    {/* Title */}
                                                    <Link to={isVisibilityBlocked ? '#' : getProductUrl(product.handle)} onClick={isVisibilityBlocked ? (e: any) => e.preventDefault() : undefined}>
                                                        <h3 className={`text-[#234745] font-black text-xl lg:text-[22px] leading-tight mb-4 line-clamp-2 transition-colors ${isVisibilityBlocked ? '' : 'hover:opacity-80'}`}>
                                                            {product.title}
                                                        </h3>
                                                    </Link>

                                                    {/* Price Row (Side by side) */}
                                                    {!isVisibilityBlocked ? (
                                                      <div className="flex items-center gap-3 justify-start mb-6" dir={isEn ? 'ltr' : 'rtl'}>
                                                          <div className="text-[#234745] font-black text-xl lg:text-2xl flex items-baseline gap-1">
                                                              <Price data={product.priceRange.minVariantPrice} isEn={isEn} showSymbol={true} />
                                                          </div>
                                                          {hasDiscount && (
                                                              <div className="text-[#849f96] line-through text-sm font-bold flex gap-1 items-baseline">
                                                                  <Price data={compareAtPrice} isEn={isEn} showSymbol={true} />
                                                              </div>
                                                          )}
                                                      </div>
                                                    ) : (
                                                      <div className="mb-6">
                                                        <span className={`text-sm font-bold ${visibility.status === 'scheduled' ? 'text-amber-600' : 'text-red-500'}`}>
                                                          {isEn ? visibility.label.en : visibility.label.ar}
                                                        </span>
                                                      </div>
                                                    )}

                                                    {/* Add to Cart Button */}
                                                    {!isVisibilityBlocked && (
                                                      <div className="mt-auto">
                                                          <BestSellersAddToCart
                                                                variant={variant}
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
                        className="px-10 border-[#234745] text-[#234745] hover:bg-[#234745] hover:text-white rounded-full font-bold"
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
                className="w-full h-12 rounded-full font-bold text-[15px] bg-amber-500 text-white hover:bg-amber-600 transition-colors shadow-sm"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onNotifyClick?.();
                }}
            >
                {notifyLabel}
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
            className={`w-full py-3.5 rounded-full font-bold text-[16px] transition-all shadow-sm ${isPreorder ? 'bg-[#004f59] text-white hover:bg-[#003d45]' : 'bg-[#234745] text-white hover:bg-[#1a3533] active:scale-[0.98]'}`}
            disabled={isOutOfStock}
        >
            {addLabel}
        </AddToCartButton>
    );
}

