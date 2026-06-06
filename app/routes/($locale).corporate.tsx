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
            <section className="relative w-full bg-[#234745] overflow-hidden flex flex-col justify-center items-center text-center px-4 pt-16 pb-20 border-b-2 border-b-[#BBCFCD]/20">
                <div 
                    className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay" 
                    style={{ backgroundImage: `url(${patternBg})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} 
                />
                
                <h1 className="text-[#FEF8EB] text-[32px] md:text-[46px] font-black relative z-10 mb-4 leading-tight">
                    {isEn ? 'Corporate Gifts with Your Identity' : 'هدايا مؤسسية بهويتك الخاصة'}
                </h1>
                
                <p className="text-[#BBCFCD] text-[16px] md:text-[20px] font-medium relative z-10 mb-12 max-w-2xl">
                    {isEn ? 'Design gifts that reflect your company\'s identity with the finest sweets and chocolates' : 'صمم هدايا تعكس هوية شركتك بأرقى أنواع الحلويات والشوكولاتة'}
                </p>

                {/* Stats Pills */}
                <div className="relative z-10 flex flex-wrap justify-center gap-3 md:gap-6">
                    <div className="bg-white px-6 py-2 rounded-full font-bold text-[#234745] text-[14px] md:text-[16px] shadow-lg flex flex-col items-center leading-tight">
                        <span className="font-black text-[18px]">30+</span>
                        <span className="text-[12px] opacity-80">{isEn ? 'Brands' : 'علامة تجارية'}</span>
                    </div>
                    <div className="bg-white px-6 py-2 rounded-full font-bold text-[#234745] text-[14px] md:text-[16px] shadow-lg flex flex-col items-center leading-tight">
                        <span className="font-black text-[18px]">+25</span>
                        <span className="text-[12px] opacity-80">{isEn ? 'Cities covered' : 'مدينة نغطيها'}</span>
                    </div>
                    <div className="bg-white px-6 py-2 rounded-full font-bold text-[#234745] text-[14px] md:text-[16px] shadow-lg flex flex-col items-center leading-tight">
                        <span className="font-black text-[18px]">48h</span>
                        <span className="text-[12px] opacity-80">{isEn ? 'To execute' : 'ساعة للتنفيذ'}</span>
                    </div>
                    <div className="bg-white px-6 py-2 rounded-full font-bold text-[#234745] text-[14px] md:text-[16px] shadow-lg flex flex-col items-center leading-tight">
                        <span className="font-black text-[18px]">99.9%</span>
                        <span className="text-[12px] opacity-80">{isEn ? 'Satisfaction' : 'رضا العملاء'}</span>
                    </div>
                </div>
            </section>

            {/* 2. How it Works */}
            <section className="w-full bg-[#294c4a] py-16 px-4 border-t-2 border-[#1e3b3a]">
                <div className="max-w-[1000px] mx-auto text-center">
                    <h4 className="text-[#BBCFCD] font-bold text-[14px] mb-2">{isEn ? 'Service Workflow' : 'سير العمل'}</h4>
                    <h2 className="text-white text-[28px] md:text-[36px] font-bold mb-4">{isEn ? 'How does the service work?' : 'كيف تعمل الخدمة؟'}</h2>
                    <p className="text-[#BBCFCD] text-[15px] mb-12">{isEn ? 'Three simple steps to deliver your message through our gifts' : 'ثلاث خطوات بسيطة لتوصيل رسالتك عبر هدايانا لتصل لمن تحب'}</p>

                    <div className="flex flex-col md:flex-row justify-between gap-6 md:gap-4 relative z-10">
                        {/* Step 1 */}
                        <div className="flex-1 border border-[#BBCFCD]/30 rounded-2xl p-6 relative bg-[#234745]/50 flex flex-col items-center hover:bg-[#234745] transition-colors">
                            <div className="w-10 h-10 rounded-full bg-[#EBCB8D] text-[#234745] flex items-center justify-center font-bold text-xl mb-4">1</div>
                            <h3 className="text-white font-bold text-[18px] mb-2">{isEn ? 'Choose Product' : 'اختر المنتج'}</h3>
                            <p className="text-[#BBCFCD] text-[14px]">{isEn ? 'Select what suits you from our huge catalog' : 'اختر ما يناسبك من منتجاتنا في الكتالوج الخاص بك'}</p>
                        </div>
                        {/* Step 2 */}
                        <div className="flex-1 border border-[#BBCFCD]/30 rounded-2xl p-6 relative bg-[#234745]/50 flex flex-col items-center hover:bg-[#234745] transition-colors">
                            <div className="w-10 h-10 rounded-full bg-[#EBCB8D] text-[#234745] flex items-center justify-center font-bold text-xl mb-4">2</div>
                            <h3 className="text-white font-bold text-[18px] mb-2">{isEn ? 'Customize Details' : 'خصص التفاصيل'}</h3>
                            <p className="text-[#BBCFCD] text-[14px]">{isEn ? 'Add your touches and company identity' : 'أضف لمساتك الخاصة وهوية الشركة على الهدايا'}</p>
                        </div>
                        {/* Step 3 */}
                        <div className="flex-1 border border-[#BBCFCD]/30 rounded-2xl p-6 relative bg-[#234745]/50 flex flex-col items-center hover:bg-[#234745] transition-colors">
                            <div className="w-10 h-10 rounded-full bg-[#EBCB8D] text-[#234745] flex items-center justify-center font-bold text-xl mb-4">3</div>
                            <h3 className="text-white font-bold text-[18px] mb-2">{isEn ? 'Receive Gifts' : 'استلم الهدايا'}</h3>
                            <p className="text-[#BBCFCD] text-[14px]">{isEn ? 'We prepare and deliver it with love and care' : 'نقوم بتجهيزها وتوصيلها لك بكل حب وعناية'}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. How to Proceed? (Quick Order vs Custom Quote) */}
            <section className="w-full bg-white py-20 px-4">
                <div className="max-w-[1000px] mx-auto text-center">
                    <h4 className="text-[#8B8B8B] font-bold text-[14px] mb-2">{isEn ? 'Take Action' : 'اتخذ خطوتك'}</h4>
                    <h2 className="text-[#234745] text-[28px] md:text-[36px] font-bold mb-12">{isEn ? 'How would you like to proceed?' : 'كيف تريد المتابعة؟'}</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                        {/* Custom Quote Card */}
                        <a href="#custom-quote" className="group border border-gray-200 rounded-[24px] p-8 lg:p-10 text-start hover:border-[#234745] transition-colors hover:shadow-xl relative overflow-hidden bg-white">
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-14 h-14 bg-[#FEF8EB] rounded-full flex items-center justify-center group-hover:bg-[#234745] transition-colors">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="stroke-[#234745] group-hover:stroke-white transition-colors" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                </div>
                            </div>
                            <h3 className="text-[22px] font-bold text-[#1A1A1A] mb-3">{isEn ? 'Custom Quote' : 'عرض مخصص'}</h3>
                            <p className="text-[#8B8B8B] text-[15px] mb-8 font-medium">{isEn ? 'Tailored gifts and special printing — perfect for unique quantities' : 'تغليف الهدايا أو تخصيص الشركة — خيار ممتاز للكميات الخاصة'}</p>
                            <span className="inline-block text-[#234745] font-bold text-[15px] border-b-2 border-[#234745] pb-1">{isEn ? 'Request Quote Now' : 'اطلب تسعيرة الآن'}</span>
                        </a>

                        {/* Quick Order Card */}
                        <a href="#products" className="group border border-transparent rounded-[24px] p-8 lg:p-10 text-start transition-colors shadow-xl relative overflow-hidden bg-[#FEF8EB]">
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-14 h-14 bg-[#BBCFCD]/40 rounded-full flex items-center justify-center group-hover:bg-[#234745] transition-colors">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="stroke-[#234745] group-hover:stroke-white transition-colors" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                                </div>
                            </div>
                            <h3 className="text-[22px] font-bold text-[#1A1A1A] mb-3">{isEn ? 'Quick Order' : 'طلب سريع'}</h3>
                            <p className="text-[#8B8B8B] text-[15px] mb-8 font-medium">{isEn ? 'Order standard corporate products quickly — convenient choices' : 'طلب سريع لمنتجاتنا القياسية للشركات — خيار سريع ومريح'}</p>
                            <span className="inline-block bg-[#234745] text-white px-6 py-2.5 rounded-full font-bold text-[14px] group-hover:bg-[#1a3533] transition-colors">{isEn ? 'Shop Now' : 'تسوق الآن'}</span>
                        </a>
                    </div>
                </div>
            </section>

            {/* 4. Product Selection */}
            <section id="products" className="w-full bg-[#FEF8EB] py-20 px-4">
                <div className="max-w-[1200px] mx-auto">
                    <div className="text-center mb-10">
                        <h4 className="text-[#8B8B8B] font-bold text-[14px] mb-2">{isEn ? 'Products' : 'المنتجات'}</h4>
                        <h2 className="text-[#1A1A1A] text-[28px] md:text-[36px] font-bold mb-4">{isEn ? 'Choose Your Selection' : 'اختر تشكيلتك'}</h2>
                        <p className="text-[#8B8B8B] font-medium">{isEn ? 'The best products specifically designed for corporates' : 'أفضل المنتجات المصممة خصيصاً للشركات مع خيارات التخصيص'}</p>
                    </div>

                    {/* Filters mockup */}
                    <div className="flex justify-center md:justify-end gap-4 mb-8">
                        <select className="bg-white border border-gray-200 rounded-full px-6 py-2.5 text-[#234745] font-bold outline-none text-[14px] w-[140px]">
                            <option>{isEn ? 'Category' : 'التصنيف'}</option>
                        </select>
                        <select className="bg-white border border-gray-200 rounded-full px-6 py-2.5 text-[#234745] font-bold outline-none text-[14px] w-[140px]">
                            <option>{isEn ? 'Price' : 'السعر'}</option>
                        </select>
                    </div>

                    {/* Products Grid */}
                    {products && products.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                            {products.map((product: any) => (
                                <ProductItem key={product.id} product={product} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-[#8B8B8B] font-bold">
                            {isEn ? 'No corporate products found.' : 'لا توجد منتجات للشركات حالياً.'}
                        </div>
                    )}
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
