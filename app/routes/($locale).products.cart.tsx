import { redirect, data, type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router';
import { CartForm } from '@shopify/hydrogen';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const isEn = context.storefront.i18n.language === 'EN' || request.url.includes('/en/');
  return redirect(isEn ? '/en/cart' : '/cart', 302);
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { cart } = context;
  const isEn = context.storefront.i18n.language === 'EN' || request.url.includes('/en/');

  try {
    const formData = await request.formData();
    const { action: rawAction, inputs: rawInputs } = CartForm.getFormInput(formData);
    const action = rawAction as any;
    const inputs = rawInputs as any;

    if (action === CartForm.ACTIONS.LinesAdd && inputs?.lines) {
      const result = await cart.addLines(inputs.lines);
      const cartId = result?.cart?.id;
      const headers = cartId ? cart.setCartId(result.cart.id) : new Headers();
      if (context.session?.isPending) {
        headers.append('Set-Cookie', await context.session.commit());
      }
      return data(
        { cart: result?.cart, errors: result?.errors || [] },
        { status: 200, headers }
      );
    }
  } catch (err) {
    console.error('[PRODUCTS/CART ACTION ERROR]', err);
  }

  return data(
    { cart: null, errors: [{ message: 'Cart action processed' }] },
    { status: 200 }
  );
}

export default function ProductsCartCatchAll() {
  return null;
}
