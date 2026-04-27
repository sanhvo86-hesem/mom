# J3 — Aerospace Vertical Pack

```
pack_id:        Aerospace
owner_role:     Aerospace Lead with Compliance Lead
wave_target:    W10 (preview); W11 GA
sources:        AS9100D:2016 / AS9101F / AS9102B+C / AS9110D:2016 /
                AS9120B:2016 / AS9145:2016 / AS13100, AS5553B /
                AS6174A, DFARS 252.204-7012, NIST SP 800-171 r2,
                CMMC 2.0 (Level 2 + Level 3), ITAR 22 CFR Parts
                120–130, EAR 15 CFR Parts 730–774, 14 CFR Parts 21 /
                25 / 33 / 43 / 145, AC 21-9, EASA Part 21G/J + 145,
                DO-178C:2011, DO-254:2000, DO-200B, DO-330,
                ARP 4754A:2010, ARP 4761:1996, ARP 5580,
                MIL-STD-1916, MIL-STD-1629A, MIL-HDBK-217F,
                GIDEP (Government-Industry Data Exchange Program)
                procedures, NADCAP: AC7004/7102/7108/7110/7114/
                7116/7117/7118/7121/7126/7137 + applicable
                audit criteria sets, DO-326A / ED-202A + DO-355 /
                ED-204 (airborne cybersecurity)
```

The Aerospace pack carries the highest design-assurance obligations
(DO-178C DAL A / DO-254 DAL A), US export-control overhead (ITAR / EAR),
counterfeit-parts vigilance (AS5553B / AS6174A / GIDEP), NADCAP special
process accreditation, and multiple regulatory-authority certification
paths (FAA Production Approval / EASA Production Organization Approval).
ITAR-controlled tenants are restricted to US-only deployment by default.

---

## 1. Pack scope and sub-vertical taxonomy

```
SUB-VERTICAL                   SCOPE ADDITIONS
────────────────────────────────────────────────────────────────────
Civil Airframe / Engine         14 CFR Part 21 (Production Approval);
                                EASA Part 21G (POA) / 21J (DOA);
                                AS9100D; FAI mandatory per AS9102B;
                                DAL-driven avionics

Civil MRO (Maintenance,         14 CFR Part 145 (Repair Station cert);
Repair, Overhaul)               EASA Part 145; AS9110D; engine service
                                records per Part 145; time-limited
                                part (TLP) tracking

Distributor                     AS9120B (purchasing + traceability;
                                lot → heat → coil mandatory);
                                counterfeit avoidance plan per AS5553B

Defense US                      DFARS 252.204-7012 + NIST SP 800-171 r2;
                                CMMC 2.0 Level 2 minimum; Level 3
                                for sensitive programs; ITAR / EAR;
                                CUI handling; DCMA interface

Defense NATO                    Per partner-nation requirements; NATO
                                STANAG equivalents; ITAR/EAR still
                                apply for US-origin controlled items;
                                allied-nation security clearance overlays

Space (commercial)              NASA Technical Standards + FAA AST;
                                ECSS (European Cooperation for Space
                                Standardization) where applicable;
                                extended life / reliability requirements

Space (defense / classified)    Per program classification; classified
                                system supplements; ITAR-controlled;
                                FIPS 140-3 mandatory; compartmented
                                access controls

Software-heavy (avionics /      DO-178C DAL A–E objectives; DO-330
flight software)                (tool qualification); SOUP register;
                                structural coverage at source + object;
                                multi-version dissimilarity where DAL A

Hardware-heavy (programmable    DO-254 DAL A–E; hardware design lifecycle
logic / avionics hardware)      data; FPGA verification; hardware
                                safety assessment

Tier-N component / processor    AS9100D + NADCAP for special processes;
                                counterfeit avoidance per AS5553B;
                                material traceability per AS9120B

First-tier system / structure   Full scope: AS9100D + AS9145 APQP-equiv;
                                FAI per AS9102B; ARP 4754A system
                                safety + ARP 4761 safety assessment;
                                NADCAP + DO-178C/254 where E/E content
```

---

## 2. Authoritative roots (pack-specific; ≥ 30)

