import React, { useState } from 'react';

export interface Topping {
  id: string;
  categoryId: string;
  nameEn: string;
  nameAr: string;
  priceDelta: number;
  thumbnailUrl: string;
  isPopular?: boolean;
}

const CATEGORIES = [
  { id: 'all', nameEn: 'All Toppings', nameAr: 'كل الإضافات' },
  { id: 'classic', nameEn: 'Classic', nameAr: 'كلاسيكي' },
  { id: 'fruits', nameEn: 'Fresh Fruits', nameAr: 'فواكه طازجة' },
  { id: 'chocolate', nameEn: 'Chocolate', nameAr: 'شوكولاتة' },
  { id: 'luxury', nameEn: 'Luxury', nameAr: 'فاخر' },
];

export const TOPPINGS: Topping[] = [
  {
    id: 'none',
    categoryId: 'all',
    nameEn: 'Without Topping',
    nameAr: 'بدون إضافات',
    priceDelta: 0,
    thumbnailUrl: 'https://cdn-icons-png.flaticon.com/512/1828/1828843.png'
  },
  {
    id: 'pistachio-crumb',
    categoryId: 'classic',
    nameEn: 'Pistachio Crumb',
    nameAr: 'فستق مطحون',
    priceDelta: 25,
    thumbnailUrl: 'https://cdn-icons-png.flaticon.com/512/2821/2821808.png',
    isPopular: true
  },
  {
    id: 'strawberries',
    categoryId: 'fruits',
    nameEn: 'Fresh Strawberries',
    nameAr: 'فراولة طازجة',
    priceDelta: 35,
    thumbnailUrl: 'https://cdn-icons-png.flaticon.com/512/590/590685.png'
  },
  {
    id: 'belgian-drip',
    categoryId: 'chocolate',
    nameEn: 'Belgian Choco Drip',
    nameAr: 'قطرات الشوكولاتة البلجيكية',
    priceDelta: 30,
    thumbnailUrl: 'https://cdn-icons-png.flaticon.com/512/2224/2224213.png',
    isPopular: true
  },
  {
    id: 'gold-flakes',
    categoryId: 'luxury',
    nameEn: '24k Gold Flakes',
    nameAr: 'رقائق ذهب عيار 24',
    priceDelta: 85,
    thumbnailUrl: 'https://cdn-icons-png.flaticon.com/512/3061/3061556.png'
  },
  {
    id: 'white-pearls',
    categoryId: 'classic',
    nameEn: 'White Sugar Pearls',
    nameAr: 'لآلئ السكر البيضاء',
    priceDelta: 15,
    thumbnailUrl: 'https://cdn-icons-png.flaticon.com/512/263/263155.png'
  }
];

interface ToppingsSelectorProps {
  isEn: boolean;
  toppings: Topping[];
  selectedTopping: Topping;
  onToppingChange: (topping: Topping) => void;
}

export function ToppingsSelector({ isEn, toppings, selectedTopping, onToppingChange }: ToppingsSelectorProps) {
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredToppings = activeCategory === 'all' 
    ? toppings 
    : toppings.filter(t => t.categoryId === activeCategory || t.id === 'none');

  return (
    <div className="cake-builder-step animate-fade-in" dir={isEn ? 'ltr' : 'rtl'}>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-[#234745] mb-2">
          {isEn ? 'Select Decorations & Toppings' : 'اختر الزينة والإضافات'}
        </h2>
        <p className="text-gray-400 text-sm">
          {isEn ? 'Add the perfect finishing touch to your cake' : 'أضف اللمسة النهائية المثالية لكيكتك'}
        </p>
      </div>

      {/* Categories Scrollable Pills */}
      <div className="flex overflow-x-auto hide-scrollbar gap-3 mb-8 pb-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${
              activeCategory === cat.id
                ? 'bg-[#234745] text-white shadow-md'
                : 'bg-white border border-gray-100 text-gray-500 hover:bg-gray-50 hover:text-[#234745]'
            }`}
          >
            {isEn ? cat.nameEn : cat.nameAr}
          </button>
        ))}
      </div>

      {/* Toppings Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 lg:gap-5 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {filteredToppings.map((topping, index) => {
          const isSelected = selectedTopping.id === topping.id;
          return (
            <button
              key={topping.id}
              onClick={() => onToppingChange(topping)}
              className={`relative flex flex-col items-center justify-center p-5 rounded-[24px] border-2 transition-all duration-500 animate-stagger-fade ${
                isSelected 
                  ? 'border-[#234745] bg-[#234745]/5 shadow-[0_10px_20px_rgba(35,71,69,0.08)] -translate-y-1' 
                  : 'border-transparent bg-white hover:border-gray-100 shadow-[0_4px_15px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.04)]'
              }`}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {topping.isPopular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#d4a06a] text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm whitespace-nowrap">
                  {isEn ? '⭐ Best Seller' : '⭐ الأكثر مبيعاً'}
                </div>
              )}
              
              <div className={`w-16 h-16 mb-4 flex items-center justify-center transition-transform duration-500 ${isSelected ? 'scale-110' : ''}`}>
                <img 
                  src={topping.thumbnailUrl} 
                  alt={isEn ? topping.nameEn : topping.nameAr}
                  className={`w-full h-full object-contain ${topping.id === 'none' ? 'opacity-20 grayscale' : ''}`}
                />
              </div>
              
              <span className="font-bold text-[#1a1a1a] text-center text-sm mb-1 leading-tight h-10 flex items-center justify-center">
                {isEn ? topping.nameEn : topping.nameAr}
              </span>
              
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${isSelected ? 'bg-[#234745] text-white' : 'bg-gray-50 text-[#234745]'}`}>
                 {topping.priceDelta === 0 ? (isEn ? 'Free' : 'مجاني') : `+${topping.priceDelta} SAR`}
              </span>

              {isSelected && (
                <div className="absolute top-3 right-3 w-5 h-5 bg-[#234745] rounded-full flex items-center justify-center animate-scale-in">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f8f9fa; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e9ecef; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #dee2e6; }
        
        @keyframes scale-in {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-scale-in { animation: scale-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
      `}} />
    </div>
  );
}
