import { test, expect } from '@playwright/test';

test.describe('module-template-v4 navigation shell', () => {
  test('SH /ops renders 14 domain tiles from nav fixture', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/shell-home.html');
    const section = page.locator('section.hmv4-shell-home');
    await expect(section).toBeVisible();
    const tiles = page.locator('[data-hmv4-domain-tile]');
    await expect(tiles).toHaveCount(14);
    const reportedCount = await section.getAttribute('data-domain-tile-count');
    expect(reportedCount).toBe('14');
  });

  test('SH domain links route to /ops/{domain}', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/shell-home.html');
    const firstLink = page.locator('[data-hmv4-domain-link]').first();
    await expect(firstLink).toBeVisible();
    const href = await firstLink.getAttribute('href');
    expect(href).toMatch(/^\/ops\/[a-z0-9-]+$/);
  });

  test('DL /ops/quality-operations parses and renders module tiles', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/domain-landing-quality-operations.html');
    const section = page.locator('section.hmv4-domain-landing');
    await expect(section).toBeVisible();
    await expect(section).toHaveAttribute('data-domain', 'quality-operations');
    const tiles = page.locator('[data-hmv4-module-tile]');
    await expect(tiles).toHaveCount(5);
    await expect(page.locator('[data-hmv4-module-tile="quality-case-management"]')).toBeVisible();
    expect(new URL(page.url()).pathname).toBe('/ops/quality-operations');
  });

  test('DL /ops/shopfloor-execution renders all shopfloor modules', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/domain-landing-shopfloor-execution.html');
    const section = page.locator('section.hmv4-domain-landing');
    await expect(section).toBeVisible();
    await expect(section).toHaveAttribute('data-domain', 'shopfloor-execution');
    const tiles = page.locator('[data-hmv4-module-tile]');
    await expect(tiles).toHaveCount(4);
    const links = await page.locator('[data-hmv4-module-link]').evaluateAll((nodes) =>
      nodes.map((n) => (n as HTMLAnchorElement).getAttribute('href') || ''),
    );
    expect(links.every((h) => h.startsWith('/ops/shopfloor-execution/'))).toBe(true);
  });

  test('ML /ops/planning-scheduling/dispatch-board renders ready tiles', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/module-landing-dispatch-board.html');
    const section = page.locator('section.hmv4-module-landing');
    await expect(section).toBeVisible();
    await expect(section).toHaveAttribute('data-domain', 'planning-scheduling');
    await expect(section).toHaveAttribute('data-module', 'dispatch-board');
    await expect(section).toHaveAttribute('data-module-tile-state', 'ready');
    await expect(page.locator('[data-hmv4-module-workspace="primary"]')).toBeVisible();
    await expect(page.locator('[data-hmv4-module-collection="dispatch-targets"]')).toBeVisible();
    const workspaceLink = await page.locator('[data-hmv4-workspace-link]').first().getAttribute('href');
    expect(workspaceLink).toBe('/ops/planning-scheduling/dispatch-board/board');
  });

  test('ML /ops/quality-operations/quality-case-management exposes triage queue + tower workspaces', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/module-landing-quality-case-management.html');
    const section = page.locator('section.hmv4-module-landing');
    await expect(section).toHaveAttribute('data-module-tile-state', 'ready');
    await expect(page.locator('[data-hmv4-module-workspace="primary"]')).toBeVisible();
    await expect(page.locator('[data-hmv4-module-workspace="tower"]')).toBeVisible();
    await expect(page.locator('[data-hmv4-module-collection="nonconformance-cases"]')).toBeVisible();
  });

  test('ML record-open link routes to /ops/records/{family}/{id}?tab=overview', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/module-landing-quality-case-management.html');
    const recentLink = page.locator('[data-hmv4-record-link]').first();
    await expect(recentLink).toBeVisible();
    const href = await recentLink.getAttribute('href');
    expect(href).toBe('/ops/records/nonconformance-cases/NC-001?tab=overview');
  });

  test('ML empty fixture (inspection-spc) renders empty-state copy and no record-open links', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/module-landing-empty.html');
    const section = page.locator('section.hmv4-module-landing');
    await expect(section).toHaveAttribute('data-module-tile-state', 'empty');
    await expect(page.locator('[data-hmv4-empty-module]')).toBeVisible();
    await expect(page.locator('[data-hmv4-empty-module]')).toContainText('Module ready');
    await expect(page.locator('[data-hmv4-record-link]')).toHaveCount(0);
    await expect(page.locator('[data-hmv4-mutation-intent]')).toHaveCount(0);
  });

  test('SH/DL/ML route parsers produce expected route classes', async ({ page }) => {
    await page.goto('/mom/portal.html?hmv4=1');
    const shResult = await page.evaluate(() => (window as any).Hmv4Routes.parsePath('/ops', ''));
    expect(shResult.routeClass).toBe('SH');
    const dlResult = await page.evaluate(() => (window as any).Hmv4Routes.parsePath('/ops/quality-operations', ''));
    expect(dlResult.routeClass).toBe('DL');
    expect(dlResult.params.domain).toBe('quality-operations');
    const mlResult = await page.evaluate(() => (window as any).Hmv4Routes.parsePath('/ops/quality-operations/quality-case-management', ''));
    expect(mlResult.routeClass).toBe('ML');
    expect(mlResult.params.domain).toBe('quality-operations');
    expect(mlResult.params.module).toBe('quality-case-management');
  });
});
