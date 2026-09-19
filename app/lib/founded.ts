/**
 * How long Saadeddin has been going.
 *
 * Two pages carried this as a typed-in number and they disagreed: the export
 * page said «+105» and the about page «100+», while 1919 to 2026 is 107. Both
 * were right when they were typed and went stale a year later, which is what a
 * hardcoded age does.
 *
 * Derived from the founding year instead, so it is right every January without
 * anyone remembering. The two pages now read the same figure because they read
 * the same one.
 *
 * Evaluated per render rather than at module load, so a long-lived worker does
 * not keep serving last year's number.
 */

export const FOUNDED_YEAR = 1919;

export function yearsSinceFounding(): number {
  return new Date().getFullYear() - FOUNDED_YEAR;
}
