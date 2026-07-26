import { Link, useOutletContext } from 'react-router';

export function OffersAndDiscounts({ config }: { config?: any }) {
    const { locale } = useOutletContext<{ locale: string }>();
    const isEn = locale === 'en';

    // Parse Metaobject config
    const showField = config?.fields?.find((f: any) => f.key === 'show_offers_section')?.value;
    if (showField === 'false') return null;

    return (
        <section
            className={`w-full bg-[#FEF8EB] lg:py-28 ${isEn ? 'font-en' : 'font-ar'}`}
            dir={isEn ? 'ltr' : 'rtl'}
            style={{ paddingTop: '50px', paddingBottom: '50px' }}
        >
            <div className="max-w-[1400px] mx-auto px-4 md:px-8">

                {/* Section Header */}
                <div className="text-center mb-8 flex flex-col items-center">
                    <h2 className="text-[48px] lg:text-[50px] font-bold text-[#1a1a1a] !mb-2 leading-none tracking-tighter">
                        {isEn ? 'Offers & Discounts' : 'العروض والتخفيضات'}
                    </h2>
                    <p className="text-[#8B8B8B] text-[18px] lg:text-[22px] !font-medium" style={{ fontFamily: '"GE Dinar One", sans-serif' }}>
                        {isEn ? 'Strongest offers for a limited time' : 'أقوى العروض لفترة محدودة'}
                    </p>
                </div>

                {/* Main Grid: 65% / 35% Split */}
                <div className={`flex flex-col ${isEn ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-8 mb-16`}>

                    {/* CARD 1: LARGE CREAM (65%) */}
                    <div className="hidden lg:flex lg:w-[65%] bg-[#EAE0D5] rounded-[40px] flex-col md:flex-row items-center relative overflow-hidden min-h-[460px] shadow-sm">

                        {/* Weave Pattern */}
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
                        <div className={`w-full md:w-[45%] flex flex-col relative z-10 px-8 lg:px-14 py-12 items-center md:items-start text-center md:text-start`}>

                            <div
                                className="text-white text-[14px] font-bold mb-8 shadow-sm flex items-center justify-center"
                                style={{
                                    background: '#E64950',
                                    borderRadius: '25px',
                                    gap: '8px',
                                    padding: '10px 12px'
                                }}
                            >
                                {isEn ? 'Gift Voucher' : 'قسيمة هدية'}
                            </div>

                            <div className="mb-8 space-y-1 w-full max-w-[400px]">
                                {isEn ? (
                                    <h3 className="text-[28px] lg:text-[36px] font-bold text-[#1a1a1a] leading-[1.2] tracking-tighter">
                                        Gift Your Loved Ones Saadeddin Voucher
                                    </h3>
                                ) : (
                                    <>
                                        <h3 className="text-[26px] lg:text-[38px] font-bold text-[#1a1a1a] leading-[1.2] tracking-tighter">
                                            أهدِ من تحب
                                        </h3>
                                        <h3 className="text-[26px] lg:text-[38px] font-bold text-[#1a1a1a] leading-[1.2] tracking-tighter">
                                            قسيمة سعد الدين
                                        </h3>
                                    </>
                                )}
                            </div>

                            <p className="text-[#8B8B8B] text-[15px] lg:text-[17px] font-medium max-w-[340px] leading-relaxed">
                                {isEn ? 'Choose value, add message, and send instantly' : 'اختار القيمة، أضف رسالتك، وأرسلها فوراً'}
                            </p>

                            <Link
                                to={isEn ? "/en/vouchers" : "/vouchers"}
                                className="bg-[#234745] flex items-center justify-center transition-all mt-8 font-dinar font-bold"
                                style={{
                                    width: '261px',
                                    height: '47px',
                                    borderRadius: '25px',
                                    padding: '10px 16px',
                                    gap: '8px',
                                    color: '#FEF8EB'
                                }}
                            >
                                {isEn ? 'Buy Voucher Now' : 'إشتري قسيمة الان'}
                            </Link>
                        </div>
                        {/* Image Side */}
                        <div className="w-full md:w-[55%] h-full flex items-center justify-center p-8 lg:p-12 relative z-10">
                            <img
                                src="/images/voucher.webp"
                                alt="Saadeddin Gift Voucher"
                                loading="lazy"
                                className="w-full h-auto object-contain max-w-[500px] drop-shadow-2xl"
                            />
                        </div>

                    </div>

                    {/* CARD 2: SMALL GREEN (35%) */}
                    <div className="w-full lg:w-[35%] bg-[#234745] rounded-[40px] p-10 flex flex-col items-center justify-between text-center min-h-[460px] relative overflow-hidden group shadow-sm">
                        <div className="w-full flex justify-center mb-8">
                            <img
                                src="/images/sweets-box.webp"
                                className="w-full h-auto object-contain max-w-[300px] transition-transform duration-1000 group-hover:scale-105 drop-shadow-2xl"
                                alt="Luxury Sweets Box"
                                loading="lazy"
                            />
                        </div>
                        <div className="relative z-10 w-full flex flex-col items-center">
                            <h3
                                className={`font-bold text-white text-center mb-10 tracking-tight ${isEn ? 'text-[28px] lg:text-[36px]' : 'text-[38px]'}`}
                                style={{ fontFamily: !isEn ? "'Bahij Janna', sans-serif" : undefined, lineHeight: '125%' }}
                            >
                                {isEn ? 'Offers on our Best Products' : 'عروض وتخفضيات علي افضل منتجاتنا'}
                            </h3>
                            <Link
                                to={isEn ? "/en/promotions" : "/promotions"}
                                className="bg-[#FEF8EB] text-[#255441] rounded-[100px] transition-all flex items-center justify-center font-bold px-8 py-3 w-[90%] md:w-full md:max-w-[245px]"
                            >
                                {isEn ? 'Browse Now' : 'تصفح الان'}
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Footer View All */}
                <div className="flex justify-center">
                    <Link
                        to={isEn ? "/en/promotions" : "/promotions"}
                        className="px-12 py-4 rounded-full border-2 border-[#234745] !text-[#234745] [font-family:'GE_Dinar_One',sans-serif] font-bold text-[15px] lg:text-[18px] transition-all hover:bg-[#1a3533] hover:!text-white hover:border-[#1a3533] active:scale-95"
                    >
                        {isEn ? 'View All Offers' : 'عرض جميع العروض'}
                    </Link>
                </div>

            </div>
        </section>
    );
}
