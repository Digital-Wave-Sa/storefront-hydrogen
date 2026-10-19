import {
  data,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from 'react-router';
import {adminApiQuery} from '../lib/admin.server';
import {getAdminToken, getAdminDomain} from '../lib/shopify-admin.server';
import {resolveNumericCustomerId} from '../lib/session-identity.server';

/**
 * The signed-in customer's wishlist (customer metafield custom.wishlist).
 *
 * Whose wishlist is decided here, never by the caller. It used to take
 * `customerId` from the query string / body, so anyone could read or overwrite
 * any customer's wishlist with the Admin token. Now:
 *
 *   1. The website: the customer behind this session (resolveNumericCustomerId).
 *   2. Other clients without our session cookie (the mobile app): a Storefront
 *      customer access token in `Authorization: Bearer <token>`, verified with
 *      the Storefront API.
 *
 * A `customerId` the caller still sends is ignored. No identity: reads return
 * an empty list with 401, writes are not stored (guests keep theirs in the
 * browser, as before).
 */
const MAX_ITEMS = 200;
const MAX_BYTES = 60_000;

async function customerFromBearer(
  request: Request,
  context: any,
): Promise<string | null> {
  const header = request.headers.get('Authorization') || '';
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  const token = match?.[1]?.trim();
  if (!token || token.startsWith('session-') || !context?.storefront) return null;
  try {
    const {customer} = (await context.storefront.query(
      `#graphql
      query WishlistBearerCustomer($customerAccessToken: String!) {
        customer(customerAccessToken: $customerAccessToken) {
          id
        }
      }
      `,
      {
        variables: {customerAccessToken: token},
        cache: context.storefront.CacheNone(),
      },
    )) as any;
    const id = String(customer?.id ?? '').split('/').pop()?.trim();
    return id && /^\d+$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

async function resolveWishlistOwner(
  request: Request,
  context: any,
): Promise<string | null> {
  return (
    (await resolveNumericCustomerId(context).catch(() => null)) ||
    (await customerFromBearer(request, context))
  );
}

export async function action({request, context}: ActionFunctionArgs) {
  const env = context.env as any;

  try {
    const body = (await request.json().catch(() => ({}))) as any;
    const raw = body?.wishlist;
    const wishlist = Array.isArray(raw) ? raw.slice(0, MAX_ITEMS) : [];

    const ownerId = await resolveWishlistOwner(request, context);
    if (!ownerId) {
      return data(
        {wishlist, note: 'Not signed in: wishlist kept on this device only'},
        {status: 401},
      );
    }

    const value = JSON.stringify(wishlist);
    if (value.length > MAX_BYTES) {
      return data({error: 'Wishlist too large'}, {status: 413});
    }

    const shopDomain = getAdminDomain(env);
    const adminToken = await getAdminToken(env).catch(() => null);
    if (!adminToken || !shopDomain) {
      console.warn('[WISHLIST SYNC] Admin token unavailable, saving wishlist locally.');
      return data({wishlist, note: 'Wishlist saved locally'});
    }

    const mutation = `
      mutation customerUpdateWishlist($input: CustomerInput!) {
        customerUpdate(input: $input) {
          customer { id }
          userErrors { field message }
        }
      }
    `;

    const result = (await adminApiQuery(shopDomain, adminToken, mutation, {
      input: {
        id: `gid://shopify/Customer/${ownerId}`,
        metafields: [
          {
            namespace: 'custom',
            key: 'wishlist',
            type: 'json',
            value,
          },
        ],
      },
    }).catch((err) => {
      console.error('[WISHLIST SYNC ERROR] Admin API query failed:', err);
      return null;
    })) as any;

    if (result && !result.errors && !result.data?.customerUpdate?.userErrors?.length) {
      return data({status: 'ok', wishlist});
    }

    return data({wishlist, note: 'Saved locally'});
  } catch (e: any) {
    console.error('[WISHLIST ACTION SILENT ERROR]', e?.message || e);
    return data({wishlist: [], note: 'Fallback local save'});
  }
}

export async function loader({request, context}: LoaderFunctionArgs) {
  const env = context.env as any;

  const ownerId = await resolveWishlistOwner(request, context);
  if (!ownerId) return data({wishlist: []}, {status: 401});

  try {
    const shopDomain = getAdminDomain(env);
    const adminToken = await getAdminToken(env).catch(() => null);
    if (adminToken && shopDomain) {
      const query = `
        query getCustomerWishlist($id: ID!) {
          customer(id: $id) {
            id
            metafield(namespace: "custom", key: "wishlist") { value }
          }
        }
      `;

      const result = (await adminApiQuery(shopDomain, adminToken, query, {
        id: `gid://shopify/Customer/${ownerId}`,
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
