/**
 * Who is asking?
 *
 * Personal-data endpoints (loyalty balance, wallet, redemption) must derive the
 * customer from the SESSION, never from a query parameter. Trusting a parameter
 * turned `?identifier=05XXXXXXXX` into an open lookup of any customer's name,
 * ERP account, tier and purchase history — and, on the redeem action, into a way
 * to spend someone else's points.
 *
 * Callers may still pass an identifier (the Header does), but it is only
 * honoured when it matches the signed-in customer.
 */

export type SessionIdentity = {
  customerId?: string;
  phone?: string;
  email?: string;
};

const digits = (v: unknown) => String(v ?? '').replace(/\D/g, '');
const lower = (v: unknown) => String(v ?? '').trim().toLowerCase();

/** Identity of the signed-in customer, from session keys written at login. */
export async function getSessionIdentity(context: any): Promise<SessionIdentity> {
  const session = context?.session;
  if (!session) return {};

  const phone =
    (await session.get('loginOtpPhone')) ||
    (await session.get('saadeddinPhone')) ||
    undefined;
  const email =
    (await session.get('loginCustomerEmail')) ||
    (await session.get('loginOtpEmail')) ||
    undefined;
  const customerId = (await session.get('loginCustomerId')) || undefined;

  return {customerId, phone, email};
}

export function hasIdentity(identity: SessionIdentity): boolean {
  return Boolean(identity.customerId || identity.phone || identity.email);
}

/**
 * True when a supplied identifier belongs to the signed-in customer.
 * Phones compare on their last 9 digits so +966 / 05 / 9665 spellings match.
 */
export function identifierMatchesSession(
  identity: SessionIdentity,
  supplied?: string | null,
): boolean {
  const value = String(supplied ?? '').trim();
  if (!value) return false;

  if (value.includes('@')) {
    return !!identity.email && lower(identity.email) === lower(value);
  }

  if (value.startsWith('gid://') || /^\d{11,}$/.test(value)) {
    const a = digits(identity.customerId);
    const b = digits(value);
    if (a && b && a === b) return true;
    // A long numeric string can also be a phone; fall through to that check.
  }

  const suppliedDigits = digits(value);
  const sessionDigits = digits(identity.phone);
  if (suppliedDigits.length >= 7 && sessionDigits.length >= 7) {
    return (
      suppliedDigits === sessionDigits ||
      sessionDigits.endsWith(suppliedDigits.slice(-9)) ||
      suppliedDigits.endsWith(sessionDigits.slice(-9))
    );
  }

  return false;
}

/**
 * Resolve the customer to act on: always the session's own identity.
 *
 * Falls back to the Storefront customer behind `customerAccessToken` — that
 * token is itself proof of identity, and a shopper signed in that way may have
 * none of the loginOtp* keys. Returns null when nobody is signed in, so the
 * route can answer 401.
 */
export async function resolveSelf(context: any): Promise<SessionIdentity | null> {
  const identity = await getSessionIdentity(context);
  if (hasIdentity(identity)) return identity;

  try {
    const sessionToken = await context?.session?.get('customerAccessToken');
    const token =
      typeof sessionToken === 'string' ? sessionToken : sessionToken?.accessToken;
    if (!token || token === 'dev-bypass-token' || !context?.storefront) {
      return null;
    }

    const {customer} = (await context.storefront.query(
      `#graphql
      query SessionIdentityCustomer($customerAccessToken: String!) {
        customer(customerAccessToken: $customerAccessToken) {
          id
          phone
          email
        }
      }
      `,
      {
        variables: {customerAccessToken: token},
        cache: context.storefront.CacheNone(),
      },
    )) as any;

    if (!customer) return null;

    const fromToken: SessionIdentity = {
      customerId: customer.id || undefined,
      phone: customer.phone || undefined,
      email: customer.email || undefined,
    };
    return hasIdentity(fromToken) ? fromToken : null;
  } catch {
    return null;
  }
}
