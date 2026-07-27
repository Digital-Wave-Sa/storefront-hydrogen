import { Link, useLocation } from 'react-router';

export function NotFound() {
  const location = useLocation();
  const isEn = location.pathname.startsWith('/en');

  return (
    <div className="w-full flex flex-col items-center justify-center min-h-[80vh] px-4 py-12 bg-white" dir={isEn ? 'ltr' : 'rtl'}>
      {/* Top Logo (Only if standard PageLayout doesn't render one, but we assume it's standalone in the screenshot) */}
      <div className="mb-8">
        <Link to="/">
          <img src="/images/logo.png" alt="Saadeddin" className="h-20 object-contain hidden" />
        </Link>
      </div>

      {/* 404 Hero Image */}
      <div className="w-full max-w-[500px] mb-8">
        <img 
          src="/images/404/404.svg" 
          alt="404 Not Found" 
          className="w-full h-auto object-contain"
        />
      </div>

      {/* Text Content */}
      <div className="text-center mb-8 flex flex-col items-center gap-2">
        <span className="text-gray-400 text-sm font-medium" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
          {isEn ? 'Error 404' : 'خطأ ٤٠٤'}
        </span>
        
        <h1 className="!text-[40px] md:!text-[50px] !font-bold text-[#1F413F] !leading-none mt-2 text-center" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}>
          {isEn ? 'It seems the page' : 'يبدو أن الصفحة'}
          <br />
          {isEn ? 'went eating sweets!' : 'ذهبت تتناول حلوى!'}
        </h1>
        
        <div className="text-gray-400 text-[15px] mt-4 flex flex-col gap-1" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
          <p>{isEn ? 'We couldn\'t find the page you\'re looking for.' : 'لم نتمكن من إيجاد الصفحة التي تبحث عنها.'}</p>
          <p>{isEn ? 'It might have been moved or deleted — but our store is full of sweeter things!' : 'ربما تم نقلها أو حذفها — لكن متجرنا مليء بما هو أحلى!'}</p>
        </div>
      </div>

      {/* Search Bar */}
      <form action={isEn ? '/en/search' : '/search'} className="w-full max-w-[480px] mb-10">
        <div className="flex flex-row items-stretch border border-gray-300 rounded-full overflow-hidden h-[54px] bg-white transition-colors focus-within:border-[#1F413F]">
          
          <div className="flex-1 flex items-center px-4 bg-transparent">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 shrink-0">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input 
              type="text" 
              name="q" 
              placeholder={isEn ? 'Search for a product or category...' : 'إبحث عن منتج أو قسم...'}
              className={`w-full h-full bg-transparent border-none focus:outline-none px-3 text-[15px] ${isEn ? 'text-left' : 'text-right'} text-gray-800 placeholder-gray-400`}
              style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
            />
          </div>
          
          <button 
            type="submit" 
            className="bg-[#1F413F] hover:bg-[#152e2c] !text-white px-8 h-full transition-colors font-medium shrink-0"
            style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
          >
            {isEn ? 'Search' : 'بحث'}
          </button>
        </div>
      </form>

      {/* Primary Actions */}
      <div className="flex flex-row flex-wrap items-center justify-center gap-4 mb-14 w-full">
        <Link 
          to={isEn ? '/en' : '/'} 
          className="bg-[#1F413F] !text-white px-8 py-3 rounded-full hover:bg-[#152e2c] transition-colors font-medium min-w-[160px] text-center"
          style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
        >
          {isEn ? 'Return Home' : 'العودة للرئيسية'}
        </Link>
        <Link 
          to={isEn ? '/en/collections/all' : '/collections/all'} 
          className="bg-transparent border border-gray-300 text-gray-700 px-8 py-3 rounded-full hover:bg-gray-50 transition-colors font-medium min-w-[160px] text-center"
          style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
        >
          {isEn ? 'Browse Products' : 'تصفح المنتجات'}
        </Link>
      </div>

      {/* Popular Categories */}
      <div className="w-full flex flex-col items-center">
        <span className="text-gray-400 text-sm mb-5" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
          {isEn ? 'Or browse popular categories' : 'أو تصفح الأقسام الشهيرة'}
        </span>
        <div className="flex flex-row flex-wrap justify-center gap-3 max-w-[600px]">
          {[
            { en: 'Chocolates', ar: 'شوكولاته', url: '/collections/chocolate' },
            { en: 'Arabic Sweets', ar: 'حلويات عربية', url: '/collections/arabic-sweets' },
            { en: 'Gifts', ar: 'هدايا', url: '/collections/gifts' },
            { en: 'Custom Cakes', ar: 'كيك مخصص', url: '/custom-cake' },
            { en: 'Contact Us', ar: 'تواصل معنا', url: '/pages/contact' },
          ].map((item, index) => (
            <Link 
              key={index}
              to={isEn ? `/en${item.url}` : item.url}
              className="border border-gray-300 rounded-full px-6 py-2.5 text-[14px] text-gray-600 hover:border-[#1F413F] hover:text-[#1F413F] transition-colors"
              style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
            >
              {isEn ? item.en : item.ar}
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
