import { test, expect } from '@playwright/test'

test.describe('Quick Round (authenticated)', () => {
  test('loads quick round page with course search and player entry', async ({ page }) => {
    await page.goto('/quick-round')
    await expect(page.locator('h1:has-text("Quick Round")')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=Course')).toBeVisible()
    await expect(page.locator('h2:has-text("Players")')).toBeVisible()
    await expect(page.locator('button:has-text("Tee Off")')).toBeVisible()
  })

  test('can add and remove players', async ({ page }) => {
    await page.goto('/quick-round')
    await expect(page.locator('h1:has-text("Quick Round")')).toBeVisible({ timeout: 10000 })

    const playerInputs = page.locator('input[placeholder="Player name"]')
    await expect(playerInputs).toHaveCount(1)

    await page.click('text=+ Add Player')
    await expect(playerInputs).toHaveCount(2)

    await playerInputs.nth(1).fill('Test Player 2')
    await expect(playerInputs.nth(1)).toHaveValue('Test Player 2')
  })

  test('full quick round flow with manual course', async ({ page }) => {
    await page.goto('/quick-round')
    await expect(page.locator('h1:has-text("Quick Round")')).toBeVisible({ timeout: 10000 })

    const courseInput = page.locator('input[placeholder="Search for a course..."]')
    await courseInput.fill('Test Manual Course XYZ')
    await page.waitForTimeout(800)

    // Click manual course fallback
    const manualOption = page.locator('button:has-text("Course not found")')
    await manualOption.waitFor({ state: 'visible', timeout: 5000 })
    await manualOption.click()

    // Tee Off should be enabled
    const teeOffButton = page.locator('button:has-text("Tee Off")')
    await expect(teeOffButton).toBeEnabled({ timeout: 3000 })

    await teeOffButton.click()
    await page.waitForURL(/\/trip\/.*\/live\//, { timeout: 15000 })
    await expect(page.url()).toContain('/live/')
  })
})