```
AR-J3-001   AS9102 First Article Inspection (FAI) Report
            per part-number × per drawing revision; Forms 1 / 2 / 3
            per AS9102B; balloon-traced drawing reference; all
            characteristics measured; GD&T verification
            Schema: fai_id, part_number, drawing_number, revision,
              form_1 (design documentation), form_2 (product
              accounting), form_3 (characteristics accountability +
              measurements[{char_id, nominal, actual, tolerance,
              pass_fail}]), ballooned_drawing_ref, nonconformances[],
              disposition, sign_off_date, sign_off_roles[]

AR-J3-002   DPDR (Design Prevention and Detection Record)
            FAA-required design assurance record per applicable
            design rules; linked to DFMEA / FMEA; detection methods
            per characteristic per design review
            Schema: dpdr_id, design_item_id, design_phase, prevention_
              controls[], detection_controls[], review_results, sign_off

AR-J3-003   NADCAP Special Process Certification
            per process type × per facility; cert number, accrediting
            body (PRI / NADCAP), audit date, findings, corrective
            actions, cert effective date, expiry date, re-audit
            window, conditional flags
            Process types: AC7004 (heat treating), AC7102 (chemical
              processing), AC7108 (welding), AC7110 (composites),
              AC7114 (coatings), AC7116 (NDT), AC7117 (fluid
              distribution systems), AC7118 (electronics), AC7121
              (measurement + inspection), AC7126 (materials testing
              laboratories), AC7137 (shot peening)
            Schema: cert_id, process_type, facility_id, cert_number,
              audit_date, expiry_date, findings[], corrective_actions[],
              approval_status, conditional_period_end

AR-J3-004   Counterfeit Parts Risk Assessment
            per part × per supplier × per procurement cycle; risk
            factors per AS5553B §5.1 + AS6174A; procurement history;
            independent source warnings
            Schema: cpra_id, part_number, supplier_id, risk_factors[
              {factor, score}], aggregate_risk_level (Low/Medium/High),
              recommended_actions[], assessment_date, reviewer

AR-J3-005   Counterfeit Parts Investigation
            per suspect or confirmed counterfeit instance; origin trace;
            lot quarantine; GIDEP submission trigger
            Schema: inv_id, detection_date, part_number, lot_number,
              quantity, discovery_method, test_results[], determination
              (suspect/confirmed/cleared), quarantine_date, gidep_id,
              impact_assessment, capa_id, report_to_regulators

AR-J3-006   GIDEP Submission
            per confirmed suspect counterfeit or safety hazard;
            GIDEP forms per US government procedures; 60-day window
            from confirmed determination
            Schema: gidep_id, form_type (SAFE-ALERT/AGENCY-REPORT/
              FAILURE-EXPERIENCE), submitter, part_number, lot_number,
              manufacturer, hazard_description, test_evidence_refs[],
              submission_date, gidep_ref_number, 60_day_deadline,
              deadline_met

AR-J3-007   ITAR Item Control Record
            per USML-controlled item × per access grant; item
            classification (USML category), authorized-release
            scope, access log, re-evaluation schedule
            Schema: item_id, usml_category, eccn (if dual-use),
              item_description, authorized_persons[{person_id,
              access_from, access_to, scope}], classification_date,
              re_eval_date, itar_itar_export_licenses[]

AR-J3-008   ITAR Person-of-Record
            per person × per controlled-item scope; identity proofed
            per I8 §3 (IAL3 / AAL3); deemed-export rules applied;
            nationality / permanent-residency verified annually
            Schema: por_id, person_id, nationality[], pr_status,
              identity_proof_date, identity_proof_method,
              controlled_items_scope[], annual_review_date,
              status (active/suspended/revoked)

AR-J3-009   EAR Classification Record
            per item (commercial) per EAR 15 CFR; ECCN assigned;
            license determination (NLR / license required);
            country chart analysis
            Schema: ear_id, item_id, eccn, jurisdiction (EAR/ITAR),
              license_determination, license_number, effective_date,
              country_restrictions[]

AR-J3-010   CUI (Controlled Unclassified Information) Record
            per CUI document / data set; CUI category per DoD
            5200.48; access log per NIST 800-171 §3.1.3; marked
            and encrypted per §4 of I7
            Schema: cui_id, document_id, cui_category, marking_applied,
              encryption_status, access_log_ref, authorized_persons[],
              retention_period, destruction_date

AR-J3-011   CMMC Assessment Record
            per assessment cycle; self-assessment (Level 2
            baseline) or third-party (C3PAO for Level 3); 110
            practices scored per NIST 800-171; POA&M items tracked
            Schema: cmmc_id, assessment_date, level, assessor_type
              (self/C3PAO), practices[{domain, practice_id, status,
              score}], poam_items[], score_total, submission_to_SPRS,
              next_assessment_due

AR-J3-012   DO-178C Software Configuration Item (SCI)
            per software item × per DAL (A–E); planning documents;
            development lifecycle artifacts; verification objectives
            coverage; configuration management baseline
            Schema: sci_id, software_item_id, dal, planning_docs[],
              development_artifacts[], verification_coverage[{
              objective_id, method, evidence_ref, pass_fail}],
              baseline_ref, certification_liaison_record

AR-J3-013   DO-254 Hardware Configuration Item (HCI)
            per hardware item × per DAL (A–E); similar structure
            to SCI; additional hardware verification objectives
            (structural coverage at netlist / silicon level)
            Schema: hci_id, hardware_item_id, dal, planning_docs[],
              design_data[], verification_records[], baseline_ref

AR-J3-014   DO-178C Software Lifecycle Data Index
            per software item; per-objective traceability from
            requirements to code to test results; gap analysis
            for certification submission
            Schema: sldi_id, sci_id, objectives_required_by_dal[],
              objectives_met[], traceability_matrix_ref, gaps[]

AR-J3-015   ARP 4754A System Development Data
            per system × per aircraft / platform program; system
            functional hazard assessment (FHA); allocation of safety
            requirements to systems; system safety assessment; V&V
            plan per DAL
            Schema: sdd_id, system_id, program_id, fha_ref,
              safety_requirements_allocation[], ssap_ref, v_and_v_plan

AR-J3-016   ARP 4761 Safety Assessment Package
            per system; FHA (Functional Hazard Assessment) +
            PSSA (Preliminary System Safety Assessment) + SSA
            (System Safety Assessment) + FTA (Fault Tree Analysis) +
            FMECA + CCA (Common Cause Analysis) artifacts
            Schema: sap_id, system_id, fha_record, pssa_record,
              ssa_record, fta_roots[], fmeca_items[], cca_records[
              {type: ZSA/PRA/CMA, ref}], accepted_failure_conditions[]

AR-J3-017   AS9145 APQP Project (Aerospace APQP)
            per program / per part; aerospace-specific phase gates;
            FAI gate at Phase 4 (first article required before
            production volume); counterfeit avoidance gate
            Schema: aero_apqp_id, part_number, customer, program,
              phases[5], deliverables[], gate_evidence[], fai_gate_date,
              counterfeit_gate_result, sign_off

AR-J3-018   AS9145 PPAP-Equivalent Package
            per part per customer; similar to J2 PPAP but aerospace-
            specific elements; FAI evidence required; AS9102B forms
            included as core element
            Schema: aero_ppap_id, part_number, customer, elements[
              {type, status}], fai_evidence_ref, submission_date,
              customer_disposition

AR-J3-019   Service-Life-Limited Part (SLLP) Record
            per part × per serial number; life limit per design
            document; accumulated cycles or hours; replacement due
            alert; traceability to maintenance records
            Schema: sllp_id, part_number, serial_number, life_limit
              (cycles/hours/calendar), accumulated, remaining,
              replacement_due_alert_threshold, maintenance_events[],
              retirement_date, retirement_evidence_ref

AR-J3-020   QPL / QML Registry Entry
            per part / manufacturer on Qualified Products List or
            Qualified Manufacturers List; qualification status;
            listing body (DoD / NASA / customer); periodic re-qual
            Schema: qpl_id, part_number, manufacturer_id, listing_body,
              qualification_date, qualification_tests[], status,
              re_qualification_due

AR-J3-021   Engine Maintenance Record (Part 145 / AS9110D)
            per engine × per maintenance event; work scope; parts
            replaced with trace; time-limited parts status; sign-off
            by Licensed Aircraft Maintenance Engineer (LAME)
            Schema: maint_id, engine_serial, event_date, event_type,
              work_scope, parts_replaced[{part_number, serial,
              trace_chain}], tlp_status_after[], lame_sign_off,
              return_to_service_doc_ref

AR-J3-022   Airworthiness Directive (AD) Compliance Record
            per AD × per fleet item; applicability determination;
            compliance method; compliance date; repetitive
            AD tracking
            Schema: ad_id, ad_number, issuing_authority (FAA/EASA/etc),
              issued_date, applicability_scope, fleet_items_affected[],
              compliance_method, compliance_date, repetitive_interval,
              next_compliance_due, sign_off

AR-J3-023   Service Bulletin (SB) Compliance Record
            per SB × per fleet item; mandatory vs recommended;
            implementation tracking; OEM release note link
            Schema: sb_id, sb_number, oem_id, type (mandatory/
              recommended), issued_date, fleet_items_affected[],
              implementation_date, implementation_method, sign_off

AR-J3-024   RAID Log
            per program (Risks / Assumptions / Issues / Dependencies);
            industry standard program management artifact; linked
            to H9 risk register; ownership per item; resolution
            tracking
            Schema: raid_id, program_id, items[{type, description,
              owner, probability, impact, mitigation, status}],
              review_date

AR-J3-025   Aerospace SCAR (Supplier Corrective Action Request)
            per supplier × per event; aerospace-specific timelines
            (shorter than automotive); linked to NADCAP findings
            where applicable; counterfeit root cause if applicable
            Schema: scar_id, supplier_id, event_date, root_cause_type
              (quality/counterfeit/delivery/safety), d1_d7_steps[],
              closure_date, customer_disposition

AR-J3-026   Material Traceability Chain (AS9120B)
            per lot; trace from receiving document → heat → coil
            → mill cert → chemical + physical test certs; chain
            preserved across D11 distribution
            Schema: trace_id, lot_number, part_number, source_document,
              mill_cert_ref, chemical_test_ref, physical_test_ref,
              heat_number, coil_number, chain_verified, chain_sign_off

AR-J3-027   Cyber Plan + SBOM (DO-326A / DO-355)
            per airborne system per applicable program; airworthiness
            security process; security risk assessment; SBOM per
            artifact; threat conditions + mitigations
            Schema: cyber_plan_id, system_id, da_number, security_risk_
              assessment_ref, sbom_ref, threat_conditions[], mitigations[],
              revision, certification_liaison_record

AR-J3-028   Production Approval Holder (PAH) Record
            per FAA PAH (Production Certificate / TSO) or EASA POA
            (Part 21G); scope, privileges, conditions, quality manual
            reference, accountable manager
            Schema: pah_id, authority (FAA/EASA), approval_type
              (PC/TSO/POA/etc), approval_number, scope, effective_date,
              expiry_or_unlimited, quality_manual_ref, accountable_manager,
              authorized_representatives[]

AR-J3-029   DO-326A Airworthiness Security Threat Condition (ASTC)
            per threat condition identified in cyber security risk
            assessment; severity; probability; residual risk
            Schema: astc_id, cyber_plan_id, threat_condition_desc,
              severity, probability, mitigation_controls[], residual_risk,
              acceptance_sign_off

AR-J3-030   AS9102B Bubble-Traced Drawing Register
            per drawing revision; bubble numbering assignment;
            FAI characteristics accountability; revision-controlled;
            linked to AS9102 FAI Forms 1/2/3
            Schema: btd_id, drawing_number, revision, bubbles[{bubble_id,
              characteristic, type, nominal, tolerance, fai_form_ref}],
              last_updated, reviewer
```

