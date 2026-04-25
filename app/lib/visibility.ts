/**
 * Product Visibility Status Utility
 *
 * Determines product availability based on custom metafields:
 *   - custom.visibility_start
 *   - custom.visibility_end
 *
 * Uses server time (Date.now()) — not client time.
 */

export type VisibilityStatus = 'active' | 'scheduled' | 'expired';

export interface VisibilityResult {
  status: VisibilityStatus;
  isActive: boolean;
  label: {
    ar: string;
    en: string;
  };
}

/**
 * Determines product visibility status based on metafield date values.
 *
 * @param visibilityStart - ISO date string from `custom.visibility_start` metafield
 * @param visibilityEnd   - ISO date string from `custom.visibility_end` metafield
 * @param now             - Optional override for current time (useful for server-side consistency)
 * @returns VisibilityResult with status, isActive flag, and localized labels
 */
export function getVisibilityStatus(
  visibilityStart?: string | null,
  visibilityEnd?: string | null,
  now?: number,
): VisibilityResult {
  const currentTime = now ?? Date.now();

  const startTime = visibilityStart
    ? new Date(visibilityStart).getTime()
    : null;

  const endTime = visibilityEnd
    ? new Date(visibilityEnd).getTime()
    : null;

  // Scheduled: current date is before visibility_start
  if (startTime && currentTime < startTime) {
    return {
      status: 'scheduled',
      isActive: false,
      label: {
        ar: 'قريباً',
        en: 'Coming Soon',
      },
    };
  }

  // Expired: current date is after visibility_end
  if (endTime && currentTime > endTime) {
    return {
      status: 'expired',
      isActive: false,
      label: {
        ar: 'غير متاح',
        en: 'Not Available',
      },
    };
  }

  // Active: within the date range (or no constraints set)
  return {
    status: 'active',
    isActive: true,
    label: {
      ar: 'متاح',
      en: 'Available',
    },
  };
}

/**
 * Extracts visibility metafield values from a product object
 * that has `visibility_start` and `visibility_end` aliased metafields.
 */
export function getProductVisibility(product: {
  visibility_start?: { value: string } | null;
  visibility_end?: { value: string } | null;
}, now?: number): VisibilityResult {
  return getVisibilityStatus(
    product.visibility_start?.value,
    product.visibility_end?.value,
    now,
  );
}
