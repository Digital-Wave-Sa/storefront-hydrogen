import { type LoaderFunctionArgs, useRouteLoaderData } from 'react-router';

export default function PromotionsPage() {
    const routeData = useRouteLoaderData('root') as { locale?: string };
    const locale = routeData?.locale || 'ar';
    const isEn = locale.toLowerCase().startsWith('en');

    // Default to RTL if Arabic, else LTR
    const direction = isEn ? 'ltr' : 'rtl';

    return (
        <div className="w-full bg-[#FFFFFF] min-h-screen" dir={direction}>
            {/* 1. Header Section */}
            <section className="relative w-full h-[132px] bg-[#234745] flex flex-col justify-center items-center overflow-hidden">
                {/* Background Pattern - Simplified SVG representing the complex overlapping pattern */}
                <div className="absolute inset-0 opacity-10 flex items-center justify-center">
                    <svg width="100%" height="100%" viewBox="0 0 1440 132" preserveAspectRatio="none">
                        <pattern id="pattern-boxes" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                            <path d="M20 0L40 20L20 40L0 20Z" fill="none" stroke="#FFFFFF" strokeWidth="2" />
                        </pattern>
                        <rect x="0" y="0" width="100%" height="100%" fill="url(#pattern-boxes)" />
                    </svg>
                </div>
                
                <div className="relative z-10 flex flex-col items-center gap-2">
                    <span className="text-[#9FB7AE] font-medium text-[16px]">{isEn ? 'Offers' : 'عروض'}</span>
                    <h1 className="text-white text-[32px] md:text-[36px] font-bold" style={{ fontFamily: isEn ? 'inherit' : "'Bahij Janna'" }}>
                        {isEn ? 'Limited Offers You Shouldn\'t Miss' : 'عروض محدودة لا تفوتك'}
                    </h1>
                </div>
            </section>

            {/* Main Content Area */}
            <div className="w-full pb-20">
                {/* 2. Hero Offer Card */}
                <section className="w-full max-w-[1280px] mx-auto px-4 mt-[-24px] md:mt-10 relative z-20">
                    <div className="w-full bg-white rounded-[24px] border border-[#906B51] p-4 md:p-8 flex flex-col md:flex-row items-center gap-8 shadow-sm">
                        {/* Image Left (RTL: Right) */}
                        <div className="w-full md:w-1/2 h-[300px] md:h-[400px] rounded-[16px] overflow-hidden">
                            <img 
                                src="https://cdn.shopify.com/s/files/1/0616/1606/2642/files/cake.png" 
                                alt="Big Season Sales" 
                                className="w-full h-full object-cover"
                            />
                        </div>

                        {/* Content Right (RTL: Left) */}
                        <div className="w-full md:w-1/2 flex flex-col items-start gap-6">
                            {/* Red Badge */}
                            <div className="bg-[#E63946] px-3 py-1 rounded-[4px] flex items-center gap-2 self-start">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                                <span className="text-white font-bold text-[12px]">{isEn ? 'Limited Offer' : 'عرض محدود'}</span>
                            </div>

                            <div className="flex flex-col gap-2">
                                <h2 className="text-[#234745] text-[36px] md:text-[44px] font-bold leading-tight" style={{ fontFamily: isEn ? 'inherit' : "'Bahij Janna'" }}>
                                    {isEn ? 'Big Season Sales' : 'تخفيضات الموسم الكبيرة'}
                                </h2>
                                <p className="text-[#906B51] text-[16px] font-medium">
                                    {isEn ? 'Discounts up to 40% on our best products for a limited time' : 'خصومات حتى ٤٠٪ على أفضل منتجاتنا لفترة محدودة'}
                                </p>
                            </div>

                            {/* Timer and Code row */}
                            <div className="flex flex-wrap items-center gap-4 mt-2">
                                {/* Timer boxes */}
                                <div className="flex items-center gap-3" dir="ltr">
                                    <div className="flex flex-col items-center justify-center w-[60px] h-[64px] bg-white border border-[#BBCFCD] rounded-[8px]">
                                        <span className="text-[#234745] font-bold text-[20px]">8</span>
                                        <span className="text-[#9FB7AE] text-[12px]">{isEn ? 'Hours' : 'ساعة'}</span>
                                    </div>
                                    <div className="flex flex-col items-center justify-center w-[60px] h-[64px] bg-white border border-[#BBCFCD] rounded-[8px]">
                                        <span className="text-[#234745] font-bold text-[20px]">32</span>
                                        <span className="text-[#9FB7AE] text-[12px]">{isEn ? 'Mins' : 'دقيقة'}</span>
                                    </div>
                                    <div className="flex flex-col items-center justify-center w-[60px] h-[64px] bg-white border border-[#BBCFCD] rounded-[8px]">
                                        <span className="text-[#234745] font-bold text-[20px]">22</span>
                                        <span className="text-[#9FB7AE] text-[12px]">{isEn ? 'Secs' : 'ثانية'}</span>
                                    </div>
                                </div>

                                {/* Copy Code */}
                                <div className="flex items-center justify-between w-[160px] h-[64px] bg-white border border-[#BBCFCD] rounded-[8px] px-3 ml-2 rtl:mr-2 rtl:ml-0">
                                    <span className="text-[#234745] font-bold text-[16px]">SAAD20</span>
                                    <button className="text-[#906B51] text-[12px] font-bold px-2 py-1 bg-[#FEF8EB] rounded-[4px]">
                                        {isEn ? 'Copy' : 'نسخ الكود'}
                                    </button>
                                </div>
                            </div>

                            {/* Action Button */}
                            <button className="w-[180px] h-[48px] bg-[#BBCFCD] text-[#234745] font-bold text-[16px] rounded-[24px] mt-2 hover:bg-[#9FB7AE] transition-colors">
                                {isEn ? 'Shop Now' : 'تسوق الان'}
                            </button>
                        </div>
                    </div>
                </section>

                {/* 3. Filter Bar */}
                <div className="w-full bg-[#FEF8EB] py-4 mt-12 overflow-x-auto">
                    <div className="max-w-[1280px] mx-auto px-4 flex items-center justify-start md:justify-center gap-3 whitespace-nowrap min-w-max">
                        <button className="px-5 py-2 rounded-[24px] bg-[#BBCFCD] text-[#234745] font-bold text-[14px]">
                            {isEn ? 'All (63)' : 'الكل (٦٣)'}
                        </button>
                        <button className="px-5 py-2 rounded-[24px] bg-transparent border border-[#BBCFCD] text-[#9FB7AE] font-medium text-[14px] hover:bg-white transition-colors">
                            {isEn ? 'Chocolate (18)' : 'شوكولاتة (١٨)'}
                        </button>
                        <button className="px-5 py-2 rounded-[24px] bg-transparent border border-[#BBCFCD] text-[#9FB7AE] font-medium text-[14px] hover:bg-white transition-colors">
                            {isEn ? 'Arabic Sweets (24)' : 'حلويات عربية (٢٤)'}
                        </button>
                        <button className="px-5 py-2 rounded-[24px] bg-transparent border border-[#BBCFCD] text-[#9FB7AE] font-medium text-[14px] hover:bg-white transition-colors">
                            {isEn ? 'Gifts (12)' : 'هدايا (١٢)'}
                        </button>
                        <button className="px-5 py-2 rounded-[24px] bg-transparent border border-[#BBCFCD] text-[#9FB7AE] font-medium text-[14px] hover:bg-white transition-colors">
                            {isEn ? 'Cakes (9)' : 'كيك (٩)'}
                        </button>
                        <button className="px-5 py-2 rounded-[24px] bg-transparent border border-[#BBCFCD] text-[#9FB7AE] font-medium text-[14px] hover:bg-white transition-colors">
                            {isEn ? 'Seasonal (6)' : 'موسمي (٦)'}
                        </button>
                    </div>
                </div>

                {/* 4. Offers Grid */}
                <section className="max-w-[1280px] mx-auto px-4 mt-12 flex flex-col gap-6">
                    
                    {/* BOGO Banner */}
                    <div className="w-full bg-[#EBD2D6] rounded-[24px] overflow-hidden flex flex-col md:flex-row items-center justify-between p-8 md:p-12 relative">
                        {/* Graphics (RTL: Right) */}
                        <div className="w-full md:w-1/3 flex justify-center md:justify-start">
                             <div className="w-[120px] h-[120px] bg-[#D43153] transform rotate-45 flex items-center justify-center rounded-[12px] shadow-md relative overflow-hidden">
                                <div className="w-full h-1/2 bg-[#8C5D4B] absolute top-0"></div>
                                <div className="grid grid-cols-2 gap-1 w-full h-1/2 absolute top-0 p-2">
                                    <div className="bg-[#6B4234] rounded-[2px]"></div>
                                    <div className="bg-[#6B4234] rounded-[2px]"></div>
                                    <div className="bg-[#6B4234] rounded-[2px]"></div>
                                    <div className="bg-[#6B4234] rounded-[2px]"></div>
                                </div>
                             </div>
                        </div>

                        {/* Content (RTL: Left) */}
                        <div className="w-full md:w-2/3 flex flex-col items-center md:items-start text-center md:text-right mt-8 md:mt-0 z-10">
                            <div className="bg-[#234745] px-3 py-1 rounded-[25px] flex items-center gap-2 mb-4 self-center md:self-end">
                                <span className="text-[#FEF8EB] font-bold text-[12px]">{isEn ? '1+1 Free' : '١+١ مجاناً'}</span>
                                <span className="text-[#FEF8EB] text-[12px]">🎁</span>
                            </div>
                            
                            <h2 className="text-[#1A1A1A] text-[28px] md:text-[36px] font-bold mb-3" style={{ fontFamily: isEn ? 'inherit' : "'Bahij Janna'" }}>
                                {isEn ? 'Buy One Get One Free' : 'اشتري واحد واحصل على الثاني مجاناً'}
                            </h2>
                            <p className="text-[#7D7D7D] font-medium text-[16px] mb-8">
                                {isEn ? 'On all dark chocolate types — Today only!' : 'على جميع أنواع الشوكولاتة الداكنة — اليوم فقط!'}
                            </p>
                            
                            <div className="flex flex-col sm:flex-row items-center gap-4 self-center md:self-end">
                                <span className="text-[#D43153] text-[14px] font-medium">
                                    {isEn ? '243 people shopping now' : '٢٤٣ شخص يتسوق الآن'}
                                </span>
                                <button className="flex items-center gap-2 px-6 py-3 bg-[#BBCFCD] text-[#234745] font-bold text-[16px] rounded-[25px] hover:bg-[#9FB7AE] transition-colors">
                                    <span>{isEn ? 'Shop Offer' : 'تسوق العرض'}</span>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="rotate-180 rtl:rotate-0"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 40% Chocolate */}
                        <div className="bg-[#BBCFCD] rounded-[24px] p-8 flex flex-col items-end text-right h-full justify-center">
                            <div className="flex items-center gap-2 mb-6">
                                <span className="text-[#234745] font-medium text-[14px]">{isEn ? 'Seasonal Offer' : 'عرض موسمي'}</span>
                                <div className="w-[30px] h-[1px] bg-[#234745]"></div>
                            </div>
                            <h2 className="text-[#1A1A1A] text-[32px] md:text-[40px] font-bold leading-tight mb-4" style={{ fontFamily: isEn ? 'inherit' : "'Bahij Janna'" }}>
                                {isEn ? '40% on all chocolate' : '40% على كل الشوكولاتة'}
                            </h2>
                            <p className="text-[#7D7D7D] text-[14px] font-medium mb-8">
                                {isEn ? 'More than 20 products with exceptional prices' : 'أكثر من ٢٠ منتج بأسعار استثنائية'}
                            </p>
                            <button className="px-8 py-3 bg-[#234745] text-white font-bold text-[16px] rounded-[25px] hover:bg-[#1a3533] transition-colors">
                                {isEn ? 'Shop Now' : 'تسوق الان'}
                            </button>
                        </div>

                        {/* 25% Gifts */}
                        <div className="bg-[#E24D55] rounded-[24px] p-8 flex flex-col items-end text-right h-full justify-center">
                            <div className="flex items-center gap-2 mb-6">
                                <span className="text-white font-medium text-[14px]">{isEn ? 'Special Partner' : 'شريك مميز'}</span>
                                <div className="w-[30px] h-[1px] bg-white"></div>
                            </div>
                            <h2 className="text-white text-[32px] md:text-[40px] font-bold leading-tight mb-4" style={{ fontFamily: isEn ? 'inherit' : "'Bahij Janna'" }}>
                                {isEn ? '25% on Gift Boxes' : '25% على صناديق الهدايا'}
                            </h2>
                            <p className="text-white/80 text-[14px] font-medium mb-8">
                                {isEn ? 'Subscribe now and get 10% discount on your first order from Saad Aldeen' : 'إشترك الان واحصل على خصم ١٠٪ على طلبك الاول من سعد الدين'}
                            </p>
                            <button className="px-8 py-3 bg-[#BBCFCD] text-[#234745] font-bold text-[16px] rounded-[25px] hover:bg-[#9FB7AE] transition-colors">
                                {isEn ? 'Get Discount' : 'إحصل علي الخصم'}
                            </button>
                        </div>
                    </div>

                    {/* Full width bottom offer */}
                    <div className="w-full bg-[#C5A96A] rounded-[16px] border border-[#906B51] p-6 flex items-center justify-center mt-2 hover:bg-[#b89b5c] cursor-pointer transition-colors">
                        <h3 className="text-[#234745] text-[24px] md:text-[28px] font-bold" style={{ fontFamily: isEn ? 'inherit' : "'Bahij Janna'" }}>
                            {isEn ? '25% on gift boxes for orders over 200 SAR' : '25% على صناديق الهدايا للطلبات فوق 200 ر.س'}
                        </h3>
                    </div>

                </section>
            </div>
        </div>
    );
}
