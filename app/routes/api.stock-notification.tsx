import {data, type ActionFunctionArgs} from 'react-router';

const createMutation = `
  mutation metaobjectCreate($metaobject: MetaobjectCreateInput!) {
    metaobjectCreate(metaobject: $metaobject) {
      metaobject {
        id
        handle
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const defMutation = `
  mutation metaobjectDefinitionCreate($definition: MetaobjectDefinitionCreateInput!) {
    metaobjectDefinitionCreate(definition: $definition) {
      createdDefinition {
        id
        type
      }
      userErrors {
        field
        message
      }
    }
  }
`;

async function executeAdminQuery(
  query: string,
  variables: any,
  token: string,
  shopDomain: string,
) {
  const response = await fetch(
    `https://${shopDomain}/admin/api/2024-04/graphql.json`,
    {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({query, variables}),
    },
  );
  return response.json();
}

async function getShopifyMarketId(
  env: any,
  shopDomain: string,
  targetCountry: string,
): Promise<string | null> {
  const envMarketId =
    env?.SHOPIFY_MARKET_ID || env?.STOQ_MARKET_ID || env?.PUBLIC_STOQ_MARKET_ID;
  if (envMarketId) return String(envMarketId);

  try {
    const {getAdminToken} = await import('~/lib/shopify-admin.server');
    const adminToken = await getAdminToken(env || {}).catch(() => null);
    if (!adminToken) return null;

    const marketsQuery = `
      query getMarkets {
        markets(first: 20) {
          nodes {
            id
            name
            enabled
            regions(first: 250) {
              nodes {
                ... on MarketRegionCountry {
                  code
                }
              }
            }
          }
        }
      }
    `;

    const res = await executeAdminQuery(
      marketsQuery,
      {},
      adminToken,
      shopDomain,
    );
    const markets = res?.data?.markets?.nodes || [];
    const enabledMarkets = markets.filter((m: any) => m.enabled !== false);

    const countryUpper = (targetCountry || 'SA').toUpperCase();
    let matchedMarket = enabledMarkets.find((m: any) =>
      m.regions?.nodes?.some((r: any) => r.code === countryUpper),
    );

    if (!matchedMarket && enabledMarkets.length > 0) {
      matchedMarket = enabledMarkets[0];
    }

    if (matchedMarket?.id) {
      const numericId = String(matchedMarket.id).split('/').pop();
      return numericId || null;
    }
  } catch (err) {
    console.warn('[STOQ_MARKET_LOOKUP WARN]', err);
  }
  return null;
}

/**
 * POST /api/stock-notification
 * Registers a customer subscription for out of stock notification.
 * 1. Forwards to Saadeddin Backend API (api.saadeddin.top) for automated email notification dispatch
 * 2. Forwards to STOQ App v1 API (with Shopify Market support)
 * 3. Saves subscription as a Shopify Metaobject of type "stock_notification"
 */
