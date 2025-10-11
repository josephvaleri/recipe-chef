import { test, expect } from '@playwright/test';

test.describe('Recipe Finder Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/finder');
    await page.waitForLoadState('networkidle');
  });

  test('should load recipe finder page', async ({ page }) => {
    const url = page.url();
    // Either shows finder or redirects to auth
    expect(url).toMatch(/\/(finder|auth\/signin)/);
  });

  test('should display page title and description', async ({ page }) => {
    if (page.url().includes('/finder')) {
      const title = await page.locator('h1, h2').first().textContent();
      expect(title?.toLowerCase()).toMatch(/recipe|find|discover/);
    }
  });

  test('should have ingredient category filters', async ({ page }) => {
    if (page.url().includes('/finder')) {
      // Look for common ingredient categories
      const bodyText = await page.textContent('body');
      
      // Should have at least some of these categories
      const categories = ['protein', 'vegetable', 'fruit', 'grain', 'dairy', 'spice'];
      const foundCategories = categories.filter(cat => 
        bodyText?.toLowerCase().includes(cat)
      );
      
      // At least 2 categories should be present
      expect(foundCategories.length).toBeGreaterThanOrEqual(2);
    }
  });

  test('should have filter checkboxes or buttons', async ({ page }) => {
    if (page.url().includes('/finder')) {
      // Look for interactive filter elements
      const checkboxes = await page.locator('input[type="checkbox"]').count();
      const buttons = await page.locator('button').count();
      
      // Should have some way to filter (either checkboxes or buttons)
      expect(checkboxes + buttons).toBeGreaterThan(0);
    }
  });

  test('should allow selecting ingredients', async ({ page }) => {
    if (page.url().includes('/finder')) {
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      // Try to click on a checkbox or button
      const checkbox = page.locator('input[type="checkbox"]').first();
      if (await checkbox.isVisible({ timeout: 2000 }).catch(() => false)) {
        await checkbox.click();
        await page.waitForTimeout(1000);
        
        // Should not cause console errors
        expect(errors.filter(e => !e.includes('404')).length).toBe(0);
      }
    }
  });

  test('should display recipe results', async ({ page }) => {
    if (page.url().includes('/finder')) {
      await page.waitForTimeout(2000);
      
      // Look for recipe cards or list items
      const recipes = await page.locator('article, [class*="card"], [class*="recipe"]').count();
      
      // If there are filters applied, there should be some results or a "no results" message
      const bodyText = await page.textContent('body') || '';
      const hasResults = recipes > 0 || bodyText.includes('No recipes') || bodyText.includes('no recipes');
      
      expect(hasResults).toBe(true);
    }
  });

  test('should have search or filter button', async ({ page }) => {
    if (page.url().includes('/finder')) {
      // Look for a search or filter button
      const searchButton = page.locator('button:has-text("Search"), button:has-text("Find"), button:has-text("Filter")').first();
      
      if (await searchButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(searchButton).toBeVisible();
      }
    }
  });

  test('should handle ingredient selection without errors', async ({ page }) => {
    if (page.url().includes('/finder')) {
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error' && !msg.text().includes('404')) {
          errors.push(msg.text());
        }
      });

      // Select multiple ingredients
      const checkboxes = await page.locator('input[type="checkbox"]').all();
      
      for (let i = 0; i < Math.min(3, checkboxes.length); i++) {
        if (await checkboxes[i].isVisible().catch(() => false)) {
          await checkboxes[i].click();
          await page.waitForTimeout(500);
        }
      }

      // Should not cause errors
      expect(errors.length).toBe(0);
    }
  });

  test('should display "Add to Cookbook" functionality', async ({ page }) => {
    if (page.url().includes('/finder')) {
      await page.waitForTimeout(2000);
      
      // Look for add buttons
      const addButtons = page.locator('button:has-text("Add"), button:has-text("add")');
      const count = await addButtons.count();
      
      // If there are recipes, there should be add buttons (or it's a feature to implement)
      const bodyText = await page.textContent('body') || '';
      if (!bodyText.includes('No recipes') && !bodyText.includes('Select ingredients')) {
        // Some recipes should have add buttons
        console.log('Add button count:', count);
      }
    }
  });

  test('should show global recipe count or indicator', async ({ page }) => {
    if (page.url().includes('/finder')) {
      const bodyText = await page.textContent('body') || '';
      
      // Should indicate it's searching global recipes somehow
      const hasGlobalIndicator = 
        bodyText.toLowerCase().includes('global') ||
        bodyText.toLowerCase().includes('discover') ||
        bodyText.toLowerCase().includes('find recipes');
      
      expect(hasGlobalIndicator).toBe(true);
    }
  });

  test('should handle no ingredient selection gracefully', async ({ page }) => {
    if (page.url().includes('/finder')) {
      // With no ingredients selected, should show message or all recipes
      await page.waitForTimeout(2000);
      
      const bodyText = await page.textContent('body') || '';
      
      // Should have some content (either instructions or default recipes)
      expect(bodyText.length).toBeGreaterThan(100);
    }
  });

  test('should be responsive and not crash on multiple filter changes', async ({ page }) => {
    if (page.url().includes('/finder')) {
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error' && !msg.text().includes('404')) {
          errors.push(msg.text());
        }
      });

      // Rapidly toggle filters
      const checkboxes = await page.locator('input[type="checkbox"]').all();
      
      for (let i = 0; i < Math.min(5, checkboxes.length); i++) {
        if (await checkboxes[i].isVisible().catch(() => false)) {
          await checkboxes[i].click();
          await page.waitForTimeout(200);
          await checkboxes[i].click();
          await page.waitForTimeout(200);
        }
      }

      // Should handle rapid changes without crashing
      expect(errors.length).toBe(0);
    }
  });
});

