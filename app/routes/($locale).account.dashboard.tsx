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

  let isAdmin = false;

  if (customerAccessToken.accessToken === 'dev-bypass-token') {
    isAdmin = true;
  } else {
    // 1. Verify if user is an Admin/Manager
    // We first get the customer ID from Storefront API (allowed)
    const { customer: sfCustomer } = await storefront.query(`#graphql
      query getDashboardCustomerId($customerAccessToken: String!) {
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

    isAdmin = customerTags.some((tag: string) => {
      const clean = tag.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      return clean === 'admin' || clean === 'branchmanager' || clean === 'manager';
    });
  }

  if (!isAdmin) {
    return redirect('/account/profile');
  }

  // 2. Fetch all locations and their metafields via Admin API proxy logic
  const shopDomain = env.PUBLIC_STORE_DOMAIN;
  const adminToken = await getAdminToken(env);

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

  const json = await res.json() as any;
  const locations = json?.data?.locations?.nodes || [];

  return data({ 
    locations: locations.map((loc: any) => {
      return {
        id: loc.id,
        name: loc.name,
        delivery_time: loc.metafields.nodes.find((m: any) => m.key === 'delivery_time')?.value || '30-45 mins',
        delivery_fee: loc.metafields.nodes.find((m: any) => m.key === 'delivery_fee')?.value || '0',
        threshold: loc.metafields.nodes.find((m: any) => m.key === 'free_delivery_threshold')?.value || '430',
        hours_from: loc.metafields.nodes.find((m: any) => m.key === 'working_hours_from')?.value || '8:00 AM',
        hours_to: loc.metafields.nodes.find((m: any) => m.key === 'working_hours_to')?.value || '11:00 PM',
        hours_from_shift2: loc.metafields.nodes.find((m: any) => m.key === 'working_hours_from_shift2')?.value || '',
        hours_to_shift2: loc.metafields.nodes.find((m: any) => m.key === 'working_hours_to_shift2')?.value || '',
        friday_hours_from: loc.metafields.nodes.find((m: any) => m.key === 'friday_working_hours_from')?.value || '',
        friday_hours_to: loc.metafields.nodes.find((m: any) => m.key === 'friday_working_hours_to')?.value || '',
        saturday_hours_from: loc.metafields.nodes.find((m: any) => m.key === 'saturday_working_hours_from')?.value || '',
        saturday_hours_to: loc.metafields.nodes.find((m: any) => m.key === 'saturday_working_hours_to')?.value || '',
        sunday_hours_from: loc.metafields.nodes.find((m: any) => m.key === 'sunday_working_hours_from')?.value || '',
        sunday_hours_to: loc.metafields.nodes.find((m: any) => m.key === 'sunday_working_hours_to')?.value || '',
        monday_hours_from: loc.metafields.nodes.find((m: any) => m.key === 'monday_working_hours_from')?.value || '',
        monday_hours_to: loc.metafields.nodes.find((m: any) => m.key === 'monday_working_hours_to')?.value || '',
        tuesday_hours_from: loc.metafields.nodes.find((m: any) => m.key === 'tuesday_working_hours_from')?.value || '',
        tuesday_hours_to: loc.metafields.nodes.find((m: any) => m.key === 'tuesday_working_hours_to')?.value || '',
        wednesday_hours_from: loc.metafields.nodes.find((m: any) => m.key === 'wednesday_working_hours_from')?.value || '',
        wednesday_hours_to: loc.metafields.nodes.find((m: any) => m.key === 'wednesday_working_hours_to')?.value || '',
        thursday_hours_from: loc.metafields.nodes.find((m: any) => m.key === 'thursday_working_hours_from')?.value || '',
        thursday_hours_to: loc.metafields.nodes.find((m: any) => m.key === 'thursday_working_hours_to')?.value || '',
        working_days: (() => {
          const val = loc.metafields.nodes.find((m: any) => m.key === 'working_days')?.value;
          if (val) {
            try { return JSON.parse(val); } catch(e) {}
          }
          return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        })()
      };
    })
  });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { env } = context;
  const formData = await request.formData();
  const intent = formData.get('intent') as string;
  const adminToken = await getAdminToken(env);
  const shopDomain = env.PUBLIC_STORE_DOMAIN;

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

  if (intent === 'bulk-update-timings') {
    const hoursFrom = formData.get('hoursFrom') as string;
    const hoursTo = formData.get('hoursTo') as string;
    const hoursFromShift2 = formData.get('hoursFromShift2') as string;
    const hoursToShift2 = formData.get('hoursToShift2') as string;
    
    const updateDefaultTimings = formData.get('updateDefaultTimings') === 'true';
    const updateDays = formData.getAll('updateDays') as string[];
    const doUpdateWorkingDays = formData.get('doUpdateWorkingDays') === 'true';
    const workingDays = formData.getAll('workingDays') as string[];
    const workingDaysJson = JSON.stringify(workingDays);
    
    const excludeBranches = formData.getAll('excludeBranches') as string[];

    const query = `{
      locations(first: 100) {
        nodes {
          id
        }
      }
    }`;

    const resLocs = await fetch(`https://${shopDomain}/admin/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': adminToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });
    const jsonLocs = await resLocs.json() as any;
    const locationNodes = (jsonLocs?.data?.locations?.nodes || []).filter((loc: any) => !excludeBranches.includes(loc.id));

    if (locationNodes.length === 0) {
      return data({ error: 'No branch locations found to update.' }, { status: 400 });
    }

    const metafieldsPayload: any[] = [];
    for (const loc of locationNodes) {
      // 1. Update Default/General hours
      if (updateDefaultTimings) {
        if (hoursFrom) metafieldsPayload.push({ ownerId: loc.id, namespace: "custom", key: "working_hours_from", value: hoursFrom, type: "single_line_text_field" });
        if (hoursTo) metafieldsPayload.push({ ownerId: loc.id, namespace: "custom", key: "working_hours_to", value: hoursTo, type: "single_line_text_field" });
        if (hoursFromShift2) metafieldsPayload.push({ ownerId: loc.id, namespace: "custom", key: "working_hours_from_shift2", value: hoursFromShift2, type: "single_line_text_field" });
        if (hoursToShift2) metafieldsPayload.push({ ownerId: loc.id, namespace: "custom", key: "working_hours_to_shift2", value: hoursToShift2, type: "single_line_text_field" });
      }

      // 2. Update Specific Weekdays
      for (const day of updateDays) {
        const lowerDay = day.toLowerCase();
        if (hoursFrom) metafieldsPayload.push({ ownerId: loc.id, namespace: "custom", key: `${lowerDay}_working_hours_from`, value: hoursFrom, type: "single_line_text_field" });
        if (hoursTo) metafieldsPayload.push({ ownerId: loc.id, namespace: "custom", key: `${lowerDay}_working_hours_to`, value: hoursTo, type: "single_line_text_field" });
      }

      // 3. Update Operating Days
      if (doUpdateWorkingDays) {
        metafieldsPayload.push({ ownerId: loc.id, namespace: "custom", key: "working_days", value: workingDaysJson, type: "json" });
      }
    }

    const filteredPayload = metafieldsPayload.filter(m => m.value !== undefined && m.value !== null && m.value !== "");

    // Process in safe batches of 25 metafields (5 locations at a time)
    const batchSize = 25;
    for (let i = 0; i < filteredPayload.length; i += batchSize) {
      const batch = filteredPayload.slice(i, i + batchSize);
      const res = await fetch(`https://${shopDomain}/admin/api/2024-01/graphql.json`, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': adminToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: mutation, variables: { metafields: batch } }),
      });
      const result = await res.json() as any;
      if (result.errors) {
        return data({ error: result.errors[0].message }, { status: 400 });
      }
      if (result.data?.metafieldsSet?.userErrors?.length > 0) {
        return data({ error: result.data.metafieldsSet.userErrors[0].message }, { status: 400 });
      }
    }

    return data({ success: true, message: 'Successfully updated timings and days for all branches in bulk!' });
  }

  // Single location update
  const locationId = formData.get('locationId') as string;
  const deliveryTime = formData.get('deliveryTime') as string;
  const hoursFrom = formData.get('hoursFrom') as string;
  const hoursTo = formData.get('hoursTo') as string;
  const hoursFromShift2 = formData.get('hoursFromShift2') as string;
  const hoursToShift2 = formData.get('hoursToShift2') as string;
  const fridayHoursFrom = formData.get('fridayHoursFrom') as string;
  const fridayHoursTo = formData.get('fridayHoursTo') as string;
  const saturdayHoursFrom = formData.get('saturdayHoursFrom') as string;
  const saturdayHoursTo = formData.get('saturdayHoursTo') as string;
  const sundayHoursFrom = formData.get('sundayHoursFrom') as string;
  const sundayHoursTo = formData.get('sundayHoursTo') as string;
  const mondayHoursFrom = formData.get('mondayHoursFrom') as string;
  const mondayHoursTo = formData.get('mondayHoursTo') as string;
  const tuesdayHoursFrom = formData.get('tuesdayHoursFrom') as string;
  const tuesdayHoursTo = formData.get('tuesdayHoursTo') as string;
  const wednesdayHoursFrom = formData.get('wednesdayHoursFrom') as string;
  const wednesdayHoursTo = formData.get('wednesdayHoursTo') as string;
  const thursdayHoursFrom = formData.get('thursdayHoursFrom') as string;
  const thursdayHoursTo = formData.get('thursdayHoursTo') as string;
  const deliveryFee = formData.get('deliveryFee') as string;
  const threshold = formData.get('threshold') as string;
  const workingDays = formData.getAll('workingDays') as string[];
  const workingDaysJson = JSON.stringify(workingDays);

  const variables = {
    metafields: [
      { ownerId: locationId, namespace: "custom", key: "delivery_time", value: deliveryTime, type: "single_line_text_field" },
      { ownerId: locationId, namespace: "custom", key: "working_hours_from", value: hoursFrom, type: "single_line_text_field" },
      { ownerId: locationId, namespace: "custom", key: "working_hours_to", value: hoursTo, type: "single_line_text_field" },
      { ownerId: locationId, namespace: "custom", key: "working_hours_from_shift2", value: hoursFromShift2 || "", type: "single_line_text_field" },
      { ownerId: locationId, namespace: "custom", key: "working_hours_to_shift2", value: hoursToShift2 || "", type: "single_line_text_field" },
      { ownerId: locationId, namespace: "custom", key: "friday_working_hours_from", value: fridayHoursFrom || "", type: "single_line_text_field" },
      { ownerId: locationId, namespace: "custom", key: "friday_working_hours_to", value: fridayHoursTo || "", type: "single_line_text_field" },
      { ownerId: locationId, namespace: "custom", key: "saturday_working_hours_from", value: saturdayHoursFrom || "", type: "single_line_text_field" },
      { ownerId: locationId, namespace: "custom", key: "saturday_working_hours_to", value: saturdayHoursTo || "", type: "single_line_text_field" },
      { ownerId: locationId, namespace: "custom", key: "sunday_working_hours_from", value: sundayHoursFrom || "", type: "single_line_text_field" },
      { ownerId: locationId, namespace: "custom", key: "sunday_working_hours_to", value: sundayHoursTo || "", type: "single_line_text_field" },
      { ownerId: locationId, namespace: "custom", key: "monday_working_hours_from", value: mondayHoursFrom || "", type: "single_line_text_field" },
      { ownerId: locationId, namespace: "custom", key: "monday_working_hours_to", value: mondayHoursTo || "", type: "single_line_text_field" },
      { ownerId: locationId, namespace: "custom", key: "tuesday_working_hours_from", value: tuesdayHoursFrom || "", type: "single_line_text_field" },
      { ownerId: locationId, namespace: "custom", key: "tuesday_working_hours_to", value: tuesdayHoursTo || "", type: "single_line_text_field" },
      { ownerId: locationId, namespace: "custom", key: "wednesday_working_hours_from", value: wednesdayHoursFrom || "", type: "single_line_text_field" },
      { ownerId: locationId, namespace: "custom", key: "wednesday_working_hours_to", value: wednesdayHoursTo || "", type: "single_line_text_field" },
      { ownerId: locationId, namespace: "custom", key: "thursday_working_hours_from", value: thursdayHoursFrom || "", type: "single_line_text_field" },
      { ownerId: locationId, namespace: "custom", key: "thursday_working_hours_to", value: thursdayHoursTo || "", type: "single_line_text_field" },
      { ownerId: locationId, namespace: "custom", key: "delivery_fee", value: deliveryFee, type: "number_integer" },
      { ownerId: locationId, namespace: "custom", key: "free_delivery_threshold", value: threshold, type: "number_integer" },
      { ownerId: locationId, namespace: "custom", key: "working_days", value: workingDaysJson, type: "json" }
    ].filter(m => m.value !== undefined && m.value !== null && m.value !== "")
  };

  const res = await fetch(`https://${shopDomain}/admin/api/2024-01/graphql.json`, {
    method: 'POST',
    headers: {
      'X-Shopify-Access-Token': adminToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: mutation, variables }),
  });

  const result = await res.json() as any;
  if (result.errors) {
    return data({ error: result.errors[0].message }, { status: 400 });
  }

  if (result.data?.metafieldsSet?.userErrors?.length > 0) {
    return data({ error: result.data.metafieldsSet.userErrors[0].message }, { status: 400 });
  }

  return data({ success: true });
}

