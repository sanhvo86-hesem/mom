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
});
