# 16 — V8 eQMS Regulatory Validation Factory

```text
purpose:        Bind V7 §14 eQMS prose to evidence schemas + Part 11 mechanism + V Model integration
predecessor:    V7 §14 + V5 file 07 + V5 file 08
v8_advance:     evidence_record_v8 schema + Part 11 e-sign workflow + Annex 11 §10 change control
work_package:   WP-V8-EQMS (8 work packages)
owner:          Compliance Lead + Quality Lead
estimate:       ~12 engineering-weeks (across W3, W7, W9)
```

---

## 1. Evidence record schema

```json
{
  "$id":"https://hesem.io/schemas/evidence_record_v8.json",
  "type":"object",
  "required":["evidence_id","evidence_class","subject_root_code","subject_record_id","tenant_id","attested_at","recorded_at","artifact_uri","sha256","signed_by","signature","retention_class"],
  "properties":{
    "evidence_id":{"type":"string","format":"uuid"},
    "evidence_class":{"enum":["validation","signature","telemetry","transaction","rollback","retraining","redteam","audit_anchor","fallback"]},
    "subject_root_code":{"type":"string"},
    "subject_record_id":{"type":"string","format":"uuid"},
    "tenant_id":{"type":"string","format":"uuid"},
    "attested_at":{"type":"string","format":"date-time","description":"when the evidence claims to be true"},
    "recorded_at":{"type":"string","format":"date-time","description":"when system recorded it"},
    "backdate_window_seconds":{"type":"integer","description":"recorded_at - attested_at; if > policy.max_backdate, requires e-sign"},
    "artifact_uri":{"type":"string","format":"uri","description":"S3/Object Lock pointer"},
    "sha256":{"type":"string","pattern":"^[a-f0-9]{64}$"},
    "signed_by":{"type":"string","format":"email"},
    "signature":{"type":"string","description":"ed25519 over (evidence_id+sha256+attested_at)"},
    "retention_class":{"enum":["standard","gxp_long_term","permanent","privacy_subject","gxp_batch_pharma","cmmc_cui"]},
    "evidence_metadata":{"type":"object"}
  }
}
```

---

## 2. Part 11 e-sign workflow (V7 §14 line 25 → V8 mechanism)

```text
Step 1: User initiates regulated transition (e.g. CAPA close)
Step 2: PolicyEngine returns obligation `e_signature: { factor_count: 2, signers: 2 }`
Step 3: UI shows e-sign modal with signature_meaning text "I approve the corrective action close"
Step 4: User 1 challenges: enters password + TOTP within 5min window
        - server captures: principal_id, printed_name (snapshot from USER table), 
          factor_records, signed_at, record_canonical_state_hash (sha256 of current record state)
Step 5: User 2 challenges (within 5min): same flow
Step 6: Signatures bundled into command's signature_envelope; command submitted
Step 7: Server validates:
        - signers ≥ obligated count
        - factor_records match factor_count per signer
        - record_canonical_state_hash matches current state (no race condition)
        - signers' principals are distinct
        - both signatures within time_window_seconds of each other
Step 8: If valid → commit transition; emit audit_event with full signature payload
        If invalid → 401 esign/factor-rejected with reason
```

---

## 3. V-model + iterative reconciliation

```text
URS  ← validate ←  PQ
 ↓                  ↑
FS   ← verify ←   OQ
 ↓                  ↑
DS   ← inspect ←  IQ
 ↓                  ↑
Build →→→→→→→→→ Configure
```

Iterative wave delivery + V-model binding:

```yaml
per_wave:
  - URS-delta authored at slice planning
  - RTM updated as features land
  - IQ on staging / per-customer environment per release
  - OQ per slice per release (delta only)
  - PQ continuous (Continued Process Verification per FDA 2011)
per_slice_evidence_chain:
  - URS_line → RTM_entry → spec_artifact → test_artifact → IQ_record → OQ_record → PQ_observation
verification_per_release:
  - scripts/verify_validation_chain_v8.py asserts every URS line has chain to PQ
```

---

## 4. Annex 11 §10 change control via ECO

Every config change goes through ECO state machine (file 10 SM-5). ECO captures:

```yaml
- change_class: A/B/C/D/E (per V5 file 07 §11.2)
- impact_assessment
- risk_assessment_per_ICH_Q9
- validation_overhead_decision (delta vs full)
- regression_test_plan
- rollback_plan
- approver_chain (Quality + Engineering + Validation Lead per regulated)
```

---

## 5. Audit pack export

V5 ADR-0127 carry-forward. V8 binds as a job:

```yaml
job: AuditPackExportJob
trigger: on-demand via UI or API
inputs: { tenant_id, scope: { period, record_id_range, regulator } }
outputs: signed zip bundle at evidence_artifact location
sla: 24 hours from request to delivered URL
contents: per V5 file 07 §9.1
```

---

## 6. Periodic review automation

```yaml
- bi-annual periodic review per Annex 11 §11
- automated calendar reminders 30d / 7d / on-due
- review checklist:
  - validation evidence freshness
  - access control list
  - incident log
  - change log
  - risk register
  - SLO compliance
  - DSAR / privacy log
- evidence stored as evidence_record_v8 with class='validation', retention=permanent
```

---

## 7. Work packages

```yaml
WP-V8-EQMS-1: evidence_record_v8 schema + storage + WORM           (1.5 wk, W2)
WP-V8-EQMS-2: Part 11 e-sign service + UI flow                      (2 wk, W3)
WP-V8-EQMS-3: V-model RTM tooling + scripts/verify_validation       (1.5 wk, W3)
WP-V8-EQMS-4: ECO change-class engine                               (1.5 wk, W3)
WP-V8-EQMS-5: AuditPackExportJob                                    (2 wk, W7)
WP-V8-EQMS-6: Periodic review scheduler + checklist                 (1 wk, W7)
WP-V8-EQMS-7: VMP authoring (per file 22)                           (2 wk, W9)
WP-V8-EQMS-8: Customer Validation Leverage Pack generator           (1 wk, W9)
total: 12.5 wk
```

---

## 8. Decision phrase

```text
V8_EQMS_REGULATORY_VALIDATION_FACTORY_BASELINE_LOCKED
WORK_PACKAGES_DEFINED: WP-V8-EQMS-1..8
NEXT_FILE: 17_V8_CROSS_STANDARD_CONFLICT_RESOLUTION.md
```
