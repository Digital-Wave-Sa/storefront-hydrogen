import {data, type LoaderFunctionArgs} from 'react-router';

export async function loader({request, params, context}: LoaderFunctionArgs) {
  const {storefront} = context;
  const searchParams = new URL(request.url).searchParams;
  const q = searchParams.get('q') || '';
  const limit = parseInt(searchParams.get('limit') || '6', 10);
  const locale = params.locale || 'ar';
  const isEn = locale === 'en';

  if (!q) {
    return data({
      searchResults: {
        results: [],
        totalResults: 0,
      },
      searchTerm: '',
    });
  }

  const {predictiveSearch} = await storefront.query(PREDICTIVE_SEARCH_QUERY, {
    variables: {
      query: q,
      limit,
      language: storefront.i18n.language,
      country: storefront.i18n.country,
    },
  });

  console.log(
    `[PredictiveSearch] query="${q}" locale="${locale}" results: products=${predictiveSearch?.products?.length || 0}, queries=${predictiveSearch?.queries?.length || 0}, collections=${predictiveSearch?.collections?.length || 0}`,
  );

  if (!predictiveSearch) {
    return data({
      searchResults: {
        results: [],
        totalResults: 0,
      },
      searchTerm: q,
    });
  }

  // Normalize results to match NormalizedPredictiveSearchResults type
  const results: any[] = [];

  if (predictiveSearch.queries?.length > 0) {
    results.push({
      type: 'queries',
      items: predictiveSearch.queries.map((item: any) => ({
        __typename: 'Query',
        handle: '',
        id: item.text,
        title: item.text,
        styledTitle: item.styledText,
        url: `${isEn ? '/en' : ''}/search?q=${encodeURIComponent(item.text)}`,
      })),
    });
  }

  if (predictiveSearch.products?.length > 0) {
    results.push({
      type: 'products',
      items: predictiveSearch.products.map((item: any) => {
        const variant = item.variants.nodes[0];
        return {
          __typename: 'Product',
          handle: item.handle,
          id: item.id,
          title: item.title,
          image: variant?.image,
          price: variant?.price,
          url: `${isEn ? '/en' : ''}/products/${item.handle}`,
        };
      }),
    });
  }

  if (predictiveSearch.collections?.length > 0) {
    results.push({
      type: 'collections',
      items: predictiveSearch.collections.map((item: any) => ({
        __typename: 'Collection',
        handle: item.handle,
        id: item.id,
        title: item.title,
        image: item.image,
        url: `${isEn ? '/en' : ''}/collections/${item.handle}`,
      })),
    });
  }

  const totalResults = results.reduce(
    (acc, group) => acc + group.items.length,
    0,
  );

  return data({
    searchResults: {
      results,
      totalResults,
    },
    searchTerm: q,
  });
}

const PREDICTIVE_SEARCH_QUERY = `#graphql
  query predictiveSearch(
    $query: String!
    $limit: Int
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    predictiveSearch(query: $query, limit: $limit, types: [PRODUCT, QUERY, COLLECTION], searchableFields: [TITLE, PRODUCT_TYPE, VENDOR, VARIANTS_SKU]) {
      queries {
        text
        styledText
      }
      products {
        id
        title
        handle
        variants(first: 1) {
          nodes {
            id
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
          }
        }
      }
      collections {
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
`;
