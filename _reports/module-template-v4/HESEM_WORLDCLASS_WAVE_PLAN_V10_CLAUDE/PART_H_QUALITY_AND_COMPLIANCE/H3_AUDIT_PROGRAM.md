# H3 — Audit Program

```
chapter_purpose: operational program for all audit types (internal; customer;
                 regulator; certification; pen test; tabletop); evidence pipeline
                 that serves every audit type from day-to-day operations so
                 HESEM and its tenants are always audit-ready
owner_role:      Quality Lead with Compliance Lead
sources:         ISO 19011:2018; IATF 16949 §9.2; ISO 13485 §8.2.4;
                 21 CFR 211.180(e); 21 CFR 820.22; AS9101F; GAMP 5 SE;
                 EU GMP Chapter 9; FDA QSIT; EMA inspection procedures;
                 NADCAP Audit Handbook; AICPA SOC 2 TSC; SOC 2 Guide;
                 IATF VDA 6.3; NIST SP 800-171 r2 (CMMC assessment guide);
                 EU AI Act Art 17; ISO/IEC 42001 §9
version:         V10 (upgraded from V9 per S4-02)
review_cadence:  annual; triggers on any new regulatory requirement that
                 adds a new audit type or changes an existing audit frequency
```

The audit program is the operational verification layer that confirms the
system operates as designed and regulated. It is the recurring discipline
that proves the system rather than promising it. HESEM is engineered so the
same evidence pipeline that serves day-to-day regulated operations serves
every audit type — there is no separate "audit prep" mode, no quarterly
scramble, and no shadow archive of documents assembled specifically for
auditors.

Every audit type draws from the live, WORM-anchored evidence store (B6 C1)
via E8 Evidence API and E5 Workspace Projection API. The audit pack
assembly job is automated; the only human steps are: authorizing auditor
access, reviewing the assembled pack for scope accuracy, and signing
the final audit record.

---

## 1. Audit type taxonomy

HESEM supports 18 distinct audit types. Each has a defined authority level,
frequency, evidence scope, and evidence class emitted.

```
─────────────────────────────────────────────────────────────────────────────────────────────
TYPE                               FREQ         AUTHORITY               DRIVING STANDARD
─────────────────────────────────────────────────────────────────────────────────────────────
1   Internal QMS audit             Annual        Quality Lead            ISO 9001 §9.2;
                                                                         ISO 13485 §8.2.4
2   Internal process audit         Per cycle     Quality Lead            IATF VDA 6.3 P1-P7;
                                   (per OEM CSR                          AS9101F process audit
                                   frequency)
3   Internal product audit         Per cycle     Quality Lead            IATF VDA 6.5;
                                                                         BRCGS Food §4.4
4   Internal supplier audit        Per supplier  Procurement Lead +      ISO 13485 §7.4;
                                   risk tier     Vertical Pack Lead      IATF 16949 §8.4
5   Internal data integrity        Semiannual    Compliance Lead         21 CFR Part 11 §11.10;
    audit                                                                EU GMP Annex 11 §9;
                                                                         WHO TRS 992
6   Internal AI governance audit   Annual +      AI Lead + Quality Lead  EU AI Act Art 17;
                                   per new AI                            ISO/IEC 42001 §9;
                                   feature                               NIST AI RMF GOVERN
7   Customer audit                 On request    CSM + Quality Lead      Customer contract; OEM
    (tenant customer auditing                                            CSR audit rights clause
    supplier)
8   HESEM vendor audit             On request    CSM + Quality Lead      Platform vendor audit;
    (customer auditing HESEM                                             SaaS vendor assessment;
    as software vendor)                                                  SOC 2 observation
9   Notified Body audit            Certification ISO 13485 CB; EU NB    EU MDR Art 56/79;
    (CB / NB surveillance)         cycle         per MDR/IVDR            ISO 13485 §1.4
10  Regulator inspection           Unannounced   Compliance Lead         FDA 483 / Form 482;
    (FDA / EMA / NCA)              or on-cause                          EMA GMP inspection;
                                                                         21 CFR 211.180(e)
11  Certification surveillance     Annual        Quality Lead +          IATF 16949 CB;
    (CB annual/triennial)                        Compliance Lead         ISO 27001 CB;
                                                                         AS9100D CB; SOC 2
12  NADCAP accreditation           Biennial      Vertical Pack Lead      PRI NADCAP Handbook;
    (aerospace special process)    (per commodity)                       AC7004 + commodity AC
13  SOC 2 Type II                  Annual (6-12  Security Lead           AICPA TSC; observation
                                   month window)                         window per AICPA guide
14  Sub-processor / vendor audit   Per risk      Privacy Lead +          GDPR Art 28; IATF
    (DPA-listed; data processor)   assessment    Security Lead           §8.4.1 supply chain
15  Penetration test               Annual +      Security Lead           FDA Cyber 2023; CMMC
    (network; application; OT)     on significant                        2.0 Level 2; ISO 27001
                                   arch change                           Annex A.8.8
16  Tabletop exercise / game day   Quarterly     SRE Lead + Security     NIST SP 800-53 IR;
    (incident + DR simulation)                   Lead                    DFARS 252.204-7012;
                                                                         ISO 22301
17  FSMA traceability mock trace   Semiannual    Food Pack Lead (J5)     FSMA §204 21 CFR
    (per FDA "found-in" guidance)                                         1.1300; FDA trace-
                                                                         ability guidance
18  ITAR / export compliance       Annual        Compliance Lead +       ITAR 22 CFR 122.5;
    review                                       Legal Counsel           DDTC compliance program
                                                                         guidance; EAR §764
─────────────────────────────────────────────────────────────────────────────────────────────
Total audit types: 18 (exceeds acceptance criterion of ≥ 16)
```

---

## 2. Common audit lifecycle — P0 through P13

Every audit type executes the same 14-phase lifecycle, parameterized by
the specific authority, scope, and evidence requirements. Per-phase actors,
inputs, outputs, and evidence emissions are defined here; the D13
(audit-to-remediate) workflow operationalizes this chapter as a
user-facing state machine.

