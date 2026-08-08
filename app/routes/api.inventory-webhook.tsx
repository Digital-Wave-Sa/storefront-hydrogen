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
  const {getAdminToken} = await import('~/lib/shopify-admin.server');
  const adminToken =
    (env as any)?.SHOPIFY_ADMIN_API_ACCESS_TOKEN ||
    (await getAdminToken(env || {}).catch(() => null));

  const getMyshopifyDomain = (envObj: any) => {
    if (envObj?.SHOPIFY_ADMIN_DOMAIN) {
      return envObj.SHOPIFY_ADMIN_DOMAIN.replace(/^https?:\/\//, '').replace(/\/$/, '');
    }
    if (envObj?.SHOPIFY_SHOP && String(envObj.SHOPIFY_SHOP).includes('myshopify.com')) {
      return envObj.SHOPIFY_SHOP;
    }
    return 'saadeldeenshop-x21xumcd.myshopify.com';
  };

  const shopDomain = getMyshopifyDomain(env);

  try {
    const payload = (await request.json()) as any;
    const {inventory_item_id, location_id, available} = payload;

    // Helper to extract clean numeric ID from GID or raw string
    const extractId = (val: any) => {
      if (!val) return '';
      const str = String(val).trim();
      if (str.includes('/')) {
        return str.split('/').pop() || '';
      }
      return str;
    };

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

    if (!adminToken || !shopDomain) {
      return data({error: 'Config missing: Admin Token or Shop Domain'}, {status: 500});
    }

    const adminApiUrl = `https://${shopDomain}/admin/api/2024-04/graphql.json`;

    const cleanLocId = extractId(location_id);
    const cleanItemId = extractId(inventory_item_id);

    // 1. Fetch Variant ID from Inventory Item ID and Location Name
    const findVariantQuery = `
      query GetVariantByInventoryItem($itemId: ID!, $locId: ID!) {
        inventoryItem(id: $itemId) {
          variant {
            id
            title
            product {
              id
              title
              handle
            }
          }
        }
        location(id: $locId) {
          name
        }
      }
    `;

    const findVariantRes = await fetch(adminApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': adminToken,
      },
      body: JSON.stringify({
        query: findVariantQuery,
        variables: {
          itemId: `gid://shopify/InventoryItem/${cleanItemId}`,
          locId: `gid://shopify/Location/${cleanLocId}`,
        },
      }),
    });

    const variantData = (await findVariantRes.json()) as any;
    console.log(`[INVENTORY WEBHOOK DIAG] adminApiUrl: ${adminApiUrl}, status: ${findVariantRes.status}, data:`, JSON.stringify(variantData));
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
    const productHandle = variant.product.handle || '';
    const productUrl = `https://${(env as any)?.PUBLIC_STORE_DOMAIN || 'saadeddin.com'}/products/${productHandle}`;

    const cleanVariantId = extractId(variantId);
    const cleanProductId = extractId(variant.product?.id);

    // 2. Fetch Shop ID and query Shop Metafields for subscriptions (namespace: stock_alerts)
    const getShopQuery = `
      query GetShopAndSubscriptions {
        shop {
          id
          metafields(namespace: "stock_alerts", first: 250) {
            nodes {
              id
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
        'X-Shopify-Access-Token': adminToken,
      },
      body: JSON.stringify({query: getShopQuery}),
    });

    const subData = (await subRes.json()) as any;
    const allMetafields = subData.data?.shop?.metafields?.nodes || [];

    const parsedSubs = allMetafields
      .map((m: any) => {
        try {
          const parsed = JSON.parse(m.value);
          return {metafieldId: m.id, key: m.key, ...parsed};
        } catch (_) {
          return null;
        }
      })
      .filter(Boolean);

    // Filter relevant subs: MUST strictly match exact variant_id or product_id AND location_id
    const relevantSubs = parsedSubs.filter((fields: any) => {
      if (!fields.email || !fields.email.includes('@')) return false;

      const subVariantId = extractId(fields.variant_id);
      const subProductId = extractId(fields.product_id);
      const subLocationId = extractId(fields.location_id);
      const webhookLocationId = extractId(location_id);

      // Strict item match: must match restocked variant_id or product_id
      const matchesVariant =
        subVariantId && cleanVariantId && subVariantId === cleanVariantId;
      const matchesProduct =
        subProductId && cleanProductId && subProductId === cleanProductId;

      if (!matchesVariant && !matchesProduct) {
        return false;
      }

      // Strict location match:
      // Subscribed location MUST strictly match the webhook's location_id
      if (!subLocationId || subLocationId === '' || subLocationId === 'global') {
        console.log(
          `[INVENTORY WEBHOOK] Skipping sub for ${fields.email} — subscription has no specific location ID (${subLocationId})`,
        );
        return false;
      }

      const matchesLocation = subLocationId === webhookLocationId;

      if (!matchesLocation) {
        console.log(
          `[INVENTORY WEBHOOK] Skipping sub for ${fields.email} — subscribed location (${subLocationId}) ≠ restocked location (${webhookLocationId})`,
        );
      }

      return matchesLocation;
    });

    console.log(
      `[INVENTORY WEBHOOK] Found ${relevantSubs.length} relevant subscriptions for ${productTitle}`,
    );

    // 3. Process each subscription
    for (const sub of relevantSubs) {
      const emailRecipient = sub.email;

      // Send Email
      const emailTemplate = getBackInStockTemplate({
        productTitle,
        variantTitle,
        productUrl,
        language: 'AR',
      });

      const emailResult = await sendEmail({
        to: emailRecipient,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        env,
      });

      if (emailResult) {
        // 4. Delete subscription metafield to prevent duplicate alerts
        const numericMetafieldId = extractId(sub.metafieldId);
        try {
          await fetch(
            `https://${shopDomain}/admin/api/2024-04/metafields/${numericMetafieldId}.json`,
            {
              method: 'DELETE',
              headers: {
                'X-Shopify-Access-Token': adminToken,
              },
            },
          );
          console.log(
            `[INVENTORY WEBHOOK] Alerted and Deleted Metafield: ${numericMetafieldId} (${emailRecipient})`,
          );
        } catch (delErr) {
          console.warn('[INVENTORY WEBHOOK DELETE WARN]', delErr);
        }
      }
    }

    return data({success: true, processed: relevantSubs.length});
  } catch (error: any) {
    console.error('[INVENTORY WEBHOOK ERROR]', error);
    return data({error: error.message}, {status: 500});
  }
}
