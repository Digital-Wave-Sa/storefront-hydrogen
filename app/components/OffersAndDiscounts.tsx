import { Link, useOutletContext } from 'react-router';
import { useI18n } from '~/lib/i18n';

export function OffersAndDiscounts() {
    const { locale } = useOutletContext<{ locale: string }>();
    const t = useI18n(locale);
    const isEn = locale === 'en';

    return (
        <section className={`w-full bg-[#fdfaf6] py-16 lg:py-20 ${isEn ? 'font-en' : 'font-ar'}`} dir={isEn ? 'ltr' : 'rtl'}>
            <div className="max-w-[1400px] mx-auto px-4 md:px-8">

                {/* Section Header */}
                <div className="text-center mb-12 flex flex-col items-center">
                    <h2 className="text-[40px] lg:text-[56px] font-black text-[#1a1a1a] mb-3 leading-tight">{t.homepage.offersAndDiscounts}</h2>
                    <p className="text-gray-400 text-[15px] font-medium mb-4">{isEn ? 'Exclusive limited time offers' : 'أقوى العروض لفترة محدودة'}</p>
                </div>

                {/* Row 1: Small (right in RTL) + Large (left in RTL) */}
                <div className="flex flex-col md:flex-row gap-5 mb-5">

                    {/* Card 1: Bank Partnership - narrow */}
                    <div className="md:w-[35%] bg-[#f5f0e8] rounded-3xl p-7 lg:p-8 flex flex-col relative overflow-hidden min-h-[300px]">
                        {/* Badge */}
                        <div className="inline-flex self-start bg-[#f5e6c8] text-[#8b6914] px-4 py-1.5 rounded-full text-[12px] font-bold mb-5 items-center gap-1.5">
                            <span>👑</span> {isEn ? 'Premium Partner' : 'شريك مميز'}
                        </div>

                        {/* Bank Icon */}
                        <div className="mb-4">
                            <div className="w-[60px] h-[60px] bg-[#f5d98c] rounded-2xl flex items-center justify-center">
                                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#8b6914" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" />
                                </svg>
                            </div>
                        </div>

                        {/* Discount Text */}
                        <h3 className="text-[38px] font-black text-[#1a1a1a] leading-none mb-2">
                            {isEn ? <><span className="font-en">15%</span> Discount</> : <>خصم <span className="font-en">%١٥</span></>}
                        </h3>
                        <p className="text-gray-500 text-[13px] font-medium mb-5">{isEn ? 'Exclusive for partner banks' : 'حصري لعملاء البنوك الشريكة'}</p>

                        {/* Bank Tags */}
                        <div className="flex gap-2 mb-6">
                            {['RAJHI', 'NCB', 'RIYAD'].map((bank) => (
                                <span key={bank} className="border border-gray-300 text-gray-600 px-3 py-1 rounded-lg text-[11px] font-bold font-en tracking-wide bg-white/60">
                                    {bank}
                                </span>
                            ))}
                        </div>

                        {/* CTA Button */}
                        <Link to={isEn ? "/en/collections" : "/collections"} className="inline-flex self-start bg-[#1a1a1a] text-white px-7 py-3 rounded-full text-[13px] font-bold hover:bg-[#333] transition-colors mt-auto">
                            {isEn ? 'Discover Details' : 'إكتشف التفاصيل'}
                        </Link>
                    </div>

                    {/* Card 2: Buy One Get One Free - wide */}
                    <div className="md:w-[65%] bg-[#dceee5] rounded-3xl p-7 lg:p-8 flex relative overflow-hidden min-h-[300px]">
                        {/* Chocolate image area (right side in RTL) */}
                        <div className="absolute top-6 left-6 lg:left-12 w-[160px] h-[160px] lg:w-[200px] lg:h-[200px] flex items-center justify-center">
                            <div className="relative w-full h-full">
                                <div className="absolute w-[70%] h-[55%] bg-[#6d4c41] rounded-xl transform rotate-[-12deg] shadow-lg top-[10%] right-[10%]"></div>
                                <div className="absolute w-[65%] h-[50%] bg-[#8d6e63] rounded-xl transform rotate-[6deg] shadow-md top-[20%] right-[20%]"></div>
                                <div className="absolute w-[18%] h-[18%] bg-[#4e342e] rounded-sm transform rotate-[25deg] bottom-[15%] right-[35%]"></div>
                                <div className="absolute w-[12%] h-[12%] bg-[#5d4037] rounded-sm transform rotate-[-10deg] bottom-[20%] right-[55%]"></div>
                            </div>
                        </div>

                        {/* Badge top-left (in LTR, so top-right in RTL context but we use left positioning) */}
                        <div className="absolute top-6 left-6 bg-[#c0392b] text-white px-4 py-1.5 rounded-full text-[12px] font-bold flex items-center gap-1.5 z-10" dir="ltr">
                            <span>🎁</span> <span className="font-en">1+1</span> {isEn ? 'Free' : 'مجاناً'}
                        </div>

                        {/* Content area */}
                        <div className="flex flex-col justify-end w-full mt-auto relative z-10">
                            <h3 className="text-[24px] lg:text-[30px] font-black text-[#1a1a1a] leading-tight mb-2 max-w-[380px]">
                                {isEn ? 'Buy One Get One Free' : 'اشتري واحد واحصل على الثاني مجاناً'}
                            </h3>
                            <p className="text-[#666] text-[13px] font-medium mb-5">{isEn ? 'On all dark chocolates — Today only!' : 'على جميع أنواع الشوكولاتة الداكنة — اليوم فقط!'}</p>

                            <div className="flex items-center gap-4 flex-wrap">
                                {/* CTA Button */}
                                <Link to={isEn ? "/en/collections" : "/collections"} className="border-2 border-[#1a1a1a] text-[#1a1a1a] px-7 py-3 rounded-full text-[13px] font-bold hover:bg-[#1a1a1a] hover:text-white transition-colors flex items-center gap-2">
                                    {isEn ? 'Shop Offer' : 'تسوق العرض'} <span className="font-en">{isEn ? '→' : '←'}</span>
                                </Link>

                                {/* Shoppers Count */}
                                <span className="text-[#c0392b] text-[12px] font-bold">
                                    <span className="font-en">{new Intl.NumberFormat(isEn ? 'en-US' : 'ar-EG').format(243)}</span> {isEn ? 'People Shopping Now' : 'شخص يتسوق الأن'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Row 2: Large (right in RTL) + Small (left in RTL) */}
                <div className="flex flex-col md:flex-row gap-5">

                    {/* Card 3: Gift Voucher - wide */}
                    <div className="md:w-[65%] bg-[#dceee5] rounded-3xl p-7 lg:p-8 flex relative overflow-hidden min-h-[280px]">
                        {/* Gift Card Image area (right side) */}
                        <div className="absolute top-8 left-8 lg:left-16 w-[120px] h-[110px] lg:w-[160px] lg:h-[140px] flex items-center justify-center">
                            <div className="relative w-full h-full">
                                <div className="absolute w-[75%] h-[60%] bg-[#f5d98c] rounded-2xl transform rotate-[-12deg] shadow-lg top-[5%] right-[5%] border-2 border-[#d4a843]"></div>
                                <div className="absolute w-[75%] h-[60%] bg-[#ebc94a] rounded-2xl transform rotate-[10deg] shadow-md top-[18%] right-[18%] border-2 border-[#c9a832]"></div>
                            </div>
                        </div>

                        {/* Badge */}
                        <div className="flex flex-col justify-between h-full w-full relative z-10">
                            <div className="inline-flex self-start bg-[#295b45] text-white px-4 py-1.5 rounded-full text-[12px] font-bold items-center gap-1.5">
                                <span>🎁</span> {isEn ? 'Gift Voucher' : 'قسيمة هدية'}
                            </div>

                            {/* Content */}
                            <div className="mt-auto">
                                <h3 className="text-[24px] lg:text-[30px] font-black text-[#1a1a1a] leading-tight mb-2 max-w-[380px]">
                                    {isEn ? 'Gift Your Loved Ones a Voucher' : 'أهدِ من تحب قسيمة سعد الدين'}
                                </h3>
                                <p className="text-[#666] text-[13px] font-medium mb-5">{isEn ? 'Choose value, add message, send instantly' : 'اختار القيمة، أضف رسالتك، وارسلها فوراً'}</p>

                                {/* CTA Button */}
                                <Link to={isEn ? "/en/collections" : "/collections"} className="inline-flex bg-[#1a1a1a] text-white px-7 py-3 rounded-full text-[13px] font-bold hover:bg-[#333] transition-colors">
                                    {isEn ? 'Buy Voucher Now' : 'إشتري قسيمة الان'}
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Card 4: Premium Guest Package - narrow */}
                    <div className="md:w-[35%] bg-[#f5f0e8] rounded-3xl p-7 lg:p-8 flex flex-col relative overflow-hidden min-h-[280px]">
                        {/* Savings Badges */}
                        <div className="flex items-center gap-2 mb-5 flex-wrap">
                            <span className="bg-[#c0392b] text-white px-4 py-1.5 rounded-full text-[12px] font-bold flex items-center gap-1">
                                🔥 {isEn ? 'Savings Package' : 'باقة توفير'}
                            </span>
                            <span className="text-[#c0392b] text-[12px] font-bold">{isEn ? 'Save up to 20%' : 'وفر حتى ٢٠%'}</span>
                        </div>

                        {/* Title */}
                        <h3 className="text-[24px] lg:text-[28px] font-black text-[#1a1a1a] leading-tight mb-6">
                            {isEn ? 'Premium Guest Package' : 'باقة الضيوف الفاخرة'}
                        </h3>

                        {/* Product Thumbnails */}
                        <div className="flex gap-3 mb-6">
                            {['💐', '☕', '🍫'].map((emoji, i) => (
                                <div key={i} className="w-[60px] h-[60px] lg:w-[68px] lg:h-[68px] bg-white rounded-2xl flex items-center justify-center shadow-sm border border-gray-100">
                                    <span className="text-[26px]">{emoji}</span>
                                </div>
                            ))}
                        </div>

                        {/* CTA Button */}
                        <Link to={isEn ? "/en/collections" : "/collections"} className="inline-flex self-start bg-[#295b45] text-white px-7 py-3 rounded-full text-[13px] font-bold hover:bg-[#1e4534] transition-colors mt-auto">
                            {isEn ? 'Choose Package' : 'اختار الباقة'}
                        </Link>
                    </div>

                </div>
            </div>
        </section>
    );
}
