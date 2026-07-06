import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { getMockPoints } from '~/lib/mock-loyalty.server';

/**
 * Loyalty Points API Route (Mock Version)
 * 
 * Reads the customer's loyalty points balance from the local Mock Loyalty Service.
 * 
 * GET /api/loyalty-points?phone=0501234567
 * POST /api/loyalty-points { phone: "0501234567" }
 */
export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const phone = url.searchParams.get('phone');

  console.log(`[API Loyalty Points GET] Retrieving points locally for: ${phone}`);

  if (!phone) {
    return Response.json({ success: false, error: 'Phone number is required' }, { status: 400 });
  }

  const points = getMockPoints(phone);
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
    const phone = body?.phone;

    console.log(`[API Loyalty Points POST] Retrieving points locally for: ${phone}`);

    if (!phone) {
      return Response.json({ success: false, error: 'Phone number is required' }, { status: 400 });
    }

    const points = getMockPoints(phone);
    return Response.json({ success: true, data: { points } });
  } catch (error: any) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}
