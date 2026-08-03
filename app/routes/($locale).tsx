import type {LoaderFunctionArgs} from 'react-router';

export async function loader({params, context}: LoaderFunctionArgs) {
  const {language, country} = context.storefront.i18n;

  if (
    params.locale &&
    params.locale.toLowerCase() !== 'en' &&
    params.locale.toLowerCase() !== 'ar' &&
    params.locale.toLowerCase() !== 'en-sa' &&
    params.locale.toLowerCase() !== 'ar-sa'
  ) {
    // If it's not one of our supported locales, throw 404
    throw new Response(null, {status: 404});
  }

  return null;
}

import {Outlet, useRouteLoaderData, useParams} from 'react-router';

export default function LocaleLayout() {
  const data = useRouteLoaderData('root') as any;
  const params = useParams();
  const locale =
    params.locale?.toLowerCase() ||
    data?.consent?.language?.toLowerCase() ||
    'ar';

  return (
    <Outlet
      context={{
        locale,
        selectedLocationId: data?.selectedLocationId,
        selectedLocationName: data?.selectedLocationName,
        fulfillmentType: data?.fulfillmentType,
      }}
    />
  );
}
