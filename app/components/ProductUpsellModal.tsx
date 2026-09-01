import { Heart } from 'lucide-react';
import { useRouteLoaderData, Await } from 'react-router';
import { Suspense, useState } from 'react';
import { AddToCartButton } from '~/components/AddToCartButton';
import { useWishlist } from '~/context/WishlistContext';
import { isOutOfStockAtBranch, findBranchLocation } from '~/lib/stock';
import { useBranchAvailabilityReader } from '~/lib/useBranchAvailability';

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
  const { toggleWishlist, isInWishlist } = useWishlist();

  /**
   * This modal had no availability logic whatsoever — it appears immediately
   * after Add to Cart and would happily offer a product the chosen branch does
   * not stock, straight into the same cart that then flags it.
   */
  const upsellLocations =
    rootData?.locations?.locations?.nodes || rootData?.locations?.nodes || [];
  const upsellBranch = findBranchLocation(
    upsellLocations,
    rootData?.selectedLocationId,
    rootData?.selectedLocationName,
  );
  const { read: readUpsellStock } = useBranchAvailabilityReader(upsellBranch?.id);

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
          {/* Header Text & Cart Subtotal — first in the DOM so the close button
              lands on the trailing edge in both directions: right in English,
              left in Arabic. */}
          <div className="text-right rtl:text-right ltr:text-left flex-1">
            <h3 className="text-[#1E3A37] font-bold text-[18px] sm:text-[21px] leading-tight mb-1">
              {isEn ? 'Product added to your cart' : 'تم إضافة المنتج الي سلتك'}
            </h3>
            <div className="text-[#707070] text-[13px] sm:text-[14px] font-medium">
              <span>{isEn ? 'Cart subtotal: ' : 'مجموع السلة : '}</span>
              <span
                className="font-bold text-[#1E3A37] inline-block"
                style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
              >
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

          {/* Close Button (X) — the icon draws its own ring, so no border here */}
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 transition-all cursor-pointer shrink-0 mt-1"
            aria-label={isEn ? 'Close' : 'إغلاق'}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M12 1.5C6.15 1.5 1.5 6.15 1.5 12C1.5 17.85 6.15 22.5 12 22.5C17.85 22.5 22.5 17.85 22.5 12C22.5 6.15 17.85 1.5 12 1.5ZM12 21C7.05 21 3 16.95 3 12C3 7.05 7.05 3 12 3C16.95 3 21 7.05 21 12C21 16.95 16.95 21 12 21Z"
                fill="#9FB7AE"
              />
              <path
                d="M16.05 17.25L12 13.2L7.95 17.25L6.75 16.05L10.8 12L6.75 7.95L7.95 6.75L12 10.8L16.05 6.75L17.25 7.95L13.2 12L17.25 16.05L16.05 17.25Z"
                fill="#9FB7AE"
              />
            </svg>
          </button>
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

              // Do not upsell what this branch cannot supply. Unknown (lookup
              // pending or failed) leaves the card alone rather than hiding it.
              if (isOutOfStockAtBranch(readUpsellStock(variant.id)) === true) {
                return null;
              }

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
              const isWishlisted = isInWishlist(prod.id);

              return (
                <div
                  key={prod.id}
                  className="bg-white rounded-[22px] p-3.5 border border-[#EAE3D2] shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative"
                >
                  <div>
                    {/* Image Area with Functional Wishlist Heart Icon */}
                    <div className="relative w-full aspect-[4/3] rounded-[16px] overflow-hidden bg-gray-50 mb-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleWishlist({
                            id: prod.id,
                            variantId: variant.id,
                            title: prod.title,
                            handle: prod.handle || '',
                            image: { url: imgUrl },
                            priceRange: prod.priceRange || {
                              minVariantPrice: {
                                amount: String(price),
                                currencyCode: variant.price?.currencyCode || 'SAR',
                              },
                            },
                          });
                        }}
                        className={`absolute top-2.5 left-2.5 rtl:left-2.5 rtl:right-auto ltr:right-2.5 ltr:left-auto w-8 h-8 rounded-full shadow-sm flex items-center justify-center transition-all z-10 cursor-pointer ${
                          isWishlisted
                            ? 'bg-white text-red-500 hover:text-red-600'
                            : 'bg-white/95 text-gray-500 hover:text-red-500 hover:bg-white'
                        }`}
                        aria-label={isEn ? 'Add to Wishlist' : 'إضافة للمفضلة'}
                      >
                        <Heart className={`w-4 h-4 stroke-[2] ${isWishlisted ? 'fill-current text-red-500' : ''}`} />
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

                    {/* Price Section with English Digits */}
                    <div
                      className="flex items-center gap-2 mb-4 text-right rtl:text-right ltr:text-left"
                      style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                    >
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
