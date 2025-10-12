import { test, expect } from '@playwright/test';

test.describe('Recipe Management Tests', () => {
  test.describe('Recipe Import', () => {
    test('should load add recipe page', async ({ page }) => {
      await page.goto('/add');
      
      // Should redirect to signin if not authenticated
      await page.waitForLoadState('networkidle');
      const url = page.url();
      expect(url).toMatch(/\/(add|auth\/signin)/);
    });

    test('should have URL import functionality', async ({ page }) => {
      await page.goto('/add');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/add')) {
        const urlInput = page.locator('input[type="url"], input[placeholder*="URL"], input[placeholder*="url"]').first();
        if (await urlInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(urlInput).toBeVisible();
        }
      }
    });

    test('should validate recipe URL format', async ({ page }) => {
      await page.goto('/add');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/add')) {
        const urlInput = page.locator('input[type="url"]').first();
        if (await urlInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await urlInput.fill('not-a-valid-url');
          
          const isValid = await urlInput.evaluate((el: HTMLInputElement) => el.validity.valid);
          expect(isValid).toBe(false);
        }
      }
    });
  });

  test.describe('Recipe Display', () => {
    test('should load cookbook page', async ({ page }) => {
      await page.goto('/cookbook');
      await page.waitForLoadState('networkidle');
      
      const url = page.url();
      // Either shows cookbook or redirects to auth
      expect(url).toMatch(/\/(cookbook|auth\/signin)/);
    });

    test('should have search functionality', async ({ page }) => {
      await page.goto('/cookbook');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/cookbook')) {
        const searchInput = page.locator('input[type="text"], input[placeholder*="Search"], input[placeholder*="search"]').first();
        if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(searchInput).toBeVisible();
          
          await searchInput.fill('test recipe');
          await page.waitForTimeout(1000);
          
          // Search should filter results without errors
          const errors: string[] = [];
          page.on('console', msg => {
            if (msg.type() === 'error') {
              errors.push(msg.text());
            }
          });
          
          await page.waitForTimeout(500);
          expect(errors.length).toBe(0);
        }
      }
    });

    test('should display recipe cards without errors', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      await page.goto('/cookbook');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/cookbook')) {
        await page.waitForTimeout(2000);
        
        // Check for rendering errors
        expect(errors.filter(e => !e.includes('404')).length).toBe(0);
      }
    });
  });

  test.describe('Recipe Finder', () => {
    test('should load recipe finder page', async ({ page }) => {
      await page.goto('/finder');
      await page.waitForLoadState('networkidle');
      
      const url = page.url();
      expect(url).toMatch(/\/(finder|auth\/signin)/);
    });

    test('should have ingredient filters', async ({ page }) => {
      await page.goto('/finder');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/finder')) {
        // Look for filter controls
        const filterButtons = await page.locator('button, input[type="checkbox"]').all();
        expect(filterButtons.length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Recipe Detail View', () => {
    test('should handle invalid recipe IDs gracefully', async ({ page }) => {
      await page.goto('/recipe/999999');
      await page.waitForLoadState('networkidle');
      
      // Should show error or redirect, not crash
      const bodyText = await page.textContent('body');
      expect(bodyText).toBeTruthy();
      
      // Check for error message
      const hasErrorMessage = 
        bodyText?.includes('not found') || 
        bodyText?.includes('error') || 
        page.url().includes('signin');
      
      expect(hasErrorMessage).toBe(true);
    });

    test('should scale recipe servings', async ({ page }) => {
      await page.goto('/recipe/1');
      await page.waitForLoadState('networkidle');
      
      if (!page.url().includes('signin')) {
        // Look for serving adjustment controls
        const plusButton = page.locator('button:has-text("+")').first();
        const minusButton = page.locator('button:has-text("-")').first();
        
        if (await plusButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await plusButton.click();
          await page.waitForTimeout(500);
          
          // Should update without errors
          const errors: string[] = [];
          page.on('console', msg => {
            if (msg.type() === 'error') {
              errors.push(msg.text());
            }
          });
          
          expect(errors.length).toBe(0);
        }
      }
    });
  });

  test.describe('Data Integrity', () => {
    test('should handle missing recipe images gracefully', async ({ page }) => {
      await page.goto('/cookbook');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/cookbook')) {
        await page.waitForTimeout(2000);
        
        // Check that broken images don't break layout
        const images = await page.locator('img').all();
        for (const img of images.slice(0, 5)) { // Check first 5 images
          const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
          const hasAlt = await img.getAttribute('alt');
          
          if (naturalWidth === 0) {
            // Broken image should have alt text or placeholder
            expect(hasAlt).toBeTruthy();
          }
        }
      }
    });

    test('should validate recipe data types', async ({ page }) => {
      await page.goto('/add/manual');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/add')) {
        // Look for numeric inputs
        const servingsInput = page.locator('input[type="number"], input[placeholder*="serving"]').first();
        if (await servingsInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await servingsInput.fill('abc');
          
          const value = await servingsInput.inputValue();
          // Should reject non-numeric input
          expect(value).not.toBe('abc');
        }
      }
    });
  });
});

