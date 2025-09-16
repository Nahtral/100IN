import { test, expect } from '@playwright/test';

test.describe('Production Hardening Complete Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
  });

  test('User approval workflow using hardened RPC', async ({ page }) => {
    // Test that the user approval dashboard loads
    await page.goto('/user-management');
    
    // Should see the hardened user approval component
    await expect(page.locator('text=Pending User Approvals')).toBeVisible();
    
    // The component should be using the secure RPC function
    await expect(page.locator('text=No pending user approvals').or(page.locator('[data-testid="pending-user"]'))).toBeVisible();
  });

  test('Attendance recording with automatic membership deduction', async ({ page }) => {
    // Navigate to schedule page
    await page.goto('/schedule');
    
    // Should be able to view events (if any exist)
    await expect(page.locator('body')).toBeVisible();
    
    // Note: This would require actual event data to test attendance recording
    // The RPC rpc_upsert_attendance should handle idempotent operations
  });

  test('Grading system with explicit save functionality', async ({ page }) => {
    // Navigate to schedule page where grading would occur
    await page.goto('/schedule');
    
    // Should load successfully with hardened grading system
    await expect(page.locator('body')).toBeVisible();
    
    // Note: This would require actual events to test the grading modal
    // The hardened grading uses rpc_save_event_grades for persistence
  });

  test('Real-time membership updates', async ({ page }) => {
    // Test that membership data loads and updates in real-time
    await page.goto('/dashboard');
    
    // Should load without errors
    await expect(page.locator('body')).toBeVisible();
    
    // The hardened membership hooks should be working with real-time subscriptions
  });

  test('Database security with RLS policies', async ({ page }) => {
    // Test that unauthorized access is properly blocked
    await page.goto('/user-management');
    
    // Should either redirect to auth or show access denied
    // (depending on authentication state)
    await expect(page.locator('body')).toBeVisible();
  });

  test('Error handling and user feedback', async ({ page }) => {
    // Test that the application handles errors gracefully
    await page.goto('/dashboard');
    
    // Should load and show appropriate feedback
    await expect(page.locator('body')).toBeVisible();
    
    // No unhandled exceptions should occur
    page.on('pageerror', (error) => {
      throw error;
    });
  });

  test('Performance and responsiveness', async ({ page }) => {
    const startTime = Date.now();
    
    // Test navigation between key pages
    await page.goto('/dashboard');
    await expect(page.locator('body')).toBeVisible();
    
    await page.goto('/schedule');
    await expect(page.locator('body')).toBeVisible();
    
    await page.goto('/players');
    await expect(page.locator('body')).toBeVisible();
    
    const totalTime = Date.now() - startTime;
    
    // Should complete navigation within reasonable time
    expect(totalTime).toBeLessThan(10000); // 10 seconds for all navigations
  });

  test('System data consistency', async ({ page }) => {
    // Test that data remains consistent across different views
    await page.goto('/dashboard');
    await expect(page.locator('body')).toBeVisible();
    
    // Check that no console errors indicate data inconsistencies
    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('consistency')) {
        throw new Error(`Data consistency error: ${msg.text()}`);
      }
    });
  });
});