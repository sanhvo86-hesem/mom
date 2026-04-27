# C7 — Quality Improvement (eQMS)

**Version:** V10 Deep Upgrade  
**Prompt source:** S2-04_C7_QUALITY_EQMS  
**Supersedes:** V9 C7_QUALITY_IMPROVEMENT.md  

---

## 1. Domain Purpose and Boundaries

C7 is the heart of regulated trust in HESEM. It provides the formal quality discipline across inspection, nonconformance, CAPA, controlled documents, batch release, risk management, audit management, complaint handling, vigilance/pharmacovigilance, and recall. Every regulated industry depends on this domain operating correctly; without it HESEM cannot be used by customers under 21 CFR Part 820, ISO 13485, ICH Q7/Q10, IATF 16949, AS9100D, or FSMA.

**Domain boundaries:**

| Boundary | C7 owns | C7 consumes | C7 produces |
|---|---|---|---|
| Upstream | — | WO step results from C6; Lot status from C5; PO receipt from C4; Complaints from C1 | — |
| Downstream | — | — | Lot disposition to C5; BREL authority to C8; CAPA actions to C6/C2/C4; Audit evidence to external bodies |
| Excluded | Scheduling, BOM authoring, shipment execution, financial settlement | — | — |

All 28 Banned Decisions (BD-1 through BD-28) have their highest concentration in this domain. The system enforces them at the API layer; each is documented in §6.

---

## 2. Resource Families

### 2.1 Core Quality Resources

**NC — Nonconformance Case (NQCASE)**

| Field | Type | Notes |
|---|---|---|
| nc_id | UUID PK | |
| nc_number | VARCHAR(20) | Display key, site-unique |
| title | VARCHAR(200) | |
| severity | ENUM | critical, major, minor, cosmetic |
| source | ENUM | iqc, ipc, fqc, ipqc, audit, complaint, field, self_identified, supplier |
| status | ENUM | draft, open, in_investigation, in_disposition, dispositioned, awaiting_capa, closed, reopened |
| item_id | UUID FK | nullable |
| lot_id | UUID FK | nullable |
| wo_id | UUID FK | nullable |
| po_receipt_id | UUID FK | nullable |
| description | TEXT | |
| defect_codes | VARCHAR[] | |
| qty_affected | DECIMAL(18,6) | |
| uom | VARCHAR(10) | |
| discoverer_id | UUID FK | |
| discovered_at | TIMESTAMPTZ | |
| containment_action | TEXT | |
| containment_deadline | TIMESTAMPTZ | |
| disposition | ENUM | accept_asis, concession, rework, reject, use_as_is_deviation |
| disposition_authority | UUID FK | BD-2 human required |
| capa_id | UUID FK | nullable |
| scar_id | UUID FK | nullable — supplier-source NCs |
| closed_at | TIMESTAMPTZ | |
| pack_overlay | JSONB | |

**CAPA — Corrective and Preventive Action**

| Field | Type | Notes |
|---|---|---|
| capa_id | UUID PK | |
| capa_number | VARCHAR(20) | |
| type | ENUM | corrective, preventive, improvement |
| source_nc_id | UUID FK | nullable — may be proactive |
| source_complaint_id | UUID FK | nullable |
| source_audit_finding_id | UUID FK | nullable |
| status | ENUM | draft, open, investigation, root_cause_identified, action_in_progress, effectiveness_pending, closed_effective, closed_ineffective, reopened |
| root_cause_type | ENUM | method, material, machine, man, environment, measurement |
| root_cause_description | TEXT | |
| corrective_actions | JSONB | array of {action_id, description, owner_id, due_date, status} |
| preventive_actions | JSONB | array of {action_id, description, owner_id, due_date, status} |
| effectiveness_criteria | TEXT | |
| effectiveness_check_due | TIMESTAMPTZ | now + 90 days configurable |
| effectiveness_result | ENUM | pass, fail, null |
| closed_by | UUID FK | BD-3 human required |
| closed_at | TIMESTAMPTZ | |
| effectiveness_signed_by | UUID FK | BD-6 second signer |

**8D Investigation Record (J2 Auto)**

| Field | Type | Notes |
|---|---|---|
| eight_d_id | UUID PK | |
| capa_id | UUID FK | linked CAPA |
| nc_id | UUID FK | triggering NC |
| team_members | UUID[] | D1 team formation |
| problem_statement | TEXT | D2 |
| containment_actions | JSONB | D3 immediate containment |
| root_cause_ishikawa | JSONB | D4 — array of fishbone branches |
| root_cause_5why | JSONB | D4 5-Why chain |
| corrective_actions | JSONB | D5 permanent corrective actions |
| preventive_actions | JSONB | D6 system prevention |
| congratulated_team | BOOLEAN | D8 team recognition |
| status | ENUM | in_progress, submitted, customer_approved, closed |
| customer_id | UUID FK | automotive customer requiring 8D |
| submitted_to_customer_at | TIMESTAMPTZ | |
| customer_response | TEXT | |

**Audit Plan**

| Field | Type | Notes |
|---|---|---|
| audit_plan_id | UUID PK | |
| plan_year | SMALLINT | |
| site_id | UUID FK | |
| audit_type | ENUM | internal, supplier, customer, regulatory, certification |
| scheduled_audits | JSONB | array of {audit_run_id, scope, lead_auditor_id, date_range} |
| risk_based_sampling | BOOLEAN | |
| standard_coverage | VARCHAR[] | e.g. ['ISO_13485', 'IATF_16949'] |
| approved_by | UUID FK | |
| approved_at | TIMESTAMPTZ | |

**Audit Run**

| Field | Type | Notes |
|---|---|---|
| audit_run_id | UUID PK | |
| audit_plan_id | UUID FK | nullable (unplanned allowed) |
| audit_type | ENUM | internal, supplier, customer, regulatory, certification, mock_recall |
| scope | TEXT | |
| site_id | UUID FK | |
| lead_auditor_id | UUID FK | |
| auditor_ids | UUID[] | |
| auditee_ids | UUID[] | |
| scheduled_start | DATE | |
| scheduled_end | DATE | |
| actual_start | DATE | |
| actual_end | DATE | |
| status | ENUM | planned, in_progress, completed, report_issued, closed |
| findings_count | INTEGER | |
| report_file_id | UUID | |

**Audit Finding**

| Field | Type | Notes |
|---|---|---|
| finding_id | UUID PK | |
| audit_run_id | UUID FK | |
| finding_type | ENUM | major_nc, minor_nc, observation, opportunity |
| clause_reference | VARCHAR(60) | e.g. 'ISO 13485:2016 §8.5.2' |
| description | TEXT | |
| objective_evidence | TEXT | |
| status | ENUM | open, response_submitted, verified_closed, accepted_risk |
| capa_id | UUID FK | nullable |
| close_deadline | DATE | |
| closed_by | UUID FK | BD-12 human required |
| closed_at | TIMESTAMPTZ | |

**Inspection Plan**

| Field | Type | Notes |
|---|---|---|
| insp_plan_id | UUID PK | |
| item_id | UUID FK | |
| inspection_type | ENUM | iqc, ipc, fqc, ipqc |
| revision | SMALLINT | |
| check_items | JSONB | array of {characteristic, method, instrument, usl, lsl, aql_level} |
| sample_plan_id | UUID FK | |
| skip_lot_eligible | BOOLEAN | |
| status | ENUM | draft, approved, obsolete |
| approved_by | UUID FK | |

**Inspection Sample Plan**

| Field | Type | Notes |
|---|---|---|
| sample_plan_id | UUID PK | |
| plan_type | ENUM | ansi_z14, mil_std_1916, fixed_n, percent_sample, 100pct |
| aql_level | DECIMAL(4,2) | acceptable quality level |
| inspection_level | VARCHAR(5) | e.g. II, S-4 |
| lot_size_ranges | JSONB | array of {min_lot, max_lot, sample_n, accept_c, reject_r} |

**Inspection Record**

| Field | Type | Notes |
|---|---|---|
| inspection_id | UUID PK | |
| inspection_type | ENUM | iqc, ipc, fqc, ipqc |
| insp_plan_id | UUID FK | |
| wo_id | UUID FK | nullable (IPC) |
| po_receipt_id | UUID FK | nullable (IQC) |
| lot_id | UUID FK | |
| item_id | UUID FK | |
| sample_qty | INTEGER | |
| defects_found | INTEGER | |
| status | ENUM | scheduled, in_progress, completed, dispositioned |
| result | ENUM | accept, reject, conditional |
| disposition_id | UUID FK | |
| inspector_id | UUID FK | |
| completed_at | TIMESTAMPTZ | |
| measurements | JSONB | per-characteristic results array |

