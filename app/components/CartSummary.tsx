import type { CartApiQueryFragment } from 'storefrontapi.generated';
import type { CartLayout } from '~/components/CartMain';
import { CartForm, Money, type OptimisticCart } from '@shopify/hydrogen';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useFetcher, useRouteLoaderData, Link, useLocation, Form } from 'react-router';
import { useAside } from '~/components/Aside';
import { Price, SaudiRiyalSymbol } from './Price';
import { DeliveryPickupModal, checkBranchFreeDeliveryInterval } from './DeliveryPickupModal';

import { isDiscountValidForLocation, parseLocationDiscountsJSON } from '~/lib/discounts';

type CartSummaryProps = {
  cart: OptimisticCart<CartApiQueryFragment | null>;
  layout: CartLayout;
};

export function CartSummary({ cart, layout }: CartSummaryProps) {
  const summaryId = useId();
  const discountsHeadingId = useId();
  const discountCodeInputId = useId();
  const giftCardHeadingId = useId();
  const giftCardInputId = useId();

  const location = useLocation();
  const isEn = location.pathname.split('/')[1]?.toLowerCase() === 'en';
  const cartRoute = isEn ? '/en/cart' : '/cart';
  const rootData = useRouteLoaderData('root') as any;

  const rawSubtotal = Number(cart?.cost?.subtotalAmount?.amount ?? 0);
  const currencyCode = cart?.cost?.subtotalAmount?.currencyCode || 'SAR';

  // Calculate value of lines tagged with _is_free that haven't been discounted by Shopify yet
  const freeItemsValue = cart?.lines?.nodes?.reduce((acc: number, line: any) => {
    const isFree = line.attributes?.some((a: any) => a.key === '_is_free' && a.value === 'true');
    if (isFree) {
      const lineCost = parseFloat(line.cost?.totalAmount?.amount || '0');
      const lineDiscount = line?.discountAllocations?.reduce((lAcc: number, alloc: any) => {
        return lAcc + parseFloat(alloc?.discountedAmount?.amount || '0');
      }, 0) || 0;
      const netLineCost = Math.max(0, lineCost - lineDiscount);
      return acc + netLineCost;
    }
    return acc;
  }, 0) || 0;

  const subtotal = Math.max(0, rawSubtotal - freeItemsValue);

  // Calculate total discount from all discount allocations
  const cartDiscountAmount = cart?.discountAllocations?.reduce((acc: number, allocation: any) => {
    return acc + parseFloat(allocation?.discountedAmount?.amount || '0');
  }, 0) || 0;

  const lineDiscountAmount = cart?.lines?.nodes?.reduce((acc: number, line: any) => {
    const lineDiscount = line?.discountAllocations?.reduce((lAcc: number, allocation: any) => {
      return lAcc + parseFloat(allocation?.discountedAmount?.amount || '0');
    }, 0) || 0;
    return acc + lineDiscount;
  }, 0) || 0;

  const totalDiscount = cartDiscountAmount + lineDiscountAmount;
  const subtotalBeforeDiscounts = subtotal + lineDiscountAmount;

  // Split loyalty discount from other discounts
  const appliedPointsStr = cart?.attributes?.find((a: any) => a.key === 'loyalty_points')?.value;
  const loyaltyPointsRedeemed = parseInt(appliedPointsStr) || 0;
  const expectedLoyaltyDiscount = loyaltyPointsRedeemed * 0.01;
  const hasLoyaltyDiscount = cart?.discountCodes?.some((dc: any) => dc.code?.startsWith('LOYALTY-')) && expectedLoyaltyDiscount > 0;
  const loyaltyDiscountDisplay = hasLoyaltyDiscount ? expectedLoyaltyDiscount : 0;

  // Split store credit / wallet discount from other discounts
  const appliedCreditStr = cart?.attributes?.find((a: any) => a.key === 'store_credit_amount')?.value;
  const appliedCreditAmount = parseFloat(appliedCreditStr || '0') || 0;
  const hasStoreCreditDiscount = cart?.discountCodes?.some((dc: any) => dc.code?.startsWith('CREDIT-')) && appliedCreditAmount > 0;
  const storeCreditDiscountDisplay = hasStoreCreditDiscount ? appliedCreditAmount : 0;

  // Make sure we don't show negative other discounts due to floating point math
  const otherDiscountDisplay = Math.max(0, totalDiscount - loyaltyDiscountDisplay - storeCreditDiscountDisplay);

  const attributes = cart?.attributes || [];

  // Fallbacks to session values if cart attributes are not written or cleared
  const sessionBranchName = rootData?.selectedLocationName;
  const isSessionPlaceholder = !sessionBranchName ||
    sessionBranchName.includes('اختر') ||
    sessionBranchName.toLowerCase().includes('select');

  const attrBranch = attributes.find((a: any) => a.key.toLowerCase().trim() === 'branch')?.value;
  const isAttrPlaceholder = !attrBranch ||
    attrBranch.includes('اختر') ||
    attrBranch.toLowerCase().includes('select');

  const isBranchPlaceholder = isAttrPlaceholder && isSessionPlaceholder;
  const branch = !isAttrPlaceholder ? attrBranch : (!isSessionPlaceholder ? sessionBranchName : undefined);

  const attrBranchId = attributes.find((a: any) => a.key.toLowerCase().trim() === 'branch id')?.value;
  const branchId = attrBranchId || (!isSessionPlaceholder ? rootData?.selectedLocationId : undefined);

  const attrFulfillmentType = attributes.find((a: any) => a.key.toLowerCase().trim() === 'fulfillment type')?.value;
  const fulfillmentType = attrFulfillmentType || rootData?.fulfillmentType;

  const [adminLocations, setAdminLocations] = useState<any[]>([]);
  useEffect(() => {
    fetch('/api/locations-meta')
      .then((res) => res.json())
      .then((data) => {
        if (data?.locations) {
          setAdminLocations(data.locations);
        }
      })
      .catch((err) => console.error('[CartSummary] Failed to fetch locations-meta:', err));
  }, []);

  // Dynamic Settings from Metafields
  const rawLocations = rootData?.locations?.locations?.nodes || rootData?.locations?.nodes || [];
  const locations = adminLocations.length > 0 ? adminLocations : rawLocations;
  // Match by numerical ID or full GID, then fallback to English or Arabic name matching
  const currentBranch = locations.find((loc: any) => {
    if (!loc) return false;
    const locId = String(loc.id || '');
    const numId = locId.split('/').pop();
    const targetBranchId = String(branchId || rootData?.selectedLocationId || '').split('/').pop();

    const locBranchCode = String(loc.branch_id?.value || loc.branch_id || loc.branch_code?.value || loc.branch_code || '').toLowerCase().trim();
    const locAxStoreId = String(loc.ax_store_id?.value || loc.ax_store_id || '').toLowerCase().trim();

    const locName = String(loc.name || loc.rawName || '').toLowerCase().trim();
    const locArabicName = String(
      loc.name_in_arabic?.value || loc.name_in_arabic || loc.nameInArabic || loc.metafields?.find((m: any) => m?.key === 'name_in_arabic')?.value || ''
    ).toLowerCase().trim();
    const searchBranch = String(branch || sessionBranchName || '').toLowerCase().trim();

    const isIdMatch = targetBranchId && (
      locId === branchId ||
      locId === rootData?.selectedLocationId ||
      numId === targetBranchId ||
      (locBranchCode && locBranchCode === targetBranchId.toLowerCase()) ||
      (locAxStoreId && locAxStoreId === targetBranchId.toLowerCase())
    );

    const isNameMatch = searchBranch && !isBranchPlaceholder && (
      locName === searchBranch ||
      locArabicName === searchBranch ||
      (locName && searchBranch.includes(locName)) ||
      (locArabicName && searchBranch.includes(locArabicName)) ||
      (locName && locName.includes(searchBranch)) ||
      (locArabicName && locArabicName.includes(searchBranch))
    );

    return isIdMatch || isNameMatch;
  });

  const isPickup = fulfillmentType?.toLowerCase() === 'pickup';

  const selectedDate = attributes.find((a: any) => a.key === 'delivery_date')?.value || '';
  const timeSlot = attributes.find((a: any) => a.key.toLowerCase().trim() === 'time slot')?.value || '';
  const dynamicTimeSlots = selectedDate ? generateDynamicSlots(currentBranch, isEn, fulfillmentType, selectedDate) : [];
  const isTimeSlotInvalid = !!timeSlot && dynamicTimeSlots.length > 0 && !dynamicTimeSlots.some((slot: string) => slot === timeSlot || slot.startsWith(timeSlot) || timeSlot.startsWith(slot.split(' - ')[0]));
  const minOrderMeta = currentBranch?.min_order_value || currentBranch?.metafields?.find((m: any) => m?.key === 'minimum_order_value');
  const minOrderAttr = attributes.find((a: any) => a.key.toLowerCase().trim() === 'minimum order value')?.value;
  const minOrderAttrVal = minOrderAttr ? parseFloat(minOrderAttr) : null;
  // Default to 0 SAR for minimum order (matches Shopify Admin Local Delivery SAR 0.00 setting)
  const rawMinOrderValue = (minOrderMeta?.value && parseFloat(minOrderMeta.value) >= 0)
    ? parseFloat(minOrderMeta.value)
    : (typeof minOrderAttrVal === 'number' && !isNaN(minOrderAttrVal) && minOrderAttrVal !== 50
        ? minOrderAttrVal
        : (typeof currentBranch?.minOrder === 'number' && currentBranch.minOrder !== 50
            ? currentBranch.minOrder
            : 0));
  const minOrderValue = isPickup ? 0 : rawMinOrderValue;
  const isMinOrderMet = subtotal >= minOrderValue;
  const thresholdMeta = currentBranch?.free_delivery_threshold || currentBranch?.metafields?.find((m: any) => m?.key === 'free_delivery_threshold');
  const feeMeta = currentBranch?.delivery_fee || currentBranch?.metafields?.find((m: any) => m?.key === 'delivery_fee');
  const thresholdAttr = attributes.find((a: any) => a.key.toLowerCase().trim() === 'free delivery threshold')?.value;
  
  const cartHasFreeShippingCode = cart?.discountCodes?.some((d: any) => d.applicable && (d.code.toLowerCase() === 'freeshipping' || d.code.toLowerCase() === 'free_shipping')) || false;
  
  // Extract free delivery threshold dynamically from selected branch settings
  let rawThreshold = 0;
  if (thresholdAttr && !isNaN(parseFloat(thresholdAttr))) {
    rawThreshold = parseFloat(thresholdAttr);
  } else if (thresholdMeta?.value && !isNaN(parseFloat(thresholdMeta.value))) {
    rawThreshold = parseFloat(thresholdMeta.value);
  } else if (typeof currentBranch?.free_delivery_threshold === 'number') {
    rawThreshold = currentBranch.free_delivery_threshold;
  } else if (typeof currentBranch?.free_delivery_threshold?.value === 'string' && !isNaN(parseFloat(currentBranch.free_delivery_threshold.value))) {
    rawThreshold = parseFloat(currentBranch.free_delivery_threshold.value);
  } else if (typeof currentBranch?.freeDeliveryThreshold === 'number') {
    rawThreshold = currentBranch.freeDeliveryThreshold;
  }

  const isDigitalOnlyCart =
    (cart?.lines?.nodes?.length || 0) > 0 &&
    cart?.lines?.nodes?.every((line: any) => {
      const isVoucher = line.attributes?.some(
        (a: any) => a.key === '_gift_voucher' && a.value === 'true',
      );
      const isGiftCardProduct =
        line.merchandise?.product?.isGiftCard === true ||
        line.merchandise?.product?.handle === 'saadeddin-gift-card' ||
        line.merchandise?.product?.handle === 'gift-card';

      return isVoucher || isGiftCardProduct;
    });

  const threshold = rawThreshold > 0 ? rawThreshold : 0;
  const isThresholdMet = threshold > 0 && subtotal >= threshold;
  
  // Check promotional free delivery interval for current selected branch and chosen time slot (only for home delivery)
  const branchPromo = checkBranchFreeDeliveryInterval(currentBranch, timeSlot);
  const isBranchPromoFreeDelivery = !isPickup && !isDigitalOnlyCart && branchPromo.isPromoFreeDelivery;

  const rawCheckoutUrl = cart?.checkoutUrl;
  const effectiveCheckoutUrl = (rawCheckoutUrl && !isPickup && (isBranchPromoFreeDelivery || isThresholdMet) && !cartHasFreeShippingCode)
    ? (rawCheckoutUrl.includes('?') ? `${rawCheckoutUrl}&discount=freeshipping` : `${rawCheckoutUrl}?discount=freeshipping`)
    : rawCheckoutUrl;

  // Free delivery applies if freeshipping code is active, branch promo interval is active, or subtotal >= threshold
  const isFreeDelivery = isPickup || isDigitalOnlyCart || cartHasFreeShippingCode || isBranchPromoFreeDelivery || isThresholdMet;
  
  const feeAttribute = attributes.find((a: any) => a.key.toLowerCase().trim() === 'delivery fee')?.value;
  const feeAttrVal = feeAttribute ? parseFloat(feeAttribute) : null;
  
  const rawDeliveryFee = (typeof feeAttrVal === 'number' && !isNaN(feeAttrVal) && feeAttrVal > 0)
    ? feeAttrVal
    : (feeMeta?.value && parseFloat(feeMeta.value) > 0
        ? parseFloat(feeMeta.value)
        : (typeof currentBranch?.delivery_fee === 'number' && currentBranch.delivery_fee > 0
            ? currentBranch.delivery_fee
            : (typeof currentBranch?.delivery_fee?.value === 'string' && parseFloat(currentBranch.delivery_fee.value) > 0
                ? parseFloat(currentBranch.delivery_fee.value)
                : (typeof currentBranch?.baseDeliveryFee === 'number' && currentBranch.baseDeliveryFee > 0
                    ? currentBranch.baseDeliveryFee
                    : (typeof currentBranch?.deliveryFee === 'number' && currentBranch.deliveryFee > 0
                        ? currentBranch.deliveryFee
                        : 0)))));

  const deliveryFee = (isFreeDelivery || isPickup || isDigitalOnlyCart) ? 0 : rawDeliveryFee;
  const calculatedTotal = Math.max(0, subtotalBeforeDiscounts - otherDiscountDisplay - loyaltyDiscountDisplay - storeCreditDiscountDisplay + deliveryFee);

  // Calculate 15% VAT strictly on taxable products in the cart (net of product discounts, independent of delivery fees)
  const taxableProductsTotal = cart?.lines?.nodes?.reduce((acc: number, line: any) => {
    const isFreeItem = line.attributes?.some((attr: any) => attr.key === '_is_free' && attr.value === 'true') || false;
    if (isFreeItem) return acc;

    // Only count items that have "Charge tax on this product" enabled in Shopify (taxable: true)
    const isTaxable = line.merchandise?.taxable === true;
    if (!isTaxable) return acc;

    // line.cost.totalAmount is the exact net product line price in Shopify
    const lineCost = parseFloat(line.cost?.totalAmount?.amount || '0');
    return acc + lineCost;
  }, 0) || 0;

  // Deduct applied discounts (coupons, loyalty points, store credit) from taxable product total
  const netTaxableAmount = Math.max(
    0,
    taxableProductsTotal - otherDiscountDisplay - loyaltyDiscountDisplay - storeCreditDiscountDisplay,
  );

  const calculatedTax = (cart?.cost?.totalTaxAmount && parseFloat(cart.cost.totalTaxAmount.amount) > 0)
    ? parseFloat(cart.cost.totalTaxAmount.amount)
    : (netTaxableAmount > 0 ? netTaxableAmount * (15 / 115) : 0);
  const hasTax = calculatedTax > 0;

  const isBranchHidden = currentBranch && (
    currentBranch.hide_from_storefront?.value === 'true' ||
    currentBranch.hide_from_storefront === true ||
    currentBranch.hide_from_storefront === 'true'
  );

  const isTimeSlotSelected = !!timeSlot && timeSlot.trim() !== '';
  const isBranchSelected = isDigitalOnlyCart || (!!branch && branch.trim() !== '' && !isBranchHidden);

  // Dynamic Branch Display Name based on current locale (English vs Arabic)
  const branchDisplayName = useMemo(() => {
    if (!isBranchSelected) {
      return isEn ? 'Select Your Branch' : 'اختر الفرع';
    }

    const allLocs = locations.length > 0 ? locations : rawLocations;
    const activeNode =
      currentBranch ||
      (allLocs.length > 0
        ? allLocs.find((loc: any) => {
            const lId = String(loc.id || '');
            const numId = lId.split('/').pop();
            const targetBranchId = String(branchId || rootData?.selectedLocationId || '').split('/').pop();
            const locBranchCode = String(loc.branch_id?.value || loc.branch_id || loc.branch_code?.value || loc.branch_code || '').toLowerCase().trim();
            const locAxStoreId = String(loc.ax_store_id?.value || loc.ax_store_id || '').toLowerCase().trim();
            const lName = String(loc.name || loc.rawName || '').toLowerCase().trim();
            const lAr = String(
              loc.name_in_arabic?.value || loc.name_in_arabic || loc.nameInArabic || '',
            )
              .toLowerCase()
              .trim();
            const s = String(branch || sessionBranchName || '')
              .toLowerCase()
              .trim();
            return (
              (targetBranchId &&
                (lId === branchId ||
                  lId === rootData?.selectedLocationId ||
                  numId === targetBranchId ||
                  (locBranchCode && locBranchCode === targetBranchId.toLowerCase()) ||
                  (locAxStoreId && locAxStoreId === targetBranchId.toLowerCase()))) ||
              (lName &&
                (lName === s || s.includes(lName) || lName.includes(s))) ||
              (lAr && (lAr === s || s.includes(lAr) || lAr.includes(s)))
            );
          })
        : null);

    if (activeNode) {
      if (isEn) {
        const enName =
          activeNode.name ||
          activeNode.rawName ||
          activeNode.name_english?.value ||
          activeNode.name_english ||
          activeNode.metafields?.find(
            (m: any) =>
              m?.key === 'name_english' || m?.key === 'english_name',
          )?.value;
        if (enName && String(enName).trim()) return String(enName).trim();
      } else {
        const arName =
          activeNode.nameInArabic ||
          activeNode.name_in_arabic?.value ||
          activeNode.name_in_arabic ||
          activeNode.metafields?.find((m: any) => m?.key === 'name_in_arabic')
            ?.value;
        if (arName && String(arName).trim()) return String(arName).trim();
        const fallbackName = activeNode.name || activeNode.rawName;
        if (fallbackName && String(fallbackName).trim()) return String(fallbackName).trim();
      }
    }

    const rawVal = String(branch || sessionBranchName || '').trim();
    if (!rawVal || rawVal.includes('اختر') || rawVal.toLowerCase().includes('select')) {
      return isEn ? 'Select Your Branch' : 'اختر الفرع';
    }

    return rawVal;
  }, [
    isBranchSelected,
    currentBranch,
    isEn,
    locations,
    rawLocations,
    branch,
    sessionBranchName,
    branchId,
    rootData?.selectedLocationId,
  ]);

  const hasPreOrderItems = !isDigitalOnlyCart && cart?.lines?.nodes?.some((line: any) =>
    line.merchandise?.product?.tags?.some((tag: string) =>
      ['preorder', 'pre-order', 'طلب مسبق'].includes(tag.toLowerCase().trim())
    ) || line.attributes?.some((a: any) => a.key === '_is_preorder' && a.value === 'true')
  );

  const hasCashOnly = cart?.lines?.nodes?.some((line: any) =>
    line.merchandise?.product?.tags?.some((tag: string) => tag.toLowerCase().trim() === 'cash-only')
  );

  const hasCustomCorporateItems = cart?.lines?.nodes?.some((line: any) =>
    line.merchandise?.product?.tags?.some((tag: string) => {
      const t = tag.toLowerCase().trim();
      return t === 'corporate-custom' || t === 'custom-corporate' || t === 'مخصص';
    })
  );

  const prepaidOnlyItems = cart?.lines?.nodes?.filter((line: any) =>
    line.merchandise?.product?.tags?.some((tag: string) => {
      const t = tag.toLowerCase().trim();
      return t === 'prepaid-only' || t === 'nocod' || t === 'preorder' || t === 'pre-order' || t === 'طلب مسبق';
    })
  ) || [];
  const hasPrepaidOnly = prepaidOnlyItems.length > 0;
  const prepaidItemNamesEn = prepaidOnlyItems.map((line: any) => line.merchandise?.product?.title || line.merchandise?.title).join(', ');
  const prepaidItemNamesAr = prepaidOnlyItems.map((line: any) => line.merchandise?.product?.title || line.merchandise?.title).join('، ');

  const isOutOfRange = !isDigitalOnlyCart && !!attributes.find((a: any) => a.key === 'error')?.value;

  const outOfStockItems = cart?.lines?.nodes?.filter((line: any) => {
    return line.merchandise?.availableForSale === false;
  }) || [];

  const hasOutOfStockItems = outOfStockItems.length > 0;
  const outOfStockItemNamesEn = outOfStockItems.map((line: any) => line.merchandise?.product?.title || line.merchandise?.title).join(', ');
  const outOfStockItemNamesAr = outOfStockItems.map((line: any) => line.merchandise?.product?.title || line.merchandise?.title).join('، ');

  // Validate active discount codes against location restrictions
  const locationDiscountsList = parseLocationDiscountsJSON(rootData?.locationDiscounts);
  const activeDiscountCodes = cart?.discountCodes?.filter((d: any) => d.applicable)?.map((d: any) => d.code) || [];

  const invalidActiveDiscount = activeDiscountCodes.find((code: string) => {
    const matched = locationDiscountsList.find((d: any) => d.code?.toUpperCase() === code.toUpperCase());
    if (!matched) return false;
    return !isDiscountValidForLocation(matched, branchId, rootData?.selectedCity);
  });

  const isDateTimeRequired = !hasPreOrderItems && !isDigitalOnlyCart;
  const isDateTimeValid = !isDateTimeRequired || (!isTimeSlotInvalid && !!selectedDate && !!timeSlot && selectedDate.trim() !== '' && timeSlot.trim() !== '');

  const canCheckout = hasOutOfStockItems
    ? false
    : isDigitalOnlyCart
      ? !invalidActiveDiscount
      : isMinOrderMet && isBranchSelected && !isBranchHidden && !isOutOfRange && isDateTimeValid && !invalidActiveDiscount;

  const branchHoursStr = (() => {
    if (!currentBranch) return '';
    const getMeta = (key: string) => {
      if (currentBranch[key]?.value) return currentBranch[key].value;
      if (typeof currentBranch[key] === 'string') return currentBranch[key];
      const meta = currentBranch.metafields?.find((m: any) => m?.key === key);
      return meta?.value;
    };
    const dateObj = selectedDate ? new Date(selectedDate + 'T12:00:00') : new Date();
    const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Riyadh', weekday: 'short' }).format(dateObj).toLowerCase();
    const fromStr = getMeta(`${weekday}_working_hours_from`) || getMeta('working_hours_from') || '10:00';
    const toStr = getMeta(`${weekday}_working_hours_to`) || getMeta('working_hours_to') || '22:00';
    const fromStr2 = getMeta('working_hours_from_shift2');
    const toStr2 = getMeta('working_hours_to_shift2');
    const shift1 = `${fromStr} - ${toStr}`;
    const shift2 = fromStr2 && toStr2 ? ` & ${fromStr2} - ${toStr2}` : '';
    return (shift1 + shift2).replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1632));
  })();


  const locationFetcher = useFetcher();
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const handleSelectBranchFromCart = (
    branchSelected: any,
    type: 'delivery' | 'pickup',
    addressName?: string,
    isOutOfRangeLoc?: boolean
  ) => {
    const branchName = branchSelected?.name || 'Main';
    const bId = branchSelected?.id || '';
    const customBranchId = branchSelected?.branch_id || '';
    const axStoreId = branchSelected?.ax_store_id || '';

    const newAttributes = [
      { key: 'Branch', value: branchName },
      { key: 'Branch ID', value: customBranchId || bId },
      { key: 'Fulfillment Type', value: type === 'delivery' ? 'Delivery' : 'Pickup' },
    ];

    if (customBranchId) {
      newAttributes.push({ key: 'custom.branch_id', value: customBranchId });
      newAttributes.push({ key: 'branch_id', value: customBranchId });
    }

    if (addressName) {
      newAttributes.push({ key: 'Delivery Address', value: addressName });
    }

    if (isOutOfRangeLoc) {
      newAttributes.push({
        key: 'error',
        value: isEn
          ? 'Your address is outside our delivery range. You may not be able to complete checkout.'
          : 'عنوانك خارج نطاق التوصيل. قد لا تتمكن من إتمام الطلب.',
      });
    } else {
      newAttributes.push({ key: 'error', value: '' });
    }

    if (type === 'delivery' && typeof branchSelected?.deliveryFee === 'number') {
      newAttributes.push({ key: 'Delivery Fee', value: branchSelected.deliveryFee.toString() });
    }

    if (typeof branchSelected?.freeDeliveryThreshold === 'number') {
      newAttributes.push({
        key: 'Free Delivery Threshold',
        value: branchSelected.freeDeliveryThreshold.toString(),
      });
    }

    if (typeof branchSelected?.minOrder === 'number') {
      newAttributes.push({
        key: 'Minimum Order Value',
        value: branchSelected.minOrder.toString(),
      });
    }

    if (branchSelected?.timeSlots) {
      newAttributes.push({ key: 'Available Time Slots', value: branchSelected.timeSlots });
    }

    const locFormData = new FormData();
    locFormData.append('locationId', bId);
    locFormData.append('branchName', branchName);
    locFormData.append('fulfillmentType', type);
    locFormData.append('manualLocationSelection', 'true');
    locFormData.append('attributes', JSON.stringify(newAttributes));
    if (customBranchId) locFormData.append('customBranchId', customBranchId);
    if (axStoreId) locFormData.append('axStoreId', axStoreId);
    if (addressName) locFormData.append('addressName', addressName);

    locationFetcher.submit(locFormData, { method: 'POST', action: '/api/location-id' });
    setIsLocationModalOpen(false);
  };

  return (
    <div aria-labelledby={summaryId} className="flex flex-col gap-2">
      {/* Branch & Location Selector Modal */}
      {isLocationModalOpen && (
        <DeliveryPickupModal
          isOpen={isLocationModalOpen}
          onClose={() => setIsLocationModalOpen(false)}
          defaultTab={isPickup ? 'pickup' : 'delivery'}
          locationsPromise={rootData?.locations}
          customerPromise={rootData?.customer}
          locale={isEn ? 'en' : 'ar'}
          googleMapsKey={rootData?.googleMapsKey}
          onSelectBranch={handleSelectBranchFromCart}
          selectedLocationId={rootData?.selectedLocationId}
          selectedAddressName={rootData?.selectedAddressName}
        />
      )}

      {layout === 'page' && (
        <>
          <div className="bg-white rounded-2xl border border-[#BBCFCD]/80 flex flex-col pt-4">
            {/* Header */}
            <div className="mx-6 pb-2 border-2px border-[#BBCFCD]/80">
              <h3 className={`text-[20px] font-black text-[#1a1a1a] ${isEn ? 'text-left' : 'text-right'}`} style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}>
                {isEn ? 'Order Summary' : 'ملخص الطلب'}
              </h3>
            </div>

            <div className="px-6 py-6 flex flex-col gap-6">
              {/* Promo Code Input */}
              <CartDiscounts
                discountCodes={cart?.discountCodes}
                cart={cart}
                discountsHeadingId={discountsHeadingId}
                discountCodeInputId={discountCodeInputId}
                isEn={isEn}
                invalidActiveDiscount={invalidActiveDiscount}
                branchName={branchDisplayName}
                isBranchPromoFreeDelivery={isBranchPromoFreeDelivery}
                isThresholdMet={isThresholdMet}
                isPickup={isPickup}
              />

              {/* Loyalty Redemption */}
              {rootData?.env?.PUBLIC_SMILE_CHANNEL_KEY ? (
                <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-dashed border-[#f0ece8]">
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined' && (window as any).Smile) {
                        (window as any).Smile.show();
                      } else {
                        alert(isEn
                          ? "Smile.io widget is loading or PUBLIC_SMILE_CHANNEL_KEY is not configured yet."
                          : "أداة Smile.io قيد التحميل أو لم يتم إعداد مفتاح PUBLIC_SMILE_CHANNEL_KEY بعد."
                        );
                      }
                    }}
                    className="w-full flex items-center justify-between bg-[#fcfaf8] hover:bg-[#f6f2eb] border border-[#f0ece8] rounded-xl p-4 text-[#234745] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🎁</span>
                      <span className="font-bold text-[14px]">
                        {isEn ? 'Smile Rewards & Points' : 'نقاط ومكافآت Smile'}
                      </span>
                    </div>
                    <span className="text-[12px] font-bold text-[#d4a06a]">
                      {isEn ? 'View rewards' : 'عرض المكافآت'} &rarr;
                    </span>
                  </button>
                </div>
              ) : (
                <>
                  <LoyaltyRedemptionUI isEn={isEn} cart={cart} />
                  <StoreCreditRedemptionUI isEn={isEn} cart={cart} />
                </>
              )}

              {/* IF DIGITAL ONLY CART: SHOW DIGITAL DELIVERY NOTICE */}
              {isDigitalOnlyCart ? (
                <div className="w-full rounded-2xl p-4 bg-[#f0f7f5] border border-[#234745]/20 text-[#234745] flex items-center gap-3 shadow-xs">
                  <div className="w-9 h-9 rounded-full bg-[#234745] text-white flex items-center justify-center font-bold text-base shrink-0">
                    ✉️
                  </div>
                  <div className="text-[13px] leading-relaxed">
                    <span className="font-bold block text-[14px] text-[#234745] mb-0.5">
                      {isEn ? 'Digital Delivery (Email / SMS)' : 'توصيل إلكتروني فوري (عبر البريد الإلكتروني / SMS)'}
                    </span>
                    <span className="text-[#64748b] text-[12px]">
                      {isEn
                        ? 'Digital gift card voucher code will be delivered electronically upon payment.'
                        : 'سيتم إرسال رمز القسيمة الرقمية إلكترونياً فور إتمام الدفع دون الحاجة لاختيار فرع أو موعد.'}
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  {/* ALWAYS-VISIBLE LOCATION & BRANCH CARD */}
                  <div
                    onClick={() => {
                      setIsLocationModalOpen(true);
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('openDeliveryModal'));
                      }
                    }}
                    className={`w-full rounded-2xl p-4 transition-all cursor-pointer border shadow-sm ${
                      isBranchSelected
                        ? 'bg-[#FCFAF8] border-[#E8E2D9] hover:border-[#234745] hover:shadow-md'
                        : 'bg-[#FFF8F8] border-[#F5C2C2] hover:border-[#DF4646]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#234745]/10 text-[#234745] flex items-center justify-center flex-shrink-0">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                          </svg>
                        </div>
                        <span className="font-bold text-[14px] text-[#234745]">
                          {isEn ? 'Selected Store Location' : 'فرع الاستلام أو التوصيل'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsLocationModalOpen(true);
                          if (typeof window !== 'undefined') {
                            window.dispatchEvent(new CustomEvent('openDeliveryModal'));
                          }
                        }}
                        className="px-3.5 py-1 rounded-full text-[13px] font-bold bg-[#234745] text-white hover:bg-[#1a3533] transition-colors cursor-pointer border-none"
                        style={{ fontFamily: "'GE Dinar One', sans-serif" }}
                      >
                        {isEn ? 'Change' : 'تغيير'}
                      </button>
                    </div>

                    <div className="flex flex-col gap-1 pr-10 rtl:pr-10 ltr:pl-10">
                      <div className="flex items-center gap-2 text-[13px] font-medium text-[#7D7D7D]">
                        <span className="px-2.5 py-0.5 rounded-md bg-[#234745]/10 text-[#234745] text-[11px] font-bold">
                          {isPickup ? (isEn ? 'Pickup' : 'استلام من الفرع') : (isEn ? 'Delivery' : 'توصيل للمنزل')}
                        </span>
                        {rootData?.selectedAddressName && !isPickup && (
                          <span className="truncate max-w-[200px] text-[#4A4A4A]">({rootData.selectedAddressName})</span>
                        )}
                      </div>

                      {isBranchSelected ? (
                        <div className="text-[15px] font-bold text-[#234745] leading-snug">
                          {branchDisplayName}
                        </div>
                      ) : (
                        <div className="text-[14px] font-bold text-[#DF4646] flex items-center gap-1.5 mt-0.5">
                          <span>⚠️</span>
                          <span>{isEn ? 'Please select a branch location' : 'يرجى اختيار الفرع المحدد لمتابعة الطلب'}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Date & Time Slot Picker required for normal orders, hidden for pre-orders */}
                  {!hasPreOrderItems ? (
                    <CartCalendarPicker
                      isEn={isEn}
                      cart={cart}
                      currentBranch={currentBranch}
                      isPickup={isPickup}
                      fulfillmentType={fulfillmentType}
                    />
                  ) : (
                    <div className="w-full rounded-2xl p-4 bg-[#f0f7f5] border border-[#9fb7ae]/30 text-[#234745] flex items-center gap-3 shadow-sm my-2">
                      <div className="w-8 h-8 rounded-full bg-[#234745]/10 flex items-center justify-center shrink-0">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 16 14" />
                        </svg>
                      </div>
                      <div className="text-[13px] leading-relaxed">
                        <span className="font-bold block text-[14px] mb-0.5">
                          {isEn ? 'Pre-Order Fulfillment Notice' : 'ملاحظة طلب مسبق'}
                        </span>
                        <span>
                          {isEn
                            ? 'This cart contains pre-order items. Delivery date and time will be scheduled based on item availability.'
                            : 'يحتوي هذا الطلب على منتجات طلب مسبق. سيتم جدولة موعد التوصيل بناءً على توفر المنتج.'}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}


              {/* Order Notes */}
              <CartOrderNotes isEn={isEn} cart={cart} />

              {/* Breakdown */}
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center text-[15px]">
                  <dt className="text-[#9FB7AE] font-medium" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>{isEn ? 'Subtotal' : 'المجموع الفرعي'}</dt>
                  <dd className="text-[#234745] font-bold font-en flex items-center gap-1 flex-row-reverse">
                    <SaudiRiyalSymbol className="h-4 w-auto" />
                    <span>{subtotalBeforeDiscounts.toFixed(2)}</span>
                  </dd>
                </div>

                {otherDiscountDisplay > 0 && (
                  <div className="flex justify-between items-center text-[15px]">
                    <dt className="text-green-600 font-bold" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                      {isEn ? 'Discount' : 'الخصم'}
                    </dt>
                    <dd className="text-green-600 font-black font-en flex items-center gap-1 flex-row-reverse">
                      <SaudiRiyalSymbol className="h-4 w-auto" />
                      <span>-{otherDiscountDisplay.toFixed(2)}</span>
                    </dd>
                  </div>
                )}

                {loyaltyDiscountDisplay > 0 && (
                  <div className="flex justify-between items-center text-[15px]">
                    <dt className="text-green-600 font-bold" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                      {isEn ? 'Loyalty Discount' : 'خصم نقاط الولاء'}
                    </dt>
                    <dd className="text-green-600 font-black font-en flex items-center gap-1 flex-row-reverse">
                      <SaudiRiyalSymbol className="h-4 w-auto" />
                      <span>-{loyaltyDiscountDisplay.toFixed(2)}</span>
                    </dd>
                  </div>
                )}

                {storeCreditDiscountDisplay > 0 && (
                  <div className="flex justify-between items-center text-[15px]">
                    <dt className="text-green-600 font-bold" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                      {isEn ? 'Store Credit' : 'رصيد المحفظة'}
                    </dt>
                    <dd className="text-green-600 font-black font-en flex items-center gap-1 flex-row-reverse">
                      <SaudiRiyalSymbol className="h-4 w-auto" />
                      <span>-{storeCreditDiscountDisplay.toFixed(2)}</span>
                    </dd>
                  </div>
                )}

                {!isPickup && !isDigitalOnlyCart && (
                  <div className="flex justify-between items-center text-[15px]">
                    <dt className="text-[#9FB7AE] font-medium" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>{isEn ? 'Delivery Fees' : 'رسوم التوصيل'}</dt>
                    <dd className="text-[#234745] font-bold font-en flex items-center gap-1">
                      {isFreeDelivery ? (
                        <span className="text-[#234745] font-black text-[15px]">{isEn ? 'Free' : 'مجاني'}</span>
                      ) : (
                        <div className="flex items-center gap-1 flex-row-reverse">
                          <SaudiRiyalSymbol className="h-4 w-auto" />
                          <span className="font-black">{deliveryFee.toFixed(2)}</span>
                        </div>
                      )}
                    </dd>
                  </div>
                )}

                {hasTax && (
                  <div className="flex justify-between items-center text-[15px]">
                    <dt className="text-[#9FB7AE] font-bold" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>{isEn ? 'VAT (15%)' : 'ضريبة القيمة المضافة (١٥٪)'}</dt>
                    <dd className="text-[#234745] font-bold font-en flex items-center gap-1 flex-row-reverse">
                      <SaudiRiyalSymbol className="h-4 w-auto" />
                      <span>{calculatedTax.toFixed(2)}</span>
                    </dd>
                  </div>
                )}
              </div>

              {/* Separator */}
              <div className="border-t border-gray-200"></div>

              {/* Total */}
              <div className="flex justify-between items-center">
                <div className="flex flex-col gap-1">
                  <dt className="text-[20px] font-black text-[#234745]" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}>
                    {isEn ? 'Total' : 'الإجمالي'}
                  </dt>
                  <span className="text-[12px] text-[#9FB7AE] font-bold">
                    {isEn ? 'Includes 15% VAT' : 'شامل ضريبة القيمة المضافة ١٥٪'}
                  </span>
                </div>
                <dd className="text-[28px] font-black text-[#234745] font-en flex items-center gap-2 flex-row-reverse">
                  <SaudiRiyalSymbol className="h-6 w-auto" />
                  <span>{calculatedTotal.toFixed(2)}</span>
                </dd>
              </div>

              {/* Buttons */}
              <div className="flex flex-col gap-3 mt-2">
                {hasCustomCorporateItems && (
                  <div className="bg-[#FEF8EB] border border-[#C5A96A]/60 rounded-2xl p-4 flex flex-col gap-2.5 my-1 text-start animate-fade-in">
                    <div className="flex items-center gap-2.5 font-bold text-[#234745] text-[14px]">
                      <span className="text-lg">🎁</span>
                      <span>{isEn ? 'Our team will contact you within 24 hours to confirm your custom package request.' : 'سيتواصل معك فريقنا خلال ٢٤ ساعة لتأكيد طلبك'}</span>
                    </div>
                    <Link
                      to={isEn ? '/en/pages/custom-request' : '/pages/custom-request'}
                      className="text-[#906B51] font-bold text-[13px] hover:underline flex items-center gap-1"
                    >
                      <span>{isEn ? 'Edit Request Details →' : 'تعديل تفاصيل الطلب ←'}</span>
                    </Link>
                  </div>
                )}
                {isTimeSlotInvalid && (
                  <div className="bg-red-50 border border-red-200 p-3 rounded-lg flex items-start gap-2 mb-1">
                    <span className="text-base leading-none mt-0.5">⚠️</span>
                    <p className="text-red-800 text-[13px] font-bold leading-tight" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                      {isEn ? (
                        <>
                          Your selected {isPickup ? 'pickup' : 'delivery'} time ({timeSlot}) is outside the working hours of {currentBranch?.name || 'this branch'}.
                          {branchHoursStr && <><br />Working hours on this day: <strong>{branchHoursStr}</strong>. Please select a valid window.</>}
                        </>
                      ) : (
                        <>
                          وقت {isPickup ? 'الاستلام' : 'التوصيل'} المحدد ({timeSlot}) خارج ساعات عمل فرع {currentBranch?.name || 'هذا الفرع'}.
                          {branchHoursStr && <><br />ساعات العمل في هذا اليوم: <strong>{branchHoursStr}</strong>. يرجى اختيار فترة صالحة.</>}
                        </>
                      )}
                    </p>
                  </div>
                )}


                {hasPrepaidOnly && (
                  <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg flex items-start gap-2 mb-1">
                    <svg className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-orange-800 text-[13px] font-bold leading-tight" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                      {isEn
                        ? `Note: Cash on Delivery is not available because your cart contains restricted items (${prepaidItemNamesEn}). Please use a prepaid method at checkout.`
                        : `ملاحظة: الدفع عند الاستلام غير متاح لاحتواء سلتك على منتجات تتطلب الدفع المسبق (${prepaidItemNamesAr}). يرجى استخدام طريقة دفع إلكترونية.`}
                    </p>
                  </div>
                )}

                <CartCheckoutActions
                  checkoutUrl={effectiveCheckoutUrl}
                  discountCodes={cart?.discountCodes}
                  isEn={isEn}
                  disabled={!canCheckout}
                  totalAmount={calculatedTotal}
                  currencyCode={currencyCode}
                  isPickup={isPickup}
                  cart={cart}
                  branchErrorText={
                    isDigitalOnlyCart
                      ? null
                      : isBranchHidden
                        ? (isEn ? 'Selected branch is currently unavailable. Please select another branch.' : 'الفرع المختار غير متوفر حالياً. يرجى اختيار فرع آخر.')
                        : !isBranchSelected
                          ? (isEn ? 'Please select a branch' : 'يرجى اختيار الفرع')
                          : null
                  }
                  validationError={
                    invalidActiveDiscount ? (
                      isEn
                        ? `Discount code "${invalidActiveDiscount}" is not valid for ${branchDisplayName || 'the selected branch'}`
                        : `كود الخصم "${invalidActiveDiscount}" غير صالح لـ ${branchDisplayName || 'الفرع المختار'}`
                    ) : isDigitalOnlyCart ? null : !isMinOrderMet ? (
                      isEn ? (
                        <span className="flex items-center justify-center gap-1">Minimum order is <SaudiRiyalSymbol className="h-3 w-auto" /> {minOrderValue}</span>
                      ) : (
                        <span className="flex items-center justify-center gap-1"><span>الحد الأدنى هو {minOrderValue}</span><SaudiRiyalSymbol className="h-3.5 w-auto inline-block ms-1" /></span>
                      )
                    ) : isOutOfRange ? (
                      isEn ? 'Address is out of delivery range' : 'العنوان خارج نطاق التوصيل'
                    ) : !selectedDate ? (
                      isPickup ? (isEn ? 'Please select pickup date' : 'يرجى اختيار تاريخ الاستلام') : (isEn ? 'Please select delivery date' : 'يرجى اختيار تاريخ التوصيل')
                    ) : !timeSlot ? (
                      isPickup ? (isEn ? 'Please select pickup window' : 'يرجى اختيار فترة الاستلام') : (isEn ? 'Please select delivery window' : 'يرجى اختيار فترة التوصيل')
                    ) : isTimeSlotInvalid ? (
                      isPickup ? (isEn ? 'Time slot is outside working hours' : 'وقت الاستلام خارج ساعات العمل') : (isEn ? 'Delivery time is outside working hours' : 'وقت التوصيل خارج ساعات العمل')
                    ) : null
                  }
                />

                <Link
                  to={isEn ? "/en" : "/"}
                  className="w-full h-[52px] bg-[#F9E8E8] hover:bg-[#F2DFDF] active:scale-[0.98] transition-all text-[#DF4646] rounded-[50px] font-black text-[16px] flex items-center justify-center border border-[#EAA2A2]"
                  style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}
                >
                  {isEn ? 'Continue Shopping' : 'متابعة التسوق'}
                </Link>
              </div>

              {/* Tamara Promo Box */}
              <div className="bg-[#FBF9F4] rounded-[16px] p-5 border border-[#F2E8D5] flex flex-col items-center text-center shadow-sm relative mt-4">
                <div className="px-5 py-1 rounded-[10px] mb-3 inline-block" style={{ background: 'linear-gradient(90deg, #F9C3A3 0%, #D4A5E4 50%, #9BC4E5 100%)' }}>
                  <span className="text-[#1a1a1a] font-black text-[18px] tracking-tight font-en leading-none block pt-0.5">tamara</span>
                </div>
                <h4 className="text-[15px] font-black text-[#1a1a1a] leading-tight mb-2" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}>
                  {isEn ? 'Split it into 4 interest-free payments' : 'قسّطها على ٤ دفعات بدون فوائد'}
                </h4>
                <div className="w-full flex justify-end mt-1">
                  <p className="text-[11px] font-bold text-gray-500">
                    {isEn ? 'with Tamara' : 'مع تمارا'}
                  </p>
                </div>
              </div>

              {/* Footer Features */}
              <div className="flex items-center justify-between mt-6 border-t border-gray-200 pt-6 px-2 pb-6">
                <div className="flex flex-col items-center">
                  <span className="text-[13px] font-bold text-[#9FB7AE]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>{isEn ? 'Guaranteed Quality' : 'جودة مضمونة'}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[13px] font-bold text-[#9FB7AE]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>{isEn ? 'Fast Delivery' : 'توصيل سريع'}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[13px] font-bold text-[#9FB7AE]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>{isEn ? 'Secure Payment' : 'دفع آمن ومضمون'}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {layout === 'aside' && (
        <div className="space-y-2 mb-4 px-1">
          <div className="flex justify-between items-center text-[14px]">
            <dt className="text-gray-400 font-medium">{isEn ? 'Subtotal' : 'المجموع الفرعي'}</dt>
            <dd className="text-[#234745] font-bold font-en">
              <Price data={cart?.cost?.subtotalAmount!} isEn={isEn} size="xs" />
            </dd>
          </div>

          {!isPickup && !isDigitalOnlyCart && (
            <div className="flex justify-between items-center text-[14px]">
              <dt className="text-gray-400 font-medium">{isEn ? 'Delivery' : 'التوصيل'}</dt>
              <dd className="text-[#234745] font-bold font-en">
                {isFreeDelivery ? (
                  <span className="text-green-600 uppercase text-[10px]">{isEn ? 'Free' : 'مجاني'}</span>
                ) : (
                  <Price data={{ amount: deliveryFee.toString(), currencyCode }} isEn={isEn} size="xs" />
                )}
              </dd>
            </div>
          )}

          {hasTax && (
            <div className="flex justify-between items-center text-[14px]">
              <dt className="text-gray-400 font-medium">{isEn ? 'VAT (15%)' : 'ضريبة القيمة المضافة (١٥٪)'}</dt>
              <dd className="text-[#234745] font-bold font-en flex items-center gap-1 flex-row-reverse">
                <SaudiRiyalSymbol className="h-3.5 w-auto" />
                <span>{calculatedTax.toFixed(2)}</span>
              </dd>
            </div>
          )}

          <div className="pt-2 border-t border-[#f8f5f2] flex justify-between items-center">
            <dt className="text-[15px] font-black text-[#234745]">{isEn ? 'Total' : 'الإجمالي'}</dt>
            <dd className="text-[16px] font-black text-[#234745] font-en">
              <Price data={{ amount: calculatedTotal.toString(), currencyCode }} isEn={isEn} size="sm" />
            </dd>
          </div>
        </div>
      )}

      {layout === 'aside' ? (
        <ViewCartAction isEn={isEn} />
      ) : null}
    </div>
  );
}



// ─── NEW: TIME SLOT PICKER ──────────────────────────────────────────────────
function parseHourString(hourStr: string): number {
  if (!hourStr) return 9; // Default fallback
  const clean = hourStr.toUpperCase().trim();
  // Check if it has PM/AM
  const isPm = clean.includes('PM');
  const isAm = clean.includes('AM');
  const num = parseInt(clean.replace(/\D/g, ''));
  if (isNaN(num)) return 9;

  if (isPm && num < 12) return num + 12;
  if (isAm && num === 12) return 0;

  // If it is 24h format (e.g., "19:00" -> 19)
  if (clean.includes(':')) {
    const parts = clean.split(':');
    const h = parseInt(parts[0]);
    return isNaN(h) ? 9 : h;
  }
  return num;
}

function formatHour(h: number, isEn: boolean): string {
  const startNormalized = h % 24;
  const endNormalized = (h + 1) % 24;

  const startPeriod = startNormalized >= 12 ? (isEn ? 'PM' : 'م') : (isEn ? 'AM' : 'ص');
  const endPeriod = endNormalized >= 12 ? (isEn ? 'PM' : 'م') : (isEn ? 'AM' : 'ص');

  let startDisplay = startNormalized % 12;
  if (startDisplay === 0) startDisplay = 12;

  let endDisplay = endNormalized % 12;
  if (endDisplay === 0) endDisplay = 12;

  return `${startDisplay}:00 ${startPeriod} - ${endDisplay}:00 ${endPeriod}`;
}

function generateDynamicSlots(branch: any, isEn: boolean, fulfillmentType: string = 'delivery', targetDateStr?: string): string[] {
  const isDelivery = fulfillmentType === 'delivery';

  // Helper to extract a metafield's value
  const getMeta = (key: string) => {
    if (!branch) return undefined;
    if (branch[key]?.value) return branch[key].value;
    if (typeof branch[key] === 'string') return branch[key];
    const meta = branch.metafields?.find((m: any) => m?.key === key);
    return meta?.value;
  };

  // Helper to parse lead time in hours from location delivery_time metafield
  const getLeadTimeHours = (): number => {
    if (!branch) return 1;
    const val = getMeta('delivery_time') || getMeta('delivery_lead_time') || getMeta('preparation_time');
    if (!val) return 1;
    const clean = String(val).toLowerCase().replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1632));
    const num = parseFloat(clean.replace(/[^\d.]/g, ''));
    if (isNaN(num)) return 1;
    if (num >= 15) return Math.ceil(num / 60); // e.g., 60 mins -> 1 hour, 90 mins -> 2 hours
    return Math.max(1, Math.ceil(num));
  };

  // Determine the weekday of the TARGET date (not always today)
  // so future dates use the correct day-specific working hours
  const targetDateObj = targetDateStr ? new Date(targetDateStr + 'T12:00:00') : new Date();
  const riyadhDateStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Riyadh',
    weekday: 'short'
  }).format(targetDateObj);

  // Determine Shift 1 Open/Close keys
  let fromKey = 'working_hours_from';
  let toKey = 'working_hours_to';
  let fromKey2 = 'working_hours_from_shift2';
  let toKey2 = 'working_hours_to_shift2';

  if (isDelivery) {
    // If delivery hours exist, we use them. Otherwise we fall back to working_hours.
    const hasDeliveryHrs = getMeta('delivery_hours_from');
    if (hasDeliveryHrs) {
      fromKey = 'delivery_hours_from';
      toKey = 'delivery_hours_to';
      fromKey2 = 'delivery_hours_from_shift2';
      toKey2 = 'delivery_hours_to_shift2';
    }
  }

  // Handle day-specific keys based on the TARGET date's weekday
  let dayFromKey = fromKey;
  let dayToKey = toKey;
  const lowerDay = riyadhDateStr.toLowerCase(); // 'sun', 'mon', etc.

  if (isDelivery) {
    const hasDayDelivery = getMeta(`${lowerDay}_delivery_hours_from`);
    if (hasDayDelivery) {
      dayFromKey = `${lowerDay}_delivery_hours_from`;
      dayToKey = `${lowerDay}_delivery_hours_to`;
    } else {
      const hasDayWorking = getMeta(`${lowerDay}_working_hours_from`);
      if (hasDayWorking) {
        dayFromKey = `${lowerDay}_working_hours_from`;
        dayToKey = `${lowerDay}_working_hours_to`;
      }
    }
  } else {
    const hasDayWorking = getMeta(`${lowerDay}_working_hours_from`);
    if (hasDayWorking) {
      dayFromKey = `${lowerDay}_working_hours_from`;
      dayToKey = `${lowerDay}_working_hours_to`;
    }
  }

  const fromStr = getMeta(dayFromKey) || getMeta(fromKey) || '10:00';
  const toStr = getMeta(dayToKey) || getMeta(toKey) || '22:00';
  const fromStr2 = getMeta(fromKey2);
  const toStr2 = getMeta(toKey2);

  const startHour1 = parseHourString(fromStr);
  const endHour1 = parseHourString(toStr);
  const startHour2 = fromStr2 ? parseHourString(fromStr2) : null;
  const endHour2 = toStr2 ? parseHourString(toStr2) : null;

  // Check if targetDateStr is Riyadh "today"
  const todayStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Riyadh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date()); // e.g. "07/14/2026"

  let isToday = true;
  if (targetDateStr) {
    const parts = targetDateStr.split('-'); // "YYYY-MM-DD"
    if (parts.length === 3) {
      const formattedTarget = `${parts[1]}/${parts[2]}/${parts[0]}`;
      isToday = formattedTarget === todayStr;
    }
  }

  // Get current hour in Riyadh time & calculated lead time from location metafield
  const riyadhHourStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Riyadh',
    hour: 'numeric',
    hour12: false
  }).format(new Date());
  const currentRiyadhHour = parseInt(riyadhHourStr) || 0;
  const leadTimeHours = isDelivery ? getLeadTimeHours() : 1;

  const slots: string[] = [];

  const addSlotsForWindow = (start: number, end: number, isTomorrow: boolean) => {
    for (let h = start; h <= end; h += 1) {
      const label = formatHour(h, isEn);

      if (isTomorrow) {
        if (!slots.includes(label)) slots.push(label);
      } else {
        if (isToday) {
          // Hide hours that are past current Riyadh time + location delivery/preparation lead time
          if (h >= currentRiyadhHour + leadTimeHours) {
            if (!slots.includes(label)) slots.push(label);
          }
        } else {
          // Future date: all open hours are available
          if (!slots.includes(label)) slots.push(label);
        }
      }
    }
  };

  // 1. Try adding today's exact hours for Shift 1
  addSlotsForWindow(startHour1, endHour1, false);

  // 2. Try adding today's exact hours for Shift 2
  if (startHour2 !== null && endHour2 !== null) {
    addSlotsForWindow(startHour2, endHour2, false);
  }

  // 3. If all hours for today are in the past, show tomorrow's hours
  if (slots.length === 0 && isToday) {
    addSlotsForWindow(startHour1, endHour1, true);
    if (startHour2 !== null && endHour2 !== null) {
      addSlotsForWindow(startHour2, endHour2, true);
    }
  }

  return slots;
}

function CartTimeSlot({ isEn, cart, currentBranch, hasError }: { isEn: boolean, cart: any, currentBranch: any, hasError?: boolean }) {
  const cartRoute = isEn ? '/en/cart' : '/cart';
  const timeSlot = cart?.attributes?.find((a: any) => a.key === 'Time Slot')?.value || '';
  const fulfillmentType = cart?.attributes?.find((a: any) => a.key === 'Fulfillment Type')?.value || 'delivery';

  // Dynamically calculate time slots based on the fulfilling branch's active hours
  const dynamicTimeSlots = generateDynamicSlots(currentBranch, isEn, fulfillmentType);

  // Check if branch has an active promo free delivery interval
  const generalPromoInfo = checkBranchFreeDeliveryInterval(currentBranch);
  const hasPromoHours = !!(generalPromoInfo.promoStart12h && generalPromoInfo.promoEnd12h);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-[13px] font-bold text-[#234745] px-1">
        {isEn ? 'Preferred Delivery Time' : 'وقت التوصيل المفضل'}
      </label>
      <CartForm route={cartRoute} action={'AttributesUpdate' as any}>
        <input type="hidden" name="attributes[0][key]" value="Time Slot" />
        <div className="relative">
          <select
            name="attributes[0][value]"
            key={timeSlot}
            defaultValue={timeSlot}
            onChange={(e) => {
              if (e.target.form) e.target.form.requestSubmit();
            }}
            className="w-full bg-[#fcfaf8] border border-[#f0ece8] rounded-xl px-4 py-3 text-[14px] text-[#234745] font-medium appearance-none focus:outline-none focus:border-[#d4a06a] focus:ring-1 focus:ring-[#d4a06a] transition-all cursor-pointer"
          >
            <option value="">{isEn ? 'Select preferred delivery time' : 'اختر وقت التوصيل المفضل'}</option>
            {dynamicTimeSlots.map((slot: string, idx: number) => {
              const slotPromo = checkBranchFreeDeliveryInterval(currentBranch, slot);
              const isFreeSlot = slotPromo.isPromoFreeDelivery;
              const displayLabel = isFreeSlot
                ? `⚡ ${slot} (${isEn ? 'Free Delivery' : 'توصيل مجاني'})`
                : slot;
              return (
                <option key={idx} value={slot}>
                  {displayLabel}
                </option>
              );
            })}
          </select>
          <div className="absolute top-1/2 -translate-y-1/2 rtl:left-4 ltr:right-4 pointer-events-none text-[#d4a06a]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
        </div>
      </CartForm>

      {hasPromoHours && (
        <p className="text-[11px] font-bold text-emerald-700 bg-emerald-50/70 border border-emerald-200/70 px-3 py-1.5 rounded-lg text-start flex items-center gap-1.5">
          <span>⚡</span>
          <span>
            {isEn
              ? `Choose delivery between ${generalPromoInfo.promoStart12h} - ${generalPromoInfo.promoEnd12h} for FREE delivery!`
              : `اختر التوصيل بين ${generalPromoInfo.promoStart12h} - ${generalPromoInfo.promoEnd12h} للحصول على توصيل مجاني!`}
          </span>
        </p>
      )}
    </div>
  );
}

// ─── NEW: ORDER NOTES ───────────────────────────────────────────────────────
function CartOrderNotes({ isEn, cart }: { isEn: boolean; cart: any }) {
  const cartRoute = isEn ? '/en/cart' : '/cart';
  const note = cart?.note || '';
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[13px] font-bold text-[#234745] px-1">{isEn ? 'Order Notes' : 'ملاحظات الطلب'}</label>
      <CartForm route={cartRoute} action={'NoteUpdate' as any}>
        <textarea
          name="note"
          defaultValue={note}
          placeholder={isEn ? "Write a note (e.g. Happy Birthday)" : "اكتب ملاحظة (مثال: عيد ميلاد سعيد)"}
          rows={2}
          onBlur={(e) => {
            if (e.target.form) e.target.form.requestSubmit();
          }}
          className="w-full bg-[#fcfaf8] border border-[#f0ece8] rounded-xl px-4 py-3 text-[14px] text-[#234745] placeholder-gray-400 focus:outline-none focus:border-[#d4a06a] focus:ring-1 focus:ring-[#d4a06a] transition-all resize-none"
        />
      </CartForm>
    </div>
  );
}

function CartCheckoutActions({
  checkoutUrl,
  discountCodes,
  isEn,
  disabled,
  validationError,
  branchErrorText,
  totalAmount,
  currencyCode,
  isPickup,
  cart,
}: {
  checkoutUrl?: string;
  discountCodes?: any[];
  isEn: boolean;
  disabled?: boolean;
  validationError?: React.ReactNode | null;
  branchErrorText?: string | null;
  totalAmount: number;
  currencyCode: string;
  isPickup?: boolean;
  cart?: any;
}) {
  const fireBeginCheckout = () => {
    try {
      if (typeof window === 'undefined') return;
      sessionStorage.setItem('checkout_in_progress', 'true');
      sessionStorage.setItem('saadeddin_checkout_initiated', 'true');
      const consent = localStorage.getItem('saadeddin_cookie_consent');
      if (consent !== 'accepted') return;
      const w = window as any;
      w.dataLayer = w.dataLayer || [];
      const lines = cart?.lines?.nodes || [];
      const items = lines.map((line: any, i: number) => ({
        item_id: line.merchandise?.sku || line.merchandise?.id?.split('/').pop() || '',
        item_name: line.merchandise?.product?.title || '',
        item_variant: line.merchandise?.title !== 'Default Title' ? line.merchandise?.title : undefined,
        price: parseFloat(line.merchandise?.price?.amount || '0'),
        quantity: line.quantity || 1,
        index: i,
        currency: currencyCode,
      }));
      w.dataLayer.push({ ecommerce: null });
      w.dataLayer.push({
        event: 'begin_checkout',
        ecommerce: {
          currency: currencyCode,
          value: totalAmount,
          coupon: discountCodes?.[0]?.code || undefined,
          items,
        },
      });
    } catch (e) {
      // fail silently
    }
  };

  return (
    <>
      <div className="flex flex-col gap-2 w-full">
        <form action={isEn ? "/en/checkout/initiate" : "/checkout/initiate"} method="post" className="w-full">
          <button
            type="submit"
            disabled={disabled}
            onClick={fireBeginCheckout}
            className={`w-full h-[52px] ${disabled ? 'bg-[#e8e4e1] cursor-not-allowed text-[#888]' : 'bg-[#234745] hover:bg-[#1A3533] active:scale-[0.98] text-white'} font-bold text-[16px] rounded-[50px] flex items-center justify-center transition-all`}
            style={{ color: disabled ? '#888' : '#FFFFFF', fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
          >
            {isEn ? 'Complete Order' : 'إتمام الطلب'}
          </button>
        </form>

        {disabled && (
          <>
            {branchErrorText && (
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('openDeliveryModal'));
                  }
                }}
                className="w-full text-red-500 text-[13px] font-bold text-center px-4 py-2.5 bg-red-50 hover:bg-red-100 active:scale-[0.98] transition-all rounded-xl border border-red-200 flex items-center justify-center gap-2 cursor-pointer shadow-sm group"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <span className="group-hover:underline">{branchErrorText}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 ltr:rotate-180 transition-transform group-hover:translate-x-[-2px]"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
            )}

            {validationError && (
              <p className="text-red-500 text-[12px] font-bold text-center px-4 py-2 bg-red-50 rounded-xl border border-red-100 flex items-center justify-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                {validationError}
              </p>
            )}
          </>
        )}
      </div>
    </>
  );
}




// ─── NEW: LOYALTY POINTS REDEMPTION ─────────────────────────────────────────
function LoyaltyRedemptionUI({ isEn, cart }: { isEn: boolean, cart: any }) {
  const cartRoute = isEn ? '/en/cart' : '/cart';
  const rootData = useRouteLoaderData('root') as any;
  const appliedPointsStr = cart?.attributes?.find((a: any) => a.key === 'loyalty_points')?.value;
  const initialPoints = parseInt(appliedPointsStr) || 0;

  const [pointsToRedeem, setPointsToRedeem] = useState<number>(initialPoints);
  const [availablePoints, setAvailablePoints] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fetcher = useFetcher<any>();

  const [customerInfo, setCustomerInfo] = useState<{ phone?: string, email?: string }>({});

  useEffect(() => {
    if (rootData?.customer) {
      Promise.resolve(rootData.customer).then((res: any) => {
        const cust = res?.customer;
        if (cust) {
          setCustomerInfo({
            phone: cust.phone,
            email: cust.email,
          });
        }
      }).catch(() => { });
    }
  }, [rootData?.customer]);

  // Sync state after fetcher finishes
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      if (fetcher.data.error) {
        setErrorMsg(fetcher.data.error);
      } else if (fetcher.data.success) {
        setErrorMsg(null);
      }
    }
  }, [fetcher.state, fetcher.data]);

  // Extract phone number or email
  let phone = rootData?.loginOtpPhone || cart?.buyerIdentity?.phone || cart?.buyerIdentity?.customer?.phone || customerInfo.phone;
  const email = cart?.buyerIdentity?.email || cart?.buyerIdentity?.customer?.email || customerInfo.email;
  if (!phone && email && email.includes('@saadeddin.dev')) {
    phone = email.split('@')[0];
  }

  const customerIdentifier = phone || email;

  useEffect(() => {
    if (customerIdentifier) {
      const cleanId = customerIdentifier.replace(/\s+/g, '');
      fetch(`/api/loyalty-points?identifier=${encodeURIComponent(cleanId)}&t=${Date.now()}`)
        .then(res => res.json())
        .then(data => {
          if (data?.success && data?.data?.points !== undefined) {
            setAvailablePoints(data.data.points);
          }
        })
        .catch(() => { });
    }
  }, [customerIdentifier]);

  if (!customerIdentifier) {
    return (
      <section className="flex flex-col gap-3 mt-4 pt-4 border-t border-dashed border-[#f0ece8]">
        <div className="flex items-center gap-2 text-[#234745] mb-1">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          <span className="font-bold text-[14px]">
            {isEn ? 'Redeem Points' : 'استبدال النقاط'}
          </span>
        </div>
        <div className="bg-[#fcfaf8] border border-[#f0ece8] rounded-xl p-5 text-center flex flex-col items-center gap-3">
          <p className="text-[13px] text-gray-600 font-medium leading-relaxed max-w-[280px]">
            {isEn
              ? 'Log in to view and redeem your loyalty points.'
              : 'سجل الدخول لعرض واستبدال نقاط الولاء الخاصة بك.'}
          </p>
          <Link
            to={isEn ? "/en/account/login" : "/account/login"}
            className="inline-flex items-center justify-center bg-[#234745] hover:bg-[#163529] !text-white font-bold px-6 py-2.5 rounded-full text-[13px] transition-all shadow-sm active:scale-95 mt-1"
            style={{ color: '#FFFFFF', fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
          >
            {isEn ? 'Log In' : 'تسجيل الدخول'}
          </Link>
        </div>

      </section>
    );
  }

  const pointsToCurrencyRatio = 0.01;
  const cartSubtotal = parseFloat(cart?.cost?.subtotalAmount?.amount || '0');
  const maxRedeemablePoints = availablePoints ? Math.min(availablePoints, Math.floor(cartSubtotal * 100)) : 0;
  const isApplied = initialPoints > 0;
  const appliedDiscountSAR = (initialPoints * pointsToCurrencyRatio).toFixed(2);

  return (
    <section className="flex flex-col gap-3 mt-4 pt-4 border-t border-dashed border-[#f0ece8]">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 text-[#234745]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
          <span className="font-bold text-[14px]">
            {isEn ? 'Redeem Points' : 'استبدال النقاط'}
          </span>
        </div>
        {availablePoints !== null && (
          <span className="text-[12px] font-bold text-[#234745] bg-emerald-50 px-3 py-1 rounded-[16px] border border-emerald-100 flex items-center gap-1">
            <span className="text-emerald-700 font-en font-black">{availablePoints}</span>
            <span className="text-emerald-600">{isEn ? 'pts available' : 'نقطة متاحة'}</span>
          </span>
        )}
      </div>

      {errorMsg && (
        <p className="text-red-500 text-[12px] font-bold mb-1">{errorMsg}</p>
      )}

      {/* Applied Discount State */}
      {isApplied ? (
        <div className="border border-emerald-300 bg-emerald-50/50 rounded-xl p-4 flex flex-col gap-2">
          <div className="flex justify-between items-center text-[13px]">
            <span className="font-bold text-emerald-900">
              {isEn ? `Applied ${initialPoints} Points Discount` : `خصم نقاط الولاء المُطبق: ${initialPoints} نقطة`}
            </span>
            <span className="font-bold text-emerald-700 font-en">
              -{appliedDiscountSAR} SAR
            </span>
          </div>
          <CartForm
            route={cartRoute}
            action="LoyaltyUpdate"
            inputs={{ points: '0', intent: 'remove' }}
            className="w-full mt-1"
          >
            {(fetcher: any) => (
              <button
                type="submit"
                disabled={fetcher.state !== 'idle'}
                className="w-full text-center py-2 bg-[#e74c3c] hover:bg-[#c0392b] text-white rounded-lg text-[12px] font-bold transition-all shadow-sm"
              >
                {fetcher.state !== 'idle' ? (isEn ? 'Removing...' : 'جاري الإزالة...') : (isEn ? 'Remove Loyalty Discount' : 'إزالة الخصم')}
              </button>
            )}
          </CartForm>
        </div>
      ) : (
        /* Redeem Points Widget */
        <div className="border border-[#f0ece8] bg-[#fcfaf8] rounded-xl p-4 flex flex-col gap-3">
          {availablePoints === 0 || availablePoints === null ? (
            <p className="text-[12px] text-gray-500 text-center py-2 font-medium">
              {isEn ? 'You currently have 0 loyalty points.' : 'لا توجد لديك نقاط ولاء حالياً.'}
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between text-[12px] font-medium text-gray-700">
                <span>{isEn ? '100 Points = 1 SAR Discount' : '100 نقطة = 1 ر.س خصم'}</span>
                <span className="text-[#234745] font-bold">
                  {isEn ? `Max: ${(availablePoints * 0.01).toFixed(2)} SAR` : `أقصى خصم: ${(availablePoints * 0.01).toFixed(2)} ر.س`}
                </span>
              </div>

              {/* Quick Redeem Button for All Available Points */}
              <CartForm
                route={cartRoute}
                action="LoyaltyUpdate"
                inputs={{ points: String(availablePoints), intent: 'apply' }}
                className="w-full"
              >
                {(fetcher: any) => {
                  const actionError = fetcher.data?.error;
                  const discountSAR = (availablePoints * 0.01).toFixed(2);
                  return (
                    <div className="w-full flex flex-col gap-1">
                      <button
                        type="submit"
                        disabled={fetcher.state !== 'idle' || availablePoints <= 0}
                        className="w-full py-2.5 bg-[#234745] hover:bg-[#142e22] text-white rounded-lg text-[13px] font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                      >
                        <span>⭐</span>
                        <span>
                          {fetcher.state !== 'idle'
                            ? (isEn ? 'Redeeming...' : 'جاري الاستبدال...')
                            : (isEn ? `Redeem All ${availablePoints} Points (-${discountSAR} SAR)` : `استبدال ${availablePoints} نقطة (خصم ${discountSAR} ر.س)`)}
                        </span>
                      </button>
                      {actionError && (
                        <p className="text-red-500 text-[11px] font-bold mt-1 text-center bg-red-50 p-2 rounded-lg border border-red-200">
                          {actionError}
                        </p>
                      )}
                    </div>
                  );
                }}
              </CartForm>

              {/* Custom Points Input (if availablePoints >= 100) */}
              {availablePoints >= 100 && (
                <div className="pt-2 border-t border-[#f0ece8]">
                  <p className="text-[11px] text-gray-500 mb-1.5 font-medium">
                    {isEn ? 'Or enter custom amount of points to use:' : 'أو أدخل عدد نقاط مخصص لاستخدامه:'}
                  </p>
                  <CustomPointsForm
                    availablePoints={availablePoints}
                    isEn={isEn}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}

function CustomPointsForm({ availablePoints, isEn }: { availablePoints: number; isEn: boolean }) {
  const cartRoute = isEn ? '/en/cart' : '/cart';
  const [val, setVal] = useState<string>('');
  const numVal = parseInt(val) || 0;
  const discountVal = (numVal * 0.01).toFixed(2);
  const isValid = numVal >= 100 && numVal <= availablePoints;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <CartForm
        route={cartRoute}
        action="LoyaltyUpdate"
        inputs={{ points: String(numVal), intent: 'apply' }}
        className="flex gap-2 items-center w-full"
      >
        {(fetcher: any) => {
          const actionError = fetcher.data?.error;
          return (
            <div className="w-full flex flex-col gap-1.5">
              <div className="flex gap-2 items-center w-full">
                <div className="relative flex-1">
                  <input
                    type="number"
                    min={100}
                    max={availablePoints}
                    step={100}
                    value={val}
                    onChange={(e) => setVal(e.target.value)}
                    placeholder={isEn ? "Enter points (e.g. 500)" : "أدخل عدد النقاط (مثال: 500)"}
                    className="w-full px-3.5 py-2.5 text-[13px] font-bold rounded-lg border border-gray-200 focus:border-[#234745] focus:outline-none text-start bg-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!isValid || fetcher.state !== 'idle'}
                  className="px-5 py-2.5 bg-[#234745] hover:bg-[#142e22] text-white rounded-lg text-[13px] font-bold disabled:opacity-40 transition-all shrink-0 shadow-sm"
                >
                  {fetcher.state !== 'idle' ? (isEn ? 'Applying...' : 'تطبيق...') : (isEn ? 'Apply' : 'تطبيق')}
                </button>
              </div>
              {actionError && (
                <p className="text-red-500 text-[11px] font-bold text-center bg-red-50 p-2 rounded-lg border border-red-200">
                  {actionError}
                </p>
              )}
            </div>
          );
        }}
      </CartForm>

      {numVal > 0 && (
        <div className={`text-[11px] font-bold flex items-center gap-1 px-1 ${isValid ? 'text-emerald-700' : 'text-red-500'}`}>
          {isValid ? (
            <span>
              {isEn ? `Equivalent discount: -${discountVal} SAR` : `قيمة الخصم المستحقة: -${discountVal} ر.س`}
            </span>
          ) : numVal < 100 ? (
            <span>{isEn ? 'Minimum 100 points required' : 'الحد الأدنى 100 نقطة'}</span>
          ) : (
            <span>{isEn ? `Maximum ${availablePoints} points available` : `لديك ${availablePoints} نقطة كحد أقصى`}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── STORE CREDIT / WALLET REDEMPTION ─────────────────────────────────────────
function StoreCreditRedemptionUI({ isEn, cart }: { isEn: boolean; cart: any }) {
  const rootData = useRouteLoaderData('root') as any;
  const appliedCreditStr = cart?.attributes?.find((a: any) => a.key === 'store_credit_amount')?.value;
  const initialCredit = parseFloat(appliedCreditStr || '0') || 0;

  const [amountToUse, setAmountToUse] = useState<string>(initialCredit > 0 ? initialCredit.toString() : '');
  const [availableBalance, setAvailableBalance] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fetcher = useFetcher<any>();

  const [customerInfo, setCustomerInfo] = useState<{ phone?: string; email?: string }>({});

  useEffect(() => {
    if (rootData?.customer) {
      Promise.resolve(rootData.customer).then((res: any) => {
        const cust = res?.customer;
        if (cust) {
          setCustomerInfo({
            phone: cust.phone,
            email: cust.email,
          });
        }
      }).catch(() => { });
    }
  }, [rootData?.customer]);

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      if (fetcher.data.error) {
        setErrorMsg(fetcher.data.error);
      } else if (fetcher.data.success || fetcher.data.cart) {
        setErrorMsg(null);
      }
    }
  }, [fetcher.state, fetcher.data]);

  let phone = rootData?.loginOtpPhone || cart?.buyerIdentity?.phone || cart?.buyerIdentity?.customer?.phone || customerInfo.phone;
  const email = cart?.buyerIdentity?.email || cart?.buyerIdentity?.customer?.email || customerInfo.email;
  if (!phone && email && email.includes('@saadeddin.dev')) {
    phone = email.split('@')[0];
  }

  useEffect(() => {
    const cleanPhone = (phone || '').replace(/\s+/g, '');
    const query = cleanPhone ? `phone=${encodeURIComponent(cleanPhone)}&` : '';
    fetch(`/api/wallet-balance?${query}t=${Date.now()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data?.balance !== undefined) {
          setAvailableBalance(data.balance);
        }
      })
      .catch(() => { });
  }, [phone, rootData?.customer]);

  if (!phone && availableBalance === null) {
    return null;
  }

  const isApplied = initialCredit > 0;
  const cartSubtotal = parseFloat(cart?.cost?.subtotalAmount?.amount || '0');
  const maxApplicable = availableBalance ? Math.min(availableBalance, cartSubtotal) : 0;

  const handleUseMax = () => {
    if (maxApplicable > 0) {
      setAmountToUse(maxApplicable.toFixed(2));
      setErrorMsg(null);
    }
  };

  return (
    <section className="flex flex-col gap-3 mt-4 pt-4 border-t border-dashed border-[#f0ece8]">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2 text-[#234745]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
          <span className="font-bold text-[14px]">
            {isEn ? 'Use Store Credit (Wallet)' : 'استخدام رصيد المحفظة'}
          </span>
        </div>
        {availableBalance !== null && (
          <span className="text-[12px] font-bold text-[#234745] bg-[#EBF3F1] px-2.5 py-1 rounded-full border border-[#234745]/10">
            {isEn ? 'Balance:' : 'الرصيد:'} {availableBalance.toFixed(2)} {isEn ? 'SAR' : 'ر.س'}
          </span>
        )}
      </div>

      {isApplied ? (
        <div className="bg-[#EBF3F1] border border-[#234745]/20 rounded-xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">💳</span>
            <div>
              <span className="font-bold text-[13px] text-[#234745] block">
                {isEn ? 'Store Credit Applied' : 'تم تطبيق رصيد المحفظة'}
              </span>
              <span className="text-[11px] text-[#234745]/80 font-medium">
                -{initialCredit.toFixed(2)} {isEn ? 'SAR' : 'ر.س'}
              </span>
            </div>
          </div>
          <CartForm
            route={isEn ? '/en/cart' : '/cart'}
            action="StoreCreditUpdate"
            inputs={{ intent: 'remove', phone: String(phone || '') }}
          >
            {(fetcher: any) => (
              <button
                type="submit"
                disabled={fetcher.state !== 'idle'}
                className="text-[12px] font-bold text-red-600 hover:text-red-700 bg-white hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 transition-colors disabled:opacity-50"
              >
                {fetcher.state !== 'idle' ? (isEn ? 'Removing...' : 'جاري الإلغاء...') : (isEn ? 'Remove' : 'إلغاء')}
              </button>
            )}
          </CartForm>
        </div>
      ) : availableBalance !== null && availableBalance > 0 ? (
        <CartForm
          route={isEn ? '/en/cart' : '/cart'}
          action="StoreCreditUpdate"
          inputs={{
            amount: String(amountToUse),
            intent: 'apply',
            phone: String(phone || ''),
          }}
          className="flex flex-col gap-2"
        >
          {(fetcher: any) => {
            const actionError = fetcher.data?.error || errorMsg;
            return (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      name="amount"
                      step="0.01"
                      min="0.01"
                      max={maxApplicable}
                      value={amountToUse}
                      onChange={(e) => {
                        setAmountToUse(e.target.value);
                        setErrorMsg(null);
                      }}
                      placeholder={isEn ? `Max ${maxApplicable.toFixed(2)} SAR` : `بحد أقصى ${maxApplicable.toFixed(2)} ر.س`}
                      className="w-full bg-white border border-[#EADFC9] rounded-xl px-3 py-2.5 text-sm font-medium text-[#234745] focus:outline-none focus:border-[#234745] transition-colors"
                    />
                    {maxApplicable > 0 && (
                      <button
                        type="button"
                        onClick={handleUseMax}
                        className="absolute end-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#234745] bg-[#EBF3F1] hover:bg-[#234745] hover:text-white px-2 py-1 rounded transition-colors"
                      >
                        {isEn ? 'MAX' : 'الكل'}
                      </button>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={fetcher.state !== 'idle' || !amountToUse || parseFloat(amountToUse) <= 0 || parseFloat(amountToUse) > (availableBalance || 0)}
                    className="bg-[#234745] hover:bg-[#1a3533] text-white font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 shrink-0"
                  >
                    {fetcher.state !== 'idle' ? (isEn ? 'Applying...' : 'جاري التطبيق...') : (isEn ? 'Apply' : 'تطبيق')}
                  </button>
                </div>
                {actionError && (
                  <p className="text-[12px] text-red-600 font-medium px-1 mt-0.5">{actionError}</p>
                )}
              </div>
            );
          }}
        </CartForm>
      ) : availableBalance !== null && availableBalance <= 0 ? (
        <p className="text-[12px] text-gray-500 font-medium px-1">
          {isEn ? 'You currently have 0.00 SAR store credit.' : 'لا يوجد لديك رصيد محفظة حالياً.'}
        </p>
      ) : null}
    </section>
  );
}

function ViewCartAction({ isEn }: { isEn: boolean }) {
  const { close } = useAside();

  return (
    <div className="mt-2 px-2 mb-2">
      <Link
        to={isEn ? '/en/cart' : '/cart'}
        onClick={close}
        prefetch="intent"
        className="w-full bg-[#234745] hover:bg-[#003840] text-white font-bold py-4 px-8 rounded-[32px] flex items-center justify-between transition-all group shadow-xl"
      >
        <span className="text-[16px] text-white">{isEn ? 'View Cart' : 'عرض السلة'}</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${isEn ? 'rotate-180 group-hover:translate-x-1' : 'group-hover:-translate-x-1'}`}>
          <line x1="21" y1="12" x2="3" y2="12"></line>
          <polyline points="10 5 3 12 10 19"></polyline>
        </svg>
      </Link>
    </div>
  );
}

function CartDiscounts({
  discountCodes,
  cart,
  discountsHeadingId,
  discountCodeInputId,
  isEn,
  invalidActiveDiscount,
  branchName,
  isBranchPromoFreeDelivery = false,
  isThresholdMet = false,
  isPickup = false,
}: {
  discountCodes?: CartApiQueryFragment['discountCodes'];
  cart?: any;
  discountsHeadingId: string;
  discountCodeInputId: string;
  isEn: boolean;
  invalidActiveDiscount?: string;
  branchName?: string;
  isBranchPromoFreeDelivery?: boolean;
  isThresholdMet?: boolean;
  isPickup?: boolean;
}) {
  const [showInput, setShowInput] = useState(false);

  const codes: string[] =
    discountCodes
      ?.filter((discount) => discount.applicable && (!isPickup || discount.code?.toLowerCase() !== 'freeshipping'))
      ?.map(({ code }) => code) || [];

  const hasLineAllocations = cart?.lines?.nodes?.some((line: any) => line?.discountAllocations?.length > 0);
  const hasCartAllocations = cart?.discountAllocations?.length > 0;
  const hasAllocations = hasLineAllocations || hasCartAllocations;
  const hasAutomaticDiscount = hasAllocations && codes.length === 0;

  const isEmployeeDiscountActive =
    codes.some(c => c.toUpperCase().includes('EMPLOYEE') || c.toUpperCase().startsWith('EMP') || c.toUpperCase() === 'EMPLOYEE25');

  return (
    <div aria-label="Discounts" className="w-full relative space-y-2">
      {/* Promo Free Delivery Active Badge */}
      {isBranchPromoFreeDelivery && (
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-emerald-800 shadow-sm mb-2">
          <div className="flex items-center gap-2 text-emerald-700">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
            <div>
              <span className="font-bold text-[14px] leading-tight block text-emerald-900">
                ⚡ {isEn ? 'Promo Free Delivery' : 'توصيل مجاني للفترة المحددة'}
              </span>
              <span className="text-[11px] font-medium text-emerald-700 block mt-0.5">
                {isEn ? 'Free shipping discount active for selected time slot' : 'خصم الشحن المجاني مفعّل للفترة المحددة'}
              </span>
            </div>
          </div>
        </div>
      )}
      {/* Employee Discount Active Badge & Anti-Stacking Lock */}
      {isEmployeeDiscountActive ? (
        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-800 shadow-sm">
          <div className="flex items-center gap-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-green-700 shrink-0">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
              <line x1="7" y1="7" x2="7.01" y2="7"></line>
            </svg>
            <div>
              <span className="font-bold text-[14px] leading-tight block text-green-900">
                {isEn ? 'Employee Discount (25%)' : 'خصم الموظفين (25%)'}
              </span>
              <span className="text-[11px] font-medium text-green-700 block mt-0.5">
                {codes[0] || 'EMPLOYEE25'} • {isEn ? 'Applied to your cart' : 'تم التطبيق على سلتك'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <>
          <dl hidden={!codes.length}>
            <div>
              <dt id={discountsHeadingId} className="sr-only">Discounts</dt>
              <UpdateDiscountForm>
                {(fetcher: any) => {
                  const isRemoving = fetcher.state !== 'idle';
                  const isInvalid = !!invalidActiveDiscount;
                  return (
                    <div className="flex flex-col gap-2">
                      <div className={`flex items-center justify-between border rounded-xl px-4 py-3 transition-opacity ${
                        isInvalid ? 'bg-red-50 border-red-300 text-red-800' : 'bg-green-50 border-green-200 text-green-700'
                      } ${isRemoving ? 'opacity-50' : 'opacity-100'}`}>
                        <div className="flex items-center gap-2">
                          {isInvalid ? (
                            <span className="text-base">⚠️</span>
                          ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                          )}
                          <div>
                            <span className="font-bold text-[14px] leading-none block">
                              {codes?.join(', ')}
                            </span>
                            <span className="text-[11px] font-medium opacity-80 block mt-0.5">
                              {isInvalid
                                ? (isEn ? `Not valid for ${branchName || 'selected branch'}` : `غير متاح لـ ${branchName || 'الفرع المختار'}`)
                                : (isEn ? 'Voucher applied' : 'تم تطبيق الكود')}
                            </span>
                          </div>
                        </div>
                        <button
                          type="submit"
                          aria-label="Remove discount"
                          disabled={isRemoving}
                          className={`${isInvalid ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-red-500'} transition-colors p-1`}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                      </div>
                    </div>
                  );
                }}
              </UpdateDiscountForm>
            </div>
          </dl>

          {/* Render Automatic Discounts */}
          {hasAutomaticDiscount && (
            <dl>
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-2">
                <div className="flex items-center gap-2 text-green-700">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                  <div>
                    <span className="font-bold text-[14px] leading-none block">
                      {isEn ? 'Automatic Promotion' : 'خصم تلقائي'}
                    </span>
                    <span className="text-[11px] font-medium opacity-80 block mt-0.5">
                      {isEn ? 'Applied to your cart' : 'تم التطبيق على سلتك'}
                    </span>
                  </div>
                </div>
              </div>
            </dl>
          )}

          <div hidden={codes.length > 0}>
            <UpdateDiscountForm discountCodes={codes}>
              {(fetcher: any) => {
                const isLoading = fetcher.state !== 'idle';
                return (
                  <div className="flex flex-col gap-2 w-full">
                    <div className="flex w-full items-center justify-between border border-gray-300 rounded-xl overflow-hidden focus-within:border-[#234745] transition-colors p-1.5 h-[56px] relative bg-white">
                      <input
                        type="text"
                        name="discountCode"
                        defaultValue=""
                        placeholder={isEn ? "Discount code" : "كود الخصم"}
                        className="flex-1 bg-transparent px-4 py-2 text-[14px] text-[#234745] focus:outline-none placeholder-[#9FB7AE] font-bold w-full h-full"
                        style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                      />
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="bg-[#234745] text-white px-6 h-full text-[14px] font-bold hover:bg-[#1A3533] transition-colors rounded-[8px] flex-shrink-0"
                        style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                      >
                        {isLoading ? '...' : (isEn ? 'Apply' : 'تطبيق')}
                      </button>
                    </div>
                    {fetcher.data?.error && (
                      <div className="text-red-500 text-xs font-bold px-3 py-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-1.5 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                        <span>{fetcher.data.error}</span>
                      </div>
                    )}
                  </div>
                );
              }}
            </UpdateDiscountForm>
          </div>
        </>
      )}
    </div>
  );
}

