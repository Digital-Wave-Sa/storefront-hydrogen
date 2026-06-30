import { useAnalytics } from '@shopify/hydrogen';
import { useEffect } from 'react';
import { useRouteLoaderData } from 'react-router';
import { getStoredConsent } from './CookieConsentBanner';

// ─── GA4 Enhanced E-commerce Data Layer Helper ────────────────────────────────

/** Push to dataLayer with consent gate and mandatory ecommerce reset */
function dlPush(event: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  if (getStoredConsent() !== 'accepted') return;
  const w = window as any;
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({ ecommerce: null }); // clear previous ecommerce object (GA4 spec)
  w.dataLayer.push(event);
}

/**
 * Map a Hydrogen product/variant/line to a GA4 items array entry.
 * Supports multiple shapes: cart lines, product view, collection nodes.
 */
function mapItem(raw: any, index = 0): Record<string, unknown> {
  // ── Cart line shape ──────────────────────────────────────────────────
  if (raw?.merchandise) {
    const merch = raw.merchandise;
    const product = merch.product || {};
    const collections = product.collections?.nodes || [];
    return {
      item_id: merch.id || product.id || '',
      item_name: product.title || '',
      item_brand: product.vendor || 'سعد الدين',
      item_category: collections[0]?.title || product.productType || '',
      item_category2: collections[1]?.title || '',
      item_variant: merch.title !== 'Default Title' ? merch.title : '',
      price: parseFloat(merch.price?.amount || '0'),
      currency: merch.price?.currencyCode || 'SAR',
      quantity: raw.quantity || 1,
      index: index + 1,
    };
  }

  // ── Analytics.ProductView shape ──────────────────────────────────────
  if (raw?.id && raw?.title) {
    return {
      item_id: raw.variantId || raw.id,
      item_name: raw.title,
      item_brand: raw.vendor || 'سعد الدين',
      item_category: raw.productType || '',
      item_category2: raw.collections?.nodes?.[0]?.title || '',
      item_variant: raw.variantTitle && raw.variantTitle !== 'Default Title' ? raw.variantTitle : '',
      price: parseFloat(raw.price || '0'),
      currency: raw.currencyCode || 'SAR',
      quantity: raw.quantity || 1,
      index: index + 1,
    };
  }

  // ── Collection product node shape ─────────────────────────────────────
  return {
    item_id: raw?.id || '',
    item_name: raw?.title || '',
    item_brand: raw?.vendor || 'سعد الدين',
    item_category: raw?.productType || '',
    item_category2: '',
    item_variant: '',
    price: parseFloat(raw?.priceRange?.minVariantPrice?.amount || raw?.price?.amount || '0'),
    currency: raw?.priceRange?.minVariantPrice?.currencyCode || 'SAR',
    quantity: raw?.quantity || 1,
    index: index + 1,
  };
}

function mapItems(items: any[]): Record<string, unknown>[] {
  if (!Array.isArray(items)) return [];
  return items.map((item, i) => mapItem(item, i));
}

/** Sum cart value from line items */
function cartValue(lines: any[]): number {
  return lines.reduce((sum, line) => {
    const price = parseFloat(
      line?.merchandise?.price?.amount || line?.cost?.totalAmount?.amount || '0',
    );
    return sum + price * (line.quantity || 1);
  }, 0);
}

// ─── GTMAnalytics Component ───────────────────────────────────────────────────

/**
 * GTMAnalytics Component
 * Implements GA4 Enhanced E-commerce spec for GTM dataLayer.
 * All events are consent-gated and follow the GA4 enhanced e-commerce format.
 *
 * Events covered:
 *  page_view, view_item_list, select_item, view_item,
 *  add_to_cart, remove_from_cart, view_cart,
 *  begin_checkout, add_shipping_info, add_payment_info,
 *  purchase, refund, search, sign_up, login
 */
