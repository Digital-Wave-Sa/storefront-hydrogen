import { data, redirect, type LoaderFunctionArgs, type ActionFunctionArgs } from 'react-router';
import { useLoaderData, Form, useNavigation, useActionData, useRouteLoaderData, Link, useLocation } from 'react-router';
import { Button } from '~/components/layout/Button';
import { useState } from 'react';
import { getAdminToken } from '~/lib/shopify-admin.server';

export async function loader({ context }: LoaderFunctionArgs) {
  const { session, storefront, env } = context;
  const customerAccessToken = await session.get('customerAccessToken');

  if (!customerAccessToken) {
    return redirect('/account/login');
  }

  // 1. Verify if user is an Admin
  // We first get the customer ID from Storefront API (allowed)
  const { customer: sfCustomer } = await storefront.query(`#graphql
    query getCustomerId($customerAccessToken: String!) {
      customer(customerAccessToken: $customerAccessToken) {
        id
        tags
      }
    }
  `, {
    variables: { customerAccessToken: customerAccessToken.accessToken },
    cache: storefront.CacheNone(),
  });

  if (!sfCustomer?.id) {
    return redirect('/account/login');
  }

  // Then we check tags directly via Storefront API (Now that permission is enabled!)
  const customerTags = sfCustomer?.tags || [];

  const isAdmin = customerTags.some((tag: string) => 
    tag.toLowerCase() === 'admin' || tag.toLowerCase() === 'branch_manager'
  );

  if (!isAdmin) {
    return redirect('/account/profile');
  }

  // 2. Fetch existing price rules (vouchers) from Shopify Admin API
  const shopDomain = env.PUBLIC_STORE_DOMAIN;
  const adminToken = await getAdminToken(env);

  const query = `{
    priceRules(first: 20, reverse: true) {
      nodes {
        id
        title
        valueType
        value
        allocationMethod
        targetType
        customerSelection
        usageLimit
        startsAt
        endsAt
        prerequisiteSubtotalRange {
          greaterThanOrEqualTo
        }
        discountCodes(first: 1) {
          nodes {
            code
          }
        }
      }
    }
    products(first: 50) {
      nodes {
        id
        title
      }
    }
    locations(first: 50) {
      nodes {
        id
        name
      }
    }
  }`;

  try {
    const res = await fetch(`https://${shopDomain}/admin/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': adminToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    const result = await res.json();
    return data({ 
      priceRules: result.data?.priceRules?.nodes || [],
      products: result.data?.products?.nodes || [],
      locations: result.data?.locations?.nodes || []
    });
  } catch (e) {
    return data({ priceRules: [], products: [], locations: [] });
  }
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { env } = context;
  const adminToken = await getAdminToken(env);
  const shopDomain = env.PUBLIC_STORE_DOMAIN;
  const formData = await request.formData();
  
  const intent = formData.get('intent');

  if (intent === 'create_voucher') {
    const code = formData.get('code') as string;
    const value = parseFloat(formData.get('value') as string);
    const valueType = formData.get('valueType') as string; // FIXED_AMOUNT or PERCENTAGE
    const minSubtotal = parseFloat(formData.get('minSubtotal') as string || '0');
    const usageLimit = parseInt(formData.get('usageLimit') as string || '0');
    const endsAt = formData.get('endsAt') as string;
    const branchId = formData.get('branchId') as string;
    const targetId = formData.get('targetId') as string; // Product ID
    const customerEmail = formData.get('customerEmail') as string;
    const orderType = formData.get('orderType') as string; // ALL, PICKUP, DELIVERY
    const isBogo = formData.get('isBogo') === 'true';

    const priceRuleInput: any = {
      title: code,
      targetType: isBogo ? "LINE_ITEM" : "LINE_ITEM",
      targetSelection: targetId && targetId !== 'all' ? "ENTITLED" : "ALL",
      allocationMethod: "ACROSS",
      valueType: valueType === 'FREE' ? 'PERCENTAGE' : valueType,
      value: valueType === 'FREE' ? -100.0 : (valueType === 'PERCENTAGE' ? -value : -value),
      customerSelection: customerEmail ? "PREREQUISITE" : "ALL",
      startsAt: new Date().toISOString(),
      usageLimit: usageLimit > 0 ? usageLimit : null,
      prerequisiteSubtotalRange: minSubtotal > 0 ? { greaterThanOrEqualTo: minSubtotal } : null
    };

    if (targetId && targetId !== 'all') {
        priceRuleInput.entitledProductIds = [targetId];
    }

    if (customerEmail) {
        priceRuleInput.prerequisiteCustomerIds = []; // This requires fetching ID by email first, but for now we use titles for simplicity or skip for now
    }

    if (endsAt) {
      (priceRuleInput as any).endsAt = new Date(endsAt).toISOString();
    }

    try {
      const prRes = await fetch(`https://${shopDomain}/admin/api/2024-01/graphql.json`, {
        method: 'POST',
        headers: { 'X-Shopify-Access-Token': adminToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: `mutation createPR($input: PriceRuleInput!) {
            priceRuleCreate(priceRule: $input) {
              priceRule { id }
              userErrors { message }
            }
          }`,
          variables: { input: priceRuleInput }
        }),
      });

      const prData = await prRes.json();
      const priceRuleId = prData.data?.priceRuleCreate?.priceRule?.id;

      if (!priceRuleId) {
        return data({ error: prData.data?.priceRuleCreate?.userErrors[0]?.message || 'Failed to create' }, { status: 400 });
      }

      await fetch(`https://${shopDomain}/admin/api/2024-01/graphql.json`, {
        method: 'POST',
        headers: { 'X-Shopify-Access-Token': adminToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          query: `mutation createDC($id: ID!, $code: String!) {
            discountCodeCreate(priceRuleId: $id, discountCode: { code: $code }) {
              discountCode { id }
            }
          }`,
          variables: { id: priceRuleId, code: code }
        }),
      });

      return data({ success: true });
    } catch (e: any) {
      return data({ error: e.message }, { status: 500 });
    }
  }

  return data({ error: 'Unknown intent' }, { status: 400 });
}

