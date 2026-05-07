import React from 'react';

export interface Shape {
  id: string;
  nameEn: string;
  nameAr: string;
  priceDelta: number;
  icon: React.ReactNode;
}

export interface Size {
  id: string;
  nameEn: string;
  nameAr: string;
  servesEn: string;
  servesAr: string;
  priceDelta: number;
}

export const SHAPES: Shape[] = [
  {
    id: 'round',
    nameEn: 'Round',
    nameAr: 'دائري',
    priceDelta: 0,
    icon: (
      <div className="w-16 h-16 rounded-full border-[6px] border-[#FF4D8D] flex items-center justify-center shadow-inner">
        <div className="w-8 h-8 rounded-full bg-[#FF4D8D]/10" />
      </div>
    )
  },
  {
    id: 'square',
    nameEn: 'Square',
    nameAr: 'مربع',
    priceDelta: 0,
    icon: (
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#E0C3FC] to-[#8EC5FC] shadow-md border-2 border-white" />
    )
  },
  {
    id: 'heart',
    nameEn: 'Heart',
    nameAr: 'قلب',
    priceDelta: 20,
    icon: (
      <div className="relative">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="#FF4D6D" stroke="none">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
        <div className="absolute top-1 right-1">
           <svg width="12" height="12" viewBox="0 0 24 24" fill="#FFD700"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        </div>
      </div>
    )
  },
  {
    id: 'rectangle',
    nameEn: 'Rectangle',
    nameAr: 'مستطيل',
    priceDelta: 10,
    icon: (
      <div className="w-20 h-14 border-2 border-gray-800 rounded-sm flex items-center justify-center">
         <div className="w-full h-[1px] bg-gray-100" />
      </div>
    )
  }
];

export const SIZES: Size[] = [
  { id: 's', nameEn: 'Small', nameAr: 'صغير', servesEn: '4-6 People', servesAr: '٤-٦ أشخاص', priceDelta: 0 },
  { id: 'm', nameEn: 'Medium', nameAr: 'وسط', servesEn: '8-12 People', servesAr: '٨-١٢ شخص', priceDelta: 45 },
  { id: 'l', nameEn: 'Large', nameAr: 'كبير', servesEn: '15-20 People', servesAr: '١٥-٢٠ شخص', priceDelta: 90 },
  { id: 'xl', nameEn: 'Extra Large', nameAr: 'كبير جداً', servesEn: '25+ People', servesAr: '+٢٥ شخص', priceDelta: 160 },
];

interface ShapeSizeSelectorProps {
  isEn: boolean;
  selectedShape: Shape;
  onShapeChange: (shape: Shape) => void;
  selectedSize: Size;
  onSizeChange: (size: Size) => void;
}

export function ShapeSizeSelector({ 
  isEn, 
  selectedShape, 
  onShapeChange, 
  selectedSize, 
  onSizeChange 
}: ShapeSizeSelectorProps) {
  return (
    <div className="cake-builder-step animate-fade-in" dir={isEn ? 'ltr' : 'rtl'}>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[#234745] mb-2">
          {isEn ? 'Select Cake Shape' : 'اختر شكل الكيكة'}
        </h2>
        <p className="text-gray-400 text-sm">
          {isEn ? 'Choose the perfect shape for your celebration' : 'اختر الشكل المثالي لاحتفالك'}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-10">
        {SHAPES.map((shape) => (
          <button
            key={shape.id}
            onClick={() => onShapeChange(shape)}
            className={`flex flex-col items-center justify-center p-8 rounded-[24px] border-2 transition-all duration-300 ${
              selectedShape.id === shape.id 
                ? 'border-[#234745] bg-white shadow-xl -translate-y-1' 
                : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200'
            }`}
          >
            <div className="mb-4 h-20 flex items-center justify-center">{shape.icon}</div>
            <span className="font-bold text-[#1a1a1a] mb-1">
              {isEn ? shape.nameEn : shape.nameAr}
            </span>
            <span className="text-xs text-gray-400 font-bold">
               +{shape.priceDelta} SAR
            </span>
          </button>
        ))}
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-bold text-[#234745] mb-4">
          {isEn ? 'Choose Size' : 'اختر الحجم'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SIZES.map((size) => (
            <button
              key={size.id}
              onClick={() => onSizeChange(size)}
              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-start ${
                selectedSize.id === size.id 
                  ? 'border-[#234745] bg-[#234745]/5 shadow-sm' 
                  : 'border-gray-50 bg-white hover:border-gray-100'
              }`}
            >
              <span className="font-bold text-[#1a1a1a]">{isEn ? size.nameEn : size.nameAr}</span>
              <span className="text-[11px] text-gray-400">{isEn ? size.servesEn : size.servesAr}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
