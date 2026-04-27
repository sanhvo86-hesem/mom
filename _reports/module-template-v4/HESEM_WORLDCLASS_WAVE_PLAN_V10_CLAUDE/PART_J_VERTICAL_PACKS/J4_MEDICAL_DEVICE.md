# J4 — Medical Device Vertical Pack

```
pack_id:        Medical Device
owner_role:     Med Device Lead with Compliance Lead and PRRC
wave_target:    W10 (preview); W11 GA
sources:        21 CFR Part 820 / QMSR (2024 final rule; full effect
                2026), 21 CFR Parts 803 / 806 / 821 / 830 / 11,
                EU MDR 2017/745 + Corrigendum + MDCG guidances,
                EU IVDR 2017/746, ISO 13485:2016 + AMD 1:2021,
                ISO 14971:2019 + ISO/TR 24971:2020, ISO 14155:2020,
                ISO 10993 series (10993-1/3/4/5/6/7/10/12/13/14/
                15/16/17/18/23), ISO 11607-1:2019 + 11607-2:2019,
                ISO 11135:2014 + ISO 11137-1/2/3 + ISO 17665-1,
                IEC 62304:2006+A1:2015 (SW lifecycle),
                IEC 82304-1:2016 (health software), IEC 81001-5-1:2021
                (cyber), IEC 62366-1:2015 (usability), IEC 60601 series,
                IMDRF SaMD N10/N12/N23/N41/N47, FDA AI/ML SaMD Action
                Plan 2021, PCCP Draft Guidance 2023,
                FDA Premarket Cybersecurity Guidance 2023,
                FDA Postmarket Cybersecurity Guidance 2022,
                MDCG 2019-11/16 + 2020-1/5/6/7/8/10 + 2021-1/6/24 +
                2022-2/9/21, MDSAP
```

The Medical Device pack carries the strictest patient-impact discipline,
the deepest software lifecycle model (IEC 62304 Class C), post-market
surveillance feedback loop, and the most regulator-sensitive vigilance
windows (EU MDR 24h death / 2 days serious-public-health / 15 days
serious incident; US MDR 30 days). The pack scales from Class I (low
risk, self-declaration) through Class III (implantable; highest risk;
full design examination). SaMD sub-vertical adds IMDRF Class A–D and
PCCP governance for AI/ML change management.

---

## 1. Pack scope and class taxonomy

```
EU MDR / IVDR CLASS        SCOPE                        PACK FOCUS
────────────────────────────────────────────────────────────────────
Class I                     low risk; non-invasive       self-declaration;
                                                         technical file;
                                                         EC Declaration
Class IIa                   medium risk; short-term      NB sample audit;
                                                         EC Declaration;
                                                         clinical eval
Class IIb                   medium-high; longer-term     NB design dossier
                                                         review; clinical
                                                         eval + PMCF
Class III                   high risk; implantable /     full design
                            life-sustaining              examination by NB;
                                                         clinical evidence;
                                                         15-year retention
                                                         per Annex IX Rule 8
IVD Class A                 low individual / low public  manufacturer declaration
IVD Class B                 moderate individual / low    NB quality system
IVD Class C                 high individual / moderate   NB technical doc
                            public
IVD Class D                 high individual / high       NB technical doc +
                            public (e.g. blood screening) scrutiny procedure

US FDA CLASS
Class I                     general controls             mostly 510(k)-exempt
Class II                    special controls             510(k); De Novo
Class III                   PMA; extensive clinical      PMA + clinical studies

SaMD CATEGORY (IMDRF N12)
Category I                  non-serious; non-critical     light validation
Category II                 non-serious; critical OR      moderate
                            serious; non-critical
Category III                serious; critical             full; independent
                                                         review recommended
Category IV                 life-threatening / critical   maximum; TGA/FDA
                                                         Class III equivalent

SUB-VERTICALS
Active implantable           Class III heavy; AIMD Directive
                             in legacy; MDR Class III
SaMD (software as MD)        IEC 62304 + IMDRF + PCCP for AI/ML
SiMD (software in MD)        IEC 62304 + parent device risk file
Active diagnostic (IVD)      IVDR Class C/D; clinical performance
Sterile single-use           ISO 11607 packaging; ISO 11135/137/17665
                             sterilization validation
Combination product          21 CFR Part 4; primary mode determination;
(drug-device)                drug master file integration
Custom-made                  MDR Annex XIII; Statement from manufacturer;
                             no CE marking; per-patient traceability
Class III Implant            Annex VIII Rule 8; 15-year post-market
                             retention (in addition to standard MDR
                             retention floors)
```

---

## 2. Authoritative roots (pack-specific; ≥ 30)

