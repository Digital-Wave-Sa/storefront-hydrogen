import {Await, useLoaderData} from 'react-router';
import type {Route} from './+types/($locale)._index';
import {HeroSlider} from '~/components/HeroSlider';
import {ShopByCategory} from '~/components/ShopByCategory';
import {BestSellers} from '~/components/BestSellers';
import {DesignYourCake} from '~/components/DesignYourCake';
import {ShopByOccasion} from '~/components/ShopByOccasion';
import {NewArrivals} from '~/components/NewArrivals';
import {OffersAndDiscounts} from '~/components/OffersAndDiscounts';
import {RamadanBanner} from '~/components/RamadanBanner';
import {CustomerReviews} from '~/components/CustomerReviews';
import {WhoAreYouGifting} from '~/components/WhoAreYouGifting';
import {CorporateGifting} from '~/components/CorporateGifting';
import {getShopTitle} from '~/lib/seo';

export const meta: Route.MetaFunction = ({matches}) => {
  const rootMatch = matches.find((m) => m?.id === 'root');
  const rootData = (rootMatch as any)?.data as any;
  const isEn = rootData?.consent?.language?.toLowerCase() === 'en';

  const titleText = isEn ? 'Premium Sweets, Cakes & Chocolate' : 'حلويات، كيك وشوكولاتة فاخرة';
  const description = isEn 
    ? 'Discover Saadeddin Pastry - The destination for premium Arabic sweets, European cakes, and fine chocolate. Freshly prepared daily with the finest ingredients.'
    : 'اكتشف حلويات سعد الدين - وجهتك للحلويات العربية الفاخرة، الكيك الأوروبي، والشوكولاتة الراقية. تُحضر طازجة يومياً بأجود المكونات.';

  const title = getShopTitle(titleText, matches);

  return [
    {title},
    {
      name: 'description',
      content: description,
    },
    {
      property: 'og:title',
      content: title,
    },
    {
      property: 'og:description',
      content: description,
    },
  ];
};

export async function loader(args: Route.LoaderArgs) {
  const deferredData = loadDeferredData(args);
  const criticalData = await loadCriticalData(args);
  return {...deferredData, ...criticalData};
}

async function loadCriticalData({context}: Route.LoaderArgs) {
  const [{collections}, occasionsResult, configResult] = await Promise.all([
    context.storefront.query(FEATURED_COLLECTION_QUERY, {
      variables: {
        country: context.storefront.i18n.country,
        language: context.storefront.i18n.language,
      },
    }),
    context.storefront.query(OCCASIONS_QUERY, {
      variables: {
        country: context.storefront.i18n.country,
        language: context.storefront.i18n.language,
      },
    }).catch((error) => {
      console.error('Failed to fetch occasions:', error);
      return { collections: { nodes: [] } };
    }),
    context.storefront.query(HOMEPAGE_CONFIG_QUERY, {
      variables: {
        country: context.storefront.i18n.country,
        language: context.storefront.i18n.language,
      },
    }).catch((error) => {
      console.error('Failed to fetch homepage config:', error);
      return { metaobjects: { nodes: [] } };
    }),
  ]);

  return {
    featuredCollection: collections.nodes[0],
    occasions: occasionsResult.collections.nodes,
    homepageConfig: configResult?.metaobjects?.nodes?.[0] || null,
  };
}

function loadDeferredData({context}: Route.LoaderArgs) {
  const recommendedProducts = context.storefront
    .query(RECOMMENDED_PRODUCTS_QUERY, {
      variables: {
        country: context.storefront.i18n.country,
        language: context.storefront.i18n.language,
      },
    })
    .catch((error: Error) => {
      console.error(error);
      return null;
    });

  const newArrivals = context.storefront
    .query(NEW_ARRIVALS_QUERY, {
      variables: {
        country: context.storefront.i18n.country,
        language: context.storefront.i18n.language,
      },
    })
    .catch((error: Error) => {
      console.error(error);
      return null;
    });

  return {
    recommendedProducts,
    newArrivals,
  };
}

export default function Homepage() {
  const data = useLoaderData<typeof loader>();

  return (
    <div className="home w-full bg-[#FEF8EB] overflow-x-hidden">
      <h1 className="sr-only">Saadeddin Pastry</h1>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Saadeddin Pastry',
            url: 'https://saadeddin.com',
            logo: 'https://saadeddin.com/logo.png',
            contactPoint: {
              '@type': 'ContactPoint',
              telephone: '920017070',
              contactType: 'customer service',
              availableLanguage: ['English', 'Arabic'],
            },
            sameAs: [
              'https://www.facebook.com/SaadeddinPastry',
              'https://twitter.com/saadeddinpastry',
              'https://www.instagram.com/saadeddinpastry/',
            ],
          }),
        }}
      />
      <HeroSlider />
      <ShopByOccasion collections={data.occasions} />
      <WhoAreYouGifting collections={data.occasions} />
      <BestSellers products={data.recommendedProducts} />
      <CorporateGifting />
      <NewArrivals products={data.newArrivals} />
      <DesignYourCake />
      <RamadanBanner config={data.homepageConfig} />
      <OffersAndDiscounts config={data.homepageConfig} />
      <CustomerReviews config={data.homepageConfig} />
    </div>
  );
}

