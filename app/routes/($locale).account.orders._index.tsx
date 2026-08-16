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

export const meta: MetaFunction<typeof loader> = () => {
  return [{title: 'طلباتي | Saadeddin'}];
};

export async function action({request, context}: ActionFunctionArgs) {
  const {session, cart} = context;
  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'reorder') {
    const items = JSON.parse(String(formData.get('items') || '[]')) as any[];
    if (items.length > 0) {
      await cart.addLines(
        items.map((item: any) => ({
          merchandiseId: item.merchandiseId,
          quantity: item.quantity,
        })),
      );
      return redirect('/cart');
    }
  }
  return data({error: 'Invalid action'}, {status: 400});
}

export async function loader({request, context}: LoaderFunctionArgs) {
  const {session, storefront} = context;
  const customerAccessToken = await session.get('customerAccessToken');

  if (!customerAccessToken?.accessToken) {
    return redirect('/account/login');
  }

  const paginationVariables = getPaginationVariables(request, {
    pageBy: 20,
  });

  const ordersPromise = (async () => {
    let customer: any = null;
    const token =
      typeof customerAccessToken === 'string'
        ? customerAccessToken
        : customerAccessToken?.accessToken;
    const isFallbackToken =
      !token || token === 'dev-bypass-token' || token.startsWith('session-');

    if (!isFallbackToken) {
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
        customer = result?.customer;
      } catch (e) {
        console.error(
          '[Orders Loader] Storefront query failed, falling back to Admin API:',
          e,
        );
      }
    }

    let mappedOrders: any[] = [];
    const savedPhone = await session.get('loginOtpPhone');
    const savedEmail = (await session.get('loginOtpEmail')) || customer?.email;
    try {
      const {getAdminToken, getAdminDomain} =
        await import('~/lib/shopify-admin.server');
      const adminToken = await getAdminToken(context.env);
      const adminDomain = getAdminDomain(context.env);

      let adminCust: any = null;
      if (savedPhone) {
        const res = await fetch(
          `https://${adminDomain}/admin/api/2024-01/customers/search.json?query=phone:"${encodeURIComponent(savedPhone)}"`,
          {
            headers: {
              'X-Shopify-Access-Token': adminToken,
              'Content-Type': 'application/json',
            },
          },
        );
        if (res.ok) {
          const data = (await res.json()) as any;
          adminCust = (data.customers || []).find((c: any) => {
            const cp = (c.phone || '').replace(/\D/g, '');
            const sp = savedPhone.replace(/\D/g, '');
            if (!cp || !sp) return false;
            return cp === sp || cp.endsWith(sp.slice(-9));
          });
        }
      }
      if (!adminCust && savedEmail) {
        const res = await fetch(
          `https://${adminDomain}/admin/api/2024-01/customers/search.json?query=email:"${encodeURIComponent(savedEmail)}"`,
          {
            headers: {
              'X-Shopify-Access-Token': adminToken,
              'Content-Type': 'application/json',
            },
          },
        );
        if (res.ok) {
          const data = (await res.json()) as any;
          adminCust = (data.customers || []).find(
            (c: any) => c.email && c.email.toLowerCase() === savedEmail.toLowerCase()
          );
        }
      }

      if (adminCust?.id) {
        const ordersRes = await fetch(
          `https://${adminDomain}/admin/api/2024-01/customers/${adminCust.id}/orders.json?status=any`,
          {
            headers: {
              'X-Shopify-Access-Token': adminToken,
              'Content-Type': 'application/json',
            },
          },
        );
        if (ordersRes.ok) {
          const {orders} = (await ordersRes.json()) as any;
          if (orders && orders.length > 0) {
            mappedOrders = orders.map((o: any) => ({
              id: `gid://shopify/Order/${o.id}`,
              orderNumber: o.order_number,
              processedAt: o.processed_at,
              canceledAt: o.canceled_at,
              financialStatus: o.financial_status
                ? o.financial_status.toUpperCase()
                : 'PAID',
              fulfillmentStatus: o.fulfillment_status
                ? o.fulfillment_status.toUpperCase()
                : 'UNFULFILLED',
              totalPrice: {
                amount: String(o.total_price),
                currencyCode: o.currency || 'SAR',
              },
              currentTotalPrice: {
                amount: String(o.total_price),
                currencyCode: o.currency || 'SAR',
              },
              statusUrl: o.order_status_url,
              customAttributes: (o.note_attributes || []).map(
                (attr: any) => ({
                  key: attr.name || attr.key,
                  value: attr.value,
                }),
              ),
              shippingTitle:
                o.shipping_lines?.[0]?.title ||
                o.shipping_lines?.[0]?.code ||
                '',
              shippingAddress: o.shipping_address || null,
              tags: o.tags || '',
              fulfillments: o.fulfillments || [],
              lineItems: {
                nodes: (o.line_items || []).map((li: any) => ({
                  title: li.title,
                  quantity: li.quantity || 1,
                  variantId: li.variant_id,
                  customAttributes: (li.properties || li.custom_attributes || li.customAttributes || []).map((p: any) => ({
                    key: p.name || p.key,
                    value: String(p.value || '')
                  })),
                  originalTotalPrice: {
                    amount: String(li.price),
                    currencyCode: o.currency || 'SAR',
                  },
                  discountedTotalPrice: {
                    amount: String(li.price),
                    currencyCode: o.currency || 'SAR',
                  },
                  variant: {
                    id: li.variant_id
                      ? `gid://shopify/ProductVariant/${li.variant_id}`
                      : undefined,
                    image: null,
                  },
                })),
              },
            }));
          }
        }
      }
    } catch (e) {
      console.error('[Orders Loader] Admin API order fetch failed:', e);
    }

      if (mappedOrders.length > 0) {
        // Enrich line items with translated product titles from Storefront API (@inContext)
        try {
          // Collect all unique variant GIDs across all orders
          const variantIds: string[] = [];
          for (const order of mappedOrders) {
            for (const li of order.lineItems.nodes) {
              if (li.variant?.id && !variantIds.includes(li.variant.id)) {
                variantIds.push(li.variant.id);
              }
            }
          }

          if (variantIds.length > 0) {
            const lang = storefront.i18n.language;
            const country = storefront.i18n.country;
            const variantQuery = `
                query GetVariantTitles($ids: [ID!]!) @inContext(language: ${lang}, country: ${country}) {
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
            const variantResult = (await storefront.query(variantQuery as any, {
              variables: {ids: variantIds},
              cache: storefront.CacheShort(),
            })) as any;

            // Build a map from variant GID → translated product title
            const titleMap: Record<string, string> = {};
            for (const node of variantResult?.nodes || []) {
              if (node?.id && node?.product?.title) {
                titleMap[node.id] = node.product.title;
              }
            }

            // Overwrite line item titles with translated versions
            mappedOrders = mappedOrders.map((order: any) => ({
              ...order,
              lineItems: {
                ...order.lineItems,
                nodes: order.lineItems.nodes.map((li: any) => ({
                  ...li,
                  title:
                    li.variant?.id && titleMap[li.variant.id]
                      ? titleMap[li.variant.id]
                      : li.title,
                  variant: {
                    ...li.variant,
                    product: {
                      title:
                        li.variant?.id && titleMap[li.variant.id]
                          ? titleMap[li.variant.id]
                          : li.title,
                      tags: [],
                    },
                  },
                })),
              },
            }));
          }
        } catch (e) {
          console.warn(
            '[Orders Loader] Could not enrich line item titles with translations:',
            e,
          );
        }

        return {
          nodes: mappedOrders,
          pageInfo: {
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: 'start',
            endCursor: 'end',
          },
        };
      }

    if (customer?.orders?.nodes?.length) {
      try {
        const {getAdminToken, getAdminDomain} =
          await import('~/lib/shopify-admin.server');
        const adminToken = await getAdminToken(context.env);
        const adminDomain = getAdminDomain(context.env);

        const orderNumbers = customer.orders.nodes
          .map((o: any) => o.orderNumber)
          .filter(Boolean);

        if (orderNumbers.length > 0) {
          const nameQuery = orderNumbers.map((n: any) => `name:%23${n}`).join('+OR+');
          const res = await fetch(
            `https://${adminDomain}/admin/api/2024-01/orders.json?name=${nameQuery}&status=any`,
            {
              headers: {
                'X-Shopify-Access-Token': adminToken,
                'Content-Type': 'application/json',
              },
            },
          );
          if (res.ok) {
            const {orders: adminOrders} = (await res.json()) as any;
            if (adminOrders && adminOrders.length > 0) {
              const adminMap = new Map(
                adminOrders.map((o: any) => [String(o.order_number), o]),
              );
              customer.orders.nodes = customer.orders.nodes.map((node: any) => {
                const adminO: any = adminMap.get(String(node.orderNumber));
                if (!adminO) return node;
                return {
                  ...node,
                  tags: adminO.tags || '',
                  fulfillments: adminO.fulfillments || [],
                  shippingTitle: adminO.shipping_lines?.[0]?.title || '',
                  shippingAddress: adminO.shipping_address || node.shippingAddress,
                  customAttributes: (adminO.note_attributes || []).map((a: any) => ({
                    key: a.name || a.key,
                    value: a.value,
                  })),
                  lineItems: {
                    nodes: (node.lineItems?.nodes || []).map((li: any, idx: number) => {
                      const adminLi = adminO.line_items?.[idx] || {};
                      return {
                        ...li,
                        variantId: adminLi.variant_id || li.variant?.id,
                        customAttributes: (
                          adminLi.properties ||
                          adminLi.custom_attributes ||
                          li.customAttributes ||
                          []
                        ).map((p: any) => ({
                          key: p.name || p.key,
                          value: String(p.value || ''),
                        })),
                        variant: {
                          ...li.variant,
                          id: adminLi.variant_id
                            ? `gid://shopify/ProductVariant/${adminLi.variant_id}`
                            : li.variant?.id,
                        },
                      };
                    }),
                  },
                };
              });
            }
          }
        }
      } catch (err) {
        console.error('[Orders Loader] Storefront fallback enrichment error:', err);
      }
    }

    return customer?.orders;
  })();

  return data({
    ordersPromise,
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
  const {ordersPromise} = useLoaderData<typeof loader>();
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
              const counts = {
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
                  <OrdersFilters
                    statusFilter={statusFilter}
                    isEn={isEn}
                    counts={counts}
                  />

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
  const tabs = [
    {
      value: 'all',
      labelEn: `All (${counts.all})`,
      labelAr: `الكل (${counts.all})`,
    },
    {
      value: 'PREORDER',
      labelEn: `Pre-orders (${counts.preorder})`,
      labelAr: `الطلبات المسبقة (${counts.preorder})`,
    },
    {
      value: 'ACTIVE',
      labelEn: `Active (${counts.active})`,
      labelAr: `نشطة (${counts.active})`,
    },
    {
      value: 'FULFILLED',
      labelEn: `Delivered (${counts.fulfilled})`,
      labelAr: `مستلمة (${counts.fulfilled})`,
    },
    {
      value: 'CANCELLED',
      labelEn: `Cancelled (${counts.cancelled})`,
      labelAr: `ملغاة (${counts.cancelled})`,
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
                {isEn ? 'Load More ↓' : 'تحميل المزيد ↓'}
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
  const imageUrl = firstItem?.variant?.image?.url;
  const totalAmount = parseFloat(order.currentTotalPrice?.amount || '0.00');

  // Calculate original total using discountedTotalPrice
  const originalTotal = lineItems.reduce(
    (sum, item) => sum + parseFloat(item.discountedTotalPrice?.amount || '0'),
    0,
  );

  // Parse Date safely
  let dateNode = null;
  if (order.processedAt) {
    const isoDate = order.processedAt.split('T')[0];
    const [yearStr, monthStr, dayStr] = isoDate.split('-');
    if (yearStr && monthStr && dayStr) {
      const dayNum = parseInt(dayStr, 10);
      const arMonths = [
        'يناير',
        'فبراير',
        'مارس',
        'أبريل',
        'مايو',
        'يونيو',
        'يوليو',
        'أغسطس',
        'سبتمبر',
        'أكتوبر',
        'نوفمبر',
        'ديسمبر',
      ];
      const enMonths = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];
      const monthIndex = parseInt(monthStr, 10) - 1;
      const monthEn = enMonths[monthIndex] || '';
      const monthAr = arMonths[monthIndex] || '';

      dateNode = isEn ? (
        <>
          {monthEn} <span className="font-en">{dayNum}</span>,{' '}
          <span className="font-en">{yearStr}</span>
        </>
      ) : (
        <>
          <span className="font-en">{dayNum}</span> {monthAr}{' '}
          <span className="font-en">{yearStr}</span>
        </>
      );
    }
  }

  // Use translated product title (from @inContext) when available; fall back to lineItem.title snapshot
  const getDisplayTitle = (item: any) => {
    const productTitle = item.variant?.product?.title;
    // If product title exists and differs from the line item title (which is always English snapshot), prefer it
    if (productTitle && productTitle.trim()) return productTitle;
    return item.title;
  };
  const titles =
    lineItems.slice(0, 3).map(getDisplayTitle).join(' • ') +
    (lineItems.length > 3 ? '...' : '');

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
  const rawTags = (order as any).tags
    ? typeof (order as any).tags === 'string'
      ? (order as any).tags.split(',').map((t: string) => t.trim().toLowerCase().replace(/[\s]/g, '_'))
      : Array.isArray((order as any).tags)
        ? (order as any).tags.map((t: string) => String(t).trim().toLowerCase().replace(/[\s]/g, '_'))
        : []
    : [];

  const tagSet = new Set(rawTags);

  // Shipment-level statuses from fulfillment records
  const shipmentStatuses = fulfillments
    .map((f: any) => (f.shipment_status || f.shipmentStatus || f.displayStatus || f.status || '').toLowerCase().replace(/[\s]/g, '_'))
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
    hasTag('failure', 'تعذر_التسليم', 'انتهت_مدة_الاستلام') ||
    hasShipment('failure', 'failed', 'attempted_delivery')
  ) {
    statusEn = isPickup ? 'Pickup Period Expired' : 'Delivery Attempt Failed';
    statusAr = isPickup ? 'انتهت مدة الاستلام' : 'تعذر التسليم';
    statusColor = '#E64950';
  } else if (
    fs === 'FULFILLED' ||
    hasTag('delivered', 'picked_up', 'تم_التسليم', 'تم_الاستلام') ||
    hasShipment('delivered', 'picked_up')
  ) {
    statusEn = isPickup ? 'Order Picked Up' : 'Delivered Successfully';
    statusAr = isPickup ? 'تم استلام الطلب' : 'تم التسليم بنجاح';
    statusColor = '#234745';
  } else if (
    hasTag('ready_for_pickup', 'in_transit', 'out_for_delivery', 'جاهز_للاستلام', 'في_الطريق') ||
    hasShipment('ready_for_pickup', 'in_transit', 'out_for_delivery')
  ) {
    statusEn = isPickup ? 'Ready for Pickup' : 'Out for Delivery';
    statusAr = isPickup ? 'الطلب جاهز للاستلام' : 'الطلب في الطريق إليك';
    statusColor = '#004F59';
  } else if (
    fs === 'IN_PROGRESS' ||
    fs === 'PARTIALLY_FULFILLED' ||
    hasTag('in_progress', 'processing', 'جاري_التجهيز') ||
    hasShipment('in_progress', 'label_printed', 'submitted')
  ) {
    statusEn = 'Order is Being Prepared';
    statusAr = 'جاري تجهيز الطلب';
    statusColor = '#906B51';
  } else if (
    hasTag('confirmed', 'تم_التأكيد')
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
            {/* Order ID */}
            <h3
              className="text-[17px] font-bold text-[#171717] leading-tight flex items-center gap-1"
              style={
                !isEn
                  ? {fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif"}
                  : undefined
              }
            >
              {isEn
                ? `Order — #${order.orderNumber}`
                : `آخر طلب — #${order.orderNumber}`}
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
            <img
              src={imageUrl || 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png'}
              alt={firstItem?.title || 'Order thumbnail'}
              className="w-full h-full rounded-[16px] object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png';
              }}
            />
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
  query CustomerOrders(
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
