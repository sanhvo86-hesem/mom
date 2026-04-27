# C9 — Maintenance & EHS

**Version:** V10 Deep Upgrade  
**Prompt source:** S2-05_C8_C9_TRACE_MAINTENANCE  
**Supersedes:** V9 C9_MAINTENANCE_EHS.md  

---

## 1. Domain Purpose and Boundaries

C9 owns the upkeep of every physical asset — machines, measurement instruments, tooling, facilities — and the safety of the people operating them. It intersects the regulated record at two critical points: calibration evidence (required in BREL gate C8-03) and equipment qualification (required in validation packs C7-22 and in the C6 Eligibility Resolver G2 gate). Without current calibration and equipment qualification, a lot cannot be released.

C9 also owns the EHS incident record, LOTO (lockout/tagout) safety procedures, and the per-pack maintenance extensions: Service Bulletin and Airworthiness Directive compliance (Aerospace), sterilizer revalidation (Medical Device), pasteurizer and thermal process validation (Food).

**Domain boundaries:**

| Boundary | C9 owns | C9 consumes | C9 produces |
|---|---|---|---|
| Upstream | — | Equipment install/decommission from Asset master; Spare parts from C5 inventory | — |
| Downstream | — | — | Calibration validity status to C8 BREL gate; Equipment availability to C6 Eligibility G2; Spare part demand to C4 procurement cycle |
| Excluded | Equipment design, BOM authoring, production scheduling | — | — |

---

## 2. Resource Families

**Asset**

| Field | Type | Notes |
|---|---|---|
| asset_id | UUID PK | |
| asset_code | VARCHAR(30) | Plant-unique tag number |
| asset_class_id | UUID FK | |
| description | VARCHAR(200) | |
| site_id | UUID FK | |
| location | VARCHAR(100) | Building, floor, bay |
| manufacturer | VARCHAR(100) | |
| model | VARCHAR(60) | |
| serial_number | VARCHAR(60) | |
| installed_date | DATE | |
| commissioned_date | DATE | |
| status | ENUM | active, in_maintenance, calibration_due, calibration_overdue, qualification_due, out_of_service, decommissioned |
| criticality | ENUM | critical, major, minor | business/safety impact classification |
| gxp_critical | BOOLEAN | affects regulated product or measurement |
| calibration_required | BOOLEAN | |
| calibration_master_id | UUID FK | nullable |
| next_calibration_due | DATE | computed |
| pm_plan_id | UUID FK | nullable |
| qualification_status | ENUM | not_required, iq_pending, oq_pending, pq_pending, qualified, requires_revalidation |
| runtime_hours | DECIMAL(12,2) | updated from Edge Gateway or manual entry |
| runtime_cycles | INTEGER | for cycle-based maintenance |
| pack_overlay | JSONB | |

**Asset Class**

| Field | Type | Notes |
|---|---|---|
| asset_class_id | UUID PK | |
| class_code | VARCHAR(20) | |
| class_name | VARCHAR(100) | |
| default_pm_plan_id | UUID FK | |
| default_calibration_master_id | UUID FK | |
| msds_required | BOOLEAN | |
| loto_required | BOOLEAN | |
| qualification_type | ENUM | none, iq_oq_pq, iq_oq, performance_only |

**PM Plan**

| Field | Type | Notes |
|---|---|---|
| pm_plan_id | UUID PK | |
| asset_class_id | UUID FK | nullable — class-level default |
| asset_id | UUID FK | nullable — asset-specific override |
| tasks | JSONB | array of {task_id, description, frequency_type, frequency_value, estimated_hours, required_skills, spare_parts_bom} |
| frequency_type | ENUM | calendar_days, runtime_hours, runtime_cycles, condition_based |
| lead_time_days | INTEGER | days before due to generate MWO |
| active | BOOLEAN | |

**PM Cycle**

| Field | Type | Notes |
|---|---|---|
| pm_cycle_id | UUID PK | |
| pm_plan_id | UUID FK | |
| asset_id | UUID FK | |
| due_date | DATE | |
| mwo_id | UUID FK | nullable — linked when generated |
| status | ENUM | scheduled, mwo_generated, completed, overdue, deferred |
| deferred_until | DATE | nullable |
| deferral_reason | TEXT | |
| deferral_authority | UUID FK | BD-equivalent: maintenance manager sign-off required |

**MWO — Maintenance Work Order**

