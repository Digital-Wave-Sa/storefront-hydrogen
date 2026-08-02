import { Suspense } from 'react';
import { useOutletContext, Link, useLocation, Await, Form } from 'react-router';
import type { CustomerFragment } from 'storefrontapi.generated';
import { useWishlist } from '~/context/WishlistContext';
import { SaudiRiyalSymbol } from '~/components/Price';
import { checkIsPickupOrder } from './($locale).account.orders._index';

// Currency SVG Icon provided by user
const CurrencyIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 1124.14 1256.39" className={`inline-block fill-current ${className || 'h-3.5 w-auto mb-0.5'}`}>
    <path d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z" />
    <path d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z" />
  </svg>
);

export default function AccountDashboard() {
  const { customer, walletPromise } = useOutletContext<{ customer: CustomerFragment, walletPromise: Promise<any> }>();
  const location = useLocation();
  const isEn = location.pathname.startsWith('/en');
  const localePrefix = isEn ? '/en' : '';

  const { wishlist } = useWishlist();
  const wishlistCount = wishlist?.length || 0;

  const searchParams = new URLSearchParams(location.search);
  const showOverviewOnMobile = searchParams.get('view') === 'overview';

  const totalSpending = customer?.orders?.nodes?.reduce((acc, order) => {
    return acc + (parseFloat(order.currentTotalPrice?.amount || "0"));
  }, 0) || 0;

  const bottomLinks = [
    {
      to: `${localePrefix}/account/profile`,
      label: isEn ? 'Personal Information' : 'المعلومات الشخصية',
      icon: (
        <svg width="10" height="12" viewBox="0 0 10 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4.88105 0.666667C4.43903 0.666667 4.0151 0.842261 3.70254 1.15482C3.38998 1.46738 3.21439 1.89131 3.21439 2.33333C3.21439 2.77536 3.38998 3.19928 3.70254 3.51184C4.0151 3.82441 4.43903 4 4.88105 4C5.32308 4 5.747 3.82441 6.05957 3.51184C6.37213 3.19928 6.54772 2.77536 6.54772 2.33333C6.54772 1.89131 6.37213 1.46738 6.05957 1.15482C5.747 0.842261 5.32308 0.666667 4.88105 0.666667ZM2.54772 2.33333C2.54772 2.02692 2.60807 1.7235 2.72534 1.44041C2.8426 1.15731 3.01447 0.900087 3.23114 0.683417C3.44781 0.466747 3.70503 0.294875 3.98813 0.177614C4.27122 0.0603534 4.57464 0 4.88105 0C5.18747 0 5.49089 0.0603534 5.77398 0.177614C6.05708 0.294875 6.3143 0.466747 6.53097 0.683417C6.74764 0.900087 6.91951 1.15731 7.03677 1.44041C7.15403 1.7235 7.21439 2.02692 7.21439 2.33333C7.21439 2.95217 6.96855 3.54566 6.53097 3.98325C6.09338 4.42083 5.49989 4.66667 4.88105 4.66667C4.26222 4.66667 3.66872 4.42083 3.23114 3.98325C2.79355 3.54566 2.54772 2.95217 2.54772 2.33333ZM3.12772 6.03067C2.97217 6.07067 2.81817 6.11556 2.66572 6.16533L2.02639 6.37533C1.76523 6.46036 1.52937 6.60912 1.34012 6.80815C1.15086 7.00718 1.01417 7.25023 0.942387 7.51533L0.676387 9.43533C0.616387 9.86667 0.845054 10.222 1.20705 10.3087C1.91839 10.4787 3.10772 10.6667 4.88039 10.6667C6.65372 10.6667 7.84372 10.4787 8.55505 10.3087C8.91705 10.222 9.14505 9.86667 9.08572 9.43533L8.81905 7.51533C8.74727 7.25023 8.61058 7.00718 8.42132 6.80815C8.23207 6.60912 7.99621 6.46036 7.73505 6.37533L7.09572 6.16533C6.94328 6.11511 6.7895 6.07022 6.63439 6.03067C6.51396 6.12516 6.38648 6.2103 6.25305 6.28533C5.83534 6.52529 5.36277 6.65342 4.88105 6.65733C4.30772 6.65733 3.83439 6.46867 3.50905 6.28533C3.3754 6.21033 3.24836 6.12519 3.12772 6.03067ZM3.31705 5.30067L3.44639 5.428L3.44972 5.43133L3.46572 5.446C3.48128 5.46022 3.50594 5.48067 3.53972 5.50733C3.60639 5.56067 3.70705 5.63267 3.83572 5.70467C4.09372 5.85 4.45372 5.99067 4.88039 5.99067C5.30705 5.99067 5.66705 5.85067 5.92505 5.70467C6.05623 5.63057 6.17992 5.54394 6.29439 5.446L6.31105 5.43067L6.31372 5.42867L6.44305 5.30067L6.62172 5.342C6.85105 5.39444 7.07817 5.45778 7.30305 5.532L7.94305 5.742C8.31402 5.86245 8.64851 6.07475 8.91542 6.35915C9.18234 6.64355 9.37301 6.99081 9.46972 7.36867L9.47439 7.38667L9.74505 9.344C9.84305 10.0507 9.46505 10.7773 8.70905 10.9573C7.94239 11.14 6.70039 11.3333 4.88039 11.3333C3.06039 11.3333 1.81839 11.14 1.05172 10.9573C0.295721 10.7773 -0.0822791 10.0507 0.0150543 9.344L0.286387 7.38667L0.291054 7.36867C0.387761 6.99081 0.578436 6.64355 0.84535 6.35915C1.11227 6.07475 1.44675 5.86245 1.81772 5.742L2.45772 5.532C2.68261 5.45822 2.90972 5.39489 3.13905 5.342L3.31705 5.30067Z" fill="#7D7D7D" />
        </svg>

      )
    }
  ];


  return (
    <Suspense fallback={
      <div className="py-20 text-center text-gray-500">
        {isEn ? 'Loading dashboard details...' : 'جاري تحميل تفاصيل لوحة التحكم...'}
      </div>
    }>
      <Await resolve={walletPromise}>
        {(wallet) => {
          const points = wallet?.loyaltyPoints || 0;
          const history = wallet?.history || [];

          // Simple level logic for demonstration
          const nextLevelThreshold = points < 1000 ? 1000 : points < 5000 ? 5000 : 10000;
          const remainingPoints = Math.max(0, nextLevelThreshold - points);
          const progressPercent = Math.min(100, (points / nextLevelThreshold) * 100);

          // 1. Mobile Directory Layout
          const mobileDirectory = (
            <div className="lg:hidden flex flex-col gap-6 animate-fade-in w-full">
              {/* 2x2 Grid of Cards */}
              <div className="grid grid-cols-2 gap-3.5 w-full">
                {/* Card 1: لوحة التحكم (Overview) */}
                <Link
                  to={`${localePrefix}/account?view=overview`}
                  className="bg-white border border-[#BBCFCD] rounded-[12px] p-4.5 flex flex-row justify-start gap-2 items-center text-start w-full min-h-[96px] hover:border-[#234745] transition-all relative overflow-hidden group"
                  dir={isEn ? 'ltr' : 'rtl'}
                >
                  <div className="flex-shrink-0 text-[#234745] opacity-90 group-hover:scale-105 transition-transform duration-300">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                      <rect x="3" y="3" width="7" height="7" rx="1" />
                      <rect x="14" y="3" width="7" height="7" rx="1" />
                      <rect x="14" y="14" width="7" height="7" rx="1" />
                      <rect x="3" y="14" width="7" height="7" rx="1" />
                    </svg>
                  </div>
                  <div className="flex flex-col gap-1 min-w-0">
                    <h3 className="text-[15px] md:text-[16px] font-bold text-[#234745] leading-tight select-none truncate" style={!isEn ? { fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" } : undefined}>
                      {isEn ? 'Dashboard' : 'لوحة التحكم'}
                    </h3>
                    <span className="text-[12px] md:text-[13px] font-medium text-[#9FB7AE] select-none truncate">
                      {isEn ? 'Overview' : 'نظرة عامة'}
                    </span>
                  </div>
                </Link>

                {/* Card 2: طلباتي */}
                <Link
                  to={`${localePrefix}/account/orders`}
                  className="bg-white border border-[#BBCFCD] rounded-[12px] p-4.5 flex flex-row justify-start gap-2 items-center text-start w-full min-h-[96px] hover:border-[#234745] transition-all relative overflow-hidden group"
                  dir={isEn ? 'ltr' : 'rtl'}
                >
                  <div className="flex-shrink-0 text-[#234745] opacity-90 group-hover:scale-105 transition-transform duration-300">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4H6z" />
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <path d="M16 10a4 4 0 01-8 0" />
                    </svg>
                  </div>
                  <div className="flex flex-col gap-1 min-w-0">
                    <h3 className="text-[15px] md:text-[16px] font-bold text-[#234745] leading-tight select-none truncate" style={!isEn ? { fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" } : undefined}>
                      {isEn ? 'My Orders' : 'طلباتي'}
                    </h3>
                    <span className="text-[12px] md:text-[13px] font-medium text-[#9FB7AE] select-none truncate">
                      {isEn ? `${customer?.numberOfOrders || 0} Orders` : <><span className="font-en">{(customer?.numberOfOrders || 0).toLocaleString('en-US')}</span> طلبات</>}
                    </span>
                  </div>

                </Link>

                {/* Card 3: المفضلة */}
                <Link
                  to={`${localePrefix}/account/wishlist`}
                  className="bg-white border border-[#BBCFCD] rounded-[12px] p-4.5 flex flex-row justify-start gap-2 items-center text-start w-full min-h-[96px] hover:border-[#234745] transition-all relative overflow-hidden group"
                  dir={isEn ? 'ltr' : 'rtl'}
                >

                  <div className="flex-shrink-0 text-[#234745] opacity-90 group-hover:scale-105 transition-transform duration-300">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                    </svg>
                  </div>
                  <div className="flex flex-col gap-1 min-w-0">
                    <h3 className="text-[15px] md:text-[16px] font-bold text-[#234745] leading-tight select-none truncate" style={!isEn ? { fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" } : undefined}>
                      {isEn ? 'Favorites' : 'المفضلة'}
                    </h3>
                    <span className="text-[12px] md:text-[13px] font-medium text-[#9FB7AE] select-none truncate">
                      {isEn ? `${wishlistCount} Products` : <><span className="font-en">{wishlistCount.toLocaleString('en-US')}</span> منتجات</>}
                    </span>
                  </div>
                </Link>

                {/* Card 4: عناوين التوصيل */}
                <Link
                  to={`${localePrefix}/account/addresses`}
                  className="bg-white border border-[#BBCFCD] rounded-[12px] p-4.5 flex flex-row justify-start gap-2 items-center text-start w-full min-h-[96px] hover:border-[#234745] transition-all relative overflow-hidden group"
                  dir={isEn ? 'ltr' : 'rtl'}
                >

                  <div className="flex-shrink-0 text-[#234745] opacity-90 group-hover:scale-105 transition-transform duration-300">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </div>
                  <div className="flex flex-col gap-1 min-w-0">
                    <h3 className="text-[15px] md:text-[16px] font-bold text-[#234745] leading-tight select-none truncate" style={!isEn ? { fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" } : undefined}>
                      {isEn ? 'Addresses' : 'عناوين التوصيل'}
                    </h3>
                    <span className="text-[12px] md:text-[13px] font-medium text-[#9FB7AE] select-none truncate">
                      {isEn ? `${points} Points` : <><span className="font-en">{points.toLocaleString('en-US')}</span> نقطة</>}
                    </span>
                  </div>
                </Link>
              </div>

              {/* Grouped menu list box */}
              <div className="bg-white border border-gray-200/80 rounded-[24px] px-6 py-2 shadow-sm flex flex-col w-full">
                {bottomLinks.map((item, i) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-3 !font-normal md:font-bold w-full py-4 !text-[#7D7D7D] hover:text-[#234745] transition-colors text-[16px] text-start ${i > 0 ? 'border-t border-gray-100' : ''}`}
                    style={!isEn ? { fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" } : undefined}
                  >
                    <div className="shrink-0">
                      {item.icon}
                    </div>
                    <span>{item.label}</span>
                  </Link>
                ))}

                {/* Logout Form inline */}
                <Form className="w-full" method="POST" action={isEn ? "/en/account/logout" : "/account/logout"}>
                  <button
                    type="submit"
                    className="flex items-center gap-3 w-full py-4 text-red-500 hover:text-red-600 transition-colors font-bold text-[15px] text-start border-t border-gray-100"
                    style={!isEn ? { fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" } : undefined}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-red-500/80 rotate-180">
                      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    <span>{isEn ? 'Logout' : 'تسجيل الخروج'}</span>
                  </button>
                </Form>
              </div>
            </div>
          );

          // 2. Metrics & Stats Dashboard Layout (Desktop, or Mobile when view=overview is active)
          const overviewContent = (
            <div className="space-y-6 animate-fade-in w-full" dir={isEn ? 'ltr' : 'rtl'}>
              {/* Top Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Total Spending */}
                <div className="bg-white border border-[#9FB7AE] rounded-[12px] py-8 px-4 flex flex-col items-center justify-center text-center gap-2">
                  <div className="flex items-center justify-center gap-2" dir="ltr">
                    <span className="text-[28px] md:text-[34px] font-bold text-[#234745] leading-none font-en">
                      {totalSpending.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[#234745]"><SaudiRiyalSymbol className="h-6 w-auto" /></span>
                  </div>
                  <p className="text-[14px] text-[#A6BFB9] font-medium" style={!isEn ? { fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" } : undefined}>
                    {isEn ? 'Total Spending' : 'إجمالي الإنفاق'}
                  </p>
                </div>

                {/* Total Orders */}
                <div className="bg-white border border-[#9FB7AE] rounded-[12px] py-8 px-4 flex flex-col items-center justify-center text-center gap-2">
                  <span className="text-[28px] md:text-[34px] font-bold text-[#234745] leading-none font-en">
                    {customer?.numberOfOrders ?? customer?.orders?.nodes?.length ?? 0}
                  </span>
                  <p className="text-[14px] text-[#A6BFB9] font-medium" style={!isEn ? { fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" } : undefined}>
                    {isEn ? 'Total Orders' : 'إجمالي الطلبات'}
                  </p>
                </div>
              </div>

              {/* Last Order Card */}
              {customer?.orders?.nodes?.[0] && (() => {
                const lastOrder = customer.orders.nodes[0];
                const productCount = lastOrder.lineItems?.nodes?.length || 0;
                const firstItem = lastOrder.lineItems?.nodes?.[0];
                const imageUrl = firstItem?.variant?.image?.url || "https://cdn.shopify.com/s/files/1/0809/4209/4648/files/cake-slice.jpg?v=1710400000";
                const totalAmount = lastOrder.currentTotalPrice?.amount || "0.00";
                const trackOrderNumber = lastOrder.orderNumber || ((lastOrder as any).name ? (lastOrder as any).name.replace('#', '') : null) || (lastOrder.id ? lastOrder.id.split('/').pop() : '');
                const trackUrl = isEn ? `/en/track-order/${trackOrderNumber}` : `/track-order/${trackOrderNumber}`;

                const isPickup = checkIsPickupOrder(lastOrder);

                let statusEn = isPickup ? 'Ready for Pickup' : 'Processing';
                let statusAr = isPickup ? 'جاهز للاستلام من الفرع' : 'قيد المعالجة';
                if (lastOrder.fulfillmentStatus === 'FULFILLED') {
                  statusEn = isPickup ? 'Picked up' : 'Delivered';
                  statusAr = isPickup ? 'تم الاستلام من الفرع' : 'تم التوصيل';
                } else if (lastOrder.financialStatus === 'PAID') {
                  statusEn = isPickup ? 'Ready for Pickup' : 'On its way to you';
                  statusAr = isPickup ? 'جاهز للاستلام من الفرع' : 'في الطريق إليك';
                }

                return (
                  <div className="bg-white border border-[#9FB7AE] rounded-[12px] p-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">

                      {/* Order Details (First in RTL -> Right side) */}
                      <div className="flex items-center gap-4 text-start">
                        <div className="relative flex-shrink-0">
                          <img
                            src={imageUrl}
                            alt="Product"
                            className="w-16 h-16 md:w-20 md:h-20 rounded-[12px] object-cover border border-gray-100"
                          />
                          <div className="absolute -top-2 -start-2 w-6 h-6 bg-[#234745] text-white rounded-full flex items-center justify-center text-[11px] font-bold border-2 border-white font-en">
                            {productCount.toLocaleString('en-US')}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1">
                          <h3 className="text-[16px] md:text-[18px] font-bold text-[#234745] leading-none flex items-center gap-1" style={!isEn ? { fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" } : undefined}>
                            {isEn ? `Last Order — #${lastOrder.orderNumber}` : <>آخر طلب — <span className="font-en pt-1">#{lastOrder.orderNumber}</span></>}
                          </h3>
                          <p className="text-[12px] text-[#A6BFB9] font-medium leading-tight">
                            {isEn ? `${productCount} Products` : <><span className="font-en">{productCount.toLocaleString('en-US')}</span> منتجات</>} • <span className="font-en">{parseFloat(totalAmount).toLocaleString('en-US')}</span> <SaudiRiyalSymbol className="h-3.5 w-auto inline-block ms-1" />
                          </p>
                          <div className="flex items-center justify-start gap-1.5 mt-1">
                            <span className="text-[#234745]"><SaudiRiyalSymbol className="h-4.5 w-auto" /></span>
                            <span className="text-[16px] font-bold text-[#234745] leading-none font-en">
                              {parseFloat(totalAmount).toLocaleString('en-US')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status & Actions (Second in RTL -> Left side) */}
                      <div className="flex flex-col items-end gap-3 w-full md:w-auto">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-bold text-[#234745]" style={!isEn ? { fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" } : undefined}>
                            {isEn ? statusEn : statusAr}
                          </span>
                          <div className="w-1.5 h-1.5 rounded-full bg-[#234745]" />
                        </div>
                        <div className="flex items-center gap-2">
                          <Link
                            to={trackUrl}
                            className="px-6 py-2 border border-[#234745] text-[#234745] rounded-[24px] text-[13px] font-bold hover:bg-gray-50 transition-all"
                          >
                            {lastOrder.fulfillmentStatus === 'FULFILLED'
                              ? (isEn ? 'Invoice' : 'الفاتورة')
                              : (isEn ? 'Track' : 'تتبع')}
                          </Link>
                          {(() => {
                            const reorderLines = (lastOrder.lineItems?.nodes || []).map((item: any) => {
                              const rawId = item.variant?.id || item.variantId || item.variant_id;
                              const merchandiseId = rawId && String(rawId).startsWith('gid://')
                                ? String(rawId)
                                : (rawId ? `gid://shopify/ProductVariant/${rawId}` : '');
                              return {
                                merchandiseId,
                                quantity: item.quantity || 1,
                              };
                            }).filter((l: any) => l.merchandiseId && !l.merchandiseId.endsWith('undefined') && !l.merchandiseId.endsWith('null'));

                            return (
                              <Form action={isEn ? "/en/cart" : "/cart"} method="post" className="inline-block">
                                <input
                                  type="hidden"
                                  name="cartFormInput"
                                  value={JSON.stringify({
                                    action: 'LinesAdd',
                                    inputs: { lines: reorderLines },
                                  })}
                                />
                                <button
                                  type="submit"
                                  className="px-6 py-2 bg-[#234745] text-white rounded-[24px] text-[13px] font-bold hover:opacity-90 transition-all active:scale-95 cursor-pointer"
                                  style={{ color: '#FFFFFF' }}
                                >
                                  {isEn ? 'Reorder' : 'إعادة الطلب'}
                                </button>
                              </Form>
                            );
                          })()}
                        </div>

                      </div>

                    </div>
                  </div>
                );
              })()}

              {/* Loyalty Points Section */}
              <div className="bg-white border border-[#9FB7AE] rounded-[12px] p-6 relative overflow-hidden">
                <div className="flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <div className="text-start">
                      <h2 className="text-[16px] font-bold text-[#234745] mb-2" style={!isEn ? { fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" } : undefined}>
                        {isEn ? 'Loyalty Points' : 'نقاط الولاء'}
                      </h2>
                      <p className="text-[36px] md:text-[46px] font-bold text-[#234745] leading-none mb-1 font-en">
                        {points}
                      </p>
                      <p className="text-[12px] text-[#A6BFB9] font-medium flex items-center gap-1 justify-start">
                        {isEn ? '1 Point = ~1 Halala' : <><span className="font-en pt-0.5">1</span> نقطة = <span className="font-en pt-0.5">1</span> هللة تقريباً</>}
                      </p>
                    </div>
                    <div className="text-end">
                      <p className="text-[12px] text-[#A6BFB9] font-medium mb-1">
                        {isEn ? 'Next Level' : 'المستوى التالي'}
                      </p>
                      <p className="text-[16px] md:text-[18px] font-bold text-[#234745] flex items-center gap-1 justify-end">
                        {isEn ? `${remainingPoints} points remaining` : <><span className="font-en pt-0.5">{remainingPoints}</span> نقطة متبقية</>}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="relative w-full h-3 bg-[#EAF2F1] rounded-full overflow-hidden">
                    <div
                      className="absolute top-0 right-0 h-full bg-[#234745] rounded-full transition-all duration-1000"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  {/* History List */}
                  <div className="space-y-3">
                    {!history || history.length === 0 ? (
                      <div className="text-center py-4 text-[#A6BFB9] text-[14px]">
                        {isEn ? 'No recent activity.' : 'لا يوجد نشاط حديث.'}
                      </div>
                    ) : (
                      history.slice(0, 3).map((tx: any) => {
                        const isAddition = tx.amount > 0;
                        return (
                          <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                            <div className="flex flex-col text-start">
                              <span className="text-[13px] font-bold text-[#234745]">{isEn ? tx.labelEn : tx.labelAr}</span>
                              <span className="text-[11px] text-[#A6BFB9]" dir="ltr">{new Date(tx.date).toLocaleDateString(isEn ? 'en-US' : 'ar-SA')}</span>
                            </div>
                            <div className={`font-bold text-[14px] inline-flex items-center gap-1 ${isAddition ? 'text-emerald-600' : 'text-red-500'}`} dir="ltr">
                              {isAddition ? '+' : ''}{tx.amount.toFixed(2)} <SaudiRiyalSymbol className={`h-4.5 w-auto mb-0.5 ${isAddition ? 'text-emerald-600' : 'text-red-500'}`} />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          );

          return (
            <>
              {/* Desktop Always shows Overview, Mobile shows Directory list by default, or overview metrics if view=overview parameter is present */}
              <div className="lg:block hidden w-full">
                {overviewContent}
              </div>
              <div className="lg:hidden block w-full">
                {showOverviewOnMobile ? overviewContent : mobileDirectory}
              </div>
            </>
          );
        }}
      </Await>
    </Suspense>
  );
}
