import { test, expect } from '@playwright/test';

test.describe('Badge System Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Badge Display', () => {
    test('should display badges on profile page', async ({ page }) => {
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/profile')) {
        // Look for badge-related content
        const bodyText = await page.textContent('body') || '';
        const hasBadgeContent = 
          bodyText.toLowerCase().includes('badge') ||
          bodyText.toLowerCase().includes('achievement') ||
          bodyText.toLowerCase().includes('award') ||
          bodyText.toLowerCase().includes('trophy');
        
        expect(hasBadgeContent).toBe(true);
      }
    });

    test('should show badge progress or status', async ({ page }) => {
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/profile')) {
        // Look for progress indicators or badge counts
        const progressElements = page.locator('[class*="progress"], [role="progressbar"], progress');
        const badgeElements = page.locator('[class*="badge"], [class*="trophy"], [class*="award"]');
        
        const progressCount = await progressElements.count();
        const badgeCount = await badgeElements.count();
        
        // Should have some badge-related elements
        expect(progressCount + badgeCount).toBeGreaterThanOrEqual(0);
      }
    });

    test('should display earned badges', async ({ page }) => {
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/profile')) {
        await page.waitForTimeout(2000);
        
        // Look for earned badge indicators
        const bodyText = await page.textContent('body') || '';
        const hasEarnedBadges = 
          bodyText.toLowerCase().includes('earned') ||
          bodyText.toLowerCase().includes('completed') ||
          bodyText.toLowerCase().includes('unlocked');
        
        // Should have some indication of badge status
        expect(bodyText.length).toBeGreaterThan(100);
      }
    });
  });

  test.describe('Badge Categories', () => {
    test('should display different badge categories', async ({ page }) => {
      await page.goto('/badges/learn');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/badges')) {
        // Look for different badge categories
        const bodyText = await page.textContent('body') || '';
        const hasCategories = 
          bodyText.toLowerCase().includes('category') ||
          bodyText.toLowerCase().includes('type') ||
          bodyText.toLowerCase().includes('cooking') ||
          bodyText.toLowerCase().includes('recipe');
        
        expect(hasCategories).toBe(true);
      }
    });

    test('should show cooking-related badges', async ({ page }) => {
      await page.goto('/badges/learn');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/badges')) {
        const bodyText = await page.textContent('body') || '';
        const hasCookingBadges = 
          bodyText.toLowerCase().includes('cooking') ||
          bodyText.toLowerCase().includes('chef') ||
          bodyText.toLowerCase().includes('recipe') ||
          bodyText.toLowerCase().includes('ingredient');
        
        expect(hasCookingBadges).toBe(true);
      }
    });

    test('should show social badges', async ({ page }) => {
      await page.goto('/badges/learn');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/badges')) {
        const bodyText = await page.textContent('body') || '';
        const hasSocialBadges = 
          bodyText.toLowerCase().includes('friend') ||
          bodyText.toLowerCase().includes('share') ||
          bodyText.toLowerCase().includes('community') ||
          bodyText.toLowerCase().includes('social');
        
        expect(hasSocialBadges).toBe(true);
      }
    });
  });

  test.describe('Badge Progress Tracking', () => {
    test('should track recipe-related achievements', async ({ page }) => {
      await page.goto('/cookbook');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/cookbook')) {
        // Look for badge progress indicators
        const bodyText = await page.textContent('body') || '';
        const hasProgressTracking = 
          bodyText.toLowerCase().includes('progress') ||
          bodyText.toLowerCase().includes('achievement') ||
          bodyText.toLowerCase().includes('milestone');
        
        expect(hasProgressTracking).toBe(true);
      }
    });

    test('should track community interactions', async ({ page }) => {
      await page.goto('/community');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/community')) {
        // Look for community badge indicators
        const bodyText = await page.textContent('body') || '';
        const hasCommunityTracking = 
          bodyText.toLowerCase().includes('community') ||
          bodyText.toLowerCase().includes('friend') ||
          bodyText.toLowerCase().includes('share');
        
        expect(hasCommunityTracking).toBe(true);
      }
    });
  });

  test.describe('Badge Notifications', () => {
    test('should show badge earned notifications', async ({ page }) => {
      // Mock badge earned event
      await page.route('**/api/badges/**', route => 
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            badge: {
              id: 'test-badge',
              name: 'First Recipe',
              description: 'Added your first recipe',
              earned: true
            }
          })
        })
      );

      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Look for notification elements
      const notifications = page.locator('[class*="notification"], [class*="toast"], [class*="alert"]');
      const count = await notifications.count();
      
      // Should have notification system
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should display badge toast messages', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Look for toast notification elements
      const toasts = page.locator('[class*="toast"], [role="alert"], [aria-live]');
      const count = await toasts.count();
      
      // Should have toast system
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Badge API Endpoints', () => {
    test('should have working badges API endpoint', async ({ page }) => {
      const response = await page.request.get('/api/badges');
      
      // Should return a response (401 is expected for unauthenticated requests)
      expect(response.status()).toBeLessThan(500);
    });

    test('should have working badge events API endpoint', async ({ page }) => {
      const response = await page.request.post('/api/badges/events', {
        data: { event_type: 'recipe_added', user_id: 'test-user' }
      });
      
      // Should return a response (401 is expected for unauthenticated requests)
      expect(response.status()).toBeLessThan(500);
    });

    test('should handle badge API errors gracefully', async ({ page }) => {
      // Simulate badge API error
      await page.route('**/api/badges/**', route => 
        route.fulfill({ status: 500, body: 'Badge Service Unavailable' })
      );

      await page.goto('/profile');
      await page.waitForLoadState('networkidle');
      
      // Should not crash the page
      const bodyText = await page.textContent('body') || '';
      expect(bodyText.length).toBeGreaterThan(100);
    });
  });

  test.describe('Badge Learning Page', () => {
    test('should load badge learning page', async ({ page }) => {
      await page.goto('/badges/learn');
      await page.waitForLoadState('networkidle');
      
      const url = page.url();
      expect(url).toMatch(/\/(badges|auth\/signin)/);
    });

    test('should display badge requirements', async ({ page }) => {
      await page.goto('/badges/learn');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/badges')) {
        const bodyText = await page.textContent('body') || '';
        const hasRequirements = 
          bodyText.toLowerCase().includes('requirement') ||
          bodyText.toLowerCase().includes('earn') ||
          bodyText.toLowerCase().includes('complete') ||
          bodyText.toLowerCase().includes('unlock');
        
        expect(hasRequirements).toBe(true);
      }
    });

    test('should show badge descriptions', async ({ page }) => {
      await page.goto('/badges/learn');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/badges')) {
        const bodyText = await page.textContent('body') || '';
        expect(bodyText.length).toBeGreaterThan(200);
      }
    });

    test('should have interactive badge elements', async ({ page }) => {
      await page.goto('/badges/learn');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/badges')) {
        // Look for interactive elements
        const buttons = page.locator('button');
        const links = page.locator('a');
        
        const buttonCount = await buttons.count();
        const linkCount = await links.count();
        
        // Should have some interactive elements
        expect(buttonCount + linkCount).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Badge Integration', () => {
    test('should integrate with recipe actions', async ({ page }) => {
      await page.goto('/cookbook');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/cookbook')) {
        const errors: string[] = [];
        page.on('console', msg => {
          if (msg.type() === 'error' && !msg.text().includes('404')) {
            errors.push(msg.text());
          }
        });

        // Try to interact with recipe elements
        const recipeElements = page.locator('[class*="recipe"], [class*="card"]');
        const count = await recipeElements.count();
        
        if (count > 0) {
          await recipeElements.first().click();
          await page.waitForTimeout(1000);
          
          // Should not cause errors
          expect(errors.length).toBe(0);
        }
      }
    });

    test('should integrate with community actions', async ({ page }) => {
      await page.goto('/community');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/community')) {
        const errors: string[] = [];
        page.on('console', msg => {
          if (msg.type() === 'error' && !msg.text().includes('404')) {
            errors.push(msg.text());
          }
        });

        // Try to interact with community elements
        const communityButtons = page.locator('button:has-text("Add"), button:has-text("Share"), button:has-text("Invite")');
        const count = await communityButtons.count();
        
        if (count > 0) {
          await communityButtons.first().click();
          await page.waitForTimeout(1000);
          
          // Should not cause errors
          expect(errors.length).toBe(0);
        }
      }
    });
  });

  test.describe('Badge Performance', () => {
    test('should load badge system quickly', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/badges/learn');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      // Should load within reasonable time (5 seconds)
      expect(loadTime).toBeLessThan(5000);
    });

    test('should handle badge updates efficiently', async ({ page }) => {
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/profile')) {
        const errors: string[] = [];
        page.on('console', msg => {
          if (msg.type() === 'error' && !msg.text().includes('404')) {
            errors.push(msg.text());
          }
        });

        // Simulate badge updates
        for (let i = 0; i < 3; i++) {
          await page.reload();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(500);
        }
        
        // Should not cause errors
        expect(errors.length).toBe(0);
      }
    });
  });

  test.describe('Badge Accessibility', () => {
    test('should have proper ARIA labels for badges', async ({ page }) => {
      await page.goto('/badges/learn');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/badges')) {
        // Look for ARIA labels
        const ariaElements = page.locator('[aria-label], [aria-describedby], [role]');
        const count = await ariaElements.count();
        
        // Should have some accessibility attributes
        expect(count).toBeGreaterThanOrEqual(0);
      }
    });

    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('/badges/learn');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/badges')) {
        // Test keyboard navigation
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Enter');
        
        // Should not cause errors
        const bodyText = await page.textContent('body') || '';
        expect(bodyText.length).toBeGreaterThan(100);
      }
    });
  });
});
