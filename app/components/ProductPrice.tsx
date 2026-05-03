import {Price} from './Price';
import type {MoneyV2} from '@shopify/hydrogen/storefront-api-types';

export function ProductPrice({
  price,
  compareAtPrice,
}: {
  price?: MoneyV2;
  compareAtPrice?: MoneyV2 | null;
}) {
  return (
    <div aria-label="Price" className="product-price" role="group">
      {compareAtPrice ? (
        <div className="product-price-on-sale flex items-center gap-2">
          {price ? <Price data={price} size="sm" /> : null}
          <s className="text-gray-400 text-xs">
            <Price data={compareAtPrice} size="xs" />
          </s>
        </div>
      ) : price ? (
        <Price data={price} size="sm" />
      ) : (
        <span>&nbsp;</span>
      )}
    </div>
  );
}
