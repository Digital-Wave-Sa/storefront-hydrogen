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

export async function action({request, context, params}: Route.ActionArgs) {
  const {cart} = context;
  const url = new URL(request.url);
  const referer = request.headers.get('Referer') || '';
  const isEn = url.pathname.startsWith('/en') || referer.includes('/en/') || context.storefront.i18n.language === 'EN';

  try {
    const formData = await request.formData();
    console.log(
      '[CART POST] Received action to /cart. FormData keys:',
      Array.from(formData.keys()),
    );

    const rawInput = formData.get('cartFormInput');
    console.log('[CART POST] raw cartFormInput:', rawInput);

    const {action: rawAction, inputs: rawInputs} =
      CartForm.getFormInput(formData);
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
    async function withRetry<T>(
      fn: () => Promise<T>,
      maxRetries = 4,
    ): Promise<T> {
      let lastError: any;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const res = await fn();

          // Check for throttle errors in resolved GraphQL response
          const hasThrottleError =
            (res &&
              typeof res === 'object' &&
              Array.isArray((res as any).errors) &&
              (res as any).errors.some(
                (e: any) =>
                  e?.message &&
                  String(e.message).toLowerCase().includes('throttled'),
              )) ||
            (res &&
              typeof res === 'object' &&
              Array.isArray((res as any).userErrors) &&
              (res as any).userErrors.some(
                (e: any) =>
                  e?.message &&
                  String(e.message).toLowerCase().includes('throttled'),
              ));

          if (hasThrottleError) {
            console.warn(
              `[CART] Mutation attempt ${attempt + 1}/${maxRetries} resolved with throttle errors. Throwing to retry...`,
            );
            throw new Error('Throttled');
          }

          return res;
        } catch (err: any) {
          lastError = err;

          // Robust throttle detection
          const errStr = String(err).toLowerCase();
          let isThrottled = errStr.includes('throttled') || err?.status === 429;

          if (err && typeof err === 'object') {
            if (
              err.message &&
              String(err.message).toLowerCase().includes('throttled')
            ) {
              isThrottled = true;
            }
            if (Array.isArray(err.errors)) {
              isThrottled =
                isThrottled ||
                err.errors.some(
                  (e: any) =>
                    e?.message &&
                    String(e.message).toLowerCase().includes('throttled'),
                );
            }
            if (Array.isArray(err.graphQLErrors)) {
              isThrottled =
                isThrottled ||
                err.graphQLErrors.some(
                  (e: any) =>
                    e?.message &&
                    String(e.message).toLowerCase().includes('throttled'),
                );
            }
          }

          console.warn(
            `[CART] Mutation attempt ${attempt + 1}/${maxRetries} failed. isThrottled: ${isThrottled}. Error:`,
            err?.message || err,
          );

          if (!isThrottled || attempt >= maxRetries - 1) {
            throw err;
          }

          // Exponential backoff: 500ms, 1500ms, 4500ms …
          const delay = 500 * Math.pow(3, attempt);
          console.warn(
            `[CART] Throttled by Shopify, retrying in ${delay}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
      throw lastError;
    }

    switch (action) {
      case CartForm.ACTIONS.LinesAdd: {
        const cleanLines = (inputs.lines || []).map((line: any) => ({
          merchandiseId: line.merchandiseId,
          quantity: line.quantity || 1,
          ...(Array.isArray(line.attributes)
            ? {
                attributes: line.attributes
                  .filter((a: any) => a && a.key)
                  .map((a: any) => ({
                    key: String(a.key),
                    value: String(a.value ?? ''),
                  })),
              }
            : {}),
          ...(line.sellingPlanId ? {sellingPlanId: line.sellingPlanId} : {}),
        }));
        result = await withRetry(() => cart.addLines(cleanLines));
        console.log('[CART POST] addLines result:', JSON.stringify(result, null, 2));
        break;
      }
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
          return data({error: 'Cart not found'}, {status: 400});
        }

        if (intent === 'remove' || pointsToRedeem === 0) {
          const appliedCodes =
            currentCart.discountCodes?.filter(
              (dc) =>
                dc.code.startsWith('LOYAL-') || dc.code.startsWith('LOYALTY-'),
            ) || [];
          let discountCodes =
            currentCart.discountCodes?.map((dc) => dc.code) || [];
          if (appliedCodes.length > 0) {
            const codesToRemove = new Set(appliedCodes.map((c) => c.code));
            discountCodes = discountCodes.filter((c) => !codesToRemove.has(c));
          }

          await cart.updateDiscountCodes(discountCodes);
          result = (await cart.updateAttributes([
            {key: 'loyalty_points', value: '0'},
            {key: 'loyalty_code', value: ''},
          ])) as any;
          break;
        }

        const {redeemLoyaltyPoints} = await import('~/lib/loyalty.server');
        const redeemRes = await redeemLoyaltyPoints({
          points: pointsToRedeem,
          env: context.env,
          context,
        });

        if (!redeemRes.success || !redeemRes.discountCode) {
          return data(
            {
              error:
                redeemRes.error ||
                (isEn ? 'Failed to redeem points.' : 'فشل في استبدال النقاط.'),
            },
            {status: 400},
          );
        }

        const generatedCode = redeemRes.discountCode;

        const existingCodes =
          currentCart.discountCodes
            ?.map((dc) => dc.code)
            .filter(
              (c) => !c.startsWith('LOYAL-') && !c.startsWith('LOYALTY-'),
            ) || [];
        const newCodes = [...existingCodes, generatedCode];

        await cart.updateDiscountCodes(newCodes);
        result = (await cart.updateAttributes([
          {key: 'loyalty_points', value: String(pointsToRedeem)},
          {key: 'loyalty_code', value: generatedCode},
        ])) as any;
        break;
      }
      case CartForm.ACTIONS.DiscountCodesUpdate: {
        const formDiscountCode = inputs.discountCode;
        const isEn = context.storefront.i18n.language === 'EN';

        if (formDiscountCode) {
          const submittedCode = String(formDiscountCode).trim().toUpperCase();

          // --- LOCATION BASED DISCOUNT VALIDATION ---
          try {
            const { parseLocationDiscountsJSON, isDiscountValidForLocation } = await import('~/lib/discounts');
            let locationDiscountsData: any = null;
            try {
              const shopMetaRes = (await context.storefront.query(`#graphql
                query GetLocationDiscountsForCart {
                  shop {
                    locationDiscounts: metafield(namespace: "custom", key: "location_discounts") { value }
                    locationDiscountsAlt: metafield(namespace: "location", key: "discounts") { value }
                  }
                }
              `, { cache: context.storefront.CacheNone() })) as any;
              locationDiscountsData = shopMetaRes?.shop?.locationDiscounts?.value || shopMetaRes?.shop?.locationDiscountsAlt?.value || null;
            } catch (e) {}

            const locationDiscounts = parseLocationDiscountsJSON(locationDiscountsData);
            const matchedLocDiscount = locationDiscounts.find((d: any) => d.code?.toUpperCase() === submittedCode);

            if (matchedLocDiscount) {
              const currentCart = await cart.get();
              const cartAttributes = currentCart?.attributes || [];

              const selectedBranchId =
                cartAttributes.find((a: any) => ['branch id', 'branch_id', 'custom.branch_id'].includes(a.key.toLowerCase().trim()))?.value ||
                (await context.session.get('selectedLocationId')) ||
                '';

              const selectedCity =
                cartAttributes.find((a: any) => ['city', 'region'].includes(a.key.toLowerCase().trim()))?.value ||
                (await context.session.get('selectedCity')) ||
                '';

              const isValidLoc = isDiscountValidForLocation(matchedLocDiscount, selectedBranchId, selectedCity);

              if (!isValidLoc) {
                const selectedBranchName =
                  cartAttributes.find((a: any) => a.key.toLowerCase().trim() === 'branch')?.value ||
                  (await context.session.get('selectedLocationName')) ||
                  '';

                return data(
                  {
                    error: isEn
                      ? `Discount code "${submittedCode}" is only valid for its specific branch and cannot be used with ${selectedBranchName || 'your selected branch'}.`
                      : `كود الخصم "${submittedCode}" مخصص لفرع محدد ولا يمكن استخدامه مع ${selectedBranchName || 'الفرع الحالي'}.`,
                  },
                  {status: 400},
                );
              }
            }
          } catch (locErr) {
            console.error('[CART] Location discount check error:', locErr);
          }

          try {
            const {getAdminToken} = await import('~/lib/shopify-admin.server');
            const adminToken = await getAdminToken(context.env);
            const shopDomain = context.env.PUBLIC_STORE_DOMAIN;

            // 1. Lookup the discount code to get the price_rule_id
            const lookupRes = await fetch(
              `https://${shopDomain}/admin/api/2024-01/discount_codes/lookup.json?code=${encodeURIComponent(formDiscountCode)}`,
              {
                headers: {'X-Shopify-Access-Token': adminToken},
              },
            );
            const lookupJson = (await lookupRes.json()) as any;

            if (lookupRes.status === 303 || lookupRes.status === 200) {
              // Shopify lookup redirects (303) to the actual discount code URL. Fetch handles redirects automatically,
              // so we actually get the discount_code object back!
              const priceRuleId = lookupJson?.discount_code?.price_rule_id;

              if (priceRuleId) {
                // 2. Get Price Rule Details
                const prRes = await fetch(
                  `https://${shopDomain}/admin/api/2024-01/price_rules/${priceRuleId}.json`,
                  {
                    headers: {'X-Shopify-Access-Token': adminToken},
                  },
                );
                const prJson = (await prRes.json()) as any;
                const priceRule = prJson?.price_rule;

                // 3. Get Custom Discount Rules from Shop Metafield
                const sRes = await fetch(
                  `https://${shopDomain}/admin/api/2024-01/graphql.json`,
                  {
                    method: 'POST',
                    headers: {
                      'X-Shopify-Access-Token': adminToken,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      query: `query { shop { metafield(namespace: "custom", key: "discount_rules") { value } } }`,
                    }),
                  },
                );
                const sData = (await sRes.json()) as any;
                let customRules: any = {};
                if (sData?.data?.shop?.metafield?.value) {
                  try {
                    customRules = JSON.parse(sData.data.shop.metafield.value);
                  } catch (e) {}
                }
                const rule = customRules[formDiscountCode.toUpperCase()] || {};

                if (priceRule) {
                  const currentCart = await cart.get();
                  const cartLines = currentCart?.lines?.nodes || [];
                  const cartAttributes = currentCart?.attributes || [];

                  // 0) Block Discount if cart contains a BOGO (Free) item (except for Free Shipping codes)
                  const isFreeShippingCode = ['FREESHIPPING', 'FREE_SHIPPING', 'BRANCH FREE DELIVERY PROMO'].includes(submittedCode);
                  const hasBogoItem = cartLines.some((line: any) =>
                    line.attributes?.some(
                      (attr: any) =>
                        attr.key === '_is_free' && attr.value === 'true',
                    ),
                  );

                  if (hasBogoItem && !isFreeShippingCode) {
                    return data(
                      {
                        error: isEn
                          ? 'Promotional codes cannot be used with BOGO offers.'
                          : 'لا يمكن استخدام أكواد الخصم مع عروض المنتجات المجانية.',
                      },
                      {status: 400},
                    );
                  }

                  // 1) Product Selection Validation
                  if (
                    priceRule.target_selection === 'entitled' &&
                    priceRule.entitled_product_ids?.length > 0
                  ) {
                    const productIds =
                      priceRule.entitled_product_ids.map(String);
                    const hasTargetProduct = cartLines.some((line: any) => {
                      const prodId = line.merchandise?.product?.id
                        ?.split('/')
                        .pop();
                      return productIds.includes(String(prodId));
                    });
                    if (!hasTargetProduct) {
                      return data(
                        {
                          error: isEn
                            ? 'This discount code requires specific products to be in your cart.'
                            : 'هذا الكود يتطلب منتجات محددة في سلتك.',
                        },
                        {status: 400},
                      );
                    }
                  }

                  // 2) Customer Selection & Tag Validation
                  const customerAccessToken = await context.session.get(
                    'customerAccessToken',
                  );
                  const targetTag = rule.target_tag;
                  const targetBranch = rule.target_branch;
                  const targetOrderType = rule.order_type;

                  if (
                    priceRule.customer_selection === 'prerequisite' ||
                    targetTag
                  ) {
                    if (!customerAccessToken?.accessToken) {
                      return data(
                        {
                          error: isEn
                            ? 'You must be logged in to apply this discount.'
                            : 'يجب عليك تسجيل الدخول لتطبيق هذا الخصم.',
                        },
                        {status: 400},
                      );
                    }

                    const customerRes = await context.storefront.query(
                      `#graphql
                    query getCartCustomerDetails($customerAccessToken: String!) {
                      customer(customerAccessToken: $customerAccessToken) {
                        id
                        email
                        tags
                      }
                    }
                  `,
                      {
                        variables: {
                          customerAccessToken: customerAccessToken.accessToken,
                        },
                        cache: context.storefront.CacheNone(),
                      },
                    );
                    const customer = customerRes?.customer;

                    if (!customer) {
                      return data(
                        {
                          error: isEn
                            ? 'Unable to verify customer account.'
                            : 'عذراً، لم نتمكن من التحقق من حسابك.',
                        },
                        {status: 400},
                      );
                    }

                    // Verify customer ID
                    if (
                      priceRule.customer_selection === 'prerequisite' &&
                      priceRule.prerequisite_customer_ids?.length > 0
                    ) {
                      const prerequisiteIds =
                        priceRule.prerequisite_customer_ids.map(String);
                      const custId = customer.id.split('/').pop();
                      if (!prerequisiteIds.includes(String(custId))) {
                        return data(
                          {
                            error: isEn
                              ? 'This discount code is not valid for your account.'
                              : 'كود الخصم هذا غير صالح لحسابك.',
                          },
                          {status: 400},
                        );
                      }
                    }

                    // Verify customer tag
                    if (targetTag) {
                      const hasTag = customer.tags?.some(
                        (t: string) =>
                          t.trim().toLowerCase() ===
                          targetTag.trim().toLowerCase(),
                      );
                      if (!hasTag) {
                        return data(
                          {
                            error: isEn
                              ? `This discount code is only for ${targetTag} members.`
                              : `كود الخصم هذا مخصص لأعضاء ${targetTag} فقط.`,
                          },
                          {status: 400},
                        );
                      }
                    }
                  }

                  // 3) Branch restriction
                  if (targetBranch) {
                    const selectedBranchId = cartAttributes.find(
                      (a: any) => a.key.toLowerCase().trim() === 'branch id',
                    )?.value;
                    if (selectedBranchId !== targetBranch) {
                      return data(
                        {
                          error: isEn
                            ? 'This discount is not available for the selected branch.'
                            : 'هذا الخصم غير متاح للفرع المحدد.',
                        },
                        {status: 400},
                      );
                    }
                  }

                  // 4) Order Type restriction (Pickup vs Delivery)
                  if (targetOrderType) {
                    const fulfillmentType = cartAttributes.find(
                      (a: any) =>
                        a.key.toLowerCase().trim() === 'fulfillment type',
                    )?.value;
                    // If fulfillment type is not set, default is DELIVERY because of the fee
                    const safeFulfillmentType = fulfillmentType
                      ? fulfillmentType.trim().toUpperCase()
                      : 'DELIVERY';
                    if (
                      safeFulfillmentType !==
                      targetOrderType.trim().toUpperCase()
                    ) {
                      return data(
                        {
                          error: isEn
                            ? `This discount is only valid for ${targetOrderType.toLowerCase()} orders.`
                            : `هذا الخصم صالح لطلبات الـ ${targetOrderType === 'DELIVERY' ? 'توصيل' : 'استلام'} فقط.`,
                        },
                        {status: 400},
                      );
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
            const cartTotal = parseFloat(
              currentCart?.cost?.subtotalAmount?.amount || '0',
            );
            const cartLines = currentCart?.lines?.nodes || [];
            const cartAttributes = currentCart?.attributes || [];

            // PRODUCTION: Call the actual Middleware
            // TODO: Replace with the actual Middleware URL provided by the backend developer
            const middlewareUrl =
              context.env.MIDDLEWARE_URL || 'https://wh.saadeddin.top';
            const customerAccessToken = await context.session.get(
              'customerAccessToken',
            );

            // Format cart items for the middleware
            const formattedItems = cartLines.map((line: any) => ({
              id: line.merchandise?.product?.id?.split('/').pop(),
              quantity: line.quantity,
              price: line.cost?.totalAmount?.amount,
            }));

            const fulfillmentType = cartAttributes.find(
              (a: any) => a.key.toLowerCase().trim() === 'fulfillment type',
            )?.value;
            const safeFulfillmentType = fulfillmentType
              ? fulfillmentType.trim().toUpperCase()
              : 'DELIVERY';
            const branchId = cartAttributes.find(
              (a: any) => a.key.toLowerCase().trim() === 'branch id',
            )?.value;

            const validationRes = await fetch(
              `${middlewareUrl}/wallet/voucher/validate`,
              {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                  code: formDiscountCode,
                  cartTotal: cartTotal,
                  items: formattedItems,
                  user_id: customerAccessToken?.accessToken || null,
                  order_type:
                    safeFulfillmentType === 'DELIVERY' ? 'delivery' : 'pickup',
                  branch_id: branchId || null,
                }),
              },
            );
            const validationData = (await validationRes.json()) as any;

            if (validationData.error) {
              // Map backend error codes to frontend messages
              const code = validationData.error.code || validationData.error;
              if (code === 'expired')
                return data(
                  {
                    error: isEn
                      ? 'This voucher has expired.'
                      : 'عذراً، انتهت صلاحية هذه القسيمة.',
                  },
                  {status: 400},
                );
              if (code === 'min_order_not_met')
                return data(
                  {
                    error: isEn
                      ? 'Minimum order value not met.'
                      : 'لم يتم الوصول للحد الأدنى للطلب.',
                  },
                  {status: 400},
                );
              if (code === 'already_used')
                return data(
                  {
                    error: isEn
                      ? 'Voucher usage limit reached.'
                      : 'تم الوصول للحد الأقصى لاستخدام القسيمة.',
                  },
                  {status: 400},
                );
              if (code === 'invalid_products')
                return data(
                  {
                    error: isEn
                      ? 'This voucher is not valid for the products in your cart.'
                      : 'هذه القسيمة غير صالحة للمنتجات الموجودة في سلتك.',
                  },
                  {status: 400},
                );
              if (code === 'invalid_user')
                return data(
                  {
                    error: isEn
                      ? 'This voucher is not valid for your account.'
                      : 'هذه القسيمة غير صالحة لحسابك.',
                  },
                  {status: 400},
                );
              if (code === 'invalid_order_type')
                return data(
                  {
                    error: isEn
                      ? 'This voucher is not valid for your selected order type.'
                      : 'هذه القسيمة غير صالحة لنوع الطلب المحدد.',
                  },
                  {status: 400},
                );
              if (code === 'invalid_branch')
                return data(
                  {
                    error: isEn
                      ? 'This voucher is not available for your selected branch.'
                      : 'هذه القسيمة غير متاحة للفرع المحدد.',
                  },
                  {status: 400},
                );
              return data(
                {
                  error: isEn
                    ? 'Invalid voucher code.'
                    : 'رمز القسيمة غير صحيح.',
                },
                {status: 400},
              );
            }
          } catch (err) {
            console.error('[MIDDLEWARE VOUCHER VALIDATION ERROR]', err);
          }
          // --- END MIDDLEWARE VOUCHER VALIDATION ---
        }

        const currentCart = await cart.get();
        const isEnglish = params?.locale === 'en' || isEn;

        const hasLineAllocations = currentCart?.lines?.nodes?.some((line: any) => line?.discountAllocations?.length > 0);
        const hasCartAllocations = (currentCart?.discountAllocations?.length || 0) > 0;
        const hasAllocations = hasLineAllocations || hasCartAllocations;
        const hasAutomaticDiscount = hasAllocations && (currentCart?.discountCodes?.length || 0) === 0;

        const isEmployeeDiscountActive =
          currentCart?.discountCodes?.some(
            (dc) => dc.applicable && (dc.code.toUpperCase().includes('EMPLOYEE') || dc.code.toUpperCase().startsWith('EMP'))
          ) || false;

        if (isEmployeeDiscountActive && formDiscountCode && !['FREESHIPPING', 'FREE_SHIPPING'].includes(String(formDiscountCode).toUpperCase().trim())) {
          return data(
            {
              error: isEnglish
                ? 'Employee discount (25%) cannot be combined with other promotional codes.'
                : 'خصم الموظفين (25%) لا يمكن دمجه مع كود خصم آخر.',
            },
            {status: 400},
          );
        }

        let inputCodes: string[] = [];
        if (Array.isArray(inputs.discountCodes)) {
          inputCodes = inputs.discountCodes;
        } else if (typeof inputs.discountCodes === 'string' && inputs.discountCodes.trim()) {
          try {
            const parsed = JSON.parse(inputs.discountCodes);
            if (Array.isArray(parsed)) inputCodes = parsed;
            else inputCodes = [inputs.discountCodes];
          } catch (e) {
            inputCodes = [inputs.discountCodes];
          }
        }

        const discountCodes = Array.from(
          new Set([
            ...(formDiscountCode ? [String(formDiscountCode).trim()] : []),
            ...inputCodes.map((c) => String(c).trim()),
          ]),
        ).filter(Boolean);

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
        const updates = (
          Array.isArray(raw) ? raw : Object.values(raw || {})
        ) as any[];

        // Mirror delivery_date and Time Slot to session storage
        const deliveryDateAttr = updates.find(
          (a: any) => a.key === 'delivery_date',
        );
        const timeSlotAttr = updates.find((a: any) => a.key === 'Time Slot');
        if (deliveryDateAttr)
          context.session.set('delivery_date', deliveryDateAttr.value);
        if (timeSlotAttr) context.session.set('Time Slot', timeSlotAttr.value);

        const currentCart = await cart.get();
        const existing = currentCart?.attributes || [];
        const mergedMap = new Map();
        existing.forEach((a: any) => {
          if (a.key) mergedMap.set(a.key, a.value);
        });
        updates.forEach((a: any) => {
          if (a.key) mergedMap.set(a.key, a.value);
        });
        const finalAttributes = Array.from(mergedMap.entries()).map(
          ([key, value]) => ({
            key: String(key),
            value: String(value || ''),
          }),
        );
        result = await cart.updateAttributes(finalAttributes);

        // Check if selected time slot qualifies for promo free delivery and update cart.discountCodes on Shopify server
        try {
          const selectedSlot = timeSlotAttr?.value || (await context.session.get('Time Slot'));
          const selectedBranchId =
            mergedMap.get('Branch ID') ||
            mergedMap.get('custom.branch_id') ||
            (await context.session.get('selectedLocationId'));
          const selectedBranchName =
            mergedMap.get('Branch') ||
            (await context.session.get('selectedLocationName'));

          if (selectedSlot && (selectedBranchId || selectedBranchName)) {
            const { getAdminToken, getAdminDomain } = await import('~/lib/shopify-admin.server');
            const shopDomain = getAdminDomain(context.env);
            const adminToken = await getAdminToken(context.env);
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
                const targetNumId = String(selectedBranchId || '').split('/').pop();
                if (targetNumId && locNumId === targetNumId) return true;
                if (selectedBranchName && l.name?.toLowerCase().trim() === String(selectedBranchName).toLowerCase().trim()) return true;
                const arabicName = l.metafields?.nodes?.find((m: any) => m.key === 'name_in_arabic')?.value;
                if (selectedBranchName && arabicName && String(arabicName).trim() === String(selectedBranchName).trim()) return true;
                return false;
              });

              if (matchedLoc) {
                const { checkBranchFreeDeliveryInterval } = await import('~/lib/promo-delivery');
                const promoResult = checkBranchFreeDeliveryInterval(matchedLoc, selectedSlot);
                const isPromoFree = promoResult.isPromoFreeDelivery;

                const currentCodes = currentCart?.discountCodes?.map((dc: any) => dc.code) || [];
                if (isPromoFree && !currentCodes.includes('freeshipping')) {
                  await cart.updateDiscountCodes(Array.from(new Set([...currentCodes, 'freeshipping'])));
                } else if (!isPromoFree && currentCodes.includes('freeshipping')) {
                  await cart.updateDiscountCodes(currentCodes.filter((c: string) => c !== 'freeshipping'));
                }
              }
            }
          }
        } catch (promoErr) {
          console.error('[CART] Failed auto-applying promo free shipping code:', promoErr);
        }

        break;
      }
      case 'FulfillmentUpdate': {
        const {attributes, buyerIdentity} = inputs;
        if (attributes) {
          const updates = (
            Array.isArray(attributes)
              ? attributes
              : Object.values(attributes || {})
          ) as any[];
          const branchAttr = updates.find((a) => a.key === 'Branch')?.value;
          const branchIdAttr = updates.find(
            (a) => a.key === 'Branch ID',
          )?.value;
          const fTypeAttr = updates.find(
            (a) => a.key === 'Fulfillment Type',
          )?.value;
          const axStoreIdAttr =
            updates.find((a) => a.key === 'AX Store ID')?.value ||
            updates.find((a) => a.key === 'ax_store_id')?.value ||
            updates.find((a) => a.key === 'custom.ax_store_id')?.value;
          const customBranchIdAttr =
            updates.find((a) => a.key === 'custom.branch_id')?.value ||
            updates.find((a) => a.key === 'branch_id')?.value;

          if (branchAttr)
            context.session.set('selectedLocationName', branchAttr);
          if (branchIdAttr)
            context.session.set('selectedLocationId', branchIdAttr);
          if (axStoreIdAttr)
            context.session.set('selectedAxStoreId', axStoreIdAttr);
          if (customBranchIdAttr)
            context.session.set('selectedCustomBranchId', customBranchIdAttr);
          if (fTypeAttr) {
            context.session.set(
              'fulfillmentType',
              fTypeAttr.toLowerCase() === 'pickup' ? 'pickup' : 'delivery',
            );
          }
          context.session.set('manualLocationSelection', 'true');

          const updatesList = updates as any[];
          const currentCart = await cart.get();
          const existing = currentCart?.attributes || [];
          const mergedMap = new Map();
          existing.forEach((a: any) => {
            if (a.key) mergedMap.set(a.key, a.value);
          });
          updatesList.forEach((a: any) => {
            if (a.key) mergedMap.set(a.key, a.value);
          });
          const finalAttributes = Array.from(mergedMap.entries()).map(
            ([key, value]) => ({
              key: String(key),
              value: String(value || ''),
            }),
          );
          result = await cart.updateAttributes(finalAttributes);
        }
        if (buyerIdentity) {
          const customerAccessToken = await context.session.get(
            'customerAccessToken',
          );
          if (customerAccessToken?.accessToken) {
            buyerIdentity.customerAccessToken = customerAccessToken.accessToken;
          }

          if (buyerIdentity.deliveryAddressPreferences?.[0]?.deliveryAddress) {
            const addr =
              buyerIdentity.deliveryAddressPreferences[0].deliveryAddress;
            const addressName = addr.address1 || addr.address2;
            if (addressName) {
              context.session.set('selectedAddressName', addressName);
            }
          }

          let innerResult: any = await cart.updateBuyerIdentity(buyerIdentity);

          // Check if the update failed due to Customer Invalid error
          const userErrors =
            (innerResult as any).cartBuyerIdentityUpdate?.userErrors || [];
          const isCustomerError = userErrors.some(
            (err: any) =>
              err.message === 'Customer غير صالح' ||
              err.message === 'Customer is invalid' ||
              err.field?.includes('customerAccessToken'),
          );

          if (isCustomerError && buyerIdentity.customerAccessToken) {
            delete buyerIdentity.customerAccessToken;
            innerResult = await cart.updateBuyerIdentity(buyerIdentity);
          }

          if (innerResult?.errors?.length || innerResult?.userErrors?.length) {
            console.error(
              '[CART BUYER IDENTITY ERROR]',
              innerResult.errors || innerResult.userErrors,
            );
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

    // Extract actual cart object from GraphQL mutation response (handles cartLinesRemove, cartLinesUpdate, cartLinesAdd, etc.)
    let actualCart = result?.cart;
    if (!actualCart && result && typeof result === 'object') {
      actualCart =
        result.cartLinesRemove?.cart ||
        result.cartLinesUpdate?.cart ||
        result.cartLinesAdd?.cart ||
        result.cartDiscountCodesUpdate?.cart ||
        result.cartAttributesUpdate?.cart ||
        result.cartBuyerIdentityUpdate?.cart ||
        result.cartNoteUpdate?.cart ||
        result.cartSelectedDeliveryOptionsUpdate?.cart;
    }

    const cartId = actualCart?.id || result?.cart?.id;
    const headers = cartId ? cart.setCartId(cartId) : new Headers();

    if (context.session.isPending) {
      headers.append('Set-Cookie', await context.session.commit());
    }

    const cartResult = actualCart || result?.cart || null;
    const errors = result?.errors || result?.userErrors || [];
    const warnings = result?.warnings || [];

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
    const isThrottled =
      String(err).toLowerCase().includes('throttled') || err?.status === 429;
    const errMsg = isThrottled
      ? isEn
        ? 'The shop is currently busy. Resetting session, please try again.'
        : 'المتجر مشغول حالياً. تم إعادة تعيين الجلسة، يرجى المحاولة مرة أخرى.'
      : isEn
        ? 'An error occurred while updating the cart. Please try again.'
        : 'حدث خطأ أثناء تحديث السلة. يرجى المحاولة مرة أخرى.';

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
        errors: [{message: errMsg}],
        warnings: [],
        error: errMsg,
      },
      {
        status: 200,
        headers,
      },
    );
  }
}

export async function loader({context}: Route.LoaderArgs) {
  const {cart} = context;
  try {
    let cartData: any = null;
    try {
      cartData = await cart.get();
    } catch (e) {
      console.warn('[CART LOADER] cart.get() warning:', e);
    }

    const headers = cartData?.id ? cart.setCartId(cartData.id) : new Headers();
    return data(cartData, { headers });
  } catch (err) {
    console.error('Failed to get cart in cart loader:', err);
    return data(null);
  }
}

export default function Cart() {
  const cart = useLoaderData<typeof loader>();

  return <CartMain layout="page" cart={cart} />;
}
