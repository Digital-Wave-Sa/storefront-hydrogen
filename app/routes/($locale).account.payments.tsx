import { data, redirect, type LoaderFunctionArgs } from 'react-router';
import { useLoaderData, Form, useOutletContext } from 'react-router';
import React, { useState } from 'react';

// Loader removed to ensure instant client-side navigation using parent's OutletContext

export default function AccountPayments() {
  const { locale, balance } = useOutletContext<{ locale: string; balance?: number }>() || {};
  const isEn = locale === 'en';
  
  const initialMethods = [
    {
      id: '1',
      type: 'mada',
      last4: '4321',
      expiry: '08/28',
      isDefault: true,
      nameAr: 'مدى',
      nameEn: 'Mada',
    },
    {
      id: '2',
      type: 'visa',
      last4: '8765',
      expiry: '12/26',
      isDefault: false,
      nameAr: 'Visa / Mastercard',
      nameEn: 'Visa / Mastercard',
    },
    {
      id: '3',
      type: 'applepay',
      last4: null,
      expiry: null,
      isDefault: false,
      nameAr: 'Apple Pay',
      nameEn: 'Apple Pay',
      subtitleAr: 'مرتبط بجهازك',
      subtitleEn: 'Linked to your device'
    }
  ];

  const [paymentMethods, setPaymentMethods] = useState(initialMethods);
  
  const handleSetDefault = (id: string) => {
    setPaymentMethods(methods => 
      methods.map(m => ({ ...m, isDefault: m.id === id }))
    );
  };

  const handleDelete = (id: string) => {
    if (confirm(isEn ? 'Are you sure you want to delete this payment method?' : 'هل أنت متأكد من حذف طريقة الدفع هذه؟')) {
      setPaymentMethods(methods => methods.filter(m => m.id !== id));
    }
  };

  const formattedBalance = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR' }).format(balance || 0);

  const allMethods = [
    {
      id: 'wallet',
      type: 'wallet',
      nameAr: 'المحفظة',
      nameEn: 'Wallet',
      subtitleAr: `الرصيد المتاح: ${formattedBalance}`,
      subtitleEn: `Available balance: ${formattedBalance}`,
      isDefault: false,
      isPermanent: true
    },
    ...paymentMethods
  ];

  return (
    <div className="animate-fade-in w-full">
      <div className="bg-white rounded-[24px] border border-[#BBCFCD] p-6 md:p-8 shadow-sm">
        <div className="flex justify-end mb-8">
          <h2 className="text-[22px] font-bold text-[#234745]">
            {isEn ? 'Payment Methods' : 'طرق الدفع'}
          </h2>
        </div>

        <div className="space-y-4">
          {allMethods.map((method: any) => (
            <div 
              key={method.id} 
              className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 rounded-[12px] border transition-all gap-4 sm:gap-0 ${
                method.isDefault || method.isPermanent
                  ? 'border-[#234745] bg-[#FEF8EB]' 
                  : 'border-[#BBCFCD] bg-white hover:border-[#9FB7AE]'
              }`}
            >
              {/* PRIMARY CONTENT (Card Info & Radio) - In RTL this appears on the RIGHT */}
              <div className="flex items-center gap-4 text-start">
                {/* Custom Radio Button */}
                {!method.isPermanent && (
                  <button 
                    onClick={() => handleSetDefault(method.id)}
                    className="shrink-0 focus:outline-none"
                  >
                    <div className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center transition-all ${
                      method.isDefault ? 'border-[#234745]' : 'border-[#BBCFCD]'
                    }`}>
                      {method.isDefault && <div className="w-[10px] h-[10px] rounded-full bg-[#234745]" />}
                    </div>
                  </button>
                )}
                
                {method.isPermanent && (
                   <div className="shrink-0">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#234745" strokeWidth="2">
                        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                        <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
                      </svg>
                   </div>
                )}

                <div className="flex flex-col items-start">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-[#234745] text-base" dir="ltr">
                      {isEn ? method.nameEn : method.nameAr}
                      {method.last4 && ` - •••• •••• •••• ${method.last4}`}
                    </span>
                  </div>
                  
                  {method.expiry && (
                    <p className="text-sm text-[#9FB7AE] mt-1 font-medium">
                      {isEn ? 'Expires' : 'تنتهي'} <span dir="ltr">{method.expiry}</span>
                    </p>
                  )}
                  {(isEn ? method.subtitleEn : method.subtitleAr) && (
                    <p className="text-sm text-[#9FB7AE] mt-1 font-medium">
                      {isEn ? method.subtitleEn : method.subtitleAr}
                    </p>
                  )}
                </div>
              </div>

              {/* SECONDARY CONTENT (Actions) - In RTL this appears on the LEFT */}
              <div className="flex items-center gap-4 shrink-0 w-full sm:w-auto justify-end">
                {!method.isPermanent && !method.isDefault && (
                  <button 
                    onClick={() => handleSetDefault(method.id)}
                    className="text-sm font-bold text-[#234745] hover:opacity-70 transition-opacity"
                  >
                    {isEn ? 'Set as default' : 'تعيين كافتراضي'}
                  </button>
                )}
                
                {!method.isPermanent && (
                  <button 
                    onClick={() => handleDelete(method.id)}
                    className="text-sm font-bold text-[#e34242] hover:opacity-70 transition-opacity"
                  >
                    {isEn ? 'Delete' : 'حذف'}
                  </button>
                )}
              </div>
            </div>
          ))}

          {paymentMethods.length === 0 && (
            <div className="text-center py-12 text-[#9FB7AE] font-medium">
              {isEn ? 'No payment methods saved.' : 'لا توجد طرق دفع محفوظة.'}
            </div>
          )}

          <button 
            className="w-full mt-2 py-4 flex items-center justify-center gap-2 border border-[#BBCFCD] rounded-[12px] font-bold text-[#234745] hover:bg-gray-50 transition-all"
            onClick={() => alert(isEn ? 'Integration with payment gateway vaulting required to add cards securely.' : 'يتطلب الربط مع بوابة الدفع لإضافة البطاقات بشكل آمن.')}
          >
            <span className="text-lg leading-none -mt-0.5">+</span>
            {isEn ? 'Add new card' : 'إضافة بطاقة جديدة'}
          </button>
        </div>
      </div>
    </div>
  );
}
