export interface LoyaltyTier {
  name: 'Bronze' | 'Silver' | 'Gold';
  nameAr: string;
  levelTitleAr: string;
  levelTitleEn: string;
  code: 'BRONZE' | 'SILVER' | 'GOLD';
  minPoints: number;
  maxPoints: number | null;
  badgeBg: string;
  badgeTextColor: string;
  badgeBorderColor: string;
  iconColor: string;
}

export const LOYALTY_TIERS: LoyaltyTier[] = [
  {
    name: 'Bronze',
    nameAr: 'برونزي',
    levelTitleAr: 'المستوى البرونزي',
    levelTitleEn: 'Bronze Level',
    code: 'BRONZE',
    minPoints: 0,
    maxPoints: 999,
    badgeBg: 'bg-[#F9F1EA]',
    badgeTextColor: 'text-[#A85828]',
    badgeBorderColor: 'border-[#EAD5C5]',
    iconColor: '#A85828',
  },
  {
    name: 'Silver',
    nameAr: 'فضي',
    levelTitleAr: 'المستوى الفضي',
    levelTitleEn: 'Silver Level',
    code: 'SILVER',
    minPoints: 1000,
    maxPoints: 4999,
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
    minPoints: 5000,
    maxPoints: null,
    badgeBg: 'bg-[#FFF9E6]',
    badgeTextColor: 'text-[#B8860B]',
    badgeBorderColor: 'border-[#F0E1A1]',
    iconColor: '#B8860B',
  },
];

export function getLoyaltyTierInfo(points: number = 0, serverTierName?: string | null) {
  const safePoints = Math.max(0, Math.floor(Number(points) || 0));

  let currentTier: LoyaltyTier = LOYALTY_TIERS[0];
  let nextTier: LoyaltyTier | null = LOYALTY_TIERS[1];

  if (serverTierName) {
    const found = LOYALTY_TIERS.find(t => t.name.toLowerCase() === serverTierName.toLowerCase() || t.code.toLowerCase() === serverTierName.toLowerCase());
    if (found) {
      currentTier = found;
      if (found.code === 'GOLD') {
        nextTier = null;
      } else if (found.code === 'SILVER') {
        nextTier = LOYALTY_TIERS[2];
      } else {
        nextTier = LOYALTY_TIERS[1];
      }
    }
  } else {
    if (safePoints >= 5000) {
      currentTier = LOYALTY_TIERS[2]; // Gold
      nextTier = null;
    } else if (safePoints >= 1000) {
      currentTier = LOYALTY_TIERS[1]; // Silver
      nextTier = LOYALTY_TIERS[2]; // Gold
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