---

## 3. State machines (pack-specific; ≥ 9 SMs)

### SM-FAI (AS9102 First Article Inspection)

```
States: initiated → bubbled-drawing-registered →
        measurements-collected → review →
        accepted | conditionally-accepted | rejected

Trigger: any first-of-a-kind production or post-ECO first piece per
  IATF 16949 §8.5.1.3 (aerospace: per AS9100D §8.5.1.3 + customer CSR)
Hard couplings:
  SM-7 (doc effectivity): drawing must be released
  SM-3 (WO): WO for first piece triggers FAI state machine
  BD-20 (FAI signoff): FAI acceptance is a banned-decision;
    requires Aerospace Lead + Quality Engineer co-sign
Rejection → SCAR per AR-J3-025; re-FAI required on corrective action
```

### SM-NADCAP-CERT

```
States: not-accredited → applied → pre-audit-survey →
        audit-scheduled → audit-conducted →
        findings-issued → corrective-action →
        response-submitted → approved | conditional | failed

Cycle: typically 24 months; conditional = 12-month re-audit window
Expiry: production blocked for lots requiring the expired process
  (automated gate in SM-3 / D10)
Auto-alert: T-90 days from expiry; T-30 days
Hard couplings: PPAP-equivalent (AR-J3-018) cannot be submitted
  for parts requiring uncertified special processes
```

