import type { MetaFunction } from 'react-router';
import { data, type LoaderFunctionArgs } from 'react-router';
import { useLoaderData, useOutletContext, Link } from 'react-router';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  getPaginationVariables,
  sendShopifyAnalytics,
  AnalyticsEventName,
  AnalyticsPageType,
  useAnalytics,
  Analytics,
} from '@shopify/hydrogen';

import { SearchForm, SearchResults, NoSearchResults } from '~/components/Search';
import patternBg from '~/assets/patteren-collection-header.svg';
import { FilterSidebar, ActiveFilterChips } from '~/routes/($locale).collections.all';

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  // Simple check for English search results in title
  const isEn = data?.searchTerm?.includes('/en/');
  const siteName = isEn ? 'Saadeddin' : 'سعد الدين';
  const searchLabel = isEn ? 'Search' : 'بحث';

  if (data?.searchTerm) {
    return [{ title: `${isEn ? 'Search for' : 'بحث عن'} "${data.searchTerm}" | ${siteName}` }];
  }
  return [{ title: `${searchLabel} | ${siteName}` }];
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const searchParams = new URLSearchParams(url.search);
  const variables = getPaginationVariables(request, { pageBy: 8 });
  const searchTerm = String(searchParams.get('q') || '');

  const filters: any[] = [];
  searchParams.forEach((value, key) => {
    if (key.startsWith('filter.')) {
      const parts = key.split('.');
      if (parts[2] === 'price') {
        if (parts.length === 3) {
          try {
            const priceObj = JSON.parse(value);
            const p: any = {};
            if (priceObj.min !== undefined) p.min = parseFloat(priceObj.min);
            if (priceObj.max !== undefined) p.max = parseFloat(priceObj.max);
            if (priceObj.gte !== undefined) p.min = parseFloat(priceObj.gte);
            if (priceObj.lte !== undefined) p.max = parseFloat(priceObj.lte);
            filters.push({ price: p });
          } catch(e) {}
        } else {
          const type = parts[3]; 
          const existing = filters.find(f => f.price);
          if (existing) {
            existing.price[type] = parseFloat(value);
          } else {
            filters.push({ price: { [type]: parseFloat(value) } });
          }
        }
      } else if (parts[2] === 'option') {
        const optionName = parts[3];
        filters.push({ variantOption: { name: optionName, value } });
      } else if (parts[2] === 'availability') {
          filters.push({ available: value === 'true' });
      } else if (parts[2] === 'product_type') {
          filters.push({ productType: value });
      } else if (parts[2] === 'product_vendor') {
          filters.push({ productVendor: value });
      } else if (key.startsWith('filter.p.m.')) {
         const namespace = parts[3];
         const k = parts[4];
         filters.push({
           productMetafield: { namespace, key: k, value }
         });
      }
    }
  });

  let finalQuery = searchTerm || "";

  const activeCustomTag = searchParams.get('tag');
  if (activeCustomTag) {
    finalQuery += ` tag:${activeCustomTag}`;
  }
  const activeCollection = searchParams.get('collection');
  if (activeCollection) {
    // There's no native collection filter in standard Shopify search API.
    // Instead of forcing a strict `product_type` match which often yields 0 results,
    // we inject the collection name as a search keyword to let Shopify's algorithm refine the results dynamically.
    finalQuery += ` ${activeCollection}`;
  }

  const { storefront } = context;
  const searchPayload = await storefront.query(SEARCH_QUERY as any, {
    variables: {
      query: finalQuery,
      productFilters: filters.length > 0 ? filters : undefined,
      ...variables,
      country: storefront.i18n.country,
      language: storefront.i18n.language,
    },
  });

  if (!searchPayload) {
    throw new Error('No search data returned from Shopify API');
  }

  // Strictly filter by selected categories if 'category' params exist
  const selectedCategories = searchParams.getAll('category');
  if (selectedCategories.length > 0) {
    try {
        const collectionPromises = selectedCategories.map(handle => 
            storefront.query(`#graphql
                query CollectionIds($handle: String!, $country: CountryCode, $language: LanguageCode) @inContext(country: $country, language: $language) {
                    collection(handle: $handle) {
                        products(first: 250) {
                            nodes {
                                id
                            }
                        }
                    }
                }
            `, {
                variables: {
                    handle,
                    country: storefront.i18n.country,
                    language: storefront.i18n.language,
                },
                cache: storefront.CacheNone(),
            })
        );
        
        const results = await Promise.all(collectionPromises);
        const validIds = new Set();
        
        results.forEach((res: any) => {
            if (res.collection?.products?.nodes) {
                res.collection.products.nodes.forEach((node: any) => {
                    validIds.add(node.id);
                });
            }
        });
        
        // Filter searchPayload products by checking if their id is in validIds
        if (searchPayload?.products?.nodes) {
            searchPayload.products.nodes = searchPayload.products.nodes.filter((p: any) => validIds.has(p.id));
        }
    } catch(e) {
        console.error("Failed to fetch collections for search intersection", e);
    }
  }

  const totalResults = 
    (searchPayload?.products?.nodes?.length || 0) + 
    (searchPayload?.pages?.nodes?.length || 0) + 
    (searchPayload?.articles?.nodes?.length || 0);

  // Extract custom tags from the current search payload products
  const extractedTagsSet = new Set<string>();
  const productNodes = searchPayload?.products?.nodes || [];
  productNodes.forEach((p: any) => p?.tags?.forEach((t: string) => extractedTagsSet.add(t)));
  const extractedTags = Array.from(extractedTagsSet);
  const globalCollections = searchPayload?.collections?.nodes || [];

  const searchResults = {
    results: searchPayload,
    totalResults,
  };

  return data({ 
    searchTerm, 
    searchResults, 
    extractedTags, 
    globalCollections,
    analytics: {
      searchTerm,
      totalResults,
    }
  });
}

