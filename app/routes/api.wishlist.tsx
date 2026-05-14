import { data, type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router';
import { adminApiQuery } from '../lib/admin.server';

export async function action({ request, context }: ActionFunctionArgs) {
  const { env } = context;
  const rawShop = env.SHOPIFY_SHOP || env.PUBLIC_STORE_DOMAIN || 'the-beauty-secrets-ksa';
  let shopDomain = rawShop.includes('myshopify.com') ? rawShop : `${rawShop.split('.')[0]}.myshopify.com`;

  const potentialTokens = [
      (env as any).SHOPIFY_ADMIN_API_ACCESS_TOKENS,
      env.SHOPIFY_ADMIN_API_ACCESS_TOKEN,
      env.REVIEWS_ADMIN_API_TOKEN,
      env.PRIVATE_STOREFRONT_API_TOKEN
  ].filter(Boolean) as string[];

  const { customerId, wishlist } = await request.json();
  const mutation = `#graphql
    mutation customerUpdate($input: CustomerInput!) {
      customerUpdate(input: $input) {
        customer { id }
        userErrors { field message }
      }
    }
  `;

  // 1. Try static tokens first
  for (const token of potentialTokens) {
    try {
      const result = await adminApiQuery(shopDomain, token, mutation, {
        input: {
          id: customerId,
          metafields: [{ namespace: "custom", key: "wishlist", type: "json", value: JSON.stringify(wishlist) }],
        },
      });

      if (!result.errors && !result.data?.customerUpdate?.userErrors?.length) {
        return data(result);
      }
    } catch (e: any) {}
  }

  // 2. Try OAuth exchange as ultimate fallback
  const clientId = env.SHOPIFY_CLIENT_ID || env.SHOPIFY_ADMIN_CLIENT_ID;
  const clientSecret = env.SHOPIFY_CLIENT_SECRET || env.SHOPIFY_ADMIN_CLIENT_SECRET;

  if (clientId && clientSecret) {
    try {
      const authResponse = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials' }),
      });
      
      const authData = await authResponse.json();
      if (authData.access_token) {
        const result = await adminApiQuery(shopDomain, authData.access_token, mutation, {
          input: {
            id: customerId,
            metafields: [{ namespace: "custom", key: "wishlist", type: "json", value: JSON.stringify(wishlist) }],
          },
        });
        return data(result);
      }
    } catch (e: any) {}
  }

  return data({ error: 'Sync failed' }, { status: 401 });
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { env } = context;
  const url = new URL(request.url);
  const customerId = url.searchParams.get('customerId');
  if (!customerId) return data({ wishlist: [] });

  const rawShop = env.SHOPIFY_SHOP || env.PUBLIC_STORE_DOMAIN || 'the-beauty-secrets-ksa';
  let shopDomain = rawShop.includes('myshopify.com') ? rawShop : `${rawShop.split('.')[0]}.myshopify.com`;

  const query = `#graphql
    query getCustomerWishlist($id: ID!) {
      customer(id: $id) { metafield(namespace: "custom", key: "wishlist") { value } }
    }
  `;

  const potentialTokens = [
    (env as any).SHOPIFY_ADMIN_API_ACCESS_TOKENS,
    env.SHOPIFY_ADMIN_API_ACCESS_TOKEN,
    env.REVIEWS_ADMIN_API_TOKEN,
    env.PRIVATE_STOREFRONT_API_TOKEN
  ].filter(Boolean) as string[];

  for (const token of potentialTokens) {
    try {
      const result = await adminApiQuery(shopDomain, token, query, { id: customerId });
      if (!result.errors && result.data?.customer) {
        const wishlistData = result.data.customer.metafield?.value;
        return data({ wishlist: wishlistData ? JSON.parse(wishlistData) : [] });
      }
    } catch (e) {}
  }

  return data({ wishlist: [] });
}
