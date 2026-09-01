import {
  data,
  type LoaderFunctionArgs,
  useLoaderData,
  Link,
  useRouteLoaderData,
  useNavigate,
  useSearchParams,
  useSubmit,
  useLocation,
} from 'react-router';
import {getPaginationVariables, Pagination, Image} from '@shopify/hydrogen';
import {ProductItem} from '~/components/ProductItem';
import {useState, useEffect, useRef, Fragment} from 'react';
import {createPortal} from 'react-dom';
import patternBg from '/images/second-bg-pattern.svg';
import {getShopTitle} from '~/lib/seo';
import {SaudiRiyalSymbol} from '~/components/Price';
import type {Route} from './+types/($locale).collections.all';

export const meta: Route.MetaFunction = ({matches}) => {
  return [{title: getShopTitle('All Products', matches)}];
};

/**
 * Turn what the shopper typed into a Shopify search query.
 *
 * Shopify matches whole tokens, so a bare term finds nothing until the word is
 * complete: "kunafa" returned 24 products while "kun" returned none, and a
 * single "k" looked like a broken search box. Appending `*` asks for prefix
 * matching, which is what anyone typing into a search field expects.
 *
 * The text is also sanitised — it used to be interpolated straight into the
 * query, so a stray quote or parenthesis produced a syntax error and an empty
 * result set rather than a search.
 */
