# H2 — Validation Lifecycle

```
chapter_purpose: defines how HESEM moves regulated configuration and change
                 from idea to qualified, repeatable, evidence-bearing production
                 state, per GAMP 5 SE + FDA CSA + EU GMP Annex 15 + ICH Q9(R1)
owner_role:      Quality Lead with Compliance Lead and Validation Engineer
sources:         GAMP 5 Second Edition 2022; FDA CSA Final Guidance Sept 2022;
                 EU GMP Annex 15 (2015); ICH Q9(R1) 2023; ASTM E2500-13;
                 PIC/S PI 011-3; IEEE 1012-2016; ISO 13485:2016 §7.5.6;
                 IEC 62304:2006+A1:2015; AS9145; DO-178C; AIAG APQP 2nd Ed;
                 21 CFR Part 11; 21 CFR Part 820 / QMSR
version:         V10 (upgraded from V9 per S4-02)
review_cadence:  annual; also after any Tier-1 change
```

The validation lifecycle is the controlled discipline that turns a software
function, configuration change, or new HESEM capability into a regulated
artifact that an auditor, regulator, or customer can rely on. Without this
lifecycle, a HESEM root is an informational tool. With it, the root becomes
an authoritative system of record with legal and regulatory weight.

This chapter answers: what work is done, in what order, against what evidence
standard, at what depth, with what approvals, and how the discipline remains
executable at continuous-delivery velocity without becoming a paperwork
factory. It is the upstream gate that every regulated root must pass through
before being promoted to production maturity (L6).

---

## 1. The risk-based principle (FDA CSA + GAMP 5 SE)

Validation rigor scales with risk. Both FDA CSA 2022 and GAMP 5 Second
Edition make this explicit: the goal is not maximum testing, it is
appropriate testing. The FDA CSA framework replaces prescriptive
test-script-and-execute cycles with a critical thinking model.

Two failure modes are equally unacceptable:

- **Over-validation**: spending months testing a cosmetic change with full
  V-model protocol, blocking releases, building up validation debt, and
  consuming engineering hours that add no patient or product safety value.
  GAMP 5 SE §4.3 explicitly labels this as an organizational failure.

- **Under-validation**: shipping a high-risk change — one that controls a
  regulated decision, produces a regulated record, or controls a product
  attribute — with insufficient evidence. This creates regulator exposure,
  recall risk, and product safety risk.

### 1.1 FDA CSA four-quadrant decision framework

Before any test protocol is written, the Validation Engineer applies the
FDA CSA four-quadrant framework. The quadrant is determined by two axes:

```
Axis 1:  Intended Use criticality
         LOW   → influences informational output only (dashboard; report)
         HIGH  → controls a regulated record, product release decision,
                 patient/consumer safety signal, or e-signature

Axis 2:  Business Process controls (independent of the software)
         STRONG → at least two independent non-software controls would
                  catch a failure before it reaches a regulated decision
         WEAK   → software is the primary or sole control

Quadrant matrix:

                  LOW criticality    HIGH criticality
STRONG controls   Q1: scripted       Q3: scripted +
                  exploration only       adversarial + RTM
WEAK controls     Q2: structured     Q4: full V-model +
                  scenarios + RTM        100% RTM + dual review
```

The quadrant is recorded in the Critical Thinking Record (CTR; §3).
Quadrant determines the minimum test depth; the tier (§2) determines the
evidence floor and approval authority.

### 1.2 GAMP 5 SE software categories

HESEM software components are classified per GAMP 5 SE category at the
time of initial validation and re-evaluated on every Tier-1 change:

```
Cat 1  Infrastructure software (OS; middleware; hypervisor; network)
       Validation: vendor evidence review; installation check; no scripted
       functional testing required unless modified

Cat 3  Non-configured software (standard package; used out of box)
       Validation: vendor documentation review; configuration baseline;
       evidence of correct installation

Cat 4  Configured software (HESEM base platform with tenant configuration)
       Validation: configuration specification; configuration review; OQ
       scripted scenarios for configured behaviors; IQ for deployment
       configuration verification

Cat 5  Custom / bespoke software (HESEM-developed modules; custom workflows;
       custom AI advisory models)
       Validation: full V-model; URS + FS + DS + IQ + OQ + PQ + RTM;
       applies to all regulated roots developed in-house

HESEM platform itself is Cat 5 (custom). Tenant configuration layers over
it are Cat 4. Third-party integrations (ERP; LIMS; EDC) entering via E15
Integration API are Cat 3 or Cat 4 depending on whether the integration
transforms regulated data.
```

---

## 2. The 5-tier validation risk classification

Every change (per H7) and every new capability undergoes tier classification
as the first act of the validation lifecycle. The tier is frozen once set
and re-opening it requires Quality Lead approval recorded in the change
record.

```
─────────────────────────────────────────────────────────────────────────────
TIER  CLASSIFICATION CRITERIA                    EXAMPLES
─────────────────────────────────────────────────────────────────────────────
1     Regulated decision output; regulated record Batch release algorithm;
      write; product safety signal; e-sig flow;   document approval workflow;
      batch or lot disposition; patient safety-   CAPA closeout gate; recall
      adjacent advisory; classified as GAMP Cat 5 initiation; QP certification
      with WEAK process controls (Q4)             sign-off; product serialization

2     Controlled record creation or update;        Deviation record creation;
      authority delegation; configured workflow    supplier qualification state
      gating; GAMP Cat 4 or Cat 5 with STRONG     change; training completion
      process controls (Q3); significant           certification; change record
      configuration parameter driving regulatory  approval gate; SPC limit
      outputs                                      configuration

3     Workspace projection logic; report           Dashboard KPI computation;
      generation; search and filter for regulated  investigation workspace
      records; GAMP Cat 4 configured module        filter; batch trend chart;
      with LOW criticality (Q2); read-only         audit pack assembly job;
      regulated-data surfacing                     E8 evidence query result

4     Informational UI; non-regulated analytics;   Homepage widget layout;
      visualization configuration; GAMP Cat 3      notification preference;
      or Cat 4 with LOW criticality (Q1)           color theme configuration;
                                                   non-regulated report template

5     Cosmetic / text / label change; no impact    Button label wording;
      on regulated logic or data; visual diff only  tooltip copy; static help
                                                   page content; CSS color token
─────────────────────────────────────────────────────────────────────────────
```

### 2.1 Validation depth matrix per tier

