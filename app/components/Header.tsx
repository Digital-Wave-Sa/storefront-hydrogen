import { Await, NavLink, useMatches, Form, useLocation, useFetcher, useRouteLoaderData } from 'react-router';
import React, { Suspense, useState, useEffect } from 'react';
import type { HeaderQuery, CartApiQueryFragment } from 'storefrontapi.generated';
import { Button } from './layout/Button';
import { DeliveryPickupModal } from './DeliveryPickupModal';
import { useAside } from '~/components/Aside';
import { useI18n } from '~/lib/i18n';
import { GlobalSearchBar } from './GlobalSearchBar';
import { useWishlist } from '~/context/WishlistContext';

type HeaderProps = {
  header: HeaderQuery;
  cart: Promise<CartApiQueryFragment | null>;
  isLoggedIn: Promise<boolean>;
  locations?: Promise<any>;
  customer?: Promise<any>;
  locale?: string;
  googleMapsKey?: string;
  selectedLocationId?: string;
  selectedLocationName?: string;
  selectedAddressName?: string;
  fulfillmentType?: 'delivery' | 'pickup';
  publicStoreDomain?: string;
  megaMenuData?: any;
};
type Viewport = 'desktop' | 'mobile';

// ─── MAIN HEADER ────────────────────────────────────────────────────────────
export function Header({ header, isLoggedIn, cart, locations, customer, locale, googleMapsKey, selectedLocationId, selectedLocationName, selectedAddressName, fulfillmentType, megaMenuData }: HeaderProps) {
  const { shop, menu } = header;
  const location = useLocation();
  const isEn = location.pathname.startsWith('/en');
  const fetcher = useFetcher();
  const locationFetcher = useFetcher();

  const handleSelectBranch = async (branch: any, type: 'delivery' | 'pickup', addressName?: string, isOutOfRange?: boolean, fullAddress?: any) => {
    const branchName = branch?.name || 'Main';
    const branchId = branch?.id || '';
    const customBranchId = branch?.branch_id || '';
    const axStoreId = branch?.ax_store_id || '';

    // Update cart attributes
    const attributes = [
      { key: 'Branch', value: branchName },
      { key: 'Branch ID', value: customBranchId || branchId },
      { key: 'Fulfillment Type', value: type === 'delivery' ? 'Delivery' : 'Pickup' }
    ];

    if (customBranchId) {
      attributes.push({ key: 'custom.branch_id', value: customBranchId });
      attributes.push({ key: 'branch_id', value: customBranchId });
    }

    if (addressName) {
      attributes.push({ key: 'Delivery Address', value: addressName });
    }

    if (isOutOfRange) {
      attributes.push({ key: 'error', value: isEn ? 'Your address is outside our delivery range. You may not be able to complete checkout.' : 'عنوانك خارج نطاق التوصيل. قد لا تتمكن من إتمام الطلب.' });
    } else {
      attributes.push({ key: 'error', value: '' }); // clear error
    }

    if (type === 'delivery') {
      const calculatedFee = (typeof branch?.deliveryFee === 'number' && branch.deliveryFee > 0)
        ? branch.deliveryFee
        : (typeof branch?.baseDeliveryFee === 'number' && branch.baseDeliveryFee > 0)
          ? branch.baseDeliveryFee
          : (typeof branch?.delivery_fee === 'number' && branch.delivery_fee > 0)
            ? branch.delivery_fee
            : 30;
      attributes.push({ key: 'Delivery Fee', value: calculatedFee.toString() });
    }

    if (typeof branch?.freeDeliveryThreshold === 'number' && branch.freeDeliveryThreshold > 0 && branch.freeDeliveryThreshold !== 300) {
      attributes.push({ key: 'Free Delivery Threshold', value: branch.freeDeliveryThreshold.toString() });
    }

    if (typeof branch?.minOrder === 'number') {
      attributes.push({ key: 'Minimum Order Value', value: branch.minOrder.toString() });
    }

    if (branch?.timeSlots) {
      attributes.push({ key: 'Available Time Slots', value: branch.timeSlots });
    }

    // Update Buyer Identity for Pickup skip and Delivery Pre-fill
    let buyerIdentity = undefined;
    const resolvedCustomer = await customer;

    if (type === 'pickup' && branch) {
      buyerIdentity = {
        email: resolvedCustomer?.email || undefined,
        deliveryAddressPreferences: [{
          deliveryAddress: {
            address1: branch.address || 'Address',
            city: branch.city || 'City',
            country: 'SA',
            firstName: resolvedCustomer?.firstName || 'Guest',
            lastName: resolvedCustomer?.lastName || 'User'
          }
        }]
      };
    } else if (type === 'delivery' && fullAddress) {
      buyerIdentity = {
        email: resolvedCustomer?.email || undefined,
        deliveryAddressPreferences: [{
          deliveryAddress: {
            address1: fullAddress.address1 || 'Address',
            address2: fullAddress.address2 || '',
            city: fullAddress.city || 'City',
            country: fullAddress.countryCodeV2 || fullAddress.countryCode ||
              (fullAddress.country?.includes('Emirates') || fullAddress.country?.includes('الإمارات') ? 'AE' :
                (fullAddress.country?.includes('Saudi') || fullAddress.country?.includes('السعودية') ? 'SA' :
                  (fullAddress.country || 'SA'))),
            firstName: fullAddress.firstName || resolvedCustomer?.firstName || 'Guest',
            lastName: fullAddress.lastName || resolvedCustomer?.lastName || 'User',
            phone: fullAddress.phone || resolvedCustomer?.phone || '',
            zip: fullAddress.zip || ''
          }
        }]
      };
    }

    // Update session location and sync cart in one request to prevent race conditions
    const locFormData = new FormData();
    locFormData.append('locationId', branchId);
    locFormData.append('branchName', branchName);
    locFormData.append('fulfillmentType', type);
    locFormData.append('manualLocationSelection', 'true');
    locFormData.append('attributes', JSON.stringify(attributes));
    if (customBranchId) {
      locFormData.append('customBranchId', customBranchId);
    }
    if (axStoreId) {
      locFormData.append('axStoreId', axStoreId);
    }
    if (buyerIdentity) {
      locFormData.append('buyerIdentity', JSON.stringify(buyerIdentity));
    }
    if (addressName) {
      locFormData.append('addressName', addressName);
    }
    locationFetcher.submit(locFormData, { method: 'POST', action: '/api/location-id' });
  };

  const [activeMega, setActiveMega] = useState<string | null>(null);

  return (
    <header
      className={`w-full ${isEn ? 'font-en' : 'font-ar'} bg-[#FEF8EB] sticky top-0 z-50 shadow-sm`}
      dir={isEn ? 'ltr' : 'rtl'}
      onMouseLeave={() => setActiveMega(null)}
    >
      <TopBar
        locale={locale}
        locations={locations}
        customer={customer}
        googleMapsKey={googleMapsKey}
        selectedLocationName={selectedLocationName}
        selectedAddressName={selectedAddressName}
        selectedLocationId={selectedLocationId}
        fulfillmentType={fulfillmentType}
        onSelectBranch={handleSelectBranch}
      />
      <MiddleBar
        isLoggedIn={isLoggedIn}
        cart={cart}
        locale={locale}
        menu={menu}
        activeMega={activeMega}
        setActiveMega={setActiveMega}
      />

      {/* FULL WIDTH MEGA MENU */}
      <div
        className={`absolute top-full left-0 w-full transition-all duration-300 origin-top z-[60] 
          ${activeMega ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'}`}
      >
        {activeMega === 'products' && (
          <ProductMegaMenu
            locale={locale}
            megaMenuData={megaMenuData}
            onClose={() => setActiveMega(null)}
          />
        )}
      </div>
    </header>
  );
}