| Field | Type | Notes |
|---|---|---|
| mwo_id | UUID PK | |
| mwo_number | VARCHAR(20) | |
| mwo_type | ENUM | preventive, corrective, calibration, qualification, breakdown, modification, inspection |
| asset_id | UUID FK | |
| pm_cycle_id | UUID FK | nullable — for PM-triggered MWOs |
| wo_id | UUID FK | nullable — for production breakdown-triggered MWOs |
| priority | ENUM | emergency, high, medium, low |
| status | ENUM | draft, planned, dispatched, in_progress, completed, deferred, cancelled |
| planned_start | TIMESTAMPTZ | |
| planned_end | TIMESTAMPTZ | |
| actual_start | TIMESTAMPTZ | |
| actual_end | TIMESTAMPTZ | |
| assigned_to | UUID[] | maintenance technician IDs |
| tasks_completed | JSONB | array of {task_id, technician_id, completed_at, observations, parts_used} |
| labor_hours | DECIMAL(10,4) | |
| spare_parts_consumed | JSONB | array of {item_id, lot_id, qty} |
| loto_record_id | UUID FK | nullable — required for high-risk work |
| failure_code | VARCHAR(20) | for corrective MWOs |
| root_cause | TEXT | |
| return_to_service_by | UUID FK | authorized sign-off |
| completed_at | TIMESTAMPTZ | |
| downtime_minutes | INTEGER | equipment unavailability duration |

**Calibration Master**

| Field | Type | Notes |
|---|---|---|
| cal_master_id | UUID PK | |
| asset_class_id | UUID FK | |
| procedure_doc_id | UUID FK | controlled calibration procedure |
| calibration_interval_days | INTEGER | |
| tolerance_specs | JSONB | array of {parameter, usl, lsl, unit} |
| reference_standard_required | VARCHAR(100) | e.g. "NIST traceable weight set" |
| external_lab_required | BOOLEAN | |
| accreditation_required | VARCHAR(30) | e.g. "ISO/IEC 17025" |

**Calibration Record**

| Field | Type | Notes |
|---|---|---|
| cal_record_id | UUID PK | |
| asset_id | UUID FK | |
| cal_master_id | UUID FK | |
| performed_by | UUID FK | |
| performed_at | TIMESTAMPTZ | |
| due_date | DATE | |
| method | ENUM | in_house, external_lab |
| external_lab_name | VARCHAR(100) | |
| external_cert_number | VARCHAR(60) | |
| traceability_chain | TEXT | NIST/NIM → reference standard → instrument |
| results | JSONB | per-parameter: {parameter, measured_value, reference_value, error, tolerance, pass} |
| status | ENUM | pass, oot_minor, oot_major, failed, voided |
| next_due_date | DATE | computed: performed_at + interval_days |
| oot_impact_assessed | BOOLEAN | |
| oot_impact_assessment_id | UUID FK | nullable — links OOT Impact Assessment |
| certificate_file_id | UUID | |

**OOT Impact Assessment**

| Field | Type | Notes |
|---|---|---|
| oot_impact_id | UUID PK | |
| cal_record_id | UUID FK | |
| asset_id | UUID FK | |
| last_passing_cal_date | DATE | |
| measurement_window_start | DATE | period potentially affected |
| measurement_window_end | DATE | |
| inspections_affected | UUID[] | inspection_ids during window using this instrument |
| lots_affected | UUID[] | lots where measurements from this instrument were decision-relevant |
| nc_created | BOOLEAN | |
| nc_ids | UUID[] | |
| brels_on_hold | UUID[] | any released BRELs using affected measurements |
| impact_severity | ENUM | no_impact, minor, major, critical |
| assessed_by | UUID FK | |
| assessed_at | TIMESTAMPTZ | |
| disposition | ENUM | no_action, re_inspect, quarantine_lots, recall_evaluation |

**Equipment Qualification Record (IQ/OQ/PQ)**

| Field | Type | Notes |
|---|---|---|
| equip_qual_id | UUID PK | |
| asset_id | UUID FK | |
| qualification_type | ENUM | iq, oq, pq, requalification |
| protocol_doc_id | UUID FK | approved validation protocol — BD-21 required |
| execution_records | JSONB | array of {test_id, expected, actual, pass, executed_by, executed_at, deviation} |
| summary_report_doc_id | UUID FK | |
| status | ENUM | protocol_approved, execution_in_progress, report_draft, qualified, failed, requires_requalification |
| qualified_at | TIMESTAMPTZ | |
| requalification_trigger | TEXT | |
| qualified_by | UUID FK | |

**Spare Part**

