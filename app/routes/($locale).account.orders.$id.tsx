import { redirect, type LoaderFunctionArgs } from 'react-router';

export async function loader({ params, context }: LoaderFunctionArgs) {
  if (!params.id) {
    return redirect('/account/orders');
  }

  const locale = context.storefront.i18n.language.toLowerCase();
  const isEn = locale === 'en';
  const orderId = decodeURIComponent(params.id);

  // If it's already a plain order number (e.g. "1010"), redirect directly
  if (/^\d+$/.test(orderId)) {
    return redirect(isEn ? `/en/track-order/${orderId}` : `/track-order/${orderId}`);
  }

  // It's a GID (gid://shopify/Order/12345) — resolve to order number via Admin API
  try {
    const { getAdminToken } = await import('~/lib/shopify-admin.server');
    const adminToken = await getAdminToken(context.env);

    // Extract numeric ID from GID
    const numericId = orderId.split('/').pop();
    const query = `
      query GetOrderName($id: ID!) {
        order(id: $id) {
          name
          orderNumber
        }
      }
    `;

    const res = await fetch(`https://${context.env.PUBLIC_STORE_DOMAIN}/admin/api/2023-10/graphql.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': adminToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables: { id: orderId } }),
    });

    const json = await res.json() as any;
    const orderNumber = json?.data?.order?.orderNumber;

    if (orderNumber) {
      return redirect(isEn ? `/en/track-order/${orderNumber}` : `/track-order/${orderNumber}`);
    }
  } catch (_) {
    // fallback below
  }

  return redirect(isEn ? `/en/account/orders` : `/account/orders`);
}

// Stub export so the route module is valid
export default function OrderRedirect() {
  return null;
}


export async function action({ request, context }: ActionFunctionArgs) {
  return data({ error: 'Invalid intent' }, { status: 400 });
}

export default function OrderRoute() {
  const { order, lineItems, discountValue, discountPercentage, fulfillmentType, branchName, rawMetafield, isReadyManual, isDeliveredManual, locale } = useLoaderData<typeof loader>();
  const isEn = locale === 'en';
  const fetcher = useFetcher<any>();

  const isPickup = fulfillmentType === 'Pickup';
  
  const isDelivered = order.fulfillmentStatus === 'FULFILLED' || isDeliveredManual;
  const isReady = isReadyManual || isDelivered;

  const getStatusLabel = (status: string) => {
    const map: Record<string, any> = {
      FULFILLED: { en: 'Delivered', ar: 'تم التوصيل' },
      UNFULFILLED: { en: 'Processing', ar: 'قيد التنفيذ' },
      PARTIALLY_FULFILLED: { en: 'Ready', ar: 'جاهز' },
    };
    return map[status]?.[isEn ? 'en' : 'ar'] || status;
  };

  const handleReorder = () => {
    const items = lineItems.map(item => ({
      merchandiseId: item.variant?.id,
      quantity: item.quantity,
    }));
    
    const formData = new FormData();
    formData.append('intent', 'reorder');
    formData.append('items', JSON.stringify(items));
    fetcher.submit(formData, { method: 'POST' });
  };

  return (
    <div className="order-details-container animate-fade-in" dir={isEn ? 'ltr' : 'rtl'}>
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
            <span className={`status-badge fulfillment-${order.fulfillmentStatus?.toLowerCase()}`}>
              {getStatusLabel(order.fulfillmentStatus!)}
            </span>
          </div>
        </div>
      </div>

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
            status={isReady ? 'completed' : 'active'} 
          />
          <TimelineStep 
            label={isPickup ? (isEn ? 'Ready for Pickup' : 'جاهز للاستلام') : (isEn ? 'Out for Delivery' : 'جاري التوصيل')} 
            status={isDelivered ? 'completed' : (isReady ? 'active' : 'pending')} 
          />
          <TimelineStep 
            label={isPickup ? (isEn ? 'Picked Up' : 'تم الاستلام') : (isEn ? 'Delivered' : 'تم التوصيل')} 
            status={isDelivered ? 'completed' : 'pending'} 
          />
        </div>
      </div>

      <div className="order-grid">
        <div className="order-main-content">
          <div className="order-card">
            <h3 className="order-card-title">{isEn ? 'Order Items' : 'أصناف الطلب'}</h3>
            <div className="order-line-items">
              {lineItems.map((item: any, i) => {
                const isPreorder = item.variant?.product?.tags?.some((t: string) => t.toLowerCase() === 'pre-order') || item.customAttributes?.some((a: any) => a.key === '_is_preorder' && a.value === 'true');
                const preorderDate = item.customAttributes?.find((a: any) => a.key === 'Pre-order Date' || a.key === 'Availability Date')?.value;
                
                return (
                <div key={i} className="order-line-item">
                  <div className="line-item-image">
                    {item.variant?.image && <Image data={item.variant.image} width={80} height={80} />}
                  </div>
                  <div className="line-item-info">
                    <div className="flex items-center gap-2 mb-1">
                      {isPreorder && (
                        <span className="px-2 py-0.5 bg-[#FEF8EB] text-[#A67B5B] border border-[#A67B5B]/30 rounded text-[11px] font-bold uppercase tracking-wide">
                          {isEn ? 'Pre-order' : 'طلب مسبق'}
                        </span>
                      )}
                    </div>
                    <Link to={`/products/${item.variant?.product?.handle}`} className="line-item-name">
                      {item.title}
                    </Link>
                    {preorderDate && (
                      <div className="text-[12px] text-amber-600 font-bold mb-1">
                        {isEn ? `Available: ${preorderDate}` : `متاح: ${preorderDate}`}
                      </div>
                    )}
                    <div className="line-item-price-qty">
                      <span>{isEn ? 'Qty: ' : 'الكمية: '}{item.quantity}</span>
                      <Money data={item.discountedTotalPrice!} />
                    </div>
                  </div>
                </div>
              )})}
            </div>
          </div>
        </div>

        <div className="order-sidebar">
          <div className="order-card">
            <h3 className="order-card-title">{isEn ? 'Fulfillment' : 'التوصيل والاستلام'}</h3>
            <div className="order-info-group">
              <span className="info-label">{isEn ? 'Method: ' : 'الطريقة: '}</span>
              <span className="info-value">
                {isPickup ? (isEn ? 'Self Pickup' : 'استلام من الفرع') : (isEn ? 'Home Delivery' : 'توصيل للمنزل')}
              </span>
            </div>
            {branchName && (
              <div className="order-info-group mt-2">
                <span className="info-label">{isEn ? 'Branch: ' : 'الفرع: '}</span>
                <span className="info-value">{branchName}</span>
              </div>
            )}
          </div>
          <button className="btn-reorder w-full" onClick={handleReorder}>
            {isEn ? 'Reorder All Items' : 'إعادة طلب الكل'}
          </button>
          {order.financialStatus?.toUpperCase() === 'PAID' && (
            <a 
              href={`/api/invoice/${encodeURIComponent(order.name)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full mt-3 bg-white border border-[#234745] text-[#234745] hover:bg-gray-50 py-3.5 rounded-[25px] font-bold flex items-center justify-center gap-2 transition-all text-[15px] cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {isEn ? 'Download Invoice' : 'تحميل الفاتورة'}
            </a>
          )}
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
  fragment OrderLineItemFull on OrderLineItem {
    title
    quantity
    customAttributes {
      key
      value
    }
    discountedTotalPrice {
      ...OrderMoney
    }
    variant {
      id
      image {
        url
        altText
      }
      product {
        handle
        tags
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
        id
        name
        processedAt
        fulfillmentStatus
        financialStatus
        order_status: metafield(namespace: "custom", key: "order_status") {
          value
        }
        totalTaxV2 { ...OrderMoney }
        totalPriceV2 { ...OrderMoney }
        subtotalPriceV2 { ...OrderMoney }
        customAttributes {
          key
          value
        }
        discountApplications(first: 10) {
          nodes {
            value {
              __typename
              ... on MoneyV2 { ...OrderMoney }
              ... on PricingPercentageValue { percentage }
            }
          }
        }
        lineItems(first: 100) {
          nodes { ...OrderLineItemFull }
        }
      }
    }
  }
` as const;
