/**
 * No discount may reduce the price of a gift card.
 *
 * ── Why this has to be enforced rather than configured once ──
 *
 * The Saadeddin Gift Card is an ordinary product (`isGiftCard: false`) — its
 * codes are issued by an outside service, not by Shopify — so Shopify's own
 * rule that gift cards are never discounted does not apply to it. To Shopify
 * it is a cake. And 63 of the shop's 68 active discounts were set to "all
 * items", so a 50% code bought a 1000 SAR gift card for 500, loyalty points
 * turned into a cash-equivalent card, and the automatic EMPLOYEE25 took a
 * quarter off every gift card with no code at all.
 *
 * The fix is a collection, handle `discountable`: an automated collection whose
 * single rule is "product type is not Gift Card". Every discount targets it
 * instead of all items, so a gift-card-only cart gets nothing and a mixed cart
 * gets the discount on everything except the gift card. Shopify enforces that
 * at checkout, which is the point — a code typed into Shopify's own discount
 * box obeys it too.
 *
 * Discounts are created from FOUR places, and only one of them is this repo:
 *
 *   this storefront   «Loyalty Points Redemption»  loyalty.server.ts
 *   SDLP              «$X Loyalty Reward»           external
 *   the CRM           CREDIT-… store credit         external
 *   staff             promo codes                   Shopify admin
 *
 * Fixing our one would leave the other three reopening the hole the next
 * day. So `discounts/create` and `discounts/update` both land here, and any
 * basic discount found targeting all items is moved onto the collection
 * within seconds of being made, whoever made it.
 *
 * Our own update fires `discounts/update` in turn. That second delivery finds
 * the discount already on the collection and does nothing, so there is no
 * loop — the check is what makes it idempotent.
 */
import {getAdminDomain, getAdminToken} from './shopify-admin.server';

const ADMIN_API_VERSION = '2024-07';
export const DISCOUNTABLE_HANDLE = 'discountable';

/** The collection id changes only if someone deletes and recreates it. */
const COLLECTION_CACHE_TTL_MS = 60 * 60 * 1000;
let collectionCache: {id: string; at: number} | null = null;

async function adminGraphql(env: any, query: string, variables?: any) {
  const domain = getAdminDomain(env);
  const token = await getAdminToken(env);
  if (!domain || !token) throw new Error('Admin API credentials unavailable');
  const res = await fetch(
    `https://${domain}/admin/api/${ADMIN_API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify({query, variables}),
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!res.ok) throw new Error(`Admin API HTTP ${res.status}`);
  const json: any = await res.json();
  if (json?.errors?.length) {
    throw new Error(json.errors.map((e: any) => e.message).join('; '));
  }
  return json?.data;
}

/**
 * The Discountable collection's gid, or null if it does not exist.
 *
 * Looked up by handle rather than pinned in an env var, so nothing breaks
 * between environments and nobody has to remember to configure it. Null is
 * returned — never a guess — because every caller must refuse to proceed
 * without it: falling back to "all items" is exactly the hole being closed.
 */
export async function getDiscountableCollectionId(
  env: any,
): Promise<string | null> {
  if (collectionCache && Date.now() - collectionCache.at < COLLECTION_CACHE_TTL_MS) {
    return collectionCache.id;
  }
  const data = await adminGraphql(
    env,
    `query Discountable($handle: String!) {
      collectionByHandle(handle: $handle) { id }
    }`,
    {handle: DISCOUNTABLE_HANDLE},
  );
  const id = data?.collectionByHandle?.id || null;
  if (id) collectionCache = {id, at: Date.now()};
  return id;
}

/** The numeric id, for the REST price-rule API loyalty.server.ts uses. */
export async function getDiscountableCollectionNumericId(
  env: any,
): Promise<number | null> {
  const gid = await getDiscountableCollectionId(env);
  const n = gid ? Number(gid.split('/').pop()) : NaN;
  return Number.isFinite(n) ? n : null;
}

export type ScopeOutcome =
  | {action: 'restricted'; title: string}
  | {action: 'already-scoped' | 'not-applicable'; title?: string; reason: string}
  | {action: 'failed'; reason: string};

/**
 * Move one discount off "all items" and onto Discountable, if it is on all
 * items. Never throws — a webhook must answer 200 whatever happens here.
 *
 * Only BASIC discounts (percentage / fixed amount, code or automatic) are
 * touched. Buy X Get Y already names its items, free shipping cannot reduce
 * a gift card that does not ship, and app discounts are defined by their app.
 */
export async function restrictDiscountToDiscountable(
  env: any,
  discountGid: string,
): Promise<ScopeOutcome> {
  try {
    const isCode = discountGid.includes('/DiscountCodeNode/');
    const isAuto = discountGid.includes('/DiscountAutomaticNode/');
    if (!isCode && !isAuto) {
      return {action: 'not-applicable', reason: `unrecognised id ${discountGid}`};
    }

    const data = await adminGraphql(
      env,
      `query ReadScope($id: ID!) {
        node(id: $id) {
          ... on DiscountCodeNode {
            codeDiscount {
              __typename
              ... on DiscountCodeBasic { title customerGets { items { __typename } } }
            }
          }
          ... on DiscountAutomaticNode {
            automaticDiscount {
              __typename
              ... on DiscountAutomaticBasic { title customerGets { items { __typename } } }
            }
          }
        }
      }`,
      {id: discountGid},
    );

    const d = data?.node?.codeDiscount || data?.node?.automaticDiscount;
    if (!d) return {action: 'not-applicable', reason: 'discount not found'};

    const basic =
      d.__typename === 'DiscountCodeBasic' || d.__typename === 'DiscountAutomaticBasic';
    if (!basic) {
      return {action: 'not-applicable', title: d.title, reason: d.__typename};
    }

    if (d.customerGets?.items?.__typename !== 'AllDiscountItems') {
      return {
        action: 'already-scoped',
        title: d.title,
        reason: d.customerGets?.items?.__typename || 'unknown',
      };
    }

    const collectionId = await getDiscountableCollectionId(env);
    if (!collectionId) {
      return {
        action: 'failed',
        reason: `collection "${DISCOUNTABLE_HANDLE}" not found — this discount still applies to gift cards`,
      };
    }

    const items = {collections: {add: [collectionId]}};
    const result = isCode
      ? await adminGraphql(
          env,
          `mutation Scope($id: ID!, $d: DiscountCodeBasicInput!) {
            discountCodeBasicUpdate(id: $id, basicCodeDiscount: $d) {
              userErrors { message }
            }
          }`,
          {id: discountGid, d: {customerGets: {items}}},
        )
      : await adminGraphql(
          env,
          `mutation Scope($id: ID!, $d: DiscountAutomaticBasicInput!) {
            discountAutomaticBasicUpdate(id: $id, automaticBasicDiscount: $d) {
              userErrors { message }
            }
          }`,
          {id: discountGid, d: {customerGets: {items}}},
        );

    const errors =
      result?.discountCodeBasicUpdate?.userErrors ||
      result?.discountAutomaticBasicUpdate?.userErrors ||
      [];
    if (errors.length) {
      return {action: 'failed', reason: errors.map((e: any) => e.message).join('; ')};
    }
    return {action: 'restricted', title: d.title};
  } catch (err: any) {
    return {action: 'failed', reason: err?.message || String(err)};
  }
}
