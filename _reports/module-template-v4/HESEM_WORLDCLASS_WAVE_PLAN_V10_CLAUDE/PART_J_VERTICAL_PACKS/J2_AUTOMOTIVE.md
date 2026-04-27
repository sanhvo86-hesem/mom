# J2 — Automotive Vertical Pack

```
pack_id:        Automotive
owner_role:     Automotive Lead with Quality Engineer
wave_target:    W10 (preview); W11 GA
sources:        IATF 16949:2016 + Sanctioned Interpretations (all issued
                2017–2024), AIAG-VDA FMEA 2019, AIAG APQP 2nd ed.,
                AIAG PPAP 4th ed., AIAG MSA 4th ed., AIAG SPC 2nd ed.,
                VDA 6.3:2023 + VDA 6.5 + VDA 19.1 + VDA 19.2 + VDA 4,
                ISO 26262:2018, ISO 21448:2022 (SOTIF), ISO 21434:2021,
                Automotive SPICE v4.0, CQI-9/11/12/15/17/23/27, SAE J1739
                (FMEA), ARP 4580, per-OEM CSRs: Ford Q1, GM BIQS,
                Stellantis, Toyota, VW Formel Q, BMW, Hyundai HKMC SQ,
                Nissan ASES, Honda HOSS, Tesla Quality Requirements,
                Rivian, Lucid; IMDS/CAMDS data scheme
```

The Automotive pack targets the OEM supplier ecosystem: planned quality
(APQP), submission discipline (PPAP/PSW), process control (SPC + CQI),
layered audits (LPA), problem solving (8D), and customer-specific
requirement overlays per OEM. HESEM serves component, sub-system, module,
and Tier-N suppliers; it does not target OEM-prime powertrain calibration
or vehicle assembly. E/E-capable sub-verticals extend to ISO 26262 (ASIL),
ISO 21448 (SOTIF), ISO 21434 (cybersecurity), and Automotive SPICE.

---

## 1. Pack scope and supplier-tier taxonomy

```
TIER / SEGMENT              PACK FOCUS
────────────────────────────────────────────────────────────────────
Tier-N (raw material /       ISO 9001 minimum; AIAG/VDA FMEA baseline;
bulk component)              CQI special process where applicable;
                             IMDS submission required

Tier-3 (sub-component /      IATF 16949 likely; CQI-9/11/12/15/17/23/27
specialty processor)         per process; SPC on key characteristics;
                             simplified PPAP (Level 1–2 typically)

Tier-2 (module / sub-system) IATF 16949 + per-OEM CSR subset;
                             full PPAP Level 3 standard; LPA active;
                             AIAG-VDA FMEA 2019

Tier-1 (system supplier)     IATF 16949 + multi-OEM CSR overlays;
                             full APQP + PPAP + SPC; warranty program;
                             DFMEA + PFMEA; ISO 26262 (E/E parts)

Aftermarket / Service Parts  per OEM aftermarket specification; typically
                             lighter PPAP; long-tail traceability
                             (10+ years)

Heavy Truck / Off-Highway    AS/SAE equivalent standards; J-spec
                             parallels; safety cycles differ from
                             passenger car ASIL

EV / Battery / Electronics   ISO 26262 (ASIL B–D typical) + ISO 21448
                             (SOTIF for ADAS) + ISO 21434 (cyber) +
                             Automotive SPICE 4.0 for software;
                             battery cell traceability; thermal
                             management qualification

Body / Trim / Interior       CSR-heavy; cleanliness testing per
                             VDA 19.1 / 19.2 where critical assemblies
                             (transmission, engine bay); color +
                             surface quality acceptance criteria per OEM

Tooling (dies / jigs / gage)  Tool ownership records; tooling PPAP
                             (Tool Approval); annual inspection cycle;
                             repair + replace lifecycle
```

Tenant declares applicable tier(s) and segment(s) at pack onboarding;
HESEM enables only relevant overlays per regulatory profile (I8 §3).

---

## 2. Authoritative roots (pack-specific)

All roots below are per-tenant; cross-tenant visibility is forbidden.

