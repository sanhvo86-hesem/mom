import { test, expect } from '@playwright/test';

const ncTabFixtures = [
  ['overview', 'authoritative-record-shell-nc-overview.html', 'Overview'],
  ['investigation', 'authoritative-record-shell-nc-investigation.html', 'Investigation'],
  ['evidence', 'authoritative-record-shell-nc-evidence.html', 'Evidence'],
  ['related', 'authoritative-record-shell-nc-related.html', 'Related records'],
  ['audit', 'authoritative-record-shell-nc-audit.html', 'Audit'],
  ['signatures', 'authoritative-record-shell-nc-signatures.html', 'Signatures'],
] as const;

test.describe('module-template-v4 preview smoke', () => {
  test('keeps production portal inert without fixture script', async ({ page }) => {
    await page.goto('/mom/portal.html');
    await expect(page.locator('#hmv4-ops-shell')).toHaveCount(0);
    const fixtureLoaded = await page.evaluate(() => Boolean((window as any).Hmv4Fixtures));
    expect(fixtureLoaded).toBeFalsy();
    const fixtureMode = await page.evaluate(() => Boolean((window as any).HMV4_FIXTURE_MODE));
    expect(fixtureMode).toBeFalsy();
  });

  test('renders /ops preview shell from fixture route context', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/shell-home.html');
    await expect(page.locator('[data-hm-shell="ops"]')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'HESEM Operations Platform' })).toBeVisible();
    const routeContext = await page.evaluate(() => (window as any).HMV4_FIXTURE_ROUTE_CONTEXT);
    expect(routeContext.path).toBe('/ops');
    expect(new URL(page.url()).pathname).toBe('/ops');
  });

  test('renders dispatch board as a read-only projection workspace', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/workspace-board.html');
    const board = page.locator('[data-hmv4-dispatch-board]');
    await expect(board).toBeVisible();
    await expect(board).toHaveAttribute('data-authority-class', 'projection');
    await expect(board).toHaveAttribute('data-requires-reanchor', 'true');
    await expect(board).toHaveAttribute('data-projection-state', 'current');
    await expect(page.getByRole('heading', { name: 'Dispatch Board' })).toBeVisible();
    await expect(page.locator('[data-hmv4-dispatch-card]')).toHaveCount(3);
    await expect(page.locator('[data-hmv4-dispatch-card][href]')).toHaveCount(0);

    const mutationButtons = page.locator('[data-hmv4-mutation-intent]');
    await expect(mutationButtons).toHaveCount(6);
    const enabledMutationCount = await mutationButtons.evaluateAll((buttons) =>
      buttons.filter((button) => !(button as HTMLButtonElement).disabled).length,
    );
    expect(enabledMutationCount).toBe(0);

    const recordHref = await page.locator('[data-hmv4-record-link]').first().getAttribute('href');
    expect(recordHref).toContain('/ops/records/dispatch-targets/DISP-001?tab=overview');
  });

  test('renders empty dispatch board without mutation controls', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/workspace-board-empty.html');
    const board = page.locator('[data-hmv4-dispatch-board]');
    await expect(board).toBeVisible();
    await expect(board).toHaveAttribute('data-authority-class', 'projection');
    await expect(board).toHaveAttribute('data-projection-state', 'empty');
    await expect(page.locator('[data-hmv4-dispatch-card]')).toHaveCount(0);
    await expect(page.locator('[data-hmv4-mutation-intent]')).toHaveCount(0);
    await expect(page.getByText('No targets')).toHaveCount(3);
  });

  test('renders degraded dispatch board with visible stale state and re-anchor links', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/workspace-board-degraded.html');
    const board = page.locator('[data-hmv4-dispatch-board]');
    await expect(board).toBeVisible();
    await expect(board).toHaveAttribute('data-authority-class', 'projection');
    await expect(board).toHaveAttribute('data-projection-freshness', 'fixture_stale');
    await expect(board).toHaveAttribute('data-projection-state', 'degraded_offline');
    await expect(page.locator('[data-hmv4-dispatch-freshness]')).toContainText('degraded_offline / fixture_stale');
    await expect(page.locator('[data-hmv4-dispatch-card]')).toHaveCount(2);
    await expect(page.getByText('Blocked / hold')).toBeVisible();
    await expect(page.getByText('offline sync pending')).toBeVisible();
    const recordHref = await page.locator('[data-hmv4-record-link]').last().getAttribute('href');
    expect(recordHref).toContain('/ops/records/dispatch-targets/DISP-011?tab=overview');
  });

  test('parses dispatch board route as workspace with allowed view query', async ({ page }) => {
    await page.goto('/mom/portal.html?hmv4=1');
    const parsed = await page.evaluate(() =>
      (window as any).Hmv4Routes.parsePath('/ops/planning-scheduling/dispatch-board/board', '?view=default'),
    );
    expect(parsed.routeClass).toBe('WS');
    expect(parsed.params.domain).toBe('planning-scheduling');
    expect(parsed.params.module).toBe('dispatch-board');
    expect(parsed.params.workspace_family).toBe('board');
    expect(parsed.query.view).toBe('default');
    expect(parsed.rejectedQuery).toEqual([]);
  });

  test('parses nonconformance case route as authoritative record shell', async ({ page }) => {
    await page.goto('/mom/portal.html?hmv4=1');
    const parsed = await page.evaluate(() =>
      (window as any).Hmv4Routes.parsePath('/ops/records/nonconformance-cases/NC-001', '?tab=overview'),
    );
    expect(parsed.routeClass).toBe('AR');
    expect(parsed.params.resource_family).toBe('nonconformance-cases');
    expect(parsed.params.record_id).toBe('NC-001');
    expect(parsed.query.tab).toBe('overview');
    expect(parsed.rejectedQuery).toEqual([]);
  });

  for (const [tab, fixturePage, panelHeading] of ncTabFixtures) {
    test(`renders nonconformance ${tab} tab as read-only authoritative shell`, async ({ page }) => {
      await page.goto(`/tests/fixtures/module-template-v4/pages/${fixturePage}`);
      const shell = page.locator('[data-hmv4-nonconformance-record]');
      await expect(shell).toBeVisible();
      await expect(shell).toHaveAttribute('data-route-class', 'AR');
      await expect(shell).toHaveAttribute('data-authority-class', 'authoritative');
      await expect(shell).toHaveAttribute('data-resource-family', 'nonconformance-cases');
      await expect(shell).toHaveAttribute('data-root-code', 'NQCASE');
      await expect(shell).toHaveAttribute('data-record-id', 'NC-001');
      await expect(shell).toHaveAttribute('data-query-tab', tab);
      await expect(page.getByRole('heading', { name: 'NC-001' })).toBeVisible();
      await expect(page.locator(`[role="tab"][data-tab="${tab}"]`)).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator(`[data-hmv4-nc-panel="${tab}"]`)).toBeVisible();
      await expect(page.getByRole('heading', { name: panelHeading })).toBeVisible();
      expect(new URL(page.url()).searchParams.get('tab')).toBe(tab);

      const mutationButtons = page.locator('[data-hmv4-mutation-intent]');
      await expect(mutationButtons).toHaveCount(3);
      const enabledMutationCount = await mutationButtons.evaluateAll((buttons) =>
        buttons.filter((button) => !(button as HTMLButtonElement).disabled).length,
      );
      expect(enabledMutationCount).toBe(0);
    });
  }

  test('renders nonconformance conflict fixture with visible degraded posture', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-nc-conflict.html');
    const shell = page.locator('[data-hmv4-nonconformance-record]');
    await expect(shell).toHaveAttribute('data-fixture-state', 'conflict');
    await expect(shell).toHaveAttribute('data-fixture-freshness', 'fixture_conflict');
    await expect(page.locator('[data-hmv4-nc-state]')).toContainText('Conflict detected');
    await expect(page.locator('[data-hmv4-mutation-intent]').first()).toBeDisabled();
  });

  test('renders nonconformance partial-access fixture with visible limitation', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-nc-partial-access.html');
    const shell = page.locator('[data-hmv4-nonconformance-record]');
    await expect(shell).toHaveAttribute('data-fixture-state', 'partial_access');
    await expect(page.locator('[data-hmv4-nc-access]')).toContainText('Investigation notes are restricted');
    await expect(page.locator('[data-hmv4-mutation-intent]').first()).toBeDisabled();
  });

  test('renders nonconformance degraded fixture without enabling mutation', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-nc-degraded.html');
    const shell = page.locator('[data-hmv4-nonconformance-record]');
    await expect(shell).toHaveAttribute('data-fixture-state', 'degraded_offline');
    await expect(shell).toHaveAttribute('data-fixture-freshness', 'fixture_stale');
    await expect(page.locator('[data-hmv4-nc-state]')).toContainText('Degraded/offline fixture');
    const enabledMutationCount = await page.locator('[data-hmv4-mutation-intent]').evaluateAll((buttons) =>
      buttons.filter((button) => !(button as HTMLButtonElement).disabled).length,
    );
    expect(enabledMutationCount).toBe(0);
  });
});
