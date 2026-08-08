import type {ActionFunctionArgs} from 'react-router';
import {syncOrderToCRM} from '~/lib/crm-orders.server';
import {getAdminToken} from '~/lib/shopify-admin.server';
import {extractMinTime} from '~/lib/time-utils';

/**
 * Shopify Order Webhook → CRM/ERP Sync
 *
 * This route receives Shopify 'orders/create' webhook payloads
 * and syncs them to the Saadeddin CRM/ERP system.
 *
 * Flow:
 * 1. Validate the webhook payload
 * 2. Extract customer info, line items, and fulfillment type
 * 3. Call syncOrderToCRM() which handles search/create customer + create order
 * 4. Store the CRM salesorder_no back as order metafield in Shopify
 */
export async function action({request, context}: ActionFunctionArgs) {
  // Only accept POST requests
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', {status: 405});
  }

  const {env} = context;

  try {
    const payload = (await request.json()) as any;

    // Basic validation
    if (!payload || !payload.id || !payload.order_number) {
      console.error(
        '[CRM Webhook] Invalid payload: missing id or order_number',
      );
      return Response.json(
        {success: false, error: 'Invalid payload'},
        {status: 400},
      );
    }

    console.log(`\n╔══════════════════════════════════════════╗`);
    console.log(`║  CRM WEBHOOK: Order #${payload.order_number}              `);
    console.log(`╚══════════════════════════════════════════╝`);

    // Extract customer info
    const customer = payload.customer || {};
    const shippingAddress =
      payload.shipping_address || payload.billing_address || {};
    const customerName =
      [customer.first_name, customer.last_name].filter(Boolean).join(' ') ||
      'Guest';
    const customerPhone = customer.phone || shippingAddress.phone || '';
    const customerEmail = customer.email || '';

    // Determine fulfillment type from cart attributes or shipping method
    const cartAttributes = payload.note_attributes || [];
    const fulfillmentAttr = cartAttributes.find(
      (a: any) => a.name === 'fulfillment_type',
    );
    let fulfillmentType: 'Pick Up' | 'Delivery' = 'Delivery';

    if (fulfillmentAttr?.value === 'pickup') {
      fulfillmentType = 'Pick Up';
    } else if (
      payload.shipping_lines?.length === 0 &&
      !payload.shipping_address
    ) {
      fulfillmentType = 'Pick Up';
    }

    // Build delivery address string
    const addressParts = [
      shippingAddress.address1,
      shippingAddress.address2,
      shippingAddress.city,
      shippingAddress.province,
    ].filter(Boolean);
    let addressString = addressParts.join(', ') || 'N/A';

    const timeSlotAttr = cartAttributes.find(
      (a: any) => a.name === 'Time Slot',
    );
    if (timeSlotAttr?.value) {
      const minTime = extractMinTime(timeSlotAttr.value);
      addressString += ` [Schedule: ${minTime}]`;
    }

    // Extract due date from cart attributes or use order date
    const dueDateAttr = cartAttributes.find(
      (a: any) => a.name === 'delivery_date',
    );
    const dueDate =
      dueDateAttr?.value ||
      payload.created_at?.split('T')[0] ||
      new Date().toISOString().split('T')[0];

    // Map line items
    const lineItems = (payload.line_items || []).map((item: any) => ({
      sku: item.sku || item.variant_id?.toString() || 'UNKNOWN',
      name: item.name || item.title || 'Product',
      quantity: item.quantity || 1,
      price: parseFloat(item.price) || 0,
      note:
        item.properties?.map((p: any) => `${p.name}: ${p.value}`).join('; ') ||
        '',
    }));

    // Skip if no phone number (can't sync without it)
    if (!customerPhone) {
      console.warn(
        `[CRM Webhook] Order #${payload.order_number} has no customer phone. Skipping CRM sync.`,
      );
      return Response.json({
        success: true,
        skipped: true,
        reason: 'No customer phone number',
      });
    }

    // Deduct loyalty points if they were applied in the cart
    const loyaltyPointsAttr = cartAttributes.find(
      (a: any) => a.name === 'loyalty_points' || a.key === 'loyalty_points',
    );
    if (loyaltyPointsAttr?.value) {
      const pointsToRedeem = parseInt(loyaltyPointsAttr.value) || 0;
      if (pointsToRedeem > 0) {
        try {
          const {redeemMockPoints} = await import('~/lib/mock-loyalty.server');
          redeemMockPoints(customerPhone, pointsToRedeem);
          console.log(
            `[CRM Webhook] Statefully deducted ${pointsToRedeem} points for ${customerPhone} on Order completion.`,
          );
        } catch (e: any) {
          console.error('[CRM Webhook] Failed to deduct points:', e.message);
        }
      }
    }

    // Sync to CRM
    const result = await syncOrderToCRM(
      {
        orderName: payload.name || `#${payload.order_number}`,
        orderNumber: String(payload.order_number),
        customerName,
        customerPhone,
        customerEmail,
        fulfillmentType,
        shippingAddress: addressString,
        dueDate,
        lineItems,
      },
      env,
    );

    // If sync succeeded, store the CRM reference back in Shopify as order metafield
    if (result.success && result.salesorderNo) {
      try {
        const adminToken = await getAdminToken(env);
        const shopDomain = env.PUBLIC_STORE_DOMAIN;

        await fetch(`https://${shopDomain}/admin/api/2024-10/graphql.json`, {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': adminToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
              metafieldsSet(metafields: $metafields) {
                metafields { key value }
                userErrors { field message }
              }
            }`,
            variables: {
              metafields: [
                {
                  ownerId: `gid://shopify/Order/${payload.id}`,
                  namespace: 'crm',
                  key: 'salesorder_no',
                  value: result.salesorderNo,
                  type: 'single_line_text_field',
                },
                {
                  ownerId: `gid://shopify/Order/${payload.id}`,
                  namespace: 'crm',
                  key: 'customer_id',
                  value: result.crmCustomerId || '',
                  type: 'single_line_text_field',
                },
                {
                  ownerId: `gid://shopify/Order/${payload.id}`,
                  namespace: 'crm',
                  key: 'synced_at',
                  value: new Date().toISOString(),
                  type: 'single_line_text_field',
                },
              ],
            },
          }),
        });

        console.log(
          `[CRM Webhook] ✅ Saved CRM ref ${result.salesorderNo} to Shopify Order #${payload.order_number}`,
        );
      } catch (e) {
        console.error(
          '[CRM Webhook] Failed to save CRM metafield to order:',
          e,
        );
      }
    }

    console.log(
      `[CRM Webhook] Final result for Order #${payload.order_number}:`,
      result,
    );

    return Response.json({
      success: result.success,
      salesorderNo: result.salesorderNo,
      crmCustomerId: result.crmCustomerId,
      error: result.error,
    });
  } catch (error: any) {
    console.error('[CRM Webhook] Unhandled error:', error);
    return Response.json(
      {
        success: false,
        error: error.message,
      },
      {status: 500},
    );
  }
}

// Block GET requests
export async function loader() {
  return Response.json(
    {status: 'CRM Webhook endpoint active. Use POST.'},
    {status: 200},
  );
}
