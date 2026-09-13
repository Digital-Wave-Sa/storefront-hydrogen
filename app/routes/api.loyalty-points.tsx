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
    const {resolveSelf} = await import('~/lib/session-identity.server');

    // Identity comes from the session only. Query parameters used to be trusted,
    // which let anyone read a customer's name, ERP account, tier and purchase
    // history from their phone number alone.
    const self = await resolveSelf(context);
    if (!self) {
      return Response.json(
        {success: false, error: 'Not signed in'},
        {status: 401},
      );
    }

    const {customerId, phone, email} = self;

    const loyaltyInfo = await getLoyaltyFullInfo({
      customerId,
      phone,
      email,
      env: context.env,
      context,
    });

    /**
     * A failed lookup is reported as a failure, not as zero points.
     *
     * `getLoyaltyFullInfo` is careful about this: it returns `null` — never a
     * zeroed object — when SDLP times out, errors, or answers with something
     * unusable, and says so in its own comment. That care ended here. This
     * line read `loyaltyInfo?.balance || 0`, so `null` became `0` and the
     * response still said `success: true`: the one thing the library refused
     * to claim, the API claimed on its behalf.
     *
     * Downstream there is no way back. The cart widget shows «لا توجد لديك
     * نقاط ولاء حالياً» for a zero, so a customer holding 1,560 points was
     * told, with confidence and no error anywhere, that they had none —
     * whenever SDLP was a little slow. SDLP's read timeout is 3s and it has
     * been answering in ~2.4s, so this fires intermittently and looks random.
     *
     * `success: false` leaves both callers (the cart widget and the header
     * pill) holding `null`, which is their "not known yet" state, and lets
     * the UI say «unavailable» instead of inventing a balance.
     */
    if (!loyaltyInfo) {
      console.warn(
        '[API Loyalty Points] Lookup unavailable for this session — reporting unavailable, not zero.',
      );
      return Response.json(
        {success: false, error: 'loyalty_unavailable'},
        {status: 503, headers: {'Cache-Control': 'no-store'}},
      );
    }

    const points = loyaltyInfo.balance;
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
          // null, never today / this year: an unknown enrollment date is not
          // a customer who joined this morning.
          enrollmentDate: enrollmentDate || null,
          enrolledSinceYear: enrollmentDate
            ? (new Date(enrollmentDate).getFullYear() ||
               parseInt(enrollmentDate.split('/')?.pop() || '', 10) ||
               null)
            : null,
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
    /**
     * An exception is an unknown balance, not a balance of zero.
     *
     * This caught everything and answered `success: true, points: 0` — so a
     * thrown error anywhere in this loader (a Storefront query, the tier
     * lookup, a parse) told the customer they had no points, while the only
     * trace was this one console line on the server. Same failure as the
     * `null` case above, reached by a different route.
     */
    console.error('[API Loyalty Points] Loader Exception:', err);
    return Response.json(
      {success: false, error: 'loyalty_unavailable'},
      {status: 503, headers: {'Cache-Control': 'no-store'}},
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

    // Quantity rules live in loyalty-tiers.ts — see the note there.
    const {MIN_REDEEMABLE_POINTS, POINT_REDEEM_STEP} = await import(
      '~/lib/loyalty-tiers'
    );
    const isEnLocale = context.storefront.i18n.language === 'EN';

    if (pointsToRedeem < MIN_REDEEMABLE_POINTS) {
      return Response.json(
        {
          success: false,
          error: isEnLocale
            ? `A minimum of ${MIN_REDEEMABLE_POINTS} points is required to redeem.`
            : `الحد الأدنى لاستبدال النقاط هو ${MIN_REDEEMABLE_POINTS} نقطة.`,
        },
        {status: 400},
      );
    }
    if (POINT_REDEEM_STEP > 1 && pointsToRedeem % POINT_REDEEM_STEP !== 0) {
      return Response.json(
        {
          success: false,
          error: isEnLocale
            ? `Points must be redeemed in increments of ${POINT_REDEEM_STEP}.`
            : `يجب استبدال النقاط بمضاعفات ${POINT_REDEEM_STEP} نقطة.`,
        },
        {status: 400},
      );
    }

    // Redeem for the signed-in customer only — the body used to name the
    // customer, so anyone could convert another shopper's points into a
    // discount code and receive that code in the response.
    const {resolveSelf} = await import('~/lib/session-identity.server');
    const self = await resolveSelf(context);
    if (!self) {
      return Response.json(
        {success: false, error: 'Not signed in'},
        {status: 401},
      );
    }

    const {redeemLoyaltyPoints} = await import('~/lib/loyalty.server');
    const result = await redeemLoyaltyPoints({
      customerId: self.customerId,
      phone: self.phone,
      email: self.email,
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
        {
          success: false,
          // result.error is the loyalty service's own English wording, so it
          // is logged rather than shown — see the OTP path for the same rule.
          error: context.storefront.i18n.language === 'EN'
            ? 'Could not redeem your points. Please try again.'
            : 'تعذّر استبدال نقاطك. يرجى المحاولة مرة أخرى.',
        },
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
