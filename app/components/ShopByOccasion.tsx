import { Link, useOutletContext } from 'react-router';

const occasionsEn = [
    { name: 'Wedding', handle: 'wedding', image: 'https://cdn.shopify.com/s/files/1/0809/4253/0869/files/wedding_design.png?v=1711234567' },
    { name: 'Ramadan', handle: 'ramadan', image: 'https://cdn.shopify.com/s/files/1/0809/4253/0869/files/ramadan_design.png?v=1711234568' },
    { name: 'Birthdays', handle: 'birthdays', image: 'https://cdn.shopify.com/s/files/1/0809/4253/0869/files/birthday_design.png?v=1711234569' },
    { name: 'Eid', handle: 'eid', image: 'https://cdn.shopify.com/s/files/1/0809/4253/0869/files/eid_design.png?v=1711234570' },
    { name: 'New Baby', handle: 'new-baby', image: 'https://cdn.shopify.com/s/files/1/0809/4253/0869/files/new_baby_design.png?v=1711234571' },
    { name: 'National Day', handle: 'national-day', image: 'https://cdn.shopify.com/s/files/1/0809/4253/0869/files/national_day_design.png?v=1711234572' },
    { name: 'Mother\'s Day', handle: 'mothers-day', image: 'https://cdn.shopify.com/s/files/1/0809/4253/0869/files/mothers_day_design.png?v=1711234573' },
    { name: 'Graduation', handle: 'graduation', image: 'https://cdn.shopify.com/s/files/1/0809/4253/0869/files/graduation_design.png?v=1711234574' },
];

const occasionsAr = [
    { name: 'زفاف', handle: 'wedding', image: 'https://cdn.shopify.com/s/files/1/0809/4253/0869/files/wedding_design.png?v=1711234567' },
    { name: 'رمضان', handle: 'ramadan', image: 'https://cdn.shopify.com/s/files/1/0809/4253/0869/files/ramadan_design.png?v=1711234568' },
    { name: 'أعياد الميلاد', handle: 'birthdays', image: 'https://cdn.shopify.com/s/files/1/0809/4253/0869/files/birthday_design.png?v=1711234569' },
    { name: 'العيد', handle: 'eid', image: 'https://cdn.shopify.com/s/files/1/0809/4253/0869/files/eid_design.png?v=1711234570' },
    { name: 'مواليد', handle: 'new-baby', image: 'https://cdn.shopify.com/s/files/1/0809/4253/0869/files/new_baby_design.png?v=1711234571' },
    { name: 'اليوم الوطني', handle: 'national-day', image: 'https://cdn.shopify.com/s/files/1/0809/4253/0869/files/national_day_design.png?v=1711234572' },
    { name: 'يوم الأم', handle: 'mothers-day', image: 'https://cdn.shopify.com/s/files/1/0809/4253/0869/files/mothers_day_design.png?v=1711234573' },
    { name: 'التخرج', handle: 'graduation', image: 'https://cdn.shopify.com/s/files/1/0809/4253/0869/files/graduation_design.png?v=1711234574' },
];

export function ShopByOccasion({ collections }: { collections?: any[] }) {
    const { locale } = useOutletContext<{ locale: string }>();
    const isEn = locale === 'en';

    // Merge Shopify data with static metadata
    const occasions = (isEn ? occasionsEn : occasionsAr).map(occasion => {
        const shopifyCollection = collections?.find(c => c.handle === occasion.handle);
        return {
            ...occasion,
            image: shopifyCollection?.image?.url || occasion.image,
            name: occasion.name
        };
    });

    return (
        <section className={`w-full lg:py-24 bg-[#FEF8EB] ${isEn ? 'font-en' : 'font-ar'}`} dir={isEn ? 'ltr' : 'rtl'} style={{ paddingTop: '50px', paddingBottom: '50px' }}>
            <div className="max-w-[1400px] mx-auto px-6">
                {/* Header */}
                <div className="text-center mb-6 lg:mb-8">
                    <h2 className="text-[36px] lg:text-[50px] font-bold text-[#171717] !mb-2 leading-none" style={!isEn ? { fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" } : undefined}>
                        {isEn ? 'What is your occasion?' : 'ما هي مناسبتك؟'}
                    </h2>
                    <p className="text-[#7D7D7D] text-[16px] lg:text-[16px] font-medium tracking-wide">
                        {isEn ? 'Choose the occasion and we pick the best for you' : 'اختار المناسبة ونختار لك الأفضل'}
                    </p>
                </div>

                {/* Slider (Mobile) / Flex (Desktop) */}
                <div className="flex flex-nowrap md:flex-wrap justify-start md:justify-center gap-4 lg:gap-6 overflow-x-auto md:overflow-visible snap-x snap-mandatory pb-4 md:pb-0 -mx-6 px-6 md:mx-0 md:px-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {occasions.map((occasion, index) => (
                        <Link
                            key={index}
                            to={isEn ? `/en/occasions?category=${occasion.handle}` : `/occasions?category=${occasion.handle}`}
                            className="snap-start shrink-0 w-[calc(50vw-32px)] sm:w-[220px] md:w-[280px] max-w-full group flex flex-col bg-[#EED5D7] rounded-[12px] overflow-hidden transition-all duration-500 hover:shadow-xl hover:-translate-y-2 relative shadow-sm"
                            style={{
                                aspectRatio: '280/328'
                            }}
                        >
                            {/* Pattern Overlay Layer */}
                            <div
                                className="absolute bottom-0 left-0 right-0 h-[30%] z-0 pointer-events-none"
                                style={{
                                    backgroundImage: `url('/assets/patterns/occassions-bg.svg')`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'bottom center',
                                    backgroundRepeat: 'no-repeat',
                                    opacity: 0.4,
                                    maskImage: 'linear-gradient(to top, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 100%)',
                                    WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 100%)'
                                }}
                            />

                            <div className="p-2 lg:p-2 flex flex-col h-full relative z-10">
                                {/* Image Container */}
                                <div className="w-full aspect-square rounded-[12px] overflow-hidden bg-white relative">
                                    <img
                                        src={occasion.image}
                                        alt=""
                                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                                    />
                                </div>

                                {/* Label Area */}
                                <div className="relative w-full mt-auto flex-1 flex items-center justify-center">
                                    <h3 className="relative pt-2 text-[22px] lg:text-[26px] font-bold text-[#171717] z-10 px-4 text-center leading-tight" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}>
                                        {occasion.name}
                                    </h3>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Footer Button */}
                <div className="mt-8 lg:mt-12 flex justify-center">
                    <Link
                        to={isEn ? "/en/occasions" : "/occasions"}
                        className="px-12 py-4 rounded-full border-2 border-[#234745] !text-[#234745] [font-family:'GE_Dinar_One',sans-serif] font-bold text-[15px] lg:text-[18px] transition-all hover:bg-[#1a3533] hover:!text-white hover:border-[#1a3533] active:scale-95"
                    >
                        {isEn ? 'Browse All Occasions' : 'تصفح كل المناسبات'}
                    </Link>
                </div>
            </div>
        </section>
    );
}
