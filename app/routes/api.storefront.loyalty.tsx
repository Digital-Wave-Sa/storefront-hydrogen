import type { LoaderFunctionArgs } from 'react-router';
import { getLoyaltyFullInfo } from '~/lib/loyalty.server';
import { getLoyaltyTierInfo } from '~/lib/loyalty-tiers';

export async function loader({ request, context }: LoaderFunctionArgs) {
  try {
    // Session only — see api.loyalty-points. Query parameters are not trusted
    // for personal data.
    const { resolveSelf } = await import('~/lib/session-identity.server');
    const self = await resolveSelf(context);
    if (!self) {
      return Response.json({ success: false, error: 'Not signed in' }, { status: 401 });
    }
    const { customerId, phone, email } = self;

    const loyaltyInfo = await getLoyaltyFullInfo({
      customerId,
      phone,
      email,
      env: context.env,
      context,
    });

    const balance = loyaltyInfo?.balance || 0;
    let enrollmentDate: string = loyaltyInfo?.enrollmentDate || new Date().toISOString();

    if (!loyaltyInfo?.enrollmentDate && context?.storefront && context?.session) {
      try {
        const sessionToken = await context.session.get('customerAccessToken');
        const tokenStr = typeof sessionToken === 'string' ? sessionToken : sessionToken?.accessToken;
        if (tokenStr && tokenStr !== 'dev-bypass-token') {
          const { customer } = await context.storefront.query(
            `#graphql
            query getCustomerEnrollmentDate($customerAccessToken: String!) {
              customer(customerAccessToken: $customerAccessToken) { createdAt }
            }
            `,
            {
              variables: { customerAccessToken: tokenStr },
              cache: context.storefront.CacheNone(),
            }
          );
          if (customer?.createdAt) {
            enrollmentDate = customer.createdAt;
          }
        }
      } catch (e) {}
    }

    const tierInfo = getLoyaltyTierInfo(balance);

    return Response.json(
      {
        balance,
        amount: parseFloat((balance * 0.01).toFixed(2)),
        pointsRedeemRatio: 100,
        enrollmentDate,
        tier: {
          name: tierInfo.tier.name,
          code: tierInfo.tier.code,
          minPoints: tierInfo.tier.minPoints,
          maxPoints: tierInfo.tier.maxPoints,
          pointsToNextTier: tierInfo.pointsToNextTier,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    );
  } catch (err: any) {
    console.error('[API Storefront Loyalty] Exception:', err);
    const tierInfo = getLoyaltyTierInfo(0);
    return Response.json(
      {
        balance: 0,
        amount: 0.00,
        pointsRedeemRatio: 100,
        enrollmentDate: new Date().toISOString(),
        tier: {
          name: tierInfo.tier.name,
          code: tierInfo.tier.code,
          minPoints: tierInfo.tier.minPoints,
          maxPoints: tierInfo.tier.maxPoints,
          pointsToNextTier: tierInfo.pointsToNextTier,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    );
  }
}
