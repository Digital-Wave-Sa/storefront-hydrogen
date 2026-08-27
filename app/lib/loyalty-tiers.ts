export interface LoyaltyTier {
  name: 'Silver' | 'Gold' | 'Platinum';
  nameAr: string;
  levelTitleAr: string;
  levelTitleEn: string;
  code: 'SILVER' | 'GOLD' | 'PLATINUM';
  minPoints: number;
  maxPoints: number | null;
  bgColor: string;
  borderColor: string;
  badgeBg: string;
  badgeTextColor: string;
  badgeBorderColor: string;
  iconColor: string;
}

export const LOYALTY_TIERS: LoyaltyTier[] = [
  {
    name: 'Silver',
    nameAr: 'فضي',
    levelTitleAr: 'المستوى الفضي',
    levelTitleEn: 'Silver Tier',
    code: 'SILVER',
    minPoints: 0,
    maxPoints: 999,
    bgColor: '#9CA3AF',
    borderColor: '#B6BDC7',
    badgeBg: 'bg-[#F3F4F6]',
    badgeTextColor: 'text-[#4B5563]',
    badgeBorderColor: 'border-[#B6BDC7]',
    iconColor: '#9CA3AF',
  },
  {
    name: 'Gold',
    nameAr: 'ذهبي',
    levelTitleAr: 'المستوى الذهبي',
    levelTitleEn: 'Gold Tier',
    code: 'GOLD',
    minPoints: 1000,
    maxPoints: 4999,
    bgColor: '#C5A96A',
    borderColor: '#D8BE83',
    badgeBg: 'bg-[#FEF8EB]',
    badgeTextColor: 'text-[#8C6D2B]',
    badgeBorderColor: 'border-[#D8BE83]',
    iconColor: '#C5A96A',
  },
  {
    name: 'Platinum',
    nameAr: 'بلاتيني',
    levelTitleAr: 'المستوى البلاتيني',
    levelTitleEn: 'Platinum Tier',
    code: 'PLATINUM',
    minPoints: 5000,
    maxPoints: null,
    bgColor: '#234745',
    borderColor: '#3A6B66',
    badgeBg: 'bg-[#EBF2F0]',
    badgeTextColor: 'text-[#234745]',
    badgeBorderColor: 'border-[#3A6B66]',
    iconColor: '#234745',
  },
];

export function getLoyaltyTierInfo(points: number = 0, serverTierName?: string | null) {
  const safePoints = Math.max(0, Math.floor(Number(points) || 0));

  let currentTier: LoyaltyTier = LOYALTY_TIERS[0]; // Silver
  let nextTier: LoyaltyTier | null = LOYALTY_TIERS[1]; // Gold
  let matched = false;

  if (serverTierName) {
    const found = LOYALTY_TIERS.find(
      (t) =>
        t.name.toLowerCase() === serverTierName.toLowerCase() ||
        t.code.toLowerCase() === serverTierName.toLowerCase() ||
        (serverTierName.toLowerCase().includes('plat') && t.code === 'PLATINUM') ||
        (serverTierName.toLowerCase().includes('gold') && t.code === 'GOLD') ||
        (serverTierName.toLowerCase().includes('silver') && t.code === 'SILVER'),
    );
    if (found) {
      currentTier = found;
      matched = true;
      if (found.code === 'PLATINUM') {
        nextTier = null;
      } else if (found.code === 'GOLD') {
        nextTier = LOYALTY_TIERS[2]; // Platinum
      } else {
        nextTier = LOYALTY_TIERS[1]; // Gold
      }
    }
  }

  if (!matched) {
    if (safePoints >= 5000) {
      currentTier = LOYALTY_TIERS[2]; // Platinum
      nextTier = null;
    } else if (safePoints >= 1000) {
      currentTier = LOYALTY_TIERS[1]; // Gold
      nextTier = LOYALTY_TIERS[2]; // Platinum
    } else {
      currentTier = LOYALTY_TIERS[0]; // Silver
      nextTier = LOYALTY_TIERS[1]; // Gold
    }
  }

  const nextTierMinPoints = nextTier ? nextTier.minPoints : 5000;
  const pointsToNextTier = nextTier ? Math.max(0, nextTierMinPoints - safePoints) : 0;

  const currentTierMin = currentTier.minPoints;
  const range = nextTierMinPoints - currentTierMin;
  const progressInTier = safePoints - currentTierMin;
  const progressPercent = nextTier
    ? Math.min(100, Math.max(0, Math.round((progressInTier / range) * 100)))
    : 100;

  return {
    points: safePoints,
    tier: currentTier,
    nextTier,
    pointsToNextTier,
    progressPercent,
  };
}
