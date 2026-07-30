import { NavLink, Await } from 'react-router';
import { Suspense } from 'react';
import type { FooterQuery } from 'storefrontapi.generated';
import { LogoSplash } from './LogoSplash';

export function Footer({ footer, locale }: { footer: Promise<FooterQuery | null>; header?: any; publicStoreDomain?: string; locale?: string; megaMenuData?: any }) {
  const isEn = locale === 'en';

  return (
    <Suspense fallback={null}>
      <Await resolve={footer}>
        {() => {
          return (
            <footer dir={isEn ? 'ltr' : 'rtl'} className={`w-full bg-[#234745] text-white flex flex-col items-center pt-10 pb-8 ${isEn ? 'font-en' : ''}`} style={isEn ? {} : { fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
              <div className="w-full max-w-[1280px] flex flex-col gap-8 px-6 lg:px-12">

                {/* === LOGO ROW (Above First Column on Desktop, Centered on Mobile) === */}
                <div className="w-full flex justify-center lg:justify-start">
                  <div style={{ width: '150px' }} className="-ms-2">
                    <LogoSplash className="px-0 items-center lg:items-start" />
                  </div>
                </div>

                {/* === MOBILE FOOTER (Logo, Social Media Title, Social Icons, App Badges ONLY) === */}
                <div className="w-full flex flex-col items-center gap-5 lg:hidden border-b border-[#BBCFCD]/30 pb-10">
                  <h3 className="font-bold text-[18px] leading-[22px] text-white text-center m-0">
                    {isEn ? 'Social Media' : 'وسائل التواصل الاجتماعي'}
                  </h3>
                  {/* Social Icons */}
                  <div className="flex flex-row flex-wrap items-center justify-center gap-3 mt-1">
                    <SocialIcons />
                  </div>
                  {/* App Buttons */}
                  <div className="flex flex-row flex-wrap items-center justify-center gap-3 mt-2" dir="ltr">
                    <AppButtons />
                  </div>
                </div>

                {/* === DESKTOP FOOTER (Custom Grid with wider First Column) === */}
                <div className="hidden lg:grid w-full grid-cols-[1.4fr_1fr_1fr_1fr] gap-8 lg:gap-10 items-start border-b border-[#BBCFCD]/30 pb-12">

                  {/* Col 1 (Rightmost in RTL): Social Media Title, Social Icons, App Badges in 1 row */}
                  <div className="flex flex-col items-start gap-4 text-start">
                    <h3 className="font-bold text-[18px] leading-[22px] text-white m-0">
                      {isEn ? 'Social Media' : 'وسائل التواصل الاجتماعي'}
                    </h3>
                    {/* Social Icons */}
                    <div className="flex flex-row flex-wrap items-center gap-2.5 mt-1">
                      <SocialIcons />
                    </div>
                    {/* App Buttons in One Row */}
                    <div className="flex flex-row flex-wrap items-center gap-3 mt-2" dir="ltr">
                      <AppButtons />
                    </div>
                  </div>

                  {/* Col 2: About Saadeddin (عن سعد الدين) */}
                  <div className="flex flex-col items-start gap-5 text-start">
                    <h3 className="font-bold text-[18px] leading-[22px] text-white m-0">
                      {isEn ? 'About Saadeddin' : 'عن سعد الدين'}
                    </h3>
                    <div className="flex flex-col items-start gap-3.5 text-[#BBCFCD]">
                      <NavLink to={isEn ? "/en/pages/about" : "/pages/about"} className="font-normal text-[14px] hover:text-white transition-colors">{isEn ? 'About Us' : 'نبذة عن الشركة'}</NavLink>
                      <NavLink to={isEn ? "/en/pages/branches" : "/pages/branches"} className="font-normal text-[14px] hover:text-white transition-colors">{isEn ? 'Our Branches' : 'فروعنا'}</NavLink>
                      <NavLink to={isEn ? "/en/blogs/news" : "/blogs/news"} className="font-normal text-[14px] hover:text-white transition-colors">{isEn ? 'Blog' : 'المدونة'}</NavLink>
                    </div>
                  </div>

                  {/* Col 3: Customer Service (خدمة العملاء) */}
                  <div className="flex flex-col items-start gap-5 text-start">
                    <h3 className="font-bold text-[18px] leading-[22px] text-white m-0">
                      {isEn ? 'Customer Service' : 'خدمة العملاء'}
                    </h3>
                    <div className="flex flex-col items-start gap-3.5 text-[#BBCFCD]">
                      <NavLink to={isEn ? "/en/pages/contact" : "/pages/contact"} className="font-normal text-[14px] hover:text-white transition-colors">{isEn ? 'Contact Us' : 'تواصل معنا'}</NavLink>
                      <NavLink to={isEn ? "/en/pages/faq" : "/pages/faq"} className="font-normal text-[14px] hover:text-white transition-colors">{isEn ? 'FAQs' : 'الأسئلة الشائعة'}</NavLink>
                    </div>
                  </div>

                  {/* Col 4: Shipping & Delivery (الشحن والتوصيل) */}
                  <div className="flex flex-col items-start gap-5 text-start">
                    <h3 className="font-bold text-[18px] leading-[22px] text-white m-0">
                      {isEn ? 'Shipping & Delivery' : 'الشحن والتوصيل'}
                    </h3>
                    <div className="flex flex-col items-start gap-3.5 text-[#BBCFCD]">
                      <NavLink to={isEn ? "/en/export" : "/export"} className="font-normal text-[14px] hover:text-white transition-colors">{isEn ? 'International Shipping / Export' : 'الشحن الدولي/التوصيل'}</NavLink>
                      <NavLink to={isEn ? "/en/pages/branches" : "/pages/branches"} className="font-normal text-[14px] hover:text-white transition-colors">{isEn ? 'Delivery Inside KSA' : 'التوصيل داخل المملكة'}</NavLink>
                    </div>
                  </div>

                </div>

                {/* === BOTTOM BAR === */}
                <div className="w-full flex flex-col md:flex-row justify-between items-center gap-4 text-white text-[15px] lg:text-[16px] font-bold">
                  <div className="text-center md:text-start">
                    {isEn ? '© 2026 Saadeddin — All Rights Reserved' : <span>© <span className="font-sans inline-block" dir="ltr">2026</span> سعد الدين — جميع الحقوق محفوظة</span>}
                  </div>
                  <div className="flex items-center gap-8">
                    <NavLink to={isEn ? "/en/pages/terms" : "/pages/terms"} className="hover:text-white/80 transition-colors">{isEn ? 'Terms and Conditions' : 'الشروط والأحكام'}</NavLink>
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
      <a href="https://www.instagram.com/saadeddinpastry" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:opacity-80 transition-opacity">
        <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="20" fill="#EED5D7" />
          <g transform="translate(8, 8)">
            <path d="M13.2336 0C14.5835 0.00359982 15.2687 0.0107994 15.8603 0.0275986L16.0931 0.0359981C16.3619 0.0455976 16.627 0.057597 16.9474 0.0719962C18.2242 0.131993 19.0953 0.333583 19.8597 0.629968C20.6516 0.934752 21.3188 1.34753 21.986 2.0135C22.5961 2.61334 23.0683 3.33894 23.3695 4.13979C23.6659 4.90415 23.8675 5.7753 23.9275 7.05324C23.9419 7.37242 23.9539 7.63761 23.9635 7.90759L23.9707 8.14038C23.9887 8.73075 23.9959 9.41592 23.9983 10.7658L23.9995 11.661V13.2329C24.0024 14.1082 23.9932 14.9834 23.9719 15.8584L23.9647 16.0912C23.9551 16.3612 23.9431 16.6263 23.9287 16.9455C23.8687 18.2235 23.6647 19.0934 23.3695 19.859C23.0691 20.6603 22.5969 21.386 21.986 21.9853C21.386 22.5952 20.6604 23.0673 19.8597 23.3688C19.0953 23.6652 18.2242 23.8668 16.9474 23.9268C16.6627 23.9402 16.3779 23.9522 16.0931 23.9628L15.8603 23.97C15.2687 23.9868 14.5835 23.9952 13.2336 23.9976L12.3385 23.9988H10.7677C9.8921 24.0018 9.01646 23.9926 8.14108 23.9712L7.90829 23.964C7.62343 23.9532 7.33864 23.9408 7.05393 23.9268C5.7772 23.8668 4.90604 23.6652 4.14048 23.3688C3.33972 23.0681 2.61442 22.5959 2.01539 21.9853C1.40467 21.3856 0.932114 20.66 0.63066 19.859C0.334275 19.0946 0.132686 18.2235 0.0726886 16.9455C0.0593199 16.6608 0.0473204 16.376 0.0366905 16.0912L0.0306909 15.8584C0.00857853 14.9834 -0.00142203 14.1082 0.000692365 13.2329V10.7658C-0.00265662 9.89061 0.00614386 9.01537 0.0270911 8.14038L0.0354906 7.90759C0.0450901 7.63761 0.0570895 7.37242 0.0714888 7.05324C0.131486 5.7753 0.333075 4.90535 0.62946 4.13979C0.930781 3.33811 1.40428 2.61229 2.01659 2.0135C2.61547 1.4033 3.34029 0.931137 4.14048 0.629968C4.90604 0.333583 5.776 0.131993 7.05393 0.0719962C7.37311 0.057597 7.6395 0.0455976 7.90829 0.0359981L8.14108 0.0287984C9.01606 0.00747886 9.8913 -0.00172155 10.7665 0.00119985L13.2336 0ZM12.0001 5.99969C10.4089 5.99969 8.88282 6.6318 7.75765 7.75696C6.63249 8.88212 6.00038 10.4082 6.00038 11.9994C6.00038 13.5906 6.63249 15.1166 7.75765 16.2418C8.88282 17.367 10.4089 17.9991 12.0001 17.9991C13.5913 17.9991 15.1173 17.367 16.2425 16.2418C17.3677 15.1166 17.9998 13.5906 17.9998 11.9994C17.9998 10.4082 17.3677 8.88212 16.2425 7.75696C15.1173 6.6318 13.59969 5.99969 12.0001 5.99969ZM12.0001 8.39957C12.4728 8.39949 12.9409 8.49252 13.3777 8.67336C13.8145 8.85419 14.2114 9.11929 14.5457 9.45351C14.88 9.78772 15.1453 10.1845 15.3262 10.6212C15.5072 11.058 15.6004 11.526 15.6005 11.9988C15.6006 12.4715 15.5075 12.9396 15.3267 13.3764C15.1459 13.8132 14.8808 14.2101 14.5466 14.5444C14.2123 14.8787 13.8155 15.144 13.3788 15.325C12.9421 15.5059 12.474 15.5991 12.0013 15.5992C11.0465 15.5992 10.1309 15.2199 9.45582 14.5448C8.78073 13.8697 8.40146 12.9541 8.40146 11.9994C8.40146 11.0447 8.78073 10.129 9.45582 9.45393C10.1309 8.77883 11.0465 8.39957 12.0013 8.39957M18.301 4.19978C17.9032 4.19978 17.5216 4.35781 17.2403 4.6391C16.9591 4.92039 16.801 5.3019 16.801 5.69971C16.801 6.09751 16.9591 6.47902 17.2403 6.76031C17.5216 7.0416 17.9032 7.19963 18.301 7.19963C18.6988 7.19963 19.0803 7.0416 19.3616 6.76031C19.6429 6.47902 19.8009 6.09751 19.8009 5.69971C19.8009 5.3019 19.6429 4.92039 19.3616 4.6391C19.0803 4.35781 18.6988 4.19978 18.301 4.19978Z" fill="#234745" />
          </g>
        </svg>
      </a>
      <a href="https://web.whatsapp.com/send?phone=+966920017070" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="hover:opacity-80 transition-opacity">
        <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="20" fill="#EED5D7" /><path d="M20 8C26.6276 8 32 13.3724 32 20C32 26.6276 26.6276 32 20 32C17.8793 32.0034 15.796 31.4422 13.964 30.374L8.00482 32L9.62722 26.0384C8.55813 24.2058 7.99647 22.1216 8.00002 20C8.00002 13.3724 13.3724 8 20 8ZM15.9104 14.36L15.6704 14.3696C15.515 14.3791 15.3632 14.4199 15.224 14.4896C15.0938 14.5633 14.975 14.6555 14.8712 14.7632C14.7272 14.8988 14.6456 15.0164 14.558 15.1304C14.1142 15.7075 13.8752 16.416 13.8788 17.144C13.8812 17.732 14.0348 18.3044 14.2748 18.8396C14.7656 19.922 15.5732 21.068 16.6388 22.13C16.8956 22.3856 17.1476 22.6424 17.4188 22.8812C18.7429 24.0469 20.3207 24.8876 22.0268 25.3364L22.7084 25.4408C22.9304 25.4528 23.1524 25.436 23.3756 25.4252C23.7251 25.4071 24.0663 25.3125 24.3752 25.148C24.5324 25.067 24.6857 24.979 24.8348 24.884C24.8348 24.884 24.8864 24.8504 24.9848 24.776C25.1468 24.656 25.2464 24.5708 25.3808 24.4304C25.4804 24.3272 25.5668 24.206 25.6328 24.068C25.7264 23.8724 25.82 23.4992 25.8584 23.1884C25.8872 22.9508 25.8788 22.8212 25.8752 22.7408C25.8704 22.6124 25.7636 22.4792 25.6472 22.4228L24.9488 22.1096C24.9488 22.1096 23.9048 21.6548 23.2664 21.3644C23.1996 21.3352 23.128 21.3185 23.0552 21.3152C22.9731 21.3068 22.8901 21.316 22.8119 21.3423C22.7337 21.3686 22.662 21.4113 22.6016 21.4676C22.5956 21.4652 22.5152 21.5336 21.6476 22.5848C21.5978 22.6517 21.5292 22.7023 21.4506 22.7301C21.3719 22.7578 21.2868 22.7616 21.206 22.7408C21.1278 22.7198 21.0512 22.6934 20.9768 22.6616C20.828 22.5992 20.7764 22.5752 20.6744 22.532C19.9857 22.2314 19.348 21.8254 18.7844 21.3284C18.6332 21.1964 18.4928 21.0524 18.3488 20.9132C17.8767 20.4611 17.4653 19.9496 17.1248 19.3916L17.054 19.2776C17.0032 19.201 16.962 19.1184 16.9316 19.0316C16.886 18.8552 17.0048 17.8906 17.0048 17.8906C17.0048 17.8906 17.2964 18.3944 17.432 18.2216C17.564 18.0536 17.6756 18.8904 17.7476 17.774C17.8892 17.546 17.9336 17.312 17.8592 17.1308C17.5232 16.31 17.1752 15.4928 16.8176 14.6816C16.7468 14.5208 16.5368 14.4056 16.346 14.3828C16.2812 14.3756 16.2164 14.3684 16.1516 14.3636C15.9905 14.3556 15.829 14.3572 15.668 14.3684L15.9104 14.36Z" fill="#234745" />
        </svg>
      </a>
      <a href="https://www.facebook.com/saadeddinpastry" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="hover:opacity-80 transition-opacity">
        <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="20" fill="#EED5D7" /><path d="M22 21.5H24.5L25.5 17.5H22V15.5C22 14.47 22 13.5 24 13.5H25.5V10.14C25.174 10.097 23.943 10 22.643 10C19.928 10 18 11.657 18 14.7V17.5H15V21.5H18V30H22V21.5Z" fill="#234745" />
        </svg>
      </a>
      <a href="https://www.youtube.com/saadeddinpastry" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="hover:opacity-80 transition-opacity">
        <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="20" fill="#EED5D7" /><path d="M18 23L23.19 20L18 17V23ZM29.56 15.17C29.69 15.64 29.78 16.27 29.84 17.07C29.91 17.87 29.94 18.56 29.94 19.16L30 20C30 22.19 29.84 23.8 29.56 24.83C29.31 25.73 28.73 26.31 27.83 26.56C27.36 26.69 26.5 26.78 25.18 26.84C23.88 26.91 22.69 26.94 21.59 26.94L20 27C15.81 27 13.2 26.84 12.17 26.56C11.27 26.31 10.69 25.73 10.44 24.83C10.31 24.36 10.22 23.73 10.16 22.93C10.09 22.13 10.06 21.44 10.06 20.84L10 20C10 17.81 10.16 16.2 10.44 15.17C10.69 14.27 11.27 13.69 12.17 13.44C12.64 13.31 13.5 13.22 14.82 13.16C16.12 13.09 17.31 13.06 18.41 13.06L20 13C24.19 13 26.8 13.16 27.83 13.44C28.73 13.69 29.31 14.27 29.56 15.17Z" fill="#234745" />
        </svg>
      </a>
      <a href="https://twitter.com/saadeddinpastry" target="_blank" rel="noopener noreferrer" aria-label="X" className="hover:opacity-80 transition-opacity">
        <svg width="32" height="32" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="20" fill="#EED5D7" />
          <g clipPath="url(#clip0_462_16121)"><mask id="mask0_462_16121" style={{ maskType: 'luminance' }} maskUnits="userSpaceOnUse" x="8" y="8" width="24" height="24"><path d="M8 8H32V32H8V8Z" fill="white" /></mask><g mask="url(#mask0_462_16121)"><path d="M26.9 9.12451H30.5806L22.5406 18.3371L32 30.8754H24.5943L18.7897 23.2725L12.1554 30.8754H8.47143L17.0703 21.0182L8 9.12623H15.5943L20.8331 16.0742L26.9 9.12451ZM25.6057 28.6674H27.6457L14.48 11.2177H12.2926L25.6057 28.6674Z" fill="#234745" /></g></g>
          <defs><clipPath id="clip0_462_16121"><rect width="24" height="24" fill="white" transform="translate(8 8)" /></clipPath></defs>
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
          className="h-[38px] w-auto block"
        />
      </a>
      <a href="#" className="hover:opacity-90 transition-opacity shrink-0">
        <img
          src="/images/icons/Google_Play_Store_badge.svg"
          alt="Get it on Google Play"
          className="h-[38px] w-auto block"
        />
      </a>
    </>
  );
}
