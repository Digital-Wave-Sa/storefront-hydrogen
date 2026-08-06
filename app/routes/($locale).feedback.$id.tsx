import {useState, useRef, useEffect} from 'react';
import {useLoaderData, useFetcher, useLocation, Link, Form} from 'react-router';
// @ts-ignore - route types generated during build
import type {Route} from './+types/feedback.$id';
import {PageLayout} from '~/components/PageLayout';
import {useI18n} from '~/lib/i18n';

export async function loader({params, context, request}: Route.LoaderArgs) {
  const {id} = params;
  const locale = params.locale || 'ar';
  const isEn = locale === 'en';

  // Try to fetch real order from Admin API
  try {
    const {getAdminToken, getAdminDomain} = await import('~/lib/shopify-admin.server');
    const adminToken = await getAdminToken(context.env);
    const adminDomain = getAdminDomain(context.env);

    // Search by order number (id param may be "1072" or "#1072")
    const cleanTargetNum = String(id).replace(/^#/, '').trim();
    const res = await fetch(
      `https://${adminDomain}/admin/api/2024-01/orders.json?name=%23${cleanTargetNum}&status=any`,
      {
        headers: {
          'X-Shopify-Access-Token': adminToken,
          'Content-Type': 'application/json',
        },
      },
    );

    if (res.ok) {
      const {orders} = (await res.json()) as any;

      // Enforce EXACT order number match (so e.g. 1075 does NOT loosely match 10750)
      const o = (orders || []).find((ord: any) => {
        const ordNumStr = String(ord.order_number || '').trim();
        const ordNameClean = String(ord.name || '').replace(/^#/, '').trim();
        return ordNumStr === cleanTargetNum || ordNameClean === cleanTargetNum;
      });

      if (o) {
        // --- CHECK IF ALREADY REVIEWED (VIA SHOPIFY ORDER TAGS & METAOBJECTS) ---
        const orderTags = (o.tags || '').split(',').map((t: string) => t.trim().toLowerCase());
        let alreadyReviewed = orderTags.includes('reviewed');
        let existingRating: number | null = null;

        if (!alreadyReviewed) {
          try {
            const reviewsRes = (await context.storefront.query(`#graphql
              query CheckOrderReviews {
                orderReviews: metaobjects(type: "order_review", first: 250) {
                  nodes {
                    id
                    fields { key value }
                  }
                }
                storefrontReviews: metaobjects(type: "storefront_review", first: 250) {
                  nodes {
                    id
                    fields { key value }
                  }
                }
              }
            `, { cache: context.storefront.CacheNone() })) as any;

            const orderNodes = reviewsRes?.orderReviews?.nodes || [];
            const sfNodes = reviewsRes?.storefrontReviews?.nodes || [];
            const allNodes = [...orderNodes, ...sfNodes];

            const matchedNode = allNodes.find((node: any) => {
              const orderIdVal = node.fields?.find((f: any) => f.key === 'order_id')?.value;
              if (!orderIdVal) return false;
              const cleanVal = String(orderIdVal).replace(/^#/, '').trim();
              return cleanVal === cleanTargetNum;
            });

            if (matchedNode) {
              alreadyReviewed = true;
              const rVal = matchedNode.fields?.find((f: any) => f.key === 'branch_rating' || f.key === 'rating')?.value;
              if (rVal) existingRating = parseInt(rVal, 10);
            }
          } catch (revErr) {
            console.warn('[Feedback Loader] Could not check existing reviews:', revErr);
          }
        }

        // --- CUSTOMER AUTHORIZATION & LOGGED-IN CHECK ---
        const orderEmail = (o.email || o.customer?.email || o.billing_address?.email || '').toLowerCase().trim();
        const orderPhoneRaw = (o.phone || o.customer?.phone || o.billing_address?.phone || o.shipping_address?.phone || '').replace(/\D/g, '');

        const sessionEmail = ((await context.session.get('loginCustomerEmail')) || '').toLowerCase().trim();
        const sessionPhone = ((await context.session.get('loginOtpPhone')) || '').replace(/\D/g, '');
        const customerAccessToken = await context.session.get('customerAccessToken');

        const isLoggedIn = Boolean(sessionEmail || sessionPhone || customerAccessToken);
        let isAuthorized = false;
        let accountMismatch = false;

        if (isLoggedIn) {
          const emailMatch = Boolean(sessionEmail && orderEmail && sessionEmail === orderEmail);
          const phoneMatch = Boolean(
            sessionPhone &&
            orderPhoneRaw &&
            (sessionPhone.endsWith(orderPhoneRaw.slice(-6)) || orderPhoneRaw.endsWith(sessionPhone.slice(-6)))
          );

          if (emailMatch || phoneMatch) {
            isAuthorized = true;
          } else if (orderEmail || orderPhoneRaw) {
            accountMismatch = true;
          } else {
            isAuthorized = true;
          }
        }

        const maskedEmail = orderEmail ? `${orderEmail.slice(0, 3)}***@${orderEmail.split('@')[1] || ''}` : '';
        const maskedPhone = orderPhoneRaw ? `***${orderPhoneRaw.slice(-4)}` : '';

        // Build items from real line items
        const items = (o.line_items || []).map((li: any) => ({
          id: String(li.id),
          variantId: li.variant_id ? String(li.variant_id) : null,
          handle: li.handle || li.product_id ? `product-${li.product_id}` : 'general-feedback',
          title: li.title || (isEn ? 'Product' : 'منتج'),
          image:
            li.image?.src ||
            'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png',
          quantity: li.quantity || 1,
        }));

        // Enrich items with Storefront API translated titles + real images
        try {
          if (items.some((i: any) => i.variantId)) {
            const variantIds = items
              .filter((i: any) => i.variantId)
              .map((i: any) => `gid://shopify/ProductVariant/${i.variantId}`);

            const lang = context.storefront.i18n.language;
            const country = context.storefront.i18n.country;
            const variantQuery = `
              query GetVariantInfo($ids: [ID!]!) @inContext(language: ${lang}, country: ${country}) {
                nodes(ids: $ids) {
                  ... on ProductVariant {
                    id
                    image { url }
                    product {
                      title
                      handle
                    }
                  }
                }
              }
            `;
            const variantResult = (await context.storefront.query(variantQuery as any, {
              variables: {ids: variantIds},
              cache: context.storefront.CacheShort(),
            })) as any;

            const variantMap: Record<string, any> = {};
            for (const node of variantResult?.nodes || []) {
              if (node?.id) variantMap[node.id] = node;
            }

            for (const item of items) {
              if (item.variantId) {
                const gid = `gid://shopify/ProductVariant/${item.variantId}`;
                const v = variantMap[gid];
                if (v) {
                  if (v.product?.title) item.title = v.product.title;
                  if (v.product?.handle) item.handle = v.product.handle;
                  if (v.image?.url) item.image = v.image.url;
                }
              }
            }
          }
        } catch (e) {
          console.warn('[Feedback Loader] Could not enrich variant data:', e);
        }

        // Fetch shop locations to map the order's exact purchase location ID
        let allLocations: any[] = [];
        try {
          const locRes = (await context.storefront.query(`#graphql
            query GetFeedbackLocations {
              locations(first: 250) {
                nodes {
                  id
                  name
                  name_in_arabic: metafield(namespace: "custom", key: "name_in_arabic") { value }
                }
              }
            }
          `, { cache: context.storefront.CacheLong() })) as any;
          allLocations = locRes?.locations?.nodes || [];
        } catch (locErr) {
          console.warn('[Feedback Loader] Could not fetch shop locations:', locErr);
        }

        // Detect branch & location ID from order's location_id or note_attributes
        const shippingTitle = o.shipping_lines?.[0]?.title || '';
        const noteAttrs: Record<string, string> = {};
        for (const a of o.note_attributes || []) {
          noteAttrs[(a.name || a.key || '').toLowerCase()] = String(a.value || '');
        }

        const rawLocId =
          noteAttrs['location_id'] ||
          noteAttrs['locationid'] ||
          noteAttrs['branch_id'] ||
          noteAttrs['branch id'] ||
          noteAttrs['custom.branch_id'] ||
          o.location_id?.toString() ||
          '';

        let matchedLoc: any = null;
        if (rawLocId) {
          const cleanLocId = String(rawLocId).replace(/\D/g, '');
          matchedLoc = allLocations.find((l: any) => {
            const locNum = String(l.id).replace(/\D/g, '');
            return locNum === cleanLocId || l.id === rawLocId;
          });
        }

        const branchName =
          (isEn
            ? matchedLoc?.name || noteAttrs['branch'] || noteAttrs['branch_name']
            : matchedLoc?.name_in_arabic?.value || noteAttrs['فرع'] || noteAttrs['branch'] || noteAttrs['branch_name']) ||
          shippingTitle ||
          (isEn ? 'Saadeddin Branch' : 'فرع سعد الدين');

        const locationId = matchedLoc?.id || rawLocId || '';

        const customerName =
          o.billing_address?.name ||
          o.shipping_address?.name ||
          o.customer?.first_name ||
          (isEn ? 'Valued Customer' : 'عزيزنا العميل');

        return {
          notFound: false,
          alreadyReviewed,
          existingRating,
          isAuthorized,
          accountMismatch,
          maskedEmail,
          maskedPhone,
          orderId: id,
          locale,
          order: {
            name: `#${o.order_number}`,
            customerName,
            items,
            branchName,
            locationId,
          },
        };
      }
    }
  } catch (e) {
    console.error('[Feedback Loader] Failed to fetch order:', e);
  }

  // If order not found in Shopify
  return {
    notFound: true,
    alreadyReviewed: false,
    existingRating: null,
    isAuthorized: false,
    accountMismatch: false,
    maskedEmail: '',
    maskedPhone: '',
    orderId: id,
    locale,
    order: null,
  };
}


export default function FeedbackPage() {
  const {notFound, alreadyReviewed, existingRating, isAuthorized, accountMismatch, maskedEmail, maskedPhone, orderId, locale, order} = useLoaderData<typeof loader>();
  const i18n = useI18n(locale);
  const isEn = locale === 'en';
  const fetcher = useFetcher();
  const [submitted, setSubmitted] = useState(false);

  // Form State
  const [productRatings, setProductRatings] = useState<Record<string, number>>(
    {},
  );
  const [branchRating, setBranchRating] = useState(0);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (fetcher.data?.success) {
      setSubmitted(true);
      window.scrollTo({top: 0, behavior: 'smooth'});
    }
  }, [fetcher.data]);

  if (notFound || !order || !order.items || order.items.length === 0) {
    return (
      <PageLayout {...({} as any)}>
        <div className="min-h-[70vh] flex items-center justify-center px-4 py-20 bg-[#fdfaf6]">
          <div className="max-w-md w-full bg-white rounded-[40px] p-10 text-center shadow-2xl shadow-[#234745]/10 border border-gray-100">
            <div className="w-24 h-24 bg-amber-50 border border-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">📦</span>
            </div>
            <h1 className="text-2xl font-black text-[#234745] mb-3">
              {isEn ? 'Order Not Found' : 'الطلب غير موجود'}
            </h1>
            <p className="text-gray-500 font-bold mb-8 leading-relaxed text-sm">
              {isEn
                ? `We could not find order #${orderId}. Please check your order number or link.`
                : `عذراً، لم نتمكن من العثور على الطلب رقم #${orderId}. يرجى التحقق من رقم الطلب أو الرابط.`}
            </p>
            <Link
              to={isEn ? '/en' : '/'}
              className="inline-block bg-[#234745] text-white font-black px-8 py-3.5 rounded-2xl hover:bg-[#d4a06a] transition-all shadow-lg text-sm"
            >
              {i18n.common.backToHome}
            </Link>
          </div>
        </div>
      </PageLayout>
    );
  }

  // 2a. Authentication & Authorization Check (NOT LOGGED IN)
  if (!isAuthorized && !accountMismatch) {
    const loginUrl = isEn
      ? `/en/account/login?redirectTo=/en/feedback/${orderId}`
      : `/account/login?redirectTo=/feedback/${orderId}`;

    return (
      <PageLayout {...({} as any)}>
        <div className="min-h-[70vh] flex items-center justify-center px-4 py-20 bg-[#fdfaf6]">
          <div className="max-w-md w-full bg-white rounded-[40px] p-10 text-center shadow-2xl shadow-[#234745]/10 border border-gray-100 flex flex-col items-center">
            <div className="w-20 h-20 bg-[#234745]/10 border border-[#234745]/20 rounded-full flex items-center justify-center mx-auto mb-6 text-[#234745]">
              <span className="text-4xl">🔑</span>
            </div>
            <h1 className="text-2xl font-black text-[#234745] mb-3">
              {isEn ? 'Please Log In to Review' : 'يرجى تسجيل الدخول للتقييم'}
            </h1>
            <p className="text-gray-500 font-bold mb-8 leading-relaxed text-sm max-w-sm">
              {isEn
                ? `Please log in to your account to submit your review for order ${order.name}.`
                : `يرجى تسجيل الدخول إلى حسابك لمشاركة تقييمك وملاحظاتك حول الطلب ${order.name}.`}
            </p>

            <div className="w-full space-y-3">
              <Link
                to={loginUrl}
                className="inline-flex items-center justify-center w-full bg-[#234745] text-white font-black px-8 py-4 rounded-2xl hover:bg-[#1a3533] transition-all shadow-xl text-base !text-white"
                style={{ color: '#ffffff' }}
              >
                {isEn ? 'Log In Now' : 'تسجيل الدخول الآن'}
              </Link>
              <Link
                to={isEn ? '/en' : '/'}
                className="inline-block text-xs font-bold text-gray-400 hover:text-[#234745] transition-colors py-2"
              >
                {i18n.common.backToHome || (isEn ? 'Back to Home' : 'العودة للرئيسية')}
              </Link>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  // 2b. Account Mismatch State (Logged in, but account does NOT match the order owner)
  if (accountMismatch) {
    const loginUrl = isEn
      ? `/en/account/login?redirectTo=/en/feedback/${orderId}`
      : `/account/login?redirectTo=/feedback/${orderId}`;

    return (
      <PageLayout {...({} as any)}>
        <div className="min-h-[70vh] flex items-center justify-center px-4 py-20 bg-[#fdfaf6]">
          <div className="max-w-md w-full bg-white rounded-[40px] p-10 text-center shadow-2xl shadow-[#234745]/10 border border-gray-100 flex flex-col items-center">
            <div className="w-20 h-20 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-600">
              <span className="text-4xl">🚫</span>
            </div>
            <h1 className="text-2xl font-black text-[#234745] mb-3">
              {isEn ? 'Access Denied' : 'الطلب ينتمي لحساب آخر'}
            </h1>
            <p className="text-gray-500 font-bold mb-8 leading-relaxed text-sm max-w-sm">
              {isEn
                ? `Order ${order.name} is associated with a different customer account. Please log into the matching account to review.`
                : `عذراً، الطلب ${order.name} مرتبط بحساب عميل آخر. يرجى تسجيل الدخول بالحساب المناسب لتقييم الطلب.`}
            </p>

            <div className="w-full space-y-3">
              <Link
                to={loginUrl}
                className="inline-flex items-center justify-center w-full bg-[#234745] text-white font-black px-8 py-4 rounded-2xl hover:bg-[#1a3533] transition-all shadow-xl text-base !text-white"
                style={{ color: '#ffffff' }}
              >
                {isEn ? 'Switch Account' : 'تبديل الحساب'}
              </Link>
              <Link
                to={isEn ? '/en' : '/'}
                className="inline-block text-xs font-bold text-gray-400 hover:text-[#234745] transition-colors py-2"
              >
                {i18n.common.backToHome || (isEn ? 'Back to Home' : 'العودة للرئيسية')}
              </Link>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  // Handle Just Submitted Success State (takes precedence during active submission session)
  if (submitted) {
    return (
      <PageLayout {...({} as any)}>
        <div className="min-h-[70vh] flex items-center justify-center px-4 py-20 bg-[#fdfaf6]">
          <div className="max-w-md w-full bg-white rounded-[40px] p-10 text-center shadow-2xl shadow-[#234745]/10 border border-gray-100 flex flex-col items-center">
            <div className="w-24 h-24 bg-green-50 border border-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-[#234745]">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
            <h1 className="text-3xl font-black text-[#234745] mb-4">
              {i18n.common.feedbackSuccess || (isEn ? 'Thank You!' : 'شكراً لك!')}
            </h1>
            <p className="text-gray-500 font-bold mb-8 leading-relaxed text-sm max-w-sm">
              {i18n.common.feedbackSuccessMessage || (isEn ? 'Your feedback has been received successfully. We appreciate your time!' : 'تم استلام ملاحظاتك بنجاح. نقدر وقتك!')}
            </p>
            <div className="mt-4 w-full">
              <Link
                to={isEn ? '/en' : '/'}
                className="inline-flex items-center justify-center w-full bg-[#234745] text-white hover:text-white font-black px-8 py-4 rounded-2xl hover:bg-[#1a3533] transition-all shadow-xl text-base !text-white"
                style={{ color: '#ffffff' }}
              >
                {i18n.common.backToHome || (isEn ? 'Back to Home' : 'العودة للرئيسية')}
              </Link>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  // Handle Order Already Reviewed State (One-Time Limit for future visits/refreshes)
  if (alreadyReviewed) {
    return (
      <PageLayout {...({} as any)}>
        <div className="min-h-[70vh] flex items-center justify-center px-4 py-20 bg-[#fdfaf6]">
          <div className="max-w-md w-full bg-white rounded-[40px] p-10 text-center shadow-2xl shadow-[#234745]/10 border border-gray-100 flex flex-col items-center">
            <div className="w-24 h-24 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">⭐️</span>
            </div>
            <h1 className="text-2xl font-black text-[#234745] mb-3">
              {isEn ? 'Already Reviewed' : 'تم تقييم هذا الطلب مسبقاً'}
            </h1>
            <p className="text-gray-500 font-bold mb-8 leading-relaxed text-sm max-w-sm">
              {isEn
                ? `Thank you! You have already submitted a review for order ${order.name}. We appreciate your feedback!`
                : `شكراً لك! لقد قمت بتقديم تقييمك للطلب ${order.name} مسبقاً. نحن نثمن مشاركتك!`}
            </p>
            {existingRating && (
              <div className="mb-8 px-6 py-3 bg-[#FCFAF7] border border-[#EADFC9]/60 rounded-2xl flex items-center gap-2">
                <span className="text-xs font-black text-gray-500">
                  {isEn ? 'Your Rating:' : 'تقييمك المكتوب:'}
                </span>
                <div className="flex gap-1 text-amber-400">
                  {Array.from({length: existingRating}).map((_, i) => (
                    <span key={i}>★</span>
                  ))}
                </div>
              </div>
            )}
            <div className="w-full">
              <Link
                to={isEn ? '/en' : '/'}
                className="inline-flex items-center justify-center w-full bg-[#234745] text-white font-black px-8 py-4 rounded-2xl hover:bg-[#1a3533] transition-all shadow-xl text-base !text-white"
                style={{ color: '#ffffff' }}
              >
                {i18n.common.backToHome || (isEn ? 'Back to Home' : 'العودة للرئيسية')}
              </Link>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setImages((prev) => [...prev, ...files]);
      const newPreviews = files.map((file) => URL.createObjectURL(file));
      setPreviews((prev) => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };



  return (
    <PageLayout {...({} as any)}>
      <div
        className="min-h-screen bg-[#FAF6F0] py-16 px-4 relative overflow-hidden"
        dir={isEn ? 'ltr' : 'rtl'}
      >
        {/* Fine gold mesh patterns / background accents */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#d4a06a]/10 rounded-full filter blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#234745]/5 rounded-full filter blur-[100px] pointer-events-none"></div>

        <div className="max-w-xl mx-auto relative z-10">
          {/* Main Card */}
          <div className="bg-white rounded-3xl border border-[#EADFC9] shadow-[0_20px_50px_rgba(35,71,69,0.06)] overflow-hidden">
            {/* Header Banner */}
            <div className="bg-[#234745] px-6 py-12 text-center relative">
              <div className="absolute inset-0 bg-[radial-gradient(#d4a06a_1px,transparent_1.5px)] [background-size:16px_16px] opacity-10"></div>
              <span className="inline-block bg-[#d4a06a]/20 text-[#d4a06a] border border-[#d4a06a]/30 text-[10px] font-black tracking-widest px-3.5 py-1 rounded-full mb-3 uppercase font-mono">
                {isEn ? `Order ${order.name}` : `طلب ${order.name}`}
              </span>
              <h1 className="text-3xl font-black text-white tracking-tight mb-2">
                {i18n.common.feedbackTitle}
              </h1>
              <p className="text-white/70 text-xs font-medium max-w-sm mx-auto leading-relaxed">
                {i18n.common.feedbackSubtitle}
              </p>
            </div>

            <fetcher.Form method="POST" className="p-6 md:p-10 space-y-8">
              <input type="hidden" name="orderId" value={orderId} />
              <input type="hidden" name="branchName" value={order.branchName} />
              <input type="hidden" name="locationId" value={order.locationId} />
              <input type="hidden" name="customerName" value={(order as any).customerName || ''} />

              {/* Product Rating section */}
              <div className="space-y-4">
                <label className="block text-[11px] font-black uppercase tracking-wider text-gray-400">
                  {i18n.common.rateProduct}
                </label>

                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-[#FCFAF7] border border-[#EADFC9]/40 hover:border-[#d4a06a]/40 transition-all duration-300"
                  >
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-[#EADFC9]/30">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-extrabold text-[#234745] text-sm truncate mb-1.5">
                        {item.title}
                      </h3>
                      <InteractiveStarRating
                        value={productRatings[item.id] || 0}
                        onChange={(v) =>
                          setProductRatings((prev) => ({...prev, [item.id]: v}))
                        }
                        isEn={isEn}
                      />
                      <input
                        type="hidden"
                        name={`product_${item.id}_rating`}
                        value={productRatings[item.id] || 0}
                      />
                      <input
                        type="hidden"
                        name={`product_${item.id}_handle`}
                        value={(item as any).handle || 'general-feedback'}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Branch Rating Section */}
              <div className="pt-6 border-t border-[#EADFC9]/30 space-y-3">
                <div className="flex justify-between items-baseline">
                  <label className="block text-[11px] font-black uppercase tracking-wider text-gray-400">
                    {i18n.common.rateBranch}
                  </label>
                  <span className="text-xs font-extrabold text-[#d4a06a] bg-[#d4a06a]/10 px-2 py-0.5 rounded">
                    {order.branchName}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-[#FCFAF7] border border-[#EADFC9]/40 flex justify-center">
                  <InteractiveStarRating
                    value={branchRating}
                    onChange={setBranchRating}
                    isEn={isEn}
                    size="lg"
                  />
                  <input
                    type="hidden"
                    name="branch_rating"
                    value={branchRating}
                  />
                </div>
              </div>

              {/* Comments Box */}
              <div className="pt-6 border-t border-[#EADFC9]/30 space-y-3">
                <label className="block text-[11px] font-black uppercase tracking-wider text-gray-400">
                  {i18n.common.yourComments}
                </label>
                <textarea
                  name="comment"
                  rows={4}
                  placeholder={i18n.common.commentsPlaceholder}
                  className="w-full bg-[#FCFAF7] border border-[#EADFC9] rounded-2xl p-4 text-sm font-bold text-[#234745] focus:bg-white focus:border-[#234745] focus:ring-1 focus:ring-[#234745] outline-none transition-all duration-200 resize-none placeholder-gray-400"
                />
              </div>

              {/* Submit Action */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={fetcher.state !== 'idle'}
                  className="w-full bg-[#234745] hover:bg-[#1a3533] text-white font-black py-4 px-6 rounded-2xl text-sm tracking-wider uppercase transition-all duration-200 hover:shadow-lg hover:shadow-[#234745]/10 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {fetcher.state !== 'idle' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>{isEn ? 'SENDING...' : 'جاري الإرسال...'}</span>
                    </>
                  ) : (
                    <span>{isEn ? 'SUBMIT REVIEW' : 'إرسال التقييم'}</span>
                  )}
                </button>
              </div>
            </fetcher.Form>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

function InteractiveStarRating({
  value,
  onChange,
  isEn,
  size = 'md',
}: {
  value: number;
  onChange: (v: number) => void;
  isEn: boolean;
  size?: 'md' | 'lg';
}) {
  const [hover, setHover] = useState(0);
  const activeValue = hover || value;

  const iconSize = size === 'lg' ? 36 : 24;

  return (
    <div className="flex items-center gap-1.5" dir={isEn ? 'ltr' : 'rtl'}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="transition-transform active:scale-75 hover:scale-110 focus:outline-none"
        >
          <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 24 24"
            fill={activeValue >= star ? '#d4a06a' : '#EADFC9'}
            className="transition-colors duration-150"
          >
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
        </button>
      ))}
      {value > 0 && (
        <span
          className={`mx-2 font-bold text-[#d4a06a] ${size === 'lg' ? 'text-lg' : 'text-xs'}`}
        >
          {value}/5
        </span>
      )}
    </div>
  );
}

export async function action({request, context, params}: Route.ActionArgs) {
  const formData = await request.formData();
  const orderId = formData.get('orderId');
  const branchName = formData.get('branchName');
  const locationId = formData.get('locationId') || '';
  const branchRating = formData.get('branch_rating');
  const comment = formData.get('comment');
  const language = params.locale || 'ar';
  const customerName = formData.get('customerName') || 'Verified Customer';

  // Find all rated products — keys are product_{itemId}_rating and product_{itemId}_handle
  const productRatingsList: Array<{handle: string; rating: number}> = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('product_') && key.endsWith('_rating')) {
      const productId = key.replace('product_', '').replace('_rating', '');
      const handle = String(formData.get(`product_${productId}_handle`) || 'general-feedback');
      const rating = parseInt(String(value), 10) || 0;
      if (handle && handle !== 'general-feedback') {
        productRatingsList.push({handle, rating});
      }
    }
  }

  const apiSubmitData = new FormData();
  apiSubmitData.append('customerName', String(customerName));
  apiSubmitData.append('orderId', String(orderId));
  apiSubmitData.append('branchRating', String(branchRating || '5'));
  apiSubmitData.append('branchName', String(branchName || ''));
  apiSubmitData.append('locationId', String(locationId));
  apiSubmitData.append('comment', String(comment || ''));
  apiSubmitData.append('language', language);
  apiSubmitData.append('productRatings', JSON.stringify(productRatingsList));

  const {action: submitAction} = await import('./api.submit-review');

  const mockRequest = new Request(
    'http://localhost:3000/api/submit-review',
    {method: 'POST', body: apiSubmitData},
  );

  try {
    return await submitAction({request: mockRequest, context, params: {}} as any);
  } catch (err) {
    console.error('Failed to submit order review:', err);
    return {error: 'Failed to submit review'};
  }
}


