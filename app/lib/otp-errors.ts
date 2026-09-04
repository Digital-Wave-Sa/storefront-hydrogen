/**
 * Turning the CRM's verification errors into something a customer can read.
 *
 * The CRM answers in English only, and the storefront used to hand a good deal
 * of that straight through: any message it did not recognise was returned
 * verbatim, so an Arabic shopper met "Too many attempts. Try again in 60
 * seconds.,60" — English, and with a stray comma-60 from an array being
 * coerced to a string (fixed at the source in saadeddin-api.server.ts).
 *
 * It also read the "attempts remaining" figure with `errorMessage.match(/\d+/)`
 * — the first number *anywhere* in the message — falling back to a hard-coded
 * "2". So it announced two attempts left whenever the CRM's wording carried no
 * digits at all, true or not, and would have read a phone number as an attempt
 * count had one appeared first.
 *
 * Here the message is classified, and a number is used only when it was found
 * in a phrase that actually means that number. When nothing is certain, the
 * count is left out rather than invented: no count is better than a wrong one.
 *
 * This is still string matching against another service's prose, which is
 * fragile by nature. The durable fix is for /auth/verify-otp to return a
 * stable code (`invalid_code`, `expired`, `rate_limited`) plus `retryAfter`,
 * at which point `classifyOtpError` reduces to reading that field.
 */

/**
 * Wrong codes allowed before the storefront stops accepting them itself.
 *
 * This is not the security boundary — a session cookie is cleared in a
 * second, so anyone actually attacking a 4-digit code walks straight past it.
 * The real limit belongs to the CRM, keyed to the phone number. This exists so
 * an impatient shopper gets an immediate, translated answer without another
 * round trip, and so repeated wrong codes stop reaching the CRM at all.
 */
export const MAX_OTP_ATTEMPTS = 3;

/** How long the storefront refuses codes after MAX_OTP_ATTEMPTS. */
export const OTP_BLOCK_MS = 60_000;

export type OtpErrorKind =
  | 'invalid'
  | 'expired'
  | 'rate_limited'
  | 'not_found'
  | 'unknown';

export interface OtpErrorInfo {
  kind: OtpErrorKind;
  /** Attempts left, only when the message actually said so. */
  attemptsRemaining?: number;
  /** Seconds to wait, from the API's own field or an explicit phrase. */
  retryAfterSeconds?: number;
}

/**
 * Arabic counts are not a number followed by a noun.
 *
 * One and two are carried by the noun's own form (محاولة واحدة, محاولتان), 3–10
 * take the plural (٣ محاولات), and 11 and up return to the singular (١١ محاولة).
 * Writing `${n} محاولة` for every value — as this did — is wrong at every value
 * except 11 and above.
 */
export function arabicCount(
  n: number,
  forms: {one: string; two: string; few: string; many: string},
): string {
  if (n === 1) return forms.one;
  if (n === 2) return forms.two;
  if (n >= 3 && n <= 10) return `${n} ${forms.few}`;
  return `${n} ${forms.many}`;
}

export const arabicAttempts = (n: number) =>
  arabicCount(n, {
    one: 'محاولة واحدة',
    two: 'محاولتان',
    few: 'محاولات',
    many: 'محاولة',
  });

export const arabicSeconds = (n: number) =>
  arabicCount(n, {
    one: 'ثانية واحدة',
    two: 'ثانيتين',
    few: 'ثوانٍ',
    many: 'ثانية',
  });

export const arabicMinutes = (n: number) =>
  arabicCount(n, {
    one: 'دقيقة واحدة',
    two: 'دقيقتين',
    few: 'دقائق',
    many: 'دقيقة',
  });

/** Read a number only from a phrase that means what we are looking for. */
function firstCapture(text: string, patterns: RegExp[]): number | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const value = Number(match[1]);
      if (Number.isFinite(value)) return value;
    }
  }
  return undefined;
}

