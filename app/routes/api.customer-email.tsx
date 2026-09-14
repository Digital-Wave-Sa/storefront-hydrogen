import {type ActionFunctionArgs, type LoaderFunctionArgs} from 'react-router';
import {
  resolveLoggedInCustomer,
  saveCustomerEmail,
} from '~/lib/customer-email.server';

/**
 * POST /api/customer-email  { email }
 *
 * Saves a real email onto the signed-in customer. Used by the custom-cake
 * builder's inline "add your email" step so the shopper never leaves the
 * builder (and never loses the cake they designed). Returns JSON.
 *
 * Response shapes:
 *   { success: true }
 *   { error: 'not_logged_in' | 'invalid_format' | 'in_use' | 'server' }
 */

export async function loader({}: LoaderFunctionArgs) {
  return Response.json({error: 'Use POST method'}, {status: 405});
}

export async function action({request, context}: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return Response.json({error: 'method_not_allowed'}, {status: 405});
  }

  const customer = await resolveLoggedInCustomer(context);
  if (!customer) {
    return Response.json({error: 'not_logged_in'}, {status: 401});
  }

  let email = '';
  try {
    const body = (await request.json()) as any;
    email = String(body?.email || '');
  } catch {
    return Response.json({error: 'invalid_format'}, {status: 400});
  }

  const result = await saveCustomerEmail(context, customer.numericId, email);

  if (!result.ok) {
    const status = result.code === 'in_use' ? 409 : result.code === 'server' ? 500 : 400;
    return Response.json({error: result.code}, {status});
  }

  return Response.json(
    {success: true, email: result.email},
    {headers: {'Set-Cookie': await context.session.commit()}},
  );
}
