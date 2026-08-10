import {redirect, type ActionFunctionArgs, type LoaderFunctionArgs} from 'react-router';
import {SaadeddinApi} from '~/lib/saadeddin-api.server';
import {extractMinTime} from '~/lib/time-utils';

export async function loader({request, context}: LoaderFunctionArgs) {
  return processCheckoutInitiate({request, context});
}

export async function action({request, context}: ActionFunctionArgs) {
  return processCheckoutInitiate({request, context});
}

async function processCheckoutInitiate({request, context}: ActionFunctionArgs) {
  const {storefront, session, env} = context;
  const lang = storefront.i18n.language === 'EN' ? 'en' : 'ar';

  // 1. Ensure user is logged in via Custom API or Shopify Customer Access Token
  const customToken = await session.get('saadeddinToken');
  const customerAccessToken = await session.get('customerAccessToken');
  console.log('\n====================================================');
  console.log('[CHECKOUT DIAGNOSTIC ENTRY]', request.method, request.url);
  console.log('[CHECKOUT DIAGNOSTIC] customToken:', customToken);
  console.log('[CHECKOUT DIAGNOSTIC] customerAccessToken:', customerAccessToken);

  if (!customToken && !customerAccessToken) {
    console.log(
      '[CHECKOUT DIAGNOSTIC REDIRECT] Redirecting to login: no customToken and no customerAccessToken',
    );
    const checkoutInitiateUrl = lang === 'en' ? '/en/checkout/initiate' : '/checkout/initiate';
    const loginUrl = (lang === 'en' ? `/en/account/login` : `/account/login`) +
      `?redirectTo=${encodeURIComponent(checkoutInitiateUrl)}`;

    const existingCartId = await context.cart.getCartId();
    if (existingCartId) {
      try {
        const currentCart = await context.cart.get();
        if (currentCart?.lines?.nodes?.length) {
          const backupLines = currentCart.lines.nodes.map((line: any) => ({
            merchandiseId: line.merchandise.id,
            quantity: line.quantity,
          }));
          session.set('backupCartLines', JSON.stringify(backupLines));
          console.log('[CHECKOUT BACKUP] Saved backupCartLines before login redirect:', backupLines);
        }
      } catch (e) {
        console.error('[CHECKOUT BACKUP ERROR]', e);
      }
    }

    const headers = existingCartId ? context.cart.setCartId(existingCartId) : new Headers();
    headers.append('Set-Cookie', await session.commit());

    return redirect(loginUrl, { headers });
  }

  // 2. Fetch current Cart from Hydrogen
  let cartId = await context.cart.getCartId();
  console.log('[CHECKOUT DIAGNOSTIC] cartId:', cartId);

  let cartResult: any = null;
  if (cartId) {
    const res = await storefront.query(
      `#graphql
      query checkoutCart($cartId: ID!, $language: LanguageCode, $country: CountryCode)
        @inContext(language: $language, country: $country) {
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
    `,
      {
        variables: {
          cartId,
          language: storefront.i18n.language,
          country: storefront.i18n.country,
        },
        cache: storefront.CacheNone(),
      },
    );
    cartResult = res?.cart;
  }

  // Fallback Auto-Restoration: If cart is empty or missing, but backup lines exist in session (from pre-login step)
  const backupLinesStr = await session.get('backupCartLines');
  if ((!cartResult || !cartResult.lines?.nodes?.length) && backupLinesStr) {
    try {
      const backupLines = JSON.parse(backupLinesStr);
      if (Array.isArray(backupLines) && backupLines.length > 0) {
        console.log('[CHECKOUT RESTORE] Restoring cart from backup lines before checkout:', backupLines);
        const restoreRes = await context.cart.create({ lines: backupLines });
        if (restoreRes?.cart?.id) {
          cartId = restoreRes.cart.id;
          const reQuery = await storefront.query(
            `#graphql
            query checkoutCart($cartId: ID!, $language: LanguageCode, $country: CountryCode)
              @inContext(language: $language, country: $country) {
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
          `,
            {
              variables: {
                cartId,
                language: storefront.i18n.language,
                country: storefront.i18n.country,
              },
              cache: storefront.CacheNone(),
            },
          );
          cartResult = reQuery?.cart;
        }
      }
    } catch (restoreErr) {
      console.error('[CHECKOUT RESTORE ERROR]', restoreErr);
    }
  }

  const cart = cartResult;

  if (!cart || !cart.lines?.nodes?.length) {
    console.log(
      '[CHECKOUT DIAGNOSTIC] Redirecting to cart: cart is null or empty',
    );
    return redirect(lang === 'en' ? '/en/cart' : '/cart');
  }

  // Associate customerAccessToken, email & phone with Cart Buyer Identity so Shopify Checkout recognizes logged-in customer
  const loginEmail = await session.get('loginCustomerEmail');
  const loginPhone = await session.get('loginOtpPhone');
  const tokenString = typeof customerAccessToken === 'string'
    ? customerAccessToken
    : (customerAccessToken as any)?.accessToken;

  const buyerIdentity: any = {};

  if (tokenString && typeof tokenString === 'string' && !tokenString.startsWith('session-')) {
    buyerIdentity.customerAccessToken = tokenString;
  }

  if (loginEmail && typeof loginEmail === 'string' && !loginEmail.endsWith('@saadeddin.placeholder')) {
    buyerIdentity.email = loginEmail;
  }

  if (loginPhone) {
    const formattedPhone = String(loginPhone).startsWith('+')
      ? String(loginPhone)
      : `+${loginPhone}`;
    buyerIdentity.phone = formattedPhone;
  }

  if (Object.keys(buyerIdentity).length > 0) {
    try {
      const updateResult: any = await context.cart.updateBuyerIdentity(buyerIdentity);
      console.log(
        '[CHECKOUT DIAGNOSTIC] cartBuyerIdentityUpdate result:',
        JSON.stringify(updateResult, null, 2),
      );

      const userErrors = (updateResult as any)?.cartBuyerIdentityUpdate?.userErrors || (updateResult as any)?.userErrors || [];
      const hasInvalidCustomerToken = userErrors.some(
        (err: any) =>
          err.message?.toLowerCase().includes('customer') ||
          err.field?.includes('customerAccessToken'),
      );

      if (hasInvalidCustomerToken && buyerIdentity.customerAccessToken) {
        console.warn(
          '[CHECKOUT DIAGNOSTIC] customerAccessToken rejected by Shopify as invalid. Unsetting session token and retrying with email/phone only...',
        );
        delete buyerIdentity.customerAccessToken;
        session.unset('customerAccessToken');
        await context.cart.updateBuyerIdentity(buyerIdentity);
      }
    } catch (err: any) {
      console.error(
        '[CHECKOUT DIAGNOSTIC] Failed to update cart buyer identity:',
        err?.message || err,
      );
    }
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
    {key: 'Branch', value: getAttr('Branch', sessionBranch)},
    {key: 'Branch ID', value: getAttr('Branch ID', sessionBranchId)},
    {
      key: 'Fulfillment Type',
      value: getAttr(
        'Fulfillment Type',
        sessionFulfillmentType === 'pickup' ? 'Pickup' : 'Delivery',
      ),
    },
  ];

  const customBranchVal =
    getAttr('custom.branch_id', sessionCustomBranchId) ||
    getAttr('branch_id', sessionCustomBranchId);
  if (customBranchVal) {
    finalAttributes.push({key: 'custom.branch_id', value: customBranchVal});
    finalAttributes.push({key: 'branch_id', value: customBranchVal});
  }

  const customAxStoreVal =
    getAttr('custom.ax_store_id', sessionAxStoreId) ||
    getAttr('ax_store_id', sessionAxStoreId) ||
    getAttr('AX Store ID', sessionAxStoreId);
  if (customAxStoreVal) {
    finalAttributes.push({key: 'custom.ax_store_id', value: customAxStoreVal});
    finalAttributes.push({key: 'ax_store_id', value: customAxStoreVal});
    finalAttributes.push({key: 'AX Store ID', value: customAxStoreVal});
  }

  const deliveryDateVal = getAttr('delivery_date', sessionDate);
  if (deliveryDateVal) {
    finalAttributes.push({key: 'delivery_date', value: deliveryDateVal});
  }

  const timeSlotVal = getAttr('Time Slot', sessionTimeSlot);
  if (timeSlotVal) {
    finalAttributes.push({key: 'Time Slot', value: timeSlotVal});
  }

  // Preserve any other attributes (like loyalty_points)
  rawAttributes.forEach((attr: any) => {
    if (!finalAttributes.find((f) => f.key === attr.key)) {
      finalAttributes.push({key: attr.key, value: attr.value || ''});
    }
  });

  // 4. Update the cart attributes and cart note on Shopify server
  try {
    await context.cart.updateAttributes(finalAttributes);
  } catch (err) {
    console.error('[CHECKOUT] Attributes update failed:', err);
  }

  // Format plaintext note block for fallback — used only in URL query params, NOT written to Shopify cart note
  const branchName = finalAttributes.find(
    (a: any) => a.key === 'Branch',
  )?.value;
  const branchId = finalAttributes.find(
    (a: any) => a.key === 'Branch ID',
  )?.value;
  const fulfillmentType = finalAttributes.find(
    (a: any) => a.key === 'Fulfillment Type',
  )?.value;
  const isPickup = fulfillmentType?.toLowerCase() === 'pickup';

  const branchNoteBlock = `[Fulfillment: ${fulfillmentType || 'Delivery'}, Branch: ${branchName || 'N/A'}, Branch ID: ${branchId || 'N/A'}, custom.branch_id: ${customBranchVal || 'N/A'}, custom.ax_store_id: ${customAxStoreVal || 'N/A'}, delivery_date: ${deliveryDateVal || 'N/A'}, Time Slot: ${timeSlotVal || 'N/A'}]`;

  // Only pass the customer-written note — do NOT modify the Shopify cart note with internal metadata
  const customerNote = (cart.note || '')
    .replace(/\[Fulfillment:[^\]]*\]/g, '')
    .trim();

  const isBypassToken = customToken === 'dev-bypass-token';

  let profile: {name?: string; phone?: string} = {};
  if (isBypassToken) {
    profile = {name: 'Dev Bypass User', phone: '966501111111'};
  } else if (customToken) {
    const api = new SaadeddinApi(env, customToken);
    try {
      profile = await api.getProfile();
    } catch (e) {
      console.warn(
        '[CHECKOUT] getProfile failed, continuing checkout gracefully:',
        e,
      );
    }
  }

  const pointsAttr = finalAttributes.find(
    (a: any) => a.key === 'loyalty_points',
  )?.value;
  const pointsToRedeem = pointsAttr ? parseInt(pointsAttr) : undefined;

  const payload = {
    cart: {
      subtotal: parseFloat(cart.cost.subtotalAmount.amount),
      items: cart.lines.nodes.map((line: any) => ({
        id: line.merchandise.sku || line.merchandise.id,
        name: line.merchandise.product.title,
        price: parseFloat(line.merchandise.price.amount),
        quantity: line.quantity,
      })),
    },
    phone: profile.phone,
    customerName: profile.name,
    pointsToRedeem,
    deliveryType: isPickup ? 'Pick Up' : 'Delivery',
    branchId: customBranchVal || branchId || '',
    axStoreId: customAxStoreVal || '',
    noteAttributes: finalAttributes.map((a: any) => ({
      name: a.key,
      value: a.key === 'Time Slot' ? extractMinTime(a.value) : a.value,
    })),
    attributes: finalAttributes.map((a: any) => ({
      key: a.key,
      value: a.key === 'Time Slot' ? extractMinTime(a.value) : a.value,
    })),
    timeSlotMin: extractMinTime(timeSlotVal),
    idempotencyKey: `order-${Date.now()}`,
  };

  try {
    let checkoutUrl = cart.checkoutUrl;
    if (checkoutUrl) {
      const urlObj = new URL(checkoutUrl);
      urlObj.searchParams.set('locale', lang);
      if (finalAttributes.length > 0) {
        finalAttributes.forEach((attr: any) => {
          if (attr.key && attr.value) {
            urlObj.searchParams.set(`attributes[${attr.key}]`, attr.value);
            urlObj.searchParams.set(`note_attributes[${attr.key}]`, attr.value);
          }
        });
      }

      // Check if current branch & selected delivery time slot qualify for promo free delivery
      let isPromoFreeDelivery = false;
      try {
        const {getAdminToken, getAdminDomain} = await import('~/lib/shopify-admin.server');
        const shopDomain = getAdminDomain(env);
        const adminToken = await getAdminToken(env);
        if (shopDomain && adminToken) {
          const locRes = await fetch(`https://${shopDomain}/admin/api/2024-10/graphql.json`, {
            method: 'POST',
            headers: {
              'X-Shopify-Access-Token': adminToken,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: `{
                locations(first: 250) {
                  nodes {
                    id
                    name
                    metafields(first: 50) {
                      nodes { key namespace value }
                    }
                  }
                }
              }`
            }),
          });
          const locData = (await locRes.json()) as any;
          const adminLocs = locData?.data?.locations?.nodes || [];
          const matchedLoc = adminLocs.find((l: any) => {
            const locNumId = String(l.id || '').split('/').pop();
            const targetNumId = String(branchId || '').split('/').pop();
            return (targetNumId && locNumId === targetNumId) || (branchName && l.name?.toLowerCase().trim() === branchName.toLowerCase().trim());
          });
          if (matchedLoc) {
            const {checkBranchFreeDeliveryInterval} = await import('~/components/DeliveryPickupModal');
            const promoResult = checkBranchFreeDeliveryInterval(matchedLoc, timeSlotVal);
            isPromoFreeDelivery = promoResult.isPromoFreeDelivery;
          }
        }
      } catch (promoErr) {
        console.error('[CHECKOUT INITIATE] Promo check error:', promoErr);
      }

      const hasFreeShippingCode = cart?.discountCodes?.some((d: any) => d.code?.toLowerCase() === 'freeshipping') || false;
      if (isPromoFreeDelivery || hasFreeShippingCode) {
        urlObj.searchParams.set('discount', 'freeshipping');
      }

      // Build the order note: customer's written note + internal metadata block
      // The metadata block is only passed via the URL — it is NOT stored in the Shopify cart note
      const urlNote = customerNote
        ? `${customerNote}\n\n${branchNoteBlock}`
        : branchNoteBlock;
      urlObj.searchParams.set('note', urlNote);
      checkoutUrl = urlObj.toString();
    }

    if (checkoutUrl) {
      console.log('[CHECKOUT DIAGNOSTIC SUCCESS] Redirecting to Shopify Checkout URL:', checkoutUrl);
      console.log('====================================================\n');
      // Store backup of cart lines in session in case Shopify locks/clears cart on checkout
      const backupLines = cart.lines.nodes.map((line: any) => ({
        merchandiseId: line.merchandise.id,
        quantity: line.quantity,
      }));
      session.set('backupCartLines', JSON.stringify(backupLines));

      const existingCartId = cart.id || (await context.cart.getCartId());
      const headers = existingCartId ? context.cart.setCartId(existingCartId) : new Headers();
      headers.append('Set-Cookie', await session.commit());

      return redirect(checkoutUrl, { headers });
    }
    console.log('[CHECKOUT DIAGNOSTIC FAIL] No checkoutUrl available, redirecting back to cart');
    console.log('====================================================\n');
    return redirect(lang === 'en' ? '/en/cart' : '/cart');
  } catch (error: any) {
    console.error('[CHECKOUT DIAGNOSTIC CATCH ERROR]', error);
    console.log('====================================================\n');
    return redirect(lang === 'en' ? `/en/cart` : `/cart`);
  }
}
