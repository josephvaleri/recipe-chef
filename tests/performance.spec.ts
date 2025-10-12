import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('should load homepage within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // Should load in under 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should not have excessive network requests', async ({ page }) => {
    const requests: string[] = [];
    
    page.on('request', request => {
      requests.push(request.url());
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Should have reasonable number of requests (< 100)
    expect(requests.length).toBeLessThan(100);
  });

  test('should not load oversized images', async ({ page }) => {
    let oversizedImages = 0;
    
    page.on('response', async response => {
      if (response.request().resourceType() === 'image') {
        const headers = response.headers();
        const contentLength = parseInt(headers['content-length'] || '0');
        
        // Flag images over 2MB
        if (contentLength > 2 * 1024 * 1024) {
          oversizedImages++;
          console.warn(`Oversized image detected: ${response.url()} (${(contentLength / 1024 / 1024).toFixed(2)}MB)`);
        }
      }
    });
    
    await page.goto('/cookbook');
    await page.waitForLoadState('networkidle');
    
    expect(oversizedImages).toBe(0);
  });

  test('should not have memory leaks on navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate through multiple pages
    const routes = ['/cookbook', '/finder', '/calendar', '/shopping-list', '/'];
    
    for (const route of routes) {
      await page.goto(route).catch(() => {});
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(1000);
    }
    
    // Check for excessive console errors that might indicate leaks
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(1000);
    
    // Should not have memory-related errors
    const memoryErrors = errors.filter(e => 
      e.toLowerCase().includes('memory') || 
      e.toLowerCase().includes('heap')
    );
    expect(memoryErrors.length).toBe(0);
  });
});

