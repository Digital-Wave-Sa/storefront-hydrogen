import { data, redirect, type LoaderFunctionArgs, type ActionFunctionArgs } from 'react-router';
import { Link, useLoaderData, useFetcher, type MetaFunction } from 'react-router';
import { Money, Image, flattenConnection } from '@shopify/hydrogen';
import type { OrderLineItemFullFragment } from 'storefrontapi.generated';
import { Button } from '~/components/layout/Button';

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  return [{ title: `Order ${data?.order?.name} | Saadeddin` }];
};

export async function loader({ params, context }: LoaderFunctionArgs) {
  const { session, storefront } = context;

  if (!params.id) {
    return redirect('/account/orders');
  }

  const orderId = atob(params.id);
  const customerAccessToken = await session.get('customerAccessToken');

  if (!customerAccessToken) {
    return redirect('/account/login');
  }

  const { order } = await storefront.query(CUSTOMER_ORDER_QUERY, {
    variables: { orderId },
  });

  if (!order || !('lineItems' in order)) {
    throw new Response('Order not found', { status: 404 });
  }

  const lineItems = flattenConnection(order.lineItems);
  const discountApplications = flattenConnection(order.discountApplications);

  const firstDiscount = discountApplications[0]?.value;
  const discountValue = firstDiscount?.__typename === 'MoneyV2' && firstDiscount;
  const discountPercentage = firstDiscount?.__typename === 'PricingPercentageValue' && firstDiscount?.percentage;

  // Detect fulfillment type and branch from custom attributes
  const customAttributes = order.customAttributes || [];
  const fulfillmentType = customAttributes.find(a => a.key === 'fulfillment_type')?.value || 'Delivery';
  const branchName = customAttributes.find(a => a.key === 'branch_name')?.value;

  const locale = storefront.i18n.language.toLowerCase();

  return data({
    order,
    lineItems,
    discountValue,
    discountPercentage,
    fulfillmentType,
    branchName,
    locale,
  });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { session } = context;
  const form = await request.formData();
  const intent = form.get('intent');

  if (intent === 'reorder') {
    const items = JSON.parse(String(form.get('items') || '[]'));
    // This would typically involve adding items to a cart via an action or returning data to the client
    // For now, we'll return a success and let the client handle it if needed, or redirect to cart
    // BUT the best way is to return the items so the client-side cart can absorb them.
    return data({ success: true, reorderItems: items });
  }

  return data({ error: 'Invalid intent' }, { status: 400 });
};

