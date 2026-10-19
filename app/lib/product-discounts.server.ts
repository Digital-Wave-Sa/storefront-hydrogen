/**
 * Which products an ACTIVE AUTOMATIC Shopify discount currently marks down, so
 * product cards and product pages can show the before and after price.
 *
 * The cart already applies automatic discounts by itself; the catalogue never
 * showed them, so a 25% offer appeared at full price everywhere except the
 * /promotions pages, and the saving was first seen in the cart. This reads the
 * same discounts the cart applies, so what the card says is what the cart
 * charges, and the display ends by itself when the discount ends or is paused.
 *
 * Shown only where it is certainly true for every shopper:
 *   - automatic discounts only (a code the shopper must type is not a price),
 *   - "Amount off products" (DiscountAutomaticBasic) only — Buy X Get Y and
 *     order/shipping discounts are not a per-product price,
 *   - available to all buyers (no customer or segment restriction),
 *   - no minimum purchase (subtotal or quantity),
 *   - a fixed amount only when it applies to EACH item.
 *
 * Admin API only (discounts are not on the Storefront API), so server-side.
 * Cached per worker for a few minutes; never throws — on any failure the site
 * simply shows normal prices.
 */

import {getAdminToken, getAdminDomain} from '~/lib/shopify-admin.server';
import type {OfferDiscountValue} from '~/lib/offer-discounts.server';

const ADMIN_API_VERSION = '2026-04';
const TTL_MS = 3 * 60 * 1000;
const TIMEOUT_MS = 2500;

/**
 * Numeric product / variant id → the discounts that apply to it (several
 * automatic discounts can cover one product; the shopper gets the best one,
 * which the client works out against the real price).
 */
export interface LiveDiscounts {
  /** Discounts that cover the whole catalogue. */
  all: OfferDiscountValue[];
  products: Record<string, OfferDiscountValue[]>;
  variants: Record<string, OfferDiscountValue[]>;
}

export const EMPTY_LIVE_DISCOUNTS: LiveDiscounts = {all: [], products: {}, variants: {}};

let cache: {value: LiveDiscounts; expires: number} | null = null;
let inflight: Promise<LiveDiscounts> | null = null;

const QUERY = `
  query LiveAutomaticDiscounts {
    discountNodes(first: 50, query: "status:active AND method:automatic") {
      nodes {
        discount {
          __typename
          ... on DiscountAutomaticBasic {
            status
            startsAt
            endsAt
            context { __typename }
            minimumRequirement { __typename }
            customerGets {
              value {
                __typename
                ... on DiscountPercentage { percentage }
                ... on DiscountAmount {
                  amount { amount currencyCode }
                  appliesOnEachItem
                }
              }
              items {
                __typename
                ... on DiscountProducts {
                  products(first: 250) { nodes { id } }
                  productVariants(first: 250) { nodes { id } }
                }
                ... on DiscountCollections {
                  collections(first: 50) { nodes { id } }
                }
              }
            }
          }
        }
      }
    }
  }
`;

const COLLECTION_PRODUCTS_QUERY = `
  query LiveDiscountCollections($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Collection {
        id
        products(first: 250) { nodes { id } }
      }
    }
  }
`;

