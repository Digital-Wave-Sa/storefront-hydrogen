/**
 * Detects whether a signed-in customer still needs to give us a real email.
 *
 * The store's phone-OTP login creates a Shopify customer on the fly the first
 * time someone signs in. When the CRM has no email for that phone, the account
 * is created with a placeholder address — `<phone>@saadeddin.placeholder` — so
 * order confirmations and updates have nowhere real to go. This is the single
 * rule for "this customer can't be emailed", used by the checkout gates and the
 * add-email screen so the definition lives in exactly one place.
 *
 * Deliberate limits: this catches a MISSING, PLACEHOLDER, or MALFORMED address.
 * It cannot catch a well-formed address that is simply wrong (a typo that still
 * looks like an email) — no format check can — so it never claims to.
 */

/** The domain the OTP flow assigns when a phone has no real email on file. */
export const PLACEHOLDER_EMAIL_DOMAIN = '@saadeddin.placeholder';

/**
 * A pragmatic email-shape check: one @, something before it, and a dotted
 * domain after it, with no spaces. Not RFC-exhaustive on purpose — it rejects
 * the addresses people actually mistype, without turning away valid ones.
 */
export function isValidEmailFormat(email: string | null | undefined): boolean {
  if (!email) return false;
  const e = String(email).trim();
  if (e.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

/** True when `email` is a placeholder address. */
export function isPlaceholderEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return String(email).trim().toLowerCase().endsWith(PLACEHOLDER_EMAIL_DOMAIN);
}

/**
 * True when the customer should be asked for a real email before they can
 * complete an order. An empty value counts as "needs email" — callers that want
 * to fail open on a lookup failure should gate on a concrete value instead
 * (`email && needsRealEmail(email)`), never on a null they couldn't resolve.
 */
export function needsRealEmail(email: string | null | undefined): boolean {
  if (!email) return true;
  if (isPlaceholderEmail(email)) return true;
  if (!isValidEmailFormat(email)) return true;
  return false;
}
