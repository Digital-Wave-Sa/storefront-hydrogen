import { Link, useOutletContext } from 'react-router';

const recipientsEn = [
    { name: 'Mother', handle: 'gifts-for-mother', image: 'https://images.unsplash.com/photo-1596464522432-843818e6c79a?q=80&w=800&auto=format&fit=crop' },
    { name: 'Father', handle: 'gifts-for-father', image: 'https://images.unsplash.com/photo-1620052581693-559d7d4f1345?q=80&w=800&auto=format&fit=crop' },
    { name: 'Friends', handle: 'gifts-for-friends', image: 'https://images.unsplash.com/photo-1529156069898-49953eb1b5ae?q=80&w=800&auto=format&fit=crop' },
    { name: 'Colleagues', handle: 'gifts-for-colleagues', image: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?q=80&w=800&auto=format&fit=crop' },
];

const recipientsAr = [
    { name: 'الأم', handle: 'gifts-for-mother', image: 'https://images.unsplash.com/photo-1596464522432-843818e6c79a?q=80&w=800&auto=format&fit=crop' },
    { name: 'الأب', handle: 'gifts-for-father', image: 'https://images.unsplash.com/photo-1620052581693-559d7d4f1345?q=80&w=800&auto=format&fit=crop' },
    { name: 'الأصدقاء', handle: 'gifts-for-friends', image: 'https://images.unsplash.com/photo-1529156069898-49953eb1b5ae?q=80&w=800&auto=format&fit=crop' },
    { name: 'الزملاء', handle: 'gifts-for-colleagues', image: 'https://images.unsplash.com/photo-1556761175-4b46a572b786?q=80&w=800&auto=format&fit=crop' },
];

export function WhoAreYouGifting({ collections }: { collections?: any[] }) {
    const { locale } = useOutletContext<{ locale: string }>();
    const isEn = locale === 'en';
    
    // Merge Shopify data with static fallbacks
    const recipients = (isEn ? recipientsEn : recipientsAr).map(recipient => {
        const shopifyCollection = collections?.find(c => c.handle === recipient.handle);
        return {
            ...recipient,
            image: shopifyCollection?.image?.url || recipient.image,
            name: shopifyCollection?.title || recipient.name
        };
    });

    return (
        <section className={`w-full py-16 lg:py-24 ${isEn ? 'font-en' : 'font-ar'} bg-white`} dir={isEn ? 'ltr' : 'rtl'}>
            <div className="max-w-[1400px] mx-auto px-6">
                {/* Header */}
                <div className="text-center mb-12">
                    <h2 className="text-[40px] lg:text-[56px] font-black text-[#1a1a1a] mb-2 leading-tight">
                        {isEn ? 'Who are you gifting?' : 'بتهدي لمين؟'}
                    </h2>
                    <p className="text-[#666] text-[15px] lg:text-[18px] font-medium">
                        {isEn ? 'Choose the recipient and we guide you to the perfect gift' : 'اختر المستلم ونوجّهك للهدية المثالية'}
                    </p>
                </div>

                {/* Continuous Slider */}
                <div className="flex gap-4 lg:gap-6 overflow-x-auto hide-scrollbars snap-x snap-mandatory pb-10 pt-4 px-4 md:px-0">
                    {recipients.map((recipient, index) => (
                        <Link
                            key={index}
                            to={isEn ? `/en/collections/${recipient.handle}` : `/collections/${recipient.handle}`}
                            className="group flex-shrink-0 w-[280px] lg:w-[340px] relative rounded-[24px] overflow-hidden snap-center transition-transform duration-500 hover:-translate-y-2 shadow-sm hover:shadow-xl"
                        >
                            <div className="w-full aspect-[4/5] bg-[#f5eaea] relative">
                                <img 
                                    src={recipient.image} 
                                    alt={recipient.name}
                                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                                    onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                        const placeholder = e.currentTarget.parentElement?.querySelector('.placeholder-overlay');
                                        if (placeholder) (placeholder as HTMLElement).style.display = 'flex';
                                    }}
                                />
                                {/* Premium Gradient Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-500"></div>
                                
                                {/* Elegant Loading Placeholder */}
                                <div className="placeholder-overlay absolute inset-0 hidden items-center justify-center bg-gradient-to-br from-[#1a1a1a]/40 to-transparent">
                                    <div className="w-16 h-16 rounded-full border-2 border-white/30 flex items-center justify-center">
                                        <div className="w-2 h-2 bg-white/30 rounded-full animate-ping"></div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Overlay Text */}
                            <div className="absolute bottom-8 left-0 right-0 text-center px-4">
                                <h3 className="text-[28px] lg:text-[36px] font-black text-white drop-shadow-lg">
                                    {recipient.name}
                                </h3>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
