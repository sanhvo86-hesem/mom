# J5 — Food & Beverage Vertical Pack (V10)

```
pack_id:        Food
version:        V10
owner_role:     Food Compliance Lead + PCQI Program Owner
wave_target:    W10 (preview); W11 GA
regulatory_sources:
  US:   21 CFR Part 117 (FSMA Preventive Controls Human Food);
        21 CFR Part 111 (dietary supplements GMPs);
        21 CFR Part 113 + 114 (LACF + acidified foods);
        21 CFR Part 120 (juice HACCP);
        21 CFR Part 123 (seafood HACCP);
        21 CFR Part 507 (preventive controls animal food);
        21 CFR Part 1.1300 + 1.1305 (FSMA §204 traceability,
          full effect 2026);
        21 CFR Part 121 (intentional adulteration / FSMA IA);
        21 CFR Part 1.900 (sanitary transportation of food);
        21 CFR Part 1.500 (foreign supplier verification FSVP);
        21 CFR Part 106 + 107 (infant formula);
        USDA-FSIS 9 CFR Part 417 (HACCP systems, meat/poultry);
        USDA-FSIS 9 CFR Part 418 (sanitation, meat/poultry);
        FDA RFR rule (FSMA §423 reportable food registry)
  EU:   Reg 178/2002 (general food law — traceability Art 18);
        Reg 852/2004 (hygiene of foodstuffs — HACCP Art 5);
        Reg 853/2004 (specific hygiene rules — HACCP+);
        Reg 396/2005 (MRLs pesticide residues);
        Reg 1169/2011 (food information to consumer — allergens
          Art 21; origin Art 26);
        Reg 2073/2005 (microbiological criteria);
        Reg 1333/2008 (food additives);
        Reg 1935/2004 (food contact materials);
        Commission guidance on HACCP-based procedures (EC)
  Codex: CXC 1-1969 Rev 2020 (General Principles of Food Hygiene);
         CXC 36-1987 Rev 2020 (HACCP system);
         CXA 1-1985 Rev 2023 (General Standard for Contaminants);
         CXA 4-1994 (pesticide MRLs)
  ISO:  ISO 22000:2018 (food safety management systems);
        ISO/TS 22002-1:2009 (PRPs — food manufacturing);
        ISO/TS 22002-6:2016 (PRPs — feed/animal food);
        ISO 22005:2007 (traceability in feed + food chain);
        ISO 22301:2019 (business continuity — food safety events)
  GFSI: BRCGS Food Safety Issue 9 (2022);
        SQF Edition 9 (2023);
        FSSC 22000 Version 6 (2023);
        IFS Food Version 8 (2023)
  PMO:  Grade A Pasteurized Milk Ordinance (FDA-endorsed, 2023)
```

The Food pack governs FSMA-driven preventive controls, HACCP-anchored
hazard management, allergen control programs, foreign supplier
verification, the FSMA §204 high-risk food traceability mandate,
environmental monitoring (EMP/FSEP), and food defense (intentional
adulteration under Part 121). It spans manufacturer, processor, packer,
holder, shipper, receiver, and importer roles, and integrates with
USDA-FSIS jurisdiction for meat, poultry, and egg products. Every
regulated activity routes through a controlled workflow; no HACCP plan
reauthorization, recall classification, or food contact substance
exception proceeds without the two-person e-signature gate defined in
BD-26 through BD-28.

---

## 1. Pack scope and sub-vertical taxonomy

| Sub-Vertical | Governing Regulation | Key Obligations |
|---|---|---|
| Human food — general manufacturer | 21 CFR 117; EU 852/2004 | Preventive controls food safety plan; PCQI; HACCP within FSP |
| Dietary supplements | 21 CFR Part 111; EU Directive 2002/46/EC | GMP separate from Part 117; identity + purity + composition testing |
| Low-acid canned food (LACF) | 21 CFR Part 113 | Process Authority thermal process; scheduled process filing with FDA |
| Acidified food | 21 CFR Part 114 | pH + water activity limits; process validation per Process Authority |
| Juice (HACCP-mandated) | 21 CFR Part 120 | 5-log pathogen reduction; HACCP per CXC 36 + Part 120 |
| Seafood (HACCP-mandated) | 21 CFR Part 123 | SSOP + HACCP; importer verification requirements |
| Animal food / feed | 21 CFR Part 507 | Preventive controls animal food; separate HACCP-equivalent program |
| FSVP importer | 21 CFR Part 1.500 (FSVP) | Hazard analysis per foreign facility; verification activities; onsite audit option |
| Food contact substance / packaging | 21 CFR 170–180 FCNs; EU Reg 1935/2004; EU 10/2011 (plastics) | Migration testing; GMP for food contact materials; FCN filing |
| Beverage — non-alcoholic | 21 CFR 117; process-specific | HACCP; water quality; allergen from additives |
| Bakery | 21 CFR 117 | Allergen-intensive; gluten declaration; CCP for bake temperature |
| Dairy — Grade A | PMO (Grade A); 21 CFR 117 | Pasteurization per PMO; pathogen testing; SSOP dairy-specific |
| Meat / poultry / egg (USDA-FSIS) | 9 CFR Part 417 (HACCP); Part 418 (sanitation) | USDA jurisdiction; HACCP plan per species + per process; FSIS EIAO inspection |
| Egg products | 7 USC 1031 (EPIA); 9 CFR Part 590 | USDA jurisdiction; pasteurization; HACCP-equivalent |
| Infant formula | 21 CFR 106 + 107 | Nutrient content; Good Manufacturing Practice; FDA notification |
| GFSI-certified operations | BRCGS v9; SQF 9; FSSC 22000 v6; IFS v8 | Scheme-specific unannounced audit; grading; customer-brand add-ons |
| Multi-jurisdiction / codex | EU 178/2002 Art 18; ISO 22000:2018; Codex CXC 1 | Codex-aligned HACCP; traceability per Art 18; MRL compliance |

---

## 2. Authoritative roots

Each root carries a stable root_id (AR-J5-NNN), an owner, the primary
evidence class from the H4 taxonomy, the retention floor, and the key
schema fields that must be populated at creation.

### AR-J5-001 — HACCP Plan
```
schema: {
  haccp_plan_id, facility_id, process_line_id, product_scope,
  team_members[{name, role, qualification}], plan_scope_description,
  flow_diagram_ref, process_step_list[], hazard_analysis_ref[],
  ccp_list[{ccp_id, step, hazard, critical_limit, monitoring,
            corrective_action, verification, records}],
  reanalysis_schedule, effective_date, pcqi_sign_date,
  second_approver_sign_date, version, status
}
evidence_class: EC-14 (food safety plan record)
retention: 2 years post-supersession (+ 3 years for LACF)
owner: PCQI
```

### AR-J5-002 — HACCP Team Charter
```
schema: {
  charter_id, facility_id, team_name, members[{name, role,
  training_record_ref, haccp_cert_ref}], scope_statement,
  meeting_cadence, quorum_requirement, charter_date
}
evidence_class: EC-14
retention: 2 years post-supersession
owner: PCQI
```

### AR-J5-003 — Food Safety Plan (FSMA Part 117)
```
schema: {
  fsp_id, facility_id, registration_number, scope_description,
  sub_parts_applicable[117A, 117B, 117C, 117D, 117F, 117G],
  hazard_analysis_ref, preventive_controls[{type: process|
  sanitation|allergen|supply_chain, control_description,
  monitoring_procedure, corrective_action, verification_activity,
  records}], supply_chain_program_ref, recall_plan_ref,
  pcqi_id, reanalysis_schedule, effective_date,
  pcqi_sign_date, second_approver_id, version, status
}
evidence_class: EC-14
retention: 2 years minimum (21 CFR 117.305(a))
owner: PCQI
```

### AR-J5-004 — PCQI Record (Preventive Controls Qualified Individual)
```
schema: {
  pcqi_id, person_name, qualification_type: job_experience|
  training|combination, training_course_ref, training_date,
  training_provider, certification_expiry, facilities_covered[],
  activity_log[{date, activity_type, outcome, records_reviewed}],
  annual_review_date
}
evidence_class: EC-22 (training + qualification)
retention: 2 years
owner: HR + Compliance
```

### AR-J5-005 — Hazard Analysis
```
schema: {
  ha_id, fsp_ref, process_step, ingredient_or_material,
  hazard_type: biological|chemical|physical|radiological,
  hazard_description, known_or_reasonably_foreseeable: bool,
  severity: H|M|L, probability: H|M|L, risk_matrix_score,
  requires_preventive_control: bool, control_type,
  basis_for_decision, ccp_id_if_assigned, analyst, date
}
evidence_class: EC-14
retention: 2 years
owner: PCQI
```