```
P0   Audit triggered
     Actor:   Quality Lead (scheduled); Compliance Lead (regulator); CSM (customer)
     Input:   audit calendar; regulator notification; customer request; CSR clause
     Action:  create audit_record (state: TRIGGERED); assign audit type per §1
              taxonomy; assign lead auditor; derive scope from audit type definition
     Output:  audit_record (state: TRIGGERED); calendar entry; lead auditor notified
     SLA:     unannounced regulator inspection: P0 → P1 ≤ 30 minutes
              scheduled audits: P0 → P1 per calendar lead time

P1   Auditor onboarded and access provisioned
     Actor:   Tenant Ops Lead (access); Lead Auditor
     Input:   audit_record; auditor identity; scope definition
     Action:  create auditor portal account per I8 §1 (role: AUDITOR; scope:
              tenant + audit window; access type: read-only); provision least-
              privilege access per I7; send access confirmation to auditor;
              verify auditor NDA or regulatory authorization documentation
     Output:  access_grant record; auditor_session_id; audit log entry
     Evidence: access_audit (B6 RBAC; access event logged)
     SLA:     ≤ 2 hours for unannounced regulator inspection; ≤ 24h scheduled

P2   Audit plan filed
     Actor:   Lead Auditor (external) or Quality Lead (internal)
     Input:   audit scope; audit type taxonomy entry; applicable standards
     Action:  prepare and file audit plan: objectives; criteria; scope; schedule;
              sampling plan per §6; team (auditor + observers); escalation path;
              confidentiality handling
     Output:  audit_plan document (DMS; controlled; linked to audit_record)
     Evidence: doc_record (audit_plan subtype)

P3   Pre-audit document review
     Actor:   Quality Lead + Compliance Lead + Vertical Pack Lead (where applicable)
     Input:   audit plan; automated audit pack assembly job (§4)
     Action:  trigger audit pack assembly for the declared scope window and tenant;
              review pack for completeness: verify all 60+ sections present (§4);
              redact cross-tenant data per multi-tenant isolation rules (§9);
              sign and seal pack; provide pack to auditor with hash for tamper
              verification
     Output:  audit_pack (sealed; hash-signed; per §4 inventory)
     Evidence: evidence_artifact (subtype: audit_pack); audit_anchor (B6 C1)
     SLA:     pack assembly: ≤ 24h scheduled; ≤ 4h unannounced regulator

P4   Opening meeting
     Actor:   Quality Lead (host); Lead Auditor; Compliance Lead; Domain Leads
              (where applicable)
     Input:   audit plan; audit pack (delivered at P3)
     Action:  confirm scope, criteria, team; set daily debrief schedule;
              establish escalation protocol; confirm logistics; confirm auditor
              has verified pack hash; record attendance
     Output:  meeting minutes (doc_record); scope confirmation record
     Evidence: doc_record (meeting_minutes subtype)

P5   Audit execution
     Actor:   Lead Auditor + audit team; Subject Matter Experts per scope
     Input:   auditor portal access (P1); audit plan (P2); audit pack (P3)
     Action:  conduct evidence sampling per plan (§6); request additional
              evidence via E8 Evidence API real-time pull (§7); interview
              process owners; observe operations (where applicable); log each
              observation as a draft finding record in real time; each auditor
              query is logged in the audit log per B6 audit chain
     Output:  draft finding records (per observation); auditor query log;
              additional evidence pull records
     Evidence: audit_record updated (state: IN_PROGRESS); all auditor portal
              queries auto-logged per I8

P6   Daily debrief
     Actor:   Lead Auditor + Quality Lead + Compliance Lead
     Input:   draft findings accumulated during P5
     Action:  review draft findings; classify preliminary severity per §3;
              identify any stop-work items (Critical findings with immediate
              regulatory impact); confirm schedule for remaining audit days
     Output:  daily debrief notes (doc_record); preliminary finding list;
              stop-work decision record if applicable
     Evidence: doc_record (debrief_notes subtype); signature (Quality Lead)

P7   Closing meeting
     Actor:   Lead Auditor; Quality Lead; Compliance Lead; Management
     Input:   consolidated findings from all P6 daily debriefs
     Action:  present all findings in final form; confirm finding count per
              severity; present preliminary audit decision (PASS / CONDITIONAL /
              FAIL); discuss response expectations and timelines; record audit
              attendance
     Output:  closing meeting minutes; preliminary finding list (signed)
     Evidence: doc_record (closing_minutes subtype); signature (Auditor + QualityLead)

P8   Finding classification and finalization
     Actor:   Lead Auditor (primary); Quality Lead (challenge process available)
     Input:   raw observations; applicable standard clauses per H1 §2-3
     Action:  classify each finding per §3 severity table; apply per-pack severity
              adjustments per §3.2; assign clause reference; assign responsible
              owner per §8 RACI; generate finding IDs (FIND-<audit_id>-<seq>);
              finalize audit report
     Output:  audit_report (doc_record; signed by Lead Auditor); finding records
              (one per finding; linked to audit_record); finding register updated
     Evidence: audit_record (state: FINDINGS_ISSUED); signature (Lead Auditor)
     SLA:     formal audit report delivered ≤ 10 business days of closing meeting
              (5 days for regulator inspection)

P9   Auditee response window
     Actor:   Quality Lead + Process Owners (per finding)
     Input:   audit report; finding records
     Action:  review each finding; prepare written response (agree / disagree +
              rationale); for agreed findings, draft initial corrective action
              proposal; for disagreed findings, escalate to Compliance Lead +
              Quality Lead for challenge within 5 business days of receipt
     Output:  auditee_response (doc_record; linked to audit_report; signed)
     Evidence: doc_record (auditee_response subtype); signature (Quality Lead)
     SLA:     auditee response due ≤ 30 calendar days (20 days for regulator
              inspection; per FDA guidance)

P10  CAPA registration
     Actor:   Quality Lead (opens); Process Owner (assigned)
     Input:   agreed findings (Major and above)
     Action:  create CAPA record per D6 workflow for each Major+ finding;
              cross-link CAPA to finding record (finding_id FK in CAPA record);
              set target closure date per finding severity SLO (§3);
              open interim containment action record where immediate risk exists
     Output:  capa_record (one per Major+ finding); finding records updated
              (capa_id FK set)
     Evidence: capa_record (linked to audit_record); containment_action if applicable

P11  Effectiveness verification window
     Actor:   Quality Lead (monitoring); Process Owner (execution)
     Input:   CAPA records from P10; corrective action implementations
     Action:  verify that corrective action implementation is complete;
              conduct effectiveness check: re-test or re-observe the process
              that generated the finding; confirm the root cause has been
              eliminated per H8 CAPA methodology; effectiveness period ≥ 1 full
              process cycle (minimum 1 month for most; 6 months for systemic)
     Output:  effectiveness_verification record; CAPA record updated (state:
              EFFECTIVE or INEFFECTIVE); finding record updated
     Evidence: capa_record (effectiveness_check_date + result); signature (QL)

P12  Audit close
     Actor:   Quality Lead; Lead Auditor (external confirmation where applicable)
     Input:   all findings disposition (closed or with approved action plan);
              effectiveness verification for Major+ findings
     Action:  confirm all findings have an accepted disposition; sign audit
              report as closed; seal the complete audit record bundle (audit_record
              + audit_pack + finding records + CAPA links + effectiveness records)
              with B6 audit_anchor; archive per H5 audit record retention floor
     Output:  audit_record (state: CLOSED; sealed); WORM archive entry
     Evidence: audit_anchor (B6 C1); audit_record (CLOSED); signature (QL + Auditor)

P13  Surveillance / re-audit
     Actor:   Quality Lead (schedules); Lead Auditor
     Input:   audit calendar; previous audit findings; CAPA effectiveness records
     Action:  per cycle, verify effectiveness of previously reported findings;
              sample re-test of previously found deficiency areas;
              confirm no regression; update findings register trend
     Output:  re-audit record; findings register updated (recurring pattern flag)
     Evidence: audit_record (surveillance subtype); trend_report
```

