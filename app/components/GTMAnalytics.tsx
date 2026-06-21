import {useAnalytics} from '@shopify/hydrogen';
import {useEffect} from 'react';

/**
 * GTMAnalytics Component
 * Listen to Hydrogen analytics events and push to GTM dataLayer
 */
export function GTMAnalytics() {
  const {subscribe} = useAnalytics();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).dataLayer = (window as any).dataLayer || [];

      // Fallback for search event on initial page load (Remix / React hydration race condition)
      const url = new URL(window.location.href);
      if (url.pathname.includes('/search')) {
        const q = url.searchParams.get('q');
        if (q) {
          const hasSearchEvent = (window as any).dataLayer.some((e: any) => e.event === 'search' && e.search_term === q);
          if (!hasSearchEvent) {
            const eventData = {
              event: 'search',
              ecommerce: {
                currency: 'SAR',
                value: 0,
                items: []
              },
              language: document.documentElement.lang || 'ar',
              search_term: q
            };
            (window as any).dataLayer.push({ ecommerce: null });
            (window as any).dataLayer.push(eventData);
            console.log(`[GTM Fallback] DataLayer Push:`, eventData);
          }
        }
      }
    }
    // Listen to ALL analytics events from Hydrogen
    const unSubscribe = subscribe('all_events', (data: any) => {
      const {eventName, ...payload} = data;
      
      // GA4 Event Mapping
      let gtmEvent = eventName;
      if (eventName === 'page_view') gtmEvent = 'page_view';
      if (eventName === 'view_product') gtmEvent = 'view_item';
      if (eventName === 'view_collection') gtmEvent = 'view_item_list';
      if (eventName === 'view_cart') gtmEvent = 'view_cart';
      if (eventName === 'add_to_cart') gtmEvent = 'add_to_cart';
      if (eventName === 'remove_from_cart') gtmEvent = 'remove_from_cart';
      if (eventName === 'begin_checkout') gtmEvent = 'begin_checkout';
      if (eventName === 'add_payment_info') gtmEvent = 'add_payment_info';
      if (eventName === 'purchase') gtmEvent = 'purchase';
      if (eventName === 'search' || eventName === 'search_viewed') gtmEvent = 'search';
      if (eventName === 'customer_registered') gtmEvent = 'sign_up';
      if (eventName === 'customer_logged_in') gtmEvent = 'login';
      
      // Items mapping function
      const mapItems = (items: any[]) => items?.map((item: any, index: number) => ({
        item_id: item.merchandise?.product?.id || item.product?.id || item.id,
        item_name: item.merchandise?.product?.title || item.product?.title || item.title,
        item_variant: item.merchandise?.title || item.variant?.title,
        price: item.merchandise?.price?.amount || item.price?.amount || item.variant?.price?.amount,
        quantity: item.quantity || 1,
        index: index + 1
      })) || [];

      const eventData: any = {
        event: gtmEvent,
        ecommerce: {
          currency: payload.currencyCode || 'SAR',
          value: payload.totalPrice || payload.value || 0,
          items: []
        },
        language: document.documentElement.lang || 'ar'
      };

      // Payload specific mapping
      if (gtmEvent === 'page_view') {
        eventData.page_title = document.title;
        eventData.page_location = window.location.href;
        eventData.page_path = window.location.pathname;
      } else if (gtmEvent === 'view_item') {
        eventData.ecommerce.items = mapItems([payload.product || payload]);
      } else if (gtmEvent === 'view_item_list') {
        eventData.ecommerce.item_list_name = payload.collection?.title || 'Collection';
        eventData.ecommerce.items = mapItems(payload.collection?.products?.nodes || []);
      } else if (gtmEvent === 'add_to_cart' || gtmEvent === 'remove_from_cart') {
        eventData.ecommerce.items = mapItems(payload.lines || [payload.line]);
      } else if (gtmEvent === 'view_cart' || gtmEvent === 'begin_checkout' || gtmEvent === 'add_payment_info' || gtmEvent === 'purchase') {
        eventData.ecommerce.items = mapItems(payload.cart?.lines?.nodes || payload.lines || []);
        if (gtmEvent === 'purchase') {
          eventData.ecommerce.transaction_id = payload.orderId;
          eventData.ecommerce.tax = payload.totalTax;
          eventData.ecommerce.shipping = payload.totalShipping;
        }
      } else if (gtmEvent === 'search') {
        eventData.search_term = payload.searchTerm;
      }

      console.log(`[GTM] DataLayer Push:`, eventData);

      if (typeof window !== 'undefined' && (window as any).dataLayer) {
        (window as any).dataLayer.push({ ecommerce: null }); // Clear previous ecommerce object
        (window as any).dataLayer.push(eventData);
      }
    });

    return unSubscribe;
  }, [subscribe]);

  return null;
}
