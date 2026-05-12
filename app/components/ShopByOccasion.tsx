import { Link, useOutletContext } from 'react-router';

const occasionsEn = [
    { name: 'Wedding', handle: 'wedding', image: 'https://cdn.shopify.com/s/files/1/0809/4253/0869/files/wedding_design.png?v=1711234567' },
    { name: 'Ramadan', handle: 'ramadan', image: 'https://cdn.shopify.com/s/files/1/0809/4253/0869/files/ramadan_design.png?v=1711234568' },
    { name: 'Birthdays', handle: 'birthdays', image: 'https://cdn.shopify.com/s/files/1/0809/4253/0869/files/birthday_design.png?v=1711234569' },
    { name: 'Celebrations', handle: 'celebrations', image: 'https://cdn.shopify.com/s/files/1/0809/4253/0869/files/eid_design.png?v=1711234570' },
    { name: 'New Baby', handle: 'new-baby', image: 'https://cdn.shopify.com/s/files/1/0809/4253/0869/files/new_baby_design.png?v=1711234571' },
    { name: 'National Day', handle: 'national-day', image: 'https://cdn.shopify.com/s/files/1/0809/4253/0869/files/national_day_design.png?v=1711234572' },
    { name: 'Mother\'s Day', handle: 'mothers-day', image: 'https://cdn.shopify.com/s/files/1/0809/4253/0869/files/mothers_day_design.png?v=1711234573' },
    { name: 'Graduation', handle: 'graduation', image: 'https://cdn.shopify.com/s/files/1/0809/4253/0869/files/graduation_design.png?v=1711234574' },
];

const occasionsAr = [
    { name: 'زفاف', handle: 'wedding', image: 'https://cdn.shopify.com/s/files/1/0809/4253/0869/files/wedding_design.png?v=1711234567' },
    { name: 'رمضان', handle: 'ramadan', image: 'https://cdn.shopify.com/s/files/1/0809/4253/0869/files/ramadan_design.png?v=1711234568' },
    { name: 'أعياد الميلاد', handle: 'birthdays', image: 'https://cdn.shopify.com/s/files/1/0809/4253/0869/files/birthday_design.png?v=1711234569' },
    { name: 'العنوان', handle: 'celebrations', image: 'https://cdn.shopify.com/s/files/1/0809/4253/0869/files/eid_design.png?v=1711234570' },
    { name: 'طفل جديد', handle: 'new-baby', image: 'https://cdn.shopify.com/s/files/1/0809/4253/0869/files/new_baby_design.png?v=1711234571' },
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
            name: shopifyCollection?.title || occasion.name
        };
    });

    return (
        <section className={`w-full py-16 lg:py-24 bg-[#FEF8EB] ${isEn ? 'font-en' : 'font-ar'}`} dir={isEn ? 'ltr' : 'rtl'}>
            <div className="max-w-[1400px] mx-auto px-6">
                {/* Header */}
                <div className="text-center mb-8 lg:mb-12">
                    <h2 className="text-[36px] lg:text-[52px] font-black text-[#1a1a1a] mb-4 leading-none">
                        {isEn ? 'What is your occasion?' : 'ما هي مناسبتك؟'}
                    </h2>
                    <p className="text-[#8B8B8B] text-[14px] lg:text-[16px] font-bold tracking-wide">
                        {isEn ? 'CHOOSE THE OCCASION AND WE PICK THE BEST FOR YOU' : 'اختار المناسبة ونختار لك الأفضل'}
                    </p>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
                    {occasions.map((occasion, index) => (
                        <Link
                            key={index}
                            to={isEn ? `/en/collections/${occasion.handle}` : `/collections/${occasion.handle}`}
                            className="group flex flex-col bg-[#F9EBEE] rounded-[40px] border border-[#EAD1D5] overflow-hidden transition-all duration-500 hover:shadow-xl hover:-translate-y-2"
                        >
                            <div className="p-3 lg:p-4 flex flex-col h-full">
                                {/* Image Container */}
                                <div className="w-full aspect-square rounded-[32px] overflow-hidden bg-white relative">
                                    <img 
                                        src={occasion.image} 
                                        alt={occasion.name}
                                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                                    />
                                </div>

                                {/* Label Area with Diamond Pattern */}
                                <div className="relative w-full py-6 lg:py-8 mt-auto">
                                   {/* Subtle Pattern Mesh */}
                                   <div 
                                      className="absolute inset-0 opacity-[0.08] pointer-events-none"
                                      style={{
                                          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0 L40 20 L20 40 L0 20 Z' fill='none' stroke='%23C4A5A7' stroke-width='1'/%3E%3C/svg%3E")`,
                                          backgroundSize: '30px'
                                      }}
                                   />
                                   <h3 className="relative text-[18px] lg:text-[24px] font-black text-[#1a1a1a] z-10 px-4 text-center leading-tight">
                                       {occasion.name}
                                   </h3>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Footer Button */}
                <div className="mt-16 lg:mt-24 flex justify-center">
                    <Link
                        to={isEn ? "/en/collections" : "/collections"}
                        className="px-12 py-4 rounded-full border-2 border-[#1a3533]/20 text-[#1a3533] font-black text-[15px] lg:text-[18px] transition-all hover:bg-[#1a3533] hover:text-white hover:border-[#1a3533] active:scale-95"
                    >
                        {isEn ? 'Browse All Occasions' : 'تصفح كل المناسبات'}
                    </Link>
                </div>
            </div>
        </section>
    );
}