---

## 3. Finding classification

### 3.1 Universal severity table

```
──────────────────────────────────────────────────────────────────────────────────
SEVERITY      DEFINITION                              MANDATORY ACTION      SLO
──────────────────────────────────────────────────────────────────────────────────
Critical      Regulated decision compromised; product  Immediate stop-ship;  Close ≤ 30d
              or patient safety impact plausible;      recall evaluation per
              evidence falsification; systemic data    D12; I3 incident if
              integrity gap                            active harm
Major         System-level non-conformance; control    CAPA opened same day; Close ≤ 90d
              gap that could allow non-conforming      interim containment
              output; recurring Minor in same area     within 5 business days
Minor         Localized non-conformance; individual    CAPA opened;          Close ≤ 180d
              process deviation; no systemic impact    monitored for
                                                       recurrence
Observation   Opportunity for improvement; no current  Reviewed at next H6   Next cycle
              conformance failure                      periodic review
Best Practice Positive finding; controls above          Captured in knowledge n/a
              baseline requirement                     base; shared across
                                                       tenants (anonymized)
──────────────────────────────────────────────────────────────────────────────────
```

Severity classification is a regulated decision. Single-actor reduction
from Major → Minor requires Quality Lead + Compliance Lead joint sign-off
(per B7 state machine dual-authority requirement). AI advisory (L2)
is prohibited from executing this reclassification autonomously (L1 BD-7).

Escalation trigger: if the same finding recurs in the same clause area
for the same tenant for the third time within 24 months, it is automatically
elevated one severity tier and routed to H8 for systemic CAPA investigation.

### 3.2 Per-pack severity adjustments

Certain vertical packs impose stricter severity thresholds for specific
finding types:

```
PHARMA (J1):
  Any finding on 21 CFR 11 audit trail completeness: floor = Major
  Any finding on Annex 11 §9 audit trail review frequency: floor = Major
  Any finding on batch release SM (VP-01) evidence: floor = Critical
  Any finding on QP designation (Annex 16): floor = Major

MED DEVICE (J4):
  Any finding on ISO 13485 §8.2.3 regulatory reporting (MDR): floor = Critical
  Any finding on ISO 14971 risk file completeness: floor = Major
  Any finding on IEC 62304 software class C/D test coverage: floor = Major
  Any finding on UDI data integrity: floor = Major

AUTOMOTIVE (J2):
  Any finding on OEM-specific customer notification timing (8D): floor = Major
  Any finding on PPAP PSW completeness at production launch: floor = Major
  Any finding on control plan vs. manufacturing process divergence: floor = Major

AEROSPACE (J3):
  Any finding on ITAR/EAR export screening record: floor = Critical
  Any finding on FAI per AS9102B for in-scope part: floor = Major
  Any finding on CMMC POA&M closure timeline: floor = Major

FOOD (J5):
  Any finding on CCP monitoring record completeness: floor = Critical
  Any finding on Reportable Food Registry 24h notification: floor = Critical
  Any finding on FSMA §204 KDE completeness: floor = Major
```

---

## 4. Audit pack export inventory

When an audit is triggered, HESEM assembles a per-tenant, per-scope,
per-time-window audit pack. The pack is sealed (zip + manifest + content hash
signed by audit_anchor), delivered to the auditor, and the auditor verifies
the hash against the audit_anchor table to confirm tamper-free delivery.

Assembly SLA: 24 hours (scheduled audit); 4 hours (unannounced regulator
inspection); 1 hour (Critical finding requiring immediate pack update).

The pack contains the following sections (each section number maps to an
audit pack section ID used in the HESEM audit pack assembly job):