**Disposition Record**

| Field | Type | Notes |
|---|---|---|
| disposition_id | UUID PK | |
| lot_id | UUID FK | |
| nc_id | UUID FK | nullable |
| inspection_id | UUID FK | nullable |
| decision | ENUM | accept_asis, concession, rework, reject, return_to_vendor, destroy |
| decision_authority | UUID FK | BD-2 required |
| mrb_required | BOOLEAN | |
| mrb_id | UUID FK | nullable |
| rationale | TEXT | |
| conditions | TEXT | for concession decisions |
| decided_at | TIMESTAMPTZ | |

**MRB Decision Record**

| Field | Type | Notes |
|---|---|---|
| mrb_id | UUID PK | |
| nc_id | UUID FK | |
| lot_id | UUID FK | |
| question | TEXT | borderline issue to resolve |
| required_parties | JSONB | array of {role, user_id, signed_at} — Quality + Engineering + Production minimum |
| decision | ENUM | accept_asis, concession, rework, reject |
| conditions | TEXT | |
| all_signed | BOOLEAN | computed — true when all required_parties have signed |
| decided_at | TIMESTAMPTZ | |

**Batch Release (BREL)**

| Field | Type | Notes |
|---|---|---|
| brel_id | UUID PK | |
| lot_id | UUID FK | |
| product_id | UUID FK | |
| batch_number | VARCHAR(60) | |
| release_type | ENUM | standard, parametric, real_time |
| checklist | JSONB | array of {item, required_evidence_id, status} |
| open_nc_count | INTEGER | must = 0 for release |
| ebr_id | UUID FK | nullable — J1 Pharma |
| coa_approved | BOOLEAN | |
| status | ENUM | initiated, review_in_progress, pending_release, released, rejected, on_hold |
| released_by | UUID FK | BD-1 QP/PRRC human required |
| released_at | TIMESTAMPTZ | |
| rejection_reason | TEXT | |
| hold_reason | TEXT | |

**Doc Review Record**

| Field | Type | Notes |
|---|---|---|
| doc_review_id | UUID PK | |
| doc_id | UUID FK | C2/C7 controlled document |
| review_cycle | SMALLINT | |
| scheduled_date | DATE | |
| status | ENUM | scheduled, in_progress, completed, skipped_with_rationale |
| reviewers | JSONB | array of {user_id, reviewed_at, comment} |
| outcome | ENUM | no_change, update_required, obsolete |
| next_review_date | DATE | |

**Doc Effectivity Record**

| Field | Type | Notes |
|---|---|---|
| effectivity_id | UUID PK | |
| doc_id | UUID FK | |
| effective_from | DATE | |
| effective_to | DATE | nullable |
| transition_type | ENUM | new_release, revision, supersession, withdrawal |
| training_required | BOOLEAN | |
| training_completion_deadline | DATE | |
| approved_by | UUID FK | BD-4 human required |

**Risk Management File**

| Field | Type | Notes |
|---|---|---|
| rmf_id | UUID PK | |
| product_id | UUID FK | |
| standard | ENUM | iso_14971, iec_62366, iso_24971 |
| scope | TEXT | |
| risk_acceptability_policy_id | UUID FK | |
| status | ENUM | draft, in_review, approved, under_revision |
| version | INTEGER | |
| approved_by | UUID FK | BD-13 human required |
| approved_at | TIMESTAMPTZ | |

**Risk Acceptability Policy**

| Field | Type | Notes |
|---|---|---|
| rap_id | UUID PK | |
| product_family | VARCHAR(60) | |
| severity_scale | JSONB | array of {level, label, criteria} |
| probability_scale | JSONB | |
| risk_matrix | JSONB | 5×5 or configurable — each cell mapped to {acceptable, alarp, unacceptable} |
| version | INTEGER | |
| approved_by | UUID FK | |

**Risk Record**

| Field | Type | Notes |
|---|---|---|
| risk_record_id | UUID PK | |
| rmf_id | UUID FK | |
| hazard_id | VARCHAR(20) | |
| hazard_description | TEXT | |
| hazardous_situation | TEXT | |
| harm | TEXT | |
| severity | SMALLINT | 1–5 |
| probability_before | SMALLINT | 1–5 |
| risk_before | SMALLINT | severity × probability |
| controls | JSONB | array of {control_id, description, type, effectiveness} |
| residual_severity | SMALLINT | |
| residual_probability | SMALLINT | |
| residual_risk | SMALLINT | |
| acceptability | ENUM | acceptable, alarp, unacceptable |
| benefit_justification | TEXT | required if ALARP |
| status | ENUM | open, accepted, controlled, monitored |

### 2.2 Pack-Specific Quality Resources

**QP Declaration (J1 Pharma)**

| Field | Type | Notes |
|---|---|---|
| qp_declaration_id | UUID PK | |
| brel_id | UUID FK | |
| batch_number | VARCHAR(60) | |
| qp_user_id | UUID FK | EU Qualified Person, licensed per Directive 2001/83/EC |
| declaration_type | ENUM | full, certified_import, param_release |
| checklist_completion | BOOLEAN | all EU GMP chapter checks signed |
| declared_at | TIMESTAMPTZ | |
| eu_batch_number | VARCHAR(60) | EU-assigned secondary number |
| country_released_to | VARCHAR[] | ISO country codes |

**PRRC Decision (J4 Medical Device)**

| Field | Type | Notes |
|---|---|---|
| prrc_decision_id | UUID PK | |
| brel_id | UUID FK | |
| prrc_user_id | UUID FK | Person Responsible for Regulatory Compliance per EU MDR Art 15 |
| device_id | UUID FK | |
| udi_di | VARCHAR(60) | |
| conformity_declaration | BOOLEAN | EU MDR Art 10 |
| pms_plan_referenced | BOOLEAN | |
| decided_at | TIMESTAMPTZ | |

**APR — Annual Product Review (J1 Pharma)**

| Field | Type | Notes |
|---|---|---|
| apr_id | UUID PK | |
| product_id | UUID FK | |
| review_year | SMALLINT | |
| period_start | DATE | |
| period_end | DATE | |
| batch_count | INTEGER | |
| batch_summary | JSONB | yield trends, OOS count, deviations |
| oos_investigation_count | INTEGER | |
| deviation_count | INTEGER | |
| complaint_count | INTEGER | |
| capa_count | INTEGER | |
| stability_data_summary | JSONB | |
| conclusion | TEXT | |
| status | ENUM | draft, in_review, approved, filed |
| approved_by | UUID FK | BD-9 human required |
| approved_at | TIMESTAMPTZ | |

**Stability Study (J1 Pharma)**

| Field | Type | Notes |
|---|---|---|
| stability_study_id | UUID PK | |
| product_id | UUID FK | |
| study_type | ENUM | long_term, accelerated, intermediate, stress, photostability |
| conditions | JSONB | {temperature_c, humidity_pct, light_lux} |
| pull_schedule | JSONB | array of {timepoint_months, due_date} |
| status | ENUM | active, completed, discontinued |
| conclusion_supported | BOOLEAN | shelf life supported |
| shelf_life_months | INTEGER | |
| approved_by | UUID FK | BD-19 human required |

**Stability Pull**

| Field | Type | Notes |
|---|---|---|
| stability_pull_id | UUID PK | |
| stability_study_id | UUID FK | |
| timepoint_months | INTEGER | |
| pulled_at | DATE | |
| results | JSONB | per-test result array |
| pass | BOOLEAN | all tests within spec |
| oos_triggered | BOOLEAN | |
| oos_investigation_id | UUID FK | nullable |

**Deviation (J1 Pharma)**

| Field | Type | Notes |
|---|---|---|
| deviation_id | UUID PK | |
| deviation_number | VARCHAR(20) | |
| type | ENUM | planned, unplanned |
| batch_number | VARCHAR(60) | |
| wo_id | UUID FK | |
| description | TEXT | |
| affected_steps | JSONB | |
| impact_assessment | TEXT | |
| status | ENUM | draft, open, under_investigation, disposition_pending, closed, capa_required |
| closed_by | UUID FK | BD-10 human required |
| capa_id | UUID FK | nullable |

**Vigilance Report (J4 Medical Device)**

