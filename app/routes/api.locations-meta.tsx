import type {Route} from './+types/api.locations-meta';
import {getAdminToken, getAdminDomain} from '~/lib/shopify-admin.server';

/**
 * Server-side API route that fetches Location metafields via the Shopify Admin GraphQL API.
 * The Storefront API does NOT support metafields on Location objects,
 * so we proxy through the Admin API using the private access token.
 */
export async function loader({context}: Route.LoaderArgs) {
  const {env} = context;

  const shopDomain = getAdminDomain(env);

  if (!shopDomain) {
    return Response.json({locations: []}, {status: 200});
  }

  try {
    const adminToken = await getAdminToken(env);
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
        body: JSON.stringify({query}),
      },
    );

    if (!res.ok) {
      console.error(
        'Admin GraphQL API fetch failed:',
        res.status,
        await res.text().catch(() => ''),
      );
      return Response.json({locations: []}, {status: 200});
    }

    const json = (await res.json()) as any;

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
        latitude: parseFloat(
          (loc.metafields?.nodes || []).find(
            (m: any) =>
              m.key === 'latitude' ||
              m.key === 'lat' ||
              m.key === 'location_latitude',
          )?.value ||
            loc.address?.latitude ||
            '0',
        ),
        longitude: parseFloat(
          (loc.metafields?.nodes || []).find(
            (m: any) =>
              m.key === 'longitude' ||
              m.key === 'lng' ||
              m.key === 'lon' ||
              m.key === 'location_longitude',
          )?.value ||
            loc.address?.longitude ||
            '0',
        ),
        // Helper fields for common UI components
        name_in_arabic: (loc.metafields?.nodes || []).find(
          (m: any) => m.key === 'name_in_arabic',
        )?.value,
        hours_from: (loc.metafields?.nodes || []).find(
          (m: any) => m.key === 'working_hours_from',
        )?.value,
        hours_to: (loc.metafields?.nodes || []).find(
          (m: any) => m.key === 'working_hours_to',
        )?.value,
        hours_from_shift2: (loc.metafields?.nodes || []).find(
          (m: any) => m.key === 'working_hours_from_shift2',
        )?.value,
        hours_to_shift2: (loc.metafields?.nodes || []).find(
          (m: any) => m.key === 'working_hours_to_shift2',
        )?.value,
        working_days: (loc.metafields?.nodes || []).find(
          (m: any) => m.key === 'working_days',
        )?.value,
        friday_hours_from: (loc.metafields?.nodes || []).find(
          (m: any) => m.key === 'friday_working_hours_from',
        )?.value,
        friday_hours_to: (loc.metafields?.nodes || []).find(
          (m: any) => m.key === 'friday_working_hours_to',
        )?.value,
        saturday_hours_from: (loc.metafields?.nodes || []).find(
          (m: any) => m.key === 'saturday_working_hours_from',
        )?.value,
        saturday_hours_to: (loc.metafields?.nodes || []).find(
          (m: any) => m.key === 'saturday_working_hours_to',
        )?.value,
        sunday_hours_from: (loc.metafields?.nodes || []).find(
          (m: any) => m.key === 'sunday_working_hours_from',
        )?.value,
        sunday_hours_to: (loc.metafields?.nodes || []).find(
          (m: any) => m.key === 'sunday_working_hours_to',
        )?.value,
        monday_hours_from: (loc.metafields?.nodes || []).find(
          (m: any) => m.key === 'monday_working_hours_from',
        )?.value,
        monday_hours_to: (loc.metafields?.nodes || []).find(
          (m: any) => m.key === 'monday_working_hours_to',
        )?.value,
        tuesday_hours_from: (loc.metafields?.nodes || []).find(
          (m: any) => m.key === 'tuesday_working_hours_from',
        )?.value,
        tuesday_hours_to: (loc.metafields?.nodes || []).find(
          (m: any) => m.key === 'tuesday_working_hours_to',
        )?.value,
        wednesday_hours_from: (loc.metafields?.nodes || []).find(
          (m: any) => m.key === 'wednesday_working_hours_from',
        )?.value,
        wednesday_hours_to: (loc.metafields?.nodes || []).find(
          (m: any) => m.key === 'wednesday_working_hours_to',
        )?.value,
        thursday_hours_from: (loc.metafields?.nodes || []).find(
          (m: any) => m.key === 'thursday_working_hours_from',
        )?.value,
        thursday_hours_to: (loc.metafields?.nodes || []).find(
          (m: any) => m.key === 'thursday_working_hours_to',
        )?.value,

        // Delivery Rules
        delivery_available:
          (loc.metafields?.nodes || []).find(
            (m: any) => m.key === 'delivery_available',
          )?.value === 'true',
        delivery_fee: parseFloat(
          (loc.metafields?.nodes || []).find(
            (m: any) => m.key === 'delivery_fee',
          )?.value || '0',
        ),
        per_km_rate: parseFloat(
          (loc.metafields?.nodes || []).find(
            (m: any) => m.key === 'per_km_rate',
          )?.value || '0',
        ),
        free_delivery_threshold: parseFloat(
          (loc.metafields?.nodes || []).find(
            (m: any) => m.key === 'free_delivery_threshold',
          )?.value || '0',
        ),
        minimum_order_value: parseFloat(
          (loc.metafields?.nodes || []).find(
            (m: any) => m.key === 'minimum_order_value',
          )?.value || '0',
        ),
        delivery_time_from: (loc.metafields?.nodes || []).find(
          (m: any) => m.key === 'delivery_time_from',
        )?.value,
        delivery_time_to: (loc.metafields?.nodes || []).find(
          (m: any) => m.key === 'delivery_time_to',
        )?.value,
        coverage_areas: (loc.metafields?.nodes || []).find(
          (m: any) => m.key === 'coverage_areas',
        )?.value,

        // ERP Mapping
        branch_id: (loc.metafields?.nodes || []).find(
          (m: any) => m.key === 'branch_id',
        )?.value,
        ax_store_id: (loc.metafields?.nodes || []).find(
          (m: any) => m.key === 'ax_store_id',
        )?.value,
        ax_branch_name: (loc.metafields?.nodes || []).find(
          (m: any) => m.key === 'ax_branch_name',
        )?.value,

        // Visibility toggle
        hide_from_storefront:
          (loc.metafields?.nodes || []).find(
            (m: any) => m.key === 'hide_from_storefront',
          )?.value === 'true',
      };
    });

    return Response.json(
      {locations: enriched},
      {
        status: 200,
        headers: {
          'Cache-Control':
            'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      },
    );
  } catch (error) {
    return Response.json({locations: []}, {status: 200});
  }
}
