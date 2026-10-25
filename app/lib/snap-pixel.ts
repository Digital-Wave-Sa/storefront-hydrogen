/**
 * Snapchat Pixel, wired directly (not through GTM).
 *
 * Events sent from the storefront:
 *   PAGE_VIEW     every page, including client-side navigations (SnapPixel)
 *   VIEW_CONTENT  product page, per product/variant (SnapViewContent)
 *   ADD_CART      after the cart confirms an add (AddToCartButton)
 * PURCHASE is not sent from here: payment completes on Shopify's checkout,
 * where this code does not run. It is a custom pixel in Shopify admin →
 * Settings → Customer events («Snap Pixel»), subscribed to checkout_completed.
 *
 * Consent: nothing loads and nothing is sent until the visitor has accepted
 * cookies (same gate as GTM — `saadeddin_cookie_consent`). Accepting later
 * fires a `saadeddin:consent-accepted` event that SnapPixel listens for.
 *
 * Item ids are the numeric variant id everywhere (site and checkout pixel), so
 * Snap sees one id per product whichever page reported it.
 */
import {getStoredConsent} from '~/components/CookieConsentBanner';

export const SNAP_PIXEL_ID = 'd386a352-d03d-4d9b-9ac8-89d9c5b547c8';
export const CONSENT_ACCEPTED_EVENT = 'saadeddin:consent-accepted';

let initialised = false;
/** What the last `init` was given, so a sign-in that arrives later re-inits once. */
let initialisedWith = '';
let userData: {user_email?: string; user_phone_number?: string} = {};

function allowed(): boolean {
  return typeof window !== 'undefined' && getStoredConsent() === 'accepted';
}

/** Snap's loader, verbatim in behaviour: queue calls until scevent.min.js arrives. */
function loadSnap(): any {
  const w = window as any;
  if (w.snaptr) return w.snaptr;
  const a: any = (w.snaptr = function (...args: unknown[]) {
    if (a.handleRequest) {
      // eslint-disable-next-line prefer-spread
      a.handleRequest.apply(a, args);
    } else {
      a.queue.push(args);
    }
  });
  a.queue = [];
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://sc-static.net/scevent.min.js';
  document.head.appendChild(s);
  return a;
}

function ensureInit(): any | null {
  if (!allowed()) return null;
  const snaptr = loadSnap();
  const signature = JSON.stringify(userData);
  if (!initialised || signature !== initialisedWith) {
    snaptr('init', SNAP_PIXEL_ID, userData);
    initialised = true;
    initialisedWith = signature;
  }
  return snaptr;
}

/** Saudi mobile as Snap wants it: country code + number, digits only (9665XXXXXXXX). */
export function snapPhone(phone?: string | null): string {
  let d = String(phone || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 10 && d.startsWith('05')) d = `966${d.slice(1)}`;
  else if (d.length === 9 && d.startsWith('5')) d = `966${d}`;
  return d.length >= 8 ? d : '';
}

/**
 * The signed-in customer's email and phone, for Snap's matching (the pixel
 * hashes them before sending).
 *
 * Customers sign in by phone, so many accounts carry a stand-in address
 * (`<phone>@saadeddin.dev`); that is skipped and the phone is sent instead.
 * The customer usually resolves after the first PAGE_VIEW has already run
 * `init`, which used to leave every event without user data; a change here
 * now re-runs `init` once with the new data.
 */
export function setSnapUser(user?: {email?: string | null; phone?: string | null}) {
  const email = String(user?.email || '').trim().toLowerCase();
  const realEmail = email.includes('@') && !email.endsWith('@saadeddin.dev') ? email : '';
  const phone = snapPhone(user?.phone);
  userData = {
    ...(realEmail ? {user_email: realEmail} : {}),
    ...(phone ? {user_phone_number: phone} : {}),
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
export function setSnapUserEmail(email?: string | null) {
  setSnapUser({email});
}

export function snapTrack(event: string, params: Record<string, unknown> = {}) {
  try {
    const snaptr = ensureInit();
    if (!snaptr) return;
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === '') continue;
      if (Array.isArray(v) && v.length === 0) continue;
      cleaned[k] = v;
    }
    snaptr('track', event, cleaned);
  } catch {
    // Tracking must never break the page.
  }
}

/** «gid://shopify/ProductVariant/123» → «123». */
export function numericId(gid?: string | null): string {
  return String(gid || '').split('/').pop() || '';
}
