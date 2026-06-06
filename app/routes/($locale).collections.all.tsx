import {data, type LoaderFunctionArgs, type MetaFunction, useLoaderData, Link, useRouteLoaderData, useNavigate, useSearchParams, useSubmit, useLocation} from 'react-router';
import {getPaginationVariables, Pagination, Image} from '@shopify/hydrogen';
import {ProductItem} from '~/components/ProductItem';
import {useState, useEffect, Fragment} from 'react';
import { createPortal } from 'react-dom';
import patternBg from '~/assets/patteren-collection-header.svg';

export const meta: MetaFunction = () => {
  return [{title: `Saadeddin | All Products`}];
};

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
      } else if (key.startsWith('filter.p.m.')) {
         const namespace = parts[3];
         const k = parts[4];
         filters.push({
           productMetafield: { namespace, key: k, value }
         });
      }
    }
  });

  let sortKey = searchParams.get('sortKey') || 'RELEVANCE';
  if (sortKey !== 'RELEVANCE' && sortKey !== 'PRICE') {
      sortKey = 'RELEVANCE';
  }
  const reverse = searchParams.get('reverse') === 'true';
  const q = searchParams.get('q') || '*';

  try {
    const response = await storefront.query(CATALOG_QUERY, {
      variables: {
          ...paginationVariables,
          query: q, 
          filters: filters.length > 0 ? filters : undefined,
          sortKey: sortKey as any,
          country: storefront.i18n.country,
          language: storefront.i18n.language,
      },
      cache: storefront.CacheNone(),
    });
    
    // Filter by selected collections manually if 'category' params exist
    const selectedCategories = url.searchParams.getAll('category');
    let products = response.search;
    
    if (selectedCategories.length > 0) {
        try {
            const collectionPromises = selectedCategories.map(handle => 
                storefront.query(COLLECTION_FILTER_QUERY, {
                    variables: {
                        handle,
                        country: storefront.i18n.country,
                        language: storefront.i18n.language,
                    },
                    cache: storefront.CacheNone(),
                })
            );
            
            const results = await Promise.all(collectionPromises);
            const mergedNodes: any[] = [];
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
            
            // If search query exists, filter merged nodes by title
            let finalNodes = mergedNodes;
            if (q && q !== '*') {
                const searchLower = q.toLowerCase();
                finalNodes = mergedNodes.filter(n => n.title.toLowerCase().includes(searchLower));
            }
            
            products = {
                ...products,
                nodes: finalNodes,
                pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null }
            };
        } catch(e) {
            console.error("Failed to fetch collections", e);
        }
    }

    if (!response.search) {
      return data({products: null, collections: null, error: "GraphQL query returned null. " + JSON.stringify(response)});
    }
    
    return data({products, collections: response.collections?.nodes || [], error: null});
  } catch (e: any) {
    return data({products: null, collections: null, error: e.message || String(e)});
  }
}