export default function SearchPage() {
  const { searchTerm, searchResults, extractedTags, globalCollections } = useLoaderData<any>();

  const { locale } = useOutletContext<{ locale: string }>();
  const isEn = locale === 'en';
  const { publish } = useAnalytics();
  
  useEffect(() => {
    if (searchTerm) {
      publish('search_viewed', {
        searchTerm,
        searchResults: searchResults?.results,
      });
    }
  }, [searchTerm, searchResults, publish]);

  const totalProducts = searchResults?.results?.products?.nodes?.length || 0;
  const filterOptions = searchResults?.results?.products?.productFilters || [];

  return (
    <div className={`w-full min-h-screen ${isEn ? '' : 'font-ar'} bg-[#FEF8EB] pb-20`} dir={isEn ? 'ltr' : 'rtl'}>
      <Analytics.SearchView data={{ searchTerm, searchResults }} />
      
      {/* Top Header Bar */}
      <header className="relative py-6 mb-10 bg-[#234745] overflow-hidden flex items-center h-[112px]">
         {/* Subtle Pattern */}
         <div 
             className="absolute inset-0"
             style={{
                 backgroundImage: `url(${patternBg})`,
                 backgroundSize: 'cover',
                 backgroundPosition: 'center',
             }}
         />
         <div className="max-w-[1440px] w-full mx-auto px-4 md:px-8 lg:px-12 relative z-10 flex flex-col md:flex-row items-center gap-6 justify-between">
            <button onClick={() => window.history.back()} className="shrink-0 flex items-center gap-[8px] bg-[#9FB7AE] hover:bg-[#8BA19C] text-white px-8 py-3 rounded-[25px] font-bold transition-all shadow-sm" style={{ fontFamily: !isEn ? "'GE Dinar One', sans-serif" : undefined }}>
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={isEn ? 'rotate-180' : ''}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
               <span className="text-[16px]">{isEn ? 'Back' : 'رجوع'}</span>
            </button>
            <div className="flex-1 w-full">
               <SearchForm searchTerm={searchTerm} />
            </div>
         </div>
      </header>

      <div className="bg-[#FEF8EB] min-h-screen">
          <div className="px-4 md:px-8 lg:px-12 py-10 max-w-[1440px] mx-auto text-right">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-2 flex-wrap justify-start flex-1">
                 <ActiveFilterChips isEn={isEn} />
              </div>

              {totalProducts > 0 && (
                <div className="flex items-center justify-end">
                  <div className="flex items-center gap-2">
                    <label className="text-gray-400 text-[13px] font-bold">
                      {isEn ? 'Sort by:' : 'ترتيب حسب:'}
                    </label>
                    <div className="flex items-center bg-white border border-[#234745]/10 rounded-full px-4 py-2 shadow-sm relative w-40">
                      <select
                        className="w-full bg-transparent text-[13px] font-bold text-gray-800 cursor-pointer focus:outline-none focus:ring-0 border-none appearance-none rtl:pl-6"
                        style={{ WebkitAppearance: 'none', appearance: 'none' }}
                        onChange={(e) => {
                          const [key, rev] = e.target.value.split('|');
                          const url = new URL(window.location.href);
                          url.searchParams.set('sortKey', key);
                          url.searchParams.set('reverse', rev);
                          window.location.href = url.toString();
                        }}
                      >
                        <option value="RELEVANCE|false">{isEn ? 'Featured' : 'الأكثر صلة'}</option>
                        <option value="PRICE|false">{isEn ? 'Price: Low to High' : 'السعر: من الأقل للأعلى'}</option>
                        <option value="PRICE|true">{isEn ? 'Price: High to Low' : 'السعر: من الأعلى للأقل'}</option>
                      </select>
                      <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col lg:flex-row gap-8 items-start">
              <div className="flex-1 min-w-0 w-full lg:order-2">
                  {!searchResults.totalResults ? (
                      <NoSearchResults searchTerm={searchTerm} />
                  ) : (
                      <SearchResults results={searchResults.results as any} />
                  )}
              </div>

              <div className="hidden lg:block w-72 shrink-0">
                 <FilterSidebar filters={filterOptions} collections={globalCollections || []} onClose={() => {}} isDesktop={true} isEn={isEn} hideSearchInput={true} />
              </div>
            </div>
          </div>
      </div>
    </div>
  );
}



const SEARCH_QUERY = `#graphql
    fragment SearchProduct on Product {
    __typename
    handle
    id
    publishedAt
    title
    availableForSale
    trackingParameters
    vendor
    tags
    productType
    featuredImage {
      id
      altText
      url
      width
      height
    }
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
      maxVariantPrice {
        amount
        currencyCode
      }
    }
    compareAtPriceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    visibility_start: metafield(namespace: "custom", key: "visibility_start") {
      value
    }
    visibility_end: metafield(namespace: "custom", key: "visibility_end") {
      value
    }
    rating: metafield(namespace: "reviews", key: "rating") {
      value
    }
    ratingCount: metafield(namespace: "reviews", key: "rating_count") {
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
  fragment SearchPage on Page {
     __typename
     handle
    id
    title
    trackingParameters
  }
  fragment SearchArticle on Article {
    __typename
    handle
    id
    title
    trackingParameters
  }
  query search(
    $country: CountryCode
    $endCursor: String
    $first: Int
    $language: LanguageCode
    $last: Int
    $query: String!
    $startCursor: String
    $productFilters: [ProductFilter!]
  ) @inContext(country: $country, language: $language) {
    products: search(
      query: $query,
      unavailableProducts: HIDE,
      types: [PRODUCT],
      first: $first,
      sortKey: RELEVANCE,
      last: $last,
      before: $startCursor,
      after: $endCursor,
      productFilters: $productFilters
    ) {
      productFilters {
        id
        label
        type
        values {
          id
          label
          count
          input
        }
      }
      nodes {
        ...on Product {
          ...SearchProduct
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
    pages: search(
      query: $query,
      types: [PAGE],
      first: 10
    ) {
      nodes {
        ...on Page {
          ...SearchPage
        }
      }
    }
    articles: search(
      query: $query,
      types: [ARTICLE],
      first: 10
    ) {
      nodes {
        ...on Article {
          ...SearchArticle
        }
      }
    }
    collections(first: 50) {
      nodes {
        id
        handle
        title
      }
    }
  }
` as const;