export default function PromotionsDashboard() {
  const { priceRules, products, locations } = useLoaderData<typeof loader>();
  const actionData = useActionData<{ success?: boolean; error?: string }>();
  const navigation = useNavigation();
  const locale = useLocation().pathname.startsWith('/en') ? 'en' : 'ar';
  const isEn = locale === 'en';

  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="promotions-dashboard-content" dir={isEn ? 'ltr' : 'rtl'}>
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-3xl font-black text-[#1b3d2e] mb-2">
            {isEn ? 'Promotions' : 'العروض والقسائم'}
          </h1>
          <p className="text-gray-500 font-medium">
            {isEn ? 'Create and manage vouchers and branch-specific campaigns' : 'إنشاء وإدارة القسائم وعروض الفروع المخصصة'}
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? (isEn ? 'Cancel' : 'إلغاء') : (isEn ? '+ New Campaign' : '+ حملة جديدة')}
        </Button>
      </div>

        {actionData?.success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-2xl mb-8 flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
             {isEn ? 'Campaign created and synced!' : 'تم إنشاء الحملة ومزامنتها!'}
          </div>
        )}

        {showCreate && (
          <div className="luxury-card p-8 mb-12 border border-[#d4a06a]/30">
            <Form method="POST" className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <input type="hidden" name="intent" value="create_voucher" />
              
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-[#1b3d2e] border-b pb-2">
                  {isEn ? 'Campaign Details' : 'تفاصيل الحملة'}
                </h3>
                <div className="luxury-field">
                  <label className="luxury-label">{isEn ? 'Voucher Code' : 'رمز القسيمة'}</label>
                  <input name="code" required placeholder="SAADEDDIN_OFFER" className="luxury-input-field" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="luxury-field">
                    <label className="luxury-label">{isEn ? 'Value' : 'القيمة'}</label>
                    <input type="number" name="value" required className="luxury-input-field" />
                  </div>
                  <div className="luxury-field">
                    <label className="luxury-label">{isEn ? 'Type' : 'النوع'}</label>
                    <select name="valueType" className="luxury-input-field">
                      <option value="PERCENTAGE">{isEn ? 'Percentage %' : 'نسبة مئوية %'}</option>
                      <option value="FIXED_AMOUNT">{isEn ? 'Fixed SAR' : 'مبلغ ثابت ر.س'}</option>
                      <option value="BOGO">{isEn ? 'Buy X Get Y (BOGO)' : 'اشترِ واحدة واحصل على واحدة'}</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="luxury-field">
                    <label className="luxury-label">{isEn ? 'Min. Subtotal' : 'الحد الأدنى للطلب'}</label>
                    <input type="number" name="minSubtotal" placeholder="0" className="luxury-input-field" />
                  </div>
                  <div className="luxury-field">
                    <label className="luxury-label">{isEn ? 'Usage Limit' : 'حد الاستخدام'}</label>
                    <input type="number" name="usageLimit" placeholder="Optional" className="luxury-input-field" />
                  </div>
                </div>
                <div className="luxury-field">
                  <label className="luxury-label">{isEn ? 'Expiry Date' : 'تاريخ الانتهاء'}</label>
                  <input type="date" name="endsAt" className="luxury-input-field" />
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-xl font-bold text-[#1b3d2e] border-b pb-2">
                  {isEn ? 'Branch & Targeting' : 'الفرع والاستهداف'}
                </h3>
                <div className="luxury-field">
                  <label className="luxury-label">{isEn ? 'Restrict to Branch' : 'تقييد بفرع معين'}</label>
                  <select name="branchId" className="luxury-input-field">
                    <option value="all">{isEn ? 'All Branches' : 'جميع الفروع'}</option>
                    {locations.map((loc: any) => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>
                <div className="luxury-field">
                  <label className="luxury-label">{isEn ? 'Order Type' : 'نوع الطلب'}</label>
                  <select name="orderType" className="luxury-input-field">
                    <option value="ALL">{isEn ? 'Both (Pickup & Delivery)' : 'الكل (توصيل واستلام)'}</option>
                    <option value="DELIVERY">{isEn ? 'Delivery Only' : 'توصيل فقط'}</option>
                    <option value="PICKUP">{isEn ? 'Pickup Only' : 'استلام فقط'}</option>
                  </select>
                </div>
                <div className="luxury-field">
                  <label className="luxury-label">{isEn ? 'Target Product' : 'المنتج المستهدف'}</label>
                  <select name="targetId" className="luxury-input-field">
                    <option value="all">{isEn ? 'All Products' : 'جميع المنتجات'}</option>
                    {products.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
                <div className="luxury-field">
                   <label className="luxury-label">{isEn ? 'Specific Customer Email' : 'بريد عميل محدد'}</label>
                   <input name="customerEmail" placeholder="customer@example.com" className="luxury-input-field" />
                </div>
              </div>

              <div className="md:col-span-2 pt-4 border-t">
                <Button type="submit" variant="primary" fullWidth disabled={navigation.state !== 'idle'}>
                  {navigation.state !== 'idle' ? (isEn ? 'Processing...' : 'جاري المعالجة...') : (isEn ? 'Launch Campaign' : 'إطلاق الحملة')}
                </Button>
              </div>
            </Form>
          </div>
        )}

        <div className="luxury-card overflow-hidden">
          <table className="w-full text-start">
            <thead>
              <tr className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-400 border-b">
                <th className="px-6 py-4 font-bold">{isEn ? 'Code' : 'الرمز'}</th>
                <th className="px-6 py-4 font-bold">{isEn ? 'Value' : 'القيمة'}</th>
                <th className="px-6 py-4 font-bold">{isEn ? 'Status' : 'الحالة'}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {priceRules.map((pr: any) => (
                <tr key={pr.id}>
                  <td className="px-6 py-4 font-bold text-[#1b3d2e]">{pr.discountCodes?.nodes[0]?.code || pr.title}</td>
                  <td className="px-6 py-4">{Math.abs(parseFloat(pr.value))} {pr.valueType === 'PERCENTAGE' ? '%' : 'SAR'}</td>
                  <td className="px-6 py-4">
                    <span className="bg-green-50 text-green-500 px-2 py-1 rounded-full text-[10px] font-bold uppercase">Active</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .luxury-card { background: #fff; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.02); }
        .luxury-field { display: flex; flex-direction: column; gap: 8px; }
        .luxury-label { font-size: 12px; font-weight: 700; color: #d4a06a; text-transform: uppercase; letter-spacing: 1px; }
        .luxury-input-field { padding: 12px 16px; border-radius: 12px; border: 1.5px solid #eee; font-size: 14px; }
      `}} />
    </div>
  );
}
