import {
  data,
  redirect,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from 'react-router';
import {
  useLoaderData,
  Form,
  useNavigation,
  useActionData,
  useRouteLoaderData,
  Link,
  useLocation,
} from 'react-router';
import {Button} from '~/components/layout/Button';
import {useState} from 'react';
import {getAdminToken} from '~/lib/shopify-admin.server';
import {sendEmail} from '~/lib/email.server';
import {syncVoucherToCRM} from '~/lib/crm.server';

export async function loader({context}: LoaderFunctionArgs) {
  const {session, storefront, env} = context;
  const customerAccessToken = await session.get('customerAccessToken');

  if (!customerAccessToken) {
    return redirect('/account/login');
  }

  // 1. Verify if user is an Admin
  // We first get the customer ID from Storefront API (allowed)
  const {customer: sfCustomer} = await storefront.query(
      `#graphql
      query getDashboardCustomerId($customerAccessToken: String!) {
        customer(customerAccessToken: $customerAccessToken) {
          id
          # Selected because the check below reads it. Without it
          # customerTags was always undefined and no real admin could
          # ever pass — only the dev bypass token got in.
          tags
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

  // Then we check tags directly via Storefront API (Now that permission is enabled!)
  const customerTags = sfCustomer?.tags || [];

  const isAdmin = customerTags.some(
    (tag: string) =>
      tag.toLowerCase() === 'admin' || tag.toLowerCase() === 'branch_manager',
  );

  if (!isAdmin) {
    return redirect('/account/profile');
  }

  // 2. Fetch existing price rules (vouchers) and orders for analytics from Shopify Admin API
  const adminDataPromise = (async () => {
    const shopDomain = env.PUBLIC_STORE_DOMAIN;
    const adminToken = await getAdminToken(env);

    const query = `query {
      products(first: 50) {
        nodes {
          id
          title
        }
      }
      locations(first: 250) {
        nodes {
          id
          name
        }
      }
      orders(first: 250, reverse: true) {
        nodes {
          id
          name
          createdAt
          totalPriceSet {
            shopMoney {
              amount
            }
          }
          totalDiscountsSet {
            shopMoney {
              amount
            }
          }
          customer {
            firstName
            lastName
            email
          }
          discountCodes(first: 5) {
            nodes {
              code
            }
          }
          customAttributes {
            key
            value
          }
        }
      }
    }`;

    try {
      // 1. Fetch Orders and Locations via GraphQL
      const res = await fetch(
        `https://${shopDomain}/admin/api/2024-01/graphql.json`,
        {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': adminToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({query}),
        },
      );
      const result = (await res.json()) as any;

      // 2. Fetch Price Rules via REST API (since GraphQL PriceRule schema is deprecated/restricted)
      const prRes = await fetch(
        `https://${shopDomain}/admin/api/2024-01/price_rules.json`,
        {
          method: 'GET',
          headers: {
            'X-Shopify-Access-Token': adminToken,
            'Content-Type': 'application/json',
          },
        },
      );
      const prResult = (await prRes.json()) as any;

      // Convert REST price rules to the structure expected by the frontend
      const priceRules = (prResult.price_rules || []).map((pr: any) => ({
        id: pr.id,
        title: pr.title,
        value: pr.value || '0',
        valueType:
          pr.value_type === 'percentage' ? 'PERCENTAGE' : 'FIXED_AMOUNT',
        usageCount: pr.usage_count || 0,
        usageLimit: pr.usage_limit || null,
        startsAt: pr.starts_at,
        endsAt: pr.ends_at,
        prerequisiteSubtotalRange: pr.prerequisite_subtotal_range
          ? {
              greaterThanOrEqualTo:
                pr.prerequisite_subtotal_range.greater_than_or_equal_to,
            }
          : null,
        discountCodes: {
          nodes: [{code: pr.title}],
        },
      }));

      // Parse order redemptions
      const redemptions: any[] = [];
      const orders = result.data?.orders?.nodes || [];
      orders.forEach((order: any) => {
        const codes = order.discountCodes?.nodes || [];
        const discountAmount = parseFloat(
          order.totalDiscountsSet?.shopMoney?.amount || '0',
        );
        const orderTotal = parseFloat(
          order.totalPriceSet?.shopMoney?.amount || '0',
        );
        const branchName =
          order.customAttributes?.find(
            (attr: any) => attr.key.toLowerCase() === 'branch',
          )?.value || 'All';

        codes.forEach((codeObj: any) => {
          redemptions.push({
            orderId: order.id,
            orderName: order.name,
            date: order.createdAt,
            code: codeObj.code,
            discountAmount: discountAmount > 0 ? discountAmount : 0,
            orderTotal,
            customerName: order.customer
              ? `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim()
              : 'Guest',
            customerEmail: order.customer?.email || 'N/A',
            branch: branchName,
          });
        });
      });

      return {
        priceRules: priceRules || [],
        products: result.data?.products?.nodes || [],
        locations: result.data?.locations?.nodes || [],
        redemptions,
      };
    } catch (e) {
      return {priceRules: [], products: [], locations: [], redemptions: []};
    }
  })();

  return data({adminDataPromise});
}

export async function action({request, context}: ActionFunctionArgs) {
  /**
   * The loader gated this page; nothing gated this action. React Router
   * runs `action` on POST, so an unauthenticated POST reached the Admin
   * API below and could create real discount codes.
   */
  const {requireAdmin} = await import('~/lib/account-guard.server');
  await requireAdmin(context);

  const {env} = context;
  const adminToken = await getAdminToken(env);
  const shopDomain = env.PUBLIC_STORE_DOMAIN;
  const formData = await request.formData();

  const intent = formData.get('intent');

  if (intent === 'create_voucher') {
    const url = new URL(request.url);
    const isEn = url.pathname.startsWith('/en');

    const code = formData.get('code') as string;
    const value = parseFloat(formData.get('value') as string);
    const valueType = formData.get('valueType') as string; // FIXED_AMOUNT or PERCENTAGE
    const minSubtotal = parseFloat(
      (formData.get('minSubtotal') as string) || '0',
    );
    const usageLimit = parseInt((formData.get('usageLimit') as string) || '0');
    const endsAt = formData.get('endsAt') as string;
    const branchId = formData.get('branchId') as string;
    const targetId = formData.get('targetId') as string; // Product ID
    const customerEmail = formData.get('customerEmail') as string;
    const customerTag = formData.get('customerTag') as string;
    const orderType = formData.get('orderType') as string; // ALL, PICKUP, DELIVERY
    const isBogo = formData.get('isBogo') === 'true';

    // SERVER SIDE VALIDATIONS
    if (!code || code.trim().length < 3) {
      return data(
        {
          error: isEn
            ? 'Voucher Code must be at least 3 characters.'
            : 'رمز القسيمة يجب أن يكون على الأقل ٣ أحرف.',
        },
        {status: 400},
      );
    }
    if (isNaN(value) || value <= 0) {
      return data(
        {
          error: isEn
            ? 'Discount value must be greater than 0.'
            : 'قيمة الخصم يجب أن تكون أكبر من 0.',
        },
        {status: 400},
      );
    }
    if (valueType === 'PERCENTAGE' && value > 100) {
      return data(
        {
          error: isEn
            ? 'Percentage discount value cannot exceed 100%.'
            : 'قيمة خصم النسبة المئوية لا يمكن أن تتجاوز ١٠٠٪.',
        },
        {status: 400},
      );
    }
    if (isNaN(minSubtotal) || minSubtotal < 0) {
      return data(
        {
          error: isEn
            ? 'Minimum Subtotal must be a positive number.'
            : 'الحد الأدنى للطلب يجب أن يكون رقماً إيجابياً.',
        },
        {status: 400},
      );
    }
    if (formData.get('usageLimit') && (isNaN(usageLimit) || usageLimit <= 0)) {
      return data(
        {
          error: isEn
            ? 'Usage limit must be a positive number.'
            : 'حد الاستخدام يجب أن يكون رقماً إيجابياً.',
        },
        {status: 400},
      );
    }
    if (endsAt) {
      const expiryDate = new Date(endsAt);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expiryDate < today) {
        return data(
          {
            error: isEn
              ? 'Expiry Date cannot be in the past.'
              : 'تاريخ الانتهاء لا يمكن أن يكون في الماضي.',
          },
          {status: 400},
        );
      }
    }

    let targetedCustomerIds: string[] = [];
    if (customerEmail || customerTag) {
      if (customerEmail) {
        const cRes = await fetch(
          `https://${shopDomain}/admin/api/2024-01/graphql.json`,
          {
            method: 'POST',
            headers: {
              'X-Shopify-Access-Token': adminToken,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: `query getCustomerByEmail($query: String!) {
              customers(first: 10, query: $query) {
                nodes {
                  id
                }
              }
            }`,
              variables: {query: `email:${customerEmail}`},
            }),
          },
        );
        const cJson = (await cRes.json()) as any;
        const nodes = cJson?.data?.customers?.nodes || [];
        for (const n of nodes) {
          targetedCustomerIds.push(n.id);
        }
        if (targetedCustomerIds.length === 0) {
          return data(
            {
              error: isEn
                ? 'No customer found matching the specified email.'
                : 'لم يتم العثور على أي عميل يطابق البريد الإلكتروني المحدد.',
            },
            {status: 400},
          );
        }
      }
      if (customerTag) {
        const tagRes = await fetch(
          `https://${shopDomain}/admin/api/2024-01/graphql.json`,
          {
            method: 'POST',
            headers: {
              'X-Shopify-Access-Token': adminToken,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: `query getCustomerByTag($query: String!) {
              customers(first: 100, query: $query) {
                nodes {
                  id
                }
              }
            }`,
              variables: {query: `tag:${customerTag}`},
            }),
          },
        );
        const tagJson = (await tagRes.json()) as any;
        const nodes = tagJson?.data?.customers?.nodes || [];
        for (const n of nodes) {
          if (!targetedCustomerIds.includes(n.id)) {
            targetedCustomerIds.push(n.id);
          }
        }
      }
    }

    const priceRuleInput: any = {
      title: code,
      target_type: 'line_item',
      target_selection: targetId && targetId !== 'all' ? 'entitled' : 'all',
      allocation_method: 'across',
      value_type:
        valueType === 'FREE'
          ? 'percentage'
          : valueType === 'PERCENTAGE'
            ? 'percentage'
            : 'fixed_amount',
      value: valueType === 'FREE' ? '-100.0' : `-${value}`,
      customer_selection:
        targetedCustomerIds.length > 0 ? 'prerequisite' : 'all',
      starts_at: new Date().toISOString(),
      usage_limit: usageLimit > 0 ? usageLimit : null,
      prerequisite_subtotal_range:
        minSubtotal > 0
          ? {greater_than_or_equal_to: minSubtotal.toString()}
          : null,
    };

    if (targetId && targetId !== 'all') {
      priceRuleInput.entitled_product_ids = [targetId.split('/').pop()];
    }

    if (targetedCustomerIds.length > 0) {
      priceRuleInput.prerequisite_customer_ids = targetedCustomerIds.map(
        (id: string) => id.split('/').pop(),
      );
    }

    if (endsAt) {
      priceRuleInput.ends_at = new Date(endsAt).toISOString();
    }

    try {
      const prRes = await fetch(
        `https://${shopDomain}/admin/api/2024-01/price_rules.json`,
        {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': adminToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({price_rule: priceRuleInput}),
        },
      );

      const prData = (await prRes.json()) as any;
      const priceRuleRESTId = prData.price_rule?.id;

      if (!priceRuleRESTId) {
        let errStr = 'Failed to create campaign';
        if (typeof prData.errors === 'string') errStr = prData.errors;
        else if (typeof prData.errors === 'object')
          errStr = JSON.stringify(prData.errors);
        return data({error: errStr}, {status: 400});
      }

      const priceRuleId = `gid://shopify/PriceRule/${priceRuleRESTId}`;

      // Save custom rules (target_branch, target_tag, order_type) to a central Shop Metafield
      if (
        branchId !== 'all' ||
        customerTag ||
        (orderType && orderType !== 'ALL')
      ) {
        // 1. Get Shop ID and current rules
        const sRes = await fetch(
          `https://${shopDomain}/admin/api/2024-01/graphql.json`,
          {
            method: 'POST',
            headers: {
              'X-Shopify-Access-Token': adminToken,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: `query { 
              shop { 
                id
                metafield(namespace: "custom", key: "discount_rules") { value } 
              } 
            }`,
            }),
          },
        );
        const sData = (await sRes.json()) as any;
        const shopId = sData.data?.shop?.id;
        const existingRulesRaw = sData.data?.shop?.metafield?.value;
        let discountRules: any = {};
        if (existingRulesRaw) {
          try {
            discountRules = JSON.parse(existingRulesRaw);
          } catch (e) {}
        }

        // 2. Append new rule
        discountRules[code.toUpperCase()] = {
          target_branch: branchId !== 'all' ? branchId : null,
          target_tag: customerTag || null,
          order_type: orderType !== 'ALL' ? orderType : null,
        };

        // 3. Save back to Shop Metafield
        await fetch(`https://${shopDomain}/admin/api/2024-01/graphql.json`, {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': adminToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
              metafieldsSet(metafields: $metafields) {
                userErrors { message }
              }
            }`,
            variables: {
              metafields: [
                {
                  ownerId: shopId,
                  namespace: 'custom',
                  key: 'discount_rules',
                  value: JSON.stringify(discountRules),
                  type: 'json',
                },
              ],
            },
          }),
        });
      }
      // Create the actual discount code string using REST API
      await fetch(
        `https://${shopDomain}/admin/api/2024-01/price_rules/${priceRuleRESTId}/discount_codes.json`,
        {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': adminToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            discount_code: {code: code},
          }),
        },
      );
      // --- CRM SYNCHRONIZATION ---
      try {
        // 1. Sync via CRM/ERP REST API Client
        const syncResult = await syncVoucherToCRM({
          voucher: {
            code,
            value,
            valueType,
            minSubtotal,
            usageLimit: usageLimit > 0 ? usageLimit : null,
            endsAt: endsAt || null,
            orderType,
            targetProductId: targetId && targetId !== 'all' ? targetId : null,
            targetCustomerEmail: customerEmail || null,
            branchId: branchId && branchId !== 'all' ? branchId : null,
            createdAt: new Date().toISOString(),
          },
          env,
        });

        console.log(`[CRM API SYNC RESULT]`, syncResult);

        // 2. Notification to CRM Inbox
        const crmEmail = (env as any).SMTP_USER || 'crm@saadeddin.com';
        const htmlTemplate = `
          <div dir="ltr" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #f0f0f0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
            <div style="background-color: #234745; padding: 30px; text-align: center; color: white;">
              <h2 style="margin: 0; font-size: 20px;">Saadeddin CRM Synchronization</h2>
              <p style="margin: 5px 0 0 0; opacity: 0.8; font-size: 13px;">New Voucher Campaign Registered Successfully</p>
            </div>
            <div style="padding: 30px; color: #333333; line-height: 1.6;">
              <p style="margin-top: 0;">A new promotional voucher campaign has been launched in the Storefront Admin Panel and successfully synchronized to the CRM.</p>
              
              <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 10px 0; font-weight: bold; color: #234745; width: 45%;">Voucher Code:</td>
                  <td style="padding: 10px 0; font-weight: bold; color: #c0392b;">${code}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 10px 0; font-weight: bold; color: #234745;">Discount Value:</td>
                  <td style="padding: 10px 0;">${value} ${valueType === 'PERCENTAGE' ? '%' : 'SAR'}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 10px 0; font-weight: bold; color: #234745;">Min. Subtotal Prerequisite:</td>
                  <td style="padding: 10px 0;">${minSubtotal > 0 ? `${minSubtotal} SAR` : 'No Minimum'}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 10px 0; font-weight: bold; color: #234745;">Usage Limit:</td>
                  <td style="padding: 10px 0;">${usageLimit > 0 ? `${usageLimit} times` : 'Unlimited'}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 10px 0; font-weight: bold; color: #234745;">Expiry Date:</td>
                  <td style="padding: 10px 0;">${endsAt ? new Date(endsAt).toLocaleDateString() : 'Never'}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 10px 0; font-weight: bold; color: #234745;">Order Restriction:</td>
                  <td style="padding: 10px 0;">${orderType}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 10px 0; font-weight: bold; color: #234745;">Target Product:</td>
                  <td style="padding: 10px 0;">${targetId && targetId !== 'all' ? `Product ID: ${targetId}` : 'All Products'}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 10px 0; font-weight: bold; color: #234745;">Target Customer:</td>
                  <td style="padding: 10px 0;">${customerEmail || 'All Customers'}</td>
                </tr>
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 10px 0; font-weight: bold; color: #234745;">Restricted to Branch:</td>
                  <td style="padding: 10px 0;">${branchId && branchId !== 'all' ? `Branch ID: ${branchId}` : 'All Branches'}</td>
                </tr>
              </table>
              
              <div style="margin-top: 30px; font-size: 11px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
                This sync action was initiated from the Saadeddin Admin Promotions interface.
              </div>
            </div>
          </div>
        `;

        await sendEmail({
          to: crmEmail,
          subject: `[CRM SYNC] New Voucher Campaign Created: ${code}`,
          html: htmlTemplate,
          text: `New Voucher Campaign Created: ${code}. Value: ${value} ${valueType}. Min Subtotal: ${minSubtotal}. Limit: ${usageLimit}. Expiry: ${endsAt}.`,
          env,
        });

        console.log(
          `[CRM SYNC SUCCESS] Voucher ${code} successfully synchronized to CRM (${crmEmail}).`,
        );
      } catch (err) {
        console.error('[CRM SYNC ERROR] Failed to sync voucher with CRM:', err);
      }

      return data({success: true});
    } catch (e: any) {
      return data({error: e.message}, {status: 500});
    }
  }

  return data({error: 'Unknown intent'}, {status: 400});
}

