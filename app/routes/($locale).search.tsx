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

  // Wrap in quotes to prevent hyphens (e.g. in SKUs like SD-100) from being treated as NOT operators by Shopify
  const safeTerm = `"${searchTerm}"`;
  let baseQuery = `(${safeTerm} OR ${safeTerm}* OR sku:${safeTerm} OR sku:${safeTerm}*)`;
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
      <header className="bg-[#234745] py-6 mb-10 border-b-4 border-[#2d5e4a] relative overflow-hidden">
         {/* Subtle Pattern */}
         <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 2px, transparent 2px)', backgroundSize: '30px 30px' }}></div>
         <div className="max-w-[1400px] mx-auto px-6 relative z-10 flex flex-col md:flex-row items-center gap-6 justify-between">
            <div className="flex-1 w-full">
               <SearchForm searchTerm={searchTerm} />
            </div>
            <button onClick={() => window.history.back()} className="shrink-0 flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-full font-bold transition-all shadow-sm border border-white/10">
               <span>{isEn ? 'Back' : 'رجوع'}</span>
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={isEn ? 'rotate-180' : ''}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </button>
         </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-6">
        {(!searchTerm && !searchResults.totalResults) ? (
            <section className="max-w-3xl mx-auto mt-16">
              <NoSearchResults searchTerm={searchTerm} />
            </section>
        ) : (
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Static Filter Sidebar */}
                <aside className="hidden lg:block w-[320px] shrink-0">
                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden sticky top-8">
                       <FilterSidebar 
                         filters={filterOptions} 
                         tags={extractedTags}
                         collections={globalCollections}
                         onClose={() => {}} 
                         isEn={isEn}
                       />
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1">
                    {/* Active Filters & Sorting */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div className="flex flex-wrap items-center gap-2">
                           {/* Render Active Filter Chips (Mock or dynamic based on URL) */}
                           <ActiveFilterChips isEn={isEn} />
                        </div>
                        
                        <div className="flex items-center gap-3 shrink-0">
                           <span className="text-sm font-bold text-gray-400">{isEn ? 'Sort by:' : 'ترتيب حسب:'}</span>
                           <select className="bg-white px-6 py-2.5 rounded-full text-sm font-bold text-[#234745] border border-gray-200 outline-none shadow-sm cursor-pointer hover:border-[#234745] transition-all">
                               <option>{isEn ? 'Most Relevant' : 'الأكثر صلة'}</option>
                               <option>{isEn ? 'Price: Low to High' : 'السعر: من الأقل للأعلى'}</option>
                               <option>{isEn ? 'Price: High to Low' : 'السعر: من الأعلى للأقل'}</option>
                           </select>
                        </div>
                    </div>

                    {!searchResults.totalResults ? (
                        <NoSearchResults searchTerm={searchTerm} />
                    ) : (
                        <SearchResults results={searchResults.results as any} />
                    )}
                </main>
            </div>
        )}
      </div>
    </div>
  );
}

