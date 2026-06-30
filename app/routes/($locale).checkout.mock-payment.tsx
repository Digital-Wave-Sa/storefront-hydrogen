import { useLocation, useNavigate } from 'react-router';
import { useState } from 'react';

export default function MockPayment() {
  const isEn = useLocation().pathname.startsWith('/en');
  const navigate = useNavigate();
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePay = (success: boolean) => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (success) {
        navigate(isEn ? '/en/account/orders' : '/account/orders');
      } else {
        navigate(isEn ? '/en/cart' : '/cart');
      }
    }, 1500);
  };

  return (
    <div className={`min-h-screen bg-[#FEF8EB] flex items-center justify-center p-4 ${isEn ? 'font-en' : 'font-ar'}`} dir={isEn ? 'ltr' : 'rtl'}>
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-[#F2E3C6] overflow-hidden p-6 md:p-8">
        
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-block bg-[#1B3B36] text-[#FEF8EB] px-4 py-2 rounded-full text-sm font-bold tracking-widest mb-3 uppercase">
            {isEn ? 'Moyasar Sandbox' : 'بوابة دفع تجريبية'}
          </div>
          <h2 className="text-2xl font-extrabold text-[#1B3B36]">
            {isEn ? 'Complete Your Payment' : 'إتمام عملية الدفع'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {isEn ? 'Simulated payment gateway for local testing' : 'محاكاة لبوابة الدفع للاختبار المحلي'}
          </p>
        </div>

        {/* Card Graphics */}
        <div className="relative h-44 w-full bg-gradient-to-br from-[#1B3B36] to-[#2E5E56] rounded-2xl p-6 text-[#FEF8EB] shadow-lg mb-8 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#2E5E56] opacity-20 rounded-full -mr-8 -mt-8"></div>
          <div className="flex justify-between items-start">
            <span className="text-lg font-bold">Saadeddin</span>
            <span className="text-xs uppercase font-semibold tracking-wider">Mada / Visa</span>
          </div>
          <div className="mt-8 text-xl tracking-widest font-mono">
            {cardNumber || '•••• •••• •••• ••••'}
          </div>
          <div className="mt-6 flex justify-between">
            <div>
              <span className="text-[10px] text-gray-300 block uppercase">{isEn ? 'Card Holder' : 'صاحب البطاقة'}</span>
              <span className="text-sm tracking-wide font-medium">{name || 'YOUR NAME'}</span>
            </div>
            <div>
              <span className="text-[10px] text-gray-300 block uppercase">{isEn ? 'Expires' : 'ينتهي في'}</span>
              <span className="text-sm font-medium">{expiry || 'MM/YY'}</span>
            </div>
          </div>
        </div>

        {/* Form Inputs */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              {isEn ? 'CARDHOLDER NAME' : 'اسم صاحب البطاقة'}
            </label>
            <input 
              type="text" 
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1B3B36] text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              {isEn ? 'CARD NUMBER' : 'رقم البطاقة'}
            </label>
            <input 
              type="text" 
              maxLength={19}
              placeholder="4000 1234 5678 9010"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim())}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1B3B36] text-sm font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                {isEn ? 'EXPIRY DATE' : 'تاريخ الانتهاء'}
              </label>
              <input 
                type="text" 
                placeholder="MM/YY"
                maxLength={5}
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1B3B36] text-sm text-center font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                CVV
              </label>
              <input 
                type="password" 
                placeholder="•••"
                maxLength={3}
                value={cvv}
                onChange={(e) => setCvv(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1B3B36] text-sm text-center font-mono"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 space-y-3">
          <button
            onClick={() => handlePay(true)}
            disabled={loading}
            className="w-full bg-[#1B3B36] hover:bg-[#25524B] text-white py-4 rounded-xl font-bold transition duration-300 shadow-md flex items-center justify-center space-x-2 text-base"
          >
            {loading ? (
              <span className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <span>{isEn ? 'Simulate Payment Success' : 'محاكاة نجاح عملية الدفع'}</span>
            )}
          </button>

          <button
            onClick={() => handlePay(false)}
            disabled={loading}
            className="w-full bg-red-50 hover:bg-red-100 text-red-600 py-3 rounded-xl font-bold transition duration-300 text-sm"
          >
            {isEn ? 'Simulate Payment Failure' : 'محاكاة فشل عملية الدفع'}
          </button>
        </div>
      </div>
    </div>
  );
}