| Field | Type | Notes |
|---|---|---|
| vig_report_id | UUID PK | |
| device_id | UUID FK | |
| udi_di | VARCHAR(60) | |
| event_description | TEXT | |
| patient_impact | ENUM | death, serious_injury, no_injury, near_miss |
| reportability | ENUM | reportable, not_reportable, under_review |
| reportability_determined_by | UUID FK | BD-15 human required |
| report_type | ENUM | initial, follow_up, final |
| competent_authority | VARCHAR(100) | |
| submission_deadline | DATE | |
| submitted_at | TIMESTAMPTZ | |
| status | ENUM | draft, under_review, submitted, closed |
| fsca_triggered | BOOLEAN | |
| fsca_id | UUID FK | nullable |

**PSUR — Periodic Safety Update Report (J4 MD)**

| Field | Type | Notes |
|---|---|---|
| psur_id | UUID PK | |
| device_id | UUID FK | |
| period_start | DATE | |
| period_end | DATE | |
| serious_incident_count | INTEGER | |
| trend_analysis | TEXT | |
| benefit_risk_conclusion | TEXT | |
| status | ENUM | draft, in_review, approved, submitted |
| approved_by | UUID FK | BD-14 human required |
| submitted_to | VARCHAR(100) | regulatory body |
| submitted_at | TIMESTAMPTZ | |

**PMS Plan + PMS Report (J4 MD)**

| Field | Type | Notes |
|---|---|---|
| pms_plan_id | UUID PK | |
| device_id | UUID FK | |
| methods | JSONB | array of {method_type, data_source, frequency} |
| complaint_threshold_triggers | JSONB | |
| version | INTEGER | |
| approved_by | UUID FK | |

| pms_report_id | UUID PK | |
| pms_plan_id | UUID FK | |
| report_period | VARCHAR(20) | |
| data_summary | JSONB | |
| benefit_risk_assessment | TEXT | |
| actions_required | JSONB | |

**Clinical Evaluation Report (J4 MD)**

| Field | Type | Notes |
|---|---|---|
| cer_id | UUID PK | |
| device_id | UUID FK | |
| cer_type | ENUM | initial, update |
| literature_review_date | DATE | |
| clinical_data_sources | JSONB | |
| equivalence_claimed | BOOLEAN | |
| conclusion | TEXT | |
| status | ENUM | draft, in_review, approved |
| approved_by | UUID FK | BD-11 human required |

**ICSR — Individual Case Safety Report (J1 Pharma)**

| Field | Type | Notes |
|---|---|---|
| icsr_id | UUID PK | |
| product_id | UUID FK | |
| event_date | DATE | |
| reporter_type | ENUM | hcp, patient, regulatory, spontaneous |
| adverse_event_terms | VARCHAR[] | MedDRA preferred terms |
| causality | ENUM | probable, possible, unlikely, unassessable |
| seriousness | ENUM | serious, non_serious |
| reportability | ENUM | reportable, not_reportable, under_review |
| reportability_determined_by | UUID FK | BD-24 human required |
| eudravigilance_ref | VARCHAR(40) | nullable |
| fda_ref | VARCHAR(40) | nullable |
| status | ENUM | draft, under_review, submitted, closed |
| submitted_at | TIMESTAMPTZ | |

**Customer Complaint**

| Field | Type | Notes |
|---|---|---|
| complaint_id | UUID PK | |
| complaint_number | VARCHAR(20) | |
| customer_id | UUID FK | C1 |
| product_id | UUID FK | |
| lot_id | UUID FK | nullable |
| description | TEXT | |
| category | ENUM | safety, labeling, performance, packaging, other |
| severity | ENUM | critical, major, minor |
| regulatory_reportable | BOOLEAN | |
| reportability_assessed_by | UUID FK | BD-15 required for MD; BD-24 for Pharma |
| nc_id | UUID FK | nullable |
| capa_id | UUID FK | nullable |
| status | ENUM | open, in_investigation, resolved, closed |
| resolution_text | TEXT | |
| closed_at | TIMESTAMPTZ | |

**Recall Decision**

| Field | Type | Notes |
|---|---|---|
| recall_id | UUID PK | |
| product_id | UUID FK | |
| lot_ids | UUID[] | affected lots |
| recall_class | ENUM | class_i, class_ii, class_iii, market_withdrawal, advisory |
| scope_classification | ENUM | voluntary, regulatory_directed, mandatory |
| scope_classified_by | UUID FK | BD-20 human required |
| initiated_by | UUID FK | BD-8 human required |
| regulatory_body | VARCHAR(100) | |
| notification_sent | BOOLEAN | |
| recall_number | VARCHAR(40) | agency-assigned |
| affected_units | INTEGER | |
| recovered_units | INTEGER | |
| status | ENUM | initiated, notification_sent, in_progress, effectiveness_check, closed |
| initiated_at | TIMESTAMPTZ | |
| closed_at | TIMESTAMPTZ | |

**FSCA — Field Safety Corrective Action (J4 MD)**

| Field | Type | Notes |
|---|---|---|
| fsca_id | UUID PK | |
| device_id | UUID FK | |
| vig_report_id | UUID FK | nullable |
| fsca_type | ENUM | software_update, device_recall, advisory, inspection_modification, user_guidance |
| classification | ENUM | class_i, class_ii, class_iii |
| classified_by | UUID FK | BD-16 human required |
| affected_units | INTEGER | |
| customer_notifications | JSONB | array of {customer_id, sent_at, ack_at} |
| competent_authority_notified_at | TIMESTAMPTZ | |
| fsn_issued | BOOLEAN | Field Safety Notice issued |
| status | ENUM | planned, in_progress, completed, effectiveness_check, closed |

**Field Alert Report (J1 Pharma)**

| Field | Type | Notes |
|---|---|---|
| far_id | UUID PK | |
| product_id | UUID FK | |
| batch_number | VARCHAR(60) | |
| event_type | ENUM | contamination, wrong_strength, mislabeling, deterioration, other |
| submission_deadline | DATE | 3 business days (21 CFR 314.81) |
| submitted_at | TIMESTAMPTZ | |
| fda_case_number | VARCHAR(40) | |
| submitted_by | UUID FK | BD-25 human required |
| status | ENUM | draft, submitted, acknowledged |

**Reportable Food Registry (J5 Food)**

| Field | Type | Notes |
|---|---|---|
| rfr_id | UUID PK | |
| product_id | UUID FK | |
| event_description | TEXT | |
| rfr_number | VARCHAR(40) | FDA-assigned |
| submitted_at | TIMESTAMPTZ | |
| status | ENUM | draft, submitted, closed |

**Mock Recall Run (J5 Food + all packs)**

| Field | Type | Notes |
|---|---|---|
| mock_recall_id | UUID PK | |
| site_id | UUID FK | |
| run_date | DATE | |
| scenario | TEXT | |
| product_id | UUID FK | |
| lot_ids_targeted | UUID[] | |
| lots_traced_count | INTEGER | |
| lots_recovered_pct | DECIMAL(5,2) | ≥ 99% target |
| time_to_complete_h | DECIMAL(6,2) | ≤ 4h target |
| gaps_identified | JSONB | |
| capa_triggered | BOOLEAN | |
| status | ENUM | in_progress, completed, capa_required |

**Validation Master Plan**

| Field | Type | Notes |
|---|---|---|
| vmp_id | UUID PK | |
| site_id | UUID FK | |
| version | INTEGER | |
| scope | TEXT | |
| validation_policy | TEXT | |
| gxp_system_inventory | JSONB | array of {system_name, criticality, validation_status} |
| review_frequency_months | INTEGER | |
| approved_by | UUID FK | BD-21 required for protocol approvals |
| approved_at | TIMESTAMPTZ | |

**Validation Pack**

| Field | Type | Notes |
|---|---|---|
| val_pack_id | UUID PK | |
| system_id | UUID FK | |
| validation_type | ENUM | iq, oq, pq, csv, process, cleaning, method, computer_system |
| protocol_id | UUID FK | protocol document |
| protocol_approved_by | UUID FK | BD-21 human required |
| execution_records | JSONB | array of {test_id, result, executed_by, executed_at, deviation_note} |
| summary_report_id | UUID FK | |
| status | ENUM | protocol_draft, protocol_approved, execution_in_progress, report_draft, report_approved, validated, requires_revalidation |
| revalidation_trigger | TEXT | |

**Counterfeit Investigation (J3 Aero)**

