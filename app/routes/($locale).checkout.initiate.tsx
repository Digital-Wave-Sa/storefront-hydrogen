import { redirect, type ActionFunctionArgs } from 'react-router';
import { SaadeddinApi } from '~/lib/saadeddin-api.server';

export async function action({ request, context }: ActionFunctionArgs) {
  const { storefront, session, env } = context;
  const lang = storefront.i18n.language === 'EN' ? 'en' : 'ar';
  
  if (request.method !== 'POST') {
    return redirect(lang === 'en' ? '/en/cart' : '/cart');
  }

  // 1. Ensure user is logged in via Custom API
  const customToken = await session.get('saadeddinToken');
  console.log('[CHECKOUT DIAGNOSTIC] customToken:', customToken);

  if (!customToken) {
    console.log('[CHECKOUT DIAGNOSTIC] Redirecting to login: no customToken');
    return redirect(lang === 'en' ? '/en/account/login' : '/account/login');
  }

  // 2. Fetch current Cart from Hydrogen
  const cartId = await context.cart.getCartId();
  console.log('[CHECKOUT DIAGNOSTIC] cartId:', cartId);
  if (!cartId) {
    console.log('[CHECKOUT DIAGNOSTIC] Redirecting to cart: no cartId');
    return redirect(lang === 'en' ? '/en/cart' : '/cart');
  }
  
  const { cart } = await storefront.query(`#graphql
    query checkoutCart($cartId: ID!) {
      cart(id: $cartId) {
        id
        checkoutUrl
        cost {
          subtotalAmount { amount currencyCode }
          totalAmount { amount currencyCode }
        }
        lines(first: 100) {
          nodes {
            id
            quantity
            merchandise {
              ... on ProductVariant {
                id
                title
                sku
                price { amount }
                product { title id }
              }
            }
          }
        }
        attributes {
          key
          value
        }
      }
    }
  `, {
    variables: { cartId },
    cache: storefront.CacheNone(),
  });

  console.log('[CHECKOUT DIAGNOSTIC] cart query result:', JSON.stringify(cart, null, 2));

  if (!cart || !cart.lines?.nodes?.length) {
    console.log('[CHECKOUT DIAGNOSTIC] Redirecting to cart: cart is null or empty');
    return redirect(lang === 'en' ? '/en/cart' : '/cart');
  }

  // 3. Build payload for Saadeddin API
  const attributes = cart.attributes || [];
  const fulfillmentType = attributes.find((a: any) => a.key.toLowerCase().trim() === 'fulfillment type')?.value;
  const isPickup = fulfillmentType?.toLowerCase() === 'pickup';
  
  const isBypassToken = customToken === 'dev-bypass-token';
  
  let profile;
  if (isBypassToken) {
    profile = { name: 'Dev Bypass User', phone: '966501111111' };
  } else {
    const api = new SaadeddinApi(env, customToken);
    try {
      profile = await api.getProfile();
    } catch(e) {
      return redirect(lang === 'en' ? '/en/account/login' : '/account/login');
    }
  }

  const pointsAttr = attributes.find((a: any) => a.key === 'loyalty_points')?.value;
  const pointsToRedeem = pointsAttr ? parseInt(pointsAttr) : undefined;
  
  const payload = {
    cart: {
      subtotal: parseFloat(cart.cost.subtotalAmount.amount),
      items: cart.lines.nodes.map((line: any) => ({
        id: line.merchandise.sku || line.merchandise.id,
        name: line.merchandise.product.title,
        price: parseFloat(line.merchandise.price.amount),
        quantity: line.quantity
      }))
    },
    phone: profile.phone,
    customerName: profile.name,
    pointsToRedeem,
    deliveryType: isPickup ? 'Pick Up' : 'Delivery',
    idempotencyKey: `order-${Date.now()}`
  };

  try {
    let checkoutRes;
    if (isBypassToken) {
      // Redirect directly to the real Shopify web checkout page
      if (cart.checkoutUrl) {
        return redirect(cart.checkoutUrl);
      }
      return redirect(lang === 'en' ? '/en/cart' : '/cart');
    } else {
      const api = new SaadeddinApi(env, customToken);
      checkoutRes = await api.initiateCheckout(payload as any);
    }
    
    if (checkoutRes.status === 'PAID') {
      // Order paid in full via points/gift card
      return redirect(lang === 'en' ? '/en/account/orders' : '/account/orders'); 
    } else if (checkoutRes.status === 'AWAITING_PAYMENT' && checkoutRes.paymentUrl) {
      return redirect(checkoutRes.paymentUrl);
    }
    
    return redirect(lang === 'en' ? '/en/cart' : '/cart');
  } catch (error: any) {
    console.error('Checkout error:', error);
    // Ideally we pass error back to cart. For now just redirect back.
    return redirect(lang === 'en' ? `/en/cart` : `/cart`);
  }
}
