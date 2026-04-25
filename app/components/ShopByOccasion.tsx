import { Link, useOutletContext } from 'react-router';
import { useI18n } from '~/lib/i18n';

const occasionsEn = [
    { name: 'Birthdays', emoji: '🎂', count: '60+', link: '/en/collections' },
    { name: 'Weddings', emoji: '💍', count: '55+', link: '/en/collections' },
    { name: 'Graduation', emoji: '🎓', count: '41+', link: '/en/collections' },
    { name: 'Ramadan', emoji: '🌙', count: '61+', link: '/en/collections' },
    { name: 'Eid', emoji: '💐', count: '70+', link: '/en/collections' },
    { name: 'Mother Day', emoji: '💐', count: '77+', link: '/en/collections' },
    { name: 'Corporate', emoji: '🏢', count: '24+', link: '/en/collections' },
];

const occasionsAr = [
    { name: 'أعياد الميلاد', emoji: '🎂', count: '٦٠+', link: '/collections' },
    { name: 'الزواج', emoji: '💍', count: '٥٥+', link: '/collections' },
    { name: 'التخرج', emoji: '🎓', count: '٤١+', link: '/collections' },
    { name: 'رمضان', emoji: '🌙', count: '٦١+', link: '/collections' },
    { name: 'العيد', emoji: '💐', count: '٧٠+', link: '/collections' },
    { name: 'يوم الأم', emoji: '💐', count: '٧٧+', link: '/collections' },
    { name: 'المؤسسات', emoji: '🏢', count: '٢٤+', link: '/collections' },
];

export function ShopByOccasion() {
    const { locale } = useOutletContext<{ locale: string }>();
    const t = useI18n(locale);
    const isEn = locale === 'en';
    const occasions = isEn ? occasionsEn : occasionsAr;

    return (
        <section className={`w-full bg-white py-16 lg:py-20 ${isEn ? 'font-en' : 'font-ar'}`} dir={isEn ? 'ltr' : 'rtl'}>
            <div className="max-w-[1400px] mx-auto px-6">
                {/* Header */}
                <div className="text-center mb-14">
                    <h2 className="text-[32px] lg:text-[38px] font-black text-[#1a1a1a] mb-3 leading-tight">{t.homepage.shopByOccasion}</h2>
                    <p className="text-gray-400 text-[15px] font-medium mb-4">{isEn ? 'Choose an occasion and we pick the best for you' : 'اختار المناسبة ونختارلك الأفضل'}</p>
                    <div className="w-12 h-1 bg-[#295b45] rounded-full mx-auto"></div>
                </div>

                {/* Occasions Grid */}
                <div className="flex flex-wrap justify-center gap-8 lg:gap-12">
                    {occasions.map((occasion, index) => (
                        <Link
                            key={index}
                            to={occasion.link}
                            className="flex flex-col items-center gap-4 group cursor-pointer"
                        >
                            {/* Circle with emoji */}
                            <div className="relative">
                                <div className="w-[110px] h-[110px] lg:w-[130px] lg:h-[130px] rounded-full bg-[#f2f2f2] flex items-center justify-center group-hover:bg-[#e8f0ec] transition-colors duration-300 shadow-sm">
                                    <span className="text-[40px] lg:text-[48px]">{occasion.emoji}</span>
                                </div>
                                {/* Count Badge */}
                                <div className="absolute -top-1 -left-1 w-9 h-9 bg-[#295b45] rounded-full flex items-center justify-center shadow-md">
                                    <span className="text-white text-[10px] font-bold font-en leading-none">{occasion.count}</span>
                                </div>
                            </div>
                            {/* Label */}
                            <span className="text-[14px] lg:text-[15px] font-bold text-[#555] group-hover:text-[#295b45] transition-colors duration-300">{occasion.name}</span>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
