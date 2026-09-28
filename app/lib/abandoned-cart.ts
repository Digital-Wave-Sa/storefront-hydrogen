/**
 * The COMPLETED end of the abandoned-cart feed.
 *
 * The cart action reports ACTIVE on every change and CLEARED when the cart
 * empties, but it cannot report the sale: Shopify hosts the checkout, so that
 * action finished minutes before the payment went through. Nothing ever sent
 * COMPLETED, which left the CRM holding an ACTIVE cart for every successful
 * order -- a shopper chased over WhatsApp to come back and buy what they had
 * already bought.
 *
 * Built here, once, so both order webhooks that can close a cart build the
 * exact same payload from the same rules.
 */

export interface CartCloseItem {
  id: string;
  title: string;
  quantity: number;
  price: number;
}

export interface CartCloseInput {
  phone: string;
  customerName: string;
  cartId: string;
  subtotal: number;
  currency: string;
  cartUrl: string;
  status: 'COMPLETED';
  orderName: string;
  orderNumber: string;
  items: CartCloseItem[];
}

/** A `note_attributes` entry, by `name` or the legacy `key` spelling. */
function noteAttribute(payload: any, name: string): string {
  const attrs = Array.isArray(payload?.note_attributes)
    ? payload.note_attributes
    : [];
  const hit = attrs.find(
    (a: any) =>
      String(a?.name ?? '') === name || String(a?.key ?? '') === name,
  );
  const value = hit?.value;
  if (value == null) return '';
  return typeof value === 'string' ? value : String(value);
}

function toAmount(raw: unknown): number {
  const n = parseFloat(String(raw ?? '0'));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Build the `COMPLETED` cart-sync payload for a Shopify order, or `null` when
 * the order carries no phone -- the middleware refuses a cart sync without one,
 * so there is nothing to send.
 *
 * `cart_id` is the value `checkout/initiate` wrote into the cart's note
 * attributes; Shopify's own `cart_token`/`checkout_token` are different values
 * the CRM cannot match on, kept only as a last resort for an order that did not
 * come through our checkout.
 */
export function orderCartCloseInput(payload: any): CartCloseInput | null {
  const customer = payload?.customer || {};
  const shipping = payload?.shipping_address || payload?.billing_address || {};

  const phone =
    (typeof customer?.phone === 'string' && customer.phone) ||
    (typeof shipping?.phone === 'string' && shipping.phone) ||
    '';
  if (!phone) return null;

  const customerName =
    [customer?.first_name, customer?.last_name].filter(Boolean).join(' ') ||
    'Guest';

  const orderNumber =
    payload?.order_number != null ? String(payload.order_number) : '';

  return {
    phone,
    customerName,
    cartId:
      noteAttribute(payload, 'cart_id') ||
      (typeof payload?.cart_token === 'string' ? payload.cart_token : '') ||
      (typeof payload?.checkout_token === 'string'
        ? payload.checkout_token
        : '') ||
      '',
    subtotal: toAmount(payload?.subtotal_price ?? payload?.total_price),
    currency:
      (typeof payload?.currency === 'string' && payload.currency) || 'SAR',
    cartUrl:
      typeof payload?.order_status_url === 'string'
        ? payload.order_status_url
        : '',
    status: 'COMPLETED',
    orderName:
      (typeof payload?.name === 'string' && payload.name) ||
      (orderNumber ? `#${orderNumber}` : ''),
    orderNumber,
    items: (Array.isArray(payload?.line_items) ? payload.line_items : []).map(
      (item: any) => ({
        id: item?.variant_id ? String(item.variant_id) : '',
        title: item?.name || item?.title || 'Product',
        quantity: item?.quantity || 1,
        price: toAmount(item?.price),
      }),
    ),
  };
}
