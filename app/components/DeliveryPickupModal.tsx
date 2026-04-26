import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Await, useFetcher, useRouteLoaderData, Link, useLocation } from 'react-router';
import { Suspense } from 'react';
import { Price } from './Price';
import { Button } from './layout/Button';
import { useI18n } from '~/lib/i18n';
import { StarRating } from './StarRating';

// ─── TYPES ──────────────────────────────────────────────────────────────────
export type Tab = 'delivery' | 'pickup';

export interface Branch {
    id: string;
    name: string;
    address: string;
    city: string;
    lat: number;
    lng: number;
    phone: string;
    status: 'open' | 'closed';
    openUntil: string;
    pickupStatus?: 'open' | 'closed';
    pickupOpenUntil?: string;
    deliveryStatus?: 'open' | 'closed';
    deliveryOpenUntil?: string;
    deliveryAvailable: boolean;
    minOrder: number;
    deliveryFee: number;
    freeDeliveryThreshold: number;
    distance?: string;
    google_maps?: string;
    distanceKm?: number;
    rating?: number;
    ratingCount?: number;
    badge?: string;
}

interface DeliveryPickupModalProps {
    isOpen: boolean;
    onClose: () => void;
    defaultTab?: Tab;
    locationsPromise?: Promise<any>;
    customerPromise?: Promise<any>;
    locale?: string;
    googleMapsKey?: string;
    onSelectBranch?: (name: string, id: string, type: Tab) => void;
}

// ─── FALLBACK DATA ────────────────────────────────────────────────────────
export const FALLBACK_BRANCHES: Branch[] = [
    {
        id: 'fallback-1',
        name: 'فرع العليا',
        address: 'RQFA8123 · 8123 · حي 3245 · 30 ، الرياض 14253',
        city: 'الرياض',
        lat: 24.7136,
        lng: 46.6753,
        phone: '',
        status: 'closed',
        openUntil: '03:00 م',
        deliveryAvailable: true,
        minOrder: 40,
        deliveryFee: 0,
        freeDeliveryThreshold: 200,
        badge: 'طلب مسبق',
    },
    {
        id: 'fallback-2',
        name: 'فرع الحمراء',
        address: 'Al-Hamra 4C · Al-Hamra، جدة 23323',
        city: 'جدة',
        lat: 21.5169,
        lng: 39.2192,
        phone: '',
        status: 'closed',
        openUntil: '03:00 م',
        deliveryAvailable: true,
        minOrder: 40,
        deliveryFee: 0,
        freeDeliveryThreshold: 200,
        badge: 'طلب مسبق',
    },
    {
        id: 'fallback-3',
        name: 'خميس مشيط',
        address: '7P98+1RG3 خميس مشيط، المملكة العربية السعودية',
        city: 'خميس مشيط',
        lat: 18.3006,
        lng: 42.7450,
        phone: '',
        status: 'open',
        openUntil: '01:45 ص',
        deliveryAvailable: true,
        minOrder: 40,
        deliveryFee: 0,
        freeDeliveryThreshold: 200,
        badge: 'طلب مسبق',
    },
    {
        id: 'fallback-4',
        name: 'سكاكا',
        address: '36G1 7444 طريق الملك فهد، سكاكا 72341464.91 كم',
        city: 'سكاكا',
        lat: 31.3267,
        lng: 37.3440,
        phone: '',
        status: 'closed',
        openUntil: '02:00 م',
        deliveryAvailable: true,
        minOrder: 40,
        deliveryFee: 0,
        freeDeliveryThreshold: 200,
        badge: 'طلب مسبق',
    },
    {
        id: 'fallback-5',
        name: 'الريات',
        address: '88YV+QW3 القريات، المملكة العربية السعودية 152.32 كم',
        city: 'القريات',
        lat: 31.3267,
        lng: 37.3440,
        phone: '',
        status: 'closed',
        openUntil: '02:00 م',
        deliveryAvailable: true,
        minOrder: 40,
        deliveryFee: 0,
        freeDeliveryThreshold: 200,
        badge: 'طلب مسبق',
    }
];

// ─── HELPERS ──────────────────────────────────────────────────────────────

