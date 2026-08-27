import {
  data as json,
  type LoaderFunctionArgs,
  useLoaderData,
  useNavigate,
  Form,
  Link,
} from 'react-router';
import {useState} from 'react';

function mapRestOrderToNode(rawRest: any) {
  return {
    id: `gid://shopify/Order/${rawRest.id}`,
    name: `#${rawRest.order_number}`,
    processedAt: rawRest.processed_at,
    canceledAt: rawRest.cancelled_at,
    displayFinancialStatus: rawRest.financial_status
      ? rawRest.financial_status.toUpperCase()
      : 'PAID',
    displayFulfillmentStatus: rawRest.fulfillment_status
      ? rawRest.fulfillment_status.toUpperCase()
      : 'UNFULFILLED',
    statusPageUrl: rawRest.order_status_url,
    totalPriceSet: {shopMoney: {amount: String(rawRest.total_price || '0')}},
    subtotalPriceSet: {
      shopMoney: {amount: String(rawRest.subtotal_price || '0')},
    },
    totalTaxSet: {shopMoney: {amount: String(rawRest.total_tax || '0')}},
    totalShippingPriceSet: {
      shopMoney: {amount: String(rawRest.shipping_lines?.[0]?.price || '0')},
    },
    paymentGatewayNames:
      rawRest.payment_gateway_names ||
      (rawRest.payment_details?.credit_card_company
        ? [rawRest.payment_details.credit_card_company]
        : ['Credit Card']),
    shippingLine: {title: rawRest.shipping_lines?.[0]?.title || ''},
    shippingAddress: rawRest.shipping_address
      ? {
          address1: rawRest.shipping_address.address1,
          city: rawRest.shipping_address.city,
        }
      : null,
    customAttributes: (rawRest.note_attributes || []).map((attr: any) => ({
      key: attr.name || attr.key,
      value: attr.value,
    })),
    fulfillments: (rawRest.fulfillments || []).map((f: any) => ({
      status: f.status ? f.status.toUpperCase() : '',
      displayStatus: f.shipment_status
        ? f.shipment_status.toUpperCase()
        : f.status === 'success'
          ? 'FULFILLED'
          : '',
    })),
    fulfillmentOrders: {edges: []},
    tags: rawRest.tags || '',
    order_status: {value: rawRest.tags || ''},
    lineItems: {
      edges: (rawRest.line_items || []).map((item: any) => ({
        node: {
          title: item.title,
          variantTitle: item.variant_title || '',
          originalUnitPriceSet: {
            shopMoney: {amount: String(item.price || '0')},
          },
          image: item.image?.src || item.image?.url ? {url: item.image.src || item.image.url} : null,
          variant: {
            id: item.variant_id
              ? `gid://shopify/ProductVariant/${item.variant_id}`
              : undefined,
          },
        },
      })),
    },
  };
}

