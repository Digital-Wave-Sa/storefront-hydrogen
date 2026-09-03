import React, { useState } from 'react';
import { X, ChevronDown, ChevronUp, Headphones } from 'lucide-react';

export const FaqModal = ({ isOpen, onClose, isEn = false }: { isOpen: boolean; onClose: () => void; isEn?: boolean }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  if (!isOpen) return null;

  const faqsAr = [
    {
      q: 'هل يمكنني طلب كيك في نفس اليوم؟',
      a: 'الكيك المخصص يحتاج 48 ساعة كحد أدنى للتجهيز. إذا كنت تريد كيك في نفس اليوم، يمكنك تصفح تشكيلتنا الجاهزة من صفحة المنتجات.'
    },
    {
      q: 'ما هي مدة الحفظ المناسبة للكيك؟',
      a: 'يفضل حفظ الكيك في الثلاجة واستهلاكه خلال 3 إلى 4 أيام لضمان أفضل طعم وجودة.'
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

  const faqsEn = [
    {
      q: 'Can I order a custom cake for the same day?',
      a: 'Custom cakes require at least 48 hours for preparation. For same-day cakes, please browse our ready-made collection on the products page.'
    },
    {
      q: 'What is the recommended storage duration for the cake?',
      a: 'It is recommended to keep the cake refrigerated and consume it within 3 to 4 days for optimal taste and quality.'
    },
    {
      q: 'Do your products contain artificial preservatives?',
      a: 'No, all our products are freshly baked and contain zero artificial preservatives.'
    },
    {
      q: 'Can I modify my order after confirmation?',
      a: 'You can modify your order within the first 2 hours of confirmation by contacting customer support.'
    },
    {
      q: 'Can you implement custom cake designs?',
      a: 'Yes! You can upload your design image in the "Special Message" step or contact us directly.'
    },
    {
      q: 'Can the message on the cake be written in English?',
      a: 'Absolutely! We can write your message in any language as long as it fits the character limit.'
    }
  ];

  const faqs = isEn ? faqsEn : faqsAr;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" dir={isEn ? 'ltr' : 'rtl'}>
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-2 border-b border-gray-100">
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            aria-label={isEn ? 'Close modal' : 'إغلاق النافذة'}
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-[#255441]">
            {isEn ? 'Frequently Asked Questions' : 'الأسئلة الشائعة'}
          </h2>
          <div className="w-9" /> {/* Spacer for centering */}
        </div>

        {/* FAQ List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={idx} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                <button 
                  className={`w-full flex items-center justify-between gap-4 focus:outline-none ${isEn ? 'text-left' : 'text-right'}`}
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
                  <div className={`mt-3 text-sm text-[#8BA19C] leading-relaxed animate-in slide-in-from-top-1 ${isEn ? 'pr-10 pl-2' : 'pl-10 pr-2'}`}>
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/*
          Contact Footer

          Sized down on small screens: the padding, gaps, icon and type were all
          set for the side-by-side desktop row, and on a phone — where the block
          stacks — they added up to a green panel taller than the FAQ answer
          above it. Every size below returns to its original value at `sm`, so
          the desktop layout is untouched.
        */}
        <div className="p-4 pt-2 sm:p-6 sm:pt-4">
          <div className="bg-[#255441] rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-6 text-white">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="shrink-0 relative">
                <Headphones className="w-6 h-6 sm:w-8 sm:h-8 text-white/80" />
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-[#C4A462] rounded-full border-2 border-[#255441]" />
              </div>
              <div className={isEn ? 'text-left' : 'text-right'}>
                <h3 className="font-bold text-[15px] sm:text-lg mb-0.5 sm:mb-1 leading-snug">
                  {isEn ? 'Need Help with Design?' : 'تحتاج مساعدة في التصميم؟'}
                </h3>
                <p className="text-[11px] sm:text-xs text-white/80 leading-snug">
                  {isEn
                    ? 'Our team is ready to help you create a custom cake for your occasion'
                    : 'فريقنا جاهز لمساعدتك في تصميم كيك يناسب مناسبتك'}
                </p>
              </div>
            </div>
            <a
              href="https://wa.me/966920017070"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 bg-white !text-[#255441] px-5 py-2 sm:px-6 sm:py-2.5 rounded-full font-bold text-[13px] sm:text-sm hover:bg-[#F9F7EC] transition-colors whitespace-nowrap"
              style={{ color: '#255441' }}
            >
              {isEn ? 'Contact Us' : 'تواصل معنا'}
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};