### AR-J5-006 — Critical Control Point (CCP)
```
schema: {
  ccp_id, haccp_plan_ref, process_step, hazard,
  ccp_number_sequential, justification_for_ccp,
  critical_limit_ref[], monitoring_procedure_ref,
  corrective_action_ref, verification_ref, records_ref[]
}
evidence_class: EC-14
retention: 2 years
owner: PCQI
```

### AR-J5-007 — Critical Limit
```
schema: {
  cl_id, ccp_ref, parameter_type: temperature|pH|time|
  water_activity|pressure|chlorine|other,
  value, unit, basis: scientific_literature|regulatory_limit|
  process_authority_letter|validation_study,
  basis_ref, established_date, pcqi_reviewed_date
}
evidence_class: EC-14
retention: 2 years
owner: PCQI
```

### AR-J5-008 — CCP Monitoring Record
```
schema: {
  monitoring_id, ccp_ref, shift_id, monitoring_date,
  monitoring_time, measured_value, unit, critical_limit_ref,
  in_spec: bool, operator_id, instrument_id, calibration_status,
  corrective_action_triggered: bool, corrective_action_ref,
  supervisor_review_date
}
evidence_class: EC-14
retention: 2 years (21 CFR 117.305(b))
owner: Production + QA
```

### AR-J5-009 — Corrective Action Record (CCP Excursion)
```
schema: {
  car_id, ccp_monitoring_ref, excursion_date, excursion_description,
  immediate_action_taken, product_disposition: hold|rework|destroy|
  release_with_deviation, disposition_basis, process_authority_ref_if_applicable,
  root_cause_analysis, preventive_action, pcqi_review_date,
  capa_ref, verification_date
}
evidence_class: EC-14
retention: 2 years
owner: PCQI + QA
```

### AR-J5-010 — Allergen Control Plan
```
schema: {
  acp_id, facility_id, major_allergens_present[],
  allergenic_ingredients_inventory[{ingredient, supplier, form,
  storage_location, labelled_allergen}],
  cross_contact_risk_assessments[allergen_cross_contact_risk_ref[]],
  scheduling_controls[{shared_line, allergen_sequencing_rule}],
  label_review_procedure, pcqi_sign_date, review_cycle_months,
  version, effective_date
}
evidence_class: EC-14
retention: 2 years
owner: PCQI + Labelling
```

### AR-J5-011 — Allergen Cross-Contact Risk Assessment
```
schema: {
  accra_id, acp_ref, shared_line_id, allergen_of_concern,
  preceding_product, following_product, cross_contact_routes[],
  risk_level: high|medium|low, controls_in_place[],
  validation_basis, allergen_verification_ref,
  last_reviewed_date, pcqi_sign_date
}
evidence_class: EC-14
retention: 2 years
owner: PCQI
```

### AR-J5-012 — Sanitation Plan (Master)
```
schema: {
  sp_id, facility_id, zones[], cleaning_frequency_per_zone,
  sanitizer_list[{sanitizer, concentration, contact_time,
  regulatory_approval}], ssop_refs[], verification_schedule,
  pre_op_inspection_criteria, pre_op_pass_requirements,
  responsible_person, pcqi_reviewed_date, version
}
evidence_class: EC-14
retention: 2 years
owner: Sanitation Supervisor + PCQI
```

### AR-J5-013 — Sanitation Record
```
schema: {
  sr_id, sp_ref, area_id, shift_id, cleaning_date,
  cleaning_start_time, cleaning_end_time, sanitizer_used,
  concentration_measured, contact_time_achieved,
  pre_op_inspection_result: pass|fail, deficiency_notes,
  corrective_action_ref, operator_id, supervisor_sign_date,
  atp_swab_result_if_performed
}
evidence_class: EC-14
retention: 2 years
owner: Sanitation Supervisor
```

### AR-J5-014 — Pest Control Plan and Service Record
```
schema: {
  pcp_id, facility_id, pest_species_targeted[],
  bait_station_map_ref, exclusion_measures[],
  contractor_name, contractor_certifications[],
  service_schedule, service_records[{date, areas_treated,
  chemical_used, application_rate, findings, corrective_action,
  technician_id}], trend_analysis_date, pcqi_review_date
}
evidence_class: EC-14
retention: 2 years
owner: Facilities + PCQI
```

### AR-J5-015 — Sanitation Standard Operating Procedure (SSOP)
```
schema: {
  ssop_id, facility_id, area_or_equipment, task_description,
  frequency, materials_required[], step_by_step_procedure[],
  verification_method, person_responsible, effective_date,
  review_cycle_months, pcqi_sign_date
}
evidence_class: EC-14
retention: 2 years post-supersession
owner: PCQI + QA
```

### AR-J5-016 — Foreign Supplier Verification Program (FSVP) Record
```
schema: {
  fsvp_id, importer_id, supplier_id, food_description,
  country_of_origin, applicable_haccp_or_fsp_equivalent: bool,
  hazard_analysis_ref, verification_activities[{type: onsite_audit|
  sampling_testing|review_records|other, frequency, last_completed,
  result, documentation_ref}], supplier_qms_cert_ref[],
  corrective_action_ref[], last_re_evaluation_date,
  fsvp_agent_if_applicable, pcqi_sign_date, status
}
evidence_class: EC-15 (supplier qualification record)
retention: 2 years (21 CFR 1.512)
owner: PCQI + Procurement
```

### AR-J5-017 — FSVP Hazard Analysis
```
schema: {
  fsvp_ha_id, fsvp_ref, food_description, process_steps_at_supplier[],
  hazard_type[], known_or_reasonably_foreseeable: bool,
  severity, probability, control_at_supplier_description,
  control_verification_basis, analyst, analysis_date
}
evidence_class: EC-15
retention: 2 years
owner: PCQI
```

### AR-J5-018 — FSMA §204 KDE/CTE Record
```
schema: {
  kde_cte_id, lot_id, food_item_type,
  high_risk_food_list_ref: [HNFRL], cte_type: harvest|cool|
  initial_packing|first_land_based_receiver|shipping|receiving|
  transformation, kde_fields: {
    traceability_lot_code, location_description, date_event,
    quantity, unit_of_measure, reference_document_type,
    reference_document_number
  }, trading_partner_id, transmission_method: electronic|paper,
  transmission_timestamp, retention_expiry_date
}
evidence_class: EC-16 (traceability record)
retention: 2 years from date of creation (21 CFR 1.1310)
owner: Traceability Lead + PCQI
```

### AR-J5-019 — Recall Plan
```
schema: {
  rp_id, facility_id, product_scope[], recall_coordinator_id,
  backup_coordinator_id, recall_team[{name, role, contact}],
  fda_contact_procedure, cpsc_contact_if_applicable,
  notification_procedure[{recipient_class: customers|distributors|
  consumers|media, method, time_target}],
  lot_traceability_method, effectiveness_check_method,
  public_notification_template, regulatory_submission_template,
  annual_test_date, last_mock_recall_date, pcqi_review_date, version
}
evidence_class: EC-17 (recall + crisis record)
retention: 2 years (maintain current version + last 2 versions)
owner: Recall Coordinator + PCQI
```

### AR-J5-020 — Mock Recall Run
```
schema: {
  mr_id, rp_ref, run_date, scenario_description,
  lot_selected_for_trace, quantity_in_scope,
  trace_forward_result: {percentage_accounted, time_to_complete,
  gaps_identified[]}, trace_backward_result,
  team_notification_time, regulatory_contact_simulated: bool,
  time_to_100pct_completion, target_time_hours: 4,
  performance_result: pass|fail, gaps[], corrective_actions[],
  pcqi_sign_date
}
evidence_class: EC-17
retention: 2 years
owner: Recall Coordinator
```

### AR-J5-021 — Recall Decision Record
```
schema: {
  rd_id, trigger_complaint_or_surveillance_ref, product_description,
  lot_ids_implicated[], hazard_type, hazard_description,
  health_hazard_evaluation_requested: bool,
  recall_class: I|II|III|market_withdrawal|stock_recovery,
  classification_basis, fda_classification_ref_if_applicable,
  recall_decision_maker_id, second_approver_id, decision_date,
  bd_27_gate_passed: bool, corrective_action_ref, status
}
evidence_class: EC-17
retention: 2 years + duration of recall effectiveness
owner: Recall Coordinator + PCQI (BD-27 gate)
```

### AR-J5-022 — Reportable Food Registry Submission
```
schema: {
  rfr_id, facility_registration_number, fei_number,
  event_date, report_date, within_24h: bool,
  product_description, lot_codes_affected[],
  hazard_description, serious_adverse_event_risk_basis,
  distribution_scope, recall_initiated: bool, recall_ref,
  fda_acknowledgement_ref, follow_up_submissions[],
  pcqi_sign_date
}
evidence_class: EC-17
retention: 2 years (FSMA §423)
owner: PCQI
```

