import type {MetaFunction} from 'react-router';
import { createPortal } from 'react-dom';
import {data, redirect, type LoaderFunctionArgs} from 'react-router';
import {useLoaderData, Link, useOutletContext, useRouteLoaderData, useNavigate, useSearchParams} from 'react-router';
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
import patternBg from '~/assets/patteren-collection-header.svg';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q')?.toLowerCase() || '';
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

      {/* Breadcrumb Strip */}
      <div className="bg-white border-b border-gray-100">
        <div className="px-4 md:px-8 lg:px-12 py-4 max-w-[1440px] mx-auto text-right text-[13px] font-black flex items-center gap-2">
            <span className="text-gray-400">الرئيسية</span>
            <span className="text-gray-300">/</span>
            <span className="text-gray-800">{collection.title}</span>
        </div>
      </div>

      <div className="bg-[#FEF8EB] min-h-screen">
          <div className="px-4 md:px-8 lg:px-12 py-10 max-w-[1440px] mx-auto text-right">
            {/* Two Column PLP Layout */}
            <div className="flex flex-col lg:flex-row gap-8 items-start">
          
          {/* Main Content (Left side in RTL) */}
          <div className="flex-1 min-w-0 w-full lg:order-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              
              {/* Active Filters / Mobile Filter Button */}
              <div className="flex items-center flex-wrap gap-2 flex-1">
                <button 
                    onClick={() => setIsFilterOpen(true)}
                    className="lg:hidden flex items-center gap-2.5 px-5 py-2.5 bg-white border border-gray-200 text-[#234745] rounded-xl font-bold hover:bg-gray-50 transition-all shadow-sm active:scale-95 group"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 3H2l8 9v11l4-6V12L22 3z"/></svg>
                  <span>{isEn ? 'Filter' : 'تـصـفـيـة'}</span>
                </button>

                 {/* Active Filter Pills */}
                 {['الحلويات العربية', 'كريمة', 'عيد الاضحى والفطر', 'خالي من الجلوتين'].map((pill, i) => (
                    <div key={i} className="flex items-center gap-2 bg-white border border-[#234745]/10 text-gray-600 px-3 py-1.5 rounded-full text-[12px] font-bold shadow-sm">
                        <span>{pill}</span>
                        <button className="text-gray-400 hover:text-red-500 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                 ))}
              </div>
              
              <div className="flex items-center gap-4">
                {/* Sort Dropdown */}
                <div className="flex items-center gap-2">
                  <label className="text-gray-400 text-[13px] font-bold whitespace-nowrap">
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
                      value={`${searchParams.get('sortKey') || 'COLLECTION_DEFAULT'}|${searchParams.get('reverse') || 'false'}`}
                    >
                      <option value="COLLECTION_DEFAULT|false">{isEn ? 'Featured' : 'الأكثر صلة'}</option>
                      <option value="BEST_SELLING|false">{isEn ? 'Best Selling' : 'الأكثر مبيعاً'}</option>
                      <option value="PRICE|false">{isEn ? 'Price: Low to High' : 'السعر: من الأقل للأعلى'}</option>
                      <option value="PRICE|true">{isEn ? 'Price: High to Low' : 'السعر: من الأعلى للأقل'}</option>
                    </select>
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>
            </div>

            <Pagination connection={collection.products}>
              {({nodes, isLoading, PreviousLink, NextLink}) => {
                const filteredNodes = q ? nodes.filter((n: any) => n.title.toLowerCase().includes(q)) : nodes;
                return (
                <>
                  <div className="flex justify-center mb-10">
                    <PreviousLink className="text-[#234745] font-black border-2 border-[#234745]/10 px-8 py-2.5 rounded-full hover:bg-gray-50 transition-all">
                      {isLoading ? (isEn ? 'Loading...' : 'جاري التحميل...') : <span>{isEn ? '↑ Load Previous' : '↑ تحميل المنتجات السابقة'}</span>}
                    </PreviousLink>
                  </div>
                  
                  {filteredNodes.length === 0 && (
                      <div className="py-12 text-center text-[#234745] font-bold text-lg w-full">
                          لا توجد منتجات تطابق بحثك.
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

          {/* Desktop Sidebar (Right side in RTL) */}
          <div className="w-[320px] shrink-0 lg:order-1 border border-gray-200 rounded-3xl bg-white sticky top-24 self-start h-fit overflow-hidden">
             <FilterSidebar filters={collection.products.filters} onClose={() => {}} isDesktop={true} />
          </div>

        </div>
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
    const productsCount = collection.products?.nodes?.length || 0;
    return (
        <section className="relative h-[160px] md:h-[180px] w-full bg-[#234745] overflow-hidden flex items-center" dir="rtl">
            {/* Background Texture */}
            <div 
                className="absolute inset-0"
                style={{
                    backgroundImage: `url(${patternBg})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                }}
            />
            
            <div className="relative z-10 w-full max-w-[1440px] mx-auto px-4 md:px-8 lg:px-12 flex items-center justify-between">
                
                {/* Left Side: Product Count */}
                <div className="bg-[#FEF8EB] text-[#234745] px-6 py-2.5 rounded-full text-[14px] font-black shadow-sm shrink-0">
                    {productsCount} منتجات
                </div>

                {/* Right Side: Title, Subtitle, and Back Button */}
                <div className="text-right flex flex-col items-end">
                    <div className="flex items-center gap-4 mb-3">
                        <h1 className="text-4xl md:text-5xl font-black text-white drop-shadow-sm">
                            {collection.title}
                        </h1>
                        <button onClick={() => window.history.back()} className="flex items-center gap-2 bg-[#A8B8B5]/30 hover:bg-[#A8B8B5]/40 text-[#234745] px-6 py-2.5 rounded-full text-[14px] font-black transition-all">
                            <span>رجوع</span>
                            <svg className="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                        </button>
                    </div>
                    {collection.description && (
                        <p className="text-white/80 text-[13px] md:text-[14px] font-bold">
                            {collection.description}
                        </p>
                    )}
                </div>
                
            </div>
        </section>
    );
}

function FilterSidebar({ filters, onClose, isDesktop = false }: { filters: any[], onClose: () => void, isDesktop?: boolean }) {
    return (
        <div className={`flex flex-col h-full ${isDesktop ? 'bg-white' : 'bg-[#FEF8EB] overflow-hidden'}`} dir="rtl">
            {!isDesktop && (
              <header className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
                  <h2 className="text-xl font-black text-[#234745]">تصفية النتائج</h2>
                  <button onClick={onClose} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-[#234745] hover:bg-red-50 hover:text-red-500 transition-all font-bold text-2xl">
                      &times;
                  </button>
              </header>
            )}
            
            <FilterForm onClose={onClose} filters={filters} isDesktop={isDesktop} />
        </div>
    );
}

function FilterForm({ filters, onClose, isDesktop }: { filters: any[], onClose: () => void, isDesktop: boolean }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    const [minPrice, setMinPrice] = useState(searchParams.get('filter.v.price.min') || '');
    const [maxPrice, setMaxPrice] = useState(searchParams.get('filter.v.price.max') || '');
    
    // State to toggle accordions (all open by default for demo like the image)
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
      'الأقسام': true,
      'السعر (ر.س)': true,
      'المناسبة': true,
      'النوع الغذائي': true,
      'Product type': true,
      'Price': true,
    });

    const toggleSection = (label: string) => {
      setOpenSections(prev => ({...prev, [label]: !prev[label]}));
    };

    useEffect(() => {
        setMinPrice(searchParams.get('filter.v.price.min') || '');
        setMaxPrice(searchParams.get('filter.v.price.max') || '');
    }, [searchParams]);

    const handleApply = () => {
        const params = new URLSearchParams(searchParams);
        if (minPrice) params.set('filter.v.price.min', minPrice);
        else params.delete('filter.v.price.min');
        
        if (maxPrice) params.set('filter.v.price.max', maxPrice);
        else params.delete('filter.v.price.max');
        
        setSearchParams(params, { preventScrollReset: true, replace: true });
        if (!isDesktop) onClose();
    };

    return (
        <div className={`flex-1 ${isDesktop ? 'p-6' : 'overflow-y-auto p-6 pt-4'} flex flex-col`}>
            <div className="flex-1">
                {/* Search Input at top of sidebar */}
                <div className="mb-8">
                    <div className="relative">
                        <input 
                            type="text" 
                            placeholder="إبحث في المنتجات..." 
                            defaultValue={searchParams.get('q') || ''}
                            className="w-full bg-[#c4d1cc] !border-0 !rounded-full pr-12 py-3 pl-5 text-[14px] font-bold focus:!outline-none focus:!ring-0 transition-all text-[#234745] placeholder-[#234745] !shadow-none outline-none appearance-none text-right"
                            onChange={(e) => {
                                const val = e.target.value;
                                const params = new URLSearchParams(searchParams);
                                if (val) params.set('q', val);
                                else params.delete('q');
                                setSearchParams(params, { preventScrollReset: true, replace: true });
                            }}
                        />
                        <svg className="absolute right-4 top-1/2 -translate-y-1/2 text-[#234745]" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    </div>
                </div>

                {/* 1. Categories (الأقسام) */}
                <div className="mb-6 border-b border-gray-100 pb-6">
                    <button onClick={() => toggleSection('الأقسام')} className="w-full flex items-center justify-between group">
                        <h3 className="text-[15px] font-black text-gray-800 tracking-wide">الأقسام</h3>
                        <svg className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${openSections['الأقسام'] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    <div className={`mt-4 overflow-hidden transition-all duration-300 ${openSections['الأقسام'] ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="flex flex-col gap-3">
                            {[
                                { label: 'الحلويات العربية', count: '(٤٧)', active: true },
                                { label: 'شوكولاتة', count: '(١)', active: false },
                                { label: 'كريمة', count: '(٢)', active: true },
                                { label: 'كنافة', count: '(٠)', active: false },
                                { label: 'معجنات', count: '(٤)', active: false },
                                { label: 'قهوة وتمر', count: '(١)', active: false },
                                { label: 'كيك', count: '(٢)', active: false },
                                { label: 'آيس كريم', count: '(٠)', active: false },
                            ].map((item, i) => (
                                <label key={i} className="flex items-center justify-between cursor-pointer group">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors ${item.active ? 'bg-[#234745] border-[#234745]' : 'border-gray-300 bg-white group-hover:border-[#234745]'}`}>
                                            {item.active && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                        </div>
                                        <span className={`text-[13px] font-bold ${item.active ? 'text-[#234745]' : 'text-gray-500 group-hover:text-gray-800'}`}>{item.label}</span>
                                    </div>
                                    <span className="text-[12px] font-medium text-gray-500">{item.count}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 2. Price (السعر ر.س) */}
                <div className="mb-6 border-b border-gray-100 pb-6">
                    <div className="flex items-center justify-between mb-4">
                        <button onClick={() => toggleSection('السعر (ر.س)')} className="flex-1 flex items-center gap-2 group text-right">
                            <h3 className="text-[15px] font-black text-gray-800 tracking-wide">السعر (ر.س)</h3>
                            <svg className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${openSections['السعر (ر.س)'] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        <button onClick={() => { 
                            setMinPrice(''); 
                            setMaxPrice(''); 
                            const params = new URLSearchParams(searchParams);
                            params.delete('filter.v.price.min');
                            params.delete('filter.v.price.max');
                            setSearchParams(params, { preventScrollReset: true, replace: true });
                        }} className="text-[13px] font-black text-red-500 hover:text-red-600 transition-colors">مسح</button>
                    </div>
                    <div className={`overflow-hidden transition-all duration-300 ${openSections['السعر (ر.س)'] ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="flex gap-2 items-center mb-4">
                            <div className="flex-1 relative">
                                <input type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="من" className="w-full bg-white border border-gray-200 rounded-full px-4 py-2 text-sm font-bold focus:outline-none focus:border-[#234745] transition-all text-center" />
                            </div>
                            <span className="text-gray-400 font-bold">-</span>
                            <div className="flex-1 relative">
                                <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="إلي" className="w-full bg-white border border-gray-200 rounded-full px-4 py-2 text-sm font-bold focus:outline-none focus:border-[#234745] transition-all text-center" />
                            </div>
                        </div>
                        <button onClick={handleApply} className="w-full bg-[#234745] text-white !rounded-full py-2.5 font-bold text-sm hover:bg-[#1a3533] transition-all mt-2 shadow-sm cursor-pointer">تطبيق</button>
                        <div className="flex flex-col gap-4 mt-6">
                            {[
                              { label: 'أقل من ١٠٠ ر.س', min: '', max: '100' },
                              { label: '١٠٠ - ٢٠٠ ر.س', min: '100', max: '200' },
                              { label: '٢٠٠ - ٤٠٠ ر.س', min: '200', max: '400' },
                              { label: 'أكثر من ٤٠٠ ر.س', min: '400', max: '' }
                            ].map((preset, i) => (
                                <label key={i} className="flex items-center justify-start gap-3 cursor-pointer group">
                                    <input 
                                      type="radio" 
                                      name="price_preset" 
                                      className="w-4 h-4 border-gray-300 text-[#234745] focus:ring-[#234745] cursor-pointer" 
                                      checked={minPrice === preset.min && maxPrice === preset.max}
                                      onChange={() => {
                                        setMinPrice(preset.min);
                                        setMaxPrice(preset.max);
                                        // Auto apply
                                        const params = new URLSearchParams(searchParams);
                                        if (preset.min) params.set('filter.v.price.min', preset.min);
                                        else params.delete('filter.v.price.min');
                                        if (preset.max) params.set('filter.v.price.max', preset.max);
                                        else params.delete('filter.v.price.max');
                                        setSearchParams(params, { preventScrollReset: true, replace: true });
                                      }}
                                    />
                                    <span className={`text-[13px] font-bold ${minPrice === preset.min && maxPrice === preset.max ? 'text-[#234745]' : 'text-[#8695A0] group-hover:text-[#234745]'} transition-colors`}>{preset.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 3. Occasion (المناسبة) */}
                <div className="mb-6 border-b border-gray-100 pb-6">
                    <button onClick={() => toggleSection('المناسبة')} className="w-full flex items-center justify-between group">
                        <h3 className="text-[15px] font-black text-gray-800 tracking-wide">المناسبة</h3>
                        <svg className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${openSections['المناسبة'] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    <div className={`mt-4 overflow-hidden transition-all duration-300 ${openSections['المناسبة'] ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="flex flex-col gap-3">
                            {['عيد الفطر والاضحي', 'رمضان', 'أعياد الميلاد', 'زفاف وخطوبة', 'تخرج', 'يوم الأم', 'اليوم الوطني', 'هدايا مؤسسية'].map((item, i) => (
                                <label key={i} className="flex items-center gap-3 cursor-pointer group">
                                    <div className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors ${i === 0 ? 'bg-[#234745] border-[#234745]' : 'border-gray-300 bg-white group-hover:border-[#234745]'}`}>
                                        {i === 0 && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                    <span className={`text-[13px] font-bold ${i === 0 ? 'text-[#234745]' : 'text-gray-500 group-hover:text-gray-800'}`}>{item}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 4. Diet Type (النوع الغذائي) */}
                <div className="mb-6 pb-6 border-b border-gray-100">
                    <button onClick={() => toggleSection('النوع الغذائي')} className="w-full flex items-center justify-between group">
                        <h3 className="text-[15px] font-black text-gray-800 tracking-wide">النوع الغذائي</h3>
                        <svg className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${openSections['النوع الغذائي'] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    <div className={`mt-4 overflow-hidden transition-all duration-300 ${openSections['النوع الغذائي'] ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="flex flex-col gap-3">
                            {['خالي من الجلوتين', 'مناسب للنباتيين', 'منتجات صحية', 'خالي من السكر', 'قليل الدهون'].map((item, i) => (
                                <label key={i} className="flex items-center gap-3 cursor-pointer group">
                                    <div className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors ${i === 0 ? 'bg-[#234745] border-[#234745]' : 'border-gray-300 bg-white group-hover:border-[#234745]'}`}>
                                        {i === 0 && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                    <span className={`text-[13px] font-bold ${i === 0 ? 'text-[#234745]' : 'text-gray-500 group-hover:text-gray-800'}`}>{item}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-6">
                <Link 
                  to={typeof window !== 'undefined' ? window.location.pathname : ''}
                  className="w-full flex items-center justify-center border border-[#234745] text-[#234745] bg-white rounded-full py-3 font-bold text-sm hover:bg-gray-50 transition-all"
                >
                    مسح كل الفلاتر
                </Link>
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
          ...ProductItem
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

