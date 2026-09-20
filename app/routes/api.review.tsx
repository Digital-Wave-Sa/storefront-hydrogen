import {data, type ActionFunctionArgs} from 'react-router';
import {getAdminToken, getAdminDomain} from '~/lib/shopify-admin.server';
import {resolveNumericCustomerId} from '~/lib/session-identity.server';
import {reviewOwnerToken, ownsReview} from '~/lib/review-owner.server';

/**
 * Edit and delete a review you wrote.
 *
 * Reviews were write-once: api.submit-review calls metaobjectCreate and there
 * was no update or delete anywhere in the codebase, so a shopper who rated the
 * wrong product, or typed into the wrong field, had no way back.
 *
 * ── The rule this route exists to enforce ──
 *
 * The only thing that decides whether an edit is allowed is a comparison,
 * performed here, between the `owner_token` stored ON the review and the token
 * derived from THIS session. The client sends a review id and new content and
 * nothing else that matters. It cannot send an owner, a customer id or a name
 * that changes the outcome, because none of those are read.
 *
 * That is the whole design. `customer_name` on a review is a display string —
 * «Verified Customer» sits on reviews by different people — so any check that
 * consulted it would let anyone sharing a name edit someone else's review, and
 * anyone able to set their own name edit anybody's. api.submit-review takes
 * customerName, customerEmail and customerPhone straight from the posted form,
 * which is the proof that client-supplied identity cannot be a permission.
 *
 * The review is re-read from the Admin API on every request rather than
 * trusted from the page that linked here. A page can be stale, cached, or
 * fabricated; the stored token cannot.
 */

const REVIEW_QUERY = `#graphql
  query ReviewForEdit($id: ID!) {
    metaobject(id: $id) {
      id
      type
      fields {
        key
        value
      }
    }
  }
`;

const REVIEW_UPDATE = `#graphql
  mutation UpdateReview($id: ID!, $metaobject: MetaobjectUpdateInput!) {
    metaobjectUpdate(id: $id, metaobject: $metaobject) {
      metaobject {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const REVIEW_DELETE = `#graphql
  mutation DeleteReview($id: ID!) {
    metaobjectDelete(id: $id) {
      deletedId
      userErrors {
        field
        message
      }
    }
  }
`;

async function adminQuery(
  shopDomain: string,
  token: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<any> {
  const res = await fetch(
    `https://${shopDomain}/admin/api/2024-04/graphql.json`,
    {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({query, variables}),
      signal: AbortSignal.timeout(6000),
    },
  );
  return res.json();
}

/** The longest a review may be. Matches the textarea on the product page. */
const MAX_COMMENT = 1000;
const MAX_TITLE = 120;