```
AR-J4-001   Design History File (DHF)
            per device family / variant; container for all design
            control records from design inputs through transfer; per
            21 CFR 820.181 (QMSR) and ISO 13485 §7.3
            Schema: dhf_id, device_id, device_class, design_phase_current,
              design_inputs[], design_outputs[], design_reviews[],
              design_verifications[], design_validations[],
              design_transfer_record_id, risk_file_id, software_lifecycle_id,
              status (open/transferred/maintained/retired)

AR-J4-002   Device History Record (DHR)
            per device unit (or batch where class allows); assembly
            records; test results; acceptance records; date of
            manufacture; primary identification label; quantity
            Schema: dhr_id, device_id, unit_serial, batch_lot,
              manufacture_date, quantity, label_id, test_results[],
              acceptance_records[], release_date, udi_di, udi_pi,
              released_by, prrc_sign_off (EU MDR)

AR-J4-003   Device Master Record (DMR)
            per device family; master specifications, procedures,
            drawings, and software; the "recipe" for manufacturing
            Schema: dmr_id, device_id, revision, specifications[],
              drawings[], manufacturing_procedures[], quality_procedures[],
              installation_procedures[], servicing_procedures[],
              effective_date, change_history[]

AR-J4-004   UDI (Unique Device Identifier) Record
            per device DI (Device Identifier) × PI (Production
            Identifier); issuance, marking, submission to databases;
            per ISO/IEC 15459 + FDA 21 CFR Part 830
            Schema: udi_record_id, device_id, udi_di, udi_pi_elements
              (lot/serial/mfg_date/exp_date), issuing_agency (GS1/HIBCC/
              ICCBBA), label_format, gudid_submission_id, eudamed_srn

AR-J4-005   GUDID Submission (US) / EUDAMED Registration (EU)
            per device; mandatory at first market placement; per 21
            CFR 830 (FDA) and MDR Art 29 + Art 31 (EUDAMED)
            Schema: submission_id, device_id, authority (FDA/EU),
              submission_date, data_elements{}, status (pending/accepted/
              rejected), srn, udi_di, changes_submitted[]

AR-J4-006   Vigilance Report (US MDR / EU MIR / Periodic Summary)
            per serious incident / malfunction / near-miss; window
            governed by regulator class and severity
            Schema: vr_id, device_id, incident_date, report_type
              (US_MDR/EU_MIR/AU_MIRI/CA_MDR/etc), seriousness_class,
              incident_description, device_use_at_incident, initial_analysis,
              submitted_date, authority_reference, follow_up_reports[],
              trend_signal_id, closed_date

AR-J4-007   PSUR (Periodic Safety Update Report)
            per device; benefit-risk update per period; submitted
            to NB + authority for Class IIb / III; per MDR Art 86
            Schema: psur_id, device_id, period_start, period_end,
              pms_data_summary, safety_signals[], benefit_risk_conclusion,
              post_market_obligations_update, nb_submission_date,
              nb_response, revision

AR-J4-008   Post-Market Surveillance Plan (PMS Plan)
            per device; describes how PMS data is collected and used;
            per MDR Annex III and MDCG 2020-7
            Schema: pmsp_id, device_id, data_sources[], collection_methods[],
              analysis_approach, thresholds_for_action, pms_report_due,
              pmcf_link, revision

AR-J4-009   Post-Market Surveillance Report (PMS Report)
            per device per period; Class I / IIa per MDR Art 85;
            lower burden than PSUR; used by NB during surveillance
            Schema: pmsr_id, device_id, period, incidents_summary,
              complaint_trend, literature_review_ref, registry_data_ref,
              actions_taken, conclusions, revision

AR-J4-010   PMCF Plan and Evaluation Report
            Post-Market Clinical Follow-up per MDR Annex XIV Part B
            and MDCG 2020-7; systematic clinical data collection on
            placed devices
            Schema: pmcf_plan_id, device_id, objectives[], methods[],
              data_sources[], timeline; pmcf_report_id (linked),
              data_summary, clinical_conclusions, risk_file_update_ref

AR-J4-011   Risk Management File (ISO 14971:2019)
            per device; contains risk management plan + risk analysis +
            risk evaluation + risk control + residual risk evaluation +
            risk management review; living document through lifecycle
            Schema: rmf_id, device_id, risk_mgmt_plan_ref,
              hazards[{hazard_id, hazardous_situation, harm, p1, p2,
              severity, risk_level, controls[], residual_risk_level,
              acceptability}], benefit_risk_conclusion, review_date

AR-J4-012   Risk Management Plan
            per device; scope, responsibilities, risk acceptability
            criteria, methods; per ISO 14971 §4.4
            Schema: rmp_id, device_id, scope, intended_use, risk_acceptability
              policy_ref, methods[], responsible_roles[], review_cycle

AR-J4-013   Risk Management Report
            per device; final report summarizing risk management
            activities; confirms residual risks acceptable; per ISO
            14971 §9; sign-off BD-16
            Schema: rmr_id, device_id, rmf_ref, summary, unacceptable_risks[],
              residual_risk_verdict, sign_off, sign_off_date

AR-J4-014   Risk Acceptability Policy
            tenant-level; severity × probability matrix; acceptability
            regions (acceptable / ALARP / unacceptable); per ISO 14971
            §4.5; stored in tenant regulatory profile (I8 §3)
            Schema: rap_id, tenant_id, matrix_definition, acceptable_region,
              alarp_region, unacceptable_region, rationale, effective_date,
              revision, sign_off (BD-16 requires human)

AR-J4-015   IFU (Instructions for Use)
            per device × per language; EU MDR Art 10(11) requires
            all EU languages where placed; US FDA labeling requirements;
            revision controlled; linked to DHF and labeling master
            Schema: ifu_id, device_id, language, revision, text_content_ref,
              effective_date, regulatory_approval_ref, translations[]

AR-J4-016   Labelling Master
            per device; all label variants; format; regulatory
            statement content; linked to UDI; per FDA 21 CFR 801
            and MDR Annex I §23
            Schema: label_id, device_id, variants[{type, content, language,
              udi_visible, regulatory_statements[]}], effective_date,
              artwork_ref, revision

AR-J4-017   Clinical Evaluation Report (CER)
            per device; critical evaluation of clinical data supporting
            safety and performance; per MEDDEV 2.7.1 Rev 4 and MDCG
            2020-6; updated per PMS cycle; AI-21 drafting assist
            Schema: cer_id, device_id, revision, date, scope,
              clinical_data_sources[], literature_review_ref,
              clinical_investigation_refs[], appraisal_method,
              analysis_conclusions, clinical_evidence_sufficiency_conclusion,
              sign_off, nex_update_due

AR-J4-018   Clinical Investigation Plan (CIP)
            per clinical study; per ISO 14155:2020; design, endpoints,
            statistical plan, ethics approval; per MDR Art 62–82
            Schema: cip_id, study_id, device_id, phase, design,
              primary_endpoints[], secondary_endpoints[], sample_size,
              statistical_plan, ethics_committee_ref, competent_authority_ref,
              eudamed_cin, status

AR-J4-019   Software Configuration Item (SCI) — IEC 62304
            per software item × per software class (A/B/C); all
            lifecycle artifacts per IEC 62304 requirements
            Schema: sci_id, software_item_id, class (A/B/C), planning_docs[],
              requirements_specs[], architecture_docs[], detailed_designs[],
              unit_test_evidence[], integration_test_evidence[],
              system_test_evidence[], anomaly_records[], configuration_baseline,
              release_record

AR-J4-020   SOUP / OTSS Register (per IEC 62304 §8)
            per device; all software of unknown provenance and
            off-the-shelf software components; hazard analysis per item;
            anomaly tracking; CVE monitoring
            Schema: soup_id, device_id, items[{item_id, vendor, version,
              acquisition_method, hazard_analysis_ref, anomalies[],
              cve_monitoring_status, last_assessment_date, patch_decision}]

AR-J4-021   SBOM (Software Bill of Materials)
            per software release; CycloneDX format; linked to SOUP
            register; FDA 524B submission for Class II/III devices;
            hash-verified
            Schema: sbom_id, device_id, release_version, format
              (CycloneDX_1.5+), components[], vulnerabilities_at_release[],
              hash, submission_ref, delivered_to_tenant

AR-J4-022   Cyber Risk Management Plan (FDA + IEC 81001-5-1)
            per device; covers premarket and postmarket cyber; threat
            model; security controls; CVD process; SBOM strategy;
            per FDA Premarket Cyber 2023 and IEC 81001-5-1
            Schema: crmp_id, device_id, threat_model_ref, security_controls[],
              sbom_strategy, cvd_process_ref, monitoring_strategy,
              patch_sla (per I7 §6.3), revision

AR-J4-023   Verification and Validation Evidence Package
            per requirement or per validation protocol; links
            requirements to test cases to results; traceability matrix
            Schema: vv_id, device_id, protocol_type (IQ/OQ/PQ/SV/PV),
              requirements_covered[], test_cases[], execution_results[
              {test_case_id, result, pass_fail, deviation_if_fail}],
              overall_conclusion, sign_off, date

AR-J4-024   Design Input / Design Output Records
            per design phase; formal inputs (requirements) and
            outputs (specifications, drawings) linked to verification;
            per 21 CFR 820.30 and ISO 13485 §7.3.3/7.3.4
            Schema: di_record_id, design_phase, inputs[{id, requirement,
              source, traceability_to_output}], outputs[{id, specification,
              trace_to_input, verification_ref}]

AR-J4-025   Design Review Record
            per stage; attendance; agenda; findings; action items;
            per ISO 13485 §7.3.5 and 21 CFR 820.30(e)
            Schema: dr_id, device_id, phase, date, attendees[], agenda,
              findings[], action_items[], quorum_met, approved

AR-J4-026   Process Validation / PPQ Record
            per manufacturing process requiring validation; IQ / OQ /
            PQ execution; Process Performance Qualification; per ISO
            13485 §7.5.6 and 21 CFR 820.70
            Schema: pv_id, process_id, device_id, protocol_ref,
              iq_evidence_id, oq_evidence_id, pq_evidence_id,
              conclusion, revalidation_trigger, revalidation_due

AR-J4-027   Sterilization Validation Record
            per sterilization process × per product per applicable
            standard; EO per ISO 11135; radiation per ISO 11137;
            steam per ISO 17665; re-validation cycle
            Schema: sv_id, process_type (EO/gamma/ebeam/steam),
              device_id, standard_applied, bioburden_data[], sal_target,
              validation_studies[], dose_setting_study, routine_dose_audit,
              revalidation_date

AR-J4-028   Packaging Validation Record
            per packaging system per ISO 11607-1:2019 +
            11607-2:2019; seal integrity; accelerated aging; transport
            simulation per ASTM D4169; sterile barrier performance
            Schema: pv_pack_id, packaging_system_id, device_id,
              design_and_development_tests[], integrity_tests[],
              accelerated_aging_results, shelf_life_claim,
              transport_simulation_results, conclusion, revalidation_due

AR-J4-029   Biocompatibility Evaluation Record
            per ISO 10993-1:2018 risk-based approach; biocompatibility
            plan; chemical characterization; biological testing
            where required; risk assessment per contact duration
            Schema: bio_id, device_id, contact_type (direct/indirect),
              contact_duration (limited/prolonged/permanent),
              plan_ref, chemical_characterization_ref, tests_conducted[
              {test_type, standard, result}], risk_assessment_conclusion,
              sign_off

AR-J4-030   Usability Engineering File (UEF)
            per IEC 62366-1:2015; user research; use specification;
            use-related risk analysis; summative usability evaluation;
            per FDA HFE guidance
            Schema: uef_id, device_id, user_groups[], use_environments[],
              use_specification_ref, use_related_risks[], formative_studies[],
              summative_evaluation{study_design, participants, critical_tasks[
              {task, pass_rate, critical_errors}], conclusion}, sign_off

AR-J4-031   FSCA (Field Safety Corrective Action) Record
            per action affecting placed devices; planning; notification;
            execution; effectiveness evaluation; per MDR Art 10(12)
            Schema: fsca_id, device_id, trigger, affected_udi_dis[],
              affected_scope, action_description, fsn_ref, execution_plan,
              effectiveness_criteria, effectiveness_result, submitted_to
              {authority, date, reference}[], closed_date

AR-J4-032   FSN (Field Safety Notice)
            per FSCA; communication to users / patients; per MDR
            Annex IX Rule 8 and MDCG 2022-21 on FSN content
            Schema: fsn_id, fsca_id, issue_date, target_audience,
              countries_distributed[], fsn_text_ref, acknowledgement_records[],
              translation_refs[]

AR-J4-033   PRRC Record (Person Responsible for Regulatory Compliance)
            per tenant; MDR Art 15 requires PRRC for manufacturers,
            authorized representatives, importers; PRRC identity,
            qualifications, scope, sign-off log
            Schema: prrc_id, tenant_id, person_id, qualifications_ref,
              appointment_date, scope, decisions_signed[{decision_type,
              date, outcome}], annual_review_date

AR-J4-034   PCCP Record (Predetermined Change Control Plan)
            per AI/ML SaMD where applicable; describes anticipated
            changes; performance monitoring protocol; methodology to
            assess changes; per FDA PCCP Draft Guidance 2023 and
            IMDRF N67 (in development); per L3 §6
            Schema: pccp_id, device_id, samd_category, description_of_changes[
              {change_type, rationale, impact_on_performance}],
              protocol_for_change_eval{performance_metrics[], monitoring_plan,
              triggers_for_out_of_envelope}, methodology_for_assessment,
              safeguards[], submission_date, fda_accepted

AR-J4-035   Notified Body Engagement Record
            per NB × per device × per cycle; application; technical
            file submission; audit findings; certificate; certificate
            renewal
            Schema: nb_engagement_id, device_id, nb_id, cycle_start,
              certificate_type, audit_date, findings[], responses[],
              certificate_number, effective_date, expiry_date, renewal_due
```

