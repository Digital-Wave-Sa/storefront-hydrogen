import { type LoaderFunctionArgs, type LinksFunction, useLoaderData } from 'react-router';
import LolaCakeBuilder from '~/components/CakeBuilder/LolaCakeBuilder';
import { getShopTitle } from '~/lib/seo';
import type { Route } from './+types/($locale).custom-cake';

export const meta: Route.MetaFunction = ({ matches }) => {
  return [{ title: getShopTitle('Customize Your Dream Cake', matches) }];
};

export const links: LinksFunction = () => {
  return [
    { rel: 'preload', as: 'image', href: '/images/cake-builder/cake-round.webp' },
    { rel: 'preload', as: 'image', href: '/images/cake-builder/cake-heart.webp' },
    { rel: 'preload', as: 'image', href: '/images/cake-builder/cake-square.webp' },
    { rel: 'preload', as: 'image', href: '/images/cake-builder/cake-tall.webp' },
  ];
};

const CAKE_ATTRIBUTES_QUERY = `#graphql
  query CakeAttributes($language: LanguageCode) @inContext(language: $language) {
    cakeAttributes: metaobjects(type: "cake_attribute", first: 250) {
      nodes {
        id
        attributeType: field(key: "attribute_type") { value }
        nameEn: field(key: "name_english") { value }
        nameAr: field(key: "name_arabic") { value }
        priceDelta: field(key: "price_delta") { value }
        thumbnailUrl: field(key: "thumbnail_image") { reference { ... on MediaImage { image { url } } } }
        imageFront: field(key: "image_front") { reference { ... on MediaImage { image { url } } } }
        imageTop: field(key: "image_top") { reference { ... on MediaImage { image { url } } } }
        imageSliced: field(key: "image_sliced") { reference { ... on MediaImage { image { url } } } }
      }
    }
    toppingDesigns: metaobjects(type: "cake_topping_design", first: 250) {
      nodes {
        id
        topping: field(key: "topping") {
          reference {
            ... on Metaobject {
              id
            }
          }
        }
        shape: field(key: "shape") {
          reference {
            ... on Metaobject {
              id
            }
          }
        }
        imageFront: field(key: "image_front") { reference { ... on MediaImage { image { url } } } }
        imageTop: field(key: "image_top") { reference { ... on MediaImage { image { url } } } }
        imageSliced: field(key: "image_sliced") { reference { ... on MediaImage { image { url } } } }
      }
    }
  }
`;

export async function loader({ context }: LoaderFunctionArgs) {
  const { storefront } = context;
  try {
    const data = await storefront.query(CAKE_ATTRIBUTES_QUERY, {
      variables: { language: storefront.i18n.language },
      cache: storefront.CacheShort(),
    });
    
    return {
      locale: storefront.i18n.language.toLowerCase(),
      cakeAttributes: data.cakeAttributes?.nodes || [],
      toppingDesigns: data.toppingDesigns?.nodes || []
    };
  } catch (error) {
    console.error('[Cake Builder Loader] GraphQL Query Error:', error);
    return { locale: 'en', cakeAttributes: [], toppingDesigns: [] };
  }
}

export default function CustomCakeBuilderRoute() {
  const { cakeAttributes, toppingDesigns, locale } = useLoaderData<typeof loader>();
  const isEn = locale === 'en';
  return (
    <LolaCakeBuilder 
      cakeAttributes={cakeAttributes} 
      toppingDesigns={toppingDesigns} 
      isEn={isEn} 
    />
  );
}
