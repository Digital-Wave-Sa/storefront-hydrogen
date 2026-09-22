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
/**
 * How long an expired answer may still be shown while a fresh one is fetched.
 *
 * Expiry used to drop the answer outright, so the next re-render (add to
 * cart, the wishlist heart, any revalidation) put every card back into
 * «not known yet» — the badge vanished, the image un-faded and the button went
 * blank — and then the same answer came back and it all flipped again. An
 * out-of-stock card briefly looked in stock, once a minute. The last answer
 * now stays on screen until the new one replaces it.
 */
const MAX_STALE_MS = 30 * 60 * 1000;
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
/** Keys whose request has been sent and not yet answered. */
const inFlight = new Set<string>();
/**
 * Keys that have had a final outcome at least once: an answer, or given up on.
 * Only a key that has never settled counts as pending, so a card goes through
 * the «not known yet» state once, on its first lookup, and never again.
 */
const settled = new Set<string>();
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
    const key = cacheKey(locationId, id);
    const hit = cache.get(key);
    if (hit && hit.expires + MAX_STALE_MS > now) {
      // Fresh, or stale but still the best answer we have.
      found[id] = hit.value;
      if (hit.expires <= now) missing.push(id);
    } else {
      if (hit) cache.delete(key);
      missing.push(id);
    }
  }
  return {found, missing};
}

/** True while any of these ids has never had an answer or been given up on. */
function hasPending(locationId: string, variantIds: string[]): boolean {
  const now = Date.now();
  return variantIds.some((id) => {
    const key = cacheKey(locationId, id);
    if (settled.has(key)) return false;
    const hit = cache.get(key);
    if (hit && hit.expires + MAX_STALE_MS > now) return false;
    return !isParked(key, now);
  });
}

async function flush(locationId: string) {
  const batch = pending.get(locationId);
  if (!batch) return;
  pending.delete(locationId);
  if (batch.timer) clearTimeout(batch.timer);

  const ids = [...batch.ids];
  ids.forEach((id) => inFlight.add(cacheKey(locationId, id)));
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
          settled.add(key);
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
        const key = cacheKey(locationId, id);
        unresolved.set(key, parkUntil);
        settled.add(key);
      }
    }
  }

  ids.forEach((id) => inFlight.delete(cacheKey(locationId, id)));
  batch.waiters.forEach((w) => w());
  subscribers.forEach((s) => s());
}

function request(locationId: string, variantIds: string[]) {
  if (!locationId) return;
  // Skip ids a recent request already failed to answer, so a render loop
  // cannot turn one outage into a request per card per render.
  const now = Date.now();
  const wanted = variantIds.filter((id) => {
    const key = cacheKey(locationId, id);
    if (isParked(key, now) || inFlight.has(key)) return false;
    const hit = cache.get(key);
    return !(hit && hit.expires > now);
  });
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

  /**
   * Re-ask after every commit for anything that has fallen out of the cache.
   *
   * The effect above runs only when the branch or the id set changes. Cached
   * answers expire after a minute, so on a page left open that long the next
   * re-render — adding to cart, toggling the wishlist, any revalidation —
   * found the ids uncached, not parked and not requested. `pending` was then
   * true with nothing in flight to end it, and every card's button sat on the
   * blank pulsing placeholder indefinitely. `request` skips anything cached,
   * queued, in flight or parked, so this is free when nothing has expired.
   */
  useEffect(() => {
    if (!locationId || variantIds.length === 0) return;
    const {missing} = readCache(locationId, variantIds);
    if (missing.length > 0) request(locationId, missing);
  });

  if (!locationId || variantIds.length === 0) {
    // Nothing to ask about — not pending, so callers do not hold their UI.
    return {availability: {}, loaded: false, pending: false};
  }

  const {found} = readCache(locationId, variantIds);
  return {
    availability: found,
    loaded: variantIds.every((id) => id in found),
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
    const now = Date.now();
    if (hit && hit.expires > now) return hit.value;
    request(locationId, [variantId]);
    // Stale: keep showing it while the refresh above runs.
    if (hit && hit.expires + MAX_STALE_MS > now) return hit.value;
    return null;
  };

  /**
   * Is this variant's answer still on its way?
   *
   * `read` returns null both while a lookup is in flight and when there is
   * genuinely nothing to say, and callers cannot tell those apart — so a card
   * treated "not yet known" as "fall back to storeAvailability", which is how
   * a product in stock rendered as sold out for the first moment of a page.
   * `useBranchAvailability` has always exposed this; the reader did not.
   */
  const pending = (variantId?: string | null): boolean => {
    if (!locationId || !variantId) return false;
    return hasPending(locationId, [variantId]);
  };

  return {read, pending};
}