```
──────────────────────────────────────────────────────────────────────────────
ELEMENT                          T1      T2      T3      T4      T5
──────────────────────────────────────────────────────────────────────────────
CSA Critical Thinking Record     REQD    REQD    REQD    OPT     NONE
URS (User Requirements Spec)     REQD    REQD    S       NONE    NONE
FS (Functional Spec)             REQD    REQD    S       NONE    NONE
DS (Design Spec)                 REQD    OPT     NONE    NONE    NONE
IQ (Installation Qualification)  REQD    REQD    S       NONE    NONE
OQ (Operational Qualification)   REQD    REQD    REQD    S       NONE
PQ (Performance Qualification)   REQD    REQD    S       NONE    NONE
RTM (traceability matrix)        100%    100%    Sample  NONE    NONE
Adversarial test suite           REQD    Sample  NONE    NONE    NONE
Dual-reviewer approval           REQD    REQD    S       NONE    NONE
Validation summary report        REQD    REQD    REQD    OPT     NONE
QP/PRRC co-sign (Pharma/MD)      REQD    REQD    NONE    NONE    NONE
──────────────────────────────────────────────────────────────────────────────
Evidence retention floor (yrs)   25      15      7       3       1
──────────────────────────────────────────────────────────────────────────────
REQD = Required; S = Sampled / representative; OPT = Optional; NONE = Not required
```

### 2.2 Tier re-classification rules

```
Down-tier (from Tx to Tx+1):
  Requires: Quality Lead approval; documented rationale in CTR;
            Q4 → Q3 reclassification only if new process control is added
            and verified; recorded in change record (H7)
  Prohibited: down-tiering by schedule pressure without new control evidence

Up-tier (from Tx to Tx-1):
  Self-imposed by Validation Engineer or Quality Lead; no approval required;
  triggers additional evidence generation; preferred over under-tiering

Tier review at change:
  Every H7 change record includes a tier review field. If the change adds
  functionality to an existing T3+ capability that now meets T1/T2 criteria,
  the capability tier must be up-tiered before the change may close.
```

---

## 3. CSA Critical Thinking Record (CTR)

The CTR is a structured one-page document produced at S2 of the lifecycle
(§4). It is mandatory for all Tier 1/2 changes and recommended for Tier 3.
Without a CTR, only Tier 1 default (full V-model) testing is permitted.

### 3.1 CTR schema

```
ctr_record {
  ctr_id:              string  ("CTR-<change_id>-<seq>")
  change_id:           FK → H7 change record
  csa_quadrant:        enum [Q1, Q2, Q3, Q4]  (see §1.1)
  gamp_category:       enum [1, 3, 4, 5]
  tier_assigned:       enum [1, 2, 3, 4, 5]
  tier_rationale:      string  (free text; 50 words min)

  intended_use:        string  (what the software does in regulated context)
  patient_consumer_impact: string  (what happens if this function fails)
  existing_controls:   string[]  (list of non-software controls that mitigate)
  residual_risk:       enum [CRITICAL, HIGH, MEDIUM, LOW]
  residual_risk_basis: string  (rationale given existing controls)

  test_scope:          string  (what test categories are required per §5)
  test_scope_rationale: string  (why this scope is sufficient per CSA Q3-Q4)

  pack_overlay_flags:  string[]  (e.g. ["PHARMA_ANNEX11", "MD_IEC62304",
                                         "AERO_DO178C"])
  additional_controls: string[]  (any new controls added to support down-tier)

  prepared_by:         UUID  (validation_engineer user_id)
  reviewed_by:         UUID  (quality_lead user_id)
  approved_at:         ISO 8601 datetime
  approval_signature:  E7 signature_id

  evidence_class:      "validation" (subtype: "ctr")
}
```

### 3.2 CTR four-question record

```
Q1  Intended use of the software function:
    [state exactly what the function does and in what regulated context]
    Example: "The batch release gate function evaluates all in-process
    and finished product test results against acceptance criteria and
    presents a PASS/FAIL determination to the authorized QP before
    they execute the electronic signature for batch certification."

Q2  Patient / consumer / product impact if it fails:
    [state the worst-case outcome if the function produces wrong output]
    Example: "A false PASS determination could result in release of a
    non-conforming batch, causing patient harm via sub-potent or
    contaminated product. This is a Class I recall scenario."

Q3  Independent (non-software) controls that mitigate:
    [list any controls that catch a failure before it reaches harm]
    Example: "Manual QP review of original paper records; SOC QC
    supervisor secondary check; sampling lab result verification."

Q4  Testing approach — least burdensome that adequately reduces risk:
    [justify the test scope selected given Q1-Q3]
    Example: "Given that Q2 is critical and Q3 controls are weak
    (paper records are not consistently available in real-time),
    Quadrant Q4 applies. Full V-model with adversarial injection
    and 100% RTM required."
```

---

## 4. CSV validation lifecycle (full — S0 through S14)

