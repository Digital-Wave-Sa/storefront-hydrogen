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
    <div dir={isEn ? 'ltr' : 'rtl'} className={`w-full bg-[#fafafa] ${isEn ? 'font-en' : 'font-ar'}`}>
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
        <div className="w-full bg-[#234745] relative overflow-hidden py-6 md:py-12">
          {/* Background Texture */}
          <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                  backgroundImage: `url(${patternBg})`,
                  backgroundSize: 'max(100vw, 1200px) auto',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
              }}
          />
          <div className={`max-w-[1400px] mx-auto px-4 md:px-8 relative z-10 flex ${isEn ? 'justify-end' : 'justify-start'}`}>
            <button 
              onClick={() => window.history.back()} 
              className={`flex items-center justify-center gap-[24px] bg-[#9FB7AE] hover:bg-[#8ca39a] text-[#234745] px-[32px] h-[48px] rounded-[100px] transition-all font-bold ${isEn ? 'flex-row' : 'flex-row-reverse'}`}
              style={{ fontFamily: "'GE Dinar One', sans-serif", fontSize: '16px' }}
            >
              <span className="mt-[2px]">{isEn ? 'Back' : 'رجوع'}</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${isEn ? 'group-hover:-translate-x-1' : 'group-hover:translate-x-1'}`}>
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* White Breadcrumb Section */}
        <div className="w-full bg-[#FFFFFF] border-b border-[#9FB7AE] h-[56px] flex items-center">
          <div className="max-w-[1400px] w-full mx-auto px-4 md:px-8">
            <div className="flex items-center gap-[8px]" style={{ fontFamily: "'GE Dinar One', sans-serif", fontSize: '16px', lineHeight: '20px' }}>
              <Link to={isEn ? "/en" : "/"} className="!text-[#7D7D7D] font-medium hover:!text-[#234745] transition-colors">{isEn ? 'Home' : 'الرئيسية'}</Link> 
              <span className="!text-[#7D7D7D] font-medium">/</span>
              <Link to={isEn ? "/en/collections/all" : "/collections/all"} className="!text-[#7D7D7D] font-medium hover:!text-[#234745] transition-colors">{isEn ? 'Products' : 'المنتجات'}</Link> 
              <span className="!text-[#7D7D7D] font-medium">/</span>
              <span className="!text-[#171717] font-bold">{product.title}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full h-10 bg-white shadow-sm mb-8 hidden"></div>

      {/* 2. Main Product Section (Identical 3-Column Layout) */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 pt-8 md:pt-12 pb-[64px] grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">

        {/* RIGHT COLUMN: Image Gallery (Takes 4 cols, Right-most in RTL) */}
        <div className="lg:col-span-4 flex flex-col gap-6 relative order-1">
          <ProductGallery images={product.images?.nodes || (selectedVariant?.image ? [selectedVariant.image] : [])} product={product} />
        </div>

        {/* MIDDLE COLUMN: Details & Variants (Takes 5 cols, Center) */}
        <div className="lg:col-span-5 flex flex-col pt-2 order-2">
          {/* High-Fidelity Header Section */}
          <div className="flex flex-col gap-0 w-full max-w-[519px] items-start">
            {/* Vendor (Sub Title) */}
            <span 
              className="text-[#906B51] block mb-[16px] text-start"
              style={{
                fontFamily: "'GE Dinar One', sans-serif",
                fontWeight: 700,
                fontSize: '12px',
                lineHeight: '15px',
              }}
            >
              {product.vendor || (isEn ? 'Chocolate' : 'الشوكولاته')}
            </span>

            <div className="flex flex-wrap items-center gap-[12px] mb-[24px] w-full justify-start">
              <h1 
                className="text-[#171717] w-full"
                style={{
                  fontFamily: "'Bahij Janna', sans-serif",
                  fontWeight: 700,
                  fontSize: '26px',
                  lineHeight: '1.2',
                  textAlign: isEn ? 'left' : 'right',
                  verticalAlign: 'middle',
                  letterSpacing: '0%',
                  margin: 0
                }}
              >
                {product.title}
              </h1>
              {isBogo && (
                  <span className="text-[12px] font-black px-3 py-1.5 rounded-xl shadow-sm bg-[#FF6B6B] text-white flex items-center gap-1.5 shrink-0 mt-2">
                      <span>🎁</span> {isEn ? 'Buy 1 Get 1 Free' : '1+1 مجاناً'}
                  </span>
              )}
            </div>
            
            {/* Rating & Availability Row */}
            <div className="flex flex-wrap items-center gap-[12px] mb-[24px] w-full justify-start">
              
              {/* Reviews & Stars */}
              <div className="flex items-center gap-[16px]">
                  <StarRating rating={dynamicRating || 0} count={0} locale={locale} size="sm" hideText={true} />
                  <div className="flex items-center gap-[9px]">
                     <span className="text-[#171717] text-[12px] font-bold" style={{ fontFamily: "'GE Dinar One', sans-serif", lineHeight: '100%' }}>
                       {new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'ar-EG', { minimumFractionDigits: 1 }).format(dynamicRating || 0)}
                     </span>
                     <span className="text-[#7D7D7D] text-[12px] font-normal" style={{ fontFamily: "'GE Dinar One', sans-serif", lineHeight: '100%' }}>
                       {isEn ? `(${dynamicCount || 0} Reviews)` : `(${new Intl.NumberFormat('ar-EG').format(dynamicCount || 0)} مراجعة)`}
                     </span>
                  </div>
              </div>

              <span className="text-[#7D7D7D] text-[12px]">|</span>

              {/* Availability */}
              <div className="flex items-center gap-[6px]">
                 <span className="w-[6px] h-[6px] bg-[#255441] rounded-full"></span>
                 <span className="text-[#255441] text-[12px] font-bold" style={{ fontFamily: "'GE Dinar One', sans-serif", lineHeight: '100%' }}>
                    {isEn ? 'Available' : 'متوفر'}
                 </span>
              </div>
            </div>

            {/* Info Cards Row */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-[12px] mb-[24px] w-full">
              {/* Servings Card */}
              <div className="flex-1 min-w-[100px] h-[64px] rounded-[12px] border border-[#D2D2D2] flex flex-col items-center justify-center relative">
                 <span className="text-[#234745] text-[16px] font-bold absolute top-[8px]" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                   {(product as any).servings?.value || (isEn ? '4-6' : '٤–٦')}
                 </span>
                 <span className="text-[#9FB7AE] text-[12px] font-bold absolute top-[36px] w-full text-center px-1 truncate" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                   {isEn ? 'Serves' : 'يكفي أشخاص'}
                 </span>
              </div>

              {/* Prep Time Card */}
              <div className="flex-1 min-w-[100px] h-[64px] rounded-[12px] border border-[#D2D2D2] flex flex-col items-center justify-center relative">
                 <div className="absolute top-[8px] flex items-center gap-1">
                   <span className="text-[#234745] text-[16px] font-bold" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                     {new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'ar-EG').format(parseInt((product as any).prep_time?.value || '20'))}
                   </span>
                   <span className="text-[#234745] text-[16px] font-bold" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>{isEn ? 'min' : 'دقيقة'}</span>
                 </div>
                 <span className="text-[#9FB7AE] text-[12px] font-bold absolute top-[36px] w-full text-center px-1 truncate" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                   {isEn ? 'Prep Time' : 'وقت التجهيز'}
                 </span>
              </div>

              {/* Calories Card */}
              <div className="flex-1 min-w-[100px] h-[64px] rounded-[12px] border border-[#D2D2D2] flex flex-col items-center justify-center relative">
                 <span className="text-[#234745] text-[16px] font-bold absolute top-[8px]" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                   {new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'ar-EG').format(parseInt((product as any).calories?.value || '240'))}
                 </span>
                 <span className="text-[#9FB7AE] text-[12px] font-bold absolute top-[36px] w-full text-center px-1 truncate" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                   {isEn ? 'Calories' : 'سعر حراري'}
                 </span>
              </div>
            </div>

            {/* Premium Price Box */}
            <div className="w-full h-auto py-[16px] bg-[#FEF8EB] rounded-[16px] border border-[#BBCFCD]/50 flex flex-col justify-center px-[24px] mb-[24px] relative">
               <div className="flex items-center gap-[12px] w-full justify-start">
                 <span 
                    className="text-[#234745] font-bold" 
                    style={{ 
                      fontFamily: "'Bahij Janna', sans-serif", 
                      fontSize: '32px',
                      lineHeight: '1.2',
                      textAlign: isEn ? 'left' : 'right',
                      verticalAlign: 'middle'
                    }}
                 >
                   {selectedVariant?.price?.amount || '0'}
                 </span>
                 <SaudiRiyalSymbol className="h-[28px] w-[28px] text-[#255441]" />
               </div>
               <span 
                 className="text-[#9FB7AE] font-medium w-full mt-[4px]" 
                 style={{ 
                   fontFamily: "'GE Dinar One', sans-serif",
                   fontSize: '14px',
                   lineHeight: '1.2',
                   textAlign: isEn ? 'left' : 'right',
                   verticalAlign: 'middle'
                 }}
               >
                 {isEn ? 'VAT Inclusive 15%' : 'شامل ضريبة القيمة المضافة ١٥٪'}
               </span>
            </div>

            {/* Description */}
            <p 
              className="text-[#7D7D7D] font-normal w-full" 
              style={{ 
                fontFamily: "'GE Dinar One', sans-serif",
                fontSize: '16px',
                textAlign: isEn ? 'left' : 'right',
                verticalAlign: 'middle',
                letterSpacing: '0%',
                marginBottom: '32px',
                lineHeight: '1.6'
              }}
            >
              {product.seo?.description || (product.description && product.description.length > 150 ? product.description.substring(0, 150) + '...' : product.description) || (isEn ? 'Saadeddin offers the finest chocolate selection, prepared with passion and modern techniques.' : 'تشكيلة فاخرة من أجود أنواع الشوكولاتة المختارة، محضّرة بأحدث التقنيات مع محافظة تامة على الطعم الأصيل والجودة العالية.')}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap items-center gap-[12px] mb-[24px] w-full" style={{ marginTop: '32px' }}>
              <div className="h-[40px] px-[16px] bg-[#FEF8EB] rounded-[25px] border border-[#BBCFCD]/50 flex items-center justify-center whitespace-nowrap">
                <span className="text-[#255441] text-[14px] font-normal" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>{isEn ? 'Vegan 100%' : 'نباتي 100%'}</span>
              </div>
              <div className="h-[40px] px-[16px] bg-[#FEF8EB] rounded-[25px] border border-[#BBCFCD]/50 flex items-center justify-center whitespace-nowrap">
                <span className="text-[#255441] text-[14px] font-normal" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>{isEn ? 'Lactose Free' : 'خالٍ من اللاكتوز'}</span>
              </div>
              <div className="h-[40px] px-[16px] bg-[#FEF8EB] rounded-[25px] border border-[#BBCFCD]/50 flex items-center justify-center whitespace-nowrap">
                <span className="text-[#255441] text-[14px] font-normal" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>{isEn ? 'Gluten Free' : 'خالٍ من الغلوتين'}</span>
              </div>
            </div>
            
            {/* Divider */}
            <div className="w-full h-[1px] bg-[#BBCFCD]/50 mb-[24px]"></div>
          </div>

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
                    <div className="flex flex-col gap-6 mt-4 bg-[#FEF8EB] p-6 rounded-[24px] border border-[#BBCFCD]/50 shadow-sm relative overflow-hidden w-full" style={{ maxWidth: '519px' }}>
                      {/* Decorative background element */}
                      <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#BBCFCD]/20 rounded-full blur-3xl pointer-events-none"></div>
                      
                      <div className="flex flex-row items-center justify-between relative z-10">
                        <div className="flex flex-row items-center gap-3">
                           <div className="w-10 h-10 bg-[#234745] rounded-full flex items-center justify-center shadow-sm">
                             <span className="text-white text-[18px]">🎁</span>
                           </div>
                           <h5 className="font-bold text-[#234745] text-[20px]" style={{ fontFamily: "'Bahij Janna', sans-serif" }}>
                             {isEn ? 'Bundle Includes:' : 'محتويات العرض:'}
                           </h5>
                        </div>
                        {bundleSavings && bundleSavings > 0 && (
                           <div className="flex flex-col items-end">
                             <span className="text-[#906B51] text-[12px] font-bold mb-1" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                               {isEn ? 'You Save' : 'توفير العرض'}
                             </span>
                             <span className="bg-[#234745] text-white text-[14px] font-bold px-3 py-1 rounded-[8px] shadow-sm" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                               {new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'ar-EG').format(bundleSavings)} {isEn ? 'SAR' : 'ر.س'}
                             </span>
                           </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col relative z-10">
                        {bundleComponents.map((component: any, index: number) => {
                          const compVariant = component.variants?.nodes?.[0];
                          const compPrice = compVariant?.price;
                          return (
                            <div key={component.id} className="flex flex-col w-full">
                                {index > 0 && (
                                    <div className="flex justify-center -my-3 z-20 relative">
                                        <div className="w-8 h-8 bg-[#FEF8EB] rounded-full flex items-center justify-center border-2 border-[#BBCFCD] text-[#234745] font-black text-[18px] shadow-sm">
                                            +
                                        </div>
                                    </div>
                                )}
                                <div className="flex flex-row items-center gap-4 bg-white border border-[#BBCFCD]/30 rounded-[16px] p-4 shadow-sm transition-all hover:border-[#234745] hover:shadow-md">
                                   <div className="w-20 h-20 rounded-[12px] bg-[#f9f9f9] overflow-hidden flex-shrink-0 relative border border-gray-100">
                                     {component.featuredImage ? (
                                       <Image data={component.featuredImage} className="object-cover w-full h-full" sizes="80px" />
                                     ) : (
                                       <div className="w-full h-full flex items-center justify-center text-gray-300 text-[10px]">{isEn ? 'No Image' : 'لا توجد صورة'}</div>
                                     )}
                                   </div>
                                   <div className="flex flex-col flex-grow text-start">
                                     <span className="text-[16px] font-bold text-[#1a1a1a] line-clamp-2 leading-tight" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                                       {component.title}
                                     </span>
                                     {compPrice && (
                                       <div className="flex flex-row items-center gap-1 text-[#906B51] text-[14px] font-bold mt-2 justify-start" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                                         <span>{isEn ? 'Value: ' : 'القيمة: '}</span>
                                         <Price data={compPrice} isEn={isEn} size="sm" />
                                       </div>
                                     )}
                                   </div>
                                </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Addons Section (High Fidelity) */}
                  {addonNodes.length > 0 && (
                    <div className="flex flex-col gap-[16px] w-full" style={{ width: '519px' }}>
                      <h5 className="font-bold text-[#255441] text-[18px] text-start" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                        {isEn ? 'Add-ons' : 'إضافات'}
                      </h5>
                      <div className="flex flex-col gap-[8px]">
                        {addonNodes.map((addon: any) => {
                          const variant = addon.variants.nodes[0];
                          const isSelected = selectedAddons.includes(variant.id);
                          const outOfStock = !addon.availableForSale;

                          return (
                            <div
                              key={addon.id}
                              className={`w-full h-[64px] px-[16px] rounded-[12px] border transition-all flex items-center justify-between shadow-sm cursor-pointer ${
                                isSelected ? 'border-[#234745] bg-[#f0f4f2]' : 'border-[#D2D2D2] bg-white hover:border-gray-300'
                              } ${outOfStock ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                              onClick={() => !outOfStock && handleAddonToggle(variant.id)}
                            >
                              <div className="flex items-center gap-[12px] flex-row">
                                {/* Checkbox */}
                                <div className={`w-[20px] h-[20px] rounded-[4px] border flex items-center justify-center transition-colors ${
                                  isSelected ? 'bg-[#255441] border-[#255441]' : 'border-[#9FB7AE] bg-white'
                                }`}>
                                  {isSelected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>}
                                </div>
                                
                                <p className="text-[16px] font-bold text-[#171717]" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                                  {isEn ? addon.title : (addon.title === ' متوفر الان' ? 'متوفر الان' : addon.title)}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 text-[16px] text-[#255441] font-bold" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                                <span>+</span>
                                {new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'ar-EG').format(parseFloat(variant.price.amount))} {isEn ? 'SAR' : 'ر.س'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Gift Toggle (Exact Mockup Match) */}
                  {isGiftable && (
                    <div className="w-full mt-[8px] max-w-[519px]">
                      <div className="bg-white border border-[#E5E5E5] rounded-[16px] p-[16px] flex items-center justify-between">
                         {/* Text */}
                         <div className="flex flex-col justify-center items-start">
                            <span 
                              className="font-bold text-[#234745] text-[18px]"
                              style={{ fontFamily: "'Bahij Janna', sans-serif", lineHeight: '100%' }}
                            >
                               {isEn ? 'Send as a Gift' : 'أرسل كهدية'}
                            </span>
                            <span 
                              className="text-[#7D7D7D] text-[14px] mt-[8px]"
                              style={{ fontFamily: "'GE Dinar One', sans-serif", lineHeight: '100%' }}
                            >
                               {isEn ? 'Add a message and special packaging for the recipient' : 'أضف رسالة وتغليف مميز للمستلم'}
                            </span>
                         </div>

                         {/* Toggle */}
                         <div 
                            className={`w-[56px] shrink-0 h-[32px] flex items-center rounded-full p-[4px] transition-colors duration-300 cursor-pointer ${isGiftMode ? 'bg-[#234745]' : 'bg-[#E5E5E5]'}`} 
                            onClick={() => setIsGiftMode(!isGiftMode)}
                          >
                            <div className={`bg-[#FEF8EB] w-[24px] h-[24px] rounded-full shadow-sm transform transition-transform duration-300 ${isGiftMode ? (isEn ? 'translate-x-[24px]' : 'translate-x-[-24px]') : 'translate-x-0'}`}></div>
                         </div>
                      </div>
                      
                      {isGiftMode && (
                         <div className="mt-[16px] flex flex-col gap-4 animate-fade-in p-[16px] bg-[#fdfdfd] border border-gray-100 rounded-[12px]">
                            <div className="flex flex-col gap-2">
                               <label className="text-[13px] font-bold text-[#1a1a1a] text-start">{isEn ? 'Recipient Name' : 'اسم المستلم'}</label>
                               <input type="text" value={recipientName} onChange={e => setRecipientName(e.target.value)} className="w-full p-3 text-[14px] border border-[#BBCFCD]/50 rounded-[8px] focus:ring-[#234745] focus:border-[#234745] bg-white font-medium text-start" placeholder={isEn ? "e.g. Sarah" : "مثال: سارة"} />
                            </div>
                            <div className="flex flex-col gap-2">
                               <label className="text-[13px] font-bold text-[#1a1a1a] text-start">{isEn ? 'Gift Message' : 'رسالة إهداء'}</label>
                               <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} className="w-full p-3 text-[14px] border border-[#BBCFCD]/50 rounded-[8px] focus:ring-[#234745] focus:border-[#234745] resize-none bg-white font-medium text-start" placeholder={isEn ? "Write a lovely message..." : "اكتب رسالة جميلة..."}></textarea>
                            </div>
                            <label className="flex items-center gap-3 cursor-pointer group flex-row">
                               <input type="checkbox" checked={hideSender} onChange={e => setHideSender(e.target.checked)} className="w-[18px] h-[18px] rounded-[4px] text-[#234745] focus:ring-[#234745] border-[#BBCFCD]/50" />
                               <span className="text-[13px] font-medium text-[#7D7D7D] group-hover:text-[#234745] transition-colors">{isEn ? 'Hide my name (Anonymous Gift)' : 'إخفاء اسمي (هدية سرية)'}</span>
                            </label>
                         </div>
                      )}
                    </div>
                  )}

                  {/* Old Tags section removed as they are now at the top */}
                </div>
              )}
            </Await>
          </Suspense>
        </div>

        {/* LEFT COLUMN: Sticky Info Sidebar (Takes 3 cols, Left-most in RTL) */}
        <div className="lg:col-span-3 flex flex-col gap-4 order-3 w-full">
          <div className="lg:sticky lg:top-24 flex flex-col gap-4 w-full lg:w-[301px]">
            
            {/* Action Box Container */}
            <div className="bg-white rounded-[20px] p-4 border border-[#BBCFCD]/50 flex flex-col gap-6">
                
                <div className="flex flex-col gap-6">
                  {/* 1. Payment Promo Banner */}
                  <div className="bg-[#FEF8EB] rounded-[16px] py-[12px] px-[16px] border border-[#BBCFCD]/50 flex flex-col items-center justify-center gap-2">
                     <div className="flex items-center justify-center gap-[16px] w-full h-[32px]">
                         {/* Logos - Optically balanced heights */}
                         <img src="/images/icons/apple-pay.png" className="h-[15px] object-contain" alt="Apple Pay" />
                         <img src="/images/icons/mastercard.png" className="h-[18px] object-contain" alt="Mastercard" />
                         <img src="/images/icons/visa.png" className="h-[14px] object-contain" alt="Visa" />
                         <img src="/images/icons/mada.png" className="h-[24px] object-contain scale-[1.7] origin-center" alt="Mada" />
                     </div>
                     <span className="text-[14px] font-bold text-[#234745] text-center" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                         {isEn ? 'Split it into 4 interest-free payments' : 'قسّطها على ٤ دفعات بدون فوائد'}
                     </span>
                  </div>

                  {/* 2. Quantity */}
                  <div className="flex items-center justify-between h-[40px] w-full">
                      <span className="font-medium text-[#171717] text-[16px]" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                         {isEn ? 'Quantity' : 'الكمية'}
                      </span>
                      <div className="flex items-center gap-[8px]">
                          <button 
                              onClick={() => setQuantity(Math.max(1, quantity - 1))}
                              className="w-[40px] h-[40px] flex items-center justify-center bg-white rounded-[8px] text-[#906B51] border border-[#BBCFCD]/50 hover:border-[#234745] transition-all"
                          >
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14" /></svg>
                          </button>
                          <div className="w-[40px] h-[40px] flex items-center justify-center bg-white rounded-[8px] border border-[#BBCFCD]/50 font-medium text-[16px] text-[#255441]" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                              {new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'ar-EG').format(quantity)}
                          </div>
                          <button 
                              onClick={() => setQuantity(quantity + 1)}
                              className="w-[40px] h-[40px] flex items-center justify-center bg-white rounded-[8px] text-[#234745] border border-[#BBCFCD]/50 hover:border-[#234745] transition-all"
                          >
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                          </button>
                      </div>
                  </div>
                </div>

                {/* 3. Actions */}
                <div className="flex flex-col gap-4">
                  {isVisibilityBlocked ? (
                    <div className="w-full bg-gray-100 text-gray-400 py-3 rounded-full text-[16px] font-bold flex items-center justify-center gap-2 cursor-not-allowed">
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
                        className={`w-full h-[48px] ${effectiveOutOfStock ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#234745] hover:bg-[#1a3533] active:scale-[0.98]'} text-white rounded-[25px] flex items-center justify-center gap-[8px] transition-all`}
                      >
                        {effectiveOutOfStock ? (
                          isEn ? 'Out of Stock' : 'نفذت الكمية'
                        ) : (
                          <>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                                <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
                            </svg>
                            <span style={{ fontFamily: "'GE Dinar One', sans-serif", fontWeight: 700, fontSize: '16px', lineHeight: '20px' }}>{isEn ? 'Add to Cart' : 'أضف إلي السلة'}</span>
                          </>
                        )}
                      </AddToCartButton>

                      {/* Buy Now */}
                      <button className="w-full h-[48px] bg-[#EED5D7] hover:bg-[#e4d0d0] active:scale-[0.98] transition-all text-[#E64950] rounded-[25px] flex items-center justify-center gap-[8px]">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                           <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4Z" />
                           <line x1="3" y1="6" x2="21" y2="6" />
                           <path d="M16 10a4 4 0 01-8 0" />
                        </svg>
                        <span style={{ fontFamily: "'GE Dinar One', sans-serif", fontWeight: 700, fontSize: '16px', lineHeight: '20px' }}>{isEn ? 'Buy Now' : 'إشتري الان'}</span>
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
                  <div className={`bg-[#FEF8EB] rounded-[20px] p-[16px] border border-[#BBCFCD]/50 flex flex-col gap-0 text-start`}>
                      {/* Item 1: Free Delivery */}
                      <div className="py-[12px] flex flex-col justify-center items-center gap-[4px] text-center">
                          <h4 className="font-bold text-[14px] text-[#234745] leading-[17px]" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>{isEn ? 'Free Delivery' : 'توصيل مجاني'}</h4>
                          <p className="text-[12px] text-[#7D7D7D] font-normal leading-[15px]" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                              {isEn 
                                ? `On orders above ${threshold} SAR` 
                                : `للطلبات فوق ${new Intl.NumberFormat('ar-EG').format(threshold)} ر.س`}
                          </p>
                      </div>
                      <div className="h-[1px] w-full bg-[#BBCFCD]/50"></div>
                      
                      {/* Item 2: Branch Pickup */}
                      <div className="py-[12px] flex flex-col justify-center items-center gap-[4px] text-center">
                          <h4 className="font-bold text-[14px] text-[#234745] leading-[17px]" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>{isEn ? 'Branch Pickup' : 'استلام من الفرع'}</h4>
                          <p className="text-[12px] text-[#7D7D7D] font-normal leading-[15px]" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                              {isEn ? 'Ready in 15 minutes' : 'جاهز خلال 15 دقيقة'}
                          </p>
                      </div>
                      <div className="h-[1px] w-full bg-[#BBCFCD]/50"></div>

                      {/* Item 3: Guaranteed Return */}
                      <div className="py-[12px] flex flex-col justify-center items-center gap-[4px] text-center">
                          <h4 className="font-bold text-[14px] text-[#234745] leading-[17px]" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>{isEn ? 'Guaranteed Return' : 'استرجاع مضمون'}</h4>
                          <p className="text-[12px] text-[#7D7D7D] font-normal leading-[15px]" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                              {isEn ? 'Within 24 hours of receipt' : 'خلال 24 ساعة من الاستلام'}
                          </p>
                      </div>
                      <div className="h-[1px] w-full bg-[#BBCFCD]/50"></div>

                      {/* Item 4: Secure Payment */}
                      <div className="py-[12px] flex flex-col justify-center items-center gap-[4px] text-center">
                          <h4 className="font-bold text-[14px] text-[#234745] leading-[17px]" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>{isEn ? '100% Secure Payment' : 'دفع آمن 100%'}</h4>
                          <p className="text-[12px] text-[#7D7D7D] font-normal leading-[15px]" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
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
      <div className="w-full bg-[#FEF8EB] py-[56px] flex flex-col items-center">
        <div className="w-full max-w-[1280px] px-4 md:px-0 flex flex-col items-start gap-[24px]">
          
          {/* Tabs Header */}
          <div className="w-full flex flex-col gap-[16px] items-start relative">
              <div className="flex flex-row items-center gap-[48px]">
                  <button 
                      onClick={() => setActiveTab('details')}
                      className={`text-[18px] transition-all flex items-center justify-center w-[128px] h-[24px] ${activeTab === 'details' ? 'text-[#255441] font-bold' : 'text-[#7D7D7D] font-medium'}`}
                      style={{ fontFamily: "'GE Dinar One', sans-serif", lineHeight: '22px' }}
                  >
                      {isEn ? 'Product Description' : 'وصف المنتج'}
                  </button>
                  <button 
                      onClick={() => setActiveTab('reviews')}
                      className={`text-[18px] transition-all flex items-center justify-center w-[128px] h-[24px] ${activeTab === 'reviews' ? 'text-[#255441] font-bold' : 'text-[#7D7D7D] font-medium'}`}
                      style={{ fontFamily: "'GE Dinar One', sans-serif", lineHeight: '22px' }}
                  >
                      {isEn ? `Reviews (${reviews?.length || 0})` : `المراجعات (${new Intl.NumberFormat('ar-EG').format(reviews?.length || 0)})`}
                  </button>
              </div>
              
              {/* Lines container */}
              <div className="w-full relative h-[2px]">
                  {/* Full width muted line */}
                  <div className="absolute top-0 left-0 w-full border-t border-[#BBCFCD]/50"></div>
                  {/* Active Indicator Line */}
                  <div 
                     className="absolute top-[-1px] border-t-[2px] border-[#234745] transition-all duration-300 w-[128px]"
                     style={{
                        [isEn ? 'left' : 'right']: activeTab === 'details' ? '0' : '176px'
                     }}
                  ></div>
              </div>
          </div>

          {/* Tab Content */}
          <div className="w-full animate-fade-in text-start">
            {activeTab === 'details' ? (
              <div className="w-full">
                  <div 
                    className="text-[#171717] leading-[24px] font-normal text-[16px] mb-[20px] [&>p]:mb-[16px] last:[&>p]:mb-0"
                    style={{ fontFamily: "'GE Dinar One', sans-serif" }}
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
                <div className="flex flex-col gap-[32px] w-full mt-[16px]">
                    {/* Minimalist Rating Summary */}
                    <div className="flex flex-col md:flex-row justify-between items-center md:items-start w-full gap-8 md:gap-4">
                        {/* Rating Value (Right side in RTL naturally) */}
                        <div className="flex flex-col items-center gap-[4px]">
                            <h3 className="text-[48px] font-bold text-[#171717] leading-none m-0 p-0" style={{ fontFamily: "'Inter', 'Bahij Janna', sans-serif" }} dir="ltr">
                                {loaderRating.toFixed(1)}
                            </h3>
                            <div className="mt-[4px]">
                                <StarRating rating={loaderRating} size="sm" locale={locale} hideText />
                            </div>
                            <span className="text-[12px] text-[#7D7D7D] font-normal mt-[8px]" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                                {isEn ? `(${reviews?.length || 0} reviews)` : `(${new Intl.NumberFormat('ar-EG').format(reviews?.length || 0)} مراجعة)`}
                            </span>
                        </div>

                        {/* Progress Bars (Left side in RTL naturally) */}
                        <div className="flex flex-col gap-[8px] w-full md:w-[320px]">
                            {[5, 4, 3, 2, 1].map(star => {
                                const count = reviews.filter((r: any) => Math.round(parseFloat(r.rating)) === star).length;
                                const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                                return (
                                    <div key={star} className="flex items-center gap-[12px]">
                                        {/* Star icon & Number */}
                                        <div className="flex items-center gap-[4px] w-[28px] justify-end">
                                            <span className="text-[12px] font-medium text-[#7D7D7D]" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                                                {new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'ar-EG').format(star)}
                                            </span>
                                            <span className="text-amber-400 text-[12px]">★</span>
                                        </div>
                                        {/* Bar */}
                                        <div className="flex-1 h-[4px] bg-[#BBCFCD]/50 rounded-full overflow-hidden relative">
                                            <div 
                                                className="absolute top-0 bottom-0 bg-[#234745] rounded-full transition-all duration-1000"
                                                style={{ 
                                                    width: `${percentage}%`,
                                                    [isEn ? 'left' : 'right']: 0 
                                                }}
                                            />
                                        </div>
                                        {/* Count */}
                                        <div className="w-[20px] text-[12px] font-medium text-[#7D7D7D] text-start" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                                            {new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'ar-EG').format(count)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Write Review Button Link */}
                    <div className="flex justify-end w-full">
                        <button 
                            onClick={() => setShowReviewForm(!showReviewForm)}
                            className="text-[14px] text-[#255441] font-bold underline hover:text-[#1a3a2d] transition-colors"
                            style={{ fontFamily: "'GE Dinar One', sans-serif" }}
                        >
                            {isEn ? 'Write a Review' : 'أضف مراجعة'}
                        </button>
                    </div>

                    {/* Review Form */}
                    {showReviewForm && (
                        <div className="bg-white p-8 rounded-[16px] border border-[#E5E5E5] shadow-sm animate-fade-in relative mb-[16px]">
                            <div className="flex justify-between items-center mb-6">
                                <h4 className="text-[18px] font-bold text-[#234745]" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                                    {isEn ? 'Share your experience' : 'شاركنا تجربتك'}
                                </h4>
                                <button onClick={() => setShowReviewForm(false)} className="text-gray-400 hover:text-red-500 transition-all">
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

                    {/* Reviews List */}
                    <div className="flex flex-col gap-[16px] w-full">
                        {processedReviews && processedReviews.length > 0 ? (
                            processedReviews.map((review: any, idx: number) => (
                                <div key={idx} className="w-full bg-white p-[24px] rounded-[16px] border border-[#E5E5E5] flex flex-col gap-[16px]">
                                    <div className="w-full flex justify-between items-start">
                                        {/* User Info (Right side naturally) */}
                                        <div className="flex items-center gap-[12px]">
                                            <div className="w-[40px] h-[40px] bg-[#BBCFCD] rounded-full flex items-center justify-center text-[#255441] text-[18px] font-bold" style={{ fontFamily: "'GE Dinar One', sans-serif", paddingTop: '2px' }}>
                                                {review.customer_name?.charAt(0).toUpperCase() || 'U'}
                                            </div>
                                            <div className="flex flex-col items-start">
                                                <h5 className="text-[16px] font-bold text-[#255441] leading-tight" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                                                    {review.customer_name}
                                                </h5>
                                                <span className="text-[14px] text-[#BBCFCD] font-normal" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                                                    {new Date(review.created_at || Date.now()).toLocaleDateString(locale === 'en' ? 'en-US' : 'ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Stars (Left side naturally) */}
                                        <div dir="ltr">
                                            <StarRating rating={review.rating} size="sm" locale={locale} hideText />
                                        </div>
                                    </div>

                                    {/* Review Comment */}
                                    <div className="w-full text-start pr-[52px]">
                                        <p className="text-[#7D7D7D] text-[14px] font-normal leading-[24px]" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                                            {review.review_comment || review.comment}
                                        </p>
                                    </div>

                                    {/* Verified Buyer */}
                                    <div className="w-full flex justify-start pr-[52px]">
                                        <div className="flex items-center gap-[6px]">
                                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M14.6666 7.38674V8.00007C14.6658 9.43769 14.2003 10.8365 13.3395 11.9879C12.4788 13.1394 11.2688 13.9818 9.88907 14.3893C8.50931 14.7968 7.03402 14.7471 5.68417 14.2491C4.33433 13.751 3.18187 12.8315 2.40049 11.6288C1.61912 10.4261 1.25143 8.97298 1.35245 7.51004C1.45347 6.04711 2.01827 4.65089 2.96162 3.52355C3.90497 2.3962 5.17646 1.59591 6.58882 1.23846C8.00119 0.881006 9.48003 0.98592 10.8133 1.5334" stroke="#255441" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                                                <path d="M14.6666 2.66675L8.00001 9.34008L5.99999 7.34008" stroke="#255441" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                            <span className="text-[#255441] text-[12px] font-bold" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                                                {isEn ? 'Verified Buyer' : 'مشتري موثق'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-12 text-center">
                                <p className="text-gray-400 font-normal" style={{ fontFamily: "'GE Dinar One', sans-serif" }}>
                                    {isEn ? 'No reviews yet. Be the first!' : 'لا توجد مراجعات بعد. كن أول من يقيّم!'}
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
      <div className="w-full bg-[#FFFFFF] pb-32 pt-16">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between mb-[32px] w-full">
            <h2 
              className="font-bold text-[#171717] m-0"
              style={{ fontFamily: "'Bahij Janna', sans-serif", fontSize: '50px', lineHeight: '80px' }}
            >
              {isEn ? 'Related Products' : 'منتجات ذات صلة'}
            </h2>
            <Link 
              to={isEn ? "/en/collections/all" : "/collections/all"}
              className="bg-white border border-[#D2D2D2] px-[24px] py-[8px] rounded-[25px] font-bold text-[#234745] hover:bg-gray-50 transition-all flex items-center justify-center gap-[8px]"
              style={{ fontFamily: "'GE Dinar One', sans-serif", fontSize: '16px', lineHeight: '20px' }}
            >
              <span>{isEn ? 'View All' : 'عرض الكل'}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={isEn ? '' : 'rotate-180'}>
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[24px]">
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
    <div className="flex flex-col gap-[16px] w-full" style={{ width: '519px' }}>
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
            <div className="flex flex-col gap-[8px]" key={option.name}>
              <h5 
                className="font-bold text-[#255441] text-[18px] text-start w-full"
                style={{ fontFamily: "'GE Dinar One', sans-serif" }}
              >
                {label}
              </h5>
              <div className="flex flex-wrap gap-[12px] justify-start w-full">
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
                      className={`h-[48px] px-[24px] rounded-[25px] text-[14px] font-normal border transition-all flex items-center justify-center min-w-[100px] shadow-sm ${
                        isActive
                        ? 'bg-[#234745] border-[#234745] text-white'
                        : 'bg-white border-[#BBCFCD]/50 text-[#255441] hover:border-[#234745] hover:text-[#234745]'
                        } ${!isAvailable ? 'opacity-40 cursor-not-allowed' : ''}`}
                      style={{ fontFamily: "'GE Dinar One', sans-serif" }}
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

