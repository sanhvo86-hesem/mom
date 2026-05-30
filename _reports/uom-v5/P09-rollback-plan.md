# P09 Rollback Plan

Prompt: P09
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P09 commit: 3ac8a1bad7f4e088dd2222641dc4599716395c7a
Decision token: UOM_V5_P09_MEASVAL_DIGITAL_THREAD_LOCKED

## Code Rollback

- Revert `mom/api/services/Uom/MeasurementValueFactory.php`.
- Remove `mom/api/services/Uom/NakedNumberMeasurementScanner.php`.
- Remove `mom/tests/Unit/Uom/MeasurementValueP09Test.php`.
- Regenerate AI indexes.

## Data Safety

- P09 adds no migration and does not rewrite historical envelopes.
- Existing envelopes remain replayable through existing fields.

## Verification After Rollback

- `composer --working-dir=mom run test -- --filter 'MeasurementValue|Measval|DigitalThread|Uom'`.
- `composer --working-dir=mom run analyse -- --memory-limit=1G`.
