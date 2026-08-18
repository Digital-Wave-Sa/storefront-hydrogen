export interface CountryCodeItem {
  nameEn: string;
  nameAr: string;
  dialCode: string;
  code: string;
  flag: string;
}

/**
 * Pinned primary countries shown at the top of the list for fast selection.
 */
export const PRIORITY_COUNTRIES: CountryCodeItem[] = [
  { nameEn: 'Saudi Arabia', nameAr: 'المملكة العربية السعودية', dialCode: '+966', code: 'SA', flag: '🇸🇦' },
  { nameEn: 'United Arab Emirates', nameAr: 'الإمارات العربية المتحدة', dialCode: '+971', code: 'AE', flag: '🇦🇪' },
  { nameEn: 'Kuwait', nameAr: 'الكويت', dialCode: '+965', code: 'KW', flag: '🇰🇼' },
  { nameEn: 'Qatar', nameAr: 'قطر', dialCode: '+974', code: 'QA', flag: '🇶🇦' },
  { nameEn: 'Bahrain', nameAr: 'البحرين', dialCode: '+973', code: 'BH', flag: '🇧🇭' },
  { nameEn: 'Oman', nameAr: 'عُمان', dialCode: '+968', code: 'OM', flag: '🇴🇲' },
  { nameEn: 'Jordan', nameAr: 'الأردن', dialCode: '+962', code: 'JO', flag: '🇯🇴' },
  { nameEn: 'Egypt', nameAr: 'مصر', dialCode: '+20', code: 'EG', flag: '🇪🇬' },
];

