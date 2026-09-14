import {getAdminToken, getAdminDomain} from '~/lib/shopify-admin.server';
import {
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
};

let cache: {timestamp: number; rate: StandardDeliveryRate} | null = null;
const TTL_MS = 5 * 60 * 1000;

const FALLBACK: StandardDeliveryRate = {
  fee: STANDARD_DELIVERY_FEE,
  freeThreshold: STANDARD_FREE_DELIVERY_THRESHOLD,
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

export async function getStandardDeliveryRate(env: any): Promise<StandardDeliveryRate> {
  const now = Date.now();
  if (cache && now - cache.timestamp < TTL_MS) return cache.rate;

  const domain = getAdminDomain(env);
  if (!domain) return cache?.rate ?? FALLBACK;

  try {
    const token = await getAdminToken(env);
    if (!token) return cache?.rate ?? FALLBACK;

    const res = await fetch(`https://${domain}/admin/api/2024-04/graphql.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({query: DELIVERY_PROFILE_QUERY}),
      signal: AbortSignal.timeout(4000),
    }).catch(() => null);

    if (!res || !res.ok) return cache?.rate ?? FALLBACK;

    const json = (await res.json()) as any;
    const profiles = json?.data?.deliveryProfiles?.nodes || [];
    const profile = profiles.find((p: any) => p?.default) || profiles[0];

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

          // The paid standard rate: first active rate with a real price and no
          // "free over X" condition. Kept as the first one found so an added
          // express rate later cannot displace it.
          if (price > 0 && !totalPriceCondition && fee === null) {
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
    };

    cache = {timestamp: now, rate};
    return rate;
  } catch (e) {
    console.error('[delivery-rate] Failed to read standard rate from Shopify:', e);
    return cache?.rate ?? FALLBACK;
  }
}
