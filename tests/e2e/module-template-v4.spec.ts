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

test.describe('CDOC record shell (Slice 5)', () => {
  test('renders CDOC overview tab with required attributes', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-cdoc-overview.html');
    const root = page.locator('[data-hmv4-cdoc-record]');
    await expect(root).toBeVisible();
    await expect(root).toHaveAttribute('data-route-class', 'AR');
    await expect(root).toHaveAttribute('data-resource-family', 'controlled-documents');
    await expect(root).toHaveAttribute('data-root-code', 'CDOC');
    await expect(root).toHaveAttribute('data-authority-class', 'authoritative');
    await expect(root).toHaveAttribute('data-record-id', 'CDOC-001');
  });

  for (const tab of ['content', 'revisions', 'controlled-copies', 'effectivity', 'related', 'audit', 'signatures']) {
    test(`renders CDOC ${tab} tab panel`, async ({ page }) => {
      await page.goto(`/tests/fixtures/module-template-v4/pages/authoritative-record-shell-cdoc-${tab}.html`);
      await expect(page.locator(`[data-hmv4-cdoc-panel="${tab}"]:not([hidden])`)).toBeVisible();
    });
  }

  test('CDOC all mutation launchers are disabled', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-cdoc-overview.html');
    const enabled = await page.locator('[data-hmv4-cdoc-launchers] [data-hmv4-mutation-intent]').evaluateAll(
      (buttons) => buttons.filter((b) => !(b as HTMLButtonElement).disabled).length,
    );
    expect(enabled).toBe(0);
  });

  test('CDOC revisions tab renders revision table', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-cdoc-revisions.html');
    const panel = page.locator('[data-hmv4-cdoc-panel="revisions"]:not([hidden])');
    await expect(panel).toBeVisible();
    await expect(panel.locator('table.hmv4-data-table')).toBeVisible();
    await expect(panel.locator('td')).not.toHaveCount(0);
  });

  test('CDOC controlled-copies tab renders copies table', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-cdoc-controlled-copies.html');
    const panel = page.locator('[data-hmv4-cdoc-panel="controlled-copies"]:not([hidden])');
    await expect(panel).toBeVisible();
    await expect(panel.locator('table.hmv4-data-table')).toBeVisible();
  });

  test('CDOC related tab links use data-hmv4-record-open attributes', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-cdoc-related.html');
    const links = page.locator('[data-hmv4-cdoc-panel="related"] [data-hmv4-record-open]');
    await expect(links.first()).toBeVisible();
  });

  test('CDOC conflict state fixture sets data-fixture-state', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-cdoc-conflict.html');
    await expect(page.locator('[data-hmv4-cdoc-record]')).toHaveAttribute('data-fixture-state', 'conflict');
    await expect(page.locator('[data-hmv4-cdoc-record]')).toHaveAttribute('data-fixture-freshness', 'fixture_conflict');
  });

  test('CDOC partial-access state shows partial notice', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-cdoc-partial-access.html');
    await expect(page.locator('[data-hmv4-cdoc-partial]')).toBeVisible();
    await expect(page.locator('[data-hmv4-cdoc-partial]')).toContainText('Partial access');
  });

  test('CDOC degraded state has no enabled mutation launchers', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-cdoc-degraded.html');
    const enabled = await page.locator('[data-hmv4-mutation-intent]').evaluateAll(
      (buttons) => buttons.filter((b) => !(b as HTMLButtonElement).disabled).length,
    );
    expect(enabled).toBe(0);
  });

  test('CDOC lifecycle strip renders all 7 states', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-cdoc-overview.html');
    const items = page.locator('[data-hmv4-cdoc-lifecycle] li');
    await expect(items).toHaveCount(7);
  });

  // ── BREL (Slice 7) ────────────────────────────────────────────────────────

  const brelTabFixtures: [string, string][] = [
    ['release-package', 'authoritative-record-shell-brel-release-package.html'],
    ['quality-evidence', 'authoritative-record-shell-brel-quality-evidence.html'],
    ['genealogy',        'authoritative-record-shell-brel-genealogy.html'],
    ['shipment-readiness','authoritative-record-shell-brel-shipment-readiness.html'],
    ['related',          'authoritative-record-shell-brel-related.html'],
    ['audit',            'authoritative-record-shell-brel-audit.html'],
    ['signatures',       'authoritative-record-shell-brel-signatures.html'],
  ];

  test('renders BREL overview tab as authoritative release shell', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-brel-overview.html');
    const root = page.locator('[data-hmv4-brel-record]');
    await expect(root).toBeVisible();
    await expect(root).toHaveAttribute('data-route-class', 'AR');
    await expect(root).toHaveAttribute('data-resource-family', 'batch-releases');
    await expect(root).toHaveAttribute('data-root-code', 'BREL');
    await expect(root).toHaveAttribute('data-record-id', 'BREL-001');
    await expect(root).toHaveAttribute('data-authority-class', 'authoritative');
    await expect(page.locator('[data-hmv4-brel-panel="overview"]:not([hidden])')).toBeVisible();
  });

  for (const [tab, fixturePage] of brelTabFixtures) {
    test(`renders BREL ${tab} tab as read-only authoritative shell`, async ({ page }) => {
      await page.goto(`/tests/fixtures/module-template-v4/pages/${fixturePage}`);
      const shell = page.locator('[data-hmv4-brel-record]');
      await expect(shell).toBeVisible();
      await expect(shell).toHaveAttribute('data-route-class', 'AR');
      await expect(shell).toHaveAttribute('data-resource-family', 'batch-releases');
      await expect(shell).toHaveAttribute('data-root-code', 'BREL');
      await expect(shell).toHaveAttribute('data-record-id', 'BREL-001');
      await expect(page.locator(`[data-hmv4-brel-panel="${tab}"]:not([hidden])`)).toBeVisible();
      await expect(page.locator('[data-hmv4-mutation-intent]:not([disabled])')).toHaveCount(0);
    });
  }

  test('BREL signatures tab shows 2-person rule status', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-brel-signatures.html');
    const approvers = page.locator('[data-hmv4-brel-approver]');
    await expect(approvers).toHaveCount(2);
  });

  test('BREL release-package tab links to all evidence records', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-brel-release-package.html');
    await expect(page.locator('a[href*="records/inspections/INSP-001"]')).toBeVisible();
    await expect(page.locator('a[href*="records/nonconformance-cases/NC-001"]')).toBeVisible();
    await expect(page.locator('a[href*="records/capas/CAPA-001"]')).toBeVisible();
  });

  test('BREL ALL mutation intents disabled (release safety)', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-brel-overview.html');
    await expect(page.locator('[data-hmv4-mutation-intent]:not([disabled])')).toHaveCount(0);
    for (const intent of ['brel-approve-release','brel-market-ship','brel-recall','brel-esign-2person']) {
      await expect(page.locator(`[data-hmv4-mutation-intent="${intent}"]`)).toHaveAttribute('disabled', '');
    }
  });

  test('BREL conflict state sets fixture-state and stateMessage', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-brel-conflict.html');
    const shell = page.locator('[data-hmv4-brel-record]');
    await expect(shell).toHaveAttribute('data-fixture-state', 'conflict');
    await expect(shell).toHaveAttribute('data-fixture-freshness', 'fixture_conflict');
    await expect(page.locator('[data-hmv4-brel-state]')).toContainText('Conflict');
  });

  test('BREL partial-access shows limitation notice', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-brel-partial-access.html');
    await expect(page.locator('[data-hmv4-brel-partial]')).toBeVisible();
    await expect(page.locator('[data-hmv4-brel-partial]')).toContainText('Approver names masked');
  });

  test('BREL degraded state sets stale freshness and disables mutation', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-brel-degraded.html');
    const shell = page.locator('[data-hmv4-brel-record]');
    await expect(shell).toHaveAttribute('data-fixture-state', 'degraded');
    await expect(shell).toHaveAttribute('data-fixture-freshness', 'fixture_stale');
    await expect(page.locator('[data-hmv4-brel-state]')).toContainText('Degraded');
    await expect(page.locator('[data-hmv4-mutation-intent]:not([disabled])')).toHaveCount(0);
  });

  test('BREL lifecycle strip renders all 7 states', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-brel-overview.html');
    const items = page.locator('[data-hmv4-brel-lifecycle] li');
    await expect(items).toHaveCount(7);
  });
});

