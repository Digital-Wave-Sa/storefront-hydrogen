import { Link, useLocation } from 'react-router';

interface ServerErrorProps {
  error?: unknown;
  status?: number;
}

export function ServerError({ error, status = 500 }: ServerErrorProps) {
  const location = useLocation();
  const isEn = location.pathname.startsWith('/en');

  const errorMessage =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
      ? error
      : null;

  return (
    <div
      className="w-full flex flex-col items-center justify-center min-h-[80vh] px-4 py-12 bg-white"
      dir={isEn ? 'ltr' : 'rtl'}
    >
      {/* 500 Hero Image */}
      <div className="w-full max-w-[420px] mb-8">
        <img
          src="/images/500/500.png"
          alt="500 Server Error"
          className="w-full h-auto object-contain"
        />
      </div>

      {/* Text Content */}
      <div className="text-center mb-8 flex flex-col items-center gap-2">
        <span
          className="text-gray-400 text-sm font-medium"
          style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
        >
          {isEn ? `Error ${status}` : `خطأ ${status}`}
        </span>

        <h1
          className="!text-[40px] md:!text-[50px] !font-bold text-[#1F413F] !leading-none mt-2 text-center"
          style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}
        >
          {isEn ? 'Oops! Something went' : 'عذراً! حدث خطأ'}
          <br />
          {isEn ? 'wrong in our kitchen!' : 'في مطبخنا!'}
        </h1>

        <div
          className="text-gray-400 text-[15px] mt-4 flex flex-col gap-1"
          style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
        >
          <p>
            {isEn
              ? "Our servers are currently baking a fix — we'll be back shortly."
              : 'خوادمنا تعمل على إصلاح المشكلة — سنعود بعد قليل.'}
          </p>
          <p>
            {isEn
              ? 'In the meantime, explore our sweet treats below!'
              : 'في هذه الأثناء، تصفح منتجاتنا اللذيذة أدناه!'}
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <form
        action={isEn ? '/en/search' : '/search'}
        className="w-full max-w-[480px] mb-10"
      >
        <div className="flex flex-row items-stretch border border-gray-300 rounded-full overflow-hidden h-[54px] bg-white transition-colors focus-within:border-[#1F413F]">
          <div className="flex-1 flex items-center px-4 bg-transparent">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-400 shrink-0"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              name="q"
              placeholder={
                isEn
                  ? 'Search for a product or category...'
                  : 'إبحث عن منتج أو قسم...'
              }
              className={`w-full h-full bg-transparent border-none focus:outline-none px-3 text-[15px] ${
                isEn ? 'text-left' : 'text-right'
              } text-gray-800 placeholder-gray-400`}
              style={{
                fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
              }}
            />
          </div>

          <button
            type="submit"
            className="bg-[#1F413F] hover:bg-[#152e2c] !text-white px-8 h-full transition-colors font-medium shrink-0"
            style={{
              fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
            }}
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
        <span
          className="text-gray-400 text-sm mb-5"
          style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
        >
          {isEn ? 'Or browse popular categories' : 'أو تصفح الأقسام الشهيرة'}
        </span>
        <div className="flex flex-row flex-wrap justify-center gap-3 max-w-[600px]">
          {[
            { en: 'Chocolates', ar: 'شوكولاته', url: '/collections/chocolate' },
            {
              en: 'Arabic Sweets',
              ar: 'حلويات عربية',
              url: '/collections/arabic-sweets',
            },
            { en: 'Gifts', ar: 'هدايا', url: '/collections/gifts' },
            { en: 'Custom Cakes', ar: 'كيك مخصص', url: '/custom-cake' },
            { en: 'Contact Us', ar: 'تواصل معنا', url: '/pages/contact' },
          ].map((item, index) => (
            <Link
              key={index}
              to={isEn ? `/en${item.url}` : item.url}
              className="border border-gray-300 rounded-full px-6 py-2.5 text-[14px] text-gray-600 hover:border-[#1F413F] hover:text-[#1F413F] transition-colors"
              style={{
                fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
              }}
            >
              {isEn ? item.en : item.ar}
            </Link>
          ))}
        </div>
      </div>

      {/* Dev-only error details */}
      {process.env.NODE_ENV === 'development' && errorMessage && (
        <details className="mt-12 w-full max-w-[700px]">
          <summary
            className="cursor-pointer text-sm text-gray-400 hover:text-gray-600 font-medium select-none"
            style={{
              fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
            }}
          >
            {isEn ? '🔧 Developer Details (dev only)' : '🔧 تفاصيل المطور (للتطوير فقط)'}
          </summary>
          <div className="mt-4 bg-red-50 border border-red-200 rounded-2xl p-6 text-left">
            <p className="text-red-700 text-sm font-bold mb-2 font-mono">
              {status} Error
            </p>
            <pre className="text-red-600 text-xs whitespace-pre-wrap break-all font-mono leading-relaxed">
              {errorMessage}
            </pre>
          </div>
        </details>
      )}
    </div>
  );
}
