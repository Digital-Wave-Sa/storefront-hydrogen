import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';

/**
 * Loyalty Points API Route
 * 
 * Fetches the customer's loyalty points balance from the Middleware CRM endpoint.
 * Used by the storefront to display points in the cart.
 * 
 * GET /api/loyalty-points?phone=0501234567
 * POST /api/loyalty-points { phone: "0501234567" }
 */
export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const phone = url.searchParams.get('phone');

  console.log(`[API Loyalty Points] GET request received for phone: ${phone}`);

  if (!phone) {
    console.log(`[API Loyalty Points] Phone number missing`);
    return Response.json({ success: false, error: 'Phone number is required' }, { status: 400 });
  }

  try {
    const middlewareUrl = context.env.MIDDLEWARE_URL || 'https://wh.pryvexapls.com';
    console.log(`[API Loyalty Points] Calling middleware: ${middlewareUrl}/crm/loyalty with phone: ${phone}`);
    
    const loyaltyRes = await fetch(`${middlewareUrl}/crm/loyalty`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-branch-id': '1' 
      },
      body: JSON.stringify({ phone: phone })
    });
    
    if (!loyaltyRes.ok) {
      console.log(`[API Loyalty Points] Middleware returned HTTP ${loyaltyRes.status}`);
      throw new Error(`Middleware HTTP error: ${loyaltyRes.status}`);
    }
    
    const result = await loyaltyRes.json();
    console.log(`[API Loyalty Points] Middleware success. Returned points: ${result?.data?.points}`);

    return Response.json(result, {
      headers: {
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
      },
    });
  } catch (error: any) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function action({ request, context }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const body = await request.json() as any;
    const phone = body?.phone;

    if (!phone) {
      return Response.json({ success: false, error: 'Phone number is required' }, { status: 400 });
    }

    const middlewareUrl = context.env.MIDDLEWARE_URL || 'https://wh.pryvexapls.com';
    const loyaltyRes = await fetch(`${middlewareUrl}/crm/loyalty`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone })
    });
    
    if (!loyaltyRes.ok) {
      throw new Error(`Middleware HTTP error: ${loyaltyRes.status}`);
    }
    
    const result = await loyaltyRes.json();
    return Response.json(result);
  } catch (error: any) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
