import { type MetaFunction } from 'react-router';
import { useRouteLoaderData } from 'react-router';
import { useState } from 'react';
import patternBg from '~/assets/patteren-collection-header.svg';

export const meta: MetaFunction = ({ parentsData }) => {
  const rootData = parentsData?.root as any;
  const isEn = rootData?.consent?.language?.toLowerCase() === 'en';
  return [
    { title: isEn ? 'FAQs | Saadeddin' : 'الأسئلة الشائعة | سعد الدين' },
    { name: 'description', content: isEn ? 'Find answers to frequently asked questions about our products, orders, and services.' : 'ابحث عن إجابات للأسئلة الشائعة حول منتجاتنا وطلباتنا وخدماتنا.' },
    { property: 'og:title', content: isEn ? 'FAQs | Saadeddin' : 'الأسئلة الشائعة | سعد الدين' },
    { property: 'og:description', content: isEn ? 'Find answers to frequently asked questions about our products, orders, and services.' : 'ابحث عن إجابات للأسئلة الشائعة حول منتجاتنا وطلباتنا وخدماتنا.' },
  ];
};

export default function FAQPage() {
  const rootData = useRouteLoaderData('root') as any;
  const isEn = rootData?.consent?.language?.toLowerCase() === 'en';
  
  const [openId, setOpenId] = useState<string | null>("0-0");

  const faqCategories = [
    {
      title: isEn ? "Order and Payment" : "الطلب والدفع",
      items: [
        {
          question: isEn ? "How do I use the discount code?" : "كيف استخدم كود الخصم؟",
          answer: isEn ? "Enter the code in the 'Discount Code' field on the cart page or during checkout, then click 'Apply'. The amount will be deducted automatically from your total." : "أدخل الكود في حقل 'كود الخصم' في صفحة السلة أو في خطوة الدفع، ثم اضغط 'تطبيق'. سيخصم المبلغ تلقائياً من إجمالي طلبك. يمكن استخدام كود واحد فقط لكل طلب."
        },
        {
          question: isEn ? "What are the available payment methods?" : "ما طرق الدفع المتاحة؟",
          answer: isEn ? "We accept credit cards, mada, Apple Pay, and cash on delivery." : "نقبل البطاقات الائتمانية، مدى، أبل باي، والدفع عند الاستلام."
        },
        {
          question: isEn ? "Can I modify the order after confirmation?" : "هل يمكنني تعديل الطلب بعد تأكيده؟",
          answer: isEn ? "Yes, you can contact customer service within 1 hour of placing the order to make changes." : "نعم، يمكنك التواصل مع خدمة العملاء خلال ساعة من تقديم الطلب لإجراء أي تعديلات."
        }
      ]
    },
    {
      title: isEn ? "Delivery" : "التوصيل",
      items: [
        {
          question: isEn ? "How can I track my order?" : "كيف اتتبع طلبي؟",
          answer: isEn ? "You can track it in the 'Track Your Order' section." : "يمكنك تتبع طلبك في قسم 'تتبع طلبك'."
        },
        {
          question: isEn ? "What are the available delivery areas?" : "ما هي مناطق التوصيل المتاحة؟",
          answer: isEn ? "We deliver to most major cities in Saudi Arabia." : "نقوم بالتوصيل إلى معظم المدن الرئيسية في المملكة العربية السعودية."
        },
        {
          question: isEn ? "How long does delivery take?" : "كم يستغرق التوصيل؟",
          answer: isEn ? "Delivery usually takes 2-4 hours for fresh sweets." : "عادة ما يستغرق التوصيل من ساعتين إلى ٤ ساعات للحلويات الطازجة."
        }
      ]
    },
    {
      title: isEn ? "Gifts" : "الهدايا",
      items: [
        {
          question: isEn ? "How do I add a message to the gift?" : "كيف أضيف رسالة للهدية؟",
          answer: isEn ? "You can add a message in the gift options during checkout." : "يمكنك إضافة رسالة في خيارات الهدايا أثناء الدفع."
        },
        {
          question: isEn ? "Can I hide the price from the recipient?" : "هل يمكن إخفاء السعر عن المستلم؟",
          answer: isEn ? "Yes, you can choose 'Send as gift' to hide the price." : "نعم، يمكنك اختيار 'إرسال كهدية' لإخفاء السعر."
        }
      ]
    },
    {
      title: isEn ? "Returns and Refunds" : "الإرجاع والاسترجاع",
      items: [
        {
          question: isEn ? "What is the return policy?" : "ما هي سياسة الاسترجاع؟",
          answer: isEn ? "Due to the nature of our products, returns are only accepted if damaged." : "نظراً لطبيعة منتجاتنا، فإننا نقبل الاسترجاع فقط إذا كان المنتج تالفاً."
        }
      ]
    }
  ];

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredCategories = faqCategories
    .filter(cat => activeCategory ? cat.title === activeCategory : true)
    .map(cat => ({
      ...cat,
      items: cat.items.filter(item => 
        item.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.answer.toLowerCase().includes(searchQuery.toLowerCase())
      )
    })).filter(cat => cat.items.length > 0);

  return (
    <div className={`w-full min-h-screen bg-[#FEF8EB] ${isEn ? 'font-en text-left' : 'font-ar text-right'}`} dir={isEn ? 'ltr' : 'rtl'}>
      {/* Hero Section */}
      <div className="relative w-full bg-[#234745] overflow-hidden flex flex-col items-center justify-center text-white px-[80px] py-10" style={{ minHeight: '300px' }}>
        <div
          className="absolute inset-0 pointer-events-none opacity-100"
          style={{
            backgroundImage: `url(${patternBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
        <div className="relative z-10 text-center flex flex-col items-center w-full">
          <p className="text-[12px] font-medium opacity-80 mb-2" style={{ fontFamily: "'GE Dinar One', sans-serif", lineHeight: '100%' }}>
            {isEn ? 'Help' : 'المساعدة'}
          </p>
          <h1 className="!text-[32px] md:!text-[50px] !font-bold !mb-6 !mt-0" style={{ fontFamily: "'Bahij Janna', sans-serif", lineHeight: '1.4', color: '#FEF8EB' }}>
            {isEn ? "How can we help you?" : 'كيف نستطيع مساعدتك؟'}
          </h1>
          
          {/* Search Bar */}
          <div className="relative max-w-[500px] w-full">
            <div className="relative flex items-center bg-white rounded-full overflow-hidden shadow-md">
              {/* Search Icon */}
              <div className={`absolute ${isEn ? 'left-5' : 'right-5'} text-gray-400`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </div>
              
              {/* Input */}
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isEn ? "Search in FAQs..." : "إبحث في الأسئلة الشائعة..."}
                className={`w-full h-[44px] bg-white text-gray-800 text-sm outline-none ${isEn ? 'pl-12 pr-28 text-left' : 'pr-12 pl-28 text-right'}`}
                dir={isEn ? 'ltr' : 'rtl'}
              />
              
              {/* Search Button */}
              <button className={`absolute ${isEn ? 'right-1' : 'left-1'} h-[36px] px-8 bg-[#234745] hover:bg-[#1a3533] text-white rounded-full font-bold text-sm transition-colors`}>
                {isEn ? 'Search' : 'بحث'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1280px] w-full mx-auto px-4 md:px-6 mt-10 md:mt-16 relative z-20 pb-20">
        {/* Categories Chips */}
        <div className="flex flex-wrap justify-center gap-3 mb-10" dir={isEn ? 'ltr' : 'rtl'}>
          <button 
            onClick={() => setActiveCategory(null)}
            className={`h-[40px] px-6 rounded-full font-bold text-sm transition-all ${!activeCategory ? 'bg-[#BBCFCD] text-[#234745]' : 'border border-[#234745]/20 text-[#234745]/70 hover:bg-white'}`}
          >
            {isEn ? 'All' : 'الكل'}
          </button>
          {faqCategories.map(cat => (
            <button 
              key={cat.title}
              onClick={() => setActiveCategory(cat.title)}
              className={`h-[40px] px-6 rounded-full font-bold text-sm transition-all ${activeCategory === cat.title ? 'bg-[#BBCFCD] text-[#234745]' : 'border border-[#234745]/20 text-[#234745]/70 hover:bg-white'}`}
            >
              {cat.title}
            </button>
          ))}
        </div>

        {/* Most Searched Box */}
        {!searchQuery && !activeCategory && (
        <div className="bg-white rounded-2xl border border-[#234745]/10 shadow-sm p-8 mb-12 max-w-[800px] mx-auto">
          <h2 className={`text-[26px] font-bold text-[#A07A58] flex items-center gap-2 ${isEn ? 'text-left' : 'text-right'}`} style={{ fontFamily: "'Bahij Janna', sans-serif", lineHeight: '100%', marginBottom: '40px' }}>
            {isEn ? 'Most Searched' : 'الأكثر بحثاً'}
          </h2>
          <ul className="space-y-4 text-[#234745] text-[18px]" style={{ fontFamily: "'GE Dinar One', sans-serif", fontWeight: 500, lineHeight: '100%' }} dir={isEn ? 'ltr' : 'rtl'}>
            <li className="flex items-center gap-2 justify-start cursor-pointer hover:text-[#A07A58]" onClick={() => setSearchQuery(isEn ? 'track my order' : 'اتتبع طلبي')}>
              <span className="w-1.5 h-1.5 bg-[#234745] rounded-full shrink-0"></span>
              <span>{isEn ? 'How do I track my order?' : 'كيف اتتبع طلبي؟'}</span>
            </li>
            <li className="flex items-center gap-2 justify-start cursor-pointer hover:text-[#A07A58]" onClick={() => setSearchQuery(isEn ? 'delivery areas' : 'مناطق التوصيل')}>
              <span className="w-1.5 h-1.5 bg-[#234745] rounded-full shrink-0"></span>
              <span>{isEn ? 'What are the available delivery areas?' : 'ما هي مناطق التوصيل المتاحة؟'}</span>
            </li>
            <li className="flex items-center gap-2 justify-start cursor-pointer hover:text-[#A07A58]" onClick={() => setSearchQuery(isEn ? 'return policy' : 'سياسة الاسترجاع')}>
              <span className="w-1.5 h-1.5 bg-[#234745] rounded-full shrink-0"></span>
              <span>{isEn ? 'What is the return policy?' : 'ما هي سياسة الاسترجاع؟'}</span>
            </li>
            <li className="flex items-center gap-2 justify-start cursor-pointer hover:text-[#A07A58]" onClick={() => setSearchQuery(isEn ? 'discount code' : 'كود الخصم')}>
              <span className="w-1.5 h-1.5 bg-[#234745] rounded-full shrink-0"></span>
              <span>{isEn ? 'How do I use the discount code?' : 'كيف استخدم كود الخصم؟'}</span>
            </li>
          </ul>
        </div>
        )}

        <div className="max-w-[800px] mx-auto space-y-10">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-[20px] font-bold text-[#1F413F]" style={{ fontFamily: "'Bahij Janna', sans-serif" }}>
                {isEn ? 'No results found for your search.' : 'لم يتم العثور على نتائج لبحثك.'}
              </p>
            </div>
          ) : (
            filteredCategories.map((category, catIndex) => (
            <div key={category.title}>
              <h2 className={`text-[38px] font-bold text-[#234745] ${isEn ? 'text-left' : 'text-right'}`} style={{ fontFamily: "'Bahij Janna', sans-serif", lineHeight: '100%', marginBottom: '32px' }}>
                {category.title}
              </h2>
              <div className="space-y-3">
                {category.items.map((item, itemIndex) => {
                  const id = `${category.title}-${itemIndex}`;
                  const isOpen = openId === id || !!searchQuery;
                  return (
                    <div 
                      key={id} 
                      className="bg-white rounded-[12px] border border-[#234745] overflow-hidden transition-all duration-300"
                    >
                      <button
                        onClick={() => setOpenId(isOpen && !searchQuery ? null : id)}
                        className="w-full flex items-center justify-between p-6 min-h-[72px] outline-none hover:bg-gray-50/50 transition-colors"
                      >
                        <h3 className={`text-[18px] font-bold text-[#234745] flex-1 ${isEn ? 'text-left' : 'text-right'}`} style={{ fontFamily: "'GE Dinar One', sans-serif", lineHeight: '1.4' }}>
                          {item.question}
                        </h3>
                        <svg 
                          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" 
                          className={`text-[#234745] shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} ${isEn ? 'ml-2' : 'mr-2'}`}
                        >
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </button>
                      
                      <div 
                        className={`transition-all duration-300 overflow-hidden ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
                      >
                        <div className="p-6 pt-0 text-gray-600 text-[14px] leading-relaxed border-t border-gray-100">
                          <div className="py-3" style={{ fontFamily: "'GE Dinar One', sans-serif", fontSize: '18px', fontWeight: 500, lineHeight: '1.4', color: '#9FB7AE', textAlign: isEn ? 'left' : 'right' }}>
                            {item.answer}
                          </div>
                          
                          {/* Feedback Section */}
                          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between" dir={isEn ? 'ltr' : 'rtl'}>
                            <span style={{ fontFamily: "'GE Dinar One', sans-serif", fontSize: '18px', fontWeight: 500, lineHeight: '100%', color: '#9FB7AE' }}>
                              {isEn ? "Did this help you?" : "هل افادك هذا؟"}
                            </span>
                            <div className="flex gap-3">
                              <button 
                                className="px-6 py-2 border border-[#234745] rounded-full text-[#234745] hover:bg-gray-50 transition-colors"
                                style={{ fontFamily: "'GE Dinar One', sans-serif", fontSize: '16px', fontWeight: 500 }}
                              >
                                {isEn ? "Yes" : "نعم"}
                              </button>
                              <button 
                                className="px-6 py-2 border border-[#234745] rounded-full text-[#234745] hover:bg-gray-50 transition-colors"
                                style={{ fontFamily: "'GE Dinar One', sans-serif", fontSize: '16px', fontWeight: 500 }}
                              >
                                {isEn ? "No" : "لا"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )))}
        </div>
      </div> {/* Close max-width container */}

      {/* Contact CTA */}
      <div className="w-full bg-white py-16 mt-20 text-center">
        <div className="max-w-[800px] mx-auto px-4">
          <h2 className="text-[50px] font-bold text-[#1a1a1a] mb-2" style={{ fontFamily: "'Bahij Janna', sans-serif", lineHeight: '100%' }}>
            {isEn ? "Didn't find your answer?" : "لم تجد إجابتك؟"}
          </h2>
          <p className="text-[#9FB7AE] text-[18px]" style={{ fontFamily: "'GE Dinar One', sans-serif", lineHeight: '100%', fontWeight: 500, marginBottom: '50px' }}>
            {isEn ? "Our support team is ready to help you 24/7." : "فريق الدعم جاهز لمساعدتك على مدار الساعة"}
          </p>
          
          <div className="flex flex-wrap justify-center gap-4" dir={isEn ? 'ltr' : 'rtl'}>
            {/* WhatsApp */}
            <a 
              href="https://wa.me/..." 
              className="flex items-center gap-2 bg-[#FEF8EB] text-[#234745] px-6 py-3 rounded-xl font-bold text-sm hover:bg-[#f5ebd4] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 0 0 1.335 4.993L2 22l5.233-1.373a9.92 9.92 0 0 0 4.779 1.224h.005c5.505 0 9.988-4.478 9.989-9.984 0-2.669-1.037-5.176-2.922-7.062A9.92 9.92 0 0 0 12.012 2zm6.918 14.153c-.3.843-1.491 1.538-2.052 1.636-.562.097-1.125.138-1.787-.044-.424-.117-.962-.275-1.579-.537-2.627-1.116-4.321-3.791-4.453-3.967-.132-.176-1.069-1.424-1.069-2.716 0-1.292.661-1.927.892-2.193.232-.265.507-.331.676-.331.169 0 .338.005.485.012.152.007.354-.058.554.425.203.491.693 1.692.753 1.814.06.121.1.262.019.42-.081.158-.121.262-.242.404-.121.142-.254.316-.363.425-.121.121-.248.254-.107.496.142.242.628 1.033 1.348 1.674.928.824 1.71 1.08 1.952 1.201.242.121.383.1.524-.06.142-.162.605-.705.766-.947.161-.242.323-.202.544-.121.222.081 1.41.665 1.652.786.242.121.403.182.463.282.06.1.06.581-.24.153z"/></svg>
              <span className="font-sans">WhatsApp</span>
            </a>
            
            {/* Call Us */}
            <a 
              href="tel:..." 
              className="flex items-center gap-2 bg-[#FEF8EB] text-[#234745] px-6 py-3 rounded-xl font-bold text-sm hover:bg-[#f5ebd4] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              <span>{isEn ? 'Call Us' : 'إتصل بنا'}</span>
            </a>
            
            {/* Email Us */}
            <a 
              href="mailto:..." 
              className="flex items-center gap-2 bg-[#FEF8EB] text-[#234745] px-6 py-3 rounded-xl font-bold text-sm hover:bg-[#f5ebd4] transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              <span>{isEn ? 'Email Us' : 'راسلنا'}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