export function getDistance(coords1: { lat: number; lng: number } | number, coords2: { lat: number; lng: number } | number, lat2?: number, lng2?: number) {
    if (typeof coords1 === 'number' && typeof coords2 === 'number' && lat2 !== undefined && lng2 !== undefined) {
        // Handle legacy lat1, lon1, lat2, lon2 signature
        const lat1 = coords1;
        const lon1 = coords2;
        const toRad = (x: number) => (x * Math.PI) / 180;
        const R = 6371;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lng2 - lon1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    
    // Handle coords1, coords2 objects
    const c1 = coords1 as { lat: number; lng: number };
    const c2 = coords2 as { lat: number; lng: number };
    const toRad = (x: number) => (x * Math.PI) / 180;
    const R = 6371; // Earth radius in km
    const dLat = toRad(c2.lat - c1.lat);
    const dLng = toRad(c2.lng - c1.lng);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(c1.lat)) * Math.cos(toRad(c2.lat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export function parseLocationToBranch(node: any): Branch {
    const addr = node.address || {};
    const googleMapMeta = node.metafields?.find((m: any) => m?.key === 'google_maps')?.value || '';

    const computeStatus = (fromKey: string, toKey: string) => {
        let st: 'open' | 'closed' = 'closed';
        let ou = '11:59 م';
        const hFrom = node.metafields?.find((m: any) => m?.key === fromKey)?.value;
        const hTo = node.metafields?.find((m: any) => m?.key === toKey)?.value;

        if (hFrom && hTo) {
            ou = hTo;
            try {
                const now = new Date();
                const currentMins = now.getHours() * 60 + now.getMinutes();
                const parseTime = (timeStr: string) => {
                    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})/);
                    if (!match) return -1;
                    let h = parseInt(match[1], 10);
                    let m = parseInt(match[2], 10);
                    if (timeStr.toLowerCase().includes('pm') && h !== 12) h += 12;
                    if (timeStr.toLowerCase().includes('am') && h === 12) h = 0;
                    return h * 60 + m;
                };
                const fMins = parseTime(hFrom);
                const tMins = parseTime(hTo);
                if (fMins !== -1 && tMins !== -1) {
                    if (tMins < fMins) {
                        if (currentMins >= fMins || currentMins < tMins) st = 'open';
                    } else {
                        if (currentMins >= fMins && currentMins < tMins) st = 'open';
                    }
                }
            } catch (e) { }
        }
        return { status: st, openUntil: ou };
    };

    const delivery = computeStatus('delivery_time_from', 'delivery_time_to');
    const pickup = computeStatus('working_hours_from', 'working_hours_to');

    const getMeta = (k: string, fb: any) => {
        const v = node.metafields?.find((m: any) => m?.key === k)?.value;
        return v ? (typeof fb === 'number' ? parseFloat(v) : v) : fb;
    };

    return {
        id: node.id,
        name: node.name || 'فرع',
        address: [addr.address1, addr.address2].filter(Boolean).join(' - ') || '',
        city: getMeta('city', addr.city || ''),
        lat: getMeta('latitude', addr.latitude || 0),
        lng: getMeta('longitude', addr.longitude || 0),
        phone: getMeta('mobile_number', ''),
        status: 'open',
        openUntil: '11:59 م',
        pickupStatus: pickup.status,
        pickupOpenUntil: pickup.openUntil,
        deliveryStatus: delivery.status,
        deliveryOpenUntil: delivery.openUntil,
        deliveryAvailable: true,
        minOrder: getMeta('minimum_order_value', 50),
        deliveryFee: getMeta('delivery_fee', 25),
        freeDeliveryThreshold: getMeta('free_delivery_threshold', 200),
        badge: '',
        google_maps: getMeta('google_maps', googleMapMeta),
        rating: getMeta('rating', 0),
        ratingCount: getMeta('rating_count', 0),
    };
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────

export function DeliveryPickupModal({
    isOpen,
    onClose,
    defaultTab = 'delivery',
    locationsPromise,
    customerPromise,
    locale = 'ar',
    googleMapsKey: propGoogleMapsKey,
    onSelectBranch,
}: DeliveryPickupModalProps) {
    const googleMapsKey = propGoogleMapsKey || (typeof window !== 'undefined' ? (window as any).ENV?.PUBLIC_GOOGLE_MAPS_KEY : undefined);

    const isEn = locale === 'en';
    const [activeTab, setActiveTab] = useState<Tab>(defaultTab);
    const [selectedBranch, setSelectedBranch] = useState<string>('');
    const [branchSearch, setBranchSearch] = useState('');
    const [branchSort, setBranchSort] = useState<'distance' | 'rating'>('distance');
    const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [adminMetafields, setAdminMetafields] = useState<any[]>([]);
    const location = useLocation();

    useEffect(() => {
        if (isOpen) {
            onClose();
        }
    }, [location.pathname]);

    useEffect(() => {
        if (isOpen) {
            setIsAnimating(true);
            fetch('/api/locations-meta')
                .then(res => res.json())
                .then(data => { if (data?.locations) setAdminMetafields(data.locations); })
                .catch(err => console.error('Admin metafields fetch error:', err));
            
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((pos) => {
                    setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                });
            }
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const mergeWithAdminMeta = (nodes: any[]) => {
        if (!adminMetafields.length) return nodes;
        return nodes.map(n => {
            const al = adminMetafields.find((a: any) => a.id === n.id || a.name === n.name);
            if (al) {
                const m = { ...n };
                if (al.metafields?.length) m.metafields = al.metafields;
                if (al.address?.latitude && !n.address?.latitude) m.address = { ...n.address, ...al.address };
                return m;
            }
            return n;
        });
    };

    return (
        <div className="dpm-overlay" onClick={onClose} dir={isEn ? 'ltr' : 'rtl'}>
            <div
                className={`dpm-container ${isAnimating ? 'dpm-enter' : ''}`}
                onClick={(e) => e.stopPropagation()}
                onAnimationEnd={() => setIsAnimating(false)}
            >
                {/* Close button */}
                <button className="dpm-close" onClick={onClose} aria-label="Close">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>

                <Suspense fallback={<div className="dpm-loading"><div className="dpm-loading-spinner" /></div>}>
                    <Await resolve={Promise.all([locationsPromise, customerPromise])}>
                        {([locationsData, customerData]: [any, any]) => {
                            const nodes = locationsData?.locations?.nodes || [];
                            const enrichedNodes = mergeWithAdminMeta(nodes);
                            const rawBranches: Branch[] = enrichedNodes.length > 0
                                ? enrichedNodes.map((n: any) => parseLocationToBranch(n))
                                : FALLBACK_BRANCHES;

                            // Calculate distances
                            const processedBranches = rawBranches.map(b => {
                                if (userCoords && b.lat && b.lng) {
                                    const dist = getDistance(userCoords, { lat: b.lat, lng: b.lng });
                                    return {
                                        ...b,
                                        distanceKm: dist,
                                        distance: dist > 1 ? `${dist.toFixed(1)} km` : `${(dist * 1000).toFixed(0)} m`
                                    };
                                }
                                return b;
                            });

                            if (branchSort === 'distance' && userCoords) {
                                processedBranches.sort((a, b) => (a.distanceKm || 9999) - (b.distanceKm || 9999));
                            }

                            return (
                                <ModalContent
                                    activeTab={activeTab}
                                    setActiveTab={setActiveTab}
                                    branches={processedBranches}
                                    customer={customerData?.customer}
                                    selectedBranch={selectedBranch}
                                    setSelectedBranch={setSelectedBranch}
                                    branchSearch={branchSearch}
                                    setBranchSearch={setBranchSearch}
                                    onClose={onClose}
                                    locale={locale}
                                    onSelectBranch={onSelectBranch}
                                    googleMapsKey={googleMapsKey}
                                    branchSort={branchSort}
                                    setBranchSort={setBranchSort}
                                />
                            );
                        }}
                    </Await>
                </Suspense>
            </div>
        </div>
    );
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────

function ModalContent({
    activeTab,
    setActiveTab,
    branches: rawBranchesProp,
    customer,
    selectedBranch,
    setSelectedBranch,
    branchSearch,
    setBranchSearch,
    onClose,
    locale,
    onSelectBranch,
    googleMapsKey,
    branchSort,
    setBranchSort,
}: any) {
    const isEn = locale === 'en';
    const [zoom, setZoom] = useState(14);

    const branches = rawBranchesProp.map((b: any) => ({
        ...b,
        status: (activeTab === 'pickup' && b.pickupStatus) ? b.pickupStatus : (b.deliveryStatus || b.status),
        openUntil: (activeTab === 'pickup' && b.pickupOpenUntil) ? b.pickupOpenUntil : (b.deliveryOpenUntil || b.openUntil),
    }));

    const addresses = customer?.addresses?.nodes || [];
    const currentAddress = addresses.find((a: any) => a.id === selectedBranch);
    const effectiveSelectedBranch = selectedBranch || (activeTab === 'pickup' ? branches[0]?.id : (addresses[0]?.id || ''));
    
    const currentBranch = branches.find((b: any) => b.id === effectiveSelectedBranch) || branches[0];
    const isUserAddressSelected = !!currentAddress;

    const filteredBranches = branches.filter((b: any) =>
        b.name.toLowerCase().includes(branchSearch.toLowerCase()) || 
        b.city.toLowerCase().includes(branchSearch.toLowerCase())
    );

    // Map Logic: Handle both Branch and User Address
    const getMapUrl = () => {
        if (isUserAddressSelected && currentAddress) {
            // Geocode by address string for user addresses
            const query = encodeURIComponent(`${currentAddress.address1}, ${currentAddress.city}, SA`);
            return `https://www.google.com/maps/embed/v1/place?key=${googleMapsKey}&q=${query}&zoom=16`;
        }
        return `https://www.google.com/maps/embed/v1/place?key=${googleMapsKey}&q=${currentBranch.lat},${currentBranch.lng}&zoom=${zoom}`;
    };

    const mapUrl = getMapUrl();

    return (
        <>
            <div className="dpm-map-area">
                <iframe
                    title="Location Map"
                    src={mapUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen={false}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                />

                {(currentBranch || currentAddress) && (
                    <div className="dpm-map-floating-card animate-slide-up">
                        <div className="dpm-map-floating-icon">
                            {isUserAddressSelected ? (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                            ) : (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="text-lg font-bold text-[#1b3d2e] mb-1 truncate">
                                {isUserAddressSelected ? (currentAddress.firstName + ' ' + currentAddress.lastName) : currentBranch.name}
                            </h4>
                            <p className="text-sm text-gray-500 leading-tight line-clamp-2">
                                {isUserAddressSelected ? currentAddress.address1 : currentBranch.address}
                            </p>
                            <div className="flex items-center gap-3 mt-2">
                                <span className={`dpm-status-tag ${isUserAddressSelected ? 'status-open' : (currentBranch.status === 'open' ? 'status-open' : 'status-closed')}`}>
                                    {isUserAddressSelected ? (isEn ? 'Deliver Here' : 'توصيل لهنا') : (currentBranch.status === 'open' ? (isEn ? 'Open' : 'مفتوح') : (isEn ? 'Closed' : 'مغلق'))}
                                </span>
                                {!isUserAddressSelected && currentBranch.distance && <span className="text-xs font-bold text-gray-400">{currentBranch.distance}</span>}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="dpm-side-panel">
                <div className="dpm-header-tabs">
                    <div className="dpm-tabs-toggle">
                        <button 
                            className={`dpm-tab-btn ${activeTab === 'delivery' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('delivery'); setSelectedBranch(addresses[0]?.id || ''); }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>
                            {isEn ? 'Delivery' : 'توصيل'}
                        </button>
                        <button 
                            className={`dpm-tab-btn ${activeTab === 'pickup' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('pickup'); setSelectedBranch(branches[0]?.id || ''); }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                            {isEn ? 'Pickup' : 'استلام'}
                        </button>
                    </div>
                </div>

                {activeTab === 'pickup' && (
                    <div className="dpm-search-box animate-fade-in">
                        <div className="dpm-search-input-wrapper">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                            <input
                                type="text"
                                placeholder={isEn ? "Search for branch..." : "ابحث عن فرع..."}
                                value={branchSearch}
                                onChange={(e) => setBranchSearch(e.target.value)}
                                className="dpm-search-field"
                            />
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                            <button 
                                onClick={() => setBranchSort('distance')}
                                className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${branchSort === 'distance' ? 'bg-[#1b3d2e] text-white' : 'bg-gray-100 text-gray-400'}`}
                            >
                                {isEn ? 'Nearby' : 'الأقرب'}
                            </button>
                            <button 
                                onClick={() => setBranchSort('rating')}
                                className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${branchSort === 'rating' ? 'bg-[#1b3d2e] text-white' : 'bg-gray-100 text-gray-400'}`}
                            >
                                {isEn ? 'Top Rated' : 'الأعلى تقييماً'}
                            </button>
                        </div>
                    </div>
                )}

                <div className="dpm-panel-body">
                    {activeTab === 'delivery' ? (
                        <div className="p-4 animate-fade-in">
                            <h3 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-widest">{isEn ? 'Your Addresses' : 'عناوينك المسجلة'}</h3>
                            {addresses.length > 0 ? (
                                addresses.map((addr: any) => (
                                    <button
                                        key={addr.id}
                                        className={`w-full p-5 mb-3 text-start border-2 rounded-2xl transition-all ${selectedBranch === addr.id ? 'border-[#1b3d2e] bg-[#fcfaf5]' : 'border-gray-50 hover:border-gray-200 bg-white'}`}
                                        onClick={() => setSelectedBranch(addr.id)}
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <p className="font-bold text-[#1b3d2e]">{addr.firstName} {addr.lastName}</p>
                                            {selectedBranch === addr.id && <div className="w-2 h-2 rounded-full bg-[#1b3d2e]" />}
                                        </div>
                                        <p className="text-sm text-gray-500 truncate">{addr.address1}</p>
                                        <p className="text-xs text-gray-400 mt-1">{addr.city}</p>
                                    </button>
                                ))
                            ) : (
                                <div className="text-center py-10">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
                                    </div>
                                    <p className="text-sm text-gray-400 mb-6">{isEn ? 'No addresses found' : 'لم يتم العثور على عناوين'}</p>
                                    <Link 
                                        to={isEn ? "/en/account/addresses" : "/account/addresses"}
                                        onClick={onClose}
                                        className="inline-block px-6 py-3 bg-[#1b3d2e] text-white rounded-xl font-bold text-sm"
                                    >
                                        {isEn ? 'Add New Address' : 'إضافة عنوان جديد'}
                                    </Link>
                                </div>
                            )}
                            {addresses.length > 0 && (
                                <div className="mt-4 px-1">
                                    <Link 
                                        to={isEn ? "/en/account/addresses" : "/account/addresses"}
                                        onClick={onClose}
                                        className="w-full py-4 flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-2xl text-[#1b3d2e] font-bold text-sm hover:border-[#1b3d2e]/30 hover:bg-[#fcfaf5] transition-all"
                                    >
                                        <span className="text-xl">+</span>
                                        {isEn ? 'Add Another Address' : 'إضافة عنوان آخر'}
                                    </Link>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="animate-fade-in">
                            {filteredBranches.map((branch: any) => (
                                <button
                                    key={branch.id}
                                    className={`dpm-branch-item ${effectiveSelectedBranch === branch.id ? 'selected' : ''}`}
                                    onClick={() => setSelectedBranch(branch.id)}
                                >
                                    <div className="dpm-branch-header">
                                        <h4 className="dpm-branch-name">{branch.name}</h4>
                                        <span className={`dpm-status-tag ${branch.status === 'open' ? 'status-open' : 'status-closed'}`}>
                                            {branch.status === 'open' ? (isEn ? 'Open' : 'مفتوح') : (isEn ? 'Closed' : 'مغلق')}
                                        </span>
                                    </div>
                                    <div className="dpm-branch-meta">
                                        <div className="dpm-meta-row">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
                                            <span className="truncate">{branch.address}</span>
                                        </div>
                                        <div className="dpm-meta-row">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                            <span>{isEn ? `Until ${branch.openUntil}` : `حتى ${branch.openUntil}`}</span>
                                            {branch.distance && (
                                                <>
                                                    <span className="mx-1">•</span>
                                                    <span className="font-bold text-[#1b3d2e]">{branch.distance}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="dpm-footer-action">
                    <button 
                        className="dpm-confirm-btn"
                        disabled={!effectiveSelectedBranch}
                        onClick={() => {
                            if (onSelectBranch) {
                                if (isUserAddressSelected) {
                                    onSelectBranch(`${currentAddress.firstName} ${currentAddress.lastName}`, currentAddress.id, 'delivery');
                                } else if (currentBranch) {
                                    onSelectBranch(currentBranch.name, currentBranch.id, activeTab);
                                }
                                onClose();
                            }
                        }}
                    >
                        {isEn ? 'Confirm Selection' : 'تأكيد الاختيار'}
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                    </button>
                </div>
            </div>
        </>
    );
}
