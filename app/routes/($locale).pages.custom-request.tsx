import { useState, useEffect } from 'react';
import { type MetaFunction, useRouteLoaderData, Link, useFetcher, data, type LoaderFunctionArgs } from 'react-router';

import {pageTitle} from '~/lib/seo';
export const meta: MetaFunction = ({matches}) => {
  return [{title: pageTitle(matches, 'Custom Corporate Request', 'طلب باقة مخصصة')}];
};

export async function action({request, context}: LoaderFunctionArgs) {
  const isEn =
    String(context?.storefront?.i18n?.language || '').toUpperCase() === 'EN';

  try {
    const formData = await request.formData();
    const companyName = String(formData.get('companyName') || '').trim();
    const contactName = String(formData.get('contactName') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const phone = String(formData.get('phone') || '').trim();
    const quantity = String(formData.get('quantity') || '').trim();
    const budgetPerBox = String(formData.get('budgetPerBox') || '').trim();
    const specialRequirements = String(formData.get('specialRequirements') || '').trim();

    if (!contactName || !email || !phone) {
      return data({
        success: false,
        error: isEn ? 'Please fill required fields' : 'يرجى ملء جميع الحقول المطلوبة',
      });
    }

    const {
      uploadToShopifyFiles,
      recordCorporateQuote,
      quoteAdminUrl,
    } = await import('~/lib/corporate-quote.server');

    /**
     * The brand-assets field takes several files at once, so they land in
     * the metaobject's `attachments` list rather than the single `logo` and
     * `brand_guide` references the corporate modal uses.
     *
     * Capped at five. The field is an open "drag your brand folder here"
     * invitation and somebody will eventually drop thirty files into it;
     * five uploads is already the slowest thing this action does, and the
     * rest can be asked for by reply.
     */
    const MAX_ATTACHMENTS = 5;
    const allFiles = formData
      .getAll('brandAssets')
      .filter((f): f is File => f instanceof File && f.size > 0);
    const submittedFiles = allFiles.slice(0, MAX_ATTACHMENTS);

    const uploaded = (
      await Promise.all(
        submittedFiles.map((file) =>
          uploadToShopifyFiles(context.env, file, 'custom-request-asset'),
        ),
      )
    ).filter((f): f is NonNullable<typeof f> => Boolean(f));

    /**
     * Storage first, notification second -- see corporate-quote.server.ts.
     * These land in the same `corporate_quote_request` list as the two forms
     * on /corporate, separated by `source`, because the team works them as
     * one queue and splitting them across two metaobject types would only
     * mean two places to forget to look.
     */
    const stored = await recordCorporateQuote(context.env, {
      companyName,
      contactName,
      email,
      phone,
      quantity,
      budgetPerBox,
      notes: specialRequirements,
      attachmentFileIds: uploaded.map((f) => f.id),
      source: 'custom-request',
      locale: isEn ? 'en' : 'ar',
    });

    const adminLink = stored ? quoteAdminUrl(context.env, stored.id) : null;

    const {sendFormEmailNotification} = await import('~/lib/email.server');
    await sendFormEmailNotification(
      {
        formType: 'custom_request',
        formTitle: 'Custom Package Request (طلب الباقة المخصصة للهدايا المؤسسية)',
        fullName: contactName,
        email,
        phone,
        companyName,
        quantity,
        budget: budgetPerBox,
        subject: `Custom Package Request - ${companyName || contactName}`,
        message: [
          specialRequirements || 'No notes provided.',
          uploaded.length
            ? `\nBrand assets (${uploaded.length}):\n${uploaded
                .map(
                  (f) =>
                    `- ${f.filename}${f.url ? ` — ${f.url}` : ' (uploaded; still processing)'}`,
                )
                .join('\n')}`
            : null,
          allFiles.length > MAX_ATTACHMENTS
            ? `Note: the customer attached ${allFiles.length} files; only the first ${MAX_ATTACHMENTS} were kept. Ask them for the rest by reply.`
            : null,
          adminLink ? `Saved in Shopify: ${adminLink}` : null,
          stored
            ? null
            : 'WARNING: this request could NOT be saved to Shopify. This email is the only copy.',
        ]
          .filter(Boolean)
          .join('\n'),
      },
      context.env,
    );

    return data({success: true, stored: Boolean(stored)});
  } catch (err) {
    return data({
      success: false,
      error: isEn ? 'Submission failed, please try again' : 'حدث خطأ، يرجى المحاولة لاحقاً',
    });
  }
}

export default function CustomRequestPage() {
  const rootData = useRouteLoaderData('root') as any;
  const isEn = rootData?.locale === 'en';

  const [submitted, setSubmitted] = useState(false);
  const [attachmentNames, setAttachmentNames] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    quantity: '200',
    budgetPerBox: '',
    deliveryDate: '',
    specialRequirements: '',
    brandAssetsUploaded: false,
  });

  const requestFetcher = useFetcher<{success?: boolean; error?: string}>();
  const loading = requestFetcher.state !== 'idle';

  /**
   * The thank-you screen used to appear on a 400ms timer running alongside
   * the submit, so it said "received" whether or not the action answered,
   * and always before it had. It now waits for the action.
   */
  useEffect(() => {
    if (requestFetcher.state === 'idle' && requestFetcher.data?.success) {
      setSubmitted(true);
    }
  }, [requestFetcher.state, requestFetcher.data]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    requestFetcher.submit(new FormData(e.currentTarget), {
      method: 'post',
      encType: 'multipart/form-data',
    });
  };

  return (
    <div className="w-full bg-[#FEF8EB] min-h-screen py-12 md:py-20 px-4 sm:px-6 lg:px-8" dir={isEn ? 'ltr' : 'rtl'}>
      <div className="max-w-[1100px] mx-auto">
        {/* Header Breadcrumb & Title */}
        <div className="flex flex-col gap-3 mb-10 text-start">
          <div className="flex items-center gap-2 text-[14px] text-[#906B51]">
            <Link to={isEn ? '/en/corporate' : '/corporate'} className="hover:underline font-bold">
              {isEn ? 'Corporate Gifts' : 'الهدايا المؤسسية'}
            </Link>
            <span>/</span>
            <span className="text-[#234745] font-medium">
              {isEn ? 'Custom Package Request' : 'طلب الباقة المخصصة'}
            </span>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white text-[#906B51] font-bold text-[13px] w-max border border-[#E6E2D8]">
            {isEn ? 'Bespoke Corporate Package (Min 200 Boxes)' : 'الباقة المخصصة (الحد الأدنى 200 علبة)'}
          </div>

          <h1
            className="text-[32px] sm:text-[44px] text-[#234745] font-bold leading-tight m-0"
            style={{ fontFamily: isEn ? 'inherit' : "'Bahij Janna', sans-serif" }}
          >
            {isEn ? 'Custom Corporate Package Request' : 'نموذج طلب الباقة المخصصة للهدايا المؤسسية'}
          </h1>
          <p className="text-[16px] text-[#8B9895] max-w-2xl m-0 leading-relaxed">
            {isEn
              ? 'Design your corporate gift from scratch — content, packaging, colors, and identity. Fill in your requirements and our team will contact you within 24 hours with a sample approval & Draft Order.'
              : 'صمّم هديتك المؤسسية بما يعكس هويتك بالكامل من الصفر (محتوى، تغليف، ألوان، شعار). املأ التفاصيل وسيتواصل معك فريقنا خلال 24 ساعة لتأكيد الطلب وإصدار فاتورة مسودة (Draft Order).'}
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-[24px] p-6 sm:p-10 border border-[#E6E2D8] shadow-md">
          {submitted ? (
            <div className="bg-[#FEF8EB] border border-[#C5A96A]/60 rounded-[20px] p-10 text-center flex flex-col items-center gap-5 my-4">
              <div className="w-20 h-20 bg-[#234745] text-white rounded-full flex items-center justify-center text-4xl font-bold">
                ✓
              </div>
              <h2 className="text-[26px] font-bold text-[#234745] m-0">
                {isEn ? 'Custom Request Submitted Successfully!' : 'تم استلام طلب الباقة المخصصة بنجاح!'}
              </h2>
              <p className="text-[16px] text-[#8B9895] max-w-xl m-0 leading-relaxed">
                {isEn
                  ? 'Your request has been forwarded to info@saadeddin.com. Our corporate sales manager will review your brand assets and issue a Draft Order within 24 hours.'
                  : 'تم تحويل طلبك بنجاح إلى info@saadeddin.com. سيتواصل معك مدير حسابك المختص خلال 24 ساعة لمراجعة الأصول وإصدار فاتورة مسودة (Draft Order).'}
              </p>

              {/* Delivery Lead Time Note */}
              <div className="bg-white px-5 py-3 rounded-full border border-[#E6E2D8] text-[14px] text-[#906B51] font-bold my-2">
                {isEn ? '⏱ Expected Delivery Lead Time: 10 - 15 Business Days' : '⏱ وقت التسليم المتوقع: 10 - 15 يوم عمل'}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mt-4">
                <a
                  href="https://wa.me/966920017070"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-[#25D366] text-white font-bold py-3.5 rounded-full text-[15px] flex items-center justify-center gap-2 hover:bg-[#20bd5a] transition-all shadow-sm"
                >
                  <span>💬</span>
                  <span>{isEn ? 'WhatsApp: +966 9200 17070' : 'واتساب للأعمال: +966 9200 17070'}</span>
                </a>
                <Link
                  to={isEn ? '/en/corporate' : '/corporate'}
                  className="px-8 py-3.5 border border-[#234745] text-[#234745] font-bold rounded-full text-[15px] hover:bg-gray-50 text-center transition-colors"
                >
                  {isEn ? 'Back to Corporate' : 'العودة لصفحة الهدايا'}
                </Link>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              encType="multipart/form-data"
              className="flex flex-col gap-6 text-start"
            >
              <div className="border-b border-[#E6E2D8] pb-4 mb-2">
                <h3 className="text-[20px] font-bold text-[#234745] m-0" style={{ fontFamily: isEn ? 'inherit' : "'Bahij Janna', sans-serif" }}>
                  {isEn ? '1. Company & Contact Info' : '1. معلومات الشركة والمسؤول'}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[14px] font-bold text-[#234745] mb-2">
                    {isEn ? 'Company Name *' : 'اسم الشركة *'}
                  </label>
                  <input
                    type="text"
                    name="companyName"
                    required
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder={isEn ? 'e.g. Acme Corporation' : 'مثال: شركة الحلول التقنية المتقدمة'}
                    className="w-full border border-[#E6E2D8] rounded-[14px] px-4 py-3 text-[15px] focus:outline-none focus:border-[#234745]"
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-bold text-[#234745] mb-2">
                    {isEn ? 'Contact Person Name *' : 'اسم المسؤول عن الطلب *'}
                  </label>
                  <input
                    type="text"
                    name="contactName"
                    required
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    placeholder={isEn ? 'Full Name' : 'الاسم الثلاثي'}
                    className="w-full border border-[#E6E2D8] rounded-[14px] px-4 py-3 text-[15px] focus:outline-none focus:border-[#234745]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[14px] font-bold text-[#234745] mb-2">
                    {isEn ? 'Email Address *' : 'البريد الإلكتروني *'}
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@company.com"
                    className="w-full border border-[#E6E2D8] rounded-[14px] px-4 py-3 text-[15px] focus:outline-none focus:border-[#234745]"
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-bold text-[#234745] mb-2">
                    {isEn ? 'Phone Number *' : 'رقم الجوال *'}
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="05xxxxxxx"
                    className="w-full border border-[#E6E2D8] rounded-[14px] px-4 py-3 text-[15px] focus:outline-none focus:border-[#234745]"
                  />
                </div>
              </div>

              <div className="border-b border-[#E6E2D8] pb-4 mb-2 mt-4">
                <h3 className="text-[20px] font-bold text-[#234745] m-0" style={{ fontFamily: isEn ? 'inherit' : "'Bahij Janna', sans-serif" }}>
                  {isEn ? '2. Package Specifications & Brand Assets' : '2. مواصفات الباقة وأصول الهوية'}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[14px] font-bold text-[#234745] mb-2">
                    {isEn ? 'Expected Quantity (Minimum 200) *' : 'الكمية المتوقعة (الحد الأدنى 200 علبة) *'}
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    min="200"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full border border-[#E6E2D8] rounded-[14px] px-4 py-3 text-[15px] focus:outline-none focus:border-[#234745]"
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-bold text-[#234745] mb-2">
                    {isEn ? 'Target Budget per Box (SAR)' : 'الميزانية المستهدفة للعلبة الواحدة (ريال)'}
                  </label>
                  <input
                    type="text"
                    name="budgetPerBox"
                    value={formData.budgetPerBox}
                    onChange={(e) => setFormData({ ...formData, budgetPerBox: e.target.value })}
                    placeholder={isEn ? 'e.g. 150-300 SAR' : 'مثال: 150 - 300 ريال'}
                    className="w-full border border-[#E6E2D8] rounded-[14px] px-4 py-3 text-[15px] focus:outline-none focus:border-[#234745]"
                  />
                </div>
              </div>

              {/* Brand Assets Upload Field (Logo + Colors + References) */}
              <div>
                <label className="block text-[14px] font-bold text-[#234745] mb-2">
                  {isEn ? 'Upload Brand Assets (Logo, Colors, Style Guidelines)' : 'رفع أصول الهوية البصرية (الشعار، الألوان، دليل الهوية)'}
                </label>
                <div className="border-2 border-dashed border-[#E6E2D8] hover:border-[#234745] rounded-[16px] p-6 text-center bg-[#FEF8EB]/40 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors">
                  <div className="text-3xl">📁</div>
                  <p className="text-[14px] text-[#234745] font-bold m-0">
                    {isEn ? 'Click to select or drag & drop files here' : 'اضغط لاختيار الملفات أو اسحب أصول الهوية هنا'}
                  </p>
                  <p className="text-[12px] text-[#8B9895] m-0">
                    {isEn
                      ? 'Supports PNG, SVG, AI, PDF, ZIP — up to 5 files, 3MB each'
                      : 'يدعم صور الشعار ورسومات AI و PDF و ZIP — حتى 5 ملفات، 3 ميجابايت لكل ملف'}
                  </p>
                  {/**
                   * This input had no `name`, so nothing it held was ever
                   * submitted. Its onChange only flipped a boolean used to
                   * tick the field as "done" -- the files themselves were
                   * read into the browser and dropped with the page.
                   */}
                  <input
                    type="file"
                    name="brandAssets"
                    multiple
                    accept="image/*,.pdf,.svg,.ai,.eps,.zip"
                    onChange={(e) => {
                      const picked = Array.from(e.target.files || []);
                      setAttachmentNames(picked.map((f) => f.name));
                      setFormData({
                        ...formData,
                        brandAssetsUploaded: picked.length > 0,
                      });
                    }}
                    className="hidden"
                    id="brand-assets-file"
                  />
                  {attachmentNames.length > 0 && (
                    <ul className="m-0 mt-1 list-none p-0 text-[12px] font-bold text-[#234745]">
                      {attachmentNames.map((n) => (
                        <li key={n} className="truncate max-w-[320px]">
                          {n}
                        </li>
                      ))}
                    </ul>
                  )}
                  <label htmlFor="brand-assets-file" className="mt-2 bg-[#234745] text-white px-5 py-2 rounded-full font-bold text-[13px] cursor-pointer hover:bg-[#1a3533]">
                    {isEn ? 'Select Files' : 'اختيار الملفات'}
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[14px] font-bold text-[#234745] mb-2">
                  {isEn ? 'Special Notes & Identity Instructions' : 'ملاحظات واشتراطات الهوية الخاصة'}
                </label>
                <textarea
                  rows={4}
                  name="specialRequirements"
                  value={formData.specialRequirements}
                  onChange={(e) => setFormData({ ...formData, specialRequirements: e.target.value })}
                  placeholder={isEn ? 'Specify preferred box material, ribbon colors, custom gift card text...' : 'حدد المواد المفضلة، ألوان الشريط، رسالة كرت الإهداء، موعد المناسبة...'}
                  className="w-full border border-[#E6E2D8] rounded-[14px] px-4 py-3 text-[15px] focus:outline-none focus:border-[#234745]"
                />
              </div>

              {/* A failed submit has to be visible. The old handler could
                  not fail, so there was nowhere for an error to show. */}
              {requestFetcher.state === 'idle' &&
                requestFetcher.data?.success === false && (
                  <div
                    role="alert"
                    className="rounded-[14px] border border-red-300 bg-red-50 px-4 py-3 text-[14px] font-bold text-red-700"
                  >
                    {requestFetcher.data?.error ||
                      (isEn
                        ? 'Something went wrong. Please try again, or WhatsApp us below.'
                        : 'تعذّر إرسال الطلب. حاول مرة أخرى أو راسلنا على واتساب بالأسفل.')}
                  </div>
                )}

              {/* Action Buttons */}
              <div className="pt-4 flex flex-col sm:flex-row items-center gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:flex-1 bg-[#234745] text-white font-bold py-4 rounded-full text-[16px] hover:bg-[#1a3533] transition-colors shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (isEn ? 'Submitting Request...' : 'جاري إرسال الطلب...') : (isEn ? 'Submit Custom Request (Submit Request)' : 'إرسال طلب الباقة المخصصة')}
                </button>

                <a
                  href="https://wa.me/966920017070"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group w-full sm:w-auto px-8 bg-[#25D366] hover:bg-[#234745] text-white font-bold py-4 rounded-full text-[15px] flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <svg width="20" height="20" fill="currentColor" className="bi bi-whatsapp shrink-0 fill-white group-hover:fill-white transition-colors" viewBox="0 0 16 16">
                    <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232"/>
                  </svg>
                  <span className="text-white group-hover:text-white transition-colors">{isEn ? 'WhatsApp' : 'واتساب للأعمال'}</span>
                </a>
              </div>

              {/* Direct Contact Links Footer */}
              <div className="text-center pt-6 text-[13px] text-[#8B9895] border-t border-[#E6E2D8] mt-4 flex flex-wrap items-center justify-center gap-4">
                <span>
                  {isEn ? 'Direct Email: ' : 'البريد المباشر: '}
                  <a href="mailto:info@saadeddin.com" className="font-bold text-[#234745] underline">info@saadeddin.com</a>
                </span>
                <span>•</span>
                <span>
                  {isEn ? 'Direct Phone: ' : 'الهاتف المباشر: '}
                  <a href="tel:920017070" className="font-bold text-[#234745] underline font-mono" dir="ltr">920017070</a>
                </span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
