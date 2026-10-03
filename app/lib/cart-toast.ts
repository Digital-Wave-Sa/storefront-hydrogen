/**
 * «تمت الإضافة إلى السلة» confirmation on phones.
 *
 * On a phone the cart drawer covers the whole screen the moment an item is
 * added, so every add pulls the shopper off the page they were browsing. The
 * client asked for something lighter there: a small bar at the bottom that
 * confirms the add, offers «عرض السلة», and goes away on its own.
 *
 * Desktop keeps the drawer -- on a wide screen it sits beside the page instead
 * of replacing it.
 *
 * The bar is one component (CartAddedToast, mounted once in PageLayout) fed by
 * a window event, so any add-to-cart button can raise it without threading a
 * context through.
 */

export const CART_TOAST_EVENT = 'saadeddin:cart-added';

/** Same breakpoint as the product page's sticky mobile bar (`lg:hidden`). */
const MOBILE_QUERY = '(max-width: 1023px)';

export type CartToastDetail =
  | {kind: 'added'; title?: string; image?: string; quantity?: number}
  | {kind: 'error'; message: string};

/** True where the drawer is replaced by the toast. */
export function prefersCartToast(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia(MOBILE_QUERY).matches;
}

export function showCartToast(detail: CartToastDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CART_TOAST_EVENT, {detail}));
}

/**
 * For flows that already know the add succeeded: the toast on a phone, the
 * drawer everywhere else.
 */
export function confirmCartAdd(
  open: (mode: 'cart') => void,
  item?: {title?: string; image?: string; quantity?: number},
) {
  if (prefersCartToast()) showCartToast({kind: 'added', ...item});
  else open('cart');
}
