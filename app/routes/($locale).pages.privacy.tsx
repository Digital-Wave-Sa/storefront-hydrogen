import { type MetaFunction } from 'react-router';
import { useRouteLoaderData } from 'react-router';
import patternBg from '~/assets/patteren-collection-header.svg';

export const meta: MetaFunction = ({ parentsData }) => {
  const rootData = parentsData?.root as any;
  const isEn = rootData?.consent?.language?.toLowerCase() === 'en';
  return [
    { title: isEn ? 'Privacy Policy | Saadeddin' : 'سياسة الخصوصية | سعد الدين' },
    { name: 'description', content: isEn ? 'Read our privacy policy to understand how we collect, use, and protect your information.' : 'اقرأ سياسة الخصوصية الخاصة بنا لفهم كيف نجمع معلوماتك ونستخدمها ونحميها.' },
    { property: 'og:title', content: isEn ? 'Privacy Policy | Saadeddin' : 'سياسة الخصوصية | سعد الدين' },
    { property: 'og:description', content: isEn ? 'Read our privacy policy to understand how we collect, use, and protect your information.' : 'اقرأ سياسة الخصوصية الخاصة بنا لفهم كيف نجمع معلوماتك ونستخدمها ونحميها.' },
  ];
};

export default function PrivacyPage() {
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
            {isEn ? "Privacy Policy" : 'سياسة الخصوصية'}
          </h1>
        </div>
      </div>

      <div className="max-w-[800px] mx-auto px-4 md:px-6 mt-10 md:mt-16 relative z-20 pb-20">
        <div className="bg-white rounded-3xl p-8 md:p-12 border border-gray-100 shadow-sm">
          <div className="text-[#234745]/80">
            <h2 className={`text-[22px] font-bold text-[#234745] mb-4 ${isEn ? 'text-left' : 'text-right'}`} style={{ fontFamily: "'Bahij Janna', sans-serif", lineHeight: '100%' }}>
              {isEn ? "1. Information We Collect" : "١. المعلومات التي نجمعها"}
            </h2>
            <p className="mb-6 text-[16px]" style={{ fontFamily: "'GE Dinar One', sans-serif", lineHeight: '1.6' }}>
              {isEn 
                ? "We collect information you provide directly to us when you create an account, make a purchase, or contact us. This may include your name, email address, phone number, and delivery address."
                : "نحن نجمع المعلومات التي تقدمها لنا مباشرة عند إنشاء حساب، أو إجراء عملية شراء، أو التواصل معنا. قد يشمل ذلك اسمك، عنوان بريدك الإلكتروني، رقم هاتفك، وعنوان التسليم."}
            </p>

            <h2 className={`text-[22px] font-bold text-[#234745] mb-4 ${isEn ? 'text-left' : 'text-right'}`} style={{ fontFamily: "'Bahij Janna', sans-serif", lineHeight: '100%' }}>
              {isEn ? "2. How We Use Your Information" : "٢. كيف نستخدم معلوماتك"}
            </h2>
            <p className="mb-6 text-[16px]" style={{ fontFamily: "'GE Dinar One', sans-serif", lineHeight: '1.6' }}>
              {isEn 
                ? "We use the information we collect to process your orders, provide customer support, and send you updates or promotional offers (if you opt-in)."
                : "نستخدم المعلومات التي نجمعها لمعالجة طلباتك، تقديم دعم العملاء، وإرسال تحديثات أو عروض ترويجية لك (إذا اخترت ذلك)."}
            </p>

            <h2 className={`text-[22px] font-bold text-[#234745] mb-4 ${isEn ? 'text-left' : 'text-right'}`} style={{ fontFamily: "'Bahij Janna', sans-serif", lineHeight: '100%' }}>
              {isEn ? "3. Data Security" : "٣. أمن البيانات"}
            </h2>
            <p className="mb-6 text-[16px]" style={{ fontFamily: "'GE Dinar One', sans-serif", lineHeight: '1.6' }}>
              {isEn 
                ? "We implement a variety of security measures to maintain the safety of your personal information when you place an order or enter, submit, or access your personal information."
                : "نحن نطبق مجموعة متنوعة من إجراءات الأمان للحفاظ على سلامة معلوماتك الشخصية عند تقديم طلب أو إدخال معلوماتك الشخصية أو إرسالها أو الوصول إليها."}
            </p>

            <h2 className={`text-[22px] font-bold text-[#234745] mb-4 ${isEn ? 'text-left' : 'text-right'}`} style={{ fontFamily: "'Bahij Janna', sans-serif", lineHeight: '100%' }}>
              {isEn ? "4. Contact Us" : "٤. اتصل بنا"}
            </h2>
            <p className="text-[16px]" style={{ fontFamily: "'GE Dinar One', sans-serif", lineHeight: '1.6' }}>
              {isEn 
                ? "If you have any questions about our Privacy Policy, please contact us at privacy@saadeddin.com."
                : "إذا كان لديك أي أسئلة حول سياسة الخصوصية الخاصة بنا، يرجى الاتصال بنا على privacy@saadeddin.com."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
