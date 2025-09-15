import { test, expect } from '@playwright/test';

test.describe('Critical User Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Complete registration and approval flow', async ({ page }) => {
    // Test user registration
    await page.click('text=Sign Up');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'TestPassword123!');
    await page.fill('[name="fullName"]', 'Test User');
    await page.click('button[type="submit"]');
    
    // Should show approval pending screen
    await expect(page.locator('text=approval')).toBeVisible();
    
    // Admin flow - approve user
    // (This would need admin login and approval process)
    
    // Test approved user login
    await page.goto('/auth');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
  });

  test('Event creation and attendance flow', async ({ page }) => {
    // Login as admin
    await page.goto('/auth');
    await page.fill('[name="email"]', 'admin@example.com');
    await page.fill('[name="password"]', 'AdminPassword123!');
    await page.click('button[type="submit"]');
    
    // Navigate to schedule
    await page.click('text=Schedule');
    
    // Create new event
    await page.click('text=Add Event');
    await page.fill('[name="title"]', 'Test Practice');
    await page.fill('[name="start_time"]', '2024-12-01T10:00');
    await page.fill('[name="end_time"]', '2024-12-01T12:00');
    await page.click('button[type="submit"]');
    
    // Should show in schedule
    await expect(page.locator('text=Test Practice')).toBeVisible();
    
    // Test attendance marking
    await page.click('text=Test Practice');
    await page.click('text=Manage Attendance');
    
    // Mark attendance
    await page.click('[data-testid="attendance-present"]');
    await page.click('text=Save Attendance');
    
    // Should show success message
    await expect(page.locator('text=saved')).toBeVisible();
  });

  test('Grading real-time updates', async ({ page }) => {
    // Login as coach
    await page.goto('/auth');
    await page.fill('[name="email"]', 'coach@example.com');
    await page.fill('[name="password"]', 'CoachPassword123!');
    await page.click('button[type="submit"]');
    
    // Navigate to an event
    await page.click('text=Schedule');
    await page.click('[data-testid="event-card"]');
    
    // Open grading modal
    await page.click('text=Grade Players');
    
    // Test slider interaction
    const slider = page.locator('[data-testid="grade-slider"]').first();
    await slider.click();
    
    // Should update overall grade in real-time
    await expect(page.locator('[data-testid="overall-grade"]')).not.toBeEmpty();
    
    // Save grades
    await page.click('text=Save Grades');
    
    // Should persist after refresh
    await page.reload();
    await page.click('text=Grade Players');
    await expect(page.locator('[data-testid="grade-slider"]')).not.toHaveValue('0');
  });

  test('Class deduction on attendance', async ({ page }) => {
    // Login and mark attendance
    await page.goto('/auth');
    await page.fill('[name="email"]', 'admin@example.com');
    await page.fill('[name="password"]', 'AdminPassword123!');
    await page.click('button[type="submit"]');
    
    // Check initial membership credits
    await page.click('text=Players');
    const initialCredits = await page.locator('[data-testid="membership-credits"]').textContent();
    
    // Mark attendance as present
    await page.click('text=Schedule');
    await page.click('[data-testid="event-card"]');
    await page.click('text=Manage Attendance');
    await page.click('[data-testid="attendance-present"]');
    await page.click('text=Save Attendance');
    
    // Check that credits decreased
    await page.click('text=Players');
    const newCredits = await page.locator('[data-testid="membership-credits"]').textContent();
    
    expect(parseInt(newCredits!)).toBeLessThan(parseInt(initialCredits!));
  });

  test('Error handling and recovery', async ({ page }) => {
    // Test network failure handling
    await page.route('**/rest/v1/**', route => route.abort());
    
    await page.goto('/dashboard');
    
    // Should show error state
    await expect(page.locator('text=error')).toBeVisible();
    
    // Test retry functionality
    await page.unroute('**/rest/v1/**');
    await page.click('text=Try again');
    
    // Should recover
    await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
  });
});

test.describe('Performance Tests', () => {
  test('Dashboard loads within performance budget', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000); // 3 second budget
  });

  test('Large data set handling', async ({ page }) => {
    // Mock large data response
    await page.route('**/rest/v1/players*', route => {
      const mockPlayers = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Player ${i}`,
        email: `player${i}@example.com`,
        team_id: Math.floor(i / 50)
      }));
      
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockPlayers)
      });
    });
    
    await page.goto('/players');
    
    // Should handle large data set without performance issues
    await expect(page.locator('[data-testid="player-list"]')).toBeVisible();
    
    // Test virtual scrolling if implemented
    const visibleItems = await page.locator('[data-testid="player-item"]').count();
    expect(visibleItems).toBeLessThan(100); // Should virtualize
  });
});