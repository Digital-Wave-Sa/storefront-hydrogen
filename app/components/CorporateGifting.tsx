import { Link, useOutletContext } from 'react-router';

export function CorporateGifting() {
    const { locale } = useOutletContext<{ locale: string }>();
    const isEn = locale === 'en';

    const content = {
        en: {
            title: 'Gifts that Suit Your Company',
            description: "Leave a mark on every institutional occasion — luxury collections customized with your company name, with Saadeddin's elegance and craftsmanship since 1919. • Bulk orders • Corporate packaging • Delivery to all branches.",
            button: 'Discover More',
            card1: 'Client & Partner Gifts',
            card2: 'Employee Occasions'
        },
        ar: {
            title: 'هدايا تليق بشركتك',
            description: 'اترك أثراً في كل مناسبة مؤسسية — تشكيلات فاخرة مخصصة لاسم شركتك، بأناقة سعد الدين وحرفتها منذ ١٩١٩. • طلبات بالجملة • تغليف مؤسسي • توصيل لجميع الفروع.',
            button: 'إكتشف المزيد',
            card1: 'هدايا العملاء والشركاء',
            card2: 'مناسبات الموظفين'
        }
    };

    const activeContent = isEn ? content.en : content.ar;

    return (
        <section
            className={`w-full bg-[#2B4241] py-20 lg:py-28 overflow-hidden ${isEn ? 'font-en' : 'font-ar'}`}
            dir="ltr" // Layout remains Text-Left, Cards-Right as per image_0f296a.jpg
        >
            <div className="max-w-[1400px] mx-auto px-6 lg:px-16">
                <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">

                    {/* Left Column: Text Content */}
                    <div className={`w-full lg:w-[38%] flex flex-col ${isEn ? 'items-start text-left' : 'items-end text-right'}`}>
                        <h2 className="text-[42px] lg:text-[56px] font-medium text-white leading-[1.1] mb-6 tracking-tight">
                            {activeContent.title}
                        </h2>

                        <p className="text-white/70 text-[14px] lg:text-[15px] leading-relaxed mb-10 max-w-[480px] font-light">
                            {activeContent.description}
                        </p>

                        <Link
                            to={isEn ? "/en/pages/corporate-gifting" : "/pages/corporate-gifting"}
                            className="bg-[#B9C7C5] hover:bg-white transition-colors duration-500 text-[#2B4241] px-12 py-3.5 rounded-full font-bold text-[16px] shadow-lg"
                        >
                            {activeContent.button}
                        </Link>
                    </div>

                    {/* Right Column: Cards */}
                    <div className="w-full lg:w-[62%] flex flex-col md:flex-row gap-6">

                        {/* Card 1: Clients & Partners */}
                        <Link
                            to={isEn ? "/en/collections/corporate-clients" : "/collections/corporate-clients"}
                            className="group relative flex-1 aspect-[0.85/1] rounded-[32px] overflow-hidden"
                        >
                            <img
                                src="https://images.unsplash.com/photo-1511306162210-999335f6068d?q=80&w=800&auto=format&fit=crop"
                                alt={activeContent.card1}
                                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                            />
                            {/* Gradient matches the subtle darkened bottom in image_0f296a.jpg */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>

                            <div className="absolute bottom-8 left-0 right-0 text-center px-4">
                                <h3 className="text-[22px] lg:text-[26px] font-bold text-white tracking-tight">
                                    {activeContent.card1}
                                </h3>
                            </div>
                        </Link>

                        {/* Card 2: Employees */}
                        <Link
                            to={isEn ? "/en/collections/employee-gifts" : "/collections/employee-gifts"}
                            className="group relative flex-1 aspect-[0.85/1] rounded-[32px] overflow-hidden"
                        >
                            <img
                                src="https://images.unsplash.com/photo-1530124560676-5f76906a5960?q=80&w=800&auto=format&fit=crop"
                                alt={activeContent.card2}
                                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>

                            <div className="absolute bottom-8 left-0 right-0 text-center px-4">
                                <h3 className="text-[22px] lg:text-[26px] font-bold text-white tracking-tight">
                                    {activeContent.card2}
                                </h3>
                            </div>
                        </Link>

                    </div>
                </div>
            </div>
        </section>
    );
}