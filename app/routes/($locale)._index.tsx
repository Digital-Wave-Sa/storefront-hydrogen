import {Await, useLoaderData} from 'react-router';
import type {Route} from './+types/($locale)._index';
import {Hero} from '~/components/Hero';
import {ShopByCategory} from '~/components/ShopByCategory';
import {BestSellers} from '~/components/BestSellers';
import {DesignYourCake} from '~/components/DesignYourCake';
import {ShopByOccasion} from '~/components/ShopByOccasion';
import {NewArrivals} from '~/components/NewArrivals';
import {OffersAndDiscounts} from '~/components/OffersAndDiscounts';
import {LoyaltyProgram} from '~/components/LoyaltyProgram';

export const meta: Route.MetaFunction = () => {
  return [
    {title: 'Saadeddin Pastry | Premium Sweets, Cakes & Chocolate'},
    {
      name: 'description',
      content:
        'Discover Saadeddin Pastry - The destination for premium Arabic sweets, European cakes, and fine chocolate. Freshly prepared daily with the finest ingredients.',
    },
    {
      property: 'og:title',
      content: 'Saadeddin Pastry | Premium Sweets, Cakes & Chocolate',
    },
  ];
};

export async function loader(args: Route.LoaderArgs) {
  const deferredData = loadDeferredData(args);
  const criticalData = await loadCriticalData(args);
  return {...deferredData, ...criticalData};
}

async function loadCriticalData({context}: Route.LoaderArgs) {
  const [{collections}] = await Promise.all([
    context.storefront.query(FEATURED_COLLECTION_QUERY),
  ]);

  return {
    featuredCollection: collections.nodes[0],
  };
}

function loadDeferredData({context}: Route.LoaderArgs) {
  const recommendedProducts = context.storefront
    .query(RECOMMENDED_PRODUCTS_QUERY)
    .catch((error: Error) => {
      console.error(error);
      return null;
    });

  const newArrivals = context.storefront
    .query(NEW_ARRIVALS_QUERY)
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
    <div className="home w-full bg-[#fdfaf6]">
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
      <Hero />
      <ShopByCategory />
      <DesignYourCake />
      <BestSellers products={data.recommendedProducts} />
      <ShopByOccasion />
      <NewArrivals products={data.newArrivals} />
      <OffersAndDiscounts />
      <LoyaltyProgram />
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
    variants(first: 1) {
      nodes {
        id
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
    products(first: 8, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...RecommendedProduct
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
    variants(first: 1) {
      nodes {
        id
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
    products(first: 4, sortKey: CREATED_AT, reverse: true) {
      nodes {
        ...NewArrivalProduct
      }
    }
  }
` as const;

