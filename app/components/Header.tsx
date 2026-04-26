import { Await, NavLink, useMatches, Form, useLocation, useFetcher } from 'react-router';
import React, { Suspense, useState, useEffect } from 'react';
import type { HeaderQuery, CartApiQueryFragment } from 'storefrontapi.generated';
import { Button } from './layout/Button';
import { DeliveryPickupModal } from './DeliveryPickupModal';
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
  const isEn = locale === 'en';
  const fetcher = useFetcher();
  const locationFetcher = useFetcher();

  const handleSelectBranch = (branchName: string, id: string, type: 'delivery' | 'pickup') => {
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

  return (
    <header className={`w-full ${isEn ? 'font-en' : 'font-ar'} bg-[#FEF8EB] relative z-50`} dir={isEn ? 'ltr' : 'rtl'}>
      <TopBar 
        locale={locale} 
        locations={locations} 
        customer={customer}
        googleMapsKey={googleMapsKey}
        selectedLocationName={selectedLocationName} 
        fulfillmentType={fulfillmentType} 
        onSelectBranch={handleSelectBranch} 
      />
      <MiddleBar 
        isLoggedIn={isLoggedIn} 
        cart={cart} 
        locale={locale} 
        menu={menu}
      />
    </header>
  );
}

// ─── ROW 1: TOP BAR ────────────────────────────────────────────────────────
function TopBar({ locale, locations, customer, googleMapsKey, selectedLocationName, fulfillmentType, onSelectBranch }: { locale?: string, locations?: Promise<any>, customer?: Promise<any>, googleMapsKey?: string, selectedLocationName?: string, fulfillmentType?: string, onSelectBranch: any }) {
  const isEn = locale === 'en';
  const location = useLocation();
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setModalOpen(true);
    window.addEventListener('openDeliveryModal', handleOpen);
    return () => window.removeEventListener('openDeliveryModal', handleOpen);
  }, []);

  const getReturnTo = () => {
    const currentPath = location.pathname;
    const currentSearch = location.search;
    if (isEn) return currentPath.replace(/^\/en(\/|$)/, '/') + currentSearch;
    return `/en${currentPath === '/' ? '' : currentPath}${currentSearch}`;
  };

  return (
    <div className="w-full border-b border-[#1b3d2e]/5">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 h-[44px] flex items-center justify-between text-[13px] font-medium text-[#1b3d2e]">
        {/* LEFT: Language & Branch */}
        <div className="flex items-center gap-4">
          <Form action="/api/locale" method="post" className="flex items-center" reloadDocument>
            <input type="hidden" name="locale" value={isEn ? 'ar' : 'en'} />
            <input type="hidden" name="returnTo" value={getReturnTo()} />
            <button type="submit" className="flex items-center gap-1.5 hover:opacity-70 transition-opacity">
              <span className="font-bold">{isEn ? 'العربية' : 'English'}</span>
              <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><path d="M5 7l5 5 5-5H5z" /></svg>
            </button>
          </Form>

          <button 
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#1b3d2e]/20 bg-white/40 text-[12px] font-bold hover:bg-white transition-all shadow-sm"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
            <span className="truncate max-w-[120px]">{selectedLocationName || (isEn ? 'Select Branch' : 'فرع العليا')}</span>
            <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor"><path d="M5 7l5 5 5-5H5z" /></svg>
          </button>
        </div>

        {/* RIGHT: Promo badges */}
        <div className="hidden md:flex items-center gap-6 opacity-80">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            <span className="font-bold">{isEn ? 'Guaranteed Quality' : 'جودة مضمونة'}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 10l-2 2h19l-2-2m-15 0l2-2h11l2 2m-13 0v10h11v-10m-13 0h13"/></svg>
            <span className="font-bold">{isEn ? 'Fast Delivery' : 'توصيل سريع'}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            <span className="font-bold">{isEn ? 'Secure Payment' : 'دفع آمن ومضمون'}</span>
          </div>
        </div>
      </div>
      
      <DeliveryPickupModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        locationsPromise={locations}
        customerPromise={customer}
        googleMapsKey={googleMapsKey}
        locale={locale}
        onSelectBranch={onSelectBranch}
        defaultTab={fulfillmentType as any || 'delivery'}
      />
    </div>
  );
}

