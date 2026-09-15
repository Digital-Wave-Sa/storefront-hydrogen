/**
 * The address form, shared by the account page and the delivery modal.
 *
 * It used to live only inside `account.addresses.tsx`, so «إضافة عنوان جديد»
 * anywhere else was a link that navigated away. A shopper three steps into the
 * cake builder lost the page they were on and had to find their way back; the
 * builder keeps a localStorage copy of the design precisely because of that
 * detour. Extracted here so the delivery modal can host the form in place.
 *
 * Two things had to change for it to work off-route: the Google Maps key comes
 * in as a prop rather than from the account outlet context, and the fetcher
 * posts to /account/addresses explicitly instead of to the current route.
 */
import {useState, useEffect, useRef} from 'react';
import type {AddressFragment} from 'storefrontapi.generated';
import {useFetcher} from 'react-router';
import {Button} from '~/components/layout/Button';
import {addressCoords, stripCoordsMarker} from '~/lib/address-coords';
import type {ActionResponse} from '~/routes/($locale).account.addresses';

export function AddressForm({
  type,
  address,
  isDefault,
  googleMapsKey,
  isEn,
  showHeading = true,
  mode = 'standalone',
  location = null,
  onSuccess,
  onClose,
}: {
  type: 'create' | 'edit';
  address?: AddressFragment;
  isDefault?: boolean;
  /** Passed in rather than read from the account outlet, so the form also
   *  works inside DeliveryPickupModal, which renders on any route. */
  googleMapsKey: string;
  isEn: boolean;
  /** The delivery modal draws its own header, so it hides this one. */
  showHeading?: boolean;
  /**
   * 'standalone' carries its own map: a preview iframe and the picker dialog.
   * 'embedded' carries none -- the host already shows a map and drives the
   *  location through `location`/`onLocationChange`. Dropping the form's own
   *  map into the delivery modal put three maps on one screen.
   */
  mode?: 'standalone' | 'embedded';
  /** Embedded only: the location the host's picker has settled on. */
  location?: {address: string; city: string; lat: number; lng: number} | null;
  onSuccess?: (addr: AddressFragment, isDefault?: boolean) => void;
  onClose: () => void;
}) {
  const fetcher = useFetcher<ActionResponse>();
  /**
   * The action is named explicitly.
   *
   * A bare `fetcher.Form` posts to the route it is rendered on. That was fine
   * while this form only ever lived on /account/addresses; inside the delivery
   * modal it would post to whatever page the shopper is standing on -- the cake
   * builder, the cart -- and those actions know nothing about addresses.
   */
  const actionPath = isEn ? '/en/account/addresses' : '/account/addresses';
  const isLoading = fetcher.state !== 'idle';
  const errorMessage =
    fetcher.data?.error?.form ||
    (address?.id && fetcher.data?.error?.[address.id]) ||
    fetcher.data?.error?.new;

  useEffect(() => {
    if (fetcher.data && !fetcher.data.error) {
      if (fetcher.data.updatedAddress || fetcher.data.createdAddress) {
        const addr = (fetcher.data.updatedAddress || fetcher.data.createdAddress)!;
        /**
         * The action sends a real boolean (`String(form.get(...)) === 'on'`)
         * while ActionResponse still types this field as `string | null`, a
         * mismatch this line has carried since before it moved here. Coerced
         * rather than retyped: ActionResponse is shared with the delete and
         * update paths.
         */
        onSuccess?.(addr, Boolean(fetcher.data.defaultAddress));
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
    () => addressCoords(address),
  );

  /**
   * Embedded: the host's map is the source of truth for where this address is.
   *
   * It writes into the same three pieces of state the dialog used to set, so
   * everything downstream -- the hidden lat/lng inputs, the address and city
   * fields, the save button's validation gate -- is unchanged.
   *
   * The city is only taken when the geocoder actually returned one: it can come
   * back empty for a pin in the desert, and blanking a city the shopper has
   * already corrected by hand would be worse than leaving theirs alone.
   */
  useEffect(() => {
    if (mode !== 'embedded' || !location) return;
    setAddressLine1(location.address);
    if (location.city) setCity(location.city);
    setCoords({lat: location.lat, lng: location.lng});
    setIsValidated(true);
  }, [mode, location]);

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
    <div className="w-full">
        {showHeading && (
          <h3 className="account-heading" style={{fontSize: '22px'}}>
            {type === 'create' ? (isEn ? 'Add New Address' : 'إضافة عنوان جديد') : (isEn ? 'Edit Address' : 'تعديل العنوان')}
          </h3>
        )}

        <fetcher.Form
          method={type === 'create' ? 'POST' : 'PUT'}
          action={actionPath}
        >
          <input type="hidden" name="addressId" value={address?.id ?? 'new'} />
          <input type="hidden" name="lat" value={coords?.lat ?? ''} />
          <input type="hidden" name="lng" value={coords?.lng ?? ''} />
          {/*
            This form has never shown address2. It was only ever the hiding
            place for the pin, so it is carried through cleaned: a real
            apartment line typed in Shopify admin survives an edit here, and
            a legacy COORDS marker does not.
          */}
          <input
            type="hidden"
            name="address2"
            value={stripCoordsMarker(address?.address2)}
          />

          {/*
            The form carries its own map only when nothing else on screen does.
            Embedded in the delivery modal, the host's map is the picker and
            this whole block would be the second and third map on the page.
          */}
          {mode === 'standalone' ? (
            <>
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
            </>
          ) : (
            <div
              className={`mb-6 rounded-2xl px-4 py-3 border-2 ${
                isValidated
                  ? 'bg-[#f3f7f5] border-[#234745]/10'
                  : 'bg-amber-50 border-amber-200'
              }`}
            >
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                {isEn ? 'Pinned location' : 'الموقع المحدد'}
              </p>
              <p className="text-[13px] font-bold text-[#234745] line-clamp-2">
                {isValidated
                  ? addressLine1
                  : isEn
                    ? 'Move the map to set your location'
                    : 'حرّك الخريطة لتحديد موقعك'}
              </p>
            </div>
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
  );
}

export function MapPickerDialog({
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

/**
 * The map, with no dialog around it.
 *
 * MapPickerDialog is this map plus a fixed-position overlay. Inside the
 * delivery modal that overlay was the problem: `.dpm-overlay` sets
 * `backdrop-filter`, which makes it the containing block for fixed
 * descendants, and `.dpm-container` sits between the two with
 * `overflow: hidden` -- so the "full screen" picker was cropped to the modal's
 * rounded box, landing inside the side panel next to two other maps.
 *
 * Extracted so a host can put the map wherever it already has room. The
 * delivery modal gives it the whole left pane it was already showing a map in.
 *
 * It is live rather than confirm-and-close: every time the map settles, the
 * centre is geocoded and handed up. The pin stays fixed at the centre and the
 * map moves under it, which is the same interaction the dialog used.
 */
export function LocationPicker({
  googleMapsKey,
  isEn,
  initialCoords,
  initialAddress,
  onChange,
  className,
}: {
  googleMapsKey: string;
  isEn: boolean;
  initialCoords?: {lat: number; lng: number} | null;
  initialAddress?: string;
  onChange: (res: {address: string; city: string; lat: number; lng: number}) => void;
  className?: string;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const mapObjRef = useRef<any>(null);
  const [isSdkLoaded, setIsSdkLoaded] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [preview, setPreview] = useState(initialAddress || '');

  /**
   * The callback is held in a ref rather than listed as an effect dependency.
   * A parent that passes an inline arrow function would otherwise tear the map
   * down and rebuild it on every keystroke in the form beside it.
   */
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if ((window as any).google?.maps) {
      setIsSdkLoaded(true);
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>('script[data-gmaps-sdk]');
    if (existing) {
      existing.addEventListener('load', () => setIsSdkLoaded(true));
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsKey}&libraries=places&language=${isEn ? 'en' : 'ar'}`;
    script.async = true;
    script.defer = true;
    script.dataset.gmapsSdk = 'true';
    script.onload = () => setIsSdkLoaded(true);
    document.head.appendChild(script);
  }, [googleMapsKey, isEn]);

  useEffect(() => {
    if (!isSdkLoaded || !mapRef.current) return;
    const google = (window as any).google;
    const start = initialCoords || {lat: 24.7136, lng: 46.6753};

    const map = new google.maps.Map(mapRef.current, {
      center: start,
      zoom: initialCoords ? 16 : 13,
      disableDefaultUI: true,
      zoomControl: true,
    });
    mapObjRef.current = map;

    const geocoder = new google.maps.Geocoder();

    const resolve = (lat: number, lng: number) => {
      setIsResolving(true);
      geocoder.geocode({location: {lat, lng}}, (results: any, status: any) => {
        let address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        let city = '';
        if (status === 'OK' && results?.[0]) {
          const res = results[0];
          address = res.formatted_address;
          const cityComp = res.address_components.find(
            (c: any) =>
              c.types.includes('locality') ||
              c.types.includes('administrative_area_level_2') ||
              c.types.includes('administrative_area_level_1') ||
              c.types.includes('sublocality'),
          );
          if (cityComp) city = cityComp.long_name;
        }
        setPreview(address);
        setIsResolving(false);
        onChangeRef.current({address, city, lat, lng});
      });
    };

    const idleListener = map.addListener('idle', () => {
      const c = map.getCenter();
      if (c) resolve(c.lat(), c.lng());
    });

    let placeListener: any = null;
    if (searchRef.current) {
      const autocomplete = new google.maps.places.Autocomplete(searchRef.current);
      autocomplete.bindTo('bounds', map);
      placeListener = autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.geometry?.location) {
          map.setCenter(place.geometry.location);
          map.setZoom(17);
        }
      });
    }

    return () => {
      google.maps.event.removeListener(idleListener);
      if (placeListener) google.maps.event.removeListener(placeListener);
      google.maps.event.clearInstanceListeners(map);
      mapObjRef.current = null;
    };
    // `initialCoords` is read once, on purpose: re-centring the map while the
    // shopper is panning it would fight them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSdkLoaded]);

  const locateMe = () => {
    if (!navigator.geolocation || !mapObjRef.current) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      mapObjRef.current.setCenter({lat: pos.coords.latitude, lng: pos.coords.longitude});
      mapObjRef.current.setZoom(17);
    });
  };

  return (
    <div className={`relative w-full h-full bg-gray-100 ${className || ''}`}>
      <div ref={mapRef} className="absolute inset-0 z-0" />

      <div className="absolute top-4 inset-x-4 z-[5] flex gap-2">
        <div className="flex-1 relative bg-white rounded-2xl shadow-lg border-2 border-[#234745]/5 overflow-hidden">
          <input
            ref={searchRef}
            type="text"
            placeholder={isEn ? 'Search for location...' : 'ابحث عن موقع...'}
            className="w-full h-12 px-4 text-[14px] font-bold text-gray-700 outline-none bg-transparent"
          />
        </div>
        <button
          type="button"
          onClick={locateMe}
          title={isEn ? 'Use my location' : 'استخدم موقعي'}
          className="w-12 h-12 bg-white rounded-2xl shadow-lg flex items-center justify-center text-[#234745] shrink-0 border-2 border-[#234745]/5 active:scale-95 transition-transform"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z" />
          </svg>
        </button>
      </div>

      {/* The pin does not move; the map moves under it. */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-[4]">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="#234745" stroke="#fff" strokeWidth="1.5">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
          <circle cx="12" cy="10" r="3" fill="#fff" stroke="none" />
        </svg>
      </div>

      <div className="absolute bottom-4 inset-x-4 z-[5] bg-white rounded-2xl shadow-lg px-4 py-3 border-2 border-[#234745]/5">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
          {isEn ? 'Delivering to' : 'التوصيل إلى'}
        </p>
        <p className="text-[13px] font-bold text-[#234745] line-clamp-2">
          {isResolving ? (isEn ? 'Locating...' : 'جاري التحديد...') : preview || (isEn ? 'Move the map to set your location' : 'حرّك الخريطة لتحديد موقعك')}
        </p>
      </div>
    </div>
  );
}
