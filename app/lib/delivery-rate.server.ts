import {getAdminToken, getAdminDomain} from '~/lib/shopify-admin.server';
import {
  DELIVERY_IS_TAXED,
  STANDARD_DELIVERY_FEE,
  STANDARD_FREE_DELIVERY_THRESHOLD,
} from '~/lib/delivery-defaults';

/**
 * The standard delivery rate, read from Shopify instead of hardcoded.
 *
 * The pre-quote fee and the free-delivery threshold used to be two constants
 * (25 and 320) that had to be edited by hand whenever the shop's Domestic
 * قياسي rate changed in admin. This reads them from the source: the default
 * Delivery Profile's zone rates.
 *
 * A Shopify "free shipping over X" rule is modelled as a SECOND rate on the
 * same zone — a 0.00 rate carrying a `TOTAL_PRICE >= X` condition — so the two
 * numbers come from two method definitions:
 *   • the paid rate (price > 0, no threshold condition)  → the fee
 *   • the free rate (price = 0, TOTAL_PRICE condition)    → the free threshold
 *
 * The exported constants remain as a LAST-RESORT fallback only: if the Admin
 * API is unreachable the cart must still show a fee rather than break, and the
 * constant holds the same value the shop is configured with. It is never the
 * business number while Shopify is answering.
 *
 * Cached in module memory for 5 minutes, the same shape as `api.locations-meta`,
 * so the Admin call runs at most once per five minutes per server instance
 * rather than on every page load.
 */

export type StandardDeliveryRate = {
  /** The paid standard fee, in SAR. */
  fee: number;
  /** Order total at or above which delivery is free, or null if no such rule. */
  freeThreshold: number | null;
  /**
   * Whether `fee` and `freeThreshold` were actually read from Shopify. False
   * means the read failed and they are fallbacks — so `freeThreshold: null`
   * with `live: false` is "we could not find out", while `freeThreshold: null`
   * with `live: true` is "Shopify has no free-delivery rate". The product page
   * needs the difference: the first still shows the free-delivery line, the
   * second must not promise one.
   */
  live: boolean;
  /**
   * Whether the delivery fee carries VAT — Shopify's "Charge tax on shipping
   * rates". The cart needs it to show the same VAT figure checkout will.
   */
  taxShipping: boolean;
};

let cache: {timestamp: number; rate: StandardDeliveryRate} | null = null;
const TTL_MS = 5 * 60 * 1000;

const FALLBACK: StandardDeliveryRate = {
  fee: STANDARD_DELIVERY_FEE,
  freeThreshold: STANDARD_FREE_DELIVERY_THRESHOLD,
  live: false,
  taxShipping: DELIVERY_IS_TAXED,
};

const DELIVERY_PROFILE_QUERY = `
  query StandardDeliveryRate {
    deliveryProfiles(first: 10) {
      nodes {
        default
        profileLocationGroups {
          locationGroupZones(first: 50) {
            nodes {
              zone { name }
              methodDefinitions(first: 50) {
                nodes {
                  active
                  rateProvider {
                    __typename
                    ... on DeliveryRateDefinition {
                      price { amount }
                    }
                  }
                  methodConditions {
                    field
                    operator
                    conditionCriteria {
                      __typename
                      ... on MoneyV2 { amount }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

/**
 * A SEPARATE request, on purpose.
 *
 * `taxShipping` used to be the first field of the rates query above. It is a
 * non-null Boolean on a non-null `shop`, so if Shopify refuses it (a missing
 * scope, an API change) GraphQL null-propagation can blank the ENTIRE
 * response — rates included — and the rates silently fell back: the product
 * page printed a stale 320 while Shopify's rate was 299. Two requests, run in
 * parallel, mean one can fail without taking the other with it.
 */
const TAX_SHIPPING_QUERY = `
  query ShopTaxShipping {
    shop { taxShipping }
  }
`;

/**
 * One Admin GraphQL call that SAYS why it failed.
 *
 * The old code checked only `res.ok`. GraphQL errors arrive with HTTP 200, so
 * a refused field or a missing scope produced no log at all — the fallback
 * just took over, and a permanently broken lookup looked exactly like a
 * working one. Returns `data`, or null when there is none to use.
 */
async function adminGraphql(
  domain: string,
  token: string,
  query: string,
  label: string,
): Promise<any | null> {
  const res = await fetch(`https://${domain}/admin/api/2024-04/graphql.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({query}),
    signal: AbortSignal.timeout(4000),
  }).catch((e: any) => {
    console.error(`[delivery-rate] ${label}: request failed:`, e?.message || e);
    return null;
  });
  if (!res) return null;
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`[delivery-rate] ${label}: HTTP ${res.status}`, body.slice(0, 300));
    return null;
  }
  const json = (await res.json().catch(() => null)) as any;
  if (json?.errors?.length) {
    console.error(
      `[delivery-rate] ${label}: Shopify returned errors:`,
      JSON.stringify(json.errors).slice(0, 500),
    );
  }
  return json?.data ?? null;
}

