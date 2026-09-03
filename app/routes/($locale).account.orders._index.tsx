import {
  data,
  redirect,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  type MetaFunction,
} from 'react-router';
import {Suspense} from 'react';
import {
  Link,
  useLoaderData,
  useFetcher,
  useOutletContext,
  useSearchParams,
  Await,
  Form,
} from 'react-router';
import {Money, Pagination, getPaginationVariables} from '@shopify/hydrogen';
import type {
  CustomerOrdersFragment,
  OrderItemFragment,
} from 'storefrontapi.generated';
import {Button} from '~/components/layout/Button';

export function checkIsPickupOrder(order: any): boolean {
  if (!order) return false;

  const customAttrs = order.customAttributes || order.custom_attributes || [];
  const fulfillmentAttr =
    customAttrs.find((a: any) => {
      const k = (a.key || a.name || '').toLowerCase();
      return (
        k === 'fulfillment type' ||
        k === 'fulfillment_type' ||
        k === 'fulfillment' ||
        k === 'type' ||
        k === 'delivery type'
      );
    })?.value || '';

  if (
    fulfillmentAttr.toLowerCase().includes('pickup') ||
    fulfillmentAttr.toLowerCase().includes('pick up') ||
    fulfillmentAttr.includes('استلام')
  ) {
    return true;
  }

  const shippingTitle = String(
    order.shippingTitle ||
      order.shippingLine?.title ||
      order.shipping_lines?.[0]?.title ||
      order.shipping_lines?.[0]?.code ||
      '',
  ).toLowerCase();

  if (
    shippingTitle.includes('pickup') ||
    shippingTitle.includes('pick up') ||
    shippingTitle.includes('pick_up') ||
    shippingTitle.includes('استلام') ||
    shippingTitle.includes('in store') ||
    shippingTitle.includes('store')
  ) {
    return true;
  }

  const tags = String(
    typeof order.tags === 'string' ? order.tags : (order.tags || []).join(','),
  ).toLowerCase();
  if (
    tags.includes('pickup') ||
    tags.includes('pick up') ||
    tags.includes('استلام')
  ) {
    return true;
  }

  if (order.shippingAddress === null || order.shipping_address === null) {
    // null address alone does NOT mean pickup — delivery orders can also have null address
    // Only treat as pickup if there's explicit shipping title or attribute evidence
  }

  return false;
}

/**
 * What an order card is called.
 *
 * The product names, not the order number: an order headed "Order — #1257"
 * tells the customer nothing they can recognise. Three names, then an ellipsis.
 *
 * Exported so the account dashboard's last-order card names an order exactly
 * the way the orders list does — the two used to disagree.
 */
export function getOrderTitles(lineItems: any[]): string {
  const items = lineItems || [];
  // Prefer the live, translated product title over the line item's title,
  // which is an English snapshot taken at purchase time.
  const displayTitle = (item: any) => {
    const productTitle = item?.variant?.product?.title;
    if (productTitle && productTitle.trim()) return productTitle;
    return item?.title || '';
  };
  return (
    items.slice(0, 3).map(displayTitle).filter(Boolean).join(' • ') +
    (items.length > 3 ? '...' : '')
  );
}

const AR_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];
const EN_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * The order date, formatted the way the order cards show it.
 *
 * Read off the ISO string rather than through `new Date`, so the date shown is
 * the one Shopify recorded and not that date shifted into the reader's
 * timezone. Returns null when there is no usable date, and callers omit the
 * line entirely.
 */
export function formatOrderDate(processedAt: string | null | undefined, isEn: boolean) {
  if (!processedAt) return null;
  const [yearStr, monthStr, dayStr] = String(processedAt).split('T')[0].split('-');
  if (!yearStr || !monthStr || !dayStr) return null;

  const dayNum = parseInt(dayStr, 10);
  const monthIndex = parseInt(monthStr, 10) - 1;
  const month = (isEn ? EN_MONTHS : AR_MONTHS)[monthIndex];
  if (!month || Number.isNaN(dayNum)) return null;

  return isEn ? (
    <>
      {month} <span className="font-en">{dayNum}</span>,{' '}
      <span className="font-en">{yearStr}</span>
    </>
  ) : (
    <>
      <span className="font-en">{dayNum}</span> {month}{' '}
      <span className="font-en">{yearStr}</span>
    </>
  );
}

export const meta: MetaFunction<typeof loader> = () => {
  return [{title: 'طلباتي | Saadeddin'}];
};

export async function action({request, context}: ActionFunctionArgs) {
  const {session, cart} = context;
  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'reorder') {
    const items = JSON.parse(String(formData.get('items') || '[]')) as any[];
    const lines = items
      .map((item: any) => ({
        merchandiseId: String(item?.merchandiseId || ''),
        quantity: Number(item?.quantity) || 1,
      }))
      .filter((item) => item.merchandiseId.startsWith('gid://shopify/ProductVariant/'));

    if (lines.length > 0) {
      await cart.addLines(lines);
      return redirect('/cart');
    }
  }
  return data({error: 'Invalid action'}, {status: 400});
}

// ---------------------------------------------------------------------------
// Admin API helpers (GraphQL, cursor-based)
// ---------------------------------------------------------------------------

const ADMIN_API_VERSION = '2024-01';

/** How many orders per page. Also the page size the filter tabs count over. */
const ORDERS_PAGE_SIZE = 20;

/** Short-lived cache: identity (phone/email) -> Admin customer GID. */
const customerIdCache = new Map<string, {id: string; expires: number}>();
const CUSTOMER_ID_TTL_MS = 10 * 60 * 1000;

