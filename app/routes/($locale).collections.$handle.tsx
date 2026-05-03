import type {MetaFunction} from 'react-router';
import { createPortal } from 'react-dom';
import {data, redirect, type LoaderFunctionArgs} from 'react-router';
import {useLoaderData, Link, useOutletContext, useRouteLoaderData} from 'react-router';
import {ProductItem} from '~/components/ProductItem';
import {
  Pagination,
  getPaginationVariables,
  Image,
  Money,
  CartForm,
  Analytics,
} from '@shopify/hydrogen';
import type {ProductItemFragment} from 'storefrontapi.generated';
import {useVariantUrl} from '~/utils';
import {useState, useEffect} from 'react';
import {useAside} from '~/components/Aside';
import {getVisibilityStatus} from '~/lib/visibility';
import {useI18n} from '~/lib/i18n';
import {getIsOutOfStock} from '~/lib/stock';
import {Price} from '~/components/Price';
import {AddToCartButton} from '~/components/AddToCartButton';
import {StockNotificationModal} from '~/components/StockNotificationModal';

export const meta: MetaFunction<typeof loader> = ({data}) => {
  if (!data?.collection) {
    return [{title: 'Saadeddin Collections'}];
  }
  const { collection } = data;
  const title = `${collection.title} | Saadeddin`;
  const description = collection.description?.substring(0, 155) || `Explore our ${collection.title} collection at Saadeddin.`;
  
  return [
    { title: title.substring(0, 60) },
    { name: 'description', content: description.substring(0, 160) },
    { property: 'og:title', content: title.substring(0, 60) },
    { property: 'og:description', content: description.substring(0, 160) },
  ];
};

export async function loader({request, params, context}: LoaderFunctionArgs) {
  const {handle} = params;
  const {storefront} = context;
  const searchParams = new URL(request.url).searchParams;
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 8,
  });

  if (!handle) {
    return redirect('/collections');
  }

  // Parse filters from URL
  const filters: any[] = [];
  searchParams.forEach((value, key) => {
    if (key.startsWith('filter.')) {
      const parts = key.split('.');
      // Simple parsing: filter.v.price.min=10 or filter.v.option.size=small
      // Hydrogen/Shopify standard: { variantOption: { name: 'Size', value: 'small' } } 
      // or { price: { min: 10 } }
      if (parts[2] === 'price') {
        const type = parts[3]; // min or max
        const existing = filters.find(f => f.price);
        if (existing) {
          existing.price[type] = parseFloat(value);
        } else {
          filters.push({ price: { [type]: parseFloat(value) } });
        }
      } else if (parts[2] === 'option') {
        const optionName = parts[3];
        filters.push({ variantOption: { name: optionName, value } });
      } else if (parts[2] === 'availability') {
          filters.push({ available: value === 'true' });
      } else if (parts[2] === 'product_type') {
          filters.push({ productType: value });
      }
    }
  });

  const sortKey = searchParams.get('sortKey') || 'COLLECTION_DEFAULT';
  const reverse = searchParams.get('reverse') === 'true';

  const {collection} = await storefront.query(COLLECTION_QUERY, {
    variables: {
        handle, 
        ...paginationVariables,
        filters: filters.length > 0 ? filters : undefined,
        sortKey,
        reverse,
        country: storefront.i18n.country,
        language: storefront.i18n.language,
    } as any,
    cache: storefront.CacheNone(),
  });

  if (!collection) {
    return redirect(params.locale ? `/${params.locale}/collections` : '/collections');
  }
  return data({collection, filters});
}

