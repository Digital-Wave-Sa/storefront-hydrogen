import { useOutletContext, Link } from 'react-router';
import { Image, Money } from '@shopify/hydrogen';
import { useWishlist } from '~/context/WishlistContext';
import { AddToCartButton } from '~/components/AddToCartButton';
import { useAside } from '~/components/Aside';

export default function Wishlist() {
  const { locale } = useOutletContext<{ locale: string }>();
  const isEn = locale === 'en';
  const { wishlist, toggleWishlist } = useWishlist();

  return (
    <div className="account-wishlist">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[28px] lg:text-[32px] font-black text-[#234745] mb-1">
            {isEn ? 'My Wishlist' : 'قائمة أمنياتي'}
          </h1>
          <p className="text-gray-500 text-sm">
            {isEn 
              ? `You have ${wishlist.length} items saved` 
              : `لديك ${wishlist.length} منتجات محفوظة`}
          </p>
        </div>
      </div>

      {wishlist.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[32px] border border-[#f0ece8]">
          <div className="w-20 h-20 bg-[#fcfaf8] rounded-full flex items-center justify-center mx-auto mb-6">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#234745" strokeWidth="1.5">
              <path d="M20.8 4.6a5.5 5.5 0 00-7.7 0l-1.1 1-1.1-1a5.5 5.5 0 00-7.8 7.8l1 1 7.9 7.9 7.9-7.9 1-1a5.5 5.5 0 000-7.8z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#234745] mb-2">
            {isEn ? 'Your wishlist is empty' : 'قائمة أمنياتك فارغة'}
          </h2>
          <p className="text-gray-500 mb-8 max-w-xs mx-auto">
            {isEn 
              ? 'Save your favorite items here to find them easily later.' 
              : 'احفظ منتجاتك المفضلة هنا لتجدها بسهولة لاحقاً.'}
          </p>
          <Link
            to={isEn ? '/en/collections/all' : '/collections/all'}
            className="inline-block px-10 py-3 bg-[#234745] text-white rounded-full font-bold hover:bg-[#1a3533] transition-colors"
          >
            {isEn ? 'Start Shopping' : 'ابدأ التسوق'}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlist.map((item) => (
            <div key={item.id} className="group bg-white rounded-[32px] border border-[#f0ece8] overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1">
              <div className="relative aspect-square overflow-hidden bg-[#fcfaf8]">
                {item.image && (
                  <Image
                    data={item.image}
                    aspectRatio="1/1"
                    sizes="(min-width: 45em) 20vw, 50vw"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                )}
                <button
                  onClick={() => toggleWishlist(item)}
                  className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center text-red-500 shadow-md hover:bg-red-50 transition-colors z-10"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.8 4.6a5.5 5.5 0 00-7.7 0l-1.1 1-1.1-1a5.5 5.5 0 00-7.8 7.8l1 1 7.9 7.9 7.9-7.9 1-1a5.5 5.5 0 000-7.8z" />
                  </svg>
                </button>
              </div>

              <div className="p-6">
                <Link to={isEn ? `/en/products/${item.handle}` : `/products/${item.handle}`}>
                  <h3 className="text-lg font-black text-[#234745] mb-2 line-clamp-2 hover:opacity-80 transition-opacity">
                    {item.title}
                  </h3>
                </Link>
                <div className="mb-6">
                  <Money data={item.priceRange.minVariantPrice} className="text-[#234745] font-black text-xl" />
                </div>
                
                <AddToCartButton
                  lines={[{ merchandiseId: item.id, quantity: 1 }]}
                  className="w-full py-3 bg-[#234745] text-white rounded-full font-bold text-sm hover:bg-[#1a3533] transition-all active:scale-95"
                >
                  {isEn ? 'Add to Cart' : 'أضف للسلة'}
                </AddToCartButton>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
