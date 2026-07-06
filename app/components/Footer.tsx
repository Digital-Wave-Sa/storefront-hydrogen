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
                    <div className="flex flex-col items-start gap-4">
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
                      <div className="flex flex-col items-start gap-4" style={{ color: '#D2D2D2' }}>
                        <NavLink to={isEn ? "/en" : "/"} className="font-medium text-[16px] hover:text-white transition-colors">{isEn ? 'Home' : 'الرئيسية'}</NavLink>
                        <NavLink to={isEn ? "/en/custom-cake" : "/custom-cake"} className="font-medium text-[16px] hover:text-white transition-colors">{isEn ? 'Design Your Cake' : 'صمم كيكتك'}</NavLink>
                        <NavLink to={isEn ? "/en/pages/loyalty" : "/pages/loyalty"} className="font-medium text-[16px] hover:text-white transition-colors">{isEn ? 'Loyalty Program' : 'برنامج الولاء'}</NavLink>
                        <NavLink to={isEn ? "/en/collections/offers" : "/collections/offers"} className="font-medium text-[16px] hover:text-white transition-colors">{isEn ? 'Our Offers' : 'عروضنا'}</NavLink>
                        <NavLink to={isEn ? "/en/pages/branches" : "/pages/branches"} className="font-medium text-[16px] hover:text-white transition-colors">{isEn ? 'Our Branches' : 'فروعنا'}</NavLink>
                      </div>
                    </div>

                    {/* Col 3: Products */}
                    <div className="flex flex-col items-start gap-6">
                      <h3 className="font-bold text-[18px] leading-[22px] text-[#BBCFCD]">
                        {isEn ? 'Products' : 'المنتجات'}
                      </h3>
                      <div className="flex flex-col items-start gap-4" style={{ color: '#D2D2D2' }}>
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
                      <div className="flex flex-col items-start gap-4" style={{ color: '#D2D2D2' }}>
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
                      <div className="flex flex-col items-start gap-4 w-full">
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
                    <span className="font-medium text-[15px] md:text-[16px]" style={{ color: '#FEF8EB' }}>.</span>
                    <NavLink to={isEn ? "/en/pages/privacy" : "/pages/privacy"} className="font-medium text-[14px] md:text-[16px] hover:text-white transition-colors" style={{ color: '#FEF8EB' }}>{isEn ? 'Privacy Policy' : 'سياسة الخصوصية'}</NavLink>
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
      <a 
        href="https://apps.apple.com/sa/app/%D8%AD%D9%84%D9%85-%D8%B3%D8%B9%D8%AF-%D8%A7%D9%84%D8%AF%D9%8A%D9%86-saadeddin-dream/id1456108174" 
        target="_blank" 
        rel="noopener noreferrer" 
        className="hover:opacity-85 transition-opacity inline-block w-[135px] h-[40px] shrink-0"
      >
        <svg xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" version="1.1" id="US_UK_Download_on_the" x="0px" y="0px" width="135px" height="40px" viewBox="0 0 135 40" enableBackground="new 0 0 135 40" xmlSpace="preserve">
          <g>
            <path fill="#A6A6A6" d="M130.197,40H4.729C2.122,40,0,37.872,0,35.267V4.726C0,2.12,2.122,0,4.729,0h125.468   C132.803,0,135,2.12,135,4.726v30.541C135,37.872,132.803,40,130.197,40L130.197,40z"/>
            <path d="M134.032,35.268c0,2.116-1.714,3.83-3.834,3.83H4.729c-2.119,0-3.839-1.714-3.839-3.83V4.725   c0-2.115,1.72-3.835,3.835-3.835h125.468c2.121,0,3.834,1.72,3.834,3.835L134.032,35.268L134.032,35.268z"/>
            <g>
              <g>
                <path fill="#FFFFFF" d="M30.128,19.784c-0.029-3.223,2.639-4.791,2.761-4.864c-1.511-2.203-3.853-2.504-4.676-2.528     c-1.967-0.207-3.875,1.177-4.877,1.177c-1.022,0-2.565-1.157-4.228-1.123c-2.14,0.033-4.142,1.272-5.24,3.196     c-2.266,3.923-0.576,9.688,1.595,12.859c1.086,1.553,2.355,3.287,4.016,3.226c1.625-0.067,2.232-1.036,4.193-1.036     c1.943,0,2.513,1.036,4.207,0.997c1.744-0.028,2.842-1.56,3.89-3.127c1.255-1.78,1.759-3.533,1.779-3.623     C33.507,24.924,30.161,23.647,30.128,19.784z"/>
                <path fill="#FFFFFF" d="M26.928,10.306c0.874-1.093,1.472-2.58,1.306-4.089c-1.265,0.056-2.847,0.875-3.758,1.944     c-0.806,0.942-1.526,2.486-1.34,3.938C24.557,12.205,26.016,11.382,26.928,10.306z"/>
              </g>
            </g>
            <g>
              <path fill="#FFFFFF" d="M53.645,31.504h-2.271l-1.244-3.909h-4.324l-1.185,3.909h-2.211l4.284-13.308h2.646L53.645,31.504z     M49.755,25.955L48.63,22.48c-0.119-0.355-0.342-1.191-0.671-2.507h-0.04c-0.131,0.566-0.342,1.402-0.632,2.507l-1.105,3.475    H49.755z"/>
              <path fill="#FFFFFF" d="M64.662,26.588c0,1.632-0.441,2.922-1.323,3.869c-0.79,0.843-1.771,1.264-2.942,1.264    c-1.264,0-2.172-0.454-2.725-1.362h-0.04v5.055h-2.132V25.067c0-1.026-0.027-2.079-0.079-3.159h1.875l0.119,1.521h0.04    c0.711-1.146,1.79-1.718,3.238-1.718c1.132,0,2.077,0.447,2.833,1.342C64.284,23.949,64.662,25.127,64.662,26.588z M62.49,26.666    c0-0.934-0.21-1.704-0.632-2.31c-0.461-0.632-1.08-0.948-1.856-0.948c-0.526,0-1.004,0.176-1.431,0.523    c-0.428,0.35-0.708,0.807-0.839,1.373c-0.066,0.264-0.099,0.48-0.099,0.65v1.6c0,0.698,0.214,1.287,0.642,1.768    s0.984,0.721,1.668,0.721c0.803,0,1.428-0.31,1.875-0.928C62.266,28.496,62.49,27.68,62.49,26.666z"/>
              <path fill="#FFFFFF" d="M75.699,26.588c0,1.632-0.441,2.922-1.324,3.869c-0.789,0.843-1.77,1.264-2.941,1.264    c-1.264,0-2.172-0.454-2.724-1.362H68.67v5.055h-2.132V25.067c0-1.026-0.027-2.079-0.079-3.159h1.875l0.119,1.521h0.04    c0.71-1.146,1.789-1.718,3.238-1.718c1.131,0,2.076,0.447,2.834,1.342C75.32,23.949,75.699,25.127,75.699,26.588z M73.527,26.666    c0-0.934-0.211-1.704-0.633-2.31c-0.461-0.632-1.078-0.948-1.855-0.948c-0.527,0-1.004,0.176-1.432,0.523    c-0.428,0.35-0.707,0.807-0.838,1.373c-0.065,0.264-0.099,0.48-0.099,0.65v1.6c0,0.698,0.214,1.287,0.64,1.768    c0.428,0.48,0.984,0.721,1.67,0.721c0.803,0,1.428-0.31,1.875-0.928C73.303,28.496,73.527,27.68,73.527,26.666z"/>
              <path fill="#FFFFFF" d="M88.039,27.772c0,1.132-0.393,2.053-1.182,2.764c-0.867,0.777-2.074,1.165-3.625,1.165    c-1.432,0-2.58-0.276-3.449-0.829l0.494-1.777c0.936,0.566,1.963,0.85,3.082,0.85c0.803,0,1.428-0.182,1.877-0.544    c0.447-0.362,0.67-0.848,0.67-1.454c0-0.54-0.184-0.995-0.553-1.364c-0.367-0.369-0.98-0.712-1.836-1.029    c-2.33-0.869-3.494-2.142-3.494-3.816c0-1.094,0.408-1.991,1.225-2.689c0.814-0.699,1.9-1.048,3.258-1.048    c1.211,0,2.217,0.211,3.02,0.632l-0.533,1.738c-0.75-0.408-1.598-0.612-2.547-0.612c-0.75,0-1.336,0.185-1.756,0.553    c-0.355,0.329-0.533,0.73-0.533,1.205c0,0.526,0.203,0.961,0.611,1.303c0.355,0.316,1,0.658,1.936,1.027    c1.145,0.461,1.986,1,2.527,1.618C87.77,26.081,88.039,26.852,88.039,27.772z"/>
              <path fill="#FFFFFF" d="M95.088,23.508h-2.35v4.659c0,1.185,0.414,1.777,1.244,1.777c0.381,0,0.697-0.033,0.947-0.099l0.059,1.619    c-0.42,0.157-0.973,0.236-1.658,0.236c-0.842,0-1.5-0.257-1.975-0.77c-0.473-0.514-0.711-1.376-0.711-2.587v-4.837h-1.4v-1.6h1.4    v-1.757l2.094-0.632v2.389h2.35V23.508z"/>
              <path fill="#FFFFFF" d="M105.691,26.627c0,1.475-0.422,2.686-1.264,3.633c-0.883,0.975-2.055,1.461-3.516,1.461    c-1.408,0-2.529-0.467-3.365-1.401s-1.254-2.113-1.254-3.534c0-1.487,0.43-2.705,1.293-3.652c0.861-0.948,2.023-1.422,3.484-1.422    c1.408,0,2.541,0.467,3.396,1.402C105.283,24.021,105.691,25.192,105.691,26.627z M103.479,26.696    c0-0.885-0.189-1.644-0.572-2.277c-0.447-0.766-1.086-1.148-1.914-1.148c-0.857,0-1.508,0.383-1.955,1.148    c-0.383,0.634-0.572,1.405-0.572,2.317c0,0.885,0.189,1.644,0.572,2.276c0.461,0.766,1.105,1.148,1.936,1.148    c0.814,0,1.453-0.39,1.914-1.168C103.281,28.347,103.479,27.58,103.479,26.696z"/>
              <path fill="#FFFFFF" d="M112.621,23.783c-0.211-0.039-0.436-0.059-0.672-0.059c-0.75,0-1.33,0.283-1.738,0.85    c-0.355,0.5-0.533,1.132-0.533,1.895v5.035h-2.131l0.02-6.574c0-1.106-0.027-2.113-0.08-3.021h1.857l0.078,1.836h0.059    c0.225-0.631,0.58-1.139,1.066-1.52c0.475-0.343,0.988-0.514,1.541-0.514c0.197,0,0.375,0.014,0.533,0.039V23.783z"/>
              <path fill="#FFFFFF" d="M122.156,26.252c0,0.382-0.025,0.704-0.078,0.967h-6.396c0.025,0.948,0.334,1.673,0.928,2.173    c0.539,0.447,1.236,0.671,2.092,0.671c0.947,0,1.811-0.151,2.588-0.454l0.334,1.48c-0.908,0.396-1.98,0.593-3.217,0.593    c-1.488,0-2.656-0.438-3.506-1.313c-0.848-0.875-1.273-2.05-1.273-3.524c0-1.447,0.395-2.652,1.186-3.613    c0.828-1.026,1.947-1.539,3.355-1.539c1.383,0,2.43,0.513,3.141,1.539C121.873,24.047,122.156,25.055,122.156,26.252z     M120.123,25.699c0.014-0.632-0.125-1.178-0.414-1.639c-0.369-0.593-0.936-0.889-1.699-0.889c-0.697,0-1.264,0.289-1.697,0.869    c-0.355,0.461-0.566,1.014-0.631,1.658H120.123z"/>
            </g>
            <g>
              <g>
                <path fill="#FFFFFF" d="M49.05,10.009c0,1.177-0.353,2.063-1.058,2.658c-0.653,0.549-1.581,0.824-2.783,0.824     c-0.596,0-1.106-0.026-1.533-0.078V6.982c0.557-0.09,1.157-0.136,1.805-0.136c1.145,0,2.008,0.249,2.59,0.747     C48.723,8.156,49.05,8.961,49.05,10.009z M47.945,10.038c0-0.763-0.202-1.348-0.606-1.756c-0.404-0.407-0.994-0.611-1.771-0.611     c-0.33,0-0.611,0.022-0.844,0.068v4.889c0.129,0.02,0.365,0.029,0.708,0.029c0.802,0,1.421-0.223,1.857-0.669     S47.945,10.892,47.945,10.038z"/>
                <path fill="#FFFFFF" d="M54.909,11.037c0,0.725-0.207,1.319-0.621,1.785c-0.434,0.479-1.009,0.718-1.727,0.718     c-0.692,0-1.243-0.229-1.654-0.689c-0.41-0.459-0.615-1.038-0.615-1.736c0-0.73,0.211-1.329,0.635-1.794s0.994-0.698,1.712-0.698     c0.692,0,1.248,0.229,1.669,0.688C54.708,9.757,54.909,10.333,54.909,11.037z M53.822,11.071c0-0.435-0.094-0.808-0.281-1.119     c-0.22-0.376-0.533-0.564-0.94-0.564c-0.421,0-0.741,0.188-0.961,0.564c-0.188,0.311-0.281,0.69-0.281,1.138     c0,0.435,0.094,0.808,0.281,1.119c0.227,0.376,0.543,0.564,0.951,0.564c0.4,0,0.714-0.191,0.94-0.574     C53.725,11.882,53.822,11.506,53.822,11.071z"/>
                <path fill="#FFFFFF" d="M62.765,8.719l-1.475,4.714h-0.96l-0.611-2.047c-0.155-0.511-0.281-1.019-0.379-1.523h-0.019     c-0.091,0.518-0.217,1.025-0.379,1.523l-0.649,2.047h-0.971l-1.387-4.714h1.077l0.533,2.241c0.129,0.53,0.235,1.035,0.32,1.513     h0.019c0.078-0.394,0.207-0.896,0.389-1.503l0.669-2.25h0.854l0.641,2.202c0.155,0.537,0.281,1.054,0.378,1.552h0.029     c0.071-0.485,0.178-1.002,0.32-1.552l0.572-2.202H62.765z"/>
                <path fill="#FFFFFF" d="M68.198,13.433H67.15v-2.7c0-0.832-0.316-1.248-0.95-1.248c-0.311,0-0.562,0.114-0.757,0.343     c-0.193,0.229-0.291,0.499-0.291,0.808v2.796h-1.048v-3.366c0-0.414-0.013-0.863-0.038-1.349h0.92l0.049,0.737h0.029     c0.122-0.229,0.304-0.418,0.543-0.569c0.284-0.176,0.602-0.265,0.95-0.265c0.44,0,0.806,0.142,1.097,0.427     c0.362,0.349,0.543,0.87,0.543,1.562V13.433z"/>
                <path fill="#FFFFFF" d="M71.088,13.433h-1.047V6.556h1.047V13.433z"/>
                <path fill="#FFFFFF" d="M77.258,11.037c0,0.725-0.207,1.319-0.621,1.785c-0.434,0.479-1.01,0.718-1.727,0.718     c-0.693,0-1.244-0.229-1.654-0.689c-0.41-0.459-0.615-1.038-0.615-1.736c0-0.73,0.211-1.329,0.635-1.794s0.994-0.698,1.711-0.698     c0.693,0,1.248,0.229,1.67,0.688C77.057,9.757,77.258,10.333,77.258,11.037z M76.17,11.071c0-0.435-0.094-0.808-0.281-1.119     c-0.219-0.376-0.533-0.564-0.939-0.564c-0.422,0-0.742,0.188-0.961,0.564c-0.188,0.311-0.281,0.69-0.281,1.138     c0,0.435,0.094,0.808,0.281,1.119c0.227,0.376,0.543,0.564,0.951,0.564c0.4,0,0.713-0.191,0.939-0.574     C76.074,11.882,76.17,11.506,76.17,11.071z"/>
                <path fill="#FFFFFF" d="M82.33,13.433h-0.941l-0.078-0.543h-0.029c-0.322,0.433-0.781,0.65-1.377,0.65     c-0.445,0-0.805-0.143-1.076-0.427c-0.246-0.258-0.369-0.579-0.369-0.96c0-0.576,0.24-1.015,0.723-1.319     c0.482-0.304,1.16-0.453,2.033-0.446V10.3c0-0.621-0.326-0.931-0.979-0.931c-0.465,0-0.875,0.117-1.229,0.349l-0.213-0.688     c0.438-0.271,0.979-0.407,1.617-0.407c1.232,0,1.85,0.65,1.85,1.95v1.736C82.262,12.78,82.285,13.155,82.33,13.433z      M81.242,11.813v-0.727c-1.156-0.02-1.734,0.297-1.734,0.95c0,0.246,0.066,0.43,0.201,0.553c0.135,0.123,0.307,0.184,0.512,0.184     c0.23,0,0.445-0.073,0.641-0.218c0.197-0.146,0.318-0.331,0.363-0.558C81.236,11.946,81.242,11.884,81.242,11.813z"/>
                <path fill="#FFFFFF" d="M88.285,13.433h-0.93l-0.049-0.757h-0.029c-0.297,0.576-0.803,0.864-1.514,0.864     c-0.568,0-1.041-0.223-1.416-0.669s-0.562-1.025-0.562-1.736c0-0.763,0.203-1.381,0.611-1.853c0.395-0.44,0.879-0.66,1.455-0.66     c0.633,0,1.076,0.213,1.328,0.64h0.02V6.556h1.049v5.607C88.248,12.622,88.26,13.045,88.285,13.433z M87.199,11.445v-0.786     c0-0.136-0.01-0.246-0.029-0.33c-0.059-0.252-0.186-0.464-0.379-0.635c-0.195-0.171-0.43-0.257-0.701-0.257     c-0.391,0-0.697,0.155-0.922,0.466c-0.223,0.311-0.336,0.708-0.336,1.193c0,0.466,0.107,0.844,0.322,1.135     c0.227,0.31,0.533,0.465,0.916,0.465c0.344,0,0.619-0.129,0.828-0.388C87.1,12.069,87.199,11.781,87.199,11.445z"/>
                <path fill="#FFFFFF" d="M97.248,11.037c0,0.725-0.207,1.319-0.621,1.785c-0.434,0.479-1.008,0.718-1.727,0.718     c-0.691,0-1.242-0.229-1.654-0.689c-0.41-0.459-0.615-1.038-0.615-1.736c0-0.73,0.211-1.329,0.635-1.794s0.994-0.698,1.713-0.698     c0.691,0,1.248,0.229,1.668,0.688C97.047,9.757,97.248,10.333,97.248,11.037z M96.162,11.071c0-0.435-0.094-0.808-0.281-1.119     c-0.221-0.376-0.533-0.564-0.941-0.564c-0.42,0-0.74,0.188-0.961,0.564c-0.188,0.311-0.281,0.69-0.281,1.138     c0,0.435,0.094,0.808,0.281,1.119c0.227,0.376,0.543,0.564,0.951,0.564c0.4,0,0.715-0.191,0.941-0.574     C96.064,11.882,96.162,11.506,96.162,11.071z"/>
                <path fill="#FFFFFF" d="M102.883,13.433h-1.047v-2.7c0-0.832-0.316-1.248-0.951-1.248c-0.311,0-0.562,0.114-0.756,0.343     s-0.291,0.499-0.291,0.808v2.796h-1.049v-3.366c0-0.414-0.012-0.863-0.037-1.349h0.92l0.049,0.737h0.029     c0.123-0.229,0.305-0.418,0.543-0.569c0.285-0.176,0.602-0.265,0.951-0.265c0.439,0,0.805,0.142,1.096,0.427     c0.363,0.349,0.543,0.87,0.543,1.562V13.433z"/>
                <path fill="#FFFFFF" d="M109.936,9.504h-1.154v2.29c0,0.582,0.205,0.873,0.611,0.873c0.188,0,0.344-0.016,0.467-0.049     l0.027,0.795c-0.207,0.078-0.479,0.117-0.814,0.117c-0.414,0-0.736-0.126-0.969-0.378c-0.234-0.252-0.35-0.676-0.35-1.271V9.504     h-0.689V8.719h0.689V7.855l1.027-0.31v1.173h1.154V9.504z"/>
                <path fill="#FFFFFF" d="M115.484,13.433h-1.049v-2.68c0-0.845-0.316-1.268-0.949-1.268c-0.486,0-0.818,0.245-1,0.735     c-0.031,0.103-0.049,0.229-0.049,0.377v2.835h-1.047V6.556h1.047v2.841h0.02c0.33-0.517,0.803-0.775,1.416-0.775     c0.434,0,0.793,0.142,1.078,0.427c0.355,0.355,0.533,0.883,0.533,1.581V13.433z"/>
                <path fill="#FFFFFF" d="M121.207,10.853c0,0.188-0.014,0.346-0.039,0.475h-3.143c0.014,0.466,0.164,0.821,0.455,1.067     c0.266,0.22,0.609,0.33,1.029,0.33c0.465,0,0.889-0.074,1.271-0.223l0.164,0.728c-0.447,0.194-0.973,0.291-1.582,0.291     c-0.73,0-1.305-0.215-1.721-0.645c-0.418-0.43-0.625-1.007-0.625-1.731c0-0.711,0.193-1.303,0.582-1.775     c0.406-0.504,0.955-0.756,1.648-0.756c0.678,0,1.193,0.252,1.541,0.756C121.068,9.77,121.207,10.265,121.207,10.853z      M120.207,10.582c0.008-0.311-0.061-0.579-0.203-0.805c-0.182-0.291-0.459-0.437-0.834-0.437c-0.342,0-0.621,0.142-0.834,0.427     c-0.174,0.227-0.277,0.498-0.311,0.815H120.207z"/>
              </g>
            </g>
          </g>
        </svg>
      </a>

      <a 
        href="https://play.google.com/store/apps/details?id=com.app.saadeddin" 
        target="_blank" 
        rel="noopener noreferrer" 
        className="hover:opacity-85 transition-opacity inline-block w-[135px] h-[40px] shrink-0"
      >
        <svg id="svg51" className="w-[135px] h-[40px]" version="1.1" viewBox="0 0 180 53.333" xmlSpace="preserve" xmlns="http://www.w3.org/2000/svg">
          <path id="path11" d="m173.33 53.333h-166.66c-3.6666 0-6.6665-2.9999-6.6665-6.6665v-39.999c0-3.6666 2.9999-6.6665 6.6665-6.6665h166.66c3.6666 0 6.6665 2.9999 6.6665 6.6665v39.999c0 3.6666-2.9999 6.6665-6.6665 6.6665" fill="#100f0d" strokeWidth=".13333"/>
          <path id="path13" d="m173.33 1e-3h-166.66c-3.6666 0-6.6665 2.9999-6.6665 6.6665v39.999c0 3.6666 2.9999 6.6665 6.6665 6.6665h166.66c3.6666 0 6.6665-2.9999 6.6665-6.6665v-39.999c0-3.6666-2.9999-6.6665-6.6665-6.6665zm0 1.0661c3.0879 0 5.5999 2.5125 5.5999 5.6004v39.999c0 3.0879-2.5119 5.6004-5.5999 5.6004h-166.66c-3.0879 0-5.5993-2.5125-5.5993-5.6004v-39.999c0-3.0879 2.5114-5.6004 5.5993-5.6004h166.66" fill="#a2a2a1" strokeWidth=".13333"/>
          <path id="path35" d="m142.58 40h2.4879v-16.669h-2.4879zm22.409-10.664-2.8519 7.2264h-0.0853l-2.9599-7.2264h-2.6799l4.4399 10.1-2.5319 5.6185h2.5946l6.8412-15.718zm-14.11 8.7706c-0.81331 0-1.9506-0.40786-1.9506-1.4156 0-1.2865 1.416-1.7797 2.6373-1.7797 1.0933 0 1.6093 0.23546 2.2733 0.55732-0.19333 1.5442-1.5226 2.6379-2.9599 2.6379zm0.30133-9.1352c-1.8013 0-3.6666 0.79371-4.4386 2.5521l2.208 0.92184c0.47198-0.92184 1.3506-1.2218 2.2733-1.2218 1.2866 0 2.5946 0.77131 2.6159 2.1442v0.17133c-0.45066-0.25733-1.416-0.64318-2.5946-0.64318-2.3813 0-4.8039 1.3077-4.8039 3.7524 0 2.2302 1.952 3.6671 4.1386 3.6671 1.672 0 2.5959-0.75054 3.1732-1.6301h0.0867v1.2874h2.4026v-6.391c0-2.9593-2.2106-4.6103-5.0612-4.6103zm-15.376 2.3937h-3.5386v-5.7133h3.5386c1.86 0 2.9159 1.5396 2.9159 2.8566 0 1.2917-1.056 2.8567-2.9159 2.8567zm-0.064-8.0337h-5.9614v16.669h2.4869v-6.3149h3.4746c2.7573 0 5.4679-1.9958 5.4679-5.1765 0-3.1801-2.7106-5.1769-5.4679-5.1769zm-32.507 14.778c-1.7188 0-3.1573-1.4396-3.1573-3.415 0-1.9984 1.4385-3.4583 3.1573-3.4583 1.6969 0 3.0286 1.46 3.0286 3.4583 0 1.9754-1.3317 3.415-3.0286 3.415zm2.8567-7.8403h-0.086c-0.55826-0.66572-1.6328-1.2672-2.9853-1.2672-2.8359 0-5.4348 2.4921-5.4348 5.6925 0 3.1786 2.5989 5.6488 5.4348 5.6488 1.3525 0 2.427-0.6016 2.9853-1.2885h0.086v0.81558c0 2.1703-1.1598 3.3296-3.0286 3.3296-1.5245 0-2.4697-1.0953-2.8567-2.0188l-2.1691 0.90206c0.62238 1.503 2.2759 3.351 5.0259 3.351 2.9218 0 5.392-1.7188 5.392-5.9077v-10.181h-2.3634zm4.0822 9.7304h2.4906v-16.669h-2.4906zm6.164-5.4988c-0.0641-2.1911 1.6978-3.3078 2.9645-3.3078 0.98851 0 1.8254 0.49425 2.1057 1.2026zm7.7326-1.8906c-0.47238-1.2666-1.9114-3.6082-4.8541-3.6082-2.9218 0-5.3488 2.2983-5.3488 5.6707 0 3.1791 2.4062 5.6707 5.6275 5.6707 2.5989 0 4.1031-1.589 4.7264-2.513l-1.9333-1.289c-0.64465 0.94531-1.5249 1.5682-2.7931 1.5682-1.2666 0-2.1692-0.58012-2.7483-1.7186l7.5815-3.1359zm-60.409-1.8682v2.4057h5.7565c-0.17186 1.3532-0.62292 2.3411-1.3104 3.0286-0.83798 0.83745-2.1483 1.7614-4.4462 1.7614-3.5443 0-6.315-2.8567-6.315-6.4009s2.7707-6.4013 6.315-6.4013c1.9118 0 3.3077 0.75198 4.3388 1.7186l1.6974-1.6973c-1.4396-1.3745-3.351-2.427-6.0362-2.427-4.8552 0-8.9363 3.9524-8.9363 8.807 0 4.8541 4.0811 8.8066 8.9363 8.8066 2.6202 0 4.5967-0.85932 6.143-2.4702 1.5896-1.5896 2.0838-3.8234 2.0838-5.628 0-0.55785-0.04333-1.0734-0.1292-1.5032zm14.772 7.3675c-1.7188 0-3.201-1.4177-3.201-3.4368 0-2.0406 1.4822-3.4364 3.201-3.4364 1.7181 0 3.2003 1.3958 3.2003 3.4364 0 2.0191-1.4822 3.4368-3.2003 3.4368zm0-9.1075c-3.137 0-5.6927 2.3842-5.6927 5.6707 0 3.265 2.5557 5.6707 5.6927 5.6707 3.1358 0 5.692-2.4057 5.692-5.6707 0-3.2865-2.5562-5.6707-5.692-5.6707zm12.417 9.1075c-1.7176 0-3.2003-1.4177-3.2003-3.4368 0-2.0406 1.4828-3.4364 3.2003-3.4364 1.7188 0 3.2005 1.3958 3.2005 3.4364 0 2.0191-1.4817 3.4368-3.2005 3.4368zm0-9.1075c-3.1358 0-5.6915 2.3842-5.6915 5.6707 0 3.265 2.5557 5.6707 5.6915 5.6707 3.137 0 5.6927-2.4057 5.6927-5.6707 0-3.2865-2.5557-5.6707-5.6927-5.6707" fill="#fff" strokeWidth=".13333" />
          <path id="path37" d="m27.622 25.899-14.194 15.066c5.34e-4 0.0031 0.0016 0.0057 0.0021 0.0089 0.43532 1.636 1.9296 2.8406 3.703 2.8406 0.70892 0 1.3745-0.19166 1.9453-0.52812l0.04533-0.02656 15.978-9.22-7.479-8.141" fill="#eb3131" strokeWidth=".13333" />
          <path id="path39" d="m41.983 23.334-0.0136-0.0093-6.8982-3.999-7.7717 6.9156 7.7987 7.7977 6.8618-3.9592c1.203-0.64945 2.0197-1.9177 2.0197-3.3802 0-1.452-0.80571-2.7139-1.9968-3.3655" fill="#f6b60b" strokeWidth=".13333" />
          <path id="path41" d="m13.426 12.37c-0.08533 0.31466-0.13018 0.64425-0.13018 0.98651v26.623c0 0.34162 0.04432 0.67233 0.13072 0.98587l14.684-14.681-14.684-13.914" fill="#5778c5" strokeWidth=".13333" />
          <path id="path43" d="m27.727 26.668 7.3473-7.3451-15.96-9.2534c-0.58012-0.34746-1.2572-0.54799-1.9817-0.54799-1.7734 0-3.2697 1.2068-3.7051 2.8447-5.34e-4 0.0016-5.34e-4 0.0027-5.34e-4 0.0041l14.3 14.298" fill="#3bad49" strokeWidth=".13333" />
          <path id="path33" d="m63.193 13.042h-3.8895v0.96251h2.9146c-0.0792 0.78545-0.39172 1.4021-0.91878 1.85-0.52705 0.44799-1.2 0.67292-1.9958 0.67292-0.87291 0-1.6125-0.30413-2.2186-0.90824-0.59385-0.61665-0.89584-1.3792-0.89584-2.2979 0-0.91864 0.30199-1.6812 0.89584-2.2978 0.60612-0.60412 1.3457-0.90624 2.2186-0.90624 0.44799 0 0.87504 0.07707 1.2666 0.24586 0.39172 0.16866 0.70625 0.40412 0.95211 0.70625l0.73958-0.73958c-0.33546-0.38132-0.76038-0.67292-1.2876-0.88544-0.52705-0.21253-1.077-0.31453-1.6708-0.31453-1.1645 0-2.1519 0.40412-2.9582 1.2104-0.80625 0.80825-1.2104 1.8041-1.2104 2.9811 0 1.177 0.40412 2.175 1.2104 2.9813 0.80625 0.80611 1.7937 1.2104 2.9582 1.2104 1.2229 0 2.1979-0.39172 2.9479-1.1876 0.66038-0.66238 0.99784-1.5582 0.99784-2.679 0-0.1896-0.02293-0.39172-0.05627-0.60425zm1.5068-3.7332v8.0249h4.6852v-0.98544h-3.654v-2.5457h3.2958v-0.96251h-3.2958v-2.5437h3.654v-0.98758zm11.255 0.98758v-0.98758h-5.5145v0.98758h2.2417v7.0373h1.0312v-7.0373zm4.9925-0.98758h-1.0312v8.0249h1.0312zm6.8066 0.98758v-0.98758h-5.5144v0.98758h2.2415v7.0373h1.0312v-7.0373zm10.406 0.05626c-0.79585-0.81877-1.7708-1.2229-2.9354-1.2229-1.1666 0-2.1415 0.40412-2.9374 1.2104-0.79585 0.79585-1.1874 1.7937-1.1874 2.9811s0.39159 2.1854 1.1874 2.9813c0.79585 0.80611 1.7708 1.2104 2.9374 1.2104 1.1541 0 2.1395-0.40426 2.9354-1.2104 0.79585-0.79585 1.1874-1.7938 1.1874-2.9813 0-1.177-0.39159-2.1729-1.1874-2.9686zm-5.1332 0.67078c0.59372-0.60412 1.3229-0.90624 2.1978-0.90624 0.87291 0 1.6021 0.30213 2.1854 0.90624 0.59372 0.59372 0.88531 1.3686 0.88531 2.2978 0 0.93131-0.29159 1.7041-0.88531 2.2979-0.58332 0.60412-1.3125 0.90824-2.1854 0.90824-0.87491 0-1.6041-0.30413-2.1978-0.90824-0.58132-0.60625-0.87291-1.3666-0.87291-2.2979 0-0.92918 0.29159-1.6916 0.87291-2.2978zm8.7706 1.3125-0.0437-1.548h0.0437l4.0791 6.5457h1.077v-8.0249h-1.0312v4.6957l0.0437 1.548h-0.0437l-3.8999-6.2437h-1.2562v8.0249h1.0312zm1.5068-3.7332v8.0249h4.6852v-0.98544h-3.654v-2.5457h3.2958v-0.96251h-3.2958v-2.5437h3.654v-0.98758zm11.255 0.98758v-0.98758h-5.5145v0.98758h2.2417v7.0373h1.0312v-7.0373zm4.9925-0.98758h-1.0312v8.0249h1.0312zm6.8066 0.98758v-0.98758h-5.5144v0.98758h2.2415v7.0373h1.0312v-7.0373zm10.406 0.05626c-0.79585-0.81877-1.7708-1.2229-2.9354-1.2229-1.1666 0-2.1415 0.40412-2.9374 1.2104-0.79585 0.79585-1.1874 1.7937-1.1874 2.9811s0.39159 2.1854 1.1874 2.9813c0.79585 0.80611 1.7708 1.2104 2.9374 1.2104 1.1541 0 2.1395-0.40426 2.9354-1.2104 0.79585-0.79585 1.1874-1.7938 1.1874-2.9813 0-1.177-0.39159-2.1729-1.1874-2.9686zm-5.1332 0.67078c0.59372-0.60412 1.3229-0.90624 2.1978-0.90624 0.87291 0 1.6021 0.30213 2.1854 0.90624 0.59372 0.59372 0.88531 1.3686 0.88531 2.2978 0 0.93131-0.29159 1.7041-0.88531 2.2979-0.58332 0.60412-1.3125 0.90824-2.1854 0.90824-0.87491 0-1.6041-0.30413-2.1978-0.90824-0.58132-0.60625-0.87291-1.3666-0.87291-2.2979 0-0.92918 0.29159-1.6916 0.87291-2.2978zm8.7706 1.3125-0.0437-1.548h0.0437l4.0791 6.5457h1.077v-8.0249h-1.0312v4.6957l0.0437 1.548h-0.0437l-3.8999-6.2437h-1.2562v8.0249h1.0312z" fill="#fff" stroke="#fff" strokeMiterlimit="10" strokeWidth=".26666" />
        </svg>
      </a>
    </>
  );
}
