import { NavLink, Await, useOutletContext, useRouteLoaderData } from 'react-router';
import { Suspense } from 'react';
import type { FooterQuery } from 'storefrontapi.generated';
import { LogoSplash } from './LogoSplash';

export function Footer({ footer, locale }: { footer: Promise<FooterQuery | null>; header: any; publicStoreDomain: string; locale?: string }) {
  const isEn = locale === 'en';

  return (
    <Suspense fallback={null}>
      <Await resolve={footer}>
        {(footerData) => {
          return (
            <footer dir={isEn ? 'ltr' : 'rtl'} className={`w-full bg-[#234745] flex flex-col items-center pt-12 pb-10 ${isEn ? 'font-en' : ''}`} style={isEn ? {} : { fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
              <div className="w-full max-w-[1280px] flex flex-col items-center gap-10 px-6">

                {/* === MOBILE FOOTER (Hidden on Desktop) === */}
                <div className="w-full flex flex-col items-center gap-6 lg:hidden border-b border-[#BBCFCD]/50 pb-8">
                  {/* Top Section */}
                  <div style={{ width: '120px' }} className="mb-2">
                    <LogoSplash className="px-0" />
                  </div>
                  <h3 className="font-bold text-[18px] leading-[22px] text-[#FFFFFF] text-center">
                    {isEn ? 'The future is sweet!' : 'المستقبل حلو!'}
                  </h3>
                  <p className="font-medium text-[14px] leading-[20px] text-[#D2D2D2] text-center max-w-[280px]">
                    {isEn ? 'Since 1919, we have been offering the finest sweets and luxury chocolate with love and passion.' : <span>منذ عام <span className="font-sans inline-block" dir="ltr">1919</span>، نقدم أجود الحلويات والشوكولاتة الفاخرة بعشق وشغف.</span>}
                  </p>

                  {/* Social Icons */}
                  <div className="flex flex-row flex-wrap items-center justify-center gap-3 mt-2 mb-4">
                    <SocialIcons />
                  </div>

                  {/* Quick Links Header */}
                  <div className="w-full text-start mb-2">
                    <h3 className="font-bold text-[16px] leading-[22px] text-[#BBCFCD]">
                      {isEn ? 'Quick Links' : 'روابط سريعة'}
                    </h3>
                  </div>

                  {/* 2-Column Links Grid */}
                  <div className="w-full grid grid-cols-2 gap-x-4 gap-y-6 text-[#D2D2D2]">
                    {/* Right Column (First in DOM in RTL) */}
                    <div className="flex flex-col gap-4 items-start">
                      <NavLink to={isEn ? "/en" : "/"} className="font-medium hover:text-white transition-colors" style={{ fontSize: 'clamp(13px, 4vw, 15px)' }}>{isEn ? 'Home' : 'الرئيسية'}</NavLink>
                      <NavLink to={isEn ? "/en/pages/loyalty" : "/pages/loyalty"} className="font-medium hover:text-white transition-colors" style={{ fontSize: 'clamp(13px, 4vw, 15px)' }}>{isEn ? 'Loyalty Program' : 'برنامج الولاء'}</NavLink>
                      <NavLink to={isEn ? "/en/pages/branches" : "/pages/branches"} className="font-medium hover:text-white transition-colors" style={{ fontSize: 'clamp(13px, 4vw, 15px)' }}>{isEn ? 'Our Branches' : 'فروعنا'}</NavLink>
                      <NavLink to={isEn ? "/en/pages/track-order" : "/pages/track-order"} className="font-medium hover:text-white transition-colors" style={{ fontSize: 'clamp(13px, 4vw, 15px)' }}>{isEn ? 'Track Your Order' : 'تتبع طلبك'}</NavLink>
                      <NavLink to={isEn ? "/en/pages/returns" : "/pages/returns"} className="font-medium hover:text-white transition-colors" style={{ fontSize: 'clamp(13px, 4vw, 15px)' }}>{isEn ? 'Return Policy' : 'سياسة الاسترجاع'}</NavLink>
                      <NavLink to={isEn ? "/en/pages/faq" : "/pages/faq"} className="font-medium hover:text-white transition-colors" style={{ fontSize: 'clamp(13px, 4vw, 15px)' }}>{isEn ? 'FAQs' : 'الأسئلة الشائعة'}</NavLink>
                      <NavLink to={isEn ? "/en/pages/contact" : "/pages/contact"} className="font-medium hover:text-white transition-colors" style={{ fontSize: 'clamp(13px, 4vw, 15px)' }}>{isEn ? 'Contact Us' : 'تواصل معنا'}</NavLink>
                    </div>

                    {/* Left Column (Second in DOM in RTL) */}
                    <div className="flex flex-col gap-4 items-start">
                      <NavLink to={isEn ? "/en/custom-cake" : "/custom-cake"} className="font-medium hover:text-white transition-colors" style={{ fontSize: 'clamp(13px, 4vw, 15px)' }}>{isEn ? 'Design Your Cake' : 'صمم كيكتك'}</NavLink>
                      <NavLink to={isEn ? "/en/collections/offers" : "/collections/offers"} className="font-medium hover:text-white transition-colors" style={{ fontSize: 'clamp(13px, 4vw, 15px)' }}>{isEn ? 'Our Offers' : 'عروضنا'}</NavLink>
                      <span className="font-medium cursor-default" style={{ fontSize: 'clamp(13px, 4vw, 15px)' }}>{isEn ? 'Customer Service' : 'خدمة العملاء'}</span>
                      <span className="font-medium font-sans cursor-default" dir="ltr" style={{ fontSize: 'clamp(13px, 4vw, 15px)' }}>920017070</span>
                      <span className="font-medium font-sans cursor-default break-all" dir="ltr" style={{ fontSize: 'clamp(11px, 3.5vw, 15px)' }}>info@saadeddin.com</span>
                      <span className="font-medium leading-snug cursor-default" style={{ fontSize: 'clamp(12px, 3.8vw, 15px)', maxWidth: '140px' }}>
                        {isEn ? 'Riyadh, Saudi Arabia' : 'الرياض، المملكة العربية السعودية'}
                      </span>
                    </div>
                  </div>

                  {/* App Buttons (Row on mobile, stacked on very narrow screens) */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6 w-full max-w-[280px] sm:max-w-none mx-auto" dir="ltr">
                    <AppButtons />
                  </div>
                </div>

                {/* === DESKTOP FOOTER (Hidden on Mobile) === */}
                <div className="hidden lg:flex w-full flex-col items-center gap-10">
                  {/* Logo Section */}
                  <div style={{ width: '162px' }}>
                    <LogoSplash className="px-0" />
                  </div>

                  {/* Columns Section */}
                  <div className="w-full grid grid-cols-5 gap-8 border-b border-[#BBCFCD]/50 pb-10">

                    {/* Col 1: Future is Sweet */}
                    <div className="flex flex-col items-start gap-2">
                      <h3 className="font-bold text-[16px] leading-[20px] text-[#FFFFFF]">
                        {isEn ? 'The future is sweet!' : 'المستقبل حلو!'}
                      </h3>
                      <p className="font-medium text-[16px] leading-[20px] text-[#D2D2D2] text-start max-w-[280px]">
                        {isEn ? 'Since 1919, we have been offering the finest sweets and luxury chocolate with love and passion.' : <span>منذ عام <span className="font-sans inline-block" dir="ltr">1919</span>، نقدم أجود الحلويات والشوكولاتة الفاخرة بعشق وشغف.</span>}
                      </p>
                      {/* Social Icons */}
                      <div className="flex flex-row flex-wrap items-center gap-2 mt-2">
                        <SocialIcons />
                      </div>
                    </div>

                    {/* Col 2: Quick Links */}
                    <div className="flex flex-col items-start gap-6">
                      <h3 className="font-bold text-[18px] leading-[22px] text-[#BBCFCD]">
                        {isEn ? 'Quick Links' : 'روابط سريعة'}
                      </h3>
                      <div className="flex flex-col items-start gap-2" style={{ color: '#D2D2D2' }}>
                        <NavLink to={isEn ? "/en" : "/"} className="font-medium text-[16px] hover:text-white transition-colors">{isEn ? 'Home' : 'الرئيسية'}</NavLink>
                        <NavLink to={isEn ? "/en/custom-cake" : "/custom-cake"} className="font-medium text-[16px] hover:text-white transition-colors">{isEn ? 'Design Your Cake' : 'صمم كيكتك'}</NavLink>
                        <NavLink to={isEn ? "/en/pages/loyalty" : "/pages/loyalty"} className="font-medium text-[16px] hover:text-white transition-colors">{isEn ? 'Loyalty Program' : 'برنامج الولاء'}</NavLink>
                        <NavLink to={isEn ? "/en/collections/offers" : "/collections/offers"} className="font-medium text-[16px] hover:text-white transition-colors">{isEn ? 'Our Offers' : 'عروضنا'}</NavLink>
                        <NavLink to={isEn ? "/en/pages/branches" : "/pages/branches"} className="font-medium text-[16px] hover:text-white transition-colors">{isEn ? 'Our Branches' : 'فروعنا'}</NavLink>
                        <NavLink to={isEn ? "/en/quality-policy" : "/quality-policy"} className="font-medium text-[16px] hover:text-white transition-colors">{isEn ? 'Quality Policy' : 'سياسة الجودة'}</NavLink>
                      </div>
                    </div>

                    {/* Col 3: Products */}
                    <div className="flex flex-col items-start gap-6">
                      <h3 className="font-bold text-[18px] leading-[22px] text-[#BBCFCD]">
                        {isEn ? 'Products' : 'المنتجات'}
                      </h3>
                      <div className="flex flex-col items-start gap-2" style={{ color: '#D2D2D2' }}>
                        <NavLink to={isEn ? "/en/collections/dark-chocolate" : "/collections/dark-chocolate"} className="font-medium text-[16px] hover:text-white transition-colors">{isEn ? 'Dark Chocolate' : 'الشوكولاتة الداكنة'}</NavLink>
                        <NavLink to={isEn ? "/en/custom-cake" : "/custom-cake"} className="font-medium text-[16px] hover:text-white transition-colors">{isEn ? 'Custom Cakes' : 'الكيك المخصص'}</NavLink>
                        <NavLink to={isEn ? "/en/occasions" : "/occasions"} className="font-medium text-[16px] hover:text-white transition-colors">{isEn ? 'Occasions' : 'المناسبات'}</NavLink>
                        <NavLink to={isEn ? "/en/gifting" : "/gifting"} className="font-medium text-[16px] hover:text-white transition-colors">{isEn ? 'Gifts' : 'الهدايا'}</NavLink>
                        <NavLink to={isEn ? "/en/collections/oriental" : "/collections/oriental"} className="font-medium text-[16px] hover:text-white transition-colors">{isEn ? 'Oriental Sweets' : 'الحلويات الشرقية'}</NavLink>
                        <NavLink to={isEn ? "/en/collections/gift-boxes" : "/collections/gift-boxes"} className="font-medium text-[16px] hover:text-white transition-colors">{isEn ? 'Gift Boxes' : 'صناديق الهدايا'}</NavLink>
                        <NavLink to={isEn ? "/en/collections/arabic-coffee" : "/collections/arabic-coffee"} className="font-medium text-[16px] hover:text-white transition-colors">{isEn ? 'Arabic Coffee' : 'القهوة العربية'}</NavLink>
                      </div>
                    </div>

                    {/* Col 4: Customer Service */}
                    <div className="flex flex-col items-start gap-6">
                      <h3 className="font-bold text-[18px] leading-[22px] text-[#BBCFCD]">
                        {isEn ? 'Customer Service' : 'خدمة العملاء'}
                      </h3>
                      <div className="flex flex-col items-start gap-2" style={{ color: '#D2D2D2' }}>
                        <NavLink to={isEn ? "/en/pages/track-order" : "/pages/track-order"} className="font-medium text-[16px] hover:text-white transition-colors">{isEn ? 'Track Your Order' : 'تتبع طلبك'}</NavLink>
                        <NavLink to={isEn ? "/en/pages/returns" : "/pages/returns"} className="font-medium text-[16px] hover:text-white transition-colors">{isEn ? 'Return Policy' : 'سياسة الاسترجاع'}</NavLink>
                        <NavLink to={isEn ? "/en/pages/faq" : "/pages/faq"} className="font-medium text-[16px] hover:text-white transition-colors">{isEn ? 'FAQs' : 'الأسئلة الشائعة'}</NavLink>
                        <NavLink to={isEn ? "/en/collections/offers" : "/collections/offers"} className="font-medium text-[16px] hover:text-white transition-colors">{isEn ? 'Our Offers' : 'عروضنا'}</NavLink>
                        <NavLink to={isEn ? "/en/pages/contact" : "/pages/contact"} className="font-medium text-[16px] hover:text-white transition-colors">{isEn ? 'Contact Us' : 'تواصل معنا'}</NavLink>
                      </div>
                    </div>

                    {/* Col 5: Contact Us */}
                    <div className="flex flex-col items-start gap-6">
                      <h3 className="font-bold text-[18px] leading-[22px] text-[#BBCFCD]">
                        {isEn ? 'Contact Us' : 'تواصل معنا'}
                      </h3>
                      <div className="flex flex-col items-start gap-2 w-full">
                        <p className="text-[#D2D2D2] font-medium text-[16px] font-sans" dir="ltr">920017070</p>
                        <p className="text-[#D2D2D2] font-medium text-[16px] font-sans" dir="ltr">info@saadeddin.com</p>
                        <p className="text-[#D2D2D2] font-medium text-[16px] max-w-[200px]">
                          {isEn ? 'Riyadh, Saudi Arabia' : 'الرياض، المملكة العربية السعودية'}
                        </p>

                        {/* App Buttons */}
                        <div className="flex flex-col gap-3 mt-2" dir="ltr">
                          <AppButtons />
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Bottom Bar */}
                <div className="w-full flex flex-col md:flex-row justify-between items-center gap-6 md:gap-4" style={{ color: '#FEF8EB' }}>
                  <div className="flex items-center gap-2 sm:gap-8 justify-center w-full md:w-auto mt-4 md:mt-0">
                    <NavLink to={isEn ? "/en/pages/terms" : "/pages/terms"} className="font-medium text-[14px] md:text-[16px] hover:text-white transition-colors" style={{ color: '#FEF8EB' }}>{isEn ? 'Terms and Conditions' : 'الشروط والاحكام'}</NavLink>
                  </div>
                  <div className="font-medium text-[15px] md:text-[16px] text-center w-full md:w-auto" style={{ color: '#FEF8EB' }}>
                    {isEn ? '© 2026 Saadeddin — All Rights Reserved' : <span>© <span className="font-sans inline-block" dir="ltr">2026</span> سعد الدين — جميع الحقوق محفوظة</span>}
                  </div>
                </div>

              </div>
            </footer>
          );
        }}
      </Await>
    </Suspense>
  );
}

function SocialIcons() {
  return (
    <>
      <a href="https://twitter.com/saadeddinpastry" target="_blank" rel="noopener noreferrer" aria-label="X" className="hover:opacity-80 transition-opacity">
        <svg width="28" height="28" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="20" fill="#EED5D7" />
          <g clipPath="url(#clip0_462_16121)"><mask id="mask0_462_16121" style={{ maskType: 'luminance' }} maskUnits="userSpaceOnUse" x="8" y="8" width="24" height="24"><path d="M8 8H32V32H8V8Z" fill="white" /></mask><g mask="url(#mask0_462_16121)"><path d="M26.9 9.12451H30.5806L22.5406 18.3371L32 30.8754H24.5943L18.7897 23.2725L12.1554 30.8754H8.47143L17.0703 21.0182L8 9.12623H15.5943L20.8331 16.0742L26.9 9.12451ZM25.6057 28.6674H27.6457L14.48 11.2177H12.2926L25.6057 28.6674Z" fill="#234745" /></g></g>
          <defs><clipPath id="clip0_462_16121"><rect width="24" height="24" fill="white" transform="translate(8 8)" /></clipPath></defs>
        </svg>
      </a>
      <a href="https://www.youtube.com/saadeddinpastry" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="hover:opacity-80 transition-opacity">
        <svg width="28" height="28" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="20" fill="#EED5D7" /><path d="M18 23L23.19 20L18 17V23ZM29.56 15.17C29.69 15.64 29.78 16.27 29.84 17.07C29.91 17.87 29.94 18.56 29.94 19.16L30 20C30 22.19 29.84 23.8 29.56 24.83C29.31 25.73 28.73 26.31 27.83 26.56C27.36 26.69 26.5 26.78 25.18 26.84C23.88 26.91 22.69 26.94 21.59 26.94L20 27C15.81 27 13.2 26.84 12.17 26.56C11.27 26.31 10.69 25.73 10.44 24.83C10.31 24.36 10.22 23.73 10.16 22.93C10.09 22.13 10.06 21.44 10.06 20.84L10 20C10 17.81 10.16 16.2 10.44 15.17C10.69 14.27 11.27 13.69 12.17 13.44C12.64 13.31 13.5 13.22 14.82 13.16C16.12 13.09 17.31 13.06 18.41 13.06L20 13C24.19 13 26.8 13.16 27.83 13.44C28.73 13.69 29.31 14.27 29.56 15.17Z" fill="#234745" />
        </svg>
      </a>
      <a href="https://www.facebook.com/saadeddinpastry" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="hover:opacity-80 transition-opacity">
        <svg width="28" height="28" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="20" fill="#EED5D7" /><path d="M22 21.5H24.5L25.5 17.5H22V15.5C22 14.47 22 13.5 24 13.5H25.5V10.14C25.174 10.097 23.943 10 22.643 10C19.928 10 18 11.657 18 14.7V17.5H15V21.5H18V30H22V21.5Z" fill="#234745" />
        </svg>
      </a>
      <a href="https://web.whatsapp.com/send?phone=+966920017070" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="hover:opacity-80 transition-opacity">
        <svg width="28" height="28" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="20" fill="#EED5D7" /><path d="M20 8C26.6276 8 32 13.3724 32 20C32 26.6276 26.6276 32 20 32C17.8793 32.0034 15.796 31.4422 13.964 30.374L8.00482 32L9.62722 26.0384C8.55813 24.2058 7.99647 22.1216 8.00002 20C8.00002 13.3724 13.3724 8 20 8ZM15.9104 14.36L15.6704 14.3696C15.515 14.3791 15.3632 14.4199 15.224 14.4896C15.0938 14.5633 14.975 14.6555 14.8712 14.7632C14.7272 14.8988 14.6456 15.0164 14.558 15.1304C14.1142 15.7075 13.8752 16.416 13.8788 17.144C13.8812 17.732 14.0348 18.3044 14.2748 18.8396C14.7656 19.922 15.5732 21.068 16.6388 22.13C16.8956 22.3856 17.1476 22.6424 17.4188 22.8812C18.7429 24.0469 20.3207 24.8876 22.0268 25.3364L22.7084 25.4408C22.9304 25.4528 23.1524 25.436 23.3756 25.4252C23.7251 25.4071 24.0663 25.3125 24.3752 25.148C24.5324 25.067 24.6857 24.979 24.8348 24.884C24.8348 24.884 24.8864 24.8504 24.9848 24.776C25.1468 24.656 25.2464 24.5708 25.3808 24.4304C25.4804 24.3272 25.5668 24.206 25.6328 24.068C25.7264 23.8724 25.82 23.4992 25.8584 23.1884C25.8872 22.9508 25.8788 22.8212 25.8752 22.7408C25.8704 22.6124 25.7636 22.4792 25.6472 22.4228L24.9488 22.1096C24.9488 22.1096 23.9048 21.6548 23.2664 21.3644C23.1996 21.3352 23.128 21.3185 23.0552 21.3152C22.9731 21.3068 22.8901 21.316 22.8119 21.3423C22.7337 21.3686 22.662 21.4113 22.6016 21.4676C22.5956 21.4652 22.5152 21.5336 21.6476 22.5848C21.5978 22.6517 21.5292 22.7023 21.4506 22.7301C21.3719 22.7578 21.2868 22.7616 21.206 22.7408C21.1278 22.7198 21.0512 22.6934 20.9768 22.6616C20.828 22.5992 20.7764 22.5752 20.6744 22.532C19.9857 22.2314 19.348 21.8254 18.7844 21.3284C18.6332 21.1964 18.4928 21.0524 18.3488 20.9132C17.8767 20.4611 17.4653 19.9496 17.1248 19.3916L17.054 19.2776C17.0032 19.201 16.962 19.1184 16.9316 19.0316C16.886 18.8552 17.0048 18.7136 17.0048 18.7136C17.0048 18.7136 17.2964 18.3944 17.432 18.2216C17.564 18.0536 17.6756 17.8904 17.7476 17.774C17.8892 17.546 17.9336 17.312 17.8592 17.1308C17.5232 16.31 17.1752 15.4928 16.8176 14.6816C16.7468 14.5208 16.5368 14.4056 16.346 14.3828C16.2812 14.3756 16.2164 14.3684 16.1516 14.3636C15.9905 14.3556 15.829 14.3572 15.668 14.3684L15.9104 14.36Z" fill="#234745" />
        </svg>
      </a>
      <a href="https://www.instagram.com/saadeddinpastry" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:opacity-80 transition-opacity">
        <svg width="28" height="28" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="39.9993" rx="19.9997" fill="#EED5D7" /><path d="M21.2336 8C22.5835 8.0036 23.2687 8.0108 23.8603 8.0276L24.0931 8.036C24.3619 8.0456 24.627 8.0576 24.9474 8.072C26.2242 8.13199 27.0953 8.33358 27.8597 8.62997C28.6516 8.93475 29.3188 9.34753 29.986 10.0135C30.5961 10.6133 31.0683 11.3389 31.3695 12.1398C31.6659 12.9041 31.8675 13.7753 31.9275 15.0532C31.9419 15.3724 31.9539 15.6376 31.9635 15.9076L31.9707 16.1404C31.9887 16.7308 31.9959 17.4159 31.9983 18.7658L31.9995 19.661V21.2329C32.0024 22.1082 31.9932 22.9834 31.9719 23.8584L31.9647 24.0912C31.9551 24.3612 31.9431 24.6263 31.9287 24.9455C31.8687 26.2235 31.6647 27.0934 31.3695 27.859C31.0691 28.6603 30.5969 29.386 29.986 29.9853C29.386 30.5952 28.6604 31.0673 27.8597 31.3688C27.0953 31.6652 26.2242 31.8668 24.9474 31.9268C24.6627 31.9402 24.3779 31.9522 24.0931 31.9628L23.8603 31.97C23.2687 31.9868 22.5835 31.9952 21.2336 31.9976L20.3385 31.9988H18.7677C17.8921 32.0018 17.0165 31.9926 16.1411 31.9712L15.9083 31.964C15.6234 31.9532 15.3386 31.9408 15.0539 31.9268C13.7772 31.8668 12.906 31.6652 12.1405 31.3688C11.3397 31.0681 10.6144 30.5959 10.0154 29.9853C9.40467 29.3856 8.93211 28.66 8.63066 27.859C8.33428 27.0946 8.13269 26.2235 8.07269 24.9455C8.05932 24.6608 8.04732 24.376 8.03669 24.0912L8.03069 23.8584C8.00858 22.9834 7.99858 22.1082 8.00069 21.2329V18.7658C7.99734 17.8906 8.00614 17.0154 8.02709 16.1404L8.03549 15.9076C8.04509 15.6376 8.05709 15.3724 8.07149 15.0532C8.13149 13.7753 8.33308 12.9053 8.62946 12.1398C8.93078 11.3381 9.40428 10.6123 10.0166 10.0135C10.6155 9.4033 11.3403 8.93114 12.1405 8.62997C12.906 8.33358 13.776 8.13199 15.0539 8.072C15.3731 8.0576 15.6395 8.0456 15.9083 8.036L16.1411 8.0288C17.0161 8.00748 17.8913 7.99828 18.7665 8.0012L21.2336 8ZM20.0001 13.9997C18.4089 13.9997 16.8828 14.6318 15.7577 15.757C14.6325 16.8821 14.0004 18.4082 14.0004 19.9994C14.0004 21.5906 14.6325 23.1166 15.7577 24.2418C16.8828 25.367 18.4089 25.9991 20.0001 25.9991C21.5913 25.9991 23.1173 25.367 24.2425 24.2418C25.3677 23.1166 25.9998 21.5906 25.9998 19.9994C25.9998 18.4082 25.3677 16.8821 24.2425 15.757C23.1173 14.6318 21.5913 13.9997 20.0001 13.9997ZM20.0001 16.3996C20.4728 16.3995 20.9409 16.4925 21.3777 16.6734C21.8145 16.8542 22.2114 17.1193 22.5457 17.4535C22.88 17.7877 23.1453 18.1845 23.3262 18.6212C23.5072 19.058 23.6004 19.526 23.6005 19.9988C23.6006 20.4715 23.5075 20.9396 23.3267 21.3764C23.1459 21.8132 22.8808 22.2101 22.5466 22.5444C22.2123 22.8787 21.8155 23.144 21.3788 23.325C20.9421 23.5059 20.474 23.5991 20.0013 23.5992C19.0465 23.5992 18.1309 23.2199 17.4558 22.5448C16.7807 21.8697 16.4015 20.9541 16.4015 19.9994C16.4015 19.0447 16.7807 18.129 17.4558 17.4539C18.1309 16.7788 19.0465 16.3996 20.0013 16.3996M26.301 12.1998C25.9032 12.1998 25.5216 12.3578 25.2403 12.6391C24.9591 12.9204 24.801 13.3019 24.801 13.6997C24.801 14.0975 24.9591 14.479 25.2403 14.7603C25.5216 15.0416 25.9032 15.1996 26.301 15.1996C26.6988 15.1996 27.0803 15.0416 27.3616 14.7603C27.6429 14.479 27.8009 14.0975 27.8009 13.6997C27.8009 13.3019 27.6429 12.9204 27.3616 12.6391C27.0803 12.3578 26.6988 12.1998 26.301 12.1998Z" fill="#234745" />
        </svg>
      </a>
    </>
  );
}

function AppButtons() {
  return (
    <>
      <a href="#" className="hover:opacity-90 transition-opacity shrink-0">
        <img
          src="/images/icons/App_Store_Badge.svg"
          alt="Download on the App Store"
          className="h-[40px] w-auto block"
        />
      </a>
      <a href="#" className="hover:opacity-90 transition-opacity shrink-0">
        <img
          src="/images/icons/Google_Play_Store_badge.svg"
          alt="Get it on Google Play"
          className="h-[40px] w-auto block"
        />
      </a>
    </>
  );
}
