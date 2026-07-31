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
    deliveryRadius?: number;
    minOrder: number;
    deliveryFee: number;
    baseDeliveryFee?: number;
    perKmRate: number;
    timeSlots?: string;
    freeDeliveryThreshold: number;
    hoursFrom?: string;
    hoursTo?: string;
    hoursFromShift2?: string;
    hoursToShift2?: string;
    fridayHoursFrom?: string;
    fridayHoursTo?: string;
    saturdayHoursFrom?: string;
    saturdayHoursTo?: string;
    sundayHoursFrom?: string;
    sundayHoursTo?: string;
    mondayHoursFrom?: string;
    mondayHoursTo?: string;
    tuesdayHoursFrom?: string;
    tuesdayHoursTo?: string;
    wednesdayHoursFrom?: string;
    wednesdayHoursTo?: string;
    thursdayHoursFrom?: string;
    thursdayHoursTo?: string;
    workingDays?: string[];
    distance?: string;
    google_maps?: string;
    distanceKm?: number;
    rating?: number;
    ratingCount?: number;
    hideFromStorefront?: boolean;
    branch_id?: string;
    ax_store_id?: string;
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
    onSelectBranch?: (branch: any, type: Tab, addressName?: string, isOutOfRange?: boolean, fullAddress?: any) => void;
    selectedLocationId?: string;
    selectedAddressName?: string;
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
        perKmRate: 0,
        freeDeliveryThreshold: 200,
        badge: 'طلب مسبق',
        rating: 4.8,
        ratingCount: 342,
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
        perKmRate: 0,
        freeDeliveryThreshold: 200,
        badge: 'طلب مسبق',
        rating: 4.5,
        ratingCount: 128,
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
        perKmRate: 0,
        freeDeliveryThreshold: 200,
        badge: 'طلب مسبق',
        rating: 4.9,
        ratingCount: 512,
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
        perKmRate: 0,
        freeDeliveryThreshold: 200,
        badge: 'طلب مسبق',
        rating: 4.2,
        ratingCount: 89,
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
        perKmRate: 0,
        freeDeliveryThreshold: 200,
        badge: 'طلب مسبق',
        rating: 4.6,
        ratingCount: 204,
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

