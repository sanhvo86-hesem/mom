import { test, expect, Page } from '@playwright/test';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function listFixturePages(): string[] {
  const abs = join(__dirname, '..', 'fixtures', 'module-template-v4', 'pages');

  return readdirSync(abs)
    .filter((file) => file.endsWith('.html'))
    .sort();
}

const fixturePages = listFixturePages();

async function stabilize(page: Page): Promise<void> {
  await page.waitForSelector('[data-hm-shell="ops"]', { state: 'visible', timeout: 5_000 });
  await page.waitForLoadState('networkidle');

  await page.evaluate(() => {
    const hydration = (window as typeof window & {
      HMModuleTemplateV4Hydration?: { hydrate?: () => void };
    }).HMModuleTemplateV4Hydration;
    hydration?.hydrate?.();
  });

  await page.waitForFunction(() => {
    const content = document.querySelector('[data-hm-slot="route-content"]');
    return Boolean(content && (content.textContent || '').trim().length > 0);
  });

  await page.addStyleTag({
    content: '*, *::before, *::after { transition: none !important; animation: none !important; caret-color: transparent !important; }'
  });

  await page.evaluate(() => {
    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }
  });

  await page.evaluate(async () => {
    await document.fonts?.ready;
  });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.waitForTimeout(100);
}

test.describe('module-template-v4 visual regression', () => {
  test.use({ viewport: { width: 1280, height: 800 } });
  test.skip(({ browserName }) => browserName !== 'chromium', 'Chromium visual baselines only in this slice.');

  for (const fixturePage of fixturePages) {
    test(`visual: ${fixturePage}`, async ({ page }) => {
      await page.goto(`/tests/fixtures/module-template-v4/pages/${fixturePage}`);
      await stabilize(page);

      const snapName = fixturePage.replace(/\.html$/, '.png');
      await expect(page).toHaveScreenshot(snapName, {
        fullPage: true,
        omitBackground: false,
        animations: 'disabled'
      });
    });
  }
});
