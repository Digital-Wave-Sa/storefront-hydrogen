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
  const isPrivateRoute = new RegExp(`^${localePrefix}/account/(orders|orders/.*|profile|addresses|addresses/.*)$`).test(pathname);

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
        country: storefront.i18n.country,
        language: storefront.i18n.language,
      },
      cache: storefront.CacheNone(),
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    return data(
      { isLoggedIn, isPrivateRoute, isAccountHome, customer, googleMapsKey: context.env.PUBLIC_GOOGLE_MAPS_KEY },
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
  const { customer, isPrivateRoute, isAccountHome, googleMapsKey } =
    useLoaderData<typeof loader>();

  if (!isPrivateRoute && !isAccountHome) {
    return <Outlet context={{ customer, googleMapsKey }} />;
  }

  return (
    <AccountLayout customer={customer as CustomerFragment}>
      <Outlet context={{ customer, googleMapsKey }} />
    </AccountLayout>
  );
}

function AccountLayout({
  customer,
  children,
}: {
  customer: CustomerFragment;
  children: React.ReactNode;
}) {
  return (
    <div className="account-page-wrapper">
      <div className="account-container">
        <aside className="account-aside">
          <div className="account-profile-summary">
            <div className="profile-initials">
              {(customer.firstName?.[0] || customer.email?.[0] || 'U').toUpperCase()}
            </div>
            <div className="profile-info">
              <h3>{customer.firstName ? `${customer.firstName} ${customer.lastName}` : 'أهلاً بك!'}</h3>
              <p>{customer.email}</p>
            </div>
          </div>
          <AcccountMenu />
        </aside>

        <main className="account-main">
          {children}
        </main>
      </div>
    </div>
  );
}

function AcccountMenu() {
  const isEn = useLocation().pathname.includes('/en/');

  return (
    <nav className="account-nav" role="navigation">
      <NavLink
        to="/account/orders"
        className={({ isActive }) => `account-nav-item ${isActive ? 'active' : ''}`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="3" width="20" height="14" rx="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 21h8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 17v4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {isEn ? 'Orders' : 'الطلبات'}
      </NavLink>

      <NavLink
        to="/account/profile"
        className={({ isActive }) => `account-nav-item ${isActive ? 'active' : ''}`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        {isEn ? 'Profile' : 'الملف الشخصي'}
      </NavLink>

      <NavLink
        to="/account/addresses"
        className={({ isActive }) => `account-nav-item ${isActive ? 'active' : ''}`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        {isEn ? 'Addresses' : 'العناوين'}
      </NavLink>

      <Logout isEn={isEn} />
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





