import {useState, useEffect} from 'react';
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
import {stripCoordsMarker} from '~/lib/address-coords';
import {AddressForm} from '~/components/AddressForm';

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
    address2: stripCoordsMarker(adminAddr.address2),
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
          // Exact only: a last-9-digit match could point the
          // Admin-token address mutations at another customer's records.
          return cp === rawDigits;
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

  /**
   * Gone is gone. A 404 here means Shopify has no such address on this
   * customer, which is the state the caller asked for.
   *
   * It is logged rather than passed over in silence, because the other way
   * to get a 404 is a malformed URL -- a customer id that is really a gid,
   * an address id that kept its `?model_name=` suffix -- and that failure
   * would otherwise look exactly like success.
   */
  if (res.status === 404) {
    console.warn(
      `[Addresses] Admin delete returned 404 for customer ${customerId}, address ${numAddrId} — treating as already deleted.`,
    );
    return true;
  }

  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as any;
    const detail = json?.errors ? JSON.stringify(json.errors) : '';

    /**
     * Shopify refuses to delete a customer's default address, and says so
     * with a 422. That is a rule, not a fault, and the shopper can clear it
     * themselves by making another address the default first -- so it is
     * given its own code and its own sentence instead of arriving as a raw
     * API string in a red box.
     */
    if (res.status === 422 || /default/i.test(detail)) {
      const err: any = new Error(detail || 'Cannot delete the default address');
      err.code = 'DEFAULT_ADDRESS';
      throw err;
    }

    throw new Error(detail || 'Failed to delete address');
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
  const actionIsEn = storefront.i18n?.language === 'EN';

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

    for (const key of keys) {
      const value = form.get(key);
      if (typeof value === 'string') {
        if (key === 'phone') {
          address.phone = formatAddressPhone(value);
        } else if (key === 'lat' || key === 'lng') {
          /**
           * The map pin is accepted and deliberately not stored. Shopify has
           * no field for it, so it used to be written over address2 - the
           * shopper's apartment/floor line, which checkout prints and which
           * they had just typed. Nearest-branch matching reads Shopify's own
           * geocoding of the address instead; see ~/lib/address-coords.
           */
        } else {
          (address as any)[key] = value;
        }
      }
    }

    // Never carry a legacy marker back into Shopify on save.
    address.address2 = stripCoordsMarker(address.address2);

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

          /**
           * Nothing actually ran. Both the Storefront mutation and the
           * Admin fallback were skipped, yet this returned `error: null`
           * and the UI marked the address default locally while Shopify
           * still held the old one.
           */
          console.error(
            '[Addresses] Could not set default address — no path succeeded.',
          );
          return data(
            {
              error: actionIsEn
                ? 'Could not update your default address. Please try again.'
                : 'تعذر تحديث العنوان الافتراضي. يرجى المحاولة مرة أخرى.',
            },
            {status: 500},
          );
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

            /**
             * Success is the id coming back — NOT the absence of a complaint.
             *
             * This used to accept `!customerUserErrors?.length`. When the
             * mutation fails outright, `customerAddressDelete` is null, so
             * that expression reads `undefined?.length` -> undefined ->
             * `!undefined` -> true: a null payload was indistinguishable
             * from a clean delete. The route then returned success, the
             * dialog closed, the row vanished locally, and the address was
             * still on Shopify — back on the next load.
             *
             * This shop runs New Customer Accounts, where a classic
             * `customerAccessToken` is not a valid credential, so this
             * mutation fails on EVERY call and every delete took that false
             * path. The Admin fallback below — the one that actually works —
             * was never reached.
             *
             * `deletedCustomerAddressId` is Shopify confirming what it
             * removed, which is the same shape of check the create path has
             * always made with `customerAddress`.
             */
            const payload = res?.customerAddressDelete;
            if (
              payload?.deletedCustomerAddressId &&
              !payload?.customerUserErrors?.length
            ) {
              return data({error: null, deletedAddress: addressId});
            }
          } catch (_) {}
        }

        if (customerNumericId && numericAddrId) {
          try {
            await adminDeleteAddress({
              customerId: customerNumericId,
              addressId: numericAddrId,
              env,
            });
            return data({error: null, deletedAddress: addressId});
          } catch (err: any) {
            if (err?.code === 'DEFAULT_ADDRESS') {
              return data(
                {
                  error: actionIsEn
                    ? 'This is your default address. Set another address as default first, then delete this one.'
                    : 'هذا هو عنوانك الافتراضي. يرجى تعيين عنوان آخر كافتراضي أولاً، ثم حذف هذا العنوان.',
                },
                {status: 409},
              );
            }
            throw err;
          }
        }

        /**
         * Same as above, and worse: the customer believes a saved address
         * — name, street, phone — was deleted for privacy, the row
         * disappears locally, and the record survives on Shopify.
         */
        console.error(
          '[Addresses] Could not delete address — no path succeeded.',
        );
        return data(
          {
            error: actionIsEn
              ? 'Could not delete this address. Please try again.'
              : 'تعذر حذف هذا العنوان. يرجى المحاولة مرة أخرى.',
          },
          {status: 500},
        );
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

  /**
   * A refusal has to be readable, not just non-fatal.
   *
   * The effect above closes the dialog on success and leaves it open on
   * failure — but nothing rendered the reason, so a delete Shopify had
   * refused looked identical to a button that did nothing at all. The route
   * returns a plain sentence for delete failures (the default-address rule
   * is the one a shopper can act on); the object shape is read too, because
   * the shared error handler wraps thrown errors as `{form: message}`.
   */
  const deleteError =
    typeof (fetcher.data as any)?.error === 'string'
      ? ((fetcher.data as any).error as string)
      : (fetcher.data as any)?.error?.form ||
        (fetcher.data as any)?.error?.[addressId] ||
        null;

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

        {deleteError && (
          <p
            role="alert"
            className="text-[13px] font-normal leading-relaxed text-start text-[#A63D2B] bg-[#FFF6F4] px-4 py-3 rounded-xl border border-[#F3D3CC] mb-5"
          >
            {deleteError}
          </p>
        )}

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

/**
 * The overlay around the shared form. The form itself now lives in
 * ~/components/AddressForm so the delivery modal can host it inline; see the
 * note at the top of that file.
 */
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
  const {googleMapsKey, locale} = useOutletContext<{
    googleMapsKey: string;
    locale: string;
  }>();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#fcfaf5] w-full max-w-2xl rounded-3xl p-6 md:p-8 relative shadow-2xl overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <AddressForm
          type={type}
          address={address}
          isDefault={isDefault}
          googleMapsKey={googleMapsKey}
          isEn={locale === 'en'}
          onSuccess={onSuccess}
          onClose={onClose}
        />
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
