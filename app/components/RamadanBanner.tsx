import { Link, useOutletContext } from 'react-router';
import { useEffect, useState } from 'react';

export function RamadanBanner({ config }: { config?: any }) {
    const { locale } = useOutletContext<{ locale: string }>();
    const isEn = locale === 'en';

    // Parse Metaobject config
    const showField = config?.fields?.find((f: any) => f.key === 'show_ramadan_banner')?.value;
    if (showField === 'false') return null; // Hide if explicitly toggled off

    const getField = (key: string) => config?.fields?.find((f: any) => f.key === key)?.value;
    const getRefUrl = (key: string) => config?.fields?.find((f: any) => f.key === key)?.reference?.image?.url;

    const customTitleEn = getField('ramadan_title_en');
    const customTitleAr = getField('ramadan_title_ar');
    const subtitleEn = getField('ramadan_subtitle_en') || 'Luxury sweets — exclusive for Ramadan';
    const subtitleAr = getField('ramadan_subtitle_ar') || 'حلويات وشوكولاتة فاخرة — حصرية لشهر رمضان المبارك';
    const badgeEn = getField('ramadan_badge_en') || 'Limited Offer';
    const badgeAr = getField('ramadan_badge_ar') || 'عرض محدود';
    const imageUrl = getRefUrl('ramadan_image') || '/images/ramadan-offers-section.webp';

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
            className={`w-full bg-[#FEF8EB] py-8 lg:py-16 ${isEn ? 'font-en' : 'font-ar'} flex justify-center`}
            dir={isEn ? 'ltr' : 'rtl'}
        >
            {/* Main Wrapper matching Figma 1280px width */}
            <div className="w-full max-w-[1280px] px-4 md:px-0">
                <div className={`relative w-full h-auto md:h-[503px] rounded-none overflow-hidden flex flex-col ${isEn ? 'md:flex-row' : 'md:flex-row-reverse'} shadow-sm`}>
                    
                    {/* Background Halves */}
                    <div className="absolute inset-0 z-0 flex flex-col">
                        <div className="w-full h-[251px] md:h-1/2 bg-[#EED5D7]"></div>
                        <div className="w-full h-auto flex-1 md:h-1/2 bg-[#906B51]"></div>
                    </div>

                    {/* Left Side: Image (First in LTR, Last in RTL so it stays on the left visually) */}
                    <div className="relative z-10 w-full md:w-[45%] h-[300px] md:h-full flex items-center justify-center p-8">
                        <img 
                            src={imageUrl} 
                            alt={customTitleEn || "Ramadan Sweets Tray"} 
                            className="w-full max-w-[490px] h-auto object-contain"
                            style={{ maxWidth: '489.6px', maxHeight: '400px' }}
                        />
                    </div>

                    {/* Right Side: Content */}
                    <div className={`relative z-10 w-full md:w-[55%] flex flex-col justify-center py-12 px-8 lg:px-[126px] items-start text-start gap-[32px]`}>
                        
                        {/* Red Badge */}
                        <div className="bg-[#E64950] rounded-[8px] flex items-center justify-center shadow-sm min-w-[98px] px-3 h-[32px]">
                            <span className={`text-[#F9F9F9] font-bold text-[12px] leading-[15px] whitespace-nowrap ${!isEn ? 'font-dinar' : ''}`}>
                                ⏳ {isEn ? badgeEn : badgeAr}
                            </span>
                        </div>

                        {/* Title Section */}
                        <div className={`flex flex-col gap-[16px] py-[8px] items-start`}>
                            <div className="flex items-center gap-[8px]">
                                {!isEn && <div className="w-[48px] border-t border-[#255441]"></div>}
                                <p className={`text-[#255441] font-medium text-[16px] leading-[20px] ${!isEn ? 'font-dinar' : ''}`}>
                                    {isEn ? subtitleEn : subtitleAr}
                                </p>
                                {isEn && <div className="w-[48px] border-t border-[#255441]"></div>}
                            </div>
                            
                            <h2 className="text-[36px] lg:text-[50px] font-bold leading-[1.2] lg:leading-[80px] text-[#255441]" style={!isEn ? { fontFamily: "'Bahij Janna', sans-serif" } : undefined}>
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

                        {/* Countdown Timer */}
                        <div className={`flex items-center gap-[16px] flex-row`}>
                            {[
                                { value: timeLeft.days, labelEn: 'Days', labelAr: 'يوم' },
                                { value: timeLeft.hours, labelEn: 'Hours', labelAr: 'ساعة' },
                                { value: timeLeft.minutes, labelEn: 'Minutes', labelAr: 'دقيقة' },
                                { value: timeLeft.seconds, labelEn: 'Seconds', labelAr: 'ثانية' }
                            ].map((item, index) => (
                                <div key={index} className="w-[72px] h-[87px] bg-[#FEF8EB] border border-[#9FB7AE] rounded-[8px] flex flex-col justify-center items-center gap-[7px] p-[16px] shadow-sm box-border">
                                    <span className={`text-[#906B51] font-bold text-[18px] leading-[22px] ${!isEn ? 'font-dinar' : ''}`}>
                                        {convertToArabicDigits(item.value)}
                                    </span>
                                    <span className="text-[#906B51] font-dinar text-[14px] leading-[17px]">
                                        {isEn ? item.labelEn : item.labelAr}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* CTA Button */}
                        <Link 
                            to={isEn ? "/en/collections/ramadan" : "/collections/ramadan"}
                            className="bg-[#BBCFCD] text-[#234745] font-dinar font-bold text-[18px] leading-[22px] rounded-[24px] w-[224px] h-[48px] flex items-center justify-center hover:bg-[#a5bdbb] transition-colors"
                            style={{ padding: '12px 20px', gap: '8px' }}
                        >
                            {isEn ? 'Shop the Collection' : 'تسوق التشكيلة الان'}
                        </Link>

                    </div>

                </div>
            </div>
        </section>
    );
}
