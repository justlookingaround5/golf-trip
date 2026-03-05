import { defineConfig, devices } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, '.playwright', '.auth', 'user.json')

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Auth setup — runs first, saves session
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    // Unauthenticated tests only (landing page tests)
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /landing\.spec\.ts/,
    },
    // Authenticated tests — all other test files
    {
      name: 'Desktop Chrome Authenticated',
      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile,
      },
      dependencies: ['setup'],
      testIgnore: [/auth\.setup\.ts/, /landing\.spec\.ts/],
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
      },
})