function TopBar({
  locale,
  locations,
  customer,
  googleMapsKey,
  selectedLocationName,
  selectedAddressName,
  selectedLocationId,
  fulfillmentType,
  onSelectBranch
}: {
  locale?: string,
  locations?: Promise<any>,
  customer?: Promise<any>,
  googleMapsKey?: string,
  selectedLocationName?: string,
  selectedAddressName?: string,
  selectedLocationId?: string,
  fulfillmentType?: string,
  onSelectBranch: any
}) {
  const isEn = locale === 'en';
  const location = useLocation();
  const [modalOpen, setModalOpen] = useState(false);
  const [currentPromoIndex, setCurrentPromoIndex] = useState(0);

  const [branches, setBranches] = useState<any[]>([]);
  const [isOpenBranch, setIsOpenBranch] = useState(true);

  // Prevent unwanted auto-popup on every page load / navigation
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const isDeclaredSession = sessionStorage.getItem('declaredLocation') === 'true';
      const isDeclaredLocal = localStorage.getItem('declaredLocation') === 'true';
      if (isDeclaredSession || isDeclaredLocal) return;

      // Mark declaredLocation in sessionStorage so it doesn't nag across page reloads/navigations
      sessionStorage.setItem('declaredLocation', 'true');
    } catch (e) {}
  }, []);

  // 1. Resolve locations promise or use direct object
  useEffect(() => {
    let cancelled = false;
    if (locations) {
      if (typeof (locations as any).then === 'function') {
        locations.then((data: any) => {
          if (cancelled) return;
          const nodes = data?.locations?.nodes || data?.locations || [];
          if (nodes.length > 0) setBranches(nodes);
        }).catch(() => { });
      } else {
        const nodes = (locations as any)?.locations?.nodes || (locations as any)?.locations || [];
        if (nodes.length > 0) setBranches(nodes);
      }
    }
    
    fetch('/api/locations-meta')
      .then(res => res.json())
      .then((data: any) => {
        if (!cancelled && data?.locations?.length > 0) {
          setBranches(data.locations);
        }
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [locations]);

  // 2. Compute branch open status dynamically
  useEffect(() => {
    if (!selectedLocationId || !branches.length) {
      setIsOpenBranch(true); // default open if not loaded
      return;
    }
    const activeBranchNode = branches.find((b: any) => b.id === selectedLocationId);
    if (!activeBranchNode) return;

    const checkOpenStatus = () => {
      const getMetaVal = (key: string) => {
        return activeBranchNode[key]?.value || activeBranchNode.metafields?.find((m: any) => m?.key === key)?.value;
      };

      let riyadhDay = 'Sun';
      try {
        riyadhDay = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Riyadh',
          weekday: 'short'
        }).format(new Date());
      } catch (e) { }

      let targetFromKey = 'working_hours_from';
      let targetToKey = 'working_hours_to';
      if (riyadhDay === 'Sun') {
        targetFromKey = 'sunday_working_hours_from';
        targetToKey = 'sunday_working_hours_to';
      } else if (riyadhDay === 'Mon') {
        targetFromKey = 'monday_working_hours_from';
        targetToKey = 'monday_working_hours_to';
      } else if (riyadhDay === 'Tue') {
        targetFromKey = 'tuesday_working_hours_from';
        targetToKey = 'tuesday_working_hours_to';
      } else if (riyadhDay === 'Wed') {
        targetFromKey = 'wednesday_working_hours_from';
        targetToKey = 'wednesday_working_hours_to';
      } else if (riyadhDay === 'Thu') {
        targetFromKey = 'thursday_working_hours_from';
        targetToKey = 'thursday_working_hours_to';
      } else if (riyadhDay === 'Fri') {
        targetFromKey = 'friday_working_hours_from';
        targetToKey = 'friday_working_hours_to';
      } else if (riyadhDay === 'Sat') {
        targetFromKey = 'saturday_working_hours_from';
        targetToKey = 'saturday_working_hours_to';
      }

      let hFrom = getMetaVal(targetFromKey);
      let hTo = getMetaVal(targetToKey);

      if (!hFrom || !hTo) {
        hFrom = getMetaVal('working_hours_from');
        hTo = getMetaVal('working_hours_to');
      }

      const hFrom2 = getMetaVal('working_hours_from_shift2');
      const hTo2 = getMetaVal('working_hours_to_shift2');

      const workingDaysStr = getMetaVal('working_days');
      let isWorkingDay = true;
      if (workingDaysStr) {
        try {
          const parsedDays = JSON.parse(workingDaysStr);
          if (Array.isArray(parsedDays) && parsedDays.length > 0) {
            isWorkingDay = parsedDays.includes(riyadhDay);
          }
        } catch (e) { }
      }

      if (!isWorkingDay) {
        return false;
      }

      if (!hFrom || !hTo) {
        return true; // default open if not set
      }

      try {
        const now = new Date();
        const riyadhTime = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Riyadh',
          hour: 'numeric',
          minute: 'numeric',
          hour12: false
        }).formatToParts(now);

        const h = parseInt(riyadhTime.find(p => p.type === 'hour')?.value || '0', 10);
        const m = parseInt(riyadhTime.find(p => p.type === 'minute')?.value || '0', 10);
        const currentMins = h * 60 + m;

        const parseTime = (timeStr: string) => {
          const arMap: { [key: string]: string } = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9' };
          let normalized = String(timeStr).trim().toLowerCase().replace(/[٠-٩]/g, d => arMap[d]);

          const match = normalized.match(/(\d{1,2}):(\d{2})/);
          if (!match) return -1;

          let hr = parseInt(match[1], 10);
          let min = parseInt(match[2], 10);

          const isPm = normalized.includes('pm') || normalized.includes('م');
          const isAm = normalized.includes('am') || normalized.includes('ص');

          if (isPm && hr !== 12) hr += 12;
          if (isAm && hr === 12) hr = 0;

          return hr * 60 + min;
        };

        const checkShift = (fromTime: string, toTime: string) => {
          const fMins = parseTime(fromTime);
          const tMins = parseTime(toTime);
          if (fMins === -1 || tMins === -1) return false;

          if (tMins < fMins) {
            return currentMins >= fMins || currentMins < tMins;
          }
          return currentMins >= fMins && currentMins < tMins;
        };

        const open1 = checkShift(hFrom, hTo);
        const open2 = hFrom2 && hTo2 ? checkShift(hFrom2, hTo2) : false;
        return open1 || open2;
      } catch (e) {
        return true;
      }
    };

    setIsOpenBranch(checkOpenStatus());
  }, [selectedLocationId, branches]);

  useEffect(() => {
    const handleOpen = () => setModalOpen(true);
    window.addEventListener('openDeliveryModal', handleOpen);
    window.addEventListener('open-location-modal', handleOpen);
    return () => {
      window.removeEventListener('openDeliveryModal', handleOpen);
      window.removeEventListener('open-location-modal', handleOpen);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPromoIndex((prev) => (prev + 1) % 3);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const getReturnTo = () => {
    const currentPath = location.pathname;
    const currentSearch = location.search;
    if (isEn) return currentPath.replace(/^\/en(\/|$)/, '/') + currentSearch;
    return `/en${currentPath === '/' ? '' : currentPath}${currentSearch}`;
  };

  const promos = [
    {
      icon: <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3.19349 4.348C1.55349 4.71933 0.73349 4.90467 0.538157 5.532C0.34349 6.15867 0.902157 6.81267 2.02016 8.12L2.30949 8.458C2.62682 8.82933 2.78616 9.01533 2.85749 9.24467C2.92882 9.47467 2.90482 9.72267 2.85682 10.218L2.81282 10.6693C2.64416 12.414 2.55949 13.286 3.07016 13.6733C3.58082 14.0607 4.34882 13.7073 5.88349 13.0007L6.28149 12.818C6.71749 12.6167 6.93549 12.5167 7.16682 12.5167C7.39816 12.5167 7.61616 12.6167 8.05282 12.818L8.44949 13.0007C9.98482 13.7073 10.7528 14.0607 11.2628 13.674C11.7742 13.286 11.6895 12.414 11.5208 10.6693M12.3135 8.12C13.4315 6.81333 13.9902 6.15933 13.7955 5.532C13.6008 4.90467 12.7802 4.71867 11.1402 4.348L10.7162 4.252C10.2502 4.14667 10.0175 4.094 9.83016 3.952C9.64282 3.81 9.52349 3.59467 9.28349 3.164L9.06482 2.772C8.22016 1.25733 7.79816 0.5 7.16682 0.5C6.53549 0.5 6.11349 1.25733 5.26882 2.772" stroke="#FEF8EB" strokeLinecap="round" />
      </svg>,
      text: isEn ? 'Guaranteed Quality' : 'جودة مضمونة'
    },
    {
      icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 3V4H9.5V11.5H6.422C6.199 10.6405 5.426 10 4.5 10C3.574 10 2.801 10.6405 2.578 11.5H2V9H1V12.5H2.578C2.801 13.3595 3.574 14 4.5 14C5.426 14 6.199 13.3595 6.422 12.5H10.578C10.801 13.3595 11.574 14 12.5 14C13.426 14 14.199 13.3595 14.422 12.5H16V8.422L15.9685 8.3435L14.9685 5.3435L14.86 5H10.5V3H0ZM0.5 5V6H5V5H0.5ZM10.5 6H14.1405L15 8.5625V11.5H14.422C14.199 10.6405 13.426 10 12.5 10C11.574 10 10.801 10.6405 10.578 11.5H10.5V6ZM1 7V8H4V7H1ZM4.5 11C5.0585 11 5.5 11.4415 5.5 12C5.5 12.5585 5.0585 13 4.5 13C3.9415 13 3.5 12.5585 3.5 12C3.5 11.4415 3.9415 11 4.5 11ZM12.5 11C13.0585 11 13.5 11.4415 13.5 12C13.5 12.5585 13.0585 13 12.5 13C11.9415 13 11.5 12.5585 11.5 12C11.5 11.4415 11.9415 11 12.5 11Z" fill="#FEF8EB" />
      </svg>,
      text: isEn ? 'Express Delivery' : 'توصيل سريع'
    },
    {
      icon: <svg width="12" height="13" viewBox="0 0 12 13" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3.5 5.5L5.5 7.5L9 4M0.5 0.5V7C0.5 8.45869 1.07946 9.85764 2.11091 10.8891C3.14236 11.9205 4.54131 12.5 6 12.5C7.45869 12.5 8.85764 11.9205 9.88909 10.8891C10.9205 9.85764 11.5 8.45869 11.5 7V0.5H0.5Z" stroke="#FEF8EB" />
      </svg>,
      text: isEn ? 'Click & Collect' : 'دفع آمن ومضمون'
    }
  ];

  return (
    <>
      <div className="w-full bg-[#234745] text-[#FEF8EB] h-[36px] border-b border-[#2e5653] font-bold text-[11px] md:text-[13px]">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-6 h-full flex items-center justify-between w-full">
          {/* Desktop: Show all 3 */}
          <div className="hidden md:flex items-center gap-8">
            {promos.map((promo, idx) => (
              <div key={idx} className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-default">
                {promo.icon}
                <span className="font-['GE_Dinar_One'] font-medium leading-none tracking-normal text-right align-middle">{promo.text}</span>
              </div>
            ))}
          </div>

          {/* Mobile: Show rotating 1 (hidden below 350px screen width) */}
          <div className="md:hidden min-[350px]:flex hidden relative h-full flex-1 overflow-hidden">
            {promos.map((promo, idx) => (
              <div
                key={idx}
                className={`absolute ${isEn ? 'left-0' : 'right-0'} top-0 h-full flex items-center gap-1.5 transition-all duration-500 ease-in-out ${idx === currentPromoIndex ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
                  }`}
              >
                {promo.icon}
                <span className="font-bold whitespace-nowrap">{promo.text}</span>
              </div>
            ))}
          </div>

          {/* LEFT: Language & Branch */}
          <div className="flex items-center justify-end md:justify-start gap-3 md:gap-4 shrink-0 z-10">
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 md:gap-3 px-4 py-1.5 md:px-5 md:py-1.5 rounded-full bg-[#b9cdca] border border-[#91a7a2] text-[12px] md:text-[14px] hover:bg-[#a6bdbc] transition-all text-[#234745]"
              style={!isEn ? { fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" } : undefined}
            >
              <div className="relative flex items-center pt-0.5">
                <span className="truncate max-w-[90px] md:max-w-[200px] font-medium leading-none tracking-wide">
                  {fulfillmentType === 'delivery' && selectedAddressName
                    ? (isEn ? `Delivery: ${selectedAddressName}` : `توصيل: ${selectedAddressName}`)
                    : (selectedLocationId || selectedLocationName
                      ? (() => {
                          if (branches?.length > 0) {
                            const activeNode = branches.find((b: any) => 
                              (selectedLocationId && (b.id === selectedLocationId || b.numericalId === selectedLocationId?.split('/')?.pop())) ||
                              (selectedLocationName && (
                                b.name === selectedLocationName || 
                                b.rawName === selectedLocationName || 
                                b.name_in_arabic === selectedLocationName || 
                                b.nameInArabic === selectedLocationName ||
                                (b.metafields && b.metafields.find((m: any) => m?.key === 'name_in_arabic')?.value === selectedLocationName)
                              ))
                            );
                            if (activeNode) {
                              if (isEn) {
                                // On English view: Use English name
                                const enName = activeNode.name || activeNode.rawName;
                                if (enName && String(enName).trim()) return String(enName).trim();
                              } else {
                                // On Arabic view: Use Arabic name if available
                                const arName = activeNode.nameInArabic || activeNode.name_in_arabic?.value || activeNode.name_in_arabic || activeNode.metafields?.find((m: any) => m?.key === 'name_in_arabic')?.value;
                                if (arName && String(arName).trim()) return String(arName).trim();
                                const fallbackName = activeNode.name || activeNode.rawName;
                                if (fallbackName && String(fallbackName).trim()) return String(fallbackName).trim();
                              }
                            }
                          }
                          return selectedLocationName || (isEn ? 'Select Your Branch' : 'اختر الفرع');
                        })()
                      : (isEn ? 'Select Your Branch' : 'اختر الفرع'))
                  }
                </span>
                <div className={`absolute -top-[6px] -right-[6px] w-[8px] h-[8px] rounded-full transition-colors duration-300 ${isOpenBranch ? 'bg-[#3ddb6a]' : 'bg-[#ef4444]'}`} />
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-[2px] opacity-90"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>

            <Form action="/api/locale" method="post" className="flex items-center" reloadDocument>
              <input type="hidden" name="locale" value={isEn ? 'ar' : 'en'} />
              <input type="hidden" name="returnTo" value={getReturnTo()} />
              <button type="submit" className="flex items-center gap-1 md:gap-1.5 hover:opacity-80 transition-opacity font-normal text-[#FEF8EB]">
                <span>{isEn ? 'العربية' : 'English'}</span>
                <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor" className="opacity-70"><path d="M5 7l5 5 5-5H5z" /></svg>
              </button>
            </Form>
          </div>
        </div>
      </div>

      <DeliveryPickupModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('declaredLocation', 'true');
              sessionStorage.setItem('declaredLocation', 'true');
            } catch (e) {}
          }
        }}
        locationsPromise={locations}
        customerPromise={customer}
        googleMapsKey={googleMapsKey}
        locale={locale}
        onSelectBranch={(branch: any, type: any) => {
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('declaredLocation', 'true');
              sessionStorage.setItem('declaredLocation', 'true');
            } catch (e) {}
          }
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('branchSelected', { detail: { branch, type } }));
          }
          onSelectBranch(branch, type);
        }}
        defaultTab={fulfillmentType as any || 'delivery'}
        selectedLocationId={selectedLocationId}
        selectedAddressName={selectedAddressName}
      />
    </>
  );
}

