import React, { useState } from 'react';

interface Flavor {
  id: string;
  nameEn: string;
  nameAr: string;
  color: string;
  secondaryColor: string;
  descriptionEn: string;
  descriptionAr: string;
}

const FLAVORS: Flavor[] = [
  {
    id: 'chocolate',
    nameEn: 'Belgian Chocolate',
    nameAr: 'شوكولاتة بلجيكية',
    color: '#3d2b1f',
    secondaryColor: '#2a1d15',
    descriptionEn: 'Rich, moist dark chocolate sponge',
    descriptionAr: 'كيكة الشوكولاتة الداكنة الغنية والطرية',
  },
  {
    id: 'vanilla',
    nameEn: 'Madagascar Vanilla',
    nameAr: 'فانيليا مدغشقر',
    color: '#fdf5e6',
    secondaryColor: '#f5deb3',
    descriptionEn: 'Light and airy with real vanilla beans',
    descriptionAr: 'خفيفة وهشة مع حبيبات الفانيليا الطبيعية',
  },
  {
    id: 'red-velvet',
    nameEn: 'Classic Red Velvet',
    nameAr: 'ريد فيلفيت كلاسيك',
    color: '#a52a2a',
    secondaryColor: '#800000',
    descriptionEn: 'Velvety texture with a hint of cocoa',
    descriptionAr: 'قوام مخملي مع لمسة من الكاكاو',
  },
  {
    id: 'pistachio',
    nameEn: 'Roasted Pistachio',
    nameAr: 'فستق محمص',
    color: '#93c572',
    secondaryColor: '#76a05d',
    descriptionEn: 'Nutty and aromatic premium pistachio',
    descriptionAr: 'نكهة الفستق المميزة والرائعة',
  },
];

export function FlavorLayerSelector({ 
  isEn, 
  selectedFlavor, 
  onFlavorChange, 
  layers, 
  onLayersChange 
}: { 
  isEn: boolean;
  selectedFlavor: Flavor;
  onFlavorChange: (flavor: Flavor) => void;
  layers: number;
  onLayersChange: (layers: number) => void;
}) {
  return (
    <div className="cake-builder-step animate-fade-in" dir={isEn ? 'ltr' : 'rtl'}>
      {/* Step Header */}
      <div className="mb-10 text-center lg:text-start">
        <span className="text-[#E75D5D] font-bold text-sm tracking-widest uppercase mb-2 block">
          {isEn ? 'Step 03' : 'الخطوة ٠٣'}
        </span>
        <h2 className="text-3xl lg:text-4xl font-black text-[#1a1a1a]">
          {isEn ? 'Flavor & Layers' : 'النكهة والطبقات'}
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        
        {/* Flavor Selection */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-[#1a1a1a] flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-[#234745] text-white flex items-center justify-center text-sm">1</span>
            {isEn ? 'Select Your Flavor' : 'اختر النكهة'}
          </h3>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-4">
            {FLAVORS.map((flavor) => (
              <button
                key={flavor.id}
                onClick={() => onFlavorChange(flavor)}
                className={`group relative p-4 rounded-2xl border-2 transition-all duration-300 text-start flex items-center gap-4 ${
                  selectedFlavor.id === flavor.id 
                    ? 'border-[#234745] bg-[#234745]/5 shadow-lg' 
                    : 'border-transparent bg-white hover:border-gray-200 shadow-sm'
                }`}
              >
                <div 
                  className="w-12 h-12 rounded-full shadow-inner flex-shrink-0 relative overflow-hidden"
                  style={{ 
                    background: `radial-gradient(circle at 30% 30%, ${flavor.color}, ${flavor.secondaryColor})` 
                  }}
                >
                  {/* Subtle Texture Overlay */}
                  <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/pinstriped-suit.png')]"></div>
                </div>
                <div>
                  <h4 className="font-bold text-[#1a1a1a] text-sm lg:text-base leading-tight">
                    {isEn ? flavor.nameEn : flavor.nameAr}
                  </h4>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                    {isEn ? flavor.descriptionEn : flavor.descriptionAr}
                  </p>
                </div>
                {selectedFlavor.id === flavor.id && (
                  <div className="absolute top-2 right-2 w-4 h-4 bg-[#234745] rounded-full flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Layers Selection */}
        <div className="space-y-8">
          <h3 className="text-xl font-bold text-[#1a1a1a] flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-[#234745] text-white flex items-center justify-center text-sm">2</span>
            {isEn ? 'Choose Number of Layers' : 'اختر عدد الطبقات'}
          </h3>

          <div className="bg-white p-8 rounded-[32px] shadow-xl border border-gray-100 flex flex-col items-center">
            
            {/* Visual Layer Preview */}
            <div className="relative h-64 w-48 flex flex-col-reverse items-center justify-start gap-1 mb-8">
              {[...Array(layers)].map((_, i) => (
                <div 
                  key={i}
                  className="w-full h-12 rounded-lg shadow-md transition-all duration-500 transform animate-slide-up"
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
              <div className="absolute -bottom-4 w-32 h-4 bg-black/10 rounded-[100%] blur-md"></div>
            </div>

            {/* Stepper Control */}
            <div className="flex items-center gap-8">
              <button 
                onClick={() => onLayersChange(Math.max(1, layers - 1))}
                className="w-12 h-12 rounded-full border-2 border-gray-200 flex items-center justify-center text-2xl text-gray-400 hover:border-[#234745] hover:text-[#234745] transition-colors"
              >
                −
              </button>
              <div className="text-center">
                <span className="text-4xl font-black text-[#234745] block leading-none">{layers}</span>
                <span className="text-xs text-gray-400 uppercase font-bold tracking-tighter mt-1 block">
                  {isEn ? 'Layers' : 'طبقات'}
                </span>
              </div>
              <button 
                onClick={() => onLayersChange(Math.min(5, layers + 1))}
                className="w-12 h-12 rounded-full border-2 border-gray-200 flex items-center justify-center text-2xl text-gray-400 hover:border-[#234745] hover:text-[#234745] transition-colors"
              >
                +
              </button>
            </div>

            <p className="mt-6 text-sm text-gray-400 font-medium italic text-center">
              {isEn 
                ? `Total height: approx. ${layers * 5}cm` 
                : `الارتفاع الكلي: حوالي ${layers * 5}سم`}
            </p>
          </div>
        </div>

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
