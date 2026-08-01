import { data, type LoaderFunctionArgs, type MetaFunction, useLoaderData, Link, useRouteLoaderData, useSearchParams } from 'react-router';
import { useState, useEffect, useRef } from 'react';
import { ProductItem } from '~/components/ProductItem';
import { PageHeader } from '~/components/layout/PageHeader';

function ProductSlider({ products }: { products: any[] }) {
    const sliderRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const checkScrollable = () => {
        if (!sliderRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
        const maxScroll = scrollWidth - clientWidth;
        if (maxScroll <= 5) {
            setCanScrollLeft(false);
            setCanScrollRight(false);
            return;
        }

        const absScroll = Math.abs(scrollLeft);
        setCanScrollLeft(absScroll > 5);
        setCanScrollRight(absScroll < maxScroll - 5);
    };

    useEffect(() => {
        checkScrollable();
        const timer = setTimeout(checkScrollable, 100);
        window.addEventListener('resize', checkScrollable);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', checkScrollable);
        };
    }, [products]);

    const scroll = (direction: 'left' | 'right') => {
        if (!sliderRef.current) return;
        const container = sliderRef.current;
        const firstCard = container.querySelector<HTMLElement>('[data-slider-item]');
        const step = firstCard ? firstCard.offsetWidth + 24 : 304;
        const scrollAmount = direction === 'left' ? -step : step;
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    };

    return (
        <div className="relative w-full group py-2">
            {/* Navigation Arrows */}
            {canScrollLeft && (
                <button
                    onClick={() => scroll('left')}
                    className="hidden lg:flex absolute -left-5 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white hover:bg-gray-50 text-[#234745] border border-gray-200 rounded-full items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95 outline-none"
                    aria-label="Previous Product"
                    type="button"
                >
                    <svg className="w-6 h-6 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            )}

            {canScrollRight && (
                <button
                    onClick={() => scroll('right')}
                    className="hidden lg:flex absolute -right-5 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white hover:bg-gray-50 text-[#234745] border border-gray-200 rounded-full items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95 outline-none"
                    aria-label="Next Product"
                    type="button"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            )}

            {/* Scrollable Container with Padding (No Card Cropping) */}
            <div
                ref={sliderRef}
                onScroll={checkScrollable}
                className="flex gap-6 overflow-x-auto hide-scrollbars py-4 px-2 snap-x snap-mandatory scroll-smooth"
            >
                {products.map((product: any) => (
                    <div key={product.id} data-slider-item className="w-[260px] sm:w-[280px] md:w-[290px] shrink-0 snap-start">
                        <ProductItem product={product} loading="lazy" />
                    </div>
                ))}
            </div>
        </div>
    );
}

export const meta: MetaFunction = () => {
    return [{ title: `Saadeddin | Gifting` }];
};

const PRODUCT_ITEM_FRAGMENT = `#graphql
  fragment GiftingProductItem on Product {
    id
    handle
    title
    featuredImage {
      id
      altText
      url
      width
      height
    }
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
      maxVariantPrice {
        amount
        currencyCode
      }
    }
    compareAtPriceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    availableForSale
    variants(first: 10) {
      nodes {
        id
        title
        availableForSale
        quantityAvailable
        selectedOptions {
          name
          value
        }
        price {
          amount
          currencyCode
        }
      }
    }
    tags
  }
` as const;

export async function loader({ context }: LoaderFunctionArgs) {
    const { storefront } = context;

    const query = `#graphql
    ${PRODUCT_ITEM_FRAGMENT}
    query GiftingProducts($country: CountryCode, $language: LanguageCode) @inContext(country: $country, language: $language) {
      collections(first: 100) {
        nodes {
          id
          title
          handle
          image {
            url
            altText
          }
        }
      }
      products(first: 200, query: "tag:gifting OR tag:gift") {
        nodes {
          ...GiftingProductItem
        }
      }
    }
  `;

    try {
        const { products, collections } = await storefront.query(query, {
            variables: {
                country: storefront.i18n.country,
                language: storefront.i18n.language,
            },
            cache: storefront.CacheNone(),
        });

        return data({ products: products.nodes, collections: collections.nodes, error: null });
    } catch (e: any) {
        return data({ products: [], collections: [], error: e.message });
    }
}

const arabicNameMap: Record<string, string> = {
    'gifts-for-mother': 'الأم',
    'gifts-for-father': 'الأب',
    'gifts-for-fathers': 'الأب',
    'gifts-for-friends': 'الأصدقاء',
    'gifts-for-colleagues': 'الزملاء',
    'gifts-for-children': 'الأطفال',
    'gifts-for-kids': 'الأطفال',
    'gifts-for-corporate': 'الشركات',
    'gifts-for-companies': 'الشركات',
};

const englishNameMap: Record<string, string> = {
    'gifts-for-mother': 'Mother',
    'gifts-for-father': 'Father',
    'gifts-for-fathers': 'Father',
    'gifts-for-friends': 'Friends',
    'gifts-for-colleagues': 'Colleagues',
    'gifts-for-children': 'Children',
    'gifts-for-kids': 'Children',
    'gifts-for-corporate': 'Corporate',
    'gifts-for-companies': 'Corporate',
};

const staticRecipientsEn = [
    { name: 'Mother', handle: 'gifts-for-mother', fallbackImg: 'https://images.unsplash.com/photo-1596464522432-843818e6c79a?q=80&w=800&auto=format&fit=crop' },
    { name: 'Father', handle: 'gifts-for-father', fallbackImg: 'https://images.unsplash.com/photo-1620052581693-559d7d4f1345?q=80&w=800&auto=format&fit=crop' },
    { name: 'Friends', handle: 'gifts-for-friends', fallbackImg: 'https://images.unsplash.com/photo-1529156069898-49953eb1b5ae?q=80&w=800&auto=format&fit=crop' },
    { name: 'Colleagues', handle: 'gifts-for-colleagues', fallbackImg: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?q=80&w=800&auto=format&fit=crop' },
    { name: 'Children', handle: 'gifts-for-children', fallbackImg: 'https://images.unsplash.com/photo-1510439401736-22463e26f59c?q=80&w=800&auto=format&fit=crop' },
    { name: 'Corporate', handle: 'gifts-for-corporate', fallbackImg: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?q=80&w=800&auto=format&fit=crop' },
];

const staticRecipientsAr = [
    { name: 'الأم', handle: 'gifts-for-mother', fallbackImg: 'https://images.unsplash.com/photo-1596464522432-843818e6c79a?q=80&w=800&auto=format&fit=crop' },
    { name: 'الأب', handle: 'gifts-for-father', fallbackImg: 'https://images.unsplash.com/photo-1620052581693-559d7d4f1345?q=80&w=800&auto=format&fit=crop' },
    { name: 'الأصدقاء', handle: 'gifts-for-friends', fallbackImg: 'https://images.unsplash.com/photo-1529156069898-49953eb1b5ae?q=80&w=800&auto=format&fit=crop' },
    { name: 'الزملاء', handle: 'gifts-for-colleagues', fallbackImg: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?q=80&w=800&auto=format&fit=crop' },
    { name: 'الأطفال', handle: 'gifts-for-children', fallbackImg: 'https://images.unsplash.com/photo-1510439401736-22463e26f59c?q=80&w=800&auto=format&fit=crop' },
    { name: 'الشركات', handle: 'gifts-for-corporate', fallbackImg: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?q=80&w=800&auto=format&fit=crop' },
];

export default function GiftingPage() {
    const { products, collections, error } = useLoaderData<typeof loader>();
    const rootData = useRouteLoaderData('root') as any;
    const locale = rootData?.locale || 'ar';
    const isEn = locale === 'en';

    const categories = [
        { id: 'all', en: 'All', ar: 'الكل' },
        { id: 'father', en: 'Father', ar: 'الأب' },
        { id: 'mother', en: 'Mother', ar: 'الأم' },
        { id: 'friends', en: 'Friends', ar: 'الأصدقاء' },
        { id: 'colleagues', en: 'Colleagues', ar: 'الزملاء' },
        { id: 'children', en: 'Children', ar: 'الأطفال' },
        { id: 'corporate', en: 'Corporate', ar: 'الشركات' },
    ];

    const [searchParams, setSearchParams] = useSearchParams();
    const urlCategory = searchParams.get('category');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(urlCategory || null);

    useEffect(() => {
        setSelectedCategory(urlCategory || null);
    }, [urlCategory]);

    // Build Gifting Cards using Shopify Collections or Static Metadata
    const giftingCollections = (collections || []).filter((c: any) => c.handle.startsWith('gifts-for-'));

    const recipientCards = giftingCollections.length > 0
        ? giftingCollections.map((c: any) => {
            const handleKey = c.handle.toLowerCase();
            const catId = c.handle.replace('gifts-for-', '');
            let name = c.title;
            if (isEn) {
                name = englishNameMap[handleKey] || c.title;
            } else {
                const hasArabicLetters = /[\u0600-\u06FF]/.test(c.title || '');
                name = hasArabicLetters ? c.title : (arabicNameMap[handleKey] || c.title);
            }
            return {
                name,
                catId,
                handle: c.handle,
                image: c.image?.url || 'https://images.unsplash.com/photo-1596464522432-843818e6c79a?q=80&w=800&auto=format&fit=crop'
            };
        })
        : (isEn ? staticRecipientsEn : staticRecipientsAr).map(r => {
            const shopifyColl = collections?.find((c: any) => c.handle === r.handle || c.handle === r.handle + 's');
            const catId = r.handle.replace('gifts-for-', '');
            return {
                ...r,
                catId,
                image: shopifyColl?.image?.url || r.fallbackImg,
            };
        });

    // Filter products based on selected category tags
    const filteredProducts = products.filter((p: any) => {
        if (!selectedCategory || selectedCategory === 'all') return true;

        const cat = categories.find(c => c.id === selectedCategory);
        if (!cat) return true;

        const tags = (p.tags || []).map((t: string) => t.toLowerCase());
        return tags.includes(cat.id.toLowerCase()) ||
            tags.includes(cat.en.toLowerCase()) ||
            tags.includes(cat.ar.toLowerCase()) ||
            tags.includes(`gifting_${cat.id}`) ||
            tags.includes(`gifts-for-${cat.id}`);
    });

    const displayProducts = filteredProducts;
    const selectedCatLabel = isEn
        ? (categories.find(c => c.id === selectedCategory)?.en || selectedCategory)
        : (categories.find(c => c.id === selectedCategory)?.ar || selectedCategory);

    const isInitialLanding = !selectedCategory;

    return (
        <div className={`min-h-screen bg-white ${isEn ? 'font-en' : "font-['GE_Dinar_One']"}`} dir={isEn ? 'ltr' : 'rtl'}>

            {/* Hero Section */}
            <PageHeader
                title={isEn ? 'Gifts suitable for all loved ones' : 'هدايا مناسبة لكل الاحباء'}
                subtitle={isEn ? 'Who are you gifting?' : 'بتهدي لمين؟'}
                isEn={isEn}
            />

            {/* FIRST LOAD: Gifting Cards Grid (Homepage Style) */}
            {isInitialLanding ? (
                <div className="max-w-[1200px] mx-auto px-4 lg:px-8 py-10 pb-16">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
                        {recipientCards.map((recipient, index) => (
                            <Link
                                key={index}
                                to={isEn ? `/en/gifting?category=${recipient.catId}` : `/gifting?category=${recipient.catId}`}
                                onClick={() => setSelectedCategory(recipient.catId)}
                                className="group flex flex-col relative rounded-[16px] overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 shadow-sm"
                                style={{ aspectRatio: '1/1' }}
                            >
                                <div className="w-full h-full relative">
                                    <img
                                        src={recipient.image}
                                        alt={recipient.name}
                                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                                    />
                                    {/* Bottom Gradient Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

                                    {/* Label Text Overlay */}
                                    <div className="absolute bottom-4 left-0 right-0 text-center px-3">
                                        <h3 className="text-[20px] md:text-[24px] lg:text-[28px] font-bold text-white drop-shadow-md">
                                            {recipient.name}
                                        </h3>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            ) : (
                /* INNER PAGE: Gifting Category View with Back Button, Filter Pills & Products */
                <>
                    {/* Back to All Gifts Navigation */}
                    <div className="max-w-[1200px] mx-auto px-4 lg:px-8 pt-8 pb-4">
                        <button
                            onClick={() => {
                                setSelectedCategory(null);
                                setSearchParams({});
                            }}
                            className="inline-flex items-center gap-2 text-[#234745] hover:text-[#1a3533] font-bold text-[15px] transition-colors bg-[#FEF8EB] px-5 py-2 rounded-full border border-[#234745]/20 hover:border-[#234745]"
                        >
                            <svg className={`w-4 h-4 ${isEn ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            <span>{isEn ? 'All Gifts' : 'جميع الهدايا'}</span>
                        </button>
                    </div>

                    {/* Products Section */}
                    <div className="max-w-[1200px] mx-auto px-4 lg:px-8 pb-16">
                        <h2 className="text-[24px] lg:text-[32px] font-black text-[#1A1A1A] mb-8">
                            {selectedCategory === 'all'
                              ? (isEn ? 'All Gift Items' : 'جميع منتجات الهدايا')
                              : (isEn ? `Suggestions for ${selectedCatLabel}` : `مقترحات لـ ${selectedCatLabel}`)}
                        </h2>

                        {displayProducts.length > 0 ? (
                            <ProductSlider products={displayProducts} />
                        ) : (
                            <div className="text-center py-12 text-[#8B8B8B] font-bold">
                                {isEn ? 'No products found for this category.' : 'لا توجد منتجات لهذه الفئة.'}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Promotional Banners */}
            <div className="max-w-[1200px] mx-auto px-4 lg:px-8 pb-32 lg:pb-48 flex flex-col gap-12 lg:gap-20">

                {/* Custom Cake Banner */}
                <Link to={isEn ? '/en/custom-cake' : '/custom-cake'} className="block w-full transition-transform hover:scale-[1.01]">
                    <div className="w-full bg-[#EED5D7] rounded-[24px] flex flex-col md:flex-row items-center relative overflow-hidden min-h-[200px] lg:min-h-[220px]">

                        {/* Content Side */}
                        <div className={`w-full md:w-[60%] flex flex-col relative z-10 px-8 lg:px-16 py-10 items-center md:items-start text-center md:text-start`}>
                            <h2
                                className={`text-[26px] font-bold text-[#234745] mb-2`}
                                style={{ fontFamily: !isEn ? "'Bahij Janna', sans-serif" : undefined, lineHeight: '100%' }}
                            >
                                {isEn ? "Didn't find what you're looking for?" : 'لم تجد ما تبحث عنه؟'}
                            </h2>
                            <p
                                className="text-[#7D7D7D] font-medium text-[16px] !mb-6"
                                style={{ fontFamily: !isEn ? "'GE Dinar One', sans-serif" : undefined, lineHeight: '100%' }}
                            >
                                {isEn ? 'No problem! You can design your own cake easily now.' : 'لا مشكلة! يمكنك تصميم كيكتك الخاصة الان وبكل سهولة'}
                            </p>
                            <div className="bg-[#234745] hover:bg-[#1a3533] text-[#FEF8EB] px-10 py-3 rounded-[25px] font-bold transition-all w-max shadow-sm mt-2">
                                {isEn ? 'Design Your Cake' : 'صمم كيكتك'}
                            </div>
                        </div>

                        {/* Image Side */}
                        <div className="w-full md:w-[40%] h-full flex items-center justify-center p-6 lg:p-8 relative z-10 shrink-0">
                            <img
                                src="/images/custom-cake.webp"
                                className="w-full h-auto object-contain max-w-[200px] lg:max-w-[240px]"
                                alt="Custom Cake Design"
                            />
                        </div>

                    </div>
                </Link>

                {/* Gift Voucher Banner */}
                <Link to={isEn ? '/en/vouchers' : '/vouchers'} className="block w-full transition-transform hover:scale-[1.01]">
                    <div className="w-full bg-[#FEF8EB] rounded-[24px] flex flex-col md:flex-row items-center relative overflow-hidden min-h-[300px] lg:min-h-[340px]">

                        {/* Weave Pattern behind text */}
                        <div
                            className={`absolute top-0 ${isEn ? 'left-0' : 'right-0'} w-[55%] h-full opacity-40 pointer-events-none`}
                            style={{
                                backgroundImage: 'url("/images/offers-pattern.svg")',
                                backgroundRepeat: 'repeat',
                                backgroundSize: '300px',
                                maskImage: `linear-gradient(${isEn ? 'to right' : 'to left'}, black 40%, transparent 100%)`,
                                WebkitMaskImage: `linear-gradient(${isEn ? 'to right' : 'to left'}, black 40%, transparent 100%)`
                            }}
                        />

                        {/* Content Side */}
                        <div className={`w-full md:w-[55%] flex flex-col relative z-10 px-8 lg:px-16 py-12 items-center md:items-start text-center md:text-start`}>
                            <div
                                className="text-white text-[14px] font-bold mb-6 shadow-sm flex items-center justify-center w-max"
                                style={{
                                    background: '#E64950',
                                    borderRadius: '25px',
                                    padding: '6px 16px'
                                }}
                            >
                                {isEn ? 'Gift Voucher' : 'قسيمة هدية'}
                            </div>

                            <div className="mb-6 space-y-2 w-full">
                                {isEn ? (
                                    <h3 className="text-[28px] lg:text-[40px] font-bold text-[#1a1a1a] leading-[1.2] tracking-tighter">
                                        Gift Your Loved Ones Saadeddin Voucher
                                    </h3>
                                ) : (
                                    <>
                                        <h3
                                            className="text-[26px] font-bold text-[#234745]"
                                            style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif", lineHeight: '100%' }}
                                        >
                                            أهدِ من تحب
                                        </h3>
                                        <h3
                                            className="text-[26px] font-bold text-[#234745]"
                                            style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif", lineHeight: '100%' }}
                                        >
                                            قسيمة سعد الدين
                                        </h3>
                                    </>
                                )}
                            </div>

                            <p
                                className="text-[#7D7D7D] font-medium text-[16px] max-w-[340px] !mb-4"
                                style={{ fontFamily: !isEn ? "'GE Dinar One', sans-serif" : undefined, lineHeight: '100%' }}
                            >
                                {isEn ? 'Choose value, add message, and send instantly' : 'اختار القيمة، أضف رسالتك، وأرسلها فوراً'}
                            </p>

                            <div
                                className="bg-[#234745] hover:bg-[#1a3533] flex items-center justify-center transition-all font-bold w-max mt-2"
                                style={{
                                    borderRadius: '25px',
                                    padding: '12px 32px',
                                    color: '#FEF8EB'
                                }}
                            >
                                {isEn ? 'Buy Voucher Now' : 'إشتري قسيمة الان'}
                            </div>
                        </div>

                        {/* Image Side */}
                        <div className="w-full md:w-[45%] h-full flex items-center justify-center p-8 lg:p-12 relative z-10 shrink-0">
                            <img
                                src="/images/voucher.webp"
                                alt="Saadeddin Gift Voucher"
                                className="w-full h-auto object-contain max-w-[400px] drop-shadow-xl"
                                loading="lazy"
                            />
                        </div>

                    </div>
                </Link>

            </div>
        </div>
    );
}