async function adminGraphql<T = any>(
  env: any,
  query: string,
  variables: Record<string, any>,
): Promise<T | null> {
  const {getAdminToken, getAdminDomain} = await import(
    '~/lib/shopify-admin.server'
  );
  const adminToken = await getAdminToken(env);
  const adminDomain = getAdminDomain(env);
  if (!adminToken || !adminDomain) return null;

  const res = await fetch(
    `https://${adminDomain}/admin/api/${ADMIN_API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': adminToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({query, variables}),
    },
  );
  if (!res.ok) {
    console.error('[Orders Loader] Admin GraphQL HTTP error:', res.status);
    return null;
  }
  const json = (await res.json()) as any;
  if (json.errors?.length) {
    console.error(
      '[Orders Loader] Admin GraphQL errors:',
      JSON.stringify(json.errors),
    );
  }
  return json.data ?? null;
}

const ADMIN_FIND_CUSTOMER_QUERY = `
  query FindCustomer($q: String!) {
    customers(first: 10, query: $q) {
      nodes {
        id
        phone
        email
      }
    }
  }
`;

const ADMIN_CUSTOMER_ORDERS_QUERY = `
  query AdminCustomerOrders(
    $q: String!
    $first: Int
    $last: Int
    $after: String
    $before: String
  ) {
    orders(
      query: $q
      sortKey: PROCESSED_AT
      reverse: true
      first: $first
      last: $last
      after: $after
      before: $before
    ) {
      nodes {
        id
        name
        processedAt
        # Admin API spells it cancelledAt; aliased to the Storefront-style
        # name the mapper and UI already use.
        canceledAt: cancelledAt
        displayFinancialStatus
        displayFulfillmentStatus
        statusPageUrl
        tags
        currentTotalPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        totalPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        shippingLine {
          title
        }
        shippingAddress {
          name
          address1
          city
          phone
        }
        customAttributes {
          key
          value
        }
        fulfillments {
          status
          displayStatus
        }
        lineItems(first: 20) {
          nodes {
            title
            quantity
            customAttributes {
              key
              value
            }
            originalTotalSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            discountedTotalSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            image {
              url
              altText
              width
              height
            }
            variant {
              id
              image {
                url
                altText
                width
                height
              }
              product {
                title
                tags
                featuredImage {
                  url
                  altText
                  width
                  height
                }
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

/**
 * Shopify's order search defaults to OPEN orders only — cancelled and archived
 * (closed) orders are silently excluded, which is why the old REST calls passed
 * `status=any`. Spelled out rather than using `status:any` so it holds whatever
 * that alias does.
 */
const ORDER_STATUS_SCOPE = '(status:open OR status:closed OR status:cancelled)';

const customerOrdersSearch = (numericCustomerId: string) =>
  `customer_id:${numericCustomerId} AND ${ORDER_STATUS_SCOPE}`;

/**
 * Status counts for the filter tabs, over the shopper's whole order history
 * rather than just the page on screen. Deliberately selects no line items:
 * Shopify caps a single query at 1000 cost points, and nesting lineItems under
 * 250 orders blows past that.
 */
const ADMIN_ORDER_COUNTS_QUERY = `
  query CustomerOrderCounts($q: String!) {
    orders(query: $q, sortKey: PROCESSED_AT, reverse: true, first: 250) {
      nodes {
        id
        canceledAt: cancelledAt
        displayFinancialStatus
        displayFulfillmentStatus
      }
    }
  }
`;

/** Most orders we will count over. Hitting it renders counts as "250+". */
const ORDER_COUNT_CAP = 250;

/** Short-lived cache: customer GID -> computed tab counts. */
const orderCountsCache = new Map<string, {counts: any; expires: number}>();
const ORDER_COUNTS_TTL_MS = 60 * 1000;

async function fetchOrderCounts(env: any, numericCustomerId: string) {
  const hit = orderCountsCache.get(numericCustomerId);
  if (hit && hit.expires > Date.now()) return hit.counts;

  const data = await adminGraphql<any>(env, ADMIN_ORDER_COUNTS_QUERY, {
    q: customerOrdersSearch(numericCustomerId),
  });
  const nodes: any[] = data?.orders?.nodes || [];
  if (!data?.orders) {
    console.warn(
      '[Orders Loader] Counts query returned no connection — tabs fall back to page counts.',
    );
    return null;
  }

  const isCancelled = (o: any) =>
    !!o.canceledAt ||
    String(o.displayFinancialStatus || '').toUpperCase() === 'REFUNDED';
  const isFulfilled = (o: any) =>
    String(o.displayFulfillmentStatus || '').toUpperCase() === 'FULFILLED';

  const counts = {
    all: nodes.length,
    active: nodes.filter((o) => !isFulfilled(o) && !isCancelled(o)).length,
    fulfilled: nodes.filter((o) => isFulfilled(o) && !isCancelled(o)).length,
    cancelled: nodes.filter(isCancelled).length,
    // Pre-order lives in line item properties / product tags, which Shopify's
    // order search can't filter on — the page-derived count is used instead.
    preorder: null as number | null,
    capped: nodes.length >= ORDER_COUNT_CAP,
  };

  console.log(
    `[Orders Loader] Counts for customer ${numericCustomerId}:`,
    JSON.stringify(counts),
  );

  orderCountsCache.set(numericCustomerId, {
    counts,
    expires: Date.now() + ORDER_COUNTS_TTL_MS,
  });
  return counts;
}

const digitsOnly = (v: string) => (v || '').replace(/\D/g, '');

/**
 * Resolve the Admin customer GID for the logged-in shopper.
 * One GraphQL round-trip for phone + email combined, then cached in-process.
 */
async function findAdminCustomerId(
  env: any,
  phone?: string | null,
  email?: string | null,
): Promise<string | null> {
  const cacheKey = `${digitsOnly(phone || '')}|${(email || '').toLowerCase()}`;
  if (cacheKey === '|') return null;

  const hit = customerIdCache.get(cacheKey);
  if (hit && hit.expires > Date.now()) return hit.id;

  const clauses: string[] = [];
  if (phone) clauses.push(`phone:"${phone.replace(/"/g, '')}"`);
  if (email) clauses.push(`email:"${email.replace(/"/g, '')}"`);
  if (clauses.length === 0) return null;

  const data = await adminGraphql<any>(env, ADMIN_FIND_CUSTOMER_QUERY, {
    q: clauses.join(' OR '),
  });
  const candidates: any[] = data?.customers?.nodes || [];
  if (candidates.length === 0) return null;

  const sp = digitsOnly(phone || '');
  let match =
    sp.length > 0
      ? candidates.find((c) => {
          const cp = digitsOnly(c.phone || '');
          if (!cp) return false;
          // Was cp.endsWith(sp.slice(-9)), so two numbers sharing
          // their last 9 digits resolved to the same customer — and
          // this id decides whose orders get fetched.
          return cp === sp;
        })
      : undefined;

  if (!match && email) {
    match = candidates.find(
      (c: any) => c.email && c.email.toLowerCase() === email.toLowerCase(),
    );
  }
  if (!match) return null;

  customerIdCache.set(cacheKey, {
    id: match.id,
    expires: Date.now() + CUSTOMER_ID_TTL_MS,
  });
  return match.id;
}

/** Map an Admin GraphQL order node into the shape the UI already consumes. */
function mapAdminOrder(o: any) {
  const currency = o.currentTotalPriceSet?.shopMoney?.currencyCode || 'SAR';
  return {
    id: o.id,
    orderNumber: String(o.name || '').replace(/^#/, ''),
    processedAt: o.processedAt,
    canceledAt: o.canceledAt,
    // Unknown is unknown. This defaulted to 'PAID', so an order whose
            // financial status Shopify did not return was shown as paid.
            financialStatus: (o.displayFinancialStatus || 'UNKNOWN').toUpperCase(),
    fulfillmentStatus: (o.displayFulfillmentStatus || 'UNFULFILLED').toUpperCase(),
    totalPrice: {
      amount: String(o.totalPriceSet?.shopMoney?.amount ?? '0'),
      currencyCode: o.totalPriceSet?.shopMoney?.currencyCode || currency,
    },
    currentTotalPrice: {
      amount: String(o.currentTotalPriceSet?.shopMoney?.amount ?? '0'),
      currencyCode: currency,
    },
    statusUrl: o.statusPageUrl,
    customAttributes: o.customAttributes || [],
    shippingTitle: o.shippingLine?.title || '',
    shippingAddress: o.shippingAddress || null,
    tags: o.tags || [],
    fulfillments: o.fulfillments || [],
    lineItems: {
      nodes: (o.lineItems?.nodes || []).map((li: any) => {
        const image = li.variant?.image || li.image || null;
        return {
          title: li.title,
          quantity: li.quantity || 1,
          variantId: li.variant?.id,
          customAttributes: li.customAttributes || [],
          originalTotalPrice: {
            amount: String(li.originalTotalSet?.shopMoney?.amount ?? '0'),
            currencyCode:
              li.originalTotalSet?.shopMoney?.currencyCode || currency,
          },
          discountedTotalPrice: {
            amount: String(li.discountedTotalSet?.shopMoney?.amount ?? '0'),
            currencyCode:
              li.discountedTotalSet?.shopMoney?.currencyCode || currency,
          },
          variant: {
            id: li.variant?.id,
            image,
            product: {
              title: li.variant?.product?.title || li.title,
              tags: li.variant?.product?.tags || [],
              featuredImage: li.variant?.product?.featuredImage || image,
            },
          },
        };
      }),
    },
  };
}

/**
 * Line item titles on an order are a snapshot taken at purchase time and are
 * never translated. For non-English locales, swap in the current translated
 * product title via the Storefront API. Only runs for the visible page.
 */
async function translateLineItemTitles(storefront: any, orders: any[]) {
  const variantIds = Array.from(
    new Set(
      orders.flatMap((o) =>
        o.lineItems.nodes
          .map((li: any) => li.variant?.id)
          .filter(Boolean),
      ),
    ),
  );
  if (variantIds.length === 0) return orders;

  const variantQuery = `
    query GetVariantTitles($ids: [ID!]!) @inContext(language: ${storefront.i18n.language}, country: ${storefront.i18n.country}) {
      nodes(ids: $ids) {
        ... on ProductVariant {
          id
          product {
            title
          }
        }
      }
    }
  `;

  const result = (await storefront.query(variantQuery as any, {
    variables: {ids: variantIds},
    cache: storefront.CacheShort(),
  })) as any;

  const titleMap: Record<string, string> = {};
  for (const node of result?.nodes || []) {
    if (node?.id && node.product?.title) titleMap[node.id] = node.product.title;
  }
  if (Object.keys(titleMap).length === 0) return orders;

  return orders.map((order: any) => ({
    ...order,
    lineItems: {
      ...order.lineItems,
      nodes: order.lineItems.nodes.map((li: any) => {
        const translated = li.variant?.id ? titleMap[li.variant.id] : null;
        if (!translated) return li;
        return {
          ...li,
          title: translated,
          variant: {
            ...li.variant,
            product: {...li.variant.product, title: translated},
          },
        };
      }),
    },
  }));
}

export async function loader({request, context}: LoaderFunctionArgs) {
  const {session, storefront} = context;
  const customerAccessToken = await session.get('customerAccessToken');

  if (!customerAccessToken?.accessToken) {
    return redirect('/account/login');
  }

  // {first, endCursor} going forward, {last, startCursor} going back —
  // derived from the ?direction & ?cursor params the <Pagination> links set.
  const paginationVariables = getPaginationVariables(request, {
    pageBy: ORDERS_PAGE_SIZE,
  }) as {
    first?: number;
    last?: number;
    startCursor?: string | null;
    endCursor?: string | null;
  };

  const token =
    typeof customerAccessToken === 'string'
      ? customerAccessToken
      : customerAccessToken?.accessToken;
  const isFallbackToken =
    !token || token === 'dev-bypass-token' || token.startsWith('session-');

  let storefrontCustomer: any = null;
  let storefrontQueried: Promise<any> | null = null;

  /** Storefront customer orders — only used when the Admin path can't serve. */
  const queryStorefront = () => {
    if (isFallbackToken) return Promise.resolve(null);
    if (!storefrontQueried) {
      storefrontQueried = (async () => {
        try {
          const result = await storefront.query(CUSTOMER_ORDERS_QUERY, {
            variables: {
              customerAccessToken: token,
              country: storefront.i18n.country,
              language: storefront.i18n.language,
              ...paginationVariables,
            },
            cache: storefront.CacheNone(),
          });
          storefrontCustomer = result?.customer;
        } catch (e) {
          console.error('[Orders Loader] Storefront query failed:', e);
        }
        return storefrontCustomer;
      })();
    }
    return storefrontQueried;
  };

  /**
   * The shopper's Admin customer id. Shared by the orders page and the tab
   * counts so the lookup happens once, and both requests then run in parallel.
   */
  const customerIdPromise = (async () => {
    const savedPhone = await session.get('loginOtpPhone');
    let savedEmail = await session.get('loginOtpEmail');

    // Without any identity in session we need the Storefront customer's email
    // to look the shopper up in the Admin API.
    if (!savedPhone && !savedEmail) {
      savedEmail = (await queryStorefront())?.email;
    }

    try {
      const gid = await findAdminCustomerId(
        context.env,
        savedPhone,
        savedEmail,
      );
      return gid ? String(gid).split('/').pop() ?? null : null;
    } catch (e) {
      console.error('[Orders Loader] Admin customer lookup failed:', e);
      return null;
    }
  })();

  const ordersPromise = (async () => {
    try {
      const numericId = await customerIdPromise;

      if (numericId) {
        const adminData = await adminGraphql<any>(
          context.env,
          ADMIN_CUSTOMER_ORDERS_QUERY,
          {
            q: customerOrdersSearch(numericId),
            first: paginationVariables.first ?? null,
            last: paginationVariables.last ?? null,
            after: paginationVariables.endCursor ?? null,
            before: paginationVariables.startCursor ?? null,
          },
        );

        const connection = adminData?.orders;
        // On a cursor'd request stay on the Admin connection even if this page
        // came back empty — its cursors are meaningless to the Storefront API.
        const hasCursor = !!(
          paginationVariables.endCursor || paginationVariables.startCursor
        );
        if (connection && (connection.nodes?.length || hasCursor)) {
          let nodes = (connection.nodes || []).map(mapAdminOrder);

          if (String(storefront.i18n.language).toUpperCase() !== 'EN') {
            try {
              nodes = await translateLineItemTitles(storefront, nodes);
            } catch (e) {
              console.warn(
                '[Orders Loader] Could not translate line item titles:',
                e,
              );
            }
          }

          return {
            nodes,
            pageInfo: {
              hasNextPage: !!connection.pageInfo?.hasNextPage,
              hasPreviousPage: !!connection.pageInfo?.hasPreviousPage,
              startCursor: connection.pageInfo?.startCursor ?? null,
              endCursor: connection.pageInfo?.endCursor ?? null,
            },
          };
        }
      }
    } catch (e) {
      console.error('[Orders Loader] Admin order fetch failed:', e);
    }

    // Fallback: Storefront customer orders (already paginated by Shopify).
    const customer = await queryStorefront();
    return customer?.orders;
  })();

  /**
   * Whole-history counts for the filter tabs. Streams separately so it never
   * holds up the order list; the UI falls back to page-derived counts until
   * this resolves (and if it fails).
   */
  const countsPromise = (async () => {
    try {
      const numericId = await customerIdPromise;
      if (!numericId) return null;
      return await fetchOrderCounts(context.env, numericId);
    } catch (e) {
      console.error('[Orders Loader] Order counts fetch failed:', e);
      return null;
    }
  })();

  return data({
    ordersPromise,
    countsPromise,
  });
}

const CurrencyIcon = ({className}: {className?: string}) => (
  <svg
    viewBox="0 0 1124.14 1256.39"
    className={`inline-block fill-current ${className || 'h-3.5 w-auto mb-0.5'}`}
  >
    <path d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z"></path>
    <path d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z"></path>
  </svg>
);

export default function Orders() {
  const {ordersPromise, countsPromise} = useLoaderData<typeof loader>();
  const {locale} = useOutletContext<{locale: string}>();
  const [searchParams] = useSearchParams();
  const statusFilter = searchParams.get('status') || 'all';
  const isEn = locale === 'en';

  return (
    <div className="orders-page-container" dir={isEn ? 'ltr' : 'rtl'}>
      <div className="bg-white border border-[#BBCFCD] rounded-3xl p-5 md:p-6 flex flex-col gap-5 w-full">
        <h2
          className="hidden lg:block text-[20px] md:text-[22px] font-bold text-[#234745] text-start m-0"
          style={
            !isEn
              ? {fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif"}
              : undefined
          }
        >
          {isEn ? 'My Orders' : 'طلباتي'}
        </h2>

        <Suspense
          fallback={
            <div className="py-20 text-center text-gray-500">
              {isEn ? 'Loading orders...' : 'جاري تحميل الطلبات...'}
            </div>
          }
        >
          <Await resolve={ordersPromise}>
            {(orders) => {
              // Counts over the orders loaded so far — used until (and if) the
              // whole-history counts arrive, and always for the pre-order tab.
              const pageCounts = {
                all: orders?.nodes?.length || 0,
                active:
                  orders?.nodes?.filter(
                    (o: any) =>
                      o.fulfillmentStatus !== 'FULFILLED' &&
                      !o.canceledAt &&
                      o.financialStatus !== 'REFUNDED',
                  ).length || 0,
                fulfilled:
                  orders?.nodes?.filter(
                    (o: any) =>
                      o.fulfillmentStatus === 'FULFILLED' && !o.canceledAt,
                  ).length || 0,
                cancelled:
                  orders?.nodes?.filter(
                    (o: any) =>
                      o.canceledAt || o.financialStatus === 'REFUNDED',
                  ).length || 0,
                preorder:
                  orders?.nodes?.filter((o: any) =>
                    o.lineItems?.nodes?.some(
                      (li: any) =>
                        li.variant?.product?.tags?.some(
                          (t: string) => t.toLowerCase() === 'pre-order',
                        ) ||
                        li.customAttributes?.some(
                          (a: any) =>
                            a.key === '_is_preorder' && a.value === 'true',
                        ),
                    ),
                  ).length || 0,
              };

              return (
                <div className="flex flex-col gap-5">
                  <Suspense
                    fallback={
                      <OrdersFilters
                        statusFilter={statusFilter}
                        isEn={isEn}
                        counts={pageCounts}
                      />
                    }
                  >
                    <Await
                      resolve={countsPromise}
                      errorElement={
                        <OrdersFilters
                          statusFilter={statusFilter}
                          isEn={isEn}
                          counts={pageCounts}
                        />
                      }
                    >
                      {(totals: any) => (
                        <OrdersFilters
                          statusFilter={statusFilter}
                          isEn={isEn}
                          counts={
                            totals
                              ? {
                                  ...totals,
                                  // Pre-order isn't searchable server-side.
                                  preorder: pageCounts.preorder,
                                }
                              : pageCounts
                          }
                        />
                      )}
                    </Await>
                  </Suspense>

                  {orders?.nodes?.length ? (
                    <OrdersList
                      orders={orders}
                      statusFilter={statusFilter}
                      isEn={isEn}
                    />
                  ) : (
                    <EmptyOrders isEn={isEn} />
                  )}
                </div>
              );
            }}
          </Await>
        </Suspense>
      </div>
    </div>
  );
}

function OrdersFilters({
  statusFilter,
  isEn,
  counts,
}: {
  statusFilter: string;
  isEn: boolean;
  counts: any;
}) {
  // Counts come from the whole order history, capped at ORDER_COUNT_CAP —
  // past that they read as "250+".
  const n = (value: number | null | undefined) =>
    `${value ?? 0}${counts.capped ? '+' : ''}`;

  const tabs = [
    {
      value: 'all',
      labelEn: `All (${n(counts.all)})`,
      labelAr: `الكل (${n(counts.all)})`,
    },
    {
      value: 'PREORDER',
      labelEn: `Pre-orders (${counts.preorder ?? 0})`,
      labelAr: `الطلبات المسبقة (${counts.preorder ?? 0})`,
    },
    {
      value: 'ACTIVE',
      labelEn: `Active (${n(counts.active)})`,
      labelAr: `نشطة (${n(counts.active)})`,
    },
    {
      value: 'FULFILLED',
      labelEn: `Delivered (${n(counts.fulfilled)})`,
      labelAr: `مستلمة (${n(counts.fulfilled)})`,
    },
    {
      value: 'CANCELLED',
      labelEn: `Cancelled (${n(counts.cancelled)})`,
      labelAr: `ملغاة (${n(counts.cancelled)})`,
    },
  ];

  return (
    <div className="-mx-4 px-4 md:mx-0 md:px-0 mb-0" dir={isEn ? 'ltr' : 'rtl'}>
      <div className="flex flex-row overflow-x-auto hide-scrollbar items-center justify-start gap-3 pb-2 w-full snap-x">
        {tabs.map((tab) => {
          const isActive =
            statusFilter === tab.value ||
            (statusFilter === 'all' && tab.value === 'all');
          return (
            <form key={tab.value} method="get" className="shrink-0 snap-start">
              <input type="hidden" name="status" value={tab.value} />
              <button
                type="submit"
                className={`px-5 py-2 rounded-full text-[13px] md:text-[14px] font-bold transition-all border whitespace-nowrap ${
                  isActive
                    ? 'bg-[#b9cdca] text-[#234745] border-transparent'
                    : 'bg-white text-[#9FB7AE] border-[#BBCFCD] hover:border-[#234745]'
                }`}
              >
                {isEn ? tab.labelEn : tab.labelAr}
              </button>
            </form>
          );
        })}
      </div>
    </div>
  );
}

function OrdersList({
  orders,
  statusFilter,
  isEn,
}: {
  orders: any;
  statusFilter: string;
  isEn: boolean;
}) {
  const filteredNodes = (orders.nodes || []).filter(
    (order: OrderItemFragment) => {
      const isCancelled =
        !!(order as any).canceledAt || order.financialStatus === 'REFUNDED';
      if (statusFilter === 'ACTIVE')
        return order.fulfillmentStatus !== 'FULFILLED' && !isCancelled;
      if (statusFilter === 'FULFILLED')
        return order.fulfillmentStatus === 'FULFILLED' && !isCancelled;
      if (statusFilter === 'CANCELLED') return isCancelled;
      if (statusFilter === 'PREORDER')
        return (order as any).lineItems.nodes.some(
          (li: any) =>
            li.variant?.product?.tags?.some(
              (t: string) => t.toLowerCase() === 'pre-order',
            ) ||
            li.customAttributes?.some(
              (a: any) => a.key === '_is_preorder' && a.value === 'true',
            ),
        );
      return true;
    },
  );

  if (filteredNodes.length === 0) {
    return (
      <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-gray-200">
        <p className="text-gray-500">
          {isEn
            ? 'No orders match your filters.'
            : 'لا توجد طلبات تطابق اختياراتك.'}
        </p>
        <Link
          to="/account/orders"
          className="text-[#234745] font-bold underline mt-4 inline-block"
        >
          {isEn ? 'Clear filters' : 'مسح التصفية'}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0">
      <Pagination connection={{...orders, nodes: filteredNodes}}>
        {({nodes, isLoading, PreviousLink, NextLink}) => (
          <>
            <div className="flex justify-center mb-0">
              <PreviousLink className="pagination-link">
                {isEn ? '↑ Previous' : '↑ السابق'}
              </PreviousLink>
            </div>

            <div className="flex flex-col gap-4">
              {nodes.map((order) => (
                <OrderCard
                  key={(order as any).id}
                  order={order as any}
                  isEn={isEn}
                />
              ))}
            </div>

            <div className="flex justify-center mt-8">
              <NextLink className="pagination-link">
                {isLoading
                  ? isEn
                    ? 'Loading…'
                    : 'جاري التحميل…'
                  : isEn
                    ? 'Load More ↓'
                    : 'تحميل المزيد ↓'}
              </NextLink>
            </div>
          </>
        )}
      </Pagination>
    </div>
  );
}

function OrderCard({order, isEn}: {order: OrderItemFragment; isEn: boolean}) {
  const fetcher = useFetcher();
  const lineItems = order.lineItems?.nodes || [];
  const productCount = lineItems.reduce(
    (acc, item) => acc + (item.quantity || 0),
    0,
  );
  const firstItem = lineItems[0];
  const imageUrl =
    lineItems
      .map(
        (item: any) =>
          item.variant?.image?.url ||
          item.variant?.product?.featuredImage?.url ||
          item.image?.url ||
          (item.variant?.product as any)?.image?.url,
      )
      .find(Boolean) || '';
  const totalAmount = parseFloat(order.currentTotalPrice?.amount || '0.00');

  // Calculate original total using discountedTotalPrice
  const originalTotal = lineItems.reduce(
    (sum, item) => sum + parseFloat(item.discountedTotalPrice?.amount || '0'),
    0,
  );

  const dateNode = formatOrderDate(order.processedAt, isEn);

  const titles = getOrderTitles(lineItems);

  const reorderLines = lineItems
    .map((item: any) => {
      const rawId = (item.variant as any)?.id || item.variantId || item.variant_id;
      if (!rawId) return null;
      const idStr = String(rawId);
      if (idStr === 'null' || idStr === 'undefined' || !idStr.trim()) return null;
      const merchandiseId = idStr.startsWith('gid://')
        ? idStr
        : `gid://shopify/ProductVariant/${idStr}`;
      return {
        merchandiseId,
        quantity: item.quantity || 1,
      };
    })
    .filter((l: any) => l && l.merchandiseId);

  const isPickup = checkIsPickupOrder(order);

  const fulfillments = (order as any).fulfillments || [];

  // Collect ERP-assigned Shopify API tags as exact keys (per ERP→Shopify status mapping)
  /**
   * Same normalisation as the tracking page (track-order.$id.tsx), on purpose.
   *
   * This collapsed only spaces, to underscores, while the tracking page collapses
   * spaces AND underscores to hyphens. So an ERP tag written with hyphens —
   * `ready-for-pickup` — reached the tracking page as a match and reached this
   * screen unchanged, where every lookup key was underscored, and matched
   * nothing. The same order then showed its real progress on one page and sat on
   * 'Order Received' on the other. Hyphen form is now the shared spelling, and
   * underscore and space spellings still fold into it.
   */
  const normTag = (t: unknown) =>
    String(t ?? '').trim().toLowerCase().replace(/[\s_]+/g, '-');

  const rawTags = (order as any).tags
    ? typeof (order as any).tags === 'string'
      ? (order as any).tags.split(',').map(normTag)
      : Array.isArray((order as any).tags)
        ? (order as any).tags.map(normTag)
        : []
    : [];

  const tagSet = new Set(rawTags);

  // Shipment-level statuses from fulfillment records
  const shipmentStatuses = fulfillments
    .map((f: any) => normTag(f.shipment_status || f.shipmentStatus || f.displayStatus || f.status || ''))
    .filter(Boolean);
  const shipmentSet = new Set(shipmentStatuses);

  // Primary: Shopify native displayFulfillmentStatus
  const fs = String(order.fulfillmentStatus || 'UNFULFILLED').toUpperCase();

  // Helper: check if any ERP tag exactly matches any of the given keys
  const hasTag = (...keys: string[]) => keys.some((k) => tagSet.has(k));
  const hasShipment = (...keys: string[]) => keys.some((k) => shipmentSet.has(k));

  const isCancelled = !!(
    (order as any).canceledAt ||
    order.financialStatus === 'REFUNDED' ||
    fs === 'CANCELLED'
  );

  // Default: UNFULFILLED / new order = “Order Received” (Step 1)
  let statusEn = 'Order Received';
  let statusAr = 'تم استلام الطلب';
  let statusColor = '#906B51';

  if (isCancelled) {
    statusEn = 'Cancelled';
    statusAr = 'ملغاة';
    statusColor = '#E64950';
  } else if (
    hasTag('failure', 'تعذر-التسليم', 'انتهت-مدة-الاستلام') ||
    hasShipment('failure', 'failed', 'attempted-delivery')
  ) {
    statusEn = isPickup ? 'Pickup Period Expired' : 'Delivery Attempt Failed';
    statusAr = isPickup ? 'انتهت مدة الاستلام' : 'تعذر التسليم';
    statusColor = '#E64950';
  } else if (
    fs === 'FULFILLED' ||
    hasTag('delivered', 'picked-up', 'تم-التسليم', 'تم-الاستلام') ||
    hasShipment('delivered', 'picked-up')
  ) {
    statusEn = isPickup ? 'Order Picked Up' : 'Delivered Successfully';
    statusAr = isPickup ? 'تم استلام الطلب' : 'تم التسليم بنجاح';
    statusColor = '#234745';
  } else if (
    hasTag('ready-for-pickup', 'in-transit', 'out-for-delivery', 'جاهز-للاستلام', 'في-الطريق') ||
    hasShipment('ready-for-pickup', 'in-transit', 'out-for-delivery')
  ) {
    statusEn = isPickup ? 'Ready for Pickup' : 'Out for Delivery';
    statusAr = isPickup ? 'الطلب جاهز للاستلام' : 'الطلب في الطريق إليك';
    statusColor = '#004F59';
  } else if (
    fs === 'IN_PROGRESS' ||
    fs === 'PARTIALLY_FULFILLED' ||
    hasTag('in-progress', 'processing', 'جاري-التجهيز') ||
    hasShipment('in-progress', 'label-printed', 'submitted')
  ) {
    statusEn = 'Order is Being Prepared';
    statusAr = 'جاري تجهيز الطلب';
    statusColor = '#906B51';
  } else if (
    hasTag('confirmed', 'تم-التأكيد')
  ) {
    statusEn = 'Order Confirmed';
    statusAr = 'تم التأكيد';
    statusColor = '#906B51';
  }

  return (
    <div
      className="bg-white border border-[#9FB7AE] rounded-[24px] md:rounded-2xl transition-all hover:border-[#234745] w-full overflow-hidden shadow-xs"
      dir={isEn ? 'ltr' : 'rtl'}
    >
      {/* 1. DESKTOP VIEW LAYOUT (Original Wide Row Design) */}
      <div className="hidden md:flex flex-row items-center justify-between gap-6 p-6 w-full text-start">
        {/* Right side (RTL): Product image + details column next to it */}
        <div className="flex items-center gap-5 flex-1 min-w-0">
          {/* Product Image */}
          <div className="relative flex-shrink-0">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Product thumbnail"
                className="w-[90px] h-[90px] rounded-xl object-cover border border-gray-100"
              />
            ) : (
              <div className="w-[90px] h-[90px] bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            )}
            {/* Quantity Badge on Top-Left */}
            <div className="absolute -top-2 -left-2 w-6 h-6 bg-[#234745] text-white rounded-full flex items-center justify-center text-[11px] font-bold border-2 border-white font-en shadow-sm">
              {productCount.toLocaleString('en-US')}
            </div>
          </div>

          {/* Details Column */}
          <div className="flex flex-col gap-1 min-w-0">
            {/* Order number */}
            <span className="text-[12px] text-[#9FB7AE] font-medium font-en">
              #{order.orderNumber}
            </span>
            {/* Item Titles */}
            <h3
              className="text-[15px] md:text-[17px] font-bold text-[#234745] leading-tight mb-0.5 truncate"
              style={
                !isEn
                  ? {fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif"}
                  : undefined
              }
            >
              {titles}
            </h3>
            {/* Date Node */}
            <span className="text-[12px] text-[#9FB7AE] font-medium leading-tight">
              {dateNode}
            </span>
            {/* Paid Total Price */}
            <div className="flex items-center gap-1 mt-1 text-[#234745]">
              <span className="text-[18px] md:text-[20px] font-black leading-none font-en">
                {totalAmount.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                })}
              </span>
              <CurrencyIcon className="h-4.5 w-auto" />
            </div>
          </div>
        </div>

        {/* Left side (RTL): Status column & buttons under it */}
        <div className="flex flex-col items-end justify-between gap-4 shrink-0">
          {/* Status Dot & Label */}
          <div className="flex items-center gap-2">
            <span
              className="text-[14px] font-bold"
              style={{color: statusColor}}
            >
              {isEn ? statusEn : statusAr}
            </span>
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{backgroundColor: statusColor}}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {!isCancelled && (
              <Link
                to={
                  isEn
                    ? `/en/track-order/${order.orderNumber}`
                    : `/track-order/${order.orderNumber}`
                }
                className="text-center px-6 py-2 border border-[#234745] text-[#234745] rounded-full text-[13px] md:text-[14px] font-bold hover:bg-gray-50 transition-all whitespace-nowrap"
              >
                {order.fulfillmentStatus === 'FULFILLED'
                  ? isEn
                    ? 'Invoice'
                    : 'الفاتورة'
                  : isEn
                    ? 'Track'
                    : 'تتبع'}
              </Link>
            )}

            {(() => {
              const customItem = lineItems.find((item: any) =>
                item.customAttributes?.some((attr: any) =>
                  attr.key === '_cake_custom' ||
                  attr.key === 'Shape' || attr.key === 'الشكل' ||
                  attr.key === 'Flavor' || attr.key === 'النكهة'
                ) ||
                (order as any).customAttributes?.some((attr: any) =>
                  attr.key === '_cake_custom' ||
                  attr.key === 'Shape' || attr.key === 'الشكل' ||
                  attr.key === 'Flavor' || attr.key === 'النكهة'
                ) ||
                item.title?.includes('كيكة مخصصة') ||
                item.title?.includes('Custom Cake')
              );

              const isCustomCake = customItem || (order as any).customAttributes?.some((attr: any) =>
                attr.key === '_cake_custom' ||
                attr.key === 'Shape' || attr.key === 'الشكل' ||
                attr.key === 'Flavor' || attr.key === 'النكهة'
              );

              if (isCustomCake) {
                const targetItem = customItem || lineItems[0];
                const attrs = [
                  ...(targetItem?.customAttributes || []),
                  ...((order as any).customAttributes || [])
                ];
                const getAttr = (...keys: string[]) => {
                  const found = attrs.find((a: any) => keys.includes(a.key));
                  return found ? found.value : '';
                };

                const params = new URLSearchParams({
                  reorder: 'true',
                  shape: getAttr('Shape', 'الشكل'),
                  size: getAttr('Size', 'الحجم'),
                  flavor: getAttr('Flavor', 'النكهة'),
                  layers: getAttr('Layers', 'الطبقات'),
                  color: getAttr('Color', 'اللون'),
                  topping: getAttr('Topping', 'الإضافة'),
                  message: getAttr('Cake Surface Message', 'نص على الكيكة', 'Message', 'الرسالة'),
                  baseMessage: getAttr('Cake Base Message', 'نص على القاعدة'),
                  specialInstructions: getAttr('Special Instructions', 'تعليمات خاصة للمخبز'),
                  textFont: getAttr('Message Font', 'خط الرسالة'),
                  textColor: getAttr('Message Color', 'لون الرسالة'),
                  messagePlacement: getAttr('Text Placement', 'موقع الكتابة'),
                });

                const path = isEn ? '/en/custom-cake' : '/custom-cake';
                const reorderUrl = `${path}?${params.toString()}`;

                return (
                  <Link
                    to={reorderUrl}
                    className="text-center px-6 py-2 bg-[#234745] text-white rounded-full text-[13px] md:text-[14px] font-bold hover:opacity-90 transition-all whitespace-nowrap active:scale-95 cursor-pointer inline-block"
                    style={{color: '#FFFFFF'}}
                  >
                    {isEn ? 'Reorder Cake' : 'إعادة طلب الكيكة'}
                  </Link>
                );
              }

              if (reorderLines.length === 0) {
                return (
                  <button
                    type="button"
                    disabled
                    className="text-center px-6 py-2 bg-gray-400 text-white rounded-full text-[13px] md:text-[14px] font-bold cursor-not-allowed opacity-50 whitespace-nowrap"
                  >
                    {isEn ? 'Unavailable' : 'غير متوفر'}
                  </button>
                );
              }

              return (
                <Form
                  action={isEn ? '/en/cart' : '/cart'}
                  method="post"
                  className="inline-block"
                >
                  <input
                    type="hidden"
                    name="cartFormInput"
                    value={JSON.stringify({
                      action: 'LinesAdd',
                      inputs: {lines: reorderLines},
                    })}
                  />
                  <input
                    type="hidden"
                    name="redirectTo"
                    value={isEn ? '/en/cart' : '/cart'}
                  />
                  <button
                    type="submit"
                    className="text-center px-6 py-2 bg-[#234745] text-white rounded-full text-[13px] md:text-[14px] font-bold hover:opacity-90 transition-all whitespace-nowrap active:scale-95"
                    style={{color: '#FFFFFF'}}
                  >
                    {isEn ? 'Reorder' : 'إعادة الطلب'}
                  </button>
                </Form>
              );
            })()}
          </div>
        </div>
      </div>

      {/* 2. MOBILE VIEW LAYOUT (< md) matching target design */}
      <div className="flex md:hidden flex-col p-5 w-full text-start" dir="ltr">
        {/* Top Status Row - Positioned at Top Left */}
        <div className="flex items-center gap-2 mb-3.5 justify-start">
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{backgroundColor: statusColor}}
          />
          <span
            className="text-[14px] font-bold"
            style={{
              color: statusColor,
              ...(!isEn
                ? {
                    fontFamily:
                      "'EnglishDigits', 'Bahij Janna', sans-serif",
                  }
                : {}),
            }}
          >
            {isEn ? statusEn : statusAr}
          </span>
        </div>

        {/* Middle Row: Details on LEFT, Image on RIGHT */}
        <div className="flex items-center justify-between gap-4">
          {/* Details column (Left Side) */}
          <div className="flex flex-col gap-1.5 flex-1 min-w-0 items-start text-start" dir={isEn ? 'ltr' : 'rtl'}>
            {/*
              Order number above, product names as the heading — the same way
              round the desktop card has it. This card used to be headed
              "Order — #1252" and never named what was in it, so the same
              order read as two different things depending on window width.

              line-clamp-2 rather than truncate: this column is narrow, and a
              title cut mid-word after four characters names nothing.
            */}
            <span className="text-[12px] text-[#9FB7AE] font-medium font-en">
              #{order.orderNumber}
            </span>
            <h3
              className="text-[17px] font-bold text-[#171717] leading-tight line-clamp-2"
              style={
                !isEn
                  ? {fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif"}
                  : undefined
              }
            >
              {titles}
            </h3>

            {/* Subtitle: product count & total */}
            <div className="text-[13px] text-[#9FB7AE] font-medium leading-tight flex items-center gap-1.5 flex-wrap">
              <span>
                {productCount} {isEn ? 'Products' : 'منتجات'}
              </span>
              <span>•</span>
              <span className="font-en notranslate">
                {totalAmount.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                })}
              </span>
              <CurrencyIcon className="h-3.5 w-auto fill-current" />
            </div>

            {/* Paid Total */}
            <div className="flex items-center justify-start gap-2 mt-1">
              <span className="text-[#234745]">
                <CurrencyIcon className="h-5 w-auto" />
              </span>
              <span className="text-[22px] font-extrabold text-[#234745] leading-none font-en notranslate">
                {totalAmount.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>

          {/* Product Image on RIGHT */}
          <div className="relative flex-shrink-0 w-[82px] h-[82px] rounded-[16px] bg-[#F8FAF9] border border-gray-100 flex items-center justify-center">
            {/*
              The fallback and the onError handler both pointed at
              cdn.shopify.com/s/files/1/0533/2089/... — a different
              store's CDN, which 404s. An empty tile beats a broken
              image icon, and beats a photo of someone else's product.
            */}
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={firstItem?.title || 'Order thumbnail'}
                loading="lazy"
                className="w-full h-full rounded-[16px] object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.visibility =
                    'hidden';
                }}
              />
            ) : null}
            {/* Quantity Badge on Top-Left of Image */}
            <div className="absolute -top-2 -left-2 w-6 h-6 bg-[#234745] text-white rounded-full flex items-center justify-center text-[12px] font-bold border-2 border-white font-en shadow-xs z-10">
              {productCount.toLocaleString('en-US')}
            </div>
          </div>
        </div>

        {/* Bottom Action Buttons Row: Left is Reorder (Primary), Right is Track (Secondary) */}
        <div className="flex items-center gap-3 w-full mt-5 pt-1">
          {/* Primary Action (Left) */}
          {(() => {
            const customItem = lineItems.find((item: any) =>
              item.customAttributes?.some((attr: any) =>
                attr.key === '_cake_custom' ||
                attr.key === 'Shape' || attr.key === 'الشكل' ||
                attr.key === 'Flavor' || attr.key === 'النكهة'
              ) ||
              (order as any).customAttributes?.some((attr: any) =>
                attr.key === '_cake_custom' ||
                attr.key === 'Shape' || attr.key === 'الشكل' ||
                attr.key === 'Flavor' || attr.key === 'النكهة'
              ) ||
              item.title?.includes('كيكة مخصصة') ||
              item.title?.includes('Custom Cake')
            );

            const isCustomCake = customItem || (order as any).customAttributes?.some((attr: any) =>
              attr.key === '_cake_custom' ||
              attr.key === 'Shape' || attr.key === 'الشكل' ||
              attr.key === 'Flavor' || attr.key === 'النكهة'
            );

            if (isCustomCake) {
              const targetItem = customItem || lineItems[0];
              const attrs = [
                ...(targetItem?.customAttributes || []),
                ...((order as any).customAttributes || [])
              ];
              const getAttr = (...keys: string[]) => {
                const found = attrs.find((a: any) => keys.includes(a.key));
                return found ? found.value : '';
              };

              const params = new URLSearchParams({
                reorder: 'true',
                shape: getAttr('Shape', 'الشكل'),
                size: getAttr('Size', 'الحجم'),
                flavor: getAttr('Flavor', 'النكهة'),
                layers: getAttr('Layers', 'الطبقات'),
                color: getAttr('Color', 'اللون'),
                topping: getAttr('Topping', 'الإضافة'),
                message: getAttr('Cake Surface Message', 'نص على الكيكة', 'Message', 'الرسالة'),
                baseMessage: getAttr('Cake Base Message', 'نص على القاعدة'),
                specialInstructions: getAttr('Special Instructions', 'تعليمات خاصة للمخبز'),
                textFont: getAttr('Message Font', 'خط الرسالة'),
                textColor: getAttr('Message Color', 'لون الرسالة'),
                messagePlacement: getAttr('Text Placement', 'موقع الكتابة'),
              });

              const path = isEn ? '/en/custom-cake' : '/custom-cake';
              const reorderUrl = `${path}?${params.toString()}`;

              return (
                <Link
                  to={reorderUrl}
                  className="flex-1 h-[48px] bg-[#234745] hover:bg-[#1A3533] text-white rounded-full text-[15px] font-bold flex items-center justify-center transition-all shadow-xs active:scale-98 cursor-pointer"
                  style={{color: '#FFFFFF', ...(!isEn ? { fontFamily: "'GE Dinar One', sans-serif" } : {})}}
                >
                  {isEn ? 'Reorder Cake' : 'إعادة طلب الكيكة'}
                </Link>
              );
            }

            if (reorderLines.length === 0) {
              return (
                <button
                  type="button"
                  disabled
                  className="flex-1 h-[48px] bg-gray-300 text-gray-500 rounded-full text-[15px] font-bold flex items-center justify-center cursor-not-allowed opacity-60"
                >
                  {isEn ? 'Unavailable' : 'غير متوفر'}
                </button>
              );
            }

            return (
              <Form
                action={isEn ? '/en/cart' : '/cart'}
                method="post"
                className="flex-1"
              >
                <input
                  type="hidden"
                  name="cartFormInput"
                  value={JSON.stringify({
                    action: 'LinesAdd',
                    inputs: {lines: reorderLines},
                  })}
                />
                <input
                  type="hidden"
                  name="redirectTo"
                  value={isEn ? '/en/cart' : '/cart'}
                />
                <button
                  type="submit"
                  className="w-full h-[48px] bg-[#234745] hover:bg-[#1A3533] text-white rounded-full text-[15px] font-bold flex items-center justify-center transition-all shadow-xs active:scale-98 cursor-pointer border-none"
                  style={{color: '#FFFFFF', ...(!isEn ? { fontFamily: "'GE Dinar One', sans-serif" } : {})}}
                >
                  {isEn ? 'Reorder' : 'إعادة الطلب'}
                </button>
              </Form>
            );
          })()}

          {/* Secondary Action (Right) */}
          {!isCancelled && (
            <Link
              to={
                isEn
                  ? `/en/track-order/${order.orderNumber}`
                  : `/track-order/${order.orderNumber}`
              }
              className="flex-1 h-[48px] border-2 border-[#234745] bg-white hover:bg-gray-50 text-[#234745] rounded-full text-[15px] font-bold flex items-center justify-center transition-all shadow-xs active:scale-98"
              style={!isEn ? { fontFamily: "'GE Dinar One', sans-serif" } : undefined}
            >
              {order.fulfillmentStatus === 'FULFILLED'
                ? isEn
                  ? 'Invoice'
                  : 'الفاتورة'
                : isEn
                  ? 'Track'
                  : 'تتبع'}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyOrders({isEn}: {isEn: boolean}) {
  return (
    <div className="empty-orders-card bg-white rounded-[12px] border border-[#9FB7AE] mt-8 text-center py-16">
      <div className="empty-icon opacity-50 flex justify-center">
        <svg
          fill="none"
          stroke="#A6BFB9"
          strokeWidth="1.5"
          viewBox="0 0 24 24"
          width="60"
          height="60"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
          />
        </svg>
      </div>
      <h3
        className="text-[18px] font-bold text-[#234745] mt-4"
        style={
          !isEn
            ? {fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif"}
            : undefined
        }
      >
        {isEn ? 'No order history yet' : 'لا توجد طلبات سابقة'}
      </h3>
      <Link
        to="/collections"
        className="mt-6 inline-block px-8 py-3 bg-[#234745] text-white rounded-[24px] text-[13px] font-bold hover:opacity-90"
      >
        {isEn ? 'Start Shopping' : 'ابدأ التسوق الآن'}
      </Link>
    </div>
  );
}

const ORDER_ITEM_FRAGMENT = `#graphql
  fragment OrderItem on Order {
    currentTotalPrice {
      amount
      currencyCode
    }
    financialStatus
    fulfillmentStatus
    canceledAt
    id
    customAttributes {
      key
      value
    }
    lineItems(first: 10) {
      nodes {
        title
        quantity
        discountedTotalPrice {
          amount
          currencyCode
        }
        customAttributes {
          key
          value
        }
        variant {
          id
          image {
            url
            altText
            height
            width
          }
          product {
            tags
            title
            featuredImage {
              url
              altText
              height
              width
            }
          }
        }
      }
    }
    orderNumber
    customerUrl
    statusUrl
    processedAt
  }
` as const;

const CUSTOMER_FRAGMENT = `#graphql
  fragment CustomerOrders on Customer {
    numberOfOrders
    orders(
      sortKey: PROCESSED_AT,
      reverse: true,
      first: $first,
      last: $last,
      before: $startCursor,
      after: $endCursor
    ) {
      nodes {
        ...OrderItem
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
        startCursor
        endCursor
      }
    }
  }
  ${ORDER_ITEM_FRAGMENT}
` as const;

const CUSTOMER_ORDERS_QUERY = `#graphql
  ${CUSTOMER_FRAGMENT}
  query StorefrontCustomerOrders(
    $country: CountryCode
    $customerAccessToken: String!
    $endCursor: String
    $first: Int
    $language: LanguageCode
    $last: Int
    $startCursor: String
  ) @inContext(country: $country, language: $language) {
    customer(customerAccessToken: $customerAccessToken) {
      ...CustomerOrders
    }
  }
` as const;
