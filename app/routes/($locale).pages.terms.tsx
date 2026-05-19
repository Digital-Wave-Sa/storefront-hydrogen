import { type MetaFunction } from 'react-router';
import { useRouteLoaderData } from 'react-router';
import patternBg from '~/assets/patteren-collection-header.svg';

export const meta: MetaFunction = ({ parentsData }) => {
  const rootData = parentsData?.root as any;
  const isEn = rootData?.consent?.language?.toLowerCase() === 'en';
  return [
    { title: isEn ? 'Terms of Service | Saadeddin' : 'الشروط والأحكام | سعد الدين' },
    { name: 'description', content: isEn ? 'Read our terms of service to understand the rules and regulations for using our site.' : 'اقرأ شروط الخدمة الخاصة بنا لفهم القواعد واللوائح الخاصة باستخدام موقعنا.' },
    { property: 'og:title', content: isEn ? 'Terms of Service | Saadeddin' : 'الشروط والأحكام | سعد الدين' },
    { property: 'og:description', content: isEn ? 'Read our terms of service to understand the rules and regulations for using our site.' : 'اقرأ شروط الخدمة الخاصة بنا لفهم القواعد واللوائح الخاصة باستخدام موقعنا.' },
  ];
};

export default function TermsPage() {
  const rootData = useRouteLoaderData('root') as any;
  const isEn = rootData?.consent?.language?.toLowerCase() === 'en';

  return (
    <div className={`w-full min-h-screen bg-[#FEF8EB] ${isEn ? 'font-en text-left' : 'font-ar text-right'}`} dir={isEn ? 'ltr' : 'rtl'}>
      {/* Hero Section */}
      <div className="relative w-full min-h-[300px] bg-[#234745] overflow-hidden flex flex-col items-center justify-center text-white px-5 md:px-[80px] py-8">
        <div
          className="absolute inset-0 pointer-events-none opacity-100"
          style={{
            backgroundImage: `url(${patternBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        <div className="relative z-10 text-center">
          <p className="text-[1rem] font-medium opacity-80 mb-2" style={{ fontFamily: "'GE Dinar One', sans-serif", lineHeight: '100%' }}>
            {isEn ? 'Legal' : 'قانوني'}
          </p>
          <h1 className="font-bold !text-[50px]" style={{ fontFamily: "'Bahij Janna', sans-serif", fontSize: '50px', fontWeight: 700, lineHeight: '100%', color: 'rgb(254, 248, 235)', textAlign: 'center', marginTop: '10px', marginBottom: '1rem' }}>
            {isEn ? "Terms of Service" : 'الشروط والأحكام'}
          </h1>
        </div>
      </div>

      <div className="max-w-[800px] mx-auto px-4 md:px-6 mt-10 md:mt-16 relative z-20 pb-20">
        <div className="bg-white rounded-3xl p-8 md:p-12 border border-gray-100 shadow-sm">
          <div className="text-[#234745]/80">
            <h2 className={`text-[22px] font-bold text-[#234745] mb-4 ${isEn ? 'text-left' : 'text-right'}`} style={{ fontFamily: "'Bahij Janna', sans-serif", lineHeight: '100%' }}>
              {isEn ? "1. Use of the Site" : "١. استخدام الموقع"}
            </h2>
            <p className="mb-6 text-[16px]" style={{ fontFamily: "'GE Dinar One', sans-serif", lineHeight: '1.6' }}>
              {isEn 
                ? "By accessing this site, you agree to comply with these Terms of Service. You may not use the site for any illegal or unauthorized purpose."
                : "من خلال الوصول إلى هذا الموقع، فإنك توافق على الالتزام بشروط الخدمة هذه. لا يجوز لك استخدام الموقع لأي غرض غير قانوني أو غير مصرح به."}
            </p>

            <h2 className={`text-[22px] font-bold text-[#234745] mb-4 ${isEn ? 'text-left' : 'text-right'}`} style={{ fontFamily: "'Bahij Janna', sans-serif", lineHeight: '100%' }}>
              {isEn ? "2. Orders and Payments" : "٢. الطلبات والمدفوعات"}
            </h2>
            <p className="mb-6 text-[16px]" style={{ fontFamily: "'GE Dinar One', sans-serif", lineHeight: '1.6' }}>
              {isEn 
                ? "All orders placed through the site are subject to acceptance. We reserve the right to refuse or cancel any order for any reason."
                : "جميع الطلبات المقدمة من خلال الموقع تخضع للقبول. نحن نحتفظ بالحق في رفض أو إلغاء أي طلب لأي سبب من الأسباب."}
            </p>

            <h2 className={`text-[22px] font-bold text-[#234745] mb-4 ${isEn ? 'text-left' : 'text-right'}`} style={{ fontFamily: "'Bahij Janna', sans-serif", lineHeight: '100%' }}>
              {isEn ? "3. Intellectual Property" : "٣. الملكية الفكرية"}
            </h2>
            <p className="mb-6 text-[16px]" style={{ fontFamily: "'GE Dinar One', sans-serif", lineHeight: '1.6' }}>
              {isEn 
                ? "All content on this site, including text, graphics, logos, and images, is the property of Saadeddin and protected by copyright laws."
                : "جميع المحتويات الموجودة على هذا الموقع، بما في ذلك النصوص والرسومات والشعارات والصور, هي ملك لشركة سعد الدين ومحمية بموجب قوانين حقوق النشر."}
            </p>

            <h2 className={`text-[22px] font-bold text-[#234745] mb-4 ${isEn ? 'text-left' : 'text-right'}`} style={{ fontFamily: "'Bahij Janna', sans-serif", lineHeight: '100%' }}>
              {isEn ? "4. Limitation of Liability" : "٤. حدود المسؤولية"}
            </h2>
            <p className="text-[16px]" style={{ fontFamily: "'GE Dinar One', sans-serif", lineHeight: '1.6' }}>
              {isEn 
                ? "Saadeddin shall not be liable for any direct, indirect, incidental, or consequential damages resulting from the use or inability to use the site."
                : "لن تكون شركة سعد الدين مسؤولة عن أي أضرار مباشرة أو غير مباشرة أو عرضية أو تبعية تنتج عن استخدام أو عدم القدرة على استخدام الموقع."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
