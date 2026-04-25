import {
  useParams,
  useFetcher,
  Link,
  Form,
  useOutletContext,
  useRouteLoaderData,
  type FormProps,
  useFetchers
} from 'react-router';
import { Image, Money, Pagination } from '@shopify/hydrogen';
import React, { useRef, useEffect, useState } from 'react';
import { Price } from './Price';
import { getVisibilityStatus } from '~/lib/visibility';
import { getIsOutOfStock } from '~/lib/stock';
import { StockNotificationModal } from '~/components/StockNotificationModal';

import type {
  PredictiveProductFragment,
  PredictiveCollectionFragment,
  PredictiveArticleFragment,
  SearchQuery,
} from 'storefrontapi.generated';

type PredicticeSearchResultItemImage =
  | PredictiveCollectionFragment['image']
  | PredictiveArticleFragment['image']
  | PredictiveProductFragment['variants']['nodes'][0]['image'];

type PredictiveSearchResultItemPrice =
  | PredictiveProductFragment['variants']['nodes'][0]['price'];

export type NormalizedPredictiveSearchResultItem = {
  __typename: string | undefined;
  handle: string;
  id: string;
  image?: PredicticeSearchResultItemImage;
  price?: PredictiveSearchResultItemPrice;
  styledTitle?: string;
  title: string;
  url: string;
};

export type NormalizedPredictiveSearchResults = Array<
  | { type: 'queries'; items: Array<NormalizedPredictiveSearchResultItem> }
  | { type: 'products'; items: Array<NormalizedPredictiveSearchResultItem> }
  | { type: 'collections'; items: Array<NormalizedPredictiveSearchResultItem> }
  | { type: 'pages'; items: Array<NormalizedPredictiveSearchResultItem> }
  | { type: 'articles'; items: Array<NormalizedPredictiveSearchResultItem> }
>;

export type NormalizedPredictiveSearch = {
  results: NormalizedPredictiveSearchResults;
  totalResults: number;
};

type FetchSearchResultsReturn = {
  searchResults: {
    results: SearchQuery | null;
    totalResults: number;
  };
  searchTerm: string;
};

export const NO_PREDICTIVE_SEARCH_RESULTS: NormalizedPredictiveSearchResults = [
  { type: 'queries', items: [] },
  { type: 'products', items: [] },
  { type: 'collections', items: [] },
  { type: 'pages', items: [] },
  { type: 'articles', items: [] },
];

export function SearchForm({ searchTerm }: { searchTerm: string }) {
  // 1. Get locale from context
  const rootData = useRouteLoaderData('root') as { locale?: string };
  const locale = rootData?.locale || 'ar';
  const isEn = locale === 'en';
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'k' && event.metaKey) {
        event.preventDefault();
        inputRef.current?.focus();
      }
      if (event.key === 'Escape') {
        inputRef.current?.blur();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <Form method="get" className="relative w-full max-w-2xl mx-auto group" dir={isEn ? 'ltr' : 'rtl'}>
      <input
        defaultValue={searchTerm}
        name="q"
        placeholder={isEn ? "Search..." : "ابحث عن..."}
        ref={inputRef}
        type="search"
        // 2. Flip padding based on direction
        className={`w-full bg-white border-2 border-transparent shadow-sm rounded-2xl py-5 ${isEn ? 'pl-14 pr-6' : 'pl-6 pr-14'} text-lg font-bold placeholder:text-gray-300 focus:outline-none focus:ring-4 focus:ring-[#234745]/5 focus:border-[#234745] transition-all duration-300 group-hover:shadow-md`}
      />
      {/* 3. Flip Icon position */}
      <div className={`absolute ${isEn ? 'left-6' : 'right-6'} top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#234745] transition-colors`}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
      </div>
      {/* 4. Flip Button position */}
      <button
        type="submit"
        className={`absolute ${isEn ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 bg-[#234745] text-white px-6 py-3 rounded-xl font-bold text-sm hover:opacity-90 active:scale-95 transition-all`}
      >
        {isEn ? 'Search' : 'بحث'}
      </button>
    </Form>
  );
}

