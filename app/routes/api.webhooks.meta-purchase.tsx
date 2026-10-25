import type {ActionFunctionArgs} from 'react-router';
import {describeRejection, verifyShopifyWebhook} from '~/lib/webhook-verify.server';

/**
 * Website purchases sent to Meta from the server (Conversions API).
 *
 * The browser reports each purchase through the «Meta Pixel» custom pixel in
 * Shopify → Settings → Customer events, but browsers miss part of them (ad
 * blockers, iPhone tracking protection, in-app browsers). Shopify always knows
 * about the order, so this route repeats the purchase from the server. Both
 * carry the same `event_id` (`order_<order id>`, the pixel's eventID), so Meta
 * keeps one of the two.
 *
 * The «Facebook & Instagram» sales channel would do this too, but it was never
 * set up and its pixel is disconnected. If it is ever connected with data
 * sharing, remove META_CAPI_TOKEN so purchases are not sent twice.
 *
 * Setup:
 *  - Oxygen: `META_CAPI_TOKEN` = a Conversions API access token for pixel
 *    2952775171742690 (Events Manager → the pixel → Settings → Generate access
 *    token). Without it this route does nothing.
 *  - Shopify admin → Settings → Notifications → Webhooks → Order creation,
 *    JSON, https://saadeddin.com/api/webhooks/meta-purchase (signed with the
 *    shop's signing secret, SHOPIFY_WEBHOOK_SECRET).
 *  - Optional `META_TEST_EVENT_CODE` (Events Manager → Test events) sends to the
 *    test view instead of live data. Remove it afterwards.
 *
 * Only website checkouts are sent (`checkout_token` present).
 */

const DEFAULT_PIXEL_ID = '2952775171742690';
const GRAPH_VERSION = 'v21.0';

async function sha256(value: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Country code + number, digits only (9665XXXXXXXX) — Meta's hashing format. */
function metaPhone(phone?: string | null): string {
  let d = String(phone || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 10 && d.startsWith('05')) d = `966${d.slice(1)}`;
  else if (d.length === 9 && d.startsWith('5')) d = `966${d}`;
  return d.length >= 8 ? d : '';
}

/** The landing URL, and Meta's click id (fbc) when the visit came from an ad. */
function landing(order: any): {url?: string; fbc?: string} {
  const raw = String(order?.landing_site || '').trim();
  if (!raw) return {};
  try {
    const url = new URL(raw, 'https://saadeddin.com');
    const fbclid = url.searchParams.get('fbclid');
    const created = Date.parse(order?.created_at || '') || Date.now();
    return {url: url.toString(), fbc: fbclid ? `fb.1.${created}.${fbclid}` : undefined};
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
  const phone = metaPhone(
    order?.phone ||
      order?.customer?.phone ||
      order?.shipping_address?.phone ||
      order?.billing_address?.phone,
  );
  const customerId = order?.customer?.id ? String(order.customer.id) : '';
  const address = order?.shipping_address || order?.billing_address || {};
  const {url, fbc} = landing(order);

  const user_data: Record<string, unknown> = {};
  if (realEmail) user_data.em = [await sha256(realEmail)];
  if (phone) user_data.ph = [await sha256(phone)];
  if (customerId) user_data.external_id = [await sha256(customerId)];
  const first = String(address.first_name || order?.customer?.first_name || '').trim().toLowerCase();
  const last = String(address.last_name || order?.customer?.last_name || '').trim().toLowerCase();
  if (first) user_data.fn = [await sha256(first)];
  if (last) user_data.ln = [await sha256(last)];
  const city = String(address.city || '').trim().toLowerCase().replace(/\s+/g, '');
  if (city) user_data.ct = [await sha256(city)];
  const country = String(address.country_code || '').trim().toLowerCase();
  if (country) user_data.country = [await sha256(country)];
  if (order?.browser_ip) user_data.client_ip_address = String(order.browser_ip);
  if (order?.client_details?.user_agent) {
    user_data.client_user_agent = String(order.client_details.user_agent);
  }
  if (fbc) user_data.fbc = fbc;

  const lines = (order?.line_items || []).filter((line: any) => line?.variant_id);
  const createdAt = Date.parse(order?.created_at || '');

  return {
    event_name: 'Purchase',
    event_time: Math.floor((Number.isFinite(createdAt) ? createdAt : Date.now()) / 1000),
    // Must match the custom pixel's eventID so Meta de-duplicates the pair.
    event_id: `order_${order.id}`,
    action_source: 'website',
    ...(url ? {event_source_url: url} : {}),
    user_data,
    custom_data: {
      currency: String(order?.currency || order?.presentment_currency || 'SAR'),
      value: Number(order?.total_price || 0),
      content_type: 'product',
      content_ids: lines.map((line: any) => String(line.variant_id)),
      contents: lines.map((line: any) => ({
        id: String(line.variant_id),
        quantity: Number(line.quantity || 1),
        item_price: Number(line.price || 0),
      })),
      num_items: lines.reduce((sum: number, line: any) => sum + Number(line.quantity || 1), 0),
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
    console.warn(describeRejection('Meta Purchase', verification, request));
    return new Response('Unauthorized', {status: 401});
  }

  // From here on always 200, so Shopify never retries or removes the webhook.
  try {
    const token = String(env?.META_CAPI_TOKEN || '').trim();
    if (!token) {
      console.warn('[Meta Purchase] META_CAPI_TOKEN is not set: nothing sent.');
      return Response.json({sent: false, reason: 'no token'});
    }

    const order = JSON.parse(verification.rawBody) as any;
    if (!order?.id) return Response.json({sent: false, reason: 'no order id'});
    if (!order?.checkout_token) {
      return Response.json({sent: false, reason: 'not a website checkout'});
    }

    const pixelId = String(env?.META_PIXEL_ID || DEFAULT_PIXEL_ID);
    const testCode = String(env?.META_TEST_EVENT_CODE || '').trim();
    const body = {
      data: [await buildEvent(order)],
      ...(testCode ? {test_event_code: testCode} : {}),
    };

    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(token)}`,
      {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(4000),
      },
    );
    const json = (await res.json().catch(() => null)) as any;

    if (!res.ok || json?.error) {
      console.error(
        `[Meta Purchase] ${order.name || order.id}: Meta refused (${res.status}): ${json?.error?.message || ''}`,
      );
      return Response.json({sent: false, reason: 'meta error'});
    }

    console.log(
      `[Meta Purchase] ${order.name || order.id} sent${testCode ? ' (test)' : ''}: ${json?.events_received ?? '?'} received.`,
    );
    return Response.json({sent: true});
  } catch (error: any) {
    console.error('[Meta Purchase] failed:', error?.message || error);
    return Response.json({sent: false, reason: 'error'});
  }
}

export async function loader() {
  return new Response('Not Found', {status: 404});
}