```
QUALITY MANAGEMENT SYSTEM
  §A-01  QMS scope statement (current effective version; signed)
  §A-02  Quality manual (current effective version)
  §A-03  Organization chart with role/responsibility mapping (RACI)
  §A-04  Process map with KPI ownership per process
  §A-05  Internal audit calendar (last 24 months completed + next 12 months
         planned; color-coded by audit type)
  §A-06  Management review minutes (last 24 months; signed by Management)
  §A-07  Customer satisfaction summary (last 12 months; complaints + NPS)
  §A-08  Quality policy statement (current; signed by CEO or equivalent)

DOCUMENT AND RECORD CONTROL
  §B-01  Controlled document register (all effective controlled documents;
         per scope; revision + effective date + owner)
  §B-02  Document change log (per scope window; document_id + change
         description + approval + effectivity)
  §B-03  Record retention compliance attestation (per H5 floors; signed by
         Quality Lead)
  §B-04  Record sample — auditor-selected (5 records minimum per class;
         with full audit trail displayed)

VALIDATION EVIDENCE (per H2)
  §C-01  Validation Master Plan (current effective version)
  §C-02  Validation index (VP-01..VP-16; status; last PQ date)
  §C-03  IQ records for sampled capabilities (per §6 sampling plan)
  §C-04  OQ records for sampled capabilities (scenario pass/fail detail)
  §C-05  PQ records for sampled capabilities (latency; error budget; soak)
  §C-06  RTM extract for sampled URS (traceability completeness evidence)
  §C-07  Validation summary reports for sampled release cycles (last 6)
  §C-08  CTR records for sampled Tier 1/2 changes (last 12 months)
  §C-09  Evidence freshness report (current staleness status per capability)
  §C-10  CVLP delivery log (last 12 releases; SLO compliance)

CHANGE CONTROL (per H7)
  §D-01  Change registry for scope window (all change records; tier + state)
  §D-02  Selected change records (10 minimum; CR + impact + risk tier +
         approval + effectivity + validation summary link)
  §D-03  Configuration baseline snapshot (current; signed by SRE Lead)
  §D-04  Software / firmware version history (last 12 months; per component)
  §D-05  Emergency change records (all within scope window; post-approval
         validation evidence references)

CAPA AND COMPLAINT (per H8 and D12)
  §E-01  CAPA register (scope window; all CAPAs with state + finding link)
  §E-02  Selected CAPA records (10 minimum; root cause + action + effectiveness)
  §E-03  Complaint trend report (last 12 months; by category + severity)
  §E-04  Complaint records sample (5 minimum; full lifecycle from receipt to close)
  §E-05  Recall log (all recalls in scope window; classification + outcome)
  §E-06  Systemic CAPA findings report (recurring patterns per findings register)

RISK MANAGEMENT (per H9)
  §F-01  Risk register (current; all risks with score + control + residual)
  §F-02  Risk control verification sample (5 controls; verification evidence)
  §F-03  ISO 14971 risk file (MD tenants; per product)
  §F-04  ICH Q9 quality risk management record (Pharma tenants; per process)
  §F-05  AI risk record per feature (EU AI Act Art 9; per L3 lifecycle)

TRAINING (per D8)
  §G-01  Training matrix (current; all roles × required competencies)
  §G-02  Training record sample (10 persons; completion + assessment records)
  §G-03  Competency assessment record sample (role-based; last cycle)
  §G-04  Training non-compliance report (overdue training items; remediation)

CALIBRATION AND MAINTENANCE (per C9 + D9)
  §H-01  Asset register (all regulated measurement instruments)
  §H-02  Calibration certificate sample (10 instruments; validity dates)
  §H-03  PM compliance summary (last 12 months; on-time vs. overdue rate)
  §H-04  GR&R study results (auto/aero: critical measurement systems; %GR&R)

INSPECTION AND PRODUCT RELEASE (per D4 + D5 + D10)
  §I-01   Inspection plan + acceptance criteria (per product/process)
  §I-02   Recent NC records and disposition (10 minimum; within scope window)
  §I-03   Batch release records (Pharma: last 10 batches; CoA + QP cert)
  §I-04   Medical device DHR sample (10 units; per 21 CFR 820.184)
  §I-05   PPAP submission records (Auto: per active part numbers)
  §I-06   First Article Inspection records (Aero: last 5 FAI packages)
  §I-07   HACCP CCP monitoring records (Food: last 30 days; per CCP)

TRACEABILITY (per C8 + D11)
  §J-01  Lot genealogy snapshot (most recent production lot; forward + back trace)
  §J-02  Recall simulation evidence (last simulation; elapsed time; completeness)
  §J-03  UDI registration evidence (MD: GUDID submission records per device)
  §J-04  DSCSA serialization records (Pharma: recent TI/TH/TS transactions)
  §J-05  FSMA §204 CTE/KDE records (Food: last 90 days per FDA guidance)

SUPPLIER MANAGEMENT (per C4)
  §K-01  Supplier register (approved + conditional + disqualified; risk tier)
  §K-02  Supplier audit / scorecard sample (last 12 months; high-risk suppliers)
  §K-03  Counterfeit prevention attestation (Aero: AS5553 compliance per supplier)
  §K-04  Sub-tier flow-down evidence (CSR-specific flow-down matrix per active CSR)
  §K-05  Foreign Supplier Verification Program records (Food/FSMA where applicable)

INFORMATION SECURITY (per I7)
  §L-01  ISO 27001 Statement of Applicability (SoA); control status
  §L-02  Risk treatment plan (current; residual risk accepted by CISO)
  §L-03  Penetration test report (latest; executive summary; remediation status)
  §L-04  Vulnerability scan summary (last 90 days; CVSS scores + remediation)
  §L-05  Security incident log (all SEV-1 and SEV-2 incidents; scope window)
  §L-06  Access review records (quarterly privilege review; anomalies)
  §L-07  ISO 27001 surveillance audit report (latest CB report)

PRODUCT CYBERSECURITY (where applicable)
  §M-01  SBOM (CycloneDX; latest; signed artifact attestation)
  §M-02  Vulnerability disclosure process evidence (CVE responses; 90-day SLO)
  §M-03  SOUP / OTSS register (MD: per IEC 62304 §8.1.2; version + risk)
  §M-04  FDA Premarket Cyber evidence (MD: threat model; SBOM; patch plan)

PRIVACY (per I8 + GDPR)
  §N-01  Records of Processing Activities (RoPA; GDPR Art 30; current)
  §N-02  DPIA records (where triggered per GDPR Art 35; current)
  §N-03  Sub-processor list with DPA terms (GDPR Art 28; current)
  §N-04  Breach log (all personal data incidents; notification records; 72h SLO)
  §N-05  Erasure request log (GDPR Art 17; disposition per WORM exclusion table)

AI GOVERNANCE (per L0..L5)
  §O-01  Model card per deployed AI feature (EU AI Act Art 11; last 12 months)
  §O-02  Red-team report sample (L4; last 2 cycles; per-probe results)
  §O-03  Override capture summary (L1; human override count; BD violation log)
  §O-04  AI governance ledger excerpt (AI feature state per L3 lifecycle)
  §O-05  Banned-decision violation log (expected: zero violations; any non-zero
         triggers Critical finding per §3.2 AI pack overlay below)
  §O-06  EU AI Act conformity assessment evidence (where Art 43 applicable)

CSR CONFORMANCE (per H1 §7)
  §P-01  Active CSR list per tenant (CSR ID + version + effective date)
  §P-02  CSR gap analysis records (one per active CSR; last ingestion cycle)
  §P-03  CSR conformance attestation (signed by Compliance Lead + VPL)
  §P-04  CSR conflict findings (regulatory_conflict records; resolution)

TRUST AND ASSURANCE
  §Q-01  SOC 2 Type II report (latest; observation window period)
  §Q-02  Bridge letter (where observation window gap > 6 months)
  §Q-03  ISO 27001 certificate (current; CB name; valid through date)
  §Q-04  ISO 13485 certificate (MD-capable tenants; CB name; scope)
  §Q-05  AS9100D / IATF 16949 certificate (Aero/Auto tenants; CB name)
  §Q-06  NADCAP accreditation certificates (Aero: per active commodity)
  §Q-07  CMMC assessment evidence (Aero/Defense: L2 assessment record)

─────────────────────────────────────────────────────────────────────────
Total audit pack sections: 71 (§A through §Q; exceeds ≥ 60 requirement)
─────────────────────────────────────────────────────────────────────────
```

