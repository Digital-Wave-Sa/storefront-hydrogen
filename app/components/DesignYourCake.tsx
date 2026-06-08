import { Link, useOutletContext } from 'react-router';
import { useI18n } from '~/lib/i18n';

export function DesignYourCake() {
    const { locale } = useOutletContext<{ locale: string }>();
    const isEn = locale === 'en';

    return (
        <section
            className={`relative w-full min-h-[620px] overflow-hidden bg-cover lg:bg-[length:cover] bg-top lg:bg-[position:${isEn ? 'right_center' : 'left_center'}] ${isEn ? 'font-en' : 'font-ar'}`}
            dir={isEn ? 'ltr' : 'rtl'}
            style={{
                backgroundImage: `url('/images/cake-builder/cake-bg.webp')`,
            }}
        >
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

            <div className="relative z-10 max-w-[1400px] mx-auto px-6 pt-[220px] pb-12 lg:py-[50px] flex items-center">

                {/* UI Content - First in DOM: goes RIGHT in RTL, LEFT in LTR */}
                <div className="w-full lg:w-[60%] flex flex-col">

                    {/* Header */}
                    <div className="flex flex-col items-center text-center mb-8">
                        <div className="flex items-center gap-[10px] mb-3 w-fit">
                            <div className="w-[85px] h-[1px] bg-[#9a7e6f]"></div>
                            <img
                                src="/images/saadaldeen-star-vector.svg"
                                alt="Star"
                                style={{ width: '22.5px', height: '22.5px', filter: 'sepia(1) saturate(0.8) hue-rotate(345deg) brightness(0.7)' }}
                            />
                            <div className="w-[85px] h-[1px] bg-[#9a7e6f]"></div>
                        </div>
                        <p className="text-[#9a7e6f] tracking-tight whitespace-nowrap" style={{ fontFamily: "'GE Dinar One', sans-serif", fontWeight: 500, fontSize: '16px', lineHeight: '100%', letterSpacing: '0%', textAlign: 'right', verticalAlign: 'middle', marginBottom: '20px' }}>
                            {isEn ? 'Create an unforgettable moment – step by step' : 'أصنع لحظة لا تُنسى – خطوة بخطوة'}
                        </p>
                        <h2 className="text-[#234745] mb-2 text-[36px] lg:text-[50px] font-bold leading-none text-center" style={!isEn ? { fontFamily: "'Bahij Janna', sans-serif" } : undefined}>
                            {isEn ? 'Design a cake for your occasion' : 'صمم كيكة تناسب مناسبتك'}
                        </h2>
                        <p className="text-[#8a9e9a] font-bold text-[14px]">
                            {isEn
                                ? 'Choose the size, flavor, decoration, and your special message with ease'
                                : 'إختر الحجم والنكهة والتزيين ورسالتك الخاصة بكل سهولة'}
                        </p>
                    </div>

                    {/* Step Cards */}
                    <div className="flex overflow-x-auto md:grid md:grid-cols-4 gap-2 md:gap-3 mb-8 hide-scrollbars snap-x snap-mandatory pb-2 -mx-6 px-6 md:mx-0 md:px-0">
                        {/* Step 1 */}
                        <div className="snap-start shrink-0 w-[calc(25vw+10px)] min-w-[90px] md:w-auto md:min-w-0 bg-white/60 backdrop-blur-sm rounded-[18px] p-2 md:p-4 flex flex-col items-center justify-center text-center gap-2 min-h-[120px] shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-[#d1dbd9]/50">
                            <div className="w-10 h-10 rounded-full bg-[#c5d5d0] flex items-center justify-center text-white font-bold text-[14px]">
                                {isEn ? '1' : '١'}
                            </div>
                            <span className="font-bold text-[#7a8e8a] text-[13px]">{isEn ? 'Choose Size' : 'اختر الحجم'}</span>
                            <img src="/images/cake-icon.svg" alt="Size" className="w-8 h-8 opacity-60" />
                        </div>

                        {/* Step 2 (Active) */}
                        <div className="snap-start shrink-0 w-[calc(25vw+10px)] min-w-[90px] md:w-auto md:min-w-0 bg-white rounded-[18px] p-2 md:p-4 flex flex-col items-center justify-center text-center gap-2 min-h-[120px] border-[2px] border-[#234745] shadow-sm">
                            <div className="w-10 h-10 rounded-full bg-[#234745] flex items-center justify-center text-white font-bold text-[14px]">
                                {isEn ? '2' : '٢'}
                            </div>
                            <span className="font-bold text-[#234745] text-[13px]">{isEn ? 'Choose Flavor' : 'أختر النكهة'}</span>
                            <img src="/images/cake-icon-2.svg" alt="Flavor" className="w-8 h-8" />
                        </div>

                        {/* Step 3 */}
                        <div className="snap-start shrink-0 w-[calc(25vw+10px)] min-w-[90px] md:w-auto md:min-w-0 bg-white/60 backdrop-blur-sm rounded-[18px] p-2 md:p-4 flex flex-col items-center justify-center text-center gap-2 min-h-[120px] shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-[#d1dbd9]/50">
                            <div className="w-10 h-10 rounded-full bg-[#c5d5d0] flex items-center justify-center text-white font-bold text-[14px]">
                                {isEn ? '3' : '٣'}
                            </div>
                            <span className="font-bold text-[#7a8e8a] text-[13px]">{isEn ? 'Choose Decoration' : 'اختر التزيين'}</span>
                            <img src="/images/cake-icon-3.svg" alt="Decoration" className="w-8 h-8 opacity-60" />
                        </div>

                        {/* Step 4 */}
                        <div className="snap-start shrink-0 w-[calc(25vw+10px)] min-w-[90px] md:w-auto md:min-w-0 bg-white/60 backdrop-blur-sm rounded-[18px] p-2 md:p-4 flex flex-col items-center justify-center text-center gap-2 min-h-[120px] shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-[#d1dbd9]/50">
                            <div className="w-10 h-10 rounded-full bg-[#c5d5d0] flex items-center justify-center text-white font-bold text-[14px]">
                                {isEn ? '4' : '٤'}
                            </div>
                            <span className="font-bold text-[#7a8e8a] text-[12px] leading-snug">{isEn ? 'Add Your Message' : 'أضف رسالتك الخاصة'}</span>
                            <img src="/images/cake-icon-4.svg" alt="Message" className="w-8 h-8 opacity-60" />
                        </div>
                    </div>

                    {/* Flavor Selector */}
                    <div className="mb-8" dir={isEn ? 'ltr' : 'rtl'}>
                        <h4 className="text-[#234745] mb-5" style={{ fontFamily: "'GE Dinar One', sans-serif", fontWeight: 700, fontSize: '18px', lineHeight: '100%', textAlign: isEn ? 'left' : 'right' }}>
                            {isEn ? 'Choose Flavor' : 'أختر النكهة'}
                        </h4>
                        <div className="flex overflow-x-auto md:overflow-visible md:grid md:grid-cols-4 gap-3 md:gap-4 hide-scrollbars snap-x snap-mandatory pt-3 -mt-3 pb-2 -mx-6 px-6 md:mx-0 md:px-0">
                            {/* Active - Vanilla */}
                            <div className="snap-start shrink-0 whitespace-nowrap relative bg-[#f8f9f8] border-[1.5px] border-[#234745] rounded-[50px] py-[10px] px-4 flex items-center justify-center gap-3 cursor-pointer shadow-sm">
                                <img src="/images/vanilla-img.png" alt="Vanilla" className="w-[40px] h-[40px] object-contain" />
                                <span className="text-[#234745]" style={{ fontFamily: "'GE Dinar One', sans-serif", fontWeight: 700, fontSize: '16px', lineHeight: '100%', textAlign: 'center' }}>
                                    {isEn ? 'Vanilla' : 'فانيليا'}
                                </span>
                                <div className={`absolute -top-2 ${isEn ? '-right-2' : '-left-2'} w-[26px] h-[26px] bg-[#234745] rounded-full flex items-center justify-center border-[2px] border-white shadow-md`}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                </div>
                            </div>
                            {/* Chocolate */}
                            <div className="snap-start shrink-0 whitespace-nowrap bg-[#f8f9f8] border border-[#d1dbd9] rounded-[50px] py-[10px] px-4 flex items-center justify-center gap-3 cursor-pointer hover:border-[#234745]/40 transition-colors">
                                <img src="/images/chocolate-img.png" alt="Chocolate" className="w-[40px] h-[40px] object-contain" />
                                <span className="text-[#234745]" style={{ fontFamily: "'GE Dinar One', sans-serif", fontWeight: 700, fontSize: '16px', lineHeight: '100%', textAlign: 'center' }}>
                                    {isEn ? 'Chocolate' : 'شوكولاته'}
                                </span>
                            </div>
                            {/* Caramel */}
                            <div className="snap-start shrink-0 whitespace-nowrap bg-[#f8f9f8] border border-[#d1dbd9] rounded-[50px] py-[10px] px-4 flex items-center justify-center gap-3 cursor-pointer hover:border-[#234745]/40 transition-colors">
                                <img src="/images/caramel-img.png" alt="Caramel" className="w-[40px] h-[40px] object-contain" />
                                <span className="text-[#234745]" style={{ fontFamily: "'GE Dinar One', sans-serif", fontWeight: 700, fontSize: '16px', lineHeight: '100%', textAlign: 'center' }}>
                                    {isEn ? 'Caramel' : 'كراميل'}
                                </span>
                            </div>
                            {/* Red Velvet */}
                            <div className="snap-start shrink-0 whitespace-nowrap bg-[#f8f9f8] border border-[#d1dbd9] rounded-[50px] py-[10px] px-4 flex items-center justify-center gap-3 cursor-pointer hover:border-[#234745]/40 transition-colors">
                                <img src="/images/velvet-img.png" alt="Red Velvet" className="w-[40px] h-[40px] object-contain" />
                                <span className="text-[#234745]" style={{ fontFamily: "'GE Dinar One', sans-serif", fontWeight: 700, fontSize: '16px', lineHeight: '100%', textAlign: 'center' }}>
                                    {isEn ? 'Red Velvet' : 'ريد فلفيت'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-4 lg:gap-8 mt-2 lg:mt-8 w-full" dir={isEn ? 'ltr' : 'rtl'}>

                        {/* CTA Button */}
                        <Link
                            to={isEn ? "/en/custom-cake" : "/custom-cake"}
                            className="py-4 md:py-5 bg-[#234745] hover:bg-[#264f3e] rounded-full transition-all shadow-lg hover:shadow-xl w-full lg:w-auto lg:min-w-[280px] lg:px-12 text-center flex items-center justify-center"
                            style={{ fontFamily: "'GE Dinar One', sans-serif", fontWeight: 700, fontSize: '16px', color: '#ffffff', lineHeight: '100%' }}
                        >
                            {isEn ? 'Start Designing Now' : 'إبدأ تصميمك الان'}
                        </Link>

                        {/* Trust Badges */}
                        <div className="flex flex-row items-center justify-evenly lg:justify-start gap-x-1 lg:gap-x-6 text-[#234745] px-2 py-4 lg:px-0 lg:py-0 bg-[#f8f9f8]/90 lg:bg-transparent backdrop-blur-sm lg:backdrop-blur-none rounded-[20px] lg:rounded-none w-full lg:w-auto lg:flex-1 shadow-sm lg:shadow-none">
                            <div className="flex items-center gap-2">
                                <img src="/images/love-icon.svg" alt="Made with Care" className="w-[18px] h-[18px] lg:w-[24px] lg:h-[24px] object-contain" />
                                <span className="whitespace-pre-line text-[11px] lg:text-[14px] leading-[1.1]" style={{ fontFamily: "'GE Dinar One', sans-serif", fontWeight: 500, textAlign: 'center' }}>{isEn ? 'Made with\nCare' : 'صُنع بحب\nوبعناية'}</span>
                            </div>
                            <div className="w-[1px] h-8 bg-[#234745]/20"></div>
                            <div className="flex items-center gap-2">
                                <img src="/images/delivery-cake-builder.svg" alt="Fast Delivery" className="w-[18px] h-[18px] lg:w-[24px] lg:h-[24px] object-contain" />
                                <span className="whitespace-pre-line text-[11px] lg:text-[14px] leading-[1.1]" style={{ fontFamily: "'GE Dinar One', sans-serif", fontWeight: 500, textAlign: 'center' }}>{isEn ? 'Cold Delivery\nfor Quality' : 'توصيل مبرد\nلضمان الجودة'}</span>
                            </div>
                            <div className="w-[1px] h-8 bg-[#234745]/20"></div>
                            <div className="flex items-center gap-2">
                                <img src="/images/leaf-icon-cake.svg" alt="Premium Ingredients" className="w-[20px] h-[20px] lg:w-[24px] lg:h-[24px] object-contain" />
                                <span className="whitespace-pre-line text-[11px] lg:text-[14px] leading-[1.1]" style={{ fontFamily: "'GE Dinar One', sans-serif", fontWeight: 500, textAlign: 'center' }}>{isEn ? 'Premium\nIngredients' : 'مكونات\nفاخرة'}</span>
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
