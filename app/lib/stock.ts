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
  availableForSale: boolean,
  /**
   * Whether Shopify tracks inventory for this variant, when the caller knows.
   *
   * Explicit `false` means the item is sellable everywhere and none of the
   * per-branch reasoning below applies — no counts exist, so an absent
   * location is not evidence of anything. Leave undefined when unknown.
   */
  tracked?: boolean,
): boolean {
  if (!availableForSale) return true;
  if (tracked === false) return false;
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
  /** See getIsOutOfStock — explicit `false` means sellable everywhere. */
  tracked?: boolean,
): boolean {
  if (!availableForSale) return true;

  /**
   * Untracked items skip the branch reasoning FOR DELIVERY ONLY.
   *
   * This was unconditional — `if (tracked === false) return false` — on the
   * argument that an untracked variant has no inventory to be collectable
   * *of*, so an empty `storeAvailability` says nothing and the pickup rule
   * would refuse something Shopify is happy to sell.
   *
   * Half of that is right. Shopify IS happy to sell it: «قالب روشية كبير»
   * (320013) is untracked with `availableForSale: true`, and buying it for
   * delivery works exactly as the product page promises.
   *
   * The other half is not. Shopify decides pickup eligibility from the
   * QUANTITY at each pickup-enabled location and does not care whether the
   * item is tracked. 320013's only inventory record is Shop location at minus
   * one, so checkout offers no pickup point at all and answers «لا توجد مواقع
   * في المملكة العربية السعودية يتوفر فيها عنصرك». The empty list was never
   * noise — it was the literal answer, and this discarded it.
   *
   * What the shopper got: a product page offering «استلام من الفرع — جاهز
   * خلال ١٥ دقيقة», a cart that accepted the choice, and a dead end on the
   * last screen before payment.
   *
   * Delivery keeps the bypass, because there the empty list genuinely is
   * meaningless — delivery ships from wherever the stock is, including
   * locations with no pickup and therefore no `storeAvailability` entry.
   */
  if (!isPickup && tracked === false) return false;

  const hasNodes =
    Array.isArray(storeAvailabilityNodes) && storeAvailabilityNodes.length > 0;

  /**
   * Pickup with nothing collectable anywhere.
   *
   * This read `tracked === true`, which is the same exemption as the guard
   * above wearing a second hat: untracked resolved to `false` and fell
   * through as collectable. Removing only the first guard would have changed
   * nothing, because this one caught it again.
   *
   * `tracked !== undefined` keeps the part that was right. The comment this
   * replaces was defending a real bug: while the branch lookup is in flight
   * `tracked` is `undefined`, an untracked product is indistinguishable from
   * an unstocked one, and refusing on that guess flashed "not available at
   * this branch" before flipping back. Unknown is still not "out". But once
   * the answer is in — tracked or untracked — an empty list means there is
   * nowhere to collect this, and that is Shopify's answer, not a guess.
   */
  if (isPickup && !hasNodes) return tracked !== undefined;

  // Delivery: the per-branch list is not the right signal, so fall back to
  // whether Shopify considers the variant sellable at all.
  if (!isPickup && !hasNodes) return !availableForSale;

  return getIsOutOfStock(
    selectedLocationId,
    selectedLocationName,
    storeAvailabilityNodes,
    availableForSale,
    /**
     * Withheld on the pickup path, deliberately.
     *
     * `getIsOutOfStock` carries the same `tracked === false` bypass at its
     * top, so passing the flag through would reinstate everything removed
     * above the moment a variant has any nodes at all — a third copy of the
     * same exemption. `undefined` is that function's documented "unknown",
     * which makes it read the `storeAvailability` list instead. That list is
     * the authority on collection.
     */
    isPickup ? undefined : tracked,
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
 * The Shopify location id for the branch, however the caller has it.
 *
 * Product grids get `selectedLocationId` from the root session, which is
 * already a `gid://shopify/Location/...`. Resolving that through the
 * locations list is not just unnecessary, it is fragile: root defers the
 * locations, so on first render the list is empty, `findBranchLocation`
 * returns undefined, and the card asks about no branch at all — no request
 * is made, the verdict stays unknown, and every product falls back to
 * looking available. Trust a well-formed gid directly and only fall back to
 * the lookup for the cart's internal branch code (BRNCH150) or a name.
 */
export function resolveBranchLocationId(
  locations: any[],
  branchId?: string | null,
  branchName?: string | null,
): string | undefined {
  const id = String(branchId || '').trim();
  if (/^gid:\/\/shopify\/Location\/\d+$/.test(id)) return id;
  if (/^\d{6,}$/.test(id)) return `gid://shopify/Location/${id}`;
  return findBranchLocation(locations, branchId, branchName)?.id;
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
  entry:
    | {
        stockedHere?: boolean;
        available?: number | null;
        tracked?: boolean;
        inventoryKnown?: boolean;
      }
    | undefined
    | null,
  /**
   * Whether the shopper is collecting. Defaults to false so every caller that
   * does not pass it keeps its exact previous behaviour.
   */
  isPickup = false,
): boolean | null {
  if (!entry) return null;

  /**
   * Untracked inventory is sellable everywhere — for DELIVERY.
   *
   * Shopify keeps no counts for it, so for delivery there is no location list
   * to be absent from and no quantity to be zero, and both tests below would
   * misread that absence as "not stocked at this branch".
   *
   * For pickup the absence is the answer. Shopify decides collection from the
   * quantity at the location whether the item is tracked or not: «قالب روشية
   * كبير» is untracked, its only record is Shop location at −1, and checkout
   * offers no pickup point for it anywhere in the country. So pickup falls
   * through to the same `stockedHere` / `available` tests as a tracked item,
   * which read exactly that data and give the right answer.
   *
   * This was the FOURTH copy of the same exemption, and the one that
   * mattered most for display: every product card consults this before
   * anything else, so while it said "in stock" nothing downstream was asked.
   */
  if (!isPickup && entry.tracked === false) return false;

  /**
   * The inventory item could not be read, so we know nothing. Falling through
   * would hit `stockedHere === false` on an empty level list and report a
   * confident "out of stock here" on no evidence.
   */
  if (entry.inventoryKnown === false || entry.tracked === undefined) return null;

  if (entry.stockedHere === false) return true;
  if (typeof entry.available === 'number') return entry.available <= 0;
  return null;
}

/**
 * Whether the shopper has chosen to collect, from the root loader's session.
 *
 * One definition for every product surface — grid, product page, Best
 * Sellers, New Arrivals — so they cannot drift into disagreeing about which
 * mode the shopper is in. The session is the source of truth; CartLineItem
 * reads the same field first for the same reason.
 */
export function isPickupSession(rootData: any): boolean {
  return String(rootData?.fulfillmentType || '').toLowerCase() === 'pickup';
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

