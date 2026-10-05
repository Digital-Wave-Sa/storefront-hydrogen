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
let pendingEmail = '';

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
  if (!initialised) {
    snaptr('init', SNAP_PIXEL_ID, pendingEmail ? {user_email: pendingEmail} : {});
    initialised = true;
  }
  return snaptr;
}

/**
 * The signed-in customer's email, for Snap's matching (Snap hashes it before
 * sending). Only used once consent is given; must be set before the first
 * event to be included in `init`.
 */
export function setSnapUserEmail(email?: string | null) {
  const clean = String(email || '').trim().toLowerCase();
  if (clean) pendingEmail = clean;
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