| Field | Type | Notes |
|---|---|---|
| counterfeit_inv_id | UUID PK | |
| item_id | UUID FK | |
| lot_id | UUID FK | |
| supplier_id | UUID FK | |
| suspect_evidence | JSONB | marking discrepancies, material test failures, chain-of-custody gaps |
| classification | ENUM | suspect, confirmed_counterfeit, not_counterfeit |
| classified_by | UUID FK | BD-23 human required |
| gidep_report_id | VARCHAR(40) | nullable — BD-22 required for filing |
| gidep_filed_by | UUID FK | BD-22 human required |
| quarantine_lot_ids | UUID[] | |
| status | ENUM | open, classified, reported, closed |

**OOS Investigation Record (J1 Pharma)**

| Field | Type | Notes |
|---|---|---|
| oos_id | UUID PK | |
| stability_pull_id | UUID FK | nullable |
| batch_number | VARCHAR(60) | |
| test_method | VARCHAR(100) | |
| oos_result | VARCHAR(60) | |
| specification | VARCHAR(60) | |
| phase | ENUM | phase_1_lab, phase_2_full |
| phase_1_conclusion | ENUM | lab_error, valid_oos, inconclusive |
| phase_2_conclusion | ENUM | batch_failure, process_failure, other |
| final_conclusion_by | UUID FK | BD-27 human required |
| capa_triggered | BOOLEAN | |
| status | ENUM | open, phase_1, phase_2, concluded |

---

## 3. State Machines

### SM-4 — Inspection Receipt Lifecycle

| From | To | Trigger | Guard | Side-Effect |
|---|---|---|---|---|
| `scheduled` | `in_progress` | `start_inspection` | Inspector assigned; lot at location | Generate step checklist from Inspection Plan |
| `in_progress` | `completed` | `submit_results` | All check items answered | Evaluate accept/reject against AQL; compute pass/fail |
| `completed` | `dispositioned` | `record_disposition` | Disposition authority signs (BD-2) | Update lot.status in C5; emit `inspection.dispositioned` |
| `in_progress` | `on_hold` | `flag_hold` | Issue requiring clarification | Notify QE; preserve partial results |
| `on_hold` | `in_progress` | `resume_inspection` | Issue resolved | Resume checklist |

### SM-5 — Disposition Lifecycle

| From | To | Trigger | Guard | Side-Effect |
|---|---|---|---|---|
| `pending` | `in_mrb` | `escalate_to_mrb` | Standard disposition unclear; MRB required flag | Create MRB record; notify required parties |
| `in_mrb` | `decided` | `mrb_decide` | All required_parties signed | Set disposition decision; emit `disposition.decided` |
| `pending` | `decided` | `decide_direct` | No MRB required; BD-2 authority signs | Set disposition; lot status update in C5 |
| `decided` | `applied` | `apply_disposition` | Downstream action complete (scrap, rework, return) | Close disposition record |

### SM-6 — NC/CAPA Lifecycle

**NC portion:**

| From | To | Trigger | Guard | Side-Effect |
|---|---|---|---|---|
| `draft` | `open` | `submit_nc` | Required fields complete | Quarantine lot in C5; notify QE |
| `open` | `in_investigation` | `start_investigation` | Investigator assigned | Set investigation deadline |
| `in_investigation` | `in_disposition` | `complete_investigation` | Root cause documented | |
| `in_disposition` | `dispositioned` | `record_disposition` | BD-2 authority signs | Update lot; SCAR if supplier-source |
| `dispositioned` | `awaiting_capa` | `require_capa` | Severity warrants CAPA; auto-trigger for critical | Create CAPA record |
| `awaiting_capa` | `closed` | `close_nc` | CAPA linked and open; QE sign-off | |
| `closed` | `reopened` | `reopen` | New evidence; recurrence | Reset to `open` |

**CAPA portion:**

| From | To | Trigger | Guard | Side-Effect |
|---|---|---|---|---|
| `draft` | `open` | `submit_capa` | Root cause documented | |
| `open` | `investigation` | `start_investigation` | | |
| `investigation` | `root_cause_identified` | `confirm_root_cause` | Root cause type + description set | |
| `root_cause_identified` | `action_in_progress` | `plan_actions` | Actions with owners + due dates | |
| `action_in_progress` | `effectiveness_pending` | `complete_actions` | All corrective + preventive actions complete | Set effectiveness_check_due |
| `effectiveness_pending` | `closed_effective` | `close_capa` | BD-3 closes; BD-6 second signer; effectiveness_result=pass | Emit `capa.closed_effective` |
| `effectiveness_pending` | `closed_ineffective` | `fail_effectiveness` | BD-3 closes; recurrence observed | Create new CAPA; emit `capa.closed_ineffective` |
| `closed_effective` | `reopened` | `reopen` | New failure of same mode | Reset |

### SM-7 — Document Lifecycle

| From | To | Trigger | Guard | Side-Effect |
|---|---|---|---|---|
| `draft` | `in_review` | `submit_for_review` | Author submits | Notify reviewers |
| `in_review` | `approved` | `approve_doc` | All reviewers signed; BD-4 authority approves | Set approved_at; set effectivity |
| `in_review` | `draft` | `return_for_revision` | Reviewer rejects | Reset to author with comments |
| `approved` | `released` | `release_doc` | Effectivity date reached; BD-4 confirms | Doc effectivity record created; training triggered if required |
| `released` | `superseded` | `supersede` | New revision released | Old version archived; effectivity_to set |
| `released` | `withdrawn` | `withdraw_doc` | Urgent recall of doc | All copies flagged; training re-trigger |
| `withdrawn` | `draft` | `create_replacement` | | New draft linked to withdrawn |

### SM-10 — Batch Release Lifecycle

| From | To | Trigger | Guard | Side-Effect |
|---|---|---|---|---|
| `initiated` | `review_in_progress` | `start_review` | BREL checklist items assigned | |
| `review_in_progress` | `pending_release` | `complete_review` | All checklist items satisfied; zero open NCs; CoA approved | |
| `pending_release` | `released` | `release_batch` | BD-1: QP signature (J1) or PRRC (J4) or authorized QA manager; two-person e-sig for regulated | Lot.status = released in C5; emit `brel.released`; trigger C8 traceability lock |
| `pending_release` | `rejected` | `reject_batch` | BD-1 authority decides reject | Lot.status = quarantined; CAPA triggered |
| `review_in_progress` | `on_hold` | `place_hold` | Issue identified mid-review | Notify QA manager |
| `on_hold` | `review_in_progress` | `resume_review` | Hold resolved | |

### SM-11 — Recall Lifecycle

| From | To | Trigger | Guard | Side-Effect |
|---|---|---|---|---|
| `initiated` | `notification_sent` | `send_notifications` | BD-8 authority signs recall initiation; BD-20 scope classified | Customer notifications via C1; regulatory submission |
| `notification_sent` | `in_progress` | `begin_recovery` | | Track returned unit counts |
| `in_progress` | `effectiveness_check` | `assess_recovery` | Recovery target period elapsed | |
| `effectiveness_check` | `closed` | `confirm_close` | ≥ 99% recovery confirmed; regulatory close | |
| `effectiveness_check` | `in_progress` | `extend_recovery` | Recovery < target | Continue recovery activities |

### SM-12 — Audit Finding Lifecycle

| From | To | Trigger | Guard | Side-Effect |
|---|---|---|---|---|
| `open` | `response_submitted` | `submit_response` | Auditee submits corrective response | |
| `response_submitted` | `verified_closed` | `verify_close` | BD-12 authority verifies; objective evidence reviewed | Emit `finding.closed` |
| `response_submitted` | `open` | `reject_response` | Evidence insufficient | Return to auditee |
| `open` | `accepted_risk` | `accept_risk` | Risk acceptance signed by authorized level | Documented risk acceptance |
| `open` | `capa_linked` | `link_capa` | CAPA created from finding | CAPA drives closure |
| `capa_linked` | `verified_closed` | `verify_via_capa` | CAPA closed_effective; BD-12 confirms | |

### SM-13 — Risk Assessment Lifecycle

| From | To | Trigger | Guard | Side-Effect |
|---|---|---|---|---|
| `draft` | `in_review` | `submit_rmf` | All risk records evaluated | |
| `in_review` | `approved` | `approve_rmf` | BD-13 authority signs; no unacceptable residual risks without benefit justification | |
| `approved` | `under_revision` | `trigger_revision` | New hazard identified; PMS data; complaint trend | |
| `under_revision` | `in_review` | `resubmit` | Revision complete | |

### SM-14 — Validation Lifecycle