async function admin(env: any, query: string, variables: Record<string, any> = {}) {
  const token = await getAdminToken(env).catch(() => '');
  const domain = getAdminDomain(env);
  if (!token || !domain) return null;
  const res = await fetch(
    `https://${domain}/admin/api/${ADMIN_API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {'X-Shopify-Access-Token': token, 'Content-Type': 'application/json'},
      body: JSON.stringify({query, variables}),
    },
  );
  if (!res.ok) return null;
  const json = (await res.json()) as any;
  if (json.errors?.length) {
    console.error('[live-discounts] Admin errors:', JSON.stringify(json.errors).slice(0, 300));
  }
  return json.data ?? null;
}

const numericId = (gid: unknown) => {
  const id = String(gid ?? '').split('/').pop()?.trim();
  return id && /^\d+$/.test(id) ? id : null;
};

/** The value as a per-item markdown, or null when it isn't one. */
function readValue(value: any): OfferDiscountValue | null {
  if (!value) return null;
  if (value.__typename === 'DiscountPercentage' && typeof value.percentage === 'number') {
    const raw = value.percentage;
    const fraction = raw > 1 ? raw / 100 : raw;
    if (!(fraction > 0 && fraction < 1)) return null;
    return {type: 'percentage', percentage: fraction};
  }
  if (value.__typename === 'DiscountAmount' && value.appliesOnEachItem === true) {
    const amount = parseFloat(value.amount?.amount ?? '');
    if (!(amount > 0)) return null;
    return {type: 'amount', amount, currencyCode: value.amount?.currencyCode || undefined};
  }
  return null;
}

async function load(env: any): Promise<LiveDiscounts> {
  const data = await admin(env, QUERY);
  const nodes = data?.discountNodes?.nodes || [];
  const now = Date.now();

  const out: LiveDiscounts = {all: [], products: {}, variants: {}};
  const add = (map: Record<string, OfferDiscountValue[]>, id: string | null, v: OfferDiscountValue) => {
    if (!id) return;
    (map[id] = map[id] || []).push(v);
  };
  const collectionWants: Array<{id: string; value: OfferDiscountValue}> = [];

  for (const node of nodes) {
    const d = node?.discount;
    if (d?.__typename !== 'DiscountAutomaticBasic') continue;
    if (d.status !== 'ACTIVE') continue;
    if (d.startsAt && Date.parse(d.startsAt) > now) continue;
    if (d.endsAt && Date.parse(d.endsAt) <= now) continue;
    if (d.context?.__typename && d.context.__typename !== 'DiscountBuyerSelectionAll') continue;
    if (d.minimumRequirement) continue;

    const value = readValue(d.customerGets?.value);
    if (!value) continue;

    const items = d.customerGets?.items;
    if (items?.__typename === 'AllDiscountItems') {
      out.all.push(value);
      continue;
    }
    for (const p of items?.products?.nodes || []) add(out.products, numericId(p?.id), value);
    for (const v of items?.productVariants?.nodes || []) add(out.variants, numericId(v?.id), value);
    for (const c of items?.collections?.nodes || []) {
      if (c?.id) collectionWants.push({id: c.id, value});
    }
  }

  if (collectionWants.length) {
    const ids = [...new Set(collectionWants.map((c) => c.id))].slice(0, 50);
    const res = await admin(env, COLLECTION_PRODUCTS_QUERY, {ids});
    const byCollection = new Map<string, string[]>();
    for (const col of res?.nodes || []) {
      if (col?.id) {
        byCollection.set(
          col.id,
          (col.products?.nodes || []).map((p: any) => numericId(p?.id)).filter(Boolean),
        );
      }
    }
    for (const want of collectionWants) {
      for (const pid of byCollection.get(want.id) || []) add(out.products, pid, want.value);
    }
  }

  return out;
}

/** Live automatic discounts, cached briefly. Never throws, never blocks long. */
export async function loadLiveDiscounts(env: any): Promise<LiveDiscounts> {
  if (cache && cache.expires > Date.now()) return cache.value;
  if (!inflight) {
    inflight = load(env)
      .then((value) => {
        cache = {value, expires: Date.now() + TTL_MS};
        return value;
      })
      .catch((error) => {
        console.error('[live-discounts] load failed:', (error as Error)?.message);
        // Keep showing the last good answer rather than flipping prices off.
        return cache?.value ?? EMPTY_LIVE_DISCOUNTS;
      })
      .finally(() => {
        inflight = null;
      });
  }
  const timeout = new Promise<LiveDiscounts>((resolve) =>
    setTimeout(() => resolve(cache?.value ?? EMPTY_LIVE_DISCOUNTS), TIMEOUT_MS),
  );
  return Promise.race([inflight, timeout]);
}
