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
import { useWishlist } from '~/context/WishlistContext';

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

    const [activeTab, setActiveTab] = useState(0);

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
        <section 
            dir={isEn ? 'ltr' : 'rtl'} 
            className={`w-full relative overflow-hidden ${isEn ? 'font-en' : 'font-ar'}`}
            style={{ background: 'linear-gradient(to bottom, #234745 0%, #234745 65%, #FEF8EB 65%, #FEF8EB 100%)' }}
        >
            {/* Left Decorative Pattern */}
            <div 
                className="absolute top-0 left-[-50px] w-[500px] h-[500px] opacity-[0.12] pointer-events-none"
                style={{ 
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='white' stroke-width='0.5'%3E%3Cpath d='M30 0 L60 30 L30 60 L0 30 Z' opacity='0.3'/%3E%3Cpath d='M30 10 Q35 30 50 30 Q35 30 30 50 Q25 30 10 30 Q25 30 30 10' opacity='0.6'/%3E%3C/g%3E%3C/svg%3E")`,
                    maskImage: 'radial-gradient(circle at 20% 20%, black 0%, transparent 70%)',
                    WebkitMaskImage: 'radial-gradient(circle at 20% 20%, black 0%, transparent 70%)'
                }}
            />

            {/* Right Decorative Pattern */}
            <div 
                className="absolute top-0 right-[-50px] w-[500px] h-[500px] opacity-[0.12] pointer-events-none"
                style={{ 
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='white' stroke-width='0.5'%3E%3Cpath d='M30 0 L60 30 L30 60 L0 30 Z' opacity='0.3'/%3E%3Cpath d='M30 10 Q35 30 50 30 Q35 30 30 50 Q25 30 10 30 Q25 30 30 10' opacity='0.6'/%3E%3C/g%3E%3C/svg%3E")`,
                    maskImage: 'radial-gradient(circle at 80% 20%, black 0%, transparent 70%)',
                    WebkitMaskImage: 'radial-gradient(circle at 80% 20%, black 0%, transparent 70%)'
                }}
            />

            <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:pt-12 lg:pb-16 relative z-10" style={{ paddingTop: '50px', paddingBottom: '50px' }}>

                {/* Section Header */}
                <div className="text-center mb-8">
                    <h2 className="text-[36px] lg:text-[48px] font-bold mb-2 leading-tight" style={{ color: '#ffffff' }}>
                        {isEn ? 'Best Sellers' : 'أفضل المبيعات'}
                    </h2>
                    <p className="text-sm md:text-base" style={{ color: 'rgba(255,255,255,0.6)' }}>{isEn ? 'Most wanted this week' : 'الأكثر طلباً هذا الأسبوع'}</p>
                </div>

                {/* Tabs Filter */}
                <div className="flex gap-2.5 mb-10 overflow-x-auto hide-scrollbars snap-x snap-mandatory pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:justify-center md:flex-wrap">
                    {tabs.map((tab, idx) => (
                        <button
                            key={idx}
                            onClick={() => setActiveTab(idx)}
                            className={`snap-start whitespace-nowrap shrink-0 px-7 py-2.5 rounded-full border text-[13px] font-bold transition-all ${activeTab === idx
                                ? 'bg-[#BBCFCD] text-[#234745] border-[#BBCFCD]'
                                : 'bg-transparent text-white border-white/30 hover:border-white/60'
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
                                <div className="flex md:grid md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6 overflow-x-auto md:overflow-visible hide-scrollbars snap-x snap-mandatory pb-8 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0">
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

                                        const { toggleWishlist, isInWishlist } = useWishlist();
                                        const isWishlisted = isInWishlist(product.id);

                                        return (
                                            <div key={product.id} className={`snap-start shrink-0 w-[85vw] max-w-[320px] md:max-w-none md:w-full flex flex-col h-full rounded-[20px] border-0 overflow-hidden relative ${isVisibilityBlocked || (isOutOfStock && !isPreorder) ? 'product--disabled grayscale-[30%]' : 'group hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)]'} transition-all duration-300`} style={{ backgroundColor: '#dce5df' }}>

                                                {/* Top Action / Heart */}
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
                                                    className={`absolute top-4 ltr:left-4 rtl:right-auto rtl:left-4 z-10 w-10 h-10 p-0 rounded-full bg-white shadow-md transition-all flex items-center justify-center ${isWishlisted ? 'text-[#e74c3c]' : 'text-gray-700 hover:text-[#e74c3c]'}`}
                                                  >
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill={isWishlisted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5"><path d="M20.8 4.6a5.5 5.5 0 00-7.7 0l-1.1 1-1.1-1a5.5 5.5 0 00-7.8 7.8l1 1 7.9 7.9 7.9-7.9 1-1a5.5 5.5 0 000-7.8z" /></svg>
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
                                                            className={`w-full h-full object-cover transition-transform duration-700 ${effectiveOutOfStock ? 'grayscale' : 'group-hover:scale-105'}`}
                                                        />
                                                    )}

                                                    {/* Out of stock overlay */}
                                                    {!isVisibilityBlocked && isOutOfStock && !isPreorder && (
                                                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center z-10 font-bold">
                                                            <span className="bg-red-500 text-white px-6 py-2 rounded-full font-bold text-sm tracking-wide shadow-sm uppercase">
                                                                {t.common.outOfStock}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {showPreorder && (
                                                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center z-10 font-bold">
                                                            <span className="bg-[#004f59] text-white px-6 py-2 rounded-full font-bold text-sm tracking-wide shadow-sm uppercase">
                                                                {t.common.preOrder}
                                                            </span>
                                                        </div>
                                                    )}
                                                </Link>

                                                <div className="p-5 lg:p-6 flex flex-col flex-grow" style={{ backgroundColor: '#ffffff' }}>
                                                    
                                                    {/* Title */}
                                                    <Link to={isVisibilityBlocked ? '#' : getProductUrl(product.handle)} onClick={isVisibilityBlocked ? (e: any) => e.preventDefault() : undefined}>
                                                        <h3 className={`text-[#234745] font-black text-xl lg:text-[22px] leading-tight mb-4 line-clamp-2 transition-colors ${isVisibilityBlocked ? '' : 'hover:opacity-80'}`}>
                                                            {product.title}
                                                        </h3>
                                                    </Link>

                                                    {/* Price Row (Side by side) */}
                                                    {!isVisibilityBlocked ? (
                                                      <div className="flex items-center gap-3 justify-start mb-6" dir={isEn ? 'ltr' : 'rtl'}>
                                                          <div className="text-[#234745] font-bold text-xl lg:text-2xl flex items-baseline gap-1">
                                                              <Price data={product.priceRange.minVariantPrice} isEn={isEn} showSymbol={true} />
                                                          </div>
                                                          {hasDiscount && (
                                                              <div className="text-[#E64950] line-through text-base font-bold flex gap-1 items-baseline">
                                                                  <Price data={compareAtPrice} isEn={isEn} showSymbol={true} size="md" />
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
                                                                bogoFreeVariantId={product.bogo_free_item?.reference?.id || product.bogo_free_item?.value || null}
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

                <div className="mt-6 lg:mt-16 flex justify-center">
                    <Link
                        to={isEn ? "/en/collections/all" : "/collections/all"}
                        className="px-16 py-3 border-2 border-[#234745] text-[#234745] hover:bg-[#234745] hover:!text-white rounded-full font-bold text-[18px] transition-all min-w-[280px] text-center"
                    >
                        {isEn ? 'View All Products' : 'عرض جميع المنتجات'}
                    </Link>
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
                className="w-full h-12 rounded-full font-bold text-[15px] bg-amber-500 hover:bg-amber-600 transition-colors shadow-sm"
                style={{ color: '#ffffff' }}
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
            className={`w-full py-3.5 rounded-full font-bold text-[16px] transition-all shadow-sm ${isPreorder ? 'bg-[#004f59] hover:bg-[#003d45]' : 'bg-[#234745] hover:bg-[#163529] active:scale-[0.98]'}`}
            style={{ color: '#ffffff' }}
            disabled={isOutOfStock}
        >
            {addLabel}
        </AddToCartButton>
    );
}

