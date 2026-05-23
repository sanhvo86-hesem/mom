# KPI Rebuild Final Summary

Date: 2026-05-23
Branch: `codex/kpi-final-integration`
Scope: Track 99 final integration across KPI rebuild Tracks 1-6, rerun after
the parallel-track review.

## 1. Executive Summary

Track 99 was rerun as a real integration pass, not only a Track 6 merge. The
final branch now materializes the main Track 1-4 architecture decisions in the
registry and guard:

- Executive scorecard is reduced from 15 items to a lean 7-KPI core.
- JD scorecards now use `active_candidate_role_scorecard`.
- 39 role cards carry `active_scorecard`, `candidate_bank`, `optional_rotate`,
  `do_not_use`, and fairness notes.
- 39 role-performance mapped metrics were added as governed
  `manual_governed` proposed metrics with dedicated counter metrics.
- ANNEX-128 now includes a registry inventory so usage counts remain true while
  all governed codes are still enumerated.
- KPI integrity guard now validates the active/candidate JD model and exits 0
  with no P0/P1 warnings.

This is still not a production deployment claim. It is a validated integration
branch ready for review/merge workflow.

## 2. Final Official Scorecard Core

The official executive scorecard is now:

| Code | Weight |
|---|---:|
| `OTD` | 18 |
| `COMPLAINT_RATE` | 14 |
| `FPY` | 14 |
| `COPQ` | 14 |
| `PLAN_ADHERENCE` | 14 |
| `WIP_AGING` | 12 |
| `MATERIAL_AVAILABILITY_PLAN` | 14 |

Registry model: `CNC-EXEC-BSC-LEAN-7-2026`.

Former staged/broad items such as `OEE_BOTTLENECK`,
`THROUGHPUT_PER_CONSTRAINT_HOUR`, `GROSS_MARGIN_JOB_FAMILY`,
`SUPPLIER_READINESS`, `CRITICAL_ROLE_CERT_COVERAGE`, and
`RECORDABLE_INCIDENT_RATE` no longer sit in the executive scorecard. They remain
governed operating/gate/candidate metrics where appropriate.

## 3. Runtime / Manual / Staged Counts

KPI integrity guard output after rerun:

| Scope | Runtime | Staged | Manual | Manual governed | Retired |
|---|---:|---:|---:|---:|---:|
| Governance KPIs | 14 | 18 | 0 | 1 | 0 |
| All governed metrics | 18 | 48 | 58 | 40 | 0 |

Other current counts:

- Governance KPI rows: 33.
- Runtime calculated metric list: 28.
- Gate metrics: 21.
- Proposed/operating metrics: 110.
- Official active scorecard items: 7.
- JD roles with active scorecards: 39.

## 4. Gate And JD State

Gate coverage is complete:

| Gate | Metric count |
|---|---:|
| G0 | 2 |
| G1 | 3 |
| G2 | 2 |
| G3 | 2 |
| G4 | 2 |
| G5 | 2 |
| G6 | 2 |
| G7 | 3 |

JD active-count distribution now follows the Track 4 target model:

| Active measures per role | Role count |
|---:|---:|
| 3 | 11 |
| 4 | 21 |
| 5 | 7 |

There is no fixed-five rule. Active counts are role-fit, and candidate measures
do not contribute to automatic reward or discipline.

## 5. Admin / Dashboard / CI Integration

- `DashboardService` now reads the scorecard model id from the registry/catalog
  instead of hardcoding `CNC-EXEC-BSC-15-2026`.
- `check_kpi_integrity.php` validates `active_scorecard` first, supports the
  Track 4 candidate-bank model, and no longer flags role-fit 5-item cards as
  legacy fixed-count debt.
- `audit-kpi-system-matrix.php` renders registry inventory into ANNEX-128.
- Track 5 structured Admin Console and Track 6 fake-drift guard coverage remain
  present.

## 6. Validation Evidence

Commands run on 2026-05-23:

| Command | Result |
|---|---|
| `bash tools/ai/preflight.sh || true` | Expected dirty-tree warning during edits; no branch/upstream drift. |
| `php -l` focused PHP files | Pass. |
| `node --check` KPI admin/JD renderer JS | Pass. |
| `php tools/scripts/kpi/audit-html-kpis.php` | Pass; 867 HTML files, 683 files with KPI text, 4200 occurrences. |
| `php tools/scripts/kpi/audit-kpi-performance-governance.php` | Pass. |
| `php tools/scripts/kpi/audit-kpi-system-matrix.php` | Pass; regenerated JSON/MD/ANNEX-128. |
| `php mom/tools/release/check_kpi_integrity.php` | Pass with zero warnings. |
| `composer --working-dir=mom test -- --filter KpiEngineAuthorityRegistryTest` | Pass; 9 tests, 3022 assertions. |
| `php tools/scripts/ai-index/generate.php --verbose` | Pass; regenerated `.ai` index. |
| `composer --working-dir=mom run check` | Pass; PHPStan 306 files, PHPUnit 603 tests, 6394 assertions, 1 skipped. |
| `php mom/tools/release/check_migration_drift.php || true` | Non-fatal existing P2 prefix collisions: 108, 115, 188. |

## 7. Remaining Non-Blocking Debt

- Migration drift checker still reports three P2 prefix collisions: `108`,
  `115`, and `188`.
- System matrix audit still reports five P2 document-usage findings, mainly
  legacy alias/context-fit cleanup.
- The registry now governs role measures, but source-table graduation for many
  role metrics remains future data-contract work; they are intentionally
  `manual_governed` or staged, not fake runtime.

## 8. GO / NO-GO

GO for integration review: no P0 guard failures, no KPI integrity warnings,
full composer check passes, and Track 1-4 decisions are now materialized in the
registry/guard rather than only described in reports.