export function SearchResults({
  results,
}: Pick<FetchSearchResultsReturn['searchResults'], 'results'>) {
  if (!results) {
    return null;
  }
  const keys = Object.keys(results) as Array<keyof typeof results>;
  return (
    <div>
      {results &&
        keys.map((type) => {
          const resourceResults = results[type];

          if (resourceResults.nodes[0]?.__typename === 'Page') {
            const pageResults = resourceResults as SearchQuery['pages'];
            return resourceResults.nodes.length ? (
              <SearchResultPageGrid key="pages" pages={pageResults} />
            ) : null;
          }

          if (resourceResults.nodes[0]?.__typename === 'Product') {
            const productResults = resourceResults as SearchQuery['products'];
            return resourceResults.nodes.length ? (
              <SearchResultsProductsGrid
                key="products"
                products={productResults}
              />
            ) : null;
          }

          if (resourceResults.nodes[0]?.__typename === 'Article') {
            const articleResults = resourceResults as SearchQuery['articles'];
            return resourceResults.nodes.length ? (
              <SearchResultArticleGrid
                key="articles"
                articles={articleResults}
              />
            ) : null;
          }

          return null;
        })}
    </div>
  );
}


function SearchResultsProductsGrid({ products }: Pick<SearchQuery, 'products'>) {
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{title: string, variantId: string} | null>(null);

  // Add locale here
  const { selectedLocationName, selectedLocationId } = useOutletContext<{ selectedLocationName?: string, selectedLocationId?: string }>() || {};
  const rootData = useRouteLoaderData('root') as { locale?: string, customer?: Promise<any> };
  const locale = rootData?.locale || 'ar';
  const isEn = locale === 'en';
  const customer = rootData?.customer;
  const [customerEmail, setCustomerEmail] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (customer && typeof customer.then === 'function') {
        customer.then((res: any) => {
            if (res?.customer?.email) setCustomerEmail(res.customer.email);
        }).catch(() => {});
    }
  }, [customer]);

  const handleNotifyClick = (title: string, variantId: string) => {
    setSelectedProduct({ title, variantId });
    setIsNotifyModalOpen(true);
  };

  return (
    <div className="mb-16" dir={isEn ? 'ltr' : 'rtl'}>
      <div className="flex items-center gap-4 mb-8">
        <h3 className="text-2xl font-black text-[#234745]">
          {isEn ? 'Products' : 'المنتجات'}
        </h3>
        <div className="h-px flex-1 bg-gray-100"></div>
      </div>

      <Pagination connection={products}>
        {({ nodes, isLoading, NextLink, PreviousLink }) => {
          const itemsMarkup = (nodes as any[]).map((product) => {
            const variant = product.variants.nodes[0];
            const storeAvailabilityNodes = variant?.storeAvailability?.nodes || [];

            const isOutOfStock = getIsOutOfStock(
              selectedLocationId,
              selectedLocationName,
              storeAvailabilityNodes,
              product.availableForSale
            );

            // --- Visibility scheduling ---
            const visibility = getVisibilityStatus(
              product.visibility_start?.value,
              product.visibility_end?.value,
            );
            const isVisibilityBlocked = !visibility.isActive;
            const effectiveOutOfStock = isOutOfStock || isVisibilityBlocked;

            return (
              <div key={product.id} className={`flex flex-col ${isVisibilityBlocked ? 'product--disabled' : 'group'}`}>
                {(() => {
                  const tracking = product.trackingParameters ? (product.trackingParameters.startsWith('?') ? product.trackingParameters : `?${product.trackingParameters}`) : '';
                  const baseUrl = isEn ? `/en/products/${product.handle}` : `/products/${product.handle}`;
                  const finalUrl = isVisibilityBlocked ? '#' : `${baseUrl}${tracking}`;
                  
                  return (
                    <Link
                      prefetch="intent"
                      to={finalUrl}
                      onClick={isVisibilityBlocked ? (e: any) => e.preventDefault() : undefined}
                      className={isVisibilityBlocked ? 'pointer-events-none' : ''}
                    >
                      <div className={`aspect-square bg-white rounded-[2rem] overflow-hidden mb-4 shadow-sm border border-gray-50 transition-all duration-500 relative ${isVisibilityBlocked ? 'opacity-60 grayscale-[30%]' : 'group-hover:shadow-xl group-hover:-translate-y-1'}`}>
                        {variant?.image ? (
                          <Image
                            data={variant.image}
                            alt={variant.image?.altText || product.title || 'Product Thumbnail'}
                            loading="lazy"
                            aspectRatio="1/1"
                            sizes="(min-width: 45em) 25vw, 50vw"
                            className={`w-full h-full object-contain transition-transform duration-700 ${effectiveOutOfStock ? 'opacity-50 grayscale group-hover:scale-100' : 'group-hover:scale-110'}`}
                          />
                        ) : (
                          <div className="w-full h-full bg-[#FEF8EB] flex items-center justify-center">
                            <span className="text-gray-300">No image</span>
                          </div>
                        )}
                        {/* Visibility badge */}
                        {isVisibilityBlocked ? (
                          <div className="absolute top-4 right-4 z-10">
                            <span className={`text-[10px] font-black px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-1.5 ${visibility.status === 'scheduled' ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'}`}>
                              <span>{visibility.status === 'scheduled' ? '🕐' : '⛔'}</span>
                              {visibility.status === 'scheduled' ? 'قريباً' : 'غير متاح'}
                            </span>
                          </div>
                        ) : (product.productType?.toLowerCase() === 'bundle' || product.tags?.some((t: string) => t.toLowerCase() === 'bundle')) ? (
                          <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 items-end">
                            <span className="text-[10px] font-black px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-1.5 bg-blue-600 text-white">
                              <span>📦</span>
                              {isEn ? 'Bundle' : 'باقة'}
                            </span>
                            {product.tags?.some((t: string) => t.toLowerCase().includes('bogo')) && (
                              <span className="text-[10px] font-black px-3 py-1.5 rounded-xl shadow-sm bg-orange-500 text-white flex items-center gap-1.5 animate-pulse">
                                <span>🔥</span>
                                {isEn ? 'BOGO' : 'عرض خاص'}
                              </span>
                            )}
                          </div>
                        ) : product.tags?.some((t: string) => t.toLowerCase().includes('bogo')) ? (
                           <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 items-end">
                            <span className="text-[10px] font-black px-3 py-1.5 rounded-xl shadow-sm bg-orange-500 text-white flex items-center gap-1.5 animate-pulse">
                              <span>🔥</span>
                              {isEn ? 'BOGO' : 'عرض خاص'}
                            </span>
                          </div>
                        ) : isOutOfStock && (
                          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center z-10 px-4">
                            <span className="bg-red-500 text-white px-4 py-1.5 rounded-full font-bold text-[10px] tracking-wide shadow-sm uppercase text-center">
                              Not Available
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="text-center px-2">
                        {/* Availability / Visibility Tag */}
                        <div className={`flex items-center justify-center gap-1 text-[10px] font-medium mb-1 ${isVisibilityBlocked
                          ? (visibility.status === 'scheduled' ? 'text-amber-600' : 'text-red-500')
                          : (isOutOfStock ? 'text-red-500' : 'text-gray-400')
                          }`}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            {isVisibilityBlocked ? (
                              <path d="M12 2v10l4 4M12 22a10 10 0 100-20 10 10 0 000 20z" />
                            ) : isOutOfStock ? (
                              <path d="M18 6L6 18M6 6l12 12" />
                            ) : (
                              <path d="M20 6L9 17l-5-5" />
                            )}
                          </svg>
                          <span>
                            {isVisibilityBlocked
                              ? (isEn ? visibility.label.en : visibility.label.ar)
                              : isOutOfStock
                                ? (isEn ? `Not available at ${selectedLocationName || 'this branch'}` : `غير متوفر في ${selectedLocationName || 'هذا الفرع'}`)
                                : (isEn ? `Available at ${selectedLocationName || 'this branch'}` : `متوفر في ${selectedLocationName || 'هذا الفرع'}`)
                            }
                          </span>
                        </div>

                        <h4 className={`font-bold text-[#234745] text-lg mb-1 transition-colors duration-300 ${isVisibilityBlocked ? '' : 'group-hover:text-[#BBCFCD]'}`}>
                          {product.title}
                        </h4>

                        {/* Star Ratings UI */}
                        {product.rating?.value && (
                          <div className="flex items-center justify-center gap-1 mb-1.5">
                            <div className="flex text-[#FFC107] text-[10px]">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill={i < Math.round(parseFloat(product.rating.value)) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                </svg>
                              ))}
                            </div>
                            <span className="text-[10px] text-gray-400 font-medium">({product.ratingCount?.value || '0'})</span>
                          </div>
                        )}

                        {!isVisibilityBlocked && variant?.price && (
                          <div className="mb-4">
                            <Price data={variant.price} isEn={isEn} size="sm" />
                          </div>
                        )}

                        {isVisibilityBlocked && (
                          <span className={`text-xs font-bold ${visibility.status === 'scheduled' ? 'text-amber-600' : 'text-red-500'}`}>
                            {visibility.status === 'scheduled' ? 'قريباً' : 'غير متاح'}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })()}

                {/* JSON-LD Structured Data */}
                {typeof document !== 'undefined' && (
                  <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                      __html: JSON.stringify({
                        "@context": "https://schema.org/",
                        "@type": "Product",
                        "name": product.title,
                        "image": variant?.image?.url ? [variant.image.url] : [],
                        "description": `${product.title} by Saadeddin`,
                        "sku": variant?.sku || product.id,
                        "brand": {
                          "@type": "Brand",
                          "name": "Saadeddin"
                        },
                        "offers": {
                          "@type": "Offer",
                          "url": `${typeof window !== 'undefined' ? window.location.origin : ''}${isEn ? `/en/products/${product.handle}` : `/products/${product.handle}`}`,
                          "priceCurrency": variant?.price?.currencyCode || "SAR",
                          "price": variant?.price?.amount,
                          "availability": effectiveOutOfStock ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
                          "itemCondition": "https://schema.org/NewCondition"
                        },
                        ...(product.rating?.value && {
                            "aggregateRating": {
                                "@type": "AggregateRating",
                                "ratingValue": parseFloat(product.rating.value),
                                "reviewCount": parseInt(product.ratingCount?.value || '0', 10)
                            }
                        })
                      })
                    }}
                  />
                )}

                {/* Actions */}
                {!isVisibilityBlocked && (
                  <div className="mt-auto px-2 pb-4">
                    {isOutOfStock ? (
                      <button 
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleNotifyClick(product.title, variant?.id);
                        }}
                        className="w-full bg-amber-500 text-white py-3 rounded-2xl font-bold text-xs hover:bg-amber-600 transition-all flex items-center justify-center gap-2 cursor-pointer relative z-20"
                      >
                        🔔 {isEn ? 'Notify Me' : 'أبلغني'}
                      </button>
                    ) : (
                      <Link 
                        to={isEn ? `/en/products/${product.handle}` : `/products/${product.handle}`}
                        className="w-full bg-[#1b3d2e] text-white py-3 rounded-2xl font-bold text-xs hover:bg-[#2d5e4a] transition-all flex items-center justify-center gap-2"
                      >
                        {isEn ? 'View Product' : 'عرض المنتج'}
                      </Link>
                    )}
                  </div>
                )}
              </div>
            );
          });

          return (
            <div>
              <div className="flex justify-center mb-8">
                <PreviousLink className="text-[#234745] font-bold hover:underline">
                  {isLoading
                    ? (isEn ? 'Loading...' : 'جاري التحميل...')
                    : (isEn ? '↑ Load previous results' : '↑ تحميل النتائج السابقة')
                  }
                </PreviousLink>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                {itemsMarkup}
              </div>

              <div className="flex justify-center mt-12">
                <NextLink className="bg-white border-2 border-[#234745] text-[#234745] px-10 py-3 rounded-full font-bold hover:bg-[#234745] hover:text-white transition-all shadow-sm">
                  {isLoading
                    ? (isEn ? 'Loading...' : 'جاري التحميل...')
                    : (isEn ? 'Show More' : 'عرض المزيد')
                  }
                </NextLink>
              </div>

              {selectedProduct && (
                <StockNotificationModal 
                    isOpen={isNotifyModalOpen}
                    onClose={() => setIsNotifyModalOpen(false)}
                    productTitle={selectedProduct.title}
                    variantId={selectedProduct.variantId}
                    isEn={isEn}
                    customerEmail={customerEmail}
                    locationId={selectedLocationId}
                    locationName={selectedLocationName}
                />
              )}
            </div>
          );
        }}
      </Pagination>
    </div>
  );
}

