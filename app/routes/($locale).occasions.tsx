import {
  data,
  type LoaderFunctionArgs,
  type MetaFunction,
  useLoaderData,
  Link,
  useRouteLoaderData,
  useSearchParams,
} from 'react-router';
import {useState, useEffect} from 'react';
import {ProductItem} from '~/components/ProductItem';
import {PageHeader} from '~/components/layout/PageHeader';

import {pageTitle} from '~/lib/seo';
import {resolveOccasions} from '~/lib/occasions';
import { ComingSoonBadge } from '~/components/ComingSoonBadge';
import { useCakeBuilderEnabled, isCustomCakeUrl } from '~/lib/cake-builder';
export const meta: MetaFunction = ({matches}) => {
  return [{title: pageTitle(matches, 'Occasions', 'المناسبات')}];
};

const PRODUCT_ITEM_FRAGMENT = `#graphql
  fragment OccasionsProductItem on Product {
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
    preorder_enabled: metafield(namespace: "custom", key: "preorder_enabled") { value }
    preorder_available_from: metafield(namespace: "custom", key: "preorder_available_from") { value }
    preorder_lead_days: metafield(namespace: "custom", key: "preorder_lead_days") { value }
    preorder_until: metafield(namespace: "custom", key: "preorder_until") { value }
  }
` as const;

export async function loader({context, request}: LoaderFunctionArgs) {
  const {storefront} = context;

  // Which occasion is open, if any. The occasion handle is also the handle of
  // the Shopify collection behind it, so this is what we look the collection up
  // by. "all" is not a collection -- it means show everything.
  const requested = new URL(request.url).searchParams.get('category') || '';
  const collectionHandle = requested && requested !== 'all' ? requested : '';

  // collections  -> card images and titles only
  // occasionCollection -> the products actually shown for the open occasion
  // products     -> tag-based fallback, for occasions with no collection yet
  const query = `#graphql
    ${PRODUCT_ITEM_FRAGMENT}
    query OccasionsProducts(
      $country: CountryCode
      $language: LanguageCode
      $handle: String!
      $hasHandle: Boolean!
    ) @inContext(country: $country, language: $language) {
      # All collections, filtered in code by ~/lib/occasions (the Storefront
      # API cannot filter by metafield). Keep the window above the store's
      # collection count (~55) or an occasion silently drops off the cards.
      collections(first: 100) {
        nodes {
          id
          title
          handle
          image {
            url
            altText
          }
          isOccasion: metafield(namespace: "custom", key: "is_occasion") { value }
          occasionOrder: metafield(namespace: "custom", key: "occasion_order") { value }
          occasionVisible: metafield(namespace: "custom", key: "occasion_visible") { value }
        }
      }
      occasionCollection: collection(handle: $handle) @include(if: $hasHandle) {
        id
        handle
        title
        products(first: 250) {
          nodes {
            ...OccasionsProductItem
          }
        }
      }
      products(first: 200, query: "tag:wedding OR tag:ramadan OR tag:birthdays OR tag:eid OR tag:new-baby OR tag:national-day OR tag:mothers-day OR tag:graduation OR tag:occasion") {
        nodes {
          ...OccasionsProductItem
        }
      }
    }
  `;

  try {
    const result: any = await storefront.query(query, {
      variables: {
        country: storefront.i18n.country,
        language: storefront.i18n.language,
        handle: collectionHandle,
        hasHandle: Boolean(collectionHandle),
      },
      cache: storefront.CacheNone(),
    });

    return data({
      products: result?.products?.nodes || [],
      collections: result?.collections?.nodes || [],
      collectionHandle,
      collectionProducts: result?.occasionCollection?.products?.nodes || [],
      error: null,
    });
  } catch (e: any) {
    return data({
      products: [],
      collections: [],
      collectionHandle: '',
      collectionProducts: [],
      error: e.message,
    });
  }
}

