import {
  data,
  type LoaderFunctionArgs,
  useLoaderData,
  Link,
  useRouteLoaderData,
  useSearchParams,
} from 'react-router';
import {getPaginationVariables, Pagination} from '@shopify/hydrogen';
import {useState, useEffect} from 'react';
import {createPortal} from 'react-dom';
import {getShopTitle} from '~/lib/seo';
import {
  FilterSidebar,
  ActiveFilterChips,
} from '~/routes/($locale).collections.all';
import {ProductItem} from '~/components/ProductItem';
import exportHeroImg from '/images/export-hero.jpg';

export const meta = ({matches}: {matches: any}) => {
  return [
    {title: getShopTitle('Export & Wholesale | Saadeddin Pastry', matches)},
  ];
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
  const userQuery = searchParams.get('q');
  const exportQuery = userQuery && userQuery !== '*' ? userQuery : '*';

  try {
    const response = await storefront.query(EXPORT_CATALOG_QUERY, {
      variables: {
        ...paginationVariables,
        query: exportQuery,
        filters: filters.length > 0 ? filters : undefined,
        sortKey: sortKey as any,
        country: 'US', // International Market context
        language: storefront.i18n.language,
      },
      cache: storefront.CacheNone(),
    });

    const selectedCategories = url.searchParams.getAll('category');
    let products: any = null;

    if (response.exportCollection?.products?.nodes?.length) {
      const colProds = response.exportCollection.products;
      products = {
        ...colProds,
        productFilters: colProds.filters || colProds.productFilters || [],
      };
      if (userQuery && userQuery !== '*') {
        const searchLower = userQuery.toLowerCase();
        products.nodes = products.nodes.filter((n: any) =>
          n.title?.toLowerCase().includes(searchLower),
        );
      }
    } else {
      products = response.search || {nodes: [], productFilters: []};
    }

    if (selectedCategories.length > 0) {
      try {
        const collectionPromises = selectedCategories.map((handle) =>
          storefront.query(EXPORT_COLLECTION_FILTER_QUERY, {
            variables: {
              handle,
              filters: filters.length > 0 ? filters : undefined,
              country: storefront.i18n.country,
              language: storefront.i18n.language,
            },
            cache: storefront.CacheNone(),
          }),
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

        let finalNodes = mergedNodes;
        if (q && q !== '*') {
          const searchLower = q.toLowerCase();
          finalNodes = mergedNodes.filter((n) =>
            n.title?.toLowerCase().includes(searchLower),
          );
        }

        products = {
          ...products,
          nodes: finalNodes,
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: null,
            endCursor: null,
          },
        };
      } catch (e) {
        console.error('Failed to fetch export collection filter', e);
      }
    }

    if (!products) {
      return data({
        products: null,
        collections: null,
        error: 'GraphQL query returned null.',
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

export default function ExportPage() {
  const {products, collections, error} = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);

  const rootData = useRouteLoaderData('root') as any;
  const locale = rootData?.locale || 'ar';
  const isEn = locale === 'en';

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
  };

  return (
    <div
      className="bg-[#FEF8EB] min-h-screen max-w-full overflow-x-clip"
      dir={isEn ? 'ltr' : 'rtl'}
    >
      {/* ─── 1. HERO BANNER SECTION ────────────────────────────────────────── */}
      <section className="relative w-full min-h-[560px] sm:min-h-[640px] lg:min-h-[720px] flex items-center overflow-hidden">
        {/* Background Image & Soft Gradient Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="/images/export/export-hero.png"
            alt="Saudi Export Pastry Table"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent rtl:bg-gradient-to-l" />
        </div>

        {/* Content Container */}
        <div
          className={`relative z-10 max-w-[1440px] w-full mx-auto px-6 sm:px-10 lg:px-16 py-12 flex flex-col items-start ${isEn ? 'text-left' : 'text-right'}`}
        >
          <div
            className={`max-w-[720px] flex flex-col items-start ${isEn ? 'text-left' : 'text-right'}`}
          >
            {/* Top Heritage Badge */}
            <div className="inline-flex items-center gap-2 px-6 py-1.5 rounded-full bg-[#C5A96A] text-[#1A3533] font-bold text-[13px] sm:text-[14px] mb-6 shadow-md">
              <span className="text-[#1A3533]/60">—</span>
              <span>
                {isEn ? 'Saudi Heritage Since 1960' : 'تراث سعودي من ١٩٦٠'}
              </span>
              <span className="text-[#1A3533]/60">—</span>
            </div>

            {/* Main Title */}
            <h1
              className={`!text-[42px] sm:!text-[68px] lg:!text-[90px] font-bold text-white mb-6 !mt-0 leading-[100%] ${isEn ? '!text-left' : '!text-right'}`}
              style={{fontFamily: "'Bahij Janna', sans-serif", fontWeight: 700}}
            >
              {isEn ? (
                <>
                  Saudi Taste,
                  <br />
                  Reaching Around the World
                </>
              ) : (
                <>
                  طعم سعودي،
                  <br />
                  يصل حول العالم
                </>
              )}
            </h1>

            {/* Subtitle */}
            <p
              className={`text-[14px] text-white font-normal max-w-[620px] mb-8 leading-[140%] sm:leading-[100%] !mb-[20px] ${isEn ? 'text-left' : 'text-right'}`}
              style={{
                fontFamily: "'GE Dinar One', sans-serif",
                fontWeight: 400,
              }}
            >
              {isEn
                ? 'Luxury Arabic sweets, maamoul, and chocolates — crafted in heritage ovens and exported via cold-chain logistics to over 30 countries.'
                : 'حلويات عربية فاخرة، معمول وشوكولاتة — صُنعت بأكثر من قرن من العراقة، وتُصوّر بموجب خدمات لوجستية مبرّدة ومعتمدة حلال إلى أكثر من 30 دولة'}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <a
                href="#export-catalog"
                className="w-full sm:w-auto px-8 py-3.5 bg-[#C5A96A] hover:bg-[#B39556] !text-[#234745] font-bold text-[18px] rounded-full transition-all shadow-lg text-center"
                style={{
                  fontFamily: "'GE Dinar One', sans-serif",
                  fontWeight: 700,
                }}
              >
                {isEn ? 'Browse Export Products' : 'استعرض منتجات التصدير'}
              </a>
              <a
                href="#export-form"
                className="w-full sm:w-auto px-8 py-3.5 bg-[#B8D0CC] hover:bg-[#A3C0BB] !text-[#1A3533] font-bold text-[18px] rounded-full transition-all shadow-lg text-center"
                style={{
                  fontFamily: "'GE Dinar One', sans-serif",
                  fontWeight: 700,
                }}
              >
                {isEn ? 'Request Export Quote' : 'طلب عرض أسعار للتصدير'}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. STATS BAR SECTION ─────────────────────────────────────────── */}
      <section className="w-full bg-[#FAF8F5] border-y border-[#C5A96A]/20 py-8">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-x-0 md:divide-x md:rtl:divide-x-reverse divide-gray-200">
            <div className="p-4 flex flex-col items-center">
              <span
                className="text-[36px] sm:text-[44px] font-extrabold text-[#C5A96A] leading-none mb-2"
                style={{fontFamily: "'Bahij Janna', sans-serif"}}
              >
                +105
              </span>
              <span
                className="text-[14px] sm:text-[15px] font-bold text-[#234745]"
                style={{fontFamily: "'GE Dinar One', sans-serif"}}
              >
                {isEn ? 'Years of Heritage' : 'عاماً من التراث'}
              </span>
            </div>

            <div className="p-4 flex flex-col items-center">
              <span
                className="text-[36px] sm:text-[44px] font-extrabold text-[#C5A96A] leading-none mb-2"
                style={{fontFamily: "'Bahij Janna', sans-serif"}}
              >
                +500
              </span>
              <span
                className="text-[14px] sm:text-[15px] font-bold text-[#234745]"
                style={{fontFamily: "'GE Dinar One', sans-serif"}}
              >
                {isEn ? 'Luxury Products' : 'منتج فاخر'}
              </span>
            </div>

            <div className="p-4 flex flex-col items-center">
              <span
                className="text-[36px] sm:text-[44px] font-extrabold text-[#C5A96A] leading-none mb-2"
                style={{fontFamily: "'Bahij Janna', sans-serif"}}
              >
                +30
              </span>
              <span
                className="text-[14px] sm:text-[15px] font-bold text-[#234745]"
                style={{fontFamily: "'GE Dinar One', sans-serif"}}
              >
                {isEn ? 'Export Countries' : 'دولة تصدير'}
              </span>
            </div>

            <div className="p-4 flex flex-col items-center">
              <span
                className="text-[36px] sm:text-[44px] font-extrabold text-[#C5A96A] leading-none mb-2"
                style={{fontFamily: "'Bahij Janna', sans-serif"}}
              >
                100%
              </span>
              <span
                className="text-[14px] sm:text-[15px] font-bold text-[#234745]"
                style={{fontFamily: "'GE Dinar One', sans-serif"}}
              >
                {isEn ? 'Certified Quality' : 'جودة واعتماد'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3. PRODUCTS AVAILABLE FOR EXPORT SECTION ────────────────────── */}
      <section
        id="export-catalog"
        className="py-14 max-w-[1440px] mx-auto px-4 md:px-8 lg:px-12 text-right"
      >
        {/* Section Header */}
        <div className="text-center mb-10">
          <h2
            className="text-[30px] sm:text-[38px] font-bold text-[#234745] mb-2"
            style={{
              fontFamily: isEn
                ? "'Bahij Janna', sans-serif"
                : "'Bahij Janna', 'Bahij', serif",
            }}
          >
            {isEn ? 'Products Available for Export' : 'منتجات متاحة للتصدير'}
          </h2>
          <p
            className="text-[#7D7D7D] text-[15px] sm:text-[16px]"
            style={{fontFamily: "'GE Dinar One', sans-serif"}}
          >
            {isEn
              ? 'Selected export range with special international specs'
              : 'منتجات مختارة للتصدير - بمواصفات خاصة'}
          </p>
        </div>

        {/* Catalog Main Layout (Sidebar + Grid) */}
        {!products ? (
          <div className="py-16 text-center font-bold text-[#234745]">
            {isEn
              ? 'Loading export catalog...'
              : 'جاري تحميل منتجات التصدير...'}
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* Products Area */}
            <div className="flex-1 min-w-0 w-full lg:order-2">
              {/* Mobile Layout Controls (< lg) */}
              <div
                className="lg:hidden flex flex-col gap-4 mb-4"
                dir={isEn ? 'ltr' : 'rtl'}
              >
                <div className="lg:hidden flex flex-wrap items-center justify-between gap-2.5 mb-4 w-full max-w-full">
                  <button
                    type="button"
                    onClick={() => setIsFilterOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-[#BBCFCD]/50 text-[#234745] rounded-[8px] font-bold shadow-sm"
                    style={{fontFamily: "'GE Dinar One', sans-serif"}}
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
                    >
                      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                    </svg>
                    <span>{isEn ? 'Filter' : 'تصفية'}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <span
                      className="text-[#7D7D7D] text-[13px] font-medium whitespace-nowrap"
                      style={{fontFamily: "'GE Dinar One', sans-serif"}}
                    >
                      {isEn ? 'Sort by:' : 'ترتيب حسب:'}
                    </span>
                    <div className="flex items-center bg-white border border-[#BBCFCD]/60 rounded-[8px] px-3 py-1.5 relative w-[135px]">
                      <select
                        aria-label={isEn ? 'Sort by' : 'ترتيب حسب'}
                        className="w-full bg-transparent text-[13px] font-bold text-[#234745] cursor-pointer focus:outline-none appearance-none"
                        style={{fontFamily: "'GE Dinar One', sans-serif"}}
                        onChange={(e) => {
                          const [key, rev] = e.target.value.split('|');
                          const params = new URLSearchParams(searchParams);
                          params.set('sortKey', key);
                          params.set('reverse', rev);
                          setSearchParams(params, {preventScrollReset: true});
                        }}
                        value={`${searchParams.get('sortKey') || 'RELEVANCE'}|${searchParams.get('reverse') || 'false'}`}
                      >
                        <option value="RELEVANCE|false">
                          {isEn ? 'Featured' : 'الأكثر مبيعا'}
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
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 justify-start w-full">
                  <ActiveFilterChips isEn={isEn} collections={collections} />
                </div>
              </div>

              {/* Desktop Layout Controls (lg+) */}
              <div
                className={`hidden lg:flex ${isEn ? 'flex-row' : 'flex-row-reverse'} items-center justify-between gap-4 mb-6 w-full`}
                dir={isEn ? 'ltr' : 'rtl'}
              >
                <div className="flex items-center gap-2.5 shrink-0">
                  <span
                    className="text-[#7D7D7D] text-[14px] font-bold"
                    style={{fontFamily: "'GE Dinar One', sans-serif"}}
                  >
                    {isEn ? 'Sort by:' : 'ترتيب حسب:'}
                  </span>
                  <div className="flex items-center bg-white border border-[#B8D0CC] rounded-[12px] px-4 py-2 relative w-[170px] shadow-sm">
                    <select
                      aria-label={isEn ? 'Sort by' : 'ترتيب حسب'}
                      className="w-full bg-transparent text-[14px] font-bold text-[#234745] cursor-pointer focus:outline-none appearance-none"
                      style={{fontFamily: "'GE Dinar One', sans-serif"}}
                      onChange={(e) => {
                        const [key, rev] = e.target.value.split('|');
                        const params = new URLSearchParams(searchParams);
                        params.set('sortKey', key);
                        params.set('reverse', rev);
                        setSearchParams(params, {preventScrollReset: true});
                      }}
                      value={`${searchParams.get('sortKey') || 'RELEVANCE'}|${searchParams.get('reverse') || 'false'}`}
                    >
                      <option value="RELEVANCE|false">
                        {isEn ? 'Featured' : 'الأكثر مبيعا'}
                      </option>
                      <option value="PRICE|false">
                        {isEn ? 'Price: Low to High' : 'السعر: من الأقل للأعلى'}
                      </option>
                      <option value="PRICE|true">
                        {isEn ? 'Price: High to Low' : 'السعر: من الأعلى للأقل'}
                      </option>
                    </select>
                  </div>
                </div>

                <div className="flex-1 flex flex-wrap items-center gap-2.5 justify-start">
                  <ActiveFilterChips isEn={isEn} collections={collections} />
                </div>
              </div>

              {/* Pagination & Grid */}
              <Pagination connection={products}>
                {({nodes, isLoading, PreviousLink, NextLink}) => (
                  <>
                    {nodes.length === 0 ? (
                      <div className="py-16 text-center text-[#234745] font-bold text-lg">
                        {isEn
                          ? 'No export products match your filters.'
                          : 'لا توجد منتجات تصدير تطابق الفلاتر.'}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {nodes.map((product: any, index: number) => (
                          <ProductItem
                            key={product.id || index}
                            product={product}
                            loading={index < 6 ? 'eager' : 'lazy'}
                            isExport={true}
                          />
                        ))}
                      </div>
                    )}

                    <div className="flex justify-center mt-12">
                      <NextLink className="bg-[#234745] text-white px-14 py-3.5 rounded-full font-bold shadow-md hover:bg-[#1A3533] transition-all">
                        {isLoading ? (
                          isEn ? (
                            'Loading...'
                          ) : (
                            'جاري التحميل...'
                          )
                        ) : (
                          <span>
                            {isEn ? 'Browse More ↓' : 'تصفح المزيد ↓'}
                          </span>
                        )}
                      </NextLink>
                    </div>
                  </>
                )}
              </Pagination>
            </div>

            {/* Desktop Filter Sidebar (Right in RTL) */}
            <div className="hidden lg:block w-72 shrink-0 lg:order-1">
              <FilterSidebar
                filters={products.productFilters}
                collections={collections || []}
                onClose={() => {}}
                isDesktop={true}
                isEn={isEn}
              />
            </div>
          </div>
        )}
      </section>

      {/* ─── 4. WHY EXPORT WITH SAADEDDIN SECTION ───────────────────────── */}
      <section className="w-full bg-white py-16 border-t border-gray-100">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span
              className="text-[#906B51] text-[18px] font-medium tracking-wide uppercase mb-1 block"
              style={{fontFamily: "'GE Dinar One', sans-serif"}}
            >
              {isEn
                ? 'Quality & Global Logistics Assurance'
                : 'ضمانات الجودة والشحن الدولي'}
            </span>
            <h2
              className="text-[30px] sm:text-[50px] font-bold text-[#234745]"
              style={{
                fontFamily: isEn
                  ? "'Bahij Janna', sans-serif"
                  : "'Bahij Janna', 'Bahij', serif",
              }}
            >
              {isEn ? 'Why Export with Saadeddin?' : 'لماذا تصدر مع سعد الدين؟'}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="bg-[#ffffff] rounded-[12px] py-[24px] px-[12px] border border-[#234745] text-center flex flex-col items-center hover:shadow-md transition-all">
              <h3
                className="text-[26px] font-bold text-[#234745] mb-2"
                style={{fontFamily: "'Bahij Janna', serif"}}
              >
                {isEn ? 'Global Cold Shipping' : 'شحن مبرد عالمي'}
              </h3>
              <p
                className="text-[#9FB7AE] text-[14px] font-normal leading-relaxed"
                style={{fontFamily: "'GE Dinar One', sans-serif"}}
              >
                {isEn
                  ? 'Fast cold chain logistics ensuring freshness and original taste worldwide.'
                  : 'شحن سريع ومبرد يضمن وصول كافة المنتجات بنفس الجودة والطزاجة لجميع دول العالم.'}
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-[#ffffff] rounded-[12px] py-[24px] px-[12px] border border-[#234745] text-center flex flex-col items-center hover:shadow-md transition-all">
              <h3
                className="text-[26px] font-bold text-[#234745] mb-2"
                style={{fontFamily: "'Bahij Janna', serif"}}
              >
                {isEn ? 'Certified Standards' : 'شهادات معتمدة'}
              </h3>
              <p
                className="text-[#9FB7AE] text-[14px] font-normal leading-relaxed"
                style={{fontFamily: "'GE Dinar One', sans-serif"}}
              >
                {isEn
                  ? 'Fully certified with ISO 22000, HACCP, and SFDA global food safety standards.'
                  : 'شهادات معتمدة بالكامل (ISO 22000, HACCP, SFDA) ومطابقة لمعايير السلامة والجودة العالمية.'}
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-[#ffffff] rounded-[12px] py-[24px] px-[12px] border border-[#234745] text-center flex flex-col items-center hover:shadow-md transition-all">
              <h3
                className="text-[26px] font-bold text-[#234745] mb-2"
                style={{fontFamily: "'Bahij Janna', serif"}}
              >
                {isEn ? 'Export Vacuum Packaging' : 'تغليف محكم'}
              </h3>
              <p
                className="text-[#9FB7AE] text-[14px] font-normal leading-relaxed"
                style={{fontFamily: "'GE Dinar One', sans-serif"}}
              >
                {isEn
                  ? 'Advanced export modified atmosphere packaging preserving product shelf life.'
                  : 'تغليف متطور وعالي الجودة يحافظ على سلامة وطزاجة الشحنات لأطول فترة ممكنة.'}
              </p>
            </div>

            {/* Card 4 */}
            <div className="bg-[#ffffff] rounded-[12px] py-[24px] px-[12px] border border-[#234745] text-center flex flex-col items-center hover:shadow-md transition-all">
              <h3
                className="text-[26px] font-bold text-[#234745] mb-2"
                style={{fontFamily: "'Bahij Janna', serif"}}
              >
                {isEn ? 'Wholesale Pricing' : 'أسعار الجملة'}
              </h3>
              <p
                className="text-[#9FB7AE] text-[14px] font-normal leading-relaxed"
                style={{fontFamily: "'GE Dinar One', sans-serif"}}
              >
                {isEn
                  ? 'Competitive wholesale tiers designed for global distributors to maximize margin.'
                  : 'أسعار تنافسية مخصصة لطلبات الجملة والتصدير تتيح لك تحقيق أعلى هامش ربح.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 5. B2B DISTRIBUTOR REQUEST FORM SECTION ──────────────────────── */}
      <section
        id="export-form"
        className="w-full bg-[#234745] py-16 text-white"
      >
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Info Column */}
          <div
            className={`lg:col-span-6 flex flex-col ${isEn ? 'text-left items-start' : 'text-right items-start'}`}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-[#C5A96A] text-[#1A3533] font-medium text-[16px] mb-4 w-max">
              <span>
                {isEn ? 'Wholesale & B2B Distribution' : 'للطلبات بالجملة'}
              </span>
            </div>

            <h2
              className={`text-[32px] sm:text-[44px] md:text-[90px] text-white font-bold leading-tight mb-4 ${isEn ? 'text-left' : 'text-right'}`}
              style={{
                fontFamily: isEn
                  ? "'Bahij Janna', sans-serif"
                  : "'Bahij Janna', 'Bahij', serif",
              }}
            >
              {isEn
                ? 'Join Our Network of Global Distributors'
                : 'انضم إلى شبكة موزعينا حول العالم'}
            </h2>

            <p
              className={`text-white font-normal text-[14px] sm:text-[14px] leading-relaxed mb-8 ${isEn ? 'text-left' : 'text-right'}`}
              style={{fontFamily: "'GE Dinar One', sans-serif"}}
            >
              {isEn
                ? 'Become an authorized distributor and enjoy exclusive deals, personalized pricing, and dedicated logistics support.'
                : 'املأ بياناتك وسيقوم فريق التصدير لدينا بالرد عليك خلال 48 ساعة بكتالوج جملة مخصص، والأسعار، وخيارات الشحن المناسبة لسوقك'}
            </p>

            <div className="space-y-3 pt-4 border-t mt-[20px] border-white/15 text-[14px] text-gray-200 font-mono w-full">
              <div
                className={`flex items-center gap-3 ${isEn ? 'justify-start' : 'justify-start'}`}
              >
                <span dir="ltr">920017070</span>
              </div>
              <div
                className={`flex items-center gap-3 ${isEn ? 'justify-start' : 'justify-start'}`}
              >
                <span>info@saadeddin.com</span>
              </div>
              <div
                className={`flex items-center gap-3 ${isEn ? 'justify-start' : 'justify-start'}`}
              >
                <span>
                  {isEn ? (
                    'WhatsApp Business: +966 50 123 4567'
                  ) : (
                    <>
                      <span>واتساب للأعمال: </span>
                      <span dir="ltr" className="inline-block">+966 50 123 4567</span>
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Form Column */}
          <div className="lg:col-span-6 bg-white text-[#234745] rounded-[12px] p-6 sm:p-8 shadow-lg">
            <h3
              className={`text-[26px] font-bold text-[#234745] mb-6 ${isEn ? 'text-left' : 'text-right'}`}
              style={{fontFamily: "'Bahij Janna', serif"}}
            >
              {isEn ? 'Export Quotation Request' : 'نموذج طلب التصدير'}
            </h3>

            {formSubmitted ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-6 rounded-2xl text-center">
                <div className="text-[32px] mb-2">✅</div>
                <h4 className="font-bold text-[18px] mb-1">
                  {isEn ? 'Request Received!' : 'تم استلام طلبك بنجاح!'}
                </h4>
                <p className="text-[14px] text-emerald-700">
                  {isEn
                    ? 'Our export team will contact you within 24 hours.'
                    : 'سيتواصل معك فريق التصدير في أسرع وقت خلال 24 ساعة.'}
                </p>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      className={`block text-[14px] font-bold text-gray-700 mb-1 ${isEn ? 'text-left' : 'text-right'}`}
                    >
                      {isEn ? 'Full Name' : 'الاسم الكامل'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={isEn ? 'John Doe' : 'أدخل الاسم الكامل'}
                      className={`w-full h-[46px] px-4 rounded-[12px] border border-gray-200 text-[14px] focus:outline-none focus:border-[#234745] ${isEn ? 'text-left' : 'text-right'}`}
                    />
                  </div>

                  <div>
                    <label
                      className={`block text-[14px] font-bold text-gray-700 mb-1 ${isEn ? 'text-left' : 'text-right'}`}
                    >
                      {isEn ? 'Company Name' : 'اسم الشركة'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={
                        isEn ? 'Company Ltd' : 'شركة التوزيع / المورد'
                      }
                      className={`w-full h-[46px] px-4 rounded-[12px] border border-gray-200 text-[14px] focus:outline-none focus:border-[#234745] ${isEn ? 'text-left' : 'text-right'}`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      className={`block text-[14px] font-bold text-gray-700 mb-1 ${isEn ? 'text-left' : 'text-right'}`}
                    >
                      {isEn ? 'Destination Country' : 'البلد / الدولة'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={
                        isEn
                          ? 'United Arab Emirates'
                          : 'دبي / الإمارات / قطر...'
                      }
                      className={`w-full h-[46px] px-4 rounded-[12px] border border-gray-200 text-[14px] focus:outline-none focus:border-[#234745] ${isEn ? 'text-left' : 'text-right'}`}
                    />
                  </div>

                  <div>
                    <label
                      className={`block text-[14px] font-bold text-gray-700 mb-1 ${isEn ? 'text-left' : 'text-right'}`}
                    >
                      {isEn ? 'Email Address' : 'البريد الإلكتروني'}
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="name@company.com"
                      className={`w-full h-[46px] px-4 rounded-[12px] border border-gray-200 text-[14px] focus:outline-none focus:border-[#234745] ${isEn ? 'text-left' : 'text-right'}`}
                    />
                  </div>
                </div>

                <div>
                  <label
                    className={`block text-[14px] font-bold text-gray-700 mb-1 ${isEn ? 'text-left' : 'text-right'}`}
                  >
                    {isEn
                      ? 'Requested Products & Estimated Quantity'
                      : 'المنتجات والكميات المطلوبة'}
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder={
                      isEn
                        ? 'Specify required products, quantities, packaging specs...'
                        : 'اذكر أنواع الحلويات والمعمول والكميات التقديرية المطلوب تصديرها...'
                    }
                    className={`w-full p-4 rounded-[12px] border border-gray-200 text-[14px] focus:outline-none focus:border-[#234745] ${isEn ? 'text-left' : 'text-right'}`}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full h-[50px] bg-[#234745] hover:bg-[#1A3533] text-white font-bold text-[18px] rounded-[999px] transition-all shadow-md active:scale-98"
                  style={{fontFamily: "'GE Dinar One', sans-serif"}}
                >
                  {isEn ? 'Submit Export Request' : 'إرسال الطلب'}
                </button>

                <p className="text-[12px] text-[#9FB7AE] text-center pt-1">
                  {isEn
                    ? 'We will respond within 24 business hours'
                    : 'سنتواصل معك في أسرع وقت خلال 24 ساعة'}
                </p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Mobile Filter Slideover Portal */}
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
                filters={products?.productFilters || []}
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

const EXPORT_CATALOG_QUERY = `#graphql
  query ExportCatalogSearch(
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
    exportCollection: collection(handle: "export-products") {
      id
      title
      products(
        first: $first
        last: $last
        before: $startCursor
        after: $endCursor
        filters: $filters
      ) {
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
        nodes {
          id
          title
          handle
          availableForSale
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          featuredImage {
            id
            url
            altText
            width
            height
          }
          variants(first: 1) {
            nodes {
              id
              availableForSale
              price {
                amount
                currencyCode
              }
              compareAtPrice {
                amount
                currencyCode
              }
            }
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
          id
          title
          handle
          availableForSale
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          featuredImage {
            id
            url
            altText
            width
            height
          }
          variants(first: 1) {
            nodes {
              id
              availableForSale
              price {
                amount
                currencyCode
              }
              compareAtPrice {
                amount
                currencyCode
              }
            }
          }
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
` as const;

const EXPORT_COLLECTION_FILTER_QUERY = `#graphql
  query ExportCollectionFilter(
    $handle: String!
    $filters: [ProductFilter!]
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      products(first: 100, filters: $filters) {
        nodes {
          id
          title
          handle
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          featuredImage {
            id
            url
            altText
            width
            height
          }
          variants(first: 1) {
            nodes {
              id
              availableForSale
              price {
                amount
                currencyCode
              }
              compareAtPrice {
                amount
                currencyCode
              }
            }
          }
        }
      }
    }
  }
` as const;
