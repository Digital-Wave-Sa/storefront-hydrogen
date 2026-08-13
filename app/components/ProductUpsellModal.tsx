import { X, Heart } from 'lucide-react';
import { useRouteLoaderData, Await } from 'react-router';
import { Suspense, useState } from 'react';
import { AddToCartButton } from '~/components/AddToCartButton';

interface ProductUpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
  upsellProducts: Array<any>;
  isEn: boolean;
  onOpenCart: () => void;
  cartSubtotal?: string | number;
}

export function ProductUpsellModal({
  isOpen,
  onClose,
  upsellProducts,
  isEn,
  onOpenCart,
  cartSubtotal: propCartSubtotal,
}: ProductUpsellModalProps) {
  const rootData = useRouteLoaderData('root') as any;
  const [addedProductIds, setAddedProductIds] = useState<Record<string, boolean>>({});

  if (!isOpen || !upsellProducts || upsellProducts.length === 0) return null;

  // Filter valid upsell items
  const validProducts = upsellProducts.filter(
    (p) => p && (p.variants?.nodes?.[0] || p.variants?.[0]),
  );
  if (validProducts.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fadeIn">
      {/* Click outside backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div
        className={`relative z-10 bg-white rounded-[28px] sm:rounded-[32px] border border-gray-100 shadow-2xl max-w-4xl w-full p-5 sm:p-8 max-h-[92vh] overflow-y-auto scrollbar-none ${
          isEn ? 'font-en' : "font-['GE_Dinar_One']"
        }`}
        dir={isEn ? 'ltr' : 'rtl'}
      >
        {/* Header Bar */}
        <div className="flex items-start justify-between gap-4 mb-6 pb-2 border-b border-gray-100">
          {/* Close Button (X) */}
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 border border-gray-200 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all cursor-pointer shrink-0 mt-1"
            aria-label={isEn ? 'Close' : 'إغلاق'}
          >
            <X className="w-5 h-5" />
          </button>

          {/* Right Header Text & Cart Subtotal */}
          <div className="text-right rtl:text-right ltr:text-left flex-1">
            <h3 className="text-[#1E3A37] font-bold text-[18px] sm:text-[21px] leading-tight mb-1">
              {isEn ? 'Product added to your cart' : 'تم إضافة المنتج الي سلتك'}
            </h3>
            <div className="text-[#707070] text-[13px] sm:text-[14px] font-medium">
              <span>{isEn ? 'Cart subtotal: ' : 'مجموع السلة : '}</span>
              <span className="font-bold text-[#1E3A37] dir-ltr inline-block">
                {propCartSubtotal ? (
                  `${propCartSubtotal} ${isEn ? 'SAR' : '﷼'}`
                ) : (
                  <Suspense fallback="--">
                    <Await resolve={rootData?.cart}>
                      {(cart: any) => {
                        const amount = cart?.cost?.subtotalAmount?.amount;
                        return amount
                          ? `${parseFloat(amount).toFixed(2)} ${isEn ? 'SAR' : '﷼'}`
                          : `-- ${isEn ? 'SAR' : '﷼'}`;
                      }}
                    </Await>
                  </Suspense>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Inner Warm Cream Box Container */}
        <div className="bg-[#FAF6ED] rounded-[24px] border border-[#EFE7D5] p-4 sm:p-6 mb-6">
          {/* Cream Box Header */}
          <h4 className="text-[#1E3A37] font-bold text-[17px] sm:text-[19px] mb-4 text-right rtl:text-right ltr:text-left">
            {isEn ? 'Make it extra special' : 'إجعلها رائعة'}
          </h4>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
            {validProducts.slice(0, 6).map((prod: any) => {
              const variant = prod.variants?.nodes?.[0] || prod.variants?.[0];
              if (!variant) return null;

              const imgUrl =
                prod.featuredImage?.url ||
                variant?.image?.url ||
                '/images/placeholder.webp';
              const title = prod.title;
              const price = parseFloat(variant.price?.amount || '0');
              const compareAtPrice = variant.compareAtPrice?.amount
                ? parseFloat(variant.compareAtPrice.amount)
                : null;
              const isAdded = addedProductIds[prod.id];

              return (
                <div
                  key={prod.id}
                  className="bg-white rounded-[22px] p-3.5 border border-[#EAE3D2] shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative"
                >
                  <div>
                    {/* Image Area with Heart Icon */}
                    <div className="relative w-full aspect-[4/3] rounded-[16px] overflow-hidden bg-gray-50 mb-3">
                      <button
                        type="button"
                        className="absolute top-2.5 left-2.5 rtl:left-2.5 rtl:right-auto ltr:right-2.5 ltr:left-auto w-8 h-8 rounded-full bg-white/95 backdrop-blur-sm shadow-sm flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-white transition-all z-10 cursor-pointer"
                        aria-label={isEn ? 'Add to Wishlist' : 'إضافة للمفضلة'}
                      >
                        <Heart className="w-4 h-4 stroke-[2]" />
                      </button>
                      <img
                        src={imgUrl}
                        alt={title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>

                    {/* Product Title */}
                    <h5 className="text-[#1E3A37] font-bold text-[14px] sm:text-[15px] leading-snug line-clamp-1 mb-2 text-right rtl:text-right ltr:text-left">
                      {title}
                    </h5>

                    {/* Price Section */}
                    <div className="flex items-center gap-2 mb-4 text-right rtl:text-right ltr:text-left">
                      {compareAtPrice && compareAtPrice > price && (
                        <span className="line-through text-gray-400 text-[13px] font-normal">
                          {compareAtPrice}
                        </span>
                      )}
                      <span className="text-[#1E3A37] font-bold text-[16px]">
                        {price} {isEn ? 'SAR' : '﷼'}
                      </span>
                    </div>
                  </div>

                  {/* Add to Cart Button */}
                  <AddToCartButton
                    lines={[
                      {
                        merchandiseId: variant.id,
                        quantity: 1,
                        selectedVariant: variant,
                      },
                    ]}
                    onAddToCartSuccess={() => {
                      setAddedProductIds((prev) => ({
                        ...prev,
                        [prod.id]: true,
                      }));
                    }}
                    className={`w-full py-2.5 font-bold text-[14px] rounded-[14px] flex items-center justify-center transition-all shadow-sm active:scale-98 cursor-pointer ${
                      isAdded
                        ? 'bg-[#1E3A37]/10 text-[#1E3A37] border border-[#1E3A37]'
                        : 'bg-[#1E3A37] hover:bg-[#162D2A] text-white'
                    }`}
                  >
                    <span>
                      {isAdded
                        ? isEn
                          ? 'Added ✓'
                          : 'تمت الإضافة ✓'
                        : isEn
                        ? 'Add to Cart'
                        : 'أضف إلي السلة'}
                    </span>
                  </AddToCartButton>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Action Bar (Two Action Buttons) */}
        <div className="flex flex-col-reverse sm:flex-row items-center gap-4 w-full">
          {/* Secondary: Continue Shopping */}
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:flex-1 py-3.5 bg-white border border-[#1E3A37] text-[#1E3A37] hover:bg-gray-50 font-bold text-[15px] sm:text-[16px] rounded-full transition-all text-center cursor-pointer active:scale-98"
          >
            {isEn ? 'Continue Shopping' : 'متابعة التسوق'}
          </button>

          {/* Primary: View Cart / Cart Drawer */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenCart();
            }}
            className="w-full sm:flex-1 py-3.5 bg-[#1E3A37] hover:bg-[#162D2A] text-white font-bold text-[15px] sm:text-[16px] rounded-full transition-all shadow-md text-center cursor-pointer active:scale-98"
          >
            {isEn ? 'View Cart' : 'عربة التسوق'}
          </button>
        </div>
      </div>
    </div>
  );
}
