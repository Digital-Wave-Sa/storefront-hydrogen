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
            className={`w-full bg-[#234745] py-16 lg:py-24 overflow-hidden ${isEn ? 'font-en' : 'font-ar'}`}
            dir={isEn ? 'ltr' : 'rtl'}
        >
            <div className="max-w-[1400px] mx-auto px-6 lg:px-16">
                <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">

                    {/* Text Content */}
                    <div className="w-full lg:w-[45%] flex flex-col items-start text-start">
                        <h2 
                            className="text-[32px] lg:text-[46px] font-bold text-white leading-[1.2] mb-4"
                            style={{ fontFamily: "'GE Dinar One', sans-serif" }}
                        >
                            {activeContent.title}
                        </h2>

                        <p 
                            className="text-white/80 text-[14px] lg:text-[16px] leading-relaxed mb-8 max-w-[500px]"
                            style={{ fontFamily: "'GE Dinar One', sans-serif" }}
                        >
                            {activeContent.description}
                        </p>

                        <Link
                            to={isEn ? "/en/pages/corporate-gifting" : "/pages/corporate-gifting"}
                            className="mt-4 lg:mt-6 bg-[#BBCFCD] hover:bg-white transition-colors duration-300 text-[#234745] px-10 py-3 rounded-full font-bold text-[16px]"
                            style={{ fontFamily: "'GE Dinar One', sans-serif" }}
                        >
                            {activeContent.button}
                        </Link>
                    </div>

                    {/* Cards */}
                    <div className="w-full lg:w-[55%] flex flex-col md:flex-row gap-4 lg:gap-6">
                        
                        {/* Card 1: Employees (First in RTL = Right side) */}
                        <Link
                            to={isEn ? "/en/collections/employee-gifts" : "/collections/employee-gifts"}
                            className="group relative flex-1 aspect-[1/1.1] rounded-[16px] overflow-hidden"
                        >
                            <img
                                src="https://images.unsplash.com/photo-1530124560676-5f76906a5960?q=80&w=800&auto=format&fit=crop"
                                alt={activeContent.card2}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#111111]/90 via-[#111111]/20 to-transparent"></div>

                            <div className="absolute bottom-6 left-0 right-0 text-center px-4">
                                <h3 
                                    className="text-[18px] lg:text-[22px] font-bold text-white tracking-tight"
                                    style={{ fontFamily: "'GE Dinar One', sans-serif" }}
                                >
                                    {activeContent.card2}
                                </h3>
                            </div>
                        </Link>

                        {/* Card 2: Clients & Partners (Second in RTL = Left side) */}
                        <Link
                            to={isEn ? "/en/collections/corporate-clients" : "/collections/corporate-clients"}
                            className="group relative flex-1 aspect-[1/1.1] rounded-[16px] overflow-hidden"
                        >
                            <img
                                src="https://images.unsplash.com/photo-1511306162210-999335f6068d?q=80&w=800&auto=format&fit=crop"
                                alt={activeContent.card1}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#111111]/90 via-[#111111]/20 to-transparent"></div>

                            <div className="absolute bottom-6 left-0 right-0 text-center px-4">
                                <h3 
                                    className="text-[18px] lg:text-[22px] font-bold text-white tracking-tight"
                                    style={{ fontFamily: "'GE Dinar One', sans-serif" }}
                                >
                                    {activeContent.card1}
                                </h3>
                            </div>
                        </Link>

                    </div>
                </div>
            </div>
        </section>
    );
}