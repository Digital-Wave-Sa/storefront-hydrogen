import { useState, useRef, useCallback, useEffect } from 'react';
import { NavLink } from 'react-router';

const SLIDES = [
  { 
    id: 1, 
    image: '/hero/slide1.png', 
    url: '/collections/all',
    title: { ar: 'احتفل بالعيد\nبأرقى الحلويات', en: 'Celebrate Eid\nwith finest sweets' },
    subtitle: { 
        ar: 'تشكيلة العيد الحصرية — معمول وشوكولاتة وحلويات\nعربية فاخرة في أجمل صناديق الهدايا.', 
        en: 'Exclusive Eid Collection — Maamoul, Chocolate & Premium\nArabic Sweets in elegant gift boxes.' 
    },
    badge: { ar: 'عيد مبارك', en: 'Eid Mubarak' }
  },
  { 
    id: 2, 
    image: '/hero/slide2.png', 
    url: '/pages/design-cake',
    title: { ar: 'صمم كيكتك\nكما تحب', en: 'Design Your Cake\nAs You Like' },
    subtitle: { 
        ar: 'اختر الحجم والنكهة والتزيين — نحن نصنعها لك\nتماماً كما في مخيلتك وبحرفية سعد الدين.', 
        en: 'Choose size, flavor & decoration — we make it for you\nexactly as imagined with Saadeddin craftsmanship.' 
    },
    badge: { ar: 'صمم كيكتك', en: 'Design Now' }
  },
  { 
    id: 3, 
    image: '/hero/slide3.png', 
    url: '/collections/chocolate',
    title: { ar: 'شوكولاتة فاخرة\nلكل مناسبة', en: 'Premium Chocolate\nFor Every Occasion' },
    subtitle: { 
        ar: 'اكتشف مجموعتنا الواسعة من الشوكولاتة البلجيكية\nوالسويسرية الفاخرة المحضرة بكل حب.', 
        en: 'Discover our wide range of Belgian & Swiss\npremium chocolates prepared with love.' 
    },
    badge: { ar: 'مجموعة فاخرة', en: 'Luxury Collection' }
  },
];

