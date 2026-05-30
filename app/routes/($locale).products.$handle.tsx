import { Suspense, useState, useEffect, useMemo } from 'react';
import { getProductVisibility, type VisibilityResult } from '~/lib/visibility';
import { getIsOutOfStock } from '~/lib/stock';
import { StockNotificationModal } from '~/components/StockNotificationModal';
import { Price, SaudiRiyalSymbol } from '~/components/Price';
import { AddToCartButton } from '~/components/AddToCartButton';
import { StarRating, parseRatingValue } from '~/components/StarRating';
import { ProductItem } from '~/components/ProductItem';
import { ReviewForm } from '~/components/ReviewForm';
import { useWishlist } from '~/context/WishlistContext';
import { adminApiQuery } from '~/lib/admin.server';
import { getAdminToken } from '~/lib/shopify-admin.server';
import { createPortal } from 'react-dom';
import type { MetaFunction } from 'react-router';
import { data, redirect, type LoaderFunctionArgs } from 'react-router';
import { Await, Link, useLoaderData, useRouteLoaderData, useOutletContext, type FetcherWithComponents } from 'react-router';
import type {
  ProductFragment,
  ProductVariantsQuery,
  ProductVariantFragment,
} from 'storefrontapi.generated';
import {
  Image,
  Money,
  VariantSelector,
  type VariantOption,
  getSelectedProductOptions,
  CartForm,
  Analytics,
  useAnalytics,
} from '@shopify/hydrogen';
import { useAside } from '~/components/Aside';
import type { CartLineInput } from '@shopify/hydrogen/storefront-api-types';
import { getVariantUrl } from '~/utils';
import patternBg from '~/assets/patteren-collection-header.svg';

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data?.product) {
    return [{ title: 'Saadeddin' }];
  }
  const { product, locale } = data;
  const isEn = locale === 'en';
  const price = product.selectedVariant?.price;
  const priceString = price ? `${price.amount} ${price.currencyCode}` : '';

  const title = product.seo?.title || `${product.title}${priceString ? ` - ${priceString}` : ''} | Saadeddin`;
  const description = product.seo?.description || product.description?.substring(0, 155) || `Buy ${product.title} at Saadeddin. Freshly prepared daily.`;

  return [
    { title: title.substring(0, 60) },
    { name: 'description', content: description.substring(0, 160) },
    { property: 'og:title', content: title.substring(0, 60) },
    { property: 'og:description', content: description.substring(0, 160) },
  ];
};

// export async function loader({ params, request, context }: LoaderArgs) {
//   const { handle } = params;
//   const { storefront } = context;

//   const selectedOptions = getSelectedProductOptions(request).filter(
//     (option) =>
//       !option.name.startsWith('_sid') &&
//       !option.name.startsWith('_pos') &&
//       !option.name.startsWith('_psq') &&
//       !option.name.startsWith('_ss') &&
//       !option.name.startsWith('_v'),
//   );

//   if (!handle) {
//     throw new Error('Expected product handle to be defined');
//   }

//   const { product } = await storefront.query(PRODUCT_QUERY, {
//     variables: { handle, selectedOptions },
//   });

//   const variants = storefront.query(VARIANTS_QUERY, {
//     variables: { handle },
//   });

//   if (!product?.id) {
//     throw new Response(null, { status: 404 });
//   }

//   const firstVariant = product.variants?.nodes?.[0];
//   const firstVariantIsDefault = Boolean(
//     firstVariant?.selectedOptions.find(
//       (option: any) => option.name === 'Title' && option.value === 'Default Title',
//     ),
//   );

//   if (firstVariantIsDefault && firstVariant) {
//     product.selectedVariant = firstVariant;
//   } else {
//     if (!product.selectedVariant) {
//       return redirectToFirstVariant({ product, request });
//     }
//   }
//   return defer({ product, variants });
// }

export async function loader(args: LoaderFunctionArgs) {
  const { params, request, context } = args;
  const { handle } = params;
  const { storefront } = context;

  const selectedOptions = getSelectedProductOptions(request).filter(
    (option) =>
      !option.name.startsWith('_sid') &&
      !option.name.startsWith('_pos') &&
      !option.name.startsWith('_psq') &&
      !option.name.startsWith('_ss') &&
      !option.name.startsWith('_v'),
  );

  if (!handle) {
    throw new Error('Expected product handle to be defined');
  }

  // Ensure handle is decoded (for Arabic characters)
  const decodedHandle = decodeURIComponent(handle);

  let { product } = await storefront.query(PRODUCT_QUERY, {
    variables: { handle: decodedHandle, selectedOptions },
    cache: storefront.CacheNone(),
  });

  // --- CROSS-LANGUAGE FIX ---
  // If product not found in current locale (e.g. Arabic handle in English context),
  // try fetching it to find its ID, then redirect to the correct localized handle.
  if (!product?.id) {
    const { product: fallbackProduct } = await storefront.query(PRODUCT_QUERY, {
      variables: { 
        handle: decodedHandle, 
        selectedOptions,
        language: 'AR' // Try finding it in Arabic first
      },
    });
    
    if (fallbackProduct?.id) {
        // If we found the product in Arabic, check if it has a different handle in English
        // Hydrogen storefront client uses the context's locale by default.
        const { product: currentLocaleProduct } = await storefront.query(`#graphql
            query ProductHandle($id: ID!) {
                product(id: $id) {
                    handle
                }
            }
        `, {
            variables: { id: fallbackProduct.id }
        });

        const url = new URL(request.url);
        const localePrefix = params.locale ? `/${params.locale}` : '';
        const targetHandle = currentLocaleProduct?.handle || decodedHandle;
        
        // If the handle is different or we just want to ensure we stay in the current locale
        // We ONLY redirect if we are NOT already on the path we calculated (to avoid loops)
        const targetPath = `${localePrefix}/products/${targetHandle}`;
        const currentPath = url.pathname;
        
        if (decodeURIComponent(currentPath) !== decodeURIComponent(targetPath)) {
            throw redirect(targetPath + url.search, { status: 302 });
        }
    }

    throw new Response(null, { status: 404 });
  }

  const variants = storefront.query(VARIANTS_QUERY, {
    variables: { handle: decodedHandle },
  });

  // --- VISIBILITY SCHEDULING: compute status server-side ---
  const now = Date.now();
  const visibility = getProductVisibility(product as any, now);
  // ---------------------------------------------------------

  const firstVariant = product.variants?.nodes?.[0];
  const firstVariantIsDefault = Boolean(
    firstVariant?.selectedOptions.find(
      (option: any) => option.name === 'Title' && option.value === 'Default Title',
    ),
  );

  if (firstVariantIsDefault && firstVariant) {
    product.selectedVariant = firstVariant;
  } else {
    if (!product.selectedVariant) {
      return redirectToFirstVariant({ product, request });
    }
  }
  // --- FETCH REVIEWS VIA ADMIN API ---
  let reviews: any[] = [];
  try {
      const adminToken = await getAdminToken(args.context.env);
      const rawShop = args.context.env.SHOPIFY_SHOP || args.context.env.PUBLIC_STORE_DOMAIN || 'the-beauty-secrets-ksa';
      const shopDomain = rawShop.includes('myshopify.com') ? rawShop : `${rawShop.split('.')[0]}.myshopify.com`;

      const reviewsQuery = `#graphql
        query GetProductReviews {
          metaobjects(type: "storefront_review", first: 250) {
            nodes {
              fields {
                key
                value
              }
            }
          }
        }
      `;

      const reviewsResult = await adminApiQuery(shopDomain, adminToken, reviewsQuery);
      
      const allReviews = reviewsResult.data?.metaobjects?.nodes?.map((node: any) => {
          const f: any = {};
          node.fields.forEach((field: any) => f[field.key] = field.value);
          return f;
      }) || [];

      reviews = allReviews.filter((r: any) => 
          r.product_handle === decodedHandle && 
          (r.status === 'Approved' || r.status === 'Published' || !r.status)
      );
  } catch (err) {
      console.error('[REVIEWS] Failed to fetch reviews:', err);
  }

  // --- CALCULATE DYNAMIC RATING ---
  let dynamicRating = 0;
  let dynamicCount = 0;

  if (reviews.length > 0) {
      const sum = reviews.reduce((acc, r: any) => acc + (parseFloat(r.rating) || 0), 0);
      dynamicRating = sum / reviews.length;
      dynamicCount = reviews.length;
  } else {
      dynamicRating = parseRatingValue(product.average_rating?.value);
      dynamicCount = parseInt(product.rating_count?.value || '0');
  }



  const recommended = await storefront.query(RECOMMENDED_PRODUCTS_QUERY);

  return data({ product, variants, visibility, reviews, dynamicRating, dynamicCount, recommended });
}

function redirectToFirstVariant({
  product,
  request,
}: {
  product: ProductFragment;
  request: Request;
}) {
  const url = new URL(request.url);
  const firstVariant = product.variants?.nodes?.[0];

  if (!firstVariant) {
    throw new Response('Variant not found', { status: 404 });
  }

  throw redirect(
    getVariantUrl({
      pathname: url.pathname,
      handle: product.handle,
      selectedOptions: firstVariant.selectedOptions,
      searchParams: new URLSearchParams(url.search),
    }),
    { status: 302 },
  );
}

