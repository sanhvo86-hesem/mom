# D9 — Maintain to Restore

```
workflow_id:    D9
workflow_name:  Maintain to Restore
domain_primary: Maintenance & EHS
domains_cross:  Quality Improvement, MES Execution, Planning & Production,
                Procurement, Workforce & Training, Traceability
state_machine:  SM-9 (MWO) + SM-CAL (Calibration)
trigger_count:  22
branch_count:   15
edge_case_count:12
kpi_count:      13
failure_mode_count: 14
per_pack:       J1 J2 J3 J4 J5
bd_boundaries:  BD-25
ai_advisory:    AI-04 AI-08
version:        V10-deep
```

---

## §1 Purpose and Scope

The Maintain to Restore (M2R) workflow manages the full lifecycle of maintenance
work orders (MWO) and calibration events from trigger identification through
execution, return-to-service authorization, and the out-of-tolerance (OOT) impact
cascade. It provides the evidence base for the Eligibility Resolver G2 gate
(equipment availability) and G2-CAL (calibration currency) consumed by D3.

M2R owns SM-9 (MWO State Machine) and SM-CAL (Calibration State Machine), and
is the canonical host for the OOT impact analysis procedure that cascades
consequences to inspection records (SM-4), non-conformance records (SM-6),
batch release decisions (SM-10), and potentially field safety actions (D12).

Standards aligned: ISO 55001 (asset management), ISO/IEC 17025 (calibration),
USP <1058> (analytical instrument qualification), 21 CFR 820.72 (calibration),
OSHA 29 CFR 1910.147 (LOTO), AS9100D §7.1.5, EU GMP Annex 1 §4 (equipment),
EU GMP Annex 15 §8 (equipment qualification), ISO 11135/11137 (sterilization),
IATF 16949 §7.1.5.1 (MSA for measurement systems).

---

## §2 Entry Conditions

| # | Pre-condition | Enforcement |
|---|-------------|------------|
| PC-1 | Asset record exists in `equipment` table with asset classification and PM plan | Asset existence check |
| PC-2 | For PM: `asset.next_pm_due` or `asset.next_calibration_due` reached or predicted | PM cycle engine |
| PC-3 | For CM (corrective): maintenance request created with `failure_description`, `reporter_id`, `asset_id` | MR creation validator |
| PC-4 | LOTO procedure exists for the asset if maintenance requires energy isolation | LOTO pre-check |
| PC-5 | Maintenance technician holds required skill certification for the work type | D8 / G2 tech eligibility |
| PC-6 | Spare parts reservation available for PM (if parts required by PM plan) | Parts availability check |

---

## §3 Trigger Catalog

| ID | Trigger | Source |
|----|---------|--------|
| T-01 | PM cycle due: calendar-based `next_pm_due ≤ today` | PM schedule engine |
| T-02 | PM cycle due: usage-based `meter_reading ≥ pm_interval_units` | Asset meter reading |
| T-03 | Calibration due: `calibration_due_date ≤ today` | Calibration schedule engine |
| T-04 | Corrective maintenance: operator reports equipment failure | Operator work request |
| T-05 | Predictive maintenance alert: AI-04 predicts failure within prediction window | AI-04 predictive engine |
| T-06 | Equipment downtime event: unplanned stop during WO execution | C6 MES downtime event |
| T-07 | Calibration OOT: calibration result outside tolerance → OOT impact cascade | SM-CAL OOT branch |
| T-08 | Post-production cleaning validation (J1): scheduled cleaning verification | J1 cleaning validation |
| T-09 | Aseptic line re-qualification (J1): scheduled environmental monitoring | J1 sterile area qualification |
| T-10 | Aero airworthiness directive (AD) compliance (J3): FAA/EASA AD issued | J3 AD compliance |
| T-11 | Aero service bulletin (SB) action (J3): OEM SB published; compliance decision | J3 SB tracking |
| T-12 | SLLP (Safety Life Limited Part) cycle expiry (J3): flight hours/cycles reached | J3 SLLP tracking |
| T-13 | Sterilizer re-validation cycle (J4): ISO 11135/11137/17665 scheduled re-qualification | J4 sterilization |
| T-14 | Pasteurizer HTST re-calibration (J5): NCIMS/Grade A Pasteurized Milk Ordinance schedule | J5 dairy/LACF |
| T-15 | Thermal process re-review (J5): LACF scheduled thermal process authority review | J5 LACF |
| T-16 | MSA (Measurement System Analysis) renewal (J2): gauge R&R due per control plan | J2 IATF 16949 §7.1.5.1 |
| T-17 | EHS inspection trigger: safety survey identifies equipment hazard | C9 EHS inspection |
| T-18 | LOTO verification required: annual LOTO procedure audit | OSHA / EHS |
| T-19 | Spare part shortage triggers emergency PM postponement decision | D2 part shortage |
| T-20 | Instrument qualification (IQ/OQ/PQ) cycle: scheduled re-qualification | Qualification schedule |
| T-21 | FAA Form 8130-3 RTS required: aviation maintenance return-to-service (J3) | J3 aviation |
| T-22 | Management decision to decommission asset | Asset management |

