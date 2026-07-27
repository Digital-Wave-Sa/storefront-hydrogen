import { redirect, type ActionFunctionArgs } from 'react-router';
import { SaadeddinApi } from '~/lib/saadeddin-api.server';

export async function action({ request, context }: ActionFunctionArgs) {
  const { storefront, session, env } = context;
  const lang = storefront.i18n.language === 'EN' ? 'en' : 'ar';
  
  if (request.method !== 'POST') {
    return redirect(lang === 'en' ? '/en/cart' : '/cart');
  }

  // 1. Ensure user is logged in via Custom API or Shopify Customer Access Token
  const customToken = await session.get('saadeddinToken');
  const customerAccessToken = await session.get('customerAccessToken');
  console.log('[CHECKOUT DIAGNOSTIC] customToken:', customToken, 'customerAccessToken:', !!customerAccessToken);

  if (!customToken && !customerAccessToken) {
    console.log('[CHECKOUT DIAGNOSTIC] Redirecting to login: no customToken and no customerAccessToken');
    const redirectToUrl = lang === 'en' ? '/en/cart' : '/cart';
    return redirect(
      (lang === 'en' ? `/en/account/login` : `/account/login`) + 
      `?redirectTo=${encodeURIComponent(redirectToUrl)}`
    );
  }

  // 2. Fetch current Cart from Hydrogen
  const cartId = await context.cart.getCartId();
  console.log('[CHECKOUT DIAGNOSTIC] cartId:', cartId);
  if (!cartId) {
    console.log('[CHECKOUT DIAGNOSTIC] Redirecting to cart: no cartId');
    return redirect(lang === 'en' ? '/en/cart' : '/cart');
  }

  // Associate customerAccessToken with Cart Buyer Identity to bypass checkout login prompt
  if (customerAccessToken) {
    const token = typeof customerAccessToken === 'string' ? customerAccessToken : customerAccessToken.accessToken;
    try {
      await context.cart.updateBuyerIdentity({
        customerAccessToken: token,
      });
      console.log('[CHECKOUT DIAGNOSTIC] Successfully updated cart buyer identity');
    } catch (err) {
      console.error('[CHECKOUT DIAGNOSTIC] Failed to update cart buyer identity:', err);
    }
  }
  
  const { cart } = await storefront.query(`#graphql
    query checkoutCart($cartId: ID!) {
      cart(id: $cartId) {
        id
        checkoutUrl
        note
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

  // 3. Build payload for Saadeddin API and restore location properties
  let rawAttributes = cart.attributes || [];
  
  // Reconstruct missing attributes from the session if Shopify cleared them during login/identity update
  const sessionFulfillmentType = await session.get('fulfillmentType');
  const sessionBranch = await session.get('selectedLocationName');
  const sessionBranchId = await session.get('selectedLocationId');
  const sessionCustomBranchId = await session.get('selectedCustomBranchId');
  const sessionAxStoreId = await session.get('selectedAxStoreId');
  const sessionDate = await session.get('delivery_date');
  const sessionTimeSlot = await session.get('Time Slot');

  // Helper: check if attribute already exists and has a value, otherwise fall back to session
  const getAttr = (key: string, sessionVal: any) => {
    const existing = rawAttributes.find((a: any) => a.key === key)?.value;
    return existing || sessionVal || '';
  };

  const finalAttributes = [
    { key: 'Branch', value: getAttr('Branch', sessionBranch) },
    { key: 'Branch ID', value: getAttr('Branch ID', sessionBranchId) },
    { key: 'Fulfillment Type', value: getAttr('Fulfillment Type', sessionFulfillmentType === 'pickup' ? 'Pickup' : 'Delivery') },
  ];

  const customBranchVal = getAttr('custom.branch_id', sessionCustomBranchId) || getAttr('branch_id', sessionCustomBranchId);
  if (customBranchVal) {
    finalAttributes.push({ key: 'custom.branch_id', value: customBranchVal });
    finalAttributes.push({ key: 'branch_id', value: customBranchVal });
  }

  const customAxStoreVal = getAttr('custom.ax_store_id', sessionAxStoreId) || getAttr('ax_store_id', sessionAxStoreId) || getAttr('AX Store ID', sessionAxStoreId);
  if (customAxStoreVal) {
    finalAttributes.push({ key: 'custom.ax_store_id', value: customAxStoreVal });
    finalAttributes.push({ key: 'ax_store_id', value: customAxStoreVal });
    finalAttributes.push({ key: 'AX Store ID', value: customAxStoreVal });
  }

  const deliveryDateVal = getAttr('delivery_date', sessionDate);
  if (deliveryDateVal) {
    finalAttributes.push({ key: 'delivery_date', value: deliveryDateVal });
  }

  const timeSlotVal = getAttr('Time Slot', sessionTimeSlot);
  if (timeSlotVal) {
    finalAttributes.push({ key: 'Time Slot', value: timeSlotVal });
  }

  // Preserve any other attributes (like loyalty_points)
  rawAttributes.forEach((attr: any) => {
    if (!finalAttributes.find((f) => f.key === attr.key)) {
      finalAttributes.push({ key: attr.key, value: attr.value || '' });
    }
  });

  // 4. Update the cart attributes and cart note on Shopify server
  try {
    await context.cart.updateAttributes(finalAttributes);
  } catch (err) {
    console.error('[CHECKOUT] Attributes update failed:', err);
  }

  // Format plaintext note block for fallback — used only in URL query params, NOT written to Shopify cart note
  const branchName = finalAttributes.find((a: any) => a.key === 'Branch')?.value;
  const branchId = finalAttributes.find((a: any) => a.key === 'Branch ID')?.value;
  const fulfillmentType = finalAttributes.find((a: any) => a.key === 'Fulfillment Type')?.value;
  const isPickup = fulfillmentType?.toLowerCase() === 'pickup';

  const branchNoteBlock = `[Fulfillment: ${fulfillmentType || 'Delivery'}, Branch: ${branchName || 'N/A'}, Branch ID: ${branchId || 'N/A'}, custom.branch_id: ${customBranchVal || 'N/A'}, custom.ax_store_id: ${customAxStoreVal || 'N/A'}, delivery_date: ${deliveryDateVal || 'N/A'}, Time Slot: ${timeSlotVal || 'N/A'}]`;

  // Only pass the customer-written note — do NOT modify the Shopify cart note with internal metadata
  const customerNote = (cart.note || '').replace(/\[Fulfillment:[^\]]*\]/g, '').trim();

  const isBypassToken = customToken === 'dev-bypass-token';
  
  let profile: { name?: string, phone?: string } = {};
  if (isBypassToken) {
    profile = { name: 'Dev Bypass User', phone: '966501111111' };
  } else if (customToken) {
    const api = new SaadeddinApi(env, customToken);
    try {
      profile = await api.getProfile();
    } catch(e) {
      console.warn('[CHECKOUT] getProfile failed, continuing checkout gracefully:', e);
    }
  }

  const pointsAttr = finalAttributes.find((a: any) => a.key === 'loyalty_points')?.value;
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
    branchId: customBranchVal || branchId || '',
    axStoreId: customAxStoreVal || '',
    noteAttributes: finalAttributes.map((a: any) => ({ name: a.key, value: a.value })),
    attributes: finalAttributes.map((a: any) => ({ key: a.key, value: a.value })),
    idempotencyKey: `order-${Date.now()}`
  };

  try {
    let checkoutUrl = cart.checkoutUrl;
    if (checkoutUrl && finalAttributes.length > 0) {
      const urlObj = new URL(checkoutUrl);
      finalAttributes.forEach((attr: any) => {
        if (attr.key && attr.value) {
          urlObj.searchParams.set(`attributes[${attr.key}]`, attr.value);
          urlObj.searchParams.set(`note_attributes[${attr.key}]`, attr.value);
        }
      });
      // Build the order note: customer's written note + internal metadata block
      // The metadata block is only passed via the URL — it is NOT stored in the Shopify cart note
      const urlNote = customerNote
        ? `${customerNote}\n\n${branchNoteBlock}`
        : branchNoteBlock;
      urlObj.searchParams.set('note', urlNote);
      checkoutUrl = urlObj.toString();
    }

    if (checkoutUrl) {
      return redirect(checkoutUrl);
    }
    return redirect(lang === 'en' ? '/en/cart' : '/cart');
  } catch (error: any) {
    console.error('Checkout redirect error:', error);
    return redirect(lang === 'en' ? `/en/cart` : `/cart`);
  }
}
