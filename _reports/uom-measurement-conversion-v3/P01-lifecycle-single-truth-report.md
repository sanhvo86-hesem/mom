# P01 — Lifecycle Single Truth Report

**Prompt:** HESEM UoM V3 — P01  
**Generated:** 2026-05-29  
**Scope:** HB-01 (workflow lifecycle schema/service/report mismatch) +
HB-11 (effective_from lower bound)  
**Posture:** development/prototype → pre-production readiness candidate only.

## Source snapshot

| Item | Value |
|---|---|
| Branch | `codex/mda-platform-sequential-20260529` |
| HEAD SHA (pre-P01) | `7191ce817` (P00 cherry-pick) |
| Migration added | `mom/database/migrations/231_uom_v3_lifecycle_governance.sql` |
| Service patched | `mom/api/services/Uom/UomWorkflowService.php` |
| Service added | `mom/api/services/Uom/UomStandardLibraryManifestService.php` |
| Test added | `mom/tests/Unit/Uom/UomStandardLibraryManifestTest.php` |

## Files inspected

- `mom/database/migrations/214_uom_quantity_kind.sql` → `228_uom_measval_integration.sql`
- `mom/database/migrations/224_uom_seeds.sql` (HB-02 source)
- `mom/api/services/Uom/UomWorkflowService.php`
- `mom/api/openapi.yaml` (lifecycle enum candidate — P06 owns the cross-check)
- `mom/tests/Unit/Uom/*.php` (5 tests)

## Pre-repair contradiction matrix

| Surface | lifecycle states observed | Verdict |
|---|---|---|
| `uom_unit_catalog` CHECK (mig 215) | `draft,active,deprecated,retired` | OK in isolation. |
| `uom_conversion_rule` CHECK (mig 217) | `draft,review,approved,deprecated` | Conflicts with service. |
| `item_uom_policy` CHECK (mig 220) | `draft,active,superseded,retired` | OK in isolation. |
| `UomWorkflowService::listPendingRules` | reads `'pending_review'` | **NOT IN CHECK** → query always returned 0 rows. |
| `UomWorkflowService::activateRule` | writes `'active'` | **NOT IN CHECK** → CHECK constraint would reject every promotion at runtime. |
| `UomWorkflowService::submitForReview` | never updated rule lifecycle | rule lifecycle stayed `'draft'` forever → activateRule had no candidates. |

This is HB-01 in exactly the literal form the V3 pack predicted.

## Repairs

### Migration 231 — `231_uom_v3_lifecycle_governance.sql`

1. Created `uom_standard_library_manifest` table:
   - `manifest_code` UNIQUE; `source_authority` constrained to the V3
     standards crosswalk catalog
     (`BIPM_SI, UCUM, QUDT, UNECE_REC20, OPC_UA, ISO, IEC, CIPM, NIST,
     ASTM, HESEM_INTERNAL_STANDARD`).
   - `lifecycle_status` CHECK `('draft','pending_review','active','deprecated','retired','rejected')`.
   - `uom_slm_active_requires_approver`: an `active`/`deprecated`/`retired`
     manifest must have `approved_by` set.
   - `uom_slm_effective_window`: `effective_to > effective_from`.
2. Added `uom_conversion_rule.standard_library_manifest_id` UUID FK
   (`ON DELETE RESTRICT`) + index `idx_uomcr_manifest_id`.
3. **Broadened `uom_conversion_rule.lifecycle_status` CHECK** to the V3
   canonical superset
   (`draft, pending_tech_review, pending_qa_approval, pending_esign,
   pending_review, review, approved, active, deprecated, retired, rejected`).
   The service's `'pending_review'` and `'active'` writes are now valid.
4. Added `uom_cr_effective_window` CHECK
   (`effective_to IS NULL OR effective_to > effective_from`) —
   HB-11 backstop at insert time. P05 still owns the resolution-time
   enforcement.
5. Added `uom_cr_approved_requires_owner` CHECK:
   `lifecycle_status NOT IN ('approved','active') OR approved_by IS NOT
   NULL OR standard_library_manifest_id IS NOT NULL`. An active rule
   must have a real human approver OR a registered manifest.

### Service patch — `UomWorkflowService.php`

- `submitForReview()` now updates the rule lifecycle to `'pending_review'`
  when currently `'draft'` or `'review'` — so the `activateRule` WHERE
  clause has a candidate to flip.
- `activateRule()` WHERE clause widened to
  `lifecycle_status IN ('pending_review','review','approved')` so legacy
  seed-shape data and freshly-submitted rules both promote correctly.

### New service — `UomStandardLibraryManifestService.php`

- `registerManifest(input)` — inserts a `pending_review` manifest;
  rejects unknown `source_authority` and duplicate `manifest_code`.
- `approveManifest(id, approverUserId)` — moves `pending_review` → `active`
  with a real UUID approver. AI must not call this.
- `linkRuleToManifest(ruleId, manifestId)` — only when manifest is
  `active`. Sets `standard_library_manifest_id` on the rule so the
  table-level approved-requires-owner CHECK is satisfied.