```
AR-J2-001   APQP Project
            per part-number or program; 5-phase lifecycle;
            deliverable register per phase; sign-off per phase gate
            Schema: project_id, part_number, customer, program,
              phase_current, deliverable_status[], gate_meetings[],
              effective_date, PPAP_target_date

AR-J2-002   APQP Phase Advance Decision
            per phase × per project; decision record at each
            phase gate; reviewer quorum per OEM CSR
            Schema: project_id, phase_from, phase_to, decision
              (advance/conditional/hold), evidence_list,
              reviewers[], decision_date

AR-J2-003   PSW (Part Submission Warrant)
            per part × per OEM × per submission; single signed
            document binding all PPAP elements to the submission
            Schema: psw_id, part_number, oem_id, submission_level,
              ppap_submission_id, status (draft/submitted/approved/
              interim/rejected), signed_by, signed_date, deviation_list

AR-J2-004   PPAP Submission Package
            per part × per OEM; container for all 18 (or OEM-variant)
            elements; versioned; submission level drives required elements
            Schema: submission_id, part_number, oem_id, level (1–5),
              element_status[18], submitted_date, customer_disposition,
              approval_date, re-submission_count

AR-J2-005   PPAP Element Record (per element)
            one record per element type within a PPAP submission;
            element types per AIAG PPAP 4th + OEM extensions
            Elements: design record, engineering changes, customer
              approvals, DFMEA, PFD, PFMEA, control plan, MSA study,
              dimensional results, material/performance tests, ISIR,
              process capability (Cpk/Ppk), qualified lab records,
              appearance approval, PSW, bulk-material PSW (if applicable),
              sample parts, checking aids, plus OEM-specific elements

AR-J2-006   Control Plan
            per part × per manufacturing process; characteristics
            with CC/SC/KPC/KCC tagging; linked to SPC monitoring
            for CC/SC; linked to PFMEA actions; linked to gauges
            Schema: cp_id, part_number, process_steps[], characteristics[
              {name, special_char_class, measurement_method, sample_size,
               reaction_plan, spc_chart_id}], effective_date, revision

AR-J2-007   Gauge R&R Study (MSA per AIAG)
            per gauge × per characteristic; study type (crossed/nested/
            range); acceptance per AIAG thresholds; linked to Control Plan
            Schema: grr_id, gauge_id, characteristic_id, study_type,
              number_of_operators, parts_per_operator, replicates,
              % GRR, ndc, acceptance_status, study_date

AR-J2-008   ISIR (Initial Sample Inspection Report)
            per part × per OEM (Ford-style and equivalents); dimensional
            + material + functional + appearance measurements on first-off
            or initial samples; linked to PPAP
            Schema: isir_id, part_number, oem_id, drawing_revision,
              characteristic_results[], deviations_noted, sign_off

AR-J2-009   Special Process Certification (CQI)
            per CQI standard × per facility; cert document, audit date,
            findings, expiry, renewal schedule; linked to Control Plan
            for process applicability
            CQI covered: 9 (heat treat), 11 (plating), 12 (coating),
              15 (welding), 17 (soldering), 23 (plastic molding),
              27 (casting); customer-specific CQI extensions where required

AR-J2-010   Annual Layout Inspection
            per part × per year; complete dimensional layout against
            current drawing; acceptance or disposition; required by
            IATF 16949 §8.6.2 per OEM CSR cadence
            Schema: ali_id, part_number, drawing_revision, inspection_date,
              characteristic_results[], acceptance_status, deviations

AR-J2-011   Warranty Claim
            per VIN × per claim; linked to field return and 8D; cost
            allocation per supplier responsibility determination
            Schema: claim_id, vin, claim_date, symptom, suspect_part,
              supplier_id, cost_amount, responsible_party,
              8d_investigation_id, closure_date

AR-J2-012   Field Return Analysis Record
            per VIN × per return; physical analysis result; determination
            of fault code; NTF (No Trouble Found) flag; links to CAPA
            Schema: return_id, vin, part_number, returned_date, analysis
              (fault/NTF), fault_description, 8d_id, cost_recovery

AR-J2-013   Customer-Specific Requirement (CSR) Record
            per OEM × per program × per revision; parameterized rule
            pack binding; version-controlled; linked to all affected
            authoritative roots
            Schema: csr_id, oem_id, program_scope, version,
              effective_date, rule_pack_ref, affected_roots[], retired_by

AR-J2-014   LPA Plan
            per facility; defines layers (operator → supervisor →
            manager → senior management), question lists per layer,
            cadence per layer, escalation thresholds
            Schema: plan_id, facility_id, layers[], cadence_per_layer[],
              question_bank[], effective_date

AR-J2-015   LPA Audit Run
            per layer × per cycle × per facility; findings linked to
            open CAPAs per H8
            Schema: run_id, plan_id, layer, auditor_id, date, items
              audited[], findings[], nok_count, ok_count, capa_ids[]

AR-J2-016   8D Investigation
            per problem; D1–D8 structured record; customer-required
            format export; AI-assisted RCA (AI-13)
            Schema: 8d_id, problem_statement (per H8 §3), customer_id,
              part_number, d1_team, d2_is_was, d3_containment[],
              d4_root_causes[], d5_permanent_actions[], d6_implement[],
              d7_prevent_recurrence[], d8_recognition, closed_date

AR-J2-017   SCAR (Supplier Corrective Action Request)
            per supplier × per problem; linked to 8D; customer-driven
            or HESEM-driven; timeline tracked per OEM window
            Schema: scar_id, supplier_id, part_number, issue_date,
              initial_containment_due, d4_due, d7_due, current_step,
              linked_8d_id, closure_date

AR-J2-018   DFMEA (Design FMEA)
            per design or system; AIAG-VDA 2019 7-step; structure +
            function + failure + effects + prevention + detection +
            action priority table; linked to design records
            Schema: dfmea_id, item_scope, analysis_date, revision,
              structure_tree[], failure_modes[{fm_id, failure, effect,
              severity, cause, occurrence, prevention, detection, AP,
              actions[]}], responsible, completion_dates

AR-J2-019   PFMEA (Process FMEA)
            per process; AIAG-VDA 2019 7-step; linked to PFD and
            Control Plan; AP drives control plan reaction plans
            Schema: pfmea_id, process_scope, linked_pfd_id,
              linked_cp_id, failure_modes[], analysis_date, revision

AR-J2-020   PFD (Process Flow Diagram)
            per manufacturing process; process steps, input/output,
            special cause indicators; serves as foundation for PFMEA
            + Control Plan
            Schema: pfd_id, part_number, process_steps[], flow_version,
              effective_date, linked_pfmea_id, linked_cp_id

AR-J2-021   IMDS Submission
            per part × per material composition change; IMDS or CAMDS
            data for material compliance (REACH, RoHS, ELV); required
            before PPAP
            Schema: imds_id, part_number, imds_mds_id, substances[],
              substance_flags[], submission_date, acceptance_status

AR-J2-022   HARA / ASIL Allocation Record
            per ISO 26262; per E/E item; hazard analysis + risk
            assessment; ASIL determination (QM / A / B / C / D);
            cascades to validation depth
            Schema: hara_id, item_id, hazardous_events[{event,
              severity, exposure, controllability, asil}], asil_allocation[],
              analysis_date, revision

AR-J2-023   ISO 26262 Software FMEA / FMEDA
            per software component × per DAL-equivalent (ASIL);
            failure modes at software architecture level; safe-state
            analysis
            Schema: swfmea_id, component_id, asil, failure_modes[],
              detection_mechanisms[], safe_state[], diagnostic_coverage

AR-J2-024   Cybersecurity Threat Model (ISO 21434)
            per E/E item; TARA (Threat Analysis and Risk Assessment);
            attack paths; CAL (Cybersecurity Assurance Level);
            linked cyber controls
            Schema: tara_id, item_id, threats[{threat, attack_path,
              damage_potential, feasibility, cal, controls[]}],
              analysis_date, review_cycle

AR-J2-025   Production Trial Run (PTR)
            per program × per trial cycle; verifies process capability
            and yield before production release; generates evidence for
            PPAP
            Schema: ptr_id, project_id, run_date, unit_count, yield_rate,
              capability_results[], issues[], disposition (release/hold),
              sign_off

AR-J2-026   Customer Notification of Deviation (CND)
            per OEM × per condition; formal deviation request or
            notification; BD-19 applies
            Schema: cnd_id, oem_id, part_number, deviation_description,
              quantity_affected, proposed_duration, customer_approval,
              submitted_by, approved_date, expiry_date

AR-J2-027   Reliability Demonstration Plan / Record
            per program (where required by OEM CSR or IATF); test
            plan + results + pass/fail; linked to DFMEA
            Schema: rdp_id, item_id, test_type, sample_size, hours_or_cycles,
              acceptance_criteria, results[], pass_fail, sign_off

AR-J2-028   Automotive SPICE Assessment Record
            per software project × per process area; ASPICE level
            (1–5); findings; improvement plan; per OEM software
            quality requirement
            Schema: aspice_id, project_id, assessment_date, assessor,
              process_areas[{area, level, gap, improvement}], target_level

AR-J2-029   Customer Scorecard Mirror
            per OEM × per period; ingest OEM scorecard data;
            reconcile with internal quality KPIs; gap analysis;
            trend over rolling 12 months
            Schema: scorecard_id, oem_id, period, metrics[{name,
              target, actual, color}], trend, gap_items[]
```

