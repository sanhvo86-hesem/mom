import { test, expect } from '@playwright/test';

test.describe('module-template-v4 bridge adapter', () => {
  test('maps legacy dispatch page key to canonical dispatch board', async ({ page }) => {
    await page.goto('/mom/portal.html?hmv4=1');
    const target = await page.evaluate(() => (window as any).Hmv4Bridge.resolvePageKey('dispatch').url);
    expect(target).toContain('/ops/planning-scheduling/dispatch-board/board');
  });

  test('leaves unknown aliases unmapped for decision', async ({ page }) => {
    await page.goto('/mom/portal.html?hmv4=1');
    const result = await page.evaluate(() => (window as any).Hmv4Bridge.resolvePageKey('legacy-unknown'));
    expect(result.policy).toBe('unmapped_needs_decision');
    expect(result.url).toBeNull();
    expect(result.reason).toBe('no_page_key_alias');
  });

  test('maps ncr to record shell only with explicit record context', async ({ page }) => {
    await page.goto('/mom/portal.html?hmv4=1');
    const noContext = await page.evaluate(() => (window as any).Hmv4Bridge.resolveEqmsModule('ncr'));
    expect(noContext.policy).toBe('redirect_then_deprecate');
    expect(noContext.url).toContain('/ops/quality-operations/quality-case-management');
    expect(noContext.url).not.toContain('NC-001');

    const withContext = await page.evaluate(() =>
      (window as any).Hmv4Bridge.resolveEqmsModule('ncr', { recordId: 'NC-001', tab: 'overview' }),
    );
    expect(withContext.policy).toBe('redirect_record_context_only');
    expect(withContext.url).toContain('/ops/records/nonconformance-cases/NC-001?tab=overview');
  });

  test('maps legacy training alias to canonical training-competency module', async ({ page }) => {
    await page.goto('/mom/portal.html?hmv4=1');
    const result = await page.evaluate(() => (window as any).Hmv4Bridge.resolveEqmsModule('training'));
    expect(result.policy).toBe('redirect_then_deprecate');
    expect(result.url).toContain('/ops/people-skill-ehs/training-competency');

    const unmapped = await page.evaluate(() => (window as any).Hmv4Bridge.resolveEqmsModule('training-unknown'));
    expect(unmapped.policy).toBe('unmapped_needs_decision');
    expect(unmapped.url).toBeNull();
    expect(unmapped.reason).toBe('no_eqms_alias');
  });

  test('maps capa to record shell only with explicit record context', async ({ page }) => {
    await page.goto('/mom/portal.html?hmv4=1');
    const noContext = await page.evaluate(() => (window as any).Hmv4Bridge.resolveEqmsModule('capa'));
    expect(noContext.policy).toBe('redirect_then_deprecate');
    expect(noContext.url).toContain('/ops/quality-operations/capa-effectiveness');
    expect(noContext.url).not.toContain('/ops/records/capas/');

    const withContext = await page.evaluate(() =>
      (window as any).Hmv4Bridge.resolveEqmsModule('capa', { recordId: 'CAPA-001', tab: 'overview' }),
    );
    expect(withContext.policy).toBe('redirect_record_context_only');
    expect(withContext.url).toContain('/ops/records/capas/CAPA-001?tab=overview');
  });

  test('maps cdoc to module landing without record context', async ({ page }) => {
    await page.goto('/mom/portal.html?hmv4=1');
    const noContext = await page.evaluate(() => (window as any).Hmv4Bridge.resolveEqmsModule('cdoc'));
    expect(noContext.policy).toBe('redirect_then_deprecate');
    expect(noContext.url).toContain('/ops/document-change-compliance/controlled-docs-records');
    expect(noContext.url).not.toContain('/ops/records/controlled-documents/');
  });

  test('maps cdoc to record shell only with explicit record context', async ({ page }) => {
    await page.goto('/mom/portal.html?hmv4=1');
    const withContext = await page.evaluate(() =>
      (window as any).Hmv4Bridge.resolveEqmsModule('cdoc', { recordId: 'CDOC-001', tab: 'overview' }),
    );
    expect(withContext.policy).toBe('redirect_record_context_only');
    expect(withContext.url).toContain('/ops/records/controlled-documents/CDOC-001?tab=overview');
  });

  test('maps insp to module landing without record context', async ({ page }) => {
    await page.goto('/mom/portal.html?hmv4=1');
    const noContext = await page.evaluate(() => (window as any).Hmv4Bridge.resolveEqmsModule('insp'));
    expect(noContext.policy).toBe('redirect_then_deprecate');
    expect(noContext.url).toContain('/ops/quality-operations/inspection-spc');
    expect(noContext.url).not.toContain('/ops/records/inspections/');
  });

  test('maps insp to record shell only with explicit record context', async ({ page }) => {
    await page.goto('/mom/portal.html?hmv4=1');
    const withContext = await page.evaluate(() =>
      (window as any).Hmv4Bridge.resolveEqmsModule('insp', { recordId: 'INSP-001', tab: 'overview' }),
    );
    expect(withContext.policy).toBe('redirect_record_context_only');
    expect(withContext.url).toContain('/ops/records/inspections/INSP-001?tab=overview');
  });

  test('maps legacy iqc alias same as insp with record context', async ({ page }) => {
    await page.goto('/mom/portal.html?hmv4=1');
    const withContext = await page.evaluate(() =>
      (window as any).Hmv4Bridge.resolveEqmsModule('iqc', { recordId: 'INSP-001', tab: 'sample-results' }),
    );
    expect(withContext.policy).toBe('redirect_record_context_only');
    expect(withContext.url).toContain('/ops/records/inspections/INSP-001?tab=sample-results');
  });

  test('maps jo to job-order record shell only with explicit record context', async ({ page }) => {
    await page.goto('/mom/portal.html?hmv4=1');
    const noContext = await page.evaluate(() => (window as any).Hmv4Bridge.resolveEqmsModule('jo'));
    expect(noContext.policy).toBe('redirect_then_deprecate');
    expect(noContext.url).toContain('/ops/planning-scheduling/job-orders');
    expect(noContext.url).not.toContain('/ops/records/job-orders/');

    const withContext = await page.evaluate(() =>
      (window as any).Hmv4Bridge.resolveEqmsModule('jo', { recordId: 'JO-2026-014', tab: 'overview' }),
    );
    expect(withContext.policy).toBe('redirect_record_context_only');
    expect(withContext.url).toContain('/ops/records/job-orders/JO-2026-014?tab=overview');
  });

  test('maps job-order alias to JO record shell with record_id context', async ({ page }) => {
    await page.goto('/mom/portal.html?hmv4=1');
    const withContext = await page.evaluate(() =>
      (window as any).Hmv4Bridge.resolveEqmsModule('job-order', { record_id: 'JO-2026-014', tab: 'spawned-work-orders' }),
    );
    expect(withContext.policy).toBe('redirect_record_context_only');
    expect(withContext.url).toContain('/ops/records/job-orders/JO-2026-014?tab=spawned-work-orders');
  });

  test('maps so to sales-order record shell only with explicit record context', async ({ page }) => {
    await page.goto('/mom/portal.html?hmv4=1');
    const noContext = await page.evaluate(() => (window as any).Hmv4Bridge.resolveEqmsModule('so'));
    expect(noContext.policy).toBe('redirect_then_deprecate');
    expect(noContext.url).toContain('/ops/customer-order-commit/sales-orders');
    expect(noContext.url).not.toContain('/ops/records/sales-orders/');

    const withContext = await page.evaluate(() =>
      (window as any).Hmv4Bridge.resolveEqmsModule('so', { recordId: 'SO-2026-088', tab: 'overview' }),
    );
    expect(withContext.policy).toBe('redirect_record_context_only');
    expect(withContext.url).toContain('/ops/records/sales-orders/SO-2026-088?tab=overview');
  });

  test('maps sales-order alias to SO record shell with record_id context', async ({ page }) => {
    await page.goto('/mom/portal.html?hmv4=1');
    const withContext = await page.evaluate(() =>
      (window as any).Hmv4Bridge.resolveEqmsModule('sales-order', { record_id: 'SO-2026-088', tab: 'line-items' }),
    );
    expect(withContext.policy).toBe('redirect_record_context_only');
    expect(withContext.url).toContain('/ops/records/sales-orders/SO-2026-088?tab=line-items');
  });

  test('maps wo to work-order record shell only with explicit record context', async ({ page }) => {
    await page.goto('/mom/portal.html?hmv4=1');
    const noContext = await page.evaluate(() => (window as any).Hmv4Bridge.resolveEqmsModule('wo'));
    expect(noContext.policy).toBe('redirect_then_deprecate');
    expect(noContext.url).toContain('/ops/shopfloor-execution/wo-console');
    expect(noContext.url).not.toContain('/ops/records/work-orders/');

    const withContext = await page.evaluate(() =>
      (window as any).Hmv4Bridge.resolveEqmsModule('wo', { recordId: 'WO-3013', tab: 'overview' }),
    );
    expect(withContext.policy).toBe('redirect_record_context_only');
    expect(withContext.url).toContain('/ops/records/work-orders/WO-3013?tab=overview');
  });

  test('maps work-order alias to WO record shell with record_id context', async ({ page }) => {
    await page.goto('/mom/portal.html?hmv4=1');
    const withContext = await page.evaluate(() =>
      (window as any).Hmv4Bridge.resolveEqmsModule('work-order', { record_id: 'WO-3013', tab: 'execution-log' }),
    );
    expect(withContext.policy).toBe('redirect_record_context_only');
    expect(withContext.url).toContain('/ops/records/work-orders/WO-3013?tab=execution-log');
  });

  test('maps cpo to customer-purchase-order record shell only with explicit record context', async ({ page }) => {
    await page.goto('/mom/portal.html?hmv4=1');
    const noContext = await page.evaluate(() => (window as any).Hmv4Bridge.resolveEqmsModule('cpo'));
    expect(noContext.policy).toBe('redirect_then_deprecate');
    expect(noContext.url).toContain('/ops/records/customer-purchase-orders');
    expect(noContext.url).not.toContain('/ops/records/customer-purchase-orders/CPO-2026-077');

    const withContext = await page.evaluate(() =>
      (window as any).Hmv4Bridge.resolveEqmsModule('cpo', { recordId: 'CPO-2026-077', tab: 'acknowledgment' }),
    );
    expect(withContext.policy).toBe('redirect_record_context_only');
    expect(withContext.url).toContain('/ops/records/customer-purchase-orders/CPO-2026-077?tab=acknowledgment');
  });

  test('maps customer-po alias to CPO record shell with record_id context', async ({ page }) => {
    await page.goto('/mom/portal.html?hmv4=1');
    const withContext = await page.evaluate(() =>
      (window as any).Hmv4Bridge.resolveEqmsModule('customer-po', { record_id: 'CPO-2026-077', tab: 'linked-sales-orders' }),
    );
    expect(withContext.policy).toBe('redirect_record_context_only');
    expect(withContext.url).toContain('/ops/records/customer-purchase-orders/CPO-2026-077?tab=linked-sales-orders');
  });
});
