import { useOutletContext, Link } from 'react-router';
import { Image } from '@shopify/hydrogen';
import { useWishlist } from '~/context/WishlistContext';
import { AddToCartButton } from '~/components/AddToCartButton';
import { Price } from '~/components/Price';

export default function Wishlist() {
  const { locale } = useOutletContext<{ locale: string }>();
  const isEn = locale === 'en';
  const { wishlist, toggleWishlist } = useWishlist();

  return (
    <div className="account-wishlist">
      {/* Desktop Header Card matching mockup */}
      <div className="hidden lg:flex items-center justify-between bg-white border border-[#9FB7AE] rounded-[12px] px-6 py-5 mb-6 w-full">
        <h1 className="!text-[18px] font-bold text-[#234745] !m-0" style={!isEn ? { fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" } : undefined}>
          {isEn ? 'Favorites' : 'المفضلة'}
        </h1>
        <span className="text-[#234745] font-normal !text-[16px]" style={!isEn ? { fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" } : undefined}>
          {wishlist.length} {isEn ? 'Products' : 'منتجات'}
        </span>
      </div>

      {wishlist.length === 0 ? (
        <div className="text-center py-16 md:py-20 bg-white rounded-[32px] border border-[#f0ece8] flex flex-col items-center justify-center">
          <div className="w-20 h-20 bg-[#fcfaf8] rounded-full flex items-center justify-center mx-auto mb-6">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#234745" strokeWidth="1.5">
              <path d="M20.8 4.6a5.5 5.5 0 00-7.7 0l-1.1 1-1.1-1a5.5 5.5 0 00-7.8 7.8l1 1 7.9 7.9 7.9-7.9 1-1a5.5 5.5 0 000-7.8z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#234745] mb-3 text-center">
            {isEn ? 'Your wishlist is empty' : 'قائمة أمنياتك فارغة'}
          </h2>
          <p className="text-gray-500 mb-8 md:mb-10 text-center mx-auto w-full max-w-md px-4 leading-relaxed">
            {isEn
              ? 'Save your favorite items here to find them easily later.'
              : 'احفظ منتجاتك المفضلة هنا لتجدها بسهولة لاحقاً.'}
          </p>
          <Link
            to={isEn ? '/en/collections/all' : '/collections/all'}
            className="inline-block px-10 py-3.5 bg-[#234745] !text-white rounded-full font-bold hover:bg-[#1a3533] transition-colors shadow-sm text-center"
          >
            {isEn ? 'Start Shopping' : 'ابدأ التسوق'}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 md:gap-6">
          {wishlist.map((item) => (
            <WishlistCard
              key={item.id}
              item={item}
              isEn={isEn}
              onRemove={() => toggleWishlist(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WishlistCard({
  item,
  isEn,
  onRemove,
}: {
  item: any;
  isEn: boolean;
  onRemove: () => void;
}) {
  const productUrl = isEn ? `/en/products/${item.handle}` : `/products/${item.handle}`;

  return (
    <div className="group flex flex-col bg-[#F9F9F9] rounded-[20px] overflow-hidden transition-all duration-300 relative hover:shadow-md hover:-translate-y-1">
      {/* Image Block */}
      <Link prefetch="intent" to={productUrl} className="block relative">
        <div className="w-full aspect-[4/3] relative flex items-center justify-center bg-gray-50 overflow-hidden">
          {item.image ? (
            <Image
              data={item.image}
              aspectRatio="4/3"
              sizes="(min-width: 45em) 400px, 100vw"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}

          {/* Remove from wishlist — heart button, top-left (RTL) / top-right (LTR), same position as in ProductItem */}
          <div className={`absolute top-2 md:top-4 ${isEn ? 'right-2 md:right-4' : 'left-2 md:left-4'} z-20`}>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemove();
              }}
              aria-label={isEn ? 'Remove from Wishlist' : 'إزالة من قائمة الأمنيات'}
              className="w-7 h-7 md:w-10 md:h-10 p-0 rounded-full bg-white shadow-md transition-all flex items-center justify-center text-[#e74c3c] hover:text-[#b22222]"
            >
              <svg className="w-3.5 h-3.5 md:w-5 md:h-5" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5">
                <path d="M20.8 4.6a5.5 5.5 0 00-7.7 0l-1.1 1-1.1-1a5.5 5.5 0 00-7.8 7.8l1 1 7.9 7.9 7.9-7.9 1-1a5.5 5.5 0 000-7.8z" />
              </svg>
            </button>
          </div>
        </div>
      </Link>

      {/* Card Body */}
      <div className={`p-3 md:p-4 flex flex-col flex-grow ${isEn ? 'text-left' : 'text-right'}`}>
        <Link prefetch="intent" to={productUrl}>
          <h4
            className="font-bold text-[#234745] text-[16px] md:text-[18px] line-clamp-1 transition-colors duration-300 group-hover:text-[#1a3a2d]"
            style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", lineHeight: '24px' }}
          >
            {item.title}
          </h4>
        </Link>

        {item.priceRange?.minVariantPrice && (
          <div
            className="mt-[8px] mb-[16px] flex items-center gap-[8px]"
          >
            <div className="flex items-center text-[#255441]">
              <Price data={item.priceRange.minVariantPrice} size="lg" isEn={isEn} />
            </div>
          </div>
        )}

        <div className="mt-auto">
          <AddToCartButton
            lines={[{ merchandiseId: item.id, quantity: 1 }]}
            className="w-full h-[40px] md:h-[44px] px-2 md:px-4 flex items-center justify-center rounded-full font-bold text-[12px] md:text-[15px] bg-[#234745] text-white hover:bg-[#163529] shadow-sm transition-all duration-300 active:scale-95"
            style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
          >
            {isEn ? 'Add to Cart' : 'أضف إلي السلة'}
          </AddToCartButton>
        </div>
      </div>
    </div>
  );
}
