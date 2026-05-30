import type {CustomerFragment} from 'storefrontapi.generated';
import patternBg from '~/assets/patteren-collection-header.svg';
import { useWishlist } from '~/context/WishlistContext';

export function AccountProfileHeader({
  customer,
  isEn,
  loyaltyPoints = 0,
  balance = 0,
}: {
  customer: CustomerFragment;
  isEn: boolean;
  loyaltyPoints?: number;
  balance?: number;
}) {
  const { wishlist } = useWishlist();
  const initials = (customer.firstName?.[0] || customer.email?.[0] || 'U').toUpperCase();
  const joinYear = customer.createdAt ? new Date(customer.createdAt).getFullYear() : new Date().getFullYear();
  
  return (
    <div className="relative mb-8 w-full">
      {/* Main Header Card */}
      <div className="profile-header-bg py-4 px-4 md:px-12 text-white relative overflow-hidden flex flex-col justify-center shadow-lg w-full" style={{ backgroundColor: '#2C4A47' }}>
        {/* Background Pattern Layer */}
        <div className="absolute inset-0 pointer-events-none" 
             style={{ 
               backgroundImage: `url(${patternBg})`,
               backgroundSize: 'cover',
               backgroundPosition: 'center center'
             }} 
        />
        
        <div className="max-w-[1200px] mx-auto w-full relative z-10 flex flex-col gap-6 md:gap-8">
          
          {/* Top Row: Avatar and Identity */}
          <div className="flex items-center justify-start gap-6 md:gap-10">
            {/* Avatar (First in HTML -> Left in LTR, Right in RTL) */}
            <div className="flex-shrink-0">
              <div className="w-[80px] h-[80px] md:w-[120px] md:h-[120px] bg-[#B2D0C9] rounded-full flex items-center justify-center text-[#234745] font-bold text-[32px] md:text-[54px] shadow-sm">
                {initials}
              </div>
            </div>

            {/* Identity & Stats Stack */}
            <div className="flex flex-col items-start text-start">
              
              {/* Name & Meta */}
            <div className="mb-2 md:mb-3 flex flex-col gap-1">
              <h2 
                className="text-[26px] font-bold leading-none text-white !mb-0 !mt-0"
                style={{ fontFamily: '"Bahij Janna", sans-serif' }}
              >
                {customer.firstName} {customer.lastName}
              </h2>
              <p 
                className="text-[18px] text-[#A6BFB9] font-medium leading-none flex gap-1 flex-wrap !m-0 items-center"
                style={{ fontFamily: '"GE Dinar One", sans-serif' }}
              >
                <span dir="ltr">{customer.phone || customer.email}</span>
                <span>•</span>
                <span>{isEn ? `Member since ${joinYear}` : `عضو منذ ${joinYear}`}</span>
              </p>
            </div>

              {/* Stats Row */}
              <div className="flex items-center justify-start gap-10 md:gap-14">
                <div className="text-center">
                  <p className="text-[18px] md:text-[22px] font-bold leading-none text-white mb-2">{customer.numberOfOrders || 0}</p>
                  <p className="text-[11px] md:text-[12px] text-[#A6BFB9] font-medium opacity-90">
                    {isEn ? 'Orders' : 'طلب'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[18px] md:text-[22px] font-bold leading-none text-white mb-2">{customer.addresses?.nodes?.length || 0}</p>
                  <p className="text-[11px] md:text-[12px] text-[#A6BFB9] font-medium opacity-90">
                    {isEn ? 'Addresses' : 'عنوان'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[18px] md:text-[22px] font-bold leading-none text-white mb-2">{wishlist?.length || 0}</p>
                  <p className="text-[11px] md:text-[12px] text-[#A6BFB9] font-medium opacity-90">
                    {isEn ? 'Wishlist' : 'مفضلة'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Loyalty Points Card (Inside the header flow) */}
          <div className="w-full bg-[#A6BFB9] rounded-[12px] md:rounded-[16px] p-4 md:p-6 flex flex-row items-center justify-between gap-4 shadow-sm z-20">
            
            {/* Points & Star Group (Left in LTR, Right in RTL) */}
            <div className="flex items-center gap-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="#FFC107" className="flex-shrink-0">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
              <div className="text-start">
                <p className="text-[10px] md:text-[11px] text-[#335653] font-bold mb-0.5">
                  {isEn ? 'Loyalty Points' : 'نقاط الولاء'}
                </p>
                <p className="text-[18px] md:text-[22px] font-bold text-[#234745] leading-none flex gap-1">
                  <span>{loyaltyPoints}</span> <span>{isEn ? 'Points' : 'نقطة'}</span>
                </p>
              </div>
            </div>

            {/* 60 points text (Right in LTR, Left in RTL) */}
            <div className="flex items-center gap-4 text-end">
              <p className="text-[12px] md:text-[14px] text-[#335653] font-medium max-w-[200px] leading-snug">
                {isEn 
                  ? '60 points to get a 25 SAR coupon' 
                  : '60 نقطة للحصول على كوبون 25 ر.س'
                }
              </p>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
