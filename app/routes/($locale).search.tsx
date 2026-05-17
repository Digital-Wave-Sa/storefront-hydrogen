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
  for (const [key, value] of searchParams.entries()) {
    if (key.startsWith('filter.')) {
      if (key === 'filter.v.price.min') {
        filters.push({
          price: {
            min: parseFloat(value),
            max: searchParams.get('filter.v.price.max') ? parseFloat(searchParams.get('filter.v.price.max')!) : undefined
          }
        });
      } else if (key === 'filter.v.price.max' && !searchParams.has('filter.v.price.min')) {
        filters.push({
          price: { max: parseFloat(value) }
        });
      } else if (key === 'filter.v.product_type') {
         filters.push({ productType: value });
      } else if (key === 'filter.v.product_vendor') {
         filters.push({ productVendor: value });
      } else if (key.startsWith('filter.p.m.')) {
         const [, , , namespace, k] = key.split('.');
         filters.push({
           productMetafield: { namespace, key: k, value }
         });
      } else if (key === 'filter.v.availability') {
         filters.push({ available: value === 'true' });
      } else if (key.startsWith('filter.v.option.')) {
        filters.push({
          variantOption: {
            name: key.replace('filter.v.option.', ''),
            value
          }
        });
      }
    }
  }

  if (!searchTerm) {
    return {
      searchResults: { results: null, totalResults: 0 },
      searchTerm,
    };
  }

  // Implement Partial-match & exact-match logic + relevance tuning for SKU and general terms
  let baseQuery = `(${searchTerm} OR ${searchTerm}* OR sku:${searchTerm} OR sku:${searchTerm}*)`;
  let finalQuery = baseQuery;

  const activeCustomTag = searchParams.get('tag');
  if (activeCustomTag) {
    finalQuery += ` AND tag:${activeCustomTag}`;
  }
  const activeCollection = searchParams.get('collection');
  if (activeCollection) {
    // There's no native collection filter in standard Shopify search API.
    // Instead of forcing a strict `product_type` match which often yields 0 results,
    // we inject the collection name as a search keyword to let Shopify's algorithm refine the results dynamically.
    finalQuery += ` AND ${activeCollection}`;
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
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const {publish} = useAnalytics();

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalProducts = searchResults?.results?.products?.nodes?.length || 0;
  const filterOptions = searchResults?.results?.products?.productFilters || [];

  return (
    // 2. Set dynamic direction and conditional font class
    <div
      className={`w-full min-h-screen ${isEn ? '' : 'font-ar'} bg-[#FEF8EB] pt-12 pb-20`}
      dir={isEn ? 'ltr' : 'rtl'}
    >
      <div className="max-w-[1400px] mx-auto px-6">

        <header className="mb-12 text-center">
          <Analytics.SearchView
            data={{
              searchTerm,
              searchResults
            }}
          />
          <h1 className="text-4xl lg:text-5xl font-black text-[#234745] mb-4">
            {searchTerm
              ? (isEn ? `Search results for "${searchTerm}"` : `نتائج البحث عن "${searchTerm}"`)
              : (isEn ? 'Search' : 'البحث')
            }
          </h1>

          {searchTerm && searchResults?.totalResults !== undefined ? (
            <p className="text-gray-500 font-bold tracking-tight bg-white px-4 py-1.5 rounded-full inline-block shadow-sm">
              {isEn
                ? `Found ${searchResults.totalResults} results`
                : `تم العثور على ${searchResults.totalResults} نتيجة`
              }
            </p>
          ) : (
            <p className="text-gray-500 font-medium tracking-tight">
              {isEn
                ? 'Find your favorite products from our luxury sweets'
                : 'ابحث عن منتجاتك المفضلة من حلوياتنا الفاخرة'
              }
            </p>
          )}
        </header>

        <section className="max-w-3xl mx-auto mb-16">
          <SearchForm searchTerm={searchTerm} />
        </section>

        <section>
          {!searchTerm || !searchResults.totalResults ? (
            <NoSearchResults searchTerm={searchTerm} />
          ) : (
            <>
              {/* Filter Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
                <div className="flex items-center gap-4">
                  <button 
                      onClick={() => setIsFilterOpen(true)}
                      className="flex items-center gap-2.5 px-6 py-3.5 bg-[#234745] text-white rounded-2xl font-bold hover:bg-[#2d5e4a] transition-all shadow-md active:scale-95 group"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-12 transition-transform"><path d="M22 3H2l8 9v11l4-6V12L22 3z"/></svg>
                    <span>{isEn ? 'Filter' : 'تـصـفـيـة'}</span>
                  </button>
                  <div className="h-10 w-[1px] bg-gray-100 hidden md:block"></div>
                  <p className="text-gray-400 font-bold hidden md:block">
                      {isEn ? `Showing ${totalProducts} products` : `يوجد ${totalProducts} منتج`}
                  </p>
                </div>
              </div>

              <SearchResults results={searchResults.results as any} />
            </>
          )}
        </section>

      </div>

      {/* Filter Sidebar */}
      {mounted && typeof document !== 'undefined' && createPortal(
        <div className={`fixed inset-0 z-[999999] pointer-events-none transition-all duration-500 ${isFilterOpen ? 'visible' : 'invisible'}`} dir={isEn ? 'ltr' : 'rtl'}>
            <div 
              className={`absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-500 ${isFilterOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0'}`}
              onClick={() => setIsFilterOpen(false)}
            />
            <div 
              className={`absolute top-0 bottom-0 ${isEn ? 'right-0' : 'left-0'} w-full max-w-[420px] bg-white shadow-2xl transition-transform duration-500 pointer-events-auto flex flex-col`}
              style={{ transform: isFilterOpen ? 'translateX(0)' : (isEn ? 'translateX(100%)' : 'translateX(-100%)') }}
            >
                <FilterSidebar 
                  filters={filterOptions} 
                  tags={extractedTags}
                  collections={globalCollections}
                  onClose={() => setIsFilterOpen(false)} 
                  isEn={isEn}
                />
            </div>
        </div>,
        document.body
      )}

    </div>
  );
}

function FilterSidebar({ filters, tags, collections, onClose, isEn }: { filters: any[], tags: string[], collections: any[], onClose: () => void, isEn?: boolean }) {
    return (
        <div className="flex flex-col h-full overflow-hidden">
            <header className="p-8 border-b border-gray-100 flex items-center justify-between shrink-0">
                <h2 className="text-2xl font-black text-[#234745]">{isEn ? 'Filters' : 'تصفية النتائج'}</h2>
                <button onClick={onClose} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-[#234745] hover:bg-red-50 hover:text-red-500 transition-all font-bold text-2xl">
                    &times;
                </button>
            </header>
            
            <FilterForm onClose={onClose} filters={filters} tags={tags} collections={collections} isEn={isEn} />
        </div>
    );
}

function FilterForm({ filters, tags, collections, onClose, isEn }: { filters: any[], tags: string[], collections: any[], onClose: () => void, isEn?: boolean }) {
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [isCollectionsOpen, setIsCollectionsOpen] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setMinPrice(params.get('filter.v.price.min') || '');
        setMaxPrice(params.get('filter.v.price.max') || '');
    }, []);

    const handleApply = () => {
        const params = new URLSearchParams(window.location.search);
        if (minPrice) params.set('filter.v.price.min', minPrice);
        else params.delete('filter.v.price.min');
        
        if (maxPrice) params.set('filter.v.price.max', maxPrice);
        else params.delete('filter.v.price.max');
        
        window.location.search = params.toString();
        onClose();
    };

    return (
        <div className="flex-1 overflow-y-auto p-8 pt-4 flex flex-col">
            <div className="flex-1">

                {/* Custom Collections Filter Dropdown */}
                {collections && collections.length > 0 && (
                    <div className="mb-10 pb-6 border-b border-gray-100">
                        <button 
                            onClick={() => setIsCollectionsOpen(!isCollectionsOpen)}
                            className="w-full flex items-center justify-between group outline-none"
                        >
                            <h3 className="text-sm font-black text-[#234745] uppercase tracking-widest">
                                {isEn ? 'Collections' : 'المجموعات'}
                            </h3>
                            <svg 
                                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" 
                                className={`text-[#234745] transition-transform duration-300 ${isCollectionsOpen ? 'rotate-180' : ''}`}
                            >
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </button>
                        
                        <div className={`flex flex-col transition-all duration-300 overflow-hidden ${isCollectionsOpen ? 'mt-6 max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                            {collections.map((col: any) => {
                                const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
                                const isActive = params.get('collection') === col.title;
                                
                                if (isActive) params.delete('collection');
                                else params.set('collection', col.title);

                                return (
                                    <Link
                                        key={col.id}
                                        to={`?${params.toString()}`}
                                        className="flex items-center justify-between cursor-pointer group mb-3 last:mb-0 transition-opacity hover:opacity-80"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isActive ? 'bg-[#234745] border-[#234745]' : 'border-gray-200 bg-white group-hover:border-[#234745]'}`}>
                                                {isActive && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                            </div>
                                            <span className={`text-[14px] transition-all ${isActive ? 'text-[#234745] font-bold' : 'text-gray-600 font-medium group-hover:text-[#234745]'}`}>
                                                {col.title}
                                            </span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Custom Tags Filter */}
                {tags && tags.length > 0 && (
                    <div className="mb-10 pb-6 border-b border-gray-100">
                        <h3 className="text-sm font-black text-[#234745] uppercase tracking-widest mb-6">
                            {isEn ? 'Tags' : 'العلامات'}
                        </h3>
                        <div className="flex flex-col">
                            {tags.map((tag: string) => {
                                const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
                                const isActive = params.get('tag') === tag;
                                
                                if (isActive) params.delete('tag');
                                else params.set('tag', tag);
                                
                                return (
                                    <Link
                                        key={tag}
                                        to={`?${params.toString()}`}
                                        className="flex items-center justify-between cursor-pointer group mb-3 last:mb-0 transition-opacity hover:opacity-80"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isActive ? 'bg-[#234745] border-[#234745]' : 'border-gray-200 bg-white group-hover:border-[#234745]'}`}>
                                                {isActive && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                            </div>
                                            <span className={`text-[14px] transition-all ${isActive ? 'text-[#234745] font-bold' : 'text-gray-600 font-medium group-hover:text-[#234745]'}`}>
                                                {tag}
                                            </span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}

                {filters.map((filter) => (
                    <div key={filter.id} className="mb-10 pb-6 border-b border-gray-100 last:border-0">
                        <h3 className="text-sm font-black text-[#234745] uppercase tracking-widest mb-6">
                            {filter.label}
                        </h3>
                        {filter.type === 'LIST' ? (
                            <div className="flex flex-col">
                                {filter.values.map((value: any) => {
                                    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
                                    const filterInput = JSON.parse(value.input) as any;
                                    let isActive = false;
                                    
                                    if (filterInput.variantOption) {
                                        isActive = params.get(`filter.v.option.${filterInput.variantOption.name}`) === filterInput.variantOption.value;
                                    } else if (filterInput.productType) {
                                        isActive = params.get('filter.v.product_type') === filterInput.productType;
                                    } else if (filterInput.productVendor) {
                                        isActive = params.get('filter.v.product_vendor') === filterInput.productVendor;
                                    } else if (filterInput.productMetafield) {
                                        isActive = params.get(`filter.p.m.${filterInput.productMetafield.namespace}.${filterInput.productMetafield.key}`) === filterInput.productMetafield.value;
                                    } else if (filterInput.available !== undefined) {
                                        isActive = params.get('filter.v.availability') === filterInput.available.toString();
                                    }

                                    return (
                                        <Link
                                            key={value.id}
                                            to={getFilterLink(value.input)}
                                            className="flex items-center justify-between cursor-pointer group mb-3 last:mb-0 transition-opacity hover:opacity-80"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isActive ? 'bg-[#234745] border-[#234745]' : 'border-gray-200 bg-white group-hover:border-[#234745]'}`}>
                                                    {isActive && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                                </div>
                                                <span className={`text-[14px] transition-all ${isActive ? 'text-[#234745] font-bold' : 'text-gray-600 font-medium group-hover:text-[#234745]'}`}>
                                                    {value.label}
                                                </span>
                                            </div>
                                            <span className="text-[12px] text-gray-400 font-bold">{value.count}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        ) : filter.type === 'PRICE_RANGE' ? (
                            <div className="space-y-4">
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="text-[10px] font-black text-gray-400 block mb-1">{isEn ? 'Min Price' : 'الحد الأدنى'}</label>
                                        <input 
                                            type="number" 
                                            value={minPrice}
                                            onChange={(e) => setMinPrice(e.target.value)}
                                            placeholder="0" 
                                            className="w-full bg-white border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-[#234745] transition-all" 
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[10px] font-black text-gray-400 block mb-1">{isEn ? 'Max Price' : 'الحد الأقصى'}</label>
                                        <input 
                                            type="number" 
                                            value={maxPrice}
                                            onChange={(e) => setMaxPrice(e.target.value)}
                                            placeholder="500+" 
                                            className="w-full bg-white border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-[#234745] transition-all" 
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                ))}
            </div>

            <footer className="p-8 pb-10 sticky bottom-0 z-20">
                <button 
                  onClick={handleApply}
                  className="w-full bg-[#234745] text-white py-5 rounded-2xl font-black text-lg shadow-[0_10px_30px_rgba(27,61,46,0.25)] hover:shadow-[0_15px_40px_rgba(27,61,46,0.35)] active:scale-95 transition-all"
                >
                    {isEn ? 'Apply Filters' : 'تـطـبـيـق الـفـلاتـر'}
                </button>
            </footer>
        </div>
    );
}

function getFilterLink(input: string) {
    try {
        const parsed = JSON.parse(input) as any;
        const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
        
        if (parsed.price) {
            if (parsed.price.min) params.set('filter.v.price.min', parsed.price.min);
            if (parsed.price.max) params.set('filter.v.price.max', parsed.price.max);
        } else if (parsed.variantOption) {
            params.set(`filter.v.option.${parsed.variantOption.name}`, parsed.variantOption.value);
        } else if (parsed.productType) {
            params.set('filter.v.product_type', parsed.productType);
        } else if (parsed.productVendor) {
            params.set('filter.v.product_vendor', parsed.productVendor);
        } else if (parsed.productMetafield) {
            params.set(`filter.p.m.${parsed.productMetafield.namespace}.${parsed.productMetafield.key}`, parsed.productMetafield.value);
        } else if (parsed.available !== undefined) {
             params.set('filter.v.availability', parsed.available.toString());
        }
        
        return '?' + params.toString();
    } catch(e) {
        return '#';
    }
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