| Field | Type | Notes |
|---|---|---|
| spare_part_id | UUID PK | |
| item_id | UUID FK | C2 item — spare part is just an item in inventory |
| asset_class_ids | UUID[] | which asset classes use this spare |
| criticality | ENUM | critical_safety, production_critical, standard |
| min_stock_qty | DECIMAL(12,4) | reorder point |
| lead_time_days | INTEGER | from preferred supplier |
| preferred_supplier_id | UUID FK | |
| current_stock_qty | DECIMAL(12,4) | projected from C5 |

**Asset State** (audit log of every status change)

| Field | Type | Notes |
|---|---|---|
| asset_state_id | UUID PK | |
| asset_id | UUID FK | |
| from_status | VARCHAR(30) | |
| to_status | VARCHAR(30) | |
| transitioned_at | TIMESTAMPTZ | |
| triggered_by | ENUM | calibration, pm_completion, mwo_completion, manual, breakdown_alarm |
| mwo_id | UUID FK | nullable |
| cal_record_id | UUID FK | nullable |
| operator_id | UUID FK | |

**Tooling Record**

| Field | Type | Notes |
|---|---|---|
| tooling_id | UUID PK | |
| asset_id | UUID FK | parent asset |
| tool_code | VARCHAR(30) | |
| tool_type | ENUM | fixture, jig, gauge, die, mold, cutting_tool |
| item_ids | UUID[] | items this tool produces / measures |
| life_limit_type | ENUM | shots, cycles, calendar_days, none |
| life_limit_value | DECIMAL | |
| accumulated_usage | DECIMAL | updated at WO completion |
| status | ENUM | active, in_refurbishment, retired |
| last_refurbished | DATE | |

**Service Bulletin Compliance Record (J3 Aero)**

| Field | Type | Notes |
|---|---|---|
| sb_compliance_id | UUID PK | |
| asset_id | UUID FK | aircraft, engine, or component |
| sb_number | VARCHAR(30) | manufacturer service bulletin number |
| sb_title | VARCHAR(200) | |
| sb_type | ENUM | mandatory, recommended, optional |
| compliance_category | ENUM | on_condition, time_limited, recurring, one_time |
| compliance_due | DATE | nullable — if time-limited |
| status | ENUM | open, in_progress, complied, not_applicable, deferred |
| complied_at | DATE | |
| mwo_id | UUID FK | |

**Airworthiness Directive Compliance (J3 Aero)**

| Field | Type | Notes |
|---|---|---|
| ad_compliance_id | UUID PK | |
| asset_id | UUID FK | |
| ad_number | VARCHAR(30) | FAA/EASA AD number |
| issuing_authority | ENUM | faa, easa, tcca, casa |
| ad_title | VARCHAR(200) | |
| compliance_type | ENUM | immediate, recurring, one_time, on_condition |
| compliance_due | DATE | |
| compliance_interval_hrs | DECIMAL | for recurring ADs |
| next_compliance_due | DATE | computed |
| status | ENUM | open, complied, deferred, not_applicable |
| deferred_by | UUID FK | requires AMO authorization |
| complied_at | DATE | |
| mwo_id | UUID FK | |

**Engine Maintenance Record (J3 Aero Part 145)**

*(Cross-ref from C6; C9 owns the maintenance authority and return-to-service record)*

| Field | Type | Notes |
|---|---|---|
| emr_id | UUID PK | |
| asset_id | UUID FK | engine asset |
| mwo_id | UUID FK | |
| maintenance_type | ENUM | scheduled, unscheduled, modification, repair |
| task_cards_completed | JSONB | array of {task_card_ref, technician_id, completed_at, sign_off} |
| airworthiness_release | BOOLEAN | |
| certifying_staff_id | UUID FK | CAA/FAA-licensed certifying staff |
| release_date | DATE | |
| easa_form1_id | UUID FK | EASA Form 1 / FAA 8130-3 release document |

**Service-Life-Limited Part Replacement Record (J3 Aero)**

| Field | Type | Notes |
|---|---|---|
| sllp_replacement_id | UUID PK | |
| mwo_id | UUID FK | |
| asset_id | UUID FK | host asset |
| serial_id_removed | UUID FK | outgoing SLLP serial |
| serial_id_installed | UUID FK | incoming SLLP serial |
| removal_accumulated_value | DECIMAL | life accumulated at removal |
| removal_reason | ENUM | life_expired, damage, upgrade, scheduled |
| installed_at | TIMESTAMPTZ | |

