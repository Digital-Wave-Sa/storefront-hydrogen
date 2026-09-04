import { useState } from 'react';
import { SaudiRiyalSymbol } from '~/components/Price';

export interface GiftCardActivationProps {
  customerId?: string;
  isEn?: boolean;
  onActivated?: (newBalance: number, creditedMessage?: string) => void;
}

/**
 * GiftCardActivation
 *
 * Renders a gift card code input form. On submission it posts the code to our
 * own POST /api/store-credit, which resolves the customer from the session and
 * forwards the redemption; the result is shown inline.
 *
 * This used to post the code AND the Shopify customer gid straight to
 * sdgc.saadeddin.top from the browser, with nothing proving the caller was that
 * customer. The gid is no longer sent at all.
 *
 * @param {string} customerId - present only to tell whether anyone is signed in
 * @param {boolean} isEn - Language flag for English/Arabic text
 * @param {function} onActivated - Optional callback invoked on successful activation
 */
export function GiftCardActivation({
  customerId,
  isEn = false,
  onActivated,
}: GiftCardActivationProps) {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [newBalance, setNewBalance] = useState<number | null>(null);

  // Helper to format input as XXXX-XXXX-XXXX-XXXX
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (raw.length > 16) raw = raw.slice(0, 16);

    const parts = raw.match(/.{1,4}/g) || [];
    setCode(parts.join('-'));
  };

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault();
    const formattedCode = code.trim();
    if (!formattedCode || !customerId) {
      if (!customerId) {
        setStatus('error');
        setMessage(
          isEn
            ? 'Please log in to activate your gift card.'
            : 'يرجى تسجيل الدخول لتفعيل بطاقة الهدايا الخاصة بك.',
        );
      }
      return;
    }

    setStatus('loading');
    setMessage('');
    setNewBalance(null);

    try {
      const response = await fetch('/api/store-credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // No customerId: the route reads it from the session.
        body: JSON.stringify({ code: formattedCode }),
      });

      const data = (await response.json()) as any;

      if (response.ok && data.success) {
        setStatus('success');
        /**
         * The redemption service writes its confirmation in English only
         * ("Card activated! 200 SAR credited to your profile"), so taking it
         * whenever it is present put an English sentence in the middle of the
         * Arabic page. It is used only on the English interface now.
         *
         * Nothing is lost in Arabic: the credited figure it mentions is
         * implied by the new balance shown on the line below, which is
         * already translated. Subtracting to name the amount ourselves would
         * mean trusting a previous balance that may already be stale, and a
         * wrong number is worse than no number.
         */
        const successMsg =
          (isEn && data.message) ||
          (isEn
            ? 'Gift card activated successfully! Store credit added to your account.'
            : 'تم تفعيل بطاقة الهدايا بنجاح! تم إضافة الرصيد إلى حسابك.');
        setMessage(successMsg);
        
        if (data.newBalance !== undefined && data.newBalance !== null) {
          setNewBalance(data.newBalance);
          if (onActivated) {
            onActivated(data.newBalance, successMsg);
          }
        }
        setCode('');
      } else {
        setStatus('error');
        setMessage(
          data.error ||
            (isEn
              ? 'Invalid gift card code. Please check and try again.'
              : 'رمز بطاقة الهدايا غير صحيح. يرجى التحقق والمحاولة مرة أخرى.'),
        );
      }
    } catch (err) {
      setStatus('error');
      setMessage(
        isEn
          ? 'Connection error. Please check your internet and try again.'
          : 'خطأ في الاتصال. يرجى التحقق من الاتصال بالإنترنت والمحاولة مرة أخرى.',
      );
    }
  }

  return (
    <div
      className="gift-card-activation bg-white border border-[#BBCFCD]/40 rounded-[24px] p-6 md:p-8 shadow-sm transition-all"
      dir={isEn ? 'ltr' : 'rtl'}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-[#234745]/10 flex items-center justify-center text-[#234745] shrink-0">
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-[#234745] m-0">
          {isEn ? 'Activate a Gift Card' : 'تفعيل بطاقة الهدايا'}
        </h3>
      </div>

      <p className="text-sm text-gray-500 font-medium mb-6">
        {isEn
          ? 'Enter the 16-character code from your gift card (Format: XXXX-XXXX-XXXX-XXXX) to add store credit.'
          : 'أدخل رمز بطاقة الهدايا المكون من 16 حرفاً (بالصيغة: XXXX-XXXX-XXXX-XXXX) لإضافة الرصيد لحسابك.'}
      </p>

      <form onSubmit={handleActivate} className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={code}
            onChange={handleCodeChange}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            maxLength={19}
            autoComplete="off"
            spellCheck={false}
            disabled={status === 'loading'}
            className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 focus:border-[#234745] rounded-xl text-center md:text-start font-mono text-base font-bold tracking-widest text-[#234745] uppercase focus:outline-none transition-all placeholder:text-gray-300 disabled:opacity-60"
            style={{ letterSpacing: '2px' }}
          />
        </div>

        <button
          type="submit"
          disabled={status === 'loading' || !code.trim()}
          className="px-8 py-3.5 bg-[#234745] hover:bg-[#1a3533] active:scale-[0.99] text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#234745]/20"
        >
          {status === 'loading' ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>{isEn ? 'Activating…' : 'جاري التفعيل...'}</span>
            </>
          ) : (
            <span>{isEn ? 'Activate Card' : 'تفعيل البطاقة'}</span>
          )}
        </button>
      </form>

      {/* Result Notification */}
      {status === 'success' && (
        <div className="mt-5 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 animate-fade-in flex flex-col gap-1.5">
          <div className="flex items-center gap-2 font-bold text-sm">
            <svg
              className="w-5 h-5 text-emerald-600 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>{message}</span>
          </div>
          {newBalance !== null && (
            <p className="text-sm font-semibold text-emerald-700 mt-1 flex items-center gap-1.5">
              <span>{isEn ? 'New Store Credit Balance:' : 'رصيد حسابك الجديد:'}</span>
              <strong className="text-emerald-950 font-black inline-flex items-center gap-1" dir="ltr">
                {newBalance}{' '}
                <SaudiRiyalSymbol className="h-4 w-auto text-emerald-950 inline-block mb-0.5" />
              </strong>
            </p>
          )}
        </div>
      )}

      {status === 'error' && (
        <div className="mt-5 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 animate-fade-in flex items-center gap-2 text-sm font-bold">
          <svg
            className="w-5 h-5 text-rose-600 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}
