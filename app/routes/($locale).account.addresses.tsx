import { useState, useEffect, useRef } from 'react';
import type { MailingAddressInput } from '@shopify/hydrogen/storefront-api-types';
import type { AddressFragment, CustomerFragment } from 'storefrontapi.generated';
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
  useNavigation,
  useOutletContext,
} from 'react-router';
import { Button } from '~/components/layout/Button';

export type ActionResponse = {
  addressId?: string | null;
  createdAddress?: AddressFragment;
  defaultAddress?: string | null;
  deletedAddress?: string | null;
  error: Record<AddressFragment['id'], string> | null;
  updatedAddress?: AddressFragment;
};

export const meta: MetaFunction<typeof loader> = () => {
  return [{ title: 'Addresses | Saadeddin' }];
};

export async function loader({ context }: LoaderFunctionArgs) {
  const { session } = context;
  const customerAccessToken = await session.get('customerAccessToken');
  if (!customerAccessToken) {
    return redirect('/account/login');
  }
  return data({});
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { storefront, session } = context;

  try {
    const form = await request.formData();
    const addressId = form.has('addressId') ? String(form.get('addressId')) : 'new';
    const customerAccessToken = await session.get('customerAccessToken');

    if (!customerAccessToken) {
      return data({ error: { [addressId]: 'Unauthorized' } }, { status: 401 });
    }
    const { accessToken } = customerAccessToken;

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

    const latlng = { lat: '', lng: '' };

    for (const key of keys) {
      const value = form.get(key);
      if (typeof value === 'string') {
        if (key === 'phone') {
          let cleanPhone = value.replace(/\D/g, '');
          if (value.startsWith('+')) {
            address.phone = value.replace(/\s/g, '');
          } else if (cleanPhone.startsWith('00966')) {
            address.phone = `+${cleanPhone.substring(2)}`;
          } else if (cleanPhone.startsWith('966')) {
            address.phone = `+${cleanPhone}`;
          } else {
            const finalPhone = cleanPhone.startsWith('0') ? cleanPhone.substring(1) : cleanPhone;
            address.phone = finalPhone ? `+966${finalPhone}` : undefined;
          }
        } else if (key === 'lat') {
          latlng.lat = value;
        } else if (key === 'lng') {
          latlng.lng = value;
        } else {
          (address as any)[key] = value;
        }
      }
    }

    // Pack lat/lng into address2 if present
    if (latlng.lat && latlng.lng) {
      address.address2 = `COORDS:${latlng.lat},${latlng.lng}`;
    }

    switch (request.method) {
      case 'POST': {
        const { customerAddressCreate } = await storefront.mutate(CREATE_ADDRESS_MUTATION, {
          variables: { customerAccessToken: accessToken, address },
        });

        if (customerAddressCreate?.customerUserErrors?.length) {
          throw new Error(customerAddressCreate.customerUserErrors[0].message);
        }

        const createdAddress = customerAddressCreate?.customerAddress;
        if (defaultAddress && createdAddress?.id) {
          await storefront.mutate(UPDATE_DEFAULT_ADDRESS_MUTATION, {
            variables: {
              customerAccessToken: accessToken,
              addressId: decodeURIComponent(createdAddress.id) as any
            },
          });
        }
        return data({ error: null, createdAddress, defaultAddress });
      }

      case 'PUT': {
        const { customerAddressUpdate } = await storefront.mutate(UPDATE_ADDRESS_MUTATION, {
          variables: {
            address,
            customerAccessToken: accessToken,
            id: decodeURIComponent(addressId) as any
          },
        });

        if (customerAddressUpdate?.customerUserErrors?.length) {
          throw new Error(customerAddressUpdate.customerUserErrors[0].message);
        }

        if (defaultAddress) {
          await storefront.mutate(UPDATE_DEFAULT_ADDRESS_MUTATION, {
            variables: {
              customerAccessToken: accessToken,
              addressId: decodeURIComponent(addressId) as any
            },
          });
        }
        return data({ error: null, updatedAddress: customerAddressUpdate?.customerAddress, defaultAddress });
      }

      case 'DELETE': {
        const { customerAddressDelete } = await storefront.mutate(DELETE_ADDRESS_MUTATION, {
          variables: {
            customerAccessToken: accessToken,
            id: decodeURIComponent(addressId) as any
          },
        });

        if (customerAddressDelete?.customerUserErrors?.length) {
          throw new Error(customerAddressDelete.customerUserErrors[0].message);
        }
        return data({ error: null, deletedAddress: addressId });
      }

      default:
        return data({ error: { [addressId]: 'Method not allowed' } }, { status: 405 });
    }
  } catch (error: any) {
    return data({ error: { 'form': error.message } }, { status: 400 });
  }
}

