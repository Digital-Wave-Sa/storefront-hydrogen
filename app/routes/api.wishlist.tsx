import { data, type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router';
import { adminApiQuery } from '../lib/admin.server';
import { getAdminToken, getAdminDomain } from '../lib/shopify-admin.server';

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.env as any;
  const shopDomain = getAdminDomain(env);

  const { customerId, wishlist } = await request.json() as any;
  if (!customerId) {
    return data({ wishlist, note: 'Guest wishlist, not synced to Shopify' });
  }
  const mutation = `
    mutation customerUpdateWishlist($input: CustomerInput!) {
      customerUpdate(input: $input) {
        customer { id }
        userErrors { field message }
      }
    }
  `;

  try {
    const adminToken = await getAdminToken(env);
    if (!adminToken) {
      console.error('[WISHLIST SYNC ERROR] Could not retrieve Admin API token');
      return data({ error: 'Sync failed: No admin token' }, { status: 401 });
    }

    const result = await adminApiQuery(shopDomain, adminToken, mutation, {
      input: {
        id: customerId,
        metafields: [{ namespace: "custom", key: "wishlist", type: "json", value: JSON.stringify(wishlist) }],
      },
    }) as any;

    if (!result.errors && !result.data?.customerUpdate?.userErrors?.length) {
      return data(result);
    } else {
      const errors = result.errors || result.data?.customerUpdate?.userErrors;
      console.error('[WISHLIST SYNC ERROR] Wishlist Admin API error:', JSON.stringify(errors));
      return data({ error: 'Sync failed', details: errors }, { status: 400 });
    }
  } catch (e: any) {
    console.error('Wishlist sync exception:', e.message || e);
    return data({ error: e.message || 'Sync exception' }, { status: 500 });
  }
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.env as any;
  const url = new URL(request.url);
  const customerId = url.searchParams.get('customerId');
  if (!customerId) return data({ wishlist: [] });

  const shopDomain = getAdminDomain(env);

  const query = `
    query getCustomerWishlist($id: ID!) {
      customer(id: $id) { metafield(namespace: "custom", key: "wishlist") { value } }
    }
  `;

  try {
    const adminToken = await getAdminToken(env);
    if (adminToken) {
      const result = await adminApiQuery(shopDomain, adminToken, query, { id: customerId }) as any;
      if (!result.errors && result.data?.customer) {
        const wishlistData = result.data.customer.metafield?.value;
        return data({ wishlist: wishlistData ? JSON.parse(wishlistData) : [] });
      }
    }
  } catch (e: any) {
    console.error('[WISHLIST LOADER ERROR]:', e.message || e);
  }

  return data({ wishlist: [] });
}