function SearchResultPageGrid({ pages }: Pick<SearchQuery, 'pages'>) {
  return (
    <div className="search-result">
      <h2>Pages</h2>
      <div>
        {pages?.nodes?.map((page) => (
          <div className="search-results-item" key={page.id}>
            <Link prefetch="intent" to={`/pages/${page.handle}`}>
              {page.title}
            </Link>
          </div>
        ))}
      </div>
      <br />
    </div>
  );
}

function SearchResultArticleGrid({ articles }: Pick<SearchQuery, 'articles'>) {
  return (
    <div className="search-result">
      <h2>Articles</h2>
      <div>
        {articles?.nodes?.map((article) => (
          <div className="search-results-item" key={article.id}>
            <Link prefetch="intent" to={`/blog/${article.handle}`}>
              {article.title}
            </Link>
          </div>
        ))}
      </div>
      <br />
    </div>
  );
}

export function NoSearchResults({ searchTerm }: { searchTerm: string }) {
  const rootData = useRouteLoaderData('root') as { locale?: string };
  const locale = rootData?.locale || 'ar';
  const isEn = locale === 'en';

  // Popular search suggestions
  const popularSuggestions = isEn 
    ? ['Cakes', 'Chocolate', 'Baklava', 'Gifts', 'Coffee']
    : ['كيك', 'شوكولاتة', 'بقلاوة', 'هدايا', 'قهوة'];

  return (
    <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-gray-100 shadow-inner relative overflow-hidden" dir={isEn ? 'ltr' : 'rtl'}>
      {/* Decorative background circle */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#234745]/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_0_10px_rgba(254,242,242,0.5)]">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="9" y1="9" x2="13" y2="13" /><line x1="13" y1="9" x2="9" y2="13" /></svg>
      </div>
      <h2 className="relative z-10 text-3xl font-black text-[#234745] mb-4">
        {searchTerm ? (isEn ? 'No results found' : 'لم نجد أي نتائج') : (isEn ? 'Start searching' : 'ابدأ البحث')}
      </h2>
      <p className="relative z-10 text-gray-500 max-w-md mx-auto mb-10 text-lg">
        {searchTerm
          ? (isEn ? `Sorry, we couldn't find any products matching "${searchTerm}". Try checking your spelling or using more general terms.` : `عذراً، لم نتمكن من العثور على أي منتج يطابق "${searchTerm}". جرب البحث بكلمات مختلفة أو عامة أكثر.`)
          : (isEn ? 'Search for your favorite sweets, cakes, or chocolates.' : 'ابدأ البحث عن حلوياتك المفضلة، الكيك، أو الشوكولاته الفاخرة.')
        }
      </p>

      {/* Popular Suggestions */}
      <div className="relative z-10 mb-12">
        <p className="text-sm font-bold tracking-widest uppercase text-gray-400 mb-4">
          {isEn ? 'Popular Searches' : 'عمليات بحث شائعة'}
        </p>
        <div className="flex flex-wrap justify-center gap-3 max-w-lg mx-auto">
          {popularSuggestions.map((suggestion) => (
            <Link 
              key={suggestion}
              to={`/search?q=${encodeURIComponent(suggestion)}`}
              className="px-5 py-2.5 bg-gray-50 hover:bg-[#234745] text-[#234745] hover:text-white border border-gray-100 font-bold rounded-xl transition-all active:scale-95 text-sm"
            >
              {suggestion}
            </Link>
          ))}
        </div>
      </div>

      <div className="relative z-10">
        <Link
          to={isEn ? "/en" : "/"}
          className="inline-flex items-center gap-3 bg-[#234745] text-white px-8 py-3.5 rounded-2xl font-bold hover:bg-[#1b3d2e] transition-all shadow-lg hover:shadow-xl active:scale-95"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={isEn ? '' : 'rotate-180'}><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          {isEn ? 'Back to Shop' : 'العودة للتسوق'}
        </Link>
      </div>
    </div>
  );
}

type ChildrenRenderProps = {
  fetchResults: (event: React.ChangeEvent<HTMLInputElement>) => void;
  fetcher: ReturnType<typeof useFetcher<NormalizedPredictiveSearchResults>>;
  inputRef: React.MutableRefObject<HTMLInputElement | null>;
};

type SearchFromProps = {
  action?: FormProps['action'];
  method?: FormProps['method'];
  className?: string;
  children: (passedProps: ChildrenRenderProps) => React.ReactNode;
  [key: string]: unknown;
};

/**
 *  Search form component that posts search requests to the `/search` route
 **/
export function PredictiveSearchForm({
  action,
  children,
  className = 'predictive-search-form',
  method = 'GET',
  ...props
}: SearchFromProps) {
  const params = useParams();
  const fetcher = useFetcher<NormalizedPredictiveSearchResults>();
  const inputRef = useRef<HTMLInputElement | null>(null);

  function fetchResults(event: React.ChangeEvent<HTMLInputElement>) {
    const searchAction = action ?? '/predictive-search';
    const localizedAction = params.locale
      ? `/${params.locale}${searchAction}`
      : searchAction;
    const newSearchTerm = event.target.value || '';
    fetcher.submit(
      { q: newSearchTerm, limit: '6' },
      { method, action: localizedAction },
    );
  }

  // ensure the passed input has a type of search, because SearchResults
  // will select the element based on the input
  useEffect(() => {
    inputRef?.current?.setAttribute('type', 'search');
  }, []);

  return (
    <fetcher.Form
      {...props}
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!inputRef?.current || inputRef.current.value === '') {
          return;
        }
        inputRef.current.blur();
      }}
    >
      {children({ fetchResults, inputRef, fetcher })}
    </fetcher.Form>
  );
}

