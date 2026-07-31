import { useState, useEffect } from 'react';
import { type LoaderFunctionArgs, useLoaderData, useRouteLoaderData, Link } from 'react-router';
import { AddToCartButton } from '~/components/AddToCartButton';
import { useWishlist } from '~/context/WishlistContext';
import { PageHeader } from '~/components/layout/PageHeader';
import { SaudiRiyalSymbol } from '~/components/Price';

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
          }
        }
      }
    }
  }
` as const;

function renderTextWithRiyalSymbol(text: any, className = "h-[18px] md:h-[26px] w-auto text-current inline-block align-middle mx-1") {
  if (!text) return null;
  if (typeof text !== 'string') return text;

  const tokens = ['{{SAR}}', '[SAR]', '{SAR}', '{{ريال}}', '[ريال]', 'SAR', 'SR', 'S.R.', 'S.R', 'ر.س.', 'ر.س', 'ريال سعودي', 'ريال'];
  
  // Create regex pattern safely escaping all special regex characters
  const pattern = new RegExp(`(${tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const parts = text.split(pattern);

  if (parts.length <= 1) {
    return text;
  }

  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null;
        const clean = part.toLowerCase().trim();
        const isMatch = tokens.some(t => t.toLowerCase() === clean);
        if (isMatch) {
          return (
            <SaudiRiyalSymbol
              key={index}
              className={className}
            />
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
}

export async function loader({ context, params }: LoaderFunctionArgs) {
  const { storefront } = context;
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
    const heroData = heroFields ? {
      titleAr: heroFields.title_ar || heroFields.title,
      titleEn: heroFields.title_en || heroFields.title,
      subtitleAr: heroFields.subtitle_ar || heroFields.subtitle,
      subtitleEn: heroFields.subtitle_en || heroFields.subtitle,
      badgeAr: heroFields.badge_ar || heroFields.badge_text,
      badgeEn: heroFields.badge_en || heroFields.badge_text,
      discountCode: heroFields.discount_code || heroFields.code,
      expirationDate: heroFields.expiration_date || heroFields.end_date || heroFields.expires_at,
      image: heroFields.image || heroFields.banner_image,
      buttonTextAr: heroFields.button_text_ar || heroFields.button_text,
      buttonTextEn: heroFields.button_text_en || heroFields.button_text,
      buttonLink: heroFields.button_link || heroFields.link,
    } : null;

    const bogoFields = parseFields(data?.bogoMeta?.nodes?.[0]);
    const bogoData = bogoFields ? {
      badgeAr: bogoFields.badge_ar || bogoFields.badge,
      badgeEn: bogoFields.badge_en || bogoFields.badge,
      titleAr: bogoFields.title_ar || bogoFields.title,
      titleEn: bogoFields.title_en || bogoFields.title,
      subtitleAr: bogoFields.subtitle_ar || bogoFields.subtitle,
      subtitleEn: bogoFields.subtitle_en || bogoFields.subtitle,
      buttonTextAr: bogoFields.button_text_ar || bogoFields.button_text,
      buttonTextEn: bogoFields.button_text_en || bogoFields.button_text,
      shoppersCount: bogoFields.shoppers_count,
    } : null;

    const gridFields = parseFields(data?.gridMeta?.nodes?.[0]);
    const gridData = gridFields ? {
      card1TitleAr: gridFields.card1_title_ar || gridFields.card1_title,
      card1TitleEn: gridFields.card1_title_en || gridFields.card1_title,
      card1SubtitleAr: gridFields.card1_subtitle_ar || gridFields.card1_subtitle,
      card1SubtitleEn: gridFields.card1_subtitle_en || gridFields.card1_subtitle,
      card1TagAr: gridFields.card1_tag_ar || gridFields.card1_tag,
      card1TagEn: gridFields.card1_tag_en || gridFields.card1_tag,
      card1ButtonTextAr: gridFields.card1_button_text_ar || gridFields.card1_button_text,
      card1ButtonTextEn: gridFields.card1_button_text_en || gridFields.card1_button_text,
      card2TitleAr: gridFields.card2_title_ar || gridFields.card2_title,
      card2TitleEn: gridFields.card2_title_en || gridFields.card2_title,
      card2SubtitleAr: gridFields.card2_subtitle_ar || gridFields.card2_subtitle,
      card2SubtitleEn: gridFields.card2_subtitle_en || gridFields.card2_subtitle,
      card2TagAr: gridFields.card2_tag_ar || gridFields.card2_tag,
      card2TagEn: gridFields.card2_tag_en || gridFields.card2_tag,
      card2ButtonTextAr: gridFields.card2_button_text_ar || gridFields.card2_button_text,
      card2ButtonTextEn: gridFields.card2_button_text_en || gridFields.card2_button_text,
    } : null;

    const bannerFields = parseFields(data?.bannerMeta?.nodes?.[0]);
    const bannerData = bannerFields ? {
      textAr: bannerFields.text_ar || bannerFields.text,
      textEn: bannerFields.text_en || bannerFields.text,
    } : null;

    // Process all products and calculate discounts
    const processedProducts = allProducts.map((product: any) => {
      const variants = product.variants?.nodes || [];
      const variant = variants.find((v: any) => {
        const price = parseFloat(v.price?.amount || '0');
        const comparePrice = parseFloat(v.compareAtPrice?.amount || '0');
        return comparePrice > price;
      }) || variants[0];

      const priceNum = parseFloat(variant?.price?.amount || '0');
      const compareNum = parseFloat(variant?.compareAtPrice?.amount || '0');
      const discountPct = compareNum > priceNum ? Math.round(((compareNum - priceNum) / compareNum) * 100) : 0;
      const tags = (product.tags || []).map((t: string) => t.toLowerCase());

      const hasBogo = tags.some((t: string) => t.includes('bogo') || t.includes('1+1') || t.includes('مجانا') || t.includes('free')) || product.title?.includes('1+1');

      return {
        id: product.id,
        title: product.title,
        handle: product.handle,
        tags,
        price: Math.round(priceNum).toString(),
        comparePrice: compareNum > priceNum ? Math.round(compareNum).toString() : '',
        discountPct,
        isBogo: hasBogo,
        image: product.featuredImage?.url || '/images/placeholder/sample.png',
        availableForSale: product.availableForSale && (variant?.availableForSale ?? true),
        variantId: variant?.id,
      };
    });

    // Filter products strictly for this offer sub-route
    let offerProducts = processedProducts.filter((prod: any) => {
      const titleLower = prod.title.toLowerCase();

      if (offerHandle === 'bogo' || offerHandle === '1+1') {
        return prod.isBogo || prod.tags.some((t: string) => t.includes('bogo') || t.includes('1+1') || t.includes('مجانا') || t.includes('free'));
      }

      if (offerHandle === 'gifts25' || offerHandle === 'gifts' || offerHandle === 'gift-boxes') {
        const isGift = prod.tags.some((t: string) => t.includes('gift') || t.includes('box') || t.includes('هدية') || t.includes('هدايا') || t.includes('صندوق') || t.includes('باكج')) ||
                       titleLower.includes('gift') || titleLower.includes('box') || titleLower.includes('هدية') || titleLower.includes('هدايا') || titleLower.includes('صندوق') || titleLower.includes('باكج');
        return isGift || (prod.discountPct >= 15 && prod.discountPct <= 35);
      }

      if (offerHandle === 'chocolates40' || offerHandle === 'chocolates' || offerHandle === 'chocolate') {
        const isChoc = prod.tags.some((t: string) => t.includes('choc') || t.includes('شوكول')) || titleLower.includes('choc') || titleLower.includes('شوكول');
        return isChoc || prod.discountPct >= 30;
      }

      // Default tag matcher for custom offer handles
      const matchesCustomTag = prod.tags.some((t: string) => t.includes(offerHandle));
      return matchesCustomTag || prod.discountPct > 0;
    });

    if (offerProducts.length === 0) {
      offerProducts = processedProducts.filter((p: any) => p.discountPct > 0 || p.isBogo);
    }

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
  const { offerHandle, products, heroData, bogoData, gridData, bannerData } = useLoaderData<typeof loader>();
  const routeData = useRouteLoaderData('root') as { locale?: string };
  const locale = routeData?.locale || 'ar';
  const isEn = locale.toLowerCase().startsWith('en');
  const { isInWishlist, toggleWishlist } = useWishlist();

  const direction = isEn ? 'ltr' : 'rtl';

  // Dynamic titles based on offer handle
  let pageTitle = isEn ? 'Special Promotion' : 'عرض خاص';
  if (offerHandle === 'bogo' || offerHandle === '1+1') {
    pageTitle = isEn ? (bogoData?.titleEn || 'Buy 1 Get 1 Free') : (bogoData?.titleAr || 'اشتري واحد واحصل على الثاني مجاناً');
  } else if (offerHandle === 'gifts25' || offerHandle === 'gifts' || offerHandle === 'gift-boxes') {
    pageTitle = isEn ? (gridData?.card1TitleEn || '25% Off Gift Boxes') : (gridData?.card1TitleAr || '25% على صناديق الهدايا');
  } else if (offerHandle === 'chocolates40' || offerHandle === 'chocolates' || offerHandle === 'chocolate') {
    pageTitle = isEn ? (gridData?.card2TitleEn || '40% Off All Chocolate') : (gridData?.card2TitleAr || 'خصم 40% على الشوكولاتة');
  }

  return (
    <div className="w-full bg-[#FEF8EB] min-h-screen pb-12" dir={direction} style={{ fontFamily: isEn ? 'inherit' : "'EnglishDigits', 'GE Dinar One', 'Bahij Janna', sans-serif" }}>

      {/* Header Section */}
      <PageHeader
        title={renderTextWithRiyalSymbol(pageTitle)}
        subtitle={isEn ? "Offers" : "عروض"}
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
            {isEn ? `${products.length} Products Found` : `تم العثور على ${products.length} منتج`}
          </span>
        </div>

        {/* Active Promotion Header Card */}
        {(offerHandle === 'bogo' || offerHandle === '1+1') && (
          <section className="w-full bg-[#EED5D7] rounded-[24px] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1 flex flex-col gap-3 text-start">
              <div className="flex">
                <div className="bg-[#1F3E35] px-3 py-1 rounded-full text-white text-[12px] font-bold">
                  🎁 {isEn ? (bogoData?.badgeEn || '1 + 1 Free') : (bogoData?.badgeAr || '1 + 1 مجاناً')}
                </div>
              </div>
              <h2 className="text-[#171717] text-[24px] md:text-[32px] font-bold">
                {renderTextWithRiyalSymbol(isEn ? (bogoData?.titleEn || 'Buy One Get One Free') : (bogoData?.titleAr || 'اشتري واحد واحصل على الثاني مجاناً'))}
              </h2>
              <p className="text-[#7D7D7D] text-[14px]">
                {renderTextWithRiyalSymbol(isEn ? (bogoData?.subtitleEn || 'On all dark chocolate types — Today only!') : (bogoData?.subtitleAr || 'على جميع أنواع الشوكولاتة الداكنة — اليوم فقط!'))}
              </p>
            </div>
          </section>
        )}

        {(offerHandle === 'gifts25' || offerHandle === 'gifts' || offerHandle === 'gift-boxes') && (
          <section className="w-full bg-[#E64C53] rounded-[24px] p-6 md:p-8 text-white flex flex-col gap-3">
            <span className="text-white/80 font-bold text-[11px] uppercase tracking-wider">
              {renderTextWithRiyalSymbol(isEn ? (gridData?.card1TagEn || 'Special Partner') : (gridData?.card1TagAr || 'شريك مميز'))}
            </span>
            <h2 className="text-[24px] md:text-[32px] font-bold">
              {renderTextWithRiyalSymbol(isEn ? (gridData?.card1TitleEn || '25% on Gift Boxes') : (gridData?.card1TitleAr || '25% على صناديق الهدايا'))}
            </h2>
            <p className="text-white/90 text-[14px]">
              {renderTextWithRiyalSymbol(isEn ? (gridData?.card1SubtitleEn || 'Subscribe now and get 15% discount on your first order') : (gridData?.card1SubtitleAr || 'اشترك الآن واحصل على خصم 15% على طلبك الأول من سعد الدين'))}
            </p>
          </section>
        )}

        {(offerHandle === 'chocolates40' || offerHandle === 'chocolates' || offerHandle === 'chocolate') && (
          <section className="w-full bg-[#D3E1DF] rounded-[24px] p-6 md:p-8 text-[#1A1A1A] flex flex-col gap-3">
            <span className="text-[#234745] font-bold text-[11px] uppercase tracking-wider">
              {renderTextWithRiyalSymbol(isEn ? (gridData?.card2TagEn || 'Seasonal Offer') : (gridData?.card2TagAr || 'عرض موسمي'))}
            </span>
            <h2 className="text-[24px] md:text-[32px] font-bold">
              {renderTextWithRiyalSymbol(isEn ? (gridData?.card2TitleEn || '40% on all chocolate') : (gridData?.card2TitleAr || 'خصم 40% على الشوكولاتة'))}
            </h2>
            <p className="text-[#7D7D7D] text-[14px]">
              {renderTextWithRiyalSymbol(isEn ? (gridData?.card2SubtitleEn || 'More than 20 products with exceptional prices') : (gridData?.card2SubtitleAr || 'أكثر من 20 منتج بأسعار استثنائية'))}
            </p>
          </section>
        )}

        {/* Product Grid */}
        <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
          {products.map((product: any) => {
            const inWishlist = isInWishlist(product.id);
            return (
              <div
                key={product.id}
                className="bg-white rounded-[20px] p-3 md:p-4 flex flex-col justify-between shadow-sm border border-[#F5EAD4] hover:shadow-md transition-shadow relative group"
              >
                {/* Wishlist Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleWishlist({
                      id: product.id,
                      title: product.title,
                      price: product.price,
                      image: product.image,
                      handle: product.handle,
                    });
                  }}
                  className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill={inWishlist ? '#E64950' : 'none'}
                    stroke={inWishlist ? '#E64950' : '#234745'}
                    strokeWidth="2"
                  >
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.78-8.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </button>

                {/* Product Image Link */}
                <Link to={`/products/${product.handle}`} className="flex flex-col gap-3">
                  <div className="w-full aspect-square rounded-[16px] overflow-hidden bg-[#FEF8EB] flex items-center justify-center">
                    <img
                      src={product.image}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <h3 className="text-[#171717] font-bold text-[14px] md:text-[15px] line-clamp-2 min-h-[42px]">
                    {product.title}
                  </h3>
                </Link>

                {/* Price & Add to Cart */}
                <div className="flex flex-col gap-3 mt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[#234745] font-bold text-[16px] md:text-[18px] flex items-center gap-1">
                      <span>{product.price}</span>
                      <SaudiRiyalSymbol className="h-[14px] w-auto text-[#234745]" />
                    </span>
                    {product.comparePrice && (
                      <span className="text-[#906B51] line-through text-[12px] md:text-[13px] flex items-center gap-0.5">
                        <span>{product.comparePrice}</span>
                      </span>
                    )}
                  </div>

                  {product.variantId ? (
                    <AddToCartButton
                      lines={[{ merchandiseId: product.variantId, quantity: 1 }]}
                      disabled={!product.availableForSale}
                      className="w-full py-2.5 bg-[#234745] hover:bg-[#1a3533] text-white font-bold text-[13px] rounded-full transition-colors flex items-center justify-center gap-2"
                    >
                      {product.availableForSale ? (isEn ? 'Add to Cart' : 'أضف للسلة') : (isEn ? 'Out of Stock' : 'غير متوفر')}
                    </AddToCartButton>
                  ) : null}
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}
