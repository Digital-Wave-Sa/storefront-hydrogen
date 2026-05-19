import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { crmGetLoyaltyPoints } from '~/lib/crm-orders.server';

/**
 * Loyalty Points API Route
 * 
 * Fetches the customer's loyalty points balance from the Saadeddin CRM.
 * Used by the storefront to display points in the account dashboard and cart.
 * 
 * GET /api/loyalty-points?phone=0501234567
 * POST /api/loyalty-points { phone: "0501234567" }
 */
export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const phone = url.searchParams.get('phone');

  if (!phone) {
    return Response.json({ success: false, error: 'Phone number is required' }, { status: 400 });
  }

  const result = await crmGetLoyaltyPoints(phone, context.env);

  return Response.json(result, {
    headers: {
      'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
    },
  });
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

    const result = await crmGetLoyaltyPoints(phone, context.env);
    return Response.json(result);
  } catch (error: any) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