### AR-J5-023 — Sanitary Transport Record
```
schema: {
  str_id, shipment_id, carrier_id, vehicle_id,
  temperature_requirement_C, temperature_at_load,
  temperature_at_delivery, temperature_log_ref,
  vehicle_cleanliness_check: pass|fail, cleaning_ref,
  previous_cargo_if_concern, driver_id, shipper_certification,
  receiver_acceptance: bool, rejection_reason, pccp_applicable: bool
}
evidence_class: EC-16
retention: 2 years (21 CFR 1.908)
owner: Logistics
```

### AR-J5-024 — Intentional Adulteration Vulnerability Assessment (IA-VA)
```
schema: {
  iava_id, facility_id, assessment_date, team[],
  actionable_process_steps_identified[{step, location,
  broad_access: bool, attractive_target: bool, ease_of_contamination,
  vulnerability_score, rationale}],
  mitigation_strategies[{step, strategy_type: physical|procedural|
  cyber|personnel, description, implementation_date}],
  food_defense_plan_ref, annual_reanalysis_due,
  fda_fsr_compliance: bool, pcqi_sign_date
}
evidence_class: EC-14
retention: 2 years
owner: Food Defense Coordinator + PCQI
```

### AR-J5-025 — Food Defense Plan
```
schema: {
  fdp_id, facility_id, iava_ref, coordinator_id,
  actionable_process_steps[], mitigation_strategies[],
  monitoring_procedures[], corrective_action_procedures[],
  verification_activities[], employee_training_ref,
  reanalysis_schedule, pcqi_sign_date, effective_date, version
}
evidence_class: EC-14
retention: 2 years post-supersession
owner: Food Defense Coordinator + PCQI
```

### AR-J5-026 — Environmental Monitoring Program (EMP) Record
```
schema: {
  emp_id, facility_id, zone: 1|2|3|4,
  pathogen_target: listeria|listeria_monocytogenes|salmonella|
  other, sample_site_id, sample_date, shift_id,
  sampling_method: swab|sponge|other, sample_lab_ref,
  lab_result: positive|negative|cfu_count, result_date,
  excursion_triggered: bool, investigation_ref, capa_ref,
  trend_analysis_period, zone_map_version
}
evidence_class: EC-14
retention: 2 years
owner: QA + PCQI
```

### AR-J5-027 — Process Authority Letter (LACF / Acidified)
```
schema: {
  pal_id, process_authority_name, process_authority_org,
  process_authority_credentials, facility_id,
  product_description, container_type, container_size,
  process_type: retort|aseptic|acidified,
  scheduled_process: {initial_temperature, process_temperature,
  time_minutes, cooling_parameters},
  botulinum_lethality_achieved: F0_or_equivalent,
  fda_process_filing_ref, effective_date,
  revalidation_trigger_criteria[], version
}
evidence_class: EC-14
retention: permanent + 3 years for records (21 CFR 113.100)
owner: R&D + QA (hold; Process Authority signs)
```

### AR-J5-028 — Thermal Process Validation Record
```
schema: {
  tpv_id, pal_ref, product_id, container_type_size,
  validation_date, validation_facility,
  retort_or_process_id, heating_value_distribution_data[],
  coldest_point_identified, F0_or_lethality_achieved,
  inoculated_pack_study_ref_if_applicable,
  process_authority_sign_date, validation_protocol_ref,
  outcome: pass|fail, corrective_action_ref
}
evidence_class: EC-14
retention: 2 years + life of product
owner: R&D + QA
```

### AR-J5-029 — Pasteurization Record (Grade A Dairy)
```
schema: {
  pr_id, facility_id, pasteurizer_id, run_date, run_start_time,
  run_end_time, product_description, batch_or_continuous: bool,
  pmo_process_type: HTST|HHST|vat,
  temperature_setpoint_C, actual_temperature_log_ref,
  flow_diversion_device_test_result: pass|fail,
  seal_check_result, inspector_observation_ref,
  regulatory_sample_taken: bool, sample_lab_ref, outcome: pass|fail
}
evidence_class: EC-14
retention: 2 years per PMO requirements
owner: Operations + QA
```

### AR-J5-030 — Water Activity / pH Record (Acidified)
```
schema: {
  waph_id, product_id, lot_id, test_date,
  water_activity_target_max, water_activity_measured,
  ph_target_max, ph_measured,
  instrument_id_aw, instrument_id_ph, calibration_refs[],
  result: pass|fail_aw|fail_ph, corrective_action_ref,
  process_authority_acceptance: bool, analyst
}
evidence_class: EC-14
retention: 2 years
owner: QA
```

### AR-J5-031 — Allergen Verification Record (Post-Cleanup)
```
schema: {
  avr_id, acp_ref, shared_line_id, preceding_allergen,
  following_product, verification_date, verification_method:
  atp|allergen_rapid_test|swab_elisa|visual|other,
  test_kit_ref, test_result: pass|fail, threshold_ppm_if_applicable,
  release_authorization: bool, hold_ref_if_failed, analyst_id,
  pcqi_review_date
}
evidence_class: EC-14
retention: 2 years
owner: QA + PCQI
```

### AR-J5-032 — Customer / Brand Specification
```
schema: {
  cbs_id, customer_id, product_id, spec_version,
  quality_attributes[{attribute, target, min, max, test_method}],
  food_safety_requirements[], allergen_declaration_required[],
  labelling_requirements[],
  country_of_origin_disclosure: bool, gfsi_cert_required: bool,
  audit_right_of_customer: bool, spec_effective_date,
  customer_sign_date, hesem_sign_date, review_cycle_months
}
evidence_class: EC-15
retention: 2 years post-expiry of product spec
owner: Commercial + QA
```

### AR-J5-033 — GFSI Certification Record
```
schema: {
  gcr_id, facility_id, scheme: BRCGS|SQF|FSSC22000|IFS|other,
  certification_body, auditor_name, audit_date,
  audit_type: announced|unannounced, grade: AA|A|B|C|fail,
  non_conformities[{category: major|minor|fundamental,
  description, close_date}], corrective_action_plan_ref,
  certificate_issue_date, certificate_expiry_date,
  surveillance_audit_date, customer_disclosure_required: bool
}
evidence_class: EC-15
retention: 3 years (GFSI scheme minimum)
owner: Food Compliance Lead
```

### AR-J5-034 — EU EFSA / National Authority Food Submission
```
schema: {
  efs_id, submission_type: novel_food|additive|contaminant_limit|
  pesticide_mrl|health_claim|other,
  dossier_ref, submission_date, authority_name,
  regulation_ref, applicant_id, product_description,
  safety_assessment_ref, outcome: approved|rejected|pending,
  opinion_ref, effective_date, labelling_change_required: bool
}
evidence_class: EC-14
retention: permanent (regulatory dossier)
owner: Regulatory Affairs
```

### AR-J5-035 — USDA-FSIS HACCP Plan (Meat / Poultry / Egg)
```
schema: {
  ufhp_id, establishment_number, product_category: beef|pork|
  poultry|egg_products, slaughter: bool, processing: bool,
  process_category: 21CFR417_appendixA,
  hazard_analysis_ref, ccp_list[], ssop_ref,
  generic_haccp_model_used_if_applicable,
  verification_procedures[], validation_schedule,
  fsis_inspection_records[], noncompliance_records[],
  corrective_action_refs[], reassessment_date, pcqi_equivalent
}
evidence_class: EC-14
retention: 1 year (FSIS) + 2 years FSP alignment
owner: Food Safety Manager + PCQI
```

---

## 3. State machines (pack-specific)

### SM-CCP-MONITOR — CCP Monitoring Lifecycle

```
State sequence per CCP × per monitoring event:

  SCHEDULED-MONITOR
    → operator arrives at CCP point per monitoring procedure
    → instrument calibration status checked (calibration_valid ?)
        - NO → INSTRUMENT-HOLD: halt production; notify QA;
                instrument pulled for recalibration; re-check
        - YES → MEASURED

  MEASURED
    → value recorded with timestamp + operator ID
    → compare to critical limit

  IN-SPEC
    → record stored (EC-14)
    → production continues
    → next scheduled monitoring event
    → [periodic] → supervisor batch review at end of shift

  OUT-OF-SPEC
    → CCP excursion flagged immediately (real-time instrument feed
      or manual entry triggers alert)
    → PRODUCT-HOLD activated: affected lot tagged HOLD;
      shipment/transfer blocked
    → corrective_action_wizard launched

  CORRECTIVE-ACTION
    → immediate cause addressed (temperature restored, pH adjusted, etc.)
    → affected product scope identified (lot + sub-lot)
    → DISPOSITION-DECISION:
        - rework: re-process per validated procedure → re-test
        - destroy: irreversible; batch destruction record
        - release-with-deviation: requires Process Authority
          letter acceptance (for LACF/acidified) + PCQI sign
        - escalate-to-recall: if distribution already occurred →
          SM-RECALL

  DISPOSITION-DECIDED
    → record finalized (EC-14)
    → hold released if disposition = rework-passed or destroy
    → CAPA triggered if root cause = systemic (H8)
    → supervisor sign-off; PCQI review within 24h

Hard couplings:
  - Release gate in D10 checks all CCP monitoring records for shift
    before lot release
  - FSMA §204 KDE/CTE capture linked to lot disposition
  - BD-26 gate: HACCP plan reauthorization that resets critical
    limits requires 2-person e-sign before CCPs update
```

