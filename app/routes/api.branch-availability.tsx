import {data, type LoaderFunctionArgs} from 'react-router';

/**
 * Per-location stock for a set of variants, from Shopify's inventory levels.
 *
 * GET /api/branch-availability?locationId=<gid|numeric>&variantIds=<gid,gid,...>
 *
 * Why this exists at all: the storefront was deciding branch availability from
 * `ProductVariant.storeAvailability`, which answers a different question —
 * "can this be COLLECTED here" — and only ever lists locations that have local
 * pickup enabled AND stock to hand over. A variant sitting on 1000 units at a
 * non-pickup warehouse and 0 available at the pickup branch comes back with an
 * empty list, indistinguishable from "not stocked anywhere". There is no way to
 * tell "not assigned to this location" from "pickup is off there" from "zero
 * available" — so the cart could not answer the one question that matters:
 * does the branch fulfilling this order actually have the item.
 *
 * `inventoryItem.inventoryLevels` is that answer. It is the same table the
 * Shopify admin shows on the product page: one row per location the variant is
 * stocked at, with the available quantity. A location absent from the list is
 * not stocked there at all.
 *
 * Read-only, and exposes nothing a shopper cannot infer by adding to a cart.
 */

const ADMIN_API_VERSION = '2024-01';

/** Shopify caps `nodes(ids:)`; keep requests well inside a single query's cost. */
const MAX_VARIANTS = 50;

const CACHE_TTL_MS = 60 * 1000;
const cache = new Map<string, {value: any; expires: number}>();

const INVENTORY_QUERY = `
  query VariantInventoryByLocation($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on ProductVariant {
        id
        inventoryItem {
          tracked
          inventoryLevels(first: 100) {
            nodes {
              location { id name }
              quantities(names: ["available"]) { name quantity }
            }
          }
        }
      }
    }
  }
`;

const numericId = (gid?: string | null) => String(gid || '').split('/').pop() || '';

/**
 * Resolve variants by product handle or SKU.
 *
 * Added because picking a variant id out of a serialised page payload is
 * unreliable — the first ProductVariant gid in an RSC stream can belong to a
 * related-product card rather than the product being viewed, which is
 * exactly how this diagnostic reported the wrong inventory.
 */
const SKU_LOOKUP_QUERY = `
  query VariantLookupBySku($q: String!) {
    productVariants(first: 20, query: $q) {
      nodes {
        id
        sku
        title
        product { title handle }
      }
    }
  }
`;

/**
 * Handle lookups go through `products`, not `productVariants`.
 *
 * `productVariants(query: "product_handle:...")` is not a supported filter:
 * Shopify ignores it and returns an arbitrary first page, so the diagnostic
 * cheerfully reported a completely different product's stock.
 */
const HANDLE_LOOKUP_QUERY = `
  query VariantLookupByHandle($q: String!) {
    products(first: 1, query: $q) {
      nodes {
        title
        handle
        variants(first: 20) {
          nodes { id sku title }
        }
      }
    }
  }
`;

