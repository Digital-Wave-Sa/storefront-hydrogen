import {useCallback, useEffect, useRef, useState} from 'react';

/**
 * A horizontal, snapping row of cards with the storefront's scroll bar.
 *
 * Replaces the wrapping grids that left an orphan row whenever the card count
 * did not divide evenly by the column count — five occasions across four
 * columns stranded one card alone on a second row.
 *
 * The progress bar is the same one WhoAreYouGifting draws under «بتهدي لمين؟»:
 * a 3px #EBEBEB rail with a solid #234745 thumb, draggable, sized to the
 * proportion of the row currently on screen. Kept here rather than copied a
 * third time — gifting.tsx already carries a full copy of that logic that is
 * never rendered, and this is what the homepage rows now share.
 *
 * Two things that are easy to get wrong:
 *
 * - **Centred only when everything fits.** `justify-content: center` on a
 *   scroll container makes the overflowing start unreachable in every engine,
 *   so centring applies only while the row does not overflow.
 *
 * - **Snapping is turned off mid-drag.** Scroll snapping fights a scrollbar
 *   drag, pulling the row back to the nearest card on every frame.
 */
export function CardSlider({
  children,
  isEn,
  /** Applied to the scrolling row — spacing, edge bleed, and so on. */
  trackClassName = '',
}: {
  children: React.ReactNode;
  isEn: boolean;
  trackClassName?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollbarTrackRef = useRef<HTMLDivElement>(null);

  const [scrollProgress, setScrollProgress] = useState(0);
  const [thumbWidth, setThumbWidth] = useState(30);
  const [showScrollbar, setShowScrollbar] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [canScrollBack, setCanScrollBack] = useState(false);
  const [canScrollForward, setCanScrollForward] = useState(false);

  const dragStartX = useRef(0);
  const dragStartScrollLeft = useRef(0);
  /** Read during a drag, so the maths never sees a stale render's value. */
  const thumbWidthRef = useRef(30);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const {scrollLeft, scrollWidth, clientWidth} = el;
    const maxScroll = scrollWidth - clientWidth;

    if (maxScroll <= 0) {
      setShowScrollbar(false);
      setCanScrollBack(false);
      setCanScrollForward(false);
      return;
    }

    setShowScrollbar(true);

    const ratio = clientWidth / scrollWidth;
    const width = Math.max(15, ratio * 100); // never smaller than 15%
    thumbWidthRef.current = width;
    setThumbWidth(width);

    // scrollLeft runs negative in a right-to-left document.
    const position = Math.abs(scrollLeft);
    setScrollProgress(Math.min(100, Math.max(0, (position / maxScroll) * 100)));
    setCanScrollBack(position > 4);
    setCanScrollForward(position < maxScroll - 4);
  }, []);

  // After every render: the card count, and images finishing loading, both
  // change how far the row can scroll. Re-setting identical values is a no-op
  // in React, so this cannot loop.
  useEffect(handleScroll);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    window.addEventListener('resize', handleScroll);
    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(handleScroll)
        : null;
    observer?.observe(el);
    return () => {
      window.removeEventListener('resize', handleScroll);
      observer?.disconnect();
    };
  }, [handleScroll]);

  const scrollCards = (forward: boolean) => {
    const el = containerRef.current;
    if (!el) return;
    const firstCard = el.firstElementChild as HTMLElement | null;
    const step = firstCard
      ? firstCard.getBoundingClientRect().width + 24
      : el.clientWidth * 0.8;
    const towardsEnd = forward === isEn;
    el.scrollBy({left: towardsEnd ? step : -step, behavior: 'smooth'});
  };

  /**
   * Anchored to where the drag began rather than accumulated per move, so a
   * long drag cannot drift away from the pointer.
   *
   * No direction handling needed: the thumb is pinned to `right` in Arabic and
   * `left` in English, which flips in exactly the same step as `scrollLeft`'s
   * sign, so one signed delta is correct both ways.
   */
  const startDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el || !scrollbarTrackRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartX.current = e.clientX;
    dragStartScrollLeft.current = el.scrollLeft;
    setIsDragging(true);
  };

  const onDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const el = containerRef.current;
    const rail = scrollbarTrackRef.current;
    if (!el || !rail) return;

    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) return;

    const railWidth = rail.clientWidth;
    const travel = railWidth - (thumbWidthRef.current / 100) * railWidth;
    if (travel <= 0) return;

    const deltaX = e.clientX - dragStartX.current;
    el.scrollLeft = dragStartScrollLeft.current + deltaX * (maxScroll / travel);
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const arrow = (forward: boolean) => {
    const enabled = forward ? canScrollForward : canScrollBack;
    // The back arrow points at the start of the row: left in English, right
    // in Arabic.
    const pointsLeft = forward === !isEn;
    return (
      <button
        type="button"
        aria-label={
          forward ? (isEn ? 'Next' : 'التالي') : isEn ? 'Previous' : 'السابق'
        }
        onClick={() => scrollCards(forward)}
        disabled={!enabled}
        className={`hidden md:flex absolute top-1/2 -translate-y-1/2 z-20 w-10 h-10 items-center justify-center rounded-full bg-white shadow-md border border-[#EBDCC5] text-[#234745] transition-all hover:bg-[#FEF8EB] active:scale-95 disabled:opacity-0 disabled:pointer-events-none ${
          pointsLeft ? 'left-0 md:-left-2' : 'right-0 md:-right-2'
        }`}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={pointsLeft ? undefined : {transform: 'rotate(180deg)'}}
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
    );
  };

  const thumbOffset = (scrollProgress * (100 - thumbWidth)) / 100;

  return (
    <div className="relative">
      {arrow(false)}

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className={`flex flex-nowrap gap-4 lg:gap-6 overflow-x-auto hide-scrollbars select-none ${
          isDragging ? 'snap-none' : 'snap-x snap-mandatory'
        } ${showScrollbar ? 'justify-start' : 'justify-center'} ${trackClassName}`}
      >
        {children}
      </div>

      {arrow(true)}

      {/* Horizontal Scroll Progress Bar */}
      {showScrollbar && (
        <div
          onPointerDown={startDrag}
          onPointerMove={onDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className="w-full px-6 mx-auto h-[16px] bg-transparent mt-8 relative cursor-pointer flex items-center justify-center select-none"
          style={{touchAction: 'none'}}
        >
          <div
            ref={scrollbarTrackRef}
            className="w-full h-[3px] bg-[#EBEBEB] rounded-full relative overflow-hidden pointer-events-none"
          >
            <div
              className={`absolute top-0 bottom-0 bg-[#234745] rounded-full ${
                isDragging ? '' : 'transition-all duration-150'
              }`}
              style={{
                width: `${thumbWidth}%`,
                left: isEn ? `${thumbOffset}%` : 'auto',
                right: !isEn ? `${thumbOffset}%` : 'auto',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
