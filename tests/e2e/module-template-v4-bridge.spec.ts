import { test, expect } from '@playwright/test';

test.describe('module-template-v4 bridge adapter', () => {
  test('maps legacy dispatch page key to canonical dispatch board', async ({ page }) => {
    await page.goto('/mom/portal.html?hmv4=1');
    const target = await page.evaluate(() => (window as any).Hmv4Bridge.resolvePageKey('dispatch').url);
    expect(target).toContain('/ops/planning-scheduling/dispatch-board/board');
  });
});
