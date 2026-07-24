import { useState } from 'react';
import { useRouteLoaderData, Link, data, type LoaderFunctionArgs, type MetaFunction } from 'react-router';

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  const isEn = data?.lang === 'en';
  return [
    { title: isEn ? 'Vouchers & Promotions | Saadeddin Pastry' : 'القسائم والعروض الترويجية | حلويات سعد الدين' },
    { name: 'description', content: isEn ? 'Discover exclusive gift vouchers, promo codes, and special discounts at Saadeddin Pastry.' : 'اكتشف قسائم الهدايا الحصرية وأكواد الخصم والعروض الترويجية لدى حلويات سعد الدين.' },
  ];
};

export async function loader({ context }: LoaderFunctionArgs) {
  const { storefront } = context;
  const lang = storefront.i18n.language === 'EN' ? 'en' : 'ar';
  return data({ lang });
}

export default function VouchersPage() {
  const rootData = useRouteLoaderData('root') as any;
  const isEn = rootData?.locale?.language === 'EN' || rootData?.locale === 'en';

  const [activeTab, setActiveTab] = useState<'active' | 'used' | 'expired'>('active');
  const [voucherCodeInput, setVoucherCodeInput] = useState('');
  const [balanceCheckInput, setBalanceCheckInput] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [appliedVoucherSuccess, setAppliedVoucherSuccess] = useState<string | null>(null);
  const [balanceResult, setBalanceResult] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCopyCode = (code: string) => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      showToast(isEn ? `Code "${code}" copied to clipboard!` : `تم نسخ الرمز "${code}" بنجاح!`);
    }
  };

  const handleApplyVoucher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherCodeInput.trim()) return;
    setAppliedVoucherSuccess(
      isEn 
        ? `Voucher "${voucherCodeInput.trim().toUpperCase()}" validated successfully! Applied to your cart.` 
        : `تم التحقق من القسيمة "${voucherCodeInput.trim().toUpperCase()}" بنجاح! تم التطبيق على سلتك.`
    );
    showToast(isEn ? 'Voucher code applied!' : 'تم تطبيق كود القسيمة!');
  };

  const handleCheckBalance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!balanceCheckInput.trim()) return;
    setBalanceResult(
      isEn 
        ? `Current balance for "${balanceCheckInput.trim()}": 150.00 SAR` 
        : `الرصيد المتاح للرمز "${balanceCheckInput.trim()}": 150.00 ر.س`
    );
  };

  return (
    <div className={`min-h-screen bg-[#FAF8F5] pb-16 ${isEn ? 'font-en' : 'font-ar'}`} dir={isEn ? 'ltr' : 'rtl'}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#234745] text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-3 animate-fade-in text-[14px] font-bold border border-[#C8A464]/40">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C8A464" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          {toastMessage}
        </div>
      )}

      {/* ─── 1. HERO BANNER SECTION ───────────────────────────────────────── */}
      <section className="relative w-full h-[420px] sm:h-[480px] lg:h-[520px] bg-[#1A3533] overflow-hidden flex items-center justify-center">
        {/* Background Image Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1578985545062-69928b1d9587?q=80&w=1600&auto=format&fit=crop"
            alt="Saadeddin Luxury Vouchers Banner"
            className="w-full h-full object-cover opacity-35 scale-105 transition-transform duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1A3533]/90 via-[#1A3533]/50 to-transparent" />
        </div>

        {/* Content Container */}
        <div className="relative z-10 max-w-[1200px] mx-auto px-4 text-center text-white flex flex-col items-center justify-center gap-4">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[#C8A464] text-[13px] sm:text-[14px] font-bold">
            <span className="w-2 h-2 rounded-full bg-[#C8A464] animate-pulse" />
            {isEn ? 'Gift Vouchers' : 'قسائم الهدايا'}
          </div>

          {/* Title */}
          <h1 
            className="text-[32px] sm:text-[44px] lg:text-[54px] font-bold leading-[1.15] text-white tracking-wide max-w-[850px]"
            style={{ fontFamily: isEn ? "'Bahij Janna', sans-serif" : undefined }}
          >
            {isEn ? 'Gifts & Promotional Vouchers' : 'الهدايا والعروض الترويجية'}
          </h1>

          {/* Subtitle */}
          <p 
            className="text-white/85 text-[14px] sm:text-[16px] lg:text-[18px] max-w-[700px] font-light leading-relaxed"
            style={{ fontFamily: isEn ? "'Gotham Light', sans-serif" : undefined }}
          >
            {isEn 
              ? 'The finest selection for every occasion, bringing endless possibilities and sweet memories.' 
              : 'التجربة الاختيار الأفضل وتجعل إمكانية الاستخدام والخيارات الخالية متوفرة دائماً'}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
            <Link
              to={isEn ? '/en/collections/all' : '/collections/all'}
              className="h-[48px] px-8 bg-[#C8A464] hover:bg-[#b59355] text-[#1A3533] font-bold text-[15px] rounded-[50px] flex items-center justify-center transition-all shadow-lg hover:scale-105"
            >
              {isEn ? 'Shop Now' : 'تسوق الآن'}
            </Link>
            <a
              href="#redeem-section"
              className="h-[48px] px-8 bg-white/15 hover:bg-white/25 border border-white/30 text-white font-bold text-[15px] rounded-[50px] flex items-center justify-center transition-all backdrop-blur-sm"
            >
              {isEn ? 'Redeem Voucher' : 'استبدال قسيمة'}
            </a>
          </div>

          {/* Bottom Feature Strip */}
          <div className="mt-8 pt-6 border-t border-white/15 flex flex-wrap items-center justify-center gap-6 sm:gap-12 text-white/80 text-[12px] sm:text-[13px] font-medium">
            <div className="flex items-center gap-2">
              <span className="text-[#C8A464]">✓</span>
              <span>{isEn ? 'Quick Preparation' : 'تجهيزات خلال وطلبات لساعة أحدث'}</span>
            </div>
            <span className="text-white/30 hidden sm:inline">|</span>
            <div className="flex items-center gap-2">
              <span className="text-[#C8A464]">✓</span>
              <span>{isEn ? 'Fast Shipping' : 'شحن سريع'}</span>
            </div>
            <span className="text-white/30 hidden sm:inline">|</span>
            <div className="flex items-center gap-2">
              <span className="text-[#C8A464]">✓</span>
              <span>{isEn ? '100% Fresh' : 'أكل طازج 100%'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. AVAILABLE VOUCHERS SECTION ──────────────────────────────── */}
      <section className="max-w-[1200px] mx-auto px-4 pt-16 pb-12">
        <div className="text-center mb-10">
          <h2 
            className="text-[28px] sm:text-[34px] font-bold text-[#234745] mb-2"
            style={{ fontFamily: isEn ? "'Bahij Janna', sans-serif" : undefined }}
          >
            {isEn ? 'Available Vouchers' : 'القسائم المتاحة'}
          </h2>
          <p 
            className="text-[#666666] text-[14px] sm:text-[15px]"
            style={{ fontFamily: isEn ? "'Gotham Light', sans-serif" : undefined }}
          >
            {isEn ? 'Available vouchers for immediate use - Get yours now' : 'القسائم المتاحة للاستخدام - احصل عليها الآن'}
          </p>
        </div>

        {/* Vouchers Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Voucher Card 1 (Dark Teal) */}
          <div className="relative bg-[#234745] text-white rounded-2xl p-6 shadow-xl flex flex-col justify-between overflow-hidden border border-[#234745]/20 hover:-translate-y-1 transition-all duration-300">
            {/* Cutout notches */}
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#FAF8F5]" />
            <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#FAF8F5]" />

            <div>
              {/* Brand logo text */}
              <div className="text-[#C8A464] text-[11px] font-bold tracking-[0.25em] uppercase mb-4 text-center">
                S A A D E D D I N
              </div>
              
              {/* Main Discount */}
              <div className="text-center my-3">
                <span 
                  className="text-[34px] sm:text-[40px] font-bold text-white leading-none block mb-1"
                  style={{ fontFamily: isEn ? "'Bahij Janna', sans-serif" : undefined }}
                >
                  {isEn ? '15% OFF' : 'خصم 15%'}
                </span>
                <span className="text-white/80 text-[13px]">
                  {isEn ? 'On all Oriental Sweets' : 'على جميع الحلويات الشرقية'}
                </span>
              </div>
            </div>

            {/* Dashed divider */}
            <div className="border-t border-dashed border-white/20 my-5" />

            {/* Bottom Row */}
            <div>
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="bg-white/10 rounded-lg px-3 py-1.5 text-center">
                  <span className="block text-[10px] text-[#C8A464] uppercase font-bold">{isEn ? 'Code' : 'الرمز'}</span>
                  <span className="text-[14px] font-mono font-bold text-white tracking-widest">SWEET</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyCode('SWEET')}
                  className="h-[38px] px-5 bg-[#C8A464] hover:bg-[#b59355] text-[#1A3533] font-bold text-[13px] rounded-full transition-all active:scale-95 shadow-md"
                >
                  {isEn ? 'Get Code' : 'إحصل عليه'}
                </button>
              </div>
              <div className="text-[11px] text-white/60 text-center">
                {isEn ? 'Expires Dec 31, 2026 | Min spend 150 SAR' : 'تنتهي 31 ديسمبر 2026 | الحد الأدنى 150 ر.س'}
              </div>
            </div>
          </div>

          {/* Voucher Card 2 (Gold Luxury) */}
          <div className="relative bg-[#C8A464] text-[#1A3533] rounded-2xl p-6 shadow-xl flex flex-col justify-between overflow-hidden border border-[#C8A464]/30 hover:-translate-y-1 transition-all duration-300">
            {/* Cutout notches */}
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#FAF8F5]" />
            <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#FAF8F5]" />

            <div>
              {/* Brand logo text */}
              <div className="text-[#1A3533]/80 text-[11px] font-bold tracking-[0.25em] uppercase mb-4 text-center">
                S A A D E D D I N
              </div>
              
              {/* Main Discount */}
              <div className="text-center my-3">
                <span 
                  className="text-[34px] sm:text-[40px] font-bold text-[#1A3533] leading-none block mb-1"
                  style={{ fontFamily: isEn ? "'Bahij Janna', sans-serif" : undefined }}
                >
                  {isEn ? '50 SAR OFF' : '50 خصم'}
                </span>
                <span className="text-[#1A3533]/80 text-[13px]">
                  {isEn ? 'On purchases over 300 SAR' : 'عند الشراء بأكثر من 300 ر.س'}
                </span>
              </div>
            </div>

            {/* Dashed divider */}
            <div className="border-t border-dashed border-[#1A3533]/20 my-5" />

            {/* Bottom Row */}
            <div>
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="bg-[#1A3533]/10 rounded-lg px-3 py-1.5 text-center">
                  <span className="block text-[10px] text-[#1A3533]/70 uppercase font-bold">{isEn ? 'Code' : 'الرمز'}</span>
                  <span className="text-[14px] font-mono font-bold text-[#1A3533] tracking-widest">SWEET</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyCode('SWEET')}
                  className="h-[38px] px-5 bg-[#234745] hover:bg-[#1A3533] text-white font-bold text-[13px] rounded-full transition-all active:scale-95 shadow-md"
                >
                  {isEn ? 'Get Code' : 'إحصل عليه'}
                </button>
              </div>
              <div className="text-[11px] text-[#1A3533]/70 text-center">
                {isEn ? 'Expires Dec 31, 2026 | Min spend 300 SAR' : 'تنتهي 31 ديسمبر 2026 | الحد الأدنى 300 ر.س'}
              </div>
            </div>
          </div>

          {/* Voucher Card 3 (Soft Grey/Cream) */}
          <div className="relative bg-white text-[#234745] rounded-2xl p-6 shadow-md flex flex-col justify-between overflow-hidden border border-gray-200 hover:-translate-y-1 transition-all duration-300">
            {/* Cutout notches */}
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#FAF8F5]" />
            <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#FAF8F5]" />

            <div>
              {/* Brand logo text */}
              <div className="text-[#234745]/60 text-[11px] font-bold tracking-[0.25em] uppercase mb-4 text-center">
                S A A D E D D I N
              </div>
              
              {/* Main Discount */}
              <div className="text-center my-3">
                <span 
                  className="text-[34px] sm:text-[40px] font-bold text-[#234745] leading-none block mb-1"
                  style={{ fontFamily: isEn ? "'Bahij Janna', sans-serif" : undefined }}
                >
                  {isEn ? 'Free Delivery' : 'توصيل مجاني'}
                </span>
                <span className="text-[#666666] text-[13px]">
                  {isEn ? 'Free shipping on your next order' : 'توصيل مجاني على طلبك القادم'}
                </span>
              </div>
            </div>

            {/* Dashed divider */}
            <div className="border-t border-dashed border-gray-200 my-5" />

            {/* Bottom Row */}
            <div>
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="bg-gray-100 rounded-lg px-3 py-1.5 text-center">
                  <span className="block text-[10px] text-gray-500 uppercase font-bold">{isEn ? 'Code' : 'الرمز'}</span>
                  <span className="text-[14px] font-mono font-bold text-[#234745] tracking-widest">FreeShip</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyCode('FreeShip')}
                  className="h-[38px] px-5 bg-[#234745] hover:bg-[#1A3533] text-white font-bold text-[13px] rounded-full transition-all active:scale-95 shadow-md"
                >
                  {isEn ? 'Get Code' : 'إحصل عليه'}
                </button>
              </div>
              <div className="text-[11px] text-gray-400 text-center">
                {isEn ? 'Expires Dec 31, 2026 | Min spend 100 SAR' : 'تنتهي 31 ديسمبر 2026 | الحد الأدنى 100 ر.س'}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ─── 3. MY VOUCHERS & REDEMPTION SECTION ─────────────────────────── */}
      <section id="redeem-section" className="max-w-[1200px] mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Left Column: Use Voucher & Balance Check Box */}
          <div className="lg:col-span-5 bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-200">
            <h3 
              className="text-[20px] sm:text-[22px] font-bold text-[#234745] mb-1"
              style={{ fontFamily: isEn ? "'Bahij Janna', sans-serif" : undefined }}
            >
              {isEn ? 'Use Voucher' : 'استخدام القسيمة'}
            </h3>
            <p className="text-gray-500 text-[13px] mb-6">
              {isEn ? 'Enter the code to apply it to your cart' : 'أدخل الرمز لتطبيقه على سلّتك'}
            </p>

            {/* Voucher Code Form */}
            <form onSubmit={handleApplyVoucher} className="space-y-4 mb-6">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={voucherCodeInput}
                  onChange={(e) => setVoucherCodeInput(e.target.value)}
                  placeholder={isEn ? 'Enter Voucher Code' : 'أدخل رمز القسيمة'}
                  className="flex-1 h-[46px] px-4 rounded-xl border border-gray-300 text-[14px] focus:outline-none focus:border-[#234745]"
                />
                <button
                  type="submit"
                  className="h-[46px] px-6 bg-[#234745] hover:bg-[#1A3533] text-white font-bold text-[14px] rounded-xl transition-all"
                >
                  {isEn ? 'Apply' : 'تطبيق'}
                </button>
              </div>
              {appliedVoucherSuccess && (
                <p className="text-[12px] text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 font-medium">
                  {appliedVoucherSuccess}
                </p>
              )}
              <p className="text-[11px] text-gray-400 leading-relaxed">
                {isEn ? 'One voucher code per order | Discount applies at checkout' : 'يمكن استخدام قسيمة واحدة لكل طلب | الخصم يطبق عند إتمام الطلب'}
              </p>
            </form>

            <div className="border-t border-gray-100 pt-6">
              <h4 className="text-[15px] font-bold text-[#234745] mb-3">
                {isEn ? 'Check Balance' : 'التحقق من الرصيد'}
              </h4>
              <form onSubmit={handleCheckBalance} className="flex items-center gap-2">
                <input
                  type="text"
                  value={balanceCheckInput}
                  onChange={(e) => setBalanceCheckInput(e.target.value)}
                  placeholder={isEn ? 'Voucher Number' : 'رقم القسيمة'}
                  className="flex-1 h-[44px] px-4 rounded-xl border border-gray-300 text-[13px] focus:outline-none focus:border-[#234745]"
                />
                <button
                  type="submit"
                  className="h-[44px] px-5 bg-gray-100 hover:bg-gray-200 text-[#234745] font-bold text-[13px] rounded-xl transition-all border border-gray-300"
                >
                  {isEn ? 'Check' : 'تحقق'}
                </button>
              </form>
              {balanceResult && (
                <p className="mt-3 text-[12px] text-[#234745] bg-[#F5F3EF] p-2.5 rounded-lg border border-[#C8A464]/30 font-bold">
                  {balanceResult}
                </p>
              )}
            </div>
          </div>

          {/* Right Column: My Vouchers Wallet */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-gray-200">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <h3 
                  className="text-[20px] sm:text-[22px] font-bold text-[#234745] mb-1"
                  style={{ fontFamily: isEn ? "'Bahij Janna', sans-serif" : undefined }}
                >
                  {isEn ? 'My Vouchers' : 'قسائمي'}
                </h3>
                <p className="text-gray-500 text-[13px]">
                  {isEn ? 'Your personal voucher wallet' : 'محفظة القسائم الخاصة بك'}
                </p>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveTab('active')}
                  className={`px-4 py-1.5 text-[12px] font-bold rounded-lg transition-all ${
                    activeTab === 'active' ? 'bg-[#234745] text-white shadow-sm' : 'text-gray-600 hover:text-[#234745]'
                  }`}
                >
                  {isEn ? 'Active (1)' : 'فعالة (1)'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('used')}
                  className={`px-4 py-1.5 text-[12px] font-bold rounded-lg transition-all ${
                    activeTab === 'used' ? 'bg-[#234745] text-white shadow-sm' : 'text-gray-600 hover:text-[#234745]'
                  }`}
                >
                  {isEn ? 'Used (1)' : 'مستخدمة (1)'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('expired')}
                  className={`px-4 py-1.5 text-[12px] font-bold rounded-lg transition-all ${
                    activeTab === 'expired' ? 'bg-[#234745] text-white shadow-sm' : 'text-gray-600 hover:text-[#234745]'
                  }`}
                >
                  {isEn ? 'Expired (1)' : 'منتهية (1)'}
                </button>
              </div>
            </div>

            {/* Tab Content Cards */}
            <div className="space-y-4">
              {activeTab === 'active' && (
                <div className="flex items-center justify-between p-4 rounded-xl border border-emerald-200 bg-emerald-50/50">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-[#234745] text-[#C8A464] font-bold text-[18px] flex items-center justify-center">
                      15%
                    </div>
                    <div>
                      <h4 className="font-bold text-[#234745] text-[15px]">
                        {isEn ? '15% OFF Oriental Sweets' : 'خصم 15% . الحلويات الشرقية'}
                      </h4>
                      <p className="text-[12px] text-gray-500 font-mono">SWEETS</p>
                      <span className="text-[11px] text-emerald-700 font-medium">
                        {isEn ? 'Expires Dec 31' : 'تنتهي 31 ديسمبر'}
                      </span>
                    </div>
                  </div>
                  <Link
                    to={isEn ? '/en/cart' : '/cart'}
                    className="h-[38px] px-5 bg-[#234745] hover:bg-[#1A3533] text-white font-bold text-[13px] rounded-lg flex items-center justify-center transition-all"
                  >
                    {isEn ? 'Use Now' : 'إستخدم الآن'}
                  </Link>
                </div>
              )}

              {activeTab === 'used' && (
                <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-gray-50 opacity-75">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-[#C8A464] text-[#1A3533] font-bold text-[16px] flex items-center justify-center">
                      50 SAR
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-700 text-[15px]">
                        {isEn ? '50 SAR Gift Voucher' : 'قسيمة هدية 50 ر.س'}
                      </h4>
                      <p className="text-[12px] text-gray-400 font-mono">Gift</p>
                    </div>
                  </div>
                  <span className="text-[12px] text-gray-400 font-bold bg-gray-200 px-3 py-1 rounded-md">
                    {isEn ? 'Used' : 'مستخدمة'}
                  </span>
                </div>
              )}

              {activeTab === 'expired' && (
                <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 bg-gray-50 opacity-60">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gray-400 text-white font-bold text-[16px] flex items-center justify-center">
                      25 SAR
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-600 text-[15px]">
                        {isEn ? 'Ramadan Voucher 25 SAR' : 'قسيمة رمضان 25 ر.س'}
                      </h4>
                      <p className="text-[12px] text-gray-400 font-mono">Gift</p>
                      <span className="text-[11px] text-red-500 font-medium">
                        {isEn ? 'Expired April 2026' : 'انتهت أبريل 2026'}
                      </span>
                    </div>
                  </div>
                  <span className="text-[12px] text-red-400 font-bold bg-red-50 px-3 py-1 rounded-md">
                    {isEn ? 'Expired' : 'منتهية'}
                  </span>
                </div>
              )}
            </div>
          </div>

        </div>
      </section>

      {/* ─── 4. WHAT WOULD YOU LIKE TO DO SECTION ────────────────────────── */}
      <section className="max-w-[1200px] mx-auto px-4 pt-8 pb-12">
        <div className="text-center mb-10">
          <h2 
            className="text-[28px] sm:text-[34px] font-bold text-[#234745] mb-2"
            style={{ fontFamily: isEn ? "'Bahij Janna', sans-serif" : undefined }}
          >
            {isEn ? 'What would you like to do?' : 'ماذا تريد أن تفعل؟'}
          </h2>
          <p 
            className="text-[#666666] text-[14px] sm:text-[15px]"
            style={{ fontFamily: isEn ? "'Gotham Light', sans-serif" : undefined }}
          >
            {isEn ? 'Choose the option you want' : 'اختر الخيار الذي تريده'}
          </p>
        </div>

        {/* 2 Options Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* Option Card 1: Gift a Voucher */}
          <div className="bg-[#FAF6EE] rounded-2xl p-8 sm:p-10 border border-[#C8A464]/30 text-center flex flex-col items-center justify-between hover:shadow-md transition-all">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-[#234745] text-[#C8A464] flex items-center justify-center mb-5 shadow-inner">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 12 20 22 4 22 4 12"></polyline>
                  <rect x="2" y="7" width="20" height="5"></rect>
                  <line x1="12" y1="22" x2="12" y2="7"></line>
                  <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
                  <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
                </svg>
              </div>
              <h3 
                className="text-[22px] sm:text-[26px] font-bold text-[#234745] mb-3"
                style={{ fontFamily: isEn ? "'Bahij Janna', sans-serif" : undefined }}
              >
                {isEn ? 'Gift a Voucher' : 'أهدِ قسيمة'}
              </h3>
              <p 
                className="text-gray-600 text-[14px] leading-relaxed max-w-[420px] mb-8"
                style={{ fontFamily: isEn ? "'Gotham Light', sans-serif" : undefined }}
              >
                {isEn 
                  ? 'Send a digital gift voucher to your loved ones via email with a personalized message and choice of designs.' 
                  : 'أرسل قسيمة هدية لأي شخص عبر البريد الإلكتروني مع رسالة شخصية وتصميم اختياري'}
              </p>
            </div>
            <Link
              to={isEn ? '/en/buy-gift-card' : '/buy-gift-card'}
              className="w-full sm:w-auto h-[48px] px-10 bg-[#234745] hover:bg-[#1A3533] text-white font-bold text-[15px] rounded-full flex items-center justify-center transition-all shadow-md active:scale-98"
            >
              {isEn ? 'Gift Now' : 'إهداء الآن'}
            </Link>
          </div>

          {/* Option Card 2: Buy for Yourself */}
          <div className="bg-[#FAF6EE] rounded-2xl p-8 sm:p-10 border border-[#C8A464]/30 text-center flex flex-col items-center justify-between hover:shadow-md transition-all">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-[#C8A464] text-[#1A3533] flex items-center justify-center mb-5 shadow-inner">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="9" cy="21" r="1"></circle>
                  <circle cx="20" cy="21" r="1"></circle>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
              </div>
              <h3 
                className="text-[22px] sm:text-[26px] font-bold text-[#234745] mb-3"
                style={{ fontFamily: isEn ? "'Bahij Janna', sans-serif" : undefined }}
              >
                {isEn ? 'Buy for Yourself' : 'إشترِ لنفسك'}
              </h3>
              <p 
                className="text-gray-600 text-[14px] leading-relaxed max-w-[420px] mb-8"
                style={{ fontFamily: isEn ? "'Gotham Light', sans-serif" : undefined }}
              >
                {isEn 
                  ? 'Add balance to your account and use it anytime when shopping to easily pay for your purchases.' 
                  : 'أضف رصيد إلى حسابك واستخدمه عند التسوق في أي وقت لتسدد بها الدفعة أو التفاصيل القادمة'}
              </p>
            </div>
            <Link
              to={isEn ? '/en/buy-gift-card' : '/buy-gift-card'}
              className="w-full sm:w-auto h-[48px] px-10 border-2 border-[#234745] hover:bg-[#234745] hover:text-white text-[#234745] font-bold text-[15px] rounded-full flex items-center justify-center transition-all shadow-sm active:scale-98"
            >
              {isEn ? 'Buy Now' : 'إشترِ الآن'}
            </Link>
          </div>

        </div>
      </section>
    </div>
  );
}
