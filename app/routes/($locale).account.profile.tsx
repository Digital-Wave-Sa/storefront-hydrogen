import type { CustomerFragment } from 'storefrontapi.generated';
import type { CustomerUpdateInput } from '@shopify/hydrogen/storefront-api-types';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { data, redirect, type MetaFunction } from 'react-router';
import {
  Form,
  Link,
  useActionData,
  useNavigation,
  useOutletContext,
  useRouteLoaderData,
} from 'react-router';
import { Button } from '~/components/layout/Button';
import { useState } from 'react';
export type ActionResponse = {
  error: string | null;
  customer: CustomerFragment | null;
};

export const meta: MetaFunction<typeof loader> = () => {
  return [{ title: 'Profile | Saadeddin' }];
};

export async function loader({ context }: LoaderFunctionArgs) {
  const customerAccessToken = await context.session.get('customerAccessToken');
  if (!customerAccessToken) {
    return redirect('/account/login');
  }
  return data({});
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { session, storefront } = context;

  if (request.method !== 'PUT') {
    return data({ error: 'Method not allowed' }, { status: 405 });
  }

  const form = await request.formData();
  const customerAccessToken = await session.get('customerAccessToken');
  if (!customerAccessToken) {
    return data({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const intent = form.get('intent');
    const password = getPassword(form);
    const customer: CustomerUpdateInput = {};

    if (intent === 'deleteAccount') {
      const { customer: currentCustomer } = await storefront.query(
        `#graphql
        query getProfileCustomerId($customerAccessToken: String!) {
          customer(customerAccessToken: $customerAccessToken) {
            id
          }
        }
      `,
        {
          variables: {
            customerAccessToken: customerAccessToken.accessToken,
          },
        },
      );
      if (!currentCustomer) throw new Error('Customer not found');

      const adminAccessToken = (context.env as any).SHOPIFY_ADMIN_API_ACCESS_TOKEN;
      if (adminAccessToken) {
        const numericalId = currentCustomer.id.split('/').pop();
        const response = await fetch(`https://${context.env.PUBLIC_STORE_DOMAIN}/admin/api/2024-01/customers/${numericalId}.json`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': adminAccessToken,
          },
        });
        if (!response.ok) {
          throw new Error('Failed to delete account on the server.');
        }
      }
      
      session.unset('customerAccessToken');
      return redirect('/', {
        headers: {
          'Set-Cookie': await session.commit(),
        },
      });
    }

    const validInputKeys = [
      'firstName',
      'lastName',
      'email',
      'phone',
    ] as const;

    for (const [key, value] of form.entries()) {
      if (!validInputKeys.includes(key as any)) {
        continue;
      }
      if (typeof value === 'string' && value.length) {
        if (key === 'phone') {
          let cleanPhone = value.replace(/\D/g, '');
          // If the original value started with +, keep it simple
          if (value.startsWith('+')) {
            customer.phone = value.replace(/\s/g, '');
          } else if (cleanPhone.startsWith('00966')) {
            customer.phone = `+${cleanPhone.substring(2)}`;
          } else if (cleanPhone.startsWith('966')) {
            customer.phone = `+${cleanPhone}`;
          } else {
            const finalPhone = cleanPhone.startsWith('0') ? cleanPhone.substring(1) : cleanPhone;
            customer.phone = finalPhone ? `+966${finalPhone}` : undefined;
          }
          console.log('DEBUG: Final phone string being sent to Shopify:', customer.phone);
        } else {
          customer[key as (typeof validInputKeys)[number]] = value;
        }
      }
    }



    if (password) {
      customer.password = password;
    }

    const { customer: currentCustomer } = await storefront.query(
      `#graphql
      query getProfileCustomerId($customerAccessToken: String!) {
        customer(customerAccessToken: $customerAccessToken) {
          id
        }
      }
    `,
      {
        variables: {
          customerAccessToken: customerAccessToken.accessToken,
        },
      },
    );

    if (!currentCustomer) {
      throw new Error('Customer not found');
    }

    const birthdate = form.get('birthdate');
    if (birthdate) {
      // SYNC WITH CRM / ADMIN API
      try {
        const adminAccessToken = (context.env as any).SHOPIFY_ADMIN_API_ACCESS_TOKEN;
        if (adminAccessToken) {
          const numericalId = currentCustomer.id.split('/').pop();
          await fetch(`https://${context.env.PUBLIC_STORE_DOMAIN}/admin/api/2024-01/customers/${numericalId}.json`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-Shopify-Access-Token': adminAccessToken,
            },
            body: JSON.stringify({
              customer: {
                id: numericalId,
                metafields: [
                  {
                    namespace: 'custom',
                    key: 'birthdate',
                    value: birthdate,
                    type: 'date'
                  }
                ]
              }
            })
          });
        }
      } catch (e) {
        console.error('Failed to sync birthdate:', e);
      }
    }

    const updated = await storefront.mutate(CUSTOMER_UPDATE_MUTATION, {
      variables: {
        customerAccessToken: customerAccessToken.accessToken,
        customer,
      },
    });

    if (updated.customerUpdate?.customerUserErrors?.length) {
      return data(
        { error: updated.customerUpdate?.customerUserErrors[0].message },
        { status: 400 },
      );
    }

    if (updated.customerUpdate?.customerAccessToken?.accessToken) {
      session.set(
        'customerAccessToken',
        updated.customerUpdate?.customerAccessToken,
      );
    }

    return data(
      { error: null, customer: updated.customerUpdate?.customer },
      {
        headers: {
          'Set-Cookie': await session.commit(),
        },
      },
    );
  } catch (error: any) {
    return data({ error: error.message, customer: null }, { status: 400 });
  }
}

