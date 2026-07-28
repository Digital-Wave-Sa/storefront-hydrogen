import { redirect, type LoaderFunctionArgs } from 'react-router';

export async function loader({ params, context }: LoaderFunctionArgs) {
  if (!params.id) {
    return redirect('/account/orders');
  }

  const locale = context.storefront.i18n.language.toLowerCase();
  const isEn = locale === 'en';
  const rawId = decodeURIComponent(params.id);

  // 1. Short order number (e.g. "1010" or "#1010")
  const simpleNumMatch = rawId.match(/#?(\d{1,6})\b/);
  if (simpleNumMatch && !rawId.includes('shopify')) {
    const orderNum = simpleNumMatch[1];
    return redirect(isEn ? `/en/track-order/${orderNum}` : `/track-order/${orderNum}`);
  }

  // 2. Extract numeric ID (e.g. 7037127885033) from GID
  const digitsMatch = rawId.match(/(\d{7,})/);
  if (digitsMatch) {
    const numericId = digitsMatch[1];
    const fullGid = `gid://shopify/Order/${numericId}`;

    try {
      const { getAdminToken } = await import('~/lib/shopify-admin.server');
      const adminToken = await getAdminToken(context.env);

      const query = `
        query GetOrderName($id: ID!) {
          order(id: $id) {
            orderNumber
            name
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
          body: JSON.stringify({ query, variables: { id: fullGid } }),
        },
      );

      const json = (await res.json()) as any;
      const orderNumber =
        json?.data?.order?.orderNumber ||
        json?.data?.order?.name?.replace('#', '');

      if (orderNumber) {
        return redirect(
          isEn ? `/en/track-order/${orderNumber}` : `/track-order/${orderNumber}`,
        );
      }
    } catch (_) {
      // ignore
    }
  }

  return redirect(isEn ? `/en/account/orders` : `/account/orders`);
}

export default function OrderRedirect() {
  return null;
}
