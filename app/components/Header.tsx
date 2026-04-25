import { Await, NavLink, useMatches, Form, useLocation, useFetcher } from 'react-router';
import React, { Suspense, useState, useEffect } from 'react';
import { CartForm } from '@shopify/hydrogen';
import type { HeaderQuery, CartApiQueryFragment } from 'storefrontapi.generated';
import { Button } from './layout/Button';
import { DeliveryPickupModal } from './DeliveryPickupModal';
import { BranchSelector } from './BranchSelector';
import { useAside } from '~/components/Aside';
import { useI18n } from '~/lib/i18n';
import { GlobalSearchBar } from './GlobalSearchBar';

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
  fulfillmentType?: 'delivery' | 'pickup';
  publicStoreDomain?: string;
};
type Viewport = 'desktop' | 'mobile';

// ─── MAIN HEADER ────────────────────────────────────────────────────────────
export function Header({ header, isLoggedIn, cart, locations, customer, locale, googleMapsKey, selectedLocationId, selectedLocationName, fulfillmentType }: HeaderProps) {
  const { shop, menu } = header;
  const t = useI18n(locale);
  const isEn = locale === 'en';
  return (
    <header className={`w-full ${isEn ? 'font-en' : 'font-ar'} bg-white shadow-sm border-b relative z-50`} dir={isEn ? 'ltr' : 'rtl'}>
      <TopBar locale={locale} />
      <MiddleBar 
        isLoggedIn={isLoggedIn} 
        cart={cart} 
        shopName={shop.name} 
        locations={locations} 
        customer={customer} 
        locale={locale} 
        googleMapsKey={googleMapsKey} 
        selectedLocationId={selectedLocationId}
        selectedLocationName={selectedLocationName}
        fulfillmentType={fulfillmentType}
      />
      <CategoryNav menu={menu} locale={locale} />
    </header>
  );
}

// ─── ROW 1: TOP BAR ────────────────────────────────────────────────────────
function TopBar({ locale }: { locale?: string }) {
  const t = useI18n(locale);
  const isEn = locale === 'en';
  const location = useLocation();
  const currentPath = location.pathname;
  const currentSearch = location.search;
  
  // Robust returnTo calculation
  const getReturnTo = () => {
    if (isEn) {
      // Switching from EN to AR
      return currentPath.replace(/^\/en(\/|$)/, '/') + currentSearch;
    } else {
      // Switching from AR to EN
      if (currentPath.startsWith('/en')) return currentPath + currentSearch;
      return `/en${currentPath === '/' ? '' : currentPath}${currentSearch}`;
    }
  };

  return (
    <div className="w-full bg-[#1b3d2e] text-white">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 h-[38px] flex items-center justify-between text-[12px] font-medium">
        {/* Social icons */}
        <div className="flex items-center gap-3.5 w-[120px]">
          <a href="#" className="opacity-70 hover:opacity-100 transition-opacity">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5z" /></svg>
          </a>
          <a href="#" className="opacity-70 hover:opacity-100 transition-opacity">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M19.05 4.91A9.816 9.816 0 0012.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01zM12.04 19.93c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a7.89 7.89 0 01-1.2-4.16c0-4.36 3.55-7.91 7.91-7.91 2.11 0 4.1.82 5.59 2.32 1.5 1.49 2.32 3.48 2.32 5.59 0 4.36-3.55 7.91-7.91 7.91zm4.34-5.93c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-1.54-.74-2.61-1.34-3.6-2.55-.26-.32-.03-.49.1-.61.1-.1.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.48-.4-.41-.54-.42l-.46-.02c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.68 2.57 4.08 3.55 1.4.58 1.98.62 2.74.52.42-.06 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28z" /></svg>
          </a>
          <a href="#" className="opacity-70 hover:opacity-100 transition-opacity">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4s1.791-4 4-4 4 1.79 4 4-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
          </a>
        </div>
 
        {/* CENTER: Promo text */}
        <div className="hidden md:flex items-center gap-3 text-white/85 text-[12px]">
          <span>{t.common.installments}</span>
          <span className="text-white/30">|</span>
          <span>{t.common.freeDelivery}</span>
          <span className="text-white/30">|</span>
          <span className="flex items-center gap-1 font-bold text-white">
            <span className="text-yellow-400 text-[13px]">⭐</span> {t.common.pointsEarn}
          </span>
        </div>
 
        {/* Language Switch */}
        <div className="w-[120px] flex justify-end items-center">
          <Form action="/api/locale" method="post" className="flex items-center">
            <input type="hidden" name="locale" value={isEn ? 'ar' : 'en'} />
            <input type="hidden" name="returnTo" value={getReturnTo()} />
            <button
              type="submit"
              className="flex items-center gap-1.5 text-white/85 hover:text-white transition-colors text-[12px] font-medium"
            >
              {isEn ? 'العربية' : 'English'}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-80">
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
            </button>
          </Form>
        </div>
      </div>
    </div>
  );
}

