import { useState } from 'react';
import { useLoaderData, useFetcher, Link } from 'react-router';
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router';
import { getLoyaltyPoints, redeemLoyaltyPoints } from '~/lib/loyalty.server';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const isEn = new URL(request.url).pathname.startsWith('/en');

  let customerId: string | undefined = undefined;

  if (context?.session) {
    try {
      const sessionToken = await context.session.get('customerAccessToken');
      const tokenStr = typeof sessionToken === 'string' ? sessionToken : sessionToken?.accessToken;
      if (tokenStr && tokenStr !== 'dev-bypass-token' && context.storefront) {
        const { customer } = await context.storefront.query(
          `#graphql
          query getLoyaltyCustomer($customerAccessToken: String!) {
            customer(customerAccessToken: $customerAccessToken) { id phone email }
          }
          `,
          { variables: { customerAccessToken: tokenStr }, cache: context.storefront.CacheNone() }
        );
        if (customer?.id) customerId = customer.id;
      }
    } catch (e) {}
  }

  if (!customerId && context?.session) {
    customerId = await context.session.get('loginCustomerId');
  }

  if (!customerId) {
    return { customer: null, loyalty: { balance: 0, error: null }, isEn };
  }

  const balance = await getLoyaltyPoints({
    customerId,
    env: context.env,
    context,
  });

  return {
    customer: { id: customerId },
    loyalty: { balance, error: null },
    isEn,
  };
}

export async function action({ request, context }: ActionFunctionArgs) {
  const formData = await request.formData();
  const points = parseInt(formData.get('points')?.toString() || '0');

  if (points <= 0 || points % 100 !== 0) {
    return { success: false, error: 'Points must be redeemed in increments of 100.' };
  }

  let customerId: string | undefined = undefined;
  if (context?.session) {
    try {
      const sessionToken = await context.session.get('customerAccessToken');
      const tokenStr = typeof sessionToken === 'string' ? sessionToken : sessionToken?.accessToken;
      if (tokenStr && tokenStr !== 'dev-bypass-token' && context.storefront) {
        const { customer } = await context.storefront.query(
          `#graphql
          query getLoyaltyCustomerId($customerAccessToken: String!) {
            customer(customerAccessToken: $customerAccessToken) { id }
          }
          `,
          { variables: { customerAccessToken: tokenStr }, cache: context.storefront.CacheNone() }
        );
        if (customer?.id) customerId = customer.id;
      }
    } catch (e) {}
  }

  if (!customerId && context?.session) {
    customerId = await context.session.get('loginCustomerId');
  }

  if (!customerId) {
    return { success: false, error: 'Unauthorized' };
  }

  const res = await redeemLoyaltyPoints({
    customerId,
    points,
    env: context.env,
    context,
  });

  return res;
}