---

## 3. State machines (pack-specific; ≥ 8 SMs)

### SM-DHF (Design History File lifecycle)

```
States: initiated → design-planning → design-input-defined →
        design-output-generated → design-review-conducted →
        design-verified → design-validated → design-transfer →
        post-market-maintained → retired

Transitions governed by ISO 13485 §7.3 stage gates; each gate
requires documented evidence + design review record (AR-J4-025)
Hard couplings:
  SM-7 (doc effectivity): DHF documents versioned per design phase
  Risk file (AR-J4-011): updated at each stage
  V&V evidence (AR-J4-023): linked per stage
  BD-13 (PRRC sign): required at design transfer and at major changes
```

### SM-DHR (Device History Record per unit/batch)

```
States: opened (at start of manufacturing order) →
        components-kitted → assembly-completed →
        in-process-test-passed → final-test-passed →
        sterilization-released (where applicable) →
        packaged-and-labeled → release-gate →
        released-for-distribution → in-service → retired

Release gate: all acceptance records complete; UDI applied;
  PRRC sign where required (EU MDR); BD-14 enforced for
  vigilance-linked releases
```

### SM-VIGILANCE

```
States: incident-awareness → triage → serious-assessment →
        reportability-determination (BD-15 applies) →
        report-submitted → follow-up-submitted →
        trend-signal-evaluation → PSO-review → closed

Window per authority and severity:
  EU MDR death / life-threat:      24h initial report
  EU MDR serious public health:    2 days
  EU MDR serious incident:         15 days
  US MDR death / serious injury:   30 days
  TGA (Australia):                 30 days for serious; 7 days death
  Health Canada:                   10 days serious; immediate for
                                   death or imminent life-threat
  Brazilian ANVISA:                per IN 68/2022

AI-19 advisory: suggests reportability classification; advisory only;
  BD-15 requires human PRRC or Med Device Lead co-sign on
  reportability determination
Hard couplings: H1 §3 windows (authoritative); H8 CAPA for systemic
```

