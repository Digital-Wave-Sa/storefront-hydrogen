import {data, type ActionFunctionArgs} from 'react-router';
import {sendEmail, getBackInStockTemplate} from '../lib/email.server';

/**
 * Webhook Handler: inventory_levels/update
 * Triggered when stock levels change in Shopify
 */
export async function action({request, context}: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return data({error: 'Method not allowed'}, {status: 405});
  }

  const {env} = context;
  const {SHOPIFY_ADMIN_API_ACCESS_TOKEN, PUBLIC_STORE_DOMAIN} = env as any;

  try {
    const payload = (await request.json()) as any;
    const {inventory_item_id, location_id, available} = payload;

    console.log(
      `[INVENTORY WEBHOOK] Processing: Item ${inventory_item_id}, Location ${location_id}, Available: ${available}`,
    );

    // We only care if it's back in stock (available > 0)
    if (available <= 0) {
      return data({
        success: true,
        message: 'Stock still empty, no action taken',
      });
    }

    if (!SHOPIFY_ADMIN_API_ACCESS_TOKEN) {
      return data({error: 'Config missing: Admin Token'}, {status: 500});
    }

    const adminApiUrl = `https://${PUBLIC_STORE_DOMAIN}/admin/api/2024-04/graphql.json`;

    // 1. Fetch Variant ID from Inventory Item ID and Location Name
    // Note: location_id from webhook is a GID or legacy ID. We match by legacy ID.
    const findVariantQuery = `
      query GetVariantByInventoryItem($itemId: ID!) {
        inventoryItem(id: $itemId) {
          variant {
            id
            title
            product {
              title
              handle
            }
          }
        }
        location(id: "gid://shopify/Location/${location_id}") {
          name
        }
      }
    `;

    const findVariantRes = await fetch(adminApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ADMIN_API_ACCESS_TOKEN,
      },
      body: JSON.stringify({
        query: findVariantQuery,
        variables: {itemId: `gid://shopify/InventoryItem/${inventory_item_id}`},
      }),
    });

    const variantData = (await findVariantRes.json()) as any;
    const variant = variantData.data?.inventoryItem?.variant;
    const branchName = variantData.data?.location?.name || 'Your Branch';

    if (!variant) {
      return data(
        {error: 'Variant not found for this inventory item'},
        {status: 404},
      );
    }

    const variantId = variant.id;
    const productTitle = variant.product.title;
    const variantTitle = variant.title;

    // Helper to extract clean numeric ID from GID or raw string
    const extractId = (val: any) => {
      if (!val) return '';
      const str = String(val).trim();
      if (str.includes('/')) {
        return str.split('/').pop() || '';
      }
      return str;
    };

    const cleanVariantId = extractId(variantId);
    const cleanProductId = extractId(variant.product?.id);

    // 2. Query Metaobjects for subscriptions
    const getSubscriptionsQuery = `
      query GetStockSubscriptions {
        metaobjects(type: "stock_notification", first: 100) {
          nodes {
            id
            fields {
              key
              value
            }
          }
        }
      }
    `;

    const subRes = await fetch(adminApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ADMIN_API_ACCESS_TOKEN,
      },
      body: JSON.stringify({query: getSubscriptionsQuery}),
    });

    const subData = (await subRes.json()) as any;
    const allSubs = subData.data?.metaobjects?.nodes || [];

    // Filter relevant subs: MUST strictly match exact variant_id or product_id of the restocked item
    const relevantSubs = allSubs.filter((node: any) => {
      const fields = node.fields.reduce(
        (acc: any, f: any) => ({...acc, [f.key]: f.value}),
        {},
      );

      if (!fields.email || !fields.email.includes('@')) return false;

      const subVariantId = extractId(fields.variant_id);
      const subProductId = extractId(fields.product_id);
      const subLocationId = extractId(fields.location_id);
      const webhookLocationId = extractId(location_id);

      // Strict item match: must match restocked variant_id or product_id
      const matchesVariant = subVariantId && subVariantId === cleanVariantId;
      const matchesProduct = subProductId && subProductId === cleanProductId;

      if (!matchesVariant && !matchesProduct) {
        return false;
      }

      // Location match: exact location ID or global
      const matchesLocation =
        !subLocationId ||
        subLocationId === 'global' ||
        subLocationId === webhookLocationId;

      return matchesLocation;
    });

    console.log(
      `[INVENTORY WEBHOOK] Found ${relevantSubs.length} relevant subscriptions for ${productTitle}`,
    );

    // 3. Process each subscription
    for (const sub of relevantSubs) {
      const fields = sub.fields.reduce(
        (acc: any, f: any) => ({...acc, [f.key]: f.value}),
        {},
      );
      const emailRecipient = fields.email;

      // Send Email
      const emailTemplate = getBackInStockTemplate(
        productTitle,
        variantTitle,
        branchName,
        PUBLIC_STORE_DOMAIN,
      );

      const emailResult = await sendEmail({
        to: emailRecipient,
        subject: emailTemplate.subject,
        text: emailTemplate.text,
        html: emailTemplate.html,
        env,
      });

      if (emailResult.success) {
        // 4. Delete subscription metaobject to prevent duplicate alerts
        const deleteMutation = `
          mutation MetaobjectDelete($id: ID!) {
            metaobjectDelete(id: $id) {
              deletedId
              userErrors {
                message
              }
            }
          }
        `;

        await fetch(adminApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': SHOPIFY_ADMIN_API_ACCESS_TOKEN,
          },
          body: JSON.stringify({
            query: deleteMutation,
            variables: {id: sub.id},
          }),
        });

        console.log(
          `[INVENTORY WEBHOOK] Alerted and Deleted: ${emailRecipient}`,
        );
      }
    }

    return data({success: true, processed: relevantSubs.length});
  } catch (error: any) {
    console.error('[INVENTORY WEBHOOK ERROR]', error);
    return data({error: error.message}, {status: 500});
  }
}