const FEATURED_COLLECTION_QUERY = `#graphql
  fragment FeaturedCollection on Collection {
    id
    title
    image {
      id
      url
      altText
      width
      height
    }
    handle
  }
  query FeaturedCollection($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    collections(first: 1, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...FeaturedCollection
      }
    }
  }
` as const;

const RECOMMENDED_PRODUCTS_QUERY = `#graphql
  fragment RecommendedProduct on Product {
    id
    title
    handle
    availableForSale
    productType
    tags
    compareAtPriceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    images(first: 1) {
      nodes {
        id
        url
        altText
        width
        height
      }
    }
    visibility_start: metafield(namespace: "custom", key: "visibility_start") {
      value
    }
    visibility_end: metafield(namespace: "custom", key: "visibility_end") {
      value
    }
    is_limited_time: metafield(namespace: "custom", key: "is_limited_time") {
      value
    }
    average_rating: metafield(namespace: "custom", key: "average_rating") {
      value
    }
    rating_count: metafield(namespace: "custom", key: "rating_count") {
      value
    }
    bogo_free_item: metafield(namespace: "custom", key: "bogo_free_item") {
      value
      reference {
        ... on ProductVariant {
          id
        }
      }
    }
    variants(first: 10) {
      nodes {
        id
        title
        image {
          url
          altText
          width
          height
        }
        price {
          amount
          currencyCode
        }
        compareAtPrice {
          amount
          currencyCode
        }
        selectedOptions {
          name
          value
        }
        product {
          handle
          title
        }
        storeAvailability(first: 250) {
          nodes {
            available
            location {
              id
              name
            }
          }
        }
      }
    }
  }
  query RecommendedProducts ($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    
    fallbackProducts: products(first: 8, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...RecommendedProduct
      }
    }

    bestSellers: collection(handle: "best-sellers") {
      products(first: 8) {
        nodes {
          ...RecommendedProduct
        }
      }
    }

    kunafa: collection(handle: "kunafa") {
      products(first: 8) {
        nodes {
          ...RecommendedProduct
        }
      }
    }

    sweets: collection(handle: "sweets") {
      products(first: 8) {
        nodes {
          ...RecommendedProduct
        }
      }
    }

    chocolateCake: collection(handle: "chocolate-cake") {
      products(first: 8) {
        nodes {
          ...RecommendedProduct
        }
      }
    }

    cakes: collection(handle: "cakes") {
      products(first: 8) {
        nodes {
          ...RecommendedProduct
        }
      }
    }

    chocolate: collection(handle: "chocolate") {
      products(first: 8) {
        nodes {
          ...RecommendedProduct
        }
      }
    }

    gifts: collection(handle: "gifts") {
      products(first: 8) {
        nodes {
          ...RecommendedProduct
        }
      }
    }

    gifting: collection(handle: "gifting") {
      products(first: 8) {
        nodes {
          ...RecommendedProduct
        }
      }
    }
  }
` as const;

const NEW_ARRIVALS_QUERY = `#graphql
  fragment NewArrivalProduct on Product {
    id
    title
    handle
    availableForSale
    productType
    tags
    compareAtPriceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    images(first: 1) {
      nodes {
        id
        url
        altText
        width
        height
      }
    }
    visibility_start: metafield(namespace: "custom", key: "visibility_start") {
      value
    }
    visibility_end: metafield(namespace: "custom", key: "visibility_end") {
      value
    }
    is_limited_time: metafield(namespace: "custom", key: "is_limited_time") {
      value
    }
    average_rating: metafield(namespace: "custom", key: "average_rating") {
      value
    }
    rating_count: metafield(namespace: "custom", key: "rating_count") {
      value
    }
    bogo_free_item: metafield(namespace: "custom", key: "bogo_free_item") {
      value
      reference {
        ... on ProductVariant {
          id
        }
      }
    }
    variants(first: 10) {
      nodes {
        id
        title
        image {
          url
          altText
          width
          height
        }
        price {
          amount
          currencyCode
        }
        compareAtPrice {
          amount
          currencyCode
        }
        selectedOptions {
          name
          value
        }
        product {
          handle
          title
        }
        storeAvailability(first: 250) {
          nodes {
            available
            location {
              id
              name
            }
          }
        }
      }
    }
  }
  query NewArrivalsProducts ($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    taggedProducts: products(first: 10, sortKey: CREATED_AT, reverse: true, query: "tag:special OR tag:special-collection OR tag:special_collection OR tag:featured OR tag:'special collection'") {
      nodes {
        ...NewArrivalProduct
      }
    }
    allProducts: products(first: 10, sortKey: CREATED_AT, reverse: true) {
      nodes {
        ...NewArrivalProduct
      }
    }
  }
` as const;

const OCCASIONS_QUERY = `#graphql
  query Occasions($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    collections(first: 100) {
      nodes {
        id
        title
        handle
        image {
          url
          altText
          width
          height
        }
      }
    }
  }
` as const;

export const HOMEPAGE_CONFIG_QUERY = `#graphql
  query HomepageConfig($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    metaobjects(type: "homepage_config", first: 1) {
      nodes {
        fields {
          key
          value
          reference {
            ... on MediaImage {
              image {
                url
              }
            }
          }
          references(first: 10) {
            nodes {
              ... on Metaobject {
                fields {
                  key
                  value
                  reference {
                    ... on MediaImage {
                      image {
                        url
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
` as const;
