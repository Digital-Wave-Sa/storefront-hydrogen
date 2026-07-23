import { useOutletContext, useRouteLoaderData } from 'react-router';
import { useEffect, useRef, useState, useMemo } from 'react';
import type { Route } from './+types/($locale).pages.branches';
import { PageHeader } from '~/components/layout/PageHeader';

export const meta: Route.MetaFunction = () => {
    return [{ title: 'Our Branches | فروعنا' }];
};

// Helper to extract city from custom.city metafield with fallback to address.city
const getBranchCity = (loc: any) => {
    const metaCity = loc.city?.value ||
        loc.city_metafield?.value ||
        (loc.metafields && loc.metafields.find((m: any) => m.key === 'city')?.value);
    if (metaCity && String(metaCity).trim()) {
        return String(metaCity).trim();
    }
    if (loc.address?.city && String(loc.address.city).trim()) {
        return String(loc.address.city).trim();
    }
    return '';
};

// ─── MOCK DATA ─────────────────────────────────────────────────────────────
const cities = [
    { id: 'all', nameAr: 'الكل', nameEn: 'All' },
    { id: 'riyadh', nameAr: 'الرياض (٣٢)', nameEn: 'Riyadh (32)' },
    { id: 'jeddah', nameAr: 'جدة (١٢)', nameEn: 'Jeddah (12)' },
    { id: 'dammam', nameAr: 'الدمام (١١)', nameEn: 'Dammam (11)' },
    { id: 'makkah', nameAr: 'مكة (١٠)', nameEn: 'Makkah (10)' },
    { id: 'madinah', nameAr: 'المدينة (٧)', nameEn: 'Madinah (7)' },
];

// Real branches will be loaded from root

const deliveryZones = [
    { nameAr: 'الرياض', nameEn: 'Riyadh', branchesAr: '٣٢ فرع', branchesEn: '32 Branches', coverageAr: 'كل الأحياء', coverageEn: 'All neighborhoods' },
    { nameAr: 'جدة', nameEn: 'Jeddah', branchesAr: '٢٨ فرع', branchesEn: '28 Branches', coverageAr: 'كل الأحياء', coverageEn: 'All neighborhoods' },
    { nameAr: 'الدمام', nameEn: 'Dammam', branchesAr: '١٤ فرع', branchesEn: '14 Branches', coverageAr: 'معظم الأحياء', coverageEn: 'Most neighborhoods' },
    { nameAr: 'الخبر', nameEn: 'Al Khobar', branchesAr: '١١ فرع', branchesEn: '11 Branches', coverageAr: 'معظم الأحياء', coverageEn: 'Most neighborhoods' },
    { nameAr: 'مكة المكرمة', nameEn: 'Makkah', branchesAr: '٩ فروع', branchesEn: '9 Branches', coverageAr: 'متاح', coverageEn: 'Available' },
    { nameAr: 'المدينة المنورة', nameEn: 'Madinah', branchesAr: '٧ فروع', branchesEn: '7 Branches', coverageAr: 'متاح', coverageEn: 'Available' },
    { nameAr: 'أبها', nameEn: 'Abha', branchesAr: '٤ فروع', branchesEn: '4 Branches', coverageAr: 'استلام فقط', coverageEn: 'Pickup only' },
    { nameAr: 'تبوك', nameEn: 'Tabuk', branchesAr: '٣ فروع', branchesEn: '3 Branches', coverageAr: 'استلام فقط', coverageEn: 'Pickup only' },
];

