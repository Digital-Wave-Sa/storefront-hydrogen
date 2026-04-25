import type {LoaderFunctionArgs} from 'react-router';

export async function loader({params, context}: LoaderFunctionArgs) {
  const {language, country} = context.storefront.i18n;

  const isSingleLang = params.locale && params.locale.length === 2;
  const expectedLocale = isSingleLang ? language : `${language}-${country}`;

  // Check if the locale parameter looks like a locale (2 or 5 characters)
  const isPotentialLocale = params.locale && (params.locale.length === 2 || params.locale.length === 5);

  if (
    params.locale &&
    isPotentialLocale &&
    params.locale.toLowerCase() !== expectedLocale.toLowerCase()
  ) {
    throw new Response(null, {status: 404});
  }

  // If it's not a potential locale, we should just ignore it and let other routes match
  // or return null to let the child routes render.

  return null;
}

import {Outlet, useRouteLoaderData} from 'react-router';

export default function LocaleLayout() {
  const data = useRouteLoaderData('root') as any;
  const locale = data?.consent?.language?.toLowerCase() || 'ar';
  
  return <Outlet context={{ locale }} />;
}

