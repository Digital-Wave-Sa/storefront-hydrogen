import {useState, useEffect, useRef} from 'react';
import type {MailingAddressInput} from '@shopify/hydrogen/storefront-api-types';
import type {AddressFragment, CustomerFragment} from 'storefrontapi.generated';
import {
  data,
  redirect,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
} from 'react-router';
import {
  Form,
  useActionData,
  useFetcher,
  useNavigation,
  useOutletContext,
} from 'react-router';
import {Button} from '~/components/layout/Button';

export type ActionResponse = {
  addressId?: string | null;
  createdAddress?: AddressFragment;
  defaultAddress?: string | null;
  deletedAddress?: string | null;
  error: Record<AddressFragment['id'], string> | null;
  updatedAddress?: AddressFragment;
};

export const meta: MetaFunction = () => {
  return [{title: 'Addresses | Saadeddin'}];
};

const formatAddressGid = (rawId: string) => {
  if (!rawId) return '';
  let str = String(rawId);
  try {
    str = decodeURIComponent(str);
  } catch {}
  if (str.startsWith('Z2lkOi')) {
    try {
      str = typeof atob === 'function' ? atob(str) : Buffer.from(str, 'base64').toString('utf8');
    } catch {}
  }
  if (str.startsWith('gid://shopify/MailingAddress/')) {
    return str;
  }
  const match = str.match(/(\d+)/);
  const num = match ? match[1] : str.replace(/\D/g, '');
  return num ? `gid://shopify/MailingAddress/${num}?model_name=CustomerAddress` : str;
};

const getNumericId = (rawId?: string | null): string => {
  if (!rawId) return '';
  let str = String(rawId);
  try {
    str = decodeURIComponent(str);
  } catch {}
  if (str.startsWith('Z2lkOi')) {
    try {
      str = typeof atob === 'function' ? atob(str) : Buffer.from(str, 'base64').toString('utf8');
    } catch {}
  }
  const match = str.match(/(\d+)/);
  return match ? match[1] : str.replace(/\D/g, '');
};

const formatAddressPhone = (rawPhone?: string | null): string | undefined => {
  if (!rawPhone) return undefined;
  const str = String(rawPhone).trim();
  const digits = str.replace(/\D/g, '');
  if (!digits) return undefined;

  if (digits.startsWith('00')) {
    return `+${digits.replace(/^00/, '')}`;
  }
  const countryPrefixes = ['966', '962', '971', '965', '973', '968', '974', '20', '961', '963', '964'];
  for (const prefix of countryPrefixes) {
    if (digits.startsWith(prefix)) {
      return `+${digits}`;
    }
  }
  if (str.includes('+')) {
    return `+${digits}`;
  }
  if (digits.startsWith('05') && digits.length === 10) {
    return `+966${digits.substring(1)}`;
  }
  if (digits.startsWith('5') && digits.length === 9) {
    return `+966${digits}`;
  }
  if (digits.startsWith('07') && digits.length === 10) {
    return `+962${digits.substring(1)}`;
  }
  if (digits.startsWith('7') && digits.length === 9) {
    return `+962${digits}`;
  }
  return `+${digits}`;
};

function formatAdminAddressToFragment(adminAddr: any): AddressFragment {
  return {
    id: `gid://shopify/MailingAddress/${adminAddr.id}`,
    firstName: adminAddr.first_name || '',
    lastName: adminAddr.last_name || '',
    address1: adminAddr.address1 || '',
    address2: adminAddr.address2 || '',
    city: adminAddr.city || '',
    country: adminAddr.country || adminAddr.country_name || 'Saudi Arabia',
    phone: adminAddr.phone || '',
    company: adminAddr.company || null,
    province: adminAddr.province || null,
    zip: adminAddr.zip || null,
  };
}

async function resolveCustomerNumericId(session: any, env: any, tokenStr?: string): Promise<string | null> {
  let customerId = await session.get('loginCustomerId');
  if (!customerId && tokenStr && tokenStr.startsWith('session-')) {
    customerId = tokenStr.replace('session-', '');
  }
  if (customerId && /^\d+$/.test(String(customerId))) {
    return String(customerId);
  }

  const savedPhone = await session.get('loginOtpPhone');
  if (savedPhone) {
    try {
      const {getAdminToken, getAdminDomain} = await import('~/lib/shopify-admin.server');
      const adminToken = await getAdminToken(env);
      const adminDomain = getAdminDomain(env);
      const rawDigits = savedPhone.replace(/\D/g, '');
      const last9 = rawDigits.slice(-9);

      const res = await fetch(
        `https://${adminDomain}/admin/api/2024-01/customers/search.json?query=${encodeURIComponent(last9)}&fields=id,phone`,
        {headers: {'X-Shopify-Access-Token': adminToken}},
      );
      if (res.ok) {
        const data = (await res.json()) as any;
        const matched = (data.customers || []).find((c: any) => {
          const cp = (c.phone || '').replace(/\D/g, '');
          return cp === rawDigits || cp.endsWith(last9);
        });
        if (matched?.id) {
          return String(matched.id);
        }
      }
    } catch (_) {}
  }
  return null;
}

