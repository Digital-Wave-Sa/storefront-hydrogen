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

