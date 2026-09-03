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
  image?: string;
}

export const CAKE_BASES: CakeBase[] = [
  { id: 'small_standard', nameEn: 'Small Standard', nameAr: 'ستاندرد صغير', servesEn: 'Good for 5-8 people', servesAr: 'يكفي 5-8 أشخاص', specsEn: '1 kg | 6x3', specsAr: '1 كيلو | 6×3', price: 190, isPopular: true, shapeId: 'round', image: 'https://file.lola.do/content/cakes/shapes/mini_standard/element.png?p=web&v=1.3.15&i=f0d079d0-b63a-4655-9e32-7a97bcf575ad&s=58043742d753b592230c67d228a8aeaaa655dca764d176000d25d8de5879b8be' },
  { id: 'mini_cake', nameEn: 'Mini Cake', nameAr: 'ميني كيك', servesEn: 'Good for 2-4 people', servesAr: 'يكفي 2-4 أشخاص', specsEn: '1/2 kg | 4x3', specsAr: 'نصف كيلو | 4×3', price: 100, shapeId: 'round', image: 'https://file.lola.do/content/cakes/shapes/mini_cake/element.png?p=web&v=1.3.15&i=f0d079d0-b63a-4655-9e32-7a97bcf575ad&s=01889cf441aaec422a93864ad3b9c775d0a1a3620975982ce7fe61c1890b2f69' },
  { id: 'small_heart', nameEn: 'Small Heart', nameAr: 'قلب صغير', servesEn: 'Good for 5-8 people', servesAr: 'يكفي 5-8 أشخاص', specsEn: '1 kg | 6x3', specsAr: '1 كيلو | 6×3', price: 190, shapeId: 'heart', image: 'https://file.lola.do/content/cakes/shapes/mini_heart/element.png?p=web&v=1.3.15&i=f0d079d0-b63a-4655-9e32-7a97bcf575ad&s=6924e8ab18c9f31ba3faa71056a1a7f08086ff2fb68c7c8724ba0c4061c7e69d' },
  { id: 'standard', nameEn: 'Standard', nameAr: 'ستاندرد', servesEn: 'Good for 14-18 people', servesAr: 'يكفي 14-18 شخص', specsEn: '1.8 kg | 6x5', specsAr: '1.8 كيلو | 6×5', price: 270, shapeId: 'round', image: 'https://file.lola.do/content/cakes/shapes/standard/element.png?p=web&v=1.3.15&i=f0d079d0-b63a-4655-9e32-7a97bcf575ad&s=6523e413f82613e2cdfda7de55f87c4a9697ddedd2d075aeb4871a8320c169e0' },
  { id: 'heart', nameEn: 'Heart', nameAr: 'قلب', servesEn: 'Good for 10-15 people', servesAr: 'يكفي 10-15 شخص', specsEn: '1.4 kg | 8x3', specsAr: '1.4 كيلو | 8×3', price: 230, shapeId: 'heart', image: 'https://file.lola.do/content/cakes/shapes/heart/element.png?p=web&v=1.3.15&i=f0d079d0-b63a-4655-9e32-7a97bcf575ad&s=b259ba5c5f16146291ac3b12778a5071b950e00dc16bd2d33e95d14ee21427bf' },
  { id: 'classic_round', nameEn: 'Classic Round', nameAr: 'دائري كلاسيكي', servesEn: 'Good for 12-16 people', servesAr: 'يكفي 12-16 شخص', specsEn: '1.6 kg | 8x3', specsAr: '1.6 كيلو | 8×3', price: 250, isPopular: true, shapeId: 'round', image: 'https://file.lola.do/content/cakes/shapes/classic_round/element.png?p=web&v=1.3.15&i=f0d079d0-b63a-4655-9e32-7a97bcf575ad&s=aa9b3817babc5ddddb5e2f4df8a302f37dfc0cdb0be3e48c6830109471502d2b' },
  { id: 'classic_square', nameEn: 'Classic Square', nameAr: 'مربع كلاسيكي', servesEn: 'Good for 18-22 people', servesAr: 'يكفي 18-22 شخص', specsEn: '2 kg | 8x8x3', specsAr: '2 كيلو | 8×8×3', price: 310, shapeId: 'square', image: 'https://file.lola.do/content/cakes/shapes/classic_square/element.png?p=web&v=1.3.15&i=f0d079d0-b63a-4655-9e32-7a97bcf575ad&s=2ac75dc97350e0dde60936348d554bd3568144e96a132d44cbf247cac2d97fc9' },
  { id: 'sheet', nameEn: 'Sheet', nameAr: 'مستطيل كبير', servesEn: 'Good for 22-26 people', servesAr: 'يكفي 22-26 شخص', specsEn: '2.5 kg | 11x7x3', specsAr: '2.5 كيلو | 11×7×3', price: 350, shapeId: 'rectangle', image: 'https://file.lola.do/content/cakes/shapes/sheet/element.png?p=web&v=1.3.15&i=f0d079d0-b63a-4655-9e32-7a97bcf575ad&s=3b7302271b6de946ac722cc096b113bf41cbcd47cec7dd62c2c1ad4c3d70118c' },
  { id: 'double_barrel', nameEn: 'Double Barrel', nameAr: 'دبل باريل', servesEn: 'Good for 45-55 people', servesAr: 'يكفي 45-55 شخص', specsEn: '5 kg | 8x6 6x6', specsAr: '5 كيلو | 8×6 6×6', price: 610, shapeId: 'round', image: 'https://file.lola.do/content/cakes/shapes/double_barrel/element.png?p=web&v=1.3.15&i=f0d079d0-b63a-4655-9e32-7a97bcf575ad&s=efc5aef517c8245da3984cbdeb9b8dbd6a28b6956ab8c5625f1beaaa4a74aade' },
  { id: 'mini_barrel', nameEn: 'Mini Barrel', nameAr: 'ميني باريل', servesEn: 'Good for 12-16 people', servesAr: 'يكفي 12-16 شخص', specsEn: '1.6 kg | 6x3 4x3', specsAr: '1.6 كيلو | 6×3 4×3', price: 260, shapeId: 'round', image: 'https://file.lola.do/content/cakes/shapes/mini_barrel/element.png?p=web&v=1.3.15&i=f0d079d0-b63a-4655-9e32-7a97bcf575ad&s=0542f7cecf02ddec84906f22e149390cc2ee0fd7a36cd0566e718e91785458e0' },
];

interface ShapeSizeSelectorProps {
  isEn: boolean;
  selectedBase: CakeBase;
  onBaseChange: (base: CakeBase) => void;
  availableBases: CakeBase[];
}

export function ShapeSizeSelector({ 
  isEn, 
  selectedBase, 
  onBaseChange,
  availableBases
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
        {availableBases.map((base) => {
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
