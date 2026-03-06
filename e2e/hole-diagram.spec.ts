import { test, expect } from '@playwright/test'

test.describe('Hole Diagram in Live Scoring (authenticated)', () => {
  async function createQuickRound(page: import('@playwright/test').Page) {
    await page.goto('/quick-round')
    await expect(page.locator('h1:has-text("Quick Round")')).toBeVisible({ timeout: 10000 })

    const courseInput = page.locator('input[placeholder="Search for a course..."]')
    await courseInput.fill('Diagram Test Course')
    await page.waitForTimeout(800)

    const manualOption = page.locator('button:has-text("Course not found")')
    await manualOption.waitFor({ state: 'visible', timeout: 5000 })
    await manualOption.click()

    const teeOffButton = page.locator('button:has-text("Tee Off")')
    await expect(teeOffButton).toBeEnabled({ timeout: 3000 })
    await teeOffButton.click()

    await page.waitForURL(/\/trip\/.*\/live\//, { timeout: 15000 })
  }

  test('hole view shows an SVG hole diagram', async ({ page }) => {
    await createQuickRound(page)

    // Open hole 1
    await page.click('button:has-text("Score Hole 1")')
    await expect(page.locator('text=Hole 1')).toBeVisible({ timeout: 5000 })

    // Should have an SVG diagram rendered (generated fallback for manual courses)
    const svg = page.locator('svg[viewBox="0 0 200 280"]')
    await expect(svg).toBeVisible({ timeout: 3000 })
  })

  test('hole diagram has fairway and green elements', async ({ page }) => {
    await createQuickRound(page)

    await page.click('button:has-text("Score Hole 1")')
    await expect(page.locator('text=Hole 1')).toBeVisible({ timeout: 5000 })

    const svg = page.locator('svg[viewBox="0 0 200 280"]')
    await expect(svg).toBeVisible({ timeout: 3000 })

    // Generated diagram should have a fairway path and a green ellipse
    await expect(svg.locator('path')).toHaveCount(1) // fairway
    await expect(svg.locator('ellipse').first()).toBeVisible() // green or bunker
    await expect(svg.locator('circle')).toBeVisible() // pin
  })

  test('diagram persists when navigating between holes', async ({ page }) => {
    await createQuickRound(page)

    await page.click('button:has-text("Score Hole 1")')
    await expect(page.locator('text=Hole 1')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('svg[viewBox="0 0 200 280"]')).toBeVisible()

    // Navigate to hole 2
    await page.click('text=Next')
    await expect(page.locator('text=Hole 2')).toBeVisible({ timeout: 3000 })
    await expect(page.locator('svg[viewBox="0 0 200 280"]')).toBeVisible()

    // Navigate back to hole 1
    await page.click('text=Prev')
    await expect(page.locator('text=Hole 1')).toBeVisible({ timeout: 3000 })
    await expect(page.locator('svg[viewBox="0 0 200 280"]')).toBeVisible()
  })
})
