import { useState, useEffect } from 'react';
import { type LoaderFunctionArgs, useLoaderData, useRouteLoaderData, Link } from 'react-router';
import { AddToCartButton } from '~/components/AddToCartButton';
import { useWishlist } from '~/context/WishlistContext';
import { PageHeader } from '~/components/layout/PageHeader';
import { SaudiRiyalSymbol } from '~/components/Price';

// GraphQL query to fetch promotional products
const PROMOTIONS_QUERY = `#graphql
  query getPromotionalProducts($country: CountryCode, $language: LanguageCode) @inContext(country: $country, language: $language) {
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

export async function loader({ context }: LoaderFunctionArgs) {
  const { storefront } = context;
  try {
    const data = await storefront.query(PROMOTIONS_QUERY, {
      variables: {
        country: storefront.i18n.country,
        language: storefront.i18n.language,
      },
      cache: storefront.CacheNone(),
    });

    const allProducts = data?.products?.nodes || [];

    // Filter ONLY products that have a discount (compareAtPrice > price) or discount/promotion tags
    const discountedProducts = allProducts.filter((product: any) => {
      const variants = product.variants?.nodes || [];
      const hasDiscountedVariant = variants.some((v: any) => {
        const price = parseFloat(v.price?.amount || '0');
        const comparePrice = parseFloat(v.compareAtPrice?.amount || '0');
        return comparePrice > price;
      });

      const tags = (product.tags || []).map((t: string) => t.toLowerCase());
      const hasDiscountTag = tags.some((t: string) =>
        t.includes('discount') ||
        t.includes('sale') ||
        t.includes('promotion') ||
        t.includes('bogo') ||
        t.includes('1+1') ||
        t.includes('خصم') ||
        t.includes('عرض') ||
        t.includes('promo')
      );

      return hasDiscountedVariant || hasDiscountTag;
    });

    return { products: discountedProducts };
  } catch (error) {
    console.error('Error loading promotional products:', error);
    return { products: [] };
  }
}

export default function PromotionsPage() {
  const { products } = useLoaderData<typeof loader>();
  const routeData = useRouteLoaderData('root') as { locale?: string };
  const locale = routeData?.locale || 'ar';
  const isEn = locale.toLowerCase().startsWith('en');
  const { isInWishlist, toggleWishlist } = useWishlist();

  // Toast message state for "Copy Code"
  const [showToast, setShowToast] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'bogo' | 'gifts25' | 'chocolates40'>('all');

  // Live Countdown Timer state
  const [timeLeft, setTimeLeft] = useState({ hours: 8, minutes: 32, seconds: 22 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else {
          clearInterval(timer);
          return prev;
        }
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCopyCode = () => {
    navigator.clipboard.writeText('SAAD20');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const handleFilterClick = (filter: 'all' | 'bogo' | 'gifts25' | 'chocolates40') => {
    setActiveFilter(filter);
    const gridElem = document.getElementById('promotions-grid');
    if (gridElem) {
      gridElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Dynamically map real discounted products from Shopify
  const displayProducts = products.map((prod: any) => {
    const variant = prod.variants?.nodes?.find((v: any) => {
      const price = parseFloat(v.price?.amount || '0');
      const comparePrice = parseFloat(v.compareAtPrice?.amount || '0');
      return comparePrice > price;
    }) || prod.variants?.nodes?.[0];

    const priceNum = parseFloat(variant?.price?.amount || '0');
    const compareNum = parseFloat(variant?.compareAtPrice?.amount || '0');

    const priceStr = Math.round(priceNum).toString();
    const compareStr = compareNum > priceNum ? Math.round(compareNum).toString() : '';

    const discountPct = compareNum > priceNum ? Math.round(((compareNum - priceNum) / compareNum) * 100) : 0;
    const hasBogo = prod.tags?.some((t: string) => t.toUpperCase().includes('1+1') || t.toUpperCase().includes('BOGO')) || prod.title?.includes('1+1');

    // Calculate dynamic discount percentage tag if compareAtPrice is higher
    let tagBadge = '';
    if (compareNum > priceNum) {
      tagBadge = isEn ? `${discountPct}% OFF` : `خصم %${discountPct}`;
    } else {
      if (hasBogo) {
        tagBadge = isEn ? 'BUY 1 GET 1' : '1+1 مجاناً';
      } else if (prod.tags?.some((t: string) => t.includes('الأكثر طلباً') || t.toLowerCase().includes('best_seller'))) {
        tagBadge = isEn ? 'Most Wanted' : 'الأكثر طلباً';
      } else {
        tagBadge = isEn ? 'Special Offer' : 'عرض خاص';
      }
    }

    return {
      id: prod.id,
      title: prod.title,
      price: priceStr,
      comparePrice: compareStr,
      discountPct,
      isBogo: hasBogo,
      tags: prod.tags || [],
      tag: tagBadge,
      image: prod.featuredImage?.url || '/images/placeholder/sample.png',
      availableForSale: prod.availableForSale && (variant?.availableForSale ?? true),
      variantId: variant?.id,
      handle: prod.handle,
    };
  });

  const filteredProducts = displayProducts.filter((prod: any) => {
    if (activeFilter === 'all') return true;

    const titleLower = (prod.title || '').toLowerCase();
    const tags = (prod.tags || []).map((t: string) => String(t).toLowerCase());

    if (activeFilter === 'bogo') {
      return (
        prod.isBogo ||
        tags.some((t: string) => t.includes('bogo') || t.includes('1+1') || t.includes('free') || t.includes('مجانا')) ||
        titleLower.includes('bogo') || titleLower.includes('1+1') || titleLower.includes('مجانا')
      );
    }

    if (activeFilter === 'gifts25') {
      const isGift = tags.some((t: string) => t.includes('gift') || t.includes('box') || t.includes('هدية') || t.includes('هدايا') || t.includes('صندوق') || t.includes('باكج')) ||
                     titleLower.includes('gift') || titleLower.includes('box') || titleLower.includes('هدية') || titleLower.includes('هدايا') || titleLower.includes('صندوق') || titleLower.includes('باكج');
      const isAround25Pct = prod.discountPct >= 15 && prod.discountPct <= 35;
      return isGift || isAround25Pct;
    }

    if (activeFilter === 'chocolates40') {
      const isChoc = tags.some((t: string) => t.includes('choc') || t.includes('شوكول')) ||
                     titleLower.includes('choc') || titleLower.includes('شوكول');
      const isAround40Pct = prod.discountPct >= 30;
      return isChoc || isAround40Pct;
    }

    return true;
  });

  const finalDisplayProducts = filteredProducts.length > 0 ? filteredProducts : displayProducts;

  const direction = isEn ? 'ltr' : 'rtl';

  return (
    <div className="w-full bg-[#FEF8EB] min-h-screen pb-12" dir={direction} style={{ fontFamily: isEn ? 'inherit' : "'EnglishDigits', 'GE Dinar One', 'Bahij Janna', sans-serif" }}>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-[#234745] text-white px-6 py-3 rounded-full shadow-lg z-50 animate-fade-in font-bold text-[14px]">
          {isEn ? 'Promo code copied successfully!' : 'تم نسخ كود الخصم بنجاح!'}
        </div>
      )}

      {/* 1. Header Section */}
      <PageHeader
        title={isEn ? "Limited Offers You Shouldn't Miss" : "عروض محدودة لا تفوتك"}
        subtitle={isEn ? "Offers" : "عروض"}
        isEn={isEn}
      />

      {/* Main Container */}
      <div className="max-w-[1280px] mx-auto px-4 mt-12 md:mt-8 flex flex-col gap-8">

        {/* 2. Hero Offer Card */}
        <section
          dir={direction}
          style={{ boxSizing: 'border-box', background: '#FEF8EB' }}
          className="w-full rounded-[24px] border border-[#906B51] flex flex-col lg:flex-row items-stretch gap-6 p-5 lg:p-8"
        >
          {/* Top on Mobile: Table Image (Above text on mobile, second on desktop) */}
          <div className="w-full lg:w-[45%] h-[220px] sm:h-[260px] lg:h-[350px] flex-shrink-0 rounded-[16px] overflow-hidden order-1 lg:order-2">
            <img
              src="/images/promotions/promotions-1st-section.webp"
              alt="Season Specials"
              className="w-full h-full object-cover object-center"
            />
          </div>

          {/* Bottom on Mobile: Promotion Details (Below image on mobile, first on desktop) */}
          <div
            dir={direction}
            className="flex-1 flex flex-col justify-center gap-5 py-2 order-2 lg:order-1"
          >
            {/* Tag Badge — aligned to start (right in RTL) */}
            <div className="flex">
              <div className="bg-[#E64950] px-[8px] py-[4px] rounded-[6px] flex items-center gap-1.5">

                <span className="text-white font-bold text-[12px] tracking-wide whitespace-nowrap">
                  {isEn ? 'LIMITED OFFER ⏳' : '⏳ عرض محدود'}
                </span>
              </div>
            </div>

            {/* Title + Subtitle */}
            <div className="flex flex-col gap-2">
              <h2
                className="text-[#234745] text-[26px] md:!text-[50px] font-bold leading-[100%]"
                style={{
                  fontFamily: isEn ? 'inherit' : "'Bahij Janna', sans-serif",
                  fontWeight: 700,
                  lineHeight: '100%',
                }}
              >
                {isEn ? 'Big Season Sales' : 'تخفيضات الموسم الكبيرة'}
              </h2>
              <p className="text-[#906B51] text-[15px] font-medium leading-relaxed">
                {isEn ? (
                  <>Discounts up to <span style={{ fontFamily: "'EnglishDigits', sans-serif" }}>40%</span> on our best products for a limited time</>
                ) : (
                  <>خصومات حتى <span style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>40%</span> على أفضل منتجاتنا لفترة محدودة</>
                )}
              </p>
            </div>

            {/* Timer + Promo Code — grouped together, aligned to start */}
            <div className="flex items-center gap-3 flex-wrap" suppressHydrationWarning>

              {/* Timer: Hours | Minutes | Seconds — in RTL renders right-to-left naturally */}
              <div className="flex items-center gap-2" suppressHydrationWarning>
                {/* Hours */}
                <div className="flex flex-col items-center gap-[7px] justify-center w-[60px] h-[64px] border border-[#9FB7AE] rounded-[8px]">
                  <span suppressHydrationWarning className="text-[#234745] font-bold text-[18px] leading-none" style={{ fontFamily: "'EnglishDigits','Bahaji Janna', sans-serif" }}>{timeLeft.hours}</span>
                  <span className="text-[#234745] text-[11px] font-normal mt-1">{isEn ? 'Hours' : 'ساعة'}</span>
                </div>
                {/* Minutes */}
                <div className="flex flex-col items-center gap-[7px] justify-center w-[60px] h-[64px] border border-[#9FB7AE] rounded-[8px]">
                  <span suppressHydrationWarning className="text-[#234745] font-bold text-[18px] leading-none" style={{ fontFamily: "'EnglishDigits','Bahaji Janna', sans-serif" }}>{timeLeft.minutes}</span>
                  <span className="text-[#234745] text-[11px] font-normal mt-1">{isEn ? 'Mins' : 'دقيقة'}</span>
                </div>
                {/* Seconds */}
                <div className="flex flex-col items-center gap-[7px] justify-center w-[60px] h-[64px] border border-[#9FB7AE] rounded-[8px]">
                  <span suppressHydrationWarning className="text-[#234745] font-bold text-[18px] leading-none" style={{ fontFamily: "'EnglishDigits','Bahaji Janna', sans-serif" }}>{timeLeft.seconds}</span>
                  <span className="text-[#234745] text-[11px] font-normal mt-1">{isEn ? 'Secs' : 'ثانية'}</span>
                </div>
              </div>

              {/* Promo Code Box — always LTR inside so SAAD20 is left, button is right */}
              <div
                dir="ltr"
                className="flex items-center justify-center sm:justify-between h-[64px] w-full sm:w-auto border border-[#9FB7AE] rounded-[8px] px-3 gap-2"
                style={{ minWidth: '160px' }}
              >
                <span className="text-[#234745] font-bold text-[18px] tracking-widest" style={{ fontFamily: "'EnglishDigits', 'Ge Dinar One', sans-serif" }}>SAAD20</span>
                <button
                  onClick={handleCopyCode}
                  className="text-[#234745] text-[14px] font-normal px-2 py-1.5 hover:bg-[#FDF0D5] rounded-[6px] border border-[#F5EAD4] transition-colors whitespace-nowrap cursor-pointer"
                >
                  {isEn ? 'Copy' : 'نسخ الكود'}
                </button>
              </div>
            </div>

            {/* Shop Now Button */}
            <div className="flex w-full sm:w-auto">
              <Link
                to="/collections/all"
                className={`inline-flex items-center justify-center w-full sm:w-[216px] px-[20px] py-[12px] bg-[#BBCFCD] hover:bg-[#ACC4C2] font-bold text-[16px] rounded-full transition-colors !text-[#234745] ${isEn ? "[font-family:'Inter',sans-serif]" : "[font-family:'GE_Dinar_One',sans-serif]"
                  }`}
              >
                {isEn ? 'Shop Now' : 'تسوق الآن'}
              </Link>
            </div>
          </div>
        </section>

        {/* 3. BOGO Banner (Buy 1 Get 1 Free) */}
        <section
          dir={direction}
          className="w-full bg-[#EED5D7] rounded-[24px] p-6 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden"
        >

          {/* Left Side: Promotion Details (Always Right) */}
          <div
            dir={direction}
            className="flex-1 flex flex-col gap-4 text-start w-full"
          >
            {/* Green Badge */}
            <div className="flex">
              <div className="bg-[#1F3E35] px-3.5 py-1.5 rounded-full flex items-center gap-1.5">
                <span className="text-white text-[12px] font-bold flex items-center gap-1">
                  <span>🎁</span>
                  <span style={{ fontFamily: "'EnglishDigits', sans-serif" }}>1 + 1</span>
                  <span>{isEn ? ' Free' : ' مجاناً'}</span>
                </span>
              </div>
            </div>

            {/* Title + Subtitle */}
            <div className="flex flex-col gap-2">
              <h3
                className="text-[#171717] text-[26px] md:text-[34px] font-bold leading-tight ![line-height:normal]"
                style={{
                  fontFamily: isEn ? 'inherit' : "'Bahij Janna', sans-serif",
                  fontWeight: 700,
                }}
              >
                {isEn ? 'Buy One Get One Free' : 'اشتري واحد واحصل على الثاني مجاناً'}
              </h3>
              <p className="text-[#7D7D7D] text-[14px] md:text-[15px] font-medium leading-relaxed [font-family:'GE Dinar One',sans-serif]">
                {isEn ? 'On all dark chocolate types — Today only!' : 'على جميع أنواع الشوكولاتة الداكنة — اليوم فقط!'}
              </p>
            </div>

            {/* Action Row: Button + Shoppers Count */}
            <div className="flex flex-row items-center gap-4 mt-2">
              {/* Button */}
              <button
                type="button"
                onClick={() => handleFilterClick('bogo')}
                className="inline-flex items-center gap-2 px-8 h-[48px] bg-[#BBCFCD] hover:bg-[#ACC4C2] !text-[#234745] font-bold text-[14px] rounded-full transition-colors flex-shrink-0 cursor-pointer"
              >
                {isEn ? (
                  <>
                    <span>Shop Offer</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </>
                ) : (
                  <>
                    <span>تسوق العرض</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                      <line x1="19" y1="12" x2="5" y2="12" />
                      <polyline points="12 19 5 12 12 5" />
                    </svg>
                  </>
                )}
              </button>

              {/* Shoppers Count (Standard English digits) */}
              <span className="text-[#D61C4E] text-[13px] font-semibold whitespace-nowrap">
                <span style={{ fontFamily: "'EnglishDigits', sans-serif" }} className="font-bold">243</span>
                <span>{isEn ? ' people shopping now' : ' شخص يتسوق الآن'}</span>
              </span>
            </div>
          </div>


          {/* Right Side: Chocolate Bar Illustration (Always Left) */}
          <div className="w-[180px] h-[150px] flex items-center justify-center flex-shrink-0 relative">
            <div className="transform rotate-[-38deg] drop-shadow-[0_8px_16px_rgba(0,0,0,0.12)]">
              <svg width="120" height="150" viewBox="0 0 120 150" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Chocolate Base */}
                <rect x="15" y="10" width="90" height="130" rx="8" fill="#784A34" />

                {/* Row 1 */}
                <rect x="22" y="17" width="34" height="24" rx="4" fill="#603722" />
                <rect x="25" y="19" width="28" height="18" rx="2" fill="#6A3F28" />
                <rect x="64" y="17" width="34" height="24" rx="4" fill="#603722" />
                <rect x="67" y="19" width="28" height="18" rx="2" fill="#6A3F28" />

                {/* Row 2 */}
                <rect x="22" y="47" width="34" height="24" rx="4" fill="#603722" />
                <rect x="25" y="49" width="28" height="18" rx="2" fill="#6A3F28" />
                <rect x="64" y="47" width="34" height="24" rx="4" fill="#603722" />
                <rect x="67" y="49" width="28" height="18" rx="2" fill="#6A3F28" />

                {/* Row 3 */}
                <rect x="22" y="77" width="34" height="24" rx="4" fill="#603722" />
                <rect x="25" y="79" width="28" height="18" rx="2" fill="#6A3F28" />
                <rect x="64" y="77" width="34" height="24" rx="4" fill="#603722" />
                <rect x="67" y="79" width="28" height="18" rx="2" fill="#6A3F28" />

                {/* Row 4 */}
                <rect x="22" y="107" width="34" height="24" rx="4" fill="#603722" />
                <rect x="64" y="107" width="34" height="24" rx="4" fill="#603722" />

                {/* Torn foil layer (Silver/White) */}
                <path d="M10 75 L110 50 L110 145 L10 145 Z" fill="#E2E8F0" />
                <path d="M10 75 L30 70 L50 78 L70 68 L90 73 L110 50 L110 60 L10 85 Z" fill="#CBD5E1" />

                {/* Red Wrapper */}
                <path d="M10 82 L110 57 L110 145 L10 145 Z" fill="#C41230" />
                {/* White diagonal stripe */}
                <path d="M10 102 L110 77 L110 97 L10 122 Z" fill="#FFFFFF" />
              </svg>
            </div>
          </div>

        </section>

        {/* 4. Two Grid Cards Side-by-Side */}
        <section dir={direction} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left card: 25% Gifts */}
          <div className="bg-[#E64C53] rounded-[24px] p-6 md:p-8 flex flex-col items-start text-start justify-between min-h-[220px] shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-2 !mb-6 self-start">
              <span className="text-white/80 font-bold text-[11px] uppercase tracking-wider">{isEn ? 'Special Partner' : 'شريك مميز'}</span>
              <div className="w-[20px] h-[1px] bg-white/50"></div>
            </div>
            <div>
              <h3 className="text-white text-[26px] md:text-[34px] font-bold leading-tight mb-2">
                {isEn ? <><span style={{ fontFamily: "'EnglishDigits', sans-serif" }}>25%</span> on Gift Boxes</> : <><span style={{ fontFamily: "'EnglishDigits', sans-serif" }}>25%</span> على صناديق الهدايا</>}
              </h3>
              <p className="text-white/80 text-[14px] font-semibold !mb-6">
                {isEn ? <>Subscribe now and get <span style={{ fontFamily: "'EnglishDigits', sans-serif" }}>15%</span> discount on your first order</> : <>اشترك الآن واحصل على خصم <span style={{ fontFamily: "'EnglishDigits', sans-serif" }}>15%</span> على طلبك الأول من سعد الدين</>}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleFilterClick('gifts25')}
              className="px-6 h-[40px] inline-flex items-center justify-center bg-[#BBCFCD] hover:bg-[#ACC4C2] !text-[#234745] font-bold text-[13px] rounded-full transition-colors cursor-pointer"
            >
              {isEn ? 'Get Discount' : 'احصل على الخصم'}
            </button>
          </div>

          {/* Right card: 40% Chocolate */}
          <div className="bg-[#D3E1DF] rounded-[24px] p-6 md:p-8 flex flex-col items-start text-start justify-between min-h-[220px] shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-2 self-start">
              <span className="text-[#234745] font-bold text-[11px] uppercase tracking-wider">{isEn ? 'Seasonal Offer' : 'عرض موسمي'}</span>
              <div className="w-[20px] h-[1px] bg-[#234745]"></div>
            </div>
            <div>
              <h3 className="text-[#1A1A1A] text-[26px] md:text-[34px] font-bold leading-tight mb-2">
                {isEn ? <><span style={{ fontFamily: "'EnglishDigits', sans-serif" }}>40%</span> on all chocolate</> : <>خصم <span style={{ fontFamily: "'EnglishDigits', sans-serif" }}>40%</span> على الشوكولاتة</>}
              </h3>
              <p className="text-[#7D7D7D] text-[14px] font-semibold mb-6">
                {isEn ? <>More than <span style={{ fontFamily: "'EnglishDigits', sans-serif" }}>20</span> products with exceptional prices</> : <>أكثر من <span style={{ fontFamily: "'EnglishDigits', sans-serif" }}>20</span> منتج بأسعار استثنائية</>}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleFilterClick('chocolates40')}
              className="px-6 h-[40px] inline-flex items-center justify-center bg-[#234745] hover:bg-[#1a3533] !text-white font-bold text-[13px] rounded-full transition-colors cursor-pointer"
            >
              {isEn ? 'Shop Now' : 'تسوق الآن'}
            </button>
          </div>

        </section>

        {/* 5. Horizontal Gold Banner */}
        <section className="w-full bg-[#C5A96A] rounded-[16px] p-6 flex items-center justify-center shadow-sm ">
          <h3 className="text-[#234745] text-[18px] md:text-[30px] font-bold text-center flex items-center justify-center flex-wrap gap-1.5 leading-none">
            {isEn ? (
              <>
                <span style={{ fontFamily: "'EnglishDigits', sans-serif" }}>25%</span> on gift boxes for orders over <span style={{ fontFamily: "'EnglishDigits', sans-serif" }}>200</span>
                <SaudiRiyalSymbol className="h-[20px] md:h-[28px] w-auto text-[#234745] mb-0.5" />
              </>
            ) : (
              <>
                <span style={{ fontFamily: "'EnglishDigits', sans-serif" }}>25%</span> على صناديق الهدايا للطلبات فوق <span style={{ fontFamily: "'EnglishDigits', sans-serif" }}>200</span>
                <SaudiRiyalSymbol className="h-[20px] md:h-[28px] w-auto text-[#234745] mb-0.5" />
              </>
            )}
          </h3>
        </section>

        {/* 6. Exclusive Products Grid ("منتجات مختارة بخصومات حصرية") */}
        <section id="promotions-grid" className="flex flex-col gap-6 mt-6 scroll-mt-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
            <h2 className="text-[#171717] text-[24px] md:text-[30px] font-bold">
              {isEn ? 'Exclusive Products & Discounts' : 'منتجات مختارة بخصومات حصرية'}
            </h2>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 w-full md:w-auto hide-scrollbars">
              <button
                type="button"
                onClick={() => handleFilterClick('all')}
                className={`px-4 py-2 rounded-full text-[13px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeFilter === 'all'
                    ? 'bg-[#234745] text-white shadow-sm'
                    : 'bg-white text-[#234745] border border-[#EBE3D5] hover:bg-[#FDF0D5]'
                }`}
              >
                {isEn ? '✨ All Offers' : '✨ جميع العروض'}
              </button>

              <button
                type="button"
                onClick={() => handleFilterClick('bogo')}
                className={`px-4 py-2 rounded-full text-[13px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeFilter === 'bogo'
                    ? 'bg-[#234745] text-white shadow-sm'
                    : 'bg-white text-[#234745] border border-[#EBE3D5] hover:bg-[#FDF0D5]'
                }`}
              >
                {isEn ? '🎁 BOGO (1+1)' : '🎁 عروض 1+1 مجاناً'}
              </button>

              <button
                type="button"
                onClick={() => handleFilterClick('gifts25')}
                className={`px-4 py-2 rounded-full text-[13px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeFilter === 'gifts25'
                    ? 'bg-[#234745] text-white shadow-sm'
                    : 'bg-white text-[#234745] border border-[#EBE3D5] hover:bg-[#FDF0D5]'
                }`}
              >
                {isEn ? '📦 25% Gift Boxes' : '📦 25% صناديق الهدايا'}
              </button>

              <button
                type="button"
                onClick={() => handleFilterClick('chocolates40')}
                className={`px-4 py-2 rounded-full text-[13px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeFilter === 'chocolates40'
                    ? 'bg-[#234745] text-white shadow-sm'
                    : 'bg-white text-[#234745] border border-[#EBE3D5] hover:bg-[#FDF0D5]'
                }`}
              >
                {isEn ? '🍫 40% Chocolate' : '🍫 خصم 40% شوكولاتة'}
              </button>
            </div>
          </div>
          {finalDisplayProducts.length > 0 ? (
            <div className="flex flex-row overflow-x-auto gap-4 md:grid md:grid-cols-4 md:gap-6 pb-4 md:pb-0 snap-x snap-mandatory hide-scrollbars">
              {finalDisplayProducts.map((prod: any) => {
                const isSelected = isInWishlist(prod.id);
                return (
                  <div key={prod.id} className="bg-white border border-[#EBE3D5] rounded-[24px] overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow relative group w-[220px] sm:w-[260px] md:w-auto flex-shrink-0 md:flex-shrink snap-start">
                    {/* Top Badges */}
                    <div className="absolute top-3 left-3 right-3 flex justify-between items-center z-10">
                      {/* Wishlist Heart Icon */}
                      <button
                        type="button"
                        onClick={() => toggleWishlist(prod)}
                        className="w-[40px] h-[40px] bg-white rounded-full flex items-center justify-center shadow-md hover:scale-105 transition-transform active:scale-95 cursor-pointer"
                      >
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill={isSelected ? '#E24D55' : 'none'}
                          stroke={isSelected ? '#E24D55' : '#1A1A1A'}
                          strokeWidth="2"
                        >
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                      </button>

                      {/* Tag Badge */}
                      {prod.tag && (
                        <div className="bg-[#C5A96A] text-white font-bold text-[11px] px-3.5 py-1.5 rounded-full shadow-sm">
                          {prod.tag}
                        </div>
                      )}
                    </div>

                    {/* Product Image (Flush to top/left/right) */}
                    <div className="w-full aspect-[4/3] overflow-hidden bg-gray-50">
                      {prod.handle ? (
                        <Link to={`/products/${prod.handle}`}>
                          <img
                            src={prod.image}
                            alt={prod.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </Link>
                      ) : (
                        <img
                          src={prod.image}
                          alt={prod.title}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>

                    {/* Details & Button */}
                    <div className="p-4 md:p-5 flex flex-col gap-3 w-full">
                      <h4 className="text-[#171717] text-[16px] md:text-[18px] font-bold text-start line-clamp-1">
                        {prod.title}
                      </h4>

                      {/* Prices */}
                      <div className="flex items-center gap-3 text-start font-bold">
                        {/* Price */}
                        <div className={`flex items-center gap-1 text-[#234745] ${isEn ? 'flex-row' : 'flex-row-reverse'}`} dir="ltr">
                          <span className="text-[18px] md:text-[20px]" style={{ fontFamily: "'EnglishDigits', sans-serif" }}>
                            {prod.price}
                          </span>
                          <SaudiRiyalSymbol className="h-[14px] w-auto text-[#234745] mb-0.5" />
                        </div>
                        {/* Compare Price */}
                        {prod.comparePrice && (
                          <div className={`flex items-center gap-1 text-[#E64950] ${isEn ? 'flex-row' : 'flex-row-reverse'}`} dir="ltr">
                            <span className="text-lg md:text-[14px] line-through font-black" style={{ fontFamily: "'EnglishDigits', sans-serif" }}>
                              {prod.comparePrice}
                            </span>
                            <SaudiRiyalSymbol className="h-[11px] w-auto text-[#E64950] mb-0.5" />
                          </div>
                        )}
                      </div>

                      {/* Add to Cart Button */}
                      <div className="w-full mt-1">
                        {prod.variantId ? (
                          <AddToCartButton
                            lines={[{ merchandiseId: prod.variantId, quantity: 1 }]}
                            disabled={!prod.availableForSale}
                            className="w-full h-[48px] bg-[#234745] hover:bg-[#1a3533] text-white font-bold text-[14px] rounded-[50px] transition-colors flex items-center justify-center cursor-pointer"
                          >
                            {isEn ? 'Add to Cart' : 'أضف إلي السلة'}
                          </AddToCartButton>
                        ) : (
                          <button
                            disabled
                            className="w-full h-[48px] bg-[#BBCFCD] text-[#234745] font-bold text-[14px] rounded-[50px] cursor-not-allowed opacity-50 flex items-center justify-center"
                          >
                            {isEn ? 'Out of Stock' : 'نفذت الكمية'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="w-full py-12 text-center text-[#7D7D7D] font-bold text-[16px] bg-white/60 rounded-[24px] border border-[#EBE3D5]">
              {isEn ? 'No discounted products available at the moment.' : 'لا توجد منتجات عليها خصومات حالياً.'}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
