import { test, expect } from '@playwright/test';

test.describe('module-template-v4 accessibility baseline', () => {
  test('breadcrumb and main landmarks exist', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell.html');
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('nav[aria-label="Breadcrumb"]')).toBeVisible();
    const routeContext = await page.evaluate(() => (window as any).HMV4_FIXTURE_ROUTE_CONTEXT);
    expect(routeContext.routeClass).toBe('AR');
  });

  test('dispatch board exposes projection and lane semantics', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/workspace-board.html');
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('[data-hmv4-dispatch-board]')).toHaveAttribute('data-authority-class', 'projection');
    await expect(page.locator('[data-hmv4-dispatch-lane="ready"]')).toHaveAttribute('aria-label', 'Ready lane');
    await expect(page.getByRole('status').filter({ hasText: 'Read-only projection' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open dispatch target record' }).first()).toBeVisible();
  });
});