---

## 3. State machines (pack-specific)

### SM-APQP (AIAG 5-phase)

```
States: phase-1-plan-define → phase-2-product-design-dev →
        phase-3-process-design-dev → phase-4-product-process-validation →
        phase-5-feedback-corrective-improvement → project-closed

Phase advance: gated by deliverable register (all required items
  signed-off or explicitly risk-accepted with tracking);
  gate meeting minutes required per OEM CSR
BD-18 applies at Phase 4 → Phase 5 (PRR release); requires QP-equivalent
  co-sign at Phase 4 exit

Hard couplings:
  SM-7 (doc effectivity): FMEA + Control Plan effective before gate
  SM-3 (WO): production trial run in Phase 4 triggers SM-3
  SM-6 (CAPA): Phase 5 CAPA loop feeds back
```

### SM-PPAP

```
States: draft → element-collection → internal-review →
        submitted → customer-review →
        approved | interim-approved | rejected

Submission levels (AIAG PPAP 4th):
  Level 1: PSW only (warrant only to customer)
  Level 2: PSW + limited supporting data
  Level 3: PSW + all elements (default)
  Level 4: PSW + other requirements defined by customer
  Level 5: PSW + all elements reviewed at supplier manufacturing location

18 standard elements required at Level 3:
  Design record; engineering change documents; customer engineering
  approvals; DFMEA; process flow diagram; PFMEA; control plan; MSA
  study; dimensional results; material/performance test results; ISIR;
  process capability; qualified laboratory documentation; appearance
  approval report; PSW; bulk material PSW (where applicable); sample
  parts; checking aids. Plus OEM-specific additions.

BD-17 (PPAP submit): submission to OEM portal requires QP-equivalent
  + Automotive Lead co-sign; cannot be done by AI autonomously

Hard couplings:
  IMDS submission must be complete before PSW sign-off
  Customer EDI submission per E15 for OEMs with portal APIs
  SM-7 (doc effectivity) for all linked documents
```

### SM-LPA

