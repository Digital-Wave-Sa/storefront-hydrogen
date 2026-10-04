import { Link, useOutletContext } from 'react-router';
import { useState, useRef, useEffect } from 'react';

type Review = {
    id: string;
    text: string;
    name: string;
    subtitle: string;
    avatar: string | null;
    cardImage: string;
};

const AVATAR_COLORS = [
    { bg: '#BBCFCD', fg: '#234745' },
    { bg: '#EED5D7', fg: '#906B51' },
    { bg: '#FEF8EB', fg: '#255441' },
    { bg: '#E64950', fg: '#FFFFFF' },
];

const field = (node: any, key: string) =>
    node?.fields?.find((f: any) => f.key === key);

const text = (node: any, key: string): string =>
    (field(node, key)?.value ?? '').trim();

function initials(name: string) {
    const parts = name.split(/\s+/).filter(Boolean);
    return parts.slice(0, 2).map((p) => p.charAt(0)).join('');
}

/**
 * «آراء عملائنا» on the home page. Everything comes from Shopify:
 *   - homepage_reviews_section (one entry): titles + «Hide Section»
 *   - homepage_review (one entry per card): name, review, photo, order, «Hide Review»
 * No visible entries → a «شاركنا رأيك» card linking to the contact page. There is no
 * built-in fallback list on purpose: only real reviews may appear here.
 */
export function CustomerReviews({ config }: { config?: any }) {
    const { locale = 'ar' } = useOutletContext<{ locale?: string }>() ?? {};
    const isEn = locale === 'en';

    const section = config?.reviewsSection?.nodes?.[0];
    if (text(section, 'is_hidden') === 'true') return null;

    const reviews: Review[] = (config?.homepageReviews?.nodes ?? [])
        .filter((node: any) => text(node, 'is_hidden') !== 'true')
        .map((node: any) => {
            const nameAr = text(node, 'customer_name_ar');
            const textAr = text(node, 'review_text_ar');
            const sort = Number(text(node, 'sort_order'));
            return {
                id: node.id as string,
                sort: Number.isFinite(sort) && text(node, 'sort_order') !== '' ? sort : Number.MAX_SAFE_INTEGER,
                name: (isEn && text(node, 'customer_name_en')) || nameAr,
                text: (isEn && text(node, 'review_text_en')) || textAr,
                subtitle: (isEn ? text(node, 'subtitle_en') : text(node, 'subtitle_ar')) || '',
                avatar: field(node, 'avatar_image')?.reference?.image?.url ?? null,
                cardImage: field(node, 'card_image')?.reference?.image?.url ?? '/images/review_placeholder.webp',
            };
        })
        .filter((r: Review) => r.name && r.text)
        .sort((a: any, b: any) => a.sort - b.sort);

    const title = (isEn ? text(section, 'title_en') : text(section, 'title_ar')) || (isEn ? 'Customer Reviews' : 'آراء عملائنا');
    const subtitle = (isEn ? text(section, 'subtitle_en') : text(section, 'subtitle_ar')) || '';

    // No visible reviews yet → keep the section, invite customers to share theirs.
    if (reviews.length === 0) return <ReviewsInvite title={title} isEn={isEn} />;

    return <ReviewsCarousel reviews={reviews} title={title} subtitle={subtitle} isEn={isEn} />;
}

