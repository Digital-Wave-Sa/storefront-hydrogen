import React, { useState } from 'react';

export interface Flavor {
  id: string;
  nameEn: string;
  nameAr: string;
  color: string;
  secondaryColor: string;
  descriptionEn: string;
  descriptionAr: string;
  image: string;
  isPopular?: boolean;
}

export const FLAVORS: Flavor[] = [
  {
    id: 'vanilla',
    nameEn: 'Vanilla',
    nameAr: 'فانيليا',
    color: '#fdf5e6',
    secondaryColor: '#f5deb3',
    descriptionEn: 'Light and airy with real vanilla beans',
    descriptionAr: 'خفيفة وهشة مع حبيبات الفانيليا الطبيعية',
    image: '/images/vanilla-img.png'
  },
  {
    id: 'choco-crunch',
    nameEn: 'Choco Crunch',
    nameAr: 'تشوكو كرنش',
    color: '#3d2b1f',
    secondaryColor: '#2a1d15',
    descriptionEn: 'Rich chocolate with a satisfying crunch',
    descriptionAr: 'شوكولاتة غنية مع قرمشة لذيذة',
    image: '/images/chocolate-img.png',
    isPopular: true
  },
  {
    id: 'red-velvet',
    nameEn: 'Red Velvet',
    nameAr: 'ريد فيلفيت',
    color: '#a52a2a',
    secondaryColor: '#800000',
    descriptionEn: 'Velvety texture with a hint of cocoa',
    descriptionAr: 'قوام مخملي مع لمسة من الكاكاو',
    image: '/images/velvet-img.png'
  },
  {
    id: 'nutella',
    nameEn: 'Nutella',
    nameAr: 'نوتيلا',
    color: '#4B3621',
    secondaryColor: '#302214',
    descriptionEn: 'Classic hazelnut chocolate spread flavor',
    descriptionAr: 'نكهة شوكولاتة البندق الكلاسيكية',
    image: '/images/chocolate-img.png'
  },
  {
    id: 'fruits',
    nameEn: 'Fruits',
    nameAr: 'فواكه',
    color: '#FFDAB9',
    secondaryColor: '#FFA07A',
    descriptionEn: 'Refreshing mix of seasonal fruits',
    descriptionAr: 'مزيج منعش من الفواكه الموسمية',
    image: '/images/vanilla-img.png'
  },
  {
    id: 'cinnamon',
    nameEn: 'Cinnamon',
    nameAr: 'قرفة',
    color: '#D2691E',
    secondaryColor: '#8B4513',
    descriptionEn: 'Warm and spicy cinnamon swirl',
    descriptionAr: 'مزيج دافئ ومميز من القرفة',
    image: '/images/caramel-img.png'
  },
  {
    id: 'pistachio',
    nameEn: 'Pistachio',
    nameAr: 'فستق',
    color: '#93C572',
    secondaryColor: '#556B2F',
    descriptionEn: 'Rich and nutty pistachio blend',
    descriptionAr: 'مزيج غني من الفستق الحلبي',
    image: '/images/vanilla-img.png',
    isPopular: true
  },
];

export interface FlavorLayerSelectorProps {
  isEn: boolean;
  selectedFlavor: Flavor;
  onFlavorChange: (flavor: Flavor) => void;
  layers: number;
  onLayersChange: (layers: number) => void;
  availableFlavors: Flavor[];
  onlyFlavor?: boolean;
  onlyLayers?: boolean;
}

