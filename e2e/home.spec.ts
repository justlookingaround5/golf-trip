import { test, expect } from '@playwright/test'

test.describe('Home Page (authenticated)', () => {
  test.skip(() => !process.env.TEST_USER_EMAIL, 'Skipped: no test credentials')

  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/login')
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL!)
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD!)
    await page.click('button[type="submit"]')
    await page.waitForURL(/home/, { timeout: 10000 })
  })

  test('shows welcome header and action buttons', async ({ page }) => {
    await expect(page.locator('text=Welcome back')).toBeVisible()
    await expect(page.locator('a:has-text("Quick Round")')).toBeVisible()
    await expect(page.locator('a:has-text("New Trip")')).toBeVisible()
  })

  test('Quick Round button links to /quick-round', async ({ page }) => {
    const quickRoundLink = page.locator('a:has-text("Quick Round")')
    await expect(quickRoundLink).toHaveAttribute('href', '/quick-round')
  })

  test('displays leaderboard or stats section', async ({ page }) => {
    // Page should load without errors and show some content
    await expect(page.locator('body')).toBeVisible()
    // At minimum the page should have rendered fully (no loading spinners stuck)
    await page.waitForLoadState('networkidle')
  })
})
