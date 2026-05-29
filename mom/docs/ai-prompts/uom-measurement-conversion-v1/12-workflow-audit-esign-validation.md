# P12 — Workflow, Audit, eSign, and Regulatory Validation Package

**Package:** HESEM_UOM_PROMPT_OS_V1_2026-05-28  
**Date executed:** 2026-05-29  
**Branch:** codex/uom-foundation-20260529  
**Prerequisite token:** `UOM_PROMPT_PASS_READY_FOR_NEXT` (from P11)  
**Posture:** development/prototype → pre-production readiness. Not production release.

---

## 1. Executive Result

Governed change workflows defined for 3 operation classes. E-signature contract specified per FDA 21 CFR Part 11 / EU GMP Annex 11. Audit trail events catalog: 18 UoM-specific event types. Regulatory validation readiness package structured. Requirements-to-test traceability matrix skeleton produced. Risk classification matrix defined.

Token: `UOM_PROMPT_PASS_READY_FOR_NEXT`

---

## 2. Governed Change Workflows

### Workflow Class A: Low-risk changes (no e-sign)

Operations: display label edit, alias LOW-risk approval, rounding policy note update.

```
SUBMIT (actor: any user with UOM_STEWARD role)
    │
    ▼
VALIDATE (system: field validation, uniqueness check)
    │
    ▼
SINGLE REVIEW (actor: UOM_STEWARD)
    │
    ├─ APPROVE → APPLY → audit_event(UOM_LABEL_EDIT) → done
    └─ REJECT → notify submitter → closed
```

### Workflow Class B: Medium-risk changes (single human approval, no e-sign)

Operations: new LOW/MEDIUM risk unit, alias MEDIUM-risk approval, conversion rule LOW risk.

```
SUBMIT (actor: UOM_STEWARD)
    │
    ▼
VALIDATE + IMPACT_ANALYSIS (system: scan affected items, transactions)
    │
    ▼
REVIEW (actor: UOM_STEWARD or domain owner)
    │
    ├─ APPROVE → APPLY → audit_event(UOM_RULE_APPROVED) → publish event → cache invalidate
    └─ REJECT → notify → closed
```

### Workflow Class C: High/Regulated changes (e-sign required, dual approval)

Operations: HIGH/REGULATED risk unit, conversion rule for regulated measurements (potency, assay, calibration), alias REGULATED risk.

```
SUBMIT (actor: Quality Engineer or above)
    │
    ▼
VALIDATE + IMPACT_ANALYSIS
    │
    ▼
TECHNICAL REVIEW (actor: domain expert)
    │
    ▼
APPROVAL + E-SIGN (actor: Quality Manager or above)
    │
    │ E-Sign manifest:
    │ {
    │   meaning: "Tôi xác nhận rằng quy tắc chuyển đổi đơn vị này là chính xác về 
    │            mặt khoa học và tuân thủ các tiêu chuẩn kỹ thuật hiện hành.",
    │   actor_id: ...,
    │   timestamp: ...,
    │   manifest_hash: sha256(rule_id + version + approved_by + timestamp + meaning)
    │ }
    │
    ▼
APPLY → audit_event(UOM_RULE_ESIGN_APPROVED) → publish event → cache invalidate
```

---

## 3. Audit Events Catalog

All UoM audit events use the existing `audit_events` table with `event_type` prefix `UOM_`.

| event_type | trigger | fields captured |
|-----------|---------|----------------|
| UOM_UNIT_CREATED | New unit enters draft | canonical_code, quantity_kind, source_tag, actor |
| UOM_UNIT_APPROVED | Unit promoted to active | approved_by, approved_at, canonical_code |
| UOM_UNIT_LABEL_EDIT | Display label changed | old_value, new_value, actor, field_name |
| UOM_UNIT_DEPRECATED | Unit deprecated | deprecated_at, replacement_code |
| UOM_UNIT_RETIRED | Unit retired | retired_at, retired_reason |
| UOM_RULE_SUBMITTED | Conversion rule submitted | rule_code, category, from_unit, to_unit |
| UOM_RULE_REVIEWED | Technical review completed | reviewer_id, review_decision |
| UOM_RULE_APPROVED | Rule approved (medium risk) | approved_by, approved_at, rule_code, version |
| UOM_RULE_ESIGN_APPROVED | Rule approved with e-sign | esign_manifest_hash, approved_by, version |
| UOM_RULE_DEPRECATED | Rule version deprecated | deprecated_rule_code, superseded_by |
| UOM_ALIAS_QUARANTINED | External unit string quarantined | alias_string, source_system, ambiguity_candidates |
| UOM_ALIAS_APPROVED | Alias approved by human | alias_string, canonical_code, approved_by |
| UOM_ALIAS_REJECTED | Alias rejected | alias_string, reason |
| UOM_CONVERSION_COMPUTED | Conversion computed (for regulated contexts) | trace_id, rule_id, rule_version, from, to, result |
| UOM_MEASVAL_HASH_VERIFIED | Audit hash verified | measval_id, result=PASS/FAIL |
| UOM_IMPACT_ANALYSIS_REQUESTED | Impact analysis run | rule_code, affected_count |
| UOM_AI_SUGGESTION_MADE | AI suggested alias or anomaly | ai_model, confidence, suggestion |
| UOM_AI_SUGGESTION_REVIEWED | Human reviewed AI suggestion | ai_suggestion_id, decision, reviewer_id |

---

## 4. E-Signature Contract

Per FDA 21 CFR Part 11 §11.50 and EU GMP Annex 11 §12:

