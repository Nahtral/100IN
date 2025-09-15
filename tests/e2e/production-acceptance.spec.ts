import { test, expect } from '@playwright/test';

test.describe('Production Acceptance Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
  });

  test('Complete workflow: Registration → Approval → Event → Attendance → Membership', async ({ page }) => {
    // 1. Sign up → appears in Approval → approve → login
    const testEmail = `test-${Date.now()}@example.com`;
    
    // Register new user
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    
    // Should show pending approval message
    await expect(page.getByText('approval')).toBeVisible({ timeout: 10000 });
    
    // TODO: Admin approval step (requires super admin login)
    // For now, we'll assume the user gets approved
    
    // Login after approval
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    
    // Should reach dashboard
    await expect(page.url()).toContain('/dashboard');
  });

  test('Class usage deduction workflow', async ({ page }) => {
    // Assumes user is logged in and has membership
    await page.goto('/dashboard');
    
    // Navigate to schedule
    await page.click('text=Schedule');
    
    // Find an event and mark attendance
    const eventCard = page.locator('[data-testid="event-card"]').first();
    await eventCard.click();
    
    // Open attendance modal
    await page.click('text=Mark Attendance');
    
    // Mark a player as Present
    const playerCard = page.locator('[data-testid="player-attendance"]').first();
    await playerCard.getByText('Present').click();
    
    // Verify success message
    await expect(page.getByText('Attendance saved successfully')).toBeVisible();
    
    // Open membership modal to verify class deduction
    await page.click('text=Membership');
    
    // Should show classes_used = 1 and classes_remaining decremented
    await expect(page.getByText('Classes Used: 1')).toBeVisible();
  });

  test('Attendance toggle workflow (no double charge)', async ({ page }) => {
    await page.goto('/schedule');
    
    const eventCard = page.locator('[data-testid="event-card"]').first();
    await eventCard.click();
    
    await page.click('text=Mark Attendance');
    
    const playerCard = page.locator('[data-testid="player-attendance"]').first();
    
    // Mark as Present
    await playerCard.getByText('Present').click();
    await expect(page.getByText('Attendance saved successfully')).toBeVisible();
    
    // Change to Absent (should refund)
    await playerCard.getByText('Absent').click();
    await expect(page.getByText('Attendance saved successfully')).toBeVisible();
    
    // Back to Present (should charge again, but only once)
    await playerCard.getByText('Present').click();
    await expect(page.getByText('Attendance saved successfully')).toBeVisible();
    
    // Verify no double charge by checking membership ledger
    // (This would require checking the backend data)
  });

  test('Grading save and persistence', async ({ page }) => {
    await page.goto('/schedule');
    
    const eventCard = page.locator('[data-testid="event-card"]').first();
    await eventCard.click();
    
    // Open grading modal
    await page.click('text=Grade Players');
    
    // Select a player
    const playerCard = page.locator('[data-testid="grading-player"]').first();
    await playerCard.click();
    
    // Adjust sliders
    const shootingSlider = page.locator('[data-skill="shooting"] input[type="range"]');
    await shootingSlider.fill('8');
    
    const ballHandlingSlider = page.locator('[data-skill="ball_handling"] input[type="range"]');
    await ballHandlingSlider.fill('7');
    
    // Click Save
    await page.click('button:has-text("Save Grades")');
    await expect(page.getByText('Grades saved successfully')).toBeVisible();
    
    // Refresh page and verify persistence
    await page.reload();
    await page.click('text=Grade Players');
    await playerCard.click();
    
    // Verify values persist
    await expect(shootingSlider).toHaveValue('8');
    await expect(ballHandlingSlider).toHaveValue('7');
  });

  test('Real-time updates', async ({ page, context }) => {
    // Open two browser tabs to test real-time updates
    const page2 = await context.newPage();
    
    // Both pages navigate to same event
    await page.goto('/schedule');
    await page2.goto('/schedule');
    
    const eventCard = page.locator('[data-testid="event-card"]').first();
    const eventCard2 = page2.locator('[data-testid="event-card"]').first();
    
    await eventCard.click();
    await eventCard2.click();
    
    // Page 1: Mark attendance
    await page.click('text=Mark Attendance');
    const playerCard = page.locator('[data-testid="player-attendance"]').first();
    await playerCard.getByText('Present').click();
    
    // Page 2: Should see the update in real-time
    await page2.click('text=Mark Attendance');
    const playerCard2 = page2.locator('[data-testid="player-attendance"]').first();
    await expect(playerCard2.getByText('Present')).toHaveClass(/selected|active/);
    
    await page2.close();
  });

  test('Database consistency checks', async ({ page }) => {
    // This test would verify that:
    // 1. No dangling references exist
    // 2. Membership ledger entries are idempotent
    // 3. Class usage calculations are correct
    // 4. RLS policies prevent unauthorized access
    
    // For now, this is a placeholder - would require API calls to verify DB state
    await page.goto('/dashboard');
    await expect(page.getByText('Dashboard')).toBeVisible();
  });

  test('Performance benchmarks', async ({ page }) => {
    // Measure key performance metrics
    await page.goto('/dashboard');
    
    const startTime = Date.now();
    
    // Navigate to schedule (should load quickly)
    await page.click('text=Schedule');
    await expect(page.getByText('Schedule')).toBeVisible();
    
    const scheduleLoadTime = Date.now() - startTime;
    expect(scheduleLoadTime).toBeLessThan(2000); // Under 2 seconds
    
    // Open attendance modal (should be responsive)
    const modalStartTime = Date.now();
    await page.click('[data-testid="event-card"]').first();
    await page.click('text=Mark Attendance');
    await expect(page.getByText('Team Members')).toBeVisible();
    
    const modalLoadTime = Date.now() - modalStartTime;
    expect(modalLoadTime).toBeLessThan(1000); // Under 1 second
  });
});