import { Form, NavLink, Outlet, useLoaderData, useLocation } from 'react-router';
import { data, redirect, type LoaderFunctionArgs } from 'react-router';
import type { CustomerFragment } from 'storefrontapi.generated';

export function shouldRevalidate() {
  return true;
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { session, storefront } = context;
  const { pathname } = new URL(request.url);
  const localePrefix = /^\/([a-z]{2})\//.test(pathname + '/') ? `/${pathname.split('/')[1]}` : '';
  const customerAccessToken = await session.get('customerAccessToken');
  const isLoggedIn = Boolean(customerAccessToken?.accessToken);
  
  const isAccountHome = pathname === `${localePrefix}/account` || pathname === `${localePrefix}/account/`;
  const isPrivateRoute = new RegExp(`^${localePrefix}/account/(orders|orders/.*|profile|addresses|addresses/.*|notification-preferences|dashboard|promotions|wishlist)$`).test(pathname);

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
    if (isAccountHome) {
      return redirect(`${localePrefix}/account/orders`);
    }
  }

  try {
    const { customer } = await storefront.query(CUSTOMER_QUERY, {
      variables: {
        customerAccessToken: customerAccessToken.accessToken,
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

    return data(
      { 
        isLoggedIn, 
        isPrivateRoute, 
        isAccountHome, 
        customer, 
        isAdmin,
        googleMapsKey: context.env.PUBLIC_GOOGLE_MAPS_KEY 
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
  const { isLoggedIn, isPrivateRoute, isAccountHome, customer, googleMapsKey, isAdmin } = useLoaderData<typeof loader>();

  if (!isPrivateRoute && !isAccountHome) {
    return <Outlet context={{ customer, googleMapsKey, isAdmin }} />;
  }

  return (
    <AccountLayout customer={customer as CustomerFragment} isAdmin={isAdmin}>
      <Outlet context={{ customer, googleMapsKey, isAdmin }} />
    </AccountLayout>
  );
}

import {AccountProfileHeader} from '~/components/account/AccountProfileHeader';

function AccountLayout({
  customer,
  isAdmin,
  children,
}: {
  customer: CustomerFragment;
  isAdmin: boolean;
  children: React.ReactNode;
}) {
  const isEn = typeof window !== 'undefined' ? window.location.pathname.includes('/en') : false;

  return (
    <div className="account-page-wrapper">
      <div className="max-w-[1200px] mx-auto px-4 md:px-6">
        <AccountProfileHeader customer={customer} isEn={isEn} />
        
        <div className="account-container !mt-0 !pt-0">
          <nav className="account-aside">
            <AcccountMenu customer={customer} isAdmin={isAdmin} />
          </nav>
          <main className="account-main">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

function AcccountMenu({ customer, isAdmin }: { customer: CustomerFragment; isAdmin: boolean }) {
  const isEn = useLocation().pathname.includes('/en/');
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

  return (
    <nav className="account-nav-premium" role="navigation">
      <div className="flex flex-col gap-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `
              flex items-center justify-between px-4 py-3.5 rounded-[14px] transition-all duration-200
              ${isActive 
                ? 'bg-[#FEF8EB] text-[#234745] font-bold shadow-sm' 
                : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600 font-medium'}
            `}
          >
            <span className="text-[14px]">{item.label}</span>
            <div className={`opacity-80`}>{item.icon}</div>
          </NavLink>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <Logout isEn={isEn} />
      </div>

      {/* Manager Tools (Optional section if needed) */}
      {isAdmin && (
        <div className="mt-6 pt-4 border-t border-gray-100">
           <NavLink
            to={`${localePrefix}/account/dashboard`}
            className="flex items-center justify-between px-4 py-3 text-gray-400 hover:text-[#d4a06a] transition-all"
          >
            <span className="text-[12px] font-bold uppercase tracking-wider">{isEn ? 'Admin Panel' : 'لوحة الإدارة'}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
          </NavLink>
        </div>
      )}
    </nav>
  );
}

function Logout({ isEn }: { isEn: boolean }) {
  return (
    <Form className="account-logout" method="POST" action="/account/logout">
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





