import type {CustomerFragment} from 'storefrontapi.generated';
import {localeRedirect} from '~/lib/i18n';
import type {CustomerUpdateInput} from '@shopify/hydrogen/storefront-api-types';
import type {ActionFunctionArgs, LoaderFunctionArgs} from 'react-router';
import {
  data,
  redirect,
  type MetaFunction,
  useFetcher,
  useSubmit,
} from 'react-router';
import {
  Form,
  Link,
  useActionData,
  useNavigation,
  useOutletContext,
  useRouteLoaderData,
} from 'react-router';
import {Button} from '~/components/layout/Button';
import {useState, useRef, useEffect} from 'react';
import {SaadeddinApi} from '~/lib/saadeddin-api.server';
import {COUNTRY_CODES, parsePhoneCountry} from '~/lib/country-codes';
import {pageTitle} from '~/lib/seo';
export type ActionResponse = {
  error: string | null;
  customer: CustomerFragment | null;
};

export const meta: MetaFunction = ({matches}) => {
  return [{title: pageTitle(matches, 'Personal Information', 'المعلومات الشخصية')}];
};

// Loader removed to ensure instant client-side navigation using parent's OutletContext

export async function action({request, context}: ActionFunctionArgs) {
  const {session, storefront} = context;

  /*
    Every `error` this action returns is rendered to the shopper verbatim —
    `⚠️ {action.error}` near the bottom of this file, with no translation
    between. So the message has to be written for them, in their language,
    at the point it is created.

    It was not. «Customer not found», thrown in account.tsx as a note to a
    developer, reached an Arabic shopper unchanged, and so did «Method not
    allowed» and «Unauthorized». Worse, the two OTP catches below put
    `e.message ||` in FRONT of a perfectly good Arabic string, so the
    translation was only ever used for an error carrying no message at all —
    which is almost none of them.

    lib/otp-errors.ts exists because this exact mistake was caught once
    already, on the CRM's replies. The raw text belongs in the log.
  */
  const lang = storefront.i18n.language === 'EN' ? 'en' : 'ar';

  if (request.method !== 'PUT' && request.method !== 'POST') {
    return data(
      {
        error:
          lang === 'en'
            ? 'That request could not be processed.'
            : 'تعذر تنفيذ هذا الطلب.',
      },
      {status: 405},
    );
  }

  const form = await request.formData();
  const customerAccessToken = await session.get('customerAccessToken');
  if (!customerAccessToken) {
    return data(
      {
        error:
          lang === 'en'
            ? 'Please sign in again to update your profile.'
            : 'يرجى تسجيل الدخول مرة أخرى لتحديث بياناتك.',
      },
      {status: 401},
    );
  }

  try {
    const intent = form.get('intent');
    const customer: CustomerUpdateInput = {};

    if (intent === 'send-profile-otp') {
      const phone = String(form.get('phone') || '');
      try {
        const api = new SaadeddinApi(context.env);
        await api.requestOtp(phone, 'login');
        return data({success: true, otpSent: true});
      } catch (e: any) {
        console.error('[Profile] OTP send failed:', e?.message || e);
        return data(
          {
            error:
              lang === 'en'
                ? 'We could not send the verification code. Please try again.'
                : 'تعذر إرسال رمز التحقق. يرجى المحاولة مرة أخرى.',
          },
          {status: 400},
        );
      }
    }

    if (intent === 'verify-profile-otp') {
      const phone = String(form.get('phone') || '');
      const otp = String(form.get('otp') || '');

      try {
        const api = new SaadeddinApi(context.env);
        await api.verifyOtp(phone, otp, 'login');

        /**
         * Record the verified number in the session.
         *
         * The OTP flow was enforced only in the browser: the profile-save
         * branch below took whatever `phone` was posted and wrote it to
         * Shopify, so a direct POST changed the number on any signed-in
         * session without an OTP ever being sent. The check has to live
         * where the write happens.
         */
        session.set('verifiedProfilePhone', phone.replace(/\D/g, ''));

        return data(
          {success: true, verified: true},
          {headers: {'Set-Cookie': await session.commit()}},
        );
      } catch (e: any) {
        console.error('[Profile] OTP verification failed:', e?.message || e);
        return data(
          {
            error:
              lang === 'en'
                ? 'Invalid verification code.'
                : 'رمز التحقق غير صحيح.',
          },
          {status: 400},
        );
      }
    }

    /**
     * Who is being edited, resolved server-side.
     *
     * Both of this action's write paths used to start with
     * `customer(customerAccessToken:)` on the Storefront API. Under the shop's
     * new customer accounts setting that query returns null every time, so both
     * threw «Customer not found» and neither a profile edit nor an account
     * deletion could ever complete. The page itself renders because the account
     * layout already falls back to the Admin API; this action had no fallback.
     *
     * `resolveLoggedInCustomer` is the resolver /add-email and the cake builder
     * already use: the Storefront record when the token really is a Shopify
     * one, otherwise the session keys written at OTP login.
     */
    const {resolveLoggedInCustomer, saveCustomerEmail} = await import(
      '~/lib/customer-email.server'
    );
    const self = await resolveLoggedInCustomer(context);
    if (!self) {
      return data(
        {
          error:
            lang === 'en'
              ? 'We could not identify your account. Please sign in again.'
              : 'تعذر التعرف على حسابك. يرجى تسجيل الدخول مرة أخرى.',
          customer: null,
        },
        {status: 401},
      );
    }
    const customerGid = `gid://shopify/Customer/${self.numericId}`;

    const {getAdminToken, getAdminDomain} = await import(
      '~/lib/shopify-admin.server'
    );
    const adminToken = await getAdminToken(context.env);
    const adminDomain = getAdminDomain(context.env);
    if (!adminToken || !adminDomain) {
      return data(
        {
          error:
            lang === 'en'
              ? 'Profile service unavailable. Please try again shortly.'
              : 'خدمة الملف الشخصي غير متاحة حالياً. يرجى المحاولة بعد قليل.',
          customer: null,
        },
        {status: 503},
      );
    }

    if (intent === 'deleteAccount') {
      /**
       * `getAdminToken` rather than the raw env var this used to read: the shop
       * authenticates by client-credentials exchange, so
       * SHOPIFY_ADMIN_API_ACCESS_TOKEN is usually absent — and the old code
       * treated its absence as success, clearing the session and redirecting
       * while the Shopify customer stayed exactly where it was.
       */
      const response = await fetch(
        `https://${adminDomain}/admin/api/2024-01/customers/${self.numericId}.json`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': adminToken,
          },
        },
      );
      if (!response.ok) {
        throw new Error('Failed to delete account on the server.');
      }

      // The token resolves to nobody, so neither should the session --
      // clearing only the token left wallet and loyalty answering for
      // the last shopper. See ~/lib/session-identity.server.
      await (await import('~/lib/session-identity.server')).clearIdentity(session);
      return localeRedirect(request, '/', {
        headers: {
          'Set-Cookie': await session.commit(),
        },
      });
    }

    /*
      The phone is deliberately absent.

      Customers must not change their number from /account: it is the login
      identity for OTP sign-in and the key the wallet, loyalty and gift-card
      lookups hang off, so a self-service swap is an account takeover waiting
      to happen.

      Dropping it from this list is what enforces it. Hiding the field would
      not: the action reads whatever is posted, so anything short of refusing
      the value here could be worked around with a crafted request. With the
      key gone, `customer.phone` is never set, so `adminPayload.phone` below
      is never set either, and Shopify is never asked to change it.

      The `key === 'phone'` branch further down is now unreachable. It is left
      in place on purpose: re-adding 'phone' to this list is the whole of
      turning the feature back on, OTP verification and all.
    */
    const validInputKeys = ['firstName', 'lastName', 'email'] as const;

    for (const [key, value] of form.entries()) {
      if (!validInputKeys.includes(key as any)) {
        continue;
      }
      if (typeof value === 'string' && value.length) {
        if (key === 'phone') {
          const phoneInput = form.get('phone')?.toString() || '';
          const countryCode = form.get('countryCode')?.toString() || '+966';
          let cleanPhone = phoneInput.replace(/\D/g, '');
          if (cleanPhone.startsWith('00966'))
            cleanPhone = cleanPhone.substring(5);
          else if (cleanPhone.startsWith('966'))
            cleanPhone = cleanPhone.substring(3);
          else if (cleanPhone.startsWith('05'))
            cleanPhone = cleanPhone.substring(1);

          const nextPhone = `${countryCode}${cleanPhone}`;

          /**
           * A changed number needs an OTP that this server saw succeed.
           * Leaving the number as-is is not a change and needs nothing.
           */
          const currentDigits = String(
            (await session.get('loginOtpPhone')) || '',
          ).replace(/\D/g, '');
          const nextDigits = nextPhone.replace(/\D/g, '');
          const verifiedDigits = String(
            (await session.get('verifiedProfilePhone')) || '',
          ).replace(/\D/g, '');

          const isUnchanged =
            currentDigits.length > 0 && currentDigits === nextDigits;
          const isVerified =
            verifiedDigits.length > 0 &&
            (verifiedDigits === nextDigits ||
              verifiedDigits.endsWith(nextDigits) ||
              nextDigits.endsWith(verifiedDigits));

          if (!isUnchanged && !isVerified) {
            return data(
              {
                error:
                  lang === 'en'
                    ? 'Please verify the new phone number before saving.'
                    : 'يرجى تأكيد رقم الجوال الجديد قبل الحفظ.',
              },
              {status: 400},
            );
          }

          customer.phone = nextPhone;
        } else {
          customer[key as (typeof validInputKeys)[number]] = value;
        }
      }
    }

    /**
     * The email goes through the shared writer rather than this route's own
     * update, so the rules that decide what counts as an address — the format
     * check, the placeholder domain, and «already taken by someone else» — stay
     * in one place with /add-email and the checkout gates. It also keeps
     * `loginCustomerEmail` in step, which the account layout reads.
     *
     * It runs before the rest of the write so a rejected address leaves the
     * record untouched rather than half-saved.
     */
    const {isPlaceholderEmail} = await import('~/lib/needs-email');
    const nextEmail = String(customer.email || '').trim();

    /**
     * A placeholder address posted back unchanged is not an edit.
     *
     * OTP-only customers are given `<phone>@saadeddin.placeholder`, and the
     * field above shows it, so it is posted with every save. `saveCustomerEmail`
     * rightly refuses to WRITE a placeholder — without this guard, a customer
     * who only wanted to correct their name would be told their email is
     * invalid and nothing at all would save.
     */
    if (
      nextEmail &&
      !isPlaceholderEmail(nextEmail) &&
      nextEmail.toLowerCase() !== String(self.currentEmail || '').toLowerCase()
    ) {
      const emailResult = await saveCustomerEmail(
        context,
        self.numericId,
        nextEmail,
      );
      if (!emailResult.ok) {
        const message =
          emailResult.code === 'in_use'
            ? lang === 'en'
              ? 'That email address is already used by another account.'
              : 'هذا البريد الإلكتروني مستخدم في حساب آخر.'
            : emailResult.code === 'invalid_format'
              ? lang === 'en'
                ? 'Please enter a valid email address.'
                : 'يرجى إدخال بريد إلكتروني صحيح.'
              : lang === 'en'
                ? 'We could not save your email. Please try again.'
                : 'تعذر حفظ البريد الإلكتروني. يرجى المحاولة مرة أخرى.';
        return data({error: message, customer: null}, {status: 400});
      }
    }

    const birthdateStr = String(form.get('birthdate') || '').trim();
    if (birthdateStr) {
      // 1. Sync with Shopify Admin API via GraphQL metafieldsSet
      try {
        const res = await fetch(
          `https://${adminDomain}/admin/api/2024-01/graphql.json`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Shopify-Access-Token': adminToken,
            },
            body: JSON.stringify({
              query: `
                  mutation setMetafield($metafields: [MetafieldsSetInput!]!) {
                    metafieldsSet(metafields: $metafields) {
                      userErrors {
                        field
                        message
                      }
                    }
                  }
                `,
              variables: {
                metafields: [
                  {
                    ownerId: customerGid,
                    namespace: 'custom',
                    key: 'birthdate',
                    value: birthdateStr,
                    type: 'date',
                  },
                ],
              },
            }),
          },
        );
        const resJson: any = await res.json();
        if (resJson.data?.metafieldsSet?.userErrors?.length > 0) {
          console.error(
            '[Profile] Admin API birthdate update userErrors:',
            resJson.data.metafieldsSet.userErrors,
          );
        }
      } catch (e) {
        console.error('Failed to sync birthdate with Shopify:', e);
      }

      // 2. Sync with Custom CRM API to drive birthday-bonus enrollment
      try {
        const saadeddinToken = await context.session.get('saadeddinToken');
        if (saadeddinToken) {
          const api = new SaadeddinApi(context.env, saadeddinToken);
          await api.updateProfile({birthDate: birthdateStr});
        }
      } catch (e) {
        console.error('Failed to sync birthdate with custom CRM:', e);
      }
    }

    /**
     * The name and phone, written through the Admin API.
     *
     * This was `storefront.mutate(customerUpdate, {customerAccessToken})`,
     * which is the other half of the same dead path as the lookup above: the
     * shop's OTP sign-in hands out its own `session-...` token, and the
     * Storefront customer mutations refuse it.
     *
     * Only keys the form actually posted are sent, so Shopify keeps whatever
     * it already holds for the rest — that is what preserves the "(Company)"
     * last name on accounts whose form does not render that field. The
     * response carries the full updated record, which is what goes back to the
     * page, so nothing here has to guess the saved shape.
     */
    const adminPayload: Record<string, unknown> = {id: Number(self.numericId)};
    if (typeof customer.firstName === 'string') {
      adminPayload.first_name = customer.firstName;
    }
    if (typeof customer.lastName === 'string') {
      adminPayload.last_name = customer.lastName;
    }
    if (typeof customer.phone === 'string') {
      adminPayload.phone = customer.phone;
    }

    const updateRes = await fetch(
      `https://${adminDomain}/admin/api/2024-01/customers/${self.numericId}.json`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': adminToken,
        },
        body: JSON.stringify({customer: adminPayload}),
      },
    );

    if (!updateRes.ok) {
      const body = (await updateRes.text().catch(() => '')).toLowerCase();
      console.error(
        `[Profile] Customer update failed for ${self.numericId} (HTTP ${updateRes.status}):`,
        body.slice(0, 300),
      );
      const phoneTaken =
        body.includes('phone') && body.includes('already been taken');
      const phoneInvalid = body.includes('phone') && body.includes('invalid');
      const message = phoneTaken
        ? lang === 'en'
          ? 'That phone number is already used by another account.'
          : 'رقم الجوال هذا مستخدم في حساب آخر.'
        : phoneInvalid
          ? lang === 'en'
            ? 'Please enter a valid phone number.'
            : 'يرجى إدخال رقم جوال صحيح.'
          : lang === 'en'
            ? 'We could not save your changes. Please try again.'
            : 'تعذر حفظ التغييرات. يرجى المحاولة مرة أخرى.';
      return data({error: message, customer: null}, {status: 400});
    }

    const updatedAdmin = ((await updateRes.json()) as any)?.customer || {};

    /**
     * Keep the session's own idea of the number in step with Shopify's.
     *
     * `loginOtpPhone` is what the check above compares against to decide
     * whether a number CHANGED, and what the account layout searches on when
     * it falls back to the Admin API. Left holding the old number, a saved
     * change would keep counting as a change, and `verifiedProfilePhone` would
     * sit there as a standing permission for that number.
     */
    if (updatedAdmin.phone) {
      session.set('loginOtpPhone', String(updatedAdmin.phone));
      session.unset('verifiedProfilePhone');
    }

    const returnedCustomer = {
      id: updatedAdmin.id ? `gid://shopify/Customer/${updatedAdmin.id}` : customerGid,
      firstName: updatedAdmin.first_name || '',
      lastName: updatedAdmin.last_name || '',
      email: updatedAdmin.email || self.currentEmail || '',
      phone: updatedAdmin.phone || '',
      acceptsMarketing: Boolean(updatedAdmin.accepts_marketing),
      birthdate: birthdateStr ? {value: birthdateStr} : null,
    };

    return data(
      {error: null, customer: returnedCustomer},
      {
        headers: {
          'Set-Cookie': await session.commit(),
        },
      },
    );
  } catch (error: any) {
    /*
      This is where «Customer not found» reached the page. It is thrown in
      account.tsx when Shopify cannot resolve the signed-in customer — true,
      useful in a log, and meaningless to the person reading it, who cannot
      act on it and is left staring at an English string on an Arabic page.
    */
    console.error('[Profile] Update failed:', error?.message || error);
    return data(
      {
        error:
          lang === 'en'
            ? 'We could not save your changes. Please try again.'
            : 'تعذر حفظ التغييرات. يرجى المحاولة مرة أخرى.',
        customer: null,
      },
      {status: 400},
    );
  }
}

