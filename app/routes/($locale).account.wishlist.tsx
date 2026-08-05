import {useOutletContext, Link} from 'react-router';
import {useEffect, useState} from 'react';
import {useWishlist} from '~/context/WishlistContext';
import {ProductItem} from '~/components/ProductItem';

export default function Wishlist() {
  const {locale, selectedLocationId} = useOutletContext<{locale: string; selectedLocationId?: string}>();
  const isEn = locale === 'en';
  const {wishlist} = useWishlist();
  const [liveProductsMap, setLiveProductsMap] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!wishlist || wishlist.length === 0) return;

    let isMounted = true;
    const ids = wishlist.map((item) => item.id).filter(Boolean);
    if (ids.length === 0) return;

    fetch(`/api/products?ids=${encodeURIComponent(ids.join(','))}&t=${Date.now()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.products && Array.isArray(data.products)) {
          const map: Record<string, any> = {};
          data.products.forEach((p: any) => {
            if (p?.id) map[p.id] = p;
          });
          setLiveProductsMap(map);
        }
      })
      .catch((e) => {
        console.error('Failed to fetch live wishlist products', e);
      });

    return () => {
      isMounted = false;
    };
  }, [wishlist, selectedLocationId]);

  return (
    <div className="account-wishlist">
      {/* Desktop Header Card matching mockup */}
      <div className="hidden lg:flex items-center justify-between bg-white border border-[#9FB7AE] rounded-[12px] px-6 py-5 mb-6 w-full">
        <h1
          className="!text-[18px] font-bold text-[#234745] !m-0"
          style={
            !isEn
              ? {fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif"}
              : undefined
          }
        >
          {isEn ? 'Favorites' : 'المفضلة'}
        </h1>
        <span
          className="text-[#234745] font-normal !text-[16px]"
          style={
            !isEn
              ? {fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif"}
              : undefined
          }
        >
          {wishlist.length} {isEn ? 'Products' : 'منتجات'}
        </span>
      </div>

      {wishlist.length === 0 ? (
        <div className="text-center py-16 md:py-20 bg-white rounded-[32px] border border-[#f0ece8] flex flex-col items-center justify-center">
          <div className="w-20 h-20 bg-[#fcfaf8] rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#234745"
              strokeWidth="1.5"
            >
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
          {wishlist.map((item) => {
            const liveProduct = liveProductsMap[item.id] || item;
            return <ProductItem key={item.id} product={liveProduct} />;
          })}
        </div>
      )}
    </div>
  );
}
