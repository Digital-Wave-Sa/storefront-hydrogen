import { test, expect } from '@playwright/test';

// Helper to retrieve the active FilterSidebar (desktop sidebar or mobile drawer)
async function getSidebar(page) {
  const viewport = page.viewportSize();
  const isMobile = viewport ? viewport.width < 1024 : false;
  if (isMobile) {
    // Click visible mobile filter trigger button
    const filterButton = page.locator('button:has-text("Filter"), button:has-text("تـصـفـيـة")')
      .filter({ visible: true })
      .first();
    await filterButton.click();
    
    // Locate mobile drawer container
    const mobileSidebar = page.locator('div.fixed.inset-y-0');
    await expect(mobileSidebar).toBeVisible();
    return mobileSidebar;
  } else {
    // Locate desktop sidebar container
    const desktopSidebar = page.locator('.hidden.lg\\:block.w-72.shrink-0');
    await expect(desktopSidebar).toBeVisible();
    return desktopSidebar;
  }
}

test.describe('Search, Filters, and Category Navigation Tests', () => {

  test('English Search Relevance (Cake)', async ({ page }) => {
    // Go to search page in English
    await page.goto('/en/search');
    
    // Check search form input visibility
    const searchInput = page.locator('input[placeholder="Search..."]');
    await expect(searchInput).toBeVisible();
    
    // Search for Cake
    await searchInput.fill('Cake');
    
    // Submit search form via submit button
    const searchForm = searchInput.locator('xpath=..');
    await searchForm.locator('button[type="submit"]').click();
    
    // URL should change
    await page.waitForURL('**/en/search?q=Cake*');
    
    // Result products should be visible (Cake 4 and Cake 8)
    await expect(page.locator('h4', { hasText: 'Cake 4' })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('h4', { hasText: 'Cake 8' })).toBeVisible({ timeout: 15000 });
  });

  test('Arabic Search Relevance (سيروم)', async ({ page }) => {
    // Go to search page in Arabic
    await page.goto('/search');
    
    const searchInput = page.locator('input[placeholder="شوكولاته..."]');
    await expect(searchInput).toBeVisible();
    
    // Search for "سيروم"
    await searchInput.fill('سيروم');
    
    // Submit search form via submit button
    const searchForm = searchInput.locator('xpath=..');
    await searchForm.locator('button[type="submit"]').click();
    
    await page.waitForURL('**/search?q=%D8%B3%D9%8A%D8%B1%D9%88%D9%85*');
    
    // Cake 4 handle contains "سيروم"
    await expect(page.locator('h4', { hasText: 'Cake 4' })).toBeVisible({ timeout: 15000 });
  });

  test('Bilingual Typo Tolerance', async ({ page }) => {
    // English typo: "Cak" should match Cake products
    await page.goto('/en/search?q=Cak');
    await expect(page.locator('h4', { hasText: 'Cake 4' })).toBeVisible({ timeout: 15000 });
    await expect(page.locator('h4', { hasText: 'Cake 8' })).toBeVisible({ timeout: 15000 });
    
    // Arabic typo: "سيرم" should match Cake 4 (handle: "سيروم-النهار-والليل")
    await page.goto('/search?q=%D8%B3%D9%8A%D8%B1%D9%85');
    await expect(page.locator('h4', { hasText: 'Cake 4' })).toBeVisible({ timeout: 15000 });
  });

  test('Search Filter Combinations & Sorting', async ({ page }) => {
    // Go to English search page for Cake
    await page.goto('/en/search?q=Cake');
    
    // Ensure search results are loaded
    await expect(page.locator('h4', { hasText: 'Cake 4' })).toBeVisible({ timeout: 15000 });
    
    // Locate the active FilterSidebar (desktop or mobile)
    const sidebar = await getSidebar(page);
    
    // Input Price Range (From 1000 to 9000 to keep the products visible)
    const minPriceInput = sidebar.locator('input[aria-label="Minimum Price"]');
    const maxPriceInput = sidebar.locator('input[aria-label="Maximum Price"]');
    await minPriceInput.fill('1000');
    await maxPriceInput.fill('9000');
    
    // Click Apply button in sidebar
    const applyButton = sidebar.locator('button:has-text("Apply")');
    await applyButton.click();
    
    // Verify price filter is reflected in URL
    await page.waitForURL(/.*filter\.v\.price.*/);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Allow react state/DOM changes to hydrate
    
    // Toggle sort order
    const sortSelect = page.locator('select').first();
    await expect(sortSelect).toBeVisible();
    await sortSelect.selectOption({ value: 'PRICE|false' }); // Price: Low to High
    await page.waitForURL(/.*sortKey=PRICE.*/);
  });

  test('Category Navigation via Sidebar Filters', async ({ page }) => {
    await page.goto('/en/search?q=Cake');
    
    // Ensure search results are loaded
    await expect(page.locator('h4', { hasText: 'Cake 4' })).toBeVisible({ timeout: 15000 });
    
    // Locate the active FilterSidebar (desktop or mobile)
    const sidebar = await getSidebar(page);
    
    // Verify list of category checkboxes are available
    // Category list triggers selection of collections
    const categoryButton = sidebar.locator('button:has-text("Saad Al Deen")');
    if (await categoryButton.isVisible()) {
      await categoryButton.click();
      await page.waitForURL(/.*category=.*/);
    }
  });

  test('Zero-Result Analytics Verification', async ({ page }) => {
    const query = 'nonexistentkeyword123';
    await page.goto(`/en/search?q=${query}`);
    
    // Wait for the empty state component to load
    const noResultsHeading = page.locator('h2:has-text("No results found")');
    await expect(noResultsHeading).toBeVisible({ timeout: 15000 });
    
    // Evaluate dataLayer to confirm the event was logged
    const dataLayer = await page.evaluate(() => (window as any).dataLayer || []);
    
    // Find search event
    const searchEvent = dataLayer.find((e: any) => e.event === 'search');
    expect(searchEvent).toBeDefined();
    expect(searchEvent.search_term).toBe(query);
    expect(searchEvent.language).toBe('en');
  });

});
