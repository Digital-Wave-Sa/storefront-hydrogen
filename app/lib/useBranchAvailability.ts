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
 * lookup into every product reading as unavailable. `pending` says which of the
 * two it is: true while an answer is still outstanding, false once the ids are
 * either cached or given up on. A card that has nothing else to go on can hold
 * its Add to Cart button until then instead of offering a product the branch
 * may not stock.
 */

const TTL_MS = 60 * 1000;
const BATCH_WINDOW_MS = 40;
/** Keep each request well inside the API's own per-call variant cap. */
const MAX_PER_REQUEST = 50;
/**
 * How long to stop asking about ids a request could not answer.
 *
 * A failed batch used to leave its ids uncached with nothing to retry it, so
 * the card stayed on its fallback until something remounted — and with a
 * `pending` flag in play it would have stayed pending forever. Ids are now
 * retried a few times inside the batch, and then parked so callers fall back
 * cleanly instead of waiting on an answer that is not coming.
 */
const UNRESOLVED_TTL_MS = 30 * 1000;
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = [250, 750];

const cache = new Map<string, {value: BranchAvailabilityEntry; expires: number}>();
/** key -> when to allow asking about this id again. */
const unresolved = new Map<string, number>();

interface PendingBatch {
  ids: Set<string>;
  timer: ReturnType<typeof setTimeout> | null;
  waiters: (() => void)[];
}
const pending = new Map<string, PendingBatch>();
const subscribers = new Set<() => void>();

const cacheKey = (locationId: string, variantId: string) =>
  `${locationId}|${variantId}`;

function isParked(key: string, now = Date.now()): boolean {
  const until = unresolved.get(key);
  if (!until) return false;
  if (until > now) return true;
  unresolved.delete(key);
  return false;
}

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

/** True while any of these ids is neither cached nor given up on. */
function hasPending(locationId: string, variantIds: string[]): boolean {
  const now = Date.now();
  return variantIds.some((id) => {
    const key = cacheKey(locationId, id);
    const hit = cache.get(key);
    if (hit && hit.expires > now) return false;
    return !isParked(key, now);
  });
}

async function flush(locationId: string) {
  const batch = pending.get(locationId);
  if (!batch) return;
  pending.delete(locationId);
  if (batch.timer) clearTimeout(batch.timer);

  const ids = [...batch.ids];
  for (let i = 0; i < ids.length; i += MAX_PER_REQUEST) {
    const chunk = ids.slice(i, i + MAX_PER_REQUEST);
    let answered = false;

    for (let attempt = 0; attempt < MAX_ATTEMPTS && !answered; attempt++) {
      if (attempt > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAY_MS[attempt - 1] ?? 750),
        );
      }
      try {
        const params = new URLSearchParams({
          locationId,
          variantIds: chunk.join(','),
        });
        const res = await fetch(`/api/branch-availability?${params.toString()}`);
        if (!res.ok) continue;
        const json: any = await res.json();
        const availability = json?.availability || {};
        const expires = Date.now() + TTL_MS;
        const parkUntil = Date.now() + UNRESOLVED_TTL_MS;
        for (const id of chunk) {
          const key = cacheKey(locationId, id);
          if (availability[id]) {
            cache.set(key, {value: availability[id], expires});
            unresolved.delete(key);
          } else {
            // Answered, but this variant was not in the reply. Park it so the
            // caller falls back rather than waiting on it indefinitely.
            unresolved.set(key, parkUntil);
          }
        }
        answered = true;
      } catch {
        // Retry, then park below.
      }
    }

    if (!answered) {
      const parkUntil = Date.now() + UNRESOLVED_TTL_MS;
      for (const id of chunk) {
        unresolved.set(cacheKey(locationId, id), parkUntil);
      }
    }
  }

  batch.waiters.forEach((w) => w());
  subscribers.forEach((s) => s());
}

function request(locationId: string, variantIds: string[]) {
  if (!locationId) return;
  // Skip ids a recent request already failed to answer, so a render loop
  // cannot turn one outage into a request per card per render.
  const wanted = variantIds.filter((id) => !isParked(cacheKey(locationId, id)));
  if (wanted.length === 0) return;

  let batch = pending.get(locationId);
  if (!batch) {
    batch = {ids: new Set(), timer: null, waiters: []};
    pending.set(locationId, batch);
  }
  wanted.forEach((id) => batch!.ids.add(id));
  if (!batch.timer) {
    batch.timer = setTimeout(() => flush(locationId), BATCH_WINDOW_MS);
  }
}

export function useBranchAvailability(
  variantIds: string[],
  locationId?: string | null,
): {availability: BranchAvailabilityMap; loaded: boolean; pending: boolean} {
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
    // Nothing to ask about — not pending, so callers do not hold their UI.
    return {availability: {}, loaded: false, pending: false};
  }

  const {found, missing} = readCache(locationId, variantIds);
  return {
    availability: found,
    loaded: missing.length === 0,
    pending: hasPending(locationId, variantIds),
  };
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
