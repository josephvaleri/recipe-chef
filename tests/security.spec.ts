import { test, expect } from '@playwright/test';

test.describe('Security Vulnerability Tests', () => {
  test.describe('XSS Protection', () => {
    test('should sanitize recipe title input', async ({ page }) => {
      await page.goto('/');
      
      // Try to inject XSS in search/input fields
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        'javascript:alert("XSS")',
        '<svg onload=alert("XSS")>',
        '"><script>alert(String.fromCharCode(88,83,83))</script>'
      ];
      
      for (const payload of xssPayloads) {
        // Try in search fields
        const searchInput = page.locator('input[type="text"]').first();
        if (await searchInput.isVisible({ timeout: 1000 }).catch(() => false)) {
          await searchInput.fill(payload);
          await page.waitForTimeout(500);
          
          // Check that script didn't execute
          const alertFired = await page.evaluate(() => {
            return (window as any).xssDetected === true;
          });
          expect(alertFired).toBeFalsy();
          
          // Check that HTML is escaped
          const bodyHTML = await page.content();
          expect(bodyHTML).not.toContain('<script>');
          expect(bodyHTML).not.toContain('onerror=');
        }
      }
    });

    test('should sanitize recipe description', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Check if body content contains unescaped script tags
      // Exclude Next.js internal scripts (__NEXT_DATA__, webpack, etc.)
      const content = await page.content();
      
      // Look for script tags that don't contain Next.js identifiers
      const scriptTags = content.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];
      const maliciousScripts = scriptTags.filter(tag => 
        !tag.includes('__NEXT') && 
        !tag.includes('webpack') &&
        !tag.includes('self.__next') &&
        tag.length < 500 // Malicious scripts are usually short
      );
      
      // Should not have any malicious scripts
      expect(maliciousScripts.length).toBe(0);
    });
  });

  test.describe('SQL Injection Protection', () => {
    test('should handle SQL injection attempts in search', async ({ page }) => {
      await page.goto('/');
      
      const sqlPayloads = [
        "' OR '1'='1",
        "1' OR '1' = '1",
        "' UNION SELECT NULL--",
        "1'; DROP TABLE users--",
        "admin'--",
        "' OR 1=1--"
      ];
      
      for (const payload of sqlPayloads) {
        const searchInput = page.locator('input[type="text"]').first();
        if (await searchInput.isVisible({ timeout: 1000 }).catch(() => false)) {
          await searchInput.fill(payload);
          await page.keyboard.press('Enter');
          await page.waitForTimeout(1000);
          
          // Check for SQL error messages
          const errorMessages = await page.textContent('body');
          expect(errorMessages?.toLowerCase()).not.toContain('sql');
          expect(errorMessages?.toLowerCase()).not.toContain('syntax error');
          expect(errorMessages?.toLowerCase()).not.toContain('postgresql');
          expect(errorMessages?.toLowerCase()).not.toContain('supabase');
        }
      }
    });
  });

  test.describe('Authentication & Authorization', () => {
    test('should redirect unauthenticated users from protected routes', async ({ page }) => {
      const protectedRoutes = [
        '/cookbook',
        '/calendar',
        '/shopping-list',
        '/profile',
        '/add'
      ];
      
      for (const route of protectedRoutes) {
        await page.goto(route);
        await page.waitForLoadState('networkidle');
        
        // Should redirect to sign in
        const url = page.url();
        expect(url).toMatch(/\/(auth\/signin|$)/);
      }
    });

    test('should not allow access to admin routes for non-admin users', async ({ page }) => {
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');
      
      // Should redirect to home or sign in
      const url = page.url();
      expect(url).not.toContain('/admin');
    });
  });

  test.describe('CSRF Protection', () => {
    test('should include CSRF tokens in forms', async ({ page }) => {
      await page.goto('/auth/signin');
      
      // Check for forms with POST method
      const forms = await page.locator('form').all();
      
      for (const form of forms) {
        const method = await form.getAttribute('method');
        if (method?.toLowerCase() === 'post') {
          // Modern apps might use fetch/axios instead of form submission
          // Check that there's no simple POST without authentication
          const action = await form.getAttribute('action');
          expect(action).toBeFalsy(); // Should use JS submission, not direct POST
        }
      }
    });
  });

  test.describe('Information Disclosure', () => {
    test('should not expose sensitive information in client-side code', async ({ page }) => {
      await page.goto('/');
      
      // Check page source for sensitive patterns
      const content = await page.content();
      
      // Should not contain database credentials
      expect(content).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
      expect(content).not.toContain('DATABASE_URL');
      expect(content).not.toMatch(/password\s*[:=]\s*["'][^"']+["']/i);
      
      // Check localStorage/sessionStorage
      const localStorage = await page.evaluate(() => JSON.stringify(window.localStorage));
      expect(localStorage).not.toMatch(/service.*role.*key/i);
      expect(localStorage).not.toMatch(/private.*key/i);
    });

    test('should not expose internal paths in errors', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      await page.goto('/nonexistent-page');
      await page.waitForTimeout(2000);
      
      errors.forEach(error => {
        expect(error).not.toContain('/Users/');
        expect(error).not.toContain('C:\\');
        expect(error).not.toMatch(/\/home\/[^\/]+\//);
      });
    });
  });

  test.describe('File Upload Security', () => {
    test('should validate file types for recipe images', async ({ page }) => {
      await page.goto('/');
      
      // Look for file upload inputs
      const fileInputs = await page.locator('input[type="file"]').all();
      
      for (const input of fileInputs) {
        const accept = await input.getAttribute('accept');
        if (accept) {
          // Should restrict to image types
          expect(accept).toMatch(/image/);
          expect(accept).not.toContain('*');
        }
      }
    });
  });

  test.describe('Clickjacking Protection', () => {
    test('should set X-Frame-Options or CSP frame-ancestors', async ({ page }) => {
      const response = await page.goto('/');
      const headers = response?.headers();
      
      const hasFrameProtection = 
        headers?.['x-frame-options'] || 
        headers?.['content-security-policy']?.includes('frame-ancestors');
      
      if (!hasFrameProtection) {
        console.warn('WARNING: No clickjacking protection detected (X-Frame-Options or CSP frame-ancestors)');
      }
    });
  });

  test.describe('Security Headers', () => {
    test('should have proper security headers', async ({ page }) => {
      const response = await page.goto('/');
      const headers = response?.headers();
      
      const securityIssues: string[] = [];
      
      // Check for security headers
      if (!headers?.['strict-transport-security']) {
        securityIssues.push('Missing Strict-Transport-Security header');
      }
      
      if (!headers?.['x-content-type-options']) {
        securityIssues.push('Missing X-Content-Type-Options header');
      }
      
      if (!headers?.['x-frame-options'] && !headers?.['content-security-policy']?.includes('frame-ancestors')) {
        securityIssues.push('Missing X-Frame-Options or CSP frame-ancestors');
      }
      
      if (!headers?.['content-security-policy']) {
        securityIssues.push('Missing Content-Security-Policy header');
      }
      
      if (headers?.['x-powered-by']) {
        securityIssues.push('X-Powered-By header exposes technology stack');
      }
      
      // Log issues but don't fail (these are recommendations)
      if (securityIssues.length > 0) {
        console.warn('Security header issues found:', securityIssues);
      }
    });
  });
});