export async function getStandardDeliveryRate(env: any): Promise<StandardDeliveryRate> {
  const now = Date.now();
  if (cache && now - cache.timestamp < TTL_MS) return cache.rate;

  const domain = getAdminDomain(env);
  if (!domain) {
    console.error('[delivery-rate] No Admin domain configured; using fallbacks.');
    return cache?.rate ?? FALLBACK;
  }

  try {
    const token = await getAdminToken(env);
    if (!token) {
      console.error('[delivery-rate] No Admin token; using fallbacks.');
      return cache?.rate ?? FALLBACK;
    }

    const [rateData, taxData] = await Promise.all([
      adminGraphql(domain, token, DELIVERY_PROFILE_QUERY, 'rates'),
      adminGraphql(domain, token, TAX_SHIPPING_QUERY, 'taxShipping'),
    ]);

    /**
     * Only a real boolean from Shopify counts. Otherwise keep the last value
     * Shopify gave, and only then the configured fallback — never silently
     * "not taxed".
     */
    const taxShipping =
      typeof taxData?.shop?.taxShipping === 'boolean'
        ? taxData.shop.taxShipping
        : cache?.rate.taxShipping ?? DELIVERY_IS_TAXED;

    const profiles: any[] | undefined = rateData?.deliveryProfiles?.nodes;
    if (!Array.isArray(profiles)) {
      /**
       * The rates could not be read. This is NOT cached: caching it is how a
       * single bad response used to stand in for the real rate for five
       * minutes. Serve the last good read if there is one, else the fallback,
       * and try Shopify again on the next request.
       */
      return cache ? {...cache.rate, taxShipping} : {...FALLBACK, taxShipping};
    }
    const profile: any = profiles.find((p: any) => p?.default) || profiles[0];

    let fee: number | null = null;
    let freeThreshold: number | null = null;

    for (const group of profile?.profileLocationGroups || []) {
      for (const zone of group?.locationGroupZones?.nodes || []) {
        for (const method of zone?.methodDefinitions?.nodes || []) {
          if (!method?.active) continue;
          const price = parseFloat(method?.rateProvider?.price?.amount ?? '');
          if (!Number.isFinite(price)) continue;

          const totalPriceCondition = (method.methodConditions || []).find(
            (c: any) => c?.field === 'TOTAL_PRICE',
          );

          /*
            The paid standard rate: the first active rate with a real price.
            Kept as the first one found so an added express rate later cannot
            displace it.

            This used to also require `!totalPriceCondition`, on the assumption
            that the paid rate carries no threshold and only the free rate
            does. That is not how this shop is configured. Its قياسي rate is:

                Standard Delivery  19.00  TOTAL_PRICE >= 0.00 AND <= 298.90
                Free Delivery       0.00  TOTAL_PRICE >= 299.00

            (The amounts are whatever admin says today — they were 320 when
            this was written; the SHAPE is the point.)

            — the paid rate carries a TOTAL_PRICE condition of its own, to stop
            applying once the free rate takes over. So the guard excluded the
            very rate it was looking for, `fee` stayed null on every call, and
            this returned STANDARD_DELIVERY_FEE forever. The whole point of
            reading from Shopify was defeated silently, and nothing said so:
            the fallback is a legitimate value, so a permanently-failing lookup
            is indistinguishable from a working one.

            Dropping the condition is safe because the free rate is separated
            by `price === 0` below, not by the presence of a threshold. A
            0.00 rate can never satisfy `price > 0`.
          */
          if (price > 0 && fee === null) {
            fee = price;
          }

          // The free rate: a 0.00 rate whose TOTAL_PRICE condition names the
          // threshold to deliver free at.
          if (price === 0 && totalPriceCondition && freeThreshold === null) {
            const amt = parseFloat(totalPriceCondition?.conditionCriteria?.amount ?? '');
            if (Number.isFinite(amt)) freeThreshold = amt;
          }
        }
      }
    }

    // If no paid rate was found at all, keep the fallback fee rather than 0 —
    // a zero here would read as free delivery for every branch.
    const rate: StandardDeliveryRate = {
      fee: fee ?? STANDARD_DELIVERY_FEE,
      freeThreshold,
      live: true,
      taxShipping,
    };

    cache = {timestamp: now, rate};
    return rate;
  } catch (e) {
    console.error('[delivery-rate] Failed to read standard rate from Shopify:', e);
    return cache?.rate ?? FALLBACK;
  }
}
