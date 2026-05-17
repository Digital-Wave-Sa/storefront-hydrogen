import { type MetaFunction } from 'react-router';
import { useRouteLoaderData } from 'react-router';
import { PageLayout } from '~/components/PageLayout';
import patternBg from '~/assets/patteren-collection-header.svg';

export const meta: MetaFunction = () => {
  return [{ title: 'Contact Us | Saadeddin' }];
};

export default function ContactPage() {
  const rootData = useRouteLoaderData('root') as any;
  const isEn = rootData?.locale === 'en';
  return (
    <div className={`w-full min-h-screen bg-[#FEF8EB] ${isEn ? 'font-en text-left' : 'font-ar text-right'}`} dir={isEn ? 'ltr' : 'rtl'}>
      {/* Hero Section */}
      <div className="relative w-full h-[184px] bg-[#234745] overflow-hidden flex flex-col items-center justify-center text-white px-5 md:px-[80px] py-8">
        <div
          className="absolute inset-0 pointer-events-none opacity-100"
          style={{
            backgroundImage: `url(${patternBg})`,
            backgroundSize: '100% 100%',
            backgroundPosition: 'center'
          }}
        />
        <div className="relative z-10 text-center">
          <p className="text-[14px] md:text-[16px] font-medium opacity-80 mb-2" style={{ fontFamily: "'Bahij Janna', sans-serif" }}>
            {isEn ? 'Contact us' : 'تواصل معنا'}
          </p>
          <h1 className="text-[32px] md:text-[44px] font-bold leading-tight" style={{ fontFamily: "'Bahij Janna', sans-serif", margin: 0 }}>
            {isEn ? "We're always here to help" : 'نحن هنا دائماً لمساعدتك'}
          </h1>
          <p className="text-[14px] md:text-[16px] font-medium opacity-80 mt-2" style={{ fontFamily: "'Bahij Janna', sans-serif" }}>
            {isEn ? 'Choose the best way to reach us' : 'اختر أفضل طريقة للتواصل معنا'}
          </p>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 md:px-6 mt-10 md:mt-16 relative z-20 pb-20">
        {/* Contact Method Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-16">
          <ContactCard 
            title="WhatsApp" 
            subtitle={isEn ? 'Response in minutes' : 'الرد خلال دقائق'} 
            pill={isEn ? '8 AM - 12 PM' : '٨ ص - ١٢ م'} 
          />
          <ContactCard 
            title={isEn ? 'Phone' : 'الهاتف'} 
            subtitle={isEn ? 'General inquiries' : 'الاستفسارات العامة'} 
            pill={isEn ? '8 AM - 11 PM' : '٨ ص - ١١ م'} 
          />
          <ContactCard 
            title={isEn ? 'Email' : 'البريد الإلكتروني'} 
            subtitle={isEn ? 'Detailed requests' : 'للإستفسارات التفصيلية'} 
            pill={isEn ? 'Response within 24h' : 'الرد خلال ٢٤ ساعة'} 
          />
          <ContactCard 
            title={isEn ? 'Visit Branch' : 'زيارة فرع'} 
            subtitle={isEn ? '117 branches everywhere' : '١١٧ فرع في كل مكان'} 
            pill={isEn ? 'Search for nearest' : 'إبحث عن اقرب فرع'} 
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-20 items-start">
          {/* Info Column (First in code = Right in RTL) */}
          <div className="md:col-span-5 xl:col-span-4 space-y-12">
            <section>
              <h2 className="text-[28px] md:text-[34px] font-bold text-[#1F413F] mb-10" style={{ fontFamily: "'Bahij Janna', sans-serif" }}>
                {isEn ? 'Contact Information' : 'معلومات التواصل'}
              </h2>
              <div className="space-y-0">
                <InfoRow label="WhatsApp" value="+966 5X XXX XXXX" isEn={isEn} />
                <InfoRow label={isEn ? 'Phone' : 'الهاتف'} value="9200 XXXXX" isEn={isEn} />
                <InfoRow label={isEn ? 'Email' : 'البريد الإلكتروني'} value="hello@saadeddin.com" isEn={isEn} />
              </div>
            </section>

            <section>
              <h2 className="text-[28px] md:text-[34px] font-bold text-[#1F413F] mb-10" style={{ fontFamily: "'Bahij Janna', sans-serif" }}>
                {isEn ? 'Business Hours' : 'أوقات العمل'}
              </h2>
              <div className="space-y-0">
                <InfoRow label={isEn ? 'Sun - Thu' : 'الأحد - الخميس'} value={isEn ? '8 AM - 11 PM' : '٨ ص - ١١ م'} isEn={isEn} />
                <InfoRow label={isEn ? 'Fri - Sat' : 'الجمعة - السبت'} value={isEn ? '10 AM - 12 PM' : '١٠ ص - ١٢ م'} isEn={isEn} />
              </div>
            </section>

            <section>
              <h2 className="text-[28px] md:text-[34px] font-bold text-[#1F413F] mb-10" style={{ fontFamily: "'Bahij Janna', sans-serif" }}>
                {isEn ? 'Corporate Inquiries' : 'استفسارات الشركات'}
              </h2>
              <div className="bg-[#F9F7F2] rounded-[24px] p-8 border border-gray-100 flex flex-col gap-8 shadow-sm">
                <div className="space-y-3">
                  <h4 className="text-[18px] font-bold text-[#1F413F] leading-snug">{isEn ? 'Corporate gifts or large orders?' : 'هدايا مؤسسية أو طلبات كبيرة؟'}</h4>
                  <p className="text-[14px] text-[#1F413F]/60 leading-relaxed">
                    {isEn ? 'Our corporate team is ready to serve you with custom price quotes and full service.' : 'فريق الشركات جاهز لخدمتك بعروض أسعار مخصصة وخدمة متكاملة'}
                  </p>
                </div>
                <div className="flex justify-end">
                  <button type="button" className="bg-[#1F413F] text-white px-10 h-[48px] rounded-full font-bold text-[15px] hover:bg-[#152e2c] transition-all shadow-md">
                    {isEn ? 'Seasonal Gifts' : 'الهدايا الموسمية'}
                  </button>
                </div>
              </div>
            </section>
          </div>

          {/* Form Column (Second in code = Left in RTL) */}
          <div className="md:col-span-7 xl:col-span-8 bg-white border border-[#234745] shadow-sm overflow-hidden" style={{ borderRadius: '32px' }}>
            <div className="p-8 md:p-14">
              <h2 className="text-[28px] md:text-[36px] font-bold text-[#1F413F] mb-12" style={{ fontFamily: "'Bahij Janna', sans-serif" }}>
                {isEn ? 'Send us a message' : 'أرسل لنا رسالة'}
              </h2>

              <form className="space-y-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                  <FormField label={isEn ? 'Full Name' : 'الاسم الكامل'} placeholder={isEn ? 'Mohamed Al-Abdali' : 'محمد العبدلي'} required isEn={isEn} />
                  <FormField label={isEn ? 'Mobile Number' : 'رقم الجوال'} placeholder={isEn ? '05X XXX XXXX' : 'رقم الجوال'} required isEn={isEn} />
                </div>

                <FormField label={isEn ? 'Email' : 'البريد الإلكتروني'} placeholder="name@gmail.com" required type="email" isEn={isEn} />

                <div className="flex flex-col gap-4">
                  <label className={`text-[15px] font-bold text-[#1F413F] flex items-center gap-1 ${isEn ? 'flex-row' : 'flex-row-reverse'}`}>
                    <span>{isEn ? 'Subject' : 'الموضوع'}</span>
                    <span className="text-red-500 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <select className={`w-full h-[58px] px-6 rounded-2xl border border-gray-200 focus:border-[#1F413F] outline-none bg-white text-[16px] appearance-none transition-all ${isEn ? 'text-left' : 'text-right'}`} dir={isEn ? 'ltr' : 'rtl'}>
                      <option>{isEn ? 'Select Subject' : 'إختر الموضوع'}</option>
                    </select>
                    <div className={`absolute top-1/2 -translate-y-1/2 pointer-events-none ${isEn ? 'right-6' : 'left-6'}`}>
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" className="opacity-30"><path d="M5 7l5 5 5-5H5z" /></svg>
                    </div>
                  </div>
                </div>

                <FormField label={isEn ? 'Order Number (Optional)' : 'رقم الطلب (إختياري)'} placeholder="sd-asdqo142" isEn={isEn} />

                <div className="flex flex-col gap-4">
                  <label className={`text-[15px] font-bold text-[#1F413F] flex items-center gap-1 ${isEn ? 'flex-row' : 'flex-row-reverse'}`}>
                    <span>{isEn ? 'Message' : 'الرسالة'}</span>
                    <span className="text-red-500 font-bold">*</span>
                  </label>
                  <textarea
                    rows={7}
                    placeholder={isEn ? 'Write your message here...' : 'إكتب رسالتك هنا...'}
                    className={`w-full p-6 rounded-2xl border border-gray-200 focus:border-[#1F413F] outline-none bg-white text-[16px] resize-none transition-all ${isEn ? 'text-left' : 'text-right'}`}
                  />
                </div>

                <div className="flex flex-col gap-4">
                  <label className={`text-[15px] font-bold text-[#1F413F] ${isEn ? 'text-left' : 'text-right'}`}>
                    {isEn ? 'Add Attachment (Optional)' : 'إضافة مرفق (إختياري)'}
                  </label>
                  <div 
                    className="w-full h-[140px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-gray-50/50 transition-all"
                    style={{ borderColor: '#D1B8A7' }}
                  >
                    <span className="text-[16px] font-bold text-[#1F413F]">{isEn ? 'Add Attachment' : 'إضافة مرفق'}</span>
                    <span className="text-[13px] text-gray-400">{isEn ? 'Photos or PDF — Max 5MB' : 'صور او PDF — حجم اقصى ٥ ميجابايت'}</span>
                  </div>
                </div>

                <button 
                  type="button" 
                  className="w-full h-[64px] bg-[#234745] text-white rounded-full font-bold text-[18px] hover:bg-[#1a3533] transition-all mt-6 shadow-xl shadow-[#234745]/20"
                  style={{ fontFamily: "'Bahij Janna', sans-serif" }}
                >
                  {isEn ? 'Send Message' : 'إرسال الرسالة'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


function ContactCard({ title, subtitle, pill }: any) {
  return (
    <div
      className="bg-white p-6 md:p-10 border border-[#234745] flex flex-col items-center justify-center text-center transition-all min-h-[200px] w-full"
      style={{ borderRadius: '32px' }}
    >
      <h3 className="text-[24px] md:text-[28px] font-bold text-[#1F413F] mb-3" style={{ fontFamily: "'Bahij Janna', sans-serif" }}>{title}</h3>
      <p 
        className="text-[14px] md:text-[15px] text-[#A8BDB5] !mb-6 font-medium leading-tight"
        style={{ marginBottom: '24px' }}
      >
        {subtitle}
      </p>
      <div
        className="inline-flex items-center justify-center px-8 h-[40px] font-bold bg-[#BBCFCD] text-[#1F413F] transition-colors whitespace-nowrap"
        style={{
          borderRadius: '1000px',
          fontFamily: "'Bahij Janna', sans-serif",
          minWidth: '89px'
        }}
      >
        {pill}
      </div>
    </div>
  );
}

function FormField({ label, placeholder, required, type = "text", isEn }: any) {
  return (
    <div className={`flex flex-col gap-3 ${isEn ? 'text-left' : 'text-right'}`}>
      <label className={`text-[14px] font-bold text-[#1F413F] flex items-center gap-1 ${isEn ? 'flex-row' : 'flex-row-reverse'}`}>
        <span>{label}</span>
        {required && <span className="text-red-500 font-bold">*</span>}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        className={`w-full h-[54px] px-6 rounded-xl border border-gray-200 focus:border-[#1F413F] outline-none bg-white text-[15px] transition-all placeholder:text-gray-300 ${isEn ? 'text-left' : 'text-right'}`}
      />
    </div>
  );
}

function InfoRow({ label, value, isEn }: any) {
  return (
    <div className={`flex items-center justify-between py-5 border-b border-[#1F413F]/5 ${isEn ? 'flex-row' : 'flex-row-reverse'}`}>
      <span className="text-[14px] font-bold text-gray-400/80">{label}</span>
      <span className="text-[16px] font-bold text-[#1F413F] tracking-tight">{value}</span>
    </div>
  );
}

// Icons
function WhatsAppIcon({ className }: any) {
  return <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .004 5.408.001 12.045a11.811 11.811 0 001.592 5.961L0 24l6.117-1.605a11.803 11.803 0 005.925 1.583h.005c6.637 0 12.046-5.408 12.049-12.048a11.822 11.822 0 00-3.417-8.52" /></svg>;
}

function PhoneIcon({ className }: any) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>;
}

function MailIcon({ className }: any) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>;
}

function MapPinIcon({ className }: any) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>;
}
