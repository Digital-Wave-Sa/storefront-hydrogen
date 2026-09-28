import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractOrderDiscount } from '../../app/lib/order-discounts.ts';

test('passes through Shopify discount_codes / total_discounts / total_price', () => {
  const result = extractOrderDiscount({
    total_line_items_price: '275.00',
    subtotal_price: '275.00',
    total_discounts: '40.00',
    total_price: '235.00',
    discount_codes: [{ code: 'ROSE40', amount: '40.00', type: 'fixed_amount' }],
  });

  assert.deepEqual(result.discount_codes, [
    { code: 'ROSE40', amount: 40, type: 'fixed_amount' },
  ]);
  assert.equal(result.total_discounts, 40);
  assert.equal(result.total_price, 235);
});

test('synthesizes a code from PromoCode note attributes when Shopify carries none', () => {
  const result = extractOrderDiscount({
    total_line_items_price: '255.00',
    subtotal_price: '255.00',
    total_price: '255.00',
    total_discounts: '0',
    discount_codes: [],
    note_attributes: [
      { name: 'PromoCode', value: 'SAVE20' },
      { name: 'PromoDiscount', value: '20.00 SAR' },
      { name: 'DiscountAmount', value: '20.00 SAR' },
    ],
  });

  assert.deepEqual(result.discount_codes, [
    { code: 'SAVE20', amount: 20, type: 'fixed_amount' },
  ]);
  assert.equal(result.total_discounts, 20);
  assert.equal(result.total_price, 235);
});

test('keeps total_price when there is no discount', () => {
  const result = extractOrderDiscount({
    total_line_items_price: '100.00',
    total_price: '100.00',
    total_discounts: '0',
    discount_codes: [],
  });

  assert.deepEqual(result.discount_codes, []);
  assert.equal(result.total_discounts, 0);
  assert.equal(result.total_price, 100);
});

test('handles a missing payload without throwing', () => {
  assert.deepEqual(extractOrderDiscount({}), {
    discount_codes: [],
    total_discounts: 0,
    total_price: 0,
  });
});
