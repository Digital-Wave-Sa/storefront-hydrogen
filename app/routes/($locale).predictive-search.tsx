import {data, type LoaderFunctionArgs} from 'react-router';
import {
  searchProductIndex,
  warmProductIndex,
} from '~/lib/product-search-index.server';

export async function loader({request, params, context}: LoaderFunctionArgs) {
  const {storefront, env} = context;
  /**
   * Oxygen may terminate work that is not registered with `waitUntil` as soon
   * as the response is returned. Warming and refreshing the catalog index are
   * exactly that kind of work, so the request's `waitUntil` has to be handed
   * down — without it a warm-up starts on every search and finishes on none.
   */
  const waitUntil = (context as any).waitUntil as
    | ((p: Promise<unknown>) => void)
    | undefined;
  const searchParams = new URL(request.url).searchParams;
  const q = searchParams.get('q') || '';
  const limit = parseInt(searchParams.get('limit') || '6', 10);
  const locale = params.locale || 'ar';
  const isEn = locale === 'en';

  if (!q) {
    /**
     * An empty query is the shopper focusing the box before typing — the
     * perfect moment to start building the catalog index, so the first real
     * keystroke finds it ready instead of waiting for a crawl.
     */
    warmProductIndex(env, waitUntil);
    return data({
      searchResults: {
        results: [],
        totalResults: 0,
      },
      searchTerm: '',
      pending: false,
    });
  }

  /**
   * Shopify's predictive search is kept for what it does well — English
   * typeahead plus collection and query suggestions. It is wrapped so a
   * failure here can never take the Arabic path down with it.
   */
  let predictiveSearch: any = null;
  try {
    const res = await storefront.query(PREDICTIVE_SEARCH_QUERY, {
      variables: {
        query: q,
        limit,
        language: storefront.i18n.language,
        country: storefront.i18n.country,
      },
    });
    predictiveSearch = res?.predictiveSearch ?? null;
  } catch (e) {
    console.error('[PredictiveSearch] Shopify predictiveSearch failed:', e);
  }

  const shopifyPhysicalProducts: any[] = (predictiveSearch?.products || []).filter(
    (item: any) => !item.isGiftCard && item.productType !== 'Gift Card',
  );

  /**
   * Arabic cannot come from Shopify: predictive search does not support the
   * Arabic buyer locale, and it only indexes the English (primary-locale)
   * title, never the Arabic translation Translate & Adapt writes. So for an
   * Arabic session — or any time Shopify comes back empty — match against our
   * own bilingual catalog index instead. See product-search-index.server.
   */
  let indexProducts: any[] = [];
  /**
   * Whether the index could actually be consulted. `hits: []` means two very
   * different things — "nothing matches" and "there was no index to look in" —
   * and the dropdown was announcing the first while the truth was the second.
   */
  let indexReady = true;
  if (!isEn || shopifyPhysicalProducts.length === 0) {
    try {
      const {hits, currencyCode, ready} = await searchProductIndex(
        env,
        q,
        limit,
        undefined,
        waitUntil,
      );
      indexReady = ready;
      indexProducts = hits
        .filter((h) => !h.isGiftCard && h.productType !== 'Gift Card')
        .map((h) => ({
          __typename: 'Product',
          handle: h.handle,
          id: h.id,
          // Arabic shoppers see the Arabic title; fall back to English when a
          // product has not been translated yet rather than showing nothing.
          title: isEn ? h.titleEn : h.titleAr || h.titleEn,
          image: h.image,
          price: h.priceAmount ? {amount: h.priceAmount, currencyCode} : null,
          url: `${isEn ? '/en' : ''}/products/${h.handle}`,
        }));
    } catch (e) {
      indexReady = false;
      console.error('[PredictiveSearch] Index search failed:', e);
    }
  }

  console.log(
    `[PredictiveSearch] query="${q}" locale="${locale}" shopifyProducts=${shopifyPhysicalProducts.length} indexProducts=${indexProducts.length} queries=${predictiveSearch?.queries?.length || 0} collections=${predictiveSearch?.collections?.length || 0}`,
  );

  // Normalize results to match NormalizedPredictiveSearchResults type
  const results: any[] = [];

  if (predictiveSearch?.queries?.length > 0) {
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

  // Prefer the bilingual index whenever it was consulted and found something
  // (Arabic sessions always; English only when Shopify returned nothing).
  // Otherwise use Shopify's own product matches.
  const productItems: any[] =
    indexProducts.length > 0
      ? indexProducts
      : shopifyPhysicalProducts.map((item: any) => {
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
        });

  if (productItems.length > 0) {
    results.push({type: 'products', items: productItems});
  }

  if (predictiveSearch?.collections?.length > 0) {
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

  /**
   * "Ask me again in a moment", not "there is nothing".
   *
   * Only meaningful when the answer is empty AND the index was the source
   * that came up short. The client keeps its loading state and retries
   * instead of telling the shopper their query has no matches.
   */
  const pending = totalResults === 0 && !indexReady;

  if (pending) {
    console.warn(
      `[PredictiveSearch] query="${q}" answered with no index (still building) — client will retry.`,
    );
  }

  return data({
    searchResults: {
      results,
      totalResults,
    },
    searchTerm: q,
    pending,
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
        isGiftCard
        productType
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
