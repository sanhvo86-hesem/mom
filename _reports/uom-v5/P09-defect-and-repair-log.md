# P09 Defect And Repair Log

Prompt: P09
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P09 commit: 3ac8a1bad7f4e088dd2222641dc4599716395c7a
Decision token: UOM_V5_P09_MEASVAL_DIGITAL_THREAD_LOCKED

## Defects Found And Repaired

- DEFECT: MEASVAL lacked explicit `original_input`.
  - REPAIR: Added original input source/entry metadata.
- DEFECT: Hash payload did not include contextual/linked evidence.
  - REPAIR: Added linked record/advisory/contextual evidence into hash rule payload.
- DEFECT: No naked-number scanner existed for P09 backlog.
  - REPAIR: Added `NakedNumberMeasurementScanner` and backlog report.
- DEFECT: Scanner regex initially missed quoted JSON keys.
  - REPAIR: Updated pattern and retested.

## Defects Not Repaired In P09

- OUT_OF_SCOPE_BLOCKER: Full KPI registry count drift remains unrelated.
- CONTROLLED_GAP: Domain-wide naked-number remediation remains P12/P15.

## Retest

Focused P09/UoM tests, PHP syntax, PHPStan, index regeneration, diff whitespace check, and full check were run.
