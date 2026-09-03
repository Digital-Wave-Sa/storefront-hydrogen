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
  /**
   * The customer id matters as much as the phone here.
   *
   * fetchWalletData reads the authoritative balance from the store-credit
   * service keyed on this id, and falls back to a phone lookup only without
   * one. This route used to hand it `{phone}` alone, so the cart asked the
   * phone service while /account asked the store-credit service — and the two
   * disagreed: 134.00 on the account page, 50.00 in the cart, same customer.
   */
  let customerId = self?.customerId;

  if ((!phone || !customerId) && context.session) {
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
              id
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
        phone = phone || customer?.phone || customer?.email;
        customerId = customerId || customer?.id;
      }
    } catch (e) {}
  }

  if (!phone && !customerId) {
    return data(
      {success: false, balance: null, error: 'Not signed in'},
      {status: 401},
    );
  }

  try {
    const walletData = await fetchWalletData({
      customer: {id: customerId, phone},
      request,
      context,
    });

    /**
     * A balance that could not be established is reported as a failure, not as
     * zero. Callers render "unavailable" from `success: false`; answering 0
     * would have them tell the customer their wallet is empty because a
     * lookup timed out.
     */
    if (typeof walletData?.balance !== 'number' || !Number.isFinite(walletData.balance)) {
      return data(
        {success: false, balance: null, error: 'balance-unavailable'},
        {status: 503},
      );
    }

    return data({
      success: true,
      balance: walletData.balance,
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
