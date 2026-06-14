import { useOutletContext } from 'react-router';
import { useState, useRef, useEffect } from 'react';

export function CustomerReviews({ config }: { config?: any }) {
    const { locale } = useOutletContext<{ locale: string }>();
    const isEn = locale === 'en';

    // Parse Metaobject config
    const showField = config?.fields?.find((f: any) => f.key === 'show_reviews_section')?.value;
    if (showField === 'false') return null;

    const getField = (key: string) => config?.fields?.find((f: any) => f.key === key)?.value;
    const titleEn = getField('reviews_title_en') || 'Customer Reviews';
    const titleAr = getField('reviews_title_ar') || 'أراء عملائنا';
    const subtitleEn = getField('reviews_subtitle_en') || "See our customers' reviews";
    const subtitleAr = getField('reviews_subtitle_ar') || 'شاهد أراء عملائنا';

    const [activeIndex, setActiveIndex] = useState(isEn ? 0 : 3);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
    const isClickScrolling = useRef(false);
    const scrollTimeout = useRef<NodeJS.Timeout>();

    const hardcodedReviews = [
        {
            text: isEn 
                ? "Saadeddin offers a unique and distinct experience in the world of sweets. High quality and attention to detail always bring me back." 
                : "سعد الدين بتقدملي تجربة فريدة ومميزة في عالم الحلويات. الجودة العالية والاهتمام بالتفاصيل بيخليني دايماً ارجع ليهم في كل مناسبة.",
            name: isEn ? "Ahmed Alabdali" : "أحمد العبدلي",
            title: isEn ? "Head of Sales" : "رئيس قسم المبيعات",
            avatar: "https://ui-avatars.com/api/?name=Ahmed+Alabdali&background=BBCFCD&color=234745"
        },
        {
            text: isEn 
                ? "I've been a loyal customer for years. I find everything I'm looking for, from authentic oriental sweets to luxury chocolates. Excellent service." 
                : "أنا عميل وفي لسعد الدين من سنين. بلاقي عندهم كل اللي بدور عليه من حلويات شرقية أصيلة وشوكولاتة فاخرة. خدمة العملاء ممتازة والأسعار معقولة.",
            name: isEn ? "Noura Khaled" : "نورة خالد",
            title: isEn ? "Product Dev Manager" : "مديرة تطوير المنتجات",
            avatar: "https://ui-avatars.com/api/?name=Noura+Khaled&background=EED5D7&color=906B51"
        },
        {
            text: isEn 
                ? "Saadeddin is my favorite destination for special occasions. Their cakes are a masterpiece, and the selection suits all tastes." 
                : "سعد الدين هو وجهتي المفضلة للحلويات في المناسبات الخاصة. الكيكات عندهم تحفة فنية، والتشكيلة واسعة بتناسب جميع الأذواق. دايماً بيبهروني بابتكاراتهم الجديدة.",
            name: isEn ? "Salman Alfraj" : "سلمان الفراج",
            title: isEn ? "Architect" : "مهندس معماري",
            avatar: "https://ui-avatars.com/api/?name=Salman+Alfraj&background=FEF8EB&color=255441"
        },
        {
            text: isEn 
                ? "Honestly, Saadeddin outdoes themselves every time. The quality of ingredients and artistic presentation makes me trust them completely." 
                : "بصراحة، سعد الدين بيتفوق على نفسه كل مرة. جودة المكونات واللمسة الفنية في التقديم بتخليني أثق فيهم تماماً. أنصح أي حد يجرب حلوياتهم، مش هيندم.",
            name: isEn ? "Laila Alotaibi" : "ليلى العتيبي",
            title: isEn ? "Dentist" : "طبيبة أسنان",
            avatar: "https://ui-avatars.com/api/?name=Laila+Alotaibi&background=E64950&color=FFFFFF"
        },
        {
            text: isEn 
                ? "Every time I visit Saadeddin, I'm amazed by the variety. Their pistachio baklava is simply out of this world. Highly recommended for family gatherings." 
                : "في كل مرة أزور سعد الدين، أنبهر بالتنوع. البقلاوة بالفستق عندهم خيالية بمعنى الكلمة. أنصح بها بشدة للتجمعات العائلية.",
            name: isEn ? "Omar Tariq" : "عمر طارق",
            title: isEn ? "Software Engineer" : "مهندس برمجيات",
            avatar: "https://ui-avatars.com/api/?name=Omar+Tariq&background=BBCFCD&color=234745"
        },
        {
            text: isEn 
                ? "The customer service is just as sweet as their desserts. They helped me choose the perfect customized cake for my daughter's birthday." 
                : "خدمة العملاء عندهم حلوة زي حلوياتهم. ساعدوني أختار كيكة مخصصة مثالية لعيد ميلاد بنتي، وكانت مفاجأة رائعة.",
            name: isEn ? "Sara Aldosari" : "سارة الدوسري",
            title: isEn ? "Teacher" : "معلمة",
            avatar: "https://ui-avatars.com/api/?name=Sara+Aldosari&background=EED5D7&color=906B51"
        },
        {
            text: isEn 
                ? "I travel a lot, but I always make sure to take a box of Saadeddin sweets with me as a gift. It represents the best of our local taste." 
                : "أسافر كثير، ودائماً أحرص آخذ علبة حلويات من سعد الدين كهدية. تمثل أفضل ما في ذوقنا المحلي وتبيض الوجه.",
            name: isEn ? "Fahad Almutairi" : "فهد المطيري",
            title: isEn ? "Business Consultant" : "مستشار أعمال",
            avatar: "https://ui-avatars.com/api/?name=Fahad+Almutairi&background=FEF8EB&color=255441"
        },
        {
            text: isEn 
                ? "Their new diet-friendly section is a game changer! Now I can enjoy my favorite oriental sweets without ruining my diet." 
                : "قسم الحلويات الدايت الجديد عندهم غير اللعبة! صار فيني أستمتع بحلوياتي الشرقية المفضلة بدون ما أخرب النظام الغذائي.",
            name: isEn ? "Mona Hassan" : "منى حسن",
            title: isEn ? "Fitness Coach" : "مدربة لياقة بدنية",
            avatar: "https://ui-avatars.com/api/?name=Mona+Hassan&background=E64950&color=FFFFFF"
        }
    ];

    const metaReviews = config?.fields?.find((f: any) => f.key === 'reviews_list')?.references?.nodes;
    
    let reviews = hardcodedReviews.map(r => ({ ...r, cardImage: '/images/review_placeholder.png' }));

    if (metaReviews && metaReviews.length > 0) {
        reviews = metaReviews.map((node: any) => {
            const getMetaField = (key: string) => node.fields?.find((f: any) => f.key === key)?.value;
            const getMetaImage = (key: string) => node.fields?.find((f: any) => f.key === key)?.reference?.image?.url;
            return {
                text: isEn ? getMetaField('review_text_en') : getMetaField('review_text_ar'),
                name: isEn ? getMetaField('customer_name_en') : getMetaField('customer_name_ar'),
                title: isEn ? getMetaField('job_title_en') : getMetaField('job_title_ar'),
                avatar: getMetaImage('avatar_image') || "https://ui-avatars.com/api/?name=" + (isEn ? getMetaField('customer_name_en') : getMetaField('customer_name_ar')),
                cardImage: getMetaImage('card_image') || '/images/review_placeholder.png'
            };
        });
    }

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
            <div className="w-full max-w-[1280px] flex flex-col items-center gap-[24px]">
                
                {/* Header */}
                <div className="flex flex-col items-center justify-center w-full px-4 max-w-[1072px] gap-[16px] mb-[16px]">
                    <h2 className="text-[#171717] text-[36px] md:text-[50px] font-bold leading-[48px] md:leading-[80px] text-center" style={!isEn ? { fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" } : undefined}>
                        {isEn ? titleEn : titleAr}
                    </h2>
                    <p className="text-[#7D7D7D] font-dinar font-medium text-[16px] leading-[20px] text-center">
                        {isEn ? subtitleEn : subtitleAr}
                    </p>
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
                                key={idx} 
                                ref={el => cardRefs.current[idx] = el}
                                data-index={idx}
                                className="snap-center w-[280px] h-[396px] border border-[#BBCFCD] rounded-[12px] flex flex-col items-start pb-[8px] gap-[12px] bg-white box-border shrink-0 overflow-hidden"
                            >
                                {/* Top Image */}
                                <div className="w-[280px] h-[212px] shrink-0 bg-[#F9F9F9]">
                                    <img 
                                        src={review.cardImage} 
                                        alt="Review graphic" 
                                        className="w-full h-full object-cover"
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
                                    <div className="w-[48px] h-[48px] rounded-full overflow-hidden shrink-0 bg-gray-100">
                                        <img 
                                            src={review.avatar} 
                                            alt={review.name} 
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="flex flex-col items-start gap-[8px] w-[208px] h-[48px] justify-center overflow-hidden">
                                        <p className="text-[#171717] font-dinar font-bold text-[16px] leading-[20px] text-start truncate w-full m-0">
                                            {review.name}
                                        </p>
                                        <p className="text-[#7D7D7D] font-dinar font-medium text-[14px] leading-none text-start truncate w-full m-0">
                                            {review.title}
                                        </p>
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
                                <span className={`block h-[4px] rounded-[4px] transition-all duration-300 ${
                                    isActive ? 'w-[40px] bg-[#234745]' : 'w-[23px] bg-[#BBCFCD] opacity-50'
                                }`} />
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
