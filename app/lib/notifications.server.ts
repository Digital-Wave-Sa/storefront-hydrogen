import { sendEmail } from './email.server';
import { sendSMS } from './sms.server';
import { getNotificationTemplates } from './notification_templates';
import type { OrderStage, Language } from './notification_templates';

/**
 * Unified Notification Dispatcher
 * Orchestrates multi-channel notifications (Email + SMS)
 */
export async function notifyOrderUpdate({
  order,
  stage,
  env
}: {
  order: any, 
  stage: OrderStage,
  env: any
}) {
  // 1. Determine Language (Default to AR if not specified)
  const lang: Language = (order.customer?.locale?.toUpperCase() === 'EN') ? 'EN' : 'AR';
  
  // 2. Prepare Data for Templates
  const orderData = {
    orderNumber: order.orderNumber || order.order_number?.toString() || order.name?.replace('#', ''),
    customerName: `${order.customer?.firstName || order.customer?.first_name || ''} ${order.customer?.lastName || order.customer?.last_name || ''}`.trim() || 'Valued Customer',
    trackingUrl: order.statusPageUrl || order.order_status_url || `https://${env.PUBLIC_STORE_DOMAIN}/account/orders`,
    totalPrice: order.totalPriceSet?.shopMoney?.amount ? 
      `${order.totalPriceSet.shopMoney.amount} ${order.totalPriceSet.shopMoney.currencyCode}` : 
      (order.total_price ? `${order.total_price} ${order.currency}` : 'N/A'),
    items: (order.lineItems?.nodes || order.line_items || []).map((item: any) => ({
      title: item.title || item.name,
      quantity: item.quantity,
      price: item.originalTotalPriceSet?.shopMoney?.amount ? 
        `${item.originalTotalPriceSet.shopMoney.amount} ${item.originalTotalPriceSet.shopMoney.currencyCode}` : 
        (item.price ? `${item.price} ${order.currency || 'SAR'}` : 'N/A')
    })),
    expectedDelivery: '24-48 Hours' // This can be dynamic based on branch logic
  };

  // 3. Get Templates
  const { email, sms } = getNotificationTemplates(stage, lang, orderData);

  const results: { email?: any, sms?: any } = {};

  // 4. Dispatch Email
  try {
    results.email = await sendEmail({
      to: order.customer?.email || '',
      subject: email.subject,
      html: email.html,
      text: sms, // Use SMS text as fallback text version
      env
    });
  } catch (e) {
    console.error('[NOTIFY ERROR - EMAIL]', e);
  }

  // 5. Dispatch SMS
  if (order.customer?.phone) {
    try {
      results.sms = await sendSMS({
        to: order.customer.phone,
        message: sms,
        env
      });
    } catch (e) {
      console.error('[NOTIFY ERROR - SMS]', e);
    }
  }

  return results;
}

