import { test, expect } from '@playwright/test';

const ncTabFixtures = [
  ['overview', 'authoritative-record-shell-nc-overview.html', 'Overview'],
  ['investigation', 'authoritative-record-shell-nc-investigation.html', 'Investigation'],
  ['evidence', 'authoritative-record-shell-nc-evidence.html', 'Evidence'],
  ['related', 'authoritative-record-shell-nc-related.html', 'Related records'],
  ['audit', 'authoritative-record-shell-nc-audit.html', 'Audit'],
  ['signatures', 'authoritative-record-shell-nc-signatures.html', 'Signatures'],
] as const;

const capaTabFixtures = [
  ['analysis', 'authoritative-record-shell-capa-analysis.html'],
  ['actions', 'authoritative-record-shell-capa-actions.html'],
  ['verification', 'authoritative-record-shell-capa-verification.html'],
  ['effectiveness', 'authoritative-record-shell-capa-effectiveness.html'],
  ['related', 'authoritative-record-shell-capa-related.html'],
  ['audit', 'authoritative-record-shell-capa-audit.html'],
  ['signatures', 'authoritative-record-shell-capa-signatures.html'],
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

  test('renders shell home with 3 domain tiles', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/shell-home.html');
    const root = page.locator('[data-hmv4-shell-home]');
    await expect(root).toBeVisible();
    await expect(root).toHaveAttribute('data-route-class', 'SH');
    await expect(page.locator('[data-hmv4-domain-tile]')).toHaveCount(3);
    await expect(page.locator('[data-hmv4-shell-search] input')).toBeDisabled();
  });

  test('renders domain landing with module tiles', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/domain-landing-quality-compliance.html');
    const root = page.locator('[data-hmv4-domain-landing]');
    await expect(root).toHaveAttribute('data-route-class', 'DL');
    await expect(root).toHaveAttribute('data-domain-key', 'quality-compliance');
    await expect(page.locator('[data-hmv4-module-tile]')).toHaveCount(4);
  });

  test('renders module landing with tiles', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/module-landing-quality-case-management.html');
    const root = page.locator('[data-hmv4-module-landing]');
    await expect(root).toHaveAttribute('data-route-class', 'ML');
    await expect(root).toHaveAttribute('data-module-key', 'quality-case-management');
    await expect(page.locator('a[href*="/records/nonconformance-cases"]')).toBeVisible();
  });

  test('module landing empty state', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/module-landing-empty.html');
    await expect(page.locator('[data-hmv4-module-empty]')).toBeVisible();
  });

  test('unknown domain renders re-anchor', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/domain-landing.html?bogus=1');
    const root = page.locator('[data-hmv4-domain-landing]');
    await expect(root).toHaveAttribute('data-fixture-state', 'unknown');
    await expect(root.locator('a[href="/ops"]')).toBeVisible();
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

  test('parses CAPA route as authoritative record shell', async ({ page }) => {
    await page.goto('/mom/portal.html?hmv4=1');
    const parsed = await page.evaluate(() =>
      (window as any).Hmv4Routes.parsePath('/ops/records/capas/CAPA-001', '?tab=overview'),
    );
    expect(parsed.routeClass).toBe('AR');
    expect(parsed.params.resource_family).toBe('capas');
    expect(parsed.params.record_id).toBe('CAPA-001');
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

  test('renders CAPA overview tab as authoritative shell', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-capa-overview.html');
    const root = page.locator('[data-hmv4-capa-record]');
    await expect(root).toBeVisible();
    await expect(root).toHaveAttribute('data-route-class', 'AR');
    await expect(root).toHaveAttribute('data-authority-class', 'authoritative');
    await expect(root).toHaveAttribute('data-resource-family', 'capas');
    await expect(root).toHaveAttribute('data-root-code', 'CAPA');
    await expect(root).toHaveAttribute('data-record-id', 'CAPA-001');
    await expect(root).toHaveAttribute('data-query-tab', 'overview');
    await expect(page.locator('[data-hmv4-capa-panel="overview"]:not([hidden])')).toBeVisible();
    await expect(page.locator('[data-hmv4-mutation-intent]')).toHaveCount(10);
    await expect(page.locator('[data-hmv4-mutation-intent]:not([disabled])')).toHaveCount(0);
  });

  for (const [tab, fixturePage] of capaTabFixtures) {
    test(`renders CAPA ${tab} tab as read-only authoritative shell`, async ({ page }) => {
      await page.goto(`/tests/fixtures/module-template-v4/pages/${fixturePage}`);
      const shell = page.locator('[data-hmv4-capa-record]');
      await expect(shell).toBeVisible();
      await expect(shell).toHaveAttribute('data-route-class', 'AR');
      await expect(shell).toHaveAttribute('data-authority-class', 'authoritative');
      await expect(shell).toHaveAttribute('data-resource-family', 'capas');
      await expect(shell).toHaveAttribute('data-root-code', 'CAPA');
      await expect(shell).toHaveAttribute('data-record-id', 'CAPA-001');
      await expect(shell).toHaveAttribute('data-query-tab', tab);
      await expect(page.locator(`[role="tab"][data-tab="${tab}"]`)).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator(`[data-hmv4-capa-panel="${tab}"]:not([hidden])`)).toBeVisible();
      await expect(page.locator('[data-hmv4-mutation-intent]')).toHaveCount(10);
      await expect(page.locator('[data-hmv4-mutation-intent]:not([disabled])')).toHaveCount(0);
    });
  }

  test('renders CAPA conflict fixture with visible conflict posture', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-capa-conflict.html');
    const shell = page.locator('[data-hmv4-capa-record]');
    await expect(shell).toHaveAttribute('data-fixture-state', 'conflict');
    await expect(shell).toHaveAttribute('data-fixture-freshness', 'fixture_conflict');
    await expect(page.locator('[data-hmv4-capa-state]')).toContainText('Conflict detected');
    await expect(page.locator('[data-hmv4-mutation-intent]:not([disabled])')).toHaveCount(0);
  });

  test('renders CAPA partial-access fixture with visible limitation', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-capa-partial-access.html');
    const shell = page.locator('[data-hmv4-capa-record]');
    await expect(shell).toHaveAttribute('data-fixture-state', 'partial_access');
    await expect(page.locator('[data-hmv4-capa-partial]')).toContainText('Action assignees are masked');
    await expect(page.locator('[data-hmv4-mutation-intent]:not([disabled])')).toHaveCount(0);
  });

  test('renders CAPA degraded fixture without enabling mutation', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-capa-degraded.html');
    const shell = page.locator('[data-hmv4-capa-record]');
    await expect(shell).toHaveAttribute('data-fixture-state', 'degraded');
    await expect(shell).toHaveAttribute('data-fixture-freshness', 'fixture_stale');
    await expect(page.locator('[data-hmv4-capa-state]')).toContainText('Degraded/offline fixture');
    await expect(page.locator('[data-hmv4-mutation-intent]:not([disabled])')).toHaveCount(0);
  });

  test('parses training matrix route as workspace with allowed view query', async ({ page }) => {
    await page.goto('/mom/portal.html?hmv4=1');
    const parsed = await page.evaluate(() =>
      (window as any).Hmv4Routes.parsePath('/ops/people-skill-ehs/training-competency/matrix', '?view=default'),
    );
    expect(parsed.routeClass).toBe('WS');
    expect(parsed.params.domain).toBe('people-skill-ehs');
    expect(parsed.params.module).toBe('training-competency');
    expect(parsed.params.workspace_family).toBe('matrix');
    expect(parsed.query.view).toBe('default');
    expect(parsed.rejectedQuery).toEqual([]);
  });

  test('renders training matrix as a read-only projection workspace', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/workspace-training-matrix.html');
    const matrix = page.locator('[data-hmv4-training-matrix]');
    await expect(matrix).toBeVisible();
    await expect(matrix).toHaveAttribute('data-route-class', 'WS');
    await expect(matrix).toHaveAttribute('data-authority-class', 'projection');
    await expect(matrix).toHaveAttribute('data-resource-family', 'training-records');
    await expect(matrix).toHaveAttribute('data-root-code', 'TRAIN');
    await expect(matrix).toHaveAttribute('data-requires-reanchor', 'true');
    await expect(matrix).toHaveAttribute('data-projection-state', 'current');
    await expect(page.getByRole('heading', { name: 'Training matrix' })).toBeVisible();

    const grid = page.locator('[data-hmv4-training-matrix-grid]');
    await expect(grid).toBeVisible();
    await expect(grid).toHaveAttribute('role', 'grid');
    await expect(page.locator('[data-hmv4-training-operator]')).toHaveCount(3);
    await expect(page.locator('[data-hmv4-training-qual]')).toHaveCount(4);

    const statusTexts = await page.locator('[data-hmv4-training-status-text]').allTextContents();
    expect(statusTexts).toContain('qualified');
    expect(statusTexts).toContain('expiring');
    expect(statusTexts).toContain('expired');
    expect(statusTexts).toContain('in_training');
    expect(statusTexts).toContain('not_required');

    const mutationButtons = page.locator('[data-hmv4-mutation-intent]');
    await expect(mutationButtons).toHaveCount(3);
    const enabledMutationCount = await mutationButtons.evaluateAll((buttons) =>
      buttons.filter((button) => !(button as HTMLButtonElement).disabled).length,
    );
    expect(enabledMutationCount).toBe(0);

    const recordHrefs = await page.locator('[data-hmv4-record-link]').evaluateAll((nodes) =>
      nodes.map((n) => (n as HTMLAnchorElement).getAttribute('href') || ''),
    );
    expect(recordHrefs.some((h) => h.startsWith('/ops/records/training-records/'))).toBeTruthy();
    expect(recordHrefs.some((h) => h.includes('?tab=overview'))).toBeTruthy();
  });

  test('renders empty training matrix without enabling mutation', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/workspace-training-matrix-empty.html');
    const matrix = page.locator('[data-hmv4-training-matrix]');
    await expect(matrix).toBeVisible();
    await expect(matrix).toHaveAttribute('data-projection-state', 'empty');
    await expect(page.locator('[data-hmv4-training-matrix-grid]')).toHaveCount(0);
    await expect(page.locator('[data-hmv4-training-empty]')).toContainText('No operators in scope');
    const enabledMutationCount = await page.locator('[data-hmv4-mutation-intent]').evaluateAll((buttons) =>
      buttons.filter((button) => !(button as HTMLButtonElement).disabled).length,
    );
    expect(enabledMutationCount).toBe(0);
  });

  test('renders conflict training matrix with visible conflict text', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/workspace-training-matrix-conflict.html');
    const matrix = page.locator('[data-hmv4-training-matrix]');
    await expect(matrix).toHaveAttribute('data-projection-state', 'conflict');
    await expect(matrix).toHaveAttribute('data-projection-freshness', 'fixture_conflict');
    await expect(page.locator('[data-hmv4-training-freshness]')).toContainText('conflict / fixture_conflict');
    await expect(page.getByText('Conflict detected.')).toBeVisible();
    const enabledMutationCount = await page.locator('[data-hmv4-mutation-intent]').evaluateAll((buttons) =>
      buttons.filter((button) => !(button as HTMLButtonElement).disabled).length,
    );
    expect(enabledMutationCount).toBe(0);
  });

  test('renders partial-access training matrix with visible limitation', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/workspace-training-matrix-partial-access.html');
    const matrix = page.locator('[data-hmv4-training-matrix]');
    await expect(matrix).toHaveAttribute('data-projection-state', 'partial_access');
    await expect(page.locator('[data-hmv4-training-access]')).toContainText('Quality-Lab operators are restricted');
    await expect(page.locator('[data-hmv4-training-operator]')).toHaveCount(1);
    await expect(page.locator('[data-hmv4-training-qual]')).toHaveCount(2);
    await expect(page.locator('[data-hmv4-training-filters]')).toContainText('scope: logistics');
    const enabledMutationCount = await page.locator('[data-hmv4-mutation-intent]').evaluateAll((buttons) =>
      buttons.filter((button) => !(button as HTMLButtonElement).disabled).length,
    );
    expect(enabledMutationCount).toBe(0);
  });

  test('renders degraded training matrix with visible stale state', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/workspace-training-matrix-degraded.html');
    const matrix = page.locator('[data-hmv4-training-matrix]');
    await expect(matrix).toHaveAttribute('data-projection-state', 'degraded_offline');
    await expect(matrix).toHaveAttribute('data-projection-freshness', 'fixture_stale');
    await expect(page.locator('[data-hmv4-training-freshness]')).toContainText('degraded_offline / fixture_stale');
    const recordHref = await page.locator('[data-hmv4-record-link]').first().getAttribute('href');
    expect(recordHref).toContain('/ops/records/training-records/');
    expect(recordHref).toContain('?tab=overview');
    const enabledMutationCount = await page.locator('[data-hmv4-mutation-intent]').evaluateAll((buttons) =>
      buttons.filter((button) => !(button as HTMLButtonElement).disabled).length,
    );
    expect(enabledMutationCount).toBe(0);
  });

  test('training matrix record-open links route to the training-records authority', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/workspace-training-matrix.html');
    const recordHrefs = await page.locator('[data-hmv4-record-link]').evaluateAll((nodes) =>
      nodes.map((n) => (n as HTMLAnchorElement).getAttribute('href') || ''),
    );
    expect(recordHrefs.length).toBeGreaterThan(0);
    for (const href of recordHrefs) {
      expect(href).toMatch(/^\/ops\/records\/training-records\/[A-Za-z0-9_-]+\?tab=overview$/);
    }
  });
});
