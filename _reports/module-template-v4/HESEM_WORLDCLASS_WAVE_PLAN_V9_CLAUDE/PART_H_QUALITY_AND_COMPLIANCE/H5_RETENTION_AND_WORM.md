# H5 — Retention and WORM Policy

```
chapter_purpose: per-record-class retention + WORM enforcement
owner_role:      Compliance Lead
```

---

## 1. Retention by record class

```
authoritative_root (regulated)  7 years past supersession
authoritative_root (general)    2 years past supersession
projection_workspace            rebuildable (no retention)
derived_read_model              rebuildable (no retention)
evidence_artifact               permanent (or 25y minimum)
workflow_event                  permanent
audit_event                     permanent
ai_advisory_annotation          5 years
policy_directive                permanent
```

Per-vertical overrides (per PART_J):
- Pharma batch records: 1 year past expiration date
- Med Device DHF: 2 years post-manufacture or product life
- Automotive PPAP: lifetime of part + 1 year + customer requirement

---

## 2. WORM (Write-Once-Read-Many) enforcement

Evidence artifacts and audit events stored in WORM media (S3 Object Lock
or equivalent). Cannot be deleted before retention expires.

---

## 3. GDPR right-to-erasure conflict

- Non-gxp records: erasure honored within 30 days
- GxP records: pseudonymization within 30 days; record retained until
  retention expires; subject informed
- Audit records: never deleted; retention is the law

---

## 4. Decision phrase

```
H5_RETENTION_AND_WORM_BASELINE_LOCKED
NEXT: H6_PERIODIC_REVIEW.md
```
