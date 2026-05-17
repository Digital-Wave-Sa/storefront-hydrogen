import { useOutletContext, Link } from 'react-router';
import type { CustomerFragment } from 'storefrontapi.generated';

export default function AccountDashboard() {
  const { customer } = useOutletContext<{ customer: CustomerFragment }>();
  const isEn = typeof window !== 'undefined' ? window.location.pathname.includes('/en') : false;

  return (
    <div className="space-y-6 animate-fade-in" dir={isEn ? 'ltr' : 'rtl'}>
      {/* Top Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Total Spending */}
        <div className="bg-white border border-[#f0eee9] rounded-[24px] p-8 flex flex-col items-center justify-center text-center shadow-sm">
           <div className="flex items-center gap-2 mb-2">
             <span className="text-[32px] md:text-[42px] font-black text-[#234745]">4.200</span>
             <span className="text-[20px] font-bold text-[#234745] mt-2">﷼</span>
           </div>
           <p className="text-[14px] text-gray-400 font-bold uppercase tracking-widest">
             {isEn ? 'Total Spending' : 'إجمالي الإنفاق'}
           </p>
        </div>

        {/* Total Orders */}
        <div className="bg-white border border-[#f0eee9] rounded-[24px] p-8 flex flex-col items-center justify-center text-center shadow-sm">
           <span className="text-[32px] md:text-[42px] font-black text-[#234745] mb-2">
             {customer.numberOfOrders || 0}
           </span>
           <p className="text-[14px] text-gray-400 font-bold uppercase tracking-widest">
             {isEn ? 'Total Orders' : 'إجمالي الطلبات'}
           </p>
        </div>
      </div>

      {/* Last Order Card */}
      <div className="bg-white border border-[#f0eee9] rounded-[24px] p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Status & Actions */}
          <div className="flex flex-col gap-4 w-full md:w-auto">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2.5 h-2.5 rounded-full bg-[#4ADE80] shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
              <span className="text-[14px] font-bold text-[#234745]">
                {isEn ? 'On its way to you' : 'في الطريق إليك'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-8 py-2.5 bg-[#234745] text-white rounded-full text-[14px] font-bold hover:opacity-90 transition-all">
                {isEn ? 'Reorder' : 'إعادة الطلب'}
              </button>
              <button className="px-8 py-2.5 border border-[#234745]/20 text-[#234745] rounded-full text-[14px] font-bold hover:bg-gray-50 transition-all">
                {isEn ? 'Track' : 'تتبع'}
              </button>
            </div>
          </div>

          {/* Order Details */}
          <div className="flex items-center gap-6 text-right">
            <div className="flex flex-col gap-1">
              <h3 className="text-[16px] md:text-[18px] font-black text-[#234745]">
                {isEn ? 'Last Order — #2026-SD-8847' : 'آخر طلب — #٢٠٢٦-SD-٨٨٤٧'}
              </h3>
              <p className="text-[13px] text-gray-400 font-medium">
                {isEn ? '3 Products • 865.44 SAR' : '٣ منتجات • ٨٦٥.٤٤ ر.س'}
              </p>
              <div className="flex items-center justify-end gap-1.5 mt-1">
                 <span className="text-[18px] font-black text-[#234745]">١٥٢.٥٦</span>
                 <span className="text-[12px] font-bold text-[#234745] mt-1">﷼</span>
              </div>
            </div>
            <div className="relative">
              <img 
                src="https://cdn.shopify.com/s/files/1/0809/4209/4648/files/cake-slice.jpg?v=1710400000" 
                alt="Product" 
                className="w-20 h-20 md:w-24 md:h-24 rounded-[20px] object-cover shadow-sm border border-gray-100"
              />
              <div className="absolute -top-2 -left-2 w-6 h-6 bg-[#234745] text-white rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white">
                ١
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Loyalty Points Section */}
      <div className="bg-white border border-[#f0eee9] rounded-[24px] p-6 md:p-10 shadow-sm relative overflow-hidden">
        <div className="flex flex-col gap-8">
           <div className="flex items-center justify-between">
              <div className="text-right">
                 <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mb-4">
                   {isEn ? 'Next Level' : 'المستوى التالي'}
                 </p>
                 <p className="text-[18px] md:text-[22px] font-black text-[#234745]">
                   {isEn ? '60 points remaining' : '٦٠ نقطة متبقية'}
                 </p>
              </div>
              <div className="text-right">
                 <h2 className="text-[16px] font-black text-[#234745] mb-2">
                   {isEn ? 'Loyalty Points' : 'نقاط الولاء'}
                 </h2>
                 <p className="text-[42px] md:text-[52px] font-black text-[#234745] leading-none mb-2">240</p>
                 <p className="text-[12px] text-gray-400 font-medium">
                   {isEn ? '1 Point = ~1 Halala' : '١ نقطة = ١ هللة تقريباً'}
                 </p>
              </div>
           </div>

           {/* Progress Bar */}
           <div className="relative w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="absolute top-0 right-0 h-full bg-[#234745] rounded-full transition-all duration-1000"
                style={{ width: '75%' }}
              />
              <div 
                className="absolute top-0 right-0 h-full bg-[#B2C4C0] rounded-full opacity-50"
                style={{ width: '25%' }}
              />
           </div>

           {/* History List */}
           <div className="space-y-3">
              {[
                { id: '#٢٠٢٦-SD-٨٨٤٧', points: '+٢٠ نقطة' },
                { id: '#٢٠٢٦-SD-٨٨١٢', points: '+٦٠ نقطة' }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-[#FEF8EB] rounded-[16px] hover:scale-[1.01] transition-transform cursor-default">
                  <span className="text-[14px] font-bold text-[#234745] opacity-60">
                    {item.points}
                  </span>
                  <span className="text-[14px] font-black text-[#234745]">
                    {isEn ? `Order ${item.id}` : `طلب ${item.id}`}
                  </span>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
}
