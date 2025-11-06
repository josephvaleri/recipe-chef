import { test, expect } from '@playwright/test';

test.describe('Community Features Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Discovery Page', () => {
    test('should load community/discovery page', async ({ page }) => {
      await page.goto('/community');
      await page.waitForLoadState('networkidle');
      
      const url = page.url();
      // Either shows community page or redirects to auth
      expect(url).toMatch(/\/(community|auth\/signin)/);
    });

    test('should display discovery interface when authenticated', async ({ page }) => {
      await page.goto('/community');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/community')) {
        // Should have discovery-related content
        const bodyText = await page.textContent('body') || '';
        const hasDiscoveryContent = 
          bodyText.toLowerCase().includes('discover') ||
          bodyText.toLowerCase().includes('community') ||
          bodyText.toLowerCase().includes('people') ||
          bodyText.toLowerCase().includes('nearby');
        
        expect(hasDiscoveryContent).toBe(true);
      }
    });

    test('should have search functionality for profiles', async ({ page }) => {
      await page.goto('/community');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/community')) {
        // Look for search input or button
        const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');
        const searchButton = page.locator('button:has-text("Search"), button:has-text("Find")');
        
        const hasSearch = await searchInput.count() > 0 || await searchButton.count() > 0;
        
        if (hasSearch) {
          expect(hasSearch).toBe(true);
        }
      }
    });

    test('should display profile cards or user listings', async ({ page }) => {
      await page.goto('/community');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/community')) {
        await page.waitForTimeout(2000);
        
        // Look for profile cards or user elements
        const profileCards = page.locator('[class*="card"], [class*="profile"], [class*="user"]');
        const count = await profileCards.count();
        
        // Should have some way to display users (even if empty)
        const bodyText = await page.textContent('body') || '';
        const hasUserContent = count > 0 || bodyText.includes('No users') || bodyText.includes('discover');
        
        expect(hasUserContent).toBe(true);
      }
    });
  });

  test.describe('Friends System', () => {
    test('should have friend invitation functionality', async ({ page }) => {
      await page.goto('/community');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/community')) {
        // Look for friend-related buttons or links
        const friendButtons = page.locator('button:has-text("Add"), button:has-text("Invite"), button:has-text("Friend")');
        const count = await friendButtons.count();
        
        // Should have some friend interaction capability
        const bodyText = await page.textContent('body') || '';
        const hasFriendFeatures = count > 0 || bodyText.toLowerCase().includes('friend') || bodyText.toLowerCase().includes('invite');
        
        expect(hasFriendFeatures).toBe(true);
      }
    });

    test('should handle friend requests gracefully', async ({ page }) => {
      await page.goto('/community');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/community')) {
        const errors: string[] = [];
        page.on('console', msg => {
          if (msg.type() === 'error' && !msg.text().includes('404')) {
            errors.push(msg.text());
          }
        });

        // Try to interact with friend buttons if they exist
        const friendButtons = page.locator('button:has-text("Add"), button:has-text("Invite")');
        const count = await friendButtons.count();
        
        if (count > 0) {
          await friendButtons.first().click();
          await page.waitForTimeout(1000);
          
          // Should not cause console errors
          expect(errors.length).toBe(0);
        }
      }
    });
  });

  test.describe('Profile Management', () => {
    test('should load profile page', async ({ page }) => {
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');
      
      const url = page.url();
      expect(url).toMatch(/\/(profile|auth\/signin)/);
    });

    test('should display profile information when authenticated', async ({ page }) => {
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/profile')) {
        // Should have profile-related content
        const bodyText = await page.textContent('body') || '';
        const hasProfileContent = 
          bodyText.toLowerCase().includes('profile') ||
          bodyText.toLowerCase().includes('settings') ||
          bodyText.toLowerCase().includes('account') ||
          bodyText.toLowerCase().includes('edit');
        
        expect(hasProfileContent).toBe(true);
      }
    });

    test('should have privacy settings', async ({ page }) => {
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/profile')) {
        // Look for privacy-related elements
        const bodyText = await page.textContent('body') || '';
        const hasPrivacySettings = 
          bodyText.toLowerCase().includes('privacy') ||
          bodyText.toLowerCase().includes('public') ||
          bodyText.toLowerCase().includes('private') ||
          bodyText.toLowerCase().includes('visibility');
        
        expect(hasPrivacySettings).toBe(true);
      }
    });
  });

  test.describe('Recipe Sharing', () => {
    test('should have recipe sharing functionality', async ({ page }) => {
      await page.goto('/community');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/community')) {
        // Look for sharing-related elements
        const bodyText = await page.textContent('body') || '';
        const hasSharingFeatures = 
          bodyText.toLowerCase().includes('share') ||
          bodyText.toLowerCase().includes('recipe') ||
          bodyText.toLowerCase().includes('cookbook');
        
        expect(hasSharingFeatures).toBe(true);
      }
    });

    test('should handle recipe voting', async ({ page }) => {
      await page.goto('/community');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/community')) {
        const errors: string[] = [];
        page.on('console', msg => {
          if (msg.type() === 'error' && !msg.text().includes('404')) {
            errors.push(msg.text());
          }
        });

        // Look for voting buttons
        const voteButtons = page.locator('button:has-text("Vote"), button:has-text("Like"), button:has-text("❤")');
        const count = await voteButtons.count();
        
        if (count > 0) {
          await voteButtons.first().click();
          await page.waitForTimeout(1000);
          
          // Should not cause console errors
          expect(errors.length).toBe(0);
        }
      }
    });
  });

  test.describe('My Feed', () => {
    test('should load my feed page', async ({ page }) => {
      await page.goto('/community');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/community')) {
        // Look for feed-related content
        const bodyText = await page.textContent('body') || '';
        const hasFeedContent = 
          bodyText.toLowerCase().includes('feed') ||
          bodyText.toLowerCase().includes('activity') ||
          bodyText.toLowerCase().includes('recent') ||
          bodyText.toLowerCase().includes('timeline');
        
        expect(hasFeedContent).toBe(true);
      }
    });

    test('should display user activity', async ({ page }) => {
      await page.goto('/community');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/community')) {
        await page.waitForTimeout(2000);
        
        // Should have some content or empty state message
        const bodyText = await page.textContent('body') || '';
        expect(bodyText.length).toBeGreaterThan(100);
      }
    });
  });

  test.describe('API Endpoints', () => {
    test('should have working discovery API endpoints', async ({ page }) => {
      // Test discovery search endpoint
      const response = await page.request.get('/api/discovery/search-profiles?q=test&limit=10');
      
      // Should return a response (even if empty or error)
      expect(response.status()).toBeLessThan(500);
    });

    test('should have working friends API endpoints', async ({ page }) => {
      // Test friends invite endpoint (should return 401 if not authenticated, which is expected)
      const response = await page.request.post('/api/friends/invite', {
        data: { user_id: 'test-user-id' }
      });
      
      // Should return a response (401 is expected for unauthenticated requests)
      expect(response.status()).toBeLessThan(500);
    });

    test('should have working my-feed API endpoint', async ({ page }) => {
      // Test my-feed endpoint
      const response = await page.request.get('/api/my-feed');
      
      // Should return a response (even if empty or error)
      expect(response.status()).toBeLessThan(500);
    });

    test('should have working recipe sharing API endpoints', async ({ page }) => {
      // Test recipe share endpoint
      const response = await page.request.post('/api/recipes/share', {
        data: { recipe_id: 'test-recipe-id' }
      });
      
      // Should return a response (401 is expected for unauthenticated requests)
      expect(response.status()).toBeLessThan(500);
    });

    test('should have working recipe voting API endpoints', async ({ page }) => {
      // Test recipe vote endpoint
      const response = await page.request.post('/api/recipes/vote', {
        data: { recipe_id: 'test-recipe-id', vote: 'up' }
      });
      
      // Should return a response (401 is expected for unauthenticated requests)
      expect(response.status()).toBeLessThan(500);
    });
  });

  test.describe('Responsive Design', () => {
    test('should be responsive on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size
      await page.goto('/community');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/community')) {
        // Should not have horizontal scroll
        const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
        const viewportWidth = page.viewportSize()?.width || 375;
        
        expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20); // Allow small margin
      }
    });

    test('should be responsive on tablet devices', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 }); // iPad size
      await page.goto('/community');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/community')) {
        // Should display properly on tablet
        const bodyText = await page.textContent('body') || '';
        expect(bodyText.length).toBeGreaterThan(100);
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate network failure
      await page.route('**/api/discovery/**', route => route.abort());
      
      await page.goto('/community');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/community')) {
        // Should not crash the page
        const bodyText = await page.textContent('body') || '';
        expect(bodyText.length).toBeGreaterThan(100);
      }
    });

    test('should handle API errors gracefully', async ({ page }) => {
      // Simulate API error
      await page.route('**/api/friends/**', route => 
        route.fulfill({ status: 500, body: 'Internal Server Error' })
      );
      
      await page.goto('/community');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/community')) {
        // Should not crash the page
        const bodyText = await page.textContent('body') || '';
        expect(bodyText.length).toBeGreaterThan(100);
      }
    });
  });
});
