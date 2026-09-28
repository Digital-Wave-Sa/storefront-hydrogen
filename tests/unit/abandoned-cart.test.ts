import {test} from 'node:test';
import assert from 'node:assert/strict';
import {orderCartCloseInput} from '../../app/lib/abandoned-cart.ts';

test('builds a COMPLETED close from an order carrying a cart_id', () => {
  const input = orderCartCloseInput({
    id: 123,
    name: '#1042',
    order_number: 1042,
    currency: 'SAR',
    subtotal_price: '275.00',
    total_price: '235.00',
    order_status_url: 'https://shop.example/orders/abc',
    customer: {first_name: 'Sara', last_name: 'Ali', phone: '+966500000000'},
    note_attributes: [{name: 'cart_id', value: 'gid://shopify/Cart/999'}],
    line_items: [
      {variant_id: 555, name: 'Rose Cake', quantity: 2, price: '100.00'},
    ],
  });

  assert.ok(input);
  assert.equal(input.status, 'COMPLETED');
  assert.equal(input.phone, '+966500000000');
  assert.equal(input.customerName, 'Sara Ali');
  assert.equal(input.cartId, 'gid://shopify/Cart/999');
  assert.equal(input.subtotal, 275);
  assert.equal(input.currency, 'SAR');
  assert.equal(input.orderName, '#1042');
  assert.equal(input.orderNumber, '1042');
  assert.deepEqual(input.items, [
    {id: '555', title: 'Rose Cake', quantity: 2, price: 100},
  ]);
});

test('falls back to the shipping phone and a legacy cart key', () => {
  const input = orderCartCloseInput({
    order_number: 7,
    shipping_address: {phone: '966511111111'},
    customer: {first_name: 'Ali'},
    note_attributes: [{key: 'cart_id', value: 'cart-7'}],
    line_items: [],
  });

  assert.ok(input);
  assert.equal(input.phone, '966511111111');
  assert.equal(input.customerName, 'Ali');
  assert.equal(input.cartId, 'cart-7');
  assert.equal(input.orderName, '#7');
  assert.equal(input.currency, 'SAR');
});

test('prefers cart_id but falls back to cart_token', () => {
  const withToken = orderCartCloseInput({
    order_number: 9,
    customer: {phone: '9665', first_name: '', last_name: ''},
    cart_token: 'token-9',
  });

  assert.ok(withToken);
  assert.equal(withToken.cartId, 'token-9');
  assert.equal(withToken.customerName, 'Guest');
});

test('returns null when the order has no phone', () => {
  const input = orderCartCloseInput({
    order_number: 10,
    customer: {},
    line_items: [{title: 'X', quantity: 1, price: '5'}],
  });
  assert.equal(input, null);
});

test('coerces junk amounts instead of emitting NaN', () => {
  const input = orderCartCloseInput({
    order_number: 11,
    customer: {phone: '9665'},
    subtotal_price: 'not-a-number',
    line_items: [{title: 'X', quantity: 1, price: ''}],
  });

  assert.ok(input);
  assert.equal(input.subtotal, 0);
  assert.equal(input.items[0].price, 0);
  assert.equal(input.items[0].id, '');
});
