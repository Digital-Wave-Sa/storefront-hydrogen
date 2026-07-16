import { Link, useOutletContext } from 'react-router';
import { useRef } from 'react';

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
    const isDown = useRef(false);
    const startX = useRef(0);
    const scrollLeft = useRef(0);
    const moved = useRef(false);

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        isDown.current = true;
        moved.current = false;
        if (!containerRef.current) return;
        startX.current = e.pageX - containerRef.current.offsetLeft;
        scrollLeft.current = containerRef.current.scrollLeft;
    };

    const handleMouseLeave = () => {
        isDown.current = false;
    };

    const handleMouseUp = () => {
        isDown.current = false;
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDown.current || !containerRef.current) return;
        e.preventDefault();
        const x = e.pageX - containerRef.current.offsetLeft;
        const walk = (x - startX.current) * 1.5;
        if (Math.abs(walk) > 5) {
            moved.current = true;
        }
        containerRef.current.scrollLeft = scrollLeft.current - walk;
    };

    const handleLinkClick = (e: React.MouseEvent) => {
        if (moved.current) {
            e.preventDefault();
            e.stopPropagation();
        }
    };

    // Merge Shopify data with static fallbacks
    const recipients = (isEn ? recipientsEn : recipientsAr).map(recipient => {
        const shopifyCollection = collections?.find(c => c.handle === recipient.handle);
        return {
            ...recipient,
            image: shopifyCollection?.image?.url || recipient.image,
            name: recipient.name
        };
    });

    return (
        <section className={`w-full lg:py-24 bg-white ${isEn ? 'font-en' : 'font-ar'}`} dir={isEn ? 'ltr' : 'rtl'} style={{ paddingTop: '50px', paddingBottom: '50px' }}>
            <div className="max-w-[1400px] mx-auto">
                {/* Header */}
                <div className="text-center mb-6 lg:mb-6 px-6">
                    <h2 className="text-[36px] lg:text-[52px] font-bold text-[#1a1a1a] mb-4 leading-none">
                        {isEn ? 'Who are you gifting?' : 'بتهدي لمين؟'}
                    </h2>
                    <p className="text-[#8B8B8B] text-[14px] lg:text-[16px] font-bold tracking-wide">
                        {isEn ? 'CHOOSE THE RECIPIENT AND WE GUIDE YOU TO THE PERFECT GIFT' : 'اختر المستلم ونوجهك للهدية المثالية'}
                    </p>
                </div>

                {/* Horizontal Slider (Always a Slider) */}
                <div
                    ref={containerRef}
                    onMouseDown={handleMouseDown}
                    onMouseLeave={handleMouseLeave}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                    className="flex flex-nowrap justify-start gap-3 md:gap-4 lg:gap-6 overflow-x-auto snap-x snap-mandatory pb-0 px-6 lg:px-0 hide-scrollbars cursor-grab active:cursor-grabbing select-none"
                >
                    {recipients.map((recipient, index) => {
                        const catId = recipient.handle.replace('gifts-for-', '');
                        return (
                            <Link
                                key={index}
                                to={isEn ? `/en/gifting?category=${catId}` : `/gifting?category=${catId}`}
                                onClick={handleLinkClick}
                                className="group flex-shrink-0 w-[140px] sm:w-[180px] md:w-[220px] lg:w-[calc((100%-4*24px)/4.35)] relative rounded-[20px] overflow-hidden snap-center transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl"
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
