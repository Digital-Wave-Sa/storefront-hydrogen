import { Await, Link, useOutletContext } from 'react-router';
import { Suspense, useEffect, useState } from 'react';
import { Image, Money } from '@shopify/hydrogen';
import { Price } from './Price';
import { useI18n } from '~/lib/i18n';
import { useAside } from '~/components/Aside';
import { getVisibilityStatus } from '~/lib/visibility';
import { getIsOutOfStock, shouldHideProduct } from '~/lib/stock';
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
            }).catch(() => { });
        }
    }, [customer]);

    const getProductUrl = (handle: string) => isEn ? `/en/products/${handle}` : `/products/${handle}`;

    const handleNotifyClick = (title: string, variantId: string) => {
        setSelectedProduct({ title, variantId });
        setIsNotifyModalOpen(true);
    };

    return (
        <section dir={isEn ? 'ltr' : 'rtl'} className={`hidden md:block w-full bg-white lg:py-16 ${isEn ? 'font-en' : 'font-ar'}`} style={{ paddingTop: '50px', paddingBottom: '50px' }}>
            <div className="max-w-[1400px] mx-auto px-4 md:px-8">

                {/* Section Header */}
                <div className="text-center mb-8 flex flex-col items-center">
                    <h2 className="text-[32px] lg:text-[42px] font-bold text-[#1a1a1a] !mb-2 leading-tight" style={!isEn ? { fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" } : undefined}>
                        {isEn ? 'Featured Collections' : 'التشكيلات المميزة'}
                    </h2>
                    <p className="text-[#8a9e9a] text-[14px] lg:text-[16px] font-medium" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                        {isEn ? 'Collections crafted with ultimate care, telling the story of the craft since 1919' : 'تشكيلات صنعت بعناية فائقة، تحكي قصة الحرفة منذ 1919'}
                    </p>
                </div>

                {/* Products Grid */}
                <Suspense fallback={<div className="text-center py-20 text-gray-500">{t.common.loadingArrivals}</div>}>
                    <Await resolve={products}>
                        {(resolvedData) => {
                            const tagged = (resolvedData as any)?.taggedProducts?.nodes || [];
                            const all = (resolvedData as any)?.allProducts?.nodes || (resolvedData as any)?.products?.nodes || [];
                            const productNodes = tagged.length > 0 ? tagged : all;
                            const visibleProducts = productNodes.filter((p: any) => !shouldHideProduct(p, selectedLocationId, selectedLocationName));
                            return (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                        {visibleProducts.slice(0, 4).map((product: any, idx: number) => {
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
                                            const isLimitedTime = !!product.is_limited_time?.value;

                                            const tagText = isEn
                                                ? (idx % 2 === 0 ? '⏱ Requires 2 days prep' : 'Pay in 2 with Tamara')
                                                : (idx % 2 === 0 ? '⏱ يحتاج يومين للتجهيز' : 'قسطها على دفعتين مع تمارا');

                                            return (
                                                <div key={product.id} className={`flex flex-col h-full rounded-2xl bg-white overflow-hidden relative border border-gray-100 transition-all ${isVisibilityBlocked ? 'product--disabled opacity-60 grayscale-[30%]' : 'group'}`}>
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
                                                            aria-label={isWishlisted ? "Remove from Wishlist" : "Add to Wishlist"}
                                                            className={`absolute top-2.5 md:top-3.5 ${isEn ? 'right-2.5 md:right-3.5' : 'left-2.5 md:left-3.5'} z-20 w-7 h-7 md:w-10 md:h-10 p-0 rounded-full bg-white shadow-md transition-all flex items-center justify-center ${isWishlisted ? 'text-[#e74c3c]' : 'text-gray-700 hover:text-[#e74c3c]'}`}
                                                        >
                                                            <svg className="w-3.5 h-3.5 md:w-5 md:h-5" viewBox="0 0 24 24" fill={isWishlisted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
                                                                <path d="M20.8 4.6a5.5 5.5 0 00-7.7 0l-1.1 1-1.1-1a5.5 5.5 0 00-7.8 7.8l1 1 7.9 7.9 7.9-7.9 1-1a5.5 5.5 0 000-7.8z" />
                                                            </svg>
                                                        </button>
                                                    )}

                                                    {/* Status Badge Overlay (Top Corner: Top-Right in RTL, Top-Left in LTR) */}
                                                    <div className={`absolute top-2 md:top-3 ${isEn ? 'left-2 md:left-3' : 'right-2 md:right-3'} z-10`}>
                                                        {isVisibilityBlocked ? (
                                                            <span
                                                                className="flex items-center justify-center px-3.5 py-1.5 rounded-full font-bold text-[12px] whitespace-nowrap shadow-sm text-white bg-[#234745]/90 backdrop-blur-md"
                                                                style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                                                            >
                                                                {isEn ? 'Out for the Season' : 'نفد للموسم'}
                                                            </span>
                                                        ) : isOutOfStock && !isPreorder ? (
                                                            <span
                                                                className="flex items-center justify-center px-3.5 py-1.5 rounded-full font-bold text-[12px] whitespace-nowrap shadow-sm text-white bg-[#E64950] backdrop-blur-md"
                                                                style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                                                            >
                                                                {isEn ? 'Out of Stock' : 'نفذت الكمية'}
                                                            </span>
                                                        ) : isPreorder ? (
                                                            <span
                                                                className="flex items-center justify-center px-3.5 py-1.5 rounded-full font-bold text-[12px] whitespace-nowrap shadow-sm text-white bg-[#234745]/90 backdrop-blur-md"
                                                                style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                                                            >
                                                                {t.common.preOrder}
                                                            </span>
                                                        ) : null}
                                                    </div>

                                                    {/* Product Image */}
                                                    <Link
                                                        to={getProductUrl(product.handle)}
                                                        aria-label={product.title}
                                                        className="relative block bg-[#F8F9F8] aspect-[4/3] w-full flex items-center justify-center p-0 overflow-hidden"
                                                    >
                                                        {product.images?.nodes?.[0] && (
                                                            <Image
                                                                data={product.images.nodes[0]}
                                                                alt=""
                                                                loading="lazy"
                                                                sizes="(min-width: 45em) 25vw, 50vw"
                                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                                style={{ opacity: isVisibilityBlocked ? 0.5 : (effectiveOutOfStock ? 0.4 : 1), filter: isVisibilityBlocked ? 'grayscale(1)' : 'none' }}
                                                            />
                                                        )}
                                                    </Link>

                                                    {/* Product Info */}
                                                    <div className="bg-white p-5 flex flex-col flex-grow">

                                                        {/* Title */}
                                                        <Link to={getProductUrl(product.handle)}>
                                                            <h3 className={`font-bold text-[#234745] text-[16px] line-clamp-1 transition-colors duration-300 ${isEn ? 'text-left' : 'text-right'} ${isVisibilityBlocked ? '' : 'hover:text-[#1a3a2d]'}`} style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", fontSize: '16px', lineHeight: '24px', opacity: effectiveOutOfStock ? 0.4 : 1 }}>
                                                                {product.title}
                                                            </h3>
                                                        </Link>

                                                        {/* Price — preserved height placeholder for visibility blocked seasonal products */}
                                                        <div className="mt-2 mb-4 flex items-center gap-3 min-h-[32px]" style={{ opacity: effectiveOutOfStock ? 0.4 : 1 }}>
                                                            {!isVisibilityBlocked ? (
                                                                <>
                                                                    <Price
                                                                        data={product.priceRange.minVariantPrice}
                                                                        isEn={isEn}
                                                                        size="lg"
                                                                        className="text-[#234745] font-bold"
                                                                    />
                                                                    {hasDiscount && (
                                                                        <span className="text-[#E64950] line-through">
                                                                            <Price data={compareAtPrice} isEn={isEn} size="md" showSymbol={false} />
                                                                        </span>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <div className="h-[24px]" />
                                                            )}
                                                        </div>

                                                        {/* Add to Cart Button */}
                                                        <div className="mt-auto">
                                                            {isVisibilityBlocked ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleNotifyClick(product.title, variant?.id)}
                                                                    className="w-full h-[40px] md:h-[44px] px-2 md:px-4 flex items-center justify-center gap-1.5 rounded-full font-bold text-[12px] md:text-[14px] bg-[#906B51] hover:bg-[#7d5c45] text-white shadow-sm transition-all duration-300 active:scale-95"
                                                                    style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                                                                >
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                                                                        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                                                        <path d="M13.73 21a2 2 0 01-3.46 0" />
                                                                    </svg>
                                                                    <span>{isEn ? 'Notify for Next Season' : 'أبلغني في الموسم القادم'}</span>

                                                                </button>
                                                            ) : (
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

                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* View All Button */}
                                    <div className="mt-8 lg:mt-12 flex justify-center">
                                        <Link
                                            to={isEn ? "/en/collections/all" : "/collections/all"}
                                            className="px-12 py-4 rounded-full border-2 border-[#234745] !text-[#234745] [font-family:'GE_Dinar_One',sans-serif] font-bold text-[15px] lg:text-[18px] transition-all hover:bg-[#1a3533] hover:!text-white hover:border-[#1a3533] active:scale-95"
                                            style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                                        >
                                            {isEn ? 'View All Collections' : 'عرض جميع التشكيلات'}
                                        </Link>
                                    </div >
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
        </section >
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
    const { open: openAside } = useAside();
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
                className="w-full h-[40px] md:h-[44px] px-2 md:px-4 flex items-center justify-center rounded-full font-bold text-[12px] md:text-[15px] bg-[#234745] text-white hover:bg-[#163529] shadow-sm transition-all duration-300 active:scale-95 relative z-20"
                style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
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
            className={`w-full h-[40px] md:h-[44px] px-2 md:px-4 flex items-center justify-center rounded-full font-bold text-[12px] md:text-[15px] shadow-sm transition-all duration-300 active:scale-95 ${isPreorder ? 'bg-[#004f59] text-white hover:bg-[#003d45]' : 'bg-[#234745] text-white hover:bg-[#163529]'}`}
            disabled={isOutOfStock}
            style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
        >
            {addLabel}
        </AddToCartButton>
    );
}
