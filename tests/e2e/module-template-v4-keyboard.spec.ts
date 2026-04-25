import { test, expect } from '@playwright/test';

test.describe('module-template-v4 keyboard baseline', () => {
  test('record tabs support arrow-key focus movement', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/authoritative-record-shell.html');
    await expect(page.locator('[role="tablist"]')).toBeVisible();
    const tabs = page.locator('[role="tab"]');
    await expect(tabs.first()).toBeVisible();
    await tabs.first().focus();
    await page.keyboard.press('ArrowRight');
    await expect(tabs.nth(1)).toBeFocused();
  });

  test('dispatch board record links are keyboard reachable while mutation controls stay disabled', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/workspace-board.html');
    const recordLink = page.locator('[data-hmv4-record-link]').first();
    await expect(recordLink).toBeVisible();
    await recordLink.focus();
    await expect(recordLink).toBeFocused();

    const mutationButtons = page.locator('[data-hmv4-mutation-intent]');
    await expect(mutationButtons.first()).toBeDisabled();
    const enabledMutationCount = await mutationButtons.evaluateAll((buttons) =>
      buttons.filter((button) => !(button as HTMLButtonElement).disabled).length,
    );
    expect(enabledMutationCount).toBe(0);
  });

  test('training matrix record links are keyboard reachable while mutation controls stay disabled', async ({ page }) => {
    await page.goto('/tests/fixtures/module-template-v4/pages/workspace-training-matrix.html');
    const recordLink = page.locator('[data-hmv4-record-link]').first();
    await expect(recordLink).toBeVisible();
    await recordLink.focus();
    await expect(recordLink).toBeFocused();

    const mutationButtons = page.locator('[data-hmv4-mutation-intent]');
    await expect(mutationButtons.first()).toBeDisabled();
    const enabledMutationCount = await mutationButtons.evaluateAll((buttons) =>
      buttons.filter((button) => !(button as HTMLButtonElement).disabled).length,
    );
    expect(enabledMutationCount).toBe(0);
  });
});
