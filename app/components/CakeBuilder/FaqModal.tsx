import React, { useState } from 'react';
import { X, ChevronDown, ChevronUp, Headphones } from 'lucide-react';

export const FaqModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  if (!isOpen) return null;

  const faqs = [
    {
      q: 'هل يمكنني طلب كيك في نفس اليوم؟',
      a: 'الكيك المخصص يحتاج ٤٨ ساعة كحد أدنى للتجهيز. إذا كنت تريد كيك في نفس اليوم، يمكنك تصفح تشكيلتنا الجاهزة من صفحة المنتجات.'
    },
    {
      q: 'ما هي مدة الحفظ المناسبة للكيك؟',
      a: 'يفضل حفظ الكيك في الثلاجة واستهلاكه خلال ٣ إلى ٤ أيام لضمان أفضل طعم وجودة.'
    },
    {
      q: 'هل المنتجات تحتوي على مواد حافظة؟',
      a: 'لا، جميع منتجاتنا مخبوزة طازجة ولا تحتوي على أي مواد حافظة صناعية.'
    },
    {
      q: 'هل يمكنني تعديل طلبي بعد التأكيد؟',
      a: 'يمكنك تعديل الطلب خلال أول ساعتين من تأكيده عن طريق التواصل مع خدمة العملاء.'
    },
    {
      q: 'هل يمكنكم تنفيذ تصاميم خاصة؟',
      a: 'نعم! يمكنك إرفاق صورة التصميم المطلوب في خطوة "رسالتك الخاصة" أو التواصل معنا مباشرة.'
    },
    {
      q: 'هل يمكن كتابة رسالة على الكيكة باللغة الإنجليزية؟',
      a: 'بالتأكيد، يمكننا كتابة رسالتك بأي لغة تفضلها بشرط أن لا تتجاوز عدد الحروف المسموح بها.'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" dir="rtl">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-2 border-b border-gray-100">
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-[#255441]">الأسئلة الشائعة</h2>
          <div className="w-9" /> {/* Spacer for centering */}
        </div>

        {/* FAQ List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={idx} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                <button 
                  className="w-full flex items-center justify-between text-right gap-4 focus:outline-none"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                >
                  <span className={`font-bold text-sm ${isOpen ? 'text-[#255441]' : 'text-gray-700'}`}>
                    {faq.q}
                  </span>
                  <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${isOpen ? 'bg-[#255441] text-white' : 'bg-[#F9F7EC] text-[#C4A462]'}`}>
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>
                
                {isOpen && (
                  <div className="mt-3 text-sm text-[#8BA19C] leading-relaxed pl-10 pr-2 animate-in slide-in-from-top-1">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Contact Footer */}
        <div className="p-6 pt-4">
          <div className="bg-[#255441] rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 text-white">
            <div className="flex items-center gap-4">
              <div className="shrink-0 relative">
                <Headphones className="w-8 h-8 text-white/80" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#C4A462] rounded-full border-2 border-[#255441]" />
              </div>
              <div className="text-right">
                <h3 className="font-bold text-lg mb-1">تحتاج مساعدة في التصميم؟</h3>
                <p className="text-xs text-white/80">فريقنا جاهز لمساعدتك في تصميم كيك يناسب مناسبتك</p>
              </div>
            </div>
            <button className="shrink-0 bg-white text-[#255441] px-6 py-2.5 rounded-full font-bold text-sm hover:bg-[#F9F7EC] transition-colors whitespace-nowrap">
              تواصل معنا
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
