import type {MetaFunction} from 'react-router';
import {data, type LoaderFunctionArgs} from 'react-router';
import {
  useLoaderData,
  useOutletContext,
  Link,
  useLocation,
  useSearchParams,
} from 'react-router';
import {useState, useEffect, useRef} from 'react';
import {createPortal} from 'react-dom';
import {
  sendShopifyAnalytics,
  AnalyticsEventName,
  AnalyticsPageType,
  useAnalytics,
  Analytics,
} from '@shopify/hydrogen';

import {SearchForm, SearchResults, NoSearchResults} from '~/components/Search';
import patternBg from '/images/second-bg-pattern.svg';
import {
  FilterSidebar,
  ActiveFilterChips,
} from '~/routes/($locale).collections.all';

export const meta: MetaFunction<typeof loader> = ({data}) => {
  const isEn = data?.searchTerm?.includes('/en/');
  const siteName = isEn ? 'Saadeddin' : 'سعد الدين';
  const searchLabel = isEn ? 'Search' : 'بحث';

  if (data?.searchTerm) {
    return [
      {
        title: `${isEn ? 'Search for' : 'بحث عن'} "${data.searchTerm}" | ${siteName}`,
      },
    ];
  }
  return [{title: `${searchLabel} | ${siteName}`}];
};

export async function loader({request, context}: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const searchParams = new URLSearchParams(url.search);
  const searchTerm = String(searchParams.get('q') || '');

  const filters: any[] = [];
  searchParams.forEach((value, key) => {
    if (key.startsWith('filter.')) {
      const parts = key.split('.');
      if (parts[2] === 'price') {
        if (parts.length === 3) {
          try {
            const priceObj = JSON.parse(value) as any;
            const p: any = {};
            if (priceObj.min !== undefined) p.min = parseFloat(priceObj.min);
            if (priceObj.max !== undefined) p.max = parseFloat(priceObj.max);
            if (priceObj.gte !== undefined) p.min = parseFloat(priceObj.gte);
            if (priceObj.lte !== undefined) p.max = parseFloat(priceObj.lte);
            filters.push({price: p});
          } catch (e) {}
        } else {
          const type = parts[3];
          const existing = filters.find((f) => f.price);
          if (existing) {
            existing.price[type] = parseFloat(value);
          } else {
            filters.push({price: {[type]: parseFloat(value)}});
          }
        }
      } else if (parts[2] === 'option') {
        const optionName = parts[3];
        filters.push({variantOption: {name: optionName, value}});
      } else if (parts[2] === 'availability') {
        filters.push({available: value === 'true'});
      } else if (parts[2] === 'product_type') {
        filters.push({productType: value});
      } else if (parts[2] === 'product_vendor') {
        filters.push({productVendor: value});
      } else if (key.startsWith('filter.p.m.')) {
        const namespace = parts[3];
        const k = parts[4];
        filters.push({
          productMetafield: {namespace, key: k, value},
        });
      }
    }
  });

  const activeTags = searchParams
    .getAll('filter.p.tag')
    .concat(searchParams.getAll('tag'));

  let finalQuery = (searchTerm && searchTerm.trim() !== '*') ? searchTerm.trim() : '*';

  if (activeTags.length > 0) {
    const tagQuery = activeTags.map((t) => `tag:"${t}"`).join(' OR ');
    if (finalQuery === '*') {
      finalQuery = `(${tagQuery})`;
    } else {
      finalQuery += ` AND (${tagQuery})`;
    }
  }

  const activeCollection = searchParams.get('collection');
  if (activeCollection) {
    finalQuery += ` ${activeCollection}`;
  }

  let sortKey = searchParams.get('sortKey') || 'RELEVANCE';
  if (sortKey !== 'RELEVANCE' && sortKey !== 'PRICE') {
    sortKey = 'RELEVANCE';
  }
  const reverse = searchParams.get('reverse') === 'true';

  const {storefront} = context;
  const searchPayload = await storefront.query(SEARCH_QUERY as any, {
    variables: {
      query: finalQuery,
      productFilters: filters.length > 0 ? filters : undefined,
      sortKey: sortKey as any,
      reverse,
      first: 250,
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
      const collectionPromises = selectedCategories.map((handle) =>
        storefront.query(
          `#graphql
                query CollectionIds($handle: String!, $country: CountryCode, $language: LanguageCode) @inContext(country: $country, language: $language) {
                    collection(handle: $handle) {
                        products(first: 250) {
                            nodes {
                                id
                            }
                        }
                    }
                }
            `,
          {
            variables: {
              handle,
              country: storefront.i18n.country,
              language: storefront.i18n.language,
            },
            cache: storefront.CacheNone(),
          },
        ),
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

      if (searchPayload?.products?.nodes) {
        searchPayload.products.nodes = searchPayload.products.nodes.filter(
          (p: any) => validIds.has(p.id),
        );
      }
    } catch (e) {
      console.error('Failed to fetch collections for search intersection', e);
    }
  }

  // Strictly filter products by activeTags if specified
  if (searchPayload?.products?.nodes?.length && activeTags.length > 0) {
    const lowerActiveTags = activeTags.map((t) => t.toLowerCase().trim());
    searchPayload.products.nodes = searchPayload.products.nodes.filter((p: any) => {
      const pTags = (p.tags || []).map((t: string) => String(t).toLowerCase().trim());
      return lowerActiveTags.some((at) =>
        pTags.some((pt) => pt === at || pt.includes(at) || at.includes(pt)),
      );
    });
  }

  // Ensure exact price sorting for search results (Price Low-to-High / High-to-Low)
  if (searchPayload?.products?.nodes?.length && sortKey === 'PRICE') {
    searchPayload.products.nodes.sort((a: any, b: any) => {
      const priceA = parseFloat(a.priceRange?.minVariantPrice?.amount || '0');
      const priceB = parseFloat(b.priceRange?.minVariantPrice?.amount || '0');
      return reverse ? priceB - priceA : priceA - priceB;
    });
  }

  const allProductNodes = searchPayload?.products?.nodes || [];
  const totalProductsCount = allProductNodes.length;
  const totalResults =
    totalProductsCount +
    (searchPayload?.pages?.nodes?.length || 0) +
    (searchPayload?.articles?.nodes?.length || 0);

  // Extract custom tags from the current search payload products
  const extractedTagsSet = new Set<string>();
  allProductNodes.forEach((p: any) =>
    p?.tags?.forEach((t: string) => extractedTagsSet.add(t)),
  );
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
    totalProductsCount,
    allProductNodes,
    analytics: {
      searchTerm,
      totalResults,
    },
  });
}

