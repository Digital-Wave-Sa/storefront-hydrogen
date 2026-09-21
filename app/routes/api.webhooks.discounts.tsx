import type {ActionFunctionArgs} from 'react-router';
import {restrictDiscountToDiscountable} from '~/lib/discount-scope.server';

/**
 * Shopify `discounts/create` and `discounts/update` → keep gift cards out of
 * every discount's reach.
 *
 * See discount-scope.server.ts for the whole story. In one line: any basic
 * discount that targets "all items", whoever created it — staff, the CRM's
 * CREDIT codes, SDLP's loyalty rewards — is moved onto the Discountable
 * collection, which holds every product except gift cards.
 *
 * Subscribe BOTH topics to this URL. `create` catches new discounts; `update`
 * catches someone editing an existing one back to "all items" in admin.
 *
 * Signed like the order webhook: `SHOPIFY_WEBHOOK_SECRET` for a subscription
 * made in admin, `SHOPIFY_CLIENT_SECRET` for one made by this app through the
 * API. With neither set the route refuses everything — an unsigned endpoint
 * that edits discounts is not acceptable.
 */

const TOPICS = ['discounts/create', 'discounts/update'];

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
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

async function verified(env: any, request: Request, rawBody: string): Promise<boolean> {
  const header = request.headers.get('x-shopify-hmac-sha256') || '';
  if (!header) return false;
  const secrets = [env?.SHOPIFY_WEBHOOK_SECRET, env?.SHOPIFY_CLIENT_SECRET]
    .map((s) => (typeof s === 'string' ? s.trim() : ''))
    .filter(Boolean);
  for (const secret of secrets) {
    if (timingSafeEqual(await hmacBase64(secret, rawBody), header)) return true;
  }
  return false;
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

  if (!(await verified(env, request, rawBody))) {
    console.warn(`[Discount Scope] Rejected ${topic || '(no topic)'}: bad or missing signature`);
    return Response.json({success: false, error: 'Unauthorized'}, {status: 401});
  }

  if (!TOPICS.includes(topic)) {
    return Response.json({success: true, ignored: topic});
  }

  let payload: any = null;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    /* handled below */
  }
  const id = payload?.admin_graphql_api_id;
  if (typeof id !== 'string' || !id) {
    return Response.json({success: false, error: 'No discount id'}, {status: 400});
  }

  const outcome = await restrictDiscountToDiscountable(env, id);

  /**
   * A failure is logged loudly and still answered 200. Shopify retries a
   * non-2xx, but a retry cannot create a missing collection or fix a scope
   * — it only repeats the same failure and buries it.
   */
  const line = `[Discount Scope] ${topic} ${id} → ${outcome.action}` +
    ('title' in outcome && outcome.title ? ` «${outcome.title}»` : '') +
    ('reason' in outcome ? ` (${outcome.reason})` : '');
  if (outcome.action === 'failed') console.error(line);
  else console.log(line);

  return Response.json({success: true, outcome});
}

export async function loader() {
  return Response.json({status: 'Discount scope webhook active. Use POST.'});
}
