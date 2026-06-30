import { Form, NavLink, Outlet, useLoaderData, useLocation, useRouteLoaderData, Await } from 'react-router';
import { data, redirect, type LoaderFunctionArgs } from 'react-router';
import type { CustomerFragment } from 'storefrontapi.generated';
import { Suspense } from 'react';
import { AccountProfileHeader } from '~/components/account/AccountProfileHeader';
export function shouldRevalidate() {
  return false;
}
export async function loader({ request, context }: LoaderFunctionArgs) {
  const { session, storefront } = context;
  const { pathname } = new URL(request.url);
  const localePrefix = /^\/([a-z]{2})\//.test(pathname + '/') ? `/${pathname.split('/')[1]}` : '';
  const customerAccessToken = await session.get('customerAccessToken');
  console.log("AT TOP, TOKEN IS:", JSON.stringify(customerAccessToken));
  const isLoggedIn = Boolean(customerAccessToken?.accessToken || (typeof customerAccessToken === 'string' ? customerAccessToken : null));
  
  const isAccountHome = pathname === `${localePrefix}/account` || pathname === `${localePrefix}/account/`;
  const isPrivateRoute = new RegExp(`^${localePrefix}/account/(orders|orders/.*|profile|addresses|addresses/.*|notification-preferences|dashboard|feedback-analytics|promotions|wishlist|wallet|payments)$`).test(pathname);

  if (!isLoggedIn) {
    if (isPrivateRoute || isAccountHome) {
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
    // DEV BYPASS: If we are in dev mode and have a fake token, try to fetch the REAL customer profile via Admin API
    if (process.env.NODE_ENV === 'development' && customerAccessToken?.accessToken === 'dev-bypass-token') {
      const savedPhone = session.get('loginOtpPhone');
      
      let realCustomer: any = null;
      let tags: string[] = [];
      let isAdmin = false;

      if (savedPhone) {
        try {
          const { getAdminToken } = await import('~/lib/shopify-admin.server');
          const adminToken = await getAdminToken(context.env);
          const queryStr = savedPhone.includes('590910042') 
            ? encodeURIComponent('email:"motasem.udeh@gmail.com"')
            : encodeURIComponent(`phone:"${savedPhone}"`);
          const res = await fetch(`https://${context.env.PUBLIC_STORE_DOMAIN}/admin/api/2023-04/customers/search.json?query=${queryStr}`, {
            headers: { 'X-Shopify-Access-Token': adminToken, 'Content-Type': 'application/json' },
          });
          const { customers } = await res.json();
          
          if (customers && customers.length > 0) {
            const adminCust = customers[0];
            // Format the admin customer to look like the Storefront API customer fragment
            tags = adminCust.tags ? adminCust.tags.split(',').map((t: string) => t.trim()) : [];
            isAdmin = tags.some((tag: string) => {
              const clean = tag.toLowerCase().replace(/[^a-z0-9]/g, '');
              return clean === 'admin' || clean === 'branchmanager' || clean === 'manager';
            });

            realCustomer = {
              id: `gid://shopify/Customer/${adminCust.id}`,
              firstName: adminCust.first_name,
              lastName: adminCust.last_name,
              email: adminCust.email,
              phone: adminCust.phone,
              tags: tags,
              numberOfOrders: adminCust.orders_count || 0,
              addresses: {
                nodes: (adminCust.addresses || []).map((addr: any) => ({
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
              },
              defaultAddress: adminCust.default_address ? {
                id: `gid://shopify/MailingAddress/${adminCust.default_address.id}`,
                firstName: adminCust.default_address.first_name,
                lastName: adminCust.default_address.last_name,
                address1: adminCust.default_address.address1,
                address2: adminCust.default_address.address2,
                city: adminCust.default_address.city,
                phone: adminCust.default_address.phone,
                country: adminCust.default_address.country,
                zip: adminCust.default_address.zip
              } : null
            };
          }
        } catch (e) {
          console.error('Dev bypass failed to fetch real customer', e);
        }
      }

      // Fallback to Motasem's mock if we couldn't find them in Shopify Admin API (due to invalid token)
      const mockCustomer = realCustomer || {
        id: 'gid://shopify/Customer/123456789',
        firstName: 'Dev',
        lastName: 'User',
        email: 'dev@example.com',
        phone: savedPhone || '+966590000000',
        tags: ['admin'],
        numberOfOrders: 0,
        orders: { nodes: [] },
        addresses: { nodes: [] },
      };

      const walletPromise = (async () => {
        let loyaltyPoints = 0;
        let balance = 0;
        let history: any[] = [];
        try {
          const middlewareUrl = context.env.MIDDLEWARE_URL || 'https://wh.pryvexapls.com';
          const branchId = await context.session.get('selectedLocationId');
          const res = await fetch(`${middlewareUrl}/wallet/balance?user_id=${encodeURIComponent(mockCustomer.id)}&phone=${encodeURIComponent(mockCustomer.phone || '')}`, {
            headers: { 'x-branch-id': branchId || '1' }
          });
          const apiData = await res.json();
          if (apiData?.success && apiData?.data) {
            balance = apiData.data.balance || 0;
          } else if (apiData && apiData.balance !== undefined) {
            balance = apiData.balance || 0;
          }

          // Fetch Loyalty Points explicitly from CRM endpoint
          const loyaltyRes = await fetch(`${middlewareUrl}/crm/loyalty`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-branch-id': branchId || '1' },
            body: JSON.stringify({ phone: mockCustomer.phone || '' })
          });
          if (loyaltyRes.ok) {
            const loyaltyData = await loyaltyRes.json();
            if (loyaltyData?.success && loyaltyData?.data?.points) {
              loyaltyPoints = loyaltyData.data.points;
            }
          }

          const histRes = await fetch(`${middlewareUrl}/wallet/transactions?user_id=${encodeURIComponent(mockCustomer.id)}&phone=${encodeURIComponent(mockCustomer.phone || '')}`, {
            headers: { 'x-branch-id': branchId || '1' }
          });
          if (histRes.ok) {
            const histData = await histRes.json();
            if (histData?.items) {
               history = histData.items.map((tx: any) => {
                 const amt = parseFloat(tx.amount) || 0;
                 return {
                   id: tx.id,
                   amount: tx.type === 'VOUCHER_TOP_UP' || amt > 0 ? amt : -amt,
                   date: tx.createdAt,
                   labelEn: tx.description || tx.type,
                   labelAr: tx.description || tx.type
                 };
               });
            }
          }
        } catch (e) {}
        return { loyaltyPoints, balance, history };
      })();

      return data({
        isLoggedIn: true,
        isPrivateRoute,
        isAccountHome,
        customer: mockCustomer,
        isAdmin: realCustomer ? isAdmin : true,
        googleMapsKey: context.env.PUBLIC_GOOGLE_MAPS_KEY,
        walletPromise
      });
    }

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

    const tags = customer?.tags || [];

    const isAdmin = tags.some((tag: string) => {
      const clean = tag.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      return clean === 'admin' || clean === 'branchmanager' || clean === 'manager';
    });

    const walletPromise = (async () => {
      let loyaltyPoints = 0;
      let balance = 0;
      let history: any[] = [];
      try {
        const middlewareUrl = context.env.MIDDLEWARE_URL || 'https://wh.pryvexapls.com';
        const branchId = await context.session.get('selectedLocationId');
        
        // Ensure phone number matches expected local Saudi format for CRM (replace +966 with 0)
        let formattedPhone = customer.phone || '';
        if (formattedPhone.startsWith('+966')) {
          formattedPhone = '0' + formattedPhone.slice(4);
        }

        const res = await fetch(`${middlewareUrl}/wallet/balance?user_id=${encodeURIComponent(customer.id)}&phone=${encodeURIComponent(formattedPhone)}`, {
          headers: { 'x-branch-id': branchId || '1' }
        });
        const apiData = await res.json();
        if (apiData?.success && apiData?.data) {
          balance = apiData.data.balance || 0;
        } else if (apiData && apiData.balance !== undefined) {
          balance = apiData.balance || 0;
        }

        // Fetch Loyalty Points explicitly from CRM endpoint
        const loyaltyRes = await fetch(`${middlewareUrl}/crm/loyalty`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-branch-id': branchId || '1' },
          body: JSON.stringify({ phone: formattedPhone })
        });
        if (loyaltyRes.ok) {
          const loyaltyData = await loyaltyRes.json();
          if (loyaltyData?.success && loyaltyData?.data?.points) {
            loyaltyPoints = loyaltyData.data.points;
          }
        }

        const histRes = await fetch(`${middlewareUrl}/wallet/transactions?user_id=${encodeURIComponent(customer.id)}&phone=${encodeURIComponent(formattedPhone)}`, {
            headers: { 'x-branch-id': branchId || '1' }
        });
        if (histRes.ok) {
          const histData = await histRes.json();
          if (histData?.items) {
              history = histData.items.map((tx: any) => {
                const amt = parseFloat(tx.amount) || 0;
                return {
                  id: tx.id,
                  amount: tx.type === 'VOUCHER_TOP_UP' || amt > 0 ? amt : -amt,
                  date: tx.createdAt,
                  labelEn: tx.description || tx.type,
                  labelAr: tx.description || tx.type
                };
              });
          }
        }
      } catch (e) {}
      return { loyaltyPoints, balance, history };
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
    console.error('There was a problem loading account', error);
    session.unset('customerAccessToken');
    return redirect('/account/login', {
      headers: {
        'Set-Cookie': await session.commit(),
      },
    });
  }
}

export default function Acccount() {
  const { isLoggedIn, isPrivateRoute, isAccountHome, customer, googleMapsKey, isAdmin, walletPromise } = useLoaderData<typeof loader>();
  const rootData = useRouteLoaderData('root') as any;
  const locale = rootData?.locale || 'ar';

  if (!isPrivateRoute && !isAccountHome) {
    return <Outlet context={{ customer, googleMapsKey, isAdmin, walletPromise, locale }} />;
  }

  return (
    <AccountLayout customer={customer as CustomerFragment} isAdmin={isAdmin} walletPromise={walletPromise}>
      <Outlet context={{ customer, googleMapsKey, isAdmin, walletPromise, locale }} />
    </AccountLayout>
  );
}

import { useWishlist } from '~/context/WishlistContext';

function AccountLayout({
  customer,
  isAdmin,
  walletPromise,
  children,
}: {
  customer: CustomerFragment;
  isAdmin: boolean;
  walletPromise?: Promise<{loyaltyPoints: number; balance: number}>;
  children: React.ReactNode;
}) {
  const location = useLocation();
  const isEn = location.pathname.startsWith('/en');
  
  // Safe to use here since it's inside the WishlistProvider
  const { wishlist } = useWishlist();
  const wishlistCount = wishlist?.length || 0;
  
  return (
    <div className="account-layout">
      <Suspense fallback={<AccountProfileHeader customer={customer} isEn={isEn} loyaltyPoints={0} balance={0} wishlistCount={0} />}>
        <Await resolve={walletPromise}>
          {(wallet) => (
            <AccountProfileHeader customer={customer} isEn={isEn} loyaltyPoints={wallet?.loyaltyPoints || 0} balance={wallet?.balance || 0} wishlistCount={wishlistCount} />
          )}
        </Await>
      </Suspense>
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[302px_minmax(0,1fr)] gap-6 lg:gap-10 items-start w-full !mt-0 !pt-0">
          <nav className="w-auto -mx-4 px-4 bg-transparent lg:mx-0 lg:w-full lg:bg-white lg:rounded-[24px] lg:py-6 lg:px-4 lg:border lg:border-[#BBCFCD] lg:sticky lg:top-[120px] z-10 min-w-0 max-w-[100vw] lg:max-w-full relative">
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
      to: `${localePrefix}/account/payments`,
      label: isEn ? 'Payment Methods' : 'طرق الدفع',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="1" y="4" width="22" height="16" rx="2" />
          <line x1="1" y1="10" x2="23" y2="10" />
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
    },
    {
      to: `${localePrefix}/account/notification-preferences`,
      label: isEn ? 'Notifications' : 'الاشعارات',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
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
            variant {
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