**Sterilizer Cycle Record (J4 Medical Device)**

| Field | Type | Notes |
|---|---|---|
| sterilizer_cycle_id | UUID PK | |
| asset_id | UUID FK | sterilizer |
| cycle_number | VARCHAR(30) | |
| cycle_type | ENUM | eto, steam_autoclave, gamma, e_beam, dry_heat, vhp |
| wo_id | UUID FK | linked production batch |
| load_description | TEXT | items in the load |
| cycle_parameters | JSONB | {temperature_c, pressure_bar, hold_time_min, eto_conc_mg_L, dose_kgy} — per method |
| bi_results | JSONB | biological indicator results per load position |
| ci_results | JSONB | chemical indicator results |
| status | ENUM | in_progress, passed, failed, investigating |
| performed_by | UUID FK | |
| completed_at | TIMESTAMPTZ | |
| revalidation_due | DATE | |

**Pasteurizer Cycle Record (J5 Food)**

| Field | Type | Notes |
|---|---|---|
| pasteurizer_cycle_id | UUID PK | |
| asset_id | UUID FK | pasteurizer |
| wo_id | UUID FK | |
| pasteurization_type | ENUM | htst, ltlt, uht, vat |
| min_temp_f | DECIMAL(6,2) | must meet PMO requirements |
| min_hold_time_s | INTEGER | |
| flow_diversion_events | INTEGER | number of flow diversion valve actuations |
| thermograph_file_id | UUID | continuous temperature chart |
| pmmo_compliant | BOOLEAN | Grade A PMO compliance verified |
| status | ENUM | pass, fail, under_review |
| performed_by | UUID FK | |
| completed_at | TIMESTAMPTZ | |

**Thermal Process Validation Record (J5 Food LACF)**

| Field | Type | Notes |
|---|---|---|
| tpv_id | UUID PK | |
| asset_id | UUID FK | retort or equivalent |
| product_id | UUID FK | |
| pal_id | UUID FK | Process Authority Letter |
| process_schedule | JSONB | {temperature_f, hold_time_min, come_up_time_min, cooling_profile} |
| fo_value | DECIMAL(6,3) | calculated F0 lethal value |
| target_fo | DECIMAL(6,3) | minimum from PAL |
| bi_results | JSONB | C. botulinum surrogate results |
| status | ENUM | pass, fail, investigating |
| validated_at | DATE | |
| revalidation_trigger | TEXT | |

**EHS Incident**

| Field | Type | Notes |
|---|---|---|
| ehs_incident_id | UUID PK | |
| incident_number | VARCHAR(20) | |
| incident_type | ENUM | near_miss, first_aid, recordable_injury, lost_time_injury, fatality, environmental_release, property_damage, process_safety |
| severity | ENUM | critical, major, minor, near_miss |
| description | TEXT | |
| site_id | UUID FK | |
| location | VARCHAR(100) | |
| occurred_at | TIMESTAMPTZ | |
| reported_by | UUID FK | |
| injured_person_id | UUID FK | nullable |
| body_part | VARCHAR(60) | |
| root_cause | TEXT | |
| osha_recordable | BOOLEAN | |
| osha_case_number | VARCHAR(30) | |
| days_away | INTEGER | OSHA days-away metric |
| regulatory_reportable | BOOLEAN | |
| regulatory_body | VARCHAR(100) | |
| submitted_to_regulatory_at | TIMESTAMPTZ | |
| capa_id | UUID FK | nullable |
| status | ENUM | open, under_investigation, closed, regulatory_filed |
| closed_at | TIMESTAMPTZ | |

**LOTO Procedure**

| Field | Type | Notes |
|---|---|---|
| loto_id | UUID PK | |
| mwo_id | UUID FK | |
| asset_id | UUID FK | |
| procedure_doc_id | UUID FK | approved LOTO procedure for this asset |
| authorized_by | UUID FK | supervisor authorization |
| authorized_at | TIMESTAMPTZ | |
| energy_sources | JSONB | array of {type, isolation_point, isolation_method, lock_tag} |
| locks_applied | JSONB | array of {employee_id, lock_id, applied_at} |
| locks_removed | JSONB | array of {employee_id, removed_at} |
| verification_performed | BOOLEAN | try-out for zero energy state |
| status | ENUM | pending_auth, active, cleared, voided |
| cleared_at | TIMESTAMPTZ | |

---

## 3. State Machine — SM-9 MWO Lifecycle

