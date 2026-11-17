import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './',
  timeout: 60000,
  expect: {
    timeout: 10000
  },
  fullyParallel: false,
  workers: 1, // Serial to preserve strict test isolation and prevent DB locks
  reporter: [
    ['list'],
    ['json', { outputFile: '../../docs/baseline/e2e-results.json' }]
  ],
  use: {
    baseURL: process.env.STAGING_URL || process.env.BASE_URL || 'https://chandakgroup.tech',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