export default function Addresses() {
  const { customer } = useOutletContext<{ customer: CustomerFragment }>();
  const { defaultAddress, addresses } = customer;
  const [activeModal, setActiveModal] = useState<{ type: 'create' | 'edit', address?: AddressFragment } | null>(null);
  const locale = useOutletContext<{ locale: string }>().locale;
  const isEn = locale === 'en';
  const [addressToDelete, setAddressToDelete] = useState<string | null>(null);

  return (
    <div className="account-addresses-section">
      <h2 className="account-heading">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        {isEn ? 'Delivery Addresses' : 'عناوين التوصيل'}
      </h2>

      <div className="address-card-grid">
        <div className="add-address-card" onClick={() => setActiveModal({ type: 'create' })}>
          <div className="add-address-icon">+</div>
          <div className="add-address-text">{isEn ? 'Add New Address' : 'إضافة عنوان جديد'}</div>
        </div>

        {addresses.nodes.map((address) => (
          <div key={address.id} className={`address-card ${defaultAddress?.id === address.id ? 'is-default' : ''}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="address-name !mb-0">{address.firstName} {address.lastName}</div>
              {defaultAddress?.id === address.id && <span className="address-badge !relative !top-auto !left-auto !right-auto m-0 shrink-0">{isEn ? 'Default' : 'افتراضي'}</span>}
            </div>
            <div className="address-details">
              <p>{address.address1}</p>
              <p>{address.city}</p>
              <p style={{ direction: 'ltr', textAlign: isEn ? 'left' : 'right' }}>{address.phone}</p>
            </div>
            <div className="address-actions">
              <button className="address-action-btn" onClick={() => setActiveModal({ type: 'edit', address })}>
                {isEn ? 'Edit' : 'تعديل'}
              </button>
              <button 
                type="button" 
                className="address-action-btn delete"
                onClick={() => setAddressToDelete(address.id)}
              >
                 {isEn ? 'Delete' : 'حذف'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {activeModal && (
        <AddressModal
          type={activeModal.type}
          address={activeModal.address}
          isDefault={defaultAddress?.id === activeModal.address?.id}
          onClose={() => setActiveModal(null)}
        />
      )}

      {addressToDelete && (
        <DeleteConfirmationModal
          onClose={() => setAddressToDelete(null)}
          addressId={addressToDelete}
          locale={locale}
        />
      )}
    </div>
  );
}

function DeleteConfirmationModal({ onClose, addressId, locale }: { onClose: () => void, addressId: string, locale: string }) {
  const isEn = locale === 'en';
  return (
    <div className="address-modal-overlay" onClick={onClose} style={{ zIndex: 1001 }}>
      <div className="address-modal-container !max-w-[400px] !p-8 text-center" onClick={e => e.stopPropagation()}>
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
          🗑️
        </div>
        <h3 className="text-xl font-black text-gray-900 mb-2">
          {isEn ? 'Delete Address?' : 'حذف العنوان؟'}
        </h3>
        <p className="text-gray-500 text-sm font-bold mb-8 leading-relaxed">
          {isEn ? 'Are you sure you want to remove this address? This action cannot be undone.' : 'هل أنت متأكد من رغبتك في حذف هذا العنوان؟ لا يمكن التراجع عن هذا الإجراء.'}
        </p>
        <div className="flex gap-3">
          <Form method="DELETE" className="flex-1" onSubmit={onClose}>
             <input type="hidden" name="addressId" value={addressId} />
             <Button type="submit" variant="primary" fullWidth size="lg" className="!bg-red-500 hover:!bg-red-600 !border-red-500">
               {isEn ? 'Delete' : 'حذف'}
             </Button>
          </Form>
          <Button type="button" variant="secondary" className="flex-1" size="lg" onClick={onClose}>
            {isEn ? 'Cancel' : 'إلغاء'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function AddressModal({ type, address, isDefault, onClose }: { type: 'create' | 'edit', address?: AddressFragment, isDefault?: boolean, onClose: () => void }) {
  const navigation = useNavigation();
  const { googleMapsKey, locale } = useOutletContext<{ googleMapsKey: string, locale: string }>();
  const isEn = locale === 'en';
  const isLoading = navigation.state !== 'idle';

  const [city, setCity] = useState(address?.city ?? '');
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [isValidated, setIsValidated] = useState(type === 'edit');
  const [isValidating, setIsValidating] = useState(false);
  const [addressLine1, setAddressLine1] = useState(address?.address1 ?? '');

  // Initial preview URL if we have an address already
  useEffect(() => {
    if (address?.address1 && !mapUrl) {
      setMapUrl(`https://www.google.com/maps/embed/v1/place?key=${googleMapsKey}&q=${encodeURIComponent(address.address1 + ' ' + (address.city || ''))}&zoom=16`);
    }
  }, [address, googleMapsKey, mapUrl]);

  // State to hold coordinates
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(() => {
    if (address?.address2?.includes('COORDS:')) {
        const match = address.address2.match(/COORDS:(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (match) return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
    }
    return null;
  });

  const handleLocationConfirm = (result: any) => {
    setAddressLine1(result.address);
    setCity(result.city);
    setCoords({ lat: result.lat, lng: result.lng });
    
    // Update preview map
    const { lat, lng } = result;
    setMapUrl(`https://www.google.com/maps/embed/v1/view?key=${googleMapsKey}&center=${lat},${lng}&zoom=17`);
    
    setIsValidated(true);
    setIsMapPickerOpen(false);
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setIsValidating(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      const url = `https://www.google.com/maps/embed/v1/place?key=${googleMapsKey}&q=${latitude},${longitude}&zoom=16`;
      setMapUrl(url);

      try {
        const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${googleMapsKey}&language=${isEn ? 'en' : 'ar'}`);
        const data = await response.data() as any;
        if (data.results?.[0]) {
            const result = data.results[0];
            setAddressLine1(result.formatted_address);
            const cityObj = result.address_components.find((c: any) => c.types.includes('locality'));
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
        const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${googleMapsKey}&language=${isEn ? 'en' : 'ar'}`);
        const data = await response.data() as any;
        if (data.results?.[0]) {
            const result = data.results[0];
            setAddressLine1(result.formatted_address);
            const cityObj = result.address_components.find((c: any) => c.types.includes('locality'));
            if (cityObj) setCity(cityObj.long_name);
            setIsValidated(true);
        }
    } catch (e) {}
    setIsValidating(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[#fcfaf5] w-full max-w-2xl rounded-3xl p-6 md:p-8 relative shadow-2xl overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <h3 className="account-heading" style={{ fontSize: '22px' }}>
          {type === 'create' ? 'إضافة عنوان جديد' : 'تعديل العنوان'}
        </h3>

        <Form method={type === 'create' ? 'POST' : 'PUT'} onSubmit={() => setTimeout(onClose, 1000)}>
          <input type="hidden" name="addressId" value={address?.id ?? 'new'} />
          <input type="hidden" name="lat" value={coords?.lat ?? ''} />
          <input type="hidden" name="lng" value={coords?.lng ?? ''} />

          <div style={{ marginBottom: '24px' }}>
            <label className="account-field-label">{isEn ? 'Validate Location on Map' : 'تأكيد الموقع على الخريطة'}</label>
            <div className="flex gap-2 mb-3">
               <input 
                 type="text" 
                 placeholder={isEn ? "Search area, street..." : "ابحث عن منطقة، شارع..."}
                 className="account-input" 
                 onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchOnMap(e.currentTarget.value))}
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
                     style={{ border: 0 }}
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
                    <p className="text-[13px] text-gray-400 mb-3">{isEn ? 'Pin your location on the map' : 'قم بتحديد موقعك على الخريطة'}</p>
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
                {isEn ? '* Map selection required for delivery accuracy' : '* تحديد الموقع على الخريطة مطلوب لدقة التوصيل'}
              </p>
            )}
          </div>

          {isMapPickerOpen && (
             <MapPickerDialog 
               googleMapsKey={googleMapsKey} 
               isEn={isEn} 
               onClose={() => setIsMapPickerOpen(false)} 
               onConfirm={handleLocationConfirm}
             />
          )}

          <div className="account-form-grid">
            <div>
              <label className="account-field-label">الاسم الأول</label>
              <input name="firstName" defaultValue={address?.firstName ?? ''} className="account-input" required />
            </div>
            <div>
              <label className="account-field-label">الاسم الأخير</label>
              <input name="lastName" defaultValue={address?.lastName ?? ''} className="account-input" required />
            </div>
          </div>

          <div style={{ marginTop: '20px' }}>
            <label className="account-field-label">العنوان (الشارع، الحي)</label>
            <input 
              name="address1" 
              value={addressLine1} 
              onChange={(e) => setAddressLine1(e.target.value)}
              className="account-input" 
              required 
            />
          </div>

          <div style={{ marginTop: '20px' }}>
            <label className="account-field-label">المدينة</label>
            <input 
              name="city" 
              value={city} 
              onChange={(e) => setCity(e.target.value)}
              className="account-input" 
              required 
            />
          </div>

          <div style={{ marginTop: '20px' }}>
            <label className="account-field-label">رقم الجوال</label>
            <input name="phone" defaultValue={address?.phone ?? ''} className="account-input" placeholder="+966XXXXXXXXX" required />
          </div>

          <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input type="checkbox" name="defaultAddress" id="defaultAddress" defaultChecked={isDefault} style={{ width: '18px', height: '18px' }} />
            <label htmlFor="defaultAddress" style={{ fontSize: '14px', fontWeight: '600', color: '#666' }}>تعيين كعنوان افتراضي</label>
          </div>

          <div style={{ marginTop: '40px', display: 'flex', gap: '16px' }}>
            <Button type="submit" variant="primary" fullWidth size="lg" disabled={isLoading || (!isValidated && type === 'create')}>
              {isLoading ? 'جاري الحفظ...' : 'حفظ العنوان'}
            </Button>
            <Button type="button" variant="secondary" fullWidth size="lg" onClick={onClose}>
              إلغاء
            </Button>
          </div>
        </Form>
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
  onClose, 
  onConfirm 
}: { 
  googleMapsKey: string; 
  isEn: boolean; 
  onClose: () => void; 
  onConfirm: (res: { address: string; city: string; lat: number; lng: number }) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
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

    const defaultLoc = { lat: 24.7136, lng: 46.6753 }; // Riyadh
    const map = new (window as any).google.maps.Map(mapRef.current, {
      center: defaultLoc,
      zoom: 15,
      disableDefaultUI: true,
      zoomControl: false,
    });

    const geocoder = new (window as any).google.maps.Geocoder();
    const autocomplete = new (window as any).google.maps.places.Autocomplete(searchRef.current!);
    autocomplete.bindTo('bounds', map);

    const resolveAddress = (lat: number, lng: number) => {
      setIsResolving(true);
      geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
        if (status === 'OK' && results?.[0]) {
          const res = results[0];
          setAddress(res.formatted_address);
          const cityComp = res.address_components.find((c: any) => c.types.includes('locality'));
          if (cityComp) setCity(cityComp.long_name);
          setCoords({ lat, lng });
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
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
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
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4 sm:p-6" onClick={onClose}>
      <div className="relative w-full max-w-[800px] h-[80vh] bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header Search */}
        <div className="absolute top-4 left-4 right-4 z-[10] flex gap-2">
            <div className="flex-1 relative bg-white rounded-2xl shadow-lg border-2 border-[#234745]/5 overflow-hidden">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                </div>
                <input 
                  ref={searchRef}
                  type="text" 
                  placeholder={isEn ? "Search for location..." : "ابحث عن موقع..."} 
                  className="w-full h-12 pl-12 pr-4 text-[14px] font-bold text-gray-700 outline-none"
                />
            </div>
            <button 
              onClick={() => (window as any)._locateMe?.()}
              className="w-12 h-12 bg-white rounded-2xl shadow-lg flex items-center justify-center text-[#234745] shrink-0 border-2 border-[#234745]/5 active:scale-95 transition-transform"
            >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z" /></svg>
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
                <p className="text-[11px] font-bold text-[#234745]/40 uppercase tracking-widest mb-1.5">{isEn ? 'Confirm Delivery Spot' : 'تأكيد موقع التوصيل'}</p>
                <div className="flex items-start gap-3">
                   <div className="mt-1 text-[#234745]">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
                   </div>
                   <div className="flex-1">
                      {isResolving ? (
                        <div className="h-4 w-2/3 bg-gray-100 rounded animate-pulse" />
                      ) : (
                        <p className="text-[14px] font-bold text-gray-800 leading-snug line-clamp-2">
                          {address || (isEn ? 'Move the map to select address' : 'حرك الخريطة لتحديد العنوان')}
                        </p>
                      )}
                   </div>
                </div>
             </div>

             <button 
               type="button"
               disabled={!coords || isResolving}
               onClick={() => coords && onConfirm({ address, city, ...coords })}
               className={`w-full py-4 rounded-2xl font-bold text-[15px] shadow-lg transition-all ${(!coords || isResolving) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-[#234745] text-white hover:bg-[#153125] active:scale-[0.98] shadow-[#234745]/20'}`}
             >
               {isEn ? 'Confirm Location' : 'تأكيد الموقع'}
             </button>
        </div>
      </div>
    </div>
  );
}






