import {useState, useEffect} from 'react';
import {
  type LoaderFunctionArgs,
  useLoaderData,
  useRouteLoaderData,
  Link,
} from 'react-router';
import {AddToCartButton} from '~/components/AddToCartButton';
import {useWishlist} from '~/context/WishlistContext';
import {PageHeader} from '~/components/layout/PageHeader';
import {SaudiRiyalSymbol} from '~/components/Price';
import {ProductItem} from '~/components/ProductItem';

// GraphQL query to fetch promotional products and promotion page metaobjects
const PROMOTIONS_QUERY = `#graphql
  query getPromotionalProducts($country: CountryCode, $language: LanguageCode) @inContext(country: $country, language: $language) {
    heroMeta: metaobjects(type: "promotions_hero", first: 1) {
      nodes {
        id
        handle
        fields {
          key
          value
          reference {
            ... on MediaImage {
              image {
                url
                altText
              }
            }
          }
        }
      }
    }
    bogoMeta: metaobjects(type: "promotions_bogo", first: 1) {
      nodes {
        id
        fields {
          key
          value
        }
      }
    }
    gridMeta: metaobjects(type: "promotions_grid", first: 1) {
      nodes {
        id
        fields {
          key
          value
        }
      }
    }
    bannerMeta: metaobjects(type: "promotions_banner", first: 1) {
      nodes {
        id
        fields {
          key
          value
        }
      }
    }
    products(first: 50) {
      nodes {
        id
        handle
        title
        tags
        availableForSale
        featuredImage {
          url
          altText
          width
          height
        }
        priceRange {
          minVariantPrice {
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
        variants(first: 10) {
          nodes {
            id
            title
            availableForSale
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
      }
    }
  }
` as const;

