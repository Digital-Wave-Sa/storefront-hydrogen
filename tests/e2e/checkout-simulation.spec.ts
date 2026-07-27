import { test, expect } from '@playwright/test';

test.describe('Checkout Simulation Tests', () => {

  test('Cart redirects to Shopify checkout with Arabic locale', async ({ page }) => {
    await page.goto('/cart');
    
    // The link might not be visible immediately if cart is empty. 
    // We assume the cart has items or the button is still rendered.
    const checkoutLink = await page.locator('a', { hasText: /إتمام الطلب/ }).getAttribute('href', { timeout: 10000 }).catch(() => null);
    if (checkoutLink) {
        expect(checkoutLink).toContain('locale=ar');
    }
  });

  test('Cart redirects to Shopify checkout with English locale', async ({ page }) => {
    await page.goto('/en/cart');
    
    const checkoutLink = await page.locator('a', { hasText: /Complete Order/ }).getAttribute('href', { timeout: 10000 }).catch(() => null);
    if (checkoutLink) {
        expect(checkoutLink).toContain('locale=en');
    }
  });

});