| From | To | Trigger | Guard | Side-Effect |
|---|---|---|---|---|
| `protocol_draft` | `protocol_approved` | `approve_protocol` | BD-21 human required | |
| `protocol_approved` | `execution_in_progress` | `begin_execution` | | |
| `execution_in_progress` | `report_draft` | `complete_execution` | All test steps completed | |
| `report_draft` | `report_approved` | `approve_report` | BD-21 authority signs | |
| `report_approved` | `validated` | `confirm_validated` | | Emit `validation.validated` |
| `validated` | `requires_revalidation` | `trigger_revalidation` | Change control, periodic review outcome | |

### SM-DEV — Pharma Deviation Lifecycle

| From | To | Trigger | Guard | Side-Effect |
|---|---|---|---|---|
| `draft` | `open` | `submit_deviation` | | Notify QA; link to EBR |
| `open` | `under_investigation` | `investigate` | | |
| `under_investigation` | `disposition_pending` | `impact_assessed` | Impact assessment complete | |
| `disposition_pending` | `closed` | `close_deviation` | BD-10 human closes; CAPA linked if required | |
| `closed` | `capa_required` | `trigger_capa` | Disposition indicates systematic issue | |

### SM-STAB — Stability Study Lifecycle

| From | To | Trigger | Guard | Side-Effect |
|---|---|---|---|---|
| `active` | `pull_due` | `timepoint_alert` | Pull date ≤ 7 days away | Notify stability analyst |
| `pull_due` | `active` | `complete_pull` | Pull results entered | Evaluate OOS; emit event |
| `active` | `completed` | `conclude_study` | All timepoints complete; BD-19 human approves conclusion | Shelf life confirmed |
| `active` | `discontinued` | `discontinue` | Product discontinued; study no longer needed | |

### SM-ICSR — Individual Case Safety Report Lifecycle

| From | To | Trigger | Guard | Side-Effect |
|---|---|---|---|---|
| `draft` | `under_review` | `submit_for_review` | AE details complete | |
| `under_review` | `submitted` | `submit_to_authority` | BD-24 reportability confirmed; 15-day regulatory deadline | Submit to EudraVigilance / FDA FAERS |
| `under_review` | `closed` | `close_non_reportable` | BD-24 confirms not reportable | |

### SM-VIG — Vigilance Report Lifecycle (J4 MD)

| From | To | Trigger | Guard | Side-Effect |
|---|---|---|---|---|
| `draft` | `under_review` | `submit` | | |
| `under_review` | `submitted` | `submit_to_authority` | BD-15 reportability confirmed; 15/30-day deadline (EU MDR Art 87) | Submit to Eudamed; FSCA triggered if required |
| `under_review` | `closed_nr` | `determine_not_reportable` | BD-15 signs | |

### SM-PSUR — PSUR Lifecycle (J4 MD)

| From | To | Trigger | Guard | Side-Effect |
|---|---|---|---|---|
| `draft` | `in_review` | `submit_for_review` | Period closed; data aggregated | |
| `in_review` | `approved` | `approve_psur` | BD-14 human approves benefit-risk conclusion | |
| `approved` | `submitted` | `submit_to_authority` | | Submit to notified body / competent authority |

### SM-FSCA — Field Safety Corrective Action (J4 MD)

| From | To | Trigger | Guard | Side-Effect |
|---|---|---|---|---|
| `planned` | `in_progress` | `initiate_fsca` | BD-16 classification confirmed | Customer notifications sent; CA authority notified within 10 days |
| `in_progress` | `completed` | `complete_actions` | All customer notifications acked; corrective actions done | |
| `completed` | `effectiveness_check` | `check_effectiveness` | | |
| `effectiveness_check` | `closed` | `confirm_close` | FSCA effective | |

### SM-CCP-MONITOR — CCP Monitoring (J5 Food)

| From | To | Trigger | Guard | Side-Effect |
|---|---|---|---|---|
| `scheduled` | `monitoring` | `start_monitoring` | Production started | |
| `monitoring` | `deviation_triggered` | `limit_breach` | measured_value > critical_limit | WO auto-suspend; lot quarantine; corrective action prompt |
| `deviation_triggered` | `monitoring` | `corrective_action_confirmed` | Corrective action documented and effective | |
| `monitoring` | `completed` | `batch_complete` | WO completed with all CCPs in limit | |

### SM-COUNTERFEIT — Counterfeit Investigation (J3 Aero)

| From | To | Trigger | Guard | Side-Effect |
|---|---|---|---|---|
| `open` | `evidence_collection` | `start_investigation` | Lab testing and chain-of-custody review initiated | Quarantine suspect lot |
| `evidence_collection` | `classification_pending` | `evidence_complete` | Test results and COC review done | |
| `classification_pending` | `confirmed_counterfeit` | `classify` | BD-23 human confirms counterfeit | GIDEP filing (BD-22); supplier SCAR; customer notification |
| `classification_pending` | `not_counterfeit` | `classify` | BD-23 clears | Release lot |
| `confirmed_counterfeit` | `closed` | `close` | GIDEP filed; suppliers notified; lot destroyed | |

### SM-8D — Eight Disciplines Investigation (J2 Auto)

| From | To | Trigger | Guard | Side-Effect |
|---|---|---|---|---|
| `d1_team` | `d2_problem` | `form_team` | Team membership confirmed | |
| `d2_problem` | `d3_containment` | `define_problem` | Problem statement written | |
| `d3_containment` | `d4_root_cause` | `implement_containment` | Containment verified effective | |
| `d4_root_cause` | `d5_corrective` | `identify_root_cause` | 5-Why + Ishikawa complete | |
| `d5_corrective` | `d6_preventive` | `implement_corrective` | Permanent corrective actions verified | |
| `d6_preventive` | `d7_recognition` | `implement_preventive` | System-level prevention in place | |
| `d7_recognition` | `closed` | `submit_to_customer` | Customer review complete; team recognized | |

---

## 4. Capabilities

### CAP-C7-01 — NC Authoring and Triage

System captures NC with mandatory: severity, source, affected lot/item, description, defect codes. On submit, lot transitions to quarantine in C5 (CAP-C5-05). SLA timers fire: critical NCs require initial response within 4 hours; major within 24 hours. AI Advisory (§7) may suggest defect code classifications and similar prior NCs but does not set severity (BD-2 human disposition). NC triage assigns investigator and containment deadline automatically based on severity + source combination rules.

### CAP-C7-02 — CAPA Lifecycle

Per SM-6 CAPA portion. Effectiveness checks are scheduled automatically. Recurrence tracking compares defect_codes + item_id + work_center_id in the 90-day window. Two-person e-signature required for closing (BD-3 closes, BD-6 second signer). Cycle time SLA: CAPA open-to-closed ≤ 45 days for major; ≤ 90 days for minor. AI Advisory may suggest root cause candidates and draft corrective action text; human must confirm (BD-3 cannot be automated).

### CAP-C7-03 — 8D Investigation (J2 Auto)

Per SM-8D. The 8D record is auto-created from any NC with source = customer or severity = major when the site is automotive mode. D4 root cause tools include both Ishikawa (fishbone) and 5-Why; at least one must be completed. D5 actions must have verified effectiveness evidence. Customer acknowledgment is required for closure. 8D reports are formatted per AIAG Customer-Specific Requirements (Ford 8D, GM PRTS, Stellantis format configurable per customer in C1 Customer master).

### CAP-C7-04 — Internal Audit Program

Audit Plans are created annually per site, covering all QMS clauses by risk-based sampling. Audit Runs are generated per schedule. Lead auditor is assigned from the auditor qualification register (C10 training module). Findings of type `major_nc` require CAPA within 30 days. Overdue responses (> close_deadline) auto-escalate to site quality manager. Clause coverage matrix is auto-computed from findings and reported for management review.

### CAP-C7-05 — External Audit Coordination

For regulatory, customer, and certification audits: Audit Runs are created with external auditee flag. The system generates an Audit Pack (§4 CAP-C7-29) on demand. Findings from external audits are tracked via the same SM-12 lifecycle. BD-12 requires a human to verify closure — the system cannot auto-close external audit findings. Customer-specific requirements from the C1 Customer master determine finding response format.

### CAP-C7-06 — Document Review Cycle

Per SM-7. Periodic document review schedules are set per document category (configurable — default: SOPs reviewed annually, specifications reviewed biennially). Overdue reviews are escalated. Review outcome `update_required` creates a new draft revision. `obsolete` withdraws the document. Review completeness is tracked for management review input.

