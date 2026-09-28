import {useEffect, useState} from 'react';
import {useLocation, useNavigation} from 'react-router';
import {BrandLoaderTile} from '~/components/BrandLoader';

/**
 * A response to the click, for the time before the next page arrives.
 *
 * React Router keeps the current page on screen until the next route's loader
 * resolves. On /account and /vouchers that is seconds, and nothing on screen
 * acknowledged the click for that whole time.
 *
 * History, because it went both ways. The first answer was an overlay on
 * the page being left; it read as if the click had done nothing, so the page
 * was swapped for the loader on a blank background instead. That read as a
 * blank page (29 Sep), and the overlay came back with one change that makes
 * it read as leaving: the whole screen -- header, page and footer -- is
 * BLURRED and dimmed under the mark, and nothing can be clicked until the
 * next page arrives (`PageLoader`). Product and collection pages still swap
 * to their skeletons, which show the shape of what is arriving.
 *
 * Decisions worth keeping if the visual is ever redesigned:
 *
 * It waits before swapping. Most navigations here resolve quickly, and a page
 * that blanks and comes back inside a quarter-second reads as a glitch — so a
 * fast navigation keeps the old page until the new one is ready, and only a
 * real wait swaps.
 *
 * Only a change of page counts. A new query string on the same path (order
 * filters, the online / in-store toggle, sorting) is the page updating itself,
 * and those pages have their own in-place loaders.
 *
 * Form submissions are not navigations. After a POST, React Router reports
 * `loading` while it revalidates; swapping the page out then would blank the
 * cart on every quantity change.
 */
export function useSlowNavigation(delay = 250): boolean {
  const navigation = useNavigation();
  const current = useLocation();

  const target = navigation.location?.pathname ?? '';
  const isSubmission =
    !!navigation.formMethod && navigation.formMethod.toUpperCase() !== 'GET';

  /**
   * Product and collection pages have their own skeletons, which are the
   * better answer there — they show the shape of what is arriving.
   *
   * Except /collections/all, the full catalogue, which gets the brand loader
   * like the rest of the site (asked for; root skips its skeleton to match).
   */
  const isAllProducts = /\/collections\/all\/?$/.test(target);
  const hasSkeleton =
    target.includes('/products/') ||
    (/\/collections(\/|$)/.test(target) && !isAllProducts);

  const pending =
    navigation.state === 'loading' &&
    !!target &&
    target !== current.pathname &&
    !isSubmission &&
    !hasSkeleton;

  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!pending) {
      setSlow(false);
      return;
    }
    const timer = setTimeout(() => setSlow(true), delay);
    return () => clearTimeout(timer);
  }, [pending, delay]);

  // No scroll here: the page being left stays on screen, blurred, where the
  // shopper was. ScrollRestoration takes the new page to the top on arrival.

  return slow;
}

/**
 * The mark over the whole screen while the next page loads.
 *
 * A fixed layer above everything, header (z-50) and its menus (z-60)
 * included: `backdrop-blur` blurs whatever is behind it -- header, page and
 * footer alike -- and the cream tint dims it. The layer takes the clicks, so
 * nothing underneath can be used mid-change. Fixed, so the mark is in the
 * middle of the screen however far down the page was scrolled.
 */
export function PageLoader({isEn}: {isEn: boolean}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#FEF8EB]/40 backdrop-blur-[4px]"
    >
      <BrandLoaderTile size={96} />
      <span className="sr-only">{isEn ? 'Loading' : 'جاري التحميل'}</span>
    </div>
  );
}
