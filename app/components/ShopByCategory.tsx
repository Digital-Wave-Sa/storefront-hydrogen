import { NavLink, useOutletContext } from 'react-router';
import { useI18n } from '~/lib/i18n';

export function ShopByCategory() {
    const { locale } = useOutletContext<{ locale: string }>();
    const t = useI18n(locale);
    const isEn = locale === 'en';

    const categories = [
        { id: 1, name: t.categories.chocolate, icon: '🍫', count: isEn ? '+40' : '+٤٠', link: isEn ? '/en/collections/chocolate' : '/collections/chocolate' },
        { id: 2, name: t.categories.cakes, icon: '🎂', count: isEn ? '+50' : '+٥٠', link: isEn ? '/en/collections/cakes' : '/collections/cakes' },
        { id: 3, name: t.categories.biscuits, icon: '🍪', count: isEn ? '+99' : '+٩٩', link: isEn ? '/en/collections/biscuits' : '/collections/biscuits' },
        { id: 4, name: t.categories.oriental, icon: '🍬', count: isEn ? '+10' : '+١٠', link: isEn ? '/en/collections/oriental' : '/collections/oriental' },
        { id: 5, name: t.categories.coffee, icon: '☕', count: isEn ? '+60' : '+٦٠', link: isEn ? '/en/collections/coffee' : '/collections/coffee' },
        { id: 6, name: t.categories.strawberry, icon: '🍓', count: isEn ? '+70' : '+٧٠', link: isEn ? '/en/collections/strawberry' : '/collections/strawberry' },
        { id: 7, name: t.categories.gifts, icon: '🎁', count: isEn ? '+76' : '+٧٦', link: isEn ? '/en/collections/gifts' : '/collections/gifts' },
        { id: 8, name: t.categories.cupcakes, icon: '🧁', count: isEn ? '+24' : '+٢٤', link: isEn ? '/en/collections/cupcakes' : '/collections/cupcakes' },
    ];

    return (
        <section dir={isEn ? 'ltr' : 'rtl'} className={`w-full bg-[#fdfaf6] py-16 ${isEn ? 'font-en' : 'font-ar'}`}>
            <div className="max-w-[1400px] mx-auto px-4 md:px-8">

                {/* Section Header */}
                <div className="text-center mb-12">
                    <h2 className="text-[40px] lg:text-[56px] font-black text-[#1a1a1a] mb-3 leading-tight">{t.homepage.shopByCategory}</h2>
                    <p className="text-gray-500 text-sm md:text-base font-medium mb-4">{t.homepage.discoverWideRange}</p>
                </div>

                {/* Categories Carousel / Grid */}
                <div className="flex overflow-x-auto gap-4 md:gap-8 pb-8 px-2 snap-x snap-mandatory hide-scrollbars justify-start lg:justify-center"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>

                    {categories.map((cat) => (
                        <NavLink
                            key={cat.id}
                            to={cat.link}
                            className="flex flex-col items-center gap-4 group min-w-[110px] md:min-w-[130px] snap-center shrink-0"
                        >
                            <div className="relative">
                                {/* Circle Container */}
                                <div className="w-[100px] h-[100px] md:w-[130px] md:h-[130px] bg-[#f5ede4] rounded-full flex items-center justify-center text-4xl md:text-5xl shadow-sm transition-transform duration-300 group-hover:scale-105 group-hover:shadow-md border border-white">
                                    {cat.icon}
                                </div>

                                {/* Count Badge */}
                                <div className={`absolute top-0 ${isEn ? 'right-0 md:-right-1' : 'left-0 md:-left-1'} w-7 h-7 md:w-8 md:h-8 bg-[#295b45] text-white rounded-full flex items-center justify-center text-[11px] md:text-xs font-bold border-2 border-[#fdfaf6] shadow-sm z-10 font-en`}>
                                    {cat.count}
                                </div>
                            </div>

                            <span className="text-[#295b45] font-bold text-sm md:text-base text-center transition-colors group-hover:text-[#1e4534]">
                                {cat.name}
                            </span>
                        </NavLink>
                    ))}

                </div>

            </div>
        </section>
    );
}