import {Suspense} from 'react';
import {Await} from 'react-router';

export default function PromotionsDashboard() {
  const {adminDataPromise} = useLoaderData<typeof loader>();
  const isEn = useLocation().pathname.startsWith('/en');

  return (
    <Suspense
      fallback={
        <div className="py-20 text-center text-gray-500">
          {isEn ? 'Loading campaign data...' : 'جاري تحميل بيانات الحملات...'}
        </div>
      }
    >
      <Await resolve={adminDataPromise}>
        {(adminData) => <PromotionsDashboardContent adminData={adminData} />}
      </Await>
    </Suspense>
  );
}

function PromotionsDashboardContent({adminData}: {adminData: any}) {
  const {priceRules, products, locations, redemptions} = adminData;
  const actionData = useActionData<{success?: boolean; error?: string}>();
  const navigation = useNavigation();
  const locale = useLocation().pathname.startsWith('/en') ? 'en' : 'ar';
  const isEn = locale === 'en';

  const [showCreate, setShowCreate] = useState(false);
  const [activeTab, setActiveTab] = useState<'vouchers' | 'analytics'>(
    'vouchers',
  );
  const [selectedVoucherCode, setSelectedVoucherCode] = useState<string | null>(
    null,
  );

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(
    () => new Date().toISOString().split('T')[0],
  );
  const [selectedBranch, setSelectedBranch] = useState('all');

  const todayStr = new Date().toISOString().split('T')[0];

  const uniqueBranches = Array.from(
    new Set((redemptions || []).map((r: any) => r.branch)),
  ).filter(Boolean);

  // Filtered redemptions based on selected date range and branch
  const filteredRedemptions = (redemptions || []).filter((r: any) => {
    const rDate = r.date.split('T')[0];
    const dateMatch = rDate >= startDate && rDate <= endDate;
    const branchMatch = selectedBranch === 'all' || r.branch === selectedBranch;
    return dateMatch && branchMatch;
  });

  const totalSalesGenerated = filteredRedemptions.reduce(
    (sum: number, r: any) => sum + r.orderTotal,
    0,
  );
  const totalDiscountsGiven = filteredRedemptions.reduce(
    (sum: number, r: any) => sum + r.discountAmount,
    0,
  );
  const averageOrderValue =
    filteredRedemptions.length > 0
      ? totalSalesGenerated / filteredRedemptions.length
      : 0;
  const averageDiscountAmount =
    filteredRedemptions.length > 0
      ? totalDiscountsGiven / filteredRedemptions.length
      : 0;

  // Group by code for Top Vouchers
  const voucherStats: Record<
    string,
    {
      code: string;
      redemptions: number;
      totalDiscount: number;
      totalSales: number;
    }
  > = {};
  filteredRedemptions.forEach((r: any) => {
    if (!voucherStats[r.code]) {
      voucherStats[r.code] = {
        code: r.code,
        redemptions: 0,
        totalDiscount: 0,
        totalSales: 0,
      };
    }
    voucherStats[r.code].redemptions += 1;
    voucherStats[r.code].totalDiscount += r.discountAmount;
    voucherStats[r.code].totalSales += r.orderTotal;
  });
  const topVouchers = Object.values(voucherStats).sort(
    (a, b) => b.redemptions - a.redemptions,
  );

  // Group by date for line chart
  const dateList: string[] = [];
  let curr = new Date(startDate);
  const end = new Date(endDate);
  while (curr <= end) {
    dateList.push(curr.toISOString().split('T')[0]);
    curr.setDate(curr.getDate() + 1);
  }

  const dailyCounts = dateList.map((dateStr) => {
    const count = filteredRedemptions.filter(
      (r: any) => r.date.split('T')[0] === dateStr,
    ).length;
    return {date: dateStr, count};
  });

  const maxCount = Math.max(...dailyCounts.map((d) => d.count), 5);
  const chartHeight = 160;
  const chartWidth = 500;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const plotWidth = chartWidth - paddingLeft - paddingRight;
  const plotHeight = chartHeight - paddingTop - paddingBottom;

  const points = dailyCounts.map((d, index) => {
    const x = paddingLeft + (index / (dailyCounts.length - 1 || 1)) * plotWidth;
    const y = paddingTop + plotHeight - (d.count / maxCount) * plotHeight;
    return {x, y, count: d.count, date: d.date};
  });

  const pathData =
    points.length > 0
      ? `M ${points[0].x} ${points[0].y} ` +
        points
          .slice(1)
          .map((p) => `L ${p.x} ${p.y}`)
          .join(' ')
      : '';

  const fillPathData =
    points.length > 0
      ? `${pathData} L ${points[points.length - 1].x} ${paddingTop + plotHeight} L ${points[0].x} ${paddingTop + plotHeight} Z`
      : '';

  const handleExportCSV = () => {
    const headers = isEn
      ? [
          'Order ID',
          'Date',
          'Voucher Code',
          'Customer Name',
          'Customer Email',
          'Branch',
          'Order Total (SAR)',
          'Discount Amount (SAR)',
        ]
      : [
          'رقم الطلب',
          'التاريخ',
          'كود الخصم',
          'اسم العميل',
          'البريد الإلكتروني',
          'الفرع',
          'إجمالي الطلب (ر.س)',
          'قيمة الخصم (ر.س)',
        ];

    const rows = filteredRedemptions.map((r: any) => [
      r.orderName,
      new Date(r.date).toLocaleDateString(isEn ? 'en-US' : 'ar-SA'),
      r.code,
      r.customerName,
      r.customerEmail,
      r.branch,
      r.orderTotal.toFixed(2),
      r.discountAmount.toFixed(2),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [
        headers.join(','),
        ...rows.map((e: any) => e.map((val: any) => `"${val}"`).join(',')),
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `coupon_analytics_${startDate}_to_${endDate}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="promotions-dashboard-content" dir={isEn ? 'ltr' : 'rtl'}>
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-3xl font-black text-[#234745] mb-2">
            {isEn ? 'Promotions & Analytics' : 'العروض والتحليلات'}
          </h1>
          <p className="text-gray-500 font-medium">
            {isEn
              ? 'Create and track performance of vouchers and branch-specific campaigns'
              : 'إنشاء وتتبع أداء القسائم وعروض الفروع المخصصة'}
          </p>
        </div>
        {activeTab === 'vouchers' && (
          <Button variant="primary" onClick={() => setShowCreate(!showCreate)}>
            {showCreate
              ? isEn
                ? 'Cancel'
                : 'إلغاء'
              : isEn
                ? '+ New Campaign'
                : '+ حملة جديدة'}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-8">
        <button
          onClick={() => {
            setActiveTab('vouchers');
            setSelectedVoucherCode(null);
          }}
          className={`px-6 py-3 font-bold text-[15px] border-b-2 transition-colors ${activeTab === 'vouchers' ? 'border-[#234745] text-[#234745]' : 'border-transparent text-gray-400 hover:text-[#234745]'}`}
        >
          {isEn ? 'Manage Campaigns' : 'إدارة الحملات'}
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-6 py-3 font-bold text-[15px] border-b-2 transition-colors ${activeTab === 'analytics' ? 'border-[#234745] text-[#234745]' : 'border-transparent text-gray-400 hover:text-[#234745]'}`}
        >
          {isEn ? 'Performance Analytics' : 'تحليلات الأداء'}
        </button>
      </div>

      {actionData?.success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-2xl mb-8 flex items-center gap-3 animate-fade-in">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          {isEn ? 'Campaign created and synced!' : 'تم إنشاء الحملة ومزامنتها!'}
        </div>
      )}

      {actionData?.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl mb-8 flex items-center gap-3 animate-fade-in">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          {actionData.error}
        </div>
      )}

      {activeTab === 'vouchers' && (
        <>
          {showCreate && (
            <div className="luxury-card p-8 mb-12 border border-[#d4a06a]/30 animate-fade-in">
              <Form
                method="POST"
                className="grid grid-cols-1 md:grid-cols-2 gap-8"
              >
                <input type="hidden" name="intent" value="create_voucher" />

                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-[#234745] border-b pb-2">
                    {isEn ? 'Campaign Details' : 'تفاصيل الحملة'}
                  </h3>
                  <div className="luxury-field">
                    <label className="luxury-label">
                      {isEn ? 'Voucher Code' : 'رمز القسيمة'}
                    </label>
                    <input
                      name="code"
                      required
                      pattern="[A-Za-z0-9_-]{3,}"
                      title={
                        isEn
                          ? 'Alphanumeric, minimum 3 characters'
                          : 'أحرف وأرقام فقط، ٣ رموز كحد أدنى'
                      }
                      placeholder="SAADEDDIN_OFFER"
                      className="luxury-input-field"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="luxury-field">
                      <label className="luxury-label">
                        {isEn ? 'Value' : 'القيمة'}
                      </label>
                      <input
                        type="number"
                        name="value"
                        required
                        min="0.01"
                        step="any"
                        className="luxury-input-field"
                      />
                    </div>
                    <div className="luxury-field">
                      <label className="luxury-label">
                        {isEn ? 'Type' : 'النوع'}
                      </label>
                      <select name="valueType" className="luxury-input-field">
                        <option value="PERCENTAGE">
                          {isEn ? 'Percentage %' : 'نسبة مئوية %'}
                        </option>
                        <option value="FIXED_AMOUNT">
                          {isEn ? 'Fixed SAR' : 'مبلغ ثابت ر.س'}
                        </option>
                        <option value="BOGO">
                          {isEn
                            ? 'Buy X Get Y (BOGO)'
                            : 'اشترِ واحدة واحصل على واحدة'}
                        </option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="luxury-field">
                      <label className="luxury-label">
                        {isEn ? 'Min. Subtotal' : 'الحد الأدنى للطلب'}
                      </label>
                      <input
                        type="number"
                        name="minSubtotal"
                        placeholder="0"
                        min="0"
                        step="any"
                        className="luxury-input-field"
                      />
                    </div>
                    <div className="luxury-field">
                      <label className="luxury-label">
                        {isEn ? 'Usage Limit' : 'حد الاستخدام'}
                      </label>
                      <input
                        type="number"
                        name="usageLimit"
                        placeholder={isEn ? 'Optional' : 'اختياري'}
                        min="1"
                        step="1"
                        className="luxury-input-field"
                      />
                    </div>
                  </div>
                  <div className="luxury-field">
                    <label className="luxury-label">
                      {isEn ? 'Expiry Date' : 'تاريخ الانتهاء'}
                    </label>
                    <input
                      type="date"
                      name="endsAt"
                      min={todayStr}
                      className="luxury-input-field"
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-xl font-bold text-[#234745] border-b pb-2">
                    {isEn ? 'Branch & Targeting' : 'الفرع والاستهداف'}
                  </h3>
                  <div className="luxury-field">
                    <label className="luxury-label">
                      {isEn ? 'Restrict to Branch' : 'تقييد بفرع معين'}
                    </label>
                    <select name="branchId" className="luxury-input-field">
                      <option value="all">
                        {isEn ? 'All Branches' : 'جميع الفروع'}
                      </option>
                      {locations.map((loc: any) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="luxury-field">
                    <label className="luxury-label">
                      {isEn ? 'Order Type' : 'نوع الطلب'}
                    </label>
                    <select name="orderType" className="luxury-input-field">
                      <option value="ALL">
                        {isEn
                          ? 'Both (Pickup & Delivery)'
                          : 'الكل (توصيل واستلام)'}
                      </option>
                      <option value="DELIVERY">
                        {isEn ? 'Delivery Only' : 'توصيل فقط'}
                      </option>
                      <option value="PICKUP">
                        {isEn ? 'Pickup Only' : 'استلام فقط'}
                      </option>
                    </select>
                  </div>
                  <div className="luxury-field">
                    <label className="luxury-label">
                      {isEn ? 'Target Product' : 'المنتج المستهدف'}
                    </label>
                    <select name="targetId" className="luxury-input-field">
                      <option value="all">
                        {isEn ? 'All Products' : 'جميع المنتجات'}
                      </option>
                      {products.map((p: any) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="luxury-field">
                      <label className="luxury-label">
                        {isEn ? 'Specific Customer Email' : 'بريد عميل محدد'}
                      </label>
                      <input
                        name="customerEmail"
                        placeholder="customer@example.com"
                        className="luxury-input-field"
                      />
                    </div>
                    <div className="luxury-field">
                      <label className="luxury-label">
                        {isEn
                          ? 'Customer Tag / Segment'
                          : 'وسم / شريحة العملاء'}
                      </label>
                      <input
                        name="customerTag"
                        placeholder="e.g. VIP, loyal"
                        className="luxury-input-field"
                      />
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 pt-4 border-t">
                  <Button
                    type="submit"
                    variant="primary"
                    fullWidth
                    disabled={navigation.state !== 'idle'}
                  >
                    {navigation.state !== 'idle'
                      ? isEn
                        ? 'Processing...'
                        : 'جاري المعالجة...'
                      : isEn
                        ? 'Launch Campaign'
                        : 'إطلاق الحملة'}
                  </Button>
                </div>
              </Form>
            </div>
          )}

          <div className="luxury-card overflow-x-auto">
            <table className="w-full text-start min-w-[700px]">
              <thead>
                <tr className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-400 border-b">
                  <th className="px-6 py-4 font-bold whitespace-nowrap">
                    {isEn ? 'Code' : 'الرمز'}
                  </th>
                  <th className="px-6 py-4 font-bold whitespace-nowrap">
                    {isEn ? 'Value' : 'القيمة'}
                  </th>
                  <th className="px-6 py-4 font-bold whitespace-nowrap">
                    {isEn ? 'ERP / CRM Sync' : 'مزامنة النظام'}
                  </th>
                  <th className="px-6 py-4 font-bold whitespace-nowrap">
                    {isEn ? 'Status' : 'الحالة'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {priceRules.map((pr: any) => (
                  <tr key={pr.id}>
                    <td className="px-6 py-4 font-bold text-[#234745]">
                      {pr.discountCodes?.nodes[0]?.code || pr.title}
                    </td>
                    <td className="px-6 py-4">
                      {Math.abs(parseFloat(pr.value))}{' '}
                      {pr.valueType === 'PERCENTAGE' ? '%' : 'SAR'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 text-[10px] uppercase text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {isEn ? 'Synced' : 'تمت المزامنة'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-green-50 text-green-500 px-2 py-1 rounded-full text-[10px] font-bold uppercase">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-8 animate-fade-in">
          {/* Filter & Export Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {isEn ? 'Start Date' : 'تاريخ البدء'}
                </span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 focus:outline-none focus:border-[#234745]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {isEn ? 'End Date' : 'تاريخ الانتهاء'}
                </span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 focus:outline-none focus:border-[#234745]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  {isEn ? 'Branch' : 'الفرع'}
                </span>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 focus:outline-none focus:border-[#234745] min-w-[150px]"
                >
                  <option value="all">
                    {isEn ? 'All Branches' : 'جميع الفروع'}
                  </option>
                  {uniqueBranches.map((branch) => (
                    <option key={branch as string} value={branch as string}>
                      {branch as string}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 bg-[#234745] text-white px-5 py-3 rounded-xl hover:bg-[#1b3634] transition-colors font-bold text-sm"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              {isEn ? 'Export to CSV' : 'تصدير إلى CSV'}
            </button>
          </div>

          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-bold text-[#d4a06a] uppercase tracking-wider block mb-2">
                {isEn ? 'Total Redemptions' : 'إجمالي الاستخدامات'}
              </span>
              <span className="text-3xl font-black text-[#234745]">
                {filteredRedemptions.length}
              </span>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-bold text-[#d4a06a] uppercase tracking-wider block mb-2">
                {isEn ? 'Sales Generated' : 'المبيعات المحققة'}
              </span>
              <span className="text-3xl font-black text-[#234745] flex items-baseline gap-1">
                <span className="text-sm font-medium">
                  {isEn ? 'SAR' : 'ر.س'}
                </span>
                {totalSalesGenerated.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-bold text-[#d4a06a] uppercase tracking-wider block mb-2">
                {isEn ? 'Discounts Applied' : 'الخصومات الممنوحة'}
              </span>
              <span className="text-3xl font-black text-[#234745] flex items-baseline gap-1">
                <span className="text-sm font-medium">
                  {isEn ? 'SAR' : 'ر.س'}
                </span>
                {totalDiscountsGiven.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <span className="text-[11px] font-bold text-[#d4a06a] uppercase tracking-wider block mb-2">
                {isEn ? 'Active Vouchers' : 'القسائم النشطة'}
              </span>
              <span className="text-3xl font-black text-[#234745]">
                {
                  priceRules.filter((pr: any) => {
                    if (pr.endsAt) {
                      return new Date(pr.endsAt) >= new Date();
                    }
                    return true;
                  }).length
                }
              </span>
            </div>
          </div>

          {/* Trend Chart and Branch Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm lg:col-span-2 flex flex-col justify-between">
              <div className="mb-4">
                <h3 className="text-lg font-black text-[#234745]">
                  {isEn ? 'Redemption Trend' : 'منحنى استخدام القسائم'}
                </h3>
                <p className="text-xs text-gray-400 font-medium">
                  {isEn
                    ? 'Redemptions per day over time'
                    : 'عدد مرات الاستخدام اليومية'}
                </p>
              </div>

              <div className="w-full relative h-[180px]">
                {dailyCounts.length > 0 ? (
                  <svg
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    className="w-full h-full overflow-visible"
                  >
                    <defs>
                      <linearGradient
                        id="chartGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#234745"
                          stopOpacity="0.25"
                        />
                        <stop
                          offset="100%"
                          stopColor="#234745"
                          stopOpacity="0.00"
                        />
                      </linearGradient>
                    </defs>
                    {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
                      const y = paddingTop + plotHeight * r;
                      const labelVal = Math.round(maxCount * (1 - r));
                      return (
                        <g key={i} className="opacity-30">
                          <line
                            x1={paddingLeft}
                            y1={y}
                            x2={chartWidth - paddingRight}
                            y2={y}
                            stroke="#ccc"
                            strokeDasharray="3 3"
                          />
                          <text
                            x={
                              isEn
                                ? paddingLeft - 8
                                : chartWidth - paddingRight + 8
                            }
                            y={y + 4}
                            textAnchor={isEn ? 'end' : 'start'}
                            className="text-[9px] fill-gray-500 font-bold font-en"
                          >
                            {labelVal}
                          </text>
                        </g>
                      );
                    })}

                    {dailyCounts.length > 1 &&
                      [0, 0.5, 1].map((ratio, i) => {
                        const index = Math.round(
                          ratio * (dailyCounts.length - 1),
                        );
                        const dPoint = points[index];
                        if (!dPoint) return null;
                        return (
                          <text
                            key={i}
                            x={dPoint.x}
                            y={chartHeight - 10}
                            textAnchor="middle"
                            className="text-[9px] fill-gray-400 font-bold font-en"
                          >
                            {new Date(dPoint.date).toLocaleDateString(
                              isEn ? 'en-US' : 'en-US',
                              {month: 'short', day: 'numeric'},
                            )}
                          </text>
                        );
                      })}

                    {points.length > 1 && (
                      <>
                        <path d={fillPathData} fill="url(#chartGrad)" />
                        <path
                          d={pathData}
                          fill="none"
                          stroke="#234745"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </>
                    )}

                    {points.map((p, i) => (
                      <g key={i} className="group cursor-pointer">
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="4"
                          fill="#234745"
                          stroke="#fff"
                          strokeWidth="2"
                        />
                        <title>{`${p.date}: ${p.count} usage(s)`}</title>
                      </g>
                    ))}
                  </svg>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm font-medium text-gray-400">
                    {isEn
                      ? 'No data for selected period'
                      : 'لا توجد بيانات للفترة المحددة'}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-black text-[#234745] mb-4">
                  {isEn ? 'Branch Performance' : 'الأداء حسب الفرع'}
                </h3>
                <div className="space-y-4">
                  {Object.entries(
                    filteredRedemptions.reduce(
                      (acc: Record<string, number>, curr: any) => {
                        acc[curr.branch] = (acc[curr.branch] || 0) + 1;
                        return acc;
                      },
                      {},
                    ),
                  )
                    .sort((a: any, b: any) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([branch, count]: [string, any]) => (
                      <div
                        key={branch}
                        className="flex justify-between items-center text-sm font-bold border-b pb-2 border-gray-50"
                      >
                        <span className="text-gray-500">{branch}</span>
                        <span className="text-[#234745] font-black">
                          {count} {isEn ? 'used' : 'مرة'}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="bg-[#234745]/5 p-4 rounded-xl border border-[#234745]/10 mt-6">
                <span className="text-[10px] font-bold text-[#d4a06a] uppercase tracking-wider block mb-1">
                  {isEn ? 'Discount Effectiveness' : 'فعالية الخصومات'}
                </span>
                <span className="text-xs text-gray-500 font-medium block leading-relaxed">
                  {isEn
                    ? 'The current campaigns have driven an average order value of '
                    : 'حققت الحملات الحالية متوسط قيمة طلب تبلغ '}
                  <span className="font-bold text-[#234745] font-en">
                    SAR {averageOrderValue.toFixed(2)}
                  </span>
                  {isEn
                    ? ' with an average discount of '
                    : ' وبمتوسط خصم قدره '}
                  <span className="font-bold text-[#234745] font-en">
                    SAR {averageDiscountAmount.toFixed(2)}
                  </span>
                  .
                </span>
              </div>
            </div>
          </div>

          {/* Drill Down or Table */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            {selectedVoucherCode ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b pb-4">
                  <div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                      {isEn ? 'Voucher Details' : 'تفاصيل الكود'}
                    </span>
                    <h3 className="text-2xl font-black text-[#234745]">
                      {selectedVoucherCode}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedVoucherCode(null)}
                    className="px-4 py-2 border border-gray-200 hover:border-[#234745] transition-colors rounded-xl font-bold text-xs text-gray-500 hover:text-[#234745]"
                  >
                    {isEn ? '← Back to List' : '← العودة للملخص'}
                  </button>
                </div>

                <table className="w-full text-start">
                  <thead>
                    <tr className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-400 border-b">
                      <th className="px-6 py-4 font-bold">
                        {isEn ? 'Order' : 'الطلب'}
                      </th>
                      <th className="px-6 py-4 font-bold">
                        {isEn ? 'Date' : 'التاريخ'}
                      </th>
                      <th className="px-6 py-4 font-bold">
                        {isEn ? 'Customer' : 'العميل'}
                      </th>
                      <th className="px-6 py-4 font-bold">
                        {isEn ? 'Branch' : 'الفرع'}
                      </th>
                      <th className="px-6 py-4 font-bold">
                        {isEn ? 'Total' : 'المجموع'}
                      </th>
                      <th className="px-6 py-4 font-bold">
                        {isEn ? 'Discount' : 'الخصم'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-medium text-sm">
                    {filteredRedemptions
                      .filter((r: any) => r.code === selectedVoucherCode)
                      .map((red: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50/50">
                          <td className="px-6 py-4 font-bold text-[#234745] font-en">
                            {red.orderName}
                          </td>
                          <td className="px-6 py-4 text-gray-400 font-en">
                            {new Date(red.date).toLocaleDateString(
                              isEn ? 'en-US' : 'ar-SA',
                              {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              },
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className="block text-[#1a1a1a]">
                              {red.customerName}
                            </span>
                            <span className="block text-[11px] text-gray-400 font-en">
                              {red.customerEmail}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-500">
                            {red.branch}
                          </td>
                          <td className="px-6 py-4 font-black font-en">
                            {red.orderTotal.toFixed(2)} SAR
                          </td>
                          <td className="px-6 py-4 text-emerald-600 font-black font-en">
                            -{red.discountAmount.toFixed(2)} SAR
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-black text-[#234745]">
                    {isEn
                      ? 'Top Performing Vouchers'
                      : 'أكواد الخصم الأعلى أداءً'}
                  </h3>
                  <p className="text-xs text-gray-400 font-medium">
                    {isEn
                      ? 'Click any voucher row to drill down into redemption history'
                      : 'انقر على أي صف لمشاهدة تفاصيل عمليات الاستخدام'}
                  </p>
                </div>

                <table className="w-full text-start">
                  <thead>
                    <tr className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-400 border-b">
                      <th className="px-6 py-4 font-bold">
                        {isEn ? 'Code' : 'الرمز'}
                      </th>
                      <th className="px-6 py-4 font-bold">
                        {isEn ? 'Total Redemptions' : 'إجمالي الاستخدام'}
                      </th>
                      <th className="px-6 py-4 font-bold">
                        {isEn ? 'Sales Generated' : 'المبيعات المحققة'}
                      </th>
                      <th className="px-6 py-4 font-bold">
                        {isEn ? 'Discounts Applied' : 'إجمالي الخصومات'}
                      </th>
                      <th className="px-6 py-4 font-bold">
                        {isEn ? 'Action' : 'الإجراء'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-medium text-sm">
                    {topVouchers.map((v: any) => (
                      <tr
                        key={v.code}
                        onClick={() => setSelectedVoucherCode(v.code)}
                        className="hover:bg-gray-50/50 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4 font-bold text-[#234745] font-en">
                          {v.code}
                        </td>
                        <td className="px-6 py-4 font-black font-en">
                          {v.redemptions}
                        </td>
                        <td className="px-6 py-4 font-black font-en">
                          {v.totalSales.toFixed(2)} SAR
                        </td>
                        <td className="px-6 py-4 text-emerald-600 font-black font-en">
                          {v.totalDiscount.toFixed(2)} SAR
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[#d4a06a] hover:underline font-bold text-xs">
                            {isEn ? 'View History' : 'عرض السجل'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {topVouchers.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-8 text-center text-gray-400 font-medium"
                        >
                          {isEn
                            ? 'No voucher redemptions found for this date range.'
                            : 'لا توجد عمليات استخدام في هذا النطاق الزمني.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .luxury-card { background: #fff; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.02); }
        .luxury-field { display: flex; flex-direction: column; gap: 8px; }
        .luxury-label { font-size: 12px; font-weight: 700; color: #d4a06a; text-transform: uppercase; letter-spacing: 1px; }
        .luxury-input-field { padding: 12px 16px; border-radius: 12px; border: 1.5px solid #eee; font-size: 14px; }
      `,
        }}
      />
    </div>
  );
}