export async function loader({params, context}: LoaderFunctionArgs) {
  const locale = context.storefront.i18n.language.toLowerCase() || 'ar';
  const isEn = locale === 'en';
  const rawId = decodeURIComponent(params.id || params['*'] || '');

  if (!rawId) {
    throw new Response('Order number required', {status: 400});
  }

  // Parse the ID correctly:
  // - GID format: "gid://shopify/Order/7037265608937" → internalId = "7037265608937"
  // - Order number: "1011" or "#1011" → orderNumber = "1011"
  let internalId: string | null = null;
  let orderNumber: string | null = null;

  const gidMatch = rawId.match(/gid:\/\/shopify\/Order\/(\d+)/);
  if (gidMatch) {
    internalId = gidMatch[1];
  } else {
    // Strip leading # if present, then treat as order number
    orderNumber = rawId.replace(/^#/, '').trim();
  }

  const {getAdminToken, getAdminDomain} =
    await import('~/lib/shopify-admin.server');
  const adminToken = await getAdminToken(context.env);
  const adminDomain = getAdminDomain(context.env);

  // Build the Admin GraphQL query — search by GID or order name
  const gqlQuery = `
      query GetOrder($id: ID, $query: String) {
        orders(first: 1, query: $query) {
          edges {
            node {
              id
              name
              processedAt
              canceledAt
              displayFinancialStatus
              displayFulfillmentStatus
              statusPageUrl
              totalPriceSet { shopMoney { amount } }
              subtotalPriceSet { shopMoney { amount } }
              totalTaxSet { shopMoney { amount } }
              totalShippingPriceSet { shopMoney { amount } }
              paymentGatewayNames
              shippingLine { title }
              shippingAddress {
                address1
                city
              }
              customAttributes {
                key
                value
              }
              fulfillments {
                status
                displayStatus
              }
              fulfillmentOrders(first: 5) {
                edges {
                  node {
                    status
                    requestStatus
                    supportedActions {
                      action
                    }
                  }
                }
              }
              tags
              order_status: metafield(namespace: "custom", key: "order_status") {
                value
              }
              lineItems(first: 20) {
                edges {
                  node {
                    title
                    variantTitle
                    originalUnitPriceSet { shopMoney { amount } }
                    image { url }
                    variant {
                      id
                      image { url }
                      product {
                        id
                        featuredImage { url }
                        images(first: 1) {
                          nodes { url }
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

  // Build search query string:
  // - For GID (internalId): search by "id:7037265608937"
  // - For order number (orderNumber): search by "name:#1011"
  const searchQuery = internalId
    ? `id:${internalId}`
    : `name:#${orderNumber} OR name:${orderNumber}`;

  let orderNode: any = null;

  try {
    const res = await fetch(
      `https://${adminDomain}/admin/api/2024-01/graphql.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': adminToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: gqlQuery,
          variables: {query: searchQuery},
        }),
      },
    );
    const jsonRes = (await res.json()) as any;
    console.log(
      '[TrackOrder] GraphQL response:',
      JSON.stringify(jsonRes?.data?.orders?.edges?.length),
      'searchQuery:',
      searchQuery,
    );
    orderNode = jsonRes?.data?.orders?.edges?.[0]?.node;
  } catch (e) {
    console.error('[TrackOrder Loader] Admin GraphQL query failed:', e);
  }

  // Fallback: fetch by REST API using internal ID (for GIDs) or search by order number
  if (!orderNode) {
    const restId = internalId || null;
    if (restId) {
      try {
        const restRes = await fetch(
          `https://${adminDomain}/admin/api/2024-01/orders/${restId}.json`,
          {
            headers: {
              'X-Shopify-Access-Token': adminToken,
              'Content-Type': 'application/json',
            },
          },
        );
        if (restRes.ok) {
          const restData = (await restRes.json()) as any;
          const rawRest = restData?.order;
          if (rawRest) {
            orderNode = mapRestOrderToNode(rawRest);
          }
        }
      } catch (e) {
        console.error(
          '[TrackOrder Loader] Admin REST fallback (by ID) failed:',
          e,
        );
      }
    } else if (orderNumber) {
      // Fallback: search by order name via REST
      try {
        const restRes = await fetch(
          `https://${adminDomain}/admin/api/2024-01/orders.json?name=%23${orderNumber}&status=any`,
          {
            headers: {
              'X-Shopify-Access-Token': adminToken,
              'Content-Type': 'application/json',
            },
          },
        );
        if (restRes.ok) {
          const restData = (await restRes.json()) as any;
          const rawRest = restData?.orders?.[0];
          if (rawRest) {
            orderNode = mapRestOrderToNode(rawRest);
          }
        }
      } catch (e) {
        console.error(
          '[TrackOrder Loader] Admin REST fallback (by name) failed:',
          e,
        );
      }
    }
  }

  if (!orderNode) {
    throw new Response('Order Not Found', {status: 404});
  }

  const shippingAmount = parseFloat(
    orderNode.totalShippingPriceSet?.shopMoney?.amount || '0',
  );

  let paymentGateway = orderNode.paymentGatewayNames?.[0] || 'Credit Card';
  if (!isEn) {
    if (
      paymentGateway.toLowerCase().includes('cash on delivery') ||
      paymentGateway.toLowerCase() === 'cod'
    ) {
      paymentGateway = 'الدفع عند الاستلام';
    } else if (paymentGateway.toLowerCase().includes('bogus')) {
      paymentGateway = 'بطاقة ائتمانية (تجريبي)';
    } else if (
      paymentGateway.toLowerCase().includes('credit') ||
      paymentGateway.toLowerCase().includes('card')
    ) {
      paymentGateway = 'بطاقة ائتمانية';
    }
  }

  // Detect pickup order
  const shippingLineTitle = (orderNode.shippingLine?.title || '').toLowerCase();
  const customAttrs = orderNode.customAttributes || [];
  const fulfillmentAttr = (
    customAttrs.find((a: any) => {
      const k = (a.key || '').toLowerCase();
      return (
        k === 'fulfillment type' ||
        k === 'fulfillment_type' ||
        k === 'fulfillment' ||
        k === 'delivery type'
      );
    })?.value || ''
  ).toLowerCase();
  const isPickup =
    shippingLineTitle.includes('pickup') ||
    shippingLineTitle.includes('pick up') ||
    shippingLineTitle.includes('in store') ||
    shippingLineTitle.includes('استلام من الفرع') ||
    shippingLineTitle.includes('self pickup') ||
    shippingLineTitle.includes('self-pickup') ||
    fulfillmentAttr.includes('pickup') ||
    fulfillmentAttr.includes('استلام');

  // Parse native Shopify fulfillments and fulfillmentOrders
  const fulfillments = orderNode.fulfillments || [];
  const fulfillmentOrders = (orderNode.fulfillmentOrders?.edges || []).map(
    (e: any) => e.node,
  );

  const hasReadyForPickupFulfillment = fulfillments.some(
    (f: any) =>
      f.displayStatus === 'READY_FOR_PICKUP' ||
      f.status === 'READY_FOR_PICKUP',
  );

  const hasOutForDeliveryFulfillment = fulfillments.some(
    (f: any) =>
      f.displayStatus === 'OUT_FOR_DELIVERY' ||
      f.displayStatus === 'IN_TRANSIT' ||
      f.displayStatus === 'LABEL_PRINTED' ||
      f.displayStatus === 'LABEL_PURCHASED' ||
      f.displayStatus === 'SUBMITTED',
  );

  const hasPreparingFulfillment = fulfillmentOrders.some(
    (fo: any) =>
      fo.status === 'IN_PROGRESS' ||
      fo.requestStatus === 'ACCEPTED',
  );

  // Read custom order_status metafield as optional override
  const orderStatusMeta = (orderNode.order_status?.value || '')
    .toLowerCase()
    .trim();

  // Parse order tags — tags are a comma-separated string from Admin API
  // e.g. "ready-for-delivery, vip, express"
  const rawTags = Array.isArray(orderNode.tags)
    ? orderNode.tags
    : typeof orderNode.tags === 'string'
      ? orderNode.tags
          .split(',')
          .map((t: string) => t.trim().toLowerCase())
          .filter(Boolean)
      : [];

  const tagSet = new Set(
    rawTags.map((t: string) => t.toLowerCase().replace(/[\s_]/g, '-')),
  );

  // Tag-based step detection patterns
  const tagIndicatesStep5 =
    tagSet.has('delivered') ||
    tagSet.has('picked-up') ||
    tagSet.has('تم-التسليم') ||
    tagSet.has('تم-الاستلام');
  const tagIndicatesStep4 =
    tagSet.has('ready-for-delivery') ||
    tagSet.has('out-for-delivery') ||
    tagSet.has('ready-for-pickup') ||
    tagSet.has('on-the-way');
  const tagIndicatesStep3 =
    tagSet.has('preparing') ||
    tagSet.has('in-progress') ||
    tagSet.has('being-prepared') ||
    tagSet.has('جاري-التجهيز');

  // Fetch Storefront API translated product titles & images for line items using @inContext
  const titleMap: Record<string, string> = {};
  const imageMap: Record<string, string> = {};
  try {
    const variantIds = (orderNode.lineItems?.edges || [])
      .map((e: any) => e.node?.variant?.id)
      .filter(Boolean);

    if (variantIds.length > 0) {
      const lang = context.storefront.i18n.language;
      const country = context.storefront.i18n.country;
      const variantQuery = `
              query GetVariantDetails($ids: [ID!]!) @inContext(language: ${lang}, country: ${country}) {
                nodes(ids: $ids) {
                  ... on ProductVariant {
                    id
                    image {
                      url
                    }
                    product {
                      title
                      featuredImage {
                        url
                      }
                      images(first: 1) {
                        nodes {
                          url
                        }
                      }
                    }
                  }
                }
              }
            `;
      const variantResult = (await context.storefront.query(
        variantQuery as any,
        {
          variables: {ids: variantIds},
          cache: context.storefront.CacheShort(),
        },
      )) as any;

      for (const node of variantResult?.nodes || []) {
        if (node?.id) {
          if (node?.product?.title) {
            titleMap[node.id] = node.product.title;
          }
          const imgUrl =
            node?.image?.url ||
            node?.product?.featuredImage?.url ||
            node?.product?.images?.nodes?.[0]?.url;
          if (imgUrl) {
            imageMap[node.id] = imgUrl;
          }
        }
      }
    }
  } catch (e) {
    console.warn('[TrackOrder Loader] Failed to fetch translated titles & images:', e);
  }

  const orderData = {
    id: orderNode.name,
    date: isEn
      ? `Ordered on ${new Date(orderNode.processedAt).toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric'})}, ${new Date(orderNode.processedAt).toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'})}`
      : `طلب في ${new Date(orderNode.processedAt).toLocaleDateString('ar-SA-u-nu-latn', {year: 'numeric', month: 'long', day: 'numeric'})}, ${new Date(orderNode.processedAt).toLocaleTimeString('ar-SA-u-nu-latn', {hour: 'numeric', minute: '2-digit'})}`,
    status: (() => {
      const fulfillmentsList = (orderNode as any).fulfillments || [];
      const shipmentStatusesTrack = fulfillmentsList
        .map((f: any) => (f.shipment_status || f.shipmentStatus || f.displayStatus || f.status || '').toLowerCase())
        .filter(Boolean);

      const customAttrsTrack = (orderNode as any).customAttributes || [];
      const attrValuesTrack = customAttrsTrack.map((a: any) => String(a.value || '').toLowerCase());

      const allTokensTrack = [
        ...(Array.isArray(orderNode.tags) ? orderNode.tags : typeof orderNode.tags === 'string' ? orderNode.tags.split(',') : []),
        ...attrValuesTrack,
        ...shipmentStatusesTrack,
        String(orderNode.displayFulfillmentStatus || '').toLowerCase(),
      ].map((s: string) => String(s).toLowerCase().replace(/[\s_]/g, '-').trim()).filter(Boolean);

      const hasStatusTrack = (...keywords: string[]) => {
        return keywords.some((kw) => {
          const target = kw.toLowerCase().replace(/[\s_]/g, '-').trim();
          return allTokensTrack.some(
            (st) => st === target || st.includes(target) || target.includes(st),
          );
        });
      };

      if (orderNode.canceledAt) return isEn ? 'Cancelled' : 'ملغاة';
      if (hasStatusTrack('failure', 'failed', 'expired', 'attempted_delivery', 'تعذر', 'انتهت')) {
        return isEn ? (isPickup ? 'Pickup Period Expired' : 'Delivery Attempt Failed') : (isPickup ? 'انتهت مدة الاستلام' : 'تعذر التسليم');
      }
      if (orderNode.displayFulfillmentStatus === 'FULFILLED' || hasStatusTrack('delivered', 'picked-up', 'picked_up', 'picked', 'تم-التسليم', 'تم-الاستلام', 'تم-استلام-الطلب')) {
        return isEn ? (isPickup ? 'Order Picked Up' : 'Delivered Successfully') : (isPickup ? 'تم استلام الطلب' : 'تم التسليم بنجاح');
      }
      if (hasReadyForPickupFulfillment || hasOutForDeliveryFulfillment || hasStatusTrack('ready-for-pickup', 'ready_for_pickup', 'ready-for-delivery', 'out-for-delivery', 'out_for_delivery', 'in-transit', 'in_transit', 'on-the-way', 'on_the_way', 'ready', 'جاهز', 'جاهز-للاستلام', 'جاهز-للتسليم', 'في-الطريق')) {
        return isEn ? (isPickup ? 'Ready for Pickup' : 'Out for Delivery') : (isPickup ? 'الطلب جاهز للاستلام' : 'الطلب في الطريق إليك');
      }
      if (hasPreparingFulfillment || orderNode.displayFulfillmentStatus === 'IN_PROGRESS' || hasStatusTrack('in-progress', 'in_progress', 'processing', 'submitted', 'label-printed', 'preparing', 'being-prepared', 'جاري-تجهيز-الطلب', 'جاري-التجهيز', 'قيد-التجهيز', 'تجهيز')) {
        return isEn ? 'Order is Being Prepared' : 'جاري تجهيز الطلب';
      }
      return isEn ? 'Order Confirmed' : 'تأكيد الطلب';
    })(),
    invoiceUrl: orderNode.statusPageUrl,
    rawFulfillmentStatus: orderNode.displayFulfillmentStatus || 'UNFULFILLED',
    rawFinancialStatus: orderNode.displayFinancialStatus || 'PAID',
    canceledAt: orderNode.canceledAt || null,
    isPickup,
    hasReadyForPickupFulfillment,
    hasOutForDeliveryFulfillment,
    hasPreparingFulfillment,
    orderStatusMeta,
    tagIndicatesStep3,
    tagIndicatesStep4,
    tagIndicatesStep5,
    items: orderNode.lineItems.edges.map(({node: item}: any) => {
      const variantId = item.variant?.id || item.variantId || item.variant_id;
      const resolvedImg =
        item.image?.url ||
        item.variant?.image?.url ||
        item.variant?.product?.featuredImage?.url ||
        item.variant?.product?.images?.nodes?.[0]?.url ||
        (variantId && imageMap[variantId]) ||
        '';

      return {
        variantId,
        quantity: item.quantity || 1,
        title:
          variantId && titleMap[variantId]
            ? titleMap[variantId]
            : item.title,
        price: parseFloat(
          item.originalUnitPriceSet?.shopMoney?.amount || '0',
        ).toLocaleString('en-US', {minimumFractionDigits: 2}),
        options:
          item.variantTitle && item.variantTitle !== 'Default Title'
            ? item.variantTitle.split(' / ')
            : [],
        image: resolvedImg || null,
      };
    }),
    summary: {
      subtotal: parseFloat(
        orderNode.subtotalPriceSet?.shopMoney?.amount || '0',
      ).toLocaleString('en-US', {minimumFractionDigits: 2}),
      delivery:
        shippingAmount > 0
          ? shippingAmount.toLocaleString('en-US', {minimumFractionDigits: 2})
          : isEn
            ? 'Free'
            : 'مجاني',
      giftWrap: '0.00',
      vat: parseFloat(
        orderNode.totalTaxSet?.shopMoney?.amount || '0',
      ).toLocaleString('en-US', {minimumFractionDigits: 2}),
      total: parseFloat(
        orderNode.totalPriceSet?.shopMoney?.amount || '0',
      ).toLocaleString('en-US', {minimumFractionDigits: 2}),
    },
    address: orderNode.shippingAddress
      ? `${orderNode.shippingAddress.address1}, ${orderNode.shippingAddress.city}`
      : isPickup
        ? isEn
          ? 'Store Pickup'
          : 'استلام من الفرع'
        : isEn
          ? 'No Address'
          : 'لا يوجد عنوان',
    paymentMethod: paymentGateway,
  };

  return json({isEn, orderData});
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

