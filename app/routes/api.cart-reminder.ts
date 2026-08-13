import { data, type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router';
import {
  scheduleCartReminder,
  processDueReminders,
  getPendingReminders,
  cancelCartReminder,
} from '~/lib/cart-reminder.server';

export async function loader(args: LoaderFunctionArgs) {
  return handleCartReminderRequest(args);
}

export async function action(args: ActionFunctionArgs) {
  return handleCartReminderRequest(args);
}

async function handleCartReminderRequest({ request, context }: LoaderFunctionArgs | ActionFunctionArgs) {
  const { storefront, session, env } = context;
  const url = new URL(request.url);
  const body = request.method === 'POST' ? await request.formData().catch(() => new FormData()) : new FormData();

  const actionType = String(body.get('action') || url.searchParams.get('action') || 'list');
  const emailInput = String(body.get('email') || url.searchParams.get('email') || '').trim();
  const delayMinutesInput = parseInt(
    String(body.get('delayMinutes') || url.searchParams.get('delayMinutes') || '10'),
    10,
  );

  if (actionType === 'list') {
    return data({
      status: 'ok',
      pendingReminders: getPendingReminders(),
    });
  }

  if (actionType === 'process-due' || actionType === 'check') {
    const result = await processDueReminders(env);
    return data({
      status: 'ok',
      message: `Processed ${result.processed} due reminders, sent ${result.sent} emails.`,
      result,
      pendingReminders: getPendingReminders(),
    });
  }

  // Resolve user email
  let targetEmail = emailInput;
  if (!targetEmail) {
    targetEmail = (await session.get('loginCustomerEmail')) || (await session.get('otpEmail')) || '';
  }

  if (actionType === 'cancel') {
    if (targetEmail) cancelCartReminder(targetEmail);
    return data({ status: 'ok', message: `Cancelled cart reminder for ${targetEmail}` });
  }

  if (!targetEmail || !targetEmail.includes('@')) {
    return data(
      {
        error: 'A valid email address is required to schedule or test an abandoned cart reminder.',
        hint: 'Please append your email address in the URL: ?action=test-now&email=your_email@example.com',
      },
      { status: 400 },
    );
  }

  const cart = await context.cart.get().catch(() => null);
  const lang = storefront.i18n.language === 'EN' ? 'en' : 'ar';
  const cartUrl = `${env.PUBLIC_STORE_DOMAIN || 'https://saadeddin.com'}${lang === 'en' ? '/en' : ''}/cart`;

  const items =
    cart?.lines?.nodes?.map((line: any) => ({
      title: line.merchandise?.product?.title || line.merchandise?.title || 'Saadeddin Product',
      quantity: line.quantity,
      price: line.merchandise?.price?.amount || '0',
    })) || [
      {
        title: 'Luxury Saadeddin Sweets Box',
        quantity: 1,
        price: '150.00',
      },
    ];

  const subtotal = cart?.cost?.subtotalAmount?.amount || '150.00';
  const checkoutUrl = cart?.checkoutUrl || cartUrl;

  const reminder = scheduleCartReminder({
    cartId: cart?.id || `cart_${Date.now()}`,
    email: targetEmail,
    items,
    subtotal,
    checkoutUrl,
    language: lang,
    delayMinutes: delayMinutesInput,
  });

  if (actionType === 'test-now') {
    console.log(`[CART REMINDER TEST] Triggering immediate email test to ${targetEmail}...`);
    reminder!.remindAt = Date.now() - 1000;
    const result = await processDueReminders(env);
    return data({
      status: 'ok',
      message: `Immediate test email sent to ${targetEmail}! Check your inbox.`,
      reminder,
      result,
    });
  }

  return data({
    status: 'ok',
    message: `Abandoned cart reminder scheduled for ${targetEmail}! Email will send in ${delayMinutesInput} minutes.`,
    reminder,
  });
}
