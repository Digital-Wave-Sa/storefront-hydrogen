/**
 * Saadeddin Bilingual Notification Templates
 * Handles Email (HTML) and SMS templates for both Arabic and English.
 */

export type OrderStage = 'CONFIRMED' | 'PREPARING' | 'OUT_FOR_DELIVERY' | 'DELIVERED';
export type Language = 'AR' | 'EN';

interface OrderData {
  orderNumber: string;
  customerName: string;
  trackingUrl?: string;
  totalPrice?: string;
  items?: Array<{ title: string; quantity: number; price: string }>;
  expectedDelivery?: string;
}

export function getNotificationTemplates(stage: OrderStage, lang: Language, data: OrderData) {
  const isEn = lang === 'EN';
  
  return {
    email: getEmailTemplate(stage, lang, data),
    sms: getSMSTemplate(stage, lang, data)
  };
}

/**
 * --- SMS TEMPLATES ---
 * Constraints: Max 160 chars (AR), 320 chars (EN)
 */
function getSMSTemplate(stage: OrderStage, lang: Language, data: OrderData): string {
  const { orderNumber, trackingUrl } = data;
  const isEn = lang === 'EN';

  switch (stage) {
    case 'CONFIRMED':
      return isEn 
        ? `Order #${orderNumber} confirmed! We're starting to prepare your treats. Track it: ${trackingUrl || 'N/A'}`
        : `تم تأكيد طلبك رقم #${orderNumber}. سنبدأ في تحضير طلبك قريباً. تتبعه هنا: ${trackingUrl || 'N/A'}`;
    
    case 'PREPARING':
      return isEn 
        ? `Great news! Your order #${orderNumber} is now being prepared by our pastry chefs.`
        : `خبر سعيد! طلبك رقم #${orderNumber} قيد التحضير الآن بواسطة طهاتنا المبدعين.`;

    case 'OUT_FOR_DELIVERY':
      return isEn 
        ? `Your order #${orderNumber} is out for delivery! Our courier is on the way. Enjoy! Track: ${trackingUrl || 'N/A'}`
        : `طلبك رقم #${orderNumber} في الطريق إليك الآن مع مندوبنا. بالهناء والشفاء! تتبع الموقع: ${trackingUrl || 'N/A'}`;

    case 'DELIVERED':
      return isEn 
        ? `Order #${orderNumber} has been delivered. Thank you for choosing Saadeddin! Hope you enjoy your sweet moments.`
        : `تم توصيل طلبك رقم #${orderNumber}. شكراً لاختيارك سعد الدين! نأمل أن تستمتع بلحظاتك السعيدة.`;
    
    default:
      return '';
  }
}

/**
 * --- EMAIL TEMPLATES ---
 * Premium responsive HTML with RTL/LTR support
 */
