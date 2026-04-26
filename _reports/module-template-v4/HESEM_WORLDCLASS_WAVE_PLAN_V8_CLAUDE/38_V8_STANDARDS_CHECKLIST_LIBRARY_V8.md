# 38 — V8 Standards Checklist Library

```text
purpose:        Carry V7 §33 13 standards + V5 file 07 + add 5 V8 standards = 18 standards
predecessor:    V7 §33 (13 standards each with 10-item checklist); V5 file 07
v8_advance:     +5 standards V7 silent on (ISO 27001, ISO 14971, NIST 800-171, FDA CSA, ISA-101)
work_package:   WP-V8-STANDARDS (1 governance WP)
owner:          Compliance Lead + Security Lead
estimate:       1 week initial + per-release updates
```

---

## 1. 18 standards (V7 13 + V8 5 new)

```yaml
S-V8-01  ISA-95 / IEC 62264 (ERP-MOM-MES boundary)         # V7
S-V8-02  ISA-88 (batch recipe/procedure)                    # V7
S-V8-03  21 CFR Part 11 (e-records / e-signatures)          # V7
S-V8-04  EU GMP Annex 11 (computerised systems)             # V7
S-V8-05  GAMP 5 Second Edition (validation)                 # V7 + V5 advance
S-V8-06  ISA/IEC 62443 (OT cybersecurity)                   # V7
S-V8-07  OWASP ASVS 5.0 (app security)                      # V7
S-V8-08  OWASP API Top 10 (2023)                            # V7
S-V8-09  OpenAPI 3.1.1 (API contracts)                      # V7
S-V8-10  RFC 9457 (problem details)                         # V7
S-V8-11  OpenTelemetry (observability semantic conventions) # V7
S-V8-12  WCAG 2.2 AA (accessibility)                        # V7
S-V8-13  NIST AI RMF 1.0 + EU AI Act (AI governance)        # V7 + V5 advance
S-V8-14  DORA / Accelerate (delivery/reliability)           # V7
S-V8-15  ISO/IEC 27001:2022 (ISMS)                          # V8 NEW
S-V8-16  ISO 14971:2019 (medical device risk mgmt)          # V8 NEW
S-V8-17  NIST SP 800-171 + CMMC 2.0 (DoD CUI)               # V8 NEW
S-V8-18  FDA CSA 2022 (Computer Software Assurance)         # V8 NEW
plus standards adopted per pack:
  - IATF 16949, AS9100D, AS9102, NADCAP CQI series (per packs)
  - 21 CFR 211, ICH Q7/Q9/Q10/Q12/Q14, EU MDR, DSCSA, ICH E2B(R3) (Pharma)
  - DO-178C, DO-254, ARP 4754A/4761, AS5553/AS6174 (Aerospace)
  - ASPICE, ISO 26262 (Auto E/E)
  - 21 CFR 117 / FSMA (Food)
```

---

## 2. Per-standard 10-item checklist (V7 §33 carry-forward)

For every standard in `data/standards_gates_v8.json`:

```yaml
- owner_named
- artifact_exists_in_correct_repo_location
- requirement_mapped_to_root_or_wave
- positive_test_present
- negative_test_present
- evidence_reproducible
- rollback_or_disable_path
- residual_risk_recorded
- decision_phrase_emitted
- next_wave_blocked_if_stop_rule
```

V8 advance: each item has automated check + measurement.

---

## 3. Stop rule per standard (V7 §33 + V8 confirm)

```yaml
S-V8-01: block endpoint graduation if route grammar test fails
S-V8-02: block batch execution if recipe validation incomplete
S-V8-03: block regulated transition if e-sign chain incomplete
S-V8-04: block production change if GxP review missing
S-V8-05: block validation promotion if GAMP categorization missing
S-V8-06: block OT write path if zone/conduit policy not approved
S-V8-07: block release if ASVS L2 baseline not met
S-V8-08: block API graduation if OWASP Top 10 negative tests fail
S-V8-09: block API release if OpenAPI 3.1.1 spec invalid
S-V8-10: block error response release if not RFC 9457
S-V8-11: block service release if OTel resource attributes missing
S-V8-12: block UI release if axe-core serious violation
S-V8-13: block AI feature release if NIST AI RMF profile missing
S-V8-14: block release schedule if DORA Elite tier failing
S-V8-15: block customer onboarding if ISO 27001 control gaps
S-V8-16: block Med Device pack release if ISO 14971 risk file incomplete
S-V8-17: block CMMC tenant onboarding if SP 800-171 evidence gaps
S-V8-18: block CSA-aligned validation if risk classification missing
```

---

## 4. Decision phrase

```text
V8_STANDARDS_CHECKLIST_LIBRARY_BASELINE_LOCKED
WORK_PACKAGES_DEFINED: WP-V8-STANDARDS-1
NEXT_FILE: 39_V8_ROOT_MATURITY_SCORECARD_V8.md
```
