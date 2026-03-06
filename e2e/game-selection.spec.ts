import { test, expect } from '@playwright/test'

test.describe('Game Selection in Quick Round (authenticated)', () => {
  test('shows games section after adding players', async ({ page }) => {
    await page.goto('/quick-round')
    await expect(page.locator('h1:has-text("Quick Round")')).toBeVisible({ timeout: 10000 })

    // Games section should be visible (at least 1 player = self)
    // Some games require 2+ players, so add a second player to see more options
    await page.click('text=+ Add Player')
    const playerInputs = page.locator('input[placeholder="Player name"]')
    await playerInputs.nth(1).fill('Test Partner')

    // Games heading should appear
    await expect(page.locator('h2:has-text("Games")')).toBeVisible({ timeout: 3000 })
  })

  test('games filter by player count', async ({ page }) => {
    await page.goto('/quick-round')
    await expect(page.locator('h1:has-text("Quick Round")')).toBeVisible({ timeout: 10000 })

    // Count games with 1 player
    const gamesSection = page.locator('h2:has-text("Games")')
    const hasGamesAt1 = await gamesSection.isVisible().catch(() => false)

    // Add players to 4 and check games update
    await page.click('text=+ Add Player')
    await page.locator('input[placeholder="Player name"]').nth(1).fill('Player 2')
    await page.click('text=+ Add Player')
    await page.locator('input[placeholder="Player name"]').nth(2).fill('Player 3')
    await page.click('text=+ Add Player')
    await page.locator('input[placeholder="Player name"]').nth(3).fill('Player 4')

    // With 4 players, games section should be visible
    await expect(page.locator('h2:has-text("Games")')).toBeVisible({ timeout: 3000 })

    // The subtitle should mention 4 players
    await expect(page.locator('text=4 players')).toBeVisible()
  })

  test('can select a game and see buy-in input', async ({ page }) => {
    await page.goto('/quick-round')
    await expect(page.locator('h1:has-text("Quick Round")')).toBeVisible({ timeout: 10000 })

    // Add a second player so more games are available
    await page.click('text=+ Add Player')
    await page.locator('input[placeholder="Player name"]').nth(1).fill('Test Partner')

    await expect(page.locator('h2:has-text("Games")')).toBeVisible({ timeout: 3000 })

    // Click the first game card
    const gameCards = page.locator('h2:has-text("Games") ~ div button').first()
    await gameCards.click()

    // Buy-in input should appear
    await expect(page.locator('text=buy-in')).toBeVisible({ timeout: 2000 })

    // Fill in a buy-in amount
    const buyInInput = page.locator('input[placeholder="0"]')
    await buyInInput.fill('5')
    await expect(buyInInput).toHaveValue('5')
  })

  test('can toggle game off to remove buy-in', async ({ page }) => {
    await page.goto('/quick-round')
    await expect(page.locator('h1:has-text("Quick Round")')).toBeVisible({ timeout: 10000 })

    await page.click('text=+ Add Player')
    await page.locator('input[placeholder="Player name"]').nth(1).fill('Test Partner')

    await expect(page.locator('h2:has-text("Games")')).toBeVisible({ timeout: 3000 })

    // Select first game
    const gameCards = page.locator('h2:has-text("Games") ~ div button').first()
    await gameCards.click()
    await expect(page.locator('text=buy-in')).toBeVisible()

    // Click it again to deselect
    await gameCards.click()
    await expect(page.locator('text=buy-in')).not.toBeVisible()
  })

  test('full flow with game selection and buy-in', async ({ page }) => {
    await page.goto('/quick-round')
    await expect(page.locator('h1:has-text("Quick Round")')).toBeVisible({ timeout: 10000 })

    // Set course
    const courseInput = page.locator('input[placeholder="Search for a course..."]')
    await courseInput.fill('Game Test Course XYZ')
    await page.waitForTimeout(800)
    const manualOption = page.locator('button:has-text("Course not found")')
    await manualOption.waitFor({ state: 'visible', timeout: 5000 })
    await manualOption.click()

    // Add a partner
    await page.click('text=+ Add Player')
    await page.locator('input[placeholder="Player name"]').nth(1).fill('Game Buddy')

    // Select a game if available
    const gamesHeading = page.locator('h2:has-text("Games")')
    if (await gamesHeading.isVisible()) {
      const firstGame = page.locator('h2:has-text("Games") ~ div button').first()
      await firstGame.click()

      // Set buy-in
      const buyInInput = page.locator('input[placeholder="0"]')
      if (await buyInInput.isVisible()) {
        await buyInInput.fill('10')
      }
    }

    // Tee off
    const teeOffButton = page.locator('button:has-text("Tee Off")')
    await expect(teeOffButton).toBeEnabled({ timeout: 3000 })
    await teeOffButton.click()

    await page.waitForURL(/\/trip\/.*\/live\//, { timeout: 15000 })
    await expect(page.url()).toContain('/live/')
  })
})
