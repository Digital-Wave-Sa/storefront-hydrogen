// @ts-check

/**
 * The delivery address chosen in the cart cannot be changed in checkout.
 *
 * On saadeddin.com the customer picks one of their saved addresses in the
 * cart; branch, delivery fee, date and time slot are all worked out from it.
 * Checkout then pre-fills that address, but Shopify lets every address field
 * be edited and offers the customer's other saved addresses -- so an order
 * could be paid for an address the branch and fee were never checked for.
 *
 * Shopify does not allow address fields to be made read-only, so this blocks
 * instead: when the checkout address no longer matches the one locked by the
 * cart (street + city, compared loosely), an error is shown under the field
 * and the order cannot be completed until it matches again. To use another
 * address the customer goes back to the cart.
 *
 * Checked only in checkout (never in the storefront cart, where the error
 * would surface on the site), only for delivery (pickup is ignored), and only
 * when the cart carries a lock -- no lock, no rule.
 */

/**
 * @typedef {import("../generated/api").CartValidationsGenerateRunInput} RunInput
 * @typedef {import("../generated/api").CartValidationsGenerateRunResult} RunResult
 */

/** @type {RunResult} */
const NO_ERRORS = {operations: []};

const CHECKOUT_STEPS = new Set(['CHECKOUT_INTERACTION', 'CHECKOUT_COMPLETION']);
const PICKUP_METHODS = new Set(['PICK_UP', 'PICKUP_POINT']);

const MESSAGES = {
  ar: 'لا يمكن تغيير عنوان التوصيل هنا. لاستخدام عنوان آخر، ارجع إلى السلة واختره هناك.',
  en: "The delivery address can't be changed here. To use a different address, go back to your cart and choose it there.",
};

/**
 * Loose form for comparing: case, spacing, punctuation, Arabic letter
 * variants (أ إ آ → ا, ة → ه, ى → ي), diacritics and Arabic-Indic digits
 * do not count as a change. Formatting a checkout may apply on its own
 * therefore never blocks a correct address.
 * @param {string | null | undefined} value
 */
export function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

/**
 * Same street when one normalized form contains the other, so checkout adding
 * a building number or dropping a trailing detail is not a "different" address.
 * @param {string} locked
 * @param {string} current
 */
function sameStreet(locked, current) {
  if (!locked || !current) return locked === current;
  return locked === current || locked.includes(current) || current.includes(locked);
}

/**
 * @param {RunInput} input
 * @returns {RunResult}
 */
export function cartValidationsGenerateRun(input) {
  if (!CHECKOUT_STEPS.has(String(input.buyerJourney?.step || ''))) return NO_ERRORS;

  /** @type {{address1?: string, city?: string} | null} */
  let locked = null;
  try {
    locked = JSON.parse(input.cart?.lockedAddress?.value || 'null');
  } catch {
    return NO_ERRORS; // unreadable lock: never block on our own bad data
  }
  const lockedStreet = normalize(locked?.address1);
  const lockedCity = normalize(locked?.city);
  if (!lockedStreet || !lockedCity) return NO_ERRORS;

  const lang = String(input.localization?.language?.isoCode || '').toUpperCase();
  const message = lang.startsWith('EN') ? MESSAGES.en : MESSAGES.ar;

  const errors = [];
  (input.cart?.deliveryGroups || []).forEach((group, index) => {
    const method = String(group?.selectedDeliveryOption?.deliveryMethodType || '');
    if (PICKUP_METHODS.has(method)) return;
    const address = group?.deliveryAddress;
    if (!address) return; // nothing entered yet

    const street = normalize(address.address1);
    const city = normalize(address.city);
    // Checkout shows field errors for the first delivery group only; any
    // other group gets the message at the top of the page.
    const field = (name) =>
      index === 0 ? `$.cart.deliveryGroups[0].deliveryAddress.${name}` : '$.cart';
    if (!sameStreet(lockedStreet, street)) {
      errors.push({message, target: field('address1')});
    } else if (city !== lockedCity) {
      errors.push({message, target: field('city')});
    }
  });

  if (!errors.length) return NO_ERRORS;
  return {operations: [{validationAdd: {errors}}]};
}
