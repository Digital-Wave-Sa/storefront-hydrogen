import {useEffect, useState} from 'react';

/**
 * Shared client-side access to `/api/locations-meta` (branch metafields).
 *
 * The Header, CartMain and CartSummary all need the same branch data, and each
 * used to fetch it independently on mount — two or three identical ~173 KB
 * responses per page load. This module keeps one in-flight request and one
 * cached result, so the first caller triggers the network and the rest await
 * the same promise.
 *
 * The TTL matches the server route's own 5-minute cache, so data can never be
 * more stale here than it already was.
 */

const TTL_MS = 5 * 60 * 1000;

let cache: {at: number; locations: any[]} | null = null;
let inFlight: Promise<any[]> | null = null;

/** Cached locations if they're still fresh, otherwise null. */
function freshCache(): any[] | null {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.locations;
  return null;
}

/**
 * Fetch the branch list, reusing a cached or in-flight result when possible.
 * Always resolves — on failure it returns the last known list, or [].
 */
export function fetchAdminLocations(): Promise<any[]> {
  if (typeof window === 'undefined') return Promise.resolve([]);

  const cached = freshCache();
  if (cached) return Promise.resolve(cached);
  if (inFlight) return inFlight;

  inFlight = fetch('/api/locations-meta')
    .then((res) => res.json())
    .then((data: any) => {
      const locations = Array.isArray(data?.locations) ? data.locations : [];
      // Only cache a non-empty result: an empty list usually means the Admin
      // call failed upstream, and we don't want to pin that for 5 minutes.
      if (locations.length > 0) cache = {at: Date.now(), locations};
      return locations;
    })
    .catch((err) => {
      console.error('[locations-meta] fetch failed:', err);
      return cache?.locations ?? [];
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

/**
 * Branch metafields for components. Returns [] until the data arrives, so
 * callers keep their existing fallback behaviour (`admin.length > 0 ? … : …`).
 */
export function useAdminLocations(): any[] {
  const [locations, setLocations] = useState<any[]>(() => freshCache() ?? []);

  useEffect(() => {
    let cancelled = false;
    fetchAdminLocations().then((next) => {
      if (!cancelled && next.length > 0) setLocations(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return locations;
}