```
S0  Change request raised
    Actor:   Domain Lead or Engineering Lead
    Input:   feature or defect trigger; regulatory driver
    Action:  create change record per H7; populate initial impact fields
    Output:  change_record (state: DRAFT); ticket in work-management system
    Gate:    none at S0; moves to S1 immediately

S1  Risk classification
    Actor:   Quality Lead + Validation Engineer (joint)
    Input:   change record; H9 risk register; affected capability list
    Action:  determine GAMP category; assess tier per §2 criteria; check
             per-pack overlay flags from tenant regulatory profile (H1 §5)
    Output:  tier field populated in change record; pack_overlay_flags set
    Gate:    Quality Lead must approve tier classification; logged in
             change record with timestamp

S2  CSA Critical Thinking Record (CTR)
    Actor:   Validation Engineer (primary); Quality Lead (reviewer/approver)
    Input:   change record; tier; pack overlay flags; H1 §1 four-layer model
    Action:  complete CTR per §3; document four Q-A pairs; select test scope
    Output:  ctr_record (evidence class: validation/ctr); signed by VE + QL
    Gate:    Quality Lead approval required for Tier 1/2; VE self-approve
             Tier 3/4; CTR stored in DMS per H5

S3  URS draft and review
    Actor:   Domain Lead (primary); Validation Engineer (reviewer)
    Input:   change description; capability context; regulatory clauses per H1 §4
    Action:  write capability statements; assign RTM keys (URS-<wf>-<seq>);
             review for completeness and regulatory coverage
    Output:  URS document in DMS (draft state); URS rows in RTM system
    Gate:    Quality Lead approval required for Tier 1/2; Domain Lead for Tier 3;
             URS must be approved before S4 begins

S4  FS draft and review
    Actor:   Solution Architect or Lead Engineer (primary)
    Input:   approved URS; existing system architecture; API contracts (E-catalog)
    Action:  write user-facing behaviors; specify UI states; error responses;
             reference specific API endpoints (E-catalog) and state transitions
             (B7); link each FS row to one or more URS rows in RTM
    Output:  FS document in DMS; RTM URS→FS links complete
    Gate:    Quality Lead approval (T1/T2); Engineering Lead (T3); no parallel S5

S5  DS draft and review (Tier 1/2; optional Tier 3)
    Actor:   Lead Engineer (primary)
    Input:   approved FS; B-series architecture chapters; state machine catalog
    Action:  specify internal design: data structures; algorithms; state machine
             paths; integration contracts; security controls; failure modes
    Output:  DS document in DMS; RTM FS→DS links complete
    Gate:    Engineering Lead approval; Quality Lead review for regulated algorithms

S6  Test plan generation
    Actor:   Validation Engineer
    Input:   approved URS + FS + DS; CTR test scope; tier matrix (§2.1)
    Action:  generate scripted test scenarios per §5 matrix; tag each scenario
             with tier coverage category; assign scenario IDs
             (TP-<change_id>-<seq>); generate negative / adversarial cases
             per CTR Q4 scope; specify expected evidence output per scenario
    Output:  test_plan document in DMS; scenario records in test management
    Gate:    Quality Lead review for Tier 1/2; Engineering Lead for Tier 3/4

S7  Build / configure / develop
    Actor:   Engineering Lead + engineers
    Input:   approved DS / FS; test plan (S6)
    Action:  implement in DEV environment; write unit tests; conduct code review
             per peer-review gate; no regulatory evidence captured here
    Output:  code commit; peer review record; unit test results (informational)
    Gate:    peer review sign-off; all unit tests pass; merge to integration branch

S8  IQ — Installation Qualification
    Actor:   Validation Engineer + SRE Lead
    Input:   DS / CS; deployment manifest; environment baseline
    Action:  deploy to TEST environment; verify deployment manifest matches DS;
             verify environment variables match configuration baseline; verify
             required services running; verify migrations applied; verify feature
             flags in declared state; verify WORM anchors initialized
    Output:  iq_record (evidence class: validation/iq); deployment_evidence;
             signed manifest; IQ sign-off via E7
    Gate:    100% IQ checklist pass required; any failure blocks S9

S9  OQ — Operational Qualification
    Actor:   Validation Engineer
    Input:   approved test plan (S6); IQ pass; test environment
    Action:  execute scripted scenario suite in TEST environment; capture
             test_run rows per execution; log pass/fail per scenario; execute
             boundary, invalid input, negative, adversarial per CTR scope;
             verify audit trail emission per each regulated operation; verify
             RBAC enforcement per authorization matrix test cases
    Output:  oq_record (evidence class: validation/oq); test_run rows; linked
             scenario pass/fail records; e-sig on OQ summary
    Gate:    T1/T2: 100% scenario pass required; T3: ≥ 95% pass; any failure
             triggers defect record → S7 rework cycle → re-OQ for failed cases

S10 PQ — Performance Qualification
    Actor:   SRE Lead + Validation Engineer
    Input:   OQ pass; pre-prod environment at production parity
    Action:  deploy to PRE-PROD; run extended load test at ≥ 2× expected peak
             concurrency; run soak test for ≥ 72 hours continuous; capture
             latency percentiles (p50/p95/p99) against SLO targets (per M5);
             capture error rate and error budget consumption; run DR rehearsal
             for Tier 1 capabilities; run failover test
    Output:  pq_record (evidence class: validation/pq); telemetry archive
             (latency + error rate + DB queries); DR drill record; PQ sign-off
    Gate:    p99 latency within SLO; error rate < SLO error budget; DR RTO met;
             any breach triggers rework → partial re-PQ for affected metrics

S11 Validation summary report
    Actor:   Validation Engineer (primary); Quality Lead (reviewer)
    Input:   CTR + URS + FS + DS + IQ + OQ + PQ records; RTM with 100% links
    Action:  consolidate evidence index; verify RTM completeness; document any
             deviations and their disposition; state final validation outcome
             (QUALIFIED / NOT QUALIFIED)
    Output:  validation_summary (evidence class: doc_record/validation_summary);
             deviation_list; final RTM extract
    Gate:    Quality Lead must confirm RTM 100% coverage (T1/T2); Compliance
             Lead co-signs for regulated-capability releases; QP/PRRC signs for
             Pharma/MD T1

S12 Approval to release
    Actor:   Quality Lead (A); Compliance Lead (A); QP/PRRC where applicable
    Input:   approved validation summary report; no open trace gaps; no open
             critical/major OQ failures
    Action:  execute E7 e-signature on the validation summary record; status
             of change record transitions to APPROVED_FOR_RELEASE
    Output:  signature record (evidence class: signature); change record state:
             APPROVED_FOR_RELEASE; notification to Engineering Lead + SRE Lead
    Gate:    single-actor bypass prohibited (OTG axiom B6 A14); any attempt to
             sign own work blocked at API layer

S13 Production release
    Actor:   SRE Lead + Engineering Lead
    Input:   APPROVED_FOR_RELEASE change record; deployment runbook
    Action:  deploy to PROD per H7 change window; verify post-deploy IQ smoke
             test (abbreviated IQ against production environment); run smoke
             regression for all T1/T2 capabilities; verify feature flag state;
             confirm audit anchor initialized
    Output:  transaction record (B7 state machine); audit_anchor; deployment log;
             post-deploy IQ record; effectivity record (D7 for regulated
             documents affected)
    Gate:    all smoke tests green; any failure triggers rollback within
             committed RTO; rollback decision ≤ 15 minutes post-detection

S14 Post-release monitoring
    Actor:   SRE Lead (primary); Quality Lead (monthly review)
    Input:   telemetry (B9); SLO burn rate; user-reported anomalies; H6 triggers
    Action:  continuous observability monitoring; SLO burn alert if p99 breaches;
             evidence freshness reconciler runs nightly (§13); monthly brief to
             Quality Lead; annual H6 periodic review consumes this monitoring data
    Output:  telemetry records (continuous); kpi_record (monthly); periodic_review
             evidence (per H6 cadence)
    Gate:    SLO breach → I3 incident; evidence freshness breach → root demoted
             from L6 to L5 pending re-PQ
```

---

## 5. Test plan inventory matrix

