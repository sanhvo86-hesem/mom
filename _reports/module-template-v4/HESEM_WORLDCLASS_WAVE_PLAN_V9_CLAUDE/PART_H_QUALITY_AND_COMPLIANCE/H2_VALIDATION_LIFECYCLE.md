# H2 — Validation Lifecycle

```
chapter_purpose: bidirectional validation: URS ↔ RTM ↔ IQ/OQ/PQ ↔ root maturity
owner_role:      Validation Lead with Compliance Lead
```

---

## 1. The lifecycle

```
URS (User Requirements Specification)
   ↕  (RTM bidirectional traceability)
   Specifications + tests
   ↕
   IQ (Installation Qualification)
   ↕
   OQ (Operational Qualification per slice per release)
   ↕
   PQ (Performance Qualification - continuous)
   ↕
   Validation Summary Report (signed)
   ↕
   Root Maturity Level 6 (regulated promotion gate)
```

This is the V-model adapted to iterative wave delivery.

---

## 2. Per-stage discipline

Each stage is described in detail in D14 (Validate to Qualify). H2
binds the stages to root maturity:

```
URS authored                   → root maturity unlocked (planning gate)
URS → RTM coverage = 100%       → contract gate
RTM → tests coverage = 100%      → test design gate
Tests passed → IQ baseline       → root maturity L4 enabled
IQ + OQ passed                  → root maturity L5 enabled (controlled mutation)
PQ in observation period         → root maturity L6 candidate
PQ passed + signed VMP report   → root maturity L6 confirmed
```

---

## 3. Validation evidence freshness propagation

Per OTG axiom A18: stale validation evidence auto-demotes the affected
root's maturity level. This is the bidirectional safety net that
prevents validation rot.

---

## 4. Customer Validation Leverage Pack

Per release, HESEM ships a leverage pack that customers can use to
reduce their internal validation effort:
- Platform IQ template (vendor-side)
- Platform OQ evidence per slice
- Platform PQ continuous monitoring evidence
- Design History File
- SBOM + signed artifacts
- Penetration test report
- SOC 2 Type II report (post W12)
- ISO 27001 cert (post W13)
- List of customer-side validation gaps with templates

---

## 5. Decision phrase

```
H2_VALIDATION_LIFECYCLE_BASELINE_LOCKED
NEXT: H3_AUDIT_PROGRAM.md
```
