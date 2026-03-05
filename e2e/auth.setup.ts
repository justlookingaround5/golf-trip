import { test as setup, expect } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, '..', '.playwright', '.auth', 'user.json')

setup('authenticate', async ({ page }) => {
  await page.goto('/admin/login')
  await page.fill('input[type="email"]', process.env.TEST_USER_EMAIL!)
  await page.fill('input[type="password"]', process.env.TEST_USER_PASSWORD!)
  await page.click('button[type="submit"]')

  // Wait for login to complete — lands on /admin dashboard
  await page.waitForURL(/admin/, { timeout: 15000 })
  // Wait for the page to fully load so cookies are set by middleware
  await page.waitForLoadState('networkidle')

  // Verify we're logged in by checking admin page content
  await expect(page.locator('text=Your Trips')).toBeVisible({ timeout: 10000 })

  // Now navigate to /home — the middleware should refresh the session cookie
  await page.goto('/home', { waitUntil: 'networkidle' })

  // If we're redirected back to login, the session cookie isn't persisting.
  // In that case, save what we have — the admin page session at least works.
  const url = page.url()
  if (url.includes('login')) {
    // Go back to admin where session works, save that
    await page.goto('/admin', { waitUntil: 'networkidle' })
  }

  // Save session state
  await page.context().storageState({ path: authFile })
})