function renderTextWithRiyalSymbol(
  text: any,
  className = 'h-[18px] md:h-[26px] w-auto text-current inline-block align-middle mx-1',
) {
  if (!text) return null;
  if (typeof text !== 'string') return text;

  const tokens = [
    '{{SAR}}',
    '[SAR]',
    '{SAR}',
    '{{ريال}}',
    '[ريال]',
    'SAR',
    'SR',
    'S.R.',
    'S.R',
    'ر.س.',
    'ر.س',
    'ريال سعودي',
    'ريال',
  ];

  // Create regex pattern safely escaping all special regex characters
  const pattern = new RegExp(
    `(${tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'gi',
  );
  const parts = text.split(pattern);

  if (parts.length <= 1) {
    return text;
  }

  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null;
        const clean = part.toLowerCase().trim();
        const isMatch = tokens.some((t) => t.toLowerCase() === clean);
        if (isMatch) {
          return <SaudiRiyalSymbol key={index} className={className} />;
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
}

export async function loader({context, params}: LoaderFunctionArgs) {
  const {storefront} = context;
  const offerHandle = (params.offer || 'bogo').toLowerCase();

  try {
    const data = await storefront.query(PROMOTIONS_QUERY, {
      variables: {
        country: storefront.i18n.country,
        language: storefront.i18n.language,
      },
      cache: storefront.CacheNone(),
    });

    const allProducts = data?.products?.nodes || [];

    const parseFields = (node: any) => {
      if (!node?.fields) return null;
      const map: Record<string, any> = {};
      for (const f of node.fields) {
        map[f.key] = f.reference?.image?.url || f.value;
      }
      return map;
    };

    const heroFields = parseFields(data?.heroMeta?.nodes?.[0]);
    const heroData = heroFields
      ? {
          titleAr: heroFields.title_ar || heroFields.title,
          titleEn: heroFields.title_en || heroFields.title,
          subtitleAr: heroFields.subtitle_ar || heroFields.subtitle,
          subtitleEn: heroFields.subtitle_en || heroFields.subtitle,
          badgeAr: heroFields.badge_ar || heroFields.badge_text,
          badgeEn: heroFields.badge_en || heroFields.badge_text,
          discountCode: heroFields.discount_code || heroFields.code,
          expirationDate:
            heroFields.expiration_date ||
            heroFields.end_date ||
            heroFields.expires_at,
          image: heroFields.image || heroFields.banner_image,
          buttonTextAr: heroFields.button_text_ar || heroFields.button_text,
          buttonTextEn: heroFields.button_text_en || heroFields.button_text,
          buttonLink: heroFields.button_link || heroFields.link,
        }
      : null;

    const bogoFields = parseFields(data?.bogoMeta?.nodes?.[0]);
    const bogoData = bogoFields
      ? {
          badgeAr: bogoFields.badge_ar || bogoFields.badge,
          badgeEn: bogoFields.badge_en || bogoFields.badge,
          titleAr: bogoFields.title_ar || bogoFields.title,
          titleEn: bogoFields.title_en || bogoFields.title,
          subtitleAr: bogoFields.subtitle_ar || bogoFields.subtitle,
          subtitleEn: bogoFields.subtitle_en || bogoFields.subtitle,
          buttonTextAr: bogoFields.button_text_ar || bogoFields.button_text,
          buttonTextEn: bogoFields.button_text_en || bogoFields.button_text,
          shoppersCount: bogoFields.shoppers_count,
        }
      : null;

    const gridFields = parseFields(data?.gridMeta?.nodes?.[0]);
    const gridData = gridFields
      ? {
          card1TitleAr: gridFields.card1_title_ar || gridFields.card1_title,
          card1TitleEn: gridFields.card1_title_en || gridFields.card1_title,
          card1SubtitleAr:
            gridFields.card1_subtitle_ar || gridFields.card1_subtitle,
          card1SubtitleEn:
            gridFields.card1_subtitle_en || gridFields.card1_subtitle,
          card1TagAr: gridFields.card1_tag_ar || gridFields.card1_tag,
          card1TagEn: gridFields.card1_tag_en || gridFields.card1_tag,
          card1ButtonTextAr:
            gridFields.card1_button_text_ar || gridFields.card1_button_text,
          card1ButtonTextEn:
            gridFields.card1_button_text_en || gridFields.card1_button_text,
          card2TitleAr: gridFields.card2_title_ar || gridFields.card2_title,
          card2TitleEn: gridFields.card2_title_en || gridFields.card2_title,
          card2SubtitleAr:
            gridFields.card2_subtitle_ar || gridFields.card2_subtitle,
          card2SubtitleEn:
            gridFields.card2_subtitle_en || gridFields.card2_subtitle,
          card2TagAr: gridFields.card2_tag_ar || gridFields.card2_tag,
          card2TagEn: gridFields.card2_tag_en || gridFields.card2_tag,
          card2ButtonTextAr:
            gridFields.card2_button_text_ar || gridFields.card2_button_text,
          card2ButtonTextEn:
            gridFields.card2_button_text_en || gridFields.card2_button_text,
        }
      : null;

    const bannerFields = parseFields(data?.bannerMeta?.nodes?.[0]);
    const bannerData = bannerFields
      ? {
          textAr: bannerFields.text_ar || bannerFields.text,
          textEn: bannerFields.text_en || bannerFields.text,
        }
      : null;

    // Process all products while preserving raw GraphQL fields for ProductItem
    const processedProducts = allProducts.map((product: any) => {
      const variants = product.variants?.nodes || [];
      const variant = variants[0];
      const tags = (product.tags || []).map((t: string) => t.toLowerCase());

      return {
        ...product,
        tags,
        availableForSale:
          product.availableForSale ?? variant?.availableForSale ?? true,
      };
    });

    // Strict Offer Matching Logic based ONLY on product tags in Shopify Admin
    const offerProducts = processedProducts.filter((prod: any) => {
      const tags = (prod.tags || []).map((t: string) => t.toLowerCase().trim());
      const offer = offerHandle.toLowerCase().trim();

      if (offer === 'bogo' || offer === '1+1') {
        return tags.some(
          (t: string) =>
            t === 'bogo' ||
            t === '1+1' ||
            t === 'bogo-offer' ||
            t === '1+1 مجاناً' ||
            t === '1+1-مجاناً',
        );
      }

      if (offer === 'gifts25' || offer === 'gifts' || offer === 'gift-boxes') {
        return tags.some(
          (t: string) =>
            t === 'gifts25' ||
            t === '25-off' ||
            t === '25%' ||
            t === 'gifts-25' ||
            t === 'خصم-25',
        );
      }

      if (
        offer === 'chocolates40' ||
        offer === 'chocolates' ||
        offer === 'chocolate'
      ) {
        return tags.some(
          (t: string) =>
            t === 'chocolates40' ||
            t === '40-off' ||
            t === '40%' ||
            t === 'chocolates-40' ||
            t === 'خصم-40',
        );
      }

      // Generic tag matching for any custom offer handles
      return tags.some((t: string) => t === offer || t.includes(offer));
    });

    return {
      offerHandle,
      products: offerProducts,
      heroData,
      bogoData,
      gridData,
      bannerData,
    };
  } catch (error) {
    console.error('Error loading sub-promotion products:', error);
    return {
      offerHandle,
      products: [],
      heroData: null,
      bogoData: null,
      gridData: null,
      bannerData: null,
    };
  }
}

export default function SubPromotionPage() {
  const {offerHandle, products, heroData, bogoData, gridData, bannerData} =
    useLoaderData<typeof loader>();
  const routeData = useRouteLoaderData('root') as {locale?: string};
  const locale = routeData?.locale || 'ar';
  const isEn = locale.toLowerCase().startsWith('en');
  const {isInWishlist, toggleWishlist} = useWishlist();

  const direction = isEn ? 'ltr' : 'rtl';

  // Dynamic titles based on offer handle
  let pageTitle = isEn ? 'Special Promotion' : 'عرض خاص';
  if (offerHandle === 'bogo' || offerHandle === '1+1') {
    pageTitle = isEn
      ? bogoData?.titleEn || 'Buy 1 Get 1 Free'
      : bogoData?.titleAr || 'اشتري واحد واحصل على الثاني مجاناً';
  } else if (
    offerHandle === 'gifts25' ||
    offerHandle === 'gifts' ||
    offerHandle === 'gift-boxes'
  ) {
    pageTitle = isEn
      ? gridData?.card1TitleEn || '25% Off Gift Boxes'
      : gridData?.card1TitleAr || '25% على صناديق الهدايا';
  } else if (
    offerHandle === 'chocolates40' ||
    offerHandle === 'chocolates' ||
    offerHandle === 'chocolate'
  ) {
    pageTitle = isEn
      ? gridData?.card2TitleEn || '40% Off All Chocolate'
      : gridData?.card2TitleAr || 'خصم 40% على الشوكولاتة';
  }

  return (
    <div
      className="w-full bg-[#FEF8EB] min-h-screen pb-12"
      dir={direction}
      style={{
        fontFamily: isEn
          ? 'inherit'
          : "'EnglishDigits', 'GE Dinar One', 'Bahij Janna', sans-serif",
      }}
    >
      {/* Header Section */}
      <PageHeader
        title={renderTextWithRiyalSymbol(pageTitle)}
        subtitle={isEn ? 'Offers' : 'عروض'}
        isEn={isEn}
      />

      <div className="max-w-[1280px] mx-auto px-4 mt-8 flex flex-col gap-8">
        {/* Back Button to All Promotions */}
        <div className="flex items-center justify-between">
          <Link
            to="/promotions"
            className="inline-flex items-center gap-2 text-[#234745] font-bold text-[15px] hover:underline"
          >
            {isEn ? (
              <>
                <span>← Back to All Offers</span>
              </>
            ) : (
              <>
                <span>→ العودة لجميع العروض</span>
              </>
            )}
          </Link>
          <span className="text-[#906B51] font-medium text-[14px]">
            {isEn
              ? `${products.length} Products Found`
              : `تم العثور على ${products.length} منتج`}
          </span>
        </div>



        {/* Product Grid or Empty State */}
        {products.length === 0 ? (
          <div className="bg-white rounded-[24px] p-8 md:p-12 flex flex-col items-center justify-center text-center border border-[#F5EAD4] gap-4">
            <div className="w-16 h-16 rounded-full bg-[#FEF8EB] flex items-center justify-center text-[28px]">
              🏷️
            </div>
            <h3 className="text-[#171717] font-bold text-[18px] md:text-[22px]">
              {isEn
                ? 'No products registered in this offer yet'
                : 'لا توجد منتجات مسجلة في هذا العرض حالياً'}
            </h3>
            <p className="text-[#7D7D7D] text-[14px] max-w-[420px]">
              {isEn
                ? 'Products tagged with this offer in Shopify Admin will automatically appear here.'
                : 'المنتجات المضاف لها تاج هذا العرض في لوحة تحكم شوبيفاي ستظهر هنا تلقائياً.'}
            </p>
            <Link
              to="/promotions"
              className="mt-2 px-6 py-2.5 bg-[#234745] hover:bg-[#1a3533] !text-white font-bold text-[14px] rounded-full transition-colors"
            >
              {isEn ? 'Back to All Offers' : 'العودة لجميع العروض'}
            </Link>
          </div>
        ) : (
          <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((product: any, index: number) => (
              <ProductItem
                key={product.id || index}
                product={product}
                loading={index < 8 ? 'eager' : 'lazy'}
              />
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
