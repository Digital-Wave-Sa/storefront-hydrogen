import { Suspense } from 'react';
import { data as json, redirect, type LoaderFunctionArgs, type ActionFunctionArgs } from 'react-router';
import { useLoaderData, Form, useNavigation, useActionData, useLocation, Await, useRouteLoaderData } from 'react-router';
import { Button } from '~/components/layout/Button';
import { SaudiRiyalSymbol } from '~/components/Price';

// The loader has been removed because WalletPage relies entirely on data from the parent AccountLayout (via useOutletContext)
export async function action({ request, context }: ActionFunctionArgs) {
  const { session, storefront, env } = context;
  const customerAccessToken = await session.get('customerAccessToken');

  if (!customerAccessToken) {
    return redirect('/account/login');
  }

  let customer: any = null;

  if (customerAccessToken.accessToken === 'dev-bypass-token') {
    const savedPhone = await session.get('loginOtpPhone');

    if (savedPhone) {
      try {
        const { getAdminToken } = await import('~/lib/shopify-admin.server');
        const adminToken = await getAdminToken(env);
        const queryStr = savedPhone.includes('590910042')
          ? encodeURIComponent('email:"motasem.udeh@gmail.com"')
          : encodeURIComponent(`phone:"${savedPhone}"`);
        const res = await fetch(`https://${env.PUBLIC_STORE_DOMAIN}/admin/api/2023-04/customers/search.json?query=${queryStr}`, {
          headers: { 'X-Shopify-Access-Token': adminToken, 'Content-Type': 'application/json' },
        });
        const { customers } = (await res.json()) as any;

        if (customers && customers.length > 0) {
          customer = {
            id: `gid://shopify/Customer/${customers[0].id}`,
            phone: customers[0].phone
          };
        }
      } catch (e) {
        console.error('Wallet action dev bypass failed to load real customer', e);
      }
    }

    if (!customer) {
      customer = {
        id: 'gid://shopify/Customer/123456789',
        phone: '+966500000000',
      };
    }
  } else {
    const result = await storefront.query(`#graphql
      query getCustomerForVoucher($customerAccessToken: String!) {
        customer(customerAccessToken: $customerAccessToken) {
          id
          phone
        }
      }
    `, {
      variables: { customerAccessToken: customerAccessToken.accessToken },
      cache: storefront.CacheNone(),
    });
    customer = result.customer;
  }

  const formData = await request.formData();
  const intent = formData.get('intent')?.toString() || 'redeem_voucher';
  const isEn = new URL(request.url).pathname.includes('/en');
  const middlewareUrl = env.MIDDLEWARE_URL || 'https://api.saadeddin.top';
  const isLocal = new URL(request.url).host.includes('localhost') || new URL(request.url).host.includes('127.0.0.1');
  const baseGiftCardUrl = isLocal ? 'http://localhost:3000' : middlewareUrl;

  // Format customer phone to match backend expectation
  let formattedPhone = customer.phone || '';
  if (isLocal && !formattedPhone) {
    formattedPhone = '0501234567';
  }
  if (formattedPhone.startsWith('+966')) {
    formattedPhone = '0' + formattedPhone.slice(4);
  }

  if (intent === 'gift_balance') {
    const recipientPhone = formData.get('recipientPhone')?.toString().trim();
    const giftAmount = parseFloat(formData.get('giftAmount')?.toString() || '0');
    const currentBalance = parseFloat(formData.get('currentBalance')?.toString() || '0');

    if (!recipientPhone || giftAmount <= 0) {
      return json({ intent: 'gift_balance', error: isEn ? 'Please enter a valid phone number and amount.' : 'يرجى إدخال رقم هاتف ومبلغ صحيحين.' }, { status: 400 });
    }

    if (giftAmount > currentBalance) {
      return json({ intent: 'gift_balance', error: isEn ? 'Insufficient balance.' : 'رصيد غير كافٍ.' }, { status: 400 });
    }

    try {
      const res = await fetch(`${middlewareUrl}/wallet/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: customer.id,
          recipient_phone: recipientPhone,
          amount: giftAmount,
          message: formData.get('giftMessage')?.toString()
        })
      });
      const data = (await res.json()) as any;
      if (!res.ok || !data.success) {
        return json({ intent: 'gift_balance', error: isEn ? 'Failed to send gift. Please verify the phone number.' : 'فشل إرسال الهدية. يرجى التحقق من رقم الهاتف.' }, { status: 400 });
      }
      return json({
        intent: 'gift_balance',
        success: true,
        giftAmount,
        recipientPhone,
        newBalance: data.new_balance || (currentBalance - giftAmount),
        currency: data.currency || 'SAR'
      });
    } catch (err) {
      return json({ intent: 'gift_balance', error: isEn ? 'Service unavailable.' : 'الخدمة غير متوفرة.' }, { status: 500 });
    }
  }

  // --- REDEEM (ACTIVATE) VOUCHER LOGIC ---
  const voucherCode = formData.get('voucherCode')?.toString().trim().toUpperCase();

  if (!voucherCode) {
    return json({ intent: 'redeem_voucher', error: isEn ? 'Please enter a voucher code.' : 'الرجاء إدخال رمز القسيمة.' }, { status: 400 });
  }

  try {
    let balanceBeforeActivation = 0;

    if (isLocal) {
      const globalGiftCards = (globalThis as any).__giftCards || new Map();
      const card = globalGiftCards.get(voucherCode);
      if (!card) {
        return json({ intent: 'redeem_voucher', error: isEn ? 'Invalid voucher code.' : 'رمز القسيمة غير صحيح.' }, { status: 400 });
      }
      if (card.status !== 'inactive' || card.phone) {
        return json({ intent: 'redeem_voucher', error: isEn ? 'This voucher has already been activated.' : 'تم تفعيل هذه القسيمة بالفعل مسبقاً.' }, { status: 400 });
      }

      balanceBeforeActivation = card.currentBalance;
      card.phone = formattedPhone;
      card.status = 'active';
      card.transactions.push({
        id: `tx-${Date.now()}`,
        operation: 'ACTIVATE',
        timestamp: new Date().toISOString()
      });

      // Calculate new aggregated balance in-memory
      let newBalance = 0;
      const targetPhone = formattedPhone.replace(/\D/g, '');
      for (const c of globalGiftCards.values()) {
        if (c.phone && c.phone.replace(/\D/g, '') === targetPhone) {
          newBalance += c.currentBalance;
        }
      }

      return json({
        intent: 'redeem_voucher',
        success: true,
        creditedAmount: balanceBeforeActivation,
        newBalance,
        currency: 'SAR'
      });

    } else {
      // First, check details to see how much balance the card has
      const detailsRes = await fetch(`${baseGiftCardUrl}/gift-cards/${voucherCode}`);
      if (!detailsRes.ok) {
        return json({ intent: 'redeem_voucher', error: isEn ? 'Invalid voucher code.' : 'رمز القسيمة غير صحيح.' }, { status: 400 });
      }
      const detailsData = (await detailsRes.json()) as any;
      balanceBeforeActivation = detailsData?.data?.currentBalance || 0;

      // Call POST /gift-cards/:code/activate to bind it
      const res = await fetch(`${baseGiftCardUrl}/gift-cards/${voucherCode}/activate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: formattedPhone,
        })
      });

      const data = (await res.json()) as any;

      if (!res.ok || !data.success) {
        const reason = data.error || 'unknown';
        let friendlyError = isEn ? 'Failed to activate voucher.' : 'فشل في تفعيل القسيمة.';

        if (reason.includes('Already activated') || reason.includes('already_used')) {
          friendlyError = isEn ? 'This voucher has already been activated.' : 'تم تفعيل هذه القسيمة بالفعل مسبقاً.';
        } else if (reason.includes('not found') || reason.includes('invalid_code')) {
          friendlyError = isEn ? 'Invalid voucher code.' : 'رمز القسيمة غير صحيح.';
        }

        return json({ intent: 'redeem_voucher', error: friendlyError }, { status: 400 });
      }

      // Retrieve new aggregated balance for the user
      let newBalance = balanceBeforeActivation;
      const balanceRes = await fetch(`${baseGiftCardUrl}/gift-cards/by-phone/${encodeURIComponent(formattedPhone)}`);
      if (balanceRes.ok) {
        const balanceData = (await balanceRes.json()) as any;
        newBalance = balanceData?.data?.totalBalance || 0;
      }

      return json({
        intent: 'redeem_voucher',
        success: true,
        creditedAmount: balanceBeforeActivation,
        newBalance,
        currency: 'SAR'
      });
    }

  } catch (err) {
    console.error('Middleware activate error:', err);
    return json({ intent: 'redeem_voucher', error: isEn ? 'Service unavailable. Please try again later.' : 'الخدمة غير متوفرة. الرجاء المحاولة لاحقاً.' }, { status: 500 });
  }
}

