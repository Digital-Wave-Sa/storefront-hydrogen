import { NavLink, Await, useOutletContext } from 'react-router';
import { Suspense } from 'react';
import type { FooterQuery } from 'storefrontapi.generated';
import { LogoSplash } from './LogoSplash';

export function Footer({ footer }: { footer: Promise<FooterQuery | null>; header: any; publicStoreDomain: string }) {
  const context = useOutletContext<{ locale?: string }>() || {};
  const isEn = context.locale === 'en';
  
  return (
    <Suspense fallback={null}>
      <Await resolve={footer}>
        {(footerData) => {
          return (
            <footer dir={isEn ? 'ltr' : 'rtl'} className="w-full bg-[#234745] flex flex-col items-center pt-12 pb-10" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
              <div className="w-full max-w-[1280px] flex flex-col items-center gap-10 px-6">
                
                {/* Logo Section */}
                <div style={{ width: '162px' }}>
                  <LogoSplash />
                </div>

                {/* Columns Section */}
                <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 border-b border-[#BBCFCD]/50 pb-10">
                  
                  {/* Col 1: Future is Sweet */}
                  <div className="flex flex-col items-start gap-4">
                    <h3 className="font-bold text-[16px] leading-[20px] text-[#FFFFFF]">
                      {isEn ? 'The future is sweet!' : 'المستقبل حلو!'}
                    </h3>
                    <p className="font-medium text-[16px] leading-[20px] text-[#D2D2D2] text-start max-w-[280px]">
                      {isEn ? 'Since 1919, we have been offering the finest sweets and luxury chocolate with love and passion.' : 'منذ عام ١٩١٩، نقدم أجود الحلويات والشوكولاتة الفاخرة بعشق وشغف.'}
                    </p>
                    {/* Social Icons */}
                    <div className="flex flex-row flex-wrap items-center gap-2 mt-2">
                      <a href="#" aria-label="X" className="hover:opacity-80 transition-opacity">
                        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect width="40" height="40" rx="20" fill="#EED5D7"/>
                          <g clipPath="url(#clip0_462_16121)">
                            <mask id="mask0_462_16121" style={{ maskType: 'luminance' }} maskUnits="userSpaceOnUse" x="8" y="8" width="24" height="24">
                              <path d="M8 8H32V32H8V8Z" fill="white"/>
                            </mask>
                            <g mask="url(#mask0_462_16121)">
                              <path d="M26.9 9.12451H30.5806L22.5406 18.3371L32 30.8754H24.5943L18.7897 23.2725L12.1554 30.8754H8.47143L17.0703 21.0182L8 9.12623H15.5943L20.8331 16.0742L26.9 9.12451ZM25.6057 28.6674H27.6457L14.48 11.2177H12.2926L25.6057 28.6674Z" fill="#234745"/>
                            </g>
                          </g>
                          <defs>
                            <clipPath id="clip0_462_16121">
                              <rect width="24" height="24" fill="white" transform="translate(8 8)"/>
                            </clipPath>
                          </defs>
                        </svg>
                      </a>
                      <a href="#" aria-label="Snapchat" className="hover:opacity-80 transition-opacity">
                        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect width="40" height="40" rx="20" fill="#EED5D7"/>
                          <path d="M19.8708 29.765C18.6808 29.765 17.8868 29.203 17.1778 28.708C16.6738 28.351 16.2018 28.012 15.6448 27.918C15.3795 27.8726 15.1108 27.8505 14.8418 27.852C14.3698 27.852 13.9948 27.923 13.7278 27.977C13.5578 28.007 13.4158 28.035 13.3038 28.035C13.1878 28.035 13.0408 28.003 12.9838 27.807C12.9338 27.647 12.9028 27.495 12.8718 27.348C12.7918 26.978 12.7248 26.751 12.5858 26.728C11.0968 26.501 10.2058 26.158 10.0318 25.752C10.0178 25.708 10.0008 25.662 10.0008 25.627C9.99076 25.503 10.0808 25.4 10.2058 25.377C11.3868 25.182 12.4478 24.553 13.3438 23.519C14.0398 22.716 14.3788 21.94 14.4098 21.856C14.4098 21.846 14.4188 21.846 14.4188 21.846C14.5894 21.4947 14.6234 21.1963 14.5208 20.951C14.3288 20.491 13.6958 20.295 13.2638 20.161C13.1528 20.131 13.0588 20.095 12.9788 20.068C12.6088 19.921 11.9928 19.608 12.0738 19.176C12.1318 18.864 12.5458 18.641 12.8848 18.641C12.9788 18.6397 13.0588 18.6563 13.1248 18.691C13.5048 18.864 13.8478 18.953 14.1418 18.953C14.5078 18.953 14.6818 18.815 14.7258 18.771C14.7164 18.5732 14.7048 18.3755 14.6908 18.178C14.6008 16.813 14.4988 15.119 14.9308 14.148C16.2288 11.241 18.9838 11.008 19.7998 11.008L20.1558 11H20.2058C21.0208 11 23.7758 11.227 25.0738 14.139C25.5108 15.11 25.4038 16.809 25.3138 18.169L25.3048 18.236C25.2968 18.418 25.2828 18.592 25.2748 18.771C25.3188 18.806 25.4788 18.94 25.8088 18.944C26.0948 18.936 26.4068 18.842 26.7628 18.681C26.8613 18.6383 26.9674 18.6158 27.0748 18.615C27.1998 18.615 27.3248 18.645 27.4318 18.681H27.4408C27.7398 18.793 27.9358 19.002 27.9358 19.221C27.9448 19.426 27.7838 19.738 27.0218 20.046C26.9418 20.076 26.8478 20.113 26.7368 20.139C26.3128 20.269 25.6798 20.474 25.4788 20.929C25.3678 21.169 25.4118 21.477 25.5818 21.825C25.5818 21.833 25.5908 21.833 25.5908 21.833C25.6398 21.958 26.9278 24.883 29.7948 25.36C29.8534 25.3699 29.9064 25.4006 29.9441 25.4466C29.9818 25.4926 30.0016 25.5506 29.9998 25.61C30.0004 25.6547 29.9901 25.6977 29.9688 25.739C29.7948 26.149 28.9118 26.483 27.4138 26.715C27.2758 26.737 27.2088 26.965 27.1288 27.335C27.0969 27.4892 27.0599 27.6423 27.0178 27.794C26.9728 27.941 26.8788 28.021 26.7178 28.021H26.6968C26.5542 28.0184 26.4122 28.002 26.2728 27.972C25.9062 27.894 25.5325 27.8551 25.1578 27.856C24.8891 27.8567 24.6209 27.8792 24.3558 27.923C23.8028 28.013 23.3258 28.356 22.8218 28.713C22.1038 29.203 21.3058 29.765 20.1248 29.765H19.8708Z" fill="#234745"/>
                        </svg>
                      </a>
                      <a href="#" aria-label="YouTube" className="hover:opacity-80 transition-opacity">
                        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect width="40" height="40" rx="20" fill="#EED5D7"/>
                          <path d="M18 23L23.19 20L18 17V23ZM29.56 15.17C29.69 15.64 29.78 16.27 29.84 17.07C29.91 17.87 29.94 18.56 29.94 19.16L30 20C30 22.19 29.84 23.8 29.56 24.83C29.31 25.73 28.73 26.31 27.83 26.56C27.36 26.69 26.5 26.78 25.18 26.84C23.88 26.91 22.69 26.94 21.59 26.94L20 27C15.81 27 13.2 26.84 12.17 26.56C11.27 26.31 10.69 25.73 10.44 24.83C10.31 24.36 10.22 23.73 10.16 22.93C10.09 22.13 10.06 21.44 10.06 20.84L10 20C10 17.81 10.16 16.2 10.44 15.17C10.69 14.27 11.27 13.69 12.17 13.44C12.64 13.31 13.5 13.22 14.82 13.16C16.12 13.09 17.31 13.06 18.41 13.06L20 13C24.19 13 26.8 13.16 27.83 13.44C28.73 13.69 29.31 14.27 29.56 15.17Z" fill="#234745"/>
                        </svg>
                      </a>
                      <a href="#" aria-label="Facebook" className="hover:opacity-80 transition-opacity">
                        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect width="40" height="40" rx="20" fill="#EED5D7"/>
                          <path d="M22 21.5H24.5L25.5 17.5H22V15.5C22 14.47 22 13.5 24 13.5H25.5V10.14C25.174 10.097 23.943 10 22.643 10C19.928 10 18 11.657 18 14.7V17.5H15V21.5H18V30H22V21.5Z" fill="#234745"/>
                        </svg>
                      </a>
                      <a href="#" aria-label="WhatsApp" className="hover:opacity-80 transition-opacity">
                        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect width="40" height="40" rx="20" fill="#EED5D7"/>
                          <path d="M20 8C26.6276 8 32 13.3724 32 20C32 26.6276 26.6276 32 20 32C17.8793 32.0034 15.796 31.4422 13.964 30.374L8.00482 32L9.62722 26.0384C8.55813 24.2058 7.99647 22.1216 8.00002 20C8.00002 13.3724 13.3724 8 20 8ZM15.9104 14.36L15.6704 14.3696C15.515 14.3791 15.3632 14.4199 15.224 14.4896C15.0938 14.5633 14.975 14.6555 14.8712 14.7632C14.7272 14.8988 14.6456 15.0164 14.558 15.1304C14.1142 15.7075 13.8752 16.416 13.8788 17.144C13.8812 17.732 14.0348 18.3044 14.2748 18.8396C14.7656 19.922 15.5732 21.068 16.6388 22.13C16.8956 22.3856 17.1476 22.6424 17.4188 22.8812C18.7429 24.0469 20.3207 24.8876 22.0268 25.3364L22.7084 25.4408C22.9304 25.4528 23.1524 25.436 23.3756 25.4252C23.7251 25.4071 24.0663 25.3125 24.3752 25.148C24.5324 25.067 24.6857 24.979 24.8348 24.884C24.8348 24.884 24.8864 24.8504 24.9848 24.776C25.1468 24.656 25.2464 24.5708 25.3808 24.4304C25.4804 24.3272 25.5668 24.206 25.6328 24.068C25.7264 23.8724 25.82 23.4992 25.8584 23.1884C25.8872 22.9508 25.8788 22.8212 25.8752 22.7408C25.8704 22.6124 25.7636 22.4792 25.6472 22.4228L24.9488 22.1096C24.9488 22.1096 23.9048 21.6548 23.2664 21.3644C23.1996 21.3352 23.128 21.3185 23.0552 21.3152C22.9731 21.3068 22.8901 21.316 22.8119 21.3423C22.7337 21.3686 22.662 21.4113 22.6016 21.4676C22.5956 21.4652 22.5152 21.5336 21.6476 22.5848C21.5978 22.6517 21.5292 22.7023 21.4506 22.7301C21.3719 22.7578 21.2868 22.7616 21.206 22.7408C21.1278 22.7198 21.0512 22.6934 20.9768 22.6616C20.828 22.5992 20.7764 22.5752 20.6744 22.532C19.9857 22.2314 19.348 21.8254 18.7844 21.3284C18.6332 21.1964 18.4928 21.0524 18.3488 20.9132C17.8767 20.4611 17.4653 19.9496 17.1248 19.3916L17.054 19.2776C17.0032 19.201 16.962 19.1184 16.9316 19.0316C16.886 18.8552 17.0048 18.7136 17.0048 18.7136C17.0048 18.7136 17.2964 18.3944 17.432 18.2216C17.564 18.0536 17.6756 17.8904 17.7476 17.774C17.8892 17.546 17.9336 17.312 17.8592 17.1308C17.5232 16.31 17.1752 15.4928 16.8176 14.6816C16.7468 14.5208 16.5368 14.4056 16.346 14.3828C16.2812 14.3756 16.2164 14.3684 16.1516 14.3636C15.9905 14.3556 15.829 14.3572 15.668 14.3684L15.9104 14.36Z" fill="#234745"/>
                        </svg>
                      </a>
                      <a href="#" aria-label="Instagram" className="hover:opacity-80 transition-opacity">
                        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect width="40" height="39.9993" rx="19.9997" fill="#EED5D7"/>
                          <path d="M21.2336 8C22.5835 8.0036 23.2687 8.0108 23.8603 8.0276L24.0931 8.036C24.3619 8.0456 24.627 8.0576 24.9474 8.072C26.2242 8.13199 27.0953 8.33358 27.8597 8.62997C28.6516 8.93475 29.3188 9.34753 29.986 10.0135C30.5961 10.6133 31.0683 11.3389 31.3695 12.1398C31.6659 12.9041 31.8675 13.7753 31.9275 15.0532C31.9419 15.3724 31.9539 15.6376 31.9635 15.9076L31.9707 16.1404C31.9887 16.7308 31.9959 17.4159 31.9983 18.7658L31.9995 19.661V21.2329C32.0024 22.1082 31.9932 22.9834 31.9719 23.8584L31.9647 24.0912C31.9551 24.3612 31.9431 24.6263 31.9287 24.9455C31.8687 26.2235 31.6647 27.0934 31.3695 27.859C31.0691 28.6603 30.5969 29.386 29.986 29.9853C29.386 30.5952 28.6604 31.0673 27.8597 31.3688C27.0953 31.6652 26.2242 31.8668 24.9474 31.9268C24.6627 31.9402 24.3779 31.9522 24.0931 31.9628L23.8603 31.97C23.2687 31.9868 22.5835 31.9952 21.2336 31.9976L20.3385 31.9988H18.7677C17.8921 32.0018 17.0165 31.9926 16.1411 31.9712L15.9083 31.964C15.6234 31.9532 15.3386 31.9408 15.0539 31.9268C13.7772 31.8668 12.906 31.6652 12.1405 31.3688C11.3397 31.0681 10.6144 30.5959 10.0154 29.9853C9.40467 29.3856 8.93211 28.66 8.63066 27.859C8.33428 27.0946 8.13269 26.2235 8.07269 24.9455C8.05932 24.6608 8.04732 24.376 8.03669 24.0912L8.03069 23.8584C8.00858 22.9834 7.99858 22.1082 8.00069 21.2329V18.7658C7.99734 17.8906 8.00614 17.0154 8.02709 16.1404L8.03549 15.9076C8.04509 15.6376 8.05709 15.3724 8.07149 15.0532C8.13149 13.7753 8.33308 12.9053 8.62946 12.1398C8.93078 11.3381 9.40428 10.6123 10.0166 10.0135C10.6155 9.4033 11.3403 8.93114 12.1405 8.62997C12.906 8.33358 13.776 8.13199 15.0539 8.072C15.3731 8.0576 15.6395 8.0456 15.9083 8.036L16.1411 8.0288C17.0161 8.00748 17.8913 7.99828 18.7665 8.0012L21.2336 8ZM20.0001 13.9997C18.4089 13.9997 16.8828 14.6318 15.7577 15.757C14.6325 16.8821 14.0004 18.4082 14.0004 19.9994C14.0004 21.5906 14.6325 23.1166 15.7577 24.2418C16.8828 25.367 18.4089 25.9991 20.0001 25.9991C21.5913 25.9991 23.1173 25.367 24.2425 24.2418C25.3677 23.1166 25.9998 21.5906 25.9998 19.9994C25.9998 18.4082 25.3677 16.8821 24.2425 15.757C23.1173 14.6318 21.5913 13.9997 20.0001 13.9997ZM20.0001 16.3996C20.4728 16.3995 20.9409 16.4925 21.3777 16.6734C21.8145 16.8542 22.2114 17.1193 22.5457 17.4535C22.88 17.7877 23.1453 18.1845 23.3262 18.6212C23.5072 19.058 23.6004 19.526 23.6005 19.9988C23.6006 20.4715 23.5075 20.9396 23.3267 21.3764C23.1459 21.8132 22.8808 22.2101 22.5466 22.5444C22.2123 22.8787 21.8155 23.144 21.3788 23.325C20.9421 23.5059 20.474 23.5991 20.0013 23.5992C19.0465 23.5992 18.1309 23.2199 17.4558 22.5448C16.7807 21.8697 16.4015 20.9541 16.4015 19.9994C16.4015 19.0447 16.7807 18.129 17.4558 17.4539C18.1309 16.7788 19.0465 16.3996 20.0013 16.3996M26.301 12.1998C25.9032 12.1998 25.5216 12.3578 25.2403 12.6391C24.9591 12.9204 24.801 13.3019 24.801 13.6997C24.801 14.0975 24.9591 14.479 25.2403 14.7603C25.5216 15.0416 25.9032 15.1996 26.301 15.1996C26.6988 15.1996 27.0803 15.0416 27.3616 14.7603C27.6429 14.479 27.8009 14.0975 27.8009 13.6997C27.8009 13.3019 27.6429 12.9204 27.3616 12.6391C27.0803 12.3578 26.6988 12.1998 26.301 12.1998Z" fill="#234745"/>
                        </svg>
                      </a>
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
                      <p className="text-[#D2D2D2] font-medium text-[16px]" style={{ fontFamily: isEn ? 'sans-serif' : "'GE Dinar One', sans-serif" }}>{isEn ? '920000123' : '٩٢٠٠٠٠١٢٣'}</p>
                      <p className="text-[#D2D2D2] font-medium text-[16px] font-sans" dir="ltr">info@saadeddin.com</p>
                      <p className="text-[#D2D2D2] font-medium text-[16px] max-w-[200px]">
                        {isEn ? 'Riyadh, Saudi Arabia' : 'الرياض، المملكة العربية السعودية'}
                      </p>
                      
                      {/* App Buttons */}
                      <div className="flex flex-col gap-3 mt-2" dir="ltr">
                        {/* App Store */}
                        <a href="#" className="w-[144px] h-[48px] bg-black border border-[#A6A6A6] rounded-[7.2px] flex items-center justify-center gap-[6px] hover:bg-zinc-900 transition-colors">
                          <svg className="w-[20px] h-[24px]" viewBox="0 0 384 512" fill="white">
                            <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
                          </svg>
                          <div className="flex flex-col items-start leading-none gap-0.5 pt-0.5">
                            <span className="text-white text-[10px]" style={{ fontFamily: "'SF Compact Text', sans-serif" }}>Download on the</span>
                            <span className="text-white text-[20px] font-medium tracking-tight" style={{ fontFamily: "'SF Compact Display', sans-serif" }}>App Store</span>
                          </div>
                        </a>
                        
                        {/* Google Play */}
                        <a href="#" className="w-[144px] h-[48px] bg-black border border-[#A6A6A6] rounded-[7.2px] flex items-center justify-center gap-[6px] hover:bg-zinc-900 transition-colors">
                          <svg className="w-[20px] h-[22px]" viewBox="0 0 512 512">
                            <path fill="#4285F4" d="M26.9 44.7c-2 2-3.1 5.3-3.1 9.4v403.8c0 4.1 1.1 7.3 3.1 9.4L29 469.5l246.3-245.8v-3.4L29 22.5l-2.1 22.2z"/>
                            <path fill="#EA4335" d="M366.1 366.1l-90.8-90.8v-3.4L366.1 181 483 247.3c16.6 9.4 16.6 24.8 0 34.3L366.1 366.1z"/>
                            <path fill="#FBBC04" d="M26.9 44.7L275.3 272.2 366.1 181 54.3 3.6C39.5-4.8 26.9 2.2 26.9 22.5v22.2z"/>
                            <path fill="#34A853" d="M26.9 467.3v22.2c0 20.3 12.6 27.3 27.4 18.9L366.1 331 275.3 240.2 26.9 467.3z"/>
                          </svg>
                          <div className="flex flex-col items-start leading-none gap-0.5 pt-0.5">
                            <span className="text-white text-[10px] uppercase font-medium" style={{ fontFamily: "'Product Sans', sans-serif" }}>GET IT ON</span>
                            <span className="text-white text-[18px] font-medium tracking-tight" style={{ fontFamily: "'Product Sans', sans-serif" }}>Google Play</span>
                          </div>
                        </a>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Bottom Bar */}
                <div className="w-full flex flex-col md:flex-row justify-between items-center gap-4" style={{ color: '#FEF8EB' }}>
                  <div className="flex items-center gap-8">
                    <NavLink to={isEn ? "/en/pages/privacy" : "/pages/privacy"} className="font-medium text-[16px] hover:text-white transition-colors" style={{ color: '#FEF8EB' }}>{isEn ? 'Privacy Policy' : 'سياسة الخصوصية'}</NavLink>
                    <span className="font-medium text-[16px]" style={{ color: '#FEF8EB' }}>.</span>
                    <NavLink to={isEn ? "/en/pages/terms" : "/pages/terms"} className="font-medium text-[16px] hover:text-white transition-colors" style={{ color: '#FEF8EB' }}>{isEn ? 'Terms and Conditions' : 'الشروط والاحكام'}</NavLink>
                  </div>
                  <div className="font-medium text-[16px]" style={{ color: '#FEF8EB' }}>
                     {isEn ? '© 2026 Saadeddin — All Rights Reserved' : '© ٢٠٢٦ سعد الدين — جميع الحقوق محفوظة'}
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
