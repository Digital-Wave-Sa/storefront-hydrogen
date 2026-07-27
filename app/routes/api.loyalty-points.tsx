import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { getLoyaltyPoints } from '~/lib/loyalty.server';

/**
 * Loyalty Points API Route
 * 
 * Fetches the customer's loyalty points balance from the SDLP service, falling back to mock points if unset.
 * 
 * GET /api/loyalty-points?phone=0501234567&customerId=gid://shopify/Customer/123
 * POST /api/loyalty-points { phone: "0501234567", customerId: "gid://shopify/Customer/123" }
 */
export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const identifier = url.searchParams.get('phone') || url.searchParams.get('email') || url.searchParams.get('identifier') || url.searchParams.get('customerId');

  if (!identifier) {
    return Response.json({ success: false, error: 'Identifier is required' }, { status: 400 });
  }

  const points = await getLoyaltyPoints({
    customerId: url.searchParams.get('customerId') || undefined,
    phone: url.searchParams.get('phone') || identifier,
    email: url.searchParams.get('email') || undefined,
    env: context.env,
    context,
  });

  return Response.json({ success: true, data: { points } }, {
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
    const identifier = body?.phone || body?.email || body?.identifier || body?.customerId;

    if (!identifier) {
      return Response.json({ success: false, error: 'Identifier is required' }, { status: 400 });
    }

    const points = await getLoyaltyPoints({
      customerId: body?.customerId,
      phone: body?.phone || identifier,
      email: body?.email,
      env: context.env,
      context,
    });

    return Response.json({ success: true, data: { points } });
  } catch (error: any) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
