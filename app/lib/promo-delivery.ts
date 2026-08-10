export function checkBranchFreeDeliveryInterval(branch: any, selectedTimeSlot?: string): {
    isPromoFreeDelivery: boolean;
    promoStart12h: string;
    promoEnd12h: string;
} {
    if (!branch) return { isPromoFreeDelivery: false, promoStart12h: '', promoEnd12h: '' };

    let fromVal = branch.promoFreeDeliveryFrom || branch.promo_free_delivery_from?.value;
    let toVal = branch.promoFreeDeliveryTo || branch.promo_free_delivery_to?.value;

    const mfList = Array.isArray(branch.metafields)
        ? branch.metafields
        : (Array.isArray(branch?.metafields?.nodes) ? branch.metafields.nodes : []);

    if (!fromVal && mfList.length > 0) {
        fromVal = mfList.find((m: any) => m?.key === 'promo_free_delivery_from')?.value;
    }
    if (!toVal && mfList.length > 0) {
        toVal = mfList.find((m: any) => m?.key === 'promo_free_delivery_to')?.value;
    }

    if (!fromVal || !toVal) return { isPromoFreeDelivery: false, promoStart12h: '', promoEnd12h: '' };

    try {
        const parseMinutesFromStr = (str: string) => {
            const cleaned = String(str).trim();
            const match = cleaned.match(/(\d{1,2}):(\d{2})\s*(am|pm|ص|م)?/i);
            if (!match) return -1;
            let hr = parseInt(match[1], 10);
            const min = parseInt(match[2], 10);
            const period = match[3]?.toLowerCase();
            if (period) {
                const isPm = period === 'pm' || period === 'م';
                const isAm = period === 'am' || period === 'ص';
                if (isPm && hr !== 12) hr += 12;
                if (isAm && hr === 12) hr = 0;
            }
            return hr * 60 + min;
        };

        let promoStartMins = parseMinutesFromStr(fromVal);
        let promoEndMins = parseMinutesFromStr(toVal);

        if (promoStartMins < 0 || promoEndMins < 0) return { isPromoFreeDelivery: false, promoStart12h: '', promoEnd12h: '' };

        // Smart auto-fix: If end time is entered as "4:00" (4h) while start is "12:00" (12h) or end < start, auto-convert "4:00" to 16:00 (4 PM)
        if (promoStartMins >= 12 * 60 && promoEndMins < promoStartMins && promoEndMins < 12 * 60) {
            promoEndMins += 12 * 60;
        }

        let isPromoFreeDelivery = false;

        // Check selected time slot (e.g. "2:00 PM - 4:00 PM" or "14:00 - 16:00" or "02:00 م - 04:00 م")
        // MUST only apply when customer explicitly selects an eligible time slot
        if (selectedTimeSlot && String(selectedTimeSlot).trim()) {
            const slotStr = String(selectedTimeSlot).trim();
            const parts = slotStr.split(/\s*[-–toإلى]\s*/);
            if (parts.length >= 1) {
                const slotStartMins = parseMinutesFromStr(parts[0]);
                const slotEndMins = parts[1] ? parseMinutesFromStr(parts[1]) : slotStartMins;

                if (slotStartMins >= 0) {
                    if (slotStartMins >= promoStartMins && (slotEndMins <= promoEndMins || slotStartMins < promoEndMins)) {
                        isPromoFreeDelivery = true;
                    }
                }
            }
        }

        const format12h = (totalMins: number) => {
            const h = Math.floor(totalMins / 60) % 24;
            const m = totalMins % 60;
            const period = h >= 12 ? 'م' : 'ص';
            const displayH = h % 12 === 0 ? 12 : h % 12;
            const displayM = m < 10 ? `0${m}` : `${m}`;
            return `${displayH}:${displayM} ${period}`;
        };

        return {
            isPromoFreeDelivery,
            promoStart12h: format12h(promoStartMins),
            promoEnd12h: format12h(promoEndMins)
        };
    } catch (e) {
        return { isPromoFreeDelivery: false, promoStart12h: '', promoEnd12h: '' };
    }
}