### SM-FSVP — Foreign Supplier Verification Lifecycle

```
SUPPLIER-ONBOARDING
  → hazard analysis completed for each food × supplier combination
  → verification activities defined (onsite audit / testing / records review)
  → FSVP record created

VERIFICATION-ACTIVE
  → per activity schedule: verification conducted
  → result: satisfactory → VERIFIED; unsatisfactory → CORRECTIVE-ACTION
  → corrective action → supplier response → re-verification

VERIFIED
  → receiving allowed for that food × supplier combination
  → schedule next verification per frequency

RE-EVALUATION-TRIGGERED by:
  - change in hazard information for the food
  - change at supplier (process, location, owner, regulatory action)
  - change in FDA import alert status for supplier
  - adverse finding during verification
  - regulatory recall from that supplier

RE-EVALUATION
  → full hazard analysis re-run or update
  → verification activities re-confirmed or modified
  → FSVP record updated; PCQI sign

SUSPENDED
  → receiving blocked pending re-evaluation completion
```

### SM-FSMA-204 — High-Risk Food Traceability Lifecycle

```
Applies to all foods on FDA's High-Risk Foods List (HNFRL per §204).

CTE-EVENT-CAPTURED per critical tracking event:
  harvest / cool / initial-packing / first-land-based-receiver /
  shipping / receiving / transformation

At each CTE:
  KDE-RECORDED:
    - traceability_lot_code assigned or received
    - location (FEI or business address)
    - date and quantity
    - reference document type + number

TRANSMITTED-TO-TRADING-PARTNER (electronic preferred):
  → transmission timestamp recorded
  → acknowledgement from trading partner (where configured)

RETAINED:
  → 2-year retention clock starts at record creation date
  → cannot delete or overwrite; amendment requires audit trail

FDA-INVESTIGATION-REQUEST (simulated / real):
  → 24-hour response clock starts
  → FSMA §204 console enables lot trace forward + backward
  → HESEM generates §204 report package (all KDEs for implicated lots)
  → package delivered to FDA per electronic submission
```

### SM-RECALL — Recall Execution Lifecycle (Food)

```
TRIGGER:
  source: customer complaint | internal test | EMP excursion |
          regulatory signal | supplier notice | §204 request

HAZARD-EVALUATION:
  → health hazard evaluation: serious adverse health event?
  → RECALL-DECISION initiated (AR-J5-021)
  → BD-27 gate: 2-person e-sign on recall class assignment
  → FDA voluntary recall notification (24h RFR if reportable);
    USDA-FSIS if meat/poultry/egg product

  class I:  reasonable probability of serious adverse health or death
  class II: remote probability of serious adverse health
  class III: no adverse health consequence; market withdrawal option
  market_withdrawal: not a regulatory recall; product defect without
                     health risk

EXECUTION:
  → lot identification via §204 KDE/CTE trace or D11 lot genealogy
  → customer / distributor notification (HESEM notification engine)
  → product retrieval tracking per customer acknowledgement
  → affected product disposition: destroy / rework / return

EFFECTIVENESS-CHECK:
  → FDA standard: 100% effectiveness or negotiated threshold
  → audit sub-sample of recalled product disposition

CLOSURE:
  → FDA / FSIS termination letter received
  → final recall record (EC-17) closed
  → H8 CAPA for systemic root cause
```

### SM-EMP — Environmental Monitoring Program Lifecycle

```
Per zone × per organism × per period:

SCHEDULE-ACTIVE:
  → sampling site, date, organism, zone level scheduled

SAMPLE-DRAWN:
  → swab / sponge collected per SSOP
  → sample labeled with lot traceability code + site code
  → shipped to laboratory under chain of custody

RESULT-RECEIVED:
  → positive: EXCURSION-TRIGGERED
  → negative: routine record stored; trend updated

EXCURSION-TRIGGERED (positive environmental result):
  Zone 1 (direct food contact):
    → lot hold immediate for affected production period
    → intensified sampling (zone 1 + adjacent zones 2/3)
    → root cause investigation (sanitation failure? harborage site?)
    → corrective action: deep clean + sanitize + re-test
    → lot disposition decision by PCQI
    → H8 CAPA
  Zone 2/3 (indirect / non-food contact):
    → investigation + corrective action
    → intensified sampling per outbreak prevention protocol
    → CAPA
  Zone 4 (external / outside):
    → investigation; corrective action as warranted

CAPA-LINKED:
  → all zone 1 positives generate H8 CAPA (EC-14)
  → trend: ≥2 positives in 6 months → systemic CAPA
```

### SM-MOCK-RECALL — Mock Recall Run Lifecycle

```
PLANNED (annual minimum):
  → scenario selected (product, lot, health hazard level)
  → team assembled; no external notification simulated
  → timer started

TRACE-EXECUTED:
  → §204 KDE/CTE console + D11 lot genealogy
  → forward trace: all distribution points identified
  → backward trace: all supplier inputs identified
  → quantity reconciliation: dispatched = accounted + on-hand

RECONCILED:
  → percentage accounted for calculated
  → time elapsed recorded
  → target: ≤ 4 hours to 100% trace

EVALUATED:
  → pass: ≥ 95% reconciled within 4 hours
  → fail: gap analysis; identify trace breakpoints

CORRECTIVE-ACTION (if fail):
  → H8 CAPA on trace gap
  → §204 data capture compliance remediation
  → repeat mock within 90 days

EVIDENCE-CAPTURED:
  → mock recall run record (AR-J5-020) signed by PCQI
  → next annual due date set
```

### SM-IA-VA — Intentional Adulteration Vulnerability Assessment Lifecycle

```
SCOPE-DEFINED:
  → facility process flow mapped
  → actionable process steps (APS) identified per FSMA Part 121

VULNERABILITY-ASSESSED per APS:
  → four elements per APS:
    (1) accessibility to potential adulteration
    (2) ability to cause wide-scale public health harm
    (3) degree of physical access
    (4) ability of attacker to contaminate
  → vulnerability score computed

MITIGATION-STRATEGIES:
  → defined for each significant APS
  → types: physical security | access controls | monitoring | personnel

FOOD-DEFENSE-PLAN-ISSUED:
  → FDP (AR-J5-025) created with APS + mitigations
  → training completed for relevant personnel

REANALYSIS-TRIGGERED by:
  → new information about intentional adulteration threats
  → change in facility layout or process
  → completion of mitigation implementation
  → minimum: annual (or triggered)

PCQI-SIGN-REQUIRED on all reanalysis completions.
```

### SM-HACCP-REANALYSIS — HACCP Plan Reanalysis Lifecycle

```
REANALYSIS-SCHEDULED:
  → annual clock: HACCP plan effective_date + 12 months
  → also triggered by:
      - new ingredient or supplier
      - new or modified process step
      - new or revised scientific information about a hazard
      - new regulatory requirement
      - production of new product in scope
      - finding from EMP excursion or recall investigation

REANALYSIS-IN-PROGRESS:
  → PCQI leads; team convened
  → hazard analysis reviewed for each step
  → CCP designations confirmed or revised
  → critical limits reviewed against current science
  → monitoring + corrective action + verification reviewed

PLAN-MODIFIED or PLAN-CONFIRMED:
  → if modified: new version created; BD-26 two-person e-sign required
  → if confirmed: confirmation record signed by PCQI + second approver

EFFECTIVE:
  → operators trained on updated plan (H8 training record)
  → new monitoring starts per effective date
  → prior version archived (2-year retention)
```

---

## 4. Per-pack workflow overlays (D1–D14)