const COLLECTION_FILTER_QUERY = `#graphql
  fragment ProductItem on Product {
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
        storeAvailability(first: 5) {
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
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      products(first: 100) {
        nodes {
          ...ProductItem
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
      return <div className="p-20 text-center font-bold">Failed to load products or no products found. <br/><span className="text-red-500">{error}</span></div>;
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
      <CollectionAllHero title={isEn ? 'All Products' : 'جميع المنتجات'} productsCount={products.nodes?.length || 0} isEn={isEn} />

      <div className="bg-white border-b border-gray-100">
        <div className="px-4 md:px-8 lg:px-12 py-4 max-w-[1440px] mx-auto text-right text-[13px] font-black flex items-center gap-2">
            <span className="text-gray-400">{isEn ? 'Home' : 'الرئيسية'}</span>
            <span className="text-gray-300">/</span>
            <span className="text-gray-800">{isEn ? 'All Products' : 'جميع المنتجات'}</span>
        </div>
      </div>

      <div className="bg-[#FEF8EB] min-h-screen">
          <div className="px-4 md:px-8 lg:px-12 py-10 max-w-[1440px] mx-auto text-right">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div className="flex-1 flex items-center justify-end">
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
                        const params = new URLSearchParams(searchParams);
                        params.set('sortKey', key);
                        params.set('reverse', rev);
                        setSearchParams(params, { preventScrollReset: true });
                      }}
                      value={`${searchParams.get('sortKey') || 'RELEVANCE'}|${searchParams.get('reverse') || 'false'}`}
                    >
                      <option value="RELEVANCE|false">{isEn ? 'Featured' : 'الأكثر صلة'}</option>
                      <option value="PRICE|false">{isEn ? 'Price: Low to High' : 'السعر: من الأقل للأعلى'}</option>
                      <option value="PRICE|true">{isEn ? 'Price: High to Low' : 'السعر: من الأعلى للأقل'}</option>
                    </select>
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap justify-start flex-1">
                 <button 
                    onClick={() => setIsFilterOpen(true)}
                    className="lg:hidden flex items-center gap-2.5 px-5 py-2.5 bg-white border border-gray-200 text-[#234745] rounded-xl font-bold hover:bg-gray-50 transition-all shadow-sm active:scale-95 group"
                 >
                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 3H2l8 9v11l4-6V12L22 3z"/></svg>
                   <span>{isEn ? 'Filter' : 'تـصـفـيـة'}</span>
                 </button>

                 <ActiveFilterChips isEn={isEn} />
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 items-start">
              <div className="flex-1 min-w-0 w-full lg:order-2">
                <Pagination connection={products}>
              {({nodes, isLoading, PreviousLink, NextLink}) => {
                const filteredNodes = nodes.filter((n: any) => {
                    if (q && !n.title.toLowerCase().includes(q)) return false;
                    return true;
                });

                return (
                <>
                  <div className="flex justify-center mb-10">
                    <PreviousLink className="text-[#234745] font-black border-2 border-[#234745]/10 px-8 py-2.5 rounded-full hover:bg-gray-50 transition-all">
                      {isLoading ? (isEn ? 'Loading...' : 'جاري التحميل...') : <span>{isEn ? '↑ Load Previous' : '↑ تحميل المنتجات السابقة'}</span>}
                    </PreviousLink>
                  </div>
                  
                  {filteredNodes.length === 0 && (
                      <div className="py-12 text-center text-[#234745] font-bold text-lg w-full">
                          {isEn ? 'No products match your search.' : 'لا توجد منتجات تطابق بحثك.'}
                      </div>
                  )}
                  <ProductsGrid products={filteredNodes} view={view} />
                  <div className="flex justify-center mt-16">
                    <NextLink className="bg-[#234745] text-white px-16 py-4 rounded-full font-black shadow-[0_10px_30px_rgba(27,61,46,0.3)] hover:shadow-[0_15px_40px_rgba(27,61,46,0.4)] hover:-translate-y-1 transition-all duration-300">
                      {isLoading ? (isEn ? 'Loading...' : 'جاري التحميل...') : <span>{isEn ? 'Browse More ↓' : 'تصفح المزيد ↓'}</span>}
                    </NextLink>
                  </div>
                </>
              )}}
            </Pagination>
              </div>

              <div className="hidden lg:block w-72 shrink-0">
                 <FilterSidebar filters={products.productFilters} collections={collections || []} onClose={() => {}} isDesktop={true} isEn={isEn} />
              </div>
            </div>
          </div>
      </div>

      {mounted && typeof document !== 'undefined' && createPortal(
        <div className={`fixed inset-0 z-[999999] pointer-events-none transition-all duration-500 ${isFilterOpen ? 'visible' : 'invisible'}`}>
            <div 
              className={`absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-500 ${isFilterOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0'}`}
              onClick={() => setIsFilterOpen(false)}
            />
            <div className={`fixed inset-y-0 ${isEn ? 'left-0' : 'right-0'} w-full max-w-sm bg-[#FEF8EB] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isFilterOpen ? 'translate-x-0' : (isEn ? '-translate-x-full' : 'translate-x-full')}`}>
               <FilterSidebar filters={products.productFilters} collections={collections || []} onClose={() => setIsFilterOpen(false)} isEn={isEn} />
            </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function CollectionAllHero({ title, productsCount, isEn }: { title: string, productsCount: number, isEn: boolean }) {
    return (
        <section className="relative h-[144px] w-full bg-[#234745] overflow-hidden flex items-center" dir={isEn ? 'ltr' : 'rtl'}>
            <div 
                className="absolute inset-0"
                style={{
                    backgroundImage: `url(${patternBg})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            />
            <div className="relative z-10 w-full max-w-[1440px] mx-auto px-4 md:px-8 lg:px-12 flex items-center justify-between">
                
                {/* Right Side: Title and Back Button */}
                <div className={`flex flex-col ${isEn ? 'items-start' : 'items-end'} gap-[8px]`}>
                    <div className="flex items-center gap-[24px]" dir={isEn ? 'ltr' : 'rtl'}>
                        <button onClick={() => window.history.back()} className={`flex items-center gap-[8px] bg-[#9FB7AE] hover:bg-[#8BA19C] text-[#234745] px-6 py-2 rounded-[25px] text-[16px] font-bold transition-all ${isEn ? 'font-en' : ''}`} style={isEn ? {} : { fontFamily: "'GE Dinar One', sans-serif" }} dir={isEn ? 'ltr' : 'rtl'}>
                            <svg className={`w-5 h-5 ${isEn ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                            <span>{isEn ? 'Back' : 'رجوع'}</span>
                        </button>
                        <h1 className={`text-[32px] md:text-[40px] font-bold text-white drop-shadow-sm ${isEn ? 'text-left font-en' : 'text-right'}`} style={isEn ? {} : { fontFamily: "'GE Dinar One', sans-serif" }} dir={isEn ? 'ltr' : 'rtl'}>
                            {title}
                        </h1>
                    </div>
                </div>

                {/* Left Side in RTL (Second child): Product Count */}
                <div className={`bg-[#FEF8EB] text-[#234745] px-6 py-2 rounded-[25px] text-[16px] font-bold shadow-sm shrink-0 ${isEn ? 'font-en' : ''}`} style={isEn ? {} : { fontFamily: "'GE Dinar One', sans-serif" }}>
                    <span className="font-en">{productsCount}</span> {isEn ? 'Products' : 'منتجات'}
                </div>

            </div>
        </section>
    );
}

export function ActiveFilterChips({ isEn }: { isEn: boolean }) {
    const [params, setParams] = useState<URLSearchParams | null>(null);
    useEffect(() => {
        setParams(new URLSearchParams(window.location.search));
    }, []);

    if (!params) return null;

    const chips: { key: string, label: React.ReactNode }[] = [];
    params.forEach((value, key) => {
        if (key === 'q' || key === 'cursor' || key === 'sortKey' || key === 'reverse') return;
        
        let label: React.ReactNode = value;
        if (key === 'filter.v.price.min') label = <span className="flex items-center gap-1">{isEn ? `Min: ${value}` : `الأقل: ${value}`} <CurrencyIcon className="w-[14px] mt-0.5" /></span>;
        if (key === 'filter.v.price.max') label = <span className="flex items-center gap-1">{isEn ? `Max: ${value}` : `الأعلى: ${value}`} <CurrencyIcon className="w-[14px] mt-0.5" /></span>;

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

export function FilterSidebar({ filters, collections, onClose, isDesktop = false, isEn, hideSearchInput = false }: { filters: any[], collections: any[], onClose: () => void, isDesktop?: boolean, isEn?: boolean, hideSearchInput?: boolean }) {
    const submit = useSubmit();
    const location = useLocation();
    const [searchQuery, setSearchQuery] = useState('');
    const [openSections, setOpenSections] = useState<{[key: string]: boolean}>({
        'categories': true,
        'price': true
    });
    
    // Price state
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');

    useEffect(() => {
        const initialOpen: {[key: string]: boolean} = {};
        filters?.forEach(f => {
            initialOpen[f.id] = true; 
        });
        setOpenSections(prev => ({...initialOpen, ...prev}));
    }, [filters]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setSearchQuery(params.get('q') || '');
        const priceParam = params.get('filter.v.price');
        if (priceParam) {
            try {
                const parsed = JSON.parse(priceParam);
                if (parsed.gte) setMinPrice(parsed.gte.toString());
                if (parsed.lte) setMaxPrice(parsed.lte.toString());
            } catch(e) {}
        } else {
            setMinPrice('');
            setMaxPrice('');
        }
    }, [location.search]);

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        const params = new URLSearchParams(window.location.search);
        if (value.trim()) {
            params.set('q', value);
        } else {
            params.delete('q');
        }
        submit(params, { replace: true, preventScrollReset: true });
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSearchChange(searchQuery);
    };

    const toggleSection = (id: string) => {
        setOpenSections(prev => ({...prev, [id]: !prev[id]}));
    };

    const toggleParamLink = (key: string, value: string) => {
        const params = new URLSearchParams(window.location.search);
        const currentValues = params.getAll(key);
        if (currentValues.includes(value)) {
            params.delete(key);
            currentValues.filter(v => v !== value).forEach(v => params.append(key, v));
        } else {
            params.append(key, value);
        }
        submit(params, { replace: true, preventScrollReset: true });
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
            submit(params, { replace: true, preventScrollReset: true });
        } catch(e) {}
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
        submit(params, { replace: true, preventScrollReset: true });
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
        submit(params, { replace: true, preventScrollReset: true });
    };

    const clearPrice = (e: React.MouseEvent) => {
        e.stopPropagation();
        setMinPrice('');
        setMaxPrice('');
        const params = new URLSearchParams(window.location.search);
        params.delete('filter.v.price');
        submit(params, { replace: true, preventScrollReset: true });
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
        
        submit(newParams, { replace: true, preventScrollReset: true });
    };

    const pricePresets = [
        { label: <span className="flex items-center gap-1">{isEn ? 'Under 100' : <span>أقل من <span className="font-en">100</span></span>} <CurrencyIcon className="w-[16px] -mt-0.5" /></span>, min: '', max: '100' },
        { label: <span className="flex items-center gap-1">{isEn ? '100 - 200' : <span><span className="font-en">100</span> - <span className="font-en">200</span></span>} <CurrencyIcon className="w-[16px] -mt-0.5" /></span>, min: '100', max: '200' },
        { label: <span className="flex items-center gap-1">{isEn ? '200 - 400' : <span><span className="font-en">200</span> - <span className="font-en">400</span></span>} <CurrencyIcon className="w-[16px] -mt-0.5" /></span>, min: '200', max: '400' },
        { label: <span className="flex items-center gap-1">{isEn ? 'Over 400' : <span>أكثر من <span className="font-en">400</span></span>} <CurrencyIcon className="w-[16px] -mt-0.5" /></span>, min: '400', max: '' }
    ];

    const currentParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
    
    return (
        <div className={`flex flex-col h-full ${isDesktop ? 'bg-white border border-[#BBCFCD]/50 rounded-[24px] w-[302px] box-border py-6' : 'bg-white overflow-hidden'}`} dir={isEn ? 'ltr' : 'rtl'}>
            {!isDesktop && (
              <header className="p-6 border-b border-[#BBCFCD]/50 flex items-center justify-between shrink-0">
                  <h2 className={`text-xl font-black text-[#234745] ${isEn ? 'font-en' : "font-['GE_Dinar_One']"}`}>{isEn ? 'Filters' : 'تصفية النتائج'}</h2>
                  <button onClick={onClose} className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
              </header>
            )}

            {/* Content Container */}
            <div className={`flex-1 flex flex-col items-center gap-4 ${isDesktop ? 'px-0' : 'overflow-y-auto p-4'}`}>
                
                {/* Search Bar */}
                {!hideSearchInput && (
                    <>
                        <div className="w-[270px] bg-[#BBCFCD] border border-[#BBCFCD]/50 rounded-[25px] px-4 py-3 flex flex-col justify-center">
                            <form onSubmit={handleSearchSubmit} className="relative flex items-center gap-2">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#234745" strokeWidth="1.25" className="shrink-0">
                                    <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                </svg>
                                <input 
                                    type="text" 
                                    placeholder={isEn ? 'Search products...' : 'إبحث في المنتجات...'} 
                                    value={searchQuery}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                    className={`w-full bg-transparent text-[14px] ${isEn ? 'font-en' : "font-['GE_Dinar_One']"} text-[#234745] placeholder-[#234745] focus:outline-none`}
                                />
                            </form>
                        </div>

                        <div className="w-[302px] border-t border-[#BBCFCD]/50 my-0" />
                    </>
                )}

                {/* Categories - Dynamic from Collections */}
                {collections && collections.length > 0 && (
                    <div className="w-[270px] flex flex-col gap-4">
                        <button type="button" onClick={() => toggleSection('categories')} className="flex items-center justify-between w-full outline-none group">
                            <h3 className={`text-[16px] font-bold ${isEn ? 'font-en' : "font-['GE_Dinar_One']"} text-[#171717]`}>{isEn ? 'Categories' : 'الأقسام'}</h3>
                            <svg className={`w-4 h-4 text-[#234745] transition-transform duration-300 ${openSections['categories'] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        <div className={`flex flex-col gap-4 transition-all duration-300 overflow-hidden ${openSections['categories'] ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                            {collections.map((collection: any) => {
                                const isActive = currentParams.getAll('category').includes(collection.handle);
                                return (
                                    <button type="button" key={collection.id} onClick={() => toggleParamLink('category', collection.handle)} className="flex items-center justify-between w-full outline-none group text-start">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${isActive ? 'bg-[#234745]' : 'border-[1.14px] border-[#BBCFCD] bg-white group-hover:border-[#234745]'}`}>
                                                {isActive && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                            </div>
                                            <span className={`text-[16px] font-medium ${isEn ? 'font-en' : "font-['GE_Dinar_One']"} transition-colors ${isActive ? 'text-[#234745]' : 'text-[#7D7D7D] group-hover:text-[#234745]'}`}>{collection.title}</span>
                                        </div>
                                        <span className={`text-[16px] font-medium ${isEn ? 'font-en' : "font-['GE_Dinar_One']"} text-[#7D7D7D]`}>&nbsp;</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="w-[302px] border-t border-[#BBCFCD]/50 my-0" />

                {/* Price */}
                <div className="w-[270px] flex flex-col gap-4">
                    <button type="button" onClick={() => toggleSection('price')} className="flex items-center justify-between w-full outline-none group">
                        <h3 className={`text-[16px] font-bold ${isEn ? 'font-en' : "font-['GE_Dinar_One']"} text-[#171717] flex items-center gap-1`}>{isEn ? 'Price' : 'السعر'} <CurrencyIcon className="w-[18px]" /></h3>
                        <div className="flex items-center gap-6">
                            {(minPrice || maxPrice) && (
                                <span onClick={clearPrice} className={`text-[16px] font-bold ${isEn ? 'font-en' : "font-['GE_Dinar_One']"} text-[#E64950]`}>{isEn ? 'Clear' : 'مسح'}</span>
                            )}
                            <svg className={`w-4 h-4 text-[#234745] transition-transform duration-300 ${openSections['price'] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </button>
                    <div className={`flex flex-col gap-4 transition-all duration-300 overflow-hidden ${openSections['price'] ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 border border-[#BBCFCD] rounded-[16px] px-4 py-2 flex items-center justify-between">
                                <span className={`text-[16px] font-medium ${isEn ? 'font-en' : "font-['GE_Dinar_One']"} text-[#7D7D7D]`}>{isEn ? 'From' : 'من'}</span>
                                <input type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="w-12 bg-transparent text-center focus:outline-none" />
                            </div>
                            <span className="text-[16px] font-medium text-[#255441]">-</span>
                            <div className="flex-1 border border-[#BBCFCD] rounded-[16px] px-4 py-2 flex items-center justify-between">
                                <span className={`text-[16px] font-medium ${isEn ? 'font-en' : "font-['GE_Dinar_One']"} text-[#7D7D7D]`}>{isEn ? 'To' : 'إلي'}</span>
                                <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="w-12 bg-transparent text-center focus:outline-none" />
                            </div>
                        </div>
                        <button type="button" onClick={handlePriceApply} className={`w-[270px] bg-[#234745] text-[#FEF8EB] rounded-[25px] py-2.5 text-[16px] font-medium ${isEn ? 'font-en' : "font-['GE_Dinar_One']"} hover:opacity-90 transition-opacity`}>{isEn ? 'Apply' : 'تطبيق'}</button>
                        <div className="flex flex-col gap-3 mt-2">
                            {pricePresets.map((preset, i) => {
                                const isActive = minPrice === preset.min && maxPrice === preset.max;
                                return (
                                    <button type="button" key={i} onClick={() => setPricePreset(preset.min, preset.max)} className="flex items-center justify-start gap-2 w-full outline-none group">
                                        <div className={`w-6 h-6 rounded-full border-2 transition-colors flex items-center justify-center ${isActive ? 'border-[#234745]' : 'border-[#BBCFCD] group-hover:border-[#234745]'}`}>
                                            {isActive && <div className="w-2.5 h-2.5 bg-[#234745] rounded-full" />}
                                        </div>
                                        <span className={`text-[16px] font-medium ${isEn ? 'font-en' : "font-['GE_Dinar_One']"} transition-colors ${isActive ? 'text-[#234745]' : 'text-[#7D7D7D] group-hover:text-[#234745]'}`}>{preset.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Dynamic Filters from Shopify (Occasions, Dietary Types, etc) */}
                {filters?.map((filter) => {
                    if (filter.id === 'filter.v.price' || filter.type !== 'LIST' || filter.values.length === 0) return null;

                    return (
                        <Fragment key={filter.id}>
                            <div className="w-[302px] border-t border-[#BBCFCD]/50 my-0" />
                            <div className="w-[270px] flex flex-col gap-4">
                                <button type="button" onClick={() => toggleSection(filter.id)} className="flex items-center justify-between w-full outline-none group">
                                    <h3 className={`text-[16px] font-bold ${isEn ? 'font-en' : "font-['GE_Dinar_One']"} text-[#171717]`}>{filter.label}</h3>
                                    <svg className={`w-4 h-4 text-[#234745] transition-transform duration-300 ${openSections[filter.id] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                <div className={`flex flex-col gap-4 transition-all duration-300 overflow-hidden ${openSections[filter.id] ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                    {filter.values.map((item: any, i: number) => {
                                        const isActive = isFilterActive(item.input, currentParams);
                                        return (
                                            <button type="button" key={item.id || i} onClick={() => toggleFilterLink(item.input)} className="flex items-center justify-between w-full outline-none group text-start">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${isActive ? 'bg-[#234745]' : 'border-[1.14px] border-[#BBCFCD] bg-white group-hover:border-[#234745]'}`}>
                                                        {isActive && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                                    </div>
                                                    <span className={`text-[16px] font-medium ${isEn ? 'font-en' : "font-['GE_Dinar_One']"} transition-colors ${isActive ? 'text-[#234745]' : 'text-[#7D7D7D] group-hover:text-[#234745]'}`}>{item.label}</span>
                                                </div>
                                                <span className={`text-[16px] font-medium ${isEn ? 'font-en' : "font-['GE_Dinar_One']"} text-[#7D7D7D]`}>{item.count > 0 ? <>(<span className="font-en">{item.count}</span>)</> : ''}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </Fragment>
                    );
                })}
            </div>

            <div className={`px-4 mt-6 shrink-0`}>
                <button 
                    type="button"
                    onClick={handleClearAll}
                    className={`w-full border border-[#234745] text-[#234745] rounded-[25px] py-2.5 text-[16px] font-medium ${isEn ? 'font-en' : "font-['GE_Dinar_One']"} hover:bg-gray-50 transition-colors flex items-center justify-center`}
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

function ProductsGrid({products, view}: {products: any[], view: 'grid' | 'list'}) {
  const containerClasses = view === 'grid'
    ? "grid grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
    : "flex flex-col gap-5";

  return (
    <div className={containerClasses}>
      {products.map((product: any, index: number) => {
        return (
          <ProductItem
            key={product.id}
            product={product}
            view={view}
            loading={index < 8 ? 'eager' : undefined}
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
  fragment ProductItem on Product {
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
    <svg viewBox="0 0 1124.14 1256.39" className={`inline-block fill-current h-auto text-[#234745] ${className}`}>
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
  ) @inContext(country: $country, language: $language) {
    search(
      query: $query, 
      first: $first, 
      last: $last, 
      before: $startCursor, 
      after: $endCursor,
      types: [PRODUCT],
      productFilters: $filters,
      sortKey: $sortKey
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
           ...ProductItem
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
      }
    }
  }
  ${PRODUCT_ITEM_FRAGMENT}
` as const;