async function adminCreateAddress({
  customerId,
  address,
  env,
}: {
  customerId: string;
  address: any;
  env: any;
}) {
  const {getAdminToken, getAdminDomain} = await import('~/lib/shopify-admin.server');
  const adminToken = await getAdminToken(env);
  const adminDomain = getAdminDomain(env);

  const payload: any = {
    address1: address.address1 || '',
    address2: address.address2 || '',
    city: address.city || '',
    first_name: address.firstName || '',
    last_name: address.lastName || '',
    country: address.country || 'Saudi Arabia',
  };
  if (address.phone) payload.phone = address.phone;

  const res = await fetch(
    `https://${adminDomain}/admin/api/2024-01/customers/${customerId}/addresses.json`,
    {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': adminToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({address: payload}),
    },
  );
  const json = (await res.json()) as any;
  if (!res.ok) {
    if (payload.phone) {
      delete payload.phone;
      const retryRes = await fetch(
        `https://${adminDomain}/admin/api/2024-01/customers/${customerId}/addresses.json`,
        {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': adminToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({address: payload}),
        },
      );
      const retryJson = (await retryRes.json()) as any;
      if (retryRes.ok && retryJson.customer_address) {
        return retryJson.customer_address;
      }
    }
    throw new Error(json?.errors ? JSON.stringify(json.errors) : 'Failed to create address');
  }
  return json.customer_address;
}