| From | To | Trigger | Guard | Side-Effect |
|---|---|---|---|---|
| `draft` | `planned` | `plan_mwo` | Asset identified; tasks assigned; spare parts checked | |
| `planned` | `dispatched` | `dispatch_mwo` | Technician available; parts at location; LOTO authorized if required | Notify technician; set asset.status = `in_maintenance` |
| `dispatched` | `in_progress` | `start_work` | Technician confirms start | Set `actual_start` |
| `in_progress` | `completed` | `complete_mwo` | All tasks completed; return-to-service sign-off | Set `actual_end`; update `asset.status`; update `next_cal_due` if calibration MWO; update `runtime_hours` |
| `in_progress` | `deferred` | `defer_mwo` | Cannot complete this window; defer authorized | Set deferred_until; set asset.status back to prior state; pm_cycle.status = `deferred` |
| `planned` | `cancelled` | `cancel_mwo` | No longer needed | Release spare part reservations |
| `completed` | `completed` | — | Completed MWOs are immutable; corrections via new MWO | |

---

## 4. State Machine — SM-CAL Calibration Lifecycle

| From | To | Trigger | Guard | Side-Effect |
|---|---|---|---|---|
| `scheduled` | `in_progress` | `start_calibration` | Calibration master found; reference standard available; technician certified | Set asset.status = `in_maintenance` |
| `in_progress` | `pass` | `record_results` | All results within tolerance | Set `next_due_date`; asset.status = `active`; emit `cal.passed` |
| `in_progress` | `oot_minor` | `record_results` | One or more minor tolerance exceedances | OOT impact assessment triggered; asset may continue with caution flag |
| `in_progress` | `oot_major` | `record_results` | Major tolerance exceedance | Asset immediately set to `out_of_service`; OOT Impact Assessment mandatory; emit `cal.oot` |
| `oot_major` | `in_progress` | `re_calibrate` | Root cause identified; adjustment made | New calibration attempt |
| `pass` | `scheduled` | auto | At `next_due_date - lead_time_days` | New PM Cycle generated |

---

## 5. Capabilities

### CAP-C9-01 — PM Schedule Lifecycle

PM Plans are defined per asset class with default task sets and can be overridden at the asset level. The system computes next-due dates for each PM task based on `frequency_type`: calendar-days PM cycles are computed from last completion date; runtime-hours PM cycles monitor `asset.runtime_hours` from Edge Gateway feeds; condition-based triggers are defined as threshold expressions (e.g., vibration_rms > 4.5 mm/s). A PM Cycle record is generated `lead_time_days` before the due date, and an MWO is auto-created from the PM Cycle. Overdue PM Cycles escalate to the maintenance supervisor at T+0 and to the plant manager at T+7.

PM deferrals are permitted with maintenance manager authorization; the deferral window is bounded by the asset's criticality class (critical assets: max 7-day deferral; major: 30-day deferral). Deferral is logged and included in the maintenance KPI report.

### CAP-C9-02 — MWO Authoring and Dispatch (SM-9)

Per SM-9, MWOs are created from: PM Cycle triggers (preventive), C6 downtime events (corrective/breakdown), calibration schedules (calibration), and qualification plans (qualification). LOTO authorization is required for MWOs on assets where `asset_class.loto_required = true`; the system blocks `dispatch_mwo` if no LOTO record in `active` status exists for the asset. Spare part availability is checked at planning; if parts are below `min_stock_qty`, a purchase requisition is auto-created via the C4 procurement cycle. Return-to-service sign-off sets the asset back to `active` and emits `asset.available` to the C6 Eligibility Resolver cache.

### CAP-C9-03 — Calibration Cycle (ISO/IEC 17025)

Per SM-CAL. The calibration master defines the procedure, tolerance specs, reference standard requirements, and interval. For gxp_critical instruments: external lab calibrations must include an accredited (ISO/IEC 17025) certificate with NIST/NIM traceability statement. Results are entered per-parameter against USL/LSL from the calibration master. Pass/fail is evaluated automatically; technician cannot override. Certificate file is attached. Next-due date is computed and set. The calibration status of every asset is visible on the maintenance dashboard with traffic-light coloring (current / due within 30 days / overdue).

USP <1058> compliance for pharma analytical instruments: the system tracks AIQ (Analytical Instrument Qualification) phase (DQ/IQ/OQ/PQ) separately from production calibration, both linked to the same asset record.

### CAP-C9-04 — OOT Impact Handling (Canonical per D9 §6)

When a calibration returns `oot_minor` or `oot_major`, the OOT Impact Assessment is automatically initiated. The assessment identifies:

