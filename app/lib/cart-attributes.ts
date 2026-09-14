/**
 * Merging cart attributes, because Shopify does not.
 *
 * `cartAttributesUpdate` REPLACES the cart's attribute list. Shopify's own
 * words: "attributes is the complete set the cart should end up with,
 * replacing the existing set rather than merging with it, so send every key
 * the cart should keep. Leaving out an existing key removes it."
 *
 * Every writer in this storefront sent a partial list, so each one deleted the
 * others:
 *
 *   - Picking a delivery date sent `delivery_date` + `Time Slot`, which erased
 *     Branch, Branch ID, Fulfillment Type, Delivery Address, Delivery Fee,
 *     branch_id, Minimum Order Value and the rest.
 *   - Picking a time slot sent `Time Slot` alone, which erased the
 *     `delivery_date` chosen seconds earlier — so the cart demanded a date the
 *     shopper had just given it, and the slot picker, which only renders once a
 *     date exists, vanished underneath them.
 *   - Choosing a branch or address sent the branch set, which erased
 *     `delivery_date` and `Time Slot`.
 *
 * Nothing errored in any of those cases. The mutation succeeded; it simply
 * saved less than the cart had before.
 *
 * Anything writing cart attributes should send the result of this rather than
 * its own keys alone.
 */

export type CartAttribute = {key: string; value: string};

const normalizeKey = (key: unknown) => String(key ?? '').toLowerCase().trim();

/**
 * `existing` first, then `updates` applied over it: a key present in both takes
 * the new value, a key only in `updates` is appended, and a key only in
 * `existing` is carried through untouched.
 *
 * Keys are matched case- and whitespace-insensitively because this codebase
 * reads the same attribute under more than one spelling — `Time Slot` in some
 * places, `time slot` in others, `Fulfillment Type` and `fulfillment type`.
 * Matching exactly would let a second spelling in as a duplicate key, and then
 * which one a reader sees depends on the order Shopify returns them.
 *
 * On a match the EXISTING spelling is kept and only the value replaced. The
 * readers already on the cart expect the spelling the cart already has, so a
 * merge is the wrong moment to rename a key under them.
 */
export function mergeCartAttributes(
  existing: Array<{key?: string | null; value?: string | null}> | null | undefined,
  updates: Array<{key?: string | null; value?: string | null}> | null | undefined,
): CartAttribute[] {
  const merged: CartAttribute[] = [];
  const indexByKey = new Map<string, number>();

  const put = (raw: {key?: string | null; value?: string | null}) => {
    if (!raw || typeof raw.key !== 'string' || !raw.key.trim()) return;
    const key = normalizeKey(raw.key);
    const value = String(raw.value ?? '');
    const at = indexByKey.get(key);

    if (at === undefined) {
      indexByKey.set(key, merged.length);
      merged.push({key: raw.key, value});
      return;
    }

    // Keep the spelling already on the cart; take only the new value.
    merged[at] = {key: merged[at].key, value};
  };

  for (const attribute of existing ?? []) put(attribute);
  for (const attribute of updates ?? []) put(attribute);

  return merged;
}