### SM-PSUR (Periodic Safety Update Report)

```
States: period-start → data-collection → trending → analysis →
        benefit-risk-update → ai-draft (AI-21 advisory) →
        human-review → finalized → nb-submitted →
        nb-reviewed → accepted-with-conditions | accepted

Cadence: Class III and IVD Class D: annually; Class IIb / IVD Class C:
  annually for first 2 years, then every 2 years; Class IIa / IVD Class B:
  every 2 years; Class I / IVD Class A: PMS Report (lighter)
BD-13 (PRRC sign-off) required at 'finalized' state
```

### SM-CYBER (medical device cybersecurity)

```
States: threat-model-conducted → security-controls-designed →
        sbom-generated → submitted-premarket (if applicable) →
        in-service-monitoring → vulnerability-detected →
        vulnerability-assessed → patch-planned → patch-released →
        cvd-coordinated (if external report) → postmarket-report
        (if CISA/FDA threshold) → closed

Hard couplings: SOUP register (AR-J4-020); SBOM (AR-J4-021);
  I7 §6 patch SLA; CVD process per I7 §8.4; FDA Postmarket Cyber
  reporting (5-day uncontrolled / 30-day controlled per FDA guidance)
```

### SM-SAMD (IEC 62304 software lifecycle)

```
States per software class:
  Class A: planning → maintenance (simplified; no hazardous situation)
  Class B: planning → requirements → architecture → unit-impl →
           integration → system-test → release → maintenance
  Class C: planning → requirements → architecture → detailed-design →
           unit-test → integration-test → system-test → release →
           maintenance (with full IEC 62304 objectives for each phase;
           structural coverage at unit level)

PCCP integration (where AI/ML SaMD): PCCP record (AR-J4-034) governs
  post-market algorithm updates without full 510(k)/PMA supplement
  within the PCCP envelope; changes outside PCCP envelope require
  new submission
```

### SM-FSCA (Field Safety Corrective Action)

```
States: identification → risk-assessment → action-plan →
        national-authority-notification (where required per H1 §3) →
        fsn-issued → action-execution → effectiveness-monitoring →
        effectiveness-confirmed | extended → closed

FSN timing: before or at the time of the FSCA unless urgent safety
  measure waiver granted by competent authority per MDR Art 10(12)
Hard couplings: FSCA is the trigger for recall (D12 + SM-11);
  BD-13 (PRRC sign) on FSN and effectiveness declaration
```

### SM-CLIN (Clinical Evaluation lifecycle)

```
States: plan-defined → literature-search-conducted →
        clinical-investigation-completed (if applicable) →
        data-appraisal → cer-drafted (AI-21 assist) →
        internal-review → prrc-reviewed → finalized →
        updated (cycle: per PMCF data influx + per significant
        PMS signal)

Triggers for update: new PMS signal exceeding threshold; new
  clinical data from literature; PMCF report completion;
  FSCA outcomes; change in product version or indication
Hard couplings: PMS + PMCF data feeds; risk file update
```

---

## 4. D1–D14 per-pack workflow overlays

