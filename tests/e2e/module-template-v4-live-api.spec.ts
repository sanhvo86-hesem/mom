import { test, expect } from '@playwright/test';

const liveSettledSelector = '[data-hmv4-live-api-error="true"], [data-hmv4-source="live-api"]';

test.describe('hmv4 live api toggle (NQCASE)', () => {
  test('default fixture mode is unaffected', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-nc-overview.html');
    const root = page.locator('[data-hmv4-nonconformance-record]');
    await expect(root).toBeVisible();
    await expect(root).not.toHaveAttribute('data-hmv4-source', 'live-api');
    await expect(page.locator('[data-hmv4-mutation-intent]:not([disabled])')).toHaveCount(0);
  });

  test('live mode body attribute calls plural EQMS alias and settles read-only', async ({ page }) => {
    const liveRequests: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'GET' && request.url().includes('/api/v1/nonconformance-cases/NC-001')) {
        liveRequests.push(request.url());
      }
    });

    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-nc-live-mode.html');
    await page.waitForFunction(
      (selector) => Boolean(document.querySelector(selector)),
      liveSettledSelector,
      { timeout: 10_000 },
    );

    expect(liveRequests.length).toBeGreaterThan(0);
    const errorVisible = await page.locator('[data-hmv4-live-api-error="true"]').isVisible().catch(() => false);
    const liveVisible = await page.locator('[data-hmv4-source="live-api"]').isVisible().catch(() => false);
    expect(errorVisible || liveVisible).toBeTruthy();
    await expect(page.locator('[data-hmv4-mutation-intent]:not([disabled])')).toHaveCount(0);
  });

  test('query string opt-in is recognized without changing portal default', async ({ page }) => {
    await page.goto('/mom/portal.html?hmv4-live-api=1');
    const queryEnabled = await page.evaluate(() => (window as any).Hmv4LiveApi.enabled());
    expect(queryEnabled).toBe(true);

    await page.goto('/mom/portal.html');
    const defaultEnabled = await page.evaluate(() => (window as any).Hmv4LiveApi.enabled());
    expect(defaultEnabled).toBe(false);
    await expect(page.locator('#hmv4-ops-shell')).toHaveCount(0);
  });
});
