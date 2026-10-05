import {useEffect} from 'react';
import {useLocation, useRouteLoaderData} from 'react-router';
import {
  CONSENT_ACCEPTED_EVENT,
  numericId,
  setSnapUserEmail,
  snapTrack,
} from '~/lib/snap-pixel';

/**
 * Snap PAGE_VIEW on every page (first load and client-side navigations), once
 * cookies are accepted. Mounted once in root. See ~/lib/snap-pixel.
 */
export function SnapPixel() {
  const location = useLocation();
  const rootData = useRouteLoaderData('root') as any;

  // Signed-in customer's email for matching, when the root loader has it.
  useEffect(() => {
    const c = rootData?.customer;
    if (!c) return;
    Promise.resolve(c)
      .then((res: any) => setSnapUserEmail(res?.customer?.emailAddress?.emailAddress || res?.customer?.email))
      .catch(() => {});
  }, [rootData?.customer]);

  useEffect(() => {
    snapTrack('PAGE_VIEW');
  }, [location.pathname, location.search]);

  // Accepted after the page loaded: count this page now.
  useEffect(() => {
    const onAccept = () => snapTrack('PAGE_VIEW');
    window.addEventListener(CONSENT_ACCEPTED_EVENT, onAccept);
    return () => window.removeEventListener(CONSENT_ACCEPTED_EVENT, onAccept);
  }, []);

  return null;
}

/** Snap VIEW_CONTENT for the product page, once per product/variant shown. */
export function SnapViewContent({
  product,
  variant,
}: {
  product: any;
  variant: any;
}) {
  const variantId = variant?.id || '';
  useEffect(() => {
    if (!product?.id) return;
    snapTrack('VIEW_CONTENT', {
      price: Number(variant?.price?.amount || 0),
      currency: variant?.price?.currencyCode || 'SAR',
      item_ids: [numericId(variantId) || numericId(product.id)],
      item_category: product.productType || product.collections?.nodes?.[0]?.title,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, variantId]);
  return null;
}
