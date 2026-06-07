import { type MetaFunction, type LoaderFunctionArgs, type LinksFunction, useLoaderData } from 'react-router';
import LolaCakeBuilder from '~/components/CakeBuilder/LolaCakeBuilder';

export const meta: MetaFunction = () => {
  return [{ title: 'Customize Your Dream Cake | Saadeddin' }];
};

export const links: LinksFunction = () => {
  return [
    { rel: 'preload', as: 'image', href: '/images/cake-builder/cake-round.png' },
    { rel: 'preload', as: 'image', href: '/images/cake-builder/cake-heart.png' },
    { rel: 'preload', as: 'image', href: '/images/cake-builder/cake-square.png' },
    { rel: 'preload', as: 'image', href: '/images/cake-builder/cake-tall.png' },
  ];
};

const CAKE_ATTRIBUTES_QUERY = `#graphql
  query CakeAttributes($language: LanguageCode) @inContext(language: $language) {
    metaobjects(type: "cake_attribute", first: 250) {
      nodes {
        id
        attributeType: field(key: "attribute_type") { value }
        nameEn: field(key: "name_english") { value }
        priceDelta: field(key: "price_delta") { value }
        thumbnailUrl: field(key: "thumbnail_image") { reference { ... on MediaImage { image { url } } } }
      }
    }
  }
`;

export async function loader({ context }: LoaderFunctionArgs) {
  const { storefront } = context;
  try {
    const { metaobjects } = await storefront.query(CAKE_ATTRIBUTES_QUERY, {
      variables: { language: storefront.i18n.language },
      cache: storefront.CacheShort(),
    });
    return { locale: storefront.i18n.language.toLowerCase(), cakeAttributes: metaobjects.nodes };
  } catch (error) {
    return { locale: 'en', cakeAttributes: [] };
  }
}

export default function CustomCakeBuilderRoute() {
  const { cakeAttributes, locale } = useLoaderData<typeof loader>();
  const isEn = locale === 'en';
  return <LolaCakeBuilder cakeAttributes={cakeAttributes} isEn={isEn} />;
}
