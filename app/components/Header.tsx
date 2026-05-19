import { Await, NavLink, useMatches, Form, useLocation, useFetcher } from 'react-router';
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
};
type Viewport = 'desktop' | 'mobile';

// ─── MAIN HEADER ────────────────────────────────────────────────────────────
export function Header({ header, isLoggedIn, cart, locations, customer, locale, googleMapsKey, selectedLocationId, selectedLocationName, selectedAddressName, fulfillmentType }: HeaderProps) {
  const { shop, menu } = header;
  const isEn = locale === 'en';
  const fetcher = useFetcher();
  const locationFetcher = useFetcher();

  const handleSelectBranch = async (branch: any, type: 'delivery' | 'pickup', addressName?: string, isOutOfRange?: boolean) => {
    const branchName = branch?.name || 'Main';
    const branchId = branch?.id || '';

    // Update cart attributes
    const attributes = [
      { key: 'Branch', value: branchName },
      { key: 'Branch ID', value: branchId },
      { key: 'Fulfillment Type', value: type === 'delivery' ? 'Delivery' : 'Pickup' }
    ];

    if (addressName) {
      attributes.push({ key: 'Delivery Address', value: addressName });
    }
    
    if (isOutOfRange) {
        attributes.push({ key: 'error', value: isEn ? 'Your address is outside our delivery range. You may not be able to complete checkout.' : 'عنوانك خارج نطاق التوصيل. قد لا تتمكن من إتمام الطلب.' });
    } else {
        attributes.push({ key: 'error', value: '' }); // clear error
    }
    
    if (type === 'delivery' && typeof branch?.deliveryFee === 'number') {
      attributes.push({ key: 'Delivery Fee', value: branch.deliveryFee.toString() });
    }
    
    if (typeof branch?.freeDeliveryThreshold === 'number') {
        attributes.push({ key: 'Free Delivery Threshold', value: branch.freeDeliveryThreshold.toString() });
    }
    
    if (typeof branch?.minOrder === 'number') {
        attributes.push({ key: 'Minimum Order Value', value: branch.minOrder.toString() });
    }

    // Update Buyer Identity for Pickup skip
    let buyerIdentity = undefined;
    if (type === 'pickup' && branch) {
       const resolvedCustomer = await customer;
       buyerIdentity = {
         deliveryAddressPreferences: [{
           deliveryAddress: {
             address1: branch.address || '',
             city: branch.city || '',
             country: 'SA',
             firstName: resolvedCustomer?.firstName || '',
             lastName: resolvedCustomer?.lastName || ''
           }
         }]
       };
    }

    const cartFormInput = {
      action: 'FulfillmentUpdate',
      inputs: {
        attributes,
        buyerIdentity
      }
    };

    const formData = new FormData();
    formData.append('cartFormInput', JSON.stringify(cartFormInput));
    
    const cartAction = isEn ? '/en/cart' : '/cart';
    fetcher.submit(formData, { method: 'POST', action: cartAction });

    // Update session location
    const locFormData = new FormData();
    locFormData.append('locationId', branchId);
    locFormData.append('branchName', branchName);
    locFormData.append('fulfillmentType', type);
    if (addressName) {
      locFormData.append('addressName', addressName);
    }
    locationFetcher.submit(locFormData, { method: 'POST', action: '/api/location-id' });
  };

  const [activeMega, setActiveMega] = useState<string | null>(null);

  return (
    <header 
      className={`w-full ${isEn ? 'font-en' : 'font-ar'} bg-[#FEF8EB] relative z-50`} 
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
        {activeMega === 'products' && <ProductMegaMenu locale={locale} />}
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
    <div className="w-full bg-[#234745] text-white">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 h-[40px] flex items-center justify-between text-[12px] md:text-[13px] font-medium">
        
        {/* RIGHT: Promo badges */}
        <div className="hidden md:flex items-center gap-8">
          <div className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-default">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-90"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
            <span className="font-bold">{isEn ? 'Guaranteed Quality' : 'جودة مضمونة'}</span>
          </div>
          <div className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-default">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-90"><rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>
            <span className="font-bold">{isEn ? 'Fast Delivery' : 'توصيل سريع'}</span>
          </div>
          <div className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-default">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-90"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            <span className="font-bold">{isEn ? 'Secure Payment' : 'دفع آمن ومضمون'}</span>
          </div>
        </div>

        {/* LEFT: Language & Branch */}
        <div className="flex items-center gap-4">
          <Form action="/api/locale" method="post" className="flex items-center" reloadDocument>
            <input type="hidden" name="locale" value={isEn ? 'ar' : 'en'} />
            <input type="hidden" name="returnTo" value={getReturnTo()} />
            <button type="submit" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity font-normal text-[#FEF8EB]">
              <span>{isEn ? 'العربية' : 'English'}</span>
              <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor" className="opacity-70"><path d="M5 7l5 5 5-5H5z" /></svg>
            </button>
          </Form>

          <button 
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-4 px-6 py-1.5 rounded-full bg-[#B2C4C0]/50 border border-[#234745]/30 text-[12px] md:text-[13px] font-bold hover:bg-[#B2C4C0]/70 transition-all text-[#234745]"
          >
            <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" className="opacity-80"><path d="M5 7l5 5 5-5H5z" /></svg>
            <div className="relative">
              <span className="truncate max-w-[120px]">
                {fulfillmentType === 'delivery' && selectedAddressName 
                  ? (isEn ? `Delivery: ${selectedAddressName}` : `توصيل: ${selectedAddressName}`) 
                  : (selectedLocationName || (isEn ? 'Select Branch' : 'فرع العليا'))
                }
              </span>
              <div className="absolute -top-1.5 -right-2.5 w-2.5 h-2.5 rounded-full bg-[#4ADE80] shadow-[0_0_8px_rgba(74,222,128,0.4)]" />
            </div>
          </button>
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
        selectedLocationId={selectedLocationId}
        selectedAddressName={selectedAddressName}
      />
    </div>
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
  const isEn = locale === 'en';

  return (
    <div className="w-full py-3 lg:py-4 border-b border-[#234745]/5">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6">
        {/* Use 1fr auto 1fr to give the sides maximum available space while keeping logo centered */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center w-full">
          
          {/* RIGHT (in RTL) / LEFT (in LTR): Desktop Nav & Mobile Menu */}
          <div className="flex items-center justify-start min-w-0">
            <button 
              onClick={() => open('mobile')} 
              className="lg:hidden p-1 text-[#234745] hover:opacity-70 transition-opacity shrink-0"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
            </button>
            <div className="hidden lg:block">
              <CategoryNav locale={locale} activeMega={activeMega} setActiveMega={setActiveMega} />
            </div>
          </div>

          {/* CENTER: Logo (Centered relative to the grid sides) */}
          <div className="flex justify-center px-2 lg:px-12 shrink-0">
            <NavLink to={isEn ? "/en" : "/"} prefetch="intent" className="flex items-center justify-center w-[100px] md:w-[120px] lg:w-[150px] transition-transform hover:scale-[1.02]">
              <img src="/logo.svg" alt="SAADEDDIN" className="w-full h-auto object-contain" />
            </NavLink>
          </div>

          {/* LEFT (in RTL) / RIGHT (in LTR): Icons & Search */}
          <div className="flex items-center gap-3 lg:gap-6 justify-end">
            <div className="flex-1 max-w-[280px] hidden xl:block">
              <GlobalSearchBar locale={locale} />
            </div>

            <div className="flex items-center gap-2 md:gap-4 lg:gap-6 shrink-0 text-[#234745]">
              {/* Account - Desktop Only */}
              <NavLink to={isEn ? "/en/account" : "/account"} className="hidden lg:flex group items-center gap-2 hover:opacity-70 transition-all font-bold text-[13px]">
                <span>{isEn ? 'Account' : 'حسابي'}</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              </NavLink>

              {/* Wishlist - Desktop Only */}
              <NavLink to={isEn ? "/en/account/wishlist" : "/account/wishlist"} className="hidden lg:flex group items-center gap-2 hover:opacity-70 transition-all font-bold text-[13px]">
                <span>{isEn ? 'Wishlist' : 'المفضلة'}</span>
                <div className="relative">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                  <WishlistBadge />
                </div>
              </NavLink>

              {/* Search - Visible on Mobile & Medium screens */}
              <button 
                onClick={() => open('search')} 
                className="xl:hidden p-2 text-[#234745] hover:bg-[#234745]/5 rounded-full transition-all"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              </button>

              {/* Cart - Always Visible */}
              <button onClick={() => open('cart')} className="group flex items-center gap-2 hover:opacity-70 transition-all relative p-2">
                <div className="relative">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" /></svg>
                  <Suspense fallback={null}>
                    <Await resolve={cart}>{(cartData) => {
                      const count = cartData?.totalQuantity ?? 0;
                      if (count === 0) return null;
                      return <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#e34242] text-white text-[9px] rounded-full flex items-center justify-center shadow-sm border border-white">{count}</span>
                    }}</Await>
                  </Suspense>
                </div>
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
  { title: 'المنتجات', url: '/collections/all', hasMega: true },
  { title: 'المناسبات', url: '/collections/occasions' },
  { title: 'الهدايا', url: '/collections/gifts' },
  { title: 'الكيك المخصص', url: '/pages/design-cake' },
  { title: 'العروض', url: '/collections/offers' },
];

const STATIC_NAV_EN = [
  { title: 'Products', url: '/en/collections/all', hasMega: true },
  { title: 'Occasions', url: '/en/collections/occasions' },
  { title: 'Gifts', url: '/en/collections/gifts' },
  { title: 'Custom Cake', url: '/en/pages/design-cake' },
  { title: 'Offers', url: '/en/collections/offers' },
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
  const isEn = locale === 'en';
  const NAV_ITEMS = isEn ? STATIC_NAV_EN : STATIC_NAV_AR;

  return (
    <nav className="flex items-center gap-1 xl:gap-2 h-full">
      {NAV_ITEMS.map((item) => {
        const isOffers = item.url.includes('offers');
        return (
          <div 
            key={item.url} 
            className="h-full flex items-center"
            onMouseEnter={() => item.hasMega ? setActiveMega('products') : setActiveMega(null)}
          >
            <NavLink
              to={item.url}
              prefetch="intent"
              end={item.url === '/' || item.url === '/en'}
              className={({ isActive }) => `
                px-2 xl:px-3 py-2 text-[13px] xl:text-[14px] font-bold transition-all whitespace-nowrap rounded-full
                ${isOffers 
                  ? 'bg-[#e34242] text-white hover:bg-[#c93636] px-4 xl:px-5 shadow-sm' 
                  : (isActive || (item.hasMega && activeMega)) ? 'text-[#234745] bg-[#234745]/5' : 'text-[#234745]/80 hover:text-[#234745] hover:bg-[#234745]/5'}
              `}
            >
              {item.title}
            </NavLink>
          </div>
        );
      })}
    </nav>
  );
}

function ProductMegaMenu({ locale }: { locale?: string }) {
  const isEn = locale === 'en';
  
  const categories = [
    {
      title: isEn ? 'Oriental Sweets' : 'حلويات شرقية',
      image: 'https://cdn.shopify.com/s/files/1/0943/4280/7861/files/category-baklava.jpg?v=1730000000',
      items: isEn ? ['Baklava', 'Maamoul', 'Kunafa', 'Basbousa'] : ['بقلاوة', 'معمول', 'كنافة', 'بسبوسة'],
      url: '/collections/oriental-sweets'
    },
    {
      title: isEn ? 'Premium Chocolates' : 'شوكولاتة فاخرة',
      image: 'https://cdn.shopify.com/s/files/1/0943/4280/7861/files/category-choco.jpg?v=1730000001',
      items: isEn ? ['Truffles', 'Pralines', 'Gift Boxes', 'Wrapped Choco'] : ['ترافلز', 'برالين', 'صناديق هدايا', 'شوكولاتة مغلفة'],
      url: '/collections/chocolates'
    },
    {
      title: isEn ? 'Cakes & Pastries' : 'كيك وحلويات غربية',
      image: 'https://cdn.shopify.com/s/files/1/0943/4280/7861/files/category-cakes.jpg?v=1730000002',
      items: isEn ? ['Occasion Cakes', 'Mini Cakes', 'Macarons', 'Éclairs'] : ['كيك المناسبات', 'ميني كيك', 'ماكرون', 'اكلير'],
      url: '/collections/cakes'
    },
    {
      title: isEn ? 'Ice Cream' : 'آيس كريم',
      image: 'https://cdn.shopify.com/s/files/1/0943/4280/7861/files/category-icecream.jpg?v=1730000003',
      items: isEn ? ['Gelato', 'Sorbet', 'Party Tubs', 'Stick Ice Cream'] : ['جيلاتو', 'سوربيه', 'عبوات الحفلات', 'آيس كريم ستيك'],
      url: '/collections/ice-cream'
    }
  ];

  return (
    <div className="bg-white/95 backdrop-blur-xl border-y border-[#234745]/10 shadow-2xl w-full">
      <div className="max-w-[1400px] mx-auto grid grid-cols-4 gap-8 p-10">
        {categories.map((cat) => (
          <div key={cat.title} className="group cursor-pointer">
            <NavLink to={cat.url} className="block">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-6 shadow-md transition-transform duration-500 group-hover:scale-[1.03]">
                <img src={cat.image} alt={cat.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#234745]/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-white text-lg font-bold">{cat.title}</h3>
                </div>
              </div>
            </NavLink>
            <ul className="space-y-3">
              {cat.items.map((item) => (
                <li key={item}>
                  <NavLink 
                    to={`${cat.url}/${item.toLowerCase().replace(/ /g, '-')}`} 
                    className="text-[#234745]/70 hover:text-[#234745] hover:translate-x-1 transition-all inline-block font-medium text-sm"
                  >
                    {item}
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
          <NavLink to="/collections/all" className="text-[#234745] font-bold hover:underline flex items-center gap-2">
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
  const isEn = locale === 'en';
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
           <NavLink to={isEn ? "/en/account/wishlist" : "/account/wishlist"} onClick={onClose} className="flex flex-col items-center justify-center gap-2 p-4 bg-white rounded-2xl border border-[#234745]/5 shadow-sm text-[#234745] font-bold text-sm">
             <div className="relative">
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
               <WishlistBadge />
             </div>
             {isEn ? 'Wishlist' : 'المفضلة'}
           </NavLink>
        </div>

        <div className="space-y-2">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              onClick={onClose}
              prefetch="intent"
              className={({ isActive }) => `
                flex items-center justify-between px-6 py-4 rounded-2xl text-[16px] font-bold transition-all
                ${isActive ? 'bg-[#234745] text-white' : 'bg-white text-[#234745] shadow-sm'}
              `}
            >
              {item.title}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={isEn ? '' : 'rotate-180'}><polyline points="9 18 15 12 9 6" /></svg>
            </NavLink>
          ))}
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