### CAP-C7-07 — Inspection Plan Authoring

Inspection Plans define check items per item revision. Check items reference drawing characteristics (C2), acceptable measurement instruments, USL/LSL, and AQL level. Plans support skip-lot eligibility flags (auto-populated from supplier history in C4). Changes to Inspection Plans require BD-4 document control approval and SM-7 lifecycle.

### CAP-C7-08 — IQC / IPC / FQC / IPQC Execution

Per SM-4. Inspection types:
- **IQC** (Incoming): triggered on PO receipt in C4; lot held until dispositioned
- **IPC** (In-Process): triggered at WO operation checkpoints in C6
- **FQC** (Final): triggered on WO completion before BREL
- **IPQC** (In-Process Quality Control): continuous per-parameter monitoring during production

AQL sampling is enforced: sample_n drawn from Inspection Sample Plan based on lot_size. Results entered per check item. System evaluates accept/reject against AQL c/r criteria. `reject` result triggers NC auto-creation and lot quarantine.

### CAP-C7-09 — Disposition Decision (BD-2; SM-5; MRB)

Per SM-5. Standard dispositions (accept, reject, rework) require BD-2 authority signature. Concession dispositions additionally require: Engineering concurrence, Customer notification if customer-specific material, and time-bounded expiry. MRB is escalated for borderline cases requiring multi-party review. MRB decisions require minimum quorum (Quality + Engineering + Production) with all three e-signatures. The system enforces quorum completeness — `all_signed` triggers only when all required_parties rows have signed_at populated.

### CAP-C7-10 — Batch Release (BD-1; SM-10; QP/PRRC)

Per SM-10. Batch Release checklist auto-populates from:
- Open NC count for the lot (must = 0)
- EBR status (J1: must = released)
- CoA approval
- Stability data currency
- Regulatory hold checks

BD-1 requires a human authorized release authority. For J1 Pharma: an EU Qualified Person's e-signature is mandatory for EU-destined batches. For J4 MD: PRRC decision record required. System prevents `release_batch` API call from succeeding without the required e-signature token. Return: 403 if called without human e-sig token.

### CAP-C7-11 — APR Generation (J1 Pharma; BD-9)

Per BD-9. APR is generated for each product at year-end. The system auto-populates: batch count, yield statistics, OOS investigation count, deviation count, complaint count, CAPA count, stability data trend. The generated APR is a structured document that requires human review and approval (BD-9); the system cannot auto-approve the APR. Filed APRs are stored and linked to the product master.

### CAP-C7-12 — PSUR Generation (J4 MD; BD-14)

For each active medical device, PSUR is generated covering the reporting period (annual for class II/III). PMS data, complaint summaries, serious incident counts, and trend analysis are auto-populated from system records. The benefit-risk conclusion requires human authorship and BD-14 approval. Submission to notified body is tracked; deadline alerts fire 30 days before submission due.

### CAP-C7-13 — Stability Program (J1 Pharma; SM-STAB)

Per SM-STAB. Stability Studies are created per product per ICH Q1A guidelines. Pull Schedule is generated automatically. Analysts receive alerts 7 days before each timepoint. OOS results from stability pulls trigger OOS Investigation workflow (BD-27). Shelf life confirmation requires BD-19 human approval. Accelerated vs. long-term study types are tracked separately; the system does not auto-extrapolate shelf life beyond the confirmed long-term timepoint.

### CAP-C7-14 — Deviation Cycle (J1 Pharma; SM-DEV)

Per SM-DEV. Deviations from approved batch records are captured in real-time from EBR step deviations (C6). Unplanned deviations require immediate QA notification and impact assessment within 24 hours. BD-10 requires human closure; the system cannot auto-close deviations. Batch disposition for lots with unreviewed deviations is blocked in SM-10 (BREL checklist item).

### CAP-C7-15 — Vigilance Reportability and Submission (J4 MD; BD-15)

Per SM-VIG. When a complaint is received or an adverse event is recorded, the system presents a reportability questionnaire. Reportability determination is a human decision (BD-15); the system provides a structured checklist (EU MDR Annex IX reportability criteria, FDA MDR criteria per 21 CFR Part 803) and flags suggested reportability, but the determination is made by the PRRC or regulatory affairs specialist. On confirmed reportable: 15-day initial report deadline (death/serious injury) or 30-day deadline (other) tracked with countdown alerts. Submission acknowledgment from authority is logged.

### CAP-C7-16 — ICSR Submission (J1 Pharma; BD-24)

Per SM-ICSR. Adverse event reports from customers, HCPs, clinical trials, and literature are captured as ICSRs. MedDRA coding is supported with term lookup. BD-24 requires human reportability determination. Reportable ICSRs have a 15-day expedited reporting deadline (FDA 21 CFR 314.81(b)(1)(i); EU EudraVigilance). System tracks submission to EudraVigilance and FDA FAERS with case reference numbers. Follow-up ICSRs are linked to the original.

### CAP-C7-17 — Risk Management File (ISO 14971; BD-13)

Per SM-13. Risk Management Files are maintained per product family. Risk Records cover: hazard identification, hazardous situation, harm, initial risk estimation (severity × probability), risk controls, residual risk. Risk Acceptability Policy defines the 5×5 risk matrix and ALARP region. BD-13 requires human approval of the RMF; the system enforces that no unacceptable residual risk record exists without a benefit justification signed by the appropriate authority. PMS data feeds back into the RMF when complaint trends change risk probability estimates.

### CAP-C7-18 — Customer Complaint Cycle

Complaints are captured from C1 (CSR record) or directly entered. Regulatory reportability is assessed per BD-15 (MD) or BD-24 (Pharma). An NC is auto-created for complaints with severity critical or major. The complaint lifecycle tracks: acknowledgment to customer (within 2 business days), investigation completion, resolution, closure. Resolution communications are tracked. Complaint trend analysis (Pareto by defect code, product, customer) feeds management review and APR/PSUR inputs.

### CAP-C7-19 — Recall Decision and Execution (BD-8; BD-20; SM-11)

Per SM-11. A Recall Decision requires: BD-8 human authorization for initiation; BD-20 human scope classification. The system blocks `initiate_recall` API calls without these signed tokens. On recall initiation: affected lots are quarantined in C5 across all locations; customer notifications are generated through C1 Customer master; regulatory submission tracked (FDA Form 3862 for drugs, FDA MedWatch 3500A for devices, RASFF for food in EU). Recall effectiveness check (≥ 99% recovery) is tracked automatically.

### CAP-C7-20 — FSCA Cycle (J4 MD; BD-16; SM-FSCA)

Per SM-FSCA. FSCA classification (BD-16) determines corrective action scope and urgency. EU MDR requires CA notification within 10 days of FSCA initiation. Field Safety Notices (FSN) are generated and distributed through the customer notification system. FSCA effectiveness is tracked: all customer acknowledgments must be received; corrective actions verified. If a FSCA affects a UDI-DI, the Eudamed UDI database record is updated.

### CAP-C7-21 — Mock Recall Execution (J5 Food + all packs)

Mock Recalls are scheduled annually per site (minimum). The system selects a target lot at random or by scenario, then times the traceability exercise: how long to identify all affected lots (upstream + downstream via C8 genealogy), how long to recover 99% of affected units. Time target ≤ 4 hours. Gaps identified in the mock recall trigger CAPA. Results are documented and available for GFSI/BRC/SQF audit evidence.

### CAP-C7-22 — Validation Master Plan and Validation Pack (BD-21; SM-14)

Per SM-14. VMP is maintained per site covering all GxP systems. System inventory is kept current via integration with IT asset management. Protocol approval requires BD-21 human sign-off; the system blocks protocol execution without signed approval. Execution records are entered against each test step; deviations are documented inline. Report approval requires BD-21. Revalidation is triggered automatically on: system change control, periodic review, or infrastructure change.

### CAP-C7-23 — HACCP Plan Authoring and Reanalysis (J5 Food; BD-26)

HACCP Plans are authored per product category with CCP definitions including critical limits, monitoring frequency, and corrective actions. Plans require approval by a PCQI (Preventive Controls Qualified Individual). HACCP reanalysis triggers are: new process, new hazard, unexpected failure, significant change in product/packaging (21 CFR Part 117 §117.170). BD-26 determines whether a reanalysis trigger warrants a full HACCP reanalysis; this is a human determination. The system tracks the last reanalysis date and flags plans not reanalyzed within 3 years.

