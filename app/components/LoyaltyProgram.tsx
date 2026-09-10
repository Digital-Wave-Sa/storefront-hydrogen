import { Link, useOutletContext } from 'react-router';
import { Button } from './layout/Button';
import { useI18n } from '~/lib/i18n';
import { LOYALTY_TIERS, getLoyaltyTierInfo } from '~/lib/loyalty-tiers';

/**
 * The balance on the illustrative card.
 *
 * Named, and everything on that card derived from it, because the card used to
 * state its tier and its progress independently: «Gold Tier», 2,456 points and
 * a bar hardcoded to 65%. Under Bronze/Silver/Gold, 2,456 points is Bronze --
 * so the card claimed a tier the pills beside it disprove. Whatever this number
 * becomes, the label and the bar now follow it.
 */
const DEMO_POINTS = 2456;

export function LoyaltyProgram() {
    const { locale } = useOutletContext<{ locale: string }>();
    const t = useI18n(locale);
    const isEn = locale === 'en';
    const demoTier = getLoyaltyTierInfo(DEMO_POINTS);

    return (
        <section
            className={`relative w-full bg-[#234745] overflow-hidden py-14 lg:py-16 ${isEn ? 'font-en' : 'font-ar'}`}
            dir={isEn ? 'ltr' : 'rtl'}
        >
            {/* Subtle geometric background pattern */}
            <div
                className="absolute inset-0 opacity-[0.04] pointer-events-none"
                style={{
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M20 0L40 20L20 40L0 20z\' fill=\'%23ffffff\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")',
                    backgroundSize: '60px',
                }}
            ></div>

            <div className="max-w-[1400px] mx-auto px-4 md:px-8 relative z-10">
                <div className={`flex flex-col-reverse ${isEn ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-10 lg:gap-16`}>

                    {/* Left Side: Loyalty Card Mockup */}
                    <div className={`lg:w-[35%] flex justify-center ${isEn ? 'lg:justify-end' : 'lg:justify-start'} shrink-0`}>
                        <div className="w-[220px] lg:w-[250px] bg-[#BBCFCD]/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden border border-white/10">
                            {/* Subtle card shine */}
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none rounded-3xl"></div>

                            <div className="relative z-10 flex flex-col items-center text-center">
                                {/* Medal */}
                                <span className="text-[32px] mb-2">🏅</span>

                                {/* Name */}
                                <h4 className="text-white font-bold text-[16px] mb-0.5">
                                    {isEn ? 'Ahmed Al-Ghamdi' : 'أحمد الغامدي'}
                                </h4>
                                <p className="text-[#a8d4be] text-[12px] font-medium mb-5">
                                    {isEn
                                        ? demoTier.tier.levelTitleEn
                                        : demoTier.tier.levelTitleAr}
                                </p>

                                {/* Points */}
                                <div className="text-white text-[48px] lg:text-[52px] font-black leading-none mb-1 font-en tracking-tight">
                                    {new Intl.NumberFormat('en-US').format(DEMO_POINTS)}
                                </div>
                                <p className="text-[#a8d4be] text-[13px] font-medium mb-5">
                                    {isEn ? 'Available Points' : 'نقطة متاحة'}
                                </p>

                                {/* Progress Bar */}
                                <div className="w-full bg-[#1e4534] rounded-full h-[6px] overflow-hidden mb-4">
                                    <div
                                        className="h-full bg-white/40 rounded-full"
                                        style={{width: `${demoTier.progressPercent}%`}}
                                    ></div>
                                </div>

                                {/* Card Number */}
                                <p className="text-white/40 text-[12px] font-en tracking-[3px] font-medium">
                                    ........ ........ {isEn ? '7841' : '7841'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Program Info */}
                    <div className={`lg:w-[65%] flex flex-col items-center ${isEn ? 'lg:items-start lg:text-left' : 'lg:items-end lg:text-right'} text-center`}>
                        {/* Top Badge */}
                        <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-sm text-white/90 px-5 py-2 rounded-full text-[13px] font-bold mb-6 border border-white/5">
                            <span>⭐</span> {t.homepage.loyaltyProgram}
                        </div>

                        {/* Heading */}
                        <h2 className="text-[32px] lg:text-[42px] font-black text-white leading-tight mb-4">
                            {t.homepage.earnPointsWithEveryOrder}
                        </h2>

                        {/* Subtitle */}
                        <p className="text-white/60 text-[15px] font-medium mb-8 max-w-[450px]">
                            {isEn ? 'Join Saad Eddin loyalty program and earn points on every purchase.' : 'انضم لبرنامج ولاء سعد الدين واكسب نقاطاً على كل عملية شراء.'}
                        </p>

                        {/* Tier Pills */}
                        <div className="flex items-center gap-3 mb-8 flex-wrap justify-center lg:justify-end">
                            {/*
                              Bronze / Silver / Gold, from the one tier table.

                              These pills were three hardcoded spans naming
                              Silver, Gold and Platinum -- a set that no longer
                              exists. Read from LOYALTY_TIERS so the homepage
                              cannot drift from the tiers the account page and
                              the badge actually award.
                            */}
                            {LOYALTY_TIERS.map((tier) => (
                                <span
                                    key={tier.code}
                                    className="bg-white/10 backdrop-blur-sm text-white px-5 py-2.5 rounded-full text-[13px] font-bold flex items-center gap-2 border border-white/5"
                                >
                                    <span
                                        aria-hidden="true"
                                        className="w-2.5 h-2.5 rounded-full shrink-0"
                                        style={{backgroundColor: tier.bgColor}}
                                    />
                                    {isEn ? tier.name : tier.nameAr}
                                </span>
                            ))}
                        </div>

                        {/* CTA Button */}
                        <Button
                            to={isEn ? "/en/account/register" : "/account/register"}
                            variant="light"
                            size="md"
                            className="bg-[#FEF8EB] text-[#1a1a1a] hover:bg-white"
                            icon={<span>⭐</span>}
                        >
                            {t.homepage.joinNowForFree}
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    );
}
