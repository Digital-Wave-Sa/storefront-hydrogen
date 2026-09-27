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
 * The first answer to that was an overlay on top of the page being left. It
 * read wrong: the shopper had asked to go somewhere and was shown a spinner
 * over where they already were. So now the page content itself is swapped
 * for the loader (root renders `PageLoader` in place of the Outlet), the same
 * way product and collection pages swap to their skeletons: the header stays,
 * the old page goes, and the wait happens on the way to the new one.
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

  // Start the wait at the top, where the next page will begin.
  useEffect(() => {
    if (slow) window.scrollTo({top: 0});
  }, [slow]);

  return slow;
}

/** What stands in for the page while the next one loads. */
export function PageLoader({isEn}: {isEn: boolean}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[70vh] w-full items-center justify-center py-24"
    >
      <BrandLoaderTile size={96} />
      <span className="sr-only">{isEn ? 'Loading' : 'جاري التحميل'}</span>
    </div>
  );
}
