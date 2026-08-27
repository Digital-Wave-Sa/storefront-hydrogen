import type {ActionFunctionArgs, LoaderFunctionArgs} from 'react-router';

/**
 * Loyalty Points API Route
 *
 * GET /api/loyalty-points?customerId=gid://shopify/Customer/123
 * POST /api/loyalty-points { customerId: "gid://shopify/Customer/123", points: 200 }
 */
export async function loader({request, context}: LoaderFunctionArgs) {
  try {
    const {getLoyaltyFullInfo} = await import('~/lib/loyalty.server');
    const url = new URL(request.url);
    const paramCustomerId = url.searchParams.get('customerId') || undefined;
    const paramPhone = url.searchParams.get('phone') || undefined;
    const paramEmail = url.searchParams.get('email') || undefined;
    const paramIdentifier = url.searchParams.get('identifier') || undefined;

    let customerId = paramCustomerId;
    let phone = paramPhone;
    let email = paramEmail;

    if (paramIdentifier) {
      const clean = paramIdentifier.trim();
      if (clean.startsWith('gid://') || /^\d{11,}$/.test(clean)) {
        if (!customerId) customerId = clean;
      } else if (clean.includes('@')) {
        if (!email) email = clean;
      } else {
        if (!phone) phone = clean;
      }
    }

    const loyaltyInfo = await getLoyaltyFullInfo({
      customerId,
      phone,
      email,
      env: context.env,
      context,
    });

    const points = loyaltyInfo?.balance || 0;
    let enrollmentDate: string | null = loyaltyInfo?.enrollmentDate || null;

    if (!enrollmentDate && context?.storefront && context?.session) {
      try {
        const sessionToken = await context.session.get('customerAccessToken');
        const tokenStr =
          typeof sessionToken === 'string'
            ? sessionToken
            : sessionToken?.accessToken;
        if (tokenStr && tokenStr !== 'dev-bypass-token') {
          const {customer} = await context.storefront.query(
            `#graphql
            query getCustomerEnrollment($customerAccessToken: String!) {
              customer(customerAccessToken: $customerAccessToken) { createdAt }
            }
            `,
            {
              variables: {customerAccessToken: tokenStr},
              cache: context.storefront.CacheNone(),
            },
          );
          if (customer?.createdAt) {
            enrollmentDate = customer.createdAt;
          }
        }
      } catch (e) {}
    }

    const {getLoyaltyTierInfo} = await import('~/lib/loyalty-tiers');
    const tierInfo = getLoyaltyTierInfo(points, loyaltyInfo?.tierName);

    return Response.json(
      {
        success: true,
        data: {
          points,
          amount: loyaltyInfo?.amount ?? (points * 0.01),
          enrollmentDate: enrollmentDate || new Date().toISOString(),
          enrolledSinceYear: enrollmentDate
            ? (new Date(enrollmentDate).getFullYear() || parseInt(enrollmentDate.split('/')?.pop() || '', 10) || new Date().getFullYear())
            : new Date().getFullYear(),
          tier: tierInfo.tier,
          nextTier: tierInfo.nextTier,
          pointsToNextTier: tierInfo.pointsToNextTier,
          progressPercent: tierInfo.progressPercent,
          tierDetails: loyaltyInfo?.tierName ? {
            name: loyaltyInfo.tierName,
            status: loyaltyInfo.tierStatus,
            daysRemaining: loyaltyInfo.daysRemaining,
            endDate: loyaltyInfo.endDate,
            fallbackTier: loyaltyInfo.fallbackTier,
          } : null,
          customer: loyaltyInfo?.customer || null,
          activity: loyaltyInfo?.activity || null,
          expiry: loyaltyInfo?.expiry || null,
          purchaseAmounts: loyaltyInfo?.purchaseAmounts || null,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      },
    );
  } catch (err: any) {
    console.error('[API Loyalty Points] Loader Exception:', err);
    const {getLoyaltyTierInfo} = await import('~/lib/loyalty-tiers');
    const tierInfo = getLoyaltyTierInfo(0);
    return Response.json(
      {
        success: true,
        data: {
          points: 0,
          enrollmentDate: new Date().toISOString(),
          enrolledSinceYear: new Date().getFullYear(),
          tier: tierInfo.tier,
          nextTier: tierInfo.nextTier,
          pointsToNextTier: tierInfo.pointsToNextTier,
          progressPercent: tierInfo.progressPercent,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      },
    );
  }
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

    const {redeemLoyaltyPoints} = await import('~/lib/loyalty.server');
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
