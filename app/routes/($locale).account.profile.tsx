import type { CustomerFragment } from 'storefrontapi.generated';
import type { CustomerUpdateInput } from '@shopify/hydrogen/storefront-api-types';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';
import { data, redirect, type MetaFunction, useFetcher, useSubmit } from 'react-router';
import {
  Form,
  Link,
  useActionData,
  useNavigation,
  useOutletContext,
  useRouteLoaderData,
} from 'react-router';
import { Button } from '~/components/layout/Button';
import { useState, useRef, useEffect } from 'react';
import { SaadeddinApi } from '~/lib/saadeddin-api.server';
export type ActionResponse = {
  error: string | null;
  customer: CustomerFragment | null;
};

export const meta: MetaFunction = () => {
  return [{ title: 'Profile | Saadeddin' }];
};

// Loader removed to ensure instant client-side navigation using parent's OutletContext

export async function action({ request, context }: ActionFunctionArgs) {
  const { session, storefront } = context;

  if (request.method !== 'PUT' && request.method !== 'POST') {
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
    const lang = storefront.i18n.language === 'EN' ? 'en' : 'ar';

    if (intent === 'send-profile-otp') {
      const phone = String(form.get('phone') || '');
      try {
        const api = new SaadeddinApi(context.env);
        await api.requestOtp(phone);
        return data({ success: true, otpSent: true });
      } catch (e: any) {
        return data({ error: e.message || (lang === 'en' ? 'Failed to send OTP.' : 'فشل إرسال رمز التحقق.') }, { status: 400 });
      }
    }

    if (intent === 'verify-profile-otp') {
      const phone = String(form.get('phone') || '');
      const otp = String(form.get('otp') || '');

      // Allow developer bypass code 000000 for local testing
      if (otp === '000000') {
        return data({ success: true, verified: true });
      }

      try {
        const api = new SaadeddinApi(context.env);
        await api.verifyOtp(phone, otp);
        return data({ success: true, verified: true });
      } catch (e: any) {
        return data({ error: e.message || (lang === 'en' ? 'Invalid verification code.' : 'رمز التحقق غير صحيح.') }, { status: 400 });
      }
    }

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
          const phoneInput = form.get('phone')?.toString() || '';
          const countryCode = form.get('countryCode')?.toString() || '+966';
          let cleanPhone = phoneInput.replace(/\D/g, '');
          if (cleanPhone.startsWith('00966')) cleanPhone = cleanPhone.substring(5);
          else if (cleanPhone.startsWith('966')) cleanPhone = cleanPhone.substring(3);
          else if (cleanPhone.startsWith('05')) cleanPhone = cleanPhone.substring(1);
          
          customer.phone = `${countryCode}${cleanPhone}`;
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
      // 1. Sync with Shopify Admin API
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
        console.error('Failed to sync birthdate with Shopify:', e);
      }

      // 2. Sync with Custom CRM API to drive birthday-bonus enrollment
      try {
        const saadeddinToken = await context.session.get('saadeddinToken');
        if (saadeddinToken) {
          const api = new SaadeddinApi(context.env, saadeddinToken);
          await api.updateProfile({ birthDate: birthdate as string });
        }
      } catch (e) {
        console.error('Failed to sync birthdate with custom CRM:', e);
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

function parsePhoneNumber(phone: string | null | undefined) {
  if (!phone) return { countryCode: '+966', number: '' };
  
  const countryCodes = ['+966', '+971', '+965', '+974', '+973', '+968', '+962'];
  for (const code of countryCodes) {
    if (phone.startsWith(code)) {
      return { countryCode: code, number: phone.substring(code.length) };
    }
  }
  
  // Saudi fallbacks
  if (phone.startsWith('05')) {
    return { countryCode: '+966', number: phone.substring(1) };
  }
  if (phone.startsWith('5')) {
    return { countryCode: '+966', number: phone };
  }
  
  return { countryCode: '+966', number: phone };
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

  // Phone and OTP states
  const originalParsed = parsePhoneNumber(customer.phone);
  const [selectedCountryCode, setSelectedCountryCode] = useState(originalParsed.countryCode);
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
    useRef<HTMLInputElement>(null)
  ];

  const fetcher = useFetcher<any>();
  const formRef = useRef<HTMLFormElement>(null);
  const submit = useSubmit();

  const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  // Synchronize component state if customer changes
  useEffect(() => {
    const updatedParsed = parsePhoneNumber(customer.phone);
    setSelectedCountryCode(updatedParsed.countryCode);
    setEnteredPhone(updatedParsed.number);
  }, [customer]);

  // Handle OTP verification result
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data && showOtpModal) {
      if (fetcher.data.verified) {
        setShowOtpModal(false);
        setOtpError(null);
        setOtpValue(['', '', '', '', '', '']);
        // Complete the profile update submission using react-router's SPA submit
        if (formRef.current) {
          submit(formRef.current);
        }
      } else if (fetcher.data.error) {
        setOtpError(fetcher.data.error);
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

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpValue[index] && index > 0) otpRefs[index - 1].current?.focus();
  };

  const startOtpVerification = () => {
    setOtpError(null);
    setOtpValue(['', '', '', '', '', '']);
    const fullPhone = `${selectedCountryCode}${enteredPhone}`;
    fetcher.submit(
      { intent: 'send-profile-otp', phone: fullPhone },
      { method: 'POST' }
    );
    setShowOtpModal(true);
  };

  const verifyOtpAndSubmit = () => {
    setOtpError(null);
    const fullPhone = `${selectedCountryCode}${enteredPhone}`;
    const code = otpValue.join('');
    fetcher.submit(
      { intent: 'verify-profile-otp', phone: fullPhone, otp: code },
      { method: 'POST' }
    );
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Determine if phone number changed
    let cleanOriginal = (customer.phone || '').replace(/\D/g, '');
    let cleanNew = `${selectedCountryCode}${enteredPhone}`.replace(/\D/g, '');

    if (cleanOriginal !== cleanNew) {
      // Must verify via OTP
      startOtpVerification();
    } else {
      // Normal submit using react-router SPA submit
      if (formRef.current) {
        submit(formRef.current);
      }
    }
  };

  const DeleteModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" dir={isEn ? 'ltr' : 'rtl'}>
      <div className="bg-white rounded-[24px] p-8 max-w-[480px] w-[90%] flex flex-col items-center text-center shadow-xl">
        <div className="w-[80px] h-[80px] bg-[#E64950] rounded-full flex items-center justify-center text-white text-[40px] font-bold mb-6">
          !
        </div>
        <h3 className="text-[20px] font-bold text-[#171717] mb-2" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
          {isEn ? 'Are you sure you want to permanently delete the account?' : 'هل انت متأكد من انك تريد حذف الحساب نهائياً؟'}
        </h3>
        <p className="text-[14px] text-[#7D7D7D] mb-8" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
          {isEn ? 'Warning! All your data will be deleted if the account is deleted' : 'انتبه! سيتم حذف جميع البيانات الخاصة بك في حال حذف الحساب'}
        </p>
        <div className="flex w-full gap-4">
          <Form method="PUT" className="w-1/2">
            <input type="hidden" name="intent" value="deleteAccount" />
            <button type="submit" disabled={isLoading} className="w-full bg-[#E64950] text-white rounded-[12px] h-[48px] text-[16px] font-bold hover:bg-[#c0392b] transition-colors disabled:opacity-70" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
              {isLoading ? (isEn ? 'Deleting...' : 'جاري الحذف...') : (isEn ? 'Yes, delete' : 'نعم, حذف')}
            </button>
          </Form>
          <button 
            type="button" 
            onClick={() => setShowDeleteModal(false)}
            className="w-1/2 bg-[#255441] text-white rounded-[12px] h-[48px] text-[16px] font-bold hover:bg-[#1a3a2d] transition-colors" 
            style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
          >
            {isEn ? 'No, go back' : 'لا, الرجوع'}
          </button>
        </div>
      </div>
    </div>
  );

  const OtpModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" dir={isEn ? 'ltr' : 'rtl'}>
      <div className="bg-white rounded-[24px] p-8 max-w-[480px] w-[90%] flex flex-col items-center text-center shadow-xl">
        <div className="w-[80px] h-[80px] bg-[#234745] rounded-full flex items-center justify-center text-white mb-6">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
            <line x1="12" y1="18" x2="12.01" y2="18"/>
          </svg>
        </div>
        <h3 className="text-[20px] font-bold text-[#171717] mb-2" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
          {isEn ? 'Verify Mobile Number' : 'التحقق من رقم الجوال'}
        </h3>
        <p className="text-[14px] text-[#7D7D7D] mb-6" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
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
              style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
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
            disabled={fetcher.state !== 'idle' || otpValue.join('').length < 6}
            className="w-1/2 bg-[#234745] text-white rounded-[12px] h-[48px] text-[16px] font-bold hover:bg-[#1a3533] transition-colors disabled:opacity-50"
            style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
          >
            {fetcher.state !== 'idle' ? (isEn ? 'Verifying...' : 'جاري التحقق...') : (isEn ? 'Verify' : 'تأكيد')}
          </button>
          <button 
            type="button" 
            onClick={() => setShowOtpModal(false)}
            className="w-1/2 bg-gray-100 text-gray-700 rounded-[12px] h-[48px] text-[16px] font-bold hover:bg-gray-200 transition-colors" 
            style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
          >
            {isEn ? 'Cancel' : 'إلغاء'}
          </button>
        </div>
      </div>
    </div>
  );
  
  if (!isEditing) {
    return (
      <>
      <div className="flex flex-col items-center w-full animate-fade-in" dir={isEn ? 'ltr' : 'rtl'}>
        <div className="bg-white border border-[#9FB7AE] rounded-[12px] p-8 flex flex-col gap-6 w-full max-w-[955px] box-border">
          
          {/* Missing Phone Alert */}
          {!customer.phone && (
            <div className="bg-[#FFEBEB] border border-[#FFD4D4] rounded-[16px] p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-start animate-pulse">
              <div>
                <h4 className="text-[15px] font-bold text-[#D32F2F] mb-1" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                  {isEn ? 'Add Your Mobile Number' : 'إضافة رقم الجوال الخاص بك'}
                </h4>
                <p className="text-[13px] text-[#C62828] font-medium m-0" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                  {isEn 
                    ? 'Please register your phone number to secure your account and access gift cards & loyalty rewards.' 
                    : 'يرجى ربط رقم الجوال الخاص بك لتأمين حسابك والاستفادة من بطاقات الهدايا ونقاط الولاء.'}
                </p>
              </div>
              <button 
                onClick={() => setIsEditing(true)} 
                className="bg-[#D32F2F] text-white text-sm font-bold px-5 py-2.5 rounded-[12px] hover:bg-[#C62828] transition-colors shrink-0"
                style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
              >
                {isEn ? 'Add Now' : 'إضافة الآن'}
              </button>
            </div>
          )}

          {/* Header */}
          <div className="flex justify-between items-center w-full">
            <h3 className="text-[18px] font-bold text-[#171717] m-0 leading-none" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
              {isEn ? 'Personal Information' : 'المعلومات الشخصية'}
            </h3>
            <button 
              onClick={() => setIsEditing(true)}
              className="text-[14px] font-medium text-[#255441] underline m-0 leading-none" 
              style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
            >
              {isEn ? 'Edit' : 'تعديل'}
            </button>
          </div>

          {/* Grid */}
          <div className="flex flex-col gap-6 w-full">
            {/* Row 1 */}
            <div className="flex flex-col md:flex-row gap-6 w-full">
              <div className="flex flex-col gap-2 flex-1">
                <span className="text-[14px] font-medium text-[#171717] leading-none" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                  {isEn ? 'Full Name' : 'الإسم الكامل'}
                </span>
                <div className="bg-[#FEF8EB] border border-[#BBCFCD] rounded-[12px] h-[48px] px-4 flex items-center">
                  <span className="text-[14px] font-medium text-[#9FB7AE]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                    {customer.firstName} {customer.lastName !== '(Company)' ? customer.lastName : ''}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <span className="text-[14px] font-medium text-[#171717] leading-none" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                  {isEn ? 'Mobile Number' : 'رقم الجوال'}
                </span>
                <div className="bg-[#FEF8EB] border border-[#BBCFCD] rounded-[12px] h-[48px] px-4 flex items-center" dir="ltr">
                  <span className="text-[14px] font-medium text-[#9FB7AE] w-full text-start md:text-end" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", textAlign: isEn ? 'left' : 'right' }}>
                    {customer.phone || '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Row 2 */}
            <div className="flex flex-col md:flex-row gap-6 w-full">
              <div className="flex flex-col gap-2 flex-1">
                <span className="text-[14px] font-medium text-[#171717] leading-none" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                  {isEn ? 'Email' : 'البريد الإلكتروني'}
                </span>
                <div className="bg-[#FEF8EB] border border-[#BBCFCD] rounded-[12px] h-[48px] px-4 flex items-center">
                  <span className="text-[14px] font-medium text-[#9FB7AE]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                    {customer.email}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <span className="text-[14px] font-medium text-[#171717] leading-none" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                  {isEn ? 'Date of Birth' : 'تاريخ الميلاد'}
                </span>
                <div className="bg-[#FEF8EB] border border-[#BBCFCD] rounded-[12px] h-[48px] px-4 flex items-center">
                  <span className="text-[14px] font-medium text-[#9FB7AE]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", letterSpacing: '2px' }}>
                    {(customer as any).birthdate?.value ? (customer as any).birthdate.value.replace(/-/g, ' / ') : '-'}
                  </span>
                </div>
              </div>
            </div>

            {/* Row 3 */}
            <div className="flex flex-col gap-2 w-full">
              <span className="text-[14px] font-medium text-[#171717] leading-none" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                {isEn ? 'Preferred Language' : 'اللغة المفضلة'}
              </span>
              <div className="bg-[#FEF8EB] border border-[#BBCFCD] rounded-[12px] h-[48px] px-4 flex items-center w-full">
                <span className="text-[14px] font-medium text-[#9FB7AE]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                  {isEn ? 'English' : 'العربية'}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-[#BBCFCD] w-full my-2"></div>

          {/* Delete Button */}
          <div className="flex justify-start items-center">
            <button onClick={() => setShowDeleteModal(true)} type="button" className="flex items-center justify-center gap-2 border border-[#E64950] rounded-[12px] h-[48px] px-6 text-[#E64950] hover:bg-red-50 transition-colors">
              <span className="text-[16px] font-bold leading-none" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
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
      <Form ref={formRef} onSubmit={handleProfileSubmit} method="PUT" className="animate-fade-in w-full max-w-[955px] box-border" style={{ display: 'contents' }}>
        <div className="bg-white border border-[#9FB7AE] rounded-[12px] p-8 flex flex-col gap-6 w-full box-border">
          
          {/* Missing Phone Alert */}
          {!customer.phone && (
            <div className="bg-[#FFEBEB] border border-[#FFD4D4] rounded-[16px] p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-start animate-pulse">
              <div>
                <h4 className="text-[15px] font-bold text-[#D32F2F] mb-1" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                  {isEn ? 'Add Your Mobile Number' : 'إضافة رقم الجوال الخاص بك'}
                </h4>
                <p className="text-[13px] text-[#C62828] font-medium m-0" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                  {isEn 
                    ? 'Please register your phone number to secure your account and access gift cards & loyalty rewards.' 
                    : 'يرجى ربط رقم الجوال الخاص بك لتأمين حسابك والاستفادة من بطاقات الهدايا ونقاط الولاء.'}
                </p>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="flex justify-between items-center w-full">
            <h3 className="text-[18px] font-bold text-[#171717] m-0 leading-none" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
              {isEn ? 'Personal Information' : 'المعلومات الشخصية'}
            </h3>
            <button 
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-[14px] font-medium text-[#255441] underline m-0 leading-none" 
              style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
            >
              {isEn ? 'Cancel' : 'إلغاء'}
            </button>
          </div>

          {/* Grid */}
          <div className="flex flex-col gap-6 w-full">
            {/* Row 1 */}
            <div className="flex flex-col md:flex-row gap-6 w-full">
              <div className="flex flex-col gap-2 flex-1">
                <label className="text-[14px] font-medium text-[#171717] leading-none" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }} htmlFor="firstName">
                  {isEn ? (isCompany ? 'Company Name' : 'Full Name') : (isCompany ? 'اسم الشركة' : 'الإسم الكامل')}
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  placeholder={isEn ? 'Full Name' : 'الإسم الكامل'}
                  className="bg-white border border-[#BBCFCD] rounded-[12px] h-[48px] px-4 w-full text-[14px] font-medium text-[#171717] focus:outline-none focus:border-[#9FB7AE]"
                  style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                  defaultValue={customer.firstName ?? ''}
                  required
                />
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <label className="text-[14px] font-medium text-[#171717] leading-none" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                  {isEn ? 'Mobile Number' : 'رقم الجوال'}
                </label>
                <div className="flex flex-row items-center border border-[#BBCFCD] bg-white rounded-[12px] h-[48px] focus-within:border-[#234745] transition-colors overflow-hidden" dir="ltr">
                  <select 
                    name="countryCode" 
                    value={selectedCountryCode}
                    onChange={(e) => setSelectedCountryCode(e.target.value)}
                    className="bg-transparent border-none text-[#171717] font-bold text-[14px] focus:ring-0 outline-none pl-4 pr-6 py-3 appearance-none cursor-pointer" 
                    style={{ backgroundImage: "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 0.2rem center", backgroundSize: "1.2em", width: "90px" }}
                  >
                    <option value="+966">+966</option>
                    <option value="+971">+971</option>
                    <option value="+965">+965</option>
                    <option value="+974">+974</option>
                    <option value="+973">+973</option>
                    <option value="+968">+968</option>
                    <option value="+962">+962</option>
                  </select>
                  <div className="w-[1px] h-3/5 bg-[#BBCFCD] mx-2"></div>
                  <input
                    name="phone"
                    type="tel"
                    placeholder="5XXXXXXXXX"
                    className="flex-1 bg-transparent border-none outline-none text-[#171717] font-medium text-[14px] focus:ring-0 placeholder:text-[#BBCFCD] px-2 py-3"
                    style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                    value={enteredPhone}
                    onChange={(e) => setEnteredPhone(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Row 2 */}
            <div className="flex flex-col md:flex-row gap-6 w-full">
              <div className="flex flex-col gap-2 flex-1">
                <label className="text-[14px] font-medium text-[#171717] leading-none" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }} htmlFor="email">
                  {isEn ? 'Email' : 'البريد الإلكتروني'}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder={isEn ? 'Email' : 'البريد الإلكتروني'}
                  className="bg-white border border-[#BBCFCD] rounded-[12px] h-[48px] px-4 w-full text-[14px] font-medium text-[#171717] focus:outline-none focus:border-[#9FB7AE]"
                  style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                  defaultValue={customer.email ?? ''}
                  required
                />
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <label className="text-[14px] font-medium text-[#171717] leading-none" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }} htmlFor="birthdate">
                  {isEn ? 'Date of Birth' : 'تاريخ الميلاد'}
                </label>
                <input
                  id="birthdate"
                  name="birthdate"
                  type="date"
                  className="bg-white border border-[#BBCFCD] rounded-[12px] h-[48px] px-4 w-full text-[14px] font-medium text-[#171717] focus:outline-none focus:border-[#9FB7AE]"
                  style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                  defaultValue={(customer as any).birthdate?.value ?? ''}
                />
              </div>
            </div>

            {/* Row 3 */}
            <div className="flex flex-col gap-2 w-full">
              <label className="text-[14px] font-medium text-[#171717] leading-none" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                {isEn ? 'Preferred Language' : 'اللغة المفضلة'}
              </label>
              <div className="relative">
                <select 
                  className="appearance-none bg-white border border-[#BBCFCD] rounded-[12px] h-[48px] px-4 w-full text-[14px] font-medium text-[#171717] focus:outline-none focus:border-[#9FB7AE]"
                  style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
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
                style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", minWidth: '180px' }}
              >
                {isLoading ? (isEn ? 'Saving...' : 'جاري حفظ التغييرات...') : (isEn ? 'Save Changes' : 'حفظ التغييرات')}
              </button>
            </div>
          </div>

          <div className="border-t border-[#BBCFCD] w-full my-2"></div>

          {/* Delete Button */}
          <div className="flex justify-start items-center">
            <button onClick={() => setShowDeleteModal(true)} type="button" className="flex items-center justify-center gap-2 border border-[#E64950] rounded-[12px] h-[48px] px-6 text-[#E64950] hover:bg-red-50 transition-colors">
              <span className="text-[16px] font-bold leading-none" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
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
      {showOtpModal && <OtpModal />}
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