1. **Measurement window:** period from `last_passing_cal_date` to `performed_at`
2. **Affected inspections:** all inspection records where `equipment_id = this asset` and `completed_at` is within the measurement window
3. **Affected lots:** lots whose accept/reject disposition was based on measurements from affected inspections
4. **BREL impact:** any released BRELs whose evidence chain included measurements from this instrument

For `oot_major`: asset immediately set to `out_of_service`; affected lots placed on quarantine hold in C5; C7 NCs auto-created for each affected lot; any `released` BRELs within the window are flagged for QA review (they are not auto-revoked — that is a BD-2 human decision).

For `oot_minor`: assessment is completed by the Quality Engineer; if the error magnitude is within the product's engineering tolerance stack-up, no lot impact is recorded; otherwise same as major path.

OOT impact assessment is the canonical path per D9 §6; no shortcut exists to close an OOT cal record without completing the impact assessment.

### CAP-C9-05 — IQ/OQ/PQ Equipment Qualification

Per EU GMP Annex 15, USP <1058>, and 21 CFR Part 820 §820.70(g). For gxp_critical assets, initial qualification covers:

- **IQ (Installation Qualification):** equipment installed per manufacturer specification; documentation confirmed; utilities verified; safety checks complete
- **OQ (Operational Qualification):** equipment operates within specified range across the full operating envelope; alarm testing; worst-case challenge
- **PQ (Performance Qualification):** equipment performs consistently under simulated or actual production conditions over time

Qualification protocol must be approved before execution (BD-21). Results are entered per test step; deviations are documented inline and disposition assessed before the report is approved. Qualified assets remain in `qualified` status until: a change control event (modification, relocation, major repair) triggers requalification; or the periodic review schedule (annual minimum for critical GxP equipment) identifies drift. The requalification trigger and scope are determined by the change control impact assessment.

### CAP-C9-06 — Predictive Maintenance Integration (AI-04 Advisory)

The system ingests real-time sensor data from Edge Gateway (C6) per asset: vibration (RMS, FFT), temperature, pressure, current draw. The AI-04 predictive maintenance advisory model processes this data and generates:

- **Health score** (0–100) per asset, updated continuously
- **Remaining useful life (RUL)** estimate with confidence interval
- **Maintenance recommendation** (e.g., "bearing replacement recommended within 14 days")

AI recommendations are advisory only — they create a flag on the PM dashboard and may auto-generate a draft MWO that requires maintenance manager approval before dispatch. The model never autonomously schedules or executes maintenance. Recommendation accuracy is tracked: recommended interventions confirmed by subsequent inspection are marked `validated`; false positives are logged and fed back to the model's training pipeline.

### CAP-C9-07 — Spare Part Demand → D2 Procurement Cycle

When an MWO task consumes a spare part that drops the C5 inventory below the `min_stock_qty`, the system automatically creates a purchase requisition in C4 for the preferred supplier. The PR is linked to the MWO and the asset for context. Lead time is factored: if available stock will be depleted before the next PR can be received (based on `lead_time_days` and the PM schedule), an expedited PR flag is set. Spare part criticality class drives the approval workflow: critical safety spares go direct to purchasing; standard spares are batched.

### CAP-C9-08 — LOTO Procedure (OSHA 29 CFR 1910.147)

LOTO records are required for any MWO on assets with `loto_required = true`. The LOTO procedure is defined as a controlled document (C7 CDOC) per asset, detailing each energy source isolation point. The LOTO record captures: supervisor authorization; each employee's lock ID and application timestamp; verification of zero-energy state (try-out test). Work cannot begin until `loto.status = active`. At work completion, lock removal is recorded per employee; the system verifies all locks are removed before clearing the LOTO record (`status = cleared`). Partial lock removal (one employee still locked out) prevents clearance — the remaining employee must remove their own lock or their supervisor must authorize emergency removal (logged separately).

### CAP-C9-09 — AD/SB Compliance (J3 Aero; BD-AD enforcement)

For aerospace assets (aircraft, engines, appliances), the system maintains AD and SB compliance registers. ADs issued by FAA (14 CFR Part 39), EASA, TCCA, or CASA are imported via ASTM registry integration or manual entry. For each AD applicable to the asset's type certificate:

- **One-time ADs:** compliance due date computed from issue date + compliance time
- **Recurring ADs:** next compliance due computed from last compliance date + interval
- **On-condition ADs:** compliance tracked based on triggered condition

