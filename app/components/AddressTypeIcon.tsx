import type {AddressType} from '~/lib/address-types';

/**
 * Line icons for شقة / منزل / مكتب: a block of flats, a house, a briefcase.
 * Stroke follows the text colour, so they sit in a dark chip or a light card.
 */
export function AddressTypeIcon({
  type,
  size = 16,
  className = '',
}: {
  type: AddressType;
  size?: number;
  className?: string;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    className: `shrink-0 ${className}`,
  };

  if (type === 'apartment') {
    return (
      <svg {...common}>
        <rect x="4" y="3" width="11" height="18" rx="1" />
        <path d="M15 9h4a1 1 0 0 1 1 1v11h-5" />
        <path d="M7.5 7h1M10.5 7h1M7.5 11h1M10.5 11h1M7.5 15h1M10.5 15h1" />
        <path d="M8.5 21v-2.5h2V21" />
      </svg>
    );
  }
  if (type === 'house') {
    return (
      <svg {...common}>
        <path d="M3.5 10.5 12 4l8.5 6.5" />
        <path d="M5.5 9v11h13V9" />
        <path d="M10 20v-5.5h4V20" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="3" y="7.5" width="18" height="12.5" rx="2" />
      <path d="M8.5 7.5V5.5a1.5 1.5 0 0 1 1.5-1.5h4a1.5 1.5 0 0 1 1.5 1.5v2" />
      <path d="M3 13h18" />
      <path d="M11 13v1.5h2V13" />
    </svg>
  );
}
