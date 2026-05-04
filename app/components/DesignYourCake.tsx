import { Link, useOutletContext } from 'react-router';
import { useI18n } from '~/lib/i18n';

export function DesignYourCake() {
    const { locale } = useOutletContext<{ locale: string }>();
    const isEn = locale === 'en';

    return (
        <section 
            className={`relative w-full min-h-[620px] overflow-hidden ${isEn ? 'font-en' : 'font-ar'}`} 
            dir={isEn ? 'ltr' : 'rtl'}
            style={{
                backgroundImage: `url('/images/cake-builder/cake-bg.webp')`,
                backgroundSize: 'cover',
                backgroundPosition: isEn ? 'right center' : 'left center',
            }}
        >
            {/* Gradient overlay: transparent on cake side, solid on UI side */}
            <div 
                className="absolute inset-0"
                style={{
                    background: isEn 
                        ? 'linear-gradient(to left, transparent 5%, rgba(248,246,242,0.7) 35%, rgba(248,246,242,0.95) 50%, rgba(248,246,242,1) 60%)' 
                        : 'linear-gradient(to right, transparent 5%, rgba(248,246,242,0.7) 35%, rgba(248,246,242,0.95) 50%, rgba(248,246,242,1) 60%)'
                }}
            ></div>

            <div className="relative z-10 max-w-[1400px] mx-auto px-6 py-10 lg:py-14 flex items-center">
                
                {/* UI Content - First in DOM: goes RIGHT in RTL, LEFT in LTR */}
                <div className="w-full lg:w-[60%] flex flex-col">
                    
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-2">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8bab9e" strokeWidth="1.5">
                                <path d="M12 2L14 8L20 9L15.5 13.5L17 20L12 17L7 20L8.5 13.5L4 9L10 8L12 2Z" strokeLinejoin="round" strokeLinecap="round"/>
                            </svg>
                        </div>
                        <p className="text-[#9a7e6f] font-bold text-[13px] mb-4 tracking-wide">
                            {isEn ? 'Create an unforgettable moment – step by step' : 'أصنع لحظة لا تُنسى – خطوة بخطوة'}
                        </p>
                        <h2 className="text-[36px] lg:text-[46px] font-black text-[#1b3d2e] leading-[1.15] mb-3">
                            {isEn ? 'Design a cake for your occasion' : 'صمم كيكة تناسب مناسبتك'}
                        </h2>
                        <p className="text-[#8a9e9a] font-bold text-[15px]">
                            {isEn 
                                ? 'Choose the size, flavor, decoration, and your special message with ease' 
                                : 'إختر الحجم والنكهة والتزيين ورسالتك الخاصة بكل سهولة'}
                        </p>
                    </div>

                    {/* Step Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                        {/* Step 1 */}
                        <div className="bg-white/60 backdrop-blur-sm rounded-[18px] p-4 flex flex-col items-center justify-center text-center gap-2.5 min-h-[130px] shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                            <div className="w-10 h-10 rounded-full bg-[#c5d5d0] flex items-center justify-center text-white font-black text-[14px]">
                                {isEn ? '1' : '١'}
                            </div>
                            <span className="font-bold text-[#7a8e8a] text-[13px]">{isEn ? 'Choose Size' : 'اختر الحجم'}</span>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8bab9e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="14" width="20" height="6" rx="2"/><rect x="5" y="8" width="14" height="6" rx="2"/><rect x="8" y="3" width="8" height="5" rx="1.5"/>
                            </svg>
                        </div>
                        
                        {/* Step 2 (Active) */}
                        <div className="bg-white rounded-[18px] p-4 flex flex-col items-center justify-center text-center gap-2.5 min-h-[130px] border-[2px] border-[#1b3d2e] shadow-sm">
                            <div className="w-10 h-10 rounded-full bg-[#1b3d2e] flex items-center justify-center text-white font-black text-[14px]">
                                {isEn ? '2' : '٢'}
                            </div>
                            <span className="font-black text-[#1b3d2e] text-[13px]">{isEn ? 'Choose Flavor' : 'أختر النكهة'}</span>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1b3d2e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
                            </svg>
                        </div>

                        {/* Step 3 */}
                        <div className="bg-white/60 backdrop-blur-sm rounded-[18px] p-4 flex flex-col items-center justify-center text-center gap-2.5 min-h-[130px] shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                            <div className="w-10 h-10 rounded-full bg-[#c5d5d0] flex items-center justify-center text-white font-black text-[14px]">
                                {isEn ? '3' : '٣'}
                            </div>
                            <span className="font-bold text-[#7a8e8a] text-[13px]">{isEn ? 'Choose Decoration' : 'اختر التزيين'}</span>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8bab9e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"/><path d="M8 12s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
                            </svg>
                        </div>

                        {/* Step 4 */}
                        <div className="bg-white/60 backdrop-blur-sm rounded-[18px] p-4 flex flex-col items-center justify-center text-center gap-2.5 min-h-[130px] shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                            <div className="w-10 h-10 rounded-full bg-[#c5d5d0] flex items-center justify-center text-white font-black text-[14px]">
                                {isEn ? '4' : '٤'}
                            </div>
                            <span className="font-bold text-[#7a8e8a] text-[12px] leading-snug">{isEn ? 'Add Your Message' : 'أضف رسالتك الخاصة'}</span>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8bab9e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                        </div>
                    </div>

                    {/* Flavor Selector */}
                    <div className="mb-8">
                        <h4 className={`font-black text-[#1b3d2e] text-[16px] mb-4 ${isEn ? 'text-left' : 'text-right'}`}>
                            {isEn ? 'Choose Flavor' : 'أختر النكهة'}
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {/* Active - Vanilla */}
                            <div className="relative bg-white border-[1.5px] border-[#1b3d2e] rounded-[16px] py-3.5 px-3 flex items-center justify-center gap-2 cursor-pointer shadow-sm">
                                <img src="/images/cake-builder/vanilla.png" alt="Vanilla" className="w-9 h-9 object-contain" />
                                <span className="font-bold text-[#1b3d2e] text-[14px]">{isEn ? 'Vanilla' : 'فانيليا'}</span>
                                <div className={`absolute -top-1.5 ${isEn ? '-right-1.5' : '-left-1.5'} w-[22px] h-[22px] bg-[#1b3d2e] rounded-full flex items-center justify-center border-[2px] border-white shadow`}>
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                </div>
                            </div>
                            {/* Chocolate */}
                            <div className="bg-white border border-[#e5e7e6] rounded-[16px] py-3.5 px-3 flex items-center justify-center gap-2 cursor-pointer hover:border-[#1b3d2e]/40 transition-colors shadow-sm">
                                <img src="/images/cake-builder/chocolate.png" alt="Chocolate" className="w-9 h-9 object-contain" />
                                <span className="font-bold text-[#4a5e59] text-[14px]">{isEn ? 'Chocolate' : 'شوكولاته'}</span>
                            </div>
                            {/* Caramel */}
                            <div className="bg-white border border-[#e5e7e6] rounded-[16px] py-3.5 px-3 flex items-center justify-center gap-2 cursor-pointer hover:border-[#1b3d2e]/40 transition-colors shadow-sm">
                                <img src="/images/cake-builder/caramel.png" alt="Caramel" className="w-9 h-9 object-contain" />
                                <span className="font-bold text-[#4a5e59] text-[14px]">{isEn ? 'Caramel' : 'كراميل'}</span>
                            </div>
                            {/* Red Velvet */}
                            <div className="bg-white border border-[#e5e7e6] rounded-[16px] py-3.5 px-3 flex items-center justify-center gap-2 cursor-pointer hover:border-[#1b3d2e]/40 transition-colors shadow-sm">
                                <img src="/images/cake-builder/redvelvet.png" alt="Red Velvet" className="w-9 h-9 object-contain" />
                                <span className="font-bold text-[#4a5e59] text-[14px]">{isEn ? 'Red Velvet' : 'ريد فلفيت'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="flex flex-col-reverse md:flex-row items-center gap-4 bg-[#eef1ef]/30 rounded-[20px] p-2.5">
                        
                        {/* Trust Badges */}
                        <div className="flex-1 flex flex-wrap justify-center md:justify-evenly items-center gap-x-3 gap-y-2 text-[12px] font-bold text-[#1b3d2e] px-2">
                            <div className="flex items-center gap-2">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1b3d2e" strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                                <span className="whitespace-pre leading-snug text-[11px]">{isEn ? 'Made with\nCare' : 'صُنع بحب\nوبعناية'}</span>
                            </div>
                            <div className="w-[1px] h-8 bg-[#c5d5d0]/70 hidden md:block"></div>
                            <div className="flex items-center gap-2">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1b3d2e" strokeWidth="1.5"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                                <span className="whitespace-pre leading-snug text-[11px]">{isEn ? 'Refrigerated Delivery\nfor Quality' : 'توصيل مبرد\nلضمان الجودة'}</span>
                            </div>
                            <div className="w-[1px] h-8 bg-[#c5d5d0]/70 hidden md:block"></div>
                            <div className="flex items-center gap-2">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1b3d2e" strokeWidth="1.5"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>
                                <span className="whitespace-pre leading-snug text-[11px]">{isEn ? 'Premium\nIngredients' : 'مكونات\nفاخرة'}</span>
                            </div>
                        </div>

                        {/* CTA Button - Wide, matching mockup proportions */}
                        <Link 
                            to={isEn ? "/en/collections/custom-cakes" : "/collections/custom-cakes"}
                            className="py-5 bg-[#1b3d2e] hover:bg-[#264f3e] rounded-full font-black text-[19px] transition-all shadow-lg hover:shadow-xl w-full md:w-[45%] text-center shrink-0 whitespace-nowrap"
                            style={{ color: '#ffffff' }}
                        >
                            {isEn ? 'Start Designing Now' : 'إبدأ تصميمك الان'}
                        </Link>
                    </div>

                </div>

                {/* Spacer for the cake image area - Second in DOM: goes LEFT in RTL, RIGHT in LTR */}
                <div className="hidden lg:block lg:w-[40%] shrink-0"></div>
            </div>
        </section>
    );
}