function buildTermQuery(raw: string): string {
  const cleaned = raw
    // Characters that carry meaning in Shopify's search grammar.
    .replace(/["'()\[\]{}:\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return '*';

  return cleaned
    .split(' ')
    // A term already ending in * is left alone; everything else gets prefix
    // matching. Bare operators would be read as syntax, so they are quoted out.
    .map((term) => {
      if (/^(AND|OR|NOT)$/i.test(term)) return `"${term}"`;
      return term.endsWith('*') ? term : `${term}*`;
    })
    .join(' ');
}

export async function loader({context, request}: LoaderFunctionArgs) {
  const {storefront} = context;
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 12,
  });

  const filters: any[] = [];
  searchParams.forEach((value, key) => {
    if (key.startsWith('filter.')) {
      const parts = key.split('.');
      if (parts[2] === 'price') {
        if (!parts[3]) {
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
      } else if (key.startsWith('filter.p.m.')) {
        const namespace = parts[3];
        const k = parts[4];
        filters.push({
          productMetafield: {namespace, key: k, value},
        });
      }
    }
  });

  let sortKey = searchParams.get('sortKey') || 'RELEVANCE';
  if (sortKey !== 'RELEVANCE' && sortKey !== 'PRICE') {
    sortKey = 'RELEVANCE';
  }
  const reverse = searchParams.get('reverse') === 'true';
  const activeTags = searchParams
    .getAll('filter.p.tag')
    .concat(searchParams.getAll('tag'));
  let q = searchParams.get('q') || '';
  if (q === '*') q = '';

  const selectedCategories = searchParams.getAll('category');

  // Build unified search query
  const queryParts: string[] = [];
  if (q && q !== '*') {
    queryParts.push(`(${buildTermQuery(q)})`);
  }
  if (activeTags.length > 0) {
    const tagQueries = activeTags.map((t) => `tag:"${t}"`).join(' OR ');
    queryParts.push(`(${tagQueries})`);
  }
  if (selectedCategories.length > 0) {
    const catQueries = selectedCategories
      .map((c) => `tag:"${c}"`)
      .join(' OR ');
    queryParts.push(`(${catQueries})`);
  }
  const searchQueryString =
    queryParts.length > 0 ? queryParts.join(' AND ') : '*';

  try {
    const response = await storefront.query(CATALOG_QUERY, {
      variables: {
        ...paginationVariables,
        query: searchQueryString,
        filters: filters.length > 0 ? filters : undefined,
        sortKey: sortKey as any,
        reverse,
        country: storefront.i18n.country,
        language: storefront.i18n.language,
      },
      cache: storefront.CacheShort(),
    });

    let products = response.search;

    // Strictly filter products by activeTags if specified
    if (products?.nodes?.length && activeTags.length > 0) {
      const lowerActiveTags = activeTags.map((t) => t.toLowerCase().trim());
      products.nodes = products.nodes.filter((p: any) => {
        const pTags = (p.tags || []).map((t: string) => String(t).toLowerCase().trim());
        return lowerActiveTags.some((at) =>
          pTags.some((pt) => pt === at || pt.includes(at) || at.includes(pt)),
        );
      });
      // These tags are filtered here, not by Shopify, so its totalCount counts
      // products this page has just removed. Better no number than a wrong one.
      (products as any).totalCount = undefined;
    }

    // Fallback if category search query returned no results: fetch directly from collection handles
    if (
      selectedCategories.length > 0 &&
      (!products || products.nodes.length === 0)
    ) {
      try {
        const collectionPromises = selectedCategories.map((handle) =>
          storefront.query(COLLECTION_FILTER_QUERY, {
            variables: {
              handle,
              filters: filters.length > 0 ? filters : undefined,
              country: storefront.i18n.country,
              language: storefront.i18n.language,
            },
            cache: storefront.CacheShort(),
          }),
        );

        const results = await Promise.all(collectionPromises);
        let mergedNodes: any[] = [];
        const seenIds = new Set();

        results.forEach((res: any) => {
          if (res.collection?.products?.nodes) {
            res.collection.products.nodes.forEach((node: any) => {
              if (!seenIds.has(node.id)) {
                seenIds.add(node.id);
                mergedNodes.push(node);
              }
            });
          }
        });

        if (q && q !== '*') {
          const searchLower = q.toLowerCase();
          mergedNodes = mergedNodes.filter((n) =>
            n.title.toLowerCase().includes(searchLower),
          );
        }

        // Sort full merged list by price if requested BEFORE paginating
        if (mergedNodes.length > 0 && sortKey === 'PRICE') {
          mergedNodes.sort((a: any, b: any) => {
            const priceA = parseFloat(
              a.priceRange?.minVariantPrice?.amount || '0',
            );
            const priceB = parseFloat(
              b.priceRange?.minVariantPrice?.amount || '0',
            );
            return reverse ? priceB - priceA : priceA - priceB;
          });
        }

        // Sliced pagination for in-memory merged nodes
        const pageBy = 12;
        const cursorParam = searchParams.get('cursor');
        let offset = 0;
        if (cursorParam) {
          try {
            const parsed = JSON.parse(atob(cursorParam));
            if (typeof parsed.offset === 'number') offset = parsed.offset;
          } catch (e) {}
        }

        const paginatedNodes = mergedNodes.slice(offset, offset + pageBy);
        const hasNextPage = offset + pageBy < mergedNodes.length;
        const hasPreviousPage = offset > 0;
        const nextOffset = offset + pageBy;
        const nextCursor = hasNextPage
          ? btoa(JSON.stringify({offset: nextOffset}))
          : null;
        const prevOffset = Math.max(0, offset - pageBy);
        const prevCursor = hasPreviousPage
          ? btoa(JSON.stringify({offset: prevOffset}))
          : null;

        products = {
          ...products,
          // Whole merged list, before slicing to the current page.
          totalCount: mergedNodes.length,
          nodes: paginatedNodes,
          pageInfo: {
            hasNextPage,
            hasPreviousPage,
            startCursor: prevCursor,
            endCursor: nextCursor,
          },
        };
      } catch (e) {
        console.error('Failed to fetch collections', e);
      }
    }

    if (!response.search) {
      return data({
        products: null,
        collections: null,
        error: 'GraphQL query returned null. ' + JSON.stringify(response),
      });
    }

    return data({
      products,
      collections: response.collections?.nodes || [],
      error: null,
    });
  } catch (e: any) {
    return data({
      products: null,
      collections: null,
      error: e.message || String(e),
    });
  }
}

const COLLECTION_FILTER_QUERY = `#graphql
  fragment FilterProductItem on Product {
    id
    handle
    title
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
    availableForSale
    variants(first: 10) {
      nodes {
        id
        title
        availableForSale
        quantityAvailable
        selectedOptions {
          name
          value
        }
        price {
          amount
          currencyCode
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
    tags
    bogo_free_item: metafield(namespace: "custom", key: "bogo_free_item") {
      value
      reference {
        ... on ProductVariant {
          id
        }
      }
    }
  }
  query CollectionFilter(
    $handle: String!
    $filters: [ProductFilter!]
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      products(first: 100, filters: $filters) {
        nodes {
          ...FilterProductItem
        }
      }
    }
  }
` as const;

export default function CollectionAll() {
  const {products, collections, error} = useLoaderData<typeof loader>();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [searchParams, setSearchParams] = useSearchParams();

  if (!products) {
    return (
      <div className="p-20 text-center font-bold">
        Failed to load products or no products found. <br />
        <span className="text-red-500">{error}</span>
      </div>
    );
  }
  const q = searchParams.get('q')?.toLowerCase() || '';
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const rootData = useRouteLoaderData('root') as any;
  const locale = rootData?.locale || 'ar';
  const isEn = locale === 'en';

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="collection-page" dir={isEn ? 'ltr' : 'rtl'}>
      <CollectionAllHero
        title={isEn ? 'All Products' : 'جميع المنتجات'}
        productsCount={
          (products as any)?.totalCount ?? products.nodes?.length ?? 0
        }
        isEn={isEn}
      />

      <div className="bg-white border-b border-gray-100">
        <div className="px-4 md:px-8 lg:px-12 py-4 max-w-[1440px] mx-auto text-right text-[16px] font-black flex items-center gap-2 font-medium font-['GE_Dinar_One']">
          <span className="text-[#7d7d7d] text-500">
            {isEn ? 'Home' : 'الرئيسية'}
          </span>
          <span className="text-gray-300">/</span>
          <span className="text-[#171717]-800">
            {isEn ? 'All Products' : 'جميع المنتجات'}
          </span>
        </div>
      </div>

      <div className="bg-[#FEF8EB] min-h-screen">
        <div className="px-4 md:px-8 lg:px-12 py-10 max-w-[1440px] mx-auto text-right">
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* Desktop Filter Sidebar (Right side in RTL, Left side in LTR) */}
            <div className="hidden lg:block w-72 shrink-0">
              <FilterSidebar
                filters={products.productFilters}
                collections={collections || []}
                onClose={() => {}}
                isDesktop={true}
                isEn={isEn}
              />
            </div>

            <div className="flex-1 min-w-0 w-full">
              {/* Mobile Layout Controls (< lg) */}
              <div
                className="lg:hidden flex flex-col gap-4 mb-2"
                dir={isEn ? 'ltr' : 'rtl'}
              >
                {/* Row 1: Filter button on right (RTL start), Sort on left (RTL end) */}
                <div className="flex items-center justify-between w-full gap-2">
                  {/* Filter Button */}
                  <button
                    type="button"
                    onClick={() => setIsFilterOpen(true)}
                    className="flex items-center gap-2 px-2 py-2 bg-white border border-[#BBCFCD]/50 text-[#234745] rounded-[6px] font-medium hover:bg-gray-50 transition-all md:text-[14px] shrink-0"
                    style={{
                      fontFamily: !isEn
                        ? "'GE Dinar One', sans-serif"
                        : undefined,
                    }}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-[#234745] shrink-0"
                    >
                      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                    </svg>
                    <span>{isEn ? 'Filter' : 'تصفية'}</span>
                  </button>

                  {/* Sort by Dropdown */}
                  <div className="flex items-center gap-1">
                    <span
                      className="text-[#BBCFCD] text-[12px] md:text-[16px] font-normal md:font-medium whitespace-nowrap"
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

                {/* Row 2: Active Filter Chips */}
                <div className="flex flex-wrap items-center gap-2.5 justify-start w-full">
                  <ActiveFilterChips isEn={isEn} collections={collections} />
                </div>
              </div>

              {/* Desktop Layout Controls (hidden on mobile, visible on lg) */}
              <div
                className={`hidden lg:flex ${isEn ? 'flex-row' : 'flex-row-reverse'} items-center justify-between gap-4 mb-4 w-full`}
                dir={isEn ? 'ltr' : 'rtl'}
              >
                {/* Sort Dropdown (Left side in RTL) */}
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
                      className={`absolute ${isEn ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#234745] pointer-events-none`}
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

                {/* Active Filter Chips (Right side in RTL) */}
                <div className="flex-1 flex flex-wrap items-center gap-2.5 justify-start">
                  <ActiveFilterChips isEn={isEn} collections={collections} />
                </div>
              </div>

              <Pagination connection={products}>
                {({nodes, isLoading, PreviousLink, NextLink}) => {
                  const filteredNodes = nodes.filter((n: any) => {
                    if (q && !n.title.toLowerCase().includes(q)) return false;
                    const pTags = (n.tags || []).map((t: string) =>
                      t.toLowerCase(),
                    );
                    if (
                      pTags.includes('corporate') ||
                      pTags.includes('b2b') ||
                      pTags.includes('package')
                    )
                      return false;
                    return true;
                  });

                  return (
                    <>
                      {filteredNodes.length === 0 && (
                        <div className="py-12 text-center text-[#234745] font-bold text-lg w-full">
                          {isEn
                            ? 'No products match your search.'
                            : 'لا توجد منتجات تطابق بحثك.'}
                        </div>
                      )}
                      <ProductsGrid products={filteredNodes} view={view} />
                      <div className="flex justify-center mt-16">
                        <NextLink className="px-12 py-4 rounded-full border-2 border-[#234745] !text-[#234745] [font-family:'GE_Dinar_One',sans-serif] font-bold text-[15px] lg:text-[18px] transition-all hover:bg-[#1a3533] hover:!text-white hover:border-[#1a3533] active:scale-95">
                          {isLoading ? (
                            isEn ? (
                              'Loading...'
                            ) : (
                              'جاري التحميل...'
                            )
                          ) : (
                            <span>
                              {isEn ? 'Browse More ↓' : 'تصفح المزيد'}
                            </span>
                          )}
                        </NextLink>
                      </div>
                    </>
                  );
                }}
              </Pagination>
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
                filters={products.productFilters}
                collections={collections || []}
                onClose={() => setIsFilterOpen(false)}
                isEn={isEn}
              />
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function CollectionAllHero({
  title,
  productsCount,
  isEn,
}: {
  title: string;
  productsCount: number;
  isEn: boolean;
}) {
  return (
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
      <div className="relative z-10 w-full max-w-[1440px] mx-auto px-4 md:px-8 lg:px-12 flex items-center justify-between">
        {/* Right Side: Title and Back Button */}
        <div
          className={`flex flex-col ${isEn ? 'items-start' : 'items-end'} gap-[8px]`}
        >
          <div
            className="flex items-center gap-2 md:gap-4"
            dir={isEn ? 'ltr' : 'rtl'}
          >
            <button
              onClick={() => {
                if (typeof window !== 'undefined') window.history.back();
              }}
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
              <span>{isEn ? 'Back' : 'رجوع'}</span>
            </button>
            <h1
              className={`!text-[16px] md:!text-[38px] font-bold text-white drop-shadow-sm ${isEn ? 'text-left font-en' : 'text-right'}`}
              style={
                isEn
                  ? {}
                  : {fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif"}
              }
              dir={isEn ? 'ltr' : 'rtl'}
            >
              {title}
            </h1>
          </div>
        </div>

        {/* Left Side in RTL (Second child): Product Count */}
        <div
          className={`bg-[#FEF8EB] text-[#234745] px-4 py-2 md:px-6 md:py-2 rounded-[25px] text-[12px] md:text-[18px] font-bold shadow-sm shrink-0 ${isEn ? 'font-en' : ''}`}
          style={
            isEn
              ? {}
              : {fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif"}
          }
        >
          <span className="font-en">{productsCount}</span>{' '}
          {isEn ? 'Products' : 'منتجات'}
        </div>
      </div>
    </section>
  );
}

export function ActiveFilterChips({
  isEn,
  collections,
}: {
  isEn: boolean;
  collections?: any[];
}) {
  const location = useLocation();
  const submit = useSubmit();
  const [params, setParams] = useState<URLSearchParams | null>(null);

  useEffect(() => {
    setParams(new URLSearchParams(location.search));
  }, [location.search]);

  if (!params) return null;

  const chips: {id: string; key: string; value: string; label: React.ReactNode}[] = [];
  params.forEach((value, key) => {
    if (
      key === 'q' ||
      key === 'cursor' ||
      key === 'sortKey' ||
      key === 'reverse' ||
      key === 'category' ||
      key === 'direction' ||
      key === 'next' ||
      key === 'previous' ||
      value === 'next' ||
      value === 'previous'
    )
      return;

    let label: React.ReactNode = value;
    if (key === 'filter.v.price') {
      try {
        const parsed = JSON.parse(value) as any;
        if (parsed.gte !== undefined && parsed.lte !== undefined) {
          label = isEn ? (
            `Price: ${parsed.gte} - ${parsed.lte} SAR`
          ) : (
            <span className="inline-flex items-center gap-1">
              <span>
                السعر: {parsed.gte} - {parsed.lte}
              </span>
              <SaudiRiyalSymbol className="h-3 w-auto text-[#234745]" />
            </span>
          );
        } else if (parsed.gte !== undefined) {
          label = isEn ? (
            `Price: Over ${parsed.gte} SAR`
          ) : (
            <span className="inline-flex items-center gap-1">
              <span>السعر: أكثر من {parsed.gte}</span>
              <SaudiRiyalSymbol className="h-3 w-auto text-[#234745]" />
            </span>
          );
        } else if (parsed.lte !== undefined) {
          label = isEn ? (
            `Price: Under ${parsed.lte} SAR`
          ) : (
            <span className="inline-flex items-center gap-1">
              <span>السعر: أقل من {parsed.lte}</span>
              <SaudiRiyalSymbol className="h-3 w-auto text-[#234745]" />
            </span>
          );
        }
      } catch (e) {}
    } else if (key === 'filter.v.availability') {
      if (value === 'true' || value === '1') {
        label = isEn ? 'In stock' : 'متوفر';
      } else {
        label = isEn ? 'Out of stock' : 'غير متوفر';
      }
    } else if (
      key.startsWith('filter.v.option.') ||
      key === 'filter.p.tag' ||
      key === 'tag'
    ) {
      const lowerVal = String(value).toLowerCase().trim();
      const localValueTranslation: {[key: string]: {ar: string; en: string}} = {
        'in stock': {ar: 'متوفر', en: 'In stock'},
        'out of stock': {ar: 'غير متوفر', en: 'Out of stock'},
        true: {ar: 'نعم', en: 'Yes'},
        false: {ar: 'لا', en: 'No'},
        yes: {ar: 'نعم', en: 'Yes'},
        no: {ar: 'لا', en: 'No'},
        'gluten free': {ar: 'خالي من الجلوتين', en: 'Gluten-Free'},
        'gluten-free': {ar: 'خالي من الجلوتين', en: 'Gluten-Free'},
        gluten_free: {ar: 'خالي من الجلوتين', en: 'Gluten-Free'},
        'خالي من الجلوتين': {ar: 'خالي من الجلوتين', en: 'Gluten-Free'},
        vegan: {ar: 'مناسب للنباتيين', en: 'Vegan / Vegetarian'},
        vegetarian: {ar: 'مناسب للنباتيين', en: 'Vegan / Vegetarian'},
        'مناسب للنباتيين': {ar: 'مناسب للنباتيين', en: 'Vegan / Vegetarian'},
        healthy: {ar: 'منتجات صحية', en: 'Healthy Products'},
        'منتجات صحية': {ar: 'منتجات صحية', en: 'Healthy Products'},
        'sugar-free': {ar: 'خالي من السكر', en: 'Sugar-Free'},
        sugar_free: {ar: 'خالي من السكر', en: 'Sugar-Free'},
        'خالي من السكر': {ar: 'خالي من السكر', en: 'Sugar-Free'},
        'low-fat': {ar: 'قليل الدهون', en: 'Low-Fat'},
        low_fat: {ar: 'قليل الدهون', en: 'Low-Fat'},
        'قليل الدهون': {ar: 'قليل الدهون', en: 'Low-Fat'},
        eid: {ar: 'عيد الفطر والاضحي', en: 'Eid Al-Fitr & Al-Adha'},
        ramadan: {ar: 'رمضان', en: 'Ramadan'},
        birthdays: {ar: 'أعياد الميلاد', en: 'Birthdays'},
        wedding: {ar: 'زفاف وخطوبة', en: 'Wedding'},
        graduation: {ar: 'تخرج', en: 'Graduation'},
        'mothers-day': {ar: 'يوم الأم', en: "Mother's Day"},
        'national-day': {ar: 'اليوم الوطني', en: 'National Day'},
        'new-baby': {ar: 'مواليد', en: 'New Baby'},
      };
      const foundTrans = localValueTranslation[lowerVal];
      label = foundTrans ? (isEn ? foundTrans.en : foundTrans.ar) : value;
    }

    chips.push({id: `${key}|${value}`, key, value, label});
  });

  // Also include categories
  params.getAll('category').forEach((value) => {
    const found = collections?.find((c: any) => c.handle === value);
    let labelText = found
      ? found.title
      : value.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    const localOccasionTranslation: {[key: string]: string} = {
      wedding: 'زفاف وخطوبة',
      ramadan: 'رمضان',
      birthdays: 'أعياد الميلاد',
      eid: 'عيد الفطر والاضحى',
      'new-baby': 'مواليد',
      'national-day': 'اليوم الوطني',
      'mothers-day': 'يوم الأم',
      graduation: 'تخرج',
      'corporate-gifts': 'هدايا مؤسسية',
    };
    const localCategoryTranslation: {[key: string]: string} = {
      chocolate: 'الشوكولاته',
      cakes: 'الكيك',
      biscuits: 'البسكويت',
      oriental: 'الحلويات الشرقية',
      coffee: 'القهوة',
      strawberry: 'الفراوله',
      gifts: 'الهدايا',
      cupcakes: 'الكب كيك',
      'arabic-sweets': 'الحلويات العربية',
      'oriental-sweets': 'الحلويات الشرقية',
      sweets: 'الحلويات',
      pastry: 'المعجنات',
      pastries: 'المعجنات',
      baking: 'المخبوزات',
      bakery: 'المخبوزات',
      cream: 'الكريمة',
      'coffee-and-dates': 'القهوة والتمر',
      'ice-cream': 'الآيس كريم',
      kunafa: 'كنافة',
      all: 'الكل',
    };

    if (!isEn) {
      if (localOccasionTranslation[value]) {
        labelText = localOccasionTranslation[value];
      } else if (localCategoryTranslation[value]) {
        labelText = localCategoryTranslation[value];
      }
    }

    chips.push({
      id: `category|${value}`,
      key: 'category',
      value,
      label: labelText,
    });
  });

  const removeFilter = (targetKey: string, targetValue?: string) => {
    const newParams = new URLSearchParams(window.location.search);
    if (targetKey === 'category' && targetValue) {
      const categories = newParams.getAll('category');
      newParams.delete('category');
      categories
        .filter((c) => c !== targetValue)
        .forEach((c) => newParams.append('category', c));
    } else if (targetValue !== undefined) {
      const existingValues = newParams.getAll(targetKey);
      newParams.delete(targetKey);
      existingValues
        .filter((val) => val !== targetValue)
        .forEach((val) => newParams.append(targetKey, val));
    } else {
      newParams.delete(targetKey);
    }
    newParams.delete('cursor');
    newParams.delete('direction');
    newParams.delete('page');

    submit(newParams, {replace: true, preventScrollReset: true});
  };

  return (
    <>
      {chips.map((chip) => (
        <button
          key={chip.id}
          onClick={() => removeFilter(chip.key, chip.value)}
          className="bg-white border border-[#BBCFCD]/50 px-[15px] py-[6px] rounded-full flex items-center gap-2.5 text-[14px] font-medium text-[#234745] hover:border-[#234745] hover:bg-gray-50 transition-all group"
          style={{fontFamily: !isEn ? "'GE Dinar One', sans-serif" : undefined}}
        >
          {isEn ? (
            <>
              <svg
                width="11"
                height="11"
                viewBox="0 0 11 11"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M0.0896316 0.216632L0.146631 0.146631C0.229487 0.0639563 0.338722 0.0129697 0.455306 0.00255394C0.571889 -0.00786185 0.688432 0.0229534 0.784631 0.0896316L0.854632 0.146631L5.50063 4.79363L10.1466 0.146631C10.2405 0.0527449 10.3679 -3.1283e-09 10.5006 0C10.6334 3.1283e-09 10.7607 0.0527448 10.8546 0.146631C10.9485 0.240518 11.0013 0.367856 11.0013 0.500632C11.0013 0.633407 10.9485 0.760745 10.8546 0.854632L6.20763 5.50063L10.8546 10.1466C10.9373 10.2295 10.9883 10.3387 10.9987 10.4553C11.0091 10.5719 10.9783 10.6884 10.9116 10.7846L10.8546 10.8546C10.7718 10.9373 10.6625 10.9883 10.546 10.9987C10.4294 11.0091 10.3128 10.9783 10.2166 10.9116L10.1466 10.8546L5.50063 6.20763L0.854632 10.8546C0.760745 10.9485 0.633407 11.0013 0.500632 11.0013C0.367856 11.0013 0.240518 10.9485 0.146631 10.8546C0.0527448 10.7607 3.1283e-09 10.6334 0 10.5006C-3.1283e-09 10.3679 0.0527449 10.2405 0.146631 10.1466L4.79363 5.50063L0.146631 0.854632C0.0639563 0.771776 0.0129697 0.662541 0.00255394 0.545958C-0.00786185 0.429374 0.0229534 0.312831 0.0896316 0.216632Z"
                  fill="#234745"
                />
              </svg>

              <span>{chip.label}</span>
            </>
          ) : (
            <>
              <span>{chip.label}</span>
              <svg
                width="11"
                height="11"
                viewBox="0 0 11 11"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M0.0896316 0.216632L0.146631 0.146631C0.229487 0.0639563 0.338722 0.0129697 0.455306 0.00255394C0.571889 -0.00786185 0.688432 0.0229534 0.784631 0.0896316L0.854632 0.146631L5.50063 4.79363L10.1466 0.146631C10.2405 0.0527449 10.3679 -3.1283e-09 10.5006 0C10.6334 3.1283e-09 10.7607 0.0527448 10.8546 0.146631C10.9485 0.240518 11.0013 0.367856 11.0013 0.500632C11.0013 0.633407 10.9485 0.760745 10.8546 0.854632L6.20763 5.50063L10.8546 10.1466C10.9373 10.2295 10.9883 10.3387 10.9987 10.4553C11.0091 10.5719 10.9783 10.6884 10.9116 10.7846L10.8546 10.8546C10.7718 10.9373 10.6625 10.9883 10.546 10.9987C10.4294 11.0091 10.3128 10.9783 10.2166 10.9116L10.1466 10.8546L5.50063 6.20763L0.854632 10.8546C0.760745 10.9485 0.633407 11.0013 0.500632 11.0013C0.367856 11.0013 0.240518 10.9485 0.146631 10.8546C0.0527448 10.7607 3.1283e-09 10.6334 0 10.5006C-3.1283e-09 10.3679 0.0527449 10.2405 0.146631 10.1466L4.79363 5.50063L0.146631 0.854632C0.0639563 0.771776 0.0129697 0.662541 0.00255394 0.545958C-0.00786185 0.429374 0.0229534 0.312831 0.0896316 0.216632Z"
                  fill="#234745"
                />
              </svg>
            </>
          )}
        </button>
      ))}
    </>
  );
}
export function FilterSidebar({
  filters,
  collections,
  onClose,
  isDesktop = false,
  isEn,
  hideSearchInput = false,
  hideCategories = false,
}: {
  filters: any[];
  collections: any[];
  onClose: () => void;
  isDesktop?: boolean;
  isEn?: boolean;
  hideSearchInput?: boolean;
  hideCategories?: boolean;
}) {
  const submit = useSubmit();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [openSections, setOpenSections] = useState<{[key: string]: boolean}>({
    categories: true,
    price: true,
    occasions: true,
  });

  const isOccasionOrGift = (handle: string) => {
    const occasions = [
      'wedding',
      'ramadan',
      'birthdays',
      'eid',
      'new-baby',
      'national-day',
      'mothers-day',
      'graduation',
      'corporate-gifts',
      'occasions',
    ];
    return (
      handle.startsWith('gifts-for-') ||
      handle === 'gifts' ||
      handle === 'gifting' ||
      occasions.includes(handle) ||
      handle === 'all' ||
      handle === 'frontpage'
    );
  };
  const localOccasionTranslation: {[key: string]: string} = {
    wedding: 'زفاف وخطوبة',
    ramadan: 'رمضان',
    birthdays: 'أعياد الميلاد',
    eid: 'عيد الفطر والاضحى',
    'new-baby': 'مواليد',
    'national-day': 'اليوم الوطني',
    'mothers-day': 'يوم الأم',
    graduation: 'تخرج',
    'corporate-gifts': 'هدايا مؤسسية',
  };
  const localCategoryTranslation: {[key: string]: string} = {
    chocolate: 'الشوكولاته',
    cakes: 'الكيك',
    biscuits: 'البسكويت',
    oriental: 'الحلويات الشرقية',
    coffee: 'القهوة',
    strawberry: 'الفراوله',
    gifts: 'الهدايا',
    cupcakes: 'الكب كيك',
    'arabic-sweets': 'الحلويات العربية',
    'oriental-sweets': 'الحلويات الشرقية',
    sweets: 'الحلويات',
    pastry: 'المعجنات',
    pastries: 'المعجنات',
    baking: 'المخبوزات',
    bakery: 'المخبوزات',
    cream: 'الكريمة',
    'coffee-and-dates': 'القهوة والتمر',
    'ice-cream': 'الآيس كريم',
    kunafa: 'كنافة',
    maamoul: 'معمول',
    baklava: 'بقلاوة',
    all: 'الكل',
  };
  const localValueTranslation: {[key: string]: string} = {
    'in stock': 'متوفر',
    'out of stock': 'غير متوفر',
    true: 'نعم',
    false: 'لا',
    yes: 'نعم',
    no: 'لا',
  };
  const dynamicCategoryCollections = (collections || []).filter(
    (c: any) => !isOccasionOrGift(c.handle),
  );

  const DEFAULT_CATEGORIES = [
    {
      id: 'cat-chocolate',
      handle: 'chocolate',
      title: isEn ? 'Chocolate' : 'الشوكولاته',
    },
    {id: 'cat-cakes', handle: 'cakes', title: isEn ? 'Cakes' : 'الكيك'},
    {
      id: 'cat-oriental',
      handle: 'oriental-sweets',
      title: isEn ? 'Oriental Sweets' : 'الحلويات الشرقية',
    },
    {id: 'cat-baklava', handle: 'baklava', title: isEn ? 'Baklava' : 'بقلاوة'},
    {id: 'cat-maamoul', handle: 'maamoul', title: isEn ? 'Maamoul' : 'معمول'},
    {
      id: 'cat-pastries',
      handle: 'pastries',
      title: isEn ? 'Pastries' : 'المعجنات',
    },
    {id: 'cat-sweets', handle: 'sweets', title: isEn ? 'Sweets' : 'الحلويات'},
  ];

  const categoryCollections =
    dynamicCategoryCollections.length > 0
      ? dynamicCategoryCollections
      : DEFAULT_CATEGORIES;

  const occasionHandles = [
    'wedding',
    'ramadan',
    'birthdays',
    'eid',
    'new-baby',
    'national-day',
    'mothers-day',
    'graduation',
    'corporate-gifts',
  ];
  const order = [
    'eid',
    'ramadan',
    'birthdays',
    'wedding',
    'graduation',
    'mothers-day',
    'national-day',
    'corporate-gifts',
  ];

  const DEFAULT_OCCASIONS = [
    {
      id: 'occ-eid',
      handle: 'eid',
      title: isEn ? 'Eid Al-Fitr & Al-Adha' : 'عيد الفطر والاضحى',
    },
    {
      id: 'occ-ramadan',
      handle: 'ramadan',
      title: isEn ? 'Ramadan' : 'رمضان',
    },
    {
      id: 'occ-birthdays',
      handle: 'birthdays',
      title: isEn ? 'Birthdays' : 'أعياد الميلاد',
    },
    {
      id: 'occ-wedding',
      handle: 'wedding',
      title: isEn ? 'Wedding & Engagement' : 'زفاف وخطوبة',
    },
    {
      id: 'occ-graduation',
      handle: 'graduation',
      title: isEn ? 'Graduation' : 'تخرج',
    },
    {
      id: 'occ-mothers-day',
      handle: 'mothers-day',
      title: isEn ? "Mother's Day" : 'يوم الأم',
    },
    {
      id: 'occ-national-day',
      handle: 'national-day',
      title: isEn ? 'National Day' : 'اليوم الوطني',
    },
    {
      id: 'occ-new-baby',
      handle: 'new-baby',
      title: isEn ? 'New Baby' : 'مواليد',
    },
    {
      id: 'occ-corporate-gifts',
      handle: 'corporate-gifts',
      title: isEn ? 'Corporate Gifts' : 'هدايا مؤسسية',
    },
  ];

  const dynamicOccasionCollections = (collections || [])
    .filter((c: any) => occasionHandles.includes(c.handle))
    .sort(
      (a: any, b: any) => order.indexOf(a.handle) - order.indexOf(b.handle),
    );

  const occasionCollections =
    dynamicOccasionCollections.length > 0
      ? dynamicOccasionCollections
      : DEFAULT_OCCASIONS; // Price state
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  useEffect(() => {
    const initialOpen: {[key: string]: boolean} = {};
    filters?.forEach((f) => {
      initialOpen[f.id] = true;
    });
    setOpenSections((prev) => ({...initialOpen, ...prev}));
  }, [filters]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSearchQuery(params.get('q') || '');
    const priceParam = params.get('filter.v.price');
    if (priceParam) {
      try {
        const parsed = JSON.parse(priceParam) as any;
        if (parsed.gte) setMinPrice(parsed.gte.toString());
        if (parsed.lte) setMaxPrice(parsed.lte.toString());
      } catch (e) {}
    } else {
      setMinPrice('');
      setMaxPrice('');
    }
  }, [location.search]);

  /** Pending keystroke navigation, so typing does not fire one per character. */
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = (value: string) => {
    const params = new URLSearchParams(window.location.search);
    if (value.trim()) {
      params.set('q', value);
    } else {
      params.delete('q');
    }
    submit(params, {replace: true, preventScrollReset: true});
  };

  /**
   * Typing updates the box immediately and the URL shortly after.
   *
   * This used to call `submit()` on every keystroke: "plate" meant five
   * navigations and five Shopify searches, each re-running the loader and
   * re-rendering the list under the cursor. The results you saw were whichever
   * request happened to land last, which is why the box felt unresponsive.
   */
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => runSearch(value), 350);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Enter searches now, without waiting out the debounce.
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    runSearch(searchQuery);
  };

  // Drop a pending search if the sidebar unmounts mid-typing.
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, []);

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({...prev, [id]: !prev[id]}));
  };

  const toggleParamLink = (key: string, value: string) => {
    const params = new URLSearchParams(window.location.search);
    const currentValues = params.getAll(key);
    if (currentValues.includes(value)) {
      params.delete(key);
      currentValues
        .filter((v) => v !== value)
        .forEach((v) => params.append(key, v));
    } else {
      params.append(key, value);
    }
    submit(params, {replace: true, preventScrollReset: true});
  };

  const toggleFilterLink = (input: string) => {
    const params = new URLSearchParams(window.location.search);
    try {
      const parsed = JSON.parse(input) as any;
      let key = '';
      let val = '';
      if (parsed.variantOption) {
        key = `filter.v.option.${parsed.variantOption.name}`;
        val = parsed.variantOption.value;
      } else if (parsed.productType) {
        key = 'filter.v.product_type';
        val = parsed.productType;
      } else if (parsed.productVendor) {
        key = 'filter.v.product_vendor';
        val = parsed.productVendor;
      } else if (parsed.productMetafield) {
        key = `filter.p.m.${parsed.productMetafield.namespace}.${parsed.productMetafield.key}`;
        val = parsed.productMetafield.value;
      } else if (parsed.available !== undefined) {
        key = 'filter.v.availability';
        val = parsed.available.toString();
      }

      if (key) {
        if (params.get(key) === val) {
          params.delete(key);
        } else {
          params.set(key, val);
        }
      }
      submit(params, {replace: true, preventScrollReset: true});
    } catch (e) {}
  };

  const isFilterActive = (input: string, params: URLSearchParams) => {
    try {
      const filterInput = JSON.parse(input) as any;
      if (filterInput.variantOption) {
        return (
          params.get(`filter.v.option.${filterInput.variantOption.name}`) ===
          filterInput.variantOption.value
        );
      } else if (filterInput.productType) {
        return params.get('filter.v.product_type') === filterInput.productType;
      } else if (filterInput.productVendor) {
        return (
          params.get('filter.v.product_vendor') === filterInput.productVendor
        );
      } else if (filterInput.productMetafield) {
        return (
          params.get(
            `filter.p.m.${filterInput.productMetafield.namespace}.${filterInput.productMetafield.key}`,
          ) === filterInput.productMetafield.value
        );
      } else if (filterInput.available !== undefined) {
        return (
          params.get('filter.v.availability') ===
          filterInput.available.toString()
        );
      }
    } catch (e) {}
    return false;
  };

  const handlePriceApply = () => {
    const params = new URLSearchParams(window.location.search);
    if (minPrice || maxPrice) {
      const priceObj: any = {};
      if (minPrice) priceObj.gte = parseFloat(minPrice);
      if (maxPrice) priceObj.lte = parseFloat(maxPrice);
      params.set('filter.v.price', JSON.stringify(priceObj));
    } else {
      params.delete('filter.v.price');
    }
    submit(params, {replace: true, preventScrollReset: true});
  };

  const setPricePreset = (min: string, max: string) => {
    setMinPrice(min);
    setMaxPrice(max);
    const params = new URLSearchParams(window.location.search);
    const priceObj: any = {};
    if (min) priceObj.gte = parseFloat(min);
    if (max) priceObj.lte = parseFloat(max);
    if (Object.keys(priceObj).length > 0) {
      params.set('filter.v.price', JSON.stringify(priceObj));
    } else {
      params.delete('filter.v.price');
    }
    submit(params, {replace: true, preventScrollReset: true});
  };

  const clearPrice = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMinPrice('');
    setMaxPrice('');
    const params = new URLSearchParams(window.location.search);
    params.delete('filter.v.price');
    submit(params, {replace: true, preventScrollReset: true});
  };

  const handleClearAll = () => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    const sortKey = params.get('sortKey');
    const reverse = params.get('reverse');

    const newParams = new URLSearchParams();
    if (q) newParams.set('q', q);
    if (sortKey) newParams.set('sortKey', sortKey);
    if (reverse) newParams.set('reverse', reverse);

    submit(newParams, {replace: true, preventScrollReset: true});
  };

  const pricePresets = [
    {
      label: isEn ? (
        'Under 100 SAR'
      ) : (
        <span className="inline-flex items-center gap-1">
          <span>
            أقل من <span className="font-en">100</span>
          </span>
          <SaudiRiyalSymbol className="h-3 w-auto text-current" />
        </span>
      ),
      min: '',
      max: '100',
    },
    {
      label: isEn ? (
        '100 - 200 SAR'
      ) : (
        <span className="inline-flex items-center gap-1 font-en">
          <span>100 - 200</span>
          <SaudiRiyalSymbol className="h-3 w-auto text-current" />
        </span>
      ),
      min: '100',
      max: '200',
    },
    {
      label: isEn ? (
        '200 - 400 SAR'
      ) : (
        <span className="inline-flex items-center gap-1 font-en">
          <span>200 - 400</span>
          <SaudiRiyalSymbol className="h-3 w-auto text-current" />
        </span>
      ),
      min: '200',
      max: '400',
    },
    {
      label: isEn ? (
        'Over 400 SAR'
      ) : (
        <span className="inline-flex items-center gap-1">
          <span>
            أكثر من <span className="font-en">400</span>
          </span>
          <SaudiRiyalSymbol className="h-3 w-auto text-current" />
        </span>
      ),
      min: '400',
      max: '',
    },
  ];

  const currentParams =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();

  return (
    <div
      className={`flex flex-col h-full ${isDesktop ? 'bg-white border border-[#BBCFCD]/50 rounded-[24px] w-[302px] box-border py-6' : 'bg-white overflow-hidden'}`}
      dir={isEn ? 'ltr' : 'rtl'}
    >
      {!isDesktop && (
        <header className="p-6 border-b border-[#BBCFCD]/50 flex items-center justify-between shrink-0">
          <h2
            className={`text-xl font-medium text-[#234745] ${isEn ? 'font-en' : "font-['GE_Dinar_One']"}`}
          >
            {isEn ? 'Filters' : 'التصفية'}
          </h2>
          {/* Circled cross close button matching screenshot */}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#7D7D7D] hover:bg-gray-100 transition-colors shrink-0"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </button>
        </header>
      )}

      {/* Content Container */}
      <div
        className={`flex-1 flex flex-col items-center gap-4 ${isDesktop ? 'px-0' : 'overflow-y-auto p-4'}`}
      >
        {/* Search Bar */}
        {!hideSearchInput && (
          <>
            <div className="w-[270px] bg-[#BBCFCD] rounded-[25px] px-4 py-2 flex items-center justify-between">
              <form
                onSubmit={handleSearchSubmit}
                className={`w-full flex items-center ${isEn ? 'flex-row' : 'flex-row-reverse'} gap-2`}
              >
                <input
                  type="text"
                  placeholder={
                    isEn ? 'Search products...' : 'إبحث في المنتجات...'
                  }
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className={`flex-1 min-w-0 bg-transparent text-[14px] ${isEn ? 'font-en text-left' : "font-['GE_Dinar_One'] text-right"} text-[#234745] placeholder-[#234745] focus:outline-none`}
                />
                {/* The magnifier looked tappable but was decorative — clicking
                    it did nothing, so the only way to search was pressing
                    Enter. It submits the form now. */}
                <button
                  type="submit"
                  aria-label={isEn ? 'Search' : 'بحث'}
                  className="shrink-0 cursor-pointer bg-transparent border-0 p-0 flex items-center"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#234745"
                    strokeWidth="1.5"
                  >
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </button>
              </form>
            </div>

            <div className="w-[302px] border-t border-[#BBCFCD]/50 my-0" />
          </>
        )}

        {/* Categories - Dynamic from Collections with Fallbacks */}
        {!hideCategories && (
          <>
            <div className="w-[270px] flex flex-col gap-4">
              <button
                type="button"
                onClick={() => toggleSection('categories')}
                className="flex items-center justify-between w-full outline-none group"
              >
                <h3
                  className={`text-[16px] font-bold ${isEn ? 'font-en' : "font-['GE_Dinar_One']"} text-[#171717]`}
                >
                  {isEn ? 'Categories' : 'الأقسام'}
                </h3>
                <svg
                  className={`w-4 h-4 text-[#234745] transition-transform duration-300 ${openSections['categories'] ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              <div
                className={`flex flex-col gap-3 transition-all duration-300 ${openSections['categories'] ? 'max-h-[220px] overflow-y-auto custom-scrollbar opacity-100 pr-1 pl-1' : 'max-h-0 overflow-hidden opacity-0'}`}
              >
                {categoryCollections.map((collection: any) => {
                  const isActive = currentParams
                    .getAll('category')
                    .includes(collection.handle);
                  return (
                    <button
                      type="button"
                      key={collection.id}
                      onClick={() => toggleParamLink('category', collection.handle)}
                      className="flex items-center justify-between w-full outline-none group text-start"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${isActive ? 'bg-[#234745]' : 'border-[1.14px] border-[#BBCFCD] bg-white group-hover:border-[#234745]'}`}
                        >
                          {isActive && (
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="white"
                              strokeWidth="3"
                            >
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          )}
                        </div>
                        <span
                          className={`text-[16px] font-medium ${isEn ? 'font-en' : "font-['GE_Dinar_One']"} transition-colors ${isActive ? 'text-[#234745]' : 'text-[#7D7D7D] group-hover:text-[#234745]'}`}
                        >
                          {!isEn && localCategoryTranslation[collection.handle]
                            ? localCategoryTranslation[collection.handle]
                            : collection.title}
                        </span>
                      </div>
                      <span
                        className={`text-[16px] font-medium ${isEn ? 'font-en text-[#7D7D7D]' : "font-['GE_Dinar_One'] text-[#7D7D7D]"}`}
                      >
                        {collection.products?.nodes !== undefined ? (
                          <>
                            (
                            <span className="font-en">
                              {collection.products.nodes.length}
                            </span>
                            )
                          </>
                        ) : (
                          ''
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="w-[302px] border-t border-[#BBCFCD]/50 my-0" />
          </>
        )}

        {/* Price */}
        <div className="w-[270px] flex flex-col gap-4">
          <button
            type="button"
            onClick={() => toggleSection('price')}
            className="flex items-center justify-between w-full outline-none group"
          >
            <h3
              className={`text-[16px] font-bold ${isEn ? 'font-en' : "font-['GE_Dinar_One']"} text-[#171717] flex items-center gap-1`}
            >
              {isEn ? (
                'Price (SAR)'
              ) : (
                <span className="inline-flex items-center gap-1">
                  <span>السعر (</span>
                  <SaudiRiyalSymbol className="h-3.5 w-auto text-[#171717]" />
                  <span>)</span>
                </span>
              )}
            </h3>
            <div className="flex items-center gap-6">
              {(minPrice || maxPrice) && (
                <span
                  onClick={clearPrice}
                  className={`text-[16px] font-bold ${isEn ? 'font-en' : "font-['GE_Dinar_One']"} text-[#E64950]`}
                >
                  {isEn ? 'Clear' : 'مسح'}
                </span>
              )}
              <svg
                className={`w-4 h-4 text-[#234745] transition-transform duration-300 ${openSections['price'] ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </button>
          <div
            className={`flex flex-col gap-4 transition-all duration-300 overflow-hidden ${openSections['price'] ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 border border-[#BBCFCD] rounded-[16px] px-4 py-2 flex items-center justify-between">
                <span
                  className={`text-[16px] font-medium ${isEn ? 'font-en' : "font-['GE_Dinar_One']"} text-[#7D7D7D]`}
                >
                  {isEn ? 'From' : 'من'}
                </span>
                <input
                  aria-label={isEn ? 'Minimum Price' : 'الحد الأدنى للسعر'}
                  type="number"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-12 bg-transparent text-center focus:outline-none"
                />
              </div>
              <span className="text-[16px] font-medium text-[#255441]">-</span>
              <div className="flex-1 border border-[#BBCFCD] rounded-[16px] px-4 py-2 flex items-center justify-between">
                <span
                  className={`text-[16px] font-medium ${isEn ? 'font-en' : "font-['GE_Dinar_One']"} text-[#7D7D7D]`}
                >
                  {isEn ? 'To' : 'إلي'}
                </span>
                <input
                  aria-label={isEn ? 'Maximum Price' : 'الحد الأقصى للسعر'}
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-12 bg-transparent text-center focus:outline-none"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handlePriceApply}
              className={`w-[270px] bg-[#234745] text-[#FEF8EB] rounded-[25px] py-2.5 text-[16px] font-medium ${isEn ? 'font-en' : "font-['GE_Dinar_One']"} hover:opacity-90 transition-opacity`}
            >
              {isEn ? 'Apply' : 'تطبيق'}
            </button>
            <div className="flex flex-col gap-3 mt-2">
              {pricePresets.map((preset, i) => {
                const isActive =
                  minPrice === preset.min && maxPrice === preset.max;
                return (
                  <button
                    type="button"
                    key={i}
                    onClick={() => setPricePreset(preset.min, preset.max)}
                    className="flex items-center justify-start gap-2 w-full outline-none group"
                  >
                    <div
                      className={`w-6 h-6 rounded-full border-2 transition-colors flex items-center justify-center ${isActive ? 'border-[#234745]' : 'border-[#BBCFCD] group-hover:border-[#234745]'}`}
                    >
                      {isActive && (
                        <div className="w-2.5 h-2.5 bg-[#234745] rounded-full" />
                      )}
                    </div>
                    <span
                      className={`text-[16px] font-medium ${isEn ? 'font-en' : "font-['GE_Dinar_One']"} transition-colors ${isActive ? 'text-[#234745]' : 'text-[#7D7D7D] group-hover:text-[#234745]'}`}
                    >
                      {preset.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="w-[302px] border-t border-[#BBCFCD]/50 my-0" />

        {/* Occasions - Dynamic from Occasion Collections */}
        {occasionCollections && occasionCollections.length > 0 && (
          <div className="w-[270px] flex flex-col gap-4">
            <button
              type="button"
              onClick={() => toggleSection('occasions')}
              className="flex items-center justify-between w-full outline-none group"
            >
              <h3
                className={`text-[16px] font-bold ${isEn ? 'font-en' : "font-['GE_Dinar_One']"} text-[#171717]`}
              >
                {isEn ? 'Occasion' : 'المناسبة'}
              </h3>
              <svg
                className={`w-4 h-4 text-[#234745] transition-transform duration-300 ${openSections['occasions'] ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            <div
              className={`flex flex-col gap-4 transition-all duration-300 overflow-hidden ${openSections['occasions'] ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}
            >
              {occasionCollections.map((collection: any) => {
                const isActive = currentParams
                  .getAll('category')
                  .includes(collection.handle);
                return (
                  <button
                    type="button"
                    key={collection.id}
                    onClick={() =>
                      toggleParamLink('category', collection.handle)
                    }
                    className="flex items-center justify-between w-full outline-none group text-start"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${isActive ? 'bg-[#234745]' : 'border-[1.14px] border-[#BBCFCD] bg-white group-hover:border-[#234745]'}`}
                      >
                        {isActive && (
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="white"
                            strokeWidth="3"
                          >
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        )}
                      </div>
                      <span
                        className={`text-[16px] font-medium ${isEn ? 'font-en' : "font-['GE_Dinar_One']"} transition-colors ${isActive ? 'text-[#234745]' : 'text-[#7D7D7D] group-hover:text-[#234745]'}`}
                      >
                        {!isEn && localOccasionTranslation[collection.handle]
                          ? localOccasionTranslation[collection.handle]
                          : collection.title}
                      </span>
                    </div>
                    <span
                      className={`text-[16px] font-medium ${isEn ? 'font-en text-[#7D7D7D]' : "font-['GE_Dinar_One'] text-[#7D7D7D]"}`}
                    >
                      {collection.products?.nodes !== undefined ? (
                        <>
                          (
                          <span className="font-en">
                            {collection.products.nodes.length}
                          </span>
                          )
                        </>
                      ) : (
                        ''
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {/* Dynamic Filters from Shopify (Other Types, Vendors, etc) */}
        {filters?.map((filter) => {
          if (
            filter.id === 'filter.v.price' ||
            filter.type !== 'LIST' ||
            filter.values.length === 0
          )
            return null;

          // Skip Availability, Occasion, Gift, and Dietary filters (dietary is handled explicitly below)
          const lowerId = filter.id.toLowerCase();
          const lowerLabel = (filter.label || '').toLowerCase();
          if (
            lowerId.includes('availability') ||
            lowerLabel === 'availability' ||
            filter.label === 'التوفر' ||
            lowerId.includes('occasion') ||
            lowerId.includes('gift') ||
            lowerId.includes('dietary') ||
            lowerLabel.includes('dietary') ||
            lowerLabel.includes('غذائي')
          )
            return null;

          return (
            <Fragment key={filter.id}>
              <div className="w-[302px] border-t border-[#BBCFCD]/50 my-0" />
              <div className="w-[270px] flex flex-col gap-4">
                <button
                  type="button"
                  onClick={() => toggleSection(filter.id)}
                  className="flex items-center justify-between w-full outline-none group"
                >
                  <h3
                    className={`text-[16px] font-bold ${isEn ? 'font-en' : "font-['GE_Dinar_One']"} text-[#171717]`}
                  >
                    {filter.label}
                  </h3>
                  <svg
                    className={`w-4 h-4 text-[#234745] transition-transform duration-300 ${openSections[filter.id] ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                <div
                  className={`flex flex-col gap-4 transition-all duration-300 overflow-hidden ${openSections[filter.id] ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}
                >
                  {filter.values.map((item: any, i: number) => {
                    const isActive = isFilterActive(item.input, currentParams);
                    return (
                      <button
                        type="button"
                        key={item.id || i}
                        onClick={() => toggleFilterLink(item.input)}
                        className="flex items-center justify-between w-full outline-none group text-start"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${isActive ? 'bg-[#234745]' : 'border-[1.14px] border-[#BBCFCD] bg-white group-hover:border-[#234745]'}`}
                          >
                            {isActive && (
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="white"
                                strokeWidth="3"
                              >
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            )}
                          </div>
                          <span
                            className={`text-[16px] font-medium ${isEn ? 'font-en' : "font-['GE_Dinar_One']"} transition-colors ${isActive ? 'text-[#234745]' : 'text-[#7D7D7D] group-hover:text-[#234745]'}`}
                          >
                            {!isEn &&
                            localValueTranslation[item.label.toLowerCase()]
                              ? localValueTranslation[item.label.toLowerCase()]
                              : item.label}
                          </span>
                        </div>
                        <span
                          className={`text-[16px] font-medium ${isEn ? 'font-en text-[#7D7D7D]' : "font-['GE_Dinar_One'] text-[#7D7D7D]"}`}
                        >
                          {item.count > 0 ? (
                            <>
                              (<span className="font-en">{item.count}</span>)
                            </>
                          ) : (
                            ''
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </Fragment>
          );
        })}

        {/* Dietary Type Filter Section (Placed AT THE VERY END) */}
        <div className="w-[302px] border-t border-[#BBCFCD]/50 my-0" />
        <div className="w-[270px] flex flex-col gap-4">
          <button
            type="button"
            onClick={() => toggleSection('dietary')}
            className="flex items-center justify-between w-full outline-none group"
          >
            <h3
              className={`text-[16px] font-bold ${isEn ? 'font-en' : "font-['GE_Dinar_One']"} text-[#171717]`}
            >
              {isEn ? 'Dietary Preference' : 'النوع الغذائي'}
            </h3>
            <svg
              className={`w-4 h-4 text-[#234745] transition-transform duration-300 ${openSections['dietary'] !== false ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          <div
            className={`flex flex-col gap-4 transition-all duration-300 overflow-hidden ${openSections['dietary'] !== false ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}
          >
            {[
              {
                labelAr: 'خالي من الجلوتين',
                labelEn: 'Gluten-Free',
                tags: [
                  'gluten-free',
                  'gluten_free',
                  'خالي من الجلوتين',
                  'dietary:gluten-free',
                ],
              },
              {
                labelAr: 'مناسب للنباتيين',
                labelEn: 'Vegan / Vegetarian',
                tags: [
                  'vegan',
                  'vegetarian',
                  'مناسب للنباتيين',
                  'dietary:vegan',
                ],
              },
              {
                labelAr: 'منتجات صحية',
                labelEn: 'Healthy Products',
                tags: ['healthy', 'منتجات صحية', 'dietary:healthy'],
              },
              {
                labelAr: 'خالي من السكر',
                labelEn: 'Sugar-Free',
                tags: [
                  'sugar-free',
                  'sugar_free',
                  'خالي من السكر',
                  'dietary:sugar-free',
                ],
              },
              {
                labelAr: 'قليل الدهون',
                labelEn: 'Low-Fat',
                tags: ['low-fat', 'low_fat', 'قليل الدهون', 'dietary:low-fat'],
              },
            ].map((item, i) => {
              const activeTag = item.tags.find(
                (t) =>
                  currentParams.getAll('filter.p.tag').includes(t) ||
                  currentParams.getAll('tag').includes(t),
              );
              const isActive = !!activeTag;
              const primaryTag = item.tags[0];

              return (
                <button
                  type="button"
                  key={i}
                  onClick={() => {
                    const params = new URLSearchParams(window.location.search);
                    if (isActive) {
                      const allTags = params
                        .getAll('filter.p.tag')
                        .filter((v) => !item.tags.includes(v));
                      params.delete('filter.p.tag');
                      allTags.forEach((v) => params.append('filter.p.tag', v));
                    } else {
                      params.append('filter.p.tag', primaryTag);
                    }
                    submit(params, {replace: true, preventScrollReset: true});
                  }}
                  className="flex items-center justify-between w-full outline-none group text-start"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${isActive ? 'bg-[#234745]' : 'border-[1.14px] border-[#BBCFCD] bg-white group-hover:border-[#234745]'}`}
                    >
                      {isActive && (
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="white"
                          strokeWidth="3"
                        >
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      )}
                    </div>
                    <span
                      className={`text-[16px] font-medium ${isEn ? 'font-en' : "font-['GE_Dinar_One']"} transition-colors ${isActive ? 'text-[#234745]' : 'text-[#7D7D7D] group-hover:text-[#234745]'}`}
                    >
                      {isEn ? item.labelEn : item.labelAr}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom side-by-side action buttons matching the mockup drawer layout */}
      {isDesktop ? (
        <div className="p-6 flex justify-center w-full bg-white shrink-0">
          <button
            type="button"
            onClick={handleClearAll}
            className={`w-[270px] border border-[#234745] text-[#234745] rounded-full py-3 text-[16px] font-bold ${isEn ? 'font-en' : "font-['GE_Dinar_One']"} hover:bg-[#234745]/5 transition-all flex items-center justify-center`}
          >
            {isEn ? 'Clear All Filters' : 'مسح كل الفلاتر'}
          </button>
        </div>
      ) : (
        <div
          className="p-6 border-t border-[#BBCFCD]/50 flex items-center justify-between gap-4 shrink-0 bg-white w-full"
          dir={isEn ? 'ltr' : 'rtl'}
        >
          <button
            type="button"
            onClick={handleClearAll}
            className={`flex-1 border border-[#234745] text-[#234745] rounded-[25px] py-2.5 text-[16px] font-medium ${isEn ? 'font-en' : "font-['GE_Dinar_One']"} hover:bg-gray-50 transition-colors flex items-center justify-center`}
          >
            {isEn ? 'Clear All' : 'مسح كل الفلاتر'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className={`flex-1 bg-[#234745] text-[#FEF8EB] rounded-[25px] py-2.5 text-[16px] font-medium ${isEn ? 'font-en' : "font-['GE_Dinar_One']"} hover:opacity-90 transition-opacity flex items-center justify-center`}
          >
            {isEn ? 'Apply' : 'تطبيق'}
          </button>
        </div>
      )}
    </div>
  );
}

function getFilterLink(input: string) {
  try {
    const parsed = JSON.parse(input) as any;
    const params = new URLSearchParams(
      typeof window !== 'undefined' ? window.location.search : '',
    );

    if (parsed.price) {
      if (parsed.price.min) params.set('filter.v.price.min', parsed.price.min);
      if (parsed.price.max) params.set('filter.v.price.max', parsed.price.max);
    } else if (parsed.variantOption) {
      params.set(
        `filter.v.option.${parsed.variantOption.name}`,
        parsed.variantOption.value,
      );
    } else if (parsed.productType) {
      params.set('filter.v.product_type', parsed.productType);
    } else if (parsed.productVendor) {
      params.set('filter.v.product_vendor', parsed.productVendor);
    } else if (parsed.productMetafield) {
      params.set(
        `filter.p.m.${parsed.productMetafield.namespace}.${parsed.productMetafield.key}`,
        parsed.productMetafield.value,
      );
    } else if (parsed.available !== undefined) {
      params.set('filter.v.availability', parsed.available.toString());
    }

    return '?' + params.toString();
  } catch (e) {
    return '#';
  }
}

function ProductsGrid({
  products,
  view,
}: {
  products: any[];
  view: 'grid' | 'list';
}) {
  const containerClasses =
    view === 'grid'
      ? 'grid grid-cols-2 lg:grid-cols-3 gap-[10px] md:gap-6 lg:gap-8'
      : 'flex flex-col gap-5';

  return (
    <div className={containerClasses}>
      {products.map((product: any, index: number) => {
        return (
          <ProductItem
            key={product.id}
            product={product}
            view={view}
            loading={index < 8 ? 'eager' : 'lazy'}
          />
        );
      })}
    </div>
  );
}

const PRODUCT_ITEM_FRAGMENT = `#graphql
  fragment MoneyProductItem on MoneyV2 {
    amount
    currencyCode
  }
  fragment AllProductItem on Product {
    id
    handle
    title
    productType
    availableForSale
    tags
    variants(first: 10) {
      nodes {
        id
        title
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
    featuredImage {
      id
      altText
      url
      width
      height
    }
    priceRange {
      minVariantPrice {
        ...MoneyProductItem
      }
      maxVariantPrice {
        ...MoneyProductItem
      }
    }
    compareAtPriceRange {
      minVariantPrice {
        ...MoneyProductItem
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
    bogo_free_item: metafield(namespace: "custom", key: "bogo_free_item") {
      value
      reference {
        ... on ProductVariant {
          id
        }
      }
    }
  }
` as const;

export function CurrencyIcon({className}: {className?: string}) {
  return (
    <svg
      viewBox="0 0 1124.14 1256.39"
      className={`inline-block fill-current h-auto text-[#234745] ${className}`}
    >
      <path d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z"></path>
      <path d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z"></path>
    </svg>
  );
}

const CATALOG_QUERY = `#graphql
  query CatalogSearch(
    $country: CountryCode
    $language: LanguageCode
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
    $query: String!
    $filters: [ProductFilter!]
    $sortKey: SearchSortKeys
    $reverse: Boolean
  ) @inContext(country: $country, language: $language) {
    search(
      query: $query, 
      first: $first, 
      last: $last, 
      before: $startCursor, 
      after: $endCursor,
      types: [PRODUCT],
      productFilters: $filters,
      sortKey: $sortKey,
      reverse: $reverse
    ) {
      # Total matching products across all pages, not just this page's nodes.
      totalCount
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
           ...AllProductItem
        }
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
        startCursor
        endCursor
      }
    }
    collections(first: 50) {
      nodes {
        id
        handle
        title
        products(first: 250) {
          nodes {
            id
          }
        }
      }
    }
  }
  ${PRODUCT_ITEM_FRAGMENT}
` as const;