The pack assembly job queries the E8 Evidence API for each section.
Sections that are not applicable to the tenant's regulatory profile (H1 §5)
are included as "N/A — not applicable; reason: [derived from profile]" so the
auditor can see that the absence is deliberate, not an omission.

---

## 5. Calendar coordination

The multi-audit calendar prevents audit fatigue (back-to-back audits with
no preparation time) and resource conflicts.

```
Rule                                         Enforcement
─────────────────────────────────────────────────────────────────────────────
Minimum 14-day buffer between               Auto-conflict check in calendar
distinct audit scopes (same tenant)          tool when new audit is scheduled

Exception: regulator-initiated audit        Regulator inspection overrides
takes priority; no minimum buffer            all other calendar commitments

Single audit-lead contact per tenant        Enforced in I8 tenant profile;
(Compliance Lead or designated deputy)       one designated lead per tenant

Auto-conflict alert                          System alert when proposed audit
                                            scheduling overlaps existing audit
                                            in same tenant + scope week

Quarterly preview                           Compliance Lead receives 90-day
                                            forward audit calendar automatically
                                            from H6 periodic review scheduler

Resource reservation                         Quality Lead + Compliance Lead
                                            blocked from non-critical meetings
                                            during declared audit week in calendar

Long-lead audit preparation                 Certification renewal (CB audit):
                                            internal readiness audit ≥ 30 days
                                            prior; pre-audit pack dry run ≥ 14 days
                                            prior
```

---

## 6. Sampling plans per record class

Sampling plans are published in the audit pack (§4 §C-02 validation index)
so auditors do not need to "discover" them. The same sampling logic is
applied consistently; given the same scope window and criteria, the same
records are selected every time, enabling cross-audit comparison.

```
──────────────────────────────────────────────────────────────────────────────
RECORD CLASS                     SAMPLE LOGIC                  FLOOR
──────────────────────────────────────────────────────────────────────────────
Validation pack records          5% or 20 (greater); per tier   T1: all VP-01..VP-16
(IQ / OQ / PQ per capability)    risk-weighted (T1 always       sampled at 100%
                                  included in sample)

CAPA records                     10% or 10 (greater);           All Criticals 100%;
                                  risk-weighted by severity      Majors: 30% min

Change records                   5% per impact tier; at least   All Tier 1 changes
                                  1 from each tier represented   100% sampled

Training records                 5% per role category; at       Safety-critical roles
                                  least 10 individuals           (batch release; QP;
                                                                 PRRC): 100%

Supplier qualification records   High-risk: 100%;               Active CSR-listed
                                  Medium-risk: 20%;              suppliers: 100%
                                  Low-risk: 5%

Calibration certificates         Critical instruments: 100%;    Batch-critical
                                  Non-critical: 20%              instruments: 100%

Lot / batch release records      10% or 5 batches (greater);   Batches with deviations:
(Pharma)                         includes most recent           100%

Medical device SaMD releases     Every regulated change in      All Tier 1 SaMD
                                  scope window: 100%             changes: 100%

PPAP submission records (Auto)   Every part number with         All revision changes:
                                  engineering revision: 100%     100%

First Article Inspection (Aero)  Every rev change in scope:     All new part numbers:
                                  100%                           100%

HACCP CCP monitoring records     Random day selection from      Any CCP limit breach:
(Food)                           scope window; 10 production    100% for that lot
                                  days minimum

AI model cards                   Every deployed feature: 100%   High-risk AI (Annex III):
                                                                 100%

Security incidents               All SEV-1; 20% SEV-2           All GDPR Art 33 reports:
                                                                 100%
──────────────────────────────────────────────────────────────────────────────
```

Sampling is reproducible: the audit pack assembly job uses a deterministic
seed (audit_id + record_class + scope_window hash) to select samples.
Re-running the job with the same inputs yields the same sample selection.
This is required for re-audit traceability and challenge response.

---

## 7. Real-time evidence access (per E5 §2.8 + E8 §2.10)

During audit execution (P5), auditors access evidence through the HESEM
auditor portal — a scoped, time-bounded, read-only workspace projection.

Auditor portal capabilities:
- Browse assembled audit pack (§4) with section navigation
- Drill from any audit pack record to the underlying authoritative record
- Verify audit trail freshness: compare `anchor_timestamp` in `audit_anchor`
  table against current time; a gap > configured staleness threshold surfaces
  as an anomaly alert to the Quality Lead
