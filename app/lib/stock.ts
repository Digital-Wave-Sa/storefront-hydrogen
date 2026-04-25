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
  if (!selectedLocationId) return !availableForSale;

  // Fallback branches (not in Shopify)
  if (selectedLocationId.startsWith('fallback-')) {
    return !availableForSale;
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

  // If the API returned stock for SOME locations but not ours, it's truly out of stock here.
  if (storeAvailabilityNodes.length > 0) return true;

  // If NO store availability info was returned at all (empty list), fall back to global status
  return !availableForSale;
}
