import {
  data,
  redirect,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  type MetaFunction,
} from 'react-router';
import { Suspense } from 'react';
import { Link, useLoaderData, useFetcher, useOutletContext, useSearchParams, Await } from 'react-router';
import { Money, Pagination, getPaginationVariables } from '@shopify/hydrogen';
import type {
  CustomerOrdersFragment,
  OrderItemFragment,
} from 'storefrontapi.generated';
import { Button } from '~/components/layout/Button';

export const meta: MetaFunction<typeof loader> = () => {
  return [{ title: 'طلباتي | Saadeddin' }];
};

export async function action({ request, context }: ActionFunctionArgs) {
  const { session, cart } = context;
  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'reorder') {
    const items = JSON.parse(String(formData.get('items') || '[]'));
    if (items.length > 0) {
      await cart.addLines(items.map((item: any) => ({
        merchandiseId: item.merchandiseId,
        quantity: item.quantity,
      })));
      return redirect('/cart');
    }
  }
  return data({ error: 'Invalid action' }, { status: 400 });
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { session, storefront } = context;
  const customerAccessToken = await session.get('customerAccessToken');

  if (!customerAccessToken?.accessToken) {
    return redirect('/account/login');
  }

  const paginationVariables = getPaginationVariables(request, {
    pageBy: 20,
  });

  const ordersPromise = (async () => {
    let customer: any = null;
    if (process.env.NODE_ENV === 'development' && customerAccessToken.accessToken === 'dev-bypass-token') {
      let mappedOrders: any[] = [];
      const savedPhone = await session.get('loginOtpPhone');
      if (savedPhone) {
        try {
          const { getAdminToken } = await import('~/lib/shopify-admin.server');
          const adminToken = await getAdminToken(context.env);
          const queryStr = savedPhone.includes('590910042') 
            ? encodeURIComponent('email:"motasem.udeh@gmail.com"')
            : encodeURIComponent(`phone:"${savedPhone}"`);
          const res = await fetch(`https://${context.env.PUBLIC_STORE_DOMAIN}/admin/api/2023-04/customers/search.json?query=${queryStr}`, {
            headers: { 'X-Shopify-Access-Token': adminToken, 'Content-Type': 'application/json' },
          });
          const { customers } = await res.json();
          if (customers && customers.length > 0) {
            const adminCust = customers[0];
            const ordersRes = await fetch(`https://${context.env.PUBLIC_STORE_DOMAIN}/admin/api/2023-04/customers/${adminCust.id}/orders.json?status=any`, {
              headers: { 'X-Shopify-Access-Token': adminToken, 'Content-Type': 'application/json' },
            });
            const { orders } = await ordersRes.json();
            if (orders) {
              mappedOrders = orders.map((o: any) => ({
                id: `gid://shopify/Order/${o.id}`,
                orderNumber: o.order_number,
                processedAt: o.processed_at,
                canceledAt: o.canceled_at,
                financialStatus: o.financial_status ? o.financial_status.toUpperCase() : 'PAID',
                fulfillmentStatus: o.fulfillment_status ? o.fulfillment_status.toUpperCase() : 'UNFULFILLED',
                totalPrice: { amount: o.total_price, currencyCode: o.currency },
                currentTotalPrice: { amount: o.total_price, currencyCode: o.currency },
                statusUrl: o.order_status_url,
                lineItems: {
                  nodes: o.line_items.map((li: any) => ({
                    title: li.title,
                    quantity: li.quantity,
                    originalTotalPrice: { amount: li.price, currencyCode: o.currency },
                    variant: {
                      id: li.variant_id ? `gid://shopify/ProductVariant/${li.variant_id}` : undefined,
                      image: null
                    }
                  }))
                }
              }));
            }
          }
        } catch (e) {
          console.error('Failed to fetch real orders in dev bypass', e);
        }
      }
      customer = {
        orders: { 
          nodes: mappedOrders, 
          pageInfo: { 
            hasNextPage: false, 
            hasPreviousPage: false,
            startCursor: "start",
            endCursor: "end"
          } 
        }
      };
    } else {
      const result = await storefront.query(CUSTOMER_ORDERS_QUERY, {
        variables: {
          customerAccessToken: customerAccessToken.accessToken,
          country: storefront.i18n.country,
          language: storefront.i18n.language,
          ...paginationVariables,
        },
        cache: storefront.CacheNone(),
      });
      customer = result.customer;
    }
    return customer?.orders;
  })();

  return data({ 
    ordersPromise,
  });
}

const CurrencyIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 1124.14 1256.39" className={`inline-block fill-current ${className || 'h-3.5 w-auto mb-0.5'}`}>
    <path d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z"></path>
    <path d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z"></path>
  </svg>
);


export default function Orders() {
  const { ordersPromise } = useLoaderData<typeof loader>();
  const { locale } = useOutletContext<{ locale: string }>();
  const [searchParams] = useSearchParams();
  const statusFilter = searchParams.get('status') || 'all';
  const isEn = locale === 'en';

  return (
    <div className="orders-page-container" dir={isEn ? 'ltr' : 'rtl'}>
      <div className="flex flex-col gap-6">
        <h2 className="text-[28px] font-bold text-[#234745] text-start" style={!isEn ? { fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" } : undefined}>
          {isEn ? 'My Orders' : 'طلباتي'}
        </h2>

        <Suspense fallback={<div className="py-20 text-center text-gray-500">{isEn ? 'Loading orders...' : 'جاري تحميل الطلبات...'}</div>}>
          <Await resolve={ordersPromise}>
            {(orders) => {
              const counts = {
                all: orders?.nodes?.length || 0,
                active: orders?.nodes?.filter((o: any) => o.fulfillmentStatus !== 'FULFILLED' && !o.canceledAt && o.financialStatus !== 'REFUNDED').length || 0,
                fulfilled: orders?.nodes?.filter((o: any) => o.fulfillmentStatus === 'FULFILLED' && !o.canceledAt).length || 0,
                cancelled: orders?.nodes?.filter((o: any) => o.canceledAt || o.financialStatus === 'REFUNDED').length || 0,
                preorder: orders?.nodes?.filter((o: any) => o.lineItems?.nodes?.some((li: any) => li.variant?.product?.tags?.some((t: string) => t.toLowerCase() === 'pre-order') || li.customAttributes?.some((a: any) => a.key === '_is_preorder' && a.value === 'true'))).length || 0,
              };
              
              return (
                <>
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
                </>
              )
            }}
          </Await>
        </Suspense>
      </div>
    </div>
  );
}

function OrdersFilters({ statusFilter, isEn, counts }: { statusFilter: string, isEn: boolean, counts: any }) {
  const tabs = [
    { value: 'all', labelEn: `All (${counts.all})`, labelAr: `الكل (${counts.all})` },
    { value: 'PREORDER', labelEn: `Pre-orders (${counts.preorder})`, labelAr: `الطلبات المسبقة (${counts.preorder})` },
    { value: 'ACTIVE', labelEn: `Active (${counts.active})`, labelAr: `نشطة (${counts.active})` },
    { value: 'FULFILLED', labelEn: `Delivered (${counts.fulfilled})`, labelAr: `مستلمة (${counts.fulfilled})` },
    { value: 'CANCELLED', labelEn: `Cancelled (${counts.cancelled})`, labelAr: `ملغاة (${counts.cancelled})` },
  ];

  return (
    <div className="-mx-4 px-4 md:mx-0 md:px-0 mb-4" dir={isEn ? 'ltr' : 'rtl'}>
      <div className="flex flex-row overflow-x-auto hide-scrollbar items-center justify-start gap-3 pb-2 w-full snap-x">
        {tabs.map((tab) => {
          const isActive = statusFilter === tab.value || (statusFilter === 'all' && tab.value === 'all');
          return (
            <form key={tab.value} method="get" className="shrink-0 snap-start">
              <input type="hidden" name="status" value={tab.value} />
              <button 
                type="submit"
                className={`px-5 py-2.5 rounded-full text-[14px] font-bold transition-all border whitespace-nowrap ${
                  isActive 
                    ? 'bg-[#234745] text-white border-[#234745]' 
                    : 'bg-white text-[#A8BDB5] border-[#EAF2F1] hover:border-[#A8BDB5]'
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

function OrdersList({ orders, statusFilter, isEn }: { orders: any, statusFilter: string, isEn: boolean }) {
  const filteredNodes = (orders.nodes || []).filter((order: OrderItemFragment) => {
    const isCancelled = !!(order as any).canceledAt || order.financialStatus === 'REFUNDED';
    if (statusFilter === 'ACTIVE') return order.fulfillmentStatus !== 'FULFILLED' && !isCancelled;
    if (statusFilter === 'FULFILLED') return order.fulfillmentStatus === 'FULFILLED' && !isCancelled;
    if (statusFilter === 'CANCELLED') return isCancelled;
    if (statusFilter === 'PREORDER') return (order as any).lineItems.nodes.some((li: any) => li.variant?.product?.tags?.some((t: string) => t.toLowerCase() === 'pre-order') || li.customAttributes?.some((a: any) => a.key === '_is_preorder' && a.value === 'true'));
    return true;
  });

  if (filteredNodes.length === 0) {
    return (
      <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-gray-200">
        <p className="text-gray-500">{isEn ? "No orders match your filters." : "لا توجد طلبات تطابق اختياراتك."}</p>
        <Link to="/account/orders" className="text-[#234745] font-bold underline mt-4 inline-block">
           {isEn ? "Clear filters" : "مسح التصفية"}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Pagination connection={{...orders, nodes: filteredNodes}}>
        {({ nodes, isLoading, PreviousLink, NextLink }) => (
          <>
            <div className="flex justify-center mb-6">
              <PreviousLink className="pagination-link">{isEn ? '↑ Previous' : '↑ السابق'}</PreviousLink>
            </div>
            
            <div className="flex flex-col gap-4">
              {nodes.map((order) => (
                <OrderCard key={order.id} order={order} isEn={isEn} />
              ))}
            </div>

            <div className="flex justify-center mt-8">
              <NextLink className="pagination-link">{isEn ? 'Load More ↓' : 'تحميل المزيد ↓'}</NextLink>
            </div>
          </>
        )}
      </Pagination>
    </div>
  );
}

function OrderCard({ order, isEn }: { order: OrderItemFragment, isEn: boolean }) {
  const fetcher = useFetcher();
  // We specify a fixed layout format like the screenshot
  const isoDate = order.processedAt.split('T')[0];
  const [yearStr, monthStr, dayStr] = isoDate.split('-');
  const dayNum = parseInt(dayStr, 10);
  const yearNum = parseInt(yearStr, 10);
  const arMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const enMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthIndex = parseInt(monthStr, 10) - 1;
  const monthEn = enMonths[monthIndex];
  const monthAr = arMonths[monthIndex];
  
  const day = dayNum;
  const year = yearStr;
  const dateNode = isEn 
    ? <>{monthEn} <span className="font-en">{day}</span>, <span className="font-en">{year}</span></>
    : <><span className="font-en">{day}</span> {monthAr} <span className="font-en">{year}</span></>;

  const lineItems = order.lineItems.nodes;
  const productCount = lineItems.length;
  const firstItem = lineItems[0];
  const imageUrl = firstItem?.variant?.image?.url;
  const totalAmount = order.currentTotalPrice?.amount || "0.00";
  const orderIdEncoded = encodeURIComponent(order.id);

  const titles = lineItems.slice(0, 3).map(item => item.title).join(' • ') + (lineItems.length > 3 ? '...' : '');

  const handleReorder = (e: React.MouseEvent) => {
    e.preventDefault();
    const items = lineItems.map(item => ({
      merchandiseId: item.variant?.id,
      quantity: 1, 
    }));
    
    const formData = new FormData();
    formData.append('intent', 'reorder');
    formData.append('items', JSON.stringify(items));
    fetcher.submit(formData, { method: 'POST' });
  };

  let statusEn = 'On its way to you';
  let statusAr = 'في الطريق إليك';
  let statusColor = '#234745'; // Dark green
  
  if ((order as any).canceledAt || order.financialStatus === 'REFUNDED' || order.fulfillmentStatus === 'CANCELLED') {
     statusEn = 'Cancelled';
     statusAr = 'ملغاه';
     statusColor = '#e74c3c'; // Red
  } else if (order.fulfillmentStatus === 'FULFILLED') {
     statusEn = 'Delivered';
     statusAr = 'تم التسليم';
     statusColor = '#234745';
  }

  const isCancelled = !!((order as any).canceledAt || order.financialStatus === 'REFUNDED' || order.fulfillmentStatus === 'CANCELLED');

  return (
    <div className="bg-white border border-[#9FB7AE] rounded-[12px] p-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 w-full">
        
        {/* Right side (Order Details in RTL) */}
        <div className="flex items-center gap-4 text-start w-full md:w-auto">
          <div className="relative flex-shrink-0">
            {imageUrl ? (
              <img 
                src={imageUrl}
                alt="Product" 
                className="w-[90px] h-[70px] rounded-[12px] object-cover border border-gray-100"
              />
            ) : (
              <div className="w-[90px] h-[70px] bg-gray-50 rounded-[12px] border border-gray-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            <div className="absolute -top-2 -start-2 w-6 h-6 bg-[#234745] text-white rounded-full flex items-center justify-center text-[11px] font-bold border-2 border-white font-en">
              {productCount.toLocaleString('en-US')}
            </div>
          </div>
          <div className="flex flex-col gap-1 items-start w-full">
            <span className="text-[11px] text-[#A6BFB9] font-medium leading-tight tracking-wider uppercase mb-1 font-en" dir="ltr">
              #{order.orderNumber}
            </span>
            <h3 className="text-[14px] md:text-[15px] font-bold text-[#234745] leading-none mb-1" style={!isEn ? { fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" } : undefined}>
              {titles}
            </h3>
            <p className="text-[12px] text-[#A6BFB9] font-medium leading-tight flex items-center gap-1" dir={isEn ? 'ltr' : 'rtl'}>
              {dateNode}
            </p>
            <div className="flex items-center justify-start gap-1.5 mt-1">
               <span className="text-[#234745]"><CurrencyIcon className="h-4 w-auto" /></span>
               <span className="text-[16px] font-bold text-[#234745] leading-none font-en" dir="ltr">
                 {parseFloat(totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
               </span>
            </div>
          </div>
        </div>

        {/* Left side (Status & Actions in RTL) */}
        <div className="flex flex-col items-start md:items-end gap-3 w-full md:w-auto mt-4 md:mt-0 border-t border-gray-100 md:border-none pt-4 md:pt-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold" style={{ color: statusColor, ...(!isEn ? { fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" } : {}) }}>
              {isEn ? statusEn : statusAr}
            </span>
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
              {isCancelled ? (
                <span className="flex-1 md:flex-none text-center px-6 py-2 border border-gray-200 text-gray-400 bg-gray-50 rounded-[24px] text-[13px] font-bold cursor-not-allowed">
                  {isEn ? 'Track / Invoice' : 'الفاتورة'}
                </span>
              ) : (
                <Link 
                  to={isEn ? `/en/track-order/${order.orderNumber}` : `/track-order/${order.orderNumber}`}
                  className="flex-1 md:flex-none text-center px-6 py-2 border border-[#234745] text-[#234745] rounded-[24px] text-[13px] font-bold hover:bg-gray-50 transition-all"
                >
                  {isEn ? 'Track / Invoice' : 'الفاتورة'}
                </Link>
              )}
            <button 
              onClick={handleReorder}
              disabled={fetcher.state !== 'idle'}
              className="flex-1 md:flex-none text-center px-6 py-2 bg-[#234745] text-white rounded-[24px] text-[13px] font-bold hover:opacity-90 transition-all disabled:opacity-70"
              style={{ color: '#FFFFFF' }}
            >
              {fetcher.state !== 'idle' ? (isEn ? 'Adding...' : 'جاري...') : (isEn ? 'Reorder' : 'إعادة الطلب')}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

function EmptyOrders({ isEn }: { isEn: boolean }) {
  return (
    <div className="empty-orders-card bg-white rounded-[12px] border border-[#9FB7AE] mt-8 text-center py-16">
      <div className="empty-icon opacity-50 flex justify-center">
        <svg fill="none" stroke="#A6BFB9" strokeWidth="1.5" viewBox="0 0 24 24" width="60" height="60">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
      </div>
      <h3 className="text-[18px] font-bold text-[#234745] mt-4" style={!isEn ? { fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" } : undefined}>
        {isEn ? "No order history yet" : "لا توجد طلبات سابقة"}
      </h3>
      <Link to="/collections" className="mt-6 inline-block px-8 py-3 bg-[#234745] text-white rounded-[24px] text-[13px] font-bold hover:opacity-90">
         {isEn ? "Start Shopping" : "ابدأ التسوق الآن"}
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
    lineItems(first: 10) {
      nodes {
        title
        customAttributes {
          key
          value
        }
        variant {
          image {
            url
            altText
            height
            width
          }
          product {
            tags
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