export function GTMAnalytics() {
  const { subscribe } = useAnalytics();

  const rootData = useRouteLoaderData('root') as any;

  // ── User properties (language, customer_type, preferred_branch) ──────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (getStoredConsent() !== 'accepted') return;
    const w = window as any;
    w.dataLayer = w.dataLayer || [];

    // Language preference
    const lang = document.documentElement.lang || 'ar';

    // Preferred branch: read from localStorage (set at location selection)
    const preferredBranch = localStorage.getItem('saadeddin_selected_location_name') || '';

    // Customer type: read from localStorage (set at login/register)
    let customerType = localStorage.getItem('saadeddin_customer_type') || 'guest';

    const pushUserProperties = (type: string) => {
      w.dataLayer.push({
        event: 'user_properties',
        user_language: lang,
        customer_type: type,       // 'guest' | 'individual' | 'company'
        preferred_branch: preferredBranch, // e.g. 'Riyadh - Al Olaya'
      });

      // If GA4 Measurement ID is available, also set via gtag for direct GA4 config
      const ga4Id = w.ENV?.PUBLIC_GA4_MEASUREMENT_ID;
      if (ga4Id && typeof w.gtag === 'function') {
        w.gtag('config', ga4Id, {
          user_properties: {
            language_preference: lang,
            customer_type: type,
            preferred_branch: preferredBranch,
          },
        });
      }
    };

    // First push with whatever we have in localStorage
    pushUserProperties(customerType);

    // Resolve customer data from root loader if available to update customer type dynamically
    if (rootData?.customer) {
      Promise.resolve(rootData.customer).then((res: any) => {
        const cust = res?.customer;
        if (cust) {
          const isCompany = cust.tags?.includes('B2B') || cust.lastName?.includes('(Company)');
          const newType = isCompany ? 'company' : 'individual';
          if (newType !== customerType) {
            localStorage.setItem('saadeddin_customer_type', newType);
            pushUserProperties(newType);
          }
        } else {
          if (customerType !== 'guest') {
            localStorage.setItem('saadeddin_customer_type', 'guest');
            pushUserProperties('guest');
          }
        }
      }).catch(() => {
        if (customerType !== 'guest') {
          localStorage.setItem('saadeddin_customer_type', 'guest');
          pushUserProperties('guest');
        }
      });
    } else {
      if (!rootData?.isLoggedIn && customerType !== 'guest') {
        localStorage.setItem('saadeddin_customer_type', 'guest');
        pushUserProperties('guest');
      }
    }
  }, [rootData]);

  // ── Search fallback (SSR race condition) ───────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    (window as any).dataLayer = (window as any).dataLayer || [];

    const url = new URL(window.location.href);
    if (url.pathname.includes('/search')) {
      const q = url.searchParams.get('q');
      if (q && getStoredConsent() === 'accepted') {
        const already = (window as any).dataLayer.some(
          (e: any) => e.event === 'search' && e.search_term === q,
        );
        if (!already) {
          dlPush({
            event: 'search',
            search_term: q,
            ecommerce: { currency: 'SAR', value: 0, items: [] },
            language: document.documentElement.lang || 'ar',
          });
        }
      }
    }
  }, []);

  // ── Hydrogen analytics subscription ───────────────────────────────────
  useEffect(() => {
    const unsubscribe = subscribe('all_events', (data: any) => {
      if (getStoredConsent() !== 'accepted') return;

      const { eventName, ...payload } = data;
      const lang = typeof document !== 'undefined' ? document.documentElement.lang || 'ar' : 'ar';
      const loc = typeof window !== 'undefined' ? window.location : null;

      // ── page_view ─────────────────────────────────────────────────────
      if (eventName === 'page_view') {
        dlPush({
          event: 'page_view',
          page_title: typeof document !== 'undefined' ? document.title : '',
          page_location: loc?.href || '',
          page_path: loc?.pathname || '',
          language: lang,
          ecommerce: null,
        });
        return;
      }

      // ── view_item_list (collection / category page) ───────────────────
      if (eventName === 'view_collection') {
        const collection = payload.collection || {};
        const products = collection.products?.nodes || [];
        dlPush({
          event: 'view_item_list',
          language: lang,
          ecommerce: {
            item_list_id: collection.id || '',
            item_list_name: collection.title || collection.handle || 'Collection',
            currency: products[0]?.priceRange?.minVariantPrice?.currencyCode || 'SAR',
            items: mapItems(products),
          },
        });
        return;
      }

      // ── select_item (product card click) ─────────────────────────────
      // Hydrogen doesn't fire this natively; we fire it from product card onClick via
      // the global helper `window.__ga4SelectItem()` defined below.
      if (eventName === 'select_item') {
        const product = payload.product || payload;
        dlPush({
          event: 'select_item',
          language: lang,
          ecommerce: {
            item_list_id: payload.listId || '',
            item_list_name: payload.listName || 'Product List',
            currency: 'SAR',
            items: [mapItem(product, 0)],
          },
        });
        return;
      }

      // ── view_item (product detail page) ──────────────────────────────
      if (eventName === 'view_product') {
        const products: any[] = payload.products || [payload.product || payload];
        const first = products[0] || {};
        const price = parseFloat(first.price || '0');
        dlPush({
          event: 'view_item',
          language: lang,
          ecommerce: {
            currency: first.currencyCode || 'SAR',
            value: price,
            items: products.map((p, i) => mapItem(p, i)),
          },
        });
        return;
      }

      // ── add_to_cart ───────────────────────────────────────────────────
      if (eventName === 'add_to_cart') {
        const lines: any[] = payload.lines || (payload.line ? [payload.line] : []);
        const items = mapItems(lines);
        const value = items.reduce((s, it) => s + (it.price as number) * ((it.quantity as number) || 1), 0);
        dlPush({
          event: 'add_to_cart',
          language: lang,
          ecommerce: {
            currency: (items[0]?.currency as string) || 'SAR',
            value,
            items,
          },
        });
        return;
      }

      // ── remove_from_cart ──────────────────────────────────────────────
      if (eventName === 'remove_from_cart') {
        const lines: any[] = payload.lines || (payload.line ? [payload.line] : []);
        const items = mapItems(lines);
        const value = items.reduce((s, it) => s + (it.price as number) * ((it.quantity as number) || 1), 0);
        dlPush({
          event: 'remove_from_cart',
          language: lang,
          ecommerce: {
            currency: (items[0]?.currency as string) || 'SAR',
            value,
            items,
          },
        });
        return;
      }

      // ── view_cart ─────────────────────────────────────────────────────
      if (eventName === 'view_cart') {
        const cartLines: any[] = payload.cart?.lines?.nodes || payload.lines || [];
        const items = mapItems(cartLines);
        const value = cartValue(cartLines);
        dlPush({
          event: 'view_cart',
          language: lang,
          ecommerce: {
            currency: payload.cart?.cost?.totalAmount?.currencyCode || 'SAR',
            value,
            items,
          },
        });
        return;
      }

      // ── begin_checkout ────────────────────────────────────────────────
      if (eventName === 'begin_checkout') {
        const cartLines: any[] = payload.cart?.lines?.nodes || payload.lines || [];
        const items = mapItems(cartLines);
        const value = parseFloat(
          payload.cart?.cost?.totalAmount?.amount || String(cartValue(cartLines)),
        );
        dlPush({
          event: 'begin_checkout',
          language: lang,
          ecommerce: {
            currency: payload.cart?.cost?.totalAmount?.currencyCode || 'SAR',
            value,
            coupon: payload.cart?.discountCodes?.[0]?.code || '',
            items,
          },
        });
        return;
      }

      // ── add_shipping_info ─────────────────────────────────────────────
      // Fired manually via window.__ga4ShippingInfo() — see helper below
      if (eventName === 'add_shipping_info') {
        const cartLines: any[] = payload.cart?.lines?.nodes || payload.lines || [];
        const items = mapItems(cartLines);
        const value = parseFloat(
          payload.cart?.cost?.totalAmount?.amount || String(cartValue(cartLines)),
        );
        dlPush({
          event: 'add_shipping_info',
          language: lang,
          ecommerce: {
            currency: payload.cart?.cost?.totalAmount?.currencyCode || 'SAR',
            value,
            shipping_tier: payload.shippingTier || 'Standard',
            coupon: payload.cart?.discountCodes?.[0]?.code || '',
            items,
          },
        });
        return;
      }

      // ── add_payment_info ──────────────────────────────────────────────
      if (eventName === 'add_payment_info') {
        const cartLines: any[] = payload.cart?.lines?.nodes || payload.lines || [];
        const items = mapItems(cartLines);
        const value = parseFloat(
          payload.cart?.cost?.totalAmount?.amount || String(cartValue(cartLines)),
        );
        dlPush({
          event: 'add_payment_info',
          language: lang,
          ecommerce: {
            currency: payload.cart?.cost?.totalAmount?.currencyCode || 'SAR',
            value,
            payment_type: payload.paymentType || 'Credit Card',
            coupon: payload.cart?.discountCodes?.[0]?.code || '',
            items,
          },
        });
        return;
      }

      // ── purchase ──────────────────────────────────────────────────────
      if (eventName === 'purchase') {
        const cartLines: any[] = payload.cart?.lines?.nodes || payload.lines || [];
        const items = mapItems(cartLines);
        const revenue = parseFloat(
          payload.cart?.cost?.totalAmount?.amount ||
            payload.totalPrice ||
            String(cartValue(cartLines)),
        );
        const tax = parseFloat(payload.cart?.cost?.totalTaxAmount?.amount || payload.totalTax || '0');
        const shipping = parseFloat(payload.totalShipping || '0');
        dlPush({
          event: 'purchase',
          language: lang,
          ecommerce: {
            transaction_id: payload.orderId || payload.order?.id || `order_${Date.now()}`,
            currency: payload.cart?.cost?.totalAmount?.currencyCode || 'SAR',
            value: revenue,
            tax,
            shipping,
            coupon: payload.cart?.discountCodes?.[0]?.code || payload.discountCode || '',
            items,
          },
        });
        return;
      }

      // ── refund ────────────────────────────────────────────────────────
      if (eventName === 'refund') {
        const refundLines: any[] = payload.lines || [];
        const items = mapItems(refundLines);
        const value = parseFloat(payload.refundAmount || String(cartValue(refundLines)));
        dlPush({
          event: 'refund',
          language: lang,
          ecommerce: {
            transaction_id: payload.orderId || '',
            currency: payload.currencyCode || 'SAR',
            value,
            items: refundLines.length > 0 ? items : [], // empty = full refund
          },
        });
        return;
      }

      // ── search ────────────────────────────────────────────────────────
      if (eventName === 'search' || eventName === 'search_viewed') {
        dlPush({
          event: 'search',
          search_term: payload.searchTerm || '',
          language: lang,
          ecommerce: { currency: 'SAR', value: 0, items: [] },
        });
        return;
      }

      // ── auth events ───────────────────────────────────────────────────
      if (eventName === 'customer_registered') {
        dlPush({ event: 'sign_up', method: 'email', language: lang, ecommerce: null });
        return;
      }
      if (eventName === 'customer_logged_in') {
        dlPush({ event: 'login', method: 'email', language: lang, ecommerce: null });
        return;
      }
    });

    return unsubscribe;
  }, [subscribe]);

  // ── Expose global helpers for events Hydrogen doesn't fire natively ──
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const w = window as any;

    /**
     * select_item — call from product card onClick:
     * window.__ga4SelectItem(product, listId, listName)
     */
    w.__ga4SelectItem = (product: any, listId = '', listName = 'Product List') => {
      if (getStoredConsent() !== 'accepted') return;
      dlPush({
        event: 'select_item',
        language: document.documentElement.lang || 'ar',
        ecommerce: {
          item_list_id: listId,
          item_list_name: listName,
          currency: 'SAR',
          items: [mapItem(product, 0)],
        },
      });
    };

    /**
     * add_shipping_info — call when user selects a shipping method:
     * window.__ga4ShippingInfo(cart, shippingTier)
     */
    w.__ga4ShippingInfo = (cart: any, shippingTier = 'Standard') => {
      if (getStoredConsent() !== 'accepted') return;
      const cartLines: any[] = cart?.lines?.nodes || [];
      const items = mapItems(cartLines);
      const value = parseFloat(cart?.cost?.totalAmount?.amount || String(cartValue(cartLines)));
      dlPush({
        event: 'add_shipping_info',
        language: document.documentElement.lang || 'ar',
        ecommerce: {
          currency: cart?.cost?.totalAmount?.currencyCode || 'SAR',
          value,
          shipping_tier: shippingTier,
          coupon: cart?.discountCodes?.[0]?.code || '',
          items,
        },
      });
    };

    /**
     * add_payment_info — call when user selects a payment method:
     * window.__ga4PaymentInfo(cart, paymentType)
     */
    w.__ga4PaymentInfo = (cart: any, paymentType = 'Credit Card') => {
      if (getStoredConsent() !== 'accepted') return;
      const cartLines: any[] = cart?.lines?.nodes || [];
      const items = mapItems(cartLines);
      const value = parseFloat(cart?.cost?.totalAmount?.amount || String(cartValue(cartLines)));
      dlPush({
        event: 'add_payment_info',
        language: document.documentElement.lang || 'ar',
        ecommerce: {
          currency: cart?.cost?.totalAmount?.currencyCode || 'SAR',
          value,
          payment_type: paymentType,
          coupon: cart?.discountCodes?.[0]?.code || '',
          items,
        },
      });
    };

    /**
     * refund — call when order is refunded (e.g. from order detail page):
     * window.__ga4Refund(orderId, lines, currencyCode, refundAmount)
     */
    w.__ga4Refund = (
      orderId: string,
      lines: any[] = [],
      currencyCode = 'SAR',
      refundAmount?: number,
    ) => {
      if (getStoredConsent() !== 'accepted') return;
      const items = mapItems(lines);
      const value = refundAmount ?? cartValue(lines);
      dlPush({
        event: 'refund',
        language: document.documentElement.lang || 'ar',
        ecommerce: {
          transaction_id: orderId,
          currency: currencyCode,
          value,
          items: lines.length > 0 ? items : [],
        },
      });
    };
  }, []);

  return null;
}
