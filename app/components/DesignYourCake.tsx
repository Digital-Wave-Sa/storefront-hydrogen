import { Link, useOutletContext } from 'react-router';
import { useI18n } from '~/lib/i18n';

export function DesignYourCake() {
    const { locale } = useOutletContext<{ locale: string }>();
    const isEn = locale === 'en';

    return (
        <section
            className={`!p-0 relative w-full min-h-[620px] overflow-hidden ${isEn ? 'font-en' : 'font-ar'}`}
            dir={isEn ? 'ltr' : 'rtl'}
        >
            {/* Background Image Layer */}
            <div
                className={`absolute inset-0 w-full h-full bg-[url('/images/cake-builder-section-mobile.webp')] lg:bg-[url('/images/cake-builder/cake-bg.webp')] bg-cover lg:bg-[length:cover] bg-top lg:bg-[position:left_center] ${isEn ? '-scale-x-100' : ''}`}
            ></div>
            {/* Gradient overlay: Desktop */}
            <div
                className="absolute inset-0 hidden lg:block"
                style={{
                    background: isEn
                        ? 'linear-gradient(to left, transparent 5%, rgba(248,246,242,0.7) 35%, rgba(248,246,242,0.95) 50%, rgba(248,246,242,1) 60%)'
                        : 'linear-gradient(to right, transparent 5%, rgba(248,246,242,0.7) 35%, rgba(248,246,242,0.95) 50%, rgba(248,246,242,1) 60%)'
                }}
            ></div>

            {/* Gradient overlay: Mobile */}
            <div
                className="absolute inset-0 block lg:hidden"
                style={{
                    background: 'linear-gradient(to bottom, transparent 15%, rgba(248,246,242,0.8) 35%, rgba(248,246,242,1) 45%)'
                }}
            ></div>

            <div className="relative z-10 max-w-[1400px] mx-auto px-6 pt-[180px] pb-12 lg:py-[50px] flex items-center">

                {/* UI Content - First in DOM: goes RIGHT in RTL, LEFT in LTR */}
                <div className="w-full lg:w-[60%] flex flex-col">

                    {/* Header */}
                    <div className="flex flex-col items-center text-center mb-8">
                        <div className="flex items-center gap-[10px] mb-3 w-fit">
                            <div className="w-[85px] h-[1px] bg-[#906B51]"></div>
                            <img
                                src="/images/saadaldeen-star-vector.svg"
                                alt="Star"
                                style={{ width: '22.5px', height: '22.5px', filter: 'sepia(1) saturate(0.8) hue-rotate(345deg) brightness(0.7)' }}
                            />
                            <div className="w-[85px] h-[1px] bg-[#906B51]"></div>
                        </div>
                        <p className="text-[#906B51] tracking-tight whitespace-nowrap" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", fontWeight: 500, fontSize: '16px', lineHeight: '100%', letterSpacing: '0%', textAlign: 'right', verticalAlign: 'middle', marginBottom: '20px' }}>
                            {isEn ? 'Create an unforgettable moment – step by step' : 'أصنع لحظة لا تُنسى – خطوة بخطوة'}
                        </p>
                        <h2 className="text-[#234745] mb-2 text-[36px] lg:text-[50px] font-bold leading-none text-center" style={!isEn ? { fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" } : undefined}>
                            {isEn ? 'Design a cake for your occasion' : 'صمم كيكة تناسب مناسبتك'}
                        </h2>
                        <p className="text-[#7d7d7d] font-medium text-[14px] font-['EnglishDigits','GE_Dinar_One',sans-serif]">
                            {isEn
                                ? 'Choose the size, flavor, decoration, and your special message with ease'
                                : 'إختر الحجم والنكهة والتزيين ورسالتك الخاصة بكل سهولة'}
                        </p>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 md:gap-3 mb-8 w-full">
                        {/* Step 1 */}
                        <div className="bg-white/90 backdrop-blur-sm rounded-[12px] md:rounded-[18px] p-1 py-3 md:p-4 flex flex-col items-center justify-center text-center gap-1.5 md:gap-2 min-h-[90px] md:min-h-[120px] shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-[#bbcfcd]/50">
                            <div className="w-[30px] h-[30px] rounded-full bg-[#BBCFCD] flex items-center justify-center text-[#7d7d7d] font-bold text-[13px]">
                                1
                            </div>
                            <span className="font-medium text-[#7d7d7d] text-[10px] md:text-[14px] leading-tight flex-1 flex items-center justify-center px-0.5 font-['EnglishDigits','GE_Dinar_One',sans-serif]">{isEn ? 'Choose Size' : 'اختر الحجم'}</span>
                            <img src="/images/cake-icon.svg" alt="Size" className="w-[24px] h-[24px]" />
                        </div>

                        {/* Step 2 (Active) */}
                        <div className="bg-white rounded-[12px] md:rounded-[18px] p-1 py-3 md:p-4 flex flex-col items-center justify-center text-center gap-1.5 md:gap-2 min-h-[90px] md:min-h-[120px] border-[1px] md:border-[1px] border-[#234745] shadow-sm">
                            <div className="w-[30px] h-[30px] rounded-full bg-[#234745] flex items-center justify-center text-white font-bold text-[13px]">
                                2
                            </div>
                            <span className="font-medium text-[#234745] text-[10px] md:text-[13px] leading-tight flex-1 flex items-center justify-center px-0.5 font-['EnglishDigits','GE_Dinar_One',sans-serif]">{isEn ? 'Choose Flavor' : 'أختر النكهة'}</span>
                            <img src="/images/cake-icon-2.svg" alt="Flavor" className="w-[24px] h-[24px]" />
                        </div>

                        {/* Step 3 */}
                        <div className="bg-white/90 backdrop-blur-sm rounded-[12px] md:rounded-[18px] p-1 py-3 md:p-4 flex flex-col items-center justify-center text-center gap-1.5 md:gap-2 min-h-[90px] md:min-h-[120px] shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-[#bbcfcd]/50">
                            <div className="w-[30px] h-[30px] rounded-full bg-[#c5d5d0] flex items-center justify-center text-[#7d7d7d] font-bold text-[13px]">
                                3
                            </div>
                            <span className="font-medium text-[#7d7d7d] text-[10px] md:text-[13px] leading-tight flex-1 flex items-center justify-center px-0.5 font-['EnglishDigits','GE_Dinar_One',sans-serif]">{isEn ? 'Choose Decoration' : 'اختر التزيين'}</span>
                            <img src="/images/cake-icon-3.svg" alt="Decoration" className="w-[24px] h-[24px]" />
                        </div>

                        {/* Step 4 */}
                        <div className="bg-white/90 backdrop-blur-sm rounded-[12px] md:rounded-[18px] p-1 py-3 md:p-4 flex flex-col items-center justify-center text-center gap-1.5 md:gap-2 min-h-[90px] md:min-h-[120px] shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-[#bbcfcd]/50">
                            <div className="w-[30px] h-[30px] rounded-full bg-[#c5d5d0] flex items-center justify-center text-[#7d7d7d] font-bold text-[13px]">
                                4
                            </div>
                            <span className="font-medium text-[#7d7d7d] text-[10px] md:text-[12px] leading-tight flex-1 flex items-center justify-center px-0.5 font-['EnglishDigits','GE_Dinar_One',sans-serif]">{isEn ? 'Add Your Message' : 'أضف رسالتك الخاصة'}</span>
                            <img src="/images/cake-icon-4.svg" alt="Message" className="w-[24px] h-[24px]" />
                        </div>
                    </div>

                    {/* Flavor Selector */}
                    <div className="mb-2 lg:mb-4 p-5 bg-white/40 rounded-xl" dir={isEn ? 'ltr' : 'rtl'}>
                        <h4 className="text-[#234745] mb-5" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", fontWeight: 700, fontSize: '18px', lineHeight: '100%', textAlign: isEn ? 'left' : 'right' }}>
                            {isEn ? 'Choose Flavor' : 'أختر النكهة'}
                        </h4>
                        <div className="grid grid-cols-4 gap-1.5 md:gap-4 pt-3 -mt-3 md:pt-0 md:mt-0 pb-2 w-full">
                            {/* Active - Vanilla */}
                            <div className="relative bg-[#f8f9f8] border-[1.5px] md:border-[2px] border-[#234745] rounded-[14px] md:rounded-[50px] py-[4px] md:py-[6px] px-1 md:px-4 flex flex-col md:flex-row items-center justify-center gap-1.5 md:gap-3 cursor-pointer shadow-sm">
                                <img src="/images/vanilla-img.webp" alt="Vanilla" className="w-[28px] h-[28px] md:w-[40px] md:h-[40px] object-contain" loading="lazy" />
                                <span className="text-[#234745] text-[10px] md:text-[16px] whitespace-nowrap" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", fontWeight: 700, lineHeight: '100%', textAlign: 'center' }}>
                                    {isEn ? 'Vanilla' : 'فانيليا'}
                                </span>
                                <div className={`absolute -top-1.5 md:-top-2 ${isEn ? '-right-1.5 md:-right-2' : '-left-1.5 md:-left-2'} w-[18px] h-[18px] md:w-[26px] md:h-[26px] bg-[#234745] rounded-full flex items-center justify-center border-[1.5px] md:border-[2px] border-white shadow-md z-10`}>
                                    <svg width="10" height="10" className="md:w-[12px] md:h-[12px]" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                </div>
                            </div>
                            {/* Chocolate */}
                            <div className="bg-[#f8f9f8] border border-[#d1dbd9] rounded-[14px] md:rounded-[50px] py-[4px] md:py-[6px] px-1 md:px-4 flex flex-col md:flex-row items-center justify-center gap-1.5 md:gap-3 cursor-pointer hover:border-[#234745]/40 transition-colors">
                                <img src="/images/chocolate-img.webp" alt="Chocolate" className="w-[28px] h-[28px] md:w-[40px] md:h-[40px] object-contain" loading="lazy" />
                                <span className="text-[#234745] text-[10px] md:text-[16px] whitespace-nowrap" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", fontWeight: 700, lineHeight: '100%', textAlign: 'center' }}>
                                    {isEn ? 'Chocolate' : 'شوكولاته'}
                                </span>
                            </div>
                            {/* Caramel */}
                            <div className="bg-[#f8f9f8] border border-[#d1dbd9] rounded-[14px] md:rounded-[50px] py-[4px] md:py-[6px] px-1 md:px-4 flex flex-col md:flex-row items-center justify-center gap-1.5 md:gap-3 cursor-pointer hover:border-[#234745]/40 transition-colors">
                                <img src="/images/caramel-img.webp" alt="Caramel" className="w-[28px] h-[28px] md:w-[40px] md:h-[40px] object-contain" loading="lazy" />
                                <span className="text-[#234745] text-[10px] md:text-[16px] whitespace-nowrap" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", fontWeight: 700, lineHeight: '100%', textAlign: 'center' }}>
                                    {isEn ? 'Caramel' : 'كراميل'}
                                </span>
                            </div>
                            {/* Red Velvet */}
                            <div className="bg-[#f8f9f8] border border-[#d1dbd9] rounded-[14px] md:rounded-[50px] py-[4px] md:py-[6px] px-1 md:px-4 flex flex-col md:flex-row items-center justify-center gap-1.5 md:gap-3 cursor-pointer hover:border-[#234745]/40 transition-colors">
                                <img src="/images/velvet-img.webp" alt="Red Velvet" className="w-[28px] h-[28px] md:w-[40px] md:h-[40px] object-contain" loading="lazy" />
                                <span className="text-[#234745] text-[10px] md:text-[16px] whitespace-nowrap" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", fontWeight: 700, lineHeight: '100%', textAlign: 'center' }}>
                                    {isEn ? 'Red Velvet' : 'ريد فلفيت'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="flex flex-col lg:flex-row items-center justify-start gap-4 lg:gap-4 mt-2 lg:mt-4 w-full" dir={isEn ? 'ltr' : 'rtl'}>

                        {/* CTA Button */}
                        <Link
                            to={isEn ? "/en/custom-cake" : "/custom-cake"}
                            className="py-4 md:py-5 bg-[#234745] hover:bg-[#264f3e] rounded-full transition-all shadow-lg hover:shadow-xl w-full lg:w-auto lg:min-w-[280px] lg:px-12 text-center flex items-center justify-center"
                            style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", fontWeight: 700, fontSize: '16px', color: '#ffffff', lineHeight: '100%' }}
                        >
                            {isEn ? 'Start Designing Now' : 'إبدأ تصميمك الان'}
                        </Link>

                        {/* Trust Badges */}
                        <div className="flex flex-row items-center justify-evenly lg:justify-center gap-x-1 lg:gap-x-6 text-[#234745] px-2 py-2 bg-[#f8f9f8]/90 lg:bg-[#f9f9f9]/80 backdrop-blur-sm lg:backdrop-blur-none rounded-[20px] lg:shadow-none">
                            <div className="flex items-center gap-2">
                                <img src="/images/love-icon.svg" alt="Made with Care" className="w-[18px] h-[18px] lg:w-[20px] lg:h-[20px] object-contain" />
                                <span className="whitespace-pre-line leading-snug text-[11px] lg:text-[16px] leading-[1.1]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", fontWeight: 500, textAlign: 'center' }}>{isEn ? 'Made with\nCare' : 'صُنع بحب\nوبعناية'}</span>
                            </div>
                            <div className="w-[1px] h-4 bg-[#255441]"></div>
                            <div className="flex items-center gap-2">
                                <img src="/images/delivery-cake-builder.svg" alt="Fast Delivery" className="w-[18px] h-[18px] lg:w-[20px] lg:h-[20px] object-contain" />
                                <span className="whitespace-pre-line leading-snug text-[11px] lg:text-[16px] leading-[1.1]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", fontWeight: 500, textAlign: 'center' }}>{isEn ? 'Cold Delivery\nfor Quality' : 'توصيل مبرد\nلضمان الجودة'}</span>
                            </div>
                            <div className="w-[1px] h-4 bg-[#255441]"></div>
                            <div className="flex items-center gap-2">
                                <img src="/images/leaf-icon-cake.svg" alt="Premium Ingredients" className="w-[20px] h-[20px] lg:w-[20px] lg:h-[20px] object-contain" />
                                <span className="whitespace-pre-line leading-snug text-[11px] lg:text-[16px] leading-[1.1]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", fontWeight: 500, textAlign: 'center' }}>{isEn ? 'Premium\nIngredients' : 'مكونات\nفاخرة'}</span>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Spacer for the cake image area - Second in DOM: goes LEFT in RTL, RIGHT in LTR */}
                <div className="hidden lg:block lg:w-[40%] shrink-0"></div>
            </div>
        </section>
    );
}
