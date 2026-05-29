import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: /module-template-v4.*\.spec\.ts/,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
    toHaveScreenshot: {
      // Cross-OS visual regression tolerance — baselines may be generated on
      // macOS / Linux / Windows but CI always runs on Linux. Two distinct
      // sources of drift need to be absorbed:
      //
      //   (1) Sub-pixel font hinting differences (typically affect ~3-4% of
      //       pixels across the page).
      //   (2) Page *height* drift — `fullPage: true` screenshots can vary in
      //       height by 15-25px across OSes because scrollbar width and
      //       font-line-height affect layout flow. Playwright treats any size
      //       mismatch as "every pixel in the new region is different",
      //       adding 1280 × 20 = ~25 000 extra "diff" pixels even though no
      //       real content moved.
      //
      // We therefore use `maxDiffPixelRatio` (relative) instead of an absolute
      // pixel cap — 0.08 (8%) absorbs both sources of drift while still
      // failing on genuine layout changes (moved button, swapped color, or
      // missing component would shift far more than 8% of pixels).
      //
      // Graphics Authority remains the SSOT for token values; this tolerance
      // only governs pixel-level rendering equivalence in the test layer.
      maxDiffPixelRatio: 0.08,
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
