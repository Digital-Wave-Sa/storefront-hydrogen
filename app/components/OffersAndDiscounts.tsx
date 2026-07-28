import { Link, useOutletContext } from 'react-router';

export function OffersAndDiscounts({ config }: { config?: any }) {
    const { locale } = useOutletContext<{ locale: string }>();
    const isEn = locale === 'en';

    // Parse offers_section Metaobject node
    const secNode = config?.offersSection?.nodes?.[0];
    const isSecHidden = secNode?.fields?.find((f: any) => f.key === 'is_hidden')?.value;
    if (isSecHidden === 'true' || isSecHidden === '1' || isSecHidden === true) return null;

    const getSecVal = (k: string) => secNode?.fields?.find((f: any) => f.key === k)?.value;
    const secTitleEn = getSecVal('title_en') || 'Offers & Discounts';
    const secTitleAr = getSecVal('title_ar') || 'العروض والتخفيضات';
    const secSubtitleEn = getSecVal('subtitle_en') || 'Strongest offers for a limited time';
    const secSubtitleAr = getSecVal('subtitle_ar') || 'أقوى العروض لفترة محدودة';

    // Parse offer_card Metaobject nodes if provided
    const cardNodes = (config?.offerCards?.nodes || []).filter((node: any) => {
        const isHidden = node.fields?.find((f: any) => f.key === 'is_hidden')?.value;
        return isHidden !== 'true' && isHidden !== '1' && isHidden !== true;
    });

    // Card 1 (Voucher / Large Card)
    const card1Node = cardNodes[0];
    const getC1Val = (k: string) => card1Node?.fields?.find((f: any) => f.key === k)?.value;
    const getC1Img = (k: string) => card1Node?.fields?.find((f: any) => f.key === k)?.reference?.image?.url;

    const c1BadgeEn = getC1Val('badge_en') || 'Gift Voucher';
    const c1BadgeAr = getC1Val('badge_ar') || 'قسيمة هدية';
    const c1TitleEn = getC1Val('title_en') || 'Gift Your Loved Ones Saadeddin Voucher';
    const c1TitleAr = getC1Val('title_ar') || 'أهدِ من تحب قسيمة سعد الدين';
    const c1SubtitleEn = getC1Val('subtitle_en') || 'Choose value, add message, and send instantly';
    const c1SubtitleAr = getC1Val('subtitle_ar') || 'اختار القيمة، أضف رسالتك، وأرسلها فوراً';
    const c1BtnEn = getC1Val('button_text_en') || 'Buy Voucher Now';
    const c1BtnAr = getC1Val('button_text_ar') || 'إشتري قسيمة الان';
    const formatLink = (rawUrl: string, defaultPath: string) => {
        const url = rawUrl || defaultPath;
        if (!url) return isEn ? '/en' : '/';
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        const path = url.startsWith('/') ? url : `/${url}`;
        if (isEn) return path.startsWith('/en') ? path : `/en${path}`;
        return path.startsWith('/en/') ? path.replace(/^\/en/, '') : (path === '/en' ? '/' : path);
    };

    const c1BtnLink = formatLink(getC1Val('button_link'), '/vouchers');
    const c1Img = getC1Img('image') || "/images/voucher.webp";

    // Card 2 (Promotions / Green Card)
    const card2Node = cardNodes[1];
    const getC2Val = (k: string) => card2Node?.fields?.find((f: any) => f.key === k)?.value;
    const getC2Img = (k: string) => card2Node?.fields?.find((f: any) => f.key === k)?.reference?.image?.url;

    const c2TitleEn = getC2Val('title_en') || 'Offers on our Best Products';
    const c2TitleAr = getC2Val('title_ar') || 'عروض وتخفضيات علي افضل منتجاتنا';
    const c2BtnEn = getC2Val('button_text_en') || 'Browse Now';
    const c2BtnAr = getC2Val('button_text_ar') || 'تصفح الان';
    const c2BtnLink = formatLink(getC2Val('button_link'), '/promotions');
    const c2Img = getC2Img('image') || "/images/sweets-box.webp";

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
                        {isEn ? secTitleEn : secTitleAr}
                    </h2>
                    <p className="text-[#8B8B8B] text-[18px] lg:text-[22px] !font-medium" style={{ fontFamily: '"GE Dinar One", sans-serif' }}>
                        {isEn ? secSubtitleEn : secSubtitleAr}
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
                                {isEn ? c1BadgeEn : c1BadgeAr}
                            </div>

                            <div className="mb-8 space-y-1 w-full max-w-[400px]">
                                <h3 className="text-[26px] lg:text-[38px] font-bold text-[#1a1a1a] leading-[1.2] tracking-tighter whitespace-pre-line">
                                    {isEn ? c1TitleEn : c1TitleAr}
                                </h3>
                            </div>

                            <p className="text-[#8B8B8B] text-[15px] lg:text-[17px] font-medium max-w-[340px] leading-relaxed">
                                {isEn ? c1SubtitleEn : c1SubtitleAr}
                            </p>

                            <Link
                                to={c1BtnLink}
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
                                {isEn ? c1BtnEn : c1BtnAr}
                            </Link>
                        </div>
                        {/* Image Side */}
                        <div className="w-full md:w-[55%] h-full flex items-center justify-center p-8 lg:p-12 relative z-10">
                            <img
                                src={c1Img}
                                alt={isEn ? c1TitleEn : c1TitleAr}
                                loading="lazy"
                                className="w-full h-auto object-contain max-w-[500px] drop-shadow-2xl"
                            />
                        </div>

                    </div>

                    {/* CARD 2: SMALL GREEN (35%) */}
                    <div className="w-full lg:w-[35%] bg-[#234745] rounded-[40px] p-10 flex flex-col items-center justify-between text-center min-h-[460px] relative overflow-hidden group shadow-sm">
                        <div className="w-full flex justify-center mb-8">
                            <img
                                src={c2Img}
                                className="w-full h-auto object-contain max-w-[300px] transition-transform duration-1000 group-hover:scale-105 drop-shadow-2xl"
                                alt={isEn ? c2TitleEn : c2TitleAr}
                                loading="lazy"
                            />
                        </div>
                        <div className="relative z-10 w-full flex flex-col items-center">
                            <h3
                                className={`font-bold text-white text-center mb-10 tracking-tight ${isEn ? 'text-[28px] lg:text-[36px]' : 'text-[38px]'}`}
                                style={{ fontFamily: !isEn ? "'Bahij Janna', sans-serif" : undefined, lineHeight: '125%' }}
                            >
                                {isEn ? c2TitleEn : c2TitleAr}
                            </h3>
                            <Link
                                to={c2BtnLink}
                                className="bg-[#FEF8EB] text-[#255441] rounded-[100px] transition-all flex items-center justify-center font-bold px-8 py-3 w-[90%] md:w-full md:max-w-[245px]"
                            >
                                {isEn ? c2BtnEn : c2BtnAr}
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
