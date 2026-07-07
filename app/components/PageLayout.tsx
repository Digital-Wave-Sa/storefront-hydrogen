import {Await, Link, useRouteLoaderData, useLocation} from 'react-router';
import {Suspense, useId} from 'react';
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
  const urlLocale = location.pathname.split('/')[1]?.toLowerCase();
  const locale = (urlLocale === 'en' || urlLocale === 'ar') 
    ? urlLocale 
    : (rootData?.consent?.language?.toLowerCase() || 'ar');

  return (
    <Aside.Provider>
      <CartAside cart={cart} />
      <MobileSearchModal locale={locale} />
      <MobileMenuAside header={header} locale={locale} />
      {header && (
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
      )}
      <main>{children}</main>
      <Footer
        footer={footer}
        header={header}
        publicStoreDomain={publicStoreDomain}
        locale={locale}
      />
    </Aside.Provider>
  );
}

function CartAside({cart}: {cart: PageLayoutProps['cart']}) {
  return (
    <Aside type="cart" heading="CART">
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
  return (
    header?.menu && (
      <Aside type="mobile" heading="MENU">
        <HeaderMenu
          menu={header.menu}
          viewport="mobile"
          onClose={close}
          locale={locale}
        />
      </Aside>
    )
  );
}