test.describe('INSP record shell (Slice 6)', () => {
  test('renders INSP overview tab with required attributes', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-insp-overview.html');
    const root = page.locator('[data-hmv4-insp-record]');
    await expect(root).toBeVisible();
    await expect(root).toHaveAttribute('data-route-class', 'AR');
    await expect(root).toHaveAttribute('data-resource-family', 'inspections');
    await expect(root).toHaveAttribute('data-root-code', 'INSP');
    await expect(root).toHaveAttribute('data-authority-class', 'authoritative');
    await expect(root).toHaveAttribute('data-record-id', 'INSP-001');
  });

  for (const tab of ['sample-results', 'nonconformance-flags', 'evidence', 'related', 'audit', 'signatures']) {
    test(`renders INSP ${tab} tab panel`, async ({ page }) => {
      await page.goto(`/tests/fixtures/module-template-v4/pages/authoritative-record-shell-insp-${tab}.html`);
      await expect(page.locator(`[data-hmv4-insp-panel="${tab}"]:not([hidden])`)).toBeVisible();
    });
  }

  test('INSP all mutation launchers are disabled', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-insp-overview.html');
    const enabled = await page.locator('[data-hmv4-insp-launchers] [data-hmv4-mutation-intent]').evaluateAll(
      (buttons) => buttons.filter((b) => !(b as HTMLButtonElement).disabled).length,
    );
    expect(enabled).toBe(0);
  });

  test('INSP overview tab renders characteristics table', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-insp-overview.html');
    const panel = page.locator('[data-hmv4-insp-panel="overview"]:not([hidden])');
    await expect(panel).toBeVisible();
    await expect(panel.locator('table.hmv4-data-table')).toBeVisible();
  });

  test('INSP sample-results tab renders result cards with pass/fail judgments', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-insp-sample-results.html');
    const panel = page.locator('[data-hmv4-insp-panel="sample-results"]:not([hidden])');
    await expect(panel).toBeVisible();
    await expect(panel.locator('[data-hmv4-status]')).not.toHaveCount(0);
  });

  test('INSP nonconformance-flags tab links to escalated NC', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-insp-nonconformance-flags.html');
    const ncLink = page.locator('[data-hmv4-record-open="nonconformance-cases"][data-hmv4-record-id="NC-001"]');
    await expect(ncLink).toBeVisible();
    await expect(ncLink).toHaveAttribute('href', /\/ops\/records\/nonconformance-cases\/NC-001/);
  });

  test('INSP conflict state sets data-fixture-state and freshness', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-insp-conflict.html');
    await expect(page.locator('[data-hmv4-insp-record]')).toHaveAttribute('data-fixture-state', 'conflict');
    await expect(page.locator('[data-hmv4-insp-record]')).toHaveAttribute('data-fixture-freshness', 'fixture_conflict');
  });

  test('INSP partial-access state shows partial notice', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-insp-partial-access.html');
    await expect(page.locator('[data-hmv4-insp-partial]')).toBeVisible();
    await expect(page.locator('[data-hmv4-insp-partial]')).toContainText('Partial access');
  });

  test('INSP degraded state has no enabled mutation launchers', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-insp-degraded.html');
    const enabled = await page.locator('[data-hmv4-mutation-intent]').evaluateAll(
      (buttons) => buttons.filter((b) => !(b as HTMLButtonElement).disabled).length,
    );
    expect(enabled).toBe(0);
  });

  test('INSP lifecycle strip renders all 5 states', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-insp-overview.html');
    const items = page.locator('[data-hmv4-insp-lifecycle] li');
    await expect(items).toHaveCount(5);
  });
});