export default function OccasionsPage() {
  const {products, collections, collectionHandle, collectionProducts, error} =
    useLoaderData<typeof loader>();
  const rootData = useRouteLoaderData('root') as any;
  const locale = rootData?.locale || 'ar';
  const isEn = locale === 'en';
  const cakeBuilderOpen = useCakeBuilderEnabled();

  /**
   * Every occasion, hidden ones included, merchandised in Shopify
   * (~/lib/occasions -- same resolver and rules as the homepage row and the
   * app). Cards and chips show the visible ones; tag filtering and the heading
   * look an occasion up by handle across all of them, so a hidden occasion's
   * page (/occasions?category=eid) keeps working while its card is off.
   */
  const allOccasions = resolveOccasions(collections, isEn);

  const [searchParams, setSearchParams] = useSearchParams();
  const urlCategory = searchParams.get('category');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    urlCategory || null,
  );

  useEffect(() => {
    setSelectedCategory(urlCategory || null);
  }, [urlCategory]);

  const occasionCards = allOccasions
    .filter((occ) => occ.visible)
    .map((occ) => {
      const matchingProd = (products || []).find((p: any) => {
        const tags = (p.tags || []).map((t: string) => t.toLowerCase());
        return tags.includes(occ.handle.toLowerCase());
      });

      return {
        handle: occ.handle,
        name: occ.name,
        image:
          occ.image ||
          matchingProd?.featuredImage?.url ||
          '/images/custom-cake.webp',
      };
    });

  // Tag-based selection. This is now the FALLBACK, kept for occasions that have
  // no collection in Shopify yet -- most products carry no tags at all, which is
  // why these pages were coming up empty.
  const filteredProducts = products.filter((p: any) => {
    if (!selectedCategory || selectedCategory === 'all') return true;

    const occ = allOccasions.find((o) => o.handle === selectedCategory);
    if (!occ) return true;

    const tags = (p.tags || []).map((t: string) => t.toLowerCase());
    return (
      tags.includes(occ.handle.toLowerCase()) ||
      tags.includes(occ.name.toLowerCase()) ||
      tags.includes(`occasion-${occ.handle}`) ||
      tags.includes(occ.handle.replace('-', ''))
    );
  });

  // What the page actually shows.
  //
  // An occasion handle is also its collection handle, so the collection's own
  // products win: adding a product to the national-day collection in Shopify is
  // enough to make it appear here, with no tagging and no deploy.
  //
  // The handle check matters. Clicking a chip updates local state immediately
  // while the loader is still fetching, so without it the page would briefly
  // show the previous occasion's collection under the new occasion's heading.
  const collectionMatchesSelection =
    Boolean(selectedCategory) &&
    selectedCategory !== 'all' &&
    collectionHandle === selectedCategory;

  const displayProducts =
    collectionMatchesSelection && collectionProducts.length > 0
      ? collectionProducts
      : filteredProducts;
  const selectedCatLabel =
    allOccasions.find((o) => o.handle === selectedCategory)?.name ||
    selectedCategory;

  const isInitialLanding = !selectedCategory;

  return (
    <div
      className={`min-h-screen bg-white ${isEn ? 'font-en' : "font-['GE_Dinar_One']"}`}
      dir={isEn ? 'ltr' : 'rtl'}
    >
      {/* Hero Section */}
      <PageHeader
        title={isEn ? 'What is your occasion?' : 'ما هي مناسبتك؟'}
        subtitle={
          isEn
            ? 'Choose the occasion and we pick the best for you'
            : 'اختر المناسبة ونختار لك الأفضل'
        }
        isEn={isEn}
      />

      {/* FIRST LOAD: Occasion Cards Grid */}
      {isInitialLanding ? (
        <div className="max-w-[1200px] mx-auto px-4 lg:px-8 py-10 pb-16">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
            {occasionCards.map((occasion, index) => (
              <Link
                key={index}
                to={
                  isEn
                    ? `/en/occasions?category=${occasion.handle}`
                    : `/occasions?category=${occasion.handle}`
                }
                onClick={() => setSelectedCategory(occasion.handle)}
                className="group flex flex-col bg-[#EED5D7] rounded-[16px] overflow-hidden transition-all duration-500 hover:shadow-xl hover:-translate-y-2 relative shadow-sm"
                style={{aspectRatio: '280/328'}}
              >
                {/* Pattern Overlay Layer */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-[30%] z-0 pointer-events-none"
                  style={{
                    backgroundImage: `url('/assets/patterns/occassions-bg.svg')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'bottom center',
                    backgroundRepeat: 'no-repeat',
                    opacity: 0.4,
                    maskImage:
                      'linear-gradient(to top, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 100%)',
                    WebkitMaskImage:
                      'linear-gradient(to top, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 100%)',
                  }}
                />

                <div className="p-2.5 flex flex-col h-full relative z-10">
                  {/* Image Container */}
                  <div className="w-full aspect-square rounded-[12px] overflow-hidden bg-white relative">
                    <img
                      src={occasion.image}
                      alt={occasion.name}
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                    />
                  </div>

                  {/* Label Area */}
                  <div className="relative w-full mt-auto flex-1 flex items-center justify-center">
                    <h3
                      className="relative pt-2 text-[20px] lg:text-[24px] font-bold text-[#171717] z-10 px-2 text-center leading-tight"
                      style={{
                        fontFamily:
                          "'EnglishDigits', 'Bahij Janna', sans-serif",
                      }}
                    >
                      {occasion.name}
                    </h3>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        /* INNER PAGE: Occasion Category View with Back Button, Filter Pills & Products */
        <>
          {/* Category Filter Pills Tabs Bar */}
          <div className="max-w-[1200px] mx-auto px-4 lg:px-8 pt-8 pb-4">
            <div className="flex items-center justify-start md:justify-center gap-2.5 overflow-x-auto hide-scrollbars py-2 px-1 w-full max-w-full">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory(null);
                  setSearchParams({});
                }}
                className={`shrink-0 h-[40px] px-4 py-[10px] rounded-[25px] text-[16px] leading-[100%] text-center inline-flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  !selectedCategory || selectedCategory === 'all'
                    ? 'bg-[#BBCFCD] text-[#234745] font-bold shadow-sm border-0'
                    : 'bg-white border border-[#234745] text-[#234745] font-medium hover:bg-[#BBCFCD]/20'
                }`}
                style={{fontFamily: "'GE Dinar One', sans-serif"}}
              >
                {isEn ? 'All Occasions' : 'جميع المناسبات'}
              </button>

              {occasionCards.map((cat, idx) => {
                const isSelected = selectedCategory === cat.handle;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.handle);
                      setSearchParams({category: cat.handle});
                    }}
                    className={`shrink-0 h-[40px] px-4 py-[10px] rounded-[25px] text-[16px] leading-[100%] text-center inline-flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#BBCFCD] text-[#234745] font-bold shadow-sm border-0'
                        : 'bg-white border border-[#234745] text-[#234745] font-medium hover:bg-[#BBCFCD]/20'
                    }`}
                    style={{fontFamily: "'GE Dinar One', sans-serif"}}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Products Section */}
          <div className="max-w-[1200px] mx-auto px-4 lg:px-8 pb-16">
            <h2 className="text-[24px] lg:text-[32px] font-black text-[#1A1A1A] mb-8">
              {selectedCategory === 'all'
                ? isEn
                  ? 'All Occasion Products'
                  : 'جميع منتجات المناسبات'
                : isEn
                  ? `Suggestions for ${selectedCatLabel}`
                  : `مقترحات لـ ${selectedCatLabel}`}
            </h2>

            {displayProducts.length > 0 ? (
              // Same column counts as the occasion cards grid above, so the two
              // sections line up at every breakpoint.
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
                {displayProducts.map((product: any) => (
                  <ProductItem key={product.id} product={product} loading="lazy" />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-[#8B8B8B] font-bold">
                {isEn
                  ? 'No products found for this occasion.'
                  : 'لا توجد منتجات لهذه المناسبة.'}
              </div>
            )}
          </div>
        </>
      )}

      {/* Promotional Banners */}
      <div className="max-w-[1200px] mx-auto px-4 lg:px-8 pb-32 lg:pb-48 flex flex-col gap-12 lg:gap-20">
        {/* Custom Cake Banner */}
        <Link
          to={isEn ? '/en/custom-cake' : '/custom-cake'}
          className="block w-full"
        >
          <div className="w-full bg-[#EED5D7] rounded-[24px] flex flex-col md:flex-row items-center relative overflow-hidden min-h-[200px] lg:min-h-[220px]">
            {/* Content Side */}
            <div
              className={`w-full md:w-[60%] flex flex-col relative z-10 px-8 pt-8 pb-4 md:pt-8 md:pb-8 lg:px-16 py-10 md:items-start text-start`}
            >
              {!cakeBuilderOpen && (
                <ComingSoonBadge isEn={isEn} className="mb-3 !text-[13px] !px-3 !py-1" />
              )}
              <h2
                className={`text-[26px] font-bold text-[#234745] mb-2`}
                style={{
                  fontFamily: !isEn ? "'Bahij Janna', sans-serif" : undefined,
                  lineHeight: '100%',
                }}
              >
                {isEn
                  ? "Didn't find what you're looking for?"
                  : 'لم تجد ما تبحث عنه؟'}
              </h2>
              <p
                className="text-[#7D7D7D] font-medium text-[16px] !mb-6"
                style={{
                  fontFamily: !isEn ? "'GE Dinar One', sans-serif" : undefined,
                  lineHeight: '100%',
                }}
              >
                {isEn
                  ? 'No problem! You can design your own cake easily now.'
                  : 'لا مشكلة! يمكنك تصميم كيكتك الخاصة الان وبكل سهولة'}
              </p>
              <div className="bg-[#234745] hover:bg-[#1a3533] text-[#FEF8EB] px-10 py-3 rounded-[25px] font-bold transition-all w-full text-center items-center md:items-start w-full md:w-max shadow-sm mt-2">
                {isEn ? 'Design Your Cake' : 'صمم كيكتك'}
              </div>
            </div>

            {/* Image Side */}
            <div className="w-full md:w-[40%] h-full flex items-center justify-center p-6 lg:p-8 relative z-10 shrink-0">
              <img
                src="/images/custom-cake.webp"
                className="w-full h-auto object-contain max-w-[200px] lg:max-w-[240px]"
                alt="Custom Cake Design"
              />
            </div>
          </div>
        </Link>

        {/* Gift Voucher Banner */}
        <Link to={isEn ? '/en/vouchers' : '/vouchers'} className="block w-full">
          <div className="w-full bg-[#FEF8EB] rounded-[24px] flex flex-col md:flex-row items-center relative overflow-hidden min-h-[300px] lg:min-h-[340px]">
            {/* Weave Pattern behind text */}
            <div
              className={`absolute top-0 ${isEn ? 'left-0' : 'right-0'} w-[55%] h-full opacity-40 pointer-events-none`}
              style={{
                backgroundImage: 'url("/images/offers-pattern.svg")',
                backgroundRepeat: 'repeat',
                backgroundSize: '300px',
                maskImage: `linear-gradient(${isEn ? 'to right' : 'to left'}, black 40%, transparent 100%)`,
                WebkitMaskImage: `linear-gradient(${isEn ? 'to right' : 'to left'}, black 40%, transparent 100%)`,
              }}
            />

            {/* Content Side */}
            <div
              className={`w-full md:w-[55%] flex flex-col relative z-10 px-8 lg:px-16 py-12 items-center md:items-start text-center md:text-start`}
            >
              <div
                className="text-white text-[14px] font-bold mb-6 shadow-sm flex items-center justify-center w-max"
                style={{
                  background: '#E64950',
                  borderRadius: '25px',
                  padding: '6px 16px',
                }}
              >
                {isEn ? 'Gift Voucher' : 'قسيمة هدية'}
              </div>

              <div className="mb-6 space-y-2 w-full">
                {isEn ? (
                  <h3 className="text-[28px] lg:text-[40px] font-bold text-[#1a1a1a] leading-[1.2] tracking-tighter">
                    Gift Your Loved Ones Saadeddin Voucher
                  </h3>
                ) : (
                  <>
                    <h3
                      className="text-[26px] font-bold text-[#234745]"
                      style={{
                        fontFamily:
                          "'EnglishDigits', 'Bahij Janna', sans-serif",
                        lineHeight: '100%',
                      }}
                    >
                      أهدِ من تحب
                    </h3>
                    <h3
                      className="text-[26px] font-bold text-[#234745]"
                      style={{
                        fontFamily:
                          "'EnglishDigits', 'Bahij Janna', sans-serif",
                        lineHeight: '100%',
                      }}
                    >
                      قسيمة سعد الدين
                    </h3>
                  </>
                )}
              </div>

              <p
                className="text-[#7D7D7D] font-medium text-[16px] max-w-[340px] !mb-4"
                style={{
                  fontFamily: !isEn ? "'GE Dinar One', sans-serif" : undefined,
                  lineHeight: '100%',
                }}
              >
                {isEn
                  ? 'Choose value, add message, and send instantly'
                  : 'اختر القيمة، أضف رسالتك، وأرسلها فوراً'}
              </p>

              <div
                className="bg-[#234745] hover:bg-[#1a3533] flex items-center justify-center transition-all font-bold w-max mt-2"
                style={{
                  borderRadius: '25px',
                  padding: '12px 32px',
                  color: '#FEF8EB',
                }}
              >
                {isEn ? 'Buy Voucher Now' : 'إشتري قسيمة الان'}
              </div>
            </div>

            {/* Image Side */}
            <div className="w-full md:w-[45%] h-full flex items-center justify-center p-8 lg:p-12 relative z-10 shrink-0">
              <img
                src="/images/voucher.webp"
                alt="Saadeddin Gift Voucher"
                className="w-full h-auto object-contain max-w-[400px] drop-shadow-xl"
                loading="lazy"
              />
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
