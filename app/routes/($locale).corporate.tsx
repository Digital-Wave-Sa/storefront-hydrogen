import { data, type LoaderFunctionArgs, type MetaFunction, useLoaderData, useRouteLoaderData, Link } from 'react-router';
import { ProductItem } from '~/components/ProductItem';
import patternBg from '~/assets/patteren-collection-header.svg';

export const meta: MetaFunction = () => {
    return [{ title: `Saadeddin | Corporate Gifting` }];
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

    // Fetch some products for the corporate grid (using gifting or corporate tags)
    const query = `#graphql
    ${PRODUCT_ITEM_FRAGMENT}
    query CorporateProducts($country: CountryCode, $language: LanguageCode) @inContext(country: $country, language: $language) {
      products(first: 3, query: "tag:corporate OR tag:gifting") {
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

export default function CorporatePage() {
    const { products } = useLoaderData<typeof loader>();
    const rootData = useRouteLoaderData('root') as any;
    const locale = rootData?.locale || 'ar';
    const isEn = locale === 'en';

    return (
        <div className={`min-h-screen bg-[#FEF8EB] ${isEn ? 'font-en' : "font-['GE_Dinar_One']"}`} dir={isEn ? 'ltr' : 'rtl'}>
            
            {/* 1. Hero Section */}
            <section className="relative w-full bg-[#234745] flex flex-col justify-center items-center text-center px-4 pt-24 pb-40 md:pb-48">
                {/* Background Pattern */}
                <div 
                    className="absolute inset-0 pointer-events-none opacity-10" 
                    style={{ backgroundImage: `url(${patternBg})`, backgroundSize: '180px', backgroundPosition: 'center', backgroundRepeat: 'repeat' }} 
                />
                
                <h4 className="text-[#9FB7AE] text-[16px] md:text-[18px] font-bold relative z-10 mb-8">
                    {isEn ? 'Gifts that suit your company' : 'هدايا تليق بشركتك'}
                </h4>

                <h1 className="text-[#FEF8EB] !text-[40px] md:!text-[50px] !font-bold relative z-10 !mb-8 !mt-0 !leading-none !tracking-normal text-center align-middle" style={{ fontFamily: isEn ? 'inherit' : "'Bahij Janna'" }}>
                    {isEn ? 'Corporate Gifts with Your Identity' : 'هدايا مؤسسية بهويتك الخاصة'}
                </h1>
                
                <p className="text-[#9FB7AE] text-[16px] md:text-[20px] font-medium relative z-10 max-w-2xl leading-[1.6]">
                    {isEn ? 'Premium collections with your company logo — for employees, clients, and official occasions' : 'تشكيلات فاخرة بشعار شركتك — للموظفين والعملاء والمناسبات الرسمية'}
                </p>
            </section>

            {/* Overlapping Stats Pills */}
            <div className="w-full relative z-20 -mt-[42px] mb-20 px-4">
                <div className="max-w-[1000px] mx-auto flex flex-wrap justify-center gap-4 md:gap-5">
                    
                    <div className="bg-[#FEF8EB] px-8 py-4 rounded-[12px] shadow-sm flex flex-col items-center min-w-[150px]">
                        <span className="text-[#234745] font-bold text-[24px] mb-1 leading-none">{isEn ? '500+' : '+٥٠٠'}</span>
                        <span className="text-[#9FB7AE] text-[14px] font-medium">{isEn ? 'Companies trust us' : 'شركة تثق بنا'}</span>
                    </div>

                    <div className="bg-[#FEF8EB] px-8 py-4 rounded-[12px] shadow-sm flex flex-col items-center min-w-[150px]">
                        <span className="text-[#234745] font-bold text-[24px] mb-1 leading-none">{isEn ? '24 Hours' : '٢٤ ساعة'}</span>
                        <span className="text-[#9FB7AE] text-[14px] font-medium">{isEn ? 'Guaranteed response' : 'استجابة مضمونة'}</span>
                    </div>

                    <div className="bg-[#FEF8EB] px-8 py-4 rounded-[12px] shadow-sm flex flex-col items-center min-w-[150px]">
                        <span className="text-[#234745] font-bold text-[24px] mb-1 leading-none">{isEn ? '+35 Cities' : '+٣٥ مدينة'}</span>
                        <span className="text-[#9FB7AE] text-[14px] font-medium">{isEn ? 'We deliver to' : 'نوصل لها'}</span>
                    </div>

                    <div className="bg-[#FEF8EB] px-8 py-4 rounded-[12px] shadow-sm flex flex-col items-center min-w-[150px]">
                        <span className="text-[#234745] font-bold text-[24px] mb-1 leading-none">{isEn ? '20 Boxes' : '٢٠ علبة'}</span>
                        <span className="text-[#9FB7AE] text-[14px] font-medium">{isEn ? 'Minimum order' : 'حد أدنى'}</span>
                    </div>

                </div>
            </div>

            {/* 2. How it Works */}
            <section className="w-full bg-[#234745] py-16 px-4">
                <div className="max-w-[1280px] mx-auto flex flex-col items-center gap-10">
                    
                    {/* Header */}
                    <div className="flex flex-col items-center text-center gap-3">
                        <h4 className="text-[#C5A96A] font-medium text-[18px] leading-[22px]">{isEn ? 'How it works' : 'طريقة العمل'}</h4>
                        <h2 className="text-[#FEF8EB] text-[36px] md:text-[50px] font-bold leading-tight">{isEn ? 'How does the service work?' : 'كيف تعمل الخدمة؟'}</h2>
                        <p className="text-[#9FB7AE] text-[16px] md:text-[18px] font-medium leading-[22px]">{isEn ? 'Three simple steps from choosing your path to delivering the gift' : 'ثلاث خطوات بسبطة من اختيار المسار وحتي وصول الهدية إلي المُستلم'}</p>
                    </div>

                    {/* Steps Grid */}
                    <div className="flex flex-col md:flex-row justify-center items-center w-full gap-8">
                        
                        {/* Step 1 */}
                        <div className="flex-1 flex flex-col items-center p-8 gap-4 w-full md:max-w-[405px] bg-[#274D4B] border border-[#9FB7AE] rounded-[20px] text-center h-[208px] justify-center">
                            <div className="w-12 h-12 rounded-full bg-[#C5A96A] text-[#234745] flex items-center justify-center font-bold text-[26px]">1</div>
                            <h3 className="text-[#FEF8EB] font-bold text-[22px] md:text-[26px] leading-[42px] m-0">{isEn ? 'Choose Path' : 'اختر المسار'}</h3>
                            <p className="text-[#9FB7AE] text-[14px] leading-[17px] m-0 max-w-[300px]">{isEn ? 'Select a ready order or a custom quote that suits your company needs.' : 'حدّد بين طلب جاهز أو عرض سعر مخصص يناسب احتياج شركتك.'}</p>
                        </div>

                        {/* Step 2 */}
                        <div className="flex-1 flex flex-col items-center p-8 gap-4 w-full md:max-w-[405px] bg-[#274D4B] border border-[#9FB7AE] rounded-[20px] text-center h-[208px] justify-center">
                            <div className="w-12 h-12 rounded-full bg-[#C5A96A] text-[#234745] flex items-center justify-center font-bold text-[26px]">2</div>
                            <h3 className="text-[#FEF8EB] font-bold text-[22px] md:text-[26px] leading-[42px] m-0">{isEn ? 'Customize Details' : 'خصص التفاصيل'}</h3>
                            <p className="text-[#9FB7AE] text-[14px] leading-[17px] m-0 max-w-[300px]">{isEn ? 'Choose the collection, add your logo, and specify quantity and packaging.' : 'اختر التشكيلة، أضف الشعار، وحدّد الكمية والتغليف المناسب.'}</p>
                        </div>

                        {/* Step 3 */}
                        <div className="flex-1 flex flex-col items-center p-8 gap-4 w-full md:max-w-[405px] bg-[#274D4B] border border-[#9FB7AE] rounded-[20px] text-center h-[208px] justify-center">
                            <div className="w-12 h-12 rounded-full bg-[#C5A96A] text-[#234745] flex items-center justify-center font-bold text-[26px]">3</div>
                            <h3 className="text-[#FEF8EB] font-bold text-[22px] md:text-[26px] leading-[42px] m-0">{isEn ? 'Receive Gifts' : 'استلم الهدايا'}</h3>
                            <p className="text-[#9FB7AE] text-[14px] leading-[17px] m-0 max-w-[300px]">{isEn ? 'We prepare and pack within 24h and deliver to any city.' : 'نجهّز ونغلّف خلال ٢٤ ساعة ونوصل إلى أي مدينة تختارها.'}</p>
                        </div>

                    </div>
                </div>
            </section>

            {/* 3. How to Proceed? (Quick Order vs Custom Quote) */}
            <section className="w-full bg-white py-20 px-4 border-b border-[#9FB7AE]">
                <div className="max-w-[1280px] mx-auto flex flex-col items-center gap-10">
                    
                    {/* Header */}
                    <div className="flex flex-col items-center text-center gap-2">
                        <h4 className="text-[#906B51] font-medium text-[18px] leading-[22px]">{isEn ? 'Choose Your Path' : 'اختر مسارك'}</h4>
                        <h2 className="text-[#234745] text-[36px] md:text-[50px] font-bold leading-[80px]" style={{ fontFamily: isEn ? 'inherit' : "'Bahij Janna'" }}>{isEn ? 'How would you like to proceed?' : 'كيف تريد المتابعة؟'}</h2>
                    </div>

                    {/* Cards Grid */}
                    <div className="flex flex-col md:flex-row w-full gap-8 justify-center">
                        
                        {/* Custom Quote Card */}
                        <a href="#custom-quote" className="flex-1 flex flex-row justify-end items-start p-6 md:p-8 gap-6 bg-white border border-[#9FB7AE] rounded-[12px] hover:shadow-md transition-shadow group">
                            
                            <div className="flex flex-col justify-center items-end gap-4 flex-1">
                                <h3 className="text-[#234745] font-bold text-[18px] leading-[22px] text-right m-0">{isEn ? 'Custom Quote' : 'عرض سعر مخصص'}</h3>
                                <p className="text-[#9FB7AE] text-[14px] leading-[17px] font-medium text-right m-0">{isEn ? 'For large orders or special customization — an account manager will contact you' : 'للطلبات الكبيرة أو التخصيص الخاص — مدير حساب سيتواصل معك'}</p>
                                <div className="bg-[#FEF8EB] px-4 py-2 rounded-full flex items-center justify-center mt-2 group-hover:bg-[#f6ebd4] transition-colors">
                                    <span className="text-[#906B51] font-bold text-[14px] leading-[17px]">{isEn ? '200+ Boxes or Custom Order' : '+٢٠٠ علبة أو طلب خاص'}</span>
                                </div>
                            </div>

                            <div className="w-12 h-12 bg-[#BBCFCD]/50 rounded-full flex-none relative flex items-center justify-center">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="stroke-[#234745]" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </div>

                        </a>

                        {/* Quick Order Card */}
                        <a href="#products" className="flex-1 flex flex-row justify-end items-start p-6 md:p-8 gap-6 bg-[#FEF8EB] border border-[#234745] rounded-[12px] hover:shadow-md transition-shadow group">
                            
                            <div className="flex flex-col justify-center items-end gap-4 flex-1">
                                <h3 className="text-[#234745] font-bold text-[18px] leading-[22px] text-right m-0">{isEn ? 'Self Order' : 'طلب ذاتي'}</h3>
                                <p className="text-[#9FB7AE] text-[14px] leading-[17px] font-medium text-right m-0">{isEn ? 'Choose your products and logo and pay directly — no waiting' : 'اختر منتجاتك وشعارك وادفع مباشرة — بدون انتظار'}</p>
                                <div className="bg-[#BBCFCD] px-4 py-2 rounded-full flex items-center justify-center mt-2 group-hover:bg-[#a5bdbb] transition-colors">
                                    <span className="text-[#234745] font-bold text-[14px] leading-[17px]">{isEn ? '20 - 200 Boxes' : '٢٠ - ٢٠٠ علبة'}</span>
                                </div>
                            </div>

                            <div className="w-12 h-12 bg-[#BBCFCD]/50 rounded-full flex-none relative flex items-center justify-center">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="stroke-[#234745]" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                            </div>

                        </a>

                    </div>
                </div>
            </section>

            {/* 4. Product Selection */}
            <section id="products" className="w-full bg-[#FEF8EB] py-20 px-4">
                <div className="max-w-[1280px] mx-auto flex flex-col gap-8">
                    
                    {/* Header */}
                    <div className="flex flex-col items-center text-center gap-3">
                        <h4 className="text-[#906B51] font-medium text-[18px] leading-[22px]">{isEn ? 'Collections' : 'التشكيلات'}</h4>
                        <h2 className="text-[#234745] text-[36px] md:text-[50px] font-bold leading-[80px]" style={{ fontFamily: isEn ? 'inherit' : "'Bahij Janna'" }}>{isEn ? 'Choose Your Selection' : 'اختر تشكيلتك'}</h2>
                        <p className="text-[#9FB7AE] text-[16px] md:text-[18px] font-medium leading-[22px]">{isEn ? '12 B2B collections fitting every corporate occasion and budget' : '١٢ تشكيلة B2B تناسب كل مناسبة وميزانية مؤسسية'}</p>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-row justify-end items-center gap-[12px] md:gap-[126px] mt-4 mb-4">
                        <div className="flex flex-wrap items-center justify-end gap-[10px]">
                            
                            {/* Filter 1: Accept Logo? */}
                            <div className="flex flex-row justify-between items-center px-4 py-2 w-[192px] h-[40px] border border-[#BBCFCD] rounded-[16px] bg-transparent">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#234745" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                <span className="text-[#255441] font-medium text-[16px]">{isEn ? 'Accepts Logo?' : 'يقبل شعار؟'}</span>
                            </div>

                            {/* Filter 2: Size */}
                            <div className="flex flex-row justify-between items-center px-4 py-2 w-[192px] h-[40px] border border-[#BBCFCD] rounded-[16px] bg-transparent">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#234745" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                <span className="text-[#255441] font-medium text-[16px]">{isEn ? 'Size' : 'الحجم'}</span>
                            </div>

                            {/* Filter 3: All */}
                            <div className="flex flex-row justify-between items-center px-4 py-2 w-[192px] h-[40px] border border-[#BBCFCD] rounded-[16px] bg-transparent">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#234745" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                <span className="text-[#255441] font-medium text-[16px]">{isEn ? 'All' : 'الكل'}</span>
                            </div>
                        </div>
                        <span className="text-[#234745] font-bold text-[16px] hidden md:block">{isEn ? 'Box Budget:' : 'الميزانية للعلبة:'}</span>
                    </div>

                    {/* Products Grid - Mockup Data */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        
                        {/* Card 1: Pistachio */}
                        <div className="w-full max-w-[411px] mx-auto bg-[#F9F9F9] rounded-[20px] overflow-hidden flex flex-col hover:shadow-lg transition-shadow">
                            {/* Image Header */}
                            <div className="relative w-full h-[216px] bg-[#F6F1EC]">
                                <img src="https://cdn.shopify.com/s/files/1/0616/1606/2642/files/cake.png" alt="Pistachio" className="w-full h-full object-cover" />
                                {/* Top Badges */}
                                <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                                    <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-[25px] border border-[#234745]/30">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#255441" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                        <span className="text-[#255441] font-medium text-[14px]">{isEn ? 'Logo' : 'شعار'}</span>
                                    </div>
                                    <div className="bg-[#234745] px-3 py-1 rounded-[25px]">
                                        <span className="text-[#FEF8EB] font-bold text-[14px]">{isEn ? 'Best Seller' : 'الأكثر طلباً'}</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Card Content */}
                            <div className="flex flex-col p-6 gap-4">
                                <div className="flex flex-col gap-2 text-right">
                                    <h3 className="text-[#234745] font-bold text-[16px] m-0">{isEn ? 'Premium Pistachio Collection' : 'تشكيلة الفستق الفاخرة'}</h3>
                                    <p className="text-[#9FB7AE] font-medium text-[14px] m-0">{isEn ? 'Maamoul + Baklava + Mixed Sweets — Medium Box' : 'معمول + بقلاوة + حلوى مشكلة — علبة وسط'}</p>
                                </div>

                                {/* Pricing Box */}
                                <div className="bg-[#FEF8EB] border border-[#BBCFCD]/50 rounded-[12px] p-4 flex flex-col gap-4">
                                    <h4 className="text-[#906B51] font-bold text-[14px] text-right m-0 border-b border-[#BBCFCD]/30 pb-2">{isEn ? 'Wholesale Prices' : 'أسعار الجملة'}</h4>
                                    
                                    <div className="flex flex-col gap-3">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-1">
                                                <span className="text-[#234745] font-bold text-[16px] font-['Bahij_Janna']">85</span>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#234745" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                                            </div>
                                            <span className="text-[#9FB7AE] font-medium text-[14px]">{isEn ? '20 - 49 Boxes' : '٢٠–٤٩ علبة'}</span>
                                        </div>
                                        
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-1">
                                                <span className="text-[#234745] font-bold text-[16px] font-['Bahij_Janna']">78</span>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#234745" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                                            </div>
                                            <span className="text-[#9FB7AE] font-medium text-[14px]">{isEn ? '50 - 99 Boxes' : '٥٠–٩٩ علبة'}</span>
                                        </div>

                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[#234745] font-bold text-[16px] font-['Bahij_Janna']">72</span>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#234745" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                                                <div className="bg-[#234745] px-2 py-0.5 rounded-[25px]">
                                                    <span className="text-[#FEF8EB] font-bold text-[12px]">{isEn ? 'Best' : 'الأفضل'}</span>
                                                </div>
                                            </div>
                                            <span className="text-[#9FB7AE] font-medium text-[14px]">{isEn ? '100+ Boxes' : '١٠٠+ علبة'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Button */}
                                <button className="w-full bg-[#234745] text-[#FEF8EB] font-bold text-[16px] py-3 rounded-[25px] hover:bg-[#1a3533] transition-colors mt-2">
                                    {isEn ? 'Choose & Customize' : 'إختر وخصص'}
                                </button>
                            </div>
                        </div>

                        {/* Card 2: Chocolates */}
                        <div className="w-full max-w-[411px] mx-auto bg-[#F9F9F9] rounded-[20px] overflow-hidden flex flex-col hover:shadow-lg transition-shadow">
                            <div className="relative w-full h-[216px] bg-[#F6F1EC]">
                                <img src="https://cdn.shopify.com/s/files/1/0616/1606/2642/files/chocolate.png" alt="Chocolate" className="w-full h-full object-cover" />
                                <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                                    <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-[25px] border border-[#234745]/30">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#255441" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                        <span className="text-[#255441] font-medium text-[14px]">{isEn ? 'Logo' : 'شعار'}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex flex-col p-6 gap-4">
                                <div className="flex flex-col gap-2 text-right">
                                    <h3 className="text-[#234745] font-bold text-[16px] m-0">{isEn ? 'Luxury Chocolate Box' : 'صندوق الشوكولاتة الفاخر'}</h3>
                                    <p className="text-[#9FB7AE] font-medium text-[14px] m-0">{isEn ? 'Assorted Belgian Chocolates — 24 Pieces' : 'شوكولاتة بلجيكية مشكلة — ٢٤ قطعة'}</p>
                                </div>

                                <div className="bg-[#FEF8EB] border border-[#BBCFCD]/50 rounded-[12px] p-4 flex flex-col gap-4">
                                    <h4 className="text-[#906B51] font-bold text-[14px] text-right m-0 border-b border-[#BBCFCD]/30 pb-2">{isEn ? 'Wholesale Prices' : 'أسعار الجملة'}</h4>
                                    
                                    <div className="flex flex-col gap-3">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-1">
                                                <span className="text-[#234745] font-bold text-[16px] font-['Bahij_Janna']">120</span>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#234745" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                                            </div>
                                            <span className="text-[#9FB7AE] font-medium text-[14px]">{isEn ? '20 - 49 Boxes' : '٢٠–٤٩ علبة'}</span>
                                        </div>
                                        
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-1">
                                                <span className="text-[#234745] font-bold text-[16px] font-['Bahij_Janna']">110</span>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#234745" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                                            </div>
                                            <span className="text-[#9FB7AE] font-medium text-[14px]">{isEn ? '50 - 99 Boxes' : '٥٠–٩٩ علبة'}</span>
                                        </div>

                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[#234745] font-bold text-[16px] font-['Bahij_Janna']">100</span>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#234745" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                                                <div className="bg-[#234745] px-2 py-0.5 rounded-[25px]">
                                                    <span className="text-[#FEF8EB] font-bold text-[12px]">{isEn ? 'Best' : 'الأفضل'}</span>
                                                </div>
                                            </div>
                                            <span className="text-[#9FB7AE] font-medium text-[14px]">{isEn ? '100+ Boxes' : '١٠٠+ علبة'}</span>
                                        </div>
                                    </div>
                                </div>

                                <button className="w-full bg-[#234745] text-[#FEF8EB] font-bold text-[16px] py-3 rounded-[25px] hover:bg-[#1a3533] transition-colors mt-2">
                                    {isEn ? 'Choose & Customize' : 'إختر وخصص'}
                                </button>
                            </div>
                        </div>

                        {/* Card 3: Dates and Coffee */}
                        <div className="w-full max-w-[411px] mx-auto bg-[#F9F9F9] rounded-[20px] overflow-hidden flex flex-col hover:shadow-lg transition-shadow">
                            <div className="relative w-full h-[216px] bg-[#F6F1EC]">
                                <img src="https://cdn.shopify.com/s/files/1/0616/1606/2642/files/dates.png" alt="Dates" className="w-full h-full object-cover" />
                                <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
                                    <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-[25px] border border-[#234745]/30">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#255441" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                        <span className="text-[#255441] font-medium text-[14px]">{isEn ? 'Logo' : 'شعار'}</span>
                                    </div>
                                    <div className="bg-[#234745] px-3 py-1 rounded-[25px]">
                                        <span className="text-[#FEF8EB] font-bold text-[14px]">{isEn ? 'Eid Special' : 'مناسب للعيد'}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex flex-col p-6 gap-4">
                                <div className="flex flex-col gap-2 text-right">
                                    <h3 className="text-[#234745] font-bold text-[16px] m-0">{isEn ? 'Dates & Arabic Coffee Collection' : 'تشكيلة التمر والقهوة العربية'}</h3>
                                    <p className="text-[#9FB7AE] font-medium text-[14px] m-0">{isEn ? 'Medjool Dates + Arabic Coffee + Traditional Sweets' : 'تمر مجدول + قهوة عربية + حلوى تراثية'}</p>
                                </div>

                                <div className="bg-[#FEF8EB] border border-[#BBCFCD]/50 rounded-[12px] p-4 flex flex-col gap-4">
                                    <h4 className="text-[#906B51] font-bold text-[14px] text-right m-0 border-b border-[#BBCFCD]/30 pb-2">{isEn ? 'Wholesale Prices' : 'أسعار الجملة'}</h4>
                                    
                                    <div className="flex flex-col gap-3">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-1">
                                                <span className="text-[#234745] font-bold text-[16px] font-['Bahij_Janna']">95</span>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#234745" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                                            </div>
                                            <span className="text-[#9FB7AE] font-medium text-[14px]">{isEn ? '20 - 49 Boxes' : '٢٠–٤٩ علبة'}</span>
                                        </div>
                                        
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-1">
                                                <span className="text-[#234745] font-bold text-[16px] font-['Bahij_Janna']">88</span>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#234745" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                                            </div>
                                            <span className="text-[#9FB7AE] font-medium text-[14px]">{isEn ? '50 - 99 Boxes' : '٥٠–٩٩ علبة'}</span>
                                        </div>

                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[#234745] font-bold text-[16px] font-['Bahij_Janna']">80</span>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#234745" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                                                <div className="bg-[#234745] px-2 py-0.5 rounded-[25px]">
                                                    <span className="text-[#FEF8EB] font-bold text-[12px]">{isEn ? 'Best' : 'الأفضل'}</span>
                                                </div>
                                            </div>
                                            <span className="text-[#9FB7AE] font-medium text-[14px]">{isEn ? '100+ Boxes' : '١٠٠+ علبة'}</span>
                                        </div>
                                    </div>
                                </div>

                                <button className="w-full bg-[#234745] text-[#FEF8EB] font-bold text-[16px] py-3 rounded-[25px] hover:bg-[#1a3533] transition-colors mt-2">
                                    {isEn ? 'Choose & Customize' : 'إختر وخصص'}
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* 5. Packages */}
            <section className="w-full bg-white py-20 px-4">
                <div className="max-w-[1200px] mx-auto text-center">
                    <h4 className="text-[#8B8B8B] font-bold text-[14px] mb-2">{isEn ? 'Packages' : 'الباقات'}</h4>
                    <h2 className="text-[#1A1A1A] text-[28px] md:text-[36px] font-bold mb-12">{isEn ? 'Corporate Gift Packages' : 'باقات الهدايا المؤسسية'}</h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Custom Package */}
                        <div className="bg-[#D3DFDE] rounded-[24px] p-8 flex flex-col items-center text-center hover:shadow-lg transition-shadow">
                            <div className="bg-white text-[#234745] px-4 py-1.5 rounded-full text-[12px] font-bold mb-8 self-end">{isEn ? 'Custom' : 'مخصصة'}</div>
                            <div className="mb-8">
                                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#234745" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
                            </div>
                            <h3 className="text-[#234745] font-bold text-[22px] mb-3">{isEn ? 'Custom Corporate Package' : 'باقة مؤسسية مخصصة'}</h3>
                            <p className="text-[#234745]/70 text-[14px] mb-6 font-medium leading-relaxed">
                                {isEn ? 'Fully tailored design exactly as you want, with various box and printing options.' : 'تصميم مخصص لك كما تريد بالضبط، مع خيارات متنوعة للطباعة والعلب حسب طلبك.'}
                            </p>
                            <button className="text-[#234745] font-bold text-[14px] mt-auto flex items-center gap-2 group">
                                <span>{isEn ? 'Request Details' : 'عرض التفاصيل'}</span>
                                <span className="group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">→</span>
                            </button>
                        </div>

                        {/* VIP Package */}
                        <div className="bg-[#234745] rounded-[24px] p-8 flex flex-col items-center text-center hover:shadow-xl transition-shadow transform md:-translate-y-4 shadow-2xl border-4 border-white">
                            <div className="bg-[#EBCB8D] text-[#234745] px-4 py-1.5 rounded-full text-[12px] font-bold mb-8 self-end">{isEn ? 'VIP' : 'المميزة'}</div>
                            <div className="mb-8">
                                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#EBCB8D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                            </div>
                            <h3 className="text-[#EBCB8D] font-bold text-[22px] mb-3">{isEn ? 'VIP Royal Package' : 'باقة VIP الملكية'}</h3>
                            <p className="text-[#BBCFCD] text-[14px] mb-6 font-medium leading-relaxed">
                                {isEn ? 'A luxurious combination of premium sweets and fine chocolates wrapped meticulously.' : 'مزيج رائع وحصري من أفخم أنواع الحلويات والشوكولاتة الفاخرة تغلف بعناية تامة.'}
                            </p>
                            <button className="text-[#EBCB8D] font-bold text-[14px] mt-auto flex items-center gap-2 group">
                                <span>{isEn ? 'Request Details' : 'عرض التفاصيل'}</span>
                                <span className="group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">→</span>
                            </button>
                        </div>

                        {/* Classic Package */}
                        <div className="bg-[#D3DFDE] rounded-[24px] p-8 flex flex-col items-center text-center hover:shadow-lg transition-shadow">
                            <div className="bg-white text-[#234745] px-4 py-1.5 rounded-full text-[12px] font-bold mb-8 self-end">{isEn ? 'Classic' : 'كلاسيك'}</div>
                            <div className="mb-8">
                                <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#234745" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>
                            </div>
                            <h3 className="text-[#234745] font-bold text-[22px] mb-3">{isEn ? 'Classic Package' : 'الباقة الكلاسيكية'}</h3>
                            <p className="text-[#234745]/70 text-[14px] mb-6 font-medium leading-relaxed">
                                {isEn ? 'An elegant gift that perfectly matches the spirit of the occasion with distinction.' : 'هدية أنيقة ومناسبة لاحتياجاتك الرسمية تتطابق مع روح وشعار مؤسستك.'}
                            </p>
                            <button className="text-[#234745] font-bold text-[14px] mt-auto flex items-center gap-2 group">
                                <span>{isEn ? 'Request Details' : 'عرض التفاصيل'}</span>
                                <span className="group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">→</span>
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* 6. Custom Identity */}
            <section className="w-full bg-[#FEF8EB] py-20 px-4">
                <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center gap-12 lg:gap-20">
                    
                    <div className="w-full md:w-1/2">
                        <h2 className="text-[32px] md:text-[40px] font-bold text-[#1A1A1A] mb-6 leading-tight">
                            {isEn ? 'A Design That Reflects Your Identity' : 'تصميم يعكس هويتك'}
                        </h2>
                        <p className="text-[#8B8B8B] text-[16px] mb-10 font-medium leading-relaxed">
                            {isEn ? 'We understand that your gift represents your brand. We give you full control to customize exactly what fits your corporate identity.' : 'نتفهم أن هديتك تمثل شركتك ولذلك نمنحك الحرية في التعديل على العلب وبطاقات الإهداء بشكل يتوافق مع هويتك.'}
                        </p>

                        <div className="flex justify-between items-start">
                            <div className="flex flex-col items-center text-center w-1/3">
                                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm mb-3">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#234745" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
                                </div>
                                <span className="text-[#234745] font-bold text-[13px]">{isEn ? 'Custom Box' : 'تغليف مخصص'}</span>
                            </div>
                            
                            <div className="flex flex-col items-center text-center w-1/3">
                                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm mb-3">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#234745" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1v12z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
                                </div>
                                <span className="text-[#234745] font-bold text-[13px]">{isEn ? 'Ribbon Logo' : 'شريطة بشعارك'}</span>
                            </div>

                            <div className="flex flex-col items-center text-center w-1/3">
                                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm mb-3">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#234745" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                                </div>
                                <span className="text-[#234745] font-bold text-[13px]">{isEn ? 'Card Print' : 'طباعة الكرت'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="w-full md:w-1/2">
                        <div className="w-full aspect-[4/3] bg-[#234745] rounded-[32px] overflow-hidden shadow-2xl relative">
                             {/* Image Placeholder */}
                             <div className="absolute inset-0 opacity-80" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=1200&auto=format&fit=crop')`, backgroundSize: 'cover', backgroundPosition: 'center', mixBlendMode: 'luminosity' }}></div>
                             <div className="absolute inset-0 bg-[#234745]/30"></div>
                        </div>
                    </div>

                </div>
            </section>

            {/* 7. Why Choose Us */}
            <section className="w-full bg-white py-20 px-4">
                <div className="max-w-[1200px] mx-auto text-center">
                    <h4 className="text-[#8B8B8B] font-bold text-[14px] mb-2">{isEn ? 'Our Advantages' : 'ميزتنا'}</h4>
                    <h2 className="text-[#1A1A1A] text-[28px] md:text-[36px] font-bold mb-12">{isEn ? 'Why Choose Us?' : 'لماذا تختارنا؟'}</h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        
                        <div className="border border-gray-100 rounded-[20px] p-6 flex flex-col text-center items-center hover:border-[#234745] transition-colors bg-white hover:shadow-lg">
                            <div className="w-12 h-12 bg-[#234745] rounded-lg flex items-center justify-center mb-4">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                            </div>
                            <h3 className="text-[#1A1A1A] font-bold text-[18px] mb-2">{isEn ? 'Premium Quality' : 'جودة فاخرة'}</h3>
                            <p className="text-[#8B8B8B] text-[13px] font-medium leading-relaxed">
                                {isEn ? 'The finest ingredients for the best taste.' : 'نستخدم أفضل المكونات لنضمن لك منتجاً يليق بمكانتك.'}
                            </p>
                        </div>

                        <div className="border border-gray-100 rounded-[20px] p-6 flex flex-col text-center items-center hover:border-[#234745] transition-colors bg-white hover:shadow-lg">
                            <div className="w-12 h-12 bg-[#234745] rounded-lg flex items-center justify-center mb-4">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
                            </div>
                            <h3 className="text-[#1A1A1A] font-bold text-[18px] mb-2">{isEn ? 'Fast Delivery' : 'توصيل سريع'}</h3>
                            <p className="text-[#8B8B8B] text-[13px] font-medium leading-relaxed">
                                {isEn ? 'Punctual delivery for your important occasions.' : 'نلتزم بالمواعيد لضمان وصول الهدايا في وقتها المحدد.'}
                            </p>
                        </div>

                        <div className="border border-gray-100 rounded-[20px] p-6 flex flex-col text-center items-center hover:border-[#234745] transition-colors bg-white hover:shadow-lg">
                            <div className="w-12 h-12 bg-[#234745] rounded-lg flex items-center justify-center mb-4">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                            </div>
                            <h3 className="text-[#1A1A1A] font-bold text-[18px] mb-2">{isEn ? 'Trusted Brand' : 'علامة موثوقة'}</h3>
                            <p className="text-[#8B8B8B] text-[13px] font-medium leading-relaxed">
                                {isEn ? 'Over 100 years of experience in sweet making.' : 'خبرة تتجاوز المئة عام في صناعة الحلويات.'}
                            </p>
                        </div>

                        <div className="border border-gray-100 rounded-[20px] p-6 flex flex-col text-center items-center hover:border-[#234745] transition-colors bg-white hover:shadow-lg">
                            <div className="w-12 h-12 bg-[#234745] rounded-lg flex items-center justify-center mb-4">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                            </div>
                            <h3 className="text-[#1A1A1A] font-bold text-[18px] mb-2">{isEn ? 'Dedicated Support' : 'دعم مخصص'}</h3>
                            <p className="text-[#8B8B8B] text-[13px] font-medium leading-relaxed">
                                {isEn ? 'A dedicated team to manage your corporate requests.' : 'فريق متخصص لتلبية متطلبات الشركات بكفاءة.'}
                            </p>
                        </div>

                        <div className="border border-gray-100 rounded-[20px] p-6 flex flex-col text-center items-center hover:border-[#234745] transition-colors bg-white hover:shadow-lg">
                            <div className="w-12 h-12 bg-[#234745] rounded-lg flex items-center justify-center mb-4">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                            </div>
                            <h3 className="text-[#1A1A1A] font-bold text-[18px] mb-2">{isEn ? 'Elegant Packaging' : 'تغليف أنيق'}</h3>
                            <p className="text-[#8B8B8B] text-[13px] font-medium leading-relaxed">
                                {isEn ? 'Luxurious boxes that add value to your gift.' : 'علب فاخرة مصممة لتضيف لمسة راقية لهديتك.'}
                            </p>
                        </div>

                        <div className="border border-gray-100 rounded-[20px] p-6 flex flex-col text-center items-center hover:border-[#234745] transition-colors bg-white hover:shadow-lg">
                            <div className="w-12 h-12 bg-[#234745] rounded-lg flex items-center justify-center mb-4">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                            </div>
                            <h3 className="text-[#1A1A1A] font-bold text-[18px] mb-2">{isEn ? 'Custom Identity' : 'هوية مخصصة'}</h3>
                            <p className="text-[#8B8B8B] text-[13px] font-medium leading-relaxed">
                                {isEn ? 'Print your logo on boxes and ribbons.' : 'إمكانية دمج شعار شركتك على العلب والتغليف.'}
                            </p>
                        </div>

                    </div>
                </div>
            </section>

        </div>
    );
}
