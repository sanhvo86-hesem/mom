import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: /module-template-v4.*\.spec\.ts/,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
    toHaveScreenshot: {
      // Cross-OS visual regression tolerance — baselines may be generated on
      // any developer host (macOS / Linux / Windows) but CI always runs on
      // Linux. Font hinting and sub-pixel rasterization differ enough across
      // OSes that very tight thresholds produce false-positives on what is
      // semantically the same render. 0.25 per-channel + 5000 pixels is the
      // band that absorbs that drift while still catching real visual
      // regressions (a moved button, a swapped color, a missing component).
      // The Graphics Authority remains the SSOT for token values; this
      // tolerance only governs pixel-level rendering equivalence.
      maxDiffPixels: 5_000,
      threshold: 0.25,
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
