import { test, expect } from '@playwright/test'

test.describe('Optional Partner Scores (authenticated)', () => {
  async function createRoundWithPartner(page: import('@playwright/test').Page) {
    await page.goto('/quick-round')
    await expect(page.locator('h1:has-text("Quick Round")')).toBeVisible({ timeout: 10000 })

    const courseInput = page.locator('input[placeholder="Search for a course..."]')
    await courseInput.fill('Partner Test Course')
    await page.waitForTimeout(800)

    const manualOption = page.locator('button:has-text("Course not found")')
    await manualOption.waitFor({ state: 'visible', timeout: 5000 })
    await manualOption.click()

    // Add a playing partner
    await page.click('text=+ Add Player')
    await page.locator('input[placeholder="Player name"]').nth(1).fill('Silent Partner')

    const teeOffButton = page.locator('button:has-text("Tee Off")')
    await expect(teeOffButton).toBeEnabled({ timeout: 3000 })
    await teeOffButton.click()

    await page.waitForURL(/\/trip\/.*\/live\//, { timeout: 15000 })
  }

  test('partner shows dash when untouched', async ({ page }) => {
    await createRoundWithPartner(page)

    // Open hole 1
    await page.click('button:has-text("Score Hole 1")')
    await expect(page.locator('text=Hole 1')).toBeVisible({ timeout: 5000 })

    // Playing Partners section should exist
    await expect(page.locator('text=Playing Partners')).toBeVisible()

    // Partner should show dash (untouched)
    const partnerRow = page.locator('text=Silent Partner')
    await expect(partnerRow).toBeVisible()

    // The dash should be visible next to the partner name
    const partnerButton = page.locator('button:has-text("Silent Partner")')
    await expect(partnerButton.locator('text=—')).toBeVisible()
  })

  test('can save hole with only own score (partner untouched)', async ({ page }) => {
    await createRoundWithPartner(page)

    await page.click('button:has-text("Score Hole 1")')
    await expect(page.locator('text=Hole 1')).toBeVisible({ timeout: 5000 })

    // Just click Save & Next without touching partner score
    await page.click('button:has-text("Save")')

    // Should navigate to hole 2
    await expect(page.locator('text=Hole 2')).toBeVisible({ timeout: 5000 })
  })

  test('partner score updates when explicitly changed', async ({ page }) => {
    await createRoundWithPartner(page)

    await page.click('button:has-text("Score Hole 1")')
    await expect(page.locator('text=Hole 1')).toBeVisible({ timeout: 5000 })

    // Partner should show dash initially
    const partnerButton = page.getByRole('button', { name: /Silent Partner/ })
    await expect(partnerButton.locator('text=—')).toBeVisible()

    // Expand the partner section
    await partnerButton.click()

    // Click the + button in the partner's expanded score input
    // The partner's score controls appear after the button
    const plusButtons = page.locator('button:has-text("+")')
    await plusButtons.last().click()

    // Partner should no longer show dash — it should show a number
    await expect(partnerButton.locator('text=—')).not.toBeVisible()
  })
})