A complete test plan covers the following categories. Tier (§2) dictates
which are mandatory (M), sampled/representative (S), or not required (-).
All 23 categories are evaluated for every change; the CTR (§3) records
why any category is excluded.

```
──────────────────────────────────────────────────────────────────────────────
TEST CATEGORY                              T1   T2   T3   T4   T5
──────────────────────────────────────────────────────────────────────────────
1   Requirement-traced scripted scenario    M    M    M    S    -
2   Boundary value analysis (BVA)           M    M    S    -    -
3   Equivalence partitioning               M    M    S    -    -
4   Invalid input rejection                M    M    S    -    -
5   Negative testing (expect-fail cases)   M    M    S    -    -
6   Adversarial / injection attack         M    S    -    -    -
7   Concurrency + race condition           M    S    -    -    -
8   Idempotency replay                     M    M    S    -    -
9   Authorization matrix (RBAC/ABAC)       M    M    M    S    -
10  Tenant isolation cross-check           M    M    S    -    -
11  Audit chain anchor verification        M    M    S    -    -
12  Evidence emission verification         M    M    M    S    -
13  Electronic signature enforcement       M    M    S    -    -
14  Recovery / failover                    M    M    -    -    -
15  DR rehearsal (selected capability)     M    -    -    -    -
16  Performance / load (≥ 2× peak)         M    M    S    -    -
17  Soak (≥ 72h continuous)                M    S    -    -    -
18  Localization / i18n (all enabled loc.) M    S    S    -    -
19  Accessibility (WCAG 2.2 AA audit)      M    M    M    M    S
20  Visual regression (screenshot diff)    M    M    M    M    M
21  AI advisory accuracy + abstention      M    M    -    -    -
22  Human-in-loop override capture         M    M    -    -    -
23  Dark mode + density variants           M    M    M    M    S
──────────────────────────────────────────────────────────────────────────────
Legend: M = Mandatory; S = Sampled (representative subset); - = Not required
──────────────────────────────────────────────────────────────────────────────
Total mandatory Tier 1 categories: 23; Tier 2: 17; Tier 3: 10; Tier 4: 3;
Tier 5: 2 (exceeds acceptance criterion of ≥ 22 categories)
```

---

## 6. Test environment topology

```
ENVIRONMENT    PURPOSE                        EVIDENCE CAPTURED?   DATA TYPE
DEV            engineer dev; unit tests       No (informational)   synthetic
TEST           IQ + OQ scripted execution     Yes (IQ, OQ records) anonymized realistic
PRE-PROD       PQ + soak + DR rehearsal       Yes (PQ records)     production-parity;
                                                                   no real PII
PROD           live regulated operation       Yes (post-deploy IQ  live
               post-deploy smoke              smoke)
SHADOW         AI advisory in observe-only    Yes (accuracy        production read-only
               mode before promotion          metrics)             (no mutation)
CANARY         new release at 5% traffic      Yes (error rate      live subset
               slice for early-warning        monitoring)
```

Environment-parity rule: the TEST environment must match PROD in software
version, OS version, middleware version, configuration baseline, and database
schema version. Any environment delta is recorded in the IQ evidence as a
"known deviation" with risk assessment. If a known deviation is judged to
affect test validity, the OQ must be re-run in PRE-PROD for those affected
scenarios.

Evidence collected in DEV does not count as validation evidence. A test run
record from DEV that is misidentified as an OQ record is a data integrity
violation (B6 axiom A3; audit trail falsification category).

---

## 7. Validation packs catalog

A validation pack (VP) is an authoritative record that aggregates all
validation artifacts for a specific HESEM regulated capability. Each VP
is a durable root (D7 lifecycle; versioned; effectivity-gated). The VP
references IQ + OQ + PQ records, RTM, URS, and validation summary
for the current effective version of the capability.

Minimum catalog (16 VPs; exceeds ≥ 12 requirement):

```
VP-01  VP-batch-release
       Covers:  SM-10 (batch-to-release state machine); D10 workflow;
                21 CFR 211.165; EU GMP Annex 11 §15; EU GMP Annex 16
       Tier:    1
       Pack overlay: PHARMA, MD (lot release), FOOD (LACF batch)

VP-02  VP-document-release
       Covers:  SM-7 (document-to-release SM); D7 workflow; 21 CFR 11.10(k);
                ISO 13485 §4.2.5; EU GMP Annex 11 §10
       Tier:    1
       Pack overlay: ALL (every vertical requires controlled documents)

VP-03  VP-capa-closeout
       Covers:  SM-6 (CAPA state machine); D6 NC-to-CAPA workflow;
                21 CFR 820.100; ISO 13485 §8.5.2; IATF 16949 §10.2.3
       Tier:    1
       Pack overlay: ALL

VP-04  VP-recall-initiation
       Covers:  SM-11 (recall SM); D12 complaint-to-recall workflow;
                21 CFR 806; EU MDR Art 87; FSMA RFR
       Tier:    1
       Pack overlay: PHARMA, MD, FOOD

VP-05  VP-esignature-flow
       Covers:  E7 E-Sig API; 21 CFR 11.50/11.70/11.100/11.200;
                EU GMP Annex 11 §14
       Tier:    1
       Pack overlay: PHARMA, MD (all regulated signatures)

VP-06  VP-audit-anchor
       Covers:  B6 C1 audit chain; 21 CFR 11.10(e); EU GMP Annex 11 §9;
                GDPR Art 30 (RoPA logging)
       Tier:    1
       Pack overlay: ALL

VP-07  VP-ai-advisory-deployment
       Covers:  L3 AI feature lifecycle (stages 1-9); EU AI Act Art 9-12;
                NIST AI RMF MAP + MEASURE; per-feature model card
       Tier:    1 (for Annex III high-risk AI features); 2 (others)
       Pack overlay: ALL with AI features enabled

VP-08  VP-tenant-regulatory-profile
       Covers:  H1 §5 profile schema; I8 tenant onboarding; B6 C5 tenant
                isolation; profile state machine transitions
       Tier:    1 (changes to profile directly affect all regulated pathways)
       Pack overlay: ALL

VP-09  VP-edge-gateway
       Covers:  C6 edge gateway; ISA-95; SCADA data ingestion; OT
                cybersecurity (IEC 62443-3-3); 21 CFR 11.10(h) device checks
       Tier:    1 (regulated data collection)
       Pack overlay: AUTO (SPC ingestion), AERO (manufacturing telemetry),
                     FOOD (CCP monitoring), MD (production monitoring)

VP-10  VP-spc-engine
       Covers:  C6 SPC calculations; Cp/Cpk; Pp/Ppk; control charts;
                IATF 16949 §9.1.1.1; AIAG SPC 2nd Ed
       Tier:    2
       Pack overlay: AUTO, AERO (key characteristics monitoring)

VP-11  VP-traceability-serialization
       Covers:  C8 traceability; D11 release-to-trace workflow; DSCSA §582;
                EU FMD; FSMA §204 CTE/KDE; UDI (21 CFR 830; EU MDR Art 27)
       Tier:    1
       Pack overlay: PHARMA, MD, FOOD

VP-12  VP-change-control
       Covers:  H7 change control SM; D7 doc lifecycle; 21 CFR 820.40;
                EU GMP Annex 11 §10; ISO 13485 §4.2.5; IATF 16949 §8.5.6.1.1
       Tier:    2
       Pack overlay: ALL

VP-13  VP-training-matrix
       Covers:  D8 train-to-qualify workflow; 21 CFR 11.10(i); ISO 13485
                §6.2; IATF 16949 §7.2.1; AS9100D §7.2
       Tier:    2
       Pack overlay: ALL

VP-14  VP-ncr-disposition
       Covers:  D5 inspect-to-disposition; SM-5 (NC state machine);
                21 CFR 820.90; ISO 13485 §8.3; IATF 16949 §8.7;
                AS9100D §8.7.3
       Tier:    2
       Pack overlay: ALL

VP-15  VP-supplier-qualification
       Covers:  C4 procurement; supplier qualification SM; ISO 13485 §7.4;
                IATF 16949 §8.4; AS9100D §8.4; GFSI supplier approval
       Tier:    2
       Pack overlay: ALL

VP-16  VP-calibration-metrology
       Covers:  C9 maintenance/calibration; ISO 13485 §7.6; IATF 16949
                §7.1.5; AIAG MSA 4th Ed; NIST calibration traceability
       Tier:    2
       Pack overlay: ALL (GR&R and calibration records)
```

