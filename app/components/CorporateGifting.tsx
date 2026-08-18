import { Link, useOutletContext } from 'react-router';

export function CorporateGifting({ config }: { config?: any }) {
    const { locale = 'ar' } = useOutletContext<{ locale?: string }>() ?? {};
    const isEn = locale === 'en';

    const metaNode = config?.corporateGifting?.nodes?.[0];
    const getField = (key: string) => {
        const f = metaNode?.fields?.find((field: any) => field.key === key);
        if (f?.reference?.image?.url) {
            return f.reference.image.url;
        }
        if (f?.value && !f.value.startsWith('gid://')) {
            return f.value;
        }
        return '';
    };

    const title = (isEn ? getField('title_en') : getField('title')) || (isEn ? 'Gifts that Suit Your Company' : 'هدايا تليق بشركتك');
    const description = (isEn ? getField('description_en') : getField('description')) || (isEn
        ? "Leave a mark on every institutional occasion — luxury collections customized with your company name, with Saadeddin's elegance and craftsmanship since 1919. • Bulk orders • Corporate packaging • Delivery to all branches."
        : 'اترك أثراً في كل مناسبة مؤسسية — تشكيلات فاخرة مخصصة لاسم شركتك، بأناقة سعد الدين وحرفتها منذ ١٩١٩. • طلبات بالجملة • تغليف مؤسسي • توصيل لجميع الفروع.');
    const button = (isEn ? getField('button_text_en') : getField('button_text')) || (isEn ? 'Discover More' : 'إكتشف المزيد');
    const rawLink = (isEn ? getField('button_link_en') : '') || getField('button_link') || (isEn ? '/en/corporate' : '/corporate');
    let buttonLink = rawLink;
    if (buttonLink.startsWith('/') && isEn && !buttonLink.startsWith('/en')) {
        buttonLink = `/en${buttonLink}`;
    } else if (buttonLink.startsWith('/en/') && !isEn) {
        buttonLink = buttonLink.replace('/en', '');
    }

    const card1Title = (isEn ? getField('card1_title_en') : getField('card1_title')) || (isEn ? 'Employee Occasions' : 'مناسبات الموظفين');
    const card1Image = getField('card1_image') || '/images/gift-corporate-1.webp';

    const card2Title = (isEn ? getField('card2_title_en') : getField('card2_title')) || (isEn ? 'Client & Partner Gifts' : 'هدايا العملاء والشركاء');
    const card2Image = getField('card2_image') || '/images/gift-corporate-2.webp';

    const activeContent = {
        title,
        description,
        button,
        buttonLink,
        card1: card1Title,
        card1Image,
        card2: card2Title,
        card2Image,
    };

    const isExternal = activeContent.buttonLink.startsWith('http');

    return (
        <section
            className={`w-full ring-1 ring-[#234745] bg-[#234745] lg:py-24 overflow-hidden ${isEn ? 'font-en' : 'font-ar'}`}
            dir={isEn ? 'ltr' : 'rtl'}
            style={{ paddingTop: '50px', paddingBottom: '50px' }}
        >
            <div className="max-w-[1400px] mx-auto px-6 lg:px-16">
                <div className="flex flex-col-reverse lg:flex-row-reverse items-center gap-8 lg:gap-24">

                    {/* Text Content */}
                    <div className="w-full lg:w-[35%] flex flex-col lg:items-start lg:text-start gap-6 lg:gap-[32px]">
                        <h2
                            className="text-[32px] lg:text-[50px] font-bold text-white leading-[1.2] lg:leading-[80px]"
                            style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}
                        >
                            {activeContent.title}
                        </h2>

                        <p
                            className="text-[#BBCFCD] text-[14px] font-light leading-[17px] max-w-[484px]"
                            style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                        >
                            {activeContent.description}
                        </p>

                        {isExternal ? (
                            <a
                                href={activeContent.buttonLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-[#BBCFCD] hover:bg-[#a5b9b8] !text-[#234745] px-12 py-4 rounded-full font-bold transition-all shadow-sm flex items-center justify-center w-fit"
                                style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                            >
                                {activeContent.button}
                            </a>
                        ) : (
                            <Link
                                to={activeContent.buttonLink}
                                className="bg-[#BBCFCD] hover:bg-[#a5b9b8] !text-[#234745] px-12 py-4 rounded-full font-bold transition-all shadow-sm flex items-center justify-center w-fit"
                                style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                            >
                                {activeContent.button}
                            </Link>
                        )}
                    </div>

                    {/* Cards */}
                    <div className="w-full lg:w-[65%] flex flex-col md:flex-row gap-[16px] lg:gap-[32px]">

                        {/* Card 1: Employees (First in RTL = Right side) */}
                        <div
                            className="hidden md:flex group relative flex-1 h-[300px] md:h-[264px] rounded-[20px] overflow-hidden bg-[#234745]"
                        >
                            <img
                                src={activeContent.card1Image}
                                alt={activeContent.card1}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(0,0,0,0.65)] via-[rgba(0,0,0,0.3)] to-transparent opacity-90"></div>

                            <div className="absolute bottom-[16px] left-0 right-0 text-center px-4">
                                <h3
                                    className="text-[26px] font-bold text-white leading-[42px]"
                                    style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}
                                >
                                    {activeContent.card1}
                                </h3>
                            </div>
                        </div>

                        {/* Card 2: Clients & Partners (Second in RTL = Left side) */}
                        <div
                            className="group relative flex-1 h-[300px] md:h-[264px] rounded-[20px] overflow-hidden bg-[#234745]"
                        >
                            <img
                                src={activeContent.card2Image}
                                alt={activeContent.card2}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(0,0,0,0.65)] via-[rgba(0,0,0,0.3)] to-transparent opacity-90"></div>

                            <div className="absolute bottom-[16px] left-0 right-0 text-center px-4">
                                <h3
                                    className="text-[26px] font-bold text-white leading-[42px]"
                                    style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}
                                >
                                    {activeContent.card2}
                                </h3>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </section>
    );
}