import {data, type LoaderFunctionArgs} from 'react-router';
import {useLoaderData, Link, useRouteLoaderData} from 'react-router';

export async function loader({context}: LoaderFunctionArgs) {
  const payload = await context.storefront.query(POLICIES_QUERY);
  const policies = Object.values(payload.shop || {});

  if (!policies.length) {
    throw new Response('No policies found', {status: 404});
  }

  return data({policies});
}

export default function Policies() {
  const {policies} = useLoaderData<typeof loader>();
  const rootData = useRouteLoaderData('root') as any;
  const isEn = rootData?.locale === 'en';

  return (
    <div className="policies" dir={isEn ? 'ltr' : 'rtl'}>
      <h1>{isEn ? 'Policies' : 'السياسات'}</h1>
      <div>
        {policies.map((policy) => {
          if (!policy) return null;
          return (
            <fieldset key={policy.id}>
              <Link to={`/policies/${policy.handle}`}>{policy.title}</Link>
            </fieldset>
          );
        })}
      </div>
    </div>
  );
}

const POLICIES_QUERY = `#graphql
  fragment PolicyItem on ShopPolicy {
    id
    title
    handle
  }
  query Policies ($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    shop {
      privacyPolicy {
        ...PolicyItem
      }
      shippingPolicy {
        ...PolicyItem
      }
      termsOfService {
        ...PolicyItem
      }
      refundPolicy {
        ...PolicyItem
      }
      subscriptionPolicy {
        id
        title
        handle
      }
    }
  }
` as const;
