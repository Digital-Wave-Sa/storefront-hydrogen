import {
  data as json,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from 'react-router';
import {
  useLoaderData,
  useFetcher,
  useOutletContext,
  useRouteLoaderData,
  Link,
} from 'react-router';
import {findBranchLocation} from '~/lib/stock';

/**
 * /account/notifications -- the waiting list, from the shopper's side.
 *
 * Joining the list has always been one button on a product card. Leaving it had
 * nothing at all: the middleware could cancel a subscription from the first day
 * (`DELETE /notify-me/:id`, `POST /notify-me/unsubscribe`) and nothing on the
 * storefront ever called it, so a shopper who changed their mind could only
 * wait for an email about a cake they no longer wanted.
 *
 * The list is keyed on the phone number, which is why this page is inside the
 * account rather than beside the modal: the middleware deduplicates and cancels
 * on (phone, productCode, locationId), so the only shopper it can show a list
 * to is one it can identify. Somebody who subscribed with an email alone is
 * cancelled by the id from the subscribe response instead -- the modal keeps
 * that id and offers its own "cancel" straight after subscribing.
 */

/**
 * Titles come from Shopify, in the language being browsed.
 *
 * The middleware stores the product title as a plain string, captured from
 * whatever page the shopper was on when they pressed "Notify Me" — so an alert
 * set on the Arabic site carries an Arabic title for ever, and this page,
 * which rendered that string verbatim, showed Arabic product names under
 * English headings on /en. It was never a translation gap; it was a snapshot
 * of the wrong moment.
 *
 * `context.storefront` is built with the request's locale (see
 * `app/lib/context.ts`), so it adds `@inContext(language: EN|AR)` on its own.
 * Asking Shopify for the product by handle therefore returns the title in the
 * language on screen, in both directions, and picks up any later edit or
 * Translate & Adapt change instead of the text frozen at subscribe time.
 *
 * The stored title stays as the fallback: handles can be null, a product can
 * be deleted, and a row with no name at all is worse than one in the wrong
 * language.
 */
const PRODUCT_BY_HANDLE_QUERY = `#graphql
  query NotifyProductByHandle($handle: String!) {
    product(handle: $handle) {
      handle
      title
      featuredImage { url altText }
    }
  }
` as const;

/**
 * `productCode` -> product handle, for rows the middleware stored without one.
 *
 * Two shapes come through: a SKU ("341055") and, for products that have no
 * SKU, a bare variant id ("51583267930345") — `resolveProductCode` falls back
 * to the id. Both are digits, so the SKU search runs first and the variant-id
 * lookup only mops up what it missed.
 *
 * Every failure here is silent by design: an unresolved code simply leaves the
 * row showing its stored title, which is the behaviour that was there before.
 */
async function resolveHandlesByCode(
  env: any,
  codes: string[],
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!codes.length) return out;

  let domain = '';
  let token = '';
  try {
    const {getAdminDomain, getAdminToken} = await import(
      '~/lib/shopify-admin.server'
    );
    domain = getAdminDomain(env);
    token = await getAdminToken(env);
  } catch {
    return out;
  }
  if (!domain || !token) return out;

  const call = async (query: string, variables: any) => {
    try {
      const res = await fetch(
        `https://${domain}/admin/api/2024-01/graphql.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': token,
          },
          body: JSON.stringify({query, variables}),
          signal: AbortSignal.timeout(5000),
        },
      );
      if (!res.ok) return null;
      return (await res.json()) as any;
    } catch {
      return null;
    }
  };

  // Quote each code: a SKU may contain characters the search syntax treats
  // specially, and an unquoted term would be parsed rather than matched.
  const skuQuery = codes.map((c) => `sku:"${c.replace(/"/g, '')}"`).join(' OR ');
  const bySku = await call(
    `query NotifyHandlesBySku($q: String!) {
      productVariants(first: 100, query: $q) {
        nodes { sku product { handle } }
      }
    }`,
    {q: skuQuery},
  );
  for (const node of bySku?.data?.productVariants?.nodes || []) {
    const sku = String(node?.sku || '').trim();
    const handle = node?.product?.handle;
    if (sku && handle && !out.has(sku)) out.set(sku, handle);
  }

  // Anything left is likely a variant id rather than a SKU.
  const leftovers = codes.filter((c) => !out.has(c) && /^\d{10,}$/.test(c));
  if (leftovers.length) {
    const byId = await call(
      `query NotifyHandlesByVariantId($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on ProductVariant { id product { handle } }
        }
      }`,
      {ids: leftovers.map((id) => `gid://shopify/ProductVariant/${id}`)},
    );
    for (const node of byId?.data?.nodes || []) {
      const id = String(node?.id || '').split('/').pop();
      const handle = node?.product?.handle;
      if (id && handle && !out.has(id)) out.set(id, handle);
    }
  }

  return out;
}

export async function loader({context}: LoaderFunctionArgs) {
  const {resolveSelf} = await import('~/lib/session-identity.server');
  const {listNotifySubscriptions} = await import('~/lib/notify-me.server');

  // The parent /account route already redirects a signed-out visitor to login;
  // this only decides which shopper to ask about, never whether to answer.
  const self = await resolveSelf(context);

  const {ok, subscriptions} = await listNotifySubscriptions({
    env: context.env,
    phone: self?.phone,
  });

  const rows: any[] = subscriptions || [];

  /**
   * Every row needs a handle, and older ones do not have one.
   *
   * `productHandle` is only sent to the middleware when the caller happens to
   * have it (see api.stock-notification), so alerts saved before that — or
   * from a card that did not pass it — are stored with a title and nothing
   * else to look the product up by. Those rows kept their frozen title and had
   * no image at all, which is exactly the pair still showing Arabic on /en.
   *
   * `productCode` is always stored, so it is the reliable key. It is the SKU,
   * or the bare variant id for the handful of products that have no SKU, and
   * both are digits here — so rather than guess which, ask about the SKU and
   * fall back to the variant id only when that misses.
   *
   * Admin answers this hop because the Storefront `products` filter set does
   * not reliably cover SKU. That costs nothing in correctness: a handle is
   * language-independent, and the LANGUAGE still comes from the locale-aware
   * Storefront call below.
   */
  const handleByRow = new Map<number, string>();
  rows.forEach((s, i) => {
    const h = typeof s?.productHandle === 'string' ? s.productHandle.trim() : '';
    if (h) handleByRow.set(i, h);
  });

  const unresolvedCodes = Array.from(
    new Set(
      rows
        .map((s, i) => (handleByRow.has(i) ? null : String(s?.productCode || '').trim()))
        .filter((c): c is string => !!c),
    ),
  ).slice(0, 40);

  if (unresolvedCodes.length) {
    const bySku = await resolveHandlesByCode(context.env, unresolvedCodes);
    rows.forEach((s, i) => {
      if (handleByRow.has(i)) return;
      const code = String(s?.productCode || '').trim();
      const handle = code ? bySku.get(code) : undefined;
      if (handle) handleByRow.set(i, handle);
    });
  }

  /**
   * One locale-aware lookup per distinct handle. A shopper with no alerts pays
   * for nothing, and a failed lookup leaves the stored title in place rather
   * than emptying the row.
   */
  const handles = Array.from(new Set(handleByRow.values())).slice(0, 25);

  const localized = new Map<string, {title: string; imageUrl: string | null}>();
  if (handles.length) {
    const results = await Promise.all(
      handles.map(async (handle) => {
        try {
          const res: any = await context.storefront.query(
            PRODUCT_BY_HANDLE_QUERY,
            {variables: {handle}, cache: context.storefront.CacheShort()},
          );
          return res?.product ? {handle, product: res.product} : null;
        } catch {
          return null;
        }
      }),
    );
    for (const r of results) {
      if (!r?.product?.title) continue;
      localized.set(r.handle, {
        title: r.product.title,
        imageUrl: r.product.featuredImage?.url || null,
      });
    }
  }

  const localizedSubscriptions = rows.map((sub: any, i: number) => {
    const handle = handleByRow.get(i);
    const hit = handle ? localized.get(handle) : null;
    if (!hit) return sub;
    return {
      ...sub,
      productTitle: hit.title || sub.productTitle,
      /**
       * Shopify's image wins over the stored one. The stored URL is a CDN link
       * captured at subscribe time, so it goes stale when the product's image
       * is replaced; the fresh one is what the rest of the site is showing.
       */
      imageUrl: hit.imageUrl || sub.imageUrl,
      // So the row can link to the product even when the middleware had no handle.
      productHandle: sub.productHandle || handle,
    };
  });

  return json({
    subscriptions: localizedSubscriptions,
    /** False means the middleware would not answer -- not "you have none". */
    reachable: ok,
    hasPhone: Boolean(self?.phone),
  });
}

export async function action({request, context}: ActionFunctionArgs) {
  const {resolveSelf} = await import('~/lib/session-identity.server');
  const {cancelNotifySubscription} = await import('~/lib/notify-me.server');

  const form = await request.formData();
  const self = await resolveSelf(context);

  if (!self) {
    return json({success: false, error: 'unauthorized'}, {status: 401});
  }

  const {ok} = await cancelNotifySubscription({
    env: context.env,
    subscriptionId: String(form.get('subscriptionId') || '') || null,
    // Always the session's own phone. A form field would be a way to cancel
    // somebody else's alert.
    phone: self.phone,
    productCode: String(form.get('productCode') || '') || null,
    locationId: String(form.get('locationId') || '') || null,
  });

  return ok
    ? json({success: true})
    : json({success: false, error: 'failed'}, {status: 503});
}

export default function AccountNotifications() {
  const {subscriptions, reachable, hasPhone} = useLoaderData<typeof loader>();
  const {locale} = useOutletContext<{locale: string}>();
  const isEn = locale === 'en';

  /**
   * Branch names have the same problem as product titles: the middleware
   * stores whichever spelling the shopper saw when subscribing, so "فرع
   * القريات" followed the row onto /en. Root already carries every location
   * with its English `name` and `name_in_arabic` metafield, so the name can be
   * looked up per locale instead of replayed.
   */
  const rootData = useRouteLoaderData('root') as any;
  // Same shape the cart components read: the query result nests under its own
  // `locations` key before the node list.
  const locations =
    rootData?.locations?.locations?.nodes || rootData?.locations?.nodes || [];

  return (
    <div className="account-notifications" dir={isEn ? 'ltr' : 'rtl'}>
      <div className="hidden lg:flex items-center justify-between bg-white border border-[#9FB7AE] rounded-[12px] px-6 py-5 mb-6 w-full">
        <h1 className="!text-[18px] font-bold text-[#234745] !m-0">
          {isEn ? 'Stock Alerts' : 'تنبيهات التوفر'}
        </h1>
        <span className="text-[#234745] font-normal !text-[16px]">
          {subscriptions.length} {isEn ? 'Alerts' : 'تنبيه'}
        </span>
      </div>

      <p className="text-[#A2A491] text-sm font-bold mb-5 leading-relaxed">
        {isEn
          ? 'Products you asked us to tell you about when they are back in stock at your branch.'
          : 'المنتجات التي طلبت إبلاغك عند توفرها في فرعك.'}
      </p>

      {!reachable ? (
        <EmptyCard
          title={isEn ? 'Alerts are unavailable' : 'تعذّر عرض التنبيهات'}
          body={
            isEn
              ? 'We could not reach the alerts service just now. Please try again shortly.'
              : 'تعذّر الوصول إلى خدمة التنبيهات حالياً. يرجى المحاولة بعد قليل.'
          }
        />
      ) : subscriptions.length === 0 ? (
        <EmptyCard
          title={isEn ? 'No alerts yet' : 'لا توجد تنبيهات'}
          body={
            hasPhone
              ? isEn
                ? 'When a product is out of stock at your branch, tap “Notify Me” and it will appear here.'
                : 'عند نفاد أحد المنتجات في فرعك، اضغط «أبلغني عن التوفر» وسيظهر هنا.'
              : isEn
                ? 'Alerts are listed by phone number. Add a phone number to your profile to manage them here — alerts you set with an email only can be cancelled from the link in the email.'
                : 'تُعرض التنبيهات حسب رقم الجوال. أضف رقم جوالك إلى ملفك الشخصي لإدارتها هنا — أما التنبيهات المسجّلة ببريد إلكتروني فقط فيمكن إلغاؤها من الرابط الموجود في الرسالة.'
          }
          cta={
            hasPhone ? (
              <Link
                to={isEn ? '/en/collections/all' : '/collections/all'}
                className="inline-block px-10 py-3.5 bg-[#234745] !text-white rounded-full font-bold hover:bg-[#1a3533] transition-colors shadow-sm"
              >
                {isEn ? 'Start Shopping' : 'ابدأ التسوق'}
              </Link>
            ) : (
              <Link
                to={isEn ? '/en/account/profile' : '/account/profile'}
                className="inline-block px-10 py-3.5 bg-[#234745] !text-white rounded-full font-bold hover:bg-[#1a3533] transition-colors shadow-sm"
              >
                {isEn ? 'Go to Profile' : 'الذهاب للملف الشخصي'}
              </Link>
            )
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {subscriptions.map((sub, i) => (
            <SubscriptionRow
              key={sub.id || `${sub.productCode}-${sub.locationId}-${i}`}
              sub={sub}
              isEn={isEn}
              locations={locations}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyCard({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta?: React.ReactNode;
}) {
  return (
    <div className="text-center py-16 md:py-20 bg-white rounded-[32px] border border-[#f0ece8] flex flex-col items-center justify-center px-6">
      <div className="w-20 h-20 bg-[#fcfaf8] rounded-full flex items-center justify-center mb-6">
        <BellIcon />
      </div>
      <h2 className="text-xl font-bold text-[#234745] mb-3">{title}</h2>
      <p className="text-gray-500 mb-8 mx-auto w-full max-w-md leading-relaxed">
        {body}
      </p>
      {cta}
    </div>
  );
}

function SubscriptionRow({
  sub,
  isEn,
  locations,
}: {
  sub: any;
  isEn: boolean;
  locations: any[];
}) {
  const fetcher = useFetcher<{success: boolean}>();
  const cancelling = fetcher.state !== 'idle';
  // The row is gone from the list on the next load; until then it says so
  // rather than sitting there looking un-cancelled.
  const cancelled = fetcher.data?.success === true;
  const failed = fetcher.data && fetcher.data.success === false;

  const title =
    sub.productTitle || (isEn ? 'Product' : 'منتج') ;

  // Match on the stored id first, then on the stored name — the middleware
  // may have kept either, and the name it kept may be the Arabic one.
  const location = findBranchLocation(
    locations,
    sub.locationId,
    sub.branchName,
  );
  const arabicName =
    location?.name_in_arabic?.value || location?.name_in_arabic || '';
  const branchLabel = isEn
    ? location?.name || sub.branchName
    : arabicName || location?.name || sub.branchName;

  return (
    <div
      className={`bg-white border rounded-[16px] p-4 flex items-center gap-4 transition-opacity ${
        cancelled ? 'opacity-50 border-[#f0ece8]' : 'border-[#9FB7AE]'
      }`}
    >
      <div className="w-16 h-16 shrink-0 rounded-[12px] bg-[#FEF8EB] overflow-hidden flex items-center justify-center">
        {sub.imageUrl ? (
          <img
            src={sub.imageUrl}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <BellIcon />
        )}
      </div>

      <div className="flex-1 min-w-0">
        {sub.productHandle ? (
          <Link
            to={`${isEn ? '/en' : ''}/products/${sub.productHandle}`}
            className="block font-bold text-[#234745] truncate hover:underline"
          >
            {title}
          </Link>
        ) : (
          <p className="font-bold text-[#234745] truncate !mb-0">{title}</p>
        )}
        <p className="text-xs text-[#A2A491] font-bold mt-1 truncate !mb-0">
          {branchLabel || (isEn ? 'Your selected branch' : 'الفرع المحدد')}
        </p>
        {failed && (
          <p className="text-red-500 text-xs font-bold mt-1 !mb-0">
            {isEn
              ? 'Could not cancel. Please try again.'
              : 'تعذّر الإلغاء. يرجى المحاولة مرة أخرى.'}
          </p>
        )}
      </div>

      {cancelled ? (
        <span className="text-xs font-bold text-[#A2A491] shrink-0">
          {isEn ? 'Cancelled' : 'تم الإلغاء'}
        </span>
      ) : (
        <fetcher.Form method="post" className="shrink-0">
          <input type="hidden" name="subscriptionId" value={sub.id || ''} />
          <input type="hidden" name="productCode" value={sub.productCode || ''} />
          <input type="hidden" name="locationId" value={sub.locationId || ''} />
          <button
            type="submit"
            disabled={cancelling}
            className="px-4 py-2 rounded-full border-2 border-[#e6e0d8] text-[#234745] text-xs font-bold hover:border-red-300 hover:text-red-500 transition-colors disabled:opacity-50"
          >
            {cancelling
              ? isEn
                ? 'Cancelling…'
                : 'جارٍ الإلغاء…'
              : isEn
                ? 'Cancel alert'
                : 'إلغاء التنبيه'}
          </button>
        </fetcher.Form>
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#234745"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
