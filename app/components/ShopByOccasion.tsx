import { Link, useOutletContext } from 'react-router';
import { CardSlider } from './CardSlider';
import { resolveOccasions } from '~/lib/occasions';

/**
 * Homepage occasion cards. Which occasions, their order, titles, images and
 * visibility come from Shopify (collection metafields custom.is_occasion /
 * occasion_order / occasion_visible) through ~/lib/occasions, the same resolver
 * /occasions uses and the same rules as the app.
 */
export function ShopByOccasion({ collections }: { collections?: any[] }) {
    const { locale = 'ar' } = useOutletContext<{ locale?: string }>() ?? {};
    const isEn = locale === 'en';

    // Visible cards only, in the merchandised order (~/lib/occasions).
    const visibleOccasions = resolveOccasions(collections, isEn).filter(
        occasion => occasion.visible,
    );

    return (
        <section className={`w-full lg:py-24 bg-[#FEF8EB] ${isEn ? 'font-en' : 'font-ar'}`} dir={isEn ? 'ltr' : 'rtl'} style={{ paddingTop: '50px', paddingBottom: '50px' }}>
            <div className="max-w-[1400px] mx-auto px-6">
                {/* Header */}
                <div className="text-center mb-6 lg:mb-8">
                    <h2 className="text-[36px] lg:text-[50px] font-bold text-[#171717] !mb-2 leading-none" style={!isEn ? { fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" } : undefined}>
                        {isEn ? 'What is your occasion?' : 'ما هي مناسبتك؟'}
                    </h2>
                    <p className="text-[#7D7D7D] text-[16px] lg:text-[16px] font-medium tracking-wide">
                        {isEn ? 'Choose the occasion and we pick the best for you' : 'اختر المناسبة ونختار لك الأفضل'}
                    </p>
                </div>

                {/* A slider at every size now. It used to wrap from md up,
                    which stranded the fifth occasion alone on its own row. */}
                <CardSlider isEn={isEn} trackClassName="pb-4 -mx-6 px-6 md:mx-0 md:px-0">
                    {visibleOccasions.map((occasion, index) => (
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
                                    <h3 className="relative pt-2 text-[22px] !no-underline hover:no-underline lg:text-[26px] font-bold text-[#171717] z-10 px-4 text-center leading-tight" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}>
                                        {occasion.name}
                                    </h3>
                                </div>
                            </div>
                        </Link>
                    ))}
                </CardSlider>

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
