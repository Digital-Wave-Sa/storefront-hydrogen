import type {ActionFunctionArgs} from 'react-router';
import {describeRejection, verifyShopifyWebhook} from '~/lib/webhook-verify.server';

/**
 * Website purchases sent to Snapchat from the server (Snap Conversions API v3).
 *
 * The browser reports each purchase through the «Snap Pixel» custom pixel in
 * Shopify → Settings → Customer events, but browsers miss part of them (ad
 * blockers, iPhone tracking protection, in-app browsers). Shopify always knows
 * about the order, so this route repeats the purchase from the server. Both
 * carry the same id (`order_<order id>`: the pixel's `client_dedup_id`, this
 * route's `event_id`), so Snap keeps one of the two.
 *
 * Setup:
 *  - Oxygen: `SNAP_CAPI_TOKEN` = the Conversions API token of the Snap pixel.
 *    Without it this route does nothing, so the token is also the on/off switch.
 *  - Shopify admin → Settings → Notifications → Webhooks → Order creation,
 *    JSON, https://saadeddin.com/api/webhooks/snap-purchase (signed with the
 *    shop's signing secret, SHOPIFY_WEBHOOK_SECRET).
 *  - Optional `SNAP_CAPI_VALIDATE=1` sends to Snap's /events/validate endpoint
 *    instead, which checks the payload and records nothing. The result is
 *    logged. Remove it to go live.
 *
 * Only website checkouts are sent (`checkout_token` present).
 */

const DEFAULT_PIXEL_ID = 'd386a352-d03d-4d9b-9ac8-89d9c5b547c8';

async function sha256(value: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Country code + number, digits only (9665XXXXXXXX) — Snap's hashing format. */
function snapPhone(phone?: string | null): string {
  let d = String(phone || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 10 && d.startsWith('05')) d = `966${d.slice(1)}`;
  else if (d.length === 9 && d.startsWith('5')) d = `966${d}`;
  return d.length >= 8 ? d : '';
}

function landing(order: any): {url?: string; clickId?: string} {
  const raw = String(order?.landing_site || '').trim();
  if (!raw) return {};
  try {
    const url = new URL(raw, 'https://saadeddin.com');
    return {url: url.toString(), clickId: url.searchParams.get('ScCid') || undefined};
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
  const phone = snapPhone(
    order?.phone ||
      order?.customer?.phone ||
      order?.shipping_address?.phone ||
      order?.billing_address?.phone,
  );
  const customerId = order?.customer?.id ? String(order.customer.id) : '';
  const {url, clickId} = landing(order);

  const user_data: Record<string, unknown> = {};
  if (realEmail) user_data.em = [await sha256(realEmail)];
  if (phone) user_data.ph = [await sha256(phone)];
  if (customerId) user_data.external_id = [await sha256(customerId)];
  if (order?.browser_ip) user_data.client_ip_address = String(order.browser_ip);
  if (order?.client_details?.user_agent) {
    user_data.client_user_agent = String(order.client_details.user_agent);
  }
  if (clickId) user_data.sc_click_id = clickId;

  const lines = (order?.line_items || []).filter((line: any) => line?.variant_id);
  const createdAt = Date.parse(order?.created_at || '');

  return {
    event_name: 'PURCHASE',
    action_source: 'WEB',
    event_time: Math.floor((Number.isFinite(createdAt) ? createdAt : Date.now()) / 1000),
    // Must match the custom pixel's client_dedup_id so Snap de-duplicates the pair.
    event_id: `order_${order.id}`,
    ...(url ? {event_source_url: url} : {}),
    user_data,
    custom_data: {
      currency: String(order?.currency || order?.presentment_currency || 'SAR'),
      value: Number(order?.total_price || 0),
      content_ids: lines.map((line: any) => String(line.variant_id)),
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
    console.warn(describeRejection('Snap Purchase', verification, request));
    return new Response('Unauthorized', {status: 401});
  }

  // From here on always 200, so Shopify never retries or removes the webhook.
  try {
    const token = String(env?.SNAP_CAPI_TOKEN || '').trim();
    if (!token) {
      console.warn('[Snap Purchase] SNAP_CAPI_TOKEN is not set: nothing sent.');
      return Response.json({sent: false, reason: 'no token'});
    }

    const order = JSON.parse(verification.rawBody) as any;
    if (!order?.id) return Response.json({sent: false, reason: 'no order id'});
    if (!order?.checkout_token) {
      return Response.json({sent: false, reason: 'not a website checkout'});
    }

    const pixelId = String(env?.SNAP_PIXEL_ID || DEFAULT_PIXEL_ID);
    const validate = String(env?.SNAP_CAPI_VALIDATE || '').trim() === '1';
    const endpoint = `https://tr.snapchat.com/v3/${pixelId}/events${validate ? '/validate' : ''}?access_token=${encodeURIComponent(token)}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({data: [await buildEvent(order)]}),
      signal: AbortSignal.timeout(4000),
    });
    const text = await res.text().catch(() => '');

    if (validate) {
      console.log(`[Snap Purchase] ${order.name || order.id} validate ${res.status}: ${text.slice(0, 500)}`);
      return Response.json({sent: false, reason: 'validate only'});
    }
    if (!res.ok) {
      console.error(`[Snap Purchase] ${order.name || order.id}: Snap refused (${res.status}): ${text.slice(0, 300)}`);
      return Response.json({sent: false, reason: 'snap error'});
    }

    console.log(`[Snap Purchase] ${order.name || order.id} sent.`);
    return Response.json({sent: true});
  } catch (error: any) {
    console.error('[Snap Purchase] failed:', error?.message || error);
    return Response.json({sent: false, reason: 'error'});
  }
}

export async function loader() {
  return new Response('Not Found', {status: 404});
}
