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
import {useState, useEffect, useRef, useCallback, useMemo} from 'react';
import type {AddressFragment} from 'storefrontapi.generated';
import {useFetcher, useRouteLoaderData} from 'react-router';
import {Button} from '~/components/layout/Button';
import {addressCoords, stripCoordsMarker} from '~/lib/address-coords';
import {formatGeocode} from '~/lib/geocode-format';
import {
  checkCoverage,
  coverageBranches,
  type Coverage,
} from '~/lib/delivery-coverage';
import {useAdminLocations} from '~/lib/locations-meta';
import {loadGoogleMaps} from '~/lib/google-maps-loader';
import {PointMap} from '~/components/PointMap';
import {PhoneField} from '~/components/PhoneField';
import {parsePhoneCountry} from '~/lib/country-codes';
import {validatePhoneNumber} from '~/lib/phone-validation';
import type {ActionResponse} from '~/routes/($locale).account.addresses';
import {
  ADDRESS_TYPES,
  addressTypeFor,
  addressTypeLabel,
  type AddressType,
} from '~/lib/address-types';
import {rememberAddressType, useAddressTypes} from '~/lib/use-address-types';
import {AddressTypeIcon} from '~/components/AddressTypeIcon';

export function AddressForm({
  type,
  address,
  isDefault,
  googleMapsKey,
  isEn,
  showHeading = true,
  mode = 'standalone',
  location = null,
  recipient = null,
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
  location?: {
    address: string;
    city: string;
    lat: number;
    lng: number;
    countryCode?: string;
    zip?: string;
  } | null;
  /**
   * The signed-in customer, to fill a NEW address's name and mobile so they
   * are not typed again for every address. Almost every address is the
   * customer's own; ordering for someone else is one tap on «تعديل».
   */
  recipient?: {firstName?: string | null; lastName?: string | null; phone?: string | null} | null;
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
        rememberAddressType(addr.id, (addr as any).addressType ?? addrType);
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

  /**
   * The phone as login takes it: country code + local number, validated
   * before the form can be sent (see PhoneField). A saved +9665XXXXXXXX
   * opens as +966 / 5XXXXXXXX.
   */
  /**
   * شقة / منزل / مكتب — see ~/lib/address-types. Always one of the three:
   * «منزل» is pre-selected (decided 1 Oct 2026), so every saved address has a
   * type without an extra tap. An existing address opens on the type it was
   * saved with; the saved types arrive a moment after the form opens, so they
   * replace the default then, unless the shopper already chose.
   */
  const savedTypes = useAddressTypes();
  const [addrType, setAddrType] = useState<AddressType>(
    () => (address?.id ? addressTypeFor(savedTypes, address.id) : null) || 'house',
  );
  const typeTouched = useRef(false);
  useEffect(() => {
    if (typeTouched.current || !address?.id) return;
    const saved = addressTypeFor(savedTypes, address.id);
    if (saved) setAddrType(saved);
  }, [savedTypes, address?.id]);

  /**
   * The recipient's name. A new address starts with the customer's own name
   * and shows it as one line — «المستلم: معتصم عودة» — instead of two empty
   * boxes to fill every time. «تعديل» opens the boxes for an order going to
   * someone else. An empty name always shows the boxes.
   */
  const [firstName, setFirstName] = useState(
    address?.firstName ?? recipient?.firstName ?? '',
  );
  const [lastName, setLastName] = useState(
    address?.lastName ?? recipient?.lastName ?? '',
  );
  const [editingName, setEditingName] = useState(
    () => !(String(firstName).trim() && String(lastName).trim()),
  );

  const [phone, setPhone] = useState(() => {
    const parsed = parsePhoneCountry(address?.phone ?? recipient?.phone ?? '');
    return {countryCode: parsed.countryCode, local: parsed.localNumber.replace(/\D/g, '')};
  });
  const [phoneError, setPhoneError] = useState<string | null>(null);

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
  const [countryCode, setCountryCode] = useState('');
  const [zip, setZip] = useState(address?.zip ?? '');
  /** Only a location picked in this form is checked; editing a name is not. */
  const [locationTouched, setLocationTouched] = useState(type === 'create');
  const coverage = useCoverage(coords, countryCode, isEn);
  const outOfArea =
    locationTouched &&
    (coverage.status === 'out-of-range' || coverage.status === 'outside-country');

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
    setCountryCode(location.countryCode || '');
    if (location.zip) setZip(location.zip);
    setLocationTouched(true);
    setIsValidated(true);
  }, [mode, location]);

  const handleLocationConfirm = (result: any) => {
    setAddressLine1(result.address);
    if (result.city) setCity(result.city);
    setCoords({lat: result.lat, lng: result.lng});
    setCountryCode(result.countryCode || '');
    if (result.zip) setZip(result.zip);
    setLocationTouched(true);

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
        const line = formatGeocode(data.results, isEn);
        if (line) {
          setAddressLine1(line.address);
          if (line.city) setCity(line.city);
          setCountryCode(line.countryCode);
          if (line.zip) setZip(line.zip);
          setCoords({lat: latitude, lng: longitude});
          setLocationTouched(true);
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
      const line = formatGeocode(data.results, isEn);
      const loc = data.results?.[0]?.geometry?.location;
      if (line) {
        setAddressLine1(line.address);
        if (line.city) setCity(line.city);
        setCountryCode(line.countryCode);
        if (line.zip) setZip(line.zip);
        if (loc) setCoords({lat: loc.lat, lng: loc.lng});
        setLocationTouched(true);
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
          onSubmit={(e) => {
            const check = validatePhoneNumber(phone.local, phone.countryCode);
            if (!check.isValid) {
              e.preventDefault();
              setPhoneError((isEn ? check.errorEn : check.errorAr) || null);
            }
          }}
        >
          <input type="hidden" name="addressId" value={address?.id ?? 'new'} />
          <input type="hidden" name="lat" value={coords?.lat ?? ''} />
          <input type="hidden" name="lng" value={coords?.lng ?? ''} />
          {/* From the map; checkout pre-fills it instead of asking. */}
          <input type="hidden" name="zip" value={zip} />
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

          {/* Address type: شقة / منزل / مكتب */}
          <input type="hidden" name="addressType" value={addrType} />
          <div style={{marginBottom: '20px'}}>
            <span className="account-field-label" id="address-type-label">
              {isEn ? 'Address type' : 'نوع العنوان'}
            </span>
            <div
              role="radiogroup"
              aria-labelledby="address-type-label"
              className="flex flex-wrap gap-2"
            >
              {ADDRESS_TYPES.map((t) => {
                const active = addrType === t;
                return (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => {
                      typeTouched.current = true;
                      setAddrType(t);
                    }}
                    className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border text-[13px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#234745] ${
                      active
                        ? 'bg-[#234745] border-[#234745] text-white'
                        : 'bg-white border-[#E3E0DA] text-[#234745] hover:border-[#9FB7AE]'
                    }`}
                  >
                    <AddressTypeIcon type={t} size={16} />
                    {addressTypeLabel(t, isEn)}
                  </button>
                );
              })}
            </div>
          </div>

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
                  {/* Pans between places instead of reloading an embed iframe. */}
                  <PointMap
                    googleMapsKey={googleMapsKey}
                    isEn={isEn}
                    point={coords}
                    // The saved address, not the field being typed in: a
                    // live value would ask Google on every keystroke.
                    query={
                      coords || !address?.address1
                        ? undefined
                        : [address.address1, address.city, 'Saudi Arabia']
                            .filter(Boolean)
                            .join(', ')
                    }
                    zoom={16}
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
            {isValidated && locationTouched && (
              <CoverageNote coverage={coverage} isEn={isEn} className="mt-3" />
            )}
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
              {isValidated && (
                <CoverageNote coverage={coverage} isEn={isEn} className="mt-2" />
              )}
            </div>
          )}

          {editingName ? (
            <div className="account-form-grid">
              <div>
                <label className="account-field-label" htmlFor="address-first-name">
                  {isEn ? 'First name' : 'الاسم الأول'}
                </label>
                <input
                  id="address-first-name"
                  name="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="account-input"
                  autoComplete="given-name"
                  required
                />
              </div>
              <div>
                <label className="account-field-label" htmlFor="address-last-name">
                  {isEn ? 'Last name' : 'الاسم الأخير'}
                </label>
                <input
                  id="address-last-name"
                  name="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="account-input"
                  autoComplete="family-name"
                  required
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[#E3E0DA] bg-white px-4 py-3">
              <input type="hidden" name="firstName" value={firstName} />
              <input type="hidden" name="lastName" value={lastName} />
              <span className="text-[14px] text-[#234745] min-w-0 truncate">
                <span className="text-[#8BA19C]">{isEn ? 'Recipient: ' : 'المستلم: '}</span>
                <strong>{`${firstName} ${lastName}`.trim()}</strong>
              </span>
              <button
                type="button"
                onClick={() => setEditingName(true)}
                className="shrink-0 text-[13px] font-bold text-[#906B51] underline underline-offset-2"
              >
                {isEn ? 'Edit' : 'تعديل'}
              </button>
            </div>
          )}

          <div style={{marginTop: '20px'}}>
            <label className="account-field-label">
              {isEn ? 'Address (street, district)' : 'العنوان (الشارع، الحي)'}
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
            <label className="account-field-label">{isEn ? 'City' : 'المدينة'}</label>
            <input
              name="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="account-input"
              required
            />
          </div>

          <div style={{marginTop: '20px'}}>
            <label className="account-field-label">
              {isEn ? 'Mobile number' : 'رقم الجوال'}
            </label>
            <PhoneField
              name="phone"
              countryCode={phone.countryCode}
              local={phone.local}
              onChange={(next) => {
                setPhone(next);
                setPhoneError(null);
              }}
              isEn={isEn}
              error={phoneError}
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
              {isEn ? 'Set as default address' : 'تعيين كعنوان افتراضي'}
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
              disabled={
                isLoading || (!isValidated && type === 'create') || outOfArea
              }
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
    countryCode?: string;
    zip?: string;
  }) => void;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const mapObjRef = useRef<any>(null);
  const defaultLoc = initialCoords || {lat: 24.7136, lng: 46.6753}; // Default or current
  const [address, setAddress] = useState(initialAddress || '');
  const [city, setCity] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [zip, setZip] = useState('');
  const [coords, setCoords] = useState<{lat: number; lng: number}>(defaultLoc);
  const [isResolving, setIsResolving] = useState(false);
  const [isSdkLoaded, setIsSdkLoaded] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const userLocation = useUserLocation(isEn);
  const coverage = useCoverage(coords, countryCode, isEn);
  const cannotDeliver =
    coverage.status === 'out-of-range' || coverage.status === 'outside-country';

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps(googleMapsKey, isEn ? 'en' : 'ar')
      .then(() => !cancelled && setIsSdkLoaded(true))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [googleMapsKey, isEn]);

  useEffect(() => {
    if (!isSdkLoaded || !mapRef.current) return;

    const map = new (window as any).google.maps.Map(mapRef.current, {
      center: defaultLoc,
      zoom: initialCoords ? 16 : 15,
      disableDefaultUI: true,
      zoomControl: false,
      // One finger moves the map. Inside a modal the default ('auto' ->
      // cooperative on phones) asks for two fingers and a one-finger drag
      // scrolls the sheet instead, so the map felt impossible to move.
      gestureHandling: 'greedy',
    });
    mapObjRef.current = map;

    const geocoder = new (window as any).google.maps.Geocoder();
    const autocomplete = new (window as any).google.maps.places.Autocomplete(
      searchRef.current!,
    );
    autocomplete.bindTo('bounds', map);

    const resolveAddress = (lat: number, lng: number) => {
      setIsResolving(true);
      setCoords({lat, lng});
      geocoder.geocode({location: {lat, lng}}, (results: any, status: any) => {
        const line = status === 'OK' ? formatGeocode(results, isEn) : null;
        if (line) {
          setAddress(line.address);
          setCity(line.city);
          setCountryCode(line.countryCode);
          setZip(line.zip);
        } else {
          setAddress((prev) => prev || `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        }
        setIsResolving(false);
      });
    };

    /**
     * Look the address up only when the centre has really moved.
     *
     * `idle` also fires when the map is merely RESIZED, and the footer below
     * it changed height between the loading bar and the two-line address —
     * which resized the map, which fired `idle`, which started another lookup,
     * which swapped the footer back: an endless loop, seen as blinking, and a
     * paid Geocoding request on every turn of it.
     */
    let last: {lat: number; lng: number} | null = null;
    const resolveIfMoved = (lat: number, lng: number) => {
      if (last && Math.abs(last.lat - lat) < 1e-5 && Math.abs(last.lng - lng) < 1e-5) {
        return;
      }
      last = {lat, lng};
      resolveAddress(lat, lng);
    };

    // Initial center pick
    resolveIfMoved(defaultLoc.lat, defaultLoc.lng);

    map.addListener('dragstart', () => setIsMoving(true));
    map.addListener('idle', () => {
      setIsMoving(false);
      const center = map.getCenter();
      if (center) {
        resolveIfMoved(center.lat(), center.lng());
      }
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.geometry?.location) {
        map.setCenter(place.geometry.location);
        map.setZoom(17);
      }
    });

    /**
     * Where the shopper is, as a blue dot.
     *
     * With no saved pin the map opens on them (the browser asks once); with a
     * saved pin it stays on the address and the dot only appears if location
     * access was already granted, so editing an address never prompts.
     */
    userLocation.showOnOpen(map, !initialCoords);

    return () => {
      (window as any).google.maps.event.clearInstanceListeners(map);
      mapObjRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          <LocateButton
            isEn={isEn}
            locating={userLocation.locating}
            onClick={() => userLocation.locate(mapObjRef.current)}
          />
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
          <LocateError
            message={userLocation.error}
            onDismiss={userLocation.clearError}
            className="top-20"
          />

          {/*
            The pin's TIP marks the spot, so the pin sits above the centre, not
            on it: centred, its head covered the very point being chosen — and
            the blue "you are here" dot with it. It lifts while the map is being
            dragged and settles when it stops, instead of bouncing for ever.
          */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-[4]">
            <div
              className={`flex flex-col items-center transition-transform duration-200 ${isMoving ? '-translate-y-2' : ''}`}
            >
              <div className="w-10 h-10 bg-[#234745] rounded-full border-4 border-white shadow-xl flex items-center justify-center">
                <div className="w-2 h-2 bg-yellow-400 rounded-full" />
              </div>
              <div className="w-1 h-3 bg-[#234745] rounded-b-full -mt-0.5" />
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
              {/* Fixed height, loading or not, so the map above never resizes. */}
              <div className="flex-1 min-h-[76px]">
                {isResolving ? (
                  <div className="h-4 w-2/3 bg-gray-100 rounded animate-pulse mt-1" />
                ) : (
                  <p className="text-[14px] font-bold text-gray-800 leading-snug line-clamp-2">
                    {address ||
                      (isEn
                        ? 'Move the map to select address'
                        : 'حرك الخريطة لتحديد العنوان')}
                  </p>
                )}
                {!isResolving && (
                  <CoverageNote coverage={coverage} isEn={isEn} className="mt-2" />
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={!coords || isResolving || cannotDeliver}
            onClick={() =>
              coords &&
              onConfirm({
                address:
                  address || `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`,
                // No invented city: the form asks for it when the map has none.
                city,
                countryCode,
                zip,
                ...coords,
              })
            }
            className={`w-full py-4 rounded-2xl font-bold text-[15px] shadow-lg transition-all ${!coords || isResolving || cannotDeliver ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-[#234745] text-white hover:bg-[#153125] active:scale-[0.98] shadow-[#234745]/20'}`}
          >
            {cannotDeliver
              ? isEn
                ? 'We don’t deliver here'
                : 'لا نوصل إلى هذا الموقع'
              : isEn
                ? 'Confirm Location'
                : 'تأكيد الموقع'}
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
  stacked = false,
}: {
  googleMapsKey: string;
  isEn: boolean;
  initialCoords?: {lat: number; lng: number} | null;
  initialAddress?: string;
  /**
   * Phones: the map gets its own height and no card floats over it. In a
   * 260px box the search bar, an error and the card covered almost the whole
   * map; the address and coverage show in the form below instead.
   */
  stacked?: boolean;
  onChange: (res: {
    address: string;
    city: string;
    lat: number;
    lng: number;
    countryCode?: string;
    zip?: string;
  }) => void;
  className?: string;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const mapObjRef = useRef<any>(null);
  const [isSdkLoaded, setIsSdkLoaded] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [preview, setPreview] = useState(initialAddress || '');
  const [pin, setPin] = useState<{lat: number; lng: number} | null>(
    initialCoords || null,
  );
  const [countryCode, setCountryCode] = useState('');
  const userLocation = useUserLocation(isEn);
  const coverage = useCoverage(pin, countryCode, isEn);

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
    let cancelled = false;
    loadGoogleMaps(googleMapsKey, isEn ? 'en' : 'ar')
      .then(() => !cancelled && setIsSdkLoaded(true))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [googleMapsKey, isEn]);

  useEffect(() => {
    if (!isSdkLoaded || !mapRef.current) return;
    const google = (window as any).google;
    const start = initialCoords || {lat: 24.7136, lng: 46.6753};

    const map = new google.maps.Map(mapRef.current, {
      center: start,
      zoom: initialCoords ? 16 : 13,
      disableDefaultUI: true,
      // Zoom buttons only where there is room; phones pinch.
      zoomControl: !stacked,
      // See MapPickerDialog: one finger moves the map inside the sheet.
      gestureHandling: 'greedy',
    });
    mapObjRef.current = map;

    const geocoder = new google.maps.Geocoder();

    const resolve = (lat: number, lng: number) => {
      setIsResolving(true);
      geocoder.geocode({location: {lat, lng}}, (results: any, status: any) => {
        const line = status === 'OK' ? formatGeocode(results, isEn) : null;
        const address = line?.address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        const city = line?.city || '';
        const code = line?.countryCode || '';
        setPreview(address);
        setPin({lat, lng});
        setCountryCode(code);
        setIsResolving(false);
        onChangeRef.current({address, city, lat, lng, countryCode: code, zip: line?.zip || ''});
      });
    };

    // Same guard as the dialog: a resize is not a move.
    let last: {lat: number; lng: number} | null = null;
    const idleListener = map.addListener('idle', () => {
      const c = map.getCenter();
      if (!c) return;
      const lat = c.lat();
      const lng = c.lng();
      if (last && Math.abs(last.lat - lat) < 1e-5 && Math.abs(last.lng - lng) < 1e-5) {
        return;
      }
      last = {lat, lng};
      resolve(lat, lng);
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

    userLocation.showOnOpen(map, !initialCoords);

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

  const addressCard = (
    <div
      className={
        stacked
          ? 'bg-white rounded-2xl px-4 py-3 border-2 border-[#234745]/5 mt-3'
          : 'absolute bottom-4 inset-x-4 z-[5] bg-white rounded-2xl shadow-lg px-4 py-3 border-2 border-[#234745]/5'
      }
    >
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
        {isEn ? 'Delivering to' : 'التوصيل إلى'}
      </p>
      <p className="text-[13px] font-bold text-[#234745] line-clamp-2">
        {isResolving ? (isEn ? 'Locating...' : 'جاري التحديد...') : preview || (isEn ? 'Move the map to set your location' : 'حرّك الخريطة لتحديد موقعك')}
      </p>
      {!isResolving && pin && (
        <CoverageNote coverage={coverage} isEn={isEn} className="mt-1.5" />
      )}
    </div>
  );

  const mapArea = (
    <div
      className={
        stacked
          ? 'relative w-full h-[320px] bg-gray-100 rounded-2xl overflow-hidden border-2 border-gray-100'
          : `relative w-full h-full bg-gray-100 ${className || ''}`
      }
    >
      <div ref={mapRef} className="absolute inset-0 z-0" />

      {/*
        Full-height map (the delivery modal's map pane): the modal's close
        button (.dpm-close — 40px, 24px from the top and the inline end) sits
        over this corner. The row used to run under it, so the ✕ covered the
        end of the search box and hid the «my location» button entirely. It
        now stops short of the button: 24 + 40 + 12px of air.
      */}
      <div
        className={`absolute z-[5] flex gap-2 ${
          stacked ? 'top-3 inset-x-3' : 'top-4 start-4 end-[76px]'
        }`}
      >
        <div className="flex-1 relative bg-white rounded-2xl shadow-lg border-2 border-[#234745]/5 overflow-hidden">
          <input
            ref={searchRef}
            type="text"
            placeholder={isEn ? 'Search for location...' : 'ابحث عن موقع...'}
            className={`w-full px-4 text-[14px] font-bold text-gray-700 outline-none bg-transparent ${stacked ? 'h-11' : 'h-12'}`}
          />
        </div>
        <LocateButton
          isEn={isEn}
          locating={userLocation.locating}
          onClick={() => userLocation.locate(mapObjRef.current)}
          compact={stacked}
        />
      </div>

      {/* Errors sit at the bottom of the map, clear of the pin and the search. */}
      <LocateError
        message={userLocation.error}
        onDismiss={userLocation.clearError}
        className={stacked ? 'bottom-3' : 'top-20'}
      />

      {/* The pin does not move; the map moves under it. */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-[4]">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="#234745" stroke="#fff" strokeWidth="1.5">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
          <circle cx="12" cy="10" r="3" fill="#fff" stroke="none" />
        </svg>
      </div>

      {!stacked && addressCard}
    </div>
  );

  // Stacked (phones): the form under the map already shows the chosen
  // address and its coverage («الموقع المحدد»), so the map adds no card of
  // its own -- two identical cards read as a bug.
  if (!stacked) return mapArea;
  return <div className={className || ''}>{mapArea}</div>;
}

/* ── Shared by both maps ───────────────────────────────────────────────────── */

/** Coverage for a point, against the branch list every page already caches. */
function useCoverage(
  point: {lat: number; lng: number} | null | undefined,
  countryCode: string,
  isEn: boolean,
): Coverage {
  const locations = useAdminLocations();
  const branches = useMemo(
    () => coverageBranches(locations, isEn),
    [locations, isEn],
  );
  return useMemo(
    () => checkCoverage(point, branches, countryCode),
    [point, branches, countryCode],
  );
}

/**
 * «يوصل من فرع العليا · 20 ر.س» or «خارج نطاق التوصيل», under the address.
 * Nothing while the branch list is still loading: silence is better than a
 * wrong answer.
 */
function CoverageNote({
  coverage,
  isEn,
  className = '',
}: {
  coverage: Coverage;
  isEn: boolean;
  className?: string;
}) {
  /**
   * The fee is the one checkout charges: Shopify's standard rate, read live by
   * root — the same number the cart shows. NOT the branch's
   * `custom.delivery_fee` metafield (25 on most branches), which checkout has
   * never charged; the cart stopped quoting it for exactly that reason.
   */
  const root = useRouteLoaderData('root') as any;
  const liveFee =
    root?.deliveryRateLive && typeof root?.standardDeliveryFee === 'number'
      ? (root.standardDeliveryFee as number)
      : null;
  const freeOver =
    root?.deliveryRateLive && typeof root?.standardFreeDeliveryThreshold === 'number'
      ? (root.standardFreeDeliveryThreshold as number)
      : null;

  if (coverage.status === 'unknown') return null;

  if (coverage.status === 'ok') {
    const {branch} = coverage;
    const feeText =
      liveFee === null
        ? ''
        : liveFee === 0
          ? isEn
            ? ' · free delivery'
            : ' · توصيل مجاني'
          : isEn
            ? ` · ${liveFee} SAR delivery${freeOver ? `, free over ${freeOver} SAR` : ''}`
            : ` · رسوم التوصيل ${liveFee} ر.س${freeOver ? `، مجاناً للطلبات فوق ${freeOver} ر.س` : ''}`;
    return (
      <p
        role="status"
        className={`flex items-start gap-1.5 text-[12px] font-bold text-[#2E7D5B] leading-snug ${className}`}
      >
        <span aria-hidden className="mt-1 inline-block w-2 h-2 shrink-0 rounded-full bg-[#2E7D5B]" />
        {isEn ? `Delivered from ${branch.name}${feeText}` : `يوصل من فرع ${branch.name}${feeText}`}
      </p>
    );
  }

  const text =
    coverage.status === 'outside-country'
      ? isEn
        ? 'We deliver inside Saudi Arabia only.'
        : 'التوصيل متاح داخل السعودية فقط.'
      : isEn
        ? `Outside our delivery area — the nearest branch, ${coverage.branch.name}, is ${Math.round(coverage.distanceKm)} km away. You can pick up from a branch instead.`
        : `خارج نطاق التوصيل — أقرب فرع (${coverage.branch.name}) يبعد ${Math.round(coverage.distanceKm)} كم. يمكنك الاستلام من الفرع بدلاً من ذلك.`;

  return (
    <p
      role="alert"
      className={`flex items-start gap-1.5 text-[12px] font-bold text-[#C0392B] leading-snug ${className}`}
    >
      <span aria-hidden className="mt-1 inline-block w-2 h-2 shrink-0 rounded-full bg-[#C0392B]" />
      {text}
    </p>
  );
}

/**
 * The shopper's own position on the map: a blue dot with its accuracy ring,
 * and the locate button's behaviour, including telling them why it failed.
 */
function useUserLocation(isEn: boolean) {
  const dotRef = useRef<any>(null);
  const ringRef = useRef<any>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(
    () => () => {
      dotRef.current?.setMap(null);
      ringRef.current?.setMap(null);
    },
    [],
  );

  const draw = useCallback((map: any, pos: GeolocationPosition) => {
    const google = (window as any).google;
    if (!map || !google?.maps) return;
    const here = {lat: pos.coords.latitude, lng: pos.coords.longitude};
    if (!dotRef.current) {
      dotRef.current = new google.maps.Marker({
        clickable: false,
        zIndex: 999,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#1A73E8',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
      });
      ringRef.current = new google.maps.Circle({
        clickable: false,
        strokeWeight: 0,
        fillColor: '#1A73E8',
        fillOpacity: 0.12,
      });
    }
    dotRef.current.setPosition(here);
    dotRef.current.setMap(map);
    ringRef.current.setCenter(here);
    ringRef.current.setRadius(Math.min(pos.coords.accuracy || 0, 300));
    ringRef.current.setMap(map);
    return here;
  }, []);

  const request = useCallback(
    (map: any, recenter: boolean, silent: boolean) => {
      if (!map) return;
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        if (!silent) {
          setError(
            isEn
              ? 'Your browser cannot share your location.'
              : 'المتصفح لا يدعم تحديد الموقع.',
          );
        }
        return;
      }
      setLocating(true);
      setError(null);
      /**
       * Two tries. The first asks for GPS precision; some phones (Samsung
       * Internet among them) count its timeout while their «Allow location?»
       * sheet is still open, so it could fail before the shopper had even
       * answered. On a timeout, ask once more without high accuracy (network
       * position, usually instant) before saying anything.
       */
      const attempt = (highAccuracy: boolean) => navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocating(false);
          const here = {lat: pos.coords.latitude, lng: pos.coords.longitude};
          // Move first: the dot is a nicety, the position is the point.
          if (recenter) {
            map.setCenter(here);
            map.setZoom(17);
          }
          try {
            draw(map, pos);
          } catch (e) {
            console.warn('[map] Could not draw the location dot:', e);
          }
        },
        (err) => {
          if (err.code === err.TIMEOUT && highAccuracy) {
            attempt(false);
            return;
          }
          setLocating(false);
          if (silent) return;
          setError(
            err.code === err.PERMISSION_DENIED
              ? isEn
                ? 'Location access is blocked. Allow it in your browser settings, or search for your address.'
                : 'الوصول إلى موقعك محظور. اسمح به من إعدادات المتصفح، أو ابحث عن عنوانك.'
              : err.code === err.TIMEOUT
                ? isEn
                  ? 'Finding your location took too long. Please try again.'
                  : 'استغرق تحديد موقعك وقتاً طويلاً. حاول مرة أخرى.'
                : isEn
                  ? 'We could not find your location. Please search for your address.'
                  : 'تعذّر تحديد موقعك. ابحث عن عنوانك بدلاً من ذلك.',
          );
        },
        highAccuracy
          ? {enableHighAccuracy: true, timeout: 20000, maximumAge: 60000}
          : {enableHighAccuracy: false, timeout: 15000, maximumAge: 300000},
      );
      attempt(true);
    },
    [draw, isEn],
  );

  // A message that stays forever covers the map; it clears itself after 6 s.
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 6000);
    return () => clearTimeout(t);
  }, [error]);

  /** The button: centre on the shopper and say so if it fails. */
  const locate = useCallback((map: any) => request(map, true, false), [request]);

  /**
   * On opening. `centre` is true when there is no saved pin to show: then the
   * map moves to the shopper (the browser asks once). Otherwise the dot is
   * drawn only when permission is already granted, so it never prompts.
   */
  const showOnOpen = useCallback(
    (map: any, centre: boolean) => {
      if (centre) {
        request(map, true, true);
        return;
      }
      const perms = (navigator as any)?.permissions;
      perms
        ?.query({name: 'geolocation'})
        .then((status: any) => {
          if (status?.state === 'granted') request(map, false, true);
        })
        .catch(() => {});
    },
    [request],
  );

  const clearError = useCallback(() => setError(null), []);

  return {locate, showOnOpen, locating, error, clearError};
}

/** A crosshair, the icon people know for "my location" — not a house. */
function LocateButton({
  isEn,
  locating,
  onClick,
  compact = false,
}: {
  isEn: boolean;
  locating: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  const label = isEn ? 'Use my current location' : 'استخدم موقعي الحالي';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={locating}
      title={label}
      aria-label={label}
      className={`${compact ? 'w-11 h-11' : 'w-12 h-12'} bg-white rounded-2xl shadow-lg flex items-center justify-center text-[#1A73E8] shrink-0 border-2 border-[#234745]/5 active:scale-95 transition-transform disabled:opacity-70`}
    >
      {locating ? (
        <span
          aria-hidden
          className="w-5 h-5 rounded-full border-2 border-[#1A73E8]/25 border-t-[#1A73E8] animate-spin"
        />
      ) : (
        <svg
          aria-hidden
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="12" cy="12" r="7" />
          <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
          <line x1="12" y1="1.5" x2="12" y2="4.5" />
          <line x1="12" y1="19.5" x2="12" y2="22.5" />
          <line x1="1.5" y1="12" x2="4.5" y2="12" />
          <line x1="19.5" y1="12" x2="22.5" y2="12" />
        </svg>
      )}
    </button>
  );
}

function LocateError({
  message,
  onDismiss,
  className = '',
}: {
  message: string | null;
  onDismiss: () => void;
  className?: string;
}) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className={`absolute inset-x-3 z-[6] flex items-start gap-3 rounded-xl bg-white px-3 py-2 shadow-lg border border-red-100 ${className}`}
    >
      <p className="flex-1 text-[12px] font-bold text-[#C0392B] leading-snug">
        {message}
      </p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Close"
        className="text-gray-400 text-xl leading-none"
      >
        &times;
      </button>
    </div>
  );
}
