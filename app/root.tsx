import { useState, useEffect } from 'react';
import {Analytics, getShopAnalytics, useNonce} from '@shopify/hydrogen';
import {
  Outlet,
  useRouteError,
  isRouteErrorResponse,
  type ShouldRevalidateFunction,
  Links,
  Meta,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
  useLocation,
} from 'react-router';
import type {Route} from './+types/root';
import favicon from '~/assets/favicon.svg';
import {FOOTER_QUERY, HEADER_QUERY} from '~/lib/fragments';
import resetStyles from '~/styles/reset.css?url';
import appStyles from '~/styles/app.css?url';
import tailwindCss from './styles/tailwind.css?url';
import {PageLayout} from './components/PageLayout';
import {GTMAnalytics} from './components/GTMAnalytics';

export type RootLoader = typeof loader;

/**
 * This is important to avoid re-fetching root queries on sub-navigations
 */
export const shouldRevalidate: ShouldRevalidateFunction = ({
  formMethod,
  currentUrl,
  nextUrl,
}) => {
  // revalidate when a mutation is performed e.g add to cart, login...
  if (formMethod && formMethod !== 'GET') return true;

  // revalidate when manually revalidating via useRevalidator
  if (currentUrl.toString() === nextUrl.toString()) return true;


  // Defaulting to no revalidation for root loader data to improve performance.
  // When using this feature, you risk your UI getting out of sync with your server.
  // Use with caution. If you are uncomfortable with this optimization, update the
  // line below to `return defaultShouldRevalidate` instead.
  // For more details see: https://remix.run/docs/en/main/route/should-revalidate
  return true; // ALWAYS REVALIDATE to ensure session changes (like location) update the UI
};

/**
 * The main and reset stylesheets are added in the Layout component
 * to prevent a bug in development HMR updates.
 *
 * This avoids the "failed to execute 'insertBefore' on 'Node'" error
 * that occurs after editing and navigating to another page.
 *
 * It's a temporary fix until the issue is resolved.
 * https://github.com/remix-run/remix/issues/9242
 */
export function links() {
  return [
    {
      rel: 'preconnect',
      href: 'https://fonts.googleapis.com',
    },
    {
      rel: 'preconnect',
      href: 'https://fonts.gstatic.com',
      crossOrigin: 'anonymous',
    },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700&display=swap',
    },
    {rel: 'stylesheet', href: tailwindCss},
    {rel: 'stylesheet', href: resetStyles},
    {rel: 'stylesheet', href: appStyles},
    {rel: 'icon', type: 'image/svg+xml', href: favicon},
  ];
}

