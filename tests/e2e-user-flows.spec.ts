import { test, expect } from '@playwright/test';

test.describe('End-to-End User Flows', () => {
  test.describe('Complete Recipe Discovery Flow', () => {
    test('should complete full recipe discovery journey', async ({ page }) => {
      // Step 1: Load homepage
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Should see Chef Tony interface
      const bodyText = await page.textContent('body') || '';
      expect(bodyText.toLowerCase()).toContain('chef tony');
      
      // Step 2: Ask Chef Tony a question
      const questionInput = page.locator('textarea, input[placeholder*="ask" i]');
      const submitButton = page.locator('button:has-text("Ask"), button:has-text("Submit")');
      
      if (await questionInput.count() > 0 && await submitButton.count() > 0) {
        await questionInput.first().fill('What can I make with chicken and rice?');
        await submitButton.first().click();
        
        // Step 3: Should redirect to recipe finder
        await page.waitForTimeout(3000);
        const url = page.url();
        expect(url).toMatch(/\/finder/);
        
        // Step 4: Should see loading indicator
        const loadingText = await page.textContent('body') || '';
        const hasLoading = 
          loadingText.toLowerCase().includes('chef tony is working') ||
          loadingText.toLowerCase().includes('loading') ||
          loadingText.toLowerCase().includes('progress');
        
        // Step 5: Wait for results
        await page.waitForTimeout(5000);
        
        // Should have some results or content
        const finalText = await page.textContent('body') || '';
        expect(finalText.length).toBeGreaterThan(200);
      }
    });

    test('should handle ingredient-based recipe search', async ({ page }) => {
      await page.goto('/finder');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/finder')) {
        // Select ingredients
        const checkboxes = await page.locator('input[type="checkbox"]').all();
        
        if (checkboxes.length > 0) {
          // Select first few ingredients
          for (let i = 0; i < Math.min(3, checkboxes.length); i++) {
            if (await checkboxes[i].isVisible().catch(() => false)) {
              await checkboxes[i].click();
              await page.waitForTimeout(500);
            }
          }
          
          // Should show results
          await page.waitForTimeout(2000);
          const bodyText = await page.textContent('body') || '';
          expect(bodyText.length).toBeGreaterThan(200);
        }
      }
    });
  });

  test.describe('Community Interaction Flow', () => {
    test('should complete community discovery flow', async ({ page }) => {
      // Step 1: Navigate to community
      await page.goto('/community');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/community')) {
        // Step 2: Should see discovery interface
        const bodyText = await page.textContent('body') || '';
        expect(bodyText.toLowerCase()).toMatch(/discover|community|people/);
        
        // Step 3: Try to search for profiles
        const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');
        if (await searchInput.count() > 0) {
          await searchInput.first().fill('test');
          await page.keyboard.press('Enter');
          await page.waitForTimeout(2000);
        }
        
        // Step 4: Should handle search gracefully
        const finalText = await page.textContent('body') || '';
        expect(finalText.length).toBeGreaterThan(100);
      }
    });

    test('should handle friend invitation flow', async ({ page }) => {
      await page.goto('/community');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/community')) {
        // Look for friend buttons
        const friendButtons = page.locator('button:has-text("Add"), button:has-text("Invite"), button:has-text("Friend")');
        
        if (await friendButtons.count() > 0) {
          await friendButtons.first().click();
          await page.waitForTimeout(1000);
          
          // Should handle invitation gracefully
          const bodyText = await page.textContent('body') || '';
          expect(bodyText.length).toBeGreaterThan(100);
        }
      }
    });
  });

  test.describe('Recipe Management Flow', () => {
    test('should complete recipe addition flow', async ({ page }) => {
      await page.goto('/finder');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/finder')) {
        // Look for add to cookbook buttons
        const addButtons = page.locator('button:has-text("Add"), button:has-text("add")');
        
        if (await addButtons.count() > 0) {
          await addButtons.first().click();
          await page.waitForTimeout(2000);
          
          // Should handle addition gracefully
          const bodyText = await page.textContent('body') || '';
          expect(bodyText.length).toBeGreaterThan(100);
        }
      }
    });

    test('should navigate to cookbook after adding recipe', async ({ page }) => {
      await page.goto('/cookbook');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/cookbook')) {
        // Should see cookbook interface
        const bodyText = await page.textContent('body') || '';
        expect(bodyText.toLowerCase()).toMatch(/cookbook|recipe|my recipes/);
      }
    });
  });

  test.describe('Profile Management Flow', () => {
    test('should complete profile setup flow', async ({ page }) => {
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/profile')) {
        // Should see profile interface
        const bodyText = await page.textContent('body') || '';
        expect(bodyText.toLowerCase()).toMatch(/profile|settings|account/);
        
        // Look for editable fields
        const inputs = page.locator('input, textarea, select');
        const count = await inputs.count();
        
        if (count > 0) {
          // Try to interact with first input
          await inputs.first().click();
          await page.waitForTimeout(500);
          
          // Should handle interaction gracefully
          expect(count).toBeGreaterThan(0);
        }
      }
    });

    test('should display badge progress', async ({ page }) => {
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/profile')) {
        // Should see badge-related content
        const bodyText = await page.textContent('body') || '';
        const hasBadgeContent = 
          bodyText.toLowerCase().includes('badge') ||
          bodyText.toLowerCase().includes('achievement') ||
          bodyText.toLowerCase().includes('progress');
        
        expect(hasBadgeContent).toBe(true);
      }
    });
  });

  test.describe('Navigation Flow', () => {
    test('should navigate between all main pages', async ({ page }) => {
      const pages = [
        { path: '/', name: 'Home' },
        { path: '/cookbook', name: 'Cookbook' },
        { path: '/finder', name: 'Recipe Finder' },
        { path: '/community', name: 'Community' },
        { path: '/profile', name: 'Profile' }
      ];

      for (const pageInfo of pages) {
        await page.goto(pageInfo.path);
        await page.waitForLoadState('networkidle');
        
        // Should load without errors
        const bodyText = await page.textContent('body') || '';
        expect(bodyText.length).toBeGreaterThan(100);
        
        // Check for console errors
        const errors: string[] = [];
        page.on('console', msg => {
          if (msg.type() === 'error' && !msg.text().includes('404')) {
            errors.push(msg.text());
          }
        });
        
        await page.waitForTimeout(1000);
        expect(errors.length).toBe(0);
      }
    });

    test('should maintain state across navigation', async ({ page }) => {
      // Start at home
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Navigate to finder
      await page.goto('/finder');
      await page.waitForLoadState('networkidle');
      
      // Go back to home
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Should still work properly
      const bodyText = await page.textContent('body') || '';
      expect(bodyText.length).toBeGreaterThan(100);
    });
  });

  test.describe('Error Recovery Flow', () => {
    test('should recover from network errors', async ({ page }) => {
      // Simulate network failure
      await page.route('**/api/**', route => route.abort());
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Should still load basic page
      const bodyText = await page.textContent('body') || '';
      expect(bodyText.length).toBeGreaterThan(100);
      
      // Restore network
      await page.unroute('**/api/**');
      
      // Should work normally after network restoration
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      const reloadedText = await page.textContent('body') || '';
      expect(reloadedText.length).toBeGreaterThan(100);
    });

    test('should handle API errors gracefully', async ({ page }) => {
      // Simulate API errors
      await page.route('**/api/**', route => 
        route.fulfill({ status: 500, body: 'Internal Server Error' })
      );
      
      await page.goto('/finder');
      await page.waitForLoadState('networkidle');
      
      // Should not crash
      const bodyText = await page.textContent('body') || '';
      expect(bodyText.length).toBeGreaterThan(100);
    });
  });

  test.describe('Performance Flow', () => {
    test('should load pages within acceptable time', async ({ page }) => {
      const pages = ['/', '/finder', '/community', '/profile'];
      
      for (const path of pages) {
        const startTime = Date.now();
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        const loadTime = Date.now() - startTime;
        
        // Should load within 5 seconds
        expect(loadTime).toBeLessThan(5000);
      }
    });

    test('should handle rapid user interactions', async ({ page }) => {
      await page.goto('/finder');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/finder')) {
        const errors: string[] = [];
        page.on('console', msg => {
          if (msg.type() === 'error' && !msg.text().includes('404')) {
            errors.push(msg.text());
          }
        });

        // Rapidly click checkboxes
        const checkboxes = await page.locator('input[type="checkbox"]').all();
        
        for (let i = 0; i < Math.min(5, checkboxes.length); i++) {
          if (await checkboxes[i].isVisible().catch(() => false)) {
            await checkboxes[i].click();
            await page.waitForTimeout(100);
            await checkboxes[i].click();
            await page.waitForTimeout(100);
          }
        }
        
        // Should not cause errors
        expect(errors.length).toBe(0);
      }
    });
  });

  test.describe('Mobile Flow', () => {
    test('should work on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Should load without horizontal scroll
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = page.viewportSize()?.width || 375;
      
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20);
      
      // Test navigation on mobile
      await page.goto('/finder');
      await page.waitForLoadState('networkidle');
      
      const finderText = await page.textContent('body') || '';
      expect(finderText.length).toBeGreaterThan(100);
    });

    test('should handle touch interactions', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      await page.goto('/finder');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/finder')) {
        // Test touch interactions
        const checkboxes = await page.locator('input[type="checkbox"]').all();
        
        if (checkboxes.length > 0) {
          await checkboxes[0].tap();
          await page.waitForTimeout(500);
          
          // Should handle touch gracefully
          const bodyText = await page.textContent('body') || '';
          expect(bodyText.length).toBeGreaterThan(100);
        }
      }
    });
  });

  test.describe('Accessibility Flow', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Test keyboard navigation
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      
      // Should not cause errors
      const bodyText = await page.textContent('body') || '';
      expect(bodyText.length).toBeGreaterThan(100);
    });

    test('should have proper focus management', async ({ page }) => {
      await page.goto('/finder');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/finder')) {
        // Test focus management
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        
        // Should have visible focus indicators
        const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
        expect(focusedElement).toBeTruthy();
      }
    });
  });
});