export default function AccountProfile() {
  const { customer: loaderCustomer } = useOutletContext<{ customer: CustomerFragment }>();
  const navigation = useNavigation();
  const action = useActionData<ActionResponse>();
  const rootData = useRouteLoaderData('root') as any;
  const locale = rootData?.locale || 'ar';
  const isEn = locale === 'en';
  
  const customer = action?.customer ?? loaderCustomer;
  const isLoading = navigation.state !== 'idle';
  const isCompany = customer.lastName === '(Company)';

  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const DeleteModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" dir={isEn ? 'ltr' : 'rtl'}>
      <div className="bg-white rounded-[24px] p-8 max-w-[480px] w-[90%] flex flex-col items-center text-center shadow-xl">
        <div className="w-[80px] h-[80px] bg-[#E64950] rounded-full flex items-center justify-center text-white text-[40px] font-bold mb-6">
          !
        </div>
        <h3 className="text-[20px] font-bold text-[#171717] mb-2" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
          {isEn ? 'Are you sure you want to permanently delete the account?' : 'هل انت متأكد من انك تريد حذف الحساب نهائياً؟'}
        </h3>
        <p className="text-[14px] text-[#7D7D7D] mb-8" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
          {isEn ? 'Warning! All your data will be deleted if the account is deleted' : 'انتبه! سيتم حذف جميع البيانات الخاصة بك في حال حذف الحساب'}
        </p>
        <div className="flex w-full gap-4">
          <Form method="PUT" className="w-1/2">
            <input type="hidden" name="intent" value="deleteAccount" />
            <button type="submit" disabled={isLoading} className="w-full bg-[#E64950] text-white rounded-[12px] h-[48px] text-[16px] font-bold hover:bg-[#c0392b] transition-colors disabled:opacity-70" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
              {isLoading ? (isEn ? 'Deleting...' : 'جاري الحذف...') : (isEn ? 'Yes, delete' : 'نعم, حذف')}
            </button>
          </Form>
          <button 
            type="button" 
            onClick={() => setShowDeleteModal(false)}
            className="w-1/2 bg-[#255441] text-white rounded-[12px] h-[48px] text-[16px] font-bold hover:bg-[#1a3a2d] transition-colors" 
            style={{ fontFamily: "'GE Dinar One', sans-serif" }}
          >
            {isEn ? 'No, go back' : 'لا, الرجوع'}
          </button>
        </div>
      </div>
    </div>
  );

  // If action returns a successful update, we could auto-close the form, but let's just let them stay or close manually.
  
  if (!isEditing) {
    return (
      <>
      <div className="flex flex-col items-center w-full" dir={isEn ? 'ltr' : 'rtl'}>
        <div className="bg-white border border-[#9FB7AE] rounded-[12px] p-8 flex flex-col gap-6 w-full max-w-[955px] box-border">
          
          {/* Header */}
          <div className="flex justify-between items-center w-full">
            <h3 className="text-[18px] font-bold text-[#171717] m-0 leading-none" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
              {isEn ? 'Personal Information' : 'المعلومات الشخصية'}
            </h3>
            <button 
              onClick={() => setIsEditing(true)}
              className="text-[14px] font-medium text-[#255441] underline m-0 leading-none" 
              style={{ fontFamily: "'GE Dinar One', sans-serif" }}
            >
              {isEn ? 'Edit' : 'تعديل'}
            </button>
          </div>

          {/* Grid */}
          <div className="flex flex-col gap-6 w-full">
            {/* Row 1 */}
            <div className="flex flex-col md:flex-row gap-6 w-full">
              <div className="flex flex-col gap-2 flex-1">
                <span className="text-[14px] font-medium text-[#171717] leading-none" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                  {isEn ? 'Full Name' : 'الإسم الكامل'}
                </span>
                <div className="bg-[#FEF8EB] border border-[#BBCFCD] rounded-[12px] h-[48px] px-4 flex items-center">
                  <span className="text-[14px] font-medium text-[#9FB7AE]" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                    {customer.firstName} {customer.lastName !== '(Company)' ? customer.lastName : ''}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <span className="text-[14px] font-medium text-[#171717] leading-none" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                  {isEn ? 'Mobile Number' : 'رقم الجوال'}
                </span>
                <div className="bg-[#FEF8EB] border border-[#BBCFCD] rounded-[12px] h-[48px] px-4 flex items-center" dir="ltr">
                  <span className="text-[14px] font-medium text-[#9FB7AE] w-full text-start md:text-end" style={{ fontFamily: "'GE Dinar One', sans-serif", textAlign: isEn ? 'left' : 'right' }}>
                    {customer.phone || '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Row 2 */}
            <div className="flex flex-col md:flex-row gap-6 w-full">
              <div className="flex flex-col gap-2 flex-1">
                <span className="text-[14px] font-medium text-[#171717] leading-none" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                  {isEn ? 'Email' : 'البريد الإلكتروني'}
                </span>
                <div className="bg-[#FEF8EB] border border-[#BBCFCD] rounded-[12px] h-[48px] px-4 flex items-center">
                  <span className="text-[14px] font-medium text-[#9FB7AE]" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                    {customer.email}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <span className="text-[14px] font-medium text-[#171717] leading-none" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                  {isEn ? 'Date of Birth' : 'تاريخ الميلاد'}
                </span>
                <div className="bg-[#FEF8EB] border border-[#BBCFCD] rounded-[12px] h-[48px] px-4 flex items-center">
                  <span className="text-[14px] font-medium text-[#9FB7AE]" style={{ fontFamily: "'GE Dinar One', sans-serif", letterSpacing: '2px' }}>
                    {(customer as any).birthdate?.value ? (customer as any).birthdate.value.replace(/-/g, ' / ') : '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Row 3 */}
            <div className="flex flex-col gap-2 w-full">
              <span className="text-[14px] font-medium text-[#171717] leading-none" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                {isEn ? 'Preferred Language' : 'اللغة المفضلة'}
              </span>
              <div className="bg-[#FEF8EB] border border-[#BBCFCD] rounded-[12px] h-[48px] px-4 flex items-center w-full">
                <span className="text-[14px] font-medium text-[#9FB7AE]" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                  {isEn ? 'English' : 'العربية'}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-[#BBCFCD] w-full my-2"></div>

          {/* Delete Button */}
          <div className="flex justify-start items-center">
            <button onClick={() => setShowDeleteModal(true)} type="button" className="flex items-center justify-center gap-2 border border-[#E64950] rounded-[12px] h-[48px] px-6 text-[#E64950] hover:bg-red-50 transition-colors">
              <span className="text-[16px] font-bold leading-none" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                {isEn ? 'Delete Account Permanently' : 'حذف الحساب نهائياً'}
              </span>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                 <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
      {showDeleteModal && <DeleteModal />}
    </>
    );
  }

  return (
    <div className="flex flex-col items-center w-full" dir={isEn ? 'ltr' : 'rtl'}>
      <Form method="PUT" className="animate-fade-in w-full max-w-[955px] box-border" style={{ display: 'contents' }}>
        <div className="bg-white border border-[#9FB7AE] rounded-[12px] p-8 flex flex-col gap-6 w-full box-border">
          
          {/* Header */}
          <div className="flex justify-between items-center w-full">
            <h3 className="text-[18px] font-bold text-[#171717] m-0 leading-none" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
              {isEn ? 'Personal Information' : 'المعلومات الشخصية'}
            </h3>
            <button 
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-[14px] font-medium text-[#255441] underline m-0 leading-none" 
              style={{ fontFamily: "'GE Dinar One', sans-serif" }}
            >
              {isEn ? 'Cancel' : 'إلغاء'}
            </button>
          </div>

          {/* Grid */}
          <div className="flex flex-col gap-6 w-full">
            {/* Row 1 */}
            <div className="flex flex-col md:flex-row gap-6 w-full">
              <div className="flex flex-col gap-2 flex-1">
                <label className="text-[14px] font-medium text-[#171717] leading-none" style={{ fontFamily: "'GE Dinar One', sans-serif" }} htmlFor="firstName">
                  {isEn ? (isCompany ? 'Company Name' : 'Full Name') : (isCompany ? 'اسم الشركة' : 'الإسم الكامل')}
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  placeholder={isEn ? 'Full Name' : 'الإسم الكامل'}
                  className="bg-white border border-[#BBCFCD] rounded-[12px] h-[48px] px-4 w-full text-[14px] font-medium text-[#171717] focus:outline-none focus:border-[#9FB7AE]"
                  style={{ fontFamily: "'GE Dinar One', sans-serif" }}
                  defaultValue={customer.firstName ?? ''}
                  required
                />
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <label className="text-[14px] font-medium text-[#171717] leading-none" style={{ fontFamily: "'GE Dinar One', sans-serif" }} htmlFor="phone">
                  {isEn ? 'Mobile Number' : 'رقم الجوال'}
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder={isEn ? 'Mobile Number' : 'رقم الجوال'}
                  className="bg-white border border-[#BBCFCD] rounded-[12px] h-[48px] px-4 w-full text-[14px] font-medium text-[#171717] focus:outline-none focus:border-[#9FB7AE]"
                  style={{ fontFamily: "'GE Dinar One', sans-serif", direction: 'ltr', textAlign: isEn ? 'left' : 'right' }}
                  defaultValue={customer.phone ?? ''}
                />
              </div>
            </div>

            {/* Row 2 */}
            <div className="flex flex-col md:flex-row gap-6 w-full">
              <div className="flex flex-col gap-2 flex-1">
                <label className="text-[14px] font-medium text-[#171717] leading-none" style={{ fontFamily: "'GE Dinar One', sans-serif" }} htmlFor="email">
                  {isEn ? 'Email' : 'البريد الإلكتروني'}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder={isEn ? 'Email' : 'البريد الإلكتروني'}
                  className="bg-white border border-[#BBCFCD] rounded-[12px] h-[48px] px-4 w-full text-[14px] font-medium text-[#171717] focus:outline-none focus:border-[#9FB7AE]"
                  style={{ fontFamily: "'GE Dinar One', sans-serif" }}
                  defaultValue={customer.email ?? ''}
                  required
                />
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <label className="text-[14px] font-medium text-[#171717] leading-none" style={{ fontFamily: "'GE Dinar One', sans-serif" }} htmlFor="birthdate">
                  {isEn ? 'Date of Birth' : 'تاريخ الميلاد'}
                </label>
                <input
                  id="birthdate"
                  name="birthdate"
                  type="date"
                  className="bg-white border border-[#BBCFCD] rounded-[12px] h-[48px] px-4 w-full text-[14px] font-medium text-[#171717] focus:outline-none focus:border-[#9FB7AE]"
                  style={{ fontFamily: "'GE Dinar One', sans-serif" }}
                  defaultValue={(customer as any).birthdate?.value ?? ''}
                />
              </div>
            </div>

            {/* Row 3 */}
            <div className="flex flex-col gap-2 w-full">
              <label className="text-[14px] font-medium text-[#171717] leading-none" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                {isEn ? 'Preferred Language' : 'اللغة المفضلة'}
              </label>
              <div className="relative">
                <select 
                  className="appearance-none bg-white border border-[#BBCFCD] rounded-[12px] h-[48px] px-4 w-full text-[14px] font-medium text-[#171717] focus:outline-none focus:border-[#9FB7AE]"
                  style={{ fontFamily: "'GE Dinar One', sans-serif" }}
                  defaultValue={isEn ? 'en' : 'ar'}
                  disabled
                >
                  <option value="en">English</option>
                  <option value="ar">العربية</option>
                </select>
                <div className={`absolute top-0 bottom-0 flex items-center pointer-events-none ${isEn ? 'right-4' : 'left-4'}`}>
                  <svg width="12" height="8" viewBox="0 0 12 8" fill="none" stroke="#234745" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 1.5L6 6.5L11 1.5" />
                  </svg>
                </div>
              </div>
            </div>
            
            {/* Save Button */}
            <div className="flex justify-end w-full mt-2">
              <button 
                type="submit" 
                disabled={isLoading}
                className="bg-[#234745] text-white rounded-[12px] h-[48px] px-8 text-[16px] font-bold hover:bg-[#1a3533] transition-colors disabled:opacity-70"
                style={{ fontFamily: "'GE Dinar One', sans-serif", minWidth: '180px' }}
              >
                {isLoading ? (isEn ? 'Saving...' : 'جاري حفظ التغييرات...') : (isEn ? 'Save Changes' : 'حفظ التغييرات')}
              </button>
            </div>
          </div>

          <div className="border-t border-[#BBCFCD] w-full my-2"></div>

          {/* Delete Button */}
          <div className="flex justify-start items-center">
            <button onClick={() => setShowDeleteModal(true)} type="button" className="flex items-center justify-center gap-2 border border-[#E64950] rounded-[12px] h-[48px] px-6 text-[#E64950] hover:bg-red-50 transition-colors">
              <span className="text-[16px] font-bold leading-none" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                {isEn ? 'Delete Account Permanently' : 'حذف الحساب نهائياً'}
              </span>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                 <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/>
              </svg>
            </button>
          </div>
          
          {action?.error && (
            <div className="mt-4 p-4 rounded-[12px] bg-[#ffebeb] border border-[#ffcfcf] text-[#e74c3c]">
              <p className="m-0 text-[14px] font-semibold">
                ⚠️ {action.error}
              </p>
            </div>
          )}
        </div>
      </Form>
      {showDeleteModal && <DeleteModal />}
    </div>
  );
}

function getPassword(form: FormData): string | undefined {
  const currentPassword = form.get('currentPassword');
  const newPassword = form.get('newPassword');

  if (newPassword && !currentPassword) {
    throw new Error('كلمة المرور الحالية مطلوبة لتغيير كلمة المرور.');
  }

  if (currentPassword && newPassword) {
    return String(newPassword);
  }

  return undefined;
}

const CUSTOMER_UPDATE_MUTATION = `#graphql
  mutation customerUpdate(
    $customerAccessToken: String!,
    $customer: CustomerUpdateInput!
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(language: $language, country: $country) {
    customerUpdate(customerAccessToken: $customerAccessToken, customer: $customer) {
      customer {
        acceptsMarketing
        email
        firstName
        id
        lastName
        phone
      }
      customerAccessToken {
        accessToken
        expiresAt
      }
      customerUserErrors {
        code
        field
        message
      }
    }
  }
` as const;





