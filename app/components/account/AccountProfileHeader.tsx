import type { CustomerFragment } from 'storefrontapi.generated';
import patternBg from '/images/second-bg-pattern.svg';
import { useWishlist } from '~/context/WishlistContext';
import { useRouteLoaderData } from 'react-router';
import { getLoyaltyTierInfo } from '~/lib/loyalty-tiers';
import { LoyaltyCard } from './LoyaltyCard';

export function AccountProfileHeader({
  customer,
  isEn,
  loyaltyPoints = 0,
  balance = 0,
  wishlistCount = 0,
  loyaltyInfo,
}: {
  customer: CustomerFragment;
  isEn: boolean;
  loyaltyPoints?: number;
  balance?: number;
  wishlistCount?: number;
  loyaltyInfo?: any;
}) {
  const displayName = `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim() || customer?.email?.split('@')[0] || (isEn ? 'Valued Customer' : 'عميلنا العزيز');
  const initials = (customer?.firstName?.[0] || customer?.email?.[0] || 'C').toUpperCase();

  const forceEnDigits = (str: string | number) => {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
  };

  // Resolve Real Loyalty Membership Enrollment Date
  const rawEnrollment =
    loyaltyInfo?.activity?.card_created_date ||
    loyaltyInfo?.enrollmentDate ||
    customer?.createdAt;

  let formattedJoinDate = '';
  if (rawEnrollment) {
    if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(rawEnrollment)) {
      const parts = rawEnrollment.split(/[\/\s]/);
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const parsedDate = new Date(year, month, day);
      formattedJoinDate = isNaN(parsedDate.getTime())
        ? forceEnDigits(rawEnrollment)
        : forceEnDigits(
            parsedDate.toLocaleDateString(
              isEn ? 'en-US' : 'ar-SA-u-nu-latn-ca-gregory',
              {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              },
            ),
          );
    } else {
      const dObj = new Date(rawEnrollment);
      formattedJoinDate = isNaN(dObj.getTime())
        ? forceEnDigits(rawEnrollment)
        : forceEnDigits(
            dObj.toLocaleDateString(
              isEn ? 'en-US' : 'ar-SA-u-nu-latn-ca-gregory',
              {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              },
            ),
          );
    }
  } else {
    formattedJoinDate = forceEnDigits(
      new Date().toLocaleDateString(
        isEn ? 'en-US' : 'ar-SA-u-nu-latn-ca-gregory',
        {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        },
      ),
    );
  }

  const rootData = useRouteLoaderData('root') as any;
  const tierInfo = getLoyaltyTierInfo(
    loyaltyPoints,
    loyaltyInfo?.tierName || loyaltyInfo?.tier?.name,
  );

  return (
    <div className="relative mb-8 w-full">
      {/* Main Header Card */}
      <div className="profile-header-bg py-4 px-4 md:px-12 text-white relative overflow-hidden flex flex-col justify-center shadow-lg w-full" style={{ backgroundColor: '#2C4A47' }}>
        {/* Background Pattern Layer */}
        <div className="absolute inset-0 pointer-events-none bg-[length:950px_800px] md:bg-[length:1900px_2000px]"
          style={{
            backgroundImage: `url(${patternBg})`,
            backgroundPosition: 'center center',
            backgroundRepeat: 'no-repeat',
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
                <div className="flex items-center gap-2 flex-wrap">
                  <h2
                    className="text-[18px] md:text-[26px] font-bold leading-tight text-[#FEF8EB] !mb-0 !mt-0 truncate"
                    style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}
                  >
                    {displayName}
                  </h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-[12px] font-bold border flex items-center gap-1.5 shadow-sm ${tierInfo.tier.badgeBg} ${tierInfo.tier.badgeTextColor} ${tierInfo.tier.badgeBorderColor}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                    </svg>
                    <span>{isEn ? tierInfo.tier.levelTitleEn : tierInfo.tier.levelTitleAr}</span>
                  </span>
                </div>
                <p
                  className="text-[14px] md:text-[18px] text-[#9FB7AE] font-medium flex gap-1 flex-wrap !m-0 items-center"
                  style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                >
                  <span dir="ltr" className="truncate max-w-[120px] md:max-w-none font-en">{forceEnDigits(customer.phone || customer.email)}</span>
                  <span>•</span>
                  <span className="whitespace-nowrap">
                    {isEn ? 'Loyalty Member since ' : 'عضو ولاء منذ '}
                    <span className="font-en">{formattedJoinDate}</span>
                  </span>
                </p>
              </div>

              {/* Stats Row */}
              <div className="flex items-center justify-start gap-8 md:justify-start w-full md:w-auto gap-2 md:gap-14 mt-1">
                <div className="text-center">
                  <p className="text-[14px] md:text-[22px] font-bold leading-none text-white mb-1 md:mb-2 font-en">{forceEnDigits(Math.max(Number(customer.numberOfOrders) || 0, customer.orders?.nodes?.length || 0))}</p>
                  <p className="text-[12px] md:text-[12px] text-[#9FB7AE] font-normal opacity-90">
                    {isEn ? 'Orders' : 'طلب'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[16px] md:text-[22px] font-bold leading-none text-white mb-1 md:mb-2 font-en">{forceEnDigits(customer.addresses?.nodes?.length || 0)}</p>
                  <p className="text-[10px] md:text-[12px] text-[#A6BFB9] font-medium opacity-90">
                    {isEn ? 'Addresses' : 'عنوان'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[16px] md:text-[22px] font-bold leading-none text-white mb-1 md:mb-2 font-en">{forceEnDigits(wishlistCount || 0)}</p>
                  <p className="text-[10px] md:text-[12px] text-[#A6BFB9] font-medium opacity-90">
                    {isEn ? 'Wishlist' : 'مفضلة'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 2-Column Grid: Column 1 = Soft Teal Points Card | Column 2 = Luxury Tier Badge Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 w-full mt-2 z-20">
            
            {/* Column 1: Points Card (Soft Teal Bar matching user screenshot) */}
            <div className="bg-[#A6BFB9] rounded-[16px] p-4 md:p-5 flex items-center justify-between shadow-md transition-all h-full">
              <div className="text-start">
                <p className="text-[11px] md:text-[12px] text-[#234745] font-bold mb-1 opacity-90">
                  {isEn ? 'All Earned Points' : 'مجموع النقاط المكتسبة'}
                </p>
                <div className="text-[22px] md:text-[26px] font-extrabold text-[#1B3836] leading-none flex items-center gap-1.5 font-en">
                  <span>{loyaltyPoints.toLocaleString('en-US')}</span>
                  <span className="text-[13px] md:text-[14px] font-bold text-[#234745]">{isEn ? 'Points' : 'نقطة'}</span>
                </div>
              </div>
              <div className="w-11 h-11 md:w-13 md:h-13 rounded-full bg-white/30 flex items-center justify-center flex-shrink-0 shadow-xs">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#FFC107" className="drop-shadow-xs">
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
              </div>
            </div>

            {/* Column 2: Luxury Tier Badge Card */}
            <LoyaltyCard loyaltyPoints={loyaltyPoints} isEn={isEn} className="!my-0 shadow-md" />

          </div>

        </div>
      </div>
    </div>
  );
}
