/**
 * Where checkout failures go when they are not merely console noise.
 *
 * Everything that goes wrong on this storefront's side of checkout is caught
 * -- a rejected buyer identity, an attributes update that failed, a cart with
 * no `checkoutUrl` at all, which means the shopper could not check out and was
 * bounced back to the cart -- and every one of those was reported with
 * `console.error` and nothing else. On Oxygen that is a log stream nobody
 * watches and which rotates away, so a shopper who could not pay left no trace
 * anyone would ever read.
 *
 * A payment DECLINE is not in scope and cannot be: Shopify Checkout is hosted
 * by Shopify, so once `checkout.initiate` redirects, this storefront's code no
 * longer runs and never sees the card being refused. What is in scope is
 * everything up to that handover, which is the part that is ours -- and it is
 * where a shopper who never reaches the payment form is lost.
 *
 * Dormant until an endpoint is configured, the same way order ratings are:
 * with no URL set this logs one line locally and posts nothing, so it can ship
 * before the middleware has somewhere to receive it and start working the
 * moment it does, with no code change.
 */

export type CheckoutErrorStage =
  | 'buyer_identity'
  | 'delivery_address'
  | 'attributes'
  | 'no_checkout_url'
  | 'crm_sync'
  | 'unhandled';

export interface CheckoutErrorReport {
  stage: CheckoutErrorStage;
  message: string;
  /** Everything needed to find the shopper again, none of it sensitive. */
  phone?: string | null;
  cartId?: string | null;
  branchName?: string | null;
  locationId?: string | null;
  fulfillmentType?: string | null;
  locale?: string | null;
  /** Shopify's own userErrors, when the failure came back as data. */
  userErrors?: unknown;
}

/**
 * The endpoint, if there is one.
 *
 * A dedicated URL wins; otherwise a path on the middleware the rest of the app
 * already talks to. Returns null when neither is set, which is the dormant
 * state rather than an error.
 */
function resolveErrorLogUrl(env: any): string | null {
  const explicit = env?.SAADEDDIN_ERROR_LOG_URL;
  if (explicit) return String(explicit).trim();

  const base = env?.CUSTOM_API_URL || env?.MIDDLEWARE_URL;
  if (!base) return null;

  return `${String(base).replace(/\/$/, '')}/logs/checkout-error`;
}

/**
 * Report a checkout failure. Never throws, never blocks.
 *
 * Deliberately not awaited by its callers in the request path: a shopper's
 * checkout must not wait on a logging service, and must certainly not fail
 * because one is down. The timeout is belt and braces on top of that.
 */
export async function logCheckoutError(
  env: any,
  report: CheckoutErrorReport,
): Promise<void> {
  try {
    const url = resolveErrorLogUrl(env);

    const line =
      `[CHECKOUT ERROR] stage=${report.stage} ` +
      `phone=${report.phone || 'none'} cart=${report.cartId || 'none'} ` +
      `branch=${report.branchName || 'none'} — ${report.message}`;

    // Always local, so the console keeps the record it always had.
    console.error(line, report.userErrors ? JSON.stringify(report.userErrors) : '');

    if (!url) return;

    const token =
      env?.SAADEDDIN_MIDDLEWARE_TOKEN ||
      env?.MOBILE_APP_SECRET_TOKEN ||
      env?.MIDDLEWARE_TOKEN ||
      null;

    /** Abandoned rather than left hanging if the endpoint is slow. */
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    try {
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? {Authorization: `Bearer ${token}`} : {}),
        },
        body: JSON.stringify({
          source: 'storefront',
          stage: report.stage,
          message: report.message,
          phone: report.phone || null,
          cart_id: report.cartId || null,
          branch_name: report.branchName || null,
          location_id: report.locationId || null,
          fulfillment_type: report.fulfillmentType || null,
          language: report.locale || null,
          user_errors: report.userErrors ?? null,
          occurred_at: new Date().toISOString(),
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  } catch (e: any) {
    /**
     * Swallowed on purpose. A failure to report a failure is not worth a
     * second failure, and this runs inside catch blocks that are already
     * handling something that went wrong.
     */
    console.warn('[CHECKOUT ERROR] Could not report:', e?.message || e);
  }
}