export function parseLocationToBranch(node: any, isEn: boolean = false): Branch {
    const addr = node.address || {};
    const googleMapMeta = node.metafields?.find((m: any) => m?.key === 'google_maps')?.value || '';
    

    const computeStatus = (fromKey: string, toKey: string, fromKey2?: string, toKey2?: string) => {
        let st: 'open' | 'closed' = 'closed';
        let ou = '11:00 م';
        
        let riyadhDay = 'Sun';
        try {
            riyadhDay = new Intl.DateTimeFormat('en-US', {
                timeZone: 'Asia/Riyadh',
                weekday: 'short'
            }).format(new Date());
        } catch(e) {}

        let targetFromKey = fromKey;
        let targetToKey = toKey;
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

        let hFrom = (node as any)[targetFromKey]?.value || node.metafields?.find((m: any) => m?.key === targetFromKey)?.value;
        let hTo = (node as any)[targetToKey]?.value || node.metafields?.find((m: any) => m?.key === targetToKey)?.value;
        
        if (!hFrom || !hTo) {
            hFrom = (node as any)[fromKey]?.value || node.metafields?.find((m: any) => m?.key === fromKey)?.value;
            hTo = (node as any)[toKey]?.value || node.metafields?.find((m: any) => m?.key === toKey)?.value;
        }
        
        const hFrom2 = fromKey2 ? ((node as any)[fromKey2]?.value || node.metafields?.find((m: any) => m?.key === fromKey2)?.value) : undefined;
        const hTo2 = toKey2 ? ((node as any)[toKey2]?.value || node.metafields?.find((m: any) => m?.key === toKey2)?.value) : undefined;

        if (hFrom && hTo) {
            ou = hTo2 || hTo;
            try {
                // Force Riyadh Time (UTC+3) using a more reliable method
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
                    const arMap: {[key: string]: string} = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9' };
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

                const riyadhDay = new Intl.DateTimeFormat('en-US', {
                    timeZone: 'Asia/Riyadh',
                    weekday: 'short'
                }).format(now);

                const workingDaysStr = node.metafields?.find((m: any) => m?.key === 'working_days')?.value || (node as any).working_days?.value || '';
                let isWorkingDay = true;
                if (workingDaysStr) {
                    try {
                        const parsedDays = JSON.parse(workingDaysStr);
                        if (Array.isArray(parsedDays) && parsedDays.length > 0) {
                            isWorkingDay = parsedDays.includes(riyadhDay);
                        }
                    } catch (e) {}
                }

                if (!isWorkingDay) {
                    st = 'closed';
                } else {
                    const openInShift1 = checkShift(hFrom, hTo);
                    const openInShift2 = hFrom2 && hTo2 ? checkShift(hFrom2, hTo2) : false;

                    if (openInShift1 || openInShift2) {
                        st = 'open';
                    }
                }
            } catch (e) {
                console.error('[DPM] Error computing status:', e);
            }
        }
        return { status: st, openUntil: ou };
    };

    const delivery = computeStatus('working_hours_from', 'working_hours_to', 'working_hours_from_shift2', 'working_hours_to_shift2'); 
    const pickup = computeStatus('working_hours_from', 'working_hours_to', 'working_hours_from_shift2', 'working_hours_to_shift2');

    const getMeta = (k: string, fb: any) => {
        let v = (node as any)[k]?.value;
        if (v === undefined) {
            v = node.metafields?.find((m: any) => m?.key === k)?.value;
        }
        if (!v) return fb;
        if (typeof fb === 'number') {
            if (typeof v === 'string' && v.trim().startsWith('{')) {
                try {
                    const parsed = JSON.parse(v) as any;
                    if (parsed.value !== undefined) return parseFloat(parsed.value);
                } catch (e) {}
            }
            const num = parseFloat(v);
            return isNaN(num) ? fb : num;
        }
        return v;
    };

    const nameInArabic = getMeta('name_in_arabic', (node as any).name_in_arabic?.value || (node as any).name_in_arabic || '');
    const displayName = (!isEn && nameInArabic && String(nameInArabic).trim()) ? String(nameInArabic).trim() : (node.name || 'فرع');

    return {
        id: node.id,
        name: displayName,
        rawName: node.name || 'فرع',
        nameInArabic: nameInArabic || '',
        address: [addr.address1, addr.address2].filter(Boolean).join(' - ') || '',
        city: getMeta('city', addr.city || ''),
        lat: getMeta('latitude', addr.latitude || 0),
        lng: getMeta('longitude', addr.longitude || 0),
        phone: getMeta('mobile_number', ''),
        status: 'open',
        openUntil: '11:59 م',
        pickupStatus: pickup.status,
        pickupOpenUntil: pickup.openUntil,
        deliveryOpenUntil: delivery.openUntil,
        deliveryAvailable: true,
        deliveryRadius: getMeta('delivery_radius', 99999),
        minOrder: getMeta('minimum_order_value', 0),
        deliveryFee: getMeta('delivery_fee', 0),
        baseDeliveryFee: getMeta('delivery_fee', 0),
        perKmRate: getMeta('per_km_rate', 0),
        timeSlots: getMeta('time_slots', ''),
        freeDeliveryThreshold: getMeta('free_delivery_threshold', 0),
        hoursFrom: (node as any).working_hours_from?.value || node.metafields?.find((m: any) => m?.key === 'working_hours_from')?.value,
        hoursTo: (node as any).working_hours_to?.value || node.metafields?.find((m: any) => m?.key === 'working_hours_to')?.value,
        hoursFromShift2: (node as any).working_hours_from_shift2?.value || node.metafields?.find((m: any) => m?.key === 'working_hours_from_shift2')?.value,
        hoursToShift2: (node as any).working_hours_to_shift2?.value || node.metafields?.find((m: any) => m?.key === 'working_hours_to_shift2')?.value,
        fridayHoursFrom: (node as any).friday_working_hours_from?.value || node.metafields?.find((m: any) => m?.key === 'friday_working_hours_from')?.value,
        fridayHoursTo: (node as any).friday_working_hours_to?.value || node.metafields?.find((m: any) => m?.key === 'friday_working_hours_to')?.value,
        saturdayHoursFrom: (node as any).saturday_working_hours_from?.value || node.metafields?.find((m: any) => m?.key === 'saturday_working_hours_from')?.value,
        saturdayHoursTo: (node as any).saturday_working_hours_to?.value || node.metafields?.find((m: any) => m?.key === 'saturday_working_hours_to')?.value,
        sundayHoursFrom: (node as any).sunday_working_hours_from?.value || node.metafields?.find((m: any) => m?.key === 'sunday_working_hours_from')?.value,
        sundayHoursTo: (node as any).sunday_working_hours_to?.value || node.metafields?.find((m: any) => m?.key === 'sunday_working_hours_to')?.value,
        mondayHoursFrom: (node as any).monday_working_hours_from?.value || node.metafields?.find((m: any) => m?.key === 'monday_working_hours_from')?.value,
        mondayHoursTo: (node as any).monday_working_hours_to?.value || node.metafields?.find((m: any) => m?.key === 'monday_working_hours_to')?.value,
        tuesdayHoursFrom: (node as any).tuesday_working_hours_from?.value || node.metafields?.find((m: any) => m?.key === 'tuesday_working_hours_from')?.value,
        tuesdayHoursTo: (node as any).tuesday_working_hours_to?.value || node.metafields?.find((m: any) => m?.key === 'tuesday_working_hours_to')?.value,
        wednesdayHoursFrom: (node as any).wednesday_working_hours_from?.value || node.metafields?.find((m: any) => m?.key === 'wednesday_working_hours_from')?.value,
        wednesdayHoursTo: (node as any).wednesday_working_hours_to?.value || node.metafields?.find((m: any) => m?.key === 'wednesday_working_hours_to')?.value,
        thursdayHoursFrom: (node as any).thursday_working_hours_from?.value || node.metafields?.find((m: any) => m?.key === 'thursday_working_hours_from')?.value,
        thursdayHoursTo: (node as any).thursday_working_hours_to?.value || node.metafields?.find((m: any) => m?.key === 'thursday_working_hours_to')?.value,
        workingDays: (() => {
            const val = (node as any).working_days?.value || node.metafields?.find((m: any) => m?.key === 'working_days')?.value;
            if (val) {
                try { return JSON.parse(val) as string[]; } catch (e) {}
            }
            return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        })(),
        badge: '',
        google_maps: getMeta('google_maps', googleMapMeta),
        ratingCount: getMeta('rating_count', 0),
        hideFromStorefront: getMeta('hide_from_storefront', 'false') === 'true' || getMeta('hide_from_storefront', false) === true,
        branch_id: getMeta('branch_id', ''),
        ax_store_id: getMeta('ax_store_id', ''),
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
    selectedLocationId,
    selectedAddressName,
}: DeliveryPickupModalProps) {
    const googleMapsKey = propGoogleMapsKey || (typeof window !== 'undefined' ? (window as any).ENV?.PUBLIC_GOOGLE_MAPS_KEY : undefined);

    const isEn = locale === 'en';
    const [activeTab, setActiveTab] = useState<Tab>(defaultTab);
    const [selectedBranch, setSelectedBranch] = useState<string>('');
    const [branchSearch, setBranchSearch] = useState('');
    const [branchSort, setBranchSort] = useState<'distance' | 'rating'>('distance');
    const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [geoError, setGeoError] = useState<boolean>(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [adminMetafields, setAdminMetafields] = useState<any[]>([]);
    const location = useLocation();

    // Memoize the combined promise to prevent Await from re-suspending on every state change (like typing in search or switching tabs)
    const combinedPromise = useMemo(() => Promise.all([locationsPromise, customerPromise]), [locationsPromise, customerPromise]);

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
                .then((data: any) => { if (data?.locations) setAdminMetafields(data.locations); })
                .catch(err => console.error('Admin metafields fetch error:', err));
            
            // Sync selected branch ID from session
            if (selectedLocationId) {
                setSelectedBranch(selectedLocationId);
            }

            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                        setGeoError(false);
                    },
                    (err) => {
                        setGeoError(true);
                    }
                );
            } else {
                setGeoError(true);
            }
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const mergeWithAdminMeta = (nodes: any[]) => {
        if (!adminMetafields.length) {
            return nodes;
        }

        return nodes.map(n => {
            // Match by ID or name
            const al = adminMetafields.find((a: any) => 
                (a.id && n.id && a.id.includes(n.id.split('/').pop())) || 
                a.name === n.name
            );
            if (al) {
                return { ...n, ...al };
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
                    <Await resolve={combinedPromise}>
                        {([locationsData, customerData]: [any, any]) => {
                            const nodes = locationsData?.locations?.nodes || [];
                            
                            // Use Storefront API nodes as the base
                            let enrichedNodes = mergeWithAdminMeta(nodes);
                            
                            // If merging didn't produce results (or backend failed), use Storefront nodes directly
                            if (enrichedNodes.length === 0 && nodes.length > 0) {
                                enrichedNodes = nodes;
                            }
                            
                            // Last fallback: use Admin API nodes if Storefront was empty
                            if (enrichedNodes.length === 0 && adminMetafields.length > 0) {
                                enrichedNodes = adminMetafields;
                            }

                             const rawBranches: Branch[] = enrichedNodes.length > 0
                                 ? enrichedNodes.map((n: any) => parseLocationToBranch(n, isEn))
                                 : FALLBACK_BRANCHES;

                            // Calculate distances (perKmRate disabled, always use base fee)
                            const processedBranches = rawBranches.map(b => {
                                if (userCoords && b.lat && b.lng) {
                                    const dist = getDistance(userCoords, { lat: b.lat, lng: b.lng });
                                    let dynamicFee = b.deliveryFee;
                                    return {
                                        ...b,
                                        distanceKm: dist,
                                        deliveryFee: dynamicFee,
                                        distance: dist > 1 ? `${dist.toFixed(1)} km` : `${(dist * 1000).toFixed(0)} m`
                                    };
                                }
                                return b;
                            });

                            if (branchSort === 'distance' && userCoords) {
                                processedBranches.sort((a, b) => (a.distanceKm || 9999) - (b.distanceKm || 9999));
                            } else if (branchSort === 'rating') {
                                processedBranches.sort((a, b) => (b.rating || 0) - (a.rating || 0));
                            }

                            // Push hidden branches to the bottom of the list
                            processedBranches.sort((a, b) => (a.hideFromStorefront ? 1 : 0) - (b.hideFromStorefront ? 1 : 0));

                            return (
                                <ModalContent
                                    activeTab={activeTab}
                                    setActiveTab={setActiveTab}
                                    branches={processedBranches}
                                    customer={customerData}
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
                                    userCoords={userCoords}
                                    geoError={geoError}
                                    selectedAddressName={selectedAddressName}
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

function normalizeCity(city: string): string {
    const c = (city || '').toLowerCase().trim();
    if (c.includes('riyadh') || c.includes('رياض') || c.includes('12251') || c.includes('13315') || c.includes('14253')) return 'riyadh';
    if (c.includes('abha') || c.includes('أبها') || c.includes('ابها')) return 'abha';
    if (c.includes('jeddah') || c.includes('جدة') || c.includes('جده')) return 'jeddah';
    if (c.includes('khamis') || c.includes('خميس') || c.includes('مشيط')) return 'khamis mushait';
    if (c.includes('dammam') || c.includes('دمام')) return 'dammam';
    if (c.includes('khobar') || c.includes('خبر')) return 'khobar';
    return c;
}

export function detectCityFromAddress(addr: any): string {
    if (!addr) return '';
    const combinedText = [
        addr.city,
        addr.address1,
        addr.address2,
        addr.province,
        addr.company,
        addr.zip,
        addr.firstName,
        addr.lastName
    ].filter(Boolean).join(' ').toLowerCase();

    // Riyadh & neighborhoods & postal codes
    if (
        combinedText.includes('riyadh') || combinedText.includes('رياض') ||
        combinedText.includes('sahafa') || combinedText.includes('صحافة') ||
        combinedText.includes('olaya') || combinedText.includes('عليا') ||
        combinedText.includes('malaz') || combinedText.includes('ملز') ||
        combinedText.includes('yasmin') || combinedText.includes('ياسمين') ||
        combinedText.includes('narjis') || combinedText.includes('نرجس') ||
        combinedText.includes('hittin') || combinedText.includes('حطين') ||
        combinedText.includes('nakheel') || combinedText.includes('نخيل') ||
        combinedText.includes('aqiq') || combinedText.includes('عقيق') ||
        combinedText.includes('rawdah') || combinedText.includes('روضة') ||
        combinedText.includes('diriyah') || combinedText.includes('درعية') ||
        combinedText.includes('sulaimaniyah') || combinedText.includes('سليمانية') ||
        combinedText.includes('12251') || combinedText.includes('13315') || combinedText.includes('14253') || combinedText.includes('11564')
    ) {
        return 'riyadh';
    }

    // Jeddah & neighborhoods
    if (
        combinedText.includes('jeddah') || combinedText.includes('جدة') || combinedText.includes('جده') ||
        combinedText.includes('hamra') || combinedText.includes('حمراء') ||
        combinedText.includes('salamah') || combinedText.includes('سلامة') ||
        combinedText.includes('shati') || combinedText.includes('شاطئ') ||
        combinedText.includes('23323')
    ) {
        return 'jeddah';
    }

    // Abha / Asir
    if (combinedText.includes('abha') || combinedText.includes('أبها') || combinedText.includes('ابها') || combinedText.includes('عسير')) {
        return 'abha';
    }

    // Khamis Mushait
    if (combinedText.includes('khamis') || combinedText.includes('خميس') || combinedText.includes('مشيط')) {
        return 'khamis mushait';
    }

    // Dammam
    if (combinedText.includes('dammam') || combinedText.includes('دمام')) {
        return 'dammam';
    }

    // Khobar
    if (combinedText.includes('khobar') || combinedText.includes('خبر')) {
        return 'khobar';
    }

    return normalizeCity(addr.city);
}

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
    userCoords,
    geoError,
    selectedAddressName,
}: any) {
    const isEn = locale === 'en';
    const [zoom, setZoom] = useState(14);

    const branches = rawBranchesProp.map((b: any) => ({
        ...b,
        status: (activeTab === 'pickup' && b.pickupStatus) ? b.pickupStatus : (b.deliveryStatus || b.status),
        openUntil: (activeTab === 'pickup' && b.pickupOpenUntil) ? b.pickupOpenUntil : (b.deliveryOpenUntil || b.openUntil),
    }));

    const customerObj = customer?.customer || customer || {};
    const addresses = customerObj?.addresses?.nodes || customerObj?.data?.customer?.addresses?.nodes || [];
    
    // Ensure the selected branch belongs to the active tab's domain
    let effectiveSelectedBranch = selectedBranch;
    if (activeTab === 'delivery') {
        let isValidAddress = addresses.some((a: any) => a.id === selectedBranch);
        
        // If we have a selectedAddressName from session but selectedBranch is a Store Location ID
        if (!isValidAddress && selectedAddressName) {
            const matchedAddress = addresses.find((a: any) => 
                selectedAddressName.includes(a.address1) || 
                selectedAddressName.includes(a.firstName)
            );
            if (matchedAddress) {
                effectiveSelectedBranch = matchedAddress.id;
                isValidAddress = true;
            }
        }
        
        if (!isValidAddress) effectiveSelectedBranch = addresses[0]?.id || '';
    } else {
        const isValidBranch = branches.some((b: any) => b.id === selectedBranch && !b.hideFromStorefront);
        if (!isValidBranch) {
            const firstActiveBranch = branches.find((b: any) => !b.hideFromStorefront);
            effectiveSelectedBranch = firstActiveBranch?.id || branches[0]?.id || '';
        }
    }

    const currentAddress = activeTab === 'delivery' ? addresses.find((a: any) => a.id === effectiveSelectedBranch) : null;
    const currentBranch = branches.find((b: any) => b.id === effectiveSelectedBranch) || branches[0];
    const isUserAddressSelected = activeTab === 'delivery' && !!currentAddress;

    const [hasAutoSelected, setHasAutoSelected] = useState(false);

    // Auto-select nearest branch when coords are detected
    useEffect(() => {
        if (userCoords && !hasAutoSelected && activeTab === 'pickup' && branches.length > 0) {
            // Only auto-select if there isn't already a valid saved branch
            const isValidSavedBranch = branches.some((b: any) => b.id === selectedBranch);
            if (!isValidSavedBranch) {
                setSelectedBranch(branches[0].id);
            }
            setHasAutoSelected(true);
        }
    }, [userCoords, hasAutoSelected, activeTab, branches, selectedBranch, setSelectedBranch]);

    // Auto-select first address under delivery tab when no manual selection is made yet
    useEffect(() => {
        if (!selectedBranch && activeTab === 'delivery' && addresses.length > 0) {
            setSelectedBranch(addresses[0].id);
        }
    }, [selectedBranch, activeTab, addresses, setSelectedBranch]);



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
                            <h4 className="text-lg font-bold text-[#234745] mb-1 truncate">
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
                        {geoError && (
                            <div className="text-[11px] text-[#E17A43] bg-[#E17A43]/10 px-3 py-2.5 rounded-[12px] font-bold mb-3 flex flex-col gap-1.5 text-right">
                                <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    <span>{isEn ? 'Location access was not allowed.' : 'لم يتم السماح بتحديد الموقع.'}</span>
                                </div>
                                <span className="text-gray-600 font-normal">
                                    {isEn ? 'Please select your branch below or choose Global Stock above.' : 'يرجى اختيار الفرع يدوياً أدناه أو اختيار المخزون العالمي أعلاه.'}
                                </span>
                            </div>
                        )}
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
                                className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${branchSort === 'distance' ? 'bg-[#234745] text-white' : 'bg-gray-100 text-gray-400'}`}
                            >
                                {isEn ? 'Nearby' : 'الأقرب'}
                            </button>
                            <button 
                                onClick={() => setBranchSort('rating')}
                                className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${branchSort === 'rating' ? 'bg-[#234745] text-white' : 'bg-gray-100 text-gray-400'}`}
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
                                        className={`w-full p-5 mb-3 text-start border-2 rounded-2xl transition-all ${effectiveSelectedBranch === addr.id ? 'border-[#234745] bg-[#fcfaf5]' : 'border-gray-50 hover:border-gray-200 bg-white'}`}
                                        onClick={() => setSelectedBranch(addr.id)}
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <p className="font-bold text-[#234745]">{addr.firstName} {addr.lastName}</p>
                                            {effectiveSelectedBranch === addr.id && <div className="w-2 h-2 rounded-full bg-[#234745]" />}
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
                                        className="inline-block px-6 py-3 bg-[#234745] text-white rounded-xl font-bold text-sm"
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
                                        className="w-full py-4 flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-2xl font-bold text-sm transition-all"
                                        style={{ color: '#234745' }}
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
                                    disabled={branch.hideFromStorefront}
                                    className={`dpm-branch-item ${effectiveSelectedBranch === branch.id ? 'selected' : ''} ${branch.hideFromStorefront ? 'opacity-40 cursor-not-allowed pointer-events-none bg-gray-50 border-gray-100 shadow-none' : ''}`}
                                    onClick={() => setSelectedBranch(branch.id)}
                                >
                                    <div className="dpm-branch-header">
                                        <h4 className="dpm-branch-name">{branch.name}</h4>
                                        {branch.hideFromStorefront ? (
                                            <span className="dpm-status-tag status-closed">
                                                {isEn ? 'Unavailable' : 'غير متوفر'}
                                            </span>
                                        ) : (
                                            <span className={`dpm-status-tag ${branch.status === 'open' ? 'status-open' : 'status-closed'}`}>
                                                {branch.status === 'open' ? (isEn ? 'Open' : 'مفتوح') : (isEn ? 'Closed' : 'مغلق')}
                                            </span>
                                        )}
                                    </div>
                                    <div className="dpm-branch-meta">
                                        <div className="dpm-meta-row">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
                                            <span className="truncate">{branch.address}</span>
                                        </div>
                                        <div className="dpm-meta-row">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                             <span dir="ltr">
                                                 {(() => {
                                                     const day = new Intl.DateTimeFormat('en-US', {
                                                         timeZone: 'Asia/Riyadh',
                                                         weekday: 'short'
                                                     }).format(new Date());

                                                     let from = branch.hoursFrom;
                                                     let to = branch.hoursTo;
                                                     if (day === 'Sun' && branch.sundayHoursFrom && branch.sundayHoursTo) {
                                                         from = branch.sundayHoursFrom;
                                                         to = branch.sundayHoursTo;
                                                     } else if (day === 'Mon' && branch.mondayHoursFrom && branch.mondayHoursTo) {
                                                         from = branch.mondayHoursFrom;
                                                         to = branch.mondayHoursTo;
                                                     } else if (day === 'Tue' && branch.tuesdayHoursFrom && branch.tuesdayHoursTo) {
                                                         from = branch.tuesdayHoursFrom;
                                                         to = branch.tuesdayHoursTo;
                                                     } else if (day === 'Wed' && branch.wednesdayHoursFrom && branch.wednesdayHoursTo) {
                                                         from = branch.wednesdayHoursFrom;
                                                         to = branch.wednesdayHoursTo;
                                                     } else if (day === 'Thu' && branch.thursdayHoursFrom && branch.thursdayHoursTo) {
                                                         from = branch.thursdayHoursFrom;
                                                         to = branch.thursdayHoursTo;
                                                     } else if (day === 'Fri' && branch.fridayHoursFrom && branch.fridayHoursTo) {
                                                         from = branch.fridayHoursFrom;
                                                         to = branch.fridayHoursTo;
                                                     } else if (day === 'Sat' && branch.saturdayHoursFrom && branch.saturdayHoursTo) {
                                                         from = branch.saturdayHoursFrom;
                                                         to = branch.saturdayHoursTo;
                                                     }

                                                     const s1 = from && to ? `${from} - ${to}` : '';
                                                     const s2 = branch.hoursFromShift2 && branch.hoursToShift2 ? `${branch.hoursFromShift2} - ${branch.hoursToShift2}` : '';
                                                     return s1 && s2 ? `${s1} & ${s2}` : s1 || (isEn ? `Until ${branch.openUntil}` : `حتى ${branch.openUntil}`);
                                                 })()}
                                             </span>
                                            {branch.distance && (
                                                <>
                                                    <span className="mx-1">•</span>
                                                    <span className="font-bold text-[#234745]">{branch.distance}</span>
                                                </>
                                            )}
                                            {branch.rating > 0 && (
                                                <>
                                                    <span className="mx-1">•</span>
                                                    <span className="flex items-center gap-1 font-bold text-[#F3C22F]">
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                                                        {branch.rating.toFixed(1)} {branch.ratingCount > 0 && <span className="text-gray-400 font-normal text-[10px]">({branch.ratingCount})</span>}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    {/* Pickup-specific info badges */}
                                    <div className="dpm-branch-delivery-info">
                                        {branch.minOrder > 0 && (
                                            <span className="dpm-info-badge dpm-info-badge--min">
                                                {isEn ? `Min Order: ${branch.minOrder} SAR` : `الحد الأدنى للطلب: ${branch.minOrder} ر.س`}
                                            </span>
                                        )}
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
                                if (isUserAddressSelected) {
                                    const currentAddress = addresses.find((a: any) => a.id === effectiveSelectedBranch);
                                    
                                    // Parse coords from address2 if present (formatted as COORDS:lat,lng)
                                    let addressCoords: { lat: number; lng: number } | null = null;
                                    if (currentAddress?.address2?.startsWith('COORDS:')) {
                                        const [lat, lng] = currentAddress.address2.replace('COORDS:', '').split(',').map(Number);
                                        if (!isNaN(lat) && !isNaN(lng)) addressCoords = { lat, lng };
                                    }

                                    // Map address to nearest branch for stock and fees (ignoring disabled/hidden stores)
                                    let nearestBranch = branches.find((b: any) => !b.hideFromStorefront) || branches[0];
                                    let isOutOfRange = false;
                                    if (addressCoords) {
                                        let minDistance = Infinity;
                                        for (const b of branches) {
                                            if (b.lat && b.lng && !b.hideFromStorefront) {
                                                const dist = getDistance(addressCoords, { lat: b.lat, lng: b.lng });
                                                if (dist < minDistance) {
                                                    minDistance = dist;
                                                    nearestBranch = b;
                                                }
                                            }
                                        }
                                        if (minDistance > nearestBranch.deliveryRadius) {
                                            isOutOfRange = true;
                                        }
                                        
                                        // Dynamic fee: disabled perKmRate as requested - always use base delivery fee
                                         nearestBranch = { ...nearestBranch, deliveryFee: nearestBranch.baseDeliveryFee || nearestBranch.deliveryFee };

                                    } else {
                                         // Fallback to intelligent city & neighborhood detection
                                         const targetCity = detectCityFromAddress(currentAddress);
                                         nearestBranch = (targetCity
                                             ? branches.find((b: any) => !b.hideFromStorefront && detectCityFromAddress(b) === targetCity) ||
                                               branches.find((b: any) => !b.hideFromStorefront && normalizeCity(b.city) === targetCity)
                                             : null
                                         ) || branches.find((b: any) => !b.hideFromStorefront && (normalizeCity(b.city) === 'riyadh' || b.name?.includes('الرياض') || b.name?.includes('العليا')))
                                           || branches.find((b: any) => !b.hideFromStorefront)
                                           || branches[0];
                                         
                                         // Reset to base fee if no exact coordinates
                                         nearestBranch = { ...nearestBranch, deliveryFee: nearestBranch.baseDeliveryFee || nearestBranch.deliveryFee };
                                     }

                                    let addrName = isEn ? 'Home' : 'المنزل';
                                    if (currentAddress) {
                                        const fullName = `${currentAddress.firstName || ''} ${currentAddress.lastName || ''}`.trim();
                                        addrName = fullName || currentAddress.address1 || addrName;
                                    }
                                    // Set Branch to the fulfilling store, but pass addrName as the delivery destination
                                    onSelectBranch(nearestBranch, 'delivery', addrName, isOutOfRange, currentAddress);
                                } else if (currentBranch) {
                                    onSelectBranch(currentBranch, activeTab);
                                }
                                onClose();
                        }}
                    >
                        {isEn ? 'Confirm Selection' : 'تأكيد الاختيار'}
                    </button>
                </div>
            </div>
        </>
    );
}
