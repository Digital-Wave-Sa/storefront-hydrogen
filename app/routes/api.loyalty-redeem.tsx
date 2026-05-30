import type { ActionFunctionArgs } from 'react-router';

/**
 * Loyalty Points Redeem API Route
 * 
 * Communicates with the Pryvexa Middleware (NestJS) to deduct points
 * and generate a Shopify Discount Code for the checkout flow.
 * 
 * POST /api/loyalty-redeem
 * Body: { userId: "...", points: 500 }
 */
export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const body = await request.json() as any;
    const { userId, points } = body;

    if (!userId || !points) {
      return Response.json({ success: false, error: 'User ID and points are required' }, { status: 400 });
    }

    // Call the Pryvexa Middleware API
    // The backend team will need to ensure this endpoint exists and creates the Shopify Discount
    const response = await fetch('https://wh.pryvexapls.com/api/wallet/loyalty/redeem', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        points: points
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return Response.json({ 
        success: false, 
        error: data.message || 'Failed to redeem points in middleware' 
      }, { status: response.status });
    }

    return Response.json({
      success: true,
      discount_code: data.discount_code || data.data?.discount_code,
      message: data.message || 'Points redeemed successfully'
    });

  } catch (error: any) {
    console.error('[Loyalty Redeem] Error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
