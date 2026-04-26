# D14 — Validate to Qualify

```
workflow_id:    D14
workflow_name:  Validate to Qualify
owner_role:     Validation Lead
participants:   Compliance Lead, Engineering Lead, Quality Lead
```

---

## 1. Purpose

Validate to Qualify is the formal validation lifecycle workflow:
documenting user requirements, requirements traceability, installation
qualification, operational qualification, performance qualification,
through to validation summary report. This workflow makes regulated
deployment defensible.

---

## 2. Trigger

- New regulated system implementation
- Major change to validated system (per Annex 11 §10 change control)
- Periodic re-validation per validation master plan
- Validation evidence aging out (axiom A18 freshness propagation)

---

## 3. Actors

```
Customer's Validation Lead   Owns validation strategy
Vendor's Validation Engineer Provides leverage pack and assistance
Subject Matter Experts        Author URS, IQ, OQ, PQ scripts
Quality Assurance             Reviews validation evidence
QA Manager                   Approves validation summary
Regulatory Affairs            Maintains regulatory communication
```

---

## 4. Steps

### Step 1 — Validation Master Plan

Customer's Validation Lead authors the Validation Master Plan (VMP),
defining:
- Scope of validation
- Validation strategy (full vs leverage)
- Risk-based approach (per GAMP 5 / ICH Q9)
- Roles and responsibilities
- Schedule

### Step 2 — User Requirements Specification (URS)

SMEs author URS lines specifying what the system must do for the
customer's intended use. Each URS line is a testable requirement.

### Step 3 — Requirements Traceability Matrix (RTM)

Each URS line is traced to:
- Specifications (what HESEM offers)
- Test cases (how to verify)
- Test evidence (the actual test results)

The RTM is bidirectional: every URS has tests; every test traces back
to a URS.

### Step 4 — Installation Qualification (IQ)

IQ scripts verify the system is installed correctly:
- Hardware in place (per environment)
- Software at correct version
- Configuration applied
- Backups functional
- Observability operational

IQ executed on customer-equivalent staging or directly on the customer's
validated environment.

### Step 5 — Operational Qualification (OQ)

OQ scripts verify the system operates correctly per spec:
- Each state machine transition exercised
- Each guard verified
- Each obligation enforced
- Negative paths verified (errors return per RFC 9457)
- Per-slice OQ delta with each release

### Step 6 — Performance Qualification (PQ)

PQ verifies the system performs in real conditions:
- Continuous Process Verification (per FDA 2011 guidance) — production-
  equivalent operation over a period (typically 30 days)
- SLO compliance over the period
- Stability of performance
- No SEV-1 incidents over the period

### Step 7 — Validation Summary Report

QA Manager reviews all evidence and authors the validation summary
report. Signed by:
- Validation Lead
- QA Manager
- Compliance Lead

The signed report is the evidence the regulated system is validated for
intended use.

### Step 8 — Continuous Process Verification (Ongoing)

Per FDA 2011 guidance (and per Annex 11 §11), validation continues:
- Drift detection
- Periodic review (bi-annual minimum per Annex 11)
- Re-validation triggered by changes
- Validation evidence freshness (per axiom A18, stale evidence
  auto-demotes the affected root)

### Step 9 — Customer Validation Leverage

For HESEM customers using the Customer Validation Leverage Pack
(CAP-C7 supplementary), HESEM-side validation evidence (platform IQ
template, OQ per slice, PQ continuous monitoring, SBOM, pen-test report,
SOC 2 report, ISO 27001 cert) is leveraged to reduce customer's
internal validation effort. Customer's GAMP 5 Cat 4 effort is reduced
to:
- Environment qualification (their infra)
- Configuration qualification (their workflows)
- User acceptance testing
- Ongoing monitoring

---

## 5. Decision points

```
DP1  Validation strategy:        full / leverage / hybrid per GAMP 5
DP2  Risk classification:        per ICH Q9 / GAMP categorization
DP3  URS coverage:                does spec cover the URS line?
DP4  Test result:                 pass / fail / classified deferral
DP5  Validation summary:          ready for sign-off
DP6  Re-validation trigger:       per change or per period
```

---

## 6. Cross-domain footprint

D-07 Quality (primary), D-14 Core Platform (validation evidence
storage), D-09 Maintenance (equipment validation), D-06 Production
(validated process).

---

## 7. State machines

SM-14 Validation (URS, RTM, IQ, OQ, PQ, VMP).

---

## 8. Evidence captured

```
- VMP (signed)
- URS (signed)
- RTM (live, version-controlled)
- IQ scripts and records (per release)
- OQ scripts and records (per slice per release)
- PQ scripts and records (continuous)
- Validation Summary Report (signed)
- Periodic review records (bi-annual)
- Risk assessment per ICH Q9
- WORM storage permanent for regulated
```

---

## 9. Regulatory considerations

```
- 21 CFR Part 11 §11.10 (validation requirement; FDA)
- EU GMP Annex 11 §4 (validation)
- EU GMP Annex 15 (qualification & validation)
- GAMP 5 Second Edition (validation methodology)
- FDA CSA 2022 (Computer Software Assurance)
- ICH Q9 (Quality risk management)
- ICH Q12 (Lifecycle management)
- 21 CFR Part 820 §820.70 (Production and process controls; med device)
- USP <1058> (Analytical instrument qualification)
```

---

## 10. Wave target

This workflow's substrate is built across waves:
- VMP framework: by W4.5
- IQ tooling: by W5
- OQ per slice: continuous from W3
- PQ baseline: by W8 (post-hardening)
- Customer Validation Leverage Pack: by W8

L4 throughout; full L7 by W12.

---

## 11. Failure modes

```
- URS too vague:                  rework with SME; re-baseline
- Test fail:                       investigation; corrective action;
                                    re-test
- Validation evidence aging:      auto-demotion; re-validation needed
- Customer validation strategy
   incompatible with HESEM:        consultation; agreed strategy
- Periodic review missed:          SLO breach; risk register entry
```

---

## 12. Decision phrase

```
D14_VALIDATE_TO_QUALIFY_BASELINE_LOCKED
PART_D_COMPLETE
NEXT: PART_E_API_CATALOG/E0_PART_E_OVERVIEW.md
```
