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
  env,
  channels = ['email', 'sms'],
  extra,
}: {
  order: any, 
  stage: OrderStage,
  env: any,
  /**
   * Which channels this stage uses. Defaults to both, so every existing caller
   * behaves exactly as before; the ready-for-delivery notification passes
   * ['email'] because SMS costs money per message and that stage is a courtesy,
   * not something the shopper has to act on.
   */
  channels?: Array<'email' | 'sms'>,
  /** Stage-specific template data, e.g. the branch name for a pickup. */
  extra?: Record<string, unknown>,
}) {
  /**
   * The order's own locale, not the customer record's.
   *
   * `customer.locale` is the language on the CUSTOMER, which for these shoppers
   * is usually unset -- so every notification fell to the Arabic default,
   * including for people who bought the whole way through in English. Shopify
   * stamps the checkout's language onto the order as `customerLocale`
   * ("ar-SA" / "en"), which is the one that answers "what language did they
   * buy in". The customer record and the old default remain as fallbacks.
   */
  const localeRaw = String(
    order.customerLocale ||
    order.customer_locale ||
    order.customer?.locale ||
    '',
  ).toLowerCase();
  const lang: Language = localeRaw.startsWith('en') ? 'EN' : 'AR';
  
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
    expectedDelivery: '24-48 Hours', // This can be dynamic based on branch logic
    ...(extra || {}),
  };

  // 3. Get Templates
  const { email, sms } = getNotificationTemplates(stage, lang, orderData);

  const results: { email?: any, sms?: any } = {};

  // 4. Dispatch Email
  /*
    Say who it went to, and when it could not go at all. This used to hand
    sendEmail an empty or placeholder address and report nothing: sendEmail
    returns false rather than throwing, so the webhook logged «sent» and marked
    the stage done for an email that never left.
  */
  const toEmail = String(order.customer?.email || order.email || order.contact_email || '').trim();
  const emailUsable =
    !!toEmail && !toEmail.toLowerCase().endsWith('@saadeddin.placeholder');
  if (channels.includes('email') && !emailUsable) {
    console.warn(
      `[NOTIFY] ${stage} email skipped for #${orderData.orderNumber}: ` +
        (toEmail ? `placeholder address ${toEmail}` : 'order has no email'),
    );
    results.email = false;
  }
  if (channels.includes('email') && emailUsable) {
  try {
    results.email = await sendEmail({
      to: toEmail,
      subject: email.subject,
      html: email.html,
      text: sms, // Use SMS text as fallback text version
      env
    });
    console.log(
      `[NOTIFY] ${stage} email to ${toEmail} for #${orderData.orderNumber}: ${results.email ? 'sent' : 'FAILED (no mail provider accepted it — check SMTP/Graph/Resend env vars)'}`,
    );
  } catch (e) {
    console.error('[NOTIFY ERROR - EMAIL]', e);
    results.email = false;
  }
  }

  // 5. Dispatch SMS
  if (channels.includes('sms') && order.customer?.phone) {
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

