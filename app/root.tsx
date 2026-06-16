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
  useNavigation,
} from 'react-router';
import type {Route} from './+types/root';
import {FOOTER_QUERY, HEADER_QUERY} from '~/lib/fragments';
import resetStyles from '~/styles/reset.css?url';
import appStyles from '~/styles/app.css?url';
import tailwindCss from './styles/tailwind.css?url';
import {PageLayout} from './components/PageLayout';
import {GTMAnalytics} from './components/GTMAnalytics';
import {WishlistProvider} from './context/WishlistContext';
import {NotFound} from './components/NotFound';
import {ProductSkeleton} from './components/ProductSkeleton';


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
    {rel: 'icon', type: 'image/svg+xml', href: '/logo.svg'},
  ];
}

export async function loader(args: Route.LoaderArgs) {
  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);
  const {storefront, env, session} = args.context;
  const customerAccessToken = await session.get('customerAccessToken');
  const loginOtpPhone = await session.get('loginOtpPhone');

  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args, customerAccessToken, loginOtpPhone);

  // OPTIONAL: Ensure Cart Buyer Identity and Attributes are synced
  let selectedLocId = session.get('selectedLocationId');
  let selectedLocName = session.get('selectedLocationName');
  let fType = session.get('fulfillmentType');
  const selectedAddrName = session.get('selectedAddressName');

  if (!selectedLocId) {
    const isTesting = env.PUBLIC_STORE_DOMAIN?.includes('belivagloire');
    selectedLocId = isTesting ? 'gid://shopify/Location/114186715445' : 'gid://shopify/Location/80198500503';
    const urlLocale = new URL(args.request.url).pathname.split('/')[1]?.toLowerCase();
    selectedLocName = urlLocale === 'en' ? 'Olaya Branch' : 'فرع العليا';
    fType = 'pickup';
    
    session.set('selectedLocationId', selectedLocId);
    session.set('selectedLocationName', selectedLocName);
    session.set('fulfillmentType', fType);
  }

  if (customerAccessToken?.accessToken || selectedLocName || fType) {
    const cartData = await args.context.cart.get();
    if (cartData) {
      const needsIdentity = customerAccessToken?.accessToken && !cartData.buyerIdentity?.customer;
      const cartBranch = cartData.attributes?.find(a => a.key === 'Branch')?.value;
      const cartFType = cartData.attributes?.find(a => a.key === 'Fulfillment Type')?.value;
      const sessionFType = fType === 'pickup' ? 'Pickup' : 'Delivery';
      
      const needsFulfillmentSync = (selectedLocName && cartBranch !== selectedLocName) || (cartFType !== sessionFType);
      
      if (needsIdentity || needsFulfillmentSync) {
        args.context.waitUntil(
          (async () => {
            try {
              if (needsIdentity) {
                await args.context.cart.updateBuyerIdentity({
                  customerAccessToken: customerAccessToken.accessToken,
                });
              }
              
              if (needsFulfillmentSync) {
                const attributes = [
                  { key: 'Branch', value: selectedLocName || '' },
                  { key: 'Branch ID', value: selectedLocId || '' },
                  { key: 'Fulfillment Type', value: sessionFType }
                ];
                
                let buyerIdentity: any = undefined;
                
                // Fetch customer data if we need it for address sync
                let customer: any = null;
                if (customerAccessToken?.accessToken) {
                  const res = await storefront.query(CUSTOMER_ADDRESSES_QUERY, {
                    variables: { customerAccessToken: customerAccessToken.accessToken },
                    cache: storefront.CacheNone(),
                  });
                  customer = res.customer;
                }

                if (fType === 'pickup') {
                  const locations = criticalData.locations?.locations?.nodes || [];
                  const branch = locations.find((l: any) => l.id === selectedLocId || l.name === selectedLocName);
                  if (branch) {
                    buyerIdentity = {
                      deliveryAddressPreferences: [{
                        deliveryAddress: {
                          address1: branch.address?.address1 || '',
                          city: branch.address?.city || '',
                          country: 'SA',
                          firstName: customer?.firstName || '',
                          lastName: customer?.lastName || ''
                        }
                      }]
                    };
                  }
                } else if (fType === 'delivery' && customer) {
                  // Find the selected address from the customer's addresses
                  const selectedAddr = customer.addresses?.nodes?.find((a: any) => 
                    `${a.firstName} ${a.lastName}` === selectedAddrName || 
                    a.address1 === selectedAddrName
                  );
                  
                  if (selectedAddr) {
                    buyerIdentity = {
                      deliveryAddressPreferences: [{
                        deliveryAddress: {
                          address1: selectedAddr.address1,
                          address2: selectedAddr.address2,
                          city: selectedAddr.city,
                          country: selectedAddr.country || 'SA',
                          firstName: selectedAddr.firstName,
                          lastName: selectedAddr.lastName,
                          phone: selectedAddr.phone
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
            } catch (error) {
              console.error('[ROOT] Cart sync failed:', error);
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
      selectedAddressName: selectedAddrName,
      fulfillmentType: fType,
      locale: new URL(args.request.url).pathname.split('/')[1]?.toLowerCase() === 'en' ? 'en' : 'ar',
    };
  }

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context}: Route.LoaderArgs) {
  const {storefront} = context;

  const [header, locations, reviews] = await Promise.all([
    storefront.query(HEADER_QUERY, {
      cache: storefront.CacheLong(),
      variables: {
        headerMenuHandle: 'main-menu',
      },
    }),
    storefront.query(LOCATIONS_QUERY, {
      cache: storefront.CacheNone(),
    }).catch(() => null),
    storefront.query(`#graphql
      query GetReviews {
        metaobjects(type: "storefront_review", first: 250) {
          nodes {
            id
            fields {
              key
              value
            }
          }
        }
      }
    `, {
      cache: storefront.CacheNone(),
    }).then(res => ({ nodes: res.metaobjects?.nodes || [] }))
      .catch((e: Error) => {
        console.error('[ROOT] Storefront Review Fetch Failed:', e.message);
        return { nodes: [] };
      })
  ]);

  return {header, locations, reviews};
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData({context}: Route.LoaderArgs, customerAccessToken: any, loginOtpPhone: string | undefined | null) {
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

  const customer = (process.env.NODE_ENV === 'development' && customerAccessToken?.accessToken === 'dev-bypass-token')
    ? (async () => {
        try {
          const phone = loginOtpPhone;
          if (!phone) return null;
          const env = context.env as any;
          const rawShop = env.SHOPIFY_SHOP || env.PUBLIC_STORE_DOMAIN || 'the-beauty-secrets-ksa';
          let shopDomain = rawShop.includes('myshopify.com') ? rawShop : `${rawShop.split('.')[0]}.myshopify.com`;
          const token = env.SHOPIFY_ADMIN_API_ACCESS_TOKENS;
          const cleanPhoneForSearch = phone.replace('+966', '').replace(/\D/g, '');
          const queryStr = encodeURIComponent(`*${cleanPhoneForSearch}*`);
          const res = await fetch(`https://${shopDomain}/admin/api/2023-04/customers/search.json?query=${queryStr}`, {
             headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' },
          });
          const d = await res.json();
          if (d?.customers && d.customers.length > 0) {
             const adminCust = d.customers[0];
             return { 
                customer: { 
                   id: `gid://shopify/Customer/${adminCust.id}`, 
                   firstName: adminCust.first_name,
                   lastName: adminCust.last_name,
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
                   } 
                } 
             };
          }
        } catch(e) {
          console.error('[ROOT] Dev bypass customer fetch failed:', e);
        }
        return null;
      })()
    : (customerAccessToken?.accessToken
      ? storefront.query(CUSTOMER_ADDRESSES_QUERY, {
          variables: { customerAccessToken: customerAccessToken.accessToken },
          cache: storefront.CacheNone(),
        }).catch(err => {
          console.error('[ROOT] Customer addresses query failed:', err);
          return null;
        })
      : Promise.resolve(null));



  return {
    cart: cart.get(),
    isLoggedIn: customerAccount.isLoggedIn(),
    loginOtpPhone,
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
  const locale = urlLocale === 'en' ? 'en' : 'ar';
  const isEn = locale === 'en';
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;
    const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];
    
    if (links.length === 0) {
      setIsReady(true);
      return;
    }

    let loadedCount = 0;
    const totalLinks = links.length;

    const handleLoad = () => {
      loadedCount++;
      if (loadedCount >= totalLinks && active) {
        setIsReady(true);
      }
    };

    // Fallback timer to ensure page is shown even if a stylesheet fails to load
    const fallbackTimer = setTimeout(() => {
      if (active) {
        setIsReady(true);
      }
    }, 500); // 500ms fallback

    links.forEach((link) => {
      let isLoaded = false;
      try {
        if (link.sheet && link.sheet.cssRules && link.sheet.cssRules.length > 0) {
          isLoaded = true;
        }
      } catch (e) {
        if (link.sheet) {
          isLoaded = true;
        }
      }

      if (isLoaded) {
        handleLoad();
      } else {
        link.addEventListener('load', handleLoad);
        link.addEventListener('error', handleLoad);
      }
    });

    return () => {
      active = false;
      clearTimeout(fallbackTimer);
      links.forEach((link) => {
        link.removeEventListener('load', handleLoad);
        link.removeEventListener('error', handleLoad);
      });
    };
  }, []);

  return (
    <html lang={locale} dir={isEn ? 'ltr' : 'rtl'} className="overflow-x-hidden" suppressHydrationWarning>
      <head suppressHydrationWarning>
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
            suppressHydrationWarning
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
      <body
        className={`bg-[#FEF8EB] overflow-x-hidden w-full ${isEn ? 'font-en' : 'font-ar'} ${isReady ? 'show-content' : ''}`}
        style={!isReady ? { opacity: 0, visibility: 'hidden', backgroundColor: '#FEF8EB' } : undefined}
        suppressHydrationWarning
      >
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
          suppressHydrationWarning
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
  const [customerId, setCustomerId] = useState<string | undefined>(undefined);
  const navigation = useNavigation();

  useEffect(() => {
    if (data?.customer && typeof data.customer.then === 'function') {
      data.customer.then((res: any) => {
        if (res?.customer?.id) setCustomerId(res.customer.id);
      }).catch(() => {});
    }
  }, [data?.customer]);

  const isNavigatingToProduct = navigation.state === 'loading' && navigation.location.pathname.includes('/products/');

  return (
    <Analytics.Provider
      cart={data.cart}
      shop={data.shop}
      consent={data.consent}
    >
      <WishlistProvider customerId={customerId}>
        <GTMAnalytics />
        <PageLayout {...data}>
          {isNavigatingToProduct ? (
            <ProductSkeleton isEn={data.consent.language.toLowerCase() === 'en'} />
          ) : (
            <Outlet context={{ 
              locale: data.consent.language.toLowerCase(),
              selectedLocationId: data.selectedLocationId,
              selectedLocationName: data.selectedLocationName,
              fulfillmentType: data.fulfillmentType
            }} />
          )}
        </PageLayout>
      </WishlistProvider>
    </Analytics.Provider>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const rootData = useRouteLoaderData<RootLoader>('root');
  let errorMessage = 'Unknown error';
  let errorStatus = 500;

  if (isRouteErrorResponse(error)) {
    errorMessage = error?.data?.message ?? error.data;
    errorStatus = error.status;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  // Use the NotFound component for 404 errors
  if (errorStatus === 404) {
    return (
      <WishlistProvider customerId={undefined}>
        <PageLayout {...rootData}>
          <NotFound />
        </PageLayout>
      </WishlistProvider>
    );
  }

  return (
    <WishlistProvider customerId={undefined}>
      <PageLayout {...rootData}>
        <div className="route-error p-8 flex flex-col items-center justify-center min-h-[50vh]">
          <h1 className="text-4xl font-bold mb-4">Oops</h1>
          <h2 className="text-2xl mb-4 text-red-500">{errorStatus}</h2>
          {errorMessage && (
            <fieldset className="bg-red-50 p-4 border border-red-200 rounded text-red-800">
              <pre>{errorMessage}</pre>
            </fieldset>
          )}
        </div>
      </PageLayout>
    </WishlistProvider>
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
        working_hours_from: metafield(namespace: "custom", key: "working_hours_from") {
          key
          value
        }
        working_hours_to: metafield(namespace: "custom", key: "working_hours_to") {
          key
          value
        }
        rating: metafield(namespace: "custom", key: "rating") {
          key
          value
        }
        rating_count: metafield(namespace: "custom", key: "rating_count") {
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
      email
      tags
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
