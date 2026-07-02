import { useState, useEffect } from 'react';
import { type LoaderFunctionArgs, useLoaderData, useRouteLoaderData, Link } from 'react-router';
import { AddToCartButton } from '~/components/AddToCartButton';
import { useWishlist } from '~/context/WishlistContext';
import { PageHeader } from '~/components/layout/PageHeader';

// GraphQL query to fetch promotional products
const PROMOTIONS_QUERY = `#graphql
  query getPromotionalProducts($country: CountryCode, $language: LanguageCode) {
    products(first: 8) {
      nodes {
        id
        handle
        title
        availableForSale
        featuredImage {
          url
          altText
          width
          height
        }
        variants(first: 1) {
          nodes {
            id
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
    const data = await storefront.query(PROMOTIONS_QUERY);
    return { products: data?.products?.nodes || [] };
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

  // Live Countdown Timer state (initialized to 8h 32m 22s as in the mock image)
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

  // Default Arabic/English fallbacks to show a pixel-perfect mockup matching the exact image uploaded
  const mockProducts = [
    {
      id: 'mock-1',
      title: isEn ? 'Chocolate Pieces Selection' : 'تشكيلة قطع شوكولاتة',
      price: '188',
      comparePrice: '200',
      tag: isEn ? 'Most Wanted' : 'الاكثر طلباً',
      image: 'https://cdn.shopify.com/s/files/1/0616/1606/2642/files/cake.png',
      availableForSale: true,
      variantId: 'mock-var-1'
    },
    {
      id: 'mock-2',
      title: isEn ? 'Maamoul with Pistachio' : 'معمول بالفستق',
      price: '56',
      comparePrice: '60',
      tag: isEn ? '5% Off' : '٥٪ خصم',
      image: 'https://cdn.shopify.com/s/files/1/0616/1606/2642/files/cake.png',
      availableForSale: true,
      variantId: 'mock-var-2'
    },
    {
      id: 'mock-3',
      title: isEn ? 'Mixed Baklava' : 'بقلاوة مشكلة',
      price: '219',
      comparePrice: '240',
      tag: isEn ? 'Most Wanted' : 'الاكثر طلباً',
      image: 'https://cdn.shopify.com/s/files/1/0616/1606/2642/files/cake.png',
      availableForSale: true,
      variantId: 'mock-var-3'
    },
    {
      id: 'mock-4',
      title: isEn ? 'Product Name' : 'اسم المنتج',
      price: '188',
      comparePrice: '200',
      tag: isEn ? 'Most Wanted' : 'الاكثر طلباً',
      image: 'https://cdn.shopify.com/s/files/1/0616/1606/2642/files/cake.png',
      availableForSale: true,
      variantId: 'mock-var-4'
    },
    {
      id: 'mock-5',
      title: isEn ? 'Chocolate Pieces Selection' : 'تشكيلة قطع شوكولاتة',
      price: '188',
      comparePrice: '200',
      tag: isEn ? 'Most Wanted' : 'الاكثر طلباً',
      image: 'https://cdn.shopify.com/s/files/1/0616/1606/2642/files/cake.png',
      availableForSale: true,
      variantId: 'mock-var-5'
    },
    {
      id: 'mock-6',
      title: isEn ? 'Maamoul with Pistachio' : 'معمول بالفستق',
      price: '56',
      comparePrice: '60',
      tag: isEn ? '5% Off' : '٥٪ خصم',
      image: 'https://cdn.shopify.com/s/files/1/0616/1606/2642/files/cake.png',
      availableForSale: true,
      variantId: 'mock-var-6'
    },
    {
      id: 'mock-7',
      title: isEn ? 'Mixed Baklava' : 'بقلاوة مشكلة',
      price: '219',
      comparePrice: '240',
      tag: isEn ? 'Most Wanted' : 'الاكثر طلباً',
      image: 'https://cdn.shopify.com/s/files/1/0616/1606/2642/files/cake.png',
      availableForSale: true,
      variantId: 'mock-var-7'
    },
    {
      id: 'mock-8',
      title: isEn ? 'Product Name' : 'اسم المنتج',
      price: '188',
      comparePrice: '200',
      tag: isEn ? 'Most Wanted' : 'الاكثر طلباً',
      image: 'https://cdn.shopify.com/s/files/1/0616/1606/2642/files/cake.png',
      availableForSale: true,
      variantId: 'mock-var-8'
    }
  ];

  // Map real Shopify products to matching structures, or fallback to mock list
  const displayProducts = products && products.length > 0
    ? products.map((prod: any, idx: number) => {
      const variant = prod.variants?.nodes?.[0];
      const price = variant?.price?.amount ? Math.round(parseFloat(variant.price.amount)).toString() : '0';
      const comparePrice = variant?.compareAtPrice?.amount ? Math.round(parseFloat(variant.compareAtPrice.amount)).toString() : '';
      const mockFallback = mockProducts[idx % mockProducts.length];
      return {
        id: prod.id,
        title: isEn ? prod.title : (mockFallback.title || prod.title),
        price,
        comparePrice: comparePrice || (parseFloat(price) < parseFloat(mockFallback.price) ? mockFallback.comparePrice : ''),
        tag: mockFallback.tag,
        image: prod.featuredImage?.url || mockFallback.image,
        availableForSale: prod.availableForSale,
        variantId: variant?.id,
        handle: prod.handle
      };
    })
    : mockProducts;

  const direction = isEn ? 'ltr' : 'rtl';

  return (
    <div className="w-full bg-[#FFFFFF] min-h-screen pb-20" dir={direction} style={{ fontFamily: isEn ? 'inherit' : "'GE Dinar One', 'Bahij Janna', sans-serif" }}>

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
      <div className="max-w-[1280px] mx-auto px-4 mt-6 md:mt-10 flex flex-col gap-8">

        {/* 2. Hero Offer Card */}
        <section
          dir="ltr"
          style={{ boxSizing: 'border-box', background: '#FEF8EB' }}
          className="w-full rounded-[24px] border border-[#906B51] flex flex-col lg:flex-row items-stretch gap-6 p-5 lg:p-8"
        >
          {/* Left Side: Table Image — inset with card padding, rounded corners */}
          <div className="w-full lg:w-[45%] h-[260px] sm:h-[260px] lg:h-[350px] flex-shrink-0 rounded-[16px] overflow-hidden">
            <img
              src="/images/promotions/promotions-1st-section.webp"
              alt="Season Specials"
              className="w-full h-full object-cover object-center"
            />
          </div>

          {/* Right Side: Promotion Details */}
          <div
            dir={direction}
            className="flex-1 flex flex-col justify-center gap-5 py-2"
          >
            {/* Tag Badge — aligned to start (right in RTL) */}
            <div className="flex">
              <div className="bg-[#E24D55] px-3 py-1.5 rounded-[6px] flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white flex-shrink-0">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span className="text-white font-bold text-[12px] tracking-wide whitespace-nowrap">
                  {isEn ? 'LIMITED OFFER' : 'عرض محدود'}
                </span>
              </div>
            </div>

            {/* Title + Subtitle */}
            <div className="flex flex-col gap-2">
              <h2
                className="text-[#234745] font-bold leading-[100%]"
                style={{
                  fontFamily: isEn ? 'inherit' : "'Bahij Janna', sans-serif",
                  fontWeight: 700,
                  fontSize: '50px',
                  lineHeight: '100%',
                }}
              >
                {isEn ? 'Big Season Sales' : 'تخفيضات الموسم الكبيرة'}
              </h2>
              <p className="text-[#906B51] text-[15px] font-medium leading-relaxed">
                {isEn ? (
                  <>Discounts up to <span style={{ fontFamily: "'EnglishDigits', sans-serif" }}>40%</span> on our best products for a limited time</>
                ) : (
                  <>خصومات حتى <span style={{ fontFamily: "'EnglishDigits', sans-serif" }}>40%</span> على أفضل منتجاتنا لفترة محدودة</>
                )}
              </p>
            </div>

            {/* Timer + Promo Code — grouped together, aligned to start */}
            <div className="flex items-center gap-3 flex-wrap" suppressHydrationWarning>

              {/* Timer: Hours | Minutes | Seconds — in RTL renders right-to-left naturally */}
              <div className="flex items-center gap-2" suppressHydrationWarning>
                {/* Hours */}
                <div className="flex flex-col items-center justify-center w-[60px] h-[64px] bg-white border border-[#E1ECE9] rounded-[10px]">
                  <span suppressHydrationWarning className="text-[#234745] font-bold text-[22px] leading-none" style={{ fontFamily: "'EnglishDigits', sans-serif" }}>{timeLeft.hours}</span>
                  <span className="text-[#9FB7AE] text-[11px] font-semibold mt-1">{isEn ? 'Hours' : 'ساعة'}</span>
                </div>
                {/* Minutes */}
                <div className="flex flex-col items-center justify-center w-[60px] h-[64px] bg-white border border-[#E1ECE9] rounded-[10px]">
                  <span suppressHydrationWarning className="text-[#234745] font-bold text-[22px] leading-none" style={{ fontFamily: "'EnglishDigits', sans-serif" }}>{timeLeft.minutes}</span>
                  <span className="text-[#9FB7AE] text-[11px] font-semibold mt-1">{isEn ? 'Mins' : 'دقيقة'}</span>
                </div>
                {/* Seconds */}
                <div className="flex flex-col items-center justify-center w-[60px] h-[64px] bg-white border border-[#E1ECE9] rounded-[10px]">
                  <span suppressHydrationWarning className="text-[#234745] font-bold text-[22px] leading-none" style={{ fontFamily: "'EnglishDigits', sans-serif" }}>{timeLeft.seconds}</span>
                  <span className="text-[#9FB7AE] text-[11px] font-semibold mt-1">{isEn ? 'Secs' : 'ثانية'}</span>
                </div>
              </div>

              {/* Promo Code Box — always LTR inside so SAAD20 is left, button is right */}
              <div
                dir="ltr"
                className="flex items-center justify-between h-[64px] bg-white border border-[#E1ECE9] rounded-[10px] px-3 gap-2"
                style={{ minWidth: '160px' }}
              >
                <span className="text-[#234745] font-bold text-[15px] tracking-widest" style={{ fontFamily: "'EnglishDigits', sans-serif" }}>SAAD20</span>
                <button
                  onClick={handleCopyCode}
                  className="text-[#906B51] text-[11px] font-bold px-2 py-1.5 bg-[#FEF8EB] hover:bg-[#FDF0D5] rounded-[6px] border border-[#F5EAD4] transition-colors whitespace-nowrap"
                >
                  {isEn ? 'Copy' : 'نسخ الكود'}
                </button>
              </div>
            </div>

            {/* Shop Now Button */}
            <div className="flex">
              <Link
                to="/collections/all"
                className="inline-flex items-center justify-center px-10 h-[50px] bg-[#BBCFCD] hover:bg-[#ACC4C2] text-[#234745] font-bold text-[15px] rounded-full transition-colors"
              >
                {isEn ? 'Shop Now' : 'تسوق الآن'}
              </Link>
            </div>
          </div>
        </section>

        {/* 3. BOGO Banner (Buy 1 Get 1 Free) */}
        <section
          dir="ltr"
          className="w-full bg-[#ECD9DA] rounded-[24px] p-6 md:p-10 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden"
        >
          {/* Left Side: Chocolate Bar Illustration (Always Left) */}
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

          {/* Right Side: Promotion Details (Always Right) */}
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
                className="text-[#1F3E35] text-[26px] md:text-[34px] font-bold leading-tight"
                style={{
                  fontFamily: isEn ? 'inherit' : "'Bahij Janna', sans-serif",
                  fontWeight: 700,
                }}
              >
                {isEn ? 'Buy One Get One Free' : 'اشتري واحد واحصل على الثاني مجاناً'}
              </h3>
              <p className="text-[#7A605C] text-[14px] md:text-[15px] font-semibold leading-relaxed">
                {isEn ? 'On all dark chocolate types — Today only!' : 'على جميع أنواع الشوكولاتة الداكنة — اليوم فقط!'}
              </p>
            </div>

            {/* Action Row: Button + Shoppers Count */}
            <div className="flex flex-row items-center gap-4 mt-2">
              {/* Button */}
              <Link
                to="/collections/all"
                className="inline-flex items-center gap-2 px-8 h-[48px] bg-[#BBCFCD] hover:bg-[#ACC4C2] text-[#234745] font-bold text-[14px] rounded-full transition-colors flex-shrink-0"
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
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                      <line x1="19" y1="12" x2="5" y2="12" />
                      <polyline points="12 19 5 12 12 5" />
                    </svg>
                    <span>تسوق العرض</span>
                  </>
                )}
              </Link>
              
              {/* Shoppers Count (Standard English digits) */}
              <span className="text-[#D61C4E] text-[13px] font-semibold whitespace-nowrap">
                <span style={{ fontFamily: "'EnglishDigits', sans-serif" }} className="font-bold">243</span>
                <span>{isEn ? ' people shopping now' : ' شخص يتسوق الآن'}</span>
              </span>
            </div>
          </div>
        </section>

        {/* 4. Two Grid Cards Side-by-Side */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left card: 40% Chocolate */}
          <div className="bg-[#D3E1DF] rounded-[24px] p-6 md:p-8 flex flex-col items-start text-start justify-between min-h-[220px] shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-2 mb-4 self-start">
              <span className="text-[#234745] font-bold text-[11px] uppercase tracking-wider">{isEn ? 'Seasonal Offer' : 'عرض موسمي'}</span>
              <div className="w-[20px] h-[1px] bg-[#234745]"></div>
            </div>
            <div>
              <h3 className="text-[#1A1A1A] text-[28px] md:text-[34px] font-bold leading-tight mb-2">
                {isEn ? '40% on all chocolate' : 'خصم 40% على الشوكولاتة'}
              </h3>
              <p className="text-[#6D8A85] text-[14px] font-semibold mb-6">
                {isEn ? 'More than 20 products with exceptional prices' : 'أكثر من ٢٠ منتج بأسعار استثنائية'}
              </p>
            </div>
            <Link
              to="/collections/all"
              className="px-6 h-[40px] inline-flex items-center justify-center bg-[#234745] hover:bg-[#1a3533] text-white font-bold text-[13px] rounded-full transition-colors"
            >
              {isEn ? 'Shop Now' : 'تسوق الآن'}
            </Link>
          </div>

          {/* Right card: 25% Gifts */}
          <div className="bg-[#E64C53] rounded-[24px] p-6 md:p-8 flex flex-col items-start text-start justify-between min-h-[220px] shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-2 mb-4 self-start">
              <span className="text-white/80 font-bold text-[11px] uppercase tracking-wider">{isEn ? 'Special Partner' : 'شريك مميز'}</span>
              <div className="w-[20px] h-[1px] bg-white/50"></div>
            </div>
            <div>
              <h3 className="text-white text-[28px] md:text-[34px] font-bold leading-tight mb-2">
                {isEn ? '25% on Gift Boxes' : '25% على صناديق الهدايا'}
              </h3>
              <p className="text-white/80 text-[14px] font-semibold mb-6">
                {isEn ? 'Subscribe now and get 15% discount on your first order' : 'اشترك الآن واحصل على خصم 15% على طلبك الأول من سعد الدين'}
              </p>
            </div>
            <Link
              to="/collections/all"
              className="px-6 h-[40px] inline-flex items-center justify-center bg-[#BBCFCD] hover:bg-[#ACC4C2] text-[#234745] font-bold text-[13px] rounded-full transition-colors"
            >
              {isEn ? 'Get Discount' : 'احصل على الخصم'}
            </Link>
          </div>
        </section>

        {/* 5. Horizontal Gold Banner */}
        <section className="w-full bg-[#C5A86D] rounded-[16px] p-4 flex items-center justify-center shadow-sm">
          <h3 className="text-white text-[18px] md:text-[22px] font-bold text-center">
            {isEn ? '25% on gift boxes for orders over 200 SAR' : '25% على صناديق الهدايا للطلبات فوق 200 ر.س'}
          </h3>
        </section>

        {/* 6. Exclusive Products Grid ("منتجات مختارة بخصومات حصرية") */}
        <section className="flex flex-col gap-6 mt-6">
          <div className="flex justify-between items-center w-full">
            <h2 className="text-[#171717] text-[24px] md:text-[30px] font-bold">
              {isEn ? 'Exclusive Products & Discounts' : 'منتجات مختارة بخصومات حصرية'}
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {displayProducts.map((prod: any) => {
              const isSelected = isInWishlist(prod.id);
              return (
                <div key={prod.id} className="bg-white border border-[#EBE3D5] rounded-[24px] p-3 flex flex-col justify-between hover:shadow-md transition-shadow relative group">
                  {/* Top Badges */}
                  <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
                    {/* Wishlist Heart Icon */}
                    <button
                      type="button"
                      onClick={() => toggleWishlist(prod)}
                      className="w-[36px] h-[36px] bg-white rounded-full flex items-center justify-center shadow-md hover:scale-105 transition-transform active:scale-95"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill={isSelected ? '#E24D55' : 'none'}
                        stroke={isSelected ? '#E24D55' : '#7D7D7D'}
                        strokeWidth="2.5"
                      >
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                      </svg>
                    </button>

                    {/* Tag Badge */}
                    <div className="bg-[#BFA169] text-white font-bold text-[10px] md:text-[11px] px-2.5 py-1 rounded-[6px] shadow-sm">
                      {prod.tag}
                    </div>
                  </div>

                  {/* Product Image */}
                  <div className="w-full aspect-square rounded-[18px] overflow-hidden bg-gray-50 mb-3">
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
                  <div className="flex flex-col gap-2">
                    <h4 className="text-[#171717] text-[14px] md:text-[16px] font-bold text-start line-clamp-1">
                      {prod.title}
                    </h4>

                    {/* Prices */}
                    <div className="flex items-center gap-2 text-start font-bold">
                      <span className="text-[#234745] text-[15px] md:text-[17px]">
                        {prod.price} {isEn ? 'SAR' : 'ر.س'}
                      </span>
                      {prod.comparePrice && (
                        <span className="text-[#7D7D7D] text-[12px] md:text-[13px] line-through font-normal">
                          {prod.comparePrice} {isEn ? 'SAR' : 'ر.س'}
                        </span>
                      )}
                    </div>

                    {/* Add to Cart Button */}
                    <div className="w-full mt-1.5">
                      {prod.variantId ? (
                        <AddToCartButton
                          lines={[{ merchandiseId: prod.variantId, quantity: 1 }]}
                          disabled={!prod.availableForSale}
                          className="w-full h-[40px] bg-[#234745] hover:bg-[#1a3533] text-white font-bold text-[13px] rounded-[12px] transition-colors flex items-center justify-center"
                        >
                          {isEn ? 'Add to Cart' : 'أضف إلي السلة'}
                        </AddToCartButton>
                      ) : (
                        <button
                          disabled
                          className="w-full h-[40px] bg-[#BBCFCD] text-[#234745] font-bold text-[13px] rounded-[12px] cursor-not-allowed opacity-50 flex items-center justify-center"
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
        </section>

      </div>
    </div>
  );
}
