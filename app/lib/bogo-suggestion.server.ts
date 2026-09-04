/**
 * "You qualify for a free X" — the gift a cart has earned but does not hold.
 *
 * Shopify never adds the free half of a Buy X Get Y discount itself. Its own
 * admin screen says so under "Customer gets": *"Customers must add the quantity
 * of items specified below to their cart."* The discount only ever discounts a
 * line that is already there, so a shopper who adds the qualifying product and
 * stops sees one paid line and no gift, with nothing to tell them why.
 *
 * This resolves what the cart has earned so the storefront can offer it. It
 * only reads — deciding, adding and pricing all stay where they were.
 *
 * ## Why a suggestion rather than adding it automatically
 *
 * Adding the gift behind the shopper's back needs the storefront to mark that
 * line free, and marking a line free is not cosmetic here: CartSummary
 * subtracts any `_is_free` line from the displayed subtotal. If Shopify then
 * does not discount it — the qualifying product was removed, the offer ended,
 * the gift went out of stock — the cart quietly shows less than checkout will
 * charge.
 *
 * Offering it instead keeps Shopify the single source of truth for money. The
 * gift goes in as an ordinary line with no attributes, Shopify's automatic
 * discount zeroes it, and the cart renders Shopify's own numbers. If the
 * discount stops applying the line simply shows its real price, which is
 * honest rather than a surprise at checkout.
 *
 * Admin API for the discount (tags are not on the Storefront API), so server
 * only — see the note atop offer-discounts.server.ts.
 */

import {fetchOfferByTags} from '~/lib/offer-discounts.server';
import {OFFER_HANDLES, tagsForOfferHandle} from '~/lib/offer-tags';

/**
 * Operation names are validated project-wide by Hydrogen's codegen, so this is
 * prefixed to stay clear of the similarly shaped offer queries.
 */
const BOGO_GIFT_PRODUCTS_QUERY = `#graphql
  query bogoSuggestionGiftProducts($ids: [ID!]!, $country: CountryCode, $language: LanguageCode) @inContext(country: $country, language: $language) {
    nodes(ids: $ids) {
      ... on Product {
        id
        handle
        title
        availableForSale
        featuredImage {
          url
          altText
        }
        variants(first: 1) {
          nodes {
            id
            availableForSale
            price {
              amount
              currencyCode
            }
          }
        }
      }
    }
  }
` as const;

export interface BogoGift {
  /** Which offer granted this, for the banner's wording and for logging. */
  offerHandle: string;
  offerTitle?: string;
  productId: string;
  variantId: string;
  handle: string;
  title: string;
  imageUrl?: string;
  imageAlt?: string;
  price?: {amount: string; currencyCode: string};
}

/**
 * The gift this cart has earned and does not yet hold, or null.
 *
 * Null is the ordinary answer: no Buy X Get Y running, nothing qualifying in
 * the cart, the gift already in it, or the gift out of stock. Callers render
 * nothing on null — never an error state, since not qualifying is not a
 * failure.
 *
 * Ignores the `both` role — a 1+1 on the *same* product. That is a second unit
 * of a line that already exists rather than a new line, and Shopify applies it
 * to the existing line once the quantity is there.
 */
export async function resolveBogoGift({
  storefront,
  env,
  cart,
}: {
  storefront: any;
  env: any;
  cart: any;
}): Promise<BogoGift | null> {
  const lines = cart?.lines?.nodes || [];
  if (lines.length === 0) return null;

  const productIdsInCart = new Set(
    lines.map((line: any) => line?.merchandise?.product?.id).filter(Boolean),
  );
  if (productIdsInCart.size === 0) return null;

  for (const handle of OFFER_HANDLES) {
    let offer;
    try {
      offer = await fetchOfferByTags(env, tagsForOfferHandle(handle));
    } catch (err) {
      console.error(`[bogo] Could not read the ${handle} discount:`, err);
      continue;
    }

    if (!offer?.isBxgy) continue;

    const buyIds = offer.products
      .filter((p) => p.role === 'buy')
      .map((p) => p.id);
    const giftIds = offer.products
      .filter((p) => p.role === 'get')
      .map((p) => p.id);

    if (buyIds.length === 0 || giftIds.length === 0) continue;

    // Nothing in the cart qualifies for this offer.
    if (!buyIds.some((id) => productIdsInCart.has(id))) continue;

    // Already there — whether the shopper added it or a previous suggestion
    // did. Offering it again would hand them a second one the discount does
    // not cover.
    if (giftIds.some((id) => productIdsInCart.has(id))) continue;

    let giftProducts: any[] = [];
    try {
      const res: any = await storefront.query(BOGO_GIFT_PRODUCTS_QUERY, {
        variables: {
          ids: giftIds,
          country: storefront.i18n?.country,
          language: storefront.i18n?.language,
        },
        cache: storefront.CacheNone(),
      });
      giftProducts = (res?.nodes || []).filter(Boolean);
    } catch (err) {
      console.error(`[bogo] Could not read the ${handle} gift product:`, err);
      continue;
    }

    for (const product of giftProducts) {
      const variant = product?.variants?.nodes?.[0];
      if (!variant?.id) continue;
      /**
       * Out of stock is worse than silent here: Shopify rejects an
       * unfulfillable line inside cartLinesAdd while letting the rest of the
       * request through, so offering it would produce a button that appears
       * to do nothing.
       *
       * This is Shopify's global sellable flag, not per-branch stock. A gift
       * held at another branch can still be offered and then flagged by the
       * cart's own per-branch check once it is in.
       */
      if (product.availableForSale === false) continue;
      if (variant.availableForSale === false) continue;

      return {
        offerHandle: handle,
        offerTitle: offer.title,
        productId: product.id,
        variantId: variant.id,
        handle: product.handle,
        title: product.title,
        imageUrl: product.featuredImage?.url,
        imageAlt: product.featuredImage?.altText || product.title,
        price: variant.price,
      };
    }

    console.warn(`[bogo] ${handle}: cart qualifies but no gift is in stock.`);
    return null;
  }

  return null;
}
