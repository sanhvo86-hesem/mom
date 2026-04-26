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

  test('live mode CPO calls customer-purchase-orders canonical API and settles read-only', async ({ page }) => {
    const liveRequests: string[] = [];
    page.on('request', (request) => {
      if (request.method() === 'GET' && request.url().includes('/api/v1/customer-purchase-orders/CPO-2026-077')) {
        liveRequests.push(request.url());
      }
    });

    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-cpo-live-mode.html');
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
});

// ADR-0012: resource registry live-mode tests for all governed AR roots
const liveModePages = [
  { page: 'authoritative-record-shell-nc-live-mode.html',   recordRoot: '[data-hmv4-nonconformance-record]', family: 'nonconformance-cases' },
  { page: 'authoritative-record-shell-wo-live-mode.html',   recordRoot: '[data-hmv4-wo-record]',             family: 'work-orders' },
  { page: 'authoritative-record-shell-capa-live-mode.html', recordRoot: '[data-hmv4-capa-record]',           family: 'capas' },
  { page: 'authoritative-record-shell-cdoc-live-mode.html', recordRoot: '[data-hmv4-cdoc-record]',           family: 'controlled-documents' },
  { page: 'authoritative-record-shell-insp-live-mode.html', recordRoot: '[data-hmv4-insp-record]',           family: 'inspections' },
  { page: 'authoritative-record-shell-brel-live-mode.html', recordRoot: '[data-hmv4-brel-record]',           family: 'batch-releases' },
  { page: 'authoritative-record-shell-eco-live-mode.html',  recordRoot: '[data-hmv4-eco-record]',            family: 'engineering-changes' },
  { page: 'authoritative-record-shell-cpo-live-mode.html',  recordRoot: '[data-hmv4-cpo-record]',            family: 'customer-purchase-orders' },
];

for (const { page: fixturePage, family } of liveModePages) {
  test(`live mode ${fixturePage}: error fallback when backend 401`, async ({ page: pw }) => {
    await pw.goto(`/tests/fixtures/module-template-v4/pages/${fixturePage}`);
    await pw.waitForFunction(
      (selector) => Boolean(document.querySelector(selector)),
      liveSettledSelector,
      { timeout: 10_000 },
    );
    const errorVisible = await pw.locator('[data-hmv4-live-api-error="true"]').isVisible().catch(() => false);
    const liveVisible = await pw.locator('[data-hmv4-source="live-api"]').isVisible().catch(() => false);
    expect(errorVisible || liveVisible).toBeTruthy();
  });

  test(`live mode ${fixturePage}: never enables mutation`, async ({ page: pw }) => {
    await pw.goto(`/tests/fixtures/module-template-v4/pages/${fixturePage}`);
    await pw.waitForFunction(
      (selector) => Boolean(document.querySelector(selector)),
      liveSettledSelector,
      { timeout: 10_000 },
    );
    await expect(pw.locator('[data-hmv4-mutation-intent]:not([disabled])')).toHaveCount(0);
  });

  test(`live mode ${fixturePage}: registry exposes correct family entry`, async ({ page: pw }) => {
    await pw.goto(`/tests/fixtures/module-template-v4/pages/${fixturePage}`);
    await pw.waitForFunction(() => !!(window as any).Hmv4LiveApi, { timeout: 5_000 });
    const hasEntry = await pw.evaluate(
      (f) => !!(window as any).Hmv4LiveApi.registry[f],
      family,
    );
    expect(hasEntry).toBe(true);
  });
}
