import {useLoaderData, data, type HeadersFunction} from 'react-router';
import type {Route} from './+types/($locale).cart';
import type {CartQueryDataReturn} from '@shopify/hydrogen';
import {CartForm} from '@shopify/hydrogen';
import {CartMain} from '~/components/CartMain';
import {getShopTitle} from '~/lib/seo';

export const meta: Route.MetaFunction = ({matches}) => {
  return [{title: getShopTitle('Cart', matches)}];
};

export const headers: HeadersFunction = ({actionHeaders, loaderHeaders}) => {
  return {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    ...actionHeaders,
  };
};

export async function action({request, context}: Route.ActionArgs) {
  const {cart} = context;
  const isEn = context.storefront.i18n.language === 'EN';

  try {
    const formData = await request.formData();
  console.log('[CART POST] Received action to /cart. FormData keys:', Array.from(formData.keys()));
  
  const rawInput = formData.get('cartFormInput');
  console.log('[CART POST] raw cartFormInput:', rawInput);

  const {action: rawAction, inputs: rawInputs} = CartForm.getFormInput(formData);
  const action = rawAction as any;
  const inputs = rawInputs as any;
  console.log('[CART POST] Parsed action:', action);

  if (!action) {
    throw new Error('No action provided');
  }

  let status = 200;
  let result: any = null;

  // Helper: retry a cart mutation up to `maxRetries` times with exponential backoff
  // when Shopify returns a throttle error.
  async function withRetry<T>(fn: () => Promise<T>, maxRetries = 4): Promise<T> {
    let lastError: any;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const res = await fn();
        
        // Check for throttle errors in resolved GraphQL response
        const hasThrottleError = 
          (res && typeof res === 'object' && Array.isArray((res as any).errors) && 
            (res as any).errors.some((e: any) => e?.message && String(e.message).toLowerCase().includes('throttled'))) ||
          (res && typeof res === 'object' && Array.isArray((res as any).userErrors) && 
            (res as any).userErrors.some((e: any) => e?.message && String(e.message).toLowerCase().includes('throttled')));
            
        if (hasThrottleError) {
          console.warn(`[CART] Mutation attempt ${attempt + 1}/${maxRetries} resolved with throttle errors. Throwing to retry...`);
          throw new Error('Throttled');
        }
        
        return res;
      } catch (err: any) {
        lastError = err;
        
        // Robust throttle detection
        const errStr = String(err).toLowerCase();
        let isThrottled = errStr.includes('throttled') || err?.status === 429;
        
        if (err && typeof err === 'object') {
          if (err.message && String(err.message).toLowerCase().includes('throttled')) {
            isThrottled = true;
          }
          if (Array.isArray(err.errors)) {
            isThrottled = isThrottled || err.errors.some((e: any) => e?.message && String(e.message).toLowerCase().includes('throttled'));
          }
          if (Array.isArray(err.graphQLErrors)) {
            isThrottled = isThrottled || err.graphQLErrors.some((e: any) => e?.message && String(e.message).toLowerCase().includes('throttled'));
          }
        }

        console.warn(`[CART] Mutation attempt ${attempt + 1}/${maxRetries} failed. isThrottled: ${isThrottled}. Error:`, err?.message || err);
        
        if (!isThrottled || attempt >= maxRetries - 1) {
          throw err;
        }
        
        // Exponential backoff: 500ms, 1500ms, 4500ms …
        const delay = 500 * Math.pow(3, attempt);
        console.warn(`[CART] Throttled by Shopify, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw lastError;
  }



  switch (action) {
    case CartForm.ACTIONS.LinesAdd:
      result = await withRetry(() => cart.addLines(inputs.lines));
      break;
    case CartForm.ACTIONS.LinesUpdate:
      result = await withRetry(() => cart.updateLines(inputs.lines));
      break;
    case CartForm.ACTIONS.LinesRemove:
      result = await withRetry(() => cart.removeLines(inputs.lineIds));
      break;
    case 'LoyaltyUpdate':
    case 'CustomLoyaltyUpdate': {
      const isEn = context.storefront.i18n.language === 'EN';
      const pointsToRedeem = parseInt(inputs.points) || 0;
      const intent = inputs.intent;

      const currentCart = await cart.get();
      if (!currentCart) {
        return data({ error: 'Cart not found' }, { status: 400 });
      }

      // Verify User Identity
      const customerAccessToken = await context.session.get('customerAccessToken');
      const loginOtpPhone = await context.session.get('loginOtpPhone');
      
      let phone = loginOtpPhone;
      if (!phone && customerAccessToken?.accessToken) {
        const customerRes = await context.storefront.query(`#graphql
          query getCustomerPhone($customerAccessToken: String!) {
            customer(customerAccessToken: $customerAccessToken) { phone email }
          }
        `, { variables: { customerAccessToken: customerAccessToken.accessToken }, cache: context.storefront.CacheNone() });
        phone = customerRes?.customer?.phone;
        if (!phone && customerRes?.customer?.email?.includes('@saadeddin.dev')) {
          phone = customerRes.customer.email.split('@')[0];
        }
      }

      if (!phone) {
        return data({ error: isEn ? 'User not authenticated' : 'غير مسجل دخول' }, { status: 401 });
      }

      const rawPhone = phone.replace(/\s+/g, '');

      if (intent === 'remove' || pointsToRedeem === 0) {
        const appliedCode = currentCart.discountCodes?.find(dc => dc.code.startsWith('LOYALTY-'))?.code;
        let discountCodes = currentCart.discountCodes?.map(dc => dc.code) || [];
        if (appliedCode) {
          discountCodes = discountCodes.filter(c => c !== appliedCode);
        }

        await cart.updateDiscountCodes(discountCodes);
        result = await cart.updateAttributes([{ key: 'loyalty_points', value: '0' }]);
        break;
      }

      // Validate availability from the mock registry
      const { getMockPoints } = await import('~/lib/mock-loyalty.server');
      const availablePoints = getMockPoints(rawPhone);
      if (pointsToRedeem > availablePoints) {
        return data({ error: isEn ? `Insufficient points.` : `نقاط غير كافية.` }, { status: 400 });
      }

      const cartSubtotal = parseFloat(currentCart.cost?.subtotalAmount?.amount || '0');
      const pointsToCurrencyRatio = 0.01;
      const discountAmount = pointsToRedeem * pointsToCurrencyRatio;

      if (discountAmount > cartSubtotal && cartSubtotal > 0) {
        return data({ error: isEn ? `Cannot exceed cart total.` : `لا يمكن تجاوز إجمالي السلة.` }, { status: 400 });
      }

      // Generate Shopify Discount Code
      let generatedCode = '';
      let middlewareSucceeded = false;
      const branchId = currentCart.attributes?.find((a: any) => a.key.toLowerCase().trim() === 'branch id')?.value || '1';
      const middlewareUrl = context.env.MIDDLEWARE_URL || 'https://wh.pryvexapls.com';

      console.log('[LOYALTY_MIDDLEWARE] Attempting apply via middleware with branch:', branchId);
      try {
        const mwRes = await fetch(`${middlewareUrl}/api/v1/cart/loyalty/apply`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${customerAccessToken?.accessToken || ''}`,
            'x-branch-id': branchId
          },
          body: JSON.stringify({ pointsToRedeem })
        });

        console.log('[LOYALTY_MIDDLEWARE] Status:', mwRes.status);
        const responseText = await mwRes.text();
        console.log('[LOYALTY_MIDDLEWARE] Body:', responseText);

        if (mwRes.ok) {
          const mwData = JSON.parse(responseText) as any;
          const code = mwData?.code || mwData?.discountCode || mwData?.discount_code || mwData?.data?.code || mwData?.data?.discountCode || mwData?.data?.discount_code;
          if (code) {
            generatedCode = code;
            middlewareSucceeded = true;
            console.log('[LOYALTY_MIDDLEWARE] Successfully applied via middleware. Generated code:', generatedCode);
          } else if (mwData?.success === true || mwData?.status === 'success') {
            middlewareSucceeded = true;
            console.log('[LOYALTY_MIDDLEWARE] Success reported by middleware (no explicit code returned).');
          }
        }
      } catch (err: any) {
        console.warn('[LOYALTY_MIDDLEWARE] Middleware apply request failed:', err.message);
      }

      if (!middlewareSucceeded) {
        console.log('[LOYALTY_MIDDLEWARE] Falling back to local Admin API discount generation...');
        try {
          const { getAdminToken } = await import('~/lib/shopify-admin.server');
          const adminToken = await getAdminToken(context.env);
          const adminDomain = context.env.SHOPIFY_SHOP ? `${context.env.SHOPIFY_SHOP.replace('.myshopify.com', '')}.myshopify.com` : context.env.PUBLIC_STORE_DOMAIN;
          
          const priceRulePayload = {
            price_rule: {
              title: `Loyalty Redemption: ${pointsToRedeem} Points`,
              target_type: "line_item",
              target_selection: "all",
              allocation_method: "across",
              value_type: "fixed_amount",
              value: `-${discountAmount.toFixed(2)}`,
              customer_selection: "all",
              starts_at: new Date(Date.now() - 5 * 60000).toISOString()
            }
          };

          const prRes = await fetch(`https://${adminDomain}/admin/api/2023-04/price_rules.json`, {
            method: 'POST',
            headers: { 'X-Shopify-Access-Token': adminToken, 'Content-Type': 'application/json' },
            body: JSON.stringify(priceRulePayload)
          });
          
          if (!prRes.ok) {
            const errText = await prRes.text();
            console.error('[LOYALTY_UPDATE] Price Rule API failed:', prRes.status, errText);
            console.warn('[LOYALTY_UPDATE] Falling back to mock discount code due to Admin API failure.');
            generatedCode = `LOYALTY-${pointsToRedeem}-MOCK`;
          } else {
            const prData = await prRes.json() as any;
            const priceRuleId = prData.price_rule.id;

            generatedCode = `LOYALTY-${pointsToRedeem}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
            const dcPayload = { discount_code: { code: generatedCode } };

            const dcRes = await fetch(`https://${adminDomain}/admin/api/2023-04/price_rules/${priceRuleId}/discount_codes.json`, {
              method: 'POST',
              headers: { 'X-Shopify-Access-Token': adminToken, 'Content-Type': 'application/json' },
              body: JSON.stringify(dcPayload)
            });

            if (!dcRes.ok) {
              const errText = await dcRes.text();
              console.error('[LOYALTY_UPDATE] Discount Code API failed:', dcRes.status, errText);
              console.warn('[LOYALTY_UPDATE] Falling back to mock discount code due to Admin API failure.');
              generatedCode = `LOYALTY-${pointsToRedeem}-MOCK`;
            }
          }
        } catch (e: any) {
          console.error('[LOYALTY_UPDATE] Internal exception:', e.message, e.stack);
          console.warn('[LOYALTY_UPDATE] Falling back to mock discount code due to internal exception.');
          generatedCode = `LOYALTY-${pointsToRedeem}-MOCK`;
        }
      }


      const existingCodes = currentCart.discountCodes?.map(dc => dc.code).filter(c => !c.startsWith('LOYALTY-')) || [];
      const newCodes = [...existingCodes, generatedCode];

      await cart.updateDiscountCodes(newCodes);
      result = (await cart.updateAttributes([{ key: 'loyalty_points', value: String(pointsToRedeem) }])) as any;
      break;
    }
    case CartForm.ACTIONS.DiscountCodesUpdate: {
      const formDiscountCode = inputs.discountCode;
      const isEn = context.storefront.i18n.language === 'EN';

      if (formDiscountCode) {
        try {
          const { getAdminToken } = await import('~/lib/shopify-admin.server');
          const adminToken = await getAdminToken(context.env);
          const shopDomain = context.env.PUBLIC_STORE_DOMAIN;

          // 1. Lookup the discount code to get the price_rule_id
          const lookupRes = await fetch(`https://${shopDomain}/admin/api/2024-01/discount_codes/lookup.json?code=${encodeURIComponent(formDiscountCode)}`, {
            headers: { 'X-Shopify-Access-Token': adminToken }
          });
          const lookupJson = await lookupRes.json() as any;
          
          if (lookupRes.status === 303 || lookupRes.status === 200) {
            // Shopify lookup redirects (303) to the actual discount code URL. Fetch handles redirects automatically,
            // so we actually get the discount_code object back!
            const priceRuleId = lookupJson?.discount_code?.price_rule_id;

            if (priceRuleId) {
              // 2. Get Price Rule Details
              const prRes = await fetch(`https://${shopDomain}/admin/api/2024-01/price_rules/${priceRuleId}.json`, {
                headers: { 'X-Shopify-Access-Token': adminToken }
              });
              const prJson = await prRes.json() as any;
              const priceRule = prJson?.price_rule;

              // 3. Get Custom Discount Rules from Shop Metafield
              const sRes = await fetch(`https://${shopDomain}/admin/api/2024-01/graphql.json`, {
                method: 'POST',
                headers: { 'X-Shopify-Access-Token': adminToken, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  query: `query { shop { metafield(namespace: "custom", key: "discount_rules") { value } } }`
                })
              });
              const sData = await sRes.json() as any;
              let customRules: any = {};
              if (sData?.data?.shop?.metafield?.value) {
                try { customRules = JSON.parse(sData.data.shop.metafield.value); } catch (e) {}
              }
              const rule = customRules[formDiscountCode.toUpperCase()] || {};

              if (priceRule) {
                const currentCart = await cart.get();
                const cartLines = currentCart?.lines?.nodes || [];
                const cartAttributes = currentCart?.attributes || [];

                // 0) Block Discount if cart contains a BOGO (Free) item
                const hasBogoItem = cartLines.some((line: any) => 
                  line.attributes?.some((attr: any) => attr.key === '_is_free' && attr.value === 'true')
                );
                
                if (hasBogoItem) {
                  return data({ error: isEn ? 'Promotional codes cannot be used with BOGO offers.' : 'لا يمكن استخدام أكواد الخصم مع عروض المنتجات المجانية.' }, { status: 400 });
                }

                // 1) Product Selection Validation
                if (priceRule.target_selection === 'entitled' && priceRule.entitled_product_ids?.length > 0) {
                  const productIds = priceRule.entitled_product_ids.map(String);
                  const hasTargetProduct = cartLines.some((line: any) => {
                    const prodId = line.merchandise?.product?.id?.split('/').pop();
                    return productIds.includes(String(prodId));
                  });
                  if (!hasTargetProduct) {
                    return data({ error: isEn ? 'This discount code requires specific products to be in your cart.' : 'هذا الكود يتطلب منتجات محددة في سلتك.' }, { status: 400 });
                  }
                }

                // 2) Customer Selection & Tag Validation
                const customerAccessToken = await context.session.get('customerAccessToken');
                const targetTag = rule.target_tag;
                const targetBranch = rule.target_branch;
                const targetOrderType = rule.order_type;

                if (priceRule.customer_selection === 'prerequisite' || targetTag) {
                  if (!customerAccessToken?.accessToken) {
                    return data({ error: isEn ? 'You must be logged in to apply this discount.' : 'يجب عليك تسجيل الدخول لتطبيق هذا الخصم.' }, { status: 400 });
                  }

                  const customerRes = await context.storefront.query(`#graphql
                    query getCartCustomerDetails($customerAccessToken: String!) {
                      customer(customerAccessToken: $customerAccessToken) {
                        id
                        email
                        tags
                      }
                    }
                  `, {
                    variables: { customerAccessToken: customerAccessToken.accessToken },
                    cache: context.storefront.CacheNone()
                  });
                  const customer = customerRes?.customer;

                  if (!customer) {
                    return data({ error: isEn ? 'Unable to verify customer account.' : 'عذراً، لم نتمكن من التحقق من حسابك.' }, { status: 400 });
                  }

                  // Verify customer ID
                  if (priceRule.customer_selection === 'prerequisite' && priceRule.prerequisite_customer_ids?.length > 0) {
                    const prerequisiteIds = priceRule.prerequisite_customer_ids.map(String);
                    const custId = customer.id.split('/').pop();
                    if (!prerequisiteIds.includes(String(custId))) {
                      return data({ error: isEn ? 'This discount code is not valid for your account.' : 'كود الخصم هذا غير صالح لحسابك.' }, { status: 400 });
                    }
                  }

                  // Verify customer tag
                  if (targetTag) {
                    const hasTag = customer.tags?.some((t: string) => t.trim().toLowerCase() === targetTag.trim().toLowerCase());
                    if (!hasTag) {
                      return data({ error: isEn ? `This discount code is only for ${targetTag} members.` : `كود الخصم هذا مخصص لأعضاء ${targetTag} فقط.` }, { status: 400 });
                    }
                  }
                }

                // 3) Branch restriction
                if (targetBranch) {
                  const selectedBranchId = cartAttributes.find((a: any) => a.key.toLowerCase().trim() === 'branch id')?.value;
                  if (selectedBranchId !== targetBranch) {
                    return data({ error: isEn ? 'This discount is not available for the selected branch.' : 'هذا الخصم غير متاح للفرع المحدد.' }, { status: 400 });
                  }
                }

                // 4) Order Type restriction (Pickup vs Delivery)
                if (targetOrderType) {
                  const fulfillmentType = cartAttributes.find((a: any) => a.key.toLowerCase().trim() === 'fulfillment type')?.value;
                  // If fulfillment type is not set, default is DELIVERY because of the fee
                  const safeFulfillmentType = fulfillmentType ? fulfillmentType.trim().toUpperCase() : 'DELIVERY';
                  if (safeFulfillmentType !== targetOrderType.trim().toUpperCase()) {
                    return data({ error: isEn ? `This discount is only valid for ${targetOrderType.toLowerCase()} orders.` : `هذا الخصم صالح لطلبات الـ ${targetOrderType === 'DELIVERY' ? 'توصيل' : 'استلام'} فقط.` }, { status: 400 });
                  }
                }
              }
            }
          }
        } catch (err) {
          console.error('[CART DISCOUNT VALIDATION ERROR]', err);
        }
      }

      if (formDiscountCode) {
        // --- START MIDDLEWARE VOUCHER VALIDATION ---
        try {
          const currentCart = await cart.get();
          const cartTotal = parseFloat(currentCart?.cost?.subtotalAmount?.amount || '0');
          const cartLines = currentCart?.lines?.nodes || [];
          const cartAttributes = currentCart?.attributes || [];
          
          // PRODUCTION: Call the actual Middleware
          // TODO: Replace with the actual Middleware URL provided by the backend developer
          const middlewareUrl = context.env.MIDDLEWARE_URL || 'https://wh.pryvexapls.com';
          const customerAccessToken = await context.session.get('customerAccessToken');
          
          // Format cart items for the middleware
          const formattedItems = cartLines.map((line: any) => ({
            id: line.merchandise?.product?.id?.split('/').pop(),
            quantity: line.quantity,
            price: line.cost?.totalAmount?.amount
          }));

          const fulfillmentType = cartAttributes.find((a: any) => a.key.toLowerCase().trim() === 'fulfillment type')?.value;
          const safeFulfillmentType = fulfillmentType ? fulfillmentType.trim().toUpperCase() : 'DELIVERY';
          const branchId = cartAttributes.find((a: any) => a.key.toLowerCase().trim() === 'branch id')?.value;

          const validationRes = await fetch(`${middlewareUrl}/wallet/voucher/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code: formDiscountCode,
              cartTotal: cartTotal,
              items: formattedItems,
              user_id: customerAccessToken?.accessToken || null,
              order_type: safeFulfillmentType === 'DELIVERY' ? 'delivery' : 'pickup',
              branch_id: branchId || null
            })
          });
          const validationData = await validationRes.json() as any;
          
          if (validationData.error) {
             // Map backend error codes to frontend messages
             const code = validationData.error.code || validationData.error;
             if (code === 'expired') return data({ error: isEn ? 'This voucher has expired.' : 'عذراً، انتهت صلاحية هذه القسيمة.' }, { status: 400 });
             if (code === 'min_order_not_met') return data({ error: isEn ? 'Minimum order value not met.' : 'لم يتم الوصول للحد الأدنى للطلب.' }, { status: 400 });
             if (code === 'already_used') return data({ error: isEn ? 'Voucher usage limit reached.' : 'تم الوصول للحد الأقصى لاستخدام القسيمة.' }, { status: 400 });
             if (code === 'invalid_products') return data({ error: isEn ? 'This voucher is not valid for the products in your cart.' : 'هذه القسيمة غير صالحة للمنتجات الموجودة في سلتك.' }, { status: 400 });
             if (code === 'invalid_user') return data({ error: isEn ? 'This voucher is not valid for your account.' : 'هذه القسيمة غير صالحة لحسابك.' }, { status: 400 });
             if (code === 'invalid_order_type') return data({ error: isEn ? 'This voucher is not valid for your selected order type.' : 'هذه القسيمة غير صالحة لنوع الطلب المحدد.' }, { status: 400 });
             if (code === 'invalid_branch') return data({ error: isEn ? 'This voucher is not available for your selected branch.' : 'هذه القسيمة غير متاحة للفرع المحدد.' }, { status: 400 });
             return data({ error: isEn ? 'Invalid voucher code.' : 'رمز القسيمة غير صحيح.' }, { status: 400 });
          }
        } catch (err) {
          console.error('[MIDDLEWARE VOUCHER VALIDATION ERROR]', err);
        }
        // --- END MIDDLEWARE VOUCHER VALIDATION ---
      }

      // User inputted discount code
      const discountCodes = (
        formDiscountCode ? [formDiscountCode] : []
      ) as string[];

      // Combine discount codes already applied on cart
      discountCodes.push(...inputs.discountCodes);

      result = await cart.updateDiscountCodes(discountCodes);
      break;
    }
    case CartForm.ACTIONS.GiftCardCodesUpdate: {
      const formGiftCardCode = inputs.giftCardCode;

      const giftCardCodes = (
        formGiftCardCode ? [formGiftCardCode] : []
      ) as string[];

      result = await cart.updateGiftCardCodes(giftCardCodes);
      break;
    }
    case CartForm.ACTIONS.GiftCardCodesRemove: {
      const appliedGiftCardIds = inputs.giftCardCodes as string[];
      result = await cart.removeGiftCardCodes(appliedGiftCardIds);
      break;
    }
    case CartForm.ACTIONS.BuyerIdentityUpdate: {
      result = await cart.updateBuyerIdentity({
        ...inputs.buyerIdentity,
      });
      break;
    }
    case 'NoteUpdate':
    case CartForm.ACTIONS.NoteUpdate: {
      result = await cart.updateNote(inputs.note);
      break;
    }
    case 'AttributesUpdate': {
        const raw = inputs.attributes;
        const updates = (Array.isArray(raw) ? raw : Object.values(raw || {})) as any[];
        
        // Mirror delivery_date and Time Slot to session storage
        const deliveryDateAttr = updates.find((a: any) => a.key === 'delivery_date');
        const timeSlotAttr = updates.find((a: any) => a.key === 'Time Slot');
        if (deliveryDateAttr) context.session.set('delivery_date', deliveryDateAttr.value);
        if (timeSlotAttr) context.session.set('Time Slot', timeSlotAttr.value);

        const currentCart = await cart.get();
        const existing = currentCart?.attributes || [];
        const mergedMap = new Map();
        existing.forEach((a: any) => { if (a.key) mergedMap.set(a.key, a.value); });
        updates.forEach((a: any) => { if (a.key) mergedMap.set(a.key, a.value); });
        const finalAttributes = Array.from(mergedMap.entries()).map(([key, value]) => ({
          key: String(key),
          value: String(value || '')
        }));
        result = await cart.updateAttributes(finalAttributes);
        break;
    }
    case 'FulfillmentUpdate': {
        const {attributes, buyerIdentity} = inputs;
        if (attributes) {
            const updates = (Array.isArray(attributes) ? attributes : Object.values(attributes || {})) as any[];
            const branchAttr = updates.find(a => a.key === 'Branch')?.value;
            const branchIdAttr = updates.find(a => a.key === 'Branch ID')?.value;
            const fTypeAttr = updates.find(a => a.key === 'Fulfillment Type')?.value;
            const axStoreIdAttr = updates.find(a => a.key === 'AX Store ID')?.value || updates.find(a => a.key === 'ax_store_id')?.value || updates.find(a => a.key === 'custom.ax_store_id')?.value;
            const customBranchIdAttr = updates.find(a => a.key === 'custom.branch_id')?.value || updates.find(a => a.key === 'branch_id')?.value;

            if (branchAttr) context.session.set('selectedLocationName', branchAttr);
            if (branchIdAttr) context.session.set('selectedLocationId', branchIdAttr);
            if (axStoreIdAttr) context.session.set('selectedAxStoreId', axStoreIdAttr);
            if (customBranchIdAttr) context.session.set('selectedCustomBranchId', customBranchIdAttr);
            if (fTypeAttr) {
                context.session.set('fulfillmentType', fTypeAttr.toLowerCase() === 'pickup' ? 'pickup' : 'delivery');
            }
            context.session.set('manualLocationSelection', 'true');

            const updatesList = updates as any[];
            const currentCart = await cart.get();
            const existing = currentCart?.attributes || [];
            const mergedMap = new Map();
            existing.forEach((a: any) => { if (a.key) mergedMap.set(a.key, a.value); });
            updatesList.forEach((a: any) => { if (a.key) mergedMap.set(a.key, a.value); });
            const finalAttributes = Array.from(mergedMap.entries()).map(([key, value]) => ({
              key: String(key),
              value: String(value || '')
            }));
            result = await cart.updateAttributes(finalAttributes);
        }
        if (buyerIdentity) {
            const customerAccessToken = await context.session.get('customerAccessToken');
            if (customerAccessToken?.accessToken) {
                buyerIdentity.customerAccessToken = customerAccessToken.accessToken;
            }
            
            if (buyerIdentity.deliveryAddressPreferences?.[0]?.deliveryAddress) {
                const addr = buyerIdentity.deliveryAddressPreferences[0].deliveryAddress;
                const addressName = addr.address1 || addr.address2;
                if (addressName) {
                    context.session.set('selectedAddressName', addressName);
                }
            }

            let innerResult: any = await cart.updateBuyerIdentity(buyerIdentity);

            // Check if the update failed due to Customer Invalid error
            const userErrors = (innerResult as any).cartBuyerIdentityUpdate?.userErrors || [];
            const isCustomerError = userErrors.some((err: any) => err.message === "Customer غير صالح" || err.message === "Customer is invalid" || err.field?.includes('customerAccessToken'));
            
            if (isCustomerError && buyerIdentity.customerAccessToken) {
                delete buyerIdentity.customerAccessToken;
                innerResult = await cart.updateBuyerIdentity(buyerIdentity);
            }
            
            if (innerResult?.errors?.length || innerResult?.userErrors?.length) {
                console.error('[CART BUYER IDENTITY ERROR]', innerResult.errors || innerResult.userErrors);
            }
            result = innerResult;
        } else if (!result) {
            result = await cart.get();
        }
        break;
    }
    default:
      throw new Error(`${action} cart action is not defined`);
  }

  const cartId = result?.cart?.id;
  const headers = cartId ? cart.setCartId(result?.cart?.id) : new Headers();
  
  if (context.session.isPending) {
    headers.append('Set-Cookie', await context.session.commit());
  }

  const {cart: cartResult, errors, warnings} = (result as any) || { cart: null, errors: [], warnings: [] };

  const redirectTo = formData.get('redirectTo') ?? null;
  if (typeof redirectTo === 'string') {
    status = 303;
    headers.set('Location', redirectTo);
  }

  return data(
    {
      cart: cartResult,
      errors,
      warnings,
      analytics: {
        cartId,
      },
    },
    {status, headers},
  );
  } catch (err: any) {
    console.error('[CART ACTION EXCEPTION]', err);
    const isThrottled = String(err).toLowerCase().includes('throttled') || err?.status === 429;
    const errMsg = isThrottled
      ? (isEn ? 'The shop is currently busy. Resetting session, please try again.' : 'المتجر مشغول حالياً. تم إعادة تعيين الجلسة، يرجى المحاولة مرة أخرى.')
      : (isEn ? 'An error occurred while updating the cart. Please try again.' : 'حدث خطأ أثناء تحديث السلة. يرجى المحاولة مرة أخرى.');
      
    // Auto-recovery: clear the throttled cart ID from the session so the next attempt starts fresh
    if (isThrottled) {
      context.session.set('cartId', '');
    }

    const headers = new Headers();
    if (context.session.isPending || isThrottled) {
      try {
        headers.append('Set-Cookie', await context.session.commit());
      } catch (e) {
        console.error('[CART] Failed to commit session on error:', e);
      }
    }
      
    return data(
      {
        cart: null,
        errors: [{ message: errMsg }],
        warnings: [],
        error: errMsg,
      },
      {
        status: isThrottled ? 429 : 400,
        headers,
      }
    );
  }
}

export async function loader({context}: Route.LoaderArgs) {
  const {cart} = context;
  try {
    return await cart.get();
  } catch (err) {
    console.error('Failed to get cart in cart loader:', err);
    return null;
  }
}

export default function Cart() {
  const cart = useLoaderData<typeof loader>();

  return <CartMain layout="page" cart={cart} />;
}

