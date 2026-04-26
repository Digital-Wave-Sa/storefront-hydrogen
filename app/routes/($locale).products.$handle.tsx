import { Suspense, useState, useEffect, useMemo } from 'react';
import { getProductVisibility, type VisibilityResult } from '~/lib/visibility';
import { StockNotificationModal } from '~/components/StockNotificationModal';
import { Price } from '~/components/Price';
import { StarRating, parseRatingValue } from '~/components/StarRating';
import { ReviewForm } from '~/components/ReviewForm';
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
} from '@shopify/hydrogen';
import { useAside } from '~/components/Aside';
import type { CartLineInput } from '@shopify/hydrogen/storefront-api-types';
import { getVariantUrl } from '~/utils';

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

export async function loader({ params, request, context }: LoaderFunctionArgs) {
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
  });

  // --- CROSS-LANGUAGE FIX ---
  // If product not found in current locale (e.g. Arabic handle in English context),
  // try fetching it explicitly in the Arabic context to see if it exists.
  if (!product?.id) {
    const { product: fallbackProduct } = await storefront.query(PRODUCT_QUERY, {
      variables: { 
        handle: decodedHandle, 
        selectedOptions,
        language: 'AR' // Force Arabic context for the fallback check
      },
    });
    
    if (!fallbackProduct?.id) {
       throw new Response(null, { status: 404 });
    }

    // Redirect to the default (Arabic) path for this product
    const url = new URL(request.url);
    const newPath = `/products/${decodedHandle}`;
    throw redirect(newPath + url.search, { status: 302 });
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
  // --- FETCH REVIEWS ---
  const reviewsData = await storefront.query(REVIEWS_QUERY, {
    variables: { type: 'storefront_review' }
  }).catch(() => ({ metaobjects: { nodes: [] } }));

  const allReviews = reviewsData?.metaobjects?.nodes?.map((node: any) => {
      const f: any = {};
      node.fields.forEach((field: any) => f[field.key] = field.value);
      return f;
  }) || [];

  const reviews = allReviews.filter((r: any) => 
      r.product_handle === handle && 
      r.status === 'Approved'
  );

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

  console.log(`DEBUG_TAGS (PDP) for ${product.title}:`, product.tags);

  return data({ product, variants, visibility, reviews, dynamicRating, dynamicCount });
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
  const { product, variants, visibility, reviews, dynamicRating, dynamicCount } = useLoaderData<typeof loader>();
  const rootData = useRouteLoaderData('root') as { locale: string, customer?: Promise<any> };
  const locale = rootData?.locale || 'ar';
  const isEn = locale === 'en';
  const customer = rootData?.customer;

  const { selectedVariant } = product;
  const { selectedLocationId, selectedLocationName } = useOutletContext<{ selectedLocationId?: string, selectedLocationName?: string }>();

  const storeAvailabilityNodes = (selectedVariant as any)?.storeAvailability?.nodes || [];
  
  const isGiftCard = Boolean(product.isGiftCard) || 
    product.handle.includes('gift-card') || 
    product.productType?.toLowerCase().includes('gift card');

  const isBundle = product.productType?.toLowerCase() === 'bundle' || product.tags?.some((t: string) => t.toLowerCase() === 'bundle');
  const bundleComponents = (product as any).bundle_components?.references?.nodes || [];

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
    if (isGiftCard) return !selectedVariant?.availableForSale;
    if (!selectedLocationId) return !selectedVariant?.availableForSale;

    // Is it a fallback branch? (Fallback IDs are like 'fallback-1')
    if (selectedLocationId.startsWith('fallback-')) {
      return !selectedVariant?.availableForSale;
    }

    const availableNode = storeAvailabilityNodes.find((node: any) => {
      const nodeId = node.location?.id;
      const nodeName = node.location?.name;
      if (!nodeId) return false;
      
      const normalize = (str: string) => str.trim().toLowerCase();

      // Compare GIDs, numeric IDs, or normalized names as a final fallback
      return (
        nodeId === selectedLocationId || 
        nodeId.split('/').pop() === selectedLocationId.split('/').pop() ||
        (selectedLocationName && normalize(nodeName) === normalize(selectedLocationName))
      );
    });

    // If we found the specific location in the stock list, use its status
    if (availableNode) return !availableNode.available;

    // If the API returned stock for SOME locations but not ours, it's truly out of stock here.
    if (storeAvailabilityNodes.length > 0) return true;

    // If NO store availability info was returned at all (empty list), fall back to global status
    return !selectedVariant?.availableForSale;
  }, [selectedLocationId, storeAvailabilityNodes, selectedVariant]);

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

  const addonNodes = (product as any).addons?.references?.nodes || [];

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

      {/* 1. Breadcrumb Header */}
      <div className="w-full bg-[#eaefed] py-4">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500 font-bold">
            <Link to={isEn ? "/en" : "/"} className="hover:text-[#295b45] transition-colors">{isEn ? 'Home' : 'الرئيسية'}</Link> <span className="text-gray-400">/</span>
            <Link to={isEn ? "/en/collections/all" : "/collections/all"} className="hover:text-[#295b45] transition-colors">{isEn ? 'Products' : 'المنتجات'}</Link> <span className="text-gray-400">/</span>
            <span className="text-[#1a1a1a] font-bold">{product.title}</span>
          </div>
          <button onClick={() => window.history.back()} className="flex items-center gap-2 bg-[#1b3d2e] text-white px-5 py-1.5 rounded-full text-sm font-bold opacity-90 hover:opacity-100 transition-opacity">
            {isEn ? 'Back' : 'رجوع'}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={isEn ? "" : "-rotate-180"}>
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="w-full h-10 bg-white shadow-sm mb-8 hidden"></div>

      {/* 2. Main Product Section */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 pt-8 md:pt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">

        {/* RIGHT COLUMN: Image Gallery (Takes 5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4 relative">
          <ProductGallery images={product.images?.nodes || (selectedVariant?.image ? [selectedVariant.image] : [])} />
        </div>

        {/* MIDDLE COLUMN: Details & Variants (Takes 4 cols) */}
        <div className="lg:col-span-4 flex flex-col pt-2 order-3 lg:order-none">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="flex items-center gap-2 text-sm text-[#c83e4a] font-bold border border-gray-100 p-1 px-3 rounded-md w-fit bg-red-50/50">
              {isEn ? (product.productType || 'Product') : (product.productType || 'منتج')}
            </div>
            
            {/* Bundle Badge */}
            {(product.productType?.toLowerCase() === 'bundle' || product.tags?.some((t: string) => t.toLowerCase() === 'bundle')) && (
              <span className="text-[11px] font-black px-3 py-1.5 rounded-lg shadow-sm bg-blue-600 text-white flex items-center gap-1.5">
                <span>📦</span>
                {isEn ? 'Bundle Offer' : 'عرض باقة'}
              </span>
            )}

            {/* BOGO Badge */}
            {product.tags?.some((t: string) => t.toLowerCase().includes('bogo')) && (
              <span className="text-[11px] font-black px-3 py-1.5 rounded-lg shadow-sm bg-orange-500 text-white flex items-center gap-1.5 animate-pulse">
                <span>🔥</span>
                {isEn ? 'BOGO Offer' : 'عرض اشتري واحد واحصل على الثاني مجاناً'}
              </span>
            )}

            {/* Payment Restriction Badges */}
            {product.tags?.some((t: string) => ['cash-only', 'payment:cash-only'].includes(t.toLowerCase().trim())) && (
              <div className="relative group/tooltip">
                <span className="text-[11px] font-black px-3 py-1.5 rounded-lg shadow-sm bg-[#27ae60] text-white flex items-center gap-1.5 border border-white/20 cursor-help">
                  <span>💵</span>
                  {isEn ? 'Cash Only' : 'كاش فقط'}
                </span>
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 p-2 bg-[#1b3d2e] text-white text-[10px] rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-20 shadow-xl">
                  {isEn ? 'This product is only available via cash payment on delivery.' : 'هذا المنتج متاح فقط عن طريق الدفع نقداً عند الاستلام.'}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1b3d2e]"></div>
                </div>
              </div>
            )}
            {product.tags?.some((t: string) => ['prepaid-only', 'payment:prepaid-only'].includes(t.toLowerCase().trim())) && (
              <div className="relative group/tooltip">
                <span className="text-[11px] font-black px-3 py-1.5 rounded-lg shadow-sm bg-[#2980b9] text-white flex items-center gap-1.5 border border-white/20 cursor-help">
                  <span>💳</span>
                  {isEn ? 'Paid Only' : 'دفع مسبق فقط'}
                </span>
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 p-2 bg-[#1b3d2e] text-white text-[10px] rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-20 shadow-xl">
                  {isEn ? 'This product requires online payment before fulfillment.' : 'هذا المنتج يتطلب الدفع عبر الإنترنت قبل التنفيذ.'}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#1b3d2e]"></div>
                </div>
              </div>
            )}
          </div>


          <h1 className="text-2xl font-black text-[#1a1a1a] mb-4 leading-tight">{product.title}</h1>

          <div className="flex items-center gap-2 mb-6 text-xs font-bold text-gray-500">
            {dynamicRating > 0 && (
              <>
                <StarRating 
                  rating={dynamicRating} 
                  count={dynamicCount} 
                  size="md"
                  locale={locale}
                />
                <span className="text-gray-300">|</span>
              </>
            )}
            <span className={`${isOutOfStock ? 'text-red-500' : 'text-[#295b45]'} flex items-center gap-1`}>
              <span className={`w-1.5 h-1.5 ${isOutOfStock ? 'bg-red-500' : 'bg-[#295b45]'} rounded-full inline-block`}></span>
              {isOutOfStock
                ? (isEn ? `Not available at ${selectedLocationName || 'this branch'}` : `غير متوفر في ${selectedLocationName || 'هذا الفرع'}`)
                : (isEn ? `Available at ${selectedLocationName || 'this branch'}` : `متوفر في ${selectedLocationName || 'هذا الفرع'}`)
              }
            </span>
          </div>

          {/* Pricing Box */}
          <div className={`rounded-xl p-5 mb-8 border border-transparent shadow-[0_2px_10px_rgba(0,0,0,0.03)] relative overflow-hidden ${isVisibilityBlocked ? 'bg-gray-100' : 'bg-[#f5eeea]'}`}>
            <div className="flex flex-col gap-1 items-start w-full relative z-10">
              {isVisibilityBlocked ? (
                <div className="flex items-center gap-3 w-full py-2">
                  <span className="text-2xl">{visibility.status === 'scheduled' ? '🕐' : '⚠️'}</span>
                  <span className="text-lg font-bold text-gray-500">{isEn ? 'Unavailable' : 'غير متاح'}</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4 justify-between w-full">
                    <div className="flex items-center gap-4">
                      {selectedVariant?.price && (
                        <Price 
                          data={selectedVariant.price} 
                          size="xl" 
                          isEn={isEn} 
                          className="text-[#295b45]"
                        />
                      )}
                    </div>
                    {selectedVariant?.compareAtPrice && selectedVariant?.price ? (
                      <span className="bg-[#dcdfdc] text-[#295b45] px-3 py-1 rounded-full text-xs font-bold font-en">
                        {isEn ? 'Save' : 'وفر'} {Math.round((1 - parseFloat(selectedVariant.price.amount) / parseFloat(selectedVariant.compareAtPrice.amount)) * 100)}%
                      </span>
                    ) : bundleSavings ? (
                      <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold font-en">
                        {isEn ? 'Bundle Price — Save' : 'سعر الباقة — وفر'} <Price data={{ amount: bundleSavings.toString(), currencyCode: selectedVariant!.price.currencyCode }} isEn={isEn} size="xs" />
                      </span>
                    ) : product.tags?.some((t: string) => t.toLowerCase().includes('bogo')) ? (
                      <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold font-en flex items-center gap-1.5 animate-pulse">
                        <span>🔥</span> {isEn ? 'Buy 1 Get 1 FREE' : 'اشتري واحد واحد مجاناً'}
                      </span>
                    ) : null}
                  </div>
                  {selectedVariant?.compareAtPrice && (
                    <div className="flex items-center gap-2 mt-1">
                       <span className="text-gray-400 text-xs font-bold">{isEn ? 'Original Price:' : 'السعر الأصلي:'}</span>
                       <Price 
                         data={selectedVariant.compareAtPrice} 
                         size="sm" 
                         isEn={isEn} 
                         className="text-gray-400 line-through"
                       />
                    </div>
                  )}
                  <p className="text-[#aeb5b5] text-[11px] font-medium mt-2">{isEn ? 'VAT Inclusive' : 'شامل ضريبة القيمة المضافة'} 15%</p>
                </>
              )}
            </div>
          </div>

          {isBundle && bundleComponents.length > 0 && (
            <div className="mb-10 bg-white border border-gray-100 rounded-[32px] p-8 shadow-sm relative overflow-hidden group/bundle">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#295b45]/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
              
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#295b45]/10 rounded-2xl flex items-center justify-center text-2xl shadow-inner">
                        📦
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-[#1b3d2e]">
                            {isEn ? 'Inside this bundle' : 'محتويات هذه الباقة'}
                        </h3>
                        <p className="text-[12px] font-bold text-[#295b45]/60 uppercase tracking-widest mt-0.5">
                            {isEn ? `${bundleComponents.length} Premium Items` : `${new Intl.NumberFormat('ar-EG').format(bundleComponents.length)} منتجات فاخرة`}
                        </p>
                    </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 min-w-[600px] md:min-w-0">
                {bundleComponents.map((component: any) => (
                  <Link 
                    key={component.id} 
                    to={`/products/${component.handle}`}
                    className="flex flex-col gap-4 bg-[#fafafa] p-4 rounded-2xl border border-gray-100 hover:border-[#295b45] hover:bg-white hover:shadow-xl transition-all duration-300 group/item"
                  >
                    <div className="aspect-square rounded-xl overflow-hidden bg-white border border-gray-100 p-2 shrink-0 relative flex items-center justify-center">
                      {component.featuredImage ? (
                        <Image 
                            data={component.featuredImage} 
                            className="w-full h-full object-contain transition-transform duration-500 group-hover/item:scale-110" 
                        />
                      ) : (
                        <span className="text-3xl opacity-20">🍰</span>
                      )}
                    </div>
                    
                    <div className="flex flex-col text-center">
                      <span className="text-[13px] font-black text-gray-900 leading-tight block h-10 overflow-hidden">
                        {component.title}
                      </span>
                      <div className="mt-2">
                          <Price 
                            data={component.variants.nodes[0].price} 
                            isEn={isEn} 
                            size="xs" 
                            className="text-[#295b45] font-black" 
                          />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <p className="text-gray-500 text-sm leading-relaxed mb-10 font-medium">
            {product.description || (isEn ? 'No description available for this product.' : 'لا يوجد وصف متاح لهذا المنتج.')}
          </p>

          <Suspense fallback={<div>{isEn ? 'Loading options...' : 'جاري تحميل الخيارات...'}</div>}>
            <Await resolve={variants}>
              {(data) => (
                <ProductForm
                  product={product}
                  selectedVariant={selectedVariant}
                  variants={data.product?.variants?.nodes || []}
                  isEn={isEn}
                />
              )}
            </Await>
          </Suspense>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-6">
            <span className="bg-[#fdfaf6] border border-gray-200 text-[#7a7a7a] px-4 py-1.5 rounded-full text-[11px] font-bold">{isEn ? 'Gluten Free' : 'خالي من الغلوتين'}</span>
            <span className="bg-[#fdfaf6] border border-gray-200 text-[#7a7a7a] px-4 py-1.5 rounded-full text-[11px] font-bold">{isEn ? 'Lactose Free' : 'خالي من اللاكتوز'}</span>
            <span className="bg-[#fdfaf6] border border-gray-200 text-[#7a7a7a] px-4 py-1.5 rounded-full text-[11px] font-bold font-en">{isEn ? 'Vegan' : 'نباتي'} {new Intl.NumberFormat(isEn ? 'en-US' : 'ar-EG').format(100)}%</span>
          </div>

        </div>

        {/* LEFT COLUMN: Actions & Cart Sticky Sidebar (Takes 3 cols) */}
        <div className="lg:col-span-3 order-1 lg:order-none relative h-full">
          <div className="sticky top-24 flex flex-col gap-5">

            {/* Tamara Box */}
            <div className="bg-[#fafafa] rounded-2xl p-4 border border-gray-200 flex flex-col items-center justify-center text-center gap-3">
              <div className="flex justify-between items-center w-full">
                <span className={`text-xs font-bold text-[#1a1a1a] flex-1 ${isEn ? 'text-left' : 'text-right'} leading-tight`}>{isEn ? `Split it into ${new Intl.NumberFormat('en-US').format(4)} interest-free payments with Tamara` : `قسطها على ${new Intl.NumberFormat('ar-EG').format(4)} دفعات بدون فوائد مع تمارا`}</span>
                <div className="w-[50px] shrink-0">
                  <img src="https://cdn.tamara.co/assets/svg/tamara-logo-badge-ar.svg" alt="Tamara" className="w-full h-auto" />
                </div>
              </div>
            </div>

            {/* Cart Box */}
            <div className="bg-white rounded-[24px] p-5 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-5">
                <span className="font-bold text-gray-700 text-sm">{isEn ? 'Quantity' : 'الكمية'}</span>
                <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden w-[100px] h-9">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 h-full flex items-center justify-center text-gray-400 hover:text-black shrink-0 border-l border-gray-200 bg-[#f9f9f9]">−</button>
                  <input type="text" value={new Intl.NumberFormat('ar-EG').format(quantity)} readOnly className="w-full text-center border-none font-black text-sm text-[#1a1a1a] p-0 focus:ring-0 font-en" />
                  <button onClick={() => setQuantity(quantity + 1)} className="w-8 h-full bg-[#ab8e78] text-white flex items-center justify-center shrink-0">+</button>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {isVisibilityBlocked ? (
                  <div className="w-full bg-gray-200 text-gray-500 py-3 rounded-[14px] text-sm font-bold flex items-center justify-center gap-2 cursor-not-allowed">
                    <span className="text-base">{visibility.status === 'scheduled' ? '🕐' : '⚠️'}</span>
                    {isEn ? visibility.label.en : visibility.label.ar}
                  </div>
                ) : isGiftCard ? (
                  <>
                    <div className="mb-4">
                      <label className="block text-xs font-bold text-gray-700 mb-2">
                        {isEn ? 'Recipient Mobile or Email' : 'رقم جوال أو إيميل المستلم'} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={recipientContact}
                        onChange={(e) => setRecipientContact(e.target.value)}
                        className="w-full p-3 text-sm border border-gray-200 rounded-xl focus:ring-[#295b45] focus:border-[#295b45] text-left"
                        placeholder={isEn ? 'example@email.com or 05xxxxxxxx' : 'example@email.com أو 05xxxxxxxx'}
                        dir="ltr"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-xs font-bold text-gray-700 mb-2">
                        {isEn ? 'Gift Message (Optional)' : 'رسالة إهداء (اختياري)'}
                      </label>
                      <textarea
                        value={giftCardMessage}
                        onChange={(e) => setGiftCardMessage(e.target.value)}
                        className="w-full p-3 text-sm border border-gray-200 rounded-xl focus:ring-[#295b45] focus:border-[#295b45] resize-none"
                        placeholder={isEn ? 'Write your message...' : 'اكتب رسالتك هنا...'}
                        rows={2}
                      />
                    </div>
                    
                    <AddToCartButton
                      disabled={!selectedVariant || effectiveOutOfStock || !recipientContact}
                      lines={
                        selectedVariant
                          ? (() => {
                              const groupId = Date.now().toString();
                              return [{
                                merchandiseId: selectedVariant.id,
                                quantity,
                                attributes: [
                                  {key: '_groupId', value: groupId},
                                  {key: 'Recipient', value: recipientContact},
                                  ...(giftCardMessage ? [{key: 'Gift Message', value: giftCardMessage}] : []),
                                ],
                              }];
                            })()
                          : []
                      }
                      className={`w-full ${!recipientContact || effectiveOutOfStock
                        ? 'bg-gray-400 cursor-not-allowed opacity-75'
                        : 'bg-[#295b45] hover:bg-[#1e4534]'
                        } transition-colors text-white py-3 rounded-[14px] text-sm font-bold flex items-center justify-center gap-2 shadow-sm`}
                    >
                      <span>{isEn ? 'Purchase Voucher' : 'شراء قسيمة الإهداء'}</span>
                      <span className="opacity-30 mx-1">•</span>
                      <Price data={{ amount: totalDisplayPrice.toString(), currencyCode: 'SAR' }} isEn={isEn} size="sm" className="text-white" />
                    </AddToCartButton>
                  </>
                ) : (
                  <>
                    {/* Addons Section */}
                    {addonNodes.length > 0 && (
                      <div className="mt-8 border-t border-gray-100 pt-6">
                        <h3 className="text-sm font-bold text-[#1a1a1a] mb-4">
                          {isEn ? 'Personalize Your Order' : 'إضافات مقترحة'}
                        </h3>
                        <div className="flex flex-col gap-3">
                          {addonNodes.map((addon: any) => {
                            const variant = addon.variants.nodes[0];
                            const isSelected = selectedAddons.includes(variant.id);
                            const outOfStock = !addon.availableForSale;

                            return (
                              <div
                                key={addon.id}
                                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${isSelected ? 'border-[#295b45] bg-[#f0f4f2]' : 'border-gray-100 bg-white'
                                  } ${outOfStock ? 'opacity-50 grayscale cursor-not-allowed' : 'cursor-pointer'}`}
                                onClick={() => !outOfStock && handleAddonToggle(variant.id)}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-50">
                                    <Image data={variant.image} className="w-full h-full object-cover" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-gray-800">{addon.title}</p>
                                    <p className="text-[11px] text-[#295b45] font-bold">
                                      + <Price data={variant.price} isEn={isEn} size="xs" />
                                    </p>
                                  </div>
                                </div>
                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${isSelected ? 'bg-[#295b45] border-[#295b45]' : 'border-gray-300'
                                  }`}>
                                  {isSelected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><path d="M20 6L9 17l-5-5" /></svg>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Gift Message */}
                    {!isVisibilityBlocked && (
                      <div className="mb-4">
                        <label className="block text-xs font-bold text-gray-700 mb-2">
                          {isEn ? 'Gift Message (Optional)' : 'رسالة إهداء (اختياري)'}
                        </label>
                        <textarea
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          className="w-full p-3 text-sm border border-gray-200 rounded-xl focus:ring-[#295b45] focus:border-[#295b45] resize-none"
                          placeholder={isEn ? 'Write your message...' : 'اكتب رسالتك هنا...'}
                          rows={2}
                        />
                      </div>
                    )}

                    {effectiveOutOfStock && (
                      <button 
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            setIsNotifyModalOpen(true);
                        }}
                        className="w-full mb-4 bg-amber-500 hover:bg-amber-600 transition-colors text-white py-4 rounded-[14px] text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer relative z-10"
                      >
                        🔔 {isEn ? 'Notify Me When Available' : 'أبلغني عند التوفر'}
                      </button>
                    )}

                    <AddToCartButton
                      disabled={!selectedVariant || effectiveOutOfStock}
                      lines={
                        selectedVariant
                          ? (() => {
                              const groupId = Date.now().toString();
                              const isBogo = product.tags?.some((t: string) => t.toLowerCase().includes('bogo'));
                              
                              const mainLine = {
                                merchandiseId: selectedVariant.id,
                                quantity,
                                attributes: [
                                  {key: '_groupId', value: groupId},
                                  ...(note ? [{key: 'Note', value: note}] : []),
                                ],
                              };

                              const addonLines = selectedAddons.map((addonId) => ({
                                merchandiseId: addonId,
                                quantity: 1,
                                attributes: [
                                  {key: '_groupId', value: groupId},
                                  {key: '_is_addon', value: 'true'},
                                ],
                              }));

                              if (isBogo) {
                                return [
                                  mainLine,
                                  {
                                    merchandiseId: selectedVariant.id,
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
                      className={`w-full ${effectiveOutOfStock
                        ? 'bg-gray-400 cursor-not-allowed opacity-75'
                        : 'bg-[#295b45] hover:bg-[#1e4534]'
                        } transition-colors text-white py-3 rounded-[14px] text-sm font-bold flex items-center justify-center gap-2 shadow-sm`}
                    >
                      {effectiveOutOfStock ? (
                        isEn ? 'Not Available at Branch' : 'غير متوفر في هذا الفرع'
                      ) : (
                        <>
                          <span>{isEn ? 'Add to Cart' : 'أضف إلي السلة'}</span>
                          <span className="opacity-30 mx-1">•</span>
                          <Price data={{ amount: totalDisplayPrice.toString(), currencyCode: 'SAR' }} isEn={isEn} size="sm" className="text-white" />
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="9" cy="21" r="1" />
                            <circle cx="20" cy="21" r="1" />
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                          </svg>
                        </>
                      )}
                    </AddToCartButton>

                    <button className="w-full bg-[#fafafa] border border-[#a2bda0] hover:bg-[#ebf3ea] transition-colors text-[#295b45] py-3 rounded-[14px] text-sm font-bold flex items-center justify-center gap-2 mt-4">
                      {isEn ? 'Buy Now' : 'إشتري الان'}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </div>

            <StockNotificationModal 
                isOpen={isNotifyModalOpen}
                onClose={() => setIsNotifyModalOpen(false)}
                productTitle={product.title}
                variantId={selectedVariant?.id || ''}
                isEn={isEn}
                customerEmail={customerEmail}
                locationId={selectedLocationId}
                locationName={selectedLocationName}
            />

            {/* Service Guarantees Box */}
            {!isGiftCard && (
              <div className={`bg-[#fafafa] rounded-2xl p-5 border border-gray-200 flex flex-col gap-4 ${isEn ? 'text-left' : 'text-right'}`} dir={isEn ? 'ltr' : 'rtl'}>
                {estimatedDeliveryDate && (
                  <>
                    <div className={`flex items-center gap-4 ${isEn ? 'justify-start' : 'justify-start text-right'}`}>
                      <span className="text-2xl shrink-0">📅</span>
                      <div>
                        <h4 className="font-bold text-[13px] text-[#1a1a1a] mb-0.5">{isEn ? 'Estimated Delivery' : 'وقت التوصيل المتوقع'}</h4>
                        <p className="text-[11px] text-[#295b45] font-black">{estimatedDeliveryDate}</p>
                      </div>
                    </div>
                    <div className="h-[1px] w-full bg-gray-100"></div>
                  </>
                )}

                <div className={`flex items-center gap-4 ${isEn ? 'justify-start' : 'justify-start text-right'}`}>
                  <span className="text-2xl shrink-0">🚚</span>
                  <div>
                    <h4 className="font-bold text-[13px] text-[#1a1a1a] mb-0.5">توصيل مجاني</h4>
                    <p className="text-[10px] text-gray-400 font-medium">{isEn ? 'On orders above' : 'للطلبات فوق'} <Price data={{ amount: '200', currencyCode: 'SAR' }} isEn={isEn} size="xs" /></p>
                  </div>
                </div>
                <div className="h-[1px] w-full bg-gray-100"></div>
                <div className="flex items-center gap-4 text-right justify-start">
                  <span className="text-2xl shrink-0">🏪</span>
                  <div>
                    <h4 className="font-bold text-[13px] text-[#1a1a1a] mb-0.5">استلام من الفرع</h4>
                    <p className="text-[10px] text-gray-400 font-medium">جاهز خلال {new Intl.NumberFormat('ar-EG').format(10)} دقيقة</p>
                  </div>
                </div>
                <div className="h-[1px] w-full bg-gray-100"></div>
                <div className="flex items-center gap-4 text-right justify-start">
                  <span className="text-2xl shrink-0 text-amber-500">🔄</span>
                  <div>
                    <h4 className="font-bold text-[13px] text-[#1a1a1a] mb-0.5">استرجاع مضمون</h4>
                    <p className="text-[10px] text-gray-400 font-medium">خلال {new Intl.NumberFormat('ar-EG').format(24)} ساعة من الاستلام</p>
                  </div>
                </div>
                <div className="h-[1px] w-full bg-gray-100"></div>
                <div className="flex items-center gap-4 text-right justify-start">
                  <span className="text-2xl shrink-0 text-blue-500">🛡️</span>
                  <div>
                    <h4 className="font-bold text-[13px] text-[#1a1a1a] mb-0.5">دفع آمن {new Intl.NumberFormat('ar-EG').format(100)}%</h4>
                    <p className="text-[10px] text-gray-400 font-medium">مدفوعات مشفرة ومحمية</p>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* 3. Bottom Tabs area (Product details & Reviews) */}
      <div className="w-full bg-white mt-16 border-t border-gray-200 pt-10 pb-20">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8">
          
          {/* Section Heading & Tabs */}
          <div className="flex flex-col md:flex-row justify-between items-center mb-12 border-b border-gray-50 pb-8 gap-8">
              <div className="flex gap-10">
                <button 
                    onClick={() => setActiveTab('details')}
                    className={`pb-4 text-sm font-black uppercase tracking-widest transition-all relative ${activeTab === 'details' ? 'text-[#295b45]' : 'text-gray-300 hover:text-gray-500'}`}
                >
                    {isEn ? 'Product Details' : 'تفاصيل المنتج'}
                    {activeTab === 'details' && <div className="absolute bottom-0 left-0 w-full h-1 bg-[#295b45] rounded-full"></div>}
                </button>
                <button 
                    onClick={() => setActiveTab('reviews')}
                    className={`pb-4 text-sm font-black uppercase tracking-widest transition-all relative flex items-center gap-3 ${activeTab === 'reviews' ? 'text-[#295b45]' : 'text-gray-300 hover:text-gray-500'}`}
                >
                    {isEn ? 'Reviews' : 'المراجعات'}
                    <span className={`px-2 py-0.5 rounded-md text-[10px] ${activeTab === 'reviews' ? 'bg-[#295b45] text-white' : 'bg-gray-100 text-gray-400'}`}>
                        {new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'ar-EG').format(reviews?.length || 0)}
                    </span>
                    {activeTab === 'reviews' && <div className="absolute bottom-0 left-0 w-full h-1 bg-[#295b45] rounded-full"></div>}
                </button>
              </div>

              {activeTab === 'reviews' && parseRatingValue(product.average_rating?.value) > 0 && (
                <div className="flex items-center gap-4 bg-[#fafafa] p-4 rounded-2xl border border-gray-100">
                    <div className={isEn ? "text-right" : "text-left"}>
                        <div className="text-xl font-black text-[#1b3d2e] leading-tight text-center">
                            {parseRatingValue(product.average_rating?.value).toFixed(1)}
                        </div>
                        <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                            {isEn ? `${reviews?.length || 0} reviews` : `${new Intl.NumberFormat('ar-EG').format(reviews?.length || 0)} تقييم`}
                        </div>
                    </div>
                    <StarRating rating={product.average_rating?.value} locale={locale} size="lg" />
                </div>
              )}
          </div>

          <div className="animate-fade-in">
            {activeTab === 'details' ? (
              <div className="max-w-4xl">
                  <div 
                    className={`prose max-w-none ${isEn ? 'text-left' : 'text-right'} text-gray-600 leading-[1.8] font-medium text-lg mb-12`}
                    dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
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
                            <p className="text-[15px] font-bold text-[#1b3d2e]/70 leading-relaxed whitespace-pre-wrap">
                              {(product as any).nutrition.value}
                            </p>
                          </div>
                        )}
                    </div>
                  )}
              </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-20">
                    {/* Reviews List */}
                    <div className="lg:col-span-7 flex flex-col gap-8">
                        
                        {/* Filters & Sort */}
                        <div className="flex flex-wrap items-center justify-between gap-6 pb-8 border-b border-gray-100">
                            <div className="flex flex-wrap gap-2">
                                <button 
                                    onClick={() => setFilterRating(null)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filterRating === null ? 'bg-[#295b45] text-white shadow-md' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                                >
                                    {isEn ? 'All' : 'الكل'}
                                </button>
                                {[5, 4, 3, 2, 1].map(star => (
                                    <button 
                                        key={star}
                                        onClick={() => setFilterRating(star)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${filterRating === star ? 'bg-[#295b45] text-white shadow-md' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                                    >
                                        {star} ★
                                    </button>
                                ))}
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <span className="text-[11px] font-black text-gray-300 uppercase tracking-widest">{isEn ? 'Sort by' : 'ترتيب حسب'}</span>
                                <select 
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as any)}
                                    className="bg-transparent border-none text-xs font-black text-[#1b3d2e] focus:ring-0 cursor-pointer appearance-none"
                                >
                                    <option value="newest">{isEn ? 'Newest' : 'الأحدث'}</option>
                                    <option value="highest">{isEn ? 'Highest Rated' : 'الأعلى تقييماً'}</option>
                                    <option value="lowest">{isEn ? 'Lowest Rated' : 'الأقل تقييماً'}</option>
                                </select>
                            </div>
                        </div>

                        {processedReviews && processedReviews.length > 0 ? (
                            processedReviews.map((review: any, idx: number) => (
                                <div key={idx} className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 bg-[#295b45]/10 rounded-2xl flex items-center justify-center text-[#295b45] font-black text-xl">
                                                {review.customer_name?.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h5 className="text-[18px] font-black text-gray-900 leading-tight">{review.customer_name}</h5>
                                                <StarRating rating={review.rating} size="sm" locale={locale} />
                                            </div>
                                        </div>
                                        <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-4 py-1.5 rounded-full border border-gray-100">
                                            {review.language === 'ar' ? 'العربية' : 'English'}
                                        </span>
                                    </div>
                                    <h5 className="font-black text-[#1b3d2e] mb-4 text-xl">{review.review_title || review.title}</h5>
                                    <p className="text-gray-500 leading-relaxed font-bold text-[15px]">{review.review_comment || review.comment}</p>
                                </div>
                            ))
                        ) : (
                            <div className="py-24 text-center bg-[#fafafa] rounded-[48px] border-2 border-dashed border-gray-200">
                                <div className="text-6xl mb-8 grayscale brightness-125 opacity-40">🍰</div>
                                <h4 className="text-2xl font-black text-[#1b3d2e]/40 mb-3">
                                    {isEn ? 'Share the sweetness!' : 'شاركنا الحلا!'}
                                </h4>
                                <p className="text-gray-400 font-bold max-w-xs mx-auto">
                                    {isEn ? 'Be the first person to share your thoughts on this product.' : 'كن أول شخص يشاركنا رأيه حول هذا المنتج.'}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Submit Form */}
                    <div className="lg:col-span-5">
                        <div className="sticky top-24">
                            <ReviewForm 
                                productHandle={product.handle} 
                                productTitle={product.title} 
                                locale={locale} 
                                selectedLocationId={selectedLocationId}
                                selectedLocationName={selectedLocationName}
                            />
                        </div>
                    </div>
                </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}

function ProductGallery({ images }: { images: any[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [zoomHoverProps, setZoomHoverProps] = useState({ x: 0, y: 0, show: false });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mounted, setMounted] = useState(false);

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
    <div className="flex flex-col gap-4 relative w-full">
      {/* Main Image with Zoom on Desktop, Swipe on Mobile */}
      <div className="relative w-full aspect-square bg-[#f5f5f5] rounded-[1.5rem] overflow-hidden group">

        {/* Top Icons (Heart & Share) */}
        <div className="absolute top-4 start-4 z-20 flex flex-col gap-3">
          <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-[0_2px_10px_rgba(0,0,0,0.08)] text-gray-700 hover:text-red-500 transition-colors hover:scale-105 active:scale-95">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.8 4.6a5.5 5.5 0 00-7.7 0l-1.1 1-1.1-1a5.5 5.5 0 00-7.8 7.8l1 1 7.9 7.9 7.9-7.9 1-1a5.5 5.5 0 000-7.8z" />
            </svg>
          </button>
          <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-[0_2px_10px_rgba(0,0,0,0.08)] text-gray-700 hover:text-blue-500 transition-colors hover:scale-105 active:scale-95">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8m-4-6l-4-4-4 4m4-4v13" />
            </svg>
          </button>
        </div>

        {/* Bottom Expand Icon */}
        <button
          onClick={() => setIsFullscreen(true)}
          className="absolute bottom-4 left-4 z-20 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-[0_2px_10px_rgba(0,0,0,0.08)] text-gray-700 hover:text-black transition-colors hover:scale-105 active:scale-95"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
        </button>

        {/* Badge (Bottom End for RTL/LTR) */}
        <div className="absolute bottom-4 end-4 z-20 bg-[#004f59] text-white px-5 py-2 rounded-md font-bold text-sm shadow-md">
          New
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
          onClick={() => {
            if (window.innerWidth < 768) setZoomHoverProps({ show: false, x: 0, y: 0 });
          }}
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
              className="absolute inset-0 z-10 pointer-events-none bg-no-repeat rounded-[1.5rem]"
              style={{
                backgroundImage: `url(${currentImage.url})`,
                backgroundPosition: `${zoomHoverProps.x}% ${zoomHoverProps.y}%`,
                backgroundSize: '200%',
              }}
            />
          )}
        </div>

        {/* Mobile Dots Indicator */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 md:hidden">
          {images.map((img, i) => (
            <div key={img.id} className={`w-2 h-2 rounded-full transition-all duration-300 ${i === activeIndex ? 'bg-[#1b3d2e] w-4' : 'bg-gray-300'}`} />
          ))}
        </div>
      </div>

      {/* Desktop Thumbnails */}
      {images.length > 1 && (
        <div className="hidden md:grid grid-cols-5 gap-3 mt-2">
          {images.map((img, i) => (
            <div
              key={img.id}
              onClick={() => setActiveIndex(i)}
              className={`aspect-square bg-[#f5f5f5] rounded-xl border-2 transition-all cursor-pointer flex items-center justify-center overflow-hidden ${i === activeIndex ? 'border-[#004f59]' : 'border-transparent opacity-70 hover:opacity-100 hover:border-gray-200'
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
                  className={`h-0.5 rounded-full transition-all duration-300 ${i === activeIndex ? 'w-8 bg-[#1b3d2e]' : 'w-4 bg-gray-300 hover:bg-gray-400'}`}
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
    <div className="flex flex-col gap-6 w-full border-b border-gray-100 pb-8 mb-4">
      <VariantSelector
        handle={product.handle}
        options={product.options}
        variants={variants as any}
      >
        {({ option }) => {
          const isSize = option.name.toLowerCase() === 'size' || option.name.toLowerCase() === 'title';
          let label = isSize ? (isEn ? 'Size' : 'الحجم') : option.name;
          
          if (isGiftCard && isSize) {
            label = isEn ? 'Voucher Value' : 'قيمة القسيمة';
          }

          return (
            <div className="flex flex-col gap-3" key={option.name}>
              <h5 className={`font-bold text-[#1a1a1a] text-sm ${isEn ? 'text-left' : 'text-right'} w-full`}>{label}</h5>
              <div className={`flex flex-wrap gap-2 ${isEn ? 'justify-start' : 'justify-start'} w-full`}>
                {option.values.map(({ value, isAvailable, isActive, to }) => {
                  let displayValue = value;
                  if (!isEn) {
                    if (value.toLowerCase() === 'small') displayValue = 'صغير';
                    if (value.toLowerCase() === 'medium') displayValue = 'وسط';
                    if (value.toLowerCase() === 'large') displayValue = 'كبير';
                  }

                  // Force the URL to include /en if we are in English mode
                  const variantUrl = isEn ? `/en${to}` : to;

                  return (
                    <Link
                      key={option.name + value}
                      prefetch="intent"
                      preventScrollReset
                      replace
                      to={variantUrl}
                      className={`px-5 py-2 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 ${isActive
                        ? 'bg-[#1b3d2e] border-[#1b3d2e] text-white shadow-sm'
                        : 'bg-white border-gray-200 text-gray-500 hover:border-[#1b3d2e] hover:text-[#1b3d2e]'
                        } ${!isAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
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

      {/* Additions mock section (إضافات) to match design perfectly */}
      {/* <div className="flex flex-col gap-3 w-full">
        <h5 className="font-bold text-[#1a1a1a] text-sm text-right w-full">إضافات</h5>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 1, name: 'متوفر الان', icon: '🤞', price: 15, active: false },
            { id: 2, name: 'تغليف فاخر', icon: '🎁', price: 10, active: false },
            { id: 3, name: 'بطاقة تهنئة', icon: '💌', price: 20, active: false }
          ].map((addon, index) => (
            <div key={addon.id} className="bg-white border border-gray-200 rounded-xl p-2.5 flex flex-col items-center justify-center text-center gap-1 cursor-pointer hover:border-[#295b45] transition-colors relative group shadow-sm">
              <div className="absolute top-2 right-2 w-3.5 h-3.5 rounded-[3px] border border-gray-300 bg-white flex items-center justify-center group-hover:border-[#295b45]">
                
              </div>
              <span className="text-sm mt-3">{addon.icon}</span>
              <span className="font-bold text-[11px] text-[#1a1a1a] mt-0.5">{addon.name}</span>
              <span className="text-[9px] font-en text-[#aeb5b5]">+{addon.price}</span>
            </div>
          ))}
        </div>
      </div> */}
    </div>
  );
}


function AddToCartButton({
  analytics,
  children,
  disabled,
  lines,
  onClick,
  className
}: {
  analytics?: unknown;
  children: React.ReactNode;
  disabled?: boolean;
  lines: CartLineInput[];
  onClick?: () => void;
  className?: string;
}) {
  const { open } = useAside();

  return (
    <CartForm route="/cart" inputs={{ lines }} action={CartForm.ACTIONS.LinesAdd}>
      {(fetcher: FetcherWithComponents<any>) => (
        <>
          <input
            name="analytics"
            type="hidden"
            value={JSON.stringify(analytics)}
          />
          <button
            type="submit"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              if (onClick) {
                onClick();
              } else {
                open('cart');
              }
            }}
            disabled={disabled ?? fetcher.state !== 'idle'}
            className={className}
          >
            {fetcher.state !== 'idle' ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                {/* Fallback to children for context text while spinning */}
                {children}
              </span>
            ) : (
              children
            )}
          </button>
        </>
      )}
    </CartForm>
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
      values
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
    variants(first: 1) {
      nodes {
        id
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

