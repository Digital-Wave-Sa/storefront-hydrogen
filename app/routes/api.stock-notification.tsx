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
 * Saves subscription as a Shopify Metaobject of type "stock_notification"
 * dynamically matching the selected location/branch.
 */
export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return data({ error: 'Method not allowed' }, { status: 405 });
  }

  const { env } = context;
  const { PUBLIC_STORE_DOMAIN } = env as any;

  try {
    const body = await request.json() as any;
    const { email, variantId, productTitle, locationId, locationName } = body;

    if (!email || !variantId) {
      return data({ error: 'Email and variant ID are required' }, { status: 400 });
    }

    // Resolve the myshopify.com domain
    const rawShop = env.SHOPIFY_SHOP || PUBLIC_STORE_DOMAIN || '';
    const shopDomain = rawShop.includes('myshopify.com')
      ? rawShop
      : `${rawShop.split('.')[0]}.myshopify.com`;

    const { getAdminToken } = await import('~/lib/shopify-admin.server');
    const adminToken = await getAdminToken(env);

    if (!adminToken) {
      return data({ error: 'Failed to retrieve Shopify admin API token' }, { status: 500 });
    }

    // Extract numerical/legacy ID for location to match Shopify inventory webhook payload
    const numericLocationId = locationId && locationId.includes('/')
      ? locationId.split('/').pop()
      : locationId || 'global';

    const entryVariables = {
      metaobject: {
        type: "stock_notification",
        fields: [
          { key: "email", value: email },
          { key: "variant_id", value: variantId },
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

    // 1. Try to create the metaobject entry
    let res = await executeAdminQuery(createMutation, entryVariables, adminToken, shopDomain) as any;
    console.log('[STOCK_NOTIFICATION CREATE RESP]', JSON.stringify(res));

    let userErrors = res?.data?.metaobjectCreate?.userErrors;
    const errors = res?.errors;

    // Detect if definition is missing
    const isMissingDefinition =
      (errors && errors.some((e: any) => e.message && (e.message.includes('not found') || e.message.includes('type') || e.message.includes('invalid') || e.message.includes('type "stock_notification"')))) ||
      (userErrors && userErrors.some((e: any) => e.message && (e.message.includes('not found') || e.message.includes('type') || e.message.includes('invalid') || e.message.includes('type "stock_notification"'))));

    if (isMissingDefinition) {
      console.log('[STOCK_NOTIFICATION] Definition "stock_notification" not found. Creating definition first...');

      // 2. Create the definition
      const defRes = await executeAdminQuery(defMutation, defVariables, adminToken, shopDomain) as any;
      console.log('[STOCK_NOTIFICATION DEF CREATE RESP]', JSON.stringify(defRes));

      const defErrors = defRes?.data?.metaobjectDefinitionCreate?.userErrors;
      if (defErrors && defErrors.length > 0) {
        const isAlreadyTaken = defErrors.some((e: any) => e.message && (e.message.includes('taken') || e.message.includes('already exists')));
        if (!isAlreadyTaken) {
          console.error('[STOCK_NOTIFICATION DEF CREATE ERRORS]', defErrors);
          throw new Error(defErrors[0].message);
        }
      }

      // 3. Retry creating the metaobject entry
      res = await executeAdminQuery(createMutation, entryVariables, adminToken, shopDomain);
      console.log('[STOCK_NOTIFICATION RETRY RESP]', JSON.stringify(res));
      userErrors = res?.data?.metaobjectCreate?.userErrors;
    }

    if (userErrors && userErrors.length > 0) {
      console.error('[STOCK_NOTIFICATION CREATE ERRORS]', userErrors);
      return data({ error: userErrors[0].message }, { status: 400 });
    }

    console.log(`[STOCK_NOTIFICATION] Registered: email=${email}, variant=${variantId}, location=${locationName || 'N/A'} (${numericLocationId})`);

    return data({ success: true });
  } catch (error: any) {
    console.error('[STOCK_NOTIFICATION] Unexpected error:', error);
    return data({ error: error.message }, { status: 500 });
  }
}