const OTHER_COUNTRIES: CountryCodeItem[] = [
  { nameEn: 'Afghanistan', nameAr: 'أفغانستان', dialCode: '+93', code: 'AF', flag: '🇦🇫' },
  { nameEn: 'Albania', nameAr: 'ألبانيا', dialCode: '+355', code: 'AL', flag: '🇦🇱' },
  { nameEn: 'Algeria', nameAr: 'الجزائر', dialCode: '+213', code: 'DZ', flag: '🇩🇿' },
  { nameEn: 'Andorra', nameAr: 'أندورا', dialCode: '+376', code: 'AD', flag: '🇦🇩' },
  { nameEn: 'Angola', nameAr: 'أنغولا', dialCode: '+244', code: 'AO', flag: '🇦🇴' },
  { nameEn: 'Argentina', nameAr: 'الأرجنتين', dialCode: '+54', code: 'AR', flag: '🇦🇷' },
  { nameEn: 'Armenia', nameAr: 'أرمينيا', dialCode: '+374', code: 'AM', flag: '🇦🇲' },
  { nameEn: 'Australia', nameAr: 'أستراليا', dialCode: '+61', code: 'AU', flag: '🇦🇺' },
  { nameEn: 'Austria', nameAr: 'النمسا', dialCode: '+43', code: 'AT', flag: '🇦🇹' },
  { nameEn: 'Azerbaijan', nameAr: 'أذربيجان', dialCode: '+994', code: 'AZ', flag: '🇦🇿' },
  { nameEn: 'Bangladesh', nameAr: 'بنغلاديش', dialCode: '+880', code: 'BD', flag: '🇧🇩' },
  { nameEn: 'Belarus', nameAr: 'بيلاروسيا', dialCode: '+375', code: 'BY', flag: '🇧🇾' },
  { nameEn: 'Belgium', nameAr: 'بلجيكا', dialCode: '+32', code: 'BE', flag: '🇧🇪' },
  { nameEn: 'Belize', nameAr: 'بليز', dialCode: '+501', code: 'BZ', flag: '🇧🇿' },
  { nameEn: 'Benin', nameAr: 'بنين', dialCode: '+229', code: 'BJ', flag: '🇧🇯' },
  { nameEn: 'Bhutan', nameAr: 'بوتان', dialCode: '+975', code: 'BT', flag: '🇧🇹' },
  { nameEn: 'Bolivia', nameAr: 'بوليفيا', dialCode: '+591', code: 'BO', flag: '🇧🇴' },
  { nameEn: 'Bosnia and Herzegovina', nameAr: 'البوسنة والهرسك', dialCode: '+387', code: 'BA', flag: '🇧🇦' },
  { nameEn: 'Botswana', nameAr: 'بوتسوانا', dialCode: '+267', code: 'BW', flag: '🇧🇼' },
  { nameEn: 'Brazil', nameAr: 'البرازيل', dialCode: '+55', code: 'BR', flag: '🇧🇷' },
  { nameEn: 'Brunei', nameAr: 'بروناي', dialCode: '+673', code: 'BN', flag: '🇧🇳' },
  { nameEn: 'Bulgaria', nameAr: 'بلغاريا', dialCode: '+359', code: 'BG', flag: '🇧🇬' },
  { nameEn: 'Burkina Faso', nameAr: 'بوركينا فاسو', dialCode: '+226', code: 'BF', flag: '🇧🇫' },
  { nameEn: 'Burundi', nameAr: 'بوروندي', dialCode: '+257', code: 'BI', flag: '🇧🇮' },
  { nameEn: 'Cambodia', nameAr: 'كمبوديا', dialCode: '+855', code: 'KH', flag: '🇰🇭' },
  { nameEn: 'Cameroon', nameAr: 'الكاميرون', dialCode: '+237', code: 'CM', flag: '🇨🇲' },
  { nameEn: 'Canada', nameAr: 'كندا', dialCode: '+1', code: 'CA', flag: '🇨🇦' },
  { nameEn: 'Chad', nameAr: 'تشاد', dialCode: '+235', code: 'TD', flag: '🇹🇩' },
  { nameEn: 'Chile', nameAr: 'تشيلي', dialCode: '+56', code: 'CL', flag: '🇨🇱' },
  { nameEn: 'China', nameAr: 'الصين', dialCode: '+86', code: 'CN', flag: '🇨🇳' },
  { nameEn: 'Colombia', nameAr: 'كولومبيا', dialCode: '+57', code: 'CO', flag: '🇨🇴' },
  { nameEn: 'Comoros', nameAr: 'جزر القمر', dialCode: '+269', code: 'KM', flag: '🇰🇲' },
  { nameEn: 'Congo', nameAr: 'الكونغو', dialCode: '+242', code: 'CG', flag: '🇨🇬' },
  { nameEn: 'Costa Rica', nameAr: 'كوستاريكا', dialCode: '+506', code: 'CR', flag: '🇨🇷' },
  { nameEn: 'Croatia', nameAr: 'كرواتيا', dialCode: '+385', code: 'HR', flag: '🇭🇷' },
  { nameEn: 'Cyprus', nameAr: 'قبرص', dialCode: '+357', code: 'CY', flag: '🇨🇾' },
  { nameEn: 'Czech Republic', nameAr: 'التشيك', dialCode: '+420', code: 'CZ', flag: '🇨🇿' },
  { nameEn: 'Denmark', nameAr: 'الدنمارك', dialCode: '+45', code: 'DK', flag: '🇩🇰' },
  { nameEn: 'Djibouti', nameAr: 'جيبوتي', dialCode: '+253', code: 'DJ', flag: '🇩🇯' },
  { nameEn: 'Ecuador', nameAr: 'الإكوادور', dialCode: '+593', code: 'EC', flag: '🇪🇨' },
  { nameEn: 'Estonia', nameAr: 'إستونيا', dialCode: '+372', code: 'EE', flag: '🇪🇪' },
  { nameEn: 'Ethiopia', nameAr: 'إثيوبيا', dialCode: '+251', code: 'ET', flag: '🇪🇹' },
  { nameEn: 'Finland', nameAr: 'فنلندا', dialCode: '+358', code: 'FI', flag: '🇫🇮' },
  { nameEn: 'France', nameAr: 'فرنسا', dialCode: '+33', code: 'FR', flag: '🇫🇷' },
  { nameEn: 'Georgia', nameAr: 'جورجيا', dialCode: '+995', code: 'GE', flag: '🇬🇪' },
  { nameEn: 'Germany', nameAr: 'ألمانيا', dialCode: '+49', code: 'DE', flag: '🇩🇪' },
  { nameEn: 'Ghana', nameAr: 'غانا', dialCode: '+233', code: 'GH', flag: '🇬🇭' },
  { nameEn: 'Greece', nameAr: 'اليونان', dialCode: '+30', code: 'GR', flag: '🇬🇷' },
  { nameEn: 'Hong Kong', nameAr: 'هونغ كونغ', dialCode: '+852', code: 'HK', flag: '🇭🇰' },
  { nameEn: 'Hungary', nameAr: 'المجر', dialCode: '+36', code: 'HU', flag: '🇭🇺' },
  { nameEn: 'Iceland', nameAr: 'آيسلندا', dialCode: '+354', code: 'IS', flag: '🇮🇸' },
  { nameEn: 'India', nameAr: 'الهند', dialCode: '+91', code: 'IN', flag: '🇮🇳' },
  { nameEn: 'Indonesia', nameAr: 'إندونيسيا', dialCode: '+62', code: 'ID', flag: '🇮🇩' },
  { nameEn: 'Iran', nameAr: 'إيران', dialCode: '+98', code: 'IR', flag: '🇮🇷' },
  { nameEn: 'Iraq', nameAr: 'العراق', dialCode: '+964', code: 'IQ', flag: '🇮🇶' },
  { nameEn: 'Ireland', nameAr: 'أيرلندا', dialCode: '+353', code: 'IE', flag: '🇮🇪' },
  { nameEn: 'Italy', nameAr: 'إيطاليا', dialCode: '+39', code: 'IT', flag: '🇮🇹' },
  { nameEn: 'Japan', nameAr: 'اليابان', dialCode: '+81', code: 'JP', flag: '🇯🇵' },
  { nameEn: 'Kazakhstan', nameAr: 'كازاخستان', dialCode: '+7', code: 'KZ', flag: '🇰🇿' },
  { nameEn: 'Kenya', nameAr: 'كينيا', dialCode: '+254', code: 'KE', flag: '🇰🇪' },
  { nameEn: 'Lebanon', nameAr: 'لبنان', dialCode: '+961', code: 'LB', flag: '🇱🇧' },
  { nameEn: 'Libya', nameAr: 'ليبيا', dialCode: '+218', code: 'LY', flag: '🇱🇾' },
  { nameEn: 'Lithuania', nameAr: 'ليتوانيا', dialCode: '+370', code: 'LT', flag: '🇱🇹' },
  { nameEn: 'Luxembourg', nameAr: 'لوكسمبورغ', dialCode: '+352', code: 'LU', flag: '🇱🇺' },
  { nameEn: 'Malaysia', nameAr: 'ماليزيا', dialCode: '+60', code: 'MY', flag: '🇲🇾' },
  { nameEn: 'Maldives', nameAr: 'المالديف', dialCode: '+960', code: 'MV', flag: '🇲🇻' },
  { nameEn: 'Mali', nameAr: 'مالي', dialCode: '+223', code: 'ML', flag: '🇲🇱' },
  { nameEn: 'Malta', nameAr: 'مالطا', dialCode: '+356', code: 'MT', flag: '🇲🇹' },
  { nameEn: 'Mauritania', nameAr: 'موريتانيا', dialCode: '+222', code: 'MR', flag: '🇲🇷' },
  { nameEn: 'Mauritius', nameAr: 'موريشيوس', dialCode: '+230', code: 'MU', flag: '🇲🇺' },
  { nameEn: 'Mexico', nameAr: 'المكسيك', dialCode: '+52', code: 'MX', flag: '🇲🇽' },
  { nameEn: 'Monaco', nameAr: 'موناكو', dialCode: '+377', code: 'MC', flag: '🇲🇨' },
  { nameEn: 'Montenegro', nameAr: 'الجبل الأسود', dialCode: '+382', code: 'ME', flag: '🇲🇪' },
  { nameEn: 'Morocco', nameAr: 'المغرب', dialCode: '+212', code: 'MA', flag: '🇲🇦' },
  { nameEn: 'Nepal', nameAr: 'نيبال', dialCode: '+977', code: 'NP', flag: '🇳🇵' },
  { nameEn: 'Netherlands', nameAr: 'هولندا', dialCode: '+31', code: 'NL', flag: '🇳🇱' },
  { nameEn: 'New Zealand', nameAr: 'نيوزيلندا', dialCode: '+64', code: 'NZ', flag: '🇳🇿' },
  { nameEn: 'Nigeria', nameAr: 'نيجيريا', dialCode: '+234', code: 'NG', flag: '🇳🇬' },
  { nameEn: 'Norway', nameAr: 'النرويج', dialCode: '+47', code: 'NO', flag: '🇳🇴' },
  { nameEn: 'Pakistan', nameAr: 'باكستان', dialCode: '+92', code: 'PK', flag: '🇵🇰' },
  { nameEn: 'Palestine', nameAr: 'فلسطين', dialCode: '+970', code: 'PS', flag: '🇵🇸' },
  { nameEn: 'Panama', nameAr: 'بنما', dialCode: '+507', code: 'PA', flag: '🇵🇦' },
  { nameEn: 'Philippines', nameAr: 'الفلبين', dialCode: '+63', code: 'PH', flag: '🇵🇭' },
  { nameEn: 'Poland', nameAr: 'بولندا', dialCode: '+48', code: 'PL', flag: '🇵🇱' },
  { nameEn: 'Portugal', nameAr: 'البرتغال', dialCode: '+351', code: 'PT', flag: '🇵🇹' },
  { nameEn: 'Romania', nameAr: 'رومانيا', dialCode: '+40', code: 'RO', flag: '🇷🇴' },
  { nameEn: 'Russia', nameAr: 'روسيا', dialCode: '+7', code: 'RU', flag: '🇷🇺' },
  { nameEn: 'Rwanda', nameAr: 'رواندا', dialCode: '+250', code: 'RW', flag: '🇷🇼' },
  { nameEn: 'Senegal', nameAr: 'السنغال', dialCode: '+221', code: 'SN', flag: '🇸🇳' },
  { nameEn: 'Serbia', nameAr: 'صربيا', dialCode: '+381', code: 'RS', flag: '🇷🇸' },
  { nameEn: 'Singapore', nameAr: 'سنغافورة', dialCode: '+65', code: 'SG', flag: '🇸🇬' },
  { nameEn: 'Slovakia', nameAr: 'سلوفاكيا', dialCode: '+421', code: 'SK', flag: '🇸🇰' },
  { nameEn: 'Slovenia', nameAr: 'سلوفينيا', dialCode: '+386', code: 'SI', flag: '🇸🇮' },
  { nameEn: 'Somalia', nameAr: 'الصومال', dialCode: '+252', code: 'SO', flag: '🇸🇴' },
  { nameEn: 'South Africa', nameAr: 'جنوب أفريقيا', dialCode: '+27', code: 'ZA', flag: '🇿🇦' },
  { nameEn: 'South Korea', nameAr: 'كوريا الجنوبية', dialCode: '+82', code: 'KR', flag: '🇰🇷' },
  { nameEn: 'Spain', nameAr: 'إسبانيا', dialCode: '+34', code: 'ES', flag: '🇪🇸' },
  { nameEn: 'Sri Lanka', nameAr: 'سريلانكا', dialCode: '+94', code: 'LK', flag: '🇱🇰' },
  { nameEn: 'Sudan', nameAr: 'السودان', dialCode: '+249', code: 'SD', flag: '🇸🇩' },
  { nameEn: 'Sweden', nameAr: 'السويد', dialCode: '+46', code: 'SE', flag: '🇸🇪' },
  { nameEn: 'Switzerland', nameAr: 'سويسرا', dialCode: '+41', code: 'CH', flag: '🇨🇭' },
  { nameEn: 'Syria', nameAr: 'سوريا', dialCode: '+963', code: 'SY', flag: '🇸🇾' },
  { nameEn: 'Taiwan', nameAr: 'تايوان', dialCode: '+886', code: 'TW', flag: '🇹🇼' },
  { nameEn: 'Tanzania', nameAr: 'تنزانيا', dialCode: '+255', code: 'TZ', flag: '🇹🇿' },
  { nameEn: 'Thailand', nameAr: 'تايلاند', dialCode: '+66', code: 'TH', flag: '🇹🇭' },
  { nameEn: 'Tunisia', nameAr: 'تونس', dialCode: '+216', code: 'TN', flag: '🇹🇳' },
  { nameEn: 'Turkey', nameAr: 'تركيا', dialCode: '+90', code: 'TR', flag: '🇹🇷' },
  { nameEn: 'Uganda', nameAr: 'أوغندا', dialCode: '+256', code: 'UG', flag: '🇺🇬' },
  { nameEn: 'Ukraine', nameAr: 'أوكرانيا', dialCode: '+380', code: 'UA', flag: '🇺🇦' },
  { nameEn: 'United Kingdom', nameAr: 'المملكة المتحدة', dialCode: '+44', code: 'GB', flag: '🇬🇧' },
  { nameEn: 'United States', nameAr: 'الولايات المتحدة', dialCode: '+1', code: 'US', flag: '🇺🇸' },
  { nameEn: 'Uruguay', nameAr: 'أوروغواي', dialCode: '+598', code: 'UY', flag: '🇺🇾' },
  { nameEn: 'Uzbekistan', nameAr: 'أوزبكستان', dialCode: '+998', code: 'UZ', flag: '🇺🇿' },
  { nameEn: 'Venezuela', nameAr: 'فنزويلا', dialCode: '+58', code: 'VE', flag: '🇻🇪' },
  { nameEn: 'Vietnam', nameAr: 'فيتنام', dialCode: '+84', code: 'VN', flag: '🇻🇳' },
  { nameEn: 'Yemen', nameAr: 'اليمن', dialCode: '+967', code: 'YE', flag: '🇾🇪' },
  { nameEn: 'Zambia', nameAr: 'زامبيا', dialCode: '+260', code: 'ZM', flag: '🇿🇲' },
  { nameEn: 'Zimbabwe', nameAr: 'زيمبابوي', dialCode: '+263', code: 'ZW', flag: '🇿🇼' },
];