import { useOutletContext } from 'react-router';

export default function WalletPage() {
  const { walletPromise } = useOutletContext<{ walletPromise: Promise<any> }>();
  const actionData = useActionData<{ intent?: string; success?: boolean; error?: string; creditedAmount?: number; newBalance?: number; currency?: string; giftAmount?: number; recipientPhone?: string }>();
  const navigation = useNavigation();
  const isEn = useLocation().pathname.includes('/en');
  const rootData = useRouteLoaderData('root') as any;

  const isSubmitting = navigation.state === 'submitting';

  return (
    <Suspense fallback={
      <div className="wallet-page animate-fade-in" dir={isEn ? 'ltr' : 'rtl'}>
        <div className="mb-8">
          <h1 className="text-3xl font-black text-[#234745] m-2">
            {isEn ? 'Wallet & Vouchers' : 'المحفظة والقسائم'}
          </h1>
          <p className="text-gray-500 font-medium">
            {isEn ? 'Manage your store balance, redeem gift vouchers, and view your loyalty points.' : 'إدارة رصيد متجرك واسترداد قسائم الهدايا وعرض نقاط الولاء الخاصة بك.'}
          </p>
        </div>
        <div className="py-20 text-center">
          <p className="text-gray-500">{isEn ? 'Loading wallet details...' : 'جاري تحميل تفاصيل المحفظة...'}</p>
        </div>
      </div>
    }>
      <Await resolve={walletPromise}>
        {({ balance, loyaltyPoints, history, cards }) => {
          const currentBalance = actionData?.success && actionData.newBalance !== undefined
            ? actionData.newBalance
            : balance;

          const activeCards = cards || [];

          return (
            <div className="wallet-page animate-fade-in" dir={isEn ? 'ltr' : 'rtl'}>
              <div className="mb-8">
                <h1 className="text-3xl font-black text-[#234745] !mb-2 !mt-0">
                  {isEn ? 'Wallet & Vouchers' : 'المحفظة والقسائم'}
                </h1>
                <p className="text-gray-500 font-medium">
                  {isEn ? 'Manage your store balance, redeem gift vouchers, and view your loyalty points.' : 'إدارة رصيد متجرك واسترداد قسائم الهدايا وعرض نقاط الولاء الخاصة بك.'}
                </p>
              </div>

              <div className="mb-10">
                {/* Loyalty Points Card */}
                <div className="bg-[#fcfaf7] border-2 border-[#f0e6d8] rounded-[24px] p-8 relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <h3 className="text-[#a88a68] font-bold text-sm uppercase tracking-wider mb-2">
                      {rootData?.env?.PUBLIC_SMILE_CHANNEL_KEY ? (isEn ? 'Smile Rewards & Points' : 'نقاط ومكافآت Smile') : (isEn ? 'Loyalty Points' : 'نقاط الولاء')}
                    </h3>
                    <div className="flex items-end gap-2">
                      <span className="text-4xl font-black text-[#234745]">
                        {rootData?.env?.PUBLIC_SMILE_CHANNEL_KEY ? 'Smile' : loyaltyPoints}
                      </span>
                      {(!rootData?.env?.PUBLIC_SMILE_CHANNEL_KEY) && (
                        <span className="text-lg font-bold text-[#234745] pb-1">{isEn ? 'Pts' : 'نقطة'}</span>
                      )}
                    </div>
                    <p className="mt-4 text-sm text-gray-500 font-medium">
                      {rootData?.env?.PUBLIC_SMILE_CHANNEL_KEY
                        ? (isEn ? 'Earn points on every order and redeem them for rewards using Smile.io.' : 'اكسب نقاطاً على كل طلب واستبدلها بمكافآت رائعة عبر Smile.io.')
                        : (isEn ? 'Earn points on every order and redeem them for rewards.' : 'اكسب نقاطاً على كل طلب واستبدلها بمكافآت رائعة.')}
                    </p>
                  </div>
                  {rootData?.env?.PUBLIC_SMILE_CHANNEL_KEY && (
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== 'undefined' && (window as any).Smile) {
                          (window as any).Smile.show();
                        } else {
                          alert(isEn
                            ? "Smile.io widget is loading or not active yet. Please verify your PUBLIC_SMILE_CHANNEL_KEY."
                            : "أداة Smile.io قيد التحميل أو غير نشطة بعد. يرجى التحقق من مفتاح PUBLIC_SMILE_CHANNEL_KEY."
                          );
                        }
                      }}
                      className="mt-6 w-full py-3 bg-[#234745] hover:bg-[#1a3533] text-white font-bold rounded-xl text-xs transition-colors text-center uppercase tracking-wider"
                    >
                      {isEn ? 'Open Rewards Panel' : 'فتح لوحة المكافآت'}
                    </button>
                  )}
                </div>
              </div>

              {/* RECENT ACTIVITY (HISTORY) SECTION */}
              <div className="mt-12 bg-white border border-gray-200 rounded-[24px] p-8 shadow-sm">
                <h2 className="text-xl font-bold text-[#234745] mb-6 border-b border-gray-100 pb-4">
                  {isEn ? 'Recent Activity' : 'النشاط الأخير'}
                </h2>

                {!history || history.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <svg className="w-16 h-16 mx-auto mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="font-medium">{isEn ? 'No recent activity.' : 'لا يوجد نشاط حديث.'}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {history.map((tx: any) => {
                      const isAddition = tx.amount > 0;
                      return (
                        <div key={tx.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-[16px] hover:bg-gray-100 transition-colors">
                          <div className="flex flex-col gap-1 text-start">
                            <span className="font-bold text-gray-700">{isEn ? tx.labelEn : tx.labelAr}</span>
                            <span className="text-sm text-gray-500 font-medium" dir="ltr">{new Date(tx.date).toLocaleDateString(isEn ? 'en-US' : 'ar-SA', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                          </div>
                          <div className={`font-black text-lg inline-flex items-center gap-1 ${isAddition ? 'text-emerald-600' : 'text-red-500'}`} dir="ltr">
                            {isAddition ? '+' : ''}{tx.amount.toFixed(2)} <SaudiRiyalSymbol className={`h-4.5 w-auto mb-0.5 ${isAddition ? 'text-emerald-600' : 'text-red-500'}`} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          );
        }}
      </Await>
    </Suspense>
  );
}