export async function loader(args: Route.LoaderArgs) {
  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);
  const {storefront, env, session} = args.context;
  const customerAccessToken = await session.get('customerAccessToken');

  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args, customerAccessToken);

  // OPTIONAL: Ensure Cart Buyer Identity and Attributes are synced
  const selectedLocId = session.get('selectedLocationId');
  const selectedLocName = session.get('selectedLocationName');
  const fType = session.get('fulfillmentType');

  if (customerAccessToken?.accessToken || selectedLocName || fType) {
    const cartData = await args.context.cart.get();
    if (cartData) {
      const needsIdentity = customerAccessToken?.accessToken && !cartData.buyerIdentity?.customer;
      const needsAttributes = selectedLocName && !cartData.attributes.some(a => a.key === 'Branch');

      if (needsIdentity || needsAttributes) {
        args.context.waitUntil(
          (async () => {
            try {
              if (needsIdentity) {
                await args.context.cart.updateBuyerIdentity({
                  customerAccessToken: customerAccessToken.accessToken,
                });
              }
              if (needsAttributes) {
                const attributes = [
                  { key: 'Branch', value: selectedLocName },
                  { key: 'Branch ID', value: selectedLocId },
                  { key: 'Fulfillment Type', value: fType === 'delivery' ? 'Delivery' : 'Pickup' }
                ];
                
                let buyerIdentity = undefined;
                if (fType === 'pickup') {
                  // Find branch address from locations if possible
                  const locations = criticalData.locations?.locations?.nodes || [];
                  const branch = locations.find((l: any) => l.id === selectedLocId || l.name === selectedLocName);
                  if (branch) {
                    buyerIdentity = {
                      deliveryAddressPreferences: [{
                        deliveryAddress: {
                          address1: branch.address?.address1 || '',
                          city: branch.address?.city || '',
                          country: 'SA',
                          firstName: 'Pickup from',
                          lastName: selectedLocName
                        }
                      }]
                    };
                  }
                }

                await args.context.cart.updateAttributes(attributes);
                if (buyerIdentity) {
                  await args.context.cart.updateBuyerIdentity(buyerIdentity);
                }
              }
            } catch (e) {
              console.error('Failed to sync cart data in root loader:', e);
            }
          })()
        );
      }
    }
  }

    return {
      ...deferredData,
      ...criticalData,
      publicStoreDomain: env.PUBLIC_STORE_DOMAIN,
      shop: getShopAnalytics({
        storefront,
        publicStorefrontId: env.PUBLIC_STOREFRONT_ID,
      }),
      consent: {
        checkoutDomain: env.PUBLIC_CHECKOUT_DOMAIN || env.PUBLIC_STORE_DOMAIN,
        storefrontAccessToken: env.PUBLIC_STOREFRONT_API_TOKEN,
        withPrivacyBanner: false,
        // localize the privacy banner
        country: args.context.storefront.i18n.country,
        language: args.context.storefront.i18n.language,
      },
      selectedLocationId: selectedLocId,
      selectedLocationName: selectedLocName,
      fulfillmentType: fType,
    };
  }

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context}: Route.LoaderArgs) {
  const {storefront} = context;

  const [header, locations] = await Promise.all([
    storefront.query(HEADER_QUERY, {
      cache: storefront.CacheLong(),
      variables: {
        headerMenuHandle: 'main-menu', // Adjust to your header menu handle
      },
    }),
    storefront.query(LOCATIONS_QUERY, {
      cache: storefront.CacheNone(),
    }).catch(() => null),
  ]);

  return {header, locations};
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context}: Route.LoaderArgs, customerAccessToken: any) {
  const {storefront, customerAccount, cart} = context;

  // defer the footer query (below the fold)
  const footer = storefront
    .query(FOOTER_QUERY, {
      cache: storefront.CacheLong(),
      variables: {
        footerMenuHandle: 'footer', // Adjust to your footer menu handle
      },
    })
    .catch((error: Error) => {
      // Log query errors, but don't throw them so the page can still render
      console.error(error);
      return null;
    });

  // Fetch customer data (including addresses) for the delivery modal
  
  const customer = customerAccessToken?.accessToken
    ? storefront.query(CUSTOMER_ADDRESSES_QUERY, {
        variables: { customerAccessToken: customerAccessToken.accessToken },
        cache: storefront.CacheNone(),
      }).catch(err => {
        console.error('[ROOT] Customer addresses query failed:', err);
        return null;
      })
    : Promise.resolve(null);

  return {
    cart: cart.get(),
    isLoggedIn: customerAccount.isLoggedIn(),
    customer,
    footer,
    env: {
      PUBLIC_GOOGLE_MAPS_KEY: context.env.PUBLIC_GOOGLE_MAPS_KEY,
      PUBLIC_GOOGLE_PLACES_KEY: context.env.PUBLIC_GOOGLE_PLACES_KEY,
      PUBLIC_GOOGLE_GEOCODING_KEY: context.env.PUBLIC_GOOGLE_GEOCODING_KEY,
      PUBLIC_GOOGLE_DISTANCE_MATRIX_KEY: context.env.PUBLIC_GOOGLE_DISTANCE_MATRIX_KEY,
    },
  };
}

