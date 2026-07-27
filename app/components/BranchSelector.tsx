import React, { useState, useEffect, useRef } from 'react';
import { parseLocationToBranch, FALLBACK_BRANCHES, getDistance } from './DeliveryPickupModal';
import type { Branch } from './DeliveryPickupModal';

interface BranchSelectorProps {
    locationsPromise?: Promise<any>;
    locale?: string;
    onSelectBranch?: (name: string, id: string) => void;
    selectedBranchName?: string;
    className?: string;
    fulfillmentType?: 'delivery' | 'pickup';
}

export function BranchSelector({ locationsPromise, locale, onSelectBranch, selectedBranchName, className = '', fulfillmentType = 'pickup' }: BranchSelectorProps) {
    const isEn = locale === 'en';
    const defaultName = isEn ? 'Olaya Branch' : 'فرع العليا';
    const currentName = selectedBranchName || defaultName;

    const [isOpen, setIsOpen] = useState(false);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [userCoords, setUserCoords] = useState<{ lat: number, lng: number } | null>(null);

    // Resolve the locations promise once on mount
    useEffect(() => {
        if (!locationsPromise) {
            setBranches(FALLBACK_BRANCHES);
            setIsLoading(false);
            return;
        }
        let cancelled = false;
        locationsPromise.then((locationsData: any) => {
            if (cancelled) return;
            const nodes = locationsData?.locations?.nodes || [];
            const parsed: Branch[] = nodes.length > 0
                ? nodes.map((n: any) => parseLocationToBranch(n))
                : FALLBACK_BRANCHES;
            setBranches(parsed);
            setIsLoading(false);
        }).catch(() => {
            if (!cancelled) {
                setBranches(FALLBACK_BRANCHES);
                setIsLoading(false);
            }
        });
        return () => { cancelled = true; };
    }, [locationsPromise]);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Get user geolocation when opened
    useEffect(() => {
        if (isOpen && typeof navigator !== 'undefined' && "geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => setUserCoords({ lat: position.coords.latitude, lng: position.coords.longitude }),
                () => {},
                { enableHighAccuracy: true }
            );
        }
    }, [isOpen]);

    // Enrich branches with distance
    const enrichedBranches = branches.map(b => {
        let distanceKm: number | undefined = undefined;
        let distanceStr: string | undefined = undefined;
        if (userCoords && b.lat && b.lng) {
            distanceKm = getDistance(userCoords.lat, userCoords.lng, b.lat, b.lng);
            distanceStr = locale === 'en' ? `${distanceKm.toFixed(1)} KM` : `${distanceKm.toFixed(1)} كم`;
        }
        return { ...b, distanceKm, distance: distanceStr };
    }).sort((a, b) => (a.distanceKm || 9999) - (b.distanceKm || 9999));

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f5f3f1] border border-[#e8e4e1] text-[#234745] text-[12px] font-bold hover:bg-[#ebe8e4] transition-colors whitespace-nowrap cursor-pointer"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="text-gray-400 font-medium">{isEn ? 'Pickup from:' : 'استلام من:'}</span>
                <span className="truncate max-w-[150px]">{currentName}</span>
                <svg width="10" height="10" viewBox="0 0 20 20" fill="#999" className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                    <path d="M5 7l5 5 5-5H5z" />
                </svg>
            </button>

            {isOpen && (
                <div 
                    className="absolute top-full mt-1.5 w-[calc(100vw-32px)] sm:w-[320px] bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden max-h-[420px] flex flex-col" 
                    style={{ 
                        zIndex: 9999,
                        insetInlineStart: 0 // Responsive alignment based on RTL/LTR
                    }}
                >
                    {/* Header */}
                    <div className="bg-[#f9f7f5] px-4 py-2.5 border-b border-gray-100 flex items-center justify-between shrink-0">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                            {isEn ? 'Select Branch' : 'اختر الفرع'}
                        </span>
                        <span className="text-[10px] text-gray-300">{enrichedBranches.length} {isEn ? 'branches' : 'فرع'}</span>
                    </div>

                    {/* Branch list */}
                    <div className="flex-1 overflow-y-auto">
                        {isLoading ? (
                            <div className="p-6 text-center">
                                <div className="inline-block w-5 h-5 border-2 border-gray-200 border-t-[#234745] rounded-full animate-spin"></div>
                                <p className="mt-2 text-[12px] text-gray-400">{isEn ? 'Loading branches...' : 'جاري تحميل الفروع...'}</p>
                            </div>
                        ) : (
                            enrichedBranches.map(branch => {
                                const isSelected = branch.name === currentName;
                                return (
                                    <button
                                        key={branch.id}
                                        onClick={() => {
                                            onSelectBranch?.(branch.name, branch.id);
                                            setIsOpen(false);
                                        }}
                                        className={`w-full text-start px-4 py-3 border-b border-gray-50 flex items-center gap-3 transition-colors hover:bg-[#f5f3f1] ${isSelected ? 'bg-[#eaf5ee]' : ''}`}
                                    >
                                        {/* Store icon */}
                                        <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isSelected ? 'bg-[#234745] text-white' : 'bg-gray-100 text-gray-400'}`}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                                <polyline points="9 22 9 12 15 12 15 22" />
                                            </svg>
                                        </div>
                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className={`text-[13px] font-bold truncate ${isSelected ? 'text-[#234745]' : 'text-gray-800'}`}>
                                                    {branch.name}
                                                </span>
                                                {isSelected && (
                                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#27ae60" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                                                        <polyline points="20 6 9 17 4 12" />
                                                    </svg>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-gray-400 mt-0.5 truncate">{branch.address || branch.city}</p>
                                        </div>
                                        {/* Distance */}
                                        {branch.distance && (
                                            <span className="shrink-0 text-[10px] whitespace-nowrap text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
                                                {branch.distance}
                                            </span>
                                        )}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