export function PredictiveSearchResults({ onClose }: { onClose?: () => void }) {
  const { results, totalResults, searchInputRef, searchTerm } =
    usePredictiveSearch();

  function goToSearchResult(event: React.MouseEvent<HTMLAnchorElement>) {
    if (!searchInputRef.current) return;
    searchInputRef.current.blur();
    searchInputRef.current.value = '';
    onClose?.();
  }

  if (!totalResults) {
    return <NoPredictiveSearchResults searchTerm={searchTerm} />;
  }
  return (
    <div className="predictive-search-results">
      <div>
        {results.map(({ type, items }) => (
          <PredictiveSearchResult
            goToSearchResult={goToSearchResult}
            items={items}
            key={type}
            onClose={onClose}
            searchTerm={searchTerm}
            type={type}
          />
        ))}
      </div>
      {/* view all results /search?q=term */}
      {searchTerm.current && (
        <Link onClick={goToSearchResult} to={`/search?q=${searchTerm.current}`}>
          <p>
            View all results for <q>{searchTerm.current}</q>
            &nbsp; →
          </p>
        </Link>
      )}
    </div>
  );
}

function NoPredictiveSearchResults({ searchTerm }: { searchTerm: React.MutableRefObject<string> }) {
  const rootData = useRouteLoaderData('root') as { locale?: string };
  const locale = rootData?.locale || 'ar';
  if (!searchTerm.current) return null;
  return (
    <p dir={locale === 'en' ? 'ltr' : 'rtl'}>
      {locale === 'en' ? 'No results found for ' : 'لا توجد نتائج لـ '}
      <q>{searchTerm.current}</q>
    </p>
  );
}

