# P01 Rollback Plan

Branch: codex/uom-v5-no-guess-20260530
SHA at start: 38fd09e9700c48950b4a9d95af1f6f56a5286020

## Scope

P01 changed only generated report artifacts under `_reports/uom-v5/`.

## Rollback Steps

Remove these files:

- `_reports/uom-v5/P01-global-standards-authority-matrix.md`
- `_reports/uom-v5/P01-implementation-report.md`
- `_reports/uom-v5/P01-audit-report.md`
- `_reports/uom-v5/P01-adversarial-critique.md`
- `_reports/uom-v5/P01-operational-simulation.md`
- `_reports/uom-v5/P01-defect-and-repair-log.md`
- `_reports/uom-v5/P01-rollback-plan.md`
- `_reports/uom-v5/P01-test-evidence.md`
- `_reports/uom-v5/P01-decision.json`

Then restore `00-sequential-gate-ledger.json` to the P00 committed state if P01 was already marked complete.

No DB, service, route, OpenAPI, UI, or runtime data rollback is required.