function ReviewsInvite({ title, isEn }: { title: string; isEn: boolean }) {
    return (
        <section
            className={`w-full bg-[#FFFFFF] flex justify-center px-4 ${isEn ? 'font-en' : 'font-ar'}`}
            dir={isEn ? 'ltr' : 'rtl'}
            style={{ paddingTop: '50px', paddingBottom: '50px' }}
        >
            <div className="w-full max-w-[1280px] flex flex-col items-center">
                <h2 className="text-[48px] lg:text-[50px] font-bold text-[#1a1a1a] !mb-10 leading-none tracking-tighter text-center" style={!isEn ? { fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" } : undefined}>
                    {title}
                </h2>
                <div className="w-full max-w-[560px] border border-[#BBCFCD] rounded-[12px] bg-[#FEF8EB] px-6 py-8 flex flex-col items-center gap-4 text-center">
                    <p className="font-dinar font-bold text-[22px] leading-[28px] text-[#234745] m-0">
                        {isEn ? 'Share your experience' : 'شاركنا رأيك'}
                    </p>
                    <p className="font-dinar font-medium text-[16px] leading-[24px] text-[#171717] m-0 max-w-[420px]">
                        {isEn
                            ? 'Tried something from Saadeddin? Tell us about it — your review could be the first one here.'
                            : 'جرّبت من حلويات سعد الدين؟ أخبرنا عن تجربتك، وقد يكون رأيك أول ما يظهر هنا.'}
                    </p>
                    <Link
                        to={isEn ? '/en/pages/contact' : '/pages/contact'}
                        prefetch="intent"
                        className="inline-flex items-center justify-center h-[44px] px-6 rounded-full bg-[#234745] !text-white hover:!text-white no-underline font-dinar font-bold text-[16px] hover:bg-[#255441] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#234745]"
                    >
                        {isEn ? 'Write your review' : 'اكتب رأيك'}
                    </Link>
                </div>
            </div>
        </section>
    );
}

function ReviewsCarousel({ reviews, title, subtitle, isEn }: { reviews: Review[]; title: string; subtitle: string; isEn: boolean }) {
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
    const isClickScrolling = useRef(false);
    const scrollTimeout = useRef<ReturnType<typeof setTimeout>>();

    // Replace IntersectionObserver with a robust center-calculation onScroll
    const handleScroll = () => {
        if (isClickScrolling.current) return; // Prevent overwriting activeIndex while smooth scrolling

        if (!scrollContainerRef.current) return;
        const container = scrollContainerRef.current;
        const containerRect = container.getBoundingClientRect();
        const containerCenter = containerRect.left + (containerRect.width / 2);

        let closestIdx = activeIndex;
        let minDistance = Infinity;

        cardRefs.current.forEach((card, idx) => {
            if (!card) return;
            const cardRect = card.getBoundingClientRect();
            const cardCenter = cardRect.left + (cardRect.width / 2);
            const distance = Math.abs(cardCenter - containerCenter);
            if (distance < minDistance) {
                minDistance = distance;
                closestIdx = idx;
            }
        });

        if (closestIdx !== activeIndex) {
            setActiveIndex(closestIdx);
        }
    };

    const scrollTo = (index: number) => {
        const container = scrollContainerRef.current;
        const target = cardRefs.current[index];
        if (container && target) {
            // Instantly update the visual dot
            isClickScrolling.current = true;
            setActiveIndex(index);

            // Mathematically calculate scroll offset to perfectly center the card in RTL or LTR
            const containerRect = container.getBoundingClientRect();
            const targetRect = target.getBoundingClientRect();

            const containerCenter = containerRect.left + (containerRect.width / 2);
            const targetCenter = targetRect.left + (targetRect.width / 2);
            const offset = targetCenter - containerCenter;

            container.scrollBy({
                left: offset,
                behavior: 'smooth'
            });

            // Unlock scroll listener after smooth scroll finishes
            if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
            scrollTimeout.current = setTimeout(() => {
                isClickScrolling.current = false;
            }, 600);
        }
    };

    // Auto-slide functionality
    useEffect(() => {
        if (reviews.length < 2) return;
        if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
        const interval = setInterval(() => {
            const nextIndex = (activeIndex + 1) % reviews.length;
            scrollTo(nextIndex);
        }, 3000); // Auto-slide every 3 seconds

        return () => clearInterval(interval);
    }, [activeIndex, reviews.length]);

    return (
        <section
            className={`w-full bg-[#FFFFFF] lg:py-[64px] lg:pb-[48px] flex justify-center ${isEn ? 'font-en' : 'font-ar'}`}
            dir={isEn ? 'ltr' : 'rtl'}
            style={{ paddingTop: '50px', paddingBottom: '50px' }}
        >
            <div className="w-full max-w-[1280px] flex flex-col items-center">

                {/* Header */}
                <div className="text-center mb-10 flex flex-col items-center">
                    <h2 className="text-[48px] lg:text-[50px] font-bold text-[#1a1a1a] !mb-2 leading-none tracking-tighter" style={!isEn ? { fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" } : undefined}>
                        {title}
                    </h2>
                    {subtitle ? (
                        <p className="text-[#7D7D7D] font-dinar font-medium text-[16px] leading-[20px] text-center" style={{ fontFamily: '"GE Dinar One", sans-serif' }}>
                            {subtitle}
                        </p>
                    ) : null}
                </div>

                {/* Cards Container */}
                <div
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="w-full overflow-x-auto pb-4 hide-scrollbars snap-x snap-mandatory"
                >
                    <div className="flex flex-row md:justify-center items-center gap-[16px] md:gap-[40px] px-4 w-max min-w-full">
                        {reviews.map((review, idx) => (
                            <div
                                key={review.id}
                                ref={el => cardRefs.current[idx] = el}
                                data-index={idx}
                                className="snap-center w-[280px] h-[396px] border border-[#BBCFCD] rounded-[12px] flex flex-col items-start pb-[8px] gap-[12px] bg-white box-border shrink-0 overflow-hidden"
                            >
                                {/* Top Image */}
                                <div className="w-[280px] h-[212px] shrink-0 bg-[#F9F9F9]">
                                    <img
                                        src={review.cardImage}
                                        alt=""
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                </div>

                                {/* Review Text */}
                                <div className="flex flex-row justify-center items-center px-[8px] gap-[8px] w-[280px] h-[88px] shrink-0">
                                    <p className="w-[264px] text-[#171717] font-dinar font-medium text-[16px] leading-[22px] text-start line-clamp-4 m-0">
                                        {review.text}
                                    </p>
                                </div>

                                {/* User Info */}
                                <div className="flex flex-row justify-center items-center p-[8px] gap-[8px] w-[280px] h-[64px] shrink-0">
                                    {review.avatar ? (
                                        <div className="w-[48px] h-[48px] rounded-full overflow-hidden shrink-0 bg-gray-100">
                                            <img
                                                src={review.avatar}
                                                alt=""
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                            />
                                        </div>
                                    ) : (
                                        <div
                                            aria-hidden="true"
                                            className="w-[48px] h-[48px] rounded-full shrink-0 flex items-center justify-center font-dinar font-bold text-[18px]"
                                            style={{ background: AVATAR_COLORS[idx % AVATAR_COLORS.length].bg, color: AVATAR_COLORS[idx % AVATAR_COLORS.length].fg }}
                                        >
                                            {initials(review.name)}
                                        </div>
                                    )}
                                    <div className="flex flex-col items-start gap-[8px] w-[208px] h-[48px] justify-center overflow-hidden">
                                        <p className="text-[#171717] font-dinar font-bold text-[16px] leading-[20px] text-start truncate w-full m-0">
                                            {review.name}
                                        </p>
                                        {review.subtitle ? (
                                            <p className="text-[#7D7D7D] font-dinar font-medium text-[14px] leading-none text-start truncate w-full m-0">
                                                {review.subtitle}
                                            </p>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Carousel Indicators */}
                <div className="flex items-center justify-center mt-[16px]">
                    {reviews.map((_, idx) => {
                        const isActive = activeIndex === idx;

                        return (
                            <div
                                key={idx}
                                className="px-[4px] py-[12px]"
                            >
                                <span className={`block h-[4px] rounded-[4px] transition-all duration-300 ${isActive ? 'w-[40px] bg-[#234745]' : 'w-[23px] bg-[#BBCFCD] opacity-50'
                                    }`} />
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
