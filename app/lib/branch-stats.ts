/**
 * How many branches there are, and in how many cities.
 *
 * Three pages gave three answers. /pages/branches counted the live location
 * list and printed «118 branches, 36+ cities»; /pages/contact and /pages/about
 * carried the same claim as typed-in prose, «117 branches, 35 cities». A
 * shopper who read two of those pages could see the company shrink.
 *
 * Checked against the live list, all three were wrong, each in its own way:
 *
 *   - Shopify's own default location, «Shop location», sits in the list with
 *     no address at all. It is the shop, not a shop front — so counting the
 *     list raw was one too many, and it also produced a phantom city group
 *     called "other".
 *   - One city is spelled two ways: مكة on six branches and مكة المكرمة on a
 *     seventh, الاحساء on three and الاحساء الجفر on a fourth. Grouping the raw
 *     strings counted two cities where there is one, twice over.
 *
 * So the rules live here and every page derives its figure through them.
 *
 * Counting the same way was not enough on its own, because the pages were
 * counting different lists. The root loader's locations come from the
 * Storefront API, where `locations` means the locations that support in-store
 * pickup — 111 of the 118 the Admin API returns — so /pages/about read 111
 * while /pages/branches, which fetches the Admin list to draw its cards, read
 * 117. `useBranchStats` below takes the figure from /api/branch-stats, which
 * counts the Admin list, so a page does not have to hold the whole list to
 * print a number about it.
 *
 * Note for whoever writes the copy: seven of these branches are in Bahrain and
 * Qatar, so «فرع في المملكة» / «in the Kingdom» is not quite what the list
 * says. That is a wording decision, not a counting one, so it is left alone.
 */

import {useEffect, useState} from 'react';

/**
 * The city a branch is in: the `custom.city` metafield when the branch has
 * one, otherwise whatever the address says.
 *
 * Lifted out of /pages/branches, which is where it was and where it is still
 * used to group the list.
 */
export function getBranchCity(loc: any): string {
  const metaCity =
    loc?.city?.value ||
    loc?.city_metafield?.value ||
    (Array.isArray(loc?.metafields)
      ? loc.metafields.find((m: any) => m?.key === 'city')?.value
      : undefined);
  if (metaCity && String(metaCity).trim()) return String(metaCity).trim();
  if (loc?.address?.city && String(loc.address.city).trim()) {
    return String(loc.address.city).trim();
  }
  return '';
}

/**
 * Spellings of one city that must not count as two.
 *
 * Only for counting. `CITY_LOCALIZED_MAP` in /pages/branches still decides how
 * a city's name is *shown*, which is a different question — this table exists
 * because the data has drifted, not because the display has.
 */
const CITY_ALIASES: Record<string, string> = {
  'مكة': 'مكة المكرمة',
  'الاحساء الجفر': 'الاحساء',
  'الأحساء الجفر': 'الأحساء',
  'المدينة': 'المدينة المنورة',
};

/** One spelling per city, for counting. */
export function canonicalCity(city: string): string {
  const trimmed = String(city ?? '').trim();
  return CITY_ALIASES[trimmed] ?? trimmed;
}

/**
 * Is this a branch a customer could walk into?
 *
 * The only thing excluded today is Shopify's placeholder location, which has
 * no city. Testing for the city rather than the name «Shop location» keeps
 * this true if it is ever renamed, and costs nothing: a real branch without a
 * city could not be shown on the branches page either.
 */
export function isBranch(loc: any): boolean {
  return !!getBranchCity(loc);
}

/**
 * The figures to print when the location list has not loaded.
 *
 * Measured from the live list on 19 September 2026 with the rules above. They
 * are a fallback, not the source: every page prefers the list, so these only
 * appear for the instant before it arrives, and they drift by design — if they
 * are far off the number the branches page shows, the list grew and these
 * should be re-measured.
 */
export const FALLBACK_BRANCH_COUNT = 117;
export const FALLBACK_CITY_COUNT = 33;

export type BranchStats = {
  branchCount: number;
  cityCount: number;
  /** False when the figures came from the constants above. */
  live: boolean;
};

/**
 * The figures every page should print.
 *
 * `/api/branch-stats` counts the Admin list, which is the only one with all
 * the branches in it: the root loader's list comes from the Storefront API,
 * where `locations` means the locations that support in-store pickup, and
 * that is 111 of the 118 Admin returns. A page that counted the root list
 * said 111 while /pages/branches, which fetches the Admin list for its cards,
 * said 117.
 *
 * It takes no list on purpose. The obvious thing is to seed from whatever the
 * page already holds, but the only list a page holds is the root loader's —
 * the short one — so seeding from it renders 111, then visibly flips to 117
 * a moment later. The constants below are measured and right, so the server
 * renders the right number and the fetch usually confirms it without the
 * figure moving at all.
 */
export function useBranchStats(): BranchStats {
  const [stats, setStats] = useState<BranchStats>(() => branchStats(null));

  useEffect(() => {
    let alive = true;
    fetch('/api/branch-stats')
      .then((res) => res.json())
      .then((body: any) => {
        if (!alive) return;
        const branchCount = Number(body?.branchCount);
        const cityCount = Number(body?.cityCount);
        if (branchCount > 0 && cityCount > 0) {
          setStats({branchCount, cityCount, live: true});
        }
      })
      .catch(() => {
        // The seed or the constants are already on screen; leave them.
      });
    return () => {
      alive = false;
    };
  }, []);

  return stats;
}

/** Count a location list the same way everywhere. */
export function branchStats(locations: unknown): BranchStats {
  const list = Array.isArray(locations) ? locations : [];
  const branches = list.filter(isBranch);

  if (branches.length === 0) {
    return {
      branchCount: FALLBACK_BRANCH_COUNT,
      cityCount: FALLBACK_CITY_COUNT,
      live: false,
    };
  }

  const cities = new Set(
    branches.map((loc) => canonicalCity(getBranchCity(loc))).filter(Boolean),
  );

  return {branchCount: branches.length, cityCount: cities.size, live: true};
}
