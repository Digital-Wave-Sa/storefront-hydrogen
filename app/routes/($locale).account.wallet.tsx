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
  const middlewareUrl = env.MIDDLEWARE_URL || 'https://api.pryvexapls.com';
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
          <h1 className="text-3xl font-black text-[#234745] mb-2">
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
                <h1 className="text-3xl font-black text-[#234745] mb-2">
                  {isEn ? 'Wallet & Vouchers' : 'المحفظة والقسائم'}
                </h1>
                <p className="text-gray-500 font-medium">
                  {isEn ? 'Manage your store balance, redeem gift vouchers, and view your loyalty points.' : 'إدارة رصيد متجرك واسترداد قسائم الهدايا وعرض نقاط الولاء الخاصة بك.'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                {/* Wallet Balance Card */}
                <div className="bg-gradient-to-br from-[#234745] to-[#1a3533] rounded-[24px] p-8 text-white relative overflow-hidden shadow-xl shadow-[#234745]/20">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-5 rounded-full -translate-y-10 translate-x-10" />
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#d4a06a] opacity-10 rounded-full translate-y-10 -translate-x-10" />
                  
                  <div className="relative z-10">
                    <h3 className="text-white/80 font-medium text-sm uppercase tracking-wider mb-2">
                      {isEn ? 'Current Balance' : 'الرصيد الحالي'}
                    </h3>
                    <div className="flex items-end gap-1.5">
                      <span className="text-5xl font-black">{currentBalance.toFixed(2)}</span>
                      <SaudiRiyalSymbol className="h-9 w-auto text-[#d4a06a] mb-1" />
                    </div>
                    <p className="mt-6 text-sm text-white/70">
                      {isEn ? 'Use this balance at checkout to pay for your orders.' : 'استخدم هذا الرصيد عند الدفع لتغطية طلباتك.'}
                    </p>
                  </div>
                </div>

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

              {/* Active Gift Cards Section */}
              {activeCards.length > 0 && (
                <div className="mb-10 animate-fade-in">
                  <h2 className="text-xl font-bold text-[#234745] mb-6">
                    {isEn ? 'My Activated Gift Cards' : 'بطاقات الهدايا النشطة'}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeCards.map((card: any) => (
                      <div key={card.code} className="bg-gradient-to-br from-[#234745] to-[#2D5A57] rounded-[20px] p-6 text-white shadow-md relative overflow-hidden border border-[#d4a06a]/20">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white opacity-5 rounded-full -translate-y-8 translate-x-8" />
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <span className="text-xs text-white/60 block uppercase font-bold tracking-wider">{isEn ? 'Card Code' : 'رمز البطاقة'}</span>
                            <span className="font-mono text-lg font-bold tracking-wider select-all">{card.code}</span>
                          </div>
                          <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider ${card.status === 'active' ? 'bg-[#d4a06a] text-white' : 'bg-red-500/20 text-red-300'}`}>
                            {card.status}
                          </span>
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-end">
                          <div>
                            <span className="text-xs text-white/60 block">{isEn ? 'Balance' : 'الرصيد'}</span>
                            <span className="text-2xl font-black inline-flex items-center gap-1.5">{parseFloat(card.currentBalance).toFixed(2)} <SaudiRiyalSymbol className="h-5 w-auto text-[#d4a06a] mb-0.5" /></span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Redeem Voucher Section */}
                <div className="bg-white border border-gray-200 rounded-[24px] p-8 shadow-sm h-full flex flex-col">
                  <h2 className="text-xl font-bold text-[#234745] mb-6 border-b border-gray-100 pb-4">
                    {isEn ? 'Redeem a Gift Voucher' : 'استرداد قسيمة هدايا'}
                  </h2>

                  {actionData?.intent === 'redeem_voucher' && actionData?.success && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-6 py-4 rounded-[16px] mb-6 flex items-center gap-3 animate-fade-in">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-600">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                      <div>
                        <p className="font-bold">
                          {isEn ? 'Voucher Activated Successfully!' : 'تم تفعيل القسيمة بنجاح!'}
                        </p>
                        <p className="text-sm opacity-90">
                          {isEn ? `Bound ${actionData.creditedAmount} SAR voucher to your phone.` : `تم ربط قسيمة بقيمة ${actionData.creditedAmount} ر.س. برقم هاتفك.`}
                        </p>
                      </div>
                    </div>
                  )}

                  {actionData?.intent === 'redeem_voucher' && actionData?.error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-[16px] mb-6 flex items-center gap-3 animate-fade-in">
                       <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 text-red-600">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      </div>
                      <p className="font-bold">{actionData.error}</p>
                    </div>
                  )}

                  <Form method="POST" className="flex flex-col gap-4 mt-auto" key={actionData?.intent === 'redeem_voucher' && actionData?.success ? 'success-reset-redeem' : 'form-redeem'}>
                    <input type="hidden" name="intent" value="redeem_voucher" />
                    <input 
                      type="text" 
                      name="voucherCode" 
                      placeholder={isEn ? "Enter voucher code (e.g. GC-WELCOME50)" : "أدخل رمز القسيمة (مثال: GC-WELCOME50)"}
                      className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 focus:border-[#234745] focus:bg-white rounded-[16px] outline-none transition-all font-bold text-gray-700 placeholder:font-medium placeholder:text-gray-400"
                      required
                    />
                    <Button 
                      type="submit" 
                      variant="primary" 
                      disabled={isSubmitting}
                      className="w-full py-4 rounded-[16px] font-bold tracking-wide"
                    >
                      {isSubmitting && navigation.formData?.get('intent') === 'redeem_voucher' ? (isEn ? 'Verifying...' : 'جاري التحقق...') : (isEn ? 'Redeem Voucher' : 'تفعيل القسيمة')}
                    </Button>
                  </Form>
                </div>

                {/* Gift Balance to a Friend Section */}
                <div className="bg-white border border-gray-200 rounded-[24px] p-8 shadow-sm h-full flex flex-col">
                  <h2 className="text-xl font-bold text-[#234745] mb-6 border-b border-gray-100 pb-4">
                    {isEn ? 'Gift Balance to a Friend' : 'إهداء رصيد لصديق'}
                  </h2>

                  {actionData?.intent === 'gift_balance' && actionData?.success && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-6 py-4 rounded-[16px] mb-6 flex items-center gap-3 animate-fade-in">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-600">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                      </div>
                      <div>
                        <p className="font-bold">
                          {isEn ? 'Gift Sent Successfully!' : 'تم إرسال الهدية بنجاح!'}
                        </p>
                        <p className="text-sm opacity-90">
                          {isEn ? `You gifted ${actionData.giftAmount} SAR to ${actionData.recipientPhone}.` : `قمت بإهداء ${actionData.giftAmount} ر.س. إلى ${actionData.recipientPhone}.`}
                        </p>
                      </div>
                    </div>
                  )}

                  {actionData?.intent === 'gift_balance' && actionData?.error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-[16px] mb-6 flex items-center gap-3 animate-fade-in">
                       <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 text-red-600">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      </div>
                      <p className="font-bold">{actionData.error}</p>
                    </div>
                  )}

                  <Form method="POST" className="flex flex-col gap-4 mt-auto" key={actionData?.intent === 'gift_balance' && actionData?.success ? 'success-reset-gift' : 'form-gift'}>
                    <input type="hidden" name="intent" value="gift_balance" />
                    <input type="hidden" name="currentBalance" value={currentBalance} />
                    
                    <div className="flex flex-col gap-4">
                      <input 
                        type="tel" 
                        name="recipientPhone" 
                        placeholder={isEn ? "Recipient Phone (e.g. 05...)" : "رقم هاتف المستلم (مثال: 05...)"}
                        className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 focus:border-[#234745] focus:bg-white rounded-[16px] outline-none transition-all font-bold text-gray-700 placeholder:font-medium placeholder:text-gray-400"
                        required
                      />
                      <div className="w-full flex items-center bg-gray-50 border-2 border-gray-100 rounded-[16px] focus-within:border-[#234745] focus-within:bg-white transition-all overflow-hidden">
                        <input 
                          type="number" 
                          name="giftAmount"
                          min="1"
                          max={currentBalance}
                          placeholder={isEn ? "Amount" : "المبلغ"}
                          className="flex-grow w-full px-5 py-4 bg-transparent outline-none font-bold text-gray-700 placeholder:font-medium placeholder:text-gray-400 min-w-0"
                          required
                        />
                        <span className="px-5 bg-gray-50 border-l border-gray-200 rtl:border-l-0 rtl:border-r h-full flex items-center shrink-0">
                          <SaudiRiyalSymbol className="h-4.5 w-auto text-[#A6BFB9]" />
                        </span>
                      </div>
                    </div>

                    <input 
                      type="text" 
                      name="giftMessage" 
                      placeholder={isEn ? "Personal Message (Optional)" : "رسالة شخصية (اختياري)"}
                      className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 focus:border-[#234745] focus:bg-white rounded-[16px] outline-none transition-all font-bold text-gray-700 placeholder:font-medium placeholder:text-gray-400"
                    />

                    <Button 
                      type="submit" 
                      variant="secondary" 
                      disabled={isSubmitting}
                      className="w-full py-4 rounded-[16px] font-bold tracking-wide mt-2"
                    >
                      {isSubmitting && navigation.formData?.get('intent') === 'gift_balance' ? (isEn ? 'Sending...' : 'جاري الإرسال...') : (isEn ? 'Send Gift' : 'إرسال الهدية')}
                    </Button>
                  </Form>
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
