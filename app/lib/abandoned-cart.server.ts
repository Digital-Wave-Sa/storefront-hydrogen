import {SaadeddinApi} from '~/lib/saadeddin-api.server';
import {orderCartCloseInput} from '~/lib/abandoned-cart';

/**
 * Tell the CRM the cart behind this order was bought.
 *
 * Best effort by design: never throws. Shopify retries a webhook that does not
 * answer 2xx, and this runs alongside work that matters more (branch routing,
 * notifications, the CRM order sync), so a failing cart close must not take any
 * of it down. Idempotent at the CRM: COMPLETED drops every pending cart of that
 * phone.
 */
export async function closeAbandonedCart(
  env: any,
  payload: any,
): Promise<boolean> {
  const label = payload?.name ?? payload?.order_number ?? payload?.id;

  const input = orderCartCloseInput(payload);
  if (!input) {
    console.warn(`[Abandoned Cart] Order ${label} has no phone; cart not closed.`);
    return false;
  }

  if (!input.cartId) {
    console.warn(
      `[Abandoned Cart] Order ${input.orderName || input.orderNumber} carries no cart_id note attribute; falling back to cart_token, which the CRM will not recognise.`,
    );
  }

  try {
    const res = await new SaadeddinApi(env).syncCartToCrm(input);
    console.log(
      `[Abandoned Cart] COMPLETED sent for ${input.phone} (${input.orderName || input.orderNumber}) cart=${input.cartId || 'none'} — CRM answered:`,
      JSON.stringify(res ?? {}).slice(0, 300),
    );
    return true;
  } catch (err: any) {
    console.error(
      '[Abandoned Cart] Failed to close cart as COMPLETED:',
      err?.message || err,
    );
    return false;
  }
}
