import type {LoaderFunctionArgs} from 'react-router';

/**
 * GET /api/address-types — the signed-in customer's address types
 * ({ "<numeric address id>": "apartment" | "house" | "office" }).
 *
 * Read from the session's own customer only; there is no id parameter, so
 * nobody can ask for someone else's. A guest gets an empty map. See
 * ~/lib/address-types for what the types are.
 *
 * Served on its own rather than added to every loader that lists addresses
 * (root, the account layout, the addresses page): one small request, made
 * once per page view by ~/lib/use-address-types, and nothing about the
 * address loaders changes.
 */
export async function loader({context}: LoaderFunctionArgs) {
  const headers = {'Cache-Control': 'private, no-store'};
  try {
    const {resolveLoggedInCustomer} = await import('~/lib/customer-email.server');
    const customer = await resolveLoggedInCustomer(context);
    if (!customer?.numericId) return Response.json({types: {}}, {headers});

    const {readAddressTypes} = await import('~/lib/address-types.server');
    const types = await readAddressTypes(context.env, customer.numericId);
    return Response.json({types}, {headers});
  } catch (e: any) {
    console.warn('[api.address-types]', e?.message || e);
    return Response.json({types: {}}, {headers});
  }
}
