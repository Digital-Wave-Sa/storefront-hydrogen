import { Money } from '@shopify/hydrogen';
import type { MoneyV2 } from '@shopify/hydrogen/storefront-api-types';

interface PriceProps {
  data: MoneyV2;
  className?: string;
  isEn?: boolean;
  showSymbol?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Official Saudi Riyal Custom Symbol
 */
function SaudiRiyalSymbol({ className = "" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 1124.14 1256.39" 
      className={`inline-block fill-current ${className}`}
    >
      <path d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z"/>
      <path d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z"/>
    </svg>
  );
}

/**
 * Premium Price Component for Saadeddin
 * Customizes currency symbols and formatting for KSA
 */
export function Price({ data, className = '', isEn = false, showSymbol = true, size = 'md' }: PriceProps) {
  if (!data) return null;

  const amount = parseFloat(data.amount);
  
  // Format with commas but handle .00 removal
  const formattedAmount = amount % 1 === 0 
    ? Math.floor(amount).toLocaleString('en-US') 
    : amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm font-bold',
    md: 'text-lg font-black',
    lg: 'text-2xl font-black',
    xl: 'text-4xl font-black'
  };

  const symbolSizeClasses = {
    xs: 'h-2 w-auto',
    sm: 'h-2.5 w-auto',
    md: 'h-3.5 w-auto mb-0.5',
    lg: 'h-5 w-auto mb-1',
    xl: 'h-7 w-auto mb-1.5'
  };

  return (
    <div className={`inline-flex items-center gap-1.5 leading-none ${className} ${isEn ? 'flex-row' : 'flex-row-reverse'}`} dir="ltr">
      <span className={`${sizeClasses[size]} font-en`}>
        {formattedAmount}
      </span>
      {showSymbol && (
        <SaudiRiyalSymbol 
          className={`${symbolSizeClasses[size]}`} 
        />
      )}
    </div>
  );
}