### SM-COUNTERFEIT (Counterfeit Parts Lifecycle)

```
States: alert-received → quarantine-applied → investigation →
        test-results-in →
          confirmed → gidep-submission → impact-assessment → CAPA
          cleared → return-to-stock | disposition
          suspect (inconclusive) → hold + escalation

Trigger: supplier alert; in-house inspection; GIDEP feed; visual
  anomaly; customer notification

Hard couplings:
  BD-21 (counterfeit attestation): confirmed determination requires
    Aerospace Lead co-sign before GIDEP submission
  GIDEP: 60-day window enforced from confirmed date
  Recall: per D12 if confirmed-counterfeit parts may have shipped
  SM-11 (recall): auto-trigger consideration
```

### SM-ITAR-ACCESS

```
States: request → person-of-record-identity-check →
        nationality-deemed-export-check → scope-defined →
        access-granted → used (every use logged) →
        annual-review → re-granted | scope-reduced | revoked

BD-24 (ITAR access): access grant requires Aerospace Lead +
  Compliance Lead co-sign; AI cannot autonomously grant ITAR access
Annual review mandatory per §3.5 of I7
Revocation immediate on departure or scope-change
```

### SM-DO178C-SCI

```
States per software item: planning → requirements →
    software-architecture → detailed-design → coding →
    integration → verification → configuration-management →
    quality-assurance → certification-liaison → in-service

DAL A objectives: 71 objectives to satisfy (per DO-178C Table A-1..A-10)
DAL B: 69 objectives (no MC/DC coverage for some)
DAL C: 62 objectives
DAL D: 26 objectives
DAL E: no objectives (no effect on safety)

Evidence: per-objective per-SCI; automated coverage gap detection;
  structural coverage (statement / decision / MC-DC per DAL)
Hard couplings: tool qualification per DO-330 if tool generates
  airborne software output
```

### SM-DO254-HCI

```
States per hardware item: planning → conceptual-design →
    detailed-design → implementation → verification →
    configuration-management → certification-liaison → in-service

DAL A: comprehensive hardware lifecycle data (PHLD);
  independent verification; additional considerations
DAL B: complete CHLD; formal verification or testing equivalent
DAL C: standard lifecycle; testing evidence
DAL D: basic lifecycle data

Evidence: per-objective; FGA/CPLD verification methods;
  hardware safety assessment per ARP 4754A / ARP 4761 inputs
```

### SM-AD (Airworthiness Directive Compliance)

```
States: issued-or-received → applicability-determination →
        not-applicable (closed) | applicable →
        compliance-method-selected → compliance-executed →
        verified → sign-off → reported-to-authority

Repetitive ADs: cycle restarts at 'compliance-executed' per interval
BD-25 (AD compliance): compliance execution sign-off requires
  LAME / Designated Engineering Representative + Aerospace Lead
  co-sign; AI cannot mark AD as complied without human co-sign
Late compliance: airworthiness exposure; SEV-1; regulator
  notification per H1 §3
```

### SM-AS9145-APQP (Aerospace APQP)

```
States: phase-1 (plan) → phase-2 (product design) →
        phase-3 (process design) → phase-4 (product validation) →
        phase-5 (feedback / improvement) → closed

Aerospace gates additional to automotive APQP:
  Phase 3 gate: counterfeit avoidance plan accepted
  Phase 4 gate: FAI required (SM-FAI accepted) before production
    volume release; first-flight or first-delivery hold until FAI
  Phase 4 gate: BD-20 (FAI signoff) required

Hard couplings: same as SM-APQP (J2) plus SM-FAI, SM-NADCAP-CERT,
  BD-20 at Phase 4 exit
```

### SM-AS9120B-TRACE (Distributor Traceability)

```
States per lot: procured → receiving-inspection → material-trace-verified
  → cert-validated → stock → sold-or-consumed → trace-retained

Per AS9120B: lot → heat → coil; chemical + physical cert; no trace break
Material traceability chain (AR-J3-026) must be complete and verifiable
at every state transition; trace break = immediate quarantine + SCAR
BD-21 (counterfeit attestation) at sale: attestation form signed by
  AS9120B-qualified person before shipment
```

---

## 4. D1–D14 per-pack workflow overlays

