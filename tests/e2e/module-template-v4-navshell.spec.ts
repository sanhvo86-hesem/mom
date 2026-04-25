import { test, expect } from '@playwright/test';

test.describe('module-template-v4 navigation shell', () => {
  test('SH /ops renders 3 domain tiles from nav fixture', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/shell-home.html');
    const section = page.locator('[data-hmv4-shell-home]');
    await expect(section).toBeVisible();
    await expect(section).toHaveAttribute('data-route-class', 'SH');
    await expect(page.locator('[data-hmv4-domain-tile]')).toHaveCount(3);
    await expect(page.locator('[data-hmv4-domain-tile][data-domain-key="quality-compliance"]')).toBeVisible();
  });

  test('SH domain links route to /ops/{domain}', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/shell-home.html');
    const links = await page.locator('[data-hmv4-domain-tile]').evaluateAll((nodes) =>
      nodes.map((n) => (n as HTMLAnchorElement).getAttribute('href') || ''),
    );
    expect(links).toContain('/ops/quality-compliance');
    expect(links).toContain('/ops/shopfloor-execution');
    expect(links).toContain('/ops/people-skill-ehs');
  });

  test('DL /ops/quality-compliance parses and renders module tiles', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/domain-landing-quality-compliance.html');
    const section = page.locator('[data-hmv4-domain-landing]');
    await expect(section).toBeVisible();
    await expect(section).toHaveAttribute('data-domain-key', 'quality-compliance');
    await expect(page.locator('[data-hmv4-module-tile]')).toHaveCount(4);
    await expect(page.locator('[data-hmv4-module-tile][data-module-key="quality-case-management"]')).toBeVisible();
    expect(new URL(page.url()).pathname).toBe('/ops/quality-compliance');
  });

  test('DL /ops/shopfloor-execution renders shopfloor modules', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/domain-landing-shopfloor-execution.html');
    const section = page.locator('[data-hmv4-domain-landing]');
    await expect(section).toBeVisible();
    await expect(section).toHaveAttribute('data-domain-key', 'shopfloor-execution');
    await expect(page.locator('[data-hmv4-module-tile]')).toHaveCount(2);
    const links = await page.locator('[data-hmv4-module-tile]').evaluateAll((nodes) =>
      nodes.map((n) => (n as HTMLAnchorElement).getAttribute('href') || ''),
    );
    expect(links.every((h) => h.startsWith('/ops/shopfloor-execution/'))).toBe(true);
  });

  test('ML /ops/shopfloor-execution/dispatch-board renders ready tiles', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/module-landing-dispatch-board.html');
    const section = page.locator('[data-hmv4-module-landing]');
    await expect(section).toBeVisible();
    await expect(section).toHaveAttribute('data-domain-key', 'shopfloor-execution');
    await expect(section).toHaveAttribute('data-module-key', 'dispatch-board');
    await expect(page.locator('[data-hmv4-tile-kind="workspace"]')).toHaveCount(2);
    await expect(page.locator('a[href="/ops/planning-scheduling/dispatch-board/board"]')).toBeVisible();
  });

  test('ML /ops/quality-compliance/quality-case-management exposes record collection + board tiles', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/module-landing-quality-case-management.html');
    const section = page.locator('[data-hmv4-module-landing]');
    await expect(section).toHaveAttribute('data-module-key', 'quality-case-management');
    await expect(page.locator('[data-hmv4-tile-kind="record-collection"]')).toBeVisible();
    await expect(page.locator('[data-hmv4-tile-kind="workspace"]')).toBeVisible();
  });

  test('ML record collection link routes to /ops/records/{family}', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/module-landing-quality-case-management.html');
    const href = await page.locator('[data-hmv4-tile-kind="record-collection"]').first().getAttribute('href');
    expect(href).toBe('/ops/records/nonconformance-cases');
  });

  test('ML empty fixture renders empty-state copy and no mutation controls', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/module-landing-empty.html');
    const section = page.locator('[data-hmv4-module-landing]');
    await expect(section).toHaveAttribute('data-module-key', 'work-orders');
    await expect(page.locator('[data-hmv4-module-empty]')).toBeVisible();
    await expect(page.locator('[data-hmv4-module-empty]')).toContainText('No tiles configured');
    await expect(page.locator('[data-hmv4-mutation-intent]')).toHaveCount(0);
  });

  test('SH/DL/ML route parsers produce expected route classes', async ({ page }) => {
    await page.goto('/mom/portal.html?hmv4=1');
    const shResult = await page.evaluate(() => (window as any).Hmv4Routes.parsePath('/ops', ''));
    expect(shResult.routeClass).toBe('SH');
    const dlResult = await page.evaluate(() => (window as any).Hmv4Routes.parsePath('/ops/quality-compliance', ''));
    expect(dlResult.routeClass).toBe('DL');
    expect(dlResult.params.domain).toBe('quality-compliance');
    const mlResult = await page.evaluate(() => (window as any).Hmv4Routes.parsePath('/ops/quality-compliance/quality-case-management', ''));
    expect(mlResult.routeClass).toBe('ML');
    expect(mlResult.params.domain).toBe('quality-compliance');
    expect(mlResult.params.module).toBe('quality-case-management');
  });
});
