import { useOutletContext, Link, useLocation } from 'react-router';
import type { CustomerFragment } from 'storefrontapi.generated';

// Currency SVG Icon provided by user
const CurrencyIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 1124.14 1256.39" className={`inline-block fill-current ${className || 'h-3.5 w-auto mb-0.5'}`}>
    <path d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z" />
    <path d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z" />
  </svg>
);

export default function AccountDashboard() {
  const { customer } = useOutletContext<{ customer: CustomerFragment }>();
  const location = useLocation();
  const isEn = location.pathname.startsWith('/en');

  return (
    <div className="space-y-6 animate-fade-in" dir={isEn ? 'ltr' : 'rtl'}>
      {/* Top Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Total Spending */}
        <div className="bg-white border border-[#9FB7AE] rounded-[12px] py-8 px-4 flex flex-col items-center justify-center text-center gap-2">
           <div className="flex items-center justify-center gap-2" dir="ltr">
             <span className="text-[28px] md:text-[34px] font-bold text-[#234745] leading-none font-en">
               4,200
             </span>
             <span className="text-[#234745]"><CurrencyIcon className="h-6 w-auto" /></span>
           </div>
           <p className="text-[14px] text-[#A6BFB9] font-medium" style={!isEn ? { fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" } : undefined}>
             {isEn ? 'Total Spending' : 'إجمالي الإنفاق'}
           </p>
        </div>

        {/* Total Orders */}
        <div className="bg-white border border-[#9FB7AE] rounded-[12px] py-8 px-4 flex flex-col items-center justify-center text-center gap-2">
           <span className="text-[28px] md:text-[34px] font-bold text-[#234745] leading-none font-en">
             {customer.numberOfOrders || 12}
           </span>
           <p className="text-[14px] text-[#A6BFB9] font-medium" style={!isEn ? { fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" } : undefined}>
             {isEn ? 'Total Orders' : 'إجمالي الطلبات'}
           </p>
        </div>
      </div>

      {/* Last Order Card */}
      {customer.orders?.nodes?.[0] && (() => {
        const lastOrder = customer.orders.nodes[0];
        const productCount = lastOrder.lineItems?.nodes?.length || 0;
        const firstItem = lastOrder.lineItems?.nodes?.[0];
        const imageUrl = firstItem?.variant?.image?.url || "https://cdn.shopify.com/s/files/1/0809/4209/4648/files/cake-slice.jpg?v=1710400000";
        const totalAmount = lastOrder.currentTotalPrice?.amount || "0.00";
        const orderIdEncoded = encodeURIComponent(lastOrder.id);
        
        let statusEn = 'Processing';
        let statusAr = 'قيد المعالجة';
        if (lastOrder.fulfillmentStatus === 'FULFILLED') {
           statusEn = 'Delivered';
           statusAr = 'تم التوصيل';
        } else if (lastOrder.financialStatus === 'PAID') {
           statusEn = 'On its way to you';
           statusAr = 'في الطريق إليك';
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
                    {isEn ? `${productCount} Products` : <><span className="font-en">{productCount.toLocaleString('en-US')}</span> منتجات</>} • <span className="font-en">{parseFloat(totalAmount).toLocaleString('en-US')}</span> <CurrencyIcon className="h-3 w-auto inline-block ms-1" />
                  </p>
                  <div className="flex items-center justify-start gap-1.5 mt-1">
                     <span className="text-[#234745]"><CurrencyIcon className="h-4 w-auto" /></span>
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
                    to={isEn ? `/en/account/orders/${orderIdEncoded}` : `/account/orders/${orderIdEncoded}`}
                    className="px-6 py-2 border border-[#234745] text-[#234745] rounded-[24px] text-[13px] font-bold hover:bg-gray-50 transition-all"
                  >
                    {isEn ? 'Track' : 'تتبع'}
                  </Link>
                  <Link 
                    to={isEn ? `/en/account/orders/${orderIdEncoded}` : `/account/orders/${orderIdEncoded}`}
                    className="px-6 py-2 bg-[#234745] text-white rounded-[24px] text-[13px] font-bold hover:opacity-90 transition-all"
                    style={{ color: '#FFFFFF' }}
                  >
                    {isEn ? 'Reorder' : 'إعادة الطلب'}
                  </Link>
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
                   0
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
                   {isEn ? '300 points remaining' : <><span className="font-en pt-0.5">300</span> نقطة متبقية</>}
                 </p>
              </div>
           </div>

           {/* Progress Bar */}
           <div className="relative w-full h-3 bg-[#EAF2F1] rounded-full overflow-hidden">
              <div 
                className="absolute top-0 right-0 h-full bg-[#234745] rounded-full transition-all duration-1000"
                style={{ width: '0%' }}
              />
           </div>

           {/* History List */}
           <div className="space-y-3">
              <div className="text-center py-4 text-[#A6BFB9] text-[14px]">
                 {isEn ? 'No recent activity.' : 'لا يوجد نشاط حديث.'}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
