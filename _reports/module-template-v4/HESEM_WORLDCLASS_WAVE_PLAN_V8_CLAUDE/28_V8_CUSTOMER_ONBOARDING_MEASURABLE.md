# 28 — V8 Customer Onboarding Measurable

```text
purpose:        V7 §21 lists onboarding pack as checklist; V8 binds to runbook with phase gates + measurements
predecessor:    V7 §21
v8_advance:     8-phase onboarding runbook with gate criteria + measurements + per-tier SLA
work_package:   WP-V8-ONBOARD (1 work package + per-customer instance)
owner:          Customer Success Lead + Implementation Lead
estimate:       1.5 wk runbook authoring + per-customer 4-26 wk implementation
```

---

## 1. The 8 phases

```yaml
P1 Discovery (1-2 wk):
  outputs: customer profile, fit-gap, vertical pack selection, regulatory scope
  gate: signed Statement of Work + selected tier
P2 Validation Scoping (2-4 wk; regulated only):
  outputs: URS authored with customer; risk assessment; validation plan
  gate: validation plan signed by customer Quality
P3 Tenant Provisioning (1-2 wk):
  outputs: tenant created in target region; baseline IAM; SSO config
  gate: IQ executed PASS
P4 Master Data Migration (2-6 wk):
  outputs: ITEM/CUST/SUP/EQP/MDEV/USER/ROLE imported with validation
  gate: master_data_migration_report PASS; spot audit by Quality
P5 Configuration (2-8 wk):
  outputs: workflows configured; documents uploaded; users trained
  gate: OQ executed per slice PASS
P6 Pilot Operation (4-12 wk):
  outputs: pilot batches/transactions/audits in production-equivalent
  gate: PQ observation period started; no SEV-1/2 open
P7 Pre-Production Cutover (2-4 wk):
  outputs: training compliance 100%; runbook published; on-call established
  gate: customer signs pre-production cutover (formal pre-production wording allowed)
P8 Steady State (ongoing):
  outputs: SLA monitoring; quarterly business reviews; periodic re-validation
```

---

## 2. Per-tier SLA

```yaml
HESEM_Core:
  total_implementation_calendar: 4-8 wk
  phases_active: P1, P3, P4, P5, P7, P8 (no validation phase)
  CSM_engagement: shared
HESEM_Pro:
  total_implementation_calendar: 8-16 wk
  phases_active: P1, P3, P4, P5, P6, P7, P8 (light validation)
  CSM_engagement: dedicated, business-hours
HESEM_Enterprise:
  total_implementation_calendar: 16-52 wk (varies by vertical)
  phases_active: all 8 phases
  CSM_engagement: dedicated, 24x5 + on-call
HESEM_Vertical_Pack:
  add validation depth per pack
  Pharma: +6 mo for full IQ/OQ/PQ + Annex 1 sterile sub-pack if applicable
  Aerospace: +12 mo for AS9100D + NADCAP path
```

---

## 3. Measurements

```yaml
KPI-V8-OBORD-001: total_implementation_calendar_weeks
KPI-V8-OBORD-002: phase_gate_pass_rate_first_attempt
KPI-V8-OBORD-003: customer_blocker_count_per_phase
KPI-V8-OBORD-004: hesem_blocker_count_per_phase
KPI-V8-OBORD-005: time_to_first_value_days
KPI-V8-OBORD-006: csat_per_phase
KPI-V8-OBORD-007: nps_at_p7_signoff
KPI-V8-OBORD-008: post_p8_30d_incident_count
```

---

## 4. Customer Validation Leverage Pack (V5 ADR-0122)

Per release, HESEM ships a leverage pack containing:

```yaml
- platform IQ template (vendor-side)
- platform OQ evidence per slice (vendor-side)
- platform PQ continuous monitoring evidence (vendor-side)
- design history file
- SBOM + signed artifacts
- penetration test report (current)
- SOC 2 Type II report (post W12)
- ISO 27001 cert (post W13)
- list of customer-side validation gaps with templates

intent: customer's GAMP 5 Cat 4 validation effort is reduced by leveraging vendor evidence
publication: per release; available in customer portal under regulated_signoff
```

---

## 5. Work package

```yaml
WP-V8-ONBOARD-1: 8-phase runbook authoring + per-tier customization
  effort: 1.5 wk
  deliverables:
    - docs/customer-onboarding/runbook-v8.md
    - templates/CUSTOMER_ONBOARDING_PLAN_V8.md (per-customer fill-in)
    - data/onboarding_phase_gate_criteria_v8.json
```

---

## 6. Decision phrase

```text
V8_CUSTOMER_ONBOARDING_MEASURABLE_BASELINE_LOCKED
WORK_PACKAGES_DEFINED: WP-V8-ONBOARD-1 + per-customer instance WPs
NEXT_FILE: 29_V8_VERTICAL_PACK_PHARMA_v8.md
```