```
D1 Order to Cash          AS9120B traceability chain required for
                          every lot; distributor sub-vertical enforces
                          full material cert chain before shipment;
                          BD-21 attestation form on distributor sale

D2 Procurement to Pay     AS5553B / AS6174A counterfeit avoidance
                          plan per supplier; QPL / QML preference
                          enforced for controlled parts; GIDEP
                          cross-check at procurement; supplier
                          NADCAP cert verification per process type

D3 Plan to Produce        AS9145 phase-gated; FAI required at first
                          piece per drawing revision (SM-FAI gate in
                          SM-3 WO); NADCAP cert verified per lot
                          before production start; ITAR access check
                          per operator for controlled items

D4 Receive to Inspect     Counterfeit risk screen per supplier per
                          part (AR-J3-004); visual inspection +
                          testing per AS6174A guidance; GIDEP cross-
                          reference for suspect parts; material
                          traceability verified at receipt

D5 Inspect to Disposition Per characteristic vs spec; AS9102 balloon-
                          trace for dimensional characteristics; NDT
                          evidence per NADCAP accredited lab;
                          test results per NADCAP for coatings/heat
                          treat / composites

D6 NC to CAPA             8D-style with aerospace cycle times;
                          root cause per AIAG-VDA AP methodology
                          adapted; counterfeit determination triggers
                          SM-COUNTERFEIT in parallel; customer
                          notification per customer CSR window

D7 Document to Release    Drawing + spec + cert effectivity managed
                          per SM-7; FAI re-trigger on dimensional
                          change (any AS9102B form affected);
                          ITAR classification review on any drawing
                          revision involving controlled technology

D8 Train to Qualify       Special-process operator certification per
                          NADCAP requirements; ITAR access training;
                          DO-178C / DO-254 engineer qualification
                          (DAL-specific training evidence); annual
                          re-qualification cycles

D9 Maintain to Restore    Part 145 engine maintenance records per
                          AR-J3-021; time-limited part replacement
                          cycle per AR-J3-019; airworthiness
                          directive compliance per AR-J3-022

D10 Batch to Release       Lot traceability chain complete before
                          release; NADCAP cert for applicable
                          processes in effect; ITAR access verified
                          for controlled lots; SLLPs verified
                          below life limit before ship

D11 Release to Trace       5-year traceability minimum per most
                          customers (10+ for some primes); AS9120B
                          lot → heat → coil preserved across
                          distribution chain; service-life tracking
                          for SLLPs throughout operational life

D12 Complaint to Recall    Airworthiness implications trigger
                          immediate assessment; FAA / EASA reporting
                          per H1 §3; counterfeit recall consideration;
                          fleet-wide AD risk assessment if safety
                          critical

D13 Audit to Remediate     AS9100D surveillance cycle; NADCAP
                          re-accreditation cycle; customer prime
                          audit (Boeing D6-82479; Lockheed; Airbus
                          Q-Clauses); DCMA for defense sub-contracts;
                          CMMC assessment cycle per AR-J3-011

D14 Validate to Qualify    FAI = qualification anchor for first
                          production piece; DO-178C / DO-254
                          DAL-driven validation depth; ARP 4754A
                          safety requirements allocation drives H2
                          validation depth tier
```

---

## 5. Banned decisions (per L1)

```
BD-20  FAI SIGNOFF (AS9102 FIRST ARTICLE INSPECTION ACCEPTANCE)
       AI cannot autonomously accept or close an AS9102 FAI report.
       FAI acceptance requires Aerospace Lead + Quality Engineer
       co-sign. FAI acceptance gates production volume release
       (Phase 4 APQP exit).
       Rationale: erroneous FAI acceptance could allow non-conforming
       parts to enter production; airworthiness / safety consequence
       in some applications.
       Evidence: AR-J3-001 signed with dual human signatures before
       SM-FAI transitions to 'accepted'.

BD-21  COUNTERFEIT PARTS ATTESTATION
       AI cannot autonomously issue a counterfeit-free attestation
       for a shipment or generate a signed GIDEP submission. Both
       actions require Aerospace Lead co-sign.
       Rationale: false attestation = fraud; GIDEP submission has
       US government contractual obligations; confirmed counterfeit
       may trigger regulatory reporting per H1 §3.
       Evidence: AR-J3-005 or AR-J3-006 signed by Aerospace Lead
       before transmission.

BD-22  GIDEP SUBMISSION
       AI cannot autonomously submit a GIDEP alert, safe-alert, or
       failure-experience report to the GIDEP database. Submission
       requires Aerospace Lead + Compliance Lead co-sign, within
       the 60-day window.
       Rationale: GIDEP submission creates permanent US government
       record affecting other industry participants; incorrect
       submission is difficult to retract.
       Evidence: AR-J3-006 quorum signatures recorded before
       portal transmission.

BD-23  SERVICE-LIFE-LIMITED PART (SLLP) DISPOSITION
       AI cannot autonomously approve retirement or continued use
       of an SLLP that has reached or is near life limit. Disposition
       requires Licensed Aircraft Maintenance Engineer (LAME) or
       DER co-sign for MRO sub-vertical; Aerospace Lead for
       manufacturing sub-vertical.
       Rationale: exceeding SLLP life limit is a direct airworthiness
       violation; FAR / EASA PART 21 / 145 require human accountable
       person for life-limit decisions.
       Evidence: AR-J3-019 SLLP Record updated with co-signed
       disposition before any return-to-service action.

BD-24  ITAR ACCESS GRANT
       AI cannot autonomously grant access to ITAR-controlled
       technology, items, or data. Access grant requires Aerospace
       Lead + Compliance Lead co-sign after person-of-record
       verification (IAL3, nationality check, deemed-export review).
       Rationale: unauthorized disclosure of ITAR-controlled
       technology is a federal criminal violation (22 CFR §127.1).
       Evidence: AR-J3-008 Person-of-Record record and AR-J3-007
       Item Control Record both must reflect the co-signed grant
       before access is provisioned in I7 §3.5.

BD-25  AIRWORTHINESS DIRECTIVE COMPLIANCE SIGN-OFF
       AI cannot autonomously mark an AD as complied or generate
       a return-to-service tag. AD compliance requires a human
       accountable person (LAME or DER or IA inspector) plus
       Aerospace Lead countersign.
       Rationale: false AD compliance creates airworthiness
       violations; 14 CFR Part 43 and EASA Part-M require
       authorized persons for maintenance release.
       Evidence: AR-J3-022 AD Compliance Record co-signed before
       state transitions to 'sign-off'.
```

