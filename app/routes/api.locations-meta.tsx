import type {Route} from './+types/api.locations-meta';
import { getAdminToken } from '~/lib/shopify-admin.server';

/**
 * Server-side API route that fetches Location metafields via the Shopify Admin GraphQL API.
 * The Storefront API does NOT support metafields on Location objects,
 * so we proxy through the Admin API using the private access token.
 */
export async function loader({context}: Route.LoaderArgs) {
  const {env} = context;

  const shopDomain = env.PUBLIC_STORE_DOMAIN;

  if (!shopDomain) {
    return Response.json({locations: []}, {status: 200});
  }

  try {
    const adminToken = await getAdminToken(env);
    console.log('[DEBUG] Using Admin Token:', adminToken ? (adminToken.substring(0, 8) + '...') : 'NONE');
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

    const enriched = locations.map((loc: any) => {
      // Ensure the ID is just the numerical part for easier matching if needed, 
      // but keep the full GID as the primary identifier.
      const numericalId = loc.id.split('/').pop();
      
      return {
        id: loc.id,
        numericalId: numericalId,
        name: loc.name,
        address: loc.address,
        metafields: (loc.metafields?.nodes || []).map((m: any) => ({
          key: m.key,
          namespace: m.namespace,
          value: m.value,
        })),
        // Helper fields for common UI components
        hours_from: (loc.metafields?.nodes || []).find((m: any) => m.key === 'working_hours_from')?.value,
        hours_to: (loc.metafields?.nodes || []).find((m: any) => m.key === 'working_hours_to')?.value,
        delivery_time: (loc.metafields?.nodes || []).find((m: any) => m.key === 'delivery_time')?.value,
      };
    });

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
