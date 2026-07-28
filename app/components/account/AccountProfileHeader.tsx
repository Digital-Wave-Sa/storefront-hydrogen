import type { CustomerFragment } from 'storefrontapi.generated';
import patternBg from '/images/second-bg-pattern.svg';
import { useWishlist } from '~/context/WishlistContext';
import { useRouteLoaderData } from 'react-router';

export function AccountProfileHeader({
  customer,
  isEn,
  loyaltyPoints = 0,
  balance = 0,
  wishlistCount = 0,
}: {
  customer: CustomerFragment;
  isEn: boolean;
  loyaltyPoints?: number;
  balance?: number;
  wishlistCount?: number;
}) {
  const initials = (customer.firstName?.[0] || customer.email?.[0] || 'U').toUpperCase();
  const joinYear = customer.createdAt ? new Date(customer.createdAt).getFullYear() : new Date().getFullYear();
  const rootData = useRouteLoaderData('root') as any;

  return (
    <div className="relative mb-8 w-full">
      {/* Main Header Card */}
      <div className="profile-header-bg py-4 px-4 md:px-12 text-white relative overflow-hidden flex flex-col justify-center shadow-lg w-full" style={{ backgroundColor: '#2C4A47' }}>
        {/* Background Pattern Layer */}
        <div className="absolute inset-0 pointer-events-none bg-[length:1800px_900px] md:bg-cover"
          style={{
            backgroundImage: `url(${patternBg})`,
            backgroundPosition: 'center center',
            backgroundSize: '1400px 2800px'
          }}
        />

        <div className="max-w-[1200px] mx-auto w-full relative z-10 flex flex-col gap-6 md:gap-8">

          {/* Top Row: Avatar and Identity */}
          <div className="flex items-center justify-start gap-4 md:gap-10 w-full">
            {/* Avatar (First in HTML -> Left in LTR, Right in RTL) */}
            <div className="flex-shrink-0">
              <div className="w-[70px] h-[70px] md:w-[120px] md:h-[120px] bg-[#B2D0C9] rounded-full flex items-center justify-center text-[#234745] font-bold text-[28px] md:text-[54px] shadow-sm">
                {initials}
              </div>
            </div>

            {/* Identity & Stats Stack */}
            <div className="flex flex-col items-start text-start flex-1 min-w-0">

              {/* Name & Meta */}
              <div className="mb-2 md:mb-3 flex flex-col gap-1 w-full">
                <h2
                  className="text-[18px] md:text-[26px] font-bold leading-tight text-[#FEF8EB] !mb-0 !mt-0 truncate w-full"
                  style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}
                >
                  {customer.firstName} {customer.lastName}
                </h2>
                <p
                  className="text-[14px] md:text-[18px] text-[#9FB7AE] font-medium flex gap-1 flex-wrap !m-0 items-center"
                  style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                >
                  <span dir="ltr" className="truncate max-w-[120px] md:max-w-none font-en">{customer.phone || customer.email}</span>
                  <span>•</span>
                  <span className="whitespace-nowrap">
                    {isEn ? 'Member since ' : 'عضو منذ '}
                    <span className="font-en">{joinYear}</span>
                  </span>
                </p>
              </div>

              {/* Stats Row */}
              <div className="flex items-center justify-start gap-8 md:justify-start w-full md:w-auto gap-2 md:gap-14 mt-1">
                <div className="text-center">
                  <p className="text-[14px] md:text-[22px] font-bold leading-none text-white mb-1 md:mb-2 font-en">{customer.numberOfOrders ?? customer.orders?.nodes?.length ?? 0}</p>
                  <p className="text-[12px] md:text-[12px] text-[#9FB7AE] font-normal opacity-90">
                    {isEn ? 'Orders' : 'طلب'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[16px] md:text-[22px] font-bold leading-none text-white mb-1 md:mb-2 font-en">{customer.addresses?.nodes?.length || 0}</p>
                  <p className="text-[10px] md:text-[12px] text-[#A6BFB9] font-medium opacity-90">
                    {isEn ? 'Addresses' : 'عنوان'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[16px] md:text-[22px] font-bold leading-none text-white mb-1 md:mb-2 font-en">{wishlistCount || 0}</p>
                  <p className="text-[10px] md:text-[12px] text-[#A6BFB9] font-medium opacity-90">
                    {isEn ? 'Wishlist' : 'مفضلة'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Loyalty Points Card (Inside the header flow) */}
          <div className="w-full bg-[#A6BFB9] rounded-[12px] md:rounded-[16px] p-3 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4 shadow-sm z-20">

            {/* Points & Star Group (Left in LTR, Right in RTL) */}
            <div className="flex items-center gap-3 md:gap-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#FFC107" className="flex-shrink-0 md:w-7 md:h-7">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
              <div className="text-start">
                <p className="text-[10px] md:text-[11px] text-[#335653] font-bold mb-0.5">
                  {rootData?.env?.PUBLIC_SMILE_CHANNEL_KEY ? (isEn ? 'Smile Rewards' : 'مكافآت Smile') : (isEn ? 'Loyalty Points' : 'نقاط الولاء')}
                </p>
                <div className="text-[16px] md:text-[22px] font-bold text-[#234745] leading-none flex gap-1">
                  {rootData?.env?.PUBLIC_SMILE_CHANNEL_KEY ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== 'undefined' && (window as any).Smile) {
                          (window as any).Smile.show();
                        } else {
                          alert(isEn
                            ? "Smile.io widget is loading or not active yet. Please verify your PUBLIC_SMILE_CHANNEL_KEY."
                            : "أداة Smile.io قيد التحميل أو غير نشطة بعد. يرجى التحقق من مفتاح PUBLIC_SMILE_CHANNEL_KEY."
                          );
                        }
                      }}
                      className="underline text-[12px] md:text-[14px] hover:text-[#1a3533] transition-colors"
                    >
                      {isEn ? 'Open Rewards Panel' : 'فتح لوحة المكافآت'}
                    </button>
                  ) : (
                    <>
                      <span className="font-en">{loyaltyPoints}</span> <span>{isEn ? 'Points' : 'نقطة'}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 60 points text (Right in LTR, Left in RTL) */}
            <div className="flex items-center md:text-end w-full md:w-auto border-t md:border-t-0 border-[#8fa8a2] md:border-transparent pt-2 md:pt-0">
              <p className="text-[11px] md:text-[14px] text-[#335653] font-bold leading-snug">
                {rootData?.env?.PUBLIC_SMILE_CHANNEL_KEY ? (
                  isEn ? 'Earn points and get rewards on every purchase!' : 'اكسب نقاطاً واحصل على مكافآت مع كل عملية شراء!'
                ) : (
                  isEn ? (
                    <>
                      <span className="font-en">60</span> points to get a <span className="font-en">25</span> SAR coupon
                    </>
                  ) : (
                    <>
                      <span className="font-en">60</span> نقطة للحصول على كوبون <span className="font-en">25</span> ر.س
                    </>
                  )
                )}
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