test.describe('JO record shell (Slice 9)', () => {
  test('renders JO overview tab', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-jo-overview.html');
    const root = page.locator('[data-hmv4-jo-record]');
    await expect(root).toBeVisible();
    await expect(root).toHaveAttribute('data-route-class', 'AR');
    await expect(root).toHaveAttribute('data-authority-class', 'authoritative');
    await expect(root).toHaveAttribute('data-resource-family', 'job-orders');
    await expect(root).toHaveAttribute('data-root-code', 'JO');
    await expect(root).toHaveAttribute('data-record-id', 'JO-2026-014');
    await expect(root).toHaveAttribute('data-query-tab', 'overview');
  });

  for (const tab of ['dispatch-readiness', 'spawned-work-orders', 'material-consumption', 'progress', 'related', 'audit']) {
    test(`renders JO ${tab} tab`, async ({ page }) => {
      await page.goto(`/tests/fixtures/module-template-v4/pages/authoritative-record-shell-jo-${tab}.html`);
      await expect(page.locator(`[data-hmv4-jo-panel="${tab}"]:not([hidden])`)).toBeVisible();
    });
  }

  test('JO spawned-work-orders tab links to WO records', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-jo-spawned-work-orders.html');
    await expect(page.locator('a[href*="records/work-orders/WO-3011"]')).toBeVisible();
  });

  test('JO material-consumption tab links to lot records', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-jo-material-consumption.html');
    const panel = page.locator('[data-hmv4-jo-panel="material-consumption"]:not([hidden])');
    await expect(panel.locator('[data-hmv4-record-open="lots"][data-hmv4-record-id="LOT-2026-04"]')).toBeVisible();
  });

  test('JO conflict state', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-jo-conflict.html');
    await expect(page.locator('[data-hmv4-jo-record]')).toHaveAttribute('data-fixture-state', 'conflict');
    await expect(page.locator('[data-hmv4-jo-record]')).toHaveAttribute('data-fixture-freshness', 'fixture_conflict');
  });

  test('JO partial access', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-jo-partial-access.html');
    await expect(page.locator('[data-hmv4-jo-partial]')).toBeVisible();
    await expect(page.locator('[data-hmv4-jo-partial]')).toContainText('Partial access');
  });

  test('JO degraded no mutation', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-jo-degraded.html');
    await expect(page.locator('[data-hmv4-mutation-intent]:not([disabled])')).toHaveCount(0);
  });

  test('JO disabled launchers expose all transactional intents', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-jo-overview.html');
    for (const intent of ['jo-release', 'jo-spawn-work-order', 'jo-place-on-hold', 'jo-resume', 'jo-cancel', 'jo-complete']) {
      await expect(page.locator(`[data-hmv4-mutation-intent="${intent}"][disabled]`)).toBeVisible();
    }
  });
});

