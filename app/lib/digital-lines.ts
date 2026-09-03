/**
 * Which cart lines are gift vouchers rather than merchandise.
 *
 * A voucher has no branch, no pickup slot and no delivery date, so the cart
 * hides all of that when every line is one. That test used to live inline and
 * identically in CartMain and CartSummary, and asked three questions that
 * could all miss the same line:
 *
 *   1. the `_gift_voucher` attribute — set by GiftVoucherWizard when the
 *      shopper builds a voucher, and lost the moment a line is added any
 *      other way. Reorder rebuilds lines from `{merchandiseId, quantity}`
 *      alone, so a reordered voucher carries no attributes at all.
 *   2. `product.isGiftCard` — which the cart fragments never selected, so it
 *      was `undefined` on every line and the clause could never fire.
 *   3. two hard-coded handles, one of which the wizard invents locally rather
 *      than reading back from Shopify, so nothing verified it matches the
 *      real product.
 *
 * With all three missing, a cart holding nothing but a gift card asked the
 * shopper to choose a branch, a delivery date and a pickup time slot for it.
 *
 * WHY NOT `requiresShipping`: it looks like the right question and it is not.
 * Shopify sets it per variant, and in this catalogue it is false on ordinary
 * merchandise too — a ceramic serving plate came back false and was
 * classified as a voucher on that basis alone.
 * Branch fulfilment means very little here is "shipped" in Shopify's sense,
 * so the flag says nothing about whether an item is physical. Identity is the
 * question that can actually be answered: is this line THE gift-card product.
 */

/** The gift-card product, as queried in buy-gift-card.tsx. */
export const GIFT_CARD_PRODUCT_ID = 'gid://shopify/Product/9370203521257';

/** Handle spellings for the gift-card product. */
const GIFT_CARD_HANDLE_PATTERN = /gift[-_]?card/i;

/**
 * Title match, for the case where none of the ids reach the caller — an order
 * line from the REST fallback, say. Deliberately narrow: it wants the phrase,
 * not the word "gift", so a gift-wrapped cake or a product merely tagged
 * "gift" is never caught by it.
 */
const GIFT_CARD_TITLE_PATTERN = /gift\s*card|بطاقة\s*هدية/i;

/**
 * True when this line is a gift voucher: no branch, no address, no time slot,
 * and it cannot be reordered by variant id alone.
 */
export function isNonShippableLine(line: any): boolean {
  if (!line) return false;

  const merchandise = line.merchandise ?? line;
  const product = merchandise?.product;

  // Shopify's own answer, when the caller selected it.
  if (product?.isGiftCard === true) return true;

  if (product?.id && String(product.id) === GIFT_CARD_PRODUCT_ID) return true;

  if (product?.handle && GIFT_CARD_HANDLE_PATTERN.test(String(product.handle))) {
    return true;
  }

  const title = product?.title ?? line.title ?? merchandise?.title ?? '';
  if (title && GIFT_CARD_TITLE_PATTERN.test(String(title))) return true;

  // Set by the voucher wizard; survives only while the line keeps its
  // attributes, which a reorder does not.
  return (
    line.attributes?.some(
      (a: any) => a?.key === '_gift_voucher' && a?.value === 'true',
    ) ?? false
  );
}

/** True when the cart has lines and every one of them is a voucher. */
export function isDigitalOnlyCart(cart: any): boolean {
  const nodes = cart?.lines?.nodes;
  if (!Array.isArray(nodes) || nodes.length === 0) return false;
  return nodes.every(isNonShippableLine);
}