function getEmailTemplate(stage: OrderStage, lang: Language, data: OrderData) {
  const isEn = lang === 'EN';
  const dir = isEn ? 'ltr' : 'rtl';
  const textAlign = isEn ? 'left' : 'right';
  const { customerName, orderNumber, items, totalPrice, trackingUrl, expectedDelivery } = data;

  const stageTitles = {
    CONFIRMED: isEn ? 'Order Confirmed' : 'تم تأكيد طلبك',
    PREPARING: isEn ? 'Preparing Your Order' : 'تحضير طلبك',
    OUT_FOR_DELIVERY: isEn ? 'Out for Delivery' : 'قيد التوصيل',
    DELIVERED: isEn ? 'Delivered' : 'تم التوصيل'
  };

  const stageMessages = {
    CONFIRMED: isEn ? 'We have received your order and started processing it.' : 'لقد استلمنا طلبك وبدأنا في معالجته.',
    PREPARING: isEn ? 'Your favorite treats are being freshly prepared right now.' : 'تجري حالياً عملية تحضير حلوياتك المفضلة بعناية.',
    OUT_FOR_DELIVERY: isEn ? 'Our driver is on the way to your doorstep!' : 'مندوبنا في الطريق إلى باب منزلك الآن!',
    DELIVERED: isEn ? 'Your order has arrived. We hope you love it!' : 'وصل طلبك بنجاح. نأمل أن ينال إعجابك!'
  };

  // Progress Bar Logic
  const steps = ['CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'];
  const activeIndex = steps.indexOf(stage);

  const progressHtml = steps.map((s, i) => {
    const active = i <= activeIndex;
    const color = active ? '#234745' : '#e0e0e0';
    const label = isEn 
      ? (s === 'CONFIRMED' ? 'Confirmed' : s === 'PREPARING' ? 'Preparing' : s === 'OUT_FOR_DELIVERY' ? 'Shipping' : 'Delivered')
      : (s === 'CONFIRMED' ? 'تم التأكيد' : s === 'PREPARING' ? 'التحضير' : s === 'OUT_FOR_DELIVERY' ? 'التوصيل' : 'تم التوصيل');

    return `
      <div style="flex: 1; text-align: center;">
        <div style="height: 4px; background: ${color}; margin-bottom: 8px;"></div>
        <span style="font-size: 10px; font-weight: bold; color: ${color};">${label}</span>
      </div>
    `;
  }).join('');

  return {
    subject: `[Saadeddin] ${stageTitles[stage]} - #${orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html lang="${lang.toLowerCase()}" dir="${dir}">
      <head>
        <meta charset="UTF-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&family=Outfit:wght@400;700;900&display=swap');
          body { font-family: ${isEn ? "'Outfit', sans-serif" : "'Cairo', sans-serif"}; }
        </style>
      </head>
      <body style="margin: 0; padding: 20px; background-color: #fcfaf5;">
        <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 40px rgba(27,61,46,0.05); border: 1px solid #f0eee9;">
          
          <!-- Header -->
          <div style="background: #234745; padding: 40px 20px; text-align: center;">
            <img src="https://saadaldeen.com/cdn/shop/files/Logo_White.png" alt="Saadeddin" style="height: 50px; margin-bottom: 10px;">
            <div style="color: #fff; opacity: 0.6; font-size: 10px; letter-spacing: 3px; font-weight: bold; text-transform: uppercase;">Premium Quality Since 1979</div>
          </div>

          <!-- Body -->
          <div style="padding: 40px 30px; text-align: center;">
            <h2 style="color: #234745; font-size: 28px; font-weight: 900; margin: 0 0 10px 0;">${stageTitles[stage]}</h2>
            <p style="color: #666; font-size: 16px; margin: 0 0 40px 0;">${isEn ? 'Hi' : 'مرحباً'} ${customerName}, ${stageMessages[stage]}</p>

            <!-- Progress Tracker -->
            <div style="display: flex; gap: 10px; margin-bottom: 40px; justify-content: space-between;">
              ${progressHtml}
            </div>

            <!-- Order Details Box -->
            <div style="background: #fdfaf5; border: 1.5px solid #f0eee9; border-radius: 20px; padding: 30px; text-align: ${textAlign};">
              <div style="display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 1px dashed #f0eee9; padding-bottom: 15px;">
                <span style="font-weight: bold; color: #234745;">${isEn ? 'Order Number' : 'رقم الطلب'}</span>
                <span style="font-weight: 900; color: #234745;">#${orderNumber}</span>
              </div>

              ${items ? `
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                  ${items.map(item => `
                    <tr>
                      <td style="padding: 10px 0; color: #444; font-size: 14px;">${item.quantity}x ${item.title}</td>
                      <td style="padding: 10px 0; text-align: ${isEn ? 'right' : 'left'}; font-weight: bold; color: #234745;">${item.price}</td>
                    </tr>
                  `).join('')}
                </table>
              ` : ''}

              <div style="display: flex; justify-content: space-between; padding-top: 15px; border-top: 2px solid #234745;">
                <span style="font-weight: 900; font-size: 18px; color: #234745;">${isEn ? 'Total' : 'الإجمالي'}</span>
                <span style="font-weight: 900; font-size: 18px; color: #234745;">${totalPrice}</span>
              </div>
            </div>

            <!-- Tracking / Actions -->
            <div style="margin-top: 40px;">
              ${trackingUrl ? `
                <a href="${trackingUrl}" style="background: #234745; color: #fff; padding: 18px 40px; text-decoration: none; border-radius: 14px; font-weight: 900; display: inline-block; font-size: 15px; box-shadow: 0 10px 20px rgba(27,61,46,0.2);">
                  ${isEn ? 'TRACK YOUR ORDER' : 'تتبع طلبك الآن'}
                </a>
              ` : ''}
              
              ${expectedDelivery ? `
                <p style="color: #888; font-size: 12px; margin-top: 20px;">
                   ${isEn ? 'Estimated Delivery' : 'وقت التوصيل المتوقع'}: <strong>${expectedDelivery}</strong>
                </p>
              ` : ''}
            </div>
          </div>

          <!-- Footer -->
          <div style="background: #f9f9f9; padding: 30px; text-align: center; border-top: 1px solid #f0eee9;">
             <p style="color: #999; font-size: 11px; margin: 0 0 10px 0;">${isEn ? 'Sweetening your occasions since 1979' : 'نحلي مناسباتكم منذ عام 1979'}</p>
             <div style="font-weight: bold; color: #234745; font-size: 14px;">Saadeddin Pastry | سعد الدين حلويات</div>
          </div>

        </div>
      </body>
      </html>
    `
  };
}