```
D1 Order to Cash          UDI applied at labeling (DI + PI);
                          GUDID / EUDAMED submission verified
                          before first market placement; economic
                          operator records (AR / importer /
                          distributor) completed per MDR Art 13-16

D2 Procurement to Pay     Biocompatible material qualification
                          per ISO 10993 for materials in contact
                          with patient; SOUP verification for
                          purchased software components; single-use
                          packaging per ISO 11607

D3 Plan to Produce        DHF effective; DMR approved; UDI
                          plan in place; validated sterilization
                          process where applicable; cleanroom
                          environmental control (where applicable)

D4 Receive to Inspect     Incoming inspection per ISO 13485 §8.2.4;
                          materials per approved supplier list;
                          SOUP items per SOUP register; biocompat-
                          ible material cert verification

D5 Inspect to Disposition Segregate non-conforming per ISO 13485
                          §8.7; NC disposition per risk (scrap /
                          rework / use-as-is with justification);
                          NC with safety implications feeds DHF
                          impact analysis per ISO 14971

D6 NC to CAPA             CAPA per H8; post-market design feedback
                          loop from complaint / NC / PMS signal to
                          risk file (ISO 14971 §11 post-production);
                          systemic NC may trigger DHF change request
                          per H7 Class A

D7 Document to Release    DHF / DMR / IFU / labelling master
                          effectivity per SM-7; label artwork
                          update requires regulatory review for
                          any claim change; MDR Art 10(13) requires
                          keeping all versions for lifetime + 15 years

D8 Train to Qualify       Device-specific operator training;
                          cleanroom gowning and behavior where
                          applicable; SaMD development team IEC
                          62304 training; usability testing
                          participant qualification

D9 Maintain to Restore    Servicing of in-field devices per DMR
                          service procedures; calibration of test
                          equipment on cycle per ISO 13485 §7.6;
                          service record per device unit

D10 Batch to Release       DHR completion gate (all acceptance
                          records, test results, UDI applied, label
                          applied); PRRC sign-off for EU MDR;
                          Qualified Person (EU) for sterile / drug-
                          device combination; sterilization release
                          certificate where applicable

D11 Release to Trace       UDI traceability full (DI + PI); GUDID /
                          EUDAMED record submitted; lot → device unit
                          for Class III; implant tracking per MDR
                          Annex IX Rule 8; AIMD-specific traceability

D12 Complaint to Recall    Customer complaint → triage → vigilance
                          assessment (AI-19 advisory; BD-15 for
                          final decision) → FSCA if corrective
                          action required; FSN notification;
                          recall classification per authority

D13 Audit to Remediate     NB surveillance on registration cycle
                          (typically 12-month unannounced + 5-year
                          renewal); FDA inspection (routine + follow-
                          up); MDSAP audit (replaces individual
                          authority audits in AU/BR/CA/JP/US);
                          ISO 13485 certification surveillance

D14 Validate to Qualify    Special process validation (sterilization
                          / packaging / cleanroom); IEC 62304 software
                          lifecycle; clinical validation (ISO 14155);
                          usability engineering (IEC 62366);
                          biocompatibility (ISO 10993)
```

---

## 5. Banned decisions (per L1)

```
BD-13  PRRC SIGN-OFF (EU MDR ART 15)
       AI cannot autonomously sign off on any PRRC-required decision
       including: batch release for EU market, reportability decisions,
       FSCA authorization, PSUR finalization, risk acceptability
       policy approval. PRRC must be a human; identity recorded
       per AR-J4-033; BD-13 quorum enforced in UI.
       Rationale: MDR Art 15 mandates PRRC as a natural person
       responsible; AI acting as PRRC would be a regulatory
       violation and creates liability.

BD-14  BATCH RELEASE FOR EU MARKET (WHERE QP/PRRC REQUIRED)
       AI cannot release a batch of a Class IIb / Class III device
       to the EU market. Release requires PRRC or equivalent
       Qualified Person co-sign.
       Rationale: EU MDR Art 10(9) requires verification of
       compliance; significant deviation caught at release protects
       patient safety.
       Evidence: DHR (AR-J4-002) release state requires PRRC
       signature before state transition.

BD-15  VIGILANCE REPORTABILITY DETERMINATION
       AI-19 may provide an advisory classification of seriousness
       and reportability, but the final determination of whether
       an event is reportable and to which authority is a human
       decision. Requires PRRC + Med Device Lead co-sign.
       Rationale: missed vigilance report = regulatory offense;
       false reportability = regulatory burden and potential
       market impact. Human accountability is mandatory.
       Evidence: Vigilance Report (AR-J4-006) reportability_determination
       field requires dual human co-sign before submission API call.

BD-16  RISK ACCEPTABILITY DETERMINATION
       AI may assist risk analysis by flagging probable harms and
       estimating probabilities, but the final determination that
       a residual risk is acceptable per ISO 14971 §9 requires
       Med Device Lead + PRRC co-sign on the Risk Management Report
       (AR-J4-013) and Risk Acceptability Policy (AR-J4-014).
       Rationale: incorrect risk acceptability determination could
       result in an unsafe device on market; ISO 14971 §9 requires
       formal human sign-off on the overall residual risk assessment.
       Evidence: AR-J4-013 and AR-J4-014 both require co-signed
       approval records before state transitions.
```

---

## 6. PCCP envelope governance for AI/ML SaMD (per L3 §6)

```
PURPOSE
  Predetermined Change Control Plan allows manufacturer to pre-specify
  categories of algorithm changes that do not require a new FDA
  510(k) / PMA supplement provided they stay within the PCCP envelope.
  Per FDA PCCP Draft Guidance 2023 and IMDRF N67 (SaMD lifecycle).

PCCP RECORD (AR-J4-034) COMPONENTS
  Description of Modifications: each anticipated change type with
    rationale, scope limitation, and performance impact statement
  Modification Protocol: for each change type — performance metrics
    to monitor, thresholds triggering "out of envelope" determination,
    evaluation approach (statistical + clinical + safety)
  Methodology for Assessment: statistical methods, validation approach,
    dataset requirements, independence requirements for evaluation
  Safeguards: fail-safe behaviors; human-in-loop requirements per BD-list;
    post-deployment monitoring; accelerated rollback capability

HESEM AI GOVERNANCE OF PCCP
  L3 ramp protocol governs shadow → advisory → active for SaMD AI
  features within PCCP envelope
  Changes within PCCP envelope: L3 §4 change-type assessment;
    performance metric check; if within envelope, deploy with
    PCCP change record (evidence per AR-J4-034)
  Changes outside PCCP envelope: full regulatory submission required;
    HESEM notifies tenant; deployment blocked until submission accepted
  Monitoring: per I2 observability; SaMD performance KPIs tracked
    in real-time; envelope breach detection triggers automated block
    and CAPA per H8

PCCP AI FEATURE APPLICABILITY
  PCCP applies to AI-19 vigilance model updates (Category III SaMD)
  PCCP applies to AI-21 PSUR drafting model updates (Category II)
  Changes to AI-26 sentiment model within advisory scope: minor change
  Any change that modifies clinical recommendations outputs from
    advisory to autonomous: outside all PCCP envelopes; BD-list applies
```

