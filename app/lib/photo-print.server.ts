import {
  PHOTO_ATTR_KEY,
  PHOTO_PRINT_HANDLE,
  isPhotoPrintLine,
  lineAttr,
  linePhotoUrl,
} from '~/lib/photo-print';

/** See ~/lib/photo-print for how the photo print works end to end. */

const PHOTO_PRINT_OFFER_QUERY = `#graphql
  query PhotoPrintOffer($handle: String!, $country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      id
      variants(first: 1) {
        nodes {
          id
          availableForSale
          price { amount currencyCode }
        }
      }
    }
  }
`;

export type PhotoPrintOffer = {variantId: string; price: number};

/**
 * The photo print's variant and price, or null when it cannot be sold (the
 * product was deleted, unpublished or set unavailable) — the page then simply
 * does not offer a photo.
 */
export async function loadPhotoPrintOffer(
  storefront: any,
): Promise<PhotoPrintOffer | null> {
  try {
    const res: any = await storefront.query(PHOTO_PRINT_OFFER_QUERY, {
      variables: {
        handle: PHOTO_PRINT_HANDLE,
        country: storefront.i18n.country,
        language: storefront.i18n.language,
      },
      cache: storefront.CacheShort(),
    });
    const v = res?.product?.variants?.nodes?.[0];
    const price = parseFloat(v?.price?.amount);
    if (!v?.id || v.availableForSale === false || !Number.isFinite(price)) return null;
    return {variantId: v.id, price};
  } catch (e) {
    console.error('[photo-print] Could not load the photo print offer:', e);
    return null;
  }
}

/**
 * Keep every photo print paired with its cake. Run after any line change.
 *
 *   - A photo line whose cake is gone (or never existed) is removed.
 *   - A photo line follows its cake's quantity: one print per cake.
 *   - A cake whose photo line was removed loses its `Cake Photo`, so nothing
 *     reaches the kitchen that was not paid for.
 *
 * Pairing is by `_groupId`. Returns the last cart result when something was
 * changed, otherwise null so the caller keeps its own result. Never throws.
 */
export async function reconcilePhotoPrints(cart: any): Promise<any | null> {
  try {
    const current = await cart.get();
    const lines: any[] = current?.lines?.nodes;
    if (!Array.isArray(lines) || lines.length === 0) return null;

    const photoLines: any[] = lines.filter(isPhotoPrintLine);
    const cakes: any[] = lines.filter(
      (l: any) => !isPhotoPrintLine(l) && linePhotoUrl(l),
    );
    if (photoLines.length === 0 && cakes.length === 0) return null;

    const cakeByGroup = new Map<string, any>();
    for (const c of cakes) {
      const g = lineAttr(c, '_groupId');
      if (g && !cakeByGroup.has(g)) cakeByGroup.set(g, c);
    }

    const removeIds: string[] = [];
    const updates: any[] = [];
    const paid = new Set<string>();

    for (const p of photoLines) {
      const g = lineAttr(p, '_groupId');
      const cake = g ? cakeByGroup.get(g) : null;
      if (!cake || paid.has(g)) {
        removeIds.push(p.id);
        continue;
      }
      paid.add(g);
      if (p.quantity !== cake.quantity) {
        updates.push({id: p.id, quantity: cake.quantity});
      }
    }

    for (const c of cakes) {
      const g = lineAttr(c, '_groupId');
      if (g && paid.has(g) && cakeByGroup.get(g) === c) continue;
      const kept = (c.attributes || [])
        .filter((a: any) => a?.key && a.key !== PHOTO_ATTR_KEY)
        .map((a: any) => ({key: a.key, value: String(a.value ?? '')}));
      updates.push({
        id: c.id,
        quantity: c.quantity,
        attributes: kept.length ? kept : [{key: '_photo_removed', value: '1'}],
      });
    }

    let result: any = null;
    if (removeIds.length) result = await cart.removeLines(removeIds);
    if (updates.length) result = await cart.updateLines(updates);
    if (result) {
      console.log(
        `[photo-print] Reconciled: removed ${removeIds.length}, updated ${updates.length}.`,
      );
    }
    return result;
  } catch (e) {
    console.error('[photo-print] Could not reconcile photo prints:', e);
    return null;
  }
}
