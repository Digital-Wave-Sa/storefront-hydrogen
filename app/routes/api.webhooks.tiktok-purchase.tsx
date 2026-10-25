import type {ActionFunctionArgs} from 'react-router';
import {describeRejection, verifyShopifyWebhook} from '~/lib/webhook-verify.server';

/**
 * Website purchases sent to TikTok from the server (TikTok Events API).
 *
 * The browser already reports each purchase through the TikTok custom pixel in
 * Shopify → Settings → Customer events, but a browser misses roughly one order
 * in three: ad blockers, iPhone tracking protection, the TikTok in-app browser.
 * Shopify always knows about the order, so this route repeats the purchase
 * from the server. Both carry the same `event_id` (`order_<order id>`), so
 * TikTok keeps one of the two and nothing is counted twice.
 *
 * Setup:
 *  - Oxygen: `TIKTOK_EVENTS_TOKEN` = the Events API access token of the
 *    "Saadeddin shopify" pixel. Without it this route does nothing, so the
 *    token is also the on/off switch.
 *  - Shopify admin → Settings → Notifications → Webhooks → Order creation,
 *    JSON, https://saadeddin.com/api/webhooks/tiktok-purchase. Admin webhooks
 *    are signed with the shop's signing secret, SHOPIFY_WEBHOOK_SECRET.
 *  - Optional `TIKTOK_TEST_EVENT_CODE` sends to Events Manager → Test events
 *    instead of live data while checking the setup. Remove it afterwards.
 *
 * Only website checkouts are sent (`checkout_token` present): orders created
 * by staff or other apps never went through the site, and the pixel never saw
 * them either.
 */

const DEFAULT_PIXEL_ID = 'DB1001BC77U534NEC770';
const ENDPOINT = 'https://business-api.tiktok.com/open_api/v1.3/event/track/';

async function sha256(value: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Saudi mobile in E.164 (+9665XXXXXXXX), the same rule as the site and the custom pixel. */
function toE164(phone?: string | null): string {
  let d = String(phone || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 10 && d.startsWith('05')) d = `966${d.slice(1)}`;
  else if (d.length === 9 && d.startsWith('5')) d = `966${d}`;
  return d.length >= 8 ? `+${d}` : '';
}

/** The landing URL as a full URL, plus the TikTok click id when the visit came from an ad. */
function landing(order: any): {url?: string; ttclid?: string} {
  const raw = String(order?.landing_site || '').trim();
  if (!raw) return {};
  try {
    const url = new URL(raw, 'https://saadeddin.com');
    return {url: url.toString(), ttclid: url.searchParams.get('ttclid') || undefined};
  } catch {
    return {};
  }
}

async function buildEvent(order: any) {
  const email = String(order?.email || order?.contact_email || order?.customer?.email || '')
    .trim()
    .toLowerCase();
  // Phone sign-in leaves a stand-in address (<phone>@saadeddin.dev): no use for matching.
  const realEmail = email.includes('@') && !email.endsWith('@saadeddin.dev') ? email : '';
  const phone = toE164(
    order?.phone ||
      order?.customer?.phone ||
      order?.shipping_address?.phone ||
      order?.billing_address?.phone,
  );
  const customerId = order?.customer?.id ? String(order.customer.id) : '';
  const {url, ttclid} = landing(order);

  const user: Record<string, string> = {};
  if (realEmail) user.email = await sha256(realEmail);
  if (phone) user.phone = await sha256(phone);
  if (customerId) user.external_id = await sha256(customerId);
  if (order?.browser_ip) user.ip = String(order.browser_ip);
  if (order?.client_details?.user_agent) user.user_agent = String(order.client_details.user_agent);
  if (ttclid) user.ttclid = ttclid;

  const contents = (order?.line_items || [])
    .filter((line: any) => line?.variant_id)
    .map((line: any) => ({
      content_id: String(line.variant_id),
      content_name: String(line.title || ''),
      quantity: Number(line.quantity || 1),
      price: Number(line.price || 0),
    }));

  const createdAt = Date.parse(order?.created_at || '');

  return {
    event: 'Purchase',
    event_time: Math.floor((Number.isFinite(createdAt) ? createdAt : Date.now()) / 1000),
    // Must match the custom pixel's event_id so TikTok de-duplicates the pair.
    event_id: `order_${order.id}`,
    user,
    ...(url || order?.referring_site
      ? {page: {...(url ? {url} : {}), ...(order?.referring_site ? {referrer: String(order.referring_site)} : {})}}
      : {}),
    properties: {
      contents,
      content_type: 'product',
      currency: String(order?.currency || order?.presentment_currency || 'SAR'),
      value: Number(order?.total_price || 0),
      order_id: String(order.id),
    },
  };
}

export async function action({request, context}: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', {status: 405});
  }

  const env = context.env as any;

  // Only Shopify: an unsigned POST could feed fake purchases into the ad account.
  const verification = await verifyShopifyWebhook(request, env);
  if (!verification.ok) {
    console.warn(describeRejection('TikTok Purchase', verification, request));
    return new Response('Unauthorized', {status: 401});
  }

  /**
   * From here on always 200: a 4xx/5xx makes Shopify retry the same order for
   * two days and then delete the webhook. Failures are logged instead.
   */
  try {
    const token = String(env?.TIKTOK_EVENTS_TOKEN || '').trim();
    if (!token) {
      console.warn('[TikTok Purchase] TIKTOK_EVENTS_TOKEN is not set: nothing sent.');
      return Response.json({sent: false, reason: 'no token'});
    }

    const order = JSON.parse(verification.rawBody) as any;
    if (!order?.id) return Response.json({sent: false, reason: 'no order id'});
    if (!order?.checkout_token) {
      return Response.json({sent: false, reason: 'not a website checkout'});
    }

    const testCode = String(env?.TIKTOK_TEST_EVENT_CODE || '').trim();
    const body = {
      event_source: 'web',
      event_source_id: String(env?.TIKTOK_PIXEL_ID || DEFAULT_PIXEL_ID),
      ...(testCode ? {test_event_code: testCode} : {}),
      data: [await buildEvent(order)],
    };

    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'Access-Token': token},
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(4000),
    });
    const json = (await res.json().catch(() => null)) as any;

    // TikTok answers 200 with `code: 0` on success; anything else is in `message`.
    if (!res.ok || json?.code !== 0) {
      console.error(
        `[TikTok Purchase] ${order.name || order.id}: TikTok refused (${res.status}, code ${json?.code}): ${json?.message || ''}`,
      );
      return Response.json({sent: false, reason: 'tiktok error'});
    }

    console.log(`[TikTok Purchase] ${order.name || order.id} sent${testCode ? ' (test)' : ''}.`);
    return Response.json({sent: true});
  } catch (error: any) {
    console.error('[TikTok Purchase] failed:', error?.message || error);
    return Response.json({sent: false, reason: 'error'});
  }
}

export async function loader() {
  return new Response('Not Found', {status: 404});
}
