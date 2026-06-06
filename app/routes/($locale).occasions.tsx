import { data, type LoaderFunctionArgs, type MetaFunction, useLoaderData, Link, useRouteLoaderData, useSearchParams } from 'react-router';
import { useState, useEffect } from 'react';
import { ProductItem } from '~/components/ProductItem';
import patternBg from '~/assets/patteren-collection-header.svg';

export const meta: MetaFunction = () => {
    return [{ title: `Saadeddin | Occasions` }];
};

const PRODUCT_ITEM_FRAGMENT = `#graphql
  fragment ProductItem on Product {
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

    // Fetch products that match ANY of the standard occasion tags
    const query = `#graphql
    ${PRODUCT_ITEM_FRAGMENT}
    query OccasionsProducts($country: CountryCode, $language: LanguageCode) @inContext(country: $country, language: $language) {
      products(first: 200, query: "tag:wedding OR tag:ramadan OR tag:birthdays OR tag:eid OR tag:new-baby OR tag:national-day OR tag:mothers-day OR tag:graduation OR tag:occasion") {
        nodes {
          ...ProductItem
        }
      }
    }
  `;

    try {
        const { products } = await storefront.query(query, {
            variables: {
                country: storefront.i18n.country,
                language: storefront.i18n.language,
            },
            cache: storefront.CacheNone(),
        });

        return data({ products: products.nodes });
    } catch (e: any) {
        return data({ products: [], error: e.message });
    }
}

export default function OccasionsPage() {
    const { products, error } = useLoaderData<typeof loader>();
    const rootData = useRouteLoaderData('root') as any;
    const locale = rootData?.locale || 'ar';
    const isEn = locale === 'en';

    const categories = [
        { id: 'eid', en: 'Eid', ar: 'العيد' },
        { id: 'birthdays', en: 'Birthdays', ar: 'أعياد الميلاد' },
        { id: 'ramadan', en: 'Ramadan', ar: 'رمضان' },
        { id: 'wedding', en: 'Wedding', ar: 'زفاف' },
        { id: 'graduation', en: 'Graduation', ar: 'التخرج' },
        { id: 'mothers-day', en: 'Mother\'s Day', ar: 'يوم الأم' },
        { id: 'national-day', en: 'National Day', ar: 'اليوم الوطني' },
        { id: 'new-baby', en: 'New Baby', ar: 'طفل جديد' },
    ];

    const [searchParams] = useSearchParams();
    const urlCategory = searchParams.get('category');
    const [selectedCategory, setSelectedCategory] = useState(urlCategory || categories[0].id);

    useEffect(() => {
        if (urlCategory) {
            setSelectedCategory(urlCategory);
        }
    }, [urlCategory]);

    // Filter products based on selected category tags
    const filteredProducts = products.filter((p: any) => {
        const cat = categories.find(c => c.id === selectedCategory);
        if (!cat) return false;
        
        const tags = p.tags.map((t: string) => t.toLowerCase());
        return tags.includes(cat.id.toLowerCase()) || 
               tags.includes(cat.en.toLowerCase()) || 
               tags.includes(cat.ar.toLowerCase()) ||
               tags.includes(`occasion-${cat.id}`) ||
               tags.includes(cat.id.replace('-', '')); // Handle "mothersday" or "newbaby"
    });

    const displayProducts = filteredProducts;

    const selectedCatLabel = isEn ? categories.find(c => c.id === selectedCategory)?.en : categories.find(c => c.id === selectedCategory)?.ar;

    return (
        <div className={`min-h-screen bg-white ${isEn ? 'font-en' : "font-['GE_Dinar_One']"}`} dir={isEn ? 'ltr' : 'rtl'}>
            
            {/* Hero Section */}
            <section className="relative h-[132px] lg:h-auto w-full bg-[#234745] overflow-hidden flex flex-col justify-center items-center text-center px-4 lg:px-[80px] py-[16px] lg:py-24 gap-2 lg:gap-[8px]">
                <div 
                    className="absolute inset-0 pointer-events-none opacity-100" 
                    style={{ backgroundImage: `url(${patternBg})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} 
                />
                <h3 className="text-[#9FB7AE] text-[16px] lg:text-[18px] font-bold relative z-10">
                    {isEn ? 'CHOOSE THE OCCASION AND WE PICK THE BEST FOR YOU' : 'اختار المناسبة ونختار لك الأفضل'}
                </h3>
                <h1 className="text-[#FEF8EB] text-[32px] lg:text-[40px] font-black relative z-10 leading-none">
                    {isEn ? 'What is your occasion?' : 'ما هي مناسبتك؟'}
                </h1>
            </section>

            {/* Filter Pills */}
            <div className="w-full overflow-hidden">
                <div className="flex gap-3 lg:gap-4 overflow-x-auto hide-scrollbars py-8 max-w-[1200px] mx-auto px-4 lg:px-8 justify-start lg:justify-center flex-nowrap snap-x" style={{ direction: 'rtl' }}>
                    {categories.map(cat => (
                        <button 
                            key={cat.id} 
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`shrink-0 snap-start px-6 py-2.5 rounded-full border-[1.5px] font-bold transition-all ${
                                selectedCategory === cat.id 
                                    ? 'bg-[#BBCFCD] border-[#BBCFCD] text-[#234745]' 
                                    : 'bg-transparent border-[#234745] text-[#234745] hover:bg-gray-50'
                            }`}
                        >
                            {isEn ? cat.en : cat.ar}
                        </button>
                    ))}
                </div>
            </div>

            {/* Products Section */}
            <div className="max-w-[1200px] mx-auto px-4 lg:px-8 pb-16">
                <h2 className="text-[24px] lg:text-[32px] font-black text-[#1A1A1A] mb-8">
                    {isEn ? `Suggestions for ${selectedCatLabel}` : `مقترحات لـ ${selectedCatLabel}`}
                </h2>
                
                {displayProducts.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
                        {displayProducts.map((product: any) => (
                            <ProductItem key={product.id} product={product} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 text-[#8B8B8B] font-bold">
                        {isEn ? 'No products found for this occasion.' : 'لا توجد منتجات لهذه المناسبة.'}
                    </div>
                )}
            </div>

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
                                className="text-[#7D7D7D] font-medium text-[16px] mb-8"
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
                <Link to={isEn ? '/en/products/gift-card' : '/products/gift-card'} className="block w-full transition-transform hover:scale-[1.01]">
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
                                            style={{ fontFamily: "'Bahij Janna', sans-serif", lineHeight: '100%' }}
                                        >
                                            أهدِ من تحب
                                        </h3>
                                        <h3 
                                            className="text-[26px] font-bold text-[#234745]"
                                            style={{ fontFamily: "'Bahij Janna', sans-serif", lineHeight: '100%' }}
                                        >
                                            قسيمة سعد الدين
                                        </h3>
                                    </>
                                )}
                            </div>

                            <p 
                                className="text-[#7D7D7D] font-medium text-[16px] max-w-[340px] mb-8"
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
                                src="/images/voucher.png"
                                alt="Saadeddin Gift Voucher"
                                className="w-full h-auto object-contain max-w-[400px] drop-shadow-xl"
                            />
                        </div>

                    </div>
                </Link>

            </div>
        </div>
    );
}
