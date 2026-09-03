import {Suspense} from 'react';
import {
  data as json,
  redirect,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from 'react-router';
import {
  useLoaderData,
  Form,
  useNavigation,
  useActionData,
  useLocation,
  Await,
  useRouteLoaderData,
} from 'react-router';
import {Button} from '~/components/layout/Button';
import {SaudiRiyalSymbol} from '~/components/Price';
import {toGiftCardPhone} from '~/lib/phone-validation';

// The loader has been removed because WalletPage relies entirely on data from the parent AccountLayout (via useOutletContext)
export async function action({request, context}: ActionFunctionArgs) {
  const {session, storefront, env} = context;
  const customerAccessToken = await session.get('customerAccessToken');

  if (!customerAccessToken) {
    return redirect('/account/login');
  }

  let customer: any = null;

  /**
   * Was `accessToken === 'dev-bypass-token'`, which resolved a customer
   * from the Admin API without any verified session — and carried a
   * hardcoded personal email as a special case for one phone number.
   * Disabled; the real session path below is the only way in.
   */
  if (false) {
    const savedPhone = await session.get('loginOtpPhone');

    if (savedPhone) {
      try {
        const {getAdminToken} = await import('~/lib/shopify-admin.server');
        const adminToken = await getAdminToken(env);
        const queryStr = encodeURIComponent(`phone:"${savedPhone}"`);
        const res = await fetch(
          `https://${env.PUBLIC_STORE_DOMAIN}/admin/api/2023-04/customers/search.json?query=${queryStr}`,
          {
            headers: {
              'X-Shopify-Access-Token': adminToken,
              'Content-Type': 'application/json',
            },
          },
        );
        const {customers} = (await res.json()) as any;

        if (customers && customers.length > 0) {
          const found = customers.find((c: any) => {
            const cp = (c.phone || '').replace(/\D/g, '');
            const sp = savedPhone.replace(/\D/g, '');
            if (!cp || !sp) return false;
            // Exact only — this id selects whose wallet is shown.
            return cp === sp;
          });
          if (found) {
            customer = {
              id: `gid://shopify/Customer/${found.id}`,
              phone: found.phone,
            };
          }
        }
      } catch (e) {
        console.error(
          'Wallet action dev bypass failed to load real customer',
          e,
        );
      }
    }

    if (!customer) {
      customer = {
        id: 'gid://shopify/Customer/123456789',
        phone: '+966500000000',
      };
    }
  } else {
    const result = await storefront.query(
      `#graphql
      query getCustomerForVoucher($customerAccessToken: String!) {
        customer(customerAccessToken: $customerAccessToken) {
          id
          phone
        }
      }
    `,
      {
        variables: {customerAccessToken: customerAccessToken.accessToken},
        cache: storefront.CacheNone(),
      },
    );
    customer = result.customer;
  }

  const formData = await request.formData();
  const intent = formData.get('intent')?.toString() || 'redeem_voucher';
  const isEn = new URL(request.url).pathname.includes('/en');
  const middlewareUrl = env.MIDDLEWARE_URL || 'https://api.saadeddin.top';
  const isLocal =
    new URL(request.url).host.includes('localhost') ||
    new URL(request.url).host.includes('127.0.0.1');
  const baseGiftCardUrl = isLocal ? 'http://localhost:3000' : middlewareUrl;

  /**
   * The same spelling the balance lookup uses.
   *
   * This used to convert only `+966`, while fetchWalletData sent the raw
   * Shopify value — so cards were activated under `05XXXXXXXX` and the balance
   * was queried under `%2B966XXXXXXXXX`, and the two never met. `+962` and
   * every other country code were not converted at all.
   */
  let formattedPhone = toGiftCardPhone(customer.phone) || '';
  if (isLocal && !formattedPhone) {
    formattedPhone = '0501234567';
  }

  if (intent === 'gift_balance') {
    const recipientPhone = formData.get('recipientPhone')?.toString().trim();
    const giftAmount = parseFloat(
      formData.get('giftAmount')?.toString() || '0',
    );
    const currentBalance = parseFloat(
      formData.get('currentBalance')?.toString() || '0',
    );

    if (!recipientPhone || giftAmount <= 0) {
      return json(
        {
          intent: 'gift_balance',
          error: isEn
            ? 'Please enter a valid phone number and amount.'
            : 'يرجى إدخال رقم هاتف ومبلغ صحيحين.',
        },
        {status: 400},
      );
    }

    if (giftAmount > currentBalance) {
      return json(
        {
          intent: 'gift_balance',
          error: isEn ? 'Insufficient balance.' : 'رصيد غير كافٍ.',
        },
        {status: 400},
      );
    }

    try {
      const res = await fetch(`${middlewareUrl}/wallet/transfer`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          sender_id: customer.id,
          recipient_phone: recipientPhone,
          amount: giftAmount,
          message: formData.get('giftMessage')?.toString(),
        }),
      });
      const data = (await res.json()) as any;
      if (!res.ok || !data.success) {
        return json(
          {
            intent: 'gift_balance',
            error: isEn
              ? 'Failed to send gift. Please verify the phone number.'
              : 'فشل إرسال الهدية. يرجى التحقق من رقم الهاتف.',
          },
          {status: 400},
        );
      }
      return json({
        intent: 'gift_balance',
        success: true,
        giftAmount,
        recipientPhone,
        newBalance: data.new_balance || currentBalance - giftAmount,
        currency: data.currency || 'SAR',
      });
    } catch (err) {
      return json(
        {
          intent: 'gift_balance',
          error: isEn ? 'Service unavailable.' : 'الخدمة غير متوفرة.',
        },
        {status: 500},
      );
    }
  }

  // --- REDEEM (ACTIVATE) VOUCHER LOGIC ---
  const voucherCode = formData
    .get('voucherCode')
    ?.toString()
    .trim()
    .toUpperCase();

  if (!voucherCode) {
    return json(
      {
        intent: 'redeem_voucher',
        error: isEn
          ? 'Please enter a voucher code.'
          : 'الرجاء إدخال رمز القسيمة.',
      },
      {status: 400},
    );
  }

  try {
    let balanceBeforeActivation = 0;

    if (isLocal) {
      const globalGiftCards = (globalThis as any).__giftCards || new Map();
      const card = globalGiftCards.get(voucherCode);
      if (!card) {
        return json(
          {
            intent: 'redeem_voucher',
            error: isEn ? 'Invalid voucher code.' : 'رمز القسيمة غير صحيح.',
          },
          {status: 400},
        );
      }
      if (card.status !== 'inactive' || card.phone) {
        return json(
          {
            intent: 'redeem_voucher',
            error: isEn
              ? 'This voucher has already been activated.'
              : 'تم تفعيل هذه القسيمة بالفعل مسبقاً.',
          },
          {status: 400},
        );
      }

      balanceBeforeActivation = card.currentBalance;
      card.phone = formattedPhone;
      card.status = 'active';
      card.transactions.push({
        id: `tx-${Date.now()}`,
        operation: 'ACTIVATE',
        timestamp: new Date().toISOString(),
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
        currency: 'SAR',
      });
    } else {
      // The host moves with STORE_CREDIT_API_URL, the same variable
      // account-wallet.server.ts and /api/store-credit read. It used to be
      // hardcoded here, so pointing the env at a staging service left this one
      // call still hitting production.
      const storeCreditUrl =
        env.STORE_CREDIT_API_URL || 'https://sdgc.saadeddin.top';
      const res = await fetch(`${storeCreditUrl}/api/storefront/gift-card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: voucherCode,
          customerId: customer.id,
        }),
      });

      const data = (await res.json()) as any;

      if (!res.ok || !data.success) {
        return json(
          {
            intent: 'redeem_voucher',
            error:
              data.error ||
              (isEn
                ? 'Invalid gift card code. Please check and try again.'
                : 'رمز بطاقة الهدايا غير صحيح. يرجى التحقق والمحاولة مرة أخرى.'),
          },
          {status: 400},
        );
      }

      return json({
        intent: 'redeem_voucher',
        success: true,
        message: data.message,
        newBalance: data.newBalance,
        currency: 'SAR',
      });
    }
  } catch (err) {
    console.error('Middleware activate error:', err);
    return json(
      {
        intent: 'redeem_voucher',
        error: isEn
          ? 'Service unavailable. Please try again later.'
          : 'الخدمة غير متوفرة. الرجاء المحاولة لاحقاً.',
      },
      {status: 500},
    );
  }
}

import {useOutletContext} from 'react-router';
import {GiftCardActivation} from '~/components/GiftCardActivation';
import {StoreCreditBalance} from '~/components/StoreCreditBalance';

export default function WalletPage() {
  const {customer, walletPromise} = useOutletContext<{
    customer?: any;
    walletPromise: Promise<any>;
  }>();
  const actionData = useActionData<{
    intent?: string;
    success?: boolean;
    error?: string;
    creditedAmount?: number;
    newBalance?: number;
    currency?: string;
    giftAmount?: number;
    recipientPhone?: string;
  }>();
  const navigation = useNavigation();
  const isEn = useLocation().pathname.includes('/en');
  const rootData = useRouteLoaderData('root') as any;

  const isSubmitting = navigation.state === 'submitting';

  return (
    <Suspense
      fallback={
        <div className="wallet-page animate-fade-in" dir={isEn ? 'ltr' : 'rtl'}>
          <div className="mb-8">
            <h1 className="text-3xl font-black text-[#234745] m-2">
              {isEn ? 'Wallet & Vouchers' : 'المحفظة والقسائم'}
            </h1>
            <p className="text-gray-500 font-medium">
              {isEn
                ? 'Manage your store balance, redeem gift vouchers, and view your loyalty points.'
                : 'إدارة رصيد متجرك واسترداد قسائم الهدايا وعرض نقاط الولاء الخاصة بك.'}
            </p>
          </div>
          <div className="py-20 text-center">
            <p className="text-gray-500">
              {isEn
                ? 'Loading wallet details...'
                : 'جاري تحميل تفاصيل المحفظة...'}
            </p>
          </div>
        </div>
      }
    >
      <Await resolve={walletPromise}>
        {({balance, loyaltyPoints, history, cards}) => {
          /**
           * `balance` is null when the lookup could not be completed, which is
           * not the same as an empty wallet — see fetchWalletData.
           */
          const rawBalance =
            actionData?.success && actionData.newBalance !== undefined
              ? actionData.newBalance
              : balance;
          const balanceUnavailable =
            rawBalance === null || rawBalance === undefined;
          const currentBalance = balanceUnavailable ? 0 : rawBalance;

          const activeCards = cards || [];

          return (
            <div
              className="wallet-page animate-fade-in space-y-8"
              dir={isEn ? 'ltr' : 'rtl'}
            >
              <div className="mb-8">
                <h1 className="text-3xl font-black text-[#234745] !mb-2 !mt-0">
                  {isEn ? 'Wallet & Vouchers' : 'المحفظة والقسائم'}
                </h1>
                <p className="text-gray-500 font-medium">
                  {isEn
                    ? 'Manage your store balance, redeem gift vouchers, and view your loyalty points.'
                    : 'إدارة رصيد متجرك واسترداد قسائم الهدايا وعرض نقاط الولاء الخاصة بك.'}
                </p>
              </div>

              {/* Top Row: Store Credit Balance & Loyalty Points */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* null, not 0, when the balance is unknown — the component
                    then shows its loading state and fetches, instead of
                    flashing a zero balance it was handed. Both this card and
                    the account header now read the same customer-id service,
                    so they cannot show two different numbers. */}
                <StoreCreditBalance
                  customerId={customer?.id}
                  isEn={isEn}
                  initialBalance={balanceUnavailable ? null : currentBalance}
                />

                {/* Loyalty Points Card */}
                <div className="bg-[#fcfaf7] border-2 border-[#f0e6d8] rounded-[24px] p-8 relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <h3 className="text-[#a88a68] font-bold text-sm uppercase tracking-wider mb-2">
                      {rootData?.env?.PUBLIC_SMILE_CHANNEL_KEY
                        ? isEn
                          ? 'Smile Rewards & Points'
                          : 'نقاط ومكافآت Smile'
                        : isEn
                          ? 'Loyalty Points'
                          : 'نقاط الولاء'}
                    </h3>
                    <div className="flex items-end gap-2">
                      <span className="text-4xl font-black text-[#234745]">
                        {rootData?.env?.PUBLIC_SMILE_CHANNEL_KEY
                          ? 'Smile'
                          : loyaltyPoints}
                      </span>
                      {!rootData?.env?.PUBLIC_SMILE_CHANNEL_KEY && (
                        <span className="text-lg font-bold text-[#234745] pb-1">
                          {isEn ? 'Pts' : 'نقطة'}
                        </span>
                      )}
                    </div>
                    <p className="mt-4 text-sm text-gray-500 font-medium">
                      {rootData?.env?.PUBLIC_SMILE_CHANNEL_KEY
                        ? isEn
                          ? 'Earn points on every order and redeem them for rewards using Smile.io.'
                          : 'اكسب نقاطاً على كل طلب واستبدلها بمكافآت رائعة عبر Smile.io.'
                        : isEn
                          ? 'Earn points on every order and redeem them for rewards.'
                          : 'اكسب نقاطاً على كل طلب واستبدلها بمكافآت رائعة.'}
                    </p>
                  </div>
                  {rootData?.env?.PUBLIC_SMILE_CHANNEL_KEY && (
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          typeof window !== 'undefined' &&
                          (window as any).Smile
                        ) {
                          (window as any).Smile.show();
                        } else {
                          alert(
                            isEn
                              ? 'Smile.io widget is loading or not active yet. Please verify your PUBLIC_SMILE_CHANNEL_KEY.'
                              : 'أداة Smile.io قيد التحميل أو غير نشطة بعد. يرجى التحقق من مفتاح PUBLIC_SMILE_CHANNEL_KEY.',
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

              {/* Gift Card Activation Section */}
              <GiftCardActivation
                customerId={customer?.id}
                isEn={isEn}
              />

              {/* RECENT ACTIVITY (HISTORY) SECTION */}
              <div className="mt-12 bg-white border border-gray-200 rounded-[24px] p-8 shadow-sm">
                <h2 className="text-xl font-bold text-[#234745] mb-6 border-b border-gray-100 pb-4">
                  {isEn ? 'Recent Activity & Used Vouchers' : 'النشاط الأخير والقسائم المستعملة'}
                </h2>

                {!history || history.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    <svg
                      className="w-14 h-14 mx-auto mb-3 opacity-30 text-[#234745]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="font-bold text-gray-600 text-base mb-1">
                      {isEn
                        ? 'No used vouchers recorded yet.'
                        : 'لا يوجد سجل قسائم أو أكواد خصم مستعملة بعد.'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {isEn
                        ? 'All promotional vouchers, discount codes, and loyalty redemptions used on your orders will appear here.'
                        : 'ستظهر هنا جميع أكواد الخصم وقسائم الهدايا ونقاط الولاء التي يتم استخدامها في طلباتك.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {history.map((tx: any) => {
                      const isAddition = tx.amount > 0;
                      const absAmount = Math.abs(tx.amount);
                      return (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-[16px] hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex flex-col gap-1 text-start">
                            <span className="font-bold text-gray-700">
                              {isEn ? tx.labelEn : tx.labelAr}
                            </span>
                            <span
                              className="text-sm text-gray-500 font-medium"
                              dir="ltr"
                            >
                              {new Date(tx.date).toLocaleDateString(
                                isEn ? 'en-US' : 'ar-SA-u-nu-latn-ca-gregory',
                                {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                },
                              )}
                            </span>
                          </div>
                          {absAmount > 0 && (
                            <div
                              className={`font-black text-lg inline-flex items-center gap-1 ${isAddition ? 'text-emerald-600' : 'text-red-500'}`}
                              dir="ltr"
                            >
                              {isAddition ? '+' : '-'}
                              {absAmount.toFixed(2)}{' '}
                              <SaudiRiyalSymbol
                                className={`h-4.5 w-auto mb-0.5 ${isAddition ? 'text-emerald-600' : 'text-red-500'}`}
                              />
                            </div>
                          )}
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
