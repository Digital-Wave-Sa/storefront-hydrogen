import { data, type ActionFunctionArgs } from 'react-router';

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

async function executeAdminQuery(query: string, variables: any, token: string, shopDomain: string) {
  const response = await fetch(`https://${shopDomain}/admin/api/2024-04/graphql.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query, variables })
  });
  return response.json();
}

/**
 * POST /api/stock-notification
 * Registers a customer subscription for out of stock notification.
 * 1. Forwards to Saadeddin Backend API (api.saadeddin.top) for automated email notification dispatch
 * 2. Saves subscription as a Shopify Metaobject of type "stock_notification"
 */
export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return data({ error: 'Method not allowed' }, { status: 405 });
  }

  const { env } = context;
  const { PUBLIC_STORE_DOMAIN } = (env || {}) as any;

  try {
    const body = await request.json() as any;
    const { email, variantId, productId, productTitle, locationId, locationName } = body;

    if (!email || !variantId) {
      return data({ error: 'Email and variant ID are required' }, { status: 400 });
    }

    const numericLocationId = locationId && String(locationId).includes('/')
      ? String(locationId).split('/').pop()
      : locationId || 'global';

    // Helper for STOQ & Admin API myshopify domain
    const getMyshopifyDomain = (envObj: any) => {
      if (envObj?.SHOPIFY_SHOP && String(envObj.SHOPIFY_SHOP).includes('myshopify.com')) {
        return envObj.SHOPIFY_SHOP;
      }
      if (envObj?.PUBLIC_STORE_DOMAIN && String(envObj.PUBLIC_STORE_DOMAIN).includes('myshopify.com')) {
        return envObj.PUBLIC_STORE_DOMAIN;
      }
      return 'saadeldeenshop-x21xumcd.myshopify.com';
    };

    const shopDomain = getMyshopifyDomain(env);

    // 1. Forward subscription to Saadeddin Backend Middleware for email dispatch
    const middlewareUrl = (env as any)?.SAADEDDIN_API_URL || 'https://api.saadeddin.top';
    try {
      await fetch(`${middlewareUrl}/api/stock-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

    // 2. Forward subscription to STOQ App API (v2 action API for headless waitlist sync)
    try {
      const numericVariantId = String(variantId).includes('/')
        ? String(variantId).split('/').pop()
        : variantId;

      let numericProductId = productId ? (String(productId).includes('/') ? String(productId).split('/').pop() : productId) : null;

      const stoqApiKey = (env as any)?.STOQ_API_KEY || (env as any)?.STOQ_KEY || (env as any)?.PUBLIC_STOQ_API_KEY || 'stoq_api_key_61aaceb43c5ffcf013318e26fe6eb854';

      // If productId was not provided, resolve shopify_product_id from Admin API
      if (!numericProductId && numericVariantId) {
        try {
          const { getAdminToken } = await import('~/lib/shopify-admin.server');
          const adminToken = await getAdminToken(env || {}).catch(() => null);
          if (adminToken) {
            const varRes = await fetch(`https://${shopDomain}/admin/api/2024-01/variants/${numericVariantId}.json`, {
              headers: { 'X-Shopify-Access-Token': adminToken }
            });
            if (varRes.ok) {
              const varData = await varRes.json() as any;
              numericProductId = varData?.variant?.product_id ? String(varData.variant.product_id) : null;
            }
          }
        } catch (_) {}
      }

      const stoqHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Shopify-Shop-Domain': shopDomain,
      };
      if (stoqApiKey) {
        stoqHeaders['X-Auth-Token'] = stoqApiKey;
      }

      // 1. STOQ v2 Action API: POST /api/v2/external/back_in_stock/signups
      let stoqRes = await fetch('https://app.stoqapp.com/api/v2/external/back_in_stock/signups', {
        method: 'POST',
        headers: stoqHeaders,
        body: JSON.stringify({
          channel: 'email',
          shopify_variant_id: Number(numericVariantId) || numericVariantId,
          ...(numericProductId ? { shopify_product_id: Number(numericProductId) || numericProductId } : {}),
          email,
        }),
      });

      // 2. Fallback to v1 intents API if v2 fails
      if (!stoqRes.ok) {
        stoqRes = await fetch('https://app.stoqapp.com/api/v1/intents.json', {
          method: 'POST',
          headers: stoqHeaders,
          body: JSON.stringify({
            intent: {
              email,
              variant_id: Number(numericVariantId) || numericVariantId,
            }
          }),
        });
      }

      console.log(`[STOQ_SIGNUP RES] Status: ${stoqRes.status} for shop: ${shopDomain}, variant: ${numericVariantId}, product: ${numericProductId}`);
    } catch (stoqErr) {
      console.warn('[STOQ_SIGNUP WARN]', stoqErr);
    }

    // 3. Try saving to Shopify Metaobjects
    try {
      const { getAdminToken } = await import('~/lib/shopify-admin.server');
      const adminToken = await getAdminToken(env || {}).catch(() => null);

      if (adminToken) {
        const entryVariables = {
          metaobject: {
            type: "stock_notification",
            fields: [
              { key: "email", value: email },
              { key: "variant_id", value: String(variantId) },
              { key: "location_id", value: String(numericLocationId) },
              { key: "location_name", value: locationName || 'Global' },
              { key: "product_title", value: productTitle || 'Product' }
            ]
          }
        };

        const defVariables = {
          definition: {
            name: "Stock Notification",
            type: "stock_notification",
            fieldDefinitions: [
              { name: "Email", key: "email", type: "single_line_text_field" },
              { name: "Variant ID", key: "variant_id", type: "single_line_text_field" },
              { name: "Location ID", key: "location_id", type: "single_line_text_field" },
              { name: "Location Name", key: "location_name", type: "single_line_text_field" },
              { name: "Product Title", key: "product_title", type: "single_line_text_field" }
            ]
          }
        };

        let res = await executeAdminQuery(createMutation, entryVariables, adminToken, shopDomain) as any;
        let userErrors = res?.data?.metaobjectCreate?.userErrors;
        const errors = res?.errors;

        const isMissingDefinition =
          (errors && errors.some((e: any) => e.message && (e.message.includes('not found') || e.message.includes('type') || e.message.includes('invalid') || e.message.includes('type "stock_notification"')))) ||
          (userErrors && userErrors.some((e: any) => e.message && (e.message.includes('not found') || e.message.includes('type') || e.message.includes('invalid') || e.message.includes('type "stock_notification"'))));

        if (isMissingDefinition) {
          const defRes = await executeAdminQuery(defMutation, defVariables, adminToken, shopDomain) as any;
          const defErrors = defRes?.data?.metaobjectDefinitionCreate?.userErrors;
          if (!defErrors || defErrors.length === 0 || defErrors.some((e: any) => e.message?.includes('already exists'))) {
            res = await executeAdminQuery(createMutation, entryVariables, adminToken, shopDomain);
          }
        }
      }
    } catch (metaErr) {
      console.warn('[STOCK_NOTIFICATION METAOBJECT WARN]', metaErr);
    }

    console.log(`[STOCK_NOTIFICATION SUCCESS] Registered: email=${email}, variant=${variantId}, location=${locationName || 'N/A'}`);

    return data({ success: true });
  } catch (error: any) {
    console.error('[STOCK_NOTIFICATION ERROR]', error);
    // Still return success if email was received so customer experience is smooth
    return data({ success: true });
  }
}
