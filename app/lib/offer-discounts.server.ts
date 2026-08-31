/**
 * Offer products, resolved from the Shopify discount that actually grants them.
 *
 * A promotion has two halves that must agree: the products a page advertises,
 * and the products the cart discounts. Deriving the first from product tags kept
 * them separate — a tag said "show this under 25% off" while a discount decided
 * what to charge, and nothing tied the two together.
 *
 * Here the discount IS the source. We look up discounts by their own tag (added
 * to every discount type in Admin API 2026-04) and read the entitled products
 * straight off `customerGets`. A product can only appear in an offer if Shopify
 * will genuinely discount it, because it is the same object answering both
 * questions.
 *
 * Admin API only — discount tags are not exposed on the Storefront API — so this
 * is server-side and must never be called from a browser or app bundle. The app
 * reaches it through the `/api/offers` route.
 */

import {getAdminToken, getAdminDomain} from '~/lib/shopify-admin.server';

/** `tags` on discounts requires 2026-04 or later. */
const ADMIN_API_VERSION = '2026-04';

/** Cache resolved offers briefly — merchants edit discounts rarely. */
const offerCache = new Map<string, {value: OfferData; expires: number}>();
const OFFER_TTL_MS = 5 * 60 * 1000;
offerCache.clear();

export interface OfferProductRef {
  /** Admin GID, e.g. gid://shopify/Product/123 */
  id: string;
  handle?: string;
  title?: string;
  /**
   * Which side of a Buy X Get Y discount this product sits on.
   *
   * - `buy`  — the customer adds this to qualify
   * - `get`  — this is the discounted/free item
   * - `both` — classic 1+1 on the same product
   *
   * Always `get` for a plain percentage discount, where there is nothing to buy
   * first. The offer page uses it to label the free item.
   */
  role?: 'buy' | 'get' | 'both';
}

export interface OfferData {
  /** The tag that was looked up. */
  tag: string;
  /** Discount title as the merchant named it in Shopify. */
  title?: string;
  /** Shopify's own human summary, e.g. "25% off products". */
  summary?: string;
  /** First code, when it is a code discount rather than an automatic one. */
  code?: string;
  /** ISO end date, suitable for a countdown. Absent when open-ended. */
  endsAt?: string;
  startsAt?: string;
  /** Products the discount applies to, resolved from products and collections. */
  products: OfferProductRef[];
  /** True when this is a Buy X Get Y promotion (the two sides may differ). */
  isBxgy: boolean;
  /** Collection GIDs the discount targets, when it targets collections. */
  collectionIds: string[];
  /** True when the discount applies to the entire catalogue. */
  allProducts: boolean;
  /** Why a lookup came back empty. Surfaced only via ?debug=offers. */
  diagnostic?: {
    searched: string[];
    adminConfigured: boolean;
    apiVersion: string;
    matchedDiscounts: number;
    statuses: string[];
    errors: string[];
    itemTypenames?: string[];
    resolvedProductIds?: string[];
    resolvedCollectionIds?: string[];
  };
}

const EMPTY = (tag: string): OfferData => ({
  tag,
  products: [],
  collectionIds: [],
  allProducts: false,
  isBxgy: false,
});

