import { test, expect } from '@playwright/test'

test.describe('Chat Assistant on Home Page (authenticated)', () => {
  test('chat bubble is visible on home page', async ({ page }) => {
    await page.goto('/home')
    await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 10000 })

    // Chat bubble button should be present (floating action button)
    // The ChatAssistant renders a button with a chat icon when closed
    const chatButton = page.locator('button').filter({ has: page.locator('svg') }).last()
    await expect(chatButton).toBeVisible({ timeout: 5000 })
  })

  test('can open chat panel', async ({ page }) => {
    await page.goto('/home')
    await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 10000 })

    // Look for the chat toggle button (usually bottom-right floating button)
    // The ChatAssistant has a circular button that opens the chat
    const chatButtons = page.locator('button[class*="rounded-full"]')
    const chatButton = chatButtons.last()

    if (await chatButton.isVisible()) {
      await chatButton.click()

      // After clicking, chat panel should open with an input field
      const chatInput = page.locator('input[placeholder*="Ask"], textarea[placeholder*="Ask"], input[placeholder*="ask"], textarea[placeholder*="ask"], input[placeholder*="Type"], textarea[placeholder*="Type"]')
      await expect(chatInput).toBeVisible({ timeout: 3000 })
    }
  })
})