export function FlavorLayerSelector({ 
  isEn, 
  selectedFlavor, 
  onFlavorChange, 
  layers, 
  onLayersChange,
  availableFlavors,
  onlyFlavor,
  onlyLayers
}: FlavorLayerSelectorProps) {
  return (
    <div className="cake-builder-step animate-fade-in" dir={isEn ? 'ltr' : 'rtl'}>
      {/* Step Header */}
      <div className="mb-10">
        <h2 className="text-3xl lg:text-4xl font-black text-[#234745]">
          {onlyFlavor && (isEn ? 'Select Flavor' : 'اختر النكهة')}
          {onlyLayers && (isEn ? 'Cake Layers' : 'طبقات الكيك')}
          {!onlyFlavor && !onlyLayers && (isEn ? 'Flavor & Layers' : 'النكهة والطبقات')}
        </h2>
        <p className="text-gray-400 font-medium mt-2">
          {onlyFlavor && (isEn ? 'Pick the delicious base for your masterpiece' : 'اختر القاعدة اللذيذة لتحفتك الفنية')}
          {onlyLayers && (isEn ? 'Choose the perfect height for your celebration' : 'اختر الارتفاع المثالي لاحتفالك')}
        </p>
      </div>

      <div className={`grid grid-cols-1 ${(!onlyFlavor && !onlyLayers) ? 'lg:grid-cols-2' : ''} gap-12 items-start`}>
        
        {/* Flavor Selection */}
        {(onlyFlavor || (!onlyFlavor && !onlyLayers)) && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {availableFlavors.map((flavor) => (
                <button
                  key={flavor.id}
                  onClick={() => onFlavorChange(flavor)}
                  className={`group relative p-6 rounded-[24px] border-2 transition-all duration-300 text-start flex items-center gap-4 ${
                    selectedFlavor.id === flavor.id 
                      ? 'border-[#234745] bg-[#234745]/5 shadow-lg' 
                      : 'border-gray-50 bg-white hover:border-gray-100 shadow-sm'
                  }`}
                >
                  {flavor.isPopular && (
                    <div className="absolute top-0 right-4 -translate-y-1/2 bg-[#d4a06a] text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm z-10">
                      {isEn ? '⭐ Popular' : '⭐ الأكثر طلباً'}
                    </div>
                  )}
                  <div className="w-14 h-14 rounded-full flex-shrink-0 relative overflow-hidden bg-gray-50 flex items-center justify-center p-1">
                    <img src={flavor.image} alt={flavor.nameEn} className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h4 className="font-black text-[#234745] text-lg leading-tight">
                      {isEn ? flavor.nameEn : flavor.nameAr}
                    </h4>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2 font-medium">
                      {isEn ? flavor.descriptionEn : flavor.descriptionAr}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Layers Selection */}
        {(onlyLayers || (!onlyFlavor && !onlyLayers)) && (
          <div className="space-y-8">
            <div className="bg-white p-10 rounded-[40px] shadow-[0_10px_40px_rgba(35,71,69,0.03)] border border-gray-50 flex flex-col items-center max-w-md mx-auto w-full">
              
              {/* Visual Layer Preview */}
              <div className="relative h-64 w-48 flex flex-col-reverse items-center justify-start gap-1 mb-10">
                {[...Array(layers)].map((_, i) => (
                  <div 
                    key={i}
                    className="w-full h-12 rounded-xl shadow-md transition-all duration-500 transform animate-slide-up"
                    style={{ 
                      backgroundColor: selectedFlavor.color,
                      opacity: 1 - (i * 0.1),
                      transform: `translateY(${i * -2}px) scale(${1 - (i * 0.02)})`,
                      border: `1px solid ${selectedFlavor.secondaryColor}`,
                    }}
                  >
                    {/* Cream/Filling layer */}
                    {i < layers - 1 && (
                      <div className="absolute -top-1 left-2 right-2 h-1 bg-white/40 rounded-full blur-[1px]"></div>
                    )}
                  </div>
                ))}
                
                {/* Bottom Base Shadow */}
                <div className="absolute -bottom-6 w-40 h-6 bg-black/10 rounded-[100%] blur-xl"></div>
              </div>

              {/* Stepper Control */}
              <div className="flex items-center gap-10">
                <button 
                  onClick={() => onLayersChange(Math.max(1, layers - 1))}
                  className="w-14 h-14 rounded-2xl border-2 border-gray-50 flex items-center justify-center text-3xl text-gray-300 hover:border-[#234745] hover:text-[#234745] transition-all bg-white shadow-sm active:scale-95"
                >
                  −
                </button>
                <div className="text-center min-w-[80px]">
                  <span className="text-5xl font-black text-[#234745] block leading-none">{layers}</span>
                  <span className="text-xs text-gray-400 uppercase font-black tracking-widest mt-2 block">
                    {isEn ? 'Layers' : 'طبقات'}
                  </span>
                </div>
                <button 
                  onClick={() => onLayersChange(Math.min(5, layers + 1))}
                  className="w-14 h-14 rounded-2xl border-2 border-gray-50 flex items-center justify-center text-3xl text-gray-300 hover:border-[#234745] hover:text-[#234745] transition-all bg-white shadow-sm active:scale-95"
                >
                  +
                </button>
              </div>

              <p className="mt-8 text-sm text-[#d4a06a] font-black uppercase tracking-widest text-center">
                {isEn 
                  ? `Approx. ${layers * 5}cm Height` 
                  : `ارتفاع حوالي ${layers * 5}سم`}
              </p>
            </div>
          </div>
        )}

      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />
    </div>
  );
}
