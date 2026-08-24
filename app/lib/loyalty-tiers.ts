export interface LoyaltyTier {
  name: 'Silver' | 'Gold' | 'Platinum';
  nameAr: string;
  levelTitleAr: string;
  levelTitleEn: string;
  code: 'SILVER' | 'GOLD' | 'PLATINUM';
  minPoints: number;
  maxPoints: number | null;
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
    levelTitleEn: 'Silver Level',
    code: 'SILVER',
    minPoints: 0,
    maxPoints: 999,
    badgeBg: 'bg-[#F1F5F4]',
    badgeTextColor: 'text-[#4A607A]',
    badgeBorderColor: 'border-[#CBD7DB]',
    iconColor: '#4A607A',
  },
  {
    name: 'Gold',
    nameAr: 'ذهبي',
    levelTitleAr: 'المستوى الذهبي',
    levelTitleEn: 'Gold Level',
    code: 'GOLD',
    minPoints: 1000,
    maxPoints: 4999,
    badgeBg: 'bg-[#FFF9E6]',
    badgeTextColor: 'text-[#B8860B]',
    badgeBorderColor: 'border-[#F0E1A1]',
    iconColor: '#B8860B',
  },
  {
    name: 'Platinum',
    nameAr: 'بلاتيني',
    levelTitleAr: 'المستوى البلاتيني',
    levelTitleEn: 'Platinum Level',
    code: 'PLATINUM',
    minPoints: 5000,
    maxPoints: null,
    badgeBg: 'bg-[#F0F4F8]',
    badgeTextColor: 'text-[#243B53]',
    badgeBorderColor: 'border-[#BCCCDC]',
    iconColor: '#334E68',
  },
];

export function getLoyaltyTierInfo(points: number = 0, serverTierName?: string | null) {
  const safePoints = Math.max(0, Math.floor(Number(points) || 0));

  let currentTier: LoyaltyTier = LOYALTY_TIERS[0]; // Silver
  let nextTier: LoyaltyTier | null = LOYALTY_TIERS[1]; // Gold

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
      if (found.code === 'PLATINUM') {
        nextTier = null;
      } else if (found.code === 'GOLD') {
        nextTier = LOYALTY_TIERS[2]; // Platinum
      } else {
        nextTier = LOYALTY_TIERS[1]; // Gold
      }
    }
  } else {
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
