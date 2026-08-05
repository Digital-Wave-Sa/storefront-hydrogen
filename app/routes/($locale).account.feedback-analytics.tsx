import {data, redirect, type LoaderFunctionArgs} from 'react-router';
import {useLoaderData, useLocation, useNavigation} from 'react-router';
import {getAdminToken} from '~/lib/shopify-admin.server';
import {adminApiQuery} from '~/lib/admin.server';
import {useI18n} from '~/lib/i18n';

export async function loader({request, context}: LoaderFunctionArgs) {
  const {session, storefront, env} = context;
  const customerAccessToken = await session.get('customerAccessToken');

  if (!customerAccessToken) {
    return redirect('/account/login');
  }

  let isAdmin = false;
  let customerTags: string[] = [];

  if (customerAccessToken.accessToken === 'dev-bypass-token') {
    isAdmin = true;
    const savedPhone = await session.get('loginOtpPhone');
    if (savedPhone) {
      try {
        const {getAdminToken: getShopifyAdminToken} =
          await import('~/lib/shopify-admin.server');
        const adminToken = await getShopifyAdminToken(env);
        const shopDomain = env.SHOPIFY_SHOP
          ? `${env.SHOPIFY_SHOP.replace('.myshopify.com', '')}.myshopify.com`
          : env.PUBLIC_STORE_DOMAIN;
        const cleanPhoneForSearch = savedPhone
          .replace('+966', '')
          .replace(/\D/g, '');
        const queryStr = encodeURIComponent(`*${cleanPhoneForSearch}*`);
        const res = await fetch(
          `https://${shopDomain}/admin/api/2023-04/customers/search.json?query=${queryStr}`,
          {
            headers: {
              'X-Shopify-Access-Token':
                env.SHOPIFY_ADMIN_API_ACCESS_TOKENS || adminToken,
              'Content-Type': 'application/json',
            },
          },
        );
        const d = (await res.json()) as any;
        const found = (d?.customers || []).find((c: any) => {
          const cp = (c.phone || '').replace(/\D/g, '');
          const sp = savedPhone.replace(/\D/g, '');
          if (!cp || !sp) return false;
          return cp === sp || cp.endsWith(sp.slice(-9));
        });
        if (found?.tags) {
          customerTags = found.tags
            .split(',')
            .map((t: string) => t.trim());
        }
      } catch (e) {
        console.error(
          '[FeedbackAnalytics] Failed to fetch customer tags for dev bypass:',
          e,
        );
      }
    }
  } else {
    // Verify if user is an Admin/Manager
    const {customer: sfCustomer} = await storefront.query(
      `#graphql
      query getDashboardCustomerId($customerAccessToken: String!) {
        customer(customerAccessToken: $customerAccessToken) {
          id
        }
      }
    `,
      {
        variables: {customerAccessToken: customerAccessToken.accessToken},
        cache: storefront.CacheNone(),
      },
    );

    if (!sfCustomer?.id) {
      return redirect('/account/login');
    }

    customerTags = sfCustomer?.tags || [];
    isAdmin = customerTags.some((tag: string) => {
      const clean = tag
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]/g, '');
      return (
        clean === 'admin' || clean === 'branchmanager' || clean === 'manager'
      );
    });
  }

  if (!isAdmin) {
    return redirect('/account/profile');
  }

  const branchTag = customerTags.find((tag: string) =>
    tag.toLowerCase().trim().startsWith('branch:'),
  );
  const restrictedBranch = branchTag ? branchTag.split(':')[1]?.trim() : null;

  const adminDataPromise = (async () => {
    const shopDomain = env.PUBLIC_STORE_DOMAIN;
    const adminToken = await getAdminToken(env);

    // Fetch reviews (both storefront_review and order_review metaobjects)
    const reviewsQuery = `
      query {
        storefrontReviews: metaobjects(type: "storefront_review", first: 250) {
          nodes {
            id
            updatedAt
            fields {
              key
              value
            }
          }
        }
        orderReviews: metaobjects(type: "order_review", first: 250) {
          nodes {
            id
            updatedAt
            fields {
              key
              value
            }
          }
        }
      }
    `;

    // Fetch locations
    const locationsQuery = `
      query {
        locations(first: 100) {
          nodes {
            id
            name
            metafields(first: 50, namespace: "custom") {
              nodes {
                key
                value
              }
            }
          }
        }
      }
    `;

    // Fetch orders
    const ordersQuery = `
      query {
        orders(first: 250, sortKey: CREATED_AT, reverse: true) {
          nodes {
            id
            createdAt
            totalPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            customAttributes {
              key
              value
            }
          }
        }
      }
    `;

    let reviewsData: any = [];
    let locationsData: any = [];
    let ordersData: any = [];
    let allLocations: any[] = [];

    try {
      const [revRes, locRes, ordRes] = await Promise.all([
        adminApiQuery(shopDomain, adminToken, reviewsQuery, {}) as Promise<any>,
        adminApiQuery(
          shopDomain,
          adminToken,
          locationsQuery,
          {},
        ) as Promise<any>,
        adminApiQuery(shopDomain, adminToken, ordersQuery, {}) as Promise<any>,
      ]);

      const sfNodes = revRes?.data?.storefrontReviews?.nodes || [];
      const ordNodes = revRes?.data?.orderReviews?.nodes || [];
      const combinedNodes = [...sfNodes, ...ordNodes];

      if (combinedNodes.length > 0) {
        reviewsData = combinedNodes.map((node: any) => {
          const fields: any = {};
          node.fields.forEach((f: any) => {
            fields[f.key] = f.value;
          });
          // Normalization: branch_rating -> rating if rating missing
          if (!fields.rating && fields.branch_rating) {
            fields.rating = fields.branch_rating;
          }
          return {
            id: node.id,
            date: new Date(node.updatedAt).toISOString(),
            ...fields,
          };
        });
      }

      if (locRes?.data?.locations?.nodes) {
        allLocations = locRes.data.locations.nodes.map((node: any) => {
          return {
            id: node.id,
            name: node.name,
            rating: parseFloat(
              node.metafields?.nodes?.find((m: any) => m.key === 'rating')
                ?.value || '0',
            ),
            ratingCount: parseInt(
              node.metafields?.nodes?.find((m: any) => m.key === 'rating_count')
                ?.value || '0',
              10,
            ),
          };
        });

        locationsData = allLocations
          .filter((l: any) => l.ratingCount > 0)
          .sort((a: any, b: any) => b.rating - a.rating);
      }

      if (reviewsData.length > 0 && allLocations.length > 0) {
        reviewsData = reviewsData.map((rev: any) => {
          if (!rev.location_name && rev.location_id) {
            const matchLoc = allLocations.find(
              (l: any) => l.id === rev.location_id,
            );
            if (matchLoc) {
              return {
                ...rev,
                location_name: matchLoc.name,
              };
            }
          }
          return rev;
        });
      }

      if (ordRes?.data?.orders?.nodes) {
        ordersData = ordRes.data.orders.nodes.map((node: any) => {
          const attributes: any = {};
          (node.customAttributes || []).forEach((a: any) => {
            attributes[a.key] = a.value;
          });
          return {
            id: node.id,
            date: node.createdAt,
            totalPrice: parseFloat(
              node.totalPriceSet?.shopMoney?.amount || '0',
            ),
            currency: node.totalPriceSet?.shopMoney?.currencyCode || 'SAR',
            branchName: attributes['Branch'] || null,
            branchId: attributes['Branch ID'] || null,
            fulfillmentType: attributes['Fulfillment Type'] || null,
          };
        });
      }
    } catch (err) {
      console.error('[FeedbackAnalytics] Failed to fetch data:', err);
    }

    if (restrictedBranch) {
      reviewsData = reviewsData.filter(
        (rev: any) =>
          rev.location_name &&
          rev.location_name
            .toLowerCase()
            .includes(restrictedBranch.toLowerCase()),
      );
      locationsData = locationsData.filter(
        (loc: any) =>
          loc.name &&
          loc.name.toLowerCase().includes(restrictedBranch.toLowerCase()),
      );
      ordersData = ordersData.filter((order: any) => {
        const nameMatches =
          order.branchName &&
          order.branchName
            .toLowerCase()
            .includes(restrictedBranch.toLowerCase());
        const idMatches =
          order.branchId &&
          allLocations.some(
            (l) =>
              l.id === order.branchId &&
              l.name.toLowerCase().includes(restrictedBranch.toLowerCase()),
          );
        return nameMatches || idMatches;
      });
    }

    // Calculate Aggregated Metrics
    let totalReviews = reviewsData.length;
    let totalRatingSum = 0;
    let positive = 0;
    let neutral = 0;
    let negative = 0;

    // Trend Data Setup (last 30 days)
    const trends: Record<string, {count: number; ratingSum: number}> = {};
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      trends[d.toISOString().split('T')[0]] = {count: 0, ratingSum: 0};
    }

    reviewsData.forEach((rev: any) => {
      const r = parseFloat(rev.rating) || 0;
      totalRatingSum += r;

      // Sentiment Heuristic
      let isPositive = r >= 4;
      let isNegative = r <= 2;

      const comment = (rev.review_comment || '').toLowerCase();
      const posWords = [
        'great',
        'excellent',
        'love',
        'amazing',
        'delicious',
        'perfect',
        'رائع',
        'ممتاز',
        'لذيذ',
        'حب',
      ];
      const negWords = [
        'bad',
        'terrible',
        'worst',
        'awful',
        'hate',
        'سيء',
        'فظيع',
        'مروع',
        'اكره',
      ];

      if (r === 3) {
        const hasPos = posWords.some((w) => comment.includes(w));
        const hasNeg = negWords.some((w) => comment.includes(w));
        if (hasPos && !hasNeg) isPositive = true;
        else if (hasNeg && !hasPos) isNegative = true;
      }

      if (isPositive) positive++;
      else if (isNegative) negative++;
      else neutral++;

      // Trend
      const dateStr = rev.date.split('T')[0];
      if (trends[dateStr]) {
        trends[dateStr].count++;
        trends[dateStr].ratingSum += r;
      }
    });

    const averageRating =
      totalReviews > 0 ? (totalRatingSum / totalReviews).toFixed(1) : '0.0';
    const sentimentScore =
      totalReviews > 0 ? Math.round((positive / totalReviews) * 100) : 0;

    // Format Trends for Chart
    const trendLabels = Object.keys(trends).map((d) =>
      d.split('-').slice(1).join('/'),
    );
    const trendData = Object.values(trends).map((t) => t.count);

    // Calculate Sales Metrics
    let totalSales = 0;
    let completedOrdersCount = ordersData.length;
    let pickupCount = 0;
    let deliveryCount = 0;

    ordersData.forEach((order: any) => {
      totalSales += order.totalPrice;
      if (order.fulfillmentType === 'Pickup') {
        pickupCount++;
      } else if (order.fulfillmentType === 'Delivery') {
        deliveryCount++;
      }
    });

    const averageOrderValue =
      completedOrdersCount > 0
        ? (totalSales / completedOrdersCount).toFixed(1)
        : '0.0';

    return {
      reviews: reviewsData,
      locations: locationsData,
      metrics: {
        totalReviews,
        averageRating,
        sentimentScore,
        sentimentDistribution: {positive, neutral, negative},
      },
      salesMetrics: {
        totalSales: totalSales.toLocaleString('en-US', {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        }),
        completedOrdersCount,
        averageOrderValue,
        fulfillmentDistribution: {pickup: pickupCount, delivery: deliveryCount},
      },
      trends: {
        labels: trendLabels,
        data: trendData,
      },
    };
  })();

  return data({adminDataPromise, restrictedBranch});
}