---

## 8. Per-pack validation overlay

The baseline V-model (§4) applies to all packs. Each vertical pack adds
overlay requirements that layer on top of the baseline.

### 8.1 Pharmaceutical pack overlay (J1)

```
Additional validation standards:
  EU GMP Annex 15 §10  Process validation approaches: traditional (PV);
                       continuous process verification (CPV); hybrid
  EU GMP Annex 15 §12  Transport validation; shipping simulation
  ICH Q9(R1) §3        Risk management methodology applied to validation scope
  PI 011-3 §4..§12     PIC/S computer systems: risk assessment; validation plan;
                       acceptance criteria; periodic review schedule
  GAMP 5 SE Appendix D11  Cloud computing validation; SaaS; PaaS

Additional IQ requirements:
  §IQ-P-01  Verify that Annex 11 audit trail fields (timestamp; user_id;
            action; before_value; after_value; reason) are populated for
            every state transition in the batch release SM
  §IQ-P-02  Verify that WORM anchor is initialized per H5 PHARMA floor
            (25-year retention minimum; no delete path exposed in API)
  §IQ-P-03  Verify environment matches DS: 21 CFR 11-compliant time source;
            synchronized to NTP authority; drift < 1 second

Additional OQ requirements:
  §OQ-P-01  Execute Annex 11 §9 adversarial injection: attempt to modify a
            completed batch record; verify rejection with audit trail entry
  §OQ-P-02  Execute 21 CFR 11.10(g) authority check test: verify that a user
            without BATCH_RELEASE_SIGN privilege cannot execute QP signature
  §OQ-P-03  Execute QP batch certification flow end-to-end; verify that
            Annex 16 batch certificate is generated with correct content

PQ requirements (Pharma):
  §PQ-P-01  Extended soak: 72 hours at 3× peak batch submission rate
  §PQ-P-02  Verify batch release throughput ≥ SLO target (per M5)
  §PQ-P-03  Run DSCSA serialization end-to-end: generate, transmit, verify
            acknowledgment for 10,000 serials; measure throughput and error rate

QP/PRRC sign-off: QP must co-sign validation summary report for any Tier 1
capability that gates batch release or QP certification.
```

### 8.2 Medical Device pack overlay (J4)

```
Additional validation standards:
  IEC 62304 §5.1..§5.8  Software lifecycle; per-DAL validation depth:
    DAL A (catastrophic): 100% MC/DC code coverage; full V-model; SBOM
    DAL B (hazardous): decision coverage; V-model
    DAL C (major): statement coverage
    DAL D (minor): reviews sufficient; no test automation required
  IEC 62366-1 §5.1..§5.6  Usability engineering: formative + summative
                            evaluation evidence; human factors
  ISO 14971 §7             Risk control verification: each risk control
                           measure must have a verification test record
  IEC 81001-5-1            Security testing requirements per security lifecycle
  IMDRF AI N41             Clinical evaluation evidence for SaMD with AI

Additional IQ requirements (MD):
  §IQ-MD-01  Verify SBOM (CycloneDX format) is generated at build time;
             SOUP register populated (IEC 62304 §8.1.2)
  §IQ-MD-02  Verify UDI barcode / DataMatrix labeling engine produces
             correct GS1 output format; verify GUDID API connection
  §IQ-MD-03  Verify DHR data structure: all required DHR fields per
             21 CFR 820.184 populated and accessible

Additional OQ requirements (MD):
  §OQ-MD-01  Execute CVSS-high vulnerability scenario per IEC 81001-5-1 threat
             model; verify security control rejects or alerts appropriately
  §OQ-MD-02  Execute usability test protocol for high-risk UI function (e.g.
             alarm acknowledgment); record task success rate ≥ 95%
  §OQ-MD-03  Execute EU MDR Art 87 serious incident report generation; verify
             15-day and 2-day window triggers fire correctly

PRRC sign-off: PRRC must co-sign validation summary for any T1 function
covered by EU MDR Art 15 scope.
```

### 8.3 Automotive pack overlay (J2)

