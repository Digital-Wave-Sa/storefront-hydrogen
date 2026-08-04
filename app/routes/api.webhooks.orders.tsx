import type {ActionFunctionArgs} from 'react-router';
import {notifyOrderUpdate} from '~/lib/notifications.server';

/**
 * Shopify Order Notifications Webhook
 *
 * This route receives Shopify webhooks for order events
 * and triggers our custom Email/SMS notifications.
 */
export async function action({request, context}: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', {status: 405});
  }

  const {env} = context;

  try {
    const topic = request.headers.get('x-shopify-topic');
    const payload = (await request.json()) as any;

    if (!payload || !payload.id) {
      return Response.json(
        {success: false, error: 'Invalid payload'},
        {status: 400},
      );
    }

    console.log(`\n╔══════════════════════════════════════════╗`);
    console.log(`║  NOTIFICATION WEBHOOK: ${topic}              `);
    console.log(`╚══════════════════════════════════════════╝`);

    let stage: 'CONFIRMED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | null = null;

    const tagsLower = (payload.tags || '').toLowerCase();
    const isDeliveredOrPickedUp =
      payload.fulfillments?.some(
        (f: any) =>
          f.shipment_status === 'delivered' ||
          f.shipment_status === 'picked_up' ||
          f.status === 'success',
      ) ||
      payload.fulfillment_status === 'fulfilled' ||
      tagsLower.includes('delivered') ||
      tagsLower.includes('pickedup') ||
      tagsLower.includes('picked_up') ||
      tagsLower.includes('completed') ||
      tagsLower.includes('تم التوصيل') ||
      tagsLower.includes('تم الاستلام') ||
      tagsLower.includes('مكتمل');

    if (topic === 'orders/create') {
      stage = 'CONFIRMED';
    } else if (topic === 'orders/fulfilled') {
      stage = isDeliveredOrPickedUp ? 'DELIVERED' : 'OUT_FOR_DELIVERY';
    } else if (topic === 'orders/updated') {
      if (isDeliveredOrPickedUp) {
        stage = 'DELIVERED';
      }
    }

    if (stage) {
      console.log(
        `[Notification Webhook] Triggering ${stage} for Order #${payload.order_number}`,
      );

      const results = await notifyOrderUpdate({
        order: payload,
        stage,
        env,
      });

      console.log(`[Notification Webhook] Sent results:`, results);
    } else {
      console.log(`[Notification Webhook] Ignored topic: ${topic}`);
    }

    return Response.json({success: true});
  } catch (error: any) {
    console.error('[Notification Webhook] Error:', error);
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
    {status: 'Notification Webhook active. Use POST.'},
    {status: 200},
  );
}
