import { Link, useOutletContext } from 'react-router';

export function OffersAndDiscounts() {
    const { locale } = useOutletContext<{ locale: string }>();
    const isEn = locale === 'en';

    return (
        <section
            className={`w-full bg-[#FDF5E6] py-20 lg:py-28 ${isEn ? 'font-en' : 'font-ar'}`}
            dir={isEn ? 'ltr' : 'rtl'}
        >
            <div className="max-w-[1400px] mx-auto px-4 md:px-8">

                {/* Section Header */}
                <div className="text-center mb-16 flex flex-col items-center">
                    <h2 className="text-[48px] lg:text-[64px] font-black text-[#1a1a1a] mb-4 leading-none tracking-tighter">
                        {isEn ? 'Offers & Discounts' : 'العروض والتخفيضات'}
                    </h2>
                    <p className="text-[#8B8B8B] text-[18px] lg:text-[22px] font-medium opacity-80">
                        {isEn ? 'Strongest offers for a limited time' : 'أقوى العروض لفترة محدودة'}
                    </p>
                </div>

                {/* Main Grid: 65% / 35% Split */}
                <div className={`flex flex-col ${isEn ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-8 mb-16`}>

                    {/* CARD 1: LARGE CREAM (65%) */}
                    <div className="lg:w-[65%] bg-[#FFF9ED] rounded-[40px] flex flex-col md:flex-row items-center relative overflow-hidden min-h-[460px] shadow-sm">

                        {/* Weave Pattern */}
                        <div
                            className={`absolute top-0 ${isEn ? 'right-0' : 'left-0'} w-[55%] h-full opacity-[0.06] pointer-events-none`}
                            style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 0 L100 50 L50 100 L0 50 Z M50 20 L80 50 L50 80 L20 50 Z' fill='none' stroke='%23234745' stroke-width='1'/%3E%3C/svg%3E")`,
                                maskImage: `linear-gradient(${isEn ? 'to left' : 'to right'}, black 70%, transparent 100%)`,
                                WebkitMaskImage: `linear-gradient(${isEn ? 'to left' : 'to right'}, black 70%, transparent 100%)`
                            }}
                        />

                        {/* Content Side */}
                        <div className={`w-full md:w-[45%] flex flex-col relative z-10 px-8 lg:px-14 py-12 ${isEn ? 'items-center md:items-end text-center md:text-right' : 'items-center md:items-start text-center md:text-right'}`}>

                            <div className="bg-[#E75D5D] text-white px-8 py-2 rounded-[16px] text-[14px] font-bold mb-8 shadow-sm">
                                {isEn ? 'Gift Voucher' : 'قسيمة هدية'}
                            </div>

                            <div className="mb-8 space-y-1">
                                <h3 className="text-[26px] lg:text-[38px] font-bold text-[#1a1a1a] leading-[1.2] tracking-tighter">
                                    {isEn ? 'Gift Your Loved Ones' : 'أهدِ من تحب'}
                                </h3>
                                <h3 className="text-[26px] lg:text-[38px] font-bold text-[#1a1a1a] leading-[1.2] tracking-tighter">
                                    {isEn ? 'Saadeddin Voucher' : 'قسيمة سعد الدين'}
                                </h3>
                            </div>

                            <p className="text-[#8B8B8B] text-[15px] lg:text-[17px] font-medium max-w-[340px] leading-relaxed">
                                {isEn ? 'Choose value, add message, and send instantly' : 'اختار القيمة، أضف رسالتك، وأرسلها فوراً'}
                            </p>

                            <Link
                                to={isEn ? "/en/products/gift-card" : "/products/gift-card"}
                                className="bg-[#234745] !text-white px-12 py-4 rounded-full text-[17px] transition-all min-w-[240px] text-center shadow-md mt-8 font-dinar font-bold"
                            >
                                {isEn ? 'Buy Voucher Now' : 'إشتري قسيمة الآن'}
                            </Link>
                        </div>
                        {/* Image Side */}
                        <div className="w-full md:w-[55%] h-full flex items-center justify-center p-8 lg:p-12 relative z-10">
                            <img
                                src="/images/voucher.png"
                                alt="Saadeddin Gift Voucher"
                                className="w-full h-auto object-contain max-w-[500px] drop-shadow-2xl"
                            />
                        </div>

                    </div>

                    {/* CARD 2: SMALL GREEN (35%) */}
                    <div className="lg:w-[35%] bg-[#234745] rounded-[40px] p-10 flex flex-col items-center justify-between text-center min-h-[460px] relative overflow-hidden group shadow-sm">
                        <div className="w-full flex justify-center mb-8">
                            <img
                                src="/images/sweets-box.png"
                                className="w-full h-auto object-contain max-w-[300px] transition-transform duration-1000 group-hover:scale-105 drop-shadow-2xl"
                                alt="Luxury Sweets Box"
                            />
                        </div>
                        <div className="relative z-10 w-full flex flex-col items-center">
                            <h3 className="text-[26px] lg:text-[38px] font-bold text-white leading-tight mb-10 px-4 tracking-tight">
                                {isEn ? 'Offers on our Best Products' : 'عروض وتخفيضات علي افضل منتجاتنا'}
                            </h3>
                            <Link
                                to={isEn ? "/en/collections/offers" : "/collections/offers"}
                                className="bg-[#FFF9ED] text-black px-12 py-4 rounded-full text-[17px] transition-all w-full max-w-[280px] text-center font-dinar font-bold"
                            >
                                {isEn ? 'Browse Now' : 'تصفح الآن'}
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Footer View All */}
                <div className="flex justify-center">
                    <Link
                        to={isEn ? "/en/collections/offers" : "/collections/offers"}
                        className="px-16 py-4 border-2 border-[#234745] text-[#234745] hover:bg-[#234745] hover:text-white rounded-full text-[17px] transition-all min-w-[320px] text-center uppercase tracking-widest shadow-sm font-dinar font-bold"
                    >
                        {isEn ? 'View All Offers' : 'عرض جميع العروض'}
                    </Link>
                </div>

            </div>
        </section>
    );
}
