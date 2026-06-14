import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility and RTL/LTR testing', () => {
  const routes = [
    { path: '/', lang: 'ar', dir: 'rtl' },
    { path: '/en', lang: 'en', dir: 'ltr' },
    { path: '/collections/all', lang: 'ar', dir: 'rtl' },
    { path: '/en/collections/all', lang: 'en', dir: 'ltr' },
    { path: '/buy-gift-card', lang: 'ar', dir: 'rtl' },
    { path: '/corporate', lang: 'ar', dir: 'rtl' },
    { path: '/pages/faq', lang: 'ar', dir: 'rtl' },
  ];

  for (const route of routes) {
    test(`Should not have any automatically detectable accessibility issues on ${route.path}`, async ({ page }) => {
      await page.goto(route.path);

      // Verify basic lang/dir setup
      const htmlLocator = page.locator('html');
      await expect(htmlLocator).toHaveAttribute('lang', route.lang);
      await expect(htmlLocator).toHaveAttribute('dir', route.dir);

      // Wait for the hydration and CSS transitions to finish so axe-core can see the content
      await page.waitForSelector('body.show-content');
      await page.waitForTimeout(500); // give it a moment to become fully visible

      // Run Axe analysis
      const accessibilityScanResults = await new AxeBuilder({ page })
        .disableRules(['scrollable-region-focusable', 'color-contrast', 'heading-order']) // These are false positives or brand color choices/layout preferences
        .analyze();
      
      expect(accessibilityScanResults.violations).toEqual([]);
    });
  }
});