---

## 7. APIs (pack-specific)

```
API                              MECHANISM      DESCRIPTION
────────────────────────────────────────────────────────────────────
DHF lifecycle API                E3 + E7        stage-by-stage DHF;
                                                design review scheduling;
                                                sign-off workflow
DHR API                          E3 + E5 + E7   unit assembly record;
                                                PRRC sign-off (BD-14)
DMR API                          E3 + E7        master record management;
                                                revision control
UDI generator                    E3 + E13       DI + PI generation per
                                                issuing agency; label
                                                format rendering
GUDID submission API             E15 (FDA)      submit / update device
                                                data; status tracking
EUDAMED registration API         E15 (EU)       SRN management; device
                                                registration; UDI-DI
                                                management
Vigilance reportability API      E3 + E15       intake; AI-19 advisory;
                                                BD-15 quorum; submission
                                                per authority + window
PSUR generation API              E13 + E5       period data aggregation;
                                                AI-21 drafting; BD-13
                                                sign-off workflow
Risk file engine API             E3 + E5        hazard/risk CRUD; ISO
                                                14971 matrix; residual
                                                risk calculation; BD-16
                                                gate
Risk control verification API    E3             evidence traceability
                                                from control to test
Clinical evaluation API          E3 + E5        CER lifecycle; literature
                                                feed; AI-21 draft assist;
                                                sign-off workflow
PMS data ingestion               E15            multi-source ingestion:
                                                complaint, literature,
                                                social, registry, PMCF;
                                                feeds risk file + CER
PMCF API                         E3             plan + report; data
                                                collection tracking;
                                                CER linkage
IEC 62304 SCI lifecycle API      E3             class A/B/C lifecycle;
                                                anomaly tracking;
                                                structural coverage
                                                evidence linkage
SOUP register API                E3 + E15       SOUP item CRUD; CVE
                                                monitoring; hazard
                                                analysis per item;
                                                CVE alert feed
SBOM management                  E3 + E15       CycloneDX SBOM; FDA
                                                524B submission; hash
                                                verification; SOUP link
Cyber CVD lifecycle API          E3 + E15       CVD intake; assessment;
                                                patch release; FDA/CISA
                                                reporting per window
FSCA / FSN lifecycle API         E3 + E15       FSCA plan; FSN drafting;
                                                authority notification;
                                                effectiveness tracking;
                                                BD-13 gate
NB engagement API                E15            submission; audit tracking;
                                                finding response; cert
                                                renewal
PRRC decisions API               E3 + E7        BD-13/14/15/16 quorum;
                                                decision log per PRRC
PCCP change management API       E3             PCCP record CRUD;
                                                change-type assessment;
                                                in/out-of-envelope
                                                determination; L3 ramp link
Process validation API           E3 + E13       IQ/OQ/PQ protocol; LRO
                                                for long-running validation
Sterilization validation API     E3             per standard; bioburden +
                                                SAL + dose audit
Packaging validation API         E3             ISO 11607 test records;
                                                aging; transport simulation
Biocompatibility API             E3             ISO 10993 plan + test
                                                records + risk conclusion
Usability engineering API        E3             UEF; formative + summative
                                                study records; IEC 62366
                                                trace
AI-19 vigilance indicator        AI feature     reportability advisory
                                                per incident; advisory only
AI-21 PSUR / CER drafting        AI feature     draft generation from PMS
assist                                          data; advisory only
AI-26 complaint sentiment        AI feature     extract safety signals from
                                                complaint text; advisory
```

---

## 8. UI surfaces (≥ 12)

```
DHF Workspace + AR Shell          stage-by-stage progress; design
                                  input/output linkage; risk file
                                  traceability panel; design review
                                  scheduling; BD-13 quorum indicator

DHR Workspace                      per-unit assembly log; acceptance
                                  test results; UDI capture; PRRC
                                  sign-off step (BD-14); release
                                  gate checklist

DMR Workspace                      master record per device family;
                                  specification and procedure links;
                                  revision comparison view

UDI Generation Workspace           issuing agency selection; DI +
                                  PI elements; label format preview;
                                  GUDID / EUDAMED submission status

Vigilance Report Workspace         incident intake form; AI-19
                                  advisory panel; BD-15 quorum step;
                                  authority/window selector; submission
                                  status; follow-up tracker

PSUR Workspace                      period selector; PMS data summary;
                                  benefit-risk editor; AI-21 draft
                                  assist panel; BD-13 sign-off;
                                  NB submission tracker

Risk File Workspace                 ISO 14971 severity × probability
                                  matrix; hazard list; control linkage;
                                  residual risk evaluation; BD-16
                                  acceptability sign; residual risk
                                  report

PMS + PMCF Workspace               data source dashboard; trend charts;
                                  signal threshold alerts; feedback-
                                  to-risk-file link; PMCF plan/report
                                  status

Clinical Evaluation Workspace       CER lifecycle panel; literature
                                  search log; AI-21 CER draft panel;
                                  clinical investigation links;
                                  MDCG checklist

IEC 62304 / SaMD Workspace          class A/B/C lifecycle stages;
                                  objective coverage tracker; anomaly
                                  records; PCCP envelope status
                                  (where applicable)

Cyber Workspace                      SBOM viewer; SOUP register;
                                  CVE monitoring dashboard; CVD
                                  lifecycle; patch SLA tracker;
                                  FDA reporting status

FSCA / FSN Workspace                 FSCA action plan; affected fleet
                                  scope; FSN drafting; authority
                                  notification status; effectiveness
                                  monitoring

NB Engagement Workspace              per cycle; technical file
                                  submission tracker; findings +
                                  response log; certificate status;
                                  renewal timeline

Med Device Audit Pack Wizard         FDA / NB inspection-ready bundle;
                                  MDSAP if applicable; 30-section
                                  completeness check

PRRC Console                          per-tenant PRRC; BD-13/14/15/16
                                  decision log; qualification record;
                                  decision frequency dashboard

Usability Engineering Workspace        UEF builder; user group profiles;
                                  use-related risk table; formative
                                  + summative study records; IEC
                                  62366 checklist

PCCP Dashboard                         envelope definition; in-progress
                                  changes; in/out-of-envelope
                                  determination; ramp status per
                                  AI feature; performance metric
                                  monitoring
```