type SearchResultTypeProps = {
  goToSearchResult: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  items: NormalizedPredictiveSearchResultItem[];
  searchTerm: UseSearchReturn['searchTerm'];
  type: NormalizedPredictiveSearchResults[number]['type'];
};

function PredictiveSearchResult({ goToSearchResult, items, searchTerm, type }: SearchResultTypeProps) {
  const rootData = useRouteLoaderData('root') as { locale?: string };
  const locale = rootData?.locale || 'ar';
  const isEn = locale === 'en';

  const isSuggestions = type === 'queries';
  // Ensure the category URL includes the locale
  const categoryUrl = `${isEn ? '/en' : ''}/search?q=${searchTerm.current}&type=${pluralToSingularSearchType(type)}`;

  // Simple mapping for headers
  const displayType = isSuggestions
    ? (isEn ? 'Suggestions' : 'اقتراحات')
    : (isEn ? type : (type === 'products' ? 'المنتجات' : type));

  return (
    <div className="predictive-search-result" key={type} dir={isEn ? 'ltr' : 'rtl'}>
      <Link prefetch="intent" to={categoryUrl} onClick={goToSearchResult}>
        <h5>{displayType}</h5>
      </Link>
      <ul>
        {items.map((item: NormalizedPredictiveSearchResultItem) => (
          <SearchResultItem
            goToSearchResult={goToSearchResult}
            item={item}
            key={item.id}
          />
        ))}
      </ul>
    </div>
  );
}

