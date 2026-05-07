import React from 'react';

export interface CakeColor {
  id: string;
  nameEn: string;
  nameAr: string;
  hex: string;
  isPremium?: boolean;
}

export const COLORS: CakeColor[] = [
  { id: 'white', nameEn: 'Classic White', nameAr: 'أبيض كلاسيكي', hex: '#FFFFFF' },
  { id: 'pink', nameEn: 'Pastel Pink', nameAr: 'وردي باستيل', hex: '#FFD1DC' },
  { id: 'blue', nameEn: 'Baby Blue', nameAr: 'أزرق فاتح', hex: '#B5D8F7' },
  { id: 'green', nameEn: 'Pistachio Green', nameAr: 'أخضر فستقي', hex: '#C1E1C1' },
  { id: 'lavender', nameEn: 'Lavender', nameAr: 'لافندر', hex: '#E6E6FA' },
  { id: 'yellow', nameEn: 'Buttercream Yellow', nameAr: 'أصفر زبدة', hex: '#FFFDD0' },
  { id: 'chocolate', nameEn: 'Rich Chocolate', nameAr: 'شوكولاتة غنية', hex: '#3D2B1F' },
  { id: 'red', nameEn: 'Velvet Red', nameAr: 'أحمر مخملي', hex: '#8B0000', isPremium: true },
  { id: 'gold', nameEn: 'Metallic Gold', nameAr: 'ذهبي معدني', hex: '#D4AF37', isPremium: true },
];

interface ColorSelectorProps {
  isEn: boolean;
  colors: CakeColor[];
  selectedColor: CakeColor;
  onColorChange: (color: CakeColor) => void;
}

export function ColorSelector({ isEn, colors, selectedColor, onColorChange }: ColorSelectorProps) {
  return (
    <div className="cake-builder-step animate-fade-in" dir={isEn ? 'ltr' : 'rtl'}>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[#234745] mb-2">
          {isEn ? 'Choose Frosting Color' : 'اختر لون الكريمة'}
        </h2>
        <p className="text-gray-400 text-sm">
          {isEn ? 'Select a base color for your cake\'s exterior' : 'اختر اللون الأساسي للجزء الخارجي من كيكتك'}
        </p>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 lg:gap-6">
        {colors.map((color, index) => {
          const isSelected = selectedColor.id === color.id;
          return (
            <button
              key={color.id}
              onClick={() => onColorChange(color)}
              className={`group flex flex-col items-center justify-center transition-all duration-300 animate-stagger-fade`}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div 
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full mb-3 relative flex items-center justify-center transition-all duration-300 ${
                  isSelected 
                    ? 'ring-4 ring-offset-4 ring-[#234745] scale-110 shadow-lg' 
                    : 'ring-1 ring-gray-200 hover:scale-105 hover:shadow-md'
                }`}
                style={{ backgroundColor: color.hex }}
              >
                {/* Glossy Overlay to make it look like frosting */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-black/10 to-white/40"></div>
                
                {color.isPremium && (
                  <div className="absolute -top-2 -right-2 bg-[#d4a06a] text-white text-[10px] p-1 rounded-full shadow-sm">
                    ✨
                  </div>
                )}

                {isSelected && (
                  <svg className="w-8 h-8 text-white drop-shadow-md relative z-10 animate-scale-in" fill="none" viewBox="0 0 24 24" stroke={color.hex === '#FFFFFF' ? '#234745' : 'currentColor'} strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              
              <span className={`text-sm font-bold text-center transition-colors ${isSelected ? 'text-[#234745]' : 'text-gray-500 group-hover:text-gray-800'}`}>
                {isEn ? color.nameEn : color.nameAr}
              </span>
            </button>
          );
        })}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scale-in {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-scale-in { animation: scale-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
      `}} />
    </div>
  );
}