---

## 9. Pack discipline

```
ITEM                              DETAIL
────────────────────────────────────────────────────────────────────
ISO 14971:2019 risk acceptability  Tenant-level risk acceptability
policy                             policy in I8 §3 regulatory profile;
                                  matrix applied uniformly; BD-16
                                  enforces human sign-off on policy

PRRC sign-off (MDR Art 15)        Mandatory for all regulated decisions
                                  per BD-13/14/15/16; PRRC must be a
                                  natural person with qualifications
                                  per MDR Art 15(3); PRRC identity
                                  verified per I7 §3.1 (IAL2)

21 CFR Part 11 e-signature         On all regulated transitions in
                                  electronic records; meaning of
                                  signature captured; timestamp;
                                  non-repudiation per H4 audit chain

EU MDR vigilance windows           24h death / life-threat; 2 days
                                  serious-public-health; 15 days
                                  serious incident; AI-19 advisory
                                  accelerates intake triage; BD-15
                                  for final determination

US MDR 30-day window               MDR per 21 CFR 803; 5-day for
                                  malfunction likely to cause serious
                                  injury if recurs; 30-day for death /
                                  serious injury; AI-19 advisory only

UDI at first market placement      GUDID (US FDA) / EUDAMED (EU);
                                  mandatory for all devices going to
                                  market; HESEM blocks distribution
                                  workflow if UDI not registered

PSUR cadence per risk class        Per MDR Art 86: Class III + IVD
                                  Class D: annually; Class IIb / IVD
                                  Class C: annually for 2 years then
                                  every 2 years; Class IIa / IVD Class B:
                                  every 2 years; Class I: PMS Report

PMS feedback loop                  Mandatory demonstrable feedback
                                  from PMS data to risk file; from
                                  risk file to design changes;
                                  HESEM tracks loop per AR-J4-011 §11

FDA / IEC 81001-5-1 cyber          Premarket SBOM + threat model
                                  submission; postmarket CVE monitoring;
                                  CVD per FDA channels; patch SLA per
                                  I7 §6.3

Class III implant 15-yr retention  Annex IX Rule 8; HESEM H5 retention
                                  floor enforced; cannot be shortened
                                  by tenant configuration

SaMD IMDRF risk category          Category A–D drives validation
                                  depth (H2), cyber tier, PCCP
                                  applicability, AI/ML governance

PCCP governance                    AR-J4-034 maintained; in/out-of-
                                  envelope monitoring active; changes
                                  outside envelope blocked until
                                  new regulatory submission accepted

Sterilization revalidation cycle   Per applicable standard; SAL 10⁻⁶;
                                  routine dose audit per ISO 11137-2;
                                  process change triggers revalidation

Packaging validation per           Per ISO 11607-1/2; accelerated aging
ISO 11607                          per ASTM F1980; transport simulation
                                  per ASTM D4169; shelf life claim
                                  validated

Biocompatibility per ISO 10993     Risk-based approach per 10993-1;
                                  chemical characterization preferred
                                  over biological testing where
                                  possible; ISO 10993-17 (toxicological
                                  risk) for extracted substances

Usability per IEC 62366            Summative usability evaluation
                                  required for critical tasks; human
                                  factors report submitted with FDA
                                  510(k) / PMA

NB engagement on cert cycle        Typically 5-year certification cycle
                                  for Class III; 12-month unannounced
                                  audit within cycle; findings tracked
                                  in HESEM per AR-J4-035

Economic operators (AR / Importer  Per MDR Art 11-16; EU Authorized
/ Distributor)                     Representative if manufacturer
                                  outside EU; records per
                                  AR-J4-033 type structure
```

---

## 10. Pack KPIs

```
KPI                                   TARGET
─────────────────────────────────────────────────────────────────────
Vigilance reporting SLA adherence      100% within window per authority
PSUR / PMS Report cycle adherence      100% on time per class cadence
DHF / DMR maintenance currency         all active devices maintained
                                       with no overdue reviews
UDI submission completeness            100% at first market placement
PMS data source coverage               ≥ 4 sources active per device
PMCF / PMPF data sufficiency           per NB assessment; no gaps
                                       flagged in CER
Cyber CVE time-to-patch               per I7 §6.3 SLA; 100% Critical
                                       within 7 days
SBOM currency                          updated within 30 days of any
                                       component version change
FSCA effectiveness confirmation        100% within agreed timeline
NB / MDSAP audit major findings        0 major non-conformances;
                                       minors tracked and closed
Class III implant 15-yr retention      100% compliance; monitored per H5
Sterilization revalidation adherence   100% on cycle; no overdue
Packaging revalidation adherence       100% on cycle
Risk file currency (post-market loop)  updated within 30 days of any
                                       significant PMS signal
Customer complaint safety signal       ≤ 2 weeks from complaint to
detection time                         safety assessment completion
AI-19 advisory precision / recall      tracked per confirmed reportable
```

---

## 11. Audit pack contents (MD-specific; ≥ 30 sections)