export function Layout({children}: {children?: React.ReactNode}) {
  const nonce = useNonce();
  const data = useRouteLoaderData<RootLoader>('root');
  const location = useLocation();
  const urlLocale = location.pathname.split('/')[1]?.toLowerCase();
  const locale = (urlLocale === 'en' || urlLocale === 'ar') 
    ? urlLocale 
    : (data?.consent?.language?.toLowerCase() || 'ar');
  const isEn = locale === 'en';
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Small delay to ensure CSS is applied before fading in
    const timer = setTimeout(() => setIsReady(true), 10);
    return () => clearTimeout(timer);
  }, []);

  return (
    <html lang={locale} dir={isEn ? 'ltr' : 'rtl'}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
        {/* Critical CSS to prevent FOUC */}
        <style dangerouslySetInnerHTML={{ __html: `
          body { 
            background-color: #FEF8EB; 
            opacity: 0; 
            visibility: hidden;
          }
          body.show-content { 
            opacity: 1; 
            visibility: visible; 
            transition: opacity 0.4s ease-in-out, visibility 0.4s;
          }
        `}} />
        {/* Google Tag Manager Preparation */}
        {data?.env?.PUBLIC_GTM_ID && data.env.PUBLIC_GTM_ID !== 'GTM-XXXXXXX' && (
          <script
            nonce={nonce}
            dangerouslySetInnerHTML={{
              __html: `
                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','${data.env.PUBLIC_GTM_ID}');
              `,
            }}
          />
        )}
      </head>
      <body className={`bg-[#FEF8EB] ${isEn ? 'font-en' : 'font-ar'} ${isReady ? 'show-content' : ''}`}>
        {data?.env?.PUBLIC_GTM_ID && data.env.PUBLIC_GTM_ID !== 'GTM-XXXXXXX' && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${data.env.PUBLIC_GTM_ID}`}
              height="0"
              width="0"
              style={{display: 'none', visibility: 'hidden'}}
            />
          </noscript>
        )}
        {children}
        <ScrollRestoration nonce={nonce} />
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `window.ENV = ${JSON.stringify(data?.env || {})};`,
          }}
        />
        <Scripts nonce={nonce} />
      </body>
    </html>
  );
}

export default function App() {
  const data = useRouteLoaderData<RootLoader>('root');

  return (
    <Analytics.Provider
      cart={data.cart}
      shop={data.shop}
      consent={data.consent}
    >
      <GTMAnalytics />
      <PageLayout {...data}>
        <Outlet context={{ 
          locale: data.consent.language.toLowerCase(),
          selectedLocationId: data.selectedLocationId,
          selectedLocationName: data.selectedLocationName,
          fulfillmentType: data.fulfillmentType
        }} />
      </PageLayout>
    </Analytics.Provider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  let errorMessage = 'Unknown error';
  let errorStatus = 500;

  if (isRouteErrorResponse(error)) {
    errorMessage = error?.data?.message ?? error.data;
    errorStatus = error.status;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div className="route-error">
      <h1>Oops</h1>
      <h2>{errorStatus}</h2>
      {errorMessage && (
        <fieldset>
          <pre>{errorMessage}</pre>
        </fieldset>
      )}
    </div>
  );
}

const LOCATIONS_QUERY = `#graphql
  query Locations {
    locations(first: 100) {
      nodes {
        id
        name
        address {
          address1
          address2
          city
          country
          latitude
          longitude
          phone
        }
        delivery_fee: metafield(namespace: "custom", key: "delivery_fee") {
          key
          value
        }
        free_delivery_threshold: metafield(namespace: "custom", key: "free_delivery_threshold") {
          key
          value
        }
      }
    }
  }
`;

const CUSTOMER_ADDRESSES_QUERY = `#graphql
  query CustomerAddresses($customerAccessToken: String!) {
    customer(customerAccessToken: $customerAccessToken) {
      id
      firstName
      lastName
      addresses(first: 20) {
        nodes {
          id
          address1
          address2
          city
          country
          firstName
          lastName
          phone
        }
      }
    }
  }
`;