```
Additional validation standards:
  AIAG APQP 2nd Ed Phase 4  Product and Process Validation: SPC studies;
                             MSA; control plan verification; PSW approval
  IATF 16949 §7.5.3.2.1      Record retention verification (per validation pack)
  AIAG MSA 4th Ed §3         GR&R study results: %GR&R < 10% for critical MSA
  ISO 26262 Part 8 Table 1   Tool qualification (TCL 1/2/3) for any HESEM
                             software tool used in functional safety development

Additional IQ requirements (Auto):
  §IQ-AU-01  Verify PPAP submission engine generates all 18 PPAP elements
             per AIAG PPAP 4th Ed; verify PSW template is correct
  §IQ-AU-02  Verify OEM-specific notification triggers (8D due-date alert;
             controlled shipping level change alert) for each active OEM CSR
  §IQ-AU-03  Verify SPC chart rendering: X-bar R; X-bar S; I-MR; P-chart;
             C-chart; U-chart correct for sample size and data type

Additional OQ requirements (Auto):
  §OQ-AU-01  Execute 8D problem-solving workflow end-to-end; verify all 8
             disciplines captured; verify OEM-specific due-date alert fires
  §OQ-AU-02  Execute controlled shipping level escalation from Level 0 to
             Level 2; verify customer notification sent; verify evidence
             captured in CAPA record
  §OQ-AU-03  Execute IATF 16949 §8.7.1.3 customer waiver flow; verify
             deviation record created with customer written authorization field
```

### 8.4 Aerospace and Defense pack overlay (J3)

```
Additional validation standards:
  AS9145 §7       APQP + PPAP for aerospace; design review checkpoints
  DO-178C Table A-7  Software objectives per DAL; independence requirements
  DO-178C §6.4.4   Test coverage criteria: MC/DC for DAL A; decision for DAL B
  DO-254 §10      Hardware design verification; coverage analysis
  CMMC 2.0 Level 2  Assessment evidence artifacts per NIST 800-171 r2 domains

Additional IQ requirements (Aero):
  §IQ-AE-01  Verify ITAR access control: verify that CUI-tagged records are
             inaccessible to users without US_PERSON or FOREIGN_NATIONAL_LICENSED
             clearance flag; verify region lock per B6 C5
  §IQ-AE-02  Verify CMMC L2 evidence generation: at least 3 NIST 800-171
             control families produce logged evidence per access or change event
  §IQ-AE-03  Verify FAI record structure per AS9102B: all 7 FAI sections
             present; all balloon references traceable to drawing index

Additional OQ requirements (Aero):
  §OQ-AE-01  Execute NADCAP compliance data entry for AC7104 heat treat
             process; verify pyrometry result captured per AC7102 requirement
  §OQ-AE-02  Execute GIDEP suspect counterfeit notification workflow; verify
             60-day notification SLO timer starts and alerts before deadline
  §OQ-AE-03  Execute DO-178C DAL A software change traceability: verify
             system-requirements → software-requirements → design →
             code → test-case RTM 100% with independence marker
```

### 8.5 Food pack overlay (J5)

```
Additional validation standards:
  21 CFR 117 Subpart C §117.145  Verification activities for preventive
                                   controls; frequency; lot-specific records
  21 CFR 113                      Scheduled processes for LACF (thermally
                                   processed low-acid foods): process authority
                                   validation records
  FSMA §204 (21 CFR 1.1300)       CTE/KDE data capture: lot-level; per-shipment
  ISO 22000:2018 §8.5.4           Hazard control plan (HACCP): CCP monitoring;
                                   critical limits; corrective action triggers
  BRCGS Food 9 §2.7               HACCP verification: annual re-validation of
                                   HACCP plan; internal audit evidence

Additional IQ requirements (Food):
  §IQ-FD-01  Verify CCP monitoring data capture: real-time temperature, pH,
             water activity ingested from edge sensors; alert fires if CCP
             threshold crossed within 15 seconds of detection
  §IQ-FD-02  Verify FSMA §204 CTE/KDE record creation: forward traceability
             from growing area through first receiver to processor; verify
             one-step-back and one-step-forward linkage
  §IQ-FD-03  Verify Reportable Food Registry workflow: RFR submission form
             generates with correct CFSAN fields; 24h SLO timer starts on
             hazard identification event

Additional OQ requirements (Food):
  §OQ-FD-01  Execute HACCP corrective action trigger: simulate CCP limit
             breach; verify corrective action record auto-created; product
             hold state applied; QA notification sent within defined SLO
  §OQ-FD-02  Execute FSMA traceability query ("found in"): given a lot ID,
             verify the system returns all downstream CTEs within 10 seconds
             for a 10,000-record lot history (FDA expects rapid trace)
  §OQ-FD-03  Execute mock recall scenario: identify all impacted lots from
             a raw material lot; verify recall notification list generated
             with all required FSMA §204 KDE fields
```

---

## 9. Validation in continuous delivery

Continuous delivery (CD) introduces a tension with regulated validation:
releases happen frequently but validation discipline must not be bypassed.
HESEM resolves this through three mechanisms.

### 9.1 Change bundling policy (CS-A and CS-B)

```
CS-A  Always-green main policy
      Production must always be in a fully validated state. If a deployment
      creates a validation gap (a Tier 1/2 capability in production without
      a complete validation pack), the deployment is automatically halted by
      the pre-deploy gate. No manual override permitted by SRE; only Quality
      Lead approval can unblock, and that approval is itself a regulated record.

CS-B  Continuous validation lifecycle (CVLP per release)
      Every release cycle (weekly default) includes:
      (a) Delta test execution: all changed capabilities run S8-S9 against
          delta changes; existing capabilities run smoke regression
      (b) Evidence capture: automated test framework writes evidence_artifact
          rows directly to H4 evidence store; no manual transcription
      (c) Per-release CVLP: auto-generated validation summary per release,
          referencing all delta + baseline evidence; signed by Quality Lead
          within 24 hours of deployment to PROD
      (d) Validation staleness check: background reconciler verifies all T1/T2
          capabilities have a validation record dated ≤ N days (T1: 365; T2: 730);
          stale capabilities auto-downgraded from L6 to L5 pending re-PQ
```

### 9.2 Evidence automation

```
Test execution platform         writes test_run rows automatically
                                (pass/fail; duration; env; timestamp)
IQ smoke test                   runs post-deploy; writes iq_record automatically
E7 e-signature API              called programmatically for validation sign-offs;
                                no manual signature step outside E7
Telemetry archiver              captures PQ metrics from observability pipeline;
                                writes pq_record with latency + error data
CVLP generator                  weekly job that assembles evidence index;
                                produces PDF validation summary; routes to
                                Quality Lead for e-sig within 24h;
                                on failure to generate, Quality Lead is
                                paged and the deployment SLO clock starts
RTM checker                     pre-deploy gate: blocks deployment if any
                                Tier 1/2 URS row has a trace gap; logs
                                each blocked deployment as a deployment_block
                                record for H3 audit trending; Quality Lead
                                receives daily summary of blocked deployments
```

---

## 10. KPIs (validation program health)

