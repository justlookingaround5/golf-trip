import { test, expect } from '@playwright/test'

test.describe('Home Page (authenticated)', () => {
  test('shows welcome header and action buttons', async ({ page }) => {
    await page.goto('/home')
    await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('a[href="/quick-round"]')).toBeVisible()
    await expect(page.locator('a[href="/admin/trips/new"]')).toBeVisible()
  })

  test('Quick Round button links to /quick-round', async ({ page }) => {
    await page.goto('/home')
    await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 10000 })
    const quickRoundLink = page.locator('a[href="/quick-round"]')
    await expect(quickRoundLink).toBeVisible()
    await expect(quickRoundLink).toContainText('Quick Round')
  })

  test('displays page content without errors', async ({ page }) => {
    await page.goto('/home')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toBeVisible()
  })
})
