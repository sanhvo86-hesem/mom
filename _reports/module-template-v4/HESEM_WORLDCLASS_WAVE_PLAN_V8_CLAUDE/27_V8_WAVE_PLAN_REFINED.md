# 27 — V8 Wave Plan Refined

```text
purpose:        Carry forward V7 W0-W12 + add W13 + W14 + 2 continuous streams
predecessor:    V7 §24 + V5 file 03 (V5 had W0-W10)
v8_advance:     2 new waves (W13 multi-region, W14 continuous improvement) + CS-A + CS-B streams
```

---

## 1. Wave roster (15 waves + 2 streams)

| Wave | Name | Calendar (low-high wk) | Decision phrase |
|---|---|---|---|
| W0 | Phase 2 Integration Review + Repair | 1-2 | PHASE2_INTEGRATION_PASS_READY_FOR_PHASE3 |
| W0.5 | Platform Substrate Hardening | 4-6 | W0_5_PLATFORM_SUBSTRATE_ACCEPTED |
| W1 | HMV4 Foundation Productization | 8-12 | W1_SLICE_FACTORY_READY |
| W2 | Governed Record Factory | 4-8 | W2_RECORD_FACTORY_READY |
| W3 | eQMS + Workforce + Maintenance Core | 6-10 | W3_EQMS_CORE_READY |
| W4 | Live Read-Only API Graduation | 6-8 | W4_LIVE_READ_ONLY_READY |
| W4.5 | OTG Native Cutover | 3-4 | W4_5_OTG_NATIVE_READY |
| W5 | Core Transactional ERP/MOM | 8-10 | W5_TRANSACTIONAL_CORE_READY |
| W6 | MES/OT Foundation | 8-12 | W6_MES_OT_FOUNDATION_READY |
| W6.5 | AI Advisory Controlled Rollout | 3-4 | W6_5_AI_ADVISORY_READY |
| W7 | Digital Thread / Genealogy / Release | 6-8 | W7_DIGITAL_THREAD_RELEASE_READY |
| W8 | Analytics + Improvement + Reliability | 6-12 | W8_ANALYTICS_RELIABILITY_READY |
| W9 | Security + Validation + Compliance | 6-12 | W9_COMPLIANCE_VALIDATION_READY |
| W10 | Vertical Packs | 16-26 | W10_VERTICAL_PACKS_READY |
| W11 | Customer Pilot / Pre-Production | 4-8 | W11_PRE_PRODUCTION_READINESS_READY |
| W12 | Release Candidate / Scale OS | 4-8 | W12_PRODUCTIZED_OPERATING_MODEL_READY |
| **W13** | **Multi-region + Multi-jurisdictional Operations (V8 NEW)** | **8-12** | **W13_MULTI_REGION_MULTI_JURISDICTIONAL_READY** |
| **W14** | **Continuous Improvement Operating Loop (V8 NEW)** | **ongoing** | **W14_CONTINUOUS_IMPROVEMENT_LOOP_OPERATIONAL** |
| CS-A | Continuous Security | from W0.5 | CS_A_PERIODIC_REVIEW_<YYYYQ> |
| CS-B | Continuous Validation | from W0.5 | CS_B_PERIODIC_REVIEW_<YYYYQ> |

Total path-dependent calendar: **W0..W14 = 82-148 weeks** (~19-34 months).

---

## 2. W13 — Multi-region + Multi-jurisdictional Operations (V8 NEW)

```yaml
goal: enable HESEM to run in multiple regions with per-region regulatory compliance
entry_criteria:
  - W12 RC ratified
  - first 3+ tenants live with stable SLA
  - ISO 27001 certification achieved or actively pursued
exit_criteria:
  - active-active deployment in ≥ 2 regions
  - per-region tenant pinning (incl. ITAR isolation)
  - cross-region DR drill quarterly PASS
  - per-jurisdiction regulatory compliance evidence
work_packages:
  WP-V8-W13-1: Multi-region deployment topology (~3 wk)
  WP-V8-W13-2: Tenant pinning + ITAR enforcement (~2 wk)
  WP-V8-W13-3: Cross-region DR with RPO 1h / RTO 4h (~3 wk)
  WP-V8-W13-4: Per-jurisdiction regulatory compliance per file 17 (~2 wk)
decision_phrase: W13_MULTI_REGION_MULTI_JURISDICTIONAL_READY
```

---

## 3. W14 — Continuous Improvement Operating Loop (V8 NEW)

```yaml
goal: institutionalize learning + improvement post-RC
entry_criteria: W13 ratified
exit_criteria: ongoing — never PASS, only continuous reports
loops:
  - quarterly retrospective per stream
  - monthly DORA metrics review
  - quarterly customer NPS + CSAT review
  - quarterly cost optimization review
  - quarterly threat-model + risk-register refresh
  - annual platform-architecture review
  - annual standards-update absorption
work_packages:
  WP-V8-W14-1: Retrospective cadence + ROI delta tracking (ongoing)
  WP-V8-W14-2: Architecture review board + ADR cadence (quarterly)
  WP-V8-W14-3: Standards update absorption process (annual)
decision_phrase: W14_CONTINUOUS_IMPROVEMENT_LOOP_OPERATIONAL (rotates each cycle)
```

---

## 4. CS-A — Continuous Security stream

```yaml
launches: W0.5 (parallel; runs forever)
cadence:
  - daily: SBOM scan + dep CVE scan + secret scan
  - weekly: red-team prompt-injection + tenant boundary fuzzing
  - monthly: vulnerability remediation review
  - quarterly: tabletop incident drill + threat-model refresh
  - annually: 3rd-party pen-test + ISO 27001 audit
output: per-period security review report (signed)
```

---

## 5. CS-B — Continuous Validation stream

```yaml
launches: W0.5 (parallel; runs forever)
cadence:
  - daily: audit chain anchor verification + integrity job
  - weekly: validation evidence freshness alarm scan
  - monthly: ML drift detection + retraining trigger evaluation
  - quarterly: periodic review per Annex 11 + ICH Q10 management review
  - annually: APR per pharma + IATF surveillance audit + FDA/EMA inspection readiness drill
output: per-period validation review report (signed)
```

---

## 6. Per-wave entry/exit gate matrix (V5 file 03 §4 carry-forward, V8 expanded)

| Gate | Predecessor | Coverage matrix per file 01 §8 | Standards | Decision phrase |
|---|---|---|---|---|
| W0→0.5 | Phase 2 reports | none | repo conventions | WAVE_0_..._READY |
| W0.5→1 | W0 | per file 08 spine targets | ASVS L2, OTel, OpenAPI 3.1.1, RFC 9457 | W0_5_..._READY |
| W1→2 | W0.5 | L2 ≥ 0.40 | ISO 9001 §7.5 | W1_..._READY |
| ... | ... | ... | ... | ... |
| W12→13 | W12 + ≥3 stable tenants | all spines L7 | ISO 27001 cert | W12_..._READY |
| W13→14 | W13 + multi-region drill PASS | all KPIs Elite | per-region regs | W13_..._READY |

---

## 7. Decision phrase

```text
V8_WAVE_PLAN_REFINED_BASELINE_LOCKED
WORK_PACKAGES_DEFINED: ~50 sub-WPs across 17 waves+streams
NEXT_FILE: 28_V8_CUSTOMER_ONBOARDING_MEASURABLE.md
```
