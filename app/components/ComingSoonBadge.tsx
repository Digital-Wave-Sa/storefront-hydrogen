/**
 * «قريباً» on links to something not open yet (the custom cake builder).
 *
 * `floating` pins a smaller tag above the link's top corner instead of sitting
 * inline — for the desktop menu, where an inline pill widened «الكيك المخصص»
 * and crowded the row. The link it sits on needs `relative`.
 */
export function ComingSoonBadge({
  isEn,
  className = '',
  floating = false,
}: {
  isEn: boolean;
  className?: string;
  floating?: boolean;
}) {
  const label = isEn ? 'Soon' : 'قريباً';
  if (floating) {
    return (
      <span
        className={`pointer-events-none absolute -top-1.5 end-0 translate-x-0 px-1.5 py-[1px] rounded-full bg-[#E9B44C] text-[#234745] text-[9px] font-bold leading-[1.3] whitespace-nowrap shadow-sm ${className}`}
      >
        {label}
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full bg-[#E9B44C] text-[#234745] text-[11px] font-bold leading-none whitespace-nowrap align-middle ${className}`}
    >
      {isEn ? 'Coming soon' : 'قريباً'}
    </span>
  );
}
