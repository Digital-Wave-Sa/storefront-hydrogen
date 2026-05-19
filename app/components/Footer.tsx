import { NavLink, Await, useOutletContext } from 'react-router';
import { Suspense } from 'react';
import type { FooterQuery } from 'storefrontapi.generated';
import { Button } from './layout/Button';

export function Footer({ footer }: { footer: Promise<FooterQuery | null>; header: any; publicStoreDomain: string }) {
  const context = useOutletContext<{ locale?: string }>() || {};
  const isEn = context.locale === 'en';
  
  return (
    <Suspense fallback={null}>
      <Await resolve={footer}>
        {(footerData) => {
          const menu = footerData?.menu;
          return (
    <footer dir={isEn ? 'ltr' : 'rtl'} className={`w-full ${isEn ? 'font-en text-left' : 'font-ar text-right'} bg-[#234745] text-white pt-14 pb-4`}>
      <div className="max-w-[1400px] mx-auto px-6 xl:px-10">

        {/* TOP ROW: 5 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-6 mb-14">

          {/* Column 5 (rightmost in RTL): Logo & About */}
          <div className={`flex flex-col items-center ${isEn ? 'lg:items-start' : 'lg:items-end'} lg:col-span-1 order-first`}>
            <div className={`mb-5 flex flex-col items-center ${isEn ? 'lg:items-start' : 'lg:items-end'}`}>
              <img
                src="https://saadeddin.com/cdn/shop/files/LOGO1_b5cc5efb-bb01-4475-a0bc-cfc9d2f654b1_350x.png"
                alt="Saadeddin"
                className="brightness-0 invert mb-3"
                style={{ height: '65px', objectFit: 'contain' }}
              />
              <h3 className="text-[18px] font-bold mb-2">{isEn ? 'Future is Sweet!' : 'المستقبل حلو!'}</h3>
              <p className={`text-[13px] leading-relaxed text-white/70 text-center ${isEn ? 'lg:text-left' : 'lg:text-right'} max-w-[280px]`}>
                {isEn ? 'Since 1979, we have been offering the finest sweets and luxury chocolate with love and passion.' : 'منذ عام ١٩٧٩، نقدم أجود الحلويات والشوكولاتة الفاخرة بعشق وشغف.'}
              </p>
            </div>

            {/* Social Icons */}
            <div className={`flex items-center gap-4 mt-3 justify-center ${isEn ? 'lg:justify-start' : 'lg:justify-end'} w-full`}>
              <Button
                to="#"
                aria-label="Facebook"
                variant="ghost"
                size="sm"
                className="w-9 h-9 p-0 rounded-full bg-white/10 hover:bg-white/20 text-white"
                icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5z" /></svg>}
              />
              <Button
                to="#"
                aria-label="WhatsApp"
                variant="ghost"
                size="sm"
                className="w-9 h-9 p-0 rounded-full bg-white/10 hover:bg-white/20 text-white"
                icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M19.05 4.91A9.816 9.816 0 0012.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01zM12.04 19.93c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a7.89 7.89 0 01-1.2-4.16c0-4.36 3.55-7.91 7.91-7.91 2.11 0 4.1.82 5.59 2.32 1.5 1.49 2.32 3.48 2.32 5.59 0 4.36-3.55 7.91-7.91 7.91zm4.34-5.93c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-1.54-.74-2.61-1.34-3.6-2.55-.26-.32-.03-.49.1-.61.1-.1.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.48-.4-.41-.54-.42l-.46-.02c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.68 2.57 4.08 3.55 1.4.58 1.98.62 2.74.52.42-.06 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28z" /></svg>}
              />
              <Button
                to="#"
                aria-label="Instagram"
                variant="ghost"
                size="sm"
                className="w-9 h-9 p-0 rounded-full bg-white/10 hover:bg-white/20 text-white"
                icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4s1.791-4 4-4 4 1.79 4 4-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>}
              />
            </div>
          </div>

          {/* Column 4: Quick Links */}
          <div className={`flex flex-col text-center ${isEn ? 'lg:text-left' : 'lg:text-right'}`}>
            <h3 className="text-[16px] font-bold mb-6 pb-3 border-b border-white/10 text-white">{isEn ? 'Quick Links' : 'روابط سريعة'}</h3>
            <ul className="space-y-3.5 text-[14px] font-medium">
              <li><NavLink to={isEn ? "/en" : "/"} className="text-white/70 hover:text-white transition-colors">{isEn ? 'Home' : 'الرئيسية'}</NavLink></li>
              <li><NavLink to={isEn ? "/en/pages/design-cake" : "/pages/design-cake"} className="text-white/70 hover:text-white transition-colors">{isEn ? 'Design Your Cake' : 'صمم كيكتك'}</NavLink></li>
              <li><NavLink to={isEn ? "/en/pages/loyalty" : "/pages/loyalty"} className="text-white/70 hover:text-white transition-colors">{isEn ? 'Loyalty Program' : 'برنامج الولاء'}</NavLink></li>
              <li><NavLink to={isEn ? "/en/collections/offers" : "/collections/offers"} className="text-white/70 hover:text-white transition-colors">{isEn ? 'Our Offers' : 'عروضنا'}</NavLink></li>
              <li><NavLink to={isEn ? "/en/pages/branches" : "/pages/branches"} className="text-white/70 hover:text-white transition-colors">{isEn ? 'Our Branches' : 'فروعنا'}</NavLink></li>
              <li><NavLink to={isEn ? "/en/pages/about" : "/pages/about"} className="text-white/70 hover:text-white transition-colors">{isEn ? 'About Us' : 'عن سعد الدين'}</NavLink></li>
            </ul>
          </div>

          {/* Column 3: Products */}
          <div className={`flex flex-col text-center ${isEn ? 'lg:text-left' : 'lg:text-right'}`}>
            <h3 className="text-[16px] font-bold mb-6 pb-3 border-b border-white/10 text-white">{isEn ? 'Products' : 'المنتجات'}</h3>
            <ul className="space-y-3.5 text-[14px] font-medium">
              <li><NavLink to={isEn ? "/en/collections/dark-chocolate" : "/collections/dark-chocolate"} className="text-white/70 hover:text-white transition-colors">{isEn ? 'Dark Chocolate' : 'الشوكولاتة الداكنة'}</NavLink></li>
              <li><NavLink to={isEn ? "/en/collections/custom-cakes" : "/collections/custom-cakes"} className="text-white/70 hover:text-white transition-colors">{isEn ? 'Custom Cakes' : 'الكيك المخصص'}</NavLink></li>
              <li><NavLink to={isEn ? "/en/collections/oriental" : "/collections/oriental"} className="text-white/70 hover:text-white transition-colors">{isEn ? 'Oriental Sweets' : 'الحلويات الشرقية'}</NavLink></li>
              <li><NavLink to={isEn ? "/en/collections/gift-boxes" : "/collections/gift-boxes"} className="text-white/70 hover:text-white transition-colors">{isEn ? 'Gift Boxes' : 'صناديق الهدايا'}</NavLink></li>
              <li><NavLink to={isEn ? "/en/collections/arabic-coffee" : "/collections/arabic-coffee"} className="text-white/70 hover:text-white transition-colors">{isEn ? 'Arabic Coffee' : 'القهوة العربية'}</NavLink></li>
            </ul>
          </div>

          {/* Column 2: Customer Service */}
          <div className={`flex flex-col text-center ${isEn ? 'lg:text-left' : 'lg:text-right'}`}>
            <h3 className="text-[16px] font-bold mb-6 pb-3 border-b border-white/10 text-white">{isEn ? 'Customer Service' : 'خدمة العملاء'}</h3>
            <ul className="space-y-3.5 text-[14px] font-medium">
              <li><NavLink to={isEn ? "/en/pages/track-order" : "/pages/track-order"} className="text-white/70 hover:text-white transition-colors">{isEn ? 'Track Your Order' : 'تتبع طلبك'}</NavLink></li>
              <li><NavLink to={isEn ? "/en/pages/returns" : "/pages/returns"} className="text-white/70 hover:text-white transition-colors">{isEn ? 'Return Policy' : 'سياسة الاسترجاع'}</NavLink></li>
              <li><NavLink to={isEn ? "/en/pages/faq" : "/pages/faq"} className="text-white/70 hover:text-white transition-colors">{isEn ? 'FAQs' : 'الأسئلة الشائعة'}</NavLink></li>
              <li><NavLink to={isEn ? "/en/pages/privacy" : "/pages/privacy"} className="text-white/70 hover:text-white transition-colors">{isEn ? 'Privacy Policy' : 'سياسة الخصوصية'}</NavLink></li>
              <li><NavLink to={isEn ? "/en/pages/terms" : "/pages/terms"} className="text-white/70 hover:text-white transition-colors">{isEn ? 'Terms of Service' : 'الشروط والأحكام'}</NavLink></li>
              <li><NavLink to={isEn ? "/en/pages/contact" : "/pages/contact"} className="text-white/70 hover:text-white transition-colors">{isEn ? 'Contact Us' : 'تواصل معنا'}</NavLink></li>
            </ul>
          </div>

          {/* Column 1 (leftmost in RTL): Contact Info */}
          <div className={`flex flex-col text-center ${isEn ? 'lg:text-left' : 'lg:text-right'}`}>
            <h3 className="text-[16px] font-bold mb-6 pb-3 border-b border-white/10 text-white">{isEn ? 'Contact Us' : 'تواصل معنا'}</h3>
            <ul className="space-y-4 text-[14px] font-medium">
              {/* Phone */}
              <li className={`flex items-center gap-3 justify-center ${isEn ? 'lg:justify-start' : 'lg:justify-end'}`}>
                {isEn ? null : <span className="text-white/70 font-en tracking-wide">٩٢٠....١٢٣٤</span>}
                <span className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white" opacity="0.8">
                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                  </svg>
                </span>
                {isEn ? <span className="text-white/70 font-en tracking-wide">920....1234</span> : null}
              </li>
              {/* Email */}
              <li className={`flex items-center gap-3 justify-center ${isEn ? 'lg:justify-start' : 'lg:justify-end'}`}>
                {isEn ? null : <a href="mailto:info@saadeddin.com" className="text-white/70 hover:text-white transition-colors font-en text-[13px]">info@saadeddin.com</a>}
                <span className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white" opacity="0.8">
                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                  </svg>
                </span>
                {isEn ? <a href="mailto:info@saadeddin.com" className="text-white/70 hover:text-white transition-colors font-en text-[13px]">info@saadeddin.com</a> : null}
              </li>
              {/* Address */}
              <li className={`flex items-start gap-3 justify-center ${isEn ? 'lg:justify-start' : 'lg:justify-end'}`}>
                {isEn ? null : <span className="text-white/70 text-right leading-relaxed">الرياض، المملكة العربية<br />السعودية</span>}
                <span className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white" opacity="0.8">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                </span>
                {isEn ? <span className="text-white/70 text-left leading-relaxed">Riyadh, Saudi Arabia</span> : null}
              </li>
            </ul>

            {/* App Store Badges */}
            <div className={`flex flex-col gap-2.5 mt-6 mx-auto lg:mx-0 w-max ${isEn ? 'lg:items-start' : 'lg:items-end'}`} dir="ltr">
              <Button
                to="#"
                variant="ghost"
                size="sm"
                className="bg-white/10 hover:bg-white/20 rounded-xl px-5 py-2 flex items-center justify-between gap-3 min-w-[160px] border border-white/5"
                rightIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="white" opacity="0.9"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.19 2.31-.88 3.5-.8 2.14.06 3.7.99 4.7 2.45-3.32 1.95-2.73 6.09.43 7.39-.77 1.25-1.57 2.42-2.71 3.13h-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" /></svg>}
              >
                App Store
              </Button>
              <Button
                to="#"
                variant="ghost"
                size="sm"
                className="bg-white/10 hover:bg-white/20 rounded-xl px-5 py-2 flex items-center justify-between gap-3 min-w-[160px] border border-white/5"
                rightIcon={<svg width="18" height="18" viewBox="0 0 24 24" fill="white" opacity="0.9"><path d="M3 20.5v-17c0-.6.3-1 .8-1.3l9.2 9.3-9.2 9.3c-.5-.3-.8-.7-.8-1.3zm13.2-5.5L5.5 21.5l8.2-8.2 2.5 1.7zm1.2-.8l-2.7-1.8 2.7-1.8c.7.4 1.1 1 1.1 1.8s-.4 1.4-1.1 1.8zM5.5 2.5l10.7 6.5-2.5 2.5L5.5 2.5z" /></svg>}
              >
                Google Play
              </Button>
            </div>
          </div>

        </div>

        {/* BOTTOM ROW: Copyright */}
        <div className="border-t border-white/10 pt-5 pb-2 text-center text-[13px] font-medium text-white/50">
          <p>{isEn ? '© 2026 Saadeddin — All Rights Reserved' : '© ٢٠٢٦ سعد الدين — جميع الحقوق محفوظة'}</p>
        </div>

      </div>
    </footer>
          );
        }}
      </Await>
    </Suspense>
  );
}