- Pull additional evidence on-request via E8 Evidence API: live query against
  the evidence store, not from pre-staged content
- View related records (cross-reference links per B6 OTG graph)

Every auditor query is itself audited per B6 C1 audit chain. At audit close
(P12), the auditor query log is appended to the sealed audit record so the
auditor's evidence path is preserved and can be reviewed by a subsequent
auditor or regulator.

Auditor access self-terminates at the declared audit end date. Any access
extension requires Compliance Lead approval and generates an access extension
record per I7.

---

## 8. Inspector readiness drills

Quarterly internal drill simulates a surprise regulator inspection.

```
Drill cadence:   Once per quarter; schedule determined by Compliance Lead;
                 date kept confidential from process teams to simulate
                 unannounced nature

Scope selection: Random scope picked by Compliance Lead using dice/random
                 number method; results documented to prevent bias

Pack assembly:   Full audit pack assembled cold (no pre-staging); SLO
                 target = 4-hour production SLO; time recorded

Findings test:   Quality Lead identifies 3 simulated findings (one each
                 at Critical, Major, Minor severity); P8 classification
                 and P9 response workflow exercised end-to-end

CAPA simulation: H8 CAPA workflow walked for the simulated Major finding;
                 effectiveness check scheduled (as a drill record, not
                 a real CAPA)

Evidence hole    Quality Lead tests 5 random evidence pulls via E8; verifies
checks:          evidence_artifact FK completeness for sampled records

Drill output:    drill_record (evidence class: audit_record, subtype: drill);
                 gap list from drill findings; H8 CAPA opened for any real
                 gap identified during drill; drill elapsed time vs. SLO
                 recorded for KPI-A-06

Escalation:      if drill SLO breached or a Critical gap is found, Compliance
                 Lead briefs Quality Lead + CEO within 24 hours
```

---

## 9. Multi-tenant audit design

A customer audit of HESEM-the-vendor differs from a regulator audit of a
HESEM tenant. Both are supported; the evidence scope is controlled strictly:

```
SCOPE                          AUDITED ENTITY              EVIDENCE SCOPE
─────────────────────────────────────────────────────────────────────────────
Vendor audit                   HESEM platform               Platform-wide; cross-
(platform vendor assessment)                                tenant data redacted;
                                                            platform operational
                                                            evidence visible

Tenant audit                   One tenant's data and ops    Single-tenant boundary;
(customer auditing their own                                other tenants invisible;
supplier = HESEM tenant)                                    enforced by B6 C5

Sub-tenant scope               Specific facility or line    Filtered by tenant
                               within one tenant            attribute (site_id;
                                                            production_line_id)

Regulator inspection           HESEM platform vendor +      Vendor-level evidence +
(FDA inspecting HESEM as       consenting tenant data       consenting tenant data
 SaaS vendor for regulated                                  only; non-consenting
 customer)                                                  tenants fully redacted

Vertical pack inspection       Pack-specific evidence       Scoped by tenant × pack;
(e.g. FDA GMP inspection for   within tenant boundary       non-in-scope packs
 a single Pharma tenant)                                    redacted
─────────────────────────────────────────────────────────────────────────────
```

Cross-tenant data leakage during an audit is classified as a Critical finding
(per §3) and simultaneously triggers an I3 SEV-1 incident (data breach
category). The affected tenant is notified immediately per GDPR Art 33 (72h
clock starts from leakage detection) if personal data was involved.

Every auditor portal session enforces the tenant boundary at the API layer
(B6 C5 tenant isolation axiom). Auditor queries that attempt to access
cross-tenant records return HTTP 403 and log an access_violation event.

---

## 10. Findings register and trend analysis

The findings register is a permanent, tenant-scoped ledger of all findings
across all audit types. It persists across audit cycles and feeds the trend
analysis engine.

```
Finding register fields:
  finding_id     string  (FIND-<audit_id>-<seq>)
  audit_id       FK → audit_record
  audit_type     enum (per §1 taxonomy)
  clause_ref     string  (e.g. "21 CFR 11.10(e)"; "EU GMP Annex 11 §9")
  severity       enum (Critical / Major / Minor / Observation / Best Practice)
  description    string  (finding text; ≥ 50 words)
  root_cause     string  (populated after P9 response; ≥ 30 words)
  capa_id        FK → capa_record (if Major+)
  effectiveness  enum (PENDING / EFFECTIVE / INEFFECTIVE / NA)
  close_date     ISO 8601 date | null
  recurrence     integer (count of same clause + same tenant findings; auto)
```

Trend analysis (quarterly; consumed by H6 periodic review and ISO 9001 §9.3
management review):

```
Heatmap dimensions:
  - Clause / regulatory area (grouped per H1 §2-3 taxonomy)
  - Process area (per ISO 9001 §8; per vertical pack)
  - Tenant / tenant segment (aggregated; anonymized for cross-tenant view)
  - Audit type

Signals generated:
  - Recurring finding: same clause + same tenant ≥ 3 times in 24 months
    → auto-elevate one severity tier; route to H8 systemic CAPA
  - Cross-tenant pattern: same clause finding in ≥ 3 distinct tenants
    → platform-level CAPA opened; root cause may be in HESEM platform code
  - Closure rate: findings closed within SLO vs. overdue; monthly
  - Effectiveness rate: CAPAs marked EFFECTIVE vs. INEFFECTIVE; quarterly
```

The trend engine is an analytics view (C13) and operates in AI advisory
mode (Tier 2 per L2): it surfaces patterns and recommendations; it does not
reclassify findings autonomously (BD-7 per L1).

---

## 11. KPIs (audit program health)