---

## §4 State Machine — SM-9 Maintenance Work Order

### States

| State | Meaning |
|-------|---------|
| `planned` | MWO created by PM schedule; awaiting release |
| `released` | MWO released to maintenance crew; parts reserved |
| `loto_applied` | Energy isolation (LOTO) applied and verified; maintenance in progress |
| `in_progress` | Active maintenance work being performed |
| `awaiting_parts` | Work stopped; required parts not yet available |
| `inspection_pending` | Maintenance complete; pre-return-to-service inspection awaited |
| `rts_pending` | Inspection passed; return-to-service authorization required |
| `returned_to_service` | Asset operational and available; equipment status = AVAILABLE |
| `closed` | All costs posted; documentation complete |
| `cancelled` | MWO voided (equipment decommissioned; decision reversed) |

### Transition Table

| From | Event | Guard | To | Actor |
|------|-------|-------|-----|-------|
| `planned` | Released to crew | `parts_reserved OR parts_not_required` | `released` | Maintenance Planner |
| `released` | LOTO applied | `loto_applied_by ∧ loto_verified_by ≠ loto_applied_by` | `loto_applied` | Maintenance Technician + LOTO Verifier |
| `released` | LOTO not required | `loto_required = false` | `in_progress` | Maintenance Technician |
| `loto_applied` | Work commenced | `work_start_confirmed = true` | `in_progress` | Maintenance Technician |
| `in_progress` | Parts shortage | `required_part_unavailable = true` | `awaiting_parts` | Maintenance Technician |
| `awaiting_parts` | Parts received | `parts_issued = true` | `in_progress` | Parts Store |
| `in_progress` | Work complete | `all_tasks_confirmed = true` | `inspection_pending` | Maintenance Technician |
| `inspection_pending` | Inspection passed | `post_maintenance_inspection.result = PASS` | `rts_pending` | QC / Maintenance Lead |
| `inspection_pending` | Inspection failed | `post_maintenance_inspection.result = FAIL` | `in_progress` | Maintenance Technician |
| `rts_pending` | RTS authorized | `rts_authorized_by ∧ loto_removed_confirmed` | `returned_to_service` | Maintenance Supervisor |
| `rts_pending` | BD-25 required (J3 AD/SB) | `bd_25_required = true` | `rts_pending` (blocked at API) | System |
| `returned_to_service` | Costs posted | `labor_posted ∧ parts_posted` | `closed` | System |
| `planned` | Cancellation | `no_work_started` | `cancelled` | Planner |

---

## §5 State Machine — SM-CAL Calibration

### States

| State | Meaning |
|-------|---------|
| `due` | Calibration due date reached; instrument awaiting calibration |
| `in_calibration` | Instrument removed from service; calibration in progress |
| `calibrated` | Calibration performed; result pending review |
| `oot_investigation` | Out-of-tolerance result; impact assessment in progress |
| `released` | Calibration in-tolerance; instrument returned to service |
| `quarantined` | OOT impact assessment complete; instrument in quarantine pending repair |
| `repaired` | Instrument repaired; re-calibration required |
| `retired` | Instrument permanently retired; decommissioned |

