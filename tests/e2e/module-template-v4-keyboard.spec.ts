import { test, expect } from '@playwright/test';

test.describe('module-template-v4 keyboard baseline', () => {
  test('record tabs can be focused', async ({ page }) => {
    await page.goto('/ops/records/quotations/QUO-DEMO-001?tab=overview');
    await page.keyboard.press('Tab');
    await expect(page.locator('[role="tablist"]')).toBeVisible();
  });
});
