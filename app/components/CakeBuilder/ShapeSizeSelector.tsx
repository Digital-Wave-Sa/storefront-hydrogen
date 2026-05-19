import React from 'react';

export interface CakeBase {
  id: string;
  nameEn: string;
  nameAr: string;
  servesEn: string;
  servesAr: string;
  specsEn: string;
  specsAr: string;
  price: number;
  isPopular?: boolean;
  shapeId: string; // for the 3D preview
}

export const CAKE_BASES: CakeBase[] = [
  { id: 'small_standard', nameEn: 'Small Standard', nameAr: 'ستاندرد صغير', servesEn: 'Good for 5-8 people', servesAr: 'يكفي ٥-٨ أشخاص', specsEn: '1 kg | 6x3', specsAr: '١ كيلو | ٦×٣', price: 190, isPopular: true, shapeId: 'round' },
  { id: 'mini_cake', nameEn: 'Mini Cake', nameAr: 'ميني كيك', servesEn: 'Good for 2-4 people', servesAr: 'يكفي ٢-٤ أشخاص', specsEn: '1/2 kg | 4x3', specsAr: 'نصف كيلو | ٤×٣', price: 100, shapeId: 'round' },
  { id: 'small_heart', nameEn: 'Small Heart', nameAr: 'قلب صغير', servesEn: 'Good for 5-8 people', servesAr: 'يكفي ٥-٨ أشخاص', specsEn: '1 kg | 6x3', specsAr: '١ كيلو | ٦×٣', price: 190, shapeId: 'heart' },
  { id: 'standard', nameEn: 'Standard', nameAr: 'ستاندرد', servesEn: 'Good for 14-18 people', servesAr: 'يكفي ١٤-١٨ شخص', specsEn: '1.8 kg | 6x5', specsAr: '١.٨ كيلو | ٦×٥', price: 270, shapeId: 'round' },
  { id: 'heart', nameEn: 'Heart', nameAr: 'قلب', servesEn: 'Good for 10-15 people', servesAr: 'يكفي ١٠-١٥ شخص', specsEn: '1.4 kg | 8x3', specsAr: '١.٤ كيلو | ٨×٣', price: 230, shapeId: 'heart' },
  { id: 'classic_round', nameEn: 'Classic Round', nameAr: 'دائري كلاسيكي', servesEn: 'Good for 12-16 people', servesAr: 'يكفي ١٢-١٦ شخص', specsEn: '1.6 kg | 8x3', specsAr: '١.٦ كيلو | ٨×٣', price: 250, isPopular: true, shapeId: 'round' },
  { id: 'classic_square', nameEn: 'Classic Square', nameAr: 'مربع كلاسيكي', servesEn: 'Good for 18-22 people', servesAr: 'يكفي ١٨-٢٢ شخص', specsEn: '2 kg | 8x8x3', specsAr: '٢ كيلو | ٨×٨×٣', price: 310, shapeId: 'square' },
  { id: 'sheet', nameEn: 'Sheet', nameAr: 'مستطيل كبير', servesEn: 'Good for 22-26 people', servesAr: 'يكفي ٢٢-٢٦ شخص', specsEn: '2.5 kg | 11x7x3', specsAr: '٢.٥ كيلو | ١١×٧×٣', price: 350, shapeId: 'rectangle' },
  { id: 'double_barrel', nameEn: 'Double Barrel', nameAr: 'دبل باريل', servesEn: 'Good for 45-55 people', servesAr: 'يكفي ٤٥-٥٥ شخص', specsEn: '5 kg | 8x6 6x6', specsAr: '٥ كيلو | ٨×٦ ٦×٦', price: 610, shapeId: 'round' },
  { id: 'mini_barrel', nameEn: 'Mini Barrel', nameAr: 'ميني باريل', servesEn: 'Good for 12-16 people', servesAr: 'يكفي ١٢-١٦ شخص', specsEn: '1.6 kg | 6x3 4x3', specsAr: '١.٦ كيلو | ٦×٣ ٤×٣', price: 260, shapeId: 'round' },
];

interface ShapeSizeSelectorProps {
  isEn: boolean;
  selectedBase: CakeBase;
  onBaseChange: (base: CakeBase) => void;
}

export function ShapeSizeSelector({ 
  isEn, 
  selectedBase, 
  onBaseChange 
}: ShapeSizeSelectorProps) {
  return (
    <div className="cake-builder-step animate-fade-in" dir={isEn ? 'ltr' : 'rtl'}>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[#234745] mb-2">
          {isEn ? 'Choose Base Cake' : 'اختر كيكة الأساس'}
        </h2>
        <p className="text-gray-400 text-sm">
          {isEn ? 'Select the perfect shape and size for your celebration' : 'اختر الشكل والحجم المثاليين لاحتفالك'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6 mb-10">
        {CAKE_BASES.map((base) => {
          const isSelected = selectedBase.id === base.id;
          return (
            <button
              key={base.id}
              onClick={() => onBaseChange(base)}
              className={`relative flex flex-col p-6 rounded-[24px] border-2 transition-all duration-300 text-start ${
                isSelected 
                  ? 'border-[#234745] bg-[#234745]/5 shadow-xl -translate-y-1' 
                  : 'border-gray-100 bg-white hover:border-gray-200 shadow-sm hover:shadow-md'
              }`}
            >
              {base.isPopular && (
                <div className="absolute top-0 right-4 -translate-y-1/2 bg-[#d4a06a] text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm">
                  {isEn ? '⭐ Popular' : '⭐ الأكثر طلباً'}
                </div>
              )}
              
              <div className="flex justify-between items-start w-full mb-3">
                <span className="font-black text-[#234745] text-lg">
                  {isEn ? base.nameEn : base.nameAr}
                </span>
                <span className="font-black text-[#234745] font-en whitespace-nowrap ml-2">
                  {base.price} SAR
                </span>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm font-bold text-gray-500">
                  {isEn ? base.servesEn : base.servesAr}
                </p>
                <p className="text-[11px] font-bold text-gray-400 font-en uppercase tracking-wider">
                  {isEn ? base.specsEn : base.specsAr}
                </p>
              </div>

              {isSelected && (
                <div className="absolute bottom-4 right-4 w-6 h-6 bg-[#234745] rounded-full flex items-center justify-center animate-scale-in">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
