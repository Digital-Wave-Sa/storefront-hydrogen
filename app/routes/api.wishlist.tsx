import { data, type ActionFunctionArgs, type LoaderFunctionArgs } from 'react-router';

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.env as any;
  const SHOP_HANDLE = (env.SHOPIFY_SHOP || 'the-beauty-secrets-ksa').replace('.myshopify.com', '');
  const ADMIN_API_URL = `https://${SHOP_HANDLE}.myshopify.com/admin/api/2024-07/graphql.json`;
  const ADMIN_TOKEN = env.SHOPIFY_ADMIN_API_ACCESS_TOKENS || env.SHOPIFY_ADMIN_API_ACCESS_TOKEN;

  if (request.method !== 'POST') {
    return data({ error: 'Method not allowed' }, { status: 405 });
  }

  const { customerId, wishlist } = await request.json();

  if (!customerId || !wishlist) {
    return data({ error: 'Missing required fields' }, { status: 400 });
  }

  const query = `#graphql
    mutation customerUpdate($input: CustomerInput!) {
      customerUpdate(input: $input) {
        customer {
          id
          metafield(namespace: "custom", key: "wishlist") {
            value
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  try {
    const response = await fetch(ADMIN_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': ADMIN_TOKEN || '',
      },
      body: JSON.stringify({
        query,
        variables: {
          input: {
            id: customerId,
            metafields: [
              {
                namespace: "custom",
                key: "wishlist",
                type: "json",
                value: JSON.stringify(wishlist),
              },
            ],
          },
        },
      }),
    });

    const result = await response.json();
    
    if (result.errors || result.data?.customerUpdate?.userErrors?.length > 0) {
      console.error('[WISHLIST] Shopify sync error:', result.errors || result.data.customerUpdate.userErrors);
    }
    
    return data(result);
  } catch (error) {
    return data({ error: 'Failed to update wishlist' }, { status: 500 });
  }
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.env as any;
  const url = new URL(request.url);
  const customerId = url.searchParams.get('customerId');
  const SHOP_HANDLE = (env.SHOPIFY_SHOP || 'the-beauty-secrets-ksa').replace('.myshopify.com', '');
  const ADMIN_API_URL = `https://${SHOP_HANDLE}.myshopify.com/admin/api/2024-07/graphql.json`;
  const ADMIN_TOKEN = env.SHOPIFY_ADMIN_API_ACCESS_TOKENS || env.SHOPIFY_ADMIN_API_ACCESS_TOKEN;

  if (!customerId) {
    return data({ error: 'Missing customerId' }, { status: 400 });
  }

  const query = `#graphql
    query getCustomerWishlist($id: ID!) {
      customer(id: $id) {
        metafield(namespace: "custom", key: "wishlist") {
          value
        }
      }
    }
  `;

  try {
    const response = await fetch(ADMIN_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': ADMIN_TOKEN || '',
      },
      body: JSON.stringify({
        query,
        variables: { id: customerId },
      }),
    });

    const result = await response.json();
    const wishlistData = result.data?.customer?.metafield?.value;
    return data({ wishlist: wishlistData ? JSON.parse(wishlistData) : [] });
  } catch (error) {
    return data({ error: 'Failed to fetch wishlist' }, { status: 500 });
  }
}
