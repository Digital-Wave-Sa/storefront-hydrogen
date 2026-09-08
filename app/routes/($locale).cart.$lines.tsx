import {redirect} from 'react-router';
// @ts-ignore - route types generated during build
import type {Route} from './+types/cart.$lines';

/**
 * Automatically creates a new cart based on the URL and sends the shopper to
 * the cart page.
 *
 * It used to redirect to `cart.checkoutUrl`, which walked straight past the
 * login gate on `/checkout/initiate` and past everything the cart collects on
 * the way -- branch, fulfilment type, delivery preference, time slot. A link
 * of this shape was a guest checkout with none of the order's context
 * attached. It now lands on the cart, where the gated button is.
 * Expected URL structure:
 * ```js
 * /cart/<variant_id>:<quantity>
 *
 * ```
 *
 * More than one `<variant_id>:<quantity>` separated by a comma, can be supplied in the URL, for
 * carts with more than one product variant.
 *
 * @example
 * Example path creating a cart with two product variants, different quantities, and a discount code in the querystring:
 * ```js
 * /cart/41007289663544:1,41007289696312:2?discount=HYDROBOARD
 *
 * ```
 */
export async function loader({request, context, params}: Route.LoaderArgs) {
  const {cart} = context;
  const {lines} = params;
  const localePrefix = params.locale ? `/${params.locale}` : '';
  const cartPath = `${localePrefix}/cart`;

  if (!lines) return redirect(cartPath);
  const linesMap = lines.split(',').map((line: any) => {
    const lineDetails = line.split(':');
    const variantId = lineDetails[0];
    const quantity = parseInt(lineDetails[1], 10);

    return {
      merchandiseId: `gid://shopify/ProductVariant/${variantId}`,
      quantity,
    };
  });

  const url = new URL(request.url);
  const searchParams = new URLSearchParams(url.search);

  const discount = searchParams.get('discount');
  const discountArray = discount ? [discount] : [];

  // create a cart
  const result = await cart.create({
    lines: linesMap,
    discountCodes: discountArray,
  });

  const cartResult = result.cart;

  if (result.errors?.length || !cartResult) {
    throw new Response('Link may be expired. Try checking the URL.', {
      status: 410,
    });
  }

  // Update cart id in cookie
  const headers = cart.setCartId(cartResult.id);

  return redirect(cartPath, {headers});
}

export default function Component() {
  return null;
}
