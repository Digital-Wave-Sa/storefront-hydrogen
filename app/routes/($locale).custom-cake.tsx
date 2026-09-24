import {
  type LoaderFunctionArgs,
  type LinksFunction,
  useLoaderData,
} from 'react-router';
import CustomCakeBuilder from '~/components/CakeBuilder/CustomCakeBuilder';
import {getShopTitle} from '~/lib/seo';
import type {Route} from './+types/($locale).custom-cake';

import {pageTitle} from '~/lib/seo';
export const meta: Route.MetaFunction = ({matches}) => {
  return [{title: pageTitle(matches, 'Design Your Cake', 'صمّم كيكتك')}];
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

/**
 * The shape of one `cake_topping_design` row, written out once because the
 * first page comes back with the rest of the builder's data and the pages
 * after it come back on their own. Both queries have to ask for exactly the
 * same fields or the second page would arrive missing pictures.
 */
const TOPPING_DESIGN_FIELDS = `#graphql
  id
  topping: field(key: "topping") {
    reference { ... on Metaobject { builderKey: field(key: "builder_key") { value } } }
  }
  shape: field(key: "shape") {
    reference { ... on Metaobject { builderKey: field(key: "builder_key") { value } } }
  }
  imageFront: field(key: "image_front") { reference { ... on MediaImage { image { url } } } }
  imageTop: field(key: "image_top") { reference { ... on MediaImage { image { url } } } }
  imageSliced: field(key: "image_sliced") { reference { ... on MediaImage { image { url } } } }
`;

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
        # Admin-controlled list order and visibility for the builder.
        sortOrder: field(key: "sort_order") { value }
        hidden: field(key: "hidden") { value }
        thumbnailUrl: field(key: "thumbnail_image") { reference { ... on MediaImage { image { url } } } }
        imageFront: field(key: "image_front") { reference { ... on MediaImage { image { url } } } }
        imageTop: field(key: "image_top") { reference { ... on MediaImage { image { url } } } }
        imageSliced: field(key: "image_sliced") { reference { ... on MediaImage { image { url } } } }
        frostingFront: field(key: "frosting_front") { reference { ... on MediaImage { image { url } } } }
        frostingTop: field(key: "frosting_top") { reference { ... on MediaImage { image { url } } } }
        frostingSliced: field(key: "frosting_sliced") { reference { ... on MediaImage { image { url } } } }
      }
    }
    # 250 is the Storefront API's hard page limit, not a number we chose, and
    # one topping set is 10 designs x 10 shapes = 100 rows. Past ~two and a
    # half sets the rest of the rows are simply not in the response and the
    # toppings that lost their pictures vanish from the builder with no error
    # anywhere, so the loader follows the cursor. See TOPPING_DESIGNS_PAGE.
    toppingDesigns: metaobjects(type: "cake_topping_design", first: 250) {
      pageInfo { hasNextPage endCursor }
      nodes {
        ${TOPPING_DESIGN_FIELDS}
      }
    }
    # One slice picture per flavour per shape, for the builder's Slice view.
    flavorSlices: metaobjects(type: "cake_flavor_slice", first: 250) {
      nodes {
        shape: field(key: "shape") {
          reference { ... on Metaobject { builderKey: field(key: "builder_key") { value } } }
        }
        flavor: field(key: "flavor") {
          reference { ... on Metaobject { builderKey: field(key: "builder_key") { value } } }
        }
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

/** The pages of `cake_topping_design` after the first one. */
const TOPPING_DESIGNS_PAGE_QUERY = `#graphql
  query ToppingDesignsPage($language: LanguageCode, $after: String)
  @inContext(language: $language) {
    toppingDesigns: metaobjects(type: "cake_topping_design", first: 250, after: $after) {
      pageInfo { hasNextPage endCursor }
      nodes {
        ${TOPPING_DESIGN_FIELDS}
      }
    }
  }
`;

/**
 * A ceiling on the cursor loop. Ten pages is 2,500 design rows — far more than
 * the shop will ever have — and it exists only so a malformed cursor can never
 * spin the loader forever.
 */
const MAX_TOPPING_DESIGN_PAGES = 10;

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

    /**
     * Follow the cursor for the remaining design rows. A failed page is
     * dropped rather than thrown: the builder degrades to the toppings it did
     * receive, which is what the outer catch already does for the whole query.
     */
    const toppingDesigns: any[] = [...(data?.toppingDesigns?.nodes || [])];
    let pageInfo = data?.toppingDesigns?.pageInfo;
    for (let page = 1; page < MAX_TOPPING_DESIGN_PAGES; page++) {
      if (!pageInfo?.hasNextPage || !pageInfo?.endCursor) break;
      const next = (await storefront
        .query(TOPPING_DESIGNS_PAGE_QUERY, {
          variables: {
            language: storefront.i18n.language,
            after: pageInfo.endCursor,
          },
          cache: storefront.CacheShort(),
        })
        .catch((err: any) => {
          console.warn(
            '[Cake Builder Loader] Topping designs page error:',
            err?.message || err,
          );
          return null;
        })) as any;
      if (!next?.toppingDesigns?.nodes?.length) break;
      toppingDesigns.push(...next.toppingDesigns.nodes);
      pageInfo = next.toppingDesigns.pageInfo;
    }

    const rawHours = data?.cakeSettings?.nodes?.[0]?.preparationHours?.value;
    const preparationHours = rawHours ? parseInt(rawHours, 10) : 24;

    return {
      locale: storefront.i18n.language.toLowerCase(),
      cakeAttributes: data?.cakeAttributes?.nodes || [],
      toppingDesigns,
      flavorSlices: data?.flavorSlices?.nodes || [],
      preparationHours: isNaN(preparationHours) ? 24 : preparationHours,
    };
  } catch (error) {
    console.error('[Cake Builder Loader] Error:', error);
    return {
      locale: 'en',
      cakeAttributes: [],
      toppingDesigns: [],
      flavorSlices: [],
      preparationHours: 24,
    };
  }
}

export default function CustomCakeBuilderRoute() {
  const {cakeAttributes, toppingDesigns, flavorSlices, locale, preparationHours} =
    useLoaderData<typeof loader>();
  const isEn = locale === 'en';
  return (
    <CustomCakeBuilder
      cakeAttributes={cakeAttributes}
      toppingDesigns={toppingDesigns}
      flavorSlices={flavorSlices}
      isEn={isEn}
      preparationHours={preparationHours}
    />
  );
}
