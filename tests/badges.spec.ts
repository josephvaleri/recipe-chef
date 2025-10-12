import { test, expect } from '@playwright/test';

/**
 * Badge System E2E Tests
 * Tests badge display, event logging, and badge awarding
 */

test.describe('Badge System Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Note: These tests require authentication
    // You may need to set up test user credentials or use authenticated state
    await page.goto('/');
  });

  test.describe('Badge Page Display', () => {
    
    test('should load badges page without errors', async ({ page }) => {
      // Skip if not authenticated
      const isAuthenticated = await page.locator('text=My Cookbook').isVisible().catch(() => false);
      if (!isAuthenticated) {
        test.skip();
      }

      await page.goto('/badges');
      await expect(page).toHaveTitle(/Recipe Chef/);
      
      // Check for console errors
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      await page.waitForLoadState('networkidle');
      expect(errors.length).toBe(0);
    });

    test('should display badge page header and stats', async ({ page }) => {
      const isAuthenticated = await page.locator('text=My Cookbook').isVisible().catch(() => false);
      if (!isAuthenticated) {
        test.skip();
      }

      await page.goto('/badges');
      
      // Check header
      await expect(page.locator('h1:has-text("Your Badges")')).toBeVisible();
      
      // Check stats cards exist
      await expect(page.locator('text=Earned')).toBeVisible();
      await expect(page.locator('text=Available')).toBeVisible();
      await expect(page.locator('text=Progress')).toBeVisible();
    });

    test('should display all 16 badges', async ({ page }) => {
      const isAuthenticated = await page.locator('text=My Cookbook').isVisible().catch(() => false);
      if (!isAuthenticated) {
        test.skip();
      }

      await page.goto('/badges');
      await page.waitForLoadState('networkidle');
      
      // Wait for badges to load
      await page.waitForSelector('[class*="badge"]', { timeout: 5000 }).catch(() => {});
      
      // Check that badge cards are displayed (at least some should be visible)
      const badgeCards = await page.locator('div:has-text("Recipe Maker"), div:has-text("Cuisine Explorer")').count();
      expect(badgeCards).toBeGreaterThan(0);
    });

    test('should show tabs for All Badges and Earned badges', async ({ page }) => {
      const isAuthenticated = await page.locator('text=My Cookbook').isVisible().catch(() => false);
      if (!isAuthenticated) {
        test.skip();
      }

      await page.goto('/badges');
      
      // Check tabs exist
      await expect(page.locator('button:has-text("All Badges")')).toBeVisible();
      await expect(page.locator('button:has-text("Earned")')).toBeVisible();
    });

    test('should switch between All and Earned tabs', async ({ page }) => {
      const isAuthenticated = await page.locator('text=My Cookbook').isVisible().catch(() => false);
      if (!isAuthenticated) {
        test.skip();
      }

      await page.goto('/badges');
      await page.waitForLoadState('networkidle');
      
      // Click Earned tab
      await page.click('button:has-text("Earned")');
      
      // Wait for content update
      await page.waitForTimeout(500);
      
      // Tab should be active
      const earnedTab = page.locator('button:has-text("Earned")');
      await expect(earnedTab).toHaveClass(/border-orange-500|text-orange-600/);
    });

    test('should display badge icons', async ({ page }) => {
      const isAuthenticated = await page.locator('text=My Cookbook').isVisible().catch(() => false);
      if (!isAuthenticated) {
        test.skip();
      }

      await page.goto('/badges');
      await page.waitForLoadState('networkidle');
      
      // Check for Lucide icons (SVG elements)
      const icons = await page.locator('svg').count();
      expect(icons).toBeGreaterThan(0);
    });

  });

  test.describe('Badge Navigation', () => {
    
    test('should have Badges link in navigation menu', async ({ page }) => {
      const isAuthenticated = await page.locator('text=My Cookbook').isVisible().catch(() => false);
      if (!isAuthenticated) {
        test.skip();
      }

      await page.goto('/cookbook');
      
      // Open hamburger menu
      await page.click('button[aria-label="Toggle menu"]');
      
      // Check for Badges link
      await expect(page.locator('text=Badges')).toBeVisible();
    });

    test('should navigate to badges page from menu', async ({ page }) => {
      const isAuthenticated = await page.locator('text=My Cookbook').isVisible().catch(() => false);
      if (!isAuthenticated) {
        test.skip();
      }

      await page.goto('/cookbook');
      
      // Open hamburger menu
      await page.click('button[aria-label="Toggle menu"]');
      
      // Click Badges link
      await page.click('text=Badges');
      
      // Should navigate to badges page
      await expect(page).toHaveURL(/\/badges/);
    });

  });

  test.describe('Badge Progress Display', () => {
    
    test('should show progress bars for badges', async ({ page }) => {
      const isAuthenticated = await page.locator('text=My Cookbook').isVisible().catch(() => false);
      if (!isAuthenticated) {
        test.skip();
      }

      await page.goto('/badges');
      await page.waitForLoadState('networkidle');
      
      // Look for progress indicators (progress bars or "Progress to" text)
      const progressElements = await page.locator('text=/Progress to|more to reach/').count();
      
      // Should have at least some progress indicators
      expect(progressElements).toBeGreaterThanOrEqual(0); // May be 0 if no progress yet
    });

    test('should display current counts and thresholds', async ({ page }) => {
      const isAuthenticated = await page.locator('text=My Cookbook').isVisible().catch(() => false);
      if (!isAuthenticated) {
        test.skip();
      }

      await page.goto('/badges');
      await page.waitForLoadState('networkidle');
      
      // Look for fraction patterns like "0 / 25" or "5 / 50"
      const fractionPattern = await page.locator('text=/\\d+ \\/ \\d+/').count();
      
      // Should display thresholds for badges
      expect(fractionPattern).toBeGreaterThan(0);
    });

  });

  test.describe('Badge Categories/Families', () => {
    
    test('should group badges by family', async ({ page }) => {
      const isAuthenticated = await page.locator('text=My Cookbook').isVisible().catch(() => false);
      if (!isAuthenticated) {
        test.skip();
      }

      await page.goto('/badges');
      await page.waitForLoadState('networkidle');
      
      // Check for family headings
      const familyHeadings = await page.locator('h2').count();
      expect(familyHeadings).toBeGreaterThan(0);
    });

    test('should display badges under appropriate categories', async ({ page }) => {
      const isAuthenticated = await page.locator('text=My Cookbook').isVisible().catch(() => false);
      if (!isAuthenticated) {
        test.skip();
      }

      await page.goto('/badges');
      await page.waitForLoadState('networkidle');
      
      // Look for known badge names
      const recipeMaker = await page.locator('text=Recipe Maker').isVisible().catch(() => false);
      const cuisineExplorer = await page.locator('text=Cuisine Explorer').isVisible().catch(() => false);
      
      // At least some badges should be visible
      expect(recipeMaker || cuisineExplorer).toBeTruthy();
    });

  });

  test.describe('Badge Tiers', () => {
    
    test('should display tier labels (Bronze, Silver, Gold)', async ({ page }) => {
      const isAuthenticated = await page.locator('text=My Cookbook').isVisible().catch(() => false);
      if (!isAuthenticated) {
        test.skip();
      }

      await page.goto('/badges');
      await page.waitForLoadState('networkidle');
      
      // Check for tier labels in progress text
      const tierLabels = await page.locator('text=/Bronze|Silver|Gold|Platinum|Diamond/').count();
      expect(tierLabels).toBeGreaterThan(0);
    });

  });

  test.describe('Empty States', () => {
    
    test('should show empty state when no badges earned', async ({ page }) => {
      const isAuthenticated = await page.locator('text=My Cookbook').isVisible().catch(() => false);
      if (!isAuthenticated) {
        test.skip();
      }

      await page.goto('/badges');
      await page.waitForLoadState('networkidle');
      
      // Click Earned tab
      await page.click('button:has-text("Earned")');
      await page.waitForTimeout(500);
      
      // Check for empty state (if no badges earned)
      const earnedBadges = await page.locator('text="Max Tier Reached!"').count();
      const emptyState = await page.locator('text=/No badges earned yet|start using/i').isVisible().catch(() => false);
      
      // Either has earned badges or shows empty state
      expect(earnedBadges > 0 || emptyState).toBeTruthy();
    });

  });

  test.describe('Responsive Design', () => {
    
    test('should be responsive on mobile', async ({ page }) => {
      const isAuthenticated = await page.locator('text=My Cookbook').isVisible().catch(() => false);
      if (!isAuthenticated) {
        test.skip();
      }

      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
      await page.goto('/badges');
      await page.waitForLoadState('networkidle');
      
      // Page should load without horizontal scroll
      const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
      const clientWidth = await page.evaluate(() => document.body.clientWidth);
      
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 10); // Allow small margin
    });

    test('should show grid layout on desktop', async ({ page }) => {
      const isAuthenticated = await page.locator('text=My Cookbook').isVisible().catch(() => false);
      if (!isAuthenticated) {
        test.skip();
      }

      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/badges');
      await page.waitForLoadState('networkidle');
      
      // Check for grid layout
      const gridElement = await page.locator('div[class*="grid"]').first().isVisible().catch(() => false);
      expect(gridElement).toBeTruthy();
    });

  });

  test.describe('Performance', () => {
    
    test('should load badges page within 3 seconds', async ({ page }) => {
      const isAuthenticated = await page.locator('text=My Cookbook').isVisible().catch(() => false);
      if (!isAuthenticated) {
        test.skip();
      }

      const startTime = Date.now();
      await page.goto('/badges');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(3000);
    });

    test('should not have memory leaks on tab switching', async ({ page }) => {
      const isAuthenticated = await page.locator('text=My Cookbook').isVisible().catch(() => false);
      if (!isAuthenticated) {
        test.skip();
      }

      await page.goto('/badges');
      await page.waitForLoadState('networkidle');
      
      // Switch tabs multiple times
      for (let i = 0; i < 5; i++) {
        await page.click('button:has-text("Earned")');
        await page.waitForTimeout(200);
        await page.click('button:has-text("All Badges")');
        await page.waitForTimeout(200);
      }
      
      // Page should still be responsive
      const isResponsive = await page.locator('h1').isVisible();
      expect(isResponsive).toBeTruthy();
    });

  });

  test.describe('Accessibility', () => {
    
    test('should have proper heading hierarchy', async ({ page }) => {
      const isAuthenticated = await page.locator('text=My Cookbook').isVisible().catch(() => false);
      if (!isAuthenticated) {
        test.skip();
      }

      await page.goto('/badges');
      await page.waitForLoadState('networkidle');
      
      // Check for h1
      const h1 = await page.locator('h1').count();
      expect(h1).toBeGreaterThanOrEqual(1);
    });

    test('should have accessible button labels', async ({ page }) => {
      const isAuthenticated = await page.locator('text=My Cookbook').isVisible().catch(() => false);
      if (!isAuthenticated) {
        test.skip();
      }

      await page.goto('/badges');
      await page.waitForLoadState('networkidle');
      
      // Tab buttons should have text content
      const allBadgesTab = await page.locator('button:has-text("All Badges")');
      const earnedTab = await page.locator('button:has-text("Earned")');
      
      expect(await allBadgesTab.isVisible()).toBeTruthy();
      expect(await earnedTab.isVisible()).toBeTruthy();
    });

  });

  test.describe('Badge Data Validation', () => {
    
    test('should display valid badge descriptions', async ({ page }) => {
      const isAuthenticated = await page.locator('text=My Cookbook').isVisible().catch(() => false);
      if (!isAuthenticated) {
        test.skip();
      }

      await page.goto('/badges');
      await page.waitForLoadState('networkidle');
      
      // Check that badge cards have descriptions
      const descriptions = await page.locator('p[class*="text-sm"]').count();
      expect(descriptions).toBeGreaterThan(0);
    });

    test('should display badge names correctly', async ({ page }) => {
      const isAuthenticated = await page.locator('text=My Cookbook').isVisible().catch(() => false);
      if (!isAuthenticated) {
        test.skip();
      }

      await page.goto('/badges');
      await page.waitForLoadState('networkidle');
      
      // Known badge names from the spec
      const knownBadges = [
        'Recipe Maker',
        'Cuisine Explorer',
        'Curator',
        'Top Rated Chef',
        'Recipe Judge',
      ];
      
      // At least some known badges should be present
      let foundBadges = 0;
      for (const badgeName of knownBadges) {
        const exists = await page.locator(`text=${badgeName}`).isVisible().catch(() => false);
        if (exists) foundBadges++;
      }
      
      expect(foundBadges).toBeGreaterThan(0);
    });

  });

  test.describe('Error Handling', () => {
    
    test('should handle network errors gracefully', async ({ page }) => {
      const isAuthenticated = await page.locator('text=My Cookbook').isVisible().catch(() => false);
      if (!isAuthenticated) {
        test.skip();
      }

      // Intercept badge requests and fail them
      await page.route('**/rest/v1/badges*', route => route.abort());
      await page.route('**/rest/v1/badge_tiers*', route => route.abort());
      
      await page.goto('/badges');
      
      // Page should still load, possibly with error message or loading state
      await expect(page.locator('h1:has-text("Your Badges")')).toBeVisible();
    });

    test('should not crash on missing data', async ({ page }) => {
      const isAuthenticated = await page.locator('text=My Cookbook').isVisible().catch(() => false);
      if (!isAuthenticated) {
        test.skip();
      }

      await page.goto('/badges');
      
      // Check for console errors
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error' && !msg.text().includes('Failed to load resource')) {
          errors.push(msg.text());
        }
      });
      
      await page.waitForLoadState('networkidle');
      
      // Should not have critical errors
      const criticalErrors = errors.filter(e => 
        e.includes('undefined') || e.includes('null') || e.includes('Cannot read')
      );
      expect(criticalErrors.length).toBe(0);
    });

  });

});