```
States per cycle: planned → operator-audit → supervisor-audit →
                 manager-audit → senior-mgmt-audit → period-closed

Each layer has:
  - Defined question list (process + product + system)
  - Sample plan per cycle cadence
  - Finding classification (OK / NOK / OFI)
  - NOK finding automatically generates CAPA per H8 §7

Cadence (default, overridden by OEM CSR):
  Operator: daily (sampled, not 100%)
  Supervisor: weekly
  Manager: monthly
  Senior Management: quarterly

Escalation: consecutive NOK on same question → systemic CAPA per H8
```

### SM-8D

```
States: D1-team-formed → D2-problem-described →
        D3-containment-implemented → D4-root-cause-found →
        D5-permanent-action-selected → D6-action-implemented →
        D7-recurrence-prevention → D8-team-recognized → closed

Mandatory depth: D1–D8 for Major and Critical problems
Expedited: D1–D3 within 24h for customer-required containment
D4 root cause: at least one AI-assisted suggestion per AI-13
Customer-format export: 8D report generated per OEM template
  (Ford 8D, GM G8D, VW 8D, etc.)

Hard couplings:
  D6 CAPA per H8; mandatory evidence chain
  Customer EDI for warranty-driven 8D (warranty response per partner)
```

### SM-PRR (Production Trial Run / Production Readiness Review)

```
States: pre-trial-setup → trial-run-executed → measurement-and-analysis →
        reviewed → released | conditionally-released | hold

Pre-conditions:
  PFMEA + Control Plan effective (SM-7)
  Gauges calibrated and GR&R acceptable
  Operators trained per D8

BD-18 (PRR release): release to production volume requires
  Quality Lead + Automotive Lead co-sign; cannot be automated

Hard couplings:
  PPAP element: trial run results feed Cpk/Ppk evidence
  SM-APQP: Phase 4 requires PTR completion
```

### SM-WARRANTY

```
States: intake → triage (warranty vs NTF vs misuse) →
        root-cause-analysis → resolution-plan → implemented →
        cost-allocated → closed

Cost allocation: per supplier responsibility percentage
  (HESEM-tracked; reconciled with customer warranty portal where EDI)
8D triggered when supplier responsibility confirmed
Hard couplings: customer EDI for warranty reporting to OEM portals
```

### SM-ISO26262 (E/E components only)

```
ASIL-driven lifecycle per ISO 26262-2:2018:
  concept-phase → system-dev → hardware-dev → software-dev →
  production → operations → service

ASIL inheritance: from HARA (AR-J2-022) to component to
  sub-component (ASIL decomposition rules §5.4)
Validation depth per H2 scaled by ASIL:
  ASIL QM: standard PPAP
  ASIL A: medium validation depth + FMEDA
  ASIL B: full validation + FMEDA + safety case
  ASIL C/D: full + independent verification at each phase
```

---

## 4. Per-OEM CSR overlays (≥ 12 OEMs)

```
OEM              CSR SPECIFICS
─────────────────────────────────────────────────────────────────────
Ford Q1          Q1 achievement criteria (score-based); Ford-specific
                 8D format (8D SCAR + D-sheet); FAA (Field Action
                 Authorization) process; Ford PPAP variant (Q1 PPAP
                 addendum); MFMEA instead of DFMEA for manufacturing;
                 Ford SREA (Supplier Request for Engineering Approval)
                 for deviations; FMEA MFMEA mandatory for Q1 level

GM BIQS          BIQS levels 1–10 (Balanced Inventory Quality &
                 Speed); GM-specific problem-solving requirements;
                 GM Global Supply Chain portal integration; DQMP
                 (Dealer Quality Management Process) input for
                 warranty; GM PPAP variant; SPPC/APQP milestones

Stellantis       Stellantis Quality Manual; Stellantis PPAP variant
                 (CPSR / Customer Product Sample Review); Stellantis
                 supplier portal (SupplyPower); EWO (Engineering
                 Work Order) process; Stellantis risk assessment
                 template (SQAM-compliant)

Toyota           Toyota CRT (Corrective Response Track) for
                 containment; 7-step problem solving (Toyota A3
                 framework); TPS-aligned Quality Circles; Toyota
                 PPAP variant (TGA); supplier portal integration;
                 Global Quality Award criteria; QCSS scoring

VW Formel Q      FQ-Skills assessment; FQ-Capability criteria;
                 VDA 6.3 process audit mandatory; VDA 6.5 product
                 audit; VDA 19 cleanliness for applicable parts;
                 VQ (VW Quality) scoring; VW WBA (Work Breakdown
                 Assignment) format for 8D

BMW              BMW-specific PPAP (QME submission); BMW QM system
                 requirements; BMW supplier portal (SRM); BMW
                 initial sample inspection (iPPAP); AudiCon audit
                 reporting format

Hyundai / KIA    HKMC SQ-Mark program; HMC SQ (Supplier Quality)
(HKMC)           self-assessment; HKMC-specific PPAP variant;
                 Hyundai BIQS equivalent; layered audit evidence
                 submitted to HKMC portal

Nissan           Nissan-specific PPAP (ASES — Advanced Supplier
                 Evaluation System); Nissan quality form set
                 (NP-PPAP); Nissan EDI requirements

Honda            HOSS (Honda Original Supplier Standard) criteria;
                 AROP (Approved Representative On-site Program);
                 Honda-specific PPAP; PPAP + ISO 9001 alignment

Tesla            Tesla Quality Requirements (TQR) — lighter PPAP
                 footprint but tighter FMEA AP requirements;
                 faster iteration cadence; Tesla supplier portal
                 API integration; DFM (Design for Manufacturing)
                 feedback loops

Rivian           Rivian Quality Manual (EV-focused); PPAP variant
                 with battery-specific elements; cybersecurity
                 requirements for software components; Rivian
                 supplier portal

Lucid            Lucid-specific quality requirements; EV safety
                 + battery quality; ISO 26262 ASIL requirements
                 for E/E components; Lucid supplier portal

Geely / Volvo    VDA 6.3 + IATF baseline; Geely-specific CSRs
(supplemental)   for Chinese-market programs
```

