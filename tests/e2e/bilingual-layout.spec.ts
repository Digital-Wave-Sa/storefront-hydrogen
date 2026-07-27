import { test, expect } from '@playwright/test';

test.describe('Bilingual Layout & RTL/LTR Tests', () => {

  test('Arabic Homepage sets dir="rtl" and has correct typography', async ({ page }) => {
    await page.goto('/');
    
    // Check root html tag
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');

    // Check body font class
    await expect(page.locator('body')).toHaveClass(/font-ar/);
  });

  test('English Homepage sets dir="ltr" and has correct typography', async ({ page }) => {
    await page.goto('/en');
    
    // Check root html tag
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    // Check body font class
    await expect(page.locator('body')).toHaveClass(/font-en/);
  });

  test('Language switcher transitions properly', async ({ page }) => {
    await page.goto('/');
    
    // Switch to English
    await page.getByRole('button', { name: /English/i }).click();
    
    // Should navigate to /en and have ltr
    await page.waitForURL('**/en');
    const htmlDir = await page.locator('html').getAttribute('dir');
    expect(htmlDir).toBe('ltr');

    // Switch back to Arabic
    await page.getByRole('button', { name: /العربية/i }).click();
    
    // Should navigate back to root and have rtl
    await page.waitForURL('**/');
    const htmlDirAr = await page.locator('html').getAttribute('dir');
    expect(htmlDirAr).toBe('rtl');
  });

});
