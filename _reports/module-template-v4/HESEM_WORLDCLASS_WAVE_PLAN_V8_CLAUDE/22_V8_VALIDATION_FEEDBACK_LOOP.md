# 22 — V8 Validation Feedback Loop

```text
purpose:        Specify the loop that V7 omits between validation evidence (W9+) and root maturity (W3+)
predecessor:    V7 silent on this dimension
v8_advance:     Bidirectional loop URS↔RTM↔IQ/OQ/PQ↔root_maturity with automated freshness alarms
work_package:   WP-V8-VLOOP (1 work package)
owner:          Validation Lead + Compliance Lead
estimate:       2 engineering-weeks
```

---

## 1. The loop

```text
                   ┌──────────────────────────┐
                   │  URS (User Requirements) │
                   └──────────┬───────────────┘
                              │
                              ▼
                   ┌──────────────────────────┐
              ┌───►│  RTM (Traceability)      │◄──────────────┐
              │    └──────────┬───────────────┘                │
              │               │                                │
              │               ▼                                │
              │    ┌──────────────────────────┐                │
              │    │  Spec / DS / Code        │                │
              │    └──────────┬───────────────┘                │
              │               │                                │
              │               ▼                                │
              │    ┌──────────────────────────┐                │
              │    │  Tests / Evidence        │                │
              │    └──────────┬───────────────┘                │
              │               │                                │
              │               ▼                                │
              │    ┌──────────────────────────┐                │
              │    │ IQ / OQ / PQ records     │                │
              │    └──────────┬───────────────┘                │
              │               │                                │
              │               ▼                                │
              │    ┌──────────────────────────┐                │
              │    │ Root maturity_level set  │                │
              │    │ (gates promotion ≥ L6)   │                │
              │    └──────────┬───────────────┘                │
              │               │                                │
              │               ▼                                │
              │    ┌──────────────────────────┐                │
              │    │ Continued PV (CPV)       │                │
              │    │ daily/weekly observations│                │
              │    └──────────┬───────────────┘                │
              │               │                                │
              │               ▼                                │
              │    ┌──────────────────────────┐                │
              │    │ Drift detection          │                │
              │    └──────┬───────┬───────────┘                │
              │           │       │                            │
              │           │       ├───► trigger CAPA          │
              │           │       │                            │
              │           ▼       ▼                            │
              │    ┌──────────────────────────┐                │
              │    │ URS revision / re-val    │                │
              └────┤  trigger                  │────────────────┘
                   └──────────────────────────┘
```

---

## 2. Mechanism per arrow

```yaml
URS → RTM:
  tool: Polarion / DOORS Next / custom + Postgres
  contract: every URS line has rtm_entry_id
  test: coverage_pct == 1.00 enforced at PR

RTM → spec:
  rtm_entry → spec_artifact_uri (Markdown / OpenAPI / SQL DDL)
  test: every RTM points to existing artifact

Spec → tests:
  every requirement-derived test_id linked back to RTM
  CI gate: tests/v8/validation/test_rtm_coverage.py
  
Tests → IQ/OQ/PQ:
  evidence chain in evidence_record_v8 with class='validation'
  signed by validator

IQ/OQ/PQ → maturity:
  scripts/promote_root_to_l6.sh requires presence of IQ_PASS + OQ_PASS + PQ_PASS within window
  
Maturity → CPV:
  every L6+ root subject to nightly Continuous Process Verification
  per FDA 2011 guidance
  metrics: drift, defect rate, audit chain integrity, dependency root maturity
  
CPV → drift:
  per-metric thresholds in policy_directive
  drift detected → emit OTG audit_event + alert + decide path:
    - minor → log + monitor
    - material → schedule revalidation + notify QA
    - severe → SEV-2 demote + halt regulated mutation

Drift → CAPA / URS revision:
  systemic deviation → CAPA (corrective action)
  changed user need → URS revision
  changed regulatory landscape → ECO + revalidation
```

---

## 3. Validation evidence freshness alarms

```yaml
freshness_policy_per_class:
  IQ_record:    expires after major release
  OQ_record:    expires after slice-level revalidation OR 365d (whichever earlier)
  PQ_record:    expires after 365d OR after material drift event
  validation_summary_report: expires after major release
  
alarm_schedule:
  - 90d before expiry → log + email
  - 30d before → SEV-3 alert
  - 7d before → SEV-2 alert + auto-add to backlog
  - on expiry → root demotes per A18 axiom; regulated mutation halts
```

---

## 4. Work package

```yaml
WP-V8-VLOOP-1: Build validation feedback loop with RTM tooling + freshness alarms
  effort: 2 wk
  deliverables:
    - schemas/rtm_entry_v8.json
    - mom/api/Services/Validation/RtmService.php
    - mom/api/Jobs/ValidationFreshnessAlarmJob.php
    - scripts/verify_rtm_coverage.py
    - scripts/promote_root_to_l6.sh
```

---

## 5. Decision phrase

```text
V8_VALIDATION_FEEDBACK_LOOP_BASELINE_LOCKED
WORK_PACKAGES_DEFINED: WP-V8-VLOOP-1
NEXT_FILE: 23_V8_SECURITY_THREAT_MODEL_V8.md
```
