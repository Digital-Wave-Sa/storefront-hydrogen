import {data, type LoaderFunctionArgs} from 'react-router';
import {resolveBogoGift} from '~/lib/bogo-suggestion.server';

/**
 * The Buy X Get Y gift the current cart has earned and does not yet hold.
 *
 * GET /api/bogo-suggestion  →  {gift: BogoGift | null}
 *
 * Deliberately its own endpoint rather than extra fields on the cart loader.
 * The cart loader is on the critical path for every cart render, and reading
 * the discount needs the Admin API; a slow or failing lookup there would hold
 * up or break the cart itself. Here the worst case is that the banner does not
 * appear, and the cart is untouched.
 *
 * Reads the cart from the session rather than accepting ids from the caller,
 * so what is offered is decided from the real cart and cannot be steered by a
 * crafted request. Read-only, and reveals nothing a shopper cannot see on the
 * offer page.
 */
export async function loader({context}: LoaderFunctionArgs) {
  try {
    const cart = await context.cart.get();
    const gift = await resolveBogoGift({
      storefront: context.storefront,
      env: context.env,
      cart,
    });

    return data({gift}, {headers: {'Cache-Control': 'no-store'}});
  } catch (err: any) {
    console.error('[bogo-suggestion] Failed:', err?.message || err);
    // Not an error state for the shopper — the banner simply does not show.
    return data({gift: null}, {headers: {'Cache-Control': 'no-store'}});
  }
}