export default function BranchesPage() {
    const { locale } = useOutletContext<{ locale: string }>();
    const rootData = useRouteLoaderData<any>('root');
    const rawLocations = rootData?.locations?.locations?.nodes || [];
    const locations = rawLocations.filter((loc: any) => {
        const isHidden = loc.hide_from_storefront?.value === 'true' ||
            loc.hide_from_storefront === true ||
            loc.hide_from_storefront === 'true';
        return !isHidden;
    });

    const isEn = locale === 'en';
    const fontClass = isEn ? 'font-en' : 'font-ar';
    const fontFam = isEn ? "'Inter', sans-serif" : "'EnglishDigits', 'GE Dinar One', sans-serif";
    const fontFam2 = isEn ? "'Inter', sans-serif" : "'EnglishDigits', 'Bahij Janna', sans-serif";

    const branchCount = locations.length > 0 ? locations.length : 117;
    const googleMapsKey = rootData?.env?.PUBLIC_GOOGLE_MAPS_KEY || (typeof window !== 'undefined' ? (window as any).ENV?.PUBLIC_GOOGLE_MAPS_KEY : undefined);

    const mapRef = useRef<HTMLDivElement>(null);
    const [mapError, setMapError] = useState<string>('');
    const [mapLoaded, setMapLoaded] = useState(false);

    const [selectedBranch, setSelectedBranch] = useState<any>(null);
    const [selectedCity, setSelectedCity] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const mapInstanceRef = useRef<any>(null);

    // Dynamic City Groups from locations custom.city metafield
    const { cityGroups, citiesList, totalCitiesCount } = useMemo(() => {
        const groups: Record<string, any[]> = {};

        locations.forEach((loc: any) => {
            const cityName = getBranchCity(loc) || (isEn ? 'Other' : 'أخرى');
            if (!groups[cityName]) {
                groups[cityName] = [];
            }
            groups[cityName].push(loc);
        });

        const sortedCityNames = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length);

        const citiesList = [
            { id: 'all', nameAr: 'الكل', nameEn: 'All', cityName: 'all', count: locations.length },
            ...sortedCityNames.map((cityName) => ({
                id: cityName,
                nameAr: `${cityName} (${groups[cityName].length})`,
                nameEn: `${cityName} (${groups[cityName].length})`,
                cityName,
                count: groups[cityName].length,
            }))
        ];

        return {
            cityGroups: groups,
            citiesList,
            totalCitiesCount: sortedCityNames.length,
        };
    }, [locations, isEn]);

    // Dynamic Locations filtered by selected city and search query
    const filteredLocations = useMemo(() => {
        return locations.filter((loc: any) => {
            const cityName = getBranchCity(loc) || (isEn ? 'Other' : 'أخرى');

            if (selectedCity !== 'all' && cityName !== selectedCity) {
                return false;
            }

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const nameMatch = loc.name?.toLowerCase().includes(q);
                const addressMatch = loc.address?.address1?.toLowerCase().includes(q);
                const cityMatch = cityName.toLowerCase().includes(q);
                return nameMatch || addressMatch || cityMatch;
            }

            return true;
        });
    }, [locations, selectedCity, searchQuery, isEn]);

    // Dynamic Delivery Zones Grid (Grouped by custom.city metafield)
    const dynamicDeliveryZones = useMemo(() => {
        const cityNames = Object.keys(cityGroups).sort((a, b) => cityGroups[b].length - cityGroups[a].length);

        return cityNames.map((cityName) => {
            const branchList = cityGroups[cityName] || [];
            const count = branchList.length;

            let branchesText = '';
            if (isEn) {
                branchesText = `${count} ${count === 1 ? 'Branch' : 'Branches'}`;
            } else {
                if (count === 1) branchesText = 'فرع واحد';
                else if (count === 2) branchesText = 'فرعان';
                else if (count >= 3 && count <= 10) branchesText = `${count} فروع`;
                else branchesText = `${count} فرع`;
            }

            const hasDelivery = branchList.some((b: any) =>
                b.delivery_fee?.value || b.delivery_hours_from?.value
            );

            return {
                cityName,
                count,
                branchesText,
                coverage: hasDelivery
                    ? (isEn ? 'Delivery Available' : 'توصيل متاح')
                    : (isEn ? 'Pickup Only' : 'استلام فقط'),
                isPickupOnly: !hasDelivery,
            };
        });
    }, [cityGroups, isEn]);

    const forceEnglishDigits = (str: string) => {
        if (!str) return '';
        return str.replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1632));
    };

    useEffect(() => {
        if (locations.length > 0 && !selectedBranch) {
            setSelectedBranch(locations[0]);
        }
    }, [locations, selectedBranch]);

    const handleBranchClick = (branch: any) => {
        setSelectedBranch(branch);
        if (mapInstanceRef.current) {
            const lat = parseFloat(branch.address?.latitude);
            const lng = parseFloat(branch.address?.longitude);
            if (!isNaN(lat) && !isNaN(lng)) {
                mapInstanceRef.current.setCenter({ lat, lng });
                mapInstanceRef.current.setZoom(15);
            }
        }
    };

    useEffect(() => {
        if (!googleMapsKey || typeof window === 'undefined') {
            setMapError('Google Maps API key is missing.');
            return;
        }

        let retryCount = 0;
        const initMap = () => {
            try {
                if (!mapRef.current) {
                    if (retryCount < 20) {
                        retryCount++;
                        setTimeout(initMap, 250);
                    }
                    return;
                }
                if (!(window as any).google || !(window as any).google.maps || !(window as any).google.maps.Map) {
                    if (retryCount < 20) {
                        retryCount++;
                        setTimeout(initMap, 250);
                    }
                    return;
                }

                const map = new (window as any).google.maps.Map(mapRef.current, {
                    center: { lat: 24.7136, lng: 46.6753 }, // Riyadh default
                    zoom: 5,
                    styles: [
                        { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }
                    ]
                });

                const bounds = new (window as any).google.maps.LatLngBounds();
                let hasValidCoords = false;

                locations.forEach((loc: any) => {
                    const lat = parseFloat(loc.address?.latitude);
                    const lng = parseFloat(loc.address?.longitude);

                    if (!isNaN(lat) && !isNaN(lng)) {
                        hasValidCoords = true;
                        const position = { lat, lng };

                        const marker = new (window as any).google.maps.Marker({
                            position,
                            map,
                            title: loc.name,
                            animation: (window as any).google.maps.Animation.DROP,
                        });

                        bounds.extend(position);

                        const infoWindow = new (window as any).google.maps.InfoWindow({
                            content: `<div style="padding: 8px; font-family: ${isEn ? 'Inter' : 'Cairo'}, sans-serif; text-align: ${isEn ? 'left' : 'right'};" dir="${isEn ? 'ltr' : 'rtl'}">
                                <h3 style="font-weight: bold; margin: 0 0 4px 0; color: #234745;">${loc.name}</h3>
                                <p style="font-size: 12px; margin: 0; color: #666;">${loc.address?.address1 || ''}</p>
                            </div>`
                        });

                        marker.addListener('click', () => {
                            infoWindow.open({ anchor: marker, map });
                        });
                    }
                });

                if (hasValidCoords) {
                    map.fitBounds(bounds);
                    const listener = (window as any).google.maps.event.addListener(map, "idle", () => {
                        if (map.getZoom() > 14) map.setZoom(14);
                        (window as any).google.maps.event.removeListener(listener);
                    });
                }
                setMapLoaded(true);
            } catch (err: any) {
                console.error("Map initialization error:", err);
                setMapError(err?.message || 'Failed to load map.');
            }
        };

        if (!(window as any).google) {
            const scriptId = 'google-maps-script-branches';
            if (!document.getElementById(scriptId)) {
                // Define the global callback function that Google Maps uses
                (window as any).initBranchesMap = initMap;

                const script = document.createElement('script');
                script.id = scriptId;
                // Add the callback parameter to the URL
                script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsKey}&libraries=places&callback=initBranchesMap`;
                script.async = true;
                script.defer = true;
                script.onerror = () => setMapError('Failed to load Google Maps script. It might be blocked.');
                document.head.appendChild(script);
            } else {
                // If script exists but wasn't loaded by us with a callback, just try to init after a small delay
                setTimeout(initMap, 500);
            }
        } else {
            initMap();
        }
    }, [googleMapsKey, locations, isEn]);

    return (
        <div className={`w-full bg-[#FAFAFA] min-h-screen ${fontClass}`} dir={isEn ? 'ltr' : 'rtl'}>

            {/* ─── HERO SECTION ─────────────────────────────────────────────────── */}
            <PageHeader
                title={isEn ? `${branchCount} Branches Across the Kingdom` : `${branchCount} فرع في أنحاء المملكة`}
                subtitle={isEn ? 'Our Branches' : 'فروعنا'}
                isEn={isEn}
            >
                <p className="text-[#BBCFCD] text-[18px] mb-12 max-w-lg mx-auto mt-4" style={{ fontFamily: fontFam2, lineHeight: '100%' }}>
                    {isEn ? 'Search for the nearest branch or check delivery availability in your area' : 'ابحث عن أقرب فرع أو تحقق من توفر التوصيل لمنطقتك'}
                </p>

                {/* Stats */}
                <div className="flex justify-center items-center gap-4 lg:gap-16 mt-4 w-full" style={{ fontFamily: fontFam }}>
                    <div>
                        <div className="text-[24px] lg:text-3xl font-bold mb-1" style={{ fontFamily: 'EnglishDigits, "Bahij Janna", sans-serif' }}>{branchCount}</div>
                        <div className="text-white/60 text-xs lg:text-sm">{isEn ? 'Branches' : 'فرع'}</div>
                    </div>
                    <div>
                        <div className="text-[24px] lg:text-3xl font-bold mb-1" style={{ fontFamily: 'EnglishDigits, "Bahij Janna", sans-serif' }} dir="ltr">{totalCitiesCount || 35}+</div>
                        <div className="text-white/60 text-xs lg:text-sm">{isEn ? 'Cities' : 'مدينة'}</div>
                    </div>
                    <div>
                        <div className="text-[24px] lg:text-3xl font-bold mb-1" style={{ fontFamily: 'EnglishDigits, "Bahij Janna", sans-serif' }} dir="ltr">24/7</div>
                        <div className="text-white/60 text-xs lg:text-sm">{isEn ? 'Most Branches' : 'معظم الفروع'}</div>
                    </div>
                    <div>
                        <div className="text-[24px] lg:text-3xl font-bold mb-1" style={{ fontFamily: 'EnglishDigits, "Bahij Janna", sans-serif' }}>{isEn ? '10 Min' : '10 دقيقة'}</div>
                        <div className="text-white/60 text-xs lg:text-sm">{isEn ? 'Prep Time' : 'وقت التجهيز'}</div>
                    </div>
                </div>
            </PageHeader>

            {/* ─── SEARCH & FILTER BAR ──────────────────────────────────────────── */}
            <div id="branches-search-section" className="bg-white py-6">
                <div className="max-w-[1400px] mx-auto px-4 lg:px-6 flex flex-col lg:flex-row items-center justify-between gap-6">
                    {/* Search Input */}
                    <div className="w-full lg:w-[450px] flex items-center bg-white border border-gray-300 rounded-full p-1 relative shrink-0">
                        <div className="pl-4 pr-3 text-gray-400">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={isEn ? 'Search for city or neighborhood...' : 'إبحث عن مدينة أو حي...'}
                            className="w-full py-2 bg-transparent text-sm outline-none text-gray-700"
                            style={{ fontFamily: fontFam }}
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600 px-2">
                                ✕
                            </button>
                        )}
                        <button className="bg-[#234745] hover:bg-[#1a3533] text-white px-8 py-2 rounded-full text-sm font-bold transition-colors shrink-0" style={{ fontFamily: fontFam }}>
                            {isEn ? 'Search' : 'بحث'}
                        </button>
                    </div>

                    {/* Filter Pills (Dynamic from custom.city metafields) */}
                    <div className="flex-1 overflow-x-auto scrollbar-hide flex items-center justify-end gap-2 lg:gap-3 w-full" dir={isEn ? 'ltr' : 'rtl'}>
                        {citiesList.map((city) => (
                            <button
                                key={city.id}
                                onClick={() => setSelectedCity(city.cityName)}
                                className={`whitespace-nowrap px-5 py-2 rounded-full text-[13px] font-bold transition-colors border ${selectedCity === city.cityName ? 'bg-[#BBCFCD] border-[#BBCFCD] text-[#234745]' : 'bg-white border-gray-300 text-gray-500 hover:border-gray-400'}`}
                                style={{ fontFamily: fontFam }}
                            >
                                {isEn ? city.nameEn : city.nameAr}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ─── MAP & LIST LAYOUT ────────────────────────────────────────────── */}
            <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-6 !mb-4">
                <div className="flex flex-col lg:flex-row gap-6 h-auto lg:h-[800px]">

                    {/* List Area */}
                    <div className="w-full lg:w-[400px] flex flex-col h-[380px] lg:h-full bg-white border border-gray-300 rounded-[20px] p-4 shrink-0">
                        <div className="mb-4 text-[#1a1a1a] font-bold text-[14px] flex items-center justify-between px-2" style={{ fontFamily: fontFam }}>
                            <span>{isEn ? `Showing ${filteredLocations.length} Branches` : `عرض ${filteredLocations.length} فروع`}</span>
                            {selectedCity !== 'all' && (
                                <button onClick={() => setSelectedCity('all')} className="text-xs text-[#234745] underline font-normal">
                                    {isEn ? 'Show All' : 'إظهار الكل'}
                                </button>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                            {filteredLocations.map((branch: any) => {
                                const rawShift1 = branch.working_hours_from?.value && branch.working_hours_to?.value
                                    ? `${branch.working_hours_from.value} - ${branch.working_hours_to.value}`
                                    : `${isEn ? '8:00 AM' : '8:00 ص'} - ${isEn ? '11:00 PM' : '11:00 م'}`;
                                const rawShift2 = branch.working_hours_from_shift2?.value && branch.working_hours_to_shift2?.value
                                    ? `${branch.working_hours_from_shift2.value} - ${branch.working_hours_to_shift2.value}`
                                    : '';
                                const hours = forceEnglishDigits(rawShift2 ? `${rawShift1} & ${rawShift2}` : rawShift1);
                                const isSelected = selectedBranch?.id === branch.id;
                                const cityName = getBranchCity(branch);

                                return (
                                    <div
                                        key={branch.id}
                                        onClick={() => handleBranchClick(branch)}
                                        className={`bg-[#F8F9FA] rounded-xl p-4 border transition-all cursor-pointer ${isSelected ? 'border-0 bg-[#FEF8EB]' : 'border-transparent hover:border-gray-200'}`}
                                    >
                                        <div className="flex justify-between items-center mb-3">
                                            <h3 className="font-bold text-[14px] text-[#234745]" style={{ fontFamily: fontFam }}>
                                                {branch.name}
                                            </h3>
                                            <span className="px-3 py-1 rounded-full text-[13px] font-normal bg-[#BBCFCD] text-gray-600" style={{ fontFamily: fontFam }}>
                                                {isEn ? 'Open Now' : 'مفتوح الآن'}
                                            </span>
                                        </div>
                                        <p className="text-[#9FB7AE] font-medium text-[16px] !mb-2 leading-relaxed" style={{ fontFamily: fontFam }}>
                                            {branch.address?.address1} {cityName ? `, ${cityName}` : (branch.address?.city ? `, ${branch.address.city}` : '')}
                                        </p>
                                        <div className="flex !items-center gap-1.5 text-[#9FB7AE] text-[11px] mb-4 font-medium" style={{ fontFamily: fontFam }}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                            <span dir="ltr">{hours}</span>
                                        </div>

                                        <div className="flex items-center justify-end gap-2">
                                            {branch.address?.phone && (
                                                <a
                                                    href={`tel:${branch.address.phone}`}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="text-center bg-white border border-gray-400 text-gray-700 px-5 py-1.5 rounded-full text-[12px] font-bold hover:bg-gray-50 transition-colors cursor-pointer"
                                                    style={{ fontFamily: fontFam }}
                                                >
                                                    {isEn ? 'Call' : 'اتصال'}
                                                </a>
                                            )}
                                            {!branch.address?.phone && (
                                                <button
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="bg-white border border-gray-400 text-gray-700 px-5 py-1.5 rounded-full text-[12px] font-bold hover:bg-gray-50 transition-colors"
                                                    style={{ fontFamily: fontFam }}
                                                >
                                                    {isEn ? 'Call' : 'اتصال'}
                                                </button>
                                            )}
                                            <a
                                                href={`https://www.google.com/maps/dir/?api=1&destination=${branch.address?.latitude || ''},${branch.address?.longitude || ''}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="bg-[#234745] hover:bg-[#1a3533] !text-white px-5 py-1.5 rounded-full text-[12px] font-bold transition-colors inline-block text-center cursor-pointer"
                                                style={{ fontFamily: fontFam }}
                                            >
                                                {isEn ? 'Directions' : 'الإتجاهات'}
                                            </a>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Map Area */}
                    <div className="w-full bg-gray-200 rounded-[20px] overflow-hidden h-[420px] lg:h-full lg:flex-1 relative border border-gray-300 z-10 flex items-center justify-center">
                        {mapError && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-20 p-6 text-center text-red-500 font-bold" style={{ fontFamily: fontFam }}>
                                {mapError}
                            </div>
                        )}
                        {!mapLoaded && !mapError && (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-20">
                                <div className="w-8 h-8 border-4 border-[#234745] border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        )}
                        {/* Interactive Native Google Map */}
                        <div ref={mapRef} className="w-full h-full min-h-[420px] lg:min-h-full" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />

                        {/* Static Floating Card matching mockup */}
                        {selectedBranch && (
                            <div
                                className="absolute bottom-4 left-1/2 -translate-x-1/2 lg:bottom-10 lg:left-10 lg:translate-x-0 bg-white rounded-[12px] shadow-lg p-4 w-[300px] z-30"
                                style={{ fontFamily: fontFam }}
                            >                                <h4 className="font-bold text-[14px] text-[#1a1a1a] mb-1 text-start">{selectedBranch.name}</h4>
                                <p className="text-[12px] text-gray-500 mb-4 text-start">{selectedBranch.address?.address1 || ''}</p>
                                <div className="flex gap-2">
                                    {selectedBranch.address?.phone ? (
                                        <a
                                            href={`tel:${selectedBranch.address.phone}`}
                                            className="flex-1 text-center bg-white border border-gray-400 text-gray-700 py-1.5 rounded-full text-[12px] font-bold hover:bg-gray-50 transition-colors"
                                        >
                                            {isEn ? 'Call' : 'اتصال'}
                                        </a>
                                    ) : (
                                        <button className="flex-1 bg-white border border-gray-400 text-gray-700 py-1.5 rounded-full text-[12px] font-bold hover:bg-gray-50 transition-colors cursor-not-allowed">
                                            {isEn ? 'Call' : 'اتصال'}
                                        </button>
                                    )}
                                    <a
                                        href={`https://www.google.com/maps/dir/?api=1&destination=${selectedBranch.address?.latitude || ''},${selectedBranch.address?.longitude || ''}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 text-center bg-[#234745] hover:bg-[#1a3533] !text-white py-1.5 rounded-full text-[12px] font-bold transition-colors block cursor-pointer"
                                    >
                                        {isEn ? 'Directions' : 'الإتجاهات'}
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {/* ─── DYNAMIC DELIVERY ZONES (Read directly from custom.city metafield) ───────────────── */}
            <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-4 mb-20">
                <div className="flex flex-row justify-between !items-center mb-8 gap-4">
                    <h2 className="text-[20px] lg:text-[50px] font-bold !mb-0 text-[#234745]" style={{ fontFamily: isEn ? fontFam : "'Bahij Janna', sans-serif" }}>
                        {isEn ? 'Delivery Zones' : 'مناطق التوصيل'}
                    </h2>
                    <div className="flex items-center gap-3 text-[12px] font-normal" style={{ fontFamily: fontFam }}>
                        <div className="flex items-center gap-1 text-[#234745]">
                            <div className="w-2 h-2 rounded-full bg-[#234745]" />
                            <span>{isEn ? 'Delivery Available' : 'توصيل متاح'}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[#9FB7AE]">
                            <div className="w-2 h-2 rounded-full bg-[#9FB7AE]" />
                            <span>{isEn ? 'Pickup Only' : 'استلام فقط'}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
                    {dynamicDeliveryZones.map((zone) => (
                        <div
                            key={zone.cityName}
                            onClick={() => {
                                setSelectedCity(zone.cityName);
                                const el = document.getElementById('branches-search-section');
                                if (el) el.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="bg-white border border-gray-300 rounded-[16px] p-6 text-center transition-all cursor-pointer group"
                        >
                            <h3 className="text-[20px] md:text-[30px] font-bold text-[#234745] mb-2 transition-transform" style={{ fontFamily: isEn ? fontFam2 : "'Bahij Janna', sans-serif" }}>
                                {zone.cityName}
                            </h3>
                            <p className="text-[#9FB7AE] text-[16px] md:text-[18px] font-medium mb-4" style={{ fontFamily: fontFam }}>
                                {zone.branchesText}
                            </p>
                            <div className={`text-[15px] md:text-[18px] font-medium mt-2 ${zone.isPickupOnly ? 'text-gray-400' : 'text-[#234745]'}`} style={{ fontFamily: fontFam }}>
                                {zone.coverage}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}
