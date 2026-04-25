import { test, expect } from '@playwright/test';

const fixturePages: Array<{ file: string; name: string }> = [
  { file: 'shell-home.html', name: 'shell-home' },
  { file: 'workspace-board.html', name: 'workspace-board' },
  { file: 'workspace-board-empty.html', name: 'workspace-board-empty' },
  { file: 'workspace-board-degraded.html', name: 'workspace-board-degraded' },
  { file: 'authoritative-record-shell-nc-overview.html', name: 'nc-overview' },
  { file: 'authoritative-record-shell-nc-investigation.html', name: 'nc-investigation' },
  { file: 'authoritative-record-shell-nc-evidence.html', name: 'nc-evidence' },
  { file: 'authoritative-record-shell-nc-related.html', name: 'nc-related' },
  { file: 'authoritative-record-shell-nc-audit.html', name: 'nc-audit' },
  { file: 'authoritative-record-shell-nc-signatures.html', name: 'nc-signatures' },
  { file: 'authoritative-record-shell-nc-conflict.html', name: 'nc-conflict' },
  { file: 'authoritative-record-shell-nc-partial-access.html', name: 'nc-partial-access' },
  { file: 'authoritative-record-shell-nc-degraded.html', name: 'nc-degraded' },
];

test.describe('module-template-v4 visual regression', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  for (const fp of fixturePages) {
    test(`visual: ${fp.name}`, async ({ page }) => {
      await page.goto(`/tests/fixtures/module-template-v4/pages/${fp.file}`);
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('[data-hm-shell="ops"]', { state: 'visible', timeout: 5_000 });
      await page.evaluate(() => document.fonts && document.fonts.ready);
      await expect(page).toHaveScreenshot(`${fp.name}.png`, {
        fullPage: true,
        omitBackground: false
      });
    });
  }
});
