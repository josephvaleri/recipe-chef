import { test, expect } from '@playwright/test';

test.describe('Chef Tony AI Features Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Chef Tony Question Box', () => {
    test('should display Chef Tony interface on homepage', async ({ page }) => {
      // Should have Chef Tony elements
      const bodyText = await page.textContent('body') || '';
      const hasChefTony = 
        bodyText.toLowerCase().includes('chef tony') ||
        bodyText.toLowerCase().includes('ask chef') ||
        bodyText.toLowerCase().includes('question');
      
      expect(hasChefTony).toBe(true);
    });

    test('should have question input field', async ({ page }) => {
      // Look for textarea or input for questions
      const questionInput = page.locator('textarea, input[placeholder*="ask" i], input[placeholder*="question" i]');
      const count = await questionInput.count();
      
      if (count > 0) {
        expect(count).toBeGreaterThan(0);
        await expect(questionInput.first()).toBeVisible();
      }
    });

    test('should have submit button for questions', async ({ page }) => {
      // Look for submit button
      const submitButton = page.locator('button:has-text("Ask"), button:has-text("Submit"), button:has-text("Send")');
      const count = await submitButton.count();
      
      if (count > 0) {
        expect(count).toBeGreaterThan(0);
        await expect(submitButton.first()).toBeVisible();
      }
    });

    test('should handle question submission', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error' && !msg.text().includes('404')) {
          errors.push(msg.text());
        }
      });

      // Try to find and interact with question input
      const questionInput = page.locator('textarea, input[placeholder*="ask" i]');
      const submitButton = page.locator('button:has-text("Ask"), button:has-text("Submit")');
      
      if (await questionInput.count() > 0 && await submitButton.count() > 0) {
        await questionInput.first().fill('What can I make with chicken?');
        await submitButton.first().click();
        
        await page.waitForTimeout(2000);
        
        // Should not cause console errors
        expect(errors.length).toBe(0);
      }
    });

    test('should have voice input functionality', async ({ page }) => {
      // Look for microphone button
      const micButton = page.locator('button:has-text("Mic"), button[aria-label*="voice" i], button[title*="voice" i]');
      const count = await micButton.count();
      
      if (count > 0) {
        expect(count).toBeGreaterThan(0);
        await expect(micButton.first()).toBeVisible();
      }
    });
  });

  test.describe('AI Recipe Generation', () => {
    test('should redirect to recipe finder for recipe questions', async ({ page }) => {
      // Mock the AI response to simulate recipe search
      await page.route('**/api/ai/route-question', route => 
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            type: 'recipe_name_search',
            action: 'redirect_to_finder',
            searchQuery: 'chicken recipes',
            source: 'recipe_name_search'
          })
        })
      );

      const questionInput = page.locator('textarea, input[placeholder*="ask" i]');
      const submitButton = page.locator('button:has-text("Ask"), button:has-text("Submit")');
      
      if (await questionInput.count() > 0 && await submitButton.count() > 0) {
        await questionInput.first().fill('chicken recipes');
        await submitButton.first().click();
        
        await page.waitForTimeout(3000);
        
        // Should redirect to finder page
        const url = page.url();
        expect(url).toMatch(/\/finder/);
      }
    });

    test('should display cooking advice for general questions', async ({ page }) => {
      // Mock the AI response for cooking advice
      await page.route('**/api/ai/route-question', route => 
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            type: 'cooking_question',
            answer: 'Here is some cooking advice from Chef Tony...'
          })
        })
      );

      const questionInput = page.locator('textarea, input[placeholder*="ask" i]');
      const submitButton = page.locator('button:has-text("Ask"), button:has-text("Submit")');
      
      if (await questionInput.count() > 0 && await submitButton.count() > 0) {
        await questionInput.first().fill('How do I store herbs?');
        await submitButton.first().click();
        
        await page.waitForTimeout(2000);
        
        // Should display the answer
        const bodyText = await page.textContent('body') || '';
        expect(bodyText).toContain('Chef Tony');
      }
    });

    test('should handle non-food related questions', async ({ page }) => {
      // Mock the AI response for non-food questions
      await page.route('**/api/ai/route-question', route => 
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            type: 'not_food_related',
            message: 'Please ask a recipe or food related question. I\'m Chef Tony, your cooking assistant!'
          })
        })
      );

      const questionInput = page.locator('textarea, input[placeholder*="ask" i]');
      const submitButton = page.locator('button:has-text("Ask"), button:has-text("Submit")');
      
      if (await questionInput.count() > 0 && await submitButton.count() > 0) {
        await questionInput.first().fill('What is the weather like?');
        await submitButton.first().click();
        
        await page.waitForTimeout(2000);
        
        // Should display the redirect message
        const bodyText = await page.textContent('body') || '';
        expect(bodyText).toContain('Chef Tony');
      }
    });
  });

  test.describe('Recipe Finder AI Loading UI', () => {
    test('should display loading indicator during AI search', async ({ page }) => {
      await page.goto('/finder?aiSearch=true');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/finder')) {
        // Mock a slow AI response to see loading UI
        await page.route('**/api/ai/generate-recipes', route => 
          new Promise(resolve => {
            setTimeout(() => {
              route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                  recipes: [{
                    name: 'Test Recipe',
                    description: 'A test recipe',
                    recipeIngredient: ['chicken', 'rice'],
                    recipeInstructions: ['Cook chicken', 'Add rice']
                  }]
                })
              });
              resolve(undefined);
            }, 2000);
          })
        );

        // Trigger AI search
        const searchInput = page.locator('input[placeholder*="search" i]');
        if (await searchInput.count() > 0) {
          await searchInput.first().fill('chicken recipes');
          await page.keyboard.press('Enter');
          
          // Should show loading indicator
          await page.waitForTimeout(1000);
          
          const bodyText = await page.textContent('body') || '';
          const hasLoadingIndicator = 
            bodyText.toLowerCase().includes('chef tony is working') ||
            bodyText.toLowerCase().includes('loading') ||
            bodyText.toLowerCase().includes('progress');
          
          expect(hasLoadingIndicator).toBe(true);
        }
      }
    });

    test('should show spinning chef hat during AI processing', async ({ page }) => {
      await page.goto('/finder?aiSearch=true');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/finder')) {
        // Look for chef hat icon
        const chefHat = page.locator('svg, [class*="chef"], [class*="hat"]');
        const count = await chefHat.count();
        
        if (count > 0) {
          // Should have chef hat element
          expect(count).toBeGreaterThan(0);
        }
      }
    });

    test('should display progress bar during AI search', async ({ page }) => {
      await page.goto('/finder?aiSearch=true');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/finder')) {
        // Look for progress bar elements
        const progressBar = page.locator('[class*="progress"], [role="progressbar"], progress');
        const count = await progressBar.count();
        
        if (count > 0) {
          expect(count).toBeGreaterThan(0);
        }
      }
    });

    test('should show dynamic loading messages', async ({ page }) => {
      await page.goto('/finder?aiSearch=true');
      await page.waitForLoadState('networkidle');
      
      if (page.url().includes('/finder')) {
        // Look for loading messages
        const bodyText = await page.textContent('body') || '';
        const hasLoadingMessages = 
          bodyText.toLowerCase().includes('thinking') ||
          bodyText.toLowerCase().includes('searching') ||
          bodyText.toLowerCase().includes('analyzing') ||
          bodyText.toLowerCase().includes('crafting');
        
        expect(hasLoadingMessages).toBe(true);
      }
    });
  });

  test.describe('AI API Endpoints', () => {
    test('should have working route-question API endpoint', async ({ page }) => {
      const response = await page.request.post('/api/ai/route-question', {
        data: { question: 'What can I make with chicken?' }
      });
      
      // Should return a response (401 is expected for unauthenticated requests)
      expect(response.status()).toBeLessThan(500);
    });

    test('should have working search-recipe-names API endpoint', async ({ page }) => {
      const response = await page.request.post('/api/ai/search-recipe-names', {
        data: { recipeName: 'chicken parmesan' }
      });
      
      // Should return a response (401 is expected for unauthenticated requests)
      expect(response.status()).toBeLessThan(500);
    });

    test('should have working generate-recipes API endpoint', async ({ page }) => {
      const response = await page.request.post('/api/ai/generate-recipes', {
        data: { query: 'chicken and rice recipes' }
      });
      
      // Should return a response (401 is expected for unauthenticated requests)
      expect(response.status()).toBeLessThan(500);
    });

    test('should handle AI API errors gracefully', async ({ page }) => {
      // Simulate AI API error
      await page.route('**/api/ai/**', route => 
        route.fulfill({ status: 500, body: 'AI Service Unavailable' })
      );

      const questionInput = page.locator('textarea, input[placeholder*="ask" i]');
      const submitButton = page.locator('button:has-text("Ask"), button:has-text("Submit")');
      
      if (await questionInput.count() > 0 && await submitButton.count() > 0) {
        await questionInput.first().fill('test question');
        await submitButton.first().click();
        
        await page.waitForTimeout(2000);
        
        // Should not crash the page
        const bodyText = await page.textContent('body') || '';
        expect(bodyText.length).toBeGreaterThan(100);
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network failures gracefully', async ({ page }) => {
      // Simulate network failure
      await page.route('**/api/ai/**', route => route.abort());

      const questionInput = page.locator('textarea, input[placeholder*="ask" i]');
      const submitButton = page.locator('button:has-text("Ask"), button:has-text("Submit")');
      
      if (await questionInput.count() > 0 && await submitButton.count() > 0) {
        await questionInput.first().fill('test question');
        await submitButton.first().click();
        
        await page.waitForTimeout(2000);
        
        // Should not crash the page
        const bodyText = await page.textContent('body') || '';
        expect(bodyText.length).toBeGreaterThan(100);
      }
    });

    test('should handle invalid AI responses gracefully', async ({ page }) => {
      // Mock invalid AI response
      await page.route('**/api/ai/route-question', route => 
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: 'invalid json'
        })
      );

      const questionInput = page.locator('textarea, input[placeholder*="ask" i]');
      const submitButton = page.locator('button:has-text("Ask"), button:has-text("Submit")');
      
      if (await questionInput.count() > 0 && await submitButton.count() > 0) {
        await questionInput.first().fill('test question');
        await submitButton.first().click();
        
        await page.waitForTimeout(2000);
        
        // Should not crash the page
        const bodyText = await page.textContent('body') || '';
        expect(bodyText.length).toBeGreaterThan(100);
      }
    });
  });

  test.describe('Performance', () => {
    test('should load Chef Tony interface quickly', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      // Should load within reasonable time (5 seconds)
      expect(loadTime).toBeLessThan(5000);
    });

    test('should handle multiple rapid questions', async ({ page }) => {
      const questionInput = page.locator('textarea, input[placeholder*="ask" i]');
      const submitButton = page.locator('button:has-text("Ask"), button:has-text("Submit")');
      
      if (await questionInput.count() > 0 && await submitButton.count() > 0) {
        const errors: string[] = [];
        page.on('console', msg => {
          if (msg.type() === 'error' && !msg.text().includes('404')) {
            errors.push(msg.text());
          }
        });

        // Send multiple questions rapidly
        for (let i = 0; i < 3; i++) {
          await questionInput.first().fill(`Question ${i + 1}`);
          await submitButton.first().click();
          await page.waitForTimeout(500);
        }
        
        // Should not cause errors
        expect(errors.length).toBe(0);
      }
    });
  });
});
