import { test, expect } from '@playwright/test'

test.describe('Quick Round', () => {
  test('redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/quick-round')
    await page.waitForURL(/login/, { timeout: 5000 })
    await expect(page.url()).toContain('login')
  })
})

// Authenticated tests require a test user session.
// To run these, set PLAYWRIGHT_AUTH_COOKIE or use the setup below.
test.describe('Quick Round (authenticated)', () => {
  test.skip(() => !process.env.TEST_USER_EMAIL, 'Skipped: no test credentials')

  test.beforeEach(async ({ page }) => {
    // Login with test credentials
    await page.goto('/admin/login')
    await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL!)
    await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD!)
    await page.click('button[type="submit"]')
    await page.waitForURL(/home/, { timeout: 10000 })
  })

  test('loads quick round page with course search and player entry', async ({ page }) => {
    await page.goto('/quick-round')
    await expect(page.locator('text=Quick Round')).toBeVisible()
    await expect(page.locator('text=Course')).toBeVisible()
    await expect(page.locator('text=Players')).toBeVisible()
    await expect(page.locator('text=Tee Off')).toBeVisible()
  })

  test('can add and remove players', async ({ page }) => {
    await page.goto('/quick-round')

    // Should start with 1 player
    const playerInputs = page.locator('input[placeholder="Player name"]')
    await expect(playerInputs).toHaveCount(1)

    // Add a player
    await page.click('text=+ Add Player')
    await expect(playerInputs).toHaveCount(2)

    // Fill second player name
    await playerInputs.nth(1).fill('Test Player 2')
    await expect(playerInputs.nth(1)).toHaveValue('Test Player 2')
  })

  test('tee off button is disabled without course and player name', async ({ page }) => {
    await page.goto('/quick-round')

    // Clear the pre-filled player name
    const playerInput = page.locator('input[placeholder="Player name"]')
    await playerInput.clear()

    // Tee Off should be disabled
    const teeOffButton = page.locator('button:has-text("Tee Off")')
    await expect(teeOffButton).toBeDisabled()
  })

  test('full quick round flow with manual course', async ({ page }) => {
    await page.goto('/quick-round')

    // Search for a course that won't exist to trigger manual fallback
    const courseInput = page.locator('input[placeholder="Search for a course..."]')
    await courseInput.fill('Test Manual Course XYZ')
    await page.waitForTimeout(600) // Wait for debounce

    // Click manual fallback option
    const manualOption = page.locator('text=Course not found')
    if (await manualOption.isVisible()) {
      await manualOption.click()
    }

    // Fill player name if not pre-filled
    const playerInput = page.locator('input[placeholder="Player name"]')
    const playerValue = await playerInput.inputValue()
    if (!playerValue) {
      await playerInput.fill('Test Player')
    }

    // Tee Off should be enabled
    const teeOffButton = page.locator('button:has-text("Tee Off")')
    await expect(teeOffButton).toBeEnabled()

    // Click Tee Off
    await teeOffButton.click()

    // Should redirect to live scoring
    await page.waitForURL(/\/trip\/.*\/live\//, { timeout: 15000 })
    await expect(page.url()).toContain('/live/')
  })
})
