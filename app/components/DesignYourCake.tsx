import { Link, useOutletContext } from 'react-router';
import { Button } from './layout/Button';
import { useI18n } from '~/lib/i18n';

export function DesignYourCake() {
    const { locale } = useOutletContext<{ locale: string }>();
    const t = useI18n(locale);
    const isEn = locale === 'en';

    return (
        <section className={`relative w-full bg-[#234745] overflow-hidden ${isEn ? 'font-en' : 'font-ar'} py-16 lg:py-24 my-8`} dir={isEn ? 'ltr' : 'rtl'}>

            {/* Abstract Background Pattern Overlay */}
            <div
                className="absolute inset-0 opacity-[0.04] pointer-events-none"
                style={{
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M54.627 0l1.43 1.43-23.86 23.861-1.43-1.43L54.627 0zm-49.254 0L6.803 1.43 30.664 25.291l-1.43 1.43L5.373 0zM30 30L5.373 54.627l1.43-1.43L30 29.336l23.197 23.86 1.43 1.43L30 30z\' fill=\'%23ffffff\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")',
                    backgroundSize: '120px'
                }}
            ></div>

            <div className="max-w-[1400px] mx-auto px-6 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-8 items-center lg:items-stretch min-h-[500px]">

                    {/* Left Column */}
                    <div className="flex flex-col justify-between items-start h-full gap-16 lg:gap-0 lg:pt-8 lg:pb-8">
                        {/* Top Floating Badge */}
                        <div className="bg-[#BBCFCD]/20 backdrop-blur-sm border border-white/10 rounded-[28px] px-8 py-5 flex flex-col items-center justify-center gap-1.5 shadow-lg max-w-[160px] mx-auto lg:mx-0 mr-auto lg:mr-24 relative">
                            <span className="text-[16px]">🎀</span>
                            <h4 className="text-white font-bold text-[18px] tracking-tight leading-none mb-1">{isEn ? 'Premium Wrapping' : 'تغليف فاخر'}</h4>
                            <span className="text-white/60 text-[13px] font-medium leading-none">{isEn ? 'Free' : 'مجاناً'}</span>
                        </div>

                        {/* Bottom Text Area */}
                        <div className={`text-white w-full max-w-[320px] mx-auto lg:mx-0 ${isEn ? 'text-left' : 'text-right'}`}>
                            <h5 className="font-bold text-[17px] mb-2 text-white/90">{isEn ? 'A cake exactly to your taste' : 'كيكة على ذوقك بالضبط'}</h5>
                            <h2 className="text-[48px] lg:text-[56px] font-black leading-[1.1] mb-5 tracking-tight">{isEn ? <>Your Cake<br />Your Touch</> : <>كيكتك<br />بلمستك</>}</h2>
                            <p className="text-[14px] leading-[1.8] text-white/80 font-medium">{isEn ? 'Choose flavor, shape, size, add your special message and Chef Saadeddin will make it with his own hands from finest ingredients & deliver fresh same day.' : 'اختار النكهة والشكل والحجم، وحط رسالتك المميزة وشيف سعد الدين يعملها بأيديه من أجود المكونات وتوصلك طازجة في نفس اليوم'}</p>
                        </div>
                    </div>

                    {/* Center Column (Cake & Title) */}
                    <div className="flex flex-col items-center justify-between h-full text-center relative z-20">
                        <div className="mb-8">
                            <h2 className="text-[42px] lg:text-[52px] font-black text-white leading-tight tracking-tight mb-2 drop-shadow-md">{t.homepage.buildYourOwnCake}</h2>
                            <p className="text-white/90 font-bold text-[16px] bg-white/10 inline-block px-5 py-1.5 rounded-full backdrop-blur-sm">{isEn ? 'Best Seller' : 'الأكثر مبيعاً'}</p>
                        </div>

                        {/* Cake Graphic */}
                        <div className="relative w-full max-w-[340px] aspect-square flex items-center justify-center mx-auto mb-8 lg:mb-12">
                            {/* Stand Glow */}
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[80%] h-6 bg-white/20 blur-xl rounded-full"></div>
                            {/* Stand Base */}
                            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[85%] h-8 bg-[#fdfdfd] rounded-[50%] shadow-[0_4px_15px_rgba(0,0,0,0.1)] border-b-4 border-gray-200"></div>
                            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[70%] h-8 bg-[#e8e8e8] rounded-[50%] z-0"></div>

                            {/* Cake Layers (Placeholder CSS Art for mock, easily replaceable by an img tag later) */}
                            <div className="relative z-10 flex flex-col items-center w-full mt-10">
                                {/* Top Tier */}
                                <div className="w-[45%] h-[50px] bg-[#BBCFCD]/60 rounded-[20px] relative z-30 shadow-[inset_0_-8px_0_rgba(0,0,0,0.08)] border-t-8 border-t-white">
                                    {/* Candles */}
                                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex gap-3">
                                        {[1, 2, 3, 4, 5].map(i => (
                                            <div key={i} className="w-2.5 h-10 bg-[#ff8f8f] rounded-full relative shadow-sm">
                                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-2 h-3 bg-[#ffe600] rounded-[50%_50%_50%_50%/60%_60%_40%_40%] animate-pulse"></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {/* Middle Tier */}
                                <div className="w-[65%] h-[60px] bg-[#BBCFCD]/80 rounded-[24px] relative z-20 -mt-4 shadow-[inset_0_-8px_0_rgba(0,0,0,0.08)] border-t-8 border-t-white flex items-center justify-center">
                                    <span className="text-white font-bold text-[11px] font-en tracking-wider drop-shadow-md">✨ Happy Birthday</span>
                                </div>
                                {/* Bottom Tier */}
                                <div className="w-[85%] h-[75px] bg-[#BBCFCD] rounded-[28px] relative z-10 -mt-4 shadow-[inset_0_-10px_0_rgba(0,0,0,0.1)] border-t-[10px] border-t-white"></div>
                            </div>
                        </div>

                        <Button
                            to={isEn ? "/en/collections" : "/collections"}
                            variant="light"
                            size="lg"
                            className="text-[#234745] w-[260px] shadow-xl hover:shadow-2xl"
                            rightIcon={<span className="text-xl">🎂</span>}
                        >
                            {isEn ? 'Start Designing Now' : 'إبدأ تصميمك الان'}
                        </Button>
                    </div>

                    {/* Right Column */}
                    <div className="flex flex-col justify-between items-start lg:items-end h-full gap-16 lg:gap-0 lg:pt-8 lg:pb-8">
                        {/* Top Floating Badge */}
                        <div className="bg-[#BBCFCD]/20 backdrop-blur-sm border border-white/10 rounded-[28px] px-8 py-5 flex flex-col items-center justify-center gap-1.5 shadow-lg max-w-[160px] mx-auto lg:mx-0 ml-auto lg:ml-24 relative">
                            <span className="text-[16px]">✏️</span>
                            <h4 className="text-white font-bold text-[18px] tracking-tight leading-none mb-1">{isEn ? 'Your Message' : 'رسالتك عليه'}</h4>
                            <span className="text-white/60 text-[13px] font-medium leading-none font-en">{isEn ? '100% Custom' : 'مخصص ١٠٠٪'}</span>
                        </div>

                        {/* Bottom Features List */}
                        <div className={`text-white w-full max-w-[320px] mx-auto lg:mx-0 flex flex-col ${isEn ? 'lg:items-start text-center lg:text-left' : 'lg:items-end text-center lg:text-right'}`}>
                            <h5 className={`font-bold text-[17px] mb-6 text-white leading-relaxed ${isEn ? 'border-l-4 lg:border-l-4 lg:border-r-0 pl-4 lg:pl-4 pr-0' : 'border-r-4 lg:border-r-0 lg:border-l-4 pr-4 lg:pr-0 lg:pl-4'} border-white`}>
                                {isEn ? <>Choose shape, flavor, colors and toppings<br />and add your special message</> : <>اختار الشكل والنكهة والألوان والتوبينج<br />وأضف رسالتك الخاصة</>}
                            </h5>

                            <ul className={`flex flex-col gap-4 ${isEn ? 'text-left items-start' : 'text-right items-end'} w-full`}>
                                {(isEn ? [
                                    '6 Different Shapes',
                                    '+10 Premium Flavors',
                                    'Custom Message',
                                    'Photo Printing'
                                ] : [
                                    '٦ أشكال مختلفة',
                                    '+١٠ نكهة فاخرة',
                                    'رسالة مخصصة',
                                    'طباعة صورة'
                                ]).map((item, index) => (
                                    <li key={index} className={`flex items-center ${isEn ? 'justify-start' : 'justify-end'} gap-3 text-[15px] font-bold text-white/95`}>
                                        {isEn && <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm text-black text-xs font-black">✓</div>}
                                        {item}
                                        {!isEn && <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm text-black text-xs font-black">✓</div>}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
}