CSR overlay is a parameterized rule pack per OEM × per program × per
part. Updates flow through H7 Class A CR + customer notification.
Tenant configures which OEM CSRs are active per program at pack
onboarding.

---

## 5. D1–D14 per-pack workflow overlays

```
D1 Order to Cash          EDI 850 PO → 855 PO Acknowledgement →
                          856 Advance Shipment Notice → 810 Invoice →
                          820 Payment Advice; 860 PO Change →
                          862 Shipping Schedule → 865 PO Change Ack →
                          997 Functional Ack; per-OEM EDI variants;
                          EDIFACT ORDERS / ORDRSP / DESADV / INVOIC
                          for EU-facing OEM programs

D2 Procurement to Pay     supplier qualification per IATF 16949
                          §8.4; CQI special process verification
                          for sub-tier; supplier scorecard per
                          AIAG; SCAR cycle tracked

D3 Plan to Produce        Control Plan effective + LPA cadence
                          current; special characteristics in
                          SPC monitoring; production order gates
                          at PPAP-approved status; APQP phase 3/4
                          gate evidence linked

D4 Receive to Inspect     incoming inspection per Control Plan
                          sampling plan; AQL per AIAG; dimensional
                          check for first-lot; IMDS verification
                          on material change; CQI cert verified
                          for special process parts

D5 Inspect to Disposition SPC out-of-control signal triggers
                          containment; sort plan per severity;
                          customer notification draft per CND
                          (AR-J2-026); yield monitoring per AI-12

D6 NC to CAPA             8D-driven (SM-8D mandatory for Major);
                          AIAG-VDA Action Priority feeds urgency
                          classification; 8D customer format export;
                          D3 containment SLA per OEM CSR (typ 24h)

D7 Document to Release    Control Plan / FMEA / PFD revisions per
                          ECO; SM-7 doc effectivity enforced; FAI
                          re-trigger if dimensional change per
                          IATF §8.5.1.3

D8 Train to Qualify       job-specific qualification cards; LPA
                          observer training; 8D team leader
                          certification; special process operator
                          certification per CQI

D9 Maintain to Restore    TPM (Total Productive Maintenance)
                          integration; OEE (Overall Equipment
                          Effectiveness) tracking; planned
                          maintenance linked to production scheduling

D10 Batch to Release       lot-level approval gate; PPAP-approved
                          status verified per production order;
                          Cpk/Ppk for special characteristics
                          meets target before release

D11 Release to Trace       VIN-back traceability; serial-or-lot
                          per part; 10-year retention for most OEMs
                          (longer for safety-critical); ELV tracing
                          required for IMDS-tracked substances

D12 Complaint to Recall    warranty trend threshold triggers 8D;
                          field-return cluster triggers recall
                          assessment; recall classification per
                          OEM and NHTSA / Transport Canada;
                          customer EDI for field action reports

D13 Audit to Remediate     LPA self-audit continuous; IATF 16949
                          surveillance audit cycle; VDA 6.3
                          process audit per OEM CSR; customer
                          audit support; DCMA support where
                          applicable

D14 Validate to Qualify    APQP phase 4 = validation lifecycle;
                          ISO 26262 safety lifecycle per ASIL;
                          Automotive SPICE per software level;
                          MSA / GR&R = gauge validation
```

---

## 6. Banned decisions (per L1)

```
BD-17  PPAP SUBMISSION TO OEM
       AI cannot autonomously submit a PPAP package to an OEM portal
       or generate a signed PSW. Submission requires explicit co-sign
       from Automotive Lead + Quality Engineer (or tenant-designated
       QP-equivalent). HESEM prepares the package; the submission
       action is a human-executed gate.
       Rationale: PPAP submission triggers OEM contractual obligations;
       errors require corrective action cycles with customer impact.
       Evidence: submission record per AR-J2-004 with dual human
       signatures before portal transmission.

BD-18  PRODUCTION READINESS REVIEW (PRR) RELEASE
       AI cannot autonomously transition a part number from trial /
       prototype status to approved-for-production-volume. PRR release
       requires Quality Lead + Automotive Lead co-sign.
       Rationale: releasing to production commits manufacturing capacity
       and customer delivery commitments; early release without evidence
       causes quality and delivery failures.
       Evidence: SM-PRR final state change record with quorum signatures.

BD-19  CUSTOMER NOTIFICATION OF DEVIATION (CND)
       AI cannot autonomously submit a deviation notification or
       deviation approval request to an OEM. CND requires formal
       human review: Automotive Lead + Quality Lead. The deviation may
       have regulatory or liability implications.
       Rationale: unauthorized deviations shipped to OEM violate
       PPAP conditions; recall liability; customer relationship damage.
       Evidence: AR-J2-026 signed before portal submission.
```

