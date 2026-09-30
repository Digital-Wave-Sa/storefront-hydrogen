/**
 * Mobile number with a country-code picker — the same rules as login.
 *
 * The address form used to take any text («444» saved fine), so orders could
 * carry a phone the courier cannot call. This field uses the login page's
 * picker and validator (~/lib/country-codes, ~/lib/phone-validation): the
 * shopper picks the country, types the local number (05XXXXXXXX for Saudi,
 * 07XXXXXXXX for Jordan…), and the form posts one full number, +9665XXXXXXXX.
 *
 * Controlled by the parent so the parent can refuse to submit while
 * `validatePhoneNumber(local, countryCode)` is not valid.
 */
import {COUNTRY_CODES} from '~/lib/country-codes';
import {sanitizePhoneInput, validatePhoneNumber} from '~/lib/phone-validation';

export function localPlaceholder(countryCode: string): string {
  if (countryCode === '+966' || countryCode === '+971') return '05XXXXXXXX';
  if (countryCode === '+962') return '07XXXXXXXX';
  return 'XXXXXXXX';
}

export function PhoneField({
  name,
  countryCode,
  local,
  onChange,
  isEn,
  error,
}: {
  /** Name of the hidden input that carries the full number. */
  name: string;
  countryCode: string;
  local: string;
  onChange: (next: {countryCode: string; local: string}) => void;
  isEn: boolean;
  /** Shown under the field; the parent decides when (e.g. after a submit). */
  error?: string | null;
}) {
  const check = validatePhoneNumber(local, countryCode);
  const shortCodes =
    countryCode === '+966' || countryCode === '+971' || countryCode === '+962';

  return (
    <div>
      {/* The full number, e.g. +966501234567 — what the server stores. */}
      <input
        type="hidden"
        name={name}
        value={check.isValid ? check.fullPhone : `${countryCode}${local}`}
      />
      <div
        className={`account-input account-phone${error ? ' is-invalid' : ''}`}
        dir="ltr"
      >
        <div className="account-phone__code">
          <span aria-hidden="true">{countryCode}</span>
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true">
            <path
              d="M1 1L5 5L9 1"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <select
            aria-label={isEn ? 'Country code' : 'رمز الدولة'}
            value={countryCode}
            onChange={(e) =>
              onChange({
                countryCode: e.target.value,
                local: sanitizePhoneInput(local, e.target.value),
              })
            }
          >
            {COUNTRY_CODES.map((c) => (
              <option key={`${c.code}-${c.dialCode}`} value={c.dialCode}>
                {c.flag} {c.dialCode} ({isEn ? c.nameEn : c.nameAr})
              </option>
            ))}
          </select>
        </div>
        <div className="account-phone__divider" aria-hidden="true" />
        <input
          className="account-phone__number"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          aria-label={isEn ? 'Mobile number' : 'رقم الجوال'}
          aria-invalid={error ? true : undefined}
          maxLength={shortCodes ? (local.startsWith('0') ? 10 : 9) : 15}
          placeholder={localPlaceholder(countryCode)}
          value={local}
          onChange={(e) =>
            onChange({
              countryCode,
              local: sanitizePhoneInput(e.target.value, countryCode),
            })
          }
          required
        />
      </div>
      {error && (
        <p role="alert" className="account-phone__error">
          {error}
        </p>
      )}
    </div>
  );
}
