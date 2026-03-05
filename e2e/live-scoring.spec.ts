import { test, expect } from '@playwright/test'

test.describe('Live Scoring (authenticated)', () => {
  async function createQuickRound(page: import('@playwright/test').Page) {
    await page.goto('/quick-round')
    await expect(page.locator('h1:has-text("Quick Round")')).toBeVisible({ timeout: 10000 })

    const courseInput = page.locator('input[placeholder="Search for a course..."]')
    await courseInput.fill('Playwright Test Course')
    await page.waitForTimeout(800)

    // Click the manual course fallback button
    const manualOption = page.locator('button:has-text("Course not found")')
    await manualOption.waitFor({ state: 'visible', timeout: 5000 })
    await manualOption.click()

    // Verify Tee Off is now enabled (course selected + player pre-filled)
    const teeOffButton = page.locator('button:has-text("Tee Off")')
    await expect(teeOffButton).toBeEnabled({ timeout: 3000 })
    await teeOffButton.click()

    await page.waitForURL(/\/trip\/.*\/live\//, { timeout: 15000 })
  }

  test('scorecard renders with holes', async ({ page }) => {
    await createQuickRound(page)

    await expect(page.locator('text=Scorecard')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=Front 9')).toBeVisible()
    await expect(page.locator('text=Back 9')).toBeVisible()
    await expect(page.locator('button:has-text("Score Hole 1")')).toBeVisible()
  })

  test('can open hole and see score entry', async ({ page }) => {
    await createQuickRound(page)

    await page.click('button:has-text("Score Hole 1")')
    await expect(page.locator('text=Hole 1')).toBeVisible()
    await expect(page.locator('button:has-text("Save")')).toBeVisible()
  })

  test('quick round hides Games and Bets tabs', async ({ page }) => {
    await createQuickRound(page)

    await expect(page.locator('button:has-text("Board")')).toBeVisible()
    await expect(page.locator('button:has-text("Feed")')).toBeVisible()
    await expect(page.locator('button:has-text("Games")')).not.toBeVisible()
    await expect(page.locator('button:has-text("Bets")')).not.toBeVisible()
  })
})
