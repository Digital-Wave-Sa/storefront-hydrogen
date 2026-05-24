import {
  data,
  redirect,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
  type MetaFunction,
} from 'react-router';
import { Link, useLoaderData, useFetcher } from 'react-router';
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
  const url = new URL(request.url);
  const searchTerm = url.searchParams.get('q') || '';
  const statusFilter = url.searchParams.get('status') || 'all';

  const customerAccessToken = await session.get('customerAccessToken');
  if (!customerAccessToken?.accessToken) {
    return redirect('/account/login');
  }

  try {
    const paginationVariables = getPaginationVariables(request, {
      pageBy: 20,
    });

    const { customer } = await storefront.query(CUSTOMER_ORDERS_QUERY, {
      variables: {
        customerAccessToken: customerAccessToken.accessToken,
        country: storefront.i18n.country,
        language: storefront.i18n.language,
        ...paginationVariables,
      },
      cache: storefront.CacheNone(),
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    return data({ 
      customer, 
      searchTerm, 
      statusFilter,
      locale: storefront.i18n.language.toLowerCase()
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return data({ error: error.message }, { status: 400 });
    }
    return data({ error }, { status: 400 });
  }
}

const CurrencyIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 1124.14 1256.39" className={`inline-block fill-current ${className || 'h-3.5 w-auto mb-0.5'}`}>
    <path d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z"></path>
    <path d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z"></path>
  </svg>
);

export default function Orders() {
  const { customer, statusFilter, locale } = useLoaderData<typeof loader>();
  const { orders } = customer;
  const isEn = locale === 'en';

  const counts = {
    all: orders.nodes.length,
    active: orders.nodes.filter((o: any) => o.fulfillmentStatus !== 'FULFILLED' && o.financialStatus !== 'REFUNDED').length,
    fulfilled: orders.nodes.filter((o: any) => o.fulfillmentStatus === 'FULFILLED').length,
    cancelled: orders.nodes.filter((o: any) => o.financialStatus === 'REFUNDED').length,
  };

  return (
    <div className="orders-page-container" dir={isEn ? 'ltr' : 'rtl'}>
      <div className="flex flex-col gap-6">
        <h2 className="text-[28px] font-bold text-[#234745] text-start md:text-end" style={!isEn ? { fontFamily: '"Bahij Janna", sans-serif' } : undefined}>
          {isEn ? 'My Orders' : 'طلباتي'}
        </h2>

        <OrdersFilters 
          statusFilter={statusFilter} 
          isEn={isEn} 
          counts={counts}
        />

        {orders.nodes.length ? (
          <OrdersList 
            orders={orders} 
            statusFilter={statusFilter}
            isEn={isEn}
          />
        ) : (
          <EmptyOrders isEn={isEn} />
        )}
      </div>
    </div>
  );
}

function OrdersFilters({ statusFilter, isEn, counts }: { statusFilter: string, isEn: boolean, counts: any }) {
  const tabs = [
    { value: 'all', labelEn: `All (${counts.all})`, labelAr: `الكل (${counts.all.toLocaleString('ar-EG')})` },
    { value: 'ACTIVE', labelEn: `Active (${counts.active})`, labelAr: `نشطة (${counts.active.toLocaleString('ar-EG')})` },
    { value: 'FULFILLED', labelEn: `Delivered (${counts.fulfilled})`, labelAr: `مستلمة (${counts.fulfilled.toLocaleString('ar-EG')})` },
    { value: 'CANCELLED', labelEn: `Cancelled (${counts.cancelled})`, labelAr: `ملغاة (${counts.cancelled.toLocaleString('ar-EG')})` },
  ];

  return (
    <div className="flex flex-wrap items-center justify-start md:justify-end gap-3 mb-2" dir={isEn ? 'ltr' : 'rtl'}>
      {tabs.map((tab) => {
        const isActive = statusFilter === tab.value || (statusFilter === 'all' && tab.value === 'all');
        return (
          <form key={tab.value} method="get">
            <input type="hidden" name="status" value={tab.value} />
            <button 
              type="submit"
              className={`px-5 py-2 rounded-full text-[14px] font-bold transition-all border ${
                isActive 
                  ? 'bg-[#A8BDB5] text-[#1a3b3a] border-[#A8BDB5]' 
                  : 'bg-white text-[#A8BDB5] border-[#EAF2F1] hover:border-[#A8BDB5]'
              }`}
            >
              {isEn ? tab.labelEn : tab.labelAr}
            </button>
          </form>
        );
      })}
    </div>
  );
}

function OrdersList({ orders, statusFilter, isEn }: { orders: any, statusFilter: string, isEn: boolean }) {
  const filteredNodes = (orders.nodes || []).filter((order: OrderItemFragment) => {
    if (statusFilter === 'ACTIVE') return order.fulfillmentStatus !== 'FULFILLED' && order.financialStatus !== 'REFUNDED';
    if (statusFilter === 'FULFILLED') return order.fulfillmentStatus === 'FULFILLED';
    if (statusFilter === 'CANCELLED') return order.financialStatus === 'REFUNDED';
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
  const dateObj = new Date(order.processedAt);
  const day = isEn ? dateObj.getDate() : dateObj.getDate().toLocaleString('ar-EG');
  const year = isEn ? dateObj.getFullYear() : dateObj.getFullYear().toLocaleString('ar-EG');
  const monthEn = dateObj.toLocaleDateString('en-US', { month: 'long' });
  const monthAr = dateObj.toLocaleDateString('ar-SA', { month: 'long' });
  const dateStr = isEn ? `${monthEn} ${day}, ${year}` : `${day} ${monthAr} ${year}`;

  const lineItems = order.lineItems.nodes;
  const productCount = lineItems.length;
  const firstItem = lineItems[0];
  const imageUrl = firstItem?.variant?.image?.url || "https://cdn.shopify.com/s/files/1/0809/4209/4648/files/cake-slice.jpg?v=1710400000";
  const totalAmount = order.currentTotalPrice?.amount || "0.00";
  const orderIdEncoded = typeof btoa !== 'undefined' ? btoa(order.id) : '';

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
  
  if (order.fulfillmentStatus === 'FULFILLED') {
     statusEn = 'Delivered';
     statusAr = 'تم التسليم';
     statusColor = '#234745';
  } else if (order.financialStatus === 'REFUNDED' || order.fulfillmentStatus === 'CANCELLED') {
     statusEn = 'Cancelled';
     statusAr = 'ملغاه';
     statusColor = '#e74c3c'; // Red
  }

  return (
    <div className="bg-white border border-[#9FB7AE] rounded-[12px] p-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 w-full">
        
        {/* Right side (Order Details in RTL) */}
        <div className="flex items-center gap-4 text-start w-full md:w-auto">
          <div className="relative flex-shrink-0">
            <img 
              src={imageUrl}
              alt="Product" 
              className="w-[90px] h-[70px] rounded-[12px] object-cover border border-gray-100"
            />
            <div className="absolute -top-2 -start-2 w-6 h-6 bg-[#234745] text-white rounded-full flex items-center justify-center text-[11px] font-bold border-2 border-white">
              {isEn ? productCount : productCount.toLocaleString('ar-EG')}
            </div>
          </div>
          <div className="flex flex-col gap-1 items-start w-full">
            <span className="text-[11px] text-[#A6BFB9] font-medium leading-tight tracking-wider uppercase mb-1">
              #{isEn ? order.orderNumber : order.orderNumber.toLocaleString('ar-EG', { useGrouping: false })}
            </span>
            <h3 className="text-[14px] md:text-[15px] font-bold text-[#234745] leading-none mb-1" style={!isEn ? { fontFamily: '"Bahij Janna", sans-serif' } : undefined}>
              {titles}
            </h3>
            <p className="text-[12px] text-[#A6BFB9] font-medium leading-tight">
              {dateStr}
            </p>
            <div className="flex items-center justify-start gap-1.5 mt-1">
               <span className="text-[#234745]"><CurrencyIcon className="h-4 w-auto" /></span>
               <span className="text-[16px] font-bold text-[#234745] leading-none" style={!isEn ? { fontFamily: '"GE Dinar One", sans-serif' } : undefined}>
                 {isEn ? totalAmount : parseFloat(totalAmount).toLocaleString('ar-EG')}
               </span>
            </div>
          </div>
        </div>

        {/* Left side (Status & Actions in RTL) */}
        <div className="flex flex-col items-start md:items-end gap-3 w-full md:w-auto mt-4 md:mt-0 border-t border-gray-100 md:border-none pt-4 md:pt-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold" style={{ color: statusColor, ...(!isEn ? { fontFamily: '"Bahij Janna", sans-serif' } : {}) }}>
              {isEn ? statusEn : statusAr}
            </span>
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Link 
              to={isEn ? `/en/account/orders/${orderIdEncoded}` : `/account/orders/${orderIdEncoded}`}
              className="flex-1 md:flex-none text-center px-6 py-2 border border-[#234745] text-[#234745] rounded-[24px] text-[13px] font-bold hover:bg-gray-50 transition-all"
            >
              {isEn ? 'Track / Invoice' : 'الفاتورة'}
            </Link>
            <button 
              onClick={handleReorder}
              disabled={fetcher.state !== 'idle'}
              className="flex-1 md:flex-none text-center px-6 py-2 bg-[#234745] text-white rounded-[24px] text-[13px] font-bold hover:opacity-90 transition-all disabled:opacity-70"
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
      <h3 className="text-[18px] font-bold text-[#234745] mt-4" style={!isEn ? { fontFamily: '"Bahij Janna", sans-serif' } : undefined}>
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
    id
    lineItems(first: 10) {
      nodes {
        title
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