```
D1 Order to Cash:
  - Allergen disclosure: label must declare all 9 major allergens
    per FALCPA + EU 1169/2011 Art 21 before order fulfillment
  - FSMA sanitary transportation: temperature requirement communicated
    to carrier; STT compliance documentation per 21 CFR 1.908
  - Country-of-origin labelling: COOL per applicable jurisdiction
    (USDA COOL + EU origin labelling + FDA voluntary for non-covered)
  - §204 KDE CTE: shipping CTE captured at point of sale
    (lot, quantity, date, destination FEI or address)

D2 Procurement to Pay:
  - FSVP gate: every foreign food supplier requires active FSVP record
    (AR-J5-016) before purchase order can be received
  - Domestic supplier program: PCQI-approved supplier qualification
    (hazard analysis + audit/cert/testing verification)
  - Country-of-origin: captured at receipt for labelling downstream
  - Food contact material supplier: FCN/FCM compliance documentation
    per 21 CFR 170–180 + EU 1935/2004

D3 Plan to Produce:
  - HACCP plan effective for the process line before production scheduled
  - Food Safety Plan review: PCQI confirms FSP current (no overdue
    reanalysis) before run release
  - Allergen scheduling: production scheduler checks allergen
    cross-contact risk; high-allergen runs scheduled last or
    after validated cleanout
  - Sanitation pre-op: pre-op inspection must pass (AR-J5-013)
    before line start; CCP instruments calibrated and confirmed

D4 Receive to Inspect:
  - FSVP receiving verification: if foreign-sourced, FSVP completion
    check before acceptance
  - Temperature on receipt: refrigerated / frozen products log
    temperature at receipt; exceedance → hold + PCQI evaluation
  - Allergen identity: allergen-containing ingredient containers
    confirmed and segregated per ACP

D5 Inspect to Disposition:
  - CCP excursion handling: SM-CCP-MONITOR disposition workflow
  - Hold/release/destroy: lot hold auto-applied on CCP out-of-spec;
    release requires PCQI sign or Process Authority concurrence
  - Allergen verification: positive allergen rapid test → lot hold
    pending investigation

D6 NC to CAPA:
  - HACCP-driven NC: every CCP excursion generates NC linked to
    HACCP plan; systemic failures escalate to H8 CAPA
  - Allergen cross-contact incidents: full lot trace-forward;
    customer notification if allergen undisclosed shipped
  - EMP excursion (zone 1): H8 CAPA mandatory

D7 Document to Release:
  - HACCP plan / SSOPs / labels: effectivity review before document
    release; no obsolete HACCP plan can be referenced in production
  - Allergen statement currency: label allergen list must match
    current formulation before label approval

D8 Train to Qualify:
  - HACCP team qualification: all HACCP team members trained on
    current HACCP plan version; training record in D8
  - PCQI qualification: PCQI training + qualification documented
    (AR-J5-004); job experience or accredited training course
  - Allergen awareness training: all production + sanitation staff
  - Sanitation training: specific to SSOP per area
  - FSVP training: importer staff on hazard analysis + verification

D9 Maintain to Restore:
  - Sanitary design: equipment maintenance must preserve sanitary
    design (no hollow rollers, crevices, etc.); inspection at PM
  - Calibration of CCP instruments: calibration schedule per critical
    limit parameter; out-of-tolerance → CCP monitoring data validity
    review + corrective action
  - Refrigeration + temperature: preventive maintenance for cold chain

D10 Batch to Release:
  - Lot release gate: all CCP monitoring records for the batch must
    be complete + in-spec; allergen verification complete if
    shared-line run; EMP excursion not open for affected zone;
    PCQI final sign
  - FSMA §204: packing CTE captured; lot traceability code assigned

D11 Release to Trace:
  - FSMA §204 KDE/CTE for high-risk foods: shipping CTE transmitted
    to trading partner; lot genealogy maintained
  - Lot genealogy: ingredient → WIP → finished lot linkage
  - Mock recall readiness: trace must be testable within 4h (§204
    + SM-MOCK-RECALL)

D12 Complaint to Recall:
  - Consumer complaint: triage for food safety (allergy, illness,
    foreign material, adulteration) → if serious adverse event risk,
    RFR 24h clock
  - Recall decision: BD-27 two-person e-sign gate on classification
  - Market withdrawal option for non-safety quality defects

D13 Audit to Remediate:
  - FDA FSVI (food safety inspection): records access; HACCP +
    FSP + EMP + allergen + sanitation
  - GFSI cert audit: unannounced per scheme; graded; findings
    responded to within scheme timelines
  - Customer audit: right-of-audit; brand conformance
  - USDA-FSIS EIAO (for meat/poultry/egg): HACCP validation +
    verification review; SSOP compliance

D14 Validate to Qualify:
  - Thermal process validation: per LACF + acidified products;
    process authority letter required before production
  - Pasteurization validation: per PMO for Grade A dairy
  - EMP system validation: sampling site selection + organism
    targeting; zone map validation
  - Allergen allergen method validation: test kit validated for
    allergen type + food matrix
  - FSVP on-site audit: qualifies as verification activity if
    PCQI or FSVP-qualified individual conducts
```

---

## 5. Banned decisions — BD-26, BD-27, BD-28

### BD-26 — HACCP Plan Reauthorization / Critical Limit Change

```
banned_decision_id: BD-26
decision_class: Regulatory food safety program change
description:
  No HACCP plan version that modifies a critical limit, adds or
  removes a CCP, changes the monitoring frequency for a CCP, or
  changes the scope of the Food Safety Plan may become effective
  without a two-person electronic signature: the facility's PCQI
  as first signer and a second authorized food safety reviewer
  (typically Food Compliance Lead or Director of Quality).

Rationale:
  HACCP plan critical limits are the primary line of defense against
  food safety hazards. An incorrect critical limit (too permissive)
  can cause consumer harm at scale. Process Authority sign-off is
  required for LACF/acidified, and FDA holds the operator responsible
  for the current scheduled process. A single person approving a
  loosened critical limit without independent review has historically
  caused foodborne illness outbreaks.

Scope:
  All facilities in the J5 Food pack. Applies equally to food safety
  plan preventive control modifications (monitoring frequency
  reduction, corrective action procedure change).

What AI advisory may do:
  - AI-09 may suggest that a CCP excursion pattern indicates a
    critical limit that is too tight relative to normal variation
    (false positives). This suggestion is advisory only and must
    be reviewed by PCQI before any reanalysis is scheduled.
  - AI may not autonomously propose a revised critical limit value;
    it may only surface a hypothesis for human review.

Evidence required to lift block:
  - AR-J5-001 version N+1 with two e-signatures and timestamps
  - AR-J5-003 (FSP) updated if scope change
  - Process Authority letter updated if LACF/acidified
  - Training record (D8) confirming operators briefed on new CL
  - EC-14 + EC-22 evidence bundle

Exception path:
  Emergency production hold: if current critical limit creates
  continual false excursions due to equipment malfunction, PCQI may
  apply a temporary operational deviation for ≤ 24 hours pending
  equipment repair, with continuous supervisor monitoring. This
  does not modify the HACCP plan; it is a documented temporary
  corrective action.
```

### BD-27 — Recall Classification (Food Class I / II / III)

```
banned_decision_id: BD-27
decision_class: Recall and public notification
description:
  No food recall shall be classified as Class I, II, III, or as a
  market withdrawal without a two-person electronic signature: the
  Recall Coordinator as primary decision maker and the PCQI (or
  Food Compliance Lead) as independent reviewer. For Class I recalls,
  the notification chain (to FDA and, for meat/poultry, USDA-FSIS)
  must be initiated within 24 hours of the classification decision.

Rationale:
  Under-classification of a Class I recall as Class III conceals
  the public health severity and delays consumer notification.
  FDA has issued Warning Letters for delayed or under-classified
  recalls. Over-classification as Class I when no reasonable
  health risk exists wastes regulatory resources and damages
  brand unnecessarily. Independent review provides error-correction
  against both failure modes. For meat/poultry products, FSIS
  requires parallel notification independent of FDA.

Scope:
  All J5 Food pack tenants. Applies to US FDA recalls and USDA-FSIS
  HACCP-plan-related recalls. EU equivalent: rapid alert notification
  (RASFF) which must be filed with national food authority within
  established timelines.

What AI advisory may do:
  - AI-09 (anomaly detection extended to HACCP CCP) may flag
    complaint clusters that exceed normal baseline and suggest
    a health hazard evaluation is warranted.
  - AI may not autonomously classify a recall. Classification
    decision and record (AR-J5-021) must be signed by two
    authorized persons per BD-27.
  - AI-generated draft consumer notice and distribution list
    may be produced for review by Recall Coordinator; draft must
    be explicitly approved before transmission.

Evidence required:
  - AR-J5-021 with two e-signatures
  - AR-J5-022 (RFR submission) if reportable food trigger exists
  - Lot identification package (§204 KDE/CTE trace)
  - EC-17 evidence bundle
  - FDA or FSIS notification acknowledgement (after filing)
```

### BD-28 — Food Contact Substance Regulatory Exception

