export interface LoyaltyTier {
  name: 'Bronze' | 'Silver' | 'Gold';
  nameAr: string;
  levelTitleAr: string;
  levelTitleEn: string;
  code: 'BRONZE' | 'SILVER' | 'GOLD';
  minPoints: number;
  maxPoints: number | null;
  bgColor: string;
  borderColor: string;
  badgeBg: string;
  badgeTextColor: string;
  badgeBorderColor: string;
  iconColor: string;
}

/**
 * ── Redemption quantity rules ────────────────────────────────────────────
 *
 * Shared by the cart, the account page and both server routes, so there is
 * exactly one place to change when SDLP does.
 *
 * SDLP rejects any redemption that is not a multiple of 100 ("Points must be
 * redeemed in increments of 100"), so the storefront has to match it. This is
 * not our rule and we do not want it: a customer holding 1560 points is shown
 * 15.60 SAR by the loyalty panel and can only spend 15.00, and the remaining
 * 60 are stranded until their balance happens to cross the next hundred.
 *
 * The backend is removing it. When that lands, set the flag to false — the
 * step becomes 1, every screen follows, and nothing else needs touching. Do
 * not delete the flag before the CRM is confirmed changed: without it the
 * cart submits values SDLP will refuse, which is the bug this replaced.
 */
export const SDLP_REQUIRES_MULTIPLES_OF_100 = true;

/** Smallest redemption the programme allows, in points. */
export const MIN_REDEEMABLE_POINTS = 100;

/** The granularity a redemption must land on. */
export const POINT_REDEEM_STEP = SDLP_REQUIRES_MULTIPLES_OF_100 ? 100 : 1;

/**
 * The largest valid redemption at or below `points`.
 *
 * Always floors to a whole number, flag or no flag: balances come back
 * fractional (63564.8) and 635.648 SAR is three decimals where Shopify's
 * fixed-amount discount takes two. The fraction rounds to the store's side.
 */
export function floorToRedeemablePoints(points: number): number {
  if (!Number.isFinite(points) || points <= 0) return 0;
  return Math.floor(Math.floor(points) / POINT_REDEEM_STEP) * POINT_REDEEM_STEP;
}

/**
 * Bronze / Silver / Gold.
 *
 * Replaces Silver / Gold / Platinum, which ran on far smaller numbers --
 * 0-999, 1,000-4,999, 5,000+. Both the names and the thresholds moved, so a
 * customer's tier under the old scheme says nothing about their tier under
 * this one: 2,000 points was Gold and is now Bronze.
 *
 * The boundaries are inclusive as the programme states them: «up to 25,000»,
 * «25,001 to 50,000», «more than 50,000».
 */
export const LOYALTY_TIERS: LoyaltyTier[] = [
  {
    name: 'Bronze',
    nameAr: 'برونزي',
    levelTitleAr: 'المستوى البرونزي',
    levelTitleEn: 'Bronze Tier',
    code: 'BRONZE',
    minPoints: 0,
    maxPoints: 25000,
    bgColor: '#A9744F',
    borderColor: '#C08B62',
    badgeBg: 'bg-[#FBF1EA]',
    badgeTextColor: 'text-[#7A5235]',
    badgeBorderColor: 'border-[#C08B62]',
    iconColor: '#A9744F',
  },
  {
    name: 'Silver',
    nameAr: 'فضي',
    levelTitleAr: 'المستوى الفضي',
    levelTitleEn: 'Silver Tier',
    code: 'SILVER',
    minPoints: 25001,
    maxPoints: 50000,
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
    minPoints: 50001,
    maxPoints: null,
    bgColor: '#C5A96A',
    borderColor: '#D8BE83',
    badgeBg: 'bg-[#FEF8EB]',
    badgeTextColor: 'text-[#8C6D2B]',
    badgeBorderColor: 'border-[#D8BE83]',
    iconColor: '#C5A96A',
  },
];

/** The tier a points balance falls in, by the thresholds above. */
function tierForPoints(points: number): LoyaltyTier {
  for (let i = LOYALTY_TIERS.length - 1; i >= 0; i--) {
    if (points >= LOYALTY_TIERS[i].minPoints) return LOYALTY_TIERS[i];
  }
  return LOYALTY_TIERS[0];
}

export function getLoyaltyTierInfo(
  points: number = 0,
  serverTierName?: string | null,
) {
  const safePoints = Math.max(0, Math.floor(Number(points) || 0));

  /**
   * Points decide the tier. The CRM's own tier name is only ever a tie-break.
   *
   * `/loyalty` returns a `tier.name` and this used to prefer it over the
   * balance whenever it matched anything -- including a loose «contains gold»
   * test. That was survivable while both sides ran the same thresholds. It is
   * not now: the CRM may still be on the old scheme, where GOLD meant 1,000
   * points, and a customer with 2,000 points would be shown Gold here when
   * this programme puts them in Bronze. The storefront would be contradicting
   * the rule printed beside it.
   *
   * So the balance is authoritative, and the server name is accepted only when
   * it names one of these three tiers AND agrees with the balance -- which
   * makes it a no-op today and a safety net once the CRM is migrated. The
   * loose substring matching is gone; «PLATINUM» no longer resolves to
   * anything, which is correct, because it no longer exists.
   */
  const byPoints = tierForPoints(safePoints);
  let currentTier = byPoints;

  if (serverTierName) {
    const wanted = String(serverTierName).trim().toUpperCase();
    const found = LOYALTY_TIERS.find(
      (t) => t.code === wanted || t.name.toUpperCase() === wanted,
    );
    if (found && found.code === byPoints.code) {
      currentTier = found;
    }
  }

  const currentIndex = LOYALTY_TIERS.findIndex(
    (t) => t.code === currentTier.code,
  );
  const nextTier: LoyaltyTier | null =
    currentIndex >= 0 && currentIndex < LOYALTY_TIERS.length - 1
      ? LOYALTY_TIERS[currentIndex + 1]
      : null;

  const pointsToNextTier = nextTier
    ? Math.max(0, nextTier.minPoints - safePoints)
    : 0;

  /**
   * Progress through the current tier, not through the whole programme.
   *
   * Guarded against a zero range so a malformed tier table can never divide by
   * zero and render NaN% into the bar's width.
   */
  let progressPercent = 100;
  if (nextTier) {
    const range = nextTier.minPoints - currentTier.minPoints;
    const progressInTier = safePoints - currentTier.minPoints;
    progressPercent =
      range > 0
        ? Math.min(100, Math.max(0, Math.round((progressInTier / range) * 100)))
        : 0;
  }

  return {
    points: safePoints,
    tier: currentTier,
    nextTier,
    pointsToNextTier,
    progressPercent,
  };
}
