import React, { useState, useRef } from 'react';
import { Cake, Palette, Sparkles, MessageSquare, Layers, ArrowRight, ArrowLeft, Eye, Compass } from 'lucide-react';
import { CakePreview } from './CakePreview';
import { FaqModal } from './FaqModal';
import { SaudiRiyalSymbol } from '~/components/Price';

const toArabicDigits = (num: number | string) => {
  return String(num);
};

const SizeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g clipPath="url(#clip0_851_12688)">
      <path d="M11.991 0.0195312L11.0985 1.20453C10.9283 1.42971 10.8493 1.71084 10.8774 1.99172C10.9055 2.27259 11.0386 2.53252 11.25 2.71953V6.00003H7.5C6.70435 6.00003 5.94129 6.3161 5.37868 6.87871C4.81607 7.44132 4.5 8.20438 4.5 9.00003V13.5H3C2.20435 13.5 1.44129 13.8161 0.87868 14.3787C0.316071 14.9413 0 15.7044 0 16.5L0 22.5C0 22.8979 0.158035 23.2794 0.43934 23.5607C0.720644 23.842 1.10218 24 1.5 24H22.5C22.8978 24 23.2794 23.842 23.5607 23.5607C23.842 23.2794 24 22.8979 24 22.5V16.5C24 15.7044 23.6839 14.9413 23.1213 14.3787C22.5587 13.8161 21.7956 13.5 21 13.5H19.5V9.00003C19.5 8.20438 19.1839 7.44132 18.6213 6.87871C18.0587 6.3161 17.2956 6.00003 16.5 6.00003H12.75V2.70903C12.9569 2.52059 13.0858 2.26153 13.1114 1.98282C13.1369 1.70412 13.0572 1.42594 12.888 1.20303L11.991 0.0195312ZM6 9.00003C6 8.60221 6.15804 8.22068 6.43934 7.93937C6.72064 7.65807 7.10218 7.50003 7.5 7.50003H16.5C16.8978 7.50003 17.2794 7.65807 17.5607 7.93937C17.842 8.22068 18 8.60221 18 9.00003V9.62103C17.8198 9.62208 17.6413 9.58705 17.4749 9.51801C17.3084 9.44897 17.1575 9.34731 17.031 9.21903C16.7644 8.95217 16.4478 8.74046 16.0993 8.59602C15.7508 8.45158 15.3772 8.37724 15 8.37724C14.6228 8.37724 14.2492 8.45158 13.9007 8.59602C13.5522 8.74046 13.2356 8.95217 12.969 9.21903C12.7119 9.47587 12.3634 9.62014 12 9.62014C11.6366 9.62014 11.2881 9.47587 11.031 9.21903C10.7644 8.95217 10.4478 8.74046 10.0993 8.59602C9.75078 8.45158 9.37724 8.37724 9 8.37724C8.62276 8.37724 8.24922 8.45158 7.90073 8.59602C7.55224 8.74046 7.23563 8.95217 6.969 9.21903C6.84248 9.34731 6.69157 9.44897 6.52515 9.51801C6.35873 9.58705 6.18017 9.62208 6 9.62103V9.00003ZM6 11.121C6.735 11.121 7.47 10.8405 8.031 10.281C8.28808 10.0242 8.63661 9.87992 9 9.87992C9.36339 9.87992 9.71192 10.0242 9.969 10.281C11.091 11.4015 12.909 11.4015 14.031 10.281C14.2881 10.0242 14.6366 9.87992 15 9.87992C15.3634 9.87992 15.7119 10.0242 15.969 10.281C16.53 10.8405 17.265 11.121 18 11.121V13.5H6V11.121ZM1.5 16.5C1.5 16.1022 1.65804 15.7207 1.93934 15.4394C2.22064 15.1581 2.60218 15 3 15H21C21.3978 15 21.7794 15.1581 22.0607 15.4394C22.342 15.7207 22.5 16.1022 22.5 16.5V17.6895L21.969 18.2205C21.8417 18.3479 21.6905 18.449 21.5241 18.518C21.3577 18.5869 21.1794 18.6224 20.9993 18.6224C20.8191 18.6224 20.6408 18.5869 20.4744 18.518C20.308 18.449 20.1568 18.3479 20.0295 18.2205C19.7629 17.9539 19.4464 17.7424 19.098 17.5981C18.7497 17.4538 18.3763 17.3795 17.9993 17.3795C17.6222 17.3795 17.2488 17.4538 16.9005 17.5981C16.5521 17.7424 16.2356 17.9539 15.969 18.2205C15.7119 18.4774 15.3634 18.6216 15 18.6216C14.6366 18.6216 14.2881 18.4774 14.031 18.2205C13.7644 17.9537 13.4478 17.742 13.0993 17.5975C12.7508 17.4531 12.3772 17.3787 12 17.3787C11.6228 17.3787 11.2492 17.4531 10.9007 17.5975C10.5522 17.742 10.2356 17.9537 9.969 18.2205C9.71192 18.4774 9.36339 18.6216 9 18.6216C8.63661 18.6216 8.28808 18.4774 8.031 18.2205C7.76437 17.9537 7.44776 17.742 7.09927 17.5975C6.75078 17.4531 6.37724 17.3787 6 17.3787C5.62276 17.3787 5.24922 17.4531 4.90073 17.5975C4.55224 17.742 4.23563 17.9537 3.969 18.2205C3.71192 18.4774 3.36339 18.6216 3 18.6216C2.63661 18.6216 2.28808 18.4774 2.031 18.2205L1.5 17.6895V16.5ZM18.969 19.281C19.4251 19.7371 20.0214 20.0264 20.662 20.1023C21.3025 20.1782 21.9499 20.0363 22.5 19.6995V22.5H1.5V19.6995C2.6055 20.3775 4.0725 20.2395 5.031 19.2795C5.28808 19.0227 5.63661 18.8784 6 18.8784C6.36339 18.8784 6.71192 19.0227 6.969 19.2795C8.091 20.4015 9.909 20.4015 11.031 19.2795C11.2881 19.0227 11.6366 18.8784 12 18.8784C12.3634 18.8784 12.7119 19.0227 12.969 19.2795C14.091 20.4015 15.909 20.4015 17.0295 19.2795C17.1568 19.1521 17.308 19.0511 17.4744 18.9821C17.6408 18.9132 17.8191 18.8777 17.9993 18.8777C18.1794 18.8777 18.3577 18.9132 18.5241 18.9821C18.6905 19.0511 18.8417 19.1521 18.969 19.2795V19.281Z" fill="currentColor"/>
    </g>
    <defs>
      <clipPath id="clip0_851_12688">
        <rect width="24" height="24" fill="white"/>
      </clipPath>
    </defs>
  </svg>
);

const FlavorIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 17H22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M12 7.00025C12 7.00025 13.5 5.96625 13.5 4.69125C13.5 2.43625 10.5 2.43625 10.5 4.69125C10.5 5.96625 12 7.00025 12 7.00025Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M3 17L3.621 19.485C3.72915 19.9177 3.97882 20.3018 4.33033 20.5763C4.68184 20.8508 5.11501 20.9999 5.561 21H18.438C18.884 20.9999 19.3172 20.8508 19.6687 20.5763C20.0202 20.3018 20.2698 19.9177 20.378 19.485L21 17M20.5 14.5C20.002 10.277 16.386 7 12 7C7.614 7 3.998 10.277 3.5 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const DecorationIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 18 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 14L4.276 15.658C4.542 17.254 4.676 18.052 5.235 18.526C5.795 19 6.604 19 8.222 19H9.778C11.396 19 12.206 19 12.765 18.526C13.324 18.052 13.458 17.254 13.724 15.658L14 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10.5 2.5C11 1.5 12 1 13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M9 6C10.1046 6 11 5.10457 11 4C11 2.89543 10.1046 2 9 2C7.89543 2 7 2.89543 7 4C7 5.10457 7.89543 6 9 6Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M6.99953 5.53482C6.25824 5.96238 5.67361 6.61641 5.33153 7.40082C5.25534 7.57554 5.13081 7.72484 4.97259 7.83114C4.81438 7.93744 4.62909 7.99632 4.43853 8.00082C4.04765 8.01034 3.66445 8.11141 3.31972 8.29592C2.97499 8.48042 2.67834 8.74321 2.45361 9.06317C2.22888 9.38314 2.08233 9.75135 2.02573 10.1382C1.96914 10.5251 2.00408 10.9199 2.12775 11.2908C2.25142 11.6617 2.46037 11.9985 2.73781 12.274C3.01525 12.5495 3.35345 12.7561 3.72522 12.8772C4.097 12.9983 4.492 13.0305 4.87848 12.9712C5.26496 12.9119 5.63214 12.7628 5.95053 12.5358C6.10582 12.4247 6.28967 12.3604 6.48034 12.3505C6.67102 12.3406 6.86055 12.3855 7.02653 12.4798C7.60753 12.8098 8.27953 12.9998 8.99953 12.9998C9.71953 12.9998 10.3915 12.8098 10.9725 12.4798C11.1385 12.3855 11.328 12.3406 11.5187 12.3505C11.7094 12.3604 11.8932 12.4247 12.0485 12.5358C12.3669 12.7628 12.7341 12.9119 13.1206 12.9712C13.5071 13.0305 13.9021 12.9983 14.2738 12.8772C14.6456 12.7561 14.9838 12.5495 15.2613 12.274C15.5387 11.9985 15.7476 11.6617 15.8713 11.2908C15.995 10.9199 16.0299 10.5251 15.9733 10.1382C15.9167 9.75135 15.7702 9.38314 15.5455 9.06317C15.3207 8.74321 15.0241 8.48042 14.6793 8.29592C14.3346 8.11141 13.9514 8.01034 13.5605 8.00082C13.37 7.99632 13.1847 7.93744 13.0265 7.83114C12.8683 7.72484 12.7437 7.57554 12.6675 7.40082C12.3255 6.61641 11.7408 5.96238 10.9995 5.53482V3.34082C12.369 3.82725 13.5162 4.79265 14.2295 6.05882C14.8722 6.16445 15.4842 6.40829 16.0234 6.77348C16.5627 7.13868 17.0162 7.61654 17.3528 8.17407C17.6893 8.73161 17.9009 9.35555 17.9729 10.0028C18.0449 10.6501 17.9755 11.3052 17.7696 11.9231C17.5638 12.541 17.2262 13.1068 16.7804 13.5815C16.3346 14.0562 15.791 14.4285 15.1873 14.6728C14.5836 14.917 13.9341 15.0273 13.2836 14.996C12.6331 14.9648 11.9971 14.7928 11.4195 14.4918C10.6569 14.8273 9.83272 15.0004 8.99953 14.9998C8.16627 15 7.3421 14.8267 6.57953 14.4908C6.00214 14.7917 5.36633 14.9637 4.71599 14.995C4.06565 15.0262 3.41628 14.916 2.8127 14.6718C2.20911 14.4277 1.66569 14.0555 1.21995 13.5809C0.774199 13.1063 0.436745 12.5407 0.230875 11.923C0.0250053 11.3053 -0.0443758 10.6503 0.0275206 10.0032C0.0994169 9.35612 0.310878 8.73232 0.647308 8.17489C0.983739 7.61746 1.43712 7.13968 1.97617 6.77451C2.51521 6.40935 3.12708 6.16551 3.76953 6.05982C4.48265 4.79327 5.62992 3.8275 6.99953 3.34082V5.53482Z" fill="currentColor"/>
  </svg>
);

const MessageIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21.9167 10.5002C21.9347 10.6562 21.9491 10.8129 21.9597 10.9702C22.0127 11.8012 22.0127 12.6602 21.9597 13.4912C21.6857 17.7332 18.3537 21.1132 14.1697 21.3912C12.7246 21.4865 11.2748 21.4865 9.82973 21.3912C9.31969 21.3561 8.81829 21.2414 8.34373 21.0512C7.83173 20.8412 7.57573 20.7352 7.44473 20.7512C7.31473 20.7672 7.12573 20.9062 6.74873 21.1852C6.08273 21.6752 5.24373 22.0292 3.99873 21.9982C3.36973 21.9832 3.05573 21.9752 2.91473 21.7352C2.77373 21.4952 2.94873 21.1632 3.29973 20.4982C3.78673 19.5762 4.09473 18.5202 3.62773 17.6752C2.82273 16.4672 2.13973 15.0362 2.03973 13.4912C1.98676 12.6521 1.98676 11.8104 2.03973 10.9712C2.31373 6.72924 5.64573 3.34924 9.82973 3.07124C11.0514 2.99083 12.2767 2.97848 13.4997 3.03424M8.49973 15.0002H15.4997M8.49973 10.0002H10.9997" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M20.8675 2.44016L21.5605 3.13216C21.8417 3.41345 21.9997 3.79491 21.9997 4.19266C21.9997 4.5904 21.8417 4.97186 21.5605 5.25316L17.9325 8.95016C17.6472 9.23558 17.2822 9.428 16.8855 9.50216L14.6375 9.99016C14.5557 10.0079 14.4708 10.0049 14.3906 9.98137C14.3103 9.95783 14.2372 9.91453 14.178 9.85542C14.1188 9.79632 14.0754 9.7233 14.0517 9.64307C14.028 9.56283 14.0249 9.47793 14.0425 9.39616L14.5215 7.16116C14.5954 6.76457 14.7874 6.3996 15.0725 6.11416L18.7465 2.44016C19.0278 2.15895 19.4092 2.00098 19.807 2.00098C20.2047 2.00098 20.5862 2.15895 20.8675 2.44016Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const steps = [
  { id: 1, titleEn: 'Shape', titleAr: 'اختر الشكل', icon: Cake },
  { id: 2, titleEn: 'Flavor', titleAr: 'أختر النكهة', icon: FlavorIcon },
  { id: 3, titleEn: 'Decoration', titleAr: 'أختر التزيين', icon: DecorationIcon },
  { id: 4, titleEn: 'Message', titleAr: 'أضف رسالتك الخاصة', icon: MessageIcon }
];

const cakeOptions = {
  shapes: [
    { id: 'circle', name: 'دائري (Circle)', price: 0, image: '/images/cake-builder/cake-round.webp', is3D: true },
    { id: 'standard', name: 'عادي طويل (Standard)', price: 5, image: '/images/cake-builder/cake-tall.webp', is3D: true },
    { id: 'square', name: 'مربع (Square)', price: 10, image: '/images/cake-builder/cake-square.webp', is3D: true },
    { id: 'sheet', name: 'مستطيل (Sheet)', price: 15, image: '/images/cake-builder/cake-square.webp', is3D: true },
    { id: 'heart', name: 'قلب (Heart)', price: 15, image: '/images/cake-builder/cake-heart.webp', is3D: true }
  ],
  sizes: [
    { id: '6-inch', name: 'صغير (Small)', personsAr: '٤-٦ أشخاص', personsEn: '4-6 Persons', price: 120, scale: 0.8 },
    { id: '8-inch', name: 'وسط (Medium)', personsAr: '٨-١٢ شخصاً', personsEn: '8-12 Persons', price: 180, scale: 1.0 },
    { id: '10-inch', name: 'كبير (Large)', personsAr: '١٥-٢٠ شخصاً', personsEn: '15-20 Persons', price: 260, scale: 1.25 }
  ],
  tiers: [
    { id: '1-tier', name: 'طبقة واحدة (Single Tier)', price: 0, count: 1 },
    { id: '2-tier', name: 'طبقتين (Two Tiers)', price: 45, count: 2 },
    { id: '3-tier', name: '3 طبقات (Three Tiers)', price: 85, count: 3 }
  ],
  flavors: [
    { id: 'vanilla', name: 'فانيلا (Vanilla)', price: 0, image: '/cake/flavors/vanilla.png', color: '#f5deb3' },
    { id: 'chocolate', name: 'شوكولاتة (Chocolate)', price: 5, image: '/cake/flavors/chocolate.png', color: '#3E2723' },
    { id: 'red-velvet', name: 'ريد فيلفيت (Red Velvet)', price: 10, image: '/cake/flavors/red-velvet.png', color: '#8b0000' },
    { id: 'nutella', name: 'نوتيلا (Nutella)', price: 15, image: '/cake/flavors/nutella.png', color: '#5C4033' }
  ],
  styles: [
    { id: 'basic', name: 'ناعم (Smooth Minimalist)', price: 0 },
    { id: 'witches-dont-age', name: 'الساحرات لا يشيخن (Witches Dont Age)', price: 30, image: '/cake/toppings/witches_dont_age/standard_front.png' }
  ],
  colors: [
    { id: 'white', name: 'أبيض كلاسيكي (White)', price: 0, color: '#fdf5e6' },
    { id: 'pink', name: 'وردي لولا (Lola Pink)', price: 0, color: '#ffb6c1' },
    { id: 'magenta', name: 'ماجنتا (Magenta)', price: 10, color: '#a32c81' },
    { id: 'red', name: 'أحمر مخملي (Red)', price: 5, color: '#dc143c' },
    { id: 'orange', name: 'برتقالي (Orange)', price: 5, color: '#ff8c00' },
    { id: 'yellow', name: 'أصفر (Yellow)', price: 5, color: '#ffd700' },
    { id: 'green', name: 'أخضر نعناعي (Green)', price: 5, color: '#98fb98' },
    { id: 'blue', name: 'أزرق سماوي (Blue)', price: 5, color: '#87ceeb' },
    { id: 'purple', name: 'لافندر (Purple)', price: 5, color: '#e6e6fa' },
    { id: 'black', name: 'أسود ليلي (Black)', price: 15, color: '#1a1a1a' },
    { id: 'custom', name: 'لون مخصص (Custom)', price: 20, color: '#4a90e2', isCustom: true }
  ]
};

