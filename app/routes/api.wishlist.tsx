import {
  data,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from 'react-router';
import {adminApiQuery} from '../lib/admin.server';
import {getAdminToken, getAdminDomain} from '../lib/shopify-admin.server';

export async function action({request, context}: ActionFunctionArgs) {
  const env = context.env as any;

  try {
    const body = await request.json().catch(() => ({}));
    const {customerId, wishlist} = body || {};
    if (!customerId) {
      return data({wishlist: wishlist || [], note: 'Guest wishlist saved locally'});
    }

    const shopDomain = getAdminDomain(env);
    const targetId = String(customerId);
    const formattedGid = targetId.startsWith('gid://')
      ? targetId
      : `gid://shopify/Customer/${targetId}`;

    const mutation = `
      mutation customerUpdateWishlist($input: CustomerInput!) {
        customerUpdate(input: $input) {
          customer { id }
          userErrors { field message }
        }
      }
    `;

    const adminToken = await getAdminToken(env).catch(() => null);
    if (!adminToken || !shopDomain) {
      console.warn('[WISHLIST SYNC] Admin token unavailable, saving wishlist locally.');
      return data({wishlist: wishlist || [], note: 'Wishlist saved locally'});
    }

    const result = (await adminApiQuery(shopDomain, adminToken, mutation, {
      input: {
        id: formattedGid,
        metafields: [
          {
            namespace: 'custom',
            key: 'wishlist',
            type: 'json',
            value: JSON.stringify(wishlist || []),
          },
        ],
      },
    }).catch((err) => {
      console.error('[WISHLIST SYNC ERROR] Admin API query failed:', err);
      return null;
    })) as any;

    if (result && !result.errors && !result.data?.customerUpdate?.userErrors?.length) {
      return data({status: 'ok', wishlist: wishlist || []});
    }

    return data({wishlist: wishlist || [], note: 'Saved locally'});
  } catch (e: any) {
    console.error('[WISHLIST ACTION SILENT ERROR]', e?.message || e);
    return data({wishlist: [], note: 'Fallback local save'});
  }
}

export async function loader({request, context}: LoaderFunctionArgs) {
  const env = context.env as any;
  const url = new URL(request.url);
  const customerId = url.searchParams.get('customerId');
  if (!customerId) return data({wishlist: []});

  try {
    const shopDomain = getAdminDomain(env);
    const adminToken = await getAdminToken(env).catch(() => null);
    if (adminToken && shopDomain) {
      const targetId = String(customerId);
      const formattedGid = targetId.startsWith('gid://')
        ? targetId
        : `gid://shopify/Customer/${targetId}`;

      const query = `
        query getCustomerWishlist($id: ID!) {
          customer(id: $id) {
            id
            metafield(namespace: "custom", key: "wishlist") { value }
          }
        }
      `;

      const result = (await adminApiQuery(shopDomain, adminToken, query, {
        id: formattedGid,
      }).catch(() => null)) as any;

      const wishlistData = result?.data?.customer?.metafield?.value;
      if (wishlistData) {
        try {
          return data({wishlist: JSON.parse(wishlistData)});
        } catch (e) {}
      }
    }
  } catch (e: any) {
    console.error('[WISHLIST LOADER SILENT ERROR]', e?.message || e);
  }

  return data({wishlist: []});
}
