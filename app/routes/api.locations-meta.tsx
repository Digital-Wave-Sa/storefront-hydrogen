import type {Route} from './+types/api.locations-meta';

/**
 * Server-side API route that fetches Location metafields via the Shopify Admin GraphQL API.
 * The Storefront API does NOT support metafields on Location objects,
 * so we proxy through the Admin API using the private access token.
 */
export async function loader({context}: Route.LoaderArgs) {
  const {env} = context;

  const shopDomain = env.PUBLIC_STORE_DOMAIN;
  const adminToken = env.PRIVATE_STOREFRONT_API_TOKEN;

  if (!shopDomain || !adminToken) {
    return Response.json({locations: []}, {status: 200});
  }

  try {
    // Use the GraphQL Admin API  
    const query = `{
      locations(first: 100) {
        nodes {
          id
          name
          address {
            address1
            address2
            city
            country
            latitude
            longitude
            phone
          }
          metafields(first: 50) {
            nodes {
              key
              namespace
              value
            }
          }
        }
      }
    }`;

    const res = await fetch(
      `https://${shopDomain}/admin/api/2024-10/graphql.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': adminToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      }
    );

    if (!res.ok) {
      console.error('Admin GraphQL API fetch failed:', res.status, await res.text().catch(() => ''));
      return Response.json({locations: []}, {status: 200});
    }

    const json = await res.json();
    
    if (json.errors) {
      return Response.json({error: json.errors, locations: []}, {status: 200});
    }

    const locations = json?.data?.locations?.nodes || [];

    // Flatten metafields for easier consumption
    const enriched = locations.map((loc: any) => ({
      id: loc.id,
      name: loc.name,
      address: loc.address,
      metafields: (loc.metafields?.nodes || []).map((m: any) => ({
        key: m.key,
        namespace: m.namespace,
        value: m.value,
      })),
    }));

    return Response.json(
      {locations: enriched},
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
        },
      }
    );
  } catch (error) {
    return Response.json({locations: []}, {status: 200});
  }
}
