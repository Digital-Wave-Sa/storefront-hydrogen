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
                <div className="flex flex-col lg:flex-row-reverse items-center gap-16 lg:gap-24">

                    {/* Text Content */}
                    <div className="w-full lg:w-[35%] flex flex-col items-start text-start gap-[32px]">
                        <h2 
                            className="text-[32px] lg:text-[50px] font-bold text-white leading-[1.2] lg:leading-[80px]"
                            style={{ fontFamily: "'Bahij Janna', sans-serif" }}
                        >
                            {activeContent.title}
                        </h2>

                        <p 
                            className="text-[#BBCFCD] text-[14px] leading-[17px] max-w-[484px]"
                            style={{ fontFamily: "'GE Dinar One', sans-serif" }}
                        >
                            {activeContent.description}
                        </p>

                        <Link
                            to={isEn ? "/en/pages/corporate-gifting" : "/pages/corporate-gifting"}
                            className="bg-[#BBCFCD] hover:bg-white transition-colors duration-300 text-[#234745] px-[20px] py-[12px] rounded-[24px] font-bold text-[18px] leading-[22px]"
                            style={{ fontFamily: "'GE Dinar One', sans-serif" }}
                        >
                            {activeContent.button}
                        </Link>
                    </div>

                    {/* Cards */}
                    <div className="w-full lg:w-[65%] flex flex-col md:flex-row gap-[16px] lg:gap-[32px]">
                        
                        {/* Card 1: Employees (First in RTL = Right side) */}
                        <Link
                            to={isEn ? "/en/collections/employee-gifts" : "/collections/employee-gifts"}
                            className="group relative flex-1 h-[264px] rounded-[20px] overflow-hidden bg-[#234745]"
                        >
                            <img
                                src="/images/gift-corporate-2.webp"
                                alt={activeContent.card2}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(0,0,0,0.65)] via-[rgba(0,0,0,0.3)] to-transparent opacity-90"></div>

                            <div className="absolute bottom-[16px] left-0 right-0 text-center px-4">
                                <h3 
                                    className="text-[26px] font-bold text-white leading-[42px]"
                                    style={{ fontFamily: "'Bahij Janna', sans-serif" }}
                                >
                                    {activeContent.card2}
                                </h3>
                            </div>
                        </Link>

                        {/* Card 2: Clients & Partners (Second in RTL = Left side) */}
                        <Link
                            to={isEn ? "/en/collections/corporate-clients" : "/collections/corporate-clients"}
                            className="group relative flex-1 h-[264px] rounded-[20px] overflow-hidden bg-[#234745]"
                        >
                            <img
                                src="/images/gift-corporate-1.webp"
                                alt={activeContent.card1}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(0,0,0,0.65)] via-[rgba(0,0,0,0.3)] to-transparent opacity-90"></div>

                            <div className="absolute bottom-[16px] left-0 right-0 text-center px-4">
                                <h3 
                                    className="text-[26px] font-bold text-white leading-[42px]"
                                    style={{ fontFamily: "'Bahij Janna', sans-serif" }}
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