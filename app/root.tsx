import { useState, useEffect } from 'react';
import {Analytics, getShopAnalytics, useNonce} from '@shopify/hydrogen';
import {
  Outlet,
  useRouteError,
  isRouteErrorResponse,
  type MetaFunction,
  type ShouldRevalidateFunction,
  Links,
  Meta,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
  useLocation,
  useNavigation,
  useFetcher,
  data,
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
import {ServerError} from './components/ServerError';
import {CookieConsentBanner} from './components/CookieConsentBanner';
import {ProductSkeleton} from './components/ProductSkeleton';

export const meta: MetaFunction = () => {
  return [
    {title: 'حلويات سعد الدين | Saadeddin Pastry'},
    {name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=5.0'},
  ];
};

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

  // revalidate when the locale changes (e.g. / → /en or /en → /)
  // so the cart and other root data are re-fetched in the correct language
  const currentLocale = currentUrl.pathname.replace(/\.data$/i, '').split('/')[1]?.toLowerCase() === 'en' ? 'en' : 'ar';
  const nextLocale = nextUrl.pathname.replace(/\.data$/i, '').split('/')[1]?.toLowerCase() === 'en' ? 'en' : 'ar';
  if (currentLocale !== nextLocale) return true;

  // Defaulting to no revalidation for root loader data to improve performance.
  // When using this feature, you risk your UI getting out of sync with your server.
  // Use with caution. If you are uncomfortable with this optimization, update the
  // line below to `return defaultShouldRevalidate` instead.
  // For more details see: https://remix.run/docs/en/main/route/should-revalidate
  return false;
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
    {rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg'},
    {rel: 'alternate icon', type: 'image/x-icon', href: '/favicon.ico'},
    {rel: 'apple-touch-icon', href: '/favicon.svg'},
  ];
}

export async function loader(args: Route.LoaderArgs) {
  // Await the critical data required to render initial state of the page
  const criticalData = await loadCriticalData(args);
  const {storefront, env, session} = args.context;
  const customerAccessToken = await session.get('customerAccessToken');
  const loginOtpPhone = await session.get('loginOtpPhone');
  const loginCustomerId = await session.get('loginCustomerId');
  const loginCustomerEmail = await session.get('loginCustomerEmail');

  // Start fetching non-critical data without blocking time to first byte
  const deferredData = loadDeferredData(args, customerAccessToken, loginOtpPhone, loginCustomerId, loginCustomerEmail);

  // OPTIONAL: Ensure Cart Buyer Identity and Attributes are synced
  let selectedLocId = session.get('selectedLocationId');
  let selectedLocName = session.get('selectedLocationName');
  let fType = session.get('fulfillmentType');
  const selectedAddrName = session.get('selectedAddressName');
  const manualLocationSelection = session.get('manualLocationSelection');

  const clientCountry = args.request.headers.get('cf-ipcountry') || 
                       args.request.headers.get('x-buyer-country') || 
                       args.request.headers.get('x-oxygen-buyer-country') || 
                       'SA';
  const isInternationalUserSession = session.get('isInternationalUser') === 'true';
  const isSA = !isInternationalUserSession && (clientCountry.toUpperCase() === 'SA');
  const isDefaultLoc = selectedLocId === 'gid://shopify/Location/80198500503' || 
                       selectedLocId === 'gid://shopify/Location/114186715445';
  const hasManualSelection = manualLocationSelection === 'true';

  const urlLocale = args.context.storefront.i18n.language.toLowerCase();

  if (!hasManualSelection && (isDefaultLoc || !selectedLocId || selectedLocId === undefined || selectedLocId === null)) {
    selectedLocId = '';
    selectedLocName = urlLocale === 'en' ? 'Select Your Branch' : 'اختر الفرع';
    fType = 'delivery';
    
    session.set('selectedLocationId', selectedLocId);
    session.set('selectedLocationName', selectedLocName);
    session.set('fulfillmentType', fType);
  }

  // Validate if the stored branch is hidden
  const locNodes = criticalData?.locations?.locations?.nodes || [];
  if (selectedLocId && locNodes.length > 0) {
    const selectedNode = locNodes.find((n: any) => n.id === selectedLocId);
    if (selectedNode) {
      const isHidden = selectedNode.hide_from_storefront?.value === 'true' || 
                       selectedNode.hide_from_storefront === true || 
                       selectedNode.hide_from_storefront === 'true';
      if (isHidden) {
        console.log(`[ROOT LOADER] Resetting hidden location: id=${selectedLocId}, name=${selectedLocName}`);
        if (!isSA) {
          selectedLocId = '';
          selectedLocName = urlLocale === 'en' ? 'Select Your Branch' : 'اختر الفرع';
          fType = 'delivery';
        } else {
          const isTesting = env.PUBLIC_STORE_DOMAIN?.includes('belivagloire');
          selectedLocId = isTesting ? 'gid://shopify/Location/114186715445' : 'gid://shopify/Location/80198500503';
          selectedLocName = urlLocale === 'en' ? 'Olaya Branch' : 'فرع العليا';
          fType = 'delivery';
        }
        session.set('selectedLocationId', selectedLocId);
        session.set('selectedLocationName', selectedLocName);
        session.set('fulfillmentType', fType);
      }
    }
  }

  if (customerAccessToken?.accessToken || selectedLocName || fType) {
    let cartData = null;
    try {
      cartData = await args.context.cart.get();
    } catch (error) {
      console.error('[ROOT] Cart retrieval failed:', error);
    }
  }

    const headers = new Headers();
    if (session.isPending) {
      headers.append('Set-Cookie', await session.commit());
    }

    return data({
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
      deliveryDate: await session.get('delivery_date'),
      timeSlot: await session.get('Time Slot'),
      manualLocationSelection: manualLocationSelection,
      locale: urlLocale,
    }, {
      headers
    });
  }

/**
 * Load data necessary for rendering content above the fold. This is the critical data
 * needed to render the page. If it's unavailable, the whole page should 400 or 500 error.
 */
async function loadCriticalData({context}: Route.LoaderArgs) {
  const {storefront} = context;

  const [header, locations, reviews, megaMenuData, locationDiscountsRaw] = await Promise.all([
    storefront.query(HEADER_QUERY, {
      cache: storefront.CacheLong(),
      variables: {
        headerMenuHandle: 'main-menu',
        country: storefront.i18n.country,
        language: storefront.i18n.language,
      },
    }),
    storefront.query(LOCATIONS_QUERY, {
      cache: storefront.CacheNone(),
    }).catch(() => null),
    storefront.query(`#graphql
      query GetReviews {
        sfReviews: metaobjects(type: "storefront_review", first: 250) {
          nodes {
            id
            fields { key value }
          }
        }
        ordReviews: metaobjects(type: "order_review", first: 250) {
          nodes {
            id
            fields { key value }
          }
        }
      }
    `, {
      cache: storefront.CacheNone(),
    }).then(res => {
      const sf = res.sfReviews?.nodes || [];
      const ord = res.ordReviews?.nodes || [];
      return { nodes: [...sf, ...ord] };
    })
      .catch((e: Error) => {
        console.error('[ROOT] Storefront Review Fetch Failed:', e.message);
        return { nodes: [] };
      }),
    storefront.query(MEGAMENU_QUERY, {
      cache: storefront.CacheLong(),
      variables: {
        handle: 'mega-menu',
        country: storefront.i18n.country,
        language: storefront.i18n.language,
      },
    }).catch((error) => {
      console.error('Failed to fetch megamenu data:', error);
      return null;
    }),
    storefront.query(`#graphql
      query GetShopLocationDiscounts {
        shop {
          locationDiscounts: metafield(namespace: "custom", key: "location_discounts") { value }
          locationDiscountsAlt: metafield(namespace: "location", key: "discounts") { value }
        }
      }
    `, {
      cache: storefront.CacheLong(),
    }).then(res => res.shop?.locationDiscounts?.value || res.shop?.locationDiscountsAlt?.value || null)
      .catch(() => null),
  ]);

  return {header, locations, reviews, megaMenuData, locationDiscounts: locationDiscountsRaw};
}

/**
 * Load data for rendering content below the fold. This data is deferred and will be
 * fetched after the initial page load. If it's unavailable, the page should still 200.
 * Make sure to not throw any errors here, as it will cause the page to 500.
 */
function loadDeferredData(
  {context}: Route.LoaderArgs,
  customerAccessToken: any,
  loginOtpPhone: string | undefined | null,
  loginCustomerId?: string | undefined | null,
  loginCustomerEmail?: string | undefined | null
) {
  const {storefront, customerAccount, cart} = context;

  // defer the footer query (below the fold)
  const footer = storefront
    .query(FOOTER_QUERY, {
      cache: storefront.CacheLong(),
      variables: {
        footerMenuHandle: 'footer', // Adjust to your footer menu handle
        country: storefront.i18n.country,
        language: storefront.i18n.language,
      },
    })
    .catch((error: Error) => {
      // Log query errors, but don't throw them so the page can still render
      console.error(error);
      return null;
    });

  const customer = (async () => {
    if (!customerAccessToken) return null;

    const token = typeof customerAccessToken === 'string' ? customerAccessToken : customerAccessToken?.accessToken;

    // 1. Try Storefront API query first if token is a standard Storefront access token
    if (token && !token.startsWith('session-')) {
      try {
        const res = await storefront.query(CUSTOMER_ADDRESSES_QUERY, {
          variables: { customerAccessToken: token },
          cache: storefront.CacheNone(),
        });
        if (res?.customer) return res;
      } catch (err) {
        console.warn('[ROOT] Storefront customer addresses query failed, attempting Admin API fallback:', err);
      }
    }

    // 2. Admin API fallback if Storefront query returned null or threw, or if session token is active
    try {
      const { getAdminToken, getAdminDomain } = await import('~/lib/shopify-admin.server');
      const adminToken = await getAdminToken(context.env);
      const adminDomain = getAdminDomain(context.env);

      if (!adminToken || !adminDomain) return null;

      let adminCust: any = null;

      if (loginCustomerId) {
        const numericId = String(loginCustomerId).split('/').pop();
        const res = await fetch(`https://${adminDomain}/admin/api/2024-01/customers/${numericId}.json`, {
          headers: { 'X-Shopify-Access-Token': adminToken }
        });
        if (res.ok) {
          const d = await res.json() as any;
          adminCust = d.customer;
        }
      }

      if (!adminCust && (loginOtpPhone || loginCustomerEmail)) {
        let queryStr = '';
        if (loginOtpPhone) {
          queryStr = `phone:"${encodeURIComponent(loginOtpPhone)}"`;
        } else if (loginCustomerEmail) {
          queryStr = `email:"${encodeURIComponent(loginCustomerEmail)}"`;
        }
        const res = await fetch(`https://${adminDomain}/admin/api/2024-01/customers/search.json?query=${queryStr}`, {
          headers: { 'X-Shopify-Access-Token': adminToken }
        });
        if (res.ok) {
          const d = await res.json() as any;
          adminCust = (d.customers || []).find((c: any) => {
            if (loginOtpPhone) {
              const cp = (c.phone || '').replace(/\D/g, '');
              const sp = loginOtpPhone.replace(/\D/g, '');
              if (!cp || !sp) return false;
              return cp === sp || cp.endsWith(sp.slice(-9));
            } else if (loginCustomerEmail) {
              return c.email && c.email.toLowerCase() === loginCustomerEmail.toLowerCase();
            }
            return false;
          });
        }
      }

      if (adminCust) {
        return {
          customer: {
            id: `gid://shopify/Customer/${adminCust.id}`,
            firstName: adminCust.first_name,
            lastName: adminCust.last_name,
            email: adminCust.email,
            phone: adminCust.phone,
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
            } : null,
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
    } catch (e) {
      console.error('[ROOT] Admin API customer addresses fallback failed:', e);
    }

    return null;
  })();



  return {
    cart: cart.get().catch((err) => {
      console.error('[ROOT] Deferred cart fetch failed:', err);
      return null;
    }),
    isLoggedIn: customerAccount.isLoggedIn(),
    loginOtpPhone,
    customer,
    footer,
    env: {
      PUBLIC_GOOGLE_MAPS_KEY: context.env.PUBLIC_GOOGLE_MAPS_KEY,
      PUBLIC_GOOGLE_PLACES_KEY: context.env.PUBLIC_GOOGLE_PLACES_KEY,
      PUBLIC_GOOGLE_GEOCODING_KEY: context.env.PUBLIC_GOOGLE_GEOCODING_KEY,
      PUBLIC_GOOGLE_DISTANCE_MATRIX_KEY: context.env.PUBLIC_GOOGLE_DISTANCE_MATRIX_KEY,
      PUBLIC_GTM_ID: context.env.PUBLIC_GTM_ID,
      PUBLIC_GA4_MEASUREMENT_ID: context.env.PUBLIC_GA4_MEASUREMENT_ID,
      PUBLIC_SMILE_CHANNEL_KEY: context.env.PUBLIC_SMILE_CHANNEL_KEY,
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

  useEffect(() => {
    if (typeof window === 'undefined' || !data?.env?.PUBLIC_GTM_ID || data.env.PUBLIC_GTM_ID === 'GTM-XXXXXXX') return;

    (window as any).dataLayer = (window as any).dataLayer || [];
    (window as any).dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    
    let script = document.getElementById('gtm-loader') as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = 'gtm-loader';
      script.src = `https://www.googletagmanager.com/gtm.js?id=${data.env.PUBLIC_GTM_ID}`;
      script.async = true;
      document.head.appendChild(script);
    }
  }, [data?.env?.PUBLIC_GTM_ID]);

  const canonicalUrl = `https://saadeddin.com${location.pathname === '/' ? '' : location.pathname}`;
  const isEnPath = location.pathname.startsWith('/en');
  const arPath = isEnPath ? location.pathname.replace(/^\/en/, '') || '/' : location.pathname;
  const enPath = isEnPath ? location.pathname : `/en${location.pathname === '/' ? '' : location.pathname}`;
  const arUrl = `https://saadeddin.com${arPath}`;
  const enUrl = `https://saadeddin.com${enPath}`;

  return (
    <html lang={locale} dir={isEn ? 'ltr' : 'rtl'} suppressHydrationWarning>
      <head suppressHydrationWarning>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
        <Meta />
        <link rel="canonical" href={canonicalUrl} />
        <link rel="alternate" hrefLang="ar" href={arUrl} />
        <link rel="alternate" hrefLang="en" href={enUrl} />
        <link rel="alternate" hrefLang="x-default" href={arUrl} />
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
        {/* GA4 Consent Mode v2 — deny all by default until user consents */}
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){window.dataLayer.push(arguments);}
              gtag('consent', 'default', {
                ad_storage: 'denied',
                analytics_storage: 'denied',
                ad_user_data: 'denied',
                ad_personalization: 'denied',
                functionality_storage: 'granted',
                security_storage: 'granted',
                wait_for_update: 500
              });
            `,
          }}
        />
      </head>
      <body
        className={`bg-[#FEF8EB] w-full ${isEn ? 'font-en' : 'font-ar'} ${isReady ? 'show-content' : ''}`}
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
  const locationFetcher = useFetcher();

  useEffect(() => {
    if (data?.customer) {
      if (typeof (data.customer as any).then === 'function') {
        (data.customer as any).then((res: any) => {
          if (res?.customer?.id) setCustomerId(res.customer.id);
          else if (res?.id) setCustomerId(res.id);
          else setCustomerId(undefined);
        }).catch(() => {
          setCustomerId(undefined);
        });
      } else {
        const custObj = data.customer as any;
        if (custObj?.customer?.id) setCustomerId(custObj.customer.id);
        else if (custObj?.id) setCustomerId(custObj.id);
        else setCustomerId(undefined);
      }
    } else {
      setCustomerId(undefined);
    }
  }, [data?.customer]);
  
  // Dynamically load Smile.io widget script on the client side
  useEffect(() => {
    if (typeof window === 'undefined' || !data?.env?.PUBLIC_SMILE_CHANNEL_KEY) return;

    // Check if script already exists to avoid duplicate tags
    let script = document.getElementById('smile-loader') as HTMLScriptElement | null;
    
    if (script) {
      if (customerId) {
        script.setAttribute('data-customer-id', customerId);
      }
      return;
    }

    script = document.createElement('script');
    script.id = 'smile-loader';
    script.src = 'https://js.smile.io/v1/smile-loader.js';
    script.async = true;
    script.setAttribute('data-channel-key', data.env.PUBLIC_SMILE_CHANNEL_KEY);
    if (customerId) {
      script.setAttribute('data-customer-id', customerId);
    }
    
    document.head.appendChild(script);
  }, [data?.env?.PUBLIC_SMILE_CHANNEL_KEY, customerId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const isSaTz = tz === 'Asia/Riyadh' || tz === 'Asia/Jeddah' || tz === 'Asia/Kuwait' || tz === 'Asia/Aden';
      const isDefaultLoc = data?.selectedLocationId === 'gid://shopify/Location/80198500503' || 
                           data?.selectedLocationId === 'gid://shopify/Location/114186715445';
      const hasManualSelection = data?.manualLocationSelection === 'true';
      
      if (!isSaTz && isDefaultLoc && !hasManualSelection && locationFetcher.state === 'idle') {
        const locale = data?.consent?.language?.toLowerCase() || 'ar';
        const formData = new FormData();
        formData.append('locationId', '');
        formData.append('branchName', locale === 'en' ? 'Select Your Branch' : 'اختر الفرع');
        formData.append('fulfillmentType', 'delivery');
        formData.append('isInternational', 'true');
        
        locationFetcher.submit(formData, {
          method: 'POST',
          action: '/api/location-id',
        });
      }
    } catch (e) {
      console.warn('Timezone detection failed:', e);
    }
  }, [data?.selectedLocationId, data?.consent?.language, data?.manualLocationSelection, locationFetcher]);

  const isNavigatingToProduct = navigation.state === 'loading' && navigation.location.pathname.includes('/products/');

  return (
    <Analytics.Provider
      cart={data!.cart as any}
      shop={data!.shop}
      consent={data!.consent}
    >
      <WishlistProvider customerId={customerId}>
        <GTMAnalytics />
        <CookieConsentBanner locale={data?.consent?.language?.toLowerCase() === 'en' ? 'en' : 'ar'} />
        <PageLayout {...(data as any)}>
          {isNavigatingToProduct ? (
            <ProductSkeleton isEn={data!.consent.language.toLowerCase() === 'en'} />
          ) : (
            <Outlet context={{ 
              locale: data!.consent.language.toLowerCase(),
              selectedLocationId: data!.selectedLocationId,
              selectedLocationName: data!.selectedLocationName,
              fulfillmentType: data!.fulfillmentType
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
        <PageLayout {...(rootData as any)}>
          <NotFound />
        </PageLayout>
      </WishlistProvider>
    );
  }

  return (
    <WishlistProvider customerId={undefined}>
      <PageLayout {...(rootData as any)}>
        <ServerError error={error} status={errorStatus} />
      </PageLayout>
    </WishlistProvider>
  );
}

const LOCATIONS_QUERY = `#graphql
  query Locations {
    locations(first: 250) {
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
        city: metafield(namespace: "custom", key: "city") {
          key
          value
        }
        delivery_fee: metafield(namespace: "custom", key: "delivery_fee") {
          key
          value
        }
        free_delivery_threshold: metafield(namespace: "custom", key: "free_delivery_threshold") {
          key
          value
        }
        promo_free_delivery_from: metafield(namespace: "custom", key: "promo_free_delivery_from") {
          key
          value
        }
        promo_free_delivery_to: metafield(namespace: "custom", key: "promo_free_delivery_to") {
          key
          value
        }
        delivery_hours_from: metafield(namespace: "custom", key: "delivery_hours_from") {
          key
          value
        }
        delivery_hours_to: metafield(namespace: "custom", key: "delivery_hours_to") {
          key
          value
        }
        delivery_hours_from_shift2: metafield(namespace: "custom", key: "delivery_hours_from_shift2") {
          key
          value
        }
        delivery_hours_to_shift2: metafield(namespace: "custom", key: "delivery_hours_to_shift2") {
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
        working_hours_from_shift2: metafield(namespace: "custom", key: "working_hours_from_shift2") {
          key
          value
        }
        working_hours_to_shift2: metafield(namespace: "custom", key: "working_hours_to_shift2") {
          key
          value
        }
        sunday_working_hours_from: metafield(namespace: "custom", key: "sunday_working_hours_from") {
          key
          value
        }
        sunday_working_hours_to: metafield(namespace: "custom", key: "sunday_working_hours_to") {
          key
          value
        }
        monday_working_hours_from: metafield(namespace: "custom", key: "monday_working_hours_from") {
          key
          value
        }
        monday_working_hours_to: metafield(namespace: "custom", key: "monday_working_hours_to") {
          key
          value
        }
        tuesday_working_hours_from: metafield(namespace: "custom", key: "tuesday_working_hours_from") {
          key
          value
        }
        tuesday_working_hours_to: metafield(namespace: "custom", key: "tuesday_working_hours_to") {
          key
          value
        }
        wednesday_working_hours_from: metafield(namespace: "custom", key: "wednesday_working_hours_from") {
          key
          value
        }
        wednesday_working_hours_to: metafield(namespace: "custom", key: "wednesday_working_hours_to") {
          key
          value
        }
        thursday_working_hours_from: metafield(namespace: "custom", key: "thursday_working_hours_from") {
          key
          value
        }
        thursday_working_hours_to: metafield(namespace: "custom", key: "thursday_working_hours_to") {
          key
          value
        }
        friday_working_hours_from: metafield(namespace: "custom", key: "friday_working_hours_from") {
          key
          value
        }
        friday_working_hours_to: metafield(namespace: "custom", key: "friday_working_hours_to") {
          key
          value
        }
        saturday_working_hours_from: metafield(namespace: "custom", key: "saturday_working_hours_from") {
          key
          value
        }
        saturday_working_hours_to: metafield(namespace: "custom", key: "saturday_working_hours_to") {
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
        hide_from_storefront: metafield(namespace: "custom", key: "hide_from_storefront") {
          key
          value
        }
        branch_id: metafield(namespace: "custom", key: "branch_id") {
          key
          value
        }
        ax_store_id: metafield(namespace: "custom", key: "ax_store_id") {
          key
          value
        }
        name_in_arabic: metafield(namespace: "custom", key: "name_in_arabic") {
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
      phone
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

const MEGAMENU_QUERY = `#graphql
  query MegaMenu($handle: String!, $country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    menu(handle: $handle) {
      id
      title
      handle
      items {
        id
        title
        url
        type
        resourceId
        resource {
          ... on Collection {
            id
            title
            handle
            image {
              url
              altText
            }
            products(first: 6) {
              nodes {
                id
                title
                handle
                featuredImage {
                  url
                  altText
                }
              }
            }
          }
        }
        items {
          id
          title
          url
          type
          resourceId
          resource {
            ... on Product {
              id
              title
              handle
              featuredImage {
                url
                altText
              }
            }
            ... on Collection {
              id
              title
              handle
            }
          }
        }
      }
    }
  }
` as const;
