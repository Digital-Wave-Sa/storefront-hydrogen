/**
 * Meta (Facebook) Pixel, wired directly (not through GTM) — same pattern as
 * Snap (~/lib/snap-pixel) and TikTok (~/lib/tiktok-pixel).
 *
 * Events sent from the storefront:
 *   PageView     every page, including client-side navigations (AdPixels)
 *   ViewContent  product page (AdViewContent)
 *   AddToCart    after the cart confirms an add (AddToCartButton)
 * InitiateCheckout / Purchase happen on Shopify's checkout, where this code
 * does not run. They come from the «Facebook & Instagram» app (Settings →
 * Customer events) when it is connected to this pixel.
 *
 * Consent: nothing loads until cookies are accepted (`saadeddin_cookie_consent`).
 * Signed-in customers are matched by email (fbq hashes it before sending).
 * content_ids = numeric variant id, the same id Snap and TikTok get.
 */
import {getStoredConsent} from '~/components/CookieConsentBanner';

export const META_PIXEL_ID = '2952775171742690';

let initialised = false;
let pendingEmail = '';

function allowed(): boolean {
  return typeof window !== 'undefined' && getStoredConsent() === 'accepted';
}

/** Meta's base code (as supplied), minus the automatic PageView. */
function loadMeta(): any {
  const w = window as any;
  if (w.fbq) return w.fbq;
  const n: any = (w.fbq = function (...args: unknown[]) {
    if (n.callMethod) {
      // eslint-disable-next-line prefer-spread
      n.callMethod.apply(n, args);
    } else {
      n.queue.push(args);
    }
  });
  if (!w._fbq) w._fbq = n;
  n.push = n;
  n.loaded = true;
  n.version = '2.0';
  n.queue = [];
  // Page views are sent per route by AdPixels; stop fbq counting
  // history changes on its own, which would double them.
  n.disablePushState = true;
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(s);
  return n;
}

function ensureInit(): any | null {
  if (!allowed()) return null;
  const fbq = loadMeta();
  if (!initialised) {
    fbq('init', META_PIXEL_ID, pendingEmail ? {em: pendingEmail} : {});
    initialised = true;
  }
  return fbq;
}

/**
 * The signed-in customer's email, for Meta's matching. Only used once consent
 * is given; must be set before the first event to be included in `init`.
 */
export function setMetaUserEmail(email?: string | null) {
  const clean = String(email || '').trim().toLowerCase();
  if (clean) pendingEmail = clean;
}

/** Standard event (PageView, ViewContent, AddToCart, …). */
export function metaTrack(event: string, params: Record<string, unknown> = {}) {
  try {
    const fbq = ensureInit();
    if (!fbq) return;
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === '') continue;
      if (Array.isArray(v) && v.length === 0) continue;
      cleaned[k] = v;
    }
    // Event id lets Meta de-duplicate if the same event is later also sent
    // server-side (Conversions API).
    const eventID = `${event}.${Date.now()}.${Math.random().toString(36).slice(2, 10)}`;
    if (Object.keys(cleaned).length) fbq('track', event, cleaned, {eventID});
    else fbq('track', event, {}, {eventID});
  } catch {
    // Tracking must never break the page.
  }
}
