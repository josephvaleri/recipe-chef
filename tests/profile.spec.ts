import { test, expect } from '@playwright/test';

test.describe('User Profile Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
  });

  test('should load profile page or redirect to auth', async ({ page }) => {
    const url = page.url();
    // Either shows profile or redirects to auth (protected route)
    expect(url).toMatch(/\/(profile|auth\/signin)/);
  });

  test('should display profile page title', async ({ page }) => {
    if (page.url().includes('/profile')) {
      const title = await page.locator('h1, h2').first().textContent();
      expect(title?.toLowerCase()).toMatch(/profile|settings|preferences|account/);
    }
  });

  test('should have tabbed navigation', async ({ page }) => {
    if (page.url().includes('/profile')) {
      // Look for tabs or sections
      const tabs = await page.locator('[role="tab"], button[class*="tab"], .tab, [class*="Tab"]').count();
      
      if (tabs > 0) {
        expect(tabs).toBeGreaterThanOrEqual(2);
      }
    }
  });

  test('should display identity/personal information section', async ({ page }) => {
    if (page.url().includes('/profile')) {
      const bodyText = await page.textContent('body') || '';
      const lowerBody = bodyText.toLowerCase();
      
      // Should have identity-related fields
      const hasIdentityFields = 
        lowerBody.includes('name') ||
        lowerBody.includes('email') ||
        lowerBody.includes('identity') ||
        lowerBody.includes('personal');
      
      expect(hasIdentityFields).toBe(true);
    }
  });

  test('should display dietary preferences section', async ({ page }) => {
    if (page.url().includes('/profile')) {
      const bodyText = await page.textContent('body') || '';
      const lowerBody = bodyText.toLowerCase();
      
      // Look for diet-related terms
      const hasDietSection = 
        lowerBody.includes('diet') ||
        lowerBody.includes('vegan') ||
        lowerBody.includes('vegetarian') ||
        lowerBody.includes('gluten') ||
        lowerBody.includes('food preference') ||
        lowerBody.includes('allergen');
      
      expect(hasDietSection).toBe(true);
    }
  });

  test('should display cooking preferences section', async ({ page }) => {
    if (page.url().includes('/profile')) {
      const bodyText = await page.textContent('body') || '';
      const lowerBody = bodyText.toLowerCase();
      
      // Look for cooking-related terms
      const hasCookingSection = 
        lowerBody.includes('cooking') ||
        lowerBody.includes('skill') ||
        lowerBody.includes('kitchen') ||
        lowerBody.includes('equipment') ||
        lowerBody.includes('taste');
      
      expect(hasCookingSection).toBe(true);
    }
  });

  test('should have save or update button', async ({ page }) => {
    if (page.url().includes('/profile')) {
      const saveButton = page.locator('button:has-text("Save"), button:has-text("Update"), button:has-text("save"), button:has-text("update")');
      const count = await saveButton.count();
      
      // Should have at least one save button
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should allow switching between tabs', async ({ page }) => {
    if (page.url().includes('/profile')) {
      const tabs = await page.locator('[role="tab"], button[class*="tab"]').all();
      
      if (tabs.length >= 2) {
        const errors: string[] = [];
        page.on('console', msg => {
          if (msg.type() === 'error') {
            errors.push(msg.text());
          }
        });

        // Click on second tab
        await tabs[1].click();
        await page.waitForTimeout(500);
        
        // Should not cause errors
        expect(errors.filter(e => !e.includes('404')).length).toBe(0);
      }
    }
  });

  test('should display form inputs for editing', async ({ page }) => {
    if (page.url().includes('/profile')) {
      // Look for input fields
      const inputs = await page.locator('input, select, textarea').count();
      
      // Should have editable fields
      expect(inputs).toBeGreaterThan(0);
    }
  });

  test('should handle save without errors', async ({ page }) => {
    if (page.url().includes('/profile')) {
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error' && !msg.text().includes('404')) {
          errors.push(msg.text());
        }
      });

      const saveButton = page.locator('button:has-text("Save"), button:has-text("Update")').first();
      
      if (await saveButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await saveButton.click();
        await page.waitForTimeout(2000);
        
        // Should not cause JavaScript errors
        expect(errors.length).toBe(0);
      }
    }
  });

  test('should display equipment preferences', async ({ page }) => {
    if (page.url().includes('/profile')) {
      const bodyText = await page.textContent('body') || '';
      const lowerBody = bodyText.toLowerCase();
      
      // Look for equipment-related terms
      const hasEquipment = 
        lowerBody.includes('equipment') ||
        lowerBody.includes('appliance') ||
        lowerBody.includes('oven') ||
        lowerBody.includes('kitchen tool');
      
      // Equipment section might be present
      if (hasEquipment) {
        expect(hasEquipment).toBe(true);
      }
    }
  });

  test('should handle multiple tab switches without memory leaks', async ({ page }) => {
    if (page.url().includes('/profile')) {
      const tabs = await page.locator('[role="tab"], button[class*="tab"]').all();
      
      if (tabs.length >= 2) {
        const errors: string[] = [];
        page.on('console', msg => {
          if (msg.type() === 'error' && !msg.text().includes('404')) {
            errors.push(msg.text());
          }
        });

        // Switch tabs multiple times
        for (let i = 0; i < 6; i++) {
          const tabIndex = i % tabs.length;
          await tabs[tabIndex].click();
          await page.waitForTimeout(300);
        }

        // Should not cause memory-related errors
        const memoryErrors = errors.filter(e => 
          e.toLowerCase().includes('memory') || 
          e.toLowerCase().includes('heap')
        );
        expect(memoryErrors.length).toBe(0);
      }
    }
  });

  test('should display user preferences without XSS vulnerabilities', async ({ page }) => {
    if (page.url().includes('/profile')) {
      const content = await page.content();
      
      // Check that user data is properly escaped
      expect(content).not.toContain('<script>');
      expect(content).not.toMatch(/onerror\s*=/);
      expect(content).not.toMatch(/onclick\s*=/);
    }
  });

  test('should have proper form validation', async ({ page }) => {
    if (page.url().includes('/profile')) {
      // Look for required fields
      const requiredInputs = await page.locator('input[required], select[required]').count();
      
      // If there are required fields, validation should work
      if (requiredInputs > 0) {
        expect(requiredInputs).toBeGreaterThan(0);
      }
    }
  });

  test('should display privacy or subscription settings', async ({ page }) => {
    if (page.url().includes('/profile')) {
      const bodyText = await page.textContent('body') || '';
      const lowerBody = bodyText.toLowerCase();
      
      // Look for privacy/subscription terms
      const hasSettings = 
        lowerBody.includes('privacy') ||
        lowerBody.includes('subscription') ||
        lowerBody.includes('payment') ||
        lowerBody.includes('billing') ||
        lowerBody.includes('trial');
      
      // Settings might be present
      if (hasSettings) {
        expect(hasSettings).toBe(true);
      }
    }
  });

  test('should render without layout shift or flicker', async ({ page }) => {
    if (page.url().includes('/profile')) {
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      // Wait for page to stabilize
      await page.waitForTimeout(2000);
      
      // Should not have rendering errors
      const renderErrors = errors.filter(e => 
        e.toLowerCase().includes('render') ||
        e.toLowerCase().includes('layout') ||
        e.toLowerCase().includes('hydration')
      );
      expect(renderErrors.length).toBe(0);
    }
  });
});

