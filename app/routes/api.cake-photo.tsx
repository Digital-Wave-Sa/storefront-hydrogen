import {type ActionFunctionArgs} from 'react-router';
import {getAdminDomain, getAdminToken} from '~/lib/shopify-admin.server';
import {uploadImageToFiles} from '~/lib/upload-image.server';
import {PHOTO_MAX_BYTES, PHOTO_MIME_TYPES} from '~/lib/photo-print';

/**
 * POST /api/cake-photo — a shopper's photo for printing on a cake.
 *
 * Multipart, one field `file`. Saved to Shopify Files; answers
 * `{url}` with the CDN link that goes on the cake's cart line.
 *
 * Open to guests (a cake can be bought without an account), so it is bounded:
 * JPG/PNG/WebP checked by their first bytes rather than by the browser's word,
 * 8 MB at most, and 10 uploads an hour per visitor session.
 */
export async function loader() {
  return Response.json({error: 'Use POST'}, {status: 405});
}

const RATE_KEY = 'cakePhotoUploads';
const HOUR = 60 * 60 * 1000;
const MAX_PER_HOUR = 10;

/** The real type, from the file's first bytes. */
function sniffImage(head: Uint8Array): string | null {
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'image/jpeg';
  if (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47)
    return 'image/png';
  const ascii = (from: number, to: number) =>
    String.fromCharCode(...Array.from(head.slice(from, to)));
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  return null;
}

export async function action({request, context}: ActionFunctionArgs) {
  const isEn = context.storefront.i18n.language === 'EN';
  const say = (en: string, ar: string) => (isEn ? en : ar);
  const fail = (status: number, en: string, ar: string) =>
    Response.json({error: say(en, ar)}, {status});

  if (request.method !== 'POST') return fail(405, 'Use POST', 'Use POST');

  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > PHOTO_MAX_BYTES + 64 * 1024) {
    return fail(413, 'The photo is larger than 8 MB.', 'حجم الصورة أكبر من 8 ميجابايت.');
  }

  const recent = String((await context.session.get(RATE_KEY)) || '')
    .split(',')
    .map(Number)
    .filter((t) => Number.isFinite(t) && Date.now() - t < HOUR);
  if (recent.length >= MAX_PER_HOUR) {
    return fail(
      429,
      'Too many uploads in a short time. Please try again later.',
      'رفعت صوراً كثيرة خلال وقت قصير. يرجى المحاولة لاحقاً.',
    );
  }

  let file: File | null = null;
  try {
    const form = await request.formData();
    const value = form.get('file');
    file = value instanceof File ? value : null;
  } catch {
    file = null;
  }
  if (!file || file.size === 0) {
    return fail(400, 'Please choose a photo.', 'يرجى اختيار صورة.');
  }
  if (file.size > PHOTO_MAX_BYTES) {
    return fail(413, 'The photo is larger than 8 MB.', 'حجم الصورة أكبر من 8 ميجابايت.');
  }

  const bytes = await file.arrayBuffer();
  const mimeType = sniffImage(new Uint8Array(bytes.slice(0, 16)));
  if (!mimeType || !PHOTO_MIME_TYPES.includes(mimeType)) {
    return fail(
      415,
      'Please upload a JPG, PNG or WebP photo.',
      'يرجى رفع صورة بصيغة JPG أو PNG أو WebP.',
    );
  }

  const env = context.env as any;
  const shopDomain = getAdminDomain(env);
  const token = await getAdminToken(env);
  if (!shopDomain || !token) {
    console.error('[cake-photo] Missing admin domain or token');
    return fail(
      500,
      'We could not upload your photo right now. Please try again shortly.',
      'تعذّر رفع الصورة حالياً. يرجى المحاولة بعد قليل.',
    );
  }

  context.session.set(RATE_KEY, [...recent, Date.now()].join(','));

  const ext = mimeType.split('/')[1] === 'jpeg' ? 'jpg' : mimeType.split('/')[1];
  const {url} = await uploadImageToFiles(shopDomain, token, {
    bytes,
    mimeType,
    filename: `cake-photo-${Date.now()}.${ext}`,
    alt: 'Cake photo print',
  });

  // The session (rate count) is committed by server.ts.
  if (!url) {
    return Response.json(
      {
        error: say(
          'We could not upload your photo. Please try again.',
          'تعذّر رفع الصورة. يرجى المحاولة مرة أخرى.',
        ),
      },
      {status: 502},
    );
  }
  return Response.json({url});
}
