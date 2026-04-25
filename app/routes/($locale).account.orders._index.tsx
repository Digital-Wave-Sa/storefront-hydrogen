import { Link, useLoaderData } from 'react-router';
import { Money, Pagination, getPaginationVariables } from '@shopify/hydrogen';
import {
  data,
  redirect,
  type LoaderFunctionArgs,
  type MetaFunction,
} from 'react-router';
import type {
  CustomerOrdersFragment,
  OrderItemFragment,
} from 'storefrontapi.generated';
import { Button } from '~/components/layout/Button';

export const meta: MetaFunction<typeof loader> = () => {
  return [{ title: 'طلباتي | Saadeddin' }];
};

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

export default function Orders() {
  const { customer, searchTerm, statusFilter, locale } = useLoaderData<typeof loader>();
  const { orders, numberOfOrders } = customer;
  const isEn = locale === 'en';

  return (
    <div className="orders-page-container" dir={isEn ? 'ltr' : 'rtl'}>
      <div className="orders-header-row">
        <h2 className="account-heading !mb-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="24" height="24">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8" />
            <path d="M12 17v4" />
          </svg>
          {isEn ? 'My Orders' : 'طلباتي'} 
          <span className="text-gray-400 text-sm font-medium mx-2">({numberOfOrders})</span>
        </h2>
      </div>

      <OrdersFilters 
        searchTerm={searchTerm} 
        statusFilter={statusFilter} 
        isEn={isEn} 
      />

      {orders.nodes.length ? (
        <OrdersList 
          orders={orders} 
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          isEn={isEn}
        />
      ) : (
        <EmptyOrders isEn={isEn} />
      )}
    </div>
  );
}

function OrdersFilters({ searchTerm, statusFilter, isEn }: { searchTerm: string, statusFilter: string, isEn: boolean }) {
  return (
    <div className="orders-filters-bar">
      <div className="search-input-wrapper">
        <form method="get">
          <input 
            type="text" 
            name="q" 
            defaultValue={searchTerm}
            placeholder={isEn ? "Search by order number..." : "البحث برقم الطلب..."} 
          />
          <div className="search-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </div>
          {statusFilter !== 'all' && <input type="hidden" name="status" value={statusFilter} />}
        </form>
      </div>

      <div className="filter-wrapper">
        <form method="get" id="statusFilterForm">
          {searchTerm && <input type="hidden" name="q" value={searchTerm} />}
          <select 
            name="status" 
            className="filter-select"
            defaultValue={statusFilter}
            onChange={(e) => e.target.form?.submit()}
          >
            <option value="all">{isEn ? 'All Status' : 'كل الحالات'}</option>
            <option value="PAID">{isEn ? 'Paid' : 'مدفوع'}</option>
            <option value="PENDING">{isEn ? 'Pending' : 'قيد الانتظار'}</option>
            <option value="FULFILLED">{isEn ? 'Fulfilled' : 'تم التوصيل'}</option>
            <option value="PREORDER">{isEn ? 'Pre-orders' : 'طلبات مسبقة'}</option>
          </select>
        </form>
      </div>
    </div>
  );
}

