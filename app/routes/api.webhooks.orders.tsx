import type {ActionFunctionArgs} from 'react-router';
import {notifyOrderUpdate} from '~/lib/notifications.server';
import {
  routeOrderToChosenBranch,
  recordRoutingOutcome,
} from '~/lib/fulfillment-routing.server';
import {readyKind} from '~/lib/order-stage-tokens';
import {
  readOrderNotificationState,
  markStageNotified,
} from '~/lib/notified-stages.server';

/**
 * Shopify order webhooks: `orders/create`, `orders/paid`, `orders/fulfilled`,
 * `orders/updated`.
 *
 * Two independent jobs, each guarded so the other still runs:
 *   1. On `orders/create` AND `orders/paid`, move the fulfillment order to the
 *      branch the customer chose in the cart, and record what happened on the
 *      order (see fulfillment-routing.server.ts). Subscribe `orders/paid` to
 *      this same URL in admin — the retry does nothing until you do.
 *   2. Send the stage notification (confirmed / ready / out for delivery /
 *      delivered).
 *
 * Every request must carry a valid `X-Shopify-Hmac-Sha256`. The signing secret
 * is `SHOPIFY_WEBHOOK_SECRET` (the value the admin shows under Settings →
 * Notifications → Webhooks) or, for a subscription created by this app through
 * the API, `SHOPIFY_CLIENT_SECRET`. With neither configured the route refuses
 * everything — an unsigned endpoint that can move fulfillment orders is not
 * acceptable.
 */

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function hmacBase64(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    {name: 'HMAC', hash: 'SHA-256'},
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  let binary = '';
  for (const byte of new Uint8Array(sig)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function verifyShopifyWebhook(
  env: any,
  request: Request,
  rawBody: string,
): Promise<{ok: boolean; reason?: string}> {
  const header = request.headers.get('x-shopify-hmac-sha256') || '';
  if (!header) return {ok: false, reason: 'missing X-Shopify-Hmac-Sha256'};

  const secrets = [env?.SHOPIFY_WEBHOOK_SECRET, env?.SHOPIFY_CLIENT_SECRET]
    .map((s) => (typeof s === 'string' ? s.trim() : ''))
    .filter(Boolean);
  if (!secrets.length) {
    return {ok: false, reason: 'no SHOPIFY_WEBHOOK_SECRET or SHOPIFY_CLIENT_SECRET configured'};
  }

  for (const secret of secrets) {
    const expected = await hmacBase64(secret, rawBody);
    if (timingSafeEqual(expected, header)) return {ok: true};
  }
  return {ok: false, reason: 'signature mismatch'};
}

export async function action({request, context}: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', {status: 405});
  }

  const {env} = context;
  const topic = request.headers.get('x-shopify-topic') || '';

  let rawBody = '';
  try {
    rawBody = await request.text();
  } catch {
    return Response.json({success: false, error: 'Unreadable body'}, {status: 400});
  }

  const verification = await verifyShopifyWebhook(env, request, rawBody);
  if (!verification.ok) {
    console.warn(`[Order Webhook] Rejected ${topic || '(no topic)'}: ${verification.reason}`);
    return Response.json({success: false, error: 'Unauthorized'}, {status: 401});
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    payload = null;
  }
  if (!payload || !payload.id) {
    return Response.json({success: false, error: 'Invalid payload'}, {status: 400});
  }

  console.log(`[Order Webhook] ${topic} for order #${payload.order_number ?? payload.name ?? payload.id}`);

  /**
   * 1. Branch routing — never blocks notifications.
   *
   * Runs on `orders/paid` as well as `orders/create`, because the failure this
   * is guarding against is transient. SDN-1457 and SDN-1458 were created seven
   * minutes apart, with the same delivery method, the same OPEN status and
   * items stocked at the same 118 locations; one routed and one did not, and
   * the move the failed one should have made succeeds by hand with no errors
   * at all. Nothing static explains that, so the answer is a second attempt
   * rather than a better first one.
   *
   * A second pass costs nothing when the first worked: `routeOrderToChosenBranch`
   * compares each fulfillment order's current location and counts a match as
   * `alreadyThere` without issuing a mutation. It is idempotent by
   * construction, which is what makes re-running it safe.
   *
   * This also closes the `orders/paid` gap noted on the gift-card work — the
   * webhook had no paid topic at all, so nothing in the app could distinguish
   * a started checkout from money actually arriving.
   */
  let routing: any = null;
  if (topic === 'orders/create' || topic === 'orders/paid') {
    try {
      routing = await routeOrderToChosenBranch(env, payload);
      if (routing.skipped) {
        console.log(`[Order Webhook] Routing skipped: ${routing.skipped}`);
      } else {
        console.log(
          `[Order Webhook] Routing → ${routing.locationId} (Branch ID ${routing.branchValue}): ` +
            `moved ${routing.moved.length}, already there ${routing.alreadyThere.length}, failed ${routing.failed.length}`,
        );
        for (const f of routing.failed) {
          console.warn(`[Order Webhook] Routing failed for ${f.id}: ${f.reason}`);
        }
      }

      /*
        Put the outcome on the order, not only in the log.

        Every line above this writes to stdout, which is where the SDN-1457
        failure went and why it took a screenshot to find. `tag:routing-failed`
        in the admin order list is the difference between knowing the failure
        rate and guessing it.
      */
      await recordRoutingOutcome(env, payload, routing);
    } catch (error: any) {
      console.error('[Order Webhook] Routing error:', error?.message || error);
    }
  }

  /**
   * 1b. Ready for delivery / collection.
   *
   * This stage has no Shopify event of its own: it happens when someone in the
   * admin tags the order `ready-for-delivery` (or the ERP writes the
   * `custom.order_status` metafield), which reaches us as a plain
   * `orders/updated`. That topic fires on every change an order ever sees, and
   * the tag stays put once added, so the metafield record is what stops the
   * shopper getting the same email on every subsequent edit.
   *
   * `readyKind` is the same token logic the /track-order page uses, imported
   * rather than copied, so the email and the timeline cannot disagree.
   */
  let ready: any = null;
  if (topic === 'orders/updated' || topic === 'orders/create') {
    try {
      const {sent, orderStatus} = await readOrderNotificationState(env, payload);
      const kind = readyKind(payload, orderStatus);
      const stage =
        kind === 'pickup'
          ? 'READY_FOR_PICKUP'
          : kind === 'delivery'
            ? 'READY_FOR_DELIVERY'
            : null;

      if (!stage) {
        ready = {skipped: 'not ready'};
      } else if (sent.includes(stage)) {
        ready = {skipped: 'already sent', stage};
      } else {
        const branchAttr = (payload.note_attributes || []).find(
          (a: any) => String(a?.name ?? '').toLowerCase() === 'branch',
        );
        await notifyOrderUpdate({
          order: payload,
          stage: stage as any,
          env,
          // Email only -- SMS costs per message and this is a courtesy note,
          // not something the shopper has to act on.
          channels: ['email'],
          extra: {branchName: branchAttr?.value || ''},
        });
        // Recorded only after the send resolves, so a failed send is retried by
        // the next webhook instead of being silently marked done.
        await markStageNotified(env, payload, stage, sent);
        ready = {sent: stage};
        console.log(`[Order Webhook] ${stage} email sent for #${payload.order_number ?? payload.id}`);
      }
    } catch (error: any) {
      console.error('[Order Webhook] Ready-stage error:', error?.message || error);
      ready = {error: error?.message || String(error)};
    }
  }

  // 2. Notifications.
  let notified = false;
  try {
    let stage: 'CONFIRMED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | null = null;

    const tagsLower = (payload.tags || '').toLowerCase();
    const isDeliveredOrPickedUp =
      payload.fulfillments?.some(
        (f: any) =>
          f.shipment_status === 'delivered' ||
          f.shipment_status === 'picked_up' ||
          f.status === 'success',
      ) ||
      payload.fulfillment_status === 'fulfilled' ||
      tagsLower.includes('delivered') ||
      tagsLower.includes('pickedup') ||
      tagsLower.includes('picked_up') ||
      tagsLower.includes('completed') ||
      tagsLower.includes('تم التوصيل') ||
      tagsLower.includes('تم الاستلام') ||
      tagsLower.includes('مكتمل');

    if (topic === 'orders/create') {
      stage = 'CONFIRMED';
    } else if (topic === 'orders/fulfilled') {
      stage = isDeliveredOrPickedUp ? 'DELIVERED' : 'OUT_FOR_DELIVERY';
    } else if (topic === 'orders/updated') {
      if (isDeliveredOrPickedUp) {
        stage = 'DELIVERED';
      }
    }

    if (stage) {
      const results = await notifyOrderUpdate({order: payload, stage, env});
      notified = true;
      console.log(`[Order Webhook] ${stage} notification sent:`, results);
    } else {
      console.log(`[Order Webhook] No notification for topic: ${topic}`);
    }
  } catch (error: any) {
    console.error('[Order Webhook] Notification error:', error?.message || error);
  }

  // Always 200 once verified: Shopify retries non-2xx responses, and a retry
  // would re-run a move that already happened or resend a notification.
  return Response.json({success: true, notified, routing, ready});
}

// Block GET requests
export async function loader() {
  return Response.json(
    {status: 'Order webhook active. Use POST.'},
    {status: 200},
  );
}
