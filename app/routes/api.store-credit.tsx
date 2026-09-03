import {
  data,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from 'react-router';
import {resolveSelf} from '~/lib/session-identity.server';

/**
 * Store credit, read and redeemed on the server.
 *
 * GET  /api/store-credit          -> the signed-in customer's balance
 * POST /api/store-credit {code}   -> redeem a gift-card code onto that customer
 *
 * Both used to run from the browser. StoreCreditBalance and GiftCardActivation
 * each held their own `https://sdgc.saadeddin.top` constant and called it
 * directly, sending the Shopify customer gid in a query string or a JSON body
 * with no credential of any kind attached. A customer gid is not a secret — it
 * is in every admin URL and the ids are adjacent — so the only thing standing
 * between a stranger and someone else's balance was whatever that service
 * chooses to enforce.
 *
 * Here the id comes from the session and never from the request, so a caller
 * can only ever ask about themselves, and the host comes from
 * STORE_CREDIT_API_URL so it moves in one place — the same variable
 * account-wallet.server.ts already reads.
 */

function storeCreditBase(context: any): string {
  return context?.env?.STORE_CREDIT_API_URL || 'https://sdgc.saadeddin.top';
}

/** The store-credit service is keyed by gid; sessions carry both shapes. */
function toCustomerGid(id?: string | null): string | null {
  const raw = String(id || '').trim();
  if (!raw) return null;
  if (raw.startsWith('gid://')) return raw;
  if (/^\d+$/.test(raw)) return `gid://shopify/Customer/${raw}`;
  return null;
}

export async function loader({context}: LoaderFunctionArgs) {
  const self = await resolveSelf(context);
  if (!self) {
    return data(
      {success: false, balance: null, error: 'Not signed in'},
      {status: 401},
    );
  }

  const customerGid = toCustomerGid(self.customerId);
  if (!customerGid) {
    return data(
      {success: false, balance: null, error: 'balance-unavailable'},
      {status: 503},
    );
  }

  try {
    const res = await fetch(
      `${storeCreditBase(context)}/api/storefront/gift-card?customerId=${encodeURIComponent(
        customerGid,
      )}`,
    );

    if (!res.ok) {
      console.warn(
        `[StoreCredit] Lookup returned ${res.status} for ${customerGid}`,
      );
      return data(
        {success: false, balance: null, error: 'balance-unavailable'},
        {status: 503},
      );
    }

    const body = (await res.json()) as any;
    const value = parseFloat(body?.balance);

    /**
     * A balance that could not be established is reported as a failure, not as
     * zero — the caller renders "unavailable" rather than telling the customer
     * their wallet is empty because a lookup timed out.
     */
    if (!body?.success || !Number.isFinite(value)) {
      return data(
        {success: false, balance: null, error: 'balance-unavailable'},
        {status: 503},
      );
    }

    return data({success: true, balance: value, currency: 'SAR'});
  } catch (err) {
    console.error('[StoreCredit] Lookup failed:', err);
    return data(
      {success: false, balance: null, error: 'balance-unavailable'},
      {status: 503},
    );
  }
}

export async function action({request, context}: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return data({success: false, error: 'Method not allowed'}, {status: 405});
  }

  const self = await resolveSelf(context);
  if (!self) {
    return data({success: false, error: 'Not signed in'}, {status: 401});
  }

  const customerGid = toCustomerGid(self.customerId);
  if (!customerGid) {
    return data(
      {success: false, error: 'Your account is not ready for redemption yet.'},
      {status: 503},
    );
  }

  let code = '';
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const body = (await request.json().catch(() => null)) as any;
    code = String(body?.code || '').trim();
  } else {
    const form = await request.formData().catch(() => null);
    code = String(form?.get('code') || '').trim();
  }

  if (!code) {
    return data({success: false, error: 'Missing gift card code.'}, {status: 400});
  }

  try {
    const res = await fetch(`${storeCreditBase(context)}/api/storefront/gift-card`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      // customerId comes from the session, never from the caller.
      body: JSON.stringify({code, customerId: customerGid}),
    });

    const body = (await res.json().catch(() => null)) as any;

    if (!res.ok || !body?.success) {
      console.warn(
        `[StoreCredit] Redemption refused (${res.status}) for ${customerGid}`,
      );
      return data(
        {
          success: false,
          // The service's own wording for a bad code is meant for the customer;
          // anything longer than that is ours, not theirs.
          error:
            typeof body?.error === 'string' && body.error.length <= 200
              ? body.error
              : null,
        },
        {status: 400},
      );
    }

    const newBalance = parseFloat(body?.newBalance);
    return data({
      success: true,
      message: typeof body?.message === 'string' ? body.message : null,
      newBalance: Number.isFinite(newBalance) ? newBalance : null,
      currency: 'SAR',
    });
  } catch (err) {
    console.error('[StoreCredit] Redemption failed:', err);
    return data(
      {success: false, error: null},
      {status: 503},
    );
  }
}