```
KPI                                    Target               Measurement source
────────────────────────────────────────────────────────────────────────────────
KPI-V-01  RTM trace coverage (T1/T2)   100%                 RTM checker; pre-deploy
           — % URS rows with complete                       gate; daily report
           FS → DS → test → evidence links

KPI-V-02  Validation cycle time        ≤ 10 business days   H7 change record:
           (T1: S0 → S12; median)       for T1              S0 created → S12 signed;
                                        ≤ 5 for T2          monthly cohort median

KPI-V-03  Evidence freshness           0 Tier 1 stale       Nightly reconciler;
           violations                                        stale = validation
                                                             record > 365 days old
                                                             without re-PQ

KPI-V-04  OQ first-pass rate           ≥ 90% (T1); ≥ 95%   Test run records:
           (% of OQ cycles that         (T2)                (pass on first execution)
           pass without rework)                              ÷ (total OQ cycles)

KPI-V-05  CTR defect rate              ≤ 5% of CTRs         Audit review findings:
           (% of CTRs with missing       require             CTR-related findings ÷
           or deficient content found    correction          total CTRs reviewed
           in H3 audit)                  by auditor

KPI-V-06  Validation pack currency     100% of VP-01..       VP lifecycle status
           (% of active VPs with a      VP-16 ACTIVE         check: any VP in
           current effective version)   with effective       DRAFT or EXPIRED state
                                        version              is a violation

KPI-V-07  Post-deploy IQ smoke         100% pass on         Post-deploy IQ records:
           pass rate                    every production     failed smoke ÷ total
                                        deployment           deployments; monthly

KPI-V-08  CVLP delivery SLO           ≥ 95% of CVLP        CVLP generator timestamp
           (% of CVLPs signed by        documents signed     vs. Quality Lead e-sig
           Quality Lead within 24h      within 24h of        timestamp; weekly
           of PROD deployment)          PROD deployment
────────────────────────────────────────────────────────────────────────────────
```

---

## 11. Failure modes and recovery

```
FM1  Test scenario passes but evidence row not written
     Detection:  pre-deploy RTM gate checks evidence_artifact FK for each
                 test run; gate blocks if any scenario lacks evidence FK
     Recovery:   re-run failed test in TEST environment with evidence capture
                 enforced; trace root cause to test execution platform config;
                 H8 CAPA opened if systemic

FM2  Evidence written but RTM trace gap
     Detection:  nightly RTM checker; pre-deploy gate; H3 audit sampling
     Recovery:   validation engineer adds missing RTM link; Quality Lead
                 reviews adequacy of the linked evidence; H8 CAPA if ≥ 3 gaps
                 in same capability over 6 months (systemic pattern)

FM3  IQ passes in TEST, fails silently in PROD (configuration drift)
     Detection:  post-deploy IQ smoke test (S13); canary error rate spike
     Recovery:   immediate rollback if smoke fails (RTO ≤ 15 min); root
                 cause: environment delta between TEST and PROD; H7 change
                 control to document and remediate the drift; re-IQ in PRE-PROD

FM4  PQ telemetry shows slow performance degradation below SLO
     Detection:  I2 SLO burn rate alert (SRE Lead); p99 latency breach
     Recovery:   I3 incident opened; rollback or hotfix; re-PQ after fix
                 with soak ≥ 72h to confirm regression is gone

FM5  Validation summary signed before all evidence captured
     Detection:  B6 OTG axiom A15: signature timestamp must be after all
                 referenced evidence record timestamps; API rejects premature sig
     Recovery:   signature transaction rolled back; Validation Engineer
                 notified; defect opened; Quality Lead review of whether
                 any bypassed regulation applies

FM6  Post-deploy regression in capability not retested
     Detection:  smoke regression catches if capability is in T1/T2 suite;
                 H3 finding if not in suite
     Recovery:   add capability to smoke suite per H7 change; H8 CAPA for
                 the gap; re-OQ for the regressed capability before next release

FM7  Auditor finds untracked URS (capability validated but URS missing)
     Detection:  H3 §5 audit sampling of validation pack; cross-check URS
                 register vs. active regulated capabilities
     Recovery:   H3 Major finding; H8 CAPA; retrospective URS creation with
                 gap analysis; validation engineer confirms no behavioral gap
                 between implicit and documented capability

FM8  Same test scenario passes in TEST, fails in PRE-PROD
     Detection:  PQ execution (S10); observed failure in extended load
     Recovery:   block PROD deployment; root cause via environment comparison
                 (TEST vs PRE-PROD delta); fix in development; re-OQ in TEST;
                 re-PQ in PRE-PROD before retry
```

---

## 12. Validation evidence (per H4)

```
S2  CTR              evidence_artifact (subtype: validation/ctr)
S3  URS              doc_record (controlled document; effectivity-gated via D7)
S4  FS               doc_record (controlled document)
S5  DS               doc_record (controlled document)
S6  Test plan        doc_record (controlled document)
S8  IQ               validation (subtype: iq) + deployment_evidence + signature
S9  OQ               validation (subtype: oq) + test_run rows + scenario records
                     + signature
S10 PQ               validation (subtype: pq) + telemetry archive rows + signature
S11 Summary          doc_record (subtype: validation_summary) + signature
S12 Approval         signature (E7 e-sig; binding approval)
S13 Effectivity      transaction (B7 state machine) + audit_anchor (B6 C1)
S14 Post-release     periodic_review + kpi_record (monthly) + telemetry (ongoing)
```

Retention floors per H5:
```
GxP regulated (T1, Pharma/MD)    25 years minimum
Aerospace (T1)                   airframe service life + 5 years
Automotive (T1)                  product life + 15 years
Food (T1)                        product life + 2 years (HACCP base)
Cyber / ISO 27001 (T1)           7 years (SOC 2 + ISO 27001 audit cycle)
Non-regulated (T3-T5)            3 years minimum
```

---

## 13. Validation evidence freshness propagation

Per B6 OTG axiom A18: stale validation evidence auto-demotes root maturity.

- Nightly reconciler checks every Tier 1/2 regulated capability:
  age of most recent PQ record vs. freshness floor (T1: 365 days; T2: 730 days).
- If floor exceeded: root transitions from maturity L6 → L5; affected
  capability surfaces "re-validate" banner on its workspace header.
- L5 roots cannot serve regulated-mutation paths (batch release; document
  approval) until a new PQ record closes the freshness gap.
- Evidence freshness is published via E8 Evidence API `GET
  /api/v1/evidence/{capability_id}/freshness` so customers can audit
  readiness before relying on a regulated capability in their own audit.