```
banned_decision_id: BD-28
decision_class: Regulatory determination — food contact material safety
description:
  No food contact substance, packaging material, or food contact
  article may be approved for use in production without documentary
  evidence of regulatory clearance per applicable jurisdiction:
  (a) FDA: FCN (Food Contact Notification) filed and effective, or
      prior sanctioned status (pre-1958), or GRAS determination,
      or FCM supplier's Letter of Guarantee under applicable
      threshold-of-regulation;
  (b) EU: compliance with Reg 1935/2004 + applicable specific
      measure (EU 10/2011 for plastics; EU 1895/2005 for epoxy
      derivatives); compliance testing per applicable migration limits;
  (c) Other jurisdictions: national authority clearance documentation.
  This determination requires two-person e-sign: Regulatory Affairs
  + QA Director.

Rationale:
  Food contact materials can migrate into food and cause consumer
  harm. FCN eligibility is not self-evident; GRAS determinations
  for contact materials have been challenged. EU 10/2011 specific
  migration limits require validated migration testing. An
  unauthorized food contact substance could trigger a Class I recall
  (contamination with a non-approved substance) with no health hazard
  threshold required for classification.

Scope:
  All J5 Food pack tenants. Applies to new packaging specifications,
  new equipment that contacts food, and new coating or lubricant
  materials.

What AI advisory may do:
  - AI may search the FDA FCN database and return clearance status
    as informational advisory.
  - AI may not make the regulatory determination itself.
  - Final approval record requires Regulatory Affairs + QA Director
    signatures.

Evidence required:
  - FCN acknowledgement letter (FDA) or Declaration of Compliance
    per EU 1935/2004 + specific measure
  - Migration testing report if EU or SN validation required
  - Supplier letter of guarantee if threshold-of-regulation basis
  - EC-14 + EC-15 evidence bundle
```

---

## 6. AI advisory (Food pack)

### AI-09 — CCP Anomaly Detection (Extended to HACCP)

```
advisory_id: AI-09-Food
base_advisory: AI-09 (general anomaly detection, defined in L2)
extension_scope: HACCP CCP monitoring streams; food safety complaint clusters

CCP Monitoring Anomaly:
  Input signals:
    - Time-series of CCP monitoring values per CCP per instrument
    - Critical limit bounds (upper + lower)
    - Process parameters (product, line, shift)

  Pattern detection:
    - Drift toward critical limit (progressive approach)
    - Cyclic pattern correlated with shift change, cleaning, or
      product changeover (suggests recurring systemic condition)
    - Instrument calibration drift signature (gradual offset vs.
      step-change offset — latter suggests recalibration event
      needed vs. sanitation event)
    - False-positive CCP excursion cluster (excursion rate per CCP
      exceeds historical baseline without corresponding product
      quality finding — suggests critical limit review warranted
      per BD-26 advisory)

  Advisory outputs (operator-facing):
    - HESEM displays a pattern card on the CCP Monitoring Workspace:
      "CCP [X] shows progressive drift toward critical limit. Current
       value: [V]. Critical limit: [CL]. Projected exceedance in
       approximately [N] monitoring cycles at current rate."
    - Operator chooses to: (a) acknowledge and continue, (b) initiate
      process adjustment, (c) call for instrument check, (d) notify PCQI
    - PCQI advisory: if drift pattern meets PCQI-configured trigger
      threshold, an automated advisory is sent to PCQI: "Potential
      systemic condition at CCP [X] on line [Y]. Review recommended."

  Complaint Cluster Anomaly:
    - Input: complaint intake from D12; text-classified by complaint
      type (allergen, illness, foreign body, taste/odor)
    - Pattern: Bayesian shift-detection on complaint rate per product
      per complaint type per time window
    - Advisory: "Complaint rate for [product] elevated above baseline
      by [X×] for [illness/allergen] type. Health hazard evaluation
      consideration may be warranted."
    - This advisory is informational. Recall classification under BD-27
      requires human decision with two-person e-sign.

  EMP Positive Trend Anomaly:
    - Input: EMP results per zone per organism per time
    - Pattern: Poisson shift in positive rate; spatial clustering
      (same zone, same area, repeated) vs. random scatter
    - Advisory: "Zone 1 positive rate for Listeria at site [S] exceeds
      control chart limits for 3 consecutive sampling events. Root
      cause investigation recommended."

  Non-Advisory Actions (AI-09 is bounded):
    - AI-09 cannot modify a HACCP plan, critical limit, or monitoring
      procedure
    - AI-09 cannot classify a complaint as a reportable food event
    - AI-09 cannot generate or send an RFR submission draft without
      explicit PCQI action
    - AI-09 pattern outputs are logged as EC-38 (AI-generated advisory)
      and are not considered EC-14 (food safety program records)
      unless a human explicitly adopts the finding into a corrective
      action record
```

---

## 7. APIs (pack-specific)

```
POST /api/v1/food/haccp-plans
GET  /api/v1/food/haccp-plans/{plan_id}
PUT  /api/v1/food/haccp-plans/{plan_id}/reanalysis
POST /api/v1/food/haccp-plans/{plan_id}/sign
  — Two-signer gate per BD-26; validates signer roles before committing

GET  /api/v1/food/ccp-monitoring/real-time
  — SSE stream per facility × per CCP; instrument integration (E15)
  — carries: ccp_id, timestamp, measured_value, cl_breach: bool,
    anomaly_advisory_ref (AI-09), operator_id

POST /api/v1/food/ccp-monitoring
  — manual CCP monitoring entry; validates instrument calibration status

POST /api/v1/food/ccp-corrective-actions
  — excursion corrective action record + lot hold trigger

POST /api/v1/food/pcqi-records
GET  /api/v1/food/pcqi-records/{pcqi_id}/activity-log

GET  /api/v1/food/fsvp/suppliers
POST /api/v1/food/fsvp/suppliers/{supplier_id}/hazard-analysis
POST /api/v1/food/fsvp/suppliers/{supplier_id}/verification-activities
PUT  /api/v1/food/fsvp/suppliers/{supplier_id}/re-evaluation

POST /api/v1/food/fsma204/kde-cte
  — KDE/CTE record creation per CTE type
  — electronic transmission to trading partner API (E15)
GET  /api/v1/food/fsma204/trace/{lot_id}/forward
GET  /api/v1/food/fsma204/trace/{lot_id}/backward
  — returns full KDE chain within 24h response SLO for FDA requests
POST /api/v1/food/fsma204/fda-investigation-package/{lot_id}
  — generates §204 report package for FDA request response

POST /api/v1/food/rfr-submissions
  — Reportable Food Registry submission (FSMA §423)
  — transmits to FDA gateway (E15); records timestamp;
    24h compliance flag automatically computed

POST /api/v1/food/recall-decisions
  — BD-27 two-signer gate; blocks classification without two e-sigs
GET  /api/v1/food/recall-decisions/{recall_id}
PUT  /api/v1/food/recall-decisions/{recall_id}/effectiveness-check
POST /api/v1/food/recall-decisions/{recall_id}/close

POST /api/v1/food/mock-recalls
GET  /api/v1/food/mock-recalls/{mr_id}/trace-results

POST /api/v1/food/emp-records
GET  /api/v1/food/emp-records/trend/{facility_id}
  — returns zone × organism × time heatmap data

POST /api/v1/food/sanitation-records
POST /api/v1/food/sanitation-records/pre-op-sign
  — sign-off gate: production blocked until pre-op passed

POST /api/v1/food/allergen/control-plans
POST /api/v1/food/allergen/verification-records
  — post-cleanup allergen verification; lot hold integration

POST /api/v1/food/ia-va
POST /api/v1/food/food-defense-plans

POST /api/v1/food/thermal-process-validations
POST /api/v1/food/process-authority-letters
  — management of PAL per LACF/acidified product

POST /api/v1/food/pasteurization-records
  — Grade A dairy; integrates with PMO continuous recorder (E15)

POST /api/v1/food/water-activity-ph
POST /api/v1/food/allergen-verification-post-cleanup

GET  /api/v1/food/usda-fsis/haccp-plans/{establishment_id}
  — USDA-FSIS HACCP plan mirror; inspection record integration

GET  /api/v1/food/gfsi-certifications/{facility_id}
POST /api/v1/food/gfsi-certifications
  — scheme cert evidence per BRCGS / SQF / FSSC / IFS

GET  /api/v1/food/customer-brand-specs/{customer_id}
POST /api/v1/food/customer-brand-specs/{customer_id}/conformance-check

GET  /api/v1/food/audit-pack/{facility_id}
  — generates inspection-ready audit pack:
    FSP + HACCP plans + CCP records + PCQI log + FSVP records +
    EMP records + allergen records + sanitation records +
    §204 KDE/CTE sample + training records + GFSI cert
```

---

## 8. UI surfaces

**1. HACCP Plan Workspace**
Guided hazard analysis per process step; CCP decision tree (Codex
7 questions); critical limit entry with basis field (scientific
reference / PAL / validation study); monitoring, corrective action,
verification, and records configuration per CCP; reanalysis
scheduling; BD-26 two-signer e-sig widget on plan effectuation.

**2. CCP Monitoring Console**
Real-time instrument feed with critical limit bands displayed; manual
entry form for non-automated CCPs; excursion banner with immediate
lot-hold widget; corrective action wizard triggered on out-of-spec;
shift-end batch review with supervisor sign; AI-09 advisory cards
surfaced for drift and pattern anomalies.

