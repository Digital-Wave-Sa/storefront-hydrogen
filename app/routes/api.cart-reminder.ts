import { data, type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router';
import {
  scheduleCartReminder,
  processDueReminders,
  getPendingReminders,
  cancelCartReminder,
} from '~/lib/cart-reminder.server';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  if (action === 'process-due' || action === 'check') {
    const result = await processDueReminders(context.env);
    return data({
      status: 'ok',
      message: `Processed ${result.processed} due reminders, sent ${result.sent} emails.`,
      result,
      pendingReminders: getPendingReminders(),
    });
  }

  return data({
    status: 'ok',
    pendingReminders: getPendingReminders(),
  });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { storefront, session, env } = context;
  const url = new URL(request.url);
  const body = await request.formData().catch(() => new FormData());

  const actionType = body.get('action') || url.searchParams.get('action') || 'schedule';
  const emailInput = String(body.get('email') || url.searchParams.get('email') || '').trim();
  const delayMinutesInput = parseInt(
    String(body.get('delayMinutes') || url.searchParams.get('delayMinutes') || '10'),
    10,
  );

  // 1. Resolve user email from input, session, or customer profile
  let targetEmail = emailInput;
  if (!targetEmail) {
    targetEmail = (await session.get('loginCustomerEmail')) || (await session.get('otpEmail')) || '';
  }

  // 2. Fetch active cart
  const cart = await context.cart.get().catch(() => null);
  const lang = storefront.i18n.language === 'EN' ? 'en' : 'ar';
  const cartUrl = `${env.PUBLIC_STORE_DOMAIN || 'https://saadeddin.com'}${lang === 'en' ? '/en' : ''}/cart`;

  if (actionType === 'cancel') {
    if (targetEmail) cancelCartReminder(targetEmail);
    return data({ status: 'ok', message: `Cancelled cart reminder for ${targetEmail}` });
  }

  if (actionType === 'process-due') {
    const result = await processDueReminders(env);
    return data({
      status: 'ok',
      message: `Processed ${result.processed} due reminders, sent ${result.sent} emails.`,
      result,
    });
  }

  // 3. Schedule or test reminder
  if (!targetEmail || !targetEmail.includes('@')) {
    return data(
      {
        error: 'A valid email address is required to schedule an abandoned cart reminder.',
        hint: 'Please provide your email address in the request parameter: ?email=your_email@example.com',
      },
      { status: 400 },
    );
  }

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

  // If action is test-now (send immediately for testing)
  if (actionType === 'test-now') {
    console.log(`[CART REMINDER TEST] Triggering immediate email test to ${targetEmail}...`);
    reminder!.remindAt = Date.now() - 1000; // set due immediately
    const result = await processDueReminders(env);
    return data({
      status: 'ok',
      message: `Immediate test email sent to ${targetEmail}! Please check your email inbox.`,
      reminder,
      result,
    });
  }

  return data({
    status: 'ok',
    message: `Abandoned cart reminder scheduled for ${targetEmail}! Email will be sent in ${delayMinutesInput} minutes.`,
    reminder,
  });
}
