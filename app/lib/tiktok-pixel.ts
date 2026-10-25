/**
 * TikTok Pixel, wired directly (not through GTM) — same pattern as Snap
 * (~/lib/snap-pixel).
 *
 * Events sent from the storefront:
 *   page()       every page, including client-side navigations (AdPixels)
 *   ViewContent  product page (AdViewContent)
 *   AddToCart    after the cart confirms an add (AddToCartButton)
 * CompletePayment comes from Shopify checkout: custom pixel «TikTok Pixel» in
 * Settings → Customer events (checkout_completed).
 *
 * Consent: nothing loads until cookies are accepted (`saadeddin_cookie_consent`).
 * Signed-in customers are identified with a SHA-256 hash of their email.
 * content_id = numeric variant id, the same id the checkout pixel sends.
 */
import {getStoredConsent} from '~/components/CookieConsentBanner';

export const TIKTOK_PIXEL_ID = 'DB1001BC77U534NEC770';

let loaded = false;
let identifiedEmail = '';

function allowed(): boolean {
  return typeof window !== 'undefined' && getStoredConsent() === 'accepted';
}

/** TikTok's base code (as supplied), minus the automatic page() call. */
function loadTikTok(): any {
  const w = window as any;
  if (loaded && w.ttq) return w.ttq;
  (function (w: any, d: Document, t: string) {
    w.TiktokAnalyticsObject = t;
    const ttq = (w[t] = w[t] || []);
    ttq.methods = ['page', 'track', 'identify', 'instances', 'debug', 'on', 'off', 'once', 'ready', 'alias', 'group', 'enableCookie', 'disableCookie', 'holdConsent', 'revokeConsent', 'grantConsent'];
    ttq.setAndDefer = function (t: any, e: string) {
      t[e] = function (...args: unknown[]) {
        t.push([e, ...args]);
      };
    };
    for (let i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
    ttq.instance = function (t: string) {
      const e = ttq._i[t] || [];
      for (let n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]);
      return e;
    };
    ttq.load = function (e: string, n?: any) {
      const r = 'https://analytics.tiktok.com/i18n/pixel/events.js';
      ttq._i = ttq._i || {};
      ttq._i[e] = [];
      ttq._i[e]._u = r;
      ttq._t = ttq._t || {};
      ttq._t[e] = +new Date();
      ttq._o = ttq._o || {};
      ttq._o[e] = n || {};
      const s = d.createElement('script');
      s.type = 'text/javascript';
      s.async = true;
      s.src = r + '?sdkid=' + e + '&lib=' + t;
      d.head.appendChild(s);
    };
    ttq.load(TIKTOK_PIXEL_ID);
  })(w, document, 'ttq');
  loaded = true;
  return w.ttq;
}

function ready(): any | null {
  if (!allowed()) return null;
  return loadTikTok();
}

async function sha256(value: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Saudi mobile number in E.164 (+9665XXXXXXXX), the form TikTok hashes.
 * Accepts 05XXXXXXXX, 5XXXXXXXX, 9665XXXXXXXX, 009665XXXXXXXX and +966….
 */
export function toE164(phone?: string | null): string {
  let d = String(phone || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 10 && d.startsWith('05')) d = `966${d.slice(1)}`;
  else if (d.length === 9 && d.startsWith('5')) d = `966${d}`;
  return d.length >= 8 ? `+${d}` : '';
}

/**
 * Advanced matching for the signed-in customer: hashed email, phone and
 * customer id, so TikTok can tie site events to the person's TikTok account.
 *
 * Customers sign in by phone, so many accounts carry a stand-in address
 * (`<phone>@saadeddin.dev`). Hashing that told TikTok nothing; it is skipped,
 * and the phone number -- the identifier every customer actually has -- is
 * sent instead.
 */
export async function tiktokIdentify(user?: {
  email?: string | null;
  phone?: string | null;
  id?: string | null;
}) {
  try {
    const email = String(user?.email || '').trim().toLowerCase();
    const realEmail = email.includes('@') && !email.endsWith('@saadeddin.dev') ? email : '';
    const phone = toE164(user?.phone);
    const id = String(user?.id || '').split('/').pop() || '';
    const signature = `${realEmail}|${phone}|${id}`;
    if (signature === '||' || signature === identifiedEmail) return;
    const ttq = ready();
    if (!ttq) return;
    identifiedEmail = signature;
    const data: Record<string, string> = {};
    if (realEmail) data.email = await sha256(realEmail);
    if (phone) data.phone_number = await sha256(phone);
    if (id) data.external_id = await sha256(id);
    ttq.identify(data);
  } catch {
    // never break the page
  }
}

export function tiktokPage() {
  try {
    ready()?.page();
  } catch {
    // never break the page
  }
}

export function tiktokTrack(event: string, params: Record<string, unknown> = {}) {
  try {
    ready()?.track(event, params);
  } catch {
    // never break the page
  }
}