import {Suspense} from 'react';
import {Await} from 'react-router';

export default function FeedbackAnalyticsDashboard() {
  const {adminDataPromise, restrictedBranch} = useLoaderData<typeof loader>();
  const locale = useLocation().pathname.startsWith('/en') ? 'en' : 'ar';
  const isEn = locale === 'en';

  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-gray-500">
          {isEn
            ? 'Loading analytics data...'
            : 'جاري تحميل بيانات التحليلات...'}
        </div>
      }
    >
      <Await resolve={adminDataPromise}>
        {(adminData) => (
          <FeedbackAnalyticsDashboardContent
            adminData={adminData}
            restrictedBranch={restrictedBranch}
            locale={locale}
          />
        )}
      </Await>
    </Suspense>
  );
}

function FeedbackAnalyticsDashboardContent({
  adminData,
  restrictedBranch,
  locale,
}: {
  adminData: any;
  restrictedBranch: string | null;
  locale: string;
}) {
  const {reviews, locations, metrics, trends, salesMetrics} = adminData;
  const isEn = locale === 'en';
  const i18n = useI18n(locale);

  // Client-side CSV Export
  const handleExport = () => {
    if (reviews.length === 0) return;

    const headers = [
      'Date',
      'Product',
      'Branch',
      'Customer',
      'Rating',
      'Title',
      'Comment',
    ];
    const csvRows = [headers.join(',')];

    reviews.forEach((r: any) => {
      const row = [
        r.date.split('T')[0],
        `"${r.product_handle || ''}"`,
        `"${r.location_name || ''}"`,
        `"${r.customer_name || ''}"`,
        r.rating || '',
        `"${(r.review_title || '').replace(/"/g, '""')}"`,
        `"${(r.review_comment || '').replace(/"/g, '""')}"`,
      ];
      csvRows.push(row.join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], {type: 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `feedback_export_${new Date().toISOString().split('T')[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Find max for scaling the chart
  const maxTrend = Math.max(...trends.data, 1);

  return (
    <div className="account-dashboard-content" dir={isEn ? 'ltr' : 'rtl'}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#234745] mb-2 flex items-center gap-3 flex-wrap">
            <span>{i18n.common.feedbackAnalytics}</span>
            {restrictedBranch && (
              <span className="text-xs font-semibold bg-[#234745]/10 text-[#234745] px-3 py-1.5 rounded-full inline-block">
                {isEn
                  ? `${restrictedBranch} Branch`
                  : `فرع ${restrictedBranch}`}
              </span>
            )}
          </h1>
          <p className="text-gray-500 font-medium">
            {restrictedBranch
              ? isEn
                ? `Monitor customer satisfaction and reviews for ${restrictedBranch} branch`
                : `مراقبة رضا العملاء والتقييمات لفرع ${restrictedBranch}`
              : isEn
                ? 'Monitor customer satisfaction and reviews across all stores'
                : 'مراقبة رضا العملاء والتقييمات لجميع الفروع'}
          </p>
        </div>
        <button
          onClick={handleExport}
          className="bg-[#234745] text-white px-6 py-2 rounded-xl font-bold hover:bg-[#1a3533] transition-colors flex items-center gap-2"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          {i18n.common.exportData}
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
          <div className="text-gray-500 font-bold uppercase tracking-wider text-xs mb-2">
            {i18n.common.averageRating}
          </div>
          <div className="text-4xl font-black text-[#d4a06a] mb-1">
            {metrics.averageRating}
          </div>
          <div className="flex gap-1 text-[#d4a06a]">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg
                key={star}
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill={
                  star <= parseFloat(metrics.averageRating)
                    ? 'currentColor'
                    : 'none'
                }
                stroke="currentColor"
                strokeWidth="2"
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
          <div className="text-gray-500 font-bold uppercase tracking-wider text-xs mb-2">
            {i18n.common.sentimentHealth}
          </div>
          <div className="text-4xl font-black text-[#234745] mb-2">
            {metrics.sentimentScore}%
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden flex">
            <div
              style={{
                width: `${(metrics.sentimentDistribution.positive / Math.max(metrics.totalReviews, 1)) * 100}%`,
              }}
              className="bg-green-500 h-full"
            ></div>
            <div
              style={{
                width: `${(metrics.sentimentDistribution.neutral / Math.max(metrics.totalReviews, 1)) * 100}%`,
              }}
              className="bg-yellow-400 h-full"
            ></div>
            <div
              style={{
                width: `${(metrics.sentimentDistribution.negative / Math.max(metrics.totalReviews, 1)) * 100}%`,
              }}
              className="bg-red-500 h-full"
            ></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
          <div className="text-gray-500 font-bold uppercase tracking-wider text-xs mb-2">
            {i18n.common.totalReviews}
          </div>
          <div className="text-4xl font-black text-[#234745] mb-1">
            {metrics.totalReviews}
          </div>
          <div className="text-sm text-gray-400 font-medium">
            {isEn ? 'All time' : 'في جميع الأوقات'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Trend Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-[#234745] mb-6">
            {i18n.common.productReviewsTrends}
          </h2>
          <div className="h-[200px] flex items-end justify-between gap-1 mt-auto">
            {trends.data.map((val: number, idx: number) => (
              <div
                key={idx}
                className="relative group w-full flex flex-col items-center justify-end h-full"
              >
                <div
                  className="w-full bg-[#EED5D7] hover:bg-[#d4a06a] transition-all rounded-t-sm"
                  style={{
                    height: `${(val / maxTrend) * 100}%`,
                    minHeight: val > 0 ? '4px' : '0',
                  }}
                />
                <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-gray-800 text-white text-[10px] py-1 px-2 rounded pointer-events-none transition-opacity whitespace-nowrap z-10">
                  {trends.labels[idx]}: {val} {isEn ? 'reviews' : 'تقييم'}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 font-bold mt-3 uppercase tracking-wider">
            <span>{isEn ? '30 Days Ago' : 'قبل ٣٠ يوماً'}</span>
            <span>{isEn ? 'Today' : 'اليوم'}</span>
          </div>
        </div>

        {/* Sentiment Distribution */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <h2 className="text-lg font-bold text-[#234745] mb-6">
            {isEn ? 'Sentiment Breakdown' : 'توزيع المشاعر'}
          </h2>

          <div className="flex-1 flex flex-col justify-center gap-6">
            <div>
              <div className="flex justify-between mb-1 text-sm font-bold text-gray-700">
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  {i18n.common.sentimentPositive}
                </span>
                <span>{metrics.sentimentDistribution.positive}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{
                    width: `${(metrics.sentimentDistribution.positive / Math.max(metrics.totalReviews, 1)) * 100}%`,
                  }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1 text-sm font-bold text-gray-700">
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  {i18n.common.sentimentNeutral}
                </span>
                <span>{metrics.sentimentDistribution.neutral}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-yellow-400 h-2 rounded-full"
                  style={{
                    width: `${(metrics.sentimentDistribution.neutral / Math.max(metrics.totalReviews, 1)) * 100}%`,
                  }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1 text-sm font-bold text-gray-700">
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  {i18n.common.sentimentNegative}
                </span>
                <span>{metrics.sentimentDistribution.negative}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-red-500 h-2 rounded-full"
                  style={{
                    width: `${(metrics.sentimentDistribution.negative / Math.max(metrics.totalReviews, 1)) * 100}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sales & Orders KPIs */}
      <h2 className="text-xl font-black text-[#234745] mb-4 mt-10">
        {isEn ? 'Sales & Operations' : 'المبيعات والعمليات'}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
          <div className="text-gray-500 font-bold uppercase tracking-wider text-xs mb-2">
            {isEn ? 'Total Sales' : 'إجمالي المبيعات'}
          </div>
          <div className="text-3xl font-black text-[#234745] mb-1">
            {salesMetrics.totalSales}{' '}
            <span className="text-sm font-bold text-gray-500">SAR</span>
          </div>
          <div className="text-sm text-gray-400 font-medium">
            {isEn ? 'Recent Orders' : 'الطلبات الأخيرة'}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
          <div className="text-gray-500 font-bold uppercase tracking-wider text-xs mb-2">
            {isEn ? 'Total Orders' : 'إجمالي الطلبات'}
          </div>
          <div className="text-3xl font-black text-[#234745] mb-1">
            {salesMetrics.completedOrdersCount}
          </div>
          <div className="text-sm text-gray-400 font-medium">
            {isEn ? 'Orders mapped to location' : 'الطلبات المرتبطة بالفرع'}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
          <div className="text-gray-500 font-bold uppercase tracking-wider text-xs mb-2">
            {isEn ? 'Average Order Value' : 'متوسط قيمة الطلب'}
          </div>
          <div className="text-3xl font-black text-[#234745] mb-1">
            {salesMetrics.averageOrderValue}{' '}
            <span className="text-sm font-bold text-gray-500">SAR</span>
          </div>
          <div className="text-sm text-gray-400 font-medium">
            {isEn ? 'Average checkout value' : 'متوسط القيمة لكل عميل'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Fulfillment Type Breakdown */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <h2 className="text-lg font-bold text-[#234745] mb-6">
            {isEn ? 'Fulfillment Breakdown' : 'طريقة الاستلام'}
          </h2>

          <div className="flex-1 flex flex-col justify-center gap-6">
            <div>
              <div className="flex justify-between mb-1 text-sm font-bold text-gray-700">
                <span className="flex items-center gap-2">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#234745"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="m16 12-4-4-4 4M12 8v8" />
                  </svg>
                  {isEn ? 'Pickup' : 'استلام من الفرع'}
                </span>
                <span>{salesMetrics.fulfillmentDistribution.pickup}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-[#234745] h-2.5 rounded-full"
                  style={{
                    width: `${(salesMetrics.fulfillmentDistribution.pickup / Math.max(salesMetrics.completedOrdersCount, 1)) * 100}%`,
                  }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1 text-sm font-bold text-gray-700">
                <span className="flex items-center gap-2">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#d4a06a"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="1" y="3" width="15" height="13" />
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                  {isEn ? 'Delivery' : 'توصيل للمنزل'}
                </span>
                <span>{salesMetrics.fulfillmentDistribution.delivery}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-[#d4a06a] h-2.5 rounded-full"
                  style={{
                    width: `${(salesMetrics.fulfillmentDistribution.delivery / Math.max(salesMetrics.completedOrdersCount, 1)) * 100}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Store Info / Meta */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#234745] mb-4">
              {isEn ? 'Location Details' : 'تفاصيل الفرع'}
            </h2>
            <p className="text-gray-500 font-medium mb-6 text-sm">
              {isEn
                ? 'Important properties and metadata loaded for this branch.'
                : 'البيانات والخصائص التعريفية المسجلة لهذا الفرع.'}
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex justify-between border-b border-gray-50 pb-2">
              <span className="text-gray-400 font-medium text-sm">
                {isEn ? 'Location Name' : 'اسم الفرع'}
              </span>
              <span className="text-[#234745] font-bold text-sm">
                {restrictedBranch || (isEn ? 'Global Admin' : 'مدير عام')}
              </span>
            </div>
            <div className="flex justify-between border-b border-gray-50 pb-2">
              <span className="text-gray-400 font-medium text-sm">
                {isEn ? 'System Status' : 'حالة النظام'}
              </span>
              <span className="text-green-500 font-bold text-sm flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse"></span>
                {isEn ? 'Active' : 'نشط'}
              </span>
            </div>
            <div className="flex justify-between pb-2">
              <span className="text-gray-400 font-medium text-sm">
                {isEn ? 'Region' : 'المنطقة / الدولة'}
              </span>
              <span className="text-gray-600 font-bold text-sm">
                {restrictedBranch &&
                restrictedBranch.toLowerCase().includes('dubai')
                  ? isEn
                    ? 'UAE'
                    : 'الإمارات'
                  : isEn
                    ? 'Saudi Arabia'
                    : 'المملكة العربية السعودية'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Branch Performance */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <h2 className="text-lg font-bold text-[#234745] mb-6">
          {i18n.common.branchPerformance}
        </h2>
        <div className="overflow-x-auto">
          <table
            className="w-full text-left border-collapse"
            dir={isEn ? 'ltr' : 'rtl'}
          >
            <thead>
              <tr className="border-b border-gray-100 text-[11px] uppercase tracking-wider text-gray-400">
                <th className="pb-3 font-bold">{isEn ? 'Branch' : 'الفرع'}</th>
                <th className="pb-3 font-bold">{i18n.common.averageRating}</th>
                <th className="pb-3 font-bold">{i18n.common.totalReviews}</th>
                <th className="pb-3 font-bold">
                  {isEn ? 'Performance' : 'الأداء'}
                </th>
              </tr>
            </thead>
            <tbody>
              {locations.length > 0 ? (
                locations.map((loc: any, i: number) => (
                  <tr
                    key={loc.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-4 font-bold text-[#2c3e50]">
                      {loc.name}
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-2 font-bold text-gray-700">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="#d4a06a"
                          stroke="none"
                        >
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                        </svg>
                        {loc.rating.toFixed(1)}
                      </div>
                    </td>
                    <td className="py-4 font-medium text-gray-500">
                      {loc.ratingCount}
                    </td>
                    <td className="py-4">
                      <div className="w-24 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full ${loc.rating >= 4 ? 'bg-green-500' : loc.rating >= 3 ? 'bg-yellow-400' : 'bg-red-500'}`}
                          style={{width: `${(loc.rating / 5) * 100}%`}}
                        ></div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="py-8 text-center text-gray-400 font-medium"
                  >
                    {isEn
                      ? 'No branch ratings found yet.'
                      : 'لم يتم العثور على تقييمات للفروع بعد.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