---

## 6. APIs (pack-specific)

```
API                              MECHANISM      DESCRIPTION
────────────────────────────────────────────────────────────────────
AS9102 FAI generator             E13 LRO        parse ballooned drawing;
                                                generate Forms 1/2/3 pre-
                                                populated; characteristics
                                                register
NADCAP cert lifecycle API        E3 + E10       cert CRUD; expiry alerts;
                                                re-audit trigger
Counterfeit screen API           E3 + E15       risk assessment per part +
                                                supplier; GIDEP alert feed
                                                integration
GIDEP submission API             E15            draft + submit to GIDEP
                                                portal; BD-21/BD-22 gate;
                                                60-day SLA tracking
DO-178C SCI tracking API         E3             full lifecycle per SCI;
                                                objective coverage matrix;
                                                gap detection
DO-254 HCI tracking API          E3             hardware item lifecycle;
                                                verification records;
                                                DAL-driven objectives
ARP 4754A / 4761 safety          E3             FHA + PSSA + SSA + FTA +
case API                                        FMECA + CCA record
                                                management
Service-life-limited part        E3 + E10       per-S/N cycle / hour
record API                                      tracking; remaining-life
                                                alert; BD-23 gate
ITAR enforcement API             E3 + B6        access control per ITAR
                                                item; person-of-record
                                                verification; BD-24 gate;
                                                region-pinning enforcement
EAR classification API           E3             ECCN assignment; license
                                                determination; country
                                                chart check
CMMC evidence pack export        E8 + E13       export all 110-practice
                                                evidence; SPRS-ready
                                                summary; C3PAO evidence
                                                package
AS9145 APQP API                  E3 + E7        aerospace APQP lifecycle;
                                                phase advance; BD-20 gate
                                                at Phase 4
AS9145 PPAP-equivalent API       E13            element assembly; FAI
                                                evidence inclusion; LRO
Material traceability API        E5 + E8        lot → heat → coil chain
                                                query; AS9120B-compliant
                                                trace; attestation generation
AD / SB compliance API           E3 + E10       per AD/SB; applicability
                                                determination; compliance
                                                tracking; BD-25 gate
Engine maintenance record        E3             Part 145 / AS9110D event
API                                             record; TLP status after
                                                maintenance
Airworthiness cyber SBOM         E3 + E15       DO-326A / DO-355 SBOM
(DO-326A/-355)                                  management; threat condition
                                                tracking
AI-18 counterfeit indicator      AI feature     HESEM AI feature: indicator
                                                model assessing part +
                                                supplier risk; advisory flag
                                                only; human reviews before
                                                quarantine decision
```

---

## 7. UI surfaces (≥ 12)

```
AS9102 FAI Workspace              balloon-drawn characteristic register;
                                  Form 1/2/3 panel; AI-18 anomaly flag;
                                  BD-20 quorum sign step

NADCAP Cert Console               per-process cert cards; expiry
                                  countdown; findings log; re-audit
                                  scheduling; production-block indicator

Counterfeit Risk + Investigation  supplier risk scorecard per part;
Workspace                         investigation flow; test-result entry;
                                  GIDEP draft panel; BD-21 sign gate

DO-178C SCI Workspace             per-item objective coverage matrix by
                                  DAL; planning doc status; verification
                                  evidence log; gap list; structural
                                  coverage report link

DO-254 HCI Workspace              equivalent hardware view; netlist /
                                  FPGA verification records; DAL
                                  objectives coverage

Service-Life-Limited Part         per-S/N; cycle/hour accumulation
Console                           graph; remaining life bar; next
                                  inspection alert; replacement order
                                  link; BD-23 disposition gate

ITAR Access Audit Workspace       per-person × per-item scope matrix;
                                  person-of-record status; deemed-export
                                  review date; BD-24 sign gate

CMMC Evidence Dashboard           per-practice score; POA&M tracker;
                                  SPRS submission status; C3PAO evidence
                                  export button

AS9100D + NADCAP Audit Pack       FAA / EASA inspection-ready evidence
Wizard                            bundle; customer prime-audit view;
                                  DCMA evidence export; section by
                                  section completeness check

ARP 4761 Safety Workspace         FHA + PSSA + SSA + FTA + FMECA + CCA
                                  record navigator; failure condition
                                  classification tree; DAL assignment
                                  cascade view

AD Compliance Console             per-AD fleet impact map; compliance
                                  plan; BD-25 sign gate; overdue alert;
                                  authority submission tracker

SB Compliance Console             mandatory vs recommended badges;
                                  fleet implementation tracking;
                                  OEM release note link

Material Traceability Viewer      lot → heat → coil chain graphic;
(AS9120B)                         certificate references; trace-break
                                  alert; attestation generation

GIDEP Drafting Workspace          form pre-population; 60-day window
                                  countdown; BD-22 quorum sign;
                                  portal submission status
```

---

## 8. Pack discipline

