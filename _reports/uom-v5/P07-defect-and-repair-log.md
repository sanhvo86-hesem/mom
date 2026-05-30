# P07 Defect And Repair Log

Prompt: P07
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P07 commit: 46fe9e0002285b346c8d10ac36616572bd7db369
Decision token: UOM_V5_P07_SEMANTIC_COMPATIBILITY_LOCKED

## Defects Found And Repaired

- DEFECT: Cross-kind mismatch errors did not explain reason, remediation, or trace id.
  - REPAIR: Extended `UomKindMismatchException` and API Problem Details fields.
- DEFECT: No compatibility matrix existed for explicit semantic allow/deny governance.
  - REPAIR: Added migration 259 and service lookup for active compatibility rows.
- DEFECT: Conditional compatibility could accidentally be treated as allowed if only the allowed flag were checked.
  - REPAIR: Service rejects allowed rows with non-empty `condition_schema` until a handler evaluates them.
- DEFECT: PHPStan flagged an unused private hierarchy helper after moving to table-driven compatibility.
  - REPAIR: Removed the unused helper and reran PHPStan successfully.

## Defects Not Repaired In P07

- OUT_OF_SCOPE_BLOCKER: Full KPI registry count drift remains unrelated to UoM P07.
- CONTROLLED_GAP: Work/Moment/Stress registry entries are absent.
- CONTROLLED_GAP: Conditional compatibility handlers remain later controlled work.

## Retest

Focused P07/UoM tests, PHP syntax checks, PHPStan, index regeneration, diff whitespace check, and full `composer check` were run. Full check remains warning-only for unrelated KPI count drift.
