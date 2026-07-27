import { NavLink, useOutletContext } from 'react-router';
import { useState, useRef, useEffect } from 'react';
import { useI18n } from '~/lib/i18n';

export function Hero() {
    const { locale } = useOutletContext<{ locale: string }>();
    const t = useI18n(locale);
    const isEn = locale === 'en';

    return (
        <section
            dir={isEn ? 'ltr' : 'rtl'}
            className={`relative w-full overflow-hidden bg-[#FEF8EB] ${isEn ? 'font-en' : 'font-ar'} pt-8 md:pt-16 pb-0`}
            // Added a subtle SVG pattern for the background texture shown in the image
            style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e6e0d4' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }}
        >
            <div className="max-w-[1400px] mx-auto px-4 flex flex-col items-center text-center">

                {/* Top Badge */}
                <div className="inline-flex items-center gap-2 bg-[#BBCFCD]/40 text-[#234745] px-4 py-1.5 rounded-full text-sm font-bold mb-6">
                    <span className="text-[#e74c3c]">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7.4-6.3-4.8-6.3 4.8 2.3-7.4-6-4.6h7.6z" />
                        </svg>
                    </span>
                    {t.common.since}
                </div>

                {/* Headlines */}
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-[#1a1a1a] leading-tight mb-4 tracking-tight">
                    {t.common.bestExperience}<br />
                    <span className="text-[#234745]">{t.common.chocolateAndSweets}</span>
                </h1>

                {/* Subtitle */}
                <p className="text-[#666] max-w-2xl mx-auto text-[15px] md:text-base font-medium leading-relaxed mb-10">
                    {t.common.discoverCollection}
                </p>

                {/* Action Buttons */}
                <div className="flex items-center justify-center gap-4 mb-8 md:mb-16">
                    <NavLink to={isEn ? "/en/collections/all" : "/collections/all"} className="bg-[#234745] hover:opacity-90 transition-colors text-white px-8 py-3.5 rounded-full font-bold text-base flex items-center gap-2 shadow-sm min-w-[160px] justify-center">
                        {t.common.shopNow}
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={isEn ? "rotate-180" : ""}>
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                    </NavLink>

                    <NavLink to={isEn ? "/en/custom-cake" : "/custom-cake"} className="bg-transparent border-[2px] border-[#234745] text-[#234745] hover:bg-[#234745] hover:text-white transition-all px-8 py-3.5 rounded-full font-bold text-base flex items-center gap-2 min-w-[160px] justify-center">
                        {t.common.designYourCake} 🎂
                    </NavLink>
                </div>

            </div>

            {/* Slider Section */}
            <HeroSlider locale={locale} />

            {/* Feature Strip Bottom */}
            <FeatureStrip locale={locale} />

        </section>
    );
}

// ─── HERO SLIDER COMPONENT ──────────────────────────────────────────────────
function HeroSlider({ locale }: { locale: string }) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const isEn = locale === 'en';
    const t = useI18n(locale);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const scrollAmount = window.innerWidth > 768 ? 800 : 300;
            // In RTL, left/right behavior is inverted for scrollBy
            const multiplier = isEn ? 1 : -1;
            scrollRef.current.scrollBy({
                left: direction === 'right' ? scrollAmount * multiplier : -scrollAmount * multiplier,
                behavior: 'smooth'
            });
        }
    };

    const slides = [
        {
            id: 1,
            image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
            title: t.common.newFrenchCollection,
            subtitle: 'WHISPERS FROM PARIS'
        },
        {
            id: 2,
            image: 'https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
            title: t.common.darkChocolateSelection,
            subtitle: 'DARK CHOCOLATE COLLECTION'
        },
        {
            id: 3,
            image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80',
            title: t.common.premiumOrientalSweets,
            subtitle: 'PREMIUM ORIENTAL SWEETS'
        }
    ];

    return (
        <div className="relative w-full max-w-[1800px] mx-auto pb-12 group">
            {/* Navigation Arrows */}
            <button
                onClick={() => scroll(isEn ? 'right' : 'left')}
                className={`absolute z-10 ${isEn ? 'right-4 md:right-10' : 'left-4 md:left-10'} top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 w-12 h-12 rounded-full flex items-center justify-center shadow-lg border border-gray-100 transition-all opacity-0 group-hover:opacity-100`}
                aria-label="Previous slide"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={isEn ? "" : "rotate-180"}>
                    <path d="M9 18l6-6-6-6" />
                </svg>
            </button>

            <button
                onClick={() => scroll(isEn ? 'left' : 'right')}
                className={`absolute z-10 ${isEn ? 'left-4 md:left-10' : 'right-4 md:right-10'} top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 w-12 h-12 rounded-full flex items-center justify-center shadow-lg border border-gray-100 transition-all opacity-0 group-hover:opacity-100`}
                aria-label="Next slide"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={isEn ? "" : "rotate-180"}>
                    <path d="M15 18l-6-6 6-6" />
                </svg>
            </button>

            {/* Scrollable track */}
            <div
                ref={scrollRef}
                className="flex gap-4 md:gap-6 px-4 md:px-16 overflow-x-auto snap-x snap-mandatory hide-scrollbars pb-8"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {slides.map((slide, index) => (
                    <div
                        key={slide.id}
                        className="snap-center shrink-0 w-[85vw] max-w-[1000px] aspect-[16/9] md:aspect-[21/9] rounded-3xl overflow-hidden relative shadow-xl"
                    >
                        {/* Background Image */}
                        <img
                            src={slide.image}
                            alt={slide.title}
                            className="w-full h-full object-cover"
                        />
                        {/* Overlay Gradient */}
                        <div className={`absolute inset-0 bg-gradient-to-${isEn ? 'r' : 'l'} from-black/80 via-black/40 to-transparent`}></div>

                        {/* Content overlay */}
                        <div className={`absolute inset-0 flex flex-col justify-center px-10 md:px-20 text-white ${isEn ? 'text-left' : 'text-right'}`}>
                            <div className="flex items-center gap-3 mb-2">
                                <img src="https://saadeddin.com/cdn/shop/files/LOGO1_b5cc5efb-bb01-4475-a0bc-cfc9d2f654b1_350x.png" className="h-10 brightness-0 invert" alt="logo" />
                                <div className="w-[1px] h-8 bg-white/50"></div>
                                <span className="font-en text-sm tracking-[0.2em]">{slide.subtitle}</span>
                            </div>
                            <h2 className="text-3xl md:text-5xl font-bold leading-tight drop-shadow-lg">
                                <span className="opacity-90">{slide.title.split(' ')[0]}</span><br />
                                {slide.title.split(' ').slice(1).join(' ')}
                            </h2>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── BOTTOM FEATURE STRIP ───────────────────────────────────────────────────
function FeatureStrip({ locale }: { locale: string }) {
    const isEn = locale === 'en';
    const t = useI18n(locale);
    const features = [
        { icon: '🚚', text: t.common.freeDelivery },
        { icon: '💳', text: t.common.installments },
        { icon: '⭐', text: t.common.pointsEarn },
        { icon: '🎁', text: t.common.freeGiftWrapping },
        { icon: '🔄', text: t.common.returns24h },
    ];

    return (
        <div className="w-full bg-white border-y border-gray-100 py-4 shadow-sm relative z-20">
            <div className="max-w-[1400px] mx-auto px-4">
                <div className={`flex flex-wrap items-center justify-center lg:justify-between gap-4 lg:gap-2 ${isEn ? 'flex-row' : 'flex-row-reverse'}`}>
                    {features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-[13px] md:text-sm font-bold text-gray-700">
                            <span className="text-base">{feature.icon}</span>
                            {feature.text}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