### SM-CAL Transition Table

| From | Event | Guard | To | Actor |
|------|-------|-------|-----|-------|
| `due` | Instrument pulled from service | `calibration_started = true` | `in_calibration` | Calibration Tech |
| `in_calibration` | Calibration performed | `calibration_results_entered = true` | `calibrated` | Calibration Tech |
| `calibrated` | All results within tolerance | `all_parameters_in_tolerance = true` | `released` | Calibration Lab |
| `calibrated` | Any parameter out of tolerance | `any_parameter_oot = true` | `oot_investigation` | Calibration Supervisor |
| `oot_investigation` | Impact assessment complete | `oot_impact_assessment_id set` | `quarantined` (if repair needed) OR `released` (if OOT minor) | QC Manager |
| `quarantined` | Repair completed | `repair_confirmed = true` | `repaired` | Maintenance Tech |
| `repaired` | Re-calibration performed and passed | `re_calibration.result = IN_TOLERANCE` | `released` | Calibration Lab |
| `released` | Next due date reached | `calibration_due_date ≤ today` | `due` | System |
| `quarantined` | Instrument beyond economical repair | `decommission_approved = true` | `retired` | Asset Manager |

---

## §6 OOT Impact Analysis — Canonical Procedure

An OOT (Out-of-Tolerance) calibration result means the instrument was
potentially producing erroneous measurements for an unknown duration
prior to detection. The OOT impact analysis determines which activities
used this instrument during the suspect measurement window and evaluates
the consequence for each.

### Suspect Window Definition

```
suspect_window_start = previous_calibration_date
                       (last confirmed in-tolerance result)
suspect_window_end   = oot_discovery_date
                       (date current calibration performed)
```

If no previous calibration record exists: `suspect_window_start` defaults to
instrument commissioning date or last physical verification date.

### Scope Rules

1. **Inspection records using this instrument**: query `inspection_result` where
   `instrument_id = oot_instrument_id` AND
   `measurement_datetime BETWEEN suspect_window_start AND suspect_window_end`
2. **Calibration records using this instrument as reference**: query
   `calibration_event` where `reference_instrument_id = oot_instrument_id`
   AND `calibration_date BETWEEN suspect_window_start AND suspect_window_end`
3. **WOs where this equipment is the production asset** (if oot asset is production
   equipment with measurement capability): query `wo_operation` where
   `equipment_id = asset_id` AND `operation_date BETWEEN suspect_window`
4. **Lots produced or inspected in suspect window**: derived from the above;
   all `lot_id` values associated with affected inspection records or WO operations

### Cascade to Dependent State Machines

**SM-4 (Inspection Record)**: affected inspection records are flagged
`oot_suspect = true`. If disposition was ACCEPT for those records:
QC Manager review required. Disposition may need to be revised (triggers D5).

**SM-5 (Disposition Record)**: any use-as-is or accept disposition on an
affected lot must be re-evaluated. QC Manager receives `oot_review_required`
task. If re-evaluation changes the disposition: D5 MRB re-convened.

**SM-6 (NC/CAPA)**: OOT event creates a CAPA (typically Class B) with
root cause analysis targeting: instrument handling, storage conditions,
calibration interval, or user error.

**SM-10 (Batch Release — J1)**: for pharma, if any in-process measurement
or finished product test used the OOT instrument during the suspect window,
the affected batch(es) require QP review before release. Batch may be placed
on hold pending OOT investigation conclusion.

**SM-INSP (Active Inspections)**: any currently open inspection record using
the OOT instrument is immediately flagged; inspector notified to stop measurement
and await substitute instrument.

### OOT Severity Classification

| Class | Condition | Consequence |
|-------|----------|------------|
| `oot_minor` | Deviation < 10% beyond tolerance; short suspect window (< 7 days) | Review affected records; spot re-measurement; CAPA Class C |
| `oot_major` | Deviation 10–50% beyond tolerance; or suspect window 7–30 days | Full scope impact analysis; re-measurement of all affected critical characteristics; CAPA Class B |
| `oot_critical` | Deviation > 50% beyond tolerance; suspect window > 30 days; safety-critical measurements | Full re-inspection of all affected lots; potential batch rejection (J1); regulatory notification assessment; CAPA Class A |