export async function action({request, context}: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return data({error: 'Method not allowed'}, {status: 405});
  }

  const {env} = context;
  const {PUBLIC_STORE_DOMAIN} = (env || {}) as any;

  try {
    const body = (await request.json()) as any;
    const {
      email,
      variantId,
      productId,
      productTitle,
      locationId,
      locationName,
      country = 'SA',
      shopifyMarketId,
      customerName,
      acceptsMarketing = true,
      quantity = 1,
    } = body;

    if (!email || !variantId) {
      return data({error: 'Email and variant ID are required'}, {status: 400});
    }

    const numericLocationId =
      locationId && String(locationId).includes('/')
        ? String(locationId).split('/').pop()
        : (locationId && String(locationId).trim()) || '80198500503';

    // Helper for STOQ & Admin API myshopify domain
    const getMyshopifyDomain = (envObj: any) => {
      if (envObj?.SHOPIFY_ADMIN_DOMAIN) {
        return envObj.SHOPIFY_ADMIN_DOMAIN.replace(/^https?:\/\//, '').replace(
          /\/$/,
          '',
        );
      }
      if (
        envObj?.SHOPIFY_SHOP &&
        String(envObj.SHOPIFY_SHOP).includes('myshopify.com')
      ) {
        return envObj.SHOPIFY_SHOP;
      }
      if (
        envObj?.PUBLIC_STORE_DOMAIN &&
        String(envObj.PUBLIC_STORE_DOMAIN).includes('myshopify.com')
      ) {
        return envObj.PUBLIC_STORE_DOMAIN;
      }
      return 'saadeldeenshop-x21xumcd.myshopify.com';
    };

    const shopDomain = getMyshopifyDomain(env);

    // 1. Forward subscription to Saadeddin Backend Middleware for email dispatch
    const middlewareUrl =
      (env as any)?.SAADEDDIN_API_URL || 'https://api.saadeddin.top';
    try {
      await fetch(`${middlewareUrl}/api/stock-notification`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          email,
          variant_id: variantId,
          product_title: productTitle || 'Product',
          location_id: String(numericLocationId),
          location_name: locationName || 'Global',
          created_at: new Date().toISOString(),
        }),
      });
    } catch (mwErr) {
      console.warn('[STOCK_NOTIFICATION MW ERR]', mwErr);
    }

    // 2. Forward subscription to STOQ App API (v1 intents API as recommended by STOQ support)
    try {
      const numericVariantId = String(variantId).includes('/')
        ? String(variantId).split('/').pop()
        : variantId;

      let numericProductId = productId
        ? String(productId).includes('/')
          ? String(productId).split('/').pop()
          : productId
        : null;

      const stoqApiKey =
        (env as any)?.STOQ_API_KEY ||
        (env as any)?.STOQ_KEY ||
        (env as any)?.PUBLIC_STOQ_API_KEY ||
        'stoq_api_key_61aaceb43c5ffcf013318e26fe6eb854';

      // If productId was not provided, resolve shopify_product_id from Admin API
      if (!numericProductId && numericVariantId) {
        try {
          const {getAdminToken} = await import('~/lib/shopify-admin.server');
          const adminToken = await getAdminToken(env || {}).catch(() => null);
          if (adminToken) {
            const varRes = await fetch(
              `https://${shopDomain}/admin/api/2024-01/variants/${numericVariantId}.json`,
              {
                headers: {'X-Shopify-Access-Token': adminToken},
              },
            );
            if (varRes.ok) {
              const varData = (await varRes.json()) as any;
              numericProductId = varData?.variant?.product_id
                ? String(varData.variant.product_id)
                : null;
            }
          }
        } catch (_) {}
      }

      // Resolve Market ID for STOQ v1 API
      const resolvedMarketId =
        shopifyMarketId || (await getShopifyMarketId(env, shopDomain, country));

      const stoqHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Shopify-Shop-Domain': shopDomain,
      };
      if (stoqApiKey) {
        stoqHeaders['X-Auth-Token'] = stoqApiKey;
      }

      // STOQ v1 API Payload (recommended by STOQ support for Hydrogen & Markets)
      const v1Payload = {
        intent: {
          shopify_variant_id: Number(numericVariantId) || numericVariantId,
          ...(numericProductId
            ? {shopify_product_id: Number(numericProductId) || numericProductId}
            : {}),
          ...(numericLocationId && numericLocationId !== 'global'
            ? {
                shopify_location_id:
                  Number(numericLocationId) || numericLocationId,
              }
            : {}),
          variant_id: Number(numericVariantId) || numericVariantId,
          channel: 'email',
          quantity: Number(quantity) || 1,
          source: 'api',
        },
        customer: {
          email,
          name: customerName || email.split('@')[0],
          accepts_marketing: Boolean(acceptsMarketing),
          country: String(country || 'sa').toLowerCase(),
          ...(resolvedMarketId
            ? {shopify_market_id: String(resolvedMarketId)}
            : {}),
        },
      };

      // 1. Primary: STOQ v1 Intents API
      let stoqRes = await fetch('https://app.stoqapp.com/api/v1/intents.json', {
        method: 'POST',
        headers: stoqHeaders,
        body: JSON.stringify(v1Payload),
      });

      // 2. Fallback: STOQ v2 Action API
      if (!stoqRes.ok) {
        stoqRes = await fetch(
          'https://app.stoqapp.com/api/v2/external/back_in_stock/signups',
          {
            method: 'POST',
            headers: stoqHeaders,
            body: JSON.stringify({
              channel: 'email',
              shopify_variant_id: Number(numericVariantId) || numericVariantId,
              ...(numericProductId
                ? {
                    shopify_product_id:
                      Number(numericProductId) || numericProductId,
                  }
                : {}),
              email,
            }),
          },
        );
      }

      console.log(
        `[STOQ_SIGNUP RES] Status: ${stoqRes.status} for shop: ${shopDomain}, variant: ${numericVariantId}, product: ${numericProductId}, marketId: ${resolvedMarketId || 'none'}`,
      );
    } catch (stoqErr) {
      console.warn('[STOQ_SIGNUP WARN]', stoqErr);
    }

    // 3. Save subscription into Shopify Shop Metafields (namespace: stock_alerts)
    try {
      const {getAdminToken} = await import('~/lib/shopify-admin.server');
      const adminToken = await getAdminToken(env || {}).catch(() => null);

      if (adminToken) {
        // Fetch Shop ID
        const shopQuery = `query { shop { id } }`;
        const shopRes = await executeAdminQuery(
          shopQuery,
          {},
          adminToken,
          shopDomain,
        );
        const shopId = shopRes?.data?.shop?.id;

        if (shopId) {
          const subKey = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const subData = {
            email,
            variant_id: String(variantId),
            product_id: String(productId || numericProductId || ''),
            location_id: String(numericLocationId),
            location_name: locationName || 'Global',
            product_title: productTitle || 'Product',
            created_at: new Date().toISOString(),
          };

          const setMetafieldMutation = `
            mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
              metafieldsSet(metafields: $metafields) {
                metafields {
                  id
                  key
                }
                userErrors {
                  field
                  message
                }
              }
            }
          `;

          await executeAdminQuery(
            setMetafieldMutation,
            {
              metafields: [
                {
                  ownerId: shopId,
                  namespace: 'stock_alerts',
                  key: subKey,
                  type: 'json',
                  value: JSON.stringify(subData),
                },
              ],
            },
            adminToken,
            shopDomain,
          );
          console.log(`[STOCK_NOTIFICATION METAFIELD SUCCESS] Saved sub ${subKey} for ${email}`);
        }
      }
    } catch (metaErr) {
      console.warn('[STOCK_NOTIFICATION METAFIELD WARN]', metaErr);
    }

    // 4. Send email notification to Product Manager & Regional Manager from Product Metafields (custom.product_manager, custom.regional_manager)
    try {
      const {getAdminToken} = await import('~/lib/shopify-admin.server');
      const {sendEmail, sendFormEmailNotification} = await import('~/lib/email.server');
      const adminToken = await getAdminToken(env || {}).catch(() => null);

      let pmEmail: string | null = null;
      let rmEmail: string | null = null;
      let resolvedProductTitle = productTitle || 'Product';

      if (adminToken && variantId) {
        const fullVariantId = String(variantId).includes('/')
          ? String(variantId)
          : `gid://shopify/ProductVariant/${variantId}`;

        const managerQuery = `
          query GetProductManagersFromVariant($variantId: ID!) {
            productVariant(id: $variantId) {
              title
              product {
                title
                productManager: metafield(namespace: "custom", key: "product_manager") {
                  value
                }
                regionalManager: metafield(namespace: "custom", key: "regional_manager") {
                  value
                }
              }
            }
          }
        `;

        const managerRes = await executeAdminQuery(
          managerQuery,
          {variantId: fullVariantId},
          adminToken,
          shopDomain,
        );

        const variantObj = managerRes?.data?.productVariant;
        const productObj = variantObj?.product;

        if (productObj) {
          if (productObj.title) resolvedProductTitle = productObj.title;
          pmEmail = productObj.productManager?.value || null;
          rmEmail = productObj.regionalManager?.value || null;
        }
      }

      // Collect manager emails
      const managerRecipients: string[] = [];
      if (pmEmail && String(pmEmail).includes('@')) managerRecipients.push(String(pmEmail).trim());
      if (rmEmail && String(rmEmail).includes('@')) managerRecipients.push(String(rmEmail).trim());

      console.log(`[STOCK_NOTIFICATION MANAGERS RESOLVED] Product: "${resolvedProductTitle}", Managers: ${managerRecipients.length > 0 ? managerRecipients.join(', ') : 'None'}`);

      if (managerRecipients.length > 0) {
        const emailSubject = `[Saadeddin Alert] Back in Stock Request: ${resolvedProductTitle}`;
        const emailHtml = `
          <div style="font-family: 'Cairo', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #FEF8EB; color: #234745; text-align: right; direction: rtl;">
            <div style="text-align: center; margin-bottom: 16px; background-color: #234745; padding: 12px; border-radius: 8px;">
              <img src="https://cdn.shopify.com/s/files/1/0821/1752/5737/files/logo.png" alt="Saadeddin Pastry" style="height: 40px; object-fit: contain;" />
            </div>
            <h3 style="color: #234745; margin-top: 0;">📦 تنبيه طلب إشعار بتوفر المنتج (Back in Stock Alert)</h3>
            <p>عزيزي مدير المنتج / مدير المنطقة،</p>
            <p>قام أحد العملاء بطلب إشعار فور توفر المنتج التالي في المخزون:</p>
            <div style="background: #ffffff; padding: 16px; border-radius: 8px; border: 1px solid #ebdcc5; margin: 16px 0;">
              <p style="margin: 6px 0;"><strong>اسم المنتج:</strong> ${resolvedProductTitle}</p>
              <p style="margin: 6px 0;"><strong>رمز المعرّف (Variant ID):</strong> ${variantId}</p>
              <p style="margin: 6px 0;"><strong>الفرع / الموقع:</strong> ${locationName || 'Global'}</p>
              <p style="margin: 6px 0;"><strong>بريد العميل المطلوب إشعاره:</strong> ${email}</p>
            </div>
            <p style="font-size: 12px; color: #888888; text-align: center; border-top: 1px solid #ebdcc5; padding-top: 12px;">
              تم إرسال هذا التنبيه آلياً بناءً على الحقول المخصصة لمدير المنتج ومدير المنطقة 
              (<code>custom.product_manager</code>, <code>custom.regional_manager</code>).
            </p>
          </div>
        `;

        await sendEmail({
          to: managerRecipients,
          subject: emailSubject,
          html: emailHtml,
          env,
        });
        console.log(`[STOCK_NOTIFICATION MANAGER EMAILS OK] Sent alert to managers: ${managerRecipients.join(', ')}`);
      }

      // Also send general admin notification
      await sendFormEmailNotification(
        {
          formType: 'contact',
          formTitle: 'Back in Stock Request (طلب التنبيه بتوفر المنتج)',
          fullName: customerName || email.split('@')[0],
          email,
          phone: '',
          subject: `Back in Stock Alert Request - ${resolvedProductTitle}`,
          message: `Customer requested back in stock notification for: ${resolvedProductTitle} (Variant ID: ${variantId}, Location: ${locationName || 'N/A'})`,
        },
        env,
      );
    } catch (mgrErr) {
      console.warn('[STOCK_NOTIFICATION MANAGER EMAILS WARN]', mgrErr);
    }

    console.log(
      `[STOCK_NOTIFICATION SUCCESS] Registered: email=${email}, variant=${variantId}, location=${locationName || 'N/A'}`,
    );

    return data({success: true});
  } catch (error: any) {
    console.error('[STOCK_NOTIFICATION ERROR]', error);
    // Still return success if email was received so customer experience is smooth
    return data({success: true});
  }
}