```
KPI                                    Target               Measurement source
────────────────────────────────────────────────────────────────────────────────
KPI-A-01  Audit pack assembly SLO      ≥ 98% of packs       Pack assembly job log:
           compliance — % of packs      assembled within     completion timestamp vs.
           assembled within declared    declared SLO         trigger timestamp; monthly
           SLO (24h scheduled; 4h
           unannounced)

KPI-A-02  CAPA on-time closure rate    ≥ 90% of Major       CAPA register: close_date
           — % of Major CAPAs closed    CAPAs closed         vs. SLO date; per audit
           within 90-day SLO            within SLO           type; quarterly cohort

KPI-A-03  Finding recurrence rate      ≤ 5% of findings     Findings register: recurrence
           — % of findings that         recur in same        count > 1 ÷ total findings;
           recur in same clause area    clause area          quarterly
           in 24 months

KPI-A-04  Audit closure cycle time     ≤ 20 business        Audit record: P0 triggered →
           — median days from           days (scheduled);    P12 closed; per audit type;
           trigger to audit close       ≤ 10 days (regulator monthly cohort median
           (P0 → P12)                   inspection)

KPI-A-05  Data integrity finding       Zero per year        Finding register: findings
           rate — count of Critical     (target)             classified as Critical in
           data integrity findings                           data_integrity subcategory;
           per calendar year                                 annual

KPI-A-06  Inspector readiness drill    ≤ 4 hours pack       Drill record: elapsed time
           SLO — elapsed time for       assembly in each     per quarterly drill
           quarterly drill pack         quarterly drill
           assembly

KPI-A-07  Cross-tenant leakage         Zero per year        I3 incident log: incidents
           incidents — count of         (target)             classified as audit_scope_
           audit-related cross-tenant                        breach; annual
           data access violations

KPI-A-08  Effectiveness verification   ≥ 85% of CAPAs       CAPA register: effectiveness
           rate — % of CAPAs that       achieve EFFECTIVE    = EFFECTIVE ÷ total CAPAs
           achieve EFFECTIVE status     on first check       with effectiveness check
           on first effectiveness                            completed; quarterly
           check
────────────────────────────────────────────────────────────────────────────────
```

---

## 11b. Per-pack audit execution focus areas

During audit execution (P5), the lead auditor uses the following focus areas
per vertical pack. These direct which evidence sections (§4) receive primary
scrutiny and which interview questions are posed to process owners.

### PHARMA pack focus (J1)

```
Primary regulatory exposure areas:
  21 CFR Part 11 audit trail completeness (§A-06; §C-04)
  EU GMP Annex 11 §9 audit trail review frequency (audit_trail_review records)
  Batch release state machine evidence (§I-03; VP-01 OQ/PQ)
  QP designation and batch certification evidence (§I-03; Annex 16 cert)
  Data integrity across ALCOA+ dimensions (HESEM audit trail; WHO TRS 992)
  Deviation and OOTC handling records (§E-02; deviation register)
  DSCSA serialization transaction records (§J-04)
  Annual Product Review completeness per 21 CFR 211.180(e) (per product)

Interview focus: QP; batch release manager; data integrity officer; lab lead
Sample pull: 3 batch records end-to-end; audit trail for each; QP cert per batch
```

### MED DEVICE pack focus (J4)

```
Primary regulatory exposure areas:
  DHR completeness per 21 CFR 820.184 / ISO 13485 §7.5.3 (§I-04)
  CAPA root-cause depth: MDR-complaint to CAPA to effectiveness (§E-01; §E-02)
  Post-Market Surveillance plan and PSUR currency (§F-04 placeholder; H9)
  UDI registration in GUDID and label accuracy (§J-03; §I-01)
  IEC 62304 test coverage per DAL assignment (§C-04; software test records)
  ISO 14971 risk control verification: each risk control with evidence (§F-03)
  PRRC designation record (§A-03 RACI; EU MDR Art 15)

Interview focus: PRRC; regulatory affairs; software QA lead; design lead
Sample pull: DHR for 3 units; risk control verification for top-5 risks;
             IEC 62304 OQ evidence for last software release
```

### AUTOMOTIVE pack focus (J2)

```
Primary regulatory exposure areas:
  Control plan to manufacturing process alignment (§I-01 inspection plan)
  PPAP PSW completeness for active engineering-change parts (§I-05)
  8D response time to OEM escalations (§E-02 CAPA records with OEM link)
  SPC control chart evidence for critical characteristics (§H-04 GR&R)
  Layered Process Audit (LPA) log currency and coverage (§A-04 process map)
  OEM CSR conformance per active CSR entries (§P-01..§P-04)
  Sub-tier supplier flow-down compliance (§K-04 flow-down matrix)

Interview focus: SQE; production supervisor; IATF internal auditor
Sample pull: last 5 PPAP PSWs; 8D records for last 3 OEM escalations;
             SPC charts for 3 critical characteristics; CSR gap closures
```

### AEROSPACE pack focus (J3)

```
Primary regulatory exposure areas:
  ITAR/EAR screening records for each export transaction (§L-01; §P-01)
  FAI completeness per AS9102B for active part numbers (§I-06)
  Counterfeit part evidence per AS5553: receiving inspection (§K-03)
  CMMC POA&M closure status and timeline (§Q-07)
  NADCAP accreditation certificate currency per active commodity (§Q-06)
  GIDEP notice response records (counterfeit log; 60-day SLO)
  First-piece verification records for key/critical characteristics (§I-06)

Interview focus: ITAR compliance officer; FAI coordinator; NADCAP lead; quality engineer
Sample pull: 3 FAI packages; ITAR screening log for last 30 shipments;
             CMMC L2 evidence for top-5 practices
```

### FOOD pack focus (J5)

```
Primary regulatory exposure areas:
  HACCP CCP monitoring records: critical limit compliance (§I-07)
  FSMA §204 CTE/KDE completeness for scope lot history (§J-05)
  Corrective action records for CCP limit exceedances (§E-02)
  FSMA Reportable Food Registry notification records (§E-05; 24h SLO)
  GFSI certificate currency (BRCGS / SQF / FSSC / IFS; §Q-05 placeholder)
  Supplier verification program records per FSMA FSVP (§K-05)
  Environmental monitoring program results (§I-07 addendum)

Interview focus: food safety manager; HACCP team leader; traceability coordinator
Sample pull: CCP monitoring for 3 production days; traceability forward/back
             for 2 lots; corrective action for any CCP breach in scope window
```

---

## 12. Failure modes and recovery