**3. Food Safety Plan (FSP) Workspace**
Full Part 117 preventive controls map: process controls, sanitation
controls, allergen controls, supply-chain controls; PCQI activity log
integration; annual reanalysis status indicator; cross-link to HACCP
plan for process CCPs.

**4. PCQI Activity Dashboard**
Active PCQI qualifications with expiry; activity log (regulatory
reviews, plan sign-offs, trainings); overdue PCQI activities flagged;
facility scope map.

**5. FSVP Supplier Workspace**
Per-supplier × per-food FSVP record status; hazard analysis timeline;
verification activity schedule + results; re-evaluation trigger
indicators; receiving block status.

**6. FSMA §204 Traceability Console**
High-risk food lot trace: forward (all distribution points) +
backward (all ingredient inputs); KDE/CTE chain visualized as
timeline; 24h response SLO indicator; FDA investigation package
export; mock recall trace simulation mode.

**7. Allergen Control Workspace**
Ingredient allergen inventory; cross-contact risk matrix per shared
line; allergen run sequencing calendar integration; post-cleanup
verification entry; positive result hold trigger; EU + FALCPA
declaration checklist.

**8. Sanitation and SSOP Console**
Pre-op inspection checklist per area (pass/fail sign-off before
line start); SSOP library per area × task; sanitation record entry;
ATP swab result capture; pest control service record and finding
follow-up; trend chart for sanitation findings.

**9. Environmental Monitoring (EMP) Console**
Facility zone map (zone 1–4 color-coded); per-site sampling
schedule; result entry; positive excursion alert with investigation
wizard; pathogen trend charts per organism per zone; CAPA link.

**10. Recall + Mock Recall Workspace**
Recall decision workflow with BD-27 two-signer gate; lot
identification trace via §204 console; customer/distributor
notification queue; effectiveness check progress tracker; mock
recall cycle history with time-to-100% metric; annual schedule.

**11. Reportable Food Registry (RFR) Submission Console**
RFR event creation; 24h deadline countdown clock; product +
lot detail; FDA transmission status; follow-up submission management;
complaint linkage.

**12. Food Defense and IA Workspace**
Actionable process step vulnerability assessment matrix; mitigation
strategy mapping; food defense plan authoring; annual reanalysis
schedule; training record integration.

**13. Thermal Process and LACF Console**
Process Authority letter repository; scheduled process parameters;
thermal process validation records; product scope mapping; FDA
filing status for each scheduled process; pH / water activity
records for acidified.

**14. GFSI Certification and Customer Spec Workspace**
Scheme cert records (BRCGS/SQF/FSSC/IFS) with grade + NC
management; customer brand specification conformance tracking;
customer audit schedule.

**15. Food Audit Pack Wizard**
Pre-inspection assembly: selects relevant HACCP/FSP version,
CCP sample records, PCQI activity log, FSVP records, EMP trend,
allergen + sanitation records, §204 KDE sample, training records,
GFSI cert; generates reviewer-ready package for FDA / FSIS / GFSI /
customer auditors.

**16. USDA-FSIS HACCP Workspace (where applicable)**
USDA-jurisdiction HACCP plan; FSIS inspection record mirror;
SSOP (Part 418) compliance tracking; noncompliance record (NR)
management; FSIS EIAO documentation.

---

## 9. Pack discipline

```
FSMA Part 117 preventive controls:
  Hazard analysis + preventive controls (process / sanitation /
  allergen / supply-chain) required for all covered facilities.
  Food Safety Plan must be signed by PCQI; reviewed + reanalyzed
  annually and on trigger. Records per §117.305 retained ≥2 years.

HACCP team requirement:
  All HACCP plans must be developed and maintained by a
  multi-disciplinary HACCP team (Team Charter AR-J5-002).
  PCQI must be a qualified individual meeting 21 CFR 117.3
  definition: job experience + training combination.

HACCP plan reanalysis — annual + trigger:
  Per 21 CFR §117.170: at least every 3 years (FDA minimum) but
  HESEM enforces annual reanalysis per best practice and GFSI
  requirements. BD-26 gates all critical limit modifications.

Recall plan testing:
  Annual mock recall (SM-MOCK-RECALL); target ≤ 4 hours to 100%
  trace. Failure triggers H8 CAPA + repeat within 90 days.

Foreign supplier verification per FSVP (21 CFR 1.500):
  Every imported food item × every foreign supplier requires
  active FSVP hazard analysis + verification activity record.
  Re-evaluation on change or adverse finding.

High-risk food §204 KDE/CTE — 2-year retention:
  All CTEs for foods on the HNFRL must capture required KDEs and
  be retained for 2 years. Electronic transmission preferred.
  FDA investigation response: 24 hours.

Reportable Food Registry timing (FSMA §423):
  Report to FDA within 24 hours of discovering a reasonable
  probability of serious adverse health consequence or death.
  RFR record (AR-J5-022) with PCQI sign required.

Sanitation: pre-op + operational + post-op:
  Pre-op inspection per shift before line start (signed pass/fail).
  Operational sanitation during run. Post-op after production.
  All per SSOP per area. Records retained 2 years.

Allergen labelling per FALCPA + EU 1169/2011:
  All 9 major allergens (US FASTER Act 2021 adding sesame) must
  be declared. EU 14 allergens per Annex II. Label allergen review
  required at each formulation change and before new label approval.

LACF + acidified: Process Authority requirement:
  No low-acid canned food or acidified food may be produced without
  a current Process Authority letter (AR-J5-027) from a qualified
  Process Authority. Thermal process validation (AR-J5-028) required.
  Filed process required by FDA (21 CFR 108.25, 108.35).

Grade A dairy — pasteurization per PMO:
  All Grade A milk and milk products must be pasteurized per PMO
  time/temperature standards. Continuous recorder required.
  HTST: 72°C for 15 sec minimum.

GFSI cert + per-customer brand conformance:
  GFSI scheme annual or biennial audit (scheme-specific). Grade
  outcome disclosed to customers as required. Customer brand
  standards tracked in AR-J5-032 with conformance check.

Country-of-origin labelling:
  USDA COOL for beef, pork, lamb, chicken, goat, fish, shellfish,
  perishable agricultural commodities. EU origin labelling per
  1169/2011 Art 26. FDA voluntary for most processed foods.

USDA-FSIS coordination:
  For meat, poultry, and egg products: USDA-FSIS HACCP plan
  (AR-J5-035) maintained separately; FSIS inspection records
  mirrored into HESEM; FSIS EIAO documentation managed.
  Recall coordination with both FDA and FSIS for dual-jurisdiction
  products.

Intentional adulteration — FSMA Part 121:
  All covered facilities must complete IA-VA (AR-J5-024) and
  maintain Food Defense Plan (AR-J5-025). Annual reanalysis.
  Employee training required for APS personnel.

Two-person e-sig:
  BD-26: HACCP plan reauthorization / CL change
  BD-27: Recall classification
  BD-28: Food contact substance exception approval
```

---

## 10. KPIs with targets

| KPI | Measurement | Target |
|---|---|---|
| CCP monitoring completion rate | Records created / scheduled per shift | 100% |
| CCP excursion corrective action timeliness | Corrective action initiated within shift of excursion | ≥ 99% |
| HACCP plan reanalysis on-time | Reanalysis completed before annual due date | 100% |
| Mock recall time-to-100% trace | Hours elapsed in most recent mock recall | ≤ 4 hours |
| FSVP completion per active supplier×food pair | Active FSVP / total supplier×food pairs receiving | 100% |
| §204 KDE/CTE data completeness | Complete KDE records / total shipment CTEs for HNFRL foods | ≥ 99.5% |
| Allergen verification compliance rate | Pre-allergen allergen verification pass / total required | 100% |
| Sanitation pre-op pass rate per shift | Pre-op pass / total pre-op inspections | ≥ 99% |
| EMP zone 1 positive rate | Zone 1 positive samples / total zone 1 samples | ≤ 1% per quarter |
| Pest control finding closure rate | Findings closed within 7 days / total findings | ≥ 95% |
| Customer complaint food safety trend | Rolling 90-day count vs. prior 90-day count | Non-increasing |
| GFSI audit grade | Last scheme audit grade | AA (BRCGS) / Superior (SQF) |
| RFR 24h compliance | RFRs submitted ≤ 24h / total reportable food events | 100% |
| Recall effectiveness | Percentage of recalled product accounted for | ≥ 95% per FDA standard |
| CCP instrument calibration currency | In-calibration instruments / total CCP instruments | 100% |

---

## 11. Audit pack contents (Food-specific, supplements H3 §4)

