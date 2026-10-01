import {useEffect, useRef, type ReactNode} from 'react';
import {useNavigate} from 'react-router';

/**
 * Loads the next page of products as the shopper nears the end of the grid,
 * in place of the «تصفح المزيد» button (requested by the client, Oct 2026).
 *
 * It does exactly what the button did — navigates to Hydrogen's
 * `nextPageUrl` with the pagination `state`, without resetting the scroll —
 * so <Pagination> keeps appending to the same grid, the URL still records how
 * far the shopper got, and the back button returns to the same place. It is
 * only triggered by scrolling instead of a tap.
 *
 * - It starts ~800px before the end, so the next products are usually in
 *   before the shopper reaches the bottom.
 * - The real link stays in the page, visually hidden: search engines follow
 *   it to page 2, 3…, and it still works before JavaScript has loaded.
 * - If the new page does not fill the screen (filters can hide most of a
 *   page), the sentinel is still in view, the next URL changes, and the
 *   following page loads too, until there is something to scroll.
 */
export function InfiniteScrollLoader({
  hasNextPage,
  nextPageUrl,
  state,
  isLoading,
  NextLink,
  isEn,
  shownCount,
}: {
  hasNextPage: boolean;
  nextPageUrl: string;
  state: unknown;
  isLoading: boolean;
  NextLink: (props: {children: ReactNode; className?: string}) => ReactNode;
  isEn: boolean;
  /** Unused since the end-of-list line was removed; kept for callers. */
  shownCount?: number;
}) {
  const navigate = useNavigate();
  const sentinelRef = useRef<HTMLDivElement>(null);
  /** The URL already asked for, so one page is never requested twice. */
  const requestedRef = useRef<string | null>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage || !nextPageUrl) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        if (isLoading || requestedRef.current === nextPageUrl) return;
        requestedRef.current = nextPageUrl;
        navigate(nextPageUrl, {
          replace: true,
          preventScrollReset: true,
          state,
        });
      },
      {rootMargin: '0px 0px 800px 0px'},
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, nextPageUrl, isLoading, navigate, state]);

  // Nothing at the end of the list: the footer follows (no «شاهدت جميع المنتجات»).
  if (!hasNextPage) return null;

  return (
    <div ref={sentinelRef} className="mt-12 flex flex-col items-center gap-3" aria-live="polite">
      {/* Shown while the next page is on its way. */}
      <div
        className={`flex items-center gap-2.5 text-[14px] font-bold text-[#234745] transition-opacity ${
          isLoading ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <span
          className="w-5 h-5 rounded-full border-2 border-[#234745]/20 border-t-[#234745] animate-spin"
          aria-hidden="true"
        />
        {isEn ? 'Loading more products…' : 'جاري تحميل المزيد…'}
      </div>
      {/* For crawlers and before JavaScript loads; not shown. */}
      <NextLink className="sr-only">
        {isEn ? 'Next page' : 'الصفحة التالية'}
      </NextLink>
    </div>
  );
}
