/**
 * Utility functions for handling time slots and extracting minimum time for CRM payload.
 */

/**
 * Extracts the start/minimum time from a time range string.
 * e.g., "5:00 PM - 6:00 PM" -> "5:00 PM"
 * e.g., "5:00 م - 6:00 م" -> "5:00 م"
 */
export function extractMinTime(slotStr: string | null | undefined): string {
  if (!slotStr) return '';

  const clean = String(slotStr).trim();
  if (!clean) return '';

  if (clean.includes('-')) {
    const parts = clean.split('-');
    return parts[0].trim();
  }

  if (clean.toLowerCase().includes(' to ')) {
    const parts = clean.split(/ to /i);
    return parts[0].trim();
  }

  if (clean.includes('إلى')) {
    const parts = clean.split('إلى');
    return parts[0].trim();
  }

  return clean;
}

/**
 * Formats an hour integer into a 1-hour time range string.
 * e.g., 17 (isEn=true) -> "5:00 PM - 6:00 PM"
 * e.g., 17 (isEn=false) -> "5:00 م - 6:00 م"
 */
export function formatHourRange(h: number, isEn: boolean): string {
  const startNormalized = h % 24;
  const endNormalized = (h + 1) % 24;

  const startPeriod = startNormalized >= 12 ? (isEn ? 'PM' : 'م') : (isEn ? 'AM' : 'ص');
  const endPeriod = endNormalized >= 12 ? (isEn ? 'PM' : 'م') : (isEn ? 'AM' : 'ص');

  let startDisplay = startNormalized % 12;
  if (startDisplay === 0) startDisplay = 12;

  let endDisplay = endNormalized % 12;
  if (endDisplay === 0) endDisplay = 12;

  return `${startDisplay}:00 ${startPeriod} - ${endDisplay}:00 ${endPeriod}`;
}

/**
 * Show a stored time slot in the language being read.
 *
 * A slot is written onto the cart as text -- «2:00 م - 3:00 م» -- at the moment
 * the shopper picks it, in whichever language they were using. It is then
 * displayed verbatim, so an English shopper saw «6:00 م - 7:00 م»: English
 * words around an Arabic clock. The reverse happens to an Arabic shopper who
 * chose the slot on the English site.
 *
 * Only the meridiem marker carries language here; the digits and the dash are
 * already shared. So this swaps that one token rather than parsing and
 * rebuilding the string, which keeps every other format the branches use --
 * half hours, other separators -- intact.
 */
export function localizeTimeSlot(
  slot: string | null | undefined,
  isEn: boolean,
): string {
  const value = String(slot ?? '').trim();
  if (!value) return '';

  return isEn
    ? value.replace(/م/g, 'PM').replace(/ص/g, 'AM')
    : value
        .replace(/\bPM\b/gi, 'م')
        .replace(/\bAM\b/gi, 'ص');
}
