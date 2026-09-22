import type {ActionFunctionArgs} from 'react-router';
import {notifyOrderUpdate} from '~/lib/notifications.server';
import {
  routeOrderToChosenBranch,
  recordRoutingOutcome,
} from '~/lib/fulfillment-routing.server';
import {
  readyKind,
  collectOrderTokens,
  FAILED_TOKENS,
  STEP5_TOKENS,
  IN_TRANSIT_TOKENS,
  STEP3_TOKENS,
} from '~/lib/order-stage-tokens';
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

/** Order of the stages, for "never send one behind what was already sent". */
const STAGE_RANK: Record<string, number> = {
  CONFIRMED: 1,
  PREPARING: 2,
  READY_FOR_PICKUP: 3,
  READY_FOR_DELIVERY: 3,
  OUT_FOR_DELIVERY: 4,
  DELIVERED: 5,
};

/** Older spellings the ERP and staff have used for "done". */
const EXTRA_DONE_TOKENS = ['completed', 'مكتمل', 'pickedup'];

/**
 * Where the order is, for the progress emails. Furthest stage wins, because
 * tags pile up: a delivered order usually still carries its «preparing» tag.
 * READY is left to the block above, which already handles it.
 */
function progressStage(
  order: any,
  orderStatusMeta: string,
): 'PREPARING' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | null {
  if (order?.cancelled_at || order?.canceledAt) return null;
  const {fulfillment, erp} = collectOrderTokens(order, orderStatusMeta);
  const has = (list: string[]) =>
    list.some((t) => erp.has(t) || fulfillment.includes(t));
  if (has(FAILED_TOKENS)) return null;

  const shipment = (order?.fulfillments || []).map((f: any) =>
    String(f?.shipment_status || '').toLowerCase(),
  );

  if (
    has(STEP5_TOKENS) ||
    has(EXTRA_DONE_TOKENS) ||
    shipment.includes('delivered') ||
    shipment.includes('picked_up')
  ) {
    return 'DELIVERED';
  }
  if (
    has(IN_TRANSIT_TOKENS) ||
    shipment.includes('in_transit') ||
    shipment.includes('out_for_delivery')
  ) {
    return 'OUT_FOR_DELIVERY';
  }
  // On this store Shopify fulfils at hand-over, so fulfilled with no finer
  // shipment detail means the customer has it.
  if (String(order?.fulfillment_status || '').toLowerCase() === 'fulfilled') {
    return 'DELIVERED';
  }
  if (has(STEP3_TOKENS)) return 'PREPARING';
  return null;
}

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
        const t = collectOrderTokens(payload, orderStatus);
        console.log(
          `[Order Webhook] Ready check #${payload.order_number ?? payload.id}: not ready — tags=[${[...t.erp].join(', ')}] fulfillment=[${t.fulfillment.join(', ')}] fulfillment_status=${payload.fulfillment_status ?? 'null'}`,
        );
      } else if (sent.includes(stage)) {
        ready = {skipped: 'already sent', stage};
        console.log(`[Order Webhook] ${stage} already sent for #${payload.order_number ?? payload.id} — not resending`);
      } else {
        const branchAttr = (payload.note_attributes || []).find(
          (a: any) => String(a?.name ?? '').toLowerCase() === 'branch',
        );
        const res = await notifyOrderUpdate({
          order: payload,
          stage: stage as any,
          env,
          // Email only -- SMS costs per message and this is a courtesy note,
          // not something the shopper has to act on.
          channels: ['email'],
          extra: {branchName: branchAttr?.value || ''},
        });
        // Recorded only when the email actually went, so a failed send is
        // retried by the next webhook. sendEmail reports failure as `false`,
        // not an exception; this used to mark those as done.
        if (res.email) {
          await markStageNotified(env, payload, stage, sent);
          ready = {sent: stage};
          console.log(`[Order Webhook] ${stage} email sent for #${payload.order_number ?? payload.id}`);
        } else {
          ready = {failed: stage};
          console.warn(`[Order Webhook] ${stage} email NOT sent for #${payload.order_number ?? payload.id}`);
        }
      }
    } catch (error: any) {
      console.error('[Order Webhook] Ready-stage error:', error?.message || error);
      ready = {error: error?.message || String(error)};
    }
  }

  /**
   * 2. Progress notifications: confirmed, preparing, on the way, delivered.
   *
   * What was wrong before, and why «on the way» and «being prepared» never
   * arrived:
   *   - PREPARING had a template but nothing ever sent it.
   *   - OUT_FOR_DELIVERY was only tried on `orders/fulfilled`, and the
   *     "delivered?" test there counted `fulfillment.status === 'success'`,
   *     which every fulfillment Shopify creates has — so it always said
   *     DELIVERED. The ERP's `status-out-for-delivery` / «في-الطريق» tags,
   *     which arrive as `orders/updated`, were never read at all.
   *   - DELIVERED on `orders/updated` had no memory, so every later edit to a
   *     finished order (a note, a tag) sent it again.
   *
   * Now the stage comes from the same tokens the /track-order timeline reads
   * (tags, the `custom.order_status` metafield, Shopify's shipment status), and
   * each stage is sent once, recorded in the same notified-stages metafield the
   * ready email uses. A stage behind one already sent is skipped, so a late
   * «preparing» tag cannot follow «delivered».
   */
  let notified = false;
  let progress: any = null;
  if (
    topic === 'orders/create' ||
    topic === 'orders/updated' ||
    topic === 'orders/fulfilled'
  ) {
    try {
      // The confirmation must not depend on the Admin read: if that fails on
      // a brand-new order there is nothing recorded yet anyway.
      let state: {sent: string[]; orderStatus: string};
      try {
        state = await readOrderNotificationState(env, payload);
      } catch (e) {
        if (topic !== 'orders/create') throw e;
        state = {sent: [], orderStatus: ''};
      }
      const {sent, orderStatus} = state;
      const stage =
        topic === 'orders/create' ? 'CONFIRMED' : progressStage(payload, orderStatus);

      const rank = (s: string) => STAGE_RANK[s] ?? 0;
      const furthestSent = Math.max(0, ...sent.map(rank));

      if (!stage) {
        progress = {skipped: 'no progress stage'};
      } else if (sent.includes(stage)) {
        progress = {skipped: 'already sent', stage};
      } else if (rank(stage) <= furthestSent) {
        progress = {skipped: 'behind a stage already sent', stage};
      } else {
        const results = await notifyOrderUpdate({
          order: payload,
          stage,
          env,
          // «Being prepared» is a courtesy: email only, as with «ready».
          channels: stage === 'PREPARING' ? ['email'] : ['email', 'sms'],
        });
        try {
          // Only once something actually reached the customer.
          if (results.email || results.sms) {
            await markStageNotified(env, payload, stage, sent);
          }
        } catch (e: any) {
          console.warn(`[Order Webhook] Could not record ${stage} as sent:`, e?.message || e);
        }
        notified = true;
        progress = {sent: stage};
        console.log(`[Order Webhook] ${stage} notification sent:`, results);
      }
    } catch (error: any) {
      console.error('[Order Webhook] Notification error:', error?.message || error);
      progress = {error: error?.message || String(error)};
    }
  } else {
    console.log(`[Order Webhook] No notification for topic: ${topic}`);
  }

  // Always 200 once verified: Shopify retries non-2xx responses, and a retry
  // would re-run a move that already happened or resend a notification.
  return Response.json({success: true, notified, routing, ready, progress});
}

// Block GET requests
export async function loader() {
  return Response.json(
    {status: 'Order webhook active. Use POST.'},
    {status: 200},
  );
}
