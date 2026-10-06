// @ts-check

/**
 * Pickup at the branch the shopper chose, showing the slot they chose.
 *
 * Without this, Shopify builds the pickup list itself:
 *   - it lists every branch that has stock, and opens on whichever it ranks
 *     first -- not the branch picked on the site;
 *   - under each one it prints the branch's fixed estimate, «جاهز عادةً خلال
 *     ٢٤ ساعة», although the shopper already chose a date and a time slot.
 *
 * This function replaces that list:
 *   1. The chosen branch (cart attribute `Branch ID`) is the only option,
 *      with the chosen date and slot as its instruction line:
 *        «الاستلام: الثلاثاء ٦ أكتوبر، 2:00 م - 3:00 م»
 *   2. If that branch cannot be found, has pickup off, or cannot fulfil the
 *      cart, it falls back to every pickup branch that can -- the shopper can
 *      still check out -- without the fixed "ready in" estimate.
 *
 * Pickup stays free (cost 0), as it is today.
 */

/**
 * @typedef {import("../generated/api").RunInput} RunInput
 * @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult
 */

const DAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** «2026-10-06» -> «الثلاثاء 6 أكتوبر» / «Tuesday 6 October». Empty if unreadable. */
function formatDate(value, isEn) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || '').trim());
  if (!match) return '';
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (Number.isNaN(date.getTime()) || date.getUTCDate() !== d) return '';
  const day = (isEn ? DAYS_EN : DAYS_AR)[date.getUTCDay()];
  const month = (isEn ? MONTHS_EN : MONTHS_AR)[m - 1];
  return `${day} ${d} ${month}`;
}

/** The slot in the checkout's language: «2:00 م» <-> «2:00 PM». */
function formatSlot(value, isEn) {
  const slot = String(value || '').trim();
  if (!slot) return '';
  return isEn
    ? slot.replace(/\s*م(?=\s|-|$)/g, ' PM').replace(/\s*ص(?=\s|-|$)/g, ' AM')
    : slot.replace(/\s*PM\b/gi, ' م').replace(/\s*AM\b/gi, ' ص');
}

/** The gift-card product (storefront app/lib/digital-lines.ts). */
const GIFT_CARD_PRODUCT_ID = 'gid://shopify/Product/9370203521257';

/** @param {any} line */
function isGiftCardLine(line) {
  const m = line?.merchandise;
  if (m?.__typename !== 'ProductVariant') return false;
  return m.product?.id === GIFT_CARD_PRODUCT_ID || m.product?.hasAnyTag === true;
}

/** «gid://shopify/Location/91181056233» -> «91181056233». */
function numericId(gid) {
  return String(gid || '').split('/').pop() || '';
}

/**
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */
export function run(input) {
  // Delivery chosen on the site: offer no pickup branch at checkout, so the
  // شحن / استلام toggle cannot switch the order to pickup behind the cart's
  // back (see free-delivery-without-gift-cards for the other half).
  // No attribute: no lock.
  const fulfillmentType = String(input?.cart?.fulfillmentType?.value || '').trim().toLowerCase();
  if (fulfillmentType === 'delivery') return {operations: []};

  const isEn = String(input?.localization?.language?.isoCode || '').toUpperCase() === 'EN';
  const branchId = String(input?.cart?.branchId?.value || '').trim();

  const date = formatDate(input?.cart?.date?.value, isEn);
  const slot = formatSlot(input?.cart?.slot?.value, isEn);
  const when = [date, slot].filter(Boolean).join(isEn ? ', ' : '، ');
  const chosenInstruction = when ? (isEn ? `Pickup: ${when}` : `الاستلام: ${when}`) : '';

  /*
   * Locations that hold stock for every fulfilment group of this cart --
   * ignoring groups made only of the gift card. The gift card is a regular
   * product that is stocked at no branch, so its group named none of them
   * and every branch failed the test: checkout showed «لا توجد مواقع…»
   * for a cart of cake + gift card (4 Oct 2026).
   */
  const groups = (input?.fulfillmentGroups ?? []).filter(
    (g) => !(g?.lines ?? []).every(isGiftCardLine),
  );
  const canFulfil = (handle) =>
    groups.length === 0 ||
    groups.every((g) => (g?.inventoryLocationHandles ?? []).includes(handle));

  const pickupLocations = (input?.locations ?? []).filter(
    (l) => l?.handle && l?.localPickup?.enabled !== false,
  );

  const chosen = branchId
    ? pickupLocations.find(
        (l) =>
          String(l?.branchId?.value || '').trim() === branchId ||
          numericId(l?.id) === branchId,
      )
    : undefined;

  if (chosen && canFulfil(chosen.handle)) {
    return {
      operations: [
        {
          add: {
            title: chosen.name,
            cost: 0,
            pickupLocation: {
              locationHandle: chosen.handle,
              ...(chosenInstruction ? {pickupInstruction: chosenInstruction} : {}),
            },
          },
        },
      ],
    };
  }

  // Fallback: every pickup branch that can fulfil the cart, no fixed estimate.
  // If the stock test rules out every branch, offer them all and let Shopify
  // decide -- an empty list blocks pickup outright, which is worse.
  const fulfilling = pickupLocations.filter((l) => canFulfil(l.handle));
  return {
    operations: (fulfilling.length > 0 ? fulfilling : pickupLocations)
      .map((l) => ({
        add: {
          title: l.name,
          cost: 0,
          pickupLocation: {locationHandle: l.handle},
        },
      })),
  };
}