export async function loader({request, context}: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const locationId = url.searchParams.get('locationId') || '';
  const variantIds = (url.searchParams.get('variantIds') || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, MAX_VARIANTS);

  // Accept a handle or SKU so callers need not guess a variant id.
  const handle = url.searchParams.get('handle') || '';
  const sku = url.searchParams.get('sku') || '';

  if (!locationId || (variantIds.length === 0 && !handle && !sku)) {
    return data(
      {
        error: 'locationId plus one of variantIds, handle or sku is required',
        availability: {},
      },
      {status: 400},
    );
  }

  // The lookup params belong in the key: variantIds is still empty at this
  // point for handle/sku requests, so every one of them collided on the same
  // key and got the first request's answer back.
  const cacheKey = `${numericId(locationId)}|${variantIds.join(',')}|${sku}|${handle}`;
  const hit = cache.get(cacheKey);
  if (hit && hit.expires > Date.now()) {
    return data(hit.value, {headers: {'Cache-Control': 'no-store'}});
  }

  try {
    const {getAdminToken, getAdminDomain} = await import(
      '~/lib/shopify-admin.server'
    );
    const adminToken = await getAdminToken(context.env);
    const adminDomain = getAdminDomain(context.env);
    if (!adminToken || !adminDomain) {
      return data({error: 'admin-unavailable', availability: {}}, {status: 503});
    }

    const adminGql = async (query: string, variables: any) => {
      const c = new AbortController();
      const id = setTimeout(() => c.abort(), 8000);
      try {
        const r = await fetch(
          `https://${adminDomain}/admin/api/${ADMIN_API_VERSION}/graphql.json`,
          {
            method: 'POST',
            headers: {
              'X-Shopify-Access-Token': adminToken,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({query, variables}),
            signal: c.signal,
          },
        );
        return await r.json();
      } finally {
        clearTimeout(id);
      }
    };

    let resolved: any[] = [];
    if (variantIds.length === 0) {
      if (sku) {
        const lookup = await adminGql(SKU_LOOKUP_QUERY, {q: `sku:${sku}`});
        resolved = lookup?.data?.productVariants?.nodes || [];
      } else {
        const lookup = await adminGql(HANDLE_LOOKUP_QUERY, {q: `handle:${handle}`});
        const product = lookup?.data?.products?.nodes?.[0];
        // Only accept an exact handle match — Shopify's search is fuzzy and
        // will otherwise hand back a neighbouring product.
        if (product && product.handle === handle) {
          resolved = (product.variants?.nodes || []).map((v: any) => ({
            ...v,
            product: {title: product.title, handle: product.handle},
          }));
        }
      }
      variantIds.push(...resolved.map((v: any) => v.id));
      if (variantIds.length === 0) {
        return data(
          {error: 'no-variants-found', sku, handle, availability: {}},
          {status: 404},
        );
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    let json: any;
    try {
      const res = await fetch(
        `https://${adminDomain}/admin/api/${ADMIN_API_VERSION}/graphql.json`,
        {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': adminToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: INVENTORY_QUERY,
            variables: {ids: variantIds},
          }),
          signal: controller.signal,
        },
      );
      json = await res.json();
    } finally {
      clearTimeout(timeoutId);
    }

    if (json?.errors) {
      console.error(
        '[BranchAvailability] Admin GraphQL errors:',
        JSON.stringify(json.errors),
      );
      return data({error: 'query-failed', availability: {}}, {status: 502});
    }

    const wanted = numericId(locationId);
    const availability: Record<string, any> = {};

    for (const node of json?.data?.nodes || []) {
      if (!node?.id) continue;
      const levels = node.inventoryItem?.inventoryLevels?.nodes || [];
      const tracked = node.inventoryItem?.tracked !== false;

      const level = levels.find(
        (l: any) => numericId(l?.location?.id) === wanted,
      );

      const available =
        level?.quantities?.find((q: any) => q?.name === 'available')?.quantity ??
        null;

      availability[node.id] = {
        /** Is the variant stocked at this location at all. */
        stockedHere: !!level,
        /** Units available there; null when the location is not in the list. */
        available,
        /**
         * Untracked inventory is sellable everywhere by definition — Shopify
         * does not hold counts for it, so absence proves nothing.
         */
        tracked,
        locations: levels.map((l: any) => ({
          id: l?.location?.id,
          name: l?.location?.name,
          available:
            l?.quantities?.find((q: any) => q?.name === 'available')?.quantity ??
            null,
        })),
      };
    }

    const payload = {locationId, resolvedVariants: resolved, availability};
    cache.set(cacheKey, {value: payload, expires: Date.now() + CACHE_TTL_MS});
    return data(payload, {headers: {'Cache-Control': 'no-store'}});
  } catch (err: any) {
    console.error('[BranchAvailability] Failed:', err?.message || err);
    return data({error: 'failed', availability: {}}, {status: 500});
  }
}
