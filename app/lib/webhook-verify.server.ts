/**
 * Shopify webhook signature verification.
 *
 * A webhook URL is public: anyone who knows it can POST the same JSON Shopify
 * would, and the handler cannot tell the difference. For `inventory-webhook`
 * that means a stranger could fake a restock and trigger a mass email to every
 * customer waiting on that product.
 *
 * Shopify signs each delivery with HMAC-SHA256 over the RAW request body, keyed
 * with the webhook signing secret, sent as `x-shopify-hmac-sha256` (base64).
 * Only Shopify and this app know the secret, so only Shopify can produce a
 * signature that matches the body.
 */

const HMAC_HEADER = 'x-shopify-hmac-sha256';

export type WebhookVerification =
  | {ok: true; rawBody: string}
  | {ok: false; reason: 'no-secret' | 'no-signature' | 'mismatch'; rawBody: string};

/** Constant-time string compare — never leak how much of the signature matched. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function hmacBase64(secret: string, body: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    {name: 'HMAC', hash: 'SHA-256'},
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  let binary = '';
  const bytes = new Uint8Array(signature);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/**
 * Read the body once and check the signature.
 *
 * Returns the raw body either way, because a Request body can only be consumed
 * once — the caller must JSON.parse this string rather than call request.json().
 */
export async function verifyShopifyWebhook(
  request: Request,
  env: any,
): Promise<WebhookVerification> {
  const rawBody = await request.text();
  const secret =
    env?.SHOPIFY_WEBHOOK_SECRET ||
    env?.SHOPIFY_WEBHOOK_SIGNING_SECRET ||
    '';

  if (!secret) return {ok: false, reason: 'no-secret', rawBody};

  const provided = request.headers.get(HMAC_HEADER) || '';
  if (!provided) return {ok: false, reason: 'no-signature', rawBody};

  const expected = await hmacBase64(secret, rawBody);
  return safeEqual(provided, expected)
    ? {ok: true, rawBody}
    : {ok: false, reason: 'mismatch', rawBody};
}

/** Log line for a rejected delivery — enough to debug, no secrets. */
export function describeRejection(
  route: string,
  result: Extract<WebhookVerification, {ok: false}>,
  request: Request,
): string {
  const who =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for') ||
    'unknown';
  const detail = {
    'no-secret':
      'SHOPIFY_WEBHOOK_SECRET is not set — set it in .env AND in the Oxygen environment variables',
    'no-signature': `request had no ${HMAC_HEADER} header`,
    mismatch: 'signature did not match the body',
  }[result.reason];
  return `[${route}] Rejected webhook: ${detail} (from ${who})`;
}
