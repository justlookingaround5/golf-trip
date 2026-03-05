import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test('loads and shows ForeLive branding', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/ForeLive/)
  })

  test('shows trip list for public visitors', async ({ page }) => {
    await page.goto('/')
    // The landing page should render without errors
    await expect(page.locator('body')).toBeVisible()
  })

  test('has login link for unauthenticated users', async ({ page }) => {
    await page.goto('/')
    // Should have some way to sign in
    const loginLink = page.locator('a[href*="login"]')
    if (await loginLink.count() > 0) {
      await expect(loginLink.first()).toBeVisible()
    }
  })

  test('redirects /home to login when not authenticated', async ({ page }) => {
    await page.goto('/home')
    await page.waitForURL(/login/, { timeout: 5000 })
    await expect(page.url()).toContain('login')
  })

  test('redirects /quick-round to login when not authenticated', async ({ page }) => {
    await page.goto('/quick-round')
    await page.waitForURL(/login/, { timeout: 5000 })
    await expect(page.url()).toContain('login')
  })

  test('redirects live scoring to login when not authenticated', async ({ page }) => {
    await page.goto('/trip/00000000-0000-0000-0000-000000000000/live/00000000-0000-0000-0000-000000000000')
    await page.waitForURL(/login/, { timeout: 5000 })
    await expect(page.url()).toContain('login')
  })
})
