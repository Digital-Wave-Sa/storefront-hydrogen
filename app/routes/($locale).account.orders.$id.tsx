import { redirect, type LoaderFunctionArgs } from 'react-router';

export async function loader({ params, context }: LoaderFunctionArgs) {
  if (!params.id) {
    return redirect('/account/orders');
  }

  const locale = context.storefront.i18n.language.toLowerCase();
  const isEn = locale === 'en';
  const orderId = decodeURIComponent(params.id);

  // If it's already a plain order number (e.g. "1010"), redirect directly
  if (/^\d+$/.test(orderId)) {
    return redirect(isEn ? `/en/track-order/${orderId}` : `/track-order/${orderId}`);
  }

  // It's a GID (gid://shopify/Order/12345) — resolve to order number via Admin API
  try {
    const { getAdminToken } = await import('~/lib/shopify-admin.server');
    const adminToken = await getAdminToken(context.env);

    const query = `
      query GetOrderName($id: ID!) {
        order(id: $id) {
          orderNumber
        }
      }
    `;

    const res = await fetch(
      `https://${context.env.PUBLIC_STORE_DOMAIN}/admin/api/2023-10/graphql.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': adminToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, variables: { id: orderId } }),
      },
    );

    const json = (await res.json()) as any;
    const orderNumber = json?.data?.order?.orderNumber;

    if (orderNumber) {
      return redirect(
        isEn ? `/en/track-order/${orderNumber}` : `/track-order/${orderNumber}`,
      );
    }
  } catch (_) {
    // fallback below
  }

  return redirect(isEn ? `/en/account/orders` : `/account/orders`);
}

export default function OrderRedirect() {
  return null;
}