type SearchResultItemProps = Pick<SearchResultTypeProps, 'goToSearchResult'> & {
  item: NormalizedPredictiveSearchResultItem;
};

function SearchResultItem({ goToSearchResult, item }: SearchResultItemProps) {
  const rootData = useRouteLoaderData('root') as { locale?: string };
  const locale = rootData?.locale || 'ar';
  const isEn = locale === 'en';

  return (
    <li className="predictive-search-result-item" key={item.id}>
      <Link onClick={goToSearchResult} to={item.url}>
        {item.image?.url && (
          <Image
            alt={item.image.altText || item.title || 'Search Result'}
            src={item.image.url}
            width={50}
            height={50}
            loading="lazy"
          />
        )}
        <div>
          {item.styledTitle ? (
            <div
              dangerouslySetInnerHTML={{
                __html: item.styledTitle,
              }}
            />
          ) : (
            <span>{item.title}</span>
          )}
          {item?.price && (
            <div className="mt-1">
              <Price data={item.price} isEn={isEn} size="xs" />
            </div>
          )}
        </div>
      </Link>
    </li>
  );
}

type UseSearchReturn = NormalizedPredictiveSearch & {
  searchInputRef: React.MutableRefObject<HTMLInputElement | null>;
  searchTerm: React.MutableRefObject<string>;
};

