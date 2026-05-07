import { useState, useRef, useCallback, useEffect } from 'react';
import { NavLink } from 'react-router';

const SLIDES = [
  { id: 1, image: '/hero/slide1.png', url: '/collections/all' },
  { id: 2, image: '/hero/slide2.png', url: '/collections/cakes' },
  { id: 3, image: '/hero/slide3.png', url: '/collections/chocolate' },
];

export function HeroSlider() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Update current index based on scroll position
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const scrollLeft = Math.abs(scrollRef.current.scrollLeft);
    const slideWidth = scrollRef.current.children[0].clientWidth;
    // Calculate which slide is closest to the center
    const newIndex = Math.round(scrollLeft / slideWidth);
    setCurrentIndex(newIndex);
  }, []);

  const scrollToSlide = (index: number) => {
    if (!scrollRef.current) return;
    const slide = scrollRef.current.children[index] as HTMLElement;
    if (slide) {
      // Scroll to the exact position of the slide
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
    <div className="w-full bg-[#FEF8EB] py-6 lg:py-10 relative group">
      
      {/* Scrollable Container */}
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory gap-4 lg:gap-6 px-4 lg:px-[12.5%] pb-8"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} // Hide scrollbar
      >
        {SLIDES.map((slide, index) => {
          const isActive = index === currentIndex;
          return (
            <div 
              key={slide.id}
              className="snap-center shrink-0 w-[85%] lg:w-[75%] transition-all duration-500 ease-out"
              style={{
                opacity: isActive ? 1 : 0.4,
                transform: isActive ? 'scale(1)' : 'scale(0.95)'
              }}
            >
              <NavLink to={slide.url} className="block w-full h-full">
                <div className="relative aspect-[21/9] lg:aspect-[24/9] rounded-[24px] lg:rounded-[40px] overflow-hidden shadow-xl">
                  <img 
                    src={slide.image} 
                    alt="" 
                    className="w-full h-full object-cover"
                  />
                  {/* Subtle overlay for inactive slides can be handled via parent opacity */}
                </div>
              </NavLink>
            </div>
          );
        })}
      </div>

      {/* Navigation Arrows (Hidden on mobile, appear on hover for desktop) */}
      <button 
        onClick={prevSlide}
        className="hidden lg:flex absolute start-8 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/80 hover:bg-white text-[#234745] rounded-full items-center justify-center shadow-lg transition-all z-10 hover:scale-110 active:scale-95 opacity-0 group-hover:opacity-100"
        aria-label="Previous slide"
      >
        {/* In LTR: points left (<). In RTL: points right (>) */}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="rtl:rotate-180">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
      
      <button 
        onClick={nextSlide}
        className="hidden lg:flex absolute end-8 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/80 hover:bg-white text-[#234745] rounded-full items-center justify-center shadow-lg transition-all z-10 hover:scale-110 active:scale-95 opacity-0 group-hover:opacity-100"
        aria-label="Next slide"
      >
        {/* In LTR: points right (>). In RTL: points left (<) */}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="rtl:rotate-180">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>

      {/* Indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex justify-center gap-2">
        {SLIDES.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollToSlide(index)}
            className={`h-1.5 rounded-full transition-all duration-300 ${index === currentIndex ? 'w-8 bg-[#234745]' : 'w-2 bg-[#234745]/30 hover:bg-[#234745]/50'}`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      <style>{`
        /* Hide scrollbar for Chrome, Safari and Opera */
        .flex::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}

