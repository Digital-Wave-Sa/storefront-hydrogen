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
      <div className="max-w-[1240px] mx-auto px-4 mt-6 md:mt-10 flex flex-col gap-8">
        
        {/* 2. Hero Offer Card */}
        <section className="w-full bg-[#FEF8EB]/30 rounded-[24px] border border-[#EBE3D5] p-5 md:p-8 flex flex-col lg:flex-row items-center gap-8 shadow-sm" dir="ltr">
          {/* Left Side: Table Image (Always Left) */}
          <div className="w-full lg:w-1/2 h-[260px] sm:h-[350px] lg:h-[400px] rounded-[20px] overflow-hidden shadow-sm">
            <img 
              src="/images/promotions/promotions-1st-section.webp" 
              alt="Season Specials" 
              className="w-full h-full object-cover"
            />
          </div>

          {/* Right Side: Promotion Details (Always Right) */}
          <div className="w-full lg:w-1/2 flex flex-col items-start rtl:items-end text-start rtl:text-end gap-5" dir={direction}>
            {/* Tag Badge */}
            <div className="bg-[#E24D55] px-3 py-1 rounded-[6px] flex items-center gap-1.5 self-start rtl:self-end">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span className="text-white font-bold text-[12px] tracking-wide">{isEn ? 'LIMITED OFFER' : 'عرض محدود'}</span>
            </div>

            <div className="flex flex-col gap-2 w-full">
              <h2 className="text-[#234745] text-[32px] md:text-[40px] font-bold leading-tight">
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

            {/* Timer and Promo Code Block */}
            <div className="flex flex-row flex-wrap items-center justify-between w-full gap-4 mt-2">
              
              {/* Promo Code Badge (Left side in RTL) */}
              <div className="flex items-center justify-between w-[150px] h-[60px] bg-white border border-[#E1ECE9] rounded-[10px] px-3 shadow-sm" dir="ltr">
                <span className="text-[#234745] font-bold text-[15px] tracking-wider" style={{ fontFamily: "'EnglishDigits', sans-serif" }}>SAAD20</span>
                <button 
                  onClick={handleCopyCode}
                  className="text-[#906B51] text-[11px] font-bold px-2 py-1.5 bg-[#FEF8EB] hover:bg-[#FDF0D5] rounded-[6px] border border-[#F5EAD4] transition-colors"
                >
                  {isEn ? 'Copy' : 'نسخ الكود'}
                </button>
              </div>

              {/* Live Timer digits (Right side in RTL) */}
              <div className="flex items-center gap-2" dir="ltr">
                <div className="flex flex-col items-center justify-center w-[54px] h-[60px] bg-white border border-[#E1ECE9] rounded-[10px] shadow-sm">
                  <span className="text-[#234745] font-bold text-[20px] leading-none" style={{ fontFamily: "'EnglishDigits', sans-serif" }}>{timeLeft.hours}</span>
                  <span className="text-[#9FB7AE] text-[10px] font-bold mt-1">{isEn ? 'Hours' : 'ساعة'}</span>
                </div>
                <div className="flex flex-col items-center justify-center w-[54px] h-[60px] bg-white border border-[#E1ECE9] rounded-[10px] shadow-sm">
                  <span className="text-[#234745] font-bold text-[20px] leading-none" style={{ fontFamily: "'EnglishDigits', sans-serif" }}>{timeLeft.minutes}</span>
                  <span className="text-[#9FB7AE] text-[10px] font-bold mt-1">{isEn ? 'Mins' : 'دقيقة'}</span>
                </div>
                <div className="flex flex-col items-center justify-center w-[54px] h-[60px] bg-white border border-[#E1ECE9] rounded-[10px] shadow-sm">
                  <span className="text-[#234745] font-bold text-[20px] leading-none" style={{ fontFamily: "'EnglishDigits', sans-serif" }}>{timeLeft.seconds}</span>
                  <span className="text-[#9FB7AE] text-[10px] font-bold mt-1">{isEn ? 'Secs' : 'ثانية'}</span>
                </div>
              </div>

            </div>

            {/* Shop now button */}
            <Link 
              to="/collections/all" 
              className="inline-flex items-center justify-center px-8 h-[48px] bg-[#BBCFCD] hover:bg-[#ACC4C2] text-[#234745] font-bold text-[15px] rounded-full shadow-sm mt-3 transition-colors self-start rtl:self-start"
            >
              {isEn ? 'Shop Now' : 'تسوق الآن'}
            </Link>
          </div>
        </section>

        {/* 3. BOGO Banner (Buy 1 Get 1 Free) */}
        <section className="w-full bg-[#F5E2E4] rounded-[24px] overflow-hidden p-6 md:p-10 flex flex-col md:flex-row items-center justify-between relative gap-6">
          {/* Left Side: Chocolate Bar Illustration */}
          <div className="w-[120px] h-[120px] flex items-center justify-center flex-shrink-0">
            {/* Custom vector-styled flat chocolate bar */}
            <svg width="100" height="110" viewBox="0 0 100 110" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-md">
              {/* Chocolate Base blocks */}
              <rect x="15" y="10" width="70" height="90" rx="8" fill="#84543F" />
              {/* Individual squares */}
              <rect x="23" y="18" width="16" height="16" rx="3" fill="#693C29" />
              <rect x="43" y="18" width="16" height="16" rx="3" fill="#693C29" />
              <rect x="63" y="18" width="16" height="16" rx="3" fill="#693C29" />
              
              <rect x="23" y="38" width="16" height="16" rx="3" fill="#693C29" />
              <rect x="43" y="38" width="16" height="16" rx="3" fill="#693C29" />
              <rect x="63" y="38" width="16" height="16" rx="3" fill="#693C29" />

              <rect x="23" y="58" width="16" height="16" rx="3" fill="#693C29" />
              <rect x="43" y="58" width="16" height="16" rx="3" fill="#693C29" />
              <rect x="63" y="58" width="16" height="16" rx="3" fill="#693C29" />

              <rect x="23" y="78" width="16" height="16" rx="3" fill="#693C29" />
              <rect x="43" y="78" width="16" height="16" rx="3" fill="#693C29" />
              <rect x="63" y="78" width="16" height="16" rx="3" fill="#693C29" />

              {/* Wrapped paper (cutout effect) */}
              <path d="M12 50 C20 45, 30 55, 45 45 C60 52, 70 48, 88 50 L88 102 C88 105, 85 108, 80 108 L20 108 C15 108, 12 105, 12 102 Z" fill="#E62C4E" />
              <path d="M12 60 C25 55, 35 68, 55 58 C70 65, 80 58, 88 60 L88 102 C88 105, 85 108, 80 108 L20 108 C15 108, 12 105, 12 102 Z" fill="#FFFFFF" />
            </svg>
          </div>

          {/* Right Side: Copy/Text details */}
          <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-start gap-2.5">
            {/* Green Badge */}
            <div className="bg-[#2E5E4E] px-3 py-1 rounded-[15px] flex items-center gap-1">
              <span className="text-white text-[11px] font-bold">🎁 {isEn ? '1+1 Free' : '١+١ مجاناً'}</span>
            </div>
            
            <h3 className="text-[#1A1A1A] text-[26px] md:text-[32px] font-bold leading-tight">
              {isEn ? 'Buy One Get One Free' : 'اشتري واحد واحصل على الثاني مجاناً'}
            </h3>
            <p className="text-[#7D7D7D] text-[14px] font-medium">
              {isEn ? 'On all dark chocolate types — Today only!' : 'على جميع أنواع الشوكولاتة الداكنة — اليوم فقط!'}
            </p>
          </div>

          {/* Button and shoppers count */}
          <div className="flex flex-col sm:flex-row items-center gap-4 self-center md:self-end">
            <span className="text-[#E63946] text-[12px] font-bold animate-pulse">
              {isEn ? '243 people shopping now' : '٢٤٣ شخص يتسوق الآن'}
            </span>
            <Link 
              to="/collections/all" 
              className="inline-flex items-center gap-2 px-6 h-[44px] bg-[#BBCFCD] hover:bg-[#ACC4C2] text-[#234745] font-bold text-[14px] rounded-full transition-colors"
            >
              <span>{isEn ? 'Shop Offer' : 'تسوق العرض'}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="rotate-180 rtl:rotate-0">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
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
