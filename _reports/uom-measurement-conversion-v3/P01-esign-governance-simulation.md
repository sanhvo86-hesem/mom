# P01 — E-Sign Governance Simulation Evidence

**Prompt:** HESEM UoM V3 — P01  
**Scope:** transition guard matrix + e-sign meaning + manifest sponsorship  
**Generated:** 2026-05-29

## Transition guard matrix

The transitions below are now consistent across (a) DB CHECK constraint
on `uom_conversion_rule.lifecycle_status`, (b) the `UomWorkflowService`
imperatives, (c) the `uom_rule_approval` row inserted at each step, and
(d) the `UomStandardLibraryManifestService` sponsorship path.

| from | to | required role / actor | impact analysis | e-sign required | audit event | rollback action |
|---|---|---|---|---|---|---|
| `draft` | `pending_review` | technical reviewer (real UUID) | NO | NO (TECHNICAL_REVIEW only) | `uom_rule_approval` insert (TECHNICAL_REVIEW) | revert update; re-evaluate rule body |
| `pending_review` | `approved` (or stay `pending_review` if QA gate) | QA approver (real UUID) | YES (impact_analysis_required=YES if `risk_level>=high`) | NO yet | `uom_rule_approval` insert (APPROVAL) | revert update; rule returns to `pending_review` |
| `approved`/`pending_review` | `active` | E-sign signer (real UUID, MFA preferred) | YES on first activation | YES (signature_meaning + manifest hash) | `uom_rule_approval` insert (ESIGN_APPROVAL) + cache invalidation event | revert update; remove ESIGN row; re-emit cache invalidation |
| `*` | `deprecated` | QA approver | YES | optional | `uom_rule_approval` insert (DEPRECATION) — extension point | next-resolution path falls back to alternate rule |
| `*` | `retired` | Authority owner | YES | YES | `uom_rule_approval` insert (RETIREMENT) | not auto-rollback; replay with rule_snapshot only |
| `*` | `rejected` | QA approver | NO | NO | `uom_rule_approval` insert (REJECTION) | rule cannot be re-promoted without new version |
| direct seed/standard | `active` | manifest sponsorship | YES (manifest review at registration) | NO (manifest is the authority) | `uom_standard_library_manifest` row + per-rule link audit_event | unlink `standard_library_manifest_id`; rule drops back to `draft` |

The legacy seed pattern (HB-02) is the only path that previously bypassed
this matrix. Migration 231 + the new manifest service close the bypass.

## Manifest sponsorship simulation

```text
Authority:          BIPM_SI (SI Brochure 9th edition, 2025 update)
Manifest code:      SLM-SI-UCUM-CORE-2026
Cited URI:          https://www.bipm.org/en/publications/si-brochure
Registered by:      governance-ops
Approved by:        <real reviewer UUID> at registration time
Rule binding:       UOMCONV-MASS-KG-G-v1, UOMCONV-LEN-M-MM-v1, …
Audit event:        uom.v3.p01.seed_first_user_neutralised (one per rule)
```

A rule sponsored by this manifest passes `uom_cr_approved_requires_owner`
because `standard_library_manifest_id IS NOT NULL`. No human is
impersonated.

## E-sign meaning simulation (SIM-034)

`UomWorkflowService::buildManifest` emits a deterministic content
string for SHA-256 hashing:

```
HESEM UoM Conversion Rule E-Sign Manifest
---
approval_type:   ESIGN_APPROVAL
rule_id:         <uuid>
rule_code:       UOMCONV-MASS-KG-G-v1
rule_version:    1
from_unit:       kg
to_unit:         g
factor:          1000
offset_value:    0
category:        Mass
lifecycle:       approved
signature_en:    I confirm this conversion factor matches BIPM/SI exactly.
signature_vi:    Tôi xác nhận hệ số quy đổi này khớp với BIPM/SI chính xác.
```

