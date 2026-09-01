import { Await, Link, useOutletContext, useRouteLoaderData } from 'react-router';
import { Suspense, useEffect, useId, useState } from 'react';
import { Image, Money } from '@shopify/hydrogen';
import { Price } from './Price';
import { Button } from './layout/Button';
import { useI18n } from '~/lib/i18n';
import { useAside } from '~/components/Aside';
import { getVisibilityStatus } from '~/lib/visibility';
import { getIsOutOfStock, shouldHideProduct, isOutOfStockAtBranch, findBranchLocation } from '~/lib/stock';
import { useBranchAvailabilityReader } from '~/lib/useBranchAvailability';
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
    const [selectedProduct, setSelectedProduct] = useState<{ title: string, variantId: string } | null>(null);

    const { locale = 'ar', selectedLocationName, selectedLocationId, customer } = useOutletContext<{ locale?: string, selectedLocationName?: string, selectedLocationId?: string, customer?: Promise<any> }>() ?? {};

    /**
     * Real stock at the chosen branch. `storeAvailability` — the fallback used
     * below — lists only pickup-enabled locations and is empty for many
     * products, at which point the old check reduced to the global
     * availableForSale flag and every card offered Add to Cart everywhere.
     */
    const bsRootData = useRouteLoaderData('root') as any;
    const bsLocations = bsRootData?.locations?.locations?.nodes || bsRootData?.locations?.nodes || [];
    const bsBranch = findBranchLocation(bsLocations, selectedLocationId, selectedLocationName);
    const { read: readBranchStock } = useBranchAvailabilityReader(bsBranch?.id);
    const [customerEmail, setCustomerEmail] = useState<string | undefined>(undefined);

    useEffect(() => {
        let mounted = true;
        if (customer && typeof customer.then === 'function') {
            customer.then((res: any) => {
                if (mounted && res?.customer?.email) setCustomerEmail(res.customer.email);
            }).catch(() => { });
        }
        return () => { mounted = false; };
    }, [customer]);

    const [activeTab, setActiveTab] = useState(0);

    const t = useI18n(locale);
    const isEn = locale === 'en';

    const tabs = isEn
        ? ['All', 'Kunafa', 'Cakes', 'Chocolate', 'Gifts']
        : ['الكل', 'كنافة', 'الكيك', 'الشوكولاته', 'الهدايا'];

    const getProductUrl = (handle: string) => isEn ? `/en/products/${handle}` : `/products/${handle}`;

    const handleNotifyClick = (title: string, variantId: string) => {
        setSelectedProduct({ title, variantId });
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
                    <h2 className="text-[36px] lg:text-[48px] font-bold !mb-2 leading-tight" style={{ color: '#ffffff' }}>
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
                            // Dynamically resolve products based on activeTab
                            const getNodes = (coll: any) => coll?.products?.nodes || [];
                            const fallback = (resolvedData as any).fallbackProducts?.nodes || (resolvedData as any).products?.nodes || [];

                            let tabProducts = [];
                            switch (activeTab) {
                                case 0: { // All
                                    const bs = getNodes((resolvedData as any).bestSellers);
                                    tabProducts = bs.length > 0 ? bs : fallback;
                                    break;
                                }
                                case 1: { // Sweets / الحلويات
                                    const sweets = getNodes((resolvedData as any).sweets);
                                    const kunafa = getNodes((resolvedData as any).kunafa);
                                    tabProducts = sweets.length > 0 ? sweets : (kunafa.length > 0 ? kunafa : []);
                                    if (tabProducts.length === 0) {
                                        tabProducts = fallback.filter((p: any) => {
                                            const type = (p.productType || '').toLowerCase();
                                            const tags = (p.tags || []).map((t: string) => t.toLowerCase());
                                            const title = (p.title || '').toLowerCase();
                                            return type.includes('sweets') || type.includes('kunafa') || type.includes('حلويات') || type.includes('كنافة') ||
                                                title.includes('sweets') || title.includes('kunafa') || title.includes('حلويات') || title.includes('كنافة') || title.includes('warbat') || title.includes('وربات') ||
                                                tags.some((t: string) => t.includes('sweets') || t.includes('kunafa') || t.includes('حلويات') || t.includes('كنافة'));
                                        });
                                    }
                                    break;
                                }
                                case 2: { // Cakes
                                    const cake = getNodes((resolvedData as any).cake);
                                    const cakes = getNodes((resolvedData as any).cakes);
                                    const chocCake = getNodes((resolvedData as any).chocolateCake);
                                    tabProducts = cake.length > 0 ? cake : (cakes.length > 0 ? cakes : (chocCake.length > 0 ? chocCake : []));
                                    if (tabProducts.length === 0) {
                                        tabProducts = fallback.filter((p: any) => {
                                            const type = (p.productType || '').toLowerCase();
                                            const tags = (p.tags || []).map((t: string) => t.toLowerCase());
                                            const title = (p.title || '').toLowerCase();
                                            return type.includes('cake') || type.includes('كيك') ||
                                                title.includes('cake') || title.includes('كيك') ||
                                                tags.some((t: string) => t.includes('cake') || t.includes('كيك'));
                                        });
                                    }
                                    break;
                                }
                                case 3: { // Chocolate
                                    const choc = getNodes((resolvedData as any).chocolate);
                                    tabProducts = choc.length > 0 ? choc : [];
                                    if (tabProducts.length === 0) {
                                        tabProducts = fallback.filter((p: any) => {
                                            const type = (p.productType || '').toLowerCase();
                                            const tags = (p.tags || []).map((t: string) => t.toLowerCase());
                                            const title = (p.title || '').toLowerCase();
                                            return type.includes('chocolate') || type.includes('شوكولاته') || type.includes('شوكولاتة') ||
                                                title.includes('chocolate') || title.includes('شوكولاته') || title.includes('شوكولاتة') ||
                                                tags.some((t: string) => t.includes('chocolate') || t.includes('شوكولاته') || t.includes('شوكولاتة'));
                                        });
                                    }
                                    break;
                                }
                                case 4: { // Gifts
                                    const gifts = getNodes((resolvedData as any).gifts);
                                    const gifting = getNodes((resolvedData as any).gifting);
                                    tabProducts = gifts.length > 0 ? gifts : (gifting.length > 0 ? gifting : []);
                                    if (tabProducts.length === 0) {
                                        tabProducts = fallback.filter((p: any) => {
                                            const type = (p.productType || '').toLowerCase();
                                            const tags = (p.tags || []).map((t: string) => t.toLowerCase());
                                            const title = (p.title || '').toLowerCase();
                                            return type.includes('gift') || type.includes('gifting') || type.includes('هدايا') || type.includes('الهدايا') || type.includes('bundle') || type.includes('box') || type.includes('باقة') ||
                                                title.includes('gift') || title.includes('gifting') || title.includes('هدايا') || title.includes('الهدايا') || title.includes('bundle') || title.includes('box') || title.includes('باقة') || title.includes('add on') ||
                                                tags.some((t: string) => t.includes('gift') || t.includes('gifting') || t.includes('هدايا') || t.includes('الهدايا') || t.includes('bundle') || t.includes('box') || t.includes('باقة'));
                                        });
                                    }
                                    break;
                                }
                                default:
                                    tabProducts = fallback;
                            }

                            const visibleProducts = tabProducts
                                .filter((p: any) => !shouldHideProduct(p, selectedLocationId, selectedLocationName))
                                .slice(0, 8);

                            if (visibleProducts.length === 0) {
                                return (
                                    <div className="w-full text-center py-16 text-white/70 font-medium">
                                        {isEn ? 'No products found in this category' : 'لم يتم العثور على منتجات في هذه الفئة'}
                                    </div>
                                );
                            }
                            return (
                                <div className="flex md:grid md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6 overflow-x-auto md:overflow-visible hide-scrollbars snap-x snap-mandatory pb-8 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0">
                                    {visibleProducts.map((product: any, idx: number) => {
                                        const variant = product.variants?.nodes?.[0];
                                        const storeAvailabilityNodes = variant?.storeAvailability?.nodes || [];

                                        const bsVerdict = isOutOfStockAtBranch(readBranchStock(variant?.id));
                                        const isOutOfStock =
                                            bsVerdict !== null
                                                ? bsVerdict
                                                : getIsOutOfStock(
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
                                        const isLimitedTime = !!product.is_limited_time?.value;

                                        // Mock some dynamic text just for matching the UI design identically
                                        const tagText = isEn
                                            ? (idx % 2 === 0 ? 'Requires 2 days preparation' : 'Pay in 2 installments with Tamara')
                                            : (idx % 2 === 0 ? 'يحتاج يومين للتجهيز' : 'قسطها على دفعتين مع تمارا');

                                        const { toggleWishlist, isInWishlist } = useWishlist();
                                        const isWishlisted = isInWishlist(product.id);

                                        return (
                                            <div key={product.id} className={`snap-start shrink-0 w-[85vw] max-w-[320px] md:max-w-none md:w-full flex flex-col h-full rounded-[20px] border-0 overflow-hidden relative ${isVisibilityBlocked ? 'product--disabled grayscale-[30%]' : 'group hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)]'} transition-all duration-300`} style={{ backgroundColor: '#dce5df' }}>

                                                {/* Top Action / Heart */}
                                                {!isVisibilityBlocked && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            toggleWishlist({
                                                                id: product.id,
                                                                variantId: product.variants?.nodes?.[0]?.id,
                                                                title: product.title,
                                                                handle: product.handle,
                                                                image: product.images?.nodes?.[0],
                                                                priceRange: product.priceRange
                                                            });
                                                        }}
                                                        aria-label={
                isWishlisted
                  ? isEn ? "Remove from Wishlist" : "إزالة من المفضلة"
                  : isEn ? "Add to Wishlist" : "إضافة إلى المفضلة"
              }
                                                        className={`absolute top-2.5 md:top-3.5 ${isEn ? 'right-2.5 md:right-3.5' : 'left-2.5 md:left-3.5'} z-20 w-8 h-8 md:w-10 md:h-10 p-0 rounded-full bg-white shadow-md transition-all flex items-center justify-center ${isWishlisted ? 'text-[#e74c3c]' : 'text-gray-700 hover:text-[#e74c3c]'}`}
                                                    >
                                                        <svg width="20" height="20" viewBox="0 0 24 24" fill={isWishlisted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5"><path d="M20.8 4.6a5.5 5.5 0 00-7.7 0l-1.1 1-1.1-1a5.5 5.5 0 00-7.8 7.8l1 1 7.9 7.9 7.9-7.9 1-1a5.5 5.5 0 000-7.8z" /></svg>
                                                    </button>
                                                )}

                                                {/* Status Badge Overlay (Top Corner: Top-Right in RTL, Top-Left in LTR) */}
                                                <div className={`absolute top-2 md:top-3 ${isEn ? 'left-2 md:left-3' : 'right-2 md:right-3'} z-10`}>
                                                    {isVisibilityBlocked ? (
                                                        <span
                                                            className="flex items-center justify-center px-3.5 py-1.5 rounded-full font-bold text-[12px] whitespace-nowrap shadow-sm text-white bg-[#906b51] backdrop-blur-md"
                                                            style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                                                        >
                                                            {isEn ? 'Out of Season' : 'نفد للموسم'}
                                                        </span>
                                                    ) : isOutOfStock && !isPreorder ? (
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

                                                <Link
                                                    to={getProductUrl(product.handle)}
                                                    aria-label={product.title}
                                                    className="relative block aspect-[4/3] w-full flex items-center justify-center overflow-hidden"
                                                >
                                                    {product.images?.nodes?.[0] && (
                                                        <Image
                                                            data={product.images.nodes[0]}
                                                            alt=""
                                                            loading="lazy"
                                                            sizes="(min-width: 45em) 25vw, 50vw"
                                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                            style={{ opacity: isVisibilityBlocked ? 0.5 : (isOutOfStock && !isPreorder ? 0.4 : 1), filter: isVisibilityBlocked ? 'grayscale(1)' : 'none' }}
                                                        />
                                                    )}
                                                </Link>
                                                <div className="p-5 lg:p-6 flex flex-col flex-grow" style={{ backgroundColor: '#ffffff' }}>

                                                    {/* Title */}
                                                    <Link to={getProductUrl(product.handle)}>
                                                        <h3 className={`font-bold text-[#234745] text-[16px] line-clamp-1 transition-colors duration-300 ${isVisibilityBlocked ? '' : 'hover:text-[#1a3a2d]'}`} style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", fontSize: '16px', lineHeight: '24px', opacity: isOutOfStock && !isPreorder ? 0.4 : 1 }}>
                                                            {product.title}
                                                        </h3>
                                                    </Link>

                                                    {/* Price Row (Side by side) */}
                                                    <div className="mt-2 mb-4 flex items-center gap-3 justify-start min-h-[32px]" style={{ opacity: isOutOfStock && !isPreorder ? 0.4 : 1 }} dir={isEn ? 'ltr' : 'rtl'}>
                                                        {!isVisibilityBlocked ? (
                                                            <>
                                                                <div className="text-[#234745] flex items-baseline gap-1">
                                                                    <Price data={product.priceRange.minVariantPrice} isEn={isEn} showSymbol={true} size="lg" />
                                                                </div>
                                                                {hasDiscount && (
                                                                    <div className="text-[#E64950] line-through flex gap-1 items-baseline">
                                                                        <Price data={compareAtPrice} isEn={isEn} showSymbol={true} size="md" />
                                                                    </div>
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
                                                            <BestSellersAddToCart
                                                                variant={variant}
                                                                productTags={product.tags}
                                                                bogoFreeVariantId={product.bogo_free_item?.reference?.id || product.bogo_free_item?.value || null}
                                                                isOutOfStock={isOutOfStock && !isPreorder}
                                                                notifyLabel={isPreorder ? t.common.preOrder : (isEn ? 'Notify Me' : 'أبلغني عند التوفر')}
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
                            );
                        }}
                    </Await>
                </Suspense>

                <div className="mt-8 lg:mt-12 flex justify-center">
                    <Link
                        to={isEn ? "/en/collections/all" : "/collections/all"}
                        className="px-12 py-4 rounded-full border-2 border-[#234745] !text-[#234745] [font-family:'GE_Dinar_One',sans-serif] font-bold text-[15px] lg:text-[18px] transition-all hover:bg-[#1a3533] hover:!text-white hover:border-[#1a3533] active:scale-95"
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
    const { open: openAside } = useAside();
    const variantId = variant?.id;
    const isBogo = !!bogoFreeVariantId || (productTags?.some((t: string) => t.toLowerCase().includes('bogo')) ?? false);

    if (!variantId || isOutOfStock) {
        return (
            <button
                type="button"
                className="w-full h-[40px] md:h-[44px] px-2 md:px-4 flex items-center justify-center rounded-full font-bold text-[12px] md:text-[15px] bg-[#234745] text-white hover:bg-[#163529] shadow-sm transition-all duration-300 active:scale-95"
                style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
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

    const groupId = useId();
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
            style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
            disabled={isOutOfStock}
        >
            {addLabel}
        </AddToCartButton>
    );
}

