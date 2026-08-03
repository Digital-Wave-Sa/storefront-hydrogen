import type {ActionFunctionArgs, LoaderFunctionArgs} from 'react-router';
import {getLoyaltyPoints, redeemLoyaltyPoints} from '~/lib/loyalty.server';

/**
 * Loyalty Points API Route
 *
 * GET /api/loyalty-points?customerId=gid://shopify/Customer/123
 * POST /api/loyalty-points { customerId: "gid://shopify/Customer/123", points: 200 }
 */
export async function loader({request, context}: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const identifier =
    url.searchParams.get('customerId') ||
    url.searchParams.get('phone') ||
    url.searchParams.get('email') ||
    url.searchParams.get('identifier');

  const points = await getLoyaltyPoints({
    customerId: url.searchParams.get('customerId') || undefined,
    phone: url.searchParams.get('phone') || identifier || undefined,
    email: url.searchParams.get('email') || undefined,
    env: context.env,
    context,
  });

  return Response.json(
    {success: true, data: {points}},
    {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    },
  );
}

export async function action({request, context}: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', {status: 405});
  }

  try {
    const body = (await request.json()) as any;
    const pointsToRedeem = parseInt(body?.points) || 0;

    if (pointsToRedeem <= 0 || pointsToRedeem % 100 !== 0) {
      return Response.json(
        {
          success: false,
          error: 'Points must be redeemed in increments of 100.',
        },
        {status: 400},
      );
    }

    const result = await redeemLoyaltyPoints({
      customerId: body?.customerId,
      phone: body?.phone,
      email: body?.email,
      points: pointsToRedeem,
      env: context.env,
      context,
    });

    if (result.success) {
      return Response.json({
        success: true,
        discountCode: result.discountCode,
        newBalance: result.newBalance,
      });
    } else {
      return Response.json(
        {success: false, error: result.error || 'Failed to redeem points'},
        {status: 400},
      );
    }
  } catch (error: any) {
    return Response.json(
      {success: false, error: error?.message || 'Server error'},
      {status: 500},
    );
  }
}