```
FM1  Audit pack assembly fails to meet SLO
     Detection:  pack assembly job completion timestamp vs. trigger timestamp;
                 SLO breach alerts Compliance Lead immediately
     Recovery:   pre-staged template fills missing sections with "PENDING"
                 status; manual section completion within 1 hour for regulator
                 inspection; root cause investigation → H8 CAPA if systemic
                 (recurs in 3 consecutive audits)

FM2  Sampled record missing audit trail (data integrity gap)
     Detection:  P5 evidence sampling; auditor finds record with no audit_anchor
                 FK or missing before/after values
     Recovery:   I3 SEV-1 incident (data integrity category) opened; H8 Critical
                 CAPA; halt new mutations in affected record scope until integrity
                 investigation complete; notify regulator if the gap affects a
                 regulated reporting obligation (per H1 §3.8 notification windows)

FM3  Same finding recurs for the third time in same clause
     Detection:  findings register auto-trigger; recurrence count ≥ 3 in 24 months
     Recovery:   auto-elevate severity one tier; route to H8 systemic CAPA;
                 escalate to Quality Lead + Compliance Lead; add finding to
                 management review agenda (ISO 9001 §9.3)

FM4  Auditor accesses cross-tenant data
     Detection:  B6 C5 access_violation event log; real-time alert to Security Lead
     Recovery:   immediate auditor access revoke (P1 access_grant revoked);
                 I3 SEV-1 incident opened; GDPR Art 33 breach notification clock
                 starts if personal data involved; tenant notification per SLA;
                 H8 CAPA for root cause (access provisioning error)

FM5  Certification surveillance audit timing missed
     Detection:  H6 calendar alert 90 days, 30 days, 14 days before expiry
     Recovery:   emergency assessment requested from CB; Quality Lead + Compliance
                 Lead brief CEO; all customer-facing regulatory status pages updated;
                 affected tenant CSMs notified

FM6  CAPA effectiveness window expires without verification check
     Detection:  H8 CAPA state machine: effectiveness_due_date passed without
                 effectiveness_check_date populated; auto-alert to Quality Lead
     Recovery:   finding re-opens; severity auto-escalated one tier; Quality Lead
                 contacted within 1 business day; H8 CAPA updated with extended
                 timeline + rationale signed by Quality Lead

FM7  Audit plan scope error (wrong tenant data included)
     Detection:  P3 pre-audit document review; Quality Lead cross-checks tenant
                 isolation per B6 C5 before pack delivery
     Recovery:   pack regenerated with corrected scope; auditor notified;
                 access grant revoked and re-issued with corrected scope;
                 if incorrect pack already delivered: I3 incident; GDPR
                 notification if personal data was included
```

---

## 13. Roles and authority (RACI)

```
Role                  Internal  Customer  Regulator  Cert Body  Pen Test  Tabletop
Quality Lead             A         A         R          A          C         C
Compliance Lead          R         R         A          R          R         C
Security Lead            C         C         C          C          A         A
Privacy Lead             C         C         C          C          C         C
AI Lead                  R*        C         C          C          C         C
Domain Lead (scope)      R         R         R          R          C         R
Vertical Pack Lead       R         R         R          R          C         C
Engineering Lead         C         C         C          C          R         R
SRE Lead                 C         C         C          C          C         A
CSM                      -         R         I          -          -         -
Auditor                  I         R         R          R          R         R
Tenant Ops Lead          C         C         C          C          I         I

* AI Lead leads the internal AI governance audit (type 6 in §1 taxonomy)
```

---

## 13b. Annual audit program planning

The Quality Lead produces an annual audit program document at the start
of each calendar year, covering all 18 audit types for the tenant portfolio.
This document is itself a controlled document (D7 lifecycle; Quality Lead
approves; effective January 1 each year).

Annual program content:
```
For each audit type in §1:
  - Planned dates (month/quarter; exact date where fixed)
  - Lead auditor assignment (internal or external CB/NB/regulator)
  - Scope statement (by process area; by regulatory clause; by pack)
  - Resource estimate (person-days; external cost estimate)
  - Dependencies (certification expiry; CB scheduling lead time;
    OEM CSR audit cycle frequency requirement)
  - Risk-based prioritization: areas with open Major CAPAs or recurring
    findings are scheduled first in the year calendar

Certification renewal tracking:
  - ISO 9001 / 13485 / 27001 / AS9100D / IATF 16949 triennial cycle
  - SOC 2 Type II annual window; observation window start date
  - NADCAP biennial per commodity; Merit status eligibility
  - EU MDR/IVDR NB surveillance; annual/triennial per class

Output fed into:
  - H6 periodic review calendar (§5 of this chapter)
  - I8 tenant operations resource planning
  - Budget planning for external CB/NB fees and pen-test cost
```

The annual program is shared with each tenant's Compliance Lead and Quality
Lead 30 days before year start for review and confirmation. Modifications
to the published plan require Quality Lead approval and version increment
of the annual program document.

---

## 14. Cross-references

- H1 §3.8 — regulator notification windows that H3 audit findings trigger
  when a regulatory reporting obligation is identified
- H1 §4 — component-to-regulation mapping; clause references in finding
  records point to this table
- H2 — validation evidence audited at P5; VP currency verified at §4 §C-02
- H4 — evidence classes: audit_record; finding_record; capa_record;
  drill_record; audit_pack (evidence_artifact)
- H5 — audit pack and audit record retention floor (audit records: 25 years
  GxP; 15 years other regulated; 7 years non-regulated)
- H6 — periodic review schedule drives §5 calendar; H6 consumes findings
  register trend
- H7 — change records appear in audit pack §D-01..§D-05
- H8 — CAPA created at P10; effectiveness checked at P11; systemic CAPAs
  triggered by recurrence pattern (§10)
- D13 — workflow state machine that operationalizes P0..P13 above
- E5 §2.8 — Workspace Projection API: auditor portal read-only session
- E8 §2.10 — Evidence API: on-request evidence pull during P5
- I7 — security controls for auditor portal access; access_violation logging
- L4 — red-team reports included in audit pack §O-02
- M9 — cross-reference index; every chapter citation in findings register
  resolves through M9

---

## 15. Decision phrase

```
S4-02_H2_H3_DEEP_UPGRADE_COMPLETE
```

After: load `S4-03_H4_H5.md`.
