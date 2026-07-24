import { Link, useOutletContext } from 'react-router';
import { useRef, useState, useEffect } from 'react';

const recipientsEn = [
    { name: 'Mother', handle: 'gifts-for-mother', image: 'https://images.unsplash.com/photo-1596464522432-843818e6c79a?q=80&w=800&auto=format&fit=crop' },
    { name: 'Father', handle: 'gifts-for-father', image: 'https://images.unsplash.com/photo-1620052581693-559d7d4f1345?q=80&w=800&auto=format&fit=crop' },
    { name: 'Friends', handle: 'gifts-for-friends', image: 'https://images.unsplash.com/photo-1529156069898-49953eb1b5ae?q=80&w=800&auto=format&fit=crop' },
    { name: 'Colleagues', handle: 'gifts-for-colleagues', image: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?q=80&w=800&auto=format&fit=crop' },
    { name: 'Children', handle: 'gifts-for-children', image: 'https://images.unsplash.com/photo-1510439401736-22463e26f59c?q=80&w=800&auto=format&fit=crop' },
];

const recipientsAr = [
    { name: 'الأم', handle: 'gifts-for-mother', image: 'https://images.unsplash.com/photo-1596464522432-843818e6c79a?q=80&w=800&auto=format&fit=crop' },
    { name: 'الأب', handle: 'gifts-for-father', image: 'https://images.unsplash.com/photo-1620052581693-559d7d4f1345?q=80&w=800&auto=format&fit=crop' },
    { name: 'الأصدقاء', handle: 'gifts-for-friends', image: 'https://images.unsplash.com/photo-1529156069898-49953eb1b5ae?q=80&w=800&auto=format&fit=crop' },
    { name: 'الزملاء', handle: 'gifts-for-colleagues', image: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?q=80&w=800&auto=format&fit=crop' },
    { name: 'الأطفال', handle: 'gifts-for-children', image: 'https://images.unsplash.com/photo-1510439401736-22463e26f59c?q=80&w=800&auto=format&fit=crop' },
];

export function WhoAreYouGifting({ collections }: { collections?: any[] }) {
    const { locale } = useOutletContext<{ locale: string }>();
    const isEn = locale === 'en';

    const containerRef = useRef<HTMLDivElement>(null);
    const scrollbarTrackRef = useRef<HTMLDivElement>(null);
    const [scrollProgress, setScrollProgress] = useState(0);
    const [thumbWidth, setThumbWidth] = useState(30);
    const [showScrollbar, setShowScrollbar] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const isDraggingScrollbar = useRef(false);
    const scrollbarStartX = useRef(0);
    const scrollbarStartScrollLeft = useRef(0);

    const handleScroll = () => {
        if (!containerRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
        const maxScroll = scrollWidth - clientWidth;
        if (maxScroll <= 0) {
            setShowScrollbar(false);
            return;
        }
        setShowScrollbar(true);
        const ratio = clientWidth / scrollWidth;
        setThumbWidth(Math.max(15, ratio * 100)); // minimum thumb size of 15%

        // Normalize scrollLeft for RTL/LTR
        const progress = (Math.abs(scrollLeft) / maxScroll) * 100;
        setScrollProgress(Math.min(100, Math.max(0, progress)));
    };

    const handleScrollbarMouseMove = (e: MouseEvent) => {
        if (!isDraggingScrollbar.current || !containerRef.current || !scrollbarTrackRef.current) return;

        const deltaX = e.clientX - scrollbarStartX.current;
        const trackWidth = scrollbarTrackRef.current.clientWidth;
        const { scrollWidth, clientWidth } = containerRef.current;
        const maxScroll = scrollWidth - clientWidth;

        if (maxScroll <= 0) return;

        const thumbPxWidth = (thumbWidth / 100) * trackWidth;
        const draggablePathWidth = trackWidth - thumbPxWidth;
        if (draggablePathWidth <= 0) return;

        const scrollRatio = maxScroll / draggablePathWidth;
        const scrollDelta = deltaX * scrollRatio;
        containerRef.current.scrollLeft = scrollbarStartScrollLeft.current + scrollDelta;
    };

    const handleScrollbarMouseUp = () => {
        isDraggingScrollbar.current = false;
        setIsDragging(false);
        document.body.style.userSelect = '';
        window.removeEventListener('mousemove', handleScrollbarMouseMove);
        window.removeEventListener('mouseup', handleScrollbarMouseUp);
    };

    const handleScrollbarMouseDown = (e: React.MouseEvent) => {
        if (!containerRef.current || !scrollbarTrackRef.current) return;
        isDraggingScrollbar.current = true;
        setIsDragging(true);
        document.body.style.userSelect = 'none';

        scrollbarStartX.current = e.clientX;
        scrollbarStartScrollLeft.current = containerRef.current.scrollLeft;

        window.addEventListener('mousemove', handleScrollbarMouseMove);
        window.addEventListener('mouseup', handleScrollbarMouseUp);
    };

    const handleScrollbarTouchMove = (e: TouchEvent) => {
        if (!isDraggingScrollbar.current || !containerRef.current || !scrollbarTrackRef.current || e.touches.length === 0) return;
        e.preventDefault();

        const deltaX = e.touches[0].clientX - scrollbarStartX.current;
        const trackWidth = scrollbarTrackRef.current.clientWidth;
        const { scrollWidth, clientWidth } = containerRef.current;
        const maxScroll = scrollWidth - clientWidth;

        if (maxScroll <= 0) return;

        const thumbPxWidth = (thumbWidth / 100) * trackWidth;
        const draggablePathWidth = trackWidth - thumbPxWidth;
        if (draggablePathWidth <= 0) return;

        const scrollRatio = maxScroll / draggablePathWidth;
        const scrollDelta = deltaX * scrollRatio;
        containerRef.current.scrollLeft = scrollbarStartScrollLeft.current + scrollDelta;
    };

    const handleScrollbarTouchEnd = () => {
        isDraggingScrollbar.current = false;
        setIsDragging(false);
        window.removeEventListener('touchmove', handleScrollbarTouchMove);
        window.removeEventListener('touchend', handleScrollbarTouchEnd);
    };

    const handleScrollbarTouchStart = (e: React.TouchEvent) => {
        if (!containerRef.current || !scrollbarTrackRef.current || e.touches.length === 0) return;
        isDraggingScrollbar.current = true;
        setIsDragging(true);

        scrollbarStartX.current = e.touches[0].clientX;
        scrollbarStartScrollLeft.current = containerRef.current.scrollLeft;

        window.addEventListener('touchmove', handleScrollbarTouchMove, { passive: false });
        window.addEventListener('touchend', handleScrollbarTouchEnd);
    };

    useEffect(() => {
        return () => {
            window.removeEventListener('mousemove', handleScrollbarMouseMove);
            window.removeEventListener('mouseup', handleScrollbarMouseUp);
            window.removeEventListener('touchmove', handleScrollbarTouchMove);
            window.removeEventListener('touchend', handleScrollbarTouchEnd);
        };
    }, [thumbWidth]);

    // Filter collections starting with 'gifts-for-'
    const giftingCollections = (collections || []).filter((c: any) => c.handle.startsWith('gifts-for-'));

    // If we have dynamic collections from Shopify starting with 'gifts-for-', use them; otherwise, use the static fallbacks
    const recipients = giftingCollections.length > 0
        ? giftingCollections.map((c: any) => ({
            name: c.title,
            handle: c.handle,
            image: c.image?.url || 'https://images.unsplash.com/photo-1596464522432-843818e6c79a?q=80&w=800&auto=format&fit=crop'
        }))
        : (isEn ? recipientsEn : recipientsAr).map(recipient => {
            const shopifyCollection = collections?.find(c => c.handle === recipient.handle);
            return {
                ...recipient,
                image: shopifyCollection?.image?.url || recipient.image,
                name: recipient.name
            };
        });

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        handleScroll();
        window.addEventListener('resize', handleScroll);
        return () => {
            window.removeEventListener('resize', handleScroll);
        };
    }, [recipients]);

    return (
        <section className={`w-full lg:py-24 bg-white ${isEn ? 'font-en' : 'font-ar'}`} dir={isEn ? 'ltr' : 'rtl'} style={{ paddingTop: '50px', paddingBottom: '50px' }}>
            <div className="max-w-[1400px] mx-auto">
                {/* Header */}
                <div className="text-center mb-6 lg:mb-6 px-6">
                    <h2 className="text-[36px] lg:text-[52px] font-bold text-[#1a1a1a] !mb-2 leading-none">
                        {isEn ? 'Who are you gifting?' : 'بتهدي لمين؟'}
                    </h2>
                    <p className="text-[#8B8B8B] text-[14px] lg:text-[16px] font-medium tracking-wide">
                        {isEn ? 'Choose the recipient and we guide you to the perfect gift' : 'اختر المستلم ونوجهك للهدية المثالية'}
                    </p>
                </div>

                {/* Horizontal Slider (Always a Slider) */}
                <div
                    ref={containerRef}
                    onScroll={handleScroll}
                    className={`flex flex-nowrap justify-start gap-3 md:gap-4 lg:gap-6 overflow-x-auto pb-0 px-6 lg:px-0 hide-scrollbars select-none ${isDragging ? 'snap-none' : 'snap-x snap-mandatory'}`}
                >
                    {recipients.map((recipient, index) => {
                        const catId = recipient.handle.replace('gifts-for-', '');
                        return (
                            <Link
                                key={index}
                                to={isEn ? `/en/gifting?category=${catId}` : `/gifting?category=${catId}`}
                                className="group flex-shrink-0 w-[140px] sm:w-[180px] md:w-[220px] lg:w-[calc((100%-4*24px)/4.35)] relative rounded-[12px] overflow-hidden snap-center transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl"
                                style={{ aspectRatio: '1/1' }}
                            >
                                <div className="w-full h-full relative">
                                    <img
                                        src={recipient.image}
                                        alt=""
                                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                                    />
                                    {/* Bottom Gradient Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

                                    {/* Label Text Overlay */}
                                    <div className="absolute bottom-3 md:bottom-8 left-0 right-0 text-center px-2 md:px-4">
                                        <h3 className="text-[16px] md:text-[24px] lg:text-[32px] font-bold text-white drop-shadow-md">
                                            {recipient.name}
                                        </h3>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {/* Horizontal Scroll Progress Bar */}
                {showScrollbar && (
                    <div
                        onMouseDown={handleScrollbarMouseDown}
                        onTouchStart={handleScrollbarTouchStart}
                        className="w-full px-6 mx-auto h-[16px] bg-transparent mt-8 relative cursor-pointer flex items-center justify-center select-none"
                        style={{ touchAction: 'none' }}
                    >
                        <div
                            ref={scrollbarTrackRef}
                            className="w-full h-[3px] bg-[#EBEBEB] rounded-full relative overflow-hidden pointer-events-none"
                        >
                            <div
                                className={`absolute top-0 bottom-0 bg-[#234745] rounded-full ${isDragging ? '' : 'transition-all duration-150'}`}
                                style={{
                                    width: `${thumbWidth}%`,
                                    left: isEn ? `${scrollProgress * (100 - thumbWidth) / 100}%` : 'auto',
                                    right: !isEn ? `${scrollProgress * (100 - thumbWidth) / 100}%` : 'auto',
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* Footer Button */}
                <div className="mt-8 lg:mt-12 flex justify-center px-6">
                    <Link
                        to={isEn ? "/en/gifting" : "/gifting"}
                        className="px-12 py-4 rounded-full border-2 border-[#234745] !text-[#234745] [font-family:'GE_Dinar_One',sans-serif] font-bold text-[15px] lg:text-[18px] transition-all hover:bg-[#1a3533] hover:!text-white hover:border-[#1a3533] active:scale-95"
                    >
                        {isEn ? 'Browse All Gifts' : 'تصفح كل الهدايا'}
                    </Link>
                </div>
            </div>
        </section>
    );
}
