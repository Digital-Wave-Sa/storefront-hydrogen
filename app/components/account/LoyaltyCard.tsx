import { getLoyaltyTierInfo } from '~/lib/loyalty-tiers';

const lpPatternBg = '/images/loyality-points/LP-bg-badge.svg';

export function LoyaltyCard({
  loyaltyPoints = null,
  isEn = false,
  className = '',
}: {
  /**
   * null when the balance could not be established. A tier is a claim about
   * the customer, so it is not asserted from a number we do not have — this
   * card used to badge an unreachable lookup as "المستوى الفضي، 0 نقطة".
   */
  loyaltyPoints: number | null;
  isEn: boolean;
  className?: string;
}) {
  const pointsKnown =
    typeof loyaltyPoints === 'number' && Number.isFinite(loyaltyPoints);
  const tierInfo = getLoyaltyTierInfo(pointsKnown ? loyaltyPoints : 0);
  const formattedPoints = pointsKnown
    ? loyaltyPoints.toLocaleString('en-US')
    : '—';

  // Luxury gradient & border styles per tier matching brand design
  const tierStyles: Record<string, { gradient: string; border: string }> = {
    SILVER: {
      gradient: 'from-[#9CA3AF] via-[#A8B0BC] to-[#88909C]',
      border: 'border-[#B6BDC7]',
    },
    GOLD: {
      gradient: 'from-[#C5A96A] via-[#D8BE83] to-[#B59654]',
      border: 'border-[#D8BE83]',
    },
    PLATINUM: {
      gradient: 'from-[#234745] via-[#2F5B58] to-[#183432]',
      border: 'border-[#3A6B66]',
    },
  };

  const currentStyle = tierStyles[tierInfo.tier.code] || tierStyles.SILVER;

  return (
    <div className={`relative w-full rounded-[16px] p-5 text-white shadow-md overflow-hidden bg-gradient-to-r ${currentStyle.gradient} border ${currentStyle.border} transition-all duration-300 ${className}`}>
      {/* Background Pattern Layer */}
      <div
        className="absolute inset-0 pointer-events-none opacity-25 bg-repeat bg-center"
        style={{ backgroundImage: `url(${lpPatternBg})`, backgroundSize: '140px 140px' }}
      />

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
        
        {/* Progress Ring & Icon Section */}
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative w-16 h-16 md:w-20 md:h-20 flex-shrink-0 flex items-center justify-center">
            {/* SVG Circular Progress Ring */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-white/20"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-white transition-all duration-700 ease-out"
                strokeDasharray={`${tierInfo.progressPercent}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            {/* Center Star */}
            <div className="absolute inset-0 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#FFFFFF" className="w-6 h-6 md:w-8 md:h-8 drop-shadow-md">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
            </div>
          </div>

          {/* Tier Name & Subtext */}
          <div className="text-start">
            <h3 className="text-xl md:text-2xl font-bold leading-tight tracking-wide text-white drop-shadow-sm">
              {pointsKnown
                ? (isEn ? tierInfo.tier.levelTitleEn : tierInfo.tier.levelTitleAr)
                : (isEn ? 'Loyalty' : 'برنامج الولاء')}
            </h3>
            <p className="text-xs md:text-sm text-white/90 font-medium mt-1">
              {!pointsKnown ? (
                isEn
                  ? 'Your points are unavailable right now. Please try again shortly.'
                  : 'تعذّر عرض نقاطك حالياً. يرجى المحاولة بعد قليل.'
              ) : tierInfo.nextTier ? (
                isEn
                  ? `${tierInfo.pointsToNextTier.toLocaleString('en-US')} points away from ${tierInfo.nextTier.levelTitleEn}`
                  : `${tierInfo.pointsToNextTier.toLocaleString('en-US')} نقطة تفصلك عن ${tierInfo.nextTier.levelTitleAr}`
              ) : (
                isEn ? 'Top Platinum Level Unlocked! ★★★' : 'أعلى مستوى بلاتيني مفعّل! ★★★'
              )}
            </p>
          </div>
        </div>

        {/* Total Points Display */}
        <div className="text-end md:text-end w-full md:w-auto flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 border-white/20 pt-3 md:pt-0">
          <div className="text-2xl md:text-3xl font-extrabold text-white tracking-wider drop-shadow-sm font-en">
            {formattedPoints} <span className="text-sm md:text-base font-medium">{isEn ? 'Points' : 'نقطة'}</span>
          </div>
        </div>

      </div>
    </div>
  );
}
