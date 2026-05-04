import { Link, useOutletContext } from 'react-router';
import { useI18n } from '~/lib/i18n';

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
            name: shopifyCollection?.title || occasion.name // Optionally use Shopify title
        };
    });

    return (
        <section className={`w-full py-16 lg:py-20 ${isEn ? 'font-en' : 'font-ar'} bg-[#fcf9f3]`} dir={isEn ? 'ltr' : 'rtl'}>
            <div className="max-w-[1400px] mx-auto px-6">
                {/* Header */}
                <div className="text-center mb-12">
                    <h2 className="text-[40px] lg:text-[56px] font-black text-[#1a1a1a] mb-2 leading-tight">
                        {isEn ? 'What is your occasion?' : 'ما هي مناسبتك؟'}
                    </h2>
                    <p className="text-[#666] text-[15px] lg:text-[18px] font-medium">
                        {isEn ? 'Choose the occasion and we pick the best for you' : 'اختار المناسبة ونختارلك الأفضل'}
                    </p>
                </div>

                {/* Mobile Slider / Desktop Grid */}
                <div className="flex md:grid md:grid-cols-4 gap-4 lg:gap-8 overflow-x-auto md:overflow-visible hide-scrollbars snap-x snap-mandatory pb-8 md:pb-0 px-4 md:px-0">
                    {occasions.map((occasion, index) => (
                        <Link
                            key={index}
                            to={isEn ? `/en/collections/${occasion.handle}` : `/collections/${occasion.handle}`}
                            className="group flex-shrink-0 w-[280px] md:w-auto bg-[#f9edee] rounded-[40px] overflow-hidden snap-center transition-all duration-300"
                        >
                            {/* Card Content */}
                            <div className="p-3 flex flex-col h-full">
                                {/* Image Container */}
                                <div className="w-full aspect-square rounded-[32px] overflow-hidden bg-[#f5eaea] relative">
                                    <img 
                                        src={occasion.image} 
                                        alt=""
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                            const placeholder = e.currentTarget.parentElement?.querySelector('.placeholder-overlay');
                                            if (placeholder) (placeholder as HTMLElement).style.display = 'flex';
                                        }}
                                    />
                                    {/* Elegant Placeholder */}
                                    <div className="placeholder-overlay absolute inset-0 hidden items-center justify-center bg-gradient-to-br from-white/40 to-transparent">
                                        <div className="w-16 h-16 rounded-full border-2 border-white/30 flex items-center justify-center">
                                            <div className="w-2 h-2 bg-white/30 rounded-full animate-ping"></div>
                                        </div>
                                    </div>
                                </div>

                                {/* Label Area with Diamond Pattern */}
                                <div className="relative w-full py-5 lg:py-6 mt-auto overflow-hidden rounded-b-[40px]">
                                   {/* High-Fidelity Geometric Mesh */}
                                   <div 
                                      className="absolute inset-0 opacity-[0.12] pointer-events-none"
                                      style={{
                                          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 0 L40 20 L20 40 L0 20 Z' fill='none' stroke='%23c4a5a7' stroke-width='0.8'/%3E%3C/svg%3E")`,
                                          backgroundSize: '20px'
                                      }}
                                   />
                                   <h3 className="relative text-[20px] lg:text-[28px] font-black text-[#1a1a1a] z-10 px-4 text-center leading-tight">
                                       {occasion.name}
                                   </h3>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
