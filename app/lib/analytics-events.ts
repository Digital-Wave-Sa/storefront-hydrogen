import {getStoredConsent} from '~/components/CookieConsentBanner';

/**
 * The events GTM was never given.
 *
 * `GTMAnalytics.tsx` covers the GA4 commerce funnel -- view_item through
 * purchase -- because Hydrogen's `useAnalytics` fires those for us. Three kinds
 * of thing this storefront does are invisible to it, and were reported as «GTM
 * isn't loading» when in fact the container loads fine and these events simply
 * did not exist:
 *
 *   - promotions: the offers on /promotions are content, not Shopify line
 *     items, so nothing in the commerce funnel ever sees them.
 *   - loyalty: points redeemed against a cart are a discount code and a cart
 *     attribute, neither of which is an event.
 *   - branch selection: the single most consequential choice a shopper makes
 *     here -- it sets the fee, the slots and the catalogue -- and it was not
 *     recorded anywhere.
 *
 * Kept in their own module rather than added to `GTMAnalytics.tsx` so that
 * component, which is mounted once and drives the whole funnel, is not touched
 * to add these. They are plain functions rather than the `window.__ga4*`
 * globals that file uses, because these call sites can import.
 *
 * Every one of them is best-effort by design: a call site is a cart handler or
 * a checkout button, and analytics must never be the reason one of those
 * throws. `safePush` swallows everything.
 */
function safePush(event: Record<string, unknown>): void {
  try {
    if (typeof window === 'undefined') return;
    if (getStoredConsent() !== 'accepted') return;

    const w = window as any;
    w.dataLayer = w.dataLayer || [];
    // GA4 wants the previous ecommerce object cleared before the next one.
    w.dataLayer.push({ecommerce: null});
    w.dataLayer.push(event);
  } catch (e) {
    // Deliberately silent. Nothing a shopper is doing should fail because a
    // tag did.
  }
}

function lang(): string {
  try {
    return document.documentElement.lang || 'ar';
  } catch {
    return 'ar';
  }
}

export type PromotionInput = {
  /** The offer's metaobject handle -- stable, unlike the title. */
  id?: string | null;
  name?: string | null;
  /** Where it was shown: 'hero', 'featured', 'card', 'cart_badge'. */
  slot?: string | null;
  /** The discount code it carries, when it advertises one. */
  code?: string | null;
};

function mapPromotion(promo: PromotionInput, index = 0) {
  return {
    promotion_id: String(promo?.id ?? ''),
    promotion_name: String(promo?.name ?? ''),
    creative_slot: String(promo?.slot ?? ''),
    ...(promo?.code ? {coupon: String(promo.code)} : {}),
    index: index + 1,
  };
}

/** GA4 `view_promotion` -- an offer was rendered where a shopper could see it. */
export function trackViewPromotion(
  promos: PromotionInput | PromotionInput[],
): void {
  const list = Array.isArray(promos) ? promos : [promos];
  const items = list.filter(Boolean).map((p, i) => mapPromotion(p, i));
  if (!items.length) return;

  safePush({
    event: 'view_promotion',
    language: lang(),
    ecommerce: {items},
  });
}

/** GA4 `select_promotion` -- a shopper clicked through to the offer. */
export function trackSelectPromotion(promo: PromotionInput): void {
  if (!promo) return;
  safePush({
    event: 'select_promotion',
    language: lang(),
    ecommerce: {items: [mapPromotion(promo, 0)]},
  });
}

/**
 * `loyalty_redeem` -- custom; GA4 has no loyalty event.
 *
 * `value` is the riyal amount taken off the cart, so the event is worth
 * something in reporting rather than being a bare count of points.
 */
export function trackLoyaltyRedeem(params: {
  points: number;
  value: number;
  code?: string | null;
  currency?: string;
}): void {
  const points = Number(params?.points) || 0;
  if (points <= 0) return;

  safePush({
    event: 'loyalty_redeem',
    language: lang(),
    points,
    value: Number(params?.value) || 0,
    currency: params?.currency || 'SAR',
    ...(params?.code ? {coupon: String(params.code)} : {}),
    ecommerce: null,
  });
}

/**
 * `select_branch` -- custom, and the one this storefront most needed.
 *
 * Which branch, and whether they are collecting or having it delivered,
 * determines the fee, the time slots and what is even in stock. Reporting that
 * splits every other metric by something the shop actually controls.
 */
export function trackSelectBranch(params: {
  branchId?: string | null;
  branchName?: string | null;
  fulfillmentType?: string | null;
  /** 'header', 'cart', 'cake_builder' -- where the picker was opened from. */
  source?: string | null;
  deliveryFee?: number | null;
}): void {
  const name = String(params?.branchName ?? '').trim();
  if (!name) return;

  safePush({
    event: 'select_branch',
    language: lang(),
    branch_id: String(params?.branchId ?? '').split('/').pop() || '',
    branch_name: name,
    fulfillment_type: String(params?.fulfillmentType ?? '').toLowerCase(),
    ...(params?.source ? {source: String(params.source)} : {}),
    ...(typeof params?.deliveryFee === 'number'
      ? {delivery_fee: params.deliveryFee}
      : {}),
    ecommerce: null,
  });
}
