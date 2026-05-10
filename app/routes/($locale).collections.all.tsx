import {data, type LoaderFunctionArgs, type MetaFunction} from 'react-router';
import {useLoaderData, Link, useRouteLoaderData, useNavigate, useSearchParams} from 'react-router';
import {getPaginationVariables, Pagination, Image} from '@shopify/hydrogen';
import {ProductItem} from '~/components/ProductItem';
import {useState, useEffect} from 'react';
import { createPortal } from 'react-dom';
import patternBg from '~/assets/patteren-collection-header.svg';

export const meta: MetaFunction = () => {
  return [{title: `Saadeddin | All Products`}];
};

export async function loader({context, request}: LoaderFunctionArgs) {
  const {storefront} = context;
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 12,
  });

  const {products} = await storefront.query(CATALOG_QUERY, {
    variables: {
        ...paginationVariables,
        country: storefront.i18n.country,
        language: storefront.i18n.language,
    },
    cache: storefront.CacheNone(),
  });

  return data({products});
}

export default function CollectionAll() {
  const {products} = useLoaderData<typeof loader>();
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [searchParams] = useSearchParams();
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
      {/* 1. Header Hero Section */}
      <CollectionAllHero title={isEn ? 'All Products' : 'جميع المنتجات'} productsCount={products.nodes?.length || 0} />

      {/* Breadcrumb Strip */}
      <div className="bg-white border-b border-gray-100">
        <div className="px-4 md:px-8 lg:px-12 py-4 max-w-[1440px] mx-auto text-right text-[13px] font-black flex items-center gap-2">
            <span className="text-gray-400">الرئيسية</span>
            <span className="text-gray-300">/</span>
            <span className="text-gray-800">{isEn ? 'All Products' : 'جميع المنتجات'}</span>
        </div>
      </div>

      <div className="bg-[#FEF8EB] min-h-screen">
          <div className="px-4 md:px-8 lg:px-12 py-10 max-w-[1440px] mx-auto text-right">
            {/* Active Filters Row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div className="flex-1 flex items-center justify-end">
                {/* Sort Dropdown */}
                <div className="flex items-center gap-2">
                  <label className="text-gray-400 text-[13px] font-bold">
                    {isEn ? 'Sort by:' : 'ترتيب حسب:'}
                  </label>
                  <div className="flex items-center bg-white border border-[#234745]/10 rounded-full px-4 py-2 shadow-sm relative w-40">
                    <select
                      className="w-full bg-transparent text-[13px] font-bold text-gray-800 cursor-pointer focus:outline-none focus:ring-0 border-none appearance-none rtl:pl-6"
                      style={{ WebkitAppearance: 'none', appearance: 'none' }}
                    >
                      <option value="COLLECTION_DEFAULT">{isEn ? 'Featured' : 'الأكثر صلة'}</option>
                      <option value="BEST_SELLING">{isEn ? 'Best Selling' : 'الأكثر مبيعاً'}</option>
                    </select>
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              {/* Active Filter Pills (Demo) */}
              <div className="flex items-center gap-2 flex-wrap justify-end flex-1">
                 {['الحلويات العربية', 'كريمة', 'عيد الاضحى والفطر', 'خالي من الجلوتين'].map((pill, i) => (
                    <div key={i} className="flex items-center gap-2 bg-white border border-[#234745]/10 text-gray-600 px-3 py-1.5 rounded-full text-[12px] font-bold shadow-sm">
                        <span>{pill}</span>
                        <button className="text-gray-400 hover:text-red-500 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                 ))}
              </div>
            </div>

            {/* Two Column PLP Layout */}
            <div className="flex flex-col lg:flex-row gap-8 items-start">
          
              {/* Main Content (Left side in RTL) */}
              <div className="flex-1 min-w-0 w-full lg:order-2">

                <Pagination connection={products}>
              {({nodes, isLoading, PreviousLink, NextLink}) => {
                const minPriceFilter = searchParams.get('filter.v.price.min');
                const maxPriceFilter = searchParams.get('filter.v.price.max');
                
                const filteredNodes = nodes.filter((n: any) => {
                    if (q && !n.title.toLowerCase().includes(q)) return false;
                    
                    const priceStr = n.priceRange?.minVariantPrice?.amount;
                    if (priceStr) {
                        const price = parseFloat(priceStr);
                        if (minPriceFilter && price < parseFloat(minPriceFilter)) return false;
                        if (maxPriceFilter && price > parseFloat(maxPriceFilter)) return false;
                    }
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
                          لا توجد منتجات تطابق بحثك.
                      </div>
                  )}

                  <div className={view === 'grid' ? "grid grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8" : "flex flex-col gap-5"}>
                    {filteredNodes.map((product: any, index: number) => (
                      <ProductItem
                        key={product.id}
                        product={product}
                        view={view}
                        loading={index < 8 ? 'eager' : undefined}
                      />
                    ))}
                  </div>

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
          <div className="w-[280px] lg:w-[320px] shrink-0 md:order-1 border border-gray-200 rounded-3xl bg-white sticky top-24 self-start h-fit overflow-hidden">
             <FilterSidebar onClose={() => {}} isDesktop={true} />
          </div>

        </div>
      </div>
      </div>

      {/* Mobile Filter Sidebar */}
      {mounted && typeof document !== 'undefined' && createPortal(
        <div className={`fixed inset-0 z-[999999] pointer-events-none transition-all duration-500 ${isFilterOpen ? 'visible' : 'invisible'}`}>
            <div 
              className={`absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-500 ${isFilterOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0'}`}
              onClick={() => setIsFilterOpen(false)}
            />
            <div className={`absolute left-0 top-0 bottom-0 w-full max-w-sm bg-[#FEF8EB] shadow-2xl transition-transform duration-500 ${isFilterOpen ? 'translate-x-0 pointer-events-auto' : '-translate-x-full'}`}>
               <FilterSidebar onClose={() => setIsFilterOpen(false)} />
            </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function CollectionAllHero({ title, productsCount }: { title: string, productsCount: number }) {
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

                {/* Right Side: Title and Back Button */}
                <div className="text-right flex flex-col items-end">
                    <div className="flex items-center gap-4">
                        <h1 className="text-4xl md:text-5xl font-black text-white drop-shadow-sm">
                            {title}
                        </h1>
                        <button onClick={() => window.history.back()} className="flex items-center gap-2 bg-[#A8B8B5]/30 hover:bg-[#A8B8B5]/40 text-[#234745] px-6 py-2.5 rounded-full text-[14px] font-black transition-all">
                            <span>رجوع</span>
                            <svg className="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                        </button>
                    </div>
                </div>
                
            </div>
        </section>
    );
}

function FilterSidebar({ onClose, isDesktop = false }: { onClose: () => void, isDesktop?: boolean }) {
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
            
            <FilterForm onClose={onClose} isDesktop={isDesktop} />
        </div>
    );
}

function FilterForm({ onClose, isDesktop }: { onClose: () => void, isDesktop: boolean }) {
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
                            className="w-full bg-[#A8B8B5]/30 border-none rounded-full pr-5 py-3 pl-10 text-[13px] font-bold focus:outline-none focus:ring-2 focus:ring-[#234745] transition-all text-[#234745] placeholder-[#234745]/60"
                            onChange={(e) => {
                                const val = e.target.value;
                                const params = new URLSearchParams(searchParams);
                                if (val) params.set('q', val);
                                else params.delete('q');
                                setSearchParams(params, { preventScrollReset: true, replace: true });
                            }}
                        />
                        <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-[#234745]/60" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
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
                        <button onClick={handleApply} className="w-full bg-[#234745] text-white rounded-[8px] py-2.5 font-bold text-sm hover:bg-[#1a3533] transition-all mt-2 shadow-sm">تطبيق</button>
                        <div className="flex flex-col gap-4 mt-6">
                            {[
                              { label: 'أقل من ١٠٠ ر.س', min: '', max: '100' },
                              { label: '١٠٠ - ٢٠٠ ر.س', min: '100', max: '200' },
                              { label: '٢٠٠ - ٤٠٠ ر.س', min: '200', max: '400' },
                              { label: 'أكثر من ٤٠٠ ر.س', min: '400', max: '' }
                            ].map((preset, i) => (
                                <label key={i} className="flex items-center justify-between cursor-pointer group">
                                    <span className={`text-[13px] font-bold ${minPrice === preset.min && maxPrice === preset.max ? 'text-[#234745]' : 'text-[#8695A0] group-hover:text-[#234745]'} transition-colors`}>{preset.label}</span>
                                    <input 
                                      type="radio" 
                                      name="price_preset" 
                                      className="w-4 h-4 border-gray-300 text-[#234745] focus:ring-[#234745]" 
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
                <button className="w-full flex items-center justify-center border border-[#234745] text-[#234745] bg-white rounded-full py-3 font-bold text-sm hover:bg-gray-50 transition-all">
                    مسح كل الفلاتر
                </button>
            </div>
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

const CATALOG_QUERY = `#graphql
  query Catalog(
    $country: CountryCode
    $language: LanguageCode
    $first: Int
    $last: Int
    $startCursor: String
    $endCursor: String
  ) @inContext(country: $country, language: $language) {
    products(first: $first, last: $last, before: $startCursor, after: $endCursor) {
      nodes {
        ...ProductItem
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
        startCursor
        endCursor
      }
    }
  }
  ${PRODUCT_ITEM_FRAGMENT}
` as const;