---

## 7. APIs (pack-specific)

```
API                              MECHANISM      DESCRIPTION
────────────────────────────────────────────────────────────────────
APQP project + phase API         E3 + E7        create/update/read APQP
                                                project; advance phase
                                                with evidence check
PPAP submission package          E13 LRO        assemble all 18 elements;
generator                                       validate completeness;
                                                estimate missing items
PSW signature API                E7             digital sign workflow
                                                per AR-J2-003; BD-17
                                                quorum gate
Control Plan CRUD + SPC link     E3             manage control plan;
                                                link CC/SC to SPC monitor
GR&R study API                   E3             create study; record
                                                operator measurements;
                                                compute %GRR + ndc
ISIR management API              E3             create/update per OEM
                                                form; link to PPAP element
Special process cert API         E3 + E10       lifecycle + expiry alert;
                                                re-cert trigger
Annual layout API                E3             schedule + record layout;
                                                comparison to drawing
Customer EDI engine              E15 per OEM    850/855/856/810/820/860/
                                                862/865/997 + EDIFACT;
                                                per-OEM EDI map; ack
                                                tracking; error retry
SCAR API                         E3 + E7        SCAR create; D1-D8 step
                                                advance; timeline SLA
                                                tracking per OEM window
LPA submission API               E3             layer-specific audit run;
                                                findings; auto-CAPA trigger
8D workflow API                  E3 + E7        D1-D8 structured record;
                                                AI-assisted D4 per AI-13;
                                                OEM-format PDF export
Warranty claim ingestion         E15            ingest from OEM portal or
                                                EDI 820; link to part lot;
                                                triage queue
Field return ingestion           E15            RMA intake; analysis record;
                                                NTF classification
IMDS submission API              E15            submit to IMDS portal;
                                                track acceptance status;
                                                alert on rejection
CND drafting + submission        E15 + E7       BD-19 gate; approval flow;
                                                portal submission per OEM
DFMEA / PFMEA API                E3             AIAG-VDA 2019 7-step
                                                structure; AP lookup;
                                                action tracking
HARA / ASIL API (E/E)            E3             ISO 26262 hazard analysis;
                                                ASIL determination; cascade
                                                to H2 validation depth
Cybersecurity TARA API           E3             ISO 21434 TARA; CAL
                                                determination; linked
                                                cyber controls tracking
PTR planning + result API        E3 + E7        trial run setup; capability
                                                results; BD-18 gate
AI-12 yield advisor              AI feature     statistical yield model;
                                                pre-production yield
                                                prediction; advisory only
AI-25 schedule advisor           AI feature     APQP phase schedule risk;
                                                milestone delay prediction;
                                                advisory only
AI-29 outlier detector           AI feature     SPC outlier + control
                                                chart anomaly detection;
                                                advisory flag to operator
Customer scorecard mirror        E15            ingest OEM scorecard;
                                                reconcile; trend display
```

---

## 8. UI surfaces

```
APQP Workspace + Project Detail   5-phase pipeline; deliverable
                                  completeness gauge per phase;
                                  gate meeting prep checklist;
                                  AI-25 schedule risk flag

PPAP Submission Wizard            guided 18-element assembly;
(18-element)                      level selector (1–5); element
                                  status dashboard; pre-flight
                                  completeness check; signed PSW
                                  export; BD-17 quorum step

Control Plan Workspace            per-characteristic table; CC/SC/
                                  KPC/KCC badge; SPC chart thumbnail;
                                  gauge link; reaction plan visible

GR&R Study Workspace              study planning; operator data
                                  entry; automated %GRR + ndc
                                  calculation; acceptance decision

Special Process Cert Console      CQI per-process cert status;
                                  expiry countdown; findings log;
                                  re-cert workflow launch

Warranty + Field Return           trend chart per program; cluster
Workspace                         analysis; cost allocation table;
                                  8D trigger button

LPA Audit Runner                  per-layer question list; mobile-
                                  friendly; shopfloor tablet layout;
                                  finding entry; CAPA auto-draft

8D Investigation Workspace        D1–D8 panel tabs; AI-13 RCA
                                  suggestions; timeline SLA bar;
                                  OEM-format PDF export button

EDI Transaction Viewer            per-partner transaction log;
                                  ack status; error queue; retry

DFMEA / PFMEA Workspace           AIAG-VDA 2019 7-step columns;
                                  AP traffic-light; action tracker;
                                  link to Control Plan

HARA / ASIL Workspace (E/E)       hazardous event table; ASIL
                                  determination result; decomposition
                                  cascade view

Cybersecurity TARA Workspace      threat table; CAL badge; attack
(ISO 21434)                       path description; control linkage

CND Drafting + Approval           CND form; OEM-specific template;
                                  approval routing; BD-19 sign gate;
                                  portal submission status

PPAP Cockpit per OEM              OEM-specific PPAP layout;
                                  submission portal integration;
                                  OEM scorecard mirror
```

---

## 9. Pack discipline