// ─── ROW 2: MAIN BAR ────────────────────────────────────────────────────────
function MiddleBar({ 
  isLoggedIn, 
  cart, 
  locale,
  menu
}: { 
  isLoggedIn: boolean | Promise<boolean>; 
  cart: HeaderProps['cart']; 
  locale?: string, 
  menu: any
}) {
  const { open } = useAside();
  const isEn = locale === 'en';

  return (
    <div className="w-full py-3 lg:py-4 border-b border-[#1b3d2e]/5">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6">
        {/* Use 1fr auto 1fr to give the sides maximum available space while keeping logo centered */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center w-full">
          
          {/* RIGHT (in RTL) / LEFT (in LTR): Desktop Nav & Mobile Menu */}
          <div className="flex items-center justify-start min-w-0">
            <button 
              onClick={() => open('mobile')} 
              className="lg:hidden p-1 text-[#1b3d2e] hover:opacity-70 transition-opacity shrink-0"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
            </button>
            <div className="hidden lg:block">
              <CategoryNav locale={locale} />
            </div>
          </div>

          {/* CENTER: Logo (Centered relative to the grid sides) */}
          <div className="flex justify-center px-4 lg:px-12 shrink-0">
            <NavLink to={isEn ? "/en" : "/"} prefetch="intent" className="flex items-center justify-center w-[120px] lg:w-[150px] transition-transform hover:scale-[1.02]">
              <img src="/logo.svg" alt="SAADEDDIN" className="w-full h-auto object-contain" />
            </NavLink>
          </div>

          {/* LEFT (in RTL) / RIGHT (in LTR): Icons & Search */}
          <div className="flex items-center gap-4 lg:gap-8 justify-end">
            <div className="flex-1 max-w-[280px] hidden xl:block">
              <GlobalSearchBar locale={locale} />
            </div>

            <div className="flex items-center gap-4 lg:gap-6 shrink-0 text-[#1b3d2e]">
              <NavLink to={isEn ? "/en/account" : "/account"} className="group flex items-center gap-2 hover:opacity-70 transition-all font-bold text-[13px]">
                <span className="hidden lg:block">{isEn ? 'Account' : 'حسابي'}</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              </NavLink>

              <button onClick={() => open('cart')} className="group flex items-center gap-2 hover:opacity-70 transition-all relative font-bold text-[13px]">
                <span className="hidden lg:block">{isEn ? 'Cart' : 'السلة'}</span>
                <div className="relative">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" /></svg>
                  <Suspense fallback={null}>
                    <Await resolve={cart}>{(cartData) => {
                      const count = cartData?.totalQuantity ?? 0;
                      if (count === 0) return null;
                      return <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#e34242] text-white text-[9px] rounded-full flex items-center justify-center shadow-sm border border-white">{count}</span>
                    }}</Await>
                  </Suspense>
                </div>
              </button>

              <NavLink to="/wishlist" className="group flex items-center gap-2 hover:opacity-70 transition-all font-bold text-[13px]">
                <span className="hidden lg:block">{isEn ? 'Wishlist' : 'المفضلة'}</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
              </NavLink>
              
              <button 
                onClick={() => open('search')} 
                className="xl:hidden p-1 text-[#1b3d2e] hover:opacity-70 transition-opacity"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── ROW 3: CATEGORY NAV ────────────────────────────────────────────────────
const STATIC_NAV_AR = [
  { title: 'الرئيسية', url: '/' },
  { title: 'المنتجات', url: '/collections/all' },
  { title: 'المناسبات', url: '/collections/occasions' },
  { title: 'الهدايا', url: '/collections/gifts' },
  { title: 'الكيك المخصص', url: '/pages/design-cake' },
  { title: 'العروض', url: '/collections/offers' },
  { title: 'الفروع', url: '/pages/branches' },
];

const STATIC_NAV_EN = [
  { title: 'Home', url: '/en' },
  { title: 'Products', url: '/en/collections/all' },
  { title: 'Occasions', url: '/en/collections/occasions' },
  { title: 'Gifts', url: '/en/collections/gifts' },
  { title: 'Custom Cake', url: '/en/pages/design-cake' },
  { title: 'Offers', url: '/en/collections/offers' },
  { title: 'Branches', url: '/en/pages/branches' },
];

function CategoryNav({ locale }: { locale?: string }) {
  const isEn = locale === 'en';
  const NAV_ITEMS = isEn ? STATIC_NAV_EN : STATIC_NAV_AR;

  return (
    <nav className="flex items-center gap-1 xl:gap-2">
      {NAV_ITEMS.map((item) => {
        const isOffers = item.url.includes('offers');
        return (
          <NavLink
            key={item.url}
            to={item.url}
            prefetch="intent"
            end={item.url === '/' || item.url === '/en'}
            className={({ isActive }) => `
              px-2 xl:px-3 py-2 text-[13px] xl:text-[14px] font-bold transition-all whitespace-nowrap rounded-full
              ${isOffers 
                ? 'bg-[#e34242] text-white hover:bg-[#c93636] px-4 xl:px-5 shadow-sm' 
                : isActive ? 'text-[#1b3d2e] bg-[#1b3d2e]/5' : 'text-[#1b3d2e]/80 hover:text-[#1b3d2e] hover:bg-[#1b3d2e]/5'}
            `}
          >
            {item.title}
          </NavLink>
        );
      })}
    </nav>
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
  const isEn = locale === 'en';
  const NAV_ITEMS = isEn ? STATIC_NAV_EN : STATIC_NAV_AR;

  return (
    <div className="flex flex-col h-full bg-[#FEF8EB]">
      <div className="px-4 py-6 flex flex-col gap-2">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            onClick={onClose}
            prefetch="intent"
            className={({ isActive }) => `
              px-5 py-4 rounded-2xl text-[16px] font-bold transition-all
              ${isActive ? 'bg-[#1b3d2e] text-white' : 'bg-white text-[#1b3d2e] shadow-sm'}
            `}
          >
            {item.title}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
