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
import { ProductItem } from './ProductItem';
import { useAside } from './Aside';

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
  const rootData = useRouteLoaderData('root') as any;
  const locale = rootData?.consent?.language?.toLowerCase() || 'ar';
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
    <Form method="get" className="relative w-full group" dir={isEn ? 'ltr' : 'rtl'}>
      <input
        defaultValue={searchTerm}
        name="q"
        placeholder={isEn ? "Search..." : "شوكولاته..."}
        ref={inputRef}
        type="search"
        className={`w-full bg-white shadow-sm rounded-[25px] py-[12px] pl-6 pr-14 text-[16px] font-bold placeholder:text-gray-400 focus:outline-none transition-all duration-300 ${isEn ? 'font-en' : "font-['GE_Dinar_One']"}`}
      />
      
      {/* Clear Button (native search clear button might show, but let's hide the submit button) */}
      <button
        type="submit"
        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#234745] transition-colors p-2"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
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

          if (resourceResults.nodes[0]?.__typename === 'Product') {
            const productResults = resourceResults as SearchQuery['products'];
            return resourceResults.nodes.length ? (
              <SearchResultsProductsGrid
                key="products"
                products={productResults}
              />
            ) : null;
          }

          return null;
        })}
    </div>
  );
}


function SearchResultsProductsGrid({ products }: Pick<SearchQuery, 'products'>) {
  const rootData = useRouteLoaderData('root') as any;
  const locale = rootData?.consent?.language?.toLowerCase() || 'ar';
  const isEn = locale === 'en';

  return (
    <div className="mb-16" dir={isEn ? 'ltr' : 'rtl'}>

      <Pagination connection={products}>
        {({ nodes, isLoading, NextLink, PreviousLink }) => {
          return (
            <>
              <div className="flex justify-center mb-8">
                <PreviousLink className="text-[#234745] font-black border-2 border-[#234745]/10 px-8 py-2.5 rounded-full hover:bg-gray-50 transition-all">
                  {isLoading ? (isEn ? 'Loading...' : 'جاري التحميل...') : (isEn ? '↑ Load Previous' : '↑ تحميل النتائج السابقة')}
                </PreviousLink>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6 lg:gap-8">
                {nodes.map((product) => (
                  <ProductItem 
                    key={product.id} 
                    product={product} 
                    view="grid"
                  />
                ))}
              </div>
              <div className="flex justify-center mt-12">
                <NextLink className="bg-[#234745] text-white px-16 py-4 rounded-full font-black shadow-[0_10px_30_rgba(27,61,46,0.3)] hover:shadow-[0_15px_40px_rgba(27,61,46,0.4)] hover:-translate-y-1 transition-all duration-300">
                  {isLoading ? (isEn ? 'Loading...' : 'جاري التحميل...') : (isEn ? 'Browse More ↓' : 'تصفح المزيد ↓')}
                </NextLink>
              </div>
            </>
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
  const rootData = useRouteLoaderData('root') as any;
  const locale = rootData?.consent?.language?.toLowerCase() || 'ar';
  const isEn = locale === 'en';

  // Popular search suggestions
  const popularSuggestions = isEn 
    ? ['Cakes', 'Chocolate', 'Baklava', 'Gifts', 'Coffee']
    : ['كيك', 'شوكولاتة', 'بقلاوة', 'هدايا', 'قهوة'];

  return (
    <div className={`text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-gray-100 shadow-inner relative overflow-hidden ${isEn ? 'font-en' : "font-['GE_Dinar_One']"}`} dir={isEn ? 'ltr' : 'rtl'}>
      {/* Decorative background circle */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#234745]/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative z-10 w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_0_10px_rgba(254,242,242,0.5)]">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="9" y1="9" x2="13" y2="13" /><line x1="13" y1="9" x2="9" y2="13" /></svg>
      </div>
      <h2 className="relative z-10 text-3xl font-black text-[#234745] mb-4">
        {searchTerm ? (isEn ? 'No results found' : 'لم نجد أي نتائج') : (isEn ? 'Start searching' : 'ابدأ البحث')}
      </h2>
      <div className="relative z-10 flex justify-center mb-10">
        <p className="text-gray-500 max-w-lg text-lg leading-relaxed" style={{ textAlign: 'center' }}>
          {searchTerm
            ? (isEn ? `Sorry, we couldn't find any products matching "${searchTerm}". Try checking your spelling or using more general terms.` : `عذراً، لم نتمكن من العثور على أي منتج يطابق "${searchTerm}". جرب البحث بكلمات مختلفة أو عامة أكثر.`)
            : (isEn ? 'Search for your favorite sweets, cakes, or chocolates.' : 'ابدأ البحث عن حلوياتك المفضلة، الكيك، أو الشوكولاته الفاخرة.')
          }
        </p>
      </div>

      {/* Popular Suggestions */}
      <div className="relative z-10 mb-12">
        <p className="text-sm font-bold tracking-widest uppercase text-gray-400 mb-4" style={{ textAlign: 'center' }}>
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

      <div className="relative z-10 flex justify-center">
        <Link
          to={isEn ? "/en" : "/"}
          className="inline-flex items-center gap-3 bg-[#234745] !text-white px-8 py-3.5 rounded-2xl font-bold hover:bg-[#234745] transition-all shadow-lg hover:shadow-xl active:scale-95"
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
  const rootData = useRouteLoaderData('root') as any;
  const locale = rootData?.consent?.language?.toLowerCase() || 'ar';
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
  const rootData = useRouteLoaderData('root') as any;
  const locale = rootData?.consent?.language?.toLowerCase() || 'ar';
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
  const rootData = useRouteLoaderData('root') as any;
  const locale = rootData?.consent?.language?.toLowerCase() || 'ar';
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