// ─── ROW 2: MAIN BAR ────────────────────────────────────────────────────────
function MiddleBar({
  isLoggedIn,
  cart,
  locale,
  menu,
  activeMega,
  setActiveMega
}: {
  isLoggedIn: boolean | Promise<boolean>;
  cart: HeaderProps['cart'];
  locale?: string,
  menu: any,
  activeMega: string | null,
  setActiveMega: (v: string | null) => void
}) {
  const { open } = useAside();
  const location = useLocation();
  const isEn = location.pathname.startsWith('/en');
  const rootData = useRouteLoaderData('root') as any;
  const [points, setPoints] = useState<number | null>(null);

  const [customerInfo, setCustomerInfo] = useState<{ phone?: string, email?: string }>({});

  useEffect(() => {
    if (rootData?.customer) {
      Promise.resolve(rootData.customer).then((res: any) => {
        const cust = res?.customer;
        if (cust) {
          setCustomerInfo({
            phone: cust.phone,
            email: cust.email,
          });
        }
      }).catch(() => { });
    }
  }, [rootData?.customer]);

  // Extract phone number or email from root data
  let phone = rootData?.loginOtpPhone || customerInfo.phone;
  const email = customerInfo.email;
  const customerIdentifier = phone || email;

  useEffect(() => {
    if (customerIdentifier) {
      const cleanId = customerIdentifier.replace(/\s+/g, '');
      fetch(`/api/loyalty-points?identifier=${encodeURIComponent(cleanId)}&t=${Date.now()}`)
        .then(res => res.json())
        .then((data: any) => {
          if (data?.success && data?.data?.points !== undefined) {
            setPoints(data.data.points);
          }
        })
        .catch(() => { });
    } else {
      setPoints(null);
    }
  }, [customerIdentifier]);

  return (
    <div className="w-full py-3 lg:py-4 border-b border-[#234745]/5">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6">

        {/* 1. Desktop Header Layout (hidden on mobile screen sizes) */}
        <div className="hidden lg:grid grid-cols-[1fr_auto_1fr] items-center w-full">

          {/* RIGHT (in RTL) / LEFT (in LTR): Desktop Nav */}
          <div className="flex items-center justify-start min-w-0">
            <CategoryNav locale={locale} activeMega={activeMega} setActiveMega={setActiveMega} />
          </div>

          {/* CENTER: Logo */}
          <div className="flex justify-center px-12 shrink-0">
            <NavLink to={isEn ? "/en" : "/"} prefetch="intent" className="flex items-center justify-center transition-transform hover:scale-[1.02]">
              <img src="/logo.svg" alt="SAADEDDIN" width="120" height="32" style={{ width: '120px', maxWidth: '100%', height: 'auto' }} className="object-contain" />
            </NavLink>
          </div>

          {/* LEFT (in RTL) / RIGHT (in LTR): Icons & Search */}
          <div className="flex items-center gap-6 justify-end">
            <div className="flex-1 max-w-[280px] hidden xl:block">
              <GlobalSearchBar locale={locale} />
            </div>

            {/* Loyalty Points */}
            <NavLink to={isEn ? "/en/account/wallet" : "/account/wallet"} className="flex group items-center gap-2 hover:opacity-70 transition-all !text-[#234745] text-[13px]" style={{ fontWeight: 500, fontFamily: 'EnglishDigits, "GE Dinar One", sans-serif' }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7.62729 4.50667C8.68312 2.61334 9.21062 1.66667 9.99979 1.66667C10.789 1.66667 11.3165 2.61334 12.3723 4.50667L12.6456 4.99667C12.9456 5.53501 13.0956 5.80417 13.329 5.98167C13.5623 6.15917 13.854 6.22501 14.4373 6.35667L14.9673 6.47667C17.0173 6.94084 18.0415 7.17251 18.2856 7.95667C18.529 8.74001 17.8306 9.55751 16.4331 11.1917L16.0715 11.6142C15.6748 12.0783 15.4756 12.3108 15.3865 12.5975C15.2973 12.885 15.3273 13.195 15.3873 13.8142L15.4423 14.3783C15.6531 16.5592 15.759 17.6492 15.1206 18.1333C14.4823 18.6175 13.5223 18.1758 11.604 17.2925L11.1065 17.0642C10.5615 16.8125 10.289 16.6875 9.99979 16.6875C9.71062 16.6875 9.43812 16.8125 8.89312 17.0642L8.39646 17.2925C6.47729 18.1758 5.51729 18.6175 4.87979 18.1342C4.24062 17.6492 4.34646 16.5592 4.55729 14.3783L4.61229 13.815C4.67229 13.195 4.70229 12.885 4.61229 12.5983C4.52396 12.3108 4.32479 12.0783 3.92812 11.615L3.56646 11.1917C2.16896 9.55834 1.47062 8.74084 1.71396 7.95667C1.95729 7.17251 2.98312 6.94001 5.03312 6.47667L5.56312 6.35667C6.14562 6.22501 6.43646 6.15917 6.67062 5.98167C6.90479 5.80417 7.05396 5.53501 7.35396 4.99667L7.62729 4.50667Z" fill="#FFCC00" />
              </svg>

              <span>{isEn ? 'Points' : 'نقاطي'}</span>
            </NavLink>

            {/* Wishlist */}
            <NavLink to={isEn ? "/en/account/wishlist" : "/account/wishlist"} className="flex group items-center gap-2 hover:opacity-70 transition-all !text-[#234745] text-[13px]" style={{ fontWeight: 500, fontFamily: 'EnglishDigits, "GE Dinar One", sans-serif' }}>
              <div className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="14" viewBox="0 0 15 14" fill="none">
                  <path d="M7.5 13.3367L6.86834 12.7658C5.50834 11.5236 4.38334 10.4603 3.49334 9.57583C2.60389 8.69083 1.90167 7.91028 1.38667 7.23417C0.871669 6.55806 0.511669 5.94694 0.306669 5.40083C0.101669 4.85472 -0.000553303 4.30444 2.25225e-06 3.75C2.25225e-06 2.69 0.360002 1.8 1.08 1.08C1.8 0.36 2.69 0 3.75 0C4.48334 0 5.17084 0.1875 5.8125 0.5625C6.45417 0.9375 7.01667 1.48306 7.5 2.19917C7.98334 1.48306 8.54584 0.9375 9.1875 0.5625C9.82917 0.1875 10.5167 0 11.25 0C12.31 0 13.2 0.36 13.92 1.08C14.64 1.8 15 2.69 15 3.75C15 4.30333 14.8978 4.85333 14.6933 5.4C14.4883 5.94778 14.1283 6.55944 13.6133 7.235C13.0983 7.91055 12.3986 8.69083 11.5142 9.57583C10.6297 10.4603 9.50195 11.5236 8.13084 12.7658L7.5 13.3367ZM7.5 12.2083C8.83334 11.0028 9.93056 9.97056 10.7917 9.11167C11.6528 8.25278 12.3333 7.50694 12.8333 6.87417C13.3333 6.24139 13.6806 5.68167 13.875 5.195C14.0694 4.70722 14.1667 4.22555 14.1667 3.75C14.1667 2.91667 13.8889 2.22222 13.3333 1.66667C12.7778 1.11111 12.0833 0.833333 11.25 0.833333C10.5867 0.833333 9.97445 1.02278 9.41333 1.40167C8.85222 1.78056 8.35056 2.35083 7.90834 3.1125H7.09334C6.63945 2.34028 6.13472 1.76722 5.57917 1.39333C5.02361 1.02 4.41417 0.833333 3.75084 0.833333C2.92861 0.833333 2.23695 1.11111 1.67584 1.66667C1.11472 2.22222 0.833891 2.91667 0.833336 3.75C0.833336 4.22555 0.930558 4.70722 1.125 5.195C1.31945 5.68278 1.66667 6.2425 2.16667 6.87417C2.66667 7.50583 3.34722 8.24889 4.20834 9.10333C5.06945 9.95778 6.16667 10.9928 7.5 12.2083Z" fill="#255441" />
                </svg>
                <WishlistBadge />
              </div>
              <span>{isEn ? 'Wishlist' : 'المفضلة'}</span>
            </NavLink>

            {/* Cart */}
            <button onClick={() => open('cart')} aria-label="Cart" className="group flex items-center gap-2 hover:opacity-70 transition-all relative p-1 text-[#234745] text-[13px]" style={{ fontWeight: 500, fontFamily: 'EnglishDigits, "GE Dinar One", sans-serif' }}>
              <div className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M12.5 12.5C12.942 12.5 13.3659 12.6756 13.6785 12.9882C13.9911 13.3007 14.1667 13.7246 14.1667 14.1667C14.1667 14.6087 13.9911 15.0326 13.6785 15.3452C13.3659 15.6577 12.942 15.8333 12.5 15.8333C12.058 15.8333 11.634 15.6577 11.3215 15.3452C11.0089 15.0326 10.8333 14.6087 10.8333 14.1667C10.8333 13.7246 11.0089 13.3007 11.3215 12.9882C11.634 12.6756 12.058 12.5 12.5 12.5ZM12.5 13.3333C12.279 13.3333 12.067 13.4211 11.9107 13.5774C11.7545 13.7337 11.6667 13.9457 11.6667 14.1667C11.6667 14.3877 11.7545 14.5996 11.9107 14.7559C12.067 14.9122 12.279 15 12.5 15C12.721 15 12.933 14.9122 13.0893 14.7559C13.2455 14.5996 13.3333 14.3877 13.3333 14.1667C13.3333 13.9457 13.2455 13.7337 13.0893 13.5774C12.933 13.4211 12.721 13.3333 12.5 13.3333ZM5 12.5C5.44203 12.5 5.86595 12.6756 6.17851 12.9882C6.49107 13.3007 6.66667 13.7246 6.66667 14.1667C6.66667 14.6087 6.49107 15.0326 6.17851 15.3452C5.86595 15.6577 5.44203 15.8333 5 15.8333C4.55797 15.8333 4.13405 15.6577 3.82149 15.3452C3.50893 15.0326 3.33333 14.6087 3.33333 14.1667C3.33333 13.7246 3.50893 13.3007 3.82149 12.9882C4.13405 12.6756 4.55797 12.5 5 12.5ZM5 13.3333C4.77899 13.3333 4.56702 13.4211 4.41074 13.5774C4.25446 13.7337 4.16667 13.9457 4.16667 14.1667C4.16667 14.3877 4.25446 14.5996 4.41074 14.7559C4.56702 14.9122 4.77899 15 5 15C5.22101 15 5.43297 14.9122 5.58926 14.7559C5.74554 14.5996 5.83333 14.3877 5.83333 14.1667C5.83333 13.9457 5.74554 13.7337 5.58926 13.5774C5.43297 13.4211 5.22101 13.3333 5 13.3333ZM14.1667 2.5H2.725L4.85 7.5H11.6667C11.9417 7.5 12.1833 7.36667 12.3333 7.16667L14.8333 3.83333C14.9417 3.69167 15 3.51667 15 3.33333C15 3.11232 14.9122 2.90036 14.7559 2.74408C14.5996 2.5878 14.3877 2.5 14.1667 2.5ZM11.6667 8.33333H4.89167L4.25 9.63333L4.16667 10C4.16667 10.221 4.25446 10.433 4.41074 10.5893C4.56702 10.7455 4.77899 10.8333 5 10.8333H14.1667V11.6667H5C4.55797 11.6667 4.13405 11.4911 3.82149 11.1785C3.50893 10.8659 3.33333 10.442 3.33333 10C3.33309 9.71725 3.40478 9.43908 3.54167 9.19167L4.14167 7.96667L1.11667 0.833333H0V0H1.66667L2.375 1.66667H14.1667C14.6087 1.66667 15.0326 1.84226 15.3452 2.15482C15.6577 2.46738 15.8333 2.89131 15.8333 3.33333C15.8333 3.75 15.6917 4.1 15.4583 4.38333L13.0333 7.625C12.7333 8.05 12.2333 8.33333 11.6667 8.33333Z" fill="#255441" />
                </svg>
                <Suspense fallback={null}>
                  <Await resolve={cart}>{(cartData) => {
                    const count = cartData?.totalQuantity ?? 0;
                    if (count === 0) return null;
                    return <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#e34242] text-white text-[9px] rounded-full flex items-center justify-center shadow-sm border border-white">{count}</span>
                  }}</Await>
                </Suspense>
              </div>
              <span>{isEn ? 'Cart' : 'السلة'}</span>
            </button>

            {/* Account */}
            <NavLink to={isEn ? "/en/account" : "/account"} className="flex group items-center gap-2 hover:opacity-70 transition-all !text-[#234745] text-[13px]" style={{ fontWeight: 500, fontFamily: '"GE Dinar One", sans-serif' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M4.06417 4.26917C3.57694 3.78139 3.33333 3.19167 3.33333 2.5C3.33333 1.80833 3.57694 1.21861 4.06417 0.730834C4.55139 0.243056 5.14111 -0.000554608 5.83333 9.48048e-07C6.52556 0.000556504 7.11528 0.244168 7.6025 0.730834C8.08972 1.2175 8.33333 1.80722 8.33333 2.5C8.33333 3.19278 8.08972 3.7825 7.6025 4.26917C7.11528 4.75583 6.52556 4.99945 5.83333 5C5.14111 5.00056 4.55139 4.75695 4.06417 4.26917ZM0 10.16V9.65333C0 9.30945 0.1 8.98778 0.3 8.68833C0.500556 8.38833 0.77 8.15556 1.10833 7.99C1.895 7.61278 2.68222 7.33 3.47 7.14167C4.25722 6.95278 5.045 6.85833 5.83333 6.85833C6.62167 6.85833 7.40972 6.95278 8.1975 7.14167C8.98528 7.33056 9.77194 7.61333 10.5575 7.99C10.8964 8.15556 11.1658 8.38833 11.3658 8.68833C11.5664 8.98778 11.6667 9.30945 11.6667 9.65333V10.16C11.6667 10.4044 11.5836 10.61 11.4175 10.7767C11.2514 10.9422 11.0458 11.025 10.8008 11.025H0.866667C0.621667 11.025 0.416111 10.9419 0.25 10.7758C0.083889 10.6097 0.000555556 10.4044 0 10.16ZM0.833333 10.1925H10.8333V9.65333C10.8333 9.46889 10.7736 9.29528 10.6542 9.1325C10.5353 8.97028 10.3706 8.83306 10.16 8.72083C9.47444 8.38861 8.76833 8.13417 8.04167 7.9575C7.315 7.78083 6.57889 7.6925 5.83333 7.6925C5.08778 7.6925 4.35167 7.78083 3.625 7.9575C2.89833 8.13417 2.19222 8.38861 1.50667 8.72083C1.29556 8.83306 1.13083 8.97028 1.0125 9.1325C0.893056 9.29528 0.833333 9.46917 0.833333 9.65417V10.1925ZM7.01083 3.67667C7.33694 3.35056 7.5 2.95833 7.5 2.5C7.5 2.04167 7.33694 1.64917 7.01083 1.3225C6.68472 0.995834 6.29222 0.832779 5.83333 0.833334C5.37444 0.83389 4.98222 0.996945 4.65667 1.3225C4.33111 1.64806 4.16778 2.04056 4.16667 2.5C4.16556 2.95945 4.32889 3.35167 4.65667 3.67667C4.98444 4.00167 5.37667 4.165 5.83333 4.16667C6.29 4.16833 6.6825 4.005 7.01083 3.67667Z" fill="#255441" />
              </svg>
              <span>{isEn ? 'Account' : 'حسابي'}</span>
            </NavLink>
          </div>
        </div>

        {/* 2. Mobile Header Layout (lg:hidden, forced LTR layout matching mockup exactly) */}
        <div className="lg:hidden flex items-center justify-between w-full px-1" dir="ltr">
          {/* LEFT GROUP: Account, Wishlist, Loyalty Star */}
          <div className="flex items-center gap-2">
            {/* Account */}
            <NavLink to={isEn ? "/en/account" : "/account"} className="text-[#234745] hover:opacity-70 transition-opacity p-0.5">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            </NavLink>

            {/* Wishlist */}
            <NavLink to={isEn ? "/en/account/wishlist" : "/account/wishlist"} className="text-[#234745] hover:opacity-70 transition-opacity p-0.5 relative">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
              <WishlistBadge />
            </NavLink>

            {/* Loyalty Star */}
            <NavLink to={isEn ? "/en/account/wallet" : "/account/wallet"} className="text-[#234745] hover:opacity-70 transition-opacity p-0.5 relative">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="#f1c40f" stroke="#f1c40f" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              {points !== null && (
                <span className="absolute -top-1 -right-1.5 bg-[#234745] text-white text-[8px] font-bold px-1 rounded-full">{points}</span>
              )}
            </NavLink>
          </div>

          {/* CENTER GROUP: Logo */}
          <div className="flex items-center justify-center flex-1 max-w-[150px] px-1">
            <NavLink to={isEn ? "/en" : "/"} prefetch="intent" className="transition-transform hover:scale-[1.02] flex items-center justify-center">
              <img src="/logo.svg" alt="SAADEDDIN" className="h-[34px] w-auto object-contain" />
            </NavLink>
          </div>

          {/* RIGHT GROUP: Cart, Search, Menu */}
          <div className="flex items-center gap-2">
            {/* Cart */}
            <button onClick={() => open('cart')} aria-label="Cart" className="text-[#234745] hover:opacity-70 transition-opacity p-0.5 relative">
              <svg width="19" height="19" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12.5132 14.1798C12.8761 14.1798 13.2241 14.324 13.4808 14.5806C13.7374 14.8372 13.8816 15.1853 13.8816 15.5482C13.8816 15.9111 13.7374 16.2592 13.4808 16.5158C13.2241 16.7725 12.8761 16.9166 12.5132 16.9166C12.1502 16.9166 11.8022 16.7725 11.5455 16.5158C11.2889 16.2592 11.1447 15.9111 11.1447 15.5482C11.1447 15.1853 11.2889 14.8372 11.5455 14.5806C11.8022 14.324 12.1502 14.1798 12.5132 14.1798ZM12.5132 14.864C12.3317 14.864 12.1577 14.9361 12.0293 15.0644C11.901 15.1927 11.8289 15.3667 11.8289 15.5482C11.8289 15.7297 11.901 15.9037 12.0293 16.032C12.1577 16.1603 12.3317 16.2324 12.5132 16.2324C12.6946 16.2324 12.8687 16.1603 12.997 16.032C13.1253 15.9037 13.1974 15.7297 13.1974 15.5482C13.1974 15.3667 13.1253 15.1927 12.997 15.0644C12.8687 14.9361 12.6946 14.864 12.5132 14.864ZM6.35526 14.1798C6.71819 14.1798 7.06625 14.324 7.32288 14.5806C7.57951 14.8372 7.72368 15.1853 7.72368 15.5482C7.72368 15.9111 7.57951 16.2592 7.32288 16.5158C7.06625 16.7725 6.71819 16.9166 6.35526 16.9166C5.99234 16.9166 5.64427 16.7725 5.38764 16.5158C5.13101 16.2592 4.98684 15.9111 4.98684 15.5482C4.98684 15.1853 5.13101 14.8372 5.38764 14.5806C5.64427 14.324 5.99234 14.1798 6.35526 14.1798ZM6.35526 14.864C6.1738 14.864 5.99977 14.9361 5.87145 15.0644C5.74314 15.1927 5.67105 15.3667 5.67105 15.5482C5.67105 15.7297 5.74314 15.9037 5.87145 16.032C5.99977 16.1603 6.1738 16.2324 6.35526 16.2324C6.53673 16.2324 6.71076 16.1603 6.83907 16.032C6.96739 15.9037 7.03947 15.7297 7.03947 15.5482C7.03947 15.3667 6.96739 15.1927 6.83907 15.0644C6.71076 14.9361 6.53673 14.864 6.35526 14.864ZM13.8816 5.96926H4.48737L6.23211 10.0745H11.8289C12.0547 10.0745 12.2532 9.96505 12.3763 9.80084L14.4289 7.06399C14.5179 6.94768 14.5658 6.80399 14.5658 6.65347C14.5658 6.472 14.4937 6.29797 14.3654 6.16966C14.2371 6.04134 14.063 5.96926 13.8816 5.96926ZM11.8289 10.7587H6.26632L5.73947 11.8261L5.67105 12.1272C5.67105 12.3086 5.74314 12.4826 5.87145 12.611C5.99977 12.7393 6.1738 12.8114 6.35526 12.8114H13.8816V13.4956H6.35526C5.99234 13.4956 5.64427 13.3514 5.38764 13.0948C5.13101 12.8381 4.98684 12.4901 4.98684 12.1272C4.98664 11.895 5.0455 11.6666 5.15789 11.4635L5.65053 10.4577L3.16684 4.60084H2.25V3.91663H3.61842L4.2 5.28505H13.8816C14.2445 5.28505 14.5926 5.42922 14.8492 5.68585C15.1058 5.94248 15.25 6.29054 15.25 6.65347C15.25 6.99557 15.1337 7.28294 14.9421 7.51557L12.9511 10.1772C12.7047 10.5261 12.2942 10.7587 11.8289 10.7587Z" fill="currentColor" /></svg>
              <Suspense fallback={null}>
                <Await resolve={cart}>{(cartData) => {
                  const count = cartData?.totalQuantity ?? 0;
                  if (count === 0) return null;
                  return <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#e34242] text-white text-[9px] rounded-full flex items-center justify-center shadow-sm border border-white">{count}</span>
                }}</Await>
              </Suspense>
            </button>

            {/* Search */}
            <button onClick={() => open('search')} aria-label={isEn ? "Search" : "بحث"} className="text-[#234745] hover:opacity-70 transition-opacity p-0.5">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            </button>

            {/* Menu Hamburger */}
            <button onClick={() => open('mobile')} aria-label={isEn ? "Open Menu" : "فتح القائمة"} className="text-[#234745] hover:opacity-70 transition-opacity p-0.5">
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── ROW 3: CATEGORY NAV ────────────────────────────────────────────────────
const STATIC_NAV_AR = [
  { title: 'الرئيسية', url: '/' },
  { title: 'المنتجات', url: '/collections/all', hasMega: true },
  { title: 'المناسبات', url: '/occasions' },
  { title: 'الكيك المخصص', url: '/custom-cake' },
  { title: 'خدمة الضيافة', url: 'https://catering.saadeddin.sa', isExternal: true },
  { title: 'القسائم', url: '/vouchers' },
  { title: 'العروض', url: '/promotions' },
];

const STATIC_NAV_EN = [
  { title: 'Home', url: '/en' },
  { title: 'Products', url: '/en/collections/all', hasMega: true },
  { title: 'Occasions', url: '/en/occasions' },
  { title: 'Custom Cake', url: '/en/custom-cake' },
  { title: 'Catering', url: 'https://catering.saadeddin.sa', isExternal: true },
  { title: 'Vouchers', url: '/en/vouchers' },
  { title: 'Offers', url: '/en/promotions' },
];

function CategoryNav({
  locale,
  activeMega,
  setActiveMega
}: {
  locale?: string,
  activeMega: string | null,
  setActiveMega: (v: string | null) => void
}) {
  const location = useLocation();
  const isEn = location.pathname.startsWith('/en');
  const NAV_ITEMS = isEn ? STATIC_NAV_EN : STATIC_NAV_AR;

  return (
    <nav className="flex items-center gap-1 xl:gap-2 h-full">
      {NAV_ITEMS.map((item: any) => {
        const isOffers = item.url.includes('offers') || item.url.includes('promotions');
        const isExternal = item.isExternal || item.url.startsWith('http');
        return (
          <div
            key={item.url}
            className="h-full flex items-center"
            onMouseEnter={() => item.hasMega ? setActiveMega('products') : setActiveMega(null)}
          >
            {isExternal ? (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setActiveMega(null)}
                className="font-['GE_Dinar_One'] font-normal !px-2 xl:px-3 !py-2 text-[13px] xl:text-[14px] transition-all whitespace-nowrap rounded-full !text-[#9FB7AE] hover:!text-[#234745]"
              >
                {item.title}
              </a>
            ) : (
              <NavLink
                to={item.url}
                prefetch="intent"
                end={item.url === '/' || item.url === '/en'}
                onClick={() => setActiveMega(null)}
                className={({ isActive }) => {
                  const active = isActive || (item.hasMega && activeMega);
                  return `
                    font-['GE_Dinar_One'] font-normal !px-2 xl:px-3 !py-2 text-[13px] xl:text-[14px] transition-all whitespace-nowrap rounded-full
                    ${isOffers
                      ? 'bg-[#E64950] !text-white hover:bg-[#E64950] px-4 xl:px-5 shadow-sm'
                      : active
                        ? '!text-[#234745]'
                        : '!text-[#9FB7AE]'}
                  `;
                }}
                style={isOffers ? { color: 'white' } : {}}
              >
                {item.title}
              </NavLink>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function ProductMegaMenu({ locale, megaMenuData, onClose }: { locale?: string; megaMenuData?: any; onClose?: () => void }) {
  const location = useLocation();
  const isEn = location.pathname.startsWith('/en');

  // 1. Support Shopify Navigation Menu items (megaMenuData.menu.items)
  const menuItems = megaMenuData?.menu?.items || [];

  // 2. Fallback to raw collection nodes if menu is not present
  const rawNodes = megaMenuData?.nodes || megaMenuData?.collections?.nodes || [];
  const collections = rawNodes.filter((col: any) => col && col.id && col.title);

  let categories: any[] = [];

  if (menuItems.length > 0) {
    categories = menuItems.map((item: any) => {
      const col = item.resource;
      const title = col?.title || item.title;
      const handle = col?.handle || (item.url ? item.url.split('/').pop()?.split('?')[0] : '');
      const colUrl = handle
        ? (isEn ? `/en/collections/${handle}` : `/collections/${handle}`)
        : (item.url || '#');

      const firstProductImg = col?.products?.nodes?.find((p: any) => p.featuredImage?.url)?.featuredImage?.url;
      const catImage = col?.image?.url || firstProductImg || 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png';

      let subItems: any[] = [];
      if (item.items && item.items.length > 0) {
        subItems = item.items.map((sub: any) => {
          let url = sub.url || '';
          try {
            if (url.startsWith('http://') || url.startsWith('https://')) {
              const parsed = new URL(url);
              url = parsed.pathname;
            }
          } catch (e) {}
          if (isEn && !url.startsWith('/en')) {
            url = `/en${url}`;
          } else if (!isEn && url.startsWith('/en/')) {
            url = url.replace('/en', '');
          }
          return {
            title: sub.resource?.title || sub.title,
            url: url || '#',
          };
        });
      } else if (col?.products?.nodes && col.products.nodes.length > 0) {
        subItems = col.products.nodes.map((p: any) => ({
          title: p.title,
          url: isEn ? `/en/products/${p.handle}` : `/products/${p.handle}`,
        }));
      }

      return {
        title,
        image: catImage,
        items: subItems,
        url: colUrl,
      };
    });
  } else if (collections.length > 0) {
    categories = collections.map((col: any) => {
      const colUrl = isEn ? `/en/collections/${col.handle}` : `/collections/${col.handle}`;
      const firstProductImg = col.products?.nodes?.find((p: any) => p.featuredImage?.url)?.featuredImage?.url;
      const catImage = col.image?.url || firstProductImg || 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png';

      return {
        title: col.title,
        image: catImage,
        items: col.products?.nodes?.map((p: any) => ({
          title: p.title,
          url: isEn ? `/en/products/${p.handle}` : `/products/${p.handle}`
        })) || [],
        url: colUrl
      };
    });
  } else {
    categories = [
      {
        title: isEn ? 'Oriental Sweets' : 'حلويات شرقية',
        image: 'https://cdn.shopify.com/s/files/1/0943/4280/7861/files/category-baklava.jpg?v=1730000000',
        items: (isEn ? ['Baklava', 'Maamoul', 'Kunafa', 'Basbousa'] : ['بقلاوة', 'معمول', 'كنافة', 'بسبوسة']).map(name => ({
          title: name,
          url: `${isEn ? '/en' : ''}/collections/oriental-sweets/${name.toLowerCase().replace(/ /g, '-')}`
        })),
        url: isEn ? '/en/collections/oriental-sweets' : '/collections/oriental-sweets'
      },
      {
        title: isEn ? 'Premium Chocolates' : 'شوكولاتة فاخرة',
        image: 'https://cdn.shopify.com/s/files/1/0943/4280/7861/files/category-choco.jpg?v=1730000001',
        items: (isEn ? ['Truffles', 'Pralines', 'Gift Boxes', 'Wrapped Choco'] : ['ترافلز', 'برالين', 'صناديق هدايا', 'شوكولاتة مغلفة']).map(name => ({
          title: name,
          url: `${isEn ? '/en' : ''}/collections/chocolates/${name.toLowerCase().replace(/ /g, '-')}`
        })),
        url: isEn ? '/en/collections/chocolates' : '/collections/chocolates'
      },
      {
        title: isEn ? 'Cakes & Pastries' : 'كيك وحلويات غربية',
        image: 'https://cdn.shopify.com/s/files/1/0943/4280/7861/files/category-cakes.jpg?v=1730000002',
        items: (isEn ? ['Occasion Cakes', 'Mini Cakes', 'Macarons', 'Éclairs'] : ['كيك المناسبات', 'ميني كيك', 'ماكرون', 'اكلير']).map(name => ({
          title: name,
          url: `${isEn ? '/en' : ''}/collections/cakes/${name.toLowerCase().replace(/ /g, '-')}`
        })),
        url: isEn ? '/en/collections/cakes' : '/collections/cakes'
      },
      {
        title: isEn ? 'Ice Cream' : 'آيس كريم',
        image: 'https://cdn.shopify.com/s/files/1/0943/4280/7861/files/category-icecream.jpg?v=1730000003',
        items: (isEn ? ['Gelato', 'Sorbet', 'Party Tubs', 'Stick Ice Cream'] : ['جيلاتو', 'سوربيه', 'عبوات الحفلات', 'آيس كريم ستيك']).map(name => ({
          title: name,
          url: `${isEn ? '/en' : ''}/collections/ice-cream/${name.toLowerCase().replace(/ /g, '-')}`
        })),
        url: isEn ? '/en/collections/ice-cream' : '/collections/ice-cream'
      }
    ];
  }

  return (
    <div className="bg-white/95 backdrop-blur-xl border-y border-[#234745]/10 shadow-2xl w-full">
      <div className="max-w-[1400px] mx-auto grid grid-cols-4 gap-8 p-10">
        {categories.map((cat: any) => (
          <div key={cat.title} className="group cursor-pointer">
            <NavLink to={cat.url} onClick={onClose} className="block">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-6 shadow-md transition-transform duration-500 group-hover:scale-[1.03]">
                <img src={cat.image} alt={cat.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#234745]/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-white text-lg font-bold">{cat.title}</h3>
                </div>
              </div>
            </NavLink>
            <ul className="space-y-3">
              {cat.items.map((item: any) => (
                <li key={item.title}>
                  <NavLink
                    to={item.url}
                    onClick={onClose}
                    className="text-[#234745]/70 hover:text-[#234745] hover:translate-x-1 transition-all inline-block font-medium text-sm"
                  >
                    {item.title}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="bg-[#234745]/5 py-4">
        <div className="max-w-[1400px] mx-auto px-10 flex justify-between items-center text-sm">
          <span className="text-[#234745]/60 font-medium">
            {isEn ? 'Discover our full collection of fresh delights' : 'اكتشف مجموعتنا الكاملة من الحلويات الطازجة'}
          </span>
          <NavLink to={isEn ? '/en/collections/all' : '/collections/all'} onClick={onClose} className="text-[#234745] font-bold hover:underline flex items-center gap-2">
            {isEn ? 'Shop All Products' : 'تسوق جميع المنتجات'}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={isEn ? '' : 'rotate-180'}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
          </NavLink>
        </div>
      </div>
    </div>
  );
}

export function HeaderMenu({
  menu,
  viewport,
  locale,
  onClose
}: {
  menu: any;
  viewport: Viewport;
  locale?: string;
  onClose?: () => void;
}) {
  const location = useLocation();
  const isEn = location.pathname.startsWith('/en');
  const NAV_ITEMS = isEn ? STATIC_NAV_EN : STATIC_NAV_AR;

  return (
    <div className="flex flex-col h-full bg-[#FEF8EB]">
      <div className="px-4 py-6 flex flex-col gap-3">

        {/* Mobile Header Links */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <NavLink to={isEn ? "/en/account" : "/account"} onClick={onClose} className="flex flex-col items-center justify-center gap-2 p-4 bg-white rounded-2xl border border-[#234745]/5 shadow-sm text-[#234745] font-bold text-sm">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            {isEn ? 'Account' : 'حسابي'}
          </NavLink>
          <NavLink to={isEn ? "/en/account/wishlist" : "/account/wishlist"} onClick={onClose} className="flex flex-col items-center justify-center gap-2 p-4 bg-white rounded-2xl border border-[#234745]/5 shadow-sm !text-[#234745] font-bold text-sm">
            <div className="relative">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
              <WishlistBadge />
            </div>
            {isEn ? 'Wishlist' : 'المفضلة'}
          </NavLink>
        </div>

        <div className="space-y-2">
          {NAV_ITEMS.map((item: any) => {
            const isOffers = item.url.includes('promotions') || item.url.includes('offers');
            const isExternal = item.isExternal || item.url.startsWith('http');

            if (isExternal) {
              return (
                <a
                  key={item.url}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                  className="flex items-center justify-between px-6 py-4 rounded-2xl text-[16px] font-bold transition-all bg-white text-[#234745] shadow-sm hover:bg-gray-50"
                >
                  <span className="text-[#234745]">{item.title}</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                </a>
              );
            }

            return (
              <NavLink
                key={item.url}
                to={item.url}
                onClick={onClose}
                end={item.url === '/' || item.url === '/en'}
                prefetch="intent"
                className={({ isActive }) => `
                  flex items-center justify-between px-6 py-4 rounded-2xl text-[16px] font-bold transition-all
                  ${isOffers
                    ? 'bg-[#e64950] !text-white'
                    : isActive
                      ? 'bg-[#234745] !text-white shadow-md'
                      : 'bg-white text-[#234745] shadow-sm hover:bg-gray-50'
                  }
                `}
                style={({ isActive }) => (
                  isOffers
                    ? { color: '#FFFFFF', backgroundColor: '#e64950' }
                    : isActive
                      ? { color: '#FFFFFF', backgroundColor: '#234745' }
                      : { color: '#234745' }
                )}
              >
                {({ isActive }) => (
                  <>
                    <span className={isActive || isOffers ? '!text-white' : 'text-[#234745]'} style={{ color: isActive || isOffers ? '#FFFFFF' : '#234745' }}>
                      {item.title}
                    </span>
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      className={`${isEn ? '' : 'rotate-180'} ${isActive || isOffers ? '!text-white' : 'text-[#234745]'}`}
                      style={{ color: isActive || isOffers ? '#FFFFFF' : '#234745' }}
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>
    </div>
  );
}
function WishlistBadge() {
  const { wishlist } = useWishlist();
  const count = wishlist.length;
  if (count === 0) return null;
  return (
    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#e34242] text-white text-[9px] rounded-full flex items-center justify-center shadow-sm border border-white">
      {count}
    </span>
  );
}
