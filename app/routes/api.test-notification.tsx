import {type LoaderFunctionArgs} from 'react-router';
import {notifyOrderUpdate} from '../lib/notifications.server';

/**
 * DEBUG ONLY — this endpoint sends a REAL SMS/email to whatever phone and email
 * are passed in the query string, on the shop's own gateway credits and sender
 * identity. Publicly reachable it is an open relay: anyone can spam arbitrary
 * numbers as Saadeddin, burn credits, and get the sender reputation blocked.
 *
 * It is therefore restricted to local development. Everything else gets a 404,
 * so the route's existence isn't advertised either.
 */
function isLocalDevRequest(request: Request): boolean {
  try {
    const {hostname} = new URL(request.url);
    return (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '[::1]' ||
      hostname.endsWith('.local')
    );
  } catch {
    return false;
  }
}

export async function loader({request, context}: LoaderFunctionArgs) {
  if (!isLocalDevRequest(request)) {
    console.warn(
      '[api.test-notification] Blocked non-local request from',
      request.headers.get('cf-connecting-ip') ||
        request.headers.get('x-forwarded-for') ||
        'unknown',
    );
    throw new Response('Not Found', {status: 404});
  }

  const url = new URL(request.url);
  const email = url.searchParams.get('email');
  const phone = url.searchParams.get('phone');
  const lang = url.searchParams.get('lang') || 'EN'; // 'EN' or 'AR'
  const stage = url.searchParams.get('stage') || 'CONFIRMED';

  if (!email || !phone) {
    return Response.json(
      {
        error:
          'Missing parameters. Please provide ?email=...&phone=...&lang=EN',
      },
      {status: 400},
    );
  }

  // Mock Order Data for Testing
  const mockOrder = {
    orderNumber: 'TEST-' + Math.floor(Math.random() * 10000),
    customer: {
      firstName: 'Test',
      lastName: 'User',
      email: email,
      phone: phone,
      locale: lang,
    },
    totalPriceSet: {
      shopMoney: {
        amount: '150.00',
        currencyCode: 'SAR',
      },
    },
    lineItems: {
      nodes: [
        {
          title: 'Premium Chocolate Cake',
          quantity: 1,
          originalTotalPriceSet: {
            shopMoney: {amount: '150.00', currencyCode: 'SAR'},
          },
        },
      ],
    },
  };

  try {
    // Send dynamic stage template
    const results = await notifyOrderUpdate({
      order: mockOrder,
      stage: stage as any,
      env: context.env,
    });

    return Response.json({
      success: true,
      message: 'Test notification sent!',
      results,
    });
  } catch (error: any) {
    return Response.json({error: error.message}, {status: 500});
  }
}
