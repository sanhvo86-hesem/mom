# P02 Rollback Plan

Branch: codex/uom-v5-no-guess-20260530
SHA at start: 247b1fbeabfe8bd07feb3d2265a8c2ec0ec625a4

## Scope

P02 changed report artifacts and the sequential ledger only.

## Rollback Steps

Remove:

- `_reports/uom-v5/P02-current-state-file-inventory.csv`
- `_reports/uom-v5/P02-contradiction-ledger.md`
- `_reports/uom-v5/P02-implementation-report.md`
- `_reports/uom-v5/P02-audit-report.md`
- `_reports/uom-v5/P02-adversarial-critique.md`
- `_reports/uom-v5/P02-operational-simulation.md`
- `_reports/uom-v5/P02-defect-and-repair-log.md`
- `_reports/uom-v5/P02-rollback-plan.md`
- `_reports/uom-v5/P02-test-evidence.md`
- `_reports/uom-v5/P02-decision.json`

Then restore `_reports/uom-v5/00-sequential-gate-ledger.json` to the P01 committed state.

No database, service, controller, route, OpenAPI, JavaScript, runtime config, or app-served document rollback is required.
