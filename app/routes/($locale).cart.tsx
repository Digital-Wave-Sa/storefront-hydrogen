import {useLoaderData, data, type HeadersFunction} from 'react-router';
import type {Route} from './+types/cart';
import type {CartQueryDataReturn} from '@shopify/hydrogen';
import {CartForm} from '@shopify/hydrogen';
import {CartMain} from '~/components/CartMain';

export const meta: Route.MetaFunction = () => {
  return [{title: `Hydrogen | Cart`}];
};

export const headers: HeadersFunction = ({actionHeaders, loaderHeaders}) => {
  return {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    ...actionHeaders,
  };
};

export async function action({request, context}: Route.ActionArgs) {
  const {cart} = context;

  const formData = await request.formData();

  const {action, inputs} = CartForm.getFormInput(formData);

  if (!action) {
    throw new Error('No action provided');
  }

  let status = 200;
  let result: CartQueryDataReturn;

  switch (action) {
    case CartForm.ACTIONS.LinesAdd:
      result = await cart.addLines(inputs.lines);
      break;
    case CartForm.ACTIONS.LinesUpdate:
      result = await cart.updateLines(inputs.lines);
      break;
    case CartForm.ACTIONS.LinesRemove:
      result = await cart.removeLines(inputs.lineIds);
      break;
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
          const validationData = await validationRes.json();
          
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
        }
        if (buyerIdentity) {
            result = await cart.updateBuyerIdentity(buyerIdentity);
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
  const {cart: cartResult, errors, warnings} = result || { cart: null, errors: [], warnings: [] };

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
}

export async function loader({context}: Route.LoaderArgs) {
  const {cart} = context;
  return await cart.get();
}

export default function Cart() {
  const cart = useLoaderData<typeof loader>();

  return <CartMain layout="page" cart={cart} />;
}

