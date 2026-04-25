import type { CustomerFragment } from 'storefrontapi.generated';
import type { CustomerUpdateInput } from '@shopify/hydrogen/storefront-api-types';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { data, redirect, type MetaFunction } from 'react-router';
import {
  Form,
  useActionData,
  useNavigation,
  useOutletContext,
} from 'react-router';
import { Button } from '~/components/layout/Button';

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
    const password = getPassword(form);
    const customer: CustomerUpdateInput = {};
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
      query getCustomerId($customerAccessToken: String!) {
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
  const customer = action?.customer ?? loaderCustomer;
  const isLoading = navigation.state !== 'idle';
  const isCompany = customer.lastName === '(Company)';

  return (
    <div className="profile-section-container">
      {/* Premium Profile Header */}
      <div className="profile-header-meta">
        <div className="profile-avatar-large">
          {(customer.firstName?.[0] || customer.email?.[0] || 'U').toUpperCase()}
        </div>
        <div className="profile-meta-text">
          <h2>{customer.firstName ? `${customer.firstName} ${isCompany ? '' : customer.lastName || ''}` : 'أهلاً بك!'}</h2>
          <p>{isCompany ? 'حساب تجاري' : 'حساب فردي'} • {customer.email}</p>
        </div>
      </div>

      <Form method="PUT" className="animate-fade-in" style={{ display: 'contents' }}>
        {/* PERSONAL INFORMATION CARD */}
        <div className="profile-card">
          <div className="profile-card-header">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <h3>المعلومات الشخصية</h3>
          </div>

          <div className="profile-info-grid">
            {isCompany ? (
              <div className="col-span-full">
                <label className="account-field-label" htmlFor="firstName">اسم الشركة</label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  placeholder="اسم الشركة"
                  className="account-input"
                  defaultValue={customer.firstName ?? ''}
                  required
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="account-field-label" htmlFor="firstName">الاسم الأول</label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    placeholder="الاسم الأول"
                    className="account-input"
                    defaultValue={customer.firstName ?? ''}
                    minLength={2}
                  />
                </div>
                <div>
                  <label className="account-field-label" htmlFor="lastName">الاسم الأخير</label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    placeholder="الاسم الأخير"
                    className="account-input"
                    defaultValue={customer.lastName ?? ''}
                    minLength={2}
                  />
                </div>
              </>
            )}

            <div>
              <label className="account-field-label" htmlFor="email">البريد الإلكتروني</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="البريد الإلكتروني"
                className="account-input"
                defaultValue={customer.email ?? ''}
                required
              />
            </div>

            <div>
              <label className="account-field-label" htmlFor="phone">رقم الجوال</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="رقم الجوال"
                className="account-input"
                defaultValue={customer.phone ?? ''}
                style={{ direction: 'ltr', textAlign: 'right' }}
              />
            </div>

            <div>
              <label className="account-field-label" htmlFor="birthdate">تاريخ الميلاد (اختياري)</label>
              <input
                id="birthdate"
                name="birthdate"
                type="date"
                className="account-input"
                defaultValue={(customer as any).birthdate?.value ?? ''}
              />
              <p style={{ fontSize: '11px', color: '#888', marginTop: '6px' }}>
                تاريخ ميلادك يساعدنا في تقديم مكافآت ونقاط إضافية لك!
              </p>
            </div>
          </div>
        </div>

        {/* SECURITY SETTINGS CARD */}
        <div className="profile-card">
          <div className="profile-card-header">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <circle cx="12" cy="11" r="3" />
            </svg>
            <h3>إعدادات الأمان</h3>
          </div>

          <p className="description" style={{ fontSize: '14px', color: '#888', marginBottom: '24px' }}>
            يمكنك ترك الخانات فارغة إذا كنت لا ترغب في تغيير كلمة المرور الحالية.
          </p>

          <div className="profile-info-grid">
            <div>
              <label className="account-field-label" htmlFor="currentPassword">كلمة المرور الحالية</label>
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                placeholder="كلمة المرور الحالية"
                className="account-input"
                minLength={8}
              />
            </div>
            <div>
              <label className="account-field-label" htmlFor="newPassword">كلمة المرور الجديدة</label>
              <input
                id="newPassword"
                name="newPassword"
                type="password"
                placeholder="كلمة المرور الجديدة"
                className="account-input"
                minLength={8}
              />
            </div>
          </div>
        </div>

        {action?.error && (
          <div className="error-card" style={{ padding: '16px', borderRadius: '12px', background: '#ffebeb', border: '1px solid #ffcfcf', color: '#e74c3c' }}>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>
              ⚠️ {action.error}
            </p>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '16px' }}>
          <Button type="submit" variant="primary" size="lg" disabled={isLoading} style={{ minWidth: '220px' }}>
            {isLoading ? 'جاري حفظ التغييرات...' : 'حفظ الملف الشخصي'}
          </Button>
        </div>
      </Form>
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





