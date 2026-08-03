import type {MetaFunction} from 'react-router';
import {createPortal} from 'react-dom';
import {data, redirect, type LoaderFunctionArgs} from 'react-router';
import {
  useLoaderData,
  Link,
  useOutletContext,
  useRouteLoaderData,
  useNavigate,
  useSearchParams,
} from 'react-router';
import {ProductItem} from '~/components/ProductItem';
import {
  Pagination,
  getPaginationVariables,
  Image,
  Money,
  CartForm,
  Analytics,
} from '@shopify/hydrogen';
type ProductItemFragment = any;
import {useVariantUrl} from '~/utils';
import {useState, useEffect} from 'react';
import {useAside} from '~/components/Aside';
import {getVisibilityStatus} from '~/lib/visibility';
import {useI18n} from '~/lib/i18n';
import {getIsOutOfStock} from '~/lib/stock';
import {Price} from '~/components/Price';
import {AddToCartButton} from '~/components/AddToCartButton';
import {StockNotificationModal} from '~/components/StockNotificationModal';
import patternBg from '/images/second-bg-pattern.svg';

export const meta: MetaFunction<typeof loader> = ({data}) => {
  if (!data?.collection) {
    return [{title: 'Saadeddin Collections'}];
  }
  const {collection} = data;
  const title = `${collection.title} | Saadeddin`;
  const description =
    collection.description?.substring(0, 155) ||
    `Explore our ${collection.title} collection at Saadeddin.`;

  return [
    {title: title.substring(0, 60)},
    {name: 'description', content: description.substring(0, 160)},
    {property: 'og:title', content: title.substring(0, 60)},
    {property: 'og:description', content: description.substring(0, 160)},
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
        const existing = filters.find((f) => f.price);
        if (existing) {
          existing.price[type] = parseFloat(value);
        } else {
          filters.push({price: {[type]: parseFloat(value)}});
        }
      } else if (parts[2] === 'option') {
        const optionName = parts[3];
        filters.push({variantOption: {name: optionName, value}});
      } else if (parts[2] === 'availability') {
        filters.push({available: value === 'true'});
      } else if (parts[2] === 'product_type') {
        filters.push({productType: value});
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

  let targetCollection = collection;

  if (
    !targetCollection &&
    (handle === 'featured' || handle === 'featured_collections')
  ) {
    const isEn = storefront.i18n.language === 'EN';
    const fallbackRes: any = await storefront
      .query(FEATURED_PRODUCTS_FALLBACK_QUERY, {
        variables: {
          country: storefront.i18n.country,
          language: storefront.i18n.language,
        },
        cache: storefront.CacheNone(),
      })
      .catch(() => null);

    const tagged = fallbackRes?.taggedProducts?.nodes || [];
    const all = fallbackRes?.allProducts?.nodes || [];
    const specialProducts = [...tagged, ...all].filter((p: any) =>
      p.tags?.some(
        (t: string) =>
          t.toLowerCase() === 'special-collection' ||
          t.toLowerCase() === 'special_collection' ||
          t.toLowerCase().includes('special-collection'),
      ),
    );
    const uniqueSpecial = Array.from(
      new Map(specialProducts.map((p: any) => [p.id, p])).values(),
    );
    const productNodes =
      uniqueSpecial.length > 0
        ? uniqueSpecial
        : tagged.length > 0
          ? tagged
          : all;

    targetCollection = {
      id: 'gid://shopify/Collection/featured',
      handle: 'featured',
      title: isEn ? 'Featured Collections' : 'التشكيلات المميزة',
      description: isEn
        ? 'Collections crafted with ultimate care, telling the story of the craft since 1919'
        : 'تشكيلات صنعت بعناية فائقة، تحكي قصة الحرفة منذ 1919',
      image: null,
      products: {
        nodes: productNodes,
        filters: [],
        pageInfo: {
          hasPreviousPage: false,
          hasNextPage: false,
          startCursor: null,
          endCursor: null,
        },
      },
    };
  }

  if (!targetCollection) {
    return redirect(
      params.locale ? `/${params.locale}/collections` : '/collections',
    );
  }
  return data({collection: targetCollection, filters});
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
      <Analytics.CollectionView
        data={{collection: {id: collection.id, handle: collection.handle}}}
      />
      {/* SEO Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: collection.title,
            description: collection.description,
            url: `https://saadeddin.com${isEn ? `/en/collections/${collection.handle}` : `/collections/${collection.handle}`}`,
            ...(collection.image && {image: collection.image.url}),
            mainEntity: {
              '@type': 'ItemList',
              itemListElement: collection.products.nodes.map(
                (product: any, index: number) => ({
                  '@type': 'ListItem',
                  position: index + 1,
                  item: {
                    '@type': 'Product',
                    name: product.title,
                    url: `https://saadeddin.com${isEn ? `/en/products/${product.handle}` : `/products/${product.handle}`}`,
                  },
                }),
              ),
            },
          }),
        }}
      />

      {/* 1. Header Hero Section */}
      <CollectionHero
        collection={collection}
        productsCount={collection.products.nodes?.length || 0}
        isEn={isEn}
      />

      {/* Breadcrumb Strip */}
      <div className="bg-white border-b border-gray-100">
        <div className="px-4 md:px-8 lg:px-12 py-4 max-w-[1440px] mx-auto text-right text-[16px] font-black flex items-center gap-2 font-medium font-['GE_Dinar_One']">
          <span className="text-[#7d7d7d] text-500">
            {isEn ? 'Home' : 'الرئيسية'}
          </span>
          <span className="text-gray-300">/</span>
          <span className="text-[#171717]-800">
            {getCollectionDisplayTitle(collection, isEn)}
          </span>
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
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 3H2l8 9v11l4-6V12L22 3z" />
                    </svg>
                    <span>{isEn ? 'Filter' : 'تـصـفـيـة'}</span>
                  </button>

                  {/* Active Filter Pills */}
                  {Array.from(searchParams.entries())
                    .filter(
                      ([key]) =>
                        key.startsWith('filter.') &&
                        key !== 'filter.v.price.min' &&
                        key !== 'filter.v.price.max',
                    )
                    .map(([key, value], i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 bg-white border border-[#234745]/10 text-gray-600 px-3 py-1.5 rounded-full text-[12px] font-bold shadow-sm"
                      >
                        <span>{translateFilterValue(value, isEn)}</span>
                        <button
                          onClick={() => {
                            const params = new URLSearchParams(searchParams);
                            const allVals = params
                              .getAll(key)
                              .filter((v) => v !== value);
                            params.delete(key);
                            allVals.forEach((v) => params.append(key, v));
                            setSearchParams(params, {
                              preventScrollReset: true,
                              replace: true,
                            });
                          }}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="3"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    ))}
                  {(searchParams.get('filter.v.price.min') ||
                    searchParams.get('filter.v.price.max')) && (
                    <div className="flex items-center gap-2 bg-white border border-[#234745]/10 text-gray-600 px-3 py-1.5 rounded-full text-[12px] font-bold shadow-sm">
                      <span dir="ltr">
                        {searchParams.get('filter.v.price.min') || '0'} -{' '}
                        {searchParams.get('filter.v.price.max') || '∞'} SAR
                      </span>
                      <button
                        onClick={() => {
                          const params = new URLSearchParams(searchParams);
                          params.delete('filter.v.price.min');
                          params.delete('filter.v.price.max');
                          setSearchParams(params, {
                            preventScrollReset: true,
                            replace: true,
                          });
                        }}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="3"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  {/* Sort Dropdown */}
                  <div className="flex items-center gap-2">
                    <label className="text-gray-400 text-[13px] font-bold whitespace-nowrap">
                      {isEn ? 'Sort by:' : 'ترتيب حسب:'}
                    </label>
                    <div className="flex items-center bg-white border border-[#234745]/10 rounded-full px-4 py-2 shadow-sm relative w-40">
                      <select
                        aria-label={isEn ? 'Sort by' : 'ترتيب حسب'}
                        className="w-full bg-transparent text-[13px] font-bold text-gray-800 cursor-pointer focus:outline-none focus:ring-0 border-none appearance-none rtl:pl-6"
                        style={{WebkitAppearance: 'none', appearance: 'none'}}
                        onChange={(e) => {
                          const [key, rev] = e.target.value.split('|');
                          const params = new URLSearchParams(searchParams);
                          params.set('sortKey', key);
                          params.set('reverse', rev);
                          setSearchParams(params, {preventScrollReset: true});
                        }}
                        value={`${searchParams.get('sortKey') || 'COLLECTION_DEFAULT'}|${searchParams.get('reverse') || 'false'}`}
                      >
                        <option value="COLLECTION_DEFAULT|false">
                          {isEn ? 'Featured' : 'الأكثر صلة'}
                        </option>
                        <option value="BEST_SELLING|false">
                          {isEn ? 'Best Selling' : 'الأكثر مبيعاً'}
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
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2.5"
                          d="M19 9l-7 7-7-7"
                        ></path>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <Pagination connection={collection.products}>
                {({nodes, isLoading, PreviousLink, NextLink}) => {
                  const activeTagFilters = searchParams
                    .getAll('filter.p.tag')
                    .concat(searchParams.getAll('tag'));
                  const filteredNodes = nodes.filter((n: any) => {
                    if (q && !n.title.toLowerCase().includes(q)) return false;
                    // Exclude corporate tagged products unless browsing corporate collection
                    if (
                      collection.handle !== 'corporate' &&
                      collection.handle !== 'b2b'
                    ) {
                      const pTags = (n.tags || []).map((t: string) =>
                        t.toLowerCase(),
                      );
                      if (
                        pTags.includes('corporate') ||
                        pTags.includes('b2b') ||
                        pTags.includes('package')
                      )
                        return false;
                    }
                    if (activeTagFilters.length > 0) {
                      const pTags = (n.tags || []).map((t: string) =>
                        t.toLowerCase(),
                      );
                      const matchesTag = activeTagFilters.some((t) =>
                        pTags.includes(t.toLowerCase()),
                      );
                      if (!matchesTag) return false;
                    }
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
                        <NextLink
                          className="bg-[#234745] !text-white px-16 py-4 rounded-full font-black shadow-[0_10px_30px_rgba(27,61,46,0.3)] hover:shadow-[0_15px_40px_rgba(27,61,46,0.4)] hover:-translate-y-1 transition-all duration-300"
                          style={{color: '#ffffff'}}
                        >
                          {isLoading ? (
                            isEn ? (
                              'Loading...'
                            ) : (
                              'جاري التحميل...'
                            )
                          ) : (
                            <span
                              className="!text-white"
                              style={{color: '#ffffff'}}
                            >
                              {isEn ? 'Browse More ↓' : 'تصفح المزيد ↓'}
                            </span>
                          )}
                        </NextLink>
                      </div>
                    </>
                  );
                }}
              </Pagination>
            </div>

            {/* Desktop Sidebar (Right side in RTL) */}
            <div className="hidden lg:block w-[320px] shrink-0 lg:order-1 border border-gray-200 rounded-3xl bg-white sticky top-24 self-start h-fit overflow-hidden">
              <FilterSidebar
                filters={collection.products.filters}
                onClose={() => {}}
                isDesktop={true}
                isEn={isEn}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Sidebar */}
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
              className={`absolute left-0 top-0 bottom-0 w-full max-w-sm bg-[#FEF8EB] shadow-2xl transition-transform duration-500 ${isFilterOpen ? 'translate-x-0 pointer-events-auto' : isEn ? '-translate-x-full' : 'translate-x-full'} ${!isEn && 'right-0 left-auto'}`}
            >
              <FilterSidebar
                filters={collection.products.filters}
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

const translateFilterHeader = (label: string, isEn: boolean) => {
  if (isEn) return label;
  const l = String(label).toLowerCase().trim();
  const map: Record<string, string> = {
    availability: 'التوفر',
    price: 'السعر',
    'product type': 'نوع المنتج',
    product_type: 'نوع المنتج',
    vendor: 'المورد',
    'product vendor': 'المورد',
    'more filters': 'المزيد من الفلاتر',
  };
  return map[l] || label;
};

const translateFilterValue = (val: string, isEn: boolean) => {
  if (isEn) return val;
  const l = String(val).toLowerCase().trim();
  const map: Record<string, string> = {
    'in stock': 'متوفر',
    'out of stock': 'غير متوفر',
    true: 'متوفر',
    false: 'غير متوفر',
    '1': 'متوفر',
    '0': 'غير متوفر',
    yes: 'نعم',
    no: 'لا',
  };
  return map[l] || val;
};

const collectionTranslations: Record<string, string> = {
  wedding: 'زفاف وخطوبة',
  ramadan: 'رمضان',
  birthdays: 'أعياد الميلاد',
  eid: 'عيد الفطر والاضحى',
  'new-baby': 'مواليد',
  'national-day': 'اليوم الوطني',
  'mothers-day': 'يوم الأم',
  'mother-s-day': 'يوم الأم',
  graduation: 'تخرج',
  'corporate-gifts': 'هدايا مؤسسية',
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
  all: 'جميع المنتجات',
  'best-sellers': 'الأكثر مبيعاً',
  'new-arrivals': 'وصل حديثاً',
};

const collectionTitleTranslations: Record<string, string> = {
  "Mother's Day": 'يوم الأم',
  'Mothers Day': 'يوم الأم',
  'Mother’s Day': 'يوم الأم',
  Eid: 'عيد الفطر والأضحى',
  'Eid Al-Fitr': 'عيد الفطر',
  'Eid Al-Adha': 'عيد الأضحى',
  Wedding: 'زفاف وخطوبة',
  Ramadan: 'رمضان',
  Birthdays: 'أعياد الميلاد',
  Birthday: 'أعياد الميلاد',
  'New Baby': 'مواليد',
  'National Day': 'اليوم الوطني',
  Graduation: 'تخرج',
  'Corporate Gifts': 'هدايا مؤسسية',
  Corporate: 'هدايا مؤسسية',
  Chocolate: 'الشوكولاته',
  Cakes: 'الكيك',
  Cake: 'الكيك',
  Biscuits: 'البسكويت',
  Oriental: 'الحلويات الشرقية',
  Coffee: 'القهوة',
  Gifts: 'الهدايا',
  Cupcakes: 'الكب كيك',
  'Arabic Sweets': 'الحلويات العربية',
  'Oriental Sweets': 'الحلويات الشرقية',
  Sweets: 'الحلويات',
  Pastry: 'المعجنات',
  Pastries: 'المعجنات',
  Bakery: 'المخبوزات',
  'Ice Cream': 'الآيس كريم',
  Kunafa: 'كنافة',
  'Best Sellers': 'الأكثر مبيعاً',
  'New Arrivals': 'وصل حديثاً',
  'All Products': 'جميع المنتجات',
};

const getCollectionDisplayTitle = (collection: any, isEn: boolean) => {
  if (isEn) return collection?.title || '';

  const handle = collection?.handle?.toLowerCase();
  const title = collection?.title?.trim();

  if (handle && collectionTranslations[handle]) {
    return collectionTranslations[handle];
  }

  if (title && collectionTitleTranslations[title]) {
    return collectionTitleTranslations[title];
  }

  return collection?.title || '';
};

function CollectionHero({
  collection,
  productsCount,
  isEn,
}: {
  collection: any;
  productsCount: number;
  isEn: boolean;
}) {
  const displayTitle = getCollectionDisplayTitle(collection, isEn);

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
              onClick={() => window.history.back()}
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
              {displayTitle}
            </h1>
          </div>
        </div>

        {/* Left Side in RTL: Product Count */}
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

function FilterSidebar({
  filters,
  onClose,
  isDesktop = false,
  isEn,
}: {
  filters: any[];
  onClose: () => void;
  isDesktop?: boolean;
  isEn: boolean;
}) {
  return (
    <div
      className={`flex flex-col h-full ${isDesktop ? 'bg-white' : 'bg-[#FEF8EB] overflow-hidden'}`}
      dir={isEn ? 'ltr' : 'rtl'}
    >
      {!isDesktop && (
        <header className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-black text-[#234745]">
            {isEn ? 'Filter Results' : 'تصفية النتائج'}
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-[#234745] hover:bg-red-50 hover:text-red-500 transition-all font-bold text-2xl"
          >
            &times;
          </button>
        </header>
      )}

      <FilterForm
        onClose={onClose}
        filters={filters}
        isDesktop={isDesktop}
        isEn={isEn}
      />
    </div>
  );
}

function FilterForm({
  filters,
  onClose,
  isDesktop,
  isEn,
}: {
  filters: any[];
  onClose: () => void;
  isDesktop: boolean;
  isEn: boolean;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const toggleSection = (label: string) => {
    setOpenSections((prev) => ({...prev, [label]: !prev[label]}));
  };

  // Initialize open sections based on filters
  useEffect(() => {
    const initialOpens: Record<string, boolean> = {};
    filters?.forEach((f) => {
      initialOpens[f.label] = true;
    });
    setOpenSections((prev) =>
      Object.keys(prev).length === 0 ? initialOpens : prev,
    );
  }, [filters]);

  const handleApplyPrice = (minPrice: string, maxPrice: string) => {
    const params = new URLSearchParams(searchParams);
    if (minPrice) params.set('filter.v.price.min', minPrice);
    else params.delete('filter.v.price.min');

    if (maxPrice) params.set('filter.v.price.max', maxPrice);
    else params.delete('filter.v.price.max');

    setSearchParams(params, {preventScrollReset: true, replace: true});
  };

  const toggleFilter = (inputStr: string) => {
    try {
      const input = JSON.parse(inputStr) as any;
      const params = new URLSearchParams(searchParams);

      // Reconstruct the key based on the input object
      let key = '';
      let val = '';

      if (input.variantOption) {
        key = `filter.v.option.${input.variantOption.name}`;
        val = input.variantOption.value;
      } else if (input.productType) {
        key = 'filter.v.product_type';
        val = input.productType;
      } else if (input.productVendor) {
        key = 'filter.v.product_vendor';
        val = input.productVendor;
      } else if (input.productMetafield) {
        key = `filter.p.m.${input.productMetafield.namespace}.${input.productMetafield.key}`;
        val = input.productMetafield.value;
      } else if (input.available !== undefined) {
        key = 'filter.v.availability';
        val = input.available.toString();
      }

      if (key) {
        // If it already exists, remove it, else add it
        if (params.getAll(key).includes(val)) {
          const allVals = params.getAll(key).filter((v) => v !== val);
          params.delete(key);
          allVals.forEach((v) => params.append(key, v));
        } else {
          params.append(key, val);
        }
        setSearchParams(params, {preventScrollReset: true, replace: true});
      }
    } catch (e) {
      console.error('Failed to parse filter input', e);
    }
  };

  const isFilterActive = (inputStr: string) => {
    try {
      const input = JSON.parse(inputStr) as any;
      const params = new URLSearchParams(searchParams);

      if (input.variantOption) {
        return params
          .getAll(`filter.v.option.${input.variantOption.name}`)
          .includes(input.variantOption.value);
      } else if (input.productType) {
        return params
          .getAll('filter.v.product_type')
          .includes(input.productType);
      } else if (input.productVendor) {
        return params
          .getAll('filter.v.product_vendor')
          .includes(input.productVendor);
      } else if (input.productMetafield) {
        return params
          .getAll(
            `filter.p.m.${input.productMetafield.namespace}.${input.productMetafield.key}`,
          )
          .includes(input.productMetafield.value);
      } else if (input.available !== undefined) {
        return params
          .getAll('filter.v.availability')
          .includes(input.available.toString());
      }
    } catch (e) {}
    return false;
  };

  return (
    <div
      className={`flex-1 ${isDesktop ? 'p-6' : 'overflow-y-auto p-6 pt-4'} flex flex-col`}
    >
      <div className="flex-1">
        {/* Search Input */}
        <div className="mb-8">
          <div className="relative">
            <input
              type="text"
              placeholder={isEn ? 'Search products...' : 'إبحث في المنتجات...'}
              defaultValue={searchParams.get('q') || ''}
              className={`w-full bg-[#c4d1cc] !border-0 !rounded-full py-3 px-5 text-[14px] font-bold focus:!outline-none focus:!ring-0 transition-all text-[#234745] placeholder-[#234745] !shadow-none outline-none appearance-none ${isEn ? 'pl-12 text-left' : 'pr-12 text-right'}`}
              onChange={(e) => {
                const val = e.target.value;
                const params = new URLSearchParams(searchParams);
                if (val) params.set('q', val);
                else params.delete('q');
                setSearchParams(params, {
                  preventScrollReset: true,
                  replace: true,
                });
              }}
            />
            <svg
              className={`absolute top-1/2 -translate-y-1/2 text-[#234745] ${isEn ? 'left-4' : 'right-4'}`}
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
        </div>

        {filters?.map((filter: any) => {
          const lowerId = (filter.id || '').toLowerCase();
          const lowerLabel = (filter.label || '').toLowerCase();
          if (
            lowerId.includes('availability') ||
            lowerLabel === 'availability' ||
            filter.label === 'التوفر' ||
            filter.id === 'filter.p.tag' ||
            filter.label === 'More filters' ||
            filter.label === 'المزيد من الفلاتر'
          )
            return null;
          const isOpen = openSections[filter.label] !== false;

          if (filter.type === 'PRICE_RANGE') {
            const minPrice = searchParams.get('filter.v.price.min') || '';
            const maxPrice = searchParams.get('filter.v.price.max') || '';

            return (
              <div
                key={filter.id}
                className="mb-6 border-b border-gray-100 pb-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => toggleSection(filter.label)}
                    className={`flex-1 flex items-center gap-2 group ${isEn ? 'text-left' : 'text-right'}`}
                  >
                    <h3 className="text-[15px] font-black text-gray-800 tracking-wide flex items-center gap-1">
                      {filter.label} <CurrencyIcon className="w-[18px]" />
                    </h3>
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleApplyPrice('', '')}
                    className="text-[13px] font-black text-red-500 hover:text-red-600 transition-colors"
                  >
                    {isEn ? 'Clear' : 'مسح'}
                  </button>
                </div>
                <div
                  className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}
                >
                  <div className="flex gap-2 items-center mb-4">
                    <div className="flex-1 relative">
                      <input
                        aria-label={
                          isEn ? 'Minimum Price' : 'الحد الأدنى للسعر'
                        }
                        type="number"
                        defaultValue={minPrice}
                        onBlur={(e) =>
                          handleApplyPrice(e.target.value, maxPrice)
                        }
                        placeholder={isEn ? 'Min' : 'من'}
                        className="w-full bg-white border border-gray-200 rounded-full px-4 py-2 text-sm font-bold focus:outline-none focus:border-[#234745] transition-all text-center"
                      />
                    </div>
                    <span className="text-gray-400 font-bold">-</span>
                    <div className="flex-1 relative">
                      <input
                        aria-label={
                          isEn ? 'Maximum Price' : 'الحد الأقصى للسعر'
                        }
                        type="number"
                        defaultValue={maxPrice}
                        onBlur={(e) =>
                          handleApplyPrice(minPrice, e.target.value)
                        }
                        placeholder={isEn ? 'Max' : 'إلي'}
                        className="w-full bg-white border border-gray-200 rounded-full px-4 py-2 text-sm font-bold focus:outline-none focus:border-[#234745] transition-all text-center"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={filter.id} className="mb-6 border-b border-gray-100 pb-6">
              <button
                onClick={() => toggleSection(filter.label)}
                className="w-full flex items-center justify-between group"
              >
                <h3 className="text-[15px] font-black text-gray-800 tracking-wide">
                  {translateFilterHeader(filter.label, isEn)}
                </h3>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              <div
                className={`mt-4 overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}
              >
                <div className="flex flex-col gap-3">
                  {filter.values.map((val: any) => {
                    const active = isFilterActive(val.input);
                    return (
                      <label
                        key={val.id}
                        className="flex items-center justify-between cursor-pointer group"
                        onClick={() => toggleFilter(val.input)}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors ${active ? 'bg-[#234745] border-[#234745]' : 'border-gray-300 bg-white group-hover:border-[#234745]'}`}
                          >
                            {active && (
                              <svg
                                className="w-3 h-3 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth="3"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </div>
                          <span
                            className={`text-[13px] font-bold ${active ? 'text-[#234745]' : 'text-gray-500 group-hover:text-gray-800'}`}
                          >
                            {translateFilterValue(val.label, isEn)}
                          </span>
                        </div>
                        <span className="text-[12px] font-medium text-gray-500">
                          ({val.count})
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dietary Type Filter Section */}
      <div className="mb-6 border-b border-gray-100 pb-6 mt-6">
        <button
          onClick={() => toggleSection('النوع الغذائي')}
          className="w-full flex items-center justify-between group"
        >
          <h3 className="text-[15px] font-black text-gray-800 tracking-wide">
            {isEn ? 'Dietary Preference' : 'النوع الغذائي'}
          </h3>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${openSections['النوع الغذائي'] !== false ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        <div
          className={`mt-4 overflow-hidden transition-all duration-300 ${openSections['النوع الغذائي'] !== false ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}
        >
          <div className="flex flex-col gap-3">
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
              const activeTag = item.tags.find((t) =>
                searchParams.getAll('filter.p.tag').includes(t),
              );
              const active = !!activeTag;
              const primaryTag = item.tags[0];

              return (
                <button
                  type="button"
                  key={i}
                  className="flex items-center gap-3 cursor-pointer group w-full text-start outline-none"
                  onClick={() => {
                    const params = new URLSearchParams(searchParams);
                    if (active) {
                      const allVals = params
                        .getAll('filter.p.tag')
                        .filter((v) => !item.tags.includes(v));
                      params.delete('filter.p.tag');
                      allVals.forEach((v) => params.append('filter.p.tag', v));
                    } else {
                      params.append('filter.p.tag', primaryTag);
                    }
                    setSearchParams(params, {
                      preventScrollReset: true,
                      replace: true,
                    });
                  }}
                >
                  <div
                    className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors ${active ? 'bg-[#234745] border-[#234745]' : 'border-gray-300 bg-white group-hover:border-[#234745]'}`}
                  >
                    {active && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="3"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                  <span
                    className={`text-[13px] font-bold ${active ? 'text-[#234745]' : 'text-gray-500 group-hover:text-gray-800'}`}
                  >
                    {isEn ? item.labelEn : item.labelAr}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Custom Tag Filters */}
      <div className="mb-6 border-b border-gray-100 pb-6 mt-6">
        <button
          onClick={() => toggleSection('المناسبة')}
          className="w-full flex items-center justify-between group"
        >
          <h3 className="text-[15px] font-black text-gray-800 tracking-wide">
            {isEn ? 'Occasion' : 'المناسبة'}
          </h3>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${openSections['المناسبة'] !== false ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        <div
          className={`mt-4 overflow-hidden transition-all duration-300 ${openSections['المناسبة'] !== false ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}
        >
          <div className="flex flex-col gap-3">
            {[
              {
                labelAr: 'عيد الفطر والاضحي',
                labelEn: 'Eid Al-Fitr & Al-Adha',
                tag: 'eid',
              },
              {labelAr: 'رمضان', labelEn: 'Ramadan', tag: 'ramadan'},
              {
                labelAr: 'أعياد الميلاد',
                labelEn: 'Birthdays',
                tag: 'birthdays',
              },
              {
                labelAr: 'زفاف وخطوبة',
                labelEn: 'Wedding & Engagement',
                tag: 'wedding',
              },
              {labelAr: 'تخرج', labelEn: 'Graduation', tag: 'graduation'},
              {
                labelAr: 'يوم الأم',
                labelEn: "Mother's Day",
                tag: 'mothers-day',
              },
              {
                labelAr: 'اليوم الوطني',
                labelEn: 'National Day',
                tag: 'national-day',
              },
              {labelAr: 'مواليد', labelEn: 'New Baby', tag: 'new-baby'},
            ].map((item, i) => {
              const active = searchParams
                .getAll('filter.p.tag')
                .includes(item.tag);
              return (
                <label
                  key={i}
                  className="flex items-center gap-3 cursor-pointer group"
                  onClick={(e) => {
                    e.preventDefault();
                    const params = new URLSearchParams(searchParams);
                    if (active) {
                      const allVals = params
                        .getAll('filter.p.tag')
                        .filter((v) => v !== item.tag);
                      params.delete('filter.p.tag');
                      allVals.forEach((v) => params.append('filter.p.tag', v));
                    } else {
                      params.append('filter.p.tag', item.tag);
                    }
                    setSearchParams(params, {
                      preventScrollReset: true,
                      replace: true,
                    });
                  }}
                >
                  <div
                    className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors ${active ? 'bg-[#234745] border-[#234745]' : 'border-gray-300 bg-white group-hover:border-[#234745]'}`}
                  >
                    {active && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="3"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                  <span
                    className={`text-[13px] font-bold ${active ? 'text-[#234745]' : 'text-gray-500 group-hover:text-gray-800'}`}
                  >
                    {isEn ? item.labelEn : item.labelAr}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mb-6 border-b border-gray-100 pb-6">
        <button
          onClick={() => toggleSection('لمن الهدية')}
          className="w-full flex items-center justify-between group"
        >
          <h3 className="text-[15px] font-black text-gray-800 tracking-wide">
            {isEn ? 'Gift For' : 'لمن الهدية'}
          </h3>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${openSections['لمن الهدية'] !== false ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        <div
          className={`mt-4 overflow-hidden transition-all duration-300 ${openSections['لمن الهدية'] !== false ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}
        >
          <div className="flex flex-col gap-3">
            {[
              {labelAr: 'الأب', labelEn: 'Father', tag: 'father'},
              {labelAr: 'الأم', labelEn: 'Mother', tag: 'mother'},
              {labelAr: 'الأصدقاء', labelEn: 'Friends', tag: 'friends'},
              {labelAr: 'الزملاء', labelEn: 'Colleagues', tag: 'colleagues'},
              {labelAr: 'الأطفال', labelEn: 'Children', tag: 'children'},
              {labelAr: 'الشركات', labelEn: 'Companies', tag: 'companies'},
            ].map((item, i) => {
              const active = searchParams
                .getAll('filter.p.tag')
                .includes(item.tag);
              return (
                <label
                  key={i}
                  className="flex items-center gap-3 cursor-pointer group"
                  onClick={(e) => {
                    e.preventDefault();
                    const params = new URLSearchParams(searchParams);
                    if (active) {
                      const allVals = params
                        .getAll('filter.p.tag')
                        .filter((v) => v !== item.tag);
                      params.delete('filter.p.tag');
                      allVals.forEach((v) => params.append('filter.p.tag', v));
                    } else {
                      params.append('filter.p.tag', item.tag);
                    }
                    setSearchParams(params, {
                      preventScrollReset: true,
                      replace: true,
                    });
                  }}
                >
                  <div
                    className={`w-4 h-4 rounded-[4px] border flex items-center justify-center transition-colors ${active ? 'bg-[#234745] border-[#234745]' : 'border-gray-300 bg-white group-hover:border-[#234745]'}`}
                  >
                    {active && (
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="3"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                  <span
                    className={`text-[13px] font-bold ${active ? 'text-[#234745]' : 'text-gray-500 group-hover:text-gray-800'}`}
                  >
                    {isEn ? item.labelEn : item.labelAr}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Link
          to={typeof window !== 'undefined' ? window.location.pathname : ''}
          className="w-full flex items-center justify-center border border-[#234745] text-[#234745] bg-white rounded-full py-3 font-bold text-sm hover:bg-gray-50 transition-all"
        >
          {isEn ? 'Clear all filters' : 'مسح كل الفلاتر'}
        </Link>
      </div>
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
      ? 'grid grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8'
      : 'flex flex-col gap-5';

  return (
    <div className={containerClasses}>
      {products.map((product, index) => {
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
  fragment HandleProductItem on Product {
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

function CurrencyIcon({className = 'w-[20px]'}: {className?: string}) {
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
          ...HandleProductItem
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

const FEATURED_PRODUCTS_FALLBACK_QUERY = `#graphql
  ${PRODUCT_ITEM_FRAGMENT}
  query FeaturedProductsFallback(
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    taggedProducts: products(first: 100, query: "tag:special-collection OR tag:special_collection OR tag:featured") {
      nodes {
        ...HandleProductItem
      }
    }
    allProducts: products(first: 100) {
      nodes {
        ...HandleProductItem
      }
    }
  }
` as const;
