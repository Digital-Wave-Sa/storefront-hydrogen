import { useState, useMemo } from 'react';
import { type MetaFunction, type LoaderFunctionArgs } from 'react-router';
import { useLoaderData } from 'react-router';
import { ShapeSizeSelector, SHAPES, SIZES } from '~/components/CakeBuilder/ShapeSizeSelector';
import { FlavorLayerSelector } from '~/components/CakeBuilder/FlavorLayerSelector';
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
    });
    console.log('--- DEBUG CAKE ATTRIBUTES ---', JSON.stringify(metaobjects.nodes, null, 2));
    return { locale, cakeAttributes: metaobjects.nodes };
  } catch (error) {
    console.error('Failed to fetch cake attributes:', error);
    return { locale, cakeAttributes: [] };
  }
}

export default function CustomCakeBuilder() {
  const { locale, cakeAttributes } = useLoaderData<typeof loader>();
  const isEn = locale === 'en';
  
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;

  // --- MAP API DATA TO STATE ---
  const dynamicShapes = useMemo(() => {
    const shapes = cakeAttributes?.filter((a: any) => a.attributeType?.value === 'Shape' || a.attributeType?.value === 'shape').map((a: any) => ({
      id: a.id,
      nameEn: a.nameEn?.value || 'Unknown',
      nameAr: a.nameAr?.value || 'غير معروف',
      priceDelta: parseFloat(a.priceDelta?.value || '0'),
      icon: SHAPES.find(s => s.id === a.id)?.icon || SHAPES[0].icon
    }));
    return shapes?.length > 0 ? shapes : SHAPES;
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
    const toppings = cakeAttributes?.filter((a: any) => a.attributeType?.value === 'Topping' || a.attributeType?.value === 'topping').map((a: any) => ({
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
  const [selectedShape, setSelectedShape] = useState(dynamicShapes[0]);
  const [selectedSize, setSelectedSize] = useState(SIZES[1]); // Sizes usually fixed, can be dynamic later
  const [selectedFlavor, setSelectedFlavor] = useState({
    id: 'chocolate',
    nameEn: 'Belgian Chocolate',
    nameAr: 'شوكولاتة بلجيكية',
  });
  const [selectedColor, setSelectedColor] = useState(dynamicColors[0] || COLORS[6]); 
  const [layers, setLayers] = useState(2);
  const [selectedTopping, setSelectedTopping] = useState(dynamicToppings[0] || TOPPINGS[0]);
  const [cakeMessage, setCakeMessage] = useState('');

  // --- PRICE CALCULATION ---
  const basePrice = 150.00;
  const subtotal = useMemo(() => {
    const shapeExtra = selectedShape.priceDelta || 0;
    const sizeExtra = selectedSize.priceDelta;
    const layersExtra = (layers - 1) * 35;
    const toppingExtra = selectedTopping.priceDelta;
    return basePrice + shapeExtra + sizeExtra + layersExtra + toppingExtra;
  }, [selectedShape, selectedSize, layers, selectedTopping]);
  
  const vatAmount = subtotal * 0.15;
  const finalTotal = subtotal + vatAmount;

  return (
    <div className="min-h-screen bg-[#FDF5E6] pt-12 pb-20" dir={isEn ? 'ltr' : 'rtl'}>
      <div className="container mx-auto px-4 max-w-7xl">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-12">
          <div className="text-center md:text-start">
            <h1 className="text-[32px] lg:text-[42px] font-serif text-[#234745] font-black leading-tight">
              {isEn ? 'Customize Your Dream Cake' : 'صمم كيكة أحلامك'}
            </h1>
            <p className="text-[#8B8B8B] font-medium mt-1">
              {isEn ? 'Premium Saudi Pastries' : 'حلويات سعودية فاخرة'}
            </p>
          </div>
          <div className="mt-6 md:mt-0">
             <button className="bg-white/80 backdrop-blur-sm px-6 py-2 rounded-full border border-gray-100 shadow-sm flex items-center gap-2 text-[#234745] font-bold text-sm">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                {isEn ? 'العربية' : 'English'}
             </button>
          </div>
        </div>

        {/* Progress Tracker Bar */}
        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-50 mb-10 max-w-4xl mx-auto">
          <div className="relative mb-4">
             <div className="absolute top-1/2 left-0 w-full h-1.5 bg-gray-100 rounded-full -translate-y-1/2"></div>
             <div 
               className="absolute top-1/2 left-0 h-1.5 bg-[#234745] rounded-full -translate-y-1/2 transition-all duration-700 ease-out"
               style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
             ></div>
          </div>
          <div className="flex justify-between relative px-2">
            {[1, 2, 3, 4, 5].map((step) => (
              <div key={step} className="flex flex-col items-center">
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-[14px] border-4 transition-all duration-500 ${
                    currentStep >= step 
                      ? 'bg-[#234745] text-white border-white shadow-md' 
                      : 'bg-white text-gray-300 border-gray-50'
                  }`}
                >
                  {step}
                </div>
                <span className={`text-[11px] mt-2 font-bold uppercase tracking-widest ${currentStep >= step ? 'text-[#234745]' : 'text-gray-300'}`}>
                  {step === 1 && (isEn ? 'Shape' : 'الشكل')}
                  {step === 2 && (isEn ? 'Flavor' : 'النكهة')}
                  {step === 3 && (isEn ? 'Color' : 'اللون')}
                  {step === 4 && (isEn ? 'Toppings' : 'الإضافات')}
                  {step === 5 && (isEn ? 'Customize' : 'تخصيص')}
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
                  <div className="w-8 h-8 rounded-full bg-[#234745]/10 flex items-center justify-center animate-pulse">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#234745" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  </div>
                  <h3 className="text-xl font-bold text-[#234745]">{isEn ? 'Live Preview' : 'عرض مباشر'}</h3>
               </div>
               
               <div className="h-[460px] bg-gradient-to-b from-[#F8F9FA] to-white rounded-[32px] flex flex-col items-center justify-center border border-gray-50 p-6 text-center relative overflow-hidden group">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)] from-[#234745]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                  
                  <div className="w-full h-full relative z-10 flex flex-col items-center justify-center">
                     <CakePreview 
                       shape={selectedShape.id}
                       layers={layers}
                       color={selectedColor.hex}
                       secondaryColor={selectedColor.hex}
                       message={cakeMessage}
                     />
                  </div>
                  
                  <div className="absolute bottom-10 z-10 bg-white/60 backdrop-blur-md px-6 py-2 rounded-full border border-white shadow-sm flex items-center gap-2">
                    <p className="text-[#234745] font-bold text-sm">
                      {isEn ? selectedFlavor.nameEn : selectedFlavor.nameAr} • {layers} {isEn ? 'Layers' : 'طبقات'}
                    </p>
                    {selectedTopping.id !== 'none' && (
                       <span className="bg-[#234745] text-white text-[10px] px-2 py-1 rounded-full whitespace-nowrap">
                         + {isEn ? selectedTopping.nameEn : selectedTopping.nameAr}
                       </span>
                    )}
                  </div>
               </div>
            </div>
          </div>

          {/* Right Column: Selection & Price (7 Cols) */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Active Selection Card */}
            <div className="bg-white rounded-[40px] p-8 lg:p-10 shadow-[0_15px_35px_rgba(0,0,0,0.03)] border border-gray-50 min-h-[500px] flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#234745]/5 rounded-bl-[100px] -mr-10 -mt-10"></div>
              
              <div className="flex-1 relative z-10">
                <div key={currentStep} className="animate-step-enter">
                  {currentStep === 1 && (
                    <ShapeSizeSelector 
                      isEn={isEn} 
                      selectedShape={selectedShape}
                      onShapeChange={setSelectedShape}
                      selectedSize={selectedSize}
                      onSizeChange={setSelectedSize}
                    />
                  )}
                  {currentStep === 2 && (
                    <FlavorLayerSelector 
                      isEn={isEn} 
                      selectedFlavor={selectedFlavor as any}
                      onFlavorChange={setSelectedFlavor as any}
                      layers={layers}
                      onLayersChange={setLayers}
                    />
                  )}
                  {currentStep === 3 && (
                    <ColorSelector 
                      isEn={isEn}
                      colors={dynamicColors}
                      selectedColor={selectedColor}
                      onColorChange={setSelectedColor}
                    />
                  )}
                  {currentStep === 4 && (
                    <ToppingsSelector 
                      isEn={isEn}
                      toppings={dynamicToppings}
                      selectedTopping={selectedTopping}
                      onToppingChange={setSelectedTopping}
                    />
                  )}
                  {currentStep > 4 && (
                    <div className="flex flex-col animate-step-enter" dir={isEn ? 'ltr' : 'rtl'}>
                      <div className="mb-8">
                        <h2 className="text-2xl font-bold text-[#234745] mb-2">
                          {isEn ? 'Personalize Your Cake' : 'أضف لمستك الشخصية'}
                        </h2>
                        <p className="text-gray-400 text-sm">
                          {isEn ? 'Write a custom message to be written on top of the cake with frosting.' : 'اكتب رسالة مخصصة لتُكتب على سطح الكيكة بالكريمة.'}
                        </p>
                      </div>

                      <div className="bg-[#F8F9FA] rounded-2xl p-6 border border-gray-100 mb-8">
                        <label className="block text-sm font-bold text-[#234745] mb-3">
                          {isEn ? 'Cake Message (Optional)' : 'رسالة الكيكة (اختياري)'}
                        </label>
                        <input 
                          type="text" 
                          value={cakeMessage}
                          onChange={(e) => setCakeMessage(e.target.value)}
                          placeholder={isEn ? "e.g., Happy Birthday Sara!" : "مثال: عيد ميلاد سعيد!"}
                          maxLength={30}
                          className="w-full px-4 py-4 rounded-xl border border-gray-200 focus:border-[#234745] focus:ring-1 focus:ring-[#234745] transition-all bg-white outline-none"
                        />
                        <p className="text-xs text-gray-400 mt-2 text-end">
                          {cakeMessage.length}/30
                        </p>
                      </div>
                      
                      <div className="flex justify-center mt-4 p-6 bg-[#234745]/5 rounded-xl border border-[#234745]/10 border-dashed">
                        {/* We will build the actual Add to Cart button here in Story 3.1.5 */}
                        <div className="text-sm text-[#d4a06a] font-bold flex items-center gap-2">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                          {isEn ? 'Ready for Add to Cart integration (Story 3.1.5)' : 'جاهز للربط مع السلة (القصة ٣.١.٥)'}
                        </div>
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
                   className={`p-4 rounded-2xl border-2 border-gray-50 text-[#234745] transition-all hover:bg-gray-50 ${currentStep === 1 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                 >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M15 18l-6-6 6-6"/></svg>
                 </button>
                 
                 <button 
                   onClick={() => setCurrentStep(Math.min(totalSteps, currentStep + 1))}
                   className="bg-[#234745] hover:bg-[#d4a06a] text-white font-bold py-4 px-12 rounded-[20px] shadow-xl hover:-translate-y-1 active:scale-95 transition-all flex items-center gap-3 group"
                 >
                   <span className="text-[16px]">{isEn ? 'Next Step' : 'الخطوة التالية'}</span>
                   <svg className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${isEn ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                 </button>
              </div>
            </div>

            {/* Price Breakdown Card */}
            <div className="bg-[#234745] rounded-[40px] p-1 shadow-2xl overflow-hidden group">
              <div className="bg-white rounded-[38px] p-8 lg:p-10 transition-all duration-500 group-hover:scale-[0.99]">
                <div className="flex items-center gap-2 mb-8">
                   <div className="w-8 h-8 rounded-lg bg-[#234745] flex items-center justify-center text-white">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/></svg>
                   </div>
                   <h3 className="text-xl font-bold text-[#234745]">{isEn ? 'Price Breakdown' : 'تفاصيل السعر'}</h3>
                </div>

                <div className="space-y-5">
                   {[
                     { label: isEn ? 'Base Cake' : 'سعر الكيكة الأساسي', val: basePrice },
                     ...(selectedShape.priceDelta > 0 ? [{ label: isEn ? `Shape (${selectedShape.nameEn})` : `الشكل (${selectedShape.nameAr})`, val: selectedShape.priceDelta }] : []),
                     ...(selectedSize.priceDelta > 0 ? [{ label: isEn ? `Size Up (${selectedSize.nameEn})` : `زيادة الحجم (${selectedSize.nameAr})`, val: selectedSize.priceDelta }] : []),
                     ...(layers > 1 ? [{ label: isEn ? `Extra Layers (${layers - 1})` : `طبقات إضافية (${layers - 1})`, val: (layers - 1) * 35 }] : []),
                     ...(selectedTopping.priceDelta > 0 ? [{ label: isEn ? `Topping (${selectedTopping.nameEn})` : `إضافة (${selectedTopping.nameAr})`, val: selectedTopping.priceDelta }] : [])
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