```
ITEM                              DETAIL
────────────────────────────────────────────────────────────────────
US-only deployment for ITAR       B6 C5 region pinning; sub-processor
tenants                           list ITAR-clean; FIPS 140-3 only;
                                  no data path to non-US region

Person-of-record verification     IAL3 / AAL3 per I7 §3.1 + I8 §3;
at onboarding                     nationality + PR check; deemed-export
                                  review; BD-24 enforced; annual re-
                                  verification

CUI handling                      NIST 800-171 r2 all 110 practices;
                                  field-level CUI marking; AES-256
                                  encryption; access logged per AR-J3-010;
                                  monthly access review

FIPS 140-3 cryptography           validated modules only for ITAR / CUI
                                  tenants; Ed25519 replaced by ECDSA
                                  P-384 in FIPS mode per I7 §4.2

AS9100D conformance cycle         cert + Sanctioned Interpretations
                                  compliance; surveillance audit on
                                  registration cycle; findings tracked
                                  in HESEM per D13

NADCAP re-accreditation           auto-alert at T-90 + T-30 from expiry;
cycle (typically 24 months)       production blocked for affected process
                                  if expired; re-audit evidence in HESEM

AS9102 FAI on every first         gate in SM-3 WO at first-piece event
piece per revision                post-ECO; BD-20 required for acceptance;
                                  no production volume without accepted FAI

Counterfeit avoidance plan        tenant-specific; tied to AS5553B +
                                  AS6174A; updated per risk assessment
                                  cycle; supplier-level and part-level
                                  risk scoring

GIDEP 60-day window SLA           60-day countdown UI from confirmed
                                  counterfeit determination; BD-22
                                  required before submission; late
                                  submission = H8 CAPA + contractual risk

DO-178C / DO-254 DAL-driven       DAL A–E objectives per SCI / HCI
objectives                        tracked per AR-J3-012/013; coverage
                                  gap = certification blocker

ARP 4754A / ARP 4761 safety       per system; FHA → PSSA → SSA required
case                              before production; functional failures
                                  classified; DAL assignment drives H2
                                  validation depth

AS9120B material traceability     lot → heat → coil chain complete;
(distributors)                    no trace break permitted; trace
                                  verified at every SM-AS9120B-TRACE
                                  state transition

Service-life-limited part         per-S/N tracking; life limit enforced
tracking                          in HESEM (no SLLP past limit can be
                                  shipped without BD-23 exception +
                                  DER sign-off)

DO-326A / -355 cyber SBOM         SBOM per airborne system; threat
and monitoring                    conditions tracked; ASTC records
                                  (AR-J3-029) maintained

DCMA-ready evidence               defense subcontract evidence formatted
                                  per DCMA audit expectations; CMMC
                                  assessment evidence (AR-J3-011)
                                  up-to-date

NADCAP-aligned tooling audit      audit pack pre-staged per NADCAP
evidence                          section requirements; checklist per
                                  AC7004..AC7137 as applicable

Authorized engineer roles         MRO: LAME co-sign for maintenance
                                  release; FAA-cert Repair Station sign
                                  (Part 145); DER for engineering
                                  disposition; BD-23 / BD-25 enforce this
```

---

## 9. AI advisory feature

```
AI-18 COUNTERFEIT INDICATOR
  Statistical model assessing counterfeit risk per part + per
  supplier combination based on:
    - Supplier risk tier (AS5553B / AS6174A factors)
    - Historical GIDEP alerts for part number + manufacturer
    - Supply chain provenance gaps (trace-break indicators)
    - Price anomaly relative to list price
    - Lot size anomaly
    - Visual inspection anomaly flags (from inspection photos
      where image AI is enabled)
  Output: risk score (Low / Medium / High / Critical) per lot
    with contributing factor list.
  Advisory only: score is a flag; human makes quarantine decision.
  High + Critical scores: mandatory human review before receipt
    acceptance; cannot be waived without Aerospace Lead sign.
  Evidence: AI score recorded in AR-J3-004 as advisory_score field.
  Confidence and model version disclosed in UI.
```

---

## 10. Pack KPIs

```
KPI                                   TARGET / NOTE
─────────────────────────────────────────────────────────────────────
AS9102 FAI first-time approval rate    ≥ 95% first submission
NADCAP cycle compliance               100% (any expiry = production
                                       block; H8 CAPA)
Counterfeit incident rate              downward trend; confirmed
                                       incidents ≥ 0 triggers GIDEP
GIDEP submission window adherence      100% within 60 days of
                                       confirmed determination
SLLP on-time replacement              100% (any exceeding life limit
                                       = airworthiness violation)
ITAR access review compliance         100% annual review; 0 gaps
CMMC self-assessment currency          current within 12 months for
                                       Level 2; per C3PAO for Level 3
AD compliance window adherence        100%; overdue = SEV-1
SB compliance (mandatory SBs)         100% within SB compliance
                                       window per OEM / authority
DO-178C/254 objective coverage        100% of required objectives per
by DAL                                DAL per SCI/HCI before release
AS9100D surveillance findings         0 major non-conformances;
                                       minors tracked and closed
5-year traceability sample test       100% pass rate on spot-check
                                       sample
AI-18 counterfeit indicator           tracked (precision + recall
precision and recall                   per confirmed case)
COPQ trend per program                year-over-year reduction target
Customer scorecard (prime)            ≥ Green on major prime metrics
```

---

## 11. Audit pack contents (Aero-specific addition to H3 §4; ≥ 25 sections)