```
ITEM                              DETAIL
────────────────────────────────────────────────────────────────────
2-person e-signature              APQP phase advance, PPAP PSW sign,
                                  CND submission, PRR release all
                                  require dual human sign; BD-17..BD-19
                                  enforce this gate

PPAP submission level per OEM     Level 1–5 per OEM × per part;
                                  default Level 3 unless OEM CSR
                                  specifies otherwise; level stored
                                  in CSR rule pack per OEM

AIAG-VDA 2019 Action Priority     AP (H/M/L) replaces legacy RPN as
                                  primary risk indicator; AP lookup
                                  table (Severity × Occurrence ×
                                  Detection) is canonical; old RPN
                                  retained as informational only

Special characteristics taxonomy  CC (Critical Characteristic) /
                                  SC (Significant Characteristic) /
                                  KPC (Key Product) / KCC (Key Control);
                                  taxonomy per OEM CSR (Ford uses CC/SC;
                                  VW uses D/E; GM uses CC/SC); auto-
                                  enrolled in SPC monitoring on creation

IMDS submission discipline        IMDS data must be accepted before
                                  PSW sign-off; IMDS item ID required
                                  in PPAP element record; substance
                                  review against REACH/RoHS/ELV

LPA cadence compliance           Missed LPA cycle = H6 finding;
                                  2 consecutive misses = H8 CAPA;
                                  LPA cadence per OEM CSR enforced
                                  (some OEMs inspect LPA records
                                  during customer audits)

Per-OEM EDI conformance           EDI transaction sets conform to OEM
                                  implementation guide; GIEDI / OEM
                                  EDI test certificate per partner;
                                  ack 997 tracking mandatory

SCAR response window per OEM      Initial containment: 24–72h (OEM-
                                  specific); D4 root cause: 7 days;
                                  D7 permanent action: 30 days;
                                  windows configurable per OEM CSR

Special process re-cert cadence   Per CQI requirement: CQI-9 (2 yr);
                                  CQI-11 (varies); CQI-12 (2 yr);
                                  CQI-15 (2 yr); CQI-17 (varies);
                                  alert at T-90 + T-30; production
                                  blocked on expiry

Customer scorecard auto-mirror    Ingest OEM portal scorecard data
                                  (where API available); reconcile
                                  internal metrics vs external score;
                                  trend displayed in PPAP Cockpit

ISO 26262 ASIL cascade            ASIL from HARA cascades to:
                                  validation depth (H2), V&V test
                                  coverage, independent review
                                  requirement, safety case artifact
                                  requirements

ISO 21434 TARA + monitoring       For E/E with network interface;
                                  TARA required at concept phase;
                                  continuous post-production cyber
                                  monitoring per ISO 21434 §13

Automotive SPICE process          For software-heavy components:
levels                            ASPICE target level per OEM CSR
                                  (typically level 2 for Tier-1; level 3
                                  for safety-critical); evidence per
                                  process area per assessment

Production volume release gate    No part shipped at production volume
(BD-18 enforcement)               until PRR complete + PPAP approved +
                                  Control Plan effective + LPA active
```

---

## 10. AI advisory features

```
AI-12 YIELD ADVISOR
  Statistical yield model trained on historical run data per part
  family; pre-production yield prediction before PTR; inputs:
  material lot, process parameters, operator, equipment.
  Advisory only: output is a probability distribution + risk flag.
  Human reviews before PTR go/no-go decision. Confidence shown in UI.

AI-25 SCHEDULE ADVISOR
  APQP phase schedule risk prediction; flags phases with > 30%
  probability of milestone delay based on deliverable completion
  rate and historical comparable programs. Advisory only: surfaces
  risk; PM makes decision. Shown in APQP Workspace phase timeline.

AI-29 SPC OUTLIER DETECTOR
  Real-time SPC control chart anomaly detection; Western Electric
  rules + OEM-specific rule sets applied to incoming measurements;
  generates advisory flag to operator and Quality Engineer. Does
  not autonomously stop production; SEV determination is human.
  Output: pattern identified, rule triggered, confidence, recommended
  action options.

AI-13 8D ROOT CAUSE ASSISTANT (from HESEM AI feature catalog)
  Contextual root cause suggestion based on symptom description,
  historical 8D for similar parts/processes, and FMEA failure mode
  database. Advisory: shows top-3 root cause hypotheses with
  supporting evidence references. Human team selects or overrides.
```

---

## 11. Pack KPIs

```
KPI                                   TARGET / NOTE
─────────────────────────────────────────────────────────────────────
PPAP first-time approval rate          ≥ 95%; tracked per OEM
APQP phase on-schedule rate            ≥ 85% of milestones on plan
LPA finding closure rate               ≥ 90% within cadence window
Warranty PPM by program               downward trend; target vs OEM
                                       scorecard benchmark
COPQ (Cost of Poor Quality) trend      tracked per quarter; target
                                       year-over-year reduction
Customer scorecard color               ≥ 90% of OEM programs in Green
8D cycle time D1–D8                    D3 within 24h; D7 within 30d
Special process cert compliance        100% (any expiry = finding)
IMDS submission timeliness            100% before PSW sign-off
CND rate                               tracked; downward target; zero CND
                                       from same root cause twice
Process capability (Cpk/Ppk)           ≥ 1.67 for CC/SC (target) /
per characteristic                     ≥ 1.33 minimum
Cleanliness conformance (VDA 19)       per spec limits where applicable
ISO 26262 ASIL evidence completeness   per ASIL level per item; 100%
                                       required for ASIL C/D
AI-12 yield prediction accuracy        tracked (rolling MAE)
AI-29 alert precision                  tracked (false positive rate < 10%)
```

