import {
  type LoaderFunctionArgs,
  type LinksFunction,
  useLoaderData,
} from 'react-router';
import CustomCakeBuilder from '~/components/CakeBuilder/CustomCakeBuilder';
import {getShopTitle} from '~/lib/seo';
import type {Route} from './+types/($locale).custom-cake';

export const meta: Route.MetaFunction = ({matches}) => {
  return [{title: getShopTitle('Customize Your Dream Cake', matches)}];
};

/**
 * Preload the two textures the very first render always needs.
 *
 * The old list preloaded four flat cake photographs that no longer exist in the
 * pipeline — the renderer draws the cake rather than showing a picture of one.
 * What it does need immediately is the white fondant master for the default
 * format and the default filling, and fetching those in parallel with the JS
 * bundle takes a visible beat off the first paint.
 *
 * Deliberately only two. Preloading all 91 assets would saturate the connection
 * on a phone and delay the very thing it is trying to speed up.
 */
export const links: LinksFunction = () => {
  return [
    {
      rel: 'preload',
      as: 'image',
      href: '/cake/v5/materials/fondant-photo-round8.webp',
      type: 'image/webp',
    },
    {
      rel: 'preload',
      as: 'image',
      href: '/cake/v5/fillings/filling-04.webp',
      type: 'image/webp',
    },
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
        # The join key between a price in admin and an option in the render
        # catalog — 'round-20x20-h8', '07', 'rose-garden'. Returns null until
        # the field is added to the definition, which is safe: an option with
        # no key is simply unpriced, and unpriced blocks checkout.
        builderKey: field(key: "builder_key") { value }
        # "true" only on prices the development team modelled. Absent or
        # "false" means the price came from Saadeddin and is sellable.
        provisional: field(key: "provisional") { value }
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
          value
          reference {
            ... on Metaobject {
              id
            }
          }
        }
        shape: field(key: "shape") {
          value
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
    cakeSettings: metaobjects(type: "cake_settings", first: 1) {
      nodes {
        preparationHours: field(key: "preparation_hours") { value }
      }
    }
  }
`;

export async function loader({context}: LoaderFunctionArgs) {
  const {storefront} = context;
  try {
    const data = (await storefront
      .query(CAKE_ATTRIBUTES_QUERY, {
        variables: {language: storefront.i18n.language},
        cache: storefront.CacheShort(),
      })
      .catch((err: any) => {
        console.warn(
          '[Cake Builder Loader] Storefront query error (403/network):',
          err?.message || err,
        );
        return null;
      })) as any;

    const rawHours = data?.cakeSettings?.nodes?.[0]?.preparationHours?.value;
    const preparationHours = rawHours ? parseInt(rawHours, 10) : 24;

    return {
      locale: storefront.i18n.language.toLowerCase(),
      cakeAttributes: data?.cakeAttributes?.nodes || [],
      toppingDesigns: data?.toppingDesigns?.nodes || [],
      preparationHours: isNaN(preparationHours) ? 24 : preparationHours,
    };
  } catch (error) {
    console.error('[Cake Builder Loader] Error:', error);
    return {
      locale: 'en',
      cakeAttributes: [],
      toppingDesigns: [],
      preparationHours: 24,
    };
  }
}

export default function CustomCakeBuilderRoute() {
  const {cakeAttributes, toppingDesigns, locale, preparationHours} =
    useLoaderData<typeof loader>();
  const isEn = locale === 'en';
  return (
    <CustomCakeBuilder
      cakeAttributes={cakeAttributes}
      toppingDesigns={toppingDesigns}
      isEn={isEn}
      preparationHours={preparationHours}
    />
  );
}
