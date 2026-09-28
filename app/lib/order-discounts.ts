export interface OrderDiscountCode {
  code: string;
  amount: number;
  type: string;
}

export interface OrderDiscount {
  discount_codes: OrderDiscountCode[];
  total_discounts: number;
  total_price: number;
}

export function extractOrderDiscount(payload: any): OrderDiscount {
  const noteAttributes: Array<{ name?: string; key?: string; value?: string }> =
    payload?.note_attributes || [];
  const normKey = (s: unknown) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const noteValue = (key: string): string | undefined => {
    const target = normKey(key);
    return noteAttributes.find((a) => normKey(a?.name ?? a?.key) === target)?.value;
  };
  const toNum = (v: unknown): number => {
    const n = parseFloat(String(v ?? '').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  };

  const discount_codes: OrderDiscountCode[] = (
    Array.isArray(payload?.discount_codes) ? payload.discount_codes : []
  )
    .filter((d: any) => d && d.code)
    .map((d: any) => ({
      code: String(d.code),
      amount: toNum(d.amount),
      type: String(d.type || 'fixed_amount'),
    }));

  const shopifyTotalDiscounts = toNum(payload?.total_discounts);
  const noteDiscount = toNum(noteValue('discount_amount'));

  if (discount_codes.length === 0) {
    const promoCode = noteValue('PromoCode');
    const promoAmount = toNum(noteValue('PromoDiscount')) || noteDiscount;
    if (promoCode && promoAmount > 0) {
      discount_codes.push({ code: String(promoCode), amount: promoAmount, type: 'fixed_amount' });
    }
  }

  const summedCodes = discount_codes.reduce((sum, c) => sum + c.amount, 0);
  const total_discounts =
    shopifyTotalDiscounts > 0 ? shopifyTotalDiscounts : summedCodes || noteDiscount;

  const totalLineItems = toNum(payload?.total_line_items_price) || toNum(payload?.subtotal_price);
  const rawTotalPrice = toNum(payload?.total_price);
  let total_price = rawTotalPrice;
  if (total_discounts > 0 && totalLineItems > 0 && rawTotalPrice >= totalLineItems) {
    total_price = +(totalLineItems - total_discounts).toFixed(2);
  }

  return { discount_codes, total_discounts, total_price };
}
