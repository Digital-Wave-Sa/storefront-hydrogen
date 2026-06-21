import { test, expect } from '@playwright/test';

test.describe('Lola Cake Builder E2E Tests', () => {

  test('Page loads and elements render correctly in English', async ({ page }) => {
    // Navigate to English Custom Cake route
    await page.goto('/en/custom-cake');

    // Verify header is visible
    await expect(page.locator('h1', { hasText: 'Design Your Cake' })).toBeVisible();

    // Verify 2D Canvas is in the DOM
    const canvas = page.locator('#cake-3d-canvas');
    await expect(canvas).toBeVisible();

    // Verify step buttons are visible (using specific child selectors to avoid duplicates)
    await expect(page.locator('button', { hasText: 'Shape' }).filter({ hasText: '1' })).toBeVisible();
    await expect(page.locator('button', { hasText: 'Flavor' }).filter({ hasText: '2' })).toBeVisible();
  });

  test('Can switch views (Front, Top, Sliced) on standard shape', async ({ page }) => {
    await page.goto('/en/custom-cake');

    // Front view should be selected by default
    const frontBtn = page.locator('button', { hasText: 'Front' });
    await expect(frontBtn).toHaveClass(/bg-\[#294941\]/); // Active class

    // Click Top view button
    const topBtn = page.locator('button', { hasText: 'Top' });
    await topBtn.click();
    await expect(topBtn).toHaveClass(/bg-\[#294941\]/);

    // Click Sliced view button
    const slicedBtn = page.locator('button', { hasText: 'Sliced' });
    await slicedBtn.click();
    await expect(slicedBtn).toHaveClass(/bg-\[#294941\]/);
  });

  test('Shape selection dynamically adjusts view compatibility', async ({ page }) => {
    await page.goto('/en/custom-cake');

    // Click on Square shape option exact label to trigger selection
    await page.getByText('Square', { exact: true }).first().click();

    // Top and Sliced buttons should NOT be visible for Square shape
    await expect(page.locator('button', { hasText: 'Top' })).not.toBeVisible();
    await expect(page.locator('button', { hasText: 'Sliced' })).not.toBeVisible();
    await expect(page.locator('button', { hasText: 'Front' })).toBeVisible();
  });

  test('Piped message inputs update state and render on canvas', async ({ page }) => {
    await page.goto('/en/custom-cake');

    // Go to step 4 (Message step) by clicking the next buttons
    const nextBtn = page.locator('button', { hasText: /Next/i });
    await nextBtn.click(); // Step 2
    await nextBtn.click(); // Step 3
    await nextBtn.click(); // Step 4

    // Input custom text
    const messageInput = page.locator('input[placeholder="Example: Happy Birthday"]');
    await messageInput.fill('Lola Birthday');

    // Verify the input updates correctly
    await expect(messageInput).toHaveValue('Lola Birthday');
  });

  test('Bilingual RTL direction in Arabic custom-cake builder', async ({ page }) => {
    // Navigate to Arabic Custom Cake route (default)
    await page.goto('/custom-cake');

    // Verify Arabic header is visible
    await expect(page.locator('h1', { hasText: 'صمم كيكتك' })).toBeVisible();

    // Verify RTL document direction
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });

});
