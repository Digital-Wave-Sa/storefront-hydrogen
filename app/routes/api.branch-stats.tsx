import {data, type LoaderFunctionArgs} from 'react-router';
import {getAdminToken, getAdminDomain} from '~/lib/shopify-admin.server';
import {
  branchStats,
  FALLBACK_BRANCH_COUNT,
  FALLBACK_CITY_COUNT,
} from '~/lib/branch-stats';

/**
 * How many branches, from the list that has all of them.
 *
 * The root loader's location list comes from the Storefront API, where
 * `locations` is documented as the locations that support in-store pickup —
 * a subset, 111 of the 118 the Admin API returns. So /pages/about and
 * /pages/contact, which only have the root list, counted 111 while
 * /pages/branches, which fetches the Admin list for its cards, counted 117.
 * Counting them the same way was not enough while they counted different
 * lists.
 *
 * This is the Admin list, counted once, as two small numbers. The existing
 * /api/locations-meta returns the same locations enriched with every
 * metafield the branches page needs to draw a card — far too much payload for
 * a page that wants a figure for a sentence.
 */

type Stats = {branchCount: number; cityCount: number};

/**
 * Half an hour in the isolate's memory. Branches open about as often as
 * anything else in a bakery chain, which is to say rarely, and a page reading
 * a number half an hour stale is reading a number that was right.
 */
const TTL_MS = 30 * 60 * 1000;
let cache: {at: number; value: Stats} | null = null;

const LOCATIONS_QUERY = `{
  locations(first: 250, includeInactive: false, includeLegacy: true) {
    nodes {
      id
      name
      address { city }
      city: metafield(namespace: "custom", key: "city") { value }
    }
  }
}`;

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=1800, stale-while-revalidate=600',
};

export async function loader({context}: LoaderFunctionArgs) {
  const {env} = context;

  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) {
    return data(cache.value, {headers: CACHE_HEADERS});
  }

  /** Never fail the page over a figure in a sentence. */
  const fallback: Stats = cache?.value ?? {
    branchCount: FALLBACK_BRANCH_COUNT,
    cityCount: FALLBACK_CITY_COUNT,
  };

  try {
    const adminDomain = getAdminDomain(env);
    const adminToken = await getAdminToken(env);
    if (!adminDomain || !adminToken) return data(fallback, {status: 200});

    const res = await fetch(
      `https://${adminDomain}/admin/api/2024-01/graphql.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': adminToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({query: LOCATIONS_QUERY}),
      },
    );
    if (!res.ok) return data(fallback, {status: 200});

    const json = (await res.json()) as any;
    const nodes = json?.data?.locations?.nodes;
    if (!Array.isArray(nodes) || nodes.length === 0) {
      return data(fallback, {status: 200});
    }

    const {branchCount, cityCount} = branchStats(nodes);
    cache = {at: now, value: {branchCount, cityCount}};
    return data(cache.value, {headers: CACHE_HEADERS});
  } catch (e) {
    console.error('[BranchStats] Admin locations lookup failed:', e);
    return data(fallback, {status: 200});
  }
}