function ActiveFilterChips({ isEn }: { isEn: boolean }) {
    const [params, setParams] = useState<URLSearchParams | null>(null);
    useEffect(() => {
        setParams(new URLSearchParams(window.location.search));
    }, []);

    if (!params) return null;

    const chips: { key: string, label: string }[] = [];
    params.forEach((value, key) => {
        if (key === 'q' || key === 'cursor') return;
        
        let label = value;
        if (key === 'filter.v.price.min') label = isEn ? `Min: ${value} SAR` : `الأقل: ${value} ر.س`;
        if (key === 'filter.v.price.max') label = isEn ? `Max: ${value} SAR` : `الأعلى: ${value} ر.س`;
        if (key === 'tag') label = value;
        if (key === 'collection') label = value;

        chips.push({ key, label });
    });

    const removeFilter = (key: string) => {
        const url = new URL(window.location.href);
        url.searchParams.delete(key);
        window.location.href = url.toString();
    };

    return (
        <>
            {chips.map(chip => (
                <button 
                  key={chip.key}
                  onClick={() => removeFilter(chip.key)}
                  className="bg-white border border-gray-200 px-4 py-1.5 rounded-full flex items-center gap-2 text-sm font-bold text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all group"
                >
                    <span>{chip.label}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-gray-300 group-hover:text-red-500"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
            ))}
        </>
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
    const [openSections, setOpenSections] = useState<{[key: string]: boolean}>({
        'collections': true,
        'tags': true,
    });

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setMinPrice(params.get('filter.v.price.min') || '');
        setMaxPrice(params.get('filter.v.price.max') || '');
        
        // Auto-open sections that have active filters
        const initialOpen: {[key: string]: boolean} = {
            'collections': params.has('collection'),
            'tags': params.has('tag'),
        };
        filters.forEach(f => {
            initialOpen[f.id] = f.values.some((v: any) => isFilterActive(v.input, params));
        });
        setOpenSections(prev => ({...prev, ...initialOpen}));
    }, [filters]);

    const toggleSection = (id: string) => {
        setOpenSections(prev => ({...prev, [id]: !prev[id]}));
    };

    const handleApply = () => {
        const params = new URLSearchParams(window.location.search);
        if (minPrice) params.set('filter.v.price.min', minPrice);
        else params.delete('filter.v.price.min');
        
        if (maxPrice) params.set('filter.v.price.max', maxPrice);
        else params.delete('filter.v.price.max');
        
        window.location.search = params.toString();
        onClose();
    };

    const handleClearAll = () => {
        const params = new URLSearchParams(window.location.search);
        const q = params.get('q');
        const url = new URL(window.location.href);
        url.search = '';
        if (q) url.searchParams.set('q', q);
        window.location.href = url.toString();
    };

    const isFilterActive = (input: string, params: URLSearchParams) => {
        try {
            const filterInput = JSON.parse(input) as any;
            if (filterInput.variantOption) {
                return params.get(`filter.v.option.${filterInput.variantOption.name}`) === filterInput.variantOption.value;
            } else if (filterInput.productType) {
                return params.get('filter.v.product_type') === filterInput.productType;
            } else if (filterInput.productVendor) {
                return params.get('filter.v.product_vendor') === filterInput.productVendor;
            } else if (filterInput.productMetafield) {
                return params.get(`filter.p.m.${filterInput.productMetafield.namespace}.${filterInput.productMetafield.key}`) === filterInput.productMetafield.value;
            } else if (filterInput.available !== undefined) {
                return params.get('filter.v.availability') === filterInput.available.toString();
            }
        } catch (e) {}
        return false;
    };

    return (
        <div className="flex-1 overflow-y-auto p-6 flex flex-col h-full bg-[#FEF8EB]">
            <div className="flex-1 space-y-6">

                {/* Custom Collections Filter */}
                {collections && collections.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <button 
                            onClick={() => toggleSection('collections')}
                            className="w-full flex items-center justify-between p-4 group outline-none bg-gray-50/50"
                        >
                            <h3 className="text-sm font-black text-[#234745] uppercase tracking-widest">
                                {isEn ? 'Collections' : 'الأقسام'}
                            </h3>
                            <svg 
                                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" 
                                className={`text-[#234745] transition-transform duration-300 ${openSections['collections'] ? 'rotate-180' : ''}`}
                            >
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </button>
                        
                        <div className={`flex flex-col transition-all duration-300 overflow-hidden ${openSections['collections'] ? 'p-4 max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
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
                                        <span className="text-[12px] text-gray-400 font-bold"></span>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-[14px] transition-all ${isActive ? 'text-[#234745] font-bold' : 'text-gray-600 font-medium group-hover:text-[#234745]'}`}>
                                                {col.title}
                                            </span>
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isActive ? 'bg-[#234745] border-[#234745]' : 'border-gray-200 bg-white group-hover:border-[#234745]'}`}>
                                                {isActive && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Shopify Dynamic Filters */}
                {filters.map((filter) => (
                    <div key={filter.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <button 
                            onClick={() => toggleSection(filter.id)}
                            className="w-full flex items-center justify-between p-4 group outline-none bg-gray-50/50"
                        >
                            <h3 className="text-sm font-black text-[#234745] uppercase tracking-widest">
                                {filter.label}
                            </h3>
                            <svg 
                                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" 
                                className={`text-[#234745] transition-transform duration-300 ${openSections[filter.id] ? 'rotate-180' : ''}`}
                            >
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </button>
                        
                        <div className={`flex flex-col transition-all duration-300 overflow-hidden ${openSections[filter.id] ? 'p-4 max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                            {filter.type === 'LIST' ? (
                                <div className="flex flex-col">
                                    {filter.values.map((value: any) => {
                                        const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
                                        const isActive = isFilterActive(value.input, params);

                                        return (
                                            <Link
                                                key={value.id}
                                                to={getFilterLink(value.input)}
                                                className="flex items-center justify-between cursor-pointer group mb-3 last:mb-0 transition-opacity hover:opacity-80"
                                            >
                                                <span className="text-[12px] text-gray-400 font-bold">[{value.count}]</span>
                                                <div className="flex items-center gap-3">
                                                    <span className={`text-[14px] transition-all ${isActive ? 'text-[#234745] font-bold' : 'text-gray-600 font-medium group-hover:text-[#234745]'}`}>
                                                        {value.label}
                                                    </span>
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isActive ? 'bg-[#234745] border-[#234745]' : 'border-gray-200 bg-white group-hover:border-[#234745]'}`}>
                                                        {isActive && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                                    </div>
                                                </div>
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
                                    <button 
                                      onClick={handleApply}
                                      className="w-full bg-[#234745] text-white py-2 rounded-xl font-black text-sm hover:opacity-90 transition-all"
                                    >
                                        {isEn ? 'Apply' : 'تطبيق'}
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    </div>
                ))}
            </div>

            {/* Clear All Filters Button */}
            <div className="mt-6 sticky bottom-0 bg-[#FEF8EB] pt-4">
                <button 
                  onClick={handleClearAll}
                  className="w-full bg-white text-[#234745] border-2 border-[#234745] py-3 rounded-full font-black text-sm hover:bg-[#234745] hover:text-white transition-all shadow-sm"
                >
                    {isEn ? 'Clear All Filters' : 'مسح كل الفلاتر'}
                </button>
            </div>
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

