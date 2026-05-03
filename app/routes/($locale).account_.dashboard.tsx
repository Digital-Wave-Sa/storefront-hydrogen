import { data, redirect, type LoaderFunctionArgs, type ActionFunctionArgs } from 'react-router';
import { useLoaderData, Form, useNavigation, useActionData, useRouteLoaderData, Link } from 'react-router';
import { Button } from '~/components/layout/Button';
import { useState } from 'react';
import { getAdminToken } from '~/lib/shopify-admin.server';

export async function loader({ context }: LoaderFunctionArgs) {
  const { session, storefront, env } = context;
  const customerAccessToken = await session.get('customerAccessToken');

  if (!customerAccessToken) {
    return redirect('/account/login');
  }

  // 1. Verify if user is an Admin/Manager
  // We first get the customer ID from Storefront API (allowed)
  const { customer: sfCustomer } = await storefront.query(`#graphql
    query getCustomerId($customerAccessToken: String!) {
      customer(customerAccessToken: $customerAccessToken) {
        id
      }
    }
  `, {
    variables: { customerAccessToken: customerAccessToken.accessToken },
    cache: storefront.CacheNone(),
  });

  if (!sfCustomer?.id) {
    return redirect('/account/login');
  }

  // Then we check tags via Admin API (Storefront API denies access to tags by default)
  const shopDomain = env.PUBLIC_STORE_DOMAIN;
  const adminToken = await getAdminToken(env);
  
  const adminQuery = `
    query getCustomerTags($id: ID!) {
      customer(id: $id) {
        tags
      }
    }
  `;

  const adminRes = await fetch(`https://${shopDomain}/admin/api/2024-01/graphql.json`, {
    method: 'POST',
    headers: { 'X-Shopify-Access-Token': adminToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: adminQuery, variables: { id: sfCustomer.id } }),
  });

  const adminResult = await adminRes.json();
  const customerTags = adminResult.data?.customer?.tags || [];

  const isAdmin = customerTags.some((tag: string) => 
    tag.toLowerCase() === 'admin' || tag.toLowerCase() === 'branch_manager'
  );

  if (!isAdmin) {
    return redirect('/account/profile');
  }

  // 2. Fetch all locations and their metafields via Admin API proxy logic

  const query = `{
    locations(first: 100) {
      nodes {
        id
        name
        metafields(first: 50) {
          nodes {
            key
            namespace
            value
          }
        }
      }
    }
  }`;

  const res = await fetch(`https://${shopDomain}/admin/api/2024-01/graphql.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': adminToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  const json = await res.json();
  const locations = json?.data?.locations?.nodes || [];

  return data({ 
    locations: locations.map((loc: any) => {
      // DEBUG: Log all keys so we can find the "Working Hours" key
      const keys = loc.metafields.nodes.map((m: any) => m.key);
      console.log(`[DEBUG] Found Metafield Keys for ${loc.name}:`, keys.join(', '));

      return {
        id: loc.id,
        name: loc.name,
        delivery_time: loc.metafields.nodes.find((m: any) => m.key === 'delivery_time')?.value || '30-45 mins',
        delivery_fee: loc.metafields.nodes.find((m: any) => m.key === 'delivery_fee')?.value || '0',
        threshold: loc.metafields.nodes.find((m: any) => m.key === 'free_delivery_threshold')?.value || '430',
        hours_from: loc.metafields.nodes.find((m: any) => m.key === 'working_hours_from')?.value || '8:00 AM',
        hours_to: loc.metafields.nodes.find((m: any) => m.key === 'working_hours_to')?.value || '11:00 PM',
      };
    })
  });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { env } = context;
  const formData = await request.formData();
  const locationId = formData.get('locationId') as string;
  const deliveryTime = formData.get('deliveryTime') as string;
  const hoursFrom = formData.get('hoursFrom') as string;
  const hoursTo = formData.get('hoursTo') as string;
  const deliveryFee = formData.get('deliveryFee') as string;
  const threshold = formData.get('threshold') as string;

  const adminToken = await getAdminToken(env);
  const shopDomain = env.PUBLIC_STORE_DOMAIN;

  // Update metafields via Admin API
  const mutation = `
    mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields {
          id
          value
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    metafields: [
      {
        ownerId: locationId,
        namespace: "custom",
        key: "delivery_time",
        value: deliveryTime,
        type: "single_line_text_field"
      },
      {
        ownerId: locationId,
        namespace: "custom",
        key: "working_hours_from",
        value: hoursFrom,
        type: "single_line_text_field"
      },
      {
        ownerId: locationId,
        namespace: "custom",
        key: "working_hours_to",
        value: hoursTo,
        type: "single_line_text_field"
      },
      {
        ownerId: locationId,
        namespace: "custom",
        key: "delivery_fee",
        value: deliveryFee,
        type: "number_decimal"
      },
      {
        ownerId: locationId,
        namespace: "custom",
        key: "free_delivery_threshold",
        value: threshold,
        type: "number_decimal"
      }
    ]
  };

  const res = await fetch(`https://${shopDomain}/admin/api/2024-01/graphql.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': adminToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: mutation, variables }),
  });

  const result = await res.json();

  if (result.data?.metafieldsSet?.userErrors?.length > 0) {
    return data({ error: result.data.metafieldsSet.userErrors[0].message }, { status: 400 });
  }

  return data({ success: true });
}

export default function BranchDashboard() {
  const { locations } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const actionData = useActionData<{ success?: boolean; error?: string }>();
  const rootData = useRouteLoaderData('root') as any;
  const locale = rootData?.consent?.language?.toLowerCase() || 'ar';
  const isEn = locale === 'en';

  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="account-dashboard-container luxury-bg" dir={isEn ? 'ltr' : 'rtl'}>
      <div className="max-w-6xl mx-auto py-12 px-4">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="luxury-title text-3xl mb-2">
              {isEn ? 'Branch Manager Dashboard' : 'لوحة تحكم مدير الفرع'}
            </h1>
            <p className="luxury-subtitle">
              {isEn ? 'Manage delivery times and fees for all branches' : 'إدارة أوقات ورسوم التوصيل لجميع الفروع'}
            </p>
          </div>
          <Link to={isEn ? "/en/account/profile" : "/account/profile"}>
            <Button variant="secondary" size="sm">
              {isEn ? '← Back to Profile' : '← العودة للملف الشخصي'}
            </Button>
          </Link>
        </div>

        {actionData?.success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-6 animate-fade-in">
             {isEn ? 'Settings updated successfully!' : 'تم تحديث الإعدادات بنجاح!'}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {locations.map((loc: any) => (
            <div key={loc.id} className="luxury-card p-6 border border-[#eee] hover:border-[#d4a06a] transition-all">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-[#2c3e50]">{loc.name}</h3>
                <span className="bg-[#f8f1e7] text-[#d4a06a] text-[10px] uppercase font-bold px-2 py-1 rounded">
                  {isEn ? 'Branch' : 'فرع'}
                </span>
              </div>

              <Form method="POST" className="space-y-4">
                <input type="hidden" name="locationId" value={loc.id} />
                
                <div className="luxury-field">
                  <label className="luxury-label">{isEn ? 'Estimated Delivery Time' : 'وقت التوصيل المتوقع'}</label>
                  <input 
                    name="deliveryTime" 
                    defaultValue={loc.delivery_time} 
                    className="luxury-input-field text-sm"
                    placeholder="e.g. 30-45 mins"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="luxury-field">
                    <label className="luxury-label">{isEn ? 'Open From' : 'يفتح من'}</label>
                    <input 
                      name="hoursFrom" 
                      defaultValue={loc.hours_from} 
                      className="luxury-input-field text-sm"
                      placeholder="8:00 AM"
                    />
                  </div>
                  <div className="luxury-field">
                    <label className="luxury-label">{isEn ? 'Close At' : 'يغلق في'}</label>
                    <input 
                      name="hoursTo" 
                      defaultValue={loc.hours_to} 
                      className="luxury-input-field text-sm"
                      placeholder="11:00 PM"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="luxury-field">
                    <label className="luxury-label">{isEn ? 'Fee (SAR)' : 'رسوم التوصيل'}</label>
                    <input 
                      type="number" 
                      name="deliveryFee" 
                      defaultValue={loc.delivery_fee} 
                      className="luxury-input-field text-sm"
                    />
                  </div>
                  <div className="luxury-field">
                    <label className="luxury-label">{isEn ? 'Threshold' : 'حد التوصيل المجاني'}</label>
                    <input 
                      type="number" 
                      name="threshold" 
                      defaultValue={loc.threshold} 
                      className="luxury-input-field text-sm"
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  variant="primary" 
                  fullWidth 
                  size="sm"
                  disabled={navigation.state !== 'idle'}
                  className="luxury-submit mt-4"
                >
                  {navigation.state !== 'idle' ? (isEn ? 'Saving...' : 'جاري الحفظ...') : (isEn ? 'Update Branch' : 'تحديث الفرع')}
                </Button>
              </Form>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
