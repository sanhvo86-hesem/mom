# P12 — Rollback Rehearsal

**Prompt:** HESEM UoM V3 — P12  
**Generated:** 2026-05-29

## V3 rollback scope

V3 P00..P12 deliverables are additive — every patched file was
extended, not destructively rewritten. Rollback is therefore
deterministic and never threatens existing measurement evidence.

## Rollback procedure (in order)

1. **Application code revert**:
   ```
   git revert --no-edit 7191ce817..HEAD     # V3 P00..P12 commits
   git push origin codex/mda-platform-sequential-20260529
   ```
2. **Migration revert** (only if 231 was already applied):
   ```sql
   BEGIN;
   ALTER TABLE uom_conversion_rule DROP CONSTRAINT IF EXISTS uom_cr_approved_requires_owner;
   ALTER TABLE uom_conversion_rule DROP CONSTRAINT IF EXISTS uom_cr_lifecycle_v3;
   ALTER TABLE uom_conversion_rule DROP CONSTRAINT IF EXISTS uom_cr_effective_window;
   ALTER TABLE uom_conversion_rule DROP COLUMN IF EXISTS standard_library_manifest_id;
   DROP TABLE IF EXISTS uom_standard_library_manifest;
   COMMIT;
   ```
3. **Cache flush**: `redis-cli FLUSHDB` (or selective `KEYS uom:rule:*`).
4. **Audit-trail preservation**: `audit_events` rows are append-only;
   revert does NOT remove the
   `uom.v3.p01.seed_first_user_neutralised` audit rows. They stay
   as evidence of the attempt.
5. **MEASVAL envelopes**: never deleted. Historical envelopes remain
   verifiable by `MeasurementEvidenceVerifier` even after a revert,
   because their hash payload is self-contained.

## Rollback constraints (NEVER do)

- NEVER `DELETE FROM audit_events` — append-only.
- NEVER `UPDATE` a previously emitted MEASVAL row.
- NEVER `git reset --hard` on the VPS (per CLAUDE.md VPS deployment
  policy).

## Decision token

```text
UOM_V3_P12_PASS_RELIABILITY_PERFORMANCE_HARDENED
```