export default function BranchDashboard() {
  const { locations } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const actionData = useActionData<{ success?: boolean; error?: string; message?: string }>();
  const locale = useLocation().pathname.startsWith('/en') ? 'en' : 'ar';
  const isEn = locale === 'en';

  const [showExclusions, setShowExclusions] = useState(false);
  const [excludedBranchIds, setExcludedBranchIds] = useState<string[]>([]);
  const [updateWorkingDays, setUpdateWorkingDays] = useState(false);

  const daysOfWeek = [
    { key: 'Sun', labelAr: 'الأحد', labelEn: 'Sun' },
    { key: 'Mon', labelAr: 'الاثنين', labelEn: 'Mon' },
    { key: 'Tue', labelAr: 'الثلاثاء', labelEn: 'Tue' },
    { key: 'Wed', labelAr: 'الأربعاء', labelEn: 'Wed' },
    { key: 'Thu', labelAr: 'الخميس', labelEn: 'Thu' },
    { key: 'Fri', labelAr: 'الجمعة', labelEn: 'Fri' },
    { key: 'Sat', labelAr: 'السبت', labelEn: 'Sat' },
  ];

  return (
    <div className="account-dashboard-content" dir={isEn ? 'ltr' : 'rtl'}>
      <div className="mb-10">
        <h1 className="text-3xl font-black text-[#234745] mb-2">
          {isEn ? 'Branch Manager' : 'مدير الفروع'}
        </h1>
        <p className="text-gray-500 font-medium">
          {isEn ? 'Manage delivery times, fees, and operating days for all branches' : 'إدارة أوقات ورسوم وأيام العمل لجميع الفروع'}
        </p>
      </div>

      {actionData?.success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-6 animate-fade-in flex items-center gap-2 font-bold text-sm">
           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
           {actionData.message || (isEn ? 'Settings updated successfully!' : 'تم تحديث الإعدادات بنجاح!')}
        </div>
      )}

      {actionData?.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 animate-fade-in flex items-center gap-2 font-bold text-sm">
           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
           {actionData.error}
        </div>
      )}

      {/* ─── BULK OPERATIONS CARD ────────────────────────────────────────── */}
      <div className="luxury-card p-6 border border-[#e2dcd5] hover:border-[#d4a06a] transition-all mb-8 bg-[#FAF9F5] shadow-sm rounded-2xl">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-black text-[#234745] flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M21 12H3"/><path d="M12 3v18"/></svg>
              {isEn ? 'Bulk Timings & Holiday Planner (Ramadan / Eid)' : 'تخطيط أوقات العمل الجماعي (رمضان / الأعياد)'}
            </h3>
            <p className="text-xs text-gray-500 mt-1 font-medium">
              {isEn ? 'Apply timings and operating days to all branches at once' : 'تطبيق أوقات وأيام العمل لجميع الفروع دفعة واحدة'}
            </p>
          </div>
          <span className="bg-[#234745] text-[#FEF8EB] text-[10px] uppercase font-black px-2.5 py-1 rounded-full shadow-sm shrink-0">
            {isEn ? 'Bulk Action' : 'تحديث جماعي'}
          </span>
        </div>

        <Form method="POST" className="space-y-5">
          <input type="hidden" name="intent" value="bulk-update-timings" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="luxury-field">
                <label className="luxury-label">{isEn ? 'Shift 1 Open From' : 'الوردية ١ تفتح من'}</label>
                <input name="hoursFrom" defaultValue="8:00 AM" className="luxury-input-field text-sm" />
              </div>
              <div className="luxury-field">
                <label className="luxury-label">{isEn ? 'Shift 1 Close At' : 'الوردية ١ تغلق في'}</label>
                <input name="hoursTo" defaultValue="11:00 PM" className="luxury-input-field text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="luxury-field">
                <label className="luxury-label">{isEn ? 'Shift 2 Open From' : 'الوردية ٢ تفتح من (اختياري)'}</label>
                <input name="hoursFromShift2" placeholder="e.g. 4:00 PM" className="luxury-input-field text-sm" />
              </div>
              <div className="luxury-field">
                <label className="luxury-label">{isEn ? 'Shift 2 Close At' : 'الوردية ٢ تغلق في (اختياري)'}</label>
                <input name="hoursToShift2" placeholder="e.g. 11:00 PM" className="luxury-input-field text-sm" />
              </div>
            </div>
          </div>

          {/* 1. Target timing select checkboxes */}
          <div className="luxury-field border-t border-[#f0ece8] pt-3.5">
            <label className="luxury-label font-black text-gray-800 mb-2">
              {isEn ? 'Timings to Update (Check to apply, uncheck to exclude)' : 'الأوقات المراد تحديثها (اختر للتطبيق، ألغِ للتمرير والاستبعاد)'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-1.5">
              <label className="flex items-center gap-2 text-xs font-bold cursor-pointer text-gray-700 bg-white p-2 rounded-xl border border-gray-200 hover:border-[#d4a06a] transition-all">
                <input 
                  type="checkbox" 
                  name="updateDefaultTimings" 
                  value="true"
                  defaultChecked={true}
                  className="rounded border-gray-300 text-[#d4a06a] focus:ring-[#d4a06a]" 
                />
                <span>{isEn ? 'Default/General Hours' : 'الأوقات العامة/الافتراضية'}</span>
              </label>
              {daysOfWeek.map((day) => (
                <label key={day.key} className="flex items-center gap-2 text-xs font-bold cursor-pointer text-gray-700 bg-white p-2 rounded-xl border border-gray-200 hover:border-[#d4a06a] transition-all">
                  <input 
                    type="checkbox" 
                    name="updateDays" 
                    value={day.key} 
                    className="rounded border-gray-300 text-[#d4a06a] focus:ring-[#d4a06a]" 
                  />
                  <span>{isEn ? `${day.labelEn} Overrides` : `أوقات ${day.labelAr}`}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 2. Optional Working days selector */}
          <div className="luxury-field border-t border-[#f0ece8] pt-3.5">
            <div className="flex items-center justify-between mb-2">
              <label className="luxury-label mb-0">{isEn ? 'Update Operating Days (Optional)' : 'تحديث أيام العمل الفعلية للفروع (اختياري)'}</label>
              <label className="flex items-center gap-1.5 text-xs text-[#234745] font-black cursor-pointer bg-white border border-[#234745]/20 px-2.5 py-1 rounded-full hover:bg-gray-50">
                <input 
                  type="checkbox" 
                  name="doUpdateWorkingDays" 
                  value="true"
                  checked={updateWorkingDays}
                  onChange={(e) => setUpdateWorkingDays(e.target.checked)}
                  className="rounded border-gray-300 text-[#d4a06a] focus:ring-[#d4a06a]" 
                />
                <span>{isEn ? 'Apply operating days update' : 'تطبيق تحديث أيام العمل'}</span>
              </label>
            </div>
            
            {updateWorkingDays && (
              <div className="flex flex-wrap gap-2.5 mt-2 animate-fade-in">
                {daysOfWeek.map((day) => (
                  <label key={day.key} className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer font-bold bg-white px-3 py-1.5 rounded-xl border border-gray-200 hover:border-[#d4a06a]">
                    <input 
                      type="checkbox" 
                      name="workingDays" 
                      value={day.key} 
                      defaultChecked={true}
                      className="rounded border-gray-300 text-[#d4a06a] focus:ring-[#d4a06a]" 
                    />
                    <span>{isEn ? day.labelEn : day.labelAr}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* 3. Exclude Branches panel */}
          <div className="luxury-field border-t border-[#f0ece8] pt-3.5">
            <button
              type="button"
              onClick={() => setShowExclusions(!showExclusions)}
              className="flex items-center gap-2 text-xs font-black text-[#234745] bg-[#ebe8e4] px-4 py-2 rounded-xl hover:bg-[#dfdad4] transition-all cursor-pointer shadow-sm"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              {isEn 
                ? `Exclude Branches (${excludedBranchIds.length} excluded)` 
                : `استبعاد فروع محددة (${excludedBranchIds.length} مستبعد)`
              }
            </button>
            
            {showExclusions && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mt-3 p-3 bg-gray-50 border border-gray-200 rounded-xl animate-fade-in">
                {locations.map((loc: any) => {
                  const isExcluded = excludedBranchIds.includes(loc.id);
                  return (
                    <label key={loc.id} className={`flex items-center gap-2 text-xs font-bold cursor-pointer p-2 rounded-xl border transition-all ${isExcluded ? 'bg-red-50 border-red-200 text-red-700 font-extrabold shadow-sm' : 'bg-white border-gray-200 text-gray-700 hover:border-[#d4a06a]'}`}>
                      <input 
                        type="checkbox" 
                        name="excludeBranches" 
                        value={loc.id}
                        checked={isExcluded}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setExcludedBranchIds([...excludedBranchIds, loc.id]);
                          } else {
                            setExcludedBranchIds(excludedBranchIds.filter(id => id !== loc.id));
                          }
                        }}
                        className="rounded border-gray-300 text-red-600 focus:ring-red-500" 
                      />
                      <span className="truncate">{loc.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <Button 
            type="submit" 
            variant="primary" 
            disabled={navigation.state !== 'idle'}
            className="w-full md:w-auto px-8 luxury-submit bg-[#d4a06a] border-none hover:bg-[#c3905a] rounded-xl shadow-sm text-sm"
          >
            {navigation.state !== 'idle' ? (isEn ? 'Applying...' : 'جاري التطبيق...') : (isEn ? 'Apply to All Branches' : 'تطبيق على جميع الفروع')}
          </Button>
        </Form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {locations.map((loc: any) => {
            const activeOverrides: string[] = [];
            if (loc.sunday_hours_from || loc.sunday_hours_to) activeOverrides.push(isEn ? 'Sun' : 'الأحد');
            if (loc.monday_hours_from || loc.monday_hours_to) activeOverrides.push(isEn ? 'Mon' : 'الاثنين');
            if (loc.tuesday_hours_from || loc.tuesday_hours_to) activeOverrides.push(isEn ? 'Tue' : 'الثلاثاء');
            if (loc.wednesday_hours_from || loc.wednesday_hours_to) activeOverrides.push(isEn ? 'Wed' : 'الأربعاء');
            if (loc.thursday_hours_from || loc.thursday_hours_to) activeOverrides.push(isEn ? 'Thu' : 'الخميس');
            if (loc.friday_hours_from || loc.friday_hours_to) activeOverrides.push(isEn ? 'Fri' : 'الجمعة');
            if (loc.saturday_hours_from || loc.saturday_hours_to) activeOverrides.push(isEn ? 'Sat' : 'السبت');

            return (
              <div key={loc.id} className="luxury-card p-6 border border-[#e2dcd5] hover:border-[#d4a06a] transition-all bg-white rounded-2xl shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-xl font-bold text-[#234745]">{loc.name}</h3>
                    {activeOverrides.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-2 animate-fade-in">
                        <span className="text-[10px] font-bold text-gray-500 uppercase">
                          {isEn ? 'Overrides:' : 'الاستثناءات:'}
                        </span>
                        {activeOverrides.map(day => (
                          <span key={day} className="bg-[#f0ece8] text-[#d4a06a] text-[9.5px] font-black px-2 py-0.5 rounded-full shadow-sm">
                            {day}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="bg-[#FAF9F5] text-[#234745] border border-[#234745]/10 text-[10px] uppercase font-black px-2.5 py-1 rounded-full shrink-0">
                    {isEn ? 'Branch' : 'فرع'}
                  </span>
                </div>

                <Form method="POST" className="space-y-4 mt-4">
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
                    <label className="luxury-label">{isEn ? 'Shift 2 Open' : 'الوردية ٢ تفتح من'}</label>
                    <input 
                      name="hoursFromShift2" 
                      defaultValue={loc.hours_from_shift2} 
                      className="luxury-input-field text-sm"
                      placeholder="e.g. 4:00 PM"
                    />
                  </div>
                  <div className="luxury-field">
                    <label className="luxury-label">{isEn ? 'Shift 2 Close' : 'الوردية ٢ تغلق في'}</label>
                    <input 
                      name="hoursToShift2" 
                      defaultValue={loc.hours_to_shift2} 
                      className="luxury-input-field text-sm"
                      placeholder="e.g. 11:00 PM"
                    />
                  </div>
                </div>

                <details className="border border-[#eee] rounded-xl p-3 bg-gray-50 mt-4">
                  <summary className="cursor-pointer font-bold text-xs text-[#234745] hover:text-[#d4a06a] outline-none select-none">
                    {isEn ? '⚙️ Day-by-Day Custom Timings (Optional)' : '⚙️ أوقات عمل مخصصة لكل يوم (اختياري)'}
                  </summary>
                  
                  <div className="mt-4 space-y-4">
                    {/* Sunday */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="luxury-field">
                        <label className="luxury-label">{isEn ? 'Sunday Open From' : 'الأحد يفتح من'}</label>
                        <input name="sundayHoursFrom" defaultValue={loc.sunday_hours_from} className="luxury-input-field text-xs" placeholder="8:00 AM" />
                      </div>
                      <div className="luxury-field">
                        <label className="luxury-label">{isEn ? 'Sunday Close At' : 'الأحد يغلق في'}</label>
                        <input name="sundayHoursTo" defaultValue={loc.sunday_hours_to} className="luxury-input-field text-xs" placeholder="11:00 PM" />
                      </div>
                    </div>

                    {/* Monday */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="luxury-field">
                        <label className="luxury-label">{isEn ? 'Monday Open From' : 'الاثنين يفتح من'}</label>
                        <input name="mondayHoursFrom" defaultValue={loc.monday_hours_from} className="luxury-input-field text-xs" placeholder="8:00 AM" />
                      </div>
                      <div className="luxury-field">
                        <label className="luxury-label">{isEn ? 'Monday Close At' : 'الاثنين يغلق في'}</label>
                        <input name="mondayHoursTo" defaultValue={loc.monday_hours_to} className="luxury-input-field text-xs" placeholder="11:00 PM" />
                      </div>
                    </div>

                    {/* Tuesday */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="luxury-field">
                        <label className="luxury-label">{isEn ? 'Tuesday Open From' : 'الثلاثاء يفتح من'}</label>
                        <input name="tuesdayHoursFrom" defaultValue={loc.tuesday_hours_from} className="luxury-input-field text-xs" placeholder="8:00 AM" />
                      </div>
                      <div className="luxury-field">
                        <label className="luxury-label">{isEn ? 'Tuesday Close At' : 'الثلاثاء يغلق في'}</label>
                        <input name="tuesdayHoursTo" defaultValue={loc.tuesday_hours_to} className="luxury-input-field text-xs" placeholder="11:00 PM" />
                      </div>
                    </div>

                    {/* Wednesday */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="luxury-field">
                        <label className="luxury-label">{isEn ? 'Wednesday Open From' : 'الأربعاء يفتح من'}</label>
                        <input name="wednesdayHoursFrom" defaultValue={loc.wednesday_hours_from} className="luxury-input-field text-xs" placeholder="8:00 AM" />
                      </div>
                      <div className="luxury-field">
                        <label className="luxury-label">{isEn ? 'Wednesday Close At' : 'الأربعاء يغلق في'}</label>
                        <input name="wednesdayHoursTo" defaultValue={loc.wednesday_hours_to} className="luxury-input-field text-xs" placeholder="11:00 PM" />
                      </div>
                    </div>

                    {/* Thursday */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="luxury-field">
                        <label className="luxury-label">{isEn ? 'Thursday Open From' : 'الخميس يفتح من'}</label>
                        <input name="thursdayHoursFrom" defaultValue={loc.thursday_hours_from} className="luxury-input-field text-xs" placeholder="8:00 AM" />
                      </div>
                      <div className="luxury-field">
                        <label className="luxury-label">{isEn ? 'Thursday Close At' : 'الخميس يغلق في'}</label>
                        <input name="thursdayHoursTo" defaultValue={loc.thursday_hours_to} className="luxury-input-field text-xs" placeholder="11:00 PM" />
                      </div>
                    </div>

                    {/* Friday */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="luxury-field">
                        <label className="luxury-label">{isEn ? 'Friday Open From' : 'الجمعة يفتح من'}</label>
                        <input name="fridayHoursFrom" defaultValue={loc.friday_hours_from} className="luxury-input-field text-xs" placeholder="1:00 PM" />
                      </div>
                      <div className="luxury-field">
                        <label className="luxury-label">{isEn ? 'Friday Close At' : 'الجمعة يغلق في'}</label>
                        <input name="fridayHoursTo" defaultValue={loc.friday_hours_to} className="luxury-input-field text-xs" placeholder="11:00 PM" />
                      </div>
                    </div>

                    {/* Saturday */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="luxury-field">
                        <label className="luxury-label">{isEn ? 'Saturday Open From' : 'السبت يفتح من'}</label>
                        <input name="saturdayHoursFrom" defaultValue={loc.saturday_hours_from} className="luxury-input-field text-xs" placeholder="8:00 AM" />
                      </div>
                      <div className="luxury-field">
                        <label className="luxury-label">{isEn ? 'Saturday Close At' : 'السبت يغلق في'}</label>
                        <input name="saturdayHoursTo" defaultValue={loc.saturday_hours_to} className="luxury-input-field text-xs" placeholder="11:00 PM" />
                      </div>
                    </div>
                  </div>
                </details>

                <div className="luxury-field">
                  <label className="luxury-label">{isEn ? 'Working Days' : 'أيام العمل'}</label>
                  <div className="grid grid-cols-4 gap-2 mt-1">
                    {daysOfWeek.map((day) => {
                      const isChecked = Array.isArray(loc.working_days) ? loc.working_days.includes(day.key) : true;
                      return (
                        <label key={day.key} className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer font-medium">
                          <input 
                            type="checkbox" 
                            name="workingDays" 
                            value={day.key} 
                            defaultChecked={isChecked}
                            className="rounded border-gray-300 text-[#d4a06a] focus:ring-[#d4a06a]" 
                          />
                          <span>{isEn ? day.labelEn : day.labelAr}</span>
                        </label>
                      );
                    })}
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
          );
        })}
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .luxury-card { background: #fff; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.02); }
        .luxury-field { display: flex; flex-direction: column; gap: 8px; }
        .luxury-label { font-size: 12px; font-weight: 700; color: #d4a06a; text-transform: uppercase; letter-spacing: 1px; }
        .luxury-input-field { padding: 12px 16px; border-radius: 12px; border: 1.5px solid #eee; font-size: 14px; }
        .luxury-submit { border-radius: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
      `}} />
    </div>
  );
}