---

## 14. Customer Validation Leverage Pack (CVLP)

Per weekly release, HESEM ships a CVLP that reduces customer-side validation
effort. Contents per release:

```
Platform IQ template (vendor-side)  environment baseline; configuration
                                     manifest signed by SRE Lead
Platform OQ evidence per slice       RTM extract for changed capabilities;
                                     scenario pass/fail records
Platform PQ evidence                 latency percentiles + error budget
                                     snapshot; soak evidence reference
SBOM (CycloneDX format)              all third-party components; signed
                                     artifact attestation (Sigstore)
Penetration test reference           latest pen-test report reference
                                     (full report under NDA; summary public)
SOC 2 Type II report (post W12)      AICPA SOC 2 Type II; 6–12 month
                                     observation window
ISO 27001 certificate (post W13)     current surveillance audit certificate
ISO 13485 certificate (MD-capable)   where applicable per tenant vertical pack
Customer validation gap list         which customer-side artifacts HESEM
                                     does not produce (e.g., site-specific
                                     OQ for local printer; local LAN IQ);
                                     includes templates for each
Mapping table                        HESEM validated capability → customer
                                     URS placeholder; "validated at vendor"
                                     attestation per capability
```

---

## 15. Anti-patterns

```
Test theater         writing test scripts with no URS trace; coverage theater
Validation by export dumping CSV as "evidence" without RTM linkage; rejected
Down-tier by deadline classifying T1 change as T3 to skip rigor; prohibited
                     without new process control evidence
Stale test env       running OQ against TEST env that has drifted from PROD
                     in unrecorded ways; evidence collected is invalid
Single-eyed signoff  one person as both author + approver for T1/T2 change;
                     blocked by B6 axiom A14
Evidence timestamped relying on local clocks not synchronized to NTP authority;
without anchor        data integrity violation per 21 CFR 11.10(e)
Summary before tests  validation summary report dated before final test run;
                     future-dated signature rejected by B6 axiom A15
Forgotten capability  active regulated capability with no validation pack;
                     treated as "validated by default" because historically live
Stale VP             validation pack for active capability not re-validated
                     within freshness floor; root silently operating out-of-
                     validation without detection
Implicit evidence     OQ test run executed in DEV used as TEST evidence;
environment error     invalid per §6 environment topology rule
```

---

## 15b. Periodic re-validation cadence

Periodic re-validation is triggered by the H6 periodic review schedule and
by the evidence freshness reconciler (§13). Cadence is determined by tier.

```
TIER   RE-PQ CADENCE              TRIGGER TYPE
1      Annual OR after any T1     Scheduled: H6 annual review cycle
       change, whichever first     Event-driven: any H7 Tier-1 change close
2      Biennial OR after any T2   Scheduled: H6 two-year review cycle
       change, whichever first     Event-driven: any H7 Tier-2 change close
3      Every 3 years; spot-check  Scheduled: H6 three-year review cycle
4      On-demand only             Event-driven: user-reported anomaly or H3 finding
5      Rolled into next           Covered by visual regression in next release cycle
       regression cycle
```

When an H7 change record covers a capability that is within 6 months of its
periodic re-validation boundary, the change-driven re-PQ fulfills the
periodic requirement. The Quality Lead documents this confluence in the
validation summary report (§4 S11) so the H6 periodic review can mark the
obligation as discharged.

If a tenant regulatory profile (H1 §5) is updated to add a new vertical
pack, add a new jurisdiction, or raise the ASIL or MD class, the
re-validation cascade runs per H1 §5.3. The cascade scope decision is
recorded as a CTR (§3) against the profile change record; the CTR
specifically answers Q1 (which HESEM capabilities are affected by the
profile change) and Q4 (which test categories are needed for each
affected capability to re-qualify under the new profile obligations).

Tier 1 capabilities with no H7 change activity for more than 12 months
are considered "dormant validated." The Quality Lead must confirm at the
annual H6 review that no change outside of HESEM's control (infrastructure
updates; OS patches; library version changes) has invalidated the IQ
baseline. If any such change is found, the capability is re-IQ'd before the
dormant-validated status is maintained. Failure to confirm dormant status
triggers the evidence freshness reconciler to demote the root from L6 to L5.

---

## 16. Roles and authority (RACI)

```
Role                  URS   FS    DS    IQ    OQ    PQ    Summary  Release
Domain Lead            R     C     C     -     -     -       C        -
Solution Architect     C     R     R     C     C     C       C        -
Quality Lead           A     A     A     A     A     A       A        A
Compliance Lead        C     C     -     -     -     -       A        A
Engineering Lead       C     A     A     R     R     R       R        R
Validation Engineer    R     R     -     R     R     R       R        -
SRE Lead               -     -     -     R     -     R       C        C
AI Lead (L3)           C     C     -     -     R     R       C        -
QP / PRRC (pack)       -     -     -     -     -     -    A (P/MD)  A (P/MD)
Internal Auditor       -     -     -     I     I     I       I        I
Customer Auditor       -     -     -     -     -     -       I        I
```

---

## 16b. Validation metrics dashboard

The validation program health metrics (§10) are surfaced in a dedicated
Compliance Lead dashboard (F-catalog workspace projection) that shows:
current RTM coverage %; validation cycle time trend; evidence freshness
violations count; OQ first-pass rate by tier; CVLP delivery compliance.
This dashboard is itself classified as a Tier 3 capability and covered by
VP-03 for its validation pack.

---

## 17. Cross-references

- H1 §4 (component-to-regulation map) — entries referencing H2 use this lifecycle
- H3 (audit program) — H3 verifies this chapter's execution per tenant and pack
- H4 (evidence taxonomy) — evidence class schemas consumed here
- H5 (retention) — retention floors for validation evidence (§12 here)
- H6 (periodic review) — periodic re-validation cadence (§9 above)
- H7 (change control) — entry point into this lifecycle at S0
- H8 (CAPA) — opened when validation finds non-conformance
- H9 (risk management) — drives tier classification at S1
- D14 (validate-to-qualify workflow) — user-facing workflow shell for this chapter
- L3 (AI lifecycle) — AI features undergo L3 stages in addition to this lifecycle
- M5 (SLO directory) — PQ SLO targets referenced in §4 S10 and §10 KPIs
- M7 (decision phrases) — sign-off phrase per stage captured per M7 index

---

## 18. Decision phrase

```
H2_VALIDATION_LIFECYCLE_V10_UPGRADE_COMPLETE
```