async function adminUpdateAddress({
  customerId,
  addressId,
  address,
  env,
}: {
  customerId: string;
  addressId: string;
  address: any;
  env: any;
}) {
  const {getAdminToken, getAdminDomain} = await import('~/lib/shopify-admin.server');
  const adminToken = await getAdminToken(env);
  const adminDomain = getAdminDomain(env);
  const numAddrId = getNumericId(addressId);

  const payload: any = {
    id: numAddrId,
    address1: address.address1 || '',
    address2: address.address2 || '',
    city: address.city || '',
    first_name: address.firstName || '',
    last_name: address.lastName || '',
    country: address.country || 'Saudi Arabia',
  };
  if (address.phone) payload.phone = address.phone;

  const res = await fetch(
    `https://${adminDomain}/admin/api/2024-01/customers/${customerId}/addresses/${numAddrId}.json`,
    {
      method: 'PUT',
      headers: {
        'X-Shopify-Access-Token': adminToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({address: payload}),
    },
  );
  const json = (await res.json()) as any;
  if (!res.ok) {
    if (payload.phone) {
      delete payload.phone;
      const retryRes = await fetch(
        `https://${adminDomain}/admin/api/2024-01/customers/${customerId}/addresses/${numAddrId}.json`,
        {
          method: 'PUT',
          headers: {
            'X-Shopify-Access-Token': adminToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({address: payload}),
        },
      );
      const retryJson = (await retryRes.json()) as any;
      if (retryRes.ok && retryJson.customer_address) {
        return retryJson.customer_address;
      }
    }
    throw new Error(json?.errors ? JSON.stringify(json.errors) : 'Failed to update address');
  }
  return json.customer_address;
}

async function adminDeleteAddress({
  customerId,
  addressId,
  env,
}: {
  customerId: string;
  addressId: string;
  env: any;
}) {
  const {getAdminToken, getAdminDomain} = await import('~/lib/shopify-admin.server');
  const adminToken = await getAdminToken(env);
  const adminDomain = getAdminDomain(env);
  const numAddrId = getNumericId(addressId);

  const res = await fetch(
    `https://${adminDomain}/admin/api/2024-01/customers/${customerId}/addresses/${numAddrId}.json`,
    {
      method: 'DELETE',
      headers: {
        'X-Shopify-Access-Token': adminToken,
      },
    },
  );
  if (!res.ok && res.status !== 404) {
    const json = (await res.json()) as any;
    throw new Error(json?.errors ? JSON.stringify(json.errors) : 'Failed to delete address');
  }
  return true;
}

async function adminSetDefaultAddress({
  customerId,
  addressId,
  env,
}: {
  customerId: string;
  addressId: string;
  env: any;
}) {
  const {getAdminToken, getAdminDomain} = await import('~/lib/shopify-admin.server');
  const adminToken = await getAdminToken(env);
  const adminDomain = getAdminDomain(env);
  const numAddrId = getNumericId(addressId);

  const res = await fetch(
    `https://${adminDomain}/admin/api/2024-01/customers/${customerId}/addresses/${numAddrId}/default.json`,
    {
      method: 'PUT',
      headers: {
        'X-Shopify-Access-Token': adminToken,
      },
    },
  );
  if (!res.ok) {
    const json = (await res.json()) as any;
    throw new Error(json?.errors ? JSON.stringify(json.errors) : 'Failed to set default address');
  }
  return true;
}

export async function action({request, context}: ActionFunctionArgs) {
  const {storefront, session} = context;
  const env = context.env;

  try {
    const form = await request.formData();
    const addressId = form.has('addressId')
      ? String(form.get('addressId'))
      : 'new';
    const customerAccessToken = await session.get('customerAccessToken');

    if (!customerAccessToken) {
      return data({error: {[addressId]: 'Unauthorized'}}, {status: 401});
    }
    const tokenStr = typeof customerAccessToken === 'string'
      ? customerAccessToken
      : customerAccessToken?.accessToken || '';

    const isSessionToken = !tokenStr || tokenStr.startsWith('session-') || tokenStr.startsWith('dev-');

    const defaultAddress = String(form.get('defaultAddress')) === 'on';
    const address: MailingAddressInput = {};
    const keys: (keyof MailingAddressInput | 'lat' | 'lng')[] = [
      'address1',
      'address2',
      'city',
      'firstName',
      'lastName',
      'phone',
      'lat',
      'lng',
    ];

    const latlng = {lat: '', lng: ''};

    for (const key of keys) {
      const value = form.get(key);
      if (typeof value === 'string') {
        if (key === 'phone') {
          address.phone = formatAddressPhone(value);
        } else if (key === 'lat') {
          latlng.lat = value;
        } else if (key === 'lng') {
          latlng.lng = value;
        } else {
          (address as any)[key] = value;
        }
      }
    }

    if (latlng.lat && latlng.lng) {
      address.address2 = `COORDS:${latlng.lat},${latlng.lng}`;
    }

    if (!address.country) {
      address.country = 'Saudi Arabia';
    }

    const customerNumericId = await resolveCustomerNumericId(session, env, tokenStr);

    switch (request.method) {
      case 'POST': {
        if (!isSessionToken) {
          try {
            const res = await storefront.mutate(CREATE_ADDRESS_MUTATION, {
              variables: {customerAccessToken: tokenStr, address},
            });
            if (!res?.customerAddressCreate?.customerUserErrors?.length && res?.customerAddressCreate?.customerAddress) {
              const createdAddress = res.customerAddressCreate.customerAddress;
              if (defaultAddress && createdAddress?.id) {
                await storefront.mutate(UPDATE_DEFAULT_ADDRESS_MUTATION, {
                  variables: {
                    customerAccessToken: tokenStr,
                    addressId: decodeURIComponent(createdAddress.id) as any,
                  },
                });
              }
              return data({error: null, createdAddress, defaultAddress});
            }
          } catch (_) {}
        }

        if (customerNumericId) {
          const adminAddr = await adminCreateAddress({
            customerId: customerNumericId,
            address,
            env,
          });
          const createdAddress = formatAdminAddressToFragment(adminAddr);
          if (defaultAddress && adminAddr.id) {
            await adminSetDefaultAddress({
              customerId: customerNumericId,
              addressId: String(adminAddr.id),
              env,
            });
          }
          return data({error: null, createdAddress, defaultAddress});
        }

        throw new Error('Customer profile could not be identified');
      }

      case 'PUT': {
        const intent = String(form.get('intent') || '');
        const targetGid = formatAddressGid(addressId);
        const numericAddrId = getNumericId(addressId);

        if (intent === 'setDefault') {
          if (!isSessionToken) {
            try {
              const res = await storefront.mutate(UPDATE_DEFAULT_ADDRESS_MUTATION, {
                variables: {
                  customerAccessToken: tokenStr,
                  addressId: targetGid as any,
                },
              });
              if (!res?.customerDefaultAddressUpdate?.customerUserErrors?.length) {
                return data({error: null, defaultAddress: addressId});
              }
            } catch (_) {}
          }

          if (customerNumericId && numericAddrId) {
            await adminSetDefaultAddress({
              customerId: customerNumericId,
              addressId: numericAddrId,
              env,
            });
            return data({error: null, defaultAddress: addressId});
          }

          return data({error: null, defaultAddress: addressId});
        }

        if (!isSessionToken) {
          try {
            const res = await storefront.mutate(UPDATE_ADDRESS_MUTATION, {
              variables: {
                address,
                customerAccessToken: tokenStr,
                id: targetGid as any,
              },
            });
            if (!res?.customerAddressUpdate?.customerUserErrors?.length && res?.customerAddressUpdate?.customerAddress) {
              if (defaultAddress) {
                await storefront.mutate(UPDATE_DEFAULT_ADDRESS_MUTATION, {
                  variables: {
                    customerAccessToken: tokenStr,
                    addressId: targetGid as any,
                  },
                });
              }
              return data({
                error: null,
                updatedAddress: res.customerAddressUpdate.customerAddress,
                defaultAddress,
              });
            }
          } catch (_) {}
        }

        if (customerNumericId && numericAddrId) {
          const adminAddr = await adminUpdateAddress({
            customerId: customerNumericId,
            addressId: numericAddrId,
            address,
            env,
          });
          const updatedAddress = formatAdminAddressToFragment(adminAddr);
          if (defaultAddress) {
            await adminSetDefaultAddress({
              customerId: customerNumericId,
              addressId: numericAddrId,
              env,
            });
          }
          return data({
            error: null,
            updatedAddress,
            defaultAddress,
          });
        }

        throw new Error('Customer profile could not be identified');
      }

      case 'DELETE': {
        const targetGid = formatAddressGid(addressId);
        const numericAddrId = getNumericId(addressId);

        if (!isSessionToken) {
          try {
            const res = await storefront.mutate(DELETE_ADDRESS_MUTATION, {
              variables: {
                customerAccessToken: tokenStr,
                id: targetGid as any,
              },
            });
            if (!res?.customerAddressDelete?.customerUserErrors?.length) {
              return data({error: null, deletedAddress: addressId});
            }
          } catch (_) {}
        }

        if (customerNumericId && numericAddrId) {
          await adminDeleteAddress({
            customerId: customerNumericId,
            addressId: numericAddrId,
            env,
          });
          return data({error: null, deletedAddress: addressId});
        }

        return data({error: null, deletedAddress: addressId});
      }

      default:
        return data(
          {error: {[addressId]: 'Method not allowed'}},
          {status: 405},
        );
    }
  } catch (error: any) {
    return data({error: {form: error.message}}, {status: 400});
  }
}

const cleanAddressId = (rawId?: string | null): string => {
  if (!rawId) return '';
  let str = String(rawId);
  try {
    str = decodeURIComponent(str);
  } catch {}
  if (str.startsWith('Z2lkOi')) {
    try {
      str = typeof window !== 'undefined' ? atob(str) : Buffer.from(str, 'base64').toString('utf8');
    } catch {}
  }
  const match = str.match(/(\d+)/);
  return match ? match[1] : str.replace(/\D/g, '');
};

const isSameAddressId = (id1?: string | null, id2?: string | null) => {
  const c1 = cleanAddressId(id1);
  const c2 = cleanAddressId(id2);
  return Boolean(c1 && c2 && c1 === c2);
};

export default function Addresses() {
  const {customer} = useOutletContext<{customer: CustomerFragment}>();
  const {defaultAddress, addresses} = customer;
  const actionData = useActionData<ActionResponse>();
  const fetcher = useFetcher();

  const [localDefaultId, setLocalDefaultId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('saadeddin_default_address_id');
    }
    return null;
  });

  const handleSetDefault = (id: string) => {
    setLocalDefaultId(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('saadeddin_default_address_id', id);
    }
  };

  useEffect(() => {
    if (actionData?.defaultAddress) {
      setLocalDefaultId(actionData.defaultAddress);
      if (typeof window !== 'undefined') {
        localStorage.setItem('saadeddin_default_address_id', actionData.defaultAddress);
      }
    }
  }, [actionData]);

  useEffect(() => {
    if ((fetcher.data as any)?.defaultAddress) {
      const defId = (fetcher.data as any).defaultAddress;
      setLocalDefaultId(defId);
      if (typeof window !== 'undefined') {
        localStorage.setItem('saadeddin_default_address_id', defId);
      }
    }
  }, [fetcher.data]);

  const pendingDefaultId = fetcher.formData?.get('addressId')
    ? String(fetcher.formData.get('addressId'))
    : null;
  const activeDefaultId = pendingDefaultId || localDefaultId || defaultAddress?.id;

  const [activeModal, setActiveModal] = useState<{
    type: 'create' | 'edit';
    address?: AddressFragment;
  } | null>(null);
  const locale = useOutletContext<{locale: string}>().locale;
  const isEn = locale === 'en';
  const [addressToDelete, setAddressToDelete] = useState<string | null>(null);

  const [localAddresses, setLocalAddresses] = useState<AddressFragment[]>(
    addresses?.nodes || [],
  );

  useEffect(() => {
    if (addresses?.nodes) {
      setLocalAddresses(addresses.nodes);
    }
  }, [addresses?.nodes]);

  const handleAddressSuccess = (
    addr: AddressFragment,
    isDef?: boolean,
  ) => {
    setLocalAddresses((prev) => {
      const idx = prev.findIndex((a) => isSameAddressId(a.id, addr.id));
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {...next[idx], ...addr};
        return next;
      }
      return [addr, ...prev];
    });
    if (isDef && addr.id) {
      handleSetDefault(addr.id);
    }
  };

  const handleAddressDelete = (id: string) => {
    setLocalAddresses((prev) => prev.filter((a) => !isSameAddressId(a.id, id)));
  };

  return (
    <div className="account-addresses-section" dir={isEn ? 'ltr' : 'rtl'}>
      {/* Outer bordered container */}
      <div className="bg-white border border-[#9FB7AE] rounded-2xl p-4 md:p-6 flex flex-col gap-2">
        {/* Title */}
        <h2
          className="font-bold text-[18px] md:text-2xl text-[#171717] !m-0"
          style={{
            fontFamily: isEn
              ? "'Inter', sans-serif"
              : "'GE Dinar One', sans-serif",
          }}
        >
          {isEn ? 'Delivery Addresses' : 'عناوين التوصيل'}
        </h2>

        {/* Cards container */}
        <div className="flex flex-col gap-3 mt-2">
          {localAddresses.map((address) => {
            const isDefault = isSameAddressId(activeDefaultId, address.id);
            const label = address.firstName || (isEn ? 'Address' : 'عنوان');
            const addressText = [address.address1, address.city]
              .filter(Boolean)
              .join('، ');

            return (
              <div
                key={address.id}
                className={`flex flex-col p-4 gap-3.5 rounded-[12px] border-1 transition-all ${
                  isDefault
                    ? 'bg-[#FEF8EB] border-[#234745]'
                    : 'bg-transparent border-[#BBCFCD]'
                }`}
              >
                {/* Top row: Radio + Label + Badge | Actions */}
                <div className="flex flex-row flex-wrap items-center justify-between gap-2.5 w-full">
                  {/* Radio + Label + Badge */}
                  <div className="flex items-center gap-2.5">
                    {/* Radio dot */}
                    <div
                      className={`w-5.5 h-5.5 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                        isDefault
                          ? 'bg-[#234745] border-transparent'
                          : 'bg-transparent border-[#BBCFCD]'
                      }`}
                    >
                      {isDefault && (
                        <div className="w-2.5 h-2.5 rounded-full bg-white" />
                      )}
                    </div>
                    <span className="font-bold text-base md:text-lg text-[#234745]">
                      {label}
                    </span>
                    {isDefault && (
                      <div className="border border-[#906B51] rounded-full px-3 py-0.5 inline-flex items-center">
                        <span className="text-[10px] md:text-xs font-semibold text-[#906B51] whitespace-nowrap">
                          {isEn ? 'Default' : 'افتراضي'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-row items-center gap-3.5 flex-wrap text-xs md:text-sm font-semibold">
                    <button
                      type="button"
                      onClick={() => setActiveModal({type: 'edit', address})}
                      className="text-[#906B51] hover:text-[#906B51]/80 underline transition-colors"
                    >
                      {isEn ? 'Edit' : 'تعديل'}
                    </button>
                    {!isDefault && (
                      <fetcher.Form method="PUT" style={{display: 'contents'}}>
                        <input
                          type="hidden"
                          name="intent"
                          value="setDefault"
                        />
                        <input
                          type="hidden"
                          name="addressId"
                          value={address.id}
                        />
                        <input type="hidden" name="defaultAddress" value="on" />
                        <button
                          type="submit"
                          onClick={() => handleSetDefault(address.id)}
                          className="text-[#234745] hover:text-[#234745]/80 underline transition-colors whitespace-nowrap"
                        >
                          {isEn ? 'Set as Default' : 'تعيين كافتراضي'}
                        </button>
                      </fetcher.Form>
                    )}
                    <button
                      type="button"
                      onClick={() => setAddressToDelete(address.id)}
                      className="text-[#E64950] hover:text-[#E64950]/80 transition-colors"
                    >
                      {isEn ? 'Delete' : 'حذف'}
                    </button>
                  </div>
                </div>

                {/* Address text — second line */}
                <p className="margin-0 !text-[14px] font-medium text-xs md:text-sm text-[#8fa49c] text-start w-full mt-1">
                  {addressText}
                </p>
              </div>
            );
          })}

          {/* Add New Address Button */}
          <button
            type="button"
            onClick={() => setActiveModal({type: 'create'})}
            className="w-full flex items-center justify-center gap-2 p-3.5 bg-transparent border-2 border-[#BBCFCD] hover:border-[#234745] rounded-2xl transition-all mt-1"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <line
                x1="12"
                y1="6"
                x2="12"
                y2="18"
                stroke="#234745"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <line
                x1="6"
                y1="12"
                x2="18"
                y2="12"
                stroke="#234745"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
            <span className="font-bold text-sm md:text-base text-[#234745]">
              {isEn ? 'Add New Address' : 'إضافة عنوان جديد'}
            </span>
          </button>
        </div>
      </div>

      {activeModal && (
        <AddressModal
          type={activeModal.type}
          address={activeModal.address}
          isDefault={defaultAddress?.id === activeModal.address?.id}
          onSuccess={handleAddressSuccess}
          onClose={() => setActiveModal(null)}
        />
      )}

      {addressToDelete && (
        <DeleteConfirmationModal
          onClose={() => setAddressToDelete(null)}
          addressId={addressToDelete}
          locale={locale}
          onDeleted={handleAddressDelete}
        />
      )}
    </div>
  );
}

function DeleteConfirmationModal({
  onClose,
  addressId,
  locale,
  onDeleted,
}: {
  onClose: () => void;
  addressId: string;
  locale: string;
  onDeleted?: (id: string) => void;
}) {
  const fetcher = useFetcher<ActionResponse>();
  const isEn = locale === 'en';
  const isDeleting = fetcher.state !== 'idle';

  useEffect(() => {
    if (fetcher.data && !fetcher.data.error) {
      onDeleted?.(addressId);
      onClose();
    }
  }, [fetcher.data, addressId, onDeleted, onClose]);

  return (
    <div
      className="fixed inset-0 z-[1001] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-[420px] rounded-3xl p-6 sm:p-8 text-center shadow-2xl border border-gray-100 relative animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-5 border border-red-100">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </div>

        <h3 className="text-xl sm:text-2xl font-black text-gray-900 mb-2">
          {isEn ? 'Delete Address?' : 'حذف العنوان؟'}
        </h3>
        <p className="text-gray-500 text-[14px] font-medium mb-8 leading-relaxed">
          {isEn
            ? 'Are you sure you want to remove this address? This action cannot be undone.'
            : 'هل أنت متأكد من رغبتك في حذف هذا العنوان؟ لا يمكن التراجع عن هذا الإجراء.'}
        </p>

        <div className="flex gap-3">
          <fetcher.Form method="DELETE" className="flex-1">
            <input type="hidden" name="addressId" value={addressId} />
            <button
              type="submit"
              disabled={isDeleting}
              className="w-full h-12 rounded-2xl bg-red-500 hover:bg-red-600 active:scale-[0.98] text-white font-bold text-[15px] shadow-lg shadow-red-500/20 transition-all flex items-center justify-center disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isDeleting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isEn ? 'Deleting...' : 'جاري الحذف...'}
                </span>
              ) : isEn ? (
                'Delete'
              ) : (
                'حذف'
              )}
            </button>
          </fetcher.Form>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 h-12 rounded-2xl bg-gray-100 hover:bg-gray-200 active:scale-[0.98] text-gray-700 font-bold text-[15px] transition-all flex items-center justify-center"
          >
            {isEn ? 'Cancel' : 'إلغاء'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddressModal({
  type,
  address,
  isDefault,
  onSuccess,
  onClose,
}: {
  type: 'create' | 'edit';
  address?: AddressFragment;
  isDefault?: boolean;
  onSuccess?: (addr: AddressFragment, isDefault?: boolean) => void;
  onClose: () => void;
}) {
  const fetcher = useFetcher<ActionResponse>();
  const {googleMapsKey, locale} = useOutletContext<{
    googleMapsKey: string;
    locale: string;
  }>();
  const isEn = locale === 'en';
  const isLoading = fetcher.state !== 'idle';
  const errorMessage =
    fetcher.data?.error?.form ||
    (address?.id && fetcher.data?.error?.[address.id]) ||
    fetcher.data?.error?.new;

  useEffect(() => {
    if (fetcher.data && !fetcher.data.error) {
      if (fetcher.data.updatedAddress || fetcher.data.createdAddress) {
        const addr = (fetcher.data.updatedAddress || fetcher.data.createdAddress)!;
        onSuccess?.(addr, fetcher.data.defaultAddress);
        onClose();
      }
    }
  }, [fetcher.data, onClose, onSuccess]);

  const [city, setCity] = useState(address?.city ?? '');
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [isValidated, setIsValidated] = useState(type === 'edit');
  const [isValidating, setIsValidating] = useState(false);
  const [addressLine1, setAddressLine1] = useState(address?.address1 ?? '');

  // Initial preview URL if we have an address already
  useEffect(() => {
    if (address?.address1 && !mapUrl) {
      setMapUrl(
        `https://www.google.com/maps/embed/v1/place?key=${googleMapsKey}&q=${encodeURIComponent(address.address1 + ' ' + (address.city || ''))}&zoom=16`,
      );
    }
  }, [address, googleMapsKey, mapUrl]);

  // State to hold coordinates
  const [coords, setCoords] = useState<{lat: number; lng: number} | null>(
    () => {
      if (address?.address2?.includes('COORDS:')) {
        const match = address.address2.match(
          /COORDS:(-?\d+\.\d+),(-?\d+\.\d+)/,
        );
        if (match)
          return {lat: parseFloat(match[1]), lng: parseFloat(match[2])};
      }
      return null;
    },
  );

  const handleLocationConfirm = (result: any) => {
    setAddressLine1(result.address);
    setCity(result.city);
    setCoords({lat: result.lat, lng: result.lng});

    // Update preview map
    const {lat, lng} = result;
    setMapUrl(
      `https://www.google.com/maps/embed/v1/view?key=${googleMapsKey}&center=${lat},${lng}&zoom=17`,
    );

    setIsValidated(true);
    setIsMapPickerOpen(false);
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setIsValidating(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const {latitude, longitude} = pos.coords;
      const url = `https://www.google.com/maps/embed/v1/place?key=${googleMapsKey}&q=${latitude},${longitude}&zoom=16`;
      setMapUrl(url);

      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${googleMapsKey}&language=${isEn ? 'en' : 'ar'}`,
        );
        const data = (await response.json()) as any;
        if (data.results?.[0]) {
          const result = data.results[0];
          setAddressLine1(result.formatted_address);
          const cityObj = result.address_components.find((c: any) =>
            c.types.includes('locality'),
          );
          if (cityObj) setCity(cityObj.long_name);
          setIsValidated(true);
        }
      } catch (e) {}
      setIsValidating(false);
    });
  };

  const handleSearchOnMap = async (query: string) => {
    if (!query) return;
    setIsValidating(true);
    const url = `https://www.google.com/maps/embed/v1/place?key=${googleMapsKey}&q=${encodeURIComponent(query)}&zoom=16`;
    setMapUrl(url);

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${googleMapsKey}&language=${isEn ? 'en' : 'ar'}`,
      );
      const data = (await response.json()) as any;
      if (data.results?.[0]) {
        const result = data.results[0];
        setAddressLine1(result.formatted_address);
        const cityObj = result.address_components.find((c: any) =>
          c.types.includes('locality'),
        );
        if (cityObj) setCity(cityObj.long_name);
        setIsValidated(true);
      }
    } catch (e) {}
    setIsValidating(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#fcfaf5] w-full max-w-2xl rounded-3xl p-6 md:p-8 relative shadow-2xl overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="account-heading" style={{fontSize: '22px'}}>
          {type === 'create' ? (isEn ? 'Add New Address' : 'إضافة عنوان جديد') : (isEn ? 'Edit Address' : 'تعديل العنوان')}
        </h3>

        <fetcher.Form
          method={type === 'create' ? 'POST' : 'PUT'}
        >
          <input type="hidden" name="addressId" value={address?.id ?? 'new'} />
          <input type="hidden" name="lat" value={coords?.lat ?? ''} />
          <input type="hidden" name="lng" value={coords?.lng ?? ''} />

          <div style={{marginBottom: '24px'}}>
            <label className="account-field-label">
              {isEn ? 'Validate Location on Map' : 'تأكيد الموقع على الخريطة'}
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder={
                  isEn ? 'Search area, street...' : 'ابحث عن منطقة، شارع...'
                }
                className="account-input"
                onKeyDown={(e) =>
                  e.key === 'Enter' &&
                  (e.preventDefault(), handleSearchOnMap(e.currentTarget.value))
                }
              />
              <button
                type="button"
                onClick={handleLocateMe}
                className="px-4 bg-[#fcfaf5] border-2 border-gray-100 rounded-xl hover:border-gray-300 transition-all text-gray-600"
              >
                📍
              </button>
            </div>

            <div className="w-full h-[200px] bg-gray-50 rounded-2xl overflow-hidden border-2 border-gray-100 relative group">
              {mapUrl ? (
                <>
                  <iframe
                    title="Map Picker"
                    src={mapUrl}
                    width="100%"
                    height="100%"
                    style={{border: 0}}
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/5 group-hover:bg-black/10 transition-colors flex items-center justify-center pointer-events-none">
                    <button
                      type="button"
                      onClick={() => setIsMapPickerOpen(true)}
                      className="pointer-events-auto px-4 py-2 bg-white text-[#234745] rounded-full shadow-lg font-bold text-[13px] border-2 border-[#234745]/10 hover:scale-105 active:scale-95 transition-all"
                    >
                      {isEn ? 'Change Location' : 'تغيير الموقع'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                  <p className="text-[13px] text-gray-400 mb-3">
                    {isEn
                      ? 'Pin your location on the map'
                      : 'قم بتحديد موقعك على الخريطة'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsMapPickerOpen(true)}
                    className="px-6 py-2.5 bg-[#234745] text-white rounded-full font-bold text-[14px] shadow-sm hover:shadow-md transition-all"
                  >
                    {isEn ? 'Open Map' : 'فتح الخريطة'}
                  </button>
                </div>
              )}
            </div>
            {!isValidated && (
              <p className="text-[11px] text-red-500 mt-2 font-bold uppercase tracking-tight">
                {isEn
                  ? '* Map selection required for delivery accuracy'
                  : '* تحديد الموقع على الخريطة مطلوب لدقة التوصيل'}
              </p>
            )}
          </div>

          {isMapPickerOpen && (
            <MapPickerDialog
              googleMapsKey={googleMapsKey}
              isEn={isEn}
              initialCoords={coords}
              initialAddress={addressLine1}
              onClose={() => setIsMapPickerOpen(false)}
              onConfirm={handleLocationConfirm}
            />
          )}

          <div className="account-form-grid">
            <div>
              <label className="account-field-label">الاسم الأول</label>
              <input
                name="firstName"
                defaultValue={address?.firstName ?? ''}
                className="account-input"
                required
              />
            </div>
            <div>
              <label className="account-field-label">الاسم الأخير</label>
              <input
                name="lastName"
                defaultValue={address?.lastName ?? ''}
                className="account-input"
                required
              />
            </div>
          </div>

          <div style={{marginTop: '20px'}}>
            <label className="account-field-label">
              العنوان (الشارع، الحي)
            </label>
            <input
              name="address1"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              className="account-input"
              required
            />
          </div>

          <div style={{marginTop: '20px'}}>
            <label className="account-field-label">المدينة</label>
            <input
              name="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="account-input"
              required
            />
          </div>

          <div style={{marginTop: '20px'}}>
            <label className="account-field-label">رقم الجوال</label>
            <input
              name="phone"
              defaultValue={address?.phone ?? ''}
              className="account-input"
              dir="ltr"
              placeholder="+966XXXXXXXXX"
              required
            />
          </div>

          <div
            style={{
              marginTop: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <input
              type="checkbox"
              name="defaultAddress"
              id="defaultAddress"
              defaultChecked={isDefault}
              style={{width: '18px', height: '18px'}}
            />
            <label
              htmlFor="defaultAddress"
              style={{fontSize: '14px', fontWeight: '600', color: '#666'}}
            >
              تعيين كعنوان افتراضي
            </label>
          </div>

          {errorMessage && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-semibold">
              {errorMessage}
            </div>
          )}

          <div style={{marginTop: '40px', display: 'flex', gap: '16px'}}>
            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="lg"
              disabled={isLoading || (!isValidated && type === 'create')}
            >
              {isLoading
                ? isEn
                  ? 'Saving...'
                  : 'جاري الحفظ...'
                : isEn
                  ? 'Save Address'
                  : 'حفظ العنوان'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              fullWidth
              size="lg"
              onClick={onClose}
            >
              {isEn ? 'Cancel' : 'إلغاء'}
            </Button>
          </div>
        </fetcher.Form>
      </div>
    </div>
  );
}

const UPDATE_ADDRESS_MUTATION = `#graphql
  mutation customerAddressUpdate($address: MailingAddressInput!, $customerAccessToken: String!, $id: ID!) {
    customerAddressUpdate(address: $address, customerAccessToken: $customerAccessToken, id: $id) {
      customerAddress { id }
      customerUserErrors { message }
    }
  }
` as const;

const DELETE_ADDRESS_MUTATION = `#graphql
  mutation customerAddressDelete($customerAccessToken: String!, $id: ID!) {
    customerAddressDelete(customerAccessToken: $customerAccessToken, id: $id) {
      customerUserErrors { message }
      deletedCustomerAddressId
    }
  }
` as const;

const UPDATE_DEFAULT_ADDRESS_MUTATION = `#graphql
  mutation customerDefaultAddressUpdate($addressId: ID!, $customerAccessToken: String!) {
    customerDefaultAddressUpdate(addressId: $addressId, customerAccessToken: $customerAccessToken) {
      customer { defaultAddress { id } }
      customerUserErrors { message }
    }
  }
` as const;

const CREATE_ADDRESS_MUTATION = `#graphql
  mutation customerAddressCreate($address: MailingAddressInput!, $customerAccessToken: String!) {
    customerAddressCreate(address: $address, customerAccessToken: $customerAccessToken) {
      customerAddress { id }
      customerUserErrors { message }
    }
  }
` as const;

// ─── MAP PICKER DIALOG ──────────────────────────────────────────────────────
function MapPickerDialog({
  googleMapsKey,
  isEn,
  initialCoords,
  initialAddress,
  onClose,
  onConfirm,
}: {
  googleMapsKey: string;
  isEn: boolean;
  initialCoords?: {lat: number; lng: number} | null;
  initialAddress?: string;
  onClose: () => void;
  onConfirm: (res: {
    address: string;
    city: string;
    lat: number;
    lng: number;
  }) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const defaultLoc = initialCoords || {lat: 24.7136, lng: 46.6753}; // Default or current
  const [address, setAddress] = useState(initialAddress || '');
  const [city, setCity] = useState('');
  const [coords, setCoords] = useState<{lat: number; lng: number}>(defaultLoc);
  const [isResolving, setIsResolving] = useState(false);
  const [isSdkLoaded, setIsSdkLoaded] = useState(false);

  useEffect(() => {
    // Check if script already exists
    if ((window as any).google?.maps) {
      setIsSdkLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsKey}&libraries=places&language=${isEn ? 'en' : 'ar'}`;
    script.async = true;
    script.defer = true;
    script.onload = () => setIsSdkLoaded(true);
    document.head.appendChild(script);
  }, [googleMapsKey, isEn]);

  useEffect(() => {
    if (!isSdkLoaded || !mapRef.current) return;

    const map = new (window as any).google.maps.Map(mapRef.current, {
      center: defaultLoc,
      zoom: initialCoords ? 16 : 15,
      disableDefaultUI: true,
      zoomControl: false,
    });

    const geocoder = new (window as any).google.maps.Geocoder();
    const autocomplete = new (window as any).google.maps.places.Autocomplete(
      searchRef.current!,
    );
    autocomplete.bindTo('bounds', map);

    const resolveAddress = (lat: number, lng: number) => {
      setIsResolving(true);
      setCoords({lat, lng});
      geocoder.geocode({location: {lat, lng}}, (results: any, status: any) => {
        if (status === 'OK' && results?.[0]) {
          const res = results[0];
          setAddress(res.formatted_address);
          const cityComp = res.address_components.find((c: any) =>
            c.types.includes('locality') ||
            c.types.includes('administrative_area_level_2') ||
            c.types.includes('administrative_area_level_1') ||
            c.types.includes('sublocality'),
          );
          if (cityComp) setCity(cityComp.long_name);
        } else {
          setAddress((prev) => prev || `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        }
        setIsResolving(false);
      });
    };

    // Initial center pick
    resolveAddress(defaultLoc.lat, defaultLoc.lng);

    map.addListener('idle', () => {
      const center = map.getCenter();
      if (center) {
        resolveAddress(center.lat(), center.lng());
      }
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.geometry?.location) {
        map.setCenter(place.geometry.location);
        map.setZoom(17);
      }
    });

    // Handle user location button
    const locateMe = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          const loc = {lat: pos.coords.latitude, lng: pos.coords.longitude};
          map.setCenter(loc);
          map.setZoom(17);
        });
      }
    };

    (window as any)._locateMe = locateMe;

    return () => {
      (window as any).google.maps.event.clearInstanceListeners(map);
    };
  }, [isSdkLoaded]);

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[800px] h-[80vh] bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Search */}
        <div className="absolute top-4 left-4 right-4 z-[10] flex gap-2">
          <div className="flex-1 relative bg-white rounded-2xl shadow-lg border-2 border-[#234745]/5 overflow-hidden">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <input
              ref={searchRef}
              type="text"
              placeholder={isEn ? 'Search for location...' : 'ابحث عن موقع...'}
              className="w-full h-12 pl-12 pr-4 text-[14px] font-bold text-gray-700 outline-none"
            />
          </div>
          <button
            onClick={() => (window as any)._locateMe?.()}
            className="w-12 h-12 bg-white rounded-2xl shadow-lg flex items-center justify-center text-[#234745] shrink-0 border-2 border-[#234745]/5 active:scale-95 transition-transform"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z" />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="w-12 h-12 bg-white rounded-2xl shadow-lg flex items-center justify-center text-gray-400 shrink-0 border-2 border-[#234745]/5 active:scale-95 transition-transform text-2xl font-light"
          >
            &times;
          </button>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative bg-gray-100 min-h-[300px]">
          <div ref={mapRef} className="absolute inset-0 z-0" />

          {/* Custom Center Pin */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none mb-8">
            <div className="relative flex flex-col items-center">
              <div className="w-10 h-10 bg-[#234745] rounded-full border-4 border-white shadow-xl flex items-center justify-center animate-bounce">
                <div className="w-2 h-2 bg-yellow-400 rounded-full" />
              </div>
              <div className="w-1 h-3 bg-[#234745] rounded-b-full -mt-0.5 shadow-sm" />
              <div className="w-3 h-1.5 bg-black/20 rounded-full blur-[2px] mt-1" />
            </div>
          </div>
        </div>

        {/* Footer Confirmation */}
        <div className="bg-white p-5 sm:p-6 border-t border-gray-100">
          <div className="mb-5">
            <p className="text-[11px] font-bold text-[#234745]/40 uppercase tracking-widest mb-1.5">
              {isEn ? 'Confirm Delivery Spot' : 'تأكيد موقع التوصيل'}
            </p>
            <div className="flex items-start gap-3">
              <div className="mt-1 text-[#234745]">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div className="flex-1">
                {isResolving ? (
                  <div className="h-4 w-2/3 bg-gray-100 rounded animate-pulse" />
                ) : (
                  <p className="text-[14px] font-bold text-gray-800 leading-snug line-clamp-2">
                    {address ||
                      (isEn
                        ? 'Move the map to select address'
                        : 'حرك الخريطة لتحديد العنوان')}
                  </p>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={!coords || isResolving}
            onClick={() =>
              coords &&
              onConfirm({
                address:
                  address || `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`,
                city: city || 'Jeddah',
                ...coords,
              })
            }
            className={`w-full py-4 rounded-2xl font-bold text-[15px] shadow-lg transition-all ${!coords || isResolving ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-[#234745] text-white hover:bg-[#153125] active:scale-[0.98] shadow-[#234745]/20'}`}
          >
            {isEn ? 'Confirm Location' : 'تأكيد الموقع'}
          </button>
        </div>
      </div>
    </div>
  );
}
