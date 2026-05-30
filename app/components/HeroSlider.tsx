import { useState, useRef, useCallback, useEffect } from 'react';
import { NavLink } from 'react-router';

const SLIDES = [
  { 
    id: 1, 
    image: '/hero/slide1.png', 
    url: '/collections/all',
    title: { ar: 'نصنع لحظات\nلا تنسي', en: 'We Make Unforgettable\nMoments' },
    subtitle: { 
        ar: 'منذ عام ١٩١٩، نقدّم أرقى الحلويات العربية والشوكولاتة الفاخرة، لكل مناسبة تستحق الاحتفال.', 
        en: 'Since 1919, we offer the finest Arabic sweets and premium chocolate for every occasion worth celebrating.' 
    },
    badge: { ar: 'منذ 1919 . مصنوعة بحُب', en: 'Since 1919 . Made With Love' },
    buttons: [
      { text: { ar: 'إكتشف قصتنا', en: 'Discover Our Story' }, url: '/pages/about', type: 'outline' },
      { text: { ar: 'العنوان', en: 'Address' }, url: '/pages/contact', type: 'filled' }
    ]
  },
  { 
    id: 2, 
    image: '/hero/slide2.png', 
    url: '/custom-cake',
    title: { ar: 'إحتفل بالعيد\nبأرقي الحلويات', en: 'Celebrate Eid\nWith Finest Sweets' },
    subtitle: { 
        ar: 'تشكيلة العيد الحصرية — معمول وشوكولاتة وحلويات عربية فاخرة في أجمل صناديق الهدايا.', 
        en: 'Exclusive Eid collection — Maamoul, chocolate, and premium Arabic sweets in the most beautiful gift boxes.' 
    },
    badge: { ar: 'عيد مبارك', en: 'Eid Mubarak' },
    buttons: [
      { text: { ar: 'العنوان', en: 'Address' }, url: '/collections/eid', type: 'filled' }
    ]
  },
  { 
    id: 3, 
    image: '/hero/slide3.png', 
    url: '/custom-cake',
    title: { ar: 'صمم كيكتك\nكما تتخيلها', en: 'Design Your Cake\nAs You Imagine It' },
    subtitle: { 
        ar: 'اختر الحجم والنكهة والتزيين — نصنع لك كيكة مخصصة تماماً بحرفية سعد الدين.', 
        en: 'Choose the size, flavor, and decoration — we craft a perfectly customized cake with Saadeddin craftsmanship.' 
    },
    badge: { ar: 'صمم كيكتك', en: 'Design Your Cake' },
    buttons: [
      { text: { ar: 'العنوان', en: 'Address' }, url: '/custom-cake', type: 'filled' }
    ]
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
        className="flex overflow-x-auto snap-x snap-mandatory gap-5 lg:gap-8 px-[max(20px,calc(50%-512px))] pb-10"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {SLIDES.map((slide, index) => {
          const isActive = index === currentIndex;
          return (
            <div 
              key={slide.id}
              className="snap-center shrink-0 w-[300px] lg:w-[1024px] max-w-[90vw] transition-all duration-700 ease-out"
              style={{
                opacity: isActive ? 1 : 0.4,
                transform: isActive ? 'scale(1)' : 'scale(0.98)'
              }}
            >
              <div className="relative w-full h-[448px] lg:h-[610px] rounded-[6px] lg:rounded-[20px] overflow-hidden bg-[#f8f5f2] group/slide flex flex-col">
                {/* 1. Background Image - Stays Absolute */}
                <img 
                  src={slide.image} 
                  alt="" 
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover/slide:scale-105"
                />

                {/* 2. Overlays */}
                <div className="absolute inset-0 bg-black/20 pointer-events-none z-10" />
                <div className={`absolute inset-0 bg-gradient-to-r ${isEn ? 'from-black/70 via-black/20 to-transparent' : 'to-black/70 via-black/20 from-transparent'} pointer-events-none opacity-90 z-10`} />

                {/* 3. Top-Center Badge */}
                <div className="absolute top-4 lg:top-10 left-1/2 -translate-x-1/2 z-30 flex justify-center w-full px-4 lg:px-10">
                    <div className="bg-[#234745] px-4 lg:px-8 py-1 lg:py-2 rounded-full border border-[#BBCFCD] shadow-2xl flex items-center gap-2 lg:gap-4">
                        <div className="w-4 lg:w-6 h-[1px] bg-[#BBCFCD]" />
                        <span className="text-[#BBCFCD] font-medium text-[12px] lg:text-[16px] tracking-wide whitespace-nowrap" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                            {isEn ? slide.badge.en : slide.badge.ar}
                        </span>
                        <div className="w-4 lg:w-6 h-[1px] bg-[#BBCFCD]" />
                    </div>
                </div>

                {/* 4. Main Content Area */}
                <div 
                    dir={isEn ? 'ltr' : 'rtl'}
                    className={`relative flex-1 flex flex-col justify-end lg:justify-center p-6 lg:p-16 text-white z-20 items-center lg:items-start text-center lg:text-start`}
                >
                    <div className="max-w-[95%] lg:max-w-[533px] flex flex-col items-center lg:items-start w-full">
                        
                        {/* Title */}
                        <h2 
                            className="text-[38px] lg:text-[100px] font-bold lg:font-normal leading-[1.0] lg:leading-[0.95] whitespace-pre-line mb-4 lg:mb-8"
                            style={{ fontFamily: "'Bahij Janna', sans-serif" }}
                        >
                            <span className="text-[#FFFFFF] drop-shadow-lg">{isEn ? slide.title.en : slide.title.ar}</span>
                        </h2>

                        {/* Subtitle */}
                        <p 
                            className="text-[12px] lg:text-[14px] font-normal leading-[1.2] max-w-[249px] lg:max-w-[293px] mt-0 mb-4 lg:mb-8 whitespace-pre-line text-[#FFFFFF] lg:text-[#BBCFCD]"
                            style={{ fontFamily: "'GE Dinar One', sans-serif" }}
                        >
                            {isEn ? slide.subtitle.en : slide.subtitle.ar}
                        </p>

                        {/* Buttons */}
                        <div className="flex flex-col lg:flex-row items-center gap-[8px] w-full mt-4 lg:mt-6">
                            {slide.buttons?.map((btn, i) => (
                                <NavLink 
                                    key={i}
                                    to={btn.url}
                                    className={`flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 w-full lg:w-[277px] h-[48px] py-[12px] px-[20px] rounded-[24px] ${
                                        btn.type === 'filled' 
                                        ? 'bg-[#BBCFCD] text-[#234745]' 
                                        : 'bg-transparent text-[#F9F9F9] border border-[#BBCFCD]'
                                    }`}
                                    style={{ 
                                        fontFamily: "'GE Dinar One', sans-serif",
                                        fontWeight: 700,
                                        fontSize: '18px',
                                        lineHeight: '100%',
                                        textAlign: 'center',
                                        color: btn.type === 'filled' ? '#234745' : '#F9F9F9'
                                    }}
                                >
                                    <span>{isEn ? btn.text.en : btn.text.ar}</span>
                                </NavLink>
                            ))}
                        </div>
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
        className={`absolute start-[max(4px,calc(50%-552px))] top-1/2 -translate-y-1/2 w-10 h-10 bg-[#9FB7AE] text-[#234745] rounded-[25px] flex items-center justify-center transition-all z-50 border border-[#9FB7AE] hover:scale-110 active:scale-95 shadow-md ${currentIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'opacity-100 hover:bg-white'}`}
        disabled={currentIndex === 0}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={isEn ? '' : 'rotate-180'}>
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      
      <button 
        onClick={nextSlide}
        className={`absolute end-[max(4px,calc(50%-552px))] top-1/2 -translate-y-1/2 w-10 h-10 bg-[#9FB7AE] text-[#234745] rounded-[25px] flex items-center justify-center transition-all z-50 border border-[#9FB7AE] hover:scale-110 active:scale-95 shadow-md ${currentIndex === SLIDES.length - 1 ? 'opacity-30 cursor-not-allowed' : 'opacity-100 hover:bg-white'}`}
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