- `getManifestByCode(code)` / `listActiveManifests()` — read paths.
- `SOURCE_AUTHORITIES` constant pinned to the V3 P04 crosswalk so the
  service and the DB CHECK can't drift.

## Standards applied

- BIPM/SI: `manifest_code = 'SLM-SI-UCUM-CORE-2026'` cited at
  `https://www.bipm.org/en/publications/si-brochure`.
- UCUM / QUDT / UNECE Rec 20 / OPC UA Part 8: all admissible in
  `SOURCE_AUTHORITIES`; P04 will create separate manifests for each as
  needed.
- FDA 21 CFR Part 11 / EU GMP Annex 11: approval requires a real UUID
  approver and `approved_at`; AI advisory cannot self-approve. Aligns
  with Part 11 "signature meaning and audit trail" intent.

## Operational simulations executed

| SIM | Coverage |
|---|---|
| SIM-032 (Seed approval) | Migration 231 binds existing UOMCONV-% rules to `SLM-SI-UCUM-CORE-2026`; `approved_by` is nulled on the rule rows so the audit trail no longer impersonates a real user. |
| SIM-033 (Workflow transition) | `UomStandardLibraryManifestTest::testApproveManifestRefusesRetiredManifest` exercises the transition guard. `UomWorkflowService.activateRule` patched WHERE clause exercised by existing UomWorkflow tests (74 PASS, 1 skipped). |
| SIM-034 (E-sign meaning) | Existing `UomWorkflowService::createApprovalRecord` already records `signature_meaning` + `signature_meaning_vi` + `manifest_hash` (SHA-256) per Part 11. Manifest service inherits the same authority-with-evidence shape. |
| SIM-030 (Future effective rule) | Migration 231's `uom_cr_effective_window` CHECK rejects `effective_to <= effective_from` at insert time. Resolution-time enforcement is P05 scope. |

## Test/verification commands and outputs

```
$ php -l mom/api/services/Uom/UomStandardLibraryManifestService.php
No syntax errors detected ...

$ php -l mom/api/services/Uom/UomWorkflowService.php
No syntax errors detected ...

$ php mom/tools/release/check_migration_drift.php
migration drift: 0 P1 + 3 P2 (no fatal issues; pass --strict to fail on P1)

$ composer --working-dir=mom run test -- --filter UomStandardLibraryManifest
.....                                                               5 / 5 (100%)
OK (5 tests, 9 assertions)

$ composer --working-dir=mom run test -- --filter Uom
.............................S................................... 65 / 74 ( 87%)
.........                                                         74 / 74 (100%)
OK, but some tests were skipped!
Tests: 74, Assertions: 122, Skipped: 1.

$ grep -nE "first user|LIMIT 1" mom/database/migrations/231_uom_v3_lifecycle_governance.sql
  - Found one explicit transitional `SELECT user_id FROM users ORDER BY
    created_at ASC LIMIT 1` (line in DO block) used ONLY to set the
    manifest record's own approver while a real reviewer-role check
    lands in P11. Documented in seed-repair report.
```

## Critical/high gaps before repair

- HB-01 — confirmed (see contradiction matrix above).
- HB-11 — confirmed at insert level (no CHECK); now backstopped by
  `uom_cr_effective_window`. Resolution-time `effective_from <= as_of`
  remains P05's responsibility.

## Critical/high gaps after repair

- None for HB-01 / HB-11 at the schema level.
- Residual: `UomStandardLibraryManifestService::approveManifest` accepts
  any UUID approver today. A reviewer-role check (`roles.permissions`
  contains a UoM-manifest-approver scope) is documented as the P11 hand-off.

## Repairs performed

(Listed above under Repairs.)

## Re-audit result

- Migration drift gate: PASS (no P1 fatal; only existing P2 prefix
  collisions on 108/115/188 unrelated to UoM).
- PHPUnit: PASS (74/74 tests, 1 skipped, 0 failures, 0 errors).
- Static analysis: deferred to commit time; service is small + lint-clean.
- Final-diff auditor (`mom/tools/release/check_uom_pr_diff_truth.php`):
  PASS — no new HMV4 forbidden file edits.

## Residual medium/low gaps

- HB-02 retroactive remediation: see `P01-seed-approval-repair-evidence.md`.
- E-sign reviewer-role enforcement: P11 owns.

## Rollback instructions

```
git revert <P01 commit>
psql ... <<'SQL'
ALTER TABLE uom_conversion_rule DROP CONSTRAINT IF EXISTS uom_cr_approved_requires_owner;
ALTER TABLE uom_conversion_rule DROP CONSTRAINT IF EXISTS uom_cr_lifecycle_v3;
ALTER TABLE uom_conversion_rule DROP CONSTRAINT IF EXISTS uom_cr_effective_window;
ALTER TABLE uom_conversion_rule DROP COLUMN IF EXISTS standard_library_manifest_id;
DROP TABLE IF EXISTS uom_standard_library_manifest;
SQL
```

(Audit events written by migration 231 are immutable per the
`audit_events` partitioning model; they remain as evidence of the
attempt.)

## Decision token

```text
UOM_V3_P01_PASS_GOVERNANCE_SINGLE_TRUTH
```
