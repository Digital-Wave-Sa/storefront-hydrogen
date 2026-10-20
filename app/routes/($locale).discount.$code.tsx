import {redirect} from 'react-router';
// @ts-ignore - route types generated during build
import type {Route} from './+types/discount.$code';

/**
 * Applies a discount code from a marketing link, e.g. /discount/WELCOME10.
 * If a cart exists the code is ADDED to it; otherwise a cart is created with
 * the code already applied.
 *
 * It used to REPLACE every code on the cart with the link's code. A shopper who
 * had redeemed points (a LOYAL- code — the points leave their balance when
 * redeemed) or applied wallet credit (a CREDIT- code) lost that discount the
 * moment they tapped a campaign link, and the points were never given back,
 * because only the cart's own "remove" path refunds them. Now the codes already
 * on the cart are kept and the link's code is added beside them; Shopify then
 * applies whatever combination its discount settings allow.
 *
 * @example
 * ```js
 * /discount/WELCOME10?redirect=/products
 * ```
 */
export async function loader({request, context, params}: Route.LoaderArgs) {
  const {cart} = context;
  const code = String(params.code || '').trim();

  const url = new URL(request.url);
  const searchParams = new URLSearchParams(url.search);
  let redirectParam =
    searchParams.get('redirect') || searchParams.get('return_to') || '/';

  // Same-site paths only: "//evil.com" and "/\evil.com" both leave the site.
  if (!/^\/(?![\/\\])/.test(redirectParam)) {
    redirectParam = '/';
  }

  searchParams.delete('redirect');
  searchParams.delete('return_to');

  const query = searchParams.toString();
  const redirectUrl = query ? `${redirectParam}?${query}` : redirectParam;

  if (!code) {
    return redirect(redirectUrl);
  }

  try {
    const current = await cart.get().catch(() => null);
    const existing: string[] = (current?.discountCodes || [])
      .map((dc: any) => String(dc?.code || '').trim())
      .filter(Boolean);
    const alreadyThere = existing.some(
      (c) => c.toLowerCase() === code.toLowerCase(),
    );
    const codes = alreadyThere ? existing : [...existing, code];

    const result = await cart.updateDiscountCodes(codes);
    const cartId = result?.cart?.id;
    if (!cartId) {
      console.error('[discount link] cart update returned no cart', result?.errors);
      return redirect(redirectUrl);
    }
    const headers = cart.setCartId(cartId);

    // Using set-cookie on a 303 redirect will not work if the domain origin has
    // a port number (:3000): a newly created cart's id is then not set on
    // localhost:3000.
    return redirect(redirectUrl, {
      status: 303,
      headers,
    });
  } catch (error) {
    console.error('[discount link] failed:', (error as Error)?.message);
    return redirect(redirectUrl);
  }
}
