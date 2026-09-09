import {
  data as json,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from 'react-router';
import {useLoaderData, useFetcher, useOutletContext, Link} from 'react-router';

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

  return json({
    subscriptions,
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

function SubscriptionRow({sub, isEn}: {sub: any; isEn: boolean}) {
  const fetcher = useFetcher<{success: boolean}>();
  const cancelling = fetcher.state !== 'idle';
  // The row is gone from the list on the next load; until then it says so
  // rather than sitting there looking un-cancelled.
  const cancelled = fetcher.data?.success === true;
  const failed = fetcher.data && fetcher.data.success === false;

  const title =
    sub.productTitle || (isEn ? 'Product' : 'منتج') ;

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
          {sub.branchName ||
            (isEn ? 'Your selected branch' : 'الفرع المحدد')}
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
