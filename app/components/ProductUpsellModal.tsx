import { X, ShoppingBag, Plus } from 'lucide-react';
import { AddToCartButton } from '~/components/AddToCartButton';

interface ProductUpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
  upsellProducts: Array<any>;
  isEn: boolean;
  onOpenCart: () => void;
}

export function ProductUpsellModal({
  isOpen,
  onClose,
  upsellProducts,
  isEn,
  onOpenCart,
}: ProductUpsellModalProps) {
  if (!isOpen || !upsellProducts || upsellProducts.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      {/* Click outside backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div 
        className={`relative z-10 bg-[#FFFDF8] rounded-[28px] border border-[#9FB7AE]/40 shadow-2xl max-w-lg w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto scrollbar-none ${isEn ? 'font-en' : "font-['GE_Dinar_One']"}`}
        dir={isEn ? 'ltr' : 'rtl'}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 left-4 rtl:left-auto rtl:right-4 w-9 h-9 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full flex items-center justify-center transition-all cursor-pointer z-20"
          aria-label={isEn ? 'Close' : 'إغلاق'}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Badge & Title */}
        <div className="flex flex-col items-center text-center mt-2 mb-6">
          <div className="w-14 h-14 bg-[#234745] text-white rounded-2xl flex items-center justify-center shadow-md mb-3">
            <ShoppingBag className="w-7 h-7 text-[#C5A96A]" />
          </div>
          <h3 className="text-[#234745] font-bold text-[20px] sm:text-[22px] leading-tight mb-1">
            {isEn ? 'Complete Your Gift!' : 'أكمل هديتك بلمسة مميزة!'}
          </h3>
          <p className="text-[#8C8275] text-[13px] sm:text-[14px] font-medium max-w-sm">
            {isEn
              ? 'Customers frequently add these complementary items:'
              : 'منتجات يفضل العملاء إضافتها لتكتمل الهدية:'}
          </p>
        </div>

        {/* Upsell Products Slider */}
        <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none gap-3 pb-4 pt-1 px-1 -mx-2 mb-4 scroll-smooth">
          {upsellProducts.map((prod: any) => {
            if (!prod || !prod.variants?.nodes?.[0]) return null;
            const variant = prod.variants.nodes[0];
            const imgUrl = prod.featuredImage?.url || variant?.image?.url || '/images/placeholder.webp';
            const title = prod.title;
            const price = parseFloat(variant.price?.amount || '0');
            const currency = variant.price?.currencyCode || 'SAR';

            return (
              <div 
                key={prod.id}
                className="w-[170px] sm:w-[190px] shrink-0 snap-start bg-white rounded-[20px] p-3.5 border border-[#9FB7AE]/30 flex flex-col justify-between items-center text-center shadow-sm hover:shadow-md transition-all hover:border-[#234745]/40 relative group"
              >
                <div className="w-full flex flex-col items-center">
                  <div className="w-20 h-20 rounded-xl overflow-hidden mb-2.5 bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                    <img 
                      src={imgUrl} 
                      alt={title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <h4 className="text-[#234745] font-bold text-[13px] sm:text-[14px] leading-tight line-clamp-2 mb-1 h-9 flex items-center justify-center">
                    {title}
                  </h4>
                  <div 
                    className="text-[#906B51] font-bold text-[14px] mb-3"
                    style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                  >
                    {price} {isEn ? currency : 'ر.س'}
                  </div>
                </div>

                <div className="w-full">
                  <AddToCartButton
                    lines={[
                      {
                        merchandiseId: variant.id,
                        quantity: 1,
                        selectedVariant: variant,
                      },
                    ]}
                    className="w-full py-2 bg-[#234745] hover:bg-[#1B3836] text-white text-[13px] font-bold rounded-full flex items-center justify-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isEn ? 'Add' : 'إضافة'}</span>
                  </AddToCartButton>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 border-t border-[#9FB7AE]/20">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenCart();
            }}
            className="w-full sm:flex-1 py-3.5 bg-[#C5A96A] hover:bg-[#b5995a] text-[#234745] font-bold text-[15px] rounded-full transition-all shadow-sm active:scale-98 cursor-pointer flex items-center justify-center gap-2"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>{isEn ? 'View Cart & Checkout' : 'الذهاب إلى السلة والإتمام'}</span>
          </button>
          
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-[#234745] font-bold text-[14px] rounded-full transition-all active:scale-98 cursor-pointer"
          >
            {isEn ? 'Continue Shopping' : 'متابعة التسوق'}
          </button>
        </div>
      </div>
    </div>
  );
}