export default function LoyaltyPage() {
  const loaderData = useLoaderData<typeof loader>();
  const fetcher = useFetcher<any>();

  const customer = loaderData?.customer;
  const isEn = loaderData?.isEn || false;
  const initialLoyalty = loaderData?.loyalty;

  if (!customer) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-gray-100 max-w-md mx-auto my-10">
        <h2 className="text-xl font-bold text-[#234745] mb-2">
          {isEn ? 'Loyalty Rewards' : 'نقاط الولاء'}
        </h2>
        <p className="text-gray-500 mb-4 text-sm">
          {isEn ? 'Please log in to view your loyalty points.' : 'يرجى تسجيل الدخول لعرض نقاط الولاء الخاصة بك.'}
        </p>
        <Link
          to={isEn ? '/en/account/login' : '/account/login'}
          className="inline-block bg-[#234745] text-white px-6 py-2.5 rounded-full font-bold text-sm"
        >
          {isEn ? 'Log In' : 'تسجيل الدخول'}
        </Link>
      </div>
    );
  }

  const isSubmitting = fetcher.state === 'submitting';
  const actionData = fetcher.data;

  const currentBalance =
    actionData?.success && actionData?.newBalance !== undefined
      ? actionData.newBalance
      : initialLoyalty?.balance || 0;

  const redeemOptions = Array.from({ length: Math.floor(currentBalance / 100) }, (_, i) => (i + 1) * 100);

  return (
    <div className="loyalty-card p-6 bg-white rounded-xl shadow-md max-w-md mx-auto border border-gray-100 my-6 text-start">
      <h2 className="text-2xl font-bold mb-2 text-[#234745]">
        {isEn ? 'Loyalty Rewards' : 'مكافآت الولاء'}
      </h2>
      <p className="text-gray-500 mb-4 text-sm">
        {isEn
          ? 'Earn points on every purchase and redeem them for discounts.'
          : 'اكسب النقاط مع كل عملية شراء واستبدلها بخصومات.'}
      </p>

      {/* Balance Display */}
      <div className="bg-emerald-50 p-4 rounded-lg mb-6 border border-emerald-200">
        <span className="text-xs text-emerald-800 font-medium uppercase tracking-wide">
          {isEn ? 'Your Balance:' : 'رصيد نقاطك:'}
        </span>
        <div className="text-4xl font-extrabold text-emerald-900 mt-1 font-en">
          {currentBalance}{' '}
          <span className="text-lg font-normal">
            {isEn ? 'points' : 'نقطة'}
          </span>
        </div>
      </div>

      {/* Errors */}
      {(actionData?.error || initialLoyalty?.error) && (
        <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4 text-sm">
          {actionData?.error || initialLoyalty?.error}
        </div>
      )}

      {/* Success Discount Code Display */}
      {actionData?.success && actionData?.discountCode && (
        <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-lg mb-6 text-center">
          <p className="text-sm text-emerald-800 font-semibold mb-1">
            {isEn ? 'Discount Code Generated!' : 'تم إنشاء كود الخصم بنجاح!'}
          </p>
          <div className="text-xl font-mono font-bold text-emerald-900 select-all bg-white py-2 px-4 rounded border border-emerald-200 inline-block my-2">
            {actionData.discountCode}
          </div>
          <p className="text-xs text-emerald-600">
            {isEn
              ? 'Copy this code and apply it during checkout.'
              : 'قم بنسخ هذا الكود واستخدامه في صفحة إتمام الطلب.'}
          </p>
        </div>
      )}

      {/* Point Redemption Form */}
      <fetcher.Form method="post" className="space-y-4">
        <div>
          <label htmlFor="points" className="block text-sm font-medium text-gray-700 mb-1">
            {isEn
              ? 'Redeem Points (in increments of 100):'
              : 'استبدال النقاط (مضاعفات 100):'}
          </label>
          <select
            id="points"
            name="points"
            className="w-full border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-[#234745]"
            disabled={isSubmitting || currentBalance < 100}
          >
            {redeemOptions.length === 0 ? (
              <option value="">{isEn ? 'Insufficient points to redeem' : 'نقاط غير كافية للاستبدال'}</option>
            ) : (
              redeemOptions.map((pts) => (
                <option key={pts} value={pts}>
                  {pts} {isEn ? 'points =' : 'نقطة ='} {(pts / 10).toFixed(2)} {isEn ? 'SAR discount' : 'ر.س خصم'}
                </option>
              ))
            )}
          </select>
        </div>
        <button
          type="submit"
          disabled={isSubmitting || currentBalance < 100}
          className="w-full bg-[#234745] hover:bg-[#183432] disabled:bg-gray-300 text-white font-bold py-3 px-4 rounded-md transition-colors"
        >
          {isSubmitting
            ? isEn ? 'Redeeming...' : 'جاري الاستبدال...'
            : isEn ? 'Redeem Points' : 'استبدال النقاط'}
        </button>
      </fetcher.Form>
    </div>
  );
}
