import React, { useState, useRef, useCallback, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router';
import { fixMojibake } from '~/lib/mojibake';
import { ComingSoonBadge } from '~/components/ComingSoonBadge';
import { useCakeBuilderEnabled, isCustomCakeUrl } from '~/lib/cake-builder';

type Bilingual = {ar: string; en: string};

type Slide = {
  id: string | number;
  /** Desktop image; also the phone image when `mobileImage` is empty. */
  image: string;
  /** Optional phone image (slides narrower than 640px, shaped 5:6). */
  mobileImage?: string;
  /** Describes a text-free banner for screen readers and search engines. */
  alt?: Bilingual;
  /** Where tapping the slide goes. Empty = the slide is not a link. */
  url?: string;
  title: Bilingual;
  subtitle: Bilingual;
  badge: Bilingual;
  buttons: Array<{text: Bilingual; url: string; type: string}>;
};

/** A slide link for the current language: /en prefix on English, none on Arabic. */
function resolveSlideUrl(url: string, isEn: boolean): string {
  if (!url) return isEn ? '/en' : '/';
  // A full link to this site (https://saadeddin.com/products/...) becomes a
  // path, so it stays in the app and gets the /en prefix on English.
  url = url.replace(/^https?:\/\/(www\.)?saadeddin\.com(?=\/|$)/i, '') || '/';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const path = url.startsWith('/') ? url : `/${url}`;
  if (isEn) return path.startsWith('/en') ? path : `/en${path}`;
  return path.startsWith('/en/') ? path.replace(/^\/en/, '') : path === '/en' ? '/' : path;
}

const DEFAULT_SLIDES: Slide[] = [
  {
    id: 1,
    image: '/hero/slide1.webp',
    url: '/pages/about',
    title: { ar: 'نصنع لحظات\nلا تنسي', en: 'We Make Unforgettable\nMoments' },
    subtitle: {
      ar: 'منذ عام 1919، نقدّم أرقى الحلويات العربية والشوكولاتة الفاخرة، لكل مناسبة تستحق الاحتفال.',
      en: 'Since 1919, we offer the finest Arabic sweets and premium chocolate for every occasion worth celebrating.'
    },
    badge: { ar: 'منذ 1919 . مصنوعة بحُب', en: 'Since 1919 . Made With Love' },
    buttons: [
      { text: { ar: 'إكتشف قصتنا', en: 'Discover Our Story' }, url: '/pages/about', type: 'filled' }
    ]
  },
  {
    id: 2,
    image: '/hero/slide2.webp',
    url: '/collections/eid',
    title: { ar: 'إحتفل بالعيد\nبأرقي الحلويات', en: 'Celebrate Eid\nWith Finest Sweets' },
    subtitle: {
      ar: 'تشكيلة العيد الحصرية — معمول وشوكولاتة وحلويات عربية فاخرة في أجمل صناديق الهدايا.',
      en: 'Exclusive Eid collection — Maamoul, chocolate, and premium Arabic sweets in the most beautiful gift boxes.'
    },
    badge: { ar: 'عيد مبارك', en: 'Eid Mubarak' },
    buttons: [
      { text: { ar: 'تسوق تشكيلة العيد', en: 'Shop Eid Collection' }, url: '/collections/eid', type: 'filled' }
    ]
  },
  {
    id: 3,
    image: '/hero/slide3.webp',
    url: '/custom-cake',
    title: { ar: 'صمم كيكتك\nكما تتخيلها', en: 'Design Your Cake\nAs You Imagine It' },
    subtitle: {
      ar: 'اختر الحجم والنكهة والتزيين — نصنع لك كيكة مخصصة تماماً بحرفية سعد الدين.',
      en: 'Choose the size, flavor, and decoration — we craft a perfectly customized cake with Saadeddin craftsmanship.'
    },
    badge: { ar: 'صمم كيكتك', en: 'Design Your Cake' },
    buttons: [
      { text: { ar: 'ابدأ التصميم', en: 'Start Designing' }, url: '/custom-cake', type: 'filled' }
    ]
  },
];

export function HeroSlider({ config }: { config?: any }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const isEn = location.pathname.startsWith('/en');
  const cakeBuilderOpen = useCakeBuilderEnabled();

  // Dynamic slides from Shopify Metaobject with fallback to DEFAULT_SLIDES
  const dynamicSlides = React.useMemo<Slide[]>(() => {
    const rawNodes = config?.heroSlides?.nodes || [];
    if (rawNodes.length === 0) return DEFAULT_SLIDES;

    const parsed = rawNodes
      .filter((node: any) => {
        /**
         * The store's hero_slide definition names this field `hide_slide`;
         * only `is_hidden` used to be checked, so a slide switched off in
         * Shopify (the Madrid one) kept showing. Both are honoured now.
         */
        const isHidden = node.fields?.find(
          (f: any) => f.key === 'hide_slide' || f.key === 'is_hidden' || f.key === 'hidden',
        )?.value;
        return isHidden !== 'true' && isHidden !== '1' && isHidden !== true;
      })
      .map((node: any, idx: number) => {
        const getVal = (...keys: string[]) => {
          for (const k of keys) {
            const match = String(node.fields?.find((f: any) => f.key === k)?.value ?? '').trim();
            // "." (or "-") is how the team blanked a field when blank still
            // showed default text; it means "no text", not a full stop.
            if (match && !/^[.\-–—_·]+$/.test(match)) return match;
          }
          return '';
        };
        const getImg = (...keys: string[]) => {
          for (const k of keys) {
            const url = node.fields?.find((f: any) => f.key === k)?.reference?.image?.url;
            if (url) return url;
          }
          return '';
        };

        /**
         * Shopify slides show exactly what was filled in -- nothing more.
         *
         * Every empty field used to be filled from DEFAULT_SLIDES, so a banner
         * whose artwork already carries its own text could not be shown
         * clean: leave the title empty and «نصنع لحظات لا تنسي» appeared over
         * it, and the badge pill showed even when blank (the client typed "."
         * to hide it). Now an empty field renders nothing, so a slide can be
         * image-only. A language left empty borrows the other language's text
         * (the old shared `title`-style keys behave the same way).
         *
         * Only the image keeps a fallback, so a slide is never blank.
         */
        const pair = (arKeys: string[], enKeys: string[]): Bilingual => {
          const ar = fixMojibake(getVal(...arKeys));
          const en = fixMojibake(getVal(...enKeys));
          return {ar: ar || en, en: en || ar};
        };

        const defaultFallback = DEFAULT_SLIDES[idx % DEFAULT_SLIDES.length];
        const imageUrl = getImg('image', 'bg_image', 'background_image', 'desktop_image') || defaultFallback.image;
        const mobileImageUrl = getImg('mobile_image', 'image_mobile', 'mobile_bg_image');
        const badge = pair(['badge_text_arabic', 'badge_ar', 'badge_text_ar', 'badge', 'tag', 'badge_text'], ['badge_text_english', 'badge_en', 'badge_text_en', 'badge', 'tag', 'badge_text']);
        const title = pair(['title_arabic', 'title_ar', 'title', 'heading_ar'], ['title_english', 'title_en', 'title', 'heading_en']);
        const subtitle = pair(['subtitle_arabic', 'subtitle_ar', 'subtitle', 'description_ar'], ['subtitle_english', 'subtitle_en', 'subtitle', 'description_en']);
        const btnText = pair(['button_text_arabic', 'button_text_ar', 'button_text', 'cta_text_ar'], ['button_text_english', 'button_text_en', 'button_text', 'cta_text_en']);
        const alt = pair(['alt_text_arabic', 'alt_text_ar', 'alt_text', 'image_alt'], ['alt_text_english', 'alt_text_en', 'alt_text', 'image_alt']);
        const btnLink = getVal('button_link', 'url', 'link', 'cta_link');
        const order = parseFloat(getVal('sort_order', 'position', 'order'));

        const slide: Slide & {order: number; createdIndex: number} = {
          order: Number.isFinite(order) ? order : Number.POSITIVE_INFINITY,
          createdIndex: idx,
          id: node.id || idx + 1,
          image: imageUrl,
          mobileImage: mobileImageUrl || undefined,
          alt,
          url: btnLink,
          title,
          subtitle,
          badge,
          buttons: btnText.ar || btnText.en
            ? [{text: btnText, url: btnLink, type: 'filled'}]
            : [],
        };
        return slide;
      })
      /**
       * The client's order: `sort_order` 1, 2, 3... on each banner. Banners
       * without a number follow, in the order they were created (Shopify's own
       * order, which the admin cannot rearrange).
       */
      .sort((a: any, b: any) => a.order - b.order || a.createdIndex - b.createdIndex);

    return parsed.length > 0 ? parsed : DEFAULT_SLIDES;
  }, [config]);

  const slides = dynamicSlides;
  const [currentIndex, setCurrentIndex] = useState(Math.floor(slides.length / 2));

  useEffect(() => {
    // Center the initial slide on load
    const timer = setTimeout(() => {
      scrollToSlide(Math.floor(slides.length / 2));
    }, 300);
    return () => clearTimeout(timer);
  }, [slides.length]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const firstChild = scrollRef.current.children[0] as HTMLElement | undefined;
    if (!firstChild) return;
    const scrollLeft = Math.abs(scrollRef.current.scrollLeft);
    const slideWidth = firstChild.clientWidth;
    if (!slideWidth) return;

    // We want the slide closest to the center of the container
    const newIndex = Math.round(scrollLeft / slideWidth);
    if (newIndex !== currentIndex && newIndex < slides.length) {
      setCurrentIndex(newIndex);
    }
  }, [currentIndex, slides.length]);

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

  const nextSlide = () => scrollToSlide(Math.min(currentIndex + 1, slides.length - 1));
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
        {slides.map((slide, index) => {
          const isActive = index === currentIndex;
          const badge = isEn ? slide.badge.en : slide.badge.ar;
          const title = isEn ? slide.title.en : slide.title.ar;
          const subtitle = isEn ? slide.subtitle.en : slide.subtitle.ar;
          const buttons = (slide.buttons || []).filter((btn) => (isEn ? btn.text.en : btn.text.ar));
          /**
           * A slide with no text at all is an artwork banner: its picture
           * carries the message. It gets no dark overlays (they exist only to
           * make white text readable), no hover zoom, and a fixed shape that
           * matches the artwork, so text inside the image is never cropped.
           */
          const hasText = Boolean(badge || title || subtitle || buttons.length);
          const slideHref = slide.url ? resolveSlideUrl(slide.url, isEn) : '';
          const altText = (isEn ? slide.alt?.en : slide.alt?.ar) || title || '';
          return (
            <div
              key={slide.id}
              className="snap-center shrink-0 w-[300px] sm:w-[560px] md:w-[720px] lg:w-[1024px] max-w-[90vw] transition-all duration-700 ease-out"
              style={{
                opacity: isActive ? 1 : 0.4,
                transform: isActive ? 'scale(1)' : 'scale(0.98)'
              }}
            >
              {/*
                A minimum height, not a fixed one, for slides with text.
                With the title free to run to its full length, a long headline
                on a narrow screen made the content taller than the slide. The
                content column is `justify-end`, so the overflow went out of
                the TOP -- the first line ran under the badge and was clipped
                by `overflow-hidden`.

                `min-h` lets a slide grow to fit what is in it. The track is a
                flex row with the default `align-items: stretch`, so every
                slide takes the height of the tallest and `h-full` makes each
                one fill it -- the carousel stays level, and the background
                image is absolutely positioned so it covers whatever height
                results.

                An artwork slide (no text) has nothing to grow for, so it takes
                the artwork's own shape instead: 5:6 on phones (the mobile
                image, 1080 x 1296) and 1024:610 from 640px up (the desktop
                image, 2048 x 1220). When every slide is artwork, nothing is
                cropped at any width. Mixed with text slides, `h-full` still
                levels the row, so a tablet-width slide may lose a sliver at
                the sides.
              */}
              <div className={`relative w-full h-full ${hasText ? 'min-h-[360px] sm:min-h-[430px] md:min-h-[510px] lg:min-h-[610px]' : 'aspect-[5/6] sm:aspect-[1024/610]'} rounded-[6px] sm:rounded-[12px] lg:rounded-[20px] overflow-hidden bg-[#f8f5f2] group/slide flex flex-col`}>

                {/*
                  1. Background image -- stays absolute.
                  Phones (under 640px, where the slide is 5:6) get the mobile
                  image when one is uploaded; otherwise, and on every larger
                  screen, the desktop image.
                */}
                <picture>
                  {slide.mobileImage ? (
                    <source media="(max-width: 639px)" srcSet={slide.mobileImage} />
                  ) : null}
                  <img
                    src={slide.image}
                    alt={altText}
                    className={`absolute inset-0 w-full h-full object-cover ${hasText ? 'transition-transform duration-1000 group-hover/slide:scale-105' : ''}`}
                  />
                </picture>

                {/*
                  2. The whole slide is a link when it has one.
                  It sits under the content layer, which lets clicks through
                  everywhere except the button, so the button keeps its own
                  link and there is never a link inside a link.
                */}
                {slideHref ? (
                  <NavLink
                    to={slideHref}
                    aria-label={altText || (isEn ? 'Open offer' : 'عرض التفاصيل')}
                    className="absolute inset-0 z-[15]"
                    prefetch="intent"
                  />
                ) : null}

                {/* 3. Overlays -- only to make text readable */}
                {hasText ? (
                  <>
                    <div className="absolute inset-0 bg-black/20 pointer-events-none z-10" />
                    <div className={`absolute inset-0 bg-gradient-to-r ${isEn ? 'from-black/70 via-black/20 to-transparent' : 'to-black/70 via-black/20 from-transparent'} pointer-events-none opacity-90 z-10`} />
                  </>
                ) : null}

                {/* 4. Top-center badge -- only when there is badge text */}
                {badge ? (
                  <div className="absolute top-4 sm:top-6 md:top-8 lg:top-10 left-1/2 -translate-x-1/2 z-30 flex justify-center w-full px-4 lg:px-10 pointer-events-none">
                    <div className="bg-[#234745] px-4 lg:px-8 py-1 lg:py-2 rounded-full shadow-2xl flex items-center gap-2 lg:gap-4">
                      <div className="w-4 lg:w-6 h-[1px] bg-[#BBCFCD]" />
                      <span className="text-[#BBCFCD] font-medium text-[12px] lg:text-[16px] tracking-wide whitespace-nowrap" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                        {badge}
                      </span>
                      <div className="w-4 lg:w-6 h-[1px] bg-[#BBCFCD]" />
                    </div>
                  </div>
                ) : null}

                {/* 5. Main content area -- clicks pass through to the slide link */}
                {title || subtitle || buttons.length ? (
                  <div
                    dir={isEn ? 'ltr' : 'rtl'}
                    className={`relative flex-1 min-h-0 flex flex-col justify-end md:justify-center p-6 pt-14 sm:p-8 sm:pt-16 md:p-10 md:pt-20 lg:p-16 lg:pt-28 text-white z-20 items-center md:items-start text-center md:text-start pointer-events-none`}
                  >
                    {/* English needs a wider column: 52px Latin text overflows the 533px Arabic column */}
                    <div className={`max-w-[95%] sm:max-w-full ${isEn ? 'md:max-w-[520px] lg:max-w-[700px]' : 'md:max-w-[420px] lg:max-w-[533px]'} flex flex-col items-center md:items-start w-full`}>

                      {/* Title */}
                      {title ? (
                        <h2
                          /*
                            No line-clamp. A headline that ends in an ellipsis is
                            a headline nobody finished reading -- the slide's whole
                            job is that sentence. The subtitle below still clamps
                            on small screens, which is what gives the title the
                            room to run to its full length inside a fixed-height
                            slide.
                          */
                          className={`font-bold lg:font-bold whitespace-pre-line mb-3 lg:mb-6 ${isEn ? 'text-[28px] sm:text-[32px] md:text-[36px] lg:text-[52px] leading-[1.1] lg:leading-[0.85]' : 'text-[32px] md:text-[44px] lg:text-[80px] leading-[1.3] lg:leading-[1.2]'}`}
                          style={{ fontFamily: "'Bahij Janna', sans-serif" }}
                        >
                          <span className="text-[#FFFFFF] drop-shadow-lg">{title}</span>
                        </h2>
                      ) : null}

                      {/* Subtitle */}
                      {subtitle ? (
                        <p
                          className={`font-normal leading-[1.6] lg:leading-[1.2] max-w-[280px] sm:max-w-[360px] lg:max-w-[400px] mt-0 mb-4 lg:mb-8 whitespace-pre-line line-clamp-4 md:line-clamp-none !text-[#FFFFFF] ${isEn ? 'text-[14px] lg:text-[16px]' : 'text-[12px] lg:text-[14px]'}`}
                          style={!isEn ? { fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" } : undefined}
                        >
                          {subtitle}
                        </p>
                      ) : null}

                      {/* Buttons */}
                      {buttons.length ? (
                        <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-[8px] w-full mt-2 lg:mt-6 shrink-0">
                          {buttons.map((btn, i) => {
                            const targetUrl = resolveSlideUrl(btn.url || '', isEn);
                            return (
                              <NavLink
                                key={i}
                                to={targetUrl}
                                /*
                                  A label longer than the button wraps rather than
                                  spilling out of it. `whitespace-nowrap` with a
                                  fixed `h-[48px]` gave the text no way to yield --
                                  "Shop Ice cream Collection" at 18px is wider than
                                  the column on a 360px screen, so it ran out past
                                  both edges of the pill.

                                  Wrapping is allowed below `sm`, where the button
                                  is full-width anyway; from `sm` up the 277px
                                  minimum is roomy enough that a single line reads
                                  better. `min-h` replaces `h` so two lines have
                                  somewhere to go.

                                  `pointer-events-auto`: the content layer lets
                                  clicks through to the slide link; the button
                                  takes its own back.
                                */
                                className={`pointer-events-auto flex items-center !no-underline justify-center text-center transition-all duration-300 hover:!bg-[#F9F9F9] transform w-full sm:w-auto sm:min-w-[277px] sm:whitespace-nowrap min-h-[48px] py-[12px] px-[20px] sm:px-[28px] rounded-[24px] text-[15px] sm:text-[18px] leading-tight ${btn.type === 'filled'
                                  ? 'bg-[#BBCFCD] text-[#234745]'
                                  : 'bg-transparent text-[#F9F9F9] border border-[#BBCFCD]'
                                  }`}
                                style={{
                                  // fontSize and lineHeight moved to classes above:
                                  // an inline value outranks every breakpoint, so
                                  // the button could never shrink on a small screen.
                                  fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                                  fontWeight: 700,
                                  color: btn.type === 'filled' ? '#234745' : '#F9F9F9'
                                }}
                              >
                                <span>{isEn ? btn.text.en : btn.text.ar}</span>
                                {!cakeBuilderOpen && isCustomCakeUrl(targetUrl) && (
                                  <ComingSoonBadge isEn={isEn} className="ms-2" />
                                )}
                              </NavLink>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        aria-label={isEn ? "Previous slide" : "الشريحة السابقة"}
        className={`absolute start-[max(4px,calc(50%-552px))] top-1/2 -translate-y-1/2 w-10 h-10 bg-[#9FB7AE] text-[#234745] rounded-[25px] flex items-center justify-center transition-all z-30 border border-[#9FB7AE] hover:scale-110 active:scale-95 shadow-md ${currentIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'opacity-100 hover:bg-white'}`}
        disabled={currentIndex === 0}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={isEn ? '' : 'rotate-180'}>
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <button
        onClick={nextSlide}
        aria-label={isEn ? "Next slide" : "الشريحة التالية"}
        className={`absolute end-[max(4px,calc(50%-552px))] top-1/2 -translate-y-1/2 w-10 h-10 bg-[#9FB7AE] text-[#234745] rounded-[25px] flex items-center justify-center transition-all z-30 border border-[#9FB7AE] hover:scale-110 active:scale-95 shadow-md ${currentIndex === slides.length - 1 ? 'opacity-30 cursor-not-allowed' : 'opacity-100 hover:bg-white'}`}
        disabled={currentIndex === slides.length - 1}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={isEn ? 'rotate-180' : ''}>
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      {/* Indicators */}
      <div className="absolute bottom-10 lg:bottom-14 left-1/2 -translate-x-1/2 flex justify-center gap-4 z-20">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollToSlide(index)}
            aria-label={isEn ? `Go to slide ${index + 1}` : `الذهاب إلى الشريحة ${index + 1}`}
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