An MWO is auto-generated when an AD compliance is due within `lead_time_days`. The system blocks Return-to-Service sign-off on any MWO while open ADs past compliance deadline exist for the asset. SBs (recommended, not mandatory) are tracked for fleet-wide compliance visibility. EASA Form 1 / FAA 8130-3 release document is attached to the Engine Maintenance Record after each AD compliance action.

### CAP-C9-10 — Service-Life-Limited Part Tracking and Replacement (J3 Aero)

SLLP records in C6 are linked to assets in C9 via the serial-to-asset installation record. When an SLLP reaches its life limit, the system blocks WO dispatch for that asset (via Eligibility G2) and auto-generates an MWO for part replacement. The SLLP Replacement Record captures the removed serial (with its accumulated life data) and the installed serial (with zero accumulated life at installation). The traceability chain in C8 is updated to reflect the installation. Retired SLLPs cannot be reinstalled; any attempt returns 409 with Problem Detail.

### CAP-C9-11 — Sterilizer Revalidation Cycle (J4 Medical Device)

Per ISO 11135/11137/17665, sterilizers must be revalidated when: equipment is installed or relocated; major repair is performed; process parameters are changed; annual periodic requalification comes due. The Sterilizer Cycle Record captures all cycle parameters and biological indicator (BI) results per load position. A failed BI quarantines all items in the load (C5) and triggers a C7 NC. Three consecutive BI failures within 12 months trigger a full revalidation protocol. Revalidation protocols are managed via C7 Validation Pack (BD-21 required). The sterilizer revalidation due date is tracked on the asset record and is a BREL gate prerequisite for sterile items.

### CAP-C9-12 — Thermal Process Validation (J5 Food LACF)

For Low Acid Canned Foods (LACF) per 21 CFR Part 113, the thermal process schedule is defined in the Process Authority Letter (C6 PAL). The Thermal Process Validation Record captures: F0 lethal value achieved, process schedule parameters, and C. botulinum surrogate BI results. If the achieved F0 falls below the target F0 in the PAL, the lot is quarantined. Deviations from the approved thermal process (e.g., equipment failure during process) are reportable to FDA under 21 CFR Part 113 and trigger a TPV deviation record. Pasteurizer Cycle Records for Grade A dairy products are linked to the production batch and verified against PMO (Pasteurized Milk Ordinance) HTST/LTLT time-temperature requirements.

### CAP-C9-13 — EHS Incident Lifecycle

EHS Incidents are captured within 24 hours of occurrence (near-miss and first aid) or immediately (recordable injury, fatality, environmental release). OSHA recordability is assessed automatically based on incident_type and treatment received; the system flags OSHA 300/300A entries. Fatalities and hospitalizations require OSHA notification within 8 hours (fatality) or 24 hours (in-patient hospitalization); countdown alerts fire at T-6h and T-2h. Root cause investigation uses the same 5-Why/Ishikawa toolset as C7 NC. CAPA is auto-linked from incidents with root cause identified. The system maintains OSHA 300 logs by site by calendar year; `GET /api/v1/ehs/osha-300` returns the log for a given site and year in the OSHA-mandated format.

---

## 6. Per-Pack Overlays

| Pack | C9 additions |
|---|---|
| **J1 Pharma** | AIQ (DQ/IQ/OQ/PQ) per USP <1058> for analytical instruments; calibration per ICH Q7 §5.50; OOT triggers mandatory impact assessment on all batch release decisions since last passing cal; cleaning validation cycles cross-ref C6 |
| **J2 Automotive** | Equipment capability studies (Cm/Cmk ≥ 1.67 for new equipment per VDA 5); measurement system analysis (Gauge R&R per AIAG MSA 4th) tracked per calibration master; PM compliance rate tracked for IATF 16949 internal audit scope |
| **J3 Aerospace** | AD/SB compliance registers; SLLP replacement tracking; Engine Maintenance Record (EASA Part 145 / FAA Part 145); EASA Form 1 / FAA 8130-3 release docs; NADCAP special process equipment tracked with accreditation expiry |
| **J4 Medical Device** | Sterilizer revalidation lifecycle; IQ/OQ/PQ with change control requalification; equipment qualification status required in BREL gate; sterilizer cycle records in DHR |
| **J5 Food** | Pasteurizer cycle records; thermal process validation (LACF); PMO compliance tracking; sanitation equipment (CIP systems) with PM and calibration |

---

## 7. Failure Modes

