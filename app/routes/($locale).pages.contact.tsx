import { useEffect } from 'react';
import { type MetaFunction, type ActionFunctionArgs } from 'react-router';
import { useRouteLoaderData, useActionData, Form, useNavigation, Link } from 'react-router';
import { PageLayout } from '~/components/PageLayout';
import patternBg from '/images/second-bg-pattern.svg';

export const meta: MetaFunction = () => {
  return [
    { title: 'Contact Us | Saadeddin | اتصل بنا | سعد الدين' },
    { name: 'description', content: 'Contact us for any inquiries, support, or feedback. We are here to help. | اتصل بنا لأي استفسارات أو دعم أو ملاحظات. نحن هنا للمساعدة.' },
    { property: 'og:title', content: 'Contact Us | Saadeddin' },
    { property: 'og:description', content: 'Contact us for any inquiries, support, or feedback. We are here to help.' },
  ];
};

export async function action({ request, context }: ActionFunctionArgs) {
  const isEn = String(context?.storefront?.i18n?.language || '').toUpperCase() === 'EN';

  try {
    const formData = await request.formData();
    const fullName = String(formData.get('fullName') || '').trim();
    const mobile = String(formData.get('mobile') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const subject = String(formData.get('subject') || '').trim();
    const orderNumber = String(formData.get('orderNumber') || '').trim();
    const message = String(formData.get('message') || '').trim();

    if (!fullName || !mobile || !email || !subject || !message) {
      return {
        success: false,
        error: isEn ? 'Please fill all required fields.' : 'يرجى ملء جميع الحقول المطلوبة.'
      };
    }

    const createMutation = `
      mutation metaobjectCreate($metaobject: MetaobjectCreateInput!) {
        metaobjectCreate(metaobject: $metaobject) {
          metaobject {
            id
            handle
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const defMutation = `
      mutation metaobjectDefinitionCreate($definition: MetaobjectDefinitionCreateInput!) {
        metaobjectDefinitionCreate(definition: $definition) {
          createdDefinition {
            id
            type
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const entryVariables = {
      metaobject: {
        type: "contact_submission",
        fields: [
          { key: "full_name", value: fullName },
          { key: "mobile", value: mobile },
          { key: "email", value: email },
          { key: "subject", value: subject },
          { key: "order_number", value: orderNumber },
          { key: "message", value: message }
        ]
      }
    };

    const defVariables = {
      definition: {
        name: "Contact Submission",
        type: "contact_submission",
        fieldDefinitions: [
          { name: "Full Name", key: "full_name", type: "single_line_text_field" },
          { name: "Mobile", key: "mobile", type: "single_line_text_field" },
          { name: "Email", key: "email", type: "single_line_text_field" },
          { name: "Subject", key: "subject", type: "single_line_text_field" },
          { name: "Order Number", key: "order_number", type: "single_line_text_field" },
          { name: "Message", key: "message", type: "multi_line_text_field" }
        ]
      }
    };

    async function executeQuery(query: string, variables: any, adminToken: string, shopDomain: string) {
      if (!adminToken) return null;
      try {
        const response = await fetch(`https://${shopDomain}/admin/api/2023-04/graphql.json`, {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': adminToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ query, variables })
        });
        const text = await response.text();
        try {
          return JSON.parse(text);
        } catch {
          console.error('[CONTACT ACTION] Non-JSON response from Shopify Admin:', text.substring(0, 200));
          return null;
        }
      } catch (err) {
        console.error('[CONTACT ACTION FETCH ERROR]', err);
        return null;
      }
    }

    const { getAdminToken } = await import('~/lib/shopify-admin.server');
    const adminToken = await getAdminToken(context.env);

    const rawShop = context.env.SHOPIFY_ADMIN_DOMAIN || context.env.SHOPIFY_SHOP || context.env.PUBLIC_SHOPIFY_STORE_DOMAIN || '';
    const shopDomain = rawShop.includes('myshopify.com') ? rawShop : 'saadeldeenshop-x21xumcd.myshopify.com';

    // 1. Send submission to Shopify Native Contact Form Endpoint (Triggers Shopify store notification email)
    try {
      const shopifyFormBody = new URLSearchParams();
      shopifyFormBody.append('form_type', 'contact');
      shopifyFormBody.append('utf8', '✓');
      shopifyFormBody.append('contact[Name]', fullName);
      shopifyFormBody.append('contact[Email]', email);
      shopifyFormBody.append('contact[Phone]', mobile);
      shopifyFormBody.append('contact[Subject]', subject);
      shopifyFormBody.append('contact[Body]', `Name: ${fullName}\nPhone: ${mobile}\nEmail: ${email}\nSubject: ${subject}\nOrder Number: ${orderNumber || 'N/A'}\n\nMessage:\n${message}`);

      const shopifyResponse = await fetch(`https://${shopDomain}/contact#contact_form`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        body: shopifyFormBody.toString(),
      });
      console.log('[SHOPIFY NATIVE CONTACT FORM SUBMIT STATUS]', shopifyResponse.status);
    } catch (err) {
      console.error('[SHOPIFY NATIVE CONTACT FORM SUBMIT ERROR]', err);
    }

    // 2. Also save to Shopify Admin Metaobject as backup record
    try {
      const { getAdminToken } = await import('~/lib/shopify-admin.server');
      const adminToken = await getAdminToken(context.env);

      if (adminToken) {
        const createMutation = `
          mutation metaobjectCreate($metaobject: MetaobjectCreateInput!) {
            metaobjectCreate(metaobject: $metaobject) {
              metaobject { id handle }
              userErrors { field message }
            }
          }
        `;
        const entryVariables = {
          metaobject: {
            type: "contact_submission",
            fields: [
              { key: "full_name", value: fullName },
              { key: "mobile", value: mobile },
              { key: "email", value: email },
              { key: "subject", value: subject },
              { key: "order_number", value: orderNumber },
              { key: "message", value: message }
            ]
          }
        };
        await fetch(`https://${shopDomain}/admin/api/2023-04/graphql.json`, {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': adminToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ query: createMutation, variables: entryVariables })
        });
      }
    } catch (adminErr) {
      console.error('[SHOPIFY ADMIN METAOBJECT ERROR]', adminErr);
    }

    return {
      success: true,
      message: isEn
        ? 'Your message has been sent successfully! Our team will contact you shortly.'
        : 'تم إرسال رسالتك بنجاح! سيتواصل معك فريقنا في أقرب وقت.'
    };
  } catch (error: any) {
    console.error('[CONTACT ACTION ERROR]', error);
    return {
      success: false,
      error: isEn
        ? 'Something went wrong. Please try again later.'
        : 'حدث خطأ ما. يرجى المحاولة مرة أخرى لاحقاً.'
    };
  }
}

export async function loader() {
  return {};
}

export default function ContactPage() {
  const rootData = useRouteLoaderData('root') as any;
  const isEn = Boolean(
    rootData?.locale?.toLowerCase()?.startsWith('en') ||
    rootData?.consent?.language?.toLowerCase() === 'en'
  );
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).Shopify = (window as any).Shopify || {};
      (window as any).Shopify.shop = 'saadeldeenshop-x21xumcd.myshopify.com';

      const scriptId = 'shopify-forms-script';
      if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://cdn.shopify.com/shopifycloud/shopify_forms/latest/shopify_forms.js';
        script.async = true;
        document.body.appendChild(script);
      }
    }
  }, []);

  const scrollToForm = () => {
    const formElem = document.getElementById('contact-form');
    if (formElem) {
      formElem.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className={`w-full min-h-screen bg-[#FEF8EB] ${isEn ? 'font-en text-left' : 'font-ar text-right'}`} dir={isEn ? 'ltr' : 'rtl'}>
      {/* Hero Section */}
      <div className="relative w-full bg-[#234745] overflow-hidden flex flex-col items-center justify-center text-white px-[80px] py-10">
        <div
          className="absolute inset-0 pointer-events-none opacity-100"
          style={{
            backgroundImage: `url(${patternBg})`,
            backgroundSize: 'contain',
            backgroundPosition: 'center'
          }}
        />
        <div className="relative z-10 text-center">
          <p className="text-[16px] font-medium text-[#9FB7AE]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", lineHeight: '100%' }}>
            {isEn ? 'Contact us' : 'تواصل معنا'}
          </p>
          <h1 className="font-bold !text-[26px] md:!text-[50px]" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif", lineHeight: '1.4', color: '#FEF8EB', marginTop: '1rem', marginBottom: '1rem' }}>
            {isEn ? "We're always here to help" : 'نحن هنا دائماً لمساعدتك'}
          </h1>
          <p className="text-[14px] md:text-[16px] font-medium text-[#9FB7AE] mt-2" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", lineHeight: '100%' }}>
            {isEn ? 'Choose the best way to reach us' : 'اختر أفضل طريقة للتواصل معنا'}
          </p>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 md:px-6 mt-10 md:mt-16 relative z-20 pb-20">
        {/* Contact Method Cards */}
        <div
          className="flex md:grid md:grid-cols-4 overflow-x-auto md:overflow-x-visible snap-x snap-mandatory md:snap-none gap-4 md:gap-6 mb-16 pb-4 md:pb-0"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          <ContactCard
            title="WhatsApp"
            subtitle={isEn ? 'Fastest — Instant response' : 'الأسرع — رد فوري'}
            pill={isEn ? '+966 9200 17020' : '+966 9200 17020'}
            href="https://wa.me/966920017020"
          />
          <ContactCard
            title={isEn ? 'Phone' : 'الهاتف'}
            subtitle={isEn ? 'For urgent inquiries' : 'للاستفسارات العاجلة'}
            pill={isEn ? '920017070' : '920017070'}
            href="tel:920017070"
          />
          <ContactCard
            title={isEn ? 'Email' : 'البريد الإلكتروني'}
            subtitle={isEn ? 'Detailed requests' : 'للإستفسارات التفصيلية'}
            pill={isEn ? 'Response within 24h' : 'الرد خلال 24 ساعة'}
            onClick={scrollToForm}
          />
          <ContactCard
            title={isEn ? 'Visit Branch' : 'زيارة فرع'}
            subtitle={isEn ? '117 branches everywhere' : '117 فرع في كل مكان'}
            pill={isEn ? 'Search for nearest' : 'إبحث عن اقرب فرع'}
            href="/pages/branches"
          />
        </div>

        <div className="flex flex-col md:flex-row gap-10 lg:gap-20 items-start">
          {/* Info Column (First in code = Right in RTL) */}
          <div className="w-full md:w-[55%] space-y-12">
            <section>
              <h2 className="text-[28px] md:text-[38px] font-bold text-[#1F413F] mb-10" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif", lineHeight: '100%' }}>
                {isEn ? 'Contact Information' : 'معلومات التواصل'}
              </h2>
              <div className="space-y-0">
                <InfoRow label="WhatsApp" value="+966 9200 17020" isEn={isEn} isLtrValue />
                <InfoRow label={isEn ? 'Phone' : 'الهاتف'} value="920017070" isEn={isEn} isLtrValue />
                <InfoRow label={isEn ? 'Email' : 'البريد الإلكتروني'} value="info@saadeddin.com" isEn={isEn} isLtrValue />
              </div>
            </section>

            <section>
              <h2 className="text-[28px] md:text-[38px] font-bold text-[#1F413F] mb-10" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif", lineHeight: '100%' }}>
                {isEn ? 'Business Hours' : 'أوقات العمل'}
              </h2>
              <div className="space-y-0">
                <InfoRow label={isEn ? 'Everyday' : 'يومياً'} value={isEn ? '7:30 AM - 4:00 PM' : '7:30 ص - 4:00 م'} isEn={isEn} forceSans />
              </div>
            </section>

            <section>
              <h2 className="text-[28px] md:text-[38px] font-bold text-[#1F413F] mb-10" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif", lineHeight: '100%' }}>
                {isEn ? 'Corporate Inquiries' : 'استفسارات الشركات'}
              </h2>
              <div className="flex flex-col" style={{ width: '100%', minHeight: '160px', gap: '24px', borderRadius: '12px', padding: '12px', border: '1px solid #BBCFCD', background: 'transparent' }}>
                <div className="space-y-3">
                  <h4 className="text-[18px] font-bold text-[#1F413F] leading-snug" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif", marginTop: 0 }}>{isEn ? 'Corporate gifts or large orders?' : 'هدايا مؤسسية أو طلبات كبيرة؟'}</h4>
                  <p className="text-[14px] text-[#1F413F]/60" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", lineHeight: '1.4', fontWeight: 500 }}>
                    {isEn ? 'Our corporate team is ready to serve you with custom price quotes and full service.' : 'فريق الشركات جاهز لخدمتك بعروض أسعار مخصصة وخدمة متكاملة'}
                  </p>
                </div>
                <div className="flex justify-start">
                  <button type="button" className="bg-[#1F413F] text-white px-10 h-[48px] rounded-full font-bold text-[15px] hover:bg-[#152e2c] transition-all shadow-md" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}>
                    {isEn ? 'Seasonal Gifts' : 'الهدايا الموسمية'}
                  </button>
                </div>
              </div>
            </section>
          </div>

          {/* Form Column (Second in code = Left in RTL) */}
          <div id="contact-form" className="w-full md:w-[45%] bg-white border border-[#234745] shadow-sm overflow-hidden scroll-mt-10" style={{ borderRadius: '12px' }}>
            <div className="p-4 md:p-6 w-full" style={{ display: 'block', width: '100%', maxWidth: 'none' }}>
              {actionData?.success === true ? (
                <div className="p-10 w-full text-center flex flex-col items-center justify-center gap-6" style={{ minHeight: '400px' }}>
                  <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center text-green-600 shadow-md">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <h2 className="text-[28px] font-bold text-[#234745]" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}>
                    {isEn ? 'Thank you!' : 'شكراً لك!'}
                  </h2>
                  <p className="text-[16px] text-gray-500 max-w-[400px] leading-relaxed" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", fontWeight: 500 }}>
                    {actionData.message}
                  </p>
                  <button
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.location.reload();
                      }
                    }}
                    className="bg-[#234745] text-white px-10 h-[54px] rounded-full font-bold text-[16px] hover:bg-[#1a3533] transition-all shadow-lg"
                    style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}
                  >
                    {isEn ? 'Send another message' : 'إرسال رسالة أخرى'}
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-[20px] md:text-[26px] font-bold text-[#234745]" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif", lineHeight: '100%', marginBottom: '25px' }}>
                    {isEn ? 'Send us a message' : 'أرسل لنا رسالة'}
                  </h2>

                  {actionData?.success === false && (
                    <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-800 border border-red-200 text-center font-bold text-[15px]" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                      {actionData.error}
                    </div>
                  )}

                  <Form method="post" className="space-y-6 w-full" style={{ display: 'block', width: '100%', maxWidth: 'none' }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full" style={{ width: '100%' }}>
                      <FormField name="fullName" label={isEn ? 'Full Name' : 'الاسم الكامل'} placeholder={isEn ? 'Mohamed Al-Abdali' : 'محمد العبدلي'} required isEn={isEn} />
                      <FormField name="mobile" label={isEn ? 'Mobile Number' : 'رقم الجوال'} placeholder={isEn ? '05X XXX XXXX' : 'رقم الجوال'} required isEn={isEn} />
                    </div>

                    <FormField name="email" label={isEn ? 'Email' : 'البريد الإلكتروني'} placeholder="name@gmail.com" required type="email" isEn={isEn} forceLtr />

                    <div className="flex flex-col gap-4">
                      <label className="text-[15px] font-medium text-[#1F413F] flex items-center gap-1" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", lineHeight: '100%' }}>
                        <span>{isEn ? 'Subject' : 'الموضوع'}</span>
                        <span className="text-red-500 font-bold">*</span>
                      </label>
                      <div className="relative">
                        <select name="subject" required className={`w-full h-[58px] px-4 md:px-6 rounded-xl border border-gray-200 focus:border-[#1F413F] outline-none bg-white text-[14px] md:text-[16px] appearance-none transition-all ${isEn ? 'text-left' : 'text-right'}`} dir={isEn ? 'ltr' : 'rtl'} style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", fontWeight: 500 }}>
                          <option value="">{isEn ? 'Select Subject' : 'إختر الموضوع'}</option>
                          <option value="Inquiry">{isEn ? 'Inquiry' : 'استفسار'}</option>
                          <option value="Sales">{isEn ? 'Sales' : 'مبيعات'}</option>
                          <option value="Recruitment">{isEn ? 'Recruitment' : 'توظيف'}</option>
                          <option value="Complaint">{isEn ? 'Complaint' : 'شكوى'}</option>
                          <option value="Special Order">{isEn ? 'Special Order' : 'طلبية خاصة'}</option>
                          <option value="Catering">{isEn ? 'Catering' : 'كاتيرنج'}</option>
                          <option value="Service Proposal">{isEn ? 'Service Proposal' : 'عرض خدمة'}</option>
                          <option value="Other">{isEn ? 'Other' : 'اخرى'}</option>
                        </select>
                        <div className={`absolute top-1/2 -translate-y-1/2 pointer-events-none ${isEn ? 'right-4' : 'left-4'}`}>
                          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" className="opacity-30"><path d="M5 7l5 5 5-5H5z" /></svg>
                        </div>
                      </div>
                    </div>

                    <FormField name="orderNumber" label={isEn ? 'Order Number (Optional)' : 'رقم الطلب (إختياري)'} placeholder="sd-asdqo142" isEn={isEn} forceLtr />

                    <div className="flex flex-col gap-4">
                      <label className="text-[15px] font-medium text-[#1F413F] flex items-center gap-1" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", lineHeight: '100%' }}>
                        <span>{isEn ? 'Message' : 'الرسالة'}</span>
                        <span className="text-red-500 font-bold">*</span>
                      </label>
                      <textarea
                        name="message"
                        required
                        placeholder={isEn ? 'Write your message here...' : 'إكتب رسالتك هنا...'}
                        className={`w-full border border-gray-200 focus:border-[#1F413F] outline-none bg-white text-[14px] md:text-[16px] resize-none transition-all ${isEn ? 'text-left' : 'text-right'} placeholder:text-[#9FB7AE]`}
                        style={{
                          fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
                          fontWeight: 500,
                          height: '96px',
                          padding: '12px 16px',
                          borderRadius: '12px',
                          maxWidth: '580px'
                        }}
                      />
                    </div>



                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-[50px] bg-[#234745] text-white rounded-full font-bold text-[16px] hover:bg-[#1a3533] disabled:opacity-50 transition-all mt-6 flex items-center justify-center gap-2"
                      style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}
                    >
                      {isSubmitting ? (
                        <span>{isEn ? 'Sending...' : 'جاري الإرسال...'}</span>
                      ) : (
                        <span>{isEn ? 'Send Message' : 'إرسال الرسالة'}</span>
                      )}
                    </button>
                  </Form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


function ContactCard({ title, subtitle, pill, href, onClick }: any) {
  const cardInner = (
    <div
      className="bg-white p-6 md:p-6 border border-[#234745] flex flex-col items-center justify-center text-center transition-all min-h-[180px] w-[200px] md:w-full flex-shrink-0 snap-start snap-always hover:shadow-md cursor-pointer group"
      style={{ borderRadius: '12px' }}
      onClick={onClick}
    >
      <h3 className="text-[24px] md:text-[28px] font-bold text-[#1F413F] mb-3 group-hover:text-[#234745] transition-colors" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif", lineHeight: '100%' }}>{title}</h3>
      <p
        className="text-[14px] md:text-[15px] text-[#9FB7AE] !mb-6 font-medium"
        style={{ lineHeight: '1.4', fontWeight: 500, marginBottom: '24px', fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}
      >
        {subtitle}
      </p>
      <div
        className="inline-flex text-[14px] items-center justify-center px-8 h-[40px] font-bold bg-[#BBCFCD] group-hover:bg-[#ACC4C2] text-[#234745] transition-colors whitespace-nowrap cursor-pointer shadow-sm"
        style={{
          borderRadius: '1000px',
          fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif",
          fontWeight: 700,
          lineHeight: '100%',
          minWidth: '89px'
        }}
        dir="auto"
      >
        {pill}
      </div>
    </div>
  );

  if (href) {
    if (href.startsWith('http') || href.startsWith('tel:')) {
      return (
        <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noopener noreferrer' : undefined} className="block w-full text-left no-underline">
          {cardInner}
        </a>
      );
    }
    return (
      <Link to={href} className="block w-full text-left no-underline">
        {cardInner}
      </Link>
    );
  }

  return cardInner;
}

function FormField({ label, placeholder, required, type = "text", isEn, forceLtr = false, name }: any) {
  const isLtrDir = isEn || forceLtr;
  return (
    <div className={`flex flex-col gap-3 ${isEn ? 'text-left' : 'text-right'}`} style={{ width: '100%' }}>
      <label className="text-[14px] font-medium text-[#1F413F] flex items-center gap-1" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", lineHeight: '100%' }}>
        <span>{label}</span>
        {required && <span className="text-red-500 font-bold">*</span>}
      </label>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        required={required}
        dir={isLtrDir ? 'ltr' : 'rtl'}
        className={`w-full h-[54px] text-[14px] md:text-[16px] px-4 rounded-xl border border-gray-200 focus:border-[#1F413F] outline-none bg-white text-[15px] transition-all placeholder:text-[#9FB7AE] ${isLtrDir ? 'text-left' : 'text-right'}`}
        style={{ fontFamily: forceLtr ? "sans-serif" : "'GE Dinar One', sans-serif", fontWeight: 500 }}
      />
    </div>
  );
}

function InfoRow({ label, value, isEn, isLtrValue = false, forceSans = false }: any) {
  return (
    <div className="flex items-center justify-between py-5 border-b border-[#1F413F]/5">
      <span className="text-[14px] md:text-[16px] font-medium text-[#9FB7AE]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", lineHeight: '100%' }}>{label}</span>
      <span
        className={`text-[14px] md:text-[16px] font-bold text-[#1F413F] tracking-tight ${isLtrValue && !isEn ? 'text-left flex-1 pl-4' : ''}`}
        dir={isLtrValue ? "ltr" : "auto"}
        style={{ fontFamily: (isLtrValue || forceSans) ? "sans-serif" : "'GE Dinar One', sans-serif", lineHeight: '100%', fontWeight: 700 }}
      >
        {value}
      </span>
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