```
Section                                    Evidence Class
──────────────────────────────────────────────────────────────
01  DHF per active device family (sample)                          EC-14
02  DHR per device unit (inspector sample selection)               EC-14
03  DMR per device family                                          EC-14
04  Risk Management File per device (ISO 14971)                    EC-14
05  Risk Acceptability Policy (tenant-level)                       EC-14
06  V&V evidence per process / special process                     EC-1
07  Sterilization validation (EO / radiation / steam; as applicable) EC-1
08  Packaging validation per ISO 11607                             EC-1
09  Biocompatibility evaluation per ISO 10993                      EC-14
10  Usability engineering file per IEC 62366                       EC-14
11  Vigilance report log + submitted reports + follow-ups          EC-14
12  PSUR per high-risk device (last 2 cycles)                      EC-14
13  PMS Plan + PMS Reports per active device                       EC-14
14  PMCF Plan + Evaluation Report (EU MDR Class IIb/III)           EC-14
15  UDI submission records (GUDID / EUDAMED)                       EC-14
16  NB audit records + findings + responses (last 2 cycles)        EC-31
17  Internal audit records per ISO 13485 (last 2 audit cycles)     EC-31
18  CAPA log (last 36 months)                                      EC-6
19  Training records (device-specific)                             EC-14
20  CER per active device (current + version history)              EC-14
21  IEC 62304 SCI lifecycle data (software-heavy)                  EC-14
22  SOUP register + hazard analysis per item                       EC-14
23  SBOM per release + FDA 524B submission evidence                EC-33
24  Cyber posture: threat model + CVD lifecycle + patch records    EC-14
25  FSCA + FSN log (last 5 years)                                  EC-14
26  PRRC decision log per BD-13/14/15/16                           EC-31
27  Authorized Representative / Importer / Distributor records     EC-14
28  MDSAP audit certificate + findings (where applicable)          EC-1
29  PCCP record per AI/ML SaMD (where applicable)                  EC-14
30  Class III implant 15-year retention attestation (Annex IX R8)  EC-14
31  Clinical investigation records per active / completed studies  EC-14
32  Economic operator declarations (EU MDR)                        EC-14
```

---

## 12. Failure modes

```
FM1   Vigilance reporting window missed
      Root cause: intake triage delayed; AI-19 false-negative;
        BD-15 approval delayed
      Recovery: SEV-1; H1 §3 notification; regulator awareness;
        H8 systemic CAPA on intake → submission pipeline and
        BD-15 approval SLA

FM2   PSUR submission late to NB
      Root cause: data aggregation failed; BD-13 PRRC absent;
        period miscalculated
      Recovery: NB engagement; certification at risk; H8 CAPA +
        customer notice

FM3   UDI not registered before first market placement
      Root cause: D11 distribution workflow gate not checked;
        GUDID/EUDAMED submission failed silently
      Recovery: distribution hold; back-fill submission; H8 systemic
        CAPA on GUDID/EUDAMED submission gate

FM4   PMS data not fed into risk file within cycle
      Root cause: PMS → risk file feedback automation gap;
        ownership between PMS lead and risk file owner unclear
      Recovery: H6 periodic review surfaces gap; regulatory finding
        risk; H8 CAPA on feedback loop ownership

FM5   SaMD change outside PCCP envelope deployed without submission
      Root cause: PCCP envelope boundary not clearly defined;
        engineering team unaware of PCCP scope
      Recovery: immediate rollback of non-compliant change; FDA
        notification if applicable; H8 systemic CAPA on PCCP
        change governance; PCCP review

FM6   Class III implant retention shorter than Annex IX Rule 8
      Root cause: H5 floor not enforced; tenant requested shorter
        retention; retention category mis-assigned
      Recovery: H5 retention floor override; H7 governance; SEV-1
        if any records at risk; retroactive recovery where possible

FM7   PRRC signature absent on vigilance or FSCA
      Root cause: BD-13/15 gate bypassed; PRRC account inactive;
        UI bypass
      Recovery: BD-enforcement strengthened; PRRC account reviewed;
        H8 systemic CAPA; submission blocked and resent with proper
        sign-off

FM8   AI-19 false-negative on serious incident (missed reportable)
      Root cause: model drift; training data coverage gap;
        new adverse event pattern not in model
      Recovery: L4 boundary; SEV-2+ depending on impact; AI-19
        advisory feature suspended pending investigation; H8 CAPA
        on AI feature monitoring and retraining; model retrained
        and re-validated before re-enable

FM9   Sterilization revalidation overdue
      Root cause: revalidation calendar not tracked; supplier
        process change not detected
      Recovery: production blocked; expedited revalidation;
        customer notification; H8 CAPA on sterilization
        governance cycle

FM10  IEC 62304 SOUP register stale (CVE monitoring lapsed)
      Root cause: SOUP register not linked to CVE feed; monitoring
        automation failed; periodic review skipped
      Recovery: cyber posture review; per H6 periodic review;
        H8 CAPA on SOUP monitoring automation; retroactive CVE
        sweep conducted
```

---

## 13. Cross-references

- H1 §2.2 — Med Device regulatory inventory (US/EU/AU/BR/CA/JP)
- H2 — validation lifecycle (sterilization / packaging / software
         per IEC 62304; special processes)
- H4 — DHF / DHR / vigilance / PSUR / FSCA evidence classes
- H5 — Class III 15-year retention floor; WORM enforcement
- H8 — CAPA fed by vigilance, complaint, NB audit findings
- H9 — ISO 14971 as risk framework; risk acceptability policy
- L1 — banned decisions BD-13..BD-16
- L2 — AI feature overlay (AI-19 vigilance, AI-21 PSUR/CER draft,
         AI-26 complaint sentiment)
- L3 §6 — PCCP governance for AI/ML SaMD
- L4 — red-team for vigilance reportability AI boundary
- D12 — complaint to FSCA / recall workflow
- D14 — validation per IEC 62304 + ISO 11607 + ISO 11135/137/17665
- E15.10 — GUDID / EUDAMED integration
- I7 §10.2 — MD cyber posture (FDA Premarket / IEC 81001-5-1)
- I7 §6.4 — CVD evidence per IEC 62304 SOUP
- I8 §3 — economic operators; multi-region regulatory profile
- M3 — root catalog (AR-J4-001..AR-J4-035)
- M5 — MD-related SLOs
- M6 — MD risks
- M9 — cross-reference index

---

## 14. Decision phrase

```
J4_MEDICAL_DEVICE_V10_LOCKED
NEXT: J5_FOOD.md
```
