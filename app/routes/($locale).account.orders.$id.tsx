import { useState } from 'react';
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
    variables: { 
      orderId,
      country: storefront.i18n.country,
      language: storefront.i18n.language,
    },
  });

  if (!order || !('lineItems' in order)) {
    throw new Response('Order not found', { status: 404 });
  }

  const lineItems = flattenConnection(order.lineItems);
  const discountApplications = order.discountApplications?.nodes || [];
  const firstDiscount = discountApplications[0]?.value;
  const discountValue = firstDiscount?.__typename === 'MoneyV2' && firstDiscount;
  const discountPercentage = firstDiscount?.__typename === 'PricingPercentageValue' && firstDiscount?.percentage;

  const customAttributes = order.customAttributes || [];
  const fulfillmentType = customAttributes.find(a => a.key === 'fulfillment_type')?.value || 'Delivery';
  const branchName = customAttributes.find(a => a.key === 'branch_name')?.value;
  
  const rawMetafield = order.order_status?.value || '';
  const metafieldValue = rawMetafield.toLowerCase().trim();
  const isReadyManual = metafieldValue === 'ready' || metafieldValue === 'out_for_delivery';
  const isDeliveredManual = metafieldValue === 'delivered';

  const locale = storefront.i18n.language.toLowerCase();

  return data({
    order,
    lineItems,
    discountValue,
    discountPercentage,
    fulfillmentType,
    branchName,
    rawMetafield,
    isReadyManual,
    isDeliveredManual,
    locale,
  });
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
              {lineItems.map((item, i) => (
                <div key={i} className="order-line-item">
                  <div className="line-item-image">
                    {item.variant?.image && <Image data={item.variant.image} width={80} height={80} />}
                  </div>
                  <div className="line-item-info">
                    <Link to={`/products/${item.variant?.product?.handle}`} className="line-item-name">
                      {item.title}
                    </Link>
                    <div className="line-item-price-qty">
                      <span>{isEn ? 'Qty: ' : 'الكمية: '}{item.quantity}</span>
                      <Money data={item.discountedTotalPrice!} />
                    </div>
                  </div>
                </div>
              ))}
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
        </div>
      </div>

      {/* Debug Footer - Only visible during setup */}
      <div className="mt-12 p-4 bg-gray-50 rounded-lg text-center text-xs text-gray-400 font-mono">
        Debug: Metafield is currently [{rawMetafield}]
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
