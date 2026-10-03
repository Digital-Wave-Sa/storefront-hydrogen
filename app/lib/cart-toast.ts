/**
 * «أُضيفت إلى السلة» confirmation after add-to-cart.
 *
 * The cart drawer used to open on every add, covering the page the shopper
 * was browsing (the whole screen on a phone). The client asked for something
 * lighter: a small card that confirms the add, offers «عرض السلة», and goes
 * away on its own -- first on phones, then on desktop too. The drawer still
 * opens from the cart icon in the header.
 *
 * The card is one component (CartAddedToast, mounted once in PageLayout) fed by
 * a window event, so any add-to-cart button can raise it without threading a
 * context through.
 */

export const CART_TOAST_EVENT = 'saadeddin:cart-added';

export type CartToastDetail =
  | {kind: 'added'; title?: string; image?: string; quantity?: number}
  | {kind: 'error'; message: string};

/**
 * True where the toast replaces the drawer after an add. Every screen size
 * now; kept as one switch so the drawer can come back (e.g. desktop only) by
 * changing this function alone.
 */
export function prefersCartToast(): boolean {
  return typeof window !== 'undefined';
}

export function showCartToast(detail: CartToastDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CART_TOAST_EVENT, {detail}));
}

/**
 * For flows that already know the add succeeded: the toast, or the drawer
 * where the toast is switched off.
 */
export function confirmCartAdd(
  open: (mode: 'cart') => void,
  item?: {title?: string; image?: string; quantity?: number},
) {
  if (prefersCartToast()) showCartToast({kind: 'added', ...item});
  else open('cart');
}
