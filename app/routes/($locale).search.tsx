import type {MetaFunction} from 'react-router';
import {data, type LoaderFunctionArgs} from 'react-router';
import {
  useLoaderData,
  useOutletContext,
  Link,
  useLocation,
  useSearchParams,
} from 'react-router';
import {useState, useEffect} from 'react';
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

  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const itemsPerPage = 12;

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

  let finalQuery = (searchTerm && searchTerm.trim() !== '*') ? searchTerm.trim() : '*';

  const activeCustomTag = searchParams.get('tag');
  if (activeCustomTag) {
    finalQuery += ` tag:${activeCustomTag}`;
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
  const totalPages = Math.ceil(totalProductsCount / itemsPerPage) || 1;
  const currentPage = Math.min(page, totalPages);
  const offset = (currentPage - 1) * itemsPerPage;

  const paginatedProducts = allProductNodes.slice(offset, offset + itemsPerPage);
  if (searchPayload?.products) {
    searchPayload.products.nodes = paginatedProducts;
  }

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
    pagination: {
      currentPage,
      totalPages,
      totalProductsCount,
      itemsPerPage,
    },
    analytics: {
      searchTerm,
      totalResults,
    },
  });
}

function SearchPagination({
  currentPage,
  totalPages,
  searchParams,
  isEn,
}: {
  currentPage: number;
  totalPages: number;
  searchParams: URLSearchParams;
  isEn: boolean;
}) {
  if (totalPages <= 1) return null;

  const createPageUrl = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', pageNumber.toString());
    params.delete('cursor');
    params.delete('direction');
    return `?${params.toString()}`;
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const delta = 2;

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - delta && i <= currentPage + delta)
      ) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div
      className="flex items-center justify-center gap-1.5 sm:gap-2 mt-12 mb-6"
      dir={isEn ? 'ltr' : 'rtl'}
      style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
    >
      {/* Previous Button */}
      {currentPage > 1 ? (
        <Link
          to={createPageUrl(currentPage - 1)}
          className="w-10 h-10 rounded-full border border-[#234745]/20 flex items-center justify-center text-[#234745] hover:bg-[#234745] hover:text-white transition-all font-bold text-base"
          aria-label={isEn ? 'Previous Page' : 'الصفحة السابقة'}
        >
          {isEn ? '‹' : '›'}
        </Link>
      ) : (
        <span className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-300 cursor-not-allowed font-bold text-base">
          {isEn ? '‹' : '›'}
        </span>
      )}

      {/* Page Numbers */}
      {pageNumbers.map((p, idx) => {
        if (typeof p === 'string') {
          return (
            <span
              key={`ellipsis-${idx}`}
              className="w-8 h-10 flex items-center justify-center text-gray-400 font-bold"
            >
              ...
            </span>
          );
        }
        const isCurrent = p === currentPage;
        return (
          <Link
            key={`page-${p}`}
            to={createPageUrl(p)}
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-[15px] transition-all ${
              isCurrent
                ? 'bg-[#234745] text-white shadow-md'
                : 'bg-white border border-[#234745]/20 text-[#234745] hover:bg-[#234745]/10'
            }`}
          >
            {p}
          </Link>
        );
      })}

      {/* Next Button */}
      {currentPage < totalPages ? (
        <Link
          to={createPageUrl(currentPage + 1)}
          className="w-10 h-10 rounded-full border border-[#234745]/20 flex items-center justify-center text-[#234745] hover:bg-[#234745] hover:text-white transition-all font-bold text-base"
          aria-label={isEn ? 'Next Page' : 'الصفحة التالية'}
        >
          {isEn ? '›' : '‹'}
        </Link>
      ) : (
        <span className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-300 cursor-not-allowed font-bold text-base">
          {isEn ? '›' : '‹'}
        </span>
      )}
    </div>
  );
}

export default function SearchPage() {
  const {searchTerm, searchResults, extractedTags, globalCollections, pagination} =
    useLoaderData<any>();

  const {locale} = useOutletContext<{locale: string}>();
  const isEn = locale === 'en';
  const {publish} = useAnalytics();
  const location = useLocation();

  const [searchParams, setSearchParams] = useSearchParams();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sortKey, setSortKey] = useState('RELEVANCE');
  const [reverse, setReverse] = useState('false');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSortKey(params.get('sortKey') || 'RELEVANCE');
    setReverse(params.get('reverse') || 'false');
  }, [location.search]);

  useEffect(() => {
    if (searchTerm) {
      publish('search_viewed' as any, {
        searchTerm,
        searchResults: searchResults?.results,
      });
    }
  }, [searchTerm, searchResults, publish]);

  const totalProducts = searchResults?.results?.products?.nodes?.length || 0;
  const filterOptions = searchResults?.results?.products?.productFilters || [];

  return (
    <div
      className={`w-full min-h-screen ${isEn ? '' : 'font-ar'} bg-[#FEF8EB] pb-20`}
      dir={isEn ? 'ltr' : 'rtl'}
    >
      <Analytics.SearchView data={{searchTerm, searchResults}} />

      {/* Top Header Hero */}
      <section
        className="relative h-[144px] w-full bg-[#234745] overflow-hidden flex items-center"
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
          className="max-w-[1440px] w-full mx-auto px-4 md:px-8 lg:px-12 relative z-10 flex items-center justify-between gap-3 md:gap-4"
          dir={isEn ? 'ltr' : 'rtl'}
        >
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

          <h1
            className={`text-white text-[20px] md:text-[28px] font-bold truncate tracking-tight text-center ${isEn ? 'font-en' : ''}`}
            dir={isEn ? 'ltr' : 'rtl'}
          >
            {searchTerm ? (
              <span>
                {isEn ? 'Search for' : 'نتائج البحث عن'}: "{searchTerm}"
              </span>
            ) : (
              <span>{isEn ? 'All Products' : 'جميع المنتجات'}</span>
            )}
          </h1>
        </div>
      </section>

      {/* Main Container */}
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 lg:px-12 py-8 md:py-12">
        <div className="flex flex-col gap-6">
          <div className="w-full">
            <SearchForm searchTerm={searchTerm} />
          </div>

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
                  <SearchResults results={searchResults.results as any} />
                  {pagination && (
                    <SearchPagination
                      currentPage={pagination.currentPage}
                      totalPages={pagination.totalPages}
                      searchParams={searchParams}
                      isEn={isEn}
                    />
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
