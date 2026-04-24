import { test, expect } from '@playwright/test';

test.describe('module-template-v4 preview smoke', () => {
  test('does not require fixture script in production portal', async ({ page }) => {
    await page.goto('/mom/portal.html?hmv4=1');
    await expect(page.locator('#hmv4-ops-shell')).toBeVisible();
    const fixtureLoaded = await page.evaluate(() => Boolean((window as any).Hmv4Fixtures));
    expect(fixtureLoaded).toBeFalsy();
  });

  test('renders /ops preview shell when routed', async ({ page }) => {
    await page.goto('/ops');
    await expect(page.locator('[data-hm-shell="ops"]')).toBeVisible();
    await expect(page.locator('text=HESEM Operations Platform')).toBeVisible();
  });
});
