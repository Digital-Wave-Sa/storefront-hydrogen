import {Await, Link, useRouteLoaderData, useLocation} from 'react-router';
import {Suspense, useId, useEffect} from 'react';
import type {
  CartApiQueryFragment,
  FooterQuery,
  HeaderQuery,
} from 'storefrontapi.generated';
import {Aside, useAside} from '~/components/Aside';
import {Footer} from '~/components/Footer';
import {Header, HeaderMenu} from '~/components/Header';
import {CartMain} from '~/components/CartMain';
import {
  SEARCH_ENDPOINT,
  SearchFormPredictive,
} from '~/components/SearchFormPredictive';
import {SearchResultsPredictive} from '~/components/SearchResultsPredictive';
import {MobileSearchModal} from '~/components/MobileSearchModal';
import {LocationDiscountModal} from '~/components/LocationDiscountModal';

interface PageLayoutProps {
  cart: Promise<CartApiQueryFragment | null>;
  footer: Promise<FooterQuery | null>;
  header: HeaderQuery;
  isLoggedIn: Promise<boolean>;
  publicStoreDomain: string;
  children?: React.ReactNode;
  locations?: Promise<any>;
  customer?: Promise<any>;
  megaMenuData?: any;
}

export function PageLayout({
  cart,
  children = null,
  footer,
  header,
  isLoggedIn,
  publicStoreDomain,
  locations,
  customer,
  megaMenuData,
}: PageLayoutProps) {
  const rootData = useRouteLoaderData('root') as any;
  const location = useLocation();
  const isEn = location.pathname.startsWith('/en');
  const locale = isEn ? 'en' : 'ar';

  const isCustomCakePage = location.pathname.includes('/custom-cake');

  // Purge stale cart cookie ONLY after successfully completing an order
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const search = window.location.search.toLowerCase();
    const isOrderCompleted =
      search.includes('thank_you') ||
      search.includes('thank-you') ||
      search.includes('order_id') ||
      search.includes('completed') ||
      search.includes('order_number');

    if (isOrderCompleted) {
      sessionStorage.removeItem('checkout_in_progress');
      sessionStorage.removeItem('saadeddin_checkout_initiated');
      document.cookie = 'cart=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;';
      const domainParts = window.location.hostname.split('.');
      if (domainParts.length >= 2) {
        const rootDomain = '.' + domainParts.slice(-2).join('.');
        document.cookie = `cart=; path=/; domain=${rootDomain}; expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
      }
      
      const hasReloaded = sessionStorage.getItem('post_checkout_cart_cleared');
      if (!hasReloaded) {
        sessionStorage.setItem('post_checkout_cart_cleared', 'true');
        window.location.reload();
      }
    } else {
      sessionStorage.removeItem('post_checkout_cart_cleared');
    }
  }, []);

  return (
    <Aside.Provider>
      <CartAside cart={cart} />
      <MobileSearchModal locale={locale} />
      <MobileMenuAside header={header} locale={locale} />
      {isCustomCakePage ? (
        <header className="w-full bg-white border-b border-gray-100 py-3 md:py-4 flex items-center justify-center z-30 relative shadow-sm">
          <Link to={locale === 'en' ? '/en' : '/'} aria-label="Saadeddin Home">
            <img src="/logo.svg" alt="SAADEDDIN" className="h-10 md:h-12 w-auto object-contain mx-auto" />
          </Link>
        </header>
      ) : (
        header && (
          <Header
            header={header}
            cart={cart}
            isLoggedIn={isLoggedIn}
            publicStoreDomain={publicStoreDomain}
            locale={locale}
            locations={locations}
            customer={customer}
            googleMapsKey={rootData?.env?.PUBLIC_GOOGLE_MAPS_KEY}
            selectedLocationId={rootData?.selectedLocationId}
            selectedLocationName={rootData?.selectedLocationName}
            selectedAddressName={rootData?.selectedAddressName}
            fulfillmentType={rootData?.fulfillmentType}
            megaMenuData={megaMenuData}
          />
        )
      )}
      <main className="max-w-full">{children}</main>
      {!isCustomCakePage && (
        <Footer
          footer={footer}
          header={header}
          publicStoreDomain={publicStoreDomain}
          locale={locale}
          megaMenuData={megaMenuData}
        />
      )}
      <LocationDiscountModal
        branchId={rootData?.selectedLocationId}
        branchName={rootData?.selectedLocationName}
        region={rootData?.selectedCity}
        locationDiscounts={rootData?.locationDiscounts || []}
        isEn={locale === 'en'}
      />
    </Aside.Provider>
  );
}

function CartAside({cart}: {cart: PageLayoutProps['cart']}) {
  const location = useLocation();
  const isEn = location.pathname.split('/')[1]?.toLowerCase() === 'en';
  return (
    <Aside type="cart" heading={isEn ? 'CART' : 'سلة التسوق'}>
      <Suspense fallback={<p>Loading cart ...</p>}>
        <Await resolve={cart}>
          {(cart) => {
            return <CartMain cart={cart} layout="aside" />;
          }}
        </Await>
      </Suspense>
    </Aside>
  );
}



function MobileMenuAside({
  header,
  locale,
}: {
  header: PageLayoutProps['header'];
  locale: string;
}) {
  const {close} = useAside();
  const location = useLocation();
  const isEn = String(locale).toLowerCase() === 'en' || location.pathname.startsWith('/en');

  return (
    header?.menu && (
      <Aside type="mobile" heading={isEn ? 'MENU' : 'القائمة'}>
        <HeaderMenu
          menu={header.menu}
          viewport="mobile"
          onClose={close}
          locale={isEn ? 'en' : 'ar'}
        />
      </Aside>
    )
  );
}