export function classifyOtpError(
  errorMessage: string,
  retryAfterFromApi?: number,
): OtpErrorInfo {
  const text = String(errorMessage || '').toLowerCase();

  const retryAfterSeconds =
    retryAfterFromApi ??
    firstCapture(text, [
      /(?:try again|retry)\s*(?:in|after)\s*(\d+)\s*second/,
      /(\d+)\s*seconds?\s*(?:remaining|left)/,
    ]);

  /**
   * Checked before anything else. A rate-limit message often mentions
   * "attempts" and sometimes "otp" too, so the older order — which tested a
   * bare `includes('otp')` first — reported a lockout as a wrong code and told
   * the customer to try again immediately.
   */
  if (
    text.includes('too many') ||
    text.includes('rate limit') ||
    text.includes('locked') ||
    text.includes('blocked')
  ) {
    return {kind: 'rate_limited', retryAfterSeconds};
  }

  if (text.includes('expired') || text.includes('expire')) {
    return {kind: 'expired', retryAfterSeconds};
  }

  if (text.includes('no otp found') || text.includes('not found')) {
    return {kind: 'not_found', retryAfterSeconds};
  }

  if (
    text.includes('invalid code') ||
    text.includes('incorrect code') ||
    text.includes('invalid verification code') ||
    text.includes('incorrect verification code') ||
    text.includes('invalid otp') ||
    text.includes('wrong otp') ||
    text.includes('otp')
  ) {
    return {
      kind: 'invalid',
      // Only from a phrase that genuinely states a remaining count.
      attemptsRemaining: firstCapture(text, [
        /(\d+)\s*(?:more\s*)?attempts?\s*(?:remaining|left)/,
        /(?:remaining|left)\s*[:\s]\s*(\d+)\s*attempts?/,
        /you have\s*(\d+)\s*attempts?/,
      ]),
      retryAfterSeconds,
    };
  }

  return {kind: 'unknown', retryAfterSeconds};
}

/**
 * Just the duration — "18 seconds", "‏١٨ ثانية", "دقيقتين".
 *
 * Carries its own unit, so callers must not append one. The lockout panel used
 * to render `formatMMSS(seconds)` and then write "دقيقة" after it, which
 * turned an 18-second wait into "0:18 دقيقة" — eighteen minutes, to anyone
 * reading the words.
 */
export function otpWaitPhrase(
  secondsRemaining: number,
  lang: 'en' | 'ar',
): string {
  const isEn = lang === 'en';
  const secs = Math.max(0, Math.ceil(secondsRemaining));

  if (secs < 60) {
    return isEn ? `${secs} second${secs === 1 ? '' : 's'}` : arabicSeconds(secs);
  }

  const mins = Math.ceil(secs / 60);
  return isEn ? `${mins} minute${mins === 1 ? '' : 's'}` : arabicMinutes(mins);
}

/** "Too many attempts, come back in …", counted in whichever unit reads best. */
export function otpBlockedMessage(
  secondsRemaining: number,
  lang: 'en' | 'ar',
): string {
  const isEn = lang === 'en';
  const secs = Math.max(0, Math.ceil(secondsRemaining));

  if (secs <= 0) {
    return isEn
      ? 'Too many attempts. Please try again shortly.'
      : 'لقد تجاوزت عدد المحاولات المسموح به. يرجى المحاولة بعد قليل.';
  }

  return isEn
    ? `Too many attempts. Please try again in ${otpWaitPhrase(secs, lang)}.`
    : `لقد تجاوزت عدد المحاولات المسموح به. يرجى المحاولة بعد ${otpWaitPhrase(secs, lang)}.`;
}

/** "Wrong code — N left", or just "wrong code" when the count is unknown. */
export function otpAttemptsLeftMessage(
  remaining: number | undefined,
  lang: 'en' | 'ar',
): string {
  const isEn = lang === 'en';

  if (typeof remaining !== 'number' || remaining < 0) {
    return isEn
      ? 'Invalid code. Please check and try again.'
      : 'الرمز غير صحيح. يرجى التحقق والمحاولة مرة أخرى.';
  }

  return isEn
    ? `Invalid code. You have ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
    : `الرمز غير صحيح — تبقّت لك ${arabicAttempts(remaining)}.`;
}

/**
 * A customer-facing sentence in their own language.
 *
 * Nothing from the CRM is ever shown directly: an unrecognised message becomes
 * a generic line rather than English prose on an Arabic page.
 */
export function formatOtpError(
  errorMessage: string,
  lang: 'en' | 'ar',
  retryAfterFromApi?: number,
): string {
  const isEn = lang === 'en';

  if (!errorMessage) {
    return isEn ? 'Invalid verification code.' : 'رمز التحقق غير صحيح.';
  }

  const {kind, attemptsRemaining, retryAfterSeconds} = classifyOtpError(
    errorMessage,
    retryAfterFromApi,
  );

  switch (kind) {
    case 'rate_limited':
      return otpBlockedMessage(retryAfterSeconds ?? 0, lang);

    case 'expired':
      return isEn
        ? 'This code has expired. Please request a new one.'
        : 'انتهت صلاحية الرمز. يرجى طلب رمز جديد.';

    case 'not_found':
      return isEn
        ? 'No active code for this number. Please request a new one.'
        : 'لا يوجد رمز فعّال لهذا الرقم. يرجى طلب رمز جديد.';

    // No count unless the CRM actually gave one.
    case 'invalid':
      return otpAttemptsLeftMessage(attemptsRemaining, lang);

    default:
      return isEn
        ? 'Verification failed. Please try again.'
        : 'تعذّر التحقق. يرجى المحاولة مرة أخرى.';
  }
}