### CAP-C7-24 — CCP Monitoring Real-Time (J5 Food; SM-CCP-MONITOR)

CCP monitoring records are generated per batch per CCP per the HACCP Plan's monitoring frequency. The system integrates with Edge Gateway (C6) for automated parameter capture. Corrective action documentation is mandatory on any critical limit breach. Records are signed by the operator and reviewed by the supervisor. Monitoring records are retained for 2 years minimum (21 CFR Part 117 §117.310).

### CAP-C7-25 — MRB Workflow (D5 §5)

MRB cases are created from NC records or directly from inspection results where disposition is unclear. The quorum requirement (Quality + Engineering + Production minimum) is enforced; additional parties (Regulatory, Customer) may be added. E-signatures are captured sequentially; each party can accept, reject, or request information. Majority vote is not supported — consensus (all signed in agreement) is required for regulated dispositions. MRB minutes are generated as a controlled document.

### CAP-C7-26 — AI Advisory Integration

Per L2 features in Quality. AI Advisory provides:
- Root cause candidate suggestions for NC investigations (based on similar historical NCs by defect_code + item_id)
- Draft CAPA action text (editable, not auto-executed)
- APR narrative sections (populated from aggregated data, requires human review)
- OOS investigation phase guidance
- Complaint trend analysis with anomaly flagging

Hard boundary: AI may never autonomously trigger any BD-1 through BD-28 action. All AI-suggested actions are presented as advisory inputs; a human must confirm and e-sign before any regulated state transition occurs. AI suggestions are logged with the advisory_model_version for audit trail.

### CAP-C7-27 — Audit Pack Export (H3 §4)

On-demand audit pack assembly for FDA, EMA, IATF, NADCAP, customer, SOC 2, or ISO 27001 audits. The pack generator collects: relevant NC/CAPA records, inspection records, BREL records, CDOC versions, training completion records, validation packs, risk file, complaint records, and change control history. Pack is assembled as a signed, watermarked PDF bundle with a linked evidence chain. Assembly completes within 24-hour SLA for standard scopes; 48-hour for full system audit packs. All exported packs are logged with: requestor, scope, export_timestamp, recipient.

### CAP-C7-28 — Annual Periodic Review

Per EU GMP Annex 11 §11. Conducted bi-annually minimum. Inputs auto-collected: risk register currency, validation freshness (overdue revalidation), system incident count, CAPA effectiveness rate, SLO compliance, user access review. Review meeting is documented as an Audit Run of type `periodic_review`. Outputs (CAPA actions, resource decisions, scope changes) are tracked to completion.

### CAP-C7-29 — OOS Investigation (J1 Pharma; BD-27)

Per SM from §3. OOS investigations follow Phase 1 (Lab investigation: analyst error check, instrument calibration check) and Phase 2 (Full investigation: process review, batch review). Phase 1 conclusion is a human determination (BD-27). If Phase 1 confirms valid OOS, Phase 2 proceeds automatically. Phase 2 conclusion (batch failure, process failure) is also BD-27. OOS records are linked to stability pulls, BREL checklists, and Deviation records as applicable. The system does not invalidate an OOS result without BD-27 authority confirmation.

---

## 5. Banned Decision Enforcement (BD-1 through BD-28)

The following table lists all banned decisions and their API enforcement point. Each returns HTTP 403 with RFC 9457 Problem Detail when called without a valid human e-signature token.

| BD | Decision | API endpoint blocked | Return |
|---|---|---|---|
| BD-1 | Batch release authorization | `POST /brel/{id}/release` | 403 without QP/PRRC/QA e-sig |
| BD-2 | Lot disposition | `POST /disposition/{id}/decide` | 403 without authorized disposition role |
| BD-3 | CAPA closure | `POST /capa/{id}/close` | 403 without QA e-sig |
| BD-4 | Controlled document approval/release | `POST /cdoc/{id}/approve`, `/release` | 403 without document approval role |
| BD-5 | ECO design approval (C2) | `POST /eco/{id}/approve` | 403 — see C2 CAP-C2-06 |
| BD-6 | CAPA effectiveness acceptance (second signer) | `POST /capa/{id}/close` | 403 if only one signer present |
| BD-7 | Supplier qualification (C4) | `POST /supplier/{id}/qualify` | 403 — see C4 CAP-C4-01 |
| BD-8 | Recall initiation | `POST /recall/{id}/initiate` | 403 without recall authority e-sig |
| BD-9 | APR approval | `POST /apr/{id}/approve` | 403 without QA director e-sig |
| BD-10 | Deviation closure (Pharma) | `POST /deviation/{id}/close` | 403 without QA e-sig |
| BD-11 | Clinical Evaluation Report conclusion | `POST /cer/{id}/approve` | 403 without PRRC/clinical expert e-sig |
| BD-12 | Audit finding closure | `POST /finding/{id}/close` | 403 without lead auditor e-sig |
| BD-13 | Risk acceptability ruling | `POST /rmf/{id}/approve` | 403 without risk management authority e-sig |
| BD-14 | PSUR benefit-risk conclusion | `POST /psur/{id}/approve` | 403 without PRRC e-sig |
| BD-15 | Vigilance reportability determination | `POST /vig_report/{id}/determine_reportability` | 403 without PRRC/RA e-sig |
| BD-16 | FSCA classification | `POST /fsca/{id}/classify` | 403 without PRRC e-sig |
| BD-17 | PPAP approval (C4) | `POST /ppap/{id}/approve` | 403 — see C4 CAP-C4-15 |
| BD-18 | Production Trial Run approval (C3) | `POST /ptr/{id}/approve` | 403 — see C3 CAP-C3-08 |
| BD-19 | Stability study conclusion | `POST /stability_study/{id}/conclude` | 403 without QA e-sig |
| BD-20 | Recall scope classification | `POST /recall/{id}/classify_scope` | 403 without regulatory affairs e-sig |
| BD-21 | Validation protocol approval | `POST /val_pack/{id}/approve_protocol` | 403 without validation authority e-sig |
| BD-22 | GIDEP filing (Aero) | `POST /counterfeit/{id}/file_gidep` | 403 without authorized signatory e-sig |
| BD-23 | Counterfeit investigation classification | `POST /counterfeit/{id}/classify` | 403 without quality authority e-sig |
| BD-24 | ICSR reportability determination | `POST /icsr/{id}/determine_reportability` | 403 without PV physician/RA e-sig |
| BD-25 | Field Alert Report submission (Pharma) | `POST /far/{id}/submit` | 403 without VP QA e-sig |
| BD-26 | HACCP reanalysis trigger determination | `POST /haccp_plan/{id}/trigger_reanalysis` | 403 without PCQI e-sig |
| BD-27 | OOS investigation conclusion | `POST /oos/{id}/conclude_phase1`, `/conclude_phase2` | 403 without QC analyst + QA countersign |
| BD-28 | Allergen reclassification | `POST /allergen_plan/{id}/reclassify` | 403 without PCQI e-sig |

---

## 6. Per-Pack Overlays

| Pack | Key Additions to C7 |
|---|---|
| **J1 Pharma** | EBR mandatory for BREL checklist; QP Declaration for EU batches; Deviation lifecycle (SM-DEV); Stability Program (SM-STAB); APR annually (BD-9); OOS Investigation (BD-27); ICSR submission (BD-24); Field Alert Report (BD-25); ICH Q9 risk management integration; Annex 11 periodic review; 21 CFR Part 11 e-sig |
| **J2 Automotive** | 8D Investigation (SM-8D) mandatory for customer complaints + major NCs; LPA NOK escalation to CAPA; PPAP quality records in BREL scope; customer-specific 8D format per C1 customer master; AIAG MSA for measurement system capability |
| **J3 Aerospace** | Counterfeit Investigation (SM-COUNTERFEIT; BD-22/BD-23); AS9100D §8.7 nonconforming output; NADCAP audit coordination; First Article in Inspection scope; GIDEP filing pipeline |
| **J4 Medical Device** | Risk Management File (ISO 14971; BD-13); PRRC Decision (BD-1); Vigilance (SM-VIG; BD-15); PSUR (SM-PSUR; BD-14); FSCA (SM-FSCA; BD-16); PMS Plan + Report; CER (BD-11); UDI traceability in BREL; EU MDR Art 15 PRRC role |
| **J5 Food** | HACCP Plan authoring + reanalysis (BD-26); CCP Monitoring (SM-CCP-MONITOR); Allergen Control (BD-28); Mock Recall annually; Reportable Food Registry; FSMA Part 117 records retention 2 years; PCQI role enforcement |

