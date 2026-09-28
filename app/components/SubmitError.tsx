/**
 * The message a form shows when the server turns a submission down.
 *
 * Reviews, feedback and stock alerts now need a signed-in customer; the
 * server answers `{error, needsLogin: true}` for a guest. Then this also
 * offers the way in, sending them back to the same page afterwards (the
 * login action honours `redirectTo`).
 */
export function SubmitError({
  error,
  needsLogin,
  isEn,
  className = '',
}: {
  error?: string | null;
  needsLogin?: boolean;
  isEn: boolean;
  className?: string;
}) {
  if (!error) return null;

  const here =
    typeof window !== 'undefined'
      ? window.location.pathname + window.location.search
      : '';
  const loginHref = `${isEn ? '/en' : ''}/account/login${
    here ? `?redirectTo=${encodeURIComponent(here)}` : ''
  }`;

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 rounded-2xl border border-[#F1D5CE] bg-[#FFF7F5] px-4 py-3.5 text-start ${className}`}
    >
      <span
        aria-hidden
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FBE3DD] text-[#B2452F]"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <line x1="12" y1="7.5" x2="12" y2="12.5" />
          <circle cx="12" cy="16" r="0.6" fill="currentColor" />
        </svg>
      </span>
      <div className="flex flex-col gap-1.5">
        <p className="text-[13px] font-light leading-relaxed text-[#8A3B2B]">{error}</p>
        {needsLogin && (
          <a
            href={loginHref}
            className="text-[13px] font-bold !text-[#234745] !underline underline-offset-2 hover:!text-[#1a3533]"
          >
            {isEn ? 'Sign in' : 'تسجيل الدخول'}
          </a>
        )}
      </div>
    </div>
  );
}
