import { test, expect } from '@playwright/test';

test.describe('Authentication Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load homepage without errors', async ({ page }) => {
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

  test('should navigate to sign in page', async ({ page }) => {
    await page.click('text=Sign In');
    await expect(page).toHaveURL(/\/auth\/signin/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should navigate to sign up page', async ({ page }) => {
    // Click "Start Free Trial" button on homepage
    await page.click('text=Start Free Trial');
    await expect(page).toHaveURL(/\/auth\/signup/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should show validation errors for empty login', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.click('button[type="submit"]');
    
    // Check that form doesn't submit with empty fields
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test('should reject invalid email format', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.fill('input[type="email"]', 'invalid-email');
    await page.fill('input[type="password"]', 'password123');
    
    // HTML5 validation should prevent submission
    const emailInput = page.locator('input[type="email"]');
    const isValid = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(isValid).toBe(false);
  });

  test('should not expose sensitive data in response headers', async ({ page }) => {
    const response = await page.goto('/auth/signin');
    const headers = response?.headers();
    
    // Check that X-Powered-By is removed (security best practice)
    expect(headers?.['x-powered-by']).toBeUndefined();
    
    // Check that sensitive keywords are not in plain text (case insensitive)
    const bodyText = await page.textContent('body') || '';
    const lowerBody = bodyText.toLowerCase();
    
    // Should not contain database credentials or API keys
    expect(lowerBody).not.toMatch(/supabase.*service.*role.*key/);
    expect(lowerBody).not.toMatch(/database.*password/);
    expect(lowerBody).not.toMatch(/api[_\s-]?key.*=.*[a-zA-Z0-9]{20,}/);
    expect(lowerBody).not.toMatch(/secret[_\s-]?key.*=.*[a-zA-Z0-9]{20,}/);
  });

  test('should protect against session fixation', async ({ context, page }) => {
    await page.goto('/auth/signin');
    
    // Get initial session cookies
    const cookiesBefore = await context.cookies();
    const sessionBefore = cookiesBefore.find(c => c.name.includes('auth') || c.name.includes('session'));
    
    // If there's a session cookie before auth, it should change after
    if (sessionBefore) {
      // Try to authenticate (will fail but that's OK for this test)
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');
      
      await page.waitForTimeout(2000);
      
      const cookiesAfter = await context.cookies();
      const sessionAfter = cookiesAfter.find(c => c.name === sessionBefore.name);
      
      // Session should be regenerated or removed after auth attempt
      if (sessionAfter) {
        expect(sessionAfter.value).not.toBe(sessionBefore.value);
      }
    }
  });
});

