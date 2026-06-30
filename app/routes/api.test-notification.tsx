import { type LoaderFunctionArgs } from 'react-router';
import { notifyOrderUpdate } from '../lib/notifications.server';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const email = url.searchParams.get('email');
  const phone = url.searchParams.get('phone');
  const lang = url.searchParams.get('lang') || 'EN'; // 'EN' or 'AR'
  const stage = url.searchParams.get('stage') || 'CONFIRMED';

  if (!email || !phone) {
    return Response.json({ 
      error: 'Missing parameters. Please provide ?email=...&phone=...&lang=EN' 
    }, { status: 400 });
  }

  // Mock Order Data for Testing
  const mockOrder = {
    orderNumber: 'TEST-' + Math.floor(Math.random() * 10000),
    customer: {
      firstName: 'Test',
      lastName: 'User',
      email: email,
      phone: phone,
      locale: lang
    },
    totalPriceSet: {
      shopMoney: {
        amount: '150.00',
        currencyCode: 'SAR'
      }
    },
    lineItems: {
      nodes: [
        {
          title: 'Premium Chocolate Cake',
          quantity: 1,
          originalTotalPriceSet: {
            shopMoney: { amount: '150.00', currencyCode: 'SAR' }
          }
        }
      ]
    }
  };

  try {
    // Send dynamic stage template
    const results = await notifyOrderUpdate({
      order: mockOrder,
      stage: stage as any,
      env: context.env
    });

    return Response.json({
      success: true,
      message: 'Test notification sent!',
      results
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
