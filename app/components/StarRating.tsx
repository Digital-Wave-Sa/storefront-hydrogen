import React, { useMemo } from 'react';
import { useRouteLoaderData } from 'react-router';
import { Await } from 'react-router';
import { Suspense } from 'react';

/**
 * Parses Shopify Rating metafield values.
 * Handles both plain strings/numbers and Shopify's JSON rating objects: {"value":"4.5", "scale_max":5.0}
 */
export function parseRatingValue(value: any): number {
    if (!value) return 0;
    if (typeof value === 'number') return value;
    try {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value;
        return parseFloat(parsed.value || parsed.rating || value);
    } catch (e) {
        return parseFloat(value);
    }
}

export function StarRating({ 
    rating, 
    count, 
    size = 'md', 
    locale = 'ar', 
    productHandle,
    locationId,
    hideText = false
}: { 
    rating?: string | number, 
    count?: string | number, 
    size?: 'xs' | 'sm' | 'md' | 'lg', 
    locale?: string, 
    productHandle?: string,
    locationId?: string,
    hideText?: boolean
}) {
    const rootData = useRouteLoaderData('root') as any;
    const isEn = locale === 'en';

    // Size styles
    const starSizes = {
        xs: 'w-2.5 h-2.5',
        sm: 'w-3 h-3',
        md: 'w-4 h-4',
        lg: 'w-5 h-5'
    };
    const textSizes = {
        xs: 'text-[9px]',
        sm: 'text-[10px]',
        md: 'text-[12px]',
        lg: 'text-[14px]'
    };

    // Calculate dynamic values
    const [finalRating, finalCount] = useMemo(() => {
        const initialRating = typeof rating === 'number' ? rating : parseRatingValue(rating);
        const initialCount = parseInt(String(count || '0'));

        if ((!productHandle && !locationId) || !rootData?.reviews) {
            return [initialRating, initialCount];
        }

        // Processing reviews from root data (Admin API returns nodes directly)
        const allNodes = rootData.reviews?.nodes || rootData.reviews?.metaobjects?.nodes || [];
        const reviews = allNodes.map((node: any) => {
            const f: any = {};
            node.fields.forEach((field: any) => f[field.key] = field.value);
            return f;
        });

        const filteredReviews = reviews.filter((r: any) => {
            if (productHandle) {
                return r.product_handle === productHandle && r.status === 'Approved';
            }
            if (locationId) {
                // Support both full GID and numeric ID comparison
                return (r.location_id === locationId || r.location_id?.split('/').pop() === locationId?.split('/').pop()) && r.status === 'Approved';
            }
            return false;
        });

        if (filteredReviews.length === 0) {
            return [initialRating, initialCount];
        }

        const sum = filteredReviews.reduce((acc: number, r: any) => acc + parseFloat(r.rating || 0), 0);
        return [sum / filteredReviews.length, filteredReviews.length];
    }, [rating, count, productHandle, locationId, rootData]);

    const numericRating = finalRating || 0;
    const numericCount = finalCount || 0;
    
    // Draw 5 stars filling sequentially
    const renderStars = () => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            let fillPercentage = 0;
            if (numericRating >= i) fillPercentage = 100;
            else if (numericRating > i - 1) fillPercentage = (numericRating - (i - 1)) * 100;

            stars.push(
                <div key={i} className={`relative ${starSizes[size]}`}>
                   {/* Background Star (Gray) */}
                   <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute top-0 left-0 w-full h-full text-gray-200">
                      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/>
                   </svg>
                   {/* Foreground Star (Gold) clipped */}
                   <div className="absolute top-0 left-0 h-full overflow-hidden" style={{ width: `${fillPercentage}%`, direction: isEn ? 'ltr' : 'rtl' }}>
                       <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`absolute top-0 ${isEn ? 'left-0' : 'right-0'} ${starSizes[size]} text-[#f39c12]`}>
                          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/>
                       </svg>
                   </div>
                </div>
            );
        }
        return stars;
    };

    if (hideText) {
        return (
            <div className={`flex items-center gap-0.5 ${!isEn && 'flex-row-reverse'}`}>
                {renderStars()}
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1.5 font-bold">
            <div className={`flex items-center gap-0.5 ${!isEn && 'flex-row-reverse'}`}>
                {renderStars()}
            </div>
            <span className={`text-gray-700 ${textSizes[size]} mt-0.5`}>{numericRating.toFixed(1)}</span>
            {numericCount > 0 && (
                <span className={`text-gray-400 ${textSizes[size]} mt-0.5`}>
                    ({isEn ? numericCount : new Intl.NumberFormat('en-US').format(numericCount)})
                </span>
            )}
        </div>
    );
}