function UpdateDiscountForm({
  discountCodes,
  children,
}: {
  discountCodes?: string[];
  children: React.ReactNode | ((fetcher: any) => React.ReactNode);
}) {
  const location = useLocation();
  const cartRoute = location.pathname.startsWith('/en') ? '/en/cart' : '/cart';
  return (
    <CartForm
      route={cartRoute}
      action={CartForm.ACTIONS.DiscountCodesUpdate}
      inputs={{
        discountCodes: discountCodes || [],
      }}
    >
      {(fetcher: any) => (
        typeof children === 'function' ? children(fetcher) : children
      )}
    </CartForm>
  );
}

function CartGiftCard({
  giftCardCodes,
  giftCardHeadingId,
  giftCardInputId,
  isEn,
}: {
  giftCardCodes?: CartApiQueryFragment['appliedGiftCards'];
  giftCardHeadingId: string;
  giftCardInputId: string;
  isEn: boolean;
}) {
  const appliedGiftCardCodes = useRef<string[]>([]);
  const giftCardCodeInput = useRef<HTMLInputElement>(null);
  const codes: string[] =
    giftCardCodes?.map(({ lastCharacters }) => lastCharacters) || [];

  function saveAppliedCode(code: string) {
    const formattedCode = code.replace(/\s/g, ''); // Remove spaces
    if (!appliedGiftCardCodes.current.includes(formattedCode)) {
      appliedGiftCardCodes.current.push(formattedCode);
    }
    giftCardCodeInput.current!.value = '';
  }

  function removeAppliedCode() {
    appliedGiftCardCodes.current = [];
  }

  return (
    <section aria-label="Gift card" className="flex flex-col gap-3">
      <dl hidden={!codes.length}>
        <div>
          <dt id={giftCardHeadingId} className="sr-only">Applied Gift Card</dt>
          <UpdateGiftCardForm>
            <div className="flex items-center justify-between bg-[#fcfaf8] border border-green-200 rounded-xl px-4 py-2">
              <div className="flex items-center gap-2 text-green-700">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
                <code className="font-bold text-[13px]">**** {codes?.join(', **** ')}</code>
              </div>
              <button
                type="submit"
                onSubmit={() => removeAppliedCode()}
                aria-label="Remove gift card"
                className="text-gray-400 hover:text-red-500 transition-colors p-1"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
          </UpdateGiftCardForm>
        </div>
      </dl>

      <UpdateGiftCardForm
        giftCardCodes={appliedGiftCardCodes.current}
        saveAppliedCode={saveAppliedCode}
      >
        <div className="flex gap-2">
          <label htmlFor={giftCardInputId} className="sr-only">
            Gift card code
          </label>
          <input
            id={giftCardInputId}
            type="text"
            name="giftCardCode"
            placeholder={isEn ? "Gift card code" : "كود بطاقة الهدية"}
            ref={giftCardCodeInput}
            className="flex-1 bg-[#fcfaf8] border border-[#f0ece8] rounded-xl px-4 py-3 text-[14px] text-[#234745] placeholder-gray-400 focus:outline-none focus:border-[#d4a06a] focus:ring-1 focus:ring-[#d4a06a] transition-all"
          />
          <button
            type="submit"
            aria-label="Apply gift card"
            className="bg-[#f0ece8] text-[#234745] font-bold px-5 py-3 rounded-xl hover:bg-[#e8e4e1] transition-colors"
          >
            {isEn ? 'Apply' : 'تطبيق'}
          </button>
        </div>
      </UpdateGiftCardForm>
    </section>
  );
}