---

## 12. Audit pack contents (Automotive-specific addition to H3 §4)

```
Section                                   Evidence Class
────────────────────────────────────────────────────────────────────
01  IATF 16949 conformance cert + Sanctioned Interp compliance     EC-1
02  ISO 9001 conformance evidence                                  EC-1
03  Per-customer CSR conformance attestation per active OEM        EC-14
04  12-month LPA records per layer per cycle                       EC-14
05  Internal audit records: process + product + layered            EC-31
06  Management review minutes (last 24 months)                     EC-14
07  CAPA log + 8D investigations (last 36 months)                  EC-6
08  Supplier monitoring records + SCAR log                         EC-14
09  Customer scorecard mirror (last 12 months per active OEM)      EC-36
10  COPQ trend (last 24 months)                                    EC-36
11  Annual layout inspection results per part (last 2 cycles)      EC-14
12  Special process certifications per CQI + renewal evidence      EC-1
13  PPAP submissions per active part per OEM (current + prior)     EC-14
14  Control Plans with full revision history                       EC-14
15  DFMEA / PFMEA with action priority records                     EC-14
16  MSA (Gauge R&R) records per gauge per characteristic           EC-14
17  SPC charts per special characteristic (last 12 months)        EC-36
18  Process capability summary per characteristic (Cpk / Ppk)     EC-36
19  IMDS submission records per active part                        EC-14
20  Customer EDI compliance evidence per active partner            EC-14
21  Warranty claim trend + 8D analysis (last 24 months)           EC-6
22  Field return analysis summary                                  EC-6
23  Cleanliness program records per VDA 19 scope (where applicable) EC-14
24  ISO 26262 evidence per ASIL-classified component               EC-14
25  ISO 21434 TARA + monitoring evidence per E/E component         EC-14
26  Automotive SPICE assessment records (where applicable)         EC-14
27  Production trial run results per current active program        EC-14
28  Reliability demonstration records (where OEM CSR requires)     EC-14
```

---

## 13. Failure modes

```
FM1   PPAP submission rejected by OEM
      Root cause: element incomplete; GR&R unacceptable;
        Cpk below threshold; DFMEA action not closed
      Recovery: root cause per element; targeted re-work;
        resubmit; LPA on process; H8 CAPA on submission
        readiness assessment

FM2   LPA cycle missed (layer)
      Root cause: operator not scheduled; question list
        outdated; ownership gap
      Recovery: H6 periodic-review mechanism surfaces;
        certification at risk; OEM audit finding likely;
        H8 CAPA on LPA calendar governance

FM3   Special process cert expired (CQI)
      Root cause: alert suppressed; re-cert not scheduled;
        audit finding delayed
      Recovery: production blocked for affected lots immediately;
        re-cert workflow initiated; customer notification
        per CND (BD-19 required); H8 CAPA

FM4   IMDS submission late or rejected
      Root cause: supplier material data not collected;
        IMDS format error
      Recovery: PSW gate stops; supplier SCAR; H8 CAPA
        on IMDS data collection discipline

FM5   ASIL allocation incorrect (E/E component)
      Root cause: hazard analysis scope too narrow; new
        vehicle integration context not captured
      Recovery: HARA review + re-allocation; downstream
        validation depth re-baselined; notify OEM per
        ISO 26262 change management; H8 systemic CAPA

FM6   ISO 21434 cybersecurity TARA finding not actioned
      Root cause: TARA finding deprioritized post-analysis;
        ownership gap between cyber team and product team
      Recovery: per I7 §1; OEM notification per cyber
        agreement; accelerated control implementation; H8
        systemic CAPA on TARA follow-through

FM7   Customer scorecard color drops to RED
      Root cause: warranty PPM spike; audit finding; delivery
        miss; PPAP rejection pattern
      Recovery: customer notification; joint action plan;
        HESEM-supported CAPA per H8; escalation to Automotive
        Lead; QBR review per I8 §5
```

---

## 14. Cross-references

- H1 §2.3 — Automotive regulatory inventory
- H8 §4 — 8D mapped to CAPA problem statement
- H9 §5 — AIAG-VDA FMEA as risk framework
- L1 — banned decisions BD-17..BD-19
- L2 — AI features overlay (AI-12 yield, AI-13 RCA, AI-25 schedule,
         AI-29 outlier)
- D14 — APQP as equivalent to validation lifecycle
- E15.8 — EDI integration sets (850/855/856/810/820/860/862/865/997
           + EDIFACT)
- I7 §10.3 — automotive cybersecurity (ISO 21434)
- I8 §6 — per-tenant change management with OEM freeze windows
- M3 — root catalog (AR-J2-001..AR-J2-029)
- M9 — cross-reference index

---

## 15. Decision phrase

```
J2_AUTOMOTIVE_V10_LOCKED
NEXT: J3_AEROSPACE.md
```