export function HeroSlider() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(Math.floor(SLIDES.length / 2));
  const [isEn, setIsEn] = useState(false);

  useEffect(() => {
    // Detect locale from URL or window
    setIsEn(window.location.pathname.includes('/en'));
    
    // Center the initial slide on load
    const timer = setTimeout(() => {
      scrollToSlide(Math.floor(SLIDES.length / 2));
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const scrollLeft = Math.abs(scrollRef.current.scrollLeft);
    const containerWidth = scrollRef.current.clientWidth;
    const slideWidth = scrollRef.current.children[0].clientWidth;
    
    // We want the slide closest to the center of the container
    const newIndex = Math.round(scrollLeft / slideWidth);
    if (newIndex !== currentIndex && newIndex < SLIDES.length) {
      setCurrentIndex(newIndex);
    }
  }, [currentIndex]);

  const scrollToSlide = (index: number) => {
    if (!scrollRef.current) return;
    const slide = scrollRef.current.children[index] as HTMLElement;
    if (slide) {
      const scrollPosition = slide.offsetLeft - (scrollRef.current.clientWidth - slide.clientWidth) / 2;
      scrollRef.current.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
      });
    }
  };

  const nextSlide = () => scrollToSlide(Math.min(currentIndex + 1, SLIDES.length - 1));
  const prevSlide = () => scrollToSlide(Math.max(currentIndex - 1, 0));

  return (
    <div className="w-full bg-[#FEF8EB] py-8 lg:py-14 relative group overflow-hidden">
      
      {/* Scrollable Container */}
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory gap-5 lg:gap-8 px-6 lg:px-[15%] pb-10"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {SLIDES.map((slide, index) => {
          const isActive = index === currentIndex;
          return (
            <div 
              key={slide.id}
              className="snap-center shrink-0 w-[88%] lg:w-[88%] transition-all duration-700 ease-out"
              style={{
                opacity: isActive ? 1 : 0.4,
                transform: isActive ? 'scale(1)' : 'scale(0.98)'
              }}
            >
              <div className="relative w-full min-h-[450px] lg:min-h-[580px] h-auto rounded-[32px] lg:rounded-[48px] overflow-hidden bg-[#f8f5f2] group/slide flex flex-col">
                {/* 1. Background Image - Stays Absolute */}
                <img 
                  src={slide.image} 
                  alt="" 
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover/slide:scale-105"
                />

                {/* 2. Overlays */}
                <div className="absolute inset-0 bg-black/20 pointer-events-none z-10" />
                <div className={`absolute inset-0 bg-gradient-to-r ${isEn ? 'from-black/70 via-black/20 to-transparent' : 'to-black/70 via-black/20 from-transparent'} pointer-events-none opacity-90 z-10`} />

                {/* 3. Top-Center Badge (Heritage) - LINES MOVED INSIDE */}
                <div className="absolute top-6 lg:top-10 left-1/2 -translate-x-1/2 z-30 flex justify-center w-full px-10">
                    <div className="bg-[#1a3533] px-6 lg:px-10 py-2.5 rounded-full border border-white/10 shadow-2xl flex items-center gap-4 lg:gap-6">
                        <div className="w-6 lg:w-10 h-[1px] bg-white/40" />
                        <span className="text-white font-bold text-[clamp(9px,0.8vw,14px)] tracking-[0.05em] lg:tracking-[0.1em] whitespace-nowrap" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                            {isEn ? 'SINCE 1919 . MADE WITH LOVE' : 'منذ ١٩١٩ . مصنوعة بحب'}
                        </span>
                        <div className="w-6 lg:w-10 h-[1px] bg-white/40" />
                    </div>
                </div>

                {/* 4. Main Content Area - CENTERED VERTICALLY */}
                <div 
                    dir={isEn ? 'ltr' : 'rtl'}
                    className={`relative flex-1 flex flex-col justify-center p-10 lg:p-16 text-white z-20 items-start ${isEn ? 'text-left' : 'text-right'}`}
                >
                    <div className="max-w-[95%] lg:max-w-[65%] flex flex-col items-start w-full">
                        
                        {/* Collection Eyebrow - REMOVED MARGIN BOTTOM */}
                        <div className="flex items-center gap-2 lg:gap-4 mb-1 lg:mb-1">
                            <span className="text-[clamp(11px,1vw,16px)] font-bold text-white/90 drop-shadow-md" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                                {isEn ? slide.badge.en : slide.badge.ar}
                            </span>
                            <div className="h-[1px] w-12 lg:w-20 bg-white/40" />
                        </div>

                        {/* Title */}
                        <h2 
                            className="text-[clamp(28px,4.5vw,75px)] font-black leading-[1.0] whitespace-pre-line drop-shadow-2xl"
                            style={{ fontFamily: "'Bahij Janna', sans-serif" }}
                        >
                            {index === 0 && !isEn ? (
                                <>
                                    <span className="text-white">احتفل بالعيد</span>
                                    <br />
                                    <span className="text-[#D0E4E2]">بأرقى الحلويات</span>
                                </>
                            ) : (
                                <span className="text-white">{isEn ? slide.title.en : slide.title.ar}</span>
                            )}
                        </h2>

                        {/* Subtitle - REDUCED LINE HEIGHT & ZERO MARGIN */}
                        <p 
                            className="text-[clamp(13px,1.1vw,18px)] font-normal leading-[1.2] max-w-[600px] mt-0 lg:mt-0 whitespace-pre-line drop-shadow-lg opacity-95"
                            style={{ fontFamily: "'GE Dinar One', sans-serif" }}
                        >
                            {isEn ? slide.subtitle.en : slide.subtitle.ar}
                        </p>

                        {/* Button - REDUCED MARGIN */}
                        <NavLink 
                            to={slide.url}
                            className="mt-6 lg:mt-8 bg-[#BBCFCD] hover:bg-white rounded-full flex items-center justify-center transition-all transform hover:scale-105 active:scale-95"
                            style={{ 
                                width: 'clamp(200px, 16vw, 277px)', 
                                height: 'clamp(44px, 3.8vw, 52px)', 
                                fontFamily: "'GE Dinar One', sans-serif",
                                fontWeight: 700,
                                fontSize: 'clamp(15px, 1.1vw, 18px)',
                                lineHeight: '100%',
                                color: '#234745'
                            }}
                        >
                            <span>{isEn ? 'Shop Now' : 'تسوق الآن'}</span>
                        </NavLink>
                    </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Arrows */}
      <button 
        onClick={prevSlide}
        className={`absolute start-8 lg:start-16 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#9FB7AE] text-[#234745] rounded-[25px] flex items-center justify-center transition-all z-50 border border-[#9FB7AE] hover:scale-110 active:scale-95 shadow-md ${currentIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'opacity-100 hover:bg-white'}`}
        disabled={currentIndex === 0}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={isEn ? '' : 'rotate-180'}>
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      
      <button 
        onClick={nextSlide}
        className={`absolute end-8 lg:end-16 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#9FB7AE] text-[#234745] rounded-[25px] flex items-center justify-center transition-all z-50 border border-[#9FB7AE] hover:scale-110 active:scale-95 shadow-md ${currentIndex === SLIDES.length - 1 ? 'opacity-30 cursor-not-allowed' : 'opacity-100 hover:bg-white'}`}
        disabled={currentIndex === SLIDES.length - 1}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={isEn ? 'rotate-180' : ''}>
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      {/* Indicators */}
      <div className="absolute bottom-10 lg:bottom-14 left-1/2 -translate-x-1/2 flex justify-center gap-4 z-20">
        {SLIDES.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollToSlide(index)}
            className={`h-1.5 rounded-full transition-all duration-500 ${index === currentIndex ? 'w-10 bg-[#234745]' : 'w-3 bg-[#234745]/20 hover:bg-[#234745]/40'}`}
          />
        ))}
      </div>

      <style>{`
        .flex::-webkit-scrollbar { display: none; }
        @keyframes fade-in {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-content {
            animation: fade-in 1s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