// ─── ROW 2: MIDDLE BAR ──────────────────────────────────────────────────────
function MiddleBar({ 
  isLoggedIn, 
  cart, 
  shopName, 
  locations, 
  customer, 
  locale, 
  googleMapsKey,
  selectedLocationId,
  selectedLocationName,
  fulfillmentType
}: { 
  isLoggedIn: boolean | Promise<boolean>; 
  cart: HeaderProps['cart']; 
  shopName: string; 
  locations?: Promise<any>, 
  customer?: Promise<any>, 
  locale?: string, 
  googleMapsKey?: string,
  selectedLocationId?: string,
  selectedLocationName?: string,
  fulfillmentType?: 'delivery' | 'pickup'
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const { open } = useAside();
  const [activeFulfillment, setActiveFulfillment] = useState<'delivery' | 'pickup'>(fulfillmentType || 'delivery');
  const [selectedBranchName, setSelectedBranchName] = useState<string>(selectedLocationName || '');
  
  // Sync with prop changes
  React.useEffect(() => {
    if (fulfillmentType) setActiveFulfillment(fulfillmentType);
  }, [fulfillmentType]);

  const fetcher = useFetcher();
  const locationFetcher = useFetcher();

  const isEn = locale === 'en';
  const t = useI18n(locale);

  const handleSelectBranch = (branchName: string, id: string, type: 'delivery' | 'pickup') => {
    setSelectedBranchName(branchName);
    setActiveFulfillment(type);

    // Update cart attributes
    const cartFormInput = {
      action: 'AttributesUpdate',
      inputs: {
        attributes: [
          { key: 'Branch', value: branchName },
          { key: 'Branch ID', value: id },
          { key: 'Fulfillment Type', value: type === 'delivery' ? 'Delivery' : 'Pickup' }
        ]
      }
    };

    const formData = new FormData();
    formData.append('cartFormInput', JSON.stringify(cartFormInput));
    fetcher.submit(formData, { method: 'POST', action: '/cart' });

    // Update session location
    const locFormData = new FormData();
    locFormData.append('locationId', id);
    locFormData.append('branchName', branchName);
    locFormData.append('fulfillmentType', type);
    locationFetcher.submit(locFormData, { method: 'POST', action: '/api/location-id' });
  };

  const openDelivery = () => {
    setActiveFulfillment('delivery');
    setModalOpen(true);
  };

  const openPickup = () => {
    setActiveFulfillment('pickup');
    setModalOpen(true);
  };

  return (
    <div className="w-full bg-white border-b border-gray-100 py-2.5 lg:py-3">
      <div className="max-w-[1400px] mx-auto px-3 lg:px-6">
        <div className="flex items-center justify-between gap-1.5 lg:gap-4">
          {/* DESKTOP LEFT (RTL) / RIGHT (LTR): Branch + Delivery toggle */}
          <div className="hidden lg:flex flex-1 items-center gap-2.5 justify-start">
            {/* Contextual Selector (Branch or Address) */}
            {activeFulfillment === 'delivery' ? (
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#f5f3f1] border border-[#e8e4e1] text-[#1b3d2e] text-[13px] font-bold hover:bg-[#ebe8e4] transition-all shadow-sm group"
              >
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-gray-400 font-medium">{isEn ? 'Deliver to:' : 'توصيل إلى:'}</span>
                <span className="truncate max-w-[150px]">{selectedBranchName || (isEn ? 'Select Address' : 'اختر العنوان')}</span>
                <svg width="12" height="12" viewBox="0 0 20 20" fill="#999" className="group-hover:translate-y-0.5 transition-transform">
                  <path d="M5 7l5 5 5-5H5z" />
                </svg>
              </button>
            ) : (
              <BranchSelector 
                locationsPromise={locations}
                locale={locale}
                selectedBranchName={selectedBranchName}
                onSelectBranch={(name: string, id: string) => handleSelectBranch(name, id, 'pickup')}
              />
            )}

            {/* Delivery / Pickup Toggle */}
            <div className="flex items-center bg-[#f5f3f1] rounded-full p-[3px] border border-[#e8e4e1]">
              <Button
                variant={activeFulfillment === 'delivery' ? 'primary' : 'ghost'}
                size="sm"
                className={`py-[7px] text-[12px] whitespace-nowrap ${activeFulfillment === 'delivery' ? 'shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>}
                onClick={openDelivery}
              >
                {isEn ? 'Delivery' : 'توصيل'}
              </Button>
              <Button
                variant={activeFulfillment === 'pickup' ? 'primary' : 'ghost'}
                size="sm"
                className={`py-[7px] text-[12px] whitespace-nowrap ${activeFulfillment === 'pickup' ? 'shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>}
                onClick={openPickup}
              >
                {isEn ? 'Pickup' : 'استلام'}
              </Button>
            </div>
          </div>

          {/* MOBILE LOGO (END/Right in RTL) - Updated sizing */}
          <NavLink to={isEn ? "/en" : "/"} prefetch="intent" className="flex items-center justify-center shrink-0 w-[90px] h-[38px] lg:h-[55px] lg:w-[120px]">
            <img
              src="/logo.svg"
              alt="SAADEDDIN"
              className="w-full h-full object-contain pointer-events-none"
            />
          </NavLink>

          {/* DESKTOP RIGHT (RTL) / LEFT (LTR): Search + Points + Icons */}
          <div className="hidden lg:flex flex-1 items-center gap-2.5 justify-end">
            <GlobalSearchBar locale={locale} />

            <div className="flex items-center gap-1.5 bg-[#f5f3f1] border border-[#e8e4e1] text-[#1b3d2e] px-3.5 py-2 rounded-full text-[12px] font-bold whitespace-nowrap">
              <span className="text-yellow-500 text-[13px]">⭐</span>
              {t.common.pointsVal}
            </div>

            <button
              className="w-[38px] h-[38px] flex items-center justify-center rounded-full bg-[#f5f3f1] text-[#1b3d2e] relative"
              onClick={() => {
                console.log('Cart button clicked (plain)!');
                open('cart');
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" /></svg>
              <Suspense fallback={null}><Await resolve={cart}>{(cartData) => {
                const count = cartData?.totalQuantity ?? 0;
                if (count === 0) return null;
                return <span className="absolute -top-1 -end-1 min-w-[17px] h-[17px] px-0.5 bg-[#1b3d2e] text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white">{new Intl.NumberFormat(isEn ? 'en-US' : 'ar-EG').format(count)}</span>
              }}</Await></Suspense>
            </button>
            <Button aria-label="Favorites" variant="light" size="md" className="w-[38px] h-[38px] p-0 rounded-full text-red-400" icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z" /></svg>} />
            <Button to={isEn ? "/en/account" : "/account"} prefetch="intent" aria-label="Account" variant="light" size="md" className="w-[38px] h-[38px] p-0 rounded-full text-gray-500" icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>} />
          </div>

          {/* MOBILE ICONS (START/Left in RTL) - Increased z-index to ensure taps always register */}
          <div className="flex lg:hidden items-center gap-1.5 ms-0 min-w-0 relative z-[60]">
            <button
              onClick={() => {
                console.log('Opening mobile menu...');
                open('mobile');
              }}
              type="button"
              className="w-[34px] h-[34px] flex items-center justify-center rounded-full bg-[#f5f3f1] text-[#1b3d2e] shrink-0 border-0"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
            </button>

            <Button
              variant="light"
              className="w-[34px] h-[34px] p-0 rounded-full text-gray-400 shrink-0 border-0"
              icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>}
              onClick={() => open('search')}
            />

            <Button
              variant="light"
              className="w-[34px] h-[34px] p-0 rounded-full text-gray-500 relative shrink-0 border-0"
              icon={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" /></svg>}
              onClick={() => open('cart')}
            >
              <Suspense fallback={null}><Await resolve={cart}>{(cartData) => {
                const count = cartData?.totalQuantity ?? 0;
                if (count === 0) return null;
                return <span className="absolute -top-0.5 -end-0.5 min-w-[15px] h-[15px] bg-[#1b3d2e] text-white text-[8px] font-bold rounded-full flex items-center justify-center border border-white">{count}</span>
              }}</Await></Suspense>
            </Button>

            {/* Loyalty points moved slightly or simplified for narrow screens */}
            <div className="hidden min-[380px]:flex items-center gap-1 bg-yellow-50/50 border border-yellow-100/50 text-[#1b3d2e] px-2 py-1 rounded-full text-[10px] font-bold shrink-0">
              <span className="text-yellow-500">⭐</span>
              {t.common.pointsVal.split(' ')[0]}
            </div>
          </div>
        </div>

        {/* MOBILE SECOND ROW: Unified Fulfillment Bar */}
        <div className="flex lg:hidden mt-3 pt-2.5 border-t border-gray-50">
          <button
            onClick={() => setModalOpen(true)}
            className="w-full flex items-center justify-between bg-[#fcfaf8] border border-[#f0ece8] rounded-xl p-2.5 text-start transition-all hover:bg-[#f5f1ed] active:scale-[0.98]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${activeFulfillment === 'delivery' ? 'bg-[#1b3d2e] text-white' : 'bg-[#d4a06a] text-white'}`}>
                {activeFulfillment === 'delivery' ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold text-[#1b3d2e] truncate">
                    {activeFulfillment === 'delivery' ? (isEn ? 'Delivery to' : 'توصيل إلى') : (isEn ? 'Pickup from' : 'استلام من')} {selectedBranchName}
                  </span>
                  <span className="shrink-0 bg-white border border-[#e8e4e1] text-[#1b3d2e]/60 text-[9px] px-1.5 py-0.5 rounded-full font-medium">
                    {activeFulfillment === 'delivery' ? (isEn ? 'Fast' : 'سريع') : (isEn ? 'Ready' : 'جاهز')}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 truncate mt-0.5 opacity-80">
                  {isEn ? 'Tap to change branch or fulfillment' : 'اضغط لتغيير الفرع أو طريقة الاستلام'}
                </p>
              </div>
            </div>
            <div className="shrink-0 ms-2 text-gray-300">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          </button>
        </div>
      </div>

      {/* Delivery/Pickup Modal */}
      <DeliveryPickupModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultTab={activeFulfillment}
        locationsPromise={locations}
        customerPromise={customer}
        locale={locale}
        googleMapsKey={googleMapsKey}
        onSelectBranch={handleSelectBranch}
      />
    </div>
  );
}
// ─── ROW 3: CATEGORY NAV ────────────────────────────────────────────────────
const STATIC_NAV_AR = [
  { title: 'الرئيسية', url: '/' },
  { title: 'الشوكولاته', url: '/collections/chocolate' },
  { title: 'الكيك', url: '/collections/cakes' },
  { title: 'الحلويات الشرقية', url: '/collections/oriental' },
  { title: 'القهوة', url: '/collections/coffee' },
  { title: 'البسكويت', url: '/collections/biscuits' },
  { title: 'المناسبات', url: '/collections/occasions' },
  { title: 'الهدايا 🎁', url: '/collections/gifts' },
];

const STATIC_NAV_EN = [
  { title: 'Home', url: '/en' },
  { title: 'Chocolate', url: '/en/collections/chocolate' },
  { title: 'Cakes', url: '/en/collections/cakes' },
  { title: 'Oriental Sweets', url: '/en/collections/oriental' },
  { title: 'Coffee', url: '/en/collections/coffee' },
  { title: 'Biscuits', url: '/en/collections/biscuits' },
  { title: 'Occasions', url: '/en/collections/occasions' },
  { title: 'Gifts 🎁', url: '/en/collections/gifts' },
];

function CategoryNav({ menu, locale }: { menu: HeaderProps['header']['menu'], locale?: string }) {
  const t = useI18n(locale);
  const isEn = locale === 'en';
  const NAV_ITEMS = isEn ? STATIC_NAV_EN : STATIC_NAV_AR;

  return (
    <nav className="w-full bg-white hidden lg:block border-t border-gray-100">
      <div className="max-w-[1400px] mx-auto px-6 h-[48px] flex items-center justify-between">

        {/* RIGHT (or start): Main categories */}
        <div className="flex items-center h-full">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              prefetch="intent"
              end={item.url === '/' || item.url === '/en'}
              className={({ isActive }) => `
                h-full flex items-center px-3 xl:px-4 font-bold text-[14px] transition-all relative whitespace-nowrap
                ${isActive ? 'text-[#1b3d2e]' : 'text-gray-600 hover:text-[#1b3d2e]'}
              `}
            >
              {({ isActive }) => (
                <>
                  {item.title}
                  {isActive && (
                    <div className="absolute bottom-0 start-0 w-full h-[2.5px] bg-[#1b3d2e] rounded-t-sm" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>

        {/* LEFT (or end) Special items */}
        <div className="flex items-center h-full gap-1">
          <Button
            to={isEn ? "/en/pages/design-cake" : "/pages/design-cake"}
            prefetch="intent"
            variant="ghost"
            size="sm"
            className="h-full px-4 font-bold text-[14px] text-[#c0392b] hover:text-[#a93226] transition-colors whitespace-nowrap gap-1 rounded-none hover:bg-transparent"
            rightIcon={<span>🔥</span>}
          >
            {t.common.designYourCake}
          </Button>
          <Button
            to={isEn ? "/en/collections/offers" : "/collections/offers"}
            prefetch="intent"
            variant="ghost"
            size="sm"
            className="h-full px-4 font-bold text-[14px] text-[#1b3d2e] hover:text-[#2d5e47] transition-colors whitespace-nowrap rounded-none hover:bg-transparent"
          >
            {t.common.offers}
          </Button>
        </div>
      </div>
    </nav>
  );
}

// ─── STUBS FOR ASIDE COMPATIBILITY ──────────────────────────────────────────
export function HeaderMenu({
  menu,
  viewport,
  locations,
  locale,
  selectedLocationId,
  selectedLocationName,
  fulfillmentType,
  onClose
}: {
  menu: HeaderProps['header']['menu'];
  viewport: Viewport;
  locations?: Promise<any>;
  locale?: string;
  selectedLocationId?: string;
  selectedLocationName?: string;
  fulfillmentType?: 'delivery' | 'pickup';
  onClose?: () => void;
}) {
  const location = useLocation();
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Mobile-only: Quick category links */}
      <div className="px-4 py-4 flex flex-col gap-1.5 border-b border-gray-50">
        {(locale === 'en' ? STATIC_NAV_EN : STATIC_NAV_AR).map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            onClick={onClose}
            prefetch="intent"
            className={({ isActive }) => `
              flex items-center justify-between px-4 py-3.5 rounded-xl text-[15px] font-bold transition-all
              ${isActive ? 'bg-[#fcfaf5] text-[#1b3d2e] border border-[#f0eee9]' : 'text-gray-700 hover:bg-gray-50'}
            `}
          >
            <span>{item.title}</span>
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" className="text-gray-300">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </NavLink>
        ))}
        {/* Added Account link to menu since it's hidden in main header */}
        <NavLink
          to={locale === 'en' ? "/en/account" : "/account"}
          onClick={onClose}
          prefetch="intent"
          className="flex lg:hidden items-center justify-between px-4 py-3.5 rounded-xl text-[15px] font-bold transition-all text-gray-700 hover:bg-gray-50 border-t border-gray-50"
        >
          <div className="flex items-center gap-2.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-gray-400"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            <span>{locale === 'en' ? 'My Account' : 'حسابي'}</span>
          </div>
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" className="text-gray-300">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </NavLink>
      </div>

      {/* Additional Menu Items (if any from Shopify menu) */}
      <div className="p-4 flex flex-col gap-3">
        {(menu?.items || []).map((item) => {
          if (!item.url) return null;
          const url = item.url.includes('myshopify.com')
            ? new URL(item.url).pathname
            : item.url;

          return (
            <NavLink
              key={item.id}
              to={url}
              onClick={onClose}
              prefetch="intent"
              className="px-4 py-2 text-[14px] font-medium text-gray-500 hover:text-[#1b3d2e]"
            >
              {item.title}
            </NavLink>
          );
        })}
      </div>
      
      {/* Mobile-only: Language Selection */}
      <div className="p-4 mt-auto border-t border-gray-100 bg-[#fafafa]">
        <Form action="/api/locale" method="post" className="flex gap-2">
           <input type="hidden" name="returnTo" value={locale === 'en' ? location.pathname.replace(/^\/en(\/|$)/, '/') || '/' : `/en${location.pathname === '/' ? '' : location.pathname}${location.search}`} />
           <button 
             type="submit" 
             name="locale" 
             value="ar"
             className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-bold transition-all text-xs ${locale === 'ar' ? 'bg-[#1b3d2e] border-[#1b3d2e] text-white shadow-sm' : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'}`}
           >
             العربية
           </button>
           <button 
             type="submit" 
             name="locale" 
             value="en"
             className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-bold transition-all text-xs ${locale === 'en' ? 'bg-[#1b3d2e] border-[#1b3d2e] text-white shadow-sm' : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'}`}
           >
             English
           </button>
        </Form>
      </div>
    </div>
  );
}
