import { Link, useOutletContext } from 'react-router';
import { useEffect, useState } from 'react';

export function RamadanBanner({ config }: { config?: any }) {
    const { locale } = useOutletContext<{ locale: string }>();
    const isEn = locale === 'en';

    // Parse ramadan_banner Metaobject node
    const rNode = config?.ramadanBanner?.nodes?.[0];
    const isHidden = rNode?.fields?.find((f: any) => f.key === 'is_hidden')?.value;
    if (isHidden === 'true' || isHidden === '1' || isHidden === true) return null;

    const getField = (key: string) => rNode?.fields?.find((f: any) => f.key === key)?.value;
    const getRefUrl = (key: string) => rNode?.fields?.find((f: any) => f.key === key)?.reference?.image?.url;

    const customTitleEn = getField('title_en');
    const customTitleAr = getField('title_ar');
    const subtitleEn = getField('subtitle_en') || 'Luxury sweets — exclusive for Ramadan';
    const subtitleAr = getField('subtitle_ar') || 'حلويات وشوكولاتة فاخرة — حصرية لشهر رمضان المبارك';
    const badgeEn = getField('badge_en') || 'Limited Offer';
    const badgeAr = getField('badge_ar') || 'عرض محدود';
    const btnTextEn = getField('button_text_en') || 'Shop the Collection';
    const btnTextAr = getField('button_text_ar') || 'تسوق التشكيلة الان';
    const rawBtnLink = getField('button_link') || '/collections/ramadan';
    const btnLink = (() => {
        if (!rawBtnLink) return isEn ? '/en' : '/';
        if (rawBtnLink.startsWith('http://') || rawBtnLink.startsWith('https://')) return rawBtnLink;
        const path = rawBtnLink.startsWith('/') ? rawBtnLink : `/${rawBtnLink}`;
        if (isEn) return path.startsWith('/en') ? path : `/en${path}`;
        return path.startsWith('/en/') ? path.replace(/^\/en/, '') : (path === '/en' ? '/' : path);
    })();
    const imageUrl = getRefUrl('image') || getRefUrl('ramadan_image') || '/images/ramadan-offers-section.webp';

    // Simple countdown logic starting from 14 days
    const [timeLeft, setTimeLeft] = useState({
        days: 13,
        hours: 14,
        minutes: 47,
        seconds: 56
    });

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                let { days, hours, minutes, seconds } = prev;
                if (seconds > 0) {
                    seconds--;
                } else {
                    seconds = 59;
                    if (minutes > 0) {
                        minutes--;
                    } else {
                        minutes = 59;
                        if (hours > 0) {
                            hours--;
                        } else {
                            hours = 23;
                            if (days > 0) {
                                days--;
                            }
                        }
                    }
                }
                return { days, hours, minutes, seconds };
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const convertToArabicDigits = (num: number) => {
        if (isEn) return num.toString().padStart(2, '0');
        const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
        return num.toString().padStart(2, '0').split('').map(d => arabicDigits[parseInt(d)]).join('');
    };

    return (
        <section
            className={`w-full bg-[#FEF8EB] lg:py-16 ${isEn ? 'font-en' : 'font-ar'} flex justify-center`}
            dir={isEn ? 'ltr' : 'rtl'}
            style={{ paddingTop: '50px', paddingBottom: '50px' }}
        >
            {/* Main Wrapper matching Figma 1280px width */}
            <div className="w-full max-w-[1280px] px-4 md:px-0">
                <div className={`relative w-full h-auto md:h-[503px] rounded-none overflow-hidden flex flex-col ${isEn ? 'md:flex-row' : 'md:flex-row-reverse'} shadow-sm`}>

                    {/* Absolute Background Split for Desktop */}
                    <div className="hidden md:flex absolute inset-0 z-0 flex-col">
                        <div className="w-full h-[50%] bg-[#EED5D7]"></div>
                        <div className="w-full h-[50%] bg-[#906B51]"></div>
                    </div>

                    {/* Left Side: Image (First in LTR, Last in RTL so it stays on the left visually) */}
                    <div className="relative z-10 w-full md:w-[45%] h-[260px] md:h-full flex items-center justify-center p-8 bg-[#EED5D7] md:bg-transparent pt-12">
                        <img
                            src={imageUrl}
                            alt={customTitleEn || "Ramadan Sweets Tray"}
                            className="w-full max-w-[490px] h-auto object-contain"
                            style={{ maxWidth: '489.6px', maxHeight: '400px' }}
                        />
                    </div>

                    {/* Right Side: Content */}
                    <div className={`relative z-10 w-full md:w-[55%] flex flex-col md:bg-transparent`}>

                        {/* Top Half (Pink on mobile, transparent on desktop since absolute bg handles it) */}
                        <div className="flex flex-col items-center md:items-start justify-end text-center md:text-start bg-[#EED5D7] md:bg-transparent px-4 pb-8 md:px-8 lg:px-[126px] md:pb-[30px] w-full md:h-[50%] gap-[16px] md:gap-[24px]">

                            {/* Red Badge */}
                            <div className="bg-[#E64950] rounded-[8px] flex items-center justify-center shadow-sm min-w-[98px] px-3 h-[32px] self-end md:self-auto -mt-10 md:mt-0 z-20">
                                <span className={`text-[#F9F9F9] font-bold text-[12px] leading-[15px] whitespace-nowrap ${!isEn ? 'font-dinar' : ''}`}>
                                    ⏳ {isEn ? badgeEn : badgeAr}
                                </span>
                            </div>

                            {/* Title Section */}
                            <div className={`flex flex-col gap-[16px] py-[8px] items-center md:items-start`}>
                                <div className="flex items-center gap-[8px] w-full justify-center md:justify-start">
                                    {!isEn && <div className="w-[48px] border-t border-[#255441]"></div>}
                                    <p className={`text-[#255441] font-medium text-[14px] md:text-[16px] leading-[20px] ${!isEn ? 'font-dinar' : ''}`}>
                                        {isEn ? subtitleEn : subtitleAr}
                                    </p>
                                    {isEn && <div className="w-[48px] border-t border-[#255441]"></div>}
                                </div>

                                <h2 className="text-[32px] md:text-[36px] lg:text-[50px] font-bold leading-[1.2] lg:leading-[60px] text-[#255441]" style={!isEn ? { fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" } : undefined}>
                                    {isEn ? (
                                        customTitleEn ? customTitleEn : (
                                            <>
                                                <span className="text-[#C5A96A]">Golden </span>
                                                <span>Ramadan </span>
                                                <span className="text-[#C5A96A]">Collection</span>
                                            </>
                                        )
                                    ) : (
                                        customTitleAr ? customTitleAr : (
                                            <>
                                                <span className="text-[#C5A96A]">تشكيلة </span>
                                                <span>رمضان </span>
                                                <span className="text-[#C5A96A]">الذهبية</span>
                                            </>
                                        )
                                    )}
                                </h2>
                            </div>
                        </div>

                        {/* Bottom Half (Brown on mobile, transparent on desktop) */}
                        <div className="flex flex-col items-center md:items-start justify-start bg-[#906B51] md:bg-transparent px-4 py-8 md:px-8 lg:px-[126px] md:py-0 md:pt-[30px] w-full md:h-[50%] gap-[32px]">

                            {/* Countdown Timer */}
                            <div className={`flex items-center justify-center gap-[10px] md:gap-[16px] flex-row w-full md:w-auto`}>
                                {[
                                    { value: timeLeft.days, labelEn: 'Days', labelAr: 'يوم' },
                                    { value: timeLeft.hours, labelEn: 'Hours', labelAr: 'ساعة' },
                                    { value: timeLeft.minutes, labelEn: 'Minutes', labelAr: 'دقيقة' },
                                    { value: timeLeft.seconds, labelEn: 'Seconds', labelAr: 'ثانية' }
                                ].map((item, index) => (
                                    <div key={index} className="w-[68px] h-[80px] md:w-[72px] md:h-[87px] bg-[#FEF8EB] border border-[#906B51] md:border-[#9FB7AE] rounded-[8px] flex flex-col justify-center items-center gap-[7px] p-[10px] md:p-[16px] shadow-sm box-border">
                                        <span className={`text-[#906B51] font-bold text-[16px] md:text-[18px] leading-[22px] ${!isEn ? 'font-dinar' : ''}`}>
                                            {(item.value)}
                                        </span>
                                        <span className="text-[#906B51] font-dinar text-[14px] leading-[17px]">
                                            {isEn ? item.labelEn : item.labelAr}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* CTA Button */}
                            <Link
                                to={btnLink}
                                className="bg-[#BBCFCD] !text-[#234745] font-dinar font-bold text-[16px] md:text-[18px] leading-[22px] rounded-[24px] w-[85%] md:w-[224px] h-[48px] flex items-center justify-center hover:bg-[#a5bdbb] transition-colors"
                                style={{ padding: '12px 20px', gap: '8px' }}
                            >
                                {isEn ? btnTextEn : btnTextAr}
                            </Link>

                        </div>

                    </div>
                </div>
            </div>
        </section>
    );
}
