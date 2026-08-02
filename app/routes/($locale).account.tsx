import { Form, NavLink, Outlet, useLoaderData, useLocation, useRouteLoaderData, Await } from 'react-router';
import { data, redirect, type LoaderFunctionArgs, type ShouldRevalidateFunction } from 'react-router';
import type { CustomerFragment } from 'storefrontapi.generated';
import { Suspense } from 'react';
import { AccountProfileHeader } from '~/components/account/AccountProfileHeader';
import { getLoyaltyPoints } from '~/lib/loyalty.server';
export const shouldRevalidate: ShouldRevalidateFunction = ({
  formMethod,
  currentUrl,
  nextUrl,
}) => {
  if (formMethod && formMethod !== 'GET') {
    return true;
  }
  if (currentUrl.toString() === nextUrl.toString()) {
    return true;
  }
  return false;
};
export async function loader({ request, context }: LoaderFunctionArgs) {
  const { session, storefront } = context;
  const { pathname } = new URL(request.url);
  const localePrefix = /^\/([a-z]{2})\//.test(pathname + '/') ? `/${pathname.split('/')[1]}` : '';
  const customerAccessToken = await session.get('customerAccessToken');
  console.log("AT TOP, TOKEN IS:", JSON.stringify(customerAccessToken));
  const isLoggedIn = Boolean(customerAccessToken?.accessToken || (typeof customerAccessToken === 'string' ? customerAccessToken : null));

  const isAccountHome = pathname === `${localePrefix}/account` || pathname === `${localePrefix}/account/`;
  // orders list (/account/orders) is private; detail pages (/account/orders/:id) render standalone like /track-order/:id
  const isOrderDetail = new RegExp(`^${localePrefix}/account/orders/.+$`).test(pathname);
  const isPrivateRoute = !isOrderDetail && new RegExp(`^${localePrefix}/account/(orders|profile|addresses|addresses/.*|dashboard|feedback-analytics|promotions|wishlist|wallet)$`).test(pathname);

  if (!isLoggedIn) {
    if (isPrivateRoute || isAccountHome || isOrderDetail) {
      session.unset('customerAccessToken');
      return redirect(`${localePrefix}/account/login`, {
        headers: {
          'Set-Cookie': await session.commit(),
        },
      });
    } else {
      return data({
        isLoggedIn: false,
        isAccountHome,
        isPrivateRoute,
        customer: null,
        googleMapsKey: context.env.PUBLIC_GOOGLE_MAPS_KEY
      });
    }
  } else {
    // We want the dashboard (_index) to render when visiting /account
    // so we no longer redirect to orders here.
  }

  try {
    console.log("TOKEN IS:", JSON.stringify(customerAccessToken));
    const { customer } = await storefront.query(CUSTOMER_QUERY, {
      variables: {
        customerAccessToken: typeof customerAccessToken === 'string' ? customerAccessToken : customerAccessToken?.accessToken,
      },
      cache: storefront.CacheNone(),
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    const isVerifyPhoneRoute = pathname === `${localePrefix}/account/verify-phone` || pathname === `${localePrefix}/account/verify-phone/`;
    const isLogoutRoute = pathname === `${localePrefix}/account/logout` || pathname === `${localePrefix}/account/logout/`;

    if (!customer.phone && !isVerifyPhoneRoute && !isLogoutRoute) {
      return redirect(`${localePrefix}/account/verify-phone`, {
        headers: {
          'Set-Cookie': await session.commit(),
        },
      });
    }

    const tags = customer?.tags || [];

    const isAdmin = tags.some((tag: string) => {
      const clean = tag.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      return clean === 'admin' || clean === 'branchmanager' || clean === 'manager';
    });

    const walletPromise = (async () => {
      let loyaltyPoints = 0;
      let balance = 0;
      let history: any[] = [];
      let cards: any[] = [];
      try {
        const middlewareUrl = context.env.MIDDLEWARE_URL || 'https://api.saadeddin.top';
        const branchId = await context.session.get('selectedLocationId');
        const isLocal = new URL(request.url).host.includes('localhost') || new URL(request.url).host.includes('127.0.0.1');

        // Ensure phone number matches expected local Saudi format for CRM (replace +966 with 0)
        let formattedPhone = customer.phone || '';
        if (isLocal && !formattedPhone) {
          formattedPhone = '0501234567';
        }
        if (formattedPhone.startsWith('+966')) {
          formattedPhone = '0' + formattedPhone.slice(4);
        }

        if (isLocal) {
          const globalGiftCards = (globalThis as any).__giftCards || new Map();
          const targetPhone = formattedPhone.replace(/\D/g, '');
          for (const card of globalGiftCards.values()) {
            if (card.phone && card.phone.replace(/\D/g, '') === targetPhone) {
              cards.push({
                code: card.code,
                currentBalance: card.currentBalance,
                status: card.status,
              });
              balance += card.currentBalance;
            }
          }

          history = cards.flatMap((card: any) => {
            const fullCard = globalGiftCards.get(card.code);
            return (fullCard?.transactions || []).map((tx: any) => {
              const amt = parseFloat(tx.amount || '0');
              return {
                id: tx.id,
                amount: tx.operation === 'REDEEM' || tx.operation === 'VOID' ? -amt : amt,
                date: tx.timestamp,
                labelEn: `${tx.operation} - ${card.code}`,
                labelAr: `${tx.operation === 'REDEEM' ? 'استرداد' : tx.operation === 'TOPUP' ? 'شحن' : tx.operation === 'ACTIVATE' ? 'تفعيل' : 'إنشاء'} - ${card.code}`
              };
            });
          }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        } else {
          const baseGiftCardUrl = middlewareUrl;
          // Fetch gift cards and total balance
          const cardsRes = await fetch(`${baseGiftCardUrl}/gift-cards/by-phone/${encodeURIComponent(formattedPhone)}`);
          if (cardsRes.ok) {
            const cardsData = (await cardsRes.json()) as any;
            if (cardsData?.success && cardsData?.data) {
              cards = cardsData.data.cards || [];
              balance = cardsData.data.totalBalance || 0;
            }
          }

          // Fetch transactions for all active gift cards concurrently
          const historyPromises = cards.map(async (card: any) => {
            try {
              const txRes = await fetch(`${baseGiftCardUrl}/gift-cards/${card.code}/transactions`);
              if (txRes.ok) {
                const txData = (await txRes.json()) as any;
                return (txData?.data?.transactions || []).map((tx: any) => {
                  const amt = parseFloat(tx.amount || '0');
                  return {
                    id: tx.id,
                    amount: tx.operation === 'REDEEM' || tx.operation === 'VOID' ? -amt : amt,
                    date: tx.timestamp,
                    labelEn: `${tx.operation} - ${card.code}`,
                    labelAr: `${tx.operation === 'REDEEM' ? 'استرداد' : tx.operation === 'TOPUP' ? 'شحن' : tx.operation === 'ACTIVATE' ? 'تفعيل' : 'إنشاء'} - ${card.code}`
                  };
                });
              }
            } catch (e) { }
            return [];
          });

          const historyResults = await Promise.all(historyPromises);
          history = historyResults
            .flat()
            .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }

        // Fetch Loyalty Points explicitly from CRM endpoint
        loyaltyPoints = await getLoyaltyPoints({
          customerId: customer.id,
          phone: formattedPhone || customer.phone || undefined,
          email: customer.email || undefined,
          env: context.env,
          context,
        });
      } catch (e) { }
      return { loyaltyPoints, balance, history, cards };
    })();

    return data(
      {
        isLoggedIn,
        isPrivateRoute,
        isAccountHome,
        customer,
        isAdmin,
        googleMapsKey: context.env.PUBLIC_GOOGLE_MAPS_KEY,
        walletPromise
      },
      {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      },
    );
  } catch (error) {
    console.warn('[Account Loader] Storefront customer query failed, attempting Admin API fallback:', error);
  try {
    const savedPhone = await session.get('loginOtpPhone');
    const savedEmail = await session.get('loginCustomerEmail');
    const savedCustomerId = await session.get('loginCustomerId');

    let adminToken: string | null = null;
    let adminDomain: string = '';
    try {
      const { getAdminToken, getAdminDomain } = await import('~/lib/shopify-admin.server');
      adminToken = await getAdminToken(context.env);
      adminDomain = getAdminDomain(context.env);
    } catch (_) {}

    let adminCust: any = null;
    let adminAddresses: any[] = [];

    if (adminToken && adminDomain && adminDomain.trim() !== '') {
      if (savedCustomerId) {
        try {
          const res = await fetch(`https://${adminDomain}/admin/api/2024-01/customers/${savedCustomerId}.json`, {
            headers: { 'X-Shopify-Access-Token': adminToken }
          });
          if (res.ok) {
            const data = await res.json() as any;
            adminCust = data.customer;
          }
        } catch (_) {}
      }
      if (!adminCust && savedPhone) {
        try {
          const rawDigits = savedPhone.replace(/\D/g, '');
          const last9 = rawDigits.slice(-9);
          const res = await fetch(`https://${adminDomain}/admin/api/2024-01/customers/search.json?query=${encodeURIComponent(last9)}&fields=id,email,phone,default_address,addresses`, {
            headers: { 'X-Shopify-Access-Token': adminToken }
          });
          if (res.ok) {
            const data = await res.json() as any;
            adminCust = (data.customers || []).find((c: any) => {
              const cp = (c.phone || '').replace(/\D/g, '');
              const sp = savedPhone.replace(/\D/g, '');
              return cp && sp && (cp === sp || cp.endsWith(sp) || sp.endsWith(cp));
            }) || data.customers?.[0];
          }
        } catch (_) {}
      }

        if (adminCust?.id) {
          try {
            const addrRes = await fetch(`https://${adminDomain}/admin/api/2024-01/customers/${adminCust.id}/addresses.json`, {
              headers: { 'X-Shopify-Access-Token': adminToken }
            });
            if (addrRes.ok) {
              const addrData = await addrRes.json() as any;
              adminAddresses = addrData.addresses || [];
            }
          } catch (_) {}
        }
      }

      const tags = adminCust?.tags ? (typeof adminCust.tags === 'string' ? adminCust.tags.split(',').map((t: string) => t.trim()) : adminCust.tags) : [];
      const isAdmin = tags.some((tag: string) => {
        const clean = tag.toLowerCase().replace(/[^a-z0-9]/g, '');
        return clean === 'admin' || clean === 'branchmanager' || clean === 'manager';
      });

      let mappedOrders: any[] = [];
      if (adminCust?.id && adminToken && adminDomain) {
        try {
          const ordersRes = await fetch(`https://${adminDomain}/admin/api/2024-01/customers/${adminCust.id}/orders.json?status=any`, {
            headers: { 'X-Shopify-Access-Token': adminToken }
          });
          if (ordersRes.ok) {
            const ordersData = await ordersRes.json() as any;
            if (ordersData.orders) {
              mappedOrders = ordersData.orders.map((o: any) => ({
                id: `gid://shopify/Order/${o.id}`,
                orderNumber: o.order_number,
                processedAt: o.processed_at,
                financialStatus: o.financial_status ? o.financial_status.toUpperCase() : 'PAID',
                fulfillmentStatus: o.fulfillment_status ? o.fulfillment_status.toUpperCase() : 'UNFULFILLED',
                currentTotalPrice: { amount: String(o.total_price), currencyCode: o.currency || 'SAR' },
                customAttributes: (o.note_attributes || []).map((attr: any) => ({ key: attr.name || attr.key, value: attr.value })),
                shippingTitle: o.shipping_lines?.[0]?.title || '',
                lineItems: {
                  nodes: (o.line_items || []).map((li: any) => ({
                    title: li.title,
                    quantity: li.quantity || 1,
                    variantId: li.variant_id,
                    variant: {
                      id: li.variant_id ? `gid://shopify/ProductVariant/${li.variant_id}` : undefined,
                      image: null
                    }
                  }))
                }
              }));
            }
          }
        } catch (e) {
          console.error('[Account Loader] Failed to fetch customer orders via Admin API:', e);
        }
      }

      const realOrderCount = mappedOrders.length || adminCust?.orders_count || 0;

      const fallbackCustomer = {
        id: adminCust ? `gid://shopify/Customer/${adminCust.id}` : 'gid://shopify/Customer/123456789',
        firstName: adminCust?.first_name || 'Customer',
        lastName: adminCust?.last_name || '',
        email: adminCust?.email || savedEmail || 'customer@saadeddin.top',
        phone: adminCust?.phone || savedPhone || '+966500000000',
        tags,
        numberOfOrders: realOrderCount,
        orders: { nodes: mappedOrders },
        addresses: {
          nodes: (adminAddresses.length > 0 ? adminAddresses : (adminCust?.default_address ? [adminCust.default_address] : (adminCust?.addresses || []))).map((addr: any) => ({
            id: `gid://shopify/MailingAddress/${addr.id}`,
            firstName: addr.first_name,
            lastName: addr.last_name,
            address1: addr.address1,
            address2: addr.address2,
            city: addr.city,
            phone: addr.phone,
            country: addr.country,
            zip: addr.zip
          }))
        }
      };

      const walletPromise = (async () => {
        let loyaltyPoints = 0;
        let balance = 0;
        let history: any[] = [];
        let cards: any[] = [];
        try {
          loyaltyPoints = await getLoyaltyPoints({
            customerId: fallbackCustomer.id,
            phone: fallbackCustomer.phone || undefined,
            email: fallbackCustomer.email || undefined,
            env: context.env,
            context,
          });
        } catch (e) { }
        return { loyaltyPoints, balance, history, cards };
      })();

      return data({
        isLoggedIn: true,
        isPrivateRoute,
        isAccountHome,
        customer: fallbackCustomer,
        isAdmin,
        googleMapsKey: context.env.PUBLIC_GOOGLE_MAPS_KEY,
        walletPromise
      });
    } catch (fallbackErr) {
      console.error('[Account Loader] Fallback customer fetch failed:', fallbackErr);
      session.unset('customerAccessToken');
      return redirect(`${localePrefix}/account/login`, {
        headers: { 'Set-Cookie': await session.commit() },
      });
    }
  }
}

export default function Acccount() {
  const { isLoggedIn, isPrivateRoute, isAccountHome, customer, googleMapsKey, isAdmin, walletPromise } = useLoaderData<any>();
  const rootData = useRouteLoaderData('root') as any;
  const locale = rootData?.locale || 'ar';

  if (!isPrivateRoute && !isAccountHome) {
    // This covers /account/orders/:id detail pages and other non-private routes
    return <Outlet context={{ customer, googleMapsKey, isAdmin, walletPromise, locale }} />;
  }

  return (
    <AccountLayout customer={customer as CustomerFragment} isAdmin={isAdmin} walletPromise={walletPromise}>
      <Outlet context={{ customer, googleMapsKey, isAdmin, walletPromise, locale }} />
    </AccountLayout>
  );
}

import { useWishlist } from '~/context/WishlistContext';
import { SaudiRiyalSymbol } from '~/components/Price';

function getSectionTitle(pathname: string, isEn: boolean) {
  const cleanPath = pathname.replace(/^\/en/, '').replace(/\/$/, '');
  if (cleanPath === '/account') return isEn ? 'Control Panel' : 'لوحة التحكم';
  if (cleanPath.startsWith('/account/orders')) return isEn ? 'My Orders' : 'طلباتي';
  if (cleanPath.startsWith('/account/wishlist')) return isEn ? 'Favorites' : 'المفضلة';
  if (cleanPath.startsWith('/account/wallet')) return isEn ? 'Wallet & Vouchers' : 'المحفظة والقسائم';
  if (cleanPath.startsWith('/account/addresses')) return isEn ? 'Addresses' : 'عناوين التوصيل';
  if (cleanPath.startsWith('/account/profile')) return isEn ? 'Personal Information' : 'المعلومات الشخصية';
  return isEn ? 'Control Panel' : 'لوحة التحكم';
}

function AccountLayout({
  customer,
  isAdmin,
  walletPromise,
  children,
}: {
  customer: CustomerFragment;
  isAdmin: boolean;
  walletPromise?: Promise<{ loyaltyPoints: number; balance: number }>;
  children: React.ReactNode;
}) {
  const location = useLocation();
  const isEn = location.pathname.startsWith('/en');
  const localePrefix = isEn ? '/en' : '';
  const isAccountHome = location.pathname === `${localePrefix}/account` || location.pathname === `${localePrefix}/account/`;

  const searchParams = new URLSearchParams(location.search);
  const viewOverview = searchParams.get('view') === 'overview';

  // Show back header if: not on account home, OR on account home but viewing the overview view (?view=overview)
  const showBackHeader = !isAccountHome || viewOverview;

  // Safe to use here since it's inside the WishlistProvider
  const { wishlist } = useWishlist();
  const wishlistCount = wishlist?.length || 0;

  const backUrl = `${localePrefix}/account`;
  const sectionTitle = getSectionTitle(location.pathname, isEn);

  let badgeText = '';
  const cleanPath = location.pathname.replace(/^\/en/, '').replace(/\/$/, '');
  if (cleanPath.startsWith('/account/wishlist')) {
    badgeText = `${wishlistCount} ${isEn ? 'Products' : 'منتجات'}`;
  }

  const backHeader = (
    <div
      className="lg:hidden w-full text-white py-3 md:py-3.5 mb-6 shadow-sm overflow-hidden relative"
      style={{
        backgroundColor: '#234745',
        backgroundImage: "url('/images/second-bg-pattern.svg')",
        backgroundRepeat: 'repeat',
        backgroundSize: '350px',
        backgroundPosition: 'center',
      }}
      dir={isEn ? 'ltr' : 'rtl'}
    >
      <div className="max-w-[1200px] mx-auto px-2 md:px-4 w-full flex items-center justify-between gap-4 relative z-10 min-h-[44px]">
        {/* Go Back button (Right side in RTL) */}
        <NavLink
          to={backUrl}
          className="shrink-0 bg-[#9fb7ae] hover:bg-[#8ba19c] !text-[#234745] px-4 md:px-5 py-1.5 md:py-2 rounded-full font-bold text-[13px] md:text-[15px] flex items-center gap-2 transition-all shadow-sm whitespace-nowrap"
          style={!isEn ? { fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" } : undefined}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={isEn ? 'rotate-180' : ''}
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
          <span>{isEn ? 'Back' : 'رجوع'}</span>

        </NavLink>

        {/* Center Title */}
        <h2
          className="flex-1 min-w-0 text-start text-[18px] md:text-[22px] font-bold select-none !m-0 leading-tight text-white"
          style={!isEn ? { fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" } : undefined}
        >
          {sectionTitle}
        </h2>

        {/* Badge or Equal Spacer (Left side in RTL) */}
        {badgeText ? (
          <div
            className="shrink-0 bg-[#FEF8EB] text-[#234745] px-4 md:px-5 py-1.5 md:py-2 rounded-full font-bold text-[13px] md:text-[14px] whitespace-nowrap shadow-sm"
            style={!isEn ? { fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" } : undefined}
          >
            {badgeText}
          </div>
        ) : (
          <div className="w-[85px] md:w-[110px] shrink-0 opacity-0 pointer-events-none" />
        )}
      </div>
    </div >
  );

  return (
    <div className="account-layout bg-[#FEF8EB] min-h-screen">
      <Suspense fallback={<AccountProfileHeader customer={customer} isEn={isEn} loyaltyPoints={0} balance={0} wishlistCount={0} />}>
        <Await resolve={walletPromise}>
          {(wallet) => (
            <AccountProfileHeader customer={customer} isEn={isEn} loyaltyPoints={wallet?.loyaltyPoints || 0} balance={wallet?.balance || 0} wishlistCount={wishlistCount} />
          )}
        </Await>
      </Suspense>

      {/* Full width Go Back Banner for Inner Pages */}
      {showBackHeader && backHeader}

      <div className="max-w-[1200px] mx-auto px-4 md:px-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[302px_minmax(0,1fr)] gap-6 lg:gap-10 items-start w-full !mt-0 !pt-0">
          <nav className="w-auto -mx-4 px-4 bg-transparent lg:mx-0 lg:w-full lg:bg-white lg:rounded-[24px] lg:py-6 lg:px-4 lg:border lg:border-[#BBCFCD] lg:sticky lg:top-[120px] z-10 min-w-0 max-w-[100vw] lg:max-w-full relative hidden lg:block">
            <AcccountMenu customer={customer} isAdmin={isAdmin} />
          </nav>
          <main className="w-full min-w-0 max-w-[100vw] lg:max-w-full pb-20">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

function AcccountMenu({ customer, isAdmin }: { customer: CustomerFragment; isAdmin: boolean }) {
  const isEn = useLocation().pathname.startsWith('/en');
  const localePrefix = isEn ? '/en' : '';

  const menuItems = [
    {
      to: `${localePrefix}/account`,
      label: isEn ? 'Dashboard' : 'لوحة التحكم',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
      end: true
    },
    {
      to: `${localePrefix}/account/orders`,
      label: isEn ? 'My Orders' : 'طلباتي',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4H6z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 01-8 0" />
        </svg>
      )
    },
    {
      to: `${localePrefix}/account/wishlist`,
      label: isEn ? 'Favorites' : 'المفضلة',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
        </svg>
      )
    },
    {
      to: `${localePrefix}/account/wallet`,
      label: isEn ? 'Wallet & Vouchers' : 'المحفظة والقسائم',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
          <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
          <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
        </svg>
      )
    },
    {
      to: `${localePrefix}/account/addresses`,
      label: isEn ? 'Addresses' : 'عناوين التوصيل',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      )
    },
    {
      to: `${localePrefix}/account/profile`,
      label: isEn ? 'Personal Information' : 'المعلومات الشخصية',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )
    }
  ];

  if (isAdmin) {
    menuItems.push({
      to: `${localePrefix}/account/promotions`,
      label: isEn ? 'Vouchers & Campaigns' : 'القسائم والحملات',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
          <line x1="7" y1="7" x2="7.01" y2="7" strokeLinecap="round" strokeWidth="3" />
        </svg>
      )
    });
    menuItems.push({
      to: `${localePrefix}/account/feedback-analytics`,
      label: isEn ? 'Feedback Analytics' : 'تحليلات التقييمات',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 3v18h18" />
          <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
        </svg>
      )
    });
  }

  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden" dir={isEn ? 'ltr' : 'rtl'}>
      <nav role="navigation">
        <div className="account-nav">
          {menuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className="account-nav-item"
            >
              {item.icon}
              <span style={!isEn ? { fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" } : undefined}>
                {item.label}
              </span>
            </NavLink>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 lg:block hidden">
          <Logout isEn={isEn} />
        </div>

        {/* Manager Tools (Optional section if needed) */}
        {isAdmin && (
          <div className="mt-4 lg:mt-6 pt-4 border-t border-gray-100">
            <NavLink
              to={`${localePrefix}/account/dashboard`}
              className="flex items-center justify-between px-2 lg:px-4 py-2 lg:py-3 text-gray-500 hover:text-[#234745] transition-all"
            >
              <span className="text-[13px] font-bold tracking-wider">{isEn ? 'Admin Panel' : 'لوحة الإدارة'}</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            </NavLink>
          </div>
        )}
      </nav>
    </div>
  );
}

function Logout({ isEn }: { isEn: boolean }) {
  return (
    <Form
      className="account-logout"
      method="POST"
      action="/account/logout"
      onSubmit={() => {
        localStorage.removeItem('wishlist');
        document.cookie = 'cart=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;';
      }}
    >
      <button type="submit" className="account-nav-item" style={{ width: '100%', textAlign: 'start' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
        </svg>
        {isEn ? 'Sign out' : 'تسجيل الخروج'}
      </button>
    </Form>
  );
}

export const CUSTOMER_FRAGMENT = `#graphql
  fragment Customer on Customer {
    id
    createdAt
    tags
    acceptsMarketing
    addresses(first: 6) {
      nodes {
        ...Address
      }
    }
    defaultAddress {
      ...Address
    }
    email
    firstName
    lastName
    numberOfOrders
    phone
    birthdate: metafield(namespace: "custom", key: "birthdate") {
      value
    }
    orders(first: 50, sortKey: PROCESSED_AT, reverse: true) {
      nodes {
        id
        orderNumber
        processedAt
        financialStatus
        fulfillmentStatus
        currentTotalPrice {
          amount
          currencyCode
        }
        lineItems(first: 20) {
          nodes {
            title
            quantity
            variant {
              id
              image {
                url
                altText
              }
            }
          }
        }
      }
    }
  }
  fragment Address on MailingAddress {
    id
    formatted
    firstName
    lastName
    company
    address1
    address2
    country
    province
    city
    zip
    phone
  }
` as const;

const CUSTOMER_QUERY = `#graphql
  query Customer(
    $customerAccessToken: String!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    customer(customerAccessToken: $customerAccessToken) {
      ...Customer
    }
  }
  ${CUSTOMER_FRAGMENT}
` as const;





