import {useRef, useState} from 'react';
import {SaudiRiyalSymbol} from '~/components/Price';
import {PHOTO_MAX_BYTES, PHOTO_MIME_TYPES} from '~/lib/photo-print';

/**
 * «أضف صورتك على الكيك» — on product pages tagged `photo-print`.
 *
 * The photo is uploaded as soon as it is picked, so «أضف إلى السلة» only
 * has to put the link on the line. The page blocks adding to cart while the
 * option is on without a finished upload (see `photoBlocksAdd`).
 * See ~/lib/photo-print for the whole flow.
 */
export function CakePhotoUpload({
  isEn,
  price,
  enabled,
  onEnabledChange,
  photoUrl,
  onPhotoUrlChange,
  onBusyChange,
}: {
  isEn: boolean;
  price: number;
  enabled: boolean;
  onEnabledChange: (on: boolean) => void;
  photoUrl: string;
  onPhotoUrlChange: (url: string) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  /** Ignores an upload that finishes after the shopper picked another. */
  const attemptRef = useRef(0);

  const setBusyBoth = (b: boolean) => {
    setBusy(b);
    onBusyChange(b);
  };

  const say = (en: string, ar: string) => (isEn ? en : ar);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    if (!PHOTO_MIME_TYPES.includes(file.type)) {
      setError(say('Please choose a JPG, PNG or WebP photo.', 'يرجى اختيار صورة بصيغة JPG أو PNG أو WebP.'));
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      setError(say('The photo is larger than 8 MB.', 'حجم الصورة أكبر من 8 ميجابايت.'));
      return;
    }

    const attempt = ++attemptRef.current;
    /**
     * A `data:` preview, not `URL.createObjectURL`: the site's CSP (img-src
     * in entry.server.tsx) allows `data:` but not `blob:`, so a blob preview
     * showed as a broken image even though the upload had worked.
     */
    const reader = new FileReader();
    reader.onload = () => {
      if (attempt === attemptRef.current && typeof reader.result === 'string') {
        setPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
    onPhotoUrlChange('');
    setBusyBoth(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/cake-photo', {method: 'POST', body});
      const json: any = await res.json().catch(() => ({}));
      if (attempt !== attemptRef.current) return;
      if (!res.ok || !json?.url) {
        const byStatus: Record<number, [string, string]> = {
          413: ['The photo is larger than 8 MB.', 'حجم الصورة أكبر من 8 ميجابايت.'],
          415: ['Please choose a JPG, PNG or WebP photo.', 'يرجى اختيار صورة بصيغة JPG أو PNG أو WebP.'],
          429: ['Too many uploads in a short time. Please try again later.', 'رفعت صوراً كثيرة خلال وقت قصير. يرجى المحاولة لاحقاً.'],
        };
        const [en, ar] = byStatus[res.status] || [
          'We could not upload your photo. Please try again.',
          'تعذّر رفع الصورة. يرجى المحاولة مرة أخرى.',
        ];
        setError(say(en, ar));
        setPreview('');
        return;
      }
      onPhotoUrlChange(String(json.url));
    } catch {
      if (attempt !== attemptRef.current) return;
      setError(say('We could not upload your photo. Please try again.', 'تعذّر رفع الصورة. يرجى المحاولة مرة أخرى.'));
      setPreview('');
    } finally {
      if (attempt === attemptRef.current) setBusyBoth(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const clear = () => {
    attemptRef.current++;
    setPreview('');
    setError('');
    onPhotoUrlChange('');
    setBusyBoth(false);
  };

  const shown = preview || photoUrl;

  return (
    <div className="w-full mt-[8px] max-w-[519px]">
      <div className="bg-[#FEF8EB] border border-[#E5E5E5] rounded-[16px] p-[16px] flex flex-col items-start gap-3 shadow-sm">
        <label className="flex items-center gap-3 w-full cursor-pointer select-none">
          <input
            id="cake-photo-toggle"
            type="checkbox"
            checked={enabled}
            onChange={(e) => {
              onEnabledChange(e.target.checked);
              if (!e.target.checked) clear();
            }}
            className="w-5 h-5 rounded-[6px] accent-[#234745] shrink-0"
          />
          <span className="flex-1 text-start">
            <span className="block font-bold text-[#234745] text-[16px]">
              {say('Add your photo on the cake', 'أضف صورتك على الكيك')}
            </span>
            <span className="block text-[#7D7D7D] text-[13px] mt-1">
              {say(
                'We print your photo on the cake top.',
                'نطبع صورتك على سطح الكيك.',
              )}
            </span>
          </span>
          <span className="shrink-0 flex items-center gap-1 font-bold text-[#234745] text-[15px]" dir="ltr">
            +<SaudiRiyalSymbol className="w-[14px] h-auto text-[#234745]" />
            <span style={{fontFamily: "'Outfit', sans-serif"}}>{price.toFixed(2)}</span>
          </span>
        </label>

        {enabled && (
          <div className="w-full flex flex-col gap-2">
            <input
              ref={inputRef}
              id="cake-photo-file"
              type="file"
              accept={PHOTO_MIME_TYPES.join(',')}
              className="hidden"
              onChange={(e) => pick(e.target.files?.[0])}
            />
            {shown ? (
              <div className="flex items-center gap-3 w-full bg-white rounded-[12px] border border-[#BBCFCD]/60 p-2">
                <div className="relative w-16 h-16 rounded-[10px] overflow-hidden bg-[#F3F4F1] shrink-0">
                  <img src={shown} alt="" className="w-full h-full object-cover" />
                  {busy && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                      <span className="w-5 h-5 rounded-full border-2 border-[#234745]/20 border-t-[#234745] animate-spin" aria-hidden="true" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 text-start" aria-live="polite">
                  <span className={`block text-[14px] font-bold ${busy ? 'text-[#7D7D7D]' : 'text-emerald-700'}`}>
                    {busy ? say('Uploading…', 'جاري رفع الصورة…') : say('Photo ready', 'تم رفع الصورة')}
                  </span>
                  <div className="flex items-center gap-4 mt-1 text-[13px] font-bold">
                    <button type="button" className="text-[#234745] underline" onClick={() => inputRef.current?.click()}>
                      {say('Change', 'تغيير')}
                    </button>
                    <button type="button" className="text-red-600 underline" onClick={clear}>
                      {say('Remove', 'إزالة')}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="w-full border-2 border-dashed border-[#906B51]/60 rounded-[12px] p-4 flex flex-col items-center justify-center gap-1 text-center bg-white/70 hover:bg-white transition-colors"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#906B51" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span className="text-[#234745] font-bold text-[14px]">{say('Choose a photo', 'اختر صورة')}</span>
                <span className="text-[#8B9895] text-[12px]">{say('JPG, PNG or WebP · up to 8 MB', 'JPG أو PNG أو WebP · حتى 8 ميجابايت')}</span>
              </button>
            )}
            {error && <span className="text-[13px] font-bold text-red-600 text-start" role="alert">{error}</span>}
            {!shown && !error && (
              <span className="text-[12px] text-[#d4a06a] font-semibold text-start">
                {say('Choose a photo to add the cake to your cart, or untick the option.', 'اختر صورة لإضافة الكيك إلى السلة، أو ألغِ تحديد الخيار.')}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
