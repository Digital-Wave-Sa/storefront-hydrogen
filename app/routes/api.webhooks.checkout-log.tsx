import type {ActionFunctionArgs} from 'react-router';
import {describeRejection, verifyShopifyWebhook} from '~/lib/webhook-verify.server';

/**
 * Abandoned checkouts, forwarded to the CRM's `/logCartCheckout`.
 *
 * Distinct from `api.webhooks.payment-failure`, which reports declines, and
 * from `syncCartToCrm`, which sends the ACTIVE/CLEARED/COMPLETED feed the
 * WhatsApp recovery messages run on. This one answers a third question: who
 * reached Shopify's checkout and did not finish.
 *
 * The body is passed through rather than rebuilt. Every field in the spec --
 * `token`, `cart_token`, `abandoned_checkout_url`, `line_items`,
 * `completed_at`, `closed_at`, the totals -- is a field Shopify already sends
 * on `checkouts/create` and `checkouts/update`. Constructing our own version
 * would only give it something to drift away from. `event_type` is the one
 * addition, because Shopify carries the topic in a header rather than the body.
 *
 * Subscribe to `checkouts/create` and `checkouts/update` in Shopify admin
 * (Settings → Notifications → Webhooks → https://saadeddin.com/api/webhooks/checkout-log).
 * Admin webhooks are signed with the shop's signing secret, SHOPIFY_WEBHOOK_SECRET,
 * the same one api.webhooks.orders checks.
 */

/** Shopify's own topics for this. Anything else is ignored rather than sent. */
const CHECKOUT_TOPICS = ['checkouts/create', 'checkouts/update'];

export async function action({request, context}: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', {status: 405});
  }

  const {env} = context;

  /**
   * Only Shopify. The URL is public and the body is forwarded to the CRM as a
   * shopper's checkout, so an unsigned POST could plant fake abandoned carts
   * (and WhatsApp follow-ups) for any phone number. 401, not 200: a request
   * that fails this did not come from Shopify, so there is no retry to avoid.
   */
  const verification = await verifyShopifyWebhook(request, env);
  if (!verification.ok) {
    console.warn(describeRejection('Checkout Log', verification, request));
    return new Response('Unauthorized', {status: 401});
  }

  try {
    const topic = request.headers.get('x-shopify-topic') || '';
    const payload = JSON.parse(verification.rawBody) as any;

    if (!payload?.id) {
      return Response.json({success: false, error: 'Invalid payload'}, {status: 400});
    }

    if (topic && !CHECKOUT_TOPICS.includes(topic)) {
      console.log(`[Checkout Log] Ignored topic: ${topic}`);
      return Response.json({success: true, forwarded: false});
    }

    /**
     * The middleware's /logCartCheckout (HTTPS). CART_CHECKOUT_LOG_URL, when
     * set in Oxygen, overrides it -- e.g. to point at a staging middleware --
     * without a deploy.
     */
    const url =
      env?.CART_CHECKOUT_LOG_URL || 'https://api.saadeddin.top/logCartCheckout';

    const body = {
      event_type: 'checkout',
      ...payload,
    };

    const token =
      env?.SAADEDDIN_MIDDLEWARE_TOKEN ||
      env?.MOBILE_APP_SECRET_TOKEN ||
      env?.MIDDLEWARE_TOKEN ||
      null;

    /** Abandoned rather than left hanging if the endpoint is slow. */
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? {Authorization: `Bearer ${token}`} : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const answer = await res.text().catch(() => '');
      console.log(
        `[Checkout Log] ${topic || 'checkout'} ${payload.id} → ${res.status}`,
        answer ? answer.slice(0, 300) : '',
      );
    } finally {
      clearTimeout(timer);
    }

    return Response.json({success: true, forwarded: true});
  } catch (error: any) {
    console.error('[Checkout Log] Error:', error);
    /**
     * 200 on purpose. A non-2xx makes Shopify retry, and a retry cannot fix a
     * bug here or an endpoint that is down -- it only sends the same body
     * again, several times, and buries the original failure.
     */
    return Response.json({success: false, error: error?.message || 'error'});
  }
}
