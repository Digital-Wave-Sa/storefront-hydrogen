import { useState, useEffect } from 'react';
import { isDiscountValidForLocation, parseLocationDiscountsJSON, type DiscountLocationScope } from '~/lib/discounts';

interface LocationDiscountModalProps {
  branchId?: string | null;
  branchName?: string | null;
  region?: string | null;
  locationDiscounts?: any;
  isEn?: boolean;
}

export function LocationDiscountModal({
  branchId,
  branchName,
  region,
  locationDiscounts = [],
  isEn = false
}: LocationDiscountModalProps) {
  const [activeDiscount, setActiveDiscount] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isUserClosed, setIsUserClosed] = useState(false);

  const defaultDiscounts = [
    {
      code: 'RIYADH50',
      title: {
        ar: 'عرض فرع العليا المميز 🎉',
        en: 'Olaya Branch Special Offer 🎉'
      },
      description: {
        ar: 'احصل على خصم 50% على جميع الطلبات من فرع العليا!',
        en: 'Enjoy 50% off on all orders from Olaya Branch!'
      },
      type: 'branch' as const,
      ids: ['91178139881', '80198500503', '114186715445', 'olaya']
    },
    {
      code: 'JEDDAH20',
      title: {
        ar: 'عرض فرع الملز / جدة 🎉',
        en: 'Al Malaz / Jeddah Branch Offer 🎉'
      },
      description: {
        ar: 'خصم 20% حصري على طلبات فرع الملز / جدة',
        en: 'Exclusive 20% off on Al Malaz / Jeddah branch orders'
      },
      type: 'branch' as const,
      ids: ['91178074345', 'malaz', 'jeddah']
    }
  ];

  const parsedDiscounts = parseLocationDiscountsJSON(locationDiscounts);
  const discountsToEvaluate = parsedDiscounts.length > 0 ? parsedDiscounts : defaultDiscounts;

  useEffect(() => {
    const checkDiscount = (currentBId?: string | null, currentBName?: string | null, forceOpen = false) => {
      if (isUserClosed && !forceOpen) return;

      const targetId = currentBId || branchId;
      const targetName = currentBName || branchName;

      const matchingDiscount = discountsToEvaluate.find((d) => {
        const validById = targetId ? isDiscountValidForLocation(d, targetId, region) : false;
        const validByName = targetName ? isDiscountValidForLocation(d, targetName, region) : false;
        return validById || validByName;
      });

      if (matchingDiscount) {
        const dismissedKey = `discount_dismissed_${matchingDiscount.code || matchingDiscount.title}_${targetId || targetName}`;
        if (!forceOpen && typeof window !== 'undefined' && sessionStorage.getItem(dismissedKey)) {
          return;
        }
        setActiveDiscount(matchingDiscount);
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    };

    checkDiscount(branchId, branchName);

    const handleBranchSelected = (e: any) => {
      setIsUserClosed(false);
      const b = e.detail?.branch;
      const bId = typeof b === 'string' ? b : (b?.id || b?.branch_id);
      const bName = typeof b === 'string' ? b : (b?.name || b?.rawName || b?.nameInArabic || b?.name_in_arabic);
      checkDiscount(bId, bName, true);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('branchSelected', handleBranchSelected);
      window.addEventListener('locationChanged', handleBranchSelected);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('branchSelected', handleBranchSelected);
        window.removeEventListener('locationChanged', handleBranchSelected);
      }
    };
  }, [branchId, branchName, region, discountsToEvaluate, isUserClosed]);

  const handleClose = () => {
    setIsUserClosed(true);
    setIsOpen(false);
    if (activeDiscount && typeof window !== 'undefined') {
      const dismissedKey = `discount_dismissed_${activeDiscount.code || activeDiscount.title}_${branchId || branchName}`;
      sessionStorage.setItem(dismissedKey, 'true');
    }
  };

  if (!isOpen || !activeDiscount) return null;

  const modalTitle = typeof activeDiscount.title === 'object'
    ? (isEn ? activeDiscount.title?.en || activeDiscount.title?.ar : activeDiscount.title?.ar || activeDiscount.title?.en)
    : activeDiscount.title || (isEn ? '🎉 Exclusive Location Offer!' : `🎉 عرض خاص لـ ${branchName || 'فرعك المختار'}!`);

  const modalDesc = typeof activeDiscount.description === 'object'
    ? (isEn ? activeDiscount.description?.en || activeDiscount.description?.ar : activeDiscount.description?.ar || activeDiscount.description?.en)
    : activeDiscount.description || (isEn ? 'Special discount available for your selected delivery branch!' : 'يتوفر خصم مميز لفرع التوصيل المحدد الخاص بك!');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-[24px] max-w-[420px] w-full p-6 text-center shadow-2xl relative border border-[#BBCFCD] transform transition-all animate-scaleUp" dir={isEn ? 'ltr' : 'rtl'}>
        
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 ltr:right-4 rtl:left-4 text-gray-400 hover:text-gray-600 transition-colors rounded-full p-1 bg-gray-100 hover:bg-gray-200 cursor-pointer"
          type="button"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Gift Icon Badge */}
        <div className="w-16 h-16 bg-[#234745]/10 rounded-full flex items-center justify-center mx-auto mb-4 text-[#234745]">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 12 20 22 4 22 4 12" />
            <rect x="2" y="7" width="20" height="5" />
            <line x1="12" y1="22" x2="12" y2="7" />
            <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
            <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
          </svg>
        </div>

        {/* Title */}
        <h3 className="text-[20px] font-bold text-[#171717] mb-2" style={{ fontFamily: isEn ? 'inherit' : "'GE Dinar One', sans-serif" }}>
          {modalTitle}
        </h3>

        {/* Description */}
        <p className="text-[14px] text-[#7D7D7D] font-medium mb-6 leading-relaxed" style={{ fontFamily: isEn ? 'inherit' : "'GE Dinar One', sans-serif" }}>
          {modalDesc}
        </p>

        {/* Promo Code Box */}
        {activeDiscount.code && (
          <div className="bg-[#FEF8EB] border border-[#234745]/20 rounded-[16px] p-3 mb-6 flex items-center justify-between">
            <span className="text-[13px] font-bold text-[#7D7D7D]">{isEn ? 'Discount Code:' : 'كود الخصم:'}</span>
            <span className="font-mono text-[18px] font-extrabold text-[#234745] tracking-wider select-all">{activeDiscount.code}</span>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleClose}
          className="w-full bg-[#234745] hover:bg-[#1a3533] text-white font-bold text-[15px] py-3.5 rounded-full transition-all shadow-md active:scale-95 cursor-pointer"
          style={{ fontFamily: isEn ? 'inherit' : "'GE Dinar One', sans-serif" }}
        >
          {isEn ? 'Got it, thanks!' : 'حسناً، فهمت'}
        </button>
      </div>
    </div>
  );
}
