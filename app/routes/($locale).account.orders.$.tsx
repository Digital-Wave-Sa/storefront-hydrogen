import { redirect, type LoaderFunctionArgs } from 'react-router';

export async function loader({ params, context }: LoaderFunctionArgs) {
  const locale = context.storefront.i18n.language.toLowerCase();
  const isEn = locale === 'en';
  const rawPath = params['*'] || '';

  // Decode URI component (e.g. gid%3A%2F%2Fshopify%2FOrder%2F12345 or gid:/shopify/Order/12345)
  const decoded = decodeURIComponent(rawPath);

  // 1. If it's a short order number (e.g. "1010" or "#1010" or "1010/")
  const simpleNumMatch = decoded.match(/#?(\d{1,6})\b/);
  if (simpleNumMatch && !decoded.includes('shopify')) {
    const orderNum = simpleNumMatch[1];
    return redirect(isEn ? `/en/track-order/${orderNum}` : `/track-order/${orderNum}`);
  }

  // 2. Extract numeric ID (e.g. 7037127885033) from GID or URL
  const digitsMatch = decoded.match(/(\d{7,})/);
  if (digitsMatch) {
    const numericId = digitsMatch[1];
    const fullGid = `gid://shopify/Order/${numericId}`;

    try {
      const { getAdminToken } = await import('~/lib/shopify-admin.server');
      const adminToken = await getAdminToken(context.env);

      // Query Admin API for the order number using full GID
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

  // 3. Fallback: query Admin API by full raw path in case it's a direct search term
  if (decoded) {
    try {
      const { getAdminToken } = await import('~/lib/shopify-admin.server');
      const adminToken = await getAdminToken(context.env);

      const query = `
        query SearchOrder($query: String!) {
          orders(first: 1, query: $query) {
            edges {
              node {
                name
                orderNumber
              }
            }
          }
        }
      `;

      const cleanQuery = decoded.replace(/[^\w#]/g, '');
      const res = await fetch(
        `https://${context.env.PUBLIC_STORE_DOMAIN}/admin/api/2023-10/graphql.json`,
        {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': adminToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query,
            variables: { query: `name:${cleanQuery} OR ${cleanQuery}` },
          }),
        },
      );

      const json = (await res.json()) as any;
      const node = json?.data?.orders?.edges?.[0]?.node;
      const orderNumber = node?.orderNumber || node?.name?.replace('#', '');

      if (orderNumber) {
        return redirect(
          isEn ? `/en/track-order/${orderNumber}` : `/track-order/${orderNumber}`,
        );
      }
    } catch (_) {
      // ignore
    }
  }

  // Fallback if not found: redirect to main orders page
  return redirect(isEn ? `/en/account/orders` : `/account/orders`);
}

export default function OrderSplatRedirect() {
  return null;
}
