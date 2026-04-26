import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const fixturePages: string[] = [
  'shell-home.html',
  'domain-landing.html',
  'domain-landing-quality-compliance.html',
  'domain-landing-shopfloor-execution.html',
  'module-landing.html',
  'module-landing-quality-case-management.html',
  'module-landing-dispatch-board.html',
  'module-landing-empty.html',
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
  'authoritative-record-shell-capa-overview.html',
  'authoritative-record-shell-capa-analysis.html',
  'authoritative-record-shell-capa-actions.html',
  'authoritative-record-shell-capa-verification.html',
  'authoritative-record-shell-capa-effectiveness.html',
  'authoritative-record-shell-capa-related.html',
  'authoritative-record-shell-capa-audit.html',
  'authoritative-record-shell-capa-signatures.html',
  'authoritative-record-shell-capa-conflict.html',
  'authoritative-record-shell-capa-partial-access.html',
  'authoritative-record-shell-capa-degraded.html',
  'workspace-training-matrix.html',
  'workspace-training-matrix-empty.html',
  'workspace-training-matrix-conflict.html',
  'workspace-training-matrix-partial-access.html',
  'workspace-training-matrix-degraded.html',
  'authoritative-record-shell-cdoc-overview.html',
  'authoritative-record-shell-cdoc-content.html',
  'authoritative-record-shell-cdoc-revisions.html',
  'authoritative-record-shell-cdoc-controlled-copies.html',
  'authoritative-record-shell-cdoc-effectivity.html',
  'authoritative-record-shell-cdoc-related.html',
  'authoritative-record-shell-cdoc-audit.html',
  'authoritative-record-shell-cdoc-signatures.html',
  'authoritative-record-shell-cdoc-conflict.html',
  'authoritative-record-shell-cdoc-partial-access.html',
  'authoritative-record-shell-cdoc-degraded.html',
  'authoritative-record-shell-insp-overview.html',
  'authoritative-record-shell-insp-sample-results.html',
  'authoritative-record-shell-insp-nonconformance-flags.html',
  'authoritative-record-shell-insp-evidence.html',
  'authoritative-record-shell-insp-related.html',
  'authoritative-record-shell-insp-audit.html',
  'authoritative-record-shell-insp-signatures.html',
  'authoritative-record-shell-insp-conflict.html',
  'authoritative-record-shell-insp-partial-access.html',
  'authoritative-record-shell-insp-degraded.html',
  'authoritative-record-shell-jo-overview.html',
  'authoritative-record-shell-jo-dispatch-readiness.html',
  'authoritative-record-shell-jo-spawned-work-orders.html',
  'authoritative-record-shell-jo-material-consumption.html',
  'authoritative-record-shell-jo-progress.html',
  'authoritative-record-shell-jo-related.html',
  'authoritative-record-shell-jo-audit.html',
  'authoritative-record-shell-jo-conflict.html',
  'authoritative-record-shell-jo-partial-access.html',
  'authoritative-record-shell-jo-degraded.html',
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