export default function SearchPage() {
  const {
    searchTerm,
    searchResults,
    extractedTags,
    globalCollections,
    totalProductsCount,
    allProductNodes,
  } = useLoaderData<any>();

  const {locale} = useOutletContext<{locale: string}>();
  const isEn = locale === 'en';
  const {publish} = useAnalytics();
  const location = useLocation();

  const [searchParams, setSearchParams] = useSearchParams();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset visible count when search query, filter, or sort changes
  useEffect(() => {
    setVisibleCount(12);
  }, [location.search, searchTerm]);

  // Infinite Scroll Observer: Load next 12 items as user scrolls down
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting) {
          setVisibleCount((prev) => {
            if (prev < totalProductsCount) {
              return Math.min(prev + 12, totalProductsCount);
            }
            return prev;
          });
        }
      },
      {rootMargin: '250px'},
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
      observer.disconnect();
    };
  }, [totalProductsCount, visibleCount]);

  useEffect(() => {
    if (searchTerm) {
      publish('search_viewed' as any, {
        searchTerm,
        searchResults: searchResults?.results,
      });
    }
  }, [searchTerm, searchResults, publish]);

  const filterOptions = searchResults?.results?.products?.productFilters || [];

  // Slice visible products according to infinite scroll progress
  const displayedPayload = searchResults?.results
    ? {
        ...searchResults.results,
        products: searchResults.results.products
          ? {
              ...searchResults.results.products,
              nodes: (allProductNodes || []).slice(0, visibleCount),
            }
          : undefined,
      }
    : null;

  const hasMoreToLoad = visibleCount < totalProductsCount;

  return (
    <div
      className={`w-full min-h-screen ${isEn ? '' : 'font-ar'} bg-[#FEF8EB] pb-20`}
      dir={isEn ? 'ltr' : 'rtl'}
    >
      <Analytics.SearchView data={{searchTerm, searchResults}} />

      {/* Top Header Hero */}
      <section
        className="relative h-[90px] md:h-[110px] w-full bg-[#234745] overflow-hidden flex items-center"
        dir={isEn ? 'ltr' : 'rtl'}
      >
        <div
          className="absolute inset-0 bg-[length:950px_800px] md:bg-[length:1900px_2000px]"
          style={{
            backgroundImage: `url(${patternBg})`,
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
        <div
          className="max-w-[1440px] w-full mx-auto px-4 md:px-8 lg:px-12 relative z-10 flex items-center gap-3 md:gap-4"
          dir={isEn ? 'ltr' : 'rtl'}
        >
          {/* Back Button (Unchanged) */}
          <button
            onClick={() => window.history.back()}
            className={`flex items-center gap-[8px] bg-[#9FB7AE] hover:bg-[#8BA19C] text-[#234745] px-4 md:px-6 py-2.5 rounded-[25px] text-[12px] md:text-[16px] font-bold transition-all shrink-0 ${isEn ? 'font-en' : ''}`}
            style={
              isEn
                ? {}
                : {fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif"}
            }
            dir={isEn ? 'ltr' : 'rtl'}
          >
            <svg
              width="15"
              height="13"
              viewBox="0 0 15 13"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={`${isEn ? 'rotate-180' : ''}`}
            >
              <path
                d="M0 6H12.25L7 0.75L7.66 0L14.16 6.5L7.66 13L7 12.25L12.25 7H0V6Z"
                fill="#234745"
              />
            </svg>
            <span>{isEn ? 'Back' : 'الرجوع'}</span>
          </button>

          {/* Search Bar Input beside Back Button */}
          <div className="flex-1 min-w-0">
            <SearchForm searchTerm={searchTerm} />
          </div>
        </div>
      </section>

      {/* Main Container */}
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-12 py-8 md:py-12">
        <div className="flex flex-col gap-6">

          <div className="flex flex-col lg:flex-row gap-8 items-start">
            <div className="flex-1 w-full min-w-0">
              {/* Mobile Filter Controls Bar */}
              <div
                className="flex flex-col gap-3 lg:hidden mb-4 w-full"
                dir={isEn ? 'ltr' : 'rtl'}
              >
                <div className="flex items-center justify-between gap-2.5 w-full">
                  {/* Filter Toggle Button */}
                  <button
                    onClick={() => setIsFilterOpen(true)}
                    className="flex items-center justify-center gap-2 bg-transparent border border-[#BBCFCD]/60 rounded-[6px] px-3 py-2 text-[14px] font-bold text-[#234745] hover:bg-gray-50 transition-all shrink-0 cursor-pointer"
                    dir={isEn ? 'ltr' : 'rtl'}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                    </svg>
                    <span>{isEn ? 'Filters' : 'تصفية النتائج'}</span>
                  </button>

                  {/* Sort Dropdown */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className="text-[#BBCFCD] text-[13px] font-bold shrink-0"
                      style={{
                        fontFamily: !isEn
                          ? "'GE Dinar One', sans-serif"
                          : undefined,
                      }}
                    >
                      {isEn ? 'Sort by:' : 'ترتيب حسب:'}
                    </span>
                    <div className="flex items-center bg-transparent border border-[#BBCFCD]/60 rounded-[6px] px-2 py-2 relative w-[125px] sm:w-[150px]">
                      <select
                        aria-label={isEn ? 'Sort by' : 'ترتيب حسب'}
                        className="w-full bg-transparent text-[14px] sm:text-[14px] font-normal text-[#255441] cursor-pointer focus:outline-none focus:ring-0 border-none appearance-none rtl:pl-5 rtl:pr-1 ltr:pr-5 ltr:pl-1"
                        style={{
                          WebkitAppearance: 'none',
                          appearance: 'none',
                          fontFamily: !isEn
                            ? "'GE Dinar One', sans-serif"
                            : undefined,
                        }}
                        onChange={(e) => {
                          const [key, rev] = e.target.value.split('|');
                          const params = new URLSearchParams(searchParams);
                          params.set('sortKey', key);
                          params.set('reverse', rev);
                          params.delete('cursor');
                          params.delete('direction');
                          params.delete('page');
                          setSearchParams(params, {preventScrollReset: true});
                        }}
                        value={`${searchParams.get('sortKey') || 'RELEVANCE'}|${searchParams.get('reverse') || 'false'}`}
                      >
                        <option value="RELEVANCE|false">
                          {isEn ? 'Featured' : 'الأكثر صلة'}
                        </option>
                        <option value="PRICE|false">
                          {isEn
                            ? 'Price: Low to High'
                            : 'السعر: من الأقل للأعلى'}
                        </option>
                        <option value="PRICE|true">
                          {isEn
                            ? 'Price: High to Low'
                            : 'السعر: من الأعلى للأقل'}
                        </option>
                      </select>
                      <svg
                        className={`absolute ${isEn ? 'right-2' : 'left-2'} top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#234745] pointer-events-none`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 9l-7 7-7-7"
                        ></path>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Active Filter Chips */}
                <div className="flex flex-wrap items-center gap-2.5 justify-start w-full">
                  <ActiveFilterChips
                    isEn={isEn}
                    collections={globalCollections || []}
                  />
                </div>
              </div>

              {/* Desktop Layout Controls */}
              <div
                className={`hidden lg:flex ${isEn ? 'flex-row' : 'flex-row-reverse'} items-center justify-between gap-4 mb-4 w-full`}
                dir={isEn ? 'ltr' : 'rtl'}
              >
                <div className="flex items-center gap-2.5 shrink-0">
                  <span
                    className="text-[#BBCFCD] text-[15px] font-bold"
                    style={{
                      fontFamily: !isEn
                        ? "'GE Dinar One', sans-serif"
                        : undefined,
                    }}
                  >
                    {isEn ? 'Sort by:' : 'ترتيب حسب:'}
                  </span>
                  <div className="flex items-center bg-transparent border border-[#BBCFCD] rounded-[16px] px-4 py-2.5 relative w-[170px]">
                    <select
                      aria-label={isEn ? 'Sort by' : 'ترتيب حسب'}
                      className="w-full bg-transparent text-[12px] md:text-[16px] font-medium text-[#234745] cursor-pointer focus:outline-none focus:ring-0 border-none appearance-none rtl:pl-5 rtl:pr-1 ltr:pr-5 ltr:pl-1"
                      style={{
                        WebkitAppearance: 'none',
                        appearance: 'none',
                        fontFamily: !isEn
                          ? "'GE Dinar One', sans-serif"
                          : undefined,
                      }}
                      onChange={(e) => {
                        const [key, rev] = e.target.value.split('|');
                        const params = new URLSearchParams(searchParams);
                        params.set('sortKey', key);
                        params.set('reverse', rev);
                        params.delete('cursor');
                        params.delete('direction');
                        params.delete('page');
                        setSearchParams(params, {preventScrollReset: true});
                      }}
                      value={`${searchParams.get('sortKey') || 'RELEVANCE'}|${searchParams.get('reverse') || 'false'}`}
                    >
                      <option value="RELEVANCE|false">
                        {isEn ? 'Featured' : 'الأكثر صلة'}
                      </option>
                      <option value="PRICE|false">
                        {isEn ? 'Price: Low to High' : 'السعر: من الأقل للأعلى'}
                      </option>
                      <option value="PRICE|true">
                        {isEn ? 'Price: High to Low' : 'السعر: من الأعلى للأقل'}
                      </option>
                    </select>
                    <svg
                      className={`absolute ${isEn ? 'right-2' : 'left-2'} top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#234745] pointer-events-none`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      ></path>
                    </svg>
                  </div>
                </div>

                <div className="flex-1 flex flex-wrap items-center gap-2.5 justify-start">
                  <ActiveFilterChips
                    isEn={isEn}
                    collections={globalCollections || []}
                  />
                </div>
              </div>

              {!searchResults.totalResults ? (
                <NoSearchResults searchTerm={searchTerm} />
              ) : (
                <>
                  <SearchResults results={displayedPayload as any} />

                  {/* Infinite Scroll Sentinel */}
                  {hasMoreToLoad && (
                    <div
                      ref={loadMoreRef}
                      className="py-10 flex flex-col items-center justify-center gap-2"
                    >
                      <div className="w-8 h-8 border-3 border-[#234745]/20 border-t-[#234745] rounded-full animate-spin" />
                      <span className="text-[#234745] font-bold text-sm">
                        {isEn ? 'Loading more products...' : 'جاري تحميل المزيد من المنتجات...'}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="hidden lg:block w-72 shrink-0">
              <FilterSidebar
                filters={filterOptions}
                collections={globalCollections || []}
                onClose={() => {}}
                isDesktop={true}
                isEn={isEn}
                hideSearchInput={true}
              />
            </div>
          </div>
        </div>
      </div>
      {mounted &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className={`fixed inset-0 z-[999999] pointer-events-none transition-all duration-500 ${isFilterOpen ? 'visible' : 'invisible'}`}
          >
            <div
              className={`absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-500 ${isFilterOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0'}`}
              onClick={() => setIsFilterOpen(false)}
            />
            <div
              className={`fixed inset-y-0 ${isEn ? 'left-0' : 'right-0'} w-full max-w-sm bg-[#FEF8EB] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out pointer-events-auto ${isFilterOpen ? 'translate-x-0' : isEn ? '-translate-x-full' : 'translate-x-full'}`}
            >
              <FilterSidebar
                filters={filterOptions}
                collections={globalCollections || []}
                onClose={() => setIsFilterOpen(false)}
                isEn={isEn}
                hideSearchInput={true}
              />
            </div>
          </div>,
          document.body,
        )}
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
    variants(first: 1) {
      nodes {
        id
        title
        availableForSale
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
      }
    }
  }

  query Search(
    $country: CountryCode
    $endCursor: String
    $first: Int
    $language: LanguageCode
    $last: Int
    $query: String!
    $startCursor: String
    $productFilters: [ProductFilter!]
    $sortKey: SearchSortKeys
    $reverse: Boolean
  ) @inContext(country: $country, language: $language) {
    products: search(
      after: $endCursor
      before: $startCursor
      first: $first
      last: $last
      query: $query
      productFilters: $productFilters
      sortKey: $sortKey
      reverse: $reverse
      types: [PRODUCT]
    ) {
      nodes {
        ...SearchProduct
      }
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
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
    collections: collections(first: 100) {
      nodes {
        id
        title
        handle
      }
    }
  }
`;
