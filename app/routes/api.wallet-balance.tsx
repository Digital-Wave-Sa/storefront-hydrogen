import { data, type LoaderFunctionArgs } from 'react-router';
import { fetchWalletData } from '~/lib/account-wallet.server';

/**
 * GET /api/wallet-balance?phone=+966501234567
 * Returns the live customer wallet / store credit balance.
 */
export async function loader({ request, context }: LoaderFunctionArgs) {
  // Session only. `?phone=` used to win over the session, which made any
  // customer's store-credit balance readable from their phone number.
  const {resolveSelf} = await import('~/lib/session-identity.server');
  const self = await resolveSelf(context);
  let phone = self?.phone;

  if (!phone && context.session) {
    try {
      const sessionToken = await context.session.get('customerAccessToken');
      const tokenStr =
        typeof sessionToken === 'string'
          ? sessionToken
          : sessionToken?.accessToken;
      if (tokenStr && tokenStr !== 'dev-bypass-token' && context.storefront) {
        const { customer } = (await context.storefront.query(
          `#graphql
          query getCustomerWalletPhone($customerAccessToken: String!) {
            customer(customerAccessToken: $customerAccessToken) {
              phone
              email
            }
          }
          `,
          {
            variables: { customerAccessToken: tokenStr },
            cache: context.storefront.CacheNone(),
          },
        )) as any;
        phone = customer?.phone || customer?.email;
      }
    } catch (e) {}
  }

  if (!phone) {
    return data({ success: false, balance: 0, error: 'Phone number required' }, { status: 400 });
  }

  try {
    const walletData = await fetchWalletData({
      customer: { phone },
      request,
      context,
    });

    const balance = typeof walletData?.balance === 'number' ? walletData.balance : 0;

    return data({
      success: true,
      balance,
      currency: 'SAR',
    });
  } catch (error: any) {
    console.error('[API WALLET BALANCE ERROR]', error);
    return data({
      success: false,
      balance: 0,
      error: error?.message || 'Failed to fetch wallet balance',
    });
  }
}