export async function action({request, context}: ActionFunctionArgs) {
  const env = context.env as any;
  const isEn = context.storefront.i18n.language === 'EN';

  /**
   * Messages are written here rather than forwarded from Shopify. A
   * userErrors string is English, written for developers, and putting it on an
   * Arabic page is how «Invalid gift card code» ended up mid-sentence on the
   * wallet — a mistake this codebase has already had to fix once.
   */
  const t = (en: string, ar: string) => (isEn ? en : ar);

  const refuse = (
    enMessage: string,
    arMessage: string,
    status: number,
  ) => data({success: false, error: t(enMessage, arMessage)}, {status});

  if (request.method !== 'POST') {
    return refuse('Method not allowed.', 'طريقة غير مسموح بها.', 405);
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return refuse('Could not read the request.', 'تعذّر قراءة الطلب.', 400);
  }

  const intent = String(formData.get('intent') || '').trim();
  const reviewId = String(formData.get('reviewId') || '').trim();

  if (intent !== 'edit' && intent !== 'delete') {
    return refuse('Unknown action.', 'إجراء غير معروف.', 400);
  }

  /**
   * A metaobject gid and nothing else. Without this the id below is pasted
   * into a mutation, and a caller could aim this route at any object in the
   * shop it can name.
   */
  if (!/^gid:\/\/shopify\/Metaobject\/\d+$/.test(reviewId)) {
    return refuse('Review not found.', 'لم يتم العثور على المراجعة.', 400);
  }

  const shopDomain = getAdminDomain(env);
  const adminToken = await getAdminToken(env);
  if (!shopDomain || !adminToken) {
    console.error('[REVIEWS] Missing admin credentials for review edit.');
    return refuse(
      'Could not reach the store right now. Please try again.',
      'تعذّر الوصول إلى المتجر حالياً. يرجى المحاولة مرة أخرى.',
      503,
    );
  }

  /** Who is asking — from the session, never from the form. */
  const numericCustomerId = await resolveNumericCustomerId(context);
  const viewerToken = await reviewOwnerToken(
    numericCustomerId,
    env?.SESSION_SECRET,
  );

  if (!viewerToken) {
    return refuse(
      'Please sign in to change your review.',
      'يرجى تسجيل الدخول لتعديل مراجعتك.',
      401,
    );
  }

  /** The review as the store holds it, not as the page described it. */
  const existing = await adminQuery(shopDomain, adminToken, REVIEW_QUERY, {
    id: reviewId,
  }).catch((e: any) => {
    console.error('[REVIEWS] Could not load review for edit:', e);
    return null;
  });

  const metaobject = existing?.data?.metaobject;
  if (!metaobject || metaobject.type !== 'storefront_review') {
    return refuse('Review not found.', 'لم يتم العثور على المراجعة.', 404);
  }

  const fields: Record<string, string> = {};
  for (const f of metaobject.fields || []) fields[f.key] = f.value;

  /**
   * The whole authorisation, in one line.
   *
   * `ownsReview` refuses when either side is empty, so a review written before
   * `owner_token` existed cannot be claimed by anybody — including by a
   * signed-out visitor whose own token is also empty. Failing closed on those
   * leaves a handful of old reviews read-only; failing open would hand every
   * one of them to the first person who asked.
   */
  if (!ownsReview(fields.owner_token, viewerToken)) {
    /** Deliberately the same wording as «not found»: a refusal that
     *  distinguished «someone else's» from «does not exist» would confirm
     *  which review ids are real. */
    console.warn(
      `[REVIEWS] Refused ${intent} of ${reviewId} by customer ${numericCustomerId}.`,
    );
    return refuse('Review not found.', 'لم يتم العثور على المراجعة.', 404);
  }

  if (intent === 'delete') {
    const result = await adminQuery(shopDomain, adminToken, REVIEW_DELETE, {
      id: reviewId,
    }).catch((e: any) => {
      console.error('[REVIEWS] Delete failed:', e);
      return null;
    });

    const errors = result?.data?.metaobjectDelete?.userErrors || [];
    if (!result?.data?.metaobjectDelete?.deletedId || errors.length > 0) {
      console.error('[REVIEWS] Delete userErrors:', JSON.stringify(errors));
      return refuse(
        'Could not delete your review. Please try again.',
        'تعذّر حذف مراجعتك. يرجى المحاولة مرة أخرى.',
        502,
      );
    }

    return data({success: true, deleted: true});
  }

  const rating = Math.round(Number(formData.get('rating')));
  const comment = String(formData.get('comment') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim();

  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return refuse(
      'Please choose a rating between 1 and 5.',
      'يرجى اختيار تقييم بين ١ و ٥.',
      400,
    );
  }

  /**
   * An empty body is refused on edit even though create accepts one. Saving an
   * edit that silently blanks the review looks like the review was deleted,
   * and the shopper has no way to tell which happened.
   */
  if (!comment) {
    return refuse(
      'Please write something, or delete the review instead.',
      'يرجى كتابة نص المراجعة، أو حذفها بدلاً من ذلك.',
      400,
    );
  }

  if (comment.length > MAX_COMMENT || title.length > MAX_TITLE) {
    return refuse('That is too long.', 'النص طويل جداً.', 400);
  }

  /**
   * Only the three fields a shopper owns. product_handle, status, language,
   * location and owner_token are all left exactly as stored — an edit must not
   * be a way to move a review onto another product, re-approve one that was
   * held back, or hand it to somebody else.
   */
  const updateFields = [
    {key: 'rating', value: String(rating)},
    {key: 'review_comment', value: comment},
  ];
  if (title) updateFields.push({key: 'review_title', value: title});

  const result = await adminQuery(shopDomain, adminToken, REVIEW_UPDATE, {
    id: reviewId,
    metaobject: {fields: updateFields},
  }).catch((e: any) => {
    console.error('[REVIEWS] Update failed:', e);
    return null;
  });

  const errors = result?.data?.metaobjectUpdate?.userErrors || [];
  if (!result?.data?.metaobjectUpdate?.metaobject?.id || errors.length > 0) {
    console.error('[REVIEWS] Update userErrors:', JSON.stringify(errors));
    return refuse(
      'Could not save your review. Please try again.',
      'تعذّر حفظ مراجعتك. يرجى المحاولة مرة أخرى.',
      502,
    );
  }

  return data({
    success: true,
    review: {
      id: reviewId,
      rating,
      review_comment: comment,
      review_title: title || fields.review_title || '',
    },
  });
}

/** Nothing to GET here. */
export async function loader() {
  return data({error: 'Not found'}, {status: 404});
}
