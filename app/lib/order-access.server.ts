/**
 * Who may see an order.
 *
 * Shared by /track-order and /api/invoice so the two cannot drift. The
 * invoice used to have no check at all: /api/invoice/SDN-1001 … SDN-9999
 * returned every customer's name, phone and address to anyone who asked, and
 * order numbers are sequential.
 *
 * A viewer may see an order when their signed-in phone, email or customer id
 * matches it, or when they already confirmed its phone/email on the tracking
 * page this session (VERIFIED_ORDERS_KEY).
 *
 * The order node must carry `id`, `email`, `phone`, `customer { id email
 * phone }` and `shippingAddress { phone }`.
 */

export const VERIFIED_ORDERS_KEY = 'verifiedOrders';

const onlyDigits = (v: unknown) => String(v ?? '').replace(/\D/g, '');
const normEmail = (v: unknown) => String(v ?? '').trim().toLowerCase();

/** Every phone/email recorded against the order. */
function orderContacts(orderNode: any) {
  const phones = [
    orderNode?.phone,
    orderNode?.customer?.phone,
    orderNode?.shippingAddress?.phone,
  ]
    .map(onlyDigits)
    .filter((p) => p.length >= 7);

  const emails = [orderNode?.email, orderNode?.customer?.email]
    .map(normEmail)
    .filter(Boolean);

  return {phones, emails};
}

/**
 * Compare a supplied phone/email against the order's own contacts.
 * Phones match on their last 9 digits so +966 / 05 / 9665 spellings all work.
 */
export function contactMatchesOrder(orderNode: any, contact: string) {
  const value = String(contact ?? '').trim();
  if (!value) return false;

  const {phones, emails} = orderContacts(orderNode);

  if (value.includes('@')) {
    return emails.includes(normEmail(value));
  }

  const supplied = onlyDigits(value);
  if (supplied.length < 7) return false;
  const tail = supplied.slice(-9);
  return phones.some((p) => p === supplied || p.endsWith(tail));
}

/** True when the signed-in visitor is the person on the order, or already verified it. */
export async function viewerMaySeeOrder(orderNode: any, context: any) {
  const session = context.session;

  // Identity keys written at login: loginOtpPhone / loginCustomerEmail /
  // loginCustomerId (loginOtpEmail is read elsewhere in the app, so honour it
  // too in case it starts being written).
  const sessionPhone = await session.get('loginOtpPhone');
  const sessionEmail =
    (await session.get('loginCustomerEmail')) ||
    (await session.get('loginOtpEmail'));
  const sessionCustomerId = await session.get('loginCustomerId');

  if (sessionPhone && contactMatchesOrder(orderNode, String(sessionPhone))) {
    return true;
  }
  if (sessionEmail && contactMatchesOrder(orderNode, String(sessionEmail))) {
    return true;
  }

  // Orders placed in-store or by phone may carry no contact details of their
  // own; fall back to the customer the order is attached to.
  const orderCustomerId = onlyDigits(orderNode?.customer?.id);
  if (
    sessionCustomerId &&
    orderCustomerId &&
    onlyDigits(sessionCustomerId) === orderCustomerId
  ) {
    return true;
  }

  const verified: string[] = (await session.get(VERIFIED_ORDERS_KEY)) || [];
  return verified.includes(String(orderNode.id));
}
