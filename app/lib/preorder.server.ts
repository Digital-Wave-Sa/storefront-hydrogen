import {
  getPreorderInfo,
  isPreorderLine,
  PREORDER_LINE_ATTR,
} from '~/lib/preorder';
import {isAddonOnlyProduct, isPhotoPrintLine} from '~/lib/photo-print';

/**
 * Server half of the pre-order rules (~/lib/preorder): run by the cart action
 * before `addLines`, so the «separate orders» rule holds whichever button or
 * page the add came from.
 */

const VARIANT_PREORDER_QUERY = `#graphql
  query PreorderVariants($ids: [ID!]!, $country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    nodes(ids: $ids) {
      ... on ProductVariant {
        id
        product {
          id
          title
          handle
          tags
          preorder_enabled: metafield(namespace: "custom", key: "preorder_enabled") { value }
          preorder_available_from: metafield(namespace: "custom", key: "preorder_available_from") { value }
          preorder_lead_days: metafield(namespace: "custom", key: "preorder_lead_days") { value }
          preorder_until: metafield(namespace: "custom", key: "preorder_until") { value }
        }
      }
    }
  }
` as const;

/** Lines that ride along with a main item and take its side (photo prints, BOGO gifts, add-ons). */
function isCompanionLine(line: any): boolean {
  const attrs = line?.attributes || [];
  if (attrs.some((a: any) => (a?.key === '_is_addon' || a?.key === '_is_free') && a?.value === 'true')) {
    return true;
  }
  if (isPhotoPrintLine(line)) return true;
  if (isAddonOnlyProduct(line?.merchandise?.product)) return true;
  return false;
}

export type PreorderAddCheck =
  | {ok: true; lines: any[]}
  | {ok: false; reason: 'mixed' | 'closed'; productTitle?: string};

/**
 * Decide whether `newLines` may join the current cart, and stamp pre-order
 * lines with `_is_preorder` so the cart, checkout and order carry the fact.
 * Fails open (adds as before) if the lookup itself fails.
 */
export async function checkPreorderAdd(
  context: any,
  newLines: any[],
): Promise<PreorderAddCheck> {
  try {
    const ids = Array.from(
      new Set(newLines.map((l) => l?.merchandiseId).filter(Boolean)),
    );
    if (!ids.length) return {ok: true, lines: newLines};

    const {nodes} = await context.storefront.query(VARIANT_PREORDER_QUERY, {
      variables: {
        ids,
        country: context.storefront.i18n.country,
        language: context.storefront.i18n.language,
      },
      cache: context.storefront.CacheNone(),
    });
    const productByVariant = new Map<string, any>();
    for (const n of nodes || []) if (n?.id) productByVariant.set(n.id, n.product);

    // The incoming batch: which main lines are pre-orders?
    let incomingPre = false;
    let incomingNormal = false;
    for (const l of newLines) {
      const product = productByVariant.get(l.merchandiseId);
      const asLine = {...l, merchandise: {product}};
      if (isCompanionLine(asLine)) continue;
      const info = getPreorderInfo(product);
      if (info.isPreorder) {
        if (info.closed) return {ok: false, reason: 'closed', productTitle: product?.title};
        incomingPre = true;
      } else {
        incomingNormal = true;
      }
    }
    if (incomingPre && incomingNormal) return {ok: false, reason: 'mixed'};

    // Against what is already in the cart.
    const current = await context.cart.get();
    const existing = (current?.lines?.nodes || []).filter((l: any) => !isCompanionLine(l));
    if (existing.length && (incomingPre || incomingNormal)) {
      const cartHasPre = existing.some(isPreorderLine);
      const cartHasNormal = existing.some((l: any) => !isPreorderLine(l));
      if ((incomingPre && cartHasNormal) || (incomingNormal && cartHasPre)) {
        return {ok: false, reason: 'mixed'};
      }
    }

    const lines = newLines.map((l) => {
      const info = getPreorderInfo(productByVariant.get(l.merchandiseId));
      if (!info.isPreorder) return l;
      const attrs = (l.attributes || []).filter((a: any) => a.key !== PREORDER_LINE_ATTR);
      return {...l, attributes: [...attrs, {key: PREORDER_LINE_ATTR, value: 'true'}]};
    });
    return {ok: true, lines};
  } catch (error) {
    console.error('[preorder] check failed, adding without it:', error);
    return {ok: true, lines: newLines};
  }
}