async function adminGraphql<T = any>(
  env: any,
  query: string,
  variables: Record<string, any> = {},
  errors: string[] = [],
): Promise<T | null> {
  const adminToken = await getAdminToken(env);
  const adminDomain = getAdminDomain(env);
  if (!adminToken || !adminDomain) {
    const msg = `Admin credentials missing (token: ${adminToken ? 'yes' : 'no'}, domain: ${adminDomain ? 'yes' : 'no'})`;
    console.error('[offers]', msg);
    errors.push(msg);
    return null;
  }

  const res = await fetch(
    `https://${adminDomain}/admin/api/${ADMIN_API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': adminToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({query, variables}),
    },
  );

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const msg = `HTTP ${res.status} ${body.slice(0, 300)}`;
    console.error('[offers] Admin GraphQL error:', msg);
    errors.push(msg);
    return null;
  }

  const json = (await res.json()) as any;
  if (json.errors?.length) {
    const msg = JSON.stringify(json.errors).slice(0, 500);
    console.error('[offers] Admin GraphQL errors:', msg);
    errors.push(msg);
  }
  return json.data ?? null;
}

/**
 * `customerGets.items` is a union. Products carry their variants' parents,
 * collections are resolved separately, and `AllDiscountItems` means everything.
 */
const ITEMS_FRAGMENT = `
  items {
    __typename
    ... on DiscountProducts {
      products(first: 250) { nodes { id handle title } }
      productVariants(first: 250) {
        nodes { id product { id handle title } }
      }
    }
    ... on DiscountCollections {
      collections(first: 50) { nodes { id } }
    }
  }
`;

const OFFER_BY_TAG_QUERY = `
  query offerByTag($query: String!) {
    discountNodes(first: 10, query: $query) {
      nodes {
        id
        discount {
          __typename
          ... on DiscountCodeBasic {
            title
            summary
            status
            startsAt
            endsAt
            codes(first: 1) { nodes { code } }
            customerGets { ${ITEMS_FRAGMENT} }
          }
          ... on DiscountAutomaticBasic {
            title
            summary
            status
            startsAt
            endsAt
            customerGets { ${ITEMS_FRAGMENT} }
          }
          ... on DiscountCodeBxgy {
            title
            summary
            status
            startsAt
            endsAt
            codes(first: 1) { nodes { code } }
            customerBuys { ${ITEMS_FRAGMENT} }
            customerGets { ${ITEMS_FRAGMENT} }
          }
          ... on DiscountAutomaticBxgy {
            title
            summary
            status
            startsAt
            endsAt
            customerBuys { ${ITEMS_FRAGMENT} }
            customerGets { ${ITEMS_FRAGMENT} }
          }
        }
      }
    }
  }
`;

/** Collapse a discount's item union into product refs and collection ids. */
function readItems(items: any): {
  products: OfferProductRef[];
  collectionIds: string[];
  allProducts: boolean;
} {
  const products = new Map<string, OfferProductRef>();
  const collectionIds: string[] = [];

  if (!items) return {products: [], collectionIds, allProducts: false};

  if (items.__typename === 'AllDiscountItems') {
    return {products: [], collectionIds, allProducts: true};
  }

  for (const node of items.products?.nodes || []) {
    if (node?.id) {
      products.set(node.id, {id: node.id, handle: node.handle, title: node.title});
    }
  }

  // A discount can name individual variants; the offer page lists whole products.
  for (const node of items.productVariants?.nodes || []) {
    const p = node?.product;
    if (p?.id && !products.has(p.id)) {
      products.set(p.id, {id: p.id, handle: p.handle, title: p.title});
    }
  }

  for (const node of items.collections?.nodes || []) {
    if (node?.id) collectionIds.push(node.id);
  }

  return {products: [...products.values()], collectionIds, allProducts: false};
}

/**
 * Resolve the offer behind a discount tag.
 *
 * `activeOnly` keeps expired and scheduled promotions off the storefront, so a
 * page never advertises a discount the cart would refuse.
 */
export async function fetchOfferByTag(
  env: any,
  tag: string,
  options: {activeOnly?: boolean} = {},
): Promise<OfferData> {
  const cleanTag = String(tag || '').trim();
  if (!cleanTag) return EMPTY(cleanTag);

  const activeOnly = options.activeOnly !== false;
  const cacheKey = `${cleanTag}:${activeOnly}`;

  const cached = offerCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.value;

  // Quote the tag so spellings with spaces or punctuation survive the search.
  const search = activeOnly
    ? `tag:'${cleanTag}' AND status:active`
    : `tag:'${cleanTag}'`;

  const errors: string[] = [];
  const data = await adminGraphql(
    env,
    OFFER_BY_TAG_QUERY,
    {query: search},
    errors,
  );
  const nodes = data?.discountNodes?.nodes || [];

  const merged = EMPTY(cleanTag);
  merged.diagnostic = {
    searched: [search],
    adminConfigured: !errors.some((e) => e.startsWith('Admin credentials')),
    apiVersion: ADMIN_API_VERSION,
    matchedDiscounts: nodes.length,
    statuses: nodes.map((n: any) => n?.discount?.status).filter(Boolean),
    errors,
  };
  const seen = new Map<string, OfferProductRef>();

  for (const node of nodes) {
    const d = node?.discount;
    if (!d) continue;
    if (activeOnly && d.status && d.status !== 'ACTIVE') continue;

    merged.title = merged.title || d.title || undefined;
    merged.summary = merged.summary || d.summary || undefined;
    merged.code = merged.code || d.codes?.nodes?.[0]?.code || undefined;
    merged.startsAt = merged.startsAt || d.startsAt || undefined;

    // Several discounts under one tag: the offer ends when the last one does.
    if (d.endsAt && (!merged.endsAt || d.endsAt > merged.endsAt)) {
      merged.endsAt = d.endsAt;
    }

    const isBxgy = String(d.__typename || '').includes('Bxgy');
    if (isBxgy) merged.isBxgy = true;

    /**
     * A Buy X Get Y discount has two sides and only `customerGets` is the free
     * item. Reading `customerGets` alone would list the freebie on a "buy one
     * get one" page while hiding the product the shopper has to add — so take
     * both, and tag each product with the side it came from.
     */
    const gets = readItems(d.customerGets?.items);
    const buys = isBxgy
      ? readItems(d.customerBuys?.items)
      : {products: [], collectionIds: [], allProducts: false};

    if (gets.allProducts || buys.allProducts) merged.allProducts = true;

    const record = (p: OfferProductRef, role: 'buy' | 'get') => {
      const existing = seen.get(p.id);
      if (!existing) {
        seen.set(p.id, {...p, role});
      } else if (existing.role && existing.role !== role) {
        existing.role = 'both';
      }
    };

    for (const p of buys.products) record(p, 'buy');
    for (const p of gets.products) record(p, 'get');

    for (const id of [...buys.collectionIds, ...gets.collectionIds]) {
      if (!merged.collectionIds.includes(id)) merged.collectionIds.push(id);
    }
  }

  merged.products = [...seen.values()];
  if (merged.diagnostic) {
    merged.diagnostic.itemTypenames = nodes
      .map((n: any) => n?.discount?.customerGets?.items?.__typename)
      .filter(Boolean);
    merged.diagnostic.resolvedProductIds = merged.products.map((p) => p.id);
    merged.diagnostic.resolvedCollectionIds = merged.collectionIds;
  }
  offerCache.set(cacheKey, {value: merged, expires: Date.now() + OFFER_TTL_MS});
  return merged;
}

/**
 * Look a tag up across several spellings, returning the first that resolves to
 * anything. Lets a merchant tag a discount `gifts25` or `25-off` interchangeably.
 */
export async function fetchOfferByTags(
  env: any,
  tags: string[],
  options: {activeOnly?: boolean} = {},
): Promise<OfferData> {
  const attempts: OfferData['diagnostic'][] = [];

  for (const tag of tags) {
    const offer = await fetchOfferByTag(env, tag, options);
    if (offer.diagnostic) attempts.push(offer.diagnostic);
    if (offer.products.length > 0 || offer.collectionIds.length > 0 || offer.allProducts) {
      return offer;
    }
  }

  const empty = EMPTY(tags[0] || '');
  empty.diagnostic = {
    searched: attempts.flatMap((a) => a?.searched || []),
    adminConfigured: attempts.every((a) => a?.adminConfigured !== false),
    apiVersion: ADMIN_API_VERSION,
    matchedDiscounts: attempts.reduce((n, a) => n + (a?.matchedDiscounts || 0), 0),
    statuses: attempts.flatMap((a) => a?.statuses || []),
    errors: attempts.flatMap((a) => a?.errors || []),
    itemTypenames: attempts.flatMap((a) => a?.itemTypenames || []),
    resolvedProductIds: attempts.flatMap((a) => a?.resolvedProductIds || []),
    resolvedCollectionIds: attempts.flatMap((a) => a?.resolvedCollectionIds || []),
  };
  return empty;
}

/** Numeric id from an Admin GID, for comparing against Storefront ids. */
export function numericId(gid: string): string {
  return String(gid || '').split('/').pop() || '';
}

/** Clear the in-process cache — used by tests and after a webhook. */
export function clearOfferCache(): void {
  offerCache.clear();
}