### OOT Impact Assessment Record

The `oot_impact_assessment` table captures:
```
oot_event_id, instrument_id, oot_severity,
suspect_window_start, suspect_window_end,
affected_inspection_records[],
affected_lots[],
affected_batches[] (J1),
affected_calibration_records[],
recommended_actions[],
qc_manager_review_date, qc_manager_id,
batch_hold_count (J1),
re_inspection_required (bool),
regulatory_notification_required (bool),
oot_impact_assessment_conclusion,
capa_id (FK → capa triggered by this OOT)
```

### Regulatory Notification

For J1 Pharma: OOT critical event affecting GMP measurements used in batch
release → QP assesses whether FDA (21 CFR 211.192) or EMA notification required.
`regulatory_notification_required` flag set; Regulatory Affairs action item created.

For J4 Medical Device: OOT critical event affecting device conformance testing
→ Regulatory Affairs assesses EU MDR Article 87 (serious incident) applicability.

---

## §7 LOTO Procedure (OSHA 29 CFR 1910.147)

For all maintenance on equipment with hazardous energy sources (electrical,
pneumatic, hydraulic, thermal, gravitational, chemical), LOTO procedure governs:

### LOTO Steps Recorded in MWO

1. **Notify**: affected operators notified that equipment will be shut down
2. **Identify energy sources**: LOTO procedure document lists all energy sources
   for this asset (from `equipment_loto_procedure`)
3. **Shut down**: equipment shut down by normal stopping procedure
4. **Isolate**: all energy isolation devices (switches, valves, plugs) operated
   to isolating/OFF position
5. **Lock and tag**: lockout/tagout device applied to each isolation point;
   `loto_application_record` created per isolation point with: `technician_id`,
   `lock_serial_number`, `tag_id`, `applied_at`
6. **Stored energy release**: release or restrain residual/stored energy
   (bleed pneumatic lines, block elevated parts, discharge capacitors)
7. **Verify isolation**: test by attempting to start equipment (push button test);
   test points for de-energization confirmed; `loto_verification_record` created
   by a person other than the lockout applicant

**MWO cannot transition from `released` to `loto_applied` without both
`loto_application_record` AND `loto_verification_record`** (with different
`technician_id` for application vs. verification).

LOTO removal: reverse order; lockout applicant removes their lock last;
all personnel accounted for before lock removal; equipment tested for safe restart.
`loto_removal_record` created with `removed_by`, `removed_at`, `energy_restored_confirmed`.

---

## §8 Step Substance

### Step 1 — MWO Creation and Planning

PM-triggered MWO is auto-created by the PM cycle engine with:
- `mwo_type` ∈ {PM, CM, CAL, OOT_RESPONSE, QUALIFICATION, LOTO_AUDIT}
- All task steps from PM plan (`pm_plan.task_list[]`)
- Estimated labor hours, skill requirements
- Parts list from `pm_plan.parts_required[]`
- Estimated duration and target start/end dates

Corrective maintenance MWO is created manually or from a downtime event:
- Failure description from operator
- Initial fault code (from equipment failure code taxonomy)
- AI-04 may suggest probable cause and recommended repair procedure based on
  failure symptom + equipment type + historical work orders

### Step 2 — Parts Reservation and Pre-Work Staging

For PM MWOs with known parts requirements, parts are reserved from spare parts
inventory 5 days before planned start (configurable). If parts unavailable,
D2 purchase request generated (T-08 in D2 — maintenance spare part trigger).

Pre-work staging: tools required are checked out from tool crib;
`tool_issue_record` created; calibrated measuring instruments verified
(calibration due date checked before issue).

### Step 3 — Energy Isolation (LOTO)

LOTO is mandatory for all MWOs with `loto_required = true`. LOTO applicant
follows the `equipment_loto_procedure` document (D7-controlled). Application
and verification records captured in system as described in §7.

