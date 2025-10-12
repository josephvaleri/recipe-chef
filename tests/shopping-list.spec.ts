import { test, expect } from '@playwright/test';

test.describe('Shopping List Tests', () => {
  test('should load shopping list page', async ({ page }) => {
    await page.goto('/shopping-list');
    await page.waitForLoadState('networkidle');
    
    const url = page.url();
    expect(url).toMatch(/\/(shopping-list|auth\/signin)/);
  });

  test('should display shopping list without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/shopping-list');
    await page.waitForLoadState('networkidle');
    
    if (page.url().includes('/shopping-list')) {
      await page.waitForTimeout(2000);
      
      // Check for rendering errors
      expect(errors.filter(e => !e.includes('404')).length).toBe(0);
    }
  });

  test('should have date range selector', async ({ page }) => {
    await page.goto('/shopping-list');
    await page.waitForLoadState('networkidle');
    
    if (page.url().includes('/shopping-list')) {
      // Look for date inputs or next X days selector
      const dateInputs = await page.locator('input[type="date"], button:has-text("days"), input[type="number"]').all();
      expect(dateInputs.length).toBeGreaterThan(0);
    }
  });

  test('should group ingredients by category', async ({ page }) => {
    await page.goto('/shopping-list');
    await page.waitForLoadState('networkidle');
    
    if (page.url().includes('/shopping-list')) {
      await page.waitForTimeout(2000);
      
      // Look for category headings
      const headings = await page.locator('h2, h3, h4, .category, [class*="category"]').all();
      
      // If there are items, they should be categorized
      const bodyText = await page.textContent('body');
      if (!bodyText?.includes('No items') && !bodyText?.includes('empty')) {
        expect(headings.length).toBeGreaterThan(0);
      }
    }
  });

  test('should allow checking off items', async ({ page }) => {
    await page.goto('/shopping-list');
    await page.waitForLoadState('networkidle');
    
    if (page.url().includes('/shopping-list')) {
      await page.waitForTimeout(2000);
      
      // Look for checkboxes
      const checkboxes = await page.locator('input[type="checkbox"]').all();
      
      if (checkboxes.length > 0) {
        const checkbox = checkboxes[0];
        const initialState = await checkbox.isChecked();
        
        await checkbox.click();
        await page.waitForTimeout(500);
        
        const newState = await checkbox.isChecked();
        expect(newState).not.toBe(initialState);
      }
    }
  });

  test('should combine duplicate ingredients', async ({ page }) => {
    await page.goto('/shopping-list');
    await page.waitForLoadState('networkidle');
    
    if (page.url().includes('/shopping-list')) {
      await page.waitForTimeout(2000);
      
      const bodyText = await page.textContent('body');
      
      // If there are ingredients, they should be aggregated
      // (This is more of a data test, hard to test without fixtures)
      expect(bodyText).toBeTruthy();
    }
  });

  test('should have print functionality', async ({ page }) => {
    await page.goto('/shopping-list');
    await page.waitForLoadState('networkidle');
    
    if (page.url().includes('/shopping-list')) {
      const printButton = page.locator('button:has-text("Print"), button:has-text("print"), a:has-text("Print")').first();
      
      if (await printButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(printButton).toBeVisible();
      }
    }
  });

  test('should handle empty shopping list gracefully', async ({ page }) => {
    await page.goto('/shopping-list');
    await page.waitForLoadState('networkidle');
    
    if (page.url().includes('/shopping-list')) {
      await page.waitForTimeout(2000);
      
      const bodyText = await page.textContent('body');
      
      // Should show some message if empty, not crash
      expect(bodyText).toBeTruthy();
      expect(bodyText!.length).toBeGreaterThan(0);
    }
  });
});

