import {useEffect, useState} from 'react';

export interface BranchAvailabilityEntry {
  stockedHere: boolean;
  available: number | null;
  tracked: boolean;
  locations: {id: string; name: string; available: number | null}[];
}

export type BranchAvailabilityMap = Record<string, BranchAvailabilityEntry>;

/**
 * Real per-branch stock for a set of variants.
 *
 * Reads Shopify's inventory levels via /api/branch-availability — the same
 * table the admin shows on a product page. This replaces reasoning from
 * `ProductVariant.storeAvailability`, which only reports what is COLLECTABLE at
 * pickup-enabled locations and comes back empty for plenty of products, so it
 * cannot distinguish "this branch does not stock it" from "pickup is off
 * there".
 *
 * Requests are batched. A collection page renders dozens of product cards, each
 * asking about its own variant; without coalescing that would be dozens of
 * round trips per render. Ids requested within the same tick are collected into
 * one call per location, and answers are cached briefly so re-renders and
 * repeated cards are free.
 *
 * Callers get an empty map while loading or on failure, and must treat a
 * missing entry as "unknown" — flagging on absence would turn a slow or failed
 * lookup into every product reading as unavailable.
 */

const TTL_MS = 60 * 1000;
const BATCH_WINDOW_MS = 40;
/** Keep each request well inside the API's own per-call variant cap. */
const MAX_PER_REQUEST = 50;

const cache = new Map<string, {value: BranchAvailabilityEntry; expires: number}>();

interface PendingBatch {
  ids: Set<string>;
  timer: ReturnType<typeof setTimeout> | null;
  waiters: (() => void)[];
}
const pending = new Map<string, PendingBatch>();
const subscribers = new Set<() => void>();

const cacheKey = (locationId: string, variantId: string) =>
  `${locationId}|${variantId}`;

function readCache(
  locationId: string,
  variantIds: string[],
): {found: BranchAvailabilityMap; missing: string[]} {
  const found: BranchAvailabilityMap = {};
  const missing: string[] = [];
  const now = Date.now();
  for (const id of variantIds) {
    const hit = cache.get(cacheKey(locationId, id));
    if (hit && hit.expires > now) found[id] = hit.value;
    else missing.push(id);
  }
  return {found, missing};
}

async function flush(locationId: string) {
  const batch = pending.get(locationId);
  if (!batch) return;
  pending.delete(locationId);
  if (batch.timer) clearTimeout(batch.timer);

  const ids = [...batch.ids];
  for (let i = 0; i < ids.length; i += MAX_PER_REQUEST) {
    const chunk = ids.slice(i, i + MAX_PER_REQUEST);
    try {
      const params = new URLSearchParams({
        locationId,
        variantIds: chunk.join(','),
      });
      const res = await fetch(`/api/branch-availability?${params.toString()}`);
      const json: any = res.ok ? await res.json() : null;
      const availability = json?.availability || {};
      const expires = Date.now() + TTL_MS;
      for (const id of chunk) {
        if (availability[id]) {
          cache.set(cacheKey(locationId, id), {value: availability[id], expires});
        }
      }
    } catch {
      // Leave these ids uncached; callers treat a miss as "unknown" and fall
      // back rather than flagging the product.
    }
  }

  batch.waiters.forEach((w) => w());
  subscribers.forEach((s) => s());
}

function request(locationId: string, variantIds: string[]) {
  if (!locationId || variantIds.length === 0) return;
  let batch = pending.get(locationId);
  if (!batch) {
    batch = {ids: new Set(), timer: null, waiters: []};
    pending.set(locationId, batch);
  }
  variantIds.forEach((id) => batch!.ids.add(id));
  if (!batch.timer) {
    batch.timer = setTimeout(() => flush(locationId), BATCH_WINDOW_MS);
  }
}

export function useBranchAvailability(
  variantIds: string[],
  locationId?: string | null,
): {availability: BranchAvailabilityMap; loaded: boolean} {
  const [, forceRender] = useState(0);

  // Stable key so we refetch on a branch switch or a changed id set, not on
  // every render.
  const key = `${locationId || ''}|${[...variantIds].sort().join(',')}`;

  useEffect(() => {
    const rerender = () => forceRender((n) => n + 1);
    subscribers.add(rerender);
    if (locationId && variantIds.length > 0) {
      const {missing} = readCache(locationId, variantIds);
      if (missing.length > 0) request(locationId, missing);
    }
    return () => {
      subscribers.delete(rerender);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!locationId || variantIds.length === 0) {
    return {availability: {}, loaded: false};
  }

  const {found, missing} = readCache(locationId, variantIds);
  return {availability: found, loaded: missing.length === 0};
}

/**
 * Reader for lists that build their cards inside a render callback.
 *
 * BestSellers and NewArrivals map over products streamed in from an `<Await>`,
 * so the ids are not known at the top of the component and a hook cannot be
 * called per card. This subscribes once, and hands back a `read(variantId)`
 * that returns the cached entry or null and quietly queues a fetch on a miss —
 * all of which coalesce into a single request.
 */
export function useBranchAvailabilityReader(locationId?: string | null) {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const rerender = () => forceRender((n) => n + 1);
    subscribers.add(rerender);
    return () => {
      subscribers.delete(rerender);
    };
  }, [locationId]);

  const read = (variantId?: string | null): BranchAvailabilityEntry | null => {
    if (!locationId || !variantId) return null;
    const hit = cache.get(cacheKey(locationId, variantId));
    if (hit && hit.expires > Date.now()) return hit.value;
    request(locationId, [variantId]);
    return null;
  };

  return {read};
}