### Step 4 — Maintenance Execution and Task Recording

Technician records each task step completion in MWO:
- `task_completion_record`: `step_id`, `completed_by`, `completed_at`,
  `actual_time_spent`, `observation_notes`, `parts_consumed[]`
- Measurements recorded (e.g., vibration levels, alignment readings, insulation
  resistance) stored as `maintenance_measurement` records
- Photographs attached as evidence for significant findings

Defects found during PM (beyond scope of PM task): `additional_defect_found`
triggers a new CM MWO linked to the original PM MWO.

### Step 5 — Post-Maintenance Inspection

After task completion and before LOTO removal, post-maintenance inspection
verifies the work:
- Visual inspection: no tools or materials left inside equipment
- Functional check: equipment operates as specified
- Measurement verification: critical parameters within spec (alignment, torque,
  clearances)
- For calibration equipment: calibration standards traced to national/international
  standard (NIST, PTB, etc.) — traceability chain documented

### Step 6 — Return to Service

RTS authorization requires:
- Post-maintenance inspection PASS
- LOTO removed (recorded)
- Equipment status updated to AVAILABLE
- For J3 aviation: FAA Form 8130-3 signed by authorized return-to-service (ARRS)
  mechanic — this is BD-25 gate

**BD-25**: Aero aviation component return-to-service sign-off on FAA Form 8130-3
requires authorized ARRS (Airframe & Powerplant mechanic with Inspection
Authorization or DAR) e-signature. No supervisory override permitted.

API: `POST /api/v1/maintenance/mwo/{id}/rts-authorize` → 403 if BD-25 not satisfied.

### Step 7 — Cost Settlement

Upon MWO closure:
1. Actual labor cost = `Σ(task_records.actual_time × labor_rate[technician_grade])`
2. Actual parts cost = `Σ(parts_consumed.qty × part.standard_cost)`
3. Overhead applied
4. Cost posted to GL: PM cost to `maintenance_expense` account;
   CM cost to `corrective_maintenance_expense`; calibration to `calibration_expense`
5. Equipment `maintenance_cost_ytd` updated
6. Spare parts inventory depleted
7. Next PM due date calculated and updated on asset record

---

## §9 Per-Pack Overlays

### J1 Pharma
- **Cleaning validation**: dedicated cleaning validation MWOs are scheduled
  per the `cleaning_validation_master` plan. Each cleaning cycle generates a
  `cleaning_validation_record` with: equipment ID, product residue limit tested,
  cleaning agent, rinse verification result, TOC or swab result.
  If cleaning validation result > limit: equipment quarantined; `capa` triggered.
- **Aseptic area environmental monitoring**: scheduled environmental monitoring
  (settle plates, surface contact plates, air particle counts) generates MWOs.
  Excursions trigger `environmental_excursion_alert` and may trigger D6 CAPA.

### J2 Automotive
- **MSA (Measurement System Analysis)**: gauge R&R studies per IATF 16949
  §7.1.5.1 are scheduled as calibration MWOs. `msa_study_record` stores:
  appraiser names, parts measured, readings, %R&R, %P/T. If %R&R > 30%:
  measurement system requires improvement before use in production control.
- **Preventive maintenance as production control**: control plan references PM
  intervals for machines affecting CTQ characteristics; PM overdue blocks WO
  dispatch (G2 gate).

### J3 Aerospace
- **Airworthiness Directive (AD)**: FAA/EASA ADs are tracked in `ad_compliance_record`
  per tail number or part serial number. AD compliance MWO created with
  `ad_number`, `ad_revision`, `compliance_method`, `compliance_date_required`.
  BD-25 applies: AD compliance sign-off is non-delegable for ARRS. Overdue
  ADs block aircraft/component from service.
- **Service Bulletin (SB)**: OEM SBs are tracked in `service_bulletin_record`.
  For mandatory SBs (with AD backing): same enforcement as AD. For optional SBs:
  engineering review and `sB_compliance_decision` documented.
