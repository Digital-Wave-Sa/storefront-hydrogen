import { Suspense, useState, useEffect, useMemo } from 'react';
import { getVisibilityStatus, getProductVisibility, type VisibilityResult } from '~/lib/visibility';
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
import patternBg from '/images/second-bg-pattern.svg';

export const shouldRevalidate = ({ currentUrl, nextUrl, defaultShouldRevalidate }: any) => {
  if (currentUrl.pathname !== nextUrl.pathname) {
    return true;
  }
  return defaultShouldRevalidate;
};

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data?.product) {
    return [{ title: 'Saadeddin' }];
  }
  const { product, locale } = data as any;
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
  // --- PARALLEL FETCH FOR SECONDARY DATA ---
  const [reviewsData, hasPurchasedResult, recommendedResult] = await Promise.all([
    // 1. REVIEWS
    (async () => {
      let reviews: any[] = [];
      let dynamicRating = 0;
      let dynamicCount = 0;
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

        const reviewsResult = await adminApiQuery(shopDomain, adminToken, reviewsQuery) as any;

        const allReviews = reviewsResult.data?.metaobjects?.nodes?.map((node: any) => {
          const f: any = {};
          node.fields.forEach((field: any) => f[field.key] = field.value);
          return f;
        }) || [];

        reviews = allReviews.filter((r: any) => {
          const rHandle = (r.product_handle || '').toLowerCase().trim();
          const targetHandle = (decodedHandle || '').toLowerCase().trim();
          const statusStr = (r.status || '').toLowerCase().trim();
          const isApproved = statusStr === 'approved' || statusStr === 'published' || statusStr === 'active' || !statusStr;
          return (rHandle === targetHandle || rHandle === (decodedHandle || '').toLowerCase().trim()) && isApproved;
        });
      } catch (err) {
        console.error('[REVIEWS] Failed to fetch reviews:', err);
      }

      if (reviews.length > 0) {
        const sum = reviews.reduce((acc, r: any) => acc + (parseFloat(r.rating) || 0), 0);
        dynamicRating = sum / reviews.length;
        dynamicCount = reviews.length;
      } else {
        dynamicRating = parseRatingValue(product.average_rating?.value);
        dynamicCount = parseInt(product.rating_count?.value || '0');
      }
      return { reviews, dynamicRating, dynamicCount };
    })(),

    // 2. HAS PURCHASED
    (async () => {
      let hasPurchased = false;
      const customerAccessToken = await context.session.get('customerAccessToken');

      if (customerAccessToken?.accessToken) {
        if (customerAccessToken.accessToken === 'dev-bypass-token') {
          const savedPhone = await context.session.get('loginOtpPhone');
          if (savedPhone) {
            try {
              const { getAdminToken } = await import('~/lib/shopify-admin.server');
              const token = await getAdminToken(context.env);
              const rawShop = context.env.SHOPIFY_SHOP || context.env.PUBLIC_STORE_DOMAIN || 'the-beauty-secrets-ksa';
              const shopDomain = rawShop.includes('myshopify.com') ? rawShop : `${rawShop.split('.')[0]}.myshopify.com`;
              const queryStr = savedPhone.includes('590910042')
                ? encodeURIComponent('email:"motasem.udeh@gmail.com"')
                : encodeURIComponent(`phone:"${savedPhone}"`);
              const res = await fetch(`https://${shopDomain}/admin/api/2023-04/customers/search.json?query=${queryStr}`, {
                headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' },
              });
              const { customers } = await res.json() as any;
              if (customers && customers.length > 0) {
                const adminCust = customers[0];
                const ordersRes = await fetch(`https://${shopDomain}/admin/api/2023-04/customers/${adminCust.id}/orders.json?status=any`, {
                  headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' },
                });
                const { orders } = await ordersRes.json() as any;
                if (orders) {
                  hasPurchased = orders.some((o: any) =>
                    o.line_items?.some((li: any) => li.product_id && `gid://shopify/Product/${li.product_id}` === product.id)
                  );
                }
              }
            } catch (e) {
              console.error('[REVIEWS] Failed dev bypass order check:', e);
            }
          }
        } else {
          try {
            const result = await storefront.query(`#graphql
              query CustomerPurchases($customerAccessToken: String!) {
                customer(customerAccessToken: $customerAccessToken) {
                  orders(first: 50) {
                    nodes {
                      lineItems(first: 50) {
                        nodes {
                          variant {
                            product {
                              id
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            `, {
              variables: { customerAccessToken: customerAccessToken.accessToken },
              cache: storefront.CacheNone(),
            });

            if (result.customer?.orders?.nodes) {
              hasPurchased = result.customer.orders.nodes.some((order: any) =>
                order.lineItems.nodes.some((item: any) => item.variant?.product?.id === product.id)
              );
            }
          } catch (e) {
            console.error('[REVIEWS] Failed to check customer purchases:', e);
          }
        }
      }
      return hasPurchased;
    })(),

    // 3. RELATED PRODUCTS
    (async () => {
      let recommended: any = { products: { nodes: [] } };

      if ((product.related_products as any)?.references?.nodes?.length > 0) {
        recommended.products.nodes = (product.related_products as any).references.nodes.map((node: any) => {
          if (node?.product && node.product.handle) {
            return {
              ...node.product,
              featuredImage: node.product.featuredImage || node.image,
            };
          }
          return node;
        }).filter((p: any) => p && p.handle);
      } else {
        try {
          const recommendationsResult = await storefront.query(RECOMMENDED_PRODUCTS_QUERY, {
            variables: { productId: product.id },
          });
          if (recommendationsResult.productRecommendations && recommendationsResult.productRecommendations.length > 0) {
            recommended.products.nodes = recommendationsResult.productRecommendations;
          }
        } catch (e) {
          console.error('Failed to fetch productRecommendations:', e);
        }
      }

      if (recommended.products.nodes.length === 0 && product.collections?.nodes?.[0]?.id) {
        try {
          const collectionResult = await storefront.query(COLLECTION_PRODUCTS_QUERY, {
            variables: { collectionId: product.collections.nodes[0].id },
          });
          if ((collectionResult as any).collection?.products?.nodes?.length > 0) {
            recommended.products.nodes = (collectionResult as any).collection.products.nodes.filter(
              (p: any) => p.id !== product.id
            ).slice(0, 4);
          }
        } catch (e) {
          console.error('Failed to fetch collection fallback:', e);
        }
      }

      if (recommended.products.nodes.length === 0) {
        recommended = await storefront.query(NEWEST_PRODUCTS_QUERY);
      }
      return recommended;
    })()
  ]);

  return data({
    product,
    variants,
    visibility,
    reviews: reviewsData.reviews,
    dynamicRating: reviewsData.dynamicRating,
    dynamicCount: reviewsData.dynamicCount,
    recommended: recommendedResult,
    hasPurchased: hasPurchasedResult
  });
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
  const { product, variants, visibility, reviews: loaderReviews, dynamicRating: loaderRating, dynamicCount: loaderCount, recommended, hasPurchased } = useLoaderData<any>();
  const rootData = useRouteLoaderData('root') as any;
  const locale = rootData?.consent?.language?.toLowerCase() || 'ar';
  const isEn = locale === 'en';
  const customer = rootData?.customer;

  // Prefer fresh loaderReviews from handle loader, fallback to rootData.reviews
  const rootReviews = (rootData?.reviews?.nodes || []).map((node: any) => {
    const f: any = {};
    node.fields.forEach((field: any) => f[field.key] = field.value);
    return f;
  }).filter((r: any) => {
    const rHandle = (r.product_handle || '').toLowerCase().trim();
    const targetHandle = (product.handle || '').toLowerCase().trim();
    const statusStr = (r.status || '').toLowerCase().trim();
    const isApproved = statusStr === 'approved' || statusStr === 'published' || statusStr === 'active' || !statusStr;
    return rHandle === targetHandle && isApproved;
  });

  const reviews = (Array.isArray(loaderReviews) && loaderReviews.length > 0) ? loaderReviews : rootReviews;

  // Calculate dynamic rating from active reviews
  let dynamicRating = loaderRating || 0;
  let dynamicCount = loaderCount || reviews.length;
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
      }).catch(() => { });
    }
  }, [customer]);

  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isBuyingNow, setIsBuyingNow] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]); // Array of Variant IDs
  const [note, setNote] = useState('');
  const [isGiftMode, setIsGiftMode] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [hideSender, setHideSender] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [cakeMessage, setCakeMessage] = useState('');
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    details: true,
    nutrition: true,
    reviews: false,
  });

  const isCakeProduct = product.productType?.toLowerCase().includes('cake') || product.tags?.some((t: string) => t.toLowerCase().includes('cake')) || product.title?.toLowerCase().includes('cake') || false;

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

  const handleBuyNow = async () => {
    if (!selectedVariant || effectiveOutOfStock || isBuyingNow) return;
    setIsBuyingNow(true);

    try {
      const groupId = Date.now().toString();
      const isBogoTag = product.tags?.some((t: string) => t.toLowerCase().includes('bogo'));

      const mainLine = {
        merchandiseId: selectedVariant.id,
        quantity,
        attributes: [
          { key: '_groupId', value: groupId },
          ...(isBundle && bundleComponents.length > 0 ? [
            {
              key: isEn ? 'Bundle Includes' : 'محتويات العرض',
              value: bundleComponents.map((c: any) => `• ${c.title}`).join('\n')
            },
            {
              key: '_bundle_skus',
              value: bundleComponents.map((c: any) => c.variants?.nodes?.[0]?.sku).filter(Boolean).join(', ')
            }
          ] : []),
          ...(cakeMessage ? [{ key: 'Cake Message', value: cakeMessage }] : []),
          ...(isGiftMode ? [
            { key: '_isGift', value: 'true' },
            ...(recipientName ? [{ key: 'Recipient Name', value: recipientName }] : []),
            ...(note ? [{ key: 'Gift Message', value: note }] : []),
            { key: '_hideSender', value: hideSender ? 'Yes' : 'No' },
          ] : (note ? [{ key: 'Order Note', value: note }] : [])),
        ],
      };

      const addonLines = selectedAddons.map((addonId) => {
        const addonNode = addonNodes.find((n: any) => n.variants?.nodes?.[0]?.id === addonId);
        const variant = addonNode?.variants?.nodes?.[0];
        return {
          merchandiseId: addonId,
          quantity: 1,
          attributes: [
            { key: '_groupId', value: groupId },
            { key: '_is_addon', value: 'true' },
            ...(variant?.sku ? [{ key: '_sku', value: variant.sku }] : []),
          ],
        };
      });

      let linesToAdd = [mainLine, ...addonLines];

      if (isBogoTag) {
        const freeVariantId = bogoFreeVariantId || selectedVariant.id;
        linesToAdd = [
          mainLine,
          {
            merchandiseId: freeVariantId,
            quantity,
            attributes: [
              { key: '_groupId', value: groupId },
              { key: '_is_addon', value: 'true' },
              { key: '_is_free', value: 'true' },
            ],
          },
          ...addonLines
        ];
      }

      const formData = new FormData();
      const cartInput = {
        action: 'LinesAdd',
        inputs: { lines: linesToAdd },
      };
      formData.append('cartFormInput', JSON.stringify(cartInput));

      const res = await fetch('/cart', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json() as any;
      const checkoutUrl = data?.cart?.checkoutUrl || (rootData?.cart?.checkoutUrl);

      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        window.location.href = isEn ? '/en/cart' : '/cart';
      }
    } catch (err) {
      console.error('Buy Now error:', err);
      window.location.href = isEn ? '/en/cart' : '/cart';
    } finally {
      setIsBuyingNow(false);
    }
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
        leadTimeHours = 0; // Default to 0 if no config found
      }
    }

    // If there is no lead time configured, don't show the estimated delivery date
    if (!leadTimeHours || leadTimeHours <= 0) {
      return null;
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

  const renderReviews = () => {
    return (
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
            <span className="text-[12px] text-[#7D7D7D] font-normal mt-[8px]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
              {isEn ? `(${reviews?.length || 0} reviews)` : `(${new Intl.NumberFormat('en-US').format(reviews?.length || 0)} مراجعة)`}
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
                    <span className="text-[12px] font-medium text-[#7D7D7D]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                      {new Intl.NumberFormat('en-US').format(star)}
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
                  <div className="w-[20px] text-[12px] font-medium text-[#7D7D7D] text-start" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                    {new Intl.NumberFormat('en-US').format(count)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Write Review Button Link */}
        <div className="flex justify-end w-full">
          {hasPurchased ? (
            <button
              onClick={() => setShowReviewForm(!showReviewForm)}
              className="text-[14px] text-[#255441] font-bold underline hover:text-[#1a3a2d] transition-colors"
              style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
            >
              {isEn ? 'Write a Review' : 'أضف مراجعة'}
            </button>
          ) : (
            <span
              className="text-[14px] text-[#7D7D7D] font-medium"
              style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
            >
              {isEn ? 'Only verified buyers can review' : 'فقط المشترين يمكنهم إضافة مراجعة'}
            </span>
          )}
        </div>

        {/* Review Form */}
        {showReviewForm && (
          <div className="bg-white p-8 rounded-[16px] border border-[#E5E5E5] shadow-sm animate-fade-in relative mb-[16px] w-full text-start">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-[18px] font-bold text-[#234745]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
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
                    <div className="w-[40px] h-[40px] bg-[#BBCFCD] rounded-full flex items-center justify-center text-[#255441] text-[18px] font-bold" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", paddingTop: '2px' }}>
                      {review.customer_name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="flex flex-col items-start">
                      <h5 className="text-[16px] font-bold text-[#255441] leading-tight" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                        {review.customer_name}
                      </h5>
                      <span className="text-[14px] text-[#BBCFCD] font-normal" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
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
                  <p className="text-[#7D7D7D] text-[14px] font-normal leading-[24px]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                    {review.review_comment || review.comment}
                  </p>
                </div>

                {/* Verified Buyer */}
                <div className="w-full flex justify-start pr-[52px]">
                  <div className="flex items-center gap-[6px]">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14.6666 7.38674V8.00007C14.6658 9.43769 14.2003 10.8365 13.3395 11.9879C12.4788 13.1394 11.2688 13.9818 9.88907 14.3893C8.50931 14.7968 7.03402 14.7471 5.68417 14.2491C4.33433 13.751 3.18187 12.8315 2.40049 11.6288C1.61912 10.4261 1.25143 8.97298 1.35245 7.51004C1.45347 6.04711 2.01827 4.65089 2.96162 3.52355C3.90497 2.3962 5.17646 1.59591 6.58882 1.23846C8.00119 0.881006 9.48003 0.98592 10.8133 1.5334" stroke="#255441" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M14.6666 2.66675L8.00001 9.34008L5.99999 7.34008" stroke="#255441" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-[#255441] text-[12px] font-bold" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                      {isEn ? 'Verified Buyer' : 'مشتري موثق'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center w-full">
              <p className="text-gray-400 font-normal" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                {isEn ? 'No reviews yet. Be the first!' : 'لا توجد مراجعات بعد. كن أول من يقيّم!'}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div key={product.id} dir={isEn ? 'ltr' : 'rtl'} className={`w-full bg-[#fafafa] ${isEn ? 'font-en' : 'font-ar'}`}>
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

      {/* Stock Notification Modal (STOQ integration) */}
      <StockNotificationModal
        isOpen={isNotifyModalOpen}
        onClose={() => setIsNotifyModalOpen(false)}
        productTitle={product.title}
        variantId={selectedVariant?.id || ''}
        isEn={isEn}
        customerEmail={customerEmail}
        locationId={selectedLocationId || undefined}
        locationName={selectedLocationName || undefined}
      />



      {/* 1. Styled PDP Header Header */}
      <div className="w-full">
        {/* Dark Green Patterned Section */}
        <div className="w-full bg-[#234745] relative overflow-hidden py-6 md:py-10">
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
              style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", fontSize: '16px' }}
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
            <div className="flex items-center gap-[8px]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", fontSize: '16px', lineHeight: '20px' }}>
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
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 pt-8 md:pt-12 pb-[64px] lg:pb-[64px] grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">

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
                fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
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
                  fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif",
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
                  <span className="text-[#171717] text-[12px] font-bold" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", lineHeight: '100%' }}>
                    {new Intl.NumberFormat('en-US', { minimumFractionDigits: 1 }).format(dynamicRating || 0)}
                  </span>
                  <span className="text-[#7D7D7D] text-[12px] font-normal" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", lineHeight: '100%' }}>
                    {isEn ? `(${dynamicCount || 0} Reviews)` : `(${new Intl.NumberFormat('en-US').format(dynamicCount || 0)} مراجعة)`}
                  </span>
                </div>
              </div>

              <span className="text-[#7D7D7D] text-[12px]">|</span>

              {/* Availability */}
              <div className="flex items-center gap-[6px]">
                <span className={`w-[6px] h-[6px] rounded-full ${effectiveOutOfStock ? 'bg-[#E64950]' : 'bg-[#255441]'}`}></span>
                <span className={`text-[12px] font-bold ${effectiveOutOfStock ? 'text-[#E64950]' : 'text-[#255441]'}`} style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", lineHeight: '100%' }}>
                  {effectiveOutOfStock ? (isEn ? 'Out of Stock' : 'غير متوفر') : (isEn ? 'Available' : 'متوفر')}
                </span>
              </div>
            </div>

            {/* Info Cards Row */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-[12px] mb-[24px] w-full">
              {/* Servings Card */}
              <div className="flex-1 min-w-[100px] h-[64px] rounded-[12px] border border-[#D2D2D2] flex flex-col items-center justify-center relative">
                <span className="text-[#234745] text-[16px] font-bold absolute top-[8px]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                  {(product as any).servings?.value || '4-6'}
                </span>
                <span className="text-[#9FB7AE] text-[12px] font-bold absolute top-[36px] w-full text-center px-1 truncate" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                  {isEn ? 'Serves' : 'يكفي أشخاص'}
                </span>
              </div>

              {/* Prep Time Card */}
              <div className="flex-1 min-w-[100px] h-[64px] rounded-[12px] border border-[#D2D2D2] flex flex-col items-center justify-center relative">
                <div className="absolute top-[8px] flex items-center gap-1">
                  <span className="text-[#234745] text-[16px] font-bold" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                    {new Intl.NumberFormat('en-US').format(parseInt((product as any).prep_time?.value || '20'))}
                  </span>
                  <span className="text-[#234745] text-[16px] font-bold" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>{isEn ? 'min' : 'دقيقة'}</span>
                </div>
                <span className="text-[#9FB7AE] text-[12px] font-bold absolute top-[36px] w-full text-center px-1 truncate" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                  {isEn ? 'Prep Time' : 'وقت التجهيز'}
                </span>
              </div>

              {/* Calories Card */}
              <div className="flex-1 min-w-[100px] h-[64px] rounded-[12px] border border-[#D2D2D2] flex flex-col items-center justify-center relative">
                <span className="text-[#234745] text-[16px] font-bold absolute top-[8px]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                  {new Intl.NumberFormat('en-US').format(parseInt((product as any).calories?.value || '240'))}
                </span>
                <span className="text-[#9FB7AE] text-[12px] font-bold absolute top-[36px] w-full text-center px-1 truncate" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                  {isEn ? 'Calories' : 'سعر حراري'}
                </span>
              </div>
            </div>

            {/* Estimated Delivery Date */}
            {estimatedDeliveryDate && (
              <div className="flex items-center gap-[16px] mb-[24px] p-[16px] bg-[#F4F9F7] rounded-[16px] w-full">
                <div className="w-[40px] h-[40px] bg-white rounded-full flex items-center justify-center shrink-0">
                  <span className="text-[20px]">🚚</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[#9FB7AE] text-[12px] font-bold mb-[2px]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                    {isEn ? 'Estimated Delivery' : 'وقت التوصيل المتوقع'}
                  </span>
                  <span className="text-[#234745] text-[14px] font-bold leading-tight" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                    {estimatedDeliveryDate}
                  </span>
                </div>
              </div>
            )}

            {/* Premium Price Box */}
            <div className="w-full h-auto py-[16px] bg-[#FEF8EB] rounded-[16px] border border-[#BBCFCD]/50 flex flex-col justify-center px-[24px] mb-[24px] relative">
              <div className="flex items-center gap-[12px] w-full justify-start">
                <span
                  className="text-[#234745] font-bold"
                  style={{
                    fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif",
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
                  fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
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
                fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif",
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
            {((product as any).vegan?.value === 'true' || (product as any).vegan?.value === '1' ||
              (product as any).lactose_free?.value === 'true' || (product as any).lactose_free?.value === '1' ||
              (product as any).gluten_free?.value === 'true' || (product as any).gluten_free?.value === '1') && (
                <div className="flex flex-wrap items-center gap-[12px] mb-[24px] w-full" style={{ marginTop: '32px' }}>
                  {((product as any).vegan?.value === 'true' || (product as any).vegan?.value === '1') && (
                    <div className="h-[40px] px-[16px] bg-[#FEF8EB] rounded-[25px] border border-[#BBCFCD]/50 flex items-center justify-center whitespace-nowrap">
                      <span className="text-[#255441] text-[14px] font-normal" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>{isEn ? 'Vegan 100%' : 'نباتي 100%'}</span>
                    </div>
                  )}
                  {((product as any).lactose_free?.value === 'true' || (product as any).lactose_free?.value === '1') && (
                    <div className="h-[40px] px-[16px] bg-[#FEF8EB] rounded-[25px] border border-[#BBCFCD]/50 flex items-center justify-center whitespace-nowrap">
                      <span className="text-[#255441] text-[14px] font-normal" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>{isEn ? 'Lactose Free' : 'خالٍ من اللاكتوز'}</span>
                    </div>
                  )}
                  {((product as any).gluten_free?.value === 'true' || (product as any).gluten_free?.value === '1') && (
                    <div className="h-[40px] px-[16px] bg-[#FEF8EB] rounded-[25px] border border-[#BBCFCD]/50 flex items-center justify-center whitespace-nowrap">
                      <span className="text-[#255441] text-[14px] font-normal" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>{isEn ? 'Gluten Free' : 'خالٍ من الغلوتين'}</span>
                    </div>
                  )}
                </div>
              )}

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
                          <h5 className="font-bold text-[#234745] text-[20px]" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}>
                            {isEn ? 'Bundle Includes:' : 'محتويات العرض:'}
                          </h5>
                        </div>
                        {bundleSavings && bundleSavings > 0 && (
                          <div className="flex flex-col items-end">
                            <span className="text-[#906B51] text-[12px] font-bold mb-1" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                              {isEn ? 'You Save' : 'توفير العرض'}
                            </span>
                            <span className="bg-[#234745] text-white text-[14px] font-bold px-3 py-1 rounded-[8px] shadow-sm" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                              {new Intl.NumberFormat('en-US').format(bundleSavings)} {isEn ? 'SAR' : 'ر.س'}
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
                                  <span className="text-[16px] font-bold text-[#1a1a1a] line-clamp-2 leading-tight" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                                    {component.title}
                                  </span>
                                  {compPrice && (
                                    <div className="flex flex-row items-center gap-1 text-[#906B51] text-[14px] font-bold mt-2 justify-start" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
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
                    <div className="flex flex-col gap-[16px] w-full max-w-[519px]">
                      <h5 className="font-bold text-[#255441] text-[18px] !m-0 text-start" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
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
                              className={`w-full h-[64px] px-[16px] rounded-[12px] border transition-all flex items-center justify-between cursor-pointer ${isSelected ? 'border-[#234745] bg-[#f0f4f2]' : 'border-[#D2D2D2] bg-white hover:border-gray-300'
                                } ${outOfStock ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                              onClick={() => !outOfStock && handleAddonToggle(variant.id)}
                            >
                              <div className="flex items-center gap-[12px] flex-row">
                                {/* Checkbox */}
                                <div className={`w-[20px] h-[20px] rounded-[4px] border flex items-center justify-center transition-colors ${isSelected ? 'bg-[#255441] border-[#255441]' : 'border-[#9FB7AE] bg-white'
                                  }`}>
                                  {isSelected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>}
                                </div>

                                <p className="text-[16px] font-bold text-[#171717]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                                  {isEn ? addon.title : (addon.title === ' متوفر الان' ? 'متوفر الان' : addon.title)}
                                </p>
                              </div>
                              <div className="flex items-center gap-1 text-[16px] text-[#255441] font-bold" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                                <span>+</span>
                                {new Intl.NumberFormat('en-US').format(parseFloat(variant.price.amount))} {isEn ? 'SAR' : 'ر.س'}
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
                            style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif", lineHeight: '100%' }}
                          >
                            {isEn ? 'Send as a Gift' : 'أرسل كهدية'}
                          </span>
                          <span
                            className="text-[#7D7D7D] text-[14px] mt-[8px]"
                            style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", lineHeight: '100%' }}
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
                            <input type="text" value={recipientName} onChange={e => setRecipientName(e.target.value)} maxLength={30} className="w-full p-3 text-[14px] border border-[#BBCFCD]/50 rounded-[8px] focus:ring-[#234745] focus:border-[#234745] bg-white font-medium text-start" placeholder={isEn ? "e.g. Sarah" : "مثال: سارة"} />
                          </div>
                          <div className="flex flex-col gap-2">
                            <label className="text-[13px] font-bold text-[#1a1a1a] text-start">{isEn ? 'Gift Message' : 'رسالة إهداء'}</label>
                            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} maxLength={150} className="w-full p-3 text-[14px] border border-[#BBCFCD]/50 rounded-[8px] focus:ring-[#234745] focus:border-[#234745] resize-none bg-white font-medium text-start" placeholder={isEn ? "Write a lovely message..." : "اكتب رسالة جميلة..."}></textarea>
                            <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold px-1">
                              <span>{isEn ? 'Max 150 chars' : 'الحد الأقصى ١٥٠ حرفاً'}</span>
                              <span>
                                {isEn
                                  ? `${150 - note.length} remaining`
                                  : `متبقي ${150 - note.length} حرفاً`}
                              </span>
                            </div>
                          </div>
                          <label className="flex items-center gap-3 cursor-pointer group flex-row">
                            <input type="checkbox" checked={hideSender} onChange={e => setHideSender(e.target.checked)} className="w-[18px] h-[18px] rounded-[4px] text-[#234745] focus:ring-[#234745] border-[#BBCFCD]/50" />
                            <span className="text-[13px] font-medium text-[#7D7D7D] group-hover:text-[#234745] transition-colors">{isEn ? 'Hide my name (Anonymous Gift)' : 'إخفاء اسمي (هدية سرية)'}</span>
                          </label>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Cake Custom Text Section */}
                  {isCakeProduct && (
                    <div className="w-full mt-[8px] max-w-[519px]">
                      <div className="bg-[#FEF8EB] border border-[#E5E5E5] rounded-[16px] p-[16px] flex flex-col items-start gap-4 shadow-sm relative overflow-hidden">
                        <div className="absolute top-[10px] right-[-10px] opacity-10 pointer-events-none transform -rotate-12">
                          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 4.5C12 4.5 9.5 2 6 2C2.5 2 2 6 2 6C2 6 2.5 8 6 8C9.5 8 12 4.5 12 4.5Z" fill="#234745" />
                            <path d="M12 4.5C12 4.5 14.5 2 18 2C21.5 2 22 6 22 6C22 6 21.5 8 18 8C14.5 8 12 4.5 12 4.5Z" fill="#234745" />
                            <path d="M2 10H22V14H2V10Z" fill="#234745" />
                            <path d="M2 16H22V22H2V16Z" fill="#234745" />
                          </svg>
                        </div>
                        <div className="flex flex-col justify-center items-start z-10 w-full text-start">
                          <span
                            className="font-bold text-[#234745] text-[18px]"
                            style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif", lineHeight: '100%' }}
                          >
                            {isEn ? 'Custom Cake Text' : 'كتابة على الكيكة'}
                          </span>
                          <span
                            className="text-[#7D7D7D] text-[14px] mt-[8px]"
                            style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", lineHeight: '100%' }}
                          >
                            {isEn ? 'What would you like us to write on the cake?' : 'ماذا تود أن نكتب على الكيكة؟'}
                          </span>
                        </div>
                        <input
                          type="text"
                          value={cakeMessage}
                          onChange={e => setCakeMessage(e.target.value)}
                          className="w-full p-3 text-[14px] border border-[#BBCFCD]/50 rounded-[8px] focus:ring-[#234745] focus:border-[#234745] bg-white font-medium text-start z-10 transition-colors shadow-inner"
                          placeholder={isEn ? "e.g. Happy Birthday" : "مثال: عيد ميلاد سعيد"}
                          maxLength={24}
                        />
                        <div className="flex items-center gap-2 mt-2 z-10">
                          <span className="text-[12px] text-[#d4a06a] font-semibold text-start">
                            {isEn
                              ? '⚠️ Note: If you do not enter a message, the cake will be prepared plain without any writing.'
                              : '⚠️ ملاحظة: إذا لم تقم بكتابة أي رسالة، سيتم تحضير الكيكة سادة بدون أي كتابة.'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Old Tags section removed as they are now at the top */}
                </div>
              )}
            </Await>
          </Suspense>
        </div>

        {/* LEFT COLUMN: Sticky Info Sidebar (Takes 3 cols, Left-most in RTL) / Mobile Sticky Bottom Sheet */}
        <div className="lg:col-span-3 flex flex-col gap-4 order-3 w-full">
          <div className="lg:sticky lg:top-24 flex flex-col gap-4 w-full lg:w-[301px]">

            {/* Desktop Action Box Container (hidden on mobile) */}
            {effectiveOutOfStock ? (
              isVisibilityBlocked ? (
                /* ── Seasonal Out-of-Season Card (matching screenshot spec) ── */
                (() => {
                  const seasonMsg = (product as any).seasonal_message?.value || (product as any).next_season_date?.value || null;
                  return (
                    <div className="hidden lg:flex bg-white rounded-[24px] border border-[#BBCFCD]/60 p-6 flex-col items-start justify-center text-start gap-3 w-full shadow-sm">
                      {/* Line 1: Header with brown exclamation circle icon */}
                      <div className="flex items-center justify-center gap-2">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="shrink-0">
                          <circle cx="12" cy="12" r="10" stroke="#906B51" strokeWidth="1.8" />
                          <line x1="12" y1="8" x2="12" y2="12" stroke="#906B51" strokeWidth="2" strokeLinecap="round" />
                          <circle cx="12" cy="16" r="1" fill="#906B51" />
                        </svg>
                        <span className="text-[#171717] font-medium text-[16px] sm:text-[16px]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                          {isEn ? 'Out for the Season' : 'نفد هذا المنتج للموسم'}
                        </span>

                      </div>

                      {/* Line 2: Subtitle message (Only displayed when date/message exists) */}
                      {seasonMsg && (
                        <div className="text-[#9FB7AE] text-[16px] font-medium" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}>
                          {seasonMsg}
                        </div>
                      )}

                      {/* Line 3: Solid Brown Pill (Notify Me for Next Season) */}
                      <button
                        type="button"
                        onClick={() => setIsNotifyModalOpen(true)}
                        className="w-full py-[12px] bg-[#906B51] hover:bg-[#7d5c45] active:scale-[0.98] text-white rounded-full flex items-center justify-center gap-2 transition-all mt-1 shadow-sm"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                          <path d="M13.73 21a2 2 0 01-3.46 0" />
                        </svg>
                        <span style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", fontWeight: 700, fontSize: '16px' }}>
                          {isEn ? 'Notify Me for Next Season' : 'أبلغني في الموسم القادم'}
                        </span>

                      </button>

                      {/* Line 4: Soft Cream Pill (Pre-order for Next Season) */}
                      <button
                        type="button"
                        onClick={() => setIsNotifyModalOpen(true)}
                        className="w-full py-[12px] bg-[#FEF8EB] hover:bg-[#FFF4E0] active:scale-[0.98] border border-[#234745] text-[#234745] rounded-full flex items-center justify-center gap-2 transition-all shadow-sm"
                      >
                        <span style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", fontWeight: 700, fontSize: '16px' }}>
                          {isEn ? 'Pre-order for Next Season' : 'طلب مسبق للموسم القادم'}
                        </span>
                      </button>
                    </div>
                  );
                })()
              ) : (
                /* ── Standard Out-of-Stock Card (Standalone single card matching screenshot) ── */
                (() => {
                  const restockDate = (product as any).restock_date?.value || (product as any).expected_restock_date?.value || null;
                  let formattedRestock: string | null = null;
                  if (restockDate) {
                    try {
                      const d = new Date(restockDate);
                      formattedRestock = d.toLocaleDateString(isEn ? 'en-SA' : 'ar-SA-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' });
                    } catch (_) { formattedRestock = restockDate; }
                    if (formattedRestock) {
                      formattedRestock = formattedRestock.replace(/[٠-٩]/g, d => '٠١٢٣٥٦٧٨٩'.indexOf(d).toString());
                    }
                  }
                  return (
                    <div className="hidden lg:flex bg-white rounded-[20px] border border-[#BBCFCD]/50 p-[16px] flex-col items-start justify-center text-start gap-3 w-full">
                      {/* Line 1: Status with red exclamation icon */}
                      <div className="flex items-center justify-center gap-2">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="shrink-0">
                          <circle cx="12" cy="12" r="10" stroke="#E64950" strokeWidth="1.8" />
                          <line x1="12" y1="8" x2="12" y2="12" stroke="#E64950" strokeWidth="2" strokeLinecap="round" />
                          <circle cx="12" cy="16" r="1" fill="#E64950" />
                        </svg>
                        <span className="text-[#171717] font-medium text-[16px] sm:text-[16px]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                          {isEn ? 'Currently Unavailable' : 'غير متوفر حالياً'}
                        </span>
                      </div>

                      {/* Line 2: Restock Date (rendered only if date exists) */}
                      {formattedRestock && (
                        <div className="text-[#906B51] text-[16px] font-bold" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}>
                          {isEn ? `Expected: ${formattedRestock}` : `متوقع توفره: ${formattedRestock}`}
                        </div>
                      )}

                      {/* Line 3: Notify Me Pill Button */}
                      <button
                        type="button"
                        onClick={() => setIsNotifyModalOpen(true)}
                        className="w-full bg-[#FFFBF0] py-[12px] hover:bg-[#FFF4E0] active:scale-[0.98] border border-[#234745] text-[#234745] rounded-full flex items-center justify-center gap-2 transition-all mt-1 shadow-sm"
                      >
                        <svg width="13" height="17" viewBox="0 0 13 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path fill-rule="evenodd" clip-rule="evenodd" d="M7.15137 0.833333C7.15137 0.61232 7.06357 0.400358 6.90729 0.244078C6.75101 0.0877973 6.53905 0 6.31804 0C6.09703 0 5.88506 0.0877973 5.72878 0.244078C5.5725 0.400358 5.48471 0.61232 5.48471 0.833333V1.45833H5.02054C4.12723 1.45827 3.26748 1.79866 2.61631 2.4102C1.96514 3.02173 1.5715 3.85845 1.51554 4.75L1.33137 7.695C1.26018 8.81768 0.883242 9.8995 0.241372 10.8233C0.108566 11.0142 0.0274194 11.2362 0.00582378 11.4678C-0.0157718 11.6993 0.0229185 11.9325 0.118132 12.1446C0.213346 12.3568 0.361841 12.5407 0.549178 12.6785C0.736515 12.8162 0.956316 12.9032 1.18721 12.9308L4.02637 13.2708V14.1667C4.02637 14.7745 4.26781 15.3573 4.69759 15.7871C5.12736 16.2169 5.71025 16.4583 6.31804 16.4583C6.92583 16.4583 7.50872 16.2169 7.93849 15.7871C8.36826 15.3573 8.60971 14.7745 8.60971 14.1667V13.2708L11.4489 12.93C11.6796 12.9023 11.8993 12.8153 12.0865 12.6776C12.2737 12.5399 12.4221 12.3561 12.5173 12.144C12.6125 11.932 12.6513 11.699 12.6298 11.4676C12.6083 11.2361 12.5273 11.0142 12.3947 10.8233C11.7528 9.8995 11.3759 8.81768 11.3047 7.695L11.1205 4.75083C11.0648 3.85913 10.6712 3.02221 10.02 2.4105C9.36885 1.79879 8.50898 1.45829 7.61554 1.45833H7.15137V0.833333ZM5.02054 2.70833C4.44518 2.70826 3.89143 2.92748 3.47202 3.32134C3.05261 3.7152 2.79908 4.25411 2.76304 4.82833L2.57971 7.77333C2.49402 9.12395 2.04042 10.4254 1.26804 11.5367C1.25843 11.5505 1.25255 11.5665 1.25098 11.5833C1.24942 11.6 1.25221 11.6169 1.25908 11.6322C1.26596 11.6476 1.27669 11.6609 1.29024 11.6709C1.30378 11.6808 1.31967 11.6872 1.33637 11.6892L4.45054 12.0633C5.69137 12.2117 6.94471 12.2117 8.18554 12.0633L11.2997 11.6892C11.3164 11.6872 11.3323 11.6808 11.3458 11.6709C11.3594 11.6609 11.3701 11.6476 11.377 11.6322C11.3839 11.6169 11.3867 11.6 11.3851 11.5833C11.3835 11.5665 11.3776 11.5505 11.368 11.5367C10.5959 10.4253 10.1426 9.12387 10.0572 7.77333L9.87304 4.82833C9.837 4.25411 9.58347 3.7152 9.16406 3.32134C8.74465 2.92748 8.19089 2.70826 7.61554 2.70833H5.02054ZM6.31804 15.2083C5.74304 15.2083 5.27637 14.7417 5.27637 14.1667V13.5417H7.35971V14.1667C7.35971 14.7417 6.89304 15.2083 6.31804 15.2083Z" fill="#234745" />
                        </svg>

                        <span style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", fontWeight: 700, fontSize: '16px' }}>
                          {isEn ? 'Notify Me When Available' : 'أبلغني عند التوفر'}
                        </span>
                      </button>
                    </div>
                  );
                })()
              )
            ) : (
              <div className="hidden lg:flex bg-white rounded-[20px] p-4 border border-[#BBCFCD]/50 flex-col gap-6 w-full">
                {/* 1. Payment Promo Banner */}
                <div className="bg-[#FEF8EB] rounded-[16px] py-[12px] px-[16px] border border-[#BBCFCD]/50 flex flex-col items-center justify-center gap-2">
                  <div className="flex items-center justify-center gap-[16px] w-full h-[32px]">
                    <img src="/images/icons/apple-pay.png" className="h-[15px] object-contain" alt="Apple Pay" />
                    <img src="/images/icons/mastercard.png" className="h-[18px] object-contain" alt="Mastercard" />
                    <img src="/images/icons/visa.png" className="h-[14px] object-contain" alt="Visa" />
                    <img src="/images/icons/mada.png" className="h-[24px] object-contain scale-[1.7] origin-center" alt="Mada" />
                  </div>
                  <span className="text-[14px] font-bold text-[#234745] text-center" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                    {isEn ? 'Split it into 4 interest-free payments' : 'قسّطها على ٤ دفعات بدون فوائد'}
                  </span>
                </div>

                {/* 2. Quantity */}
                <div className="flex items-center justify-between h-[40px] w-full">
                  <span className="font-medium text-[#171717] text-[16px]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                    {isEn ? 'Quantity' : 'الكمية'}
                  </span>
                  <div className="flex items-center gap-[8px]">
                    <button
                      type="button"
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-[40px] h-[40px] flex items-center justify-center bg-white rounded-[8px] text-[#234745] border border-[#BBCFCD]/50 hover:border-[#234745] transition-all"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                    </button>

                    <div className="w-[40px] h-[40px] flex items-center justify-center bg-white rounded-[8px] border border-[#BBCFCD]/50 font-medium text-[16px] text-[#255441]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                      {new Intl.NumberFormat('en-US').format(quantity)}
                    </div>

                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-[40px] h-[40px] flex items-center justify-center bg-white rounded-[8px] text-[#906B51] border border-[#BBCFCD]/50 hover:border-[#234745] transition-all"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14" /></svg>
                    </button>
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
                        disabled={!selectedVariant}
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
                                  { key: '_groupId', value: groupId },
                                  ...(isBundle && bundleComponents.length > 0 ? [
                                    {
                                      key: isEn ? 'Bundle Includes' : 'محتويات العرض',
                                      value: bundleComponents.map((c: any) => `• ${c.title}`).join('\n')
                                    },
                                    {
                                      key: '_bundle_skus',
                                      value: bundleComponents.map((c: any) => c.variants?.nodes?.[0]?.sku).filter(Boolean).join(', ')
                                    }
                                  ] : []),
                                  ...(cakeMessage ? [{ key: 'Cake Message', value: cakeMessage }] : []),
                                  ...(isGiftMode ? [
                                    { key: '_isGift', value: 'true' },
                                    ...(recipientName ? [{ key: 'Recipient Name', value: recipientName }] : []),
                                    ...(note ? [{ key: 'Gift Message', value: note }] : []),
                                    { key: '_hideSender', value: hideSender ? 'Yes' : 'No' },
                                  ] : (note ? [{ key: 'Order Note', value: note }] : [])),
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
                                    { key: '_groupId', value: groupId },
                                    { key: '_is_addon', value: 'true' },
                                    ...(variant?.sku ? [{ key: '_sku', value: variant.sku }] : []),
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
                                    selectedVariant: selectedVariant,
                                    attributes: [
                                      { key: '_groupId', value: groupId },
                                      { key: '_is_addon', value: 'true' },
                                      { key: '_is_free', value: 'true' },
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
                            <span style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", fontWeight: 700, fontSize: '16px', lineHeight: '20px' }}>{isEn ? 'Add to Cart' : 'أضف إلي السلة'}</span>
                          </>
                        )}
                      </AddToCartButton>

                      {/* Notify Me button — shown only when out of stock */}
                      {effectiveOutOfStock && (
                        <button
                          type="button"
                          onClick={() => setIsNotifyModalOpen(true)}
                          className="w-full h-[48px] bg-[#234745] hover:bg-[#1a3533] active:scale-[0.98] text-white rounded-[25px] flex items-center justify-center gap-[8px] transition-all mt-2"
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 01-3.46 0" />
                          </svg>
                          <span style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", fontWeight: 700, fontSize: '16px', lineHeight: '20px' }}>
                            {isEn ? 'Notify Me When Available' : 'أبلغني عند التوفر'}
                          </span>
                        </button>
                      )}

                      {/* Buy Now */}
                      <button
                        type="button"
                        onClick={handleBuyNow}
                        disabled={!selectedVariant || effectiveOutOfStock || isBuyingNow}
                        className={`w-full h-[48px] ${effectiveOutOfStock || !selectedVariant ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-[#EED5D7] hover:bg-[#e4d0d0] active:scale-[0.98] text-[#E64950]'} rounded-[25px] flex items-center justify-center gap-[8px] transition-all`}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4Z" />
                          <line x1="3" y1="6" x2="21" y2="6" />
                          <path d="M16 10a4 4 0 01-8 0" />
                        </svg>
                        <span style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", fontWeight: 700, fontSize: '16px', lineHeight: '20px' }}>
                          {isBuyingNow ? (isEn ? 'Processing...' : 'جاري التحويل...') : (isEn ? 'Buy Now' : 'إشتري الان')}
                        </span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Mobile Action Box Container (sticky bottom sheet, hidden on desktop) */}
            <div className="lg:hidden bg-white fixed bottom-0 left-0 right-0 z-40 rounded-t-[32px] px-[16px] py-[24px] shadow-[0_-10px_30px_rgba(0,0,0,0.08)] border-t border-[#BBCFCD]/30 flex flex-col gap-4">

              <div className="flex flex-col gap-4">
                {/* 1. Quantity */}
                {!effectiveOutOfStock && (
                  <div className="flex items-center justify-between h-[40px] w-full">
                    <span className="font-bold text-[#171717] text-[16px]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                      {isEn ? 'Quantity' : 'الكمية'}
                    </span>
                    <div className="flex items-center gap-[8px]">
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-[40px] h-[40px] flex items-center justify-center bg-white rounded-[8px] text-[#906B51] border border-[#BBCFCD]/50 hover:border-[#234745] transition-all font-bold"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14" /></svg>
                      </button>
                      <div className="w-[40px] h-[40px] flex items-center justify-center bg-white rounded-[8px] border border-[#BBCFCD]/50 font-bold text-[16px] text-[#255441]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                        {new Intl.NumberFormat('en-US').format(quantity)}
                      </div>
                      <button
                        type="button"
                        onClick={() => setQuantity(quantity + 1)}
                        className="w-[40px] h-[40px] flex items-center justify-center bg-white rounded-[8px] text-[#234745] border border-[#BBCFCD]/50 hover:border-[#234745] transition-all font-bold"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. Actions (Add to Cart / Buy Now side-by-side) */}
                <div className="w-full">
                  {isVisibilityBlocked ? (
                    /* ── Mobile Seasonal Out-of-Season View (matching user design spec) ── */
                    (() => {
                      const seasonMsg = (product as any).seasonal_message?.value || (product as any).next_season_date?.value || null;
                      return (
                        <div className="w-full flex flex-col items-center justify-center text-center gap-3 py-1">
                          {/* Line 1: Header with brown exclamation circle icon */}
                          <div className="flex items-center justify-center gap-2">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="shrink-0">
                              <circle cx="12" cy="12" r="10" stroke="#906B51" strokeWidth="1.8" />
                              <line x1="12" y1="8" x2="12" y2="12" stroke="#906B51" strokeWidth="2" strokeLinecap="round" />
                              <circle cx="12" cy="16" r="1" fill="#906B51" />
                            </svg>
                            <span className="text-[#171717] font-bold text-[18px]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                              {isEn ? 'Out for the Season' : 'نفد هذا المنتج للموسم'}
                            </span>

                          </div>

                          {/* Line 2: Subtitle message (Only displayed when date/message exists) */}
                          {seasonMsg && (
                            <div className="text-[#967459] text-[15px] font-bold" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                              {seasonMsg}
                            </div>
                          )}

                          {/* Line 3: Solid Brown Pill (Notify Me for Next Season) */}
                          <button
                            type="button"
                            onClick={() => setIsNotifyModalOpen(true)}
                            className="w-full py-[12px] bg-[#906B51] hover:bg-[#7d5c45] active:scale-[0.98] text-white rounded-full flex items-center justify-center gap-2 transition-all mt-1 shadow-sm"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                              <path d="M13.73 21a2 2 0 01-3.46 0" />
                            </svg>
                            <span style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", fontWeight: 700, fontSize: '15px' }}>
                              {isEn ? 'Notify Me for Next Season' : 'أبلغني في الموسم القادم'}
                            </span>

                          </button>

                          {/* Line 4: Soft Cream Pill (Pre-order for Next Season) */}
                          <button
                            type="button"
                            onClick={() => setIsNotifyModalOpen(true)}
                            className="w-full py-[12px] bg-[#FFFBF0] hover:bg-[#FFF4E0] active:scale-[0.98] border border-[#234745] text-[#234745] rounded-full flex items-center justify-center gap-2 transition-all shadow-sm"
                          >
                            <span style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", fontWeight: 700, fontSize: '15px' }}>
                              {isEn ? 'Pre-order for Next Season' : 'طلب مسبق للموسم القادم'}
                            </span>
                          </button>
                        </div>
                      );
                    })()
                  ) : effectiveOutOfStock ? (
                    /* ── Mobile Out-of-Stock View (matching image 2) ── */
                    (() => {
                      const restockDate = (product as any).restock_date?.value || (product as any).expected_restock_date?.value || null;
                      let formattedRestock: string | null = null;
                      if (restockDate) {
                        try {
                          const d = new Date(restockDate);
                          formattedRestock = d.toLocaleDateString(isEn ? 'en-SA' : 'ar-SA-u-nu-latn', { year: 'numeric', month: 'long', day: 'numeric' });
                        } catch (_) { formattedRestock = restockDate; }
                        if (formattedRestock) {
                          formattedRestock = formattedRestock.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
                        }
                      }
                      return (
                        <div className="w-full flex flex-col items-center justify-center text-center gap-3 py-1">
                          <div className="flex items-center justify-center gap-2">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="shrink-0">
                              <circle cx="12" cy="12" r="10" stroke="#E64950" strokeWidth="1.8" />
                              <line x1="12" y1="8" x2="12" y2="12" stroke="#E64950" strokeWidth="2" strokeLinecap="round" />
                              <circle cx="12" cy="16" r="1" fill="#E64950" />
                            </svg>
                            <span className="text-[#171717] font-medium text-[16px]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                              {isEn ? 'Currently Unavailable' : 'غير متوفر حالياً'}
                            </span>
                          </div>
                          {formattedRestock && (
                            <div className="text-[#906B51] text-[16px] font-bold" style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}>
                              {isEn ? `Expected: ${formattedRestock}` : `متوقع توفره: ${formattedRestock}`}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => setIsNotifyModalOpen(true)}
                            className="w-full py-[12px] bg-[#FFFBF0] hover:bg-[#FFF4E0] active:scale-[0.98] border border-[#255441] text-[#255441] rounded-full flex items-center justify-center gap-2 transition-all mt-1 shadow-sm"
                          >
                            <svg width="13" height="17" viewBox="0 0 13 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path fill-rule="evenodd" clip-rule="evenodd" d="M7.15137 0.833333C7.15137 0.61232 7.06357 0.400358 6.90729 0.244078C6.75101 0.0877973 6.53905 0 6.31804 0C6.09703 0 5.88506 0.0877973 5.72878 0.244078C5.5725 0.400358 5.48471 0.61232 5.48471 0.833333V1.45833H5.02054C4.12723 1.45827 3.26748 1.79866 2.61631 2.4102C1.96514 3.02173 1.5715 3.85845 1.51554 4.75L1.33137 7.695C1.26018 8.81768 0.883242 9.8995 0.241372 10.8233C0.108566 11.0142 0.0274194 11.2362 0.00582378 11.4678C-0.0157718 11.6993 0.0229185 11.9325 0.118132 12.1446C0.213346 12.3568 0.361841 12.5407 0.549178 12.6785C0.736515 12.8162 0.956316 12.9032 1.18721 12.9308L4.02637 13.2708V14.1667C4.02637 14.7745 4.26781 15.3573 4.69759 15.7871C5.12736 16.2169 5.71025 16.4583 6.31804 16.4583C6.92583 16.4583 7.50872 16.2169 7.93849 15.7871C8.36826 15.3573 8.60971 14.7745 8.60971 14.1667V13.2708L11.4489 12.93C11.6796 12.9023 11.8993 12.8153 12.0865 12.6776C12.2737 12.5399 12.4221 12.3561 12.5173 12.144C12.6125 11.932 12.6513 11.699 12.6298 11.4676C12.6083 11.2361 12.5273 11.0142 12.3947 10.8233C11.7528 9.8995 11.3759 8.81768 11.3047 7.695L11.1205 4.75083C11.0648 3.85913 10.6712 3.02221 10.02 2.4105C9.36885 1.79879 8.50898 1.45829 7.61554 1.45833H7.15137V0.833333ZM5.02054 2.70833C4.44518 2.70826 3.89143 2.92748 3.47202 3.32134C3.05261 3.7152 2.79908 4.25411 2.76304 4.82833L2.57971 7.77333C2.49402 9.12395 2.04042 10.4254 1.26804 11.5367C1.25843 11.5505 1.25255 11.5665 1.25098 11.5833C1.24942 11.6 1.25221 11.6169 1.25908 11.6322C1.26596 11.6476 1.27669 11.6609 1.29024 11.6709C1.30378 11.6808 1.31967 11.6872 1.33637 11.6892L4.45054 12.0633C5.69137 12.2117 6.94471 12.2117 8.18554 12.0633L11.2997 11.6892C11.3164 11.6872 11.3323 11.6808 11.3458 11.6709C11.3594 11.6609 11.3701 11.6476 11.377 11.6322C11.3839 11.6169 11.3867 11.6 11.3851 11.5833C11.3835 11.5665 11.3776 11.5505 11.368 11.5367C10.5959 10.4253 10.1426 9.12387 10.0572 7.77333L9.87304 4.82833C9.837 4.25411 9.58347 3.7152 9.16406 3.32134C8.74465 2.92748 8.19089 2.70826 7.61554 2.70833H5.02054ZM6.31804 15.2083C5.74304 15.2083 5.27637 14.7417 5.27637 14.1667V13.5417H7.35971V14.1667C7.35971 14.7417 6.89304 15.2083 6.31804 15.2083Z" fill="#234745" />
                            </svg>
                            <span style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", fontWeight: 700, fontSize: '16px' }}>
                              {isEn ? 'Notify Me When Available' : 'أبلغني عند التوفر'}
                            </span>
                          </button>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="flex flex-row gap-3 items-center w-full">
                      {/* Add to Cart */}
                      {/* Add to Cart Wrapper */}
                      <div className="flex-1">
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
                                    { key: '_groupId', value: groupId },
                                    ...(isBundle && bundleComponents.length > 0 ? [
                                      {
                                        key: isEn ? 'Bundle Includes' : 'محتويات العرض',
                                        value: bundleComponents.map((c: any) => `• ${c.title}`).join('\n')
                                      },
                                      {
                                        key: '_bundle_skus',
                                        value: bundleComponents.map((c: any) => c.variants?.nodes?.[0]?.sku).filter(Boolean).join(', ')
                                      }
                                    ] : []),
                                    ...(cakeMessage ? [{ key: 'Cake Message', value: cakeMessage }] : []),
                                    ...(isGiftMode ? [
                                      { key: '_isGift', value: 'true' },
                                      ...(recipientName ? [{ key: 'Recipient Name', value: recipientName }] : []),
                                      ...(note ? [{ key: 'Gift Message', value: note }] : []),
                                      { key: '_hideSender', value: hideSender ? 'Yes' : 'No' },
                                    ] : (note ? [{ key: 'Order Note', value: note }] : [])),
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
                                      { key: '_groupId', value: groupId },
                                      { key: '_is_addon', value: 'true' },
                                      ...(variant?.sku ? [{ key: '_sku', value: variant.sku }] : []),
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
                                      selectedVariant: selectedVariant,
                                      attributes: [
                                        { key: '_groupId', value: groupId },
                                        { key: '_is_addon', value: 'true' },
                                        { key: '_is_free', value: 'true' },
                                      ],
                                    },
                                    ...addonLines
                                  ];
                                }

                                return [mainLine, ...addonLines];
                              })()
                              : []
                          }
                          className={`w-full h-[48px] ${effectiveOutOfStock ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#234745] hover:bg-[#1a3533] active:scale-[0.98]'} text-white rounded-[25px] flex items-center justify-center transition-all`}
                        >
                          {effectiveOutOfStock ? (
                            <span className="text-[13px] sm:text-[14px] font-bold">{isEn ? 'Out of Stock' : 'نفذت الكمية'}</span>
                          ) : (
                            <span className="flex items-center justify-center gap-1.5 w-full h-full px-1">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                                <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                                <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6" />
                              </svg>
                              <span className="whitespace-nowrap text-[13px] sm:text-[14px]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", fontWeight: 700, lineHeight: '100%' }}>{isEn ? 'Add to Cart' : 'أضف للسلة'}</span>
                            </span>
                          )}
                        </AddToCartButton>

                        {/* Sticky Notify Me button — shown only when out of stock */}
                        {effectiveOutOfStock && (
                          <button
                            type="button"
                            onClick={() => setIsNotifyModalOpen(true)}
                            className="w-full h-[48px] bg-[#234745] hover:bg-[#1a3533] active:scale-[0.98] text-white rounded-[25px] flex items-center justify-center gap-1.5 transition-all mt-2"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
                              <path d="M13.73 21a2 2 0 01-3.46 0" />
                            </svg>
                            <span className="whitespace-nowrap text-[13px] sm:text-[14px]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", fontWeight: 700, lineHeight: '100%' }}>
                              {isEn ? 'Notify Me' : 'أبلغني عند التوفر'}
                            </span>
                          </button>
                        )}
                      </div>

                      {/* Buy Now Wrapper */}
                      <div className="flex-1">
                        <button
                          type="button"
                          onClick={handleBuyNow}
                          disabled={!selectedVariant || effectiveOutOfStock || isBuyingNow}
                          className={`w-full h-[48px] ${effectiveOutOfStock || !selectedVariant ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-[#EED5D7] hover:bg-[#e4d0d0] active:scale-[0.98] text-[#E64950]'} rounded-[25px] flex items-center justify-center transition-all`}
                        >
                          <span className="flex items-center justify-center gap-1.5 w-full h-full px-1">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4Z" />
                              <line x1="3" y1="6" x2="21" y2="6" />
                              <path d="M16 10a4 4 0 01-8 0" />
                            </svg>
                            <span className="whitespace-nowrap text-[13px] sm:text-[14px]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", fontWeight: 700, lineHeight: '100%' }}>
                              {isBuyingNow ? (isEn ? 'Processing...' : 'جاري...') : (isEn ? 'Buy Now' : 'شراء الآن')}
                            </span>
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Payment Promo Banner */}
              {!effectiveOutOfStock && (
                <div className="bg-[#FEF8EB] rounded-[16px] py-[10px] px-[16px] border border-[#BBCFCD]/50 flex flex-col items-center justify-center w-full">
                  <div className="flex items-center justify-center gap-[16px] w-full h-[24px]">
                    <img src="/images/icons/apple-pay.png" className="h-[14px] object-contain" alt="Apple Pay" />
                    <img src="/images/icons/mastercard.png" className="h-[16px] object-contain" alt="Mastercard" />
                    <img src="/images/icons/visa.png" className="h-[12px] object-contain" alt="Visa" />
                    <img src="/images/icons/mada.png" className="h-[20px] object-contain scale-[1.5] origin-center" alt="Mada" />
                  </div>
                </div>
              )}
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
                  <div className="pb-[12px] flex flex-col justify-center gap-[4px]">
                    <h4 className="font-bold text-[14px] text-[#234745] leading-[17px] !mt-[0]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>{isEn ? 'Free Delivery' : 'توصيل مجاني'}</h4>
                    <p className="text-[12px] text-[#7D7D7D] font-normal leading-[15px]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                      {isEn
                        ? `On orders above ${threshold} SAR`
                        : `للطلبات فوق ${new Intl.NumberFormat('en-US').format(threshold)} ر.س`}
                    </p>
                  </div>
                  <div className="h-[1px] w-full bg-[#BBCFCD]/50"></div>

                  {/* Item 2: Branch Pickup */}
                  <div className="py-[12px] flex flex-col justify-center gap-[4px]">
                    <h4 className="font-bold text-[14px] text-[#234745] leading-[17px]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>{isEn ? 'Branch Pickup' : 'استلام من الفرع'}</h4>
                    <p className="text-[12px] text-[#7D7D7D] font-normal leading-[15px]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                      {isEn ? 'Ready in 15 minutes' : 'جاهز خلال 15 دقيقة'}
                    </p>
                  </div>
                  <div className="h-[1px] w-full bg-[#BBCFCD]/50"></div>

                  {/* Item 3: Guaranteed Return */}
                  <div className="py-[12px] flex flex-col justify-center gap-[4px]">
                    <h4 className="font-bold text-[14px] text-[#234745] leading-[17px]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>{isEn ? 'Guaranteed Return' : 'استرجاع مضمون'}</h4>
                    <p className="text-[12px] text-[#7D7D7D] font-normal leading-[15px]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
                      {isEn ? 'Within 24 hours of receipt' : 'خلال 24 ساعة من الاستلام'}
                    </p>
                  </div>
                  <div className="h-[1px] w-full bg-[#BBCFCD]/50"></div>

                  {/* Item 4: Secure Payment */}
                  <div className="pt-[12px] flex flex-col justify-center gap-[4px]">
                    <h4 className="font-bold text-[14px] text-[#234745] leading-[17px]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>{isEn ? '100% Secure Payment' : 'دفع آمن 100%'}</h4>
                    <p className="text-[12px] text-[#7D7D7D] font-normal leading-[15px]" style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}>
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
      <div className="w-full bg-[#FEF8EB] py-10 md:py-[56px] flex flex-col items-center">
        <div className="w-full max-w-[1280px] px-4 md:px-0 flex flex-col items-start gap-[24px]">

          {/* DESKTOP TABS INTERFACE (hidden on mobile) */}
          <div className="hidden md:flex flex-col w-full gap-[24px] items-start">
            {/* Tabs Header */}
            {(() => {
              const tabs = [
                { id: 'details', label: isEn ? 'Product Description' : 'وصف المنتج' },
                { id: 'reviews', label: isEn ? `Reviews (${reviews?.length || 0})` : `المراجعات (${new Intl.NumberFormat('en-US').format(reviews?.length || 0)})` },
                ...((product as any).nutrition?.value ? [{ id: 'nutrition', label: isEn ? 'Nutrition Facts' : 'حقائق غذائية' }] : [])
              ];
              return (
                <div className="w-full flex flex-col gap-[16px] items-start relative">
                  <div className="flex flex-row items-center gap-[48px]">
                    {tabs.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        className={`text-[18px] transition-all flex items-center justify-center w-[128px] h-[24px] ${activeTab === t.id ? 'text-[#255441] font-bold' : 'text-[#7D7D7D] font-medium'}`}
                        style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", lineHeight: '22px' }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Lines container */}
                  <div className="w-full relative h-[2px]">
                    {/* Full width muted line */}
                    <div className="absolute top-0 left-0 w-full border-t border-[#BBCFCD]/50"></div>
                    {/* Active Indicator Line */}
                    <div
                      className="absolute top-[-1px] border-t-[2px] border-[#234745] transition-all duration-300 w-[128px]"
                      style={{
                        [isEn ? 'left' : 'right']: `${tabs.findIndex(t => t.id === activeTab) * 176}px`
                      }}
                    ></div>
                  </div>
                </div>
              );
            })()}

            {/* Tab Content */}
            <div className="w-full animate-fade-in text-start">
              {activeTab === 'details' ? (
                <div className="w-full">
                  <div
                    className="text-[#171717] leading-[24px] font-normal text-[16px] mb-[20px] [&>p]:mb-[16px] last:[&>p]:mb-0"
                    style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                    dangerouslySetInnerHTML={{ __html: product.descriptionHtml || product.description }}
                  />

                  {/* Metafield Info: Allergens Warning only */}
                  {(product as any).allergens?.value && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className={`p-8 bg-orange-50/50 rounded-[32px] border border-orange-100/50 ${isEn ? 'text-left' : 'text-right'}`}>
                        <h5 className="text-[16px] font-black text-orange-800 mb-4 flex items-center gap-3">
                          <span className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-xl">⚠️</span>
                          {isEn ? 'Allergens Warning' : 'معلومات الحساسية'}
                        </h5>
                        <p className="text-[15px] font-bold text-orange-700/80 leading-relaxed">
                          {(product as any).allergens.value}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : activeTab === 'nutrition' ? (
                <div className="w-full">
                  {(product as any).nutrition?.value && (
                    <div className={`p-8 bg-[#295b45]/5 rounded-[32px] border border-[#295b45]/10 max-w-2xl ${isEn ? 'text-left' : 'text-right'}`}>
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
              ) : (
                renderReviews()
              )}
            </div>
          </div>

          {/* MOBILE TABS INTERFACE (matching mockup screenshot) */}
          <div className="flex md:hidden flex-col w-full text-start">
            {/* Tab Navigation Header */}
            {(() => {
              const mobileTabs = [
                { id: 'details', label: isEn ? 'Product Description' : 'وصف المنتج' },
                { id: 'reviews', label: isEn ? `Reviews (${reviews?.length || 0})` : `المراجعات (${new Intl.NumberFormat('en-US').format(reviews?.length || 0)})` },
                ...((product as any).nutrition?.value ? [{ id: 'nutrition', label: isEn ? 'Nutrition Facts' : 'حقائق غذائية' }] : [])
              ];
              return (
                <div className="w-full flex flex-col items-center mb-6">
                  <div
                    className="w-full flex items-center justify-between sm:justify-center gap-4 sm:gap-8 overflow-x-auto hide-scrollbars border-b border-[#BBCFCD]/40 pb-0 px-2"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {mobileTabs.map((t) => {
                      const isActive = activeTab === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setActiveTab(t.id)}
                          className={`relative pb-3 text-[14px] xs:text-[15px] sm:text-[17px] font-bold transition-all flex flex-col items-center whitespace-nowrap shrink-0 ${isActive ? 'text-[#234745]' : 'text-[#8B9895] hover:text-[#234745]'
                            }`}
                          style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                        >
                          <span>{t.label}</span>
                          {isActive && (
                            <div className="absolute bottom-[-1px] left-0 right-0 h-[3px] bg-[#234745] rounded-full animate-fade-in" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Tab Content */}
            <div className="w-full px-2 animate-fade-in">
              {activeTab === 'details' ? (
                <div className="w-full flex flex-col gap-4 text-center">
                  <div
                    className="text-[#171717] font-bold text-[15px] sm:text-[16px] leading-[28px] [&>p]:mb-4 last:[&>p]:mb-0"
                    style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                    dangerouslySetInnerHTML={{ __html: product.descriptionHtml || product.description }}
                  />

                  {(product as any).allergens?.value && (
                    <div className="p-4 bg-orange-50/60 rounded-[20px] border border-orange-100/60 mt-2 text-start">
                      <h5 className="text-[14px] font-black text-orange-800 mb-1.5 flex items-center gap-2">
                        <span>⚠️</span>
                        {isEn ? 'Allergens Warning' : 'معلومات الحساسية'}
                      </h5>
                      <p className="text-[13px] font-bold text-orange-700/80 leading-relaxed">
                        {(product as any).allergens.value}
                      </p>
                    </div>
                  )}
                </div>
              ) : activeTab === 'nutrition' ? (
                <div className="w-full">
                  {(product as any).nutrition?.value && (
                    <div className="p-5 bg-[#295b45]/5 rounded-[20px] border border-[#295b45]/10 text-start">
                      <h5 className="text-[15px] font-black text-[#295b45] mb-2 flex items-center gap-2">
                        <span>🥗</span>
                        {isEn ? 'Nutrition Facts' : 'حقائق غذائية'}
                      </h5>
                      <p className="text-[14px] font-bold text-[#234745]/80 leading-relaxed whitespace-pre-wrap">
                        {(product as any).nutrition.value}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                renderReviews()
              )}
            </div>
          </div>

        </div>
      </div>

      {/* 4. Related Products Section (High Fidelity) */}
      <div className="w-full bg-[#FFFFFF] pb-16 pt-16">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between mb-[32px] w-full">
            <h2
              className="font-bold text-[#171717] !m-0 text-[18px] leading-[24px] md:text-[50px] md:leading-[80px]"
              style={{ fontFamily: "'EnglishDigits', 'Bahij Janna', sans-serif" }}
            >
              {isEn ? 'Related Products' : 'منتجات ذات صلة'}
            </h2>
            <Link
              to={isEn ? "/en/collections/all" : "/collections/all"}
              className="bg-white !text-[12px] md:!text-[16px] border border-[#D2D2D2] px-[8px] py-[4px] md:px-[12px] md:py-[8px] rounded-[25px] font-bold text-[#234745] hover:bg-gray-50 transition-all flex items-center justify-center gap-[8px]"
              style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif", lineHeight: '20px' }}
            >
              <span>{isEn ? 'View All' : 'عرض الكل'}</span>
              <svg width="12" height="9" viewBox="0 0 12 9" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4.5 8.5L0.5 4.5L4.5 0.5M0.5 4.5H7.5M11.1667 4.5H9.5" stroke="black" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </Link>
          </div>

          <div className="flex flex-row overflow-x-auto overflow-y-hidden gap-[24px] pb-4 scrollbar-none snap-x snap-mandatory lg:grid lg:grid-cols-4 lg:overflow-x-visible lg:pb-0 lg:snap-none">
            {recommended?.products?.nodes?.slice(0, 4).map((recProduct: any) => (
              <div key={recProduct.id} className="w-[280px] shrink-0 snap-start snap-always lg:w-auto lg:shrink-1 lg:snap-none text-start">
                <ProductItem
                  product={recProduct}
                  loading="lazy"
                />
              </div>
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

  const rootData = useRouteLoaderData('root') as any;
  const isEn = rootData?.locale === 'en';

  const visibility = getVisibilityStatus(
    product.visibility_start?.value,
    product.visibility_end?.value,
  );
  const isVisibilityBlocked = !visibility.isActive ||
    product.tags?.some((t: string) => t.toLowerCase().includes('season') || t.includes('موسم')) ||
    Boolean(product.seasonal_message?.value) ||
    Boolean(product.next_season_date?.value);

  return (
    <div className="flex flex-col gap-4 relative w-full">
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

        {/* Top Seasonal Badge (Right Side) */}
        {isVisibilityBlocked && (
          <div className="absolute top-6 right-6 z-20">
            <span
              className="px-4 py-2 bg-[#906B51] text-white font-bold text-[14px] md:text-[15px] rounded-full shadow-md flex items-center justify-center"
              style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
            >
              {isEn ? 'Out for the Season' : 'نفد للموسم'}
            </span>
          </div>
        )}

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
            className={`w-full h-full object-cover border border-[#9FB7AE] transition-opacity duration-300 ${zoomHoverProps.show ? 'opacity-0' : 'opacity-100'}`}
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
        {/* <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 md:hidden">
          {images.map((img, i) => (
            <div key={img.id} className={`w-2 h-2 rounded-full transition-all duration-300 ${i === activeIndex ? 'bg-[#234745] w-4' : 'bg-gray-300'}`} />
          ))}
        </div> */}
      </div>

      {/* Thumbnails Slider (Exactly 4 items visible at a time, scrollable for more) */}
      {images.length > 1 && (
        <div className="relative w-full mt-2 px-1 group/slider">
          {/* Navigation arrow - Left */}
          {images.length > 4 && (
            <button
              type="button"
              onClick={() => {
                const container = document.getElementById('product-thumbnails-slider');
                if (container) {
                  container.scrollBy({ left: -240, behavior: 'smooth' });
                }
              }}
              className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/90 shadow-md border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-white hover:scale-105 active:scale-95 transition-all opacity-0 group-hover/slider:opacity-100"
              aria-label="Scroll left"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}

          {/* Navigation arrow - Right */}
          {images.length > 4 && (
            <button
              type="button"
              onClick={() => {
                const container = document.getElementById('product-thumbnails-slider');
                if (container) {
                  container.scrollBy({ left: 240, behavior: 'smooth' });
                }
              }}
              className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white/90 shadow-md border border-gray-200 flex items-center justify-center text-gray-700 hover:bg-white hover:scale-105 active:scale-95 transition-all opacity-0 group-hover/slider:opacity-100"
              aria-label="Scroll right"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          )}

          <div
            id="product-thumbnails-slider"
            className="flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-smooth hide-scrollbars py-1 px-0.5"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {images.map((img, i) => (
              <div
                key={img.id || i}
                onClick={() => setActiveIndex(i)}
                className={`shrink-0 w-[calc(25%-9px)] aspect-square bg-[#f9f9f9] rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-center overflow-hidden snap-start shadow-sm ${i === activeIndex
                  ? 'border-2 border-[#234745] ring-2 ring-[#234745]/20 scale-[1.02]'
                  : 'border-[#BBCFCD]/40 opacity-70 hover:opacity-100 hover:border-[#234745]/60'
                  }`}
              >
                <Image
                  data={img}
                  alt={img.altText || `Product thumbnail ${i + 1}`}
                  sizes="140px"
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
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
    <div className="flex flex-col gap-[16px] w-full max-w-[519px]">
      <VariantSelector
        handle={product.handle}
        options={product.options}
        variants={variants as any}
      >
        {({ option }) => {
          if (option.values.length === 1 && option.values[0].value === 'Default Title') {
            return null;
          }
          const optNameLower = option.name.toLowerCase();
          const isSize = optNameLower === 'size' || optNameLower === 'title';
          const isDenomination = optNameLower === 'denominations' || optNameLower === 'denomination' || optNameLower === 'value' || optNameLower === 'amount';

          let label = option.name;
          if (!isEn) {
            if (isDenomination) {
              label = 'الفئات';
            } else if (isSize) {
              label = isGiftCard ? 'قيمة القسيمة' : 'الحجم';
            }
          } else {
            if (isDenomination) {
              label = 'Denominations';
            } else if (isSize) {
              label = isGiftCard ? 'Voucher Value' : 'Size';
            }
          }

          return (
            <div className="flex flex-col gap-[8px]" key={option.name}>
              <h5
                className="font-bold text-[#255441] text-[18px] text-start w-full"
                style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
              >
                {label}
              </h5>
              <div className="flex flex-wrap gap-[12px] justify-start w-full">
                {option.values.map(({ value, isAvailable, isActive, to }) => {
                  const cleanNumStr = value.replace(/SAR|ر\.س/gi, '').trim();
                  const numVal = parseFloat(cleanNumStr);
                  const isMonetary = !isNaN(numVal) && (value.toLowerCase().includes('sar') || value.includes('ر.س') || /^\d+(\.\d+)?$/.test(cleanNumStr));

                  const pillTextColor = isActive ? 'text-white' : 'text-[#255441]';

                  let renderedValue: React.ReactNode = value;

                  if (!isEn) {
                    if (value.toLowerCase() === 'small') renderedValue = 'صغير';
                    else if (value.toLowerCase() === 'medium') renderedValue = 'وسط';
                    else if (value.toLowerCase() === 'large') renderedValue = 'كبير';
                    else if (isMonetary) {
                      const formattedNum = numVal % 1 === 0 ? numVal.toString() : numVal.toFixed(2);
                      renderedValue = (
                        <span className={`inline-flex items-center justify-center gap-1.5 font-bold ${pillTextColor}`}>
                          <span>{formattedNum}</span>
                          <SaudiRiyalSymbol className={`h-4 w-auto shrink-0 mb-0.5 ${isActive ? 'text-white fill-white' : 'text-[#255441]'}`} />
                        </span>
                      );
                    } else {
                      renderedValue = value.replace(/SAR/gi, 'ر.س');
                    }
                  } else {
                    if (isMonetary) {
                      const formattedNum = numVal % 1 === 0 ? numVal.toString() : numVal.toFixed(2);
                      renderedValue = (
                        <span className={`inline-flex items-center justify-center gap-1.5 font-bold ${pillTextColor}`}>
                          <span>SAR</span>
                          <span>{formattedNum}</span>
                        </span>
                      );
                    }
                  }

                  const variantUrl = isEn ? `/en${to}` : to;

                  return (
                    <Link
                      key={option.name + value}
                      prefetch="intent"
                      preventScrollReset
                      replace
                      to={variantUrl}
                      className={`h-[44px] px-[20px] rounded-[22px] text-[14px] font-bold border transition-all flex items-center justify-center min-w-[90px] shadow-sm ${isActive
                        ? 'bg-[#234745] border-[#234745] !text-white shadow-md'
                        : 'bg-white border-[#BBCFCD]/60 text-[#255441] hover:border-[#234745] hover:text-[#234745]'
                        } ${!isAvailable ? 'opacity-40 cursor-not-allowed' : ''}`}
                      style={{ fontFamily: "'EnglishDigits', 'GE Dinar One', sans-serif" }}
                    >
                      {renderedValue}
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
                sku
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
              sku
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
    next_season_date: metafield(namespace: "custom", key: "next_season_date") {
      value
    }
    seasonal_message: metafield(namespace: "custom", key: "seasonal_message") {
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
    bogo_free_item: metafield(namespace: "custom", key: "bogo_free_item") {
      value
      reference {
        ... on ProductVariant {
          id
        }
      }
    }
    vegan: metafield(namespace: "custom", key: "vegan") {
      value
    }
    lactose_free: metafield(namespace: "custom", key: "lactose_free") {
      value
    }
    gluten_free: metafield(namespace: "custom", key: "gluten_free") {
      value
    }
    restock_date: metafield(namespace: "custom", key: "restock_date") {
      value
    }
    expected_restock_date: metafield(namespace: "custom", key: "expected_restock_date") {
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
    related_products: metafield(namespace: "custom", key: "related_products") {
      references(first: 4) {
        nodes {
          ... on Product {
            ...ProductDetailRecommendedProduct
          }
          ... on ProductVariant {
            id
            title
            image {
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
            compareAtPrice {
              amount
              currencyCode
            }
            product {
              ...ProductDetailRecommendedProduct
            }
          }
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

const RECOMMENDED_PRODUCT_FRAGMENT = `#graphql
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
    featuredImage {
      id
      url
      altText
      width
      height
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
`;

const PRODUCT_QUERY = `#graphql
  ${RECOMMENDED_PRODUCT_FRAGMENT}
  query Product(
    $country: CountryCode
    $language: LanguageCode
    $handle: String!
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
  ${RECOMMENDED_PRODUCT_FRAGMENT}
  query ProductRecommendations(
    $country: CountryCode
    $language: LanguageCode
    $productId: ID!
  ) @inContext(country: $country, language: $language) {
    productRecommendations(productId: $productId, intent: RELATED) {
      ...ProductDetailRecommendedProduct
    }
  }
` as const;

const COLLECTION_PRODUCTS_QUERY = `#graphql
  ${RECOMMENDED_PRODUCT_FRAGMENT}
  query CollectionProducts(
    $country: CountryCode
    $language: LanguageCode
    $collectionId: ID!
  ) @inContext(country: $country, language: $language) {
    collection(id: $collectionId) {
      products(first: 5) {
        nodes {
          ...ProductDetailRecommendedProduct
        }
      }
    }
  }
` as const;

const NEWEST_PRODUCTS_QUERY = `#graphql
  ${RECOMMENDED_PRODUCT_FRAGMENT}
  query NewestProducts(
    $country: CountryCode
    $language: LanguageCode
  ) @inContext(country: $country, language: $language) {
    products(first: 4, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        ...ProductDetailRecommendedProduct
      }
    }
  }
` as const;