test.describe('WO record shell (Slice 11)', () => {
  test('parses WO route as authoritative record shell', async ({ page }) => {
    await page.goto('/mom/portal.html?hmv4=1');
    const parsed = await page.evaluate(() =>
      (window as any).Hmv4Routes.parsePath('/ops/records/work-orders/WO-3013', '?tab=overview'),
    );
    expect(parsed.routeClass).toBe('AR');
    expect(parsed.params.resource_family).toBe('work-orders');
    expect(parsed.params.record_id).toBe('WO-3013');
    expect(parsed.query.tab).toBe('overview');
    expect(parsed.rejectedQuery).toEqual([]);
  });

  test('renders WO overview tab', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-wo-overview.html');
    const root = page.locator('[data-hmv4-wo-record]');
    await expect(root).toBeVisible();
    await expect(root).toHaveAttribute('data-route-class', 'AR');
    await expect(root).toHaveAttribute('data-authority-class', 'authoritative');
    await expect(root).toHaveAttribute('data-resource-family', 'work-orders');
    await expect(root).toHaveAttribute('data-root-code', 'WO');
    await expect(root).toHaveAttribute('data-record-id', 'WO-3013');
    await expect(root).toHaveAttribute('data-query-tab', 'overview');
  });

  for (const tab of ['operation-detail', 'resource-allocation', 'execution-log', 'inspections', 'dispatch-status', 'related', 'audit']) {
    test(`renders WO ${tab} tab`, async ({ page }) => {
      await page.goto(`/tests/fixtures/module-template-v4/pages/authoritative-record-shell-wo-${tab}.html`);
      await expect(page.locator(`[data-hmv4-wo-panel="${tab}"]:not([hidden])`)).toBeVisible();
    });
  }

  test('WO inspections tab links to INSP record', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-wo-inspections.html');
    await expect(page.locator('a[href*="records/inspections/INSP-001"]')).toBeVisible();
  });

  test('WO related shows parent JO + dispatch target + escalated NC', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-wo-related.html');
    await expect(page.locator('a[href*="records/job-orders/JO-2026-014"]')).toBeVisible();
    await expect(page.locator('a[href*="records/dispatch-targets/DISP-2026-1107"]')).toBeVisible();
    await expect(page.locator('a[href*="records/nonconformance-cases/NC-001"]')).toBeVisible();
  });

  test('WO execution-log preserves chronological order', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-wo-execution-log.html');
    const entries = page.locator('[data-hmv4-wo-panel="execution-log"] .hmv4-list li');
    await expect(entries).toHaveCount(3);
    await expect(entries.nth(0)).toContainText('2026-04-25 14:00');
    await expect(entries.nth(1)).toContainText('2026-04-25 14:05');
    await expect(entries.nth(2)).toContainText('2026-04-25 14:25');
  });

  test('WO conflict state', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-wo-conflict.html');
    await expect(page.locator('[data-hmv4-wo-record]')).toHaveAttribute('data-fixture-state', 'conflict');
    await expect(page.locator('[data-hmv4-wo-record]')).toHaveAttribute('data-fixture-freshness', 'fixture_conflict');
  });

  test('WO partial access', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-wo-partial-access.html');
    await expect(page.locator('[data-hmv4-wo-partial]')).toBeVisible();
    await expect(page.locator('[data-hmv4-wo-partial]')).toContainText('Partial access');
  });

  test('WO degraded no mutation', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-wo-degraded.html');
    await expect(page.locator('[data-hmv4-mutation-intent]:not([disabled])')).toHaveCount(0);
  });

  test('WO disabled launchers expose all transactional intents', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-wo-overview.html');
    for (const intent of ['wo-release', 'wo-mark-ready', 'wo-start-execution', 'wo-pause', 'wo-resume', 'wo-record-completion', 'wo-record-scrap', 'wo-cancel']) {
      await expect(page.locator(`[data-hmv4-mutation-intent="${intent}"][disabled]`)).toBeVisible();
    }
  });
});