/**
 * Complete list of countries, with priority GCC / Arab countries first, followed by other countries alphabetically.
 */
export const COUNTRY_CODES: CountryCodeItem[] = [
  ...PRIORITY_COUNTRIES,
  ...OTHER_COUNTRIES.sort((a, b) => a.nameEn.localeCompare(b.nameEn)),
];

export const DEFAULT_COUNTRY_CODE = '+966';

export function findCountryByDialCode(dialCode: string): CountryCodeItem | undefined {
  if (!dialCode) return undefined;
  const clean = dialCode.startsWith('+') ? dialCode : `+${dialCode.replace(/\D/g, '')}`;
  return COUNTRY_CODES.find((c) => c.dialCode === clean);
}

export function parsePhoneCountry(phone: string): { countryCode: string; localNumber: string } {
  if (!phone) return { countryCode: DEFAULT_COUNTRY_CODE, localNumber: '' };

  const clean = phone.startsWith('+') ? phone : `+${phone.replace(/\D/g, '')}`;

  // Try matching longest dial code first to avoid partial collisions (e.g. +966 vs +96)
  const sorted = [...COUNTRY_CODES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  for (const c of sorted) {
    if (clean.startsWith(c.dialCode)) {
      return {
        countryCode: c.dialCode,
        localNumber: clean.substring(c.dialCode.length),
      };
    }
  }

  return { countryCode: DEFAULT_COUNTRY_CODE, localNumber: phone.replace(/^\+966/, '') };
}
