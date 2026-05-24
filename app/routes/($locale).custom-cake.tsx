import { useState, useMemo, useEffect, useCallback } from 'react';
import { type MetaFunction, type LoaderFunctionArgs, Form, type LinksFunction } from 'react-router';
import { useLoaderData } from 'react-router';
import { CAKE_BASES, type CakeBase } from '~/components/CakeBuilder/ShapeSizeSelector';
import { FLAVORS, type Flavor } from '~/components/CakeBuilder/FlavorLayerSelector';
import { COLORS, type CakeColor } from '~/components/CakeBuilder/ColorSelector';
import { TOPPINGS, type Topping } from '~/components/CakeBuilder/ToppingsSelector';
import { CakePreview } from '~/components/CakeBuilder/CakePreview';
import patternBg from '~/assets/patteren-collection-header.svg';

export const meta: MetaFunction = () => {
  return [{ title: 'Customize Your Dream Cake | Saadeddin' }];
};

// --- PRELOAD CRITICAL ASSETS ---
export const links: LinksFunction = () => {
  return [
    { rel: 'preload', as: 'image', href: '/images/cake-builder/cake-round.png' },
    { rel: 'preload', as: 'image', href: '/images/cake-builder/cake-heart.png' },
    { rel: 'preload', as: 'image', href: '/images/cake-builder/cake-square.png' },
    { rel: 'preload', as: 'image', href: '/images/cake-builder/cake-tall.png' },
  ];
};

// --- SHAPES DATA ---
const SHAPES = [
  { id: 'round', nameEn: 'Circle', nameAr: 'دائري', descEn: 'Most Popular', descAr: 'الأكثر طلباً', icon: 'circle' },
  { id: 'heart', nameEn: 'Heart', nameAr: 'قلب', descEn: 'Ideal for Lovers', descAr: 'مثالي للعشاق', icon: 'heart' },
  { id: 'square', nameEn: 'Square', nameAr: 'مربع', descEn: 'Classic & Elegant', descAr: 'كلاسيكي وأنيق', icon: 'square' },
  { id: 'rectangle', nameEn: 'Rectangle', nameAr: 'مستطيل', descEn: 'For Large Parties', descAr: 'للحفلات الكبيرة', icon: 'rectangle' },
  { id: 'star', nameEn: 'Star', nameAr: 'نجمة', descEn: 'For Graduations', descAr: 'لحفلات التخرج', icon: 'star' },
  { id: 'hexagon', nameEn: 'Hexagon', nameAr: 'سداسي', descEn: 'Unique & Modern', descAr: 'مميز وعصري', icon: 'hexagon' }
];

const CAKE_ATTRIBUTES_QUERY = `#graphql
  query CakeAttributes($language: LanguageCode) @inContext(language: $language) {
    metaobjects(type: "cake_attribute", first: 250) {
      nodes {
        id
        attributeType: field(key: "attribute_type") { value }
        nameEn: field(key: "name_english") { value }
        nameAr: field(key: "name_arabic") { value }
        priceDelta: field(key: "price_delta") { value }
        thumbnailUrl: field(key: "thumbnail_image") { reference { ... on MediaImage { image { url } } } }
        hexColor: field(key: "hex_color") { value }
        isPopular: field(key: "is_popular") { value }
        categoryId: field(key: "category_id") { value }
        servesText: field(key: "serves_text") { value }
        specsText: field(key: "specs_text") { value }
      }
    }
  }
`;

export async function loader({ context }: LoaderFunctionArgs) {
  const { storefront } = context;
  const locale = storefront.i18n.language.toLowerCase();
  
  try {
    const { metaobjects } = await storefront.query(CAKE_ATTRIBUTES_QUERY, {
      variables: {
        language: storefront.i18n.language,
      },
      cache: storefront.CacheShort(),
    });
    
    return { locale, cakeAttributes: metaobjects.nodes };
  } catch (error) {
    console.error('Failed to fetch cake attributes:', error);
    return { locale, cakeAttributes: [] };
  }
}

