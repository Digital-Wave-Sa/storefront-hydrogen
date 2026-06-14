import { useState } from 'react';
import { type MetaFunction, useLocation, Link } from 'react-router';
import { Button } from '~/components/layout/Button';
import { PageHeader } from '~/components/layout/PageHeader';

export const meta: MetaFunction = () => {
    return [{ title: 'Saadeddin | Digital Gift Voucher' }];
};

export default function BuyGiftCard() {
    const isEn = useLocation().pathname.startsWith('/en');
    
    const [amount, setAmount] = useState<number>(100);
    const [customAmount, setCustomAmount] = useState<string>('');
    const [recipientName, setRecipientName] = useState('');
    const [recipientPhone, setRecipientPhone] = useState('');
    const [greeting, setGreeting] = useState('');
    
    const presetAmounts = [50, 100, 200, 500];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const finalAmount = customAmount ? parseFloat(customAmount) : amount;
        
        console.log('Sending to Tap Payments:', {
            amount: finalAmount,
            recipient_name: recipientName,
            recipient_phone: recipientPhone,
            greeting: greeting
        });
        
        alert(isEn 
            ? `UI TEST SUCCESS: Form works perfectly!\nAmount: ${finalAmount} SAR\nTo: ${recipientName} (${recipientPhone})\n\n(Backend checkout will be connected later)`
            : `تم تجربة الواجهة بنجاح!\nالمبلغ: ${finalAmount} ريال\nإلى: ${recipientName} (${recipientPhone})\n\n(سيتم ربط الدفع لاحقاً)`
        );
    };

    return (
        <div className={`min-h-screen bg-[#FEF8EB] ${isEn ? 'font-en' : "font-ar"}`} dir={isEn ? 'ltr' : 'rtl'}>
            
            {/* Header */}
            <PageHeader 
                title={isEn ? 'Digital Gift Voucher' : 'قسيمة الإهداء الرقمية'}
                isEn={isEn}
            >
                <p className="text-[#9FB7AE] font-medium text-[18px] max-w-xl mx-auto mt-2" style={{ fontFamily: !isEn ? "'GE Dinar One', sans-serif" : undefined }}>
                    {isEn ? 'Send love to your friends and family instantly with a digital Saadeddin gift voucher.' : 'أرسل محبتك لأصدقائك وعائلتك فوراً عبر قسيمة هدايا سعد الدين الرقمية.'}
                </p>
            </PageHeader>

            {/* Main Content */}
            <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-12 md:py-20">
                <div className="flex flex-col lg:flex-row gap-12 items-start">
                    
                    {/* Left: Gift Card Visual */}
                    <div className="w-full lg:w-1/2 flex flex-col items-center gap-8 sticky top-32">
                        <div className="relative w-full max-w-[500px] aspect-[1.58] rounded-[24px] overflow-hidden shadow-2xl transform transition-transform hover:scale-[1.02] duration-500 bg-gradient-to-br from-[#234745] to-[#142A29]">
                            {/* Card Details Overlay */}
                            <div className="absolute inset-0 p-8 flex flex-col justify-between z-10">
                                <div className="flex justify-between items-start w-full">
                                    <img src="/logo.svg" alt="Saadeddin" className="h-10 opacity-90 invert brightness-0" />
                                    <span className="bg-[#D4A06A] text-white px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase shadow-sm">
                                        Gift Voucher
                                    </span>
                                </div>
                                <div className="flex flex-col text-white">
                                    <span className="text-5xl font-black mb-1 drop-shadow-sm">
                                        {customAmount ? customAmount : amount} <span className="text-2xl text-[#9FB7AE]">SAR</span>
                                    </span>
                                    <span className="text-[#9FB7AE] text-sm font-medium tracking-wider uppercase">
                                        {isEn ? 'Use on all products' : 'صالحة لجميع المنتجات'}
                                    </span>
                                </div>
                            </div>
                            {/* Decorative Elements */}
                            <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[120%] bg-white/5 rounded-full blur-2xl transform rotate-12 pointer-events-none" />
                            <div className="absolute bottom-[-20%] left-[-10%] w-[40%] h-[80%] bg-[#D4A06A]/10 rounded-full blur-2xl pointer-events-none" />
                        </div>

                        <div className="bg-white/60 backdrop-blur-sm border border-[#BBCFCD]/30 p-6 rounded-[24px] text-center w-full max-w-[500px]">
                            <h3 className="font-bold text-[#234745] mb-2">{isEn ? 'How it works' : 'كيف تعمل؟'}</h3>
                            <p className="text-[#7D7D7D] text-sm font-medium" style={{ fontFamily: !isEn ? "'GE Dinar One', sans-serif" : undefined }}>
                                {isEn ? 'Choose an amount, add the recipient details, and pay securely. They will receive the voucher instantly via SMS and can use it right away in their Wallet!' : 'اختر المبلغ، أضف بيانات المستلم، وادفع بأمان. سيتم إرسال القسيمة فوراً عبر رسالة نصية ليتمكنوا من استخدامها في محفظتهم!'}
                            </p>
                        </div>
                    </div>

                    {/* Right: Form */}
                    <div className="w-full lg:w-1/2 bg-white rounded-[32px] p-8 md:p-12 shadow-xl border border-gray-100 relative">
                        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
                            
                            {/* Amount Selection */}
                            <div className="flex flex-col gap-4">
                                <label className="text-[18px] font-bold text-[#234745] border-b border-gray-100 pb-2">
                                    {isEn ? 'Select Amount' : 'اختر المبلغ'}
                                </label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {presetAmounts.map((preset) => (
                                        <button
                                            key={preset}
                                            type="button"
                                            onClick={() => {
                                                setAmount(preset);
                                                setCustomAmount('');
                                            }}
                                            className={`py-4 rounded-[16px] font-black text-lg transition-all border-2 ${
                                                amount === preset && !customAmount
                                                    ? 'bg-[#234745] text-white border-[#234745] shadow-md transform scale-[1.02]'
                                                    : 'bg-gray-50 text-[#7D7D7D] border-transparent hover:border-[#234745]/20 hover:bg-gray-100'
                                            }`}
                                        >
                                            {preset} SAR
                                        </button>
                                    ))}
                                </div>
                                <div className="relative mt-2">
                                    <input 
                                        type="number" 
                                        min="1"
                                        placeholder={isEn ? "Or enter custom amount" : "أو أدخل مبلغاً مخصصاً"}
                                        value={customAmount}
                                        onChange={(e) => {
                                            setCustomAmount(e.target.value);
                                            if (e.target.value) setAmount(0);
                                        }}
                                        className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 focus:border-[#234745] focus:bg-white rounded-[16px] outline-none transition-all font-bold text-gray-700 placeholder:font-medium placeholder:text-gray-400"
                                    />
                                    <span className="absolute top-1/2 -translate-y-1/2 rtl:left-5 ltr:right-5 font-bold text-[#BBCFCD]">
                                        SAR
                                    </span>
                                </div>
                            </div>

                            {/* Recipient Details */}
                            <div className="flex flex-col gap-4">
                                <label className="text-[18px] font-bold text-[#234745] border-b border-gray-100 pb-2 mt-4">
                                    {isEn ? 'Recipient Details' : 'بيانات المستلم'}
                                </label>
                                <input 
                                    type="text" 
                                    required
                                    placeholder={isEn ? "Recipient Name" : "اسم المستلم"}
                                    value={recipientName}
                                    onChange={(e) => setRecipientName(e.target.value)}
                                    className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 focus:border-[#234745] focus:bg-white rounded-[16px] outline-none transition-all font-bold text-gray-700 placeholder:font-medium placeholder:text-gray-400"
                                />
                                <input 
                                    type="tel" 
                                    required
                                    placeholder={isEn ? "Recipient Phone (e.g. 05...)" : "رقم هاتف المستلم (مثال: 05...)"}
                                    value={recipientPhone}
                                    onChange={(e) => setRecipientPhone(e.target.value)}
                                    className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 focus:border-[#234745] focus:bg-white rounded-[16px] outline-none transition-all font-bold text-gray-700 placeholder:font-medium placeholder:text-gray-400"
                                />
                            </div>

                            {/* Greeting Message */}
                            <div className="flex flex-col gap-4">
                                <label className="text-[18px] font-bold text-[#234745] border-b border-gray-100 pb-2 mt-4">
                                    {isEn ? 'Personal Message' : 'رسالة شخصية'}
                                </label>
                                <textarea 
                                    placeholder={isEn ? "Write a warm message to them..." : "اكتب رسالة دافئة لهم..."}
                                    value={greeting}
                                    onChange={(e) => setGreeting(e.target.value)}
                                    rows={4}
                                    className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 focus:border-[#234745] focus:bg-white rounded-[16px] outline-none transition-all font-bold text-gray-700 placeholder:font-medium placeholder:text-gray-400 resize-none"
                                />
                            </div>

                            {/* Submit Button */}
                            <Button 
                                type="submit" 
                                variant="primary" 
                                size="lg"
                                className="w-full py-5 rounded-[16px] font-black text-lg tracking-wide shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all mt-6"
                            >
                                {isEn ? `Pay ${customAmount || amount} SAR Securely` : `ادفع ${customAmount || amount} ريال بأمان`}
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