test.describe('SO record shell (Slice 10)', () => {
  test('renders SO overview tab', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-so-overview.html');
    const root = page.locator('[data-hmv4-so-record]');
    await expect(root).toBeVisible();
    await expect(root).toHaveAttribute('data-route-class', 'AR');
    await expect(root).toHaveAttribute('data-authority-class', 'authoritative');
    await expect(root).toHaveAttribute('data-resource-family', 'sales-orders');
    await expect(root).toHaveAttribute('data-root-code', 'SO');
    await expect(root).toHaveAttribute('data-record-id', 'SO-2026-088');
    await expect(root).toHaveAttribute('data-query-tab', 'overview');
  });

  for (const tab of ['line-items', 'linked-job-orders', 'shipment-allocation', 'invoicing', 'related', 'audit']) {
    test(`renders SO ${tab} tab`, async ({ page }) => {
      await page.goto(`/tests/fixtures/module-template-v4/pages/authoritative-record-shell-so-${tab}.html`);
      await expect(page.locator(`[data-hmv4-so-panel="${tab}"]:not([hidden])`)).toBeVisible();
    });
  }

  test('SO linked-job-orders tab links to JO record', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-so-linked-job-orders.html');
    await expect(page.locator('a[href*="records/job-orders/JO-2026-014"]')).toBeVisible();
  });

  test('SO line-items shows quantity progression', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-so-line-items.html');
    await expect(page.locator('[data-hmv4-so-panel="line-items"] table tbody tr')).toHaveCount(1);
    await expect(page.locator('[data-hmv4-so-panel="line-items"]')).toContainText('0%');
  });

  test('SO conflict state', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-so-conflict.html');
    await expect(page.locator('[data-hmv4-so-record]')).toHaveAttribute('data-fixture-state', 'conflict');
    await expect(page.locator('[data-hmv4-so-record]')).toHaveAttribute('data-fixture-freshness', 'fixture_conflict');
  });

  test('SO partial access', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-so-partial-access.html');
    await expect(page.locator('[data-hmv4-so-partial]')).toBeVisible();
    await expect(page.locator('[data-hmv4-so-partial]')).toContainText('Partial access');
  });

  test('SO degraded no mutation', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-so-degraded.html');
    await expect(page.locator('[data-hmv4-mutation-intent]:not([disabled])')).toHaveCount(0);
  });

  test('SO disabled launchers expose all transactional intents', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-so-overview.html');
    for (const intent of ['so-confirm', 'so-release', 'so-spawn-job-order', 'so-allocate-shipment', 'so-invoice', 'so-cancel', 'so-complete']) {
      await expect(page.locator(`[data-hmv4-mutation-intent="${intent}"][disabled]`)).toBeVisible();
    }
  });

  test('SO lifecycle strip renders all 5 fixture states', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-so-overview.html');
    await expect(page.locator('[data-hmv4-so-lifecycle] li')).toHaveCount(5);
  });
});

