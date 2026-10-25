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
/** What the last `init` was given, so a sign-in that arrives later re-inits once. */
let initialisedWith = '';
let userData: {em?: string; ph?: string; external_id?: string} = {};

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
  const signature = JSON.stringify(userData);
  if (!initialised || signature !== initialisedWith) {
    fbq('init', META_PIXEL_ID, userData);
    initialised = true;
    initialisedWith = signature;
  }
  return fbq;
}

/** Saudi mobile as Meta wants it: country code + number, digits only (9665XXXXXXXX). */
export function metaPhone(phone?: string | null): string {
  let d = String(phone || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 10 && d.startsWith('05')) d = `966${d.slice(1)}`;
  else if (d.length === 9 && d.startsWith('5')) d = `966${d}`;
  return d.length >= 8 ? d : '';
}

/**
 * The signed-in customer's email, phone and id for Meta's advanced matching
 * (the pixel hashes them before sending).
 *
 * Customers sign in by phone, so many accounts carry a stand-in address
 * (`<phone>@saadeddin.dev`); that is skipped and the phone is sent instead.
 * The customer usually resolves after the first PageView has already run
 * `init`, which used to leave every event without user data; a change here
 * now re-runs `init` once with the new data.
 */
export function setMetaUser(user?: {
  email?: string | null;
  phone?: string | null;
  id?: string | null;
}) {
  const email = String(user?.email || '').trim().toLowerCase();
  const realEmail = email.includes('@') && !email.endsWith('@saadeddin.dev') ? email : '';
  const phone = metaPhone(user?.phone);
  const id = String(user?.id || '').split('/').pop() || '';
  userData = {
    ...(realEmail ? {em: realEmail} : {}),
    ...(phone ? {ph: phone} : {}),
    ...(id ? {external_id: id} : {}),
  };
  if (initialised) {
    try {
      ensureInit();
    } catch {
      // never break the page
    }
  }
}

/** Kept for existing callers: email only. */
export function setMetaUserEmail(email?: string | null) {
  setMetaUser({email});
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