export default function TrackOrderPage() {
  const {isEn, orderData} = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const forceEnNums = (text: string | number | undefined | null) => {
    if (text == null) return text;
    const parts = String(text)
      .split(/(\d+)/)
      .map((part, i) =>
        /\d+/.test(part) ? (
          <span key={i} className="font-en">
            {part}
          </span>
        ) : (
          part
        ),
      );
    return (
      <span className="inline-flex items-baseline" dir="auto">
        {parts}
      </span>
    );
  };

  const getStepNumber = (step: number) => {
    return forceEnNums(step);
  };

  const [toggles, setToggles] = useState({
    sms: true,
    whatsapp: true,
    email: true,
    app: true,
  });

  const handleToggle = (key: keyof typeof toggles) => {
    setToggles((prev) => ({...prev, [key]: !prev[key]}));
  };

  return (
    <div
      className={`min-h-screen bg-[#FEF8EB] ${isEn ? 'font-en' : "font-['GE_Dinar_One']"}`}
      dir={isEn ? 'ltr' : 'rtl'}
    >
      {/* White Header Section */}
      <div className="bg-white py-4 lg:py-6 border-b border-[#EBEBEB]">
        <div className="max-w-[1200px] mx-auto px-4 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-4 lg:gap-6">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 bg-[#BBCFCD] hover:bg-[#A9C1BF] text-[#234745] px-6 py-2 rounded-[25px] font-bold transition-colors w-max h-[42px] shrink-0"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={isEn ? 'rotate-180' : ''}
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
                <span className="text-[16px] leading-none">
                  {isEn ? 'Back' : 'رجوع'}
                </span>
              </button>

              <div className="flex flex-col gap-1.5 items-start">
                <span className="text-[#8B8B8B] text-[14px]">
                  {forceEnNums(
                    isEn
                      ? `Order ${orderData.id}`
                      : `رقم الطلب ${orderData.id}`,
                  )}
                </span>
                <h1 className="!text-[32px] lg:!text-[40px] font-black text-[#1A1A1A] !leading-tight !m-0">
                  {isEn ? 'Track Order' : 'تتبع الطلب'}
                </h1>
                <span className="text-[#8B8B8B] text-[14px]">
                  {forceEnNums(orderData.date)}
                </span>
              </div>
            </div>

            <div className="bg-[#F8EFE3] text-[#A67E4E] px-4 py-2 rounded-full flex items-center gap-2 text-[14px] font-bold w-max border border-[#E9D9C3] mt-2 md:mt-0">
              {isEn && (
                <div className="w-2 h-2 rounded-full bg-[#A67E4E]"></div>
              )}
              {orderData.status}
              {!isEn && (
                <div className="w-2 h-2 rounded-full bg-[#A67E4E]"></div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-[1200px] mx-auto px-4 lg:px-8 py-8 lg:py-12">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Left/Right Column - Order Summary */}
          <div className="w-full lg:w-[380px] shrink-0 flex flex-col gap-6 order-2">
            <div className="bg-white rounded-[12px] border border-[#EBEBEB] p-6">
              <h2 className="text-[20px] font-black text-[#1A1A1A] mb-6">
                {isEn ? 'Order Summary' : 'ملخص الطلب'}
              </h2>

              {/* Items List */}
              <div className="flex flex-col gap-6 mb-6">
                {orderData.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex gap-4">
                    <div className="w-[60px] h-[60px] shrink-0 rounded-[12px] overflow-hidden bg-[#FAF6F0] flex items-center justify-center border border-[#EBEBEB]">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <span className="text-2xl">🍰</span>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <h3 className="text-[14px] font-bold text-[#1A1A1A] leading-tight line-clamp-2">
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.options.map((opt: any, i: number) => (
                          <span
                            key={i}
                            className="text-[11px] text-[#8B8B8B] bg-[#F5F5F5] px-2 py-0.5 rounded-full border border-[#EBEBEB]"
                          >
                            {opt}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center">
                      <span
                        className="text-[14px] font-bold text-[#1A1A1A] flex items-center gap-1"
                        dir="ltr"
                      >
                        <CurrencyIcon className="h-3 w-auto" />{' '}
                        {forceEnNums(item.price)}
                      </span>
                      <svg
                        className="w-[14px] h-[14px] ml-1 mr-1 text-[#1A1A1A]"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M4 12h16M12 4v16M8 8l8 8"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>

              <div className="w-full h-[1px] bg-[#EBEBEB] mb-6"></div>

              {/* Cost Breakdown */}
              <div className="flex flex-col gap-3 mb-6">
                <div className="flex justify-between items-center text-[14px]">
                  <span className="text-[#8B8B8B]">
                    {isEn ? 'Subtotal' : 'المجموع الفرعي'}
                  </span>
                  <span
                    className="font-bold text-[#1A1A1A] flex items-center gap-1"
                    dir="ltr"
                  >
                    <CurrencyIcon className="h-3 w-auto" />{' '}
                    {forceEnNums(orderData.summary.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[14px]">
                  <span className="text-[#8B8B8B]">
                    {isEn ? 'Delivery Fee' : 'رسوم التوصيل'}
                  </span>
                  <span
                    className="font-bold text-[#1A1A1A] flex items-center gap-1"
                    dir="ltr"
                  >
                    {orderData.summary.delivery !== 'Free' &&
                      orderData.summary.delivery !== 'مجاني' && (
                        <CurrencyIcon className="h-3 w-auto" />
                      )}
                    {forceEnNums(orderData.summary.delivery)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[14px]">
                  <span className="text-[#8B8B8B]">
                    {isEn ? 'Gift Wrapping' : 'تغليف الهدايا'}
                  </span>
                  <span
                    className="font-bold text-[#1A1A1A] flex items-center gap-1"
                    dir="ltr"
                  >
                    <CurrencyIcon className="h-3 w-auto" />{' '}
                    {forceEnNums(orderData.summary.giftWrap)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[14px]">
                  <span className="text-[#8B8B8B]">
                    {isEn ? 'VAT (15%)' : 'ضريبة القيمة المضافة (15%)'}
                  </span>
                  <span
                    className="font-bold text-[#1A1A1A] flex items-center gap-1"
                    dir="ltr"
                  >
                    <CurrencyIcon className="h-3 w-auto" />{' '}
                    {forceEnNums(orderData.summary.vat)}
                  </span>
                </div>
              </div>

              <div className="w-full h-[1px] bg-[#EBEBEB] mb-6"></div>

              {/* Total */}
              <div className="flex justify-between items-end mb-6">
                <div className="flex flex-col">
                  <span className="text-[18px] font-black text-[#1A1A1A]">
                    {isEn ? 'Total' : 'الإجمالي'}
                  </span>
                  <span className="text-[11px] text-[#8B8B8B]">
                    {isEn
                      ? 'Inclusive of VAT'
                      : 'شامل ضريبة القيمة المضافة 15%'}
                  </span>
                </div>
                <span
                  className="text-[24px] font-black text-[#234745] flex items-center gap-2"
                  dir="ltr"
                >
                  <CurrencyIcon className="h-5 w-auto" />{' '}
                  {forceEnNums(orderData.summary.total)}
                </span>
              </div>

              <div className="w-full h-[1px] bg-[#EBEBEB] mb-6"></div>

              {/* Details */}
              <div className="flex flex-col gap-4 mb-8">
                <div className="flex justify-between items-center text-[14px]">
                  <span className="text-[#8B8B8B]">
                    {isEn ? 'Delivery Address' : 'عنوان التوصيل'}
                  </span>
                  <span className="font-medium text-[#234745] text-end">
                    {orderData.address}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[14px]">
                  <span className="text-[#8B8B8B]">
                    {isEn ? 'Payment Method' : 'طريقة الدفع'}
                  </span>
                  <span className="!font-medium text-[#234745]">
                    {orderData.paymentMethod}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                {(() => {
                  const reorderLines = (orderData.items || [])
                    .map(
                      (item: any) => {
                        const rawId = item.variantId;
                        const merchandiseId =
                          rawId && String(rawId).startsWith('gid://')
                            ? String(rawId)
                            : rawId
                              ? `gid://shopify/ProductVariant/${rawId}`
                              : '';
                        return {
                          merchandiseId,
                          quantity: item.quantity || 1,
                        };
                      },
                    )
                    .filter(
                      (l: any) =>
                        l.merchandiseId &&
                        !l.merchandiseId.endsWith('undefined') &&
                        !l.merchandiseId.endsWith('null')
                    );
                  return (
                    <Form
                      action={isEn ? '/en/cart' : '/cart'}
                      method="post"
                      className="w-full"
                    >
                      <input
                        type="hidden"
                        name="cartFormInput"
                        value={JSON.stringify({
                          action: 'LinesAdd',
                          inputs: {lines: reorderLines},
                        })}
                      />
                      <button
                        type="submit"
                        className="w-full bg-[#234745] hover:bg-[#1a3533] text-white py-3.5 rounded-full font-bold transition-colors cursor-pointer active:scale-95"
                        style={{color: '#FFFFFF'}}
                      >
                        {isEn ? 'Reorder' : 'إعادة الطلب'}
                      </button>
                    </Form>
                  );
                })()}
                {orderData.rawFinancialStatus?.toUpperCase() === 'PAID' ? (
                  <a
                    href={`/api/invoice/${encodeURIComponent(orderData.id)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-white border-[1.5px] border-[#234745] text-[#234745] hover:bg-gray-50 py-3.5 rounded-full font-bold transition-colors flex items-center justify-center cursor-pointer"
                  >
                    {isEn ? 'Download Invoice' : 'تنزيل الفاتورة'}
                  </a>
                ) : (
                  <div className="w-full bg-[#FFF5F5] border border-[#FFD8D8] text-[#E64950] py-3 rounded-full font-bold text-center text-[13px]">
                    {isEn
                      ? 'Invoice pending payment'
                      : 'الفاتورة بانتظار إتمام الدفع'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Track & Manage Column */}
          <div className="flex-1 w-full flex flex-col gap-6 order-1">
            {/* Order Stages */}
            <div className="bg-white rounded-[12px] border border-[#EBEBEB] p-6 lg:p-8">
              <h2 className="text-[20px] font-black text-[#1A1A1A] mb-8">
                {isEn ? 'Order Stages' : 'مراحل الطلب'}
              </h2>

              <div className="relative flex flex-col gap-8">
                {/* Vertical Line */}
                <div
                  className={`absolute top-4 bottom-4 ${isEn ? 'left-4' : 'right-4'} w-[2px] bg-[#BBCFCD]/40`}
                />

                {(() => {
                  // Determine current step — driven primarily by Shopify's displayFulfillmentStatus,
                  // then by ERP tags/metafield, never by inferred fulfillment existence alone.
                  let currentStep: number;
                  const rawStatus = orderData.rawFulfillmentStatus || 'UNFULFILLED';
                  const meta = (orderData.orderStatusMeta || '').toLowerCase();
                  const tags = orderData.tagIndicatesStep5 ? 5
                    : orderData.tagIndicatesStep4 ? 4
                    : orderData.tagIndicatesStep3 ? 3
                    : 0;

                  if (orderData.canceledAt) {
                    currentStep = 0;
                  } else if (
                    rawStatus === 'FULFILLED' ||
                    meta.includes('delivered') ||
                    meta.includes('picked_up') ||
                    meta.includes('تم-التسليم') ||
                    meta.includes('تم-الاستلام') ||
                    tags === 5
                  ) {
                    currentStep = 5;
                  } else if (
                    rawStatus === 'PARTIALLY_FULFILLED' ||
                    meta.includes('ready_for_pickup') ||
                    meta.includes('out_for_delivery') ||
                    meta.includes('in_transit') ||
                    meta.includes('جاهز') ||
                    meta.includes('الطريق') ||
                    tags === 4
                  ) {
                    currentStep = 4;
                  } else if (
                    rawStatus === 'IN_PROGRESS' ||
                    meta.includes('in_progress') ||
                    meta.includes('processing') ||
                    meta.includes('جاري') ||
                    tags === 3
                  ) {
                    currentStep = 3;
                  } else if (
                    meta.includes('confirmed') ||
                    meta.includes('تأكيد')
                  ) {
                    currentStep = 2;
                  } else {
                    // UNFULFILLED or any unknown status = Step 1 (Order Received)
                    currentStep = 1;
                  }

                  const toEnglishDigits = (str: string) => {
                    const arabicDigits = [
                      '٠',
                      '١',
                      '٢',
                      '٣',
                      '٤',
                      '٥',
                      '٦',
                      '٧',
                      '٨',
                      '٩',
                    ];
                    return str.replace(/[٠-٩]/g, (d) =>
                      String(arabicDigits.indexOf(d)),
                    );
                  };

                  const splitTime = (time: string) => {
                    const match =
                      time.match(/^(.*?)\s*([a-zA-Z\u0645\u0635]+)$/) ||
                      time.match(/^([a-zA-Z\u0645\u0635]+)\s*(.*?)$/);
                    if (match) {
                      if (/[a-zA-Z\u0645\u0635]/.test(match[2])) {
                        return {
                          digits: match[1].trim(),
                          indicator: match[2].trim(),
                        };
                      }
                      return {
                        digits: match[2].trim(),
                        indicator: match[1].trim(),
                      };
                    }
                    return {digits: time, indicator: ''};
                  };

                  const dateParts = orderData.date.split(/[\u060C,]/);
                  const rawTimeStr = (
                    dateParts[dateParts.length - 1] || ''
                  ).trim();
                  const formattedRawTime = rawTimeStr
                    .replace(/([0-9])([\u0645\u0635])/g, '$1 $2')
                    .replace(/([0-9])(AM|PM)/gi, '$1 $2');
                  const timeStr = toEnglishDigits(formattedRawTime);

                  // Pickup orders get different stage 4 & 5 labels
                  const isPickup = orderData.isPickup;

                  const stages = [
                    {
                      id: 1,
                      en: 'Order Received',
                      ar: 'تم استلام الطلب',
                      descEn: 'Order successfully received',
                      descAr: 'تم استلام طلبك بنجاح',
                      time: timeStr,
                    },
                    {
                      id: 2,
                      en: 'Confirmed',
                      ar: 'تم التأكيد',
                      descEn: 'Order has been confirmed',
                      descAr: 'تم تأكيد طلبك بنجاح',
                    },
                    {
                      id: 3,
                      en: 'Preparing',
                      ar: 'جاري التجهيز',
                      descEn: 'Preparing your order',
                      descAr: 'جاري تجهيز طلبك',
                    },
                    {
                      id: 4,
                      en: isPickup ? 'Ready for Pickup' : 'On the Way',
                      ar: isPickup ? 'جاهز للاستلام' : 'في الطريق إليك',
                      descEn: isPickup
                        ? 'Your order is ready at the branch'
                        : 'On the way to you',
                      descAr: isPickup
                        ? 'طلبك جاهز في الفرع'
                        : 'طلبك في الطريق إليك',
                    },
                    {
                      id: 5,
                      en: isPickup ? 'Picked Up' : 'Delivered',
                      ar: isPickup ? 'تم الاستلام' : 'تم التسليم',
                      descEn: isPickup
                        ? 'Order picked up successfully'
                        : 'Delivered successfully',
                      descAr: isPickup
                        ? 'تم استلام طلبك بنجاح من الفرع'
                        : 'تم تسليم طلبك بنجاح',
                    },
                  ];

                  return stages.map((stage) => {
                    const isCompleted = currentStep >= stage.id;
                    const isCurrent = currentStep === stage.id;

                    return (
                      <div
                        key={stage.id}
                        className="relative flex gap-6 items-start text-start"
                      >
                        {isCompleted ? (
                          <div className="w-8 h-8 rounded-full bg-[#234745] shrink-0 flex items-center justify-center relative z-10 ring-4 ring-white shadow-sm">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="white"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          </div>
                        ) : (
                          <div
                            className={`w-8 h-8 rounded-full border shrink-0 flex items-center justify-center relative z-10 ring-4 ring-white font-en text-[14px] font-bold bg-[#FEF8EB] border-[#BBCFCD]/70 text-[#9FB7AE]`}
                          >
                            {stage.id}
                          </div>
                        )}
                        <div className="flex flex-col pt-0.5">
                          <h3
                            className={`text-[17px] font-black ${isCompleted || isCurrent ? 'text-[#234745]' : 'text-[#9FB7AE]'}`}
                          >
                            {isEn ? stage.en : stage.ar}
                          </h3>
                          <span
                            className={`text-[14px] font-normal mt-1 text-[#9FB7AE]`}
                          >
                            {isEn ? stage.descEn : stage.descAr}
                          </span>
                          {isCompleted &&
                            stage.time &&
                            (() => {
                              const {digits, indicator} = splitTime(stage.time);
                              return (
                                <div
                                  className={`flex items-center gap-1 mt-1 text-[13px] font-bold text-[#8B6D43] ${isEn ? 'justify-start' : 'justify-end'}`}
                                  dir="ltr"
                                >
                                  {isEn ? (
                                    <>
                                      <span
                                        style={{
                                          fontFamily:
                                            "'EnglishDigits', 'Bahij Janna', sans-serif",
                                        }}
                                      >
                                        {digits}
                                      </span>
                                      {indicator && <span>{indicator}</span>}
                                    </>
                                  ) : (
                                    <>
                                      {indicator && <span>{indicator}</span>}
                                      <span
                                        style={{
                                          fontFamily:
                                            "'EnglishDigits', 'Bahij Janna', sans-serif",
                                        }}
                                      >
                                        {digits}
                                      </span>
                                    </>
                                  )}
                                </div>
                              );
                            })()}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Help & Support */}
            <div className="bg-white rounded-[12px] border border-[#EBEBEB] p-6 lg:p-8" dir={isEn ? 'ltr' : 'rtl'}>
              <h2 className="text-[20px] font-black text-[#1A1A1A] mb-6 text-start">
                {isEn ? 'Help and Support' : 'المساعدة والدعم'}
              </h2>

              <div className="flex flex-col gap-4">
                <a
                  href="https://wa.me/966920017070"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-[#FEF8EB] hover:bg-[#F8EFE3] transition-colors py-4 px-6 rounded-[16px] flex items-center justify-start gap-3.5 text-start"
                >
                  <svg width="20" height="20" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                    <path d="M6.66668 0C10.3487 0 13.3333 2.98467 13.3333 6.66667C13.3333 10.3487 10.3487 13.3333 6.66668 13.3333C5.48851 13.3354 4.33106 13.0236 3.31334 12.43L0.00267697 13.3333L0.90401 10.0213C0.309983 9.00329 -0.00205442 7.84535 1.01791e-05 6.66667C1.01791e-05 2.98467 2.98468 0 6.66668 0ZM4.39468 3.53333L4.26134 3.53867C4.17514 3.54461 4.09091 3.56725 4.01334 3.60533C3.94106 3.64634 3.87505 3.69753 3.81734 3.75733C3.73734 3.83267 3.69201 3.898 3.64334 3.96133C3.39676 4.28194 3.26399 4.67554 3.26601 5.08C3.26734 5.40667 3.35268 5.72467 3.48601 6.022C3.75868 6.62333 4.20734 7.26 4.79934 7.85C4.94201 7.992 5.08201 8.13467 5.23268 8.26733C5.9683 8.91494 6.84486 9.38198 7.79268 9.63133L8.17134 9.68933C8.29468 9.696 8.41801 9.68667 8.54201 9.68067C8.73613 9.67043 8.92567 9.61787 9.09734 9.52667C9.18457 9.48156 9.26977 9.43263 9.35268 9.38C9.35268 9.38 9.3809 9.36089 9.43601 9.32C9.52601 9.25333 9.58134 9.206 9.65601 9.128C9.71201 9.07022 9.75868 9.00311 9.79601 8.92667C9.84801 8.818 9.90001 8.61067 9.92134 8.438C9.93734 8.306 9.93268 8.234 9.93068 8.18933C9.92801 8.118 9.86868 8.044 9.80401 8.01267L9.41601 7.83867C9.41601 7.83867 8.83601 7.586 8.48134 7.42467C8.44422 7.4085 8.40446 7.39924 8.36401 7.39733C8.31839 7.39256 8.27228 7.39765 8.2288 7.41226C8.18532 7.42687 8.14549 7.45065 8.11201 7.482C8.10868 7.48067 8.06401 7.51867 7.58201 8.10267C7.55435 8.13984 7.51624 8.16794 7.47255 8.18337C7.42885 8.19881 7.38155 8.20088 7.33668 8.18933C7.29323 8.17775 7.25067 8.16305 7.20934 8.14533C7.12668 8.11067 7.09801 8.09733 7.04134 8.07333C6.65859 7.90661 6.3043 7.68099 5.99134 7.40467C5.90734 7.33133 5.82934 7.25133 5.74934 7.174C5.48708 6.92281 5.25851 6.63866 5.06934 6.32867L5.03001 6.26533C5.00219 6.22253 4.97937 6.17668 4.96201 6.12867C4.93668 6.03067 5.00268 5.952 5.00268 5.952C5.00268 5.952 5.16468 5.77467 5.24001 5.67867C5.31334 5.58533 5.37534 5.49467 5.41534 5.43C5.49401 5.30333 5.51868 5.17333 5.47734 5.07267C5.29068 4.61667 5.09779 4.16311 4.89868 3.712C4.85934 3.62267 4.74268 3.55867 4.63668 3.546C4.60068 3.54156 4.56468 3.538 4.52868 3.53533C4.43916 3.5302 4.3494 3.53109 4.26001 3.538L4.39468 3.53333Z" fill="#234745"/>
                  </svg>
                  <span className="text-[16px] font-bold text-[#1A1A1A]">
                    {isEn ? 'Contact us via WhatsApp' : 'تواصل معنا عبر WhatsApp'}
                  </span>
                </a>

                <Link
                  to={isEn ? '/en/pages/contact' : '/pages/contact'}
                  className="w-full bg-[#FEF8EB] hover:bg-[#F8EFE3] transition-colors py-4 px-6 rounded-[16px] flex items-center justify-start gap-3.5 text-start"
                >
                  <svg width="20" height="20" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                    <path fillRule="evenodd" clipRule="evenodd" d="M13.3333 6.66667C13.3333 2.98467 10.3487 0 6.66667 0C2.98467 0 0 2.98467 0 6.66667C0 10.3487 2.98467 13.3333 6.66667 13.3333C10.3487 13.3333 13.3333 10.3487 13.3333 6.66667ZM6.66667 3.33333C6.84348 3.33333 7.01305 3.40357 7.13807 3.5286C7.2631 3.65362 7.33333 3.82319 7.33333 4V7.33333C7.33333 7.51014 7.2631 7.67971 7.13807 7.80474C7.01305 7.92976 6.84348 8 6.66667 8C6.48986 8 6.32029 7.92976 6.19526 7.80474C6.07024 7.67971 6 7.51014 6 7.33333V4C6 3.82319 6.07024 3.65362 6.19526 3.5286C6.32029 3.40357 6.48986 3.33333 6.66667 3.33333ZM6 9.33333C6 9.15652 6.07024 8.98695 6.19526 8.86193C6.32029 8.73691 6.48986 8.66667 6.66667 8.66667H6.672C6.84881 8.66667 7.01838 8.73691 7.1434 8.86193C7.26843 8.98695 7.33867 9.15652 7.33867 9.33333C7.33867 9.51014 7.26843 9.67971 7.1434 9.80474C7.01838 9.92976 6.84881 10 6.672 10H6.66667C6.48986 10 6.32029 9.92976 6.19526 9.80474C6.07024 9.67971 6 9.51014 6 9.33333Z" fill="#234745"/>
                  </svg>
                  <span className="text-[16px] font-bold text-[#1A1A1A]">
                    {isEn ? 'Report an Issue' : 'الإبلاغ عن مشكلة'}
                  </span>
                </Link>

                <Link
                  to={isEn ? '/en/pages/faq' : '/pages/faq'}
                  className="w-full bg-[#FEF8EB] hover:bg-[#F8EFE3] transition-colors py-4 px-6 rounded-[16px] flex items-center justify-start gap-3.5 text-start"
                >
                  <svg width="20" height="20" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                    <path d="M6.66667 13.3333C2.98467 13.3333 0 10.3487 0 6.66667C0 2.98467 2.98467 0 6.66667 0C10.3487 0 13.3333 2.98467 13.3333 6.66667C13.3333 10.3487 10.3487 13.3333 6.66667 13.3333ZM6 8.66667V10H7.33333V8.66667H6ZM7.33333 7.57C7.86911 7.40852 8.32907 7.05997 8.62944 6.58783C8.92981 6.11569 9.0506 5.55137 8.96982 4.99764C8.88905 4.44392 8.61207 3.93763 8.18934 3.57097C7.76661 3.20432 7.22625 3.00169 6.66667 3C6.1272 2.99983 5.60434 3.1866 5.18707 3.52851C4.7698 3.87042 4.48389 4.34636 4.378 4.87533L5.686 5.13733C5.72312 4.95162 5.81221 4.78027 5.94291 4.64321C6.07361 4.50615 6.24054 4.40903 6.42428 4.36314C6.60802 4.31725 6.80102 4.32447 6.98081 4.38398C7.16061 4.44349 7.31981 4.55283 7.43989 4.69927C7.55997 4.84572 7.636 5.02326 7.65912 5.21123C7.68225 5.3992 7.65152 5.58987 7.57051 5.76106C7.48951 5.93224 7.36156 6.07691 7.20155 6.17822C7.04154 6.27953 6.85605 6.33332 6.66667 6.33333C6.48986 6.33333 6.32029 6.40357 6.19526 6.5286C6.07024 6.65362 6 6.82319 6 7V8H7.33333V7.57Z" fill="#234745"/>
                  </svg>
                  <span className="text-[16px] font-bold text-[#1A1A1A]">
                    {isEn ? 'Delivery FAQ' : 'الأسئلة الشائعة للتوصيل'}
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
