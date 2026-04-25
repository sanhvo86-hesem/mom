import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const fixturePages: string[] = [
  'workspace-board.html',
  'workspace-dashboard.html',
  'workspace-board-empty.html',
  'workspace-board-degraded.html',
  'authoritative-record-shell-nc-overview.html',
  'authoritative-record-shell-nc-investigation.html',
  'authoritative-record-shell-nc-evidence.html',
  'authoritative-record-shell-nc-related.html',
  'authoritative-record-shell-nc-audit.html',
  'authoritative-record-shell-nc-signatures.html',
  'authoritative-record-shell-nc-conflict.html',
  'authoritative-record-shell-nc-partial-access.html',
  'authoritative-record-shell-nc-degraded.html',
  'workspace-training-matrix.html',
  'workspace-training-matrix-empty.html',
  'workspace-training-matrix-conflict.html',
  'workspace-training-matrix-partial-access.html',
  'workspace-training-matrix-degraded.html',
];

for (const page of fixturePages) {
  test(`a11y axe-core: ${page} has no critical or serious violations`, async ({ page: pw }) => {
    await pw.goto(`/tests/fixtures/module-template-v4/pages/${page}`);
    await pw.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page: pw })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const blocking = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    if (blocking.length > 0) {
      console.log(
        `\nA11y blocking violations on ${page}:\n` +
          JSON.stringify(
            blocking.map((v) => ({
              id: v.id,
              impact: v.impact,
              description: v.description,
              nodes: v.nodes.length,
              helpUrl: v.helpUrl,
            })),
            null,
            2
          )
      );
    }

    expect(blocking, `Critical or serious a11y violations on ${page}`).toHaveLength(0);
  });
}
