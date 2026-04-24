import { test, expect } from '@playwright/test';

test.describe('module-template-v4 accessibility baseline', () => {
  test('breadcrumb and main landmarks exist', async ({ page }) => {
    await page.goto('/ops/records/quotations/QUO-DEMO-001');
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('nav[aria-label="Breadcrumb"]')).toBeVisible();
  });
});