| Failure | Detection | Recovery |
|---|---|---|
| Calibration instrument not found at due date | PM Cycle overdue alert fires | Expedited external calibration ordered; asset flagged `calibration_overdue`; C6 Eligibility G2 blocks asset dispatch |
| OOT cal discovered after multiple lots released | OOT Impact Assessment | C7 NCs created for affected lots; BREL evidence chain flagged for QA review; QA decides re-inspection vs. accept-as-is (BD-2) |
| LOTO clearance attempted while employee still locked | System checks `locks_applied` vs `locks_removed` | Clearance blocked; alert to supervisor; emergency removal workflow with mandatory documentation |
| AD compliance past due on aircraft asset | AD compliance register overdue flag | Asset grounded (status = `out_of_service`); no WO dispatch; MWO auto-generated as emergency priority |
| Sterilizer BI failure | BI result entered; cycle status → `failed` | Load quarantined; C7 NC opened; root cause investigation; re-sterilization or lot destruction per disposition |
| PM deferral abuse (> max_deferral exceeded) | System checks deferral_window vs criticality | Blocks additional deferral; escalates to plant manager; auto-creates CAPA if three consecutive deferrals on same PM task |

---

## 8. KPIs

| KPI | Target | Measurement |
|---|---|---|
| PM compliance rate | ≥ 95% | completed_on_time PM cycles / total scheduled |
| Mean Time to Repair (MTTR) | ≤ 4h for critical assets | actual_end - actual_start for corrective MWOs |
| Mean Time Between Failures (MTBF) | Tracked, target per asset class | Days between corrective MWOs per asset |
| Calibration on-time rate | ≥ 98% | cals completed before due_date / total |
| OOT rate | < 1% of calibrations | oot_major + oot_minor / total calibrations |
| Overdue AD compliance | 0 | AD compliance records past due_date |
| OSHA recordable incident rate | ≤ 1.0 per 100 FTE-years | OSHA 300 recordable count / FTE-hours × 200,000 |
| Equipment OEE (from cross-domain) | ≥ 85% | Cross-ref C6 Workcell OEE |

---

## 9. Standards

| Standard | Clause | Capability |
|---|---|---|
| ISO/IEC 17025 | Calibration laboratory requirements | CAP-C9-03 |
| USP <1058> | Analytical instrument qualification | CAP-C9-05 |
| EU GMP Annex 15 | Qualification and validation | CAP-C9-05 |
| 21 CFR Part 211 | §211.68 Equipment calibration | CAP-C9-03/04 |
| ISO 9001:2015 | §7.1.5 Monitoring resources | CAP-C9-03 |
| IATF 16949 | §7.1.5.2 MSA | CAP-C9-02 |
| AS9100D | §7.1.5 Monitoring and measurement | CAP-C9-09 |
| 14 CFR Part 39 | Airworthiness Directives | CAP-C9-09 |
| 14 CFR Part 145 / EASA Part 145 | Maintenance organization | CAP-C9-09/10 |
| AS9120B | Parts traceability for distributors | CAP-C9-10 |
| ISO 11135/11137/17665 | Sterilization validation | CAP-C9-11 |
| 21 CFR Part 113 | Thermal processing (LACF) | CAP-C9-12 |
| PMO (Grade A Pasteurized Milk Ordinance) | HTST records | CAP-C9-12 |
| OSHA 29 CFR 1910.147 | LOTO | CAP-C9-08 |
| OSHA 29 CFR 1904 | Recordkeeping | CAP-C9-13 |
| ISO 45001 | Occupational health and safety | CAP-C9-13 |

---

## 10. Cross-References

| Domain | Reference |
|---|---|
| C5 Inventory | Spare parts drawn from C5; OOT-affected lots quarantined in C5 |
| C6 Shopfloor | Eligibility G2 gate checks asset.status and calibration_due; downtime events create corrective MWOs; SLLP accumulated values updated from WO completions |
| C7 Quality | Calibration evidence gate in BREL; IQ/OQ/PQ validation packs per C7 SM-14; OOT NCs created in C7; EHS incident CAPAs tracked in C7 |
| C8 Traceability | Calibration validity is a BREL gate; SLLP serial history feeds C8 aero_trace |
| C4 Procurement | Spare part reorder via purchase requisition; preferred supplier from supplier master |
| C2 Product Engineering | Equipment routing constraints reference asset class capabilities |
| C3 Planning | Equipment availability windows from PM schedule feed capacity planning |

---

*Decision phrase: S2-05_C8_C9_TRACE_MAINTENANCE_DEEP_UPGRADE_COMPLETE*
