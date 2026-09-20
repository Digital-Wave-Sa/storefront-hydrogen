/**
 * Who wrote a review, in a form that is safe to publish.
 *
 * A review has to remember its author, or «edit my review» cannot be
 * authorised: `customer_name` is a display string — «Verified Customer» sits
 * on reviews by different people — so matching on it would let anyone sharing
 * a name edit someone else's review, and anyone who can set their own name
 * edit anybody's.
 *
 * The obvious field to add is the Shopify customer id. It is the wrong one.
 * The `storefront_review` definition is `storefront: PUBLIC_READ`, and the
 * public Storefront token ships in the client bundle, so every field on it is
 * readable by anyone who cares to ask. Storing raw customer ids there would
 * publish, for every review on the shop, the id of the customer who wrote it.
 *
 * So the review stores a hash instead. The server recomputes it from the
 * session and compares; a public reader gets an opaque string that is useless
 * without SESSION_SECRET. Nothing is lost by this: nothing ever needs to read
 * the id back OUT of a review — the only question ever asked is «is this one
 * mine?», which a comparison answers.
 *
 * The token is stable for a customer across reviews, so a reader can tell that
 * two reviews share an author without learning who. That is already true from
 * `customer_name` being displayed, so it gives nothing away that the page
 * does not.
 *
 * Same SHA-256 + SESSION_SECRET construction as `derivePassword` in
 * auth.server, and the same reason: it is pure, so it can be recomputed at any
 * time from the session alone, with nothing to store and nothing to expire.
 */

/** Matches the fallback in auth.server, so a missing env behaves consistently. */
const FALLBACK_SECRET = 'saadeddin-otp-secret';

/**
 * The owner token for a customer, or null when there is no customer.
 *
 * Accepts a numeric id or a gid; both reduce to the same token, so a caller
 * holding `gid://shopify/Customer/123` and one holding `123` agree. Without
 * that, the same person would fail their own ownership check depending on
 * which key the session happened to be carrying.
 */
export async function reviewOwnerToken(
  customerId: string | number | null | undefined,
  secret: string | undefined,
): Promise<string | null> {
  const numeric = String(customerId ?? '')
    .split('/')
    .pop()
    ?.trim();

  if (!numeric || !/^\d+$/.test(numeric)) return null;

  const data = new TextEncoder().encode(
    `review-owner:${numeric}:${secret || FALLBACK_SECRET}`,
  );
  const digest = await crypto.subtle.digest('SHA-256', data);

  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Does this review belong to this customer?
 *
 * Both sides must be present. A review written before `owner_token` existed
 * has none, and an empty stored token must never match an empty computed one
 * — that would make every legacy review editable by every signed-out visitor,
 * which is the exact opposite of the point.
 */
export function ownsReview(
  storedToken: string | null | undefined,
  viewerToken: string | null | undefined,
): boolean {
  const stored = String(storedToken ?? '').trim();
  const viewer = String(viewerToken ?? '').trim();
  if (!stored || !viewer) return false;
  return stored === viewer;
}
