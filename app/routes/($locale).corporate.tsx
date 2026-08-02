import { useState } from 'react';
import { data, type LoaderFunctionArgs, type MetaFunction, useLoaderData, useRouteLoaderData, Link } from 'react-router';
import { ProductItem } from '~/components/ProductItem';
import { PageHeader } from '~/components/layout/PageHeader';

export const meta: MetaFunction = () => {
    return [{ title: `Saadeddin | Corporate Gifting` }];
};

const PRODUCT_ITEM_FRAGMENT = `#graphql
  fragment CorporateProductItem on Product {
    id
    handle
    title
    description
    summary: metafield(namespace: "custom", key: "summary") { value }
    subtitle: metafield(namespace: "custom", key: "subtitle") { value }
    b2bTiers: metafield(namespace: "custom", key: "b2b_tiers") { value }
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

    // Fetch real products and collections for corporate section
    const query = `#graphql
    ${PRODUCT_ITEM_FRAGMENT}
    query CorporateProducts($country: CountryCode, $language: LanguageCode) @inContext(country: $country, language: $language) {
      products(first: 25, query: "tag:corporate") {
        nodes {
          ...CorporateProductItem
        }
      }
      collections(first: 20) {
        nodes {
          id
          handle
          title
          description
          image {
            id
            url
            altText
          }
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

        return data({
            products: products?.nodes || [],
            collections: collections?.nodes || [],
        });
    } catch (e: any) {
        return data({ products: [], collections: [], error: e.message });
    }
}

function resolveTiers(product: any, isEn: boolean): Tier[] {
    const minPrice = parseFloat(product.priceRange?.minVariantPrice?.amount || '0');
    const variantNodes = product.variants?.nodes || [];

    // 1. Real Product Variants from Shopify
    if (variantNodes.length > 1) {
        const lastIdx = variantNodes.length - 1;
        return variantNodes.map((v: any, idx: number) => ({
            label: v.title,
            price: Math.round(parseFloat(v.price?.amount || '0')),
            isBest: idx === lastIdx,
        }));
    }

    // 2. Custom Metafield "b2b_tiers" (JSON: [{"min": 20, "max": 49, "price": 85}, ...])
    if (product.b2bTiers?.value) {
        try {
            const parsed = JSON.parse(product.b2bTiers.value);
            if (Array.isArray(parsed) && parsed.length > 0) {
                const lastIdx = parsed.length - 1;
                return parsed.map((item: any, idx: number) => ({
                    label: item.max
                        ? `${item.min} - ${item.max} ${isEn ? 'Boxes' : 'علبة'}`
                        : `${item.min}+ ${isEn ? 'Boxes' : 'علبة'}`,
                    price: Math.round(parseFloat(item.price || item.amount || 0)),
                    isBest: idx === lastIdx || Boolean(item.isBest),
                }));
            }
        } catch (e) {}
    }

    // 3. Calculate volume tiers directly from the product's REAL price in Shopify
    const basePrice = Math.round(minPrice);
    const tier1Price = basePrice;
    const tier2Price = Math.round(basePrice * 0.90);
    const tier3Price = Math.round(basePrice * 0.82);

    return [
        { label: `20 - 49 ${isEn ? 'Boxes' : 'علبة'}`, price: tier1Price },
        { label: `50 - 99 ${isEn ? 'Boxes' : 'علبة'}`, price: tier2Price },
        { label: `100+ ${isEn ? 'Boxes' : 'علبة'}`, price: tier3Price, isBest: true },
    ];
}

function CorporateProductCard({ product, isEn }: { product: any; isEn: boolean }) {
    const tiers = resolveTiers(product, isEn);

    // Tags & Badges
    const acceptsLogo = product.tags?.includes('logo') || product.tags?.includes('شعار') || product.tags?.includes('customizable') || true;
    const isBestSeller = product.tags?.includes('best_seller') || product.tags?.includes('الأكثر طلباً');
    const isEid = product.tags?.includes('eid') || product.tags?.includes('مناسب للعيد');
    const tagBadgeText = isBestSeller ? (isEn ? 'Best Seller' : 'الأكثر طلباً') : isEid ? (isEn ? 'Eid Special' : 'مناسب للعيد') : null;

    const productUrl = isEn ? `/en/products/${product.handle}` : `/products/${product.handle}`;

    const displayTitle = isEn ? product.title : (() => {
        const titleLower = (product.title + ' ' + (product.handle || '')).toLowerCase();
        if (titleLower.includes('classic') || titleLower.includes('كلاسيك')) return 'التشكيلة الكلاسيكية';
        if (titleLower.includes('premium') || titleLower.includes('فاخر')) return 'التشكيلة الفاخرة';
        if (titleLower.includes('custom') || titleLower.includes('مخصص')) return 'التشكيلة المخصصة';
        return product.title;
    })();

    const displayDesc = product.subtitle?.value || product.summary?.value || (product.description && !product.description.includes('<') ? product.description : null) || (() => {
        const titleLower = (product.title + ' ' + (product.handle || '')).toLowerCase();
        if (titleLower.includes('custom') || titleLower.includes('مخصص')) return isEn ? 'Maamoul + Baklava + Mixed Sweets — Medium Box' : 'معمول + بقلاوة + حلوى مشكلة — علبة وسط';
        if (titleLower.includes('premium') || titleLower.includes('فاخر')) return isEn ? 'Maamoul + Baklava + Mixed Sweets — Medium Box' : 'معمول + بقلاوة + حلوى مشكلة — علبة وسط';
        return isEn ? 'Maamoul + Baklava + Mixed Sweets — Medium Box' : 'معمول + بقلاوة + حلوى مشكلة — علبة وسط';
    })();

    return (
        <div className="w-full max-w-[411px] mx-auto bg-white rounded-[20px] overflow-hidden flex flex-col hover:shadow-lg transition-all border border-[#E6E2D8]/60" dir={isEn ? 'ltr' : 'rtl'}>
            {/* 1. Image Header */}
            <div className="relative w-full h-[220px] bg-[#F6F1EC] overflow-hidden">
                <Link to={productUrl} className="block w-full h-full">
                    <img
                        src={product.featuredImage?.url || '/images/placeholder/sample.png'}
                        alt={product.featuredImage?.altText || displayTitle}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                </Link>

                {/* Badges Container */}
                <div className="absolute top-3.5 left-3.5 right-3.5 flex justify-between items-center pointer-events-none">
                    {/* Top Left Badge: Logo Customization */}
                    {acceptsLogo && (
                        <div className="flex items-center gap-1.5 bg-white/95 px-3 py-1 rounded-full shadow-sm border border-gray-200/80">
                            <span className="text-[#255441] font-bold text-[13px]">{isEn ? 'Logo' : 'شعار'}</span>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#255441" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                            </svg>
                        </div>
                    )}

                    {/* Top Right Badge: Category/Special Badge */}
                    {tagBadgeText ? (
                        <div className="bg-[#234745] px-3.5 py-1 rounded-full shadow-sm">
                            <span className="text-[#FEF8EB] font-bold text-[13px]">{tagBadgeText}</span>
                        </div>
                    ) : (
                        <div />
                    )}
                </div>
            </div>

            {/* 2. Card Content */}
            <div className={`flex flex-col p-5 gap-4 flex-1 ${isEn ? 'text-left' : 'text-right'}`}>
                {/* Title & Subtitle */}
                <div className="flex flex-col gap-1">
                    <Link to={productUrl}>
                        <h3
                            className="text-[#234745] font-bold text-[18px] hover:text-[#906B51] transition-colors m-0 leading-snug"
                            style={{ fontFamily: isEn ? 'inherit' : "'Bahij Janna', sans-serif" }}
                        >
                            {displayTitle}
                        </h3>
                    </Link>
                    <p className="text-[#8B9895] font-medium text-[13px] sm:text-[14px] m-0 line-clamp-2">
                        {displayDesc}
                    </p>
                </div>

                {/* Wholesale Pricing Box (أسعار الجملة) */}
                <div className="bg-[#FEF8EB] border border-[#E6E2D8] rounded-[16px] p-4 flex flex-col gap-3 mt-auto">
                    <h4 className="text-[#906B51] font-bold text-[14px] m-0 border-b border-[#E6E2D8]/60 pb-2">
                        {isEn ? 'Wholesale Prices' : 'أسعار الجملة'}
                    </h4>

                    <div className="flex flex-col gap-2.5">
                        {tiers.map((tier, idx) => (
                            <div key={idx} className="flex justify-between items-center text-[14px]">
                                <span className="text-[#8B9895] font-medium">{tier.label}</span>
                                <div className="flex items-center gap-2">
                                    {tier.isBest && (
                                        <div className="bg-[#234745] px-2.5 py-0.5 rounded-full">
                                            <span className="text-[#FEF8EB] font-bold text-[11px]">{isEn ? 'Best' : 'الأفضل'}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1 font-bold text-[#234745] text-[16px]">
                                        <span style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}>{tier.price}</span>
                                        <span className="text-[13px] font-normal">﷼</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Action Button: اختر وخصص */}
                <Link
                    to={productUrl}
                    className="w-full bg-[#234745] !text-white font-bold text-[16px] py-3 rounded-full hover:bg-[#1a3533] transition-colors text-center block mt-1 shadow-sm"
                    style={{ fontFamily: isEn ? 'inherit' : "'Bahij Janna', sans-serif", color: '#ffffff' }}
                >
                    {isEn ? 'Choose & Customize' : 'إختر وخصص'}
                </Link>
            </div>
        </div>
    );
}

export default function CorporatePage() {
    const { products, collections } = useLoaderData<typeof loader>();
    const rootData = useRouteLoaderData('root') as any;
    const locale = rootData?.locale || 'ar';
    const isEn = locale === 'en';

    // State for mode toggle: 'self' (طلب ذاتي) vs 'custom' (عرض سعر مخصص)
    const [activeMode, setActiveMode] = useState<'self' | 'custom'>('self');
    const [formSubmitted, setFormSubmitted] = useState(false);
    const [selectedPackage, setSelectedPackage] = useState<string>('');

    // Dynamic Packages Builder (Shopify Collections/Products or Default Config)
    const packageCollections = (collections || []).filter((c: any) =>
        c.handle.includes('corporate') || c.handle.includes('package') || c.handle.includes('b2b')
    );

    const defaultPackages = [
        {
            id: 'classic',
            badge: isEn ? 'Classic' : 'كلاسيك',
            title: isEn ? 'Classic Collection' : 'التشكيلة الكلاسيكية',
            description: isEn ? 'An elegant gift for various corporate occasions with premium packaging and your company logo.' : 'هدية أنيقة لمختلف المناسبات الرسمية مع تغليف فاخر وشعار شركتك.',
            minQty: isEn ? 'Starts from 20 Boxes' : 'تبدأ من ٢٠ علبة',
            bgColor: '#BBCFCD',
            icon: 'box',
            image: null,
        },
        {
            id: 'premium',
            badge: isEn ? 'Premium' : 'المميزة',
            title: isEn ? 'Premium Collection' : 'التشكيلة المميزة',
            description: isEn ? 'A sophisticated choice for VIP clients and partners, with curated contents and striking packaging.' : 'اختيار راقٍ للعملاء وكبار الشركاء، بمحتوى مدروس وتغليف لافت.',
            minQty: isEn ? 'Starts from 20 Boxes' : 'تبدأ من ٢٠ علبة',
            bgColor: '#234745',
            icon: 'star',
            image: null,
        },
        {
            id: 'custom',
            badge: isEn ? 'Custom' : 'مخصصة',
            title: isEn ? 'Custom Collection' : 'التشكيلة المخصصة',
            description: isEn ? 'Design your gift to reflect your identity — contents, packaging, and logo as requested.' : 'صمّم هديتك بما يعكس هويتك — محتوى وتغليف وشعار حسب طلبك.',
            minQty: isEn ? 'Custom +200 Boxes' : 'حسب الطلب +٢٠٠ علبة',
            bgColor: '#BBCFCD',
            icon: 'tool',
            image: null,
        },
    ];

    const packages = packageCollections.length > 0
        ? packageCollections.map((c: any, idx: number) => {
            const isPremium = c.handle.includes('premium') || idx === 1;
            const isCustom = c.handle.includes('custom') || idx === 2;
            return {
                id: c.id,
                badge: isPremium ? (isEn ? 'Premium' : 'المميزة') : (isCustom ? (isEn ? 'Custom' : 'مخصصة') : (isEn ? 'Classic' : 'كلاسيك')),
                title: c.title,
                description: c.description || (isEn ? 'Custom corporate gift package tailored to your company needs.' : 'باقة إهداء مؤسسي مميزة مصممة لتلبية احتياجات شركتك.'),
                minQty: isEn ? 'Starts from 20 Boxes' : 'تبدأ من ٢٠ علبة',
                bgColor: isPremium ? '#234745' : '#BBCFCD',
                icon: isPremium ? 'star' : (isCustom ? 'tool' : 'box'),
                image: c.image?.url || null,
            };
        })
        : defaultPackages;

    const handlePackageSelect = (pkgTitle: string) => {
        setSelectedPackage(pkgTitle);
        setActiveMode('custom');
        setTimeout(() => {
            const formEl = document.getElementById('custom-quote');
            if (formEl) {
                formEl.scrollIntoView({ behavior: 'smooth' });
            }
        }, 100);
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFormSubmitted(true);
    };

    return (
        <div className={`min-h-screen bg-[#FFFFFF] ${isEn ? 'font-en' : "font-['GE_Dinar_One']"}`} dir={isEn ? 'ltr' : 'rtl'}>

            {/* 1. Hero Section */}
            <PageHeader
                title={isEn ? 'Corporate Gifts with Your Identity' : 'هدايا مؤسسية بهويتك الخاصة'}
                subtitle={isEn ? 'Gifts that suit your company' : 'هدايا تليق بشركتك'}
                isEn={isEn}
            >
                <p className="text-[#9FB7AE] text-[16px] md:text-[20px] font-medium relative z-10 max-w-2xl leading-[1.6] mb-12 md:mb-20 mt-4">
                    {isEn ? 'Premium collections with your company logo — for employees, clients, and official occasions' : 'تشكيلات فاخرة بشعار شركتك — للموظفين والعملاء والمناسبات الرسمية'}
                </p>
            </PageHeader>

            {/* Overlapping Stats Pills */}
            <div className="w-full relative z-20 -mt-[28px] md:-mt-[20px] mb-12 md:mb-20 px-2 sm:px-4">
                <div className="max-w-[1000px] mx-auto grid grid-cols-4 gap-2 sm:gap-3 md:flex md:flex-wrap md:justify-center md:gap-5">

                    <div className="bg-[#FEF8EB] px-[8px] py-[16px] md:px-8 md:py-4 rounded-[8px] border border-[#9FB7AE] flex flex-col items-center justify-center text-center gap-[8px] h-[80px] md:h-auto shadow-sm">
                        <span className="text-[#234745] font-bold text-[15px] sm:text-[20px] md:text-[24px] leading-none" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One'" }}>{isEn ? '500+' : '+500'}</span>
                        <span className="text-[#9FB7AE] text-[11px] sm:text-[13px] md:text-[14px] font-medium leading-tight text-center">{isEn ? 'Companies trust us' : 'شركة تثق بنا'}</span>
                    </div>

                    <div className="bg-[#FEF8EB] px-[8px] py-[16px] md:px-8 md:py-4 rounded-[8px] border border-[#9FB7AE] flex flex-col items-center justify-center text-center gap-[8px] h-[80px] md:h-auto shadow-sm">
                        <span className="text-[#234745] font-bold text-[15px] sm:text-[20px] md:text-[24px] leading-none" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One'" }}>{isEn ? '24 Hours' : '24 ساعة'}</span>
                        <span className="text-[#9FB7AE] text-[11px] sm:text-[13px] md:text-[14px] font-medium leading-tight text-center">{isEn ? 'Guaranteed response' : 'استجابة مضمونة'}</span>
                    </div>

                    <div className="bg-[#FEF8EB] px-[8px] py-[16px] md:px-8 md:py-4 rounded-[8px] border border-[#9FB7AE] flex flex-col items-center justify-center text-center gap-[8px] h-[80px] md:h-auto shadow-sm">
                        <span className="text-[#234745] font-bold text-[15px] sm:text-[20px] md:text-[24px] leading-none" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One'" }}>{isEn ? '+35 Cities' : '+35 مدينة'}</span>
                        <span className="text-[#9FB7AE] text-[11px] sm:text-[13px] md:text-[14px] font-medium leading-tight text-center">{isEn ? 'We deliver to' : 'نوصل لها'}</span>
                    </div>

                    <div className="bg-[#FEF8EB] px-[8px] py-[16px] md:px-8 md:py-4 rounded-[8px] border border-[#9FB7AE] flex flex-col items-center justify-center text-center gap-[8px] h-[80px] md:h-auto shadow-sm">
                        <span className="text-[#234745] font-bold text-[15px] sm:text-[20px] md:text-[24px] leading-none" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One'" }}>{isEn ? '20 Boxes' : '20 علبة'}</span>
                        <span className="text-[#9FB7AE] text-[11px] sm:text-[13px] md:text-[14px] font-medium leading-tight text-center">{isEn ? 'Minimum order' : 'حد أدنى'}</span>
                    </div>

                </div>
            </div>

            {/* 2. How it Works */}
            <section className="w-full bg-[#234745] py-16 px-4">
                <div className="max-w-[1280px] mx-auto flex flex-col items-center gap-8">

                    {/* Header */}
                    <div className="flex flex-col items-center text-center gap-3">
                        <h4 className="text-[#C5A96A] font-medium text-[18px] leading-[22px]">{isEn ? 'How it works' : 'طريقة العمل'}</h4>
                        <h2 className="text-[#FEF8EB] text-[36px] md:text-[50px] font-bold leading-tight !mb-0" style={{ fontFamily: "'Bahij Janna', sans-serif" }}>{isEn ? 'How does the service work?' : 'كيف تعمل الخدمة؟'}</h2>
                        <p className="text-[#9FB7AE] text-[16px] md:text-[18px] font-medium leading-[22px]">{isEn ? 'Three simple steps from choosing your path to delivering the gift' : 'ثلاث خطوات بسبطة من اختيار المسار وحتي وصول الهدية إلي المُستلم'}</p>
                    </div>

                    {/* Steps Container (Horizontal Slider on Mobile, Flex Row on Desktop) */}
                    <div className="w-full overflow-x-auto snap-x snap-mandatory scrollbar-none py-2 px-4 md:px-0">
                        <div className="flex flex-nowrap md:flex-row md:justify-center items-center gap-4 md:gap-8 min-w-max md:min-w-0 md:w-full">

                            {/* Step 1 */}
                            <div className="snap-center shrink-0 w-[80vw] max-w-[320px] md:max-w-[405px] md:w-full md:flex-1 flex flex-col items-center p-8 gap-4 bg-[#274D4B] border border-[#9FB7AE] rounded-[20px] text-center h-[208px] justify-center">
                                <div className="py-1 px-3.5 rounded-full bg-[#C5A96A] text-[#234745] flex items-center justify-center font-bold text-[20px]" style={{ fontFamily: "EnglishDigits" }}>1</div>
                                <h3 className="text-[#FEF8EB] font-bold text-[22px] md:text-[26px] leading-[42px] m-0" style={{ fontFamily: "'Bahij Janna', sans-serif" }}>{isEn ? 'Choose Path' : 'اختر المسار'}</h3>
                                <p className="text-[#9FB7AE] text-[14px] leading-[17px] m-0 max-w-[300px]">{isEn ? 'Select a ready order or a custom quote that suits your company needs.' : 'حدّد بين طلب جاهز أو عرض سعر مخصص يناسب احتياج شركتك.'}</p>
                            </div>

                            {/* Step 2 */}
                            <div className="snap-center shrink-0 w-[80vw] max-w-[320px] md:max-w-[405px] md:w-full md:flex-1 flex flex-col items-center p-8 gap-4 bg-[#274D4B] border border-[#9FB7AE] rounded-[20px] text-center h-[208px] justify-center">
                                <div className="py-1 px-3.5 rounded-full bg-[#C5A96A] text-[#234745] flex items-center justify-center font-bold text-[20px]" style={{ fontFamily: "EnglishDigits" }}>2</div>
                                <h3 className="text-[#FEF8EB] font-bold text-[22px] md:text-[26px] leading-[42px] m-0" style={{ fontFamily: "'Bahij Janna', sans-serif" }}>{isEn ? 'Customize Details' : 'خصّص التفاصيل'}</h3>
                                <p className="text-[#9FB7AE] text-[14px] leading-[17px] m-0 max-w-[300px]">{isEn ? 'Choose the collection, add your logo, and specify quantity and packaging.' : 'اختر التشكيلة، أضف الشعار، وحدّد الكمية والتغليف المناسب.'}</p>
                            </div>

                            {/* Step 3 */}
                            <div className="snap-center shrink-0 w-[80vw] max-w-[320px] md:max-w-[405px] md:w-full md:flex-1 flex flex-col items-center p-8 gap-4 bg-[#274D4B] border border-[#9FB7AE] rounded-[20px] text-center h-[208px] justify-center">
                                <div className="py-1 px-3.5 !rounded-full bg-[#C5A96A] text-[#234745] flex items-center justify-center font-bold text-[20px]" style={{ fontFamily: "EnglishDigits" }}>3</div>
                                <h3 className="text-[#FEF8EB] font-bold text-[22px] md:text-[26px] leading-[42px] m-0">{isEn ? 'Receive Gifts' : 'استلم الهدايا'}</h3>
                                <p className="text-[#9FB7AE] text-[14px] leading-[17px] m-0 max-w-[300px]">{isEn ? 'We prepare and pack within 24h and deliver to any city.' : 'نجهّز ونغلّف خلال ٢٤ ساعة ونوصل إلى أي مدينة تختارها.'}</p>
                            </div>

                        </div>
                    </div>
                </div>
            </section>

            {/* 3. How to Proceed? (Quick Order vs Custom Quote) */}
            <section className="w-full bg-white py-20 px-4 border-b border-[#9FB7AE]/30">
                <div className="max-w-[1280px] mx-auto flex flex-col items-center gap-10">

                    {/* Header */}
                    <div className="flex flex-col items-center text-center gap-2">
                        <h4 className="text-[#906B51] font-medium text-[18px] leading-[22px]">{isEn ? 'Choose Your Path' : 'اختر مسارك'}</h4>
                        <h2 className="text-[#234745] text-[36px] md:text-[50px] font-bold leading-[80px]" style={{ fontFamily: isEn ? 'inherit' : "'Bahij Janna'" }}>{isEn ? 'How would you like to proceed?' : 'كيف تريد المتابعة؟'}</h2>
                    </div>

                    {/* Cards Grid / Path Selector */}
                    <div className="flex flex-col md:flex-row w-full gap-8 justify-center">

                        {/* Card 1: Self Order (طلب ذاتي) */}
                        <button
                            type="button"
                            onClick={() => setActiveMode('self')}
                            className={`flex-1 flex flex-row justify-end items-start p-6 md:p-8 gap-6 rounded-[16px] transition-all cursor-pointer text-start ${activeMode === 'self'
                                ? 'bg-[#FEF8EB] border-1 border-[#234745] shadow-md ring-2 ring-[#234745]/10'
                                : 'bg-white border border-[#9FB7AE]/60 hover:border-[#234745]/60 hover:shadow-sm'
                                }`}
                        >
                            <div className="w-12 h-12 bg-[#BBCFCD]/50 rounded-full flex-none relative flex items-center justify-center">
                                <svg width="17" height="18" viewBox="0 0 17 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M7 17C7.82843 17 8.5 16.3284 8.5 15.5C8.5 14.6716 7.82843 14 7 14C6.17157 14 5.5 14.6716 5.5 15.5C5.5 16.3284 6.17157 17 7 17Z" stroke="#234745" />
                                    <path d="M14 17C14.8284 17 15.5 16.3284 15.5 15.5C15.5 14.6716 14.8284 14 14 14C13.1716 14 12.5 14.6716 12.5 15.5C12.5 16.3284 13.1716 17 14 17Z" stroke="#234745" />
                                    <path d="M0.5 0.5H2.5L6.004 11.5H14" stroke="#234745" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M5.22478 9.00049L3.30078 3.00049H15.8078C15.887 3.00039 15.9652 3.01914 16.0358 3.05519C16.1064 3.09124 16.1674 3.14356 16.2138 3.20783C16.2602 3.2721 16.2907 3.34649 16.3026 3.42484C16.3146 3.5032 16.3078 3.58328 16.2828 3.65849L14.6158 8.65849C14.5826 8.75801 14.519 8.84459 14.434 8.90596C14.3489 8.96734 14.2467 9.00041 14.1418 9.00049H5.22478Z" stroke="#234745" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <div className="flex flex-col justify-center items-start gap-3 flex-1">
                                <div className="flex items-center justify-between w-full">
                                    <h3 className="text-[#234745] font-bold text-[18px] leading-[22px] m-0">{isEn ? 'Self Order' : 'طلب ذاتي'}</h3>
                                    {activeMode === 'self' && (
                                        <span className="w-3 h-3 bg-[#234745] rounded-full inline-block" />
                                    )}
                                </div>
                                <p className="text-[#9FB7AE] text-[14px] leading-[17px] font-normal m-0">{isEn ? 'Choose your products and logo and pay directly — no waiting' : 'اختر منتجاتك وشعارك وادفع مباشرة — بدون انتظار'}</p>
                                <div className="bg-[#BBCFCD] px-4 py-2 rounded-full flex items-center justify-center mt-2">
                                    <span className="text-[#234745] font-bold text-[14px] leading-[17px]" style={{ fontFamily: isEn ? 'inherit' : "'Bahij Janna'" }}>{isEn ? '20 - 200 Boxes' : '20 - 200 علبة'}</span>
                                </div>
                            </div>
                        </button>

                        {/* Card 2: Custom Quote (عرض سعر مخصص) */}
                        <button
                            type="button"
                            onClick={() => setActiveMode('custom')}
                            className={`flex-1 flex flex-row justify-end items-start p-6 md:p-8 gap-6 rounded-[16px] transition-all cursor-pointer text-start ${activeMode === 'custom'
                                ? 'bg-[#FEF8EB] border-1 border-[#234745] shadow-md ring-2 ring-[#234745]/10'
                                : 'bg-white border border-[#9FB7AE]/60 hover:border-[#234745]/60 hover:shadow-sm'
                                }`}
                        >
                            <div className="w-12 h-12 bg-[#BBCFCD]/50 rounded-full flex-none relative flex items-center justify-center">
                                <svg width="23" height="18" viewBox="0 0 23 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M22.3125 4.68493e-05L18.4416 3.6532L22.1444 9.8857L22.3125 9.67673V4.68493e-05ZM0 0.0533438V10.6421C0.21 10.6694 0.462328 10.6844 0.716953 10.6871C1.27336 10.6929 1.73198 10.6566 1.98961 10.6335L4.45781 4.38806L0 0.0533438ZM18.2416 4.96866L17.9116 5.18222C17.9046 5.18677 17.6602 5.33859 17.5885 5.38331L17.0914 5.68425L17.0984 5.68847C16.8681 5.83177 16.804 5.87208 16.5426 6.03441C16.41 6.11677 16.4067 6.11869 16.2809 6.19683C15.3298 5.68556 14.2978 5.29261 13.0935 4.98361C11.5788 5.4412 9.9743 6.10336 8.37211 6.72464C9.03727 7.52559 9.77648 7.78641 10.5211 7.79573C11.3845 7.80652 12.2672 7.43105 12.8751 7.01039L13.2219 6.77039L13.57 7.27336L18.9819 11.1795L21.0965 9.77381L18.2416 4.96866ZM5.08486 5.09709L2.95828 10.4777L3.73875 11.0779L5.18227 9.4417L5.29791 9.31069L5.47228 9.29981C5.54259 9.29541 5.61197 9.29338 5.68041 9.29372C6.15909 9.29681 6.58706 9.42103 6.90806 9.70434C7.14581 9.91397 7.30387 10.1931 7.39556 10.5162L7.50244 10.5096C8.0647 10.4744 8.57128 10.5904 8.93822 10.9141C9.30511 11.2379 9.48337 11.7261 9.51853 12.2885L9.52181 12.3391C9.82369 12.3961 10.0939 12.515 10.3137 12.7088C10.6806 13.0326 10.8588 13.5207 10.894 14.0831L10.9032 14.2293C10.9332 14.2388 10.9629 14.2491 10.9923 14.2602L11.0876 14.1264L11.344 13.7665L11.4758 13.5814L11.8194 13.8262L14.6051 15.8107C14.9081 15.736 15.0887 15.6197 15.1892 15.4785C15.2898 15.3374 15.3407 15.1284 15.3122 14.8173L11.972 12.4252L11.6289 12.1796L11.8722 11.84L12.1849 11.401L12.5285 11.6458L16.2942 14.3283C16.5972 14.2536 16.7779 14.1373 16.8784 13.9962C16.9789 13.8551 17.0298 13.6466 17.0014 13.3361L12.6703 10.2634L12.3262 10.0192L12.8144 9.33108L13.1586 9.5752L17.4905 12.6486C17.7938 12.5738 17.9745 12.4575 18.0751 12.3163C18.1758 12.175 18.2267 11.9659 18.198 11.6542L13.0211 7.9178C12.3341 8.32505 11.4554 8.6513 10.5106 8.63948C9.40495 8.62566 8.2223 8.09733 7.3523 6.76214C7.31789 6.70934 7.29574 6.6495 7.28749 6.58702C7.27924 6.52454 7.2851 6.461 7.30462 6.40108C7.32415 6.34116 7.35686 6.28638 7.40033 6.24075C7.44381 6.19513 7.49696 6.15983 7.55587 6.13744C8.16591 5.90564 8.78227 5.66072 9.40008 5.41772L5.08495 5.09737L5.08486 5.09709ZM5.68964 10.1418L3.46008 12.6688C3.50353 12.985 3.60258 13.1817 3.73603 13.2995C3.86948 13.4172 4.07705 13.491 4.39622 13.4947L6.62573 10.9677C6.58228 10.6515 6.48323 10.4547 6.34978 10.3369C6.21633 10.2192 6.00881 10.1455 5.68959 10.1418L5.68964 10.1418ZM7.7197 11.3516L5.20191 14.2054C5.24531 14.5216 5.34441 14.7184 5.47781 14.8362C5.61141 14.9538 5.81883 15.0276 6.13805 15.0312L8.65584 12.1775C8.61244 11.8612 8.51334 11.6645 8.37989 11.5467C8.24644 11.4289 8.03897 11.3552 7.71975 11.3515L7.7197 11.3516ZM9.09502 13.1463L6.86564 15.6733C6.90909 15.9895 7.00814 16.1863 7.14159 16.3041C7.27509 16.4218 7.48261 16.4955 7.80178 16.4992L10.0312 13.9724C9.9878 13.656 9.88875 13.4593 9.7553 13.3415C9.62184 13.2237 9.41433 13.1501 9.09511 13.1464L9.09502 13.1463ZM10.2529 14.9808L8.43445 17.0565C8.47781 17.3733 8.57686 17.5703 8.71045 17.6881C8.84381 17.8058 9.05109 17.8795 9.36984 17.8833L11.1884 15.8077C11.145 15.4909 11.0459 15.2939 10.9123 15.176C10.779 15.0583 10.5717 14.9847 10.253 14.9809L10.2529 14.9808ZM11.9096 15.2054C11.989 15.4219 12.0349 15.6619 12.0509 15.9175L12.0617 16.0911L11.6737 16.534L12.9264 17.4263C13.2294 17.3516 13.41 17.2353 13.5105 17.0942C13.611 16.9531 13.662 16.7443 13.6337 16.4336L11.9096 15.2055L11.9096 15.2054Z" fill="#234745" />
                                </svg>
                            </div>
                            <div className="flex flex-col justify-center items-start gap-3 flex-1">
                                <div className="flex items-center justify-between w-full">
                                    <h3 className="text-[#234745] font-bold text-[18px] leading-[22px] m-0">{isEn ? 'Custom Quote' : 'عرض سعر مخصص'}</h3>
                                    {activeMode === 'custom' && (
                                        <span className="w-3 h-3 bg-[#234745] rounded-full inline-block" />
                                    )}
                                </div>
                                <p className="text-[#9FB7AE] text-[14px] leading-[17px] font-medium m-0">{isEn ? 'For large orders or special customization — an account manager will contact you' : 'للطلبات الكبيرة أو التخصيص الخاص — مدير حساب سيتواصل معك'}</p>
                                <div className="bg-[#FEF8EB] px-4 py-2 rounded-full flex items-center justify-center mt-2">
                                    <span className="text-[#906B51] font-bold text-[14px] leading-[17px]" style={{ fontFamily: isEn ? 'inherit' : "'Bahij Janna'" }}>{isEn ? '200+ Boxes or Custom Order' : '+200 علبة أو طلب خاص'}</span>
                                </div>
                            </div>
                        </button>

                    </div>
                </div>
            </section>

            {/* 4. DYNAMIC CONTENT SECTION: Self Order (Product Grid) vs Custom Quote Form */}
            {activeMode === 'self' ? (
                /* SECTION 4A: Product Selection (اختر تشكيلتك) */
                <section id="products" className="w-full bg-[#FEF8EB] py-20 px-4">
                    <div className="max-w-[1280px] mx-auto flex flex-col gap-8">

                        {/* Header */}
                        <div className="flex flex-col items-center text-center gap-3">
                            <h4 className="text-[#906B51] font-medium text-[18px] leading-[22px]">{isEn ? 'Collections' : 'التشكيلات'}</h4>
                            <h2 className="text-[#234745] text-[36px] md:text-[50px] font-bold leading-[80px]" style={{ fontFamily: isEn ? 'inherit' : "'Bahij Janna'" }}>{isEn ? 'Choose Your Selection' : 'اختر تشكيلتك'}</h2>
                            <p className="text-[#9FB7AE] text-[16px] md:text-[18px] font-medium leading-[22px]">{isEn ? '12 B2B collections fitting every corporate occasion and budget' : '١٢ تشكيلة B2B تناسب كل مناسبة وميزانية مؤسسية'}</p>
                        </div>

                        {/* Filters */}
                        <div className="flex flex-row justify-between items-center mt-4 mb-8">
                            <span className="text-[#234745] font-bold text-[16px] hidden md:block">{isEn ? 'Box Budget:' : 'الميزانية للعلبة:'}</span>
                            <div className="flex flex-wrap items-center gap-[10px]">

                                {/* Filter 3: All */}
                                <div className="flex flex-row justify-between items-center px-4 py-2 w-[192px] h-[40px] border border-[#BBCFCD] rounded-[16px] bg-transparent cursor-pointer">
                                    <span className="text-[#255441] font-medium text-[16px]">{isEn ? 'All' : 'الكل'}</span>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#234745" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                </div>

                                {/* Filter 2: Size */}
                                <div className="flex flex-row justify-between items-center px-4 py-2 w-[192px] h-[40px] border border-[#BBCFCD] rounded-[16px] bg-transparent cursor-pointer">
                                    <span className="text-[#255441] font-medium text-[16px]">{isEn ? 'Size' : 'الحجم'}</span>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#234745" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                </div>

                                {/* Filter 1: Accept Logo? */}
                                <div className="flex flex-row justify-between items-center px-4 py-2 w-[192px] h-[40px] border border-[#BBCFCD] rounded-[16px] bg-transparent cursor-pointer">
                                    <span className="text-[#255441] font-medium text-[16px]">{isEn ? 'Accepts Logo?' : 'يقبل شعار؟'}</span>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#234745" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                </div>

                            </div>
                        </div>

                        {/* Dynamic Products Grid from Shopify */}
                        {products && products.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {products.map((product: any) => (
                                    <CorporateProductCard key={product.id} product={product} isEn={isEn} />
                                ))}
                            </div>
                        ) : (
                            <div className="w-full py-12 text-center text-[#7D7D7D] font-bold text-[18px]">
                                {isEn ? 'No corporate products available at the moment.' : 'لا توجد منتجات مؤسسية متاحة حالياً.'}
                            </div>
                        )}
                    </div>
                </section>
            ) : (
                /* SECTION 4B: Custom Quote Form (طلب عرض سعر للطلبات الكبيرة) */
                <section id="custom-quote" className="w-full bg-[#FEF8EB] py-16 md:py-24 px-4 sm:px-6 md:px-8 border-b border-[#9FB7AE]/30">
                    <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">

                        {/* Left Side: White Form Card */}
                        <div className="lg:col-span-7 bg-white rounded-[24px] p-6 sm:p-8 md:p-10 border border-[#E6E2D8] shadow-sm flex flex-col gap-6">
                            <div className="flex flex-col gap-2">
                                <h3
                                    className="text-[#234745] font-bold text-[22px] sm:text-[26px] text-start m-0 leading-tight"
                                    style={{ fontFamily: isEn ? 'inherit' : "'Bahij Janna', sans-serif" }}
                                >
                                    {isEn ? 'Send Us Your Custom Quote Request' : 'أرسل لنا عرض السعر المخصص'}
                                </h3>

                                {selectedPackage && (
                                    <div className="bg-[#FEF8EB] border border-[#C5A96A]/60 rounded-[12px] px-4 py-2.5 flex items-center justify-between mt-2 animate-fade-in">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">🎁</span>
                                            <span className="text-[#234745] font-bold text-[14px]">
                                                {isEn ? `Selected Package: ${selectedPackage}` : `الباقة المختارة: ${selectedPackage}`}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedPackage('')}
                                            className="text-[#906B51] hover:underline font-bold text-[12px]"
                                        >
                                            {isEn ? 'Change' : 'تغيير الباقة'}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {formSubmitted ? (
                                <div className="bg-[#234745]/5 border border-[#234745]/20 rounded-[16px] p-8 text-center flex flex-col items-center gap-4 my-6">
                                    <div className="w-16 h-16 bg-[#234745] rounded-full flex items-center justify-center">
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    </div>
                                    <h4 className="text-[#234745] font-bold text-[22px] m-0">
                                        {isEn ? 'Request Received Successfully!' : 'تم استلام طلبك بنجاح!'}
                                    </h4>
                                    <p className="text-[#8B9895] font-medium text-[15px] max-w-md m-0">
                                        {isEn ? 'An account manager will review your specs and contact you within 24 hours with a tailored offer.' : 'سيتواصل معك مدير حسابك المختص خلال 24 ساعة لتقديم عرض سعر مخصص يتناسب مع تطلعاتك.'}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setFormSubmitted(false)}
                                        className="mt-4 bg-[#234745] text-white font-bold px-6 py-2.5 rounded-full text-[14px]"
                                    >
                                        {isEn ? 'Send Another Request' : 'إرسال طلب آخر'}
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleFormSubmit} className="flex flex-col gap-5 text-start">
                                    {/* Row 1: Company Name & Tax ID */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[#234745] font-bold text-[14px]">
                                                {isEn ? 'Company Name' : 'اسم الشركة'} <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                placeholder={isEn ? 'Company Name' : 'شركة الامانه'}
                                                className="w-full h-[48px] px-4 rounded-[12px] border border-[#E6E2D8] bg-white text-[#234745] placeholder-[#B0BDBA] focus:outline-none focus:border-[#234745] text-[15px]"
                                            />
                                        </div>

                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[#234745] font-bold text-[14px]">
                                                {isEn ? 'Tax ID Number' : 'الرقم الضريبي'} <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                placeholder={isEn ? 'Tax ID' : 'الرقم الضريبي'}
                                                className="w-full h-[48px] px-4 rounded-[12px] border border-[#E6E2D8] bg-white text-[#234745] placeholder-[#B0BDBA] focus:outline-none focus:border-[#234745] text-[15px]"
                                            />
                                        </div>
                                    </div>

                                    {/* Row 2: Manager Name & Phone */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[#234745] font-bold text-[14px]">
                                                {isEn ? 'Manager Name' : 'اسم المسؤول'} <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                placeholder={isEn ? 'Manager Name' : 'نور الدالي'}
                                                className="w-full h-[48px] px-4 rounded-[12px] border border-[#E6E2D8] bg-white text-[#234745] placeholder-[#B0BDBA] focus:outline-none focus:border-[#234745] text-[15px]"
                                            />
                                        </div>

                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[#234745] font-bold text-[14px]">
                                                {isEn ? 'Phone Number' : 'الجوال'} <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="tel"
                                                required
                                                placeholder={isEn ? 'Phone Number' : 'رقم الجوال'}
                                                className="w-full h-[48px] px-4 rounded-[12px] border border-[#E6E2D8] bg-white text-[#234745] placeholder-[#B0BDBA] focus:outline-none focus:border-[#234745] text-[15px]"
                                                dir="ltr"
                                            />
                                        </div>
                                    </div>

                                    {/* Row 3: Email */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[#234745] font-bold text-[14px]">
                                            {isEn ? 'Email Address' : 'البريد الإلكتروني'} <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="email"
                                            required
                                            placeholder="name@gmail.com"
                                            className="w-full h-[48px] px-4 rounded-[12px] border border-[#E6E2D8] bg-white text-[#234745] placeholder-[#B0BDBA] focus:outline-none focus:border-[#234745] text-[15px]"
                                            dir="ltr"
                                        />
                                    </div>

                                    {/* Row 4: Event Type */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[#234745] font-bold text-[14px]">
                                            {isEn ? 'Occasion Type' : 'نوع المناسبة'} <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            required
                                            className="w-full h-[48px] px-4 rounded-[12px] border border-[#E6E2D8] bg-white text-[#234745] focus:outline-none focus:border-[#234745] text-[15px] appearance-none cursor-pointer"
                                        >
                                            <option value="">{isEn ? 'Select Occasion' : 'إختر المناسبة'}</option>
                                            <option value="official">{isEn ? 'Official / Corporate Event' : 'مناسبة رسمية / مؤسسية'}</option>
                                            <option value="eid">{isEn ? 'Eid / Seasonal' : 'عيد / موسم'}</option>
                                            <option value="employees">{isEn ? 'Employee Recognition' : 'تكريم موظفين'}</option>
                                            <option value="conference">{isEn ? 'Conference / Exhibition' : 'مؤتمر / فعاليات'}</option>
                                            <option value="other">{isEn ? 'Other' : 'أخرى'}</option>
                                        </select>
                                    </div>

                                    {/* Row 5: Quantity & Budget per Box */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[#234745] font-bold text-[14px]">
                                                {isEn ? 'Target Quantity' : 'الكمية المناسبة'} <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                required
                                                className="w-full h-[48px] px-4 rounded-[12px] border border-[#E6E2D8] bg-white text-[#234745] focus:outline-none focus:border-[#234745] text-[15px] appearance-none cursor-pointer"
                                            >
                                                <option value="200-500">200 - 500</option>
                                                <option value="500-1000">500 - 1000</option>
                                                <option value="1000+">1000+</option>
                                            </select>
                                        </div>

                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[#234745] font-bold text-[14px]">
                                                {isEn ? 'Budget per Box' : 'الميزانية للعلبة'} <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                required
                                                className="w-full h-[48px] px-4 rounded-[12px] border border-[#E6E2D8] bg-white text-[#234745] focus:outline-none focus:border-[#234745] text-[15px] appearance-none cursor-pointer"
                                            >
                                                <option value="<100">{isEn ? 'Under 100 SAR' : 'أقل من 100 ر.س'}</option>
                                                <option value="100-200">100 - 200 ر.س</option>
                                                <option value="200+">200+ ر.س</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Row 6: Required Delivery Date */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[#234745] font-bold text-[14px]">
                                            {isEn ? 'Required Delivery Date' : 'تاريخ التسليم المطلوب'}
                                        </label>
                                        <input
                                            type="date"
                                            className="w-full h-[48px] px-4 rounded-[12px] border border-[#E6E2D8] bg-white text-[#234745] placeholder-[#B0BDBA] focus:outline-none focus:border-[#234745] text-[15px]"
                                        />
                                    </div>

                                    {/* Row 7: Customization Requirements */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[#234745] font-bold text-[14px]">
                                            {isEn ? 'Customization Requirements' : 'متطلبات التخصيص'}
                                        </label>
                                        <textarea
                                            rows={3}
                                            placeholder={isEn ? 'Example: Company logo, custom message, specialized box packaging' : 'مثال : شعار الشركة ، رسالة موحده ، تغليف خاص'}
                                            className="w-full p-4 rounded-[12px] border border-[#E6E2D8] bg-white text-[#234745] placeholder-[#B0BDBA] focus:outline-none focus:border-[#234745] text-[15px] resize-none"
                                        />
                                    </div>

                                    {/* Row 8: Preferred Delivery Branch */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[#234745] font-bold text-[14px]">
                                            {isEn ? 'Preferred Delivery Branch' : 'الفرع المفضل للتسليم'}
                                        </label>
                                        <select
                                            className="w-full h-[48px] px-4 rounded-[12px] border border-[#E6E2D8] bg-white text-[#234745] focus:outline-none focus:border-[#234745] text-[15px] appearance-none cursor-pointer"
                                        >
                                            <option value="Riyadh">{isEn ? 'Riyadh' : 'الرياض'}</option>
                                            <option value="Jeddah">{isEn ? 'Jeddah' : 'جدة'}</option>
                                            <option value="Dammam">{isEn ? 'Dammam' : 'الدمام'}</option>
                                            <option value="Khobar">{isEn ? 'Khobar' : 'الخبر'}</option>
                                            <option value="Makkah">{isEn ? 'Makkah' : 'مكة المكرمة'}</option>
                                            <option value="Madinah">{isEn ? 'Madinah' : 'المدينة المنورة'}</option>
                                            <option value="Other">{isEn ? 'Other City' : 'أخرى'}</option>
                                        </select>
                                    </div>

                                    {/* Row 9: Attachment (Optional) */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[#234745] font-bold text-[14px]">
                                            {isEn ? 'Add Attachment (Optional)' : 'إضافة مرفق (اختياري)'}
                                        </label>
                                        <label className="border-2 border-dashed border-[#906B51]/60 rounded-[16px] p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[#FEF8EB]/50 transition-colors bg-[#FEF8EB]/20">
                                            <input type="file" className="hidden" accept="image/*,.pdf,.doc,.docx" />
                                            <span className="text-[#234745] font-bold text-[15px]">
                                                {isEn ? 'Add Attachment' : 'إضافة مرفق'}
                                            </span>
                                            <span className="text-[#8B9895] text-[13px] font-medium mt-1">
                                                {isEn ? 'Logo, correspondence, or relevant files' : 'شعار ، مراسلات ، أي ملفات ذات صلة'}
                                            </span>
                                        </label>
                                    </div>

                                    {/* Row 10: Submit Button */}
                                    <button
                                        type="submit"
                                        className="w-full bg-[#234745] text-white font-bold text-[16px] md:text-[18px] py-4 rounded-full hover:bg-[#1a3533] transition-colors text-center mt-3 shadow-md cursor-pointer"
                                        style={{ fontFamily: isEn ? 'inherit' : "'Bahij Janna', sans-serif" }}
                                    >
                                        {isEn ? 'Send Quote Request' : 'إرسال طلب عرض السعر'}
                                    </button>
                                </form>
                            )}
                        </div>

                        {/* Right Side: Sidebar Information */}
                        <div className="lg:col-span-5 flex flex-col text-start gap-6 pt-2">
                            <div className="flex flex-col gap-3">
                                <h2
                                    className="text-[#234745] font-bold text-[32px] sm:text-[38px] md:text-[44px] leading-tight m-0"
                                    style={{ fontFamily: isEn ? 'inherit' : "'Bahij Janna', sans-serif" }}
                                >
                                    {isEn ? 'Quote Request for Large Orders' : 'طلب عرض سعر للطلبات الكبيرة'}
                                </h2>
                                <p className="text-[#8B9895] font-medium text-[15px] md:text-[17px] leading-relaxed m-0">
                                    {isEn
                                        ? 'For orders over 200 boxes, custom branding, or multi-address delivery — your account manager will reach out within 24 hours with a tailored quote.'
                                        : 'للطلبات فوق 200 علبة، أو التخصيص الخاص، أو التوصيل لعدة عناوين — مدير حسابك سيتواصل خلال 24 ساعة بعرض مفضل.'}
                                </p>
                            </div>

                            <div className="flex flex-col gap-6 pt-6 border-t border-[#E6E2D8]">
                                {/* Contact 1: WhatsApp */}
                                <div className="flex flex-col gap-1">
                                    <span className="text-[#234745] font-bold text-[16px]">
                                        {isEn ? 'Corporate WhatsApp' : 'WhatsApp للشركات'}
                                    </span>
                                    <span className="text-[#9FB7AE] font-medium text-[14px]">
                                        {isEn ? 'Instant response within 30 mins' : 'رد فوري خلال 30 دقيقة'}
                                    </span>
                                </div>

                                {/* Contact 2: Direct Line */}
                                <div className="flex flex-col gap-1">
                                    <span className="text-[#234745] font-bold text-[16px] flex items-center gap-2">
                                        <span>{isEn ? 'Direct Line' : 'خط الشركات المباشر'}</span>
                                        <span className="text-[#906B51] font-bold text-[16px] dir-ltr inline-block" style={{ fontFamily: 'EnglishDigits' }}>
                                            +966 11 XXX XXXX
                                        </span>
                                    </span>
                                </div>

                                {/* Contact 3: Email */}
                                <div className="flex flex-col gap-1">
                                    <span className="text-[#234745] font-bold text-[16px]">
                                        corporate@saadeddin.com
                                    </span>
                                    <span className="text-[#9FB7AE] font-medium text-[14px]">
                                        {isEn ? 'Response within 24 hours' : 'رد خلال 24 ساعة'}
                                    </span>
                                </div>
                            </div>
                        </div>

                    </div>
                </section>
            )}

            {/* 6. Custom Identity */}
            <section className="w-full bg-[#FAF4E8] py-20 px-4 sm:px-6 lg:px-8 border-t border-[#E8DFC8]">
                <div className="max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
                    {/* Left / Info Text Column */}
                    <div className={`lg:col-span-6 flex flex-col ${isEn ? 'text-left items-start' : 'text-right items-start'}`}>
                        <h2
                            className="text-[#234745] text-[36px] sm:text-[46px] lg:text-[52px] font-bold leading-tight mb-4"
                            style={{ fontFamily: isEn ? 'inherit' : "'Bahij Janna', sans-serif" }}
                        >
                            {isEn ? 'A Design That Reflects Your Identity' : 'تصميم يعكس هويتك'}
                        </h2>
                        <p className="text-[#8B8275] text-[15px] sm:text-[16px] leading-[26px] mb-8 max-w-[540px]">
                            {isEn
                                ? 'We offer complete customization options to highlight your brand identity on packaging and gifts with the highest quality and innovation standards.'
                                : 'نقدم لك خيارات تخصيص متكاملة لإبراز علامتك التجارية على التغليف والهدايا بأعلى معايير الجودة والابتكار'}
                        </p>

                        <div className={`flex items-center gap-8 sm:gap-12 pt-2 ${isEn ? 'justify-start' : 'justify-start'}`}>
                            {/* Item 1: Custom Colors */}
                            <div className="flex flex-col items-center text-center gap-2">
                                <div className="w-10 h-10 flex items-center justify-center">
                                    <img src="/images/corporate/custom-color.svg" alt="Custom Colors" className="w-8 h-8 object-contain" />
                                </div>
                                <span className="text-[#906B51] font-bold text-[14px]">{isEn ? 'Custom Colors' : 'ألوان مخصصة'}</span>
                            </div>

                            {/* Item 2: Custom Messages */}
                            <div className="flex flex-col items-center text-center gap-2">
                                <div className="w-10 h-10 flex items-center justify-center">
                                    <img src="/images/corporate/custom-messages.svg" alt="Custom Messages" className="w-8 h-8 object-contain" />
                                </div>
                                <span className="text-[#906B51] font-bold text-[14px]">{isEn ? 'Custom Messages' : 'رسائل خاصة'}</span>
                            </div>

                            {/* Item 3: Premium Quality */}
                            <div className="flex flex-col items-center text-center gap-2">
                                <div className="w-10 h-10 flex items-center justify-center">
                                    <img src="/images/corporate/heigh-quality.svg" alt="Premium Quality" className="w-8 h-8 object-contain" />
                                </div>
                                <span className="text-[#906B51] font-bold text-[14px]">{isEn ? 'Premium Quality' : 'جودة فاخرة'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Dark Teal Container Column */}
                    <div className="lg:col-span-6">
                        <div className="w-full h-[320px] sm:h-[380px] bg-[#1E3A37] rounded-[32px] overflow-hidden shadow-xl relative flex items-center justify-center">
                            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#C5A96A_1px,transparent_1px)] [background-size:16px_16px]"></div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 7. Why Choose Us */}
            <section className="w-full bg-[#FAF4E8] py-20 px-4 sm:px-6 lg:px-8 border-t border-[#E8DFC8]">
                <div className="max-w-[1280px] mx-auto text-center flex flex-col items-center gap-12">
                    {/* Header */}
                    <div className="flex flex-col items-center text-center gap-3">
                        <h4 className="text-[#906B51] font-bold text-[16px] tracking-wide">{isEn ? 'Our Advantages' : 'المزايا'}</h4>
                        <h2
                            className="text-[#234745] text-[36px] sm:text-[50px] font-bold leading-tight"
                            style={{ fontFamily: isEn ? 'inherit' : "'Bahij Janna', sans-serif" }}
                        >
                            {isEn ? 'Why Choose Us?' : 'لماذا تختارنا؟'}
                        </h2>
                        <p className="text-[#8C8275] text-[16px] md:text-[18px] font-medium leading-relaxed max-w-[650px]">
                            {isEn
                                ? 'A corporate partnership combining refined taste, precision execution, and punctual delivery.'
                                : 'شراكة مؤسسية تجمع بين الذوق الرفيع، الدقة في التنفيذ، والالتزام بالمواعيد.'}
                        </p>
                    </div>

                    {/* 6 Cards Container (Horizontal Slider on Mobile, Grid on Desktop) */}
                    <div className="w-full overflow-x-auto snap-x snap-mandatory scrollbar-none py-2 px-4 md:px-0">
                        <div className="flex flex-nowrap md:grid md:grid-cols-3 gap-4 md:gap-6 min-w-max md:min-w-0 md:w-full">

                            {/* Card 1: Premium Quality */}
                            <div className="snap-center shrink-0 w-[80vw] max-w-[320px] md:max-w-none md:w-full bg-white rounded-[24px] p-8 border border-[#E2EBE8] flex flex-col items-center text-center shadow-sm hover:shadow-md transition-all hover:border-[#234745]/30">
                                <div className="w-12 h-12 bg-[#234745] rounded-[14px] flex items-center justify-center text-white mb-5 shadow-sm">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="8" r="7" />
                                        <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
                                    </svg>
                                </div>
                                <h3 className="text-[#234745] font-bold text-[20px] mb-3">{isEn ? 'Premium Quality' : 'جودة فاخرة'}</h3>
                                <p className="text-[#9FB7AE] font-bold text-[14px] leading-tight" style={{ fontFamily: isEn ? 'inherit' : "'Bahij Janna', sans-serif" }}>
                                    {isEn ? 'Handpicked collections and high-quality materials that reflect your brand prestige.' : 'تشكيلات منتقاة بعناية ومواد عالية الجودة تعكس مكانة علامتك التجارية.'}
                                </p>
                            </div>

                            {/* Card 2: Custom Identity */}
                            <div className="snap-center shrink-0 w-[80vw] max-w-[320px] md:max-w-none md:w-full bg-white rounded-[24px] p-8 border border-[#E2EBE8] flex flex-col items-center text-center shadow-sm hover:shadow-md transition-all hover:border-[#234745]/30">
                                <div className="w-12 h-12 bg-[#234745] rounded-[14px] flex items-center justify-center text-white mb-5 shadow-sm">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 4.12c-.1.607-.241 1.2-.423 1.78" />
                                    </svg>
                                </div>
                                <h3 className="text-[#234745] font-bold text-[20px] mb-3">{isEn ? 'Custom Identity' : 'هوية خاصة'}</h3>
                                <p className="text-[#9FB7AE] font-bold text-[14px] leading-tight" style={{ fontFamily: isEn ? 'inherit' : "'Bahij Janna', sans-serif" }}>
                                    {isEn ? 'Printing your company logo on packaging and products with elegance.' : 'طباعة شعارك على التغليف والمنتجات بأسلوب راقٍ ومتقن.'}
                                </p>
                            </div>

                            {/* Card 3: Fast Delivery */}
                            <div className="snap-center shrink-0 w-[80vw] max-w-[320px] md:max-w-none md:w-full bg-white rounded-[24px] p-8 border border-[#E2EBE8] flex flex-col items-center text-center shadow-sm hover:shadow-md transition-all hover:border-[#234745]/30">
                                <div className="w-12 h-12 bg-[#234745] rounded-[14px] flex items-center justify-center text-white mb-5 shadow-sm">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="1" y="3" width="15" height="13" rx="2" />
                                        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                                        <circle cx="5.5" cy="18.5" r="2.5" />
                                        <circle cx="18.5" cy="18.5" r="2.5" />
                                    </svg>
                                </div>
                                <h3 className="text-[#234745] font-bold text-[20px] mb-3">{isEn ? 'Fast Delivery' : 'توصيل سريع'}</h3>
                                <p className="text-[#9FB7AE] font-bold text-[14px] leading-tight" style={{ fontFamily: isEn ? 'inherit' : "'Bahij Janna', sans-serif" }}>
                                    {isEn ? 'Preparation and packaging within 24 hours and delivery to 35+ cities.' : 'تجهيز وتغليف خلال 24 ساعة وتوصيل إلى أكثر من 35 مدينة.'}
                                </p>
                            </div>

                            {/* Card 4: Corporate Trust */}
                            <div className="snap-center shrink-0 w-[80vw] max-w-[320px] md:max-w-none md:w-full bg-white rounded-[24px] p-8 border border-[#E2EBE8] flex flex-col items-center text-center shadow-sm hover:shadow-md transition-all hover:border-[#234745]/30">
                                <div className="w-12 h-12 bg-[#234745] rounded-[14px] flex items-center justify-center text-white mb-5 shadow-sm">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                    </svg>
                                </div>
                                <h3 className="text-[#234745] font-bold text-[20px] mb-3">{isEn ? 'Corporate Trust' : 'ثقة مؤسسية'}</h3>
                                <p className="text-[#9FB7AE] font-bold text-[14px] leading-tight" style={{ fontFamily: isEn ? 'inherit' : "'Bahij Janna', sans-serif" }}>
                                    {isEn ? 'Over 500 companies trusted us as their corporate gifting partner.' : 'أكثر من 500 شركة اختارتنا شريكاً لهدايا موظفيها وعملائها.'}
                                </p>
                            </div>

                            {/* Card 5: Elegant Packaging */}
                            <div className="snap-center shrink-0 w-[80vw] max-w-[320px] md:max-w-none md:w-full bg-white rounded-[24px] p-8 border border-[#E2EBE8] flex flex-col items-center text-center shadow-sm hover:shadow-md transition-all hover:border-[#234745]/30">
                                <div className="w-12 h-12 bg-[#234745] rounded-[14px] flex items-center justify-center text-white mb-5 shadow-sm">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
                                        <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
                                    </svg>
                                </div>
                                <h3 className="text-[#234745] font-bold text-[20px] mb-3">{isEn ? 'Elegant Packaging' : 'تغليف أنيق'}</h3>
                                <p className="text-[#9FB7AE] font-bold text-[14px] leading-tight" style={{ fontFamily: isEn ? 'inherit' : "'Bahij Janna', sans-serif" }}>
                                    {isEn ? 'Sophisticated corporate packaging suited for official events and VIP clients.' : 'تغليف مؤسسي راقٍ يليق بالمناسبات الرسمية والعملاء المميزين.'}
                                </p>
                            </div>

                            {/* Card 6: Dedicated Support */}
                            <div className="snap-center shrink-0 w-[80vw] max-w-[320px] md:max-w-none md:w-full bg-white rounded-[24px] p-8 border border-[#E2EBE8] flex flex-col items-center text-center shadow-sm hover:shadow-md transition-all hover:border-[#234745]/30">
                                <div className="w-12 h-12 bg-[#234745] rounded-[14px] flex items-center justify-center text-white mb-5 shadow-sm">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                                        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                                    </svg>
                                </div>
                                <h3 className="text-[#234745] font-bold text-[20px] mb-3">{isEn ? 'Dedicated Support' : 'دعم مخصص'}</h3>
                                <p className="text-[#9FB7AE] font-bold text-[14px] leading-tight" style={{ fontFamily: isEn ? 'inherit' : "'Bahij Janna', sans-serif" }}>
                                    {isEn ? 'A dedicated team accompanying you from collection selection to final delivery.' : 'فريق متخصص يرافقك من اختيار التشكيلة وحتى التسليم النهائي.'}
                                </p>
                            </div>

                        </div>
                    </div>
                </div>
            </section>

        </div>
    );
}
