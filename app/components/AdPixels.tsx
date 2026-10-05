import {useEffect} from 'react';
import {useLocation, useRouteLoaderData} from 'react-router';
import {
  CONSENT_ACCEPTED_EVENT,
  numericId,
  setSnapUserEmail,
  snapTrack,
} from '~/lib/snap-pixel';
import {tiktokIdentify, tiktokPage, tiktokTrack} from '~/lib/tiktok-pixel';

/**
 * Ad pixels loaded outside GTM — Snapchat (~/lib/snap-pixel) and TikTok
 * (~/lib/tiktok-pixel). Page views on every page (first load and client-side
 * navigations), once cookies are accepted. Mounted once in root.
 */
export function AdPixels() {
  const location = useLocation();
  const rootData = useRouteLoaderData('root') as any;

  // Signed-in customer's email for matching, when the root loader has it.
  useEffect(() => {
    const c = rootData?.customer;
    if (!c) return;
    Promise.resolve(c)
      .then((res: any) => {
        const email = res?.customer?.emailAddress?.emailAddress || res?.customer?.email;
        setSnapUserEmail(email);
        void tiktokIdentify(email);
      })
      .catch(() => {});
  }, [rootData?.customer]);

  useEffect(() => {
    snapTrack('PAGE_VIEW');
    tiktokPage();
  }, [location.pathname, location.search]);

  // Accepted after the page loaded: count this page now.
  useEffect(() => {
    const onAccept = () => {
      snapTrack('PAGE_VIEW');
      tiktokPage();
    };
    window.addEventListener(CONSENT_ACCEPTED_EVENT, onAccept);
    return () => window.removeEventListener(CONSENT_ACCEPTED_EVENT, onAccept);
  }, []);

  return null;
}

/** VIEW_CONTENT (Snap) / ViewContent (TikTok), once per product/variant shown. */
export function AdViewContent({product, variant}: {product: any; variant: any}) {
  const variantId = variant?.id || '';
  useEffect(() => {
    if (!product?.id) return;
    const id = numericId(variantId) || numericId(product.id);
    const price = Number(variant?.price?.amount || 0);
    const currency = variant?.price?.currencyCode || 'SAR';
    snapTrack('VIEW_CONTENT', {
      price,
      currency,
      item_ids: [id],
      item_category: product.productType || product.collections?.nodes?.[0]?.title,
    });
    tiktokTrack('ViewContent', {
      contents: [{content_id: id, content_type: 'product', content_name: product.title, price, quantity: 1}],
      value: price,
      currency,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, variantId]);
  return null;
}