export default function Collection() {
  const {collection} = useLoaderData<typeof loader>();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const rootData = useRouteLoaderData('root') as any;
  const menu = rootData?.header?.menu;
  const locale = rootData?.locale || 'ar';
  const isEn = locale === 'en';

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="collection-page" dir={isEn ? 'ltr' : 'rtl'}>
      <Analytics.CollectionView collection={collection} />
      {/* SEO Structured Data */}
      {typeof document !== 'undefined' && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "CollectionPage",
              "name": collection.title,
              "description": collection.description,
              "url": `${typeof window !== 'undefined' ? window.location.origin : ''}${isEn ? `/en/collections/${collection.handle}` : `/collections/${collection.handle}`}`,
              ...(collection.image && { "image": collection.image.url }),
              "mainEntity": {
                "@type": "ItemList",
                "itemListElement": collection.products.nodes.map((product: any, index: number) => ({
                    "@type": "ListItem",
                    "position": index + 1,
                    "item": {
                      "@type": "Product",
                      "name": product.title,
                      "url": `${typeof window !== 'undefined' ? window.location.origin : ''}${isEn ? `/en/products/${product.handle}` : `/products/${product.handle}`}`
                    }
                }))
              }
            })
          }}
        />
      )}

      {/* 1. Header Hero Section */}
      <CollectionHero collection={collection} />

      <div className="px-4 md:px-8 lg:px-12 py-12 max-w-[1440px] mx-auto text-right">

        {/* Horizontal Category Navigation */}
        {menu?.items && menu.items.length > 0 && (
          <div className="mb-12 overflow-x-auto hide-scrollbars">
            <div className="flex gap-4 pb-2 w-max">
              {menu.items.map((item: any) => {
                const getHandle = (url?: string) => {
                  if (!url) return '';
                  try {
                    const u = new URL(url);
                    const parts = u.pathname.split('/').filter(Boolean);
                    return parts[parts.length - 1] || '';
                  } catch {
                    const parts = url.split('/').filter(Boolean);
                    return parts[parts.length - 1] || '';
                  }
                };
                
                const itemHandle = getHandle(item.url);
                const isActive = itemHandle === collection.handle;

                return (
                  <Link
                    key={item.id}
                    to={`/collections/${itemHandle}`}
                    className={`px-8 py-4 rounded-[1.5rem] font-bold text-center transition-all duration-300 shadow-sm border ${
                      isActive 
                        ? 'bg-[#1b3d2e] text-white border-[#1b3d2e] shadow-md scale-105' 
                        : 'bg-white text-gray-600 border-gray-100 hover:border-[#1b3d2e]/30 hover:shadow-md'
                    }`}
                  >
                    {item.title}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
          <div className="flex items-center gap-4">
            <button 
                onClick={() => setIsFilterOpen(true)}
                className="flex items-center gap-2.5 px-6 py-3.5 bg-[#1b3d2e] text-white rounded-2xl font-bold hover:bg-[#2d5e4a] transition-all shadow-md active:scale-95 group"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-12 transition-transform"><path d="M22 3H2l8 9v11l4-6V12L22 3z"/></svg>
              <span>{isEn ? 'Filter' : 'تـصـفـيـة'}</span>
            </button>
            <div className="h-10 w-[1px] bg-gray-100 hidden md:block"></div>
            <p className="text-gray-400 font-bold hidden md:block">
                {isEn ? `Found ${collection.products.nodes.length} products` : `يوجد ${collection.products.nodes.length} منتج`}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Sort Dropdown */}
            <div className="flex items-center bg-gray-50 border border-gray-100 rounded-2xl px-3 py-2">
              <span className={`text-gray-400 text-sm font-bold ${isEn ? 'mr-0' : 'ml-0'}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15l4 4 4-4M8 19V5M20 9l-4-4-4 4M16 5v14"/></svg>
              </span>
              <select
                className="bg-transparent text-sm font-bold text-[#1b3d2e] cursor-pointer focus:outline-none focus:ring-0 border-none appearance-none px-2"
                style={{ WebkitAppearance: 'none', appearance: 'none', background: 'transparent' }}
                onChange={(e) => {
                  const [key, rev] = e.target.value.split('|');
                  const params = new URLSearchParams(window.location.search);
                  params.set('sortKey', key);
                  params.set('reverse', rev);
                  window.location.search = params.toString();
                }}
                defaultValue={typeof window !== 'undefined' ? `${new URLSearchParams(window.location.search).get('sortKey') || 'COLLECTION_DEFAULT'}|${new URLSearchParams(window.location.search).get('reverse') || 'false'}` : 'COLLECTION_DEFAULT|false'}
              >
                <option value="COLLECTION_DEFAULT|false">{isEn ? 'Featured' : 'مميز'}</option>
                <option value="BEST_SELLING|false">{isEn ? 'Best Selling' : 'الأكثر مبيعاً'}</option>
                <option value="PRICE|false">{isEn ? 'Price: Low to High' : 'السعر: من الأقل للأعلى'}</option>
                <option value="PRICE|true">{isEn ? 'Price: High to Low' : 'السعر: من الأعلى للأقل'}</option>
                <option value="CREATED|true">{isEn ? 'Newest Arrivals' : 'الأحدث'}</option>
              </select>
            </div>

            {/* View Toggle */}
            <div className="flex items-center bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
              <button
                onClick={() => setView('grid')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-300 font-bold text-sm ${
                  view === 'grid' 
                    ? 'bg-white text-[#1b3d2e] shadow-md border border-gray-100' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
              </button>
              <button
                onClick={() => setView('list')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-300 font-bold text-sm ${
                  view === 'list' 
                    ? 'bg-white text-[#1b3d2e] shadow-md border border-gray-100' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
              </button>
            </div>
          </div>
        </div>

        <Pagination connection={collection.products}>
          {({nodes, isLoading, PreviousLink, NextLink}) => (
            <>
              <div className="flex justify-center mb-10">
                <PreviousLink className="text-[#1b3d2e] font-black border-2 border-[#1b3d2e]/10 px-8 py-2.5 rounded-full hover:bg-gray-50 transition-all">
                  {isLoading ? (isEn ? 'Loading...' : 'جاري التحميل...') : <span>{isEn ? '↑ Load Previous' : '↑ تحميل المنتجات السابقة'}</span>}
                </PreviousLink>
              </div>
              <ProductsGrid products={nodes} view={view} />
              <div className="flex justify-center mt-16">
                <NextLink className="bg-[#1b3d2e] text-white px-16 py-4 rounded-full font-black shadow-[0_10px_30px_rgba(27,61,46,0.3)] hover:shadow-[0_15px_40px_rgba(27,61,46,0.4)] hover:-translate-y-1 transition-all duration-300">
                  {isLoading ? (isEn ? 'Loading...' : 'جاري التحميل...') : <span>{isEn ? 'Browse More ↓' : 'تصفح المزيد ↓'}</span>}
                </NextLink>
              </div>
            </>
          )}
        </Pagination>
        </div>
      </div>


      {/* Filter Sidebar */}
      {mounted && typeof document !== 'undefined' && createPortal(
        <div className={`fixed inset-0 z-[999999] pointer-events-none transition-all duration-500 ${isFilterOpen ? 'visible' : 'invisible'}`}>
            <div 
              className={`absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-500 ${isFilterOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0'}`}
              onClick={() => setIsFilterOpen(false)}
            />
            <div className={`absolute left-0 top-0 bottom-0 w-full max-w-sm bg-[#FEF8EB] shadow-2xl transition-transform duration-500 ${isFilterOpen ? 'translate-x-0 pointer-events-auto' : '-translate-x-full'}`}>
               <FilterSidebar filters={collection.products.filters} onClose={() => setIsFilterOpen(false)} />
            </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function CollectionHero({ collection }: { collection: any }) {
    return (
        <section className="relative h-[400px] w-full bg-[#FEF8EB] overflow-hidden flex items-center justify-center">
            {/* Background Texture */}
            <div 
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231b3d2e' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }}
            />
            {collection.image && (
                <div className="absolute inset-0 scale-105 blur-[2px] opacity-10">
                    <Image data={collection.image} className="w-full h-full object-cover" sizes="100vw" />
                </div>
            )}
            
            <div className="relative text-center px-4 max-w-4xl">
                <div className="inline-flex items-center gap-2 bg-[#1b3d2e]/5 border border-[#1b3d2e]/10 text-[#1b3d2e] px-4 py-1.5 rounded-full text-[13px] font-black mb-6">
                    <span className="text-yellow-500 text-[15px]">⭐</span>
                    {collection.title}
                </div>
                <h1 className="text-5xl md:text-7xl font-black text-[#1b3d2e] mb-6 drop-shadow-sm leading-tight">
                    {collection.title}
                </h1>
                <p className="text-gray-500 text-lg md:text-xl font-bold leading-relaxed opacity-80 max-w-2xl mx-auto">
                    {collection.description}
                </p>
            </div>
            
            {/* Bottom Curve/Wave */}
            <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none">
                <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-[calc(100% + 1.3px)] h-[50px] fill-white">
                    <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C57.54,106.66,117.7,112.92,177,109.83,230.19,107.12,282.49,63.78,321.39,56.44Z"></path>
                </svg>
            </div>
        </section>
    );
}

function FilterSidebar({ filters, onClose }: { filters: any[], onClose: () => void }) {
    return (
        <div className="flex flex-col h-full overflow-hidden" dir="rtl">
            <header className="p-8 border-b border-gray-100 flex items-center justify-between shrink-0">
                <h2 className="text-2xl font-black text-[#1b3d2e]">تصفية النتائج</h2>
                <button onClick={onClose} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-[#1b3d2e] hover:bg-red-50 hover:text-red-500 transition-all font-bold text-2xl">
                    &times;
                </button>
            </header>
            
            <FilterForm onClose={onClose} filters={filters} />
        </div>
    );
}

function FilterForm({ filters, onClose }: { filters: any[], onClose: () => void }) {
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');

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
                {/* Search within collection */}
                <div className="mb-10">
                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">بحث في هذه المجموعة</h3>
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="ما الذي تبحث عنه؟" 
                            defaultValue={typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('q') || '' : ''}
                            className="w-full bg-white border-2 border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:outline-none focus:border-[#1b3d2e] transition-all"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const val = e.currentTarget.value;
                                    const params = new URLSearchParams(window.location.search);
                                    if (val) params.set('q', val);
                                    else params.delete('q');
                                    window.location.search = params.toString();
                                }
                            }}
                        />
                        <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    </div>
                </div>

                {filters.map((filter) => (
                    <div key={filter.id} className="mb-10">
                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6">
                            {filter.label}
                        </h3>
                        {filter.type === 'LIST' ? (
                            <div className="flex flex-wrap gap-2.5">
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
                                            className={`px-5 py-2.5 border-2 rounded-2xl text-[14px] font-bold transition-all active:scale-95 ${
                                                isActive 
                                                    ? 'bg-[#1b3d2e] border-[#1b3d2e] text-white' 
                                                    : 'bg-white border-gray-100 text-gray-700 hover:border-[#1b3d2e] hover:bg-gray-50'
                                            }`}
                                        >
                                            {value.label}
                                            <span className={`ms-1.5 text-[11px] font-medium ${isActive ? 'text-white/60' : 'text-gray-300'}`}>{value.count}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        ) : filter.type === 'PRICE_RANGE' ? (
                            <div className="space-y-4">
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="text-[10px] font-black text-gray-400 block mb-1">الحد الأدنى</label>
                                        <input 
                                            type="number" 
                                            value={minPrice}
                                            onChange={(e) => setMinPrice(e.target.value)}
                                            placeholder="٠" 
                                            className="w-full bg-white border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-[#1b3d2e] transition-all" 
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[10px] font-black text-gray-400 block mb-1">الحد الأقصى</label>
                                        <input 
                                            type="number" 
                                            value={maxPrice}
                                            onChange={(e) => setMaxPrice(e.target.value)}
                                            placeholder="٥٠٠+" 
                                            className="w-full bg-white border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-[#1b3d2e] transition-all" 
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
                  className="w-full bg-[#1b3d2e] text-white py-5 rounded-2xl font-black text-lg shadow-[0_10px_30px_rgba(27,61,46,0.25)] hover:shadow-[0_15px_40px_rgba(27,61,46,0.35)] active:scale-95 transition-all"
                >
                    تـطـبـيـق الـفـلاتـر
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

function ProductsGrid({products, view}: {products: any[], view: 'grid' | 'list'}) {
  const containerClasses = view === 'grid'
    ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 lg:gap-8"
    : "flex flex-col gap-5";

  return (
    <div className={containerClasses}>
      {products.map((product, index) => {
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
  }
` as const;

// NOTE: https://shopify.dev/docs/api/storefront/2022-04/objects/collection
const COLLECTION_QUERY = `#graphql
  ${PRODUCT_ITEM_FRAGMENT}
  query Collection(
    $handle: String!
    $country: CountryCode
    $language: LanguageCode
    $filters: [ProductFilter!]
    $sortKey: ProductCollectionSortKeys
    $reverse: Boolean
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      id
      handle
      title
      description
      image {
        id
        url
        altText
        width
        height
      }
      products(
        first: $first,
        last: $last,
        before: $startCursor,
        after: $endCursor,
        filters: $filters
        sortKey: $sortKey,
        reverse: $reverse
      ) {
        nodes {
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
        }
        filters {
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
          hasPreviousPage
          hasNextPage
          startCursor
          endCursor
        }
      }
    }
  }
` as const;

