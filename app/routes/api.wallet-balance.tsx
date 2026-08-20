import { data, type LoaderFunctionArgs } from 'react-router';
import { fetchWalletData } from '~/lib/account-wallet.server';

/**
 * GET /api/wallet-balance?phone=+966501234567
 * Returns the live customer wallet / store credit balance.
 */
export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const phone =
    url.searchParams.get('phone') ||
    url.searchParams.get('identifier') ||
    (await context.session.get('loginOtpPhone')) ||
    (await context.session.get('saadeddinPhone'));

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
