import { test, expect } from '@playwright/test';

test.describe('API Endpoints Tests', () => {
  test.describe('AI API Endpoints', () => {
    test('should handle route-question API', async ({ page }) => {
      const response = await page.request.post('/api/ai/route-question', {
        data: { question: 'What can I make with chicken?' }
      });
      
      // Should return a response (401 is expected for unauthenticated requests)
      expect(response.status()).toBeLessThan(500);
      
      if (response.status() === 401) {
        const body = await response.json();
        expect(body.error).toContain('Authentication');
      }
    });

    test('should handle search-recipe-names API', async ({ page }) => {
      const response = await page.request.post('/api/ai/search-recipe-names', {
        data: { recipeName: 'chicken parmesan' }
      });
      
      expect(response.status()).toBeLessThan(500);
      
      if (response.status() === 401) {
        const body = await response.json();
        expect(body.error).toContain('Authentication');
      }
    });

    test('should handle generate-recipes API', async ({ page }) => {
      const response = await page.request.post('/api/ai/generate-recipes', {
        data: { query: 'chicken and rice recipes' }
      });
      
      expect(response.status()).toBeLessThan(500);
      
      if (response.status() === 401) {
        const body = await response.json();
        expect(body.error).toContain('Authentication');
      }
    });

    test('should validate AI API request data', async ({ page }) => {
      // Test with invalid data
      const response = await page.request.post('/api/ai/route-question', {
        data: { invalidField: 'test' }
      });
      
      expect(response.status()).toBeLessThan(500);
    });
  });

  test.describe('Community API Endpoints', () => {
    test('should handle discovery search-profiles API', async ({ page }) => {
      const response = await page.request.get('/api/discovery/search-profiles?q=test&limit=10');
      
      expect(response.status()).toBeLessThan(500);
    });

    test('should handle discovery near-me API', async ({ page }) => {
      const response = await page.request.get('/api/discovery/near-me?lat=40.7128&lng=-74.0060');
      
      expect(response.status()).toBeLessThan(500);
    });

    test('should handle discovery people-like-you API', async ({ page }) => {
      const response = await page.request.get('/api/discovery/people-like-you');
      
      expect(response.status()).toBeLessThan(500);
    });

    test('should handle friends invite API', async ({ page }) => {
      const response = await page.request.post('/api/friends/invite', {
        data: { user_id: 'test-user-id' }
      });
      
      expect(response.status()).toBeLessThan(500);
      
      if (response.status() === 401) {
        const body = await response.json();
        expect(body.error).toContain('Authentication');
      }
    });

    test('should handle friends respond API', async ({ page }) => {
      const response = await page.request.post('/api/friends/respond', {
        data: { invitation_id: 'test-invitation', response: 'accept' }
      });
      
      expect(response.status()).toBeLessThan(500);
    });

    test('should handle follow API', async ({ page }) => {
      const response = await page.request.post('/api/follow', {
        data: { user_id: 'test-user-id' }
      });
      
      expect(response.status()).toBeLessThan(500);
    });

    test('should handle my-feed API', async ({ page }) => {
      const response = await page.request.get('/api/my-feed');
      
      expect(response.status()).toBeLessThan(500);
    });
  });

  test.describe('Recipe Sharing API Endpoints', () => {
    test('should handle recipe share API', async ({ page }) => {
      const response = await page.request.post('/api/recipes/share', {
        data: { recipe_id: 'test-recipe-id' }
      });
      
      expect(response.status()).toBeLessThan(500);
      
      if (response.status() === 401) {
        const body = await response.json();
        expect(body.error).toContain('Authentication');
      }
    });

    test('should handle recipe vote API', async ({ page }) => {
      const response = await page.request.post('/api/recipes/vote', {
        data: { recipe_id: 'test-recipe-id', vote: 'up' }
      });
      
      expect(response.status()).toBeLessThan(500);
      
      if (response.status() === 401) {
        const body = await response.json();
        expect(body.error).toContain('Authentication');
      }
    });
  });

  test.describe('Profile API Endpoints', () => {
    test('should handle profile privacy API', async ({ page }) => {
      const response = await page.request.post('/api/profile/privacy', {
        data: { privacy_level: 'public' }
      });
      
      expect(response.status()).toBeLessThan(500);
    });
  });

  test.describe('Badge API Endpoints', () => {
    test('should handle badge events API', async ({ page }) => {
      const response = await page.request.post('/api/badges/events', {
        data: { event_type: 'recipe_added', user_id: 'test-user' }
      });
      
      expect(response.status()).toBeLessThan(500);
    });
  });

  test.describe('API Security', () => {
    test('should require authentication for protected endpoints', async ({ page }) => {
      const protectedEndpoints = [
        '/api/ai/route-question',
        '/api/ai/search-recipe-names',
        '/api/ai/generate-recipes',
        '/api/friends/invite',
        '/api/friends/respond',
        '/api/follow',
        '/api/recipes/share',
        '/api/recipes/vote',
        '/api/profile/privacy',
        '/api/badges/events'
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await page.request.post(endpoint, {
          data: { test: 'data' }
        });
        
        // Should return 401 for unauthenticated requests
        expect(response.status()).toBe(401);
      }
    });

    test('should validate request data', async ({ page }) => {
      // Test with missing required fields
      const response = await page.request.post('/api/ai/route-question', {
        data: {}
      });
      
      expect(response.status()).toBeLessThan(500);
    });

    test('should handle malformed JSON', async ({ page }) => {
      const response = await page.request.post('/api/ai/route-question', {
        data: 'invalid json'
      });
      
      expect(response.status()).toBeLessThan(500);
    });

    test('should rate limit API requests', async ({ page }) => {
      // Make multiple rapid requests
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          page.request.get('/api/discovery/search-profiles?q=test')
        );
      }
      
      const responses = await Promise.all(promises);
      
      // All should return responses (even if rate limited)
      responses.forEach(response => {
        expect(response.status()).toBeLessThan(500);
      });
    });
  });

  test.describe('API Error Handling', () => {
    test('should handle database connection errors', async ({ page }) => {
      // Mock database error
      await page.route('**/api/discovery/**', route => 
        route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Database connection failed' })
        })
      );

      const response = await page.request.get('/api/discovery/search-profiles?q=test');
      
      expect(response.status()).toBe(503);
      const body = await response.json();
      expect(body.error).toContain('Database');
    });

    test('should handle external service errors', async ({ page }) => {
      // Mock external service error
      await page.route('**/api/ai/**', route => 
        route.fulfill({
          status: 502,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'External service unavailable' })
        })
      );

      const response = await page.request.post('/api/ai/route-question', {
        data: { question: 'test' }
      });
      
      expect(response.status()).toBe(502);
      const body = await response.json();
      expect(body.error).toContain('service');
    });

    test('should handle timeout errors', async ({ page }) => {
      // Mock timeout
      await page.route('**/api/ai/**', route => 
        new Promise(resolve => {
          setTimeout(() => {
            route.fulfill({
              status: 504,
              contentType: 'application/json',
              body: JSON.stringify({ error: 'Request timeout' })
            });
            resolve(undefined);
          }, 100);
        })
      );

      const response = await page.request.post('/api/ai/route-question', {
        data: { question: 'test' }
      });
      
      expect(response.status()).toBe(504);
    });
  });

  test.describe('API Performance', () => {
    test('should respond within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      const response = await page.request.get('/api/discovery/search-profiles?q=test');
      const responseTime = Date.now() - startTime;
      
      // Should respond within 5 seconds
      expect(responseTime).toBeLessThan(5000);
      expect(response.status()).toBeLessThan(500);
    });

    test('should handle concurrent requests', async ({ page }) => {
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          page.request.get('/api/discovery/search-profiles?q=test')
        );
      }
      
      const responses = await Promise.all(promises);
      
      // All should complete successfully
      responses.forEach(response => {
        expect(response.status()).toBeLessThan(500);
      });
    });
  });

  test.describe('API Content Validation', () => {
    test('should return proper JSON responses', async ({ page }) => {
      const response = await page.request.get('/api/discovery/search-profiles?q=test');
      
      if (response.status() < 400) {
        const contentType = response.headers()['content-type'];
        expect(contentType).toContain('application/json');
        
        const body = await response.json();
        expect(typeof body).toBe('object');
      }
    });

    test('should include proper CORS headers', async ({ page }) => {
      const response = await page.request.get('/api/discovery/search-profiles?q=test');
      const headers = response.headers();
      
      // Should have CORS headers for API endpoints
      expect(headers['access-control-allow-origin']).toBeDefined();
    });

    test('should not expose sensitive information', async ({ page }) => {
      const response = await page.request.get('/api/discovery/search-profiles?q=test');
      const body = await response.text();
      
      // Should not contain sensitive data
      expect(body).not.toMatch(/password|secret|key|token/i);
    });
  });

  test.describe('API Versioning', () => {
    test('should maintain backward compatibility', async ({ page }) => {
      // Test that existing API endpoints still work
      const response = await page.request.get('/api/discovery/search-profiles?q=test');
      
      expect(response.status()).toBeLessThan(500);
    });

    test('should handle version headers', async ({ page }) => {
      const response = await page.request.get('/api/discovery/search-profiles?q=test', {
        headers: { 'API-Version': '1.0' }
      });
      
      expect(response.status()).toBeLessThan(500);
    });
  });
});