function parsePhoneNumber(phone: string | null | undefined) {
  if (!phone) return {countryCode: '+966', number: ''};
  const parsed = parsePhoneCountry(phone);
  return {countryCode: parsed.countryCode, number: parsed.localNumber};
}

export default function AccountProfile() {
  const {customer: loaderCustomer} = useOutletContext<{
    customer: CustomerFragment;
  }>();
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

  // Phone and OTP states
  const originalParsed = parsePhoneNumber(customer.phone);
  const [selectedCountryCode, setSelectedCountryCode] = useState(
    originalParsed.countryCode,
  );
  const [enteredPhone, setEnteredPhone] = useState(originalParsed.number);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpValue, setOtpValue] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState<string | null>(null);

  const otpRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const fetcher = useFetcher<any>();
  const formRef = useRef<HTMLFormElement>(null);
  const submit = useSubmit();
  const isPhoneVerifiedRef = useRef(false);

  const isLocal =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1');

  // Synchronize component state if customer changes
  useEffect(() => {
    const updatedParsed = parsePhoneNumber(customer.phone);
    setSelectedCountryCode(updatedParsed.countryCode);
    setEnteredPhone(updatedParsed.number);
    isPhoneVerifiedRef.current = false;
    if (action?.customer) {
      setIsEditing(false);
    }
  }, [customer, action?.customer]);

  // Handle OTP verification result
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data && showOtpModal) {
      if (fetcher.data.verified) {
        isPhoneVerifiedRef.current = true;
        setShowOtpModal(false);
        setOtpError(null);
        setOtpValue(['', '', '', '', '', '']);
        // Complete the profile update submission using react-router's SPA submit
        if (formRef.current) {
          submit(formRef.current);
        }
      } else if (fetcher.data.error) {
        setOtpError(fetcher.data.error);
        setOtpValue(['', '', '', '', '', '']);
        otpRefs[0].current?.focus();
      }
    }
  }, [fetcher.state, fetcher.data, showOtpModal]);

  const handleOTPChange = (index: number, val: string) => {
    if (val.length > 1) val = val[val.length - 1];
    const newOtp = [...otpValue];
    newOtp[index] = val;
    setOtpValue(newOtp);
    if (val && index < 5) otpRefs[index + 1].current?.focus();
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === 'Backspace' && !otpValue[index] && index > 0)
      otpRefs[index - 1].current?.focus();
  };

  const startOtpVerification = () => {
    setOtpError(null);
    setOtpValue(['', '', '', '', '', '']);
    const fullPhone = `${selectedCountryCode}${enteredPhone}`;
    fetcher.submit(
      {intent: 'send-profile-otp', phone: fullPhone},
      {method: 'POST'},
    );
    setShowOtpModal(true);
  };

  const verifyOtpAndSubmit = () => {
    setOtpError(null);
    const fullPhone = `${selectedCountryCode}${enteredPhone}`;
    const code = otpValue.join('');
    fetcher.submit(
      {intent: 'verify-profile-otp', phone: fullPhone, otp: code},
      {method: 'POST'},
    );
  };

  const handleProfileSubmit = (_e: React.FormEvent) => {
    /*
      Nothing to intercept: the phone is read-only and the action refuses a
      posted one, so it cannot change and there is nothing to verify.

      This used to compare the field against the stored number and divert into
      OTP when they differed. Left in place it would have fired for every
      customer with NO phone on file — `customer.phone` is '' while the
      country-code default makes the comparison string '966', so the two never
      matched and saving a NAME would have opened an OTP modal for a number
      they can no longer type.

      Restoring this check, along with 'phone' in `validInputKeys` in the
      action, is what turns phone editing back on.
    */
  };

  if (!isEditing) {
    return (
      <>
        <div
          className="flex flex-col items-center w-full animate-fade-in"
          dir={isEn ? 'ltr' : 'rtl'}
        >
          <div className="bg-white border border-[#9FB7AE] rounded-[12px] p-8 flex flex-col gap-6 w-full max-w-[955px] box-border">
            {/* Missing Phone Alert */}
            {!customer.phone && (
              <div className="bg-[#FFEBEB] border border-[#FFD4D4] rounded-[16px] p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-start animate-pulse">
                <div>
                  <h4
                    className="text-[15px] font-bold text-[#D32F2F] mb-1"
                    style={{
                      fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                    }}
                  >
                    {isEn
                      ? 'Add Your Mobile Number'
                      : 'إضافة رقم الجوال الخاص بك'}
                  </h4>
                  <p
                    className="text-[13px] text-[#C62828] font-medium m-0"
                    style={{
                      fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                    }}
                  >
                    {isEn
                      ? 'Please register your phone number to secure your account and access gift cards & loyalty rewards.'
                      : 'يرجى ربط رقم الجوال الخاص بك لتأمين حسابك والاستفادة من بطاقات الهدايا ونقاط الولاء.'}
                  </p>
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-[#D32F2F] text-white text-sm font-bold px-5 py-2.5 rounded-[12px] hover:bg-[#C62828] transition-colors shrink-0"
                  style={{
                    fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                  }}
                >
                  {isEn ? 'Add Now' : 'إضافة الآن'}
                </button>
              </div>
            )}

            {/* Header */}
            <div className="flex justify-between items-center w-full">
              <h3
                className="text-[18px] font-bold text-[#171717] m-0 leading-none"
                style={{
                  fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                }}
              >
                {isEn ? 'Personal Information' : 'المعلومات الشخصية'}
              </h3>
              <button
                onClick={() => setIsEditing(true)}
                className="text-[14px] font-medium text-[#255441] underline m-0 leading-none"
                style={{
                  fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                }}
              >
                {isEn ? 'Edit' : 'تعديل'}
              </button>
            </div>

            {/* Grid */}
            <div className="flex flex-col gap-6 w-full">
              {/* Row 1 */}
              <div className="flex flex-col md:flex-row gap-6 w-full">
                <div className="flex flex-col gap-2 flex-1">
                  <span
                    className="text-[14px] font-medium text-[#171717] leading-none"
                    style={{
                      fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                    }}
                  >
                    {isEn ? 'Mobile Number' : 'رقم الجوال'}
                  </span>
                  <div
                    className="bg-[#FEF8EB] border border-[#BBCFCD] rounded-[12px] h-[48px] px-4 flex items-center"
                    dir="ltr"
                  >
                    <span
                      className="text-[14px] font-medium text-[#9FB7AE] w-full text-start md:text-end"
                      style={{
                        fontFamily:
                          "'EnglishDigits', 'GE Dinar One', sans-serif",
                        textAlign: isEn ? 'left' : 'right',
                      }}
                    >
                      {customer.phone || '-'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 flex-1">
                  <span
                    className="text-[14px] font-medium text-[#171717] leading-none"
                    style={{
                      fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                    }}
                  >
                    {isEn ? 'Full Name' : 'الإسم الكامل'}
                  </span>
                  <div className="bg-[#FEF8EB] border border-[#BBCFCD] rounded-[12px] h-[48px] px-4 flex items-center">
                    <span
                      className="text-[14px] font-medium text-[#9FB7AE]"
                      style={{
                        fontFamily:
                          "'EnglishDigits', 'GE Dinar One', sans-serif",
                      }}
                    >
                      {`${customer?.firstName || ''} ${customer?.lastName || ''}`.trim() ||
                        (isEn ? 'Valued Customer' : 'عميلنا العزيز')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 2 */}
              <div className="flex flex-col md:flex-row gap-6 w-full">
                <div className="flex flex-col gap-2 flex-1">
                  <span
                    className="text-[14px] font-medium text-[#171717] leading-none"
                    style={{
                      fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                    }}
                  >
                    {isEn ? 'Date of Birth' : 'تاريخ الميلاد'}
                  </span>
                  <div className="bg-[#FEF8EB] border border-[#BBCFCD] rounded-[12px] h-[48px] px-4 flex items-center">
                    <span
                      className="text-[14px] font-medium text-[#9FB7AE]"
                      style={{
                        fontFamily:
                          "'EnglishDigits', 'GE Dinar One', sans-serif",
                        letterSpacing: '2px',
                      }}
                    >
                      {(customer as any).birthdate?.value
                        ? (customer as any).birthdate.value.replace(/-/g, ' / ')
                        : '-'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 flex-1">
                  <span
                    className="text-[14px] font-medium text-[#171717] leading-none"
                    style={{
                      fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                    }}
                  >
                    {isEn ? 'Email' : 'البريد الإلكتروني'}
                  </span>
                  <div className="bg-[#FEF8EB] border border-[#BBCFCD] rounded-[12px] h-[48px] px-4 flex items-center">
                    <span
                      className="text-[14px] font-medium text-[#9FB7AE]"
                      style={{
                        fontFamily:
                          "'EnglishDigits', 'GE Dinar One', sans-serif",
                      }}
                    >
                      {customer.email}
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 3 */}
              <div className="flex flex-col gap-2 w-full">
                <span
                  className="text-[14px] font-medium text-[#171717] leading-none"
                  style={{
                    fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                  }}
                >
                  {isEn ? 'Preferred Language' : 'اللغة المفضلة'}
                </span>
                <div className="bg-[#FEF8EB] border border-[#BBCFCD] rounded-[12px] h-[48px] px-4 flex items-center w-full">
                  <span
                    className="text-[14px] font-medium text-[#9FB7AE]"
                    style={{
                      fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                    }}
                  >
                    {isEn ? 'English' : 'العربية'}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-[#BBCFCD] w-full my-2"></div>

            {/* Delete Button */}
            <div className="flex justify-center md:justify-start items-center !w-full md:w-auto">
              <button
                onClick={() => setShowDeleteModal(true)}
                type="button"
                className="flex items-center justify-center gap-2 border border-[#E64950] rounded-[12px] h-[48px] px-6 text-[#E64950] hover:bg-red-50 transition-colors w-full md:w-auto"
              >
                <svg
                  width="15"
                  height="16"
                  viewBox="0 0 15 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fill-rule="evenodd"
                    clip-rule="evenodd"
                    d="M2.72833 2.83333L3.405 14.2067C3.41519 14.3762 3.48967 14.5354 3.61325 14.6518C3.73683 14.7683 3.90019 14.8332 4.07 14.8333H10.0967C10.2665 14.8332 10.4298 14.7683 10.5534 14.6518C10.677 14.5354 10.7515 14.3762 10.7617 14.2067L11.4383 2.83333H2.72833ZM12.4408 2.83333L11.76 14.2658C11.7347 14.6899 11.5485 15.0883 11.2393 15.3796C10.9302 15.6709 10.5215 15.8332 10.0967 15.8333H4.07C3.64521 15.8332 3.23648 15.6709 2.92733 15.3796C2.61818 15.0883 2.43194 14.6899 2.40667 14.2658L1.72583 2.83333H0V2.25C0 2.13949 0.0438988 2.03351 0.122039 1.95537C0.200179 1.87723 0.30616 1.83333 0.416667 1.83333H13.75C13.8605 1.83333 13.9665 1.87723 14.0446 1.95537C14.1228 2.03351 14.1667 2.13949 14.1667 2.25V2.83333H12.4408ZM8.75 0C8.86051 0 8.96649 0.0438988 9.04463 0.122039C9.12277 0.200179 9.16667 0.30616 9.16667 0.416667V1H5V0.416667C5 0.30616 5.0439 0.200179 5.12204 0.122039C5.20018 0.0438988 5.30616 0 5.41667 0H8.75ZM5 5H6L6.41667 12.5H5.41667L5 5ZM8.16667 5H9.16667L8.75 12.5H7.75L8.16667 5Z"
                    fill="#E64950"
                  />
                </svg>
                <span
                  className="text-[14px] md:text-[16px] font-bold"
                  style={{
                    fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                  }}
                >
                  {isEn ? 'Delete Account Permanently' : 'حذف الحساب نهائياً'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {showDeleteModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
            dir={isEn ? 'ltr' : 'rtl'}
          >
            <div className="bg-white rounded-[24px] p-8 max-w-[480px] w-[90%] flex flex-col items-center text-center shadow-xl">
              <div className="w-[80px] h-[80px] bg-[#E64950] rounded-full flex items-center justify-center text-white text-[40px] font-bold mb-6">
                !
              </div>
              <h3
                className="md:!text-[18px] !text-[14px] font-bold text-[#171717] mb-2"
                style={{
                  fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                }}
              >
                {isEn
                  ? 'Are you sure you want to permanently delete the account?'
                  : 'هل انت متأكد من انك تريد حذف الحساب نهائياً؟'}
              </h3>
              <p
                className="!text-[12px] md:!text-[14px] text-[#7D7D7D] !mb-4 !font-medium"
                style={{
                  fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                }}
              >
                {isEn
                  ? 'Warning! All your data will be deleted if the account is deleted'
                  : 'انتبه! سيتم حذف جميع البيانات الخاصة بك في حال حذف الحساب'}
              </p>
              <div className="flex w-full gap-4">
                <Form method="PUT" className="w-1/2">
                  <input type="hidden" name="intent" value="deleteAccount" />
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-[#E64950] text-white rounded-full h-[48px] text-[14px] md:text-[16px] font-bold hover:bg-[#c0392b] transition-colors disabled:opacity-70"
                    style={{
                      fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                    }}
                  >
                    {isLoading
                      ? isEn
                        ? 'Deleting...'
                        : 'جاري الحذف...'
                      : isEn
                        ? 'Yes, delete'
                        : 'نعم, حذف'}
                  </button>
                </Form>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="w-1/2 bg-[#255441] text-white rounded-full h-[48px] text-[14px] md:text-[16px] font-bold hover:bg-[#1a3a2d] transition-colors"
                  style={{
                    fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                  }}
                >
                  {isEn ? 'No, go back' : 'لا, الرجوع'}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div
      className="flex flex-col items-center w-full"
      dir={isEn ? 'ltr' : 'rtl'}
    >
      <Form
        ref={formRef}
        onSubmit={handleProfileSubmit}
        method="PUT"
        className="animate-fade-in w-full max-w-[955px] box-border"
        style={{display: 'contents'}}
      >
        <div className="bg-white border border-[#9FB7AE] rounded-[12px] p-8 flex flex-col gap-6 w-full box-border">
          {/* Missing Phone Alert */}
          {!customer.phone && (
            <div className="bg-[#FFEBEB] border border-[#FFD4D4] rounded-[16px] p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-start animate-pulse">
              <div>
                <h4
                  className="text-[15px] font-bold text-[#D32F2F] mb-1"
                  style={{
                    fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                  }}
                >
                  {isEn
                    ? 'Add Your Mobile Number'
                    : 'إضافة رقم الجوال الخاص بك'}
                </h4>
                <p
                  className="text-[13px] text-[#C62828] font-medium m-0"
                  style={{
                    fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                  }}
                >
                  {isEn
                    ? 'Contact customer service to link your mobile number and access gift cards & loyalty rewards.'
                    : 'يرجى التواصل مع خدمة العملاء لربط رقم جوالك والاستفادة من بطاقات الهدايا ونقاط الولاء.'}
                </p>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="flex justify-between items-center w-full">
            <h3
              className="text-[18px] font-bold text-[#171717] m-0 leading-none"
              style={{
                fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
              }}
            >
              {isEn ? 'Personal Information' : 'المعلومات الشخصية'}
            </h3>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-[14px] font-medium text-[#255441] underline m-0 leading-none"
              style={{
                fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
              }}
            >
              {isEn ? 'Cancel' : 'إلغاء'}
            </button>
          </div>

          {/* Grid */}
          <div className="flex flex-col gap-6 w-full">
            {/* Row 1: Name */}
            <div className="flex flex-col md:flex-row gap-6 w-full">
              <div className="flex flex-col gap-2 flex-1">
                <label
                  className={`text-[14px] font-medium text-[#171717] leading-none ${!isEn && 'text-right'}`}
                  style={{
                    fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                  }}
                  htmlFor="firstName"
                >
                  {isEn
                    ? isCompany
                      ? 'Company Name'
                      : 'First Name'
                    : isCompany
                      ? 'اسم الشركة'
                      : 'الاسم الأول'}
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  placeholder={isEn ? 'First Name' : 'الاسم الأول'}
                  className="bg-white border border-[#BBCFCD] rounded-[12px] h-[48px] px-4 w-full text-[14px] font-medium text-[#171717] focus:outline-none focus:border-[#9FB7AE]"
                  style={{
                    fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                    textAlign: isEn ? 'left' : 'right',
                  }}
                  defaultValue={customer.firstName ?? ''}
                  required
                />
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <label
                  className={`text-[14px] font-medium text-[#171717] leading-none ${!isEn && 'text-right'}`}
                  style={{
                    fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                  }}
                  htmlFor="lastName"
                >
                  {isEn
                    ? isCompany
                      ? 'Company Type'
                      : 'Last Name'
                    : isCompany
                      ? 'نوع الشركة'
                      : 'اسم العائلة'}
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  placeholder={isEn ? 'Last Name' : 'اسم العائلة'}
                  className="bg-white border border-[#BBCFCD] rounded-[12px] h-[48px] px-4 w-full text-[14px] font-medium text-[#171717] focus:outline-none focus:border-[#9FB7AE]"
                  style={{
                    fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                    textAlign: isEn ? 'left' : 'right',
                  }}
                  defaultValue={customer.lastName ?? ''}
                  required
                />
              </div>
            </div>
            
            {/*
              Read-only. The number is shown because shoppers check it; it is
              not editable because it is the OTP login identity and the key the
              wallet, loyalty and gift-card lookups use. The action refuses a
              posted phone regardless — this just stops the page offering
              something it will not do.

              The missing-phone alert above used to say «please register your
              phone number», which is no longer something the customer can act
              on. It now points at the people who can.
            */}
            <div className="flex flex-col md:flex-row gap-6 w-full">
              <div className="flex flex-col gap-2 flex-1">
                <label
                  className="text-[14px] font-medium text-[#171717] leading-none"
                  style={{
                    fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                  }}
                >
                  {isEn ? 'Mobile Number' : 'رقم الجوال'}
                </label>
                <div
                  className="flex flex-row items-center border border-[#BBCFCD] bg-[#F7F7F7] rounded-[12px] h-[48px] px-4 overflow-hidden"
                  dir="ltr"
                >
                  <span
                    className="text-[14px] font-medium text-[#7D7D7D]"
                    style={{
                      fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                    }}
                  >
                    {customer.phone || '—'}
                  </span>
                </div>
                <p
                  className="text-[12px] text-[#7D7D7D] m-0"
                  style={{
                    fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                  }}
                >
                  {isEn
                    ? 'To change your mobile number, please contact customer service.'
                    : 'لتغيير رقم الجوال، يرجى التواصل مع خدمة العملاء.'}
                </p>
              </div>
            </div>

            {/* Row 2 */}
            <div className="flex flex-col md:flex-row gap-6 w-full">
              <div className="flex flex-col gap-2 flex-1">
                <label
                  className="text-[14px] font-medium text-[#171717] leading-none"
                  style={{
                    fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                  }}
                  htmlFor="email"
                >
                  {isEn ? 'Email' : 'البريد الإلكتروني'}
                </label>
                {/*
                  `dir="ltr"`: an email is a left-to-right string. Inside the
                  Arabic (RTL) form, bidi reordering rendered
                  966501234567@saadeddin.placeholder as
                  saadeddin.placeholder@966501234567 — the same address,
                  displayed back to front.
                */}
                <input
                  id="email"
                  name="email"
                  type="email"
                  dir="ltr"
                  placeholder={isEn ? 'Email' : 'البريد الإلكتروني'}
                  className="bg-white border border-[#BBCFCD] rounded-[12px] h-[48px] px-4 w-full text-[14px] font-medium text-[#171717] focus:outline-none focus:border-[#9FB7AE]"
                  style={{
                    fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                  }}
                  defaultValue={customer.email ?? ''}
                  required
                />
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <label
                  className="text-[14px] font-medium text-[#171717] leading-none"
                  style={{
                    fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                  }}
                  htmlFor="birthdate"
                >
                  {isEn ? 'Date of Birth' : 'تاريخ الميلاد'}
                </label>
                <input
                  id="birthdate"
                  name="birthdate"
                  type="date"
                  className="bg-white border border-[#BBCFCD] rounded-[12px] h-[48px] px-4 w-full text-[14px] font-medium text-[#171717] focus:outline-none focus:border-[#9FB7AE]"
                  style={{
                    fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                  }}
                  defaultValue={(customer as any).birthdate?.value ?? ''}
                />
              </div>
            </div>

            {/* Row 3 */}
            <div className="flex flex-col gap-2 w-full">
              <label
                className="text-[14px] font-medium text-[#171717] leading-none"
                style={{
                  fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                }}
              >
                {isEn ? 'Preferred Language' : 'اللغة المفضلة'}
              </label>
              <div className="relative">
                <select
                  className="appearance-none bg-white border border-[#BBCFCD] rounded-[12px] h-[48px] px-4 w-full text-[14px] font-medium text-[#171717] focus:outline-none focus:border-[#9FB7AE]"
                  style={{
                    fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                  }}
                  defaultValue={isEn ? 'en' : 'ar'}
                  disabled
                >
                  <option value="en">English</option>
                  <option value="ar">العربية</option>
                </select>
                <div
                  className={`absolute top-0 bottom-0 flex items-center pointer-events-none ${isEn ? 'right-4' : 'left-4'}`}
                >
                  <svg
                    width="12"
                    height="8"
                    viewBox="0 0 12 8"
                    fill="none"
                    stroke="#234745"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
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
                style={{
                  fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                  minWidth: '180px',
                }}
              >
                {isLoading
                  ? isEn
                    ? 'Saving...'
                    : 'جاري حفظ التغييرات...'
                  : isEn
                    ? 'Save Changes'
                    : 'حفظ التغييرات'}
              </button>
            </div>
          </div>

          <div className="border-t border-[#BBCFCD] w-full my-2"></div>

          {/* Delete Button */}
          <div className="flex justify-start items-center">
            <button
              onClick={() => setShowDeleteModal(true)}
              type="button"
              className="flex items-center justify-center gap-2 border border-[#E64950] rounded-[12px] h-[48px] px-6 text-[#E64950] hover:bg-red-50 transition-colors"
            >
              <span
                className="text-[16px] font-bold leading-none"
                style={{
                  fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                }}
              >
                {isEn ? 'Delete Account Permanently' : 'حذف الحساب نهائياً'}
              </span>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
              </svg>
            </button>
          </div>

          {action?.error && (
            <div className="mt-4 p-4 rounded-[12px] bg-[#ffebeb] border border-[#ffcfcf] text-[#e74c3c]">
              <p className="m-0 text-[14px] font-semibold">⚠️ {action.error}</p>
            </div>
          )}
        </div>
      </Form>

      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
          dir={isEn ? 'ltr' : 'rtl'}
        >
          <div className="bg-white rounded-[24px] p-8 max-w-[480px] w-[90%] flex flex-col items-center text-center shadow-xl">
            <div className="w-[80px] h-[80px] bg-[#E64950] rounded-full flex items-center justify-center text-white text-[40px] font-bold mb-6">
              !
            </div>
            <h3
              className="text-[20px] font-bold text-[#171717] mb-2"
              style={{
                fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
              }}
            >
              {isEn
                ? 'Are you sure you want to permanently delete the account?'
                : 'هل انت متأكد من انك تريد حذف الحساب نهائياً؟'}
            </h3>
            <p
              className="text-[14px] text-[#7D7D7D] mb-8"
              style={{
                fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
              }}
            >
              {isEn
                ? 'Warning! All your data will be deleted if the account is deleted'
                : 'انتبه! سيتم حذف جميع البيانات الخاصة بك في حال حذف الحساب'}
            </p>
            <div className="flex w-full gap-4">
              <Form method="PUT" className="w-1/2">
                <input type="hidden" name="intent" value="deleteAccount" />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#E64950] text-white rounded-[12px] h-[48px] text-[16px] font-bold hover:bg-[#c0392b] transition-colors disabled:opacity-70"
                  style={{
                    fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                  }}
                >
                  {isLoading
                    ? isEn
                      ? 'Deleting...'
                      : 'جاري الحذف...'
                    : isEn
                      ? 'Yes, delete'
                      : 'نعم, حذف'}
                </button>
              </Form>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="w-1/2 bg-[#255441] text-white rounded-[12px] h-[48px] text-[16px] font-bold hover:bg-[#1a3a2d] transition-colors"
                style={{
                  fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                }}
              >
                {isEn ? 'No, go back' : 'لا, الرجوع'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showOtpModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
          dir={isEn ? 'ltr' : 'rtl'}
        >
          <div className="bg-white rounded-[24px] p-8 max-w-[480px] w-[90%] flex flex-col items-center text-center shadow-xl">
            <div className="w-[80px] h-[80px] bg-[#234745] rounded-full flex items-center justify-center text-white mb-6">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" />
              </svg>
            </div>
            <h3
              className="text-[20px] font-bold text-[#171717] mb-2"
              style={{
                fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
              }}
            >
              {isEn ? 'Verify Mobile Number' : 'التحقق من رقم الجوال'}
            </h3>
            <p
              className="text-[14px] text-[#7D7D7D] mb-6"
              style={{
                fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
              }}
            >
              {isEn
                ? `Please enter the 6-digit verification code sent to ${selectedCountryCode}${enteredPhone}`
                : `الرجاء إدخال رمز التحقق المكون من 6 أرقام المرسل إلى ${selectedCountryCode}${enteredPhone}`}
            </p>

            {/* 6 OTP Inputs */}
            <div className="flex gap-2 justify-center mb-6" dir="ltr">
              {otpRefs.map((ref, i) => (
                <input
                  key={i}
                  ref={ref}
                  type="text"
                  pattern="\d*"
                  maxLength={1}
                  value={otpValue[i]}
                  onChange={(e) => handleOTPChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="w-[45px] h-[55px] border border-[#BBCFCD] focus:border-[#234745] rounded-[8px] text-center text-[20px] font-bold outline-none"
                  style={{
                    fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                  }}
                />
              ))}
            </div>

            {otpError && (
              <p className="text-red-500 text-sm font-bold mb-4">{otpError}</p>
            )}

            <div className="flex w-full gap-4">
              <button
                type="button"
                onClick={verifyOtpAndSubmit}
                disabled={
                  fetcher.state !== 'idle' || otpValue.join('').length < 6
                }
                className="w-1/2 bg-[#234745] text-white rounded-[12px] h-[48px] text-[16px] font-bold hover:bg-[#1a3533] transition-colors disabled:opacity-50"
                style={{
                  fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                }}
              >
                {fetcher.state !== 'idle'
                  ? isEn
                    ? 'Verifying...'
                    : 'جاري التحقق...'
                  : isEn
                    ? 'Verify'
                    : 'تأكيد'}
              </button>
              <button
                type="button"
                onClick={() => setShowOtpModal(false)}
                className="w-1/2 bg-gray-100 text-gray-700 rounded-[12px] h-[48px] text-[16px] font-bold hover:bg-gray-200 transition-colors"
                style={{
                  fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                }}
              >
                {isEn ? 'Cancel' : 'إلغاء'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * The password plumbing that used to live here is gone.
 *
 * This form has never rendered a password field, and the only thing that could
 * set one — the Storefront `customerUpdate` mutation — is unreachable under the
 * shop's new customer accounts setting; the Admin API cannot set a customer
 * password at all. Keeping `getPassword` would have meant accepting a posted
 * password and silently dropping it, which is worse than not offering it.
 * Sign-in is by OTP, so there is no password to change.
 */
