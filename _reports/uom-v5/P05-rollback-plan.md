# P05 Rollback Plan

Prompt: P05
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P05 commit: 45f06bd263a6f439d28f118768defc73b5fec3e9
Decision token: UOM_V5_P05_ENGINE_PRECISION_RULE_RESOLUTION_LOCKED

## Code Rollback

1. Revert the P05 commit on `codex/uom-v5-no-guess-20260530`.
2. Regenerate AI index if symbols or reports need to reflect rollback.
3. Run:
   - `php -l` on UoM service/test files.
   - `composer --working-dir=mom run test -- --filter 'Uom|Decimal|Conversion'`.
   - `composer --working-dir=mom run analyse -- --memory-limit=1G`.

## Data Rollback

- REPO_EVIDENCE: P05 adds no migration and writes no runtime data.
- INFERENCE: Rollback is code-only.

## Risk

Reverting P05 would restore non-deterministic unsupported-category behavior and remove the richer MEASVAL replay envelope. Do not revert unless a downstream compatibility issue is found and recorded.
