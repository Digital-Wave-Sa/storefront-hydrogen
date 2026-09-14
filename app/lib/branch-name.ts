/**
 * The branch's name in the language the page is being read in.
 *
 * ── Why this exists ──
 *
 * A Shopify Location has exactly one `name`, and it is the English one --
 * «Al Qurayyat». The Arabic name lives in the `custom.name_in_arabic`
 * metafield («القريات»). So `location.name` is not "the branch name", it is
 * "the branch name in English", and rendering it straight into an Arabic
 * sentence produces «غير متاح في فرع Al Qurayyat»: one Latin word, in the
 * middle of an RTL sentence, naming a branch the shopper knows by another
 * name entirely.
 *
 * Several places got this right by hand and several did not, which is the
 * usual reason a fix lands in one message and not the one beside it. This is
 * the single place that knows the rule.
 *
 * ── The shapes ──
 *
 * The same location arrives in three different shapes depending on which
 * loader fetched it, so every reader has had to handle all of them:
 *
 *   - Admin API      -> `metafields: [{key, value}]`
 *   - Storefront API -> `name_in_arabic: {value}`
 *   - Already parsed -> `nameInArabic: string` (DeliveryPickupModal)
 *
 * All three are read here so callers do not have to care which one they hold.
 */

/** Pull a metafield value off a location in whichever shape it arrived in. */
function metaValue(location: any, key: string): string {
  if (!location) return '';

  // Storefront API: aliased field with a `.value`, or already flattened.
  const direct = location[key];
  if (direct && typeof direct === 'object' && 'value' in direct) {
    return String(direct.value ?? '').trim();
  }
  if (typeof direct === 'string') return direct.trim();

  // Admin API: a metafields array (or a `.nodes` connection around one).
  const list = Array.isArray(location.metafields)
    ? location.metafields
    : Array.isArray(location.metafields?.nodes)
      ? location.metafields.nodes
      : [];

  const found = list.find((m: any) => m?.key === key);
  return found?.value ? String(found.value).trim() : '';
}

/**
 * The display name for a branch, or '' when the location cannot supply one.
 *
 * Returning empty rather than a placeholder is deliberate: only the caller
 * knows what belongs in the sentence when the branch is unknown -- «هذا
 * الفرع» in one place, «فرعك» in another, «اختر الفرع» in the picker -- and
 * a helper guessing at that is how «غير متاح في فرع Select Your Branch»
 * happens.
 *
 * English falls back to the Arabic name and vice versa, because a branch the
 * shopper can name in the wrong language still beats a branch with no name.
 */
export function branchDisplayNameFor(location: any, isEn: boolean): string {
  if (!location) return '';

  /** Shopify's own `name` IS the English name; there is no metafield for it. */
  const english = String(location.name || location.rawName || '').trim();
  const arabic =
    String(location.nameInArabic || '').trim() ||
    metaValue(location, 'name_in_arabic');

  if (isEn) return english || arabic;
  return arabic || english;
}
