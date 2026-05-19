import { useState, useMemo, useEffect, useCallback } from 'react';
import { type MetaFunction, type LoaderFunctionArgs, Form } from 'react-router';
import { useLoaderData } from 'react-router';
import { ShapeSizeSelector, CAKE_BASES, type CakeBase } from '~/components/CakeBuilder/ShapeSizeSelector';
import { FlavorLayerSelector, FLAVORS, type Flavor } from '~/components/CakeBuilder/FlavorLayerSelector';
import { ColorSelector, COLORS } from '~/components/CakeBuilder/ColorSelector';
import { ToppingsSelector, TOPPINGS } from '~/components/CakeBuilder/ToppingsSelector';
import { CakePreview } from '~/components/CakeBuilder/CakePreview';

export const meta: MetaFunction = () => {
  return [{ title: 'Customize Your Dream Cake | Saadeddin' }];
};

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
  const totalSteps = 6;
  const [isHydrated, setIsHydrated] = useState(false);
  const [showDraftToast, setShowDraftToast] = useState(false);

  // --- MAP API DATA TO STATE ---

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
  const [selectedBase, setSelectedBase] = useState<CakeBase>(CAKE_BASES[1]); 
  const [selectedFlavor, setSelectedFlavor] = useState<Flavor>(FLAVORS[1]);
  const [selectedColor, setSelectedColor] = useState(dynamicColors[0] || COLORS[6]); 
  const layers = selectedBase.id.includes('barrel') ? 3 : (selectedBase.id === 'sheet' ? 1 : 2);
  const [selectedToppings, setSelectedToppings] = useState<any[]>([dynamicToppings[0] || TOPPINGS[0]]);
  const [cakeMessage, setCakeMessage] = useState('');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [textFont, setTextFont] = useState('Classic');
  const [selectedDecoration, setSelectedDecoration] = useState({ id: 'none', nameEn: 'None', nameAr: 'بدون' });
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  // --- PERSISTENCE: LOAD DRAFT ---
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const savedDraft = localStorage.getItem('saadeddin_cake_draft');
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft) as any;
        // Map saved IDs back to objects from dynamic lists
        const baseId = draft.baseId || 'small_standard';
        const base = CAKE_BASES.find((b: any) => b.id === baseId) || CAKE_BASES[1];
        const flavorId = draft.flavor?.id || 'choco-crunch';
        const flavor = FLAVORS.find(f => f.id === flavorId) || FLAVORS[1];
        const color = dynamicColors.find((c: any) => c.id === draft.colorId) || dynamicColors[0];
        const toppingIds = draft.toppingIds || [draft.toppingId];
        const toppings = dynamicToppings.filter((t: any) => toppingIds.includes(t.id));

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
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert(isEn ? 'File is too large (max 5MB)' : 'الملف كبير جداً (الأقصى ٥ ميجابايت)');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
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

  const steps = [
    { id: 1, en: 'Base', ar: 'الأساس' },
    { id: 2, en: 'Flavor', ar: 'النكهة' },
    { id: 3, en: 'Toppings', ar: 'الإضافات' },
    { id: 4, en: 'Decoration', ar: 'التزيين' },
    { id: 5, en: 'Personalize', ar: 'تخصيص' },
    { id: 6, en: 'Review', ar: 'المراجعة' },
  ];

  // --- DRAFT ORDER SUBMISSION ---
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
          uploadedImage: uploadedImage ? 'yes' : null,
          subtotal,
          vatAmount,
          finalTotal,
          isEn,
        }),
      });

      const result = await response.json() as any;

      if (result.success && result.checkoutUrl) {
        setOrderState('success');
        // Clear draft after successful order
        localStorage.removeItem('saadeddin_cake_draft');
        // Redirect to Shopify checkout after brief success animation
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
    <div className="min-h-screen bg-[#FDF5E6] pt-12 pb-20" dir={isEn ? 'ltr' : 'rtl'}>
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

      <div className="container mx-auto px-4 max-w-7xl">
        
        {/* Top Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex items-center gap-[10px] mb-3 w-fit">
            <div className="w-[85px] h-[1px] bg-[#9a7e6f]"></div>
            <img 
              src="/images/saadaldeen-star-vector.svg" 
              alt="Star" 
              style={{ width: '22.5px', height: '22.5px', filter: 'sepia(1) saturate(0.8) hue-rotate(345deg) brightness(0.7)' }} 
            />
            <div className="w-[85px] h-[1px] bg-[#9a7e6f]"></div>
          </div>
          
          <p className="text-[#9a7e6f] tracking-tight whitespace-nowrap" style={{ fontFamily: "'GE Dinar One', sans-serif", fontWeight: 500, fontSize: '16px', lineHeight: '100%', letterSpacing: '0%', textAlign: 'right', verticalAlign: 'middle', marginBottom: '20px' }}>
            {isEn ? 'Craft a moment that lingers — Step by step' : 'أصنع لحظة لا تُنسى — خطوة بخطوة'}
          </p>

          <h1 className="text-[#234745] mb-4" style={{ fontFamily: "'Bahij Janna', sans-serif", fontWeight: 700, fontSize: '50px', lineHeight: '100%', letterSpacing: '0%', textAlign: 'center', verticalAlign: 'middle' }}>
            {isEn ? 'Design a Cake for Your Occasion' : 'صمم كيكة تناسب مناسبتك'}
          </h1>
          
          <p className="text-gray-400 font-bold text-[15px] max-w-xl">
            {isEn ? 'Choose the size, flavor, and decoration with ease' : 'إختر الحجم والنكهة والتزيين ورسالتك الخاصة بكل سهولة'}
          </p>
        </div>
          <div className="mt-6 md:mt-0 flex justify-center mb-6">
             <Form action="/api/locale" method="post" reloadDocument>
               <input type="hidden" name="locale" value={isEn ? 'ar' : 'en'} />
               <input type="hidden" name="returnTo" value={isEn ? '/custom-cake' : '/en/custom-cake'} />
               <button type="submit" className="bg-white/80 backdrop-blur-sm px-6 py-2 rounded-full border border-gray-100 shadow-sm flex items-center gap-2 text-[#234745] font-bold text-sm hover:bg-[#234745]/5 transition-all">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                  {isEn ? 'العربية' : 'English'}
               </button>
             </Form>
          </div>

        {/* Progress Tracker Bar - EXPANDED TO 9 STEPS */}
        <div className="bg-white rounded-[32px] p-6 lg:p-10 shadow-[0_10px_40px_rgba(35,71,69,0.05)] border border-gray-50 mb-10 max-w-6xl mx-auto">
          <div className="relative mb-8 px-4">
             <div className="absolute top-1/2 left-0 w-full h-2 bg-gray-100 rounded-full -translate-y-1/2"></div>
             <div 
               className="absolute top-1/2 left-0 h-2 bg-[#234745] rounded-full -translate-y-1/2 transition-all duration-700 ease-out"
               style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
             ></div>
          </div>
          <div className="flex justify-between relative">
            {steps.map((step) => (
              <div key={step.id} className="flex flex-col items-center">
                <button 
                   onClick={() => setCurrentStep(step.id)}
                   className={`w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center font-bold text-[12px] lg:text-[14px] border-4 transition-all duration-500 z-10 ${
                    currentStep === step.id 
                      ? 'bg-[#234745] text-white border-white shadow-xl scale-110' 
                      : currentStep > step.id
                        ? 'bg-[#234745] text-white border-white'
                        : 'bg-white text-gray-300 border-gray-50'
                  }`}
                >
                  {currentStep > step.id ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"/></svg>
                  ) : step.id}
                </button>
                <span className={`hidden lg:block text-[10px] mt-3 font-bold uppercase tracking-[0.15em] ${currentStep >= step.id ? 'text-[#234745]' : 'text-gray-300'}`}>
                  {isEn ? step.en : step.ar}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Builder Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative">
          
          {/* Left Column: Live Preview (5 Cols) */}
          <div className="lg:col-span-5">
            <div className="bg-white/80 backdrop-blur-xl rounded-[40px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-white sticky top-24 transition-all duration-500 hover:shadow-[0_30px_60px_rgba(35,71,69,0.08)]">
               <div className="flex items-center gap-2 mb-8">
                  <div className="w-8 h-8 rounded-full bg-[#234745]/10 flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#234745" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  </div>
                  <h3 className="text-xl font-bold text-[#234745]">{isEn ? 'Design Preview' : 'معاينة التصميم'}</h3>
               </div>
               
               <div className="h-[460px] bg-gradient-to-b from-[#F8F9FA] to-white rounded-[32px] flex flex-col items-center justify-center border border-gray-50 p-6 text-center relative overflow-hidden group">
                  <div className="w-full h-full relative z-10 flex flex-col items-center justify-center">
                     <CakePreview 
                       shape={selectedBase.shapeId as any}
                       layers={layers}
                       color={selectedColor.hex}
                       secondaryColor={selectedColor.hex}
                       message={cakeMessage}
                       textColor={textColor}
                       textFont={textFont}
                     />
                  </div>
                  
                  <div className="absolute bottom-10 z-10 bg-white/80 backdrop-blur-md px-6 py-3 rounded-full border border-white shadow-lg flex items-center gap-3">
                    <div className="flex flex-col items-start leading-none">
                      <p className="text-[#234745] font-black text-sm uppercase tracking-wider">
                        {isEn ? selectedFlavor.nameEn : selectedFlavor.nameAr}
                      </p>
                      <span className="text-[10px] text-gray-500 font-bold mt-1">
                        {layers} {isEn ? 'Layers' : 'طبقات'} • {isEn ? selectedBase.nameEn : selectedBase.nameAr}
                      </span>
                    </div>
                    {selectedToppings.some(t => t.id !== 'none') && (
                       <div className="h-6 w-[1px] bg-gray-200 mx-1" />
                    )}
                    {selectedToppings.some(t => t.id !== 'none') && (
                       <span className="bg-[#234745] text-white text-[10px] px-3 py-1.5 rounded-full font-bold max-w-[150px] truncate">
                         {selectedToppings.map(t => isEn ? t.nameEn : t.nameAr).join(', ')}
                       </span>
                    )}
                  </div>
               </div>
            </div>
          </div>

          {/* Right Column: Selection & Price (7 Cols) */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Active Selection Card */}
            <div className="bg-white rounded-[40px] p-8 lg:p-10 shadow-[0_15px_35px_rgba(0,0,0,0.03)] border border-gray-50 min-h-[550px] flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#234745]/5 rounded-bl-[100px] -mr-10 -mt-10"></div>
              
              <div className="flex-1 relative z-10">
                <div key={currentStep} className="animate-step-enter">
                  {currentStep === 1 && (
                     <ShapeSizeSelector 
                       isEn={isEn}
                       selectedBase={selectedBase}
                       onBaseChange={setSelectedBase}
                     />
                  )}

                  {currentStep === 2 && (
                    <div className="cake-builder-step">
                       <FlavorLayerSelector 
                        isEn={isEn} 
                        selectedFlavor={selectedFlavor as any}
                        onFlavorChange={setSelectedFlavor as any}
                        layers={layers}
                        onLayersChange={() => {}}
                        onlyFlavor={true}
                      />
                    </div>
                  )}

                  {currentStep === 3 && (
                     <ToppingsSelector 
                       isEn={isEn}
                       toppings={dynamicToppings}
                       selectedToppings={selectedToppings}
                       onToppingsChange={setSelectedToppings}
                       maxToppings={3}
                     />
                  )}

                  {currentStep === 4 && (
                    <ColorSelector 
                      isEn={isEn}
                      colors={dynamicColors}
                      selectedColor={selectedColor}
                      onColorChange={setSelectedColor}
                    />
                  )}

                  {currentStep === 5 && (
                    <div className="cake-builder-step space-y-12">
                      {/* Text Section */}
                      <div>
                        <div className="mb-8">
                          <h2 className="text-3xl font-black text-[#234745] mb-2">{isEn ? 'Custom Text' : 'نص مخصص'}</h2>
                          <p className="text-gray-400 font-medium">{isEn ? 'Write a heartfelt message on your cake' : 'اكتب رسالة من القلب على كيكتك'}</p>
                        </div>
                        <div className="bg-[#F8F9FA] rounded-[32px] p-8 border border-gray-100">
                          <textarea 
                            value={cakeMessage}
                            onChange={(e) => setCakeMessage(e.target.value)}
                            placeholder={isEn ? "e.g., Happy 5th Birthday Sarah!" : "مثال: عيد ميلاد سعيد سارة!"}
                            className="w-full h-32 bg-white rounded-2xl p-6 border-2 border-transparent focus:border-[#234745] outline-none text-xl font-bold text-[#234745] transition-all resize-none shadow-inner"
                            maxLength={40}
                            style={{ color: textColor, fontFamily: textFont === 'Script' ? 'cursive' : textFont === 'Modern' ? 'sans-serif' : 'serif' }}
                          />
                          <div className="flex justify-between mt-2">
                             <span className="text-gray-300 text-xs font-bold uppercase tracking-widest">{isEn ? 'Frosting Text' : 'نص الكريمة'}</span>
                             <span className={`text-xs font-bold ${cakeMessage.length > 35 ? 'text-red-400' : 'text-gray-400'}`}>{cakeMessage.length}/40</span>
                          </div>

                          {/* Font Selection */}
                          <div className="mt-4">
                            <label className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-2 block">{isEn ? 'Select Font' : 'اختر الخط'}</label>
                            <div className="flex gap-3">
                              {['Classic', 'Modern', 'Script'].map(font => (
                                <button
                                  key={font}
                                  onClick={() => setTextFont(font)}
                                  className={`px-4 py-2 rounded-xl border-2 font-bold text-sm transition-all ${textFont === font ? 'border-[#234745] bg-[#234745] text-white' : 'border-gray-100 bg-white text-[#234745] hover:border-[#234745]/30'}`}
                                  style={{ fontFamily: font === 'Script' ? 'cursive' : font === 'Modern' ? 'sans-serif' : 'serif' }}
                                >
                                  {font}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Color Selection */}
                          <div className="mt-4">
                            <label className="text-gray-400 font-bold text-xs uppercase tracking-widest mb-2 block">{isEn ? 'Select Color' : 'اختر اللون'}</label>
                            <div className="flex gap-3">
                              {[
                                { name: 'White', hex: '#FFFFFF' },
                                { name: 'Black', hex: '#000000' },
                                { name: 'Pink', hex: '#FFC0CB' },
                                { name: 'Gold', hex: '#FFD700' },
                                { name: 'Brown', hex: '#3d2b1f' }
                              ].map(color => (
                                <button
                                  key={color.hex}
                                  onClick={() => setTextColor(color.hex)}
                                  className={`w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center ${textColor === color.hex ? 'border-[#234745] scale-110' : 'border-gray-100 hover:scale-105'}`}
                                  style={{ backgroundColor: color.hex }}
                                  title={color.name}
                                >
                                  {textColor === color.hex && (
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color.hex === '#FFFFFF' ? '#000000' : '#FFFFFF'} strokeWidth="4">
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="h-px bg-gray-100 w-full my-8"></div>

                      {/* Image Section */}
                      <div>
                        <div className="mb-8">
                          <h2 className="text-3xl font-black text-[#234745] mb-2">{isEn ? 'Upload Image' : 'رفع صورة'}</h2>
                          <p className="text-gray-400 font-medium">{isEn ? 'Add a photo for edible printing' : 'أضف صورة للطباعة الصالحة للأكل'}</p>
                        </div>

                        <input 
                          type="file" 
                          accept="image/*" 
                          id="cake-image-upload" 
                          className="hidden" 
                          onChange={handleImageUpload} 
                        />

                        {uploadedImage ? (
                          <div className="bg-white rounded-[40px] p-6 border-2 border-gray-50 shadow-lg flex flex-col items-center justify-center relative overflow-hidden group">
                            <div className="relative w-48 h-48 rounded-2xl overflow-hidden border border-gray-100 shadow-inner mb-6">
                              <img 
                                src={uploadedImage} 
                                alt="Uploaded print preview" 
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="text-white font-bold text-xs uppercase tracking-widest">{isEn ? 'Preview Only' : 'معاينة فقط'}</span>
                              </div>
                            </div>

                            <div className="flex gap-4">
                              <button
                                onClick={() => document.getElementById('cake-image-upload')?.click()}
                                className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-[#234745] rounded-full text-xs font-bold transition-all uppercase tracking-widest"
                              >
                                {isEn ? 'Change Image' : 'تغيير الصورة'}
                              </button>
                              <button
                                onClick={handleRemoveImage}
                                className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-full text-xs font-bold transition-all uppercase tracking-widest"
                              >
                                {isEn ? 'Remove' : 'حذف'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div 
                            onClick={() => document.getElementById('cake-image-upload')?.click()}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              const file = e.dataTransfer.files?.[0];
                              if (file && file.type.startsWith('image/')) {
                                if (file.size > 5 * 1024 * 1024) {
                                  alert(isEn ? 'File is too large (max 5MB)' : 'الملف كبير جداً (الأقصى ٥ ميجابايت)');
                                  return;
                                }
                                const reader = new FileReader();
                                reader.onloadend = () => setUploadedImage(reader.result as string);
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="border-4 border-dashed border-gray-100 rounded-[40px] h-[300px] flex flex-col items-center justify-center p-10 group hover:border-[#234745]/30 transition-all cursor-pointer bg-white"
                          >
                            <div className="w-20 h-20 bg-[#234745]/5 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                               <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#234745" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                            </div>
                            <p className="text-[#234745] font-black text-xl mb-2">{isEn ? 'Click to Upload' : 'اضغط للرفع'}</p>
                            <p className="text-gray-400 font-medium text-sm text-center whitespace-pre-line">
                              {isEn 
                                ? 'Support JPG, PNG (Max 5MB)\nOr drag & drop your image here' 
                                : 'يدعم JPG, PNG (بحد أقصى ٥ ميجا)\nأو اسحب وأفلت صورتك هنا'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {currentStep === 6 && (
                    <div className="cake-builder-step">
                      <div className="mb-10">
                        <h2 className="text-3xl font-black text-[#234745] mb-2">{isEn ? 'Final Review' : 'المراجعة النهائية'}</h2>
                        <p className="text-gray-400 font-medium">{isEn ? 'Check your masterpiece before checkout' : 'تحقق من تحفتك الفنية قبل الدفع'}</p>
                      </div>
                      <div className="space-y-4">
                         {[
                           { label: isEn ? 'Base Cake' : 'كيكة الأساس', val: isEn ? selectedBase.nameEn : selectedBase.nameAr },
                           { label: isEn ? 'Specs' : 'المواصفات', val: isEn ? selectedBase.specsEn : selectedBase.specsAr },
                           { label: isEn ? 'Flavor' : 'النكهة', val: isEn ? selectedFlavor.nameEn : selectedFlavor.nameAr },
                           { label: isEn ? 'Layers' : 'الطبقات', val: layers },
                           { label: isEn ? 'Toppings' : 'الإضافات', val: selectedToppings.map(t => isEn ? t.nameEn : t.nameAr).join(', ') },
                           { label: isEn ? 'Text' : 'النص', val: cakeMessage || (isEn ? 'None' : 'بدون') },
                           { label: isEn ? 'Printed Image' : 'صورة الطباعة', val: uploadedImage ? (isEn ? 'Uploaded' : 'تم الرفع') : (isEn ? 'None' : 'بدون') },
                         ].map(item => (
                           <div key={item.label} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                              <span className="text-gray-400 font-bold text-xs uppercase tracking-widest">{item.label}</span>
                              <span className="text-[#234745] font-black">{item.val}</span>
                           </div>
                         ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Step Navigation Button */}
              <div className="mt-10 flex justify-between items-center relative z-10">
                 <button 
                   onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                   disabled={currentStep === 1}
                   className={`px-8 py-4 rounded-[20px] border-2 border-gray-100 text-[#234745] font-black transition-all hover:bg-gray-50 flex items-center gap-2 ${currentStep === 1 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                 >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={isEn ? '' : 'rotate-180'}><path d="M15 18l-6-6 6-6"/></svg>
                    {isEn ? 'Back' : 'رجوع'}
                 </button>
                 
                 {currentStep === 8 ? (
                    <button 
                      onClick={handleOrderSubmit}
                      disabled={orderState === 'submitting'}
                      className={`text-white font-black py-4 px-12 rounded-[20px] shadow-xl hover:-translate-y-1 active:scale-95 transition-all flex items-center gap-3 group ${
                        orderState === 'success' ? 'bg-green-600' : orderState === 'error' ? 'bg-red-500 hover:bg-red-600' : 'bg-[#234745] hover:bg-[#d4a06a]'
                      }`}
                    >
                      {orderState === 'submitting' ? (
                        <span className="flex items-center gap-3">
                          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          <span className="text-[18px]">{isEn ? 'Creating Order...' : 'جاري إنشاء الطلب...'}</span>
                        </span>
                      ) : orderState === 'success' ? (
                        <span className="flex items-center gap-3">
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                          <span className="text-[18px]">{isEn ? 'Redirecting to Checkout...' : 'جاري التحويل للدفع...'}</span>
                        </span>
                      ) : (
                        <>
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                          <span className="text-[18px]">{isEn ? 'Order Now' : 'اطلب الآن'}</span>
                          <span className="text-sm opacity-70 font-en">({finalTotal.toFixed(2)} SAR)</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button 
                      onClick={() => setCurrentStep(currentStep + 1)}
                      className="bg-[#234745] hover:bg-[#d4a06a] text-white font-black py-4 px-12 rounded-[20px] shadow-xl hover:-translate-y-1 active:scale-95 transition-all flex items-center gap-3 group"
                    >
                      <span className="text-[18px]">{isEn ? 'Next Step' : 'الخطوة التالية'}</span>
                      <svg className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${isEn ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  )}

                  {/* Error Message */}
                  {orderState === 'error' && orderError && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-sm font-bold text-center">
                      {orderError}
                    </div>
                  )}
              </div>
            </div>

            {/* Price Breakdown Card */}
            <div className="bg-[#234745] rounded-[40px] p-1 shadow-2xl overflow-hidden group">
              <div className="bg-white rounded-[38px] p-8 transition-all duration-500 group-hover:scale-[0.99]">
                <div className="flex items-center gap-2 mb-6">
                   <div className="w-8 h-8 rounded-lg bg-[#234745] flex items-center justify-center text-white">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/></svg>
                   </div>
                   <h3 className="text-xl font-bold text-[#234745]">{isEn ? 'Order Summary' : 'ملخص الطلب'}</h3>
                </div>

                <div className="space-y-5">
                   {[
                     { label: isEn ? 'Base Cake' : 'سعر الكيكة الأساسي', val: selectedBase.price },
                     ...(layers > 1 ? [{ label: isEn ? `Extra Layers (${layers - 1})` : `طبقات إضافية (${layers - 1})`, val: (layers - 1) * 35 }] : []),
                     ...selectedToppings.filter(t => t.priceDelta > 0).map(t => ({
                       label: isEn ? `Topping (${t.nameEn})` : `إضافة (${t.nameAr})`,
                       val: t.priceDelta
                     }))
                   ].map((item, i) => (
                     <div 
                       key={item.label} 
                       className="flex justify-between items-center text-[15px] animate-stagger-fade"
                       style={{ animationDelay: `${i * 0.1}s` }}
                     >
                        <span className="text-gray-400 font-medium">{item.label}</span>
                        <span className="text-[#234745] font-bold font-en">{i === 0 ? '' : '+'}{item.val.toFixed(2)} SAR</span>
                     </div>
                   ))}

                   <div className="pt-6 border-t border-gray-50 flex justify-between items-center text-[15px]">
                      <span className="text-gray-400 font-medium">{isEn ? 'Subtotal' : 'المجموع الفرعي'}</span>
                      <span className="text-[#234745] font-bold font-en">{subtotal.toFixed(2)} SAR</span>
                   </div>

                   <div className="flex justify-between items-center text-[15px]">
                      <span className="text-gray-400 font-medium">{isEn ? 'VAT (15%)' : 'ضريبة القيمة المضافة (١٥٪)'}</span>
                      <span className="text-[#234745] font-bold font-en">{vatAmount.toFixed(2)} SAR</span>
                   </div>

                   <div className="mt-8 bg-[#234745] rounded-[24px] p-8 flex justify-between items-center shadow-inner relative overflow-hidden group/total">
                      <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover/total:opacity-100 transition-opacity duration-700"></div>
                      <div className="relative z-10">
                        <span className="text-[18px] font-bold text-white/60 block uppercase tracking-widest">{isEn ? 'Total' : 'الإجمالي'}</span>
                        <span className="text-[34px] font-black text-white font-en leading-none">{finalTotal.toFixed(2)} <span className="text-sm">SAR</span></span>
                      </div>
                      <div className="relative z-10 w-14 h-14 bg-white/10 rounded-full flex items-center justify-center text-white">
                         <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                      </div>
                   </div>

                   <p className="text-center text-[11px] text-gray-300 font-medium mt-6">
                      {isEn ? 'VAT included • Prices may vary for custom requests' : 'السعر شامل الضريبة • قد تختلف الأسعار للطلبات الخاصة'}
                   </p>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes bounce-gentle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes step-enter {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes stagger-fade {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-bounce-gentle { animation: bounce-gentle 3s ease-in-out infinite; }
        .animate-step-enter { animation: step-enter 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-stagger-fade { animation: stagger-fade 0.5s ease-out forwards; opacity: 0; }
        .animate-spin-slow { animation: spin-slow 8s linear infinite; }
        
        .font-en { font-family: 'Inter', sans-serif; }
        .font-ar { font-family: 'Cairo', sans-serif; }
      `}} />
    </div>
  );
}