- **SLLP**: `safety_life_limited_part` record tracks remaining life (hours,
  cycles, calendar) per serial number. When `remaining_life ≤ alert_threshold`:
  replacement MWO automatically created.

### J4 Medical Device
- **Sterilizer validation**: for production sterilizers, ISO 11135 (EtO),
  ISO 11137 (radiation), or ISO 17665 (moist heat) annual re-validation
  MWOs are required. `sterilization_cycle_validation_record` stores:
  all biological indicator (BI) results, physical cycle parameters, D-value,
  overkill or bioburden-based cycle type. Any BI fail → equipment quarantined;
  CAPA; all batches sterilized since last successful validation flagged.
- **IQ/OQ/PQ**: for production equipment under 21 CFR 820 and EU MDR,
  qualification protocols must be executed after installation, major repair,
  or relocation. `qualification_record` (IQ/OQ/PQ type) tracks protocol version,
  execution date, results, and approval signatures.

### J5 Food Safety
- **HTST Pasteurizer calibration (Grade A PMO)**: NCIMS Grade A farms/plants
  require quarterly HTST recalibration by state regulatory authority or
  authorized person. `pasteurizer_calibration_record` stores: flow diversion
  device test, temperature recording device calibration, holding time verification.
- **LACF thermal process**: acidified foods / low-acid canned foods require
  retort (thermal processing equipment) scheduled re-calibration and process
  authority review. `thermal_process_record` links to FDA scheduled process filing.

---

## §10 BD-25 Enforcement

**BD-25**: Aerospace aviation maintenance return-to-service authorization
(FAA Form 8130-3 or equivalent EASA Form 1) requires ARRS mechanic e-signature.
No alternate sign-off. No delegation.

Required: signatory holds `arrs_certification = true` in `personnel.certifications`;
certification must not be expired.

E-sig recorded in `banned_decision_log`:
```
bd_code: "BD-25"
mwo_id: <UUID>
asset_id: <UUID>
ad_number: <string or null>
arrs_certificate_number: <string>
arrs_expiry_date: <date>
esig_hash: <SHA-256>
timestamp: <ISO 8601>
```

---

## §11 Cross-Workflow Couplings

| Coupled Workflow | Coupling | Direction |
|-----------------|---------|-----------|
| D3 Plan to Produce | G2 equipment gate; PM due blocks WO dispatch | D9 → D3 (gate); D3 → D9 (PM prediction trigger) |
| D2 Procurement to Pay | Spare part shortage triggers D2 purchase | D9 → D2 |
| D4 Receive to Inspect | Calibration equipment return receipt triggers SM-CAL release | D2/D4 → D9 |
| D6 NC to CAPA | OOT event triggers CAPA; calibration failure triggers CAPA | D9 → D6 |
| D5 Inspect to Disposition | OOT impact cascade affects affected inspection dispositions | D9 → D5 |
| D8 Train to Qualify | Maintenance technician certification feeds G2-tech gate | D8 → D9 |
| D10 Batch to Release | OOT critical holds J1 batches for QP review | D9 → D10 (J1) |
| C11 Finance | Maintenance cost GL posting | D9 → C11 |
| C9 Maintenance & EHS | Asset master; PM plan; calibration master | C9 ↔ D9 |

---

## §12 KPIs

