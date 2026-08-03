import {
  data as json,
  type LoaderFunctionArgs,
  useLoaderData,
  useNavigate,
} from 'react-router';
import {getAdminToken} from '~/lib/shopify-admin.server';

export async function loader({params, context}: LoaderFunctionArgs) {
  const locale = context.storefront.i18n.language.toLowerCase() || 'ar';
  const isEn = locale === 'en';
  const orderNumber = params.id;

  if (!orderNumber) {
    throw new Response('Order number required', {status: 400});
  }

  const adminToken = await getAdminToken(context.env);

  // Fetch order from Admin GraphQL API
  const query = `
      query GetOrder($query: String!) {
        orders(first: 1, query: $query) {
          edges {
            node {
              id
              name
              processedAt
              displayFinancialStatus
              displayFulfillmentStatus
              totalPriceSet { shopMoney { amount currencyCode } }
              subtotalPriceSet { shopMoney { amount currencyCode } }
              totalTaxSet { shopMoney { amount currencyCode } }
              totalShippingPriceSet { shopMoney { amount currencyCode } }
              paymentGatewayNames
              shippingAddress {
                name
                address1
                city
                phone
              }
              lineItems(first: 50) {
                edges {
                  node {
                    title
                    quantity
                    originalUnitPriceSet { shopMoney { amount currencyCode } }
                  }
                }
              }
            }
          }
        }
      }
    `;

  const res = await fetch(
    `https://${context.env.PUBLIC_STORE_DOMAIN}/admin/api/2023-10/graphql.json`,
    {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': adminToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {query: `name:${orderNumber}`},
      }),
    },
  );

  const jsonRes = (await res.json()) as any;
  const orderNode = jsonRes?.data?.orders?.edges?.[0]?.node;

  if (!orderNode) {
    throw new Response('Order Not Found', {status: 404});
  }

  const financialStatus = orderNode.displayFinancialStatus || 'PENDING';
  const isPaid = financialStatus.toUpperCase() === 'PAID';

  return json({
    order: {
      id: orderNode.name,
      date: new Date(orderNode.processedAt).toLocaleDateString(
        isEn ? 'en-US' : 'ar-SA-u-nu-latn',
        {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        },
      ),
      isPaid,
      financialStatus,
      currency: orderNode.totalPriceSet?.shopMoney?.currencyCode || 'SAR',
      total: parseFloat(orderNode.totalPriceSet?.shopMoney?.amount || '0'),
      subtotal: parseFloat(
        orderNode.subtotalPriceSet?.shopMoney?.amount || '0',
      ),
      tax: parseFloat(orderNode.totalTaxSet?.shopMoney?.amount || '0'),
      shipping: parseFloat(
        orderNode.totalShippingPriceSet?.shopMoney?.amount || '0',
      ),
      paymentMethod: orderNode.paymentGatewayNames?.[0] || 'Card',
      customerName: orderNode.shippingAddress?.name || 'Customer',
      customerPhone: orderNode.shippingAddress?.phone || '',
      customerCity: orderNode.shippingAddress?.city || '',
      customerAddress: orderNode.shippingAddress?.address1 || '',
      items: orderNode.lineItems.edges.map(({node: item}: any) => ({
        title: item.title,
        quantity: item.quantity,
        price: parseFloat(item.originalUnitPriceSet?.shopMoney?.amount || '0'),
        total:
          parseFloat(item.originalUnitPriceSet?.shopMoney?.amount || '0') *
          item.quantity,
      })),
    },
    locale,
    isEn,
  });
}

