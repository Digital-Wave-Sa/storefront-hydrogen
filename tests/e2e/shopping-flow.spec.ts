import { test, expect } from '@playwright/test';

test.describe('Shopping Flow Tests', () => {

  test('Cart page in Arabic preserves RTL', async ({ page }) => {
    await page.goto('/cart');
    
    // We verify the main container has RTL or html has RTL
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });

  test('Cart page in English preserves LTR', async ({ page }) => {
    await page.goto('/en/cart');
    
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  });

  test('Product buttons translate correctly', async ({ page }) => {
    // English
    await page.goto('/en/collections/all');
    await expect(page.locator('body')).toContainText(/Add to Cart|Add to cart|Notify Me/i, { timeout: 10000 });
    
    // Arabic
    await page.goto('/collections/all');
    await expect(page.locator('body')).toContainText(/أضف إلي السلة|أبلغني/, { timeout: 10000 });
  });

});