function UpdateGiftCardForm({
  giftCardCodes,
  saveAppliedCode,
  children,
}: {
  giftCardCodes?: string[];
  saveAppliedCode?: (code: string) => void;
  children: React.ReactNode;
}) {
  const location = useLocation();
  const cartRoute = location.pathname.startsWith('/en') ? '/en/cart' : '/cart';
  return (
    <CartForm
      route={cartRoute}
      action={CartForm.ACTIONS.GiftCardCodesUpdate}
      inputs={{
        giftCardCodes: giftCardCodes || [],
      }}
    >
      {(fetcher: any) => {
        const code = fetcher.formData?.get('giftCardCode');
        if (code) saveAppliedCode && saveAppliedCode(code as string);
        return children;
      }}
    </CartForm>
  );
}

function CartCalendarPicker({
  isEn,
  cart,
  currentBranch,
  isPickup: propIsPickup,
  fulfillmentType: propFulfillmentType,
}: {
  isEn: boolean;
  cart: any;
  currentBranch: any;
  isPickup?: boolean;
  fulfillmentType?: string;
}) {
  const fetcher = useFetcher();
  const cartRoute = isEn ? '/en/cart' : '/cart';
  const selectedDate = cart?.attributes?.find((a: any) => a.key === 'delivery_date')?.value || '';
  const selectedTimeSlot = cart?.attributes?.find((a: any) => a.key === 'Time Slot')?.value || '';
  const attrFulfillmentType = cart?.attributes?.find((a: any) => a.key?.toLowerCase()?.trim() === 'fulfillment type')?.value;
  const fulfillmentType = propFulfillmentType || attrFulfillmentType || (typeof window !== 'undefined' && localStorage.getItem('saadeddin_fulfillment_type')) || 'delivery';
  const isPickup = typeof propIsPickup === 'boolean' ? propIsPickup : (fulfillmentType?.toLowerCase() === 'pickup');

  // Optimistic UI states — never overwrite while a fetch is in-flight
  const [localSelectedDate, setLocalSelectedDate] = useState(selectedDate);
  const [localTimeSlot, setLocalTimeSlot] = useState(selectedTimeSlot);

  // Only sync from cart when there's no pending fetch AND cart data actually changed
  const prevSelectedDate = useRef(selectedDate);
  const prevSelectedTimeSlot = useRef(selectedTimeSlot);
  useEffect(() => {
    // If cart data changed (e.g. after page reload or external update) and no fetch
    // is in-flight, pull the latest cart values into local state
    const dateChanged = prevSelectedDate.current !== selectedDate;
    const slotChanged = prevSelectedTimeSlot.current !== selectedTimeSlot;
    prevSelectedDate.current = selectedDate;
    prevSelectedTimeSlot.current = selectedTimeSlot;
    if (fetcher.state === 'idle' && (dateChanged || slotChanged)) {
      setLocalSelectedDate(selectedDate);
      setLocalTimeSlot(selectedTimeSlot);
    }
  }, [selectedDate, selectedTimeSlot, fetcher.state]);

  // 1. Calculate max prep days
  const maxPrepDays = cart?.lines?.nodes?.reduce((max: number, line: any) => {
    const tags = line.merchandise?.product?.tags || [];
    const prepTag = tags.find((t: string) => t.startsWith('prep-days-') || t.startsWith('prep-'));
    if (prepTag) {
      const days = parseInt(prepTag.replace(/\D/g, ''));
      if (!isNaN(days) && days > max) return days;
    }
    return max;
  }, 0) || 0;

  // 2. Track current displayed month
  const [displayedMonth, setDisplayedMonth] = useState(() => {
    const initial = selectedDate ? new Date(selectedDate + 'T12:00:00') : new Date();
    return isNaN(initial.getTime()) ? new Date() : initial;
  });

  // 3. Helper to format date in YYYY-MM-DD
  const formatYYYYMMDD = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // 4. Generate calendar grid days
  const year = displayedMonth.getFullYear();
  const month = displayedMonth.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const prevMonthTotalDays = new Date(year, month, 0).getDate();

  const calendarDays: { date: Date; isCurrentMonth: boolean }[] = [];

  // Previous month fallback padding days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    calendarDays.push({
      date: new Date(year, month - 1, prevMonthTotalDays - i),
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let i = 1; i <= totalDays; i++) {
    calendarDays.push({
      date: new Date(year, month, i),
      isCurrentMonth: true,
    });
  }

  // Next month padding days to fill 42 cells grid
  const remainingCells = 42 - calendarDays.length;
  for (let i = 1; i <= remainingCells; i++) {
    calendarDays.push({
      date: new Date(year, month + 1, i),
      isCurrentMonth: false,
    });
  }

  // 5. Date validation checks
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const maxFutureDate = new Date();
  maxFutureDate.setDate(today.getDate() + 30); // 30 days maximum booking limit

  const minAvailableDate = new Date();
  minAvailableDate.setDate(today.getDate() + maxPrepDays);
  minAvailableDate.setHours(0, 0, 0, 0);

  // Check branch closed days
  const isBranchClosedOn = (date: Date) => {
    if (!currentBranch) return false;
    const openDays = currentBranch.workingDays;
    if (!openDays || !Array.isArray(openDays) || openDays.length === 0) return false;
    const weekday = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Riyadh',
      weekday: 'short'
    }).format(date);
    return !openDays.includes(weekday);
  };

  const isDateDisabled = (date: Date) => {
    // Clone to avoid mutating the calendarDays Date objects
    const d = new Date(date.getTime());
    d.setHours(0, 0, 0, 0);
    if (d < today) return true;
    if (d < minAvailableDate) return true;
    if (d > maxFutureDate) return true;
    if (isBranchClosedOn(d)) return true;
    return false;
  };

  // 6. Navigation
  const handlePrevMonth = () => {
    setDisplayedMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setDisplayedMonth(new Date(year, month + 1, 1));
  };

  // 7. Time slot generation based on selected date
  const dynamicTimeSlots = localSelectedDate ? generateDynamicSlots(currentBranch, isEn, fulfillmentType, localSelectedDate) : [];

  const isTimeSlotInvalid = localTimeSlot && !dynamicTimeSlots.includes(localTimeSlot);

  const getBranchHoursStr = () => {
    if (!currentBranch) return '';
    const getMeta = (key: string) => {
      if (currentBranch[key]?.value) return currentBranch[key].value;
      if (typeof currentBranch[key] === 'string') return currentBranch[key];
      const meta = currentBranch.metafields?.find((m: any) => m?.key === key);
      return meta?.value;
    };

    const dateObj = localSelectedDate ? new Date(localSelectedDate + 'T12:00:00') : new Date();
    const weekday = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Riyadh',
      weekday: 'short'
    }).format(dateObj).toLowerCase();

    const dayFromKey = `${weekday}_working_hours_from`;
    const dayToKey = `${weekday}_working_hours_to`;

    const fromStr = getMeta(dayFromKey) || getMeta('working_hours_from') || '10:00';
    const toStr = getMeta(dayToKey) || getMeta('working_hours_to') || '22:00';

    const fromStr2 = getMeta('working_hours_from_shift2');
    const toStr2 = getMeta('working_hours_to_shift2');

    const forceEnglishDigits = (str: string) => {
      return str.replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1632));
    };

    const shift1 = `${fromStr} - ${toStr}`;
    const shift2 = fromStr2 && toStr2 ? ` & ${fromStr2} - ${toStr2}` : '';
    return forceEnglishDigits(shift1 + shift2);
  };

  const branchHoursStr = getBranchHoursStr();

  // Month names
  const monthNameEn = displayedMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const monthNameAr = `${displayedMonth.toLocaleString('ar-SA', { month: 'long' })} ${displayedMonth.getFullYear()}`;
  const monthLabel = isEn ? monthNameEn : monthNameAr;

  const weekdaysEn = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const weekdaysAr = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'];
  const weekdays = isEn ? weekdaysEn : weekdaysAr;

  return (
    <div className="bg-[#fcfaf8] border border-[#f0ece8] rounded-2xl p-4 flex flex-col gap-4 select-none">
      <div className="flex flex-col gap-1">
        <span className="text-[13px] font-bold text-[#234745] px-1">
          {isPickup ? (isEn ? 'Preferred Pickup Date & Time' : 'تاريخ ووقت الاستلام المفضل') : (isEn ? 'Preferred Delivery Date & Time' : 'تاريخ ووقت التوصيل المفضل')}
        </span>
        {maxPrepDays > 0 && (
          <span className="text-[11px] text-[#c98e54] font-medium px-1 flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            {isEn
              ? `Items require ${maxPrepDays} days prep time`
              : `الأصناف تتطلب تحضير لمدة ${maxPrepDays} أيام`}
          </span>
        )}
      </div>

      {/* Visual Calendar */}
      <div className="flex flex-col gap-3">
        {/* Header Navigation */}
        <div className="flex justify-between items-center px-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            disabled={displayedMonth.getMonth() === today.getMonth() && displayedMonth.getFullYear() === today.getFullYear()}
            className="p-1.5 rounded-lg border border-[#f0ece8] text-[#234745] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#fcfaf8] transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <span className="font-bold text-[14px] text-[#234745]">{monthLabel}</span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg border border-[#f0ece8] text-[#234745] hover:bg-[#fcfaf8] transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>

        {/* Weekday Labels */}
        <div className="grid grid-cols-7 text-center text-[12px] font-bold text-[#9FB7AE]">
          {weekdays.map((d, i) => (
            <span key={i} className="py-1">{d}</span>
          ))}
        </div>

        {/* Day Cells Grid */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {calendarDays.map((cell, idx) => {
            const dateStr = formatYYYYMMDD(cell.date);
            const disabled = isDateDisabled(cell.date);
            const isSelected = localSelectedDate === dateStr;
            const isTodayCell = formatYYYYMMDD(today) === dateStr;

            return (
              <button
                key={idx}
                type="button"
                disabled={disabled}
                onClick={() => {
                  setLocalSelectedDate(dateStr);
                  setLocalTimeSlot(''); // Reset slot locally

                  const formData = new FormData();
                  formData.append('cartFormInput', JSON.stringify({
                    action: 'AttributesUpdate',
                    inputs: {
                      attributes: [
                        { key: 'delivery_date', value: dateStr },
                        { key: 'Time Slot', value: '' },
                      ]
                    }
                  }));
                  fetcher.submit(formData, { method: 'POST', action: cartRoute });
                }}
                className={`
                                  py-2 rounded-xl text-[13px] font-medium transition-all relative
                                  ${!cell.isCurrentMonth ? 'text-gray-300' : 'text-[#234745]'}
                                  ${disabled ? 'opacity-25 cursor-not-allowed bg-transparent' : 'hover:bg-[#f3ece6] cursor-pointer'}
                                  ${isSelected ? '!bg-[#234745] !text-white font-bold shadow-md scale-105' : ''}
                                  ${isTodayCell && !isSelected ? 'border border-[#d4a06a] text-[#d4a06a]' : ''}
                              `}
              >
                {cell.date.getDate()}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Slot Picker (Only visible after selecting a date) */}
      {localSelectedDate && (
        <div className="flex flex-col gap-2 border-t border-[#f0ece8] pt-4">
          <label className="text-[13px] font-bold text-[#234745] px-1">
            {isPickup ? (isEn ? 'Preferred Pickup Time' : 'وقت الاستلام المفضل') : (isEn ? 'Preferred Delivery Time' : 'وقت التوصيل المفضل')}
          </label>
          <div className="relative">
            <select
              value={localTimeSlot}
              onChange={(e) => {
                const newVal = e.target.value;
                setLocalTimeSlot(newVal); // Instant local feedback

                const formData = new FormData();
                formData.append('cartFormInput', JSON.stringify({
                  action: 'AttributesUpdate',
                  inputs: {
                    attributes: [
                      { key: 'Time Slot', value: newVal }
                    ]
                  }
                }));
                fetcher.submit(formData, { method: 'POST', action: cartRoute });
              }}
              className="w-full bg-[#fcfaf8] border border-[#f0ece8] rounded-xl px-4 py-3 text-[14px] text-[#234745] font-medium appearance-none focus:outline-none focus:border-[#d4a06a] focus:ring-1 focus:ring-[#d4a06a] transition-all cursor-pointer"
            >
              <option value="">{isPickup ? (isEn ? 'Select preferred pickup time' : 'اختر وقت الاستلام المفضل') : (isEn ? 'Select preferred delivery time' : 'اختر وقت التوصيل المفضل')}</option>
              {dynamicTimeSlots.map((slot: string, idx: number) => (
                <option key={idx} value={slot}>{slot}</option>
              ))}
            </select>
            <div className="absolute top-1/2 -translate-y-1/2 rtl:left-4 ltr:right-4 pointer-events-none text-[#d4a06a]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          </div>
          {isTimeSlotInvalid && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-xl text-[12px] text-red-800 font-bold leading-relaxed flex items-start gap-2">
              <span className="text-base leading-none">⚠️</span>
              <div>
                {isEn ? (
                  <>
                    Your selected {isPickup ? 'pickup' : 'delivery'} time (<span className="underline">{localTimeSlot}</span>) is outside the working hours of <strong>{currentBranch?.name || 'this branch'}</strong>.
                    <br />
                    Working hours on this day: <strong>{branchHoursStr}</strong>. Please select a different time window.
                  </>
                ) : (
                  <>
                    وقت {isPickup ? 'الاستلام' : 'التوصيل'} المحدد (<span className="underline">{localTimeSlot}</span>) خارج ساعات عمل فرع <strong>{currentBranch?.name || 'هذا الفرع'}</strong>.
                    <br />
                    ساعات العمل في هذا اليوم: <strong>{branchHoursStr}</strong>. يرجى اختيار فترة {isPickup ? 'الاستلام' : 'التوصيل'} الأخرى.
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
