import type {CustomerFragment} from 'storefrontapi.generated';

export function AccountProfileHeader({
  customer,
  isEn,
}: {
  customer: CustomerFragment;
  isEn: boolean;
}) {
  const initials = (customer.firstName?.[0] || customer.email?.[0] || 'U').toUpperCase();
  
  return (
    <div className="relative mb-16">
      {/* Main Header Card */}
      <div className="profile-header-bg rounded-[32px] p-8 md:p-12 text-white relative overflow-hidden min-h-[280px] flex flex-col justify-center">
        {/* Background Pattern Layer */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" 
             style={{ 
               backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l30 30-30 30L0 30z' fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
               backgroundSize: '40px 40px'
             }} 
        />
        
        <div className="relative z-10 flex flex-row items-center justify-end gap-6 md:gap-10">
          {/* Identity & Stats Stack (Aligned to right of Avatar) */}
          <div className="flex flex-col items-end text-right">
            {/* Name & Meta */}
            <div className="mb-4 md:mb-6">
              <h2 className="text-[28px] md:text-[38px] font-black leading-tight text-white mb-1">
                {customer.firstName} {customer.lastName}
              </h2>
              <p className="text-[14px] md:text-[16px] text-[#B2C4C0] font-medium opacity-90">
                {customer.phone || customer.email} • {isEn ? 'Member since' : 'عضو منذ'} 2024
              </p>
            </div>

            {/* Stats Row */}
            <div className="flex items-center gap-10 md:gap-14">
              <div className="text-center">
                <p className="text-[20px] md:text-[28px] font-black leading-none text-white mb-1.5">{customer.numberOfOrders || 0}</p>
                <p className="text-[11px] md:text-[13px] text-[#B2C4C0] font-bold uppercase tracking-widest opacity-80">
                  {isEn ? 'Orders' : 'طلب'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[20px] md:text-[28px] font-black leading-none text-white mb-1.5">{customer.addresses?.nodes?.length || 0}</p>
                <p className="text-[11px] md:text-[13px] text-[#B2C4C0] font-bold uppercase tracking-widest opacity-80">
                  {isEn ? 'Addresses' : 'عنوان'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[20px] md:text-[28px] font-black leading-none text-white mb-1.5">8</p>
                <p className="text-[11px] md:text-[13px] text-[#B2C4C0] font-bold uppercase tracking-widest opacity-80">
                  {isEn ? 'Wishlist' : 'مفضلة'}
                </p>
              </div>
            </div>
          </div>

          {/* Avatar (Far Right) */}
          <div className="flex-shrink-0">
            <div className="w-[100px] h-[100px] md:w-[150px] md:h-[150px] rounded-full bg-[#B2C4C0] flex items-center justify-center text-[#234745] text-[40px] md:text-[64px] font-black shadow-2xl border-[6px] border-white/10 ring-1 ring-white/20">
              {initials}
            </div>
          </div>
        </div>
      </div>

      {/* Loyalty Points Floating Card */}
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-[92%] max-w-[1100px] bg-[#B2C4C0] rounded-[24px] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl z-20">
        <div className="flex items-center gap-4 order-2 md:order-1">
          <p className="text-[13px] md:text-[15px] text-[#234745]/70 font-bold">
            {isEn ? '60 points to get 25 SAR coupon' : '60 نقطة للحصول على كوبون 25 ر.س'}
          </p>
        </div>
        
        <div className="flex items-center gap-5 order-1 md:order-2">
          <div className="text-right">
            <p className="text-[11px] text-[#234745]/60 font-bold uppercase tracking-widest mb-1">
              {isEn ? 'Loyalty Points' : 'نقاط الولاء'}
            </p>
            <p className="text-[22px] md:text-[28px] font-black text-[#234745] leading-none">
              240 {isEn ? 'Points' : 'نقطة'}
            </p>
          </div>
          <div className="w-12 h-12 md:w-14 md:h-14 bg-white rounded-2xl flex items-center justify-center shadow-inner">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#FFD700">
              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .profile-header-bg {
          background-color: #234745;
        }
      `}} />
    </div>
  );
}