export default function OrderRoute() {
  const { order, lineItems, discountValue, discountPercentage, fulfillmentType, branchName, locale } = useLoaderData<typeof loader>();
  const isEn = locale === 'en';
  const fetcher = useFetcher();

  // Helper to get localized status
  const getStatusLabel = (status: string) => {
    const map: Record<string, any> = {
      FULFILLED: { en: 'Fulfilled', ar: 'تم التوصيل' },
      UNFULFILLED: { en: 'Processing', ar: 'قيد التنفيذ' },
      PARTIALLY_FULFILLED: { en: 'Partially Fulfilled', ar: 'تم التوصيل جزئياً' },
      PENDING_FULFILLMENT: { en: 'Pending', ar: 'قيد الانتظار' },
      RESTOCKED: { en: 'Restocked', ar: 'تم إرجاع المخزون' },
    };
    return map[status]?.[isEn ? 'en' : 'ar'] || status;
  };

  const getFinancialStatusLabel = (status: string) => {
    const map: Record<string, any> = {
      PAID: { en: 'Paid', ar: 'مدفوع' },
      PENDING: { en: 'Pending', ar: 'قيد الانتظار' },
      REFUNDED: { en: 'Refunded', ar: 'مسترجع' },
      PARTIALLY_REFUNDED: { en: 'Partially Refunded', ar: 'مسترجع جزئياً' },
      AUTHORIZED: { en: 'Authorized', ar: 'مفوض' },
    };
    return map[status]?.[isEn ? 'en' : 'ar'] || status;
  };

  const handleReorder = () => {
    const items = lineItems.map(item => ({
      merchandiseId: item.variant?.id,
      quantity: item.quantity,
    }));
    // In a real app, you'd call a cart API here. 
    // For this UI demo, we'll show we triggered it.
    alert(isEn ? 'Items added to cart!' : 'تمت إضافة المنتجات للسلة!');
  };

  return (
    <div className="order-details-container animate-fade-in" dir={isEn ? 'ltr' : 'rtl'}>
      {/* ── HEADER SECTION ── */}
      <div className="order-header-section">
        <div className="order-title-group">
          <h1>{isEn ? `Order ${order.name}` : `طلب رقم ${order.name}`}</h1>
          <p className="order-date">
            {isEn ? 'Placed on ' : 'تم الطلب في '}
            {new Date(order.processedAt!).toLocaleDateString(isEn ? 'en-US' : 'ar-SA', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
          <div className="order-meta-badges">
            <span className={`status-badge financial-${order.financialStatus?.toLowerCase()}`}>
              {getFinancialStatusLabel(order.financialStatus!)}
            </span>
            <span className={`status-badge fulfillment-${order.fulfillmentStatus?.toLowerCase()}`}>
              {getStatusLabel(order.fulfillmentStatus!)}
            </span>
          </div>
        </div>

        <div className="order-actions-top">
          <button className="btn-outline" onClick={() => window.print()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
            </svg>
            {isEn ? 'Print' : 'طباعة'}
          </button>
        </div>
      </div>

      {/* ── TIMELINE ── */}
      <div className="order-timeline-card">
        <h3 className="order-card-title">{isEn ? 'Order Status' : 'حالة الطلب'}</h3>
        <div className="timeline-steps">
          <TimelineStep 
            label={isEn ? 'Confirmed' : 'تم التأكيد'} 
            status="completed" 
            time={new Date(order.processedAt!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
          />
          <TimelineStep 
            label={isEn ? 'Preparing' : 'قيد التحضير'} 
            status={order.fulfillmentStatus === 'UNFULFILLED' ? 'active' : 'completed'} 
          />
          <TimelineStep 
            label={isEn ? 'Out for Delivery' : 'جاري التوصيل'} 
            status={order.fulfillmentStatus === 'PARTIALLY_FULFILLED' ? 'active' : (order.fulfillmentStatus === 'FULFILLED' ? 'completed' : 'pending')} 
          />
          <TimelineStep 
            label={isEn ? 'Delivered' : 'تم التوصيل'} 
            status={order.fulfillmentStatus === 'FULFILLED' ? 'completed' : 'pending'} 
          />
        </div>
      </div>

      <div className="order-grid">
        {/* ── MAIN CONTENT ── */}
        <div className="order-main-content">
          {/* Items Card */}
          <div className="order-card">
            <h3 className="order-card-title">{isEn ? 'Order Items' : 'أصناف الطلب'}</h3>
            <div className="order-line-items">
              {lineItems.map((item, i) => (
                <div key={i} className="order-line-item">
                  <div className="line-item-image">
                    {item.variant?.image && <Image data={item.variant.image} width={80} height={80} />}
                  </div>
                  <div className="line-item-info">
                    <Link to={`/products/${item.variant?.product?.handle}`} className="line-item-name">
                      {item.title}
                    </Link>
                    <div className="line-item-variant">{item.variant?.title !== 'Default Title' ? item.variant?.title : ''}</div>
                    <div className="line-item-price-qty">
                      <span>{isEn ? 'Qty: ' : 'الكمية: '}{item.quantity}</span>
                      <Money data={item.discountedTotalPrice!} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Summary Card */}
          <div className="order-card">
            <h3 className="order-card-title">{isEn ? 'Payment Summary' : 'ملخص الدفع'}</h3>
            <div className="summary-row">
              <span>{isEn ? 'Subtotal' : 'المجموع الفرعي'}</span>
              <Money data={order.subtotalPriceV2!} />
            </div>
            {discountValue && (
              <div className="summary-row" style={{ color: '#27ae60' }}>
                <span>{isEn ? 'Discounts' : 'الخصومات'}</span>
                <span>-{discountPercentage ? `${discountPercentage}%` : <Money data={discountValue} />}</span>
              </div>
            )}
            <div className="summary-row">
              <span>{isEn ? 'Tax' : 'الضريبة'}</span>
              <Money data={order.totalTaxV2!} />
            </div>
            <div className="summary-row total">
              <span>{isEn ? 'Total' : 'الإجمالي'}</span>
              <Money data={order.totalPriceV2!} />
            </div>
          </div>
        </div>

        {/* ── SIDEBAR ── */}
        <div className="order-sidebar">
          {/* Fulfillment Details */}
          <div className="order-card">
            <h3 className="order-card-title">{isEn ? 'Fulfillment' : 'التوصيل والاستلام'}</h3>
            <div className="order-info-group">
              <span className="info-label">{isEn ? 'Method' : 'الطريقة'}</span>
              <span className="info-value">
                {fulfillmentType === 'Pickup' ? (isEn ? 'Self Pickup' : 'استلام من الفرع') : (isEn ? 'Home Delivery' : 'توصيل للمنزل')}
              </span>
            </div>
            {branchName && (
              <div className="order-info-group">
                <span className="info-label">{isEn ? 'Branch' : 'الفرع'}</span>
                <span className="info-value">{branchName}</span>
              </div>
            )}
            {order.shippingAddress && (
              <div className="order-info-group">
                <span className="info-label">{isEn ? 'Address' : 'العنوان'}</span>
                <address className="info-value">
                  {order.shippingAddress.name}<br />
                  {order.shippingAddress.formatted.join(', ')}
                </address>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="order-card">
            <h3 className="order-card-title">{isEn ? 'Actions' : 'إجراءات'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button className="btn-reorder" onClick={handleReorder}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
                </svg>
                {isEn ? 'Reorder All Items' : 'إعادة طلب الكل'}
              </button>
              
              {order.fulfillmentStatus === 'UNFULFILLED' && (
                <button className="btn-outline btn-cancel" onClick={() => alert(isEn ? 'Contacting support to cancel...' : 'جاري التواصل مع الدعم للإلغاء...')}>
                  {isEn ? 'Cancel Order' : 'إلغاء الطلب'}
                </button>
              )}
              
              <Link to="/pages/contact" className="btn-outline">
                {isEn ? 'Need Help?' : 'تحتاج مساعدة؟'}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineStep({ label, status, time }: { label: string; status: 'completed' | 'active' | 'pending'; time?: string }) {
  return (
    <div className={`timeline-step ${status}`}>
      <div className="step-dot">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <span className="step-label">{label}</span>
      {time && <span className="step-time">{time}</span>}
    </div>
  );
}

const CUSTOMER_ORDER_QUERY = `#graphql
  fragment OrderMoney on MoneyV2 {
    amount
    currencyCode
  }
  fragment AddressFull on MailingAddress {
    address1
    address2
    city
    company
    country
    countryCodeV2
    firstName
    formatted
    id
    lastName
    name
    phone
    province
    provinceCode
    zip
  }
  fragment DiscountApplication on DiscountApplication {
    value {
      __typename
      ... on MoneyV2 {
        ...OrderMoney
      }
      ... on PricingPercentageValue {
        percentage
      }
    }
  }
  fragment OrderLineProductVariant on ProductVariant {
    id
    image {
      altText
      height
      url
      id
      width
    }
    price {
      ...OrderMoney
    }
    product {
      handle
    }
    sku
    title
  }
  fragment OrderLineItemFull on OrderLineItem {
    title
    quantity
    discountAllocations {
      allocatedAmount {
        ...OrderMoney
      }
      discountApplication {
        ...DiscountApplication
      }
    }
    originalTotalPrice {
      ...OrderMoney
    }
    discountedTotalPrice {
      ...OrderMoney
    }
    variant {
      ...OrderLineProductVariant
    }
  }
  fragment Order on Order {
    id
    name
    orderNumber
    statusUrl
    processedAt
    fulfillmentStatus
    financialStatus
    totalTaxV2 {
      ...OrderMoney
    }
    totalPriceV2 {
      ...OrderMoney
    }
    subtotalPriceV2 {
      ...OrderMoney
    }
    shippingAddress {
      ...AddressFull
    }
    customAttributes {
      key
      value
    }
    discountApplications(first: 10) {
      nodes {
        ...DiscountApplication
      }
    }
    lineItems(first: 100) {
      nodes {
        ...OrderLineItemFull
      }
    }
  }
  query Order(
    $country: CountryCode
    $language: LanguageCode
    $orderId: ID!
  ) @inContext(country: $country, language: $language) {
    order: node(id: $orderId) {
      ... on Order {
        ...Order
      }
    }
  }
` as const;





