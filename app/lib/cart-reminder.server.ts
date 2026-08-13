import fs from 'fs';
import path from 'path';
import { sendEmail } from './email.server';

export interface PendingCartReminder {
  id: string;
  cartId: string;
  email: string;
  phone?: string;
  items: Array<{
    title: string;
    quantity: number;
    price: string | number;
    image?: string;
  }>;
  subtotal: string | number;
  checkoutUrl: string;
  scheduledAt: number;
  remindAt: number;
  status: 'PENDING' | 'SENT' | 'CANCELLED';
  language: 'en' | 'ar';
}

const STORAGE_PATH = path.resolve(process.cwd(), 'scratch_cart_reminders.json');

function readReminders(): PendingCartReminder[] {
  try {
    if (fs.existsSync(STORAGE_PATH)) {
      const data = fs.readFileSync(STORAGE_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('[CART REMINDER] Error reading reminders file:', e);
  }
  return [];
}

function writeReminders(reminders: PendingCartReminder[]) {
  try {
    fs.writeFileSync(STORAGE_PATH, JSON.stringify(reminders, null, 2), 'utf8');
  } catch (e) {
    console.error('[CART REMINDER] Error writing reminders file:', e);
  }
}

/**
 * Schedules or updates a cart reminder for 10 minutes from now (or custom minutes for testing)
 */
export function scheduleCartReminder({
  cartId,
  email,
  phone,
  items,
  subtotal,
  checkoutUrl,
  language = 'ar',
  delayMinutes = 10,
}: {
  cartId: string;
  email: string;
  phone?: string;
  items: Array<{ title: string; quantity: number; price: string | number; image?: string }>;
  email?: string;
  subtotal: string | number;
  checkoutUrl: string;
  language?: 'en' | 'ar';
  delayMinutes?: number;
}): PendingCartReminder | null {
  if (!email || !email.includes('@')) {
    console.log('[CART REMINDER] No valid email provided for reminder, skipping.');
    return null;
  }

  const reminders = readReminders();
  const now = Date.now();
  const remindAt = now + delayMinutes * 60 * 1000;

  // Check if reminder already exists for this email/cart
  const existingIdx = reminders.findIndex((r) => r.email === email && r.status === 'PENDING');

  const reminderData: PendingCartReminder = {
    id: existingIdx >= 0 ? reminders[existingIdx].id : `rem_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    cartId,
    email,
    phone,
    items,
    subtotal,
    checkoutUrl,
    scheduledAt: now,
    remindAt,
    status: 'PENDING',
    language,
  };

  if (existingIdx >= 0) {
    reminders[existingIdx] = reminderData;
  } else {
    reminders.push(reminderData);
  }

  writeReminders(reminders);
  console.log(
    `[CART REMINDER] Scheduled ${delayMinutes}-min email reminder for ${email} at ${new Date(remindAt).toLocaleTimeString()}`,
  );
  return reminderData;
}

/**
 * Cancels pending cart reminder if order completed or cart emptied
 */
export function cancelCartReminder(emailOrCartId: string) {
  const reminders = readReminders();
  let updated = false;
  for (const r of reminders) {
    if ((r.email === emailOrCartId || r.cartId === emailOrCartId) && r.status === 'PENDING') {
      r.status = 'CANCELLED';
      updated = true;
    }
  }
  if (updated) {
    writeReminders(reminders);
    console.log(`[CART REMINDER] Cancelled pending reminder for ${emailOrCartId}`);
  }
}

/**
 * Checks all pending reminders and dispatches emails if 10 minutes have elapsed
 */
export async function processDueReminders(env: any): Promise<{ processed: number; sent: number }> {
  const reminders = readReminders();
  const now = Date.now();
  let processed = 0;
  let sent = 0;

  for (const r of reminders) {
    if (r.status === 'PENDING' && now >= r.remindAt) {
      processed++;
      console.log(`[CART REMINDER] Processing due 10-min reminder for ${r.email}...`);

      const success = await sendCartReminderEmail(r, env);
      if (success) {
        r.status = 'SENT';
        sent++;
        console.log(`[CART REMINDER SUCCESS] Sent 10-min reminder email to ${r.email}`);
      }
    }
  }

  if (processed > 0) {
    writeReminders(reminders);
  }

  return { processed, sent };
}

export function getPendingReminders(): PendingCartReminder[] {
  return readReminders();
}

async function sendCartReminderEmail(reminder: PendingCartReminder, env: any): Promise<boolean> {
  const isEn = reminder.language === 'en';
  const subject = isEn
    ? '🛒 You left something delicious in your cart at Saadeddin!'
    : '🛒 نسيت بعض الحلويات الشهية في سلتك في سعد الدين!';

  const itemsHtml = reminder.items
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #EAEAEA; color: #171717; font-weight: 600;">
        ${item.title}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #EAEAEA; color: #707070; text-align: center;">
        x${item.quantity}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #EAEAEA; color: #234745; font-weight: 700; text-align: right;">
        ${item.price} SAR
      </td>
    </tr>
  `,
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html lang="${reminder.language}" dir="${isEn ? 'ltr' : 'rtl'}">
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'GE Dinar One', Arial, sans-serif; background-color: #FAFAFA; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid #EAEAEA; }
        .header { background: #234745; padding: 24px; text-align: center; color: #FEF8EB; }
        .content { padding: 32px 24px; }
        .title { font-size: 20px; font-weight: bold; color: #234745; margin-bottom: 12px; text-align: center; }
        .subtitle { font-size: 14px; color: #707070; margin-bottom: 24px; text-align: center; line-height: 1.6; }
        .cart-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        .total-box { background: #FCF7ED; border: 1px solid #EAD6BA; border-radius: 12px; padding: 16px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; }
        .cta-btn { display: block; width: 80%; margin: 0 auto; background: #234745; color: #FEF8EB !important; text-decoration: none; text-align: center; padding: 14px 24px; border-radius: 25px; font-weight: bold; font-size: 16px; }
        .footer { background: #F5F5F5; padding: 16px; text-align: center; font-size: 12px; color: #888888; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 24px; letter-spacing: 1px;">SAADEDDIN</h1>
          <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.8;">${isEn ? 'Authentic Taste Since 1919' : 'طعم أصيل منذ عام ١٩١٩'}</p>
        </div>
        <div class="content">
          <div class="title">${isEn ? 'Your Cart is Waiting for You! 🍰' : 'حلوياتك بانتظارك في السلة! 🍰'}</div>
          <div class="subtitle">
            ${
              isEn
                ? "We noticed you left some delicious items in your cart. Complete your order now before items sell out!"
                : "لاحظنا أنك تركت بعض المنتجات الشهية في سلتك. أكمل طلبك الآن قبل نفاد الكمية!"
            }
          </div>

          <table class="cart-table">
            <thead>
              <tr style="background: #F9F9F9; text-align: left; font-size: 12px; color: #707070;">
                <th style="padding: 10px 12px;">${isEn ? 'Item' : 'المنتج'}</th>
                <th style="padding: 10px 12px; text-align: center;">${isEn ? 'Qty' : 'الكمية'}</th>
                <th style="padding: 10px 12px; text-align: right;">${isEn ? 'Price' : 'السعر'}</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="total-box">
            <span style="font-weight: bold; color: #171717;">${isEn ? 'Total Subtotal:' : 'إجمالي المجموع:'}</span>
            <span style="font-weight: bold; color: #234745; font-size: 18px;">${reminder.subtotal} SAR</span>
          </div>

          <a href="${reminder.checkoutUrl}" class="cta-btn">
            ${isEn ? 'Complete Your Order Now' : 'أكمل طلبك الآن'}
          </a>
        </div>
        <div class="footer">
          ${isEn ? 'Saadeddin Pastry — All Rights Reserved' : 'حلويات سعد الدين — جميع الحقوق محفوظة'}
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await sendEmail({
      to: reminder.email,
      subject,
      html,
      env,
    });
    return true;
  } catch (err) {
    console.error('[CART REMINDER] Failed to send email via sendEmail:', err);
    return false;
  }
}
