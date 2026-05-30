# P08 Defect And Repair Log

Prompt: P08
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P08 commit: 856c6c5512bb2e06700ec6683f612c72045e99fd
Decision token: UOM_V5_P08_CONTEXTUAL_CONVERSION_LOCKED

## Defects Found And Repaired

- DEFECT: Engine rejected Volume/Mass before contextual density could execute.
  - REPAIR: Engine now invokes contextual planner before semantic rejection for governed contextual routes.
- DEFECT: Potency and packaging routes were classified but not executable.
  - REPAIR: Added `PotencyContextualConverter` and `PackagingContextualConverter`.
- DEFECT: Packaging same-kind CountOrQuantity pairs could bypass planner.
  - REPAIR: Planner checks packaging context before same-kind passthrough and engine invokes planner when `packaging_level` is supplied.
- DEFECT: PHPStan flagged unreachable match arms in potency converter.
  - REPAIR: Removed redundant default arms after guarded unit checks.

## Defects Not Repaired In P08

- OUT_OF_SCOPE_BLOCKER: Full KPI registry count drift remains unrelated to UoM P08.
- CONTROLLED_GAP: Historical backfill and UI remediation remain later prompts.

## Retest

Focused contextual tests, PHP syntax, PHPStan, index regeneration, diff whitespace check, and full `composer check` were run.