export default function CustomCakeBuilder() {
  const { locale, cakeAttributes } = useLoaderData<typeof loader>();
  const isEn = locale === 'en';
  
  const [orderState, setOrderState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [orderError, setOrderError] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [isHydrated, setIsHydrated] = useState(false);
  const [showDraftToast, setShowDraftToast] = useState(false);

  // --- DYNAMIC ATTRIBUTES MAPPING ---
  const dynamicShapes = useMemo(() => {
    const shapes = cakeAttributes?.filter((a: any) => a.attributeType?.value === 'shape').map((a: any) => ({
      id: a.categoryId?.value || 'round', // Internal ID stored in category_id
      nameEn: a.nameEn?.value || 'Unknown',
      nameAr: a.nameAr?.value || 'غير معروف',
      descEn: '',
      descAr: '',
      icon: a.categoryId?.value || 'circle'
    }));
    return shapes?.length > 0 ? shapes : SHAPES;
  }, [cakeAttributes]);

  const dynamicBases = useMemo(() => {
    const bases = cakeAttributes?.filter((a: any) => a.attributeType?.value === 'base').map((a: any) => {
      const nameEn = a.nameEn?.value || 'Unknown';
      const staticBase = CAKE_BASES.find(cb => cb.nameEn === nameEn);
      return {
        id: a.id,
        nameEn,
        nameAr: a.nameAr?.value || 'غير معروف',
        servesEn: a.servesText?.value || '',
        servesAr: a.servesText?.value || '',
        specsEn: a.specsText?.value || '',
        specsAr: a.specsText?.value || '',
        price: parseFloat(a.priceDelta?.value || '0'),
        isPopular: a.isPopular?.value === 'true',
        shapeId: a.categoryId?.value || 'round',
        image: staticBase?.image || a.thumbnailUrl?.reference?.image?.url || '/images/cake-round-3d.png'
      };
    });
    return bases || [];
  }, [cakeAttributes]);

  const dynamicFlavors = useMemo(() => {
    const flavors = cakeAttributes?.filter((a: any) => a.attributeType?.value === 'flavor').map((a: any) => ({
      id: a.id,
      nameEn: a.nameEn?.value || 'Unknown',
      nameAr: a.nameAr?.value || 'غير معروف',
      color: a.hexColor?.value || '#FFFFFF',
      secondaryColor: '#f5deb3', // Optional fallback
      descriptionEn: a.categoryId?.value || '',
      descriptionAr: a.categoryId?.value || '',
      image: a.thumbnailUrl?.reference?.image?.url || '/images/vanilla-img.png',
      isPopular: a.isPopular?.value === 'true'
    }));
    return flavors || [];
  }, [cakeAttributes]);

  const dynamicColors = useMemo(() => {
    const colors = cakeAttributes?.filter((a: any) => a.attributeType?.value === 'Color' || a.attributeType?.value === 'color').map((a: any) => ({
      id: a.id,
      nameEn: a.nameEn?.value || 'Unknown',
      nameAr: a.nameAr?.value || 'غير معروف',
      hex: a.hexColor?.value || '#FFFFFF',
      isPremium: a.isPopular?.value === 'true'
    }));
    return colors?.length > 0 ? colors : COLORS;
  }, [cakeAttributes]);

  const dynamicToppings = useMemo(() => {
    const toppings = cakeAttributes?.filter((a: any) => {
      const type = a.attributeType?.value?.toLowerCase()?.trim();
      return type === 'topping' || type === 'toppings';
    }).map((a: any) => ({
      id: a.id,
      categoryId: a.categoryId?.value || 'all',
      nameEn: a.nameEn?.value || 'Unknown',
      nameAr: a.nameAr?.value || 'غير معروف',
      priceDelta: parseFloat(a.priceDelta?.value || '0'),
      thumbnailUrl: a.thumbnailUrl?.reference?.image?.url || '',
      isPopular: a.isPopular?.value === 'true'
    }));
    return toppings?.length > 0 ? toppings : TOPPINGS;
  }, [cakeAttributes]);

  // --- GLOBAL CAKE STATE ---
  const [selectedShape, setSelectedShape] = useState<string>('round');
  const [selectedBase, setSelectedBase] = useState<CakeBase>(dynamicBases[0] || { id: 'empty', nameEn: '', nameAr: '', servesEn: '', servesAr: '', specsEn: '', specsAr: '', price: 0, shapeId: 'round' }); 
  const [selectedFlavor, setSelectedFlavor] = useState<Flavor>(dynamicFlavors[0] || { id: 'empty', nameEn: '', nameAr: '', color: '#fff', secondaryColor: '#fff', descriptionEn: '', descriptionAr: '', image: '' });
  const [selectedColor, setSelectedColor] = useState(dynamicColors[0] || COLORS[0]); 
  const [selectedToppings, setSelectedToppings] = useState<any[]>([dynamicToppings[0] || TOPPINGS[0]]);
  const [cakeMessage, setCakeMessage] = useState('');
  const [messageLang, setMessageLang] = useState<'ar'|'en'>(isEn ? 'en' : 'ar');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [textFont, setTextFont] = useState('Classic');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const layers = selectedBase?.id?.includes('barrel') ? 3 : (selectedBase?.id === 'sheet' ? 1 : 2);

  // --- FILTER BASES BY SHAPE ---
  const filteredBases = useMemo(() => {
    return dynamicBases.filter(b => b.shapeId === selectedShape);
  }, [selectedShape, dynamicBases]);

  // Keep selected base in sync with shape selection
  useEffect(() => {
    if (filteredBases.length > 0) {
      const exists = filteredBases.some(b => b.id === selectedBase.id);
      if (!exists) {
        setSelectedBase(filteredBases[0]);
      }
    }
  }, [selectedShape, filteredBases]);

  // --- ASSET PRELOADING (BACKGROUND CACHE) ---
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const preloadImages = [
      ...dynamicFlavors.map(f => f.image).filter(Boolean),
      ...dynamicToppings.map(t => t.thumbnailUrl).filter(Boolean)
    ];
    // Silently load images in background to prime the browser cache
    preloadImages.forEach(src => {
      const img = new Image();
      img.src = src;
    });
  }, [dynamicFlavors, dynamicToppings]);

  // --- PERSISTENCE: LOAD DRAFT ---
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const savedDraft = localStorage.getItem('saadeddin_cake_draft');
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft) as any;
        const baseId = draft.baseId || 'small_standard';
        const base = CAKE_BASES.find((b: any) => b.id === baseId) || CAKE_BASES[0];
        const flavorId = draft.flavor?.id || 'choco-crunch';
        const flavor = FLAVORS.find(f => f.id === flavorId) || FLAVORS[1];
        const color = dynamicColors.find((c: any) => c.id === draft.colorId) || dynamicColors[0];
        const toppingIds = draft.toppingIds || [draft.toppingId];
        const toppings = dynamicToppings.filter((t: any) => toppingIds.includes(t.id));

        setSelectedShape(base.shapeId || 'round');
        setSelectedBase(base);
        setSelectedFlavor(flavor);
        setSelectedColor(color);
        setSelectedToppings(toppings.length > 0 ? toppings : [dynamicToppings[0]]);
        setCakeMessage(draft.message || '');
        setTextColor(draft.textColor || '#FFFFFF');
        setTextFont(draft.textFont || 'Classic');
        setUploadedImage(draft.uploadedImage || null);
        setCurrentStep(draft.step || 1);
        
        setShowDraftToast(true);
        setTimeout(() => setShowDraftToast(false), 4000);
      } catch (e) {
        console.error('Failed to load cake draft:', e);
      }
    }
    setIsHydrated(true);
  }, [dynamicColors, dynamicToppings]);

  // --- PERSISTENCE: SAVE DRAFT ---
  useEffect(() => {
    if (!isHydrated || typeof window === 'undefined') return;

    const draft = {
      baseId: selectedBase.id,
      flavor: selectedFlavor,
      layers,
      colorId: selectedColor.id,
      toppingIds: selectedToppings.map(t => t.id),
      message: cakeMessage,
      textColor,
      textFont,
      step: currentStep,
      uploadedImage,
      timestamp: Date.now()
    };
    
    localStorage.setItem('saadeddin_cake_draft', JSON.stringify(draft));
  }, [selectedBase, selectedFlavor, selectedColor, selectedToppings, cakeMessage, textColor, textFont, currentStep, uploadedImage, isHydrated]);

  // --- IMAGE UPLOAD HANDLERS ---
  const processImageFile = (file: File) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert(isEn ? 'Please upload a valid image (JPG, PNG, WEBP).' : 'يرجى رفع صورة صالحة (JPG, PNG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert(isEn ? 'File is too large (max 5MB)' : 'الملف كبير جداً (الأقصى ٥ ميجابايت)');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate an upload progress for UI/UX
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 15) + 5;
      if (progress >= 100) {
        clearInterval(interval);
        setUploadProgress(100);
        
        const reader = new FileReader();
        reader.onloadend = () => {
          setUploadedImage(reader.result as string);
          setIsUploading(false);
          setUploadProgress(0);
        };
        reader.readAsDataURL(file);
      } else {
        setUploadProgress(progress);
      }
    }, 150);
  };

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  }, [isEn]);

  const handleRemoveImage = useCallback(() => {
    setUploadedImage(null);
  }, []);

  // --- PRICE CALCULATION ---
  const subtotal = useMemo(() => {
    const toppingExtra = selectedToppings.reduce((sum, t) => sum + (t.priceDelta || 0), 0);
    return selectedBase.price + toppingExtra;
  }, [selectedBase, selectedToppings]);
  
  const vatAmount = subtotal * 0.15;
  const finalTotal = subtotal + vatAmount;

  // --- 4 STEPS CONFIG (MATCHES MOCKUP) ---
  const steps = [
    { id: 1, en: 'Size & Shape', ar: 'اختر الحجم', icon: 'cake' },
    { id: 2, en: 'Flavor', ar: 'اختر النكهة', icon: 'slice' },
    { id: 3, en: 'Decoration', ar: 'اختر التزيين', icon: 'cupcake' },
    { id: 4, en: 'Personalize', ar: 'أضف رسالتك الخاصة', icon: 'pencil' },
  ];

  const getActiveLogicalStep = (step: number) => {
    if (step === 1) return 1;
    if (step === 2) return 2;
    if (step === 3) return 3;
    return 4;
  };

  const activeLogicalStep = getActiveLogicalStep(currentStep);



  // --- TOPPING CATEGORIES ---
  const TOPPING_CATEGORIES = [
    { id: 'all', nameEn: 'All Toppings', nameAr: 'كل الإضافات' },
    { id: 'classic', nameEn: 'Classic', nameAr: 'كلاسيكي' },
    { id: 'fruits', nameEn: 'Fresh Fruits', nameAr: 'فواكه طازجة' },
    { id: 'chocolate', nameEn: 'Chocolate', nameAr: 'شوكولاتة' },
    { id: 'luxury', nameEn: 'Luxury', nameAr: 'فاخر' },
  ];

  const [activeToppingCategory, setActiveToppingCategory] = useState('all');

  const filteredToppings = useMemo(() => {
    return activeToppingCategory === 'all'
      ? dynamicToppings
      : dynamicToppings.filter(t => t.categoryId === activeToppingCategory || t.id === 'none');
  }, [dynamicToppings, activeToppingCategory]);

  const handleToppingToggle = (topping: Topping) => {
    if (topping.id === 'none') {
      setSelectedToppings([topping]);
      return;
    }

    const isSelected = selectedToppings.some(t => t.id === topping.id);
    let newToppings = selectedToppings.filter(t => t.id !== 'none');

    if (isSelected) {
      newToppings = newToppings.filter(t => t.id !== topping.id);
    } else {
      if (newToppings.length >= 3) {
        alert(isEn ? 'Maximum of 3 toppings allowed' : 'الحد الأقصى ٣ إضافات فقط');
        return;
      }
      newToppings.push(topping);
    }

    if (newToppings.length === 0) {
      const noneTopping = dynamicToppings.find(t => t.id === 'none');
      if (noneTopping) newToppings = [noneTopping];
    }

    setSelectedToppings(newToppings);
  };

  // --- ORDER SUBMISSION ---
  const handleOrderSubmit = useCallback(async () => {
    if (orderState === 'submitting') return;
    
    setOrderState('submitting');
    setOrderError('');

    try {
      const response = await fetch('/api/custom-cake-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shape: isEn ? selectedBase.nameEn : selectedBase.nameAr,
          size: isEn ? selectedBase.specsEn : selectedBase.specsAr,
          flavor: isEn ? selectedFlavor.nameEn : selectedFlavor.nameAr,
          layers,
          color: isEn ? selectedColor.nameEn : selectedColor.nameAr,
          topping: selectedToppings.map(t => isEn ? t.nameEn : t.nameAr).join(', '),
          message: cakeMessage,
          messageFont: textFont,
          messageColor: textColor,
          uploadedImage: uploadedImage,
          subtotal,
          vatAmount,
          finalTotal,
          isEn,
        }),
      });

      const result = await response.json() as any;

      if (result.success && result.checkoutUrl) {
        setOrderState('success');
        localStorage.removeItem('saadeddin_cake_draft');
        setTimeout(() => {
          window.location.href = result.checkoutUrl;
        }, 1200);
      } else {
        setOrderState('error');
        setOrderError(
          result.error || (isEn ? 'Something went wrong. Please try again.' : 'حدث خطأ. يرجى المحاولة مرة أخرى.')
        );
      }
    } catch (err: any) {
      setOrderState('error');
      setOrderError(
        isEn ? 'Network error. Please check your connection.' : 'خطأ في الشبكة. يرجى التحقق من اتصالك.'
      );
    }
  }, [orderState, isEn, selectedBase, selectedFlavor, layers, selectedColor, selectedToppings, cakeMessage, textColor, textFont, uploadedImage, subtotal, vatAmount, finalTotal]);

  return (
    <div className="min-h-screen bg-[#FDF5E6] flex flex-col font-ar" dir={isEn ? 'ltr' : 'rtl'}>
      {/* Draft Loaded Toast */}
      <div className={`fixed top-10 left-1/2 -translate-x-1/2 z-[100] transition-all duration-700 ${showDraftToast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10 pointer-events-none'}`}>
         <div className="bg-[#234745] text-white px-8 py-4 rounded-[20px] shadow-2xl flex items-center gap-4 border border-white/20 backdrop-blur-md">
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <span className="font-bold text-sm tracking-wide">
              {isEn ? 'Welcome back! We restored your cake draft.' : 'أهلاً بك مجدداً! تم استعادة مسودة الكيكة الخاصة بك.'}
            </span>
         </div>
      </div>

      {/* Top Banner (Matches Mockup) */}
      <div className="relative bg-[#234745] text-white py-4 px-6 md:px-12 w-full shadow-md z-20 overflow-hidden">
        {/* Background Texture */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url(${patternBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        
        <div className="relative z-10 flex justify-between items-center w-full">
          {/* Left side: Total Price */}
          <div className="flex flex-col items-start leading-none">
            <span className="text-white/60 text-[10px] md:text-xs font-bold uppercase tracking-widest">
              {isEn ? 'Total' : 'الإجمالي'}
            </span>
            <span className="text-xl md:text-[28px] font-black font-en leading-tight mt-1">
              {isEn ? `${finalTotal.toFixed(2)} SAR` : `${finalTotal.toFixed(2)} ر.س`}
            </span>
          </div>

          {/* Center: Title */}
          <h1 className="text-lg md:text-2xl font-black tracking-wide" style={{ fontFamily: "'GE Dinar One', 'Bahij Janna', sans-serif" }}>
            {isEn ? 'Design Your Cake' : 'صمم كيكتك'}
          </h1>

          {/* Right side: Back button */}
          <div className="flex items-center gap-3">
            <Form action="/api/locale" method="post" reloadDocument className="hidden md:block">
              <input type="hidden" name="locale" value={isEn ? 'ar' : 'en'} />
              <input type="hidden" name="returnTo" value={isEn ? '/custom-cake' : '/en/custom-cake'} />
              <button type="submit" className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full border border-white/10 text-xs font-bold transition-all">
                {isEn ? 'العربية' : 'English'}
              </button>
            </Form>

            <button 
              onClick={() => {
                if (currentStep > 1) {
                  setCurrentStep(currentStep - 1);
                } else {
                  window.history.back();
                }
              }}
              className="bg-white/10 hover:bg-white/20 text-white px-5 py-2 rounded-full border border-white/10 flex items-center gap-2 text-xs md:text-sm font-bold transition-all"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={isEn ? '' : 'rotate-180'}><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              {isEn ? 'Back' : 'رجوع'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Split-Screen Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 w-full overflow-hidden">
        
        {/* Left Side: Interactive Form Builder (7 cols) */}
        <div className="lg:col-span-7 bg-white p-6 md:p-12 flex flex-col justify-between overflow-y-auto order-2 lg:order-1">
          <div className="w-full max-w-2xl mx-auto">
            
            {/* Red Subtitle Header */}
            <div className="flex items-center gap-2 mb-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#E24C4C" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <span className="text-[#E24C4C] text-xs md:text-sm font-bold uppercase tracking-wider">
                {isEn ? 'Craft a moment that lingers — Step by step' : 'أصنع لحظة لا تُنسى — خطوة بخطوة'}
              </span>
            </div>

            {/* Title Header */}
            <h2 className="text-[#234745] text-2xl md:text-[38px] font-black leading-tight mb-2">
              {isEn ? 'Design your cake with your special touch' : 'صمّم كيكتك بلمستك الخاصة'}
            </h2>
            <p className="text-gray-400 text-xs md:text-sm font-bold mb-8">
              {isEn ? 'Shape, Size, Flavor, Decoration, and Message' : 'شكل، حجم، نكهة، تزيين، ورسالتك'}
            </p>

            {/* 4-Step Cards Progress Tracker */}
            <div className="grid grid-cols-4 gap-2 md:gap-4 mb-10">
              {steps.map((step) => {
                const isActive = activeLogicalStep === step.id;
                const isCompleted = activeLogicalStep > step.id;
                
                return (
                  <button
                    key={step.id}
                    onClick={() => {
                      if (step.id === 1) setCurrentStep(1);
                      else if (step.id === 2) setCurrentStep(2);
                      else if (step.id === 3) setCurrentStep(3);
                      else if (step.id === 4) setCurrentStep(4);
                    }}
                    className={`relative flex flex-col items-center justify-between p-3 md:p-5 rounded-[24px] border-2 transition-all duration-300 ${
                      isActive 
                        ? 'border-[#234745] bg-white shadow-[0_12px_30px_rgba(35,71,69,0.08)] scale-[1.02]' 
                        : 'border-transparent bg-[#FBF7F7] text-gray-400 hover:border-gray-200'
                    }`}
                  >
                    {/* Active badge checkmark inside logical steps */}
                    {isActive && (
                      <div className="absolute top-2 left-2 w-4 h-4 bg-[#234745] rounded-full flex items-center justify-center">
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                    )}

                    {/* Circle step number */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs mb-2 border-2 transition-all ${
                      isActive 
                        ? 'bg-[#234745] text-white border-transparent' 
                        : isCompleted
                          ? 'bg-[#234745]/10 text-[#234745] border-transparent'
                          : 'bg-white text-gray-300 border-gray-100'
                    }`}>
                      {isCompleted ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
                      ) : step.id}
                    </div>
                    
                    {/* Step Title */}
                    <span className={`text-[10px] md:text-xs font-black text-center mb-1 leading-tight ${isActive ? 'text-[#234745]' : 'text-gray-400'}`}>
                      {isEn ? step.en : step.ar}
                    </span>

                    {/* Step Icon */}
                    <div className={`mt-1 opacity-70 ${isActive ? 'text-[#234745]' : 'text-gray-300'}`}>
                      {step.icon === 'cake' && (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="14" width="18" height="6" rx="2"/><path d="M5 14v-4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4"/><line x1="12" y1="8" x2="12" y2="3"/><path d="M10 3h4"/></svg>
                      )}
                      {step.icon === 'slice' && (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                      )}
                      {step.icon === 'cupcake' && (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a4 4 0 0 0-4 4v3h8V6a4 4 0 0 0-4-4z"/><path d="M5 9h14l-1.5 9A3 3 0 0 1 14.5 21h-5a3 3 0 0 1-3-3L5 9z"/></svg>
                      )}
                      {step.icon === 'pencil' && (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Content Section */}
            <div className="animate-step-enter min-h-[400px]">
              
              {/* STEP 1: SIZE SELECTOR */}
              {currentStep === 1 && (
                <div className="relative">
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 md:gap-4 mb-10">
                    {dynamicShapes.filter(shape => dynamicBases.some(b => b.shapeId === shape.id)).map((shape) => {
                      const isSelected = selectedShape === shape.id;
                      return (
                        <button
                          key={shape.id}
                          onClick={() => {
                            setSelectedShape(shape.id);
                            const newBases = dynamicBases.filter(b => b.shapeId === shape.id);
                            if (newBases.length > 0) setSelectedBase(newBases[0]);
                          }}
                          className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${
                            isSelected ? 'border-[#234745] bg-[#234745]/5' : 'border-transparent bg-gray-50'
                          }`}
                        >
                          <span className="text-xs font-bold">{isEn ? shape.nameEn : shape.nameAr}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto pr-1 pb-16 scrollbar-none"
                    style={{ maxHeight: '420px' }}
                  >
                    {filteredBases.map((base) => {
                      const isSelected = selectedBase.id === base.id;
                      return (
                        <button
                          key={base.id}
                          onClick={() => { setSelectedBase(base); setSelectedShape(base.shapeId || 'round'); }}
                          className={`relative flex flex-col p-5 rounded-[24px] border-2 transition-all duration-300 text-start ${
                            isSelected 
                              ? 'border-[#234745] bg-[#234745]/5 shadow-lg' 
                              : 'border-transparent bg-[#FBF7F7] hover:border-gray-200 shadow-sm'
                          }`}
                        >
                          {base.isPopular && (
                            <div className="absolute top-0 right-4 -translate-y-1/2 bg-[#d4a06a] text-white text-[10px] font-bold px-3 py-0.5 rounded-full shadow-sm z-10">
                              {isEn ? '⭐ Popular' : '⭐ الأكثر طلباً'}
                            </div>
                          )}
                          
                          <div className="w-full flex justify-center mb-3">
                            <img 
                              src={base.image} 
                              alt={isEn ? base.nameEn : base.nameAr}
                              className="h-24 object-contain drop-shadow-md hover:scale-105 transition-transform duration-300"
                              draggable="false"
                            />
                          </div>
                          
                          <div className="flex justify-between items-start w-full mb-2">
                            <span className="font-black text-[#234745] text-[16px]">
                              {isEn ? base.nameEn : base.nameAr}
                            </span>
                            <span className="font-black text-[#234745] font-en whitespace-nowrap ml-2">
                              {base.price} SAR
                            </span>
                          </div>
                          
                          <div className="space-y-0.5">
                            <p className="text-xs font-bold text-gray-500">
                              {isEn ? base.servesEn : base.servesAr}
                            </p>
                            <p className="text-[10px] font-bold text-gray-400 font-en uppercase tracking-wider">
                              {isEn ? base.specsEn : base.specsAr}
                            </p>
                          </div>

                          {isSelected && (
                            <div className="absolute bottom-4 right-4 w-5 h-5 bg-[#234745] rounded-full flex items-center justify-center animate-scale-in">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {/* Scroll Indicator Gradient */}
                  <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent pointer-events-none z-10"></div>
                </div>
              )}

              {/* STEP 2: FLAVORS */}
              {currentStep === 2 && (
                <div>
                  <div className="mb-6">
                    <h3 className="text-xl md:text-2xl font-black text-[#234745] mb-1">
                      {isEn ? 'Select Cake Flavor' : 'اختر نكهة الكيكة المفضلة'}
                    </h3>
                    <p className="text-gray-400 text-xs md:text-sm font-bold">
                      {isEn ? 'Pick the delicious base for your masterpiece' : 'اختر النكهة الداخلية المحضرة من مكونات فاخرة وطبيعية'}
                    </p>
                  </div>

                  {/* Flavor Card Selection Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {dynamicFlavors.map((flavor) => {
                      const isSelected = selectedFlavor.id === flavor.id;
                      return (
                        <button
                          key={flavor.id}
                          onClick={() => setSelectedFlavor(flavor)}
                          className={`relative flex items-center gap-4 p-5 rounded-[24px] border-2 transition-all duration-300 text-start ${
                            isSelected 
                              ? 'border-[#234745] bg-white shadow-xl -translate-y-0.5' 
                              : 'border-transparent bg-[#F5E6E6] hover:bg-[#F3E2E2]'
                          }`}
                        >
                          {flavor.isPopular && (
                            <div className="absolute top-0 right-4 -translate-y-1/2 bg-[#d4a06a] text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10">
                              {isEn ? '⭐ Popular' : '⭐ الأكثر طلباً'}
                            </div>
                          )}

                          <div className="w-14 h-14 rounded-full flex-shrink-0 bg-white/50 border border-white flex items-center justify-center p-1 relative overflow-hidden">
                            <img src={flavor.image} alt={flavor.nameEn} className="w-full h-full object-contain" />
                          </div>

                          <div>
                            <h4 className="font-black text-[#234745] text-[16px] leading-tight">
                              {isEn ? flavor.nameEn : flavor.nameAr}
                            </h4>
                            <p className="text-[10px] text-gray-400 mt-1 line-clamp-2 font-bold leading-normal">
                              {isEn ? flavor.descriptionEn : flavor.descriptionAr}
                            </p>
                          </div>

                          {isSelected && (
                            <div className="absolute top-3 right-3 w-5 h-5 bg-[#234745] rounded-full flex items-center justify-center animate-scale-in">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Layers Card */}
                  <div className="mt-8 pt-6 border-t border-gray-100">
                    <h4 className="text-lg md:text-xl font-black text-[#234745] mb-4">
                      {isEn ? 'Cake Layers' : 'عدد طبقات الكيك التلقائي'}
                    </h4>
                    <div className="bg-[#F5E6E6] p-6 rounded-[24px] flex justify-between items-center max-w-md">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center font-black text-[#234745]">
                          {layers}
                        </div>
                        <div className="leading-tight">
                          <span className="text-[#234745] font-black text-sm block">
                            {layers} {isEn ? 'Layers' : 'طبقات الكيك'}
                          </span>
                          <span className="text-[#8E7676] text-xs font-bold">
                            {isEn ? `Height: ~${layers * 5}cm` : `الارتفاع: ~${layers * 5}سم`}
                          </span>
                        </div>
                      </div>
                      <div className="text-[10px] font-black text-[#234745] uppercase tracking-wider bg-white/50 px-3 py-1 rounded-full border border-white">
                        {isEn ? 'Standard' : 'قياسي'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: TOPPINGS + COLORS (DECORATION) */}
              {currentStep === 3 && (
                <div>
                  <div className="mb-6">
                    <h3 className="text-xl md:text-2xl font-black text-[#234745] mb-1">
                      {isEn ? 'Select Decorations & Toppings' : 'اختر الزينة والإضافات'}
                    </h3>
                    <p className="text-gray-400 text-xs md:text-sm font-bold">
                      {isEn ? 'Add up to 3 toppings to your cake' : 'أضف حتى ٣ إضافات كحد أقصى لتزيين كيكتك المخصصة'}
                    </p>
                  </div>

                  {/* Categories Pills */}
                  <div className="flex overflow-x-auto gap-2.5 mb-6 pb-2 scrollbar-none">
                    {TOPPING_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setActiveToppingCategory(cat.id)}
                        className={`whitespace-nowrap px-5 py-2 rounded-full text-xs font-black transition-all duration-300 ${
                          activeToppingCategory === cat.id
                            ? 'bg-[#234745] text-white shadow-md'
                            : 'bg-[#F5E6E6] text-[#234745] hover:bg-[#F3E2E2]'
                        }`}
                      >
                        {isEn ? cat.nameEn : cat.nameAr}
                      </button>
                    ))}
                  </div>

                  {/* Toppings Cards Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {filteredToppings.map((topping) => {
                      const isSelected = selectedToppings.some(t => t.id === topping.id);
                      return (
                        <button
                          key={topping.id}
                          onClick={() => handleToppingToggle(topping)}
                          className={`relative flex flex-col items-center justify-center p-5 rounded-[24px] border-2 transition-all duration-300 text-center ${
                            isSelected 
                              ? 'border-[#234745] bg-white shadow-xl -translate-y-1' 
                              : 'border-transparent bg-[#F5E6E6] hover:bg-[#F3E2E2]'
                          }`}
                        >
                          {topping.isPopular && (
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#d4a06a] text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap z-10">
                              {isEn ? '⭐ Best Seller' : '⭐ الأكثر طلباً'}
                            </div>
                          )}
                          
                          <div className="w-16 h-16 mb-3 flex items-center justify-center">
                            <img 
                              src={topping.thumbnailUrl} 
                              alt={isEn ? topping.nameEn : topping.nameAr}
                              className={`w-full h-full object-contain ${topping.id === 'none' ? 'opacity-25 grayscale' : ''}`}
                            />
                          </div>

                          <span className="font-black text-[#234745] text-sm mb-2 leading-tight h-10 flex items-center justify-center">
                            {isEn ? topping.nameEn : topping.nameAr}
                          </span>

                          <span className={`text-[10px] font-black px-3 py-1 rounded-full ${isSelected ? 'bg-[#234745] text-white' : 'bg-white/60 text-[#234745]'}`}>
                            {topping.priceDelta === 0 ? (isEn ? 'Free' : 'مجاني') : `+${topping.priceDelta} SAR`}
                          </span>

                          {isSelected && (
                            <div className="absolute top-3 right-3 w-5 h-5 bg-[#234745] rounded-full flex items-center justify-center animate-scale-in">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* ---- FROSTING COLOR SECTION (merged into Decoration step) ---- */}
                  <div className="mt-10 pt-8 border-t border-gray-100">
                    <div className="mb-6">
                      <h3 className="text-xl md:text-2xl font-black text-[#234745] mb-1">
                        {isEn ? 'Choose Frosting Color' : 'اختر لون الكريمة الخارجي'}
                      </h3>
                      <p className="text-gray-400 text-xs md:text-sm font-bold">
                        {isEn ? "Select a base color for your cake's exterior" : 'اختر اللون الأساسي للتغطية الخارجية لكيكتك الفريدة'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {dynamicColors.map((color) => {
                        const isSelected = selectedColor.id === color.id;
                        return (
                          <button
                            key={color.id}
                            onClick={() => setSelectedColor(color)}
                            className={`relative flex items-center gap-4 p-4 rounded-[20px] border-2 transition-all duration-300 text-start ${
                              isSelected 
                                ? 'border-[#234745] bg-white shadow-xl' 
                                : 'border-transparent bg-[#F5E6E6] hover:bg-[#F3E2E2]'
                            }`}
                          >
                            <div className="w-10 h-10 rounded-full border border-white/20 shadow-inner flex-shrink-0" style={{ backgroundColor: color.hex }}></div>

                            <div className="leading-tight">
                              <span className="font-black text-[#234745] text-sm block">
                                {isEn ? color.nameEn : color.nameAr}
                              </span>
                              <span className="text-[10px] text-gray-500 font-bold block mt-0.5">
                                {color.isPremium ? (isEn ? '✨ Premium' : '✨ مميز') : (isEn ? 'Standard' : 'أساسي')}
                              </span>
                            </div>

                            {isSelected && (
                              <div className="absolute top-3 right-3 w-5 h-5 bg-[#234745] rounded-full flex items-center justify-center animate-scale-in">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
                              </div>
                            )}
                          </button>
                        );
                      })}

                      {/* Custom Color Picker Card */}
                      <div
                        className={`relative flex items-center gap-4 p-4 rounded-[20px] border-2 transition-all duration-300 ${
                          selectedColor.id.startsWith('custom') 
                            ? 'border-[#234745] bg-white shadow-xl' 
                            : 'border-transparent bg-[#F5E6E6] hover:bg-[#F3E2E2]'
                        }`}
                      >
                        <input 
                          type="color"
                          value={selectedColor.id.startsWith('custom') ? selectedColor.hex : '#ffffff'}
                          onChange={(e) => setSelectedColor({
                            id: `custom-${e.target.value}`,
                            nameEn: 'Custom Color',
                            nameAr: 'لون مخصص',
                            hex: e.target.value
                          })}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />

                        <div 
                          className="w-10 h-10 rounded-full border border-white/20 shadow-inner flex-shrink-0 flex items-center justify-center overflow-hidden"
                          style={{ backgroundColor: selectedColor.id.startsWith('custom') ? selectedColor.hex : '#ffffff' }}
                        >
                          {!selectedColor.id.startsWith('custom') && (
                            <div 
                              className="w-full h-full"
                              style={{
                                background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
                                opacity: 0.5
                              }}
                            ></div>
                          )}
                        </div>

                        <div className="leading-tight">
                          <span className="font-black text-[#234745] text-sm block">
                            {isEn ? 'Custom Color' : 'لون مخصص'}
                          </span>
                          <span className="text-[10px] text-gray-500 font-bold block mt-0.5">
                            {isEn ? 'Click to select' : 'اضغط للاختيار'}
                          </span>
                        </div>

                        {selectedColor.id.startsWith('custom') && (
                          <div className="absolute top-3 right-3 w-5 h-5 bg-[#234745] rounded-full flex items-center justify-center">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}



              {/* STEP 4: PERSONALIZE */}
              {currentStep === 4 && (
                <div className="space-y-8">
                  {/* Text Section */}
                  <div>
                    <div className="mb-6">
                      <h3 className="text-xl md:text-2xl font-black text-[#234745] mb-1">
                        {isEn ? 'Frosting Custom Text' : 'رسالتك الخاصة على الكيكة'}
                      </h3>
                      <p className="text-gray-400 text-xs md:text-sm font-bold">
                        {isEn ? 'Write a heartfelt message on your cake (Max 40 letters)' : 'اكتب عبارة تهنئة قصيرة من القلب على الكيكة (الحد الأقصى ٤٠ حرفاً)'}
                      </p>
                    </div>

                    <div className="bg-[#FBF7F7] border border-gray-100 rounded-[32px] p-6 md:p-8">
                      <textarea 
                        value={cakeMessage}
                        onChange={(e) => setCakeMessage(e.target.value)}
                        placeholder={isEn ? "e.g., Happy Birthday Sarah!" : "مثال: عيد ميلاد سعيد سارة!"}
                        dir="auto"
                        className="w-full h-32 bg-white rounded-2xl p-5 border-2 border-transparent focus:border-[#234745] outline-none text-lg font-bold text-[#234745] transition-all resize-none shadow-sm"
                        maxLength={40}
                        style={{ color: textColor, fontFamily: textFont === 'Script' ? 'cursive' : textFont === 'Modern' ? 'sans-serif' : 'serif' }}
                      />
                      <div className="flex justify-between mt-2 px-1">
                         <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">{isEn ? 'Frosting Color' : 'لون الكتابة'}</span>
                         <span className={`text-xs font-bold ${cakeMessage.length > 35 ? 'text-red-500' : 'text-gray-400'}`}>{cakeMessage.length}/40</span>
                      </div>

                      {/* Font Selection */}
                      <div className="mt-4">
                        <label className="text-gray-400 font-black text-[10px] uppercase tracking-widest mb-2 block">{isEn ? 'Select Font Style' : 'اختر نوع الخط'}</label>
                        <div className="flex gap-2.5">
                          {['Classic', 'Modern', 'Script'].map(font => (
                            <button
                              key={font}
                              type="button"
                              onClick={() => setTextFont(font)}
                              className={`px-4 py-2 rounded-xl border-2 font-black text-xs transition-all ${textFont === font ? 'border-[#234745] bg-[#234745] text-white shadow-md' : 'border-transparent bg-white text-[#234745] hover:border-gray-200'}`}
                              style={{ fontFamily: font === 'Script' ? 'cursive' : font === 'Modern' ? 'sans-serif' : 'serif' }}
                            >
                              {font}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Color Selection */}
                      <div className="mt-4">
                        <label className="text-gray-400 font-black text-[10px] uppercase tracking-widest mb-2 block">{isEn ? 'Select Text Color' : 'اختر لون الكتابة'}</label>
                        <div className="flex gap-2.5">
                          {[
                            { name: 'White', hex: '#FFFFFF' },
                            { name: 'Black', hex: '#000000' },
                            { name: 'Pink', hex: '#FFC0CB' },
                            { name: 'Gold', hex: '#FFD700' },
                            { name: 'Brown', hex: '#3d2b1f' }
                          ].map(color => (
                            <button
                              key={color.hex}
                              type="button"
                              onClick={() => setTextColor(color.hex)}
                              className={`w-9 h-9 rounded-full border-2 transition-all flex items-center justify-center ${textColor === color.hex ? 'border-[#234745] scale-110 shadow-md' : 'border-white/50 hover:scale-105'}`}
                              style={{ backgroundColor: color.hex }}
                              title={color.name}
                            >
                              {textColor === color.hex && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color.hex === '#FFFFFF' ? '#000000' : '#FFFFFF'} strokeWidth="4">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-gray-100 w-full my-6"></div>

                  {/* Edible Image Section */}
                  <div>
                    <div className="mb-6">
                      <h3 className="text-xl md:text-2xl font-black text-[#234745] mb-1">{isEn ? 'Upload Photo' : 'طباعة صورة صالحة للأكل'}</h3>
                      <p className="text-gray-400 text-xs md:text-sm font-bold">{isEn ? 'Add a photo to print on top of your cake' : 'ارفع صورتك الخاصة لنقوم بطباعتها على كيكتك بشكل صالح للأكل تماماً'}</p>
                    </div>

                    <input 
                      type="file" 
                      accept=".jpg,.jpeg,.png,.webp" 
                      id="cake-image-upload" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) processImageFile(file);
                      }}
                    />

                    {uploadedImage ? (
                      <div className="bg-[#FBF7F7] rounded-[32px] p-6 border border-gray-100 flex flex-col items-center justify-center relative overflow-hidden group">
                        <div className="relative w-44 h-44 rounded-2xl overflow-hidden border border-gray-200 shadow-sm mb-4">
                          <img 
                            src={uploadedImage} 
                            alt="Uploaded print preview" 
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => document.getElementById('cake-image-upload')?.click()}
                            className="px-5 py-2 bg-white hover:bg-gray-50 border border-gray-100 text-[#234745] rounded-full text-xs font-black transition-all"
                          >
                            {isEn ? 'Change Image' : 'تغيير الصورة'}
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs font-black transition-all"
                          >
                            {isEn ? 'Remove' : 'حذف'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        onClick={() => !isUploading && document.getElementById('cake-image-upload')?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (isUploading) return;
                          const file = e.dataTransfer.files?.[0];
                          if (file && file.type.startsWith('image/')) {
                            processImageFile(file);
                          }
                        }}
                        className={`border-3 border-dashed border-gray-200 rounded-[32px] h-60 flex flex-col items-center justify-center p-6 transition-all ${isUploading ? 'bg-white cursor-wait' : 'hover:border-[#234745]/30 cursor-pointer bg-[#FBF7F7] group'}`}
                      >
                        {isUploading ? (
                          <div className="w-full max-w-[200px] flex flex-col items-center">
                            <svg className="animate-spin h-8 w-8 text-[#234745] mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p className="text-[#234745] font-black text-sm mb-2">{isEn ? 'Uploading...' : 'جاري الرفع...'}</p>
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-[#234745] transition-all duration-150 ease-out" 
                                style={{ width: `${uploadProgress}%` }}
                              ></div>
                            </div>
                            <p className="text-gray-400 text-[10px] font-bold mt-1">{uploadProgress}%</p>
                          </div>
                        ) : (
                          <>
                            <div className="w-16 h-16 bg-[#234745]/5 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#234745" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                            </div>
                            <p className="text-[#234745] font-black text-lg mb-1">{isEn ? 'Click to Upload' : 'اضغط لرفع صورتك'}</p>
                            <p className="text-gray-400 font-bold text-xs text-center leading-normal">
                              {isEn 
                                ? 'Support JPG, PNG (Max 5MB)\nOr drag & drop your image here' 
                                : 'يدعم صيغ JPG, PNG (بحد أقصى ٥ ميجا)\nأو اسحب وأفلت صورتك هنا بكل سهولة'}
                            </p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 5: FINAL REVIEW */}
              {currentStep === 5 && (
                <div>
                  <div className="mb-6">
                    <h3 className="text-xl md:text-2xl font-black text-[#234745] mb-1">
                      {isEn ? 'Final Review' : 'المراجعة النهائية وتأكيد الطلب'}
                    </h3>
                    <p className="text-gray-400 text-xs md:text-sm font-bold">
                      {isEn ? 'Check your masterpiece before checkout' : 'يرجى مراجعة تفاصيل كيكتك المصممة بعناية قبل إتمام الدفع'}
                    </p>
                  </div>

                  {/* Specification Table */}
                  <div className="space-y-3 bg-[#FBF7F7] border border-gray-100 p-6 rounded-[32px]">
                     {[
                       { label: isEn ? 'Base Cake Shape' : 'شكل الكيكة الأساسي', val: isEn ? (SHAPES.find(s => s.id === selectedShape)?.nameEn) : (SHAPES.find(s => s.id === selectedShape)?.nameAr) },
                       { label: isEn ? 'Base Specs' : 'المواصفات والحجم', val: isEn ? selectedBase.nameEn : selectedBase.nameAr },
                       { label: isEn ? 'Servings & Specs' : 'التقديم والوزن', val: isEn ? `${selectedBase.specsEn} (${selectedBase.servesEn})` : `${selectedBase.specsAr} (${selectedBase.servesAr})` },
                       { label: isEn ? 'Flavor' : 'النكهة الداخلية', val: isEn ? selectedFlavor.nameEn : selectedFlavor.nameAr },
                       { label: isEn ? 'Layers' : 'عدد الطبقات', val: `${layers} ${isEn ? 'Layers' : 'طبقات الكيك'}` },
                       { label: isEn ? 'Frosting Color' : 'لون التغطية الخارجي', val: isEn ? selectedColor.nameEn : selectedColor.nameAr },
                       { label: isEn ? 'Toppings Selected' : 'الإضافات الخارجية', val: selectedToppings.map(t => isEn ? t.nameEn : t.nameAr).join(', ') },
                       { label: isEn ? 'Custom Message' : 'الرسالة المكتوبة', val: cakeMessage || (isEn ? 'None' : 'بدون') },
                       { label: isEn ? 'Edible Print Image' : 'صورة الطباعة للأكل', val: uploadedImage ? (isEn ? 'Uploaded ✓' : 'تم الرفع ✓') : (isEn ? 'None' : 'بدون') },
                     ].map(item => (
                       <div key={item.label} className="flex justify-between items-center p-3.5 bg-white border border-gray-50 rounded-2xl">
                          <span className="text-gray-400 font-bold text-xs uppercase tracking-widest">{item.label}</span>
                          <span className="text-[#234745] font-black text-sm">{item.val}</span>
                       </div>
                     ))}
                  </div>

                  {/* Breakdowns summary list */}
                  <div className="mt-6 bg-[#234745]/5 border border-[#234745]/10 rounded-[24px] p-6 space-y-3.5">
                    <div className="flex justify-between items-center text-sm font-black text-[#234745]">
                      <span>{isEn ? 'Base Cake Price' : 'سعر الكيكة الأساسي'}</span>
                      <span className="font-en">{selectedBase.price.toFixed(2)} SAR</span>
                    </div>
                    {selectedToppings.filter(t => t.priceDelta > 0).map(t => (
                      <div key={t.id} className="flex justify-between items-center text-sm font-bold text-gray-500">
                        <span>{isEn ? `Topping (${t.nameEn})` : `إضافة (${t.nameAr})`}</span>
                        <span className="font-en">+{t.priceDelta.toFixed(2)} SAR</span>
                      </div>
                    ))}
                    <div className="h-px bg-[#234745]/15 my-2"></div>
                    <div className="flex justify-between items-center text-sm font-bold text-gray-500">
                      <span>{isEn ? 'Subtotal' : 'المجموع الفرعي'}</span>
                      <span className="font-en">{subtotal.toFixed(2)} SAR</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-bold text-gray-500">
                      <span>{isEn ? 'VAT (15%)' : 'ضريبة القيمة المضافة (١٥٪)'}</span>
                      <span className="font-en">{vatAmount.toFixed(2)} SAR</span>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Bottom Next/Back navigation button panel */}
            <div className="mt-10 pt-6 border-t border-gray-100 flex justify-between items-center w-full">
              {/* Back button */}
              <button 
                type="button"
                onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                disabled={currentStep === 1}
                className={`px-8 py-3.5 rounded-full border-2 border-gray-100 text-[#234745] font-black transition-all hover:bg-gray-50 flex items-center gap-2 ${currentStep === 1 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={isEn ? '' : 'rotate-180'}><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                {isEn ? 'Back' : 'رجوع'}
              </button>
              
              {/* Next/Checkout button */}
              {currentStep === 5 ? (
                <button 
                  type="button"
                  onClick={handleOrderSubmit}
                  disabled={orderState === 'submitting'}
                  className={`text-white font-black py-4 px-12 rounded-full shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all flex items-center gap-3 ${
                    orderState === 'success' ? 'bg-[#234745]' : orderState === 'error' ? 'bg-red-500 hover:bg-red-600' : 'bg-[#234745] hover:bg-[#1a3533]'
                  }`}
                >
                  {orderState === 'submitting' ? (
                    <span className="flex items-center gap-3">
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span>{isEn ? 'Creating Order...' : 'جاري إنشاء الطلب...'}</span>
                    </span>
                  ) : orderState === 'success' ? (
                    <span className="flex items-center gap-3">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                      <span>{isEn ? 'Redirecting...' : 'جاري التحويل...'}</span>
                    </span>
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                      <span>{isEn ? 'Order Now' : 'اطلب الآن'}</span>
                    </>
                  )}
                </button>
              ) : (
                <button 
                  type="button"
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="bg-[#234745] hover:bg-[#1a3533] text-white font-black py-4 px-12 rounded-full shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all flex items-center gap-3 group"
                >
                  <span>
                    {currentStep === 1 && (isEn ? 'Next, Flavor ⟵' : 'التالي، النكهة ⟵')}
                    {currentStep === 2 && (isEn ? 'Next, Decoration ⟵' : 'التالي، الزينة والألوان ⟵')}
                    {currentStep === 3 && (isEn ? 'Next, Personalize ⟵' : 'التالي، تخصيص الكيكة ⟵')}
                    {currentStep === 4 && (isEn ? 'Next, Review ⟵' : 'التالي، المراجعة والطلب ⟵')}
                  </span>
                  <svg className={`w-5 h-5 transition-transform group-hover:translate-x-0.5 ${isEn ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                </button>
              )}
            </div>

            {/* Error notifications */}
            {orderState === 'error' && orderError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm font-bold text-center">
                {orderError}
              </div>
            )}

          </div>
        </div>

        {/* Right Side: Interactive Live Preview Panel (5 cols, matches mockup) */}
        <div className="lg:col-span-5 bg-[#F4E2E2] p-8 md:p-12 flex flex-col items-center justify-center gap-6 lg:gap-8 min-h-[500px] order-1 lg:order-2">
          
          {/* Active selection indicator badge */}
          <div className="bg-[#234745] text-white text-xs md:text-sm font-black py-2 px-6 rounded-full shadow-md tracking-wider uppercase">
            {isEn 
              ? (SHAPES.find(s => s.id === selectedShape)?.nameEn || 'Circle') 
              : (SHAPES.find(s => s.id === selectedShape)?.nameAr || 'دائري')
            }
          </div>

          {/* Large white ring outer preview container */}
          <div className="relative w-[300px] h-[300px] sm:w-[350px] sm:h-[350px] md:w-[420px] md:h-[420px] bg-white rounded-full flex items-center justify-center shadow-[0_25px_60px_rgba(0,0,0,0.06)] border-4 border-white/50 animate-bounce-gentle">
            {/* Dashed circular border ornament inside */}
            <div className="absolute inset-4 rounded-full border border-dashed border-[#234745]/20 pointer-events-none"></div>
            
            {/* Live Composited Cake Render */}
            <div className="relative z-10 scale-[0.85] md:scale-105 transition-all duration-700">
              <CakePreview 
                shape={selectedShape === 'star' || selectedShape === 'hexagon' ? 'round' : selectedShape}
                layers={layers}
                color={selectedColor.hex}
                toppings={selectedToppings.map((t: any) => t.id)}
                message={cakeMessage}
                textColor={textColor}
                textFont={textFont}
                flavorName={isEn ? selectedFlavor.nameEn : selectedFlavor.nameAr}
                baseImage={selectedBase?.image}
              />
            </div>
          </div>

          {/* Price dynamic tag below preview */}
          <div className="bg-white text-[#234745] text-sm md:text-base font-black py-2.5 px-8 rounded-full shadow-lg border border-gray-50 flex items-center gap-1">
            <span className="text-gray-400 text-xs font-bold">{isEn ? 'From' : 'من'}</span>
            <span className="font-en">{finalTotal.toFixed(2)} SAR</span>
          </div>

          {/* 3-features bottom bar badge list */}
          <div className="w-full max-w-md bg-white/70 backdrop-blur-md py-4 px-6 rounded-[24px] border border-white/40 shadow-sm flex justify-between items-center text-[10px] md:text-xs text-[#234745] font-black gap-2">
            <div className="flex items-center gap-1.5 flex-1 justify-center">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              <span className="text-center leading-tight">{isEn ? 'Made with Love' : 'صنع بحب وبعناية'}</span>
            </div>
            <div className="w-px h-6 bg-[#234745]/20"></div>
            <div className="flex items-center gap-1.5 flex-1 justify-center">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
              <span className="text-center leading-tight">{isEn ? 'Chilled Delivery' : 'توصيل مبرد لضمان الجودة'}</span>
            </div>
            <div className="w-px h-6 bg-[#234745]/20"></div>
            <div className="flex items-center gap-1.5 flex-1 justify-center">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <span className="text-center leading-tight">{isEn ? 'Premium Ingredients' : 'مكونات فاخرة'}</span>
            </div>
          </div>

        </div>

      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes bounce-gentle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes step-enter {
          from { opacity: 0; transform: translateX(25px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes scale-in {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-bounce-gentle { animation: bounce-gentle 4s ease-in-out infinite; }
        .animate-step-enter { animation: step-enter 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-scale-in { animation: scale-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
        
        .font-en { font-family: 'Inter', sans-serif; }
      `}} />
    </div>
  );
}
