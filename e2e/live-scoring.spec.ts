import { test, expect } from '@playwright/test'

test.describe('Live Scoring', () => {
  test('redirects to login when not authenticated', async ({ page }) => {
    // Use a fake trip/course ID — should still redirect before 404
    await page.goto('/trip/00000000-0000-0000-0000-000000000000/live/00000000-0000-0000-0000-000000000000')
    await page.waitForURL(/login/, { timeout: 5000 })
    await expect(page.url()).toContain('login')
  })
})

test.describe('Live Scoring (authenticated)', () => {
  test.skip(() => !process.env.TEST_USER_EMAIL, 'Skipped: no test credentials')

  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/login')
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL!)
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD!)
    await page.click('button[type="submit"]')
    await page.waitForURL(/home/, { timeout: 10000 })
  })

  test('scorecard renders with holes', async ({ page }) => {
    // Create a quick round first to get a valid live scoring URL
    await page.goto('/quick-round')

    const courseInput = page.locator('input[placeholder="Search for a course..."]')
    await courseInput.fill('Scorecard Test Course')
    await page.waitForTimeout(600)

    const manualOption = page.locator('text=Course not found')
    if (await manualOption.isVisible()) {
      await manualOption.click()
    }

    const playerInput = page.locator('input[placeholder="Player name"]')
    const playerValue = await playerInput.inputValue()
    if (!playerValue) {
      await playerInput.fill('Test Scorer')
    }

    await page.click('button:has-text("Tee Off")')
    await page.waitForURL(/\/trip\/.*\/live\//, { timeout: 15000 })

    // Verify scorecard elements
    await expect(page.locator('text=Scorecard')).toBeVisible()
    await expect(page.locator('text=Front 9')).toBeVisible()
    await expect(page.locator('text=Back 9')).toBeVisible()

    // Verify Score Hole 1 button appears
    await expect(page.locator('button:has-text("Score Hole 1")')).toBeVisible()
  })

  test('can open hole and see score entry', async ({ page }) => {
    await page.goto('/quick-round')

    const courseInput = page.locator('input[placeholder="Search for a course..."]')
    await courseInput.fill('Score Entry Test')
    await page.waitForTimeout(600)

    const manualOption = page.locator('text=Course not found')
    if (await manualOption.isVisible()) {
      await manualOption.click()
    }

    const playerInput = page.locator('input[placeholder="Player name"]')
    const playerValue = await playerInput.inputValue()
    if (!playerValue) {
      await playerInput.fill('Test Scorer')
    }

    await page.click('button:has-text("Tee Off")')
    await page.waitForURL(/\/trip\/.*\/live\//, { timeout: 15000 })

    // Click Score Hole 1
    await page.click('button:has-text("Score Hole 1")')

    // Should show the hole view with +/- buttons and Save
    await expect(page.locator('text=Hole 1')).toBeVisible()
    await expect(page.locator('button:has-text("Save")')).toBeVisible()
  })

  test('quick round hides Games and Bets tabs', async ({ page }) => {
    await page.goto('/quick-round')

    const courseInput = page.locator('input[placeholder="Search for a course..."]')
    await courseInput.fill('Tab Test Course')
    await page.waitForTimeout(600)

    const manualOption = page.locator('text=Course not found')
    if (await manualOption.isVisible()) {
      await manualOption.click()
    }

    const playerInput = page.locator('input[placeholder="Player name"]')
    const playerValue = await playerInput.inputValue()
    if (!playerValue) {
      await playerInput.fill('Tab Tester')
    }

    await page.click('button:has-text("Tee Off")')
    await page.waitForURL(/\/trip\/.*\/live\//, { timeout: 15000 })

    // Board and Feed tabs should be visible
    await expect(page.locator('button:has-text("Board")')).toBeVisible()
    await expect(page.locator('button:has-text("Feed")')).toBeVisible()

    // Games and Bets tabs should NOT be visible (quick round)
    await expect(page.locator('button:has-text("Games")')).not.toBeVisible()
    await expect(page.locator('button:has-text("Bets")')).not.toBeVisible()
  })
})
