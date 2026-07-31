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

  const targetId = String(customerId);
  const formattedGid = targetId.startsWith('gid://') ? targetId : `gid://shopify/Customer/${targetId}`;

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
        id: formattedGid,
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

  try {
    const adminToken = await getAdminToken(env);
    if (adminToken) {
      const targetId = String(customerId);
      const formattedGid = targetId.startsWith('gid://') ? targetId : `gid://shopify/Customer/${targetId}`;

      const query = `
        query getCustomerWishlist($id: ID!) {
          customer(id: $id) {
            id
            email
            phone
            metafield(namespace: "custom", key: "wishlist") { value }
          }
        }
      `;

      let result = await adminApiQuery(shopDomain, adminToken, query, { id: formattedGid }) as any;
      let wishlistData = result?.data?.customer?.metafield?.value;

      // Fallback: If active session customer has empty wishlist, search by email/phone for original profile wishlist
      if ((!wishlistData || wishlistData === '[]') && result?.data?.customer) {
        const email = result.data.customer.email;
        const phone = result.data.customer.phone;
        let searchQuery = '';
        if (email && !email.endsWith('@saadeddin.placeholder')) {
          searchQuery = `email:"${encodeURIComponent(email)}"`;
        } else if (phone) {
          const raw = phone.replace(/\D/g, '').slice(-9);
          searchQuery = `${raw}`;
        }

        if (searchQuery) {
          const searchGql = `
            query findOriginalWishlist($query: String!) {
              customers(first: 5, query: $query) {
                nodes {
                  id
                  email
                  metafield(namespace: "custom", key: "wishlist") { value }
                }
              }
            }
          `;
          const searchRes = await adminApiQuery(shopDomain, adminToken, searchGql, { query: searchQuery }) as any;
          const candidates = searchRes?.data?.customers?.nodes || [];
          for (const cand of candidates) {
            if (cand.metafield?.value && cand.metafield.value !== '[]') {
              wishlistData = cand.metafield.value;
              break;
            }
          }
        }
      }

      if (wishlistData) {
        try {
          return data({ wishlist: JSON.parse(wishlistData) });
        } catch (_) {}
      }
    }
  } catch (e: any) {
    console.error('[WISHLIST LOADER ERROR]:', e.message || e);
  }

  return data({ wishlist: [] });
}
