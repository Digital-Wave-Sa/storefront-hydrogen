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
import {StockNotificationModal} from '~/components/StockNotificationModal';
import {FilterSidebar} from './($locale).collections.all';
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

  const isClassicHandle = handle === 'classic-packages' || handle === 'classic';
  const isFeaturedHandle =
    handle === 'featured-packages' || handle === 'featured-corporate';

  if (
    isClassicHandle &&
    (!targetCollection || !targetCollection.products?.nodes?.length)
  ) {
    const isEn = storefront.i18n.language === 'EN';
    const fallbackRes: any = await storefront
      .query(CORPORATE_PRODUCTS_FALLBACK_QUERY, {
        variables: {
          country: storefront.i18n.country,
          language: storefront.i18n.language,
        },
        cache: storefront.CacheNone(),
      })
      .catch(() => null);

    const all = fallbackRes?.allProducts?.nodes || [];
    const matchingProducts = all.filter((p: any) =>
      p.tags?.some((t: string) => {
        const clean = t.toLowerCase().replace(/[-_\s]/g, '');
        return (
          clean.includes('corporateclassic') ||
          clean.includes('classicpackage') ||
          clean.includes('corporate') ||
          clean.includes('classic') ||
          clean.includes('b2b')
        );
      }),
    );

    const productNodes = matchingProducts.length > 0 ? matchingProducts : all;
    const edges = productNodes.map((node: any) => ({
      cursor: node.id,
      node,
    }));

    targetCollection = {
      id: targetCollection?.id || 'gid://shopify/Collection/classic-packages',
      handle: 'classic-packages',
      title:
        targetCollection?.title ||
        (isEn ? 'Classic Corporate Packages' : 'الباقة الكلاسيكية'),
      description:
        targetCollection?.description ||
        (isEn
          ? 'An elegant gift for various corporate occasions with premium packaging and your company logo.'
          : 'هدية أنيقة لمختلف المناسبات الرسمية مع تغليف فاخر وشعار شركتك.'),
      image: targetCollection?.image || null,
      products: {
        nodes: productNodes,
        edges,
        filters: [],
        pageInfo: {
          hasPreviousPage: false,
          hasNextPage: false,
          startCursor: edges[0]?.cursor || null,
          endCursor: edges[edges.length - 1]?.cursor || null,
        },
      },
    };
  }

  if (
    isFeaturedHandle &&
    (!targetCollection || !targetCollection.products?.nodes?.length)
  ) {
    const isEn = storefront.i18n.language === 'EN';
    const fallbackRes: any = await storefront
      .query(CORPORATE_PRODUCTS_FALLBACK_QUERY, {
        variables: {
          country: storefront.i18n.country,
          language: storefront.i18n.language,
        },
        cache: storefront.CacheNone(),
      })
      .catch(() => null);

    const all = fallbackRes?.allProducts?.nodes || [];
    const matchingProducts = all.filter((p: any) =>
      p.tags?.some((t: string) => {
        const clean = t.toLowerCase().replace(/[-_\s]/g, '');
        return (
          clean.includes('corporatefeatured') ||
          clean.includes('featuredpackage') ||
          clean.includes('corporate') ||
          clean.includes('featured') ||
          clean.includes('b2b')
        );
      }),
    );

    const productNodes = matchingProducts.length > 0 ? matchingProducts : all;
    const edges = productNodes.map((node: any) => ({
      cursor: node.id,
      node,
    }));

    targetCollection = {
      id: targetCollection?.id || 'gid://shopify/Collection/featured-packages',
      handle: 'featured-packages',
      title:
        targetCollection?.title ||
        (isEn ? 'Featured Corporate Packages' : 'الباقة المميزة'),
      description:
        targetCollection?.description ||
        (isEn
          ? 'A sophisticated choice for VIP clients and partners, with curated contents and striking packaging.'
          : 'اختيار راقٍ للعملاء وكبار الشركاء، بمحتوى مدروس وتغليف لافت.'),
      image: targetCollection?.image || null,
      products: {
        nodes: productNodes,
        edges,
        filters: [],
        pageInfo: {
          hasPreviousPage: false,
          hasNextPage: false,
          startCursor: edges[0]?.cursor || null,
          endCursor: edges[edges.length - 1]?.cursor || null,
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
  const globalCollections = rootData?.header?.collections || rootData?.collections || [];

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
                  const effectiveNodes =
                    (nodes && nodes.length > 0)
                      ? nodes
                      : (collection.products.nodes || []);
                  const activeTagFilters = searchParams
                    .getAll('filter.p.tag')
                    .concat(searchParams.getAll('tag'));
                  const filteredNodes = effectiveNodes.filter((n: any) => {
                    if (q && !n.title.toLowerCase().includes(q)) return false;
                    // Exclude corporate tagged products unless browsing corporate collections
                    const isCorporateCollection =
                      collection.handle.includes('corporate') ||
                      collection.handle.includes('b2b') ||
                      collection.handle.includes('package') ||
                      collection.handle === 'classic-packages' ||
                      collection.handle === 'featured-packages' ||
                      collection.handle === 'custom-packages';

                    if (!isCorporateCollection) {
                      const pTags = (n.tags || []).map((t: string) =>
                        t.toLowerCase(),
                      );
                      if (
                        pTags.includes('corporate') ||
                        pTags.includes('b2b') ||
                        pTags.includes('package') ||
                        pTags.some((t: string) => t.includes('corporate'))
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
            <div className="hidden lg:block w-72 shrink-0 lg:order-1">
              <FilterSidebar
                filters={collection.products.filters}
                collections={globalCollections}
                onClose={() => {}}
                isDesktop={true}
                isEn={isEn}
                hideCategories={true}
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
                collections={globalCollections}
                onClose={() => setIsFilterOpen(false)}
                isEn={isEn}
                hideCategories={true}
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
  'classic-packages': 'الباقة الكلاسيكية',
  'featured-packages': 'الباقة المميزة',
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
        edges {
          cursor
          node {
            id
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

const CORPORATE_PRODUCTS_FALLBACK_QUERY = `#graphql
  ${PRODUCT_ITEM_FRAGMENT}
  query CorporateProductsFallback(
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    allProducts: products(first: 250) {
      nodes {
        ...HandleProductItem
      }
    }
  }
` as const;