function usePredictiveSearch(): UseSearchReturn {
  const fetchers = useFetchers();
  const searchTerm = useRef<string>('');
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchFetcher = fetchers.find((fetcher) => fetcher.data?.searchResults);

  if (searchFetcher?.state === 'loading') {
    searchTerm.current = (searchFetcher.formData?.get('q') || '') as string;
  }

  const search = (searchFetcher?.data?.searchResults || {
    results: NO_PREDICTIVE_SEARCH_RESULTS,
    totalResults: 0,
  }) as NormalizedPredictiveSearch;

  // capture the search input element as a ref
  useEffect(() => {
    if (searchInputRef.current) return;
    searchInputRef.current = document.querySelector('input[type="search"]');
  }, []);

  return { ...search, searchInputRef, searchTerm };
}

/**
 * Converts a plural search type to a singular search type
 * @param type - The plural search type
 * @returns The singular search type
 *
 * @example
 * ```ts
 * pluralToSingularSearchType('articles') // => 'ARTICLE'
 * pluralToSingularSearchType(['articles', 'products']) // => 'ARTICLE,PRODUCT'
 * ```
 */
function pluralToSingularSearchType(
  type:
    | NormalizedPredictiveSearchResults[number]['type']
    | Array<NormalizedPredictiveSearchResults[number]['type']>,
) {
  const plural = {
    articles: 'ARTICLE',
    collections: 'COLLECTION',
    pages: 'PAGE',
    products: 'PRODUCT',
    queries: 'QUERY',
  };

  if (typeof type === 'string') {
    return (plural as any)[type];
  }

  return type.map((t) => (plural as any)[t]).join(',');
}
