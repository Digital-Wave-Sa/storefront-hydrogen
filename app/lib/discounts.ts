/**
 * Location-Scoped Discounts Helper for Hydrogen
 * 
 * Specification:
 * - Namespace: "location"
 * - Key: "scope"
 * - Value (JSON): { "type": "all" | "region" | "branch", "ids": ["riyadh", "branch_123"] }
 */

export interface DiscountLocationScope {
  type: 'all' | 'region' | 'branch';
  ids?: string[];
}

export interface DiscountWithMetafields {
  id?: string;
  code?: string;
  title?: string;
  locationScope?: DiscountLocationScope;
  metafield?: {
    value?: string;
  } | null;
  metafields?: Array<{
    namespace?: string;
    key?: string;
    value?: string;
  }> | null;
}

/**
 * Parses the location scope from a discount object's metafields.
 */
export function parseDiscountLocationScope(
  discount: any
): DiscountLocationScope | null {
  if (!discount) return null;
  if (discount.locationScope) {
    return discount.locationScope;
  }
  if (discount.type && discount.ids) {
    return { type: discount.type, ids: discount.ids };
  }

  let scopeValueStr: string | undefined;

  if (discount.metafield?.value) {
    scopeValueStr = discount.metafield.value;
  } else if (discount.metafields) {
    const targetMeta = discount.metafields.find(
      (m: any) => (m?.namespace === 'location' && m?.key === 'scope') || m?.key === 'location_scope'
    );
    scopeValueStr = targetMeta?.value;
  }

  if (!scopeValueStr) return null;

  try {
    const parsed = typeof scopeValueStr === 'string' ? JSON.parse(scopeValueStr) : scopeValueStr;
    if (discount.code && parsed && typeof parsed === 'object' && parsed[discount.code]) {
      const codeScope = parsed[discount.code];
      return codeScope.locationScope || { type: codeScope.type || 'branch', ids: codeScope.ids || [] };
    }
    return parsed.locationScope || { type: parsed.type || 'branch', ids: parsed.ids || [] };
  } catch (e) {
    console.warn('[Discounts] Failed to parse location scope JSON:', e);
    return null;
  }
}

/**
 * Parses a complete location discounts JSON payload from Shop metafield.
 * Supports dictionary format `{ "CODE": { type: "branch", ids: [...], title: "..." } }`
 * and array format `{ "discounts": [ { code: "CODE", type: "branch", ids: [...] } ] }`.
 */
export function parseLocationDiscountsJSON(rawData: any): Array<{
  code: string;
  title?: string;
  description?: string;
  type: 'all' | 'region' | 'branch';
  ids?: string[];
  locationScope?: DiscountLocationScope;
}> {
  if (!rawData) return [];
  let parsed = rawData;
  if (typeof rawData === 'string') {
    try {
      parsed = JSON.parse(rawData);
    } catch (e) {
      return [];
    }
  }

  if (Array.isArray(parsed)) {
    return parsed.map((item) => ({
      code: item.code || item.discountCode || '',
      title: item.title,
      description: item.description,
      type: item.type || item.locationScope?.type || 'branch',
      ids: item.ids || item.locationScope?.ids || [],
      locationScope: item.locationScope || { type: item.type || 'branch', ids: item.ids || [] }
    }));
  }

  if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.discounts)) {
      return parseLocationDiscountsJSON(parsed.discounts);
    }

    return Object.entries(parsed).map(([codeKey, val]: [string, any]) => {
      const isObj = val && typeof val === 'object';
      const type = isObj ? (val.type || val.locationScope?.type || 'branch') : 'branch';
      const ids = isObj ? (val.ids || val.locationScope?.ids || []) : [];
      return {
        code: codeKey,
        title: isObj ? val.title : undefined,
        description: isObj ? val.description : undefined,
        type,
        ids,
        locationScope: { type, ids }
      };
    });
  }

  return [];
}

/**
 * Evaluates whether a discount or promotion is visible/valid for the customer's current location.
 * 
 * @param discount - Discount object containing metafields
 * @param userBranchId - User's selected branch GID or ID (e.g. "gid://shopify/Location/80198500503")
 * @param userRegion - User's selected region or city (e.g. "riyadh")
 * @returns boolean - true if discount is allowed for the location, false otherwise
 */
export function isDiscountValidForLocation(
  discount: DiscountWithMetafields,
  userBranchId?: string | null,
  userRegion?: string | null
): boolean {
  const scope = parseDiscountLocationScope(discount);
  if (!scope) return false;

  if (scope.type === 'all') {
    return true;
  }

  if (scope.type === 'region' && userRegion) {
    const cleanUserRegion = userRegion.trim().toLowerCase();
    return scope.ids.some((id) => id.trim().toLowerCase() === cleanUserRegion);
  }

  if (scope.type === 'branch' && userBranchId) {
    const cleanUserBranch = userBranchId.trim().toLowerCase();
    const userNumericId = userBranchId.split('/').pop()?.toLowerCase();
    return scope.ids.some((id) => {
      const cleanId = id.trim().toLowerCase();
      const targetNumericId = id.split('/').pop()?.toLowerCase();
      return (
        cleanId === cleanUserBranch ||
        (targetNumericId && userNumericId && targetNumericId === userNumericId) ||
        cleanUserBranch.includes(cleanId) ||
        cleanId.includes(cleanUserBranch)
      );
    });
  }

  // If scope specifies branch/region restriction but customer hasn't selected a matching location
  return false;
}

/**
 * Filters a list of discounts or offer cards based on location scope.
 */
export function filterDiscountsForLocation<T extends DiscountWithMetafields>(
  discounts: T[],
  userBranchId?: string | null,
  userRegion?: string | null
): T[] {
  if (!Array.isArray(discounts)) return [];
  return discounts.filter((d) => isDiscountValidForLocation(d, userBranchId, userRegion));
}