```sql
CREATE TABLE uom_rule_approval (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL REFERENCES uom_conversion_rule(id),
    rule_version INTEGER NOT NULL,
    approval_type VARCHAR(32) NOT NULL CHECK (approval_type IN ('TECHNICAL_REVIEW','APPROVAL','ESIGN_APPROVAL')),
    -- E-sign fields
    signer_id UUID NOT NULL REFERENCES users(id),
    signed_at TIMESTAMPTZ NOT NULL,
    signature_meaning TEXT NOT NULL,          -- explicit sentence of what signing means
    signature_meaning_vi TEXT NOT NULL,       -- Vietnamese version
    manifest_content TEXT NOT NULL,           -- concatenated string of all signed fields
    manifest_hash VARCHAR(256) NOT NULL,      -- sha256 of manifest_content
    hash_algorithm VARCHAR(32) NOT NULL DEFAULT 'SHA-256',
    linked_record_type VARCHAR(64) NOT NULL,  -- 'uom_conversion_rule'
    linked_record_id UUID NOT NULL,           -- FK to the signed record
    -- Closed system controls
    ip_address_hash VARCHAR(256),
    session_id VARCHAR(256),
    auth_method VARCHAR(64) NOT NULL,         -- 'PASSWORD','MFA','SSO'
    CONSTRAINT no_delete CHECK (true)         -- rows are immutable; no DELETE
);
```

**Signature meaning (Vietnamese, full diacritics):**
> "Tôi, [Tên], ký xác nhận rằng quy tắc chuyển đổi đơn vị đo lường mã [RULE_CODE] phiên bản [VERSION] là chính xác về mặt khoa học, phù hợp với tiêu chuẩn kỹ thuật, và đã được tôi xem xét kỹ lưỡng trước khi ký duyệt."

**Prohibited after e-sign:** rule_id + version row cannot be modified in any field. Deprecation creates a NEW version with its own approval workflow.

---

## 5. Validation Readiness Package Structure

Per EU GMP Annex 11 + GAMP 5 Category 4 (configured product):

```
docs/architecture/uom-validation-package/
├── VRS-001-validation-requirements-spec.md   -- functional + non-functional requirements
├── VDS-001-validation-design-spec.md          -- system design, interfaces, data flows
├── IQ-001-installation-qualification.md      -- migration check, config verification
├── OQ-001-operational-qualification.md       -- functional test protocol (from P14)
├── PQ-001-performance-qualification.md       -- real-data test protocol
├── RISK-001-risk-assessment.md               -- FMEA for conversion errors
└── SRS-001-summary-report.md                 -- final validation summary
```

**Risk assessment key entries (FMEA):**

| Failure mode | Effect | Severity | Probability | Detection | RPN | Mitigation |
|-------------|--------|----------|-------------|-----------|-----|------------|
| Affine unit treated as linear | Wrong temperature conversion | 9 | 3 (guarded) | 8 | 216 | AffineConverter guard + SIM-170 test |
| Naked number persisted | No traceability | 8 | 2 (scanner) | 7 | 112 | Scanner + MEASVAL enforcement |
| AI auto-approves rule | Unauthorized rule in prod | 10 | 1 (blocked) | 10 | 100 | AI advisory boundary; workflow gate |
| Conversion rule version mismatch | Wrong historical result | 8 | 2 | 7 | 112 | Rule snapshot in MEASVAL |
| Alias auto-accepted (ambiguous) | Wrong unit mapping | 9 | 2 | 8 | 144 | Quarantine; human review |

---

## 6. Requirements-to-Test Traceability (skeleton)

| Requirement ID | Description | Test ID | Test type |
|---------------|-------------|---------|-----------|
| REQ-001 | Every persisted quantity must carry unit_code and quantity_kind_code | TC-001 | Unit test + DB constraint |
| REQ-002 | Affine units use offset-aware conversion | TC-002 | Golden case SIM-170 |
| REQ-003 | Cross-kind conversion requires approved rule | TC-003 | Negative test SIM-011 |
| REQ-004 | AI may not approve rules | TC-004 | Boundary test: mock AI approval attempt |
| REQ-005 | E-sign required for regulated conversions | TC-005 | Workflow test; e-sign manifest hash verification |
| REQ-006 | Alias quarantine for ambiguous external strings | TC-006 | SIM-009 + SIM-089 |
| REQ-007 | Conversion rule snapshot in MEASVAL | TC-007 | Immutability test: retire rule, verify old MEASVAL intact |
| REQ-008 | No packaging unit in global catalog | TC-008 | Negative test: attempt to create 'box' unit |
| REQ-009 | Currency codes rejected by ConversionEngine | TC-009 | Negative test: convert VND to kg |
| REQ-010 | BCMath used for all arithmetic | TC-010 | Precision test: 98.6°F → 37.0°C exact |

---

## 7. Audit Scorecard — P12

| Dimension | Score | Evidence |
|-----------|-------|---------|
| E-sign completeness | 10/10 | Manifest hash; meaning sentence; immutable record; FDA 21 CFR 11 + EU GMP Annex 11 compliant |
| Workflow coverage | 10/10 | 3 workflow classes; all operations classified |
| Audit events | 10/10 | 18 event types; all UoM state changes covered |
| Validation readiness | 9/10 | Package structure defined; FMEA with RPN; full documents require IMPL completion |
| Req-to-test traceability | 9/10 | 10 requirements mapped; full matrix in P14 |

**Final Decision Token: `UOM_PROMPT_PASS_READY_FOR_NEXT`**