---

## 7. Failure Modes and Recovery

| Failure | Detection | Recovery |
|---|---|---|
| BREL initiated with open NCs | BREL checklist item `open_nc_count = 0` check fails | System blocks `pending_release` transition; NC list shown to release authority; NCs must be closed or formally accepted via MRB |
| CAPA effectiveness check fails at 90-day mark | Recurrence event detected; effectiveness_result = fail | CAPA auto-reopens; new root cause investigation required; BD-3 cannot close the reopened CAPA until new effectiveness check passes |
| Audit pack export timeout | Long-running operation exceeds 24h SLA | Alert to IT/QA; partial pack delivered with gap list; retry with narrowed scope |
| OOS result challenged after initial conclusion | New data received after BD-27 phase 2 conclusion | Amendment record created; original OOS record remains immutable; amendment requires BD-27 re-sign |
| BD-1 e-sig presented for wrong role | API validates signer's QP/PRRC certification currency in IAM | 403 returned; system logs unauthorized attempt |
| Vigilance 15-day deadline missed | Countdown alert fires at T-5 days, T-2 days, T-0 | Escalation to site quality manager at T-2; regulatory authority notified of late submission |

---

## 8. KPIs and Targets

| KPI | Target | Measurement |
|---|---|---|
| NC closure cycle time (critical) | ≤ 10 business days | nc.closed_at - nc.discovered_at |
| NC closure cycle time (major) | ≤ 30 business days | |
| CAPA effectiveness rate | ≥ 95% | closed_effective / total_closed |
| CAPA open-to-closed (major) | ≤ 45 days | |
| IQC first-pass acceptance rate | ≥ 95% | accept results / total IQC inspections |
| Audit finding on-time closure | ≥ 90% | closed_by_deadline / total_findings |
| BREL cycle time | ≤ 5 days from FQC pass | brel.released_at - fqc.completed_at |
| OOS investigation phase 1 | ≤ 10 business days | |
| Mock recall time-to-trace (J5) | ≤ 4 hours | mock_recall.time_to_complete_h |
| Vigilance on-time submission (J4) | 100% | submitted_at ≤ deadline |
| CAPA AI suggestion acceptance rate | tracked (not targeted — informational) | ai_suggestions_confirmed / ai_suggestions_presented |

---

## 9. RACI Matrix

| Process | QA Engineer | QA Manager | Regulatory Affairs | Production | Engineering | Executive |
|---|---|---|---|---|---|---|
| NC triage + investigation | **R** | A | C | C | C | I |
| Disposition (BD-2) | C | **R** | C | C | C | — |
| CAPA authoring | **R** | A | C | C | C | — |
| CAPA close (BD-3) | C | **R** | C | — | — | — |
| Batch release (BD-1) | C | **R** | A | — | — | — |
| QP Declaration (J1) | C | C | **R** | — | — | — |
| Vigilance determination (BD-15) | C | C | **R** | — | — | — |
| Recall initiation (BD-8) | C | C | **R** | — | — | A |
| Risk file approval (BD-13) | C | **R** | A | — | C | — |
| Validation protocol (BD-21) | **R** | A | C | — | C | — |
| HACCP reanalysis (BD-26) | **R** | A | C | C | C | — |
| AI advisory review | **R** | A | — | — | — | — |

---

## 10. Standards and Regulatory Traceability

| Standard | Key Clause | Capability |
|---|---|---|
| 21 CFR Part 11 | §11.10 e-records, §11.30 e-sig | All BD-1..BD-28 enforcement |
| 21 CFR Part 211 | §211.180(e) APR, §211.192 OOS | CAP-C7-11, CAP-C7-29 |
| 21 CFR Part 820 | §820.90 NC product, §820.100 CAPA, §820.198 complaints | CAP-C7-01/02/08/18 |
| 21 CFR Part 803 | MDR reporting | CAP-C7-15 |
| 21 CFR Part 314 | Field Alert Reports | CAP-C7-16 |
| 21 CFR Part 117 | FSMA PCHF, HACCP | CAP-C7-23/24 |
| EU GMP Annex 1 (2022) | EM, Media Fill | Cross-C6 |
| EU GMP Annex 11 | Computerised systems periodic review | CAP-C7-28 |
| EU GMP Annex 15 | Qualification & validation | CAP-C7-22 |
| EU MDR 2017/745 | Art 10 (QMS), Art 87 (vigilance), Art 15 (PRRC) | CAP-C7-15/20/12 |
| ICH Q7 | §2.5 APR, §3 quality system | CAP-C7-11 |
| ICH Q9 (R1) | Risk management | CAP-C7-17 |
| ICH Q10 | Pharmaceutical quality system | CAP-C7-11/14 |
| ISO 9001:2015 | §8.7 NC, §10.2 CAPA | CAP-C7-01/02 |
| ISO 13485:2016 | §8.3 NC, §8.4 data analysis, §8.5 improvement | CAP-C7-01/02/10 |
| ISO 14971:2019 | Risk management | CAP-C7-17 |
| IATF 16949:2016 | §10.2.3 8D, §10.3 improvement | CAP-C7-03 |
| AS9100D | §8.7 NC output, §10.2 NC/CAPA | CAP-C7-01/02 |
| AIAG SPC 2nd Ed. | Control chart rules | Cross-C6 |
| AIAG MSA 4th Ed. | Measurement system analysis | CAP-C7-07 |
| GFSI (BRC, FSSC 22000) | HACCP, mock recall | CAP-C7-21/23 |

---

## 11. Cross-References

| Target Domain | Reference |
|---|---|
| C1 Commercial | Customer complaints feed NC; recall notifications through customer master |
| C2 Product Engineering | ECO lifecycle (SM-7) crosses document control; Risk file links to DHF/DMR |
| C3 Planning | APQP phase gates require CAPA status; PTR approval (BD-18) tracked here |
| C4 Procurement | Supplier-source NCs trigger SCAR; PPAP quality records in BREL scope |
| C5 Inventory | Lot quarantine on NC open; lot release on BREL; recall lot tracking |
| C6 Shopfloor | In-process inspections; SPC OOC NCs; EBR deviations; Eligibility G5 gate |
| C8 Traceability | BREL locks traceability chain; mock recall uses C8 genealogy |
| C9 Maintenance | Calibration OOT triggers review of affected lots; C10 equipment qualification in validation scope |
| C10 Workforce | Inspector/auditor qualification records; training completion for CDOC release |
| Analytics | CAPA effectiveness trends; NC Pareto; audit finding closure rates; BREL cycle time dashboards |

---

## 12. Integration Points and Data Flows

Quality data flows bidirectionally with every domain:

**Inbound to C7:** Inspection triggers arrive from PO receipts (C4), WO operation checkpoints (C6), and WO completions (C6). Complaints arrive from C1 Customer Service Records. Stability sample results arrive from the lab LIMS integration (external). SPC violation signals arrive from C6 SPC Engine as NC trigger candidates. Calibration OOT signals arrive from C10 Maintenance when an instrument falls out of calibration tolerance, triggering automatic lot review for lots measured with that instrument.

**Outbound from C7:** BREL released status propagates to C5 (lot.status → released), C8 (traceability chain locked), and C1 (shipment unblock signal). NC quarantine propagates immediately to C5 (lot.status → quarantined). CAPA actions with work center scope propagate work instructions to C6 routing updates. Audit finding responses with process change scope trigger ECO workflow in C2. Risk record updates trigger re-validation assessment in C7's own Validation Pack scope.

**Event bus integration:** All SM transitions in C7 emit domain events on the EventBus (RabbitMQ). Consumers include: Analytics (for KPI computation), Notification Service (for SLA alerts), Audit Log Service (for immutable audit trail), and the AI Advisory Engine (for pattern recognition input). Event schema versioning is enforced; consumers declare supported schema versions. Incompatible schema versions result in dead-letter queuing, not silent data loss.

**Record retention:** NC and CAPA records retained per regulatory class — 21 CFR Part 820 requires device history records for the expected device lifetime + 2 years; 21 CFR Part 211 requires drug batch records for 1 year post-expiry (minimum 3 years); IATF 16949 requires quality records for customer-specified periods (typically 15 years for automotive safety parts). HESEM enforces per-site retention policies that are configurable per document category with hard-delete blocked until retention period expires.

---

*Decision phrase: S2-04_C7_QUALITY_EQMS_DEEP_UPGRADE_COMPLETE*
