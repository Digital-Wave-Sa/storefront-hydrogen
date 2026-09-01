/**
 * Normalizes a Shopify GID or numeric ID for comparison.
 */
export function normalizeId(id?: string | null): string {
  if (!id) return '';
  return id.split('/').pop() || id;
}

/**
 * Normalizes a branch/location name for comparison.
 */
export function normalizeName(name?: string | null): string {
  if (!name) return '';
  return name.trim().toLowerCase();
}

/**
 * Robust stock availability check.
 * 
 * @param selectedLocationId - The branch ID from the user session
 * @param selectedLocationName - The branch name from the user session
 * @param storeAvailabilityNodes - The stock nodes from the Shopify API
 * @param availableForSale - The global availability flag from Shopify
 * @returns boolean - true if out of stock, false if available
 */
export function getIsOutOfStock(
  selectedLocationId: string | undefined | null,
  selectedLocationName: string | undefined | null,
  storeAvailabilityNodes: any[],
  availableForSale: boolean
): boolean {
  if (!availableForSale) return true;
  if (!selectedLocationId) return false;

  // Fallback branches (not in Shopify)
  if (selectedLocationId.startsWith('fallback-')) {
    return false;
  }

  const availableNode = storeAvailabilityNodes.find((node: any) => {
    const nodeId = node.location?.id;
    const nodeName = node.location?.name;
    if (!nodeId) return false;

    return (
      nodeId === selectedLocationId ||
      normalizeId(nodeId) === normalizeId(selectedLocationId) ||
      (selectedLocationName && normalizeName(nodeName) === normalizeName(selectedLocationName))
    );
  });

  // If we found the specific location in the stock list, use its status
  if (availableNode) return !availableNode.available;

  // If storeAvailability data exists for this variant but the selected branch is not listed,
  // it means the product is out of stock at this specific branch.
  if (Array.isArray(storeAvailabilityNodes) && storeAvailabilityNodes.length > 0) {
    return true;
  }

  // Fallback to global Shopify availableForSale status only if storeAvailability data is absent
  return !availableForSale;
}

/**
 * Availability for a specific fulfilment method.
 *
 * `storeAvailability` answers one question: can this variant be COLLECTED
 * at this location. Shopify lists a location only when local pickup is on
 * there AND the variant is actually collectable, so a variant with 1000
 * units in a non-pickup warehouse and 0 available at the pickup branch
 * comes back with an EMPTY list.
 *
 * That distinction matters:
 *
 * - PICKUP: an empty list means there is nowhere to collect it. Treating
 *   that as 'available' (which the plain fallback does) put items in the
 *   cart that no branch could hand over.
 *
 * - DELIVERY: an empty list says nothing useful. Delivery ships from
 *   wherever the stock is, so blocking on it would reject a product that
 *   has plenty of inventory in a warehouse without pickup enabled.
 */
export function getIsOutOfStockForFulfillment(
  selectedLocationId: string | undefined | null,
  selectedLocationName: string | undefined | null,
  storeAvailabilityNodes: any[],
  availableForSale: boolean,
  isPickup: boolean,
): boolean {
  if (!availableForSale) return true;

  const hasNodes =
    Array.isArray(storeAvailabilityNodes) && storeAvailabilityNodes.length > 0;

  // Pickup with nothing collectable anywhere.
  if (isPickup && !hasNodes) return true;

  // Delivery: the per-branch list is not the right signal, so fall back to
  // whether Shopify considers the variant sellable at all.
  if (!isPickup && !hasNodes) return !availableForSale;

  return getIsOutOfStock(
    selectedLocationId,
    selectedLocationName,
    storeAvailabilityNodes,
    availableForSale,
  );
}

/**
 * Find the Shopify location for the branch stored on the cart.
 *
 * The cart does not store a Shopify location id. `handleSelectBranchFromCart`
 * writes `Branch ID` as `customBranchId || bId` — the branch's own
 * `branch_id` metafield wins — so the attribute usually holds an internal
 * code like BRNCH150, not `gid://shopify/Location/…`. And `Branch` holds the
 * label the shopper saw, which is Arabic (ابها) while the Shopify location
 * is named in English (Abha).
 *
 * Matching only on gid and English name therefore failed for every branch
 * picked through the UI: no location was found, the raw code was passed to
 * the inventory lookup, nothing matched it, and every line came back
 * 'not stocked here' — including products with a thousand units at that
 * very branch.
 */