| KPI | Definition | Target |
|-----|-----------|--------|
| KPI-D9-01 | PM Compliance Rate | PMs completed on or before due date / total PMs scheduled × 100 | ≥ 98% |
| KPI-D9-02 | Mean Time to Repair (MTTR) | `rts_authorized_at − cm_mwo_created_at` average | Per equipment class target |
| KPI-D9-03 | Mean Time Between Failures (MTBF) | Operating hours / number of CM events | Track trend; improve |
| KPI-D9-04 | OEE Impact from Unplanned Downtime | Unplanned downtime hours / total available hours × 100 | ≤ 3% |
| KPI-D9-05 | Calibration On-Time Compliance | Calibrations performed on or before due date / total scheduled × 100 | 100% |
| KPI-D9-06 | OOT Rate | OOT calibration events / total calibrations × 100 | ≤ 1% |
| KPI-D9-07 | OOT Impact Assessment Cycle Time | OOT detected → impact assessment complete | ≤ 48 hours |
| KPI-D9-08 | PM-to-CM Ratio | PM MWO count / CM MWO count in period | ≥ 4:1 (high ratio = proactive program) |
| KPI-D9-09 | AD Compliance Rate (J3) | ADs complied before compliance date / total ADs | 100% |
| KPI-D9-10 | SLLP Replacement On-Time (J3) | SLLP replacements before life expiry / total SLLP expirations | 100% |
| KPI-D9-11 | Sterilization Cycle Validation Pass Rate (J4) | Validation passes / total validations × 100 | ≥ 98% |
| KPI-D9-12 | Cleaning Validation Excursion Rate (J1) | Cleaning validation excursions / total cleaning validations × 100 | ≤ 0.5% |
| KPI-D9-13 | LOTO Incident Rate | LOTO-related safety incidents per 200,000 labor hours | 0 |

---

## §13 Failure Modes

| FM # | Failure Mode | Cause | Detection | Mitigation |
|------|-------------|-------|----------|----------|
| FM-01 | PM overdue not blocking production (G2 gate miss) | Eligibility resolver not consulting PM due date | G2 gate audit; OEE impact | G2 gate queries `equipment.next_pm_due > wo.planned_end_date` |
| FM-02 | LOTO not applied before maintenance | Time pressure; procedure shortcut | Incident investigation; near-miss report | MWO cannot transition to `in_progress` without LOTO records; OSHA enforcement |
| FM-03 | OOT instrument not quarantined; continues in use | Calibration lab result not propagated in time | OOT cascade latency monitor | OOT status propagated immediately on calibration result entry; instrument flagged in all inspection screens |
| FM-04 | OOT impact assessment scope incomplete | Query logic misses some inspection records | Impact assessment completeness audit | SQL query for affected records system-generated; manual exclusions require QA sign-off |
| FM-05 | AD compliance overdue (J3) | AD tracking not linked to maintenance scheduler | AD compliance rate KPI | AD compliance engine auto-creates MWO; BD-25 block on asset use if overdue |
| FM-06 | SLLP counter not updated after maintenance (J3) | Technician skips step; system not integrated | SLLP audit; unexpected expiry | SLLP counter update is mandatory MWO task step for life-limited parts |
| FM-07 | Sterilizer BI fails and batch not recalled (J4) | BI result not integrated with batch tracking | Sterilization-to-batch linkage check | Sterilizer cycle ID on WO receipt; BI fail blocks WO closure |
| FM-08 | Spare part not available at PM start (G3 pre-check missed) | Parts reservation not done in advance | Awaiting-parts KPI; PM delay | 5-day advance parts reservation; D2 trigger if shortage; PM deferral approval |
| FM-09 | BD-25 signed by unqualified technician (J3) | Role misconfiguration | BD-25 audit | Hard API block; ARRS certification validated against `personnel.certifications` |
| FM-10 | Cleaning validation excursion not triggering CAPA (J1) | CLeaning validation result not linked to NC | Cleaning validation → CAPA link audit | Cleaning validation excursion auto-creates NCR and CAPA (Class B minimum) |
| FM-11 | HTST pasteurizer calibration overdue (J5) | Schedule miss; state authority visit | Grade A audit; PMO violation | System alert 14 days before HTST calibration due; production block if overdue per PMO |
| FM-12 | MSA study failure not triggering measurement system corrective action (J2) | Study result entered but no follow-on | MSA >30% R&R alert | MSA result > 30% auto-creates CAPA and blocks use of measurement system in production |
| FM-13 | Post-maintenance inspection skipped | Technician self-certifies without inspection | RTS audit; equipment failure after PM | MWO cannot transition to `rts_pending` without `inspection_pending → passed` |
| FM-14 | OOT impact affects shipped product — customer not notified | OOT cascade not extending to shipment history | Traceability audit; customer complaint | OOT cascade queries `shipment` records for affected lots; customer notification procedure triggered |

---

*Decision phrase: S2-11_D8_D9_DEEP_UPGRADE_COMPLETE*
