import {data, type LoaderFunctionArgs, type MetaFunction} from 'react-router';
import {Link, useLoaderData, useRouteLoaderData} from 'react-router';
import {type Shop} from '@shopify/hydrogen/storefront-api-types';

type SelectedPolicies = keyof Pick<
  Shop,
  'privacyPolicy' | 'shippingPolicy' | 'termsOfService' | 'refundPolicy'
>;

export const meta: MetaFunction<typeof loader> = ({data}) => {
  return [{title: `Saadeddin | ${data?.policy?.title || 'Policy'}`}];
};

export async function loader({params, context}: LoaderFunctionArgs) {
  if (!params.handle) {
    throw new Response('No handle was passed in', {status: 404});
  }

  const policyName = params.handle.replace(
    /-([a-z])/g,
    (_: unknown, m1: string) => m1.toUpperCase(),
  ) as SelectedPolicies;

  const payload = await context.storefront.query(POLICY_CONTENT_QUERY, {
    variables: {
      privacyPolicy: false,
      shippingPolicy: false,
      termsOfService: false,
      refundPolicy: false,
      [policyName]: true,
      language: context.storefront.i18n?.language,
    },
  });

  const policy = payload.shop?.[policyName];

  if (!policy) {
    throw new Response('Could not find the policy', {status: 404});
  }

  return data({policy});
}

export default function Policy() {
  const {policy} = useLoaderData<typeof loader>();
  const rootData = useRouteLoaderData('root') as any;
  const isEn = rootData?.locale === 'en';

  return (
    <div className="policy" dir={isEn ? 'ltr' : 'rtl'}>
      <br />
      <br />
      <div className={isEn ? 'text-left' : 'text-right'}>
        <Link to="/policies" className="hover:underline">
          {isEn ? '← Back to Policies' : '← العودة للسياسات'}
        </Link>
      </div>
      <br />
      <h1 className="text-3xl font-black text-[#234745] mb-6">
        {policy.title}
      </h1>
      <div
        className="prose max-w-none"
        dangerouslySetInnerHTML={{__html: policy.body}}
      />
    </div>
  );
}

// NOTE: https://shopify.dev/docs/api/storefront/latest/objects/Shop
const POLICY_CONTENT_QUERY = `#graphql
  fragment Policy on ShopPolicy {
    body
    handle
    id
    title
    url
  }
  query Policy(
    $country: CountryCode
    $language: LanguageCode
    $privacyPolicy: Boolean!
    $refundPolicy: Boolean!
    $shippingPolicy: Boolean!
    $termsOfService: Boolean!
  ) @inContext(language: $language, country: $country) {
    shop {
      privacyPolicy @include(if: $privacyPolicy) {
        ...Policy
      }
      shippingPolicy @include(if: $shippingPolicy) {
        ...Policy
      }
      termsOfService @include(if: $termsOfService) {
        ...Policy
      }
      refundPolicy @include(if: $refundPolicy) {
        ...Policy
      }
    }
  }
` as const;