```
Section                                    Evidence Class
────────────────────────────────────────────────────────────────────
01  AS9100D conformance cert + Sanctioned Interp compliance       EC-1
02  NADCAP audit findings + corrective actions (current cycle)    EC-6
03  Per-customer prime CSR evidence (Boeing D6-82479; Lockheed;
    Airbus Q-Clauses; Raytheon; Northrop; Spirit; GE Aviation)    EC-14
04  Counterfeit mitigation plan + recent risk screens + investigations EC-14
05  GIDEP submission records + 60-day compliance evidence         EC-14
06  ITAR / EAR compliance attestation + person-of-record reviews  EC-31
07  CMMC level assessment + POA&M + SPRS submission evidence      EC-14
08  AD compliance log (all applicable ADs; last 36 months)        EC-14
09  SB compliance log (all mandatory SBs; last 36 months)         EC-14
10  DO-178C SCI lifecycle data per software item per program      EC-14
11  DO-254 HCI lifecycle data per hardware item per program       EC-14
12  ARP 4754A / 4761 safety case per system                       EC-14
13  AS9145 APQP records per active program                        EC-14
14  5-year lot traceability per critical part (sample-based audit) EC-14
15  Material traceability chain (AS9120B) per lot                 EC-14
16  Special process certs (NADCAP) per process per facility       EC-1
17  AS9102 FAI records per active part × per current revision     EC-14
18  Audit findings + CAPA log (last 36 months)                    EC-6
19  DO-326A / -355 cybersecurity + SBOM evidence (where applicable) EC-33
20  Production Approval Holder evidence (PC / TSO / POA)          EC-1
21  AS9120B distributor traceability records (distributor sub-vert) EC-14
22  Service-life-limited part register + replacement evidence     EC-14
23  QPL / QML qualification status per controlled part            EC-1
24  Engine maintenance records + TLP tracking (Part 145 sub-vert) EC-14
25  RAID log per active program                                    EC-36
26  SCAR log (last 24 months) + aerospace-specific root causes    EC-6
27  AI-18 counterfeit indicator advisory records                  EC-36
```

---

## 12. Failure modes

```
FM1   AS9102 FAI missed at first-piece post-revision
      Root cause: SM-3 WO first-piece gate bypassed; ECO
        not linked to part number in HESEM
      Recovery: SM-3 gate blocks production of affected lots;
        H8 CAPA on gate integrity; retroactive FAI initiated;
        customer notification if lots already shipped

FM2   NADCAP cert expired (special process)
      Root cause: alert suppressed; re-audit not scheduled;
        cert tracking not linked to production planning
      Recovery: production immediately blocked for affected
        process; customer notification; re-audit expedited;
        H8 CAPA on cert monitoring

FM3   ITAR access granted without person-of-record verification
      Root cause: onboarding checklist incomplete; automation
        bypass; IAL3 step skipped
      Recovery: SEV-1 (export-control breach); access revoked
        immediately; US government notification per DFARS;
        H8 systemic CAPA on ITAR onboarding workflow; legal review

FM4   GIDEP 60-day window missed
      Root cause: BD-22 approval delayed; team unresponsive;
        60-day countdown UI not actioned
      Recovery: SEV-2; US government contractual exposure; late
        GIDEP submitted with explanation; H8 CAPA on GIDEP
        deadline governance

FM5   Service-life-limited part exceeded in-service
      Root cause: cycle/hour tracking error; SLLP record not
        linked to maintenance events
      Recovery: immediate aircraft grounding (where applicable);
        FAA / EASA reportable event per H1 §3; H8 systemic
        CAPA on SLLP tracking linkage to maintenance

FM6   AD compliance window missed
      Root cause: applicability check not completed; fleet
        mapping incomplete; BD-25 approval delayed
      Recovery: SEV-1; airworthiness exposure; FAA / EASA
        notification per H1 §3; H8 + reportable event

FM7   Confirmed counterfeit parts shipped to customer
      Root cause: quarantine not applied; screen not executed
        at receiving; SM-COUNTERFEIT not triggered
      Recovery: quarantine all affected fleet items; trace
        forward / backward; GIDEP submit (BD-21/BD-22);
        customer + regulator notification per H1 §3;
        H8 + potential recall per D12

FM8   DO-178C / DO-254 DAL allocation incorrect
      Root cause: FHA scope incomplete; new integration context
        not captured; safety requirements not flowed down
      Recovery: re-allocation per ARP 4754A; DAL downgrade
        requires re-verification; certifying authority
        notification; H8 systemic CAPA on safety analysis
        governance
```

---

## 13. Cross-references

- H1 §2.4 — Aerospace regulatory inventory (FAA, EASA, DFARS,
               ITAR/EAR, DO-178C/254)
- H2 §4 — DAL-driven validation depth; DO-178C objectives per GAMP5
           alignment for avionics
- H9 §5 — ARP 4761 as safety framework; MIL-STD-1629 FMECA
- L1 — banned decisions BD-20..BD-25
- L2 — AI-18 counterfeit indicator advisory feature
- L4 — red-team for ITAR boundary + counterfeit AI feature
- I7 §3.5 — ITAR deemed-export; FIPS 140-3; CUI handling
- I7 §10.4 — Aerospace cyber posture (DFARS/CMMC/ITAR)
- I8 §3 — US-only deployment for ITAR tenants; IAL3 proofing
- E15.11 — GIDEP integration (E15 custom integration)
- D14 — FAI as qualification anchor; DAL-driven H2 depth
- M3 — root catalog (AR-J3-001..AR-J3-030)
- M6 — aerospace-specific risks (export control, safety)
- M9 — cross-reference index

---

## 14. Decision phrase

```
J3_AEROSPACE_V10_LOCKED
S4-10_J2_J3_DEEP_UPGRADE_COMPLETE
NEXT: S4-11_J4_J5.md
```