export default function Product() {
  const { product, variants, visibility, dynamicRating: loaderRating, dynamicCount: loaderCount, recommended } = useLoaderData<typeof loader>();
  const rootData = useRouteLoaderData('root') as any;
  const locale = rootData?.consent?.language?.toLowerCase() || 'ar';
  const isEn = locale === 'en';
  const customer = rootData?.customer;
  
  // Use global reviews from root loader (Storefront API)
  const allNodes = rootData?.reviews?.nodes || [];
  const reviews = allNodes.map((node: any) => {
      const f: any = {};
      node.fields.forEach((field: any) => f[field.key] = field.value);
      return f;
  }).filter((r: any) => {
      const isApproved = r.status === 'Approved' || r.status === 'Published';
      return r.product_handle === product.handle && isApproved;
  }) || [];

  // Calculate dynamic rating from global reviews
  let dynamicRating = loaderRating;
  let dynamicCount = loaderCount;
  if (reviews.length > 0) {
    const sum = reviews.reduce((acc: number, r: any) => acc + (parseFloat(r.rating) || 0), 0);
    dynamicRating = sum / reviews.length;
    dynamicCount = reviews.length;
  }

  const { selectedVariant } = product;
  const { selectedLocationId, selectedLocationName } = useOutletContext<{ selectedLocationId?: string, selectedLocationName?: string }>();


  const storeAvailabilityNodes = (selectedVariant as any)?.storeAvailability?.nodes || [];
  
  const isGiftCard = Boolean(product.isGiftCard) || 
    product.handle.includes('gift-card') || 
    product.productType?.toLowerCase().includes('gift card');

  const bundleComponents = (product as any).bundle_components?.references?.nodes || [];
  const isBundle = product.productType?.toLowerCase() === 'bundle' || product.tags?.some((t: string) => t.toLowerCase() === 'bundle') || bundleComponents.length > 0;

  const bundleSavings = useMemo(() => {
    if (!isBundle || !bundleComponents.length || !selectedVariant) return null;
    
    const componentsTotal = bundleComponents.reduce((sum: number, component: any) => {
        const price = parseFloat(component.variants?.nodes[0]?.price?.amount || '0');
        return sum + price;
    }, 0);

    const bundlePrice = parseFloat(selectedVariant.price.amount);
    const savings = componentsTotal - bundlePrice;
    
    return savings > 0 ? savings : null;
  }, [isBundle, bundleComponents, selectedVariant]);

  // Normalized ID comparison to avoid GID mismatch issues
  const isOutOfStock = useMemo(() => {
    return getIsOutOfStock(
      selectedLocationId,
      selectedLocationName,
      storeAvailabilityNodes,
      product.selectedVariant?.availableForSale ?? false
    );
  }, [selectedLocationId, selectedLocationName, storeAvailabilityNodes, product.selectedVariant]);

  // Visibility scheduling — force unavailable if product is not active
  const isVisibilityBlocked = !visibility.isActive;
  const effectiveOutOfStock = isOutOfStock || isVisibilityBlocked;

  const [customerEmail, setCustomerEmail] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (customer && typeof customer.then === 'function') {
        customer.then((res: any) => {
            if (res?.customer?.email) setCustomerEmail(res.customer.email);
        }).catch(() => {});
    }
  }, [customer]);

  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [quantity, setQuantity] = useState(1); 
  const [activeTab, setActiveTab] = useState('details');
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]); // Array of Variant IDs
  const [note, setNote] = useState('');
  const [isGiftMode, setIsGiftMode] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [hideSender, setHideSender] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  
  const isGiftable = product.tags?.some((t: string) => {
    const lowerTag = t.toLowerCase();
    return lowerTag.includes('gift') || lowerTag.includes('mother') || lowerTag.includes('father') || lowerTag.includes('friend') || lowerTag.includes('grad');
  }) ?? false;
  
  const bogoFreeVariantId = (product as any).bogo_free_item?.reference?.id || (product as any).bogo_free_item?.value;
  const isBogo = !!bogoFreeVariantId || (product.tags?.some((t: string) => t.toLowerCase().includes('bogo')) ?? false);

  const [recipientContact, setRecipientContact] = useState('');
  const [giftCardMessage, setGiftCardMessage] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'highest' | 'lowest'>('newest');
  const [filterRating, setFilterRating] = useState<number | null>(null);

  const processedReviews = useMemo(() => {
    if (!reviews) return [];
    let result = [...reviews];
    if (filterRating) {
      result = result.filter(r => r.rating === filterRating);
    }
    if (sortBy === 'highest') result.sort((a, b) => b.rating - a.rating);
    if (sortBy === 'lowest') result.sort((a, b) => a.rating - b.rating);
    // Newest is default as they come from the API
    return result;
  }, [reviews, sortBy, filterRating]);

  const rawAddons = (product as any).addons?.references?.nodes || [];
  const addonNodes = useMemo(() => {
    return rawAddons;
  }, [rawAddons]);

  const handleAddonToggle = (variantId: string) => {
    setSelectedAddons((prev) =>
      prev.includes(variantId) ? prev.filter((id) => id !== variantId) : [...prev, variantId]
    );
  };

  // Calculate the Dynamic Total
  const basePrice = parseFloat(selectedVariant?.price?.amount || '0');
  const addonsTotal = selectedAddons.reduce((sum, id) => {
    const addon = addonNodes.find((n: any) => n.variants.nodes[0].id === id);
    return sum + parseFloat(addon?.variants.nodes[0].price.amount || '0');
  }, 0);

  const totalDisplayPrice = (basePrice + addonsTotal) * quantity;

  // --- ESTIMATED DELIVERY CALCULATION ---
  const estimatedDeliveryDate = useMemo(() => {
    // 1. Check for product-level override first
    const override = (product as any).delivery_override?.value;
    let leadTimeHours = override ? parseInt(override) : null;

    // 2. If no override, check collections (get the maximum lead time among all product's collections)
    if (leadTimeHours === null) {
      const collectionLeadTimes = (product as any).collections?.nodes
        ?.map((n: any) => n.leadTime?.value ? parseInt(n.leadTime.value) : 0) || [];
      
      if (collectionLeadTimes.length > 0) {
        leadTimeHours = Math.max(...collectionLeadTimes);
      } else {
        leadTimeHours = 0; // Default to same day if no config found
      }
    }

    const date = new Date();
    date.setHours(date.getHours() + leadTimeHours);
    
    // Format the date based on locale
    return date.toLocaleDateString(locale === 'ar' ? 'ar-SA-u-ca-gregory' : 'en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, [product, locale]);
  // --------------------------------------

  return (
    <div dir={isEn ? 'ltr' : 'rtl'} className={`w-full bg-[#fafafa] ${isEn ? 'font-en' : 'font-ar'} pb-20`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": product.title,
            "image": product.selectedVariant?.image?.url || product.images?.nodes?.[0]?.url,
            "description": product.seo?.description || product.description,
            "sku": product.selectedVariant?.sku || product.selectedVariant?.id,
            "brand": {
              "@type": "Brand",
              "name": product.vendor || "Saadeddin Pastry"
            },
            "offers": {
              "@type": "Offer",
              "priceCurrency": product.selectedVariant?.price?.currencyCode,
              "price": product.selectedVariant?.price?.amount,
              "availability": !effectiveOutOfStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
              "url": `https://saadeddin.com${isEn ? '/en' : ''}/products/${product.handle}`
            }
          })
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": isEn ? "Home" : "الرئيسية",
                "item": "https://saadeddin.com"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": product.title,
                "item": `https://saadeddin.com${isEn ? '/en' : ''}/products/${product.handle}`
              }
            ]
          })
        }}
      />

      <Analytics.ProductView
        data={{
          products: [
            {
              id: product.id,
              title: product.title,
              price: selectedVariant?.price.amount || '0',
              vendor: product.vendor,
              variantId: selectedVariant?.id || '',
              variantTitle: selectedVariant?.title || '',
              quantity: 1,
            },
          ],
        }}
      />

      {/* Visibility Alert Banner */}
      {isVisibilityBlocked && (
        <div className={`w-full py-4 text-center font-bold text-sm ${visibility.status === 'scheduled'
          ? 'bg-amber-50 text-amber-700 border-b border-amber-200'
          : 'bg-red-50 text-red-600 border-b border-red-200'
          }`}>
          <div className="max-w-[1400px] mx-auto px-4 md:px-8 flex items-center justify-center gap-3">
            <span className="text-lg">{visibility.status === 'scheduled' ? '🕐' : '⚠️'}</span>
            <span>{isEn ? visibility.label.en : visibility.label.ar} — {isEn ? 'This product is not available at the moment' : 'هذا المنتج غير متاح حالياً'}</span>
          </div>
        </div>
      )}

      {/* 1. Styled PDP Header Header */}
      <div className="w-full">
        {/* Dark Green Patterned Section */}
        <div 
          className="w-full bg-[#234745] relative overflow-hidden py-12"
          style={{
            backgroundImage: `url(${patternBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <div className={`max-w-[1400px] mx-auto px-4 md:px-8 relative z-10 flex ${isEn ? 'justify-end' : 'justify-start'}`}>
            <button 
              onClick={() => window.history.back()} 
              className="flex items-center gap-3 bg-[#ffffff]/20 hover:bg-[#ffffff]/30 backdrop-blur-md text-white px-8 py-2.5 rounded-full text-sm font-bold transition-all shadow-lg group border border-white/10"
            >
              <span className="opacity-95">{isEn ? 'Back' : 'رجوع'}</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${isEn ? 'rotate-180 group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`}>
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* White Breadcrumb Section */}
        <div className="w-full bg-white border-b border-gray-100 py-4 shadow-sm">
          <div className="max-w-[1400px] mx-auto px-4 md:px-8">
            <div className="flex items-center gap-2 text-[13px] font-bold">
              <Link to={isEn ? "/en" : "/"} className="text-gray-400 hover:text-[#234745] transition-colors">{isEn ? 'Home' : 'الرئيسية'}</Link> 
              <span className="text-gray-300">/</span>
              <Link to={isEn ? "/en/collections/all" : "/collections/all"} className="text-gray-400 hover:text-[#234745] transition-colors">{isEn ? 'Products' : 'المنتجات'}</Link> 
              <span className="text-gray-300">/</span>
              <span className="text-[#1a1a1a]">{product.title}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full h-10 bg-white shadow-sm mb-8 hidden"></div>

      {/* 2. Main Product Section (Identical 3-Column Layout) */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 pt-8 md:pt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">

        {/* RIGHT COLUMN: Image Gallery (Takes 4 cols, Right-most in RTL) */}
        <div className="lg:col-span-4 flex flex-col gap-6 relative order-1">
          <ProductGallery images={product.images?.nodes || (selectedVariant?.image ? [selectedVariant.image] : [])} product={product} />
        </div>

        {/* MIDDLE COLUMN: Details & Variants (Takes 5 cols, Center) */}
        <div className="lg:col-span-5 flex flex-col pt-2 order-2">
          {/* High-Fidelity Header Section */}
          <div className="flex flex-col gap-0 mb-8 w-full items-start">
            {/* Vendor (Sub Title) - Precise CSS implementation */}
            <span 
              className="text-[#A67B5B] block mb-3"
              style={{
                fontFamily: "'GE Dinar One', sans-serif",
                fontWeight: 700,
                fontSize: '12px',
                lineHeight: '100%',
                textAlign: isEn ? 'left' : 'right',
                verticalAlign: 'middle'
              }}
            >
              {product.vendor || (isEn ? 'Saadeddin' : 'الشوكولاته')}
            </span>

            <div className={`flex items-center gap-3 mb-2 ${isEn ? 'justify-start' : 'justify-end'}`}>
              <h1 
                className="font-ar text-[#1a1a1a]"
                style={{
                  fontFamily: "'Bahij Janna', sans-serif",
                  fontWeight: 700,
                  fontSize: '26px',
                  lineHeight: '120%',
                  margin: '0 !important',
                  textAlign: isEn ? 'left' : 'right',
                  verticalAlign: 'middle'
                }}
              >
                {product.title}
              </h1>
              {isBogo && (
                  <span className="text-[12px] font-black px-3 py-1.5 rounded-xl shadow-sm bg-[#FF6B6B] text-white flex items-center gap-1.5 shrink-0">
                      <span>🎁</span> {isEn ? 'Buy 1 Get 1 Free' : '1+1 مجاناً'}
                  </span>
              )}
            </div>
            
            {/* Rating & Availability Row - Precise CSS implementation */}
            <div 
              className="flex items-center gap-4"
              style={{
                fontFamily: "'GE Dinar One', sans-serif",
                fontWeight: 700,
                fontSize: '12px',
                lineHeight: '100%',
                textAlign: isEn ? 'left' : 'right',
                verticalAlign: 'middle'
              }}
            >
              <StarRating rating={dynamicRating || 4.8} count={dynamicCount || 24} locale={locale} size="md" />

              <span className="text-gray-200">|</span>

              <div className="flex items-center gap-2 text-[#295b45]">
                 <span className="w-1.5 h-1.5 bg-[#295b45] rounded-full"></span>
                 <span className="font-bold" style={{ fontSize: '12px' }}>
                    {isEn ? `Available in ${selectedLocationName || 'Store'}` : `متوفر في ${selectedLocationName || 'الفرع'}`}
                 </span>
              </div>
            </div>
          </div>

          {/* Info Cards Row (High Fidelity) */}
          <div className="grid grid-cols-3 gap-3 mb-10">
            {/* Calories Card */}
            <div className="bg-white rounded-[20px] p-3 flex flex-col items-center justify-center text-center border border-gray-200 h-[70px] gap-1">
               <span 
                 style={{
                   fontFamily: "'GE Dinar One', sans-serif",
                   fontWeight: 700,
                   fontSize: '16px',
                   lineHeight: '100%',
                   textAlign: 'center',
                   verticalAlign: 'middle'
                 }}
                 className="text-[#234745]"
               >
                 {new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'ar-EG').format(parseInt((product as any).calories?.value || '240'))}
               </span>
               <span 
                 style={{
                   fontFamily: "'GE Dinar One', sans-serif",
                   fontWeight: 400,
                   fontSize: '12px',
                   lineHeight: '100%',
                   textAlign: 'center',
                   verticalAlign: 'middle'
                 }}
                 className="text-[#BCC2C2]"
               >
                 {isEn ? 'Calories / 100g' : 'سعر حراري / ١٠٠جم'}
               </span>
            </div>

            {/* Prep Time Card */}
            <div className="bg-white rounded-[20px] p-3 flex flex-col items-center justify-center text-center border border-gray-200 h-[70px] gap-1">
               <div className="flex items-center gap-1">
                 <span 
                   style={{
                     fontFamily: "'GE Dinar One', sans-serif",
                     fontWeight: 700,
                     fontSize: '16px',
                     lineHeight: '100%',
                     textAlign: 'center',
                     verticalAlign: 'middle'
                   }}
                   className="text-[#234745]"
                 >
                   {new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'ar-EG').format(parseInt((product as any).prep_time?.value || '20'))}
                 </span>
                 <span style={{ fontFamily: "'GE Dinar One', sans-serif", fontWeight: 700, fontSize: '14px' }} className="text-[#234745]">{isEn ? 'min' : 'دقيقة'}</span>
               </div>
               <span 
                 style={{
                   fontFamily: "'GE Dinar One', sans-serif",
                   fontWeight: 400,
                   fontSize: '12px',
                   lineHeight: '100%',
                   textAlign: 'center',
                   verticalAlign: 'middle'
                 }}
                 className="text-[#BCC2C2]"
               >
                 {isEn ? 'Prep Time' : 'وقت التجهيز'}
               </span>
            </div>

            {/* Servings Card */}
            <div className="bg-white rounded-[20px] p-3 flex flex-col items-center justify-center text-center border border-gray-200 h-[70px] gap-1">
               <span 
                 style={{
                   fontFamily: "'GE Dinar One', sans-serif",
                   fontWeight: 700,
                   fontSize: '16px',
                   lineHeight: '100%',
                   textAlign: 'center',
                   verticalAlign: 'middle'
                 }}
                 className="text-[#234745]"
               >
                 {(product as any).servings?.value || (isEn ? '4-6' : '٤-٦')}
               </span>
               <span 
                 style={{
                   fontFamily: "'GE Dinar One', sans-serif",
                   fontWeight: 400,
                   fontSize: '12px',
                   lineHeight: '100%',
                   textAlign: 'center',
                   verticalAlign: 'middle'
                 }}
                 className="text-[#BCC2C2]"
               >
                 {isEn ? 'Serves' : 'يكفي أشخاص'}
               </span>
            </div>
          </div>

          {/* Premium Price Box (Exact Dimensions & RTL) */}
          <div 
            className="bg-[#FEF8EB] mb-10 border border-[#F2E8D5] flex flex-col items-start justify-center px-8 shadow-sm relative w-full"
            style={{
                maxWidth: '519px',
                height: '96px',
                borderRadius: '16px',
                borderWidth: '1px',
                direction: 'rtl'
            }}
          >
             <div className="flex items-center gap-2" dir="rtl">
               <span 
                 style={{
                   fontFamily: "'Bahij Janna', sans-serif",
                   fontWeight: 700,
                   fontSize: '38px',
                   lineHeight: '100%',
                   textAlign: 'right',
                   verticalAlign: 'middle',
                   color: '#234745'
                 }}
               >
                 {selectedVariant?.price?.amount || '0'}
               </span>
               <SaudiRiyalSymbol className="h-6 w-auto text-[#234745]" />
             </div>
             <p 
               style={{
                 fontFamily: "'GE Dinar One', sans-serif",
                 fontWeight: 500,
                 fontSize: '13px',
                 color: '#BCC2C2',
                 marginTop: '4px',
                 direction: 'rtl'
               }}
             >
               {isEn ? 'VAT Inclusive 15%' : 'شامل ضريبة القيمة المضافة ١٥٪'}
             </p>
          </div>

           {(addonsTotal > 0 || quantity > 1) && (
             <div className={`bg-[#234745]/5 border border-[#234745]/10 rounded-2xl p-5 mb-8 flex items-center justify-between shadow-sm animate-fade-in ${isEn ? 'flex-row' : 'flex-row-reverse'}`} style={{ maxWidth: '519px' }}>
               <span className="text-[13px] font-black text-[#234745]" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                 {isEn ? 'Dynamic Cart Total Preview' : 'معاينة مجموع السلة المباشر'}
               </span>
               <div className="flex items-center gap-2 bg-[#234745] text-white px-4 py-2 rounded-full text-[13px] font-black shadow-md">
                 <span>{isEn ? 'Total:' : 'المجموع:'}</span>
                 <span style={{ fontFamily: "'Outfit', sans-serif" }}>{new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'ar-EG').format(totalDisplayPrice)}</span>
                 <span>{isEn ? 'SAR' : 'ر.س'}</span>
               </div>
             </div>
           )}

          {/* Description */}
          <p className={`text-[#8C9393] text-[16px] leading-[1.8] mb-12 font-medium ${isEn ? 'text-left' : 'text-right'}`}>
            {product.description || (isEn ? 'Saadeddin offers the finest chocolate selection, prepared with passion and modern techniques.' : 'تشكيلة فاخرة من أجود أنواع الشوكولاته المختارة. محضرة بأحدث التقنيات مع محافظة تامة على الطعم الأصيل والجودة العالية.')}
          </p>

          <Suspense fallback={<div>{isEn ? 'Loading options...' : 'جاري تحميل الخيارات...'}</div>}>
            <Await resolve={variants}>
              {(data) => (
                <div className="flex flex-col gap-8">
                  <ProductForm
                    product={product}
                    selectedVariant={selectedVariant}
                    variants={data.product?.variants?.nodes || []}
                    isEn={isEn}
                  />

                  {/* Bundle Components Section */}
                  {isBundle && bundleComponents.length > 0 && (
                    <div className="flex flex-col gap-5 mt-4">
                      <div className={`flex items-center justify-between ${isEn ? 'flex-row' : 'flex-row-reverse'}`}>
                        <h5 className={`font-black text-[#1a1a1a] text-[15px]`}>
                          {isEn ? 'This package includes:' : 'يحتوي هذا العرض على:'}
                        </h5>
                        {bundleSavings && bundleSavings > 0 && (
                           <span className="bg-[#295b45] text-white text-[11px] font-black px-3 py-1.5 rounded-full">
                             {isEn ? 'Bundle Savings: ' : 'توفير العرض: '}
                             {new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'ar-EG').format(bundleSavings)} {isEn ? 'SAR' : 'ر.س'}
                           </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {bundleComponents.map((component: any) => {
                          const compVariant = component.variants?.nodes?.[0];
                          const compPrice = compVariant?.price;
                          return (
                            <div key={component.id} className={`flex items-center gap-4 bg-white border border-gray-100 rounded-[20px] p-4 shadow-sm transition-all hover:border-[#234745]/30 ${isEn ? 'flex-row' : 'flex-row-reverse'}`}>
                               <div className="w-16 h-16 rounded-[12px] bg-[#f0f4f2] overflow-hidden flex-shrink-0 relative">
                                 {component.featuredImage ? (
                                   <Image data={component.featuredImage} className="object-cover w-full h-full" sizes="64px" />
                                 ) : (
                                   <div className="w-full h-full flex items-center justify-center text-gray-300 text-[10px]">{isEn ? 'No Image' : 'لا توجد صورة'}</div>
                                 )}
                               </div>
                               <div className={`flex flex-col flex-grow ${isEn ? 'text-left' : 'text-right'}`}>
                                 <span className="text-[13px] font-black text-[#1a1a1a] line-clamp-2 leading-tight">
                                   {component.title}
                                 </span>
                                 {compPrice && (
                                   <div className={`flex items-center gap-1 text-[#A67B5B] text-[12px] font-bold mt-1 ${isEn ? 'justify-start' : 'justify-end'}`}>
                                     <span>{isEn ? 'Original: ' : 'السعر الأصلي: '}</span>
                                     <Price data={compPrice} isEn={isEn} size="xs" />
                                   </div>
                                 )}
                               </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Addons Section (High Fidelity) */}
                  {addonNodes.length > 0 && (
                    <div className="flex flex-col gap-5 mt-4">
                      <h5 className={`font-black text-[#1a1a1a] text-[15px] ${isEn ? 'text-left' : 'text-right'}`}>{isEn ? 'Add-ons' : 'إضافات'}</h5>
                      <div className="grid grid-cols-3 gap-3">
                        {addonNodes.map((addon: any) => {
                          const variant = addon.variants.nodes[0];
                          const isSelected = selectedAddons.includes(variant.id);
                          const outOfStock = !addon.availableForSale;

                          return (
                            <div
                              key={addon.id}
                              className={`relative p-5 pt-10 rounded-[20px] border transition-all flex flex-col items-center text-center gap-1.5 shadow-sm ${
                                isSelected ? 'border-[#234745] bg-[#f0f4f2]' : 'border-gray-100 bg-white hover:border-gray-300'
                              } ${outOfStock ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer'}`}
                              onClick={() => !outOfStock && handleAddonToggle(variant.id)}
                            >
                              {/* Custom Checkbox */}
                              <div className={`absolute top-3 right-3 w-4.5 h-4.5 rounded-[5px] border flex items-center justify-center transition-colors ${
                                isSelected ? 'bg-[#234745] border-[#234745]' : 'border-gray-200 bg-white'
                              }`}>
                                {isSelected && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><path d="M20 6L9 17l-5-5" /></svg>}
                              </div>
                              
                              <p className="text-[13px] font-black text-[#1a1a1a] leading-tight">
                                {isEn ? addon.title : (addon.title === ' متوفر الان' ? 'متوفر الان' : addon.title)}
                              </p>
                              <div className="flex items-center gap-1 text-[11px] text-[#A67B5B] font-bold mt-1">
                                <span>+</span>
                                <Price data={variant.price} isEn={isEn} size="xs" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Gift Toggle (Exact Mockup Match) */}
                  {isGiftable && (
                    <div className="mt-8 bg-white border border-gray-100 rounded-[1.5rem] p-8 transition-all shadow-sm">
                      <div className={`flex items-center justify-between gap-6 ${isEn ? 'flex-row-reverse' : 'flex-row'}`}>
                         {/* Text on the Right (in RTL) */}
                         <div className={`flex flex-col ${isEn ? 'text-left' : 'text-right'}`}>
                            <span 
                              className="font-black text-[#234745]"
                              style={{
                                fontFamily: "'Bahij Janna', sans-serif",
                                fontSize: '18px',
                                lineHeight: '100%'
                              }}
                            >
                               {isEn ? 'Send as a Gift' : 'أرسل كهدية'}
                            </span>
                            <span 
                              className="text-[#BCC2C2] mt-2 font-bold"
                              style={{
                                fontSize: '13px',
                                lineHeight: '100%'
                              }}
                            >
                               {isEn ? 'Add a message and special packaging' : 'أضف رسالة وتغليف مميز للمستلم'}
                            </span>
                         </div>

                         {/* Toggle on the Left (in RTL) */}
                         <div 
                            className={`w-16 h-9 flex items-center rounded-full p-1 transition-colors duration-300 cursor-pointer ${isGiftMode ? 'bg-[#234745]' : 'bg-gray-200'}`} 
                            onClick={() => setIsGiftMode(!isGiftMode)}
                          >
                            <div className={`bg-[#FEF8EB] w-7 h-7 rounded-full shadow-md transform transition-transform duration-300 ${isGiftMode ? (isEn ? 'translate-x-7' : '-translate-x-7') : 'translate-x-0'}`}></div>
                         </div>
                      </div>
                      
                      {isGiftMode && (
                         <div className="mt-8 flex flex-col gap-6 animate-fade-in border-t border-gray-100 pt-8">
                            <div className="flex flex-col gap-2">
                               <label className={`text-[13px] font-black text-[#1a1a1a] ${isEn ? 'text-left' : 'text-right'}`}>{isEn ? 'Recipient Name' : 'اسم المستلم'}</label>
                               <input type="text" value={recipientName} onChange={e => setRecipientName(e.target.value)} className={`w-full p-4 text-[14px] border border-gray-100 rounded-2xl focus:ring-[#234745] focus:border-[#234745] bg-[#fafafa] font-bold ${isEn ? 'text-left' : 'text-right'}`} placeholder={isEn ? "e.g. Sarah" : "مثال: سارة"} />
                            </div>
                            <div className="flex flex-col gap-2">
                               <label className={`text-[13px] font-black text-[#1a1a1a] ${isEn ? 'text-left' : 'text-right'}`}>{isEn ? 'Gift Message' : 'رسالة إهداء'}</label>
                               <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} className={`w-full p-4 text-[14px] border border-gray-100 rounded-2xl focus:ring-[#234745] focus:border-[#234745] resize-none bg-[#fafafa] font-bold ${isEn ? 'text-left' : 'text-right'}`} placeholder={isEn ? "Write a lovely message..." : "اكتب رسالة جميلة..."}></textarea>
                            </div>
                            <label className={`flex items-center gap-3 cursor-pointer group ${isEn ? 'flex-row' : 'flex-row-reverse'}`}>
                               <input type="checkbox" checked={hideSender} onChange={e => setHideSender(e.target.checked)} className="w-5 h-5 rounded-[6px] text-[#234745] focus:ring-[#234745] border-gray-200" />
                               <span className="text-[13px] font-bold text-gray-500 group-hover:text-[#234745] transition-colors">{isEn ? 'Hide my name (Anonymous Gift)' : 'إخفاء اسمي (هدية سرية)'}</span>
                            </label>
                         </div>
                      )}
                    </div>
                  )}

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    <span className="bg-[#F8F9F3] border border-[#E9EBD8] text-[#8C9368] px-5 py-2.5 rounded-full text-[12px] font-black">{isEn ? 'Gluten Free' : 'خالي من الغلوتين'}</span>
                    <span className="bg-[#F8F9F3] border border-[#E9EBD8] text-[#8C9368] px-5 py-2.5 rounded-full text-[12px] font-black">{isEn ? 'Lactose Free' : 'خالي من اللاكتوز'}</span>
                    <span className="bg-[#F8F9F3] border border-[#E9EBD8] text-[#8C9368] px-5 py-2.5 rounded-full text-[12px] font-black">{isEn ? 'Vegan 100%' : 'نباتي ١٠٠٪'}</span>
                  </div>
                </div>
              )}
            </Await>
          </Suspense>
        </div>

        {/* LEFT COLUMN: Sticky Info Sidebar (Takes 3 cols, Left-most in RTL) */}
        <div className="lg:col-span-3 flex flex-col gap-6 order-3">
          <div className="sticky top-24 flex flex-col gap-6">
            
            {/* Payment & Actions Unified Box */}
            <div className="bg-white rounded-[32px] p-6 border-[1.5px] border-gray-100 flex flex-col gap-8 shadow-sm">
                
                {/* 1. Payment Promo Banner */}
                <div className="bg-[#FEF8EB] rounded-[24px] p-5 border border-[#F2E8D5] flex flex-col items-center text-center shadow-sm relative overflow-hidden">
                   <div className="flex items-center justify-center gap-4 mb-3 w-full">
                       {/* Logos: Mada, Visa, PayPal, Apple Pay, Mastercard */}
                       <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Mada_Logo.svg/1024px-Mada_Logo.svg.png" className="h-[22px] object-contain" alt="Mada" />
                       <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/Visa_Logo.png" className="h-[18px] object-contain" alt="Visa" />
                       <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" className="h-[20px] object-contain" alt="PayPal" />
                       <img src="https://upload.wikimedia.org/wikipedia/commons/b/b0/Apple_Pay_logo.svg" className="h-[24px] object-contain" alt="Apple Pay" />
                       <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" className="h-[24px] object-contain" alt="Mastercard" />
                   </div>
                   <h4 className="text-[19px] font-black text-[#234745] mt-1" style={{ fontFamily: "'Bahij Janna', sans-serif" }}>
                       {isEn ? 'Split it into 4 interest-free payments' : 'قسّطها على ٤ دفعات بدون فوائد'}
                   </h4>
                </div>

                {/* 2. Quantity */}
                <div className={`flex items-center justify-between ${isEn ? 'flex-row' : 'flex-row-reverse'}`}>
                    <span className="font-black text-[#1a1a1a] text-[20px]" style={{ fontFamily: "'Bahij Janna', sans-serif" }}>
                       {isEn ? 'Quantity' : 'الكمية'}
                    </span>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            className="w-14 h-14 flex items-center justify-center bg-white rounded-[14px] text-[#A67B5B] border-[1.5px] border-gray-200 hover:border-[#234745] hover:text-[#234745] transition-all"
                        >
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14" /></svg>
                        </button>
                        <div className="w-[72px] h-14 flex items-center justify-center bg-white rounded-[14px] border-[1.5px] border-gray-200 font-bold text-[22px] text-[#234745]">
                            {new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'ar-EG').format(quantity)}
                        </div>
                        <button 
                            onClick={() => setQuantity(quantity + 1)}
                            className="w-14 h-14 flex items-center justify-center bg-white rounded-[14px] text-[#234745] border-[1.5px] border-gray-200 hover:border-[#234745] transition-all"
                        >
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                        </button>
                    </div>
                </div>

                {/* 3. Actions */}
                <div className="flex flex-col gap-4 mt-2">
                  {isVisibilityBlocked ? (
                    <div className="w-full bg-gray-100 text-gray-400 py-5 rounded-full text-[16px] font-black flex items-center justify-center gap-2 cursor-not-allowed">
                      {isEn ? visibility.label.en : visibility.label.ar}
                    </div>
                  ) : (
                    <>
                      {/* Add to Cart */}
                      <AddToCartButton
                        analytics={{
                          products: [
                            {
                              productGid: product.id,
                              variantGid: selectedVariant.id,
                              quantity,
                            },
                          ],
                        }}
                        disabled={!selectedVariant || effectiveOutOfStock}
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        lines={
                          selectedVariant
                            ? (() => {
                                const groupId = Date.now().toString();
                                const isBogo = product.tags?.some((t: string) => t.toLowerCase().includes('bogo'));
                                
                                const mainLine = {
                                  merchandiseId: selectedVariant.id,
                                  quantity,
                                  selectedVariant,
                                  attributes: [
                                    {key: '_groupId', value: groupId},
                                    ...(isGiftMode ? [
                                      {key: '_isGift', value: 'true'},
                                      ...(recipientName ? [{key: 'Recipient Name', value: recipientName}] : []),
                                      ...(note ? [{key: 'Gift Message', value: note}] : []),
                                      {key: '_hideSender', value: hideSender ? 'Yes' : 'No'},
                                    ] : (note ? [{key: 'Order Note', value: note}] : [])),
                                  ],
                                };

                                const addonLines = selectedAddons.map((addonId) => {
                                  const addonNode = addonNodes.find((n: any) => n.variants.nodes[0].id === addonId);
                                  const variant = addonNode?.variants.nodes[0];
                                  return {
                                    merchandiseId: addonId,
                                    quantity: 1,
                                    selectedVariant: variant,
                                    attributes: [
                                      {key: '_groupId', value: groupId},
                                      {key: '_is_addon', value: 'true'},
                                    ],
                                  };
                                });

                                if (isBogo) {
                                  const freeVariantId = bogoFreeVariantId || selectedVariant.id;
                                  return [
                                    mainLine,
                                    {
                                      merchandiseId: freeVariantId,
                                      quantity,
                                      attributes: [
                                        {key: '_groupId', value: groupId},
                                        {key: '_is_addon', value: 'true'},
                                        {key: '_is_free', value: 'true'},
                                      ],
                                    },
                                    ...addonLines
                                  ];
                                }

                                return [mainLine, ...addonLines];
                              })()
                            : []
                        }
                        className={`w-full h-[64px] ${effectiveOutOfStock ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#234745] hover:bg-[#1a3533] active:scale-[0.98]'} text-white rounded-[32px] font-black text-[20px] transition-all flex items-center justify-center gap-3`}
                      >
                        {effectiveOutOfStock ? (
                          isEn ? 'Out of Stock' : 'نفذت الكمية'
                        ) : (
                          <>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                                <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
                            </svg>
                            <span style={{ fontFamily: "'GE Dinar One', sans-serif", fontWeight: 700, fontSize: '16px', lineHeight: '100%' }}>{isEn ? 'Add to Cart' : 'أضف إلي السلة'}</span>
                          </>
                        )}
                      </AddToCartButton>

                      {/* Buy Now */}
                      <button className="w-full h-[64px] bg-[#EEDCDC] hover:bg-[#e4d0d0] active:scale-[0.98] transition-all text-[#DF4646] rounded-[32px] flex items-center justify-center gap-3">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                           <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4Z" />
                           <line x1="3" y1="6" x2="21" y2="6" />
                           <path d="M16 10a4 4 0 01-8 0" />
                        </svg>
                        <span style={{ fontFamily: "'GE Dinar One', sans-serif", fontWeight: 700, fontSize: '16px', lineHeight: '100%' }}>{isEn ? 'Buy Now' : 'إشتري الان'}</span>
                      </button>
                    </>
                  )}
                </div>
            </div>

            {/* 3. Service Features List (Dynamically Driven) */}

            {(() => {
                const locations = rootData?.locations?.locations?.nodes || rootData?.locations?.nodes || [];
                const currentBranch = locations.find((loc: any) => 
                  (selectedLocationId && loc.id === selectedLocationId) || 
                  (selectedLocationName && loc.name === selectedLocationName)
                );
                const thresholdMeta = currentBranch?.free_delivery_threshold || currentBranch?.metafields?.find((m: any) => m?.key === 'free_delivery_threshold');
                const threshold = thresholdMeta?.value ? parseInt(thresholdMeta.value) : 200;
                
                return (
                  <div className={`bg-[#FEF8EB] rounded-[2.5rem] p-7 border border-[#F2E8D5] flex flex-col gap-0 ${isEn ? 'text-left' : 'text-right'} shadow-sm`}>
                      {/* Item 1: Free Delivery */}
                      <div className="py-3 flex flex-col">
                          <h4 className="font-black text-[16px] text-[#234745] leading-snug">{isEn ? 'Free Delivery' : 'توصيل مجاني'}</h4>
                          <p className="text-[12px] text-[#8C9393] font-bold mt-0.5">
                              {isEn 
                                ? `On orders above ${threshold} SAR` 
                                : `للطلبات فوق ${new Intl.NumberFormat('ar-EG').format(threshold)} ر.س`}
                          </p>
                      </div>
                      <div className="h-[1px] w-full bg-[#F2E8D5]/50"></div>
                      
                      {/* Item 2: Branch Pickup */}
                      <div className="py-3 flex flex-col">
                          <h4 className="font-black text-[16px] text-[#234745] leading-snug">{isEn ? 'Branch Pickup' : 'استلام من الفرع'}</h4>
                          <p className="text-[12px] text-[#8C9393] font-bold mt-0.5">
                              {isEn ? 'Ready in 15 minutes' : 'جاهز خلال ١٥ دقيقة'}
                          </p>
                      </div>
                      <div className="h-[1px] w-full bg-[#F2E8D5]/50"></div>

                      {/* Item 3: Guaranteed Return */}
                      <div className="py-3 flex flex-col">
                          <h4 className="font-black text-[16px] text-[#234745] leading-snug">{isEn ? 'Guaranteed Return' : 'استرجاع مضمون'}</h4>
                          <p className="text-[12px] text-[#8C9393] font-bold mt-0.5">
                              {isEn ? 'Within 24 hours of receipt' : 'خلال ٢٤ ساعة من الاستلام'}
                          </p>
                      </div>
                      <div className="h-[1px] w-full bg-[#F2E8D5]/50"></div>

                      {/* Item 4: Secure Payment */}
                      <div className="py-3 flex flex-col border-none">
                          <h4 className="font-black text-[16px] text-[#234745] leading-snug">{isEn ? '100% Secure Payment' : 'دفع آمن ١٠٠٪'}</h4>
                          <p className="text-[12px] text-[#8C9393] font-bold mt-0.5">
                              {isEn ? 'Encrypted and protected' : 'مدفوعات مشفرة ومحمية'}
                          </p>
                      </div>
                  </div>
                );
            })()}
          </div>
        </div>
      </div>

      {/* 3. Bottom Tabs area (Product details & Reviews) */}
      <div className="w-full bg-white mt-16 border-t border-gray-200 pt-10 pb-20">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8">
          
          {/* Section Heading & Tabs (Mockup Match) */}
          <div className="flex flex-col md:flex-row justify-center items-center mb-16 border-b border-gray-100 gap-16 relative">
              <button 
                  onClick={() => setActiveTab('details')}
                  className={`pb-4 text-[16px] font-bold transition-all relative ${activeTab === 'details' ? 'text-[#234745]' : 'text-gray-400 hover:text-gray-600'}`}
                  style={{ fontFamily: "'GE Dinar One', sans-serif" }}
              >
                  {isEn ? 'Product Description' : 'وصف المنتج'}
                  {activeTab === 'details' && <div className="absolute bottom-0 left-0 w-full h-1 bg-[#234745] rounded-full"></div>}
              </button>
              <button 
                  onClick={() => setActiveTab('reviews')}
                  className={`pb-4 text-[16px] font-bold transition-all relative flex items-center gap-2 ${activeTab === 'reviews' ? 'text-[#234745]' : 'text-gray-400 hover:text-gray-600'}`}
                  style={{ fontFamily: "'GE Dinar One', sans-serif" }}
              >
                  {isEn ? `Reviews (${reviews?.length || 0})` : `المراجعات (${new Intl.NumberFormat('ar-EG').format(reviews?.length || 0)})`}
                  {activeTab === 'reviews' && <div className="absolute bottom-0 left-0 w-full h-1 bg-[#234745] rounded-full"></div>}
              </button>
          </div>

          <div className="animate-fade-in">
            {activeTab === 'details' ? (
              <div className="max-w-[1400px]">
                  <div 
                    className={`${isEn ? 'text-left' : 'text-right'} text-[#555] leading-[2] font-medium text-[17px] mb-12 whitespace-pre-wrap`}
                    dangerouslySetInnerHTML={{ __html: product.descriptionHtml || product.description }}
                  />
                  
                  {/* Metafield Info: Allergens & Nutrition */}
                  {((product as any).allergens?.value || (product as any).nutrition?.value) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {(product as any).allergens?.value && (
                          <div className={`p-8 bg-orange-50/50 rounded-[32px] border border-orange-100/50 ${isEn ? 'text-left' : 'text-right'}`}>
                            <h5 className="text-[16px] font-black text-orange-800 mb-4 flex items-center gap-3">
                              <span className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-xl">⚠️</span>
                              {isEn ? 'Allergens Warning' : 'معلومات الحساسية'}
                            </h5>
                            <p className="text-[15px] font-bold text-orange-700/80 leading-relaxed">
                              {(product as any).allergens.value}
                            </p>
                          </div>
                        )}

                        {(product as any).nutrition?.value && (
                          <div className={`p-8 bg-[#295b45]/5 rounded-[32px] border border-[#295b45]/10 ${isEn ? 'text-left' : 'text-right'}`}>
                            <h5 className="text-[16px] font-black text-[#295b45] mb-4 flex items-center gap-3">
                              <span className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-xl">🥗</span>
                              {isEn ? 'Nutrition Facts' : 'حقائق غذائية'}
                            </h5>
                            <p className="text-[15px] font-bold text-[#234745]/70 leading-relaxed whitespace-pre-wrap">
                              {(product as any).nutrition.value}
                            </p>
                          </div>
                        )}
                    </div>
                  )}
              </div>
            ) : (
                <div className="flex flex-col gap-20">
                    {/* Premium Rating Summary (Mockup Inspired) */}
                    <div className={`flex flex-col lg:flex-row justify-between items-stretch gap-12 bg-[#fdfbf7] p-12 rounded-[40px] border border-gray-100 shadow-sm ${isEn ? 'flex-row' : 'flex-row-reverse'}`}>
                        {/* Right Column: High Fidelity Score */}
                        <div className="flex flex-col items-center justify-center gap-4 lg:px-12 border-gray-100 min-w-[280px]" style={{ borderInlineStartWidth: '0px' }}>
                            <div className="flex flex-col items-center gap-0">
                                <h3 className="text-[72px] font-bold text-[#234745] leading-none mb-2" style={{ fontFamily: "'Bahij Janna', sans-serif" }}>
                                    {loaderRating.toFixed(1)}
                                </h3>
                                <StarRating rating={loaderRating} size="lg" locale={locale} />
                            </div>
                            <span className="text-[15px] text-[#8C9393] font-bold mt-2">
                                {isEn ? `${reviews?.length || 0} Reviews` : `${new Intl.NumberFormat('ar-EG').format(reviews?.length || 0)} مراجعة`}
                            </span>
                            
                            <button 
                                onClick={() => setShowReviewForm(!showReviewForm)}
                                className="mt-8 bg-[#234745] text-white px-12 py-4 rounded-full font-black text-[16px] hover:bg-[#1a3533] transition-all shadow-[0_10px_25px_rgba(35,71,69,0.2)] active:scale-95 group flex items-center gap-3"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="transition-transform group-hover:rotate-12">
                                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                                <span>{isEn ? 'Write a Review' : 'أضف مراجعة'}</span>
                            </button>
                        </div>

                        {/* Divider Line (Desktop) */}
                        <div className="hidden lg:block w-[1px] bg-gray-200/60 my-4"></div>

                        {/* Left Column: Visual Breakdown */}
                        <div className="flex-1 flex flex-col justify-center gap-5 lg:px-8">
                            {[5, 4, 3, 2, 1].map(star => {
                                const count = reviews.filter((r: any) => Math.round(parseFloat(r.rating)) === star).length;
                                const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                                return (
                                    <div key={star} className={`flex items-center gap-6 ${isEn ? 'flex-row' : 'flex-row-reverse'}`}>
                                        <div className="flex items-center gap-2 w-14">
                                            <span className="text-[15px] font-bold text-[#234745]">{new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'ar-EG').format(star)}</span>
                                            <span className="text-amber-400 text-lg">★</span>
                                        </div>
                                        <div className="flex-1 h-2 bg-gray-200/50 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-[#234745] rounded-full transition-all duration-1000"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                        <div className="w-12 text-[14px] font-black text-[#8C9393] text-center">
                                            {new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'ar-EG').format(count)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Enhanced Review Form (Conditional) */}
                    {showReviewForm && (
                        <div className="bg-white p-12 rounded-[40px] border border-[#234745]/10 shadow-xl animate-slide-up relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-[#234745]"></div>
                            <div className="flex justify-between items-center mb-10">
                                <h4 className="text-2xl font-black text-[#234745] flex items-center gap-3">
                                    <span className="w-10 h-10 rounded-xl bg-[#234745]/5 flex items-center justify-center">✍️</span>
                                    {isEn ? 'Share your experience' : 'شاركنا تجربتك'}
                                </h4>
                                <button onClick={() => setShowReviewForm(false)} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:text-red-500 transition-all hover:rotate-90">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                </button>
                            </div>
                            <ReviewForm 
                                productHandle={product.handle} 
                                productTitle={product.title} 
                                locale={locale} 
                                selectedLocationId={selectedLocationId}
                                selectedLocationName={selectedLocationName}
                            />
                        </div>
                    )}

                    {/* Professional Reviews List */}
                    <div className="flex flex-col gap-10">
                        {processedReviews && processedReviews.length > 0 ? (
                            processedReviews.map((review: any, idx: number) => (
                                <div key={idx} className="bg-white p-10 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col gap-8 relative group overflow-hidden">
                                    <div className={`flex flex-col md:flex-row justify-between items-start gap-6 ${isEn ? 'flex-row' : 'flex-row-reverse'}`}>
                                        {/* Profile Card */}
                                        <div className={`flex items-center gap-6 ${isEn ? 'flex-row' : 'flex-row-reverse'}`}>
                                            <div className="w-20 h-20 bg-[#234745]/5 rounded-3xl flex items-center justify-center text-[#234745] font-black text-3xl shadow-sm border border-[#234745]/5 relative">
                                                {review.customer_name?.charAt(0).toUpperCase() || 'U'}
                                                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-lg flex items-center justify-center shadow-sm border border-gray-50 text-[10px]">⭐</div>
                                            </div>
                                            <div className={`flex flex-col ${isEn ? 'items-start' : 'items-end'}`}>
                                                <h5 className="text-[20px] font-black text-[#1a1a1a] leading-tight mb-2">{review.customer_name}</h5>
                                                <div className={`flex flex-wrap items-center gap-4 ${isEn ? 'flex-row' : 'flex-row-reverse'}`}>
                                                    <span className="text-[14px] text-[#8C9393] font-bold">
                                                        {new Date(review.created_at || Date.now()).toLocaleDateString(locale === 'en' ? 'en-US' : 'ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                    </span>
                                                    <div className="flex items-center gap-2 text-[#295b45] bg-[#295b45]/5 px-4 py-1.5 rounded-full border border-[#295b45]/10 shadow-sm">
                                                        <div className="w-5 h-5 bg-[#295b45] rounded-full flex items-center justify-center text-white scale-75">
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12" /></svg>
                                                        </div>
                                                        <span className="text-[11px] font-black uppercase tracking-wider">{isEn ? 'Verified Buyer' : 'مشتري موثق'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Stars on the other side */}
                                        <div className="bg-[#fafafa] px-6 py-3 rounded-2xl border border-gray-50 shadow-sm">
                                            <StarRating rating={review.rating} size="md" locale={locale} />
                                        </div>
                                    </div>
                                    
                                    <div className={`px-0 md:px-28 ${isEn ? 'text-left' : 'text-right'}`}>
                                        {review.review_title && <h6 className="font-black text-[#234745] mb-3 text-[20px]" style={{ fontFamily: "'Bahij Janna', sans-serif" }}>{review.review_title}</h6>}
                                        <p className="text-[#555] leading-relaxed font-medium text-[17px] italic">"{review.review_comment || review.comment}"</p>
                                    </div>

                                    {/* Subtle brand touch */}
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#234745]/2 rounded-bl-full pointer-events-none"></div>
                                </div>
                            ))
                        ) : (
                            <div className="py-24 text-center bg-[#fafafa] rounded-[48px] border-2 border-dashed border-gray-200">
                                <div className="text-6xl mb-8 grayscale brightness-125 opacity-40">🍰</div>
                                <h4 className="text-2xl font-black text-[#234745]/40 mb-3">
                                    {isEn ? 'Share the sweetness!' : 'شاركنا الحلا!'}
                                </h4>
                                <p className="text-gray-400 font-bold max-w-xs mx-auto">
                                    {isEn ? 'Be the first person to share your thoughts on this product.' : 'كن أول شخص يشاركنا رأيه حول هذا المنتج.'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Related Products Section (High Fidelity) */}
      <div className="w-full bg-[#fafafa] pb-32">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8">
          <div className={`flex items-center justify-between mb-10 ${isEn ? 'flex-row' : 'flex-row-reverse'}`}>
            <h2 
              style={{
                fontFamily: "'Bahij Janna', sans-serif",
                fontWeight: 700,
                fontSize: '32px',
                color: '#1a1a1a'
              }}
            >
              {isEn ? 'Related Products' : 'منتجات ذات صلة'}
            </h2>
            <Link 
              to={isEn ? "/en/collections/all" : "/collections/all"}
              className="bg-white border border-gray-200 px-6 py-2.5 rounded-full text-[14px] font-black text-gray-800 hover:border-[#234745] hover:text-[#234745] transition-all shadow-sm flex items-center gap-2 group"
            >
              <span>{isEn ? 'View All' : 'عرض الكل'}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform ${isEn ? 'group-hover:translate-x-1' : 'rotate-180 group-hover:-translate-x-1'}`}>
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {recommended?.products?.nodes?.map((recProduct: any) => (
              <ProductItem 
                key={recProduct.id} 
                product={recProduct} 
                loading="lazy" 
              />
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}

function ProductGallery({ images, product }: { images: any[], product: any }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomHoverProps, setZoomHoverProps] = useState({ x: 0, y: 0, show: false });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { toggleWishlist, isInWishlist } = useWishlist();
  const isWishlisted = isInWishlist(product.id);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent scroll when fullscreen
  useEffect(() => {
    if (isFullscreen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isFullscreen]);

  if (!images || images.length === 0) return <div className="w-full bg-gray-200 aspect-square flex items-center justify-center animate-pulse rounded-[32px]">لا يوجد صورة</div>;

  const currentImage = images[activeIndex];

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomHoverProps({ x, y, show: true });
  };

  const handleMouseLeave = () => {
    setZoomHoverProps({ show: false, x: 0, y: 0 });
  };

  return (
    <div className="flex flex-col gap-6 relative w-full">
      {/* Main Image with Zoom on Desktop, Swipe on Mobile */}
      <div className="relative w-full aspect-square bg-[#f9f9f9] rounded-[2.5rem] overflow-hidden group border border-gray-100 shadow-sm">

        {/* Top Heart Icon (Left Side) */}
        <div className="absolute top-6 left-6 z-20">
          <button 
            onClick={(e) => {
              e.preventDefault();
              toggleWishlist({
                id: product.id,
                title: product.title,
                handle: product.handle,
                image: images[0],
                priceRange: product.priceRange
              });
            }}
            className={`w-11 h-11 rounded-full flex items-center justify-center shadow-[0_4px_15px_rgba(0,0,0,0.08)] transition-all hover:scale-110 active:scale-95 border ${isWishlisted ? 'bg-white text-red-500 border-white' : 'bg-white text-gray-400 hover:text-red-500 border-gray-50'}`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill={isWishlisted ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <path d="M20.8 4.6a5.5 5.5 0 00-7.7 0l-1.1 1-1.1-1a5.5 5.5 0 00-7.8 7.8l1 1 7.9 7.9 7.9-7.9 1-1a5.5 5.5 0 000-7.8z" />
            </svg>
          </button>
        </div>

        <div
          className="w-full h-full flex md:hidden overflow-x-auto snap-x snap-mandatory flex-nowrap hide-scrollbars"
          onScroll={(e) => {
            const target = e.currentTarget;
            const index = Math.round(target.scrollLeft / target.clientWidth);
            if (index !== activeIndex && index >= 0 && index < images.length) {
              setActiveIndex(index);
            }
          }}>
          {images.map((img, idx) => (
            <div key={img.id} className="w-full h-full shrink-0 snap-center flex items-center justify-center relative">
              <Image 
                  data={img} 
                  alt={img.altText || 'Product Image'} 
                  sizes="(min-width: 768px) 50vw, 100vw" 
                  loading={idx === 0 ? 'eager' : 'lazy'} 
                  className="w-full h-full object-cover" 
              />
            </div>
          ))}
        </div>

        {/* Desktop zoom container */}
        <div
          className="hidden md:flex w-full h-full items-center justify-center relative cursor-zoom-in group"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={() => setIsFullscreen(true)}
        >
          <Image 
              data={currentImage} 
              alt={currentImage?.altText || 'Product Image'} 
              sizes="(min-width: 768px) 50vw, 100vw"
              loading="eager"
              className={`w-full h-full object-cover transition-opacity duration-300 ${zoomHoverProps.show ? 'opacity-0' : 'opacity-100'}`} 
          />
          {zoomHoverProps.show && currentImage?.url && (
            <div
              className="absolute inset-0 z-10 pointer-events-none bg-no-repeat rounded-[2.5rem]"
              style={{
                backgroundImage: `url(${currentImage.url})`,
                backgroundPosition: `${zoomHoverProps.x}% ${zoomHoverProps.y}%`,
                backgroundSize: '200%',
              }}
            />
          )}
        </div>

        {/* Mobile Dots Indicator */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 md:hidden">
          {images.map((img, i) => (
            <div key={img.id} className={`w-2 h-2 rounded-full transition-all duration-300 ${i === activeIndex ? 'bg-[#234745] w-4' : 'bg-gray-300'}`} />
          ))}
        </div>
      </div>

      {/* Desktop Thumbnails (Centered Row) */}
      {images.length > 1 && (
        <div className="hidden md:flex justify-center gap-4 mt-2">
          {images.map((img, i) => (
            <div
              key={img.id}
              onClick={() => setActiveIndex(i)}
              className={`w-24 h-24 bg-[#f9f9f9] rounded-xl border-2 transition-all cursor-pointer flex items-center justify-center overflow-hidden shadow-sm ${i === activeIndex ? 'border-[#234745]' : 'border-transparent opacity-70 hover:opacity-100 hover:border-gray-200'
                }`}
            >
              <Image 
                  data={img} 
                  alt={img.altText || `Product thumbnail ${i + 1}`} 
                  sizes="(min-width: 768px) 15vw, 25vw"
                  loading="lazy"
                  className="w-full h-full object-cover" 
              />
            </div>
          ))}
        </div>
      )}

      {/* FULLSCREEN MODAL */}
      {mounted && isFullscreen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999999] bg-white flex flex-col items-center justify-center animate-fade-in" dir="ltr">
          {/* Close Button */}
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-6 right-6 z-[9999999] w-12 h-12 bg-gray-100 hover:bg-gray-200 transition-colors rounded-full flex items-center justify-center text-gray-800 hover:scale-105 active:scale-95"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Left Nav */}
          {images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setActiveIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1)); }}
              className="absolute left-6 md:left-12 top-1/2 -translate-y-1/2 z-[9999999] w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-[0_2px_15px_rgba(0,0,0,0.08)] border border-gray-100 hover:scale-110 active:scale-95 transition-all text-gray-800"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}

          {/* Right Nav */}
          {images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setActiveIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0)); }}
              className="absolute right-6 md:right-12 top-1/2 -translate-y-1/2 z-[9999999] w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-[0_2px_15px_rgba(0,0,0,0.08)] border border-gray-100 hover:scale-110 active:scale-95 transition-all text-gray-800"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}

          {/* Main Image */}
          <div className="w-full max-w-[85vw] mx-auto h-[80vh] flex items-center justify-center relative p-4">
            <Image 
                data={currentImage} 
                alt={currentImage?.altText || 'Product Fullscreen Image'}
                sizes="100vw"
                loading="lazy"
                className="w-full h-full object-contain" 
            />
          </div>

          {/* Bottom Indicators (Dashes) */}
          {images.length > 1 && (
            <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-3 z-[9999999]">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setActiveIndex(i)}
                  className={`h-0.5 rounded-full transition-all duration-300 ${i === activeIndex ? 'w-8 bg-[#234745]' : 'w-4 bg-gray-300 hover:bg-gray-400'}`}
                />
              ))}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

function ProductForm({
  product,
  selectedVariant,
  variants,
  isEn
}: {
  product: ProductFragment;
  selectedVariant: ProductFragment['selectedVariant'];
  variants: Array<ProductVariantFragment>;
  isEn: boolean;
}) {
  const isGiftCard = Boolean(product.isGiftCard) || 
    product.handle.includes('gift-card') || 
    product.productType?.toLowerCase().includes('gift card');

  return (
    <div className="flex flex-col gap-8 w-full">
      <VariantSelector
        handle={product.handle}
        options={product.options}
        variants={variants as any}
      >
        {({ option }) => {
          if (option.values.length === 1 && option.values[0].value === 'Default Title') {
            return null;
          }
          const isSize = option.name.toLowerCase() === 'size' || option.name.toLowerCase() === 'title';
          let label = isSize ? (isEn ? 'Size' : 'الحجم') : option.name;
          
          if (isGiftCard && isSize) {
            label = isEn ? 'Voucher Value' : 'قيمة القسيمة';
          }

          return (
            <div className="flex flex-col gap-4" key={option.name}>
              <h5 className={`font-black text-[#1a1a1a] text-[15px] ${isEn ? 'text-left' : 'text-right'} w-full`}>{label}</h5>
              <div className={`flex flex-wrap gap-3 ${isEn ? 'justify-start' : 'justify-end'} w-full`}>
                {option.values.map(({ value, isAvailable, isActive, to }) => {
                  let displayValue = value;
                  if (!isEn) {
                    if (value.toLowerCase() === 'small') displayValue = 'صغير';
                    if (value.toLowerCase() === 'medium') displayValue = 'وسط';
                    if (value.toLowerCase() === 'large') displayValue = 'كبير';
                  }

                  const variantUrl = isEn ? `/en${to}` : to;

                  return (
                    <Link
                      key={option.name + value}
                      prefetch="intent"
                      preventScrollReset
                      replace
                      to={variantUrl}
                      className={`h-12 px-8 rounded-full text-[13px] font-black border transition-all flex items-center justify-center min-w-[110px] shadow-sm ${isActive
                        ? 'bg-[#234745] border-[#234745] text-white'
                        : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200 hover:text-gray-600'
                        } ${!isAvailable ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      {displayValue}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        }}
      </VariantSelector>
    </div>
  );
}

const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariant on ProductVariant {
    availableForSale
    compareAtPrice {
      amount
      currencyCode
    }
    id
    image {
      __typename
      id
      url
      altText
      width
      height
    }
    price {
      amount
      currencyCode
    }
    product {
      title
      handle
    }
    selectedOptions {
      name
      value
    }
    sku
    title
    unitPrice {
      amount
      currencyCode
    }
    storeAvailability(first: 250) {
      nodes {
        available
        location {
          id
          name
        }
      }
    }
  }
` as const;

const PRODUCT_FRAGMENT = `#graphql
  fragment Product on Product {
    id
    title
    vendor
    handle
    descriptionHtml
    description
    productType
    isGiftCard
    tags
    bundle_components: metafield(namespace: "custom", key: "bundle_components") {
      references(first: 20) {
        nodes {
          ... on Product {
            id
            title
            handle
            featuredImage {
              url
              altText
            }
            variants(first: 1) {
              nodes {
                price {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }
    }
    options {
      name
      optionValues {
        name
      }
    }
    addons: metafield(namespace: "custom", key: "product_addons") {
    references(first: 10) {
      nodes {
        ... on Product {
          id
          title
          handle
          availableForSale
          variants(first: 1) {
            nodes {
              id
              price {
                amount
                currencyCode
              }
              image {
                url
                altText
                width
                height
              }
            }
          }
        }
      }
    }
  }

      # --- ADDED FOR VISIBILITY SCHEDULING ---
    visibility_start: metafield(namespace: "custom", key: "visibility_start") {
      value
    }
    visibility_end: metafield(namespace: "custom", key: "visibility_end") {
      value
    }
    nutrition: metafield(namespace: "custom", key: "nutrition") {
      value
    }
    allergens: metafield(namespace: "custom", key: "allergens") {
      value
    }
    calories: metafield(namespace: "custom", key: "calories") {
      value
    }
    prep_time: metafield(namespace: "custom", key: "prep_time") {
      value
    }
    servings: metafield(namespace: "custom", key: "servings") {
      value
    }
    estimated_delivery: metafield(namespace: "custom", key: "estimated_delivery") {
      value
    }
    delivery_override: metafield(namespace: "custom", key: "delivery_lead_time") {
      value
    }
    average_rating: metafield(namespace: "custom", key: "average_rating") {
      value
    }
    rating_count: metafield(namespace: "custom", key: "rating_count") {
      value
    }
    collections(first: 10) {
      nodes {
        id
        leadTime: metafield(namespace: "custom", key: "delivery_lead_time") {
          value
        }
      }
    }
    bogo_free_item: metafield(namespace: "custom", key: "bogo_free_item") {
      value
      reference {
        ... on ProductVariant {
          id
        }
      }
    }
    # ---------------------------------------

    selectedVariant: variantBySelectedOptions(selectedOptions: $selectedOptions) {
      ...ProductVariant
    }
    variants(first: 100) {
      nodes {
        ...ProductVariant
      }
    }
    seo {
      description
      title
    }
    images(first: 10) {
      nodes {
        id
        url
        altText
        width
        height
      }
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
` as const;

const PRODUCT_QUERY = `#graphql
  query Product(
    $country: CountryCode
    $handle: String!
    $language: LanguageCode
    $selectedOptions: [SelectedOptionInput!]!

  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...Product
    }
  }
  ${PRODUCT_FRAGMENT}
` as const;

const PRODUCT_VARIANTS_FRAGMENT = `#graphql
  fragment ProductVariants on Product {
    variants(first: 250) {
      nodes {
        ...ProductVariant
      }
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
` as const;

const REVIEWS_QUERY = `#graphql
  query ProductReviews($type: String!) {
    metaobjects(type: $type, first: 250) {
      nodes {
        fields {
          key
          value
        }
      }
    }
  }
`;

const VARIANTS_QUERY = `#graphql
  ${PRODUCT_VARIANTS_FRAGMENT}
  query ProductVariants(
    $country: CountryCode
    $language: LanguageCode
    $handle: String!
  ) @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ...ProductVariants
    }
  }
` as const;

const RECOMMENDED_PRODUCTS_QUERY = `#graphql
  fragment ProductDetailRecommendedProduct on Product {
    id
    title
    handle
    availableForSale
    compareAtPriceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    priceRange {
      minVariantPrice {
        amount
        currencyCode
      }
    }
    images(first: 1) {
      nodes {
        id
        url
        altText
        width
        height
      }
    }
    visibility_start: metafield(namespace: "custom", key: "visibility_start") {
      value
    }
    visibility_end: metafield(namespace: "custom", key: "visibility_end") {
      value
    }
    average_rating: metafield(namespace: "custom", key: "average_rating") {
      value
    }
    rating_count: metafield(namespace: "custom", key: "rating_count") {
      value
    }
    bogo_free_item: metafield(namespace: "custom", key: "bogo_free_item") {
      value
      reference {
        ... on ProductVariant {
          id
        }
      }
    }
    variants(first: 1) {
      nodes {
        id
        title
        image {
          url
          altText
          width
          height
        }
        price {
          amount
          currencyCode
        }
        compareAtPrice {
          amount
          currencyCode
        }
        selectedOptions {
          name
          value
        }
        product {
          handle
          title
        }
        storeAvailability(first: 250) {
          nodes {
            available
            location {
              id
            }
          }
        }
      }
    }
  }
  query ProductRecommendations ($country: CountryCode, $language: LanguageCode)
    @inContext(country: $country, language: $language) {
    products(first: 4, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...ProductDetailRecommendedProduct
      }
    }
  }
` as const;

