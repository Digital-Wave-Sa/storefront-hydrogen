import type {ActionFunctionArgs, LoaderFunctionArgs} from 'react-router';
import {getAdminDomain, getAdminToken} from '~/lib/shopify-admin.server';

/**
 * GET /api/order-name?id=gid://shopify/Order/123
 *
 * Used by the «Saadeddin Checkout Rules» app's Thank you page extension
 * (shopify-functions/saadeddin-checkout-rules/extensions/thank-you-order-number)
 * to show the order number the shop uses — «SDN-1580» — under «شكرًا لك».
 * The extension only knows the order's id and Shopify's random confirmation
 * code; the name lives in the Admin API, which an extension cannot reach.
 *
 * Who may ask: the request must carry the extension's session token
 * (Authorization: Bearer <JWT>), signed by Shopify with that app's client
 * secret, set on Oxygen as CHECKOUT_RULES_APP_SECRET. Anything else gets 401. The answer is the
 * order name and nothing else, and only for orders created in the last
 * hour — the Thank you page is the only caller.
 *
 * The order may not exist yet for the first second or two after payment;
 * that is a 404 and the extension asks again.
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400',
};

const MAX_ORDER_AGE_MS = 60 * 60 * 1000;

/** «Saadeddin Checkout Rules» client id — public; the token's audience. */
const CHECKOUT_RULES_CLIENT_ID = '34c05e9b07b44a0aaa29748f90f13180';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

function base64UrlToBytes(input: string): Uint8Array<ArrayBuffer> {
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Verifies an HS256 session token from a checkout UI extension. */
async function verifySessionToken(
  token: string,
  secret: string,
  clientId: string | undefined,
): Promise<Record<string, any> | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  try {
    const header: any = JSON.parse(new TextDecoder().decode(base64UrlToBytes(h)));
    if (header?.alg !== 'HS256') return null;

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      {name: 'HMAC', hash: 'SHA-256'},
      false,
      ['verify'],
    );
    const ok = await crypto.subtle.verify(
      'HMAC',
      key,
      base64UrlToBytes(s),
      new TextEncoder().encode(`${h}.${p}`),
    );
    if (!ok) return null;

    const payload: any = JSON.parse(new TextDecoder().decode(base64UrlToBytes(p)));
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp === 'number' && payload.exp < now - 5) return null;
    if (typeof payload.nbf === 'number' && payload.nbf > now + 5) return null;
    if (clientId && payload.aud && payload.aud !== clientId) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function action({request}: ActionFunctionArgs) {
  // Preflight for the Authorization header.
  if (request.method === 'OPTIONS') {
    return new Response(null, {status: 204, headers: CORS});
  }
  return json({error: 'Method not allowed'}, 405);
}

export async function loader({request, context}: LoaderFunctionArgs) {
  const env = context.env as any;
  const secret = env.CHECKOUT_RULES_APP_SECRET;
  if (!secret) return json({error: 'Not configured'}, 503);

  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  const claims = token
    ? await verifySessionToken(
        token,
        secret,
        env.CHECKOUT_RULES_APP_CLIENT_ID || CHECKOUT_RULES_CLIENT_ID,
      )
    : null;
  if (!claims) return json({error: 'Unauthorized'}, 401);

  // The token names the shop it was issued for; it must be this one.
  const shopDomain = getAdminDomain(env);
  const dest = String(claims.dest || '').replace(/^https?:\/\//, '');
  if (dest && shopDomain && dest !== shopDomain) {
    return json({error: 'Unauthorized'}, 401);
  }

  const id = new URL(request.url).searchParams.get('id') || '';
  if (!/^gid:\/\/shopify\/(Order|OrderIdentity)\/\d+$/.test(id)) {
    return json({error: 'Bad id'}, 400);
  }
  const orderId = `gid://shopify/Order/${id.split('/').pop()}`;

  try {
    const adminToken = await getAdminToken(env);
    if (!adminToken || !shopDomain) return json({error: 'Unavailable'}, 503);

    const res = await fetch(`https://${shopDomain}/admin/api/2025-07/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': adminToken,
      },
      body: JSON.stringify({
        query: `query OrderName($id: ID!) { order(id: $id) { name createdAt } }`,
        variables: {id: orderId},
      }),
    });
    const body: any = await res.json().catch(() => null);
    const order = body?.data?.order;
    if (!order?.name) return json({error: 'Not found'}, 404);

    const age = Date.now() - new Date(order.createdAt).getTime();
    if (!(age >= 0 && age <= MAX_ORDER_AGE_MS)) return json({error: 'Not found'}, 404);

    return json({name: order.name});
  } catch (error) {
    console.error('[api.order-name]', error);
    return json({error: 'Unavailable'}, 502);
  }
}