function OrdersList({ orders, searchTerm, statusFilter, isEn }: { orders: any, searchTerm: string, statusFilter: string, isEn: boolean }) {
  const filteredNodes = (orders.nodes || []).filter((order: OrderItemFragment) => {
    if (searchTerm && !order.orderNumber.toString().includes(searchTerm)) return false;
    if (statusFilter !== 'all') {
       if (statusFilter === 'PAID' && order.financialStatus !== 'PAID') return false;
       if (statusFilter === 'FULFILLED' && order.fulfillmentStatus !== 'FULFILLED') return false;
       if (statusFilter === 'PREORDER') {
          const hasPreorder = order.lineItems.nodes.some((item: any) => 
            item.variant?.product?.tags?.some((tag: string) => 
              ['preorder', 'pre-order', 'طلب مسبق'].includes(tag.toLowerCase())
            )
          );
          if (!hasPreorder) return false;
       }
    }
    return true;
  });

  if (filteredNodes.length === 0) {
    return (
      <div className="py-20 text-center bg-white rounded-2xl border border-dashed border-gray-200">
        <p className="text-gray-500">{isEn ? "No orders match your filters." : "لا توجد طلبات تطابق اختياراتك."}</p>
        <Link to="/account/orders" className="text-[#1b3d2e] font-bold underline mt-4 inline-block">
           {isEn ? "Clear filters" : "مسح التصفية"}
        </Link>
      </div>
    );
  }

  return (
    <div className="acccount-orders-list">
      <Pagination connection={{...orders, nodes: filteredNodes}}>
        {({ nodes, isLoading, PreviousLink, NextLink }) => (
          <>
            <div className="flex justify-center mb-6">
              <PreviousLink className="pagination-link">{isEn ? '↑ Previous' : '↑ السابق'}</PreviousLink>
            </div>
            
            <div className="grid gap-6">
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
  const dateStr = new Date(order.processedAt).toLocaleDateString(isEn ? 'en-US' : 'ar-SA', {
    month: 'long', day: 'numeric', year: 'numeric'
  });

  const lineItems = order.lineItems.nodes;

  return (
    <div className="order-card">
      <div className="order-card-header">
        <div className="order-info-left">
          <span className="order-id-label">{isEn ? 'Order' : 'طلب'} #{order.orderNumber}</span>
          <span className="order-date-label">{dateStr}</span>
        </div>
        <div className="hidden sm:block">
           <Link to={`/account/orders/${order.id}`} className="view-btn-v2">
             {isEn ? 'View Details' : 'عرض التفاصيل'}
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
             </svg>
           </Link>
        </div>
      </div>
      
      <div className="order-card-body">
        <div className="order-items-preview hide-scrollbars">
          {lineItems.map((item, idx) => (
            <div key={idx} className="order-item-thumb group relative">
              {item.variant?.image ? (
                <img src={item.variant.image.url} alt={item.variant.image.altText || item.title} />
              ) : (
                <div className="w-full h-full bg-gray-50 flex items-center justify-center text-[10px] text-gray-300">N/A</div>
              )}
            </div>
          ))}
          {lineItems.length > 5 && (
            <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-gray-50 border border-dashed border-gray-200 text-xs text-gray-400 font-bold">
              +{lineItems.length - 5}
            </div>
          )}
        </div>

        <div className="order-stats">
          <div className="order-status-badges">
            <span className={`badge-v2 ${order.financialStatus === 'PAID' ? 'badge-paid' : 'badge-unpaid'}`}>
              {isEn ? order.financialStatus : (order.financialStatus === 'PAID' ? 'مدفوع' : 'معلق')}
            </span>
            <span className={`badge-v2 ${order.fulfillmentStatus === 'FULFILLED' ? 'badge-fulfilled' : 'badge-unfulfilled'}`}>
              {isEn ? order.fulfillmentStatus : (order.fulfillmentStatus === 'FULFILLED' ? 'تم التوصيل' : 'قيد المعالجة')}
            </span>
          </div>
          <div className="order-price-val">
            <Money data={order.currentTotalPrice} />
          </div>
          <div className="sm:hidden w-full mt-2">
            <Link to={`/account/orders/${order.id}`} className="view-btn-v2 w-full justify-center">
               {isEn ? 'View Details' : 'عرض التفاصيل'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyOrders({ isEn }: { isEn: boolean }) {
  return (
    <div className="empty-orders-card bg-white rounded-3xl border border-dashed border-gray-200 mt-8">
      <div className="empty-icon opacity-50">
        <svg fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" width="80" height="80">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
      </div>
      <h3 className="text-2xl font-bold text-[#1b3d2e] mt-6">
        {isEn ? "No order history yet" : "لا توجد طلبات سابقة"}
      </h3>
      <p className="text-gray-500 max-w-sm mx-auto mt-2">
        {isEn ? "You haven't placed any orders yet. Start your sweet journey today!" : "لم تقم بالطلب حتى الآن. ابدأ رحلتك السعيدة معنا اليوم!"}
      </p>
      <Link to="/collections" className="mt-8">
        <Button variant="primary" size="lg">
           {isEn ? "Start Shopping" : "ابدأ التسوق الآن"}
        </Button>
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
        hasNextPage
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





