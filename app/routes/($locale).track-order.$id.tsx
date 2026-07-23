import { data as json, type LoaderFunctionArgs, useLoaderData, useNavigate } from 'react-router';
import { useState } from 'react';

export async function loader({ params, context }: LoaderFunctionArgs) {
    const locale = context.storefront.i18n.language.toLowerCase() || 'ar';
    const isEn = locale === 'en';
    const orderNumber = params.id;

    if (!orderNumber) {
        throw new Response('Order number required', { status: 400 });
    }

    const { getAdminToken } = await import('~/lib/shopify-admin.server');
    const adminToken = await getAdminToken(context.env);

    // Fetch order from Admin GraphQL API to get line item images
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
              statusPageUrl
              totalPriceSet { shopMoney { amount } }
              subtotalPriceSet { shopMoney { amount } }
              totalTaxSet { shopMoney { amount } }
              totalShippingPriceSet { shopMoney { amount } }
              paymentGatewayNames
              shippingAddress {
                address1
                city
              }
              lineItems(first: 20) {
                edges {
                  node {
                    title
                    variantTitle
                    originalUnitPriceSet { shopMoney { amount } }
                    image { url }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const res = await fetch(`https://${context.env.PUBLIC_STORE_DOMAIN}/admin/api/2023-10/graphql.json`, {
        method: 'POST',
        headers: {
            'X-Shopify-Access-Token': adminToken,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            query,
            variables: { query: `name:${orderNumber}` }
        })
    });

    const jsonRes = await res.json() as any;
    const orderNode = jsonRes?.data?.orders?.edges?.[0]?.node;

    if (!orderNode) {
        throw new Response('Order Not Found', { status: 404 });
    }

    const shippingAmount = parseFloat(orderNode.totalShippingPriceSet?.shopMoney?.amount || '0');

    let paymentGateway = orderNode.paymentGatewayNames?.[0] || 'Credit Card';
    if (!isEn) {
        if (paymentGateway.toLowerCase().includes('cash on delivery') || paymentGateway.toLowerCase() === 'cod') {
            paymentGateway = 'الدفع عند الاستلام';
        } else if (paymentGateway.toLowerCase().includes('bogus')) {
            paymentGateway = 'بطاقة ائتمانية (تجريبي)';
        } else if (paymentGateway.toLowerCase().includes('credit') || paymentGateway.toLowerCase().includes('card')) {
            paymentGateway = 'بطاقة ائتمانية';
        }
    }

    const orderData = {
        id: orderNode.name,
        date: isEn
            ? `Ordered on ${new Date(orderNode.processedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}, ${new Date(orderNode.processedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
            : `طلب في ${new Date(orderNode.processedAt).toLocaleDateString('ar-SA-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' })}, ${new Date(orderNode.processedAt).toLocaleTimeString('ar-SA-u-nu-latn', { hour: 'numeric', minute: '2-digit' })}`,
        status: isEn ? (orderNode.displayFulfillmentStatus === 'FULFILLED' ? 'Delivered' : orderNode.displayFinancialStatus === 'REFUNDED' ? 'Cancelled' : 'Order Received') : (orderNode.displayFulfillmentStatus === 'FULFILLED' ? 'تم التسليم' : orderNode.displayFinancialStatus === 'REFUNDED' ? 'ملغاه' : 'تم استلام طلبك'),
        invoiceUrl: orderNode.statusPageUrl,
        rawFulfillmentStatus: orderNode.displayFulfillmentStatus || 'UNFULFILLED',
        rawFinancialStatus: orderNode.displayFinancialStatus || 'PAID',
        items: orderNode.lineItems.edges.map(({ node: item }: any) => ({
            title: item.title,
            price: parseFloat(item.originalUnitPriceSet?.shopMoney?.amount || '0').toLocaleString('en-US', { minimumFractionDigits: 2 }),
            options: item.variantTitle && item.variantTitle !== 'Default Title' ? item.variantTitle.split(' / ') : [],
            image: item.image?.url || 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png'
        })),
        summary: {
            subtotal: parseFloat(orderNode.subtotalPriceSet?.shopMoney?.amount || '0').toLocaleString('en-US', { minimumFractionDigits: 2 }),
            delivery: shippingAmount > 0 ? shippingAmount.toLocaleString('en-US', { minimumFractionDigits: 2 }) : (isEn ? 'Free' : 'مجاني'),
            giftWrap: '0.00',
            vat: parseFloat(orderNode.totalTaxSet?.shopMoney?.amount || '0').toLocaleString('en-US', { minimumFractionDigits: 2 }),
            total: parseFloat(orderNode.totalPriceSet?.shopMoney?.amount || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })
        },
        address: orderNode.shippingAddress ? `${orderNode.shippingAddress.address1}, ${orderNode.shippingAddress.city}` : (isEn ? 'No Address' : 'لا يوجد عنوان'),
        paymentMethod: paymentGateway
    };

    return json({ isEn, orderData });
}

const CurrencyIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 1124.14 1256.39" className={`inline-block fill-current ${className || 'h-3.5 w-auto mb-0.5'}`}>
        <path d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z"></path>
        <path d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z"></path>
    </svg>
);

export default function TrackOrderPage() {
    const { isEn, orderData } = useLoaderData<typeof loader>();
    const navigate = useNavigate();

    const forceEnNums = (text: string | number | undefined | null) => {
        if (text == null) return text;
        const parts = String(text).split(/(\d+)/).map((part, i) =>
            /\d+/.test(part) ? <span key={i} className="font-en">{part}</span> : part
        );
        return <span className="inline-flex items-baseline" dir="auto">{parts}</span>;
    };

    const getStepNumber = (step: number) => {
        return forceEnNums(step);
    };

    const [toggles, setToggles] = useState({
        sms: true,
        whatsapp: true,
        email: true,
        app: true
    });

    const handleToggle = (key: keyof typeof toggles) => {
        setToggles(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className={`min-h-screen bg-[#FEF8EB] ${isEn ? 'font-en' : "font-['GE_Dinar_One']"}`} dir={isEn ? 'ltr' : 'rtl'}>

            {/* White Header Section */}
            <div className="bg-white py-4 lg:py-6 border-b border-[#EBEBEB]">
                <div className="max-w-[1200px] mx-auto px-4 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">

                        <div className="flex items-center gap-4 lg:gap-6">
                            <button onClick={() => navigate(-1)} className="flex items-center gap-2 bg-[#BBCFCD] hover:bg-[#A9C1BF] text-[#234745] px-6 py-2 rounded-[25px] font-bold transition-colors w-max h-[42px] shrink-0">
                                {isEn && (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="rotate-180">
                                        <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                                    </svg>
                                )}
                                <span className="text-[16px] leading-none">{isEn ? 'Back' : 'رجوع'}</span>
                                {!isEn && (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                                    </svg>
                                )}
                            </button>

                            <div className="flex flex-col gap-1.5 items-start">
                                <span className="text-[#8B8B8B] text-[14px]">{forceEnNums(isEn ? `Order ${orderData.id}` : `رقم الطلب ${orderData.id}`)}</span>
                                <h1 className="!text-[32px] lg:!text-[40px] font-black text-[#1A1A1A] !leading-tight !m-0">
                                    {isEn ? 'Track Order' : 'تتبع الطلب'}
                                </h1>
                                <span className="text-[#8B8B8B] text-[14px]">{forceEnNums(orderData.date)}</span>
                            </div>
                        </div>

                        <div className="bg-[#F8EFE3] text-[#A67E4E] px-4 py-2 rounded-full flex items-center gap-2 text-[14px] font-bold w-max border border-[#E9D9C3] mt-2 md:mt-0">
                            {isEn && <div className="w-2 h-2 rounded-full bg-[#A67E4E]"></div>}
                            {orderData.status}
                            {!isEn && <div className="w-2 h-2 rounded-full bg-[#A67E4E]"></div>}
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
                            <h2 className="text-[20px] font-black text-[#1A1A1A] mb-6">{isEn ? 'Order Summary' : 'ملخص الطلب'}</h2>

                            {/* Items List */}
                            <div className="flex flex-col gap-6 mb-6">
                                {orderData.items.map((item: any, idx: number) => (
                                    <div key={idx} className="flex gap-4">
                                        <div className="w-[60px] h-[60px] shrink-0 rounded-[12px] overflow-hidden bg-gray-50">
                                            <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 flex flex-col justify-between">
                                            <h3 className="text-[14px] font-bold text-[#1A1A1A] leading-tight line-clamp-2">{item.title}</h3>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {item.options.map((opt: any, i: number) => (
                                                    <span key={i} className="text-[11px] text-[#8B8B8B] bg-[#F5F5F5] px-2 py-0.5 rounded-full border border-[#EBEBEB]">
                                                        {opt}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="shrink-0 flex items-center">
                                            <span className="text-[14px] font-bold text-[#1A1A1A] flex items-center gap-1" dir="ltr"><CurrencyIcon className="h-3 w-auto" /> {forceEnNums(item.price)}</span>
                                            <svg className="w-[14px] h-[14px] ml-1 mr-1 text-[#1A1A1A]" viewBox="0 0 24 24" fill="none"><path d="M4 12h16M12 4v16M8 8l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="w-full h-[1px] bg-[#EBEBEB] mb-6"></div>

                            {/* Cost Breakdown */}
                            <div className="flex flex-col gap-3 mb-6">
                                <div className="flex justify-between items-center text-[14px]">
                                    <span className="text-[#8B8B8B]">{isEn ? 'Subtotal' : 'المجموع الفرعي'}</span>
                                    <span className="font-bold text-[#1A1A1A] flex items-center gap-1" dir="ltr"><CurrencyIcon className="h-3 w-auto" /> {forceEnNums(orderData.summary.subtotal)}</span>
                                </div>
                                <div className="flex justify-between items-center text-[14px]">
                                    <span className="text-[#8B8B8B]">{isEn ? 'Delivery Fee' : 'رسوم التوصيل'}</span>
                                    <span className="font-bold text-[#1A1A1A] flex items-center gap-1" dir="ltr">
                                        {orderData.summary.delivery !== 'Free' && orderData.summary.delivery !== 'مجاني' && <CurrencyIcon className="h-3 w-auto" />}
                                        {forceEnNums(orderData.summary.delivery)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-[14px]">
                                    <span className="text-[#8B8B8B]">{isEn ? 'Gift Wrapping' : 'تغليف الهدايا'}</span>
                                    <span className="font-bold text-[#1A1A1A] flex items-center gap-1" dir="ltr"><CurrencyIcon className="h-3 w-auto" /> {forceEnNums(orderData.summary.giftWrap)}</span>
                                </div>
                                <div className="flex justify-between items-center text-[14px]">
                                    <span className="text-[#8B8B8B]">{isEn ? 'VAT (15%)' : 'ضريبة القيمة المضافة (15%)'}</span>
                                    <span className="font-bold text-[#1A1A1A] flex items-center gap-1" dir="ltr"><CurrencyIcon className="h-3 w-auto" /> {forceEnNums(orderData.summary.vat)}</span>
                                </div>
                            </div>

                            <div className="w-full h-[1px] bg-[#EBEBEB] mb-6"></div>

                            {/* Total */}
                            <div className="flex justify-between items-end mb-6">
                                <div className="flex flex-col">
                                    <span className="text-[18px] font-black text-[#1A1A1A]">{isEn ? 'Total' : 'الإجمالي'}</span>
                                    <span className="text-[11px] text-[#8B8B8B]">{isEn ? 'Inclusive of VAT' : 'شامل ضريبة القيمة المضافة 15%'}</span>
                                </div>
                                <span className="text-[24px] font-black text-[#234745] flex items-center gap-2" dir="ltr"><CurrencyIcon className="h-5 w-auto" /> {forceEnNums(orderData.summary.total)}</span>
                            </div>

                            <div className="w-full h-[1px] bg-[#EBEBEB] mb-6"></div>

                            {/* Details */}
                            <div className="flex flex-col gap-4 mb-8">
                                <div className="flex justify-between items-center text-[14px]">
                                    <span className="text-[#8B8B8B]">{isEn ? 'Delivery Address' : 'عنوان التوصيل'}</span>
                                    <span className="font-medium text-[#234745] text-end">{orderData.address}</span>
                                </div>
                                <div className="flex justify-between items-center text-[14px]">
                                    <span className="text-[#8B8B8B]">{isEn ? 'Payment Method' : 'طريقة الدفع'}</span>
                                    <span className="!font-medium text-[#234745]">{orderData.paymentMethod}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-3">
                                <button className="w-full bg-[#234745] hover:bg-[#1a3533] text-white py-3.5 rounded-full font-bold transition-colors">
                                    {isEn ? 'Reorder' : 'إعادة الطلب'}
                                </button>
                                {orderData.rawFinancialStatus?.toUpperCase() === 'PAID' ? (
                                    <a href={`/api/invoice/${encodeURIComponent(orderData.id)}`} target="_blank" rel="noopener noreferrer" className="w-full bg-white border-[1.5px] border-[#234745] text-[#234745] hover:bg-gray-50 py-3.5 rounded-full font-bold transition-colors flex items-center justify-center cursor-pointer">
                                        {isEn ? 'Download Invoice' : 'تنزيل الفاتورة'}
                                    </a>
                                ) : (
                                    <div className="w-full bg-[#FFF5F5] border border-[#FFD8D8] text-[#E64950] py-3 rounded-full font-bold text-center text-[13px]">
                                        {isEn ? 'Invoice pending payment' : 'الفاتورة بانتظار إتمام الدفع'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Track & Manage Column */}
                    <div className="flex-1 w-full flex flex-col gap-6 order-1">

                        {/* Order Stages */}
                        <div className="bg-white rounded-[12px] border border-[#EBEBEB] p-6 lg:p-8">
                            <h2 className="text-[20px] font-black text-[#1A1A1A] mb-8">{isEn ? 'Order Stages' : 'مراحل الطلب'}</h2>

                            <div className="relative flex flex-col gap-8">
                                {/* Vertical Line */}
                                <div className={`absolute top-4 bottom-4 ${isEn ? 'left-4' : 'right-4'} w-[2px] bg-[#BBCFCD]/40`} />

                                {(() => {
                                    const currentStep = orderData.rawFinancialStatus === 'REFUNDED' ? 0
                                        : orderData.rawFulfillmentStatus === 'FULFILLED' ? 5
                                            : orderData.rawFulfillmentStatus === 'PARTIALLY_FULFILLED' ? 3
                                                : 2;

                                    const toEnglishDigits = (str: string) => {
                                        const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
                                        return str.replace(/[٠-٩]/g, (d) => String(arabicDigits.indexOf(d)));
                                    };

                                    const splitTime = (time: string) => {
                                        const match = time.match(/^(.*?)\s*([a-zA-Z\u0645\u0635]+)$/) || time.match(/^([a-zA-Z\u0645\u0635]+)\s*(.*?)$/);
                                        if (match) {
                                            if (/[a-zA-Z\u0645\u0635]/.test(match[2])) {
                                                return { digits: match[1].trim(), indicator: match[2].trim() };
                                            }
                                            return { digits: match[2].trim(), indicator: match[1].trim() };
                                        }
                                        return { digits: time, indicator: '' };
                                    };

                                    const dateParts = orderData.date.split(/[\u060C,]/);
                                    const rawTimeStr = (dateParts[dateParts.length - 1] || '').trim();
                                    const formattedRawTime = rawTimeStr.replace(/([0-9])([\u0645\u0635])/g, '$1 $2').replace(/([0-9])(AM|PM)/ig, '$1 $2');
                                    const timeStr = toEnglishDigits(formattedRawTime);

                                    const stages = [
                                        {
                                            id: 1,
                                            en: 'Order Received',
                                            ar: 'تم استلام الطلب',
                                            descEn: 'Order successfully received',
                                            descAr: 'تم استلام طلبك بنجاح',
                                            time: timeStr
                                        },
                                        {
                                            id: 2,
                                            en: 'Confirmed',
                                            ar: 'تم التأكيد',
                                            descEn: 'Order has been confirmed',
                                            descAr: 'تم تأكيد طلبك بنجاح'
                                        },
                                        {
                                            id: 3,
                                            en: 'Preparing',
                                            ar: 'جاري التجهيز',
                                            descEn: 'Preparing order',
                                            descAr: 'جاري تجهيز طلبك'
                                        },
                                        {
                                            id: 4,
                                            en: 'On the Way',
                                            ar: 'في الطريق إليك',
                                            descEn: 'On the way to you',
                                            descAr: 'طلبك في الطريق إليك'
                                        },
                                        {
                                            id: 5,
                                            en: 'Delivered',
                                            ar: 'تم التسليم',
                                            descEn: 'Delivered successfully',
                                            descAr: 'تم تسليم طلبك بنجاح'
                                        },
                                    ];

                                    return stages.map((stage) => {
                                        const isCompleted = currentStep >= stage.id;
                                        const isCurrent = currentStep === stage.id;

                                        return (
                                            <div key={stage.id} className="relative flex gap-6 items-start text-start">
                                                {isCompleted ? (
                                                    <div className="w-8 h-8 rounded-full bg-[#234745] shrink-0 flex items-center justify-center relative z-10 ring-4 ring-white shadow-sm">
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                    </div>
                                                ) : (
                                                    <div className={`w-8 h-8 rounded-full border shrink-0 flex items-center justify-center relative z-10 ring-4 ring-white font-en text-[14px] font-bold bg-[#FEF8EB] border-[#BBCFCD]/70 text-[#9FB7AE]`}>
                                                        {stage.id}
                                                    </div>
                                                )}
                                                <div className="flex flex-col pt-0.5">
                                                    <h3 className={`text-[17px] font-black ${isCompleted || isCurrent ? 'text-[#234745]' : 'text-[#9FB7AE]'}`}>
                                                        {isEn ? stage.en : stage.ar}
                                                    </h3>
                                                    <span className={`text-[14px] font-normal mt-1 text-[#9FB7AE]`}>
                                                        {isEn ? stage.descEn : stage.descAr}
                                                    </span>
                                                    {isCompleted && stage.time && (() => {
                                                        const { digits, indicator } = splitTime(stage.time);
                                                        return (
                                                            <div
                                                                className={`flex items-center gap-1 mt-1 text-[13px] font-bold text-[#8B6D43] ${isEn ? 'justify-start' : 'justify-end'}`}
                                                                dir="ltr"
                                                            >
                                                                {isEn ? (
                                                                    <>
                                                                        <span style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}>{digits}</span>
                                                                        {indicator && <span>{indicator}</span>}
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        {indicator && <span>{indicator}</span>}
                                                                        <span style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}>{digits}</span>
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
                        <div className="bg-white rounded-[12px] border border-[#EBEBEB] p-6 lg:p-8">
                            <h2 className="text-[20px] font-black text-[#1A1A1A] mb-6">{isEn ? 'Help and Support' : 'المساعدة والدعم'}</h2>

                            <div className="flex flex-col gap-4">
                                <button className="w-full bg-[#FEF8EB] hover:bg-[#F8EFE3] transition-colors py-4 px-6 rounded-[16px] flex justify-between items-center">
                                    <span className="text-[16px] font-bold text-[#1A1A1A]">{isEn ? 'Contact us via WhatsApp' : 'تواصل معنا عبر WhatsApp'}</span>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#234745" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                </button>

                                <button className="w-full bg-[#FEF8EB] hover:bg-[#F8EFE3] transition-colors py-4 px-6 rounded-[16px] flex justify-between items-center">
                                    <span className="text-[16px] font-bold text-[#1A1A1A]">{isEn ? 'Report an Issue' : 'الإبلاغ عن مشكلة'}</span>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#234745" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                </button>

                                <button className="w-full bg-[#FEF8EB] hover:bg-[#F8EFE3] transition-colors py-4 px-6 rounded-[16px] flex justify-between items-center">
                                    <span className="text-[16px] font-bold text-[#1A1A1A]">{isEn ? 'Delivery FAQ' : 'الأسئلة الشائعة للتوصيل'}</span>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#234745" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                                </button>
                            </div>
                        </div>

                    </div>

                </div>
            </div>
        </div>
    );
}