test.describe('CPO record shell (Slice 12)', () => {
  test('parses CPO route as authoritative record shell', async ({ page }) => {
    await page.goto('/mom/portal.html?hmv4=1');
    const parsed = await page.evaluate(() =>
      (window as any).Hmv4Routes.parsePath('/ops/records/customer-purchase-orders/CPO-2026-077', '?tab=overview'),
    );
    expect(parsed.routeClass).toBe('AR');
    expect(parsed.params.resource_family).toBe('customer-purchase-orders');
    expect(parsed.params.record_id).toBe('CPO-2026-077');
    expect(parsed.query.tab).toBe('overview');
    expect(parsed.rejectedQuery).toEqual([]);
  });

  test('renders CPO overview tab', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-cpo-overview.html');
    const root = page.locator('[data-hmv4-cpo-record]');
    await expect(root).toBeVisible();
    await expect(root).toHaveAttribute('data-route-class', 'AR');
    await expect(root).toHaveAttribute('data-authority-class', 'authoritative');
    await expect(root).toHaveAttribute('data-resource-family', 'customer-purchase-orders');
    await expect(root).toHaveAttribute('data-root-code', 'CPO');
    await expect(root).toHaveAttribute('data-record-id', 'CPO-2026-077');
    await expect(root).toHaveAttribute('data-query-tab', 'overview');
  });

  for (const tab of ['line-items', 'terms-and-conditions', 'linked-sales-orders', 'acknowledgment', 'related', 'audit']) {
    test(`renders CPO ${tab} tab`, async ({ page }) => {
      await page.goto(`/tests/fixtures/module-template-v4/pages/authoritative-record-shell-cpo-${tab}.html`);
      await expect(page.locator(`[data-hmv4-cpo-panel="${tab}"]:not([hidden])`)).toBeVisible();
    });
  }

  test('CPO linked-sales-orders links to SO record', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-cpo-linked-sales-orders.html');
    await expect(page.locator('a[href*="records/sales-orders/SO-2026-088"]')).toBeVisible();
  });

  test('CPO acknowledgment shows deviations from customer PO', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-cpo-acknowledgment.html');
    await expect(page.locator('text=deliveryDate')).toBeVisible();
    await expect(page.locator('text=2026-05-02')).toBeVisible();
  });

  test('CPO terms-and-conditions shows custom clauses', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-cpo-terms-and-conditions.html');
    await expect(page.locator('text=cancel without penalty')).toBeVisible();
  });

  test('CPO conflict state', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-cpo-conflict.html');
    await expect(page.locator('[data-hmv4-cpo-record]')).toHaveAttribute('data-fixture-state', 'conflict');
    await expect(page.locator('[data-hmv4-cpo-record]')).toHaveAttribute('data-fixture-freshness', 'fixture_conflict');
  });

  test('CPO partial-access masks total value', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-cpo-partial-access.html');
    await expect(page.locator('[data-hmv4-cpo-partial]')).toBeVisible();
    await expect(page.locator('[data-hmv4-cpo-total-value="masked"]').first()).toBeVisible();
  });

  test('CPO degraded no mutation', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-cpo-degraded.html');
    await expect(page.locator('[data-hmv4-mutation-intent]:not([disabled])')).toHaveCount(0);
  });

  test('CPO disabled launchers expose all commercial intents', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-cpo-overview.html');
    for (const intent of ['cpo-acknowledge', 'cpo-reject', 'cpo-spawn-sales-order', 'cpo-amend']) {
      await expect(page.locator(`[data-hmv4-mutation-intent="${intent}"][disabled]`)).toBeVisible();
    }
  });

  test('CPO lifecycle strip renders all 5 fixture states', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell-cpo-overview.html');
    await expect(page.locator('[data-hmv4-cpo-lifecycle] li')).toHaveCount(5);
  });
});
