import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: /module-template-v4.*\.spec\.ts/,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
    toHaveScreenshot: {
      // Allow up to 100 differing pixels and 10% per-channel tolerance
      // for anti-alias jitter and sub-pixel font rendering across runs.
      maxDiffPixels: 100,
      threshold: 0.1,
      animations: 'disabled'
    }
  },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: '../../.codex-playwright/module-template-v4-report', open: 'never' }]
  ],
  outputDir: '../../.codex-playwright/module-template-v4-results',
  snapshotPathTemplate: '{testFilePath}-snapshots/{arg}-{projectName}{ext}',
  use: {
    baseURL: 'http://127.0.0.1:8091',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  webServer: {
    command: 'php -S 127.0.0.1:8091 -t ../..',
    url: 'http://127.0.0.1:8091/mom/portal.html',
    reuseExistingServer: !process.env.CI,
    timeout: 15_000,
    stdout: 'ignore',
    stderr: 'ignore'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    }
  ]
});
