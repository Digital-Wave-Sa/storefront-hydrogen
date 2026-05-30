import { useOutletContext, useRouteLoaderData } from 'react-router';
import { useEffect, useRef, useState } from 'react';
import type { Route } from './+types/($locale).pages.branches';
import patternBg from '~/assets/patteren-collection-header.svg';

export const meta: Route.MetaFunction = () => {
  return [{ title: 'Our Branches | فروعنا' }];
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
    const locations = rootData?.locations?.locations?.nodes || [];
    
    const isEn = locale === 'en';
    const fontClass = isEn ? 'font-en' : 'font-ar';
    const fontFam = isEn ? "'Inter', sans-serif" : "'GE Dinar One', sans-serif";
    
    const branchCount = locations.length > 0 ? locations.length : 117;
    const googleMapsKey = rootData?.env?.PUBLIC_GOOGLE_MAPS_KEY || (typeof window !== 'undefined' ? (window as any).ENV?.PUBLIC_GOOGLE_MAPS_KEY : undefined);
    
    const mapRef = useRef<HTMLDivElement>(null);
    const [mapError, setMapError] = useState<string>('');
    const [mapLoaded, setMapLoaded] = useState(false);

    useEffect(() => {
        if (!googleMapsKey || typeof window === 'undefined') {
            setMapError('Google Maps API key is missing.');
            return;
        }

        const initMap = () => {
            try {
                if (!mapRef.current || !(window as any).google) return;
                
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
                setTimeout(initMap, 1000);
            }
        } else {
            initMap();
        }
    }, [googleMapsKey, locations, isEn]);

    return (
        <div className={`w-full bg-[#FAFAFA] min-h-screen ${fontClass}`} dir={isEn ? 'ltr' : 'rtl'}>
            
            {/* ─── HERO SECTION ─────────────────────────────────────────────────── */}
            <section className="relative bg-[#234745] text-white pt-20 pb-16 px-6 text-center overflow-hidden">
                <div
                    className="absolute inset-0 pointer-events-none opacity-100"
                    style={{
                        backgroundImage: `url(${patternBg})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat'
                    }}
                />
                <div className="relative z-10 w-full flex flex-col items-center justify-center text-center">
                    <p className="text-[#BBCFCD] text-[12px] font-bold mb-4" style={{ fontFamily: fontFam, lineHeight: '100%' }}>
                        {isEn ? 'Our Branches' : 'فروعنا'}
                    </p>
                    <h1 className="text-[32px] md:text-[50px] font-bold mb-4" style={{ fontFamily: isEn ? '' : "'Bahij Janna', sans-serif", lineHeight: '100%', color: '#FEF8EB' }}>
                        {isEn ? `${branchCount} Branches Across the Kingdom` : `${branchCount} فرع في أنحاء المملكة`}
                    </h1>
                    <p className="text-[#BBCFCD] text-[16px] mb-12 max-w-lg mx-auto" style={{ fontFamily: fontFam, lineHeight: '100%' }}>
                        {isEn ? 'Search for the nearest branch or check delivery availability in your area' : 'ابحث عن أقرب فرع أو تحقق من توفر التوصيل لمنطقتك'}
                    </p>

                    {/* Stats */}
                    <div className="flex justify-center items-center gap-8 lg:gap-16 mt-8 w-full" style={{ fontFamily: fontFam }}>
                        <div>
                            <div className="text-2xl lg:text-3xl font-bold mb-1">{isEn ? branchCount : branchCount}</div>
                            <div className="text-white/60 text-xs lg:text-sm">{isEn ? 'Branches' : 'فرع'}</div>
                        </div>
                        <div>
                            <div className="text-2xl lg:text-3xl font-bold mb-1" dir="ltr">{isEn ? '35+' : '+٣٥'}</div>
                            <div className="text-white/60 text-xs lg:text-sm">{isEn ? 'Cities' : 'مدينة'}</div>
                        </div>
                        <div>
                            <div className="text-2xl lg:text-3xl font-bold mb-1" dir="ltr">{isEn ? '24/7' : '٢٤/٧'}</div>
                            <div className="text-white/60 text-xs lg:text-sm">{isEn ? 'Most Branches' : 'معظم الفروع'}</div>
                        </div>
                        <div>
                            <div className="text-2xl lg:text-3xl font-bold mb-1">{isEn ? '10 Min' : '١٠ دقيقة'}</div>
                            <div className="text-white/60 text-xs lg:text-sm">{isEn ? 'Prep Time' : 'وقت التجهيز'}</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── SEARCH & FILTER BAR ──────────────────────────────────────────── */}
            <div className="bg-white py-6">
                <div className="max-w-[1400px] mx-auto px-4 lg:px-6 flex flex-col lg:flex-row items-center justify-between gap-6">
                    {/* Search Input */}
                    <div className="w-full lg:w-[450px] flex items-center bg-white border border-gray-300 rounded-full p-1 relative shrink-0">
                        <div className="pl-4 pr-3 text-gray-400">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                        </div>
                        <input 
                            type="text" 
                            placeholder={isEn ? 'Search for city or neighborhood...' : 'إبحث عن مدينة أو حي...'}
                            className="w-full py-2 bg-transparent text-sm outline-none text-gray-700"
                            style={{ fontFamily: fontFam }}
                        />
                        <button className="bg-[#234745] hover:bg-[#1a3533] text-white px-8 py-2 rounded-full text-sm font-bold transition-colors shrink-0" style={{ fontFamily: fontFam }}>
                            {isEn ? 'Search' : 'بحث'}
                        </button>
                    </div>

                    {/* Filter Pills */}
                    <div className="flex-1 overflow-x-auto scrollbar-hide flex items-center justify-end gap-2 lg:gap-3 w-full" dir={isEn ? 'ltr' : 'rtl'}>
                        {cities.map((city, idx) => (
                            <button 
                                key={idx}
                                className={`whitespace-nowrap px-5 py-2 rounded-full text-[13px] font-bold transition-colors border ${idx === 0 ? 'bg-[#BBCFCD] border-[#BBCFCD] text-[#234745]' : 'bg-white border-gray-300 text-gray-500 hover:border-gray-400'}`}
                                style={{ fontFamily: fontFam }}
                            >
                                {isEn ? city.nameEn : city.nameAr}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ─── MAP & LIST LAYOUT ────────────────────────────────────────────── */}
            <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-6 mb-12">
                <div className="flex flex-col lg:flex-row gap-6 h-auto lg:h-[800px]">
                    
                    {/* List Area (First in DOM so it's on the right in RTL) */}
                    <div className="w-full lg:w-[400px] flex flex-col h-full bg-white border border-gray-300 rounded-[20px] p-4 shrink-0">
                        <div className="mb-4 text-[#1a1a1a] font-bold text-[14px] flex items-center justify-start px-2" style={{ fontFamily: fontFam }}>
                            <span>{isEn ? `Showing ${locations.length} Branches` : `عرض ${locations.length} فروع`}</span>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                            {locations.map((branch: any) => {
                                const hours = `${branch.working_hours_from?.value || '8:00 ص'} - ${branch.working_hours_to?.value || '11:00 م'}`;
                                
                                return (
                                <div key={branch.id} className="bg-[#F8F9FA] rounded-xl p-4 border border-transparent hover:border-gray-200 transition-colors">
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className="font-bold text-[14px] text-[#234745]" style={{ fontFamily: fontFam }}>
                                            {branch.name}
                                        </h3>
                                        <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-[#E2E8F0] text-gray-600" style={{ fontFamily: fontFam }}>
                                            {isEn ? 'Open Now' : 'مفتوح الآن'}
                                        </span>
                                    </div>
                                    <p className="text-gray-500 text-[12px] mb-2 leading-relaxed" style={{ fontFamily: fontFam }}>
                                        {branch.address?.address1} {branch.address?.city ? `, ${branch.address.city}` : ''}
                                    </p>
                                    <div className="flex items-center gap-1.5 text-gray-400 text-[11px] mb-4 font-medium" style={{ fontFamily: fontFam }}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                        <span dir="ltr">{hours}</span>
                                    </div>
                                    
                                    <div className="flex items-center justify-end gap-2">
                                        {branch.address?.phone && (
                                            <a href={`tel:${branch.address.phone}`} className="text-center bg-white border border-gray-400 text-gray-700 px-5 py-1.5 rounded-full text-[12px] font-bold hover:bg-gray-50 transition-colors" style={{ fontFamily: fontFam }}>
                                                {isEn ? 'Call' : 'اتصال'}
                                            </a>
                                        )}
                                        {!branch.address?.phone && (
                                            <button className="bg-white border border-gray-400 text-gray-700 px-5 py-1.5 rounded-full text-[12px] font-bold hover:bg-gray-50 transition-colors" style={{ fontFamily: fontFam }}>
                                                {isEn ? 'Call' : 'اتصال'}
                                            </button>
                                        )}
                                        <button className="bg-[#234745] hover:bg-[#1a3533] text-white px-5 py-1.5 rounded-full text-[12px] font-bold transition-colors" style={{ fontFamily: fontFam }}>
                                            {isEn ? 'Directions' : 'الإتجاهات'}
                                        </button>
                                    </div>
                                </div>
                            )})}
                        </div>
                    </div>

                    {/* Map Area */}
                    <div className="w-full flex-1 bg-gray-200 rounded-[20px] overflow-hidden h-[500px] lg:h-full relative border border-gray-300 z-10 flex items-center justify-center">
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
                        <div ref={mapRef} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
                        
                        {/* Static Floating Card matching mockup */}
                        <div className="absolute bottom-6 left-6 lg:bottom-10 lg:left-10 bg-white rounded-[16px] shadow-lg p-5 w-[300px] z-30" style={{ fontFamily: fontFam }}>
                            <h4 className="font-bold text-[14px] text-[#1a1a1a] mb-1 text-right">فرع الدمام مول</h4>
                            <p className="text-[12px] text-gray-500 mb-4 text-right">الدمام مول، طريق الملك فهد</p>
                            <div className="flex gap-2">
                                <button className="flex-1 bg-white border border-gray-400 text-gray-700 py-1.5 rounded-full text-[12px] font-bold hover:bg-gray-50 transition-colors">
                                    اتصال
                                </button>
                                <button className="flex-1 bg-[#234745] hover:bg-[#1a3533] text-white py-1.5 rounded-full text-[12px] font-bold transition-colors">
                                    الإتجاهات
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* ─── DELIVERY ZONES ───────────────────────────────────────────────── */}
            <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-12 mb-20">
                <div className="flex flex-col lg:flex-row justify-between items-center mb-8 gap-4">
                    <h2 className="text-3xl lg:text-4xl font-bold text-[#1a1a1a]" style={{ fontFamily: isEn ? fontFam : "'Bahij Janna', sans-serif" }}>
                        {isEn ? 'Delivery Zones' : 'مناطق التوصيل'}
                    </h2>
                    <div className="flex items-center gap-6 text-[12px] font-bold" style={{ fontFamily: fontFam }}>
                        <div className="flex items-center gap-2 text-[#234745]">
                            <div className="w-2 h-2 rounded-full bg-[#234745]" />
                            <span>{isEn ? 'Delivery Available' : 'توصيل متاح'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                            <div className="w-2 h-2 rounded-full bg-gray-400" />
                            <span>{isEn ? 'Pickup Only' : 'استلام فقط'}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
                    {deliveryZones.map((zone, idx) => (
                        <div key={idx} className="bg-white border border-gray-300 rounded-[16px] p-8 text-center hover:shadow-sm transition-shadow">
                            <h3 className="text-[22px] font-bold text-[#1a1a1a] mb-2" style={{ fontFamily: isEn ? fontFam : "'Bahij Janna', sans-serif" }}>
                                {isEn ? zone.nameEn : zone.nameAr}
                            </h3>
                            <p className="text-gray-400 text-[13px] font-medium mb-5" style={{ fontFamily: fontFam }}>
                                {isEn ? zone.branchesEn : zone.branchesAr}
                            </p>
                            <div className="text-[#1a1a1a] text-[13px] font-bold" style={{ fontFamily: fontFam }}>
                                {isEn ? zone.coverageEn : zone.coverageAr}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
}