export default function InvoicePage() {
  const {order, isEn} = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  // If order is not paid, show error message page
  if (!order.isPaid) {
    return (
      <div
        className="min-h-screen bg-[#FEF8EB] flex items-center justify-center p-6"
        dir={isEn ? 'ltr' : 'rtl'}
      >
        <div className="max-w-md w-full bg-white rounded-2xl border border-[#EBEBEB] p-8 text-center shadow-sm">
          <div className="w-16 h-16 bg-[#FDF1F2] text-[#E64950] rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 className="text-[20px] font-bold text-[#1A1A1A] mb-3">
            {isEn ? 'Invoice Not Available' : 'الفاتورة غير متوفرة'}
          </h1>
          <p className="text-[#8B8B8B] text-[14px] leading-relaxed mb-6">
            {isEn
              ? 'Invoices are only generated for completed and fully paid orders. Payment is currently pending.'
              : 'يتم إصدار الفاتورة فقط للطلبات المكتملة والمدفوعة بالكامل. هذا الطلب بانتظار إتمام الدفع حالياً.'}
          </p>
          <button
            onClick={() => navigate(-1)}
            className="w-full bg-[#234745] hover:bg-[#1a3533] text-white py-3 rounded-xl font-bold transition-all"
          >
            {isEn ? 'Go Back' : 'رجوع'}
          </button>
        </div>
      </div>
    );
  }

  const sellerNameEn = 'Saadeddin Pastry';
  const sellerNameAr = 'حلويات سعد الدين';
  const vatNumber = '300062483800003';

  return (
    <div
      className="bg-gray-100 min-h-screen py-8 px-4"
      dir={isEn ? 'ltr' : 'rtl'}
    >
      {/* Control Bar (hidden during print) */}
      <div className="max-w-[800px] mx-auto bg-white rounded-t-2xl border-b border-gray-100 px-6 py-4 flex justify-between items-center print:hidden">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[14px] font-bold text-[#234745] hover:underline"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className={isEn ? 'rotate-180' : ''}
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
          {isEn ? 'Back' : 'الرجوع للطلب'}
        </button>

        <button
          onClick={() => window.print()}
          className="bg-[#234745] hover:bg-[#1a3533] text-white px-5 py-2 rounded-xl text-[14px] font-bold transition-all flex items-center gap-2"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          {isEn ? 'Print / Save PDF' : 'طباعة / حفظ PDF'}
        </button>
      </div>

      {/* Print Area */}
      <div
        className="max-w-[800px] mx-auto bg-white p-8 lg:p-12 shadow-sm rounded-b-2xl print:shadow-none print:rounded-none print:p-0 text-[#1a1a1a]"
        id="invoice-sheet"
      >
        {/* Print Auto Script Trigger */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                        }, 600);
                    };
                `,
          }}
        />

        {/* Header (Logo + Title) */}
        <div className="flex justify-between items-start border-b-2 border-gray-200 pb-6 mb-8">
          <div>
            <h1 className="text-[24px] font-black text-[#234745] leading-none mb-2">
              {isEn ? 'Order Invoice' : 'فاتورة الطلب'}
            </h1>
            <span className="text-[12px] text-gray-500 font-bold tracking-wide block">
              {isEn ? 'OFFICIAL INVOICE RECEIPT' : 'إيصال الفاتورة الرسمي'}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[20px] font-black text-[#d4a06a]">
              {isEn ? 'SAADEDDIN' : 'سعد الدين'}
            </span>
            <span className="text-[11px] text-gray-400 block font-bold mt-1">
              VAT Reg No: {vatNumber}
            </span>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-8 mb-8 text-[13px]">
          <div>
            <h3 className="font-bold text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-100 pb-1">
              {isEn ? 'Invoice Details' : 'تفاصيل الفاتورة'}
            </h3>
            <div className="flex flex-col gap-1.5">
              <div>
                <span className="font-bold">
                  {isEn ? 'Invoice No: ' : 'رقم الفاتورة: '}
                </span>
                {order.id}
              </div>
              <div>
                <span className="font-bold">
                  {isEn ? 'Issue Date: ' : 'تاريخ الإصدار: '}
                </span>
                {order.date}
              </div>
              <div>
                <span className="font-bold">
                  {isEn ? 'Payment: ' : 'طريقة الدفع: '}
                </span>
                {order.paymentMethod}
              </div>
              <div>
                <span className="font-bold">
                  {isEn ? 'Status: ' : 'الحالة: '}
                </span>
                <span className="text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded text-[11px] uppercase border border-green-200/50">
                  {isEn ? 'PAID' : 'مدفوعة'}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-bold text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-100 pb-1">
              {isEn ? 'Customer Details' : 'تفاصيل العميل'}
            </h3>
            <div className="flex flex-col gap-1.5">
              <div>
                <span className="font-bold">{isEn ? 'Name: ' : 'الاسم: '}</span>
                {order.customerName}
              </div>
              {order.customerPhone && (
                <div>
                  <span className="font-bold">
                    {isEn ? 'Phone: ' : 'الجوال: '}
                  </span>
                  {order.customerPhone}
                </div>
              )}
              {order.customerCity && (
                <div>
                  <span className="font-bold">
                    {isEn ? 'City: ' : 'المدينة: '}
                  </span>
                  {order.customerCity}
                </div>
              )}
              {order.customerAddress && (
                <div>
                  <span className="font-bold">
                    {isEn ? 'Address: ' : 'العنوان: '}
                  </span>
                  {order.customerAddress}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <table className="w-full text-[13px] border-collapse mb-8">
          <thead>
            <tr className="border-b-2 border-[#234745] text-gray-400 font-bold">
              <th className="py-3 text-start">
                {isEn ? 'Description' : 'الوصف'}
              </th>
              <th className="py-3 text-center w-[80px]">
                {isEn ? 'Qty' : 'الكمية'}
              </th>
              <th className="py-3 text-end w-[120px]">
                {isEn ? 'Unit Price' : 'سعر الوحدة'}
              </th>
              <th className="py-3 text-end w-[120px]">
                {isEn ? 'VAT (15%)' : 'الضريبة'}
              </th>
              <th className="py-3 text-end w-[120px]">
                {isEn ? 'Total' : 'الإجمالي'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {order.items.map((item: any, idx: number) => {
              // Calculate values for simplified invoice breakdown (VAT 15% is inclusive in standard pricing)
              const itemPriceExclVat = item.price / 1.15;
              const itemVat = item.price - itemPriceExclVat;
              return (
                <tr key={idx} className="align-middle">
                  <td className="py-3 font-bold text-[#1a1a1a]">
                    {item.title}
                  </td>
                  <td className="py-3 text-center">{item.quantity}</td>
                  <td className="py-3 text-end font-mono" dir="ltr">
                    {itemPriceExclVat.toFixed(2)} {order.currency}
                  </td>
                  <td
                    className="py-3 text-end font-mono text-gray-500"
                    dir="ltr"
                  >
                    {(itemVat * item.quantity).toFixed(2)} {order.currency}
                  </td>
                  <td className="py-3 text-end font-bold font-mono" dir="ltr">
                    {item.total.toFixed(2)} {order.currency}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Totals Section */}
        <div className="flex justify-end border-t border-gray-100 pt-6">
          {/* Breakdown */}
          <div className="w-full md:w-[320px] flex flex-col gap-2.5 text-[13px] font-medium">
            <div className="flex justify-between items-center text-gray-500">
              <span>
                {isEn
                  ? 'Subtotal (Excl. VAT)'
                  : 'المجموع الفرعي (غير شامل الضريبة)'}
              </span>
              <span className="font-mono" dir="ltr">
                {(order.subtotal / 1.15).toFixed(2)} {order.currency}
              </span>
            </div>

            {order.shipping > 0 && (
              <div className="flex justify-between items-center text-gray-500">
                <span>{isEn ? 'Delivery Fee' : 'رسوم التوصيل'}</span>
                <span className="font-mono" dir="ltr">
                  {order.shipping.toFixed(2)} {order.currency}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center text-gray-500">
              <span>
                {isEn ? 'Total VAT (15%)' : 'ضريبة القيمة المضافة (15%)'}
              </span>
              <span className="font-mono" dir="ltr">
                {order.tax.toFixed(2)} {order.currency}
              </span>
            </div>

            <div className="w-full h-[1px] bg-gray-100 my-1"></div>

            <div className="flex justify-between items-center text-[18px] font-black text-[#234745] pt-1">
              <span>{isEn ? 'Total Amount' : 'الإجمالي المستحق'}</span>
              <span className="font-mono" dir="ltr">
                {order.total.toFixed(2)} {order.currency}
              </span>
            </div>
          </div>
        </div>

        {/* Footer notes */}
        <div className="border-t border-gray-100 pt-8 mt-12 text-center text-[11px] text-gray-400 leading-relaxed font-bold">
          <div>
            {isEn
              ? 'Thank you for shopping with Saadeddin!'
              : 'نشكركم لتسوقكم من حلويات سعد الدين!'}
          </div>
          <div className="mt-1" dir="ltr">
            www.saadeddin.com
          </div>
        </div>
      </div>

      {/* Custom Print Styling */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
                @media print {
                    body {
                        background-color: #ffffff !important;
                    }
                    .bg-gray-100 {
                        background-color: #ffffff !important;
                        padding: 0 !important;
                    }
                    #invoice-sheet {
                        padding: 0 !important;
                        box-shadow: none !important;
                        border: none !important;
                    }
                    button {
                        display: none !important;
                    }
                }
            `,
        }}
      />
    </div>
  );
}