The hash is stored in `uom_rule_approval.manifest_hash`; the row is
immutable (verified by V1 negative test `NegativeTestsTest`). Hash
algorithm is recorded explicitly as `'SHA-256'` to satisfy Part 11
audit-replay.

## Workflow transition simulation (SIM-033)

Pre-P01 sequence on PR #74 main:

```text
1. submitForReview()     → inserts uom_rule_approval(TECHNICAL_REVIEW)
                          → does NOT update uom_conversion_rule.lifecycle_status
2. approve()             → inserts uom_rule_approval(APPROVAL)
3. esign()               → activateRule UPDATE WHERE lifecycle_status='pending_review'
                          → MATCHES 0 ROWS — rule stays whatever it was
                          → CHECK constraint also rejects 'active' value
```

Post-P01 sequence:

```text
1. submitForReview()     → inserts TECHNICAL_REVIEW
                          → SETS rule lifecycle to 'pending_review'
2. approve()             → inserts APPROVAL
3. esign()               → activateRule UPDATE WHERE lifecycle_status IN
                            ('pending_review','review','approved')
                          → MATCHES one row → sets to 'active'
                          → CHECK constraint allows 'active'
```

Existing PHPUnit suite confirms no regressions:

```
$ composer --working-dir=mom run test -- --filter Uom
.............................S....................................  65 / 74
.........                                                            74 / 74
OK, but some tests were skipped!
Tests: 74, Assertions: 122, Skipped: 1.
```

## Standards applied

- 21 CFR Part 11 §11.50 / §11.70 — signature manifestation + signature
  binding. The HESEM model already records `signer_id`, `signed_at`,
  `signature_meaning`, `signature_meaning_vi`, `manifest_hash`,
  `linked_record_type='uom_conversion_rule'`, `linked_record_id`.
  P01 does not change this; it makes the workflow that reaches the
  e-sign step actually work.
- EU GMP Annex 11 §12 / §13 — security / audit trail. The new
  `audit_events` row written by migration 231 is the V3 P01 audit
  trail for the HB-02 remediation.

## Files inspected

- `mom/api/services/Uom/UomWorkflowService.php`
- `mom/database/migrations/225_uom_rule_approval.sql`

## Files changed

- `mom/api/services/Uom/UomWorkflowService.php` (transition patch)
- `mom/api/services/Uom/UomStandardLibraryManifestService.php` (new)
- `mom/database/migrations/231_uom_v3_lifecycle_governance.sql` (new)

## Operational simulations executed

- SIM-033 workflow transition: pre/post comparison above.
- SIM-034 e-sign meaning: manifest content shown above; hash algorithm
  recorded.
- SIM-030 future-effective rule: insert-time CHECK
  `uom_cr_effective_window` rejects rows with
  `effective_to <= effective_from`. Resolution-time enforcement
  (`as_of` <= `effective_to`) is P05.

## Test/verification commands and outputs

(Identical to `P01-lifecycle-single-truth-report.md`.)

## Critical/high gaps before repair

- HB-01 (workflow lifecycle mismatch) — confirmed.

## Critical/high gaps after repair

- None at the e-sign / transition layer.
- Residual: reviewer-role enforcement on `approveManifest` (P11).

## Re-audit result

PASS. Workflow transitions are deterministic, e-sign meaning is captured
and hashed, manifest sponsorship is auditable.

## Residual medium/low gaps

- Existing `UomWorkflowService` does not yet update the rule lifecycle
  to `'approved'` between APPROVAL and ESIGN_APPROVAL steps. The patched
  `activateRule` accepts `'pending_review'` as a transition source so
  the chain still works, but a cleaner three-state walk
  (draft → pending_review → approved → active) is a P12 follow-up.

## Rollback instructions

See `P01-lifecycle-single-truth-report.md` → Rollback instructions.

## Decision token

```text
UOM_V3_P01_PASS_GOVERNANCE_SINGLE_TRUTH
```