export function findBranchLocation(
  locations: any[],
  branchId?: string | null,
  branchName?: string | null,
): any | undefined {
  if (!Array.isArray(locations) || locations.length === 0) return undefined;

  const id = String(branchId || '').trim();
  const idNum = normalizeId(id);
  const name = normalizeName(branchName);

  const metaValue = (loc: any, key: string) => {
    if (loc?.[key]?.value) return String(loc[key].value);
    if (typeof loc?.[key] === 'string') return loc[key];
    const m = loc?.metafields?.find((f: any) => f?.key === key);
    return m?.value ? String(m.value) : '';
  };

  const sameId = (loc: any) =>
    !!id &&
    (loc.id === id ||
      normalizeId(loc.id) === idNum ||
      String(loc.numericalId || '') === idNum ||
      metaValue(loc, 'branch_id') === id ||
      metaValue(loc, 'branch_code') === id ||
      metaValue(loc, 'ax_store_id') === id);

  const sameName = (loc: any) =>
    !!name &&
    (normalizeName(loc.name) === name ||
      normalizeName(metaValue(loc, 'name_in_arabic')) === name);

  return locations.find(sameId) || locations.find(sameName);
}

/**
 * Is this variant stocked at the branch fulfilling the order?
 *
 * Answered from Shopify's inventory levels (see /api/branch-availability),
 * not from `storeAvailability`. The branch fulfils both pickup and delivery,
 * so the question is the same either way: does that location hold the item.
 *
 * Returns null when we cannot tell — no data yet, the lookup failed, or the
 * variant's inventory is untracked (Shopify keeps no counts for those, so an
 * absent location proves nothing). Callers must treat null as 'do not flag'
 * rather than guessing, which is what the old storeAvailability fallback did.
 */
export function isOutOfStockAtBranch(
  entry: {stockedHere?: boolean; available?: number | null; tracked?: boolean} | undefined | null,
): boolean | null {
  if (!entry) return null;
  if (entry.tracked === false) return false;
  if (entry.stockedHere === false) return true;
  if (typeof entry.available === 'number') return entry.available <= 0;
  return null;
}

/**
 * Checks if a product is a B2B/Corporate product intended only for /corporate.
 */
export function isCorporateProduct(product: any): boolean {
  if (!product) return false;
  const tags = product.tags || product.product?.tags || [];
  if (Array.isArray(tags)) {
    return tags.some((t: string) => {
      const tagLower = String(t).toLowerCase().trim();
      return tagLower === 'corporate' || tagLower === 'b2b' || tagLower === 'package';
    });
  }
  return false;
}

/**
 * Checks if a product should be hidden entirely from the storefront.
 * A product is hidden if it is a corporate product (outside /corporate)
 * or if its hide_if_unavailable metafield is 'true' and it is out of stock.
 */
export function shouldHideProduct(
  product: any,
  selectedLocationId: string | undefined | null,
  selectedLocationName: string | undefined | null,
  isCorporatePage: boolean = false
): boolean {
  if (!product) return false;

  // Always hide corporate/b2b products outside the /corporate page
  if (!isCorporatePage && isCorporateProduct(product)) {
    return true;
  }

  const hideIfUnavailable = product.hide_if_unavailable?.value === 'true';
  if (!hideIfUnavailable) return false;

  const variants = product.variants?.nodes || [];
  if (variants.length === 0) {
    return !product.availableForSale;
  }

  // A product is out of stock if ALL of its variants are out of stock
  const anyVariantAvailable = variants.some((v: any) => {
    const isOutOfStock = getIsOutOfStock(
      selectedLocationId,
      selectedLocationName,
      v.storeAvailability?.nodes || [],
      v.availableForSale !== undefined ? v.availableForSale : product.availableForSale
    );
    return !isOutOfStock;
  });

  return !anyVariantAvailable;
}