export default function LolaCakeBuilder({ cakeAttributes = [], isEn = false }: { cakeAttributes?: any[], isEn?: boolean }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isFaqOpen, setIsFaqOpen] = useState(false);
  const [isCutaway, setIsCutaway] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Touch gestures state
  const touchStartRef = useRef<number | null>(null);
  const touchEndRef = useRef<number | null>(null);
  const minSwipeDistance = 50;

  const mergedOptions = React.useMemo(() => {
    const mergeCategory = (options: any[]) => {
      return options.map(option => {
        const shopifyMatch = cakeAttributes?.find(attr => {
          if (!attr.nameEn?.value) return false;
          const shopifyName = attr.nameEn.value.toLowerCase();
          return option.name.toLowerCase().includes(shopifyName) || option.id.replace(/-/g, ' ') === shopifyName;
        });
        
        let merged = { ...option };
        if (shopifyMatch) {
          if (shopifyMatch.thumbnailUrl?.reference?.image?.url) {
            merged.image = shopifyMatch.thumbnailUrl.reference.image.url;
          }
          if (shopifyMatch.priceDelta?.value !== undefined && shopifyMatch.priceDelta?.value !== null) {
            merged.price = parseInt(shopifyMatch.priceDelta.value, 10);
          }
        }
        return merged;
      });
    };

    return {
      shapes: mergeCategory(cakeOptions.shapes),
      sizes: mergeCategory(cakeOptions.sizes),
      tiers: mergeCategory(cakeOptions.tiers),
      flavors: mergeCategory(cakeOptions.flavors),
      styles: mergeCategory(cakeOptions.styles),
      colors: mergeCategory(cakeOptions.colors)
    };
  }, [cakeAttributes]);

  const [selections, setSelections] = useState({
    shape: mergedOptions.shapes[0],
    size: { id: 'standard', name: 'عادي (Standard)', price: 0, scale: 1.0 },
    tier: { id: '1-tier', name: 'طبقة واحدة (Single Tier)', price: 0, count: 1 },
    flavor: mergedOptions.flavors[0],
    style: mergedOptions.styles[0],
    color: mergedOptions.colors[0],
    message: '',
    textColor: '#4a2511',
    textFont: 'Classic',
    uploadedImage: null as string | null
  });

  const [view, setView] = useState<'front' | 'top' | 'sliced'>('front');

  const supportedViews = React.useMemo(() => {
    const shapeId = selections.shape.id;
    return {
      front: true,
      top: shapeId === 'circle' || shapeId === 'standard' || shapeId === 'heart',
      sliced: shapeId === 'circle' || shapeId === 'standard' || shapeId === 'heart',
    };
  }, [selections.shape.id]);

  React.useEffect(() => {
    if (view === 'top' && !supportedViews.top) {
      setView('front');
    }
    if (view === 'sliced' && !supportedViews.sliced) {
      setView('front');
    }
  }, [selections.shape.id, supportedViews, view]);

  React.useEffect(() => {
    if (isCutaway && supportedViews.sliced) {
      setView('sliced');
    } else if (!isCutaway && view === 'sliced') {
      setView('front');
    }
  }, [isCutaway, supportedViews]);

  // Reset style/topping to basic if shape changes to square or sheet
  React.useEffect(() => {
    const isSquareOrSheet = selections.shape.id === 'square' || selections.shape.id === 'sheet';
    if (isSquareOrSheet && selections.style.id !== 'basic') {
      const basicStyle = mergedOptions.styles.find(s => s.id === 'basic') || { id: 'basic', name: 'ناعم (Smooth Minimalist)', price: 0 };
      setSelections(prev => ({ ...prev, style: basicStyle }));
    }
  }, [selections.shape.id, mergedOptions.styles, selections.style.id]);

  const handleSelect = (category: string, item: any) => {
    setSelections(prev => ({ ...prev, [category]: item }));
  };

  const nextStep = () => {
    if (currentStep < steps.length) setCurrentStep(currentStep + 1);
  };
  
  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    touchEndRef.current = null;
    touchStartRef.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEndRef.current = e.targetTouches[0].clientX;
  };

  const onTouchEndEvent = () => {
    if (!touchStartRef.current || !touchEndRef.current) return;
    const distance = touchStartRef.current - touchEndRef.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    // RTL Swipe Logic:
    // Left swipe (moving finger left) -> Distance > 0 -> Next step
    // Right swipe (moving finger right) -> Distance < 0 -> Previous step
    if (isLeftSwipe) {
      nextStep();
    }
    if (isRightSwipe) {
      prevStep();
    }
  };

  const calculateTotal = () => {
    let total = 0;
    if (selections.shape) total += selections.shape.price;
    if (selections.size) total += selections.size.price;
    if (selections.tier) total += selections.tier.price;
    if (selections.flavor) total += selections.flavor.price;
    if (selections.style) total += selections.style.price;
    if (selections.color) total += selections.color.price;
    return total;
  };

  const handleCheckout = async () => {
    setIsSubmitting(true);
    
    // Capture the 3D Canvas as a screenshot
    let cakePreviewImage = null;
    const canvas = document.getElementById('cake-3d-canvas') as HTMLCanvasElement;
    if (canvas) {
      try {
        // Use heavily compressed JPEG instead of PNG to prevent Oxygen payload & CPU limits
        cakePreviewImage = canvas.toDataURL('image/jpeg', 0.2);
      } catch (e) {
        console.error('Failed to capture canvas screenshot:', e);
      }
    }

    try {
      const response = await fetch('/api/custom-cake-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shape: selections.shape.name,
          size: selections.size.name,
          flavor: selections.flavor.name,
          layers: selections.tier.name,
          color: selections.color.name,
          topping: selections.style.name,
          message: selections.message,
          messageFont: selections.textFont,
          messageColor: selections.textColor,
          uploadedImage: selections.uploadedImage,
          cakePreviewImage, // Send the screenshot
          finalTotal: calculateTotal(),
          isEn: false
        })
      });
      const data = await response.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        alert(data.error || 'حدث خطأ أثناء إتمام الطلب');
        setIsSubmitting(false);
      }
    } catch (error) {
      alert('حدث خطأ في الاتصال بالخادم');
      setIsSubmitting(false);
    }
  };

  const CheckIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const LeafIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C12 2 4 6 4 13C4 17.4183 7.58172 21 12 21C16.4183 21 20 17.4183 20 13C20 6 12 2 12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const TruckIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 18H3V6H17V18H15M17 10H21V18H19M5 18C5 19.1046 5.89543 20 7 20C8.10457 20 9 19.1046 9 18C9 16.8954 8.10457 16 7 16C5.89543 16 5 16.8954 5 18ZM15 18C15 19.1046 15.8954 20 17 20C18.1046 20 19 19.1046 19 18C19 16.8954 18.1046 16 17 16C15.8954 16 15 16.8954 15 18Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const HeartIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );

  const renderOptionsGrid = (category: string, options: any[]) => (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mt-6 w-full">
      {options.map(option => {
        const isSelected = selections[category as keyof typeof selections]?.id === option.id;
        const nameParts = option.name.split(' (');
        const displayName = isEn && nameParts.length > 1 ? nameParts[1].replace(')', '') : nameParts[0].trim();

        return (
          <div 
            key={option.id} 
            className={`flex-1 p-6 rounded-2xl border transition-all cursor-pointer relative flex flex-col items-center justify-center text-center ${
              isSelected 
                ? 'border-[#294941] bg-[#F7EAE6]' 
                : 'border-[#E5E7EB] bg-white hover:border-[#294941]/50'
            }`}
            onClick={() => handleSelect(category, option)}
          >
            {isSelected && (
              <div className="absolute top-3 right-3 text-white bg-[#294941] rounded-full p-1 z-10 w-5 h-5 flex items-center justify-center">
                <CheckIcon className="w-3 h-3" />
              </div>
            )}
            
            {/* Show image if category is flavor or if it is a style with an image */}
            {category === 'flavor' || (category === 'style' && option.image) ? (
              <div className="w-14 h-14 rounded-full border border-gray-200 shadow-sm mb-3 flex items-center justify-center overflow-hidden relative bg-[#fafafa]">
                <img src={option.image} alt={displayName} className="w-full h-full object-cover" />
              </div>
            ) : option.color && (
              <div 
                className="w-12 h-12 rounded-full border-2 border-gray-200 shadow-sm mb-3 flex items-center justify-center overflow-hidden relative"
                style={
                  option.isCustom 
                    ? (isSelected ? { backgroundColor: selections.color.color } : { background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' }) 
                    : { backgroundColor: option.color }
                }
              >
                {option.isCustom && (
                  <>
                    <div className="w-full h-full flex items-center justify-center bg-black/10 pointer-events-none">
                      <svg className="w-6 h-6 text-white drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <input 
                      type="color" 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      value={isSelected ? selections.color.color : option.color}
                      onChange={(e) => {
                        const hex = e.target.value;
                        setSelections(prev => ({
                          ...prev,
                          color: { ...option, color: hex }
                        }));
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(category, option);
                      }}
                    />
                  </>
                )}
              </div>
            )}
            
            <div className="font-bold text-[#1a1a1a] text-lg">{displayName}</div>
            {(option.personsAr || option.persons) && <div className="text-[#8BA19C] text-sm mt-2">{isEn ? option.personsEn : option.personsAr || option.persons}</div>}
            <div className="text-[#1a1a1a] font-bold text-xl mt-4 flex items-center justify-center gap-1">
              {option.price > 0 ? (
                <>
                  {toArabicDigits(option.price)}
                  <SaudiRiyalSymbol className="w-auto h-4 text-[#1a1a1a]" />
                </>
              ) : (isEn ? 'Included' : 'مشمول')}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className={`flex flex-col min-h-screen lg:h-screen w-full lg:overflow-hidden bg-white ${isEn ? 'font-en' : 'font-arabic'}`} dir={isEn ? 'ltr' : 'rtl'}>
      
      {/* HEADER */}
      <div className="bg-[#294941] text-white px-4 py-4 md:px-10 md:py-5 flex items-center justify-between z-20 shrink-0 gap-2 md:gap-4 shadow-md">
        <div className={`flex flex-col items-start shrink-0 ${isEn ? 'text-left' : 'text-right'}`}>
          <span className="text-[10px] md:text-sm font-medium mb-0.5 opacity-90">{isEn ? 'Total' : 'الإجمالي'}</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl md:text-4xl font-bold font-sans tracking-tight">
              {toArabicDigits(calculateTotal().toFixed(2))}
            </span>
            <SaudiRiyalSymbol className="w-auto h-3 md:h-5 ml-1" />
          </div>
        </div>
        
        <h1 className="text-[16px] md:text-3xl font-bold text-center flex-1 leading-tight px-1 md:px-4">
          {isEn ? 'Design Your Cake' : 'صمم كيكتك'}
        </h1>
        
        <button 
          onClick={() => window.history.back()}
          className="bg-[#A6C1B7] text-[#294941] hover:bg-[#8ca59c] transition-colors px-3 py-1.5 md:px-6 md:py-2.5 rounded-full flex items-center gap-1 md:gap-2 font-bold text-xs md:text-lg shrink-0"
        >
          {isEn ? 'Back' : 'رجوع'} <ArrowLeft className={`w-3.5 h-3.5 md:w-5 md:h-5 ${isEn ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <div className="flex flex-col-reverse lg:flex-row-reverse flex-1 lg:min-h-0 lg:overflow-hidden">
        
        {/* LEFT COLUMN */}
        <div 
          className="w-full lg:w-1/2 flex flex-col h-auto lg:h-full bg-white lg:overflow-y-auto custom-scrollbar relative"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEndEvent}
        >
          <div className="px-6 py-10 lg:px-20 lg:py-20 w-full mx-auto max-w-[800px] flex-1">
            
            {/* Tagline */}
            <div className="flex items-center justify-start gap-2 text-[#E25555] mb-4">
              <span className="text-sm font-bold">{isEn ? 'Create an unforgettable moment — step by step' : 'أصنع لحظة لا تُنسى — خطوة بخطوة'}</span>
              <Sparkles className="w-4 h-4" />
            </div>

            {/* Title */}
            <div className={`mb-12 ${isEn ? 'text-left' : 'text-right'}`}>
              <h1 className="text-[2.5rem] font-extrabold text-[#1a1a1a] mb-2 leading-tight">{isEn ? 'Design Your Custom Cake' : 'صمّم كيكتك بلمستك الخاصة'}</h1>
              <p className="text-[#8BA19C] text-lg">{isEn ? 'Shape, size, flavor, decoration, and your message' : 'شكل، حجم، نكهة، تزيين، ورسالتك'}</p>
            </div>

            {/* Steps Boxes */}
            <div 
              className="flex flex-row gap-4 mb-12 overflow-x-auto pb-2"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {steps.map((step) => {
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;
                return (
                  <button
                    key={step.id}
                    onClick={() => setCurrentStep(step.id)}
                    className={`flex-1 min-w-[120px] p-6 rounded-3xl border transition-all flex flex-col items-center justify-center gap-4 ${
                      isActive 
                        ? 'border-[#294941] bg-[#F7EAE6]' 
                        : isCompleted
                          ? 'border-[#294941]/30 bg-white hover:border-[#294941]'
                          : 'border-[#E5E7EB] bg-white hover:border-[#294941]/50'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xl transition-all duration-300 ${
                      isActive 
                        ? 'bg-[#294941] text-white scale-110 shadow-md' 
                        : isCompleted
                          ? 'bg-[#294941] text-white'
                          : 'bg-[#A6C1B7] text-white'
                    }`}>
                      {isCompleted ? <CheckIcon className="w-5 h-5" /> : toArabicDigits(step.id)}
                    </div>
                    <div className="text-sm font-bold text-center text-[#1a1a1a]">
                      {isEn ? step.titleEn : step.titleAr}
                    </div>
                    <step.icon className={`w-6 h-6 transition-colors duration-300 ${isActive || isCompleted ? 'text-[#294941]' : 'text-[#A6C1B7]'}`} />
                  </button>
                );
              })}
            </div>

            {/* Step Content */}
            <div className="min-h-[200px]">
              {currentStep === 1 && (
                <div className="animate-in fade-in duration-300 space-y-10">
                  <div>
                    <h2 className={`text-2xl font-bold text-[#1a1a1a] ${isEn ? 'text-left' : 'text-right'}`}>{isEn ? 'Choose Shape' : 'اختر شكل الكيكة'}</h2>
                    {renderOptionsGrid('shape', mergedOptions.shapes)}
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="animate-in fade-in duration-300 space-y-10">
                  <div>
                    <div className={`flex items-center justify-between mb-4 ${isEn ? 'flex-row-reverse' : ''}`}>
                      <h2 className="text-2xl font-bold text-[#1a1a1a]">{isEn ? 'Choose Flavor' : 'اختر نكهة الكيك'}</h2>
                      <button 
                        onClick={() => setIsCutaway(!isCutaway)}
                        className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors ${isCutaway ? 'bg-[#294941] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      >
                        {isCutaway ? (isEn ? 'Hide Flavor' : 'إخفاء النكهة') : (isEn ? 'See Inside Flavor' : 'رؤية النكهة من الداخل')}
                      </button>
                    </div>
                    {renderOptionsGrid('flavor', mergedOptions.flavors)}
                  </div>
                  <div>
                    <h2 className={`text-2xl font-bold text-[#1a1a1a] ${isEn ? 'text-left' : 'text-right'}`}>{isEn ? 'Frosting Color' : 'لون التغليف (الكريمة)'}</h2>
                    {renderOptionsGrid('color', mergedOptions.colors)}
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="animate-in fade-in duration-300 space-y-4">
                  <h2 className={`text-2xl font-bold text-[#1a1a1a] ${isEn ? 'text-left' : 'text-right'}`}>{isEn ? 'Choose Decoration Style' : 'اختر أسلوب التزيين'}</h2>
                  
                  {selections.shape.id === 'square' || selections.shape.id === 'sheet' ? (
                    <div className={`p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium ${isEn ? 'text-left' : 'text-right'}`}>
                      {isEn 
                        ? 'Topping decorations are only available for Round, Standard, and Heart shapes.' 
                        : 'زينة الكيك متوفرة فقط للأشكال الدائرية، الطويلة، والقلب.'}
                    </div>
                  ) : null}
                  
                  {renderOptionsGrid('style', selections.shape.id === 'square' || selections.shape.id === 'sheet' 
                    ? mergedOptions.styles.filter(s => s.id === 'basic') 
                    : mergedOptions.styles
                  )}
                </div>
              )}

              {currentStep === 4 && (
                <div className="animate-in fade-in duration-300 space-y-8">
                  <div className={isEn ? 'text-left' : 'text-right'}>
                    <h2 className="text-2xl font-bold text-[#1a1a1a] mb-4">{isEn ? 'Add Your Special Message' : 'أضف رسالتك الخاصة'}</h2>
                    <div className="border border-[#E5E7EB] p-4 rounded-2xl focus-within:border-[#294941] bg-white">
                      <input 
                        type="text" 
                        className={`w-full p-4 rounded-xl border border-gray-200 bg-gray-50 text-xl text-[#1a1a1a] focus:outline-none focus:ring-1 focus:ring-[#294941] ${isEn ? 'text-left' : 'text-right'}`}
                        placeholder={isEn ? 'Example: Happy Birthday' : 'مثال: سنة حلوة يا جميل'}
                        value={selections.message}
                        onChange={(e) => setSelections(prev => ({ ...prev, message: e.target.value }))}
                        maxLength={25}
                      />
                    </div>
                  </div>

                  {/* Text Color & Font */}
                  {selections.message && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className={isEn ? 'text-left' : 'text-right'}>
                        <h3 className="text-lg font-bold text-[#1a1a1a] mb-3">{isEn ? 'Message Color' : 'اختر لون الكتابة'}</h3>
                        <div className={`flex flex-wrap gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100 ${isEn ? 'justify-start' : 'justify-start'}`}>
                          {['#4a2511', '#8b0000', '#ffffff', '#ffb6c1', '#1a1a1a'].map(color => {
                            const isSelected = selections.textColor === color;
                            return (
                              <button
                                key={color}
                                onClick={() => setSelections(prev => ({ ...prev, textColor: color }))}
                                className={`relative w-12 h-12 rounded-full transition-all duration-200 flex items-center justify-center shadow-sm
                                  ${isSelected ? 'ring-2 ring-offset-2 ring-[#294941] scale-110' : 'border border-gray-300 hover:scale-105'}
                                `}
                                style={{ backgroundColor: color }}
                                title="اختر هذا اللون"
                              >
                                {isSelected && (
                                  <svg className={`w-6 h-6 ${color === '#ffffff' ? 'text-[#1a1a1a]' : 'text-white'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className={isEn ? 'text-left' : 'text-right'}>
                        <h3 className="text-lg font-bold text-[#1a1a1a] mb-3">{isEn ? 'Message Font' : 'خط الكتابة'}</h3>
                        <select 
                          className={`w-full p-3 rounded-xl border border-gray-200 bg-gray-50 ${isEn ? 'text-left' : 'text-right'}`}
                          value={selections.textFont}
                          onChange={(e) => setSelections(prev => ({ ...prev, textFont: e.target.value }))}
                        >
                          <option value="Classic">{isEn ? 'Classic' : 'كلاسيكي (Classic)'}</option>
                          <option value="Modern">{isEn ? 'Modern' : 'عصري (Modern)'}</option>
                          <option value="Handwriting">{isEn ? 'Handwriting' : 'كتابة يدوية (Handwriting)'}</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Image Upload */}
                  <div className={isEn ? 'text-left' : 'text-right'}>
                    <h2 className="text-2xl font-bold text-[#1a1a1a] mb-4">{isEn ? 'Printed Image on Cake' : 'صورة مطبوعة على الكيك'}</h2>
                    <div className="border-2 border-dashed border-[#A6C1B7] bg-[#F6FAF8] p-6 rounded-2xl text-center relative hover:bg-[#EEF5F2] transition-colors cursor-pointer">
                      <input 
                        type="file" 
                        accept="image/png, image/jpeg, image/jpg, image/webp"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              setSelections(prev => ({ ...prev, uploadedImage: event.target?.result as string }));
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <div className="flex flex-col items-center justify-center gap-2">
                        {selections.uploadedImage ? (
                          <>
                            <img src={selections.uploadedImage} alt="Uploaded" className="w-24 h-24 object-cover rounded-xl shadow-sm mb-2" />
                            <span className="text-[#294941] font-bold">{isEn ? 'Change Image' : 'تغيير الصورة'}</span>
                          </>
                        ) : (
                          <>
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-[#294941] mb-2">
                              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                            </div>
                            <span className="text-[#294941] font-bold">{isEn ? 'Upload Image (Optional)' : 'ارفع صورة (اختياري)'}</span>
                            <span className="text-sm text-[#8BA19C]">{isEn ? 'PNG, JPG up to 5MB' : 'PNG, JPG حتى 5MB'}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Next Button and FAQ Button */}
            <div className={`mt-12 flex items-center justify-between w-full ${isEn ? 'flex-row-reverse' : ''}`}>
              {currentStep < steps.length ? (
                <button 
                  className={`inline-flex items-center gap-3 px-10 py-4 rounded-full font-bold bg-[#294941] text-white hover:bg-[#1E3A34] transition-all text-xl ${isEn ? 'flex-row-reverse' : ''}`}
                  onClick={nextStep}
                >
                  {isEn ? `Next, ${steps[currentStep].titleEn}` : `التالي، ${steps[currentStep].titleAr}`}
                  <ArrowLeft className={`w-5 h-5 ${isEn ? 'rotate-180' : ''}`} />
                </button>
              ) : (
                <button 
                  className={`inline-flex items-center gap-3 px-10 py-4 rounded-full font-bold bg-[#294941] text-white hover:bg-[#1E3A34] transition-all text-xl disabled:opacity-50 disabled:cursor-not-allowed ${isEn ? 'flex-row-reverse' : ''}`}
                  onClick={handleCheckout}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (isEn ? 'Preparing...' : 'جاري التحضير...') : (isEn ? 'Checkout and Pay' : 'إتمام الطلب والدفع')}
                  <ArrowLeft className={`w-5 h-5 ${isEn ? 'rotate-180' : ''}`} />
                </button>
              )}
              
              <button 
                className={`flex items-center gap-2 bg-[#8c6b54] text-white px-5 py-2.5 rounded-full font-bold shadow-sm hover:opacity-90 transition-opacity ${isEn ? 'flex-row-reverse' : ''}`}
                onClick={() => setIsFaqOpen(true)}
              >
                <span>{isEn ? 'Have a question?' : 'لديك سؤال؟'}</span>
                <div className="bg-[#bda061] text-white w-6 h-6 rounded-full flex items-center justify-center font-serif text-sm">?</div>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div 
          className="w-full lg:w-1/2 relative flex flex-col items-center justify-center py-10 lg:py-0 lg:h-full shrink-0 overflow-hidden bg-[#EED5D7]"
          style={{ backgroundImage: "url('/images/pattern.svg')", backgroundRepeat: 'repeat', backgroundSize: '600px' }}
        >

          {/* Center Content Group (Pills + Circle) */}
          <div className="relative z-10 flex flex-col items-center justify-center gap-2 lg:gap-4 w-full mt-0">
            
            {/* Top Pill showing selected shape */}
            <div className="bg-[#20584A] text-white px-6 py-2 rounded-full font-bold text-sm flex items-center gap-1.5 whitespace-nowrap shadow-sm">
              <span>{isEn ? selections.shape.name.split(' (')[1]?.replace(')', '') || selections.shape.name.split(' (')[0] : selections.shape.name.split(' (')[0]}</span>
            </div>

            {/* Circle & 3D Canvas */}
            <div className="relative w-[260px] h-[260px] sm:w-[320px] sm:h-[320px] lg:w-auto lg:h-[50vh] aspect-square rounded-full border-[12px] lg:border-[24px] border-white bg-[#EED5D7] shadow-sm flex items-center justify-center overflow-hidden shrink-0">
              <div className="absolute inset-0 z-20 flex items-center justify-center">
                <CakePreview 
                  shape={selections.shape.id}
                  layers={selections.tier.count === 3 ? 'three' : selections.tier.count === 2 ? 'two' : 'one'}
                  color={selections.color.color}
                  toppings={[{ id: selections.style.id, name: selections.style.id, thumbnailUrl: '' }]}
                  scale={selections.size.scale}
                  message={selections.message}
                  flavorName={selections.flavor.name}
                  isCutaway={currentStep === 2 && isCutaway}
                  textColor={selections.textColor}
                  textFont={selections.textFont}
                  uploadedImage={selections.uploadedImage}
                  view={view}
                  setView={setView}
                />
              </div>
            </div>

            {/* View Switcher below the circle (outside the preview area) */}
            <div className="bg-white/95 backdrop-blur-md px-3 py-2 rounded-full shadow-md border border-gray-100 flex items-center gap-1.5 z-30">
              <button
                type="button"
                onClick={() => setView('front')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black transition-all cursor-pointer ${
                  view === 'front' 
                    ? 'bg-[#294941] text-white shadow-sm' 
                    : 'text-[#294941] hover:bg-gray-100'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{isEn ? 'Front' : 'جانبي'}</span>
              </button>

              {supportedViews.top && (
                <button
                  type="button"
                  onClick={() => setView('top')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black transition-all cursor-pointer ${
                    view === 'top' 
                      ? 'bg-[#294941] text-white shadow-sm' 
                      : 'text-[#294941] hover:bg-gray-100'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Top' : 'علوي'}</span>
                </button>
              )}

              {supportedViews.sliced && (
                <button
                  type="button"
                  onClick={() => setView('sliced')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black transition-all cursor-pointer ${
                    view === 'sliced' 
                      ? 'bg-[#294941] text-white shadow-sm' 
                      : 'text-[#294941] hover:bg-gray-100'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>{isEn ? 'Sliced' : 'مقطوع'}</span>
                </button>
              )}
            </div>
            
          </div>

          {/* Features Badges */}
          <div className="mt-2 lg:mt-4 z-10 w-[95%] lg:w-[90%] max-w-[450px] scale-90 lg:scale-100 origin-bottom">
            <div className="bg-[#F6FAF8] px-2 py-3 rounded-2xl flex items-center justify-between text-[#20584A] shadow-sm">
              
              <div className="flex items-center justify-center gap-2 flex-1">
                <div className="text-[11px] font-bold leading-tight text-center">
                  {isEn ? <span>Made with Love<br/>& Care</span> : <span>صنع بحب<br/>وعناية</span>}
                </div>
                <HeartIcon className="w-5 h-5 text-[#8BA19C]" />
              </div>
              
              <div className="w-[1px] h-8 bg-[#D5DBD9]"></div>
              
              <div className="flex items-center justify-center gap-2 flex-1">
                <div className="text-[11px] font-bold leading-tight text-center">
                  {isEn ? <span>Refrigerated Delivery<br/>Guaranteed</span> : <span>توصيل مبرد<br/>لضمان الجودة</span>}
                </div>
                <TruckIcon className="w-5 h-5 text-[#8BA19C]" />
              </div>
              
              <div className="w-[1px] h-8 bg-[#D5DBD9]"></div>
              
              <div className="flex items-center justify-center gap-2 flex-1">
                <div className="text-[11px] font-bold leading-tight text-center">
                  {isEn ? <span>Premium<br/>Ingredients</span> : <span>مكونات<br/>فاخرة</span>}
                </div>
                <LeafIcon className="w-5 h-5 text-[#8BA19C]" />
              </div>

            </div>
          </div>

        </div>
      </div>
      <FaqModal isOpen={isFaqOpen} onClose={() => setIsFaqOpen(false)} />
    </div>
  );
}
