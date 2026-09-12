import type {ActionFunctionArgs} from 'react-router';
import {logCheckoutError} from '~/lib/error-log.server';

/**
 * Payment failures, reported to the CRM.
 *
 * The problem this solves is that a declined card is invisible to this
 * storefront. Payment happens inside Shopify's hosted checkout, on Shopify's
 * pages, after `checkout.initiate` redirects -- our code is not running, so no
 * `catch` we write will ever see it.
 *
 * Shopify does record it. Every attempt becomes an order transaction carrying
 * `status`, an `errorCode` and the `gateway` that refused it, whatever gateway
 * that is -- «bogus» today, Moyasar once the store goes live. Reading the
 * transactions off an order webhook is therefore the one way to learn about a
 * decline from the server side, and it needs no gateway-specific integration.
 *
 * WHAT THIS CANNOT SEE, and it is worth being plain about: a payment that
 * fails before Shopify creates an order at all leaves no order to attach a
 * transaction to, and so produces no webhook here. Those shoppers are only
 * visible as an abandoned checkout (`checkouts/update`, `completed_at: null`),
 * which says they did not finish but never says why. To catch the reason for
 * those, the gateway's own webhook -- Moyasar's `payment_failed` -- has to
 * point at a route like this one too. That is a second source feeding the same
 * reporter, not a replacement for it.
 *
 * Subscribe this route to `orders/create`, `orders/updated` and `orders/paid`.
 */
export async function action({request, context}: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', {status: 405});
  }

  const {env} = context;

  try {
    const topic = request.headers.get('x-shopify-topic') || 'unknown';
    const payload = (await request.json()) as any;

    if (!payload?.id) {
      return Response.json({success: false, error: 'Invalid payload'}, {status: 400});
    }

    /**
     * Shopify spells a failed transaction `status: "failure"` on the REST
     * webhook body and `FAILURE` on GraphQL. Both are accepted rather than
     * picking one and being silently wrong on the other.
     *
     * `error` is included too: a transaction can carry a gateway message while
     * its status reads something else, and a message is the whole point here.
     */
    const transactions: any[] = Array.isArray(payload.transactions)
      ? payload.transactions
      : [];

    const failed = transactions.filter((t: any) => {
      const status = String(t?.status || '').toLowerCase();
      return status === 'failure' || status === 'error';
    });

    if (!failed.length) {
      // Nothing wrong with this order's payment. Not worth a line in the log.
      return Response.json({success: true, reported: 0});
    }

    for (const t of failed) {
      /**
       * The gateway's own words first. `error_code` is Shopify's normalised
       * code; the message beneath it is what a human can act on.
       */
      const gateway = t?.gateway || payload?.gateway || 'unknown';
      const code = t?.error_code || t?.errorCode || 'none';
      const detail =
        t?.message ||
        t?.payment_details?.error_message ||
        t?.receipt?.message ||
        '';

      await logCheckoutError(env, {
        stage: 'payment_failed',
        message:
          `Payment declined by ${gateway} on order ${payload.name || payload.order_number || payload.id}` +
          ` — code=${code}${detail ? ` — ${detail}` : ''}`,
        phone:
          payload?.customer?.phone ||
          payload?.shipping_address?.phone ||
          payload?.billing_address?.phone ||
          null,
        /**
         * The cart the browser opened, when the order carries it. The webhook
         * that closes abandoned carts reads the same attribute, so a failure
         * and its cart can be matched up on the CRM's side.
         */
        cartId:
          (payload.note_attributes || []).find(
            (a: any) => (a?.name || a?.key) === 'cart_id',
          )?.value ||
          payload?.cart_token ||
          null,
        branchName:
          (payload.note_attributes || []).find(
            (a: any) => (a?.name || a?.key) === 'Branch',
          )?.value || null,
        locationId:
          (payload.note_attributes || []).find(
            (a: any) => (a?.name || a?.key) === 'Branch ID',
          )?.value || null,
        fulfillmentType:
          (payload.note_attributes || []).find(
            (a: any) => (a?.name || a?.key) === 'Fulfillment Type',
          )?.value || null,
        locale: null,
        userErrors: {
          topic,
          order_id: payload.id,
          order_name: payload.name || null,
          gateway,
          error_code: code,
          amount: t?.amount || payload?.total_price || null,
          currency: t?.currency || payload?.currency || null,
          transaction_id: t?.id || null,
          processed_at: t?.processed_at || null,
        },
      });
    }

    console.log(
      `[Payment Failure Webhook] Reported ${failed.length} failed transaction(s) on ${payload.name || payload.id}`,
    );

    return Response.json({success: true, reported: failed.length});
  } catch (error: any) {
    console.error('[Payment Failure Webhook] Error:', error);
    /**
     * 200 on purpose. A non-2xx makes Shopify retry the webhook, and retrying
     * will not fix a bug in this handler -- it only buries the real failure
     * under duplicates.
     */
    return Response.json({success: false, error: error?.message || 'error'});
  }
}