```
 1. Food Safety Plan (current version) + HACCP plan(s) per process line
 2. Hazard analysis records per process step per facility
 3. Preventive controls listing (process + sanitation + allergen + supply-chain)
 4. CCP records — sample set from current audit period (all CCPs represented)
 5. PCQI qualification records + activity log (last 2 years)
 6. HACCP team charter + member training records
 7. Reanalysis records (last completed reanalysis or confirmation)
 8. FSVP records per active foreign supplier × food (current + last cycle)
 9. Recall plan (current version)
10. Mock recall run records (last 24 months — most recent run required)
11. Allergen control plan + cross-contact risk assessments
12. Allergen verification records (post-cleanup; last 12 months)
13. Allergen label review records for label changes in audit period
14. Sanitation plan (master) + SSOPs per area
15. Sanitation records (pre-op + operational + post-op; last 90 days sample)
16. Pest control plan + service records (last 12 months) + findings + closure
17. CCP instrument calibration records (last 12 months)
18. Reportable Food Registry submissions (if any in period)
19. FSMA §204 KDE/CTE records for HNFRL foods (last 90 days sample)
20. EMP records + pathogen trend charts (last 12 months)
21. EMP excursion investigations + corrective actions
22. Intentional adulteration VA + Food Defense Plan
23. Sanitary transport records (last 90 days sample)
24. Thermal process validation records (LACF/acidified, if applicable)
25. Process Authority letters (current, all active processes)
26. Pasteurization records + PMO continuous recorder tapes (Grade A dairy, 90 days)
27. Water activity / pH records (acidified products; last 90 days)
28. Customer / brand specification conformance records
29. GFSI certification + last 2 audits + NC responses
30. USDA-FSIS HACCP plan + inspection records (where applicable)
31. Country-of-origin documentation
32. Training records (all food safety topics: HACCP / PCQI / allergen /
    sanitation / FSMA / food defense / FSVP)
33. BD-26 / BD-27 / BD-28 e-sig audit log excerpts for period
```

---

## 12. Failure modes

### FM1 — CCP Excursion Not Handled Within Shift
```
cause: operator fails to initiate corrective action immediately on
       out-of-spec CCP value; shift change without escalation
impact: affected lot potentially released without disposition;
        regulatory and consumer harm risk
detection: CCP Monitoring Console: open corrective action older than
           [configured threshold] with no disposition triggers alert
recovery: batch hold retroactively applied; PCQI investigation;
          lot disposition decision; H8 CAPA on monitoring discipline
          and shift-change handover protocol
```

### FM2 — Mock Recall Fails Time Target (> 4 Hours)
```
cause: §204 KDE/CTE data gaps; incomplete D11 lot genealogy;
       customer distribution records not integrated
impact: in a real recall, FDA investigation response SLO breached;
        consumer protection delayed; regulatory criticism
detection: mock recall run record (AR-J5-020) records elapsed time
recovery: trace gap analysis; §204 data capture remediation;
          H8 systemic CAPA; repeat mock within 90 days
```

### FM3 — Reportable Food Registry Submission Late (> 24 Hours)
```
cause: complaint intake not triaged as potential reportable food;
       RFR process not initiated by PCQI
impact: FSMA §423 violation; FDA enforcement action (Warning Letter,
        injunction); civil money penalty up to $10M per violation
detection: HESEM timer: complaint with food safety flag open > 20h
           without RFR or explicit "not reportable" determination
           → SEV-1 alert to PCQI + Compliance Lead
recovery: RFR filed immediately; FDA communication noting late
          submission; H8 CAPA on triage + PCQI response time
```

### FM4 — FSVP Supplier Verification Skipped
```
cause: procurement receives shipment without confirming active
       FSVP for that supplier × food combination
impact: receiving of potentially hazardous imported food without
        supplier hazard verification; FSMA FSVP violation
detection: receiving module check: FSVP status gate per supplier ×
           food at receipt; blocked if FSVP not current
recovery: lot hold at receiving; FSVP record creation or update
          before acceptance; H8 CAPA on receiving gate compliance
```

### FM5 — Allergen Cross-Contact Incident Post-Release
```
cause: allergen verification post-cleanup skipped or failed to
       detect residual allergen; incorrect allergen scheduling
impact: allergen-containing product reaches consumer without label
        declaration; potential anaphylaxis; Class I recall
detection: allergen rapid test positive on released lot (either
           internal or customer complaint); consumer allergic reaction
recovery: lot trace-forward; D12 complaint-to-recall; BD-27 recall
          classification; consumer notice; H8 CAPA + allergen
          program remediation; potential FSMA §423 RFR
```

### FM6 — §204 KDE/CTE Data Incomplete at FDA Investigation
```
cause: CTEs not captured at transformation or shipping;
       trading partner not sending electronic KDEs;
       system data gap in §204 records
impact: cannot trace lot within 24h; FDA violation; recalls
        may be broader than necessary (cannot exclude clean lots)
detection: §204 audit: completeness check on HNFRL lots;
           mock recall reveals gap
recovery: lot held; manual trace reconstruction; H8 CAPA on
          data capture and trading partner integration
```

### FM7 — HACCP Plan Reanalysis Overdue
```
cause: annual reanalysis not scheduled; PCQI change; trigger
       condition (new product, new supplier) not flagged
impact: HACCP plan may not reflect current hazard landscape;
        FSMA Part 117 non-compliance; GFSI audit finding
detection: H6 KPI dashboard: HACCP reanalysis due date surfaced
           ≥ 60 days before deadline; SEV-2 alert if overdue
recovery: reanalysis initiated immediately; BD-26 gate for any
          resulting changes; H8 CAPA on reanalysis scheduling
```

### FM8 — PCQI Absence During Regulated Activity
```
cause: PCQI vacancy (resignation, leave, termination) without
       qualified backup designated
impact: FSMA Part 117 requires PCQI for specific activities
        (hazard analysis, preventive controls oversight, corrective
        action oversight, FSVP sign-off); activities blocked or
        improperly performed
detection: PCQI record (AR-J5-004) with expiry or vacancy flag;
           activity requiring PCQI sign rejected by workflow
recovery: backup PCQI designated and qualified before regulated
          activity proceeds; H8 CAPA on succession planning;
          Compliance Lead notified
```

### FM9 — LACF Process Not Filed with FDA
```
cause: new LACF product introduced without FDA process filing;
       Process Authority letter obtained but filing step skipped
impact: 21 CFR 108.25 / 108.35 violation; FDA can order cessation
        of operations; product subject to detention
detection: new LACF product onboarding checklist requires PAL +
           FDA filing confirmation before production release
recovery: production halted; FDA filing submitted; legal counsel;
          H8 CAPA on new product launch checklist
```

### FM10 — Grade A Dairy Pasteurization Recorder Failure
```
cause: continuous recorder malfunction; chart paper run out; no
       backup recording; sensor failure not detected
impact: no pasteurization proof; Grade A status of batch uncertain;
        PMO requires valid chart record for each HTST run
detection: pasteurization record (AR-J5-029) requires valid recorder
           reference; missing chart = incomplete record = lot hold
recovery: lot hold pending investigation; if recorder gap ≤ rule-
          allowed tolerance and temperature was maintained per
          operator log + calibrated standby, PCQI evaluates release;
          otherwise: lot destroyed per PMO; H8 CAPA on recorder PM
```

---

## 13. Cross-references

| Document | Relevance |
|---|---|
| H1 §2.6 | Food regulatory inventory; 21 CFR + EU framework |
| H2 | Thermal process validation workflow; EMP validation |
| H3 §4 | Base audit pack; J5 audit pack supplements §4 |
| H4 | EC-14 (food safety records), EC-16 (traceability), EC-17 (recall) |
| H5 §3 | 2-year FSMA §204 retention floor; LACF 3-year retention |
| H6 | HACCP reanalysis KPI surfacing; PCQI vacancy alert |
| H8 | CAPA program: CCP excursions, EMP zone 1 positives, allergen incidents |
| H9 | Risk management: food safety hazard risk matrix (HACCP) |
| L1 | BD-26, BD-27, BD-28 (food banned decisions) |
| L2 | AI-09 anomaly detection extended to HACCP CCP + food complaints |
| D10 | Lot release gate: all CCP records complete + in-spec before release |
| D11 | FSMA §204 lot genealogy; KDE/CTE lot linkage |
| D12 | Complaint to recall workflow; consumer notification |
| E15 | FDA RFR gateway; USDA-FSIS integration; §204 trading partner API |
| I7 | Food defense (FSMA Part 121) cybersecurity considerations |
| J0 | Part J overview; cross-vertical principles |
| M3 | Root catalog: Food-specific roots AR-J5-001..AR-J5-035 |
| M5 | SLO directory: §204 24h investigation response SLO |
| M9 | Bibliography: 21 CFR Part 117, Codex CXC 1, ISO 22000:2018 |

---

## 14. Decision phrase

```
J5_FOOD_V10_LOCKED
S4-11_J4_J5_DEEP_UPGRADE_COMPLETE
```
